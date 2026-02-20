import React from 'react';
import {
  Filter, Shield, User as UserIcon, Briefcase, ShoppingBag,
  Package, Search, AlertCircle, Database, CheckCircle
} from 'lucide-react';
import DateRangePicker from './DateRangePicker';
import { AppUser, Product } from '../types';
import { REGIONS } from '../utils/constants';

interface FilterBarProps {
  currentUser: AppUser | null;
  isAdminUser: boolean;
  canViewAllData: boolean;
  users: AppUser[];
  filteredClientsCount: number;

  filterSalespersonId: string;
  setFilterSalespersonId: (id: string) => void;
  filterSalesCategory: string;
  setFilterSalesCategory: (cat: string) => void;

  filterRegion: string;
  setFilterRegion: (region: string) => void;
  filterState: string;
  setFilterState: (state: string) => void;
  filterCity: string;
  setFilterCity: (city: string) => void;

  filterCategory: string;
  setFilterCategory: (cat: string) => void;
  filterCnae: string;
  setFilterCnae: (cnae: string) => void;

  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;

  filterProductCategory: string;
  setFilterProductCategory: (cat: string) => void;
  filterProductSku: string;
  setFilterProductSku: (sku: string) => void;
  searchProductQuery: string;
  setSearchProductQuery: (query: string) => void;
  showProductSuggestions: boolean;
  setShowProductSuggestions: (show: boolean) => void;

  filterOnlyWithPurchases: boolean;
  setFilterOnlyWithPurchases: (only: boolean) => void;

  products: Product[];
  productCategories: string[];
  categories: string[];
  availableStates: string[];
  availableCities: string[];
  availableCnaes: string[];

  isProductFilterActive: boolean;
  handleMassUpdateClients: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  currentUser,
  isAdminUser,
  canViewAllData,
  users,
  filteredClientsCount,

  filterSalespersonId,
  setFilterSalespersonId,
  filterSalesCategory,
  setFilterSalesCategory,

  filterRegion,
  setFilterRegion,
  filterState,
  setFilterState,
  filterCity,
  setFilterCity,

  filterCategory,
  setFilterCategory,
  filterCnae,
  setFilterCnae,

  startDate,
  setStartDate,
  endDate,
  setEndDate,

  filterProductCategory,
  setFilterProductCategory,
  filterProductSku,
  setFilterProductSku,
  searchProductQuery,
  setSearchProductQuery,
  showProductSuggestions,
  setShowProductSuggestions,

  filterOnlyWithPurchases,
  setFilterOnlyWithPurchases,

  products,
  productCategories,
  categories,
  availableStates,
  availableCities,
  availableCnaes,

