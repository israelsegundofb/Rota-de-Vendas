import { GoogleGenAI } from "@google/genai";
import { EnrichedClient, RawClient } from "../types";
import { cleanAddress } from "../utils/csvParser";

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
               try { aiData = JSON.parse(match[0]); } catch (e) {}
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

        // Use valid data or fallbacks
        allEnriched.push({
            id: id,
            salespersonId: salespersonId,
            companyName: company,
            ownerName: owner,
            contact: contact,
            originalAddress: rawAddress,
            cleanAddress: aiData.cleanAddress || address,
            category: aiData.category || 'Outros',
            region: aiData.region || 'Indefinido',
            state: aiData.state || 'BR',
            city: aiData.city || 'Desconhecido',
            lat: typeof aiData.lat === 'number' ? aiData.lat : 0,
            lng: typeof aiData.lng === 'number' ? aiData.lng : 0,
            googleMapsUri: googleMapsUri // Prioritize Grounding URI
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