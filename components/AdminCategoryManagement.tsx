import React, { useState } from 'react';
import { Tag, Plus, Trash2, Layers } from 'lucide-react';

interface AdminCategoryManagementProps {
  categories: string[];
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
}

const AdminCategoryManagement: React.FC<AdminCategoryManagementProps> = ({ 
  categories, 
  onAddCategory, 
  onDeleteCategory 
}) => {
  const [newCategory, setNewCategory] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategory.trim()) {
      onAddCategory(newCategory.trim());
      setNewCategory('');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" />
          Gerenciar Categorias de Produtos
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Defina as categorias que a Inteligência Artificial utilizará para classificar os novos clientes importados.
        </p>
        
        <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input 
              type="text" 
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Nova Categoria (ex: Auto Elétrica)"
            />
          </div>
          <button 
            type="submit"
            disabled={!newCategory.trim()}
            className="bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((category) => (
            <div 
              key={category} 
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 group hover:border-blue-200 transition-colors"
            >
              <span className="font-medium text-gray-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                {category}
              </span>
              <button 
                onClick={() => onDeleteCategory(category)}
                className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                title="Remover Categoria"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              Nenhuma categoria definida. Adicione categorias acima.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCategoryManagement;