package weather_get

import (
	"fmt"
	"testing"
)

func TestGetWeatherReport(t *testing.T) {
	city := "北京"
	fmt.Printf("🚀 开始测试 [%s] 的 3 日行程天气抓取...\n", city)

	// reports 现在是一个切片 []WeatherInfo
	reports, err := GetWeatherReport(city)
	if err != nil {
		t.Fatalf("❌ 测试失败: %v", err)
	}

	// 检查是否返回了数据
	if len(reports) == 0 {
		t.Fatal("❌ 错误: 返回的天气列表为空")
	}

	fmt.Printf("✅ 成功获取到 %d 天的数据\n", len(reports))

	// 遍历打印每一天的数据
	for i, day := range reports {
		fmt.Printf("\n--- 第 %d 天行程建议 ---\n", i+1)
		fmt.Printf("🏙  城市: %s\n", day.City)
		fmt.Printf("📅 日期: %s\n", day.Date)
		fmt.Printf("🌤  天气: %s\n", day.Condition)
		fmt.Printf("🌡  温度: %s°C ~ %s°C\n", day.TempMin, day.TempMax)
		fmt.Printf("👕 穿衣: %s\n", day.DressingIndex)
		fmt.Printf("☀️ 紫外线: %s\n", day.UVIndex)
	}
	fmt.Println("\n------------------------------------------")

	// 验证第一天的数据是否完整
	if reports[0].City != city {
		t.Errorf("期望城市为 %s, 但实际得到 %s", city, reports[0].City)
	}
	if reports[0].Condition == "" {
		t.Error("天气状况不应为空")
	}
}
