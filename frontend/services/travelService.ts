// 旅行计划服务
import { apiService } from './api';

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

export interface CreateTravelPlanRequest {
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
  expires_in: number; // 小时数
}

export interface UpdateTravelPlanRequest {
  plan_title?: string;
  origin?: string;
  destination?: string;
  city?: string;
  ticket_keyword?: string;
  expires_in?: number;
}

export interface TravelPlanGenerateRequest {
  city: string;
  origin: string;
  destination: string;
  ticket_keyword: string;
}

export interface ChatRequest {
  thread_id: string;
  text?: string;
  file?: File; // 语音文件
}

export interface ChatResponse {
  status: 'waiting' | 'success' | 'error';
  thread_id: string;
  chat_response: string;
  is_final: boolean;
  data?: {
    h5_url: string;
    download_url: string;
    input_text: string;
  };
}

class TravelService {
  // 获取用户旅行计划列表
  async getUserTravelPlans(page: number = 1, pageSize: number = 10): Promise<{
    data: TravelPlan[];
    total: number;
    page: number;
    page_size: number;
  }> {
    return apiService.get(`/api/user/travel-plans?page=${page}&page_size=${pageSize}`);
  }

  // 根据ID获取旅行计划
  async getTravelPlanById(id: number): Promise<TravelPlan> {
    return apiService.get(`/api/user/travel-plans/${id}`);
  }

  // 获取所有旅行计划
  async getAllTravelPlans(): Promise<TravelPlan[]> {
    return apiService.get('/api/travel/plans');
  }

  // 存储旅行计划
  async createTravelPlan(data: CreateTravelPlanRequest): Promise<TravelPlan> {
    return apiService.post('/api/travel/plan', data);
  }

  // 更新旅行计划
  async updateTravelPlan(id: number, data: UpdateTravelPlanRequest): Promise<TravelPlan> {
    return apiService.put(`/api/travel/plan/${id}`, data);
  }

  // 删除旅行计划
  async deleteTravelPlan(id: number): Promise<{ success: boolean; message: string }> {
    return apiService.delete(`/api/travel/plan/${id}`);
  }

  // 根据Thread ID获取旅行计划（公共接口）
  async getTravelPlanByThreadId(threadId: string): Promise<TravelPlan> {
    return apiService.get(`/api/public/travel/plan?thread_id=${threadId}`);
  }

  // 生成旅行计划（旧接口）
  async generateTravelPlan(data: TravelPlanGenerateRequest): Promise<any> {
    return apiService.post('/api/travel/plan', data);
  }

  // 下载旅行计划
  async downloadTravelPlan(filename: string): Promise<Blob> {
    const response = await fetch(`${apiService['baseURL']}/api/travel/download?filename=${filename}`);
    if (!response.ok) {
      throw new Error('下载失败');
    }
    return response.blob();
  }

  // 与AI聊天（通过Python服务代理）
  async chatWithAgent(data: ChatRequest): Promise<ChatResponse> {
    const formData = new FormData();
    formData.append('thread_id', data.thread_id);
    
    if (data.text) {
      formData.append('text', data.text);
    }
    
    if (data.file) {
      formData.append('file', data.file, 'voice_input.wav');
    }

    return apiService.upload<ChatResponse>('/api/python/agent/chat', formData);
  }
}

export const travelService = new TravelService();