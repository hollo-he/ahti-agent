package ticket_get

// TicketInfo 定义返回给业务层的结构
type TicketInfo struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

type Response struct {
	Modules []struct {
		Name  string `json:"name"`
		Items []struct {
			Name string `json:"name"` // 关键：增加地名抓取
			Type string `json:"type"`
			URL  struct {
				H5 string `json:"h5"`
			} `json:"url"`
		} `json:"items"`
	} `json:"modules"`
}
