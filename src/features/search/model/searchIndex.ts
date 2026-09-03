import { rektionen, type Rektion } from '@/entities/rektion';
import type { Locale } from '@/shared/i18n';
import { locales } from '@/shared/i18n';
import { editDistance, typoTolerance } from './distance';
import { foldVariants, tokenize } from './fold';

/**
 * A hand-rolled inverted index — no library, per the stack decision.
 *
 * `terms` is sorted and `postings` runs parallel to it, so a prefix query is a binary
 * search for the lower bound plus a walk while the prefix still matches. That ordering is
 * plain code-unit order, NOT `Intl.Collator`: a collator sorts `ö` next to `o`, which reads
 * better and would quietly break the binary search that assumes the array is sorted the way
 * `startsWith` compares. German folding happens before a term ever reaches this array, so
 * there is nothing left here for a collator to do.
 *
 * ONE INDEX PER LOCALE. The German material — lemma and preposition — is in both, because
 * German is the subject and does not translate. The explanation layer is not: a reader in
 * the English interface who types `wait` means the English gloss, and a Russian gloss they
 * cannot read has no business ranking above it. Mixing both languages into one index makes
 * every query compete with a vocabulary the reader did not ask for.
 *
 * Documents are PATTERNS, not words. The gloss belongs to the pattern (`sich freuen auf` ≠
 * `sich freuen über`), so a word-level document would have to merge two meanings into one
 * row and lose the distinction the application exists to show.
 */

type Posting = {
  readonly doc: number;
  /** True when the term came from German material, false when it came from the gloss. */
  readonly german: boolean;
};

export type SearchIndex = {
  readonly terms: readonly string[];
  readonly postings: ReadonlyArray<readonly Posting[]>;
  /** Folded lemma variants per document — used for ranking, not for matching. */
  readonly heads: ReadonlyArray<readonly string[]>;
  readonly patterns: readonly Rektion[];
};

export function buildIndex(patterns: readonly Rektion[], locale: Locale): SearchIndex {
  const map = new Map<string, Posting[]>();

  const add = (text: string, doc: number, german: boolean): void => {
    for (const token of tokenize(text)) {
      for (const variant of foldVariants(token)) {
        const list = map.get(variant);
        if (!list) {
          map.set(variant, [{ doc, german }]);
        } else if (!list.some((p) => p.doc === doc && p.german === german)) {
          list.push({ doc, german });
        }
      }
    }
  };

  patterns.forEach((pattern, doc) => {
    add(pattern.lemma, doc, true);
    add(pattern.prep, doc, true);
    add(pattern.gloss[locale], doc, false);
    if (pattern.senseNote) add(pattern.senseNote[locale], doc, false);
  });

  const terms = [...map.keys()].sort();
  return {
    terms,
    postings: terms.map((term) => map.get(term) ?? []),
    heads: patterns.map((pattern) => foldVariants(pattern.lemma)),
    patterns,
  };
}

/** Built once per locale from a dataset compiled into the bundle — nothing to invalidate. */
const indexes = new Map<Locale, SearchIndex>(
  locales.map((locale) => [locale, buildIndex(rektionen, locale)]),
);

export function indexFor(locale: Locale): SearchIndex {
  const index = indexes.get(locale);
  if (index) return index;
  const built = buildIndex(rektionen, locale);
  indexes.set(locale, built);
  return built;
}

function lowerBound(terms: readonly string[], prefix: string): number {
  let low = 0;
  let high = terms.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if ((terms[mid] ?? '') < prefix) low = mid + 1;
    else high = mid;
  }
  return low;
}

function postingsForPrefix(index: SearchIndex, prefix: string): readonly Posting[] {
  if (prefix === '') return [];
  const found: Posting[] = [];
  for (let i = lowerBound(index.terms, prefix); i < index.terms.length; i += 1) {
    const term = index.terms[i];
    if (term === undefined || !term.startsWith(prefix)) break;
    found.push(...(index.postings[i] ?? []));
  }
  return found;
}

