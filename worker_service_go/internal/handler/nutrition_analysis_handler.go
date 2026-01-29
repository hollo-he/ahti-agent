package handler

import (
	"encoding/json"
	"gomod/internal/db"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// CreateNutritionAnalysisHandler 创建营养分析记录处理函数
func CreateNutritionAnalysisHandler(nutritionRepo *db.NutritionRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "未授权访问",
			})
			return
		}

		var req struct {
			ImagePath      string   `json:"image_path"`
			DetectedDishes []string `json:"detected_dishes"`
			Goal           string   `json:"goal"`
			Report         string   `json:"report"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "请求参数错误",
			})
			return
		}

		// 将检测到的菜品转换为JSON字符串
		detectedDishesJSON, err := json.Marshal(req.DetectedDishes)
		if err != nil {
			detectedDishesJSON = []byte("[]")
		}

		analysis := &db.NutritionAnalysis{
			UserID:         userID.(uint),
			ImagePath:      req.ImagePath,
			DetectedDishes: string(detectedDishesJSON),
			Goal:           req.Goal,
			Report:         req.Report,
		}

		err = nutritionRepo.CreateNutritionAnalysis(analysis)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "创建营养分析记录失败",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    analysis,
		})
	}
}

// GetNutritionAnalysesHandler 获取用户营养分析记录列表处理函数
func GetNutritionAnalysesHandler(nutritionRepo *db.NutritionRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "未授权访问",
			})
			return
		}

		pageStr := c.DefaultQuery("page", "1")
		pageSizeStr := c.DefaultQuery("page_size", "10")
		goal := c.Query("goal")

		page, err := strconv.Atoi(pageStr)
		if err != nil || page < 1 {
			page = 1
		}

		pageSize, err := strconv.Atoi(pageSizeStr)
		if err != nil || pageSize < 1 || pageSize > 100 {
			pageSize = 10
		}

		var analyses []db.NutritionAnalysis
		var total int64

		if goal != "" {
			analyses, total, err = nutritionRepo.SearchNutritionAnalyses(userID.(uint), goal, page, pageSize)
		} else {
			analyses, total, err = nutritionRepo.GetNutritionAnalysesByUserID(userID.(uint), page, pageSize)
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		// 解析DetectedDishes JSON字符串为数组
		for i := range analyses {
			var dishes []string
			if err := json.Unmarshal([]byte(analyses[i].DetectedDishes), &dishes); err == nil {
				// 临时存储解析后的数据，用于响应
				analyses[i].DetectedDishes = string(analyses[i].DetectedDishes)
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"success":   true,
			"data":      analyses,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		})
	}
}

// GetNutritionAnalysisByIDHandler 根据ID获取营养分析记录处理函数
func GetNutritionAnalysisByIDHandler(nutritionRepo *db.NutritionRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		idInt, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "无效的ID",
			})
			return
		}
		id := uint(idInt)

		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "未授权访问",
			})
			return
		}

		analysis, err := nutritionRepo.GetNutritionAnalysisByID(id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		// 确保用户只能访问自己的营养分析记录
		if analysis.UserID != userID.(uint) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "无权访问此营养分析记录",
			})
			return
		}

		// 解析DetectedDishes JSON字符串
		var dishes []string
		if err := json.Unmarshal([]byte(analysis.DetectedDishes), &dishes); err == nil {
			// 可以在这里处理解析后的数据
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    analysis,
		})
	}
}

// DeleteNutritionAnalysisHandler 删除营养分析记录处理函数
func DeleteNutritionAnalysisHandler(nutritionRepo *db.NutritionRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		idInt, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "无效的ID",
			})
			return
		}
		id := uint(idInt)

		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "未授权访问",
			})
			return
		}

		analysis, err := nutritionRepo.GetNutritionAnalysisByID(id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		// 确保用户只能删除自己的营养分析记录
		if analysis.UserID != userID.(uint) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "无权删除此营养分析记录",
			})
			return
		}

		err = nutritionRepo.DeleteNutritionAnalysis(id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "营养分析记录已删除",
		})
	}
}

// GetNutritionStatsHandler 获取营养分析统计处理函数
func GetNutritionStatsHandler(nutritionRepo *db.NutritionRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "未授权访问",
			})
			return
		}

		stats, err := nutritionRepo.GetNutritionStats(userID.(uint))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    stats,
		})
	}
}
