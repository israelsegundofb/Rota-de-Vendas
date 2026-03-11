import { GoogleGenerativeAI } from "@google/generative-ai";

const test = async () => {
    const key = "AIzaSyCEb9uL6A4cG_upvzgWNwMWw-q-9AWOAh4";
    const genAI = new GoogleGenerativeAI(key);
    console.log("Testando chave direta...");
    const modelsToTest = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro",
        "models/gemini-1.5-flash",
        "gemini-2.0-flash-exp"
    ];

    for (const m of modelsToTest) {
        process.stdout.write(`Testando ${m}... `);
        try {
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("Oi");
            console.log("SUCESSO!");
            return;
        } catch (e: any) {
            console.log(`FALHA: ${e.message.split('\n')[0]}`);
        }
    }
};

test();
