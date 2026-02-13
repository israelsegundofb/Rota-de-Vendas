
import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, Firestore, doc, getDoc, setDoc, onSnapshot, collection, addDoc, query, orderBy, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FirebaseConfig, getStoredFirebaseConfig } from '../firebaseConfig';
import { EnrichedClient, Product, AppUser, ChatMessage, SystemLog, UserStatus } from '../types';

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

export const initializeFirebase = async (config?: FirebaseConfig): Promise<boolean> => {
    try {
        const firebaseConfig = config || getStoredFirebaseConfig();
        if (!firebaseConfig) return false;

        if (getApps().length > 0) {
            app = getApp();
        } else {
            app = initializeApp(firebaseConfig);
        }

        // Initialize Cloud Firestore with default settings (persistence is enabled by default in many environments)
        db = initializeFirestore(app, {});
        storage = getStorage(app);
        return true;
    } catch (error) {
        console.error("Error initializing Firebase:", error);
        return false;
    }
};

export const getFirestoreDb = () => db;

export const isFirebaseInitialized = () => !!db;

// -- CHAT FUNCTIONS --

export const sendMessageToCloud = async (message: Omit<ChatMessage, 'id'>) => {
    if (!db) {
        console.error("❌ Firebase not initialized. Cannot send message.");
        return;
    }
    try {
        const chatRef = collection(db, 'chats');
        await addDoc(chatRef, removeUndefined(message));
        console.log("✅ Message sent to cloud");
    } catch (e) {
        console.error("Error sending message:", e);
    }
};

export const subscribeToMessages = (callback: (messages: ChatMessage[]) => void) => {
    if (!db) return () => { };
    const chatRef = collection(db, 'chats');
    const q = query(chatRef, orderBy('timestamp', 'asc'));

    return onSnapshot(q, (snapshot) => {
        const messages: ChatMessage[] = [];
        snapshot.forEach((doc) => {
            messages.push({ id: doc.id, ...doc.data() } as ChatMessage);
        });
        callback(messages);
    });
};

export const markMessageAsReadInCloud = async (messageId: string) => {
    if (!db) return;
    try {
        const msgRef = doc(db, 'chats', messageId);
        await updateDoc(msgRef, { read: true });
    } catch (e) {
        console.error("Error marking message as read:", e);
    }
};

export const deleteMessageFromCloud = async (messageId: string) => {
    if (!db) return;
    try {
        const msgRef = doc(db, 'chats', messageId);
        await deleteDoc(msgRef);
        console.log(`✅ Message ${messageId} deleted from cloud`);
    } catch (e) {
        console.error("Error deleting message:", e);
        throw e;
    }
};

export const clearAllMessagesFromCloud = async () => {
    if (!db) return;
    try {
        const chatRef = collection(db, 'chats');
        const snapshot = await getDocs(chatRef);
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        console.log("✅ All chat messages cleared from cloud");
    } catch (e) {
        console.error("Error clearing chat history:", e);
        throw e;
    }
};

// -- LOG FUNCTIONS --

export const logActivityToCloud = async (log: Omit<SystemLog, 'id'>) => {
    if (db) {
        try {
            const logRef = collection(db, 'system_logs');
            await addDoc(logRef, removeUndefined(log));
        } catch (e) {
            console.error("Error saving log to Firestore:", e);
        }
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (backendUrl) {
        try {
            fetch(`${backendUrl}/api/logs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(log)
            }).catch(err => console.warn('[BACKEND LOG] Servidor inacessível, log salvo apenas no Firebase.'));
        } catch (e) {
        }
    }
};

export const subscribeToSystemLogs = (callback: (logs: SystemLog[]) => void) => {
    if (!db) return () => { };
    const logRef = collection(db, 'system_logs');
    const q = query(logRef, orderBy('timestamp', 'desc'));

    return onSnapshot(q, (snapshot) => {
        const logs: SystemLog[] = [];
        snapshot.forEach((doc) => {
            logs.push({ id: doc.id, ...doc.data() } as SystemLog);
        });
        callback(logs.slice(0, 500));
    });
};

// -- DATA SYNC FUNCTIONS --

const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(removeUndefined);
    if (typeof obj !== 'object') return obj;

    const cleaned: any = {};
    for (const key in obj) {
        const value = obj[key];
        if (value === undefined) {
            cleaned[key] = null;
        } else if (value !== null && typeof value === 'object') {
            cleaned[key] = removeUndefined(value);
        } else {
            cleaned[key] = value;
        }
    }
    return cleaned;
};

export const saveToCloud = async (
    clients: EnrichedClient[],
    products: Product[],
    categories: string[],
    users: AppUser[],
    uploadedFiles: any[] = []
) => {
    if (!db) return;

    // PROTECTION: Never save an empty dataset if we are in production, 
    // to avoid wiping out the cloud database due to a local initialization race condition.
    const isInitialData = clients.length === 0 && products.length === 0 && users.length <= 3;
    if (isInitialData) {
        const docRef = doc(db, 'rota-vendas', 'master-data');
        const snap = await getDoc(docRef);
        if (snap.exists() && (snap.data().clients?.length > 0)) {
            console.warn('[FIREBASE] Prevented accidental overwrite of cloud data with local empty state.');
            return;
        }
    }

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

export const subscribeToCloudChanges = (callback: (data: any) => void) => {
    if (!db) return () => { };

    return onSnapshot(doc(db, 'rota-vendas', 'master-data'), (doc) => {
        if (doc.exists()) {
            callback(doc.data());
        }
    });
};

// -- STORAGE FUNCTIONS --

export const uploadFileToCloud = async (file: File | Blob, path: string): Promise<string | null> => {
    if (!storage) {
        const initialized = await initializeFirebase();
        if (!initialized || !storage) return null;
    }

    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log(`✅ File uploaded to ${path}:`, downloadURL);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading file to storage:", error);
        return null;
    }
};

export const updateUserStatusInCloud = async (userId: string, status: UserStatus, allUsers: AppUser[]) => {
    if (!db) return;
    try {
        const updatedUsers = allUsers.map(u => u.id === userId ? { ...u, status } : u);
        const docRef = doc(db, 'rota-vendas', 'master-data');
        const snap = await getDoc(docRef);

        if (snap.exists()) {
            const currentData = snap.data();
            await setDoc(docRef, {
                ...currentData,
                users: removeUndefined(updatedUsers),
                lastUpdated: new Date().toISOString(),
                updatedBy: `Status Update: ${userId}`
            });
            console.log(`✅ Status for ${userId} updated to ${status}`);
        }
    } catch (e) {
        console.error("Error updating user status:", e);
    }
};
