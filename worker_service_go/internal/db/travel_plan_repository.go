package db

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// TravelPlanRepository 旅行计划数据仓库
type TravelPlanRepository struct {
	db *gorm.DB
}

// NewTravelPlanRepository 创建新的旅行计划数据仓库实例
func NewTravelPlanRepository(db *gorm.DB) *TravelPlanRepository {
	return &TravelPlanRepository{db: db}
}

// CreateTravelPlan 创建旅行计划
func (r *TravelPlanRepository) CreateTravelPlan(plan *TravelPlan) error {
	// 检查是否已存在相同的thread_id
	var existingPlan TravelPlan
	result := r.db.Where("thread_id = ?", plan.ThreadID).First(&existingPlan)
	if result.Error == nil {
		return errors.New("该会话的旅行计划已存在")
	}

	// 设置创建时间
	plan.CreatedAt = time.Now()
	plan.UpdatedAt = time.Now()

	// 启用SQL日志
	r.db = r.db.Debug()

	fmt.Printf("📝 准备插入旅行计划: %+v\n", plan)
	err := r.db.Create(plan).Error
	if err != nil {
		fmt.Printf("❌ 创建旅行计划失败: %v\n", err)
	} else {
		fmt.Printf("✅ 创建旅行计划成功: id=%d, thread_id=%s, user_id=%d\n", plan.ID, plan.ThreadID, plan.UserID)
	}
	return err
}

// GetTravelPlanByID 根据ID获取旅行计划
func (r *TravelPlanRepository) GetTravelPlanByID(id uint) (*TravelPlan, error) {
	var plan TravelPlan
	result := r.db.Preload("User").First(&plan, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("旅行计划不存在")
		}
		return nil, result.Error
	}
	return &plan, nil
}

// GetTravelPlanByThreadID 根据ThreadID获取旅行计划
func (r *TravelPlanRepository) GetTravelPlanByThreadID(threadID string) (*TravelPlan, error) {
	var plan TravelPlan
	result := r.db.Preload("User").Where("thread_id = ?", threadID).First(&plan)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("旅行计划不存在")
		}
		return nil, result.Error
	}
	return &plan, nil
}

// GetTravelPlansByUserID 根据用户ID获取旅行计划列表
func (r *TravelPlanRepository) GetTravelPlansByUserID(userID uint, page, pageSize int) ([]TravelPlan, int64, error) {
	var plans []TravelPlan
	var total int64

	// 使用 Model 明确指定表
	query := r.db.Model(&TravelPlan{}).Where("user_id = ?", userID)

	// 获取总数
	query.Count(&total)

	// 分页查询
	offset := (page - 1) * pageSize
	if offset < 0 {
		offset = 0
	}

	err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&plans).Error
	if err != nil {
		return nil, 0, err
	}

	return plans, total, nil
}

// GetActiveTravelPlans 获取未过期的旅行计划
func (r *TravelPlanRepository) GetActiveTravelPlans(userID uint, page, pageSize int) ([]TravelPlan, int64, error) {
	var plans []TravelPlan
	var total int64

	// 获取总数
	r.db.Model(&TravelPlan{}).Where("user_id = ? AND expires_at > ? AND is_expired = ?", userID, time.Now(), false).Count(&total)

	// 分页查询
	offset := (page - 1) * pageSize
	if offset < 0 {
		offset = 0
	}

	err := r.db.Model(&TravelPlan{}).Where("user_id = ? AND expires_at > ? AND is_expired = ?", userID, time.Now(), false).
		Offset(offset).
		Limit(pageSize).
		Order("created_at DESC").
		Find(&plans).Error
	if err != nil {
		return nil, 0, err
	}

	return plans, total, nil
}

// UpdateTravelPlan 更新旅行计划
func (r *TravelPlanRepository) UpdateTravelPlan(plan *TravelPlan) error {
	plan.UpdatedAt = time.Now()
	return r.db.Save(plan).Error
}

// MarkAsExpired 标记旅行计划为已过期
func (r *TravelPlanRepository) MarkAsExpired(id uint) error {
	return r.db.Model(&TravelPlan{}).Where("id = ?", id).Updates(map[string]interface{}{
		"is_expired":  true,
		"updated_at": time.Now(),
	}).Error
}

// MarkExpiredPlans 批量标记过期的旅行计划
func (r *TravelPlanRepository) MarkExpiredPlans() error {
	return r.db.Model(&TravelPlan{}).Where("expires_at < ? AND is_expired = ?", time.Now(), false).Updates(map[string]interface{}{
		"is_expired":  true,
		"updated_at": time.Now(),
	}).Error
}

// DeleteTravelPlan 删除旅行计划
func (r *TravelPlanRepository) DeleteTravelPlan(id uint) error {
	return r.db.Delete(&TravelPlan{}, id).Error
}

// DeleteExpiredPlans 删除已过期的旅行计划
func (r *TravelPlanRepository) DeleteExpiredPlans() error {
	return r.db.Where("expires_at < ? AND is_expired = ?", time.Now(), true).Delete(&TravelPlan{}).Error
}

// CountUserTravelPlans 统计用户旅行计划数量
func (r *TravelPlanRepository) CountUserTravelPlans(userID uint) (int64, error) {
	var count int64
	err := r.db.Model(&TravelPlan{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}

// GetRecentTravelPlans 获取最近的旅行计划
func (r *TravelPlanRepository) GetRecentTravelPlans(limit int) ([]TravelPlan, error) {
	var plans []TravelPlan
	err := r.db.Preload("User").Order("created_at DESC").Limit(limit).Find(&plans).Error
	return plans, err
}