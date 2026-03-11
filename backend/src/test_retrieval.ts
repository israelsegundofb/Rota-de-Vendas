import dotenv from 'dotenv';
import { searchKnowledgeBase } from './services/qdrantService';

dotenv.config({ override: true });

const testSearch = async () => {
    console.log("--- TESTANDO BUSCA NA KNOWLEDGE BASE ---");
    const query = "Quem é a Graves & Agudos?";
    console.log(`Query: ${query}`);
    
    try {
        const results = await searchKnowledgeBase(query, 3);
        console.log(`Resultados encontrados: ${results.length}`);
        results.forEach((r: any, i: number) => {
            console.log(`\n--- Resultado ${i+1} (Score: ${r.score}) ---`);
            console.log(`Documento: ${r.documentTitle || 'N/A'}`);
            console.log(`Conteúdo do Chunk: ${r.content}`);
        });
        
        if (results.length === 0) {
            console.log("⚠️ NENHUM RESULTADO ENCONTRADO NO QDRANT.");
        }
    } catch (e) {
        console.error("ERRO NA BUSCA:", e);
    }
};

testSearch();
