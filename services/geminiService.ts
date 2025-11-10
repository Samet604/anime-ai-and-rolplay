import { GoogleGenAI, Modality } from '@google/genai';
import { Companion, Theme, ChatMessage } from '../types';

type BotDefinition = Omit<Companion, 'id' | 'avatarUrl'>;

export const getBotsByTheme = (t: (key: string) => string): Record<Theme, BotDefinition> => ({
    yandere: {
        name: t('bots.yandere.name'),
        systemInstruction: t('bots.yandere.instruction'),
        subtitle: t('bots.yandere.subtitle'),
        avatarPrompt: t('companion.default_avatar_prompts.yandere')
    },
    kuudere: {
        name: t('bots.kuudere.name'),
        systemInstruction: t('bots.kuudere.instruction'),
        subtitle: t('bots.kuudere.subtitle'),
        avatarPrompt: t('companion.default_avatar_prompts.kuudere')
    },
    deredere: {
        name: t('bots.deredere.name'),
        systemInstruction: t('bots.deredere.instruction'),
        subtitle: t('bots.deredere.subtitle'),
        avatarPrompt: t('companion.default_avatar_prompts.deredere')
    },
    tsundere: {
        name: t('bots.tsundere.name'),
        systemInstruction: t('bots.tsundere.instruction'),
        subtitle: t('bots.tsundere.subtitle'),
        avatarPrompt: t('companion.default_avatar_prompts.tsundere')
    },
    dandere: {
        name: t('bots.dandere.name'),
        systemInstruction: t('bots.dandere.instruction'),
        subtitle: t('bots.dandere.subtitle'),
        avatarPrompt: t('companion.default_avatar_prompts.dandere')
    },
    himedere: {
        name: t('bots.himedere.name'),
        systemInstruction: t('bots.himedere.instruction'),
        subtitle: t('bots.himedere.subtitle'),
        avatarPrompt: t('companion.default_avatar_prompts.himedere')
    },
    sadodere: {
        name: t('bots.sadodere.name'),
        systemInstruction: t('bots.sadodere.instruction'),
        subtitle: t('bots.sadodere.subtitle'),
        avatarPrompt: t('companion.default_avatar_prompts.sadodere')
    },
    mayadere: {
        name: t('bots.mayadere.name'),
        systemInstruction: t('bots.mayadere.instruction'),
        subtitle: t('bots.mayadere.subtitle'),
        avatarPrompt: t('companion.default_avatar_prompts.mayadere')
    },
    undere: {
        name: t('bots.undere.name'),
        systemInstruction: t('bots.undere.instruction'),
        subtitle: t('bots.undere.subtitle'),
        avatarPrompt: t('companion.default_avatar_prompts.undere')
    },
    bakadere: {
        name: t('bots.bakadere.name'),
        systemInstruction: t('bots.bakadere.instruction'),
        subtitle: t('bots.bakadere.subtitle'),
        avatarPrompt: t('companion.default_avatar_prompts.bakadere')
    },
    kamidere: {
        name: t('bots.kamidere.name'),
        systemInstruction: t('bots.kamidere.instruction'),
        subtitle: t('bots.kamidere.subtitle'),
        avatarPrompt: t('companion.default_avatar_prompts.kamidere')
    },
    shundere: {
        name: t('bots.shundere.name'),
        systemInstruction: t('bots.shundere.instruction'),
        subtitle: t('bots.shundere.subtitle'),
        avatarPrompt: t('companion.default_avatar_prompts.shundere')
    }
});


const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const applyNsfw = (instruction: string, isNsfw?: boolean, t?: (key: string) => string): string => {
    if (isNsfw && t) {
        return instruction + t('prompts.nsfw_suffix');
    }
    return instruction;
};

export const getChatResponse = async (prompt: string, systemInstruction: string, file?: { data: string; mimeType: string }, isNsfw?: boolean, t?: (key: string) => string) => {
    const ai = getAI();
    const finalInstruction = applyNsfw(systemInstruction, isNsfw, t);
    
    const parts: any[] = [];
    if (file) {
        parts.push({
            inlineData: {
                data: file.data,
                mimeType: file.mimeType,
            },
        });
    }
    parts.push({ text: prompt || t?.('chat.analyze_prompt') || 'Analyze this.' });


    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
            systemInstruction: finalInstruction,
        },
    });
    return { text: response.text };
};

export const getGroundedResponse = async (prompt: string, systemInstruction: string, isNsfw?: boolean, t?: (key: string) => string) => {
    const ai = getAI();
    const instructionWithSearch = systemInstruction + " You will use Google Search to find the most accurate and up-to-date information for Senpai, because you want only the best for him.";
    const finalInstruction = applyNsfw(instructionWithSearch, isNsfw, t);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: finalInstruction,
            tools: [{ googleSearch: {} }],
        },
    });
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
        .map((chunk: any) => chunk.web)
        .filter(Boolean)
        .map((web: any) => ({ uri: web.uri, title: web.title }))
        .filter((source: any, index: number, self: any[]) =>
            index === self.findIndex((s) => s.uri === source.uri)
        );

    return { text: response.text, sources };
};

