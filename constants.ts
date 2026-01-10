

import { SceneType, TimeOfDay, Mood, Lighting, FocalLength, AspectRatio, HumanInteraction, HumanStyle, ViewAngle, ShotSize, AIModelId, PhotographyDevice, FilterType, ImageSettings } from './types';

// --- PRICING CONSTANTS ---
const VND_RATE = 26000;
const EST_INPUT_IMAGE_TOKENS = 258;
const EST_INPUT_TEXT_TOKENS = 800;
const EST_OUTPUT_TOKENS_PER_IMAGE = 1024;
const EST_VIDEO_INPUT_TOKENS = 2000;
const EST_VIDEO_OUTPUT_TOKENS_PER_SEC = 1500;

// SAFETY MARGIN: Increase all prices by 20% to account for variance/hidden tokens
const SAFETY_BUFFER = 1.2; 

const getPrice = (model: AIModelId) => {
  if (model === 'gemini-3-pro-image-preview') {
    // 2026 PRO PRICING MODEL
    // Base: 2.50 / 10.00 -> Buffered: 3.00 / 12.00
    // NOTE: 4K generation will apply a 2x multiplier on top of this in calculateEstimatedCost
    return { 
      INPUT: 2.50 * SAFETY_BUFFER, 
      OUTPUT: 10.00 * SAFETY_BUFFER 
    };
  } else if (model === 'veo-3.1-fast-generate-preview') {
    // Base: 5.00 / 20.00 -> Buffered: 6.00 / 24.00
    return { 
      INPUT: 5.00 * SAFETY_BUFFER, 
      OUTPUT: 20.00 * SAFETY_BUFFER 
    }; 
  } else {
    // Legacy/Fallback pricing
    return { 
      INPUT: 0.10 * SAFETY_BUFFER, 
      OUTPUT: 0.40 * SAFETY_BUFFER 
    };
  }
};

const calculateEstimatedCost = (settings: ImageSettings) => {
  const isVideo = settings.model === 'veo-3.1-fast-generate-preview';
  const pricing = getPrice(settings.model);
  
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let count = 0;

  if (isVideo) {
    count = 1; 
    totalInputTokens = EST_VIDEO_INPUT_TOKENS;
    totalOutputTokens = (settings.videoDuration || 5) * EST_VIDEO_OUTPUT_TOKENS_PER_SEC;
  } else {
    const viewAngles = settings.viewAngle?.length || 1;
    const focalLengths = settings.focalLength?.length || 1; // Added Focal Length Multiplier
    const countPerAngle = settings.outputCount || 1;
    const deviceCount = settings.photographyDevice?.length || 1; 
    
    // Updated formula: Angles * Lenses * Devices * Variants
    count = viewAngles * focalLengths * countPerAngle * deviceCount;
    
    const singleInput = EST_INPUT_IMAGE_TOKENS + EST_INPUT_TEXT_TOKENS;
    
    // LOGIC UPDATE: High Res (4K) for Pro Model doubles the output "cost" (simulated via token count)
    // This reflects the 2x pricing for premium quality in 2026
    let outputMultiplier = 1;
    if (settings.model === 'gemini-3-pro-image-preview' && settings.isHighRes) {
        outputMultiplier = 2.0; 
    }
    
    const singleOutput = EST_OUTPUT_TOKENS_PER_IMAGE * outputMultiplier;

    totalInputTokens = singleInput * count;
    totalOutputTokens = singleOutput * count;
  }

  const costUSD = ((totalInputTokens / 1_000_000) * pricing.INPUT) + 
                  ((totalOutputTokens / 1_000_000) * pricing.OUTPUT);
  
  const costVND = Math.round(costUSD * VND_RATE);

  return { costVND, count, isVideo, totalInputTokens, totalOutputTokens };
};

// Export consolidated config
export const PRICING_CONFIG = {
  VND_RATE,
  EST_INPUT_IMAGE_TOKENS,
  EST_INPUT_TEXT_TOKENS,
  EST_OUTPUT_TOKENS_PER_IMAGE,
  EST_VIDEO_INPUT_TOKENS,
  EST_VIDEO_OUTPUT_TOKENS_PER_SEC,
  getPrice,
  calculateEstimatedCost
};

export const AI_MODELS: { value: AIModelId; label: string; desc: string }[] = [
  { value: 'gemini-3-pro-image-preview', label: 'Banana 2 (Pro)', desc: 'Gemini 3 Pro. Chi tiết cực cao, hỗ trợ 4K, Smart Prompt.' },
  { value: 'veo-3.1-fast-generate-preview', label: 'Veo Video (FullHD)', desc: 'Tạo video ngắn 5s chất lượng 1080p. Thích hợp cho Social.' },
];

