import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  // 营养报告专用的Markdown渲染函数
  const renderNutritionMarkdown = (text: string) => {
    if (!text) return '';
    
    // 1. 标准化换行符
    text = text.replace(/\r\n/g, '\n');

    // 处理标题层级 (支持 # Title 和 #Title)
    text = text.replace(/^####\s*(.*?)$/gm, '<h4 class="text-base font-bold text-gray-800 mb-2 mt-3 border-b border-gray-100 pb-1">$1</h4>');
    text = text.replace(/^###\s*(.*?)$/gm, '<h3 class="text-lg font-bold text-gray-800 mb-3 mt-4">$1</h3>');
    text = text.replace(/^##\s*(.*?)$/gm, '<h2 class="text-xl font-bold text-gray-800 mb-4 mt-5">$1</h2>');
    text = text.replace(/^#\s*(.*?)$/gm, '<h1 class="text-2xl font-bold text-gray-800 mb-4 mt-6">$1</h1>');
    
    // 处理粗体 **text** (非贪婪匹配)
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
    
    // 处理斜体 *text*
    text = text.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em class="italic text-gray-700">$1</em>');
    
    // 处理数字列表 1. 2. 3.
    text = text.replace(/^(\d+)\.\s*\*\*(.*?)\*\*/gm, '<div class="mb-2 flex items-start"><span class="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2 mt-0.5 flex-shrink-0">$1</span><strong class="font-bold text-gray-900">$2</strong></div>');
    text = text.replace(/^(\d+)\.\s*(.*?)$/gm, '<div class="mb-2 flex items-start"><span class="inline-flex items-center justify-center w-5 h-5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full mr-2 mt-0.5 flex-shrink-0">$1</span><span>$2</span></div>');
    
    // 处理无序列表 - (支持 - Item 和 -Item)
    text = text.replace(/^-\s*\*\*(.*?)\*\*/gm, '<div class="mb-2 flex items-start"><span class="w-1.5 h-1.5 bg-green-500 rounded-full mr-2.5 mt-2 flex-shrink-0"></span><strong class="font-bold text-gray-900">$1</strong></div>');
    text = text.replace(/^-\s*(.*?)$/gm, '<div class="mb-2 flex items-start"><span class="w-1.5 h-1.5 bg-gray-300 rounded-full mr-2.5 mt-2 flex-shrink-0"></span><span>$1</span></div>');
    
    // 处理引用 > text
    text = text.replace(/^>\s*(.*?)$/gm, '<div class="border-l-4 border-amber-400 bg-amber-50 pl-4 py-2 my-3 rounded-r-lg"><span class="text-amber-800 font-medium">💡 $1</span></div>');
    
    // 处理表格标记（简化版）
    text = text.replace(/\|\s*(.*?)\s*\|/g, '<span class="inline-block bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-sm mr-2 mb-1">$1</span>');
    
    // 处理特殊营养术语高亮
    text = text.replace(/(GI|升糖指数|胰岛素|血糖|控糖|低脂|高纤维|蛋白质|维生素|矿物质|膳食纤维|碳水化合物)/g, '<span class="bg-green-50 text-green-700 px-1 rounded text-xs font-medium">$1</span>');
    
    // 处理段落和换行
    // 先把列表和标题保护起来，避免被换行符破坏（简单的处理方式：只处理未被标签包裹的换行）
    // 但由于我们是顺序替换，现在 text 已经包含 HTML 标签。
    // 简单的策略：将连续换行转换为段落，单个换行转换为 <br>
    
    // 移除行首尾空白
    text = text.trim();
    
    // 将 \n 转换为 <br>，但要注意不要破坏 HTML 结构
    // 这里简化处理：如果行不包含 HTML 标签，则包裹在 p 中
    // 或者更简单：直接用 line-height 控制，只把双换行转为间距
    
    text = text.replace(/\n\n+/g, '<div class="h-3"></div>'); // 段间距
    text = text.replace(/\n/g, '<br />');
    
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