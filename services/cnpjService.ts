
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
}

const API_KEY = import.meta.env.VITE_CNPJA_API_KEY;
const BASE_URL = 'https://api.cnpja.com';

/**
 * Consulta um CNPJ específico usando a API Comercial
 */
export const consultarCNPJ = async (cnpj: string): Promise<CNPJResponse | null> => {
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');

    if (cleanCNPJ.length !== 14) {
        throw new Error('CNPJ deve ter 14 dígitos.');
    }

    try {
        // Na API Comercial, o endpoint é /office/:taxId
        // Adicionamos geocoding=true para obter lat/lng nativamente
        const response = await fetch(`${BASE_URL}/office/${cleanCNPJ}?geocoding=true`, {
            headers: { 'Authorization': API_KEY }
        });

        if (!response.ok) {
            if (response.status === 404) throw new Error('CNPJ não encontrado.');
            if (response.status === 401) throw new Error('Chave de API CNPJa inválida ou expirada.');
            throw new Error('Erro ao consultar CNPJa.');
        }

        const data = await response.json();
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
            cnae_fiscal: data.mainActivity?.code ? `${data.mainActivity.code} - ${data.mainActivity.text}` : data.mainActivity?.text,
            cnae_descricao: data.mainActivity?.text,
            cnaes_secundarios: data.sideActivities?.map((a: any) => ({ codigo: a.code, texto: a.text })),
            situacao_cadastral: data.registration?.status?.description,
            latitude: data.address.coordinates?.latitude,
            longitude: data.address.coordinates?.longitude
        };
    } catch (error) {
        console.error("Erro na consulta CNPJa Comercial:", error);
        // Fallback para BrasilAPI se a chave falhar ou não estiver configurada
        return fallbackBrasilAPI(cleanCNPJ);
    }
};

/**
 * Busca CNPJs por endereço ou razão social (Recurso Comercial)
 */
export const pesquisarEmpresaPorEndereco = async (params: {
    filtros: string; // Ex: "Rua X, Bairro Y, Cidade Z"
    uf?: string;
}): Promise<any[]> => {
    if (!API_KEY || API_KEY === 'SUA_CHAVE_AQUI') {
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

        const response = await fetch(`${BASE_URL}/office?${query}`, {
            headers: { 'Authorization': API_KEY }
        });

        if (!response.ok) return [];

        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error("Erro na pesquisa por endereço:", error);
        return [];
    }
};

const fallbackBrasilAPI = async (cnpj: string): Promise<CNPJResponse | null> => {
    try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
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
            ddd_telefone_1: data.ddd_telefone_1
        };
    } catch {
        return null;
    }
};
