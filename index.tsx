import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AlertCircle } from 'lucide-react';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-6 font-sans">
          <div className="max-w-xl w-full bg-white rounded-xl shadow-lg p-8 border border-red-200">
            <div className="flex items-center gap-4 text-red-600 mb-6">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold">Ops! Algo deu errado.</h1>
            </div>
            <p className="text-gray-600 mb-4">
              Ocorreu um erro inesperado ao processar os dados.
            </p>
            <div className="bg-gray-900 text-gray-200 p-4 rounded-lg overflow-x-auto text-sm font-mono mb-6">
              {this.state.error?.toString()}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-colors"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);