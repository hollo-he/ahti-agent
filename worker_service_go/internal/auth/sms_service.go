package auth

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"golang.org/x/net/context"
)

const (
	// 短信API配置
	SMS_API_URL  = "http://v.juhe.cn/sms/send"
	SMS_API_KEY  = "0b7c3395e652840bc2ade53e1214dec1"
	SMS_TPL_ID   = "274299"
	SMS_TPL_NAME = "验证码"
)

// SMSService 短信服务
type SMSService struct {
	redisClient *redis.Client
	httpClient  *http.Client
}

// NewSMSService 创建短信服务实例
func NewSMSService(redisClient *redis.Client) *SMSService {
	return &SMSService{
		redisClient: redisClient,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// SMSResponse 短信发送响应
type SMSResponse struct {
	Success bool                   `json:"success"`
	Code    string                 `json:"code"`
	Reason  string                 `json:"reason"`
	Data    map[string]interface{} `json:"data,omitempty"`
}

// JuheSMSResponse 聚合数据API响应
type JuheSMSResponse struct {
	ErrorCode int        `json:"error_code"`
	Reason    string     `json:"reason"`
	Result    SMSResult  `json:"result"`
}

// SMSResult 短信结果详情
type SMSResult struct {
	SID   string `json:"sid"`
	Fee   int    `json:"fee"`
	Count int    `json:"count"`
}

// GenerateCode 生成6位随机验证码
func (s *SMSService) GenerateCode() string {
	// 生成100000-999999之间的随机数
	code := rand.Intn(900000) + 100000
	return fmt.Sprintf("%d", code)
}

// SendSMS 发送短信验证码
func (s *SMSService) SendSMS(phone string) (*SMSResponse, error) {
	// 生成6位验证码
	code := s.GenerateCode()
	log.Printf("📱 准备发送短信: 手机号=%s, 验证码=%s\n", phone, code)

	// 构建vars参数的JSON字符串
	varsMap := map[string]string{
		"code": code,
	}
	varsJson, err := json.Marshal(varsMap)
	if err != nil {
		log.Printf("❌ 构建JSON参数失败: %v\n", err)
		return nil, fmt.Errorf("构建JSON参数失败: %v", err)
	}

	// 构建请求参数
	params := url.Values{}
	params.Set("key", SMS_API_KEY)
	params.Set("mobile", phone)
	params.Set("tpl_id", SMS_TPL_ID)
	params.Set("vars", string(varsJson))

	// 记录请求URL(不含key)
	reqURL := SMS_API_URL + "?mobile=" + phone + "&tpl_id=" + SMS_TPL_ID
	log.Printf("🌐 发送短信请求: %s\n", reqURL)

	// 发送POST请求
	resp, err := s.httpClient.PostForm(SMS_API_URL, params)
	if err != nil {
		log.Printf("❌ 发送短信请求失败: %v\n", err)
		return nil, fmt.Errorf("发送短信请求失败: %v", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("❌ 读取短信响应失败: %v\n", err)
		return nil, fmt.Errorf("读取短信响应失败: %v", err)
	}

	log.Printf("📥 短信API响应: %s\n", string(body))

	// 解析JSON响应
	var juheResp JuheSMSResponse
	if err := json.Unmarshal(body, &juheResp); err != nil {
		log.Printf("❌ 解析短信响应失败: %v, 响应内容: %s\n", err, string(body))
		return nil, fmt.Errorf("解析短信响应失败: %v", err)
	}

	// 判断是否成功
	success := juheResp.ErrorCode == 0
	result := &SMSResponse{
		Success: success,
		Code:    code,
		Reason:  juheResp.Reason,
	}

	if success {
		// 尝试缓存验证码到Redis(不影响短信发送结果)
		ctx := context.Background()
		err := s.redisClient.Set(ctx, phone+"_code", code, 5*time.Minute).Err()
		if err != nil {
			log.Printf("⚠️ 警告: 缓存验证码到Redis失败: %v\n", err)
		} else {
			log.Printf("✅ 验证码已缓存到Redis: 手机号=%s, 验证码=%s\n", phone, code)
		}
		log.Printf("✅ 短信发送成功: 手机号=%s, 验证码=%s\n", phone, code)
	} else {
		log.Printf("❌ 短信发送失败: 手机号=%s, 错误码=%d, 原因=%s\n", phone, juheResp.ErrorCode, juheResp.Reason)
	}

	return result, nil
}

// VerifyCode 验证短信验证码
func (s *SMSService) VerifyCode(phone, code string) (bool, error) {
	ctx := context.Background()
	storedCode, err := s.redisClient.Get(ctx, phone+"_code").Result()
	if err != nil {
		// 如果Redis连接失败,尝试开发模式:验证码是否为123456
		log.Printf("⚠️ 获取验证码失败(可能是Redis未启动): %v\n", err)
		// 开发模式:如果Redis不可用,接受123456作为测试验证码
		if code == "123456" {
			log.Printf("✅ 开发模式:验证码验证通过(123456)\n")
			return true, nil
		}
		return false, nil
	}

	if storedCode != code {
		return false, nil
	}

	// 验证成功后删除验证码
	err = s.redisClient.Del(ctx, phone+"_code").Err()
	if err != nil {
		log.Printf("删除验证码失败: %v\n", err)
	}

	return true, nil
}

// SMSHandler 短信处理函数
func (s *SMSService) SMSHandler(c *gin.Context) {
	var req struct {
		Phone string `json:"phone" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"error": "手机号不能为空",
		})
		return
	}

	// 发送短信
	resp, err := s.SendSMS(req.Phone)
	if err != nil {
		c.JSON(500, gin.H{
			"error": err.Error(),
		})
		return
	}

	if resp.Success {
		c.JSON(200, gin.H{
			"success": true,
			"message": "短信发送成功",
			"code":    resp.Code, // 返回验证码(方便测试)
		})
	} else {
		c.JSON(200, gin.H{
			"success": false,
			"message": "短信发送失败: " + resp.Reason,
		})
	}
}

// VerifyCodeHandler 验证码验证处理函数
func (s *SMSService) VerifyCodeHandler(c *gin.Context) {
	var req struct {
		Phone string `json:"phone" binding:"required"`
		Code  string `json:"code" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"error": "手机号和验证码不能为空",
		})
		return
	}

	// 验证验证码
	valid, err := s.VerifyCode(req.Phone, req.Code)
	if err != nil {
		c.JSON(500, gin.H{
			"error": err.Error(),
		})
		return
	}

	if valid {
		c.JSON(200, gin.H{
			"success": true,
			"message": "验证码验证成功",
		})
	} else {
		c.JSON(200, gin.H{
			"success": false,
			"message": "验证码错误或已过期",
		})
	}
}
