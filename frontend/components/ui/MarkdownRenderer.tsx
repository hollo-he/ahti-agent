import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  // 营养报告专用的Markdown渲染函数
  const renderNutritionMarkdown = (text: string) => {
    // 处理标题层级
    text = text.replace(/^####\s*(.*?)$/gm, '<h4 class="text-base font-bold text-stone-800 mb-3 mt-4 border-b border-stone-200 pb-1">$1</h4>');
    text = text.replace(/^###\s*(.*?)$/gm, '<h3 class="text-lg font-bold text-stone-800 mb-3 mt-5">$1</h3>');
    text = text.replace(/^##\s*(.*?)$/gm, '<h2 class="text-xl font-bold text-stone-800 mb-4 mt-6">$1</h2>');
    text = text.replace(/^#\s*(.*?)$/gm, '<h1 class="text-2xl font-bold text-stone-800 mb-4 mt-6">$1</h1>');
    
    // 处理粗体 **text** - 用于强调重要信息
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-stone-900">$1</strong>');
    
    // 处理斜体 *text*
    text = text.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em class="italic text-stone-700">$1</em>');
    
    // 处理数字列表 1. 2. 3.
    text = text.replace(/^(\d+)\.\s*\*\*(.*?)\*\*/gm, '<div class="mb-3"><span class="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">$1</span><strong class="font-bold text-stone-900">$2</strong></div>');
    text = text.replace(/^(\d+)\.\s*(.*?)$/gm, '<div class="mb-2 flex items-start"><span class="inline-flex items-center justify-center w-5 h-5 bg-stone-100 text-stone-600 text-xs font-bold rounded-full mr-2 mt-0.5 flex-shrink-0">$1</span><span>$2</span></div>');
    
    // 处理无序列表 - 
    text = text.replace(/^-\s*\*\*(.*?)\*\*/gm, '<div class="mb-2 flex items-start"><span class="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span><strong class="font-bold text-stone-900">$1</strong></div>');
    text = text.replace(/^-\s*(.*?)$/gm, '<div class="mb-2 flex items-start"><span class="w-1.5 h-1.5 bg-stone-400 rounded-full mr-3 mt-2 flex-shrink-0"></span><span>$1</span></div>');
    
    // 处理引用 > text - 用于重要提示
    text = text.replace(/^>\s*(.*?)$/gm, '<div class="border-l-4 border-amber-400 bg-amber-50 pl-4 py-2 my-3 rounded-r-lg"><span class="text-amber-800 font-medium">💡 $1</span></div>');
    
    // 处理表格标记（简化版）
    text = text.replace(/\|\s*(.*?)\s*\|/g, '<span class="inline-block bg-stone-100 px-2 py-1 rounded text-sm mr-2 mb-1">$1</span>');
    
    // 处理特殊营养术语高亮
    text = text.replace(/(GI|升糖指数|胰岛素|血糖|控糖|低脂|高纤维|蛋白质|维生素|矿物质|膳食纤维)/g, '<span class="bg-green-100 text-green-800 px-1 py-0.5 rounded text-xs font-medium">$1</span>');
    
    // 处理食物名称（中文食物名）
    text = text.replace(/(糙米|藜麦|全麦|鲈鱼|豆腐|鸡胸肉|西兰花|菠菜|黄瓜|牛油果|橄榄油|绿茶)/g, '<span class="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs">$1</span>');
    
    // 处理段落和换行
    text = text.replace(/\n\n+/g, '</p><p class="mb-3 text-stone-700 leading-relaxed">');
    text = text.replace(/\n/g, '<br>');
    
    // 包装在段落中（如果不是已经有HTML标签的话）
    if (!text.includes('<h') && !text.includes('<div') && text.trim()) {
      text = `<p class="mb-3 text-stone-700 leading-relaxed">${text}</p>`;
    }
    
    return text;
  };

  return (
    <div 
      className={`nutrition-report ${className}`}
      dangerouslySetInnerHTML={{ 
        __html: renderNutritionMarkdown(content) 
      }}
      style={{
        // 自定义样式
        lineHeight: '1.6'
      }}
    />
  );
};

export default MarkdownRenderer;