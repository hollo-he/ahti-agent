package crawl

// 爬取文章分析
type Article struct {
	DocID       string   `json:"doc_id"`
	Source      string   `json:"source"`
	URL         string   `json:"url"`
	Title       string   `json:"title"`
	Author      string   `json:"author"`
	PublishTime string   `json:"publish_time"`
	Tags        []string `json:"tags"`
	ContentMD   string   `json:"content_md"`
}
