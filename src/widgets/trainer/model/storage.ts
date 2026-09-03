import { isSavedRun, type SavedRun } from '@/entities/exercise';

/**
 * `sessionStorage`, deliberately not `localStorage`: this is "the drill I am in the middle
 * of", and it should end when the tab does. Remembering across days is spaced repetition,
 * which is phase 6 and carries decisions this has no business pre-empting — what a lapse
 * is, how progress migrates when a pattern's case is corrected, how it is exported.
 *
 * Every access is wrapped: a browser set to block site data throws on the accessor itself,
 * and a trainer that will not open because it cannot save is worse than one that forgets.
 */

const KEY = 'worauf:run';

export function loadRun(): SavedRun | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSavedRun(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveRun(saved: SavedRun): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Nothing to do and nothing worth saying: the drill still works, it just will not
    // survive a navigation.
  }
}

export function clearRun(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // As above.
  }
}
