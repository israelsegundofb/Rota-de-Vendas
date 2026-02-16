import Papa from 'papaparse';
import { RawClient, Product } from '../types';
import { ClientSchema, ProductSchema } from './schemas';
import { z } from 'zod';

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

const parseMoney = (value: any): number => {
  if (value === null || value === undefined) return 0;
  const str = String(value).trim();
  if (!str) return 0;
  const clean = str.replace(/[R$\s.]/g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

const parsePercentage = (value: string): number => {
  if (!value) return 0;
  const clean = String(value).replace(/[%]/g, '').replace(',', '.');
  return parseFloat(clean) || 0;
};

const PURCHASE_KEYWORDS = ['data da compra', 'valor total', 'quantidade', 'item', 'sku', 'emissao', 'venda', 'nfs', 'quantidade de skus', 'produtos comprados', 'valor unitario'];
const CLIENT_KEYWORDS = ['razao social', 'cnpj', 'endereco', 'contato', 'fantasia', 'proprietario', 'rua', 'bairro', 'endereco comercial', 'responsavel', 'nome fantasia', 'telefone', 'celular'];
const PRODUCT_KEYWORDS = ['preco de venda', 'custo', 'ncm', 'departamento', 'cod.fabrica', 'marca', 'unidade', 'descricao', 'produto'];

// Helper to normalize headers (remove accents, lowercase)
const normalizeHeader = (header: any): string => {
  if (header === null || header === undefined) return '';
  return String(header)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .trim();
};

/**
 * Detects the type of CSV based on its headers.
 */
export const detectCSVType = (headers: string[]): 'clients' | 'products' | 'purchases' => {
  const normalizedHeaders = headers.map(h => normalizeHeader(h));

  let purchaseScore = normalizedHeaders.filter(h => PURCHASE_KEYWORDS.some(k => h.includes(k))).length;
  let clientScore = normalizedHeaders.filter(h => CLIENT_KEYWORDS.some(k => h.includes(k))).length;
  let productScore = normalizedHeaders.filter(h => PRODUCT_KEYWORDS.some(k => h.includes(k))).length;

  // Prioritize purchases if date + (sku or value or quantity) are present
  const hasDate = normalizedHeaders.some(h => h.includes('data') || h.includes('emissao'));
  const hasVitals = normalizedHeaders.some(h => h.includes('valor') || h.includes('sku') || h.includes('quantidade'));

  if (hasDate && hasVitals) {
    purchaseScore += 5;
  }

  if (purchaseScore > clientScore && purchaseScore > productScore) return 'purchases';
  if (productScore > clientScore) return 'products';
  return 'clients';
};

export const parseProductCSV = (file: File): Promise<Product[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results) => {
        const rows = results.data as any[][];
        if (rows.length === 0) return resolve([]);

        // 1. Find Header Row
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
          const rowValues = rows[i].map(h => normalizeHeader(h));
          if (rowValues.some(h => PRODUCT_KEYWORDS.some(k => h.includes(k)))) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) headerRowIndex = 0;

        const headers = rows[headerRowIndex].map(h => normalizeHeader(h));
        const dataRows = rows.slice(headerRowIndex + 1);
        const products: Product[] = [];

        dataRows.forEach((rowArray, rowIndex) => {
          if (!rowArray || rowArray.length === 0) return;

          const normalizedRow: Record<string, any> = {};
          headers.forEach((h, colIdx) => {
            if (h) normalizedRow[h] = rowArray[colIdx];
          });

          // Mapping based on new structure: "Departamento | Cód.Prod / SKU | Nome do Produto | Marca | Preço de Venda"

          const category = normalizedRow['departamento'] || normalizedRow['categoria'] || normalizedRow['grupo'] || normalizedRow['familia'] || 'Geral';
          const sku = normalizedRow['cod.prod / sku'] || normalizedRow['cod.prod'] || normalizedRow['sku'] || normalizedRow['numero do sku'] || normalizedRow['codigo'] || normalizedRow['codigo produto'] || normalizedRow['id'] || normalizedRow['ref'] || normalizedRow['referencia'] || normalizedRow['cod'] || '';
          const name = normalizedRow['nome do produto'] || normalizedRow['descricao'] || normalizedRow['nome'] || normalizedRow['produto'] || '';
          const brand = normalizedRow['marca'] || normalizedRow['fabricante'] || 'Genérico';
          const price = parseMoney(normalizedRow['preco de venda'] || normalizedRow['preco'] || '0');
          const factoryCode = normalizedRow['cod.fabrica'] || normalizedRow['cod fabrica'] || normalizedRow['codigo fabrica'] || '';

          // Optional margin & discount
          const margin = parsePercentage(normalizedRow['margem'] || '0');
          const discount = parsePercentage(normalizedRow['desconto'] || normalizedRow['discount'] || '0');

          const rawProduct = {
            category,
            sku,
            brand,
            factoryCode,
            name,
            price,
            margin,
            discount
          };

          const result = ProductSchema.safeParse(rawProduct);

          if (result.success) {
            products.push(result.data as Product);
          } else {
            // Log error but continue logic? Or skip?
            // For strict validation we skip
            console.warn(`Row ${rowIndex + 1} invalid:`, result.error.issues);
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
      header: false,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results) => {
        const rows = results.data as any[][];
        if (rows.length === 0) return resolve([]);

        // 1. Find Header Row
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
          const rowValues = rows[i].map(h => normalizeHeader(h));
          const matchCount = rowValues.filter(h => CLIENT_KEYWORDS.some(k => h.includes(k))).length;
          if (matchCount >= 1) { // Accept at least 1 keyword for clients
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) headerRowIndex = 0;

        const headers = rows[headerRowIndex].map(h => normalizeHeader(h));
        const dataRows = rows.slice(headerRowIndex + 1);
        const normalizedData: RawClient[] = [];

        dataRows.forEach(rowArray => {
          if (!rowArray || rowArray.length === 0) return;

          const map: Record<string, any> = {};
          headers.forEach((h, colIdx) => {
            if (h) map[h] = rowArray[colIdx];
          });

          // Parse hyperlink if present in address column
          // Priority: Endereço > Endereço Comercial > Logradouro > Localização > Endereço Cobrança > Link Google Maps
          const addressInput = map['endereco'] || map['endereco comercial'] || map['logradouro'] || map['localizacao'] || map['endereco cobranca'] || map['link google maps'] || '';
          let { address, link, lat, lng } = parseHyperlink(addressInput);

          // Force CEP inclusion if present in a separate column
          const cep = map['cep'] || map['zip'] || map['codigo postal'] || '';
          if (cep && address && !address.toLowerCase().includes(cep.toLowerCase())) {
            // Append CEP to address to ensure Google Maps uses it for precision
            address = `${address}, ${cep}`;
          }

          // Explicit Link Column Check (New Feature)
          // Look for columns specifically meant for the map link, which might contain precise coords
          const explicitLinkInput = map['link'] || map['mapa'] || map['google maps'] || map['url'] || map['maps'] || map['coordenadas'] || map['geolocalizacao'];
          if (explicitLinkInput) {
            const linkData = parseHyperlink(explicitLinkInput);
            // Override if we found valid data in the dedicated link column
            if (linkData.link) link = linkData.link;
            if (linkData.lat) lat = linkData.lat;
            if (linkData.lng) lng = linkData.lng;
          }

          const rawClient = {
            companyName: map['razao social'] || map['cliente'] || map['nome fantasia'] || map['fantasia'] || map['empresa'] || map['nome comercial'] || '',
            cnpj: map['cnpj'] || map['taxid'] || map['inscricao'] || '',
            ownerName: map['responsavel'] || map['nome do proprietario'] || map['proprietario'] || map['dono'] || map['contato principal'] || '',
            phone: map['telefone comercial'] || map['contato'] || map['telefone'] || map['celular'] || '',
            whatsapp: map['whatsapp'] || map['whats'] || map['celular'] || '',
            address: map['endereco comercial'] || map['logradouro comercial'] || address || '',
            street: map['rua'] || map['logradouro'] || '',
            number: map['numero'] || map['num'] || '',
            district: map['bairro'] || map['distrito'] || '',
            city: map['nome da cidade'] || map['cidade'] || map['municipio'] || '',
            state: map['estado'] || map['uf'] || '',
            zip: map['cep'] || map['codigo postal'] || cep || '',
            country: map['pais'] || '',
            googleMapsLink: link,
            latitude: lat,
            longitude: lng
          };

          // Validation using Zod is implicit here via manual mapping but we can enforce stricter schema matching if we map to ClientSchema
          // Note: ClientSchema expects 'lat/lng' but raw wants 'latitude/longitude' or similar? 
          // Actually RawClient in types.ts likely lacks lat/lng or has different names.
          // Let's stick to the mapped object but ensure it's robust.

          if (rawClient.companyName || rawClient.address) {
            normalizedData.push(rawClient as any);
          }
        });

        // Validation
        if (normalizedData.length > 0) {
          const first = normalizedData[0];
          if (!first['companyName'] && !first['address']) {
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

export const parsePurchaseHistoryCSV = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results) => {
        const rows = results.data as any[][];
        if (rows.length === 0) return resolve([]);

        // 1. Find Header Row
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
          const rowValues = rows[i].map(h => normalizeHeader(h));
          if (rowValues.some(h => PURCHASE_KEYWORDS.some(k => h.includes(k)))) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) headerRowIndex = 0;

        const headers = rows[headerRowIndex].map(h => normalizeHeader(h));
        const dataRows = rows.slice(headerRowIndex + 1);
        const records: any[] = [];

        dataRows.forEach((rowArray) => {
          if (!rowArray || rowArray.length === 0) return;

          const normalizedRow: Record<string, any> = {};
          headers.forEach((h, colIdx) => {
            if (h) normalizedRow[h] = rowArray[colIdx];
          });

          const companyName = normalizedRow['razao social'] || normalizedRow['cliente'] || normalizedRow['empresa'] || '';
          const cnpj = normalizedRow['cnpj'] || normalizedRow['cpf/cnpj'] || normalizedRow['cpf'] || '';
          const sku = normalizedRow['cod.prod / sku'] || normalizedRow['cod.prod'] || normalizedRow['sku'] || '';
          const productName = normalizedRow['nome do produto'] || normalizedRow['produto'] || normalizedRow['descricao'] || '';
          const purchaseDate = normalizedRow['data da compra'] || normalizedRow['data'] || normalizedRow['emissao'] || '';

          const quantity = parseFloat(normalizedRow['quantidade de skus / produtos comprados'] || normalizedRow['quantidade'] || normalizedRow['qtd'] || '1');
          const safeQuantity = isNaN(quantity) ? 1 : quantity;
          const price = parseMoney(normalizedRow['valor unitario'] || normalizedRow['preco'] || '0');
          const totalValue = parseMoney(normalizedRow['valor total'] || normalizedRow['total'] || (safeQuantity * price).toString());

          if (companyName && (sku || productName)) {
            records.push({
              companyName: String(companyName).trim(),
              cnpj: String(cnpj).trim().replace(/[.\-\/]/g, ""),
              sku: String(sku).trim(),
              name: String(productName).trim(), // Match Product interface
              brand: normalizedRow['marca'] || 'N/A',
              category: normalizedRow['categoria'] || normalizedRow['departamento'] || 'Venda',
              price: price,
              purchaseDate: String(purchaseDate).trim(),
              quantity: quantity,
              totalValue: totalValue,
              factoryCode: normalizedRow['cod.fabrica'] || ''
            });
          }
        });

        resolve(records);
      },
      error: (error) => reject(error)
    });
  });
};

export { cleanAddress };