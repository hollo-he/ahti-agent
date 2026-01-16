from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
# 导入你的节点
from .state import TravelState
from .nodes import router_node, parser_node, feedback_node, call_go_node


# ==========================================
# 1. 路由逻辑函数（直接写在 workflow.py 里面）
# ==========================================

def route_intent(state: TravelState):
    if state["intent"] == "travel": return "parser"
    return END


# 这里就是你问的那个函数，放在这里定义
def route_after_feedback(state: TravelState):
    # 1. 确认了就去生成
    if state.get("is_confirmed"):
        return "call_go"

    # 2. 没确认（即补充信息），直接跳过 router，去 parser 解析这个地址
    # 这样就不会因为 LLM 没识别出“河北师范大学”的意图而结束了
    return "parser"

# ==========================================
# 2. 组装 Graph
# ==========================================

workflow = StateGraph(TravelState)

# 添加节点
workflow.add_node("router", router_node)
workflow.add_node("parser", parser_node)
workflow.add_node("feedback", feedback_node)
workflow.add_node("call_go", call_go_node)

# 设置入口
workflow.set_entry_point("router")

# --- 设置边 ---

# 1. router 后的判断
workflow.add_conditional_edges("router", route_intent)

# 2. parser 之后总是去 feedback
workflow.add_edge("parser", "feedback")

# 更新 Conditional Edges
workflow.add_conditional_edges(
    "feedback",
    route_after_feedback,
    {
        "call_go": "call_go",
        "parser": "parser"  # 修改这里，直接回 parser
    }
)

# 4. 执行完 go 之后结束
workflow.add_edge("call_go", END)

# 编译
memory = MemorySaver()
travel_app = workflow.compile(checkpointer=memory)