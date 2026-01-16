import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Mic, Send, Download, RefreshCw, Volume2, AlertCircle, Map, Sparkles, MapPin, X } from 'lucide-react';
import { useTravel } from '@/hooks';
import { generateThreadId } from '@/utils';

interface Props {
  onBack: () => void;
}

const TravelPlanningPage: React.FC<Props> = ({ onBack }) => {
  const [status, setStatus] = useState<'IDLE' | 'RECORDING' | 'PROCESSING' | 'WAITING_CONFIRM' | 'RESULT' | 'ERROR'>('IDLE');
  const [threadId, setThreadId] = useState<string>('');
  const [aiMessage, setAiMessage] = useState<string>('嗨！想去哪里兜风？我可以帮你规划路线、查天气，甚至搞定门票。');
  const [inputText, setInputText] = useState('');
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showConfirmButtons, setShowConfirmButtons] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<{ origin: string; destination: string } | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const { chatWithAgent, chatResponse, isLoading, error, clearError } = useTravel();

  useEffect(() => {
    const newThreadId = generateThreadId();
    setThreadId(newThreadId);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.start();
      setStatus('RECORDING');
    } catch (err) {
      alert("麦克风权限获取失败");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === 'RECORDING') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await sendToAgent(audioBlob, undefined);
      };
    }
  };

  const sendText = async () => {
    if (!inputText.trim()) return;
    await sendToAgent(undefined, inputText);
    setInputText('');
  };

  const sendToAgent = async (audioBlob?: Blob, text?: string) => {
    setStatus('PROCESSING');
    clearError();

    try {
      const requestData: any = { thread_id: threadId };
      
      if (audioBlob) {
        requestData.file = new File([audioBlob], 'voice_input.wav', { type: 'audio/wav' });
      } else if (text) {
        requestData.text = text;
      } else {
        return;
      }

      const response = await chatWithAgent(requestData);
      
      if (response.status === 'error') {
        setStatus('ERROR');
        setAiMessage("哎呀，信号好像迷路了，再试一次？");
        return;
      }
      
      setAiMessage(response.chat_response);
      
      // 检测是否是询问起点的消息
      if (response.chat_response.includes('我还需要知道您的起点') && !response.is_final) {
        setShowLocationPrompt(true);
      }
      
      // 检测是否是确认开始的提示
      if (response.chat_response.includes('确认开始吗？') && !response.is_final) {
        // 提取起点和终点
        const originMatch = response.chat_response.match(/【(.+?)】到【(.+?)】/);
        if (originMatch) {
          setPendingPlan({ origin: originMatch[1], destination: originMatch[2] });
          setShowConfirmButtons(true);
        }
      }
      
      if (response.is_final && response.data) {
        setStatus('RESULT');
        setShowConfirmButtons(false);
        setPendingPlan(null);
      } else {
        setStatus('WAITING_CONFIRM');
      }
    } catch (error) {
      setStatus('ERROR');
      setAiMessage("无法连接到旅行管家，请检查网络。");
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('您的浏览器不支持地理位置功能');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // 使用高德地图逆地理编码获取地址
          const { latitude, longitude } = position.coords;
          // 高德地图逆地理编码 API
          const response = await fetch(
            `https://restapi.amap.com/v3/geocode/regeo?key=${import.meta.env.VITE_AMAP_API_KEY || '5e7f021f88e83fa2b782125f4bbbf193'}&location=${longitude},${latitude}&extensions=base&batch=false&roadlevel=0`
          );
          
          if (response.ok) {
            const data = await response.json();
            const address = data.regeocode?.formatted_address || `${latitude}, ${longitude}`;
            
            // 自动发送当前位置
            await sendToAgent(undefined, address);
            setShowLocationPrompt(false);
          }
        } catch (err) {
          console.error('获取地址失败:', err);
          alert('获取当前位置失败，请手动输入');
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        setIsGettingLocation(false);
        switch(error.code) {
          case error.PERMISSION_DENIED:
            alert('您拒绝了定位权限');
            break;
          case error.POSITION_UNAVAILABLE:
            alert('无法获取位置信息');
            break;
          case error.TIMEOUT:
            alert('获取位置超时');
            break;
          default:
            alert('获取位置失败');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const resetChat = () => {
    setThreadId(generateThreadId());
    setStatus('IDLE');
    setAiMessage('嗨！想去哪里兜风？我可以帮你规划路线、查天气，甚至搞定门票。');
    setShowConfirmButtons(false);
    setPendingPlan(null);
    setShowLocationPrompt(false);
    clearError();
  };

  return (
    <div className="w-full h-full bg-[#fdfbf7] text-stone-700 flex flex-col font-sans relative overflow-hidden">
        {/* Location Permission Modal */}
        {showLocationPrompt && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200 relative">
              <button
                onClick={() => setShowLocationPrompt(false)}
                disabled={isGettingLocation}
                className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-70"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-serif font-bold text-stone-800 mb-2">
                  使用当前位置？
                </h3>
                <p className="text-stone-500 text-sm">
                  让我们帮您自动获取起点，这样更方便！
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleGetCurrentLocation}
                  disabled={isGettingLocation}
                  className="w-full bg-gradient-to-r from-orange-400 to-pink-500 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGettingLocation ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      获取位置中...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-5 h-5" />
                      允许定位
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowLocationPrompt(false)}
                  disabled={isGettingLocation}
                  className="w-full bg-stone-100 text-stone-600 py-3 rounded-xl font-medium hover:bg-stone-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  手动输入
                </button>

                <button
                  onClick={() => {
                    setShowLocationPrompt(false);
                    setInputText('');
                  }}
                  disabled={isGettingLocation}
                  className="w-full text-stone-400 py-2 text-sm hover:text-stone-600 transition-colors disabled:opacity-70"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Ambient Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] bg-blue-100 rounded-full blur-[80px] opacity-60 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] bg-orange-100 rounded-full blur-[80px] opacity-60 pointer-events-none"></div>

      {/* Header */}
      <div className="p-4 pt-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-full bg-white border border-stone-200 shadow-sm hover:shadow-md transition-all text-stone-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-serif font-bold text-stone-800 flex items-center gap-2">
            <Map className="w-5 h-5 text-orange-500" />
            旅行手账
          </h1>
        </div>
        <button onClick={resetChat} className="p-2 rounded-full bg-white border border-stone-200 shadow-sm hover:rotate-180 transition-transform duration-500 text-stone-400">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative flex flex-col z-10">
        
        {status === 'RESULT' && chatResponse?.data ? (
          <div className="flex-1 w-full h-full relative px-4 pb-4">
            <div className="w-full h-full bg-white rounded-3xl shadow-soft overflow-hidden border border-stone-100 relative">
                 <iframe 
                  src={chatResponse.data.h5_url} 
                  title="Travel Plan"
                  className="w-full h-full border-none" 
                />
                <a 
                  href={chatResponse.data.download_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="absolute bottom-6 right-6 bg-stone-800 text-white p-4 rounded-full shadow-xl hover:scale-105 transition-transform flex items-center gap-2 font-bold"
                >
                  <Download className="w-5 h-5" />
                  <span className="text-sm">保存行程</span>
                </a>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center space-y-8">
            
            {/* AI Avatar / Status - Redesigned as a Sunny Blob */}
            <div className="relative">
                {status === 'PROCESSING' && (
                    <div className="absolute inset-0 bg-orange-300 blur-xl animate-pulse opacity-50 rounded-full"></div>
                )}
                <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 bg-gradient-to-br ${
                    status === 'RECORDING' ? 'from-red-400 to-pink-500 scale-110 shadow-glow-orange' : 
                    status === 'PROCESSING' ? 'from-purple-400 to-indigo-400 animate-bounce' :
                    'from-orange-300 to-yellow-300 shadow-glow-orange'
                }`}>
                    {status === 'RECORDING' ? (
                        <Mic className="w-12 h-12 text-white animate-pulse" />
                    ) : status === 'PROCESSING' ? (
                        <Sparkles className="w-12 h-12 text-white animate-spin" />
                    ) : (
                        <div className="text-white text-5xl">👀</div>
                    )}
                </div>
            </div>

            {/* Message Bubble - Paper style */}
            {showConfirmButtons && pendingPlan ? (
              <div className="bg-white border border-stone-100 p-6 rounded-3xl shadow-soft max-w-sm w-full relative">
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-stone-100 rotate-45 z-0"></div>
                <p className="text-lg leading-relaxed text-stone-600 font-medium mb-4 relative z-10">
                  为您准备好了！规划从 <span className="text-orange-500 font-bold">{pendingPlan.origin}</span> 到 <span className="text-orange-500 font-bold">{pendingPlan.destination}</span>。
                </p>
                <div className="flex gap-3 relative z-10">
                  <button
                    onClick={() => sendToAgent(undefined, 'yes')}
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-orange-400 to-pink-500 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    确认开始
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmButtons(false);
                      setPendingPlan(null);
                      resetChat();
                    }}
                    disabled={isLoading}
                    className="flex-1 bg-stone-100 text-stone-600 py-3 rounded-xl font-medium hover:bg-stone-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-stone-100 p-6 rounded-tr-3xl rounded-tl-3xl rounded-br-3xl rounded-bl-none shadow-soft max-w-xs w-full relative">
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-stone-100 rotate-45 z-0"></div>
                <p className="text-lg leading-relaxed text-stone-600 font-medium relative z-10">
                  {aiMessage}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Input Area */}
        {status !== 'RESULT' && (
          <div className="p-4 pb-8 bg-white/60 backdrop-blur-lg border-t border-white/50 flex flex-col gap-4">
             {/* Mic Button - The "Sun" */}
             <div className="flex justify-center -mt-12">
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                  onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                  disabled={status === 'PROCESSING'}
                  className={`w-20 h-20 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 border-4 border-[#fdfbf7] ${
                    status === 'RECORDING' 
                      ? 'bg-red-500 scale-110' 
                      : status === 'PROCESSING' || isLoading
                      ? 'bg-stone-300 cursor-not-allowed'
                      : 'bg-gradient-to-tr from-orange-400 to-pink-400 hover:scale-105 active:scale-95'
                  }`}
                >
                  <Mic className="w-8 h-8 text-white" />
                </button>
             </div>
             
             <p className="text-center text-xs text-stone-400 font-medium mb-2">
                {status === 'RECORDING' ? '正在聆听...' : '按住橙色按钮说话'}
             </p>

             {/* Text Input - Pill Shape */}
             <div className="flex gap-2 items-center bg-white border border-stone-200 rounded-full px-2 py-2 shadow-sm focus-within:ring-2 focus-within:ring-orange-200 transition-all">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="或者输入你的计划..."
                  className="flex-1 bg-transparent px-4 py-2 text-stone-700 focus:outline-none placeholder:text-stone-300"
                  onKeyDown={(e) => e.key === 'Enter' && sendText()}
                  disabled={status === 'PROCESSING' || status === 'RECORDING'}
                />
                <button 
                  onClick={sendText}
                  disabled={!inputText.trim() || status === 'PROCESSING' || isLoading}
                  className="bg-stone-800 disabled:bg-stone-300 text-white p-2.5 rounded-full transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TravelPlanningPage;