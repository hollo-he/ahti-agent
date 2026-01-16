package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// 定义响应结构体（只保留我们需要的字段）
type Response struct {
	Modules []struct {
		Items []struct {
			Type string `json:"type"`
			URL  struct {
				H5 string `json:"h5"`
			} `json:"url"`
		} `json:"items"`
	} `json:"modules"`
}

func main() {
	url := "https://m.ctrip.com/restapi/soa2/20684/suggest?_fxpcqlniredt=09031078417829145376&x-traceID=09031078417829145376-1768012028334-5470307"

	payload := map[string]interface{}{
		"client": map[string]interface{}{
			"locale":   "zh-CN",
			"currency": "CNY",
			"source":   "前端中台",
			"cid":      "09031078417829145376",
			"variables": []map[string]interface{}{
				{"key": "CHANNEL_ID", "value": "116"},
				{"key": "DEVICE_NAME", "value": ""},
				{"key": "SYSTEM", "value": ""},
				{"key": "SCREEN_WIDTH", "value": "1440"},
				{"key": "SCREEN_HEIGHT", "value": "900"},
				{"key": "NEED_BASE_SUGGEST", "value": "true"},
				{"key": "NEED_BASE_ENTRANCE", "value": "true"},
			},
		},
		"tab":     10,
		"keyword": "故宫",
		"channel": "H5",
		"geo": map[string]interface{}{
			"departure": map[string]interface{}{"id": 1, "type": "gs_district", "category": 3},
			"location":  map[string]interface{}{"id": 0, "type": "gs_district", "category": 3},
			"lonlat":    map[string]interface{}{"type": 0},
		},
	}

	data, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", url, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36")
	req.Header.Set("cid", "09031078417829145376")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	// 解析 JSON
	var respData Response
	if err := json.Unmarshal(body, &respData); err != nil {
		panic(err)
	}

	// 打印景点 H5 链接
	for _, module := range respData.Modules {
		for _, item := range module.Items {
			if item.Type == "sight" {
				fmt.Println(item.URL.H5)
			}
		}
	}
}
