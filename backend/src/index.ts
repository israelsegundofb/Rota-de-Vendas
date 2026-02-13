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

// Base Route
app.get('/', (req: Request, res: Response) => {
    res.json({
        message: 'Rota de Vendas Inteligente - API',
        version: '1.0.0',
        status: 'online'
    });
});

// Health Check
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start Server
app.listen(port, () => {
    console.log(`🚀 [BACKEND] Server is running at http://localhost:${port}`);
});
