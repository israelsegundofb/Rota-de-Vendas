
import React, { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, Database, Package, CheckCircle2 } from 'lucide-react';

interface LoadingScreenProps {
    progress: number;
    message: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, message }) => {
    const [displayProgress, setDisplayProgress] = useState(0);

    // Smooth progress animation
    useEffect(() => {
        if (displayProgress < progress) {
            const timer = setTimeout(() => setDisplayProgress(prev => Math.min(prev + 1, progress)), 20);
            return () => clearTimeout(timer);
        }
    }, [progress, displayProgress]);

    const getIcon = () => {
        if (progress < 30) return <ShieldCheck className="w-8 h-8 text-blue-400 animate-pulse" />;
        if (progress < 60) return <Database className="w-8 h-8 text-purple-400 animate-bounce" />;
        if (progress < 90) return <Package className="w-8 h-8 text-orange-400 animate-pulse" />;
        return <CheckCircle2 className="w-8 h-8 text-green-400" />;
    };

    return (
        <div className="fixed inset-0 z-[999] bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] opacity-10 bg-cover bg-center"></div>

            <div className="relative z-10 w-full max-w-sm text-center">
                <div className="mb-8 flex justify-center">
                    <div className="p-4 bg-white/5 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl">
                        {getIcon()}
                    </div>
                </div>

                <h2 className="text-2xl font-bold mb-2 tracking-tight">Preparando seu Ambiente</h2>
                <p className="text-slate-400 text-sm mb-10 h-5">{message}</p>

                <div className="relative pt-1">
                    <div className="flex mb-4 items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-200 bg-blue-900/30 border border-blue-500/20">
                                {displayProgress === 100 ? 'Concluído' : 'Sincronizando'}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-bold inline-block text-blue-400">
                                {displayProgress}%
                            </span>
                        </div>
                    </div>

                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-slate-800 border border-white/5 shadow-inner">
                        <div
                            style={{ width: `${displayProgress}%` }}
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 ease-out"
                        ></div>
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold tracking-widest px-1">
                        <span>Início</span>
                        <span>Autenticado</span>
                        <span>Pronto</span>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-10 text-slate-600 text-[10px] uppercase tracking-[0.2em] font-medium">
                Sincronizando com gen-lang-client-0586123917
            </div>
        </div>
    );
};

export default LoadingScreen;
