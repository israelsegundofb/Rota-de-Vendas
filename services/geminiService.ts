import { GoogleGenAI } from "@google/genai";
import { EnrichedClient, RawClient, Product } from "../types";
import { cleanAddress } from "../utils/csvParser";
import { geocodeAddress } from "./geocodingService";

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
  apiKey: string,
  categories: string[],
  onProgress?: (processed: number, total: number) => void
): Promise<EnrichedClient[]> => {

  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const limit = pLimit(3); // Concurrency limit of 3 requests
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

    const rawAddress = client.address || "";
    // @ts-ignore - Handle potential mapped key access if raw is loose
    const address = cleanAddress(rawAddress);
    const company = client.companyName || "Empresa Desconhecida";
    const owner = client.ownerName || "";
    const contact = client.phone || "";
    const cnpj = client.cnpj || "";
    const cpf = client.cpf || "";

    // Extract CEP from address for region fallback
    const cepMatch = address.match(/\d{5}[-]?\d{3}/);
    const extractedCEP = cepMatch ? cepMatch[0] : "";

    const id = `${salespersonId}-${Date.now()}-${index}`;

    // Skip completely empty rows (updated to allow CNPJ/CPF only rows)
    if (!address && company === "Empresa Desconhecida" && !cnpj && !cpf) {
      processedCount++;
      if (onProgress) onProgress(processedCount, total);
      return null;
    }

    // Enhance prompt if CNPJ is available
    const searchContext = cnpj ? `CNPJ ${cnpj}` : (cpf ? `CPF ${cpf}` : `"${address}"`);

    const prompt = `
      Atue como especialista em logística e análise de dados.
      
      TAREFA: 
      1. Pesquise no Google Maps a empresa "${company}" localizada em ou vinculada a: ${searchContext}.
      2. Se não encontrar exatamente, procure melhor correspondência nos arredores.
      3. Obtenha a localização exata (latitude/longitude), endereço formatado, telefone, website e link do Maps.
      4. Classifique a empresa em uma destas opções: ${categoryListString} | "Outros".
` + `
      Retorne APENAS um objeto JSON válido:
      {
        "category": "Categoria Selecionada",
        "region": "Norte" | "Nordeste" | "Centro-Oeste" | "Sudeste" | "Sul" | "Indefinido",
        "state": "UF",
        "city": "Cidade",
        "lat": number,
        "lng": number,
        "cleanAddress": "Endereço completo oficial",
        "phone": "Telefone",
        "website": "Website"
      }
    `;

    let retries = 0;
    const MAX_RETRIES = 5;
    let result: EnrichedClient | null = null;
    let success = false;

    while (!success && retries <= MAX_RETRIES) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            tools: [{ googleMaps: {} }],
          }
        });

        // Parse JSON Response
        let text = response.text || "{}";
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        let aiData: any = {};
        try {
          aiData = JSON.parse(text);
        } catch (parseError) {
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            try { aiData = JSON.parse(match[0]); } catch (e) { }
          }
        }

        // Extract Google Maps Grounding URI
        let googleMapsUri = "";
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && Array.isArray(chunks)) {
          const mapChunk = chunks.find((c: any) => c.maps?.uri);
          if (mapChunk) googleMapsUri = mapChunk.maps.uri;
        }

        // --- GEOCODING ENHANCEMENT ---
        let finalLat = client.latitude || (typeof aiData.lat === 'number' ? aiData.lat : 0);
        let finalLng = client.longitude || (typeof aiData.lng === 'number' ? aiData.lng : 0);
        let finalAddress = aiData.cleanAddress || address;
        let finalCity = aiData.city || 'Desconhecido';
        let finalState = aiData.state || 'BR';
        let finalRegion = aiData.region || 'Indefinido';

        if ((!finalRegion || finalRegion === 'Indefinido') && extractedCEP) {
          finalRegion = getRegionFromCEP(extractedCEP);
        }

        const needsGeocoding = !finalLat || finalCity === 'Desconhecido' || finalState === 'BR';

        if (needsGeocoding) {
          // ... (Geocoding fallback kept same, assuming geocodeAddress handles empty address gracefully)
          const addressToGeocode = finalAddress || rawAddress;
          if (addressToGeocode && addressToGeocode.length > 5 && apiKey) {
            try {
              const geocodeResult = await geocodeAddress(addressToGeocode, apiKey);
              if (geocodeResult) {
                if (!finalLat) {
                  finalLat = geocodeResult.lat;
                  finalLng = geocodeResult.lng;
                }
                if (geocodeResult.addressComponents) {
                  const parsed = parseAddressComponents(geocodeResult.addressComponents);
                  finalCity = parsed.city;
                  finalState = parsed.state;
                  finalRegion = parsed.region as any;
                }
                if (geocodeResult.formattedAddress) finalAddress = geocodeResult.formattedAddress;
              }
            } catch (e) { }
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
          cnpj: cnpj,
          cpf: cpf,
          originalAddress: rawAddress,
          cleanAddress: finalAddress,
          category: NormalizeCategory(aiData.category),
          region: finalRegion,
          state: finalState,
          city: finalCity,
          lat: finalLat,
          lng: finalLng,
          googleMapsUri: client.googleMapsLink || googleMapsUri
        };

        success = true;

      } catch (error: any) {
        const isRateLimit = error.status === 429 || error.code === 429 ||
          (error.message && (error.message.includes('quota') || error.message.includes('429')));
        const isServerBusy = error.status === 503 || error.code === 503;

        if ((isRateLimit || isServerBusy) && retries < MAX_RETRIES) {
          retries++;
          const waitTime = 2000 * Math.pow(2, retries); // Increased base backoff
          console.warn(`Retry ${retries}/${MAX_RETRIES} for client ${index}`);
          await delay(waitTime);
        } else {
          console.error(`Failed to process client ${index}`, error);

          // Fallback Strategy
          result = {
            id: id,
            salespersonId: salespersonId,
            companyName: company,
            ownerName: owner,
            contact: contact,
            originalAddress: rawAddress,
            cleanAddress: rawAddress, // Keep raw address if process fails
            category: ['Outros'],
            region: 'Indefinido',
            state: 'BR',
            city: 'Erro Proc.',
            lat: 0,
            lng: 0,
            googleMapsUri: client['GoogleMapsLink']
          };
          success = true; // Mark as "success" in terms of loop continuation (using fallback)
        }
      }
    }

    processedCount++;
    if (onProgress) onProgress(processedCount, total);

    // Slight delay between successful requests to be polite to the API even within limits
    await delay(500);

    return result;
  };

  // Map all clients to limited promises
  const promises = rawClients.map((client, index) => limit(() => processSingleClient(client, index)));

  // Wait for all to complete
  const results = await Promise.all(promises);

  // Filter out nulls (skipped rows)
  return results.filter((c): c is EnrichedClient => c !== null);
};

export const categorizeProductsWithAI = async (
  products: Product[],
  apiKey: string,
  onProgress?: (processed: number, total: number) => void
): Promise<Product[]> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  // const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" }); // OLD SDK

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
      // Correct API Usage for this version
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let text = response.text || "[]";
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      let categories: any[] = [];
      try {
        categories = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse AI response", text);
        // Try to salvage if it's a list inside an object
        const match = text.match(/\[.*\]/s);
        if (match) {
          try { categories = JSON.parse(match[0]); } catch (err) { }
        }
      }

      // Update products
      if (Array.isArray(categories)) {
        categories.forEach((item: any) => {
          // Ensure ID is string comparison
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