// 营养分析相关的React Hook
import { useState, useCallback } from 'react';
import { nutritionService, NutritionAnalyzeRequest, NutritionResponse } from '../services';

interface UseNutritionReturn {
  result: NutritionResponse | null;
  isAnalyzing: boolean;
  error: string | null;
  analyzeFood: (imageBase64: string, goal?: string, userId?: string) => Promise<NutritionResponse>;
  crawlFoodInfo: (foodNames: string[]) => Promise<any>;
  clearResult: () => void;
  clearError: () => void;
}

export const useNutrition = (): UseNutritionReturn => {
  const [result, setResult] = useState<NutritionResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 分析食物图片
  const analyzeFood = useCallback(async (
    imageBase64: string, 
    goal: string = '控糖', 
    userId: string = 'user_001'
  ): Promise<NutritionResponse> => {
    try {
      setIsAnalyzing(true);
      setError(null);
      
      const data: NutritionAnalyzeRequest = {
        img_b64: imageBase64,
        goal,
        user_id: userId,
      };
      
      const response = await nutritionService.analyzeFood(data);
      setResult(response);
      return response;
    } catch (err: any) {
      setError(err.message || '食物分析失败');
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // 爬取食物信息
  const crawlFoodInfo = useCallback(async (foodNames: string[]) => {
    try {
      setIsAnalyzing(true);
      setError(null);
      
      const response = await nutritionService.crawlFoodInfo({ names: foodNames });
      return response;
    } catch (err: any) {
      setError(err.message || '获取食物信息失败');
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // 清除结果
  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    result,
    isAnalyzing,
    error,
    analyzeFood,
    crawlFoodInfo,
    clearResult,
    clearError,
  };
};