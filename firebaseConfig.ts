
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

    // Default Config provided by User (Auto-connect)
    return {
        apiKey: "AIzaSyAenb2sXL1h-y9uChCwjaZoU4I_rHzBd2w",
        authDomain: "gen-lang-client-0586123917.firebaseapp.com",
        projectId: "gen-lang-client-0586123917",
        storageBucket: "gen-lang-client-0586123917.firebasestorage.app",
        messagingSenderId: "66816750674",
        appId: "1:66816750674:web:a2ec5f3735ae90f821db8b"
    };
};

export const saveFirebaseConfig = (config: FirebaseConfig) => {
    localStorage.setItem('firebase_config', JSON.stringify(config));
};

export const clearFirebaseConfig = () => {
    localStorage.removeItem('firebase_config');
};
