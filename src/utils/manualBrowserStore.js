// Browser-only preview cache for one uploaded image/CSV pair. The backend
// persists the original pair only once through /api/measurements/auto-predict.
const DB_NAME = 'cnc-wearpoint-manual-replay-v1';
const FILES = 'files';
const RESULTS = 'results';

function openStore() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unsupported'));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(FILES)) request.result.createObjectStore(FILES);
      if (!request.result.objectStoreNames.contains(RESULTS)) request.result.createObjectStore(RESULTS);
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function transact(mode, store, operation) {
  const db = await openStore();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const request = operation(tx.objectStore(store));
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IDB transaction aborted'));
    });
  } finally { db.close(); }
}
export async function saveBrowserSession(data) {
  await transact('readwrite', FILES, (s) => s.put(data, 'current'));
  await transact('readwrite', RESULTS, (s) => s.delete('current'));
}
export async function loadBrowserSession() {
  const data = await transact('readonly', FILES, (s) => s.get('current'));
  if (!data) return null;
  const prediction = await transact('readonly', RESULTS, (s) => s.get('current'));
  return { ...data, prediction: prediction ?? null };
}
export async function saveBrowserPrediction(data) {
  return transact('readwrite', RESULTS, (s) => s.put(data, 'current'));
}
export async function clearBrowserSession() {
  await Promise.all([
    transact('readwrite', FILES, (s) => s.delete('current')),
    transact('readwrite', RESULTS, (s) => s.delete('current')),
  ]);
}
