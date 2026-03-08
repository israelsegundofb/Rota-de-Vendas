import { GoogleGenerativeAI } from "@google/generative-ai";
import { aiTools, toolHandlers } from "./toolsService";
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

        // Configuração com suporte a Tools
        const model = client.getGenerativeModel({
            model: modelName,
            tools: [
                { functionDeclarations: aiTools },
                ...(useMaps ? [{ googleSearchRetrieval: {} }] : [])
            ]
        });

        // Iniciar chat para suportar multi-turn se necessário, ou gerar conteúdo direto
        const chat = model.startChat();
        let result = await chat.sendMessage(prompt);
        let response = result.response;

        // Loop de execução de funções (Function Calling)
        // O Gemini sugere uma chamada, nós executamos e devolvemos o resultado
        const call = response.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall);

        if (call) {
            const { name, args } = call.functionCall;
            console.log(`[AI TOOL CALL] Executando ${name} com args:`, args);

            const handler = toolHandlers[name];
            if (handler) {
                const toolResult = handler(args);

                // Enviar o resultado de volta para o modelo para ele gerar a resposta final
                result = await chat.sendMessage([{
                    functionResponse: {
                        name,
                        response: { content: toolResult }
                    }
                }]);
                response = result.response;
            }
        }

        return response;
    } catch (error) {
        console.error('[AI SERVICE ERROR]:', error);
        throw error;
    }
};
