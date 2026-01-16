from langgraph.graph import StateGraph, END, START
from graphs.nutrition.state import NutritionState
from graphs.nutrition.nodes import (
    ocr_node,
    retrieval_node,
    search_node,
    synthesize_node
)

# 1. 定义路由逻辑
def should_search_web(state: NutritionState):
    """
    根据 retrieval_node 的结果决定路由：
    - 如果有缺失菜品，跳转到 search_node (Go Worker)
    - 如果库里全都有，直接跳到 synthesize_node (生成报告)
    """
    if state.get("missing_dishes") and len(state["missing_dishes"]) > 0:
        return "search_node"
    return "synthesize_node"

# 2. 组装图
workflow = StateGraph(NutritionState)

# 3. 添加节点
workflow.add_node("ocr_node", ocr_node)              # 图像识别
workflow.add_node("retrieval_node", retrieval_node)  # Milvus 检索
workflow.add_node("search_node", search_node)        # Go Worker 并发抓取
workflow.add_node("synthesize_node", synthesize_node)# LLM 汇总生成

# 4. 设置连线逻辑
workflow.add_edge(START, "ocr_node")
workflow.add_edge("ocr_node", "retrieval_node")

# 5. 设置条件路由 (关键步骤)
workflow.add_conditional_edges(
    "retrieval_node",
    should_search_web,
    {
        "search_node": "search_node",
        "synthesize_node": "synthesize_node"
    }
)

# 6. 搜索完成后也进入汇总节点
workflow.add_edge("search_node", "synthesize_node")
workflow.add_edge("synthesize_node", END)

# 7. 编译工作流
nutrition_app = workflow.compile()