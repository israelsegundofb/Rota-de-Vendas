
import { initializeApp, FirebaseApp, getApps, getApp, deleteApp } from 'firebase/app';
import { getFirestore, Firestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { FirebaseConfig, getStoredFirebaseConfig } from '../firebaseConfig';
import { EnrichedClient, Product, User } from '../types';

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

// Save Master Data (Clients, Products, Users, Categories)
export const saveToCloud = async (
    clients: EnrichedClient[],
    products: Product[],
    categories: string[],
    users: User[]
) => {
    if (!db) return;

    try {
        const dataToSave = {
            clients,
            products,
            categories,
            users,
            lastUpdated: new Date().toISOString(),
            updatedBy: 'App Sync'
        };

        // We store extensive data in a single doc for MVP simplicity (like the JSON backup)
        // In a real large-scale app, we would use subcollections.
        await setDoc(doc(db, 'rota-vendas', 'master-data'), dataToSave);
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
