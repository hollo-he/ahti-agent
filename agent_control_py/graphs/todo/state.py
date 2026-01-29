from typing import TypedDict, List, Optional
from pydantic import BaseModel, Field

class TodoItem(BaseModel):
    title: str = Field(description="任务标题")
    description: str = Field(description="详细描述")
    priority: str = Field(description="优先级: low, medium, high")
    due_date: Optional[str] = Field(description="截止日期 (YYYY-MM-DD)，如果未提及则留空")

class Plan(BaseModel):
    todos: List[TodoItem] = Field(description="待办事项列表")

class TodoState(TypedDict):
    user_input: str
    plan: Optional[Plan]
    error: Optional[str]