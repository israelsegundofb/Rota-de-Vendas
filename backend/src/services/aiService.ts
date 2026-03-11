import { GoogleGenerativeAI } from "@google/generative-ai";
import { aiTools, toolHandlers } from "./toolsService";
import dotenv from 'dotenv';

dotenv.config({ override: true });

let genAI: any = null;

const getAIClient = () => {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!genAI && apiKey) {
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
};

// In-memory conversation history storage
const activeSessions: Record<string, any> = {};

export const generateAIContent = async (modelName: string, prompt: string, useMaps: boolean = false, sessionId?: string) => {
    try {
        const client = getAIClient();
        if (!client) throw new Error("GEMINI_API_KEY não configurada no servidor.");

        let augmentedPrompt = prompt;

        const toolsConfig: any = [];
        if (aiTools && aiTools.length > 0) {
            toolsConfig.push({ functionDeclarations: aiTools });
        }
        if (useMaps) {
            toolsConfig.push({ googleSearchRetrieval: {} });
        }

        const model = client.getGenerativeModel({
            model: modelName,
            tools: toolsConfig.length > 0 ? toolsConfig : undefined
        });

        // Resolve which chat session to use
        let chat;
        const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        if (activeSessions[currentSessionId]) {
            chat = activeSessions[currentSessionId];
            console.log(`[AI SERVICE] Resuming existing chat session: ${currentSessionId}`);
        } else {
            chat = model.startChat();
            activeSessions[currentSessionId] = chat;
            console.log(`[AI SERVICE] Created new chat session: ${currentSessionId}`);
        }

        let result = await chat.sendMessage(augmentedPrompt);

        // Handle Function Calling Loop
        let call = result.response.functionCalls()?.[0];
        let maxLoops = 3; // Prevent infinite loops
        let currentLoop = 0;

        while (call && currentLoop < maxLoops) {
            console.log(`[AI SERVICE] Executando ferramenta: ${call.name}`);
            let apiResponse = {};
            
            try {
                if (toolHandlers[call.name]) {
                    apiResponse = await toolHandlers[call.name](call.args);
                } else {
                    apiResponse = { error: `Ferramenta ${call.name} não encontrada.` };
                }
            } catch (err: any) {
                console.error(`Erro ao executar ferramenta ${call.name}:`, err);
                apiResponse = { error: err.message };
            }

            // Send the function execution result back to the model
            result = await chat.sendMessage([{
                functionResponse: {
                    name: call.name,
                    response: apiResponse
                }
            }]);

            call = result.response.functionCalls()?.[0];
            currentLoop++;
        }

        return {
            response: result.response,
            sessionId: currentSessionId
        };
    } catch (error) {
        console.error('[AI SERVICE ERROR]:', error);
        throw error;
    }
};
