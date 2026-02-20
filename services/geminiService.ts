import { EnrichedClient, RawClient, Product } from "../types";
import { cleanAddress } from "../utils/csvParser";
import { geocodeAddress } from "./geocodingService";
import { consultarCNPJ } from "./cnpjService";

// Use batch size 1 to ensure accurate association of Maps Grounding metadata (URIs) to specific clients.
const BATCH_SIZE = 1;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to determine Region from CEP
const getRegionFromCEP = (cep: string): string => {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length < 5) return 'Indefinido';

  const prefix = parseInt(cleanCep.substring(0, 1));
  const range = parseInt(cleanCep.substring(0, 2)); // For more granular checks if needed

  // Region mapping based on first digit of CEP
  // 0xxxx - SP (Sudeste)
  // 1xxxx - SP (Sudeste)
  // 2xxxx - RJ, ES (Sudeste)
  // 3xxxx - MG (Sudeste)
  // 4xxxx - BA, SE (Nordeste)
  // 5xxxx - PE, AL, PB, RN (Nordeste)
  // 6xxxx - CE, PI, MA, PA, AP, AM, RR, AC (Nordeste/Norte) - 66-69 is Norte, 60-65 is Nordeste
  // 7xxxx - DF, GO, TO, MT, RO, MS (Centro-Oeste/Norte) - 77 is TO (Norte), 76 is RO (Norte)
  // 8xxxx - PR, SC (Sul)
  // 9xxxx - RS (Sul)

  if (prefix === 0 || prefix === 1 || prefix === 2 || prefix === 3) return 'Sudeste';
  if (prefix === 8 || prefix === 9) return 'Sul';

  if (prefix === 4 || prefix === 5) return 'Nordeste';

  if (prefix === 6) {
    if (range >= 60 && range <= 65) return 'Nordeste'; // CE, PI, MA
    return 'Norte'; // PA, AP, AM, RR, AC
  }

  if (prefix === 7) {
    if (range === 77 || range === 76) return 'Norte'; // TO, RO
    return 'Centro-Oeste'; // DF, GO, MS, MT
  }

  return 'Indefinido';
};

// Helper to determine Region from State (UF)
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

// Helper to extract metadata from Geocoding API components
const parseAddressComponents = (components: any[]) => {
  let city = 'Desconhecido';
  let state = 'BR';
  let region = 'Indefinido';

  if (Array.isArray(components)) {
    const stateComp = components.find(c => c.types.includes('administrative_area_level_1'));
    if (stateComp) state = stateComp.short_name; // UF

    const cityComp = components.find(c => c.types.includes('administrative_area_level_2') || c.types.includes('locality'));
    if (cityComp) city = cityComp.long_name;

    region = getRegionFromState(state);
  }
  return { city, state, region };
};

import pLimit from 'p-limit';

