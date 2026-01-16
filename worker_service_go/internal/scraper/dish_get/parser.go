package dish_get

import (
	"strings"
)

func (d *DishDetail) ParseHTMLToMarkdown(raw string) string {
	// 直接返回截取后的文本
	return strings.TrimSpace(raw)
}
