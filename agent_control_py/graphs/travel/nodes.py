import json
from .state import TravelState
from core.models import init_models  # 严格使用你的定义
from services.go_woker_client import GoWorkerClient
from langgraph.types import interrupt

llm = init_models()
go_client = GoWorkerClient()


async def router_node(state: TravelState):
    """Router 节点：直接硬编码为 travel 意图"""
    # 因为只要进入这个 graph，就是为了做旅行规划，不需要再让 LLM 判断了
    return {"intent": "travel"}


async def parser_node(state: TravelState):
    """Parser 节点：提取出行参数（增加历史上下文感知）"""
    # 将之前的已识别字段带入 prompt
    origin = state.get('origin') or '未提供'
    destination = state.get('destination') or '未提供'
    context = f"当前已识别：起点={origin}, 目的地={destination}"

    prompt = f"""你是一个出行助手。请从用户最新输入中提取：city, origin, destination, ticket_keyword。
    {context}
    用户最新输入: "{state['user_text']}"
    如果用户只提供了其中一个，请保留其他已识别字段。

    【重要】请将提取到的地点名称转换为标准简体中文，并纠正可能的语音识别同音字错误。

    只需返回 JSON。
    """
    try:
        response = await llm.ainvoke(prompt)
        res_text = response.content.replace("```json", "").replace("```", "").strip()
        params = json.loads(res_text)

        # 逻辑增强：如果 ticket_keyword 为空或为 "未提供"，默认使用 destination
        tk = params.get("ticket_keyword", "")
        if (not tk or tk == "未提供") and params.get("destination"):
            params["ticket_keyword"] = params["destination"]

        missing = []
        origin_val = params.get("origin", "")
        dest_val = params.get("destination", "")

        # 检查是否为空或者为占位符 "未提供"
        if not origin_val or origin_val == "未提供":
            missing.append("起点")
            # 确保 params 里存的是空字符串而不是 "未提供"，方便后续逻辑判断
            params["origin"] = ""
            
        if not dest_val or dest_val == "未提供":
            missing.append("目的地")
            params["destination"] = ""

        return {**params, "missing_fields": missing}
    except Exception as e:
        content = response.content if 'response' in locals() else "Unknown"
        print(f"❌ parser_node JSON 解析失败: {e}, 响应内容: {content}")
        return {"missing_fields": ["起点", "目的地"]}  # 默认标记为缺失，让用户补充


async def feedback_node(state: TravelState):
    """反馈节点：处理中断"""

    # 场景 A: 缺失字段 (起点或目的地)
    if state.get("missing_fields"):
        msg = f"我还需要知道您的{'和'.join(state['missing_fields'])}，能告诉我吗？"

        # 流程在此暂停，等待你的 API 发送 Command(resume=input_text)
        resume_val = interrupt(msg)

        # --- 重点：当 API 恢复它时，代码从这里往下走 ---
        # 我们必须返回这些字段来重置 State
        return {
            "user_text": str(resume_val),  # 拿到补充的信息
            "intent": "",  # 关键：抹掉 travel 意图，让路由回滚
            "is_confirmed": False,  # 还没确认
            "missing_fields": []  # 关键：清空列表，否则 parser 还会报错
        }

    # 场景 B: 参数齐了，等待确认
    origin = state.get('origin', '')
    destination = state.get('destination', '')
    confirm_msg = f"为您准备好了！规划从【{origin}】到【{destination}】。确认开始吗？"
    resume_val = interrupt(confirm_msg)

    # 简单判断用户是否同意
    input_str = str(resume_val).lower()
    if any(word in input_str for word in ["yes", "确认", "确定", "开始", "好", "行"]):
        return {"is_confirmed": True}
    else:
        # 用户可能想改地址："不，我要去故宫"
        return {
            "user_text": str(resume_val),
            "is_confirmed": False,
            "intent": "",
            "missing_fields": []
        }

async def call_go_node(state: TravelState):
    """执行节点：调用 Go"""
    # 获取认证信息和用户ID
    token = state.get("authorization", "")
    thread_id = state.get("thread_id", "")
    user_id = state.get("user_id", "1")

    res = await go_client.build_travel_plan(
        city=state["city"],
        origin=state["origin"],
        dest=state["destination"],
        ticket_keyword=state["ticket_keyword"],
        token=token,
        thread_id=thread_id,
        user_id=user_id
    )
    if res and res.get("code") == 200:
        import os

        return {
            "h5_url": res["data"]["h5_url"],
            "md_filename": os.path.basename(res["data"]["md_url"]),
            "chat_response": "行程单已生成！"
        }
    return {"error": "Go 侧生成失败"}