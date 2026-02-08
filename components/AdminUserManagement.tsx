import React, { useState } from 'react';
import { User, UserPlus, Shield, Trash2, Pencil, X, Save, Briefcase } from 'lucide-react';
import { AppUser, SalesCategory } from '../types';

interface AdminUserManagementProps {
  users: AppUser[];
  onAddUser: (user: AppUser) => void;
  onUpdateUser: (user: AppUser) => void;
  onDeleteUser: (userId: string) => void;
}

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ users, onAddUser, onUpdateUser, onDeleteUser }) => {
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'salesperson' | 'admin'>('salesperson');
  const [salesCategory, setSalesCategory] = useState<SalesCategory>('Externo');

  // Filter State
  const [filterType, setFilterType] = useState<'Todos' | SalesCategory>('Todos');

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setUsername('');
    setPassword('');
    setRole('salesperson');
    setSalesCategory('Externo');
  };

  const handleEditClick = (user: AppUser) => {
    setEditingId(user.id);
    setName(user.name);
    setUsername(user.username);
    setPassword(user.password || '');
    setRole(user.role);
    setSalesCategory(user.salesCategory || 'N/A');

    // Scroll to form top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !password) return;

    const userData: AppUser = {
      id: editingId || Date.now().toString(),
      name,
      username,
      role,
      password,
      salesCategory: role === 'salesperson' ? salesCategory : 'N/A'
    };

    if (editingId) {
      onUpdateUser(userData);
    } else {
      onAddUser(userData);
    }

    resetForm();
  };

  // Filter Users
  const filteredUsers = users.filter(user => {
    if (filterType === 'Todos') return true;
    if (user.role === 'admin') return false;
    return user.salesCategory === filterType;
  });

  const categoryTabs: ('Todos' | SalesCategory)[] = ['Todos', 'Externo', 'Interno', 'Mercado Livre'];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">

      {/* Create/Edit User Section */}
      <div className={`bg-surface-container-high rounded-[28px] shadow-elevation-1 p-6 transition-all border ${editingId ? 'border-primary ring-2 ring-primary/20' : 'border-transparent'}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-normal flex items-center gap-2 ${editingId ? 'text-primary' : 'text-on-surface'}`}>
            {editingId ? <Pencil className="w-5 h-5" /> : <UserPlus className="w-5 h-5 text-primary" />}
            {editingId ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
          </h2>
          {editingId && (
            <button onClick={resetForm} className="text-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1">
              <X className="w-4 h-4" /> Cancelar Edição
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-on-surface-variant mb-1 ml-1">Nome Completo</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none transition-colors"
              placeholder="Ex: Carlos Oliveira"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1 ml-1">Usuário de Login</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none transition-colors"
              placeholder="Ex: vendedor_carlos"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1 ml-1">Senha</label>
            <input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none transition-colors"
              placeholder="Senha de acesso"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1 ml-1">Perfil de Acesso</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as any)}
              className="w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none appearance-none cursor-pointer"
            >
              <option value="salesperson">Vendedor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {role === 'salesperson' && (
            <div className="animate-fade-in">
              <label className="block text-xs font-medium text-on-surface-variant mb-1 ml-1">Categoria de Venda</label>
              <select
                value={salesCategory}
                onChange={e => setSalesCategory(e.target.value as SalesCategory)}
                className="w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none appearance-none cursor-pointer"
              >
                <option value="Externo">Externo</option>
                <option value="Interno">Interno</option>
                <option value="Mercado Livre">Mercado Livre</option>
              </select>
            </div>
          )}

          <div className="lg:col-span-3 pt-2 flex justify-end">
            <button
              type="submit"
              disabled={!name || !username || !password}
              className={`px-6 py-2.5 rounded-full font-medium transition-all shadow-elevation-1 hover:shadow-elevation-2 flex items-center gap-2 ${editingId
                ? 'bg-primary-container text-on-primary-container hover:bg-primary-container/80'
                : 'bg-primary text-on-primary hover:bg-primary/90'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
            >
              {editingId ? <Save className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {editingId ? 'Salvar Alterações' : 'Criar Acesso'}
            </button>
          </div>
        </form>
      </div>

      {/* List Users Section */}
      <div className="bg-surface-container-high rounded-[28px] shadow-elevation-1 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-normal text-on-surface flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Usuários Ativos
          </h2>

          {/* Filters */}
          <div className="flex bg-surface-container-highest p-1 rounded-full">
            {categoryTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setFilterType(tab)}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${filterType === tab
                  ? 'bg-white text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-on-surface-variant uppercase bg-surface-container-highest/50">
              <tr>
                <th className="px-6 py-4 font-medium">Nome</th>
                <th className="px-6 py-4 font-medium">Usuário</th>
                <th className="px-6 py-4 font-medium">Função</th>
                <th className="px-6 py-4 font-medium">Categoria</th>
                <th className="px-6 py-4 font-medium">Senha</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {filteredUsers.map(user => (
                <tr key={user.id} className={`hover:bg-surface-container-highest/30 transition-colors ${editingId === user.id ? 'bg-primary-container/30' : ''}`}>
                  <td className="px-6 py-4 font-medium text-on-surface">{user.name}</td>
                  <td className="px-6 py-4 text-on-surface-variant">{user.username}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${user.role === 'admin'
                      ? 'bg-tertiary-container text-on-tertiary-container border-tertiary-container'
                      : 'bg-secondary-container text-on-secondary-container border-secondary-container'
                      }`}>
                      {user.role === 'admin' ? 'Admin' : 'Vendedor'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.role === 'salesperson' ? (
                      <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                        <Briefcase className="w-3.5 h-3.5" />
                        {user.salesCategory || 'N/A'}
                      </span>
                    ) : (
                      <span className="text-outline-variant">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-on-surface-variant/70 text-xs">
                    {user.password || '***'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditClick(user)}
                        className="p-2 text-primary hover:bg-primary-container/30 rounded-full transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {user.username !== 'admin' && (
                        <button
                          onClick={() => onDeleteUser(user.id)}
                          className="p-2 text-error hover:bg-error-container/30 rounded-full transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                    Nenhum usuário encontrado para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4 p-4">
          {filteredUsers.map(user => (
            <div key={user.id} className={`bg-surface-container-highest/30 rounded-xl p-4 border border-outline-variant/30 ${editingId === user.id ? 'bg-primary-container/30 border-primary/30' : ''}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-on-surface">{user.name}</h3>
                  <p className="text-xs text-on-surface-variant">@{user.username}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${user.role === 'admin'
                  ? 'bg-tertiary-container text-on-tertiary-container border-tertiary-container'
                  : 'bg-secondary-container text-on-secondary-container border-secondary-container'
                  }`}>
                  {user.role === 'admin' ? 'Admin' : 'Vendedor'}
                </span>
              </div>

              <div className="space-y-2 text-sm text-on-surface-variant mb-4">
                <div className="flex justify-between border-b border-outline-variant/20 pb-1">
                  <span>Categoria:</span>
                  <span className="font-medium text-on-surface">{user.salesCategory || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-outline-variant/20 pb-1">
                  <span>Senha:</span>
                  <span className="font-mono">{user.password || '***'}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => handleEditClick(user)}
                  className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-primary/20 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                {user.username !== 'admin' && (
                  <button
                    onClick={() => onDeleteUser(user.id)}
                    className="px-3 py-1.5 bg-error/10 text-error rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-error/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <p className="text-center text-on-surface-variant py-8 text-sm">Nenhum usuário encontrado.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserManagement;