import * as XLSX from 'xlsx';
import { RawClient, Product } from '../types';
import { parseHyperlink, cleanAddress } from './csvParser';

// Helper to normalize headers (remove accents, lowercase)
const normalizeHeader = (header: string): string => {
    return String(header)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .trim();
};

const parseMoney = (value: any): number => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    const clean = String(value).replace(/[R$\s.]/g, '').replace(',', '.');
    return parseFloat(clean) || 0;
};

const parsePercentage = (value: any): number => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    const clean = String(value).replace(/[%]/g, '').replace(',', '.');
    return parseFloat(clean) || 0;
};

export const parseExcel = (file: File): Promise<RawClient[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                if (!worksheet['!ref']) {
                    resolve([]);
                    return;
                }

                const range = XLSX.utils.decode_range(worksheet['!ref']);
                const normalizedData: RawClient[] = [];

                // 1. Identify Headers
                const headers: { index: number; name: string; normalized: string }[] = [];
                const R_header = range.s.r; // Assume first row is header

                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellAddress = XLSX.utils.encode_cell({ c: C, r: R_header });
                    const cell = worksheet[cellAddress];
                    if (cell && cell.v) {
                        const headerName = String(cell.v);
                        headers.push({
                            index: C,
                            name: headerName,
                            normalized: normalizeHeader(headerName)
                        });
                    }
                }

                // 2. Iterate Rows
                for (let R = R_header + 1; R <= range.e.r; ++R) {
                    const rowData: Record<string, any> = {};
                    let addressLink: string | undefined = undefined;

                    // Extract data for each column
                    headers.forEach(header => {
                        const cellAddress = XLSX.utils.encode_cell({ c: header.index, r: R });
                        const cell = worksheet[cellAddress];

                        if (cell) {
                            rowData[header.normalized] = cell.v;

                            // Check for Hyperlink in Address-related columns
                            if (
                                !addressLink &&
                                (header.normalized.includes('endereco') ||
                                    header.normalized.includes('logradouro') ||
                                    header.normalized.includes('localizacao') ||
                                    header.normalized === 'rua' ||
                                    header.normalized === 'mapa' ||
                                    header.normalized === 'link')
                            ) {
                                if (cell.l && cell.l.Target) {
                                    addressLink = cell.l.Target;
                                }
                            }
                        }
                    });

                    // Skip empty rows (check if essential keys are missing)
                    if (Object.keys(rowData).length === 0) continue;

                    // 3. Map to RawClient
                    const addressInput = rowData['endereco'] || rowData['logradouro'] || rowData['localizacao'] ||
                        rowData['endereco completo'] || rowData['rua'] || rowData['end'] || '';

                    const { address, link, lat, lng } = parseHyperlink(addressInput);

                    // Prioritize the extracted Excel Hyperlink if available
                    // If we have a direct range link (cell.l.Target), use that.
                    // Otherwise rely on text parsing.
                    const finalLink = addressLink || link;

                    // Note: If addressLink provides a direct Google Maps URL, we might want to 
                    // re-run extraction logic to get lat/lng from IT if 'lat'/'lng' are undefined.
                    // However, `parseHyperlink` already attempts to extract from text.
                    // If the text was just "Endereço", parseHyperlink won't find coords.
                    // But if `addressLink` is "https://maps.google.com/...", we can optionally extracting coords from it.
                    // For now, passing it as `GoogleMapsLink` is the critical part for `geminiService` to use it.

                    const companyName = rowData['razao social'] || rowData['cliente'] || rowData['nome fantasia'] ||
                        rowData['empresa'] || rowData['nome'] || rowData['nome cliente'] ||
                        rowData['parceiro'] || rowData['loja'] || '';

                    const ownerName = rowData['nome do proprietario'] || rowData['proprietario'] || rowData['dono'] ||
                        rowData['contato principal'] || rowData['responsavel'] || rowData['socio'] || '';

                    const contact = String(rowData['contato'] || rowData['telefone'] || rowData['celular'] ||
                        rowData['whatsapp'] || rowData['tel'] || rowData['fone'] || '');

                    // Only add if we have at least a Name or Address
                    if (companyName || address || addressInput) {
                        normalizedData.push({
                            companyName: companyName,
                            ownerName: ownerName,
                            phone: contact,
                            address: address, // The display address
                            googleMapsLink: finalLink,
                            latitude: lat,
                            longitude: lng
                        });
                    }
                }

                resolve(normalizedData);
            } catch (error) {
                console.error("Excel Parsing Error:", error);
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
    });
};

export const parseProductExcel = (file: File): Promise<Product[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                const products: Product[] = [];
                // For products, sheet_to_json is usually sufficient as we don't heavily rely on hyperlinks
                // But let's use it for simplicity unless we need specific cell metadata
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                jsonData.forEach((row: any) => {
                    const normalizedRow: Record<string, any> = {};
                    Object.keys(row).forEach(k => {
                        normalizedRow[normalizeHeader(k)] = row[k];
                    });

                    const sku = String(normalizedRow['numero do sku'] || normalizedRow['sku'] || '');
                    const brand = normalizedRow['marca'] || normalizedRow['fabricante'] || 'Genérico';
                    const factoryCode = String(normalizedRow['cod.fabrica'] || normalizedRow['cod fabrica'] || normalizedRow['codigo fabrica'] || '');
                    const name = normalizedRow['descricao'] || normalizedRow['nome'] || normalizedRow['produto'] || '';
                    const price = parseMoney(normalizedRow['preco de venda'] || normalizedRow['preco'] || 0);

                    const category = normalizedRow['categoria'] || brand || 'Geral';
                    const margin = parsePercentage(normalizedRow['margem'] || 0);
                    const discount = parsePercentage(normalizedRow['desconto'] || normalizedRow['discount'] || 0);

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
            } catch (error) {
                console.error("Product Excel Parsing Error:", error);
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
    });
};
