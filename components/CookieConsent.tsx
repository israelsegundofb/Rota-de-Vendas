import React, { useState, useEffect } from 'react';
import { Cookie, X, Check } from 'lucide-react';

interface CookieConsentProps {
    onAccept: () => void;
    onDecline: () => void;
}

const CookieConsent: React.FC<CookieConsentProps> = ({ onAccept, onDecline }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('vendas_ai_cookie_consent');
        if (!consent) {
            // Small delay for better UX
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('vendas_ai_cookie_consent', 'accepted');
        setIsVisible(false);
        onAccept();
    };

    const handleDecline = () => {
        localStorage.setItem('vendas_ai_cookie_consent', 'declined');
        setIsVisible(false);
        onDecline();
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-slide-up">
            <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur-md border border-blue-100 shadow-2xl rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 ring-1 ring-blue-500/10">

                <div className="flex items-start gap-5">
                    <div className="bg-blue-600/10 p-4 rounded-2xl text-blue-600 shrink-0 ring-1 ring-blue-500/20">
                        <Cookie className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1.5 tracking-tight">Privacidade e Performance</h3>
                        <p className="text-sm text-gray-600 leading-relaxed font-medium">
                            Utilizamos armazenamento local para garantir que seu sistema carregue instantaneamente (cache offline).
                            Isso permite agilidade máxima e operação em áreas com sinal oscilante.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                    <button
                        onClick={handleDecline}
                        className="flex-1 md:flex-none px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-700 transition-all rounded-xl"
                    >
                        Pular
                    </button>
                    <button
                        onClick={handleAccept}
                        className="flex-1 md:flex-none px-8 py-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Check className="w-4 h-4" />
                        Ativar Cache Rápido
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CookieConsent;
