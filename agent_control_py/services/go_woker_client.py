import httpx
from typing import List, Dict
from config import settings

class GoWorkerClient:
    def __init__(self):
        # 确保 settings.GO_WORKER_URL 指向 Go 服务的地址 (如 http://127.0.0.1:8080)
        self.base_url = settings.GO_WORKER_URL

    async def crawl(self, names: List[str]) -> List[Dict]:
        """
        调用 Go 端抓取菜品数据
        """
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(
                    f"{self.base_url}/api/crawl",
                    json={"names": names},
                    timeout=60.0
                )
                resp.raise_for_status()
                return resp.json()
            except Exception as e:
                print(f"❌ 肢体(Go)餐饮抓取异常: {e}")
                return []

    async def build_travel_plan(self, city: str, origin: str, dest: str, ticket_keyword: str, token: str = None, thread_id: str = None, user_id: str = None) -> Dict:
        """
        调用 Go 端生成行程规划 (交互式 H5 + 图标版 Markdown)
        """
        async with httpx.AsyncClient() as client:
            try:
                payload = {
                    "city": city,
                    "origin": origin,
                    "destination": dest,
                    "ticket_keyword": ticket_keyword
                }
                headers = {}
                if token:
                    headers["Authorization"] = f"Bearer {token}"
                if thread_id:
                    headers["X-Thread-ID"] = thread_id
                if user_id:
                    headers["X-User-ID"] = user_id

                print(f"🔍 调用 Go 接口: URL={self.base_url}/api/travel/plan")
                print(f"   Headers: {headers}")
                print(f"   Payload: {payload}")

                resp = await client.post(
                    f"{self.base_url}/api/travel/plan",
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )
                resp.raise_for_status()
                data = resp.json()
                print(f"✅ 肢体(Go)出行建议生成成功 (H5 & Markdown)")
                return data
            except Exception as e:
                print(f"❌ 肢体(Go)出行响应异常: {e}")
                return {"success": False, "error": str(e)}
    async def save_travel_plan(self, plan_data: Dict) -> Dict:
        """
        保存旅行计划到数据库
        """
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(
                    f"{self.base_url}/api/travel/plan/store",
                    json=plan_data,
                    timeout=10.0,
                    headers={"Authorization": plan_data.get("token", "")}
                )
                resp.raise_for_status()
                data = resp.json()
                print(f"✅ 旅行计划保存成功")
                return data
            except Exception as e:
                print(f"❌ 保存旅行计划失败: {e}")
                return {"success": False, "error": str(e)}

    async def save_nutrition_analysis(self, analysis_data: Dict, token: str) -> Dict:
        """
        保存营养分析到数据库
        """
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(
                    f"{self.base_url}/api/nutrition/analyses",
                    json=analysis_data,
                    timeout=10.0,
                    headers={"Authorization": f"Bearer {token}"}
                )
                resp.raise_for_status()
                data = resp.json()
                print(f"✅ 营养分析保存成功")
                return data
            except Exception as e:
                print(f"❌ 保存营养分析失败: {e}")
                return {"success": False, "error": str(e)}