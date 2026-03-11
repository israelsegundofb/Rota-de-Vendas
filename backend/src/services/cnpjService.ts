
export interface CNPJExternalResponse {
    cnpj: string;
    razao_social: string;
    nome_fantasia?: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cep: string;
    municipio: string;
    uf: string;
    ddd_telefone_1?: string;
    cnae_fiscal?: string;
    cnae_descricao?: string;
    situacao_cadastral?: string;
    fonte: string;
}

const getApiKey = () => {
    return process.env.CNPJA_API_KEY || '';
};

const BASE_URL_CNPJA = 'https://api.cnpja.com';

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs: number = 8000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

/**
 * Consulta um CNPJ específico usando fallback progressivo
 */
export const lookupCNPJExternal = async (cnpj: string): Promise<CNPJExternalResponse | null> => {
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');

    if (cleanCNPJ.length !== 14) {
        throw new Error('CNPJ deve ter 14 dígitos.');
    }

    // 1. Tentar CNPJa se houver API Key
    const apiKey = getApiKey();
    if (apiKey && apiKey !== 'SUA_CHAVE_AQUI') {
        try {
            console.log(`[CNPJ SERVICE] Tentando CNPJa para ${cleanCNPJ}...`);
            const response = await fetchWithTimeout(`${BASE_URL_CNPJA}/office/${cleanCNPJ}`, {
                headers: { 'Authorization': apiKey }
            }, 5000);

            if (response.ok) {
                const data: any = await response.json();
                return {
                    cnpj: data.taxId,
                    razao_social: data.company.name,
                    nome_fantasia: data.alias || data.company.name,
                    logradouro: data.address.street,
                    numero: data.address.number,
                    complemento: data.address.details,
                    bairro: data.address.district,
                    cep: data.address.zip,
                    municipio: data.address.city,
                    uf: data.address.state,
                    ddd_telefone_1: data.phones?.[0] ? `(${data.phones[0].area}) ${data.phones[0].number}` : undefined,
                    cnae_fiscal: data.mainActivity?.code?.toString() || '',
                    cnae_descricao: data.mainActivity?.text || '',
                    situacao_cadastral: data.registration?.status?.description || '',
                    fonte: 'CNPJa'
                };
            }
        } catch (error) {
            console.warn("[CNPJ SERVICE] CNPJa falhou, tentando fallback...", error);
        }
    }

    // 2. Fallback para BrasilAPI
    try {
        console.log(`[CNPJ SERVICE] Tentando BrasilAPI para ${cleanCNPJ}...`);
        const response = await fetchWithTimeout(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`, {}, 5000);
        if (response.ok) {
            const data: any = await response.json();
            return {
                cnpj: data.cnpj,
                razao_social: data.razao_social,
                nome_fantasia: data.nome_fantasia,
                logradouro: data.logradouro,
                numero: data.numero,
                complemento: data.complemento,
                bairro: data.bairro,
                cep: data.cep,
                municipio: data.municipio,
                uf: data.uf,
                ddd_telefone_1: data.ddd_telefone_1,
                cnae_fiscal: data.cnae_fiscal?.toString() || '',
                cnae_descricao: data.cnae_fiscal_descricao || '',
                situacao_cadastral: data.descricao_situacao_cadastral || '',
                fonte: 'BrasilAPI'
            };
        }
    } catch (error) {
        console.error("[CNPJ SERVICE] BrasilAPI falhou:", error);
    }

    return null;
};

/**
 * Pesquisa empresas por nome fantasia ou razão social (apenas via CNPJa se houver chave)
 */
export const searchCompanyByNameExternal = async (query: string): Promise<any[]> => {
    const apiKey = getApiKey();
    if (!apiKey || apiKey === 'SUA_CHAVE_AQUI') {
        console.warn("[CNPJ SERVICE] Pesquisa por nome requer API Key do CNPJa.");
        return [];
    }

    try {
        const urlParams = new URLSearchParams({
            q: query,
            limit: '5'
        });

        const response = await fetchWithTimeout(`${BASE_URL_CNPJA}/office?${urlParams}`, {
            headers: { 'Authorization': apiKey }
        }, 8000);

        if (response.ok) {
            const data: any = await response.json();
            return (data.items || []).map((item: any) => ({
                cnpj: item.taxId,
                razao_social: item.company.name,
                nome_fantasia: item.alias,
                municipio: item.address.city,
                uf: item.address.state
            }));
        }
    } catch (error) {
        console.error("[CNPJ SERVICE] Erro na busca por nome:", error);
    }

    return [];
};
