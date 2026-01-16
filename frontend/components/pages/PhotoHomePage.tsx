import React from 'react';
import { ChevronDown, MapPin, Sparkles, Mic, Camera, User, Sun } from 'lucide-react';

interface PhotoHomePageProps {
  onProfileClick: () => void;
  onTravelClick: () => void;
  onFoodAnalysisClick: () => void;
}

const PhotoHomePage: React.FC<PhotoHomePageProps> = ({
  onProfileClick,
  onTravelClick,
  onFoodAnalysisClick,
}) => {
  const getUsername = (): string => {
    // 尝试从本地存储获取用户名
    const token = localStorage.getItem('token');
    if (!token) {
      return 'Hello, User';
    }

    // 解码JWT token获取用户信息（简单实现，实际应该调用API获取）
    try {
      // 这里我们简单地显示"已登录用户"，实际应该调用API获取用户昵称
      return '欢迎回来!';
    } catch (e) {
      return 'Hello, User';
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#fdfbf7] font-sans select-none">
      {/* 
        1️⃣ 背景层 (Background Layer)
        Switching to a bright, sunny, outdoor camping/picnic scene.
        Warm tones, blue skies.
      */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?q=80&w=2070&auto=format&fit=crop"
          alt="Sunny Lifestyle Background"
          className="w-full h-full object-cover animate-[scale-slow_30s_ease-in-out_infinite_alternate]"
        />
        {/* Soft light overlay instead of dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-200/20 via-transparent to-orange-100/30 pointer-events-none" />
      </div>

      {/* Top Brand Area */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-2 bg-white/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/40 shadow-sm">
           <Sun className="w-4 h-4 text-orange-500 animate-spin-slow" />
           <span className="text-stone-800 text-xs font-bold tracking-widest uppercase">Sunday Life</span>
        </div>
      </div>

      {/*
        2️⃣ 点击区域 1：个人中心 (Personal Center)
        Design: Floating White Glass Pill
      */}
      <div
        onClick={onProfileClick}
        className="absolute top-[15%] left-1/2 -translate-x-1/2 z-10 cursor-pointer group"
      >
        <div className="relative">
            {/* Ripple Effect */}
            <div className="absolute inset-0 bg-white/40 rounded-full animate-ping opacity-75 duration-[3000ms]"></div>

            <div className="bg-white/70 backdrop-blur-xl border border-white/80 p-1.5 pr-6 rounded-full flex items-center gap-3 shadow-soft hover:scale-105 transition-transform duration-300">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-400 flex items-center justify-center shadow-inner">
                    <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                    <span className="text-stone-800 text-sm font-bold leading-none font-serif">
                      {getUsername()}
                    </span>
                    <span className="text-stone-500 text-[10px] font-medium mt-1">美好的一天开始啦</span>
                </div>
            </div>
        </div>
      </div>

      {/* 
        3️⃣ 点击区域 2：出行规划 (Travel Planning)
        Design: Postcard / Polaroid Style
      */}
      <div 
        onClick={onTravelClick}
        className="absolute bottom-[15%] left-[6%] z-10 cursor-pointer group"
      >
        <div className="bg-white/80 backdrop-blur-md border border-white p-4 rounded-3xl shadow-soft w-40 hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
            {/* Decor Blob */}
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-200/50 rounded-full blur-xl"></div>
            
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform">
                <Mic className="w-5 h-5" />
            </div>
            <h2 className="text-stone-800 font-serif text-lg font-bold leading-tight">
                去哪儿<br/>玩鸭?
            </h2>
            <p className="text-stone-500 text-[10px] mt-2 font-medium">
                语音规划周末行程
            </p>
            <div className="mt-3 flex items-center gap-1 text-[10px] text-blue-600 font-bold">
                <span>点击说话</span>
                <Sparkles className="w-3 h-3" />
            </div>
        </div>
      </div>

      {/* 
        4️⃣ 点击区域 3：菜品分析 (Food Analysis)
        Design: Nutrition Label Style
      */}
      <div 
        onClick={onFoodAnalysisClick}
        className="absolute bottom-[20%] right-[6%] z-10 cursor-pointer group"
      >
         <div className="bg-white/80 backdrop-blur-md border border-white p-4 rounded-3xl shadow-soft w-40 hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
            {/* Decor Blob */}
            <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-green-200/50 rounded-full blur-xl"></div>

            <div className="flex justify-end mb-3">
                <div className="w-10 h-10 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center group-hover:-rotate-12 transition-transform">
                    <Camera className="w-5 h-5" />
                </div>
            </div>
            
            <h2 className="text-stone-800 font-serif text-lg font-bold leading-tight text-right">
                吃得<br/>健康吗?
            </h2>
            <p className="text-stone-500 text-[10px] mt-2 font-medium text-right">
                拍照识别卡路里
            </p>
            <div className="mt-3 flex justify-end items-center gap-1 text-[10px] text-green-600 font-bold">
                <Sparkles className="w-3 h-3" />
                <span>扫描食物</span>
            </div>
        </div>
      </div>

      {/* Decorative center text */}
      <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none opacity-60">
        <p className="text-white text-shadow-sm font-serif italic text-lg">"Explore the world, taste the life."</p>
      </div>

      <style>{`
        @keyframes scale-slow {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default PhotoHomePage;