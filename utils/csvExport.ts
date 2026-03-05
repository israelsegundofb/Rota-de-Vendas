import Papa from 'papaparse';
import { EnrichedClient, AppUser } from '../types';

export const exportClientsToCSV = (clients: EnrichedClient[], users: AppUser[]) => {
    // Map clients to the desired CSV format
    const exportData = clients.map(client => {
        const seller = users.find(u => u.id === client.salespersonId);

        return {
            'CNPJ / CPF': client.cnpj || '',
            'Razão Social / Nome': client.companyName || '',
            'Nome Fantasia': client.ownerName || '',
            'Vendedor Responsável': seller ? seller.name : 'Desconhecido',
            'Endereço Completo': client.cleanAddress || client.originalAddress || '',
            'Bairro': client.district || '',
            'Cidade': client.city || '',
            'Estado': client.state || '',
            'CEP': client.zip || '',
            'Telefone': client.contact || '',
            'Status Geocodificação': client.lat && client.lng && client.lat !== 0 ? 'Encontrado' : 'Pendência de Endereço'
        };
    });

    // Convert to CSV string with semicolon delimiter for Excel PT-BR compatibility
    const csv = Papa.unparse(exportData, {
        quotes: false, // or true if you want to force quotes, papaparse handles it automatically usually
        delimiter: ';',
        header: true
    });

    // Add BOM for UTF-8 Excel compatibility
    const csvWithBOM = '\uFEFF' + csv;

    // Create a Blob and trigger download
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `Base_Clientes_Consolidada_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
