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
        // Passo 1: Obter Dados Básicos (Nome e Situação)
        const basicResponse = await fetchWithTimeout(`${BASE_URL}/cpf/?cpf=${cleanCPF}&token=${token}`);
        if (!basicResponse.ok) {
            throw new Error(`Erro API Básica CPF: ${basicResponse.status}`);
        }
        const basicData = await basicResponse.json();

        if (!basicData.status || !basicData.result) {
            throw new Error('CPF não encontrado na base.');
        }

        const cpfResult: CPFResponse = {
            cpf: cleanCPF,
            nome_da_pf: basicData.result.nome_da_pf,
            data_nascimento: basicData.result.data_nascimento,
            situacao_cadastral: basicData.result.situacao_cadastral
        };

        // Passo 2: Tentar obter Endereços e Telefones (Modulo Plus / Localizador)
        // Ignora erros deste passo silenciosamente, apenas retornando o que conseguiu do passo 1 se falhar.
        try {
            // Tenta o endpoint provavel de localizador
            // Se falhar, tentaremos outro endpoint nos proximos refinamentos.
            const locResponse = await fetchWithTimeout(`${BASE_URL}/localizador/?documento=${cleanCPF}&token=${token}`);
            if (locResponse.ok) {
                const locData = await locResponse.json();
                if (locData.status && locData.result) {
                    
                    // Extrai primeiro endereço se existir
                    const enderecos = locData.result.enderecos;
                    if (enderecos && enderecos.length > 0) {
                        const primAdd = enderecos[0];
                        cpfResult.logradouro = primAdd.logradouro;
                        cpfResult.numero = primAdd.numero;
                        cpfResult.bairro = primAdd.bairro;
                        cpfResult.municipio = primAdd.cidade || primAdd.municipio;
                        cpfResult.uf = primAdd.uf || primAdd.estado;
                        cpfResult.cep = primAdd.cep;
                    }

                    // Extrai primeiro telefone se existir
                    const telefones = locData.result.telefones;
                    if (telefones && telefones.length > 0) {
                        const primTel = telefones[0];
                        cpfResult.telefone = primTel.telefone || primTel.numero || `${primTel.ddd || ''}${primTel.numero || ''}`;
                    }
                }
            } else {
                 console.warn("Hub do Desenvolvedor: Could not fetch localizador", locResponse.status);
            }
        } catch (subErr) {
            console.warn("Hub do Desenvolvedor: Localizador request failed", subErr);
        }

        return cpfResult;

    } catch (error) {
        console.error('[CPF_SERVICE] Erro ao consultar CPF:', error);
        throw error;
    }
};
