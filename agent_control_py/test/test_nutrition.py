import time

import requests
import base64


def test_nutrition_loop():
    # 1. 准备一张菜单图片 (确保路径下有一张图片，或者换成你电脑里的路径)
    image_path = r"E:\Desktop\ahti-agent\agent_control_py\test\menu.jpg"

    try:
        with open(image_path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode('utf-8')
    except FileNotFoundError:
        print("请在当前目录下准备一张名为 menu.jpg 的图片")
        return

    # 2. 构造请求参数
    payload = {
        "img_b64": img_b64,
        "goal": "我有高血糖，需要严格控糖，并且我对坚果过敏，请给出专业建议。"
    }

    # 3. 发送请求到 Python 大脑
    print("🚀 正在启动 AHTI-Agent 餐饮闭环分析...")
    response = requests.post(
        "http://localhost:8081/api/v1/nutrition/analyze",
        json=payload,
        timeout=1200  # 流程较长，超时设久一点
    )

    # 4. 打印结果
    if response.status_code == 200:
        result = response.json()
        print("\n=== Agent 识别到的菜品 ===")
        print(result.get("detected_dishes"))

        print("\n=== 最终营养分析报告 ===")
        print(result.get("report"))

        print(f"\n数据来源: {result.get('source')}")
    else:
        print(f"❌ 请求失败: {response.text}")


if __name__ == "__main__":
    start = time.time()
    test_nutrition_loop()
    end = time.time()
    print(end - start)