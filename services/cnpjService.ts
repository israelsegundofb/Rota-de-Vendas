
export interface CNPJResponse {
    cnpj: string;
    razao_social: string;
    nome_fantasia: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cep: string;
    municipio: string;
    uf: string;
    ddd_telefone_1: string;
}

export const consultarCNPJ = async (cnpj: string): Promise<CNPJResponse | null> => {
    // Remove non-numeric characters
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');

    if (cleanCNPJ.length !== 14) {
        throw new Error('CNPJ deve ter 14 dígitos.');
    }

    try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('CNPJ não encontrado.');
            }
            throw new Error('Erro ao consultar CNPJ.');
        }

        const data: CNPJResponse = await response.json();
        return data;
    } catch (error) {
        console.error("Erro na consulta CNPJ:", error);
        throw error;
    }
};
