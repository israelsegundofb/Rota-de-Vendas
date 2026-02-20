/* 
  DESENVOLVIDO POR: Israel França
  PROJETO: Rota de Vendas Inteligente
  PORTFOLIO: https://www.behance.net/israelsegundo
  
  Este projeto foi desenvolvido com dedicação e expertise em desenvolvimento web. Conheça mais sobre meus trabalhos e projetos visitando meu portfólio no Behance.
  
  Developed with passion and technical excellence.
*/
import React, { useState, useEffect, useRef } from 'react';
import { FileUp, Map as MapIcon, Filter, LayoutDashboard, Table as TableIcon, LogOut, ChevronRight, Loader2, AlertCircle, Users as UsersIcon, Shield, Lock, ShoppingBag, X, CheckCircle, Search, Layers, Package, Briefcase, User as UserIcon, Database, Menu, Cloud, MessageSquare, Activity, History } from 'lucide-react';
import { EnrichedClient, Product, UploadedFile, AppUser, PurchaseRecord, UserStatus } from './types';
import { isAdmin, isSalesTeam, hasFullDataVisibility } from './utils/authUtils';
import { REGIONS, getRegionByUF } from './utils/constants';
import { parseCSV, parseProductCSV, parsePurchaseHistoryCSV, detectCSVType } from './utils/csvParser';
import { parseExcel, parseProductExcel } from './utils/excelParser';
import { processClientsWithAI } from './services/geminiService';
import { geocodeAddress, reverseGeocodePlusCode } from './services/geocodingService';
import { initializeFirebase, saveToCloud, loadFromCloud, isFirebaseInitialized, subscribeToCloudChanges, uploadFileToCloud, logActivityToCloud, updateUserStatusInCloud } from './services/firebaseService';
import { pesquisarEmpresaPorEndereco, consultarCNPJ } from './services/cnpjService';
import pLimit from 'p-limit';
// Lazy Load ClientMap to reduce initial bundle size
const ClientMap = React.lazy(() => import('./components/ClientMap'));
// Lazy Load Admin & Heavy Components
// REVERTING ClientList and LoginScreen to static imports for performance.

import ClientList from './components/ClientList';
import LoginScreen from './components/LoginScreen';

const AddClientModal = React.lazy(() => import('./components/AddClientModal'));
const EditClientModal = React.lazy(() => import('./components/EditClientModal'));
const AdminUserManagement = React.lazy(() => import('./components/AdminUserManagement'));
const AdminCategoryManagement = React.lazy(() => import('./components/AdminCategoryManagement'));
const AdminProductManagement = React.lazy(() => import('./components/AdminProductManagement'));
const CloudConfigModal = React.lazy(() => import('./components/CloudConfigModal'));
const AdminFileManager = React.lazy(() => import('./components/AdminFileManager'));
const GoogleMapsKeyModal = React.lazy(() => import('./components/GoogleMapsKeyModal'));
const CNPJaKeyModal = React.lazy(() => import('./components/CNPJaKeyModal'));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const LogPanel = React.lazy(() => import('./components/LogPanel'));
const SalesHistoryPanel = React.lazy(() => import('./components/SalesHistoryPanel'));
const ChatPanel = React.lazy(() => import('./components/ChatPanel'));

import DateRangePicker from './components/DateRangePicker';
import CookieConsent from './components/CookieConsent';
import LoadingScreen from './components/LoadingScreen';
import { getStoredFirebaseConfig } from './firebaseConfig';
import { useAuth } from './hooks/useAuth';
import { useDataPersistence } from './hooks/useDataPersistence';
import { useFilters } from './hooks/useFilters';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import CustomDialog, { DialogType } from './components/CustomDialog';
import { useChat } from './hooks/useChat';
import { usePageTracking } from './hooks/useAnalytics';
import { useToast } from './contexts/ToastContext';

