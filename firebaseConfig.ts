
// This file will hold the Firebase configuration.
// Since we want the user to input their own keys via the UI (Admin Panel),
// we won't hardcode them here. Instead, we'll initialize the app dynamically
// or read from localStorage if present.

export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
}

export const getStoredFirebaseConfig = (): FirebaseConfig | null => {
    const stored = localStorage.getItem('firebase_config');
    return stored ? JSON.parse(stored) : null;
};

export const saveFirebaseConfig = (config: FirebaseConfig) => {
    localStorage.setItem('firebase_config', JSON.stringify(config));
};

export const clearFirebaseConfig = () => {
    localStorage.removeItem('firebase_config');
};
