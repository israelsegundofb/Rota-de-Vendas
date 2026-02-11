import React, { useMemo, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    TrendingUp, Users, Package, DollarSign,
    ArrowUpRight, ArrowDownRight, Globe, RefreshCcw, Activity,
    Search, Filter, Shield, User as UserIcon, Briefcase, ShoppingBag, X
} from 'lucide-react';
import { EnrichedClient, Product, AppUser } from '../types';
import { REGIONS } from '../utils/constants';

interface AdminDashboardProps {
    clients: EnrichedClient[];
    products: Product[];
    users: AppUser[];
    onClose: () => void;
    // Filter Props
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    filterRegion: string;
    setFilterRegion: (r: string) => void;
    filterState: string;
    setFilterState: (s: string) => void;
    filterCity: string;
    setFilterCity: (c: string) => void;
    filterCategory: string;
    setFilterCategory: (c: string) => void;
    filterSalespersonId: string;
    setFilterSalespersonId: (id: string) => void;
    filterSalesCategory: string;
    setFilterSalesCategory: (c: string) => void;
    filterCnae: string;
    setFilterCnae: (c: string) => void;
    startDate: string;
    setStartDate: (d: string) => void;
    endDate: string;
    setEndDate: (d: string) => void;
    availableStates: string[];
    availableCities: string[];
    availableCnaes: string[];
    categories: string[];
    currentUser: AppUser | null;
    isAdminUser: boolean;
    canViewAllData: boolean;
}

const COLORS = ['#0061A4', '#535F70', '#6B5778', '#BA1A1A', '#9ECAFF', '#D7E3F7', '#F2DAFF'];

