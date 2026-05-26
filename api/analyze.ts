import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import * as fs from 'fs';

export const handler = async (event: any) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { image } = JSON.parse(event.body || '{}');
        if (!image) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing image' }) };
        }

        // Настройка авторизации через сервисный аккаунт
        const keyString = process.env.GCP_SERVICE_ACCOUNT_KEY || '{}';
        const serviceAccountKey = JSON.parse(keyString);

        const keyPath = '/tmp/gcp-key.json';
        fs.writeFileSync(keyPath, keyString);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;

        // Инициализация легкого SDK для анализа фото на глобальном эндпоинте Vertex
        const ai = new GoogleGenAI({
            vertexai: {
                project: serviceAccountKey.project_id,
                location: 'global'
            }
        });

        const match = image.match(/data:(.*?);base64,(.*)/);
        if (!match) throw new Error("Invalid image format");
        const imagePart = { inlineData: { mimeType: match[1], data: match[2] } };

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
  "score": 7,
  "qualityMessage": "короткий комментарий на русском описывающий главную причину оценки" 
}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: promptText }] },
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

        if (text.startsWith("```json")) {
            text = text.replace(/^```json\n/, "").replace(/\n```$/, "");
        } else if (text.startsWith("```")) {
            text = text.replace(/^```\n/, "").replace(/\n```$/, "");
        }

        const result = JSON.parse(text);
        return { statusCode: 200, body: JSON.stringify(result) };

    } catch (error: any) {
        console.error("Analyze error:", error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ isAllowed: true, score: 7, qualityMessage: "Фото приемлемо (серверная проверка пропущена)" }) 
        };
    }
};
