# test_step2.py
from services.go_woker_client import GoWorkerClient


def test_worker():
    worker = GoWorkerClient()

    # 我们找一个典型的技术文章 URL 进行测试
    test_urls = ["https://blog.csdn.net/wangjinjin180/article/details/151325491"]

    print(f"🚀 [Step 2] 正在尝试抓取: {test_urls[0]}...")
    articles = worker.crawl(test_urls)

    if not articles:
        print("❌ [Step 2] 验收失败：未能获取到文章内容。请检查 Go 服务是否启动，或 URL 是否有效。")
        return

    # 验证第一篇文章的数据结构
    art = articles[0]
    print("\n✅ [Step 2] 抓取成功！数据验收如下：")
    print(f"📌 标题: {art.get('title')}")
    print(f"🔗 URL: {art.get('url')}")

    content = art.get('content_md', "")
    print(f"📝 内容预览 (前 200 字):\n{'-' * 30}\n{content[:200]}...\n{'-' * 30}")

    # 核心检查：是否包含 Markdown 标志
    if "#" in content or "```" in content:
        print("💎 格式验证：内容包含 Markdown 标记（标题或代码块），符合 RAG 要求！")
        print("\n🎉 第二步【高性能肢体】验收通过！")
    else:
        print("⚠️ 格式警告：内容中未检测到明显的 Markdown 标记，请检查 Go 端的清洗逻辑。")


if __name__ == "__main__":
    test_worker()