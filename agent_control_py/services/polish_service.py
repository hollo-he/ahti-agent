from typing import Optional, List
import base64
import httpx
from langchain_core.messages import HumanMessage, SystemMessage
from core.models import init_models, init_vl_models

class PolishService:
    def __init__(self):
        self.llm = init_models()
        self.vl_llm = init_vl_models()

    async def polish_text(self, text: str, length: str = "medium", tone: str = "standard", style: str = "descriptive", custom_prompt: Optional[str] = None, image_urls: Optional[List[str]] = None) -> str:
        if not text and (not image_urls or len(image_urls) == 0):
            return ""

        # 1. 如果有图片，先进行视觉识别
        image_desc = ""
        if image_urls and len(image_urls) > 0:
            print(f"🖼️ 正在识别 {len(image_urls)} 张图片...")
            try:
                # 构造多模态消息
                content_parts = [{"type": "text", "text": "请详细描述这些图片的内容，包括场景、人物动作、表情、天气和氛围，以便我将其写入日记。"}]
                for url in image_urls:
                    # 确保URL是完整的
                    final_image_url = url
                    
                    # 核心修复：如果是本地 localhost 图片，转为 Base64
                    if "localhost" in url or "127.0.0.1" in url:
                        try:
                            async with httpx.AsyncClient() as client:
                                resp = await client.get(url, timeout=10.0)
                                if resp.status_code == 200:
                                    # 转换为 Base64 Data URI
                                    b64_data = base64.b64encode(resp.content).decode('utf-8')
                                    # 简单的 MIME 类型推断
                                    mime_type = "image/jpeg"
                                    if url.lower().endswith(".png"):
                                        mime_type = "image/png"
                                    elif url.lower().endswith(".gif"):
                                        mime_type = "image/gif"
                                    elif url.lower().endswith(".webp"):
                                        mime_type = "image/webp"
                                        
                                    final_image_url = f"data:{mime_type};base64,{b64_data}"
                                    print(f"🔄 已将本地图片转换为 Base64 ({len(b64_data)} chars)")
                        except Exception as dl_err:
                            print(f"⚠️ 本地图片转换失败: {dl_err}")
                            # 失败了还是传原 URL 碰运气，或者跳过
                            pass

                    content_parts.append({
                        "type": "image_url",
                        "image_url": {"url": final_image_url}
                    })

                vl_response = await self.vl_llm.ainvoke([
                    HumanMessage(content=content_parts)
                ])
                image_desc = vl_response.content
                print(f"👁️ 图片识别结果: {image_desc[:50]}...")
            except Exception as e:
                print(f"❌ 图片识别失败: {e}")
                # 识别失败不影响主流程，只是少了图片信息
                image_desc = ""

        # 2. 构建润色上下文
        context_text = text
        if image_desc:
            context_text = f"【用户上传的图片内容】：{image_desc}\n\n【用户写的日记草稿】：{text}\n\n请结合图片内容和用户草稿，写一篇完整的日记。如果用户草稿很简单，请根据图片内容进行合理的细节补充和艺术加工。"

        # 基础指令：强制第一人称日记
        base_instruction = "你是一个专业的日记编辑。请将用户的输入润色为一篇第一人称（'我'）的日记。"
        
        # 字数控制
        length_instruction = "篇幅适中，不要过于冗长。"
        if length == "short":
            length_instruction = "篇幅要简短精炼，点到为止，字数控制在200字以内。"
        elif length == "long":
            length_instruction = "篇幅要丰富详实，多一些细节描写，字数在500字以上。"

        # 口吻控制 (Tone)
        tone_instruction = "口吻要自然平和。"
        if tone == "humorous":
            tone_instruction = "口吻要幽默风趣，可以适当加入一些自嘲或俏皮话。"
        elif tone == "emotional":
            tone_instruction = "口吻要深情细腻，注重情感的流露。"
        elif tone == "formal":
            tone_instruction = "口吻要严肃认真，一丝不苟。"
        elif tone == "casual":
            tone_instruction = "口吻要随意亲切，像在和老朋友聊天。"

        # 写作风格 (Style)
        style_instruction = "风格要通顺流畅。"
        if style == "poetic":
            style_instruction = "风格要充满文采，使用优美的词藻和修辞手法，富有文学意境。"
        elif style == "realistic":
            style_instruction = "风格要朴实无华，注重对现实生活细节的真实还原。"
        elif style == "dreamy":
            style_instruction = "风格要唯美梦幻，给人一种朦胧的美感。"
        elif style == "custom" and custom_prompt:
            style_instruction = f"请严格按照以下自定义要求进行润色：{custom_prompt}"

        system_prompt = f"{base_instruction}\n{length_instruction}\n{tone_instruction}\n{style_instruction}\n请直接返回润色后的正文，不要包含任何解释、前言或引号。"

        try:
            response = await self.llm.ainvoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=context_text)
            ])
            return response.content
        except Exception as e:
            print(f"❌ 润色失败: {e}")
            raise e

polish_service = PolishService()