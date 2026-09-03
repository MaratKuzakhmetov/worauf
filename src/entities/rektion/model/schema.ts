import { z } from 'zod';
import { prepositionKeys } from '@/entities/preposition';

/**
 * One schema, three jobs: TypeScript types, CI validation of the authored YAML, and — via
 * z.toJSONSchema — editor autocomplete while writing that YAML. Anything that drifts from
 * this file drifts from all three at once, which is the point.
 *
 * Every object is STRICT, and that is load-bearing rather than tidy. A permissive object
 * silently drops keys it does not know, and YAML has a trap that produces exactly such a
 * key: an unquoted comma inside a flow mapping ends the value early, so
 * `{ ru: сообщать, рассказывать …, en: … }` parses as `ru: "сообщать"` plus a junk key.
 * The truncated string is still a non-empty string, so every other check passes and the
 * dataset quietly loses half a gloss. Seventeen of the first eighty-five records were
 * damaged this way before strict mode was turned on.
 */

export const grammaticalCase = z.enum(['akk', 'dat', 'gen']);
export const partOfSpeech = z.enum(['verb', 'adj', 'noun']);

const bilingual = z.strictObject({
  ru: z.string().min(1),
  en: z.string().min(1),
});

const example = z.strictObject({
  de: z.string().min(1),
  ru: z.string().min(1),
  en: z.string().min(1),
  /**
   * Only for strong verbs the stem check cannot recognise — sterben → starb shares two
   * letters with its lemma. Naming the form is better than loosening the check for everyone.
   */
  lemmaForm: z.string().min(1).optional(),
});

const clauseForms = z.strictObject({
  dass: z.boolean(),
  zuInf: z.boolean(),
  indirect: z.boolean(),
});

/** A pattern as it is written by hand, under its lemma. */
export const authoredPattern = z.strictObject({
  prep: z.enum(prepositionKeys as [string, ...string[]]),
  case: grammaticalCase,
  /**
   * Verbs only. It sits on the PATTERN, not the word, because it varies between the
   * patterns of one lemma: `sorgen für` is plain, `sich sorgen um` is reflexive. Same
   * argument as the case — what a word governs is a property of the government, not the
   * word. Never part of the lemma string, or every reflexive verb sorts under S.
   */
  reflexive: z.enum(['akk', 'dat']).optional(),
  gloss: bilingual,
  /** Required whenever the lemma has more than one pattern — checked as an invariant. */
  senseNote: bilingual.optional(),
  examples: z.array(example).min(1),
  clause: clauseForms.optional(),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1']).optional(),
  tags: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
  /** Frozen on first assignment; only set when a slug collided (ADR 0002). */
  slugSuffix: z.number().int().min(2).optional(),
});

/** A lemma with everything it governs. The authoring file is a map keyed by lemma. */
export const authoredEntry = z.strictObject({
  pos: partOfSpeech,
  /** Nouns only. */
  article: z.enum(['der', 'die', 'das']).optional(),
  /** Frozen on first assignment; only set when two lemmas fold to one slug (ADR 0002). */
  slugSuffix: z.number().int().min(2).optional(),
  patterns: z.array(authoredPattern).min(1),
});

export const authoredFile = z.record(z.string().min(1), authoredEntry);

export type AuthoredPattern = z.infer<typeof authoredPattern>;
export type AuthoredEntry = z.infer<typeof authoredEntry>;
export type AuthoredFile = z.infer<typeof authoredFile>;
export type GrammaticalCase = z.infer<typeof grammaticalCase>;
export type PartOfSpeech = z.infer<typeof partOfSpeech>;
export type Bilingual = z.infer<typeof bilingual>;
export type Example = z.infer<typeof example>;

/** The flat runtime record the app renders. Compiled from the authored files, never hand-written. */
export type Rektion = {
  readonly id: string;
  readonly slug: { readonly word: string; readonly prep: string };
  readonly pos: PartOfSpeech;
  readonly lemma: string;
  readonly article?: 'der' | 'die' | 'das';
  readonly reflexive?: 'akk' | 'dat';
  readonly prep: string;
  readonly case: GrammaticalCase;
  readonly gloss: Bilingual;
  readonly senseNote?: Bilingual;
  readonly examples: readonly Example[];
  readonly clause?: { readonly dass: boolean; readonly zuInf: boolean; readonly indirect: boolean };
  readonly level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  readonly tags?: readonly string[];
  readonly sources?: readonly string[];
};
