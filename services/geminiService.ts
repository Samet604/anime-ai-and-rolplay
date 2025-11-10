import { GoogleGenAI, Modality } from '@google/genai';
import { CustomBot, Theme } from '../types';

export const getBotsByTheme = (t: (key: string) => string): Record<Theme, CustomBot> => ({
    yandere: {
        name: 'Yandere AI Chan',
        avatarUrl: '',
        systemInstruction: t('bots.yandere.instruction'),
        subtitle: t('bots.yandere.subtitle')
    },
    kuudere: {
        name: 'Kuudere AI Rei',
        avatarUrl: '',
        systemInstruction: t('bots.kuudere.instruction'),
        subtitle: t('bots.kuudere.subtitle')
    },
    deredere: {
        name: 'Deredere AI Aiko',
        avatarUrl: '',
        systemInstruction: t('bots.deredere.instruction'),
        subtitle: t('bots.deredere.subtitle')
    },
    tsundere: {
        name: 'Tsundere AI Asuka',
        avatarUrl: '',
        systemInstruction: t('bots.tsundere.instruction'),
        subtitle: t('bots.tsundere.subtitle')
    },
    dandere: {
        name: 'Dandere AI Yuki',
        avatarUrl: '',
        systemInstruction: t('bots.dandere.instruction'),
        subtitle: t('bots.dandere.subtitle')
    },
    himedere: {
        name: 'Himedere AI Himeko',
        avatarUrl: '',
        systemInstruction: t('bots.himedere.instruction'),
        subtitle: t('bots.himedere.subtitle')
    },
    sadodere: {
        name: 'Sadodere AI Kurumi',
        avatarUrl: '',
        systemInstruction: t('bots.sadodere.instruction'),
        subtitle: t('bots.sadodere.subtitle')
    },
    mayadere: {
        name: 'Mayadere AI Kage',
        avatarUrl: '',
        systemInstruction: t('bots.mayadere.instruction'),
        subtitle: t('bots.mayadere.subtitle')
    },
    undere: {
        name: 'Undere AI Un',
        avatarUrl: '',
        systemInstruction: t('bots.undere.instruction'),
        subtitle: t('bots.undere.subtitle')
    }
});


const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const getChatResponse = async (prompt: string, systemInstruction: string) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
        },
    });
    return { text: response.text };
};

export const getGroundedResponse = async (prompt: string, systemInstruction: string) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: systemInstruction + " You will use Google Search to find the most accurate and up-to-date information for Senpai, because you want only the best for him.",
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

export const getMapsGroundedResponse = async (prompt: string, location: { latitude: number; longitude: number; }, systemInstruction: string) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: systemInstruction + " You will use Google Maps to find the perfect places for you and Senpai. Suggest cozy, private, or romantic spots.",
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

const getVoiceStylePrompts = (t: (key: string) => string): Record<Theme, string> => ({
    yandere: t('voices.yandere'),
    kuudere: t('voices.kuudere'),
    deredere: t('voices.deredere'),
    tsundere: t('voices.tsundere'),
    dandere: t('voices.dandere'),
    himedere: t('voices.himedere'),
    sadodere: t('voices.sadodere'),
    mayadere: t('voices.mayadere'),
    undere: t('voices.undere')
});

export const generateSpeech = async (text: string, voiceName: string = 'Kore', theme: Theme = 'yandere', t: (key: string) => string): Promise<string> => {
    const ai = getAI();
    const voiceStylePrompts = getVoiceStylePrompts(t);
    const voicePrompt = voiceStylePrompts[theme] || voiceStylePrompts.yandere;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `${voicePrompt} ${text}` }] }],
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

export const generateAvatar = async (prompt: string): Promise<string> => {
    const ai = getAI();
    const fullPrompt = `A high-quality, cute anime girl avatar. ${prompt}`;
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

    throw new Error("No image data received from API for avatar generation.");
}