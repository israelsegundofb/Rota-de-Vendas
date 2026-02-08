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

      {/* MD3 LIST/CARDS */}
      <div className="overflow-x-auto bg-surface flex-1 custom-scrollbar relative p-4">
        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-on-surface-variant animate-fade-in">
            <div className="bg-surface-container-highest p-4 rounded-full mb-3">
              <Search className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-sm">Nenhum cliente encontrado com os filtros atuais.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {filteredClients.map((client) => (
              <div key={client.id} className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-4 hover:shadow-elevation-2 transition-shadow group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-0">
                  <span className={`px-3 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-wider
                        ${client.region === 'Nordeste' ? 'bg-orange-100 text-orange-800' :
                      client.region === 'Sudeste' ? 'bg-blue-100 text-blue-800' :
                        client.region === 'Sul' ? 'bg-purple-100 text-purple-800' :
                          client.region === 'Norte' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'}
                      `}>
                    {client.region}
                  </span>
                </div>

                <div className="flex items-start gap-4 pr-12">
                  <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg shrink-0">
                    {client.companyName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-on-surface truncate pr-2">{client.companyName}</h3>
                    <div className="flex items-center gap-1 text-xs text-on-surface-variant mt-0.5">
                      <Tag className="w-3 h-3" />
                      <span className="truncate">{client.category.join(', ')}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <Store className="w-4 h-4 shrink-0" />
                    <span className="truncate">{client.ownerName}</span>
                  </div>
                  <a
                    href={client.googleMapsUri || `https://www.google.com/maps/dir/?api=1&destination=${client.lat},${client.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors group/link"
                  >
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 group-hover/link:underline">{client.cleanAddress}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity ml-auto" />
                  </a>
                </div>

                <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(client)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container/30 rounded-full transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
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