import { useState, useMemo } from 'react';
import { EnrichedClient, AppUser, Product } from '../types';
import { isAdmin, hasFullDataVisibility } from '../utils/authUtils';
import { isValidPurchase } from '../utils/purchaseUtils';
import { parseDateToInt } from '../utils/dateUtils';
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
    const [filterProductSection, setFilterProductSectionState] = useState<string>(() => getParam('prod_sec') || 'Todas');
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
    const setFilterProductSection = (val: string) => { setFilterProductSectionState(val); setParam('prod_sec', val === 'Todas' ? '' : val); };
    const setFilterProductSku = (val: string) => { setFilterProductSkuState(val); setParam('sku', val === 'Todos' ? '' : val); };
    const setSearchProductQuery = (val: string) => { setSearchProductQueryState(val); setParam('prod_q', val); };


    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const debouncedProductQuery = useDebounce(searchProductQuery, 300);

    const isFiltering = searchQuery !== debouncedSearchQuery || searchProductQuery !== debouncedProductQuery;

    // Derived Data
    // Memoized Map of Seller IDs to their Sales Category to avoid full users array dependency in tight loops
    const sellerCategoriesKey = users.map(u => `${u.id}:${u.salesCategory}`).join(',');
    const sellerCategoriesMap = useMemo(() => {
        const map = new Map<string, string>();
        sellerCategoriesKey.split(',').forEach(pair => {
            if (pair) {
                const [id, cat] = pair.split(':');
                map.set(id, cat);
            }
        });
        return map;
    }, [sellerCategoriesKey]);

    const currentUserId = currentUser?.id;
    const currentUserRole = currentUser?.role;

    // 1. Visible Clients (Permissions & Contextual Assignment)
    const visibleClients = useMemo(() => {
        if (!currentUserId || !currentUserRole) return [];

        const isAdminUser = hasFullDataVisibility(currentUserRole);
        const targetSalespersonId = isAdminUser ? filterSalespersonId : currentUserId;

        if (targetSalespersonId !== 'Todos') {
            // Logic: A client is "visible" for a salesperson if:
            // a) The client is assigned to them (c.salespersonId === targetSalespersonId)
            // b) The salesperson has at least one purchase record for that client
            return masterClientList.filter(c =>
                c.salespersonId === targetSalespersonId ||
                (c.purchasedProducts && c.purchasedProducts.some(p => p.salespersonId === targetSalespersonId))
            );
        }

        // 'Todos' (Admin only)
        return masterClientList;
    }, [masterClientList, filterSalespersonId, currentUserId, currentUserRole]);

    // 2. Filtered Clients (Search & Selects)
    const filteredClients = useMemo(() => {
        // Optimize: Pre-parse filter dates outside the loop as integers
        const parsedStartDateInt = startDate ? parseDateToInt(startDate) : null;
        const parsedEndDateInt = endDate ? parseDateToInt(endDate) : null;
        const hasDateFilter = !!(parsedStartDateInt || parsedEndDateInt);

        // Optimize: Pre-calculate lowercased queries
        const query = (debouncedSearchQuery || '').toLowerCase();
        const prodQuery = (debouncedProductQuery || '').toLowerCase();

        return visibleClients.filter(c => {
            // General Filters
            const matchRegion = filterRegion === 'Todas' || c.region === filterRegion;
            const matchState = filterState === 'Todos' || c.state === filterState;
            const matchCity = filterCity === 'Todas' || c.city === filterCity;
            const matchCat = filterCategory === 'Todos' || (Array.isArray(c.category) && c.category.includes(filterCategory));

            // Sales Category Filter (Admin Only)
            let matchSalesCat = true;
            if (currentUserRole && hasFullDataVisibility(currentUserRole) && filterSalesCategory !== 'Todos') {
                const sellerSalesCat = sellerCategoriesMap.get(c.salespersonId) || 'Desconhecido';
                if (sellerSalesCat !== filterSalesCategory) {
                    matchSalesCat = false;
                }
            }

            // Text Search
            const matchSearch = debouncedSearchQuery === '' ||
                (c.companyName || '').toLowerCase().includes(query) ||
                (c.ownerName && (c.ownerName || '').toLowerCase().includes(query));

            // Product Filters (Where items were sold)
            let matchProduct = true;

            // CNAE Filter (Matches Main or Secondary)
            const matchCnae = filterCnae === 'Todos' ||
                (c.mainCnae && c.mainCnae.includes(filterCnae)) ||
                (c.secondaryCnaes && c.secondaryCnaes.some(s => s.includes(filterCnae)));

            if (filterProductCategory !== 'Todos' || filterProductSection !== 'Todas' || filterProductSku !== 'Todos' || prodQuery !== '') {
                // If filtering by product, client MUST have purchase history
                if (!c.purchasedProducts || c.purchasedProducts.length === 0) {
                    matchProduct = false;
                } else {
                    // Optimize: Evaluate all product conditions in a single loop while preserving
                    // the independent "ANY product matches X" logic of the original code.
                    let hasCat = filterProductCategory === 'Todos';
                    let hasSection = filterProductSection === 'Todas';
                    let hasSku = filterProductSku === 'Todos';
                    let hasMatch = prodQuery === '';
                    let matchDate = !hasDateFilter;

                    for (let i = 0; i < c.purchasedProducts.length; i++) {
                        const p = c.purchasedProducts[i];

                        if (!hasCat && (p.category || '') === filterProductCategory) hasCat = true;
                        if (!hasSection && (p.section || '') === filterProductSection) hasSection = true;
                        if (!hasSku && (p.sku || '') === filterProductSku) hasSku = true;

                        if (!hasMatch) {
                            hasMatch = (p.name || '').toLowerCase().includes(prodQuery) ||
                                (p.sku || '').toLowerCase().includes(prodQuery) ||
                                (p.brand || '').toLowerCase().includes(prodQuery) ||
                                (p.category || '').toLowerCase().includes(prodQuery) ||
                                (p.section || '').toLowerCase().includes(prodQuery) ||
                                (p.factoryCode || '').toLowerCase().includes(prodQuery) ||
                                (p.price || 0).toString().includes(prodQuery);
                        }

                        if (!matchDate && p.purchaseDate) {
                            const pDateInt = parseDateToInt(p.purchaseDate);
                            if (pDateInt !== null) {
                                const isAfterStart = !parsedStartDateInt || pDateInt >= parsedStartDateInt;
                                const isBeforeEnd = !parsedEndDateInt || pDateInt <= parsedEndDateInt;
                                if (isAfterStart && isBeforeEnd) {
                                    matchDate = true;
                                }
                            }
                        }

                        // Early exit if all independent conditions are satisfied
                        if (hasCat && hasSection && hasSku && hasMatch && matchDate) {
                            break;
                        }
                    }

                    matchProduct = hasCat && hasSection && hasSku && hasMatch && matchDate;
                }
            }

            // Only with Purchases Filter: Context-aware and robust
            const matchOnlyWithPurchases = !filterOnlyWithPurchases || (
                c.purchasedProducts && c.purchasedProducts.some(p =>
                    isValidPurchase(p, filterSalespersonId, startDate, endDate)
                )
            );

            return matchRegion && matchState && matchCity && matchCat && matchSearch && matchProduct && matchSalesCat && matchOnlyWithPurchases && matchCnae;
        });
    }, [visibleClients, filterRegion, filterState, filterCity, filterCategory, filterCnae, filterSalespersonId, debouncedSearchQuery, filterProductCategory, filterProductSection, filterProductSku, debouncedProductQuery, filterSalesCategory, filterOnlyWithPurchases, sellerCategoriesMap, currentUserRole, startDate, endDate]);

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
        const cats = new Set(products.map(p => p.category).filter(Boolean));
        return Array.from(cats).sort();
    }, [products]);

    const productSections = useMemo(() => {
        let base = products;
        if (filterProductCategory !== 'Todos') {
            base = base.filter(p => p.category === filterProductCategory);
        }
        const secs = new Set(base.map(p => p.section).filter(Boolean));
        return Array.from(secs).sort();
    }, [products, filterProductCategory]);

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
        setFilterProductSectionState('Todas');
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
        filterProductSection, setFilterProductSection,
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
        productSections,

        // Actions
        resetFilters
    };
};
