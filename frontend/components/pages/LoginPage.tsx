import React, { useState } from 'react';
import { ArrowLeft, Phone, MessageCircle } from 'lucide-react';
import { authService } from '@/services';

interface LoginProps {
  onBack: () => void;
  onLoginSuccess: (token: string) => void;
}

const LoginPage: React.FC<LoginProps> = ({ onBack, onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    phone: '',
    verificationCode: ''
  });
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  // 发送验证码
  const sendVerificationCode = async () => {
    if (!formData.phone || formData.phone.length !== 11) {
      setError('请输入正确的11位手机号');
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      await authService.sendSMS({ phone: formData.phone });

      // 开始倒计时
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message || '发送验证码失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.phone || formData.phone.length !== 11) {
      setError('请输入正确的11位手机号');
      return;
    }

    if (!formData.verificationCode) {
      setError('请输入验证码');
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      const response = await authService.phoneLogin({
        phone: formData.phone,
        code: formData.verificationCode
      });
      onLoginSuccess(response.token);
    } catch (err: any) {
      setError(err.message || '登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-[#fdfbf7] text-stone-800 font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 pt-6 flex items-center gap-3 z-10">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-stone-100 text-stone-600 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-serif font-bold text-stone-800">
          手机号登录
        </h1>
      </div>

      <div className="flex-1 flex flex-col justify-center p-6">
        <div className="bg-white rounded-3xl p-8 shadow-soft border border-stone-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-8 h-8 text-stone-600" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-stone-800">
              手机号快速登录
            </h2>
            <p className="text-stone-400 mt-2">
              输入手机号和验证码登录
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-stone-600 text-sm font-medium mb-2">手机号</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="w-5 h-5 text-stone-400" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  maxLength={11}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors"
                  placeholder="请输入手机号"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-stone-600 text-sm font-medium mb-2">验证码</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MessageCircle className="w-5 h-5 text-stone-400" />
                </div>
                <input
                  type="text"
                  name="verificationCode"
                  value={formData.verificationCode}
                  onChange={handleChange}
                  maxLength={6}
                  required
                  className="w-full pl-10 pr-32 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors"
                  placeholder="请输入验证码"
                />
                <button
                  type="button"
                  onClick={sendVerificationCode}
                  disabled={isLoading || countdown > 0 || !formData.phone || formData.phone.length !== 11}
                  className={`absolute inset-y-0 right-0 pr-3 flex items-center px-4 rounded-r-xl transition-colors ${
                    countdown > 0 || isLoading || !formData.phone || formData.phone.length !== 11
                      ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
                      : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                  }`}
                >
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-orange-400 to-pink-500 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  登录中...
                </span>
              ) : '登录'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;