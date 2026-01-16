// 应用常量配置
export const APP_CONFIG = {
  NAME: 'AHTI Agent',
  VERSION: '1.0.0',
  DESCRIPTION: '智能旅行与营养分析助手',
};

export const API_ENDPOINTS = {
  // 认证相关
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    PHONE_LOGIN: '/api/auth/phone-login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    CHANGE_PASSWORD: '/api/auth/change-password',
    SEND_SMS: '/api/auth/send-sms',
    VERIFY_CODE: '/api/auth/verify-code',
  },
  
  // 用户相关
  USER: {
    PROFILE: '/api/user/profile',
    TRAVEL_PLANS: '/api/user/travel-plans',
  },
  
  // 旅行相关
  TRAVEL: {
    PLANS: '/api/travel/plans',
    PLAN: '/api/travel/plan',
    DOWNLOAD: '/api/travel/download',
    PUBLIC_PLAN: '/api/public/travel/plan',
  },
  
  // 营养相关
  NUTRITION: {
    CRAWL: '/api/crawl',
    ANALYZE: '/api/python/nutrition/analyze',
  },
  
  // Python服务代理
  PYTHON: {
    CHAT: '/api/python/agent/chat',
    NUTRITION: '/api/python/nutrition/analyze',
  },
};

export const STORAGE_KEYS = {
  TOKEN: 'token',
  REFRESH_TOKEN: 'refreshToken',
  USER_PREFERENCES: 'userPreferences',
  THEME: 'theme',
  LANGUAGE: 'language',
};

export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^1[3-9]\d{9}$/,
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 20,
    PATTERN: /^(?=.*[a-zA-Z])(?=.*\d)/,
  },
  USERNAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/,
  },
};

export const FILE_CONSTRAINTS = {
  IMAGE: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    MAX_WIDTH: 1920,
    MAX_HEIGHT: 1080,
  },
  AUDIO: {
    MAX_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_TYPES: ['audio/wav', 'audio/mp3', 'audio/webm'],
    MAX_DURATION: 300, // 5分钟
  },
};

export const UI_CONSTANTS = {
  ANIMATION_DURATION: {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500,
  },
  
  BREAKPOINTS: {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1280,
  },
  
  Z_INDEX: {
    DROPDOWN: 1000,
    MODAL: 1050,
    TOAST: 1100,
    TOOLTIP: 1200,
  },
};

export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  UNAUTHORIZED: '登录已过期，请重新登录',
  FORBIDDEN: '没有权限访问此资源',
  NOT_FOUND: '请求的资源不存在',
  SERVER_ERROR: '服务器内部错误，请稍后重试',
  VALIDATION_ERROR: '输入信息有误，请检查后重试',
  FILE_TOO_LARGE: '文件大小超出限制',
  INVALID_FILE_TYPE: '不支持的文件类型',
  CAMERA_PERMISSION_DENIED: '摄像头权限被拒绝',
  MICROPHONE_PERMISSION_DENIED: '麦克风权限被拒绝',
  LOCATION_PERMISSION_DENIED: '位置权限被拒绝',
};

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: '登录成功',
  REGISTER_SUCCESS: '注册成功',
  LOGOUT_SUCCESS: '退出成功',
  PROFILE_UPDATED: '资料更新成功',
  PASSWORD_CHANGED: '密码修改成功',
  PLAN_CREATED: '旅行计划创建成功',
  PLAN_UPDATED: '旅行计划更新成功',
  PLAN_DELETED: '旅行计划删除成功',
  SMS_SENT: '验证码发送成功',
  FILE_UPLOADED: '文件上传成功',
};

export const PLACEHOLDER_TEXTS = {
  EMAIL: '请输入邮箱地址',
  PASSWORD: '请输入密码',
  USERNAME: '请输入用户名',
  PHONE: '请输入手机号',
  VERIFICATION_CODE: '请输入验证码',
  SEARCH: '搜索...',
  TRAVEL_DESTINATION: '想去哪里？',
  FOOD_ANALYSIS: '拍照识别食物',
};

export const DIETARY_GOALS = [
  { value: '控糖', label: '控糖', icon: '🍎' },
  { value: '减脂', label: '减脂', icon: '🥗' },
  { value: '增肌', label: '增肌', icon: '🥩' },
  { value: '均衡', label: '均衡营养', icon: '🥘' },
  { value: '素食', label: '素食主义', icon: '🥬' },
];

export const TRAVEL_PREFERENCES = [
  { value: '文化', label: '文化古迹', icon: '🏛️' },
  { value: '自然', label: '自然风光', icon: '🏔️' },
  { value: '美食', label: '美食探索', icon: '🍜' },
  { value: '购物', label: '购物娱乐', icon: '🛍️' },
  { value: '冒险', label: '户外冒险', icon: '🏕️' },
  { value: '休闲', label: '休闲度假', icon: '🏖️' },
];