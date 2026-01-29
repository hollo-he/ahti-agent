import React, { useState, useEffect } from 'react';
import { todoService, Todo, CreateTodoData } from '../../services/todoService';
import { authService } from '../../services/authService';
import { Plus, Trash2, CheckCircle, Circle, Calendar, Sparkles, Flag, ArrowLeft, ChevronDown, Check } from 'lucide-react';

const TodoPage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInput, setAiInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDueDate, setNewTodoDueDate] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState('medium');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDueDate, setTempDueDate] = useState('');
  const [isBoyView, setIsBoyView] = useState(true);

  useEffect(() => {
    fetchTodos();
    fetchGender();
  }, []);

  const fetchGender = async () => {
    try {
      const user = await authService.getProfile();
      if (user.gender === 'F') {
        setIsBoyView(false);
      } else {
        setIsBoyView(true);
      }
    } catch (e) {
      console.error("Failed to fetch user profile for gender", e);
    }
  };

  const fetchTodos = async () => {
    try {
      const res = await todoService.getTodos();
      setTodos(res);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTodo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTodoTitle.trim()) return;

    try {
      const newTodo = await todoService.createTodo({
        title: newTodoTitle,
        priority: newTodoPriority,
        status: 'pending',
        due_date: newTodoDueDate ? new Date(newTodoDueDate).toISOString() : undefined
      });
      setTodos([newTodo, ...todos]);
      setNewTodoTitle('');
      setNewTodoDueDate('');
      setNewTodoPriority('medium');
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  };

  const handleToggleStatus = async (todo: Todo) => {
    const newStatus = todo.status === 'completed' ? 'pending' : 'completed';
    try {
      await todoService.updateTodo(todo.id, { status: newStatus });
      setTodos(todos.map(t => t.id === todo.id ? { ...t, status: newStatus } : t));
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除吗？')) return;
    try {
      await todoService.deleteTodo(id);
      setTodos(todos.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const handleGeneratePlan = async () => {
    if (!aiInput.trim()) return;
    setIsGenerating(true);
    try {
      const res = await todoService.generatePlan(aiInput);
      if (res.todos && res.todos.length > 0) {
        // Convert AI response to CreateTodoData
        const newTodosData: CreateTodoData[] = res.todos.map(t => ({
          title: t.title,
          description: t.description,
          priority: t.priority,
          status: 'pending',
          // Fix date format to ISO string for backend compatibility
          due_date: t.due_date ? new Date(t.due_date).toISOString() : undefined
        }));
        
        // Batch create
        await todoService.batchCreateTodos(newTodosData);
        
        // Refresh list
        await fetchTodos();
        setAiInput('');
        alert(`成功生成并添加了 ${res.todos.length} 个任务！`);
      }
    } catch (error) {
      console.error('Failed to generate plan:', error);
      alert('生成计划失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-500 bg-orange-50 border-orange-200';
      case 'low': return 'text-green-500 bg-green-50 border-green-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityFlagColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 fill-red-500';
      case 'medium': return 'text-orange-500 fill-orange-500';
      case 'low': return 'text-green-500 fill-green-500';
      default: return 'text-gray-400';
    }
  };

  const cyclePriority = () => {
    const priorities = ['low', 'medium', 'high'];
    const currentIndex = priorities.indexOf(newTodoPriority);
    const nextIndex = (currentIndex + 1) % priorities.length;
    setNewTodoPriority(priorities[nextIndex]);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#fdfbf7] font-sans">
      {/* Background Layer matching PhotoHomePage */}
      <div className="absolute inset-0 z-0">
        <img
          key={isBoyView ? 'boy' : 'girl'}
          src={isBoyView ? "/images/home_boy.png" : "/images/home_girl.png"}
          onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?q=80&w=2070&auto=format&fit=crop";
          }}
          alt="Background"
          className="w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" />
      </div>

      <div className="relative z-10 h-full flex flex-col p-6 max-w-4xl mx-auto w-full gap-6">
        <div className="flex items-center gap-4">
            {onBack && (
                <button onClick={onBack} className="p-2 rounded-full bg-white/40 hover:bg-white/60 transition-colors backdrop-blur-md">
                    <ArrowLeft size={24} className="text-gray-800" />
                </button>
            )}
            <h1 className="text-2xl font-bold text-gray-800 drop-shadow-sm">📅 计划与待办</h1>
        </div>

        {/* AI Planner Section */}
        <div className="bg-white/60 backdrop-blur-md p-4 rounded-xl border border-white/40 shadow-lg transition-all hover:bg-white/70">
          <div className="flex items-center gap-2 mb-2 text-indigo-700 font-medium">
            <Sparkles size={18} />
            <span>AI 智能规划</span>
          </div>
          <div className="flex gap-2">
            <textarea
              className="flex-1 p-3 rounded-lg border border-indigo-100/50 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none h-20 text-sm shadow-inner"
              placeholder="告诉 AI 你的目标（例如：'我想在这个月学会 Python 基础'），AI 将为你生成详细计划..."
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              disabled={isGenerating}
            />
            <button
              onClick={handleGeneratePlan}
              disabled={isGenerating || !aiInput.trim()}
              className="px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center min-w-[80px] transition-colors"
            >
              {isGenerating ? (
                <span className="animate-pulse">生成中...</span>
              ) : (
                <>
                  <Sparkles size={20} className="mb-1" />
                  <span className="text-xs">生成计划</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Add */}
        <form onSubmit={handleCreateTodo} className="flex gap-2 items-center bg-white/80 backdrop-blur-md p-2 rounded-xl border border-white/50 shadow-lg transition-all hover:bg-white/90">
          <input
            type="text"
            className="flex-1 min-w-0 p-2 bg-transparent focus:outline-none text-gray-800 placeholder-gray-500 font-medium"
            placeholder="添加新任务..."
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
          />
          
          <div className="flex items-center gap-1 border-l border-gray-300 pl-3">
              {/* Priority Selector */}
              <button
                type="button"
                onClick={cyclePriority}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors relative group"
                title={`优先级: ${newTodoPriority === 'high' ? '高' : newTodoPriority === 'medium' ? '中' : '低'} (点击切换)`}
              >
                  <Flag size={20} className={`transition-colors ${getPriorityFlagColor(newTodoPriority)}`} />
              </button>

              {/* Date Picker Trigger */}
              <button
                type="button"
                onClick={() => {
                  setTempDueDate(newTodoDueDate);
                  setIsDatePickerOpen(true);
                }}
                className="relative group focus:outline-none"
                title={newTodoDueDate ? `截止时间: ${new Date(newTodoDueDate).toLocaleString()}` : "设置截止时间"}
              >
                <div className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-colors ${newTodoDueDate ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}>
                    <Calendar size={20} />
                    {/* Visual Checkmark Badge */}
                    {newTodoDueDate && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border border-white shadow-sm pointer-events-none">
                         <Check size={10} strokeWidth={4} className="text-white" />
                      </div>
                    )}
                </div>
              </button>
          </div>

          <button
            type="submit"
            className="ml-1 p-2.5 bg-gray-800/90 text-white rounded-lg hover:bg-gray-800 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 shrink-0"
            disabled={!newTodoTitle.trim()}
          >
            <Plus size={22} />
          </button>
        </form>

        {/* Todo List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {loading ? (
            <div className="text-center text-gray-600 py-10 bg-white/40 backdrop-blur-sm rounded-xl">加载中...</div>
          ) : todos.length === 0 ? (
            <div className="text-center text-gray-600 py-10 flex flex-col items-center gap-2 bg-white/40 backdrop-blur-sm rounded-xl">
              <div className="w-16 h-16 bg-white/60 rounded-full flex items-center justify-center text-2xl shadow-sm">📝</div>
              <p>还没有待办事项，开始规划吧！</p>
            </div>
          ) : (
            todos.map(todo => (
              <div
                key={todo.id}
                className={`group flex items-start gap-3 p-4 bg-white/70 backdrop-blur-md rounded-xl border shadow-sm transition-all hover:shadow-lg hover:bg-white/80 ${todo.status === 'completed' ? 'opacity-60 grayscale-[0.5]' : 'border-white/40'}`}
              >
                <button
                  onClick={() => handleToggleStatus(todo)}
                  className={`mt-1 flex-shrink-0 transition-colors ${todo.status === 'completed' ? 'text-green-500' : 'text-gray-400 hover:text-gray-500'}`}
                >
                  {todo.status === 'completed' ? <CheckCircle size={22} /> : <Circle size={22} />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`font-medium text-gray-800 truncate ${todo.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                      {todo.title}
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border ${getPriorityColor(todo.priority)}`}>
                      {todo.priority}
                    </span>
                  </div>
                  
                  {todo.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {todo.description}
                    </p>
                  )}
                  
                  {todo.due_date && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-2 bg-gray-50/50 px-2 py-1 rounded-md w-fit border border-gray-100">
                      <Calendar size={12} />
                      <span>{new Date(todo.due_date).toLocaleString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(todo.id)}
                  className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      {/* Date Picker Modal */}
      {isDatePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-0 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <h3 className="text-lg font-semibold text-gray-800">设置截止时间</h3>
               <button 
                  onClick={() => setIsDatePickerOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
               >
                  <ChevronDown size={20} />
               </button>
             </div>
             
             <div className="p-6 flex flex-col gap-4">
               <div className="text-sm text-gray-500 mb-1">请选择日期和时间：</div>
               <input 
                 type="datetime-local" 
                 className="w-full p-4 border border-gray-200 rounded-xl text-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                 value={tempDueDate}
                 onChange={(e) => setTempDueDate(e.target.value)}
               />
               <div className="flex gap-2 text-xs text-gray-400 justify-center">
                  <span>点击上方输入框唤起系统选择器</span>
               </div>
             </div>

             <div className="flex border-t border-gray-100 bg-gray-50/50 p-4 gap-3">
               <button 
                  onClick={() => {
                      setNewTodoDueDate('');
                      setIsDatePickerOpen(false);
                  }} 
                  className="px-4 py-2.5 text-red-500 hover:bg-red-50 font-medium rounded-lg text-sm transition-colors"
               >
                 清除
               </button>
               <div className="flex-1 flex gap-3 justify-end">
                  <button 
                      onClick={() => setIsDatePickerOpen(false)} 
                      className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 font-medium rounded-lg bg-gray-100 transition-colors"
                  >
                  取消
                  </button>
                  <button 
                      onClick={() => {
                          setNewTodoDueDate(tempDueDate);
                          setIsDatePickerOpen(false);
                      }} 
                      className="px-6 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 font-medium rounded-lg shadow-lg shadow-indigo-200 transition-all active:scale-95"
                  >
                  确定
                  </button>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodoPage;