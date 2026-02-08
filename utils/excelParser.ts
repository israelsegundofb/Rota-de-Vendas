import * as XLSX from 'xlsx';
import { RawClient, Product } from '../types';
import { parseHyperlink, cleanAddress } from './csvParser';

// Helper to normalize headers (remove accents, lowercase) - duplicated from csvParser to avoid circular dep if refactoring is messy, 
// or optimally we should export it from a shared util. For now, local is fine.
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

                // Convert to JSON with raw values
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                const normalizedData: RawClient[] = [];

                jsonData.forEach((row: any) => {
                    const normalizedRow: Record<string, any> = {};
                    Object.keys(row).forEach(key => {
                        normalizedRow[normalizeHeader(key)] = row[key];
                    });

                    // Parse hyperlink if present in address col
                    const addressInput = normalizedRow['endereco'] || normalizedRow['logradouro'] || normalizedRow['localizacao'] ||
                        normalizedRow['endereco completo'] || normalizedRow['rua'] || normalizedRow['end'] || '';

                    const { address, link, lat, lng } = parseHyperlink(addressInput);

                    // Robust Header Finding
                    const companyName = normalizedRow['razao social'] || normalizedRow['cliente'] || normalizedRow['nome fantasia'] ||
                        normalizedRow['empresa'] || normalizedRow['nome'] || normalizedRow['nome cliente'] ||
                        normalizedRow['parceiro'] || normalizedRow['loja'] || '';

                    const ownerName = normalizedRow['nome do proprietario'] || normalizedRow['proprietario'] || normalizedRow['dono'] ||
                        normalizedRow['contato principal'] || normalizedRow['responsavel'] || normalizedRow['socio'] || '';

                    const contact = String(normalizedRow['contato'] || normalizedRow['telefone'] || normalizedRow['celular'] ||
                        normalizedRow['whatsapp'] || normalizedRow['tel'] || normalizedRow['fone'] || '');

                    normalizedData.push({
                        'Razão Social': companyName,
                        'Nome do Proprietário': ownerName,
                        'Contato': contact,
                        'Endereço': address,
                        'GoogleMapsLink': link,
                        'extractedLat': lat,
                        'extractedLng': lng
                    });
                });

                resolve(normalizedData);
            } catch (error) {
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

                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                const products: Product[] = [];

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
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
    });
};
