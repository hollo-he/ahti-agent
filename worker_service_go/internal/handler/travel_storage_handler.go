package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"gomod/internal/auth"
	"gomod/internal/db"

	"github.com/gin-gonic/gin"
)

// TravelPlanRequest 旅行计划请求结构
type TravelPlanRequest struct {
	UserID        uint   `json:"user_id" binding:"required"`
	ThreadID      string `json:"thread_id" binding:"required"`
	PlanTitle     string `json:"plan_title" binding:"required"`
	Origin        string `json:"origin" binding:"required"`
	Destination   string `json:"destination" binding:"required"`
	City          string `json:"city"`
	TicketKeyword string `json:"ticket_keyword"`
	H5FilePath    string `json:"h5_file_path" binding:"required"`
	MDFilePath    string `json:"md_file_path" binding:"required"`
	H5URL         string `json:"h5_url" binding:"required"`
	DownloadURL   string `json:"download_url" binding:"required"`
	ExpiresIn     int    `json:"expires_in"` // 过期时间（小时），默认24小时
}

// StoreTravelPlanHandler 存储旅行计划处理函数
func StoreTravelPlanHandler(travelPlanRepo *db.TravelPlanRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req TravelPlanRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "请求参数错误: " + err.Error(),
			})
			return
		}

		// 设置默认过期时间为24小时
		expiresIn := req.ExpiresIn
		if expiresIn <= 0 {
			expiresIn = 24 // 默认24小时
		}

		// 创建旅行计划对象
		plan := &db.TravelPlan{
			UserID:        req.UserID,
			ThreadID:      req.ThreadID,
			PlanTitle:     req.PlanTitle,
			Origin:        req.Origin,
			Destination:   req.Destination,
			City:          req.City,
			TicketKeyword: req.TicketKeyword,
			H5FilePath:    req.H5FilePath,
			MDFilePath:    req.MDFilePath,
			H5URL:         req.H5URL,
			DownloadURL:   req.DownloadURL,
			ExpiresAt:     time.Now().Add(time.Duration(expiresIn) * time.Hour),
		}

		// 检查用户是否存在
		userRepo := db.NewUserRepository(db.DB)
		_, err := userRepo.GetUserByID(req.UserID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "用户不存在",
			})
			return
		}

		// 检查是否已存在相同的thread_id
		existingPlan, err := travelPlanRepo.GetTravelPlanByThreadID(req.ThreadID)
		if err == nil && existingPlan != nil {
			// 如果已存在，更新现有计划
			plan.ID = existingPlan.ID
			err = travelPlanRepo.UpdateTravelPlan(plan)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "更新旅行计划失败: " + err.Error(),
				})
				return
			}
		} else {
			// 创建新的旅行计划
			err = travelPlanRepo.CreateTravelPlan(plan)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "创建旅行计划失败: " + err.Error(),
				})
				return
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "旅行计划存储成功",
			"data":    plan,
		})
	}
}

// GetTravelPlanByThreadIDHandler 根据ThreadID获取旅行计划处理函数
func GetTravelPlanByThreadIDHandler(travelPlanRepo *db.TravelPlanRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		threadID := c.Query("thread_id")
		if threadID == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "thread_id 参数不能为空",
			})
			return
		}

		plan, err := travelPlanRepo.GetTravelPlanByThreadID(threadID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		// 检查计划是否已过期
		if plan.IsExpired || plan.ExpiresAt.Before(time.Now()) {
			// 标记为已过期
			travelPlanRepo.MarkAsExpired(plan.ID)
			c.JSON(http.StatusGone, gin.H{
				"error": "旅行计划已过期",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    plan,
		})
	}
}

// CleanupExpiredPlansHandler 清理过期计划处理函数
func CleanupExpiredPlansHandler(travelPlanRepo *db.TravelPlanRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		err := travelPlanRepo.MarkExpiredPlans()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "清理过期计划失败: " + err.Error(),
			})
			return
		}

		// 可选：物理删除已标记为过期的记录
		err = travelPlanRepo.DeleteExpiredPlans()
		if err != nil {
			fmt.Printf("删除过期计划记录失败: %v\n", err)
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "过期计划清理完成",
		})
	}
}

// UpdateTravelPlanHandler 更新旅行计划处理函数
func UpdateTravelPlanHandler(travelPlanRepo *db.TravelPlanRepository) gin.HandlerFunc {
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

		var req struct {
			PlanTitle     string `json:"plan_title"`
			Origin        string `json:"origin"`
			Destination   string `json:"destination"`
			City          string `json:"city"`
			TicketKeyword string `json:"ticket_keyword"`
			ExpiresIn     int    `json:"expires_in"` // 过期时间（小时）
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "请求参数错误: " + err.Error(),
			})
			return
		}

		plan, err := travelPlanRepo.GetTravelPlanByID(id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		// 更新可变字段
		if req.PlanTitle != "" {
			plan.PlanTitle = req.PlanTitle
		}
		if req.Origin != "" {
			plan.Origin = req.Origin
		}
		if req.Destination != "" {
			plan.Destination = req.Destination
		}
		if req.City != "" {
			plan.City = req.City
		}
		if req.TicketKeyword != "" {
			plan.TicketKeyword = req.TicketKeyword
		}

		// 如果提供了新的过期时间，则更新
		if req.ExpiresIn > 0 {
			plan.ExpiresAt = time.Now().Add(time.Duration(req.ExpiresIn) * time.Hour)
		}

		err = travelPlanRepo.UpdateTravelPlan(plan)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "更新旅行计划失败: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "旅行计划更新成功",
			"data":    plan,
		})
	}
}

// RegisterTravelPlanRoutes 注册旅行计划相关路由
func RegisterTravelPlanRoutes(r *gin.Engine, authService *auth.AuthService, travelPlanRepo *db.TravelPlanRepository) {
	// 需要认证的存储路由
	protected := r.Group("/api/travel")
	protected.Use(AuthMiddleware(authService))
	{
		protected.POST("/plan/store", StoreTravelPlanHandler(travelPlanRepo)) // 存储旅行计划
		protected.PUT("/plan/:id", UpdateTravelPlanHandler(travelPlanRepo))   // 更新旅行计划
		protected.DELETE("/plan/:id", func(c *gin.Context) {
			DeleteTravelPlanHandler(travelPlanRepo)(c)
		}) // 删除旅行计划（标记为过期）
	}

	// 无需认证的公共路由
	public := r.Group("/api/public/travel")
	{
		public.GET("/plan", GetTravelPlanByThreadIDHandler(travelPlanRepo)) // 根据thread_id获取计划
	}

	// 管理员路由（清理过期计划）
	admin := r.Group("/api/admin/travel")
	// 这里可能需要管理员认证中间件
	{
		admin.DELETE("/cleanup", CleanupExpiredPlansHandler(travelPlanRepo)) // 清理过期计划
	}
}
