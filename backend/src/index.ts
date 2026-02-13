console.log('--- STARTUP DIAGNOSTIC ---');
console.log('Node Version:', process.version);
console.log('CWD:', process.cwd());
console.log('ENV PORT:', process.env.PORT);

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateAIContent } from './services/aiService';

// Initialize dotenv early
dotenv.config();

const app = express();
const port = process.env.PORT || '8080';

// 2. Middlewares
app.use(cors());
app.use(express.json());

// 3. Roteamento
app.get('/', (req: Request, res: Response) => {
    res.send('🚀 Backend Rota de Vendas está ONLINE!');
});

app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV
    });
});

app.post('/api/logs', (req: Request, res: Response) => {
    try {
        const logData = req.body;
        if (!logData || !logData.action || !logData.userId) {
            return res.status(400).json({ error: 'Dados de log incompletos' });
        }
        console.log(`[AUDIT] [${logData.category}] ${logData.userName} (${logData.action}): ${logData.details}`);
        res.status(201).json({ success: true });
    } catch (error) {
        console.error('[LOG ERROR]:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/ai/generate', async (req: Request, res: Response) => {
    try {
        const { model, prompt, useMaps } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt é obrigatório' });

        const response: any = await generateAIContent(model || 'gemini-2.0-flash', prompt, useMaps);

        // Extract Google Maps Grounding URI if available
        let mapsUri = "";
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && Array.isArray(chunks)) {
            const mapChunk = chunks.find((c: any) => c.maps?.uri);
            if (mapChunk && mapChunk.maps && mapChunk.maps.uri) {
                mapsUri = mapChunk.maps.uri;
            }
        }

        res.status(200).json({
            text: response.text || "",
            mapsUri: mapsUri
        });
    } catch (error: any) {
        console.error('[AI PROXY ERROR]:', error);
        res.status(500).json({ error: error.message || 'Falha ao processar IA' });
    }
});

// 4. Inicialização do Servidor
const serverPort = typeof port === 'string' ? parseInt(port, 10) : port;

app.listen(serverPort, '0.0.0.0', () => {
    console.log(`🚀 [BACKEND] Servidor rodando em 0.0.0.0:${serverPort}`);
});
