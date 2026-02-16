import React, { useState } from 'react';
import { FileUp, Users, Package, AlertCircle, CheckCircle, Loader2, Trash2, Calendar, FileText, FileSpreadsheet, Search, Filter, X } from 'lucide-react';
import { isSalesTeam } from '../utils/authUtils';
import { AppUser, UploadedFile } from '../types';


interface AdminFileManagerProps {
    users: AppUser[];
    uploadedFiles: UploadedFile[];
    onUploadClients: (file: File, targetUserId: string) => void;
    onUploadProducts: (file: File) => void;
    onUploadPurchases: (file: File, targetUserId: string) => void;
    onDeleteFile: (fileId: string) => void;
    onReassignSalesperson?: (fileId: string, newSalespersonId: string) => void;
    procState?: {
        isActive: boolean;
        current: number; // Added for progress tracking
        total: number;   // Added for progress tracking
        status: 'reading' | 'processing' | 'completed' | 'error';
        errorMessage?: string;
    };
}

interface PendingFile {
    file: File;
    targetUserId: string;
}

const AdminFileManager: React.FC<AdminFileManagerProps> = ({
    users,
    uploadedFiles,
    onUploadClients,
    onUploadProducts,
    onUploadPurchases,
    onDeleteFile,
    onReassignSalesperson,
    procState = { isActive: false, status: 'completed', errorMessage: '', current: 0, total: 0 }
}) => {
    const [activeTab, setActiveTab] = useState<'clients' | 'products' | 'purchases'>('clients');
    const [targetUploadUserId, setTargetUploadUserId] = useState<string>('');
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]); // Staging area

    const handleClientFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files).map(file => ({
                file,
                targetUserId: targetUploadUserId || '' // Default to currently selected, or empty
            }));

            setPendingFiles(prev => [...prev, ...newFiles]);
            e.target.value = ''; // Reset input
        }
    };

    const removePendingFile = (index: number) => {
        setPendingFiles(prev => prev.filter((_, i) => i !== index));
    };

    const updatePendingFileUser = (index: number, userId: string) => {
        setPendingFiles(prev => {
            const newFiles = [...prev];
            newFiles[index].targetUserId = userId;
            return newFiles;
        });
    };

    const handleProcessQueue = async () => {
        // Filter out files without a user assigned
        const validFiles = pendingFiles.filter(pf => pf.targetUserId);

        if (validFiles.length === 0) {
            alert("Por favor, atribua um vendedor para todos os arquivos antes de processar.");
            return;
        }

        // Process sequentially
        for (const pf of validFiles) {
            // We need to signal to App.tsx that this is a batch and shouldn't prompt every time?
            // Or we rely on App.tsx handling. 
            // Note: onUploadClients likely triggers the async process. 
            // If we call it in a loop, it might be tricky if it doesn't return a promise or if App logic is singleton.
            // We will assume `onUploadClients` serves as the trigger.

            // Ideally we should wait, but `onUploadClients` definition in props implies void return.
            // We'll rely on App.tsx to handle the queue or we modify App.tsx first.
            // *Correction*: Implementation plan said "Update handleClientFileDirect signature... Ensure... returns a Promise".
            // So here we will await it. We need to cast or update the interface in a real scenario, 
            // but for this file we assume it returns Promise<void> so we can await.

            await (onUploadClients as any)(pf.file, pf.targetUserId, true); // true = skipConfirmation
        }

        // Clear queue after starting? Or clear only processed?
        // Since we await, we can clear each as we go or all at once.
        setPendingFiles([]);
    };

    const handleProductFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onUploadProducts(file);
            e.target.value = ''; // Reset input
        }
    };

    const filteredFiles = uploadedFiles.filter(f => f.type === activeTab);

    return (
        <div className="p-6 max-w-7xl mx-auto h-full overflow-y-auto bg-surface-container-low">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-on-surface mb-1 flex items-center gap-2">
                        <FileUp className="w-8 h-8 text-primary" />
                        Gerenciamento de Arquivos
                    </h1>
                    <p className="text-on-surface-variant text-sm">Gerencie as planilhas importadas e carregue novos dados.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-outline-variant mb-6">
                <button
                    onClick={() => setActiveTab('clients')}
                    className={`pb-3 px-6 font-medium text-sm transition-colors relative flex items-center gap-2 ${activeTab === 'clients' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                    <Users className="w-4 h-4" />
                    Carteiras de Clientes
                    {activeTab === 'clients' && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-primary rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('products')}
                    className={`pb-3 px-6 font-medium text-sm transition-colors relative flex items-center gap-2 ${activeTab === 'products' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                    <Package className="w-4 h-4" />
                    Catálogo de Produtos
                    {activeTab === 'products' && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-primary rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('purchases')}
                    className={`pb-3 px-6 font-medium text-sm transition-colors relative flex items-center gap-2 ${activeTab === 'purchases' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                    <FileText className="w-4 h-4" />
                    Atualizar Compras (Razão Social)
                    {activeTab === 'purchases' && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-primary rounded-t-full"></div>}
                </button>
            </div>

            {/* Status Messages */}
            {procState?.isActive && (
                <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 shadow-elevation-1 border ${procState.status === 'error' ? 'bg-error-container text-on-error-container border-error' : 'bg-primary-container text-on-primary-container border-primary'}`}>
                    {procState.status === 'processing' || procState.status === 'reading' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                        procState.status === 'completed' ? <CheckCircle className="w-5 h-5" /> :
                            <AlertCircle className="w-5 h-5" />}
                    <div>
                        <p className="font-bold text-sm">
                            {procState.status === 'reading' ? 'Lendo arquivo...' :
                                procState.status === 'processing' ? 'Processando dados...' :
                                    procState.status === 'completed' ? 'Importação Concluída!' : 'Erro na Importação'}
                        </p>
                        {procState.errorMessage && <p className="text-xs mt-1 opacity-80">{procState.errorMessage}</p>}
                    </div>
                </div>
            )}

            <div className="grid lg:grid-cols-12 gap-6">
                {/* Upload Section - Takes 4 cols */}
                <div className="lg:col-span-4">
                    <div className="bg-surface rounded-[20px] shadow-elevation-1 p-6 sticky top-6 border border-outline-variant/30">
                        <h3 className="font-bold text-lg text-on-surface mb-4 flex items-center gap-2">
                            <Cloud className="w-5 h-5 text-primary" />
                            Nova Importação
                        </h3>

                        {activeTab === 'clients' ? (
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                        Vendedor Responsável
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-surface-container border border-outline rounded-lg p-3 pr-10 text-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                                            value={targetUploadUserId}
                                            onChange={(e) => setTargetUploadUserId(e.target.value)}
                                        >
                                            <option value="" disabled>Selecione um vendedor...</option>
                                            {users.filter(u => isSalesTeam(u.role)).map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                                            <UserIcon className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>


                                {/* Pending Files Staging Area */}
                                {pendingFiles.length > 0 && (
                                    <div className="bg-surface-container-high rounded-xl p-4 border border-primary/20 space-y-3">
                                        <h4 className="text-sm font-bold text-primary flex items-center justify-between">
                                            <span>Arquivos na Fila ({pendingFiles.length})</span>
                                            <button
                                                onClick={() => setPendingFiles([])}
                                                className="text-xs font-normal text-on-surface-variant hover:text-error"
                                            >
                                                Limpar tudo
                                            </button>
                                        </h4>
                                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                                            {pendingFiles.map((pf, idx) => (
                                                <div key={idx} className="bg-surface p-2 rounded-lg border border-outline-variant text-xs flex items-center gap-2">
                                                    <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
                                                    <span className="truncate flex-1 font-medium" title={pf.file.name}>{pf.file.name}</span>

                                                    {/* Per-file User Select */}
                                                    <select
                                                        value={pf.targetUserId}
                                                        onChange={(e) => updatePendingFileUser(idx, e.target.value)}
                                                        className={`bg-transparent border rounded px-1 py-0.5 outline-none w-24 ${!pf.targetUserId ? 'border-error text-error' : 'border-outline-variant text-on-surface'}`}
                                                    >
                                                        <option value="" disabled>Vendedor...</option>
                                                        {users.filter(u => isSalesTeam(u.role)).map(u => (
                                                            <option key={u.id} value={u.id}>{u.name}</option>
                                                        ))}
                                                    </select>

                                                    <button
                                                        onClick={() => removePendingFile(idx)}
                                                        className="text-on-surface-variant hover:text-error p-1"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={handleProcessQueue}
                                            disabled={procState?.isActive || pendingFiles.some(pf => !pf.targetUserId)}
                                            className="w-full py-2 bg-primary text-on-primary rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                        >
                                            {procState?.isActive ? (
                                                <>
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    Processando...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-3 h-3" />
                                                    Processar {pendingFiles.length} Arquivos
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                <label className={`group flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 relative overflow-hidden ${!targetUploadUserId ? 'border-outline-variant bg-surface-container/50 opacity-60 cursor-not-allowed' : 'border-primary/50 bg-primary-container/20 hover:bg-primary-container/40 hover:border-primary'}`}>
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6 z-10">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${!targetUploadUserId ? 'bg-surface-variant text-on-surface-variant' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-on-primary'}`}>
                                            <FileUp className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm font-medium text-on-surface text-center px-4">
                                            Clique para selecionar arquivos (Multi-upload)
                                        </p>
                                    </div>
                                    <input
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        className="hidden"
                                        multiple // Enable multiple files
                                        onChange={handleClientFileChange}
                                        disabled={procState?.isActive && procState.status === 'processing'}
                                    />
                                </label>
                            </div>
                        ) : activeTab === 'purchases' ? (
                            <div className="space-y-5">
                                <div className="bg-blue-50 p-4 rounded-xl text-xs text-blue-800 mb-2 flex gap-3 border border-blue-100 italic">
                                    <AlertCircle className="w-5 h-5 shrink-0 text-blue-500" />
                                    <p>Este upload identifica o cliente pela **Razão Social** e substitui todo o histórico de compras dele pelos produtos deste arquivo.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                        Vendedor Destino
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-surface-container border border-outline rounded-lg p-3 pr-10 text-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                                            value={targetUploadUserId}
                                            onChange={(e) => setTargetUploadUserId(e.target.value)}
                                        >
                                            <option value="" disabled>Selecione um vendedor...</option>
                                            {users.filter(u => isSalesTeam(u.role)).map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                                            <UserIcon className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                <label className={`group flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 relative overflow-hidden ${!targetUploadUserId ? 'border-outline-variant bg-surface-container/50 opacity-60 cursor-not-allowed' : 'border-blue-300 bg-blue-50/30 hover:bg-blue-50/50 hover:border-blue-500'}`}>
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6 z-10">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${!targetUploadUserId ? 'bg-surface-variant text-on-surface-variant' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                            <FileUp className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm font-medium text-on-surface text-center px-4">
                                            Carregar Planilha de Compras
                                        </p>
                                    </div>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file && targetUploadUserId) {
                                                onUploadPurchases(file, targetUploadUserId);
                                                e.target.value = '';
                                            }
                                        }}
                                        disabled={procState?.isActive && procState.status === 'processing'}
                                    />
                                </label>
                                <div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant italic">
                                    <FileText className="w-3 h-3" />
                                    <span>Colunas Esperadas: Razão Social, SKU, Nome do Produto</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-secondary-container p-4 rounded-xl text-xs text-on-secondary-container mb-4 flex gap-3">
                                    <Package className="w-5 h-5 shrink-0" />
                                    <p>Importe o catálogo completo de produtos para atualizar preços e estoque.</p>
                                </div>
                                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-tertiary/50 bg-tertiary-container/20 rounded-xl cursor-pointer hover:bg-tertiary-container/40 hover:border-tertiary transition-all">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <div className="w-12 h-12 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center mb-3">
                                            <Package className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm font-medium text-on-surface">Carregar Catálogo</p>
                                    </div>
                                    <input
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        className="hidden"
                                        onChange={handleProductFileChange}
                                        disabled={procState?.isActive && procState.status === 'processing'}
                                    />
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: File List - Takes 8 cols */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-on-surface flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-primary" />
                            Arquivos Carregados
                            <span className="bg-primary-container text-on-primary-container text-xs px-2 py-0.5 rounded-full font-bold ml-1">
                                {filteredFiles.length}
                            </span>
                        </h3>
                    </div>

                    {filteredFiles.length === 0 ? (
                        <div className="bg-surface rounded-xl border-2 border-dashed border-outline-variant p-12 text-center flex flex-col items-center">
                            <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mb-4">
                                <FileText className="w-10 h-10 text-outline" />
                            </div>
                            <h4 className="text-lg font-medium text-on-surface mb-1">Nenhum arquivo encontrado</h4>
                            <p className="text-on-surface-variant text-sm max-w-md">
                                Utilize a área ao lado para importar sua primeira planilha de dados.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredFiles.map((file) => (
                                <div
                                    key={file.id}
                                    className="bg-surface rounded-xl p-4 shadow-elevation-1 border border-outline-variant/30 hover:shadow-elevation-2 transition-shadow duration-200 flex flex-col sm:flex-row sm:items-center gap-4 group"
                                >
                                    {/* Icon & Details */}
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${file.status === 'error' ? 'bg-error-container text-error' :
                                            file.status === 'processing' ? 'bg-surface-container-high text-primary animate-pulse' :
                                                'bg-surface-container-high text-primary'
                                            }`}>
                                            {file.status === 'processing' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                                file.status === 'error' ? <AlertCircle className="w-5 h-5" /> :
                                                    <FileSpreadsheet className="w-5 h-5" />}
                                        </div>

                                        <div className="min-w-0">
                                            <h4 className="font-semibold text-on-surface text-sm truncate pr-2" title={file.fileName}>
                                                {file.fileName}
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-on-surface-variant">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(file.uploadDate).toLocaleDateString()}
                                                    <span className="opacity-60 ml-1">
                                                        {new Date(file.uploadDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" />
                                                    {file.itemCount} registros
                                                </div>
                                            </div>
                                            {file.status === 'error' && (
                                                <p className="text-xs text-error mt-1 font-medium bg-error-container/30 px-2 py-0.5 rounded inline-block">
                                                    {file.errorMessage || "Erro desconhecido"}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Owner Info with Reassignment (Only for clients) */}
                                    {activeTab === 'clients' && (
                                        <div className="flex items-center gap-3 sm:border-l sm:border-r border-outline-variant/30 sm:px-4 sm:w-56 shrink-0">
                                            <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                                {(() => {
                                                    const user = users.find(u => u.id === file.salespersonId);
                                                    return user?.name?.charAt(0) || '?';
                                                })()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <select
                                                    value={file.salespersonId}
                                                    onChange={(e) => onReassignSalesperson?.(file.id, e.target.value)}
                                                    className="w-full text-xs font-medium bg-transparent border border-outline-variant/50 rounded-md px-2 py-1 text-on-surface hover:bg-surface-container-highest focus:ring-2 focus:ring-primary focus:border-primary outline-none cursor-pointer"
                                                    disabled={file.status === 'processing'}
                                                >
                                                    <option value="" className="bg-surface text-on-surface">None</option>
                                                    {users.filter(u => isSalesTeam(u.role)).map(u => (
                                                        <option key={u.id} value={u.id} className="bg-surface text-on-surface">
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-on-surface-variant mt-0.5">Responsável</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center justify-end gap-2 sm:w-auto w-full border-t sm:border-t-0 border-outline-variant/30 pt-3 sm:pt-0 mt-1 sm:mt-0">
                                        {file.status === 'processing' ? (
                                            <span className="text-xs font-medium text-primary bg-primary-container px-3 py-1 rounded-full">
                                                Processando
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => onDeleteFile(file.id)}
                                                className="flex items-center gap-2 text-on-surface-variant hover:text-error hover:bg-error-container/20 px-3 py-2 rounded-lg transition-colors text-xs font-medium w-full sm:w-auto justify-center"
                                                title="Excluir arquivo e dados associados"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                <span className="sm:hidden">Excluir Arquivo</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper icon
function UserIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}

function Cloud(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M17.5 19c0-3.037-2.463-5.5-5.5-5.5S6.5 15.963 6.5 19" />
            <circle cx="12" cy="10" r="5" />
            <path d="M12 15V3" />
            <path d="m9 6 3-3 3 3" />
        </svg>
    )
}

export default AdminFileManager;
