
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

    // PROTECTION: Never save an empty user list to the cloud if we previously had data.
    if (users.length === 0) {
        console.warn('[FIREBASE] Blocked save attempt with 0 users. This is likely a race condition or state error.');
        return;
    }

    try {
        const lastUpdated = new Date().toISOString();

        // 1. Fragmented Payloads
        const usersPayload = { users: removeUndefined(users), lastUpdated };
        const clientsPayload = { clients: removeUndefined(clients), lastUpdated };
        const masterPayload = {
            products: removeUndefined(products),
            categories: removeUndefined(categories),
            uploadedFiles: removeUndefined(uploadedFiles),
            lastUpdated,
            updatedBy: 'App Sync V4.3'
        };

        // 2. Parallel Saves (Atomicity is not critical here as they are separate documents)
        await Promise.all([
            setDoc(doc(db, 'rota-vendas', 'users-data'), usersPayload),
            setDoc(doc(db, 'rota-vendas', 'clients-data'), clientsPayload),
            setDoc(doc(db, 'rota-vendas', 'master-data'), masterPayload)
        ]);

        console.log('✅ All data fragments saved to cloud successfully');
    } catch (e) {
        console.error("Error saving to cloud (Fragmented):", e);
        throw e;
    }
};

export const loadFromCloud = async (): Promise<any | null> => {
    if (!db) return null;

    try {
        // Load all fragments in parallel
        const [usersSnap, clientsSnap, masterSnap] = await Promise.all([
            getDoc(doc(db, 'rota-vendas', 'users-data')),
            getDoc(doc(db, 'rota-vendas', 'clients-data')),
            getDoc(doc(db, 'rota-vendas', 'master-data'))
        ]);

        // If nothing found in fragments, fallback to legacy master-data (migration path)
        if (!usersSnap.exists() && !clientsSnap.exists() && masterSnap.exists()) {
            console.warn('[FIREBASE] New fragments not found, using legacy master-data');
            return masterSnap.data();
        }

        // Merge results
        const result: any = {};
        if (usersSnap.exists()) result.users = usersSnap.data().users;
        if (clientsSnap.exists()) result.clients = clientsSnap.data().clients;
        if (masterSnap.exists()) {
            const masterData = masterSnap.data();
            result.products = masterData.products;
            result.categories = masterData.categories;
            result.uploadedFiles = masterData.uploadedFiles;
        }

        return result;
    } catch (e) {
        console.error("Error loading from cloud:", e);
        return null;
    }
};

export const subscribeToCloudChanges = (callback: (data: any) => void) => {
    if (!db) return () => { };

    // Create subscriptions for both fragments
    const unsubUsers = onSnapshot(doc(db, 'rota-vendas', 'users-data'), (snapshot) => {
        if (snapshot.exists()) {
            callback({ users: snapshot.data().users });
        }
    });

    const unsubMaster = onSnapshot(doc(db, 'rota-vendas', 'master-data'), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            callback({
                products: data.products,
                categories: data.categories,
                uploadedFiles: data.uploadedFiles
            });
        }
    });

    // Fallback/Legacy listener for migration period
    const unsubLegacy = onSnapshot(doc(db, 'rota-vendas', 'master-data'), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            // If it's the old combined doc, it will have 'clients'
            if (data.clients) callback(data);
        }
    });

    return () => {
        unsubUsers();
        unsubMaster();
        unsubLegacy();
    };
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
