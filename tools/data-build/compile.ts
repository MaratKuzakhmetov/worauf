import { prepositionSlug } from '@/entities/preposition';
import type { AuthoredEntry, AuthoredPattern, Rektion } from '@/entities/rektion/model/schema';
import { foldForSlug } from '@/shared/lib/slug';

export type CompileInput = { readonly lemma: string; readonly entry: AuthoredEntry };

function withSuffix(base: string, suffix: number | undefined): string {
  return suffix === undefined ? base : `${base}-${suffix}`;
}

function slugFor(lemma: string, entry: AuthoredEntry, pattern: AuthoredPattern) {
  return {
    word: withSuffix(foldForSlug(lemma), entry.slugSuffix),
    prep: withSuffix(prepositionSlug(pattern.prep), pattern.slugSuffix),
  };
}

/**
 * Flattens the lemma-keyed authoring format into the flat runtime array.
 *
 * Slugs are read from the record, never invented here: a collision is reported so a human
 * freezes a suffix by hand. Assigning one automatically would depend on iteration order,
 * and the files are re-sorted on every insert — old links would silently re-point (ADR 0002).
 */
export function compile(inputs: readonly CompileInput[]): {
  rektionen: Rektion[];
  collisions: string[];
} {
  const rektionen: Rektion[] = [];
  const takenSlugs = new Map<string, string>();
  const collisions: string[] = [];

  for (const { lemma, entry } of inputs) {
    for (const pattern of entry.patterns) {
      const slug = slugFor(lemma, entry, pattern);
      const slugKey = `${slug.word}/${slug.prep}`;
      const owner = `${lemma} ${pattern.prep} (${pattern.case})`;

      const existing = takenSlugs.get(slugKey);
      if (existing !== undefined) {
        collisions.push(
          `/${slugKey}/ is claimed by both "${existing}" and "${owner}" — ` +
            `add a frozen slugSuffix to one of them (ADR 0002)`,
        );
        continue;
      }
      takenSlugs.set(slugKey, owner);

      rektionen.push({
        id: `${slug.word}-${slug.prep}-${pattern.case}`,
        slug,
        pos: entry.pos,
        lemma,
        ...(entry.article ? { article: entry.article } : {}),
        prep: pattern.prep,
        case: pattern.case,
        ...(pattern.reflexive ? { reflexive: pattern.reflexive } : {}),
        gloss: pattern.gloss,
        ...(pattern.senseNote ? { senseNote: pattern.senseNote } : {}),
        examples: pattern.examples,
        ...(pattern.clause ? { clause: pattern.clause } : {}),
        ...(pattern.level ? { level: pattern.level } : {}),
        ...(pattern.tags ? { tags: pattern.tags } : {}),
        ...(pattern.sources ? { sources: pattern.sources } : {}),
      });
    }
  }

  // Sorted by slug so the emitted file has a stable order and its diff means something.
  rektionen.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  return { rektionen, collisions };
}
