package db

import (
	"errors"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// UserRepository 用户数据仓库
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository 创建新的用户数据仓库实例
func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// CreateUser 创建用户
func (r *UserRepository) CreateUser(user *User) error {
	// 检查邮箱或用户名是否已存在
	var existingUser User
	result := r.db.Where("email = ? OR username = ?", user.Email, user.Username).First(&existingUser)
	if result.Error == nil {
		return errors.New("用户邮箱或用户名已存在")
	}

	// 加密密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.PasswordHash), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.PasswordHash = string(hashedPassword)

	// 设置创建时间
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	return r.db.Create(user).Error
}

// GetUserByID 根据ID获取用户
func (r *UserRepository) GetUserByID(id uint) (*User, error) {
	var user User
	result := r.db.First(&user, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户不存在")
		}
		return nil, result.Error
	}
	return &user, nil
}

// GetUserByEmail 根据邮箱获取用户
func (r *UserRepository) GetUserByEmail(email string) (*User, error) {
	var user User
	result := r.db.Where("email = ?", email).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户不存在")
		}
		return nil, result.Error
	}
	return &user, nil
}

// GetUserByUsername 根据用户名获取用户
func (r *UserRepository) GetUserByUsername(username string) (*User, error) {
	var user User
	result := r.db.Where("username = ?", username).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户不存在")
		}
		return nil, result.Error
	}
	return &user, nil
}

// UpdateUser 更新用户信息
func (r *UserRepository) UpdateUser(user *User) error {
	user.UpdatedAt = time.Now()
	return r.db.Save(user).Error
}

// UpdateUserLastLogin 更新用户最后登录时间
func (r *UserRepository) UpdateUserLastLogin(userID uint) error {
	return r.db.Model(&User{}).Where("id = ?", userID).Update("last_login_at", time.Now()).Error
}

// DeleteUser 删除用户
func (r *UserRepository) DeleteUser(id uint) error {
	return r.db.Delete(&User{}, id).Error
}

// ValidatePassword 验证用户密码
func (r *UserRepository) ValidatePassword(email, password string) (*User, error) {
	user, err := r.GetUserByEmail(email)
	if err != nil {
		return nil, err
	}

	// 验证密码
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return nil, errors.New("密码错误")
	}

	return user, nil
}

// GetUserByPhone 根据手机号获取用户
func (r *UserRepository) GetUserByPhone(phone string) (*User, error) {
	var user User
	result := r.db.Where("phone = ?", phone).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户不存在")
		}
		return nil, result.Error
	}
	return &user, nil
}

// SearchUsers 搜索用户（支持分页）
func (r *UserRepository) SearchUsers(page, pageSize int, keyword string) ([]User, int64, error) {
	var users []User
	var total int64

	query := r.db.Model(&User{})

	if keyword != "" {
		keyword = "%" + keyword + "%"
		query = query.Where("username LIKE ? OR email LIKE ? OR phone LIKE ?", keyword, keyword, keyword)
	}

	// 获取总数
	query.Count(&total)

	// 分页查询
	offset := (page - 1) * pageSize
	if offset < 0 {
		offset = 0
	}

	err := query.Offset(offset).Limit(pageSize).Find(&users).Error
	if err != nil {
		return nil, 0, err
	}

	return users, total, nil
}