import React, { useState, useMemo } from 'react';
import { Product, EnrichedClient } from '../types';
import { X, Search, CheckCircle, Save, ShoppingBag } from 'lucide-react';

interface ClientProductAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: EnrichedClient | null;
    products: Product[];
    onSave: (clientId: string, products: Product[]) => void;
    productCategories: string[];
}

const ClientProductAssignmentModal: React.FC<ClientProductAssignmentModalProps> = ({
    isOpen,
    onClose,
    client,
    products,
    onSave,
    productCategories
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [selectedProductSkus, setSelectedProductSkus] = useState<string[]>([]);
    const [showOnlyPurchased, setShowOnlyPurchased] = useState(false);

    // Initialize selected products when client changes
    React.useEffect(() => {
        if (client && client.purchasedProducts) {
            setSelectedProductSkus(client.purchasedProducts.map(p => p.sku));
        } else {
            setSelectedProductSkus([]);
        }
    }, [client]);

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesSearch =
                (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (product.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (product.brand || '').toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;

            const isSelected = selectedProductSkus.includes(product.sku);
            const matchesPurchased = !showOnlyPurchased || isSelected;

            return matchesSearch && matchesCategory && matchesPurchased;
        });
    }, [products, searchTerm, selectedCategory, showOnlyPurchased, selectedProductSkus]);

    const handleToggleProduct = (sku: string) => {
        setSelectedProductSkus(prev => {
            if (prev.includes(sku)) {
                return prev.filter(s => s !== sku);
            } else {
                return [...prev, sku];
            }
        });
    };

    const handleSave = () => {
        if (!client) return;

        // Map SKUs back to full product objects
        const assignedProducts = products.filter(p => selectedProductSkus.includes(p.sku));
        onSave(client.id, assignedProducts);
        onClose();
    };

    if (!isOpen || !client) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-blue-600" />
                            Atribuir Produtos
                        </h2>
                        <p className="text-sm text-gray-500">
                            Cliente: <span className="font-semibold text-gray-700">{client.companyName}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors" title="Fechar modal">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 bg-white z-10">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, SKU, marca..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        title="Filtrar por Departamento"
                    >
                        <option value="Todos">Todos os Departamentos</option>
                        {productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>

                {/* Sub-Filters / Quick Actions */}
                <div className="p-4 bg-gray-50 flex items-center justify-center gap-3 border-b border-gray-100">
                    <button
                        onClick={() => setShowOnlyPurchased(false)}
                        className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap
              ${!showOnlyPurchased
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
                            }
            `}
                    >
                        Ver Todos os Produtos
                    </button>
                    <button
                        onClick={() => setShowOnlyPurchased(true)}
                        className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap
              ${showOnlyPurchased
                                ? 'bg-green-600 text-white shadow-sm'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300'
                            }
            `}
                    >
                        <ShoppingBag className="w-3 h-3" />
                        Produtos Comprados
                    </button>
                </div>

                {/* Product List */}
                <div className="flex-1 overflow-y-auto p-2 bg-gray-50/50">
                    {filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                            <p>Nenhum produto encontrado.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {filteredProducts.map(product => {
                                const isSelected = selectedProductSkus.includes(product.sku);
                                return (
                                    <div
                                        key={product.sku}
                                        onClick={() => handleToggleProduct(product.sku)}
                                        className={`
                      relative p-3 rounded-xl border cursor-pointer transition-all duration-200 group
                      ${isSelected
                                                ? 'bg-blue-50 border-blue-500 shadow-sm'
                                                : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                                            }
                    `}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="min-w-0">
                                                <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-800' : 'text-gray-800'}`}>
                                                    {product.name}
                                                </p>
                                                <p className="text-xs text-blue-600 font-bold uppercase truncate">
                                                    {product.brand}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate">
                                                    SKU: {product.sku}
                                                </p>
                                                <p className="text-xs font-bold text-gray-700 mt-1">
                                                    {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </p>
                                            </div>

                                            <div className={`
                        w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                        ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 group-hover:border-blue-400'}
                      `}>
                                                {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        <span className="font-bold text-blue-600">{selectedProductSkus.length}</span> produtos selecionados
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-transform active:scale-95"
                        >
                            <Save className="w-4 h-4" />
                            Salvar Atribuição
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ClientProductAssignmentModal;
