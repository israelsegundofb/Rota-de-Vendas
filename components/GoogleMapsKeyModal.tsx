import React from 'react';
import { Key, Check, Copy, AlertCircle, X } from 'lucide-react';

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
    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(suggestedKey);
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
                            Detectamos que seu mapa está aguardando ativação. Use a chave padrão do sistema para liberar o mapa agora.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Chave Sugerida</label>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-mono text-sm text-gray-700 truncate select-all">
                                {suggestedKey}
                            </div>
                            <button
                                onClick={handleCopy}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-3 rounded-lg transition-colors"
                                title="Copiar chave"
                            >
                                <Copy className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="pt-2 flex flex-col gap-3">
                        <button
                            onClick={() => onConfirm(suggestedKey)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95"
                        >
                            <Check className="w-5 h-5" />
                            Confirmar e Usar esta Chave
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors"
                        >
                            Digitar outra chave manualmente...
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoogleMapsKeyModal;
