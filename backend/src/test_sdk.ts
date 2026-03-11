import { GoogleGenerativeAI } from "@google/generative-ai";

const key = "AIzaSyCEb9uL6A4cG_upvzgWNwMWw-q-9AWOAh4";

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
