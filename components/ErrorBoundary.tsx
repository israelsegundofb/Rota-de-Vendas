import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
    componentName?: string;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`[ErrorBoundary] Erro capturado em ${this.props.componentName || 'Componente'}:`, error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: undefined });
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="h-full w-full min-h-[300px] flex flex-col items-center justify-center bg-rose-50 rounded-xl border border-rose-200 p-8 text-center shadow-inner">
                    <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4 animate-pulse">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Ops! Algo deu errado.</h3>
                    <p className="text-sm text-gray-600 mb-6 max-w-sm">
                        Ocorreu um erro inesperado ao carregar {this.props.componentName || 'este componente'}.
                    </p>
                    <div className="bg-gray-900 text-rose-300 p-4 rounded-lg text-left text-xs font-mono mb-6 max-w-md overflow-auto border border-gray-800 shadow-lg">
                        {this.state.error?.name}: {this.state.error?.message}
                    </div>
                    <button
                        onClick={this.handleReset}
                        className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all shadow-md font-bold active:scale-95"
                    >
                        <RefreshCcw className="w-4 h-4" /> Recarregar Componente
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
