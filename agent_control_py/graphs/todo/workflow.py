from langgraph.graph import StateGraph, END
from .state import TodoState
from .nodes import generate_plan

def create_todo_graph():
    workflow = StateGraph(TodoState)

    workflow.add_node("generate_plan", generate_plan)

    workflow.set_entry_point("generate_plan")
    workflow.add_edge("generate_plan", END)

    return workflow.compile()