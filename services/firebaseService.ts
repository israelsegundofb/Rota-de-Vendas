
import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, Firestore, doc, getDoc, setDoc, onSnapshot, collection, addDoc, query, orderBy, updateDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
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
            console.error('Logging failed:', e);
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

    if (users.length === 0) {
        console.warn('[FIREBASE] Blocked save attempt with 0 users.');
        return;
    }

    try {
        const lastUpdated = new Date().toISOString();
        const operations: { ref: any, data: any }[] = [];

        // 1. Prepare Operations
        users.forEach(user => {
            operations.push({
                ref: doc(db!, 'rota-vendas-data', 'users', 'list', user.id),
                data: { ...removeUndefined(user), lastUpdated }
            });
        });

        clients.forEach(client => {
            operations.push({
                ref: doc(db!, 'rota-vendas-data', 'clients', 'list', client.id),
                data: { ...removeUndefined(client), lastUpdated }
            });
        });

        products.forEach(product => {
            const productId = (product as any).id || `prod_${product.sku.replace(/\s+/g, '_')}`;
            operations.push({
                ref: doc(db!, 'rota-vendas-data', 'products', 'list', productId),
                data: { ...removeUndefined(product), id: productId, lastUpdated }
            });
        });

        // 2. Commit in Chunks of 450 (Firestore limit is 500)
        const CHUNK_SIZE = 450;
        console.warn(`[FIREBASE] Total operations to save: ${operations.length}. Splitting into chunks...`);

        for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
            const batch = writeBatch(db);
            const chunk = operations.slice(i, i + CHUNK_SIZE);

            chunk.forEach(op => batch.set(op.ref, op.data));

            await batch.commit();
            console.warn(`[FIREBASE] Chunk ${Math.floor(i / CHUNK_SIZE) + 1} saved ✅`);

            // Add delay between batches to prevent resource-exhausted errors
            if (i + CHUNK_SIZE < operations.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // 3. Save Metadata (Final Batch)
        const metaBatch = writeBatch(db);
        const metaRef = doc(db, 'rota-vendas-data', 'metadata');
        metaBatch.set(metaRef, {
            categories: removeUndefined(categories),
            uploadedFiles: removeUndefined(uploadedFiles),
            lastUpdated,
            version: 'V5.1',
            totalClients: clients.length,
            totalUsers: users.length
        });
        await metaBatch.commit();

        console.log('✅ V5.1: All data segments synchronized granullarly to cloud');
    } catch (e) {
        console.error("Error saving to cloud (V5.1):", e);
        throw e;
    }
};

export const loadFromCloud = async (): Promise<any | null> => {
    if (!db) return null;

    try {
        // Load Collections in Parallel
        const [usersSnap, clientsSnap, productsSnap, metaSnap] = await Promise.all([
            getDocs(collection(db, 'rota-vendas-data', 'users', 'list')),
            getDocs(collection(db, 'rota-vendas-data', 'clients', 'list')),
            getDocs(collection(db, 'rota-vendas-data', 'products', 'list')),
            getDoc(doc(db, 'rota-vendas-data', 'metadata'))
        ]);

        // Fallback check: If new collection structure is empty, try V4 architecture
        if (usersSnap.empty && clientsSnap.empty) {
            console.warn('[FIREBASE] V5 collections empty, falling back to V4 document structure');
            const [u4, c4, m4] = await Promise.all([
                getDoc(doc(db, 'rota-vendas', 'users-data')),
                getDoc(doc(db, 'rota-vendas', 'clients-data')),
                getDoc(doc(db, 'rota-vendas', 'master-data'))
            ]);

            if (u4.exists() || c4.exists() || m4.exists()) {
                const legacy: any = {};
                if (u4.exists()) legacy.users = u4.data().users;
                if (c4.exists()) legacy.clients = c4.data().clients;
                if (m4.exists()) {
                    const d = m4.data();
                    legacy.products = d.products;
                    legacy.categories = d.categories;
                    legacy.uploadedFiles = d.uploadedFiles;
                }
                return legacy;
            }
            return null;
        }

        const result: any = {
            users: usersSnap.docs.map(d => d.data()),
            clients: clientsSnap.docs.map(d => d.data()),
            products: productsSnap.docs.map(d => d.data())
        };

        if (metaSnap.exists()) {
            const meta = metaSnap.data();
            result.categories = meta.categories;
            result.uploadedFiles = meta.uploadedFiles;
        }

        return result;
    } catch (e) {
        console.error("Error loading from cloud (V5.0):", e);
        return null;
    }
};

export const subscribeToCloudChanges = (callback: (data: any) => void) => {
    if (!db) return () => { };

    // In V5, we subscribe to the collections
    const unsubUsers = onSnapshot(collection(db, 'rota-vendas-data', 'users', 'list'), (snap) => {
        if (!snap.empty) callback({ users: snap.docs.map(d => d.data()) });
    });

    const unsubClients = onSnapshot(collection(db, 'rota-vendas-data', 'clients', 'list'), (snap) => {
        if (!snap.empty) callback({ clients: snap.docs.map(d => d.data()) });
    });

    const unsubMeta = onSnapshot(doc(db, 'rota-vendas-data', 'metadata'), (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            callback({
                categories: data.categories,
                uploadedFiles: data.uploadedFiles
            });
        }
    });

    return () => {
        unsubUsers();
        unsubClients();
        unsubMeta();
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
