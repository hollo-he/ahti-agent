package handler

import (
	"fmt"
	"gomod/internal/db"
	"gomod/internal/model"
	"gomod/internal/service"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// TravelRequest 对应 Python Agent 传过来的参数
type TravelRequest struct {
	City          string `json:"city"`
	Origin        string `json:"origin"`
	Destination   string `json:"destination"`
	TicketKeyword string `json:"ticket_keyword"`
}

func HandleTravelPlan(c *gin.Context) {
	// 获取 thread_id
	threadID := c.GetHeader("X-Thread-ID")
	if threadID == "" {
		fmt.Printf("❌ 缺少 X-Thread-ID 请求头\n")
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 X-Thread-ID 请求头"})
		return
	}
	fmt.Printf("✅ Thread ID: %s\n", threadID)

	// 获取用户ID - 支持从认证中间件或请求头获取
	userID := uint(1) // 默认用户ID
	if userIDVal, exists := c.Get("user_id"); exists {
		userID = userIDVal.(uint)
		fmt.Printf("✅ 用户认证成功: user_id = %d\n", userID)
	} else if userIDHeader := c.GetHeader("X-User-ID"); userIDHeader != "" {
		if id, err := strconv.ParseUint(userIDHeader, 10, 32); err == nil {
			userID = uint(id)
			fmt.Printf("✅ 从请求头获取 user_id = %d\n", userID)
		}
	} else {
		fmt.Printf("⚠️  未提供用户ID，使用默认值: %d\n", userID)
	}
	var req TravelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Printf("❌ 旅行计划请求参数错误: %v\n", err)
		c.JSON(http.StatusBadRequest, model.JSONResponse{Code: 400, Message: "参数错误: " + err.Error()})
		return
	}

	fmt.Printf("🔄 开始处理旅行计划请求: %+v\n", req)

	// 0. 确保输出目录存在
	outputDir := "static/plans"
	if _, err := os.Stat(outputDir); os.IsNotExist(err) {
		_ = os.MkdirAll(outputDir, 0755)
		fmt.Printf("📁 创建输出目录: %s\n", outputDir)
	}

	// 1. 调用数据聚合逻辑
	fmt.Printf("🔍 开始构建旅行计划...\n")
	plan, err := service.BuildTravelPlan(req.City, req.Origin, req.Destination, req.TicketKeyword)
	if err != nil {
		fmt.Printf("❌ 生成旅行计划失败: %v\n", err)
		c.JSON(http.StatusInternalServerError, model.JSONResponse{Code: 500, Message: "生成方案失败: " + err.Error()})
		return
	}

	fmt.Printf("✅ 旅行计划构建成功\n")

	// 2. 生成唯一文件名
	timestamp := time.Now().Unix()
	htmlFileName := fmt.Sprintf("plan_%d.html", timestamp)
	mdFileName := fmt.Sprintf("plan_%d.md", timestamp)

	htmlPath := filepath.Join(outputDir, htmlFileName)
	mdPath := filepath.Join(outputDir, mdFileName)

	fmt.Printf("📄 生成文件: HTML=%s, MD=%s\n", htmlPath, mdPath)

	// 3. 同步生成 H5 (用于安卓 WebView 交互)
	fmt.Printf("🎨 开始生成HTML文件...\n")
	if err := plan.ExportToHTML(htmlPath); err != nil {
		fmt.Printf("❌ 渲染H5失败: %v\n", err)
		c.JSON(http.StatusInternalServerError, model.JSONResponse{Code: 500, Message: "渲染H5失败: " + err.Error()})
		return
	}

	// 4. 同步生成 Markdown (用于 Agent 汇总或离线查看)
	fmt.Printf("📝 开始生成Markdown文件...\n")
	if err := plan.ExportToMarkdown(mdPath); err != nil {
		fmt.Printf("❌ 渲染Markdown失败: %v\n", err)
		c.JSON(http.StatusInternalServerError, model.JSONResponse{Code: 500, Message: "渲染Markdown失败: " + err.Error()})
		return
	}

	// 5. 构建返回 URL
	baseURL := "http://" + c.Request.Host
	h5URL := fmt.Sprintf("%s/static/plans/%s", baseURL, htmlFileName)
	mdURL := fmt.Sprintf("%s/static/plans/%s", baseURL, mdFileName)
	downloadURL := fmt.Sprintf("%s/api/travel/download?filename=%s", baseURL, mdFileName)

	fmt.Printf("✅ 旅行计划生成完成!\n")
	fmt.Printf("🔗 H5 URL: %s\n", h5URL)
	fmt.Printf("🔗 MD URL: %s\n", mdURL)

	// 6. 存储到数据库
	travelPlanRepo := db.NewTravelPlanRepository(db.DB)

	planTitle := fmt.Sprintf("%s到%s的旅行计划", req.Origin, req.Destination)
	expiresAt := time.Now().Add(24 * time.Hour) // 默认24小时后过期

	travelPlan := &db.TravelPlan{
		UserID:        userID,
		ThreadID:      threadID,
		PlanTitle:     planTitle,
		Origin:        req.Origin,
		Destination:   req.Destination,
		City:          req.City,
		TicketKeyword: req.TicketKeyword,
		H5FilePath:    htmlPath,
		MDFilePath:    mdPath,
		H5URL:         h5URL,
		DownloadURL:   downloadURL,
		ExpiresAt:     expiresAt,
	}

	// 检查是否已存在相同thread_id的记录
	existingPlan, err := travelPlanRepo.GetTravelPlanByThreadID(threadID)
	if err == nil && existingPlan != nil {
		// 更新现有记录
		travelPlan.ID = existingPlan.ID
		err = travelPlanRepo.UpdateTravelPlan(travelPlan)
		if err != nil {
			fmt.Printf("⚠️  更新旅行计划失败: %v\n", err)
		} else {
			fmt.Printf("✅ 旅行计划已更新到数据库\n")
		}
	} else {
		// 创建新记录
		err = travelPlanRepo.CreateTravelPlan(travelPlan)
		if err != nil {
			fmt.Printf("⚠️  保存旅行计划失败: %v\n", err)
		} else {
			fmt.Printf("✅ 旅行计划已保存到数据库\n")
		}
	}

	c.JSON(http.StatusOK, model.JSONResponse{
		Code:    200,
		Message: "success",
		Data: gin.H{
			"h5_url":       h5URL,
			"md_url":       mdURL,
			"download_url": downloadURL,
			"summary":      fmt.Sprintf("已成功为规划 %s 到 %s 的行程", req.Origin, req.Destination),
		},
	})
}

// DownloadFileHandler 提供给 Android 的直接下载接口
func DownloadFileHandler(c *gin.Context) {
	filename := c.Query("filename") // Android 传文件名过来，如 plan_123.md
	if filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "文件名不能为空"})
		return
	}

	// 对应你生成文件的存放路径
	filePath := filepath.Join("static", "plans", filename)

	// 检查文件是否存在
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "文件不存在"})
		return
	}

	// 设置响应头，强制浏览器/Android 触发下载
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Type", "application/octet-stream")
	c.File(filePath)
}
