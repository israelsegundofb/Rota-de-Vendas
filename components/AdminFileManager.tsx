import React, { useState } from 'react';
import { FileUp, Users, Package, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { AppUser } from '../types';

interface AdminFileManagerProps {
    users: AppUser[];
    onUploadClients: (file: File, targetUserId: string) => Promise<void>;
    onUploadProducts: (file: File) => Promise<void>;
    onClearClients: () => void;
    procState: {
        isActive: boolean;
        status: 'reading' | 'processing' | 'completed' | 'error';
        errorMessage?: string;
    };
}

const AdminFileManager: React.FC<AdminFileManagerProps> = ({
    users,
    onUploadClients,
    onUploadProducts,
    onClearClients,
    procState
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

    return (
        <div className="p-6 max-w-4xl mx-auto h-full overflow-y-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <FileUp className="w-8 h-8 text-blue-600" />
                Gerenciamento de Arquivos
            </h1>
            <p className="text-gray-500 mb-8">Central de importação de dados para o sistema.</p>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-8">
                <button
                    onClick={() => setActiveTab('clients')}
                    className={`pb-4 px-6 font-medium text-sm transition-colors relative ${activeTab === 'clients' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Cadastro de Clientes
                    </div>
                    {activeTab === 'clients' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('products')}
                    className={`pb-4 px-6 font-medium text-sm transition-colors relative ${activeTab === 'products' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Cadastro de Produtos
                    </div>
                    {activeTab === 'products' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 min-h-[400px]">

                {/* Status Messages */}
                {procState.isActive && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${procState.status === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                        {procState.status === 'processing' && <Loader2 className="w-5 h-5 animate-spin" />}
                        {procState.status === 'completed' && <CheckCircle className="w-5 h-5" />}
                        {procState.status === 'error' && <AlertCircle className="w-5 h-5" />}
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

                {activeTab === 'clients' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
                            <h3 className="font-bold text-blue-900 mb-2">Instruções para Clientes</h3>
                            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside opacity-80">
                                <li>O arquivo deve ser formato <strong>.CSV</strong>.</li>
                                <li>Colunas Obrigatórias: <strong>Razão Social</strong> e <strong>Endereço</strong>.</li>
                                <li>O sistema usará IA para enriquecer os dados e buscar coordenadas.</li>
                            </ul>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 mt-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Vendedor Responsável (Destino)</label>
                                <select
                                    className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                    value={targetUploadUserId}
                                    onChange={(e) => setTargetUploadUserId(e.target.value)}
                                >
                                    <option value="" disabled>Selecione um vendedor...</option>
                                    {users.filter(u => u.role === 'salesperson').map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Os clientes importados serão atribuídos a este vendedor.</p>
                            </div>

                            <div className="flex items-end">
                                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${!targetUploadUserId ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed' : 'border-blue-300 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400'}`}>
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <FileUp className={`w-8 h-8 mb-2 ${!targetUploadUserId ? 'text-gray-400' : 'text-blue-500'}`} />
                                        <p className={`text-sm font-medium ${!targetUploadUserId ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {!targetUploadUserId ? 'Selecione um vendedor primeiro' : 'Clique para carregar CSV'}
                                        </p>
                                    </div>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        className="hidden"
                                        onChange={handleClientFileChange}
                                        disabled={!targetUploadUserId || (procState.isActive && procState.status === 'processing')}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100 mt-6">
                            <button
                                onClick={onClearClients}
                                className="text-red-600 text-sm hover:underline flex items-center gap-1"
                            >
                                Opções de Limpeza de Dados...
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-6">
                            <h3 className="font-bold text-purple-900 mb-2">Instruções para Produtos</h3>
                            <ul className="text-sm text-purple-800 space-y-1 list-disc list-inside opacity-80">
                                <li>O arquivo deve ser formato <strong>.CSV</strong>.</li>
                                <li>Colunas: <strong>Código, Descrição, Marca, Preço, Unidade</strong>.</li>
                                <li>Ideal para atualizar o catálogo de vendas.</li>
                            </ul>
                        </div>

                        <div className="mt-8">
                            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-purple-200 border-dashed rounded-xl cursor-pointer bg-purple-50/30 hover:bg-purple-50 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Package className="w-10 h-10 text-purple-400 mb-3" />
                                    <p className="mb-2 text-sm text-purple-700 font-medium">Clique para carregar Catálogo de Produtos</p>
                                    <p className="text-xs text-gray-500">Arquivo CSV (max 10MB)</p>
                                </div>
                                <input
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={handleProductFileChange}
                                    disabled={procState.isActive && procState.status === 'processing'}
                                />
                            </label>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default AdminFileManager;
