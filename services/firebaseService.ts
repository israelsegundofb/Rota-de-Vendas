
import { initializeApp, FirebaseApp, getApps, getApp, deleteApp } from 'firebase/app';
import { getFirestore, Firestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { FirebaseConfig, getStoredFirebaseConfig } from '../firebaseConfig';
import { EnrichedClient, Product, AppUser } from '../types';

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

export const initializeFirebase = async (config?: FirebaseConfig): Promise<boolean> => {
    try {
        const firebaseConfig = config || getStoredFirebaseConfig();
        if (!firebaseConfig) return false;

        // Check if app is already initialized
        if (getApps().length > 0) {
            // If config changed, we might need to re-init (advanced), but for now let's reuse or delete
            // Simple approach: if app exists, retrieve it. If we want to support switching configs, we'd need deleteApp.
            app = getApp();
        } else {
            app = initializeApp(firebaseConfig);
        }

        db = getFirestore(app);
        return true;
    } catch (error) {
        console.error("Error initializing Firebase:", error);
        return false;
    }
};

export const isFirebaseInitialized = () => !!db;

// -- DATA SYNC FUNCTIONS --

// Helper: Remove undefined values (Firestore doesn't support undefined)
const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(removeUndefined);
    if (typeof obj !== 'object') return obj;

    const cleaned: any = {};
    for (const key in obj) {
        const value = obj[key];
        if (value === undefined) {
            cleaned[key] = null; // Convert undefined to null
        } else if (value !== null && typeof value === 'object') {
            cleaned[key] = removeUndefined(value);
        } else {
            cleaned[key] = value;
        }
    }
    return cleaned;
};

// Save Master Data (Clients, Products, Users, Categories, UploadedFiles)
export const saveToCloud = async (
    clients: EnrichedClient[],
    products: Product[],
    categories: string[],
    users: AppUser[],
    uploadedFiles: any[] = [] // uploadedFiles
) => {
    if (!db) return;

    try {
        const dataToSave = {
            clients: removeUndefined(clients),
            products: removeUndefined(products),
            categories: removeUndefined(categories),
            users: removeUndefined(users),
            uploadedFiles: removeUndefined(uploadedFiles),
            lastUpdated: new Date().toISOString(),
            updatedBy: 'App Sync'
        };

        // We store extensive data in a single doc for MVP simplicity (like the JSON backup)
        // In a real large-scale app, we would use subcollections.
        await setDoc(doc(db, 'rota-vendas', 'master-data'), dataToSave);
        console.log('✅ Data saved to cloud successfully');
    } catch (e) {
        console.error("Error saving to cloud:", e);
        throw e;
    }
};

export const loadFromCloud = async (): Promise<any | null> => {
    if (!db) return null;

    try {
        const docRef = doc(db, 'rota-vendas', 'master-data');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            return null;
        }
    } catch (e) {
        console.error("Error loading from cloud:", e);
        return null;
    }
};

// Real-time listener
export const subscribeToCloudChanges = (callback: (data: any) => void) => {
    if (!db) return () => { };

    return onSnapshot(doc(db, 'rota-vendas', 'master-data'), (doc) => {
        if (doc.exists()) {
            callback(doc.data());
        }
    });
};
