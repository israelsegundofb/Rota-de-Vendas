import { PurchaseRecord } from '../types';

/**
 * Valida se um registro de compra é real e possui valor.
 * Usado para filtrar dados legados/órfãos ou de mock da interface.
 */
export const isValidPurchase = (p: PurchaseRecord, filterSalespersonId?: string, startDate?: string, endDate?: string): boolean => {
    // 1. Deve ter vínculo de arquivo (sourceFileId) para não ser dado fictício/órfão
    if (!p.sourceFileId) return false;

    // 2. Deve ter valor monetário ou preço/quantidade válidos
    const hasValue = (p.totalValue && p.totalValue > 0) || (p.price && (p.quantity || 1) > 0);
    if (!hasValue) return false;

    // 3. Filtro de Vendedor (opcional)
    if (filterSalespersonId && filterSalespersonId !== 'Todos' && p.salespersonId !== filterSalespersonId) {
        return false;
    }

    // 4. Filtro de Data (opcional)
    if (startDate && p.purchaseDate < startDate) return false;
    if (endDate && p.purchaseDate > endDate) return false;

    return true;
};

/**
 * Retorna apenas as compras válidas de um cliente baseada nos filtros ativos.
 */
export const getFilteredPurchases = (purchases: PurchaseRecord[] | undefined, filterSalespersonId?: string, startDate?: string, endDate?: string): PurchaseRecord[] => {
    if (!purchases) return [];
    return purchases.filter(p => isValidPurchase(p, filterSalespersonId, startDate, endDate));
};
