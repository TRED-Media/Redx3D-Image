import { ImageSettings } from "../types";

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const applyWatermark = async (
  imageUrl: string,
  settings: ImageSettings['watermark']
): Promise<string> => {
  if (!settings || !settings.enabled || !settings.url) return imageUrl;

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const watermarkImg = new Image();

    img.crossOrigin = "anonymous";
    watermarkImg.crossOrigin = "anonymous";

    let loadedCount = 0;
    const onLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        // Draw main image
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        if (ctx) {
          // Calculate watermark dimensions
          const wmWidth = img.width * settings.scale;
          const wmHeight = (watermarkImg.height / watermarkImg.width) * wmWidth;

          // Calculate position
          let x = 0;
          let y = 0;
          const padding = img.width * 0.05; // 5% padding

          switch (settings.position) {
            case 'top-left':
              x = padding;
              y = padding;
              break;
            case 'top-right':
              x = canvas.width - wmWidth - padding;
              y = padding;
              break;
            case 'bottom-left':
              x = padding;
              y = canvas.height - wmHeight - padding;
              break;
            case 'bottom-right':
              x = canvas.width - wmWidth - padding;
              y = canvas.height - wmHeight - padding;
              break;
            case 'center':
              x = (canvas.width - wmWidth) / 2;
              y = (canvas.height - wmHeight) / 2;
              break;
          }

          ctx.globalAlpha = settings.opacity;
          ctx.drawImage(watermarkImg, x, y, wmWidth, wmHeight);
          ctx.globalAlpha = 1.0;
        }

        resolve(canvas.toDataURL('image/png'));
      }
    };

    img.onload = onLoaded;
    watermarkImg.onload = onLoaded;

    img.src = imageUrl;
    watermarkImg.src = settings.url;
  });
};

export const downloadImage = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
