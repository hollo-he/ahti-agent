package handler

import (
	"gomod/internal/scraper/dish_get"
	"net/http" // 引用你的 scraper 包

	"github.com/gin-gonic/gin"
)

// NutritionRequest 定义接收 Python 端传来的参数结构
type NutritionRequest struct {
	Names []string `json:"names" binding:"required"`
}

// HandleNutrition 分析餐饮营养的接口处理器
func HandleNutrition(c *gin.Context) {
	var req NutritionRequest

	// 1. 解析并校验 JSON 请求
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数不合法，需要菜名列表(names)",
		})
		return
	}

	// 2. 调用核心调度引擎 (engine.go 中的入口)
	// 这个过程在 scraper 内部是高度并发的
	results := dish_get.ScrapeDishInfo(req.Names)

	// 3. 统一返回结果
	// 返回格式为 []scraper.DishDetail
	c.JSON(http.StatusOK, results)
}
