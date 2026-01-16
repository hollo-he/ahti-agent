package dish_get

// 菜品分析
type DishDetail struct {
	Title     string `json:"title"`
	ContentMD string `json:"content_md"` // 包含 Tavily 的 AI 总结
	SourceURL string `json:"url"`
}
