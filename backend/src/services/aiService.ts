import { GoogleGenerativeAI } from "@google/generative-ai";
import { aiTools, toolHandlers } from "./toolsService";
import { searchClients } from "./qdrantService";
import dotenv from 'dotenv';

dotenv.config();

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

        let augmentedPrompt = prompt;

        // Perform semantic search to augment the prompt if Qdrant is configured
        if (process.env.QDRANT_API_KEY) {
            console.log('[AI SERVICE] Interceptando prompt para Busca Vetorial RAG...');
            
            // Extract the actual user question from the super-prompt. We look for "Pergunta do Usuário:"
            let userQuestion = prompt;
            const questionMatch = prompt.match(/Pergunta do Usuário:\s*"([\s\S]*?)"/);
            if (questionMatch && questionMatch[1]) {
                userQuestion = questionMatch[1];
            }

            const relevantClients = await searchClients(userQuestion, 10);
            
            if (relevantClients.length > 0) {
                const ragContext = relevantClients.map(c => 
                    `- ${c.companyName} (${c.cleanAddress || c.city}): ${Array.isArray(c.category) ? c.category.join(', ') : c.category}. CNPJ: ${c.cnpj || 'N/A'}`
                ).join('\n');

                augmentedPrompt = prompt + `\n\n[DADOS VETORIAIS DO QDRANT]\nOs seguintes 10 clientes (mais semelhantes semanticamente à pergunta) foram encontrados:\n${ragContext}`;
            }
        }

        const model = client.getGenerativeModel({
            model: modelName,
            tools: useMaps ? [{ googleSearchRetrieval: {} }] : undefined
        });

        const result = await model.generateContent(augmentedPrompt);
        return result.response;
    } catch (error) {
        console.error('[AI SERVICE ERROR]:', error);
        throw error;
    }
};
