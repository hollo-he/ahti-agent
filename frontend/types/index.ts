// 全局类型定义
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page: number;
  page_size: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// 用户相关类型
export interface User {
  id: number;
  username: string;
  email: string;
  phone?: string;
  nickname?: string;
  avatar_url?: string;
  gender?: 'M' | 'F' | 'U';
  age?: number;
  dietary_preferences?: Record<string, any>;
  travel_preferences?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// 旅行计划相关类型
export interface TravelPlan {
  id: number;
  user_id: number;
  thread_id: string;
  plan_title: string;
  origin: string;
  destination: string;
  city: string;
  ticket_keyword: string;
  h5_file_path: string;
  md_file_path: string;
  h5_url: string;
  download_url: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

// 营养分析相关类型
export interface NutritionAnalysis {
  detected_dishes: string[];
  report: string;
  calories?: number;
  health_score?: number;
  recommendations?: string[];
}

// 聊天相关类型
export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  thread_id: string;
  messages: ChatMessage[];
  created_at: Date;
  updated_at: Date;
}

// 文件上传相关类型
export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadedFile {
  id: string;
  filename: string;
  url: string;
  size: number;
  type: string;
  uploaded_at: Date;
}

// 错误类型
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// 应用状态类型
export type ViewState = 'HOME' | 'PROFILE' | 'TRAVEL' | 'FOOD' | 'LOGIN';

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// 表单验证类型
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface FormField {
  name: string;
  value: any;
  error?: string;
  rules?: ValidationRule[];
}

// 设备相关类型
export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  userAgent: string;
  platform: string;
}

// 地理位置类型
export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  city?: string;
  country?: string;
}

// 通知类型
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}