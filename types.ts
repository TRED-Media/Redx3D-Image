
export interface ProcessedImage {
  id: string;
  originalUrl: string;
  processedUrl?: string;
  timestamp: number;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  settingsUsed?: ImageSettings;
  isVideo?: boolean; 
  error?: string;
  seed?: number; 
  // Cost Tracking
  costData?: {
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    estimatedCost: number;
    
    actualInputTokens: number;
    actualOutputTokens: number;
    actualCost: number;
    
    variancePercent: number; 
  };
}

export interface ProjectStats {
  totalImagesGenerated: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  // New Breakdown
  modelCounts?: {
    'gemini-2.5-flash-image': number;
    'gemini-3-pro-image-preview': number;
    'veo-3.1-fast-generate-preview': number;
  };
}

export type AIModelId = 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview' | 'veo-3.1-fast-generate-preview';

export type AspectRatio = '1:1' | '4:5' | '3:4' | '2:3' | '9:16' | '16:9';

export type SceneType = 
  // Tech / Creator Gear
  | 'tech_desk' | 'workbench' | 'acrylic_base' | 'studio_dark' | 'creator_lifestyle'
  // Lifestyle / Decor
  | 'shelf_decor' | 'streetwear' | 'night_light' | 'handheld_usage' | 'aesthetic_room'
  // Nature / Cultural VN
  | 'balcony_urban' | 'park_city' | 'hoi_an' | 'city_neon' | 'vintage_street'
  // Custom
  | 'custom';

export type TimeOfDay = 'morning' | 'noon' | 'golden_hour' | 'night';
export type Mood = 'minimalist' | 'luxury' | 'cozy' | 'modern' | 'lifestyle' | 'premium' | 'tech';
export type Lighting = 'softbox' | 'hard_light' | 'natural_window' | 'backlight' | 'natural_backlight';

export type FocalLength = '16mm' | '24mm' | '35mm' | '50mm' | '85mm' | '100mm' | '120mm'; 

export type ViewAngle = 'eye_level' | 'high_angle_45' | 'low_angle' | 'top_down';

export type ShotSize = 'wide' | 'full' | 'medium' | 'close_up';

export type HumanInteraction = string; 

export type HumanStyle = 'vietnamese' | 'european';

export type PhotographyDevice = 'professional' | 'mobile';

export type FilterType = 'cinematic' | 'clean' | 'natural';

export interface ImageSettings {
  model: AIModelId; 
  productDescription?: string;
  scene: SceneType;
  customScenePrompt?: string;
  isRemoveBackground: boolean;
  isHighRes: boolean; 
  isSyncBackground: boolean;
  isColorSync: boolean; // NEW: Controls White Balance consistency across batch
  
  timeOfDay: TimeOfDay;
  mood: Mood;
  lighting: Lighting;
  
  focalLength: FocalLength[]; 
  viewAngle: ViewAngle[]; 
  shotSize: ShotSize;
  humanInteraction: HumanInteraction;
  humanStyle: HumanStyle;
  photographyDevice: PhotographyDevice[];
  outputCount: number;
  aspectRatio: AspectRatio;
  watermark?: {
    enabled: boolean;
    url: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
    scale: number;
  };
  videoPrompt?: string;
  videoDuration?: number; 
  hasVoice?: boolean;
  filter: FilterType;
}

export const DEFAULT_SETTINGS: ImageSettings = {
  model: 'gemini-2.5-flash-image', 
  productDescription: '',
  scene: 'tech_desk', 
  isRemoveBackground: false,
  isHighRes: false,
  isSyncBackground: true, 
  isColorSync: true, // Default to true for best results
  timeOfDay: 'noon',
  mood: 'modern',
  lighting: 'softbox',
  focalLength: ['50mm'], 
  viewAngle: ['eye_level'],
  shotSize: 'full',
  humanInteraction: 'none',
  humanStyle: 'vietnamese',
  photographyDevice: ['professional'],
  outputCount: 1,
  aspectRatio: '1:1',
  watermark: {
    enabled: false,
    url: '',
    position: 'bottom-right',
    opacity: 0.8,
    scale: 0.2
  },
  videoPrompt: '',
  videoDuration: 5,
  hasVoice: false,
  filter: 'natural'
};
