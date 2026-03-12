import { pesquisarEmpresaPorEndereco, consultarCNPJ, CNPJResponse } from './cnpjService';
import { EnrichedClient } from '../types';

export interface SearchResult {
    source: 'local' | 'cnpja';
    cnpj?: string;
    companyName: string;
    ownerName?: string;
    address?: string;
    city?: string;
    state?: string;
    district?: string;
    phone?: string;
    mainCnae?: string;
    lat?: number;
    lng?: number;
    googleMapsUri?: string;
    /** Full CNPJ data if fetched */
    fullData?: CNPJResponse;
}

/**
 * Normalizes a string for fuzzy comparison (lowercase, no accents, no extra spaces)
 */
const normalize = (s: string): string =>
    s.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

/**
 * Checks if two strings are a fuzzy match (one contains the other)
 */
const fuzzyMatch = (a: string, b: string): boolean => {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb) return false;
    return na.includes(nb) || nb.includes(na);
};

/**
 * Search for client data locally (in existing client list) and externally (CNPJa API).
 * Returns a list of SearchResult suggestions.
 */
export const searchClientByName = async (
    query: string,
    state: string | undefined,
    allClients: EnrichedClient[],
    currentClientId: string
): Promise<SearchResult[]> => {
    const results: SearchResult[] = [];
    const normalizedQuery = normalize(query);

    if (!normalizedQuery || normalizedQuery.length < 3) return results;

    // 1. LOCAL SEARCH — find clients in the database that have more complete data
    const localMatches = allClients.filter(c => {
        if (c.id === currentClientId) return false;
        // Must have some useful data (CNPJ or address or coordinates)
        const hasUsefulData = (c.cnpj && c.cnpj.replace(/\D/g, '').length === 14)
            || (c.lat !== 0 && c.lng !== 0)
            || (c.cleanAddress && c.cleanAddress !== 'Endereço não cadastrado');
        if (!hasUsefulData) return false;

        return fuzzyMatch(c.companyName, query) || fuzzyMatch(c.ownerName, query);
    });

    for (const match of localMatches.slice(0, 5)) {
        results.push({
            source: 'local',
            cnpj: match.cnpj,
            companyName: match.companyName,
            ownerName: match.ownerName,
            address: match.cleanAddress,
            city: match.city,
            state: match.state,
            district: match.district,
            phone: match.contact,
            mainCnae: match.mainCnae,
            lat: match.lat,
            lng: match.lng,
            googleMapsUri: match.googleMapsUri || (match.lat ? `https://www.google.com/maps?q=${match.lat},${match.lng}` : undefined),
        });
    }

    // 2. EXTERNAL SEARCH — search CNPJa API by company name
    try {
        const externalResults = await pesquisarEmpresaPorEndereco({
            filtros: query,
            uf: state && state.length === 2 ? state : undefined,
        });

        if (externalResults && externalResults.length > 0) {
            for (const item of externalResults.slice(0, 5)) {
                const taxId = item.taxId || item.cnpj || '';
                // Avoid duplicates of local results
                if (results.some(r => r.cnpj && r.cnpj.replace(/\D/g, '') === taxId.replace(/\D/g, ''))) continue;

                const address = item.address;
                const street = address
                    ? [address.type, address.street].filter(Boolean).join(' ')
                    : '';
                const fullAddress = address
                    ? [street, address.number, address.district, address.city, address.state].filter(Boolean).join(', ')
                    : '';

                results.push({
                    source: 'cnpja',
                    cnpj: taxId,
                    companyName: item.alias || item.company?.name || item.name || query,
                    address: fullAddress,
                    city: address?.city || '',
                    state: address?.state || '',
                    district: address?.district || '',
                    phone: item.phones?.[0] ? `(${item.phones[0].area}) ${item.phones[0].number}` : undefined,
                    lat: address?.coordinates?.latitude,
                    lng: address?.coordinates?.longitude,
                    googleMapsUri: address?.coordinates?.latitude
                        ? `https://www.google.com/maps?q=${address.coordinates.latitude},${address.coordinates.longitude}`
                        : undefined,
                });
            }
        }
    } catch (err) {
        console.warn('[ClientSearch] External search failed:', err);
        // Continue with local results only
    }

    return results;
};

/**
 * Given a search result, enriches it fully if from external source (fetches complete CNPJ data).
 */
export const enrichFromResult = async (result: SearchResult): Promise<SearchResult> => {
    if (result.source === 'cnpja' && result.cnpj) {
        try {
            const cleanCnpj = result.cnpj.replace(/\D/g, '');
            if (cleanCnpj.length === 14) {
                const fullData = await consultarCNPJ(cleanCnpj);
                if (fullData) {
                    return { ...result, fullData };
                }
            }
        } catch (err) {
            console.warn('[ClientSearch] Failed to enrich result:', err);
        }
    }
    return result;
};
