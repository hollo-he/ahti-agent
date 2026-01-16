package route_get

import (
	"strings"
	"testing"
)

func TestGetRouteInfo(t *testing.T) {
	origin := "上海市虹桥火车站"
	destination := "上海市外滩"

	t.Logf("开始请求高德API，测试路径: %s -> %s", origin, destination)

	results, err := GetRouteInfo(origin, destination)
	if err != nil {
		t.Fatalf("接口调用失败: %v", err)
	}

	// 1. 验证并展示自驾详细步骤
	if d, ok := results["driving"]; ok {
		t.Logf("--- [自驾路线详情] ---")
		t.Logf("概览: 距离 %s km, 耗时 %d min, 打车费 %s 元", d.DistanceKm, d.DurationMin, d.Cost)

		// 关键校验：验证坐标串是否为空
		if d.Polyline == "" {
			t.Error("❌ 错误: 自驾路线的 Polyline 坐标串为空，地图将无法渲染")
		} else {
			coordsCount := len(strings.Split(d.Polyline, ";"))
			t.Logf("✅ 坐标校验: 获取到 %d 个路径轨迹点", coordsCount)
		}

		for i, step := range d.Steps {
			t.Logf("  步骤 %d: %s (%d米, 约%d分钟)", i+1, step.Instruction, step.DistanceM, step.DurationMin)
		}
	}

	// 2. 验证并展示公交/地铁详细步骤
	if trans, ok := results["transit"]; ok {
		t.Logf("--- [地铁/公交路线详情] ---")
		t.Logf("概览: 距离 %s km, 耗时 %d min, 票价 %s 元", trans.DistanceKm, trans.DurationMin, trans.Cost)

		// 关键校验：验证公交路线的坐标串
		if trans.Polyline == "" {
			t.Error("❌ 错误: 公交路线的 Polyline 坐标串为空")
		} else {
			// 公交路线通常由多段组成，校验拼接后的完整性
			coordsCount := len(strings.Split(trans.Polyline, ";"))
			t.Logf("✅ 坐标校验: 公交全线（含步行/地铁）共 %d 个轨迹点", coordsCount)
		}

		for i, step := range trans.Steps {
			t.Logf("  路段 %d: %s (耗时约%d分钟)", i+1, step.Instruction, step.DurationMin)
		}
	}
}

func TestAddressToCoords(t *testing.T) {
	addr := "北京大兴国际机场"
	loc, adcode, err := addressToCoords(addr)
	if err != nil {
		t.Fatalf("解析地址失败: %v", err)
	}

	t.Logf("地址解析成功: %s -> 坐标: %s, 城市码: %s", addr, loc, adcode)

	// 验证坐标格式是否为 "经度,纬度"
	if !strings.Contains(loc, ",") {
		t.Errorf("坐标格式不正确: %s", loc)
	}

	if loc == "" || adcode == "" {
		t.Error("返回字段为空")
	}
}
