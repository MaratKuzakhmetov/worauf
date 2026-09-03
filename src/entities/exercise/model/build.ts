import { prepositions } from '@/entities/preposition';
import {
  counterpartDeterminer,
  findPreposition,
  type GrammaticalCase,
  type Rektion,
} from '@/entities/rektion/model';
import type { Item, ItemKind, Option } from './schema';

/**
 * Item construction. Everything here is pure and deterministic given a random source, so
 * the whole trainer can be tested without rendering anything.
 *
 * The governing rule for every kind: BUILD NOTHING THAT CANNOT BE VERIFIED. An option is
 * either lifted from the dataset or derived by a rule that refuses when it is unsure
 * (`counterpartDeterminer`). Nothing is invented to fill a slot — a pattern that cannot
 * make a good item makes none, and the coverage report says so.
 */

export type Random = () => number;

function pick<T>(items: readonly T[], random: Random): T | undefined {
  return items[Math.floor(random() * items.length)];
}

export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
}

const CASES: readonly GrammaticalCase[] = ['akk', 'dat', 'gen'];

/**
 * Which cases a preposition really governs — the single rule behind every option this file
 * builds. NOTHING is ever shown with a case it cannot take.
 *
 * That sounds obvious and was not: the first version kept the correct article and swapped
 * the preposition, which produced `bei einen`, and paired a preposition with the opposite
 * case, which produced `mit die`. Neither exists in German. A learner strikes them out
 * without knowing the answer, so they are free eliminations rather than distractors — and
 * they put fabricated German on a screen belonging to an application whose entire claim is
 * that it does not.
 *
 * The union of two sources, because neither alone is right: the dataset knows what these
 * 203 patterns do, and `wechsel` knows what the language allows. `über` may appear only
 * with Akkusativ here while `über dem Tisch` is still perfectly good German.
 */
export function casesFor(prep: string, all: readonly Rektion[]): readonly GrammaticalCase[] {
  const preposition = prepositions.find((p) => p.key === prep);
  const admissible = new Set<GrammaticalCase>();
  if (preposition?.defaultCase === 'wechsel') {
    admissible.add('akk');
    admissible.add('dat');
  } else if (preposition) {
    admissible.add(preposition.defaultCase);
  }
  for (const r of all) if (r.prep === prep) admissible.add(r.case);
  return CASES.filter((kase) => admissible.has(kase));
}

/**
 * Splits an example around `preposition + determiner`, and only when the determiner's form
 * settles its gender and number. Returns undefined otherwise — see `counterpartDeterminer`.
 */
