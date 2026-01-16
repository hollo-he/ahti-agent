from typing import List, TypedDict

class NutritionState(TypedDict):
    image_base64: str           # 用户上传图片的Base64
    user_goal: str              # 用户需求（如：少油少盐、控糖）
    dishes: List[str]           # OCR识别出的菜名列表
    local_data: List[dict]      # 从Milvus检索到的存量数据
    missing_dishes: List[str]   # 本地库缺失、需要去Go端抓取的菜名
    web_data: List[dict]        # Go端并发抓取的实时数据
    report: str                 # 最终生成的建议报告