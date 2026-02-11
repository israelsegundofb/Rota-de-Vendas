import React, { useMemo, useState } from 'react';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import {
    TrendingUp, Users, Package, DollarSign,
    ArrowUpRight, ArrowDownRight, Globe, RefreshCcw, Activity,
    Search, Filter, Shield, User as UserIcon, Briefcase, ShoppingBag, X, Calendar
} from 'lucide-react';
import { EnrichedClient, Product, AppUser } from '../types';
import { REGIONS } from '../utils/constants';

interface AdminDashboardProps {
    clients: EnrichedClient[];
    products: Product[];
    users: AppUser[];
    onClose: () => void;
    // Filters from App.tsx
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    filterRegion: string;
    setFilterRegion: (val: string) => void;
    filterState: string;
    setFilterState: (val: string) => void;
    filterCity: string;
    setFilterCity: (val: string) => void;
    filterCategory: string;
    setFilterCategory: (val: string) => void;
    filterSalespersonId: string;
    setFilterSalespersonId: (val: string) => void;
    filterSalesCategory: string;
    setFilterSalesCategory: (val: string) => void;
    filterCnae: string;
    setFilterCnae: (val: string) => void;
    filterProductCategory: string;
    setFilterProductCategory: (val: string) => void;
    productCategories: string[];
    startDate: string;
    setStartDate: (val: string) => void;
    endDate: string;
    setEndDate: (val: string) => void;
    // Utils
    availableStates: string[];
    availableCities: string[];
    availableCnaes: string[];
    categories: string[];
    currentUser: AppUser | null;
    isAdminUser: boolean;
    canViewAllData: boolean;
}

const COLORS = ['#0061A4', '#006A60', '#6B5778', '#BA1A1A', '#535F70', '#56605B', '#49454F', '#000000'];

