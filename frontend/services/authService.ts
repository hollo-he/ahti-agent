// 用户认证服务
import { apiService } from './api';

export interface User {
  id: number;
  username: string;
  email: string;
  phone?: string;
  nickname?: string;
  avatar_url?: string;
  gender?: 'M' | 'F' | 'U';
  age?: number;
  dietary_preferences?: any;
  travel_preferences?: any;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  phone?: string;
}

export interface PhoneLoginRequest {
  phone: string;
  code: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  token: string;
  refreshToken?: string;
}

export interface SMSRequest {
  phone: string;
}

export interface VerifyCodeRequest {
  phone: string;
  code: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

class AuthService {
  // 用户注册
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response: any = await apiService.post('/api/auth/register', data);
    // 注册响应格式: { success: true, user: {...} }
    return {
      success: response.success,
      user: response.user,
      token: response.token || '',
      refreshToken: response.refreshToken
    };
  }

  // 邮箱登录
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response: any = await apiService.post('/api/auth/login', data);
    // 登录响应格式: { success: true, user: {...}, token: "...", refreshToken: "..." }
    if (response.token) {
      localStorage.setItem('token', response.token);
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }
    }
    return {
      success: response.success,
      user: response.user,
      token: response.token,
      refreshToken: response.refreshToken
    };
  }

  // 手机号登录
  async phoneLogin(data: PhoneLoginRequest): Promise<AuthResponse> {
    const response: any = await apiService.post('/api/auth/phone-login', data);
    // 手机登录响应格式: { success: true, user: {...}, token: "...", refreshToken: "..." }
    if (response.token) {
      localStorage.setItem('token', response.token);
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }
    }
    return {
      success: response.success,
      user: response.user,
      token: response.token,
      refreshToken: response.refreshToken
    };
  }

  // 发送短信验证码
  async sendSMS(data: SMSRequest): Promise<{ success: boolean; message: string }> {
    return apiService.post('/api/auth/send-sms', data);
  }

  // 验证短信验证码
  async verifyCode(data: VerifyCodeRequest): Promise<{ success: boolean; message: string }> {
    return apiService.post('/api/auth/verify-code', data);
  }

  // 用户登出
  async logout(): Promise<{ success: boolean; message: string }> {
    const response = await apiService.post('/api/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return response;
  }

  // 刷新令牌
  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await apiService.post<AuthResponse>('/api/auth/refresh', {
      refresh_token: refreshToken
    });
    
    if (response.token) {
      localStorage.setItem('token', response.token);
    }
    return response;
  }

  // 修改密码
  async changePassword(data: ChangePasswordRequest): Promise<{ success: boolean; message: string }> {
    return apiService.post('/api/auth/change-password', data);
  }

  // 获取用户资料
  async getProfile(): Promise<User> {
    return apiService.get<User>('/api/user/profile');
  }

  // 更新用户资料
  async updateProfile(data: Partial<User>): Promise<User> {
    return apiService.put<User>('/api/user/profile', data);
  }

  // 检查是否已登录
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  // 获取当前token
  getToken(): string | null {
    return localStorage.getItem('token');
  }
}

export const authService = new AuthService();