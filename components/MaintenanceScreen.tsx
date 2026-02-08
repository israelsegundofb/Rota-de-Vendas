import React, { useState, useEffect } from 'react';
import SnakeGame from './SnakeGame';
import { Settings, Wrench, CheckCircle, Loader2, Sparkles, Server, Zap, Database } from 'lucide-react';

const tasks = [
    { id: 1, text: "Otimizando Algoritmos de IA", icon: Sparkles, status: "completed" },
    { id: 2, text: "Compactando Banco de Dados", icon: Database, status: "completed" },
    { id: 3, text: "Acelerando Carregamento da UI", icon: Zap, status: "processing" },
    { id: 4, text: "Atualizando Protocolos de Segurança", icon: Server, status: "pending" },
    { id: 5, text: "Polindo Interface do Usuário", icon: Wrench, status: "pending" },
];

const MaintenanceScreen: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [activeTaskIndex, setActiveTaskIndex] = useState(0);

    // Simulate progress
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                const next = prev + 1; // Faster: 1% per 100ms = 10s total
                if (next >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return next;
            });
        }, 100);

        const taskInterval = setInterval(() => {
            setActiveTaskIndex(prev => {
                if (prev < tasks.length - 1) return prev + 1;
                return prev;
            });
        }, 2000); // Faster task switching

        return () => {
            clearInterval(interval);
            clearInterval(taskInterval);
        };
    }, []);

    // Check completion
    useEffect(() => {
        if (progress >= 100 && onComplete) {
            const timer = setTimeout(onComplete, 1000);
            return () => clearTimeout(timer);
        }
    }, [progress, onComplete]);

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">

            <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center animate-fade-in">

                {/* Left Column: Game & Fun */}
                <div className="flex flex-col items-center order-2 lg:order-1">
                    <div className="mb-6 relative hidden lg:block">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-700 shadow-xl">
                            <Wrench className="w-8 h-8 text-blue-400 animate-pulse" />
                        </div>
                        <div className="absolute -right-2 -bottom-2 w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-700 shadow-xl">
                            <Settings className="w-5 h-5 text-purple-400 animate-spin-slow" />
                        </div>
                    </div>

                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-sm w-full max-w-md">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-2xl">🎮</span> Passatempo
                        </h2>
                        <div className="w-full flex justify-center">
                            <SnakeGame />
                        </div>
                        <p className="text-center text-slate-400 text-sm mt-4">
                            Use as setas do teclado para jogar!
                        </p>
                    </div>
                </div>

                {/* Right Column: Status & Info */}
                <div className="order-1 lg:order-2 flex flex-col text-left">

                    <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider w-fit">
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        Manutenção Programada
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight leading-tight">
                        Estamos melhorando <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                            sua experiência.
                        </span>
                    </h1>

                    <p className="text-lg text-slate-300 mb-8 max-w-xl leading-relaxed">
                        "Divirta-se enquanto nossa super equipe de criação melhora os nossos sistemas."
                        <br />
                        <span className="text-slate-500 text-sm mt-2 block">
                            Estamos implementando atualizações críticas de performance.
                        </span>
                    </p>

                    {/* Progress Section */}
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg max-w-xl">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-slate-200 font-bold text-sm">Progresso Total</span>
                            <span className="text-blue-400 font-mono font-bold">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden mb-6">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        <div className="space-y-3">
                            {tasks.map((task, index) => {
                                // Logic for simulation status based on active index
                                let status = 'pending';
                                if (index < activeTaskIndex) status = 'completed';
                                if (index === activeTaskIndex) status = 'processing';
                                if (index > activeTaskIndex) status = 'pending';

                                return (
                                    <div key={task.id} className="flex items-center gap-3">
                                        <div className={`
                                            w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
                                            ${status === 'completed' ? 'bg-green-500/20 text-green-500' :
                                                status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                                                    'bg-slate-700 text-slate-500'}
                                        `}>
                                            {status === 'completed' && <CheckCircle className="w-3.5 h-3.5" />}
                                            {status === 'processing' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                            {status === 'pending' && <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />}
                                        </div>
                                        <span className={`text-sm transition-colors ${status === 'pending' ? 'text-slate-500' : 'text-slate-200'}`}>
                                            {task.text}
                                        </span>
                                        {status === 'processing' && (
                                            <span className="ml-auto text-xs text-blue-400 animate-pulse hidden sm:block">Processando...</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default MaintenanceScreen;
