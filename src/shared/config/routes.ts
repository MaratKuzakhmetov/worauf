import type { Locale } from '@/shared/i18n';

/**
 * Reserved first segment for browsing by preposition alone. The route scheme
 * `/[lang]/[word]/[prep]/` cannot express that state — it needs a word — and ADR 0002 did
 * not foresee it. A reserved segment shares the namespace with the word slugs, so an
 * invariant forbids any word from folding to one of these.
 */
export const RESERVED_SEGMENTS = ['p'] as const;

export const routes = {
  home: (lang: Locale) => `/${lang}/`,
  word: (lang: Locale, wordSlug: string) => `/${lang}/${wordSlug}/`,
  preposition: (lang: Locale, prepSlug: string) => `/${lang}/p/${prepSlug}/`,
};
