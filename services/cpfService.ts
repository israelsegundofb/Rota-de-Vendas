export interface CPFResponse {
    cpf: string;
    nome_da_pf: string;
    data_nascimento?: string;
    situacao_cadastral?: string;
    logradouro?: string;
    numero?: string;
    bairro?: string;
    cep?: string;
    municipio?: string;
    uf?: string;
    telefone?: string;
}

import { getSystemSettings } from './settingsService';

const getApiKey = async () => {
    const settings = await getSystemSettings();
    return settings?.hubDevToken || localStorage.getItem('hub_dev_token') || import.meta.env.VITE_HUB_DEV_TOKEN || '';
};

const BASE_URL = 'https://ws.hubdodesenvolvedor.com.br/v2';

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
 * Consulta um CPF na Hub do Desenvolvedor
 * Agrupa chamadas a multiplos endpoints para enriquecer a ficha do cliente.
 */
export const consultarCPF = async (cpf: string): Promise<CPFResponse | null> => {
    const cleanCPF = cpf.replace(/[^\d]/g, '');

    if (cleanCPF.length !== 11) {
        throw new Error('CPF deve ter exatos 11 dígitos.');
    }

    const token = await getApiKey();
    if (!token) {
        throw new Error('Token do Hub do Desenvolvedor não configurado. Adicione nas configurações da nuvem.');
    }

    try {
        // Utilizamos o endpoint cadastropf que retorna dados completos (nome, endereços, telefones)
        const response = await fetchWithTimeout(`${BASE_URL}/cadastropf/?cpf=${cleanCPF}&token=${token}`);
        if (!response.ok) {
            if (response.status === 401) throw new Error('Token do Hub do Desenvolvedor inválido ou expirado.');
            throw new Error(`Erro API Hub (Status ${response.status})`);
        }
        
        const data = await response.json();

        if (data.status === false) {
            const apiMsg = data.message || data.result?.mensagem || 'Consulta não autorizada ou CPF não encontrado.';
            throw new Error(`Hub do Desenvolvedor: ${apiMsg}`);
        }

        const res = data.result;
        if (!res) {
            throw new Error('Hub do Desenvolvedor: Resposta sem campo "result".');
        }

        // Mapeamento conforme exemplo fornecido pelo usuário
        const cpfResult: CPFResponse = {
            cpf: cleanCPF,
            nome_da_pf: res.nomeCompleto || res.nome_da_pf || 'Nome não encontrado',
            data_nascimento: res.dataDeNascimento || res.data_nascimento,
            situacao_cadastral: res.statusCadastral || res.situacao_cadastral
        };

        // Extrai endereço da lista se disponível
        if (res.listaEnderecos && res.listaEnderecos.length > 0) {
            const addr = res.listaEnderecos[0];
            cpfResult.logradouro = addr.logradouro;
            cpfResult.numero = addr.numero;
            cpfResult.bairro = addr.bairro;
            cpfResult.municipio = addr.cidade;
            cpfResult.uf = addr.uf;
            cpfResult.cep = addr.cep;
        }

        // Extrai telefone da lista se disponível
        if (res.listaTelefones && res.listaTelefones.length > 0) {
            cpfResult.telefone = res.listaTelefones[0].telefoneComDDD;
        }

        return cpfResult;

    } catch (error) {
        console.error('[CPF_SERVICE] Erro ao consultar CPF:', error);
        throw error;
    }
};
