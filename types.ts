export interface RawClient {
  companyName: string;
  cnpj?: string;
  ownerName: string;
  phone: string;
  whatsapp?: string;
  address: string;
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  googleMapsLink?: string;
  latitude?: number;
  longitude?: number;
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
  sourceFileId?: string; // ID of the file this product was imported from
  purchaseDate?: string; // Optional: Date of purchase
}

export interface PurchaseRecord extends Product {
  purchaseDate: string; // ISO or YYYY-MM-DD
  quantity?: number;
  totalValue?: number;
  salespersonId?: string; // For tracking who sold this
}

export interface EnrichedClient {
  id: string;
  salespersonId: string; // Links client to specific seller
  companyName: string;
  ownerName: string;
  contact: string;
  whatsapp?: string;
  originalAddress: string;
  cleanAddress: string;
  cnpj?: string;
  mainCnae?: string;
  secondaryCnaes?: string[];
  category: string[];
  region: 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul' | 'Indefinido';
  state: string;
  city: string;
  district?: string;
  zip?: string;
  country?: string;
  lat: number;
  lng: number;
  googleMapsUri?: string;
  purchasedProducts?: PurchaseRecord[]; // History of products bought by this client
  sourceFileId?: string; // ID of the file this client was imported from
  plusCode?: string; // Google Plus Code for precise location
}

// Roles com hierarquia (1 = maior poder)
export type UserRole =
  | 'admin_dev'        // Nível 1: Deus
  | 'admin_general'    // Nível 2: Admin
  | 'general_manager'  // Nível 3: Gerente Geral
  | 'sales_manager'    // Nível 4: Gerente de Vendas
  | 'sales_supervisor' // Nível 5: Supervisor
  | 'sales_internal'   // Nível 6: Vendedor Interno
  | 'sales_external'   // Nível 7: Vendedor Externo
  | 'admin'            // Legacy (será tratado como admin_dev)
  | 'salesperson';     // Legacy (será tratado como sales_external)

export type SalesCategory = 'Externo' | 'Interno' | 'Mercado Livre' | 'N/A';

export type UserStatus = 'Online' | 'Ocupado' | 'Offline';

export interface AppUser {
  id: string;
  name: string;
  username: string;
  email?: string; // Added for recovery flow
  photoURL?: string; // Base64 profile picture
  role: UserRole;
  password?: string; // For mock auth management
  salesCategory?: SalesCategory;
  color?: string; // Color for map pins and UI identification
  status?: UserStatus;
}

export interface UploadedFile {
  id: string;
  fileName: string;
  uploadDate: string; // ISO String
  salespersonId: string;
  salespersonName: string;
  type: 'clients' | 'products' | 'purchases';
  itemCount: number;
  status: 'processing' | 'completed' | 'error';
  errorMessage?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string; // ISO String
  read: boolean;
}

export interface ChatConversation {
  userId: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
}

export interface SystemLog {
  id: string;
  timestamp: string; // ISO String
  userId: string;
  userName: string;
  userRole: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'ERROR' | 'SYNC' | 'CHAT' | 'ACCESS' | 'VIEW' | 'CLICK';
  category: 'CLIENTS' | 'PRODUCTS' | 'USERS' | 'SYSTEM' | 'CHAT' | 'AUTH' | 'NAVIGATION' | 'INTERACTION';
  details: string;
  metadata?: {
    duration?: number; // Duration in seconds
    elementId?: string; // ID for clicks
    path?: string; // Path for navigation
    [key: string]: any;
  };
}

export interface ProcessingState {
  isActive: boolean;
  total: number;
  current: number;
  fileName: string;
  ownerName: string;
  status: 'reading' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
}
