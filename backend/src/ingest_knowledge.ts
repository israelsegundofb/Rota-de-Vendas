import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { indexKnowledge } from './services/qdrantService';

// Ensure we load environment variables including QDRANT_URL and QDRANT_API_KEY
dotenv.config({ override: true });

const runIngestion = async () => {
    try {
        console.log("Iniciando ingestão de conhecimento na base do Qdrant...");
        
        const filePath = path.join(__dirname, '..', 'graves_agudos_knowledge.md');
        const textContent = fs.readFileSync(filePath, 'utf-8');
        
        console.log(`Lendo arquivo: graves_agudos_knowledge.md (${textContent.length} caracteres)`);
        
        // Push to Qdrant using the unified indexKnowledge function
        await indexKnowledge('graves_agudos_knowledge.md', textContent);
        
        console.log("✅ Conhecimento ingerido com sucesso no banco de dados vetorial.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Erro durante a ingestão:", error);
        process.exit(1);
    }
};

runIngestion();
