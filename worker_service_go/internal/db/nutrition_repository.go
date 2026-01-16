package db

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

// NutritionRepository 营养分析数据仓库
type NutritionRepository struct {
	db *gorm.DB
}

// NewNutritionRepository 创建新的营养分析数据仓库实例
func NewNutritionRepository(db *gorm.DB) *NutritionRepository {
	return &NutritionRepository{db: db}
}

// CreateNutritionAnalysis 创建营养分析记录
func (r *NutritionRepository) CreateNutritionAnalysis(analysis *NutritionAnalysis) error {
	analysis.CreatedAt = time.Now()
	analysis.UpdatedAt = time.Now()
	return r.db.Create(analysis).Error
}

// GetNutritionAnalysisByID 根据ID获取营养分析记录
func (r *NutritionRepository) GetNutritionAnalysisByID(id uint) (*NutritionAnalysis, error) {
	var analysis NutritionAnalysis
	result := r.db.First(&analysis, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("营养分析记录不存在")
		}
		return nil, result.Error
	}
	return &analysis, nil
}

// GetNutritionAnalysesByUserID 获取用户的营养分析记录列表（分页）
func (r *NutritionRepository) GetNutritionAnalysesByUserID(userID uint, page, pageSize int) ([]NutritionAnalysis, int64, error) {
	var analyses []NutritionAnalysis
	var total int64

	// 获取总数
	r.db.Model(&NutritionAnalysis{}).Where("user_id = ?", userID).Count(&total)

	// 分页查询
	offset := (page - 1) * pageSize
	if offset < 0 {
		offset = 0
	}

	err := r.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&analyses).Error

	if err != nil {
		return nil, 0, err
	}

	return analyses, total, nil
}

// UpdateNutritionAnalysis 更新营养分析记录
func (r *NutritionRepository) UpdateNutritionAnalysis(analysis *NutritionAnalysis) error {
	analysis.UpdatedAt = time.Now()
	return r.db.Save(analysis).Error
}

// DeleteNutritionAnalysis 删除营养分析记录
func (r *NutritionRepository) DeleteNutritionAnalysis(id uint) error {
	return r.db.Delete(&NutritionAnalysis{}, id).Error
}

// GetRecentNutritionAnalyses 获取用户最近的营养分析记录
func (r *NutritionRepository) GetRecentNutritionAnalyses(userID uint, limit int) ([]NutritionAnalysis, error) {
	var analyses []NutritionAnalysis
	err := r.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&analyses).Error
	return analyses, err
}

// SearchNutritionAnalyses 搜索营养分析记录
func (r *NutritionRepository) SearchNutritionAnalyses(userID uint, goal string, page, pageSize int) ([]NutritionAnalysis, int64, error) {
	var analyses []NutritionAnalysis
	var total int64

	query := r.db.Model(&NutritionAnalysis{}).Where("user_id = ?", userID)

	if goal != "" {
		query = query.Where("goal LIKE ?", "%"+goal+"%")
	}

	// 获取总数
	query.Count(&total)

	// 分页查询
	offset := (page - 1) * pageSize
	if offset < 0 {
		offset = 0
	}

	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&analyses).Error

	if err != nil {
		return nil, 0, err
	}

	return analyses, total, nil
}

// GetNutritionStats 获取用户营养分析统计
func (r *NutritionRepository) GetNutritionStats(userID uint) (map[string]interface{}, error) {
	var stats map[string]interface{} = make(map[string]interface{})

	// 总分析次数
	var totalCount int64
	r.db.Model(&NutritionAnalysis{}).Where("user_id = ?", userID).Count(&totalCount)
	stats["total_analyses"] = totalCount

	// 本月分析次数
	var monthlyCount int64
	startOfMonth := time.Now().AddDate(0, 0, -time.Now().Day()+1)
	r.db.Model(&NutritionAnalysis{}).
		Where("user_id = ? AND created_at >= ?", userID, startOfMonth).
		Count(&monthlyCount)
	stats["monthly_analyses"] = monthlyCount

	// 最常分析的目标
	var goalStats []struct {
		Goal  string `json:"goal"`
		Count int64  `json:"count"`
	}
	r.db.Model(&NutritionAnalysis{}).
		Select("goal, COUNT(*) as count").
		Where("user_id = ?", userID).
		Group("goal").
		Order("count DESC").
		Limit(5).
		Find(&goalStats)
	stats["top_goals"] = goalStats

	return stats, nil
}
