import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyProgress, recordReview } from './progress';
import { PROGRESS_KEY, createProgressStore, loadProgress, type Backend } from './store';

const T0 = 1_700_000_000_000;
const V = 'abc123def456';

function fakeBackend(): Backend & { readonly writes: unknown[]; store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  const writes: unknown[] = [];
  return {
    store,
    writes,
    get: (key) => Promise.resolve(store.get(key)),
    set: (key, value) => {
      store.set(key, value);
      writes.push(value);
      return Promise.resolve();
    },
  };
}

describe('loadProgress', () => {
  it('returns null when nothing has been stored yet', async () => {
    expect(await loadProgress(fakeBackend())).toBeNull();
  });

  it('reads back what was written', async () => {
    const backend = fakeBackend();
    const progress = recordReview(emptyProgress(V, T0), 'warten-auf-akk', 3, T0);
    await backend.set(PROGRESS_KEY, progress);

    expect(await loadProgress(backend)).toEqual(progress);
  });

  it('discards a stored record that no longer matches the schema', async () => {
    const backend = fakeBackend();
    await backend.set(PROGRESS_KEY, { schemaVersion: 1, cards: { x: { id: 'x', ease: 'no' } } });
    expect(await loadProgress(backend)).toBeNull();
  });

  it('survives a backend that throws — a blocked store must not stop the trainer', async () => {
    const hostile: Backend = {
      get: () => Promise.reject(new Error('site data blocked')),
      set: () => Promise.reject(new Error('site data blocked')),
    };
    expect(await loadProgress(hostile)).toBeNull();
  });
});

describe('createProgressStore', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('debounces a burst of answers into a single write', async () => {
    const backend = fakeBackend();
    const store = createProgressStore({ backend, debounceMs: 500 });

    let progress = emptyProgress(V, T0);
    for (const id of ['a-auf-akk', 'b-an-dat', 'c-um-akk']) {
      progress = recordReview(progress, id, 3, T0);
      store.save(progress);
    }
    expect(backend.writes).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(500);
    expect(backend.writes).toHaveLength(1);
    expect(Object.keys((backend.writes[0] as typeof progress).cards)).toHaveLength(3);
  });

  it('flush writes the last answer immediately — the pagehide case', async () => {
    /*
     * The whole reason flush exists: the debounce would otherwise drop the final answer of a
     * session, which is exactly when someone closes the tab after reaching the summary.
     */
    const backend = fakeBackend();
    const store = createProgressStore({ backend, debounceMs: 500 });

    store.save(recordReview(emptyProgress(V, T0), 'last-auf-akk', 3, T0));
    await store.flush();

    expect(backend.writes).toHaveLength(1);
    expect((backend.writes[0] as ReturnType<typeof emptyProgress>).cards['last-auf-akk']).toBeDefined();
  });

  it('does not write twice when a flush follows a debounced save', async () => {
    const backend = fakeBackend();
    const store = createProgressStore({ backend, debounceMs: 500 });

    store.save(emptyProgress(V, T0));
    await store.flush();
    await vi.advanceTimersByTimeAsync(1000);

    expect(backend.writes).toHaveLength(1);
  });

  it('flushing with nothing pending writes nothing', async () => {
    const backend = fakeBackend();
    await createProgressStore({ backend }).flush();
    expect(backend.writes).toHaveLength(0);
  });

  it('asks for persistent storage once, and only when there is something to lose', async () => {
    const backend = fakeBackend();
    const persist = vi.fn(() => Promise.resolve(true));
    const store = createProgressStore({ backend, debounceMs: 10, persist });

    expect(persist).not.toHaveBeenCalled();

    store.save(emptyProgress(V, T0));
    await vi.advanceTimersByTimeAsync(10);
    store.save(emptyProgress(V, T0 + 1));
    await vi.advanceTimersByTimeAsync(10);

    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('keeps working when the write fails, and says so exactly once', async () => {
    const onWriteFailure = vi.fn();
    const failing: Backend = {
      get: () => Promise.resolve(undefined),
      set: () => Promise.reject(new Error('quota exceeded')),
    };
    const store = createProgressStore({ backend: failing, debounceMs: 10, onWriteFailure });

    store.save(emptyProgress(V, T0));
    await vi.advanceTimersByTimeAsync(10);
    store.save(emptyProgress(V, T0 + 1));
    await vi.advanceTimersByTimeAsync(10);

    expect(onWriteFailure).toHaveBeenCalledTimes(1);
  });

  it('survives a persist() that throws', async () => {
    const backend = fakeBackend();
    const store = createProgressStore({
      backend,
      debounceMs: 10,
      persist: () => Promise.reject(new Error('denied')),
    });

    store.save(emptyProgress(V, T0));
    await vi.advanceTimersByTimeAsync(10);

    expect(backend.writes).toHaveLength(1);
  });
});
