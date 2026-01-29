from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from core.models import init_models
from .state import TodoState, Plan

def generate_plan(state: TodoState) -> TodoState:
    print("🤖 生成计划中...")
    llm = init_models()
    
    # 使用 JsonOutputParser，它能自动处理 Markdown 代码块包裹的 JSON
    parser = JsonOutputParser(pydantic_object=Plan)
    
    system_prompt = """你是专业的个人规划助手。
请根据用户的描述，制定一份详细的待办事项清单。
{format_instructions}

优先级的判断标准：
- high: 紧急且重要
- medium: 重要但不紧急
- low: 不重要或不紧急

请确保生成的计划具有可执行性，并合理分配优先级。
"""
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{user_input}")
    ])
    
    chain = prompt | llm | parser
    
    try:
        # parser 返回的是字典，我们需要将其转换为 Plan 对象
        response_dict = chain.invoke({
            "user_input": state["user_input"],
            "format_instructions": parser.get_format_instructions()
        })
        
        plan = Plan(**response_dict)
        return {"plan": plan, "error": None}
    except Exception as e:
        print(f"❌ 生成计划失败: {e}")
        return {"plan": None, "error": str(e)}