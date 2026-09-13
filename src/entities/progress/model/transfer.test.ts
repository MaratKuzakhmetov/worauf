import { describe, expect, it } from 'vitest';
import { emptyProgress, recordReview } from './progress';
import { PROGRESS_SCHEMA_VERSION } from './schema';
import { DAY_MS, newCard } from './sm2';
import { buildExport, exportFilename, mergeCards, parseImport } from './transfer';

const T0 = 1_700_000_000_000;
const V = 'abc123def456';

function fileFrom(progress: ReturnType<typeof emptyProgress>): string {
  return JSON.stringify(buildExport(progress, '0.0.0', T0));
}

describe('buildExport', () => {
  it('stamps the envelope with the schema and dataset versions', () => {
    const envelope = buildExport(emptyProgress(V, T0), '0.0.0', T0);
    expect(envelope).toMatchObject({
      schemaVersion: PROGRESS_SCHEMA_VERSION,
      exportedAt: T0,
      appVersion: '0.0.0',
      datasetVersion: V,
    });
  });
});

describe('exportFilename', () => {
  it('is dated, so two exports do not look like the same file', () => {
    expect(exportFilename(Date.UTC(2026, 8, 9))).toBe('worauf-progress-2026-09-09.json');
  });
});

describe('round trip', () => {
  it('imports what it exported, unchanged', () => {
    let mine = emptyProgress(V, T0);
    mine = recordReview(mine, 'warten-auf-akk', 3, T0);
    mine = recordReview(mine, 'denken-an-akk', 1, T0);

    const result = parseImport(fileFrom(mine), emptyProgress(V, T0), T0 + 5000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.progress.cards).toEqual(mine.cards);
    expect(result.merged).toBe(2);
  });
});

describe('mergeCards', () => {
  it('takes the newer card per id', () => {
    const older = { ...newCard('a-auf-akk', T0), updatedAt: T0, reps: 1 };
    const newer = { ...newCard('a-auf-akk', T0), updatedAt: T0 + DAY_MS, reps: 9 };

    expect(mergeCards({ 'a-auf-akk': older }, { 'a-auf-akk': newer }).cards['a-auf-akk']?.reps).toBe(9);
    expect(mergeCards({ 'a-auf-akk': newer }, { 'a-auf-akk': older }).cards['a-auf-akk']?.reps).toBe(9);
  });

  it('keeps cards that exist on only one side', () => {
    const mine = { 'a-auf-akk': newCard('a-auf-akk', T0) };
    const theirs = { 'b-an-dat': newCard('b-an-dat', T0) };
    expect(Object.keys(mergeCards(mine, theirs).cards).sort()).toEqual(['a-auf-akk', 'b-an-dat']);
  });

  it('counts only the cards it actually took', () => {
    const older = { ...newCard('a-auf-akk', T0), updatedAt: T0 };
    const newer = { ...newCard('a-auf-akk', T0), updatedAt: T0 + DAY_MS };
    expect(mergeCards({ 'a-auf-akk': newer }, { 'a-auf-akk': older }).merged).toBe(0);
  });
});

describe('import merges rather than replaces', () => {
  it('is usable for carrying progress between two devices', () => {
    // The laptop knows one pattern, the phone another; neither loses its own history.
    const laptop = recordReview(emptyProgress(V, T0), 'warten-auf-akk', 3, T0);
    const phone = recordReview(emptyProgress(V, T0), 'denken-an-akk', 3, T0 + 1000);

    const result = parseImport(fileFrom(phone), laptop, T0 + 2000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.progress.cards).sort()).toEqual(['denken-an-akk', 'warten-auf-akk']);
  });
});

describe('import refusals', () => {
  it('refuses a file from a newer worauf instead of silently dropping fields', () => {
    const future = JSON.stringify({
      schemaVersion: PROGRESS_SCHEMA_VERSION + 1,
      exportedAt: T0,
      appVersion: '9.9.9',
      datasetVersion: V,
      cards: {},
      somethingNew: { weCannotUnderstand: true },
    });

    const mine = recordReview(emptyProgress(V, T0), 'warten-auf-akk', 3, T0);
    const result = parseImport(future, mine, T0);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.kind).toBe('too-new');
    expect(mine.cards['warten-auf-akk']).toBeDefined();
  });

  it('rejects text that is not JSON', () => {
    const result = parseImport('this is not a backup', emptyProgress(V, T0), T0);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.kind).toBe('unreadable');
  });

  it('rejects JSON that is some other application’s file', () => {
    const result = parseImport('{"decks":[],"notes":[]}', emptyProgress(V, T0), T0);
    expect(result.ok).toBe(false);
  });

  it('rejects a file whose cards are malformed', () => {
    const broken = JSON.stringify({
      schemaVersion: PROGRESS_SCHEMA_VERSION,
      exportedAt: T0,
      appVersion: '0.0.0',
      datasetVersion: V,
      cards: { 'a-auf-akk': { id: 'a-auf-akk', ease: 'lots' } },
    });
    expect(parseImport(broken, emptyProgress(V, T0), T0).ok).toBe(false);
  });

  it('changes nothing at all when it refuses', () => {
    const mine = recordReview(emptyProgress(V, T0), 'warten-auf-akk', 3, T0);
    const before = JSON.stringify(mine);
    parseImport('nonsense', mine, T0 + 9999);
    expect(JSON.stringify(mine)).toBe(before);
  });
});
