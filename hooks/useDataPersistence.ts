import { useState, useEffect } from 'react';
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

// Helper to migrate legacy roles removed - imported from authUtils

export const useDataPersistence = (users: AppUser[], setUsers: (users: AppUser[]) => void) => {
    const [masterClientList, setMasterClientList] = useState<EnrichedClient[]>([]);
    const [products, setProducts] = useState<Product[]>(loadInitialProducts);
    const [categories, setCategories] = useState<string[]>(loadInitialCategories);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(loadInitialFiles);

    const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState('Iniciando sistema...');

    // Initialize Data
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
                    const cloudData = await loadFromCloud();
                    setLoadingProgress(60);

                    if (cloudData && (cloudData.clients?.length > 0 || cloudData.products?.length > 0 || cloudData.users?.length > 0)) {
                        console.log("Cloud data found (Populated). Using Cloud as Source of Truth.");
                        if (cloudData.clients) setMasterClientList(cloudData.clients);
                        if (cloudData.products) setProducts(cloudData.products);
                        if (cloudData.categories) setCategories(cloudData.categories);
                        if (cloudData.users && setUsers) {
                            // Migrate users before setting
                            setUsers(migrateUsers(cloudData.users));
                        }
                        if (cloudData.uploadedFiles) setUploadedFiles(cloudData.uploadedFiles);

                        setLoadingMessage('Finalizando sincronização...');
                        setLoadingProgress(100);
                        setTimeout(() => setIsDataLoaded(true), 500);
                        return;
                    } else {
                        // Cloud is empty - migrate localStorage or use defaults
                        console.log("Cloud is empty. Checking localStorage for migration...");

                        const savedUsers = localStorage.getItem('vendas_ai_users');
                        let usersToSave = savedUsers ? JSON.parse(savedUsers) : null;

                        if (!usersToSave || usersToSave.length === 0) {
                            // Import INITIAL_USERS if localStorage is also empty
                            console.log("No users in localStorage. Using INITIAL_USERS.");
                            const { INITIAL_USERS } = await import('./useAuth');
                            usersToSave = INITIAL_USERS;
                        }

                        // Apply migration to initial/saved data
                        usersToSave = migrateUsers(usersToSave);

                        // Save to cloud for first time
                        if (setUsers) setUsers(usersToSave);
                        setMasterClientList(loadInitialClients());

                        console.log("Saving initial data to cloud...");
                        await saveToCloud(
                            loadInitialClients(),
                            loadInitialProducts(),
                            loadInitialCategories(),
                            usersToSave,
                            loadInitialFiles()
                        );

                        setLoadingMessage('Migração concluída!');
                        setLoadingProgress(100);
                        setTimeout(() => setIsDataLoaded(true), 500);
                        return;
                    }
                } catch (e) {
                    console.error("Cloud load error", e);
                }
            }

            // 3. Fallback to LocalStorage (Firebase not connected)
            console.log("Loading data from LocalStorage...");
            setMasterClientList(loadInitialClients());

            const savedUsers = localStorage.getItem('vendas_ai_users');
            if (savedUsers && setUsers) {
                setUsers(migrateUsers(JSON.parse(savedUsers)));
            } else if (setUsers) {
                // If no users exist, use INITIAL_USERS
                const { INITIAL_USERS } = await import('./useAuth');
                setUsers(migrateUsers(INITIAL_USERS));
            }

            setLoadingMessage('Carregado localmente');
            setLoadingProgress(100);
            setTimeout(() => setIsDataLoaded(true), 500);
        };

        initData();
    }, []); // Run once on mount

    // Auto-Save to Cloud
    useEffect(() => {
        if (isFirebaseConnected && isDataLoaded && (masterClientList.length > 0 || users.length > 0 || uploadedFiles.length > 0)) {
            const timeout = setTimeout(() => {
                saveToCloud(masterClientList, products, categories, users, uploadedFiles)
                    .catch(err => console.error("Auto-save failed", err));
            }, 2000);
            return () => clearTimeout(timeout);
        }
    }, [masterClientList, products, categories, users, uploadedFiles, isFirebaseConnected, isDataLoaded]);

    // Local Persistence Effects
    useEffect(() => { localStorage.setItem('vendas_ai_clients', JSON.stringify(masterClientList)); }, [masterClientList]);
    useEffect(() => { localStorage.setItem('vendas_ai_categories', JSON.stringify(categories)); }, [categories]);
    useEffect(() => { localStorage.setItem('vendas_ai_products', JSON.stringify(products)); }, [products]);
    useEffect(() => { localStorage.setItem('vendas_ai_files', JSON.stringify(uploadedFiles)); }, [uploadedFiles]);
    useEffect(() => { localStorage.setItem('vendas_ai_users', JSON.stringify(users)); }, [users]);

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
        loadingMessage
    };
};
