import time
import numpy as np
import io
from PIL import Image
from paddleocr import PaddleOCR
import re

# ⚠️ 强制使用轻量级 PP-OCRv4 模型
# v4 是目前速度和精度平衡最好的轻量级版本
ocr = PaddleOCR(
    lang="ch",
    ocr_version='PP-OCRv4',  # 显式指定使用 v4
    use_angle_cls=False,  # 菜单识别不需要角度矫正，关掉提速
    enable_mkldnn=True,  # Intel CPU 必须开启
    rec_batch_num=10
)


class MenuCleaner:
    """菜单数据清洗专家：处理价格、电话、系统噪声和去重"""

    # 常见的非菜名干扰词
    NOISE_KEYWORDS = {
        '菜单', '地址', '电话', 'TEL', '详情', '二维码', '维码', '扫码', '点餐',
        '收银', '合计', '人民币', '单价', '数量', '金额', '日期', '欢迎光临',
        '谢谢惠顾', '页码', 'NO.', '桌号', '人数', '服务员'
    }

    # 1. 价格正则：匹配 32, 32.00, 32元, ¥32, $32, 32/例 等
    PRICE_PATTERN = re.compile(
        r'(\d+\.?\d*)\s*(元|/份|/例|/位|/斤|/个|/串|/打|/听|/瓶)?|'
        r'([¥$￥])\s*(\d+\.?\d*)'
    )

    # 2. 纯数字或干扰性编号正则
    DIGIT_PATTERN = re.compile(r'^[0-9.\-/]+$')

    # 3. 电话/长数字串正则
    PHONE_PATTERN = re.compile(r'[\d-]{7,}')

    @classmethod
    def clean(cls, raw_texts):
        cleaned_dishes = []
        seen = set()

        for text in raw_texts:
            # A. 基础处理
            text = text.strip().replace(" ", "")
            if not text: continue

            # B. 关键词黑名单过滤 (语义层面)
            if any(noise in text for noise in cls.NOISE_KEYWORDS):
                continue

            # C. 价格与数字剥离
            # 有些 OCR 会把菜名和价格识别在一起，如 "品烩大肠26元" -> "品烩大肠"
            text = cls.PRICE_PATTERN.sub('', text)

            # D. 再次清理多余符号
            text = re.sub(r'[^\w\u4e00-\u9fa5]', '', text)  # 只保留汉字、字母、数字

            # E. 鲁棒性长度与类型校验
            if cls.DIGIT_PATTERN.match(text) or cls.PHONE_PATTERN.search(text):
                continue

            # 菜名通常在 2-15 字之间（考虑到某些菜名较长如“法式红酒烩牛腩”）
            if 2 <= len(text) <= 15:
                # F. 最终去重 (保持顺序)
                if text not in seen:
                    cleaned_dishes.append(text)
                    seen.add(text)

        return cleaned_dishes


def ocr_image_bytes(image_bytes: bytes) -> list[str]:
    """
    提供外部调用的 OCR 主函数
    """
    start_time = time.time()

    try:
        # 1. 图像预处理
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        # 如果图片非常大，缩放到 1000px 左右可以平衡精度和 73s 的耗时问题
        if max(img.size) > 1500:
            img.thumbnail((1200, 1200))
        img_np = np.array(img)

        # 2. 识别
        result = ocr.ocr(img_np)

        # 3. 递归提取文字（适配 list 和 dict 两种可能的返回格式）
        raw_texts = []
        if result:
            # 兼容处理：有些版本 result[0] 是 dict
            first_layer = result[0] if isinstance(result, list) else result
            if isinstance(first_layer, dict) and 'rec_texts' in first_layer:
                raw_texts = first_layer['rec_texts']
            else:
                # 标准 PaddleOCR list 格式提取
                for line in (result if isinstance(result, list) else []):
                    if not line: continue
                    for box in line:
                        if isinstance(box, list) and len(box) > 1:
                            raw_texts.append(str(box[1][0]))

        # 4. 执行鲁棒性清洗
        final_dishes = MenuCleaner.clean(raw_texts)

        print(
            f"--- [OCR核心] 耗时: {time.time() - start_time:.2f}s | 原始行: {len(raw_texts)} | 清洗后: {len(final_dishes)} ---")
        return final_dishes

    except Exception as e:
        print(f"OCR 过程出错: {str(e)}")
        return []