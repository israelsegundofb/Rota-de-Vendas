import * as XLSX from 'xlsx';
import { RawClient, Product } from '../types';
import { parseHyperlink } from './csvParser';

// Helper to normalize headers (remove accents, lowercase)
const normalizeHeader = (header: string): string => {
    return String(header)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .trim();
};

const parseMoney = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    const str = String(value).trim();
    if (!str) return 0;
    const clean = str.replace(/[R$\s.]/g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
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
                                    header.normalized.includes('comercial') ||
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
                    const addressInput = rowData['endereco completo'] || rowData['endereco'] || rowData['endereco comercial numero'] || rowData['endereco comercial'] || rowData['logradouro'] || rowData['localizacao'] ||
                        rowData['rua'] || rowData['end'] || '';

                    const parsed = parseHyperlink(addressInput);
                    const address = parsed.address;
                    const link = parsed.link;
                    let lat = parsed.lat;
                    let lng = parsed.lng;

                    // Prioritize the extracted Excel Hyperlink if available (from cell.l.Target)
                    let finalLink = addressLink || link;

                    // Explicit Link Column Check (New Feature for Excel)
                    const explicitLinkInput = rowData['link'] || rowData['mapa'] || rowData['google maps'] || rowData['url'] || rowData['maps'] || rowData['coordenadas'] || rowData['geolocalizacao'];
                    let explicitLinkTarget: string | undefined;

                    // Also check if the *Exlicit Link Column* has a cell hyperlink target
                    headers.forEach(h => {
                        if (['link', 'mapa', 'google maps', 'url', 'maps', 'coordenadas', 'geolocalizacao'].includes(h.normalized)) {
                            const cellAddress = XLSX.utils.encode_cell({ c: h.index, r: R });
                            const cell = worksheet[cellAddress];
                            if (cell && cell.l && cell.l.Target) {
                                explicitLinkTarget = cell.l.Target;
                            }
                        }
                    });

                    // Use explicit input text or target
                    const linkInputToParse = explicitLinkTarget || explicitLinkInput;

                    if (linkInputToParse) {
                        const linkData = parseHyperlink(linkInputToParse);
                        if (linkData.link) finalLink = linkData.link;
                        if (linkData.lat) lat = linkData.lat;
                        if (linkData.lng) lng = linkData.lng;
                    }

                    // Note: If addressLink provides a direct Google Maps URL, we might want to 
                    // re-run extraction logic to get lat/lng from IT if 'lat'/'lng' are undefined.

                    let companyName = rowData['razao social / nome'] || rowData['razao social'] || rowData['cliente'] || rowData['empresa'] || rowData['nome comercial'] || rowData['nome'] || rowData['nome cliente'] ||
                        rowData['parceiro'] || rowData['loja'] || '';

                    const nomeFantasia = rowData['nome fantasia'] || rowData['fantasia'] || '';
                    if (companyName && nomeFantasia && companyName !== nomeFantasia) {
                        companyName = `${companyName} (${nomeFantasia})`;
                    } else if (!companyName) {
                        companyName = nomeFantasia;
                    }

                    const cnpj = rowData['cnpj - cpf'] || rowData['cnpj'] || rowData['cpf/cnpj'] || rowData['cpf'] || rowData['taxid'] || rowData['inscricao'] || '';

                    const ownerName = rowData['nome do cliente'] || rowData['nome do proprietario'] || rowData['proprietario'] || rowData['dono'] ||
                        rowData['contato principal'] || rowData['responsavel'] || rowData['socio'] || '';

                    const contact = String(rowData['telefone comercial'] || rowData['pais telefone comercial'] || rowData['contato'] || rowData['telefone'] || rowData['celular'] ||
                        rowData['tel'] || rowData['fone'] || '');

                    const whatsapp = String(rowData['whatsapp'] || rowData['whats'] || '');

                    const street = rowData['rua'] || rowData['logradouro'] || '';
                    const number = rowData['numero'] || rowData['num'] || '';
                    const district = rowData['bairro'] || rowData['distrito'] || '';
                    const city = rowData['nome da cidade'] || rowData['cidade'] || rowData['municipio'] || '';
                    const state = rowData['estado'] || rowData['uf'] || '';
                    const zip = rowData['cep'] || rowData['codigo postal'] || '';
                    const country = rowData['descricao do pais'] || rowData['pais'] || '';

                    // Only add if we have at least a Name, CNPJ, or Address
                    if (companyName || cnpj || address || addressInput) {
                        normalizedData.push({
                            companyName: companyName,
                            cnpj: cnpj,
                            ownerName: ownerName,
                            phone: contact,
                            whatsapp: whatsapp,
                            address: address || street, // Default to street if mapped granularly
                            street: street,
                            number: number,
                            district: district,
                            city: city,
                            state: state,
                            zip: zip,
                            country: country,
                            googleMapsLink: finalLink,
                            latitude: lat,
                            longitude: lng,
                            salespersonName: rowData['vendedor responsavel'] || rowData['vendedor'] || ''
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

                // Convert to array of arrays to scan for headers
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                if (rows.length === 0) {
                    resolve([]);
                    return;
                }

                // 1. Find Header Row (Scan first 20 rows)
                let headerRowIndex = -1;
                const PRODUCT_KEYWORDS = ['sku', 'codigo', 'referencia', 'produto', 'descricao', 'nome', 'preco', 'valor', 'cod.prod'];

                for (let i = 0; i < Math.min(rows.length, 20); i++) {
                    const rowValues = rows[i].map(val => normalizeHeader(String(val)));
                    // Check if row has at least 2 consecutive product-related keywords or just "sku" + "name"
                    const matchCount = rowValues.filter(h => PRODUCT_KEYWORDS.some(k => h.includes(k))).length;

                    if (matchCount >= 2 || rowValues.includes('sku') || rowValues.includes('cod.prod')) {
                        headerRowIndex = i;
                        break;
                    }
                }

                if (headerRowIndex === -1) {
                    console.warn('[Excel] Could not detect header row. assuming row 0.');
                    headerRowIndex = 0;
                }

                const headers = rows[headerRowIndex].map(h => normalizeHeader(String(h)));
                const dataRows = rows.slice(headerRowIndex + 1);
                const products: Product[] = [];

                console.log(`[Excel Produtos] Header detected at row ${headerRowIndex}:`, headers);

                // Detailed finding logic similar to CSV parser
                const skuKeys = ['cod.prod / sku', 'cod.prod/sku', 'codprod/sku', 'codprod / sku', 'cod.prod', 'codprod', 'cod prod', 'sku', 'codigo sku', 'numero do sku', 'codigo', 'codigo produto', 'cod produto', 'id', 'ref', 'referencia', 'cod', 'codigo do produto', 'item'];
                const nameKeys = ['nome do produto', 'nome produto', 'descricao', 'descricao do produto', 'desc. produto', 'desc produto', 'nome', 'produto', 'descricao completa', 'desc', 'name', 'product'];
                const brandKeys = ['marca', 'fabricante', 'brand', 'fornecedor'];
                const priceKeys = ['preco de venda', 'preco venda', 'precovenda', 'preco', 'valor', 'valor venda', 'valor de venda', 'price', 'preco unitario', 'valor unitario', 'prc venda', 'prc.venda'];
                const categoryKeys = ['departamento', 'categoria', 'grupo', 'familia', 'dept', 'depto', 'secao', 'class', 'classificacao'];
                const factoryCodeKeys = ['cod.fabrica', 'cod fabrica', 'codigo fabrica', 'codfabrica', 'factory'];

                const skuIdx = headers.findIndex(h => skuKeys.some(k => h.includes(k) || h === k));
                const nameIdx = headers.findIndex(h => nameKeys.some(k => h.includes(k) || h === k));
                const brandIdx = headers.findIndex(h => brandKeys.some(k => h.includes(k) || h === k));
                const priceIdx = headers.findIndex(h => priceKeys.some(k => h.includes(k) || h === k));
                const categoryIdx = headers.findIndex(h => categoryKeys.some(k => h.includes(k) || h === k));
                const factoryCodeIdx = headers.findIndex(h => factoryCodeKeys.some(k => h.includes(k) || h === k));
                const marginIdx = headers.findIndex(h => h.includes('margem') || h === 'margin');
                const discountIdx = headers.findIndex(h => h.includes('desconto') || h.includes('discount'));

                dataRows.forEach((row, rowIndex) => {
                    const skuVal = skuIdx !== -1 ? row[skuIdx] : undefined;
                    const nameVal = nameIdx !== -1 ? row[nameIdx] : undefined;
                    const brandVal = brandIdx !== -1 ? row[brandIdx] : undefined;
                    const priceVal = priceIdx !== -1 ? row[priceIdx] : undefined;
                    const categoryVal = categoryIdx !== -1 ? row[categoryIdx] : undefined;
                    const factoryCodeVal = factoryCodeIdx !== -1 ? row[factoryCodeIdx] : undefined;
                    const marginVal = marginIdx !== -1 ? row[marginIdx] : undefined;
                    const discountVal = discountIdx !== -1 ? row[discountIdx] : undefined;

                    const category = String(categoryVal || 'Geral');
                    const sku = String(skuVal || '');
                    const name = String(nameVal || '');
                    const brand = String(brandVal || 'Genérico');

                    const priceRaw = priceVal;
                    const price = parseMoney(priceRaw);

                    const factoryCode = String(factoryCodeVal || '');

                    const margin = parsePercentage(marginVal || 0);
                    const discount = parsePercentage(discountVal || 0);

                    // Only add if it has at least SKU or Name (and ideally SKU is critical for us now)
                    if (sku || name) {
                        // Fallback for name if missing but SKU exists
                        const finalName = name || sku;
                        // Fallback for SKU if missing (Critical: User should know, but we generate one to avoid overwriting all as "prod_")
                        const finalSku = sku || `GEN-${Math.floor(Math.random() * 1000000)}`;

                        if (!sku) {
                            console.warn(`[Excel] Row ${rowIndex + headerRowIndex + 2} missing SKU. Generated: ${finalSku}`);
                        }

                        products.push({
                            category,
                            sku: finalSku,
                            brand,
                            factoryCode,
                            name: finalName,
                            price,
                            margin,
                            discount
                        });
                    }
                });

                console.log(`[Excel Produtos] Parsed ${products.length} products.`);
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
