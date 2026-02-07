import React from 'react';
import { EnrichedClient } from '../types';
import { Store, MapPin, Tag, ExternalLink, Download } from 'lucide-react';

interface ClientListProps {
  clients: EnrichedClient[];
}

const ClientList: React.FC<ClientListProps> = ({ clients }) => {
  const handleExportCSV = () => {
    // Define headers
    const headers = [
      'ID', 
      'Razão Social', 
      'Proprietário', 
      'Contato', 
      'Endereço', 
      'Cidade', 
      'UF', 
      'Região', 
      'Segmento', 
      'Produtos Comprados (Resumo)',
      'Link Maps'
    ];

    // Map data rows
    const rows = clients.map(client => {
      // Create a summary of products if available
      const productsSummary = client.purchasedProducts 
        ? client.purchasedProducts.map(p => `${p.sku} - ${p.name}`).join('; ') 
        : '';

      return [
        client.id,
        client.companyName,
        client.ownerName,
        client.contact,
        client.cleanAddress,
        client.city,
        client.state,
        client.region,
        client.category,
        productsSummary,
        client.googleMapsUri || `https://www.google.com/maps/dir/?api=1&destination=${client.lat},${client.lng}`
      ];
    });

    // Helper to escape CSV fields (handle quotes and commas inside data)
    const escapeCsvField = (field: any) => {
      if (field === null || field === undefined) return '';
      const stringValue = String(field);
      // If contains quote, comma or newline, wrap in quotes and escape internal quotes
      if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Construct CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCsvField).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel UTF-8
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (clients.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        Nenhum cliente encontrado com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-end mb-4 px-1">
        <button 
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm flex-1">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 font-bold bg-gray-100">Cód/ID</th>
              <th className="px-6 py-3 font-bold bg-gray-100">Cliente / Razão Social</th>
              <th className="px-6 py-3 font-bold bg-gray-100">Proprietário</th>
              <th className="px-6 py-3 font-bold bg-gray-100">Município</th>
              <th className="px-6 py-3 font-bold bg-gray-100">UF</th>
              <th className="px-6 py-3 font-bold bg-gray-100">Região</th>
              <th className="px-6 py-3 font-bold bg-gray-100">Segmento</th>
              <th className="px-6 py-3 font-bold text-center bg-gray-100">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 font-mono text-xs">{client.id}</td>
                <td className="px-6 py-3 font-medium text-gray-800">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-blue-500" />
                    {client.companyName}
                  </div>
                </td>
                <td className="px-6 py-3">{client.ownerName}</td>
                <td className="px-6 py-3">{client.city}</td>
                <td className="px-6 py-3 font-bold text-gray-800">{client.state}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
                    ${client.region === 'Nordeste' ? 'bg-orange-100 text-orange-700' : 
                      client.region === 'Sudeste' ? 'bg-blue-100 text-blue-700' :
                      client.region === 'Sul' ? 'bg-purple-100 text-purple-700' :
                      client.region === 'Norte' ? 'bg-green-100 text-green-700' :
                      'bg-yellow-100 text-yellow-700'}
                  `}>
                    {client.region}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs">
                    <Tag className="w-3 h-3" />
                    {client.category}
                  </span>
                </td>
                <td className="px-6 py-3 text-center">
                   <a 
                     href={client.googleMapsUri || `https://www.google.com/maps/dir/?api=1&destination=${client.lat},${client.lng}`}
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="text-blue-600 hover:text-blue-800"
                     title="Ver no Maps"
                   >
                     <ExternalLink className="w-4 h-4 mx-auto" />
                   </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientList;