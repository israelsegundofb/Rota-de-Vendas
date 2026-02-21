import React, { useState, useEffect, forwardRef, useCallback } from 'react';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';
import { EnrichedClient, UserRole, Product, AppUser, UploadedFile, PurchaseRecord } from '../types';
import { REGIONS, CATEGORIES } from '../utils/constants';
import { isAdmin, isSalesTeam } from '../utils/authUtils';
import { Store, MapPin, Tag, ExternalLink, Download, Search, Filter, Edit2, Plus, ShoppingBag, Briefcase } from 'lucide-react';
import EditClientModal from './EditClientModal';
import AddClientModal from './AddClientModal';
import ClientProductAssignmentModal from './ClientProductAssignmentModal';

import ClientListSkeleton from './skeletons/ClientListSkeleton';
import ClientCard from './ClientCard';
import { AnimatePresence } from 'framer-motion';

const FULL_HEIGHT_STYLE = { height: '100%' };

interface ClientListProps {
  clients: EnrichedClient[];
  isLoading?: boolean; // New Prop
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
  onCNPJAuthError?: () => void;
  filterOnlyWithPurchases?: boolean;
  setFilterOnlyWithPurchases?: (value: boolean) => void;
  resetFilters?: () => void;

  // Controlled Filter Props
  searchTerm: string;
  onSearchChange: (value: string) => void;
  regionFilter: string;
  onRegionFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
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
  onGeneratePlusCodes,
  onCNPJAuthError,
  filterOnlyWithPurchases = false,
  setFilterOnlyWithPurchases,
  resetFilters,

  // Destructure new props
  searchTerm,
  onSearchChange,
  regionFilter,
  onRegionFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  isLoading = false
}) => {
  // Mobile Detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Modal State
  const [selectedClient, setSelectedClient] = useState<EnrichedClient | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Product Assignment Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [clientForProductAssignment, setClientForProductAssignment] = useState<EnrichedClient | null>(null);

  const openEditModal = useCallback((client: EnrichedClient) => {
    setSelectedClient(client);
    setIsEditModalOpen(true);
  }, []);

  const openProductAssignmentModal = useCallback((client: EnrichedClient) => {
    setClientForProductAssignment(client);
    setIsProductModalOpen(true);
  }, []);

  // Proactively check loading state
  if (isLoading) {
    return <ClientListSkeleton />;
  }

  // filteredClientsLogic removed - clients prop is already filtered
  const filteredClients = clients;


  const handleExportCSV = () => {
    const headers = [
      'ID', 'Razão Social', 'Proprietário', 'Contato', 'Endereço', 'Cidade', 'UF', 'Região', 'Segmento', 'CNAE', 'Produtos Comprados', 'Link Maps'
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
      client.mainCnae || '',
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



  const handleSaveProductAssignment = (clientId: string, products: Product[]) => {
    const clientToUpdate = clients.find(c => c.id === clientId);
    if (clientToUpdate) {
      const assignedProducts: PurchaseRecord[] = products.map(p => ({
        ...p,
        purchaseDate: new Date().toISOString().split('T')[0],
        quantity: 1,
        totalValue: p.price
      }));
      const updatedClient = { ...clientToUpdate, purchasedProducts: assignedProducts };
      onUpdateClient(updatedClient);
    }
  };

  /* REMOVED INLINE CARDS - Using Imported ClientCard Component */

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="px-3 py-2.5 border-b border-gray-200 flex flex-col md:flex-row gap-3 items-center justify-between bg-white z-10 sticky top-0 md:relative shadow-sm md:shadow-none">
        {/* Search */}
        <div className="relative w-full md:max-w-xs group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Razão Social ou Proprietário..."
            className="w-full pl-10 pr-4 py-1.5 bg-surface-container-highest border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-on-surface-variant/50"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            title="Buscar por razão social ou proprietário"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
          <select
            value={regionFilter}
            onChange={e => onRegionFilterChange(e.target.value)}
            className="px-2 py-1.5 bg-surface-container-highest border-none rounded-lg text-xs font-medium text-on-surface-variant focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer whitespace-nowrap"
            title="Filtrar por Região"
          >
            <option value="Todos">Todas Regiões</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <select
            value={categoryFilter}
            onChange={e => onCategoryFilterChange(e.target.value)}
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
        Exibindo {clients.length} clientes
      </div>

      <div className="flex-1 overflow-hidden bg-gray-50 cursor-default">
        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Filter className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-lg font-medium">Nenhum cliente encontrado</p>
            <p className="text-sm">Tente ajustar seus filtros de busca</p>
          </div>
        ) : isMobile ? (
          <Virtuoso
            style={FULL_HEIGHT_STYLE}
            data={filteredClients}
            itemContent={(index, client) => (
              <ClientCard
                client={client} // Client object changes ref on update, so Card re-renders. This is correct.
                onEdit={openEditModal}
                onAssignProducts={openProductAssignmentModal}
              />
            )}
            className="custom-scrollbar"
          />
        ) : (
          <VirtuosoGrid
            style={FULL_HEIGHT_STYLE}
            data={filteredClients}
            components={{
              List: forwardRef((props, ref) => (
                <div
                  {...props}
                  ref={ref}
                  className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 p-2"
                />
              )),
              Item: (props) => <div {...props} className="h-full" />
            }}
            itemContent={(index, client) => (
              <ClientCard
                client={client}
                onEdit={openEditModal}
                onAssignProducts={openProductAssignmentModal}
                style={FULL_HEIGHT_STYLE}
              />
            )}
            className="custom-scrollbar"
          />
        )}
      </div>

      <AnimatePresence>
        {
          selectedClient && isEditModalOpen && (
            <EditClientModal
              key="edit-modal"
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              client={selectedClient}
              onSave={onUpdateClient}
              users={users}
              uploadedFiles={uploadedFiles}
              onCNPJAuthError={onCNPJAuthError}
            />
          )
        }
      </AnimatePresence>

      {isAddModalOpen && currentUserId && (
        <AddClientModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={onAddClient || (() => { })}
          salespersonId={currentUserId}
          ownerName={currentUserName || ''}
          users={users}
          onCNPJAuthError={onCNPJAuthError}
        />
      )}

      <ClientProductAssignmentModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        client={clientForProductAssignment}
        products={products}
        productCategories={productCategories}
        onSave={handleSaveProductAssignment}
      />
    </div>
  );
};

// Memoize the entire component to prevent re-renders from parent when props are stable
export default React.memo(ClientList);