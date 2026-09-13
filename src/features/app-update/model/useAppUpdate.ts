'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Registers the service worker and reports when a newer one is sitting in `waiting`.
 *
 * This is the `registerType: 'prompt'` behaviour `STACK.md` §5.3 asked for, built by hand
 * (ADR 0006). The worker never takes over on its own: it installs, waits, and this hook
 * surfaces it so the reader decides. Silent self-update is the one thing an app that
 * teaches cases must not do — the answers would change under a session in progress.
 *
 * None of this can be covered in CI: it needs a real worker, two visits and a network
 * toggle. The hand-check list is `docs/SERVICE_WORKER_CHECKS.md`.
 */

export type AppUpdate = {
  readonly ready: boolean;
  readonly accept: () => void;
};

export function useAppUpdate(): AppUpdate {
  const [ready, setReady] = useState(false);
  const waiting = useRef<ServiceWorker | null>(null);
  /** Set only when this page asked for the takeover, so a foreign one cannot reload us. */
  const accepted = useRef(false);

  useEffect(() => {
    // `next dev` serves no worker: it is generated into `out/` after `next build`, and a
    // worker in development mostly serves to cache the bug you are trying to look at.
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    let cancelled = false;

    function offer(worker: ServiceWorker | null): void {
      // A worker that installed with nothing to replace is the FIRST one. It activates
      // immediately and there is nothing to prompt about; only a replacement is news.
      if (cancelled || !worker || !navigator.serviceWorker.controller) return;
      waiting.current = worker;
      setReady(true);
    }

    void navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        if (cancelled) return;

        offer(registration.waiting);

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed') offer(registration.waiting ?? installing);
          });
        });
      })
      .catch(() => {
        // An unregistrable worker means no offline, not a broken app: everything the reader
        // came for is already in the bundle. Nothing to report and nowhere to report it.
      });

    function onControllerChange(): void {
      if (accepted.current) window.location.reload();
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const accept = useCallback(() => {
    accepted.current = true;
    setReady(false);
    waiting.current?.postMessage({ type: 'SKIP_WAITING' });
  }, []);

  return { ready, accept };
}
