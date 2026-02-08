import React, { useState, useMemo, useEffect } from 'react';
import { FileUp, Map as MapIcon, Filter, LayoutDashboard, Table as TableIcon, LogOut, ChevronRight, Loader2, AlertCircle, Key, Users as UsersIcon, Shield, Lock, ShoppingBag, X, CheckCircle, Search, Layers, Package, Download, Briefcase, User as UserIcon, Trash2, Database, Upload, Settings, Menu, Save, Cloud } from 'lucide-react';
import { RawClient, EnrichedClient, Product, UploadedFile } from './types';
import type { AppUser } from './types';
import { CATEGORIES, REGIONS, getRegionByUF } from './utils/constants';
import { parseCSV, parseProductCSV } from './utils/csvParser';
import { parseExcel, parseProductExcel } from './utils/excelParser';
import { processClientsWithAI } from './services/geminiService';
import { geocodeAddress } from './services/geocodingService';
import { initializeFirebase, saveToCloud, loadFromCloud, isFirebaseInitialized, subscribeToCloudChanges } from './services/firebaseService';
import ClientMap from './components/ClientMap';
import ClientList from './components/ClientList';
import LoginScreen from './components/LoginScreen';
import AddClientModal from './components/AddClientModal';
import EditClientModal from './components/EditClientModal';
import AdminUserManagement from './components/AdminUserManagement';
import AdminCategoryManagement from './components/AdminCategoryManagement';
import AdminProductManagement from './components/AdminProductManagement';
import CloudConfigModal from './components/CloudConfigModal';
import CookieConsent from './components/CookieConsent';
import AdminFileManager from './components/AdminFileManager';


// Initial Mock Data
const INITIAL_USERS: AppUser[] = [
  { id: 'admin', name: 'Administrador Geral', username: 'admin', email: 'admin@vendas.ai', role: 'admin', password: '123', salesCategory: 'N/A', color: '#6B7280' },
  { id: '1', name: 'João Silva (Vendedor A)', username: 'vendedor_a', email: 'joao.silva@vendas.ai', role: 'salesperson', password: '123', salesCategory: 'Externo', color: '#EF4444' }, // Red
  { id: '2', name: 'Maria Santos (Vendedor B)', username: 'vendedor_b', email: 'maria.santos@vendas.ai', role: 'salesperson', password: '123', salesCategory: 'Interno', color: '#3B82F6' }, // Blue
];

interface ProcessingState {
  isActive: boolean;
  total: number;
  current: number;
  fileName: string;
  ownerName: string;
  status: 'reading' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
}

