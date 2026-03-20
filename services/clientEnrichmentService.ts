import { EnrichedClient, RawClient } from "../types";
import { cleanAddress } from "../utils/csvParser";
import { geocodeAddress } from "./geocodingService";
import { consultarCNPJ, CNPJResponse } from "./cnpjService";
import pLimit from 'p-limit';

/**
 * Helper to determine Region from CEP
 */
const getRegionFromCEP = (cep: string): string => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length < 5) return 'Indefinido';

    const prefix = parseInt(cleanCep.substring(0, 1));
    const range = parseInt(cleanCep.substring(0, 2));

    if (prefix === 0 || prefix === 1 || prefix === 2 || prefix === 3) return 'Sudeste';
    if (prefix === 8 || prefix === 9) return 'Sul';
    if (prefix === 4 || prefix === 5) return 'Nordeste';

    if (prefix === 6) {
        if (range >= 60 && range <= 65) return 'Nordeste';
        return 'Norte';
    }

    if (prefix === 7) {
        if (range === 77 || range === 76) return 'Norte';
        return 'Centro-Oeste';
    }

    return 'Indefinido';
};

/**
 * Helper to determine Region from State (UF)
 */
const getRegionFromState = (uf: string): string => {
    const nordeste = ['MA', 'PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA'];
    const norte = ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'];
    const centroOeste = ['GO', 'MT', 'MS', 'DF'];
    const sudeste = ['ES', 'MG', 'RJ', 'SP'];
    const sul = ['PR', 'SC', 'RS'];

    const normalizedUF = uf.toUpperCase().trim();
    if (nordeste.includes(normalizedUF)) return 'Nordeste';
    if (norte.includes(normalizedUF)) return 'Norte';
    if (centroOeste.includes(normalizedUF)) return 'Centro-Oeste';
    if (sudeste.includes(normalizedUF)) return 'Sudeste';
    if (sul.includes(normalizedUF)) return 'Sul';
    return 'Indefinido';
};

interface GeoAddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
}

/**
 * Helper to extract metadata from Geocoding API components
 */
const parseAddressComponents = (components: GeoAddressComponent[]) => {
    let city = 'Desconhecido';
    let state = 'BR';
    let region: 'Indefinido' | 'Sudeste' | 'Sul' | 'Nordeste' | 'Norte' | 'Centro-Oeste' = 'Indefinido';

    if (Array.isArray(components)) {
        const stateComp = components.find(c => c.types.includes('administrative_area_level_1'));
        if (stateComp) state = stateComp.short_name;

        const cityComp = components.find(c => c.types.includes('administrative_area_level_2') || c.types.includes('locality'));
        if (cityComp) city = cityComp.long_name;

        region = getRegionFromState(state) as 'Indefinido' | 'Sudeste' | 'Sul' | 'Nordeste' | 'Norte' | 'Centro-Oeste';
    }
    return { city, state, region };
};

/**
 * Processa a lista de clientes usando Geocodificação e CNPJ (sem IA).
 */
