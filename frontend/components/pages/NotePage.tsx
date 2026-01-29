import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Calendar, MapPin, Smile, Image as ImageIcon, X, Loader2, Book, Plane, Utensils, ExternalLink, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { API_BASE_URL } from '../../config/config';
import { noteService, Note, CreateNoteRequest } from '../../services/noteService';
import { travelService, TravelPlan } from '../../services/travelService';
import { nutritionService, NutritionAnalysisRecord } from '../../services/nutritionService';
import MarkdownRenderer from '../ui/MarkdownRenderer';

interface NotePageProps {
  onBack: () => void;
}

const NotePage: React.FC<NotePageProps> = ({ onBack }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  
  // Editor State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]); // Uploaded URLs
  const [previewUrls, setPreviewUrls] = useState<string[]>([]); // Local previews
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishLength, setPolishLength] = useState('medium');
  const [polishTone, setPolishTone] = useState('standard');
  const [polishStyle, setPolishStyle] = useState('descriptive');
  const [customPolishPrompt, setCustomPolishPrompt] = useState('');

  // Resource Selection State
  const [travelPlans, setTravelPlans] = useState<TravelPlan[]>([]);
  const [nutritionAnalyses, setNutritionAnalyses] = useState<NutritionAnalysisRecord[]>([]);
  const [selectedTravelPlanId, setSelectedTravelPlanId] = useState<string>('');
  const [selectedNutritionAnalysisId, setSelectedNutritionAnalysisId] = useState<string>('');
  const [expandedReportIds, setExpandedReportIds] = useState<Set<number>>(new Set());

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const getNotesForDate = (date: Date) => {
    return notes.filter(note => {
      const noteDate = new Date(note.created_at);
      return noteDate.getDate() === date.getDate() &&
             noteDate.getMonth() === date.getMonth() &&
             noteDate.getFullYear() === date.getFullYear();
    });
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const toggleReportExpansion = (noteId: number) => {
    setExpandedReportIds(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    if (showEditor) {
      fetchResources();
    }
  }, [showEditor]);

  const fetchResources = async () => {
    try {
      const [tpRes, naRes] = await Promise.all([
        travelService.getUserTravelPlans(1, 50),
        nutritionService.getNutritionAnalyses(1, 50)
      ]);
      setTravelPlans(tpRes.data);
      setNutritionAnalyses(naRes.data);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    }
  };

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await noteService.getNotes(1, 100); // Fetch all for now
      setNotes(res.data);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedImages(prev => [...prev, ...files]);
      
      // Generate previews
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviews]);
    }
  };

  const handleSubmit = async () => {
    if (!title && !content) return;
    
    try {
      setIsSubmitting(true);
      
      // 1. Upload images
      const uploadedUrls: string[] = [];
      for (const file of selectedImages) {
        const res = await noteService.uploadImage(file);
        uploadedUrls.push(res.url);
      }
      
      // 2. Create note
      const req: CreateNoteRequest = {
        title: title || new Date().toLocaleDateString(),
        content,
        type: 'diary',
        mood,
        image_urls: uploadedUrls,
        weather: 'Sunny', // Mock weather for now
        location: 'Home', // Mock location
        travel_plan_id: selectedTravelPlanId ? parseInt(selectedTravelPlanId) : undefined,
        nutrition_analysis_id: selectedNutritionAnalysisId ? parseInt(selectedNutritionAnalysisId) : undefined,
      };
      
      await noteService.createNote(req);
      
      // Reset and refresh
      setShowEditor(false);
      resetEditor();
      fetchNotes();
    } catch (error) {
      console.error('Failed to create note:', error);
      alert('保存日记失败，请重试。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePolish = async () => {
    if (!content && selectedImages.length === 0) return;
    try {
      setIsPolishing(true);
      
      // 1. Upload images first if any
      const currentImageUrls: string[] = [...imageUrls];
      if (selectedImages.length > 0) {
        // Upload concurrently
        const uploadPromises = selectedImages.map(file => noteService.uploadImage(file));
        const results = await Promise.all(uploadPromises);
        results.forEach(res => {
          // Construct full URL for the AI agent to access
          const fullUrl = res.url.startsWith('http') ? res.url : `${API_BASE_URL}${res.url}`;
          currentImageUrls.push(fullUrl);
        });
      }

      const res = await noteService.polishNote(content, polishLength, polishTone, polishStyle, customPolishPrompt, currentImageUrls);
      setContent(res.polished_text);
    } catch (error) {
      console.error('Polish failed:', error);
      alert('AI 润色失败，请稍后重试');
    } finally {
      setIsPolishing(false);
    }
  };

  const resetEditor = () => {
    setTitle('');
    setContent('');
    setMood('');
    setSelectedImages([]);
    setImageUrls([]);
    setPreviewUrls([]);
    setSelectedTravelPlanId('');
    setSelectedNutritionAnalysisId('');
  };

  const getMoodEmoji = (m: string) => {
    switch (m) {
      case 'happy': return '😊';
      case 'sad': return '😔';
      case 'excited': return '🤩';
      case 'tired': return '😴';
      default: return '😐';
    }
  };

  return (
    <div className="w-full h-full bg-[#fdfbf7] flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-gray-100 z-10">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Book className="w-5 h-5 text-orange-400" />
          我的日记
        </h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 max-w-2xl mx-auto">
            
            {/* Calendar View */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-gray-800">
                  {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
                </h2>
                <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Week Headers */}
              <div className="grid grid-cols-7 mb-2 text-center">
                {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                  <div key={d} className="text-xs font-bold text-gray-400 py-2">{d}</div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-[4/5]" />
                ))}
                {Array.from({ length: getDaysInMonth(currentMonth) }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                  const dayNotes = getNotesForDate(date);
                  const isSelected = selectedDate.getDate() === day && 
                                   selectedDate.getMonth() === currentMonth.getMonth() && 
                                   selectedDate.getFullYear() === currentMonth.getFullYear();
                  const isToday = new Date().toDateString() === date.toDateString();

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(date)}
                      className={`
                        relative aspect-[4/5] rounded-lg border transition-all flex flex-col items-center justify-start pt-1 gap-1 overflow-hidden
                        ${isSelected ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-100' : 'border-gray-100 hover:border-orange-200 bg-gray-50/50'}
                      `}
                    >
                      <span className={`text-xs font-medium ${isToday ? 'bg-orange-400 text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-gray-500'}`}>
                        {day}
                      </span>
                      
                      {dayNotes.length > 0 ? (
                        <>
                          <div className="text-xl leading-none">
                            {getMoodEmoji(dayNotes[0].mood || '')}
                          </div>
                          <div className="px-1 w-full text-center">
                             <p className="text-[8px] text-gray-500 truncate leading-tight w-full">
                               {dayNotes[0].title || dayNotes[0].content}
                             </p>
                          </div>
                          {dayNotes.length > 1 && (
                            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-orange-400 rounded-full" />
                          )}
                        </>
                      ) : (
                        <div className="flex-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Header */}
            <div className="flex items-center gap-2 px-2">
               <div className="w-1 h-4 bg-orange-400 rounded-full" />
               <h3 className="font-bold text-gray-700">
                 {selectedDate.toLocaleDateString()} 的日记
               </h3>
            </div>

            {/* Notes List for Selected Date */}
            {getNotesForDate(selectedDate).length > 0 ? (
              getNotesForDate(selectedDate).map(note => (
              <div key={note.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{note.title}</h3>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {new Date(note.created_at).toLocaleString()}
                      {note.location && (
                        <>
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          <MapPin className="w-3 h-3" />
                          {note.location}
                        </>
                      )}
                    </p>
                  </div>
                  {note.mood && <span className="text-2xl">{getMoodEmoji(note.mood)}</span>}
                </div>
                
                <div className="prose prose-sm text-gray-600 mb-4 whitespace-pre-wrap">
                  {note.content}
                </div>

                {/* Travel Plan Summary Card */}
                {note.travel_plan && (
                  <div className="mb-4 bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-blue-100 p-1.5 rounded-full">
                        <Plane className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">旅行计划</span>
                    </div>
                    <h4 className="text-sm font-bold text-gray-800 mb-1">{note.travel_plan.plan_title}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <span>{note.travel_plan.origin}</span>
                      <span className="text-gray-300">→</span>
                      <span>{note.travel_plan.destination}</span>
                    </div>
                    <a 
                      href={note.travel_plan.h5_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs bg-white text-blue-600 px-3 py-1.5 rounded-lg border border-blue-200 font-medium inline-flex items-center gap-1 hover:bg-blue-50 transition-colors"
                    >
                      查看完整计划 <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Nutrition Analysis Summary Card */}
                {note.nutrition_analysis && (
                  <div className="mb-4 bg-green-50 rounded-xl p-3 border border-green-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-green-100 p-1.5 rounded-full">
                        <Utensils className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-xs font-bold text-green-800 uppercase tracking-wider">饮食分析</span>
                    </div>
                    <h4 className="text-sm font-bold text-gray-800 mb-1">目标: {note.nutrition_analysis.goal}</h4>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(() => {
                        try {
                          const dishes = JSON.parse(note.nutrition_analysis.detected_dishes);
                          return dishes.slice(0, 3).map((dish: string, i: number) => (
                            <span key={i} className="text-[10px] bg-white border border-green-200 px-1.5 py-0.5 rounded text-green-700">
                              {dish}
                            </span>
                          ));
                        } catch (e) { return null; }
                      })()}
                    </div>
                    {note.nutrition_analysis.report && (
                       <div className="relative text-xs text-gray-600 bg-white/50 p-2 rounded-lg mb-2">
                         <div className={`transition-all duration-300 ${!expandedReportIds.has(note.id) ? 'max-h-24 overflow-hidden' : ''}`}>
                            <MarkdownRenderer content={note.nutrition_analysis.report} />
                         </div>
                         
                         {/* Gradient Overlay for collapsed state */}
                         {!expandedReportIds.has(note.id) && (
                           <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white via-white/80 to-transparent rounded-b-lg pointer-events-none" />
                         )}

                         {/* Toggle Button */}
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             toggleReportExpansion(note.id);
                           }}
                           className="w-full text-center text-xs font-bold text-green-600 mt-1 hover:text-green-700 transition-colors py-1 flex items-center justify-center gap-1"
                         >
                           {expandedReportIds.has(note.id) ? (
                             <>收起全文 <span className="transform rotate-180">▼</span></>
                           ) : (
                             <>展开全文 <span>▼</span></>
                           )}
                         </button>
                       </div>
                    )}
                  </div>
                )}

                {/* Image Grid */}
                {note.image_urls && (() => {
                  try {
                    const urls = JSON.parse(note.image_urls);
                    if (urls && urls.length > 0) {
                      return (
                        <div className={`grid gap-2 ${urls.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
                          {urls.map((url: string, idx: number) => {
                            // Fix URL if relative
                            const fullUrl = url.startsWith('http') ? url : `http://localhost:8080${url.startsWith('/') ? '' : '/'}${url}`;
                            return (
                              <img 
                                key={idx} 
                                src={fullUrl} 
                                alt="日记图片" 
                                className="rounded-lg object-cover w-full h-32 cursor-pointer hover:opacity-90 transition-opacity bg-gray-100"
                                onClick={() => window.open(fullUrl, '_blank')}
                                onError={(e) => {
                                  // Fallback if image fails
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            );
                          })}
                        </div>
                      );
                    }
                  } catch (e) {}
                  return null;
                })()}
              </div>
            ))
            ) : (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                <p>今天还没有日记哦</p>
                <button 
                  onClick={() => setShowEditor(true)}
                  className="mt-2 text-orange-500 font-medium text-sm hover:underline"
                >
                  写一篇?
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowEditor(true)}
        className="absolute bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform z-20"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Editor Modal */}
      {showEditor && (
        <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="h-16 px-4 flex items-center justify-between border-b border-gray-100">
            <button onClick={() => { setShowEditor(false); resetEditor(); }} className="p-2">
              <X className="w-6 h-6 text-gray-500" />
            </button>
            <h2 className="font-bold text-gray-800">新建日记</h2>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-black text-white px-4 py-1.5 rounded-full text-sm font-medium disabled:opacity-50"
            >
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            <input
              type="text"
              placeholder="标题 (可选)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full text-2xl font-bold placeholder-gray-300 border-none outline-none mb-4 bg-transparent shrink-0"
            />
            
            <textarea
              placeholder="今天发生了什么有趣的事？"
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full flex-1 text-gray-700 placeholder-gray-300 border-none outline-none resize-none bg-transparent text-lg leading-relaxed min-h-[200px]"
            />
            
            {/* AI Polish Toolbar */}
            <div className="flex flex-col gap-2 mb-2 p-2 bg-gray-50 rounded-lg shrink-0">
              <div className="flex gap-2">
                <select 
                  value={polishLength}
                  onChange={(e) => setPolishLength(e.target.value)}
                  className="flex-1 text-xs p-1.5 rounded-md border border-gray-200 text-gray-700 outline-none focus:border-violet-300"
                >
                  <option value="short">📏 简短</option>
                  <option value="medium">📏 适中</option>
                  <option value="long">📏 详实</option>
                </select>

                <select 
                  value={polishTone}
                  onChange={(e) => setPolishTone(e.target.value)}
                  className="flex-1 text-xs p-1.5 rounded-md border border-gray-200 text-gray-700 outline-none focus:border-violet-300"
                >
                  <option value="standard">😐 平和</option>
                  <option value="humorous">😄 幽默</option>
                  <option value="emotional">🥰 深情</option>
                  <option value="formal">👔 严肃</option>
                  <option value="casual">👋 随意</option>
                </select>
                
                <select 
                  value={polishStyle}
                  onChange={(e) => setPolishStyle(e.target.value)}
                  className="flex-1 text-xs p-1.5 rounded-md border border-gray-200 text-gray-700 outline-none focus:border-violet-300"
                >
                  <option value="descriptive">📝 朴实</option>
                  <option value="poetic">✒️ 文采</option>
                  <option value="dreamy">☁️ 唯美</option>
                  <option value="custom">✨ 自定义</option>
                </select>
              </div>

              {polishStyle === 'custom' && (
                <input 
                  type="text"
                  placeholder="例如：像鲁迅一样犀利..."
                  value={customPolishPrompt}
                  onChange={(e) => setCustomPolishPrompt(e.target.value)}
                  className="w-full text-xs p-1.5 rounded-md border border-gray-200 text-gray-700 outline-none focus:border-violet-300"
                />
              )}

              <div className="flex justify-end">
                <button
                  onClick={handlePolish}
                  disabled={isPolishing || !content}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-full text-xs font-medium shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
                >
                  {isPolishing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {isPolishing ? '思考中...' : 'AI 润色'}
                </button>
              </div>
            </div>

            {/* Preview Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4 shrink-0">
              {previewUrls.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group">
                  <img src={url} alt="preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => {
                       setPreviewUrls(prev => prev.filter((_, i) => i !== idx));
                       setSelectedImages(prev => prev.filter((_, i) => i !== idx));
                    }}
                    className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="border-t border-gray-100 pt-4 mt-4 space-y-4 shrink-0">
              {/* Resource Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <select 
                  value={selectedTravelPlanId}
                  onChange={(e) => setSelectedTravelPlanId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 outline-none focus:border-orange-300 appearance-none"
                >
                  <option value="">🔗 关联旅行计划</option>
                  {travelPlans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.plan_title} ({new Date(plan.created_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>

                <select 
                  value={selectedNutritionAnalysisId}
                  onChange={(e) => setSelectedNutritionAnalysisId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 outline-none focus:border-green-300 appearance-none"
                >
                  <option value="">🔗 关联饮食分析</option>
                  {nutritionAnalyses.map(analysis => (
                    <option key={analysis.id} value={analysis.id}>
                      {analysis.goal} - {new Date(analysis.created_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="p-2 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors">
                  <ImageIcon className="w-5 h-5" />
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageSelect} />
                </label>
                
                <div className="flex gap-2">
                  {['happy', 'excited', 'tired', 'sad'].map(m => (
                    <button
                      key={m}
                      onClick={() => setMood(m)}
                      className={`p-2 rounded-full text-xl transition-transform ${mood === m ? 'bg-orange-100 scale-110' : 'hover:bg-gray-50'}`}
                    >
                      {getMoodEmoji(m)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotePage;