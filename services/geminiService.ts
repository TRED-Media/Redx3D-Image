
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
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

// --- ERROR HANDLING & RETRY LOGIC ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 5, baseDelay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Check for 503 (Overloaded) or 429 (Rate Limit)
    // Sometimes error structure varies, checking code/status/message covers most bases
    const isOverloaded = 
      error?.status === 503 || 
      error?.code === 503 || 
      error?.message?.includes('overloaded') ||
      error?.status === 429 ||
      error?.code === 429;

    if (isOverloaded && retries > 0) {
      // Add jitter to prevent thundering herd on retry
      const jitter = Math.random() * 1000;
      const delayTime = baseDelay + jitter;
      
      console.warn(`Gemini API Overloaded/Busy. Retrying in ${Math.round(delayTime)}ms... (${retries} attempts left)`);
      
      await wait(delayTime);
      // Exponential backoff: Increase delay for next attempt
      return withRetry(fn, retries - 1, baseDelay * 2);
    }
    throw error;
  }
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
  
  // 0. DETERMINE MODE
  const isDualMode = !!settings.referenceImageUrl;
  const isStrictRefMode = isDualMode && settings.isKeepRefBackground;

  // --- DUAL MODE STRICT (COMPOSITOR) PROMPT ---
  if (isStrictRefMode) {
      let interactionAction = "The product is held/placed naturally.";
      if (settings.dualImagePrompt && settings.dualImagePrompt.trim().length > 0) {
          interactionAction = `ACTION: "${settings.dualImagePrompt}".`;
      }

      return `
      SYSTEM: You are an expert Photo Retoucher and Compositor.
      TASK: Seamlessly insert the Product (Input 1) into the Reference Image (Input 2).

      *** CRITICAL RULES: FACE & BACKGROUND PROTECTION ***
      1. THE REFERENCE IMAGE (INPUT 2) IS THE BASE LAYER. DO NOT CHANGE IT.
      2. PRESERVE THE PERSON'S FACE EXACTLY. Do not smooth skin, do not change makeup, do not relight the face.
      3. PRESERVE THE BACKGROUND EXACTLY.
      4. ONLY THE PRODUCT (Input 1) should be added/modified.
      
      *** LIGHTING INSTRUCTION ***
      - Analyze the lighting in Input 2 (Direction, Intensity, Color).
      - Apply that EXACT lighting to the Product (Input 1) so it blends in.
      - DO NOT apply new global lighting filters.
      
      *** ACTION ***
      - ${interactionAction}
      - Blend the product realistically (contact shadows, reflections on product).

      OUTPUT: The exact Reference Image (Input 2) with the Product (Input 1) integrated naturally.
      `;
  }

  // --- STANDARD MODE (GENERATOR) PROMPT ---
  const currentDevice = targetDevice || settings.photographyDevice[0] || 'professional';
  const currentLens = targetLens || settings.focalLength[0] || '50mm';

  // 1. OPTICAL PHYSICS ENGINE (LENS) - REWRITTEN FOR REALISM
  let lensPhysics = "";
  if (currentDevice === 'mobile') {
      switch(currentLens) {
          case '16mm': lensPhysics = "OPTICS: Smartphone Ultra-Wide. PHYSICS: Digital Distortion correction OFF. High distortion at edges."; break;
          case '24mm': lensPhysics = "OPTICS: Smartphone Main Sensor. PHYSICS: Wide angle, deep depth of field. Sharp everywhere."; break;
          case '85mm': lensPhysics = "OPTICS: Smartphone Telephoto (3x). PHYSICS: Computational Bokeh (Portrait Mode). Artificial blur."; break;
          default: lensPhysics = "LENS: Smartphone Camera.";
      }
  } else {
      switch(currentLens) {
          case '16mm': 
              lensPhysics = "OPTICS: 16mm Ultra-Wide Angle Lens (Full Frame). PHYSICS: Slight Barrel Distortion at corners (Optical Aberration). Center 'suction' perspective effect. Deep Depth of Field (f/11) - Background is relatively sharp and vast."; 
              break;
          case '35mm': 
              lensPhysics = "OPTICS: 35mm Reportage Lens. PHYSICS: Slight width, natural environmental context. Moderate depth of field (f/5.6)."; 
              break;
          case '50mm': 
              lensPhysics = "OPTICS: 50mm Standard Prime. PHYSICS: Human Eye Perspective. Zero Distortion. Natural look. Balanced Depth of Field (f/4)."; 
              break;
          case '85mm': 
          case '100mm':
          case '120mm': 
              lensPhysics = `OPTICS: ${currentLens} Telephoto/Portrait. PHYSICS: STRONG OPTICAL COMPRESSION (Background pulled forward/closer to subject). Zero Distortion. Shallow Depth of Field (f/1.4). Background is HEAVILY BLURRED (Creamy Bokeh). Subject isolation.`; 
              break;
          default: 
              lensPhysics = `OPTICS: ${currentLens} Prime.`;
      }
  }

  // 2. COMPOSITION / SHOT SIZE (ZOOM LEVEL) - REWRITTEN FOR SCALE ACCURACY
  let shotComposition = "";
  switch(settings.shotSize) {
      case 'wide':
          shotComposition = "COMPOSITION: EXTREME WIDE LONG SHOT. SCALE: Subject is TINY (Occupies max 10-15% of frame). VAST NEGATIVE SPACE. Show the entire environment/room around the object. Distance: Far.";
          break;
      case 'full':
          shotComposition = "COMPOSITION: FULL SHOT. SCALE: Subject fits entirely in frame with safety margin (Occupies 40-50%). Balanced framing. Distance: Moderate.";
          break;
      case 'medium':
          shotComposition = "COMPOSITION: MEDIUM CLOSE-UP. SCALE: Subject fills 70-80% of frame. Focus on form and shape. Background is secondary but visible. Distance: Near.";
          break;
      case 'close_up':
          shotComposition = "COMPOSITION: MACRO / EXTREME CLOSE-UP. SCALE: Subject exceeds frame (100%+). CROP EDGES. Focus strictly on SURFACE MATERIAL, TEXTURE, and DETAILS. Depth of field is razor thin. Distance: Macro.";
          break;
      default:
          shotComposition = "COMPOSITION: Standard Product Framing.";
  }

  // 3. GEOMETRIC CAMERA ANGLE
  let anglePhysics = "";
  if (targetAngle) {
     switch(targetAngle) {
        case 'eye_level': anglePhysics = "CAMERA ANGLE: EYE LEVEL (0°). Vertical lines must be vertical."; break;
        case 'high_angle_45': anglePhysics = "CAMERA ANGLE: 45° HIGH ANGLE. See top and front surfaces."; break;
        case 'low_angle': anglePhysics = "CAMERA ANGLE: WORM'S EYE VIEW. Object looks monumental. Horizon low."; break;
        case 'top_down': anglePhysics = "CAMERA ANGLE: 90° TOP DOWN. Flatlay. 2D Planar view. No horizon."; break;
     }
  }

  // 4. SCENE & LIGHTING
  let sceneDesc = "";
  let lightingPrompt = "";

  if (settings.isRemoveBackground) {
    sceneDesc = "Environment: PURE SOLID WHITE BACKGROUND (#FFFFFF). Studio Lighting.";
  } else {
    // Relighting Mode (Ref Image BUT New Background)
    if (isDualMode && !settings.isKeepRefBackground) {
        sceneDesc = "SCENE: IGNORE Input 2 Background. EXTRACT person from Input 2. PLACE into NEW SCENE: ";
    } else {
        sceneDesc = "SCENE: ";
    }

    switch (settings.scene) {
      case 'tech_desk': sceneDesc += "Modern Dark Tech Desk. Monitor light bar."; break;
      case 'workbench': sceneDesc += "Gritty Workshop Table. Tools and sawdust."; break;
      case 'acrylic_base': sceneDesc += "Clear Acrylic Podium. Studio abstract."; break;
      case 'studio_dark': sceneDesc += "Pitch Black Studio. Rim lighting only."; break;
      case 'creator_lifestyle': sceneDesc += "Wooden Coffee Table. Cozy vibe."; break;
      case 'shelf_decor': sceneDesc += "Interior Bookshelf. Plants and decor."; break;
      case 'streetwear': sceneDesc += "Concrete Street Floor. Urban sunlight."; break;
      case 'night_light': sceneDesc += "Bedroom Nightstand. Warm lamp glow."; break;
      case 'handheld_usage': sceneDesc += "Blurred City Street Background (Bokeh)."; break;
      case 'aesthetic_room': sceneDesc += "White Minimalist Table. Soft shadows."; break;
      case 'balcony_urban': sceneDesc += "Apartment Balcony. Sunlight."; break;
      case 'park_city': sceneDesc += "Public Park Stone Bench. Outdoor."; break;
      case 'hoi_an': sceneDesc += "Yellow Ancient Wall. Warm golden sun."; break;
      case 'city_neon': sceneDesc += "Wet Street at Night. Neon reflections."; break;
      case 'vintage_street': sceneDesc += "Old Brick Wall. Nostalgic film."; break;
      case 'custom': sceneDesc += `${settings.customScenePrompt || "Professional background"}.`; break;
    }
  }
  
  // REFINED LIGHTING PROMPTS
  switch(settings.lighting) {
      case 'softbox': 
          lightingPrompt = "Lighting: Soft, diffused, high-quality studio illumination. Smooth shadow transitions. Invisible light source (Do not render equipment)."; 
          break;
      case 'hard_light': 
          lightingPrompt = "Lighting: High contrast, direct lighting. Sharp, defined shadows. Mimic sunlight."; 
          break;
      case 'backlight': 
          lightingPrompt = "Lighting: Strong Backlight / Rim Light. Silhouette effect on edges."; 
          break;
      case 'natural_window': 
          lightingPrompt = "Lighting: Soft directional light from one side (Window effect). Gentle falloff."; 
          break;
      case 'natural_backlight': 
          lightingPrompt = "Lighting: Golden Hour outdoor backlight. Warm flare effect."; 
          break;
  }

  // 5. INTERACTION
  let interactionPrompt = "";
  if (isDualMode && !settings.isKeepRefBackground) {
      // Relighting Mode - Need to describe how to blend
      interactionPrompt = "ACTION: Blend extracted person and product naturally.";
  } else {
      // Single Mode Generation
      const modelDesc = settings.humanStyle === 'vietnamese' ? "Vietnamese hand model" : "European hand model";
      if (settings.humanInteraction !== 'none') {
          const interactionType = settings.humanInteraction.replace('_', ' ');
          interactionPrompt = `Interaction: ${modelDesc} performing ${interactionType}.`;
      } else {
          interactionPrompt = "Interaction: NO HUMANS. Product only.";
      }
  }

  // 6. TIME & MOOD
  let timeDesc = `Time: ${settings.timeOfDay}`;
  let moodDesc = `Mood: ${settings.mood}`;

  return `
    SYSTEM: You are a Physical Render Engine (Octane/Redshift).
    
    *** INPUT 1: Master 3D Asset (Product). Preserve Identity. ***
    ${isDualMode ? "*** INPUT 2: Reference Person. Extract and Relight. ***" : ""}

    ${masterColorProfile ? masterColorProfile : ""}

    *** RENDER CONFIGURATION ***
    ${anglePhysics}
    ${lensPhysics}
    ${shotComposition}
    
    *** SCENE PARAMETERS ***
    - ${sceneDesc}
    - ${lightingPrompt}
    - ${interactionPrompt}
    - ${timeDesc}
    - ${moodDesc}
    
    OUTPUT: Photorealistic 4K Image.
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
    
    // Wrap the initial generation request in retry logic
    let operation: any = await withRetry(() => ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      image: { imageBytes: base64Data, mimeType: 'image/jpeg' },
      prompt: fullVideoPrompt,
      config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: aspectRatioStr as any }
    }));

    // Poll for completion (No retry logic needed here usually as it's GET, but could be added if getVideosOperation is flaky)
    while (!operation.done) {
      await wait(5000);
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
  
  // Stagger requests to avoid hitting rate limit simultaneously (Thundering Herd)
  // Add a random delay between 0 and 2000ms before starting
  await wait(Math.random() * 2000);

  const prompt = `
    ${constructPrompt(settings, targetAngle, targetDevice, targetLens, masterColorProfile)}
    OUTPUT: Single Photorealistic Image.
  `;

  let targetImageSize = "1K";
  if (settings.model === 'gemini-3-pro-image-preview' && settings.isHighRes) {
      targetImageSize = "4K";
  }
  
  // DETERMINE MODE FOR TEMPERATURE
  const isStrictRefMode = !!settings.referenceImageUrl && settings.isKeepRefBackground;

  // --- TEMPERATURE ADJUSTMENT ---
  const temp = isStrictRefMode ? 0.1 : 0.4;

  const generationConfig = {
      temperature: temp, 
      topP: 0.9,
      topK: 40,
      imageConfig: {
         aspectRatio: settings.aspectRatio as any,
         imageSize: (settings.model === 'gemini-3-pro-image-preview') ? targetImageSize as any : undefined
      },
      seed: seed
  };
  
  // Construct Content Parts
  const parts: any[] = [imagePart]; // Part 0: Product
  
  // IF Dual Mode, Add Reference Image as Part 1
  if (settings.referenceImageUrl) {
      const refPart = prepareImagePart(settings.referenceImageUrl);
      parts.push(refPart);
  }
  
  // Add Text Prompt last
  parts.push({ text: prompt });

  // Wrap API call in retry logic
  const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: settings.model, 
    contents: { parts: parts },
    config: generationConfig
  }));

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
  
  throw new Error("API failed to generate image (Empty Response).");
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
    