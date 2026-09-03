import type { GrammaticalCase } from '@/entities/rektion/model/schema';

/**
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

const SEPARABLE_PREFIXES = [
  'ab', 'an', 'auf', 'aus', 'bei', 'ein', 'her', 'hin', 'mit', 'nach',
  'teil', 'vor', 'weg', 'zu', 'zurück', 'zusammen',
];

/**
 * Strong verbs take an umlaut in the present: halten → hältst, verstoßen → verstößt. Folding
 * it away here is the same move the search index makes, and for the same reason: the learner
 * (and the checker) should not have to know which vowel alternates.
 */
function foldVowels(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss');
}

/** The lemma's recognisable stem: `sprechen` → `sprech`, `warten` → `wart`. */
function stemOf(lemma: string): string {
  const lower = foldVowels(lemma);
  return lower.endsWith('en') ? lower.slice(0, -2) : lower.endsWith('n') ? lower.slice(0, -1) : lower;
}

/**
 * Catches an example copied from the neighbouring entry. Separable verbs are split, because
 * the sentence carries the prefix at the far end (`nimmt … teil`). A strong verb whose stem
 * survives in no recognisable form must declare `lemmaForm` instead of weakening this.
 */
export function mentionsLemma(sentence: string, lemma: string, declaredForm?: string): boolean {
  const tokens = tokenize(sentence);
  if (declaredForm && tokens.map(foldVowels).includes(foldVowels(declaredForm))) return true;

  const candidates = [stemOf(lemma)];
  const lower = foldVowels(lemma);
  for (const prefix of SEPARABLE_PREFIXES) {
    if (lower.startsWith(prefix) && lower.length > prefix.length + 2) {
      candidates.push(prefix, stemOf(lower.slice(prefix.length)));
    }
  }

  // A past participle carries ge-: geirrt, gesucht, gefragt. That is a rule of the language,
  // not an irregularity, so it belongs in the check rather than in a hand-declared form on
  // every example that happens to use the perfect.
  const forms = tokens
    .map(foldVowels)
    .flatMap((token) => (token.startsWith('ge') && token.length > 4 ? [token, token.slice(2)] : [token]));

  return candidates.some(
    (candidate) => candidate.length >= 3 && forms.some((form) => form.startsWith(candidate)),
  );
}
