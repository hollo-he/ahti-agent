# 前端项目

基于 React + TypeScript + Vite 构建的现代化 Web 应用。

## 目录结构

```
frontend/
├── components/          # 组件
│   ├── pages/          # 页面组件
│   │   ├── LoginPage.tsx           # 登录页
│   │   ├── PersonalCenterPage.tsx  # 个人中心
│   │   ├── PhotoHomePage.tsx       # 首页
│   │   ├── TravelPlanningPage.tsx  # 旅行规划
│   │   └── FoodAnalysisPage.tsx    # 食物分析
│   └── ui/             # UI 组件
│       └── MarkdownRenderer.tsx     # Markdown 渲染器
├── services/           # API 服务
│   ├── api.ts          # 通用 API 请求封装
│   ├── authService.ts  # 认证服务
│   ├── travelService.ts# 旅行服务
│   ├── nutritionService.ts # 营养分析服务
│   └── index.ts        # 服务统一导出
├── hooks/              # React Hooks
│   ├── useAuth.ts      # 认证 Hook
│   ├── useTravel.ts    # 旅行 Hook
│   ├── useNutrition.ts # 营养分析 Hook
│   └── index.ts       # Hooks 统一导出
├── utils/              # 工具函数
│   ├── constants.ts    # 常量定义
│   ├── helpers.ts      # 辅助函数
│   └── index.ts       # 工具函数导出
├── types/              # TypeScript 类型定义
│   └── index.ts       # 类型统一导出
├── config/             # 配置文件
│   └── config.ts      # 应用配置
├── assets/             # 静态资源（图片、字体等）
├── App.tsx             # 应用主组件
├── index.tsx           # 应用入口
├── index.html          # HTML 模板
├── package.json        # 项目依赖
├── tsconfig.json      # TypeScript 配置
└── vite.config.ts     # Vite 配置
```

## 技术栈

- **框架**: React 19
- **语言**: TypeScript
- **构建工具**: Vite
- **UI 图标**: Lucide React
- **样式**: Tailwind CSS (通过 CDN)
- **字体**: Quicksand, Playfair Display

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 开发服务器

- **地址**: http://localhost:5173
- **代理**: `/api` → http://localhost:8080

## API 代理配置

Vite 配置了 API 代理，所有 `/api` 开头的请求会被转发到后端服务：

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true,
    secure: false
  }
}
```

## 路径别名

使用 `@` 别名引用项目根目录：

```typescript
import { authService } from '@/services';
import { useAuth } from '@/hooks';
```

## 页面说明

### 1. 登录页 (LoginPage)
- 手机号 + 验证码登录
- 短信验证码发送
- 自动获取位置支持

### 2. 首页 (PhotoHomePage)
- 沉浸式照片展示
- 快速导航到各功能模块

### 3. 旅行规划 (TravelPlanningPage)
- 语音输入
- 文字输入
- AI 智能规划
- 地图可视化
- 行程下载

### 4. 食物分析 (FoodAnalysisPage)
- 照片上传
- AI 营养分析
- 详细报告展示

### 5. 个人中心 (PersonalCenterPage)
- 用户信息展示
- 旅行计划列表
- 营养分析记录
- 个人设置

## 核心功能

### 认证系统
- 基于 JWT Token
- 自动刷新 Token
- 持久化登录状态

### 旅行规划
- 集成 AI 智能规划
- 支持语音和文字输入
- 自动获取起点位置
- 高德地图集成
- HTML/Markdown 导出

### 食物分析
- 照片识别
- 营养成分分析
- 健康建议生成

## 环境变量

在项目根目录创建 `.env` 文件：

```
GEMINI_API_KEY=your_gemini_api_key
```

## 注意事项

1. 所有 API 请求都通过 Vite 代理转发
2. 组件使用绝对路径引用（`@/` 别名）
3. 页面组件放在 `components/pages/` 目录
4. 可复用 UI 组件放在 `components/ui/` 目录
