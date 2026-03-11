import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config({ override: true });

const key = process.env.GEMINI_API_KEY || '';

const test = async () => {
    const genAI = new GoogleGenerativeAI(key);
    const models = [
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest"
    ];

    for (const modelName of models) {
        console.log(`Tentando SDK com modelo: ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Oi");
            console.log(`SUCESSO com ${modelName}:`, result.response.text());
            return;
        } catch (e: any) {
            console.log(`ERRO com ${modelName}:`, e.message);
        }
    }
};

test();
