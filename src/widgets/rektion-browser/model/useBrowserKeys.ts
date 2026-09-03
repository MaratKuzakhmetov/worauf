import { useEffect, useRef, type RefObject } from 'react';

/**
 * The keyboard floor from docs/DESIGN.md §10: ↑↓ inside a pane, ←→ between panes,
 * Enter to open (native, the rows are links), Esc to clear, `/` to search, Space for a
 * random pattern.
 *
 * Focus is moved through the DOM rather than mirrored into state. The rows are already
 * links in document order, so the browser's own focus model is the shorter path — a
 * parallel "focused index" in React would be a second source of truth for something the
 * DOM already knows, and the two would drift the moment a search narrows the list.
 */

type BrowserKeys = {
  query: string;
  hasSelection: boolean;
  searchRef: RefObject<HTMLInputElement | null>;
  onClearQuery: () => void;
  onClearSelection: () => void;
  onRandom: () => void;
};

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function panes(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-pane]')];
}

function rowsIn(pane: HTMLElement): HTMLElement[] {
  return [...pane.querySelectorAll<HTMLElement>('[data-row]')];
}

function focusRow(row: HTMLElement | undefined): void {
  if (!row) return;
  row.focus();
  // `nearest` only: scrolling a list that is already in view fights the person reading it.
  row.scrollIntoView({ block: 'nearest' });
}

function selectedIn(pane: HTMLElement): HTMLElement | null {
  return pane.querySelector<HTMLElement>('[data-row][aria-current="page"]');
}

function moveWithinPane(delta: number): void {
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const pane = active?.closest<HTMLElement>('[data-pane]') ?? panes()[0];
  if (!pane) return;

  const rows = rowsIn(pane);
  if (rows.length === 0) return;

  const index = active ? rows.indexOf(active) : -1;
  if (index === -1) {
    // Nothing focused yet — start from the selection, so the first arrow key continues
    // from where the eye already is instead of jumping to the top of the alphabet.
    focusRow(selectedIn(pane) ?? rows[0]);
    return;
  }

  focusRow(rows[Math.min(rows.length - 1, Math.max(0, index + delta))]);
}

function moveBetweenPanes(delta: number): void {
  const all = panes();
  if (all.length === 0) return;

  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const current = active?.closest<HTMLElement>('[data-pane]') ?? null;
  const from = current ? all.indexOf(current) : -1;
  const target = all[Math.min(all.length - 1, Math.max(0, from + delta))];
  if (!target) return;

  focusRow(selectedIn(target) ?? rowsIn(target)[0]);
}

export function useBrowserKeys(options: BrowserKeys): void {
  // The handler is attached once; everything it needs is read from this ref at the moment
  // the key is pressed. Re-attaching a document listener on every render would make the
  // dependency list a list of every prop that happens to be a closure.
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const { query, hasSelection, searchRef, onClearQuery, onClearSelection, onRandom } =
        latest.current;

      if (event.key === 'Escape') {
        if (query !== '') onClearQuery();
        else if (hasSelection) onClearSelection();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === '/' && !isTyping(event.target)) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }

      if (isTyping(event.target)) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          moveWithinPane(1);
          return;
        case 'ArrowUp':
          event.preventDefault();
          moveWithinPane(-1);
          return;
        case 'ArrowRight':
          event.preventDefault();
          moveBetweenPanes(1);
          return;
        case 'ArrowLeft':
          event.preventDefault();
          moveBetweenPanes(-1);
          return;
        case ' ':
          event.preventDefault();
          onRandom();
          return;
        default:
          return;
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
