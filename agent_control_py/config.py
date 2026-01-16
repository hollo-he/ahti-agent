from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    # --- 1. 字段定义 (必须带类型注解) ---

    GO_WORKER_URL: str = Field(
        default="http://localhost:8080",
        description="Go crawler service endpoint",
    )

    # LLM 供应商切换: "zhipu", "openai", "ollama", "deepseek"
    LLM_PROVIDER: str = "zhipu"

    # 智谱配置
    ZHIPU_API_KEY: str = Field(default="", description="智谱AI API密钥")
    ZHIPU_BASE_URL: str = "https://open.bigmodel.cn/api/paas/v4/"
    ZHIPU_MODEL: str = "glm-4.5-air"
    # 阿里云百炼配置
    DASHSCOPE_API_KEY: str = Field(default="", description="阿里云百炼API密钥")
    DASHSCOPE_BASE_URL: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    DASHSCOPE_MODEL: str = "qwen3-vl-flash-2025-10-15"

    # --- 可观测性 (LangSmith) ---
    LANGCHAIN_TRACING_V2: bool = True
    LANGCHAIN_API_KEY: Optional[str] = Field(default="", description="LangChain API密钥")
    LANGCHAIN_PROJECT: str = "AHTI-Agent-Nutrition"

    # 本地 Embedding 配置
    EMBED_MODEL_NAME: str = "BAAI/bge-small-zh-v1.5"

    # Milvus 配置 (Docker 模式)
    # 如果 Python 跑在宿主机，Milvus 在 Docker，用 localhost
    # 如果两者都在同一个 Docker 网络，用容器名 (如 http://milvus-standalone:19530)
    MILVUS_URI: str = "http://localhost:19530"
    # MILVUS_TOKEN: str = ""  # 开源版默认通常为空
    MILVUS_COLLECTION: str = "agent_knowledge_base"

    # 【非常重要】bge-small-zh-v1.5 的维度必须是 512
    DIMENSION: int = 512

    # --- 2. 统一配置 (V2 推荐做法) ---
    model_config = SettingsConfigDict(
        env_file=".env",  # 自动读取 .env
        env_file_encoding="utf-8",
        extra="ignore"  # 忽略环境变量中多余的变量
    )


# 实例化
settings = Settings()