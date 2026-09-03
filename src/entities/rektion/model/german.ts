import type { GrammaticalCase } from './schema';

/**
 * German the application has to know at RUNTIME as well as at build time: which determiner
 * carries which case, and where the preposition sits in a sentence.
 *
 * It began as a build-time checker and moved here when the trainer needed the same table to
 * gap a sentence and to build a wrong-case option. One table, because two would drift and
 * the drift would show up as the application teaching something the invariants call wrong.
 *
 * The determiner right after the preposition is where the case becomes visible, so it is
 * what the invariants check. Overlaps are real and deliberate: `den` is Akkusativ singular
 * masculine AND Dativ plural, so it belongs to both sets. The check catches a determiner
 * that cannot possibly carry the declared case — `auf dem` when the pattern says Akkusativ.
 */
const DETERMINERS: Record<GrammaticalCase, readonly string[]> = {
  akk: [
    'den', 'das', 'die', 'einen', 'ein', 'eine', 'keinen', 'kein', 'keine',
    'meinen', 'mein', 'meine', 'deinen', 'dein', 'deine', 'seinen', 'sein', 'seine',
    'ihren', 'ihr', 'ihre', 'unseren', 'unser', 'unsere', 'euren', 'euer', 'eure',
    'diesen', 'dieses', 'diese', 'jeden', 'jedes', 'jede',
    'mich', 'dich', 'sich', 'uns', 'euch', 'ihn', 'es', 'sie',
  ],
  dat: [
    'dem', 'der', 'den', 'einem', 'einer', 'keinem', 'keiner',
    'meinem', 'meiner', 'deinem', 'deiner', 'seinem', 'seiner',
    'ihrem', 'ihrer', 'ihr', 'unserem', 'unserer', 'eurem', 'eurer',
    // Dative PLURAL of the possessives ends in -en and looks exactly like the accusative
    // singular masculine: "von seinen Eltern" is dative. Leaving these out made the check
    // reject correct data, which is worse than a check that misses something.
    'meinen', 'deinen', 'seinen', 'ihren', 'unseren', 'euren', 'keinen', 'diesen',
    'diesem', 'dieser', 'jedem', 'jeder',
    'mir', 'dir', 'sich', 'uns', 'euch', 'ihm', 'ihnen',
  ],
  gen: ['des', 'der', 'eines', 'einer', 'meines', 'meiner', 'seines', 'seiner', 'dieses'],
};

/** Contractions swallow the preposition, and each one fixes a case. */
const CONTRACTIONS: Record<string, { readonly preposition: string; readonly case: GrammaticalCase }> = {
  am: { preposition: 'an', case: 'dat' },
  ans: { preposition: 'an', case: 'akk' },
  aufs: { preposition: 'auf', case: 'akk' },
  beim: { preposition: 'bei', case: 'dat' },
  fürs: { preposition: 'für', case: 'akk' },
  im: { preposition: 'in', case: 'dat' },
  ins: { preposition: 'in', case: 'akk' },
  übers: { preposition: 'über', case: 'akk' },
  ums: { preposition: 'um', case: 'akk' },
  vom: { preposition: 'von', case: 'dat' },
  vorm: { preposition: 'vor', case: 'dat' },
  vors: { preposition: 'vor', case: 'akk' },
  zum: { preposition: 'zu', case: 'dat' },
  zur: { preposition: 'zu', case: 'dat' },
};

export function tokenize(sentence: string): string[] {
  return sentence.toLowerCase().split(/[^a-zà-ÿäöüß]+/i).filter(Boolean);
}

export type PrepositionSighting =
  | { kind: 'plain'; index: number }
  | { kind: 'contracted'; index: number; case: GrammaticalCase }
  | { kind: 'absent' };

export function findPreposition(sentence: string, preposition: string): PrepositionSighting {
  const tokens = tokenize(sentence);

  const plain = tokens.indexOf(preposition.toLowerCase());
  if (plain !== -1) return { kind: 'plain', index: plain };

  for (const [form, meaning] of Object.entries(CONTRACTIONS)) {
    if (meaning.preposition !== preposition) continue;
    const index = tokens.indexOf(form);
    if (index !== -1) return { kind: 'contracted', index, case: meaning.case };
  }
  return { kind: 'absent' };
}

