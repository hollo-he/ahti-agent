 
 
 
 
 
 
import { API_BASE_URL } from '../config/config';

// API服务配置和接口对接
export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3
};

// 定义需要提取 user 字段的端点
const USER_ENDPOINTS = [
  '/api/user/profile',
];

// 定义列表端点（这些端点返回 { success: true, data: [...], total, page, page_size }）
const LIST_ENDPOINTS = [
  '/api/user/travel-plans',
  '/api/travel/plans',
  '/api/user/nutrition-analyses',
  '/api/nutrition/analyses'
];

// 定义通过 ID 获取单个资源的端点模式（这些端点返回 { success: true, data: {...} }）
const SINGLE_RESOURCE_PATTERN = /\/(travel-plans|nutrition-analyses)\/\d+$/;

// 请求拦截器
class ApiService {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  // 通用请求方法
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('token');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(options.headers as Record<string, string>),
    };

    // 如果 body 是 FormData，删除 Content-Type，让浏览器自动设置
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // 如果响应包含 success 字段，根据端点类型提取数据
      if (data && typeof data === 'object' && 'success' in data) {
        // 对于用户相关端点，提取 user 字段
        if (USER_ENDPOINTS.some(e => endpoint.includes(e)) && 'user' in data) {
          return data.user as T;
        }
        // 对于列表端点，提取整个响应（包含 data, total, page, page_size）
        if (LIST_ENDPOINTS.some(e => endpoint.includes(e))) {
          return data as T;
        }
        // 对于通过 ID 获取单个资源的端点，提取 data 字段
        if (SINGLE_RESOURCE_PATTERN.test(endpoint) && 'data' in data) {
          return data.data as T;
        }
        // 对于其他端点，检查是否只有 success 和简单数据（如删除操作）
        if (Object.keys(data).length <= 2 && 'success' in data) {
          return data as T;
        }
      }

      return data as T;
    } catch (error) {
      console.error(`API请求失败: ${endpoint}`, error);
      throw error;
    }
  }

  // GET请求
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let url = endpoint;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    }
    return this.request<T>(url, { method: 'GET' });
  }

  // POST请求
  async post<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    const isFormData = data instanceof FormData;
    return this.request<T>(endpoint, {
      method: 'POST',
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
      ...options,
    });
  }

  // PUT请求
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE请求
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // 文件上传
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('token');

    const config: RequestInit = {
      method: 'POST',
      body: formData,
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // 如果响应包含 success 字段，根据端点类型提取数据
      if (data && typeof data === 'object' && 'success' in data) {
        // 对于用户相关端点，提取 user 字段
        if (USER_ENDPOINTS.some(e => endpoint.includes(e)) && 'user' in data) {
          return data.user as T;
        }
        // 对于列表端点，提取整个响应（包含 data, total, page, page_size）
        if (LIST_ENDPOINTS.some(e => endpoint.includes(e))) {
          return data as T;
        }
        // 对于通过 ID 获取单个资源的端点，提取 data 字段
        if (SINGLE_RESOURCE_PATTERN.test(endpoint) && 'data' in data) {
          return data.data as T;
        }
        // 对于其他端点，检查是否只有 success 和简单数据（如删除操作）
        if (Object.keys(data).length <= 2 && 'success' in data) {
          return data as T;
        }
      }

      return data as T;
    } catch (error) {
      console.error(`文件上传失败: ${endpoint}`, error);
      throw error;
    }
  }
}

export const apiService = new ApiService();