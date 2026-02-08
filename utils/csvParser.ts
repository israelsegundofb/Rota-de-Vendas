import Papa from 'papaparse';
import { RawClient, Product } from '../types';

/**
 * Extracts coordinates from a Google Maps URL if possible.
 */
const extractCoordsFromUrl = (url: string): { lat?: number; lng?: number } | null => {
  if (!url) return null;

  // Match @lat,lng (common in maps urls)
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

  // Match q=lat,lng (search parameter)
  const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

  return null;
};

/**
 * Extracts address from a Google Maps URL query parameter if present.
 * Example: ...?query=Avenida+Paulista... -> Avenida Paulista
 */
const extractAddressFromUrl = (url: string): string | null => {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    const query = urlObj.searchParams.get('query') || urlObj.searchParams.get('q');
    if (query && !query.match(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)) {
      // If query is NOT coordinates, it's likely an address
      return query;
    }
  } catch (e) {
    // Fallback for partial URLs or invalid formats
    const match = url.match(/[?&]query=([^&]+)/) || url.match(/[?&]q=([^&]+)/);
    if (match) {
      return decodeURIComponent(match[1].replace(/\+/g, ' '));
    }
  }
  return null;
};

/**
 * Parses an Excel HYPERLINK formula to extract both the URL and the display address.
 * Formula format in CSV (raw): =HYPERLINK("url"; "ADDRESS") or =HYPERLINK("url", "ADDRESS")
 */
export const parseHyperlink = (input: any): { address: string; link?: string; lat?: number; lng?: number } => {
  if (input === null || input === undefined) return { address: '' };

  const raw = String(input).trim();

  // Robust Excel Hyperlink matching: handles extra quotes, spaces, and diverse separators
  // Pattern: =HYPERLINK( "URL" [;,] "LABEL" )
  const match = raw.match(/^=HYPERLINK\s*\(\s*["']+(.*?)["']+\s*[;,]\s*["']+(.*?)["']+\s*\)$/i);

  if (match) {
    const link = match[1].replace(/""/g, '"').trim();
    const address = match[2].replace(/""/g, '"').trim();
    const coords = extractCoordsFromUrl(link);
    return { link, address, ...coords };
  }

  // Fallback for simple address formulas or plain text
  const cleaned = cleanAddress(raw);

  // Check if the cleaned text itself is a Google Maps URL
  if (cleaned.includes('google.com/maps') || cleaned.includes('maps.app.goo.gl')) {
    const extractedAddress = extractAddressFromUrl(cleaned);
    const coords = extractCoordsFromUrl(cleaned);

    // If we extracted a valid address from the URL, use it as the display address
    // Otherwise keep the URL string (less ideal, but correct behavior if no query param)
    return {
      link: cleaned,
      address: extractedAddress || cleaned,
      ...coords
    };
  }

  return { address: cleaned };
};

/**
 * Cleans the Excel HYPERLINK formula to extract only the display address.
 * Kept for backward compatibility with logic that only needs the text.
 */
const cleanAddress = (input: any): string => {
  if (input === null || input === undefined) return '';
  const raw = String(input);

  // Fast extraction for display labels in formulas
  const match = raw.match(/"([^"]+)"\)$/);
  if (match && match[1]) return match[1].trim();

  if (raw.startsWith('=')) {
    return raw.replace(/[="()]/g, '').trim();
  }

  return raw.trim();
};

const parseMoney = (value: string): number => {
  if (!value) return 0;
  const clean = String(value).replace(/[R$\s.]/g, '').replace(',', '.');
  return parseFloat(clean) || 0;
};

const parsePercentage = (value: string): number => {
  if (!value) return 0;
  const clean = String(value).replace(/[%]/g, '').replace(',', '.');
  return parseFloat(clean) || 0;
};

// Helper to normalize headers (remove accents, lowercase)
const normalizeHeader = (header: string): string => {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .trim();
};

export const parseProductCSV = (file: File): Promise<Product[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results) => {
        const data = results.data as any[];
        const products: Product[] = [];

        data.forEach(row => {
          // Normalize row keys for flexible matching
          const normalizedRow: Record<string, any> = {};
          Object.keys(row).forEach(k => {
            normalizedRow[normalizeHeader(k)] = row[k];
          });

          // Mapping based on prompt: "Número do SKU | Marca | Cód.Fábrica | Descrição | Preço de Venda"

          const sku = normalizedRow['numero do sku'] || normalizedRow['sku'] || '';
          const brand = normalizedRow['marca'] || normalizedRow['fabricante'] || 'Genérico';
          const factoryCode = normalizedRow['cod.fabrica'] || normalizedRow['cod fabrica'] || normalizedRow['codigo fabrica'] || '';
          const name = normalizedRow['descricao'] || normalizedRow['nome'] || normalizedRow['produto'] || '';
          const price = parseMoney(normalizedRow['preco de venda'] || normalizedRow['preco'] || '0');

          // Fallback logic for category: Use 'Marca' as category if specific 'categoria' column is missing, to keep dropdowns working
          const category = normalizedRow['categoria'] || brand || 'Geral';

          // Optional margin & discount
          const margin = parsePercentage(normalizedRow['margem'] || '0');
          const discount = parsePercentage(normalizedRow['desconto'] || normalizedRow['discount'] || '0');

          if (sku || name) {
            products.push({
              category,
              sku,
              brand,
              factoryCode,
              name,
              price,
              margin,
              discount
            });
          }
        });

        resolve(products);
      },
      error: (error) => reject(error)
    });
  });
};

export const parseCSV = (file: File): Promise<RawClient[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8", // Explicitly try UTF-8, but PapaParse usually autodetects well
      transformHeader: (header) => {
        return header.trim().replace(/^\ufeff/, ''); // Remove BOM
      },
      complete: (results) => {
        const data = results.data as any[];
        const normalizedData: RawClient[] = [];

        // Normalize Data Mapping
        data.forEach(row => {
          // Create a normalized map for this row to handle header variations
          const map: Record<string, any> = {};
          Object.keys(row).forEach(key => {
            map[normalizeHeader(key)] = row[key];
          });

          // Parse hyperlink if present in address column
          // Priority: Endereço > Logradouro > Localização > Endereço Cobrança > Link Google Maps (which often contains full address)
          const addressInput = map['endereco'] || map['logradouro'] || map['localizacao'] || map['endereco cobranca'] || map['link google maps'] || '';
          const { address, link, lat, lng } = parseHyperlink(addressInput);

          // Map to strict RawClient Interface using loose matching
          normalizedData.push({
            'Razão Social': map['razao social'] || map['cliente'] || map['nome fantasia'] || map['fantasia'] || map['empresa'] || map['nome comercial'] || '',
            'Nome do Proprietário': map['nome do proprietario'] || map['proprietario'] || map['dono'] || map['contato principal'] || '',
            'Contato': map['contato'] || map['telefone'] || map['celular'] || map['whatsapp'] || '',
            'Endereço': address,
            'GoogleMapsLink': link,
            'extractedLat': lat,
            'extractedLng': lng
          });
        });

        // Validation
        if (normalizedData.length > 0) {
          const first = normalizedData[0];
          if (!first['Razão Social'] && !first['Endereço']) {
            console.warn("CSV Parsing Warning: Could not identify 'Razão Social' or 'Endereço' columns. Check CSV headers.");
          }
        }

        resolve(normalizedData);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

export { cleanAddress };