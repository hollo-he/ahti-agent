// 服务层统一导出
export * from './api';
export * from './authService';
export * from './travelService';
export * from './nutritionService';

// 错误处理工具
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 响应拦截器
export const handleApiError = (error: any): never => {
  if (error instanceof ApiError) {
    throw error;
  }
  
  if (error.status === 401) {
    // Token过期，清除本地存储并跳转到登录页
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    throw new ApiError('登录已过期，请重新登录', 401);
  }
  
  if (error.status === 403) {
    throw new ApiError('没有权限访问此资源', 403);
  }
  
  if (error.status >= 500) {
    throw new ApiError('服务器内部错误，请稍后重试', error.status);
  }
  
  throw new ApiError(error.message || '网络请求失败', error.status);
};

// 请求重试工具
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError!;
};