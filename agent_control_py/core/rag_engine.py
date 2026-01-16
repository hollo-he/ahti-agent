import logging
from typing import List, Dict, Optional
from llama_index.core import Document, VectorStoreIndex, StorageContext
from llama_index.core.node_parser import MarkdownNodeParser
from llama_index.vector_stores.milvus import MilvusVectorStore
from llama_index.core.vector_stores import MetadataFilters, ExactMatchFilter
from config import settings

# 打印日志以便追踪入库情况
logger = logging.getLogger(__name__)


class RAGEngine:
    def __init__(self):
        # 1. 初始化 Milvus 向量存储
        self.vector_store = MilvusVectorStore(
            uri=settings.MILVUS_URI,
            collection_name=settings.MILVUS_COLLECTION,
            dim=settings.DIMENSION,  # 确保与 embedding 模型维度一致
            overwrite=False
        )

        # 2. 声明存储上下文
        self.storage_context = StorageContext.from_defaults(vector_store=self.vector_store)

        # 3. 解析器
        self.parser = MarkdownNodeParser()

        # 4. 初始化索引
        try:
            self.index = VectorStoreIndex.from_vector_store(
                vector_store=self.vector_store,
                storage_context=self.storage_context
            )
        except Exception as e:
            logger.warning(f"⚠️ [RAG] 索引初始化失败（可能库为空）: {e}")
            self.index = None

    def _ensure_list(self, val) -> List[str]:
        """鲁棒性工具：确保返回的是列表，处理 None 或 非列表情况"""
        if isinstance(val, list):
            return [str(i) for i in val if i]
        if isinstance(val, str) and val.strip():
            return [val.strip()]
        return []

    def check_dish_exists(self, dish_name: str):
        if self.index is None: return None

        from llama_index.core.vector_stores import MetadataFilters, ExactMatchFilter

        # 只要标题完全一致，就认为是同一个菜
        filters = MetadataFilters(filters=[
            ExactMatchFilter(key="title", value=dish_name)
        ])

        # 用检索器去撞库
        retriever = self.index.as_retriever(filters=filters, similarity_top_k=1)
        results = retriever.retrieve(dish_name)

        if results:
            # 打印日志确认匹配成功
            print(f"DEBUG: 命中库文件 - {results[0].metadata['title']}")
            return {
                "title": results[0].metadata.get("title"),
                "content_md": results[0].get_content(),
                "source": "local_db"
            }
        return None

    def ingest_dishes(self, dishes: List[Dict]):
        """
        将菜品数据入库 Milvus
        """
        if not dishes:
            return

        documents = []
        for dish in dishes:
            # --- 修复 TypeError 的核心逻辑 ---
            raw_allergens = dish.get("allergens")
            clean_allergens = self._ensure_list(raw_allergens)

            # 构造 Document
            doc = Document(
                text=dish.get("content_md") or dish.get("summary") or "暂无详细介绍",
                metadata={
                    "title": dish.get("title") or dish.get("dish_name") or "未知菜品",
                    "url": dish.get("url", "internal")
                }
            )
            documents.append(doc)

        try:
            # 切分为 Nodes
            nodes = self.parser.get_nodes_from_documents(documents)

            if self.index is None:
                # 第一次创建索引
                self.index = VectorStoreIndex(
                    nodes,
                    storage_context=self.storage_context,
                    show_progress=True
                )
            else:
                # 追加节点
                self.index.insert_nodes(nodes)

            logger.info(f"✅ [Milvus] 成功入库 {len(dishes)} 道菜品，生成 {len(nodes)} 个语义节点")
        except Exception as e:
            logger.error(f"❌ [Milvus] 入库失败: {e}")

    def search_context(self, query: str, top_k: int = 3) -> str:
        """
        通用检索，供最终总结节点参考
        """
        if self.index is None:
            return ""

        try:
            retriever = self.index.as_retriever(similarity_top_k=top_k)
            nodes = retriever.retrieve(query)

            context_list = []
            for n in nodes:
                title = n.metadata.get("title", "未知")
                content = n.get_content().strip()
                context_list.append(f"【{title}】: {content}")
            print("====== RAG 检索 =====")
            print("\n\n".join(context_list))
            print("===================")
            return "\n\n".join(context_list)
        except Exception as e:
            logger.error(f"❌ [RAG] 检索失败: {e}")
            return ""