const AdminDashboard: React.FC<AdminDashboardProps> = ({
    clients, products, users, onClose,
    searchQuery, setSearchQuery,
    filterRegion, setFilterRegion,
    filterState, setFilterState,
    filterCity, setFilterCity,
    filterCategory, setFilterCategory,
    filterSalespersonId, setFilterSalespersonId,
    filterSalesCategory, setFilterSalesCategory,
    filterCnae, setFilterCnae,
    startDate, setStartDate,
    endDate, setEndDate,
    availableStates, availableCities, availableCnaes,
    categories, currentUser, isAdminUser, canViewAllData
}) => {
    const [lastUpdate] = useState(new Date());

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
            sellerPerformanceData: Object.values(sellerSales).sort((a, b) => b.revenue - a.revenue).slice(0, 6),
            categoryDistributionData: (() => {
                const sorted = Object.entries(categorySales)
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value);

                if (sorted.length <= 8) return sorted;

                const top8 = sorted.slice(0, 7);
                const othersValue = sorted.slice(7).reduce((acc, curr) => acc + curr.value, 0);

                return [...top8, { name: 'Outros', value: othersValue }];
            })(),
            regionalSalesData: Object.entries(regionalSales).map(([name, value]) => ({ name, value })),
            salesTrendData: Object.entries(dailySales).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date))
        };
    }, [clients, products, users]);

    // UI Helper Components
    const KPICard = ({ title, value, icon: Icon, trend, color }: any) => (
        <div className="bg-surface-container-low p-6 rounded-2xl shadow-elevation-1 border border-outline-variant/30 flex flex-col gap-2 transition-all hover:shadow-elevation-2 hover:border-primary/20 group">
            <div className="flex justify-between items-start">
                <div className={`p-3 rounded-xl ${color} text-white shadow-sm transition-transform group-hover:scale-110`}>
                    <Icon size={24} />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-sm font-bold ${trend > 0 ? 'text-green-600' : 'text-red-600'} bg-gray-50 px-2 py-1 rounded-full border border-gray-100`}>
                        {trend > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div>
                <p className="text-sm font-medium text-on-surface-variant opacity-70 uppercase tracking-wider">{title}</p>
                <p className="text-2xl font-bold text-on-surface mt-1">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden animate-in fade-in duration-500">
            {/* 1. Header with Global Logic */}
            <div className="flex flex-col border-b border-outline-variant bg-surface/80 backdrop-blur-md sticky top-0 z-20 shadow-sm">
                <div className="flex justify-between items-center px-8 py-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 text-primary rounded-2xl shadow-inner">
                            <Activity size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-on-surface tracking-tight flex items-center gap-3">
                                Dashboard Pro
                                <span className="text-[10px] bg-primary text-on-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-[0.2em] shadow-sm">Inteligência</span>
                            </h1>
                            <div className="flex items-center gap-2 mt-0.5 text-on-surface-variant/60 text-xs font-medium">
                                <span className="flex items-center gap-1"><RefreshCcw size={12} className="animate-spin-slow" /> Live Update</span>
                                <span>•</span>
                                <span>Sincronizado em {lastUpdate.toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-surface-container-highest rounded-2xl transition-all active:scale-95 group border border-transparent hover:border-outline-variant shadow-sm"
                        title="Fechar Dashboard"
                    >
                        <X className="w-6 h-6 text-on-surface-variant group-hover:text-primary" />
                    </button>
                </div>

                {/* 2. Enhanced Filter Bar (MD3 Style) */}
                <div className="px-8 pb-4 flex flex-wrap gap-3 items-center">
                    <div className="relative group max-w-xs flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar cliente ou empresa..."
                            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-secondary-container/30 px-3 py-1.5 rounded-xl border border-secondary-container/50">
                        <Filter className="w-4 h-4 text-secondary" />
                        <span className="text-xs font-bold text-secondary uppercase tracking-tight">Filtros</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {/* Vendedor / Equipe */}
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${canViewAllData ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="relative">
                                <UserIcon className={`absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${canViewAllData ? 'text-purple-400' : 'text-gray-400'}`} />
                                <select
                                    value={canViewAllData ? filterSalespersonId : currentUser?.id || ''}
                                    onChange={(e) => canViewAllData && setFilterSalespersonId(e.target.value)}
                                    disabled={!canViewAllData}
                                    className={`text-xs rounded-lg pl-7 pr-2 py-1 font-bold appearance-none bg-transparent outline-none ${canViewAllData ? 'text-purple-900 cursor-pointer' : 'text-gray-600 cursor-not-allowed'}`}
                                    title="Filtrar por Vendedor"
                                >
                                    {canViewAllData && <option value="Todos">Todos Vendedores</option>}
                                    {canViewAllData
                                        ? users.filter(u => u.role === 'salesperson' || u.role === 'sales_external' || u.role === 'sales_internal').map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))
                                        : <option value={currentUser?.id}>{currentUser?.name}</option>
                                    }
                                </select>
                            </div>

                            {canViewAllData && (
                                <div className="border-l border-purple-200 pl-2 ml-1 relative">
                                    <Briefcase className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-purple-400 pointer-events-none" />
                                    <select
                                        value={filterSalesCategory}
                                        onChange={(e) => setFilterSalesCategory(e.target.value)}
                                        className="text-[11px] bg-transparent text-purple-900 rounded-lg pl-6 pr-1 py-1 font-bold outline-none appearance-none cursor-pointer"
                                        title="Filtrar por Equipe"
                                    >
                                        <option value="Todos">Equipes</option>
                                        <option value="Externo">Externo</option>
                                        <option value="Interno">Interno</option>
                                        <option value="Mercado Livre">M.Livre</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Geo Filters */}
                        <div className="flex items-center gap-1 bg-surface-container-low border border-outline-variant p-1 rounded-xl shadow-sm">
                            <select
                                value={filterRegion}
                                onChange={(e) => { setFilterRegion(e.target.value); setFilterState('Todos'); setFilterCity('Todas'); }}
                                className="text-xs bg-transparent px-2 py-1 font-bold outline-none cursor-pointer border-r border-outline-variant/30"
                                title="Filtrar por Região"
                            >
                                <option value="Todas">Regiões</option>
                                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>

                            <select
                                value={filterState}
                                onChange={(e) => { setFilterState(e.target.value); setFilterCity('Todas'); }}
                                className="text-xs bg-transparent px-2 py-1 font-bold outline-none cursor-pointer border-r border-outline-variant/30"
                                disabled={availableStates.length === 0}
                                title="Filtrar por Estado"
                            >
                                <option value="Todos">UF</option>
                                {availableStates.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>

                            <select
                                value={filterCity}
                                onChange={(e) => setFilterCity(e.target.value)}
                                className="text-xs bg-transparent px-2 py-1 font-bold outline-none cursor-pointer min-w-[80px]"
                                disabled={filterState === 'Todos' || availableCities.length === 0}
                                title="Filtrar por Cidade"
                            >
                                <option value="Todas">Cidades</option>
                                {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* Segment Filters */}
                        <div className="flex items-center gap-1 bg-surface-container-low border border-outline-variant p-1 rounded-xl shadow-sm">
                            <div className="relative">
                                <ShoppingBag className="w-3.5 h-3.5 text-on-surface-variant/50 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <select
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="text-xs bg-transparent pl-7 pr-3 py-1 font-bold outline-none cursor-pointer border-r border-outline-variant/30"
                                    title="Filtrar por Categoria"
                                >
                                    <option value="Todos">Categorias</option>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="relative">
                                <Briefcase className="w-3.5 h-3.5 text-on-surface-variant/50 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <select
                                    value={filterCnae}
                                    onChange={(e) => setFilterCnae(e.target.value)}
                                    className="text-xs bg-transparent pl-7 pr-3 py-1 font-bold outline-none cursor-pointer max-w-[120px]"
                                    title="Filtrar por CNAE"
                                >
                                    <option value="Todos">CNAEs</option>
                                    {availableCnaes.map(c => (
                                        <option key={c} value={c}>{c.length > 20 ? c.substring(0, 20) + '...' : c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Scroller */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-surface-container-lowest/30 custom-scrollbar">
                {/* 3. KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard title="Faturamento Total" value={`R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={DollarSign} trend={12.5} color="bg-primary" />
                    <KPICard title="Carteira Filtrada" value={stats.totalClients} icon={Users} trend={5.2} color="bg-secondary" />
                    <KPICard title="Mix de Produtos" value={stats.totalProducts} icon={Package} trend={-2.4} color="bg-tertiary" />
                    <KPICard title="Vendas Mensais" value="R$ 45.200" icon={Activity} trend={8.1} color="bg-primary" />
                </div>

                {/* 4. Main Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sales Trend Chart */}
                    <div className="lg:col-span-2 bg-surface p-8 rounded-3xl shadow-elevation-1 border border-outline-variant/30">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-black text-on-surface flex items-center gap-2 uppercase tracking-tighter">
                                    <TrendingUp className="text-primary" />
                                    Comportamento de Vendas
                                </h3>
                                <p className="text-sm text-on-surface-variant opacity-60">Volume de receita por período</p>
                            </div>
                        </div>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.salesTrendData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0061A4" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#0061A4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                                    <XAxis dataKey="date" stroke="#8E9199" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#8E9199" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val / 1000}k`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                        formatter={(val: number) => [`R$ ${val.toLocaleString('pt-BR')}`, 'Faturamento']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#0061A4"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                        animationDuration={1500}
                                        animationBegin={200}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Category Distribution Chart */}
                    <div className="bg-surface p-8 rounded-3xl shadow-elevation-1 border border-outline-variant/30 overflow-hidden">
                        <h3 className="text-xl font-black text-on-surface mb-8 uppercase tracking-tighter">Mix por Categoria</h3>
                        <div className="h-96 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.categoryDistributionData}
                                        innerRadius={60}
                                        outerRadius={85}
                                        paddingAngle={4}
                                        dataKey="value"
                                        stroke="none"
                                        animationDuration={1200}
                                        cx="50%"
                                        cy="40%"
                                    >
                                        {stats.categoryDistributionData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        formatter={(val: number) => [`R$ ${val.toLocaleString('pt-BR')}`, 'Total']}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        layout="horizontal"
                                        iconType="circle"
                                        wrapperStyle={{
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            paddingTop: '20px',
                                            maxWidth: '100%'
                                        }}
                                        formatter={(value) => <span className="text-on-surface-variant truncate inline-block max-w-[100px]">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute top-[32%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest opacity-40">Liderança</span>
                                <span className="text-sm font-black text-primary text-center px-4 line-clamp-2">
                                    {stats.categoryDistributionData[0]?.name || '...'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. Second Row - Ranking and Regions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top Products */}
                    <div className="bg-surface p-8 rounded-3xl shadow-elevation-1 border border-outline-variant/30">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-secondary/10 rounded-xl text-secondary">
                                <Package size={20} />
                            </div>
                            <h3 className="text-xl font-black text-on-surface uppercase tracking-tighter">Produtos Mais Vendidos</h3>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.topProductsData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#F0F0F0" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" stroke="#8E9199" fontSize={10} width={120} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} contentStyle={{ borderRadius: '12px' }} />
                                    <Bar
                                        dataKey="revenue"
                                        fill="#535F70"
                                        radius={[0, 8, 8, 0]}
                                        barSize={24}
                                        animationDuration={1000}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Regional Performance */}
                    <div className="bg-surface p-8 rounded-3xl shadow-elevation-1 border border-outline-variant/30">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-tertiary/10 rounded-xl text-tertiary">
                                <Globe size={20} />
                            </div>
                            <h3 className="text-xl font-black text-on-surface uppercase tracking-tighter">Análise Regional</h3>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.regionalSalesData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                                    <XAxis dataKey="name" stroke="#8E9199" fontSize={11} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#8E9199" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val / 1000}k`} />
                                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                                    <Bar
                                        dataKey="value"
                                        fill="#6B5778"
                                        radius={[8, 8, 0, 0]}
                                        barSize={40}
                                        animationDuration={1500}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* 6. Seller Performance Row */}
                <div className="bg-surface p-8 rounded-3xl shadow-elevation-1 border border-outline-variant/30">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary">
                            <Briefcase size={20} />
                        </div>
                        <h3 className="text-xl font-black text-on-surface uppercase tracking-tighter">Equipe de Vendas (Ranking PRO)</h3>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.sellerPerformanceData} margin={{ bottom: 20 }}>
                                <XAxis dataKey="name" stroke="#8E9199" fontSize={10} angle={-45} textAnchor="end" height={80} interval={0} axisLine={false} tickLine={false} />
                                <YAxis stroke="#8E9199" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val / 1000}k`} />
                                <Tooltip contentStyle={{ borderRadius: '16px' }} />
                                <Bar
                                    dataKey="revenue"
                                    fill="#D7E3F7"
                                    radius={[12, 12, 0, 0]}
                                    activeBar={{ fill: '#0061A4' }}
                                    animationDuration={2000}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
