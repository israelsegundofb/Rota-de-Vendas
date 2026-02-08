import React, { useState } from 'react';
import { FileUp, Users, Package, AlertCircle, CheckCircle, Loader2, Trash2, Calendar, FileText } from 'lucide-react';
import { AppUser, UploadedFile } from '../types';

interface AdminFileManagerProps {
    users: AppUser[];
    uploadedFiles: UploadedFile[];
    onUploadClients: (file: File, targetUserId: string) => void;
    onUploadProducts: (file: File) => void;
    onDeleteFile: (fileId: string) => void;
    procState?: {
        isActive: boolean;
        status: 'reading' | 'processing' | 'completed' | 'error';
        errorMessage?: string;
    };
}

const AdminFileManager: React.FC<AdminFileManagerProps> = ({
    users,
    uploadedFiles,
    onUploadClients,
    onUploadProducts,
    onDeleteFile,
    procState = { isActive: false, status: 'completed', errorMessage: '' }
}) => {
    const [activeTab, setActiveTab] = useState<'clients' | 'products'>('clients');
    const [targetUploadUserId, setTargetUploadUserId] = useState<string>('');

    const handleClientFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && targetUploadUserId) {
            onUploadClients(file, targetUploadUserId);
            e.target.value = ''; // Reset input
        }
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
        <div className="p-6 max-w-6xl mx-auto h-full overflow-y-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <FileUp className="w-8 h-8 text-blue-600" />
                Gerenciamento de Arquivos
            </h1>
            <p className="text-gray-500 mb-8">Gerencie as planilhas importadas e carregue novos dados.</p>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-8">
                <button
                    onClick={() => setActiveTab('clients')}
                    className={`pb-4 px-6 font-medium text-sm transition-colors relative ${activeTab === 'clients' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Carteiras de Clientes
                    </div>
                    {activeTab === 'clients' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('products')}
                    className={`pb-4 px-6 font-medium text-sm transition-colors relative ${activeTab === 'products' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Catálogo de Produtos
                    </div>
                    {activeTab === 'products' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
                </button>
            </div>

            {/* Status Messages */}
            {procState?.isActive && (
                <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 shadow-sm border ${procState.status === 'error' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
                    {procState.status === 'processing' || procState.status === 'reading' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                        procState.status === 'completed' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                            <AlertCircle className="w-5 h-5 text-red-600" />}
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

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column: Upload Action */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <FileUp className="w-5 h-5 text-blue-600" />
                            Nova Importação
                        </h3>

                        {activeTab === 'clients' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Vendedor Responsável</label>
                                    <select
                                        className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        value={targetUploadUserId}
                                        onChange={(e) => setTargetUploadUserId(e.target.value)}
                                        aria-label="Selecione um vendedor responsável"
                                    >
                                        <option value="" disabled>Selecione um vendedor...</option>
                                        {users.filter(u => u.role === 'salesperson').map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${!targetUploadUserId ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed' : 'border-blue-300 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400'}`}>
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <FileUp className={`w-8 h-8 mb-2 ${!targetUploadUserId ? 'text-gray-300' : 'text-blue-500'}`} />
                                        <p className="text-sm text-center font-medium text-gray-600">
                                            {!targetUploadUserId ? 'Selecione um vendedor' : 'Clique para carregar CSV'}
                                        </p>
                                    </div>
                                    <input
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        className="hidden"
                                        onChange={handleClientFileChange}
                                        disabled={!targetUploadUserId || (procState?.isActive && procState.status === 'processing')}
                                    />
                                </label>
                                <p className="text-xs text-center text-gray-400">
                                    Suporta .csv, .xlsx, .xls
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 mb-4">
                                    <p>Importe o catálogo de produtos para cruzamento de dados.</p>
                                </div>
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-purple-300 bg-purple-50/30 rounded-xl cursor-pointer hover:bg-purple-50 hover:border-purple-400 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Package className="w-8 h-8 text-purple-500 mb-2" />
                                        <p className="text-sm font-medium text-gray-600">Carregar Catálogo</p>
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

                {/* Right Column: File List */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gray-500" />
                        Arquivos Carregados ({filteredFiles.length})
                    </h3>

                    {filteredFiles.length === 0 ? (
                        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-medium">Nenhum arquivo importado ainda.</p>
                            <p className="text-sm text-gray-400 mt-1">
                                Utilize a área ao lado para carregar sua primeira planilha.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Data</th>
                                        <th className="px-6 py-3 font-medium">Arquivo</th>
                                        {activeTab === 'clients' && <th className="px-6 py-3 font-medium">Responsável</th>}
                                        <th className="px-6 py-3 font-medium text-center">Registros</th>
                                        <th className="px-6 py-3 font-medium text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredFiles.map((file) => (
                                        <tr key={file.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(file.uploadDate).toLocaleDateString()}
                                                </div>
                                                <span className="text-[10px] text-gray-400 ml-5">
                                                    {new Date(file.uploadDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-800">
                                                {file.fileName}
                                            </td>
                                            {activeTab === 'clients' && (
                                                <td className="px-6 py-4 text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                                            {file.salespersonName?.charAt(0) || '?'}
                                                        </div>
                                                        {file.salespersonName}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {file.itemCount}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => onDeleteFile(file.id)}
                                                    className="text-gray-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                                    title="Excluir arquivo e dados associados"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminFileManager;