export function gapArticle(
  pattern: Rektion,
  all: readonly Rektion[],
): { before: string; after: string; determiner: string; otherCase: GrammaticalCase } | undefined {
  // Only a case this preposition can actually govern. For `mit`, there is none — so `mit`
  // never yields an article item, and the preposition item asks it instead.
  const rivals = casesFor(pattern.prep, all).filter((kase) => kase !== pattern.case);
  if (rivals.length === 0) return undefined;
  for (const example of pattern.examples) {
    const sighting = findPreposition(example.de, pattern.prep);
    // A contraction (`im`, `zum`) hides the article inside the preposition; there is no
    // two-word answer to ask for, so those sentences are left to the other item kinds.
    if (sighting.kind !== 'plain') continue;

    const words = example.de.split(/\s+/);
    const at = words.findIndex(
      (w) => w.replace(/[.,!?;:»«"]/g, '').toLowerCase() === pattern.prep.toLowerCase(),
    );
    const determinerWord = at === -1 ? undefined : words[at + 1];
    if (at === -1 || determinerWord === undefined) continue;

    const determiner = determinerWord.replace(/[.,!?;:»«"]/g, '');
    const other = rivals.find(
      (kase) => counterpartDeterminer(determiner, pattern.case, kase) !== undefined,
    );
    if (!other) continue;

    return {
      before: words.slice(0, at).join(' '),
      after: words.slice(at + 2).join(' '),
      determiner,
      otherCase: other,
    };
  }
  return undefined;
}

/**
 * The distractor rule, and the reason this trainer exists rather than another four-random-
 * prepositions quiz: the FIRST wrong option is always the same preposition in a different
 * case. That is the confusion that costs points, and a competitive alternative is the
 * condition under which multiple choice teaches at all (docs/TRAINER.md).
 */
function articleOptions(
  pattern: Rektion,
  gap: NonNullable<ReturnType<typeof gapArticle>>,
  all: readonly Rektion[],
  random: Random,
): readonly Option[] {
  const wrongForm = counterpartDeterminer(gap.determiner, pattern.case, gap.otherCase);
  if (!wrongForm) return [];

  const options: Option[] = [
    {
      id: 'correct',
      label: `${pattern.prep} ${gap.determiner}`,
      correct: true,
      case: pattern.case,
      competitive: false,
    },
    {
      id: 'same-prep-other-case',
      label: `${pattern.prep} ${wrongForm}`,
      correct: false,
      case: gap.otherCase,
      competitive: true,
    },
  ];

  /*
   * The remaining two keep the article and swap the preposition, so the only thing that
   * separates them from the answer is the government itself.
   *
   * Only prepositions that CAN govern this case are eligible. `bei einen` is not merely
   * wrong for this word, it is impossible German — and an option a learner can strike out
   * without knowing the answer is not a distractor, it is a free elimination. It would also
   * put a fabricated phrase on the screen, which this application does not do anywhere else.
   */
  const others = shuffle(
    prepositions
      .map((p) => p.key)
      .filter((key) => key !== pattern.prep && casesFor(key, all).includes(pattern.case)),
    random,
  );
  for (const prep of others) {
    if (options.length >= 4) break;
    options.push({
      id: prep,
      label: `${prep} ${gap.determiner}`,
      correct: false,
      case: pattern.case,
      competitive: false,
    });
  }
  return options;
}

/**
 * Prepositions to offer against this one. A preposition the SAME lemma governs in another
 * sense comes first — `sich freuen auf` against `über` is a real decision the learner makes,
 * where `warten` against `zwischen` is not.
 */
function prepositionOptions(
  pattern: Rektion,
  all: readonly Rektion[],
  random: Random,
): readonly Option[] {
  /*
   * Deduplicated, because a lemma can govern one preposition TWICE: `schreiben an` is
   * Akkusativ (writing to a person) and Dativ (working on something), and `schreiben` also
   * takes `über`. Without the Set, the item for `schreiben über` offered `an` as two
   * separate options — the same word twice, and React rendering two children under one key.
   * It is the same record that forced a frozen slug suffix in phase 1.
   */
  const sameLemma = [
    ...new Set(
      all.filter((r) => r.lemma === pattern.lemma && r.prep !== pattern.prep).map((r) => r.prep),
    ),
  ];
  const rest = shuffle(
    prepositions.map((p) => p.key).filter((k) => k !== pattern.prep && !sameLemma.includes(k)),
    random,
  );

  const options: Option[] = [
    { id: 'correct', label: pattern.prep, correct: true, case: pattern.case, competitive: false },
  ];
  for (const prep of [...sameLemma, ...rest]) {
    if (options.length >= 4) break;
    // Prefer this lemma's own reading of the rival preposition — the case shown in the
    // debrief should be the one the learner would have produced, not some other word's.
    const rival =
      all.find((r) => r.lemma === pattern.lemma && r.prep === prep) ??
      all.find((r) => r.prep === prep);
    options.push({
      id: prep,
      label: prep,
      correct: false,
      case: rival?.case ?? 'akk',
      competitive: sameLemma.includes(prep),
    });
  }
  return options;
}

const CASE_LABEL: Record<GrammaticalCase, string> = {
  akk: 'Akkusativ',
  dat: 'Dativ',
  gen: 'Genitiv',
};

function caseOptions(pattern: Rektion, all: readonly Rektion[]): readonly Option[] {
  return casesFor(pattern.prep, all).map((kase) => ({
    id: kase,
    label: CASE_LABEL[kase],
    correct: kase === pattern.case,
    case: kase,
    competitive: kase !== pattern.case,
  }));
}

/**
 * Every kind an item could take for this pattern, in the order they are worth asking.
 * `article` first: one item that forces both the preposition and the case beats two that
 * force one each. `case` only where the preposition can really take more than one — asking
 * the case of `mit` is asking nothing.
 *
 * Answers are always CHOSEN, never typed. A typed variant was built and removed: the
 * evidence for production over multiple choice is mixed to begin with (`PRIOR_ART.md`), and
 * it cost a settings toggle on the start screen to reach a kind that surfaced about once in
 * two sessions (docs/TRAINER.md §3).
 */
export function kindsFor(pattern: Rektion, all: readonly Rektion[]): readonly ItemKind[] {
  const kinds: ItemKind[] = [];
  if (gapArticle(pattern, all)) kinds.push('article');
  if (casesFor(pattern.prep, all).length > 1) kinds.push('case');
  kinds.push('preposition');
  return kinds;
}

export function buildItem(
  pattern: Rektion,
  kind: ItemKind,
  all: readonly Rektion[],
  random: Random,
): Item | undefined {
  const base = { id: `${pattern.id}:${kind}`, pattern } as const;

  if (kind === 'article') {
    const gap = gapArticle(pattern, all);
    if (!gap) return undefined;
    const options = articleOptions(pattern, gap, all, random);
    if (options.length < 3) return undefined;
    return {
      ...base,
      kind,
      sentence: { before: gap.before, after: gap.after },
      options: shuffle(options, random),
      answer: `${pattern.prep} ${gap.determiner}`,
    };
  }

  if (kind === 'case') {
    const options = caseOptions(pattern, all);
    if (options.length < 2) return undefined;
    return { ...base, kind, options, answer: CASE_LABEL[pattern.case] };
  }

  const options = prepositionOptions(pattern, all, random);
  if (options.length < 3) return undefined;
  return { ...base, kind, options: shuffle(options, random), answer: pattern.prep };
}

/** `auf   Den ` and `auf den` are the same answer; `aufden` is not. */
export function normalise(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isCorrect(item: Item, given: string): boolean {
  return normalise(given) === normalise(item.answer);
}

export { pick };
