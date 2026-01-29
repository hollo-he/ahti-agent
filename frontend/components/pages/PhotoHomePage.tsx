import React from 'react';
import { ChevronDown, MapPin, Sparkles, Mic, Camera, User, Sun, Book, Calendar } from 'lucide-react';

import { authService } from '../../services/authService';

interface PhotoHomePageProps {
  onProfileClick: () => void;
  onTravelClick: () => void;
  onFoodAnalysisClick: () => void;
  onNoteClick: () => void;
  onTodoClick: () => void;
}

const PhotoHomePage: React.FC<PhotoHomePageProps> = ({
  onProfileClick,
  onTravelClick,
  onFoodAnalysisClick,
  onNoteClick,
  onTodoClick,
}) => {
  const [isBoyView, setIsBoyView] = React.useState(true);

  React.useEffect(() => {
    const fetchGender = async () => {
      try {
        const user = await authService.getProfile();
        // If gender is Female ('F'), switch to girl view. Otherwise default to boy.
        if (user.gender === 'F') {
          setIsBoyView(false);
        } else {
          setIsBoyView(true);
        }
      } catch (e) {
        console.error("Failed to fetch user profile for gender", e);
      }
    };
    fetchGender();
  }, []);

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
        Switching between Boy/Girl views based on state.
        Fallback to Unsplash if local images are missing.
      */}
      <div className="absolute inset-0 z-0">
        <img
          key={isBoyView ? 'boy' : 'girl'} // Force re-render on switch
          src={isBoyView ? "/images/home_boy.png" : "/images/home_girl.png"}
          onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?q=80&w=2070&auto=format&fit=crop";
          }}
          alt="Home Background"
          className="w-full h-full object-cover animate-[scale-slow_30s_ease-in-out_infinite_alternate]"
        />
        {/* Soft light overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-200/10 via-transparent to-orange-100/20 pointer-events-none" />
      </div>

      {/* Top Brand Area (Top Left) */}
      <div className="absolute top-6 left-6 z-20">
        <div className="flex items-center gap-2 bg-black/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 shadow-sm">
           <Sun className="w-4 h-4 text-orange-400 animate-spin-slow" />
           <span className="text-white/90 text-xs font-bold tracking-widest uppercase shadow-black/10 drop-shadow-sm">Sunday Life</span>
        </div>
      </div>

      {/* 
        2️⃣ 点击区域 1：个人中心 (Personal Center) - Top Right
        Design: Minimal Glass Profile
      */}
      <div
        onClick={onProfileClick}
        className="absolute top-6 right-6 z-20 cursor-pointer group"
      >
        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-1.5 pr-4 rounded-full flex items-center gap-3 shadow-lg hover:bg-white/20 transition-all duration-300">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-300 to-purple-300 flex items-center justify-center border border-white/30">
                <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
                <span className="text-white text-sm font-bold leading-none font-serif tracking-wide drop-shadow-md">
                  {getUsername()}
                </span>
                <span className="text-white/70 text-[10px] font-medium mt-0.5">个人空间</span>
            </div>
        </div>
      </div>

      {/* 
        3️⃣ 功能按钮区 (Function Buttons Area)
        Split into Left and Right groups using absolute positioning.
        This avoids full-width containers that might cause layout issues.
      */}

      {/* Left Group: Note & Travel */}
      <div className="absolute bottom-[10%] left-[8%] z-20 flex flex-col gap-6">
        {/* Notebook Hotspot -> Diary */}
        <div 
          onClick={onNoteClick}
            className="w-[130px] h-[150px] cursor-pointer group transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="w-full h-full rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl flex flex-col items-center justify-center gap-3 overflow-hidden hover:bg-white/20 transition-all">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400/80 to-emerald-300/80 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Book className="w-6 h-6 text-white" />
                </div>
                <div className="text-center">
                  <h3 className="text-white font-bold text-base drop-shadow-md tracking-wide">写日记</h3>
                  <p className="text-white/70 text-[10px] mt-1">生活点滴</p>
                </div>
            </div>
          </div>

          {/* Map Hotspot -> Travel Planning */}
          <div 
            onClick={onTravelClick}
            className="w-[130px] h-[150px] cursor-pointer group transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="w-full h-full rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl flex flex-col items-center justify-center gap-3 overflow-hidden hover:bg-white/20 transition-all">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400/80 to-cyan-300/80 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <MapPin className="w-7 h-7 text-white" />
                </div>
                <div className="text-center">
                  <h3 className="text-white font-bold text-lg drop-shadow-md tracking-wide">去哪儿玩?</h3>
                  <p className="text-white/70 text-[10px] mt-1">智能规划</p>
                </div>
            </div>
          </div>
        </div>

      {/* Right Group: Todo & Food */}
      <div className="absolute bottom-[10%] right-[8%] z-20 flex flex-col gap-6">
        {/* Calendar Hotspot -> Todo/Plan */}
        <div 
          onClick={onTodoClick}
          className="w-[130px] h-[150px] cursor-pointer group transition-transform duration-300 hover:-translate-y-1"
        >
          <div className="w-full h-full rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl flex flex-col items-center justify-center gap-3 overflow-hidden hover:bg-white/20 transition-all">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400/80 to-pink-300/80 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-white font-bold text-base drop-shadow-md tracking-wide">做计划</h3>
                <p className="text-white/70 text-[10px] mt-1">待办事项</p>
              </div>
          </div>
        </div>

        {/* Camera Hotspot -> Food Analysis */}
        <div 
          onClick={onFoodAnalysisClick}
          className="w-[130px] h-[150px] cursor-pointer group transition-transform duration-300 hover:-translate-y-1"
        >
          <div className="w-full h-full rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl flex flex-col items-center justify-center gap-3 overflow-hidden hover:bg-white/20 transition-all">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400/80 to-yellow-300/80 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Camera className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-white font-bold text-lg drop-shadow-md tracking-wide">吃什么?</h3>
                <p className="text-white/70 text-[10px] mt-1">健康分析</p>
              </div>
          </div>
        </div>
      </div>

      {/* Decorative center text */}
      <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none opacity-60">
        <p className="text-white text-shadow-sm font-serif italic text-lg">"探索世界，品味生活"</p>
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