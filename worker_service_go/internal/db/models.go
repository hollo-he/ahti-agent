package db

import (
	"time"

	"gorm.io/gorm"
)

// User 用户模型
type User struct {
	ID                uint           `gorm:"primaryKey;autoIncrement" json:"id"`
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
	Notes             []Note              `gorm:"foreignKey:UserID" json:"notes"`
	Todos             []Todo              `gorm:"foreignKey:UserID" json:"todos"`
}

// Todo 待办事项模型
type Todo struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID      uint      `gorm:"not null" json:"user_id"`
	Title       string    `gorm:"size:200;not null" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	Status      string    `gorm:"size:20;default:'pending';check:status IN ('pending','in_progress','completed')" json:"status"`
	Priority    string    `gorm:"size:10;default:'medium';check:priority IN ('low','medium','high')" json:"priority"`
	DueDate     *time.Time `json:"due_date"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// 关联关系
	User User `gorm:"foreignKey:UserID" json:"user"`
}

// Note 记事本/日记模型
type Note struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID      uint      `gorm:"not null" json:"user_id"`
	Title       string    `gorm:"size:200;not null" json:"title"`
	Content     string    `gorm:"type:text;not null" json:"content"`
	Type        string    `gorm:"size:20;default:'note';check:type IN ('note','diary')" json:"type"` // note: 笔记, diary: 日记
	ImageURLs   string    `gorm:"type:json" json:"image_urls"`                                       // 图片URL列表 JSON
	Mood        string    `gorm:"size:50" json:"mood"`                                               // 心情
	Weather     string    `gorm:"size:50" json:"weather"`                                            // 天气
	Location    string    `gorm:"size:200" json:"location"`                                          // 地点
	Tags        string    `gorm:"type:json" json:"tags"`                                             // 标签
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// 关联引用（可选）
	TravelPlanID        *uint `json:"travel_plan_id"`
	NutritionAnalysisID *uint `json:"nutrition_analysis_id"`

	// 关联关系
	User              User               `gorm:"foreignKey:UserID" json:"user"`
	TravelPlan        *TravelPlan        `gorm:"foreignKey:TravelPlanID" json:"travel_plan,omitempty"`
	NutritionAnalysis *NutritionAnalysis `gorm:"foreignKey:NutritionAnalysisID" json:"nutrition_analysis,omitempty"`
}

// NutritionAnalysis 营养分析记录模型
type NutritionAnalysis struct {
	ID             uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID         uint      `gorm:"not null" json:"user_id"`
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
	ID           uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID       uint      `gorm:"not null" json:"user_id"`  // 明确指定为uint类型以匹配User.ID
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
	ID            uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID        uint      `gorm:"not null" json:"user_id"`  // 明确指定为uint类型以匹配User.ID
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

func (Note) TableName() string {
	return "notes"
}

func (NutritionAnalysis) TableName() string {
	return "nutrition_analyses"
}

func (Todo) TableName() string {
	return "todos"
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

func (t *Todo) BeforeCreate(tx *gorm.DB) error {
	return nil
}

func (t *Todo) BeforeUpdate(tx *gorm.DB) error {
	return nil
}