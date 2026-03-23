import { PurchaseRecord } from '../types';

/**
 * Valida se um registro de compra é real e possui valor.
 * Usado para filtrar dados legados/órfãos ou de mock da interface.
 */
export const isValidPurchase = (p: PurchaseRecord, filterSalespersonId?: string, startDate?: string, endDate?: string): boolean => {
    // 1. Deve ter vínculo de arquivo (sourceFileId) para não ser dado fictício/órfão
    if (!p.sourceFileId) return false;

    // 2. Filtro de Vendedor (opcional) - Otimizado: verificação rápida de string antes de dados numéricos
    if (filterSalespersonId && filterSalespersonId !== 'Todos' && p.salespersonId !== filterSalespersonId) {
        return false;
    }

    // 3. Filtro de Data (opcional) - Otimizado: comparação de strings simples (ISO date ou yyyy-mm-dd)
    if (startDate && p.purchaseDate < startDate) return false;
    if (endDate && p.purchaseDate > endDate) return false;

    // 4. Deve ter quantidade válida ou valor monetário - Otimizado: movido para o final por checar múltiplas propriedades
    const hasPurchaseData = (p.quantity && p.quantity > 0) || (p.totalValue && p.totalValue > 0) || (p.price && p.price > 0);
    if (!hasPurchaseData) return false;

    return true;
};

/**
 * Retorna apenas as compras válidas de um cliente baseada nos filtros ativos.
 */
export const getFilteredPurchases = (purchases: PurchaseRecord[] | undefined, filterSalespersonId?: string, startDate?: string, endDate?: string): PurchaseRecord[] => {
    if (!purchases) return [];
    return purchases.filter(p => isValidPurchase(p, filterSalespersonId, startDate, endDate));
};
