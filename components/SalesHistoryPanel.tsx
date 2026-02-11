import React, { useMemo } from 'react';
import { EnrichedClient, PurchaseRecord, AppUser } from '../types';
import { ShoppingBag, Calendar, User, TrendingUp, DollarSign } from 'lucide-react';
import DateRangePicker from './DateRangePicker';

interface SalesHistoryPanelProps {
    clients: EnrichedClient[];
    users: AppUser[];
    startDate: string;
    endDate: string;
    onRangeChange: (start: string, end: string) => void;
}

const SalesHistoryPanel: React.FC<SalesHistoryPanelProps> = ({
    clients,
    users,
    startDate,
    endDate,
    onRangeChange
}) => {
    const allPurchases = useMemo(() => {
        const records: (PurchaseRecord & { clientName: string; clientId: string })[] = [];

        clients.forEach(client => {
            if (client.purchasedProducts) {
                client.purchasedProducts.forEach(purchase => {
                    // Filtro temporal
                    const pDate = purchase.purchaseDate;
                    if (startDate && pDate < startDate) return;
                    if (endDate && pDate > endDate) return;

                    records.push({
                        ...purchase,
                        clientName: client.companyName,
                        clientId: client.id
                    });
                });
            }
        });

        // Ordenar por data (mais recente primeiro)
        return records.sort((a, b) => (b.purchaseDate || '').localeCompare(a.purchaseDate || ''));
    }, [clients, startDate, endDate]);

    const stats = useMemo(() => {
        const totalValue = allPurchases.reduce((sum, p) => sum + (p.totalValue || (p.price * (p.quantity || 1))), 0);
        const uniqueClients = new Set(allPurchases.map(p => p.clientId)).size;
        const totalItems = allPurchases.reduce((sum, p) => sum + (p.quantity || 1), 0);

        return { totalValue, uniqueClients, totalItems };
    }, [allPurchases]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateStr: string) => {
        try {
            return dateStr.split('-').reverse().join('/');
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 p-4 overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <TrendingUp className="text-primary w-6 h-6" />
                        Histórico Mágico de Vendas
                    </h2>
                    <p className="text-sm text-gray-500">Analise compras por anos, meses, semanas e dias</p>
                </div>

                <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 uppercase ml-2">Filtrar Período:</span>
                    <DateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        onRangeChange={onRangeChange}
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Volume Total</p>
                        <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.totalValue)}</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                        <ShoppingBag className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Total de Itens</p>
                        <p className="text-xl font-bold text-gray-800">{stats.totalItems} un.</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Clientes Atendidos</p>
                        <p className="text-xl font-bold text-gray-800">{stats.uniqueClients} empresas</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Data</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Cliente</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">SKU / Produto</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Qtd</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">Valor Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {allPurchases.length > 0 ? (
                                allPurchases.map((p, i) => (
                                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-300" />
                                                <span className="text-sm font-medium text-gray-700">{formatDate(p.purchaseDate)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-gray-800 truncate max-w-[200px]" title={p.clientName}>
                                                {p.clientName}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-primary">{p.sku}</span>
                                                <span className="text-xs text-gray-500 truncate max-w-[250px]" title={p.name}>{p.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-700">{p.quantity || 1}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-bold text-gray-900">
                                                {formatCurrency(p.totalValue || (p.price * (p.quantity || 1)))}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center">
                                            <Calendar className="w-12 h-12 text-gray-200 mb-2" />
                                            <p className="text-gray-400 font-medium">Nenhuma venda encontrada para o período</p>
                                            <p className="text-xs text-gray-400">Tente expandir o filtro de datas</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SalesHistoryPanel;
