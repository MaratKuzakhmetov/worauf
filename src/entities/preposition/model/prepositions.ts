import { foldForSlug } from '@/shared/lib/slug';

export type GrammaticalCase = 'akk' | 'dat' | 'gen';

/**
 * `defaultCase` describes the preposition OUTSIDE a prepositional object — it is reference
 * material for the learner, never used to derive a pattern's case. `auf` is a
 * Wechselpräposition, yet `warten auf` is always Akkusativ and `bestehen auf` always Dativ.
 * The case belongs to the pattern (docs/DATA_MODEL.md §1).
 */
export type Preposition = {
  readonly key: string;
  readonly defaultCase: GrammaticalCase | 'wechsel';
  readonly gloss: { readonly ru: string; readonly en: string };
};

export const prepositions: readonly Preposition[] = [
  { key: 'auf', defaultCase: 'wechsel', gloss: { ru: 'на', en: 'on' } },
  { key: 'an', defaultCase: 'wechsel', gloss: { ru: 'у, к', en: 'at, to' } },
  { key: 'über', defaultCase: 'wechsel', gloss: { ru: 'над, о', en: 'over, about' } },
  { key: 'mit', defaultCase: 'dat', gloss: { ru: 'с', en: 'with' } },
  { key: 'für', defaultCase: 'akk', gloss: { ru: 'для, за', en: 'for' } },
  { key: 'von', defaultCase: 'dat', gloss: { ru: 'от, о', en: 'from, of' } },
  { key: 'zu', defaultCase: 'dat', gloss: { ru: 'к', en: 'to' } },
  { key: 'in', defaultCase: 'wechsel', gloss: { ru: 'в', en: 'in, into' } },
  { key: 'um', defaultCase: 'akk', gloss: { ru: 'вокруг, о', en: 'around, about' } },
  { key: 'nach', defaultCase: 'dat', gloss: { ru: 'после, в', en: 'after, to' } },
  { key: 'aus', defaultCase: 'dat', gloss: { ru: 'из', en: 'out of' } },
  { key: 'bei', defaultCase: 'dat', gloss: { ru: 'у, при', en: 'at, with' } },
  { key: 'vor', defaultCase: 'wechsel', gloss: { ru: 'перед, до', en: 'before, in front of' } },
  { key: 'gegen', defaultCase: 'akk', gloss: { ru: 'против', en: 'against' } },
  { key: 'unter', defaultCase: 'wechsel', gloss: { ru: 'под, среди', en: 'under, among' } },
  { key: 'zwischen', defaultCase: 'wechsel', gloss: { ru: 'между', en: 'between' } },
] as const;

export const prepositionKeys: readonly string[] = prepositions.map((p) => p.key);

export function isPreposition(key: string): boolean {
  return prepositionKeys.includes(key);
}

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'ä', 'ö', 'ü']);

/**
 * da-/wo- compounds are derived, never stored: storing them would be a second source of
 * truth for something a rule already decides (docs/DATA_MODEL.md §4). An r is inserted
 * before a vowel — auf → darauf / worauf, mit → damit / womit.
 */
function compound(stem: 'da' | 'wo', preposition: string): string {
  const first = preposition.slice(0, 1).toLowerCase();
  return VOWELS.has(first) ? `${stem}r${preposition}` : `${stem}${preposition}`;
}

export function daForm(preposition: string): string {
  return compound('da', preposition);
}

export function woForm(preposition: string): string {
  return compound('wo', preposition);
}

export function prepositionSlug(preposition: string): string {
  return foldForSlug(preposition);
}
