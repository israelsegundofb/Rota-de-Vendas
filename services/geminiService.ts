import { GoogleGenAI } from "@google/genai";
import { EnrichedClient, RawClient } from "../types";
import { cleanAddress } from "../utils/csvParser";

// Configuration
const CONCURRENCY_LIMIT = 5; // Number of simultaneous requests
const MIN_REQUEST_DELAY = 100; // Minimum delay between request starts to avoid instant bursts
const CACHE_PREFIX = "vendas_ai_cache_v1_";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Validates if the cached data is sufficient/valid.
 */
const isCacheValid = (data: any) => {
  return data && data.lat && data.lng && data.cleanAddress;
};

/**
 * Generates a unique cache key for a client.
 */
const getCacheKey = (company: string, address: string) => {
  const safeCompany = company.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeAddress = address.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${CACHE_PREFIX}${safeCompany}_${safeAddress}`;
};

/**
 * AI Processing Service with Concurrency and Caching
 */
export const processClientsWithAI = async (
  rawClients: RawClient[],
  salespersonId: string,
  apiKey: string,
  categories: string[],
  onProgress?: (processed: number, total: number) => void
): Promise<EnrichedClient[]> => {

  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const total = rawClients.length;
  let processedCount = 0;

  const categoryListString = categories.map(c => `"${c}"`).join(' | ');

  // Helper to update progress safely
  const updateProgress = () => {
    processedCount++;
    if (onProgress) onProgress(processedCount, total);
  };

  // --- Worker Function for a Single Client ---
  const processSingleClient = async (client: RawClient, index: number): Promise<EnrichedClient> => {
    // Basic Data Prep
    const rawAddress = client['Endereço'] || "";
    const address = cleanAddress(rawAddress);
    const company = client['Razão Social'] || "Empresa Desconhecida";
    const owner = client['Nome do Proprietário'] || "";
    const contact = client['Contato'] || "";
    const id = `${salespersonId}-${Date.now()}-${index}`; // Unique ID

    // Skip empty rows
    if (!address && company === "Empresa Desconhecida") {
      updateProgress();
      // Return a dummy object that will be filtered out or handled
      return null as any;
    }

    // 1. Check Cache
    const cacheKey = getCacheKey(company, address);
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const cachedData = JSON.parse(cached);
        if (isCacheValid(cachedData)) {
          console.log(`[Cache Hit] ${company}`);
          updateProgress();
          return {
            id, salespersonId, companyName: company, ownerName: owner, contact, originalAddress: rawAddress,
            ...cachedData
          };
        }
      }
    } catch (e) { console.warn("Cache read error", e); }

    // 2. Prepare AI Request
    const prompt = `
      Atue como especialista em logística e análise de dados.
      
      TAREFA: 
      1. Pesquise no Google Maps a empresa "${company}" localizada em ou perto de "${address}".
      2. Obtenha a localização exata (latitude/longitude), o endereço formatado oficial e o link do Maps.
      3. Classifique a empresa em uma destas opções: ${categoryListString} | "Outros".

      Retorne APENAS um objeto JSON válido com os dados encontrados:
      {
        "category": "Categoria Selecionada",
        "region": "Norte" | "Nordeste" | "Centro-Oeste" | "Sudeste" | "Sul" | "Indefinido",
        "state": "UF (Sigla)",
        "city": "Nome da Cidade",
        "lat": number,
        "lng": number,
        "cleanAddress": "Endereço completo oficial encontrado"
      }
    `;

    // 3. Execute with Retry
    let retries = 0;
    const MAX_RETRIES = 3;
    let aiResult: any = null;
    let googleMapsUri = "";

    while (retries <= MAX_RETRIES && !aiResult) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            tools: [{ googleMaps: {} }],
          }
        });

        // Parse Response
        let text = response.text || "{}";
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
          aiResult = JSON.parse(text);
        } catch (e) {
          // Try to extract JSON if mixed with text
          const match = text.match(/\{[\s\S]*\}/);
          if (match) aiResult = JSON.parse(match[0]);
        }

        // Extract URI
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && Array.isArray(chunks)) {
          const mapChunk = chunks.find((c: any) => c.maps?.uri);
          if (mapChunk) googleMapsUri = mapChunk.maps.uri;
        }

      } catch (error: any) {
        const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('quota');
        if (isRateLimit && retries < MAX_RETRIES) {
          retries++;
          const wait = 2000 * Math.pow(2, retries); // Exponential backoff: 2s, 4s, 8s...
          console.warn(`[Rate Limit] Retrying client ${index} in ${wait}ms...`);
          await delay(wait);
        } else {
          console.error(`Error processing client ${index}:`, error);
          break; // Exit retry loop on other errors
        }
      }
    }

    // 4. Fallback Logic & Final Object Construction
    if (!googleMapsUri) {
      const linkFormula = client['googleMapsLink'];
      if (linkFormula) {
        const urlMatch = linkFormula.match(/HYPERLINK\("([^"]+)"/);
        googleMapsUri = urlMatch && urlMatch[1] ? urlMatch[1] : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      } else if (address) {
        googleMapsUri = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      }
    }

    // Create Result
    const enriched: EnrichedClient = {
      id,
      salespersonId,
      companyName: company,
      ownerName: owner,
      contact,
      originalAddress: rawAddress,
      cleanAddress: aiResult?.cleanAddress || address,
      category: aiResult?.category || 'Outros',
      region: aiResult?.region || 'Indefinido',
      state: aiResult?.state || 'BR',
      city: aiResult?.city || 'Desconhecido',
      lat: typeof aiResult?.lat === 'number' ? aiResult.lat : 0,
      lng: typeof aiResult?.lng === 'number' ? aiResult.lng : 0,
      googleMapsUri
    };

    // 5. Save to Cache (if valid AI data was found)
    if (aiResult && aiResult.lat) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          cleanAddress: enriched.cleanAddress,
          category: enriched.category,
          region: enriched.region,
          state: enriched.state,
          city: enriched.city,
          lat: enriched.lat,
          lng: enriched.lng,
          googleMapsUri: enriched.googleMapsUri
        }));
      } catch (e) { /* Storage full or disabled */ }
    }

    updateProgress();
    return enriched;
  };

  // --- Queue Manager for Concurrency ---

  const results: EnrichedClient[] = [];
  const queue = [...rawClients.map((c, i) => ({ client: c, index: i }))];
  const activePromises: Promise<void>[] = [];

  // Loop until all items are processed
  while (queue.length > 0 || activePromises.length > 0) {
    // Fill the pool up to CONCURRENCY_LIMIT
    while (queue.length > 0 && activePromises.length < CONCURRENCY_LIMIT) {
      const item = queue.shift();
      if (!item) break;

      const promise = (async () => {
        // Add a small random delay to prevent hitting the API exactly at the same ms
        await delay(Math.random() * MIN_REQUEST_DELAY);
        const result = await processSingleClient(item.client, item.index);
        if (result && result.contact !== undefined) { // Check for valid object (not null/undefined)
          results.push(result);
        }
      })();

      // Add to active pool and remove when done
      const poolPromise = promise.then(() => {
        activePromises.splice(activePromises.indexOf(poolPromise), 1);
      });
      activePromises.push(poolPromise);
    }

    // Wait for at least one to finish before refilling
    if (activePromises.length > 0) {
      await Promise.race(activePromises);
    }
  }

  // Final Sort/Sanity Check if needed (optional)
  return results.sort((a, b) => a.companyName.localeCompare(b.companyName));
};

/**
 * AI Processing Service for Products
 */
export const processProductsWithAI = async (
  products: any[],
  apiKey: string,
  onProgress?: (processed: number, total: number) => void
): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const total = products.length;
  let processedCount = 0;

  // Reuse concurrency consts
  const MAX_CONCURRENT = 5;

  const updateProgress = () => {
    processedCount++;
    if (onProgress) onProgress(processedCount, total);
  };

  const processSingleProduct = async (product: any): Promise<any> => {
    const { name, brand, factoryCode, sku } = product;
    const cacheKey = `product_ai_v1_${sku}_${name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    // 1. Check Cache
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        updateProgress();
        return { ...product, category: cached };
      }
    } catch (e) { }

    // 2. Prepare Request
    const prompt = `
      Atue como um especialista em cadastro de produtos e e-commerce.
      Analise este produto:
      - Nome: "${name}"
      - Marca: "${brand}"
      - Código Fábrica: "${factoryCode}"
      
      Tarefa: Determine a melhor Categoria para este produto. 
      Seja conciso, use categorias de mercado padrão (ex: "Material Elétrico", "Fixação", "Som Automotivo", "Ferramentas", "Acessórios", "Segurança").
      
      Responda APENAS com o nome da categoria, nada mais.
    `;

    // 3. Execute
    let category = product.category;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const text = response.text?.trim();
      if (text && text.length < 50) { // Safety check
        category = text.replace(/\.$/, ''); // Remove trailing dot

        // Save to Cache
        try { localStorage.setItem(cacheKey, category); } catch (e) { }
      }
    } catch (e) {
      console.warn(`Error enriching product ${sku}:`, e);
    }

    updateProgress();
    return { ...product, category };
  };

  // Queue Manager (Simplified)
  const results: any[] = [];
  const queue = [...products];
  const active: Promise<void>[] = [];

  while (queue.length > 0 || active.length > 0) {
    while (queue.length > 0 && active.length < MAX_CONCURRENT) {
      const p = queue.shift();
      const promise = processSingleProduct(p).then(res => results.push(res));
      const wrapper = promise.then(() => active.splice(active.indexOf(wrapper), 1));
      active.push(wrapper as any); // Cast to any to avoid strict type issues with void/Promise<void> in array

      // Small delay
      await delay(50);
    }
    if (active.length > 0) await Promise.race(active);
  }

  // Restore original order based on SKU if possible, or just return results
  // Ideally we map back, but for now filtering/finding is okay if we assume unique SKUs.
  // Actually, let's just return the enriched list.
  return results;
};