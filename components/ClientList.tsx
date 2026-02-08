import React, { useState, useMemo } from 'react';
import { EnrichedClient, REGIONS, CATEGORIES } from '../types';
import { Store, MapPin, Tag, ExternalLink, Download, Search, Filter, Edit2 } from 'lucide-react';
import EditClientModal from './EditClientModal';

interface ClientListProps {
  clients: EnrichedClient[];
  onUpdateClient: (updatedClient: EnrichedClient) => void;
}

const ClientList: React.FC<ClientListProps> = ({ clients, onUpdateClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('Todos');
  const [categoryFilter, setCategoryFilter] = useState('Todos');

  // Modal State
  const [selectedClient, setSelectedClient] = useState<EnrichedClient | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch =
        client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.ownerName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRegion = regionFilter === 'Todos' || client.region === regionFilter;
      const matchesCategory = categoryFilter === 'Todos' || client.category === categoryFilter;

      return matchesSearch && matchesRegion && matchesCategory;
    });
  }, [clients, searchTerm, regionFilter, categoryFilter]);

  const handleExportCSV = () => {
    const headers = [
      'ID', 'Razão Social', 'Proprietário', 'Contato', 'Endereço', 'Cidade', 'UF', 'Região', 'Segmento', 'Link Maps'
    ];

    const rows = filteredClients.map(client => [
      client.id,
      client.companyName,
      client.ownerName,
      client.contact,
      client.cleanAddress,
      client.city,
      client.state,
      client.region,
      client.category,
      client.googleMapsUri || `https://www.google.com/maps/dir/?api=1&destination=${client.lat},${client.lng}`
    ]);

    const escapeCsvField = (field: any) => {
      if (field === null || field === undefined) return '';
      const stringValue = String(field);
      if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCsvField).join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openEditModal = (client: EnrichedClient) => {
    setSelectedClient(client);
    setIsEditModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* TOOLBAR */}
      <div className="bg-gray-50 border-b border-gray-200 p-4 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* SEARCH */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Razão Social ou Proprietário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-64 shadow-sm"
            />
          </div>

          {/* REGION FILTER */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
            >
              <option value="Todos">Todas Regiões</option>
              {REGIONS.map(reg => <option key={reg} value={reg}>{reg}</option>)}
            </select>
          </div>

          {/* CATEGORY FILTER */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat === 'Todos' ? 'Todos Segmentos' : cat}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Exportar {filteredClients.length} Clientes
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto bg-white flex-1">
        {filteredClients.length === 0 ? (
          <div className="p-12 text-center text-gray-500 italic">
            Nenhum cliente atende aos filtros selecionados.
          </div>
        ) : (
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200 sticky top-0 z-10 font-bold">
              <tr>
                <th className="px-6 py-4">Cód/ID</th>
                <th className="px-6 py-4">Cliente / Razão Social</th>
                <th className="px-6 py-4">Proprietário</th>
                <th className="px-6 py-4">Localização (Link)</th>
                <th className="px-6 py-4">Região</th>
                <th className="px-6 py-4">Segmento</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="px-6 py-4 font-mono text-[10px] text-gray-400">{client.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="font-semibold text-gray-900 leading-tight">{client.companyName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{client.ownerName}</td>
                  <td className="px-6 py-4">
                    <a
                      href={client.googleMapsUri || `https://www.google.com/maps/dir/?api=1&destination=${client.lat},${client.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                      title="Abrir no Google Maps"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="max-w-[150px] truncate block">{client.city} - {client.state}</span>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                      ${client.region === 'Nordeste' ? 'bg-orange-100 text-orange-700' :
                        client.region === 'Sudeste' ? 'bg-blue-100 text-blue-700' :
                          client.region === 'Sul' ? 'bg-purple-100 text-purple-700' :
                            client.region === 'Norte' ? 'bg-green-100 text-green-700' :
                              'bg-yellow-100 text-yellow-700'}
                    `}>
                      {client.region}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                      <Tag className="w-3 h-3" />
                      {client.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => openEditModal(client)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                        title="Editar Dados"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <a
                        href={client.googleMapsUri || `https://www.google.com/maps/dir/?api=1&destination=${client.lat},${client.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Ver no Maps"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* EDIT MODAL */}
      {selectedClient && (
        <EditClientModal
          isOpen={isEditModalOpen}
          client={selectedClient}
          onClose={() => setIsEditModalOpen(false)}
          onSave={(updated) => {
            onUpdateClient(updated);
            setSelectedClient(null);
          }}
        />
      )}
    </div>
  );
};

export default ClientList;