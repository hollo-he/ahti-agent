import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, User, Activity, CalendarClock, ChevronRight, Award, LogOut, MapPin, Utensils, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks';
import { travelService, nutritionService, authService } from '@/services';

interface Props {
  onBack: () => void;
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
  nickname?: string;
  avatar_url?: string;
  gender?: string;
  age?: number;
  dietary_preferences?: any; // 可以是对象或字符串
  travel_preferences?: any;  // 可以是对象或字符串
}

interface TravelPlan {
  id: number;
  plan_title: string;
  origin: string;
  destination: string;
  created_at: string;
}

interface NutritionAnalysis {
  id: number;
  user_id: number;
  image_path: string;
  detected_dishes: string; // JSON字符串
  goal: string;
  report: string;
  created_at: string;
  updated_at: string;
}

const PersonalCenterPage: React.FC<Props> = ({ onBack }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [recentTravelPlans, setRecentTravelPlans] = useState<TravelPlan[]>([]);
  const [recentNutritionAnalyses, setRecentNutritionAnalyses] = useState<NutritionAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNutrition, setSelectedNutrition] = useState<NutritionAnalysis | null>(null);
  const [selectedTravel, setSelectedTravel] = useState<TravelPlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});

  const { user, logout, refreshProfile } = useAuth();

  useEffect(() => {
    console.log('用户状态变化，重新获取数据:', user);
    fetchUserData();
  }, [user]); // 当 user 状态改变时重新获取数据

  // 初始化编辑表单
  useEffect(() => {
    if (userProfile) {
      // 解析偏好设置，如果是字符串则转换为对象
      let parsedDietaryPrefs = userProfile.dietary_preferences;
      if (typeof userProfile.dietary_preferences === 'string') {
        try {
          parsedDietaryPrefs = JSON.parse(userProfile.dietary_preferences);
        } catch {
          parsedDietaryPrefs = userProfile.dietary_preferences;
        }
      }

      let parsedTravelPrefs = userProfile.travel_preferences;
      if (typeof userProfile.travel_preferences === 'string') {
        try {
          parsedTravelPrefs = JSON.parse(userProfile.travel_preferences);
        } catch {
          parsedTravelPrefs = userProfile.travel_preferences;
        }
      }

      setEditForm({
        nickname: userProfile.nickname,
        avatar_url: userProfile.avatar_url,
        gender: userProfile.gender,
        age: userProfile.age,
        dietary_preferences: parsedDietaryPrefs,
        travel_preferences: parsedTravelPrefs
      });
    }
  }, [userProfile]);

  // 开始编辑
  const startEditing = () => {
    setIsEditing(true);
  };

  // 取消编辑
  const cancelEditing = () => {
    setIsEditing(false);
    // 重置表单到当前用户资料
    if (userProfile) {
      // 解析偏好设置，如果是字符串则转换为对象
      let parsedDietaryPrefs = userProfile.dietary_preferences;
      if (typeof userProfile.dietary_preferences === 'string') {
        try {
          parsedDietaryPrefs = JSON.parse(userProfile.dietary_preferences);
        } catch {
          parsedDietaryPrefs = userProfile.dietary_preferences;
        }
      }

      let parsedTravelPrefs = userProfile.travel_preferences;
      if (typeof userProfile.travel_preferences === 'string') {
        try {
          parsedTravelPrefs = JSON.parse(userProfile.travel_preferences);
        } catch {
          parsedTravelPrefs = userProfile.travel_preferences;
        }
      }

      setEditForm({
        nickname: userProfile.nickname,
        avatar_url: userProfile.avatar_url,
        gender: userProfile.gender,
        age: userProfile.age,
        dietary_preferences: parsedDietaryPrefs,
        travel_preferences: parsedTravelPrefs
      });
    }
  };

  // 保存编辑
  const saveProfile = async () => {
    try {
      setLoading(true);

      // 准备要发送的数据，确保偏好设置是字符串格式
      const profileData: Partial<UserProfile> = {};

      // 只添加非空值到请求中
      if (editForm.nickname !== undefined && editForm.nickname !== userProfile?.nickname) {
        profileData.nickname = editForm.nickname;
      }
      if (editForm.avatar_url !== undefined && editForm.avatar_url !== userProfile?.avatar_url) {
        profileData.avatar_url = editForm.avatar_url;
      }
      if (editForm.gender !== undefined && editForm.gender !== userProfile?.gender) {
        profileData.gender = editForm.gender;
      }
      if (editForm.age !== undefined && editForm.age !== userProfile?.age) {
        profileData.age = editForm.age;  // 发送数字，后端会处理0值
      }
      if (editForm.dietary_preferences !== undefined) {
        // 将偏好设置转换为JSON字符串
        const dietaryStr = typeof editForm.dietary_preferences === 'string'
          ? editForm.dietary_preferences
          : JSON.stringify(editForm.dietary_preferences);
        if (dietaryStr !== userProfile?.dietary_preferences) {
          profileData.dietary_preferences = dietaryStr;
        }
      }
      if (editForm.travel_preferences !== undefined) {
        // 将偏好设置转换为JSON字符串
        const travelStr = typeof editForm.travel_preferences === 'string'
          ? editForm.travel_preferences
          : JSON.stringify(editForm.travel_preferences);
        if (travelStr !== userProfile?.travel_preferences) {
          profileData.travel_preferences = travelStr;
        }
      }

      console.log('准备发送更新数据:', profileData);

      // 更新用户资料
      const response = await authService.updateProfile(profileData);
      console.log('更新用户资料响应:', response);

      // 直接使用响应更新本地状态
      setUserProfile(response);

      // 刷新 useAuth hook 中的用户信息以保持全局状态一致性
      await refreshProfile();

      // 更新编辑表单以保持与用户资料的一致性
      setEditForm({
        nickname: response.nickname,
        avatar_url: response.avatar_url,
        gender: response.gender,
        age: response.age,
        dietary_preferences: response.dietary_preferences,
        travel_preferences: response.travel_preferences
      });

      setIsEditing(false);
      alert('资料更新成功！');
    } catch (err) {
      console.error('更新用户资料失败:', err);
      alert('更新资料失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理表单变化
  const handleInputChange = (field: keyof UserProfile, value: any) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 解析饮食偏好 - 获取目标
  const getDietaryGoal = (): string => {
    // 优先使用编辑表单中的数据（在编辑模式下）
    if (isEditing && editForm.dietary_preferences) {
      if (typeof editForm.dietary_preferences === 'string') {
        try {
          const parsed = JSON.parse(editForm.dietary_preferences);
          return parsed.goal || '';
        } catch {
          return '';
        }
      }
      return editForm.dietary_preferences.goal || '';
    }

    // 否则使用用户资料中的数据
    if (!userProfile?.dietary_preferences) return '';
    if (typeof userProfile.dietary_preferences === 'string') {
      try {
        const parsed = JSON.parse(userProfile.dietary_preferences);
        return parsed.goal || '';
      } catch {
        return '';
      }
    }
    return userProfile.dietary_preferences?.goal || '';
  };

  // 解析饮食偏好 - 获取限制
  const getDietaryRestrictions = (): string => {
    // 优先使用编辑表单中的数据（在编辑模式下）
    if (isEditing && editForm.dietary_preferences) {
      if (typeof editForm.dietary_preferences === 'string') {
        try {
          const parsed = JSON.parse(editForm.dietary_preferences);
          return parsed.restrictions || '';
        } catch {
          return '';
        }
      }
      return editForm.dietary_preferences.restrictions || '';
    }

    // 否则使用用户资料中的数据
    if (!userProfile?.dietary_preferences) return '';
    if (typeof userProfile.dietary_preferences === 'string') {
      try {
        const parsed = JSON.parse(userProfile.dietary_preferences);
        return parsed.restrictions || '';
      } catch {
        return '';
      }
    }
    return userProfile.dietary_preferences?.restrictions || '';
  };

  // 解析旅行偏好 - 获取预算
  const getTravelBudget = (): string => {
    // 优先使用编辑表单中的数据（在编辑模式下）
    if (isEditing && editForm.travel_preferences) {
      if (typeof editForm.travel_preferences === 'string') {
        try {
          const parsed = JSON.parse(editForm.travel_preferences);
          return parsed.budget || '';
        } catch {
          return '';
        }
      }
      return editForm.travel_preferences.budget || '';
    }

    // 否则使用用户资料中的数据
    if (!userProfile?.travel_preferences) return '';
    if (typeof userProfile.travel_preferences === 'string') {
      try {
        const parsed = JSON.parse(userProfile.travel_preferences);
        return parsed.budget || '';
      } catch {
        return '';
      }
    }
    return userProfile.travel_preferences?.budget || '';
  };

  // 解析旅行偏好 - 获取类型
  const getTravelType = (): string => {
    // 优先使用编辑表单中的数据（在编辑模式下）
    if (isEditing && editForm.travel_preferences) {
      if (typeof editForm.travel_preferences === 'string') {
        try {
          const parsed = JSON.parse(editForm.travel_preferences);
          return parsed.type || '';
        } catch {
          return '';
        }
      }
      return editForm.travel_preferences.type || '';
    }

    // 否则使用用户资料中的数据
    if (!userProfile?.travel_preferences) return '';
    if (typeof userProfile.travel_preferences === 'string') {
      try {
        const parsed = JSON.parse(userProfile.travel_preferences);
        return parsed.type || '';
      } catch {
        return '';
      }
    }
    return userProfile.travel_preferences?.type || '';
  };

  // 更新饮食偏好
  const updateDietaryPreference = (field: string, value: string) => {
    let currentPrefs = {};

    // 解析当前偏好
    if (editForm.dietary_preferences) {
      if (typeof editForm.dietary_preferences === 'string') {
        try {
          currentPrefs = JSON.parse(editForm.dietary_preferences);
        } catch {
          currentPrefs = {};
        }
      } else {
        currentPrefs = { ...editForm.dietary_preferences };
      }
    }

    // 更新指定字段
    const updatedPrefs = { ...currentPrefs, [field]: value };

    handleInputChange('dietary_preferences', updatedPrefs);
  };

  // 更新旅行偏好
  const updateTravelPreference = (field: string, value: string) => {
    let currentPrefs = {};

    // 解析当前偏好
    if (editForm.travel_preferences) {
      if (typeof editForm.travel_preferences === 'string') {
        try {
          currentPrefs = JSON.parse(editForm.travel_preferences);
        } catch {
          currentPrefs = {};
        }
      } else {
        currentPrefs = { ...editForm.travel_preferences };
      }
    }

    // 更新指定字段
    const updatedPrefs = { ...currentPrefs, [field]: value };

    handleInputChange('travel_preferences', updatedPrefs);
  };


  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // 获取用户资料 - 直接从后端获取最新数据，而不是依赖 useAuth hook
      try {
        console.log('开始获取用户资料...');
        const userData = await authService.getProfile();
        console.log('从后端获取的用户资料:', userData);
        setUserProfile(userData);
        console.log('已设置用户资料到 userProfile 状态:', userData);
      } catch (err) {
        console.error('获取用户资料失败:', err);
        // 如果获取用户资料失败，但 user 存在，可以使用 useAuth 中的 user
        if (user) {
          setUserProfile(user);
          console.log('使用 useAuth 中的用户资料:', user);
        }
      }
      
      // 获取最近的旅行计划
      try {
        // 首先尝试使用用户特定的端点
        const travelData = await travelService.getUserTravelPlans(1, 3); // 使用正确的分页方法
        console.log('获取用户旅行计划数据:', travelData);
        setRecentTravelPlans(travelData.data || []); // 从正确字段获取数据 (后端返回的是data字段)
      } catch (err) {
        console.error('获取用户旅行计划失败:', err);
        // 如果用户特定的端点失败，尝试使用通用端点作为备选
        try {
          const travelData = await travelService.getAllTravelPlans();
          console.log('备选获取旅行计划数据:', travelData);
          // 检查返回的数据结构，如果是数组则直接使用，否则使用空数组
          const plans = Array.isArray(travelData) ? travelData : (travelData.data || []);
          setRecentTravelPlans(plans.slice(0, 3)); // 只显示最近3个
        } catch (err2) {
          console.error('备选获取旅行计划方法也失败:', err2);
          // 最后的备选：使用空数组
          setRecentTravelPlans([]);
        }
      }

      // 获取最近的营养分析
      try {
        const nutritionData = await nutritionService.getNutritionAnalyses(1, 3);
        console.log('获取营养分析数据:', nutritionData);
        setRecentNutritionAnalyses(nutritionData.data || []);
      } catch (err) {
        console.error('获取营养分析失败:', err);
      }
      
    } catch (err: any) {
      setError(err.message || '获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onBack(); // 返回首页
    } catch (err) {
      console.error('登出时出错:', err);
      // 即使登出失败也清除本地数据
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      onBack();
    }
  };

  const handleNutritionClick = async (analysis: NutritionAnalysis) => {
    try {
      console.log('获取营养分析详情，ID:', analysis.id);
      const response = await nutritionService.getNutritionAnalysisById(analysis.id);
      console.log('营养分析详情返回:', response);
      // 注意：API返回格式为 {data: {...}, success: true}，需要取data字段
      setSelectedNutrition(response.data);
    } catch (err) {
      console.error('获取营养分析详情失败:', err);
      alert('获取详情失败');
    }
  };

  const handleTravelClick = async (plan: TravelPlan) => {
    try {
      console.log('获取旅行计划详情，ID:', plan.id);
      const response = await travelService.getTravelPlanById(plan.id);
      console.log('旅行计划详情返回:', response);
      // 注意：API返回格式为 {data: {...}, success: true}，需要取data字段
      setSelectedTravel(response.data); // 显示旅行计划详情弹窗
    } catch (err) {
      console.error('获取旅行计划详情失败:', err);
      alert('获取详情失败');
    }
  };

  const closeDetailModal = () => {
    setSelectedNutrition(null);
    setSelectedTravel(null);
  };

  const formatDate = (dateString: string) => {
    // 处理可能的无效日期字符串
    if (!dateString) {
      console.warn('日期字符串为空');
      return '未知时间';
    }

    console.log('尝试格式化日期:', dateString); // 调试信息

    // 尝试解析日期字符串
    let date = new Date(dateString);

    // 如果日期无效，尝试不同格式
    if (isNaN(date.getTime())) {
      // 尝试多种常见格式
      const formats = [
        dateString + 'T00:00:00Z',  // 添加UTC标识
        dateString.replace(' ', 'T') + 'Z',  // 替换空格为T并添加UTC标识
        dateString.replace(/\.\d+$/, '') + 'Z',  // 移除毫秒部分并添加UTC标识
        dateString.replace(' ', 'T'),  // 替换空格为T
      ];

      for (const format of formats) {
        date = new Date(format);
        if (!isNaN(date.getTime())) {
          break;
        }
      }
    }

    // 再次检查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn(`无法解析的日期字符串: ${dateString}`);
      return '未知时间';
    }

    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '今天';
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-[#fdfbf7] text-stone-800 font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-stone-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full bg-[#fdfbf7] text-stone-800 font-sans flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 shadow-soft border border-stone-100 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-serif font-bold text-stone-800 mb-2">加载失败</h2>
          <p className="text-stone-600 mb-6">{error}</p>
          <button
            onClick={onBack}
            className="w-full bg-stone-100 text-stone-700 py-3 rounded-xl font-bold hover:bg-stone-200 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#fdfbf7] text-stone-800 font-sans overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-[#fdfbf7]/80 backdrop-blur-md p-4 flex justify-between items-center z-10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-stone-100 text-stone-600 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="font-serif font-bold text-lg">我的生活</span>
        <button
          onClick={handleLogout}
          className="p-2 -mr-2 rounded-full hover:bg-stone-100 text-stone-600 transition-colors"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </div>

      <div className="p-6 space-y-8">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-100 to-purple-100 p-1 mb-4 shadow-soft">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
               {userProfile?.avatar_url ? (
                 <img src={userProfile.avatar_url} alt="User" className="w-full h-full object-cover" />
               ) : (
                 <User className="w-12 h-12 text-stone-400" />
               )}
            </div>
          </div>

          {isEditing ? (
            <div className="w-full max-w-xs">
              <input
                type="text"
                value={editForm.nickname || ''}
                onChange={(e) => handleInputChange('nickname', e.target.value)}
                className="text-2xl font-serif font-bold text-stone-800 text-center bg-transparent border-b border-stone-300 focus:border-orange-500 focus:outline-none pb-1 w-full"
                placeholder="昵称"
              />
            </div>
          ) : (
            <h1 className="text-2xl font-serif font-bold text-stone-800">
              {(userProfile && userProfile.nickname) || (user && user.nickname) || (user && user.username) || editForm.nickname || '用户'}
            </h1>
          )}

          <p className="text-stone-400 text-sm mt-1">欢迎回来</p>

          <div className="flex gap-3 mt-4">
             <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold flex items-center gap-1">
                <Award className="w-3 h-3" /> 生活家
             </span>
          </div>

          {/* 编辑按钮 */}
          {!isEditing ? (
            <button
              onClick={startEditing}
              className="mt-4 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-bold hover:bg-stone-200 transition-colors"
            >
              编辑资料
            </button>
          ) : (
            <div className="flex gap-2 mt-4">
              <button
                onClick={cancelEditing}
                className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-bold hover:bg-stone-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveProfile}
                className="px-4 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
              >
                保存
              </button>
            </div>
          )}
        </div>

        {/* 详细信息编辑区域 */}
        {isEditing && (
          <div className="mt-6 bg-white rounded-2xl p-4 shadow-soft border border-stone-50 space-y-4">
            <div>
              <label className="block text-sm font-bold text-stone-500 mb-1">性别</label>
              <select
                value={editForm.gender || ''}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">请选择</option>
                <option value="M">男</option>
                <option value="F">女</option>
                <option value="U">其他</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-500 mb-1">年龄</label>
              <input
                type="number"
                value={editForm.age ?? ''}
                onChange={(e) => handleInputChange('age', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="年龄"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-500 mb-1">饮食偏好</label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={getDietaryGoal() || ''}
                  onChange={(e) => updateDietaryPreference('goal', e.target.value)}
                  className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="饮食目标（如：控糖、减脂等）"
                />
                <input
                  type="text"
                  value={getDietaryRestrictions() || ''}
                  onChange={(e) => updateDietaryPreference('restrictions', e.target.value)}
                  className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="饮食限制（如：忌辣、忌海鲜等）"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-500 mb-1">旅行偏好</label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={getTravelBudget() || ''}
                  onChange={(e) => updateTravelPreference('budget', e.target.value)}
                  className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="预算范围（如：经济型、舒适型等）"
                />
                <input
                  type="text"
                  value={getTravelType() || ''}
                  onChange={(e) => updateTravelPreference('type', e.target.value)}
                  className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="旅行类型（如：文化游、自然风光、美食之旅等）"
                />
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Cards */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h3 className="font-serif font-bold text-xl">数据概览</h3>
            <span className="text-xs text-stone-400">实时更新</span>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-soft border border-stone-50 grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-2xl">
                <MapPin className="w-6 h-6 text-blue-600 mb-2" />
                <div className="text-xs text-stone-500 font-bold uppercase">旅行计划</div>
                <div className="font-serif font-bold text-blue-800 text-lg">
                  {recentTravelPlans.length} 个
                </div>
            </div>
            <div className="bg-green-50 p-4 rounded-2xl">
                <Utensils className="w-6 h-6 text-green-600 mb-2" />
                 <div className="text-xs text-stone-500 font-bold uppercase">营养分析</div>
                 <div className="font-serif font-bold text-green-800 text-lg">
                   {recentNutritionAnalyses.length} 次
                 </div>
            </div>

            <div className="col-span-2 bg-gradient-to-r from-orange-50 to-pink-50 p-4 rounded-2xl flex items-center justify-between">
                <div>
                    <div className="text-xs text-stone-500 font-bold uppercase mb-1">健康目标</div>
                    <div className="font-serif font-bold text-stone-800 text-lg">
                        {getDietaryGoal() || '均衡饮食'}
                    </div>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </section>

        {/* Recent Activities */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-serif font-bold text-xl">最近活动</h3>
            <ChevronRight className="w-5 h-5 text-stone-400" />
          </div>
          <div className="space-y-3">
             {/* 最近的旅行计划 */}
             {recentTravelPlans.map((plan) => (
               <div
                 key={plan.id}
                 onClick={() => handleTravelClick(plan)}
                 className="bg-white p-4 rounded-2xl shadow-soft border border-stone-50 flex gap-4 items-center cursor-pointer hover:bg-stone-50 transition-colors"
               >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                      <div className="font-bold text-stone-700">{plan.plan_title}</div>
                      <div className="text-xs text-stone-400 mt-0.5">
                        {formatDate(plan.created_at)} • {plan.origin} → {plan.destination}
                      </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-300" />
               </div>
             ))}

             {/* 最近的营养分析 */}
             {recentNutritionAnalyses.map((analysis) => {
               let dishes = [];
               try {
                 dishes = JSON.parse(analysis.detected_dishes);
               } catch (e) {
                 dishes = [];
               }

               return (
                 <div
                   key={analysis.id}
                   onClick={() => handleNutritionClick(analysis)}
                   className="bg-white p-4 rounded-2xl shadow-soft border border-stone-50 flex gap-4 items-center cursor-pointer hover:bg-stone-50 transition-colors"
                 >
                    <div className="w-12 h-12 rounded-xl bg-green-50 text-green-500 flex items-center justify-center flex-shrink-0">
                        <Utensils className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <div className="font-bold text-stone-700">{analysis.goal}饮食分析</div>
                        <div className="text-xs text-stone-400 mt-0.5">
                          {formatDate(analysis.created_at)} • {dishes.length > 0 ? dishes.slice(0, 2).join('、') : '营养分析'}
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-stone-300" />
                 </div>
               );
             })}

             {/* 如果没有活动记录 */}
             {recentTravelPlans.length === 0 && recentNutritionAnalyses.length === 0 && (
               <div className="bg-white p-6 rounded-2xl shadow-soft border border-stone-50 text-center">
                 <Clock className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                 <div className="text-stone-500 font-medium">暂无活动记录</div>
                 <div className="text-xs text-stone-400 mt-1">开始使用旅行规划和营养分析功能吧</div>
               </div>
             )}
          </div>
        </section>
      </div>

      {/* 营养分析详情弹窗 */}
      {selectedNutrition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeDetailModal}>
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-serif font-bold">饮食分析详情</h3>
              <button onClick={closeDetailModal} className="p-2 hover:bg-stone-100 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-stone-500 font-bold uppercase mb-1">分析目标</div>
                <div className="text-lg font-bold text-stone-800">{selectedNutrition.goal}</div>
              </div>
              {selectedNutrition.report && (
                <div>
                  <div className="text-sm text-stone-500 font-bold uppercase mb-2">分析报告</div>
                  <div className="bg-stone-50 rounded-xl p-4 text-stone-700 whitespace-pre-wrap text-sm">
                    {selectedNutrition.report}
                  </div>
                </div>
              )}
              <div className="text-xs text-stone-400 mt-4">
                {formatDate(selectedNutrition.created_at)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 旅行计划详情弹窗 */}
      {selectedTravel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeDetailModal}>
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-serif font-bold">旅行计划详情</h3>
              <button onClick={closeDetailModal} className="p-2 hover:bg-stone-100 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-stone-500 font-bold uppercase mb-1">计划标题</div>
                <div className="text-lg font-bold text-stone-800">{selectedTravel.plan_title}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-stone-500 font-bold uppercase mb-1">出发地</div>
                  <div className="font-medium text-stone-700">{selectedTravel.origin}</div>
                </div>
                <div>
                  <div className="text-sm text-stone-500 font-bold uppercase mb-1">目的地</div>
                  <div className="font-medium text-stone-700">{selectedTravel.destination}</div>
                </div>
              </div>
              {selectedTravel.city && (
                <div>
                  <div className="text-sm text-stone-500 font-bold uppercase mb-1">目标城市</div>
                  <div className="font-medium text-stone-700">{selectedTravel.city}</div>
                </div>
              )}
              {selectedTravel.ticket_keyword && (
                <div>
                  <div className="text-sm text-stone-500 font-bold uppercase mb-1">票务关键词</div>
                  <div className="font-medium text-stone-700">{selectedTravel.ticket_keyword}</div>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {selectedTravel.h5_url && (
                  <a
                    href={selectedTravel.h5_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded-xl font-bold text-center hover:bg-blue-600 transition-colors"
                  >
                    查看H5页面
                  </a>
                )}
                {selectedTravel.download_url && (
                  <a
                    href={selectedTravel.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-green-500 text-white py-2 px-4 rounded-xl font-bold text-center hover:bg-green-600 transition-colors"
                  >
                    下载行程单
                  </a>
                )}
              </div>
              <div className="text-xs text-stone-400 mt-4">
                {formatDate(selectedTravel.created_at)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple Icon component needed for red card
const AlertCircle = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
);

export default PersonalCenterPage;