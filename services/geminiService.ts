import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

const fileToPart = async (file: File, maxSize?: number) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });

    if (maxSize) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                
                if (width > maxSize || height > maxSize) {
                    const ratio = Math.min(maxSize / width, maxSize / height);
                    width *= ratio;
                    height *= ratio;
                }
   
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error("Canvas not supported"));
       
                ctx.drawImage(img, 0, 0, width, height);
                const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                const { mimeType, data } = dataUrlToParts(resizedDataUrl);
                resolve({ inlineData: { mimeType, data } });
            };
            img.onerror = () => reject(new Error("Image load failed"));
            img.src = dataUrl;
        });
    }
    
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
};

const dataUrlToParts = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    return { mimeType: mimeMatch[1], data: arr[1] };
}

// Инициализация API для ЛОКАЛЬНОЙ оценки фото (analyzePhoto)
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY! });
const visionModel = 'gemini-2.5-flash';

export interface PhotoAnalysisResult {
    isAllowed: boolean;
    reason?: string;
    score?: number;
    qualityMessage?: string;
}

// Эта функция остается работать прямо в браузере, так как она быстрая и не требует обхода VPN
export const analyzePhoto = async (file: File): Promise<PhotoAnalysisResult> => {
    const userImagePart = await fileToPart(file, 800) as any;
    const promptText = `Оцени фото для виртуальной примерки.
КРИТИЧЕСКИЕ ПРАВИЛА ОЦЕНКИ (от 1 до 10):
1. Если на фото больше одного человека — СТРОГО ставь оценку 1 или 2 и укажи это.
2. Если лицо в профиль (отвернуто в сторону) ИЛИ обрезано (частично не видно) — СТРОГО ставь оценку от 1 до 3. Нейросеть не справляется с лицами в профиль или неполными лицами.
3. Если части лица (рот, глаза) прикрыты руками, волосами или другими предметами (ОЧКИ ДОПУСКАЮТСЯ) — снижай оценку до 3-4.
Лицо должно быть полностью открыто.
4. Если фото в полный рост ИЛИ лицо занимает менее 20% площади кадра (очень мелкое) — СТРОГО снижай оценку до 3-4.
Лицо исказится.
5. Если фото низкого качества (пиксельное, размытое, сильно сжатое, с артефактами) ИЛИ плохое освещение скрывает детали лица — СТРОГО ставь оценку от 1 до 3. Качество исходника - критически важный параметр!
6. Если глаза закрыты — снижай оценку на несколько баллов.
7. Оценка 8-10 ставится ТОЛЬКО для хорошо освещенных портретов высокого качества по пояс (medium shot) или крупнее, где лицо строго анфас, крупное, глаза открыты и ничем не перекрыты (кроме очков).
Верни строго сырой JSON без маркдауна и других слов (ничего кроме JSON):
{
  "isAllowed": true, 
  "score": число от 1 до 10,
  "qualityMessage": "короткий комментарий на русском описывающий главную причину оценки (например: 'Лицо в профиль, результат будет плохим', 'Много людей на фото', 'Размытое фото', 'Отличный ракурс')" 
}`;
    const response = await ai.models.generateContent({
        model: visionModel,
        contents: { parts: [userImagePart, { text: promptText }] },
        config: {
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ]
        }
    });
    
    let text = response.text?.trim() || "";
    if (!text) throw new Error("Failed to analyze image");
    
    if (text.startsWith("```json")) {
        text = text.replace(/^```json\n/, "").replace(/\n```$/, "");
    } else if (text.startsWith("```")) {
        text = text.replace(/^```\n/, "").replace(/\n```$/, "");
    }

    try {
        return JSON.parse(text) as PhotoAnalysisResult;
    } catch {
        // Fallback robust return
        console.error("Analysis Parse failed", text);
        return { isAllowed: true, score: 7, qualityMessage: "Фото приемлемо для генерации" };
    }
};

// ============================================================================
// НОВАЯ ЛОГИКА ГЕНЕРАЦИИ: Передаем задачу на сервер (Netlify Functions)
// ============================================================================
export const generateVirtualTryOnImage = async (
    userImage: File, 
    options: {
        clothesRef: string;
        clothesName: string;
        clothesId: string;
        clothesPrompt?: string | null;
        accRefs: string[];
        accNames: string[];
        poseText: string;
        bgRef: string;
        bgId?: string;
        isPendant: boolean;
        isSecret?: boolean;
        isStudio?: boolean;
        isFlag?: boolean;
        onLog?: (msg: string) => void;
    }
): Promise<string> => {
    let logString = `Starting generation request at ${new Date().toISOString()}\n`;
    const addLog = (msg: string) => {
        const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
        console.log(line);
        logString += line + "\n";
        if (options.onLog) options.onLog(logString);
    };

    try {
        addLog("Подготовка изображения пользователя...");
        
        // Получаем сохраненный ID пользователя из браузера (сохраненный в IdentificationModal)
        const userId = localStorage.getItem('userId');
        if (!userId) {
            throw new Error("Пользователь не идентифицирован. Пожалуйста, обновите страницу и пройдите проверку заново.");
        }

        // Конвертируем фото пользователя в base64 для отправки
        const userImagePart = await fileToPart(userImage, 1024) as any;
        const base64Image = `data:${userImagePart.inlineData.mimeType};base64,${userImagePart.inlineData.data}`;

        addLog("Отправка данных на защищенный сервер Netlify...");
        addLog("Ожидание ответа от Gemini API (VPN больше не требуется)...");

        // Обращаемся к нашему новому серверному файлу api/generate.ts
        const response = await fetch('/.netlify/functions/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                userImage: base64Image,
                options: {
                    ...options,
                    onLog: undefined // Функции нельзя передавать через сеть
                }
            })
        });

        const data = await response.json();

        // Проверяем статус ответа
        if (!response.ok) {
            if (data.error === 'LIMIT_EXCEEDED') {
                throw new Error("LIMIT_EXCEEDED"); // Специальный флаг для фронтенда, чтобы показать окно лимита
            }
            throw new Error(data.error || `Ошибка сервера: ${response.status}`);
        }

        addLog("Изображение успешно получено от сервера!");
        return data.image;

    } catch (error: any) {
        addLog(`ОШИБКА: ${error.message || JSON.stringify(error)}`);
        throw error;
    }
};
