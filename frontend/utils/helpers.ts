// 工具函数
import { VALIDATION_RULES, FILE_CONSTRAINTS } from './constants';

// 表单验证工具
export const validateEmail = (email: string): boolean => {
  return VALIDATION_RULES.EMAIL.test(email);
};

export const validatePhone = (phone: string): boolean => {
  return VALIDATION_RULES.PHONE.test(phone);
};

export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
    return { isValid: false, message: `密码长度至少${VALIDATION_RULES.PASSWORD.MIN_LENGTH}位` };
  }
  
  if (password.length > VALIDATION_RULES.PASSWORD.MAX_LENGTH) {
    return { isValid: false, message: `密码长度不能超过${VALIDATION_RULES.PASSWORD.MAX_LENGTH}位` };
  }
  
  if (!VALIDATION_RULES.PASSWORD.PATTERN.test(password)) {
    return { isValid: false, message: '密码必须包含字母和数字' };
  }
  
  return { isValid: true };
};

export const validateUsername = (username: string): { isValid: boolean; message?: string } => {
  if (username.length < VALIDATION_RULES.USERNAME.MIN_LENGTH) {
    return { isValid: false, message: `用户名长度至少${VALIDATION_RULES.USERNAME.MIN_LENGTH}位` };
  }
  
  if (username.length > VALIDATION_RULES.USERNAME.MAX_LENGTH) {
    return { isValid: false, message: `用户名长度不能超过${VALIDATION_RULES.USERNAME.MAX_LENGTH}位` };
  }
  
  if (!VALIDATION_RULES.USERNAME.PATTERN.test(username)) {
    return { isValid: false, message: '用户名只能包含字母、数字、下划线和中文' };
  }
  
  return { isValid: true };
};

// 文件处理工具
export const validateImageFile = (file: File): { isValid: boolean; message?: string } => {
  if (file.size > FILE_CONSTRAINTS.IMAGE.MAX_SIZE) {
    return { isValid: false, message: '图片大小不能超过10MB' };
  }
  
  if (!FILE_CONSTRAINTS.IMAGE.ALLOWED_TYPES.includes(file.type)) {
    return { isValid: false, message: '只支持JPG、PNG、WebP格式的图片' };
  }
  
  return { isValid: true };
};

export const validateAudioFile = (file: File): { isValid: boolean; message?: string } => {
  if (file.size > FILE_CONSTRAINTS.AUDIO.MAX_SIZE) {
    return { isValid: false, message: '音频文件大小不能超过50MB' };
  }
  
  if (!FILE_CONSTRAINTS.AUDIO.ALLOWED_TYPES.includes(file.type)) {
    return { isValid: false, message: '只支持WAV、MP3、WebM格式的音频文件' };
  }
  
  return { isValid: true };
};

// 图片处理工具
export const compressImage = (file: File, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const { MAX_WIDTH, MAX_HEIGHT } = FILE_CONSTRAINTS.IMAGE;
      let { width, height } = img;
      
      // 计算压缩后的尺寸
      if (width > height) {
        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = (width * MAX_HEIGHT) / height;
          height = MAX_HEIGHT;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx?.drawImage(img, 0, 0, width, height);
      
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };
    
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = URL.createObjectURL(file);
  });
};

export const base64ToFile = (base64: string, filename: string = 'image.jpg'): File => {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
};

// 时间处理工具
export const formatDate = (date: string | Date, format: 'date' | 'datetime' | 'time' = 'datetime'): string => {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return '无效日期';
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  switch (format) {
    case 'date':
      return `${year}-${month}-${day}`;
    case 'time':
      return `${hours}:${minutes}`;
    case 'datetime':
    default:
      return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
};

export const getRelativeTime = (date: string | Date): string => {
  const now = new Date();
  const target = new Date(date);
  const diff = now.getTime() - target.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小时前`;
  } else if (minutes > 0) {
    return `${minutes}分钟前`;
  } else {
    return '刚刚';
  }
};

// 字符串处理工具
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const generateThreadId = (): string => {
  return `thread-${Date.now()}-${generateId()}`;
};

// 数字处理工具
export const formatNumber = (num: number, decimals: number = 0): string => {
  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// URL处理工具
export const buildUrl = (baseUrl: string, params: Record<string, any>): string => {
  const url = new URL(baseUrl);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });
  
  return url.toString();
};

// 设备检测工具
export const getDeviceInfo = () => {
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/i.test(userAgent);
  const isDesktop = !isMobile && !isTablet;
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    userAgent,
    platform: navigator.platform,
  };
};

// 本地存储工具
export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch {
      return defaultValue || null;
    }
  },
  
  set: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('存储失败:', error);
    }
  },
  
  remove: (key: string): void => {
    localStorage.removeItem(key);
  },
  
  clear: (): void => {
    localStorage.clear();
  },
};

// 防抖和节流工具
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};