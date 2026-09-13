/**
 * Twenty-five lines over IndexedDB, deliberately instead of `idb-keyval` (ADR 0005).
 *
 * The argument is not that the library is bad — it is 748 bytes and perfectly good. It is
 * that this project already hand-writes its search index, its Levenshtein pass and its i18n
 * table, and `get`/`set` on a single key is `open`, `transaction`, `objectStore`, `put`,
 * `get` wrapped in promises. Taking a dependency for that buys a release cycle to follow and
 * an approval to ask for.
 *
 * Nothing here knows what a card is: this is storage, not domain.
 */

const DB_NAME = 'worauf';
const STORE = 'kv';

/**
 * `request.error` is `DOMException | null`, and the null case is real: a transaction aborted
 * by quota or by a private-mode block can surface with no error attached. Rejecting with that
 * null hands the caller an `undefined` to log, which is how a storage failure becomes
 * unexplainable in a project with no telemetry to ask afterwards.
 */
function failure(request: IDBRequest, what: string): Error {
  return request.error ?? new Error(`IndexedDB ${what} failed without an error`);
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(failure(request, 'open'));
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  body: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = body(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(failure(request, mode));
    });
  } finally {
    db.close();
  }
}

export function idbGet<T>(key: string): Promise<T | undefined> {
  return run<T | undefined>('readonly', (store) => store.get(key));
}

export function idbSet(key: string, value: unknown): Promise<void> {
  return run<void>('readwrite', (store) => store.put(value, key));
}
