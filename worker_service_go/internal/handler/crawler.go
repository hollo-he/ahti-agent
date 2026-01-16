package handler

import (
	"gomod/internal/scraper/crawl"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Handler 结构体用于持有 Crawler 实例
type Handler struct {
	Crawler *crawl.Crawler
}

func NewHandler(c *crawl.Crawler) *Handler {
	return &Handler{Crawler: c}
}

// CrawlHandler 对应原来的 /api/crawl 逻辑
func (h *Handler) CrawlHandler(c *gin.Context) {
	// 1. 定义请求结构
	var req struct {
		URLs []string `json:"urls" binding:"required"`
	}

	// 2. 绑定 JSON 参数 (Gin 自动处理错误)
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数格式错误"})
		return
	}

	// 3. 调用你已有的 crawler.go 里的逻辑
	articles, err := h.Crawler.Crawl(c.Request.Context(), req.URLs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 4. 返回结果
	c.JSON(http.StatusOK, gin.H{"articles": articles})
}
