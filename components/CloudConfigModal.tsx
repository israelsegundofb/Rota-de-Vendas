
import React, { useState, useEffect } from 'react';
import { Save, Cloud, Check, Loader2, Trash2 } from 'lucide-react';
import { FirebaseConfig, getStoredFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig } from '../firebaseConfig';
import { initializeFirebase } from '../services/firebaseService';

interface CloudConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CloudConfigModal: React.FC<CloudConfigModalProps> = ({ isOpen, onClose }) => {
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-slate-800 p-6 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-600 rounded-lg">
                            <Cloud className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Configuração de Nuvem</h2>
                            <p className="text-xs text-slate-400">Sincronização via Firebase Firestore</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/50 hover:text-white">✕</button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-xs text-gray-500 mb-4 bg-blue-50 p-3 rounded border border-blue-100">
                        Insira os dados do seu projeto Firebase. Você pode encontrar isso no Console do Firebase {'>'} Configurações do Projeto {'>'} Seus aplicativos.
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                        <input type="text" name="apiKey" placeholder="apiKey" value={formData.apiKey} onChange={handleChange} className="text-xs p-2 border rounded" />
                        <input type="text" name="authDomain" placeholder="authDomain" value={formData.authDomain} onChange={handleChange} className="text-xs p-2 border rounded" />
                        <input type="text" name="projectId" placeholder="projectId" value={formData.projectId} onChange={handleChange} className="text-xs p-2 border rounded" />
                        <input type="text" name="storageBucket" placeholder="storageBucket" value={formData.storageBucket} onChange={handleChange} className="text-xs p-2 border rounded" />
                        <input type="text" name="messagingSenderId" placeholder="messagingSenderId" value={formData.messagingSenderId} onChange={handleChange} className="text-xs p-2 border rounded" />
                        <input type="text" name="appId" placeholder="appId" value={formData.appId} onChange={handleChange} className="text-xs p-2 border rounded" />
                    </div>

                    {message && (
                        <div className={`text-xs p-2 rounded flex items-center gap-2 ${status === 'error' ? 'bg-red-50 text-red-600' : status === 'success' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-600'}`}>
                            {status === 'testing' && <Loader2 className="w-3 h-3 animate-spin" />}
                            {status === 'success' && <Check className="w-3 h-3" />}
                            {message}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                    {status === 'success' && (
                        <button onClick={handleClear} className="px-4 py-2 text-red-500 text-xs font-bold hover:bg-red-50 rounded transition-colors mr-auto flex items-center gap-1">
                            <Trash2 className="w-3 h-3" /> Desconectar
                        </button>
                    )}
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 font-medium text-sm hover:bg-gray-200 rounded-lg">Cancelar</button>
                    <button
                        onClick={handleTestAndSave}
                        disabled={status === 'testing'}
                        className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {status === 'testing' ? 'Verificando...' : 'Salvar e Conectar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CloudConfigModal;
