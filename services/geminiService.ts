
import { GoogleGenAI } from "@google/genai";
import { ImageSettings, ViewAngle, PhotographyDevice } from "../types";

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
}

// --- OPTIMIZED PROMPT CONSTRUCTION ---
const constructPrompt = (settings: ImageSettings, targetAngle?: ViewAngle, targetDevice?: PhotographyDevice) => {
  
  // 0. DETERMINE DEVICE FIRST (Critical for branching logic)
  const currentDevice = targetDevice || settings.photographyDevice[0] || 'professional';
   
  // 1. SCENE CONSTRUCTION (Detailed Atmosphere & Texture)
  let sceneDesc = "";
  if (settings.isRemoveBackground) {
    sceneDesc = "Environment: PURE SOLID WHITE BACKGROUND (#FFFFFF) with gentle ground shadows for grounding. Studio isolation style.";
  } else {
    switch (settings.scene) {
      // VN Scenes - Detailed
      case 'vn_tet': 
        sceneDesc = "Environment: Authentic Vietnamese Lunar New Year (Tet) setting. Background featuring vibrant Ochna integerrima (yellow Mai flowers) or Peach blossoms. Decor includes lucky red envelopes (Lì Xì), lanterns, and traditional wooden furniture. Warm, festive, golden lighting."; 
        break;
      case 'vn_coffee': 
        sceneDesc = "Environment: Classic Hanoi Old Quarter sidewalk cafe. Low wooden stool and table, textured yellow wall background with vintage patina. Morning sunlight filtering through street trees. Nostalgic, peaceful vibe."; 
        break;
      case 'vn_lotus': 
        sceneDesc = "Environment: Serene Vietnamese Lotus Pond. Soft focus background of large green lotus leaves and pink lotus flowers. Morning mist on the water surface. Natural, fresh, organic atmosphere."; 
        break;
      case 'vn_bamboo': 
        sceneDesc = "Environment: Traditional Vietnamese village bamboo path. Green bamboo grove background with dappled sunlight. Rustic earth or brick pathway. Zen, calm, eco-friendly feel."; 
        break;
      case 'vn_indochine': 
        sceneDesc = "Environment: Indochine Interior Style. Fusion of French colonial and Vietnamese traditional design. Encaustic cement tile flooring, dark rattan furniture, mustard yellow walls, tropical indoor plants. Elegant and vintage."; 
        break;
      
      // Standard Scenes - Detailed
      case 'studio': 
        sceneDesc = "Environment: High-end Minimalist Commercial Studio. Infinity Cyclorama wall. Soft, diffuse lighting with no harsh shadows. Neutral tones to emphasize the product."; 
        break;
      case 'kitchen': 
        sceneDesc = "Environment: Luxury Modern Kitchen. White marble countertop with subtle veining. Blurred background of high-end appliances and cabinetry. Clean, sanitary, premium lifestyle."; 
        break;
      case 'living_room': 
        sceneDesc = "Environment: Contemporary Living Room. Stylish coffee table surface (wood or glass). Background of a cozy sofa and soft rug with warm ambient lighting. Comfortable home atmosphere."; 
        break;
      case 'office': 
        sceneDesc = "Environment: Professional Creative Workspace. Sleek desk surface. Background includes a laptop, notebook, and perhaps a small succulent plant. Organized, productive, tech-forward vibe."; 
        break;
      case 'nature': 
        sceneDesc = "Environment: Deep Forest Nature. Product placed on a mossy rock or natural wood stump. Bokeh background of trees and foliage. Dappled sunlight (God rays). Fresh, outdoor, organic."; 
        break;
      case 'retail_shelf': 
        sceneDesc = "Environment: Premium Retail Store Shelf. Spotlighting on the product. Shallow depth of field blurring other products in the background. Commercial merchandising context."; 
        break;
      case 'custom': 
        sceneDesc = `Environment: ${settings.customScenePrompt || "Professional commercial background"}.`; 
        break;
    }
  }

  // 2. INTERACTION (Physics & Context) - SPLIT BY DEVICE
  let interactionPrompt = "";
  const modelDesc = settings.humanStyle === 'vietnamese' ? "Vietnamese person" : "European person";
  
  // LOGIC MOBILE CỰC MẠNH (Flash, Noise, Ugly-Authentic)
  if (currentDevice === 'mobile') {
      switch(settings.humanInteraction) {
        case 'none': 
            interactionPrompt = "Subject: RAW PHONE PHOTO. The product is placed casually on a surface. HARSH DIRECT FLASH is ON. Hard shadows behind the product. Digital noise/grain visible. Looks like a quick snapshot sent via message."; 
            break;
        case 'hand_holding': 
            interactionPrompt = `Subject: POV HAND HELD SHOT. A real user's hand gripping the product firmly. DIRECT CAMERA FLASH ON. Skin texture is raw and unedited (visible pores). Thumb might be slightly blurry or overlapping the label. Background is dark/dim due to flash falloff. Authentic UGC review style.`; 
            break;
        case 'presenting': 
            interactionPrompt = `Subject: MIRROR SELFIE / WIDE LENS STYLE. A hand holding the product close to the camera lens. WIDE ANGLE DISTORTION (Big hand, smaller body). "Shot on iPhone" aesthetic. Slightly tilted horizon.`; 
            break;
        case 'using': 
            interactionPrompt = `Subject: ACTION SNAPSHOT. A ${modelDesc} using the product in a messy, real-life environment. MOTION BLUR on the hands. Not a posed photo. Chaotic, real, authentic energy. High contrast.`; 
            break;
        case 'model_standing': 
            interactionPrompt = `Subject: CASUAL OUTFIT CHECK. A ${modelDesc} standing with the product. Full body or 3/4 shot taken with a phone back camera. Artificial sharpening artifacts. Ceiling fluorescent lighting or direct sunlight.`; 
            break;
        
        // Video Mobile
        case 'hand_pick_up': interactionPrompt = `Action: POV Shot. A hand reaches into the frame and grabs the product quickly, like unboxing/testing.`; break;
        case 'hand_rotate': interactionPrompt = `Action: Hand-held product review. The user rotates the product in front of the phone camera to show details.`; break;
        case 'using_product': interactionPrompt = `Action: A user testing the product in real time. Authentic, unpolished movement.`; break;
        case 'unboxing': interactionPrompt = `Action: POV Unboxing. Hands tearing open the package or lifting the lid. Shakey handheld camera feel.`; break;
        default: interactionPrompt = "Subject: Focus on the product in a real environment."; break;
      }
  } else {
      // --- PROFESSIONAL INTERACTIONS (Studio, Perfect, Elegant) ---
      switch(settings.humanInteraction) {
        case 'none': interactionPrompt = "Subject: HIGH-END STILL LIFE. The object is stationary. Perfect composition."; break;
        case 'hand_holding': interactionPrompt = `Subject: HAND MODELING. A perfectly manicured hand of a ${modelDesc} enters the frame, holding the product gracefully. Elegant finger positioning. Soft, flattering lighting on the skin. Commercial standard.`; break;
        case 'presenting': interactionPrompt = `Subject: LUXURY PRESENTATION. Two hands of a ${modelDesc} gently presenting the product as if it were a jewel. Symmetrical, respectful pose. Focus on elegance.`; break;
        case 'using': interactionPrompt = `Subject: COMMERCIAL LIFESTYLE. A ${modelDesc} using the product in a staged, perfect environment. The model is well-lit and posed. Advertising quality.`; break;
        case 'model_standing': interactionPrompt = `Subject: FASHION EDITORIAL. A professional ${modelDesc} model posing with the product. High-fashion lighting, sharp focus, magazine cover quality.`; break;
        
        // Video Pro
        case 'hand_pick_up': interactionPrompt = `Action: Slow-motion cinematic pick up. The hand enters gracefully and lifts the product with precision.`; break;
        case 'hand_rotate': interactionPrompt = `Action: Turntable style rotation or very smooth hand rotation showcasing the product silhouette.`; break;
        case 'using_product': interactionPrompt = `Action: Cinematic demonstration of the product features by a professional actor.`; break;
        case 'unboxing': interactionPrompt = `Action: Premium unboxing experience. Slow reveal. controlled lighting changes.`; break;
        default: interactionPrompt = "Subject: Focus strictly on the product."; break;
      }
  }

  // 3. OPTICAL SETTINGS & DEVICE DIFFERENTIATION
  let cameraSystemPrompt = "";
  
  if (currentDevice === 'mobile') {
      cameraSystemPrompt = `
      CAMERA SYSTEM: SMARTPHONE SENSOR (iPhone/Pixel).
      - LIGHTING: HARSH DIRECT FLASH / HARD LIGHT.
      - QUALITY: Low dynamic range. Highlights might be slightly blown out. Shadows are deep and hard.
      - ARTIFACTS: Digital sharpening halos, ISO noise/grain.
      - AESTHETIC: RAW, UNEDITED, AMATEUR, SOCIAL MEDIA STORY.
      `;
  } else {
      cameraSystemPrompt = `
      CAMERA SYSTEM: PROFESSIONAL CINEMA / STUDIO CAMERA (Hasselblad X2D or Sony A7R V).
      - LIGHTING: SOFTBOX / DIFFUSED STUDIO LIGHT.
      - QUALITY: High dynamic range. Soft rollover highlights.
      - LENS: Prime G-Master or Zeiss Lens. True optical physics.
      - AESTHETIC: HIGH-END COMMERCIAL PRODUCTION.
      `;
  }
  
  // Focal Length Physics
  let lensDesc = `Focal Length: ${settings.focalLength}.`;
  if (settings.focalLength === '85mm' || settings.focalLength === '100mm' || settings.focalLength === '120mm') {
      lensDesc += " EFFECT: STRONG OPTICAL BOKEH. Background must be heavily blurred (creamy blur). Separation of subject from background is extreme.";
  } else if (settings.focalLength === '16mm') {
      lensDesc += " EFFECT: WIDE ANGLE DISTORTION. Deep depth of field. Background is visible and sharp.";
  }

  let filterPrompt = "";
  switch(settings.filter) {
    case 'cinematic': filterPrompt = "Color Grading: Cinematic Look. Teal and Orange separation, high dynamic range, rich blacks, slight film grain, dramatic mood."; break;
    case 'clean': filterPrompt = "Color Grading: Commercial High-Key. Bright exposure, clean whites, vibrant colors, low contrast, clinical and fresh."; break;
    case 'natural': filterPrompt = "Color Grading: True-to-Life. Neutral white balance, accurate color reproduction, soft natural contrast."; break;
  }

  // 4. VIEW ANGLE & PERSPECTIVE (Geometric Instruction)
  let angleDesc = "";
  if (targetAngle) {
     switch(targetAngle) {
        case 'eye_level': 
            angleDesc = "Camera Elevation: EYE LEVEL (0°). The camera lens is strictly parallel to the horizon and the center of the product. Neutral perspective. Vertical lines are straight."; 
            break;
        case 'high_angle_45': 
            angleDesc = "Camera Elevation: HIGH ANGLE (45°). The camera looks down at the subject from above, revealing the top surface and 3D depth."; 
            break;
        case 'low_angle':
            angleDesc = "Camera Elevation: LOW ANGLE / HERO SHOT. The camera is placed physically LOW (near the ground) looking UP at the product. Horizon line is low. Makes the product look grand."; 
            break;
        case 'top_down':
            // FIXED: STRICT FLATLAY / TOP SHOT PROMPT
            angleDesc = `
            Camera Elevation: BIRD'S-EYE VIEW / TOP SHOT (90° VERTICAL). 
            SUBJECT PLACEMENT: The product is LAYING FLAT on the surface. 
            ORIENTATION: The camera is looking DIRECTLY DOWN at the ground/table. 
            COMPOSITION: Knolling / Flatlay. 2D Graphical arrangement. 
            Do not show the front face or sides standing up. Show the TOP FACE or the product laying on its back.
            `; 
            break;
     }
  }

  // 5. SHOT SIZE / FRAMING (Proximity Instruction)
  let shotDesc = "";
  switch (settings.shotSize) {
      case 'wide':
          shotDesc = "Framing: WIDE SHOT. The product is SMALL (<20% of frame area). Emphasize the vastness of the surrounding environment/room. Negative space is dominant.";
          break;
      case 'full':
          shotDesc = "Framing: FULL SHOT. The product fits comfortably in the frame (top to bottom visible). Standard e-commerce framing.";
          break;
      case 'medium':
          shotDesc = "Framing: MEDIUM SHOT. The product occupies about 60% of the frame. Focus on the overall form and shape.";
          break;
      case 'close_up':
          shotDesc = "Framing: EXTREME CLOSE-UP / MACRO. The product is HUGE (>90% of frame) or cropping into the frame. The camera is physically VERY CLOSE to the object. FOCUS ON SURFACE TEXTURE (leather grain, glass reflection, metal polish). Visible material details.";
          break;
  }

  let lightingDesc = settings.lighting.replace('_', ' ');
  if (settings.lighting === 'natural_backlight') lightingDesc = "Lighting: Natural Backlight (Rim Light). The light source is behind the subject, creating a glowing outline/halo effect.";

  return `
    ROLE: Expert Commercial Photographer / Cinematographer.
    TASK: Place the input product into a new environment.
    
    PRODUCT PRESERVATION (CRITICAL):
    - Keep product geometry 100% rigid.
    - Preserve logos, text, and material properties (reflectivity, transparency).
    
    CONFIGURATION:
    1. ${cameraSystemPrompt}
    2. ${lensDesc}
    3. ${angleDesc}
    4. ${shotDesc}
    5. ${filterPrompt}
    
    SCENE & ACTION:
    - ${interactionPrompt}
    - ${sceneDesc}
    - ${lightingDesc}
    - Mood: ${settings.mood}
    
    EXECUTION: Photorealistic, physically accurate lighting and shadows.
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
    
    // Construct Video Specific Prompt with Vietnamese Handling
    const duration = settings.videoDuration || 5;
    const hasVoice = settings.hasVoice ? "Audio: Include ambient background noise and specific product interaction sounds (ASMR)." : "Audio: Silent.";
    
    // Vietnamese Prompt Handling
    // We explicitly tell the model that the user input might be in Vietnamese and request it to interpret it as an action.
    let specificAction = "Action: Gentle cinematic camera movement, product slowly rotating or being handled naturally.";
    if (settings.videoPrompt && settings.videoPrompt.trim() !== "") {
        specificAction = `
        USER INSTRUCTION (VIETNAMESE): "${settings.videoPrompt}"
        INTERPRETATION: Translate the above Vietnamese instruction into a visual physics action and execute it. 
        Ensure the movement is smooth and realistic.
        `;
    }

    const fullVideoPrompt = `
      ${basePrompt}
      TYPE: VIDEO GENERATION (VEO).
      TARGET DURATION: ${duration} seconds.
      FRAME RATE: 24fps.
      
      MOTION INSTRUCTIONS:
      ${specificAction}
      
      AUDIO: ${hasVoice}
      
      Requirements: 
      - High temporal consistency.
      - No morphing of the product.
      - Social media commercial quality (1080p).
    `;

    const base64Data = originalImageBase64.replace(/^data:image\/\w+;base64,/, "");

    // Veo needs 16:9 or 9:16.
    let aspectRatioStr = '16:9';
    if (settings.aspectRatio === '9:16') {
       aspectRatioStr = '9:16';
    } else {
       aspectRatioStr = '16:9'; 
    }

    console.log("Starting Video Generation with Veo...", fullVideoPrompt);
    
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      image: {
        imageBytes: base64Data,
        mimeType: 'image/jpeg',
      },
      prompt: fullVideoPrompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: aspectRatioStr as any
      }
    });

    console.log("Video operation started. Polling for completion...");

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      operation = await ai.operations.getVideosOperation({operation: operation});
      console.log("Polling Veo status...");
    }

    if (operation.error) {
       throw new Error(`Veo Generation Failed: ${operation.error.message}`);
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
      throw new Error("No video URI returned from Veo.");
    }

    const fetchUrl = `${videoUri}&key=${process.env.API_KEY}`;
    const videoResponse = await fetch(fetchUrl);
    if (!videoResponse.ok) {
       throw new Error(`Failed to download video bytes: ${videoResponse.statusText}`);
    }
    const videoBlob = await videoResponse.blob();
    const videoObjectUrl = URL.createObjectURL(videoBlob);

    // Mock token usage for video
    // Based on PRICING_CONFIG estimates to keep stats aligned
    // 2000 input + (1500 * duration)
    const estInput = 2000;
    const estOutput = 1500 * duration;

    return [{
      imageUrl: videoObjectUrl,
      usage: { inputTokens: estInput, outputTokens: estOutput },
      isVideo: true
    }];

  } catch (error) {
    console.error("Gemini Video API Error:", error);
    throw error;
  }
};


// --- IMAGE GENERATION (GEMINI) ---
const generateSingleImage = async (
  ai: GoogleGenAI,
  imagePart: any,
  settings: ImageSettings,
  targetAngle: ViewAngle,
  targetDevice: PhotographyDevice
): Promise<GenResult> => {
  
  const prompt = `
    ${constructPrompt(settings, targetAngle, targetDevice)}
    OUTPUT: A single static image.
  `;

  let targetImageSize = "1K";
  if (settings.model === 'gemini-3-pro-image-preview' && settings.isHighRes) {
      targetImageSize = "4K";
  }

  const response = await ai.models.generateContent({
    model: settings.model, 
    contents: {
      parts: [imagePart, { text: prompt }]
    },
    config: {
      imageConfig: {
         aspectRatio: settings.aspectRatio as any,
         imageSize: (settings.model === 'gemini-3-pro-image-preview') ? targetImageSize as any : undefined
      }
    }
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
          isVideo: false
        };
      }
      if (part.text) {
          throw new Error(part.text);
      }
    }
  }
  
  throw new Error("API failed to generate image. Please try again.");
};

export const generateProductImage = async (
  originalImageBase64: string,
  settings: ImageSettings
): Promise<GenResult[]> => {
  try {
    const ai = getClient();
    const imagePart = prepareImagePart(originalImageBase64);
    
    const viewAngles: ViewAngle[] = settings.viewAngle.length > 0 ? settings.viewAngle : ['eye_level'];
    const countPerAngle = settings.outputCount || 1;
    // Default to professional if empty, though UI prevents this
    const devices: PhotographyDevice[] = settings.photographyDevice.length > 0 ? settings.photographyDevice : ['professional'];
    
    const allPromises: Promise<GenResult>[] = [];

    // Loop logic: Device -> Angle -> Count
    for (const device of devices) {
        for (const angle of viewAngles) {
            for (let i = 0; i < countPerAngle; i++) {
                allPromises.push(generateSingleImage(ai, imagePart, settings, angle, device));
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
