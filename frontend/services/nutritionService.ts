// 营养分析服务
import { apiService } from './api';

export interface NutritionAnalyzeRequest {
  img_b64: string;
  goal: string;
  user_id: string;
}

export interface NutritionResponse {
  status: 'success' | 'error';
  detected_dishes: string[];
  report: string;
  source?: string;
}

export interface CrawlRequest {
  names: string[];
}

export interface CrawlResponse {
  success: boolean;
  data: any[];
  message?: string;
}

// 营养分析相关接口
export interface CreateNutritionAnalysisRequest {
  image_path: string;
  detected_dishes: string[];
  goal: string;
  report: string;
}

export interface NutritionAnalysisRecord {
  id: number;
  user_id: number;
  image_path: string;
  detected_dishes: string; // JSON字符串
  goal: string;
  report: string;
  created_at: string;
  updated_at: string;
}

class NutritionService {
  // 分析食物图片（通过Python服务代理）
  async analyzeFood(data: NutritionAnalyzeRequest): Promise<NutritionResponse> {
    return apiService.post<NutritionResponse>('/api/python/nutrition/analyze', data);
  }

  // 爬取菜品信息（直接调用Go服务）
  async crawlFoodInfo(data: CrawlRequest): Promise<CrawlResponse> {
    return apiService.post<CrawlResponse>('/api/crawl', data);
  }

  // 将base64图片转换为文件
  base64ToFile(base64: string, filename: string = 'image.jpg'): File {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  }

  // 压缩图片
  compressImage(file: File, quality: number = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // 设置最大尺寸
        const maxWidth = 800;
        const maxHeight = 600;
        
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // 保存营养分析记录
  async saveNutritionAnalysis(data: CreateNutritionAnalysisRequest): Promise<NutritionAnalysisRecord> {
    return apiService.post<NutritionAnalysisRecord>('/api/nutrition/analyses', data);
  }

  // 获取营养分析历史记录
  async getNutritionAnalyses(page: number = 1, pageSize: number = 10, goal?: string): Promise<{
    data: NutritionAnalysisRecord[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const params: any = { page, page_size: pageSize };
    if (goal) params.goal = goal;
    
    const queryString = new URLSearchParams(params).toString();
    return apiService.get(`/api/nutrition/analyses?${queryString}`);
  }

  // 获取营养分析记录详情
  async getNutritionAnalysisById(id: number): Promise<NutritionAnalysisRecord> {
    return apiService.get(`/api/nutrition/analyses/${id}`);
  }

  // 删除营养分析记录
  async deleteNutritionAnalysis(id: number): Promise<{ success: boolean; message: string }> {
    return apiService.delete(`/api/nutrition/analyses/${id}`);
  }

  // 获取营养分析统计
  async getNutritionStats(): Promise<{
    total_analyses: number;
    monthly_analyses: number;
    top_goals: Array<{ goal: string; count: number }>;
  }> {
    return apiService.get('/api/nutrition/stats');
  }
}

export const nutritionService = new NutritionService();