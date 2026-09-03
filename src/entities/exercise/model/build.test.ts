import { describe, expect, it } from 'vitest';
import { prepositions } from '@/entities/preposition';
import { rektionen } from '@/entities/rektion';
import { buildItem, gapArticle, isCorrect, kindsFor } from './build';

/** Real records, never invented German (CLAUDE.md). A fixed source keeps the tests honest. */
const steady = () => 0.42;
const find = (lemma: string, prep: string) =>
  rektionen.find((r) => r.lemma === lemma && r.prep === prep);

describe('gapArticle', () => {
  it('splits a real example around the preposition and its article', () => {
    const warten = find('warten', 'auf');
    expect(warten).toBeDefined();
    const gap = warten ? gapArticle(warten, rektionen) : undefined;
    expect(gap?.determiner).toBeDefined();
    expect(gap?.otherCase).not.toBe(warten?.case);
  });

  it('refuses a determiner whose form does not settle gender and number', () => {
    // `die` is feminine singular or plural, and their datives differ (`der` / `den`).
    // Guessing would put fabricated German in front of a learner.
    const ambiguous = rektionen.filter((r) => {
      const gap = gapArticle(r, rektionen);
      return gap?.determiner.toLowerCase() === 'die';
    });
    expect(ambiguous).toEqual([]);
  });
});

describe('article items', () => {
  const warten = find('warten', 'auf');
  const item = warten ? buildItem(warten, 'article', rektionen, steady) : undefined;

  it('offers the same preposition in a different case as the first wrong option', () => {
    const competitive = item?.options.filter((o) => o.competitive) ?? [];
    expect(competitive).toHaveLength(1);
    const rival = competitive[0];
    expect(rival?.label.startsWith('auf ')).toBe(true);
    expect(rival?.case).not.toBe(warten?.case);
  });

  it('offers exactly one correct answer', () => {
    expect(item?.options.filter((o) => o.correct)).toHaveLength(1);
  });

  it('keeps every option a real two-word phrase, never a fragment', () => {
    for (const option of item?.options ?? []) {
      expect(option.label.split(' ')).toHaveLength(2);
    }
  });

  it('leaves the sentence readable on both sides of the gap', () => {
    expect(item?.sentence?.before.length ?? 0).toBeGreaterThan(0);
  });

  it('never offers a preposition that cannot govern the case its article is in', () => {
    // `bei einen` is impossible German. A learner strikes it out without knowing the
    // answer, which makes it a free elimination rather than a distractor.
    for (const pattern of rektionen) {
      const built = buildItem(pattern, 'article', rektionen, steady);
      for (const option of built?.options ?? []) {
        const prep = prepositions.find((p) => option.label.startsWith(`${p.key} `));
        expect(prep, option.label).toBeDefined();
        if (!prep) continue;
        expect(
          prep.defaultCase === 'wechsel' || prep.defaultCase === option.case,
          `${option.label} implies ${option.case}, but ${prep.key} is ${prep.defaultCase}`,
        ).toBe(true);
      }
    }
  });
});

describe('preposition items', () => {
  const freuen = find('freuen', 'auf');
  const item = freuen ? buildItem(freuen, 'preposition', rektionen, steady) : undefined;

  it('leads with a preposition the same lemma governs in another sense', () => {
    const competitive = item?.options.filter((o) => o.competitive).map((o) => o.label) ?? [];
    expect(competitive).toContain('über');
  });
});

describe('case items', () => {
  it('is offered only where the preposition is observed with more than one case', () => {
    const auf = find('warten', 'auf');
    const mit = find('sprechen', 'mit');
    expect(auf && kindsFor(auf, rektionen)).toContain('case');
    // `mit` is Dativ everywhere in the dataset — asking its case asks nothing.
    expect(mit && kindsFor(mit, rektionen)).not.toContain('case');
  });
});

describe('answers', () => {
  it('forgives spacing and capitalisation, not spelling', () => {
    const warten = find('warten', 'auf');
    const item = warten ? buildItem(warten, 'article', rektionen, steady) : undefined;
    expect(item && isCorrect(item, `  ${item.answer.toUpperCase()} `)).toBe(true);
    expect(item && isCorrect(item, item.answer.replace(' ', ''))).toBe(false);
  });
});

describe('coverage of the real dataset', () => {
  it('can build at least one item for every pattern', () => {
    const orphans = rektionen.filter((r) => kindsFor(r, rektionen).length === 0);
    expect(orphans).toEqual([]);
  });

  it('never repeats an option, in any item of any kind', () => {
    // `schreiben` governs `an` twice — Akkusativ and Dativ — and also `über`. The item for
    // `schreiben über` offered `an` twice before this was deduplicated.
    for (const pattern of rektionen) {
      for (const kind of kindsFor(pattern, rektionen)) {
        const item = buildItem(pattern, kind, rektionen, steady);
        const ids = item?.options.map((o) => o.id) ?? [];
        const labels = item?.options.map((o) => o.label) ?? [];
        expect(new Set(ids).size, `${pattern.id} / ${kind} ids`).toBe(ids.length);
        expect(new Set(labels).size, `${pattern.id} / ${kind} labels`).toBe(labels.length);
      }
    }
  });

  it('builds a valid item for every pattern and kind it advertises', () => {
    for (const pattern of rektionen) {
      for (const kind of kindsFor(pattern, rektionen)) {
        const item = buildItem(pattern, kind, rektionen, steady);
        expect(item, `${pattern.id} / ${kind}`).toBeDefined();
        expect(item?.options.filter((o) => o.correct), `${pattern.id} / ${kind}`).toHaveLength(1);
      }
    }
  });
});
