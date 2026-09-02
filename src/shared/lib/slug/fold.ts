/**
 * URL folding — ADR 0002.
 *
 * Exactly ONE variant here (ü → ue), unlike the search index, which must fold to both
 * `u` and `ue` so a keyboard without umlauts still finds the word. Two variants in a URL
 * would give one page two addresses.
 *
 * These slugs are frozen data, not a derived value: a pattern stores the slug it was
 * assigned. This function is what assigns it the first time — never what resolves it later.
 */

const UMLAUTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/ä/g, 'ae'],
  [/ö/g, 'oe'],
  [/ü/g, 'ue'],
  [/ß/g, 'ss'],
];

/** Reflexive `sich` and noun articles are data, not identity — they stay out of the path. */
const LEADING_NOISE = /^(?:sich|der|die|das)\s+/;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function foldForSlug(input: string): string {
  let value = input.trim().toLowerCase();
  value = value.replace(LEADING_NOISE, '');

  for (const [pattern, replacement] of UMLAUTS) {
    value = value.replace(pattern, replacement);
  }

  // Anything else carrying a diacritic (loan words) loses it rather than becoming a hyphen.
  value = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return value.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

/**
 * Collision suffixes are numeric and assigned once (ADR 0002).
 *
 * `taken` must be every slug EVER assigned — live records and retired ones alike. A slug
 * freed by deleting a record must not be handed to a different pattern: an old shared link
 * would then resolve, silently, to the wrong thing, which is worse than not resolving at all.
 * Nothing here is recomputed from file order — the file is re-sorted on every insert, and a
 * computed suffix would re-point old links without a single test going red.
 */
export function assignSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;

  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}
