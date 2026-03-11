import { QdrantClient } from '@qdrant/js-client-rest';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid'; // we need to mock or use numerical IDs. Let's use string IDs as qdrant supports UUIDs. Wait, if uuid is not installed, we can generate a uuid manually or use a hash. Let's just create a simple UUID v4 generator.

dotenv.config({ override: true });

let qdrantClient: QdrantClient | null = null;
let genAI: GoogleGenerativeAI | null = null;

// The dimensions for Gemini's gemini-embedding-001 model
const GEMINI_EMBEDDING_DIM = 3072; 

// Initializers
const getQdrantClient = () => {
    if (!qdrantClient) {
        const url = process.env.QDRANT_URL;
        const apiKey = process.env.QDRANT_API_KEY;
        if (!url || !apiKey) {
            console.warn('[QDRANT] Keys not found in .env, Qdrant will be disabled');
            return null;
        }
        qdrantClient = new QdrantClient({ url, apiKey });
    }
    return qdrantClient;
};

const getAIClient = () => {
    if (!genAI) {
         const apiKey = process.env.GEMINI_API_KEY || '';
         if (apiKey) genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
};

/**
 * Ensures that the required collections exist in Qdrant
 */
export const ensureCollectionsExist = async () => {
    const client = getQdrantClient();
    if (!client) return;

    try {
        const collections = await client.getCollections();
        const collectionNames = collections.collections.map((c: any) => c.name);

        const requiredCollections = ['clients', 'products', 'knowledge_base'];

        for (const col of requiredCollections) {
            if (!collectionNames.includes(col)) {
                await client.createCollection(col, {
                    vectors: {
                        size: GEMINI_EMBEDDING_DIM,
                        distance: 'Cosine',
                    },
                });
                console.log(`[QDRANT] Created collection: ${col}`);
            }
        }
        console.log('[QDRANT] Collections are ready.');
    } catch (error) {
        console.error('[QDRANT INIT ERROR]', error);
    }
};

/**
 * Generates embeddings vector using Gemini API
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
    const ai = getAIClient();
    if (!ai) throw new Error("GEMINI_API_KEY is not set.");
    
    // We use the available model for text embeddings
    const model = ai.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent(text);
    return result.embedding.values;
};

// Simple pseudo UUID v4 generator for Qdrant IDs
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
};

/**
 * Indexes a batch of clients into Qdrant
 */
export const indexClients = async (clients: any[]) => {
    const client = getQdrantClient();
    if (!client || clients.length === 0) return;

    console.log(`[QDRANT] Starting embedding generation for ${clients.length} clients...`);
    
    try {
        // Build the points array
        const points = [];
        
        // We will process them sequentially or in small batches to respect Gemini rate limits
        for (const c of clients) {
            // Create a rich text representation of the client for semantic search
            const textRepresentation = `
                Empresa: ${c.companyName || ''}
                Proprietário: ${c.ownerName || ''}
                Contato: ${c.contact || ''} / ${c.whatsapp || ''}
                Categoria: ${Array.isArray(c.category) ? c.category.join(', ') : (c.category || '')}
                Endereço: ${c.cleanAddress || c.originalAddress || ''}
                Região: ${c.region || ''}
                Cidade: ${c.city || ''} / ${c.state || ''}
                Produtos Comprados (Histórico): ${(c.purchasedProducts || []).map((p: any) => p.name).join(', ')}
            `.replace(/\s+/g, ' ').trim();

            try {
                const vector = await generateEmbedding(textRepresentation);
                
                // UUID required for Qdrant string IDs
                const pointId = generateUUID(); 

                points.push({
                    id: pointId,
                    vector: vector,
                    payload: {
                        originalId: c.id,
                        companyName: c.companyName,
                        city: c.city,
                        state: c.state,
                        region: c.region,
                        category: c.category,
                        hasPurchases: (c.purchasedProducts || []).length > 0,
                        rawJSON: JSON.stringify(c) // Save the full object to return later
                    }
                });
            } catch (embedError) {
                console.warn(`Failed to generate embedding for client ${c.companyName}:`, embedError);
            }
            
            // Artificial delay to prevent API rate limiting from Gemini
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        if (points.length > 0) {
            await client.upsert('clients', {
                wait: true,
                points: points
            });
            console.log(`[QDRANT] Successfully indexed ${points.length} clients into Qdrant.`);
        }
    } catch (error) {
        console.error('[QDRANT INDEXING ERROR]', error);
    }
};

/**
 * Searches clients using semantic similarity
 */
export const searchClients = async (queryText: string, limit: number = 10) => {
    const client = getQdrantClient();
    if (!client) return [];

    try {
        const queryVector = await generateEmbedding(queryText);
        const searchResult = await client.search('clients', {
            vector: queryVector,
            limit: limit,
            with_payload: true
        });

        // Parse and return the original client objects
        return searchResult.map(result => {
            if (result.payload && typeof result.payload.rawJSON === 'string') {
                return JSON.parse(result.payload.rawJSON);
            }
            return result.payload;
        });
    } catch (error) {
        console.error('[QDRANT SEARCH ERROR]', error);
        return [];
    }
};

/**
 * Indexes a batch of products into Qdrant
 */
export const indexProducts = async (products: any[]) => {
    const client = getQdrantClient();
    if (!client || products.length === 0) return;

    console.log(`[QDRANT] Starting embedding generation for ${products.length} products...`);
    
    try {
        const points = [];
        
        for (const p of products) {
            const textRepresentation = `
                Produto: ${p.name || ''}
                SKU/Código: ${p.sku || ''}
                Categoria/Departamento: ${p.category || ''}
                Seção: ${p.section || ''}
                Especificações Técnicas: ${p.technicalDetails || ''}
            `.replace(/\s+/g, ' ').trim();

            try {
                const vector = await generateEmbedding(textRepresentation);
                const pointId = generateUUID(); 

                points.push({
                    id: pointId,
                    vector: vector,
                    payload: {
                        originalId: p.id,
                        name: p.name,
                        sku: p.sku,
                        category: p.category,
                        rawJSON: JSON.stringify(p)
                    }
                });
            } catch (embedError) {
                console.warn(`Failed to generate embedding for product ${p.name}:`, embedError);
            }
            
            // Artificial delay to prevent API rate limiting from Gemini
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        if (points.length > 0) {
            await client.upsert('products', {
                wait: true,
                points: points
            });
            console.log(`[QDRANT] Successfully indexed ${points.length} products into Qdrant.`);
        }
    } catch (error) {
        console.error('[QDRANT INDEXING ERROR - PRODUCTS]', error);
    }
};

/**
 * Helper to chunk large pieces of text
 */
const chunkText = (text: string, maxTokens: number = 800): string[] => {
    // A simple heuristic: 1 token is approx 4 characters.
    const maxChars = maxTokens * 4;
    const chunks: string[] = [];
    let currentIdx = 0;

    while (currentIdx < text.length) {
        let chunk = text.substring(currentIdx, currentIdx + maxChars);
        // Try to break at a natural boundary like a newline or period
        if (currentIdx + maxChars < text.length) {
            const lastNewline = chunk.lastIndexOf('\n');
            const lastPeriod = chunk.lastIndexOf('. ');
            const breakPoint = Math.max(lastNewline, lastPeriod);
            
            if (breakPoint > maxChars * 0.5) { // Only break if it makes sense, not at the very beginning
                chunk = chunk.substring(0, breakPoint + 1);
            }
        }
        chunks.push(chunk.trim());
        currentIdx += chunk.length;
    }
    
    return chunks;
};

/**
 * Indexes a large text manual/document into the Knowledge Base collection
 */
export const indexKnowledge = async (title: string, fullText: string, metadata: any = {}) => {
    const client = getQdrantClient();
    if (!client || !fullText) return;

    console.log(`[QDRANT] Starting embedding generation for knowledge document: ${title}...`);
    
    try {
        const textChunks = chunkText(fullText);
        const points = [];
        
        for (let i = 0; i < textChunks.length; i++) {
            const chunk = textChunks[i];
            const textRepresentation = `
                Documento: ${title}
                Parte: ${i + 1}/${textChunks.length}
                Conteúdo: ${chunk}
            `.replace(/\s+/g, ' ').trim();

            try {
                const vector = await generateEmbedding(textRepresentation);
                const pointId = generateUUID(); 

                points.push({
                    id: pointId,
                    vector: vector,
                    payload: {
                        documentTitle: title,
                        chunkIndex: i,
                        totalChunks: textChunks.length,
                        content: chunk,
                        ...metadata
                    }
                });
            } catch (embedError) {
                console.warn(`Failed to generate embedding for knowledge chunk ${i}:`, embedError);
            }
            
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        if (points.length > 0) {
            await client.upsert('knowledge_base', {
                wait: true,
                points: points
            });
            console.log(`[QDRANT] Successfully indexed knowledge base doc "${title}" with ${points.length} chunks.`);
        }
    } catch (error) {
        console.error('[QDRANT INDEXING ERROR - KNOWLEDGE]', error);
    }
};

/**
 * Searches products using semantic similarity
 */
export const searchProducts = async (queryText: string, limit: number = 10) => {
    const client = getQdrantClient();
    if (!client) return [];

    try {
        const queryVector = await generateEmbedding(queryText);
        const searchResult = await client.search('products', {
            vector: queryVector,
            limit: limit,
            with_payload: true
        });

        return searchResult.map(result => {
            if (result.payload && typeof result.payload.rawJSON === 'string') {
                return JSON.parse(result.payload.rawJSON);
            }
            return result.payload;
        });
    } catch (error) {
        console.error('[QDRANT SEARCH ERROR - PRODUCTS]', error);
        return [];
    }
};

/**
 * Searches knowledge base using semantic similarity
 */
export const searchKnowledgeBase = async (queryText: string, limit: number = 5) => {
    const client = getQdrantClient();
    if (!client) return [];

    try {
        const queryVector = await generateEmbedding(queryText);
        const searchResult = await client.search('knowledge_base', {
            vector: queryVector,
            limit: limit,
            with_payload: true
        });

        return searchResult.map(result => ({
            score: result.score,
            ...result.payload
        }));
    } catch (error) {
        console.error('[QDRANT SEARCH ERROR - KNOWLEDGE]', error);
        return [];
    }
};
