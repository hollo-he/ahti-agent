# main.py
import os
import asyncio
import uvicorn
from typing import Optional
from fastapi import UploadFile, File, Form, FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from langgraph.types import Command

# ⚠️ 必须在导入 travel_app 之前设置环境变量
from config import settings

os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = settings.LANGCHAIN_API_KEY
os.environ["LANGCHAIN_PROJECT"] = settings.LANGCHAIN_PROJECT

# 现在再导入
from core.asr import asr_manager
from core.rag_engine import RAGEngine
from graphs.travel.workflow import travel_app
from graphs.nutrition.workflow import nutrition_app

app = FastAPI(title="Agent Control Center (Python Brain)")
rag_engine = RAGEngine()


# --- 健康检查接口 ---
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "message": "Python AI服务运行正常",
        "service": "agent-control-py",
        "port": 8081
    }


@app.get("/api/health")
async def api_health_check():
    return {
        "status": "ok", 
        "message": "Python AI API服务运行正常",
        "endpoints": [
            "/api/v1/nutrition/analyze",
            "/api/v1/agent/chat"
        ]
    }


# --- 餐饮请求结构 ---
class NutritionRequest(BaseModel):
    img_b64: str
    goal: str
    user_id: Optional[str] = "default_user"


# --- 餐饮接口 ---
@app.post("/api/v1/nutrition/analyze")
async def analyze_nutrition(req: NutritionRequest, bg_tasks: BackgroundTasks, authorization: Optional[str] = None):
    initial_state = {
        "image_base64": req.img_b64,
        "user_goal": req.goal,
        "dishes": [], "local_data": [], "missing_dishes": [], "web_data": [], "report": ""
    }
    final_output = await nutrition_app.ainvoke(initial_state)
    if final_output.get("web_data"):
        bg_tasks.add_task(rag_engine.ingest_dishes, final_output["web_data"])

    # 异步保存营养分析到数据库
    if authorization:
        from services.go_woker_client import GoWorkerClient
        go_client = GoWorkerClient()

        async def save_nutrition_task():
            try:
                await go_client.save_nutrition_analysis({
                    "image_path": f"nutrition_{req.user_id}_{int(asyncio.get_event_loop().time())}.jpg",
                    "detected_dishes": final_output.get("dishes", []),
                    "goal": req.goal,
                    "report": final_output.get("report", "")
                }, authorization.replace("Bearer ", ""))
            except Exception as e:
                print(f"❌ 异步保存营养分析失败: {e}")

        bg_tasks.add_task(save_nutrition_task)

    # 返回完整的数据结构，包含识别的菜品
    return {
        "status": "success",
        "report": final_output.get("report", ""),
        "detected_dishes": final_output.get("dishes", []),  # 添加识别的菜品
        "source": "ai_analysis"
    }


# --- 核心：语音/文字对话入口 ---
@app.post("/api/v1/agent/chat")
async def handle_agent_chat(
        file: Optional[UploadFile] = File(None),
        text: Optional[str] = Form(None),
        thread_id: str = Form(...),
        user_id: Optional[str] = Form("1"),  # 添加user_id参数，默认为1
        authorization: Optional[str] = None  # 添加authorization参数
):
    # 1. 获取输入
    input_text = ""
    if file:
        print("🎙️ 正在处理语音输入...")
        input_text = asr_manager.transcribe(await file.read())
    elif text:
        input_text = text.strip()

    if not input_text:
        return {"status": "error", "chat_response": "未检测到有效输入内容"}

    print(f"📝 [输入内容]: {input_text} (Thread: {thread_id}, User: {user_id})")

    config = {"configurable": {"thread_id": thread_id}}

    try:
        # 获取当前图的状态快照
        snapshot = await travel_app.aget_state(config)

        # 2. 调用图逻辑
        if snapshot.next:
            print(f"🔄 正在恢复中断并发送指令: {input_text}")
            # 恢复中断时使用 Command 发送
            final_output = await travel_app.ainvoke(Command(resume=input_text), config)
        else:
            print(f"🚀 正在启动新的工作流...")
            # 开启全新流程，传入user_id、thread_id和authorization
            final_output = await travel_app.ainvoke({"user_text": input_text, "user_id": user_id, "thread_id": thread_id, "authorization": authorization}, config)

        # 3. 重新获取状态，分析下一步
        new_snapshot = await travel_app.aget_state(config)

        # 场景 A：流程再次中断（反馈追问或等待确认）
        if new_snapshot.next:
            chat_msg = "处理中，请稍后"
            if new_snapshot.tasks and new_snapshot.tasks[0].interrupts:
                # 动态抓取你在 Node 里 interrupt("xxx") 抛出的信息
                chat_msg = new_snapshot.tasks[0].interrupts[0].value

            print(f"⌛ [等待用户响应]: {chat_msg}")
            return {
                "status": "waiting",
                "chat_response": chat_msg,
                "thread_id": thread_id,
                "is_final": False
            }

        # 场景 B：流程完全走完
        final_res = new_snapshot.values
        if final_res.get("h5_url"):
            print("✅ 行程生成成功，正在返回链接")
            return {
                "status": "success",
                "chat_response": final_res.get("chat_response", "您的行程已规划完毕！"),
                "data": {
                    "h5_url": final_res["h5_url"],
                    "download_url": f"{settings.GO_WORKER_URL}/api/travel/download?filename={final_res['md_filename']}"
                },
                "thread_id": thread_id,
                "is_final": True
            }

        return {
            "status": "success",
            "chat_response": final_res.get("chat_response", "指令已执行"),
            "thread_id": thread_id,
            "is_final": True
        }

    except Exception as e:
        print(f"❌ 系统运行异常: {str(e)}")
        # 抛出异常详情，方便调试
        return {"status": "error", "chat_response": f"内部服务器错误: {str(e)}", "thread_id": thread_id}


if __name__ == "__main__":
    # --reload 模式方便开发，代码修改后自动重启
# uv run uvicorn main:app --host 0.0.0.0 --port 8081 --reload
    uvicorn.run(app, host="0.0.0.0", port=8081)