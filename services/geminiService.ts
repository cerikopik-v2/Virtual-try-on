// Больше никаких импортов от @google/genai здесь!

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

export interface PhotoAnalysisResult {
    isAllowed: boolean;
    reason?: string;
    score?: number;
    qualityMessage?: string;
}

// ============================================================================
// НОВАЯ ЛОГИКА АНАЛИЗА: Отправляем на наш сервер (api/analyze.ts)
// ============================================================================
export const analyzePhoto = async (file: File): Promise<PhotoAnalysisResult> => {
    try {
        const userImagePart = await fileToPart(file, 800) as any;
        const base64Image = `data:${userImagePart.inlineData.mimeType};base64,${userImagePart.inlineData.data}`;

        const response = await fetch('/.netlify/functions/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });

        if (!response.ok) {
            throw new Error('Analysis request failed');
        }

        return await response.json();
    } catch (error) {
        console.error("Analysis failed on client, applying fallback:", error);
        return { isAllowed: true, score: 7, qualityMessage: "Фото приемлемо (анализ пропущен)" };
    }
};

// ============================================================================
// ГЕНЕРАЦИЯ (Без изменений)
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
        
        const userId = localStorage.getItem('userId');
        if (!userId) {
            throw new Error("Пользователь не идентифицирован. Пожалуйста, обновите страницу и пройдите проверку заново.");
        }

        const userImagePart = await fileToPart(userImage, 1024) as any;
        const base64Image = `data:${userImagePart.inlineData.mimeType};base64,${userImagePart.inlineData.data}`;

        addLog("Отправка данных на защищенный сервер Netlify...");
        addLog("Ожидание ответа от Gemini API (VPN больше не требуется)...");

        const response = await fetch('/.netlify/functions/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                userImage: base64Image,
                options: {
                    ...options,
                    onLog: undefined
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            if (data.error === 'LIMIT_EXCEEDED') {
                throw new Error("LIMIT_EXCEEDED");
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
