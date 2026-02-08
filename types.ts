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
  sourceFileId?: string; // ID of the file this client was imported from
}

export type UserRole = 'admin' | 'salesperson';
export type SalesCategory = 'Externo' | 'Interno' | 'Mercado Livre' | 'N/A';

export interface AppUser {
  id: string;
  name: string;
  username: string;
  email?: string; // Added for recovery flow
  role: UserRole;
  password?: string; // For mock auth management
  salesCategory?: SalesCategory;
  color?: string; // Color for map pins and UI identification
}

export interface UploadedFile {
  id: string;
  fileName: string;
  uploadDate: string; // ISO String
  salespersonId: string;
  salespersonName: string;
  type: 'clients' | 'products';
  itemCount: number;
  status: 'processing' | 'completed' | 'error';
  errorMessage?: string;
}

