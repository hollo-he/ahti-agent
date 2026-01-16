package ticket_get

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
)

// GetTicketH5Links 修改返回值为 []TicketInfo
func GetTicketH5Links(keyword string) ([]TicketInfo, error) {
	apiURL := "https://m.ctrip.com/restapi/soa2/20684/suggest?_fxpcqlniredt=09031078417829145376&x-traceID=09031078417829145376-1768012028334-5470307"

	payload := map[string]interface{}{
		"client": map[string]interface{}{
			"locale": "zh-CN", "currency": "CNY", "source": "前端中台", "cid": "09031078417829145376",
			"variables": []map[string]interface{}{
				{"key": "CHANNEL_ID", "value": "116"},
				{"key": "NEED_BASE_SUGGEST", "value": "true"},
			},
		},
		"tab": 10, "keyword": keyword, "channel": "H5",
	}

	data, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", apiURL, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("cid", "09031078417829145376")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var respData Response
	json.Unmarshal(body, &respData)

	var result []TicketInfo
	for _, module := range respData.Modules {
		if module.Name == "base suggestion" {
			for _, item := range module.Items {
				if item.Type == "sight" && item.URL.H5 != "" {
					// 封装地名和链接
					result = append(result, TicketInfo{
						Name: item.Name,
						URL:  item.URL.H5,
					})
				}
			}
		}
	}
	return result, nil
}
