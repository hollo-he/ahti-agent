package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// ProxyHandler 负责转发请求到 Python 服务
type ProxyHandler struct {
	pythonServiceURL string
}

// NewProxyHandler 创建新的代理处理器
func NewProxyHandler(pythonServiceURL string) *ProxyHandler {
	return &ProxyHandler{
		pythonServiceURL: strings.TrimSuffix(pythonServiceURL, "/"),
	}
}

// ProxyNutritionRequest 对应 Python 端的 NutritionRequest 结构
type ProxyNutritionRequest struct {
	ImgB64 string `json:"img_b64" binding:"required"`
	Goal   string `json:"goal" binding:"required"`
	UserID string `json:"user_id,omitempty"`
}

// ProxyChatRequest 对应 Python 端的聊天请求结构
type ProxyChatRequest struct {
	Text     string `json:"text,omitempty"`
	ThreadID string `json:"thread_id" binding:"required"`
}

// HandleNutritionProxy 代理餐饮分析请求到 Python 服务
func (p *ProxyHandler) HandleNutritionProxy(c *gin.Context) {
	// 验证用户身份（通过中间件）

	// 读取原始请求体
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		fmt.Printf("❌ 读取请求体失败: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "无法读取请求体"})
		return
	}

	// 验证请求结构
	var req ProxyNutritionRequest
	if err := json.Unmarshal(body, &req); err != nil {
		fmt.Printf("❌ 请求格式错误: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
		return
	}

	// 转发请求到 Python 服务
	pythonURL := fmt.Sprintf("%s/api/v1/nutrition/analyze", p.pythonServiceURL)
	fmt.Printf("🔄 转发营养分析请求到: %s\n", pythonURL)

	reqBody := bytes.NewBuffer(body)

	// 创建新请求，传递Authorization头
	reqHTTP, err := http.NewRequest("POST", pythonURL, reqBody)
	if err != nil {
		fmt.Printf("❌ 创建请求失败: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建请求失败"})
		return
	}
	reqHTTP.Header.Set("Content-Type", "application/json")

	// 传递Authorization头，让Python服务可以用来保存数据
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		reqHTTP.Header.Set("Authorization", authHeader)
	}

	resp, err := http.DefaultClient.Do(reqHTTP)
	if err != nil {
		fmt.Printf("❌ 调用 Python 服务失败: %v\n", err)
		c.JSON(http.StatusBadGateway, gin.H{
			"error": "调用 Python 服务失败",
			"details": err.Error(),
			"python_url": pythonURL,
		})
		return
	}
	defer resp.Body.Close()

	fmt.Printf("✅ Python 服务响应状态: %d\n", resp.StatusCode)

	// 读取 Python 服务的响应
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("❌ 读取 Python 服务响应失败: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "读取 Python 服务响应失败"})
		return
	}

	fmt.Printf("📤 Python 服务响应: %s\n", string(responseBody))

	// 将 Python 服务的响应返回给客户端
	c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), responseBody)
}

// HandleChatProxy 代理聊天请求到 Python 服务
func (p *ProxyHandler) HandleChatProxy(c *gin.Context) {
	// 验证用户身份（通过中间件）

	// 直接转发 multipart/form-data 请求到 Python 服务
	pythonURL := fmt.Sprintf("%s/api/v1/agent/chat", p.pythonServiceURL)
	fmt.Printf("🔄 转发聊天请求到: %s\n", pythonURL)

	// 读取原始请求体
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		fmt.Printf("❌ 读取请求体失败: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "无法读取请求体"})
		return
	}

	// 创建新请求
	req, err := http.NewRequest(c.Request.Method, pythonURL, bytes.NewReader(body))
	if err != nil {
		fmt.Printf("❌ 创建请求失败: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建请求失败"})
		return
	}

	// 复制原始请求的头部信息
	for key, values := range c.Request.Header {
		for _, value := range values {
			req.Header.Add(key, value)
		}
	}

	// 确保 Content-Type is properly set
	contentType := c.GetHeader("Content-Type")
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}

	// 确保Authorization头被传递
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}

	// 发送到 Python 服务
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("❌ 调用 Python 服务失败: %v\n", err)
		c.JSON(http.StatusBadGateway, gin.H{
			"error": "调用 Python 服务失败",
			"details": err.Error(),
			"python_url": pythonURL,
		})
		return
	}
	defer resp.Body.Close()

	fmt.Printf("✅ Python 服务响应状态: %d\n", resp.StatusCode)

	// 读取 Python 服务的响应
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("❌ 读取 Python 服务响应失败: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "读取 Python 服务响应失败"})
		return
	}

	fmt.Printf("📤 Python 服务响应: %s\n", string(responseBody))

	// 将 Python 服务的响应返回给客户端
	c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), responseBody)
}