export type CaseCheck =
  | { verdict: 'agrees' }
  | { verdict: 'unverifiable'; reason: string }
  | { verdict: 'disagrees'; determiner: string };

/** Reports honestly when it cannot tell: a bare plural has no determiner to inspect. */
export function checkCaseAgreement(
  sentence: string,
  preposition: string,
  declared: GrammaticalCase,
): CaseCheck {
  const sighting = findPreposition(sentence, preposition);
  if (sighting.kind === 'absent') {
    return { verdict: 'unverifiable', reason: 'preposition not found' };
  }
  if (sighting.kind === 'contracted') {
    return sighting.case === declared
      ? { verdict: 'agrees' }
      : { verdict: 'disagrees', determiner: 'contraction' };
  }

  const next = tokenize(sentence)[sighting.index + 1];
  if (next === undefined) return { verdict: 'unverifiable', reason: 'nothing follows' };

  const isDeterminer = Object.values(DETERMINERS).some((set) => set.includes(next));
  if (!isDeterminer) return { verdict: 'unverifiable', reason: `"${next}" is not a determiner` };

  return DETERMINERS[declared].includes(next)
    ? { verdict: 'agrees' }
    : { verdict: 'disagrees', determiner: next };
}

/**
 * Determiner paradigms, one entry per gender/number, so that a form can be carried from
 * one case to another: `auf den Bus` (Akkusativ) → `auf dem Bus` (Dativ).
 *
 * A form plus its case identifies gender and number only SOMETIMES, and the trainer may not
 * guess. `dem` is dative masculine or neuter, and their accusatives differ — `den` against
 * `das`. Building a wrong-case option from an ambiguous form would put fabricated German in
 * front of a learner, which is the one thing this application must never do. The ambiguity
 * is not special-cased: a form that matches two paradigms simply has no counterpart, and
 * the item is not built. That same silence is what the coverage report reads as "this
 * example cannot carry an article item yet".
 */
type Paradigm = Partial<Record<GrammaticalCase, string>>;

/** ein / kein / mein — the mixed declension. `ein` alone has no plural. */
function einLike(stem: string, plural: boolean): Paradigm[] {
  const forms: Paradigm[] = [
    { akk: `${stem}en`, dat: `${stem}em`, gen: `${stem}es` },
    { akk: stem, dat: `${stem}em`, gen: `${stem}es` },
    { akk: `${stem}e`, dat: `${stem}er`, gen: `${stem}er` },
  ];
  if (plural) forms.push({ akk: `${stem}e`, dat: `${stem}en`, gen: `${stem}er` });
  return forms;
}

/** dieser / jeder — the strong declension, which differs from `ein` in the neuter. */
function dieserLike(stem: string): Paradigm[] {
  return [
    { akk: `${stem}en`, dat: `${stem}em`, gen: `${stem}es` },
    { akk: `${stem}es`, dat: `${stem}em`, gen: `${stem}es` },
    { akk: `${stem}e`, dat: `${stem}er`, gen: `${stem}er` },
    { akk: `${stem}e`, dat: `${stem}en`, gen: `${stem}er` },
  ];
}

const PARADIGMS: readonly Paradigm[] = [
  { akk: 'den', dat: 'dem', gen: 'des' },
  { akk: 'das', dat: 'dem', gen: 'des' },
  { akk: 'die', dat: 'der', gen: 'der' },
  { akk: 'die', dat: 'den', gen: 'der' },
  ...einLike('ein', false),
  ...einLike('kein', true),
  ...einLike('mein', true),
  ...einLike('dein', true),
  ...einLike('sein', true),
  ...einLike('ihr', true),
  ...einLike('unser', true),
  ...dieserLike('dies'),
  ...dieserLike('jed'),
];

/**
 * The same determiner in another case, or `undefined` when the form does not say which
 * paradigm it belongs to. `euer` is deliberately absent: its stem loses an `e` when it
 * inflects, and a rare form got wrong is worse than a rare form skipped.
 */
export function counterpartDeterminer(
  determiner: string,
  from: GrammaticalCase,
  to: GrammaticalCase,
): string | undefined {
  const lower = determiner.toLowerCase();
  const matches = PARADIGMS.filter((paradigm) => paradigm[from] === lower);
  if (matches.length !== 1) return undefined;
  return matches[0]?.[to];
}
