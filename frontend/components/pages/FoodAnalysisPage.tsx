import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Camera, RefreshCw, Flame, Heart, Leaf, ChevronRight, Clock, Target, BookOpen } from 'lucide-react';
import { useNutrition } from '@/hooks';
import { nutritionService } from '@/services';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';

interface Props {
  onBack: () => void;
}

const FoodAnalysisPage: React.FC<Props> = ({ onBack }) => {
  const [cameraError, setCameraError] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { result, isAnalyzing, error, analyzeFood, clearResult, clearError } = useNutrition();

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraError(false);
    } catch (err) {
      setCameraError(true);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const base64Image = dataUrl.split(',')[1]; 

    try {
      clearError();
      const analysisResult = await analyzeFood(base64Image, "控糖", "user_001");
      
      // 分析成功后，自动保存到历史记录
      if (analysisResult && analysisResult.report) {
        try {
          await nutritionService.saveNutritionAnalysis({
            image_path: dataUrl, // 保存base64图片
            detected_dishes: analysisResult.detected_dishes || [],
            goal: "控糖",
            report: analysisResult.report
          });
          console.log('营养分析记录已保存');
        } catch (saveError) {
          console.error('保存营养分析记录失败:', saveError);
          // 保存失败不影响显示结果
        }
      }
    } catch (error) {
      console.error("分析失败:", error);
    }
  };

  const resetAnalysis = () => {
    clearResult();
    clearError();
    setShowFullReport(false);
    startCamera();
  };

  // 简单的Markdown文本清理函数
  const cleanMarkdownText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体标记，保留内容
      .replace(/\*(.*?)\*/g, '$1')     // 移除斜体标记，保留内容
      .replace(/^#+\s*/gm, '')         // 移除标题标记
      .replace(/^>\s*/gm, '')          // 移除引用标记
      .replace(/^\d+\.\s*/gm, '• ')    // 将数字列表转为项目符号
      .replace(/^-\s*/gm, '• ')        // 统一列表符号
      .trim();
  };

  // 提取关键信息的函数
  const extractKeyInfo = (content: string) => {
    // 提取推荐内容（**推荐：** 后面的内容）
    const recommendMatch = content.match(/\*\*推荐[：:]\*\*(.*?)(?=\*\*|$)/s);
    if (recommendMatch) {
      return cleanMarkdownText(recommendMatch[1].trim());
    }
    
    // 提取理由内容（**理由** 后面的内容）
    const reasonMatch = content.match(/\*\*理由\*\*[：:]?(.*?)(?=\*\*|$)/s);
    if (reasonMatch) {
      return cleanMarkdownText(reasonMatch[1].trim());
    }
    
    // 如果没有特定标记，返回清理后的前150个字符
    const cleaned = cleanMarkdownText(content);
    return cleaned.length > 150 ? cleaned.substring(0, 150) + '...' : cleaned;
  };
  // 解析Markdown报告为结构化数据
  const parseReport = (report: string) => {
    const sections = report.split('####').filter(section => section.trim());
    const parsed = {
      principles: '',
      recommendations: [] as Array<{title: string, content: string, summary: string}>,
      tips: [] as string[],
      example: ''
    };

    sections.forEach(section => {
      const lines = section.trim().split('\n');
      const title = cleanMarkdownText(lines[0]);
      const content = lines.slice(1).join('\n').trim();

      if (title.includes('核心原则')) {
        parsed.principles = cleanMarkdownText(content);
      } else if (title.includes('整餐搭配建议')) {
        // 解析子项目
        const subSections = content.split('#####').filter(s => s.trim());
        subSections.forEach(sub => {
          const subLines = sub.trim().split('\n');
          const subTitle = cleanMarkdownText(subLines[0]).replace(/^\d+\.\s*/, '');
          const subContent = subLines.slice(1).join('\n');
          
          if (subTitle && subTitle.length > 0) {
            parsed.recommendations.push({
              title: subTitle,
              content: subContent,
              summary: extractKeyInfo(subContent)
            });
          }
        });
      } else if (title.includes('控糖关键提醒')) {
        const tipLines = content.split('\n').filter(line => 
          line.trim().match(/^\d+\./) && line.trim().length > 5
        );
        parsed.tips = tipLines.map(tip => 
          cleanMarkdownText(tip).replace(/^\d+\.\s*/, '')
        ).slice(0, 4);
      } else if (title.includes('整餐示例')) {
        parsed.example = content;
      }
    });

    return parsed;
  };

  const parsedReport = result ? parseReport(result.report) : null;

  return (
    <div className="w-full h-full bg-[#f0fdf4] relative overflow-hidden font-sans text-stone-700">
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Viewport */}
      {!result ? (
        <div className="absolute inset-0 z-0">
          {!cameraError ? (
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
          ) : (
             <div className="w-full h-full flex items-center justify-center bg-stone-100">
               <p className="text-stone-400">摄像头未开启</p>
             </div>
          )}
          
          <div className="absolute inset-0 pointer-events-none border-[20px] border-white/90 z-10"></div>
          
          {isAnalyzing && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
                <div className="animate-spin text-green-600 mb-4">
                    <Leaf className="w-12 h-12" />
                </div>
                <p className="text-green-800 font-serif text-xl tracking-wide font-bold">AI分析中...</p>
                <p className="text-green-600 text-sm">正在生成控糖建议</p>
            </div>
          )}
        </div>
      ) : (
        <div className="absolute inset-0 z-0 bg-stone-200"></div>
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center z-20">
        <button onClick={onBack} className="p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-stone-600 hover:scale-105 transition-transform">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="ml-auto bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-green-700 shadow-sm flex items-center gap-2">
           <Leaf className="w-3 h-3" />
           <span>智能控糖分析</span>
        </div>
      </div>

      {/* Shutter Button */}
      {!isAnalyzing && !result && (
        <div className="absolute bottom-12 left-0 right-0 flex justify-center z-20">
          <button 
            onClick={captureAndAnalyze}
            disabled={cameraError}
            className="w-20 h-20 rounded-full border-4 border-white shadow-lg flex items-center justify-center bg-green-500 hover:bg-green-600 transition-all active:scale-95 disabled:opacity-50"
          >
            <Camera className="w-8 h-8 text-white" />
          </button>
        </div>
      )}

      {/* Enhanced Result Display */}
      {result && (
        <div className="absolute inset-0 z-30 pt-20 px-4 pb-6 flex flex-col justify-end pointer-events-none">
          <div className="bg-[#fffbf0] rounded-3xl p-6 shadow-soft border border-stone-100 pointer-events-auto max-h-[85vh] overflow-y-auto animate-slide-up relative">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                 <h2 className="text-2xl font-serif font-bold text-stone-800">控糖饮食建议</h2>
                 <p className="text-stone-400 text-xs mt-1 font-mono uppercase tracking-wide">AI Nutrition Analysis</p>
              </div>
              <button onClick={resetAnalysis} className="p-2 bg-stone-100 rounded-full text-stone-500 hover:bg-stone-200">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Detected Dishes - 只在有数据时显示 */}
            {result.detected_dishes && result.detected_dishes.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                  {result.detected_dishes.map((dish, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm font-bold shadow-sm">
                      {dish}
                    </span>
                  ))}
              </div>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white p-3 rounded-2xl border border-stone-100 shadow-sm flex flex-col items-center justify-center py-4">
                    <span className="text-stone-400 text-xs font-bold uppercase">控糖指数</span>
                    <div className="text-green-600 font-serif text-2xl font-bold flex items-center gap-1">
                        <Target className="w-4 h-4 fill-current" /> 优秀
                    </div>
                    <span className="text-stone-400 text-[10px]">AI评估</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-stone-100 shadow-sm flex flex-col items-center justify-center py-4">
                    <span className="text-stone-400 text-xs font-bold uppercase">健康评分</span>
                    <div className="text-orange-500 font-serif text-2xl font-bold flex items-center gap-1">
                        <Heart className="w-4 h-4 fill-current" /> 8.5
                    </div>
                    <span className="text-stone-400 text-[10px]">/ 10.0</span>
                </div>
            </div>

            {/* Structured Report Display */}
            {parsedReport && !showFullReport ? (
              <div className="space-y-4 mb-4">
                {/* 核心原则 */}
                {parsedReport.principles && (
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-2xl border border-green-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-5 h-5 text-green-600" />
                      <h3 className="text-base font-bold text-green-800">控糖核心原则</h3>
                    </div>
                    <p className="text-sm text-green-700 leading-relaxed">
                      {parsedReport.principles}
                    </p>
                  </div>
                )}

                {/* 营养搭配建议 */}
                {parsedReport.recommendations.length > 0 && (
                  <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Heart className="w-5 h-5 text-orange-500" />
                      <h3 className="text-base font-bold text-stone-800">营养搭配建议</h3>
                    </div>
                    <div className="space-y-3">
                      {parsedReport.recommendations.slice(0, 3).map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl">
                          <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-orange-600">{idx + 1}</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-stone-800 mb-1">
                              {rec.title}
                            </h4>
                            <p className="text-xs text-stone-600 leading-relaxed">
                              {rec.summary}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 控糖要点 */}
                {parsedReport.tips.length > 0 && (
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-5 h-5 text-amber-600" />
                      <h3 className="text-base font-bold text-amber-800">控糖要点</h3>
                    </div>
                    <div className="space-y-2">
                      {parsedReport.tips.slice(0, 3).map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-700 leading-relaxed">
                            {tip}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowFullReport(true)}
                    className="flex-1 px-4 py-3 bg-stone-800 text-white rounded-xl text-sm font-bold hover:bg-stone-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    查看完整建议
                  </button>
                  <button 
                    onClick={resetAnalysis}
                    className="px-4 py-3 bg-stone-100 text-stone-700 rounded-xl text-sm font-bold hover:bg-stone-200 transition-colors"
                  >
                    重新分析
                  </button>
                </div>
              </div>
            ) : (
              /* 完整报告显示 */
              <div className="space-y-4 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-stone-800">完整营养建议</h3>
                  <button 
                    onClick={() => setShowFullReport(false)}
                    className="text-sm text-stone-500 hover:text-stone-700"
                  >
                    收起
                  </button>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm max-h-96 overflow-y-auto">
                  <MarkdownRenderer 
                    content={result.report}
                    className="text-sm text-stone-600 leading-relaxed"
                  />
                </div>
                <button 
                  onClick={resetAnalysis}
                  className="w-full px-4 py-3 bg-stone-800 text-white rounded-xl text-sm font-bold hover:bg-stone-700 transition-colors"
                >
                  重新分析
                </button>
              </div>
            )}
            
            <div className="text-center">
               <span className="text-[10px] text-stone-300 font-serif italic">
                 Powered by AI Nutrition Expert
               </span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default FoodAnalysisPage;