import * as admin from 'firebase-admin';

let isInitialized = false;

export const getFirestore = () => {
    if (!isInitialized) {
        try {
            // Check if already initialized by another module
            if (admin.apps.length === 0) {
                admin.initializeApp();
                console.log('[FIREBASE ADMIN] Initialized with default credentials');
            }
            isInitialized = true;
        } catch (e) {
            console.warn('[FIREBASE ADMIN] Initialization failed, will retry on next call or work without Firestore.', e);
        }
    }
    
    try {
        return admin.firestore();
    } catch (err) {
        console.warn('[FIREBASE ADMIN] Firestore access failed. Check credentials.');
        // Return a mock object or throw a descriptive error that we catch in services
        throw new Error("FIREBASE_NOT_INITIALIZED");
    }
};
