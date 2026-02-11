import React, { useMemo, useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    TrendingUp, Users, Package, DollarSign,
    ArrowUpRight, ArrowDownRight, Globe, RefreshCcw, Activity
} from 'lucide-react';
import { EnrichedClient, Product, AppUser } from '../types';

interface AdminDashboardProps {
    clients: EnrichedClient[];
    products: Product[];
    users: AppUser[];
    onClose: () => void;
}

const COLORS = ['#0061A4', '#535F70', '#6B5778', '#BA1A1A', '#9ECAFF', '#D7E3F7', '#F2DAFF'];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ clients, products, users, onClose }) => {
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);

    // 1. Data Processing with Memoization
    const stats = useMemo(() => {
        let totalRevenue = 0;
        const productSales: Record<string, { name: string, count: number, revenue: number }> = {};
        const sellerSales: Record<string, { name: string, count: number, revenue: number }> = {};
        const categorySales: Record<string, number> = {};
        const regionalSales: Record<string, number> = {};
        const dailySales: Record<string, number> = {};

        clients.forEach(client => {
            const seller = users.find(u => u.id === client.salespersonId)?.name || 'Desconhecido';
            const region = client.region || 'Indefinido';

            (client.purchasedProducts || []).forEach(prod => {
                const price = prod.price || 0;
                totalRevenue += price;

                if (!productSales[prod.sku]) productSales[prod.sku] = { name: prod.name, count: 0, revenue: 0 };
                productSales[prod.sku].count += 1;
                productSales[prod.sku].revenue += price;

                if (!sellerSales[client.salespersonId]) sellerSales[client.salespersonId] = { name: seller, count: 0, revenue: 0 };
                sellerSales[client.salespersonId].count += 1;
                sellerSales[client.salespersonId].revenue += price;

                const cat = prod.category || 'Geral';
                categorySales[cat] = (categorySales[cat] || 0) + price;

                regionalSales[region] = (regionalSales[region] || 0) + price;

                if (prod.purchaseDate) {
                    const date = prod.purchaseDate.split('T')[0];
                    dailySales[date] = (dailySales[date] || 0) + price;
                }
            });
        });

        return {
            totalRevenue,
            totalClients: clients.length,
            totalProducts: products.length,
            topProductsData: Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
            sellerPerformanceData: Object.values(sellerSales).sort((a, b) => b.revenue - a.revenue),
            categoryData: Object.entries(categorySales).map(([name, value]) => ({ name, value })),
            regionalData: Object.entries(regionalSales).map(([name, value]) => ({ name, value })),
            salesTrendData: Object.entries(dailySales).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date))
        };
    }, [clients, products, users]);

    // Effect to handle "Fluid" update visual feedback
    useEffect(() => {
        setIsRefreshing(true);
        setLastUpdate(new Date());
        const timer = setTimeout(() => setIsRefreshing(false), 800);
        return () => clearTimeout(timer);
    }, [clients]);

    const KPICard = ({ title, value, icon: Icon, trend, color, delay }: any) => (
        <div
            className={`bg-surface-container-low p-6 rounded-2xl shadow-elevation-1 border border-outline-variant flex flex-col gap-2 transition-all duration-500 transform ${isRefreshing ? 'scale-[0.98] opacity-80' : 'scale-100 opacity-100'}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{title}</span>
                <div className={`p-2.5 rounded-xl ${color} bg-opacity-10 shadow-inner`}>
                    <Icon size={18} className={color.replace('bg-', 'text-')} />
                </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-black text-on-surface tracking-tight">{value}</h3>
            </div>
            {trend && (
                <div className={`text-[11px] font-bold flex items-center gap-1 ${trend > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    <div className={`p-0.5 rounded-full ${trend > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                        {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    </div>
                    {Math.abs(trend)}% vs mês anterior
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden relative">
            {/* Real-time Loading Overlay */}
            {isRefreshing && (
                <div className="absolute inset-0 z-50 bg-white/10 backdrop-blur-[2px] pointer-events-none flex items-center justify-center transition-opacity duration-300">
                    <div className="bg-primary text-on-primary px-4 py-2 rounded-full shadow-elevation-3 flex items-center gap-2 animate-bounce">
                        <RefreshCcw size={16} className="animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-wider">Sincronizando Dados...</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center px-8 py-6 border-b border-outline-variant bg-surface/80 backdrop-blur-md z-10 sticky top-0">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
                        <Activity size={24} className="text-green-600 relative z-10" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-on-surface tracking-tight">Dashboard Admin <span className="text-primary">PRO</span></h1>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">
                            <span className="flex items-center gap-1"><RefreshCcw size={10} /> Atualizado: {lastUpdate.toLocaleTimeString()}</span>
                            <span className="w-1 h-1 bg-outline-variant rounded-full"></span>
                            <span className="text-green-600">Conectado ao Cloud</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="group flex items-center gap-2 bg-surface-container-highest hover:bg-primary hover:text-on-primary px-4 py-2 rounded-full transition-all duration-300 shadow-sm border border-outline-variant"
                    title="Voltar para o Mapa"
                >
                    <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">Fechar Painel</span>
                    <Users size={18} className="group-hover:scale-110 transition-transform" />
                </button>
            </div>

            {/* Content */}
            <div className={`flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth transition-opacity duration-500 ${isRefreshing ? 'opacity-40' : 'opacity-100'}`}>
                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard title="Faturamento Total" value={`R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={DollarSign} trend={12.5} color="bg-primary" delay={0} />
                    <KPICard title="Clientes Ativos" value={stats.totalClients} icon={Users} trend={5.2} color="bg-secondary" delay={100} />
                    <KPICard title="Mix de Produtos" value={stats.totalProducts} icon={Package} color="bg-tertiary" delay={200} />
                    <KPICard title="Crescimento" value="18.4%" icon={TrendingUp} trend={2.1} color="bg-primary" delay={300} />
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-surface-container-low p-6 rounded-2xl shadow-elevation-1 border border-outline-variant hover:shadow-elevation-2 transition-shadow">
                        <h3 className="text-sm font-black mb-6 text-on-surface flex items-center gap-2 uppercase tracking-widest text-primary">
                            <TrendingUp size={16} /> Comportamento de Vendas
                        </h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.salesTrendData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0061A4" stopOpacity={0.25} /><stop offset="95%" stopColor="#0061A4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DFE2EB" />
                                    <XAxis dataKey="date" stroke="#73777F" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#73777F" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v / 1000}k`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1A1C1E', border: 'none', borderRadius: '12px', color: '#FFF' }}
                                        itemStyle={{ color: '#9ECAFF' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#0061A4"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                        animationDuration={1500}
                                        animationBegin={200}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-surface-container-low p-6 rounded-2xl shadow-elevation-1 border border-outline-variant hover:shadow-elevation-2 transition-shadow">
                        <h3 className="text-sm font-black mb-6 text-on-surface flex items-center gap-2 uppercase tracking-widest text-secondary">
                            <Globe size={16} /> Abrangência Regional
                        </h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.regionalData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={65}
                                        outerRadius={85}
                                        paddingAngle={8}
                                        dataKey="value"
                                        animationDuration={1200}
                                    >
                                        {stats.regionalData.map((_e, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={4} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Categories & Performance */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
                    <div className="bg-surface-container-low p-6 rounded-2xl shadow-elevation-1 border border-outline-variant">
                        <h3 className="text-sm font-black mb-6 text-on-surface uppercase tracking-widest flex items-center gap-2">
                            <Package size={16} /> Categorias em Alta
                        </h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.categoryData} margin={{ left: -20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DFE2EB" />
                                    <XAxis dataKey="name" fontSize={9} stroke="#73777F" angle={-15} textAnchor="end" />
                                    <YAxis fontSize={9} stroke="#73777F" />
                                    <Tooltip cursor={{ fill: '#F0F3F8' }} />
                                    <Bar dataKey="value" fill="#535F70" radius={[6, 6, 0, 0]} animationDuration={1800} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-surface-container-low p-6 rounded-2xl shadow-elevation-1 border border-outline-variant">
                        <h3 className="text-sm font-black mb-6 text-on-surface uppercase tracking-widest flex items-center gap-2">
                            <Users size={16} /> Ranking da Equipe
                        </h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.sellerPerformanceData} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#DFE2EB" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" fontSize={10} stroke="#73777F" axisLine={false} tickLine={false} />
                                    <Tooltip />
                                    <Bar dataKey="revenue" fill="#6B5778" radius={[0, 6, 6, 0]} animationDuration={2000} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
