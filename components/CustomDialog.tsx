import React from 'react';
import { X, AlertCircle, CheckCircle2, Info, HelpCircle, LucideIcon } from 'lucide-react';

export type DialogType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

interface CustomDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    message: string | string[];
    type?: DialogType;
    confirmLabel?: string;
    cancelLabel?: string;
    icon?: LucideIcon;
}

const CustomDialog: React.FC<CustomDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'info',
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    icon: CustomIcon
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        if (CustomIcon) return <CustomIcon className="w-8 h-8" />;
        switch (type) {
            case 'success': return <CheckCircle2 className="w-8 h-8 text-green-600" />;
            case 'error': return <AlertCircle className="w-8 h-8 text-red-600" />;
            case 'warning': return <AlertCircle className="w-8 h-8 text-amber-600" />;
            case 'confirm': return <HelpCircle className="w-8 h-8 text-blue-600" />;
            default: return <Info className="w-8 h-8 text-blue-600" />;
        }
    };

    const getColors = () => {
        switch (type) {
            case 'success': return { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-800' };
            case 'error': return { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-800' };
            case 'warning': return { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-800' };
            case 'confirm': return { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-800' };
            default: return { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-800' };
        }
    };

    const colors = getColors();

    const renderMessage = () => {
        if (Array.isArray(message)) {
            return (
                <ul className="space-y-2 text-sm text-gray-600">
                    {message.map((line, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            {line}
                        </li>
                    ))}
                </ul>
            );
        }
        return <p className="text-sm text-gray-600 leading-relaxed">{message}</p>;
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-scale-in border border-white">
                {/* Header Style */}
                <div className="bg-blue-600 h-2 w-full" />

                <div className="p-8">
                    <div className="flex justify-center mb-6">
                        <div className={`w-16 h-16 ${colors.bg} rounded-2xl flex items-center justify-center ring-4 ring-white shadow-sm`}>
                            {getIcon()}
                        </div>
                    </div>

                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h2>
                    </div>

                    <div className={`${colors.bg} ${colors.border} border rounded-2xl p-5 mb-8`}>
                        {renderMessage()}
                    </div>

                    <div className="flex gap-3">
                        {(onConfirm || type === 'confirm') && (
                            <button
                                onClick={onClose}
                                className="flex-1 py-3.5 px-4 rounded-xl text-sm font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all active:scale-95"
                            >
                                {cancelLabel}
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (onConfirm) {
                                    onConfirm();
                                    onClose();
                                } else {
                                    onClose();
                                }
                            }}
                            className={`flex-1 py-3.5 px-4 rounded-xl text-sm font-bold text-white transition-all shadow-md active:scale-95 flex items-center justify-center gap-2
                                ${type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                                    type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                                        'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomDialog;
