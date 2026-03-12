import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

const listModels = async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("ERRO: GEMINI_API_KEY não encontrada no .env");
        return;
    }

    const maskedKey = `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`;
    console.log(`Usando chave: ${maskedKey}`);

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Note: The SDK might not expose a direct listModels, but we can try to access the discovery endpoint via fetch if needed.
        // However, we'll try to brute-force test the most common stable names.

        console.log("--- DIAGNÓSTICO DE MODELOS GEMINI ---");
        const testModels = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-pro',
            'gemini-1.5-pro-latest'
        ];

        for (const modelName of testModels) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Olá, responda apenas 'OK'");
                console.log(`[SUCESSO] Modelo '${modelName}' está disponível.`);
            } catch (err: any) {
                console.log(`[FALHA] Modelo '${modelName}' retornou erro: ${err.message}`);
            }
        }
    } catch (error: any) {
        console.error("Erro crítico no diagnóstico:", error.message);
    }
};

listModels();
