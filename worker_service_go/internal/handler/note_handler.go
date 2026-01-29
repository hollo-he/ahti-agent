package handler

import (
	"encoding/json"
	"fmt"
	"gomod/internal/db"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// UploadNoteImageHandler 处理笔记图片上传
func UploadNoteImageHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取上传的文件
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "获取文件失败"})
			return
		}

		// 检查文件大小 (例如限制 5MB)
		if file.Size > 5*1024*1024 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "文件过大，请上传小于5MB的图片"})
			return
		}

		// 创建保存目录
		uploadDir := "uploads/notes"
		if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
			os.MkdirAll(uploadDir, 0755)
		}

		// 生成唯一文件名
		ext := filepath.Ext(file.Filename)
		filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
		savePath := filepath.Join(uploadDir, filename)

		// 保存文件
		if err := c.SaveUploadedFile(file, savePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "保存文件失败"})
			return
		}

		// 返回文件访问路径 (假设静态文件服务已配置)
		// 统一使用正斜杠
		webPath := "/uploads/notes/" + filename
		c.JSON(http.StatusOK, gin.H{
			"url": webPath,
		})
	}
}

// CreateNoteHandler 创建笔记
func CreateNoteHandler(noteRepo *db.NoteRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权访问"})
			return
		}

		var req struct {
			Title               string   `json:"title" binding:"required"`
			Content             string   `json:"content"`
			Type                string   `json:"type"` // note, diary
			ImageURLs           []string `json:"image_urls"`
			Mood                string   `json:"mood"`
			Weather             string   `json:"weather"`
			Location            string   `json:"location"`
			Tags                []string `json:"tags"`
			TravelPlanID        *uint    `json:"travel_plan_id"`
			NutritionAnalysisID *uint    `json:"nutrition_analysis_id"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
			return
		}

		// 序列化 JSON 字段
		imageURLsJSON, _ := json.Marshal(req.ImageURLs)
		tagsJSON, _ := json.Marshal(req.Tags)

		noteType := req.Type
		if noteType == "" {
			noteType = "note"
		}

		note := &db.Note{
			UserID:              userID.(uint),
			Title:               req.Title,
			Content:             req.Content,
			Type:                noteType,
			ImageURLs:           string(imageURLsJSON),
			Mood:                req.Mood,
			Weather:             req.Weather,
			Location:            req.Location,
			Tags:                string(tagsJSON),
			TravelPlanID:        req.TravelPlanID,
			NutritionAnalysisID: req.NutritionAnalysisID,
		}

		if err := noteRepo.CreateNote(note); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "创建笔记失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "data": note})
	}
}

// GetNotesHandler 获取笔记列表
func GetNotesHandler(noteRepo *db.NoteRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权访问"})
			return
		}

		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
		noteType := c.Query("type")

		notes, total, err := noteRepo.GetNotesByUserID(userID.(uint), noteType, page, pageSize)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取笔记列表失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data":  notes,
			"total": total,
			"page":  page,
		})
	}
}

// UpdateNoteHandler 更新笔记
func UpdateNoteHandler(noteRepo *db.NoteRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权访问"})
			return
		}

		idInt, _ := strconv.Atoi(c.Param("id"))
		id := uint(idInt)
		note, err := noteRepo.GetNoteByID(id)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "笔记不存在"})
			return
		}

		if note.UserID != userID.(uint) {
			c.JSON(http.StatusForbidden, gin.H{"error": "无权操作此笔记"})
			return
		}

		var req struct {
			Title               string   `json:"title"`
			Content             string   `json:"content"`
			Type                string   `json:"type"`
			ImageURLs           []string `json:"image_urls"`
			Mood                string   `json:"mood"`
			Weather             string   `json:"weather"`
			Location            string   `json:"location"`
			Tags                []string `json:"tags"`
			TravelPlanID        *uint    `json:"travel_plan_id"`
			NutritionAnalysisID *uint    `json:"nutrition_analysis_id"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
			return
		}

		// 更新字段
		if req.Title != "" {
			note.Title = req.Title
		}
		note.Content = req.Content // 允许清空内容
		if req.Type != "" {
			note.Type = req.Type
		}
		if req.ImageURLs != nil {
			jsonBytes, _ := json.Marshal(req.ImageURLs)
			note.ImageURLs = string(jsonBytes)
		}
		note.Mood = req.Mood
		note.Weather = req.Weather
		note.Location = req.Location
		if req.Tags != nil {
			jsonBytes, _ := json.Marshal(req.Tags)
			note.Tags = string(jsonBytes)
		}
		if req.TravelPlanID != nil {
			note.TravelPlanID = req.TravelPlanID
		}
		if req.NutritionAnalysisID != nil {
			note.NutritionAnalysisID = req.NutritionAnalysisID
		}

		if err := noteRepo.UpdateNote(note); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "更新笔记失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "data": note})
	}
}

// DeleteNoteHandler 删除笔记
func DeleteNoteHandler(noteRepo *db.NoteRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权访问"})
			return
		}

		idInt, _ := strconv.Atoi(c.Param("id"))
		id := uint(idInt)
		note, err := noteRepo.GetNoteByID(id)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "笔记不存在"})
			return
		}

		if note.UserID != userID.(uint) {
			c.JSON(http.StatusForbidden, gin.H{"error": "无权操作此笔记"})
			return
		}

		if err := noteRepo.DeleteNote(id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "删除笔记失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}