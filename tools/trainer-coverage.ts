import { casesFor, kindsFor } from '@/entities/exercise/model';
import { rektionen } from '@/entities/rektion/model';

/**
 * Which patterns cannot carry which kind of item, and — the part that matters — WHY.
 * This is the phase 5 hand-off, and it only helps if it separates the two reasons.
 *
 * A pattern governed by a case-fixed preposition (`mit`, `für`, `von`) has no article item
 * BY DESIGN: there is no other case for `mit` to take, so no honest competitive distractor
 * exists and the preposition itself is the whole difficulty. Nothing to fix.
 *
 * A pattern whose preposition is a Wechselpräposition but whose examples carry no
 * determiner that fixes gender and number is a DATA GAP: the best item type in the trainer
 * is unavailable because of how one sentence happens to be written. That list is worth
 * working through.
 *
 * Runs in Node, outside the FSD graph, importing entity models directly (CLAUDE.md).
 */

const rows = rektionen.map((pattern) => {
  const kinds = kindsFor(pattern, rektionen);
  const openCase = casesFor(pattern.prep, rektionen).length > 1;
  return {
    id: pattern.id,
    head: `${pattern.lemma} ${pattern.prep}`,
    kinds,
    openCase,
    gap: openCase && !kinds.includes('article'),
  };
});

const withArticle = rows.filter((r) => r.kinds.includes('article'));
const fixedCase = rows.filter((r) => !r.openCase);
const gaps = rows.filter((r) => r.gap);

const pct = (n: number): string => `${Math.round((n / rows.length) * 100)}%`;

console.log(`${rows.length} patterns`);
console.log(`  case is open (Wechselpräposition)   ${rows.length - fixedCase.length}`);
console.log(`    → article item built              ${withArticle.length} (${pct(withArticle.length)})`);
console.log(`    → DATA GAP: no usable determiner  ${gaps.length}`);
console.log(`  case is fixed by the preposition    ${fixedCase.length}  (preposition item only, by design)`);

if (process.argv.includes('--list')) {
  console.log('\nData gaps — a Wechselpräposition whose examples show no determiner that');
  console.log('settles gender and number, so the strongest item cannot be built:\n');
  for (const row of gaps) console.log(`  ${row.head.padEnd(28)} ${row.id}`);
}

/*
 * A regression guard, not a target. The number is what today's data supports; if an edit to
 * an example drops it, the build says so before anyone notices the trainer got easier.
 */
const FLOOR = 0.25;
const covered = withArticle.length / rows.length;
if (covered < FLOOR) {
  console.error(`\narticle coverage ${pct(withArticle.length)} is below the ${FLOOR * 100}% floor`);
  process.exit(1);
}
