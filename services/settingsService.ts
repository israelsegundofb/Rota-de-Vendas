import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { getFirestoreDb } from './firebaseService';

export interface SystemSettings {
    googleMapsApiKey?: string;
    geminiApiKey?: string;
    cnpjaApiKey?: string;
    lastUpdated?: string;
}

const SETTINGS_COLLECTION = 'rota-vendas-data';
const SETTINGS_DOCUMENT = 'system_settings';

export const getSystemSettings = async (): Promise<SystemSettings | null> => {
    const db = getFirestoreDb();
    if (!db) {
        console.warn('[SETTINGS] Firestore not initialized yet.');
        return null;
    }

    try {
        const settingsRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOCUMENT);
        const snapshot = await getDoc(settingsRef);

        if (snapshot.exists()) {
            return snapshot.data() as SystemSettings;
        } else {
            console.log('[SETTINGS] No system settings document found.');
            return null;
        }
    } catch (error) {
        console.error('[SETTINGS] Error fetching system settings:', error);
        return null;
    }
};

export const saveSystemSettings = async (settings: Partial<SystemSettings>): Promise<boolean> => {
    const db = getFirestoreDb();
    if (!db) {
        console.error('[SETTINGS] Cannot save: Firestore not initialized.');
        return false;
    }

    try {
        const settingsRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOCUMENT);
        await setDoc(settingsRef, {
            ...settings,
            lastUpdated: new Date().toISOString()
        }, { merge: true });
        
        console.log('[SETTINGS] System settings saved successfully.');
        return true;
    } catch (error) {
        console.error('[SETTINGS] Error saving system settings:', error);
        return false;
    }
};

export const subscribeToSystemSettings = (callback: (settings: SystemSettings) => void) => {
    const db = getFirestoreDb();
    if (!db) return () => {};

    const settingsRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOCUMENT);
    
    return onSnapshot(settingsRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data() as SystemSettings);
        } else {
            callback({});
        }
    }, (error) => {
        console.error('[SETTINGS] Subscription error:', error);
    });
};
