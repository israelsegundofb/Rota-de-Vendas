import React from 'react';
import {
  LayoutDashboard, X, Map as MapIcon, Table as TableIcon, History, MessageSquare,
  Users as UsersIcon, Layers, Package, FileUp, Cloud, Activity, LogOut
} from 'lucide-react';
import { AppUser, UserStatus } from '../types';
import { isAdmin } from '../utils/authUtils';
import { updateUserStatusInCloud } from '../services/firebaseService';

interface SidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  currentUser: AppUser;
  activeView: 'map' | 'table' | 'dashboard' | 'admin_users' | 'admin_categories' | 'admin_products' | 'admin_files' | 'history' | 'chat';
  setActiveView: (view: 'map' | 'table' | 'dashboard' | 'admin_users' | 'admin_categories' | 'admin_products' | 'admin_files' | 'history' | 'chat') => void;
  handleViewNavigation: (view: string) => void;
  handleLogout: () => void;
  users: AppUser[];
  baseUpdateUser: (user: AppUser) => void;
  totalUnread: number;
  activeConversationId: string | null;
  handleChatMarkAsRead: (userId: string) => void;
  setIsCloudConfigOpen: (isOpen: boolean) => void;
  setIsLogPanelOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  currentUser,
  activeView,
  setActiveView,
  handleViewNavigation,
  handleLogout,
  users,
  baseUpdateUser,
  totalUnread,
  activeConversationId,
  handleChatMarkAsRead,
  setIsCloudConfigOpen,
  setIsLogPanelOpen,
}) => {
  const isAdminUser = isAdmin(currentUser.role);

  return (
    <aside
      className={`
      w-72 bg-surface-container-low text-on-surface shadow-elevation-2 z-30
      fixed md:relative h-full transition-transform duration-300 ease-in-out
      ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      flex flex-col border-r border-outline-variant/30
    `}
    >
      <div className="p-6 border-b border-outline-variant/30 flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2 text-primary">
          <LayoutDashboard className="w-6 h-6" />
          Rota de Vendas
        </h1>
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden text-on-surface-variant hover:text-primary"
          title="Fechar menu lateral"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="px-6 py-2">
        <p className="text-xs font-medium text-on-surface-variant/80 uppercase tracking-wider">
          {isAdminUser ? 'Painel Administrativo' : 'Portal do Vendedor'}
        </p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
        <div className="bg-surface-container-highest rounded-2xl p-4 mb-6 border border-outline-variant/30 shadow-sm relative overflow-hidden group">
          <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>
          <p className="text-xs text-on-surface-variant uppercase font-bold tracking-wider mb-2 relative z-10">Logado como</p>
          <div className="flex flex-col gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md overflow-hidden ${isAdminUser ? 'bg-tertiary' : 'bg-secondary'}`}>
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span>{currentUser.name.charAt(0)}</span>
                  )}
                </div>
                {/* Status Indicator Badge */}
                <div className={`
                  absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface-container-highest shadow-sm
                  ${currentUser.status === 'Online' ? 'bg-green-500' : currentUser.status === 'Ocupado' ? 'bg-amber-500' : 'bg-slate-400'}
                `}></div>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-on-surface truncate">{currentUser.name}</p>
                <p className="text-xs text-on-surface-variant truncate opacity-80">{currentUser.email}</p>
              </div>
            </div>

            {/* Status Selector */}
            <div className="flex items-center gap-2 pt-1 border-t border-outline-variant/10">
              <select
                value={currentUser.status || 'Offline'}
                onChange={async (e) => {
                  const newStatus = e.target.value as UserStatus;
                  // Atualizar localmente primeiro para feedback instantâneo
                  baseUpdateUser({ ...currentUser, status: newStatus });

                  await updateUserStatusInCloud(currentUser.id, newStatus, users);
                }}
                className={`
                  text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded-full border transition-all cursor-pointer outline-none bg-surface/50
                  ${currentUser.status === 'Online' ? 'border-green-200 text-green-700 hover:bg-green-50' :
                    currentUser.status === 'Ocupado' ? 'border-amber-200 text-amber-700 hover:bg-amber-50' :
                      'border-slate-200 text-slate-500 hover:bg-slate-50'}
                `}
              >
                <option value="Online">🟢 Online</option>
                <option value="Ocupado">🟡 Ocupado</option>
                <option value="Offline">⚪ Offline</option>
              </select>
            </div>
          </div>
        </div>

        <nav className="space-y-1 mb-8">
          <p className="px-3 text-xs font-bold text-on-surface-variant/60 uppercase mb-3 tracking-wider">Visualização</p>
          <button
            onClick={() => { setActiveView('map'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'map'
              ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
              : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
              }`}
          >
            <MapIcon className={`w-5 h-5 ${activeView === 'map' ? 'fill-current' : ''}`} />
            Mapa da Carteira
          </button>

          {isAdminUser && (
            <button
              onClick={() => { handleViewNavigation('dashboard'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'dashboard'
                ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
                : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
                }`}
            >
              <LayoutDashboard className={`w-5 h-5 ${activeView === 'dashboard' ? 'fill-current' : ''}`} />
              Dashboard Admin
            </button>
          )}

          <button
            onClick={() => { setActiveView('table'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'table'
              ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
              : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
              }`}
          >
            <TableIcon className={`w-5 h-5 ${activeView === 'table' ? 'fill-current' : ''}`} />
            Listagem de Dados
          </button>

          <button
            onClick={() => { setActiveView('history'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'history'
              ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
              : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
              }`}
          >
            <History className={`w-5 h-5 ${activeView === 'history' ? 'fill-current' : ''}`} />
            Histórico de Vendas
          </button>

          <button
            onClick={() => { setActiveView('chat'); setIsMobileMenuOpen(false); if (activeConversationId) handleChatMarkAsRead(activeConversationId); }}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'chat'
              ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
              : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
              }`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className={`w-5 h-5 ${activeView === 'chat' ? 'fill-current' : ''}`} />
              Mensagens Internas
            </div>
            {totalUnread > 0 && activeView !== 'chat' && (
              <div className="bg-error text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                {totalUnread}
              </div>
            )}
          </button>
        </nav>

        {isAdminUser && (
          <nav className="space-y-1 mb-8">
            <p className="px-3 text-xs font-bold text-on-surface-variant/60 uppercase mb-3 tracking-wider">Administração</p>

            <button
              onClick={() => { handleViewNavigation('admin_users'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'admin_users'
                ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
                : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
                }`}
            >
              <UsersIcon className={`w-5 h-5 ${activeView === 'admin_users' ? 'fill-current' : ''}`} />
              Gerenciar Usuários
            </button>

            <button
              onClick={() => { handleViewNavigation('admin_categories'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'admin_categories'
                ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
                : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
                }`}
            >
              <Layers className={`w-5 h-5 ${activeView === 'admin_categories' ? 'fill-current' : ''}`} />
              Categorias
            </button>

            <button
              onClick={() => { handleViewNavigation('admin_products'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'admin_products'
                ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
                : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
                }`}
            >
              <Package className={`w-5 h-5 ${activeView === 'admin_products' ? 'fill-current' : ''}`} />
              Produtos
            </button>

            <button
              onClick={() => { handleViewNavigation('admin_files'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'admin_files'
                ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
                : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
                }`}
            >
              <FileUp className={`w-5 h-5 ${activeView === 'admin_files' ? 'fill-current' : ''}`} />
              Arquivos
            </button>

            {currentUser?.role === 'admin_dev' && (
              <button
                onClick={() => { setIsCloudConfigOpen(true); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 text-on-surface-variant hover:bg-surface-container-highest active:scale-95`}
              >
                <Cloud className="w-5 h-5" />
                Backup & Cloud
              </button>
            )}
            {currentUser?.role === 'admin_dev' && (
              <button
                onClick={() => {
                  setIsLogPanelOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all hover:bg-slate-100 group"
                title="🖥️ Logs e Auditoria do Sistema"
              >
                <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900">Logs do Sistema</span>
              </button>
            )}
          </nav>
        )}
      </div>

      <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-error bg-error-container hover:bg-error-container/80 rounded-full transition-colors shadow-sm"
          title="Encerrar sessão e sair do sistema"
        >
          <LogOut className="w-4 h-4 box-content" /> Sair do Sistema
        </button>

        <div className="text-center mt-4">
          <p className="text-[10px] text-on-surface-variant opacity-60">Versão 3.5.0 V5.3.4 (Cancel Resilience)</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
