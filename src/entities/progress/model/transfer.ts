import {
  PROGRESS_SCHEMA_VERSION,
  progressExport,
  type Card,
  type ProgressExport,
  type ProgressFile,
} from './schema';

/**
 * Export and import (ADR 0005).
 *
 * Import MERGES rather than replaces, per card, by `updatedAt`. That single choice is what
 * makes the file a way to carry progress from a phone to a laptop rather than only a way to
 * recover from a disaster — and with no account, no server and no sync, the file is the only
 * transport there is.
 */

export function buildExport(
  progress: ProgressFile,
  appVersion: string,
  exportedAt: number,
): ProgressExport {
  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    exportedAt,
    appVersion,
    datasetVersion: progress.datasetVersion,
    cards: progress.cards,
  };
}

export function exportFilename(exportedAt: number): string {
  const date = new Date(exportedAt).toISOString().slice(0, 10);
  return `worauf-progress-${date}.json`;
}

export type ImportFailure =
  /** Not JSON, or JSON that is not one of our files at all. */
  | { readonly kind: 'unreadable' }
  /** Written by a NEWER worauf. Refused on purpose — see below. */
  | { readonly kind: 'too-new'; readonly fileVersion: number; readonly appVersion: number };

export type ImportResult =
  | { readonly ok: true; readonly progress: ProgressFile; readonly merged: number }
  | { readonly ok: false; readonly failure: ImportFailure };

/**
 * Merge rule: per `id`, the card with the larger `updatedAt` wins outright. Cards are not
 * blended field by field — two schedules for one pattern are two opinions about the same
 * thing, and averaging them produces a third that neither device ever held.
 */
export function mergeCards(
  mine: Readonly<Record<string, Card>>,
  theirs: Readonly<Record<string, Card>>,
): { cards: Record<string, Card>; merged: number } {
  const cards: Record<string, Card> = { ...mine };
  let merged = 0;

  for (const [id, incoming] of Object.entries(theirs)) {
    const existing = cards[id];
    if (!existing || incoming.updatedAt > existing.updatedAt) {
      cards[id] = incoming;
      merged += 1;
    }
  }
  return { cards, merged };
}

export function parseImport(raw: string, into: ProgressFile, now: number): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, failure: { kind: 'unreadable' } };
  }

  /*
   * The version gate is checked BEFORE the shape, and a newer file is refused rather than
   * accepted-with-losses. Zod would happily strip fields it does not know, which is precisely
   * the silent corruption to avoid: the user carried this file here from a newer build, and
   * dropping half of it while reporting success is worse than importing nothing.
   */
  const version = (parsed as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (typeof version === 'number' && version > PROGRESS_SCHEMA_VERSION) {
    return {
      ok: false,
      failure: { kind: 'too-new', fileVersion: version, appVersion: PROGRESS_SCHEMA_VERSION },
    };
  }

  const file = progressExport.safeParse(parsed);
  if (!file.success) return { ok: false, failure: { kind: 'unreadable' } };

  // An older file would be migrated forward here. At version 1 there is nothing to migrate,
  // and writing a speculative migration for a shape that has never existed is how migrations
  // get written wrong.
  const { cards, merged } = mergeCards(into.cards, file.data.cards);
  return { ok: true, progress: { ...into, updatedAt: now, cards }, merged };
}
