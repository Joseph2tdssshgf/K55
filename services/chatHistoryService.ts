import { ChatSession } from '../types.ts';

const DB_NAME = 'JosephSirAIDB';
const DB_VERSION = 1;
const SESSIONS_STORE_NAME = 'chatSessions';
const STATE_STORE_NAME = 'appState';
const ACTIVE_CHAT_ID_KEY = 'activeChatId';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error("IndexedDB is not supported by this browser."));
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error("IndexedDB error:", request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(SESSIONS_STORE_NAME)) {
                    db.createObjectStore(SESSIONS_STORE_NAME, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STATE_STORE_NAME)) {
                    db.createObjectStore(STATE_STORE_NAME, { keyPath: 'key' });
                }
            };
        });
    }
    return dbPromise;
};


export const getAllChatSessions = async (): Promise<Record<string, ChatSession>> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SESSIONS_STORE_NAME, 'readonly');
        const store = transaction.objectStore(SESSIONS_STORE_NAME);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const sessionsArray = request.result as ChatSession[];
            const sessionsRecord: Record<string, ChatSession> = {};
            for (const session of sessionsArray) {
                sessionsRecord[session.id] = session;
            }
            resolve(sessionsRecord);
        };
    });
};

export const saveChatSession = async (session: ChatSession): Promise<void> => {
    const db = await getDb();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(SESSIONS_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SESSIONS_STORE_NAME);
        store.put(session);

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject((event.target as IDBRequest).error);
    });
};

export const deleteChatSession = async (id: string): Promise<void> => {
    const db = await getDb();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(SESSIONS_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SESSIONS_STORE_NAME);
        store.delete(id);
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject((event.target as IDBRequest).error);
    });
};


export const getActiveChatId = async (): Promise<string | null> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STATE_STORE_NAME, 'readonly');
        const store = transaction.objectStore(STATE_STORE_NAME);
        const request = store.get(ACTIVE_CHAT_ID_KEY);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            resolve(request.result ? request.result.value : null);
        };
    });
};

export const setActiveChatId = async (id: string | null): Promise<void> => {
    const db = await getDb();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STATE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STATE_STORE_NAME);
        
        const request = id === null 
            ? store.delete(ACTIVE_CHAT_ID_KEY)
            : store.put({ key: ACTIVE_CHAT_ID_KEY, value: id });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject((event.target as IDBRequest).error);
    });
};