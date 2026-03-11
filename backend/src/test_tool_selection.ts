import dotenv from 'dotenv';
import { generateAIContent } from './services/aiService';

dotenv.config({ override: true });

const testToolSelection = async () => {
    console.log("--- TESTANDO SELEÇÃO DE FERRAMENTAS ---");
    const prompt = 'O que você já sabe sobre a Graves & Agudos? Considere que você é o Assistente RV e tem acesso a ferramentas de busca.';
    
    try {
        console.log("Enviando prompt...");
        const result = await generateAIContent('gemini-2.0-flash', prompt, false);
        
        console.log("\n--- Resposta Final ---");
        console.log(result.response.text());
        
        // Note: I can't easily see the internal call logs here unless I added logs to aiService. 
        // I already have logs in aiService: console.log(`[AI SERVICE] Executando ferramenta: ${call.name}`);
    } catch (e) {
        console.error("ERRO:", e);
    }
};

testToolSelection();
