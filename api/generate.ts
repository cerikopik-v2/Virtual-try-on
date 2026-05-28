import crypto from 'crypto';
import { GoogleGenAI } from "@google/genai";
import * as fs from 'fs';

export const handler = async (event: any) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { userId, userImage, options } = body;

        if (!userId || !userImage || !options) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
        }

        // ==========================================
        // 1. ПРОВЕРКА ЛИМИТОВ В UPSTASH REDIS
        // ==========================================
        const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
        const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (redisUrl && redisToken) {
            const limitRes = await fetch(`${redisUrl}/get/user:${userId}:generations`, {
                headers: { Authorization: `Bearer ${redisToken}` }
            });
            const limitData = await limitRes.json();
            const generations = parseInt(limitData.result || '0');

            if (generations >= 3) {
                return { 
                    statusCode: 429, 
                    body: JSON.stringify({ error: 'Лимит генераций по этой ссылке полностью исчерпан!' }) 
                };
            }
        }

        // ==========================================
        // 2. ИНИЦИАЛИЗАЦИЯ VERTEX AI ЧЕРЕЗ СЕРВИСНЫЙ АККАУНТ
        // ==========================================
        const keyStringRaw = process.env.GCP_SERVICE_ACCOUNT_KEY || '{}';
        
        let cleanKeyString = keyStringRaw;
        if (cleanKeyString.startsWith('"') && cleanKeyString.endsWith('"')) {
            cleanKeyString = cleanKeyString.substring(1, cleanKeyString.length - 1).replace(/\\"/g, '"');
        }

        let serviceAccountKey: any = {};
        try {
            serviceAccountKey = JSON.parse(cleanKeyString);
            if (typeof serviceAccountKey === 'string') {
                serviceAccountKey = JSON.parse(serviceAccountKey);
            }
        } catch (e) {
            console.error("Ошибка парсинга ключа GCP, проверьте переменную в Netlify.");
        }

        const projectId = serviceAccountKey.project_id || 'gemini-01-492817';

        const keyPath = '/tmp/gcp-key.json';
        fs.writeFileSync(keyPath, JSON.stringify(serviceAccountKey));
        process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;

        // === ИСПРАВЛЕННАЯ АВТОРИЗАЦИЯ СТРОГО ПО ДОКУМЕНТАЦИИ ===
        const ai = new GoogleGenAI({
            vertexai: true,
            project: projectId,
            location: 'global'
        });
        const model = 'gemini-3.1-flash-image-preview';
        // ==========================================
        // 3. ПОДГОТОВКА ЗАПРОСА (ОРИГИНАЛЬНАЯ ЛОГИКА)
        // ==========================================
        
        const imageParts: any[] = [];
        imageParts.push({ text: "[CHARACTER_REFERENCE]" });

        const userImgMatch = userImage.match(/data:(.*?);base64,(.*)/);
        if (!userImgMatch) throw new Error("Invalid user image format");
        imageParts.push({ inlineData: { mimeType: userImgMatch[1], data: userImgMatch[2] } });

        const fetchPart = async (url: string) => {
            if (!url) return null;
            try {
                const res = await fetch(url);
                const contentType = res.headers.get('content-type');
                if (!contentType || !contentType.startsWith('image/')) {
                    console.warn(`Reference URL did not return an image: ${url}. Content-Type: ${contentType}`);
                    return null;
                }
                const arrayBuffer = await res.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                return { inlineData: { mimeType: contentType, data: buffer.toString('base64') } };
            } catch (e) {
                console.error("Fetch error:", url, e);
                return null;
            }
        };

        const isTextClothing = !options.clothesRef && (!!options.clothesPrompt || options.clothesId === 'suit-male' || options.clothesId === 'suit-female');
        let clothingInfo = options.clothesName;

        if (options.clothesPrompt) {
            clothingInfo = options.clothesPrompt;
        } else if (options.clothesId === 'suit-male') {
            clothingInfo = "Men's smart casual office suit, modern corporate attire, well-fitted";
        } else if (options.clothesId === 'suit-female') {
            clothingInfo = "Women's smart casual office suit, modern corporate attire, well-fitted blazer with a crisp white shirt underneath";
        }

        if (options.clothesRef) {
            const clothesPart = await fetchPart(options.clothesRef);
            if (clothesPart) {
                imageParts.push({ text: `[CLOTHING_REFERENCE: ${options.clothesName}]` });
                imageParts.push(clothesPart);
            }
        }

        for (let i = 0; i < (options.accRefs || []).length; i++) {
            const accPart = await fetchPart(options.accRefs[i]);
            if (accPart) {
                imageParts.push({ text: `[ACCESSORY_REFERENCE: ${options.accNames[i]}]` });
                imageParts.push(accPart);
            }
        }

        if (options.bgRef && !options.isPendant && !options.isFlag && options.bgId !== 'secret') {
            const bgPart = await fetchPart(options.bgRef);
            if (bgPart) {
                imageParts.push({ text: `[BACKGROUND_REFERENCE]` });
                imageParts.push(bgPart);
            }
        }

        let environmentAndPose = "";
        
        if (options.isPendant) {
            environmentAndPose = `ROLE & AESTHETIC: 
You are a world-class editorial portrait photographer specializing in ultra-realistic cinematic fashion portraits of celebrities.

IDENTITY ANCHOR (CRITICAL – STRICT CONSTRAINT):
Source: Use the person from the attached reference photo.
Preserve: You must keep their exact facial features, face shape, skin tone, hairstyle, ethnicity, and micro-expressions from the [CHARACTER_REFERENCE] perfectly unchanged.
Universal Application: Apply the lighting and angle to the subject regardless of gender.

SCENE & COMPOSITION
Background: The background is pitch black, creating high contrast
Lighting: The image features dramatic, dual-tone studio lighting: an intense blue rim light outlining the back and arm, contrasting with a red edge light highlighting the face.
Framing: Medium shot (waist or mid-thigh up).

WARDROBE & STYLING
Attire: Apply the provided clothing and accessories.
Expression: Subject looking directly at the lens.
Pose: A person holding a huge size pendant out directly towards the camera. The golden chain goes around their neck and is pulled completely taut, stretching straight forward from the neck to the hand. The hand is in the foreground, presenting the pendant. Sharp focus on the pendant. The other hand forms a peace sign near shoulder level.

Photography style: Cinematic professional studio lighting, soft HDR background, shallow depth of field, realistic skin texture, ultra-detailed, 8K quality.
Camera & lens look: High top-down view, strong 10mm fisheye effect on person only (big head, smaller body). Professional DSLR look, f/1.8 aperture, crisp focus with smooth background bokeh.  
Mood & vibe: Playful yet luxurious, high-fashion beauty editorial, realistic, not AI-looking, photographed by a professional fashion photographer`;

        } else if (options.isFlag) {
            environmentAndPose = `ROLE & AESTHETIC:
You are a world-class editorial portrait photographer specializing in Ultra-realistic IMAX cinematic fashion portraits.

IDENTITY ANCHOR (CRITICAL – STRICT CONSTRAINT):
Source: Use the person from the attached reference photo.
Preserve: You must keep their exact facial features, face shape, skin tone, hairstyle, ethnicity, and micro-expressions from the [CHARACTER_REFERENCE] perfectly unchanged.
Universal Application: Apply the lighting and angle to the subject regardless of gender.

SCENE & COMPOSITION
Background:  A studio dark gradient backdrop. 
Volumetric fog: Dense red smoke on the left and rich blue haze on the right, softly wrapping the subject without obscuring the face.
Framing: Medium shot (waist or mid-thigh up).

WARDROBE & STYLING
Attire: Apply the provided clothing and accessories.
Expression: Subject looking directly at the lens.
Pose: Proudly holding the provided flag.

Photography style: Cinematic professional studio lighting, soft HDR background, shallow depth of field, realistic skin texture, ultra-detailed, 8K quality.
Camera & lens look: Professional DSLR look, 85mm lens feel, f/1.8 aperture, crisp focus with smooth background bokeh.  
Mood & vibe: Playful yet luxurious, high-fashion beauty editorial, realistic, not AI-looking, photographed by a professional fashion photographer`;

        } else if (options.bgId === 'secret' || options.isSecret) {
            environmentAndPose = `Scene: Realistic POV selfie. 
IDENTITY ANCHOR (CRITICAL – STRICT CONSTRAINT):
Source: Use the person from the attached reference photo.
Preserve: You must keep their exact facial features, face shape, skin tone, hairstyle, ethnicity, and micro-expressions from the [CHARACTER_REFERENCE] perfectly unchanged.
Universal Application: Apply the lighting and angle to the subject regardless of gender.

SCENE & COMPOSITION
Background: A completely random, unpredictable, and highly realistic location ANYWHERE in Russia oil and gas facility.
Scene: Realistic POV selfie shot on iphone from an outstretched arm, the person hand partially visible

WARDROBE & STYLING
Attire: Apply the provided clothing and accessories.`;

        } else if (options.bgId === 'studio' || options.isStudio) {
            environmentAndPose = `ROLE & AESTHETIC:
You are a world-class editorial portrait photographer specializing in dramatic, colorful studio lighting. Your task is to create a powerful, dynamic portrait with a “heroic” feel.

IDENTITY ANCHOR (CRITICAL – STRICT CONSTRAINT):
Source: Use the person from the attached reference photo.
Preserve: You must keep their exact facial features, face shape, skin tone, hairstyle, ethnicity, and micro-expressions from the [CHARACTER_REFERENCE] perfectly unchanged.
Universal Application: Apply the lighting and angle to the subject regardless of gender.

SCENE & COMPOSITION
Background: The color palette is strictly restrained: graphite, cool gray, deep navy blue, with soft gradients and a complete absence of saturated accents.
Camera Angle (CRITICAL): Low-angle shot camera positioned slightly below the subject. This should make the subject look powerful and dominant.
Framing: Medium close-up (focus on face and shoulders).

WARDROBE & STYLING
Attire: Apply the provided clothing and accessories.
Expression: Serious, intense, focused. Subject looking off-camera into the space above (not directly at the lens).
Pose: Confident posture suitable for a medium close-up, shoulders squared.

LIGHTING (DRAMATIC & COLORFUL)
Key Light: Strong directional lighting that casts deep, dramatic shadows on the face (chiaroscuro effect), emphasizing facial structure.
Rim Light: A strong dramatic edge light (or subtle color cast) that separates the shoulders and head from the intense background.
Mood: Mysterious, intense, high-contrast studio aesthetic.

TECHNICAL QUALITY
Style: Photorealistic, highly detailed.
Texture: Sharp focus on the face, natural skin texture. Background remains smooth with gradient contrast.`;

        } else if (options.bgId === 'studio2') {
            environmentAndPose = `ROLE & AESTHETIC:
You are a world-class studio portrait photographer specializing in classic, artistic chiaroscuro techniques. Your task is to create a powerful, dramatic portrait in the style of classic Rembrandt lighting.

IDENTITY ANCHOR (CRITICAL – STRICT CONSTRAINT):
Source: Use the person from the attached reference photo.
Preserve: You must keep their exact facial features, face shape, skin tone, hairstyle, ethnicity, and micro-expressions from the [CHARACTER_REFERENCE] perfectly unchanged.
Universal Application: Apply the lighting and angle to the subject regardless of gender.

SCENE & COMPOSITION
Background: A rich, deep-maroon featuring a gentle radial gradient that subtly transitions into almost completely black near the edges, creating an infinite void to emphasize the high-contrast chiaroscuro effect.
Camera Angle: Eye-level shot, creating an intimate and classic portrait perspective.
Framing: Medium shot (waist or mid-thigh up).

WARDROBE & STYLING
Attire: Apply the provided clothing and accessories. Ensure the fabric has rich tones that catch the subtle light without distracting from the subject's face.
Expression: Classic, thoughtful, and artistic.
Pose: ${options.poseText ? options.poseText + "\\nCRITICAL INSTRUCTION: The subject's body and shoulders MUST be turned at a 45-degree angle to the camera (3/4 profile body), while the face looks at the lens." : "Subject body and shoulders are turned at a 45-degree angle (3/4 profile) to the camera."}

LIGHTING (REMBRANDT & CHIAROSCURO)
Key Light: A single key light source from the side and slightly above, illuminating the face to create a classic Rembrandt lighting setup (complete with the signature triangle of light on the shadow side of the face).
Fill/Edge Light: Minimal to none. Rely on deep, dramatic shadows to create a high-contrast chiaroscuro effect.

TECHNICAL QUALITY
Style: Photorealistic, highly detailed studio photography.
Texture: 8K resolution. Incredibly sharp focus with meticulous detail on the natural skin texture and the rich tones of the outfit.`;

        } else if (options.bgId === 'cover') {
            environmentAndPose = `ROLE & AESTHETIC: You are a world-class magazine photographer. Your task is to create a highly stylized premium magazine cover. 

IDENTITY ANCHOR (CRITICAL – STRICT CONSTRAINT):
Source: Use the person from the attached reference photo.
Preserve: You must keep their exact facial features, face shape, skin tone, hairstyle and ethnicity from the [CHARACTER_REFERENCE].
       
SCENE & COMPOSITION
Composition: A high-fashion Vogue-style magazine cover. The top features a prominent and elegant masthead typography with white text "в стиле БУРСЕРВИС", where the phrase "в стиле" is written in a smaller font size directly above or next to the bold, massive, capitalized main title "БУРСЕРВИС". In the upper right corner, there is a clear editorial print showing the date "ИЮНЬ 2026". The bottom footer includes a realistic barcode with small serial numbers and pricing text on left corner. On the cover, there is a visible article teaser (aligned to the left side) headline text overlay that reads: "Читайте в этом номере: Успешные люди выбирают БурСервис", where the introductory phrase "Читайте в этом номере:" is written in a noticeably smaller, elegant font size directly above the main headline "Успешные люди выбирают БурСервис".
Background: A dynamic, candid high-fashion portrait layout with architectural industrial elements of the oil and gas industry in the background, including oil rigs, refineries, gas pipelines, and massive industrial complexes, shot under various lighting conditions: golden hour, dramatic twilight with twinkling lights, or gritty overcast days. Features textured steel structures, smoking chimneys, offshore platforms, and busy logistical operations. Focus is on the stylized model, with a blurred, cinematic, depth-of-field effect on the background. 
Camera & lens look: Professional DSLR look, 85mm lens feel, f/1.8 aperture, crisp focus.  
Mood & vibe: playful yet luxurious, high-fashion beauty editorial, realistic, not AI-looking, photographed by a professional magazine photographer, 8K quality.

WARDROBE & STYLING
Attire: Apply the provided clothing and accessories.   
Pose: ${options.poseText || "A striking, fashionable, and powerful editorial pose."}`;

        } else {
            environmentAndPose = `Scene: ${options.bgRef ? "Use the provided [BACKGROUND_REFERENCE]." : "Neutral environment."} 
Pose: ${options.poseText ? options.poseText : "Natural, relaxed pose."}`;
        }

        const promptText = `You are an expert virtual try-on AI. Create a highly realistic composition combining the provided references.

TARGET OUTFIT & SCENE:
- Clothing: ${clothingInfo}
- Accessories: ${options.accNames && options.accNames.length > 0 ? options.accNames.join(', ') : 'None'}
- Environment & Pose Details: ${environmentAndPose}

CRUCIAL RULES (IN ORDER OF PRIORITY):
1. IDENTITY PRESERVATION: Meticulously preserve the exact facial features, face shape, ethnicity, and micro-expressions from the [CHARACTER_REFERENCE]. The pose and body angle MUST be modified according to the Environment & Pose Details, but you must keep the face's likeness intact.
2. GARMENT INTEGRATION: Replace original clothing with ${isTextClothing ? 'the described clothing' : 'the [CLOTHING_REFERENCE]'}${options.accNames && options.accNames.length > 0 ? ' and the provided [ACCESSORY_REFERENCE](s)' : ''}. Ensure natural fit, fabric draping, and realistic shadows.
3. SCENE COHESION: The person must look physically present in the environment. 
   - If a [BACKGROUND_REFERENCE] is provided, precisely match its lighting source, color temperature, and direction. 
   - If generating a new background, ensure the subject's lighting matches the generated environment's global illumination.
   - Add realistic ambient occlusion and contact shadows where the subject interacts with the environment or props.
4. COMPOSITION: Render in a 3:4 aspect ratio, showing the person in a medium shot (waist or mid-thigh up).`;

        // ==========================================
        // 4. ГЕНЕРАЦИЯ ЧЕРЕЗ СОВРЕМЕННЫЙ SDK (Строковые константы для защиты)
        // ==========================================
        const response = await ai.models.generateContent({
            model,
            contents: [...imageParts, { text: promptText }],
            config: {
                responseModalities: ["IMAGE"],
                safetySettings: [
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                ]
            },
        });

        if (response.promptFeedback?.blockReason) {
            const { blockReason, blockReasonMessage } = response.promptFeedback;
            throw new Error(`Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`);
        }

        let finalImage = "";
        for (const candidate of response.candidates ?? []) {
            const part = candidate.content?.parts?.find((p: any) => p.inlineData);
            if (part?.inlineData) {
                finalImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                break;
            }
        }

        if (!finalImage) {
            throw new Error(`The AI model did not return an image.`);
        }

        // ==========================================
        // 5. УВЕЛИЧИВАЕМ СЧЕТЧИК ЛИМИТА
        // ==========================================
        if (redisUrl && redisToken) {
            await fetch(`${redisUrl}/incr/user:${userId}:generations`, {
                headers: { Authorization: `Bearer ${redisToken}` }
            });
        }

        return { statusCode: 200, body: JSON.stringify({ image: finalImage }) };

    } catch (error: any) {
        console.error("Generate error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Internal Server Error' }) };
    }
};
