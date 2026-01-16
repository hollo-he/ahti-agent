from typing import TypedDict, Optional, List, Literal


class TravelState(TypedDict):
    user_text: str
    user_id: Optional[str]  # 添加user_id字段
    thread_id: Optional[str]  # 添加thread_id字段
    intent: Literal["travel", "nutrition", "other", ""]  # 意图识别结果

    # 结构化槽位
    city: str
    origin: str
    destination: str
    ticket_keyword: str

    chat_response: str
    is_confirmed: bool
    missing_fields: List[str]

    h5_url: str
    md_filename: str
    error: Optional[str]
    authorization: Optional[str]  # 添加authorization字段用于保存旅行计划