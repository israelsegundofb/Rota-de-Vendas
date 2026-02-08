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

export const processClientsWithAI = async (
  rawClients: RawClient[],
  salespersonId: string,
  apiKey: string,
  categories: string[],
  onProgress?: (processed: number, total: number) => void
): Promise<EnrichedClient[]> => {

  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });

  const allEnriched: EnrichedClient[] = [];
  const total = rawClients.length;

  const categoryListString = categories.map(c => `"${c}"`).join(' | ');

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const client = rawClients[i];

    // SAFETY CHECK: Handle cases where CSV rows are empty or keys are missing
    if (!client) continue;

    const rawAddress = client['Endereço'] || "";
    const address = cleanAddress(rawAddress);
    const company = client['Razão Social'] || "Empresa Desconhecida";
    const owner = client['Nome do Proprietário'] || "";
    const contact = client['Contato'] || "";

    // Extract CEP from address for region fallback
    const cepMatch = address.match(/\d{5}[-]?\d{3}/);
    const extractedCEP = cepMatch ? cepMatch[0] : "";

    const id = `${salespersonId}-${Date.now()}-${i}`;

    // Skip completely empty rows to save tokens and prevent errors
    if (!address && company === "Empresa Desconhecida") {
      if (onProgress) onProgress(i + 1, total);
      continue;
    }

    const prompt = `
      Atue como especialista em logística e análise de dados.
      
      TAREFA: 
      1. Pesquise no Google Maps a empresa "${company}" localizada EXATAMENTE em "${address}".
      2. Se não encontrar exatamente nesse local, procure nos arredores imediatos.
      3. Obtenha a localização exata (latitude/longitude), o endereço formatado oficial, telefone oficial, website e o link do Maps.
      4. Classifique a empresa em uma destas opções: ${categoryListString} | "Outros".

      IMPORTANTE: Use o endereço "${address}" como âncora principal para a busca.
` + `
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
    let success = false;
    const MAX_RETRIES = 5;

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
          // Find the first chunk that has a Maps URI
          const mapChunk = chunks.find((c: any) => c.maps?.uri);
          if (mapChunk) {
            googleMapsUri = mapChunk.maps.uri;
          }
        }


        // --- GEOCODING ENHANCEMENT ---
        // Prioritize coordinates from CSV (hyperlink), then Geocoding API, then Gemini fallback.
        let finalLat = client['extractedLat'] || (typeof aiData.lat === 'number' ? aiData.lat : 0);
        let finalLng = client['extractedLng'] || (typeof aiData.lng === 'number' ? aiData.lng : 0);
        let finalAddress = aiData.cleanAddress || address;

        // Default to AI data, will be refined if Geocoding is used
        let finalCity = aiData.city || 'Desconhecido';
        let finalState = aiData.state || 'BR';
        let finalRegion = aiData.region || 'Indefinido';

        // Check if region is still Indefinido and we have CEP
        if ((!finalRegion || finalRegion === 'Indefinido') && extractedCEP) {
          finalRegion = getRegionFromCEP(extractedCEP);
        }

        // Check if we need to refine the location data (if AI failed or we need coords)
        const needsGeocoding = !client['extractedLat'] || finalCity === 'Desconhecido' || finalState === 'BR';

        if (needsGeocoding) {
          // Prefer the address cleaned/verified by Gemini, or fallback to raw
          const addressToGeocode = finalAddress || rawAddress;

          // Only geocode if we have a somewhat valid address string
          if (addressToGeocode && addressToGeocode.length > 5 && apiKey) {
            try {
              const geocodeResult = await geocodeAddress(addressToGeocode, apiKey);
              if (geocodeResult) {
                // Only update coords if we didn't have them
                if (!client['extractedLat']) {
                  finalLat = geocodeResult.lat;
                  finalLng = geocodeResult.lng;
                }

                // Always update metadata from official API if available
                if (geocodeResult.addressComponents) {
                  const parsed = parseAddressComponents(geocodeResult.addressComponents);
                  finalCity = parsed.city;
                  finalState = parsed.state;
                  finalRegion = parsed.region as any;
                }

                // Final fallback for region if still undefined
                if ((!finalRegion || finalRegion === 'Indefinido') && extractedCEP) {
                  finalRegion = getRegionFromCEP(extractedCEP);
                }

                if (geocodeResult.formattedAddress) {
                  finalAddress = geocodeResult.formattedAddress;
                }
              }
            } catch (geoError) {
              console.warn(`Geocoding failed for ${client['Razão Social']}`, geoError);
            }
          }
        }
        // -----------------------------

        // Use valid data or fallbacks

        // Helper to normalize category to array
        const NormalizeCategory = (cat: any): string[] => {
          if (Array.isArray(cat)) return cat;
          if (typeof cat === 'string') return [cat];
          return ['Outros'];
        };

        // ENRICH CONTACT INFO WITH MAPS DATA
        let finalContact = contact;
        if (aiData.phone) {
          finalContact = finalContact ? `${finalContact} | Maps: ${aiData.phone}` : aiData.phone;
        }
        if (aiData.website) {
          finalContact = finalContact ? `${finalContact} | Site: ${aiData.website}` : `Site: ${aiData.website}`;
        }

        allEnriched.push({
          id: id,
          salespersonId: salespersonId,
          companyName: company,
          ownerName: owner,
          contact: finalContact,
          originalAddress: rawAddress,
          cleanAddress: finalAddress,
          category: NormalizeCategory(aiData.category), // Fix: Call the helper
          region: finalRegion,
          state: finalState,
          city: finalCity,
          lat: finalLat,
          lng: finalLng,
          googleMapsUri: client['GoogleMapsLink'] || googleMapsUri // PRIORITIZE CSV EXACT LINK
        });

        success = true;

      } catch (error: any) {
        const isRateLimit = error.status === 429 || error.code === 429 ||
          (error.message && (error.message.includes('quota') || error.message.includes('429')));
        const isServerBusy = error.status === 503 || error.code === 503;

        if ((isRateLimit || isServerBusy) && retries < MAX_RETRIES) {
          retries++;
          const waitTime = 1000 * Math.pow(2, retries);
          console.warn(`Retry ${retries}/${MAX_RETRIES} for client ${i}`);
          await delay(waitTime);
        } else {
          console.error(`Failed to process client ${i}`, error);

          // Fallback Strategy
          let fallbackLat = 0;
          let fallbackLng = 0;
          let fallbackAddress = rawAddress;
          let fallbackCity = 'Erro Proc.';
          let fallbackState = 'BR';
          let fallbackRegion = 'Indefinido';

          if (rawAddress && apiKey) {
            try {
              console.log(`Attempting fallback geocoding for failed client ${i}...`);
              const geoResult = await geocodeAddress(rawAddress, apiKey);
              if (geoResult) {
                fallbackLat = geoResult.lat;
                fallbackLng = geoResult.lng;
                if (geoResult.formattedAddress) fallbackAddress = geoResult.formattedAddress;

                if (geoResult.addressComponents) {
                  const parsed = parseAddressComponents(geoResult.addressComponents);
                  fallbackCity = parsed.city;
                  fallbackState = parsed.state;
                  fallbackRegion = parsed.region;
                }
              }
            } catch (e) {
              // Ignore fallback error
            }
          }

          allEnriched.push({
            id: id,
            salespersonId: salespersonId,
            companyName: company,
            ownerName: owner,
            contact: contact,
            originalAddress: rawAddress,
            cleanAddress: fallbackAddress,
            category: ['Outros'],
            region: fallbackRegion as any,
            state: fallbackState,
            city: fallbackCity,
            lat: fallbackLat,
            lng: fallbackLng
          });
          success = true;
        }
      }
    }

    if (onProgress) {
      onProgress(i + 1, total);
    }

    // Throttle slightly to avoid aggressive rate limiting
    await delay(300);
  }

  return allEnriched;
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