export const processClientsSimple = async (
    rawClients: RawClient[],
    salespersonId: string,
    categories: string[],
    onProgress?: (processed: number, total: number, latestClient?: EnrichedClient) => void
): Promise<EnrichedClient[]> => {

    const total = rawClients.length;
    let processedCount = 0;

    const processSingleClient = async (client: RawClient, index: number): Promise<EnrichedClient | null> => {
        if (!client) {
            processedCount++;
            if (onProgress) onProgress(processedCount, total);
            return null;
        }

        const sanitizedCnpj = client.cnpj ? client.cnpj.replace(/\D/g, '') : null;
        const resolvedSalespersonId = client.salespersonId || salespersonId;

        const id = sanitizedCnpj && sanitizedCnpj.length === 14
            ? `cli_${sanitizedCnpj}`
            : `cli_${resolvedSalespersonId}-${Date.now()}-${index}`;

        // 1. CNPJ Enrichment
        let cnpjData: CNPJResponse | null = null;
        if (client.cnpj && client.cnpj.replace(/\D/g, '').length === 14) {
            try {
                cnpjData = await consultarCNPJ(client.cnpj);
            } catch (e) {
                console.warn(`CNPJ enrichment failed for ${client.cnpj}`, e);
            }
        }

        // 2. Address Construction
        const granularAddressParts = [
            client.street || client.address,
            client.number,
            client.district,
            client.city,
            client.state,
            client.zip,
            client.country
        ].filter(Boolean);

        let rawAddress = client.address || "";
        const granularAddress = granularAddressParts.join(", ");

        if (!rawAddress || (granularAddress.length > rawAddress.length && (client.number || client.district || client.city))) {
            rawAddress = granularAddress;
        }

        if (cnpjData?.logradouro) {
            rawAddress = `${cnpjData.logradouro}, ${cnpjData.numero}${cnpjData.complemento ? ` - ${cnpjData.complemento}` : ''}, ${cnpjData.bairro}, ${cnpjData.municipio} - ${cnpjData.uf}`;
        }

        const address = cleanAddress(rawAddress);
        const company = cnpjData?.nome_fantasia || cnpjData?.razao_social || client.companyName || "Empresa Desconhecida";
        const owner = client.ownerName || "";
        const contact = cnpjData?.ddd_telefone_1 || client.phone || "";
        const cepMatch = address.match(/\d{5}[-]?\d{3}/);
        const extractedCEP = cnpjData?.cep || (cepMatch ? cepMatch[0] : "");

        if (!address && company === "Empresa Desconhecida") {
            processedCount++;
            if (onProgress) onProgress(processedCount, total);
            return null;
        }

        // 3. Geocoding
        let finalLat = cnpjData?.latitude || client.latitude || 0;
        let finalLng = cnpjData?.longitude || client.longitude || 0;
        let finalAddress = cnpjData?.logradouro ? `${cnpjData.logradouro}, ${cnpjData.numero}, ${cnpjData.municipio} - ${cnpjData.uf}` : address;
        let finalCity = cnpjData?.municipio || client.city || 'Desconhecido';
        let finalState = cnpjData?.uf || client.state || 'BR';
        let finalRegion = (cnpjData?.uf ? getRegionFromState(cnpjData.uf) : null) || 'Indefinido';

        const hasValidCoords = typeof finalLat === 'number' && typeof finalLng === 'number' && finalLat !== 0 && finalLng !== 0;

        if (!hasValidCoords || finalCity === 'Desconhecido') {
            const currentMapsKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || localStorage.getItem('google_maps_api_key');
            if (currentMapsKey) {
                const geocodeResult = await geocodeAddress(rawAddress || finalAddress, currentMapsKey);
                if (geocodeResult) {
                    if (!hasValidCoords) {
                        finalLat = geocodeResult.lat;
                        finalLng = geocodeResult.lng;
                    }
                    if (geocodeResult.addressComponents) {
                        const parsed = parseAddressComponents(geocodeResult.addressComponents as GeoAddressComponent[]);
                        finalCity = parsed.city;
                        finalState = parsed.state;
                        finalRegion = parsed.region as 'Indefinido' | 'Sudeste' | 'Sul' | 'Nordeste' | 'Norte' | 'Centro-Oeste';
                    }
                    if (geocodeResult.formattedAddress) {
                        finalAddress = geocodeResult.formattedAddress;
                    }
                }
            }
        }

        if ((!finalRegion || finalRegion === 'Indefinido') && extractedCEP) {
            finalRegion = getRegionFromCEP(extractedCEP);
        }

        const result: EnrichedClient = {
            id: id,
            salespersonId: resolvedSalespersonId,
            companyName: company,
            ownerName: owner,
            contact: contact,
            originalAddress: rawAddress,
            cleanAddress: finalAddress,
            cnpj: cnpjData?.cnpj || client.cnpj,
            mainCnae: cnpjData?.cnae_fiscal,
            secondaryCnaes: cnpjData?.cnaes_secundarios?.map((s) => `${s.codigo} - ${s.texto}`),
            category: ['Importado'], // Default without AI classification
            region: finalRegion as 'Indefinido' | 'Sudeste' | 'Sul' | 'Nordeste' | 'Norte' | 'Centro-Oeste',
            state: finalState,
            city: finalCity,
            lat: finalLat,
            lng: finalLng,
            whatsapp: client.whatsapp || "",
            googleMapsUri: client.googleMapsLink || ""
        };

        processedCount++;
        if (onProgress) onProgress(processedCount, total, result);
        return result;
    };

    const limit = pLimit(5);
    const promises = rawClients.map((client, index) => limit(() => processSingleClient(client, index)));
    const results = await Promise.all(promises);

    return results.filter((c: EnrichedClient | null): c is EnrichedClient => c !== null);
};