// Initial Mock Data
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
  // --- Custom Hooks ---
  const {
    users, setUsers, currentUser, login, logout: authLogout,
    addUser: baseAddUser, updateUser: baseUpdateUser, deleteUser: baseDeleteUser
  } = useAuth();

  const { toast } = useToast();

  const {
    masterClientList, setMasterClientList,
    products, setProducts,
    categories, setCategories,
    uploadedFiles, setUploadedFiles,
    isFirebaseConnected, isDataLoaded,
    loadingProgress, loadingMessage
  } = useDataPersistence(users, setUsers);

  const {
    searchQuery, setSearchQuery,
    filterRegion, setFilterRegion,
    filterState, setFilterState,
    filterCity, setFilterCity,
    filterCategory, setFilterCategory,
    filterSalespersonId, setFilterSalespersonId,
    filterSalesCategory, setFilterSalesCategory,
    filterCnae, setFilterCnae,
    filterProductCategory, setFilterProductCategory,
    filterProductSku, setFilterProductSku,
    searchProductQuery, setSearchProductQuery,
    showProductSuggestions, setShowProductSuggestions,
    filteredClients,
    visibleClients, // Exposed if needed for counts
    availableStates,
    availableCities,
    availableCnaes,
    productCategories,
    filterOnlyWithPurchases,
    setFilterOnlyWithPurchases,
    startDate, setStartDate,
    endDate, setEndDate,
    resetFilters,
    isFiltering
  } = useFilters(masterClientList, users, currentUser, products);

  const {
    messages, conversations, activeConversationId, setActiveConversationId,
    sendMessage: handleChatSendMessage, markAsRead: handleChatMarkAsRead, totalUnread,
    deleteMessage: handleChatDeleteMessage, clearMessages: handleChatClearMessages
  } = useChat(currentUser, users);

  // Background Processing State (Local to App as it handles UI feedback)
  const [procState, setProcState] = useState<ProcessingState>({
    isActive: false,
    total: 0,
    current: 0,
    fileName: '',
    ownerName: '',
    status: 'processing'
  });

  // API Key State
  const [activeApiKey, setActiveApiKey] = useState<string>(() => {
    const key = import.meta.env.VITE_GOOGLE_API_KEY || localStorage.getItem('gemini_api_key') || getStoredFirebaseConfig()?.apiKey || '';
    console.log('[APP] Gemini API Key Source:', key ? 'FOUND' : 'MISSING', '(first 10 chars):', key?.substring(0, 10) + '...');
    return key;
  });
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || localStorage.getItem('google_maps_api_key') || import.meta.env.VITE_GOOGLE_API_KEY || localStorage.getItem('gemini_api_key') || '';
    console.log('[APP] Maps API Key Source:', key ? 'FOUND' : 'MISSING', '(first 10 chars):', key?.substring(0, 10) + '...');
    return key;
  });
  const [keyVersion, setKeyVersion] = useState(0);

  // View State
  const [activeView, setActiveView] = useState<'map' | 'table' | 'dashboard' | 'admin_users' | 'admin_categories' | 'admin_products' | 'admin_files' | 'history' | 'chat'>('map');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCloudConfigOpen, setIsCloudConfigOpen] = useState(false);

  // --- Analytics Tracking ---
  usePageTracking(activeView); // Track main views
  usePageTracking(isAddModalOpen ? 'modal-add-client' : 'none'); // Track Add Modal
  usePageTracking(isEditModalOpen ? 'modal-edit-client' : 'none'); // Track Edit Modal
  usePageTracking(isCloudConfigOpen ? 'modal-cloud-config' : 'none'); // Track Config Modal

  // --- Presence Effects ---
  useEffect(() => {
    if (currentUser && (!currentUser.status || currentUser.status === 'Offline')) {
      const setOnline = async () => {
        baseUpdateUser({ ...currentUser, status: 'Online' });
        await updateUserStatusInCloud(currentUser.id, 'Online', users);
      };
      setOnline();
    }
  }, [currentUser?.id]); // Only run when user changes or logs in

  useEffect(() => {
    const handleUnload = () => {
      if (currentUser && currentUser.status !== 'Offline') {
        // Fire and forget status update on close
        updateUserStatusInCloud(currentUser.id, 'Offline', users);
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [currentUser, users]);
  // isFirebaseConnected handled by hook
  const [selectedClient, setSelectedClient] = useState<EnrichedClient | undefined>(undefined);
  const [isGoogleMapsModalOpen, setIsGoogleMapsModalOpen] = useState(false);
  const [isCNPJaModalOpen, setIsCNPJaModalOpen] = useState(false);
  const [isLogPanelOpen, setIsLogPanelOpen] = useState(false);
  const SUGGESTED_MAP_KEY = 'AIzaSyBXCBO0Kx9-2HvTzjcsHzoGmHZnIKXXvcw';

  // Custom Dialog State
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string | string[];
    type: DialogType;
    onConfirm?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (title: string, message: string | string[], type: DialogType = 'info') => {
    setDialogConfig({
      isOpen: true,
      title,
      message,
      type,
      confirmLabel: 'Entendi'
    });
  };

  const showConfirm = (title: string, message: string | string[], onConfirm: () => void, labels?: { confirm?: string, cancel?: string }) => {
    setDialogConfig({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm,
      confirmLabel: labels?.confirm || 'Confirmar',
      cancelLabel: labels?.cancel || 'Cancelar'
    });
  };

  // Ref for cancellation
  const isUploadCancelled = useRef(false);

  // Handle View Navigation with Confirmation
  const handleViewNavigation = (newView: string) => {
    if (procState.isActive && procState.status === 'processing') {
      showConfirm(
        "Parar Envio?",
        ["Gostaria de parar de enviar o arquivo?", "O progresso atual será perdido."],
        () => {
          isUploadCancelled.current = true;
          setActiveView(newView as any);
        },
        { confirm: 'Parar Envio', cancel: 'Continuar' }
      );
    } else {
      setActiveView(newView as any);
    }
  };

  // Admin Upload State
  const [targetUploadUserId, setTargetUploadUserId] = useState<string>('');

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // API key is now loaded from import.meta.env.VITE_GOOGLE_API_KEY via useState initializer


  // --- Handlers ---
  // User handlers are now imported from useAuth hook


  const handleCleanupDuplicates = () => {
    showConfirm(
      'Remover Clientes Duplicados?',
      [
        'Esta ação irá identificar clientes com mesmo nome e endereço.',
        'Manteremos apenas 1 registro de cada e atualizaremos a contagem total.'
      ],
      () => {
        const seen = new Map<string, EnrichedClient>();
        const unique: EnrichedClient[] = [];
        let duplicateCount = 0;

        masterClientList.forEach((client) => {
          const key = `${client.companyName || ''}-${client.cleanAddress || ''}`.toLowerCase().trim();
          if (seen.has(key)) {
            duplicateCount++;
          } else {
            seen.set(key, client);
            unique.push(client);
          }
        });

        if (duplicateCount === 0) {
          toast.success('Nenhum cliente duplicado encontrado!');
          return;
        }

        setMasterClientList(unique);

        toast.success(
          `Limpeza Concluída! ${duplicateCount} clientes duplicados removidos.`,
          'Limpeza de Duplicatas'
        );
      }
    );
  };

  /**
   * UTILITÁRIO DE ATUALIZAÇÃO EM MASSA (ENRIQUECIMENTO)
   * Percorre a base e atualiza via CNPJa Comercial
   */
  const handleMassUpdateClients = async () => {
    if (masterClientList.length === 0) {
      toast.warning('Nenhum cliente na base para atualizar.');
      return;
    }

    showConfirm(
      'Iniciar Atualização em Massa?',
      [
        'Este processo utilizará sua API CNPJa para:',
        '• Buscar CNPJs faltantes via Razão Social',
        '• Atualizar CNAEs (Atividade Econômica)',
        '• Telefones, Endereços e Georreferenciamento',
        `Total de clientes: ${masterClientList.length}`
      ],
      async () => {
        setProcState({
          isActive: true,
          current: 0,
          total: masterClientList.length,
          status: 'processing',
          fileName: 'Enriquecimento de Base (CNPJa Comercial)',
          ownerName: currentUser?.name || 'Sistema'
        });

        const limit = pLimit(3);
        let updatedCount = 0;
        let errorCount = 0;

        const tasks = masterClientList.map((client, index) => limit(async () => {
          try {
            let activeCnpj = client.cnpj?.replace(/\D/g, '');

            if (!activeCnpj || activeCnpj.length !== 14) {
              const searchResults = await pesquisarEmpresaPorEndereco({
                filtros: client.companyName,
                uf: client.state
              });
              if (searchResults && searchResults.length > 0) {
                activeCnpj = searchResults[0].taxId;
              }
            }

            if (activeCnpj && activeCnpj.length === 14) {
              const fullData = await consultarCNPJ(activeCnpj);
              if (fullData) {
                const hasNewAddress = fullData.logradouro && fullData.numero;
                setMasterClientList(prev => prev.map(c => {
                  if (c.id === client.id) {
                    return {
                      ...c,
                      cnpj: fullData.cnpj,
                      companyName: fullData.nome_fantasia || fullData.razao_social || c.companyName,
                      contact: fullData.ddd_telefone_1 || c.contact,
                      cleanAddress: hasNewAddress
                        ? `${fullData.logradouro}, ${fullData.numero}, ${fullData.municipio} - ${fullData.uf}`
                        : c.cleanAddress,
                      originalAddress: hasNewAddress
                        ? `${fullData.logradouro}, ${fullData.numero}${fullData.complemento ? ` - ${fullData.complemento}` : ''}, ${fullData.bairro}, ${fullData.municipio} - ${fullData.uf}`
                        : c.originalAddress,
                      mainCnae: fullData.cnae_fiscal || c.mainCnae,
                      secondaryCnaes: fullData.cnaes_secundarios?.map((s: any) => `${s.codigo} - ${s.texto}`) || c.secondaryCnaes || [],
                      lat: fullData.latitude || c.lat,
                      lng: fullData.longitude || c.lng,
                      googleMapsUri: fullData.latitude ? `https://www.google.com/maps?q=${fullData.latitude},${fullData.longitude}` : c.googleMapsUri
                    };
                  }
                  return c;
                }));
                updatedCount++;
              }
            }
          } catch (err: any) {
            console.error(`Erro ao atualizar cliente ${client.companyName}:`, err);
            errorCount++;

            // Check for 401 specifically to stop the whole process if the key is invalid
            if (err.message && (err.message.includes('401') || err.message.toLowerCase().includes('chave de api cnpja inválida'))) {
              isUploadCancelled.current = true;
              setProcState(prev => ({ ...prev, status: 'error', errorMessage: 'Autenticação CNPJa falhou. Chave inválida ou expirada.' }));
              setIsCNPJaModalOpen(true);
            }
          } finally {
            setProcState(prev => ({ ...prev, current: index + 1 }));
          }
        }));

        await Promise.all(tasks);

        setProcState(prev => ({ ...prev, status: 'completed' }));

        toast.success(
          `Atualização: ${updatedCount} sucesso, ${errorCount} erros.`,
          'Enriquecimento Concluído'
        );

        setTimeout(() => {
          setProcState(prev => ({ ...prev, isActive: false }));
        }, 3000);
      }
    );
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

      if (currentUser) {
        logActivityToCloud({
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'CREATE',
          category: 'PRODUCTS',
          details: `Importou ${newProducts.length} novos produtos.`,
        });
      }
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

  const handleClearAllClients = () => {
    showConfirm(
      'Limpar TODOS os Clientes?',
      [
        '⚠️ ATENÇÃO: Esta ação removerá TODOS os clientes do sistema.',
        '• Limpeza da listagem de arquivos e reset de contadores.',
        '• Vendedores, produtos e categorias NÃO serão afetados.'
      ],
      () => {
        setMasterClientList([]);
        setUploadedFiles(prev => prev.filter(f => f.type !== 'clients'));

        if (currentUser) {
          logActivityToCloud({
            timestamp: new Date().toISOString(),
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            action: 'DELETE',
            category: 'CLIENTS',
            details: `Limpou TODA a base de clientes do sistema.`,
          });
        }

        toast.success('Base de clientes limpa com sucesso!');
      }
    );
  };


  // Helper for sequential geocoding attempts
  const geocodeWithFallback = async (addresses: (string | undefined)[]) => {
    for (const addr of addresses) {
      const candidate = addr?.trim();
      if (!candidate) continue;
      try {
        const result = await geocodeAddress(candidate, googleMapsApiKey || '');
        if (result) return result;
      } catch (e) {
        console.warn(`Geocoding failed for ${candidate}:`, e);
      }
    }
    return null;
  };

  const handleBulkGeneratePlusCodes = async () => {
    const clientsMissingPlusCode = masterClientList.filter(c => !c.plusCode && c.lat && c.lng && c.lat !== 0);

    if (clientsMissingPlusCode.length === 0) {
      toast.info('Todos os clientes com coordenadas já possuem Plus Code!');
      return;
    }

    showConfirm(
      'Gerar Plus Codes?',
      [
        `Deseja gerar Plus Codes para ${clientsMissingPlusCode.length} clientes?`,
        'Isso utilizará a cota da API de Geocoding do Google.'
      ],
      async () => {
        setProcState({
          isActive: true,
          current: 0,
          total: clientsMissingPlusCode.length,
          status: 'processing',
          fileName: 'Geração de Plus Codes',
          ownerName: currentUser?.name || 'Sistema'
        });

        let updatedCount = 0;
        const newList = [...masterClientList];
        const limit = pLimit(5);

        const tasks = clientsMissingPlusCode.map((client) => limit(async () => {
          if (isUploadCancelled.current) return;

          try {
            const plusCode = await reverseGeocodePlusCode(client.lat, client.lng, googleMapsApiKey || '');
            if (plusCode) {
              const index = newList.findIndex(c => c.id === client.id);
              if (index !== -1) {
                newList[index] = { ...newList[index], plusCode };
                updatedCount++;
              }
            }
          } catch (e) {
            console.error(`Error generating Plus Code for ${client.companyName}:`, e);
          } finally {
            setProcState(prev => ({ ...prev, current: prev.current + 1 }));
          }
        }));

        await Promise.all(tasks);

        setMasterClientList(newList);
        setProcState(prev => ({ ...prev, status: 'completed', isActive: true }));
        isUploadCancelled.current = false;

        toast.success(`Processo concluído! ${updatedCount} Plus Codes gerados.`);
      }
    );
  };

  const handleUpdateClient = React.useCallback(async (updatedClient: EnrichedClient) => {
    // Need to access current state inside callback or use functional updates where possible
    // Since we need to find 'original' from 'masterClientList', we should ideally use a ref or include it in dependency
    // However, masterClientList changes frequently. 
    // A better approach for 'original' might be to pass it from the child if possible, but here we lookup.
    // To avoid rebuilding this function on every list change, we can use a functional state update for the SET, 
    // but the READ of 'original' is tricky. 
    // Actually, 'original' is only used to check if address changed. 

    // Let's rely on setMasterClientList functional update to be safe and inclusion of variables.
    // If we include masterClientList in dependency, it defeats the purpose if list changes.
    // OPTIMIZATION: We will trust the passed 'updatedClient' mostly, but for address comparison we need source.
    // We can use a ref for masterClientList to read current value without re-binding.

    setMasterClientList(prevList => {
      const original = prevList.find(c => c.id === updatedClient.id);
      const finalClient = { ...updatedClient };

      const addressChanged = original && original.cleanAddress !== updatedClient.cleanAddress;
      const plusCodeChanged = original && original.plusCode !== updatedClient.plusCode;
      const coordsChanged = original && (original.lat !== updatedClient.lat || original.lng !== updatedClient.lng);
      const coordinatesMissing = updatedClient.lat === 0 || updatedClient.lng === 0;
      const hasExplicitNewCoords = coordsChanged && !coordinatesMissing;

      // NOTE: We cannot easily doing ASYNC work inside a synchronous setState reducer.
      // So we must keep the async logic OUTSIDE. 
      // This means handleUpdateClient MUST depend on masterClientList or we refactor.
      return prevList; // Placeholder, see logic below
    });

    // REVERTING STRATEGY: 
    // Since we have async logic (geocoding) that depends on "original" state, 
    // and we want to avoid re-creating this handler every time the list changes...
    // The best pattern here without major refactor is to use a Ref for the list.

    // For now, I will implement a standard useCallback but I acknowledge it will update when masterClientList changes.
    // However, fast typing updates might be filtered if we ensure other props are stable.

    // Actually, we can optimize by making the heavy geocoding independent of the list.
    // 'original' is just needed to know if we SHOULD geocode. 
    // If the user passes a flag or if we just compare with what we have...

    // Let's stick to simple useCallback for now, adding masterClientList as dependency.
    // It's better than no hook.

    const original = masterClientList.find(c => c.id === updatedClient.id);
    const finalClient = { ...updatedClient };

    const addressChanged = original && original.cleanAddress !== updatedClient.cleanAddress;
    const plusCodeChanged = original && original.plusCode !== updatedClient.plusCode;
    const coordsChanged = original && (original.lat !== updatedClient.lat || original.lng !== updatedClient.lng);
    const coordinatesMissing = updatedClient.lat === 0 || updatedClient.lng === 0;

    const hasExplicitNewCoords = coordsChanged && !coordinatesMissing;

    if (!hasExplicitNewCoords && (addressChanged || plusCodeChanged || coordinatesMissing)) {
      const detailedAddress = [
        updatedClient.cleanAddress,
        updatedClient.district,
        updatedClient.city,
        updatedClient.state,
        updatedClient.zip,
        updatedClient.region,
        updatedClient.country || 'Brasil'
      ].filter(Boolean).join(', ');

      const geoResult = await geocodeWithFallback([
        updatedClient.plusCode,
        detailedAddress,
        updatedClient.cleanAddress,
        updatedClient.originalAddress
      ]);

      if (geoResult) {
        finalClient.lat = geoResult.lat;
        finalClient.lng = geoResult.lng;
        if (geoResult.formattedAddress) finalClient.cleanAddress = geoResult.formattedAddress;

        if (!finalClient.plusCode) {
          const plusCode = await reverseGeocodePlusCode(finalClient.lat, finalClient.lng, googleMapsApiKey || '');
          if (plusCode) finalClient.plusCode = plusCode;
        }
      }
    } else if (!finalClient.plusCode && finalClient.lat && finalClient.lng) {
      const plusCode = await reverseGeocodePlusCode(finalClient.lat, finalClient.lng, googleMapsApiKey || '');
      if (plusCode) finalClient.plusCode = plusCode;
    }

    setMasterClientList(prev => prev.map(c => c.id === finalClient.id ? finalClient : c));

    if (currentUser) {
      logActivityToCloud({
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'UPDATE',
        category: 'CLIENTS',
        details: `Atualizou o cliente: ${finalClient.companyName}`,
        metadata: { clientId: finalClient.id }
      });
    }
    toast.success(`Cliente ${finalClient.companyName} atualizado com sucesso!`);
  }, [masterClientList, currentUser, googleMapsApiKey, toast, setMasterClientList]);

  const handleAddClient = React.useCallback(async (newClient: Omit<EnrichedClient, 'id' | 'lat' | 'lng' | 'cleanAddress'> & { id?: string; lat?: number; lng?: number; cleanAddress?: string }) => {
    // 1. Geocode Address if coordinates are missing
    const finalClient: EnrichedClient = {
      ...newClient,
      id: (newClient as any).id || crypto.randomUUID(),
      lat: newClient.lat || 0,
      lng: newClient.lng || 0,
      cleanAddress: newClient.cleanAddress || ''
    };

    if ((!finalClient.lat || !finalClient.lng) || finalClient.lat === 0) {
      const geoResult = await geocodeWithFallback([
        finalClient.plusCode,
        finalClient.cleanAddress,
        finalClient.originalAddress
      ]);

      if (geoResult) {
        finalClient.lat = geoResult.lat;
        finalClient.lng = geoResult.lng;
        if (geoResult.formattedAddress) finalClient.cleanAddress = geoResult.formattedAddress;
        console.log(`[APP] Geocoding for manual client successful: ${finalClient.lat}, ${finalClient.lng}`);

        // Auto-generate Plus Code if missing
        if (!finalClient.plusCode) {
          const plusCode = await reverseGeocodePlusCode(finalClient.lat, finalClient.lng, googleMapsApiKey || '');
          if (plusCode) finalClient.plusCode = plusCode;
        }
      } else {
        console.warn(`[APP] Geocoding for manual client FAILED: ${finalClient.companyName}`);
      }
    } else if (!finalClient.plusCode && finalClient.lat && finalClient.lng) {
      // Coords provided but no plus code
      const plusCode = await reverseGeocodePlusCode(finalClient.lat, finalClient.lng, googleMapsApiKey || '');
      if (plusCode) finalClient.plusCode = plusCode;
    }

    // 2. Add to list
    setMasterClientList(prev => [...prev, finalClient]);

    // Log the action
    if (currentUser) {
      logActivityToCloud({
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CREATE',
        category: 'CLIENTS',
        details: `Cadastrou manualmente o cliente: ${finalClient.companyName}`,
        metadata: { clientId: finalClient.id }
      });
    }
    toast.success(`Cliente ${finalClient.companyName} adicionado com sucesso!`);

    // 3. Scroll to bottom
    setTimeout(() => {
      const listContainer = document.querySelector('.overflow-y-auto');
      if (listContainer) {
        listContainer.scrollTop = listContainer.scrollHeight;
      }
    }, 100);
  }, [currentUser, googleMapsApiKey, toast, setMasterClientList]);

  const handleClearClients = () => {
    let targetId: string | undefined;
    let targetName = "TODOS";

    // Determine context for granular clear
    if (currentUser && isAdmin(currentUser.role)) {
      if (filterSalespersonId !== 'Todos') {
        targetId = filterSalespersonId;
        const u = users.find(u => u.id === targetId);
        targetName = u?.name || 'Desconhecido';
      } else if (targetUploadUserId) {
        targetId = targetUploadUserId;
        const u = users.find(u => u.id === targetId);
        targetName = u?.name || 'Desconhecido';
      }
    } else if (currentUser && isSalesTeam(currentUser.role)) {
      // Salesperson can only clear their own? Or system policy?
      // Let's assume for now they clear their own view, which is effectively "their" data if segmented.
      // However, often local storage is shared. Let's ask confirmation.
      targetId = currentUser.id;
      targetName = currentUser.name;
    }

    const isPartial = !!targetId;

    const message = isPartial
      ? `Deseja remover APENAS os clientes de ${targetName}? (Os outros dados serão mantidos)`
      : `Tem certeza que deseja DELETAR TODOS os clientes do sistema? Isso removerá todo o histórico.`;

    showConfirm(
      isPartial ? 'Limpeza Parcial' : 'AVISO CRÍTICO',
      message,
      () => {
        if (isPartial && targetId) {
          setMasterClientList(prev => prev.filter(c => c.salespersonId !== targetId));
          toast.success(`Dados de ${targetName} removidos!`);
        } else {
          setMasterClientList([]);
          localStorage.removeItem('vendas_ai_clients');
          toast.success('Base de dados limpa com sucesso!');
        }

        setProcState({
          isActive: false, total: 0, current: 0, fileName: '', ownerName: '', status: 'processing'
        });
      }
    );
  };

  // Simulate Sales Logic
  const distributeProductsToClients = (clients: EnrichedClient[], allProducts: Product[]) => {
    if (allProducts.length === 0) return;

    const updatedClients = clients.map(client => {
      // If client already has products, keep them unless we want to refresh
      if (client.purchasedProducts && client.purchasedProducts.length > 0) return client;

      // Find products matching client category
      let eligibleProducts = allProducts.filter(p =>
        (client.category || []).some(cat =>
          (p.category || '').toLowerCase().includes((cat || '').toLowerCase()) ||
          (cat || '').toLowerCase().includes((p.category || '').toLowerCase())
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

      return { ...client, purchasedProducts: selected.map(p => ({ ...p, purchaseDate: new Date().toISOString() })) };
    });

    setMasterClientList(updatedClients as EnrichedClient[]);
  };

  const handleInvalidKey = async () => {
    setIsGoogleMapsModalOpen(true);
  };

  const handleConfirmMapKey = (newKey: string) => {
    if (newKey && newKey.trim()) {
      setGoogleMapsApiKey(newKey.trim());
      localStorage.setItem('google_maps_api_key', newKey.trim());
      setKeyVersion(v => v + 1);
      setIsGoogleMapsModalOpen(false);
    }
  };

  // --- Derived Data ---
  // Derived state (filteredClients, availableStates, etc.) is now handled by useFilters hook


  // --- Actions ---
  const handleLogin = (user: AppUser) => {
    login(user); // Assuming 'user' object contains necessary info, or 'username' is derived from it

    // Log login success (we might need to check if login was successful if the hook returns a result)
    // For now, assume if the call is made it's a login attempt/success
    logActivityToCloud({
      timestamp: new Date().toISOString(),
      userId: user.id, // Fallback if currentUser isn't set yet
      userName: user.name,
      userRole: 'UNKNOWN', // Will be populated in next log after session starts
      action: 'LOGIN',
      category: 'AUTH',
      details: `Tentativa de login concluída para o usuário: ${user.name}`
    });
    resetFilters();
    handleViewNavigation('map');
    setIsMobileMenuOpen(false); // Close menu on login
    if (isAdmin(user.role)) {
      const firstSeller = users.find(u => isSalesTeam(u.role));
      if (firstSeller) setTargetUploadUserId(firstSeller.id);
    }
  };

  const handleConfirmCNPJaKey = (key: string) => {
    localStorage.setItem('cnpja_api_key', key);
    setIsCNPJaModalOpen(false);
    showAlert("Sucesso", "Chave CNPJa atualizada! Tente realizar a consulta novamente.", "success");
  };

  const handleLogout = async () => {
    console.warn('[AUTH] Logout iniciado pelo usuário.');

    if (procState.isActive && procState.status === 'processing') {
      if (!window.confirm("📦 O sistema está processando dados. Sair agora pode interromper o progresso. Deseja sair mesmo assim?")) {
        return;
      }
      isUploadCancelled.current = true;
    }

    try {
      // 1. Marcar como Offline (Não bloqueante)
      if (currentUser) {
        updateUserStatusInCloud(currentUser.id, 'Offline', users).catch(() => { });
      }

      // 2. Salvamento final ultra-rápido (1.5s max)
      if (isFirebaseConnected && users.length > 0) {
        const savePromise = saveToCloud(masterClientList, products, categories, users, uploadedFiles);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500));

        await Promise.race([savePromise, timeoutPromise]).catch(() => {
          console.warn('[AUTH] Salvamento final ignorado para agilizar saída.');
        });
      }
    } catch (e) {
      console.error("[AUTH] Erro silencioso no logout:", e);
    } finally {
      console.warn('[AUTH] Executando logout local e limpando filtros...');
      authLogout();
      resetFilters();
      setIsMobileMenuOpen(false);

      // Pequeno delay para garantir que o estado do React atualize antes de um possível refresh manual ou automático
      setTimeout(() => {
        if (window.location.hash) window.location.hash = '';
        // Opcional: window.location.reload(); // Só ativar se o usuário reportar que a tela de login não apareceu
      }, 100);
    }
  };

  const handleClientFileDirect = async (file: File, ownerId: string, skipConfirmation = false) => {
    // Determine owner name (if not passed, though we change signature to not require it as param)
    // Actually, ownerName was a param but ownerId allows us to lookup.
    // We will derive ownerName inside.
    const owner = users.find(u => u.id === ownerId);
    const ownerName = owner ? owner.name : 'Desconhecido';

    if (masterClientList.length > 0 && !skipConfirmation) {
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

    // Reset Cancellation Flag
    isUploadCancelled.current = false;

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

      // Upload file to Cloud Storage for history/backup
      try {
        const timestamp = new Date().getTime();
        const storagePath = `uploads/clients/${ownerId}/${timestamp}_${file.name}`;
        const downloadUrl = await uploadFileToCloud(file, storagePath);
        if (downloadUrl) {
          (newFileRecord as any).storageUrl = downloadUrl;
          console.log(`[APP] CSV file uploaded to Storage: ${downloadUrl}`);
        }
      } catch (storageErr) {
        console.error("[APP] Failed to upload file to Storage:", storageErr);
      }

      setUploadedFiles(prev => [newFileRecord, ...prev]);

      setProcState(prev => ({ ...prev, total: rawData.length, status: 'processing' }));

      const enrichedData = await processClientsWithAI(
        rawData,
        ownerId,
        categories,
        (processed, total) => {
          if (isUploadCancelled.current) throw new Error("CANCELLED_BY_USER");
          setProcState(prev => ({ ...prev, current: processed, total: total }));
        }
      );

      // Tag clients with Source File ID
      const taggedData = enrichedData.map(c => ({
        ...c,
        sourceFileId: fileId
      }));

      // Update Master List - UPSERT mode (Merge existing clients)
      setMasterClientList(prev => {
        const list = [...prev];
        taggedData.forEach(newClient => {
          const cleanNewCnpj = newClient.cnpj?.replace(/\D/g, '');

          const existingIdx = list.findIndex(c => {
            const cleanCnpj = c.cnpj?.replace(/\D/g, '');
            if (cleanNewCnpj && cleanCnpj && cleanNewCnpj.length === 14 && cleanCnpj.length === 14) {
              return cleanNewCnpj === cleanCnpj;
            }
            // Fallback to Name + City matching if CNPJ is missing
            return c.companyName.toLowerCase().trim() === newClient.companyName.toLowerCase().trim() &&
              c.city.toLowerCase().trim() === newClient.city.toLowerCase().trim();
          });

          if (existingIdx !== -1) {
            // MERGE: Keep existing data if new is missing, but prefer new data for updates
            const existing = list[existingIdx];
            list[existingIdx] = {
              ...existing,
              ...newClient,
              // Special preservation: don't overwrite with empty values if we have data
              ownerName: newClient.ownerName || existing.ownerName,
              contact: newClient.contact || existing.contact,
              whatsapp: newClient.whatsapp || existing.whatsapp,
              cnpj: newClient.cnpj || existing.cnpj,
              mainCnae: newClient.mainCnae || existing.mainCnae,
              secondaryCnaes: (newClient.secondaryCnaes && newClient.secondaryCnaes.length > 0) ? newClient.secondaryCnaes : existing.secondaryCnaes,
              lat: (newClient.lat !== 0) ? newClient.lat : existing.lat,
              lng: (newClient.lng !== 0) ? newClient.lng : existing.lng,
              googleMapsUri: newClient.googleMapsUri || existing.googleMapsUri,
              plusCode: newClient.plusCode || existing.plusCode,
              // Keep original source file ID if the new one doesn't have a valid one? 
              // Actually newClient always has the new fileId from taggedData.
            };
          } else {
            list.push(newClient);
          }
        });
        return list;
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

      const isCancelled = err.message === 'CANCELLED_BY_USER';
      const errorMsg = isCancelled ? 'Cancelado pelo usuário.' : (err.message || "Erro desconhecido");

      // Update procState. If cancelled, we might want to hide it or show "Cancelled" state.
      // User said "para de processar na tela", implying the box should close or stop showing progress.
      // Setting isActive: false hides the toast.
      const shouldHide = isCancelled;

      setProcState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: errorMsg,
        isActive: !shouldHide
      }));

      // Update file status
      setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error', errorMessage: errorMsg } : f));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    await handleUnifiedFileUpload(file);
    event.target.value = '';
  };

  const handleUnifiedFileUpload = async (file: File) => {
    if (!currentUser) return;

    // 1. Detect Type
    // For Excel files, we temporarily assume 'clients' or handle specifically if needed, 
    // but the request focuses on CSV for now.
    let type: 'clients' | 'products' | 'purchases' = 'clients';

    if (file.name.toLowerCase().endsWith('.csv')) {
      // Need a quick peek at the headers
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const firstLine = text.split('\n')[0];
        const headers = firstLine.split(',').map(h => h.trim().replace(/"/g, ''));
        type = detectCSVType(headers);
        console.log(`[APP] Auto-Detected File Type: ${type}`);

        await routeFileUpload(file, type);
      };
      reader.readAsText(file.slice(0, 1000));
    } else {
      // Standard Excel routing
      await routeFileUpload(file, 'clients');
    }
  };

  const routeFileUpload = async (file: File, type: 'clients' | 'products' | 'purchases') => {
    let ownerId = currentUser!.id;
    if (isAdmin(currentUser!.role) && targetUploadUserId) {
      ownerId = targetUploadUserId;
    }

    switch (type) {
      case 'clients':
        await handleClientFileDirect(file, ownerId);
        break;
      case 'products':
        await handleProductFileUpload(file);
        break;
      case 'purchases':
        await handlePurchaseUpdateUpload(file, ownerId);
        break;
    }
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

  const handleAddUser = (user: AppUser) => {
    // 1. Local update
    baseAddUser(user);

    // 2. Immediate Cloud Save
    const updatedUsers = [...users, user];
    saveToCloud(masterClientList, products, categories, updatedUsers, uploadedFiles)
      .then(() => console.warn('[AUTH] Salvamento de novo usuário na nuvem concluído ✅'))
      .catch(e => console.error('[AUTH] Falha no salvamento imediato do novo usuário:', e));

    // 3. Log the action
    if (currentUser) {
      logActivityToCloud({
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CREATE',
        category: 'USERS',
        details: `Adicionou um novo usuário: ${user.name} (${user.role})`,
        metadata: { targetUserId: user.id }
      });
    }
  };

  const handleUpdateUser = (updatedUser: AppUser) => {
    // 1. Local update
    baseUpdateUser(updatedUser);

    // 2. Immediate Cloud Save
    const updatedUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    saveToCloud(masterClientList, products, categories, updatedUsers, uploadedFiles)
      .then(() => console.warn('[AUTH] Atualização de usuário na nuvem concluída ✅'))
      .catch(e => console.error('[AUTH] Falha no salvamento imediato da atualização:', e));

    // 3. Log the action
    if (currentUser) {
      logActivityToCloud({
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'UPDATE',
        category: 'USERS',
        details: `Atualizou os dados do usuário: ${updatedUser.name}`,
        metadata: { targetUserId: updatedUser.id }
      });
    }
  };

  const handleDeleteUser = (userId: string) => {
    const targetUser = users.find(u => u.id === userId);

    // 1. Local update
    baseDeleteUser(userId);

    // 2. Immediate Cloud Save
    const updatedUsers = users.filter(u => u.id !== userId);
    saveToCloud(masterClientList, products, categories, updatedUsers, uploadedFiles)
      .then(() => console.warn('[AUTH] Exclusão de usuário na nuvem concluída ✅'))
      .catch(e => console.error('[AUTH] Falha no salvamento imediato da exclusão:', e));

    // 3. Log the action
    if (currentUser && targetUser) {
      logActivityToCloud({
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'DELETE',
        category: 'USERS',
        details: `Removeu o usuário: ${targetUser.name}`,
        metadata: { targetUserId: userId }
      });
    }
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
      handleViewNavigation('map');
      setFilterSalespersonId(newSalespersonId);
      alert(`Arquivo e ${filteredClients.filter(c => c.sourceFileId === fileId).length} clientes reatribuídos para: ${newSalespersonName}\n\nMapa filtrado automaticamente.`);
    } else {
      // Unassigned - show all
      setFilterSalespersonId('Todos');
      alert('Arquivo desmarcado. Clientes ficaram sem vendedor até que outro seja atribuído.');
    }
  };





  const handlePurchaseUpdateUpload = async (file: File, targetUserId: string) => {
    const fileId = crypto.randomUUID();
    setProcState({
      isActive: true, total: 0, current: 0, fileName: file.name, ownerName: 'Sistema', status: 'reading'
    });

    try {
      const records = await parsePurchaseHistoryCSV(file);
      if (records.length === 0) throw new Error("Arquivo vazio ou sem registros válidos.");

      // Group by client
      const groupedByClient = records.reduce((acc, rec) => {
        // Use normalized CNPJ if available, otherwise normalized name as group key
        const key = rec.cnpj ? rec.cnpj : (rec.companyName || '').toLowerCase().trim();
        if (!acc[key]) acc[key] = [];
        acc[key].push(rec);
        return acc;
      }, {} as Record<string, typeof records>);

      const clientKeysInFile = Object.keys(groupedByClient);

      setProcState(prev => ({ ...prev, total: clientKeysInFile.length, status: 'processing' }));

      let updatedCount = 0;
      setMasterClientList(prevList => {
        const newList = [...prevList];
        clientKeysInFile.forEach((key, index) => {
          setProcState(prev => ({ ...prev, current: index + 1 }));

          const clientPurchases = groupedByClient[key];
          const firstRec = clientPurchases[0];

          // Find client index: Prioritize CNPJ match, fallback to Name match
          let clientIdx = -1;

          if (firstRec.cnpj) {
            clientIdx = newList.findIndex(c => {
              const cleanSystemCnpj = (c.cnpj || '').replace(/[./-]/g, "");
              return cleanSystemCnpj === firstRec.cnpj;
            });
          }

          if (clientIdx === -1) {
            const normalizedFileName = (firstRec.companyName || '').toLowerCase().trim();
            clientIdx = newList.findIndex(c => (c.companyName || '').toLowerCase().trim() === normalizedFileName);
          }

          if (clientIdx !== -1) {
            updatedCount++;
            const clientPurchases = groupedByClient[key];

            // Map CSV records to PurchaseRecord objects
            const newPurchasedProducts: PurchaseRecord[] = clientPurchases.map((rec: any) => {
              // Try to enrich with master catalog
              const masterProd = products.find(p =>
                (rec.sku && p.sku === rec.sku) ||
                (p.name && rec.name && (p.name || '').toLowerCase().trim() === (rec.name || '').toLowerCase().trim())
              );

              if (masterProd) {
                return { ...masterProd, purchaseDate: rec.purchaseDate, quantity: rec.quantity, totalValue: rec.totalValue };
              } else {
                // Fallback for missing product in catalog
                return {
                  sku: rec.sku || 'N/A',
                  name: rec.name || 'Produto Desconhecido',
                  brand: 'Desconhecido',
                  category: 'Manual',
                  price: rec.price || 0,
                  factoryCode: '',
                  purchaseDate: rec.purchaseDate,
                  quantity: rec.quantity,
                  totalValue: rec.totalValue
                };
              }
            });

            // UPDATE CLIENT: ACCUMULATE AND MERGE (With Duplicate Prevention)
            const existingHistory = newList[clientIdx].purchasedProducts || [];

            // Filter out records that already exist (Same SKU and Same Date)
            const filteredNewProducts = newPurchasedProducts.filter(newP =>
              !existingHistory.some(oldP => oldP.sku === newP.sku && oldP.purchaseDate === newP.purchaseDate)
            );

            if (filteredNewProducts.length > 0) {
              newList[clientIdx] = {
                ...newList[clientIdx],
                purchasedProducts: [
                  ...existingHistory,
                  ...filteredNewProducts
                ]
              };
            }
          }
        });
        return newList;
      });

      // Create File Record
      const newFileRecord: UploadedFile = {
        id: fileId,
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        salespersonId: targetUserId,
        salespersonName: users.find(u => u.id === targetUserId)?.name || 'Vendedor',
        type: 'purchases',
        itemCount: records.length,
        status: 'completed'
      };

      // Upload search file to Cloud Storage
      try {
        const timestamp = new Date().getTime();
        const storagePath = `uploads/purchases/${timestamp}_${file.name}`;
        await uploadFileToCloud(file, storagePath).then(url => {
          if (url) (newFileRecord as any).storageUrl = url;
        });
      } catch (storageErr) {
        console.error("[APP] Failed to upload purchase file to Storage:", storageErr);
      }

      setUploadedFiles(prev => [newFileRecord, ...prev]);
      setProcState({ isActive: false, total: 0, current: 0, fileName: '', ownerName: '', status: 'completed' });

      alert(`✅ Atualização de Compras concluída!\n\n${updatedCount} clientes identificados e com histórico renovado.`);

    } catch (e: any) {
      console.error(e);
      setProcState(prev => ({ ...prev, status: 'error', errorMessage: e.message }));
      setUploadedFiles(prev => [...prev, {
        id: fileId,
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        salespersonId: targetUserId,
        salespersonName: users.find(u => u.id === targetUserId)?.name || 'Vendedor',
        type: 'purchases',
        itemCount: 0,
        status: 'error',
        errorMessage: e.message
      }]);
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

      // Upload product file to Cloud Storage
      try {
        const timestamp = new Date().getTime();
        const storagePath = `uploads/products/${timestamp}_${file.name}`;
        const downloadUrl = await uploadFileToCloud(file, storagePath);
        if (downloadUrl) {
          (newFileRecord as any).storageUrl = downloadUrl;
        }
      } catch (storageErr) {
        console.error("[APP] Failed to upload product file to Storage:", storageErr);
      }

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


  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LcyKmUsAAAAAC-uUPRRD2ZMZRJu_dBPUH5Gp4gm";

  // Debug: Log da chave configurada (apenas primeros caracteres por segurança)
  console.log('[APP] reCAPTCHA Key Source:', import.meta.env.VITE_RECAPTCHA_SITE_KEY ? 'ENV VAR' : 'FALLBACK');
  console.log('[APP] reCAPTCHA Key (first 10 chars):', recaptchaKey.substring(0, 10) + '...');
  console.log('[APP] Environment:', import.meta.env.MODE);
  console.warn(`[APP] Build Version: 2026.02.13.1613 (V5.3.3 - Turbo Processing)`);

  if (!isDataLoaded) {
    return <LoadingScreen progress={loadingProgress} message={loadingMessage} />;
  }

  if (!currentUser) {
    return (
      <GoogleReCaptchaProvider
        reCaptchaKey={recaptchaKey}
        language="pt-BR"
        scriptProps={{
          async: true,
          defer: true,
          appendTo: 'body'
        }}
      >
        <React.Suspense fallback={<LoadingScreen progress={100} message="Carregando Login..." />}>
          <LoginScreen users={users} onLogin={handleLogin} />
        </React.Suspense>
      </GoogleReCaptchaProvider>
    );
  }

  const isAdminUser = isAdmin(currentUser.role);
  const canViewAllData = hasFullDataVisibility(currentUser.role);
  const isProductFilterActive = filterProductCategory !== 'Todos' || filterProductSku !== 'Todos' || searchProductQuery !== '';

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={recaptchaKey}
      language="pt-BR"
      scriptProps={{
        async: true,
        defer: true,
        appendTo: 'body'
      }}
    >
      <div className="flex h-screen bg-gray-50 font-sans text-gray-800 overflow-hidden relative">

        {/* MOBILE OVERLAY */}
        {isMobileMenuOpen && (
          <div
            className="absolute inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Fechar menu"
            onKeyDown={(e) => e.key === 'Escape' && setIsMobileMenuOpen(false)}
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
              Rota de Vendas
            </h1>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden text-on-surface-variant hover:text-primary"
              title="Fechar menu lateral"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="px-6 py-2">
            <p className="text-xs font-medium text-on-surface-variant/80 uppercase tracking-wider">
              {isAdminUser ? 'Painel Administrativo' : 'Portal do Vendedor'}
            </p>
          </div>

          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            <div className="bg-surface-container-highest rounded-2xl p-4 mb-6 border border-outline-variant/30 shadow-sm relative overflow-hidden group">
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>
              <p className="text-xs text-on-surface-variant uppercase font-bold tracking-wider mb-2 relative z-10">Logado como</p>
              <div className="flex flex-col gap-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md overflow-hidden ${isAdminUser ? 'bg-tertiary' : 'bg-secondary'}`}>
                      {currentUser.photoURL ? (
                        <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span>{currentUser.name.charAt(0)}</span>
                      )}
                    </div>
                    {/* Status Indicator Badge */}
                    <div className={`
                      absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface-container-highest shadow-sm
                      ${currentUser.status === 'Online' ? 'bg-green-500' : currentUser.status === 'Ocupado' ? 'bg-amber-500' : 'bg-slate-400'}
                    `}></div>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-on-surface truncate">{currentUser.name}</p>
                    <p className="text-xs text-on-surface-variant truncate opacity-80">{currentUser.email}</p>
                  </div>
                </div>

                {/* Status Selector */}
                <div className="flex items-center gap-2 pt-1 border-t border-outline-variant/10">
                  <select
                    value={currentUser.status || 'Offline'}
                    onChange={async (e) => {
                      const newStatus = e.target.value as UserStatus;
                      // Atualizar localmente primeiro para feedback instantâneo
                      baseUpdateUser({ ...currentUser, status: newStatus });

                      const { updateUserStatusInCloud } = await import('./services/firebaseService');
                      await updateUserStatusInCloud(currentUser.id, newStatus, users);
                    }}
                    className={`
                      text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded-full border transition-all cursor-pointer outline-none bg-surface/50
                      ${currentUser.status === 'Online' ? 'border-green-200 text-green-700 hover:bg-green-50' :
                        currentUser.status === 'Ocupado' ? 'border-amber-200 text-amber-700 hover:bg-amber-50' :
                          'border-slate-200 text-slate-500 hover:bg-slate-50'}
                    `}
                  >
                    <option value="Online">🟢 Online</option>
                    <option value="Ocupado">🟡 Ocupado</option>
                    <option value="Offline">⚪ Offline</option>
                  </select>
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

              {isAdminUser && (
                <button
                  onClick={() => { handleViewNavigation('dashboard'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'dashboard'
                    ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
                    }`}
                >
                  <LayoutDashboard className={`w-5 h-5 ${activeView === 'dashboard' ? 'fill-current' : ''}`} />
                  Dashboard Admin
                </button>
              )}

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

              <button
                onClick={() => { setActiveView('history'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'history'
                  ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
                  }`}
              >
                <History className={`w-5 h-5 ${activeView === 'history' ? 'fill-current' : ''}`} />
                Histórico de Vendas
              </button>

              <button
                onClick={() => { setActiveView('chat'); setIsMobileMenuOpen(false); if (activeConversationId) handleChatMarkAsRead(activeConversationId); }}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'chat'
                  ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className={`w-5 h-5 ${activeView === 'chat' ? 'fill-current' : ''}`} />
                  Mensagens Internas
                </div>
                {totalUnread > 0 && activeView !== 'chat' && (
                  <div className="bg-error text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                    {totalUnread}
                  </div>
                )}
              </button>
            </nav>

            {isAdminUser && (
              <nav className="space-y-1 mb-8">
                <p className="px-3 text-xs font-bold text-on-surface-variant/60 uppercase mb-3 tracking-wider">Administração</p>

                <button
                  onClick={() => { handleViewNavigation('admin_users'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'admin_users'
                    ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
                    }`}
                >
                  <UsersIcon className={`w-5 h-5 ${activeView === 'admin_users' ? 'fill-current' : ''}`} />
                  Gerenciar Usuários
                </button>

                <button
                  onClick={() => { handleViewNavigation('admin_categories'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'admin_categories'
                    ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
                    }`}
                >
                  <Layers className={`w-5 h-5 ${activeView === 'admin_categories' ? 'fill-current' : ''}`} />
                  Categorias
                </button>

                <button
                  onClick={() => { handleViewNavigation('admin_products'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'admin_products'
                    ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
                    }`}
                >
                  <Package className={`w-5 h-5 ${activeView === 'admin_products' ? 'fill-current' : ''}`} />
                  Produtos
                </button>

                <button
                  onClick={() => { handleViewNavigation('admin_files'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${activeView === 'admin_files'
                    ? 'bg-secondary-container text-on-secondary-container shadow-sm font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container-highest active:scale-95'
                    }`}
                >
                  <FileUp className={`w-5 h-5 ${activeView === 'admin_files' ? 'fill-current' : ''}`} />
                  Arquivos
                </button>

                {currentUser?.role === 'admin_dev' && (
                  <button
                    onClick={() => { setIsCloudConfigOpen(true); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 text-on-surface-variant hover:bg-surface-container-highest active:scale-95`}
                  >
                    <Cloud className="w-5 h-5" />
                    Backup & Cloud
                  </button>
                )}
                {currentUser?.role === 'admin_dev' && (
                  <button
                    onClick={() => {
                      setIsLogPanelOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all hover:bg-slate-100 group"
                    title="🖥️ Logs e Auditoria do Sistema"
                  >
                    <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <Activity className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900">Logs do Sistema</span>
                  </button>
                )}
              </nav>
            )}
          </div>

          <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-error bg-error-container hover:bg-error-container/80 rounded-full transition-colors shadow-sm"
              title="Encerrar sessão e sair do sistema"
            >
              <LogOut className="w-4 h-4 box-content" /> Sair do Sistema
            </button>

            <div className="text-center mt-4">
              <p className="text-[10px] text-on-surface-variant opacity-60">Versão 3.5.0 V5.3.4 (Cancel Resilience)</p>
            </div>
          </div>
        </aside>

        {/* TOP BAR FOR MOBILE */}
        <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-surface-container-low shadow-sm z-10 flex items-center justify-between px-4 border-b border-outline-variant/30">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-on-surface hover:bg-surface-container-highest rounded-full transition-colors"
            title="Abrir menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold text-lg text-primary flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5" /> Rota de Vendas
          </span>
          <div className="w-10"></div> {/* Spacer for center alignment */}
        </header>


        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-surface transition-all duration-300 md:pt-0 pt-16">

          {/* Floating Add Button for Mobile (when not in admin views) */}
          {!isAdminUser && activeView === 'table' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-elevation-2 flex items-center justify-center z-50 animate-bounce-in"
              title="Adicionar Novo Cliente"
            >
              <UsersIcon className="w-6 h-6" />
            </button>
          )}
          {/* MODALS */}
          <React.Suspense fallback={null}> {/* Fallback null for modals is usually fine or a small spinner */}
            <CloudConfigModal
              isOpen={isCloudConfigOpen}
              onClose={() => setIsCloudConfigOpen(false)}
              onSaveToCloud={() => {
                saveToCloud(masterClientList, products, categories, users);
                alert('✅ Dados salvos na nuvem com sucesso!');
              }}
              onClearDatabase={handleClearAllClients}
              isFirebaseConnected={isFirebaseConnected}
            />

            <GoogleMapsKeyModal
              isOpen={isGoogleMapsModalOpen}
              onClose={() => setIsGoogleMapsModalOpen(false)}
              onConfirm={handleConfirmMapKey}
              suggestedKey={SUGGESTED_MAP_KEY}
            />

            <CNPJaKeyModal
              isOpen={isCNPJaModalOpen}
              onClose={() => setIsCNPJaModalOpen(false)}
              onConfirm={handleConfirmCNPJaKey}
            />

            {isAddModalOpen && (
              <AddClientModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddClient}
                salespersonId={currentUser?.id || ''}
                ownerName={currentUser?.name || 'Sistema'}

                users={users} // Pass users to auto-assign current user

              />
            )}

            {isEditModalOpen && selectedClient && (
              <EditClientModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleUpdateClient}
                client={selectedClient}

                users={users}
              />
            )}
          </React.Suspense>

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
                    activeView === 'dashboard' ? 'Dashboard Administrativo' :
                      activeView === 'admin_categories' ? 'Categorias de Clientes' :
                        activeView === 'admin_products' ? 'Catálogo de Produtos' :
                          activeView === 'chat' ? 'Mensagens Internas' : 'Gestão de Usuários'}
              </span>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-gray-400">
                  {isAdminUser ? 'Clientes Visualizados' : 'Meus Clientes'}
                </p>
                <p className="text-lg font-bold leading-none">{visibleClients.length}</p>
              </div>
              {isAdminUser && (
                <div className="text-right border-l pl-6 border-gray-200">
                  <p className="text-xs text-gray-400">Total Sistema</p>
                  <p className="text-lg font-bold leading-none text-purple-600">{masterClientList.length}</p>
                </div>
              )}
            </div>
          </header>

          {
            activeView === 'admin_users' && isAdminUser ? (
              <React.Suspense fallback={<LoadingScreen progress={100} message="Carregando Admin..." />}>
                <div className="flex-1 overflow-y-auto bg-gray-50">
                  <AdminUserManagement
                    currentUser={currentUser}
                    users={users}
                    onAddUser={handleAddUser}
                    onUpdateUser={handleUpdateUser}
                    onDeleteUser={handleDeleteUser}
                    onCleanupDuplicates={handleCleanupDuplicates}
                    totalClients={masterClientList.length}
                  />
                </div>
              </React.Suspense>
            ) : activeView === 'admin_categories' && isAdminUser ? (
              <React.Suspense fallback={<LoadingScreen progress={100} message="Carregando Categorias..." />}>
                <div className="flex-1 overflow-y-auto bg-gray-50">
                  <AdminCategoryManagement
                    categories={categories}
                    onAddCategory={handleAddCategory}
                    onDeleteCategory={handleDeleteCategory}
                  />
                </div>
              </React.Suspense>
            ) : activeView === 'admin_products' && isAdminUser ? (
              <React.Suspense fallback={<LoadingScreen progress={100} message="Carregando Produtos..." />}>
                <div className="flex-1 overflow-y-auto bg-gray-50">
                  <AdminProductManagement
                    products={products}
                    onUploadProducts={handleUploadProducts}
                    onClearProducts={handleClearProducts}
                    onSaveProducts={handleSaveProducts}
                  />
                </div>
              </React.Suspense>
            ) : activeView === 'admin_files' && isAdminUser ? (
              <React.Suspense fallback={<LoadingScreen progress={100} message="Carregando Arquivos..." />}>
                <div className="flex-1 overflow-y-auto bg-gray-50">
                  <AdminFileManager
                    users={users}
                    uploadedFiles={uploadedFiles}
                    onUploadClients={(file, targetId) => handleClientFileDirect(file, targetId)}
                    onUploadProducts={handleProductFileUpload}
                    onUploadPurchases={handlePurchaseUpdateUpload}
                    onDeleteFile={handleDeleteFile}
                    onReassignSalesperson={handleReassignFileSalesperson}
                    procState={procState}
                  />
                </div>
              </React.Suspense>
            ) : activeView === 'chat' && currentUser ? (
              <React.Suspense fallback={<LoadingScreen progress={100} message="Carregando Chat..." />}>
                <div className="flex-1 p-4 md:p-6 overflow-hidden">
                  <ChatPanel
                    currentUser={currentUser}
                    allUsers={users}
                    conversations={conversations}
                    messages={messages}
                    activeUserId={activeConversationId}
                    onSelectUser={(userId) => {
                      setActiveConversationId(userId);
                      if (userId) handleChatMarkAsRead(userId);
                    }}
                    onSendMessage={handleChatSendMessage}
                    onDeleteMessage={handleChatDeleteMessage}
                    onClearMessages={handleChatClearMessages}
                  />
                </div>
              </React.Suspense>
            ) : activeView === 'dashboard' && isAdminUser ? (
              <React.Suspense fallback={<LoadingScreen progress={100} message="Carregando Dashboard..." />}>
                <div className="flex-1 overflow-hidden bg-surface">
                  <AdminDashboard
                    clients={filteredClients}
                    products={products}
                    users={users}
                    onClose={() => setActiveView('map')}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    filterRegion={filterRegion}
                    setFilterRegion={setFilterRegion}
                    filterState={filterState}
                    setFilterState={setFilterState}
                    filterCity={filterCity}
                    setFilterCity={setFilterCity}
                    filterCategory={filterCategory}
                    setFilterCategory={setFilterCategory}
                    filterSalespersonId={filterSalespersonId}
                    setFilterSalespersonId={setFilterSalespersonId}
                    filterSalesCategory={filterSalesCategory}
                    setFilterSalesCategory={setFilterSalesCategory}
                    filterCnae={filterCnae}
                    setFilterCnae={setFilterCnae}
                    filterProductCategory={filterProductCategory}
                    setFilterProductCategory={setFilterProductCategory}
                    productCategories={productCategories}
                    startDate={startDate}
                    setStartDate={setStartDate}
                    endDate={endDate}
                    setEndDate={setEndDate}
                    availableStates={availableStates}
                    availableCities={availableCities}
                    availableCnaes={availableCnaes}
                    categories={categories}
                    currentUser={currentUser}
                    isAdminUser={isAdminUser}
                    canViewAllData={canViewAllData}
                  />
                </div>
              </React.Suspense>
            ) : (
              <>
                <div className="bg-gray-100 px-3 py-2.5 border-b border-gray-200 flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Filter className="w-4 h-4" />
                      <span className="text-xs font-bold hidden md:inline">Filtros:</span>
                    </div>

                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-colors ${canViewAllData ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-200'}`}>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${canViewAllData ? 'text-purple-600' : 'text-gray-500'}`}
                        title={isAdminUser ? "Perfil Administrador" : (canViewAllData ? "Perfil Gestor" : "Perfil Vendedor")}
                      >
                        {canViewAllData ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                        {isAdminUser ? 'Admin' : (canViewAllData ? 'Gestão' : 'Vendedor')}
                      </span>

                      <div className="relative">
                        <UserIcon className={`absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${canViewAllData ? 'text-purple-400' : 'text-gray-400'}`} />
                        <select
                          value={canViewAllData ? filterSalespersonId : currentUser?.id || ''}
                          onChange={(e) => canViewAllData && setFilterSalespersonId(e.target.value)}
                          disabled={!canViewAllData}
                          className={`text-xs rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 pl-7 pr-2 py-1 font-medium appearance-none ${canViewAllData ? 'border-purple-300 bg-white text-purple-900 cursor-pointer' : 'border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed'}`}
                          title={!canViewAllData ? "Visualização restrita aos seus clientes" : "Filtrar por vendedor"}
                        >
                          {canViewAllData && <option value="Todos">Todos Vendedores</option>}
                          {/* Show all salespersons for Admin/Managers to choose. For User, show THEMSELVES even if not in 'users' list yet (fallback) */}
                          {canViewAllData
                            ? users.filter(u => u.role === 'salesperson' || u.role === 'sales_external' || u.role === 'sales_internal').map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))
                            : <option value={currentUser?.id}>{currentUser?.name}</option>
                          }
                        </select>
                      </div>

                      {canViewAllData && (
                        <div className="relative animate-fade-in">
                          <Briefcase className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-purple-400 pointer-events-none" />
                          <select
                            value={filterSalesCategory}
                            onChange={(e) => setFilterSalesCategory(e.target.value)}
                            className="text-xs border-purple-300 bg-white text-purple-900 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 pl-7 pr-2 py-1 font-medium"
                            title="Filtrar por equipe de vendas"
                          >
                            <option value="Todos">Todas Equipes</option>
                            <option value="Externo">Externo</option>
                            <option value="Interno">Interno</option>
                            <option value="Mercado Livre">Mercado Livre</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <select
                      value={filterRegion}
                      onChange={(e) => { setFilterRegion(e.target.value); setFilterState('Todos'); setFilterCity('Todas'); }}
                      className="text-xs border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-2 py-1.5"
                      title="Filtrar por região geográfica"
                    >
                      <option value="Todas">Todas Regiões</option>
                      {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>

                    <select
                      value={filterState}
                      onChange={(e) => { setFilterState(e.target.value); setFilterCity('Todas'); }}
                      className="text-xs border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-2 py-1.5"
                      disabled={availableStates.length === 0}
                      title="Filtrar por estado (UF)"
                    >
                      <option value="Todos">Todos Estados {filterRegion !== 'Todas' ? `(${filterRegion})` : ''}</option>
                      {availableStates.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <select
                      value={filterCity}
                      onChange={(e) => setFilterCity(e.target.value)}
                      className="text-xs border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-2 py-1.5 min-w-[100px]"
                      disabled={filterState === 'Todos' || availableCities.length === 0}
                      title="Filtrar por cidade"
                    >
                      <option value="Todas">Todas Cidades</option>
                      {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <div className="flex items-center gap-1 relative">
                      <ShoppingBag className="w-3.5 h-3.5 text-gray-400 absolute left-2 pointer-events-none" />
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="text-xs border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 pl-7 pr-2 py-1.5"
                        title="Filtrar por categoria de cliente"
                      >
                        <option value="Todos">Todas Cat. Clientes</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="flex items-center gap-1 relative">
                      <Briefcase className="w-3.5 h-3.5 text-gray-400 absolute left-2 pointer-events-none" />
                      <select
                        value={filterCnae}
                        onChange={(e) => setFilterCnae(e.target.value)}
                        className="text-xs border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 pl-7 pr-2 py-1.5 max-w-[200px]"
                        title="Filtrar por CNAE (Atividade Econômica)"
                      >
                        <option value="Todos">Todos CNAEs</option>
                        {availableCnaes.map(c => (
                          <option key={c} value={c}>{c.length > 40 ? c.substring(0, 40) + '...' : c}</option>
                        ))}
                      </select>
                    </div>

                    <DateRangePicker
                      startDate={startDate}
                      endDate={endDate}
                      onRangeChange={(start, end) => {
                        setStartDate(start);
                        setEndDate(end);
                      }}
                      label="Período"
                    />
                  </div>

                  {/* Secondary Filters Row: Products */}
                  <div className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 px-2 py-1.5 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 px-2 text-sm font-semibold text-green-700">
                      <Package className="w-4 h-4" />
                      Vendas:
                    </div>

                    <select
                      value={filterProductCategory}
                      onChange={e => setFilterProductCategory(e.target.value)}
                      className={`text-xs rounded-lg px-2 py-1.5 border transition-colors ${filterProductCategory !== 'Todos' ? 'bg-green-50 border-green-300 text-green-800 font-bold' : 'border-gray-300 text-gray-600'}`}
                      title="Filtrar por marca ou categoria de produto"
                    >
                      <option value="Todos">Todas Marcas / Categorias</option>
                      {productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>

                    <div className="relative animate-fade-in">
                      <ShoppingBag className={`absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${filterProductSku !== 'Todos' ? 'text-green-600' : 'text-gray-400'}`} />
                      <select
                        value={filterProductSku}
                        onChange={e => setFilterProductSku(e.target.value)}
                        className={`text-xs rounded-lg pl-7 pr-2 py-1.5 border appearance-none transition-colors max-w-[180px] truncate ${filterProductSku !== 'Todos' ? 'bg-green-50 border-green-300 text-green-800 font-bold' : 'border-gray-300 text-gray-600'}`}
                        title="Filtrar por produto específico"
                      >
                        <option value="Todos">Todos Produtos</option>
                        {products
                          .filter(p => filterProductCategory === 'Todos' || p.category === filterProductCategory)
                          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                          .map(p => (
                            <option key={p.sku} value={p.sku}>{p.name.substring(0, 30)}... ({p.sku})</option>
                          ))
                        }
                      </select>
                    </div>

                    <div className="relative group/search">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                      <input
                        type="text"
                        value={searchProductQuery}
                        onChange={e => {
                          setSearchProductQuery(e.target.value);
                          setShowProductSuggestions(true);
                        }}
                        onFocus={() => setShowProductSuggestions(true)}
                        placeholder="SKU, Marca, Código ou Descrição..."
                        className={`pl-7 pr-3 py-1.5 text-xs border rounded-lg focus:ring-green-500 focus:border-green-500 outline-none w-56 transition-colors ${searchProductQuery ? 'bg-green-50 border-green-300' : 'border-gray-300'}`}
                        title="Buscar produtos por SKU, Marca, Código ou Descrição"
                      />

                      {/* Autocomplete Dropdown */}
                      {showProductSuggestions && searchProductQuery.length >= 2 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                          {(() => {
                            const suggestions = products
                              .filter(p => {
                                const term = searchProductQuery.toLowerCase();
                                return (p.name || '').toLowerCase().includes(term) ||
                                  (p.sku || '').toLowerCase().includes(term) ||
                                  (p.brand || '').toLowerCase().includes(term);
                              })
                              .slice(0, 8);

                            if (suggestions.length === 0) {
                              return (
                                <div className="p-3 text-xs text-gray-500 italic flex items-center gap-2">
                                  <AlertCircle className="w-3 h-3 text-gray-400" />
                                  Não Foi Encontrado
                                </div>
                              );
                            }

                            return suggestions.map(p => (
                              <button
                                key={p.sku}
                                onClick={() => {
                                  setSearchProductQuery(p.sku);
                                  setShowProductSuggestions(false);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 flex flex-col border-b border-gray-50 last:border-0"
                              >
                                <span className="font-bold text-gray-800">{p.name}</span>
                                <span className="text-[10px] text-gray-500 uppercase">{p.sku} • {p.brand}</span>
                              </button>
                            ));
                          })()}
                        </div>
                      )}

                      {/* Explicit "Not Found" message if list is empty and no suggestions */}
                      {!showProductSuggestions && searchProductQuery && filteredClients.length === 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 flex items-center gap-1.5 text-[10px] font-bold text-rose-500 animate-fade-in bg-rose-50 px-2 py-1 rounded border border-rose-100 italic">
                          <AlertCircle className="w-3 h-3" />
                          Não Foi Encontrado
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => setFilterOnlyWithPurchases(true)}
                        className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg border transition-all ${filterOnlyWithPurchases
                          ? 'bg-green-600 border-green-600 text-white shadow-sm'
                          : 'bg-white border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700'
                          }`}
                      >
                        Somente com Compras
                      </button>
                      <button
                        onClick={() => setFilterOnlyWithPurchases(false)}
                        className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg border transition-all ${!filterOnlyWithPurchases
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-700'
                          }`}
                      >
                        Mostrar Todos
                      </button>

                      {isAdminUser && (
                        <button
                          onClick={handleMassUpdateClients}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all text-[10px] font-bold uppercase tracking-wider ml-2"
                          title="Enriquecer toda a base com dados da Receita Federal via CNPJa Comercial"
                        >
                          <Database className="w-3 h-3" /> Atualizar Base (CNPJa)
                        </button>
                      )}
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
                    <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg">
                      {filteredClients.length} resultados encontrados
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden p-1.5 bg-gray-100">

                  {/* Visual Placeholder when empty */}
                  {visibleClients.length === 0 && !procState.isActive ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                      {isAdminUser ? (
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
                    <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
                      {activeView === 'map' ? (
                        <React.Suspense fallback={
                          <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50">
                            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                            <p className="text-lg font-medium text-gray-600">Carregando Mapa...</p>
                            <p className="text-sm text-gray-400">Otimizando sua experiência</p>
                          </div>
                        }>
                          <ClientMap
                            key={`${activeApiKey}-${keyVersion}`} // FORCE REMOUNT when key changes
                            clients={filteredClients}
                            apiKey={googleMapsApiKey}
                            onInvalidKey={handleInvalidKey}
                            productFilterActive={isProductFilterActive}
                            highlightProductTerm={searchProductQuery}
                            activeProductCategory={filterProductCategory}
                            users={users} // Pass users for color coding
                            filterContent={
                              <div className="bg-gray-100/95 backdrop-blur-sm px-3 py-2 flex flex-col gap-1.5">
                                {/* Primary Filters Row */}
                                <div className="flex flex-wrap gap-2 items-center">
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                      type="text"
                                      value={searchQuery}
                                      onChange={(e) => setSearchQuery(e.target.value)}
                                      placeholder="Buscar cliente ou empresa..."
                                      className="pl-9 pr-3 py-1.5 text-sm border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 w-48 border outline-none"
                                      title="Buscar cliente ou empresa"
                                    />
                                  </div>

                                  <div className="h-5 w-px bg-gray-300 mx-0.5 hidden sm:block"></div>

                                  {/* Salesperson Filter */}
                                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-colors ${canViewAllData ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-200'}`}>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${canViewAllData ? 'text-purple-600' : 'text-gray-500'}`}>
                                      {canViewAllData ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                                      {isAdminUser ? 'Admin' : (canViewAllData ? 'Gestão' : 'Vendedor')}
                                    </span>
                                    <div className="relative">
                                      <UserIcon className={`absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${canViewAllData ? 'text-purple-400' : 'text-gray-400'}`} />
                                      <select
                                        value={canViewAllData ? filterSalespersonId : currentUser?.id || ''}
                                        onChange={(e) => canViewAllData && setFilterSalespersonId(e.target.value)}
                                        disabled={!canViewAllData}
                                        className={`text-xs rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 pl-7 pr-2 py-1 font-medium appearance-none ${canViewAllData ? 'border-purple-300 bg-white text-purple-900 cursor-pointer' : 'border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed'}`}
                                        title={!canViewAllData ? "Visualização restrita aos seus clientes" : "Filtrar por vendedor"}
                                      >
                                        {canViewAllData && <option value="Todos">Todos Vendedores</option>}
                                        {canViewAllData
                                          ? users.filter(u => u.role === 'salesperson' || u.role === 'sales_external' || u.role === 'sales_internal').map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                          ))
                                          : <option value={currentUser?.id}>{currentUser?.name}</option>
                                        }
                                      </select>
                                    </div>
                                    {canViewAllData && (
                                      <div className="relative animate-fade-in">
                                        <Briefcase className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-purple-400 pointer-events-none" />
                                        <select
                                          value={filterSalesCategory}
                                          onChange={(e) => setFilterSalesCategory(e.target.value)}
                                          className="text-xs border-purple-300 bg-white text-purple-900 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 pl-7 pr-2 py-1 font-medium"
                                          title="Filtrar por equipe de vendas"
                                        >
                                          <option value="Todos">Todas Equipes</option>
                                          <option value="Externo">Externo</option>
                                          <option value="Interno">Interno</option>
                                          <option value="Mercado Livre">Mercado Livre</option>
                                        </select>
                                      </div>
                                    )}
                                  </div>

                                  <select
                                    value={filterRegion}
                                    onChange={(e) => { setFilterRegion(e.target.value); setFilterState('Todos'); setFilterCity('Todas'); }}
                                    className="text-xs border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-2 py-1.5"
                                    title="Filtrar por região"
                                  >
                                    <option value="Todas">Todas Regiões</option>
                                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                  </select>

                                  <select
                                    value={filterState}
                                    onChange={(e) => { setFilterState(e.target.value); setFilterCity('Todas'); }}
                                    className="text-xs border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-2 py-1.5"
                                    disabled={availableStates.length === 0}
                                    title="Filtrar por estado"
                                  >
                                    <option value="Todos">Todos Estados</option>
                                    {availableStates.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>

                                  <select
                                    value={filterCity}
                                    onChange={(e) => setFilterCity(e.target.value)}
                                    className="text-xs border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-2 py-1.5"
                                    disabled={filterState === 'Todos' || availableCities.length === 0}
                                    title="Filtrar por cidade"
                                  >
                                    <option value="Todas">Todas Cidades</option>
                                    {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>

                                  <div className="flex items-center gap-1 relative">
                                    <ShoppingBag className="w-3.5 h-3.5 text-gray-400 absolute left-2 pointer-events-none" />
                                    <select
                                      value={filterCategory}
                                      onChange={(e) => setFilterCategory(e.target.value)}
                                      className="text-xs border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 pl-7 pr-2 py-1.5"
                                      title="Filtrar por categoria de cliente"
                                    >
                                      <option value="Todos">Todas Cat. Clientes</option>
                                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                  </div>

                                  <div className="flex items-center gap-1 relative">
                                    <Briefcase className="w-3.5 h-3.5 text-gray-400 absolute left-2 pointer-events-none" />
                                    <select
                                      value={filterCnae}
                                      onChange={(e) => setFilterCnae(e.target.value)}
                                      className="text-xs border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 pl-7 pr-2 py-1.5 max-w-[200px]"
                                      title="Filtrar por CNAE (Atividade Econômica)"
                                    >
                                      <option value="Todos">Todos CNAEs</option>
                                      {availableCnaes.map(c => (
                                        <option key={c} value={c}>{c.length > 40 ? c.substring(0, 40) + '...' : c}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {isAdminUser && (
                                    <button
                                      onClick={handleMassUpdateClients}
                                      className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all text-[10px] font-bold uppercase tracking-wider ml-2"
                                      title="Enriquecer toda a base com dados da Receita Federal via CNPJa Comercial"
                                    >
                                      <Database className="w-3.5 h-3.5" /> Atualizar Base (CNPJa)
                                    </button>
                                  )}
                                </div>

                                {/* Secondary Filters Row: Products */}
                                <div className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 px-2 py-1.5 rounded-lg shadow-sm">
                                  <div className="flex items-center gap-2 px-2 text-sm font-semibold text-green-700">
                                    <Package className="w-4 h-4" />
                                    Vendas:
                                  </div>

                                  <select
                                    value={filterProductCategory}
                                    onChange={e => setFilterProductCategory(e.target.value)}
                                    className={`text-xs rounded-lg px-2 py-1.5 border transition-colors ${filterProductCategory !== 'Todos' ? 'bg-green-50 border-green-300 text-green-800 font-bold' : 'border-gray-300 text-gray-600'}`}
                                    title="Filtrar por marca ou categoria de produto"
                                  >
                                    <option value="Todos">Todos Deptos / Marcas</option>
                                    {productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                  </select>

                                  <div className="relative animate-fade-in">
                                    <ShoppingBag className={`absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${filterProductSku !== 'Todos' ? 'text-green-600' : 'text-gray-400'}`} />
                                    <select
                                      value={filterProductSku}
                                      onChange={e => setFilterProductSku(e.target.value)}
                                      className={`text-xs rounded-lg pl-7 pr-2 py-1.5 border appearance-none transition-colors max-w-[180px] truncate ${filterProductSku !== 'Todos' ? 'bg-green-50 border-green-300 text-green-800 font-bold' : 'border-gray-300 text-gray-600'}`}
                                      title="Filtrar por SKU do produto"
                                    >
                                      <option value="Todos">Todos Produtos</option>
                                      {products
                                        .filter(p => filterProductCategory === 'Todos' || p.category === filterProductCategory)
                                        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                                        .map(p => (
                                          <option key={p.sku} value={p.sku}>{p.name.substring(0, 30)}... ({p.sku})</option>
                                        ))
                                      }
                                    </select>
                                  </div>

                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                    <input
                                      type="text"
                                      value={searchProductQuery}
                                      onChange={e => setSearchProductQuery(e.target.value)}
                                      placeholder="Depto, Marca, SKU ou Produto..."
                                      className={`pl-7 pr-3 py-1.5 text-xs border rounded-lg focus:ring-green-500 focus:border-green-500 outline-none w-52 transition-colors ${searchProductQuery ? 'bg-green-50 border-green-300' : 'border-gray-300'}`}
                                    />
                                  </div>

                                  <div className="flex gap-1 ml-1">
                                    <button
                                      onClick={() => setFilterOnlyWithPurchases(true)}
                                      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 rounded-lg border transition-all ${filterOnlyWithPurchases
                                        ? 'bg-green-600 border-green-600 text-white shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-500 hover:border-green-400 hover:text-green-600'
                                        }`}
                                    >
                                      Com Compras
                                    </button>
                                    <button
                                      onClick={() => setFilterOnlyWithPurchases(false)}
                                      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 rounded-lg border transition-all ${!filterOnlyWithPurchases
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600'
                                        }`}
                                    >
                                      Todos
                                    </button>
                                  </div>

                                  {isProductFilterActive && (
                                    <span className="ml-auto text-xs font-medium text-green-600 animate-pulse flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" />
                                      Exibindo onde foi vendido
                                    </span>
                                  )}
                                </div>
                              </div>
                            }
                          />
                        </React.Suspense>
                      ) : activeView === 'table' ? (
                        <ClientList
                          clients={filteredClients}
                          onUpdateClient={handleUpdateClient}
                          onAddClient={handleAddClient}
                          currentUserRole={currentUser?.role}
                          currentUserId={currentUser?.id}
                          currentUserName={currentUser?.name}
                          products={products}
                          productCategories={productCategories}
                          isLoading={!isDataLoaded || isFiltering}
                          filterOnlyWithPurchases={filterOnlyWithPurchases}
                          setFilterOnlyWithPurchases={setFilterOnlyWithPurchases}
                          resetFilters={resetFilters}
                          users={users}
                          uploadedFiles={uploadedFiles}
                          onGeneratePlusCodes={handleBulkGeneratePlusCodes}
                          onCNPJAuthError={() => setIsCNPJaModalOpen(true)}

                          searchTerm={searchQuery}
                          onSearchChange={setSearchQuery}
                          regionFilter={filterRegion}
                          onRegionFilterChange={setFilterRegion}
                          categoryFilter={filterCategory}
                          onCategoryFilterChange={setFilterCategory}
                        />
                      ) : activeView === 'history' ? (
                        <SalesHistoryPanel
                          clients={filteredClients}
                          users={users}
                          startDate={startDate}
                          endDate={endDate}
                          onRangeChange={(start, end) => {
                            setStartDate(start);
                            setEndDate(end);
                          }}
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              </>
            )}

          {/* System Logs Panel (Admin Dev Only) */}
          {isLogPanelOpen && currentUser?.role === 'admin_dev' && (
            <LogPanel
              currentUser={currentUser}
              onClose={() => setIsLogPanelOpen(false)}
            />
          )}

          {/* --- TOAST NOTIFICATION FOR BACKGROUND PROCESSING --- */}
          {procState.isActive && (
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
                    onClick={() => {
                      if (procState.isActive && procState.status === 'processing') {
                        if (window.confirm("Gostaria de Parar de Enviar o Arquivo?")) {
                          isUploadCancelled.current = true;
                          setProcState(prev => ({ ...prev, isActive: false, status: 'error', errorMessage: 'Cancelado pelo usuário.' }));
                        }
                      } else {
                        setProcState(prev => ({ ...prev, isActive: false }));
                      }
                    }}
                    className="text-gray-400 hover:text-gray-600"
                    title="Fechar Notificação"
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
          )}
        </main>
      </div>

      <CustomDialog
        isOpen={dialogConfig.isOpen}
        onClose={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={dialogConfig.onConfirm}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        confirmLabel={dialogConfig.confirmLabel}
        cancelLabel={dialogConfig.cancelLabel}
      />
    </GoogleReCaptchaProvider>
  );
};

export default App;
