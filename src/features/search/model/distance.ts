/**
 * Bounded Levenshtein — shared by the typo-tolerant pass in the index and by the
 * "did you mean" suggestions. Returns `limit + 1` for anything further away, so the
 * caller never learns a distance it was not going to use.
 */
export function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i, ...new Array<number>(b.length).fill(0)];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      const insertion = (row[j - 1] ?? 0) + 1;
      const deletion = (previous[j] ?? 0) + 1;
      const cost = Math.min(substitution, insertion, deletion);
      row[j] = cost;
      if (cost < best) best = cost;
    }
    // Every remaining edit can only add to the best cost on this row, so once the whole
    // row is past the limit the answer is already known.
    if (best > limit) return limit + 1;
    previous = row;
  }
  return previous[b.length] ?? limit + 1;
}

/**
 * How wrong a word is allowed to be, by its length. Proportional on purpose: at one edit
 * of tolerance, `an` reaches `am`, `in`, `auf` and half the preposition table, and a
 * suggestion list that contains everything is the same as no suggestion list.
 */
export function typoTolerance(length: number): number {
  if (length <= 3) return 0;
  if (length <= 5) return 1;
  if (length <= 8) return 2;
  return 3;
}
