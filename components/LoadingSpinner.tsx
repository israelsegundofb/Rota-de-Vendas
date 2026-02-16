import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: 'primary' | 'white' | 'gray';
    fullScreen?: boolean;
    text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    color = 'primary',
    fullScreen = false,
    text
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    const colorClasses = {
        primary: 'text-blue-600',
        white: 'text-white',
        gray: 'text-gray-400'
    };

    const spinner = (
        <div className="flex flex-col items-center gap-3">
            <Loader2 className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`} />
            {text && <p className={`text-sm font-medium ${color === 'white' ? 'text-white' : 'text-gray-600'}`}>{text}</p>}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                {spinner}
            </div>
        );
    }

    return spinner;
};

export default LoadingSpinner;
