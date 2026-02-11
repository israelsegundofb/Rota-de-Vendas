import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onRangeChange: (start: string, end: string) => void;
    label?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
    startDate,
    endDate,
    onRangeChange,
    label = "Período"
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    const handleDateClick = (date: Date) => {
        const dateStr = formatDate(date);

        if (!startDate || (startDate && endDate)) {
            // Start new selection
            onRangeChange(dateStr, '');
        } else {
            // Second click: set end date or swap if start > end
            if (dateStr < startDate) {
                onRangeChange(dateStr, startDate);
            } else if (dateStr === startDate) {
                onRangeChange(startDate, dateStr); // effectively range of 1 day
            } else {
                onRangeChange(startDate, dateStr);
            }
            // Auto close after selecting full range? Usually MD3 stays open until dismissed or confirmed
        }
    };

    const clearRange = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRangeChange('', '');
    };

    const generateCalendarDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Start from the Sunday of the first week
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // End at the Saturday of the last week
        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

        const days = [];
        let current = new Date(startDate);

        while (current <= endDate) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        return days;
    };

    const isSelected = (date: Date) => {
        const d = formatDate(date);
        return d === startDate || d === endDate;
    };

    const isInRange = (date: Date) => {
        if (!startDate || !endDate) return false;
        const d = formatDate(date);
        return d > startDate && d < endDate;
    };

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    const changeMonth = (offset: number) => {
        const next = new Date(viewDate);
        next.setMonth(next.getMonth() + offset);
        setViewDate(next);
    };

    const goToToday = () => {
        const today = new Date();
        setViewDate(today);
        onRangeChange(formatDate(today), formatDate(today));
    };

    const displayLabel = () => {
        if (!startDate) return "Selecionar data";
        if (!endDate) return `${startDate.split('-').reverse().join('/')} - ...`;
        return `${startDate.split('-').reverse().join('/')} - ${endDate.split('-').reverse().join('/')}`;
    };

    return (
        <div className="relative inline-block" ref={containerRef}>
            {/* Trigger Button - MD3 Filter Chip Style */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 h-8 px-3 rounded-md border transition-all duration-200 outline-none
          ${isOpen ? 'bg-primary-container border-primary text-on-primary-container shadow-sm' :
                        startDate ? 'bg-secondary-container border-outline text-on-secondary-container' :
                            'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
                <CalendarIcon className={`w-3.5 h-3.5 ${startDate ? 'text-primary' : 'text-gray-400'}`} />
                <span className="text-[11px] font-bold uppercase tracking-tight mr-1">{label}</span>
                <span className="text-[11px] font-medium">{displayLabel()}</span>
                {startDate && (
                    <X
                        className="w-3 h-3 ml-1 hover:text-error transition-colors"
                        onClick={clearRange}
                    />
                )}
            </button>

            {/* Popover - MD3 Style */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 z-50 bg-white border border-outline-variant rounded-2xl shadow-elevation-3 p-4 min-w-[280px] sm:min-w-[320px] animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-on-surface ml-2">
                            {monthNames[viewDate.getMonth()]} de {viewDate.getFullYear()}
                        </h3>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => changeMonth(-1)}
                                className="p-2 hover:bg-surface-container-highest rounded-full transition-colors"
                                aria-label="Mês anterior"
                            >
                                <ChevronLeft className="w-5 h-5 text-on-surface-variant" />
                            </button>
                            <button
                                onClick={() => changeMonth(1)}
                                className="p-2 hover:bg-surface-container-highest rounded-full transition-colors"
                                aria-label="Próximo mês"
                            >
                                <ChevronRight className="w-5 h-5 text-on-surface-variant" />
                            </button>
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-7 gap-y-1 mb-4">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                            <div key={i} className="text-center text-[11px] font-bold text-on-surface-variant h-8 flex items-center justify-center">
                                {day}
                            </div>
                        ))}
                        {generateCalendarDays().map((date, i) => {
                            const selected = isSelected(date);
                            const inRange = isInRange(date);
                            const isToday = formatDate(date) === formatDate(new Date());
                            const isCurrentMonth = date.getMonth() === viewDate.getMonth();

                            return (
                                <div
                                    key={i}
                                    className={`relative flex items-center justify-center h-10 w-full cursor-pointer
                    ${inRange ? 'bg-primary-container' : ''}
                    ${selected && startDate && endDate && formatDate(date) === startDate ? 'rounded-l-full' : ''}
                    ${selected && startDate && endDate && formatDate(date) === endDate ? 'rounded-r-full' : ''}
                    ${selected && (!startDate || !endDate || startDate === endDate) ? 'rounded-full' : ''}
                  `}
                                    onClick={() => handleDateClick(date)}
                                >
                                    <div className={`
                    w-8 h-8 flex items-center justify-center text-[12px] font-medium transition-all duration-200
                    ${selected ? 'bg-primary text-on-primary rounded-full shadow-sm z-10' :
                                            isToday ? 'border border-primary text-primary rounded-full' :
                                                isCurrentMonth ? 'text-on-surface' : 'text-gray-300'}
                    ${!selected && !inRange && isCurrentMonth ? 'hover:bg-surface-variant rounded-full' : ''}
                  `}>
                                        {date.getDate()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between border-t border-outline-variant pt-3 px-2">
                        <button
                            onClick={goToToday}
                            className="text-xs font-bold text-primary hover:bg-primary/5 px-3 py-1.5 rounded-full transition-colors"
                        >
                            Hoje
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={clearRange}
                                className="text-xs font-bold text-error hover:bg-error/5 px-3 py-1.5 rounded-full transition-colors"
                            >
                                Limpar
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-4 py-1.5 rounded-full transition-colors"
                            >
                                Concluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateRangePicker;
