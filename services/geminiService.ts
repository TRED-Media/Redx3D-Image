
import { GoogleGenAI } from "@google/genai";
import { ImageSettings, ViewAngle, PhotographyDevice, FocalLength } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY not found.");
  }
  return new GoogleGenAI({ apiKey });
};

const prepareImagePart = (base64String: string) => {
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
  return {
    inlineData: {
      data: base64Data,
      mimeType: "image/jpeg",
    },
  };
};

interface GenResult {
  imageUrl: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  isVideo?: boolean;
  seed?: number;
}

// --- HELPER: MASTER COLOR PROFILE GENERATOR ---
const getMasterColorProfile = (settings: ImageSettings): string => {
   if (!settings.isColorSync) return ""; // Return empty if sync is disabled

   // Determine Kelvin based on Filter/Lighting
   let kelvin = "5600K (Daylight)";
   let tint = "Neutral";
   let palette = "Natural";
   
   if (settings.timeOfDay === 'golden_hour' || settings.lighting.includes('backlight')) {
       kelvin = "3500K (Warm Golden)";
       tint = "+10 Magenta (Warmth)";
   } else if (settings.timeOfDay === 'night' || settings.scene === 'city_neon') {
       kelvin = "4000K (Cool Mixed)";
       tint = "-10 Green (Urban)";
   } else if (settings.scene === 'studio_dark') {
       kelvin = "6500K (Cool Studio)";
   }

   // Filter Overrides
   switch(settings.filter) {
       case 'cinematic': 
           palette = "Teal Shadows, Orange Highlights. High Contrast. Slight Desaturation."; 
           if (!kelvin.includes("Warm")) kelvin = "5000K (Balanced)";
           break;
       case 'clean': 
           palette = "High Key. Whites are pure white (#FFFFFF). Bright exposure. Pastel tones."; 
           kelvin = "5200K (Clean White)";
           break;
       case 'natural': 
           palette = "True to Life (Macbeth Color Checker accurate). Moderate contrast."; 
           break;
   }

   return `
   *** MASTER COLOR PROFILE (MANDATORY BATCH SYNC) ***
   - WHITE BALANCE: ${kelvin} FIXED.
   - TINT: ${tint}.
   - COLOR PALETTE: ${palette}.
   - REQUIREMENT: All images in this batch MUST share this exact color grading. Do not deviate.
   `;
}

