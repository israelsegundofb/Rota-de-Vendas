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
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
            <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur-md border border-blue-100 shadow-2xl rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">

                <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600 shrink-0">
                        <Cookie className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">Este site utiliza cookies e armazenamento local</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Nós armazenamos dados no seu navegador para garantir que o sistema carregue instantaneamente na próxima vez que você acessar (cache offline).
                            Isso permite que você trabalhe mais rápido e até mesmo sem internet.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                    <button
                        onClick={handleDecline}
                        className="flex-1 md:flex-none px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Agora não
                    </button>
                    <button
                        onClick={handleAccept}
                        className="flex-1 md:flex-none px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        Permitir Cache Rápido
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CookieConsent;
