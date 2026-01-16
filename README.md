# AHTI-Agent - 智能旅行与餐饮助手

<div align="center">

[![License](https://img.shields.io/github/license/hollo-he/ahti-agent)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Go](https://img.shields.io/badge/go-1.21+-blue.svg)](https://golang.org/dl/)
[![React](https://img.shields.io/badge/react-18.0+-blue.svg)](https://reactjs.org/)

智能旅行规划与餐饮分析助手，基于AI Agent技术构建的微服务架构应用。

</div>

## 🌟 项目特色

- 🤖 **AI Agent驱动** - 基于LangGraph构建的智能对话代理
- 🌍 **智能旅行规划** - 语音/文字输入，自动生成路线、天气、票务信息
- 🍽️ **餐饮智能分析** - 图像识别食物，AI营养分析与健康建议
- 🔐 **安全认证** - JWT Token认证，手机号验证码登录
- 📱 **跨平台** - React前端，支持移动端体验
- 🔄 **微服务架构** - Go高性能API网关 + Python AI推理服务

## 🏗️ 技术架构

```
ahti-agent/
├── worker_service_go/     # Go API网关服务 (端口 8080)
│   ├── internal/
│   │   ├── auth/         # 认证服务
│   │   ├── db/           # 数据库操作
│   │   ├── handler/      # API处理器
│   │   └── scraper/      # 数据爬虫
│   └── cmd/
├── agent_control_py/     # Python AI推理服务 (端口 8081)
│   ├── core/             # 核心功能模块
│   ├── graphs/           # LangGraph工作流
│   │   ├── travel/       # 旅行规划工作流
│   │   └── nutrition/    # 营养分析工作流
│   ├── models/           # 模型文件 (已忽略)
│   └── services/         # 服务层
├── frontend/             # React前端应用 (端口 5173)
└── docker-compose.yml    # 容器化部署
```

## 🚀 快速开始

### 环境要求

- Go 1.21+
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (可选)
- MySQL 8.0+
- Redis
- Milvus (向量数据库)

### 本地开发模式

#### 1. 克隆项目

```bash
git clone https://github.com/hollo-he/ahti-agent.git
cd ahti-agent
```

#### 2. 配置环境变量

复制示例配置文件并填入您的API密钥：

```bash
# 根目录
cp .env.example .env

# 前端目录
cd frontend
cp .env.example .env.local
cd ..
```

#### 3. 启动服务

**方法一：分别启动（推荐用于开发）**

```bash
# 终端1：启动Go服务
cd worker_service_go
go mod tidy
go run cmd/main.go

# 终端2：启动Python服务
cd agent_control_py
pip install uv
uv sync
uv run python main.py

# 终端3：启动前端
cd frontend
npm install
npm run dev
```

**方法二：使用Docker Compose**

```bash
docker-compose up --build
```

### API端点

- **Go服务**: `http://localhost:8080`
- **Python服务**: `http://localhost:8081`
- **前端**: `http://localhost:5173`

## 🔧 配置说明

### 环境变量配置

#### 根目录 `.env` 文件

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ahti_agent

# Redis配置
REDIS_ADDR=localhost:6379

# JWT密钥
JWT_SECRET=your_jwt_secret_key_change_this_in_production

# Go服务配置
GO_WORKER_URL=http://localhost:8080

# Python服务配置
PYTHON_SERVICE_URL=http://localhost:8081

# 智谱AI配置
ZHIPU_API_KEY=your_zhipu_api_key
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4/
ZHIPU_MODEL=glm-4.5-air

# 阿里云百炼配置
DASHSCOPE_API_KEY=your_dashscope_api_key
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DASHSCOPE_MODEL=qwen3-vl-flash-2025-10-15

# LangChain配置
LANGCHAIN_API_KEY=your_langchain_api_key
LANGCHAIN_PROJECT=AHTI-Agent-Nutrition

# 向量数据库配置
MILVUS_URI=http://localhost:19530
MILVUS_COLLECTION=agent_knowledge_base
EMBED_MODEL_NAME=BAAI/bge-small-zh-v1.5
DIMENSION=512

# 高德地图API密钥
AMAP_API_KEY=your_amap_api_key

# 和风天气API配置
HEFENG_API_KEY=your_hefeng_api_key
HEFENG_API_ID=your_hefeng_api_id
```

#### 前端 `.env.local` 文件

```env
# 高德地图API密钥
VITE_AMAP_API_KEY=your_amap_api_key

# Gemini API密钥（如果需要）
VITE_GEMINI_API_KEY=your_gemini_api_key
```

## 🌍 核心功能

### 旅行规划

1. **语音/文字输入** - 支持语音输入旅行需求
2. **智能解析** - AI自动解析起点、终点、时间等信息
3. **路线规划** - 整合自驾、公交等多种交通方式
4. **天气预报** - 3日天气预报及生活指数
5. **票务查询** - 景点门票预订链接
6. **H5展示** - 交互式地图路线展示

### 餐饮分析

1. **图像识别** - OCR识别食物图片中的菜品
2. **营养分析** - AI分析食物营养成分
3. **健康建议** - 基于用户目标提供健康建议
4. **数据持久化** - 保存分析记录到数据库

### 用户系统

1. **手机号登录** - 验证码登录方式
2. **个人中心** - 用户资料管理
3. **历史记录** - 旅行计划和营养分析历史
4. **JWT认证** - 安全的API访问控制

## 🛠️ 开发指南

### 项目结构说明

#### Go服务 (`worker_service_go`)

- `internal/auth/` - 用户认证、JWT处理
- `internal/db/` - 数据库模型和操作
- `internal/handler/` - HTTP请求处理
- `internal/scraper/` - 数据爬取服务
- `internal/service/` - 业务逻辑服务

#### Python服务 (`agent_control_py`)

- `core/` - ASR、OCR、模型等核心功能
- `graphs/` - LangGraph工作流定义
- `models/` - 机器学习模型 (已忽略)
- `services/` - 与其他服务的交互

#### 前端 (`frontend`)

- `components/` - React组件
- `hooks/` - 自定义React Hooks
- `services/` - API服务封装
- `types/` - TypeScript类型定义

### 添加新功能

1. **AI工作流扩展** - 在 `agent_control_py/graphs/` 中添加新的工作流
2. **API端点** - 在 `worker_service_go/internal/handler/` 中添加处理器
3. **前端页面** - 在 `frontend/components/pages/` 中添加新页面

## 📊 数据库设计

### 主要表结构

- `users` - 用户信息表
- `travel_plans` - 旅行计划表
- `nutrition_analyses` - 营养分析记录表
- `user_sessions` - 用户会话表

## 🚀 部署

### 生产环境部署

使用Docker Compose进行生产部署：

```bash
# 构建并启动所有服务
docker-compose up --build -d

# 查看服务状态
docker-compose ps
```

### 环境变量注意事项

- 生产环境务必使用强密钥替换默认值
- 配置HTTPS反向代理（如Nginx）
- 定期备份数据库

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 📞 联系

- 项目链接: [https://github.com/hollo-he/ahti-agent](https://github.com/hollo-he/ahti-agent)
- 问题报告: [Issues](https://github.com/hollo-he/ahti-agent/issues)

## 🙏 致谢

- [LangGraph](https://github.com/langchain-ai/langgraph) - AI Agent框架
- [Gin](https://github.com/gin-gonic/gin) - Go Web框架
- [React](https://reactjs.org/) - 前端框架
- [GORM](https://gorm.io/) - Go ORM库
- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) - OCR引擎

---

<div align="center">

⭐ 如果这个项目对你有帮助，请给我们一个star！

</div>