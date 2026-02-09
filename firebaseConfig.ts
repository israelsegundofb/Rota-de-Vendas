
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
    if (stored) return JSON.parse(stored);

    // Default Firebase Config with hardcoded fallbacks
    // Firebase client config is public/safe to hardcode (same as Google Maps key in HTML)
    return {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAenb2sXL1h-y9uChCwjaZoU4I_rHzBd2w",
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0586123917.firebaseapp.com",
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0586123917",
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0586123917.firebasestorage.app",
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "66816750674",
        appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:66816750674:web:a2ec5f3735ae90f821db8b"
    };
};

export const saveFirebaseConfig = (config: FirebaseConfig) => {
    localStorage.setItem('firebase_config', JSON.stringify(config));
};

export const clearFirebaseConfig = () => {
    localStorage.removeItem('firebase_config');
};
