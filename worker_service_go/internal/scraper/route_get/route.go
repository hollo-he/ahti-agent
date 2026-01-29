package route_get

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
)

const (
	amapGeocodeURL = "https://restapi.amap.com/v3/geocode/geo"
	amapDrivingURL = "https://restapi.amap.com/v3/direction/driving"
	amapTransitURL = "https://restapi.amap.com/v3/direction/transit/integrated"
)

// getEnv retrieves environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func GetRouteInfo(originAddr, destAddr string) (map[string]*TravelOption, error) {
	// 建议在搜索时自动补全城市前缀，防止出现“1300公里”的乌龙
	originLoc, _, err := addressToCoords(originAddr)
	if err != nil {
		return nil, fmt.Errorf("起点[%s]解析失败: %v", originAddr, err)
	}
	destLoc, cityCode, err := addressToCoords(destAddr)
	if err != nil {
		return nil, fmt.Errorf("终点[%s]解析失败: %v", destAddr, err)
	}

	results := make(map[string]*TravelOption)

	// 1. 获取自驾详情
	if d, err := fetchDrivingDetail(originLoc, destLoc); err == nil {
		results["driving"] = d
	}

	// 2. 获取公交/地铁详情
	if t, err := fetchTransitDetail(originLoc, destLoc, cityCode); err == nil {
		results["transit"] = t
	}

	return results, nil
}

// fetchDrivingDetail 获取自驾详细路线，并从 steps 中提取拼接 polyline
func fetchDrivingDetail(origin, dest string) (*TravelOption, error) {
	apiKey := getEnv("AMAP_API_KEY", "")
	if apiKey == "" {
		return nil, fmt.Errorf("missing AMAP_API_KEY")
	}

	params := url.Values{}
	params.Set("key", apiKey)
	params.Set("origin", origin)
	params.Set("destination", dest)
	params.Set("extensions", "base") // base 模式在 step 中已有 polyline

	resp, err := http.Get(amapDrivingURL + "?" + params.Encode())
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var data struct {
		Status string `json:"status"`
		Route  struct {
			TaxiCost string `json:"taxi_cost"`
			Paths    []struct {
				Distance string `json:"distance"`
				Duration string `json:"duration"`
				Steps    []struct {
					Instruction string `json:"instruction"`
					Duration    string `json:"duration"`
					Distance    string `json:"distance"`
					Polyline    string `json:"polyline"` // <--- 关键：坐标在这里
				} `json:"steps"`
			} `json:"paths"`
		} `json:"route"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	if data.Status != "1" || len(data.Route.Paths) == 0 {
		return nil, fmt.Errorf("无驾驶路线或请求失败")
	}

	path := data.Route.Paths[0]
	var steps []RouteStep
	var allPolylines []string

	for _, s := range path.Steps {
		// 1. 收集步骤文字
		steps = append(steps, RouteStep{
			Instruction: s.Instruction,
			DurationMin: int(parseFloat(s.Duration) / 60),
			DistanceM:   int(parseFloat(s.Distance)),
		})
		// 2. 收集坐标串
		if s.Polyline != "" {
			allPolylines = append(allPolylines, s.Polyline)
		}
	}

	return &TravelOption{
		Mode:        "自驾/打车",
		DistanceKm:  fmt.Sprintf("%.1f", parseFloat(path.Distance)/1000),
		DurationMin: int(parseFloat(path.Duration) / 60),
		Cost:        data.Route.TaxiCost,
		Steps:       steps,
		// 将所有步骤的坐标通过分号拼接成一整条路径
		Polyline: strings.Join(allPolylines, ";"),
	}, nil
}

// fetchTransitDetail 获取公交详情并拼接 Polyline
func fetchTransitDetail(origin, dest, city string) (*TravelOption, error) {
	apiKey := getEnv("AMAP_API_KEY", "")
	if apiKey == "" {
		return nil, fmt.Errorf("missing AMAP_API_KEY")
	}

	params := url.Values{}
	params.Set("key", apiKey)
	params.Set("origin", origin)
	params.Set("destination", dest)
	params.Set("city", city)

	resp, err := http.Get(amapTransitURL + "?" + params.Encode())
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var data map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&data)

	route, ok := data["route"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("公交数据解析失败")
	}

	transits := route["transits"].([]interface{})
	if len(transits) == 0 {
		return nil, fmt.Errorf("未查到公交方案")
	}

	best := transits[0].(map[string]interface{})
	var steps []RouteStep
	var allPolylines []string // 用于存储各段坐标

	segments := best["segments"].([]interface{})
	for _, seg := range segments {
		s := seg.(map[string]interface{})

		// 1. 步行部分提取 polyline
		if walking, ok := s["walking"].(map[string]interface{}); ok {
			if pl, ok := walking["polyline"].(string); ok && pl != "" {
				allPolylines = append(allPolylines, pl)
			}
			steps = append(steps, RouteStep{
				Instruction: fmt.Sprintf("步行至车站 (%s米)", walking["distance"]),
				DurationMin: int(parseFloat(walking["duration"].(string)) / 60),
				DistanceM:   int(parseFloat(walking["distance"].(string))),
			})
		}

		// 2. 公交/地铁部分提取 polyline
		if bus, ok := s["bus"].(map[string]interface{}); ok {
			buslines := bus["buslines"].([]interface{})
			if len(buslines) > 0 {
				line := buslines[0].(map[string]interface{})
				if pl, ok := line["polyline"].(string); ok && pl != "" {
					allPolylines = append(allPolylines, pl)
				}
				instr := fmt.Sprintf("乘坐 %s, 在 %s 上车, 经过 %s 站, 到 %s 下车",
					line["name"], line["departure_stop"], line["via_num"], line["arrival_stop"])
				steps = append(steps, RouteStep{
					Instruction: instr,
					DurationMin: int(parseFloat(line["duration"].(string)) / 60),
					DistanceM:   int(parseFloat(line["distance"].(string))),
				})
			}
		}
	}

	return &TravelOption{
		Mode:        "公交/地铁",
		DistanceKm:  fmt.Sprintf("%.1f", parseFloat(best["distance"].(string))/1000),
		DurationMin: int(parseFloat(best["duration"].(string)) / 60),
		Cost:        best["cost"].(string),
		Steps:       steps,
		Polyline:    strings.Join(allPolylines, ";"), // 将多段步行和地铁坐标拼成一串
	}, nil
}

func addressToCoords(address string) (string, string, error) {
	apiKey := getEnv("AMAP_API_KEY", "")
	if apiKey == "" {
		return "", "", fmt.Errorf("missing AMAP_API_KEY")
	}

	params := url.Values{}
	params.Set("key", apiKey)
	params.Set("address", address)

	resp, err := http.Get(amapGeocodeURL + "?" + params.Encode())
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	var res struct {
		Status   string `json:"status"`
		Geocodes []struct {
			Location string `json:"location"`
			Adcode   string `json:"adcode"`
		} `json:"geocodes"`
	}
	json.NewDecoder(resp.Body).Decode(&res)

	if res.Status != "1" || len(res.Geocodes) == 0 {
		return "", "", fmt.Errorf("地址未找到")
	}
	return res.Geocodes[0].Location, res.Geocodes[0].Adcode, nil
}

func parseFloat(s string) float64 {
	var f float64
	fmt.Sscanf(s, "%f", &f)
	return f
}
