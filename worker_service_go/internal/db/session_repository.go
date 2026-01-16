package db

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

// SessionRepository 会话数据仓库
type SessionRepository struct {
	db *gorm.DB
}

// NewSessionRepository 创建新的会话数据仓库实例
func NewSessionRepository(db *gorm.DB) *SessionRepository {
	return &SessionRepository{db: db}
}

// CreateSession 创建会话
func (r *SessionRepository) CreateSession(session *UserSession) error {
	// 检查是否已存在有效的会话
	var existingSession UserSession
	result := r.db.Where("user_id = ? AND is_active = ?", session.UserID, true).First(&existingSession)
	if result.Error == nil {
		// 如果存在有效会话，则将其设为无效
		r.InvalidateSession(existingSession.SessionToken)
	}

	session.CreatedAt = time.Now()
	session.LastAccessedAt = time.Now()

	return r.db.Create(session).Error
}

// GetSessionByToken 根据token获取会话
func (r *SessionRepository) GetSessionByToken(token string) (*UserSession, error) {
	var session UserSession
	result := r.db.Preload("User").Where("session_token = ? AND is_active = ? AND expires_at > ?", token, true, time.Now()).First(&session)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("会话不存在或已过期")
		}
		return nil, result.Error
	}
	return &session, nil
}

// GetSessionByRefreshToken 根据刷新token获取会话
func (r *SessionRepository) GetSessionByRefreshToken(refreshToken string) (*UserSession, error) {
	var session UserSession
	result := r.db.Preload("User").Where("refresh_token = ? AND is_active = ? AND expires_at > ?", refreshToken, true, time.Now()).First(&session)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("会话不存在或已过期")
		}
		return nil, result.Error
	}
	return &session, nil
}

// UpdateSessionLastAccess 更新会话最后访问时间
func (r *SessionRepository) UpdateSessionLastAccess(token string) error {
	return r.db.Model(&UserSession{}).Where("session_token = ? AND is_active = ? AND expires_at > ?", token, true, time.Now()).Update("last_accessed_at", time.Now()).Error
}

// InvalidateSession 使会话失效
func (r *SessionRepository) InvalidateSession(token string) error {
	return r.db.Model(&UserSession{}).Where("session_token = ?", token).Update("is_active", false).Error
}

// InvalidateUserSessions 使用户的所有会话失效
func (r *SessionRepository) InvalidateUserSessions(userID uint) error {
	return r.db.Model(&UserSession{}).Where("user_id = ?", userID).Update("is_active", false).Error
}

// RefreshSession 更新会话过期时间
func (r *SessionRepository) RefreshSession(token string, newExpiresAt time.Time) error {
	return r.db.Model(&UserSession{}).Where("session_token = ? AND is_active = ? AND expires_at > ?", token, true, time.Now()).Update("expires_at", newExpiresAt).Error
}

// CleanExpiredSessions 清理过期会话
func (r *SessionRepository) CleanExpiredSessions() error {
	return r.db.Where("expires_at < ? OR is_active = ?", time.Now(), false).Delete(&UserSession{}).Error
}

// GetUserActiveSessions 获取用户活跃会话
func (r *SessionRepository) GetUserActiveSessions(userID uint) ([]UserSession, error) {
	var sessions []UserSession
	err := r.db.Where("user_id = ? AND is_active = ? AND expires_at > ?", userID, true, time.Now()).Find(&sessions).Error
	return sessions, err
}