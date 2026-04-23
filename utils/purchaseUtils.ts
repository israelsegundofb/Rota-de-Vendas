import { PurchaseRecord } from '../types';
import { parseDateToInt } from './dateUtils';

/**
 * Valida se um registro de compra é real e possui valor.
 * Usado para filtrar dados legados/órfãos ou de mock da interface.
 */
export const isValidPurchase = (p: PurchaseRecord, filterSalespersonId?: string, startDate?: string, endDate?: string): boolean => {
    // 1. Deve ter vínculo de arquivo (sourceFileId) para não ser dado fictício/órfão
    if (!p.sourceFileId) return false;

    // 2. Deve ter quantidade válida ou valor monetário
    const hasPurchaseData = (p.quantity && p.quantity > 0) || (p.totalValue && p.totalValue > 0) || (p.price && p.price > 0);
    if (!hasPurchaseData) return false;

    // 3. Filtro de Vendedor (opcional)
    if (filterSalespersonId && filterSalespersonId !== 'Todos' && p.salespersonId !== filterSalespersonId) {
        return false;
    }

    // 4. Filtro de Data (opcional)
    if (startDate || endDate) {
        const pDateInt = parseDateToInt(p.purchaseDate);
        if (pDateInt !== null) {
            if (startDate) {
                const startInt = parseDateToInt(startDate);
                if (startInt !== null && pDateInt < startInt) return false;
            }
            if (endDate) {
                const endInt = parseDateToInt(endDate);
                if (endInt !== null && pDateInt > endInt) return false;
            }
        }
    }

    return true;
};

/**
 * Retorna apenas as compras válidas de um cliente baseada nos filtros ativos.
 */
export const getFilteredPurchases = (purchases: PurchaseRecord[] | undefined, filterSalespersonId?: string, startDate?: string, endDate?: string): PurchaseRecord[] => {
    if (!purchases) return [];
    return purchases.filter(p => isValidPurchase(p, filterSalespersonId, startDate, endDate));
};
