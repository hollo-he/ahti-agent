import { apiService } from './api'; // 修正为命名导入

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTodoData {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  due_date?: string;
}

export interface PlanRequest {
  user_input: string;
}

export interface GeneratedPlan {
  todos: {
    title: string;
    description: string;
    priority: string;
    due_date?: string;
  }[];
}

export const todoService = {
  // 获取待办事项列表
  getTodos: async (status?: string) => {
    return apiService.get<Todo[]>('/api/todos', { status });
  },

  // 创建待办事项
  createTodo: async (data: CreateTodoData) => {
    return apiService.post<Todo>('/api/todos', data);
  },

  // 批量创建待办事项
  batchCreateTodos: async (data: CreateTodoData[]) => {
    return apiService.post<{ message: string; count: number }>('/api/todos/batch', data);
  },

  // 更新待办事项
  updateTodo: async (id: number, data: Partial<CreateTodoData>) => {
    return apiService.put<Todo>(`/api/todos/${id}`, data);
  },

  // 删除待办事项
  deleteTodo: async (id: number) => {
    return apiService.delete(`/api/todos/${id}`);
  },

  // AI 生成计划 (调用 Go 代理的 Python 服务)
  generatePlan: async (userInput: string) => {
    return apiService.post<GeneratedPlan>('/api/python/agent/plan', { user_input: userInput });
  },
};