package ticket_get

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Ctrip 搜索接口地址 (13531 是携程移动端全局搜索的服务码)
const ctripSearchURL = "https://m.ctrip.com/restapi/soa2/20684/json/search"

type CtripClient struct {
	HttpClient *http.Client
}

func NewCtripClient() *CtripClient {
	return &CtripClient{
		HttpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

// GetTicketH5Link 输入关键词，获取精准的 H5 门票链接
func (c *CtripClient) GetTicketH5Link(keyword string) (string, string, error) {
	reqBody := map[string]interface{}{
		"channel": "H5",
		"tab":     10, // 10 通常代表“景点/门票”频道
		"keyword": keyword,
		"client": map[string]interface{}{
			"locale": "zh-CN",
			"source": "H5",
		},
	}

	jsonData, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", ctripSearchURL, bytes.NewBuffer(jsonData))

	// 模拟移动端浏览器 Header
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1")

	resp, err := c.HttpClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	// 解析复杂的携程模块化响应
	var res map[string]interface{}
	json.Unmarshal(body, &res)

	// 携程响应结构：Modules -> Items
	modules, ok := res["modules"].([]interface{})
	if !ok {
		return "", "", fmt.Errorf("未找到相关景点数据")
	}

	for _, m := range modules {
		module := m.(map[string]interface{})
		items, ok := module["items"].([]interface{})
		if !ok {
			continue
		}

		for _, it := range items {
			item := it.(map[string]interface{})
			// 只提取类型为 "sight" (景点) 的条目
			if item["type"] == "sight" {
				name := item["name"].(string)

				// 逻辑 A: 如果接口直接返回了 H5 链接，直接用
				if urlObj, ok := item["url"].(map[string]interface{}); ok {
					if h5, ok := urlObj["h5"].(string); ok && h5 != "" {
						return name, h5, nil
					}
				}

				// 逻辑 B: 即使接口没给全，我们根据你发现的规律手动拼接
				// 规律：https://m.ctrip.com/webapp/you/gspoi/sight/{districtId}/0.html?poiId={poiId}
				poiId := item["id"]
				districtId := "2" // 默认 2 是上海，实际可以从 item["districtId"] 拿
				if dId, exists := item["districtId"]; exists {
					districtId = fmt.Sprintf("%v", dId)
				}

				constructedURL := fmt.Sprintf("https://m.ctrip.com/webapp/you/gspoi/sight/%s/0.html?poiId=%v", districtId, poiId)
				return name, constructedURL, nil
			}
		}
	}

	return "", "", fmt.Errorf("无匹配景点")
}
