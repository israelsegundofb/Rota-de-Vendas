import React from 'react';
import { EnrichedClient } from '../types';
import { Store, MapPin, Tag, ExternalLink, Download, Pencil, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

interface ClientListProps {
  clients: EnrichedClient[];
  onEdit: (client: EnrichedClient) => void;
  onAddClient: () => void;
}

const ClientList: React.FC<ClientListProps> = ({ clients, onEdit, onAddClient }) => {
  const [localSearch, setLocalSearch] = React.useState('');

  // Pagination to prevent DOM overload
  const itemsPerPage = 100;
  const [currentPage, setCurrentPage] = React.useState(1);

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [localSearch, clients]);

  const filteredClients = clients.filter(client =>
    client.companyName.toLowerCase().includes(localSearch.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleExportCSV = () => {
    // ... (keep existing export logic)
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

    // Map data rows using filteredClients (EXPORT ALL, NOT JUST PAGE)
    const rows = filteredClients.map(client => {
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
    <div className="flex flex-col h-full bg-gray-50 p-2">
      {/* Header with Search and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2 flex-shrink-0">

        {/* Local Search Input */}
        <div className="relative w-full max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Store className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2 outline-none"
            placeholder="Buscar por Cliente / Razão Social..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={onAddClient}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Adicionar Cliente
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto bg-white rounded-lg border border-gray-200 shadow-sm relative scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">


        {/* DESKTOP TABLE VIEW (Hidden on Mobile) */}
        <table className="hidden md:table w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-3 font-bold bg-gray-100 whitespace-nowrap">Cód/ID</th>
              <th className="px-6 py-3 font-bold bg-gray-100">Cliente / Razão Social</th>
              <th className="px-6 py-3 font-bold bg-gray-100 whitespace-nowrap">Proprietário</th>
              <th className="px-6 py-3 font-bold bg-gray-100">Município</th>
              <th className="px-6 py-3 font-bold bg-gray-100">UF</th>
              <th className="px-6 py-3 font-bold bg-gray-100">Região</th>
              <th className="px-6 py-3 font-bold bg-gray-100">Segmento</th>
              <th className="px-6 py-3 font-bold text-center bg-gray-100">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedClients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 font-mono text-xs whitespace-nowrap">{client.id}</td>
                <td className="px-6 py-3 font-medium text-gray-800">
                  <div className="flex items-center gap-2 min-w-[200px]">
                    <Store className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    {client.companyName}
                  </div>
                </td>
                <td className="px-6 py-3 whitespace-nowrap">{client.ownerName}</td>
                <td className="px-6 py-3">{client.city}</td>
                <td className="px-6 py-3 font-bold text-gray-800">{client.state}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap
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
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs whitespace-nowrap">
                    <Tag className="w-3 h-3" />
                    {client.category}
                  </span>
                </td>
                <td className="px-6 py-3 text-center whitespace-nowrap">
                  <a
                    href={client.googleMapsUri || `https://www.google.com/maps/dir/?api=1&destination=${client.lat},${client.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 inline-block mr-2"
                    title="Ver no Maps"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => onEdit(client)}
                    className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                    title="Editar Cliente"
                    aria-label="Editar Cliente"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* MOBILE CARD VIEW (Visible only on Mobile) */}
        <div className="md:hidden space-y-4 p-4">
          {paginatedClients.map(client => (
            <div key={client.id} className="bg-white p-4 rounded-lg shadow border border-gray-100 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-2">
                  <Store className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-gray-800">{client.companyName}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {client.id}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={client.googleMapsUri || `https://www.google.com/maps/dir/?api=1&destination=${client.lat},${client.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                    title="Ver no Maps"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => onEdit(client)}
                    className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                    title="Editar Cliente"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-xs text-gray-400 uppercase">Proprietário</p>
                  <p className="font-medium text-gray-700">{client.ownerName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Segmento</p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                    <Tag className="w-3 h-3" />
                    {client.category}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Cidade / UF</p>
                  <p className="font-medium text-gray-700">{client.city} - {client.state}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Região</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
                    ${client.region === 'Nordeste' ? 'bg-orange-100 text-orange-700' :
                      client.region === 'Sudeste' ? 'bg-blue-100 text-blue-700' :
                        client.region === 'Sul' ? 'bg-purple-100 text-purple-700' :
                          client.region === 'Norte' ? 'bg-green-100 text-green-700' :
                            'bg-yellow-100 text-yellow-700'}
                  `}>
                    {client.region}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Footer Info & Pagination */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 mt-2 rounded-lg shadow-sm flex-shrink-0">
        <div className="text-sm text-gray-500">
          Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredClients.length)} de <span className="font-medium">{filteredClients.length}</span> clientes
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Página Anterior"
              aria-label="Página Anterior"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm text-gray-600 font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Próxima Página"
              aria-label="Próxima Página"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientList;