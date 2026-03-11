import * as admin from 'firebase-admin';

let isInitialized = false;

export const getFirestore = () => {
    if (!isInitialized) {
        try {
            // Attempt to initialize with application default credentials
            // (Works automatically on GCP/Firebase Hosting/Cloud Run)
            admin.initializeApp();
            console.log('[FIREBASE ADMIN] Initialized with default credentials');
            isInitialized = true;
        } catch (e) {
            console.warn('[FIREBASE ADMIN] Default initialization failed, checking local credentials...', e);
            try {
                // Here you could add manual serviceAccount fallback if needed
                // For now, if default fails, we might be in dev mode without credentials
                isInitialized = true;
            } catch (err) {
                console.error('[FIREBASE ADMIN] Initialization failed completely:', err);
            }
        }
    }
    return admin.firestore();
};
