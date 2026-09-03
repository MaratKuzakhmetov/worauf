import type { Locale } from '@/shared/i18n';

/**
 * Reserved first segments: `p` browses by preposition alone, `practice` is the trainer.
 * Neither state fits `/[lang]/[word]/`, and ADR 0002 foresaw neither.
 *
 * They share a namespace with the word slugs, so an invariant forbids any word from folding
 * to one of them. Without it a lemma that folded to `practice` would become unreachable and
 * the breakage would read as a routing bug rather than as the data error it is.
 */
export const RESERVED_SEGMENTS = ['p', 'practice'] as const;

export const routes = {
  home: (lang: Locale) => `/${lang}/`,
  word: (lang: Locale, wordSlug: string) => `/${lang}/${wordSlug}/`,
  preposition: (lang: Locale, prepSlug: string) => `/${lang}/p/${prepSlug}/`,
  practice: (lang: Locale) => `/${lang}/practice/`,
};
