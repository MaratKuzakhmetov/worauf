export const locales = ['en', 'ru'] as const;

export type Locale = (typeof locales)[number];

/**
 * English is the default, but the segment is always present in the path — a default
 * with no segment would give one page two URLs and break hreflang and caching (ADR 0002).
 */
export const defaultLocale: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function otherLocale(current: Locale): Locale {
  return current === 'en' ? 'ru' : 'en';
}