const KPICard: React.FC<{ title: string; value: string | number; icon: any; trend: number; color: string }> = ({ title, value, icon: Icon, trend, color }) => (
    <div className="bg-surface p-6 rounded-3xl shadow-elevation-1 border border-outline-variant/30 hover:shadow-elevation-2 transition-all group overflow-hidden relative">
        <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-[0.03] -mr-16 -mt-16 rounded-full group-hover:scale-110 transition-transform`} />
        <div className="flex justify-between items-start relative z-10">
            <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-[0.15em] mb-1 opacity-60">{title}</p>
                <p className="text-2xl font-black text-on-surface tracking-tight">{value}</p>
            </div>
            <div className={`p-3 rounded-2xl ${color}/10 ${color.replace('bg-', 'text-')}`}>
                <Icon size={24} />
            </div>
        </div>
        <div className="mt-4 flex items-center gap-2 relative z-10">
            <span className={`flex items-center text-xs font-black px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(trend)}%
            </span>
            <span className="text-[10px] text-on-surface-variant opacity-40 font-bold uppercase tracking-wider">vs mês anterior</span>
        </div>
    </div>
);

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
    filterProductCategory: activeProductCategory, setFilterProductCategory,
    productCategories,
    startDate, setStartDate,
    endDate, setEndDate,
    availableStates, availableCities, availableCnaes,
    categories, currentUser, isAdminUser, canViewAllData
}) => {
    const [lastUpdate] = useState(new Date());
    const [productSortOrder, setProductSortOrder] = useState<'desc' | 'asc'>('desc');

    // 1. Data Processing with Memoization
    const stats = useMemo(() => {
        const productSales: Record<string, { name: string; revenue: number; count: number }> = {};
        const categorySales: Record<string, number> = {};
        const regionalSales: Record<string, number> = {};
        const dailySales: Record<string, number> = {};
        const sellerSales: Record<string, { name: string; revenue: number }> = {};
        let totalRevenue = 0;

        clients.forEach(client => {
            const clientTotal = client.purchases?.reduce((sum, p) => sum + p.total, 0) || 0;
            totalRevenue += clientTotal;

            // Region
            const region = client.region || 'Outras';
            regionalSales[region] = (regionalSales[region] || 0) + clientTotal;

            // Seller
            const sellerName = client.vendedor_nome || 'Não Atribuído';
            if (!sellerSales[sellerName]) sellerSales[sellerName] = { name: sellerName, revenue: 0 };
            sellerSales[sellerName].revenue += clientTotal;

            client.purchases?.forEach(p => {
                // Product count and revenue
                if (!productSales[p.sku]) productSales[p.sku] = { name: p.name, revenue: 0, count: 0 };
                productSales[p.sku].revenue += p.total;
                productSales[p.sku].count += 1;

                // Category
                const cat = p.category || 'Outros';
                categorySales[cat] = (categorySales[cat] || 0) + p.total;

                // Daily trend
                if (p.date) {
                    const date = p.date.split('T')[0];
                    dailySales[date] = (dailySales[date] || 0) + p.total;
                }
            });
        });

        return {
            totalRevenue,
            totalClients: clients.length,
            totalProducts: products.length,
            topProductsData: Object.values(productSales)
                .sort((a, b) => productSortOrder === 'desc' ? b.count - a.count : a.count - b.count)
                .slice(0, 5),
            sellerPerformanceData: Object.values(sellerSales).sort((a, b) => b.revenue - a.revenue).slice(0, 6),
            categoryDistributionData: (() => {
                const sorted = Object.entries(categorySales)
                    .sort(([, a], [, b]) => b - a);

                if (sorted.length <= 8) {
                    return sorted.map(([name, value]) => ({ name, value }));
                }

                const top7 = sorted.slice(0, 7);
                const othersValue = sorted.slice(7).reduce((acc, [, val]) => acc + val, 0);

                return [
                    ...top7.map(([name, value]) => ({ name, value })),
                    { name: 'Outros', value: othersValue }
                ];
            })(),
            regionalSalesData: Object.entries(regionalSales).map(([name, value]) => ({ name, value })),
            salesTrendData: Object.entries(dailySales).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date))
        };
    }, [clients, products, productSortOrder]);

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden animate-in fade-in duration-500">
            {/* 1. Header with Global Logic */}
            <div className="flex flex-col border-b border-outline-variant bg-surface/80 backdrop-blur-md sticky top-0 z-20 shadow-sm">
                <div className="flex flex-wrap items-center justify-between px-8 py-4 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-primary/10 text-primary rounded-2xl shadow-inner">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-on-surface tracking-tight flex items-center gap-2">
                                Dashboard Pro
                                <span className="hidden sm:inline-block text-[9px] bg-primary text-on-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-[0.1em] shadow-sm">Inteligência</span>
                            </h1>
                            <div className="flex items-center gap-2 mt-0.5 text-on-surface-variant/50 text-[10px] font-medium">
                                <span className="flex items-center gap-1"><RefreshCcw size={10} className="animate-spin-slow" /> Live Update</span>
                                <span>•</span>
                                <span>{lastUpdate.toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center flex-1 max-w-4xl gap-3">
                        {/* Integrated Search */}
                        <div className="relative group flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar cliente ou empresa..."
                                className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
                            />
                        </div>

                        {/* Integrated Date Picker */}
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${startDate || endDate ? 'bg-primary/5 border-primary/20' : 'bg-surface-container-low border-outline-variant/30'}`}>
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            <div className="flex items-center gap-1">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="text-[10px] bg-transparent border-none outline-none text-on-surface font-bold w-24"
                                    title="Data Inicial"
                                />
                                <span className="text-outline-variant/30">-</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="text-[10px] bg-transparent border-none outline-none text-on-surface font-bold w-24"
                                    title="Data Final"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-surface-container-highest rounded-2xl transition-all active:scale-95 group border border-transparent hover:border-outline-variant shadow-sm"
                        title="Fechar Dashboard"
                    >
                        <X className="w-5 h-5 text-on-surface-variant group-hover:text-primary" />
                    </button>
                </div>

                {/* 2. Enhanced Filter Bar (Secondary Filters) */}
                <div className="px-8 pb-4 flex flex-wrap gap-2 items-center">
                    <div className="flex items-center gap-2 bg-secondary-container/20 px-2.5 py-1 rounded-lg border border-secondary-container/30 mr-2">
                        <Filter className="w-3 h-3 text-secondary" />
                        <span className="text-[10px] font-bold text-secondary uppercase tracking-tight">Refinar</span>
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

                        {/* CNAE Filter */}
                        <div className="flex items-center gap-1 bg-surface-container-low border border-outline-variant p-1 rounded-xl shadow-sm">
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

                        {/* Brands/Categories Filter */}
                        <div className="flex items-center gap-1 bg-surface-container-low border border-outline-variant p-1 rounded-xl shadow-sm">
                            <div className="relative">
                                <Package className="w-3.5 h-3.5 text-on-surface-variant/50 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <select
                                    value={activeProductCategory}
                                    onChange={(e) => setFilterProductCategory(e.target.value)}
                                    className="text-xs bg-transparent pl-7 pr-3 py-1 font-bold outline-none cursor-pointer max-w-[180px]"
                                    title="Filtrar por Marcas / Categorias de Produtos"
                                >
                                    <option value="Todos">Todas Marcas / Cat.</option>
                                    {productCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Content Scroller */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-surface-container-lowest/30 custom-scrollbar">
                {/* 4. KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard title="Faturamento Total" value={`R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={DollarSign} trend={12.5} color="bg-primary" />
                    <KPICard title="Carteira Filtrada" value={stats.totalClients} icon={Users} trend={5.2} color="bg-secondary" />
                    <KPICard title="Mix de Produtos" value={stats.totalProducts} icon={Package} trend={-2.4} color="bg-tertiary" />
                    <KPICard title="Vendas Registradas" value={stats.salesTrendData.length} icon={Activity} trend={8.1} color="bg-primary" />
                </div>

                {/* 5. Main Charts Row */}
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
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                                    <XAxis dataKey="date" stroke="#8E9199" fontSize={11} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#8E9199" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val / 1000}k`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                        formatter={(val: number) => [`R$ ${val.toLocaleString('pt-BR')}`, 'Venda']}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#0061A4" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Category Distribution Chart */}
                    <div className="bg-surface p-8 rounded-3xl shadow-elevation-1 border border-outline-variant/30">
                        <h3 className="text-xl font-black text-on-surface mb-8 uppercase tracking-tighter">Mix por Categoria</h3>
                        <div className="h-80 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.categoryDistributionData}
                                        innerRadius={70}
                                        outerRadius={95}
                                        paddingAngle={4}
                                        dataKey="value"
                                        stroke="none"
                                        animationDuration={1200}
                                    >
                                        {stats.categoryDistributionData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none' }}
                                        formatter={(val: number) => [`R$ ${val.toLocaleString('pt-BR')}`, 'Total']}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        layout="horizontal"
                                        align="center"
                                        iconType="circle"
                                        wrapperStyle={{ paddingTop: '20px', fontSize: '10px', height: 'auto' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-x-0 top-[35%] flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest opacity-40">Liderança</span>
                                <span className="text-sm font-black text-primary px-4 text-center line-clamp-2 leading-tight">
                                    {stats.categoryDistributionData[0]?.name || '...'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Second Row of Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top Products Chart */}
                    <div className="bg-surface p-8 rounded-3xl shadow-elevation-1 border border-outline-variant/30">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-secondary/10 rounded-xl text-secondary">
                                <Package size={20} />
                            </div>
                            <h3 className="text-xl font-black text-on-surface uppercase tracking-tighter">
                                {productSortOrder === 'desc' ? 'Produtos Mais Vendidos' : 'Produtos Menos Vendidos'}
                            </h3>
                            <div className="flex gap-1 ml-auto bg-surface-container-high p-1 rounded-lg">
                                <button
                                    onClick={() => setProductSortOrder('desc')}
                                    className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${productSortOrder === 'desc' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-highest'}`}
                                >
                                    TOP
                                </button>
                                <button
                                    onClick={() => setProductSortOrder('asc')}
                                    className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${productSortOrder === 'asc' ? 'bg-tertiary text-on-tertiary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-highest'}`}
                                >
                                    BOTTOM
                                </button>
                            </div>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.topProductsData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#F0F0F0" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" stroke="#8E9199" fontSize={10} width={120} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        formatter={(val: number) => [val, 'Qtd Vendida']}
                                    />
                                    <Bar
                                        dataKey="count"
                                        fill={productSortOrder === 'desc' ? '#535F70' : '#BA1A1A'}
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
                            <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                <Globe size={20} />
                            </div>
                            <h3 className="text-xl font-black text-on-surface uppercase tracking-tighter">Desempenho Regional</h3>
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
