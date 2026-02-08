export interface RawClient {
  'Razão Social': string;
  'Nome do Proprietário': string;
  'Contato': string;
  'Endereço': string;
  'GoogleMapsLink'?: string; // Extracted from =HYPERLINK if present
  'extractedLat'?: number;
  'extractedLng'?: number;
}

export interface Product {
  category: string; // Used for grouping/filtering logic (can default to Brand or General)
  sku: string;      // Número do SKU
  brand: string;    // Marca
  factoryCode: string; // Cód.Fábrica
  name: string;     // Descrição
  price: number;    // Preço de Venda
  margin?: number;  // Optional
  discount?: number; // Optional: Discount percentage or value
}

export interface EnrichedClient {
  id: string;
  salespersonId: string; // Links client to specific seller
  companyName: string;
  ownerName: string;
  contact: string;
  originalAddress: string;
  cleanAddress: string;
  category: string[]; // Changed from string to string[] for multiple segments
  region: 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul' | 'Indefinido';
  state: string;
  city: string;
  lat: number;
  lng: number;
  googleMapsUri?: string;
  purchasedProducts?: Product[]; // History of products bought by this client
}

export type UserRole = 'admin' | 'salesperson';
export type SalesCategory = 'Externo' | 'Interno' | 'Mercado Livre' | 'N/A';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string; // Added for recovery flow
  role: UserRole;
  password?: string; // For mock auth management
  salesCategory?: SalesCategory;
}

export const REGIONS = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

export const CATEGORIES = [
  'Todos',
  'Som e Vídeo',
  'Pneus e Rodas',
  'Peças e Mecânica',
  'Acessórios',
  'Vidros e Películas',
  'Outros'
];

export const UF_TO_REGION: Record<string, string> = {
  'AC': 'Norte', 'AL': 'Nordeste', 'AP': 'Norte', 'AM': 'Norte', 'BA': 'Nordeste',
  'CE': 'Nordeste', 'DF': 'Centro-Oeste', 'ES': 'Sudeste', 'GO': 'Centro-Oeste',
  'MA': 'Nordeste', 'MT': 'Centro-Oeste', 'MS': 'Centro-Oeste', 'MG': 'Sudeste',
  'PA': 'Norte', 'PB': 'Nordeste', 'PR': 'Sul', 'PE': 'Nordeste', 'PI': 'Nordeste',
  'RJ': 'Sudeste', 'RN': 'Nordeste', 'RS': 'Sul', 'RO': 'Norte', 'RR': 'Norte',
  'SC': 'Sul', 'SP': 'Sudeste', 'SE': 'Nordeste', 'TO': 'Norte'
};

export const getRegionByUF = (uf: string): 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul' | 'Indefinido' => {
  const normalizedUF = uf.toUpperCase().trim();
  return (UF_TO_REGION[normalizedUF] as any) || 'Indefinido';
};