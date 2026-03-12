import { getFirestore } from './firebaseAdmin';

export interface SystemSettings {
    googleMapsApiKey?: string;
    geminiApiKey?: string;
    cnpjaApiKey?: string;
    lastUpdated?: string;
}

const SETTINGS_COLLECTION = 'rota-vendas-data';
const SETTINGS_DOCUMENT = 'system_settings';

let settingsCache: SystemSettings | null = null;
let lastFetch = 0;
const CACHE_TTL = 30000; // 30 seconds

export const getSecureSettings = async (): Promise<SystemSettings | null> => {
    const now = Date.now();
    if (settingsCache && (now - lastFetch < CACHE_TTL)) {
        return settingsCache;
    }

    try {
        const db = getFirestore();
        const doc = await db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOCUMENT).get();
        
        if (doc.exists) {
            settingsCache = doc.data() as SystemSettings;
            lastFetch = now;
            return settingsCache;
        }
        return null;
    } catch (error) {
        console.error('[SETTINGS SERVICE] Error fetching secure settings:', error);
        return settingsCache; // Return stale cache on error if available
    }
};
