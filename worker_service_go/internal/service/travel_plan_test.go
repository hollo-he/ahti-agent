package service

import (
	"testing"
)

func TestGenerateFullExport(t *testing.T) {
	city := "上海"
	origin := "上海虹桥火车站"
	dest := "上海外滩"
	keyword := "外滩"

	// 1. 聚合数据
	plan, _ := BuildTravelPlan(city, origin, dest, keyword)

	// 2. 生成 HTML
	htmlFile := "temp_plan.html"
	_ = plan.ExportToHTML(htmlFile)

	// 3. 转化为 PDF
	pdfFile := "final_travel_itinerary.pdf"
	t.Log("⏳ 正在启动 Headless Chrome 渲染 PDF...")
	err := ExportToPDF(htmlFile, pdfFile)
	if err != nil {
		t.Fatalf("❌ PDF 生成失败: %v", err)
	}

	t.Logf("✅ 任务完成！PDF 已保存至: %s", pdfFile)
}
