import React, { useState, useMemo, useEffect } from 'react';
import { FileUp, Map as MapIcon, Filter, LayoutDashboard, Table as TableIcon, LogOut, ChevronRight, Loader2, AlertCircle, Key, Users as UsersIcon, Shield, Lock, ShoppingBag, X, CheckCircle, Search, Layers, Package, Download, Briefcase, User as UserIcon, Trash2, Database, Upload, Settings, Menu, Save, Cloud } from 'lucide-react';
import { RawClient, EnrichedClient, CATEGORIES, REGIONS, Product, getRegionByUF } from './types';
import type { AppUser } from './types';
import { parseCSV } from './utils/csvParser';
import { processClientsWithAI } from './services/geminiService';
import { geocodeAddress } from './services/geocodingService';
import { initializeFirebase, saveToCloud, loadFromCloud, isFirebaseInitialized } from './services/firebaseService';
import ClientMap from './components/ClientMap';
import ClientList from './components/ClientList';
import LoginScreen from './components/LoginScreen';
import AddClientModal from './components/AddClientModal';
import EditClientModal from './components/EditClientModal';
import AdminUserManagement from './components/AdminUserManagement';
import AdminCategoryManagement from './components/AdminCategoryManagement';
import AdminProductManagement from './components/AdminProductManagement';
import CloudConfigModal from './components/CloudConfigModal';


