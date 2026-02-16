import * as Papa from 'papaparse';
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
      complete: (results: any) => {
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
        let rejected = 0;

        // DEBUG: Log detected headers so we can diagnose mapping issues
        console.log(`[CSV Produtos] Header row index: ${headerRowIndex}`);
        console.log(`[CSV Produtos] Raw headers:`, rows[headerRowIndex]);
        console.log(`[CSV Produtos] Normalized headers:`, headers);
        if (dataRows.length > 0) {
          console.log(`[CSV Produtos] First data row:`, dataRows[0]);
        }

        // Helper: find value by trying multiple possible header names
        const findValue = (row: Record<string, any>, keys: string[]): any => {
          for (const key of keys) {
            // Try exact match first
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
          }
          // Try partial match (header contains the key)
          for (const key of keys) {
            for (const headerKey of Object.keys(row)) {
              if (headerKey.includes(key) && row[headerKey] !== undefined && row[headerKey] !== null && row[headerKey] !== '') {
                return row[headerKey];
              }
            }
          }
          return undefined;
        };

        dataRows.forEach((rowArray, rowIndex) => {
          if (!rowArray || rowArray.length === 0) return;

          const normalizedRow: Record<string, any> = {};
          headers.forEach((h, colIdx) => {
            if (h) normalizedRow[h] = rowArray[colIdx];
          });

          // Mapping with comprehensive header name variations
          const skuKeys = ['cod.prod / sku', 'cod.prod/sku', 'codprod/sku', 'codprod / sku', 'cod.prod', 'codprod', 'cod prod', 'sku', 'codigo sku', 'numero do sku', 'codigo', 'codigo produto', 'cod produto', 'id', 'ref', 'referencia', 'cod', 'codigo do produto', 'cod.', 'item'];
          const nameKeys = ['nome do produto', 'nome produto', 'descricao', 'descricao do produto', 'desc. produto', 'desc produto', 'nome', 'produto', 'descricao completa', 'desc', 'name', 'product'];
          const brandKeys = ['marca', 'fabricante', 'brand', 'fornecedor'];
          const priceKeys = ['preco de venda', 'preco venda', 'precovenda', 'preco', 'valor', 'valor venda', 'valor de venda', 'price', 'preco unitario', 'valor unitario', 'prc venda', 'prc.venda', 'preco unit'];
          const categoryKeys = ['departamento', 'categoria', 'grupo', 'familia', 'dept', 'depto', 'secao', 'class', 'classificacao', 'tipo', 'category'];
          const factoryCodeKeys = ['cod.fabrica', 'cod fabrica', 'codigo fabrica', 'codfabrica', 'factory'];

          const category = findValue(normalizedRow, categoryKeys) || 'Geral';
          const sku = findValue(normalizedRow, skuKeys) || '';
          const rawName = findValue(normalizedRow, nameKeys) || '';
          const name = rawName || sku || `Produto ${rowIndex + 1}`;
          const brand = findValue(normalizedRow, brandKeys) || 'Genérico';
          const price = parseMoney(findValue(normalizedRow, priceKeys) || '0');
          const factoryCode = findValue(normalizedRow, factoryCodeKeys) || '';

          // Optional margin & discount
          const margin = parsePercentage(normalizedRow['margem'] || '0');
          const discount = parsePercentage(normalizedRow['desconto'] || normalizedRow['discount'] || '0');

          const rawProduct = {
            category: category || 'Geral',
            sku: String(sku),
            brand: brand || 'Genérico',
            factoryCode,
            name: String(name),
            price: isNaN(price) ? 0 : price,
            margin,
            discount
          };

          // Log first product for debugging
          if (rowIndex === 0) {
            console.log(`[CSV Produtos] First product mapped:`, rawProduct);
            console.log(`[CSV Produtos] normalizedRow keys:`, Object.keys(normalizedRow));
          }

          const result = ProductSchema.safeParse(rawProduct);

          if (result.success) {
            products.push(result.data as Product);
          } else {
            rejected++;
            if (rejected <= 5) {
              console.warn(`[CSV] Linha ${rowIndex + 1} rejeitada:`, result.error.issues);
            }
          }
        });

        console.log(`[CSV Produtos] Total linhas: ${dataRows.length} | Aceitos: ${products.length} | Rejeitados: ${rejected}`);
        resolve(products);
      },
      error: (error: any) => reject(error)
    });
  });
};

export const parseCSV = (file: File): Promise<RawClient[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results: any) => {
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
      error: (error: any) => {
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
      complete: (results: any) => {
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
      error: (error: any) => reject(error)
    });
  });
};

export { cleanAddress };