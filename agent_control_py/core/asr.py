# core/asr.py
import io
import os
from faster_whisper import WhisperModel


class ASRManager:
    def __init__(self):
        # 1. 设定相对路径
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.model_path = os.path.join(base_dir, "models", "asr")

        # 如果目录不存在则创建
        if not os.path.exists(self.model_path):
            os.makedirs(self.model_path, exist_ok=True)

        self.model_size = "base"
        self.model = None  # 懒加载：初始不加载模型
        print(f"🚀 [ASR] Manager 已初始化 (等待首次调用加载模型)")

    def _load_model(self):
        if self.model is None:
            print(f"🚀 [ASR] 正在加载 Faster-Whisper 模型...")
            print(f"📂 [ASR] 模型存放位置: {self.model_path}")
            # compute_type="int8" 保证在性能有限的电脑上运行快速
            # cpu_threads=4 限制CPU占用
            self.model = WhisperModel(
                self.model_size,
                device="cpu",
                compute_type="int8",
                cpu_threads=4,
                download_root=self.model_path
            )
            print("✅ [ASR] 模型加载完成")

    def transcribe(self, audio_bytes: bytes) -> str:
        """识别音频字节流"""
        try:
            self._load_model() # 确保模型已加载
            audio_io = io.BytesIO(audio_bytes)
            # language="zh" 强制中文
            # 移除 initial_prompt，防止静音时模型复读提示词
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