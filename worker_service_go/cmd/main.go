package main

import (
	"gomod/internal/auth"
	"gomod/internal/db"
	"gomod/internal/handler"
	"gomod/pkg/utils"
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// 加载环境变量
	err := godotenv.Load()
	if err != nil {
		log.Println("没有找到 .env 文件")
	}

	// 启动前确保静态目录存在，否则 ExportToHTML 会报错
	os.MkdirAll("./static/plans", os.ModePerm)

	// 启动静态文件清理任务
	utils.StartFileCleanupTask("./static/plans", 10*time.Minute, 2*time.Hour)

	// 初始化数据库和Redis
	mysqlDB, redisClient := db.InitDB()

	// 检查并创建 nutrition_analyses 表（如果不存在）
	if !mysqlDB.Migrator().HasTable("nutrition_analyses") {
		err = mysqlDB.AutoMigrate(&db.NutritionAnalysis{})
		if err != nil {
			log.Fatal("营养分析表创建失败:", err)
		}
		log.Println("✅ 营养分析表创建成功")
	}

	// 注意：其他表已存在，跳过自动迁移避免外键约束错误
	log.Println("✅ 数据库初始化完成")

	// 启动过期旅行计划清理任务（每小时清理一次）
	utils.StartExpiredPlansCleanupTask(mysqlDB, 1*time.Hour)

	// 初始化仓库
	userRepo := db.NewUserRepository(mysqlDB)
	travelPlanRepo := db.NewTravelPlanRepository(mysqlDB)
	sessionRepo := db.NewSessionRepository(mysqlDB)
	nutritionRepo := db.NewNutritionRepository(mysqlDB) // 新增营养分析仓库

	// 初始化认证服务
	authService := auth.NewAuthService(userRepo, sessionRepo, redisClient)

	// 初始化短信服务
	smsService := auth.NewSMSService(redisClient)

	// 初始化代理处理器，用于转发请求到 Python 服务
	pythonServiceURL := os.Getenv("PYTHON_SERVICE_URL")
	if pythonServiceURL == "" {
		pythonServiceURL = "http://localhost:8081" // 默认值
	}
	proxyHandler := handler.NewProxyHandler(pythonServiceURL)

	// 设置CORS中间件
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Accept", "X-Requested-With"}
	config.AllowCredentials = true
	config.ExposeHeaders = []string{"Content-Length", "Authorization"}

	r := gin.Default()
	r.Use(cors.New(config))

	// 健康检查接口
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":    "ok",
			"message":   "服务运行正常",
			"timestamp": time.Now().Unix(),
		})
	})

	// API健康检查
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":    "ok",
			"message":   "API服务运行正常",
			"timestamp": time.Now().Unix(),
		})
	})

	// 1. 静态资源服务：让 Android 能访问生成的 HTML 和 PDF
	// 访问路径: http://ip:8080/static/plans/xxx.pdf
	r.Static("/static", "./static")

	// 2. 餐饮 Agent 调用的接口 (你之前的代码)
	r.POST("/api/crawl", handler.HandleNutrition)

	// 3. 出行 Agent 调用的接口 - 这是旅行计划生成接口
	// 不需要认证，这是内部服务调用，用户ID从请求头获取
	r.POST("/api/travel/plan", handler.HandleTravelPlan)

	// 4.出行md下载查看
	r.GET("/api/travel/download", handler.DownloadFileHandler)

	// 5. 用户认证相关接口
	authGroup := r.Group("/api/auth")
	{
		authGroup.POST("/register", handler.CreateRegisterHandler(authService))
		authGroup.POST("/login", handler.CreateLoginHandler(authService))
		authGroup.POST("/logout", handler.CreateLogoutHandler(authService))
		authGroup.POST("/refresh", handler.CreateRefreshHandler(authService))
		authGroup.POST("/change-password", handler.CreateChangePasswordHandler(authService))

		// 手机号登录相关接口
		authGroup.POST("/phone-login", handler.CreatePhoneLoginHandler(authService, userRepo))

		// 短信验证相关接口
		authGroup.POST("/send-sms", smsService.SMSHandler)
		authGroup.POST("/verify-code", smsService.VerifyCodeHandler)
	}

	// 6. 用户相关接口 (需要认证)
	userGroup := r.Group("/api/user")
	userGroup.Use(handler.AuthMiddleware(authService))
	{
		userGroup.GET("/profile", handler.GetProfileHandler(userRepo))
		userGroup.PUT("/profile", handler.UpdateProfileHandler(userRepo))
		userGroup.GET("/travel-plans", handler.GetUserTravelPlansHandler(travelPlanRepo))
		userGroup.GET("/travel-plans/:id", handler.GetTravelPlanByIDHandler(travelPlanRepo))
	}

	// 7. 旅行计划相关接口 (需要认证) - 这是获取用户旅行计划列表
	travelGroup := r.Group("/api/travel")
	travelGroup.Use(handler.AuthMiddleware(authService))
	{
		travelGroup.GET("/plans", handler.GetAllTravelPlansHandler(travelPlanRepo))
	}

	// 8. 营养分析相关接口 (需要认证)
	nutritionGroup := r.Group("/api/nutrition")
	nutritionGroup.Use(handler.AuthMiddleware(authService))
	{
		nutritionGroup.POST("/analyses", handler.CreateNutritionAnalysisHandler(nutritionRepo))
		nutritionGroup.GET("/analyses", handler.GetNutritionAnalysesHandler(nutritionRepo))
		nutritionGroup.GET("/analyses/:id", handler.GetNutritionAnalysisByIDHandler(nutritionRepo))
		nutritionGroup.DELETE("/analyses/:id", handler.DeleteNutritionAnalysisHandler(nutritionRepo))
		nutritionGroup.GET("/stats", handler.GetNutritionStatsHandler(nutritionRepo))
	}

	// 9. 旅行计划存储相关接口 (需要认证) - 这里包含了存储、更新、删除旅行计划的接口
	// 注意：这里不再注册与上面冲突的路由
	handler.RegisterTravelPlanRoutes(r, authService, travelPlanRepo)

	// 10. Python 服务代理接口 - 统一由 Go 服务处理认证
	pythonGroup := r.Group("/api/python")
	{
		// 餐饮分析接口代理
		pythonGroup.POST("/nutrition/analyze", handler.AuthMiddleware(authService), proxyHandler.HandleNutritionProxy)

		// 聊天接口代理
		pythonGroup.POST("/agent/chat", handler.AuthMiddleware(authService), proxyHandler.HandleChatProxy)
	}

	// 启动服务
	r.Run(":8080")
}
