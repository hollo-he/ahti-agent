from services.go_woker_client import GoWorkerClient
from core.rag_engine import RAGEngine
from core.models import init_models
from langchain_core.prompts import ChatPromptTemplate

# 1. 唯一初始化你的 LangChain 模型
llm = init_models()


# --- 节点 1: Plan (任务拆解) ---
async def plan_node(state):
    print("🎯 [Plan] 正在分析任务...")
    # 这里直接传递 urls。后期你可以在这里加 LLM 逻辑让它自己生成搜索词
    return {"urls": state.get("urls", [])}


# --- 节点 2: Scrape (肢体动作 - Go 抓取) ---
async def scrape_node(state):
    urls = state.get("urls", [])
    if not urls:
        print("⚠️ [Scrape] 无待抓取 URL，跳过")
        return {"articles": []}

    print(f"🕸️ [Scrape] 调取 Go Worker 抓取 {len(urls)} 个页面...")
    worker = GoWorkerClient()
    new_articles = worker.crawl(urls)

    # 将新爬到的内容存入 Milvus
    if new_articles:
        rag = RAGEngine()
        rag.ingest_articles(new_articles)

    return {"articles": new_articles}


# --- 节点 3: Synthesize (大脑动作 - 检索 + LangChain 生成) ---
async def synthesize_node(state):
    print("✍️ [Synthesize] 正在使用 LangChain 生成回答...")

    # 1. 纯检索：LlamaIndex 此时只是一个查 Milvus 的工具，绝不碰大模型
    rag = RAGEngine()
    context = rag.search_context(state["query"])

    # 2. 纯生成：用你声明好的 LangChain llm (不再有 LlamaIndex 的干扰)
    prompt = ChatPromptTemplate.from_template("""
    你是一个专业的技术助手。请根据以下参考资料回答用户问题。
    如果资料中没有相关信息，请诚实告知。

    参考资料:
    {context}

    用户问题:
    {query}
    """)

    chain = prompt | llm
    response = chain.invoke({"context": context, "query": state["query"]})

    return {"answer": response.content}