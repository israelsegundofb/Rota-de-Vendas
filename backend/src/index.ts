console.log('--- STARTUP DIAGNOSTIC ---');
console.log('Node Version:', process.version);
console.log('CWD:', process.cwd());
console.log('ENV PORT:', process.env.PORT);

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateAIContent } from './services/aiService';
import { syncMasterData } from './services/toolsService';

// Initialize dotenv early
dotenv.config();

const app = express();
const port = process.env.PORT || '3001';

// 2. Middlewares
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Gemini-Key'],
    optionsSuccessStatus: 200
}));

// Increase limit for master data sync (1GB+ knowledge scale)
app.use(express.json({ limit: '100mb' }));

// 3. Roteamento
app.get('/', (req: Request, res: Response) => {
    res.send('🚀 Backend Rota de Vendas está ONLINE! (v6.5.0-AI-SCALABLE)');
});

app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV
    });
});

/**
 * Endpoint de Sincronização de Dados Mestres
 * Permite que a IA tenha acesso a toda a base de dados para Function Calling.
 */
app.post('/api/ai/sync', (req: Request, res: Response) => {
    try {
        const { clients, products } = req.body;
        if (!clients || !products) {
            return res.status(400).json({ error: 'Dados incompletos para sincronização' });
        }
        syncMasterData(clients, products);
        res.status(200).json({ success: true, message: 'Dados sincronizados com sucesso' });
    } catch (error) {
        console.error('[SYNC ERROR]:', error);
        res.status(500).json({ error: 'Erro interno ao sincronizar dados' });
    }
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
        const { model, prompt, useMaps, sessionId } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt é obrigatório' });

        // Force stable gemini-2.0-flash for best compatibility and speed
        const aiModel = model || 'gemini-2.0-flash';
        const apiKeyHeader = req.headers['x-gemini-key'] as string;
        console.log(`[BACKEND] Request received. Header X-Gemini-Key present: ${!!apiKeyHeader} (${apiKeyHeader ? apiKeyHeader.substring(0,6) : 'N/A'})`);
        
        const aiResult: any = await generateAIContent(aiModel, prompt, useMaps, sessionId, apiKeyHeader);
        const response = aiResult.response;
        const returnedSessionId = aiResult.sessionId;

        if (!response) {
            throw new Error("Resposta da IA está vazia ou malformada.");
        }

        let responseText = "";
        try {
            responseText = typeof response.text === 'function' ? response.text() : "Resposta inválida do SDK";
        } catch (e) {
            console.warn('[AI SDK] .text() call failed', e);
            responseText = "Erro ao extrair texto da resposta.";
        }

        let mapsUri = "";
        // Safely access candidates and grounding metadata
        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
            const chunks = candidates[0].groundingMetadata?.groundingChunks;
            if (chunks && Array.isArray(chunks)) {
                const mapChunk = chunks.find((c: any) => c.maps?.uri);
                if (mapChunk?.maps?.uri) {
                    mapsUri = mapChunk.maps.uri;
                }
            }
        }

        res.status(200).json({
            text: responseText,
            mapsUri: mapsUri,
            sessionId: returnedSessionId
        });
    } catch (error: any) {
        console.error('[AI PROXY ERROR]:', error);
        const errorDetail = error.response?.data || error.message || 'Falha ao processar IA';
        res.status(500).json({ error: errorDetail });
    }
});

// 4. Inicialização do Servidor
const serverPort = typeof port === 'string' ? parseInt(port, 10) : port;

app.listen(serverPort, '0.0.0.0', () => {
    console.log(`🚀 [BACKEND] Servidor Escalável rodando em 0.0.0.0:${serverPort}`);
});
