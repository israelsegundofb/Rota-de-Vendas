import React, { useState, useMemo } from 'react';
import { EnrichedClient } from '../types';
import { REGIONS, CATEGORIES } from '../utils/constants';
import { Store, MapPin, Tag, ExternalLink, Download, Search, Filter, Edit2, Plus } from 'lucide-react';
import EditClientModal from './EditClientModal';
import AddClientModal from './AddClientModal';

interface ClientListProps {
  clients: EnrichedClient[];
  onUpdateClient: (updatedClient: EnrichedClient) => void;
  onAddClient?: (newClient: Omit<EnrichedClient, 'id' | 'lat' | 'lng' | 'cleanAddress'>) => void;
  currentUserRole?: string;
  currentUserId?: string;
  currentUserName?: string;
}

const ClientList: React.FC<ClientListProps> = ({ clients, onUpdateClient, onAddClient, currentUserRole, currentUserId, currentUserName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('Todos');
  const [categoryFilter, setCategoryFilter] = useState('Todos');

  // Modal State
  const [selectedClient, setSelectedClient] = useState<EnrichedClient | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch =
        client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.ownerName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRegion = regionFilter === 'Todos' || client.region === regionFilter;
      const matchesCategory = categoryFilter === 'Todos' || (
        Array.isArray(client.category) &&
        client.category.some(cat => cat.trim() === categoryFilter.trim())
      );

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
      client.category.join('; '), // Join array for CSV
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
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* TOOLBAR */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

          {/* Filters Group */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative group">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Razão Social ou Proprietário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none w-64 transition-all"
              />
            </div>

            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <option value="Todos">Todas Regiões</option>
              {REGIONS.map(reg => <option key={reg} value={reg}>{reg}</option>)}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none hover:bg-gray-100 transition-colors cursor-pointer"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat === 'Todos' ? 'Todos Segmentos' : cat}</option>
              ))}
            </select>
          </div>

          {/* Actions Group */}
          <div className="flex items-center gap-3">
            {currentUserRole === 'salesperson' && onAddClient && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-200 hover:shadow-lg active:scale-95"
              >
                <Plus className="w-5 h-5" />
                Novo Cliente
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:text-green-600 hover:border-green-200 transition-all shadow-sm"
              title="Baixar lista em Excel/CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </div>

        {/* Results Counter */}
        <div className="mt-2 text-xs text-gray-400 font-medium">
          Exibindo {filteredClients.length} de {clients.length} clientes
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto bg-white flex-1 custom-scrollbar relative">
        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400 animate-fade-in">
            <div className="bg-gray-100 p-4 rounded-full mb-3">
              <Search className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-sm">Nenhum cliente encontrado com os filtros atuais.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-3 font-semibold tracking-wider">Cód/ID</th>
                <th className="px-6 py-3 font-semibold tracking-wider">Cliente / Razão Social</th>
                <th className="px-6 py-3 font-semibold tracking-wider">Proprietário</th>
                <th className="px-6 py-3 font-semibold tracking-wider">Localização</th>
                <th className="px-6 py-3 font-semibold tracking-wider">Região</th>
                <th className="px-6 py-3 font-semibold tracking-wider">Segmento</th>
                <th className="px-6 py-3 text-center font-semibold tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4 font-mono text-[10px] text-gray-400">{client.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Store className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-gray-800 leading-tight">{client.companyName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{client.ownerName}</td>
                  <td className="px-6 py-4">
                    <a
                      href={client.googleMapsUri || `https://www.google.com/maps/dir/?api=1&destination=${client.lat},${client.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 transition-colors group/link"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="max-w-[150px] truncate block group-hover/link:underline">{client.city} - {client.state}</span>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border
                      ${client.region === 'Nordeste' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                        client.region === 'Sudeste' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          client.region === 'Sul' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                            client.region === 'Norte' ? 'bg-green-50 text-green-700 border-green-100' :
                              'bg-yellow-50 text-yellow-700 border-yellow-100'}
                    `}>
                      {client.region}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {client.category.map((cat, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(client)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Editar Dados"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <a
                        href={client.googleMapsUri || `https://www.google.com/maps/dir/?api=1&destination=${client.lat},${client.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
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

      {/* ADD CLIENT MODAL */}
      {onAddClient && currentUserId && (
        <AddClientModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={onAddClient}
          salespersonId={currentUserId}
          ownerName={currentUserName || 'Vendedor'}
        />
      )}
    </div>
  );
};

export default ClientList;