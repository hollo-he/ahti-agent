# agent_control_py/graphs/nutrition/nodes.py
import asyncio
import base64
from core.models import init_models, init_vl_models
from core.ocr import ocr_image_bytes
from core.rag_engine import RAGEngine
from services.go_woker_client import GoWorkerClient
from .state import NutritionState

llm = init_models()
vl_llm = init_vl_models()
rag_engine = RAGEngine()
go_client = GoWorkerClient()

async def ocr_node(state: NutritionState):
    """1. OCR 节点：只负责识图"""
    image_bytes = base64.b64decode(state["image_base64"])
    texts = await asyncio.to_thread(ocr_image_bytes, image_bytes)
    return {"dishes": texts, "image_base64": ""}


async def retrieval_node(state: NutritionState):
    """
    2. 核心改变：先清洗，再检索！
    """
    raw_texts = state.get("dishes", [])
    if not raw_texts:
        return {"missing_dishes": [], "local_data": []}

    # --- 💡 搬过来的语义清洗逻辑 ---
    filter_prompt = f"""
    你是一个数据清洗专家。从以下 OCR 识别出的原始文本列表中，提取出【真实的食物或菜品名称】。
    【过滤规则】：
    1. 剔除价格、数字、单位、系统性文字。
    2. 仅保留具体的食物或饮料名。
    3. 以 python list 格式返回，不要任何解释。
    原始文本：{raw_texts}
    """

    try:
        response = llm.invoke(filter_prompt)
        cleaned_str = response.content
        import ast
        try:
            start_idx = cleaned_str.find("[")
            end_idx = cleaned_str.rfind("]") + 1
            valid_names = ast.literal_eval(cleaned_str[start_idx:end_idx])
        except:
            valid_names = [line.strip("- ") for line in cleaned_str.split('\n') if len(line) > 1]

        # 得到干净的菜名列表，例如 ["白灼大虾", "品烩大肠"]
        valid_names = [d for d in valid_names if isinstance(d, str) and len(d) >= 2]
    except Exception as e:
        print(f"清洗失败: {e}")
        valid_names = raw_texts

    # --- 💡 拿着干净的菜名去查库 ---
    found, missing = [], []
    for name in valid_names:
        # 此时 check_dish_exists("白灼大虾") 就能精准命中库里的数据了
        existing = rag_engine.check_dish_exists(name)
        if existing:
            found.append(existing)
        else:
            missing.append(name)

    print(f"📊 [智能分流] 本地命中: {len(found)} (含: {[f['title'] for f in found]}) | 缺失: {len(missing)}")
    return {"local_data": found, "missing_dishes": missing, "dishes": valid_names}


async def search_node(state: NutritionState):
    """3. 补齐节点：现在这里只处理真正没见过的菜"""
    missing_dishes = state.get("missing_dishes", [])

    if not missing_dishes:
        print("✅ [本地闭环] 库里全都有，无需动用 Go 爬虫。")
        return {"web_data": []}

    print(f"🕸️ [联网补齐] 正在为 {missing_dishes} 启动 Go 爬虫...")
    try:
        new_data = await go_client.crawl(missing_dishes)
        return {"web_data": new_data}
    except Exception as e:
        print(f"❌ Go 响应异常: {e}")
        return {"web_data": []}

async def synthesize_node(state: NutritionState):
    """4. 汇报节点：上下文剪枝 + 智能总结 (保留你所有的要求)"""
    raw_context = state.get("local_data", []) + state.get("web_data", [])

    if not raw_context:
        return {"report": "未获取到足够的菜品信息，无法生成分析报告。"}

    # --- 你的原始剪枝逻辑 ---
    pruned_context = []
    for item in raw_context:
        name = item.get("title") or item.get("dish_name") or "未知菜品"
        content = item.get("content_md") or item.get("summary") or ""
        content = content[:300] if len(content) > 300 else content
        allergens = item.get("allergens", [])
        allergens_str = ", ".join(allergens) if isinstance(allergens, list) else str(allergens)

        pruned_item = f"菜名: {name}\n营养背景: {content}\n标注过敏原: {allergens_str}"
        pruned_context.append(pruned_item)

    formatted_context = "\n---\n".join(pruned_context)

    # --- 你的原始增强版提示词 ---
    prompt = f"""
    你是一位专业的智能助理营养师 AHTI。
    用户画像/需求：{state['user_goal']}

    【分析参考数据】：
    {formatted_context}

    【任务要求】：
        给出一个整餐的建议方案（如：建议搭配一份绿色蔬菜以平衡油脂）。
    """

    print(f"--- [Token 优化] 原始长度: {len(str(raw_context))} -> 剪枝后: {len(formatted_context)} ---")
    res = llm.invoke(prompt)
    return {"report": res.content}