package db

import (
	"time"

	"gorm.io/gorm"
)

// User 用户模型
type User struct {
	ID                uint           `gorm:"primaryKey;autoIncrement;type:bigint unsigned" json:"id"`
	Username          string         `gorm:"uniqueIndex:idx_username;size:50;not null" json:"username"`
	Email             string         `gorm:"uniqueIndex:idx_email;size:100;not null" json:"email"`
	PasswordHash      string         `gorm:"size:255;not null" json:"password_hash"`
	Phone             string         `gorm:"size:20" json:"phone"`
	Nickname          string         `gorm:"size:50" json:"nickname"`
	AvatarURL         string         `gorm:"type:text" json:"avatar_url"`
	Gender            string         `gorm:"size:1;default:'U';check:gender IN ('M','F','U')" json:"gender"` // M:男, F:女, U:未知
	Age               int            `json:"age"`
	DietaryPreferences string        `gorm:"type:json" json:"dietary_preferences"` // 饮食偏好，JSON格式存储
	TravelPreferences  string        `gorm:"type:json" json:"travel_preferences"` // 旅行偏好，JSON格式存储
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	LastLoginAt       *time.Time     `json:"last_login_at"`
	IsActive          bool           `gorm:"default:true" json:"is_active"`
	IsVerified        bool           `gorm:"default:false" json:"is_verified"`

	// 关联关系
	TravelPlans       []TravelPlan       `gorm:"foreignKey:UserID" json:"travel_plans"`
	UserSessions      []UserSession      `gorm:"foreignKey:UserID" json:"user_sessions"`
	NutritionAnalyses []NutritionAnalysis `gorm:"foreignKey:UserID" json:"nutrition_analyses"`
}

// NutritionAnalysis 营养分析记录模型
type NutritionAnalysis struct {
	ID             uint      `gorm:"primaryKey;autoIncrement;type:bigint unsigned" json:"id"`
	UserID         uint      `gorm:"not null;type:bigint unsigned" json:"user_id"`
	ImagePath      string    `gorm:"type:text" json:"image_path"`      // 图片存储路径
	DetectedDishes string    `gorm:"type:json" json:"detected_dishes"` // 识别的菜品，JSON格式
	Goal           string    `gorm:"size:50" json:"goal"`              // 分析目标（如控糖）
	Report         string    `gorm:"type:text" json:"report"`          // AI分析报告
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`

	// 关联关系
	User User `gorm:"foreignKey:UserID" json:"user"`
}

// TravelPlan 旅行计划模型
type TravelPlan struct {
	ID           uint      `gorm:"primaryKey;autoIncrement;type:bigint unsigned" json:"id"`
	UserID       uint      `gorm:"not null;type:bigint unsigned" json:"user_id"`  // 明确指定为bigint unsigned类型以匹配User.ID
	ThreadID     string    `gorm:"index:idx_thread_id;size:100;not null" json:"thread_id"` // 对应LangGraph的thread_id
	PlanTitle    string    `gorm:"size:200;not null" json:"plan_title"`
	Origin       string    `gorm:"size:100;not null" json:"origin"`       // 起点
	Destination  string    `gorm:"size:100;not null" json:"destination"` // 目的地
	City         string    `gorm:"size:100" json:"city"`                 // 目标城市
	TicketKeyword string   `gorm:"size:100" json:"ticket_keyword"`       // 票务关键词
	H5FilePath   string    `gorm:"type:text;not null" json:"h5_file_path"` // H5文件存储路径
	MDFilePath   string    `gorm:"type:text;not null" json:"md_file_path"` // Markdown文件存储路径
	H5URL        string    `gorm:"type:text;not null" json:"h5_url"`      // H5访问URL
	DownloadURL  string    `gorm:"type:text;not null" json:"download_url"` // 下载URL
	ExpiresAt    time.Time `gorm:"not null" json:"expires_at"`            // 过期时间
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	IsExpired    bool      `gorm:"default:false" json:"is_expired"` // 是否已过期

	// 关联关系
	User User `gorm:"foreignKey:UserID" json:"user"`
}

// UserSession 用户会话模型
type UserSession struct {
	ID            uint      `gorm:"primaryKey;autoIncrement;type:bigint unsigned" json:"id"`
	UserID        uint      `gorm:"not null;type:bigint unsigned" json:"user_id"`  // 明确指定为bigint unsigned类型以匹配User.ID
	SessionToken  string    `gorm:"uniqueIndex:idx_session_token;size:255;not null" json:"session_token"`
	RefreshToken  string    `gorm:"uniqueIndex:idx_refresh_token;size:255;not null" json:"refresh_token"`
	ExpiresAt     time.Time `gorm:"not null" json:"expires_at"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`  // 添加 UpdatedAt 字段
	LastAccessedAt time.Time `json:"last_accessed_at"`
	IPAddress     string    `gorm:"size:45" json:"ip_address"` // 存储IPv4或IPv6地址
	UserAgent     string    `gorm:"type:text" json:"user_agent"`
	IsActive      bool      `gorm:"default:true" json:"is_active"`

	// 关联关系
	User User `gorm:"foreignKey:UserID" json:"user"`
}

// TableName 指定表名
func (User) TableName() string {
	return "users"
}

func (TravelPlan) TableName() string {
	return "travel_plans"
}

func (UserSession) TableName() string {
	return "user_sessions"
}

func (NutritionAnalysis) TableName() string {
	return "nutrition_analyses"
}

// 为每个模型添加GORM钩子函数
func (u *User) BeforeCreate(tx *gorm.DB) error {
	return nil
}

func (u *User) BeforeUpdate(tx *gorm.DB) error {
	return nil
}

func (tp *TravelPlan) BeforeCreate(tx *gorm.DB) error {
	return nil
}

func (tp *TravelPlan) BeforeUpdate(tx *gorm.DB) error {
	return nil
}

func (us *UserSession) BeforeCreate(tx *gorm.DB) error {
	return nil
}

func (us *UserSession) BeforeUpdate(tx *gorm.DB) error {
	return nil
}