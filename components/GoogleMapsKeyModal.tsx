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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-scale-in">
                <div className="bg-blue-600 p-6 text-center relative border-b border-blue-700">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-white/50 hover:text-white transition-colors"
                        title="Fechar"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div className="mx-auto w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md">
                        <Key className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Ativar Mapa do Google</h2>
                    <p className="text-blue-100 text-sm mt-1">Para carregar o mapa, você precisa de uma chave ativa.</p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                        <p className="text-sm text-blue-800 leading-relaxed">
                            {isManual
                                ? "Insira sua própria Chave de API do Google Maps abaixo para ativar as funcionalidades do mapa."
                                : "Detectamos que seu mapa está aguardando ativação. Use a chave padrão do sistema para liberar o mapa agora."
                            }
                        </p>
                    </div>

                    {!isManual ? (
                        <div className="animate-fade-in">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Chave Sugerida (Segura)</label>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-mono text-sm text-gray-700 flex items-center justify-between">
                                    <span className="truncate">
                                        {showKey ? suggestedKey : maskKey(suggestedKey)}
                                    </span>
                                    <button
                                        onClick={() => setShowKey(!showKey)}
                                        className="text-gray-400 hover:text-gray-600 p-1"
                                        title={showKey ? "Esconder" : "Mostrar"}
                                    >
                                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-3 rounded-lg transition-colors border border-gray-200"
                                    title="Copiar chave"
                                >
                                    <Copy className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Digite sua Chave</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={manualKey}
                                    onChange={(e) => setManualKey(e.target.value)}
                                    placeholder="AIza..."
                                    className="w-full bg-white border border-blue-200 rounded-lg pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    autoFocus
                                />
                                <Edit3 className="absolute left-3 top-3.5 w-4 h-4 text-blue-400" />
                            </div>
                        </div>
                    )}

                    <div className="pt-2 flex flex-col gap-3">
                        <button
                            onClick={() => onConfirm(isManual ? manualKey : suggestedKey)}
                            disabled={isManual && !manualKey.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95"
                        >
                            <Check className="w-5 h-5" />
                            {isManual ? "Ativar com minha Chave" : "Confirmar e Usar esta Chave"}
                        </button>

                        <button
                            onClick={() => {
                                setIsManual(!isManual);
                                setManualKey('');
                                setShowKey(false);
                            }}
                            className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {isManual ? "Voltar para a chave sugerida" : "Digitar outra chave manualmente..."}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoogleMapsKeyModal;
