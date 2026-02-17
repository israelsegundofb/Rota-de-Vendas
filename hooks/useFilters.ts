import { useState, useMemo } from 'react';
import { EnrichedClient, AppUser, Product } from '../types';
import { isAdmin, hasFullDataVisibility } from '../utils/authUtils';
import useDebounce from './useDebounce';
import { useUrlParams } from './useUrlParams';

export const useFilters = (
    masterClientList: EnrichedClient[],
    users: AppUser[],
    currentUser: AppUser | null,
    products: Product[]
) => {
    // URL Params Helper
    const { getParam, setParam, clearParams } = useUrlParams();

    // Filter State (Initialize from URL if available)
    const [searchQuery, setSearchQueryState] = useState<string>(() => getParam('q') || '');
    const [filterRegion, setFilterRegionState] = useState<string>(() => getParam('region') || 'Todas');
    const [filterState, setFilterStateState] = useState<string>(() => getParam('state') || 'Todos');
    const [filterCity, setFilterCityState] = useState<string>(() => getParam('city') || 'Todas');
    const [filterCategory, setFilterCategoryState] = useState<string>(() => getParam('category') || 'Todos');
    const [filterSalespersonId, setFilterSalespersonIdState] = useState<string>(() => getParam('salesperson') || 'Todos');
    const [filterSalesCategory, setFilterSalesCategoryState] = useState<string>(() => getParam('sales_cat') || 'Todos'); // Admin only really
    const [filterCnae, setFilterCnaeState] = useState<string>(() => getParam('cnae') || 'Todos');
    const [filterOnlyWithPurchases, setFilterOnlyWithPurchasesState] = useState<boolean>(() => getParam('purchases') === 'true');
    const [startDate, setStartDateState] = useState<string>(() => getParam('startDict') || '');
    const [endDate, setEndDateState] = useState<string>(() => getParam('endDate') || '');

    // Product Filters
    const [filterProductCategory, setFilterProductCategoryState] = useState<string>(() => getParam('prod_cat') || 'Todos');
    const [filterProductSku, setFilterProductSkuState] = useState<string>(() => getParam('sku') || 'Todos');
    const [searchProductQuery, setSearchProductQueryState] = useState<string>(() => getParam('prod_q') || '');
    const [showProductSuggestions, setShowProductSuggestions] = useState<boolean>(false);

    // --- State Setters Wrappers (Sync with URL) ---
    const setSearchQuery = (val: string) => { setSearchQueryState(val); setParam('q', val); };
    const setFilterRegion = (val: string) => { setFilterRegionState(val); setParam('region', val === 'Todas' ? '' : val); };
    const setFilterState = (val: string) => { setFilterStateState(val); setParam('state', val === 'Todos' ? '' : val); };
    const setFilterCity = (val: string) => { setFilterCityState(val); setParam('city', val === 'Todas' ? '' : val); };
    const setFilterCategory = (val: string) => { setFilterCategoryState(val); setParam('category', val === 'Todos' ? '' : val); };
    const setFilterSalespersonId = (val: string) => { setFilterSalespersonIdState(val); setParam('salesperson', val === 'Todos' ? '' : val); };
    const setFilterSalesCategory = (val: string) => { setFilterSalesCategoryState(val); setParam('sales_cat', val === 'Todos' ? '' : val); };
    const setFilterCnae = (val: string) => { setFilterCnaeState(val); setParam('cnae', val === 'Todos' ? '' : val); };
    const setFilterOnlyWithPurchases = (val: boolean) => { setFilterOnlyWithPurchasesState(val); setParam('purchases', val ? 'true' : ''); };
    const setStartDate = (val: string) => { setStartDateState(val); setParam('startDict', val); };
    const setEndDate = (val: string) => { setEndDateState(val); setParam('endDate', val); };
    const setFilterProductCategory = (val: string) => { setFilterProductCategoryState(val); setParam('prod_cat', val === 'Todos' ? '' : val); };
    const setFilterProductSku = (val: string) => { setFilterProductSkuState(val); setParam('sku', val === 'Todos' ? '' : val); };
    const setSearchProductQuery = (val: string) => { setSearchProductQueryState(val); setParam('prod_q', val); };


    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const debouncedProductQuery = useDebounce(searchProductQuery, 300);

    const isFiltering = searchQuery !== debouncedSearchQuery || searchProductQuery !== debouncedProductQuery;

    // --- Derived Data ---

    // 1. Visible Clients (Permissions)
    const visibleClients = useMemo(() => {
        if (!currentUser) return [];
        let baseList = [];
        if (hasFullDataVisibility(currentUser.role)) {
            if (filterSalespersonId !== 'Todos') {
                baseList = masterClientList.filter(c => c.salespersonId === filterSalespersonId);
            } else {
                baseList = masterClientList;
            }
        } else {
            baseList = masterClientList.filter(c => c.salespersonId === currentUser.id);
        }
        return baseList;
    }, [currentUser, masterClientList, filterSalespersonId]);

    // 2. Filtered Clients (Search & Selects)
    const filteredClients = useMemo(() => {
        return visibleClients.filter(c => {
            // General Filters
            const matchRegion = filterRegion === 'Todas' || c.region === filterRegion;
            const matchState = filterState === 'Todos' || c.state === filterState;
            const matchCity = filterCity === 'Todas' || c.city === filterCity;
            const matchCat = filterCategory === 'Todos' || (Array.isArray(c.category) && c.category.includes(filterCategory));

            // Sales Category Filter (Admin Only)
            let matchSalesCat = true;
            if (currentUser && hasFullDataVisibility(currentUser.role) && filterSalesCategory !== 'Todos') {
                const seller = users.find(u => u.id === c.salespersonId);
                if (!seller || seller.salesCategory !== filterSalesCategory) {
                    matchSalesCat = false;
                }
            }

            // Text Search
            const query = (debouncedSearchQuery || '').toLowerCase();
            const matchSearch = debouncedSearchQuery === '' ||
                (c.companyName || '').toLowerCase().includes(query) ||
                (c.ownerName && (c.ownerName || '').toLowerCase().includes(query));

            // Product Filters (Where items were sold)
            let matchProduct = true;
            const prodQuery = (debouncedProductQuery || '').toLowerCase();

            // CNAE Filter (Matches Main or Secondary)
            const matchCnae = filterCnae === 'Todos' ||
                (c.mainCnae && c.mainCnae.includes(filterCnae)) ||
                (c.secondaryCnaes && c.secondaryCnaes.some(s => s.includes(filterCnae)));

            if (filterProductCategory !== 'Todos' || filterProductSku !== 'Todos' || prodQuery !== '') {
                // If filtering by product, client MUST have purchase history
                if (!c.purchasedProducts || c.purchasedProducts.length === 0) {
                    matchProduct = false;
                } else {
                    // Check Category (Brand often used as category in this context)
                    const hasCat = filterProductCategory === 'Todos' || c.purchasedProducts.some(p => (p.category || '') === filterProductCategory);

                    // Check Specific SKU
                    const hasSku = filterProductSku === 'Todos' || c.purchasedProducts.some(p => (p.sku || '') === filterProductSku);

                    // Check Search Query (Includes Brand and Category/Department)
                    const hasMatch = prodQuery === '' || c.purchasedProducts.some(p =>
                        (p.name || '').toLowerCase().includes(prodQuery) ||
                        (p.sku || '').toLowerCase().includes(prodQuery) ||
                        (p.brand || '').toLowerCase().includes(prodQuery) ||
                        (p.category || '').toLowerCase().includes(prodQuery) ||
                        (p.factoryCode || '').toLowerCase().includes(prodQuery) ||
                        (p.price || 0).toString().includes(prodQuery)
                    );

                    // Date Range Filter
                    const matchDate = (!startDate || !endDate) || c.purchasedProducts.some(p => {
                        if (!p.purchaseDate) return false;

                        // Robust Date Parsing
                        let pDate = new Date(p.purchaseDate);

                        // Fallback for DD/MM/YYYY
                        if (isNaN(pDate.getTime())) {
                            const parts = p.purchaseDate.split('/');
                            if (parts.length === 3) {
                                pDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                            } else {
                                // Try DD-MM-YYYY
                                const partsHyphen = p.purchaseDate.split('-');
                                if (partsHyphen.length === 3) {
                                    pDate = new Date(parseInt(partsHyphen[2]), parseInt(partsHyphen[1]) - 1, parseInt(partsHyphen[0]));
                                }
                            }
                        }

                        if (isNaN(pDate.getTime())) return false; // Invalid date in data

                        // Create Date objects for start/end, resetting time
                        pDate.setHours(0, 0, 0, 0);

                        if (startDate) {
                            const sDate = new Date(startDate);
                            sDate.setHours(0, 0, 0, 0);
                            if (pDate < sDate) return false;
                        }

                        if (endDate) {
                            const eDate = new Date(endDate);
                            eDate.setHours(23, 59, 59, 999);
                            if (pDate > eDate) return false;
                        }

                        return true;
                    });

                    matchProduct = hasCat && hasSku && hasMatch && matchDate;
                }
            }

            // Only with Purchases Filter
            const matchOnlyWithPurchases = !filterOnlyWithPurchases || (c.purchasedProducts && c.purchasedProducts.length > 0);

            return matchRegion && matchState && matchCity && matchCat && matchSearch && matchProduct && matchSalesCat && matchOnlyWithPurchases && matchCnae;
        });
    }, [visibleClients, filterRegion, filterState, filterCity, filterCategory, filterCnae, debouncedSearchQuery, filterProductCategory, filterProductSku, debouncedProductQuery, filterSalesCategory, filterOnlyWithPurchases, users, currentUser, startDate, endDate]);

    // 3. Dropdown Options
    const availableStates = useMemo(() => {
        let base = visibleClients;
        if (filterRegion !== 'Todas') {
            base = base.filter(c => c.region === filterRegion);
        }
        const states = new Set(base.map(c => c.state).filter(Boolean));
        return Array.from(states).sort();
    }, [visibleClients, filterRegion]);

    const availableCities = useMemo(() => {
        let base = visibleClients;
        if (filterRegion !== 'Todas') {
            base = base.filter(c => c.region === filterRegion);
        }
        if (filterState !== 'Todos') {
            base = base.filter(c => c.state === filterState);
        } else {
            return [];
        }
        const cities = new Set(base.map(c => c.city).filter(Boolean));
        return Array.from(cities).sort();
    }, [visibleClients, filterRegion, filterState]);

    const productCategories = useMemo(() => {
        const cats = new Set(products.map(p => p.category));
        return Array.from(cats).sort();
    }, [products]);

    const availableCnaes = useMemo(() => {
        const cnaes = new Set<string>();
        visibleClients.forEach(c => {
            if (c.mainCnae) cnaes.add(c.mainCnae);
            if (c.secondaryCnaes) {
                c.secondaryCnaes.forEach(s => cnaes.add(s));
            }
        });
        return Array.from(cnaes).sort();
    }, [visibleClients]);

    const resetFilters = () => {
        clearParams();
        setSearchQueryState('');
        setFilterRegionState('Todas');
        setFilterStateState('Todos');
        setFilterCityState('Todas');
        setFilterSalespersonIdState('Todos');
        setFilterSalesCategoryState('Todos');
        setFilterCnaeState('Todos');
        setFilterProductCategoryState('Todos');
        setFilterProductSkuState('Todos');
        setSearchProductQueryState('');
        setFilterOnlyWithPurchasesState(false);
        setStartDateState('');
        setEndDateState('');
    };

    return {
        // State
        searchQuery, setSearchQuery,
        filterRegion, setFilterRegion,
        filterState, setFilterState,
        filterCity, setFilterCity,
        filterCategory, setFilterCategory,
        filterSalespersonId, setFilterSalespersonId,
        filterSalesCategory, setFilterSalesCategory,
        filterCnae, setFilterCnae,
        filterProductCategory, setFilterProductCategory,
        filterProductSku, setFilterProductSku,
        searchProductQuery, setSearchProductQuery,
        showProductSuggestions, setShowProductSuggestions,
        filterOnlyWithPurchases, setFilterOnlyWithPurchases,
        startDate, setStartDate,
        endDate, setEndDate,
        isFiltering, // Exported Loading State

        // Computed
        filteredClients,
        visibleClients,
        availableStates,
        availableCities,
        availableCnaes,
        productCategories,

        // Actions
        resetFilters
    };
};
