
import { initializeApp, FirebaseApp, getApps, getApp, deleteApp } from 'firebase/app';
import { initializeFirestore, Firestore, doc, getDoc, setDoc, onSnapshot, collection, addDoc, query, orderBy, updateDoc } from 'firebase/firestore';
import { getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FirebaseConfig, getStoredFirebaseConfig } from '../firebaseConfig';
import { EnrichedClient, Product, AppUser, ChatMessage } from '../types';

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

export const initializeFirebase = async (config?: FirebaseConfig): Promise<boolean> => {
    try {
        const firebaseConfig = config || getStoredFirebaseConfig();
        if (!firebaseConfig) return false;

        // Check if app is already initialized
        if (getApps().length > 0) {
            app = getApp();
        } else {
            app = initializeApp(firebaseConfig);
        }

        // Initialize Cloud Firestore with no-persistence settings for Incognito compatibility
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

// -- DATA SYNC FUNCTIONS --

// Helper: Remove undefined values (Firestore doesn't support undefined)
const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(removeUndefined);
    if (typeof obj !== 'object') return obj;

    const cleaned: any = {};
    for (const key in obj) {
        const value = obj[key];
        if (value === undefined) {
            cleaned[key] = null; // Convert undefined to null
        } else if (value !== null && typeof value === 'object') {
            cleaned[key] = removeUndefined(value);
        } else {
            cleaned[key] = value;
        }
    }
    return cleaned;
};

// Save Master Data (Clients, Products, Users, Categories, UploadedFiles)
export const saveToCloud = async (
    clients: EnrichedClient[],
    products: Product[],
    categories: string[],
    users: AppUser[],
    uploadedFiles: any[] = [] // uploadedFiles
) => {
    if (!db) return;

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

        // We store extensive data in a single doc for MVP simplicity (like the JSON backup)
        // In a real large-scale app, we would use subcollections.
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

// Real-time listener
export const subscribeToCloudChanges = (callback: (data: any) => void) => {
    if (!db) return () => { };

    return onSnapshot(doc(db, 'rota-vendas', 'master-data'), (doc) => {
        if (doc.exists()) {
            callback(doc.data());
        }
    });
};

// -- STORAGE FUNCTIONS --

/**
 * Uploads a file to Firebase Storage and returns the download URL
 * @param file The file to upload
 * @param path The path in storage (e.g. 'uploads/csv/filename.csv')
 */
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
