// 旅行相关的React Hook
import { useState, useCallback } from 'react';
import { travelService, TravelPlan, ChatRequest, ChatResponse } from '../services';

interface UseTravelReturn {
  plans: TravelPlan[];
  isLoading: boolean;
  error: string | null;
  chatResponse: ChatResponse | null;
  fetchPlans: () => Promise<void>;
  createPlan: (data: any) => Promise<TravelPlan>;
  updatePlan: (id: number, data: any) => Promise<TravelPlan>;
  deletePlan: (id: number) => Promise<void>;
  chatWithAgent: (data: ChatRequest) => Promise<ChatResponse>;
  clearError: () => void;
}

export const useTravel = (): UseTravelReturn => {
  const [plans, setPlans] = useState<TravelPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);

  // 获取旅行计划列表
  const fetchPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const planList = await travelService.getAllTravelPlans();
      setPlans(planList);
    } catch (err: any) {
      setError(err.message || '获取旅行计划失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 创建旅行计划
  const createPlan = useCallback(async (data: any): Promise<TravelPlan> => {
    try {
      setIsLoading(true);
      setError(null);
      const newPlan = await travelService.createTravelPlan(data);
      setPlans(prev => [newPlan, ...prev]);
      return newPlan;
    } catch (err: any) {
      setError(err.message || '创建旅行计划失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 更新旅行计划
  const updatePlan = useCallback(async (id: number, data: any): Promise<TravelPlan> => {
    try {
      setIsLoading(true);
      setError(null);
      const updatedPlan = await travelService.updateTravelPlan(id, data);
      setPlans(prev => prev.map(plan => plan.id === id ? updatedPlan : plan));
      return updatedPlan;
    } catch (err: any) {
      setError(err.message || '更新旅行计划失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 删除旅行计划
  const deletePlan = useCallback(async (id: number): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await travelService.deleteTravelPlan(id);
      setPlans(prev => prev.filter(plan => plan.id !== id));
    } catch (err: any) {
      setError(err.message || '删除旅行计划失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 与AI聊天
  const chatWithAgent = useCallback(async (data: ChatRequest): Promise<ChatResponse> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await travelService.chatWithAgent(data);
      setChatResponse(response);
      return response;
    } catch (err: any) {
      setError(err.message || '聊天请求失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    plans,
    isLoading,
    error,
    chatResponse,
    fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
    chatWithAgent,
    clearError,
  };
};