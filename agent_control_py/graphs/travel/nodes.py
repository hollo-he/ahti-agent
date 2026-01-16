import json
from .state import TravelState
from core.models import init_models  # 严格使用你的定义
from services.go_woker_client import GoWorkerClient
from langgraph.types import interrupt

llm = init_models()
go_client = GoWorkerClient()


async def router_node(state: TravelState):
    """Router 节点：判定用户想干什么"""
    prompt = f"""分析用户输入，只返回 JSON，格式如 {{"intent": "travel/nutrition/other"}}。
    - travel: 出行、路线、旅游、去某地。
    - other: 闲聊。
    输入内容: "{state['user_text']}"
    """
    response = await llm.ainvoke(prompt)
    # 清理和解析 JSON
    res_text = response.content.replace("```json", "").replace("```", "").strip()
    res_json = json.loads(res_text)
    return {"intent": res_json.get("intent", "other")}


async def parser_node(state: TravelState):
    """Parser 节点：提取出行参数（增加历史上下文感知）"""
    # 将之前的已识别字段带入 prompt
    context = f"当前已识别：起点={state.get('origin')}, 目的地={state.get('destination')}"

    prompt = f"""你是一个出行助手。请从用户最新输入中提取：city, origin, destination, ticket_keyword。
    {context}
    用户最新输入: "{state['user_text']}"
    如果用户只提供了其中一个，请保留其他已识别字段。
    只需返回 JSON。
    """
    response = await llm.ainvoke(prompt)
    res_text = response.content.replace("```json", "").replace("```", "").strip()
    params = json.loads(res_text)

    missing = []
    if not params.get("origin"): missing.append("起点")
    if not params.get("destination"): missing.append("目的地")

    return {**params, "missing_fields": missing}


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
    confirm_msg = f"为您准备好了！规划从【{state['origin']}】到【{state['destination']}】。确认开始吗？"
    resume_val = interrupt(confirm_msg)

    # 简单判断用户是否同意
    input_str = str(resume_val).lower()
    if any(word in input_str for word in ["yes", "确认", "确定", "开始", "好", "行"]):
        return {"is_confirmed": True}
    else:
        # 用户可能想改地址：“不，我要去故宫”
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