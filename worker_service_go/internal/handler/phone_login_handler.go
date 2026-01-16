package handler

import (
	"net/http"
	"time"

	"gomod/internal/auth"
	"gomod/internal/db"

	"github.com/gin-gonic/gin"
)

// PhoneLoginRequest 手机号登录请求
type PhoneLoginRequest struct {
	Phone string `json:"phone" binding:"required"`
	Code  string `json:"code" binding:"required"`
}

// CreatePhoneLoginHandler 创建手机号验证码登录处理函数
func CreatePhoneLoginHandler(authService *auth.AuthService, userRepo *db.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req PhoneLoginRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "手机号和验证码不能为空",
			})
			return
		}

		// 验证验证码
		valid, err := authService.VerifyPhoneCode(req.Phone, req.Code)
		if err != nil || !valid {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "验证码错误或已过期",
			})
			return
		}

		// 查找用户，如果不存在则创建新用户
		user, err := userRepo.GetUserByPhone(req.Phone)
		if err != nil {
			// 用户不存在，创建新用户
			user = &db.User{
				Username:           req.Phone, // 使用手机号作为用户名
				Phone:              req.Phone,
				Email:              req.Phone + "@phone.login", // 生成临时邮箱
				DietaryPreferences: "{}",  // 设置为空JSON对象
				TravelPreferences:  "{}", // 设置为空JSON对象
				IsActive:           true,
			}

			err = userRepo.CreateUser(user)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "创建用户失败",
				})
				return
			}
		}

		// 生成JWT令牌
		token, err := authService.GenerateToken(user.ID, user.Username)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "生成令牌失败",
			})
			return
		}

		// 生成刷新令牌
		refreshToken, err := authService.GenerateRefreshToken()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "生成刷新令牌失败",
			})
			return
		}

		// 创建会话记录
		session := &db.UserSession{
			UserID:       user.ID,
			SessionToken: token,
			RefreshToken: refreshToken,
			ExpiresAt:    time.Now().Add(auth.TokenExpiry),
			IsActive:     true,
		}

		err = authService.SessionRepo.CreateSession(session)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "创建会话失败",
			})
			return
		}

		// 更新用户最后登录时间
		userRepo.UpdateUserLastLogin(user.ID)

		c.JSON(http.StatusOK, gin.H{
			"success":      true,
			"user":         user,
			"token":        token,
			"refreshToken": refreshToken,
		})
	}
}
