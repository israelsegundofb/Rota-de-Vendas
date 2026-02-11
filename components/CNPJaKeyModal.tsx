import React from 'react';
import { Key, Check, Copy, AlertCircle, X, Eye, EyeOff, Edit3, ExternalLink } from 'lucide-react';

interface CNPJaKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (key: string) => void;
}

const CNPJaKeyModal: React.FC<CNPJaKeyModalProps> = ({
    isOpen,
    onClose,
    onConfirm
}) => {
    const [manualKey, setManualKey] = React.useState('');
    const [showKey, setShowKey] = React.useState(false);

    React.useEffect(() => {
        if (isOpen) {
            const storedKey = localStorage.getItem('cnpja_api_key') || '';
            setManualKey(storedKey);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-scale-in border border-white">
                <div className="bg-blue-600 p-8 text-center relative">
                    <button
                        onClick={onClose}
                        className="absolute right-6 top-6 text-white/50 hover:text-white transition-colors"
                        title="Fechar"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div className="mx-auto w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md ring-4 ring-blue-500/30 shadow-inner">
                        <Key className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">API Comercial CNPJa</h2>
                    <p className="text-blue-100 text-sm mt-2 font-medium">Configure sua chave de consulta comercial</p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-4">
                        <div className="bg-white p-2 rounded-lg shadow-sm shrink-0">
                            <AlertCircle className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm text-blue-800 leading-relaxed font-medium">
                                A chave atual expirou ou está inválida. Insira sua nova Chave de API Comercial para restaurar a busca e atualização de dados.
                            </p>
                            <a
                                href="https://cnpja.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 underline"
                            >
                                Obter nova chave no site da CNPJa <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>

                    <div className="animate-fade-in">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Chave de API</label>
                        <div className="relative">
                            <input
                                type={showKey ? "text" : "password"}
                                value={manualKey}
                                onChange={(e) => setManualKey(e.target.value)}
                                placeholder="Insira sua chave aqui..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-12 py-4 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                autoFocus
                            />
                            <Key className="absolute left-4 top-4.5 w-4 h-4 text-gray-400" />
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-4 top-4.5 text-gray-400 hover:text-gray-600 p-1 transition-colors"
                                title={showKey ? "Esconder" : "Mostrar"}
                            >
                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="pt-2 flex flex-col gap-3">
                        <button
                            onClick={() => onConfirm(manualKey)}
                            disabled={!manualKey.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                        >
                            <Check className="w-5 h-5" />
                            Salvar Configuração
                        </button>

                        <p className="text-[10px] text-center text-gray-400">
                            A chave será salva apenas neste navegador.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CNPJaKeyModal;
