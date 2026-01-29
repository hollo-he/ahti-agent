package db

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

// NoteRepository 记事本数据仓库
type NoteRepository struct {
	db *gorm.DB
}

// NewNoteRepository 创建新的记事本数据仓库实例
func NewNoteRepository(db *gorm.DB) *NoteRepository {
	return &NoteRepository{db: db}
}

// CreateNote 创建笔记/日记
func (r *NoteRepository) CreateNote(note *Note) error {
	note.CreatedAt = time.Now()
	note.UpdatedAt = time.Now()
	return r.db.Create(note).Error
}

// GetNoteByID 根据ID获取笔记
func (r *NoteRepository) GetNoteByID(id uint) (*Note, error) {
	var note Note
	// Preload 关联数据
	result := r.db.Preload("TravelPlan").Preload("NutritionAnalysis").First(&note, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("笔记不存在")
		}
		return nil, result.Error
	}
	return &note, nil
}

// GetNotesByUserID 获取用户的笔记列表（支持筛选和分页）
func (r *NoteRepository) GetNotesByUserID(userID uint, noteType string, page, pageSize int) ([]Note, int64, error) {
	var notes []Note
	var total int64

	query := r.db.Model(&Note{}).Where("user_id = ?", userID)

	if noteType != "" {
		query = query.Where("type = ?", noteType)
	}

	// 获取总数
	query.Count(&total)

	// 分页查询
	offset := (page - 1) * pageSize
	if offset < 0 {
		offset = 0
	}

	// Preload 关联数据，但只加载 ID 和 Title/Name 等关键信息通常在前端处理，这里简单起见全部 Preload
	// 为了性能，如果列表不需要详情，可以不 Preload 详情，但在日记流中通常需要展示卡片摘要
	err := query.Preload("TravelPlan").Preload("NutritionAnalysis").
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&notes).Error

	if err != nil {
		return nil, 0, err
	}

	return notes, total, nil
}

// UpdateNote 更新笔记
func (r *NoteRepository) UpdateNote(note *Note) error {
	note.UpdatedAt = time.Now()
	return r.db.Save(note).Error
}

// DeleteNote 删除笔记
func (r *NoteRepository) DeleteNote(id uint) error {
	return r.db.Delete(&Note{}, id).Error
}