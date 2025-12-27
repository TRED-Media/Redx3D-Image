
import { SceneType, TimeOfDay, Mood, Lighting, FocalLength, AspectRatio, HumanInteraction, HumanStyle, ViewAngle, ShotSize, AIModelId, PhotographyDevice, FilterType, ImageSettings } from './types';

// --- PRICING CONSTANTS ---
const VND_RATE = 26000;
const EST_INPUT_IMAGE_TOKENS = 258;
const EST_INPUT_TEXT_TOKENS = 800;
const EST_OUTPUT_TOKENS_PER_IMAGE = 1024;
const EST_VIDEO_INPUT_TOKENS = 2000;
const EST_VIDEO_OUTPUT_TOKENS_PER_SEC = 1500;

const getPrice = (model: AIModelId) => {
  if (model === 'gemini-3-pro-image-preview') {
    return { INPUT: 2.50, OUTPUT: 10.00 };
  } else if (model === 'veo-3.1-fast-generate-preview') {
    return { INPUT: 5.00, OUTPUT: 20.00 }; 
  } else {
    return { INPUT: 0.10, OUTPUT: 0.40 };
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
    const countPerAngle = settings.outputCount || 1;
    const deviceCount = settings.photographyDevice?.length || 1; // Factor in devices
    count = viewAngles * countPerAngle * deviceCount;
    
    const singleInput = EST_INPUT_IMAGE_TOKENS + EST_INPUT_TEXT_TOKENS;
    const singleOutput = EST_OUTPUT_TOKENS_PER_IMAGE;

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
  { value: 'gemini-2.5-flash-image', label: 'Nano Banana', desc: 'Gemini 2.5 Flash. Tốc độ cao, rẻ, tốt cho test.' },
  { value: 'gemini-3-pro-image-preview', label: 'Banana 2 (Pro)', desc: 'Gemini 3 Pro. Chi tiết cực cao, hỗ trợ 4K, Smart Prompt.' },
  { value: 'veo-3.1-fast-generate-preview', label: 'Veo Video (FullHD)', desc: 'Tạo video ngắn 5s chất lượng 1080p. Thích hợp cho Social.' },
];

export const FILTERS: { value: FilterType; label: string; desc: string; colorFrom: string; colorTo: string }[] = [
  { value: 'natural', label: 'Tự Nhiên', desc: 'Màu thực tế, cân bằng.', colorFrom: '#a8a29e', colorTo: '#d6d3d1' },
  { value: 'clean', label: 'Trong Sáng', desc: 'Sáng, High-Key, sạch.', colorFrom: '#f5f5f5', colorTo: '#ffffff' },
  { value: 'cinematic', label: 'Điện Ảnh', desc: 'Teal & Orange, đậm đà.', colorFrom: '#0f172a', colorTo: '#c2410c' },
];

export const SCENES: { value: SceneType; label: string }[] = [
  { value: 'studio', label: 'Studio (Sạch sẽ)' },
  { value: 'vn_tet', label: 'Tết Cổ Truyền Việt Nam' },
  { value: 'vn_coffee', label: 'Cà Phê Phố Cổ / Vỉa Hè' },
  { value: 'vn_lotus', label: 'Hồ Sen / Thiên Nhiên VN' },
  { value: 'vn_bamboo', label: 'Tre Trúc / Làng Quê' },
  { value: 'vn_indochine', label: 'Nội Thất Indochine (Đông Dương)' },
  { value: 'living_room', label: 'Phòng Khách Hiện Đại' },
  { value: 'kitchen', label: 'Nhà Bếp Sang Trọng' },
  { value: 'office', label: 'Bàn Làm Việc / Office' },
  { value: 'nature', label: 'Thiên Nhiên / Rừng' },
  { value: 'retail_shelf', label: 'Kệ Trưng Bày' },
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
// Updated descriptions to emphasize optical effects
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
  { value: 'hand_holding', label: 'Một Tay Cầm (Cận Cảnh Tay)' },
  { value: 'presenting', label: 'Hai Tay Đưa Ra (Trân Trọng)' },
  { value: 'using', label: 'Người Đang Sử Dụng (Thấy Người)' },
  { value: 'model_standing', label: 'Mẫu Đứng Cạnh (Thấy Người)' },
];

// VIDEO INTERACTIONS (Motion based)
export const VIDEO_INTERACTIONS: { value: HumanInteraction; label: string }[] = [
  { value: 'none', label: 'Tĩnh vật (Không người)' },
  { value: 'hand_pick_up', label: 'Cầm sản phẩm lên' },
  { value: 'hand_rotate', label: 'Xoay sản phẩm trên tay' },
  { value: 'using_product', label: 'Sử dụng sản phẩm (Lifestyle)' },
  { value: 'unboxing', label: 'Mở hộp / Khui seal' },
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
  { value: 'wide', label: 'Góc Rộng (Wide)', desc: 'Sản phẩm nhỏ. Nhấn mạnh không gian.' },
  { value: 'full', label: 'Toàn Cảnh (Full)', desc: 'Sản phẩm vừa khung hình.' },
  { value: 'medium', label: 'Trung Cận (Medium)', desc: 'Sản phẩm chiếm 60% khung.' },
  { value: 'close_up', label: 'Đặc Tả / Cận Cảnh', desc: 'Sản phẩm RẤT TO. Soi rõ chất liệu.' },
];

export const VIDEO_SHOT_SIZES: { value: ShotSize; label: string; desc: string }[] = [
  { value: 'full', label: 'Toàn Cảnh (Full)', desc: 'Thấy hết đối tượng và môi trường' },
  { value: 'medium', label: 'Trung Cận (Medium)', desc: 'Nửa người hoặc bao quát sản phẩm' },
  { value: 'close_up', label: 'Cận Cảnh / Đặc Tả', desc: 'Tập trung vào sản phẩm' },
];

export const OUTPUT_COUNTS: number[] = [1, 2, 3, 4];

export const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: '1:1', label: '1:1 Vuông' },
  { value: '4:5', label: '4:5 Dọc' },
  { value: '3:4', label: '3:4 Chuẩn' },
  { value: '2:3', label: '2:3 Cổ Điển' },
  { value: '9:16', label: '9:16 Story' },
  { value: '16:9', label: '16:9 Ngang' },
];

export const VIDEO_ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: '9:16', label: '9:16 (TikTok/Reels)' },
  { value: '16:9', label: '16:9 (YouTube)' },
  { value: '1:1', label: '1:1 (Post)' },
];
