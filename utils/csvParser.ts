import Papa from 'papaparse';
import { RawClient, Product } from '../types';

/**
 * Cleans the Excel HYPERLINK formula to extract the display address.
 * Formula format in CSV (raw): =HYPERLINK("url"; "ADDRESS")
 * Safely handles non-string inputs.
 */
const cleanAddress = (input: any): string => {
  if (input === null || input === undefined) return '';

  // Ensure we are working with a string. 
  // Crash Prevention: .match() fails on numbers (e.g. if address is just "123")
  const raw = String(input);

  // 1. Try to match the Excel HYPERLINK Label (last argument)
  // Format: =HYPERLINK("url"; "LABEL")

  const labelMatch = raw.match(/;\s*""([^""]+)""\)$/);
  if (labelMatch && labelMatch[1]) {
    return labelMatch[1].trim();
  }

  const simpleMatch = raw.match(/""([^""]+)""\)$/);
  if (simpleMatch && simpleMatch[1]) {
    return simpleMatch[1].trim();
  }

  // 2. Try to match ENCODEURL content if label extraction failed
  const encodeMatch = raw.match(/ENCODEURL\(""([^""]+)""\)/);
  if (encodeMatch && encodeMatch[1]) {
    return encodeMatch[1].trim();
  }

  // 3. Fallback for simple formula stripping
  if (raw.startsWith('=')) {
    return raw.replace(/[="();]/g, '').trim();
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

          // Map to strict RawClient Interface using loose matching
          // This handles: "Razão Social", "razao social", "RAZAO SOCIAL", "Cliente", etc.
          normalizedData.push({
            'Razão Social': map['razao social'] || map['cliente'] || map['nome fantasia'] || map['empresa'] || '',
            'Nome do Proprietário': map['nome do proprietario'] || map['proprietario'] || map['dono'] || map['contato principal'] || '',
            'Contato': map['contato'] || map['telefone'] || map['celular'] || map['whatsapp'] || '',
            'Endereço': map['endereco'] || map['logradouro'] || map['localizacao'] || '',
            'googleMapsLink': map['endereco'] || '' // Store raw address formula as link source potentially
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