// --- OPTIMIZED PROMPT CONSTRUCTION ---
const constructPrompt = (
    settings: ImageSettings, 
    targetAngle?: ViewAngle, 
    targetDevice?: PhotographyDevice, 
    targetLens?: FocalLength,
    masterColorProfile?: string
) => {
  
  // 0. DETERMINE DEVICE & LENS
  const currentDevice = targetDevice || settings.photographyDevice[0] || 'professional';
  const currentLens = targetLens || settings.focalLength[0] || '50mm';
  
  // --- 1. OPTICAL PHYSICS ENGINE (CRITICAL PRIORITY) ---
  let lensPhysics = "";
  
  if (currentDevice === 'mobile') {
      // Mobile Lens Simulation
      switch(currentLens) {
          case '16mm': // 0.5x
              lensPhysics = `
              LENS: 16mm ULTRA-WIDE (0.5x).
              PHYSICS: Strong perspective distortion. The center of the object bulges slightly. Background is pushed far away.
              VIBE: Dynamic, Action camera feel. High FOV (120 degrees).
              `;
              break;
          case '24mm': // 1x
              lensPhysics = `
              LENS: 24mm WIDE (1x Smartphone Main Camera).
              PHYSICS: Standard wide angle. Slight perspective elongation at corners. Sharp depth of field (everything mostly in focus).
              `;
              break;
          case '85mm': // 3x
              lensPhysics = `
              LENS: 77mm-85mm TELEPHOTO (3x Zoom).
              PHYSICS: Digital Bokeh. Background is compressed and blurry. Subject looks flat and flattering.
              `;
              break;
          default: lensPhysics = "LENS: Standard Smartphone Camera.";
      }
  } else {
      // Professional Lens Simulation
      switch(currentLens) {
          case '16mm':
              lensPhysics = `
              LENS: 16mm G-MASTER WIDE ANGLE.
              OPTICAL RULES:
              1. Exaggerate perspective lines (vanishing points are far).
              2. "Stretch" the foreground elements.
              3. Deep depth of field (Background is visible but distant).
              4. Create a sense of vast scale.
              `;
              break;
          case '35mm':
              lensPhysics = "LENS: 35mm Reportage Lens. Natural width, slight environment context inclusion.";
              break;
          case '50mm':
              lensPhysics = "LENS: 50mm Standard Prime. Human eye perspective. Zero distortion. Neutral geometry.";
              break;
          case '85mm':
          case '100mm':
          case '120mm':
              lensPhysics = `
              LENS: ${currentLens} TELEPHOTO MACRO / PORTRAIT.
              OPTICAL RULES:
              1. COMPRESS THE SPACE. The background must appear visually close to the object.
              2. EXTREME BOKEH (f/1.2). Background must be creamy and unintelligible.
              3. FLATTEN THE PERSPECTIVE. No fish-eye distortion. Isometric-like parallel lines.
              4. Focus is razor thin on the product texture.
              `;
              break;
          default: lensPhysics = `LENS: ${currentLens} Prime Lens.`;
      }
  }

  // --- 2. GEOMETRIC CAMERA ANGLE (CRITICAL PRIORITY) ---
  let anglePhysics = "";
  if (targetAngle) {
     switch(targetAngle) {
        case 'eye_level': 
            anglePhysics = `
            CAMERA POSITION: EYE LEVEL (0° Elevation). 
            GEOMETRY: The camera lens is parallel to the floor. Vertical lines of the product must remain VERTICAL (No converging verticals).
            We see the FRONT FACE of the product directly.
            `; 
            break;
        case 'high_angle_45': 
            anglePhysics = `
            CAMERA POSITION: 45° HIGH ANGLE (Standard Product View).
            GEOMETRY: Camera is elevated, looking down. We MUST see the TOP SURFACE and the FRONT/SIDE surfaces simultaneously.
            3-Point Perspective.
            `; 
            break;
        case 'low_angle':
            anglePhysics = `
            CAMERA POSITION: WORM'S EYE VIEW (Low Angle).
            GEOMETRY: Camera is on the ground/table surface looking UP at the object.
            EFFECT: The object looks monumental and tall. Horizon line is at the bottom 10% of the image.
            `; 
            break;
        case 'top_down':
            anglePhysics = `
            CAMERA POSITION: 90° TOP DOWN (Flatlay / Knolling).
            GEOMETRY: 
            - The camera is looking perpendicular to the table.
            - 2D Planar view.
            - DO NOT show the horizon. DO NOT show walls. ONLY the floor/table surface.
            - We see the TOP FACE of the object.
            `; 
            break;
     }
  }

  // --- 3. SCENE CONTEXT ---
  let sceneDesc = "";
  if (settings.isRemoveBackground) {
    sceneDesc = "Environment: PURE SOLID WHITE BACKGROUND (#FFFFFF). Studio Lighting. Minimal shadows.";
  } else {
    // Keep descriptions concise to not override camera physics
    switch (settings.scene) {
      case 'tech_desk': sceneDesc = "Scene: Modern Dark Tech Desk. Monitor light bar atmosphere. Blurred keyboard in background."; break;
      case 'workbench': sceneDesc = "Scene: Gritty Workshop Table. Tools and sawdust. Industrial lighting."; break;
      case 'acrylic_base': sceneDesc = "Scene: Clear Acrylic Podium. Studio abstract environment. High contrast."; break;
      case 'studio_dark': sceneDesc = "Scene: Pitch Black Studio. Rim lighting only. Mysterious vibe."; break;
      case 'creator_lifestyle': sceneDesc = "Scene: Wooden Coffee Table. Cozy notebook and pen. Warm window light."; break;
      case 'shelf_decor': sceneDesc = "Scene: Interior Bookshelf. Plants and decor items. Soft home lighting."; break;
      case 'streetwear': sceneDesc = "Scene: Concrete Street Floor. Urban sunlight. Asphalt texture."; break;
      case 'night_light': sceneDesc = "Scene: Bedroom Nightstand. Warm lamp glow. Cozy evening vibe."; break;
      case 'handheld_usage': sceneDesc = "Scene: Blurred City Street Background (Bokeh). Natural day light."; break;
      case 'aesthetic_room': sceneDesc = "Scene: White Minimalist Table. Soft shadows. Clean aesthetic."; break;
      case 'balcony_urban': sceneDesc = "Scene: Apartment Balcony floor. Sunlight and plant shadows."; break;
      case 'park_city': sceneDesc = "Scene: Public Park Stone Bench. Outdoor daylight."; break;
      case 'hoi_an': sceneDesc = "Scene: Yellow Ancient Wall texture. Warm golden sunlight."; break;
      case 'city_neon': sceneDesc = "Scene: Wet Street at Night. Neon reflections (Cyberpunk colors)."; break;
      case 'vintage_street': sceneDesc = "Scene: Old Brick Wall. Nostalgic film colors."; break;
      case 'custom': sceneDesc = `Scene: ${settings.customScenePrompt || "Professional background"}.`; break;
    }
  }

  // --- 4. LIGHTING & INTERACTION ---
  let interactionPrompt = "";
  const modelDesc = settings.humanStyle === 'vietnamese' ? "Vietnamese hand" : "European hand";
  
  // Interaction Logic (Simplified for clarity)
  if (settings.humanInteraction !== 'none') {
      const interactionType = settings.humanInteraction.replace('_', ' ');
      if (currentDevice === 'mobile') {
          interactionPrompt = `Interaction: A ${modelDesc} is interacting (${interactionType}). RAW FLASH PHOTO style. Imperfect, authentic.`;
      } else {
          interactionPrompt = `Interaction: Professional hand model (${modelDesc}) performing ${interactionType}. Perfect manicure. Soft commercial lighting.`;
      }
  } else {
      interactionPrompt = "Interaction: NO HUMANS. Static Product Photography.";
  }

  let lightingPrompt = "";
  switch(settings.lighting) {
      case 'softbox': lightingPrompt = "Lighting: Large Octabox Soft light. Soft shadows."; break;
      case 'hard_light': lightingPrompt = "Lighting: Direct Sunlight / Hard Strobe. Sharp, defined shadows."; break;
      case 'backlight': lightingPrompt = "Lighting: Silhouette / Rim Light. Light source behind object."; break;
      case 'natural_window': lightingPrompt = "Lighting: North-facing Window Light. Diffused and airy."; break;
      case 'natural_backlight': lightingPrompt = "Lighting: Outdoor Golden Hour Backlight. Sun flare."; break;
  }

  return `
    SYSTEM: You are a Physical Render Engine (Octane/Redshift).
    
    *** INPUT OBJECT PROTOCOL ***
    - The input image is the "Master 3D Asset". 
    - PRESERVE Identity: Keep logos, text, and shape EXACTLY as provided.
    - ADAPT Perspective: You MUST rotate/tilt the 3D Asset to match the requested CAMERA ANGLE below.
    
    ${masterColorProfile ? masterColorProfile : ""}

    *** RENDER CONFIGURATION (MANDATORY) ***
    ${anglePhysics}
    
    ${lensPhysics}
    
    *** SCENE PARAMETERS ***
    - ${sceneDesc}
    - ${lightingPrompt}
    - ${interactionPrompt}
    - Mood: ${settings.mood}
    
    EXECUTION:
    - If Angle is TOP DOWN, the floor MUST be flat 2D.
    - If Lens is 16mm, distort the perspective.
    - If Lens is 85mm, compress the background.
    - Output must be Photorealistic 4K.
  `;
};

