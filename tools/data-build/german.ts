import { tokenize } from '@/entities/rektion/model';

// The determiner table and the preposition finder moved into the entity when the trainer
// needed them at runtime; they are re-exported so the invariants keep their single import.
export { tokenize, findPreposition, checkCaseAgreement } from '@/entities/rektion/model';
export type { PrepositionSighting, CaseCheck } from '@/entities/rektion/model';

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
