import dotenv from 'dotenv';
import { getQdrantClient, generateEmbedding } from './services/qdrantService';

dotenv.config({ override: true });

const testSearch = async () => {
    console.log("--- DIAGNÓSTICO PROFUNDO QDRANT ---");
    const client = getQdrantClient();
    if (!client) {
        console.error("ERRO: Cliente Qdrant não inicializado.");
        return;
    }

    try {
        const collections = await client.getCollections();
        console.log("Coleções no Cluster:", JSON.stringify(collections, null, 2));

        const collectionInfo = await client.getCollection('knowledge_base');
        console.log("Status da Coleção 'knowledge_base':", JSON.stringify(collectionInfo, null, 2));

        if (collectionInfo.points_count === 0) {
            console.log("❌ A COLEÇÃO ESTÁ VAZIA!");
        }

        const query = "Quem é a Graves & Agudos?";
        console.log(`\nTestando Busca para: "${query}"`);
        
        const vector = await generateEmbedding(query);
        const results = await client.search('knowledge_base', {
            vector: vector,
            limit: 3,
            with_payload: true
        });

        console.log(`Resultados da busca: ${results.length}`);
        results.forEach((r: any, i: number) => {
            console.log(`\n[${i+1}] Score: ${r.score}`);
            console.log("Payload:", JSON.stringify(r.payload, null, 2));
        });

    } catch (e) {
        console.error("ERRO NO DIAGNÓSTICO:", e);
    }
};

testSearch();