export const processClientsWithAI = async (
  rawClients: RawClient[],
  salespersonId: string,
  categories: string[],
  onProgress?: (processed: number, total: number) => void
): Promise<EnrichedClient[]> => {

  const total = rawClients.length;
  let processedCount = 0;

  const categoryListString = categories.map(c => `"${c}"`).join(' | ');

  // Task definition for a single client
  const processSingleClient = async (client: RawClient, index: number): Promise<EnrichedClient | null> => {
    // SAFETY CHECK: Handle cases where CSV rows are empty or keys are missing
    if (!client) {
      processedCount++;
      if (onProgress) onProgress(processedCount, total);
      return null;
    }

    const id = `${salespersonId}-${Date.now()}-${index}`;

    // --- PRE-ENRICHMENT WITH CNPJ ---
    let cnpjData: any = null;
    if (client.cnpj && client.cnpj.replace(/\D/g, '').length === 14) {
      try {
        cnpjData = await consultarCNPJ(client.cnpj);
      } catch (e) {
        console.warn(`CNPJ enrichment failed for ${client.cnpj}`, e);
      }
    }

    // Construct address from parts if the main address field is empty
    let rawAddress = client.address || "";
    if (!rawAddress && (client.street || client.city)) {
      const parts = [
        client.street,
        client.number,
        client.district,
        client.city,
        client.state,
        client.zip,
        client.country
      ].filter(Boolean);
      rawAddress = parts.join(", ");
    }

    // Override with CNPJ data if available (usually more accurate)
    if (cnpjData?.logradouro) {
      rawAddress = `${cnpjData.logradouro}, ${cnpjData.numero}${cnpjData.complemento ? ` - ${cnpjData.complemento}` : ''}, ${cnpjData.bairro}, ${cnpjData.municipio} - ${cnpjData.uf}`;
    }

    const address = cleanAddress(rawAddress);
    const company = cnpjData?.nome_fantasia || cnpjData?.razao_social || client.companyName || "Empresa Desconhecida";
    const owner = client.ownerName || "";
    const contact = cnpjData?.ddd_telefone_1 || client.phone || "";

    // Extract CEP from address for region fallback
    const cepMatch = address.match(/\d{5}[-]?\d{3}/);
    const extractedCEP = cnpjData?.cep || (cepMatch ? cepMatch[0] : "");

    // Skip completely empty rows
    if (!address && company === "Empresa Desconhecida") {
      processedCount++;
      if (onProgress) onProgress(processedCount, total);
      return null;
    }

    const prompt = `
      Atue como especialista em logística e análise de dados.
      
      TAREFA: 
      1. Pesquise no Google Maps a empresa "${company}" localizada EXATAMENTE em "${address}".
      2. Se não encontrar exatamente nesse local, procure nos arredores imediatos.
      3. Obtenha a localização exata (latitude/longitude), o endereço formatado oficial, telefone oficial, website e o link do Maps.
      4. Classifique a empresa em uma destas opções: ${categoryListString} | "Outros".

      IMPORTANTE: Use o endereço "${address}" como âncora principal para a busca.
      ${cnpjData ? `DADO ADICIONAL: O CNPJ da empresa é ${cnpjData.cnpj}.` : ""}
      ${client.city ? `DADO LOCALIDADE: Cidade: ${client.city}${client.state ? `, Estado: ${client.state}` : ''}` : ""}

      Retorne APENAS um objeto JSON válido com os dados encontrados:
      {
        "category": "Categoria Selecionada",
        "region": "Norte" | "Nordeste" | "Centro-Oeste" | "Sudeste" | "Sul" | "Indefinido",
        "state": "UF (Sigla)",
        "city": "Nome da Cidade",
        "lat": number,
        "lng": number,
        "cleanAddress": "Endereço completo oficial encontrado",
        "phone": "Telefone encontrado ou null",
        "website": "Website encontrado ou null"
      }
    `;

    let retries = 0;
    const MAX_RETRIES = 5;
    let result: EnrichedClient | null = null;
    let success = false;

    let aiData: any = {};
    let googleMapsUri = "";

    // 1. ATTEMPT AI ENRICHMENT (with Proxy)
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

    while (!success && retries <= MAX_RETRIES) {
      if ((globalThis as any).isUploadCancelled?.current) throw new Error("CANCELLED_BY_USER");

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch(`${backendUrl}/api/ai/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gemini-2.0-flash',
            prompt: prompt,
            useMaps: true
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`Backend AI Error: ${response.status}`);

        const data = await response.json();

        // Parse JSON Response from the text returned by AI
        let text = data.text || "{}";
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
          aiData = JSON.parse(text);
        } catch (parseError) {
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            try { aiData = JSON.parse(match[0]); } catch (e) {
              console.warn('Failed to parse match:', e);
            }
          }
        }

        // Use the Maps URI returned by the backend proxy
        googleMapsUri = data.mapsUri || "";

        success = true; // AI succeeded

      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.error(`Request timed out for client ${index}`);
        }

        if (retries < MAX_RETRIES) {
          retries++;
          const waitTime = 2000 * Math.pow(2, retries);
          await delay(waitTime);
        } else {
          console.error(`Failed to process client with AI Proxy ${index}`, error);
          break;
        }
      }
    }

    // 2. GEOCODING & FINALIZATION (Runs regardless of AI success)
    try {
      // --- GEOCODING ENHANCEMENT ---
      // Initialize with CNPJ data (highest priority), then AI data, then CSV data
      let finalLat = cnpjData?.latitude || client.latitude || (typeof aiData.lat === 'number' ? aiData.lat : 0);
      let finalLng = cnpjData?.longitude || client.longitude || (typeof aiData.lng === 'number' ? aiData.lng : 0);
      let finalAddress = cnpjData?.logradouro ? `${cnpjData.logradouro}, ${cnpjData.numero}, ${cnpjData.municipio} - ${cnpjData.uf}` : (aiData.cleanAddress || address);
      let finalCity = cnpjData?.municipio || aiData.city || 'Desconhecido';
      let finalState = cnpjData?.uf || aiData.state || 'BR';
      let finalRegion = (cnpjData?.uf ? getRegionFromState(cnpjData.uf) : null) || aiData.region || 'Indefinido';

      // Check if we need to force geocoding (Missing coords or (0,0))
      // We strictly trust the "Endereço Completo" (rawAddress) from the CSV as the source of truth if AI fails.
      const hasValidCoords = typeof finalLat === 'number' && typeof finalLng === 'number' && finalLat !== 0 && finalLng !== 0;
      const needsGeocoding = !hasValidCoords || finalCity === 'Desconhecido' || finalState === 'BR';

      if (needsGeocoding) {
        // Prioritize the raw address from CSV for geocoding to ensure we find "where the pin is" based on input
        const addressToGeocode = rawAddress || finalAddress;

        if (addressToGeocode && addressToGeocode.length > 5) {
          try {
            // We'll need a way to get the mapsApiKey here if it was removed from params.
            // For now, I'll check if VITE_GOOGLE_MAPS_API_KEY is available in import.meta.env
            const currentMapsKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string);
            if (currentMapsKey) {
              if ((globalThis as any).isUploadCancelled?.current) throw new Error("CANCELLED_BY_USER");
              const geocodeResult = await geocodeAddress(addressToGeocode, currentMapsKey);

              if (geocodeResult) {
                // Always update coordinates if we didn't have them or if they were 0,0
                if (!hasValidCoords) {
                  finalLat = geocodeResult.lat;
                  finalLng = geocodeResult.lng;
                }

                // Always update location details from the authoritative geocoding result
                if (geocodeResult.addressComponents) {
                  const parsed = parseAddressComponents(geocodeResult.addressComponents);
                  finalCity = parsed.city;
                  finalState = parsed.state;
                  finalRegion = parsed.region as any;
                }

                // Fallback to CEP if region is still undefined
                if ((!finalRegion || finalRegion === 'Indefinido') && extractedCEP) {
                  finalRegion = getRegionFromCEP(extractedCEP);
                }

                // Update formatted address if available
                if (geocodeResult.formattedAddress) {
                  finalAddress = geocodeResult.formattedAddress;
                }
              }
            }
          } catch (geoError) {
            console.warn(`Geocoding failed for ${company}`, geoError);
          }
        }
      }

      const NormalizeCategory = (cat: any): string[] => {
        if (Array.isArray(cat)) return cat;
        if (typeof cat === 'string') return [cat];
        return ['Outros'];
      };

      let finalContact = contact;
      if (aiData.phone) finalContact = finalContact ? `${finalContact} | Maps: ${aiData.phone}` : aiData.phone;
      if (aiData.website) finalContact = finalContact ? `${finalContact} | Site: ${aiData.website}` : `Site: ${aiData.website}`;

      result = {
        id: id,
        salespersonId: salespersonId,
        companyName: company,
        ownerName: owner,
        contact: finalContact,
        originalAddress: rawAddress,
        cleanAddress: finalAddress,
        cnpj: cnpjData?.cnpj || client.cnpj,
        mainCnae: cnpjData?.cnae_fiscal,
        secondaryCnaes: cnpjData?.cnaes_secundarios?.map((s: any) => `${s.codigo} - ${s.texto}`),
        category: NormalizeCategory(aiData.category),
        region: finalRegion,
        state: finalState,
        city: finalCity,
        lat: finalLat,
        lng: finalLng,
        whatsapp: client.whatsapp || aiData.phone || "",
        plusCode: aiData.plusCode || "",
        googleMapsUri: client.googleMapsLink || googleMapsUri
      };
    } catch (finalError) {
      console.error("Critical error in client finalization", finalError);
      // Absolute fallback if even the sync logic creates an exception
      result = {
        id: id,
        salespersonId: salespersonId,
        companyName: company,
        ownerName: owner,
        contact: contact,
        originalAddress: rawAddress,
        cleanAddress: rawAddress,
        category: ['Outros'],
        region: 'Indefinido',
        state: 'BR',
        city: 'Erro Critico',
        lat: client.latitude || 0,
        lng: client.longitude || 0,
        whatsapp: client.whatsapp || "",
        googleMapsUri: client.googleMapsLink
      };
    }

    processedCount++;
    if (onProgress) onProgress(processedCount, total);

    return result;
  };

  const limit = pLimit(10);
  // Map all clients to limited promises
  const promises = rawClients.map((client, index) => limit(() => processSingleClient(client, index)));

  // Wait for all to complete
  const results = await Promise.all(promises);

  // Filter out nulls (skipped rows)
  return results.filter((c: EnrichedClient | null): c is EnrichedClient => c !== null);
};

export const categorizeProductsWithAI = async (
  products: Product[],
  onProgress?: (processed: number, total: number) => void
): Promise<Product[]> => {
  const BATCH_SIZE = 10; // Process 10 products at a time for better accuracy
  const total = products.length;
  let processed = 0;
  const updatedProducts = [...products];

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);

    // Construct prompt - Use 'name' as description
    const productList = batch.map(p => `- ID: ${p.sku} | Nome: ${p.name} | Marca: ${p.brand}`).join('\n');

    const prompt = `
      Atue como um especialista em categorização de produtos de varejo.
      Analise a lista de produtos abaixo e atribua uma Categoria Curta e Padronizada para cada um (Ex: Elétrica, Hidráulica, Ferramentas, Pintura, Automotivo, Utilidades, etc).
      Se a marca for muito específica (ex: TIGRE, TRAMONTINA), você pode usar a marca como subcategoria se fizer sentido, mas prefira a categoria funcional.
      
      Lista de Produtos:
      ${productList}
      
      Retorne APENAS um JSON no formato de lista:
      [
        { "sku": "ID do produto", "category": "Categoria Sugerida" }
      ]
    `;

    try {
      // Use Backend Proxy instead of direct AI call
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(`${backendUrl}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          prompt: prompt
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Backend AI Error: ${response.status}`);

      const data = await response.json();
      let text = data.text || "[]";
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      let categories: any[] = [];
      try {
        categories = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse AI response", text);
        const match = text.match(/\[.*\]/s);
        if (match) {
          try { categories = JSON.parse(match[0]); } catch (err) {
            console.warn('Failed to parse categories:', err);
          }
        }
      }

      // Update products
      if (Array.isArray(categories)) {
        categories.forEach((item: any) => {
          const index = updatedProducts.findIndex(p => String(p.sku) === String(item.sku));
          if (index !== -1) {
            updatedProducts[index] = { ...updatedProducts[index], category: item.category };
          }
        });
      }

    } catch (e) {
      console.error("Batch classification failed", e);
    }

    processed += batch.length;
    if (onProgress) onProgress(processed, total);
    await delay(1000); // Rate limit protection
  }

  return updatedProducts;
};