package db

import (
	"errors"

	"gorm.io/gorm"
)

// TodoRepository 待办事项数据仓库
type TodoRepository struct {
	db *gorm.DB
}

// NewTodoRepository 创建新的待办事项数据仓库实例
func NewTodoRepository(db *gorm.DB) *TodoRepository {
	return &TodoRepository{db: db}
}

// Create 创建待办事项
func (r *TodoRepository) Create(todo *Todo) error {
	return r.db.Create(todo).Error
}

// FindByID 根据ID查找待办事项
func (r *TodoRepository) FindByID(id uint) (*Todo, error) {
	var todo Todo
	err := r.db.Preload("User").First(&todo, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &todo, nil
}

// FindByUserID 查找用户的待办事项列表
func (r *TodoRepository) FindByUserID(userID uint) ([]Todo, error) {
	var todos []Todo
	err := r.db.Where("user_id = ?", userID).Order("created_at desc").Find(&todos).Error
	return todos, err
}

// FindByUserIDAndStatus 根据状态查找用户的待办事项
func (r *TodoRepository) FindByUserIDAndStatus(userID uint, status string) ([]Todo, error) {
	var todos []Todo
	err := r.db.Where("user_id = ? AND status = ?", userID, status).Order("created_at desc").Find(&todos).Error
	return todos, err
}

// Update 更新待办事项
func (r *TodoRepository) Update(todo *Todo) error {
	return r.db.Save(todo).Error
}

// Delete 删除待办事项
func (r *TodoRepository) Delete(id uint) error {
	return r.db.Delete(&Todo{}, id).Error
}

// BatchCreate 批量创建待办事项 (用于AI生成)
func (r *TodoRepository) BatchCreate(todos []Todo) error {
	return r.db.Create(&todos).Error
}