from langgraph.graph import StateGraph, END
from graphs.rag.state import AgentState
from graphs.rag.nodes import plan_node, scrape_node, synthesize_node

def create_app():
    # 1. 初始化图
    workflow = StateGraph(AgentState)

    # 2. 定义节点
    workflow.add_node("plan", plan_node)
    workflow.add_node("scrape", scrape_node)
    workflow.add_node("synthesize", synthesize_node)

    # 3. 设置连线
    workflow.set_entry_point("plan")
    workflow.add_edge("plan", "scrape")      # 第一步：规划
    workflow.add_edge("scrape", "synthesize") # 第二步：抓取并存入 Milvus
    workflow.add_edge("synthesize", END)     # 第三步：检索并回答

    return workflow.compile()

app = create_app()