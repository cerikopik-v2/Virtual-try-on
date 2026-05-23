import { GoogleGenAI, GenerateContentResponse, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";

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

const dataUrlToPart = (dataUrl: string) => {
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
}

const handleApiResponse = (response: GenerateContentResponse): string => {
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        throw new Error(errorMessage);
    }

    // Find the first image part in any candidate
    for (const candidate of response.candidates ?? []) {
        const imagePart = candidate.content?.parts?.find(part => part.inlineData);
        if (imagePart?.inlineData) {
            const { mimeType, data } = imagePart.inlineData;
            return `data:${mimeType};base64,${data}`;
        }
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation stopped unexpectedly.
Reason: ${finishReason}. This often relates to safety settings.`;
        throw new Error(errorMessage);
    }
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image.
` + (textFeedback ? `The model responded with text: "${textFeedback}"` : "This can happen due to safety filters or if the request is too complex. Please try a different image.");
    throw new Error(errorMessage);
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY! });
const model = 'gemini-3.1-flash-image-preview';
const visionModel = 'gemini-2.5-flash';

export interface PhotoAnalysisResult {
    isAllowed: boolean;
    reason?: string;
    score?: number;
    qualityMessage?: string;
}

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
    let logString = `Starting generation at ${new Date().toISOString()}\\n`;
    const addLog = (msg: string) => {
        const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
        console.log(line);
        logString += line + "\\n";
        if (options.onLog) options.onLog(logString);
    };

    addLog(`Options: ${JSON.stringify({...options, onLog: undefined}, null, 2)}`);
    const imageParts: any[] = [];
    
    // ИЗМЕНЕНИЕ 1: Используем CHARACTER_REFERENCE вместо SUBJECT
    imageParts.push({ text: "[CHARACTER_REFERENCE]" });
    imageParts.push(await fileToPart(userImage));
    addLog(`Added user image [CHARACTER_REFERENCE]`);

    const fetchPart = async (url: string) => {
        if (!url) return null;
        try {
            addLog(`Fetching reference image: ${url}`);
            const res = await fetch(url);
            
            // ИЗМЕНЕНИЕ 2: Проверка на то, что по ссылке действительно картинка, а не HTML
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.startsWith('image/')) {
                addLog(`WARN: Reference URL did not return an image: ${url}. Content-Type: ${contentType}`);
                console.warn(`Reference URL did not return an image: ${url}. Content-Type: ${contentType}`);
                return null;
            }

            const blob = await res.blob();
            addLog(`Successfully fetched reference image: ${url} (size: ${blob.size} bytes)`);
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = error => reject(error);
            });
            const { mimeType, data } = dataUrlToParts(dataUrl);
            return { inlineData: { mimeType, data } };
        } catch (e) {
            console.error("Failed to fetch reference image:", url, e);
            return null;
        }
    };

    // 1. Fetch and append all reference images
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

    for (let i = 0; i < options.accRefs.length; i++) {
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

    // ==========================================
    // 2. CONSTRUCT SCENE AND POSE LOGIC
    // ==========================================
    let environmentAndPose = "";
    
    if (options.isPendant) {
        // ------------------------------------------
        // ACCESSORY OVERRIDE: PENDANT
        // ------------------------------------------
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
        // ------------------------------------------
        // ACCESSORY OVERRIDE: FLAG
        // ------------------------------------------
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
        // ------------------------------------------
        // LOCATION: SECRET (СЕКРЕТНАЯ ЛОКАЦИЯ)
        // ------------------------------------------
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
        // ------------------------------------------
        // LOCATION: STUDIO (СТУДИЙНЫЙ)
        // ------------------------------------------
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
        // ------------------------------------------
        // LOCATION: STUDIO 2 (СТУДИЙНЫЙ 2)
        // ------------------------------------------
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
        // ------------------------------------------
        // LOCATION: MAGAZINE COVER (ОБЛОЖКА ЖУРНАЛА)
        // ------------------------------------------
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
        // ------------------------------------------
        // LOCATION: DEFAULT / FALLBACK
        // ------------------------------------------
        environmentAndPose = `Scene: ${options.bgRef ? "Use the provided [BACKGROUND_REFERENCE]." : "Neutral environment."} 
Pose: ${options.poseText ? options.poseText : "Natural, relaxed pose."}`;
    }

    // 3. Unified Prompt with Strict Priorities
    const promptText = `You are an expert virtual try-on AI. Create a highly realistic composition combining the provided references.

TARGET OUTFIT & SCENE:
- Clothing: ${clothingInfo}
- Accessories: ${options.accNames.length > 0 ? options.accNames.join(', ') : 'None'}
- Environment & Pose Details: ${environmentAndPose}

CRUCIAL RULES (IN ORDER OF PRIORITY):
1. IDENTITY PRESERVATION: Meticulously preserve the exact facial features, face shape, ethnicity, and micro-expressions from the [CHARACTER_REFERENCE]. The pose and body angle MUST be modified according to the Environment & Pose Details, but you must keep the face's likeness intact.
2. GARMENT INTEGRATION: Replace original clothing with ${isTextClothing ? 'the described clothing' : 'the [CLOTHING_REFERENCE]'}${options.accNames.length > 0 ? ' and the provided [ACCESSORY_REFERENCE](s)' : ''}. Ensure natural fit, fabric draping, and realistic shadows.
3. SCENE COHESION: The person must look physically present in the environment. 
   - If a [BACKGROUND_REFERENCE] is provided, precisely match its lighting source, color temperature, and direction. 
   - If generating a new background, ensure the subject's lighting matches the generated environment's global illumination.
   - Add realistic ambient occlusion and contact shadows where the subject interacts with the environment or props.
4. COMPOSITION: Render in a 3:4 aspect ratio, showing the person in a medium shot (waist or mid-thigh up).`;

    addLog(`Prepared Prompt: \\n${promptText}`);
    addLog(`Calling Gemini API (model: ${model})...`);

    try {
        const response = await ai.models.generateContent({
            model,
            contents: { parts: [...imageParts, { text: promptText }] },
            config: {
                responseModalities: [Modality.IMAGE],
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            },
        });
        
        addLog(`Received response from Gemini API.`);
        return handleApiResponse(response);
    } catch (apiError: any) {
        addLog(`API ERROR: ${apiError.message || JSON.stringify(apiError)}`);
        throw apiError;
    }
};