export const FILTERS: { value: FilterType; label: string; desc: string; colorFrom: string; colorTo: string }[] = [
  { value: 'natural', label: 'Tự Nhiên', desc: 'Màu thực tế, cân bằng.', colorFrom: '#a8a29e', colorTo: '#d6d3d1' },
  { value: 'clean', label: 'Trong Sáng', desc: 'Sáng, High-Key, sạch.', colorFrom: '#f5f5f5', colorTo: '#ffffff' },
  { value: 'cinematic', label: 'Điện Ảnh', desc: 'Teal & Orange, đậm đà.', colorFrom: '#0f172a', colorTo: '#c2410c' },
];

// UPDATED SCENES PRESET LIST
export const SCENES: { value: SceneType; label: string }[] = [
  // GROUP 1: TECH / CREATOR GEAR
  { value: 'tech_desk', label: 'Tech Desk / Creator Workspace' },
  { value: 'workbench', label: 'Workbench / Maker Lab' },
  { value: 'acrylic_base', label: 'Acrylic Base Tech Light' },
  { value: 'studio_dark', label: 'Studio Tone Đen / Tech' },
  { value: 'creator_lifestyle', label: 'Creator Desk Lifestyle' },
  
  // GROUP 2: LIFESTYLE / DECOR
  { value: 'shelf_decor', label: 'Kệ Sách Decor / Aesthetic' },
  { value: 'streetwear', label: 'Streetwear / Urban Acc' },
  { value: 'night_light', label: 'Bàn Đầu Giường / Đèn Ngủ' },
  { value: 'handheld_usage', label: 'Trên Tay / Real Usage' },
  { value: 'aesthetic_room', label: 'Góc Phòng Decor Modern' },
  
  // GROUP 3: NATURE / VN CULTURE
  { value: 'balcony_urban', label: 'Ban Công Chung Cư' },
  { value: 'park_city', label: 'Công Viên Thành Phố' },
  { value: 'hoi_an', label: 'Phố Cổ Hội An (Tone Vàng)' },
  { value: 'city_neon', label: 'City Night Neon' },
  { value: 'vintage_street', label: 'Góc Phố Xưa / Tường Rêu' },
  
  // CUSTOM
  { value: 'custom', label: 'Tùy Chỉnh (Nhập mô tả)' },
];

export const TIMES: { value: TimeOfDay; label: string }[] = [
  { value: 'morning', label: 'Buổi Sáng' },
  { value: 'noon', label: 'Buổi Trưa' },
  { value: 'golden_hour', label: 'Giờ Vàng (Golden Hour)' },
  { value: 'night', label: 'Ban Đêm / Ánh Sáng Đèn' },
];

export const MOODS: { value: Mood; label: string }[] = [
  { value: 'minimalist', label: 'Tối Giản' },
  { value: 'luxury', label: 'Sang Trọng' },
  { value: 'cozy', label: 'Ấm Cúng' },
  { value: 'modern', label: 'Hiện Đại' },
  { value: 'lifestyle', label: 'Đời Sống (Lifestyle)' },
  { value: 'premium', label: 'Cao Cấp' },
  { value: 'tech', label: 'Công Nghệ / Industrial' },
];

export const LIGHTING: { value: Lighting; label: string }[] = [
  { value: 'softbox', label: 'Softbox / Ánh Sáng Mềm' },
  { value: 'hard_light', label: 'Ánh Sáng Cứng / Bóng Đổ' },
  { value: 'natural_window', label: 'Ánh Sáng Cửa Sổ' },
  { value: 'backlight', label: 'Ngược Sáng Studio' },
  { value: 'natural_backlight', label: 'Tự Nhiên + Viền Sáng (Rim)' }, 
];

// --- LENSES CONFIGURATION ---

// PROFESSIONAL LENSES (16, 50, 85)
export const PRO_LENSES: { value: FocalLength; label: string; desc: string }[] = [
  { value: '16mm', label: '16mm', desc: 'Rất Rộng. Lấy hết bối cảnh.' },
  { value: '50mm', label: '50mm', desc: 'Chuẩn Mắt Người. Ít méo.' },
  { value: '85mm', label: '85mm', desc: 'Xóa Phông Mù Mịt. Bokeh đẹp.' },
];

// MOBILE LENSES (0.5x, 1x, 3x)
export const MOBILE_LENSES: { value: FocalLength; label: string; desc: string }[] = [
  { value: '16mm', label: '0.5x', desc: 'Góc siêu rộng' },
  { value: '24mm', label: '1x', desc: 'Cam Chính' },
  { value: '85mm', label: '3x', desc: 'Zoom/Chân Dung' },
];

