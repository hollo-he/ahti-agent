# core/asr.py
import io
import os
from faster_whisper import WhisperModel


class ASRManager:
    def __init__(self):
        # 1. 设定相对路径：获取当前文件所在目录的上一级，再进入 models/asr
        # 这样无论项目放在 E 盘还是 D 盘，都能正确找到 models 文件夹
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        model_path = os.path.join(base_dir, "models", "asr")

        # 如果目录不存在则创建
        if not os.path.exists(model_path):
            os.makedirs(model_path, exist_ok=True)

        self.model_size = "base"
        print(f"🚀 [ASR] 正在初始化 Faster-Whisper...")
        print(f"📂 [ASR] 模型存放位置: {model_path}")

        # compute_type="int8" 保证在性能有限的电脑上运行快速
        self.model = WhisperModel(
            self.model_size,
            device="cpu",
            compute_type="int8",
            download_root=model_path
        )
        print("✅ [ASR] 加载完成")

    def transcribe(self, audio_bytes: bytes) -> str:
        """识别音频字节流"""
        try:
            audio_io = io.BytesIO(audio_bytes)
            # language="zh" 强制中文提高速度
            segments, _ = self.model.transcribe(
                audio_io,
                language="zh",
                beam_size=1,
                vad_filter=True
            )
            return "".join([s.text for s in segments]).strip()
        except Exception as e:
            print(f"❌ [ASR] 识别异常: {e}")
            return ""


# 实例化单例
asr_manager = ASRManager()