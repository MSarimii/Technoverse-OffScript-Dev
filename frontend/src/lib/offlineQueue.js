const DB_NAME = 'sems_offline_db';
const STORE_NAME = 'answer_queues';

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function readQueue(attemptId) {
  if (!attemptId) return [];
  try {
    const raw = localStorage.getItem(`sems_queue_${attemptId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback to IDB
  }
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(attemptId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function writeQueue(attemptId, queue) {
  if (!attemptId) return;
  try {
    localStorage.setItem(`sems_queue_${attemptId}`, JSON.stringify(queue));
  } catch {
    // ignore quota errors
  }
  try {
    const db = await openDb();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(queue, attemptId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // localStorage already persisted
  }
}

export async function clearQueue(attemptId) {
  if (!attemptId) return;
  localStorage.removeItem(`sems_queue_${attemptId}`);
  localStorage.removeItem(`sems_seq_${attemptId}`);
  try {
    const db = await openDb();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(attemptId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}
