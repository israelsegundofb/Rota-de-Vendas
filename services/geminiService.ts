import { GoogleGenAI } from "@google/genai";
import { EnrichedClient, RawClient } from "../types";
import { cleanAddress } from "../utils/csvParser";
import { geocodeAddress } from "./geocodingService";

// Use batch size 1 to ensure accurate association of Maps Grounding metadata (URIs) to specific clients.
const BATCH_SIZE = 1;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
      3. Obtenha a localização exata (latitude/longitude), o endereço formatado oficial e o link do Maps.
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
        "cleanAddress": "Endereço completo oficial encontrado"
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

        // If CSV didn't provide coords, try robust Geocoding API
        if (!client['extractedLat']) {
          // Prefer the address cleaned/verified by Gemini, or fallback to raw
          const addressToGeocode = finalAddress || rawAddress;

          // Only geocode if we have a somewhat valid address string
          if (addressToGeocode && addressToGeocode.length > 5) {
            try {
              const geocodeResult = await geocodeAddress(addressToGeocode, apiKey);
              if (geocodeResult) {
                finalLat = geocodeResult.lat;
                finalLng = geocodeResult.lng;
                // Use the official formatted address from Google Maps if available
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
        allEnriched.push({
          id: id,
          salespersonId: salespersonId,
          companyName: company,
          ownerName: owner,
          contact: contact,
          originalAddress: rawAddress,
          cleanAddress: finalAddress,
          category: aiData.category || 'Outros',
          region: aiData.region || 'Indefinido',
          state: aiData.state || 'BR',
          city: aiData.city || 'Desconhecido',
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
          // Fallback to avoid breaking the whole list
          allEnriched.push({
            id: id,
            salespersonId: salespersonId,
            companyName: company,
            ownerName: owner,
            contact: contact,
            originalAddress: rawAddress,
            cleanAddress: address,
            category: 'Outros',
            region: 'Indefinido',
            state: 'BR',
            city: 'Erro Proc.',
            lat: 0,
            lng: 0
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