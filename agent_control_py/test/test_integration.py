import asyncio
from services.go_woker_client import GoWorkerClient


async def test_all():
    client = GoWorkerClient()

    print("\n🚀 --- 开始测试: 智能出行规划服务 ---")

    # 测试数据：模拟从静安寺到外滩，查看东方明珠
    travel_result = await client.build_travel_plan(
        city="上海",
        origin="上海静安寺",
        dest="上海外滩",
        ticket_keyword="东方明珠"
    )

    if travel_result.get("code") == 200:
        data = travel_result.get("data", {})

        print("\n✨ [生成成功]")
        print(f"📍 行程概览: {data.get('summary')}")
        print(f"🔗 交互式 H5 (地图/切换): {data.get('h5_url')}")
        print(f"📄 图标版 Markdown (离线/精简): {data.get('md_url')}")

        print("\n💡 提示: ")
        print("- 安卓端建议加载 H5 链接以获得完整地图交互体验。")
        print("- Markdown 链接包含图文和路线图标进度条，适合 Agent 提取摘要。")
    else:
        print(f"❌ 生成失败: {travel_result.get('message')}")


if __name__ == "__main__":
    # 确保 Go Worker 已经启动并监听对应端口
    try:
        asyncio.run(test_all())
    except KeyboardInterrupt:
        pass