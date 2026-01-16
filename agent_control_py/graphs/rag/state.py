from typing import TypedDict, List, Dict, Annotated
import operator


class AgentState(TypedDict):
    # 用户原始提问
    query: str

    # 待抓取的 URL 列表
    urls: List[str]

    # 抓取到的文章列表（使用 operator.add 允许节点之间追加数据而非覆盖）
    articles: Annotated[List[Dict], operator.add]

    # 最终答案
    answer: str