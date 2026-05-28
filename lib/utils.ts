/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFriendlyErrorMessage(error: unknown, context: string): string {
    let rawMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
        rawMessage = error.message;
    } else if (typeof error === 'string') {
        rawMessage = error;
    } else if (error) {
        rawMessage = String(error);
    }

    // Check for specific unsupported MIME type error from Gemini API
    if (rawMessage.includes("Unsupported MIME type")) {
        try {
            // It might be a JSON string like '{"error":{"message":"..."}}'
            const errorJson = JSON.parse(rawMessage);
            const nestedMessage = errorJson?.error?.message;
            if (nestedMessage && nestedMessage.includes("Unsupported MIME type")) {
                const mimeType = nestedMessage.split(': ')[1] || 'unsupported';
                return `File type '${mimeType}' is not supported. Please use a format like PNG, JPEG, or WEBP.`;
            }
        } catch (e) {
            // Not a JSON string, but contains the text. Fallthrough to generic message.
        }
        // Generic fallback for any "Unsupported MIME type" error
        return `Unsupported file format. Please upload an image format like PNG, JPEG, or WEBP.`;
    }
    
    return `${context}. ${rawMessage}`;
}

// Новая функция для сжатия изображений перед отправкой
export const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Установили лимиты в 1600px для сохранения высокой детализации
      const MAX_WIDTH = 1600;
      const MAX_HEIGHT = 1600;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Качество 0.85 даст отличную картинку весом около 200-400 КБ
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        resolve(compressedBase64);
      } else {
        // Если что-то пошло не так, безопасно отдаем оригинал
        resolve(base64Str);
      }
    };
    
    img.onerror = (error) => {
      console.error("Ошибка при загрузке изображения для сжатия", error);
      reject(error);
    };
  });
};
