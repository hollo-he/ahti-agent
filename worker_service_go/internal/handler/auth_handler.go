package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"gomod/internal/auth"
	"gomod/internal/db"

	"github.com/gin-gonic/gin"
)

// CreateRegisterHandler 创建注册处理函数
func CreateRegisterHandler(authService *auth.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Username string `json:"username" binding:"required"`
			Email    string `json:"email" binding:"required"`
			Password string `json:"password" binding:"required"`
			Phone    string `json:"phone"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "请求参数错误",
			})
			return
		}

		user, err := authService.RegisterUser(req.Username, req.Email, req.Password, req.Phone)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"user":    user,
		})
	}
}

// CreateLoginHandler 创建登录处理函数
func CreateLoginHandler(authService *auth.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Email    string `json:"email" binding:"required"`
			Password string `json:"password" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "邮箱和密码不能为空",
			})
			return
		}

		user, token, refreshToken, err := authService.LoginUser(req.Email, req.Password)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success":      true,
			"user":         user,
			"token":        token,
			"refreshToken": refreshToken,
		})
	}
}

// CreateLogoutHandler 创建登出处理函数
func CreateLogoutHandler(authService *auth.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "缺少认证头",
			})
			return
		}

		// 移除 "Bearer " 前缀
		token := ""
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			token = authHeader[7:]
		} else {
			token = authHeader
		}

		err := authService.LogoutUser(token)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "登出成功",
		})
	}
}

// CreateRefreshHandler 创建刷新令牌处理函数
func CreateRefreshHandler(authService *auth.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			RefreshToken string `json:"refresh_token" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "刷新令牌不能为空",
			})
			return
		}

		newToken, err := authService.RefreshToken(req.RefreshToken)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"token":   newToken,
		})
	}
}

// CreateChangePasswordHandler 创建修改密码处理函数
func CreateChangePasswordHandler(authService *auth.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, exists := c.Get("claims")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "未授权访问",
			})
			return
		}

		userClaims := claims.(*auth.Claims)

		var req struct {
			OldPassword string `json:"old_password" binding:"required"`
			NewPassword string `json:"new_password" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "旧密码和新密码不能为空",
			})
			return
		}

		err := authService.ChangePassword(userClaims.UserID, req.OldPassword, req.NewPassword)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "密码修改成功",
		})
	}
}

// AuthMiddleware 认证中间件
func AuthMiddleware(authService *auth.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "缺少认证头",
			})
			c.Abort()
			return
		}

		// 移除 "Bearer " 前缀
		token := ""
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			token = authHeader[7:]
		} else {
			token = authHeader
		}

		claims, err := authService.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "无效的令牌",
			})
			c.Abort()
			return
		}

		// 将用户信息存储到上下文中
		c.Set("claims", claims)
		c.Set("user_id", claims.UserID)
		c.Next()
	}
}

// GetProfileHandler 获取用户资料处理函数
func GetProfileHandler(userRepo *db.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "未授权访问",
			})
			return
		}

		user, err := userRepo.GetUserByID(userID.(uint))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		// 不返回密码哈希
		user.PasswordHash = ""
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"user":    user,
		})
	}
}

// UpdateProfileHandler 更新用户资料处理函数
func UpdateProfileHandler(userRepo *db.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "未授权访问",
			})
			return
		}

		// 定义请求结构体，使用指针以区分未设置和零值
		var req struct {
			Nickname           *string `json:"nickname"`
			AvatarURL          *string `json:"avatar_url"`
			Gender             *string `json:"gender"`
			Age                *int    `json:"age"`
			DietaryPreferences *string `json:"dietary_preferences"`
			TravelPreferences  *string `json:"travel_preferences"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "请求参数错误",
			})
			return
		}

		user, err := userRepo.GetUserByID(userID.(uint))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		// 更新用户信息
		if req.Nickname != nil {
			user.Nickname = *req.Nickname
		}
		if req.AvatarURL != nil {
			user.AvatarURL = *req.AvatarURL
		}
		if req.Gender != nil {
			user.Gender = *req.Gender
		}
		if req.Age != nil {
			user.Age = *req.Age
		}
		if req.DietaryPreferences != nil {
			user.DietaryPreferences = *req.DietaryPreferences
		}
		if req.TravelPreferences != nil {
			user.TravelPreferences = *req.TravelPreferences
		}

		err = userRepo.UpdateUser(user)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		// 不返回密码哈希
		user.PasswordHash = ""
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"user":    user,
		})
	}
}

// GetUserTravelPlansHandler 获取用户旅行计划处理函数
func GetUserTravelPlansHandler(travelPlanRepo *db.TravelPlanRepository) gin.HandlerFunc {
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

		page, err := strconv.Atoi(pageStr)
		if err != nil || page < 1 {
			page = 1
		}

		pageSize, err := strconv.Atoi(pageSizeStr)
		if err != nil || pageSize < 1 || pageSize > 100 {
			pageSize = 10
		}

		plans, total, err := travelPlanRepo.GetTravelPlansByUserID(userID.(uint), page, pageSize)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success":   true,
			"data":      plans,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		})
	}
}

// GetTravelPlanByIDHandler 根据ID获取旅行计划处理函数
func GetTravelPlanByIDHandler(travelPlanRepo *db.TravelPlanRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "无效的ID",
			})
			return
		}

		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "未授权访问",
			})
			return
		}

		plan, err := travelPlanRepo.GetTravelPlanByID(uint(id))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		// 确保用户只能访问自己的旅行计划
		if plan.UserID != userID.(uint) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "无权访问此旅行计划",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    plan,
		})
	}
}

// GetAllTravelPlansHandler 获取所有旅行计划处理函数
func GetAllTravelPlansHandler(travelPlanRepo *db.TravelPlanRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "未授权访问",
			})
			return
		}

		fmt.Printf("🔍 [GetAllTravelPlans] user_id = %v\n", userID)

		pageStr := c.DefaultQuery("page", "1")
		pageSizeStr := c.DefaultQuery("page_size", "10")

		page, err := strconv.Atoi(pageStr)
		if err != nil || page < 1 {
			page = 1
		}

		pageSize, err := strconv.Atoi(pageSizeStr)
		if err != nil || pageSize < 1 || pageSize > 100 {
			pageSize = 10
		}

		plans, total, err := travelPlanRepo.GetActiveTravelPlans(userID.(uint), page, pageSize)
		if err != nil {
			fmt.Printf("❌ [GetAllTravelPlans] 查询失败: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		fmt.Printf("✅ [GetAllTravelPlans] 查询成功: total=%d, len(plans)=%d\n", total, len(plans))
		c.JSON(http.StatusOK, gin.H{
			"success":   true,
			"data":      plans,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		})
	}
}

func DeleteTravelPlanHandler(travelPlanRepo *db.TravelPlanRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "无效的ID",
			})
			return
		}

		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "未授权访问",
			})
			return
		}

		plan, err := travelPlanRepo.GetTravelPlanByID(uint(id))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		// 确保用户只能删除自己的旅行计划
		if plan.UserID != userID.(uint) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "无权删除此旅行计划",
			})
			return
		}

		err = travelPlanRepo.MarkAsExpired(uint(id))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "旅行计划已标记为过期",
		})
	}
}