// --- VIDEO GENERATION (VEO) ---
export const generateProductVideo = async (
  originalImageBase64: string,
  settings: ImageSettings
): Promise<GenResult[]> => {
  try {
    const ai = getClient();
    const basePrompt = constructPrompt(settings);
    
    // Construct Video Specific Prompt
    const duration = settings.videoDuration || 5;
    const hasVoice = settings.hasVoice ? "Audio: Ambient ASMR sounds." : "Audio: Silent.";
    
    let specificAction = "Action: Cinematic product rotation.";
    if (settings.videoPrompt && settings.videoPrompt.trim() !== "") {
        specificAction = `USER ACTION: ${settings.videoPrompt}`;
    }

    const fullVideoPrompt = `
      ${basePrompt}
      TYPE: VIDEO GENERATION.
      DURATION: ${duration}s.
      ${specificAction}
      ${hasVoice}
    `;

    const base64Data = originalImageBase64.replace(/^data:image\/\w+;base64,/, "");
    
    let aspectRatioStr = '16:9';
    if (settings.aspectRatio === '9:16') aspectRatioStr = '9:16';

    console.log("Starting Video Generation...", fullVideoPrompt);
    
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      image: { imageBytes: base64Data, mimeType: 'image/jpeg' },
      prompt: fullVideoPrompt,
      config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: aspectRatioStr as any }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    if (operation.error) throw new Error(`Veo Failed: ${operation.error.message}`);

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("No video URI.");

    const fetchUrl = `${videoUri}&key=${process.env.API_KEY}`;
    const videoResponse = await fetch(fetchUrl);
    const videoBlob = await videoResponse.blob();
    const videoObjectUrl = URL.createObjectURL(videoBlob);

    return [{
      imageUrl: videoObjectUrl,
      usage: { inputTokens: 2000, outputTokens: 1500 * duration },
      isVideo: true
    }];

  } catch (error) {
    console.error("Video Error:", error);
    throw error;
  }
};


