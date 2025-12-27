
export interface ProcessedImage {
  id: string;
  originalUrl: string;
  processedUrl?: string;
  timestamp: number;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  settingsUsed?: ImageSettings;
  isVideo?: boolean; // New flag for Video support
  error?: string;
  // Cost Tracking
  costData?: {
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    estimatedCost: number;
    
    actualInputTokens: number;
    actualOutputTokens: number;
    actualCost: number;
    
    variancePercent: number; // Chênh lệch %
  };
}

export interface ProjectStats {
  totalImagesGenerated: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
}

// Added 'veo-3.1-fast-generate-preview' for Video
export type AIModelId = 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview' | 'veo-3.1-fast-generate-preview';

export type AspectRatio = '1:1' | '4:5' | '3:4' | '2:3' | '9:16' | '16:9';

// Added Vietnamese Scenes
export type SceneType = 
  | 'studio' | 'kitchen' | 'living_room' | 'office' | 'nature' | 'retail_shelf' 
  | 'vn_tet' | 'vn_coffee' | 'vn_lotus' | 'vn_bamboo' | 'vn_indochine' // New
  | 'custom';

export type TimeOfDay = 'morning' | 'noon' | 'golden_hour' | 'night';
export type Mood = 'minimalist' | 'luxury' | 'cozy' | 'modern' | 'lifestyle' | 'premium' | 'tech';
// Updated Lighting
export type Lighting = 'softbox' | 'hard_light' | 'natural_window' | 'backlight' | 'natural_backlight';

// Updated Focal Lengths for Mobile support (16mm=0.5x, 24mm=1x, 120mm=5x)
export type FocalLength = '16mm' | '24mm' | '35mm' | '50mm' | '85mm' | '100mm' | '120mm'; 

// REFACTORED: Removed 'macro_detail' from Angle, added 'low_angle' and 'top_down'
export type ViewAngle = 'eye_level' | 'high_angle_45' | 'low_angle' | 'top_down';

// REFACTORED: MERGED 'extreme_close_up' INTO 'close_up'
export type ShotSize = 'wide' | 'full' | 'medium' | 'close_up';

// Human Interaction can be string to support both Photo and Video descriptions
export type HumanInteraction = string; 

// Updated Human Styles
export type HumanStyle = 'vietnamese' | 'european';

// New Photography Device Type
export type PhotographyDevice = 'professional' | 'mobile';

// New Filter Type
export type FilterType = 'cinematic' | 'clean' | 'natural';

export interface ImageSettings {
  model: AIModelId; 
  productDescription?: string;
  scene: SceneType;
  customScenePrompt?: string;
  isRemoveBackground: boolean;
  isHighRes: boolean; 
  timeOfDay: TimeOfDay;
  mood: Mood;
  lighting: Lighting;
  focalLength: FocalLength;
  viewAngle: ViewAngle[]; 
  shotSize: ShotSize;
  humanInteraction: HumanInteraction;
  humanStyle: HumanStyle;
  photographyDevice: PhotographyDevice[]; // UPDATED: Changed from single string to array
  outputCount: number;
  aspectRatio: AspectRatio;
  watermark?: {
    enabled: boolean;
    url: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
    scale: number;
  };
  // VIDEO SPECIFIC SETTINGS
  videoPrompt?: string;
  videoDuration?: number; // seconds
  hasVoice?: boolean;
  // NEW FILTER SETTING
  filter: FilterType;
}

export const DEFAULT_SETTINGS: ImageSettings = {
  model: 'gemini-2.5-flash-image', 
  productDescription: '',
  scene: 'studio',
  isRemoveBackground: false,
  isHighRes: false,
  timeOfDay: 'noon',
  mood: 'modern',
  lighting: 'softbox',
  focalLength: '50mm', // Updated to match PRO_LENSES default (Standard)
  viewAngle: ['eye_level'],
  shotSize: 'full',
  humanInteraction: 'none',
  humanStyle: 'vietnamese',
  photographyDevice: ['professional'], // UPDATED: Default is array
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
