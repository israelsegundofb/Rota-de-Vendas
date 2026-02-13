import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

// Inicialização segura: o SDK só é instanciado quando necessário
let genAI: any = null;

const getAIClient = () => {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!genAI && apiKey) {
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
};

export const generateAIContent = async (modelName: string, prompt: string, useMaps: boolean = false) => {
    try {
        const client = getAIClient();
        if (!client) throw new Error("GEMINI_API_KEY não configurada no servidor.");

        const model = client.getGenerativeModel({
            model: modelName,
            tools: useMaps ? [{ googleSearchRetrieval: {} }] : undefined // Nota: Cloud Run suporta Search Grounding via Google Search Retrieval
        });

        const result = await model.generateContent(prompt);
        return result.response;
    } catch (error) {
        console.error('[AI SERVICE ERROR]:', error);
        throw error;
    }
};