  isProductFilterActive,
  handleMassUpdateClients,
}) => {
  return (
    <div className="bg-gray-100 px-3 py-2.5 border-b border-gray-200 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-bold hidden md:inline">Filtros:</span>
        </div>

        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-colors ${canViewAllData ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-200'}`}>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${canViewAllData ? 'text-purple-600' : 'text-gray-500'}`}
            title={isAdminUser ? "Perfil Administrador" : (canViewAllData ? "Perfil Gestor" : "Perfil Vendedor")}
          >
            {canViewAllData ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
            {isAdminUser ? 'Admin' : (canViewAllData ? 'Gestão' : 'Vendedor')}
          </span>

          <div className="relative">
            <UserIcon className={`absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${canViewAllData ? 'text-purple-400' : 'text-gray-400'}`} />
            <select
              value={canViewAllData ? filterSalespersonId : currentUser?.id || ''}
              onChange={(e) => canViewAllData && setFilterSalespersonId(e.target.value)}
              disabled={!canViewAllData}
              className={`text-xs rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 pl-7 pr-2 py-1 font-medium appearance-none ${canViewAllData ? 'border-purple-300 bg-white text-purple-900 cursor-pointer' : 'border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed'}`}
              title={!canViewAllData ? "Visualização restrita aos seus clientes" : "Filtrar por vendedor"}
            >
              {canViewAllData && <option value="Todos">Todos Vendedores</option>}
              {canViewAllData
                ? users.filter(u => u.role === 'salesperson' || u.role === 'sales_external' || u.role === 'sales_internal').map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))
                : <option value={currentUser?.id}>{currentUser?.name}</option>
              }
            </select>
          </div>

          {canViewAllData && (
            <div className="relative animate-fade-in">
              <Briefcase className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-purple-400 pointer-events-none" />
              <select
                value={filterSalesCategory}
                onChange={(e) => setFilterSalesCategory(e.target.value)}
                className="text-xs border-purple-300 bg-white text-purple-900 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 pl-7 pr-2 py-1 font-medium"
                title="Filtrar por equipe de vendas"
              >
                <option value="Todos">Todas Equipes</option>
                <option value="Externo">Externo</option>
                <option value="Interno">Interno</option>
                <option value="Mercado Livre">Mercado Livre</option>
              </select>
            </div>
          )}
        </div>

        <select
          value={filterRegion}
          onChange={(e) => { setFilterRegion(e.target.value); setFilterState('Todos'); setFilterCity('Todas'); }}
          className="text-xs border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-2 py-1.5"
          title="Filtrar por região geográfica"
        >
          <option value="Todas">Todas Regiões</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select
          value={filterState}
          onChange={(e) => { setFilterState(e.target.value); setFilterCity('Todas'); }}
          className="text-xs border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-2 py-1.5"
          disabled={availableStates.length === 0}
          title="Filtrar por estado (UF)"
        >
          <option value="Todos">Todos Estados {filterRegion !== 'Todas' ? `(${filterRegion})` : ''}</option>
          {availableStates.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          className="text-xs border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-2 py-1.5 min-w-[100px]"
          disabled={filterState === 'Todos' || availableCities.length === 0}
          title="Filtrar por cidade"
        >
          <option value="Todas">Todas Cidades</option>
          {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="flex items-center gap-1 relative">
          <ShoppingBag className="w-3.5 h-3.5 text-gray-400 absolute left-2 pointer-events-none" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 pl-7 pr-2 py-1.5"
            title="Filtrar por categoria de cliente"
          >
            <option value="Todos">Todas Cat. Clientes</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1 relative">
          <Briefcase className="w-3.5 h-3.5 text-gray-400 absolute left-2 pointer-events-none" />
          <select
            value={filterCnae}
            onChange={(e) => setFilterCnae(e.target.value)}
            className="text-xs border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 pl-7 pr-2 py-1.5 max-w-[200px]"
            title="Filtrar por CNAE (Atividade Econômica)"
          >
            <option value="Todos">Todos CNAEs</option>
            {availableCnaes.map(c => (
              <option key={c} value={c}>{c.length > 40 ? c.substring(0, 40) + '...' : c}</option>
            ))}
          </select>
        </div>

        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onRangeChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
          label="Período"
        />
      </div>

      {/* Secondary Filters Row: Products */}
      <div className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 px-2 py-1.5 rounded-lg shadow-sm">
        <div className="flex items-center gap-2 px-2 text-sm font-semibold text-green-700">
          <Package className="w-4 h-4" />
          Vendas:
        </div>

        <select
          value={filterProductCategory}
          onChange={e => setFilterProductCategory(e.target.value)}
          className={`text-xs rounded-lg px-2 py-1.5 border transition-colors ${filterProductCategory !== 'Todos' ? 'bg-green-50 border-green-300 text-green-800 font-bold' : 'border-gray-300 text-gray-600'}`}
          title="Filtrar por marca ou categoria de produto"
        >
          <option value="Todos">Todas Marcas / Categorias</option>
          {productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        <div className="relative animate-fade-in">
          <ShoppingBag className={`absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${filterProductSku !== 'Todos' ? 'text-green-600' : 'text-gray-400'}`} />
          <select
            value={filterProductSku}
            onChange={e => setFilterProductSku(e.target.value)}
            className={`text-xs rounded-lg pl-7 pr-2 py-1.5 border appearance-none transition-colors max-w-[180px] truncate ${filterProductSku !== 'Todos' ? 'bg-green-50 border-green-300 text-green-800 font-bold' : 'border-gray-300 text-gray-600'}`}
            title="Filtrar por produto específico"
          >
            <option value="Todos">Todos Produtos</option>
            {products
              .filter(p => filterProductCategory === 'Todos' || p.category === filterProductCategory)
              .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
              .map(p => (
                <option key={p.sku} value={p.sku}>{p.name.substring(0, 30)}... ({p.sku})</option>
              ))
            }
          </select>
        </div>

        <div className="relative group/search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
          <input
            type="text"
            value={searchProductQuery}
            onChange={e => {
              setSearchProductQuery(e.target.value);
              setShowProductSuggestions(true);
            }}
            onFocus={() => setShowProductSuggestions(true)}
            placeholder="SKU, Marca, Código ou Descrição..."
            className={`pl-7 pr-3 py-1.5 text-xs border rounded-lg focus:ring-green-500 focus:border-green-500 outline-none w-56 transition-colors ${searchProductQuery ? 'bg-green-50 border-green-300' : 'border-gray-300'}`}
            title="Buscar produtos por SKU, Marca, Código ou Descrição"
          />

          {/* Autocomplete Dropdown */}
          {showProductSuggestions && searchProductQuery.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
              {(() => {
                const suggestions = products
                  .filter(p => {
                    const term = searchProductQuery.toLowerCase();
                    return (p.name || '').toLowerCase().includes(term) ||
                      (p.sku || '').toLowerCase().includes(term) ||
                      (p.brand || '').toLowerCase().includes(term);
                  })
                  .slice(0, 8);

                if (suggestions.length === 0) {
                  return (
                    <div className="p-3 text-xs text-gray-500 italic flex items-center gap-2">
                      <AlertCircle className="w-3 h-3 text-gray-400" />
                      Não Foi Encontrado
                    </div>
                  );
                }

                return suggestions.map(p => (
                  <button
                    key={p.sku}
                    onClick={() => {
                      setSearchProductQuery(p.sku);
                      setShowProductSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 flex flex-col border-b border-gray-50 last:border-0"
                  >
                    <span className="font-bold text-gray-800">{p.name}</span>
                    <span className="text-[10px] text-gray-500 uppercase">{p.sku} • {p.brand}</span>
                  </button>
                ));
              })()}
            </div>
          )}

          {/* Explicit "Not Found" message if list is empty and no suggestions */}
          {!showProductSuggestions && searchProductQuery && filteredClientsCount === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 flex items-center gap-1.5 text-[10px] font-bold text-rose-500 animate-fade-in bg-rose-50 px-2 py-1 rounded border border-rose-100 italic">
              <AlertCircle className="w-3 h-3" />
              Não Foi Encontrado
            </div>
          )}
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => setFilterOnlyWithPurchases(true)}
            className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg border transition-all ${filterOnlyWithPurchases
              ? 'bg-green-600 border-green-600 text-white shadow-sm'
              : 'bg-white border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700'
              }`}
          >
            Somente com Compras
          </button>
          <button
            onClick={() => setFilterOnlyWithPurchases(false)}
            className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg border transition-all ${!filterOnlyWithPurchases
              ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
              : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-700'
              }`}
          >
            Mostrar Todos
          </button>

          {isAdminUser && (
            <button
              onClick={handleMassUpdateClients}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all text-[10px] font-bold uppercase tracking-wider ml-2"
              title="Enriquecer toda a base com dados da Receita Federal via CNPJa Comercial"
            >
              <Database className="w-3 h-3" /> Atualizar Base (CNPJa)
            </button>
          )}
        </div>

        {isProductFilterActive && (
          <span className="ml-auto text-xs font-medium text-green-600 animate-pulse flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Exibindo onde foi vendido
          </span>
        )}
        {!isProductFilterActive && (
          <span className="ml-auto text-xs text-gray-400">
            {products.length === 0 ? "Nenhum produto cadastrado no admin." : `${products.length} produtos no catálogo.`}
          </span>
        )}
      </div>

      <div className="flex justify-end">
        <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg">
          {filteredClientsCount} resultados encontrados
        </span>
      </div>
    </div>
  );
};

export default FilterBar;
