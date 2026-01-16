// 认证相关的React Hook
import { useState, useEffect, useCallback } from 'react';
import { authService, User, LoginRequest, RegisterRequest, PhoneLoginRequest } from '../services';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<{ user: User; token: string }>;
  register: (data: RegisterRequest) => Promise<void>;
  phoneLogin: (data: PhoneLoginRequest) => Promise<{ user: User; token: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取用户资料
  const fetchProfile = useCallback(async () => {
    const hasToken = authService.isAuthenticated();
    if (!hasToken) {
      setIsLoading(false);
      return;
    }

    try {
      const profile = await authService.getProfile();
      setUser(profile);
    } catch (err: any) {
      console.error('获取用户资料失败:', err);
      if (err.status === 401) {
        // Token无效，清除本地存储
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始化时获取用户资料
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // 登录
  const login = useCallback(async (data: LoginRequest): Promise<{ user: User; token: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authService.login(data);
      setUser(response.user);
      return response;
    } catch (err: any) {
      setError(err.message || '登录失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 注册
  const register = useCallback(async (data: RegisterRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      await authService.register(data);
    } catch (err: any) {
      setError(err.message || '注册失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 手机号登录
  const phoneLogin = useCallback(async (data: PhoneLoginRequest): Promise<{ user: User; token: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authService.phoneLogin(data);
      setUser(response.user);
      return response;
    } catch (err: any) {
      setError(err.message || '登录失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 登出
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await authService.logout();
      setUser(null);
    } catch (err: any) {
      console.error('登出失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 刷新用户资料
  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    isAuthenticated: authService.isAuthenticated() && !!user,
    isLoading,
    error,
    login,
    register,
    phoneLogin,
    logout,
    refreshProfile,
    clearError,
  };
};