// --- IMAGE GENERATION (GEMINI) ---
const generateSingleImage = async (
  ai: GoogleGenAI,
  imagePart: any,
  settings: ImageSettings,
  targetAngle: ViewAngle,
  targetDevice: PhotographyDevice,
  targetLens: FocalLength,
  seed?: number,
  masterColorProfile?: string // Pass the strict color profile
): Promise<GenResult> => {
  
  const prompt = `
    ${constructPrompt(settings, targetAngle, targetDevice, targetLens, masterColorProfile)}
    OUTPUT: Single Photorealistic Image.
  `;

  let targetImageSize = "1K";
  if (settings.model === 'gemini-3-pro-image-preview' && settings.isHighRes) {
      targetImageSize = "4K";
  }

  // --- TEMPERATURE ADJUSTMENT ---
  // Adjusted slightly UP (0.4) to allow the model to conform to the
  // drastic geometric changes requested by the lens prompts, 
  // while still keeping the seed fixed for scene consistency.
  const generationConfig = {
      temperature: 0.4, 
      topP: 0.9,
      topK: 40,
      imageConfig: {
         aspectRatio: settings.aspectRatio as any,
         imageSize: (settings.model === 'gemini-3-pro-image-preview') ? targetImageSize as any : undefined
      },
      seed: seed
  };

  const response = await ai.models.generateContent({
    model: settings.model, 
    contents: { parts: [imagePart, { text: prompt }] },
    config: generationConfig
  });

  const usage = {
    inputTokens: response.usageMetadata?.promptTokenCount || 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount || 0
  };

  if (response.candidates && response.candidates.length > 0) {
    const parts = response.candidates[0].content.parts;
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return {
          imageUrl: `data:image/jpeg;base64,${part.inlineData.data}`,
          usage: usage,
          isVideo: false,
          seed: seed
        };
      }
    }
  }
  
  throw new Error("API failed to generate image.");
};

export const generateProductImage = async (
  originalImageBase64: string,
  settings: ImageSettings
): Promise<GenResult[]> => {
  try {
    const ai = getClient();
    const imagePart = prepareImagePart(originalImageBase64);
    
    // Default Fallbacks
    const viewAngles: ViewAngle[] = settings.viewAngle.length > 0 ? settings.viewAngle : ['eye_level'];
    const focalLengths: FocalLength[] = settings.focalLength.length > 0 ? settings.focalLength : ['50mm'];
    const countPerAngle = settings.outputCount || 1;
    const devices: PhotographyDevice[] = settings.photographyDevice.length > 0 ? settings.photographyDevice : ['professional'];
    
    // --- BATCH SEED STRATEGY ---
    // We use ONE seed for the whole batch to keep lighting/furniture consistent.
    const batchSeed = Math.floor(Math.random() * 2147483647);

    // --- COLOR SYNC STRATEGY ---
    // Generate ONE Master Color Profile for the entire batch if sync is enabled
    const masterColorProfile = getMasterColorProfile(settings);

    const allPromises: Promise<GenResult>[] = [];

    // Loop logic: Device -> Angle -> Lens -> Count
    for (const device of devices) {
        for (const angle of viewAngles) {
            for (const lens of focalLengths) {
                for (let i = 0; i < countPerAngle; i++) {
                    // Pass the Master Color Profile to every request
                    allPromises.push(generateSingleImage(ai, imagePart, settings, angle, device, lens, batchSeed, masterColorProfile));
                }
            }
        }
    }
    
    const results = await Promise.all(allPromises);
    return results;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
