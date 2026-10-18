
export interface CNPJResponse {
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
    cnaes_secundarios?: { codigo: number; texto: string }[];
    situacao_cadastral?: string;
    latitude?: number;
    longitude?: number;
    fonte?: string;
}

/**
 * Busca dados de endereço a partir do CEP usando ViaCEP
 */
export const fetchAddressByCEP = async (cep: string): Promise<{ logradouro: string; bairro: string; municipio: string; uf: string } | null> => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length !== 8) return null;

    try {
        const response = await fetchWithTimeout(`https://viacep.com.br/ws/${cleanCEP}/json/`, {}, 5000);
        if (!response.ok) return null;
        const data = await response.json();
        
        if (data.erro) return null;

        return {
            logradouro: data.logradouro || '',
            bairro: data.bairro || '',
            municipio: data.localidade || '',
            uf: data.uf || ''
        };
    } catch (error) {
        console.warn("Erro ao consultar ViaCEP:", error);
        return null;
    }
};

const getApiKey = () => {
    return localStorage.getItem('cnpja_api_key') || import.meta.env.VITE_CNPJA_API_KEY || '';
};

const BASE_URL = 'https://api.cnpja.com';
const CNPJ_CACHE_KEY = 'vendas_ai_cnpj_cache_v1';
const MAX_COMMERCIAL_CALLS_PER_SESSION = 200;
let sessionCommercialCalls = 0;
const memoryCnpjCache = new Map<string, CNPJResponse>();

const getCachedCNPJ = (cleanCNPJ: string): CNPJResponse | null => {
    if (memoryCnpjCache.has(cleanCNPJ)) return memoryCnpjCache.get(cleanCNPJ)!;
    try {
        const raw = localStorage.getItem(CNPJ_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && parsed[cleanCNPJ]) {
            memoryCnpjCache.set(cleanCNPJ, parsed[cleanCNPJ]);
            return parsed[cleanCNPJ];
        }
    } catch { /* ignore */ }
    return null;
};

