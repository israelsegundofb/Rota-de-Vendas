import React, { useState, useEffect } from 'react';
import { Package, Upload, Trash2, Search, Save, ArrowUp, ArrowDown, FileSpreadsheet } from 'lucide-react';
import { Product } from '../types';
import { parseProductCSV } from '../utils/csvParser';
import { parseProductExcel } from '../utils/excelParser';

interface AdminProductManagementProps {
  products: Product[];
  onUploadProducts: (products: Product[]) => void;
  onClearProducts: () => void;
  onSaveProducts?: (products: Product[]) => void;
}

type SortKey = 'sku' | 'brand' | 'factoryCode' | 'name' | 'price' | 'category' | 'discount';

interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

const AdminProductManagement: React.FC<AdminProductManagementProps> = ({
  products,
  onUploadProducts,
  onClearProducts,
  onSaveProducts
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState('');

  // Local state for editing and sorting
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync props to local state when props change
  useEffect(() => {
    setLocalProducts(products);
    setHasChanges(false);
  }, [products]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      let newProducts: Product[] = [];
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith('.csv')) {
        newProducts = await parseProductCSV(file);
      } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        newProducts = await parseProductExcel(file);
      } else {
        throw new Error("Formato não suportado. Use .csv, .xlsx ou .xls");
      }
      onUploadProducts(newProducts);
      event.target.value = '';
    } catch (error) {
      console.error("Error parsing products:", error);
      alert("Erro ao processar arquivo de produtos. Verifique o formato.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveChanges = () => {
    if (onSaveProducts) {
      onSaveProducts(localProducts);
      setHasChanges(false);
      alert('Alterações salvas com sucesso!');
    }
  };

  const handleProductChange = (index: number, field: keyof Product, value: any) => {
    const updated = [...localProducts];
    updated[index] = { ...updated[index], [field]: value };
    setLocalProducts(updated);
    setHasChanges(true);
  };

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedProducts = <T extends Product>(prods: T[]) => {
    if (!sortConfig) return prods;

    return [...prods].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'price' || sortConfig.key === 'discount') {
        aVal = Number(aVal || 0);
        bVal = Number(bVal || 0);
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Filter first
  const filtered = localProducts.map((p, index) => ({ ...p, originalIndex: index } as Product & { originalIndex: number })).filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    p.sku.toLowerCase().includes(filter.toLowerCase()) ||
    p.brand.toLowerCase().includes(filter.toLowerCase()) ||
    p.factoryCode.toLowerCase().includes(filter.toLowerCase())
  );

  // Then Sort
  const displayedProducts = getSortedProducts(filtered);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig?.key !== column) return <div className="w-4 h-4 ml-1 inline-block opacity-0 group-hover:opacity-30">↕</div>;
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 inline-block text-primary" />
      : <ArrowDown className="w-3 h-3 ml-1 inline-block text-primary" />;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in h-full flex flex-col pb-20">

      <div className="bg-surface-container-high rounded-[28px] shadow-elevation-1 p-6 flex flex-col h-full overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
          <div>
            <h2 className="text-xl font-normal text-on-surface flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Catálogo de Produtos
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Gerencie preços, descontos e categorias.
            </p>
          </div>

          <div className="flex gap-3">
            {hasChanges && (
              <button
                onClick={handleSaveChanges}
                className="px-6 py-2 bg-tertiary-container text-on-tertiary-container hover:bg-tertiary-container/80 rounded-full text-sm font-medium flex items-center gap-2 transition-all shadow-elevation-1 animate-pulse"
              >
                <Save className="w-4 h-4" /> Salvar Alterações
              </button>
            )}

            {products.length > 0 && (
              <button
                onClick={onClearProducts}
                className="px-6 py-2 border border-error/50 text-error hover:bg-error-container/30 rounded-full text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Limpar
              </button>
            )}

            <label className={`px-6 py-2 bg-primary text-on-primary rounded-full hover:bg-primary/90 text-sm font-medium flex items-center gap-2 cursor-pointer transition-all shadow-elevation-1 hover:shadow-elevation-2 ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
              {isProcessing ? <div className="animate-spin w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full"></div> : <Upload className="w-4 h-4" />}
              {isProcessing ? 'Processando...' : 'Importar CSV'}
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        {/* Info Box */}
        {products.length === 0 ? (
          <div className="border border-dashed border-outline-variant rounded-[16px] p-12 text-center bg-surface-container-low flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-surface-container-highest rounded-full flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-8 h-8 text-outline" />
            </div>
            <p className="text-on-surface font-medium">Nenhum produto cadastrado.</p>
            <p className="text-sm text-on-surface-variant mt-1">
              Carregue um arquivo CSV para começar.
            </p>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Product Search */}
            <div className="mb-4 relative flex-shrink-0">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-on-surface-variant" />
              <input
                type="text"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Filtrar por SKU, Marca, Código ou Descrição..."
                className="w-full pl-10 pr-4 py-2 bg-surface-container-highest border-b border-outline-variant rounded-t-lg text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none transition-colors text-sm"
              />
            </div>

            <div className="hidden md:block flex-1 overflow-auto border border-outline-variant/30 rounded-xl shadow-inner scrollbar-thin scrollbar-thumb-outline-variant scrollbar-track-surface-container-low">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-on-surface-variant uppercase bg-surface-container-highest/80 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th
                      className="px-4 py-3 cursor-pointer hover:bg-surface-container-highest group select-none w-24"
                      onClick={() => requestSort('sku')}
                    >
                      SKU <SortIcon column="sku" />
                    </th>
                    <th
                      className="px-4 py-3 cursor-pointer hover:bg-surface-container-highest group select-none w-32"
                      onClick={() => requestSort('brand')}
                    >
                      Marca <SortIcon column="brand" />
                    </th>
                    <th
                      className="px-4 py-3 cursor-pointer hover:bg-surface-container-highest group select-none w-32"
                      onClick={() => requestSort('factoryCode')}
                    >
                      Cód. Fábrica <SortIcon column="factoryCode" />
                    </th>
                    <th
                      className="px-4 py-3 cursor-pointer hover:bg-surface-container-highest group select-none min-w-[200px]"
                      onClick={() => requestSort('name')}
                    >
                      Descrição <SortIcon column="name" />
                    </th>
                    <th
                      className="px-4 py-3 cursor-pointer hover:bg-surface-container-highest group select-none w-40"
                      onClick={() => requestSort('category')}
                    >
                      Categoria <SortIcon column="category" />
                    </th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer hover:bg-surface-container-highest group select-none w-32"
                      onClick={() => requestSort('price')}
                    >
                      Preço (R$) <SortIcon column="price" />
                    </th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer hover:bg-surface-container-highest group select-none w-28"
                      onClick={() => requestSort('discount')}
                    >
                      Desc. (%) <SortIcon column="discount" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 bg-surface">
                  {displayedProducts.map((p) => (
                    <tr key={`${p.sku}-${(p as any).originalIndex}`} className="hover:bg-surface-container-highest/30 transition-colors group">
                      <td className="px-4 py-2 font-mono text-on-surface-variant text-xs">{p.sku}</td>
                      <td className="px-4 py-2 font-medium text-on-surface text-xs">
                        {p.brand}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-on-surface-variant">{p.factoryCode}</td>
                      <td className="px-4 py-2 font-medium text-on-surface text-xs truncate max-w-xs" title={p.name}>{p.name}</td>

                      {/* Editable Category */}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          className="w-full text-xs text-on-surface border-transparent bg-transparent hover:bg-surface-container-highest/50 focus:bg-surface-container-highest focus:border-primary focus:ring-0 border-b focus:border-b-2 rounded-t transition-all px-2 py-1 outline-none"
                          value={p.category}
                          onChange={(e) => handleProductChange((p as any).originalIndex, 'category', e.target.value)}
                        />
                      </td>

                      {/* Editable Price */}
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          className="w-full text-xs text-right font-bold text-primary border-transparent bg-transparent hover:bg-surface-container-highest/50 focus:bg-surface-container-highest focus:border-primary focus:ring-0 border-b focus:border-b-2 rounded-t transition-all px-2 py-1 outline-none"
                          value={p.price}
                          onChange={(e) => handleProductChange((p as any).originalIndex, 'price', parseFloat(e.target.value) || 0)}
                        />
                      </td>

                      {/* Editable Discount */}
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          className="w-full text-xs text-right text-tertiary border-transparent bg-transparent hover:bg-surface-container-highest/50 focus:bg-surface-container-highest focus:border-tertiary focus:ring-0 border-b focus:border-b-2 rounded-t transition-all px-2 py-1 outline-none"
                          value={p.discount || 0}
                          onChange={(e) => handleProductChange((p as any).originalIndex, 'discount', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-4 pb-4">
              {displayedProducts.map((p) => (
                <div key={`${p.sku}-${(p as any).originalIndex}`} className="bg-surface-container-highest/30 p-4 rounded-xl border border-outline-variant/30 space-y-3">

                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-xs font-mono text-on-surface-variant mb-1">{p.sku}</p>
                      <h3 className="font-bold text-sm text-on-surface line-clamp-2 leading-tight">{p.name}</h3>
                      <p className="text-xs text-primary mt-1 font-medium">{p.brand}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] bg-surface-container-high px-2 py-1 rounded text-on-surface-variant font-mono block mb-1">
                        {p.factoryCode}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-outline-variant/20">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-on-surface-variant font-bold">Categoria</label>
                      <input
                        type="text"
                        className="w-full text-xs bg-surface-container-highest/50 border-b border-outline-variant rounded-t px-2 py-1.5 focus:border-primary outline-none"
                        value={p.category}
                        onChange={(e) => handleProductChange((p as any).originalIndex, 'category', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-on-surface-variant font-bold">Desconto (%)</label>
                      <input
                        type="number"
                        className="w-full text-xs bg-surface-container-highest/50 border-b border-outline-variant rounded-t px-2 py-1.5 focus:border-tertiary outline-none text-tertiary font-bold"
                        value={p.discount || 0}
                        onChange={(e) => handleProductChange((p as any).originalIndex, 'discount', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-on-surface-variant font-bold">Preço de Venda (R$)</label>
                    <input
                      type="number"
                      className="w-full text-sm bg-surface-container-highest/50 border-b border-outline-variant rounded-t px-2 py-2 focus:border-primary outline-none text-primary font-bold"
                      value={p.price}
                      onChange={(e) => handleProductChange((p as any).originalIndex, 'price', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                </div>
              ))}
              {displayedProducts.length === 0 && (
                <p className="text-center text-on-surface-variant text-sm py-4">Nenhum produto encontrado.</p>
              )}
            </div>

            <div className="mt-4 text-xs text-on-surface-variant flex justify-between px-2">
              <span>Total de Produtos: <strong>{localProducts.length}</strong></span>
              <span>Exibindo: <strong>{displayedProducts.length}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div >
  );
};

export default AdminProductManagement;