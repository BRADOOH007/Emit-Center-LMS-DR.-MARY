'use client';

// Offline lesson storage using IndexedDB. Downloaded lessons are cached locally
// so students can review them without a connection, and completion is queued for
// later sync.

const DB_NAME = 'emit-offline';
const STORE_LESSONS = 'lessons';
const STORE_QUEUE = 'completion-queue';

interface DownloadedLesson {
  id: string;
  courseId: string;
  title: string;
  type: string;
  savedAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_LESSONS)) {
        db.createObjectStore(STORE_LESSONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const s = tx.objectStore(store);
    const req = fn(s);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function saveLessonOffline(lesson: DownloadedLesson): Promise<void> {
  await withStore(STORE_LESSONS, 'readwrite', (s) => s.put(lesson));
}

export async function removeLessonOffline(id: string): Promise<void> {
  await withStore(STORE_LESSONS, 'readwrite', (s) => s.delete(id));
}

export async function getOfflineLessons(): Promise<DownloadedLesson[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_LESSONS, 'readonly');
      const req = tx.objectStore(STORE_LESSONS).getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return [];
  }
}

export async function queueCompletion(lesson: { id: string; courseId: string }): Promise<void> {
  await withStore(STORE_QUEUE, 'readwrite', (s) =>
    s.put({ id: lesson.id, courseId: lesson.courseId, queuedAt: new Date().toISOString() }),
  );
}

export async function flushCompletionQueue(onSync: (item: { id: string; courseId: string }) => Promise<void>): Promise<number> {
  const items = await withStore<{ id: string; courseId: string }[]>(STORE_QUEUE, 'readonly', (s) => s.getAll() as IDBRequest<{ id: string; courseId: string }[]>).catch(() => []);
  let synced = 0;
  for (const item of items) {
    try {
      await onSync(item);
      await withStore(STORE_QUEUE, 'readwrite', (s) => s.delete(item.id)).catch(() => {});
      synced++;
    } catch {
      // keep for next attempt
    }
  }
  return synced;
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}
