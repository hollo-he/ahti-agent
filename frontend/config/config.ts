// src/config.ts
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'http://your-production-domain.com'  // 生产环境API地址
  : 'http://localhost:8080';             // 开发环境API地址

export { API_BASE_URL };