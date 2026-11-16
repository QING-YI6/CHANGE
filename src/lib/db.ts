const DB_NAME = 'change';
const STORE = 'kv';
const KEY = 'state';

let dbp: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbp;
}

export async function loadState<T>(): Promise<T | null> {
  try {
    if (typeof indexedDB !== 'undefined') {
      const db = await openDB();
      const value = await new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(KEY);
        req.onsuccess = () => resolve((req.result as T) ?? null);
        req.onerror = () => reject(req.error);
      });
      if (value) return value;
    }
  } catch (err) {
    console.warn('[db] IndexedDB 读取失败，回退到 localStorage', err);
  }
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function saveState(value: unknown): Promise<void> {
  try {
    if (typeof indexedDB !== 'undefined') {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      return;
    }
  } catch (err) {
    console.warn('[db] IndexedDB 写入失败，回退到 localStorage', err);
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch (err) {
    console.warn('[db] localStorage 写入失败', err);
  }
}

export async function clearState(): Promise<void> {
  try {
    if (typeof indexedDB !== 'undefined') {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
