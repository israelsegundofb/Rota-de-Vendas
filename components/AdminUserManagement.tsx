import React, { useState } from 'react';
import { User, UserPlus, Shield, Trash2, Pencil, X, Save, Briefcase } from 'lucide-react';
import { User as UserType, SalesCategory } from '../types';

interface AdminUserManagementProps {
  users: UserType[];
  onAddUser: (user: UserType) => void;
  onUpdateUser: (user: UserType) => void;
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

  const handleEditClick = (user: UserType) => {
    setEditingId(user.id);
    setName(user.name);
    setUsername(user.username);
    setPassword(user.password || '');
    setRole(user.role);
    setSalesCategory(user.salesCategory || 'N/A');
    
    // Scroll to form top (optional, but good UX)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !password) return;

    const userData: UserType = {
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
    if (user.role === 'admin') return false; // Admins don't have sales categories usually
    return user.salesCategory === filterType;
  });

  const categoryTabs: ('Todos' | SalesCategory)[] = ['Todos', 'Externo', 'Interno', 'Mercado Livre'];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
      
      {/* Create/Edit User Section */}
      <div className={`bg-white rounded-xl shadow-sm border ${editingId ? 'border-orange-200 ring-4 ring-orange-50' : 'border-gray-200'} p-6 transition-all`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-bold flex items-center gap-2 ${editingId ? 'text-orange-600' : 'text-gray-800'}`}>
            {editingId ? <Pencil className="w-5 h-5" /> : <UserPlus className="w-5 h-5 text-blue-600" />}
            {editingId ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
          </h2>
          {editingId && (
             <button onClick={resetForm} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <X className="w-4 h-4" /> Cancelar Edição
             </button>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Nome Completo</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ex: Carlos Oliveira"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Usuário de Login</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ex: vendedor_carlos"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Senha</label>
            <input 
              type="text" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Senha de acesso"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Perfil de Acesso</label>
            <select 
              value={role}
              onChange={e => setRole(e.target.value as any)}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="salesperson">Vendedor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {role === 'salesperson' && (
            <div className="animate-fade-in">
                <label className="block text-xs font-medium text-gray-700 mb-1">Categoria de Venda</label>
                <select 
                value={salesCategory}
                onChange={e => setSalesCategory(e.target.value as SalesCategory)}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
              className={`px-6 py-2 rounded-lg text-white font-semibold transition-colors flex items-center gap-2 ${
                  editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'
              } disabled:bg-gray-300 disabled:cursor-not-allowed`}
            >
              {editingId ? <Save className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {editingId ? 'Salvar Alterações' : 'Criar Acesso'}
            </button>
          </div>
        </form>
      </div>

      {/* List Users Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
             <Shield className="w-5 h-5 text-gray-600" />
             Usuários Ativos
           </h2>
           
           {/* Filters */}
           <div className="flex bg-gray-100 p-1 rounded-lg">
             {categoryTabs.map(tab => (
                 <button
                    key={tab}
                    onClick={() => setFilterType(tab)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        filterType === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                 >
                    {tab}
                 </button>
             ))}
           </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">Usuário</th>
                <th className="px-6 py-3">Função</th>
                <th className="px-6 py-3">Categoria</th>
                <th className="px-6 py-3">Senha</th>
                <th className="px-6 py-3 text-right">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {filteredUsers.map(user => (
                <tr key={user.id} className={`hover:bg-gray-50 ${editingId === user.id ? 'bg-orange-50' : ''}`}>
                    <td className="px-6 py-3 font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-3 text-gray-600">{user.username}</td>
                    <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                        }`}>
                            {user.role === 'admin' ? 'Admin' : 'Vendedor'}
                        </span>
                    </td>
                    <td className="px-6 py-3">
                        {user.role === 'salesperson' ? (
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                                <Briefcase className="w-3 h-3" />
                                {user.salesCategory || 'N/A'}
                            </span>
                        ) : (
                            <span className="text-gray-300">-</span>
                        )}
                    </td>
                    <td className="px-6 py-3 font-mono text-gray-400">
                    {user.password || '***'}
                    </td>
                    <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => handleEditClick(user)}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                title="Editar"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            
                            {user.username !== 'admin' && (
                                <button 
                                onClick={() => onDeleteUser(user.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
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
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                            Nenhum usuário encontrado para este filtro.
                        </td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUserManagement;