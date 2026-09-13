import type { GrammaticalCase, PartOfSpeech } from '@/entities/rektion/model';

/**
 * One raw sighting of a (lemma, pos, preposition, case) tuple from one edition of
 * Wiktionary. Several sightings merge into one `Candidate` in `merge.ts`.
 */
export type Sighting = {
  readonly lemma: string;
  readonly pos: PartOfSpeech;
  readonly prep: string;
  readonly case: GrammaticalCase;
  readonly edition: 'en.wiktionary' | 'de.wiktionary';
  readonly url: string;
  /** Whatever gloss text came with the sighting — raw, not curated. */
  readonly gloss?: string;
  /**
   * en.wiktionary only, from the sense's own `tags`. Without this, a candidate like
   * `vergreifen an` proposes the wrong headword — the real verb is `sich vergreifen an`,
   * and DATA_MODEL §3.1 makes `reflexive` a field on the pattern precisely so it never ends
   * up baked into the lemma string. Not attempted from de.wiktionary in this pass: it has no
   * equivalent structured field, only a page title that sometimes already includes `sich`.
   */
  readonly reflexive?: boolean;
};

/** A preposition sighted that is not one of the 16 the app models — reported, never merged. */
export type UnsupportedSighting = Sighting;
