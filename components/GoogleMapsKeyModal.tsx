import React from 'react';
import { Key, Check, Copy, AlertCircle, X, Eye, EyeOff, Edit3 } from 'lucide-react';

interface GoogleMapsKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (key: string) => void;
    suggestedKey: string;
}

const GoogleMapsKeyModal: React.FC<GoogleMapsKeyModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    suggestedKey
}) => {
    const [isManual, setIsManual] = React.useState(false);
    const [manualKey, setManualKey] = React.useState('');
    const [showKey, setShowKey] = React.useState(false);

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(suggestedKey);
    };

    const maskKey = (key: string) => {
        if (!key) return '';
        if (key.length <= 10) return '••••••••';
        return `${key.slice(0, 6)}•••••••••${key.slice(-4)}`;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
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
                    <h2 className="text-2xl font-bold text-white tracking-tight">Ativar Mapa</h2>
                    <p className="text-blue-100 text-sm mt-2 font-medium">Configure seu acesso ao Google Maps</p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-4">
                        <div className="bg-white p-2 rounded-lg shadow-sm shrink-0">
                            <AlertCircle className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-sm text-blue-800 leading-relaxed font-medium">
                            {isManual
                                ? "Insira sua própria Chave de API do Google Maps abaixo para ativar as funcionalidades."
                                : "Detectamos que seu mapa está aguardando ativação. Use a chave padrão do sistema."
                            }
                        </p>
                    </div>

                    {!isManual ? (
                        <div className="animate-fade-in">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Chave Recomendada</label>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 font-mono text-sm text-gray-700 flex items-center justify-between shadow-inner">
                                    <span className="truncate">
                                        {showKey ? suggestedKey : maskKey(suggestedKey)}
                                    </span>
                                    <button
                                        onClick={() => setShowKey(!showKey)}
                                        className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
                                        title={showKey ? "Esconder" : "Mostrar"}
                                    >
                                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className="bg-gray-50 hover:bg-gray-100 text-blue-600 p-3.5 rounded-xl transition-all border border-gray-100 shadow-sm active:scale-95"
                                    title="Copiar chave"
                                >
                                    <Copy className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Configuração Manual</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={manualKey}
                                    onChange={(e) => setManualKey(e.target.value)}
                                    placeholder="Começa com AIza..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                    autoFocus
                                />
                                <Edit3 className="absolute left-4 top-4.5 w-4 h-4 text-gray-400" />
                            </div>
                        </div>
                    )}

                    <div className="pt-2 flex flex-col gap-3">
                        <button
                            onClick={() => onConfirm(isManual ? manualKey : suggestedKey)}
                            disabled={isManual && !manualKey.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                        >
                            <Check className="w-5 h-5" />
                            {isManual ? "Ativar Manualmente" : "Carregar Mapa Agora"}
                        </button>

                        <button
                            onClick={() => {
                                setIsManual(!isManual);
                                setManualKey('');
                                setShowKey(false);
                            }}
                            className="w-full py-2 text-xs text-gray-400 hover:text-blue-600 font-bold uppercase tracking-widest transition-all"
                        >
                            {isManual ? "Voltar para recomendada" : "Usar outra chave (Manual)"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoogleMapsKeyModal;
