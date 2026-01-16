from llama_index.core import Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from langchain_openai import ChatOpenAI
from config import settings


def init_models():
    # 1. 向量化模型还是得给 LlamaIndex，因为 Milvus 检索要用
    Settings.embed_model = HuggingFaceEmbedding(model_name=settings.EMBED_MODEL_NAME)

    # 2. 关键：把 LlamaIndex 的全局 LLM 设为 None，断了它的念想
    Settings.llm = None

    # 3. 声明并返回你的 LangChain 模型
    llm = ChatOpenAI(
        model=settings.ZHIPU_MODEL,
        api_key=settings.ZHIPU_API_KEY,
        base_url=settings.ZHIPU_BASE_URL,
        temperature=0.1,
    )
    return llm


def init_vl_models():
    vl_llm = ChatOpenAI(
        api_key=settings.DASHSCOPE_API_KEY,
        base_url=settings.DASHSCOPE_BASE_URL,
        model=settings.DASHSCOPE_MODEL,
    )

    return vl_llm