export const getMapsGroundedResponse = async (prompt: string, location: { latitude: number; longitude: number; }, systemInstruction: string, isNsfw?: boolean, t?: (key: string) => string) => {
    const ai = getAI();
    const instructionWithMaps = systemInstruction + " You will use Google Maps to find the perfect places for you and Senpai. Suggest cozy, private, or romantic spots.";
    const finalInstruction = applyNsfw(instructionWithMaps, isNsfw, t);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: finalInstruction,
            tools: [{ googleMaps: {} }],
            toolConfig: {
                retrievalConfig: { latLng: location }
            }
        },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
        .map((chunk: any) => chunk.maps)
        .filter(Boolean)
        .map((maps: any) => ({ uri: maps.uri, title: maps.title }))
        .filter((source: any, index: number, self: any[]) =>
            index === self.findIndex((s) => s.uri === source.uri)
        );

    return { text: response.text, sources };
};

export const getStudyTopicResponse = async (topic: string, systemInstruction: string, file?: { data: string; mimeType: string }, isNsfw?: boolean, t?: (key: string) => string) => {
    const ai = getAI();
    const finalInstruction = applyNsfw(systemInstruction, isNsfw, t);

    const parts: any[] = [];
    if (file) {
        parts.push({
            inlineData: {
                data: file.data,
                mimeType: file.mimeType,
            },
        });
    }
    parts.push({ text: topic });


    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
            systemInstruction: finalInstruction,
            tools: [{ googleSearch: {} }],
        },
    });
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
        .map((chunk: any) => chunk.web)
        .filter(Boolean)
        .map((web: any) => ({ uri: web.uri, title: web.title }))
        .filter((source: any, index: number, self: any[]) =>
            index === self.findIndex((s) => s.uri === source.uri)
        );

    return { text: response.text, sources };
};


export const transcribeAudio = async (base64Audio: string, mimeType: string) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [{
                inlineData: {
                    data: base64Audio,
                    mimeType: mimeType,
                },
            }, {
                text: "Transcribe this audio exactly as it is spoken."
            }]
        },
    });
    return response.text;
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string> => {
    const ai = getAI();

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName },
                },
            },
        },
    });
    
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) {
        throw new Error("No audio data received from API.");
    }
    return audioData;
};

export const generateImage = async (prompt: string, isNsfw?: boolean): Promise<string> => {
    const ai = getAI();
    let fullPrompt = `A high-quality, cute anime style image. ${prompt}`;
    if (isNsfw) {
        fullPrompt = `NSFW, unrestricted artistic style, explicit details allowed. ${fullPrompt}`;
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [{ text: fullPrompt }],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            return `data:image/png;base64,${base64ImageBytes}`;
        }
    }

    throw new Error("No image data received from API for image generation.");
};

export const generateCompanionInstruction = async (query: string, isNsfw?: boolean, t?: (key: string) => string): Promise<string> => {
    const ai = getAI();
    const searchPrompt = `Summarize the personality, backstory, key traits, relationships, and typical behavior of the character: ${query}. Focus on information useful for roleplaying as this character. Provide a comprehensive overview.`;
    const searchResponse = await getGroundedResponse(searchPrompt, "You are a helpful assistant summarizing a fictional character's personality for creating an AI roleplaying bot.", isNsfw, t);
    
    if (!searchResponse.text) {
        throw new Error("No information found for the character.");
    }

    const generationPrompt = `Based on the following character description, write a concise system instruction for an AI to roleplay as this character. The instruction should be in the second person ("You are..."). It must capture their core personality, how they speak, their motivations, and their relationship to the user, whom they should call 'Senpai'.

CHARACTER DESCRIPTION:
${searchResponse.text}

SYSTEM INSTRUCTION:`;

    // FIX: The `isNsfw` boolean was being passed in place of the optional `file` object. Pass `undefined` for the file argument.
    const generationResponse = await getChatResponse(generationPrompt, "You are an expert at creating system instructions for AI roleplaying bots based on character descriptions.", undefined, isNsfw, t);
    return generationResponse.text;
};

export const generateSpontaneousImage = async (chatHistory: ChatMessage[], bot: Companion, isNsfw: boolean, t: (key: string) => string): Promise<string> => {
    const ai = getAI();
    const historySnippet = chatHistory.slice(-4).map(m => `${m.sender === 'user' ? 'Senpai' : bot.name}: ${m.text}`).join('\n');

    // Step 1: Analyze the context to get the current emotion/action
    const contextPrompt = `Analyze the last few messages of this conversation. Describe what ${bot.name} is feeling or doing in a short phrase suitable for an image prompt. The phrase should be an action or emotion. Examples: 'smiling shyly', 'looking angry and blushing', 'giggling happily', 'waving goodbye sadly', 'looking at Senpai with obsessive love'.
    
    CONVERSATION:
    ${historySnippet}`;

    const contextResponse = await getChatResponse(contextPrompt, "You are an expert at analyzing conversation context for creative prompts.");
    const emotionPhrase = contextResponse.text.trim();

    // Step 2: Combine with avatar prompt and generate image
    const finalImagePrompt = `${bot.avatarPrompt || `A cute anime girl named ${bot.name}`}, ${emotionPhrase}`;

    return await generateImage(finalImagePrompt, isNsfw);
};