// PHOTO INTERACTIONS
export const INTERACTIONS: { value: HumanInteraction; label: string }[] = [
  { value: 'none', label: 'Không có (Chỉ sản phẩm)' },
  { value: 'hand_holding', label: 'Một Tay Cầm (Basic)' },
  { value: 'presenting', label: 'Hai Tay Đưa Ra (Trân Trọng)' },
  { value: 'using', label: 'Người Đang Sử Dụng (Chung)' },
  { value: 'model_standing', label: 'Mẫu Đứng Cạnh (Fashion)' },
  // NEW ADDITIONS
  { value: 'bag_clip', label: 'Gắn Vào Balo/Túi (Móc Khóa)' },
  { value: 'typing_working', label: 'Tay Gõ Phím/Làm Việc (Tech)' },
  { value: 'turning_on', label: 'Tay Bật Công Tắc (Đèn)' },
  { value: 'flatlay_arranging', label: 'Tay Sắp Xếp Đồ (Flatlay)' },
  { value: 'holding_to_light', label: 'Giơ Lên Trước Ánh Sáng (Soi)' },
];

// VIDEO INTERACTIONS (Motion based)
export const VIDEO_INTERACTIONS: { value: HumanInteraction; label: string }[] = [
  { value: 'none', label: 'Tĩnh vật (Không người)' },
  { value: 'hand_pick_up', label: 'Cầm sản phẩm lên' },
  { value: 'hand_rotate', label: 'Xoay sản phẩm trên tay' },
  { value: 'using_product', label: 'Sử dụng (Lifestyle)' },
  { value: 'unboxing', label: 'Mở hộp / Khui seal' },
  // NEW ADDITIONS
  { value: 'plug_in_turn_on', label: 'Cắm điện / Bật đèn' },
  { value: 'bag_clip_motion', label: 'Thao tác Gắn Balo/Túi' },
  { value: 'satisfying_click', label: 'Bấm nút / ASMR Visual' },
];

export const HUMAN_STYLES: { value: HumanStyle; label: string }[] = [
  { value: 'vietnamese', label: 'Người Việt Nam' },
  { value: 'european', label: 'Người Châu Âu' },
];

export const PHOTOGRAPHY_DEVICES: { value: PhotographyDevice; label: string; desc: string }[] = [
  { value: 'professional', label: 'Máy Ảnh Chuyên Nghiệp', desc: 'Sắc nét, ánh sáng hoàn hảo' },
  { value: 'mobile', label: 'Điện Thoại (Social)', desc: 'Tự nhiên, noise, đời thường' },
];

// REFACTORED VIEW ANGLES - Precise definitions
export const VIEW_ANGLES: { value: ViewAngle; label: string; desc: string }[] = [
  { value: 'eye_level', label: 'Ngang Tầm Mắt', desc: 'Trực diện (0°)' },
  { value: 'high_angle_45', label: 'Góc Cao 45°', desc: 'Nhìn thấy khối' },
  { value: 'low_angle', label: 'Góc Thấp (Hero)', desc: 'Từ dưới lên (Hùng vĩ)' },
  { value: 'top_down', label: 'Flatlay 90°', desc: 'Từ đỉnh xuống (Vuông góc)' },
];

// REFACTORED SHOT SIZES - Merged Close-up & Macro
export const SHOT_SIZES: { value: ShotSize; label: string; desc: string }[] = [
  { value: 'wide', label: 'Góc Rộng (Wide)', desc: 'SP Nhỏ (20%). Môi trường bao la.' },
  { value: 'full', label: 'Toàn Cảnh (Full)', desc: 'SP vừa khung. Thấy trọn vẹn.' },
  { value: 'medium', label: 'Trung Cận (Medium)', desc: 'SP Lớn (80%). Tập trung hình khối.' },
  { value: 'close_up', label: 'Đặc Tả (Macro)', desc: 'Tràn khung (100%+). Soi chi tiết/Texture.' },
];

export const VIDEO_SHOT_SIZES: { value: ShotSize; label: string; desc: string }[] = [
  { value: 'full', label: 'Toàn Cảnh (Full)', desc: 'Thấy hết đối tượng và môi trường' },
  { value: 'medium', label: 'Trung Cận (Medium)', desc: 'Nửa người hoặc bao quát sản phẩm' },
  { value: 'close_up', label: 'Cận Cảnh / Đặc Tả', desc: 'Tập trung vào sản phẩm' },
];

export const OUTPUT_COUNTS: number[] = [1, 2, 3, 4];

// UPDATED ASPECT RATIOS for UI Filtering
// Group 'portrait' = Dọc
// Group 'landscape' = Ngang
export const ASPECT_RATIOS: { value: AspectRatio; label: string; group: 'portrait' | 'landscape' | 'both' }[] = [
  { value: '1:1', label: '1:1 (Vuông)', group: 'both' },
  { value: '2:3', label: '2:3 (Dọc)', group: 'portrait' },
  { value: '3:2', label: '3:2 (Ngang)', group: 'landscape' },
  { value: '9:16', label: '9:16 (Story)', group: 'portrait' },
  { value: '16:9', label: '16:9 (Youtube)', group: 'landscape' },
];

export const VIDEO_ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: '9:16', label: '9:16 (TikTok/Reels)' },
  { value: '16:9', label: '16:9 (YouTube)' },
  { value: '1:1', label: '1:1 (Post)' },
];
