package crawl

import (
	"fmt"
	"net/http"
	"strings"

	md "github.com/JohannesKaufmann/html-to-markdown"
	"github.com/PuerkitoBio/goquery"
)

func crawlCSDN(url string) (Article, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return Article{}, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return Article{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return Article{}, fmt.Errorf("status code error: %d %s", resp.StatusCode, resp.Status)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return Article{}, err
	}

	// 1. 提取标题
	title := strings.TrimSpace(doc.Find("h1#articleContentId").First().Text())
	if title == "" {
		title = doc.Find("h1").First().Text()
	}

	// 2. 定位正文容器 (CSDN 核心正文通常在 #content_views)
	selection := doc.Find("#content_views").First()
	if selection.Length() == 0 {
		// 备用选择器
		selection = doc.Find("article").First()
	}

	// 3. 核心步骤：HTML 转 Markdown
	converter := md.NewConverter("", true, nil)

	// 转换前去掉一些不需要的干扰元素（如：复制按钮）
	selection.Find(".copy-btn").Remove()
	selection.Find("script").Remove()
	selection.Find("style").Remove()

	markdown := converter.Convert(selection)

	return Article{
		DocID:     "csdn_" + extractID(url),
		Source:    "csdn",
		URL:       url,
		Title:     strings.TrimSpace(title),
		ContentMD: markdown,
	}, nil
}

func extractID(url string) string {
	idx := strings.LastIndex(url, "/")
	if idx == -1 {
		return "unknown"
	}
	// 处理可能带 .html 后缀的情况
	id := url[idx+1:]
	return strings.Split(id, ".")[0]
}
