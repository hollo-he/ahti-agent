package ticket_get

import (
	"testing"
)

func TestGetTicketH5Links(t *testing.T) {
	keyword := "外滩"
	links, err := GetTicketH5Links(keyword)

	if err != nil {
		t.Fatalf("测试出错: %v", err)
	}

	if len(links) == 0 {
		t.Logf("⚠️ 在 'base suggestion' 模块下未找到 [%s] 的 sight 类型链接", keyword)
		return
	}

	t.Logf("✅ 成功匹配到 %d 条链接:", len(links))
	for _, link := range links {
		t.Logf("🔗 %s", link)
	}
}
