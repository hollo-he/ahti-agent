package handler

import (
	"gomod/internal/db"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// CreateTodoHandler 创建待办事项
func CreateTodoHandler(todoRepo *db.TodoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权访问"})
			return
		}

		var req struct {
			Title       string     `json:"title" binding:"required"`
			Description string     `json:"description"`
			Status      string     `json:"status"`
			Priority    string     `json:"priority"`
			DueDate     *time.Time `json:"due_date"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
			return
		}

		status := req.Status
		if status == "" {
			status = "pending"
		}
		priority := req.Priority
		if priority == "" {
			priority = "medium"
		}

		todo := &db.Todo{
			UserID:      userID.(uint),
			Title:       req.Title,
			Description: req.Description,
			Status:      status,
			Priority:    priority,
			DueDate:     req.DueDate,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}

		if err := todoRepo.Create(todo); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "创建待办事项失败"})
			return
		}

		c.JSON(http.StatusCreated, todo)
	}
}

// GetTodosHandler 获取待办事项列表
func GetTodosHandler(todoRepo *db.TodoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权访问"})
			return
		}

		status := c.Query("status")
		var todos []db.Todo
		var err error

		// 修复：增加对 "undefined" 字符串的判断，防止前端误传导致查不到数据
		if status != "" && status != "undefined" {
			todos, err = todoRepo.FindByUserIDAndStatus(userID.(uint), status)
		} else {
			todos, err = todoRepo.FindByUserID(userID.(uint))
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取待办事项失败"})
			return
		}

		c.JSON(http.StatusOK, todos)
	}
}

// UpdateTodoHandler 更新待办事项
func UpdateTodoHandler(todoRepo *db.TodoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权访问"})
			return
		}

		idParam := c.Param("id")
		id, err := strconv.Atoi(idParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
			return
		}

		todo, err := todoRepo.FindByID(uint(id))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "查询待办事项失败"})
			return
		}
		if todo == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "待办事项不存在"})
			return
		}

		if todo.UserID != userID.(uint) {
			c.JSON(http.StatusForbidden, gin.H{"error": "无权操作"})
			return
		}

		var req struct {
			Title       string     `json:"title"`
			Description string     `json:"description"`
			Status      string     `json:"status"`
			Priority    string     `json:"priority"`
			DueDate     *time.Time `json:"due_date"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
			return
		}

		if req.Title != "" {
			todo.Title = req.Title
		}
		if req.Description != "" {
			todo.Description = req.Description
		}
		if req.Status != "" {
			todo.Status = req.Status
		}
		if req.Priority != "" {
			todo.Priority = req.Priority
		}
		if req.DueDate != nil {
			todo.DueDate = req.DueDate
		}

		todo.UpdatedAt = time.Now()

		if err := todoRepo.Update(todo); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "更新待办事项失败"})
			return
		}

		c.JSON(http.StatusOK, todo)
	}
}

// DeleteTodoHandler 删除待办事项
func DeleteTodoHandler(todoRepo *db.TodoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权访问"})
			return
		}

		idParam := c.Param("id")
		id, err := strconv.Atoi(idParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
			return
		}

		todo, err := todoRepo.FindByID(uint(id))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "查询待办事项失败"})
			return
		}
		if todo == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "待办事项不存在"})
			return
		}

		if todo.UserID != userID.(uint) {
			c.JSON(http.StatusForbidden, gin.H{"error": "无权操作"})
			return
		}

		if err := todoRepo.Delete(uint(id)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "删除待办事项失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
	}
}

// BatchCreateTodoHandler 批量创建待办事项
func BatchCreateTodoHandler(todoRepo *db.TodoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权访问"})
			return
		}

		var reqs []struct {
			Title       string     `json:"title" binding:"required"`
			Description string     `json:"description"`
			Status      string     `json:"status"`
			Priority    string     `json:"priority"`
			DueDate     *time.Time `json:"due_date"`
		}

		if err := c.ShouldBindJSON(&reqs); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
			return
		}

		var todos []db.Todo
		for _, req := range reqs {
			status := req.Status
			if status == "" {
				status = "pending"
			}
			priority := req.Priority
			if priority == "" {
				priority = "medium"
			}
			
			todos = append(todos, db.Todo{
				UserID:      userID.(uint),
				Title:       req.Title,
				Description: req.Description,
				Status:      status,
				Priority:    priority,
				DueDate:     req.DueDate,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			})
		}
		
		if len(todos) > 0 {
			if err := todoRepo.BatchCreate(todos); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "批量创建待办事项失败"})
				return
			}
		}

		c.JSON(http.StatusCreated, gin.H{"message": "批量创建成功", "count": len(todos)})
	}
}