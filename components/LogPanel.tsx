import React, { useState, useEffect } from 'react';
import {
    Activity,
    Search,
    Filter,
    Clock,
    User,
    AlertCircle,
    FileText,
    MessageSquare,
    RefreshCw,
    Shield,
    X,
    MousePointer2,
    Eye,
    Timer
} from 'lucide-react';
import { SystemLog, AppUser } from '../types';
import { subscribeToSystemLogs } from '../services/firebaseService';

interface LogPanelProps {
    currentUser: AppUser;
    onClose: () => void;
}

const LogPanel: React.FC<LogPanelProps> = ({ currentUser, onClose }) => {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('ALL');
    const [filterAction, setFilterAction] = useState<string>('ALL');

    useEffect(() => {
        const unsubscribe = subscribeToSystemLogs(setLogs);
        return () => unsubscribe();
    }, []);

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.details.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'ALL' || log.category === filterCategory;
        const matchesAction = filterAction === 'ALL' || log.action === filterAction;
        return matchesSearch && matchesCategory && matchesAction;
    });

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE': return 'bg-green-100 text-green-700';
            case 'UPDATE': return 'bg-blue-100 text-blue-700';
            case 'DELETE': return 'bg-red-100 text-red-700';
            case 'ERROR': return 'bg-orange-100 text-orange-700';
            case 'VIEW': return 'bg-purple-100 text-purple-700';
            case 'CLICK': return 'bg-indigo-100 text-indigo-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'CLIENTS': return <User className="w-3.5 h-3.5" />;
            case 'PRODUCTS': return <FileText className="w-3.5 h-3.5" />;
            case 'CHAT': return <MessageSquare className="w-3.5 h-3.5" />;
            case 'AUTH': return <Shield className="w-3.5 h-3.5" />;
            case 'NAVIGATION': return <Eye className="w-3.5 h-3.5" />;
            case 'INTERACTION': return <MousePointer2 className="w-3.5 h-3.5" />;
            default: return <Activity className="w-3.5 h-3.5" />;
        }
    };

    const formatTime = (isoString: string) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch {
            return isoString;
        }
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return null;
        if (seconds < 60) return `${seconds.toFixed(1)}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = (seconds % 60).toFixed(0);
        return `${minutes}m ${remainingSeconds}s`;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl text-white">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Logs e Auditoria</h2>
                            <p className="text-xs text-slate-500 font-medium">Histórico de atualizações, acessos e usabilidade</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                        title="Fechar painel de logs"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-slate-50 flex flex-wrap gap-3 items-center bg-white/80 sticky top-0 z-10">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por usuário ou detalhe..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2">
                        <select
                            className="bg-slate-100 border-none rounded-xl text-xs font-bold py-2 px-4 focus:ring-2 focus:ring-blue-500"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            title="Filtrar por categoria"
                        >
                            <option value="ALL">Todas Categorias</option>
                            <option value="CLIENTS">Clientes</option>
                            <option value="PRODUCTS">Produtos</option>
                            <option value="USERS">Usuários</option>
                            <option value="CHAT">Chat</option>
                            <option value="AUTH">Login/Segurança</option>
                            <option value="NAVIGATION">Navegação</option>
                            <option value="INTERACTION">Interações</option>
                            <option value="SYSTEM">Sistema</option>
                        </select>

                        <select
                            className="bg-slate-100 border-none rounded-xl text-xs font-bold py-2 px-4 focus:ring-2 focus:ring-blue-500"
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            title="Filtrar por ação"
                        >
                            <option value="ALL">Todas Ações</option>
                            <option value="CREATE">Criação (+)</option>
                            <option value="UPDATE">Edição (✎)</option>
                            <option value="DELETE">Exclusão (×)</option>
                            <option value="LOGIN">Acesso Login (→)</option>
                            <option value="VIEW">Visualização (👁)</option>
                            <option value="CLICK">Clique (👆)</option>
                            <option value="ERROR">Erro (⚠)</option>
                            <option value="SYNC">Sincronia (⇅)</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-green-50 text-green-600 px-3 py-1.5 rounded-full font-black text-[10px] uppercase tracking-wider border border-green-100 shadow-sm animate-pulse">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            LIVE
                        </div>
                        <div className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-black uppercase tracking-wider border border-blue-100">
                            {filteredLogs.length} Eventos encontrados
                        </div>
                    </div>
                </div>

                {/* Logs List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/30">
                    {filteredLogs.length > 0 ? (
                        filteredLogs.map((log) => (
                            <div
                                key={log.id}
                                className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-4 items-start md:items-center group"
                            >
                                {/* Time & User */}
                                <div className="flex items-start gap-3 min-w-[180px]">
                                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
                                            {formatTime(log.timestamp)}
                                        </p>
                                        <p className="font-bold text-xs text-slate-700 truncate">{log.userName}</p>
                                        <p className="text-[9px] font-medium text-slate-400 uppercase truncate">{log.userRole}</p>
                                    </div>
                                </div>

                                {/* Action & Category */}
                                <div className="flex flex-wrap gap-2 min-w-[140px]">
                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase flex items-center gap-1 ${getActionColor(log.action)}`}>
                                        {log.action}
                                    </span>
                                    <span className="px-2 py-1 rounded-md text-[9px] font-black uppercase bg-slate-50 text-slate-500 flex items-center gap-1 border border-slate-100">
                                        {getCategoryIcon(log.category)}
                                        {log.category}
                                    </span>
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                                        "{log.details}"
                                    </p>

                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {/* Metadata Chips */}
                                        {log.metadata?.duration && (
                                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 rounded-md text-[10px] font-bold border border-purple-100">
                                                <Timer className="w-3 h-3" />
                                                Tempo: {formatDuration(log.metadata.duration)}
                                            </div>
                                        )}

                                        {log.metadata?.elementId && (
                                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-bold border border-indigo-100">
                                                <MousePointer2 className="w-3 h-3" />
                                                Elemento: {log.metadata.elementId}
                                            </div>
                                        )}

                                        {log.metadata && !log.metadata.duration && !log.metadata.elementId && Object.keys(log.metadata).length > 0 && (
                                            <div className="text-[10px] bg-slate-50 p-1 px-2 rounded-lg font-mono text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap border border-dashed border-slate-200 max-w-[200px]">
                                                {JSON.stringify(log.metadata)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-40 py-20">
                            <RefreshCw className="w-12 h-12 text-slate-300 mb-4 animate-spin-slow" />
                            <p className="font-bold text-slate-400">Nenhum log corresponde aos filtros</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LogPanel;
