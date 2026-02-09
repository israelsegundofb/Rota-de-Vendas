import { useState, useMemo } from 'react';
import { EnrichedClient, AppUser, Product } from '../types';
import { isAdmin, hasFullDataVisibility } from '../utils/authUtils';

export const useFilters = (
    masterClientList: EnrichedClient[],
    users: AppUser[],
    currentUser: AppUser | null,
    products: Product[]
) => {
    // Filter State
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterRegion, setFilterRegion] = useState<string>('Todas');
    const [filterState, setFilterState] = useState<string>('Todos');
    const [filterCity, setFilterCity] = useState<string>('Todas');
    const [filterCategory, setFilterCategory] = useState<string>('Todos');
    const [filterSalespersonId, setFilterSalespersonId] = useState<string>('Todos');
    const [filterSalesCategory, setFilterSalesCategory] = useState<string>('Todos');

    // Product Filters
    const [filterProductCategory, setFilterProductCategory] = useState<string>('Todos');
    const [searchProductQuery, setSearchProductQuery] = useState<string>('');

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
            const query = searchQuery.toLowerCase();
            const matchSearch = searchQuery === '' ||
                c.companyName.toLowerCase().includes(query) ||
                (c.ownerName && c.ownerName.toLowerCase().includes(query));

            // Product Filters (Where items were sold)
            let matchProduct = true;
            const prodQuery = searchProductQuery.toLowerCase();

            if (filterProductCategory !== 'Todos' || prodQuery !== '') {
                // If filtering by product, client MUST have purchase history
                if (!c.purchasedProducts || c.purchasedProducts.length === 0) {
                    matchProduct = false;
                } else {
                    // Check Category (Brand often used as category in this context)
                    const hasCat = filterProductCategory === 'Todos' || c.purchasedProducts.some(p => p.category === filterProductCategory);

                    // Check SKU, Brand, Factory Code, Description (Name), or Price
                    const hasMatch = prodQuery === '' || c.purchasedProducts.some(p =>
                        p.name.toLowerCase().includes(prodQuery) ||
                        p.sku.toLowerCase().includes(prodQuery) ||
                        p.brand.toLowerCase().includes(prodQuery) ||
                        p.factoryCode.toLowerCase().includes(prodQuery) ||
                        p.price.toString().includes(prodQuery)
                    );

                    matchProduct = hasCat && hasMatch;
                }
            }

            return matchRegion && matchState && matchCity && matchCat && matchSearch && matchProduct && matchSalesCat;
        });
    }, [visibleClients, filterRegion, filterState, filterCity, filterCategory, searchQuery, filterProductCategory, searchProductQuery, filterSalesCategory, users, currentUser]);

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

    const resetFilters = () => {
        setSearchQuery('');
        setFilterRegion('Todas');
        setFilterState('Todos');
        setFilterCity('Todas');
        setFilterSalespersonId('Todos');
        setFilterSalesCategory('Todos');
        setFilterProductCategory('Todos');
        setSearchProductQuery('');
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
        filterProductCategory, setFilterProductCategory,
        searchProductQuery, setSearchProductQuery,

        // Computed
        filteredClients,
        visibleClients,
        availableStates,
        availableCities,
        productCategories,

        // Actions
        resetFilters
    };
};
