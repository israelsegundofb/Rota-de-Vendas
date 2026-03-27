import { useState, useEffect, useRef } from 'react';
import { EnrichedClient, Product, UploadedFile, AppUser } from '../types';
import { initializeFirebase, saveToCloud, loadFromCloud, isFirebaseInitialized } from '../services/firebaseService';
import { CATEGORIES, getRegionByUF } from '../utils/constants';
import { migrateUsers } from '../utils/authUtils';

// Initial Data Loaders
const loadInitialClients = (): EnrichedClient[] => {
    try {
        const saved = localStorage.getItem('vendas_ai_clients');
        if (saved) {
            const parsed = JSON.parse(saved);
            return parsed.map((c: any) => ({
                ...c,
                category: Array.isArray(c.category)
                    ? c.category
                    : (typeof c.category === 'string' ? [c.category] : ['Outros']),
                region: getRegionByUF(c.state)
            }));
        }
    } catch (e) {
        console.error("Failed to load clients", e);
    }
    return [];
};

const loadInitialProducts = (): Product[] => {
    try {
        const saved = localStorage.getItem('vendas_ai_products');
        return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
};

const loadInitialCategories = (): string[] => {
    try {
        const saved = localStorage.getItem('vendas_ai_categories');
        return saved ? JSON.parse(saved) : CATEGORIES.filter(c => c !== 'Todos');
    } catch (e) { return CATEGORIES.filter(c => c !== 'Todos'); }
};

const loadInitialFiles = (): UploadedFile[] => {
    try {
        const saved = localStorage.getItem('vendas_ai_files');
        return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
};

// Helper to hash data ignoring lastUpdated timestamp to prevent infinite sync loops
const hashDataList = (list: any[]) => JSON.stringify(list, (key, value) => key === 'lastUpdated' ? undefined : value);

export const useDataPersistence = (users: AppUser[], setUsers: (users: AppUser[]) => void) => {
    const [masterClientList, setMasterClientList] = useState<EnrichedClient[]>([]);
    const [products, setProducts] = useState<Product[]>(loadInitialProducts);
    const [categories, setCategories] = useState<string[]>(loadInitialCategories);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(loadInitialFiles);

    const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState('Iniciando sistema...');

    // Initialize Data Sync Refs
    const lastClientsHash = useRef<string>('');
    const lastUsersHash = useRef<string>('');
    const lastProductsHash = useRef<string>('');
    const lastFilesHash = useRef<string>('');
    const syncLockRef = useRef<boolean>(false); // Prevents real-time sync from overwriting during uploads

    useEffect(() => {
        const initData = async () => {
            // 1. Try to init Firebase
            setLoadingMessage('Conectando ao Firebase...');
            setLoadingProgress(10);
            const connected = await initializeFirebase();
            setIsFirebaseConnected(connected);
            setLoadingProgress(25);

            // 2. If connected, try to load from cloud
            if (connected) {
                setLoadingMessage('Buscando dados na nuvem...');
                setLoadingProgress(40);

                try {
                    // Optimized: parallel loading with a safety timeout to prevent permanent hang at 40%
                    const cloudLoadPromise = loadFromCloud();
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Cloud sync timeout')), 15000)
                    );

                    const cloudData = await Promise.race([cloudLoadPromise, timeoutPromise]) as any;

                    if (cloudData && (cloudData.clients?.length > 0 || cloudData.products?.length > 0 || cloudData.users?.length > 0)) {
                        console.log("Cloud data found (Populated). Using Cloud as Source of Truth.");

                        setLoadingMessage('Processando usuários...');
                        setLoadingProgress(45);
                        if (cloudData.users && setUsers) {
                            lastUsersHash.current = hashDataList(cloudData.users);
                            setUsers(migrateUsers(cloudData.users));
                        }

                        setLoadingMessage('Processando catálogo...');
                        setLoadingProgress(50);
                        if (cloudData.products) {
                            lastProductsHash.current = hashDataList(cloudData.products);
                            setProducts(cloudData.products);
                        }
                        if (cloudData.categories) setCategories(cloudData.categories);

                        setLoadingMessage('Processando clientes...');
                        setLoadingProgress(55);
                        if (cloudData.clients) {
                            lastClientsHash.current = hashDataList(cloudData.clients);
                            setMasterClientList(cloudData.clients);
                        }

                        if (cloudData.uploadedFiles) {
                            setLoadingMessage('Processando arquivos...');
                            setLoadingProgress(60);
                            const TEN_MINUTES = 10 * 60 * 1000;
                            const now = Date.now();
                            const recoveredFiles = cloudData.uploadedFiles.map((f: UploadedFile) => {
                                if (f.status === 'processing' && f.uploadDate) {
                                    const uploadTime = new Date(f.uploadDate).getTime();
                                    if (now - uploadTime > TEN_MINUTES) {
                                        return { ...f, status: 'error' as const, errorMessage: 'Processamento interrompido.' };
                                    }
                                }
                                return f;
                            });
                            lastFilesHash.current = hashDataList(recoveredFiles);
                            setUploadedFiles(recoveredFiles);
                        }

                        setLoadingMessage('Finalizando sincronização...');
                        setLoadingProgress(100);
                        setTimeout(() => setIsDataLoaded(true), 500);
                        return;
                    } else {
                        console.log("Cloud is empty. Checking localStorage for migration...");
                        const savedUsers = localStorage.getItem('vendas_ai_users');
                        let usersToSave = savedUsers ? JSON.parse(savedUsers) : null;

                        if (!usersToSave || usersToSave.length === 0) {
                            const { INITIAL_USERS } = await import('./useAuth');
                            usersToSave = INITIAL_USERS;
                        }

                        usersToSave = migrateUsers(usersToSave);
                        if (setUsers) setUsers(usersToSave);
                        setMasterClientList(loadInitialClients());

                        saveToCloud(
                            loadInitialClients(),
                            loadInitialProducts(),
                            loadInitialCategories(),
                            usersToSave,
                            loadInitialFiles(),
                            true // isDeepSync: true for initial migration
                        ).catch(() => { });

                        setLoadingMessage('Configuração concluída!');
                        setLoadingProgress(100);
                        setTimeout(() => setIsDataLoaded(true), 500);
                        return;
                    }
                } catch (e) {
                    console.error("Cloud load error, falling back to local:", e);
                }
            }

            // 3. Fallback to LocalStorage (Firebase not connected or error)
            console.log("Loading data from LocalStorage...");
            setMasterClientList(loadInitialClients());

            const savedUsers = localStorage.getItem('vendas_ai_users');
            if (savedUsers && setUsers) {
                setUsers(migrateUsers(JSON.parse(savedUsers)));
            } else if (setUsers) {
                const { INITIAL_USERS } = await import('./useAuth');
                setUsers(migrateUsers(INITIAL_USERS));
            }

            setLoadingMessage('Carregado localmente');
            setLoadingProgress(100);
            setTimeout(() => setIsDataLoaded(true), 500);
        };

        initData();

        let unsubscribe: () => void = () => { };

        const setupSubscription = async () => {
            if (isFirebaseInitialized()) {
                const { subscribeToCloudChanges } = await import('../services/firebaseService');
                unsubscribe = subscribeToCloudChanges((newData: any) => {
                    if (newData) {
                        if (newData.clients) {
                            if (syncLockRef.current) {
                                console.log('[SYNC] Skipping client sync — syncLock active');
                            } else {
                                const newHash = hashDataList(newData.clients);
                                if (newHash !== lastClientsHash.current) {
                                    lastClientsHash.current = newHash;
                                    setMasterClientList(newData.clients);
                                }
                            }
                        }
                        if (newData.products) {
                            const newHash = hashDataList(newData.products);
                            if (newHash !== lastProductsHash.current) {
                                lastProductsHash.current = newHash;
                                setProducts(newData.products);
                            }
                        }
                        if (newData.categories) setCategories(newData.categories);
                        if (newData.users && setUsers) {
                            const newHash = hashDataList(newData.users);
                            if (newHash !== lastUsersHash.current) {
                                lastUsersHash.current = newHash;
                                setUsers(migrateUsers(newData.users));
                            }
                        }
                        if (newData.uploadedFiles) {
                            const newHash = hashDataList(newData.uploadedFiles);
                            if (newHash !== lastFilesHash.current) {
                                lastFilesHash.current = newHash;
                                setUploadedFiles(newData.uploadedFiles);
                            }
                        }
                    }
                });
            }
        };

        setupSubscription();
        return () => { if (unsubscribe) unsubscribe(); };
    }, [isFirebaseConnected]);

    // Auto-Save Effect
    useEffect(() => {
        const shouldSave = isFirebaseConnected && isDataLoaded && users.length > 0;

        if (shouldSave) {
            const currentClientsHash = hashDataList(masterClientList);
            const currentUsersHash = hashDataList(users);
            const currentProductsHash = hashDataList(products);
            const currentFilesHash = hashDataList(uploadedFiles);

            const hasChanges =
                currentClientsHash !== lastClientsHash.current ||
                currentUsersHash !== lastUsersHash.current ||
                currentProductsHash !== lastProductsHash.current ||
                currentFilesHash !== lastFilesHash.current;

            if (hasChanges) {
                const timeout = setTimeout(() => {
                    lastClientsHash.current = currentClientsHash;
                    lastUsersHash.current = currentUsersHash;
                    lastProductsHash.current = currentProductsHash;
                    lastFilesHash.current = currentFilesHash;
                    saveToCloud(masterClientList, products, categories, users, uploadedFiles, false)
                        .catch(err => console.error("Auto-save failed", err));
                }, 3000);
                return () => clearTimeout(timeout);
            }
        }
    }, [masterClientList, products, categories, users, uploadedFiles, isFirebaseConnected, isDataLoaded]);

    // PERSISTÊNCIA REMOVIDA: Dados agora vivem apenas na memória RAM para segurança total.

    // PERSISTÊNCIA REMOVIDA: Nenhuma informação de usuário ou senha fica salva no disco.

    // Limpeza de Segurança: Purga total de dados sensíveis e cache do LocalStorage
    useEffect(() => {
        const sensitiveKeys = [
            'cnpja_api_key', 'google_maps_api_key', 'gemini_api_key', 'firebase_config',
            'vendas_ai_clients', 'vendas_ai_products', 'vendas_ai_categories', 
            'vendas_ai_files', 'vendas_ai_users'
        ];
        sensitiveKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                console.log(`[SECURITY] Purgando dado sensível do disco do navegador: ${key}`);
                localStorage.removeItem(key);
            }
        });
    }, []);

    return {
        masterClientList,
        setMasterClientList,
        products,
        setProducts,
        categories,
        setCategories,
        uploadedFiles,
        setUploadedFiles,
        isFirebaseConnected,
        isDataLoaded,
        loadingProgress,
        loadingMessage,
        syncLockRef,
        lastClientsHash
    };
};