const App: React.FC = () => {
  // Global App State (Simulating DB with LocalStorage Persistence)
  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem('vendas_ai_users');
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch (e) {
      console.error("Failed to load users from storage", e);
      return INITIAL_USERS;
    }
  });

  const [masterClientList, setMasterClientList] = useState<EnrichedClient[]>([]);
  // Load from LocalStorage
  // Init Data with Cloud Fallback
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vendas_ai_categories');
      return saved ? JSON.parse(saved) : CATEGORIES.filter(c => c !== 'Todos');
    } catch (e) {
      return CATEGORIES.filter(c => c !== 'Todos');
    }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('vendas_ai_products');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load products from storage", e);
      return [];
    }
  });

  // Auth State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  // Background Processing State
  const [procState, setProcState] = useState<ProcessingState>({
    isActive: false,
    total: 0,
    current: 0,
    fileName: '',
    ownerName: '',
    status: 'processing'
  });

  // API Key State
  // Default to the provided key if process.env.API_KEY is missing
  const [activeApiKey, setActiveApiKey] = useState<string>(process.env.API_KEY || "AIzaSyDa-6pfscyrTFV5VpzyRRNxudBrsNVLppM");
  // Version tracker to force remount of Map component on key update attempts
  const [keyVersion, setKeyVersion] = useState(0);

  // View State
  const [activeView, setActiveView] = useState<'map' | 'table' | 'admin_users' | 'admin_categories' | 'admin_products' | 'admin_files'>('map');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCloudConfigOpen, setIsCloudConfigOpen] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [selectedClient, setSelectedClient] = useState<EnrichedClient | undefined>(undefined);
  // Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRegion, setFilterRegion] = useState<string>('Todas');
  const [filterState, setFilterState] = useState<string>('Todos');
  const [filterCity, setFilterCity] = useState<string>('Todas');
  const [filterCategory, setFilterCategory] = useState<string>('Todos');
  const [filterSalespersonId, setFilterSalespersonId] = useState<string>('Todos');
  const [filterSalesCategory, setFilterSalesCategory] = useState<string>('Todos'); // New Sales Category Filter

  // Product Filters
  const [filterProductCategory, setFilterProductCategory] = useState<string>('Todos');
  const [searchProductQuery, setSearchProductQuery] = useState<string>('');

  // Admin Upload State
  const [targetUploadUserId, setTargetUploadUserId] = useState<string>('');

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // File Management State
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(() => {
    try {
      const saved = localStorage.getItem('vendas_ai_files');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Persist Uploaded Files
  useEffect(() => {
    try {
      localStorage.setItem('vendas_ai_files', JSON.stringify(uploadedFiles));
    } catch (e) {
      console.error("Failed to save uploaded files", e);
    }
  }, [uploadedFiles]);

  useEffect(() => {
    const initData = async () => {
      // 1. Try to init Firebase
      const connected = await initializeFirebase();
      setIsFirebaseConnected(connected);

      // 2. If connected, try to load from cloud
      if (connected) {
        console.log("Loading data from Cloud...");
        const cloudData = await loadFromCloud();
        if (cloudData) {
          console.log("Cloud data found.", cloudData);
          if (cloudData.clients) setMasterClientList(cloudData.clients);
          if (cloudData.products) setProducts(cloudData.products);
          if (cloudData.categories) setCategories(cloudData.categories);
          if (cloudData.users) setUsers(cloudData.users);
          return; // Stop here, use cloud data
        }
      }

      // 3. Fallback to LocalStorage if no Cloud data or not connected
      console.log("Loading data from LocalStorage...");
      const savedClients = localStorage.getItem('vendas_ai_clients');
      if (savedClients) {
        try {
          const parsed = JSON.parse(savedClients);
          // MIGRATION: Ensure category is string[]
          setMasterClientList(parsed.map((c: any) => ({
            ...c,
            category: Array.isArray(c.category)
              ? c.category
              : (typeof c.category === 'string' ? [c.category] : ['Outros']),
            region: getRegionByUF(c.state) // Force update region
          })));
        } catch (e) { console.error(e); }
      }

      const savedUsers = localStorage.getItem('vendas_ai_users');
      if (savedUsers) setUsers(JSON.parse(savedUsers));

      const savedCategories = localStorage.getItem('vendas_ai_categories');
      if (savedCategories) setCategories(JSON.parse(savedCategories));

      const savedProducts = localStorage.getItem('vendas_ai_products');
      if (savedProducts) setProducts(JSON.parse(savedProducts));
    };

    initData();
  }, []);

  // Save changes to Cloud whenever critical data changes (Debounced ideally, but direct for MVP)
  useEffect(() => {
    if (isFirebaseConnected && masterClientList.length > 0) {
      const timeout = setTimeout(() => {
        saveToCloud(masterClientList, products, categories, users)
          .catch(err => console.error("Auto-save failed", err));
      }, 2000); // 2s debounce
      return () => clearTimeout(timeout);
    }
  }, [masterClientList, products, categories, users, isFirebaseConnected]);

  useEffect(() => {
    // If env var exists, it takes precedence
    if (process.env.API_KEY) {
      setActiveApiKey(process.env.API_KEY);
    }
  }, []);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('vendas_ai_clients', JSON.stringify(masterClientList));
  }, [masterClientList]);

  useEffect(() => {
    localStorage.setItem('vendas_ai_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('vendas_ai_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('vendas_ai_users', JSON.stringify(users));
  }, [users]);

  // --- Handlers ---
  const handleAddUser = (newUser: User) => {
    setUsers([...users, newUser]);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleDeleteUser = (userId: string) => {
    // Update uploaded files from this user to show as orphaned
    setUploadedFiles(prev => prev.map(f =>
      f.salespersonId === userId
        ? { ...f, salespersonId: '', salespersonName: 'None' }
        : f
    ));

    // Remove the user
    setUsers(users.filter(u => u.id !== userId));
  };

  const handleAddCategory = (newCategory: string) => {
    if (!categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
    }
  };

  const handleDeleteCategory = (category: string) => {
    setCategories(categories.filter(c => c !== category));
  };

  const handleUploadProducts = (newProducts: Product[]) => {
    setProducts(prev => {
      const updated = [...prev, ...newProducts];
      // Distribute products to clients immediately for demo purposes
      distributeProductsToClients(masterClientList, updated);
      return updated;
    });
  };

  const handleSaveProducts = (updatedProducts: Product[]) => {
    setProducts(updatedProducts);
    // Optionally redistribute if products logic changes significantly, though strictly not needed for simple price updates
    // distributeProductsToClients(masterClientList, updatedProducts);
  };

  const handleClearProducts = () => {
    setProducts([]);
    // Remove purchase history from clients
    setMasterClientList(prev => prev.map(c => ({ ...c, purchasedProducts: [] })));
  };

  const handleUpdateClient = async (updatedClient: EnrichedClient) => {
    // Check if address changed to re-geocode
    const original = masterClientList.find(c => c.id === updatedClient.id);
    let finalClient = { ...updatedClient };

    if (original && original.cleanAddress !== updatedClient.cleanAddress) {
      try {
        const geoResult = await geocodeAddress(updatedClient.cleanAddress, activeApiKey || '');
        if (geoResult) {
          finalClient.lat = geoResult.lat;
          finalClient.lng = geoResult.lng;
          if (geoResult.formattedAddress) finalClient.cleanAddress = geoResult.formattedAddress;
        }
      } catch (e) {
        console.error("Failed to re-geocode updated client:", e);
      }
    }

    setMasterClientList(prev => prev.map(c => c.id === finalClient.id ? finalClient : c));
  };

  const handleAddClient = async (newClient: EnrichedClient) => {
    // 1. Geocode Address if coordinates are missing
    let finalClient = { ...newClient };

    if ((!finalClient.lat || !finalClient.lng) && finalClient.cleanAddress) {
      try {
        const geoResult = await geocodeAddress(finalClient.cleanAddress, activeApiKey || '');
        if (geoResult) {
          finalClient.lat = geoResult.lat;
          finalClient.lng = geoResult.lng;
          if (geoResult.formattedAddress) finalClient.cleanAddress = geoResult.formattedAddress;
        }
      } catch (e) {
        console.error("Failed to geocode new client:", e);
      }
    }

    // 2. Add to list
    setMasterClientList(prev => [...prev, finalClient]);

    // 3. Scroll to bottom
    setTimeout(() => {
      const listContainer = document.querySelector('.overflow-y-auto');
      if (listContainer) {
        listContainer.scrollTop = listContainer.scrollHeight;
      }
    }, 100);
  };

  const handleClearClients = () => {
    let targetId: string | undefined;
    let targetName = "TODOS";

    // Determine context for granular clear
    if (currentUser?.role === 'admin') {
      if (filterSalespersonId !== 'Todos') {
        targetId = filterSalespersonId;
        const u = users.find(u => u.id === targetId);
        targetName = u?.name || 'Desconhecido';
      } else if (targetUploadUserId) {
        targetId = targetUploadUserId;
        const u = users.find(u => u.id === targetId);
        targetName = u?.name || 'Desconhecido';
      }
    } else if (currentUser?.role === 'salesperson') {
      // Salesperson can only clear their own? Or system policy?
      // Let's assume for now they clear their own view, which is effectively "their" data if segmented.
      // However, often local storage is shared. Let's ask confirmation.
      targetId = currentUser.id;
      targetName = currentUser.name;
    }

    const isPartial = !!targetId;

    const message = isPartial
      ? `⚠️ ATENÇÃO ⚠️\n\nDeseja remover APENAS os clientes de:\n\n👤 ${targetName}?\n\n(Os outros dados serão mantidos)`
      : `⚠️ AVISO CRÍTICO ⚠️\n\nTem certeza que deseja DELETAR TODOS os clientes do sistema?\nIsso removerá todo o histórico e limpará o cache local.\n\nEsta ação não pode ser desfeita.`;

    const confirmClear = window.confirm(message);

    if (confirmClear) {
      if (isPartial && targetId) {
        setMasterClientList(prev => prev.filter(c => c.salespersonId !== targetId));
        alert(`Dados de ${targetName} removidos com sucesso!`);
      } else {
        setMasterClientList([]);
        localStorage.removeItem('vendas_ai_clients');
        alert("Base de dados limpa com sucesso!");
      }

      // Optional: Clear processing state if relevant
      setProcState({
        isActive: false, total: 0, current: 0, fileName: '', ownerName: '', status: 'processing'
      });
    }
  };

  // Simulate Sales Logic
  const distributeProductsToClients = (clients: EnrichedClient[], allProducts: Product[]) => {
    if (allProducts.length === 0) return;

    const updatedClients = clients.map(client => {
      // If client already has products, keep them unless we want to refresh
      if (client.purchasedProducts && client.purchasedProducts.length > 0) return client;

      // Find products matching client category
      let eligibleProducts = allProducts.filter(p =>
        client.category.some(cat =>
          p.category.toLowerCase().includes(cat.toLowerCase()) ||
          cat.toLowerCase().includes(p.category.toLowerCase())
        )
      );

      // Fallback if no category match
      if (eligibleProducts.length === 0) {
        eligibleProducts = allProducts;
      }

      // Randomly assign 1-5 products
      const numProducts = Math.floor(Math.random() * 5) + 1;
      const shuffled = [...eligibleProducts].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, numProducts);

      return { ...client, purchasedProducts: selected };
    });

    setMasterClientList(updatedClients);
  };

  const handleInvalidKey = async () => {
    if ((window as any).aistudio) {
      try {
        await (window as any).aistudio.openSelectKey();
        // Update key from env after selection
        const newKey = process.env.API_KEY;
        if (newKey) {
          setActiveApiKey(newKey);
        } else {
          // If process.env not updated immediately, try to read it again or use current
          if (process.env.API_KEY) setActiveApiKey(process.env.API_KEY);
        }
        // Increment version to force remount of map even if key string is identical
        setKeyVersion(v => v + 1);
      } catch (e) { console.error(e); }
    } else {
      console.error("AI Studio environment not detected.");
    }
  };

  // --- Derived Data ---
  const visibleClients = useMemo(() => {
    if (!currentUser) return [];
    let baseList = [];
    if (currentUser.role === 'admin') {
      if (filterSalespersonId !== 'Todos') {
        baseList = masterClientList.filter(c => c.salespersonId === filterSalespersonId);
      } else {
        baseList = masterClientList;
      }
    } else {
      baseList = masterClientList.filter(c => c.salespersonId === currentUser.id);
    }
    return baseList;
  }, [currentUser, masterClientList, filterSalespersonId]);

  const filteredClients = useMemo(() => {
    return visibleClients.filter(c => {
      // General Filters
      const matchRegion = filterRegion === 'Todas' || c.region === filterRegion;
      const matchState = filterState === 'Todos' || c.state === filterState;
      const matchCity = filterCity === 'Todas' || c.city === filterCity;

      // DEBUG LOGGING
      // if (filterCategory !== 'Todos') console.log(`Checking ${c.companyName}`, c.category, filterCategory, c.category.includes(filterCategory));

      const matchCat = filterCategory === 'Todos' || (Array.isArray(c.category) && c.category.includes(filterCategory));

      // Sales Category Filter (Admin Only)
      let matchSalesCat = true;
      if (currentUser?.role === 'admin' && filterSalesCategory !== 'Todos') {
        const seller = users.find(u => u.id === c.salespersonId);
        if (!seller || seller.salesCategory !== filterSalesCategory) {
          matchSalesCat = false;
        }
      }

      // Text Search
      const query = searchQuery.toLowerCase();
      const matchSearch = searchQuery === '' ||
        c.companyName.toLowerCase().includes(query) ||
        (c.ownerName && c.ownerName.toLowerCase().includes(query));

      // Product Filters (Where items were sold)
      let matchProduct = true;
      const prodQuery = searchProductQuery.toLowerCase();

      if (filterProductCategory !== 'Todos' || prodQuery !== '') {
        // If filtering by product, client MUST have purchase history
        if (!c.purchasedProducts || c.purchasedProducts.length === 0) {
          matchProduct = false;
        } else {
          // Check Category (Brand often used as category in this context)
          const hasCat = filterProductCategory === 'Todos' || c.purchasedProducts.some(p => p.category === filterProductCategory);

          // Check SKU, Brand, Factory Code, Description (Name), or Price
          const hasMatch = prodQuery === '' || c.purchasedProducts.some(p =>
            p.name.toLowerCase().includes(prodQuery) ||
            p.sku.toLowerCase().includes(prodQuery) ||
            p.brand.toLowerCase().includes(prodQuery) ||
            p.factoryCode.toLowerCase().includes(prodQuery) ||
            p.price.toString().includes(prodQuery)
          );

          matchProduct = hasCat && hasMatch;
        }
      }

      return matchRegion && matchState && matchCity && matchCat && matchSearch && matchProduct && matchSalesCat;
    });
  }, [visibleClients, filterRegion, filterState, filterCity, filterCategory, searchQuery, filterProductCategory, searchProductQuery, filterSalesCategory, users, currentUser]);

  const productCategories = useMemo(() => {
    // Create unique list of categories (or brands if category absent)
    const cats = new Set(products.map(p => p.category));
    return Array.from(cats).sort();
  }, [products]);

  // Derived Geographic Filters - Drill Down Logic
  const availableStates = useMemo(() => {
    let base = visibleClients;
    // Strict filter: If region is selected, show states only in that region.
    if (filterRegion !== 'Todas') {
      base = base.filter(c => c.region === filterRegion);
    }
    const states = new Set(base.map(c => c.state).filter(Boolean));
    return Array.from(states).sort();
  }, [visibleClients, filterRegion]);

  const availableCities = useMemo(() => {
    let base = visibleClients;
    // Drill down: Filter by Region first (if selected)
    if (filterRegion !== 'Todas') {
      base = base.filter(c => c.region === filterRegion);
    }
    // Drill down: Filter by State (Must be selected to show cities effectively)
    if (filterState !== 'Todos') {
      base = base.filter(c => c.state === filterState);
    } else {
      // Optional: If no state selected, return empty or all cities? 
      // Returning empty encourages drill-down flow.
      return [];
    }
    const cities = new Set(base.map(c => c.city).filter(Boolean));
    return Array.from(cities).sort();
  }, [visibleClients, filterRegion, filterState]);

  // --- Actions ---
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setSearchQuery('');
    setFilterRegion('Todas');
    setFilterState('Todos');
    setFilterCity('Todas');
    setFilterSalespersonId('Todos');
    setFilterSalesCategory('Todos');
    setFilterSalesCategory('Todos');
    setActiveView('map');
    setIsMobileMenuOpen(false); // Close menu on login
    if (user.role === 'admin') {
      const firstSeller = users.find(u => u.role === 'salesperson');
      if (firstSeller) setTargetUploadUserId(firstSeller.id);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setFilterSalespersonId('Todos');
    setFilterSalesCategory('Todos');
  };

  const handleClientFileDirect = async (file: File, ownerId: string, ownerName: string) => {
    // CONFIRMATION ALERT (Only if called directly, but maybe we skip for direct calls if UI handles it? 
    // Let's keep it for safety or rely on caller? 
    // AdminFileManager might have its own confirm? No, it just calls onUpload.
    // Let's keep the confirm logic but maybe we need to check if it's already confirmed?
    // For now, let's keep it simple.

    if (masterClientList.length > 0) {
      const confirmUpdate = window.confirm(
        "O sistema já possui dados de clientes carregados.\n\n" +
        "Deseja ADICIONAR os novos dados à lista existente?\n" +
        "Clique em OK para continuar ou Cancelar para abortar.\n\n" +
        "Dica: Para substituir tudo, cancele e use o botão 'Limpar Base de Clientes' na aba de Admin."
      );
      if (!confirmUpdate) return;
    }

    // Generate File ID
    const fileId = crypto.randomUUID();

    // Initialize Background Process State
    setProcState({
      isActive: true,
      total: 0,
      current: 0,
      fileName: file.name,
      ownerName: ownerName,
      status: 'reading'
    });

    try {
      let rawData: any[] = [];
      const lowerName = file.name.toLowerCase();

      console.log(`Processing file: ${file.name}, Lower: ${lowerName}`); // DEBUG

      if (lowerName.endsWith('.csv')) {
        console.log('Selected Parser: CSV'); // DEBUG
        rawData = await parseCSV(file);
      } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        console.log('Selected Parser: Excel'); // DEBUG
        rawData = await parseExcel(file);
      } else {
        throw new Error("Formato não suportado. Use .csv, .xlsx ou .xls");
      }

      console.log('Parsed Items Count:', rawData.length); // DEBUG
      if (rawData.length > 0) console.log('Sample Parsed Item:', rawData[0]); // DEBUG

      if (rawData.length === 0) throw new Error("Arquivo vazio.");

      // Create and Save File Record
      const newFileRecord: UploadedFile = {
        id: fileId,
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        salespersonId: ownerId,
        salespersonName: ownerName,
        type: 'clients',
        itemCount: rawData.length,
        status: 'processing'
      };

      setUploadedFiles(prev => [newFileRecord, ...prev]);

      setProcState(prev => ({ ...prev, total: rawData.length, status: 'processing' }));

      const enrichedData = await processClientsWithAI(
        rawData,
        ownerId,
        activeApiKey,
        categories,
        (processed, total) => {
          setProcState(prev => ({ ...prev, current: processed, total: total }));
        }
      );

      // Tag clients with Source File ID
      const taggedData = enrichedData.map(c => ({
        ...c,
        sourceFileId: fileId
      }));

      // Update Master List - APPEND mode
      setMasterClientList(prev => {
        return [...prev, ...taggedData];
      });

      // We don't automatically switch filter here.

      setProcState(prev => ({ ...prev, status: 'completed' }));

      // Update file status to completed
      setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'completed' } : f));

      setTimeout(() => {
        setProcState(prev => prev.status === 'completed' ? { ...prev, isActive: false } : prev);
      }, 5000);

    } catch (err: any) {
      console.error(err);
      setProcState(prev => ({ ...prev, status: 'error', errorMessage: err.message || "Erro desconhecido" }));

      // Update file status to error instead of removing
      setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error', errorMessage: err.message || "Erro desconhecido" } : f));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    let ownerId = currentUser.id;
    let ownerName = currentUser.name;

    if (currentUser.role === 'admin') {
      if (!targetUploadUserId) {
        alert("Selecione um vendedor para atribuir esta planilha.");
        event.target.value = '';
        return;
      }
      ownerId = targetUploadUserId;
      const targetUser = users.find(u => u.id === targetUploadUserId);
      ownerName = targetUser?.name || 'Unknown';
    }

    await handleClientFileDirect(file, ownerId, ownerName);
    event.target.value = '';
  };


  const handleDeleteFile = (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (!file) return;

    if (!window.confirm(`Tem certeza que deseja excluir o arquivo "${file.fileName}"?\n\nIsso removerá todos os ${file.itemCount} registros associados.`)) {
      return;
    }

    if (file.type === 'clients') {
      setMasterClientList(prev => prev.filter(c => c.sourceFileId !== fileId));
    } else if (file.type === 'products') {
      setProducts(prev => prev.filter(p => p.sourceFileId !== fileId));
    }

    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    // alert("Arquivo e dados associados foram removidos.");
  };

  const handleReassignFileSalesperson = (fileId: string, newSalespersonId: string) => {
    // Find the target user
    const targetUser = users.find(u => u.id === newSalespersonId);
    const newSalespersonName = targetUser?.name || 'None';

    // Update the file record
    setUploadedFiles(prev => prev.map(f =>
      f.id === fileId
        ? { ...f, salespersonId: newSalespersonId, salespersonName: newSalespersonName }
        : f
    ));

    // Update all clients from this file to the new salesperson
    setMasterClientList(prev => prev.map(c =>
      c.sourceFileId === fileId
        ? { ...c, salespersonId: newSalespersonId }
        : c
    ));

    // Auto-navigate to map and apply filter
    if (newSalespersonId) {
      setActiveView('map');
      setFilterSalespersonId(newSalespersonId);
      alert(`Arquivo e ${filteredClients.filter(c => c.sourceFileId === fileId).length} clientes reatribuídos para: ${newSalespersonName}\n\nMapa filtrado automaticamente.`);
    } else {
      // Unassigned - show all
      setFilterSalespersonId('Todos');
      alert('Arquivo desmarcado. Clientes ficaram sem vendedor até que outro seja atribuído.');
    }
  };



  const handleProductFileUpload = async (file: File) => {
    // Generate File ID
    const fileId = crypto.randomUUID();

    setProcState({
      isActive: true, total: 0, current: 0, fileName: file.name, ownerName: 'Sistema', status: 'reading'
    });

    try {
      let newProducts: Product[] = [];
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith('.csv')) {
        newProducts = await parseProductCSV(file);
      } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        newProducts = await parseProductExcel(file);
      } else {
        throw new Error("Formato não suportado.");
      }

      if (newProducts.length === 0) throw new Error("Arquivo vazio.");

      // Attach Source File ID
      newProducts = newProducts.map(p => ({ ...p, sourceFileId: fileId }));

      // Create File Record
      const newFileRecord: UploadedFile = {
        id: fileId,
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        salespersonId: 'system', // Products are system-wide
        salespersonName: 'Catálogo Geral',
        type: 'products',
        itemCount: newProducts.length,
        status: 'completed'
      };

      setUploadedFiles(prev => [newFileRecord, ...prev]);

      // Update Products List
      handleUploadProducts(newProducts);

      // setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'completed' } : f));

      setProcState({ isActive: false, total: 0, current: 0, fileName: '', ownerName: '', status: 'completed' });
      alert(`${newProducts.length} produtos importados com sucesso.`);

    } catch (e: any) {
      console.error(e);
      setProcState(prev => ({ ...prev, status: 'error', errorMessage: e.message }));
      // Update file status to error instead of removing
      setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error', errorMessage: e.message } : f));
    }
  };


  if (!currentUser) {
    return <LoginScreen users={users} onLogin={handleLogin} />;
  }

  const isAdmin = currentUser.role === 'admin';
  const isProductFilterActive = filterProductCategory !== 'Todos' || searchProductQuery !== '';

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800 overflow-hidden relative">

      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div
          className="absolute inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          w-72 bg-surface-container-low text-on-surface shadow-elevation-2 z-30 
          fixed md:relative h-full transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          flex flex-col border-r border-outline-variant/30
        `}
      >
        <div className="p-6 border-b border-outline-variant/30 flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2 text-primary">
            <LayoutDashboard className="w-6 h-6" />
            Vendas A.I.
          </h1>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-on-surface-variant hover:text-primary"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-2">
          <p className="text-xs font-medium text-on-surface-variant/80 uppercase tracking-wider">
            {isAdmin ? 'Painel Administrativo' : 'Portal do Vendedor'}
          </p>
        </div>

        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className="bg-surface-container-highest rounded-2xl p-4 mb-6 border border-outline-variant/30 shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>
            <p className="text-xs text-on-surface-variant uppercase font-bold tracking-wider mb-2 relative z-10">Logado como</p>
            <div className="flex items-center gap-3 relative z-10">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md ${isAdmin ? 'bg-tertiary' : 'bg-secondary'}`}>
                {currentUser.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-on-surface truncate">{currentUser.name}</p>
                <p className="text-xs text-on-surface-variant truncate opacity-80">{currentUser.email}</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1 mb-8">
            <p className="px-3 text-xs font-bold text-on-surface-variant/60 uppercase mb-3 tracking-wider">Visualização</p>
            <button
              onClick={() => { setActiveView('map'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'map'
                ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
                : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
                }`}
            >
              <MapIcon className={`w-5 h-5 ${activeView === 'map' ? 'fill-current' : ''}`} />
              Mapa da Carteira
            </button>
            <button
              onClick={() => { setActiveView('table'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'table'
                ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
                : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
                }`}
            >
              <TableIcon className={`w-5 h-5 ${activeView === 'table' ? 'fill-current' : ''}`} />
              Listagem de Dados
            </button>
          </nav>

          <nav className="space-y-1 mb-8">
            <p className="px-3 text-xs font-bold text-on-surface-variant/60 uppercase mb-3 tracking-wider">Administração</p>

            <button
              onClick={() => { setActiveView('admin_users'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'admin_users'
                ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
                : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
                }`}
            >
              <UsersIcon className={`w-5 h-5 ${activeView === 'admin_users' ? 'fill-current' : ''}`} />
              Gerenciar Usuários
            </button>

            <button
              onClick={() => { setActiveView('admin_categories'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'admin_categories'
                ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
                : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
                }`}
            >
              <Layers className={`w-5 h-5 ${activeView === 'admin_categories' ? 'fill-current' : ''}`} />
              Categorias
            </button>

            <button
              onClick={() => { setActiveView('admin_products'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'admin_products'
                ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
                : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
                }`}
            >
              <Package className={`w-5 h-5 ${activeView === 'admin_products' ? 'fill-current' : ''}`} />
              Produtos
            </button>

            <button
              onClick={() => { setActiveView('admin_files'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'admin_files'
                ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
                : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
                }`}
            >
              <FileUp className={`w-5 h-5 ${activeView === 'admin_files' ? 'fill-current' : ''}`} />
              Arquivos
            </button>

            <button
              onClick={() => { setIsCloudConfigOpen(true); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 text-on-surface-variant hover:bg-surface-container-highest active:scale-95`}
            >
              <Cloud className="w-5 h-5" />
              Backup & Cloud
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-error bg-error-container hover:bg-error-container/80 rounded-full transition-colors shadow-sm"
          >
            <LogOut className="w-4 h-4 box-content" /> Sair do Sistema
          </button>

          <div className="text-center mt-4">
            <p className="text-[10px] text-on-surface-variant opacity-60">Versão 3.5.0 (MD3)</p>
          </div>
        </div>
      </aside>

      {/* TOP BAR FOR MOBILE */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-surface-container-low shadow-sm z-10 flex items-center justify-between px-4 border-b border-outline-variant/30">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-on-surface hover:bg-surface-container-highest rounded-full transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-bold text-lg text-primary flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5" /> Vendas A.I.
        </span>
        <div className="w-10"></div> {/* Spacer for center alignment */}
      </header>


      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-surface transition-all duration-300 md:pt-0 pt-16">

        {/* Floating Add Button for Mobile (when not in admin views) */}
        {!isAdmin && activeView === 'table' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-elevation-2 flex items-center justify-center z-50 animate-bounce-in"
          >
            <UsersIcon className="w-6 h-6" />
          </button>
        )}
        {/* MODALS */}
        <CloudConfigModal
          isOpen={isCloudConfigOpen}
          onClose={() => setIsCloudConfigOpen(false)}
        />

        <CookieConsent
          onAccept={() => {
            console.log("Cookie consent accepted. Storage enabled.");
          }}
          onDecline={() => {
            console.warn("Cookie consent declined. Storage should be minimized.");
          }}
        />

        <header className="bg-white border-b border-gray-200 h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Portal</span>
            <ChevronRight className="w-4 h-4" />
            <span className="font-semibold text-blue-600">
              {activeView === 'map' ? 'Mapa da Carteira' :
                activeView === 'table' ? 'Listagem de Clientes' :
                  activeView === 'admin_categories' ? 'Categorias de Clientes' :
                    activeView === 'admin_products' ? 'Catálogo de Produtos' : 'Gestão de Usuários'}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-gray-400">
                {isAdmin ? 'Clientes Visualizados' : 'Meus Clientes'}
              </p>
              <p className="text-lg font-bold leading-none">{visibleClients.length}</p>
            </div>
            {isAdmin && (
              <div className="text-right border-l pl-6 border-gray-200">
                <p className="text-xs text-gray-400">Total Sistema</p>
                <p className="text-lg font-bold leading-none text-purple-600">{masterClientList.length}</p>
              </div>
            )}
          </div>
        </header>

        {
          activeView === 'admin_users' && isAdmin ? (
            <div className="flex-1 overflow-y-auto bg-gray-50">
              <AdminUserManagement
                users={users}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
              />
            </div>
          ) : activeView === 'admin_categories' && isAdmin ? (
            <div className="flex-1 overflow-y-auto bg-gray-50">
              <AdminCategoryManagement
                categories={categories}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
              />
            </div>
          ) : activeView === 'admin_products' && isAdmin ? (
            <div className="flex-1 overflow-y-auto bg-gray-50">
              <AdminProductManagement
                products={products}
                onUploadProducts={handleUploadProducts}
                onClearProducts={handleClearProducts}
                onSaveProducts={handleSaveProducts} // Pass save handler
                apiKey={activeApiKey}
              />
            </div>
          ) : activeView === 'admin_files' && isAdmin ? (
            <div className="flex-1 overflow-y-auto bg-gray-50">
              <AdminFileManager
                users={users}
                uploadedFiles={uploadedFiles}
                onUploadClients={(file, targetId) => {
                  // Initial wrapper to adapt to handleFileUpload structure
                  // We need to set targetUploadUserId state temporarily or refactor handleFileUpload
                  setTargetUploadUserId(targetId);
                  // Simulate event
                  // Check if handleFileUpload uses targetUploadUserId state or if we can pass it?
                  // handleFileUpload uses state `targetUploadUserId`.
                  // So we set it, then call. But setState is async.
                  // Better: Refactor handleFileUpload to accept optional targetOverride.
                  // For now, let's call it directly with a small hack or verify if AdminFileManager sets the state?
                  // Actually AdminFileManager UI has the dropdown. 
                  // App.tsx's handleFileUpload (via input) relies on App.tsx state.
                  // AdminFileManager has its OWN input and state.
                  // If AdminFileManager calls this prop, it passes the file and targetId.

                  // Helper to trigger logic:
                  // We can't easily reuse handleFileUpload as is without refactoring.
                  // Let's assume for this step I will Refactor handleFileUpload to take args in next step or use a workaround.
                  // Workaround: 
                  const fakeEvent = { target: { files: [file], value: '' } } as any;
                  // We need to force targetUploadUserId to be targetId.
                  // Since state update is async, this might fail.

                  // CORRECT APPROACH: Refactor handleFileUpload to accept (file, userId).
                  // But I can't do that inside this replacement string.

                  // SAFE APPROACH FOR NOW: Just pass the file and rely on App.state? 
                  // NO, AdminFileManager passes `targetId`.

                  // I will implement a bridge function in App.tsx body later.
                  // For now, I'll pass a placeholder or try to use handleFileUpload if I update it.
                  // I will call `handleClientFileDirect(file, targetId)` which I will add.
                  const targetUser = users.find(u => u.id === targetId);
                  const targetName = targetUser?.name || 'Unknown';
                  handleClientFileDirect(file, targetId, targetName);
                }}
                onUploadProducts={handleProductFileUpload}
                onDeleteFile={handleDeleteFile}
                onReassignSalesperson={handleReassignFileSalesperson}
                procState={procState}
              />
            </div>
          ) : (
            <>
              <div className="bg-gray-100 p-4 border-b border-gray-200 flex flex-col gap-3">
                {/* Primary Filters Row */}
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative mr-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar cliente ou empresa..."
                      className="pl-9 pr-4 py-1.5 text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 w-56 border outline-none"
                    />
                  </div>

                  <div className="h-6 w-px bg-gray-300 mx-2 hidden sm:block"></div>
                  <div className="flex items-center gap-2 text-gray-600 mr-2">
                    <Filter className="w-4 h-4" />
                    <span className="text-sm font-bold hidden md:inline">Filtros:</span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2 bg-purple-50 px-2 py-1 rounded-md border border-purple-100 mr-2">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Admin
                      </span>

                      <div className="relative">
                        <UserIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-purple-400 pointer-events-none" />
                        <select
                          value={filterSalespersonId}
                          onChange={(e) => setFilterSalespersonId(e.target.value)}
                          className="text-sm border-purple-300 bg-white text-purple-900 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 pl-7 pr-3 py-1 font-medium"
                        >
                          <option value="Todos">Todos Vendedores</option>
                          {users.filter(u => u.role === 'salesperson').map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="relative">
                        <Briefcase className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-purple-400 pointer-events-none" />
                        <select
                          value={filterSalesCategory}
                          onChange={(e) => setFilterSalesCategory(e.target.value)}
                          className="text-sm border-purple-300 bg-white text-purple-900 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 pl-7 pr-3 py-1 font-medium"
                        >
                          <option value="Todos">Todas Equipes</option>
                          <option value="Externo">Externo</option>
                          <option value="Interno">Interno</option>
                          <option value="Mercado Livre">Mercado Livre</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <select
                    value={filterRegion}
                    onChange={(e) => { setFilterRegion(e.target.value); setFilterState('Todos'); setFilterCity('Todas'); }}
                    className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-1.5"
                  >
                    <option value="Todas">Todas Regiões</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>

                  <select
                    value={filterState}
                    onChange={(e) => { setFilterState(e.target.value); setFilterCity('Todas'); }}
                    className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-1.5"
                    disabled={availableStates.length === 0}
                  >
                    <option value="Todos">Todos Estados {filterRegion !== 'Todas' ? `(${filterRegion})` : ''}</option>
                    {availableStates.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <select
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-1.5 min-w-[120px]"
                    disabled={filterState === 'Todos' || availableCities.length === 0}
                  >
                    <option value="Todas">Todas Cidades</option>
                    {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <div className="flex items-center gap-1 relative ml-2">
                    <ShoppingBag className="w-4 h-4 text-gray-400 absolute left-2 pointer-events-none" />
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 pl-8 pr-3 py-1.5"
                    >
                      <option value="Todos">Todas Cat. Clientes</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Secondary Filters Row: Products */}
                <div className="flex flex-wrap gap-3 items-center bg-white border border-gray-200 p-2 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2 px-2 text-sm font-semibold text-green-700">
                    <Package className="w-4 h-4" />
                    Vendas:
                  </div>

                  <select
                    value={filterProductCategory}
                    onChange={e => setFilterProductCategory(e.target.value)}
                    className={`text-sm rounded-md px-3 py-1.5 border transition-colors ${filterProductCategory !== 'Todos' ? 'bg-green-50 border-green-300 text-green-800 font-bold' : 'border-gray-300 text-gray-600'}`}
                  >
                    <option value="Todos">Todas Marcas / Categorias</option>
                    {productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <input
                      type="text"
                      value={searchProductQuery}
                      onChange={e => setSearchProductQuery(e.target.value)}
                      placeholder="SKU, Marca, Código ou Descrição..."
                      className={`pl-8 pr-3 py-1.5 text-sm border rounded-md focus:ring-green-500 focus:border-green-500 outline-none w-64 transition-colors ${searchProductQuery ? 'bg-green-50 border-green-300' : 'border-gray-300'}`}
                    />
                  </div>

                  {isProductFilterActive && (
                    <span className="ml-auto text-xs font-medium text-green-600 animate-pulse flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Exibindo onde foi vendido
                    </span>
                  )}
                  {!isProductFilterActive && (
                    <span className="ml-auto text-xs text-gray-400">
                      {products.length === 0 ? "Nenhum produto cadastrado no admin." : `${products.length} produtos no catálogo.`}
                    </span>
                  )}
                </div>

                <div className="flex justify-end">
                  <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {filteredClients.length} resultados encontrados
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-hidden p-4 bg-gray-100">

                {/* Visual Placeholder when empty */}
                {visibleClients.length === 0 && !procState.isActive ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                    {isAdmin ? (
                      <>
                        <FileUp className="w-12 h-12 mb-2 opacity-20" />
                        <p className="text-lg font-medium text-gray-500">Nenhum dado cadastrado.</p>
                        <p className="text-sm mt-1">Selecione um vendedor ao lado e carregue a planilha de clientes.</p>
                      </>
                    ) : (
                      <>
                        <Lock className="w-12 h-12 mb-2 opacity-20" />
                        <p className="text-lg font-medium text-gray-500">Carteira Vazia</p>
                        <p className="text-sm mt-1 max-w-md text-center">
                          Seus clientes ainda não foram carregados pelo administrador.
                          Solicite o cadastro da sua rota.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
                    {activeView === 'map' ? (
                      <ClientMap
                        key={`${activeApiKey}-${keyVersion}`} // FORCE REMOUNT when key changes
                        clients={filteredClients}
                        apiKey={activeApiKey}
                        onInvalidKey={handleInvalidKey}
                        productFilterActive={isProductFilterActive}
                        highlightProductTerm={searchProductQuery}
                        activeProductCategory={filterProductCategory}
                        users={users} // Pass users for color coding
                      />
                    ) : (
                      <ClientList
                        clients={filteredClients}
                        onUpdateClient={handleUpdateClient}
                        onAddClient={handleAddClient}
                        currentUserRole={currentUser?.role}
                        currentUserId={currentUser?.id}
                        currentUserName={currentUser?.name}
                      />
                    )}
                  </div>
                )}
              </div>
            </>
          )
        }

        {/* --- TOAST NOTIFICATION FOR BACKGROUND PROCESSING --- */}
        {
          procState.isActive && (
            <div className="absolute bottom-6 right-6 z-50 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden animate-slide-up">
              <div className={`h-1.5 w-full ${procState.status === 'error' ? 'bg-red-200' : 'bg-blue-100'}`}>
                <div
                  className={`h-full transition-all duration-300 ${procState.status === 'completed' ? 'bg-green-500 w-full' :
                    procState.status === 'error' ? 'bg-red-500 w-full' :
                      'bg-blue-600'
                    }`}
                  style={{ width: procState.total > 0 ? `${(procState.current / procState.total) * 100}%` : '0%' }}
                />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      {procState.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {procState.status === 'processing' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                      {procState.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}

                      {procState.status === 'reading' ? 'Lendo Arquivo...' :
                        procState.status === 'processing' ? 'Processando Planilha' :
                          procState.status === 'completed' ? 'Processamento Concluído' :
                            'Erro no Processamento'}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {procState.fileName} <span className="mx-1">•</span> {procState.ownerName}
                    </p>
                  </div>
                  <button
                    onClick={() => setProcState(prev => ({ ...prev, isActive: false }))}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {procState.status === 'processing' && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progresso (IA + Maps)</span>
                      <span className="font-mono">{procState.current} / {procState.total}</span>
                    </div>
                    <p className="text-[10px] text-gray-400">Você pode continuar usando o sistema.</p>
                  </div>
                )}

                {procState.status === 'error' && (
                  <p className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                    {procState.errorMessage}
                  </p>
                )}
              </div>
            </div>
          )
        }

      </main >
    </div >
  );
};

export default App;