/** doc → whether any of its matches came from German material. */
function matchToken(index: SearchIndex, token: string): Map<number, boolean> {
  const found = new Map<number, boolean>();
  for (const variant of foldVariants(token)) {
    for (const posting of postingsForPrefix(index, variant)) {
      found.set(posting.doc, (found.get(posting.doc) ?? false) || posting.german);
    }
  }
  return found;
}

/**
 * The typo pass, and the only place the index is scanned end to end.
 *
 * It runs ONLY when the exact pass found nothing, which is what keeps a fuzzy library out
 * of this project: fuzziness that is always on rescores every row on every keystroke, and
 * a result list that reshuffles while you type cannot be aimed at. Here the fast path stays
 * exact and deterministic, and approximation is a fallback the reader is told about.
 *
 * Tolerance is capped at two edits even for long words — one letter over, and `sprechen`
 * starts collecting words it has nothing to do with.
 */
function fuzzyToken(index: SearchIndex, token: string): Map<number, boolean> {
  const found = new Map<number, boolean>();
  const variants = foldVariants(token);
  const first = variants[0];
  if (first === undefined) return found;

  const limit = Math.min(2, typoTolerance(first.length));
  if (limit === 0) return found;

  index.terms.forEach((term, i) => {
    const near = variants.some((variant) => editDistance(variant, term, limit) <= limit);
    if (!near) return;
    for (const posting of index.postings[i] ?? []) {
      found.set(posting.doc, (found.get(posting.doc) ?? false) || posting.german);
    }
  });
  return found;
}

function matchAll(
  index: SearchIndex,
  tokens: readonly string[],
  match: (index: SearchIndex, token: string) => Map<number, boolean>,
): Map<number, boolean> {
  let matched: Map<number, boolean> | null = null;
  for (const token of tokens) {
    const found = match(index, token);
    if (matched === null) {
      matched = found;
    } else {
      const next = new Map<number, boolean>();
      for (const [doc, german] of found) {
        const previous = matched.get(doc);
        if (previous !== undefined) next.set(doc, previous || german);
      }
      matched = next;
    }
    if (matched.size === 0) break;
  }
  return matched ?? new Map<number, boolean>();
}

export type SearchResult = {
  readonly patterns: readonly Rektion[];
  /** True when nothing matched exactly and these came from the typo pass. */
  readonly approximate: boolean;
};

/**
 * Every token must match — `freuen auf` means both, not either. Ranking is three buckets:
 * the headword itself first, then anything else German, then a gloss-only match. Someone
 * typing German is after that word; someone typing their own language is describing a
 * meaning and expects a list.
 *
 * An empty query returns nothing at all: with no dropdown there is nothing to show, and
 * "everything" is what the two panes behind the box are already for.
 */
export function search(index: SearchIndex, query: string, limit = 8): SearchResult {
  const tokens = tokenize(query);
  if (tokens.length === 0) return { patterns: [], approximate: false };

  let matched = matchAll(index, tokens, matchToken);
  const approximate = matched.size === 0;
  if (approximate) matched = matchAll(index, tokens, fuzzyToken);
  if (matched.size === 0) return { patterns: [], approximate: false };

  const whole = foldVariants(query);
  const ranked = [...matched].map(([doc, german]) => {
    const head = index.heads[doc] ?? [];
    const isHead = head.some((form) => whole.some((q) => form.startsWith(q)));
    return { doc, rank: isHead ? 0 : german ? 1 : 2 };
  });

  // Ties keep the incoming order, which is the German alphabetical order of the dataset:
  // a result list that reorders itself between keystrokes cannot be aimed at.
  ranked.sort((a, b) => a.rank - b.rank || a.doc - b.doc);
  return {
    patterns: ranked
      .slice(0, limit)
      .map(({ doc }) => index.patterns[doc])
      .filter((pattern) => pattern !== undefined),
    approximate,
  };
}
