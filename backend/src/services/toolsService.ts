
/**
 * Ferramentas (Tools) para o Assistente RV
 * Permite que a IA execute buscas dinâmicas na base de dados massiva.
 */

export const aiTools = [
    {
        name: "find_clients",
        description: "Busca clientes na base de dados por nome, CNPJ, cidade ou vendedor. Use quando o usuário perguntar por clientes específicos ou quiser uma lista filtrada.",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "Termo de busca (nome, CNPJ, etc)" },
                city: { type: "string", description: "Filtrar por cidade" },
                salespersonId: { type: "string", description: "Filtrar por ID do vendedor" },
                limit: { type: "number", description: "Limite de resultados (default 100)" }
            }
        }
    },
    {
        name: "analyze_products",
        description: "Analisa o catálogo de produtos, estoque ou categorias. Use para responder sobre disponibilidade, seções ou departamentos.",
        parameters: {
            type: "object",
            properties: {
                category: { type: "string", description: "Departamento/Categoria principal" },
                section: { type: "string", description: "Seção/Sub-categoria" },
                sku: { type: "string", description: "Código SKU do produto" }
            }
        }
    },
    {
        name: "get_market_segment_stats",
        description: "Obtém estatísticas de mercado baseadas em CNAEs. Use para responder sobre setores de atuação ou diversidade da carteira.",
        parameters: {
            type: "object",
            properties: {
                cnaeCode: { type: "string", description: "Código CNAE (ex: 47.44-0-01)" }
            }
        }
    }
];

// Cache em memória para os dados (Snapshot)
// Em produção, isso bateria num Banco de Dados Real.
let masterClients: any[] = [];
let masterProducts: any[] = [];

import { ensureCollectionsExist, indexClients } from './qdrantService';

export const syncMasterData = async (clients: any[], products: any[]) => {
    masterClients = clients;
    masterProducts = products;
    console.log(`[STORAGE] Sincronizados ${clients.length} clientes e ${products.length} produtos em memória.`);

    // Async Qdrant Sync Trigger
    try {
        await ensureCollectionsExist();
        
        // Fire and forget Qdrant indexing so it doesn't block the frontend upload response
        indexClients(clients).catch(err => {
            console.error('[QDRANT] Background Indexing Error:', err);
        });
    } catch (e) {
        console.error('[QDRANT INITIALIZATION EXCEPTION]', e);
    }
};

export const toolHandlers: Record<string, (args: any) => any> = {
    find_clients: (args) => {
        const { query, city, salespersonId, limit = 100 } = args;
        let filtered = masterClients;

        if (query) {
            const lowQuery = query.toLowerCase();
            filtered = filtered.filter(c =>
                c.companyName?.toLowerCase().includes(lowQuery) ||
                c.cnpj?.includes(query)
            );
        }

        if (city) {
            filtered = filtered.filter(c => c.city?.toLowerCase() === city.toLowerCase());
        }

        if (salespersonId) {
            filtered = filtered.filter(c => c.salespersonId === salespersonId);
        }

        return {
            total_found: filtered.length,
            results: filtered.slice(0, limit)
        };
    },
    analyze_products: (args) => {
        const { category, section, sku } = args;
        let filtered = masterProducts;

        if (category) filtered = filtered.filter(p => p.category === category);
        if (section) filtered = filtered.filter(p => p.section === section);
        if (sku) filtered = filtered.filter(p => p.sku === sku);

        return {
            count: filtered.length,
            sample: filtered.slice(0, 20)
        };
    },
    get_market_segment_stats: (args) => {
        const { cnaeCode } = args;
        const matching = masterClients.filter(c => c.mainCnae === cnaeCode);
        return {
            cnae: cnaeCode,
            total_clients: matching.length,
            sample_cities: Array.from(new Set(matching.map(c => c.city))).slice(0, 5)
        };
    }
};
