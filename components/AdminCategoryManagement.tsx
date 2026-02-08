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
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
      <div className="bg-surface-container-high rounded-[28px] shadow-elevation-1 p-6 border border-transparent">
        <h2 className="text-xl font-normal text-on-surface mb-2 flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          Gerenciar Categorias de Produtos
        </h2>
        <p className="text-sm text-on-surface-variant mb-6">
          Defina as categorias que a Inteligência Artificial utilizará para classificar os novos clientes importados.
        </p>

        <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-3 h-5 w-5 text-on-surface-variant" />
            <input
              type="text"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-highest border-b border-outline-variant rounded-t-lg text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none transition-colors placeholder:text-on-surface-variant/50"
              placeholder="Nova Categoria (ex: Auto Elétrica)"
            />
          </div>
          <button
            type="submit"
            disabled={!newCategory.trim()}
            className="bg-primary text-on-primary font-medium px-6 py-2.5 rounded-full hover:bg-primary/90 disabled:bg-on-surface/12 disabled:text-on-surface/38 disabled:cursor-not-allowed transition-all shadow-elevation-1 hover:shadow-elevation-2 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((category) => (
            <div
              key={category}
              className="flex items-center justify-between p-3 pl-4 bg-surface-container-highest/50 rounded-xl border border-outline-variant/50 group hover:border-primary/50 transition-colors"
            >
              <span className="font-medium text-on-surface flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                {category}
              </span>
              <button
                onClick={() => onDeleteCategory(category)}
                className="text-on-surface-variant hover:text-error p-2 rounded-full hover:bg-error-container/30 transition-all opacity-0 group-hover:opacity-100"
                title="Remover Categoria"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="col-span-full py-12 text-center text-on-surface-variant bg-surface-container-low rounded-[16px] border border-dashed border-outline-variant/50">
              Nenhuma categoria definida. Adicione categorias acima.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCategoryManagement;