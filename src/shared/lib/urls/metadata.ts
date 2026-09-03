import type { Metadata } from 'next';
import { locales, type Locale } from '@/shared/i18n';
import { absoluteUrl, swapLocale } from './urls';

/**
 * Canonical and hreflang for a specific page, not for the locale root. Google treats
 * hreflang as a claim about *this* URL; pointing every page at `/en/` says the whole site
 * is one page, which is the opposite of why the routes exist (ADR 0001).
 */
export function alternatesFor(path: string): NonNullable<Metadata['alternates']> {
  const languages = Object.fromEntries(
    locales.map((locale) => [locale, absoluteUrl(swapLocale(path, locale))]),
  ) as Record<Locale, string>;

  return {
    canonical: absoluteUrl(path),
    languages: { ...languages, 'x-default': absoluteUrl(swapLocale(path, 'en')) },
  };
}
