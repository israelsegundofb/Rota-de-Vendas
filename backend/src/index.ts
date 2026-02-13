import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

/**
 * Endpoint de Logs e Auditoria
 * Recebe logs do frontend e centraliza o processamento
 */
app.post('/api/logs', (req: Request, res: Response) => {
    try {
        const logData = req.body;

        // Validação básica
        if (!logData.action || !logData.userId) {
            return res.status(400).json({ error: 'Dados de log incompletos' });
        }

        // Por enquanto, apenas logamos no terminal do servidor
        // Em breve integraremos com Firestore Admin ou Cloud Logging
        console.log(`[AUDIT] [${logData.category}] ${logData.userName} (${logData.action}): ${logData.details}`);

        res.status(201).json({ success: true, message: 'Log recebido com sucesso' });
    } catch (error) {
        console.error('[BACKEND ERROR] Falha ao processar log:', error);
        res.status(500).json({ error: 'Erro interno ao salvar log' });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`🚀 [BACKEND] Server is running at http://localhost:${port}`);
});
