'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PatternWeight } from '@/entities/exercise';
import {
  createAppStore,
  emptyProgress,
  loadStoredProgress,
  ratingFor,
  recordReview,
  selectionWeight,
  type ProgressFile,
  type ProgressStore,
} from '@/entities/progress';
import { datasetVersion } from '@/entities/rektion';

/**
 * The join between the trainer and stored history (ADR 0005).
 *
 * `entities/exercise` and `entities/progress` do not import each other; this widget-level
 * hook is the only thing that knows both exist. What it hands the trainer is a plain
 * `(patternId) => number`, so the exercise entity never learns what a card is — and nothing
 * about a due date, a backlog or a streak crosses this boundary, because none is computed.
 */

export type ProgressHandle = {
  /** Null until the record has been read: the first paint cannot know what is stored. */
  readonly progress: ProgressFile | null;
  readonly recordAnswer: (patternId: string, correct: boolean) => void;
  /** Weights for planning, read as of a moment — the session's start. */
  readonly weightAt: (at: number) => PatternWeight;
  readonly writeFailed: boolean;
};

export function useProgress(): ProgressHandle {
  const [progress, setProgress] = useState<ProgressFile | null>(null);
  const [writeFailed, setWriteFailed] = useState(false);
  const storeRef = useRef<ProgressStore | null>(null);
  const latest = useRef<ProgressFile | null>(null);

  useEffect(() => {
    let cancelled = false;
    storeRef.current = createAppStore(() => setWriteFailed(true));

    void loadStoredProgress().then((stored) => {
      if (cancelled) return;
      const next = stored ?? emptyProgress(datasetVersion, Date.now());
      latest.current = next;
      setProgress(next);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * The debounce would otherwise drop the last answer of a session — exactly the moment
   * someone closes the tab having reached the summary. `pagehide` fires for a bfcache
   * eviction as well as a real unload; `visibilitychange` catches the mobile case, where a
   * tab is backgrounded and never formally closed. ADR 0005 calls this out as the one part
   * that has to be checked by hand: a test for closing a tab is not worth trusting.
   */
  useEffect(() => {
    function flush(): void {
      void storeRef.current?.flush();
    }
    function onVisibility(): void {
      if (document.visibilityState === 'hidden') flush();
    }
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
  }, []);

  const recordAnswer = useCallback((patternId: string, correct: boolean) => {
    const current = latest.current;
    if (!current) return;

    const next = recordReview(current, patternId, ratingFor(correct), Date.now());
    latest.current = next;
    setProgress(next);
    storeRef.current?.save(next);
  }, []);

  const weightAt = useCallback(
    (at: number): PatternWeight => {
      const snapshot = progress;
      if (!snapshot) return () => 1;
      return (patternId: string) => selectionWeight(snapshot, patternId, at);
    },
    [progress],
  );

  return { progress, recordAnswer, weightAt, writeFailed };
}
