
import React, { useState, useEffect } from 'react';
import { Save, Cloud, Check, Loader2, Trash2, X, Info } from 'lucide-react';
import { FirebaseConfig, getStoredFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig } from '../firebaseConfig';
import { initializeFirebase } from '../services/firebaseService';

interface CloudConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveToCloud?: () => void;
    onClearDatabase?: () => void;
    isFirebaseConnected?: boolean;
}

const CloudConfigModal: React.FC<CloudConfigModalProps> = ({
    isOpen,
    onClose,
    onSaveToCloud,
    onClearDatabase,
    isFirebaseConnected = false
}) => {
    const [formData, setFormData] = useState<FirebaseConfig>({
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: ''
    });
    const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            const stored = getStoredFirebaseConfig();
            if (stored) {
                setFormData(stored);
                setStatus('success'); // Assume if stored, it was valid, or let user re-test
                setMessage('Configuração salva encontrada.');
            }
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setStatus('idle');
        setMessage('');
    };

    const handleTestAndSave = async () => {
        setStatus('testing');
        setMessage('Testando conexão...');

        // Basic validation
        if (!formData.apiKey || !formData.projectId) {
            setStatus('error');
            setMessage('Campos obrigatórios faltando.');
            return;
        }

        try {
            const success = await initializeFirebase(formData);
            if (success) {
                saveFirebaseConfig(formData);
                setStatus('success');
                setMessage('Conexão bem sucedida! Configuração salva.');

                // Reload page after a delay to ensure Firebase initializes globally properly
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                setStatus('error');
                setMessage('Falha ao conectar. Verifique as credenciais.');
            }
        } catch (e) {
            setStatus('error');
            setMessage('Erro: ' + (e as any).message);
        }
    };

    const handleClear = () => {
        if (confirm('Remover configuração de nuvem? O app voltará a operar apenas localmente.')) {
            clearFirebaseConfig();
            setFormData({
                apiKey: '',
                authDomain: '',
                projectId: '',
                storageBucket: '',
                messagingSenderId: '',
                appId: ''
            });
            setStatus('idle');
            setMessage('Configuração removida.');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-scale-in border border-white">
                <div className="bg-slate-800 p-8 flex justify-between items-center text-white relative">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-600 rounded-2xl shadow-lg ring-4 ring-purple-500/20">
                            <Cloud className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Cloud Sync</h2>
                            <p className="text-slate-400 text-xs font-medium">Infraestrutura Firebase</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors" title="Fechar">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 space-y-5">
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-4 mb-2">
                        <div className="bg-white p-2 rounded-lg shadow-sm shrink-0">
                            <Info className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-xs text-blue-800 leading-relaxed font-medium">
                            Insira as credenciais do seu projeto Firebase. Você as encontra no Console {'>'} Configurações {'>'} Seus aplicativos.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-3">
                            {['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'].map((field) => (
                                <div key={field} className="relative group">
                                    <input
                                        type="text"
                                        name={field}
                                        placeholder={field}
                                        value={(formData as any)[field]}
                                        onChange={handleChange}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs text-gray-700 placeholder:text-gray-400 focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {message && (
                        <div className={`text-[10px] font-bold uppercase tracking-widest p-4 rounded-xl flex items-center gap-3 border shadow-sm ${status === 'error' ? 'bg-red-50 border-red-100 text-red-600' : status === 'success' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                            {status === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
                            {status === 'success' && <Check className="w-4 h-4" />}
                            {message}
                        </div>
                    )}
                </div>

                {/* Cloud Actions Section */}
                {isFirebaseConnected && onSaveToCloud && onClearDatabase && (
                    <div className="px-8 py-6 border-t border-gray-50 bg-gray-50/50">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Operações de Dados</p>
                        <div className="flex gap-3">
                            <button
                                onClick={onSaveToCloud}
                                className="flex-1 py-3 bg-white hover:bg-blue-50 text-blue-600 text-xs font-bold rounded-xl border border-blue-100 shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <Cloud className="w-4 h-4" />
                                Backup
                            </button>
                            <button
                                onClick={onClearDatabase}
                                className="flex-1 py-3 bg-white hover:bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <Trash2 className="w-4 h-4" />
                                Limpar
                            </button>
                        </div>
                    </div>
                )}

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    {status === 'success' && (
                        <button onClick={handleClear} className="px-4 py-2 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 rounded-xl transition-all mr-auto flex items-center gap-2 border border-red-100">
                            <Trash2 className="w-4 h-4" /> Desconectar
                        </button>
                    )}
                    <button onClick={onClose} className="px-6 py-3 text-gray-500 hover:text-gray-800 font-bold text-xs uppercase tracking-widest transition-colors">Cancelar</button>
                    <button
                        onClick={handleTestAndSave}
                        disabled={status === 'testing'}
                        className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                    >
                        {status === 'testing' ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
                            </>
                        ) : 'Salvar e Conectar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CloudConfigModal;
