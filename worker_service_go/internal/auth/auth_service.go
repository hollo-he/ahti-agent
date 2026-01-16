package auth

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gomod/internal/db"
)

const (
	TokenExpiry   = 24 * time.Hour
	RefreshExpiry = 7 * 24 * time.Hour
)

var JWTSecretKey = getEnv("JWT_SECRET", "ahti_agent_secret_key_change_this_in_production")

// getEnv retrieves environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// AuthService 认证服务
type AuthService struct {
	userRepo    *db.UserRepository
	SessionRepo *db.SessionRepository
	redisClient *redis.Client
}

// NewAuthService 创建新的认证服务
func NewAuthService(userRepo *db.UserRepository, sessionRepo *db.SessionRepository, redisClient *redis.Client) *AuthService {
	return &AuthService{
		userRepo:    userRepo,
		SessionRepo: sessionRepo,
		redisClient: redisClient,
	}
}

// Claims JWT声明
type Claims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// RegisterUser 注册用户
func (s *AuthService) RegisterUser(username, email, password, phone string) (*db.User, error) {
	// 验证输入
	if username == "" || email == "" || password == "" {
		return nil, errors.New("用户名、邮箱和密码不能为空")
	}

	// 创建用户
	user := &db.User{
		Username:           username,
		Email:              email,
		PasswordHash:       password, // 密码将在CreateUser中被加密
		Phone:              phone,
		DietaryPreferences: "{}",  // 设置为空JSON对象
		TravelPreferences:  "{}", // 设置为空JSON对象
		IsActive:           true,
	}

	err := s.userRepo.CreateUser(user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// LoginUser 用户登录
func (s *AuthService) LoginUser(email, password string) (*db.User, string, string, error) {
	// 验证用户凭据
	user, err := s.userRepo.ValidatePassword(email, password)
	if err != nil {
		return nil, "", "", err
	}

	// 生成JWT令牌
	token, err := s.GenerateToken(user.ID, user.Username)
	if err != nil {
		return nil, "", "", err
	}

	// 生成刷新令牌
	refreshToken, err := s.GenerateRefreshToken()
	if err != nil {
		return nil, "", "", err
	}

	// 创建会话记录
	session := &db.UserSession{
		UserID:       user.ID,
		SessionToken: token,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(TokenExpiry),
		IsActive:     true,
	}

	err = s.SessionRepo.CreateSession(session)
	if err != nil {
		return nil, "", "", err
	}

	// 更新用户最后登录时间
	s.userRepo.UpdateUserLastLogin(user.ID)

	return user, token, refreshToken, nil
}

// LogoutUser 用户登出
func (s *AuthService) LogoutUser(token string) error {
	return s.SessionRepo.InvalidateSession(token)
}

// RefreshToken 刷新令牌
func (s *AuthService) RefreshToken(refreshToken string) (string, error) {
	session, err := s.SessionRepo.GetSessionByRefreshToken(refreshToken)
	if err != nil {
		return "", err
	}

	// 生成新令牌
	newToken, err := s.GenerateToken(session.UserID, session.User.Username)
	if err != nil {
		return "", err
	}

	// 更新会话
	newExpiresAt := time.Now().Add(TokenExpiry)
	err = s.SessionRepo.RefreshSession(session.SessionToken, newExpiresAt)
	if err != nil {
		return "", err
	}

	// 更新会话token
	session.SessionToken = newToken
	session.ExpiresAt = newExpiresAt
	err = s.SessionRepo.UpdateSessionLastAccess(newToken)
	if err != nil {
		return "", err
	}

	return newToken, nil
}

// ValidateToken 验证令牌
func (s *AuthService) ValidateToken(tokenString string) (*Claims, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(JWTSecretKey), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("无效的令牌")
	}

	// 检查会话是否仍然有效
	_, err = s.SessionRepo.GetSessionByToken(tokenString)
	if err != nil {
		return nil, err
	}

	return claims, nil
}

// ChangePassword 修改密码
func (s *AuthService) ChangePassword(userID uint, oldPassword, newPassword string) error {
	user, err := s.userRepo.GetUserByID(userID)
	if err != nil {
		return err
	}

	// 验证旧密码
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword))
	if err != nil {
		return errors.New("旧密码错误")
	}

	// 加密新密码
	hashedNewPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// 更新密码
	user.PasswordHash = string(hashedNewPassword)
	err = s.userRepo.UpdateUser(user)
	if err != nil {
		return err
	}

	// 使该用户的所有会话失效
	err = s.SessionRepo.InvalidateUserSessions(userID)
	if err != nil {
		return err
	}

	return nil
}

// GenerateToken 生成JWT令牌
func (s *AuthService) GenerateToken(userID uint, username string) (string, error) {
	claims := &Claims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(TokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "ahti-agent",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(JWTSecretKey))
}

// GenerateRefreshToken 生成刷新令牌
func (s *AuthService) GenerateRefreshToken() (string, error) {
	// 在实际应用中，应该使用更安全的方法生成刷新令牌
	// 这里简单地使用时间戳+用户ID的方式
	refreshToken := fmt.Sprintf("%d_%d", time.Now().UnixNano(), time.Now().Nanosecond())

	// 实际应用中应该对刷新令牌进行哈希处理
	hashed, err := bcrypt.GenerateFromPassword([]byte(refreshToken), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	return string(hashed), nil
}

// VerifyPhoneCode 验证手机验证码
func (s *AuthService) VerifyPhoneCode(phone, code string) (bool, error) {
	ctx := context.Background()
	storedCode, err := s.redisClient.Get(ctx, phone+"_code").Result()
	if err != nil {
		return false, fmt.Errorf("获取验证码失败: %v", err)
	}

	if storedCode != code {
		return false, nil
	}

	// 验证成功后删除验证码
	err = s.redisClient.Del(ctx, phone+"_code").Err()
	if err != nil {
		// 记录错误但不返回，因为验证码已经验证成功
		fmt.Printf("删除验证码失败: %v\n", err)
	}

	return true, nil
}
