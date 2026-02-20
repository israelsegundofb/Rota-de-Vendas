import React from 'react';
import { CheckCircle, Loader2, AlertCircle, X } from 'lucide-react';
import { ProcessingState } from '../types';

interface ProcessingToastProps {
  procState: ProcessingState;
  setProcState: React.Dispatch<React.SetStateAction<ProcessingState>>;
  onCancel: () => void;
}

const ProcessingToast: React.FC<ProcessingToastProps> = ({
  procState,
  setProcState,
  onCancel,
}) => {
  if (!procState.isActive) return null;

  return (
    <div className="absolute bottom-6 right-6 z-50 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden animate-slide-up">
      <div className={`h-1.5 w-full ${procState.status === 'error' ? 'bg-red-200' : 'bg-blue-100'}`}>
        <div
          className={`h-full transition-all duration-300 ${procState.status === 'completed' ? 'bg-green-500 w-full' :
            procState.status === 'error' ? 'bg-red-500 w-full' :
              'bg-blue-600'
            }`}
          style={{ width: procState.total > 0 ? `${(procState.current / procState.total) * 100}%` : '0%' }}
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              {procState.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
              {procState.status === 'processing' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
              {procState.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}

              {procState.status === 'reading' ? 'Lendo Arquivo...' :
                procState.status === 'processing' ? 'Processando Planilha' :
                  procState.status === 'completed' ? 'Processamento Concluído' :
                    'Erro no Processamento'}
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              {procState.fileName} <span className="mx-1">•</span> {procState.ownerName}
            </p>
          </div>
          <button
            onClick={() => {
              if (procState.isActive && procState.status === 'processing') {
                if (window.confirm("Gostaria de Parar de Enviar o Arquivo?")) {
                  onCancel();
                  setProcState(prev => ({ ...prev, isActive: false, status: 'error', errorMessage: 'Cancelado pelo usuário.' }));
                }
              } else {
                setProcState(prev => ({ ...prev, isActive: false }));
              }
            }}
            className="text-gray-400 hover:text-gray-600"
            title="Fechar Notificação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {procState.status === 'processing' && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progresso (IA + Maps)</span>
              <span className="font-mono">{procState.current} / {procState.total}</span>
            </div>
            <p className="text-[10px] text-gray-400">Você pode continuar usando o sistema.</p>
          </div>
        )}

        {procState.status === 'error' && (
          <p className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
            {procState.errorMessage}
          </p>
        )}
      </div>
    </div>
  );
};

export default ProcessingToast;
