
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
    // 1. Prioridade máxima: Variáveis de ambiente fixas (.env) injetadas pelo Vite
    const envConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
        appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
    };

    if (envConfig.apiKey && envConfig.projectId) {
        return envConfig;
    }

    // 2. Se não encontrou no .env, tenta recuperar do armazenamento local do navegador
    const stored = localStorage.getItem('firebase_config');
    if (stored) return JSON.parse(stored);

    // Debug: Verificar presença das chaves (apenas primeiros caracteres)
    console.log('[FIREBASE] Environment Config Check:');
    console.log('- API Key:', envConfig.apiKey ? `FOUND (${envConfig.apiKey.substring(0, 5)}...)` : 'MISSING ❌');
    console.log('- Project ID:', envConfig.projectId ? `FOUND (${envConfig.projectId})` : 'MISSING ❌');

    return envConfig;
};

export const saveFirebaseConfig = (config: FirebaseConfig) => {
    localStorage.setItem('firebase_config', JSON.stringify(config));
};

export const clearFirebaseConfig = () => {
    localStorage.removeItem('firebase_config');
};
