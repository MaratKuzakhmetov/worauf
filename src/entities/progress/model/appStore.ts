import { idbGet, idbSet } from '@/shared/lib/idb';
import { PROGRESS_KEY, createProgressStore, loadProgress, type Backend } from './store';
import type { ProgressFile } from './schema';
import type { ProgressStore } from './store';

/**
 * The one place that names a real IndexedDB.
 *
 * `store.ts` takes its backend as an argument so its debounce, flush and failure handling can
 * be tested — jsdom 30 has no IndexedDB, so a module that reached for one directly would be
 * untestable in this project's own suite. Everything here is wiring, and it is deliberately
 * too thin to hold a decision.
 */

const backend: Backend = { get: idbGet, set: idbSet };

export function loadStoredProgress(): Promise<ProgressFile | null> {
  return loadProgress(backend);
}

/** For the import action, which writes once and has nothing to debounce. */
export async function writeProgressNow(progress: ProgressFile): Promise<boolean> {
  try {
    await idbSet(PROGRESS_KEY, progress);
    return true;
  } catch {
    return false;
  }
}

export function createAppStore(onWriteFailure?: () => void): ProgressStore {
  return createProgressStore({
    backend,
    /*
     * Asked for at the first write rather than on load: before the first answer there is
     * nothing to protect, and a storage prompt fired at someone who has not used the trainer
     * yet is both a distraction and likelier to be refused.
     */
    persist: () => navigator.storage?.persist?.() ?? Promise.resolve(false),
    onWriteFailure,
  });
}
