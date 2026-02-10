import React, { useState, useMemo } from 'react';
import { EnrichedClient, UserRole, Product, AppUser, UploadedFile } from '../types';
import { REGIONS, CATEGORIES } from '../utils/constants';
import { isAdmin, isSalesTeam } from '../utils/authUtils';
import { Store, MapPin, Tag, ExternalLink, Download, Search, Filter, Edit2, Plus, ShoppingBag } from 'lucide-react';
import EditClientModal from './EditClientModal';
import AddClientModal from './AddClientModal';
import ClientProductAssignmentModal from './ClientProductAssignmentModal';

interface ClientListProps {
  clients: EnrichedClient[];
  onUpdateClient: (updatedClient: EnrichedClient) => void;
  onAddClient?: (newClient: Omit<EnrichedClient, 'id' | 'lat' | 'lng' | 'cleanAddress'>) => void;
  currentUserRole?: UserRole;
  currentUserId?: string;
  currentUserName?: string;
  products: Product[];
  productCategories: string[];
  users?: AppUser[];
  uploadedFiles?: UploadedFile[];
  onGeneratePlusCodes?: () => void;
}

const ClientList: React.FC<ClientListProps> = ({
  clients,
  onUpdateClient,
  onAddClient,
  currentUserRole,
  currentUserId,
  currentUserName,
  products = [],
  productCategories = [],
  users = [],
  uploadedFiles = [],
  onGeneratePlusCodes
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('Todos');
  const [categoryFilter, setCategoryFilter] = useState('Todos');

  // Modal State
  const [selectedClient, setSelectedClient] = useState<EnrichedClient | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Product Assignment Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [clientForProductAssignment, setClientForProductAssignment] = useState<EnrichedClient | null>(null);

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
      'ID', 'Razão Social', 'Proprietário', 'Contato', 'Endereço', 'Cidade', 'UF', 'Região', 'Segmento', 'Produtos Comprados', 'Link Maps'
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
      client.category.join('; '),
      client.purchasedProducts ? client.purchasedProducts.map(p => p.sku).join('; ') : '',
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

  const openProductAssignmentModal = (client: EnrichedClient) => {
    setClientForProductAssignment(client);
    setIsProductModalOpen(true);
  };

  const handleSaveProductAssignment = (clientId: string, assignedProducts: Product[]) => {
    const clientToUpdate = clients.find(c => c.id === clientId);
    if (clientToUpdate) {
      const updatedClient = { ...clientToUpdate, purchasedProducts: assignedProducts };
      onUpdateClient(updatedClient);
    }
  };

  // Card Component for Grid
  const ClientCard = ({ client, style }: { client: EnrichedClient, style: React.CSSProperties }) => (
    <div style={style} className="p-1">
      <div className="h-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-3 hover:shadow-elevation-2 transition-shadow group relative overflow-hidden flex flex-col">
        <div className="absolute top-0 right-0 p-0">
          <span className={`px-3 py-1 rounded-bl-lg text-[10px] font-bold uppercase tracking-wider
                        ${client.region === 'Nordeste' ? 'bg-orange-100 text-orange-800' :
              client.region === 'Sudeste' ? 'bg-blue-100 text-blue-800' :
                client.region === 'Sul' ? 'bg-purple-100 text-purple-800' :
                  client.region === 'Norte' ? 'bg-green-100 text-green-800' :
                    'bg-yellow-100 text-yellow-800'}
                      `}>
            {client.region}
          </span>
        </div>

        <div className="flex items-start gap-4 pr-12 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg shrink-0">
            {client.companyName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-on-surface truncate pr-2" title={client.companyName}>{client.companyName}</h3>
            <div className="flex items-center gap-1 text-xs text-on-surface-variant mt-0.5">
              <Tag className="w-3 h-3" />
              <span className="truncate">{client.category.join(', ')}</span>
            </div>

            {/* PRODUCT STATS */}
            {client.purchasedProducts && client.purchasedProducts.length > 0 && (
              <div className="flex items-center gap-3 mt-1.5 text-[10px] font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 w-fit">
                <span className="flex items-center gap-1" title="Total de itens comprados">
                  📦 <span className="font-bold text-gray-800">{client.purchasedProducts.length}</span> Prod.
                </span>
                <div className="h-3 w-px bg-gray-300"></div>
                <span className="flex items-center gap-1" title="Quantidade de SKUs únicos">
                  🔖 <span className="font-bold text-gray-800">{new Set(client.purchasedProducts.map(p => p.sku)).size}</span> SKUs
                </span>
              </div>
            )}

            {/* BADGE DE PRODUTOS RECENTES (Opcional - mantendo mas reduzindo destaque se necessário, ou mantendo como está) */}
            {client.purchasedProducts && client.purchasedProducts.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {client.purchasedProducts.slice(0, 2).map((p, i) => (
                  <span key={i} className="text-[9px] px-1 rounded bg-green-50 text-green-700 border border-green-200 truncate max-w-[100px]" title={p.name}>
                    {p.sku}
                  </span>
                ))}
                {client.purchasedProducts.length > 2 && (
                  <span className="text-[9px] px-1 rounded bg-gray-100 text-gray-500 border border-gray-200">
                    +{client.purchasedProducts.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 flex-grow">
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <Store className="w-4 h-4 shrink-0" />
            <span className="truncate">{client.ownerName}</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-on-surface-variant group/link">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{client.cleanAddress}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-outline-variant/30 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => openProductAssignmentModal(client)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Atribuir Produtos"
            >
              <ShoppingBag className="w-4 h-4" />
            </button>
            <a
              title={`Abrir localização de ${client.companyName} no Google Maps`}
              href={client.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.companyName + " " + client.cleanAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <button
            onClick={() => openEditModal(client)}
            className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-lg active:bg-surface-container-highest"
            title={`Editar cliente ${client.companyName}`}
          >
            <Edit2 className="w-3 h-3" /> Editar
          </button>
        </div>
      </div>
    </div>
  );

  // Mobile Card
  const MobileClientCard = ({ client }: { client: EnrichedClient }) => (
    <div className="p-4 border-b border-gray-100 last:border-0 bg-white">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-gray-900">{client.companyName}</h3>
          <p className="text-xs text-gray-500">{client.category.join(', ')}</p>

          {/* BADGE DE PRODUTOS MOBILE */}
          {client.purchasedProducts && client.purchasedProducts.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {client.purchasedProducts.slice(0, 3).map((p, i) => (
                <span key={i} className="text-[9px] px-1 rounded bg-green-50 text-green-700 border border-green-200 truncate max-w-[100px]" title={p.name}>
                  {p.sku}
                </span>
              ))}
              {client.purchasedProducts.length > 3 && (
                <span className="text-[9px] px-1 rounded bg-gray-100 text-gray-500 border border-gray-200">
                  +{client.purchasedProducts.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase
              ${client.region === 'Nordeste' ? 'bg-orange-100 text-orange-800' :
            client.region === 'Sudeste' ? 'bg-blue-100 text-blue-800' :
              client.region === 'Sul' ? 'bg-purple-100 text-purple-800' :
                client.region === 'Norte' ? 'bg-green-100 text-green-800' :
                  'bg-yellow-100 text-yellow-800'}
           `}>
          {client.region}
        </span>
      </div>

      <div className="space-y-1 mb-3">
        <p className="flex items-center gap-2 text-sm text-gray-600">
          <Store className="w-4 h-4 text-gray-400" /> {client.ownerName}
        </p>
        <p className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-gray-400" /> <span className="truncate">{client.cleanAddress}</span>
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => openEditModal(client)}
          className="flex-1 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg text-center"
          title={`Editar cliente ${client.companyName}`}
        >
          Editar
        </button>
        <button
          onClick={() => openProductAssignmentModal(client)}
          className="flex-1 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg text-center flex items-center justify-center gap-1"
          title="Atribuir Produtos"
        >
          <ShoppingBag className="w-4 h-4" /> Produtos
        </button>
        <a
          href={client.googleMapsUri || `https://www.google.com/maps/dir/?api=1&destination=${client.lat},${client.lng}`}
          target="_blank"
          className="flex-none p-2 text-gray-600 bg-gray-100 rounded-lg flex items-center justify-center"
          title="Ver rota no Google Maps"
        >
          <ExternalLink className="w-5 h-5" />
        </a>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* ... Filters Header ... */}
      <div className="px-3 py-2.5 border-b border-gray-200 flex flex-col md:flex-row gap-3 items-center justify-between bg-white z-10 sticky top-0 md:relative shadow-sm md:shadow-none">
        {/* Search */}
        <div className="relative w-full md:max-w-xs group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Razão Social ou Proprietário..."
            className="w-full pl-10 pr-4 py-1.5 bg-surface-container-highest border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-on-surface-variant/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            title="Buscar por razão social ou proprietário"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
          <select
            value={regionFilter}
            onChange={e => setRegionFilter(e.target.value)}
            className="px-2 py-1.5 bg-surface-container-highest border-none rounded-lg text-xs font-medium text-on-surface-variant focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer whitespace-nowrap"
            title="Filtrar por Região"
          >
            <option value="Todos">Todas Regiões</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-2 py-1.5 bg-surface-container-highest border-none rounded-lg text-xs font-medium text-on-surface-variant focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer whitespace-nowrap"
            title="Filtrar por Categoria"
          >
            <option value="Todos">Todos Segmentos</option>
            {CATEGORIES.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="md:ml-auto flex items-center gap-2 pl-2 border-l border-gray-200">
            {currentUserRole && isSalesTeam(currentUserRole) && onAddClient && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-200 hover:shadow-lg active:scale-95 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Novo
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-outline-variant/30 text-on-surface hover:bg-surface-container-highest rounded-lg text-xs font-bold transition-colors shadow-sm whitespace-nowrap"
            >
              <Download className="w-4 h-4" /> Exportar
            </button>

            {onGeneratePlusCodes && currentUserRole && isAdmin(currentUserRole) && (
              <button
                onClick={onGeneratePlusCodes}
                className="flex items-center gap-2 px-3 py-1.5 bg-tertiary text-white text-xs font-bold rounded-lg hover:bg-tertiary/90 transition-all shadow-md shadow-tertiary/20 active:scale-95 whitespace-nowrap"
                title="Gerar Plus Codes para clientes sem localização exata"
              >
                <MapPin className="w-4 h-4" /> Plus Code
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
        Exibindo {filteredClients.length} de {clients.length} clientes
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-gray-50">

        {/* Mobile View - List */}
        <div className="md:hidden flex flex-col gap-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredClients.map(client => (
            <MobileClientCard key={client.id} client={client} />
          ))}
        </div>

        {/* Desktop View - Grid */}
        <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
          {filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              style={{}}
            />
          ))}
        </div>

        {filteredClients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Filter className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-lg font-medium">Nenhum cliente encontrado</p>
            <p className="text-sm">Tente ajustar seus filtros de busca</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {
        selectedClient && isEditModalOpen && (
          <EditClientModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            client={selectedClient}
            onSave={(updated) => {
              onUpdateClient(updated);
              setIsEditModalOpen(false);
            }}
            users={users}
            uploadedFiles={uploadedFiles}
          />
        )
      }

      {
        isAddModalOpen && onAddClient && (
          <AddClientModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onAdd={(newClient) => {
              onAddClient(newClient);
              setIsAddModalOpen(false);
            }}
            salespersonId={currentUserId || ''}
            ownerName={currentUserName || ''}
            users={users}
          />
        )
      }

      {/* Product Assignment Modal */}
      <ClientProductAssignmentModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        client={clientForProductAssignment}
        products={products}
        productCategories={productCategories}
        onSave={handleSaveProductAssignment}
      />
    </div >
  );
};

export default ClientList;