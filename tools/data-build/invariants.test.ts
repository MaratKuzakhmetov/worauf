import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isPreposition } from '@/entities/preposition';
import { isValidSlug } from '@/shared/lib/slug';
import { compile } from './compile';
import { checkCaseAgreement, findPreposition, mentionsLemma } from './german';
import { DATA_DIR, loadAuthoredFiles, topLevelKeys } from './load';

/**
 * The dataset is the product: a wrong case teaches a wrong fact, and no component test
 * catches that. These run over the authored files and gate the build (docs/DATA_MODEL.md §5).
 */

const files = loadAuthoredFiles();
const inputs = files.flatMap(({ entries }) =>
  Object.entries(entries).map(([lemma, entry]) => ({ lemma, entry })),
);
const { rektionen, collisions } = compile(inputs);

describe('the authoring files', () => {
  it('parse and validate', () => {
    expect(files.length).toBeGreaterThan(0);
    expect(inputs.length).toBeGreaterThan(0);
  });

  // Invariant 9 — the formalisation of docs/DATA_MODEL.md §2. Grouping by preposition is
  // what hid 21 patterns in the prototype; alphabetical order by lemma is what exposes them.
  it('are sorted by lemma, so a word’s second preposition cannot hide from the eye', () => {
    for (const { file } of files) {
      const keys = topLevelKeys(readFileSync(join(DATA_DIR, file), 'utf8'));
      const sorted = [...keys].sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
      expect(keys, `${file} is out of order`).toEqual(sorted);
    }
  });
});

describe('slugs (ADR 0002)', () => {
  it('never collide — a collision is one page silently overwriting another', () => {
    expect(collisions).toEqual([]);
  });

  it('contain only url-safe characters', () => {
    for (const r of rektionen) {
      expect(isValidSlug(r.slug.word), `${r.lemma}: ${r.slug.word}`).toBe(true);
      expect(isValidSlug(r.slug.prep), `${r.lemma}: ${r.slug.prep}`).toBe(true);
    }
  });

  it('carry no umlaut, and drop sich and the article', () => {
    for (const r of rektionen) {
      expect(r.slug.word).not.toMatch(/[äöüß]/);
      expect(r.slug.word).not.toMatch(/^sich-/);
    }
  });
});

describe('identity', () => {
  it('gives every pattern a unique id', () => {
    const ids = rektionen.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never repeats lemma + pos + preposition + case', () => {
    const keys = rektionen.map((r) => `${r.lemma}|${r.pos}|${r.prep}|${r.case}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('sense contrast', () => {
  // Invariant 4 — these words are the whole point of the app. Without the note, a learner
  // sees two adjacent rows and reads them as free variants, which is a lie.
  it('explains every pattern of a word that governs more than one preposition', () => {
    const byLemma = new Map<string, typeof rektionen>();
    for (const r of rektionen) {
      const key = `${r.lemma}|${r.pos}`;
      byLemma.set(key, [...(byLemma.get(key) ?? []), r]);
    }
    for (const [key, group] of byLemma) {
      if (group.length < 2) continue;
      for (const r of group) {
        expect(r.senseNote?.ru, `${key} → ${r.prep}: senseNote.ru missing`).toBeTruthy();
        expect(r.senseNote?.en, `${key} → ${r.prep}: senseNote.en missing`).toBeTruthy();
      }
    }
  });
});

describe('both languages', () => {
  // Invariant 10a — a half-translated record quietly degrades one of the two apps,
  // and only a human reading it would ever notice.
  it('are filled on every gloss, note and example', () => {
    for (const r of rektionen) {
      expect(r.gloss.ru, `${r.id}`).toBeTruthy();
      expect(r.gloss.en, `${r.id}`).toBeTruthy();
      for (const example of r.examples) {
        expect(example.de, `${r.id}`).toBeTruthy();
        expect(example.ru, `${r.id}`).toBeTruthy();
        expect(example.en, `${r.id}`).toBeTruthy();
      }
    }
  });
});

describe('shape', () => {
  it('gives an article to nouns and only to nouns', () => {
    for (const r of rektionen) {
      expect(r.article !== undefined, `${r.id}`).toBe(r.pos === 'noun');
    }
  });

  it('marks reflexive only on verbs', () => {
    for (const r of rektionen) {
      if (r.reflexive !== undefined) expect(r.pos, `${r.id}`).toBe('verb');
    }
  });

  it('uses only prepositions from the table', () => {
    for (const r of rektionen) expect(isPreposition(r.prep), `${r.id}`).toBe(true);
  });
});

describe('examples', () => {
  // Invariants 6–8 are the ones that actually pay: they catch a sentence copied from the
  // neighbouring entry, which is how this dataset will mostly be written.
  it('contain the preposition of their own pattern', () => {
    for (const r of rektionen) {
      for (const example of r.examples) {
        const sighting = findPreposition(example.de, r.prep);
        expect(sighting.kind, `${r.id}: "${example.de}" lacks "${r.prep}"`).not.toBe('absent');
      }
    }
  });

  it('contain a recognisable form of their own lemma', () => {
    for (const r of rektionen) {
      for (const example of r.examples) {
        expect(
          mentionsLemma(example.de, r.lemma, example.lemmaForm),
          `${r.id}: "${example.de}" does not show "${r.lemma}" — declare lemmaForm if the form is irregular`,
        ).toBe(true);
      }
    }
  });

  it('never contradict the declared case', () => {
    for (const r of rektionen) {
      for (const example of r.examples) {
        const check = checkCaseAgreement(example.de, r.prep, r.case);
        expect(
          check.verdict === 'disagrees' ? `${r.id}: "${example.de}" reads as another case` : 'ok',
        ).toBe('ok');
      }
    }
  });
});
