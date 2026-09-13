import { progressFile, type ProgressFile } from './schema';

/**
 * Getting the record onto disk without making the trainer wait for it, and without losing the
 * last answer of a session (ADR 0005).
 *
 * The backend is injected rather than imported so this logic can be tested: jsdom 30 ships no
 * IndexedDB at all, so a module that reached for `@/shared/lib/idb` directly would be
 * untestable in this project's own suite. `shared/lib/idb` supplies the real pair in the app.
 */

export const PROGRESS_KEY = 'worauf-progress';
export const WRITE_DEBOUNCE_MS = 500;

export type Backend = {
  readonly get: (key: string) => Promise<unknown>;
  readonly set: (key: string, value: unknown) => Promise<void>;
};

export type StoreOptions = {
  readonly backend: Backend;
  readonly debounceMs?: number;
  /**
   * Asks for storage that eviction skips. Called ONCE, immediately before the first write —
   * not on page load. Before the first answer there is nothing to lose, and a permission
   * prompt shown to someone who has not used the feature yet is both a distraction and likelier
   * to be dismissed.
   */
  readonly persist?: () => Promise<boolean>;
  /** Told once, and only once, that writing does not work here. */
  readonly onWriteFailure?: () => void;
};

export type ProgressStore = {
  /** Queues a debounced write. */
  readonly save: (progress: ProgressFile) => void;
  /** Writes immediately — for `pagehide`, where there is no next tick. */
  readonly flush: () => Promise<void>;
};

/** Storage is never a trusted source, even when this application is what filled it. */
export async function loadProgress(backend: Backend): Promise<ProgressFile | null> {
  try {
    const raw = await backend.get(PROGRESS_KEY);
    if (raw === undefined || raw === null) return null;
    const parsed = progressFile.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    // Private mode, blocked site data, a browser with IndexedDB switched off. Starting from
    // an empty record is correct; refusing to open the trainer is not.
    return null;
  }
}

export function createProgressStore(options: StoreOptions): ProgressStore {
  const { backend, debounceMs = WRITE_DEBOUNCE_MS, persist, onWriteFailure } = options;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: ProgressFile | null = null;
  let askedToPersist = false;
  let reportedFailure = false;

  async function write(progress: ProgressFile): Promise<void> {
    if (!askedToPersist) {
      askedToPersist = true;
      try {
        await persist?.();
      } catch {
        // A refusal changes nothing: the offer to export the file is the fallback, and it is
        // not conditional on this.
      }
    }

    try {
      await backend.set(PROGRESS_KEY, progress);
    } catch {
      /*
       * A failed write must never break the drill. The session continues from memory; the
       * user is told once, so that "export your progress" is a suggestion they can act on
       * rather than a surprise the next time they open the app to an empty record.
       */
      if (!reportedFailure) {
        reportedFailure = true;
        onWriteFailure?.();
      }
    }
  }

  return {
    save(progress: ProgressFile): void {
      pending = progress;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        const next = pending;
        pending = null;
        if (next) void write(next);
      }, debounceMs);
    },

    async flush(): Promise<void> {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      const next = pending;
      pending = null;
      if (next) await write(next);
    },
  };
}
