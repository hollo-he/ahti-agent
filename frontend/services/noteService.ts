import { apiService } from './api';

export interface Note {
  id: number;
  user_id: number;
  title: string;
  content: string;
  type: 'note' | 'diary';
  image_urls: string; // JSON string
  mood: string;
  weather: string;
  location: string;
  tags: string; // JSON string
  created_at: string;
  updated_at: string;
  travel_plan_id?: number;
  nutrition_analysis_id?: number;
  travel_plan?: any;
  nutrition_analysis?: any;
}

export interface CreateNoteRequest {
  title: string;
  content: string;
  type: 'note' | 'diary';
  image_urls?: string[];
  mood?: string;
  weather?: string;
  location?: string;
  tags?: string[];
  travel_plan_id?: number;
  nutrition_analysis_id?: number;
}

export interface UpdateNoteRequest extends Partial<CreateNoteRequest> {}

class NoteService {
  async getNotes(page: number = 1, pageSize: number = 10, type?: string): Promise<{ data: Note[], total: number, page: number }> {
    const params: any = { page, page_size: pageSize };
    if (type) params.type = type;
    return apiService.get('/api/notes', params);
  }

  async createNote(data: CreateNoteRequest): Promise<{ success: boolean; data: Note }> {
    return apiService.post('/api/notes', data);
  }

  async updateNote(id: number, data: UpdateNoteRequest): Promise<{ success: boolean; data: Note }> {
    return apiService.put(`/api/notes/${id}`, data);
  }

  async deleteNote(id: number): Promise<{ success: boolean }> {
    return apiService.delete(`/api/notes/${id}`);
  }

  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return apiService.post('/api/notes/upload', formData);
  }

  async polishNote(text: string, length: string, tone: string, style: string, custom_prompt?: string, image_urls?: string[]): Promise<{ polished_text: string }> {
    return apiService.post('/api/python/agent/polish', { text, length, tone, style, custom_prompt, image_urls });
  }
}

export const noteService = new NoteService();