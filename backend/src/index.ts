console.log('--- STARTUP DIAGNOSTIC ---');
console.log('Node Version:', process.version);
console.log('CWD:', process.cwd());
console.log('ENV PORT:', process.env.PORT);

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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


// 4. Inicialização do Servidor
const serverPort = typeof port === 'string' ? parseInt(port, 10) : port;

app.listen(serverPort, '0.0.0.0', () => {
    console.log(`🚀 [BACKEND] Servidor Escalável rodando em 0.0.0.0:${serverPort}`);
});