const setCachedCNPJ = (cleanCNPJ: string, data: CNPJResponse) => {
    memoryCnpjCache.set(cleanCNPJ, data);
    try {
        const raw = localStorage.getItem(CNPJ_CACHE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        parsed[cleanCNPJ] = data;
        localStorage.setItem(CNPJ_CACHE_KEY, JSON.stringify(parsed));
    } catch { /* ignore quota errors */ }
};

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
 * Consulta um CNPJ específico usando a API Comercial (com cache e limite de segurança)
 */
export const consultarCNPJ = async (cnpj: string): Promise<CNPJResponse | null> => {
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');

    if (cleanCNPJ.length !== 14) {
        throw new Error('CNPJ deve ter 14 dígitos.');
    }

    const cached = getCachedCNPJ(cleanCNPJ);
    if (cached) return cached;

    const apiKey = getApiKey();
    if (!apiKey) {
        const pubResult = await fallbackMinhaReceita(cleanCNPJ) || await fallbackBrasilAPI(cleanCNPJ);
        if (pubResult) setCachedCNPJ(cleanCNPJ, pubResult);
        return pubResult;
    }

    if (sessionCommercialCalls >= MAX_COMMERCIAL_CALLS_PER_SESSION) {
        console.warn('Limite de segurança de consultas comerciais por sessão atingido. Usando fallback público.');
        const pubResult = await fallbackMinhaReceita(cleanCNPJ) || await fallbackBrasilAPI(cleanCNPJ);
        if (pubResult) setCachedCNPJ(cleanCNPJ, pubResult);
        return pubResult;
    }

    try {
        sessionCommercialCalls++;
        // Na API Comercial, o endpoint é /office/:taxId
        // Adicionamos geocoding=true para obter lat/lng nativamente
        const response = await fetchWithTimeout(`${BASE_URL}/office/${cleanCNPJ}?geocoding=true`, {
            headers: { 'Authorization': apiKey }
        }, 10000); // 10s timeout maximum

        if (!response.ok) {
            if (response.status === 404) throw new Error('CNPJ não encontrado.');
            if (response.status === 401) throw new Error('Chave de API CNPJa inválida ou expirada.');
            throw new Error('Erro ao consultar CNPJa.');
        }

        const data = await response.json();

        // Robust address parsing
        let street = data.address.street || "";
        const number = data.address.number || "";
        const district = data.address.district || "";
        const city = data.address.city || "";
        const state = data.address.state || "";
        const streetType = data.address.type || "";
        const zip = data.address.zip || "";

        // Se o logradouro estiver vazio mas temos o CEP, tenta buscar no ViaCEP
        if (street.trim() === '' && zip) {
            console.log("CNPJa retornou logradouro vazio, tentando ViaCEP...");
            const cepData = await fetchAddressByCEP(zip);
            if (cepData && cepData.logradouro) {
                street = cepData.logradouro;
            }
        }

        const mappedResult: CNPJResponse = {
            cnpj: data.taxId,
            razao_social: data.company.name,
            nome_fantasia: data.alias || data.company.name,
            logradouro: (streetType && street) ? `${streetType} ${street}` : street,
            numero: number,
            complemento: data.address.details,
            bairro: district || "",
            cep: zip,
            municipio: city,
            uf: state,
            ddd_telefone_1: data.phones?.[0] ? `(${data.phones[0].area}) ${data.phones[0].number}` : undefined,
            cnae_fiscal: (data.mainActivity || data.main_activity)?.code
                ? `${(data.mainActivity || data.main_activity).code} - ${(data.mainActivity || data.main_activity).text}`
                : (data.mainActivity || data.main_activity)?.text,
            cnae_descricao: (data.mainActivity || data.main_activity)?.text,
            cnaes_secundarios: (data.sideActivities || data.side_activities || data.secondary_activities)?.map((a: { code: string | number; text: string }) => ({
                codigo: a.code,
                texto: a.text
            })),
            situacao_cadastral: data.registration?.status?.description || data.registration?.status,
            latitude: data.address.coordinates?.latitude || data.latitude,
            longitude: data.address.coordinates?.longitude || data.longitude,
            fonte: 'CNPJa'
        };
        setCachedCNPJ(cleanCNPJ, mappedResult);
        return mappedResult;
    } catch (error) {
        console.error("Erro na consulta CNPJa Comercial:", error);
        // Fallback progressivo: CNPJa -> Minha Receita -> BrasilAPI
        const result = await fallbackMinhaReceita(cleanCNPJ) || await fallbackBrasilAPI(cleanCNPJ);
        
        if (result && (!result.logradouro || result.logradouro.trim() === '') && result.cep) {
            console.log("Logradouro vazio detectado, tentando enriquecer via CEP...");
            const cepData = await fetchAddressByCEP(result.cep);
            if (cepData && cepData.logradouro) {
                result.logradouro = cepData.logradouro;
                if (!result.bairro) result.bairro = cepData.bairro;
            }
        }
        
        if (result) setCachedCNPJ(cleanCNPJ, result);
        return result;
    }
};

/**
 * Busca CNPJs por endereço ou razão social (Recurso Comercial)
 */
export const pesquisarEmpresaPorEndereco = async (params: {
    filtros: string; // Ex: "Rua X, Bairro Y, Cidade Z"
    uf?: string;
}): Promise<any[]> => {
    const apiKey = getApiKey();
    if (!apiKey || apiKey === 'SUA_CHAVE_AQUI') {
        console.warn("Chave de API CNPJa não configurada.");
        return [];
    }

    try {
        // Endpoint de pesquisa avançada por filtros de endereço/nome
        const query = new URLSearchParams({
            q: params.filtros,
            ...(params.uf && { state: params.uf }),
            limit: '10'
        });

        const response = await fetchWithTimeout(`${BASE_URL}/office?${query}`, {
            headers: { 'Authorization': getApiKey() }
        }, 10000); // 10s timeout maximum

        if (!response.ok) return [];

        const resData: { items?: any[] } = await response.json();
        return resData.items || [];
    } catch (error) {
        console.error("Erro na pesquisa por endereço:", error);
        return [];
    }
};

const fallbackMinhaReceita = async (cnpj: string): Promise<CNPJResponse | null> => {
    try {
        const response = await fetchWithTimeout(`https://minhareceita.org/${cnpj}`, {}, 8000); // 8s timeout
        if (!response.ok) return null;

        const data = await response.json();

        return {
            cnpj: data.cnpj,
            razao_social: data.razao_social,
            nome_fantasia: data.nome_fantasia,
            logradouro: `${data.descricao_tipo_de_logradouro} ${data.logradouro}`.trim(),
            numero: data.numero,
            complemento: data.complemento,
            bairro: data.bairro,
            cep: data.cep,
            municipio: data.municipio,
            uf: data.uf,
            // Minha Receita provides `ddd_telefone_1`, we format it slightly
            ddd_telefone_1: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.substring(0, 2)}) ${data.ddd_telefone_1.substring(2)}`.trim() : undefined,
            cnae_fiscal: data.cnae_fiscal ? `${data.cnae_fiscal} - ${data.cnae_fiscal_descricao}` : data.cnae_fiscal_descricao,
            cnae_descricao: data.cnae_fiscal_descricao,
            cnaes_secundarios: data.cnaes_secundarios?.map((s: { codigo: string | number; descricao: string }) => ({
                codigo: s.codigo,
                texto: s.descricao
            })),
            situacao_cadastral: data.descricao_situacao_cadastral,
            fonte: 'Minha Receita'
        };
    } catch (error) {
        console.warn("Minha Receita API failed, falling back to BrasilAPI...", error);
        return null; // Will trigger BrasilAPI fallback
    }
};

const fallbackBrasilAPI = async (cnpj: string): Promise<CNPJResponse | null> => {
    try {
        const response = await fetchWithTimeout(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {}, 8000); // 8s timeout
        if (!response.ok) return null;
        const data = await response.json();
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
            cnae_fiscal: data.cnae_fiscal ? `${data.cnae_fiscal} - ${data.cnae_fiscal_descricao}` : data.cnae_fiscal_descricao,
            cnae_descricao: data.cnae_fiscal_descricao,
            cnaes_secundarios: data.cnaes_secundarios?.map((s: { codigo: string | number; descricao: string }) => ({
                codigo: s.codigo,
                texto: s.descricao
            })),
            fonte: 'BrasilAPI'
        };
    } catch {
        return null;
    }
};