// Initial Mock Data
const INITIAL_USERS: AppUser[] = [
  { id: 'admin', name: 'Administrador Geral', username: 'admin', email: 'admin@vendas.ai', role: 'admin', password: '123', salesCategory: 'N/A' },
  { id: '1', name: 'João Silva (Vendedor A)', username: 'vendedor_a', email: 'joao.silva@vendas.ai', role: 'salesperson', password: '123', salesCategory: 'Externo' },
  { id: '2', name: 'Maria Santos (Vendedor B)', username: 'vendedor_b', email: 'maria.santos@vendas.ai', role: 'salesperson', password: '123', salesCategory: 'Interno' },
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

  // Save to LocalStorage (Persist)
  useEffect(() => {
    localStorage.setItem('vendas_ai_clients', JSON.stringify(masterClientList));
  }, [masterClientList]);

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
  const [activeView, setActiveView] = useState<'map' | 'table' | 'admin_users' | 'admin_categories' | 'admin_products'>('map');
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
    const confirmClear = window.confirm(
      "⚠️ AVISO CRÍTICO ⚠️\n\n" +
      "Tem certeza que deseja DELETAR TODOS os clientes do sistema?\n" +
      "Isso removerá todo o histórico e limpará o cache local.\n\n" +
      "Esta ação não pode ser desfeita."
    );

    if (confirmClear) {
      setMasterClientList([]);
      localStorage.removeItem('vendas_ai_clients');
      // Optional: Also clear any processing state
      setProcState({
        isActive: false, total: 0, current: 0, fileName: '', ownerName: '', status: 'processing'
      });
      alert("Base de dados limpa com sucesso!");
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
      const matchCat = filterCategory === 'Todos' || c.category === filterCategory;

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
    setActiveView('map');
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    let ownerId = currentUser.id;
    let ownerName = currentUser.name;

    if (currentUser.role === 'admin') {
      if (!targetUploadUserId) {
        alert("Selecione um vendedor para atribuir esta planilha.");
        return;
      }
      ownerId = targetUploadUserId;
      const targetUser = users.find(u => u.id === targetUploadUserId);
      ownerName = targetUser?.name || 'Unknown';
    }

    // CONFIRMATION ALERT
    if (masterClientList.length > 0) {
      const confirmUpdate = window.confirm(
        "O sistema já possui dados de clientes carregados.\n\n" +
        "Deseja ADICIONAR os novos dados à lista existente?\n" +
        "Clique em OK para continuar ou Cancelar para abortar.\n\n" +
        "Dica: Para substituir tudo, cancele e use o botão 'Limpar Base de Clientes'."
      );
      if (!confirmUpdate) {
        event.target.value = ''; // Reset file input
        return;
      }
    }

    // Initialize Background Process State
    setProcState({
      isActive: true,
      total: 0,
      current: 0,
      fileName: file.name,
      ownerName: ownerName,
      status: 'reading'
    });

    event.target.value = '';

    try {
      const rawData = await parseCSV(file);

      if (rawData.length === 0) throw new Error("Arquivo vazio.");

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

      // Update Master List
      setMasterClientList(prev => {
        // Remove old data for this salesperson if needed? No, usually append or merge.
        // For simplicity here, we append.
        const others = prev.filter(c => c.salespersonId !== ownerId);
        const newClients = [...others, ...enrichedData];

        // Re-run distribution if products exist
        if (products.length > 0) {
          // This is a bit recursive but OK for this mock structure
          // We need to access 'distributeProductsToClients' logic inline because setState is async
          return newClients.map(c => {
            if (c.purchasedProducts && c.purchasedProducts.length > 0) return c;
            let eligible = products.filter(p => p.category.includes(c.category) || c.category.includes(p.category));
            if (eligible.length === 0) eligible = products;
            const count = Math.floor(Math.random() * 5) + 1;
            const selected = [...eligible].sort(() => 0.5 - Math.random()).slice(0, count);
            return { ...c, purchasedProducts: selected };
          });
        }
        return newClients;
      });

      if (currentUser.role === 'admin') {
        setFilterSalespersonId(ownerId);
      }

      setProcState(prev => ({ ...prev, status: 'completed' }));

      setTimeout(() => {
        setProcState(prev => prev.status === 'completed' ? { ...prev, isActive: false } : prev);
      }, 5000);

    } catch (err: any) {
      console.error(err);
      setProcState(prev => ({ ...prev, status: 'error', errorMessage: err.message || "Erro desconhecido" }));
    }
  };

  if (!currentUser) {
    return <LoginScreen users={users} onLogin={handleLogin} />;
  }

  const isAdmin = currentUser.role === 'admin';
  const isProductFilterActive = filterProductCategory !== 'Todos' || searchProductQuery !== '';

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800 overflow-hidden relative">

      {/* SIDEBAR */}
      <aside className={`w-72 ${isAdmin ? 'bg-slate-900' : 'bg-blue-900'} text-white flex flex-col shadow-xl z-20 transition-colors duration-500`}>
        <div className="p-6 border-b border-white/10">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-blue-400" />
            Vendas A.I.
          </h1>
          <p className="text-xs text-white/50 mt-1">
            {isAdmin ? 'Painel Administrativo' : 'Portal do Vendedor'}
          </p>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="bg-black/20 rounded-lg p-4 mb-6 border border-white/5">
            <p className="text-xs text-white/50 uppercase font-semibold">Logado como:</p>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-purple-400' : 'bg-green-400'}`}></div>
              <p className="font-bold text-white truncate">{currentUser.name}</p>
            </div>
          </div>

          <nav className="space-y-1 mb-8">
            <p className="px-3 text-xs font-semibold text-white/40 uppercase mb-2">Visualização</p>
            <button
              onClick={() => setActiveView('map')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeView === 'map' ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5'}`}
            >
              <MapIcon className="w-4 h-4" /> Mapa da Carteira
            </button>
            <button
              onClick={() => setActiveView('table')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeView === 'table' ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5'}`}
            >
              <TableIcon className="w-4 h-4" /> Listagem de Dados
            </button>
          </nav>

          {isAdmin && (
            <nav className="space-y-1 mb-8 animate-fade-in">
              <p className="px-3 text-xs font-semibold text-purple-300 uppercase mb-2 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Admin
              </p>
              <button
                onClick={() => setActiveView('admin_users')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeView === 'admin_users' ? 'bg-purple-600 text-white' : 'text-white/70 hover:bg-white/5'}`}
              >
                <UsersIcon className="w-4 h-4" /> Gerenciar Acessos
              </button>
              <button
                onClick={() => setActiveView('admin_categories')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeView === 'admin_categories' ? 'bg-purple-600 text-white' : 'text-white/70 hover:bg-white/5'}`}
              >
                <Layers className="w-4 h-4" /> Categorias de Clientes
              </button>
              <button
                onClick={() => setActiveView('admin_products')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeView === 'admin_products' ? 'bg-purple-600 text-white' : 'text-white/70 hover:bg-white/5'}`}
              >
                <Package className="w-4 h-4" /> Catálogo de Produtos
              </button>
            </nav>
          )}

          <div className="pt-4 border-t border-white/10 mt-auto">
            <button
              onClick={() => {
                const data = {
                  clients: masterClientList,
                  users: users,
                  categories: categories,
                  products: products,
                  backupDate: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `rota_vendas_backup_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-green-300 hover:bg-white/5 transition-colors mb-2"
              title="Salvar cópia de segurança dos dados"
            >
              <Download className="w-4 h-4" /> Backup dos Dados
            </button>

            <label className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-blue-300 hover:bg-white/5 transition-colors cursor-pointer" title="Carregar dados de um backup">
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const json = JSON.parse(event.target?.result as string);

                      // Basic validation
                      if (!json.clients || !Array.isArray(json.clients)) throw new Error("Arquivo inválido: clientes não encontrados.");

                      if (window.confirm(`Deseja restaurar o backup de ${json.backupDate || 'data desconhecida'}?\nIsso substituirá TODOS os dados atuais (${masterClientList.length} clientes).`)) {
                        setMasterClientList(json.clients);
                        if (json.users) setUsers(json.users);
                        if (json.categories) setCategories(json.categories);
                        if (json.products) setProducts(json.products);

                        alert("Dados restaurados com sucesso!");
                      }
                    } catch (err) {
                      alert("Erro ao ler arquivo de backup: " + err);
                    }
                  };
                  reader.readAsText(file);
                  // Reset input value to allow selecting same file again
                  e.target.value = '';
                }}
              />
              <FileUp className="w-4 h-4" /> Restaurar Backup
            </label>
          </div>


          {/* Upload Section */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="px-3 text-xs font-semibold text-white/40 uppercase mb-3 flex items-center gap-2">
              <FileUp className="w-3 h-3" /> Carga de Clientes
            </p>

            {isAdmin ? (
              <div className="bg-white/5 p-3 rounded-lg border border-white/10 space-y-3">

                {/* Target Salesperson Selector */}
                <div>
                  <p className="text-[10px] text-purple-300 font-bold uppercase mb-2">Atribuir Carteira a:</p>
                  <select
                    className="w-full bg-slate-800 border border-slate-600 rounded text-xs p-2 text-white mb-2 focus:ring-1 focus:ring-purple-500 outline-none"
                    value={targetUploadUserId}
                    onChange={(e) => setTargetUploadUserId(e.target.value)}
                  >
                    <option value="" disabled>Selecione o Vendedor...</option>
                    {users.filter(u => u.role === 'salesperson').map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {/* Upload Button */}
                <label className={`flex items-center justify-center w-full px-2 py-3 border border-white/20 border-dashed rounded-lg cursor-pointer hover:bg-white/5 transition-colors ${procState.isActive && procState.status === 'processing' ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex flex-col items-center">
                    <FileUp className="w-5 h-5 text-purple-400 mb-1" />
                    <span className="text-[10px] text-white/70">
                      {procState.isActive && procState.status === 'processing' ? 'Processando...' : 'Carregar CSV (Excel)'}
                    </span>
                  </div>
                  <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={procState.isActive && procState.status === 'processing' || !targetUploadUserId} />
                </label>

                {/* Clear Data Button */}
                <button
                  onClick={handleClearClients}
                  className="w-full flex items-center justify-center gap-2 px-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-lg text-[10px] font-medium transition-colors mt-2"
                  title="Remover todos os clientes do sistema"
                >
                  <Trash2 className="w-3 h-3" />
                  Limpar Base (Reset Total)
                </button>

              </div>
            ) : (
              <div className="px-3 py-4 bg-white/5 rounded-lg border border-white/10 text-center">
                <Lock className="w-6 h-6 text-white/30 mx-auto mb-2" />
                <p className="text-[10px] text-white/50 leading-tight">
                  O upload da carteira de clientes é restrito ao Administrador.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cloud Sync Status/Button (Admin only) */}
        {isAdmin && (
          <div className="px-3 mb-6 space-y-2">
            <button
              onClick={() => setIsCloudConfigOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-purple-200 bg-purple-900/50 hover:bg-purple-900/70 transition-colors border border-purple-800"
            >
              <Cloud className="w-3 h-3" />
              {isFirebaseConnected ? 'Nuvem Conectada' : 'Configurar Nuvem'}
              {isFirebaseConnected && <div className="w-1.5 h-1.5 rounded-full bg-green-400 ml-auto"></div>}
            </button>

            {isFirebaseConnected && (
              <button
                onClick={async () => {
                  try {
                    // Show loading state if desired, for now just simple alert flow
                    const btn = document.getElementById('btn-sync-manual');
                    if (btn) btn.innerText = 'Sincronizando...';

                    await saveToCloud(masterClientList, products, categories, users);

                    if (btn) btn.innerText = 'Sincronizar Agora';
                    alert('Dados sincronizados com a nuvem com sucesso!');
                  } catch (e: any) {
                    alert('Erro ao sincronizar: ' + e.message);
                  }
                }}
                id="btn-sync-manual"
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-[10px] font-medium rounded-lg text-purple-300 hover:bg-purple-900/40 transition-colors"
              >
                <Save className="w-3 h-3" />
                Sincronizar Agora
              </button>
            )}
          </div>
        )}

        <div className="mt-auto p-4 border-t border-white/10">
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-300 hover:text-red-100 transition-colors w-full px-2">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside >

      {/* MODALS */}
      <CloudConfigModal
        isOpen={isCloudConfigOpen}
        onClose={() => setIsCloudConfigOpen(false)}
      />


      {/* MAIN CONTENT */}
      < main className="flex-1 flex flex-col h-full relative overflow-hidden" >

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