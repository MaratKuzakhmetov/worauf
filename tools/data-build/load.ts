import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { authoredFile, type AuthoredFile } from '@/entities/rektion/model';

export const DATA_DIR = join(process.cwd(), 'data', 'de');

export type LoadedFile = { readonly file: string; readonly entries: AuthoredFile };

/**
 * Reads and validates every authoring file. A duplicate lemma key inside one file is not
 * caught here — YAML silently keeps the last one — so `duplicateKeysIn` checks the raw text.
 * That is the failure mode ADR 0002 and DATA_MODEL §2 are built to prevent.
 */
export function loadAuthoredFiles(dir: string = DATA_DIR): LoadedFile[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.yaml'))
    .sort()
    .map((file) => {
      const text = readFileSync(join(dir, file), 'utf8');
      const duplicates = duplicateKeysIn(text);
      if (duplicates.length > 0) {
        throw new Error(`${file}: lemma appears more than once: ${duplicates.join(', ')}`);
      }
      const parsed: unknown = parse(text);
      const result = authoredFile.safeParse(parsed);
      if (!result.success) {
        throw new Error(`${file}: ${JSON.stringify(result.error.issues, null, 2)}`);
      }
      return { file, entries: result.data };
    });
}

/** Top-level keys are the lemmas: a line starting at column 0 and ending in a colon. */
export function topLevelKeys(text: string): string[] {
  return text
    .split('\n')
    .filter((line) => /^[^\s#].*:\s*$/.test(line))
    .map((line) => line.replace(/:\s*$/, ''));
}

export function duplicateKeysIn(text: string): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const key of topLevelKeys(text)) {
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  }
  return [...duplicates];
}
