import React, { useState, useEffect } from 'react';
import { Package, Upload, Trash2, DollarSign, FileSpreadsheet, Search, Save, ArrowUp, ArrowDown } from 'lucide-react';
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
      onUploadProducts(newProducts); // This will trigger the useEffect above
      event.target.value = ''; // Reset input
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

  // Derived filtered & sorted products
  // Note: We sort the *filtered* view for display, but editing updates the *full* localProducts list via index.
  // To update correct item in filtered view, we need to map back to original index or store ID.
  // Since Product doesn't have a unique ID, we use index from full list carefully.
  // Better approach: Work with the full list for editing, and just render a subset.

  const getSortedProducts = <T extends Product>(prods: T[]) => {
    if (!sortConfig) return prods;

    return [...prods].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle numbers
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
      ? <ArrowUp className="w-4 h-4 ml-1 inline-block text-blue-600" />
      : <ArrowDown className="w-4 h-4 ml-1 inline-block text-blue-600" />;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in h-full flex flex-col pb-20">

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Catálogo de Produtos
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Gerencie preços, descontos e categorias.
            </p>
          </div>

          <div className="flex gap-3">
            {hasChanges && (
              <button
                onClick={handleSaveChanges}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold flex items-center gap-2 transition-all shadow-md animate-pulse"
              >
                <Save className="w-4 h-4" /> Salvar Alterações
              </button>
            )}

            {products.length > 0 && (
              <button
                onClick={onClearProducts}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Limpar
              </button>
            )}

            <label className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2 cursor-pointer transition-all ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
              {isProcessing ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div> : <Upload className="w-4 h-4" />}
              {isProcessing ? 'Processando...' : 'Importar CSV'}
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        {/* Info Box */}
        {products.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 flex-1 flex flex-col items-center justify-center">
            <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum produto cadastrado.</p>
            <p className="text-xs text-gray-400 mt-1">
              Carregue um arquivo CSV para começar.
            </p>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Product Search */}
            <div className="mb-4 relative flex-shrink-0">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Filtrar por SKU, Marca, Código ou Descrição..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>

            <div className="flex-1 overflow-auto border border-gray-200 rounded-lg shadow-inner">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th
                      className="px-4 py-3 cursor-pointer hover:bg-gray-200 group select-none w-24"
                      onClick={() => requestSort('sku')}
                    >
                      SKU <SortIcon column="sku" />
                    </th>
                    <th
                      className="px-4 py-3 cursor-pointer hover:bg-gray-200 group select-none w-32"
                      onClick={() => requestSort('brand')}
                    >
                      Marca <SortIcon column="brand" />
                    </th>
                    <th
                      className="px-4 py-3 cursor-pointer hover:bg-gray-200 group select-none w-32"
                      onClick={() => requestSort('factoryCode')}
                    >
                      Cód. Fábrica <SortIcon column="factoryCode" />
                    </th>
                    <th
                      className="px-4 py-3 cursor-pointer hover:bg-gray-200 group select-none min-w-[200px]"
                      onClick={() => requestSort('name')}
                    >
                      Descrição <SortIcon column="name" />
                    </th>
                    <th
                      className="px-4 py-3 cursor-pointer hover:bg-gray-200 group select-none w-40"
                      onClick={() => requestSort('category')}
                    >
                      Categoria <SortIcon column="category" />
                    </th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer hover:bg-gray-200 group select-none w-32"
                      onClick={() => requestSort('price')}
                    >
                      Preço (R$) <SortIcon column="price" />
                    </th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer hover:bg-gray-200 group select-none w-28"
                      onClick={() => requestSort('discount')}
                    >
                      Desc. (%) <SortIcon column="discount" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {displayedProducts.map((p) => (
                    <tr key={`${p.sku}-${p.originalIndex}`} className="hover:bg-gray-50 group">
                      <td className="px-4 py-2 font-mono text-gray-500 text-xs">{p.sku}</td>
                      <td className="px-4 py-2 font-medium text-gray-700 text-xs">
                        {p.brand}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-500">{p.factoryCode}</td>
                      <td className="px-4 py-2 font-medium text-gray-900 text-xs truncate max-w-xs" title={p.name}>{p.name}</td>

                      {/* Editable Category */}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          className="w-full text-xs border-transparent bg-transparent hover:bg-white hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 transition-all"
                          value={p.category}
                          onChange={(e) => handleProductChange(p.originalIndex, 'category', e.target.value)}
                        />
                      </td>

                      {/* Editable Price */}
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          className="w-full text-xs text-right font-bold text-green-700 border-transparent bg-transparent hover:bg-white hover:border-gray-300 focus:bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500 rounded px-2 py-1 transition-all"
                          value={p.price}
                          onChange={(e) => handleProductChange(p.originalIndex, 'price', parseFloat(e.target.value) || 0)}
                        />
                      </td>

                      {/* Editable Discount */}
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          className="w-full text-xs text-right text-gray-600 border-transparent bg-transparent hover:bg-white hover:border-gray-300 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded px-2 py-1 transition-all"
                          value={p.discount || 0}
                          onChange={(e) => handleProductChange(p.originalIndex, 'discount', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-xs text-gray-500 flex justify-between">
              <span>Total de Produtos: <strong>{localProducts.length}</strong></span>
              <span>Exibindo: <strong>{displayedProducts.length}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProductManagement;