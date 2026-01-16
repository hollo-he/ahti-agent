package dish_get

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
)

var (
	mu         sync.Mutex
	httpClient = &http.Client{}
)

// Tavily 相关结构体保持不变...
type TavilyRequest struct {
	APIKey        string `json:"api_key"`
	Query         string `json:"query"`
	SearchDepth   string `json:"search_depth"`
	MaxResults    int    `json:"max_results"`
	IncludeAnswer bool   `json:"include_answer"`
}

type TavilyResponse struct {
	Answer  string `json:"answer"`
	Results []struct {
		Content string `json:"content"`
		URL     string `json:"url"`
	} `json:"results"`
}

func (d *DishDetail) fetchXiachufang(name string) {
	d.fetchViaTavily(name)
}

func (d *DishDetail) fetchViaTavily(name string) {
	apiKey := "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"

	// 明确要求 AI 总结包含食材和过敏原
	query := fmt.Sprintf("%s 的详细食材清单、热量、过敏原。请直接以 'AI总结:' 开头。", name)

	reqBody, _ := json.Marshal(TavilyRequest{
		APIKey:        apiKey,
		Query:         query,
		SearchDepth:   "advanced",
		MaxResults:    1,
		IncludeAnswer: true,
	})

	resp, err := httpClient.Post("https://api.tavily.com/search", "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var tRes TavilyResponse
	json.Unmarshal(body, &tRes)

	// 优先提取 Answer 或 Result
	rawText := tRes.Answer
	if rawText == "" && len(tRes.Results) > 0 {
		rawText = tRes.Results[0].Content
	}

	if rawText != "" {
		mu.Lock()
		// 截取 AI 总结部分
		if idx := strings.Index(rawText, "AI总结:"); idx != -1 {
			d.ContentMD = rawText[idx:]
		} else {
			d.ContentMD = "AI总结: " + rawText
		}

		if len(tRes.Results) > 0 {
			d.SourceURL = tRes.Results[0].URL
		}

		// --- 删掉了这里的 MatchAllergens 调用，因为 engine.go 会调 ---

		mu.Unlock()
		fmt.Printf("[成功] <%s> AI报告已生成\n", name)
	}
}
