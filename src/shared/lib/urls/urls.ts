import type { Locale } from '@/shared/i18n';

/**
 * Next applies `basePath` to <Link> and to static assets, but NOT to the URLs inside
 * `alternates` metadata — those come out exactly as written. On github.io that silently
 * points hreflang and canonical at the host root instead of the project. So we build them
 * here, explicitly, rather than relying on metadata URL resolution.
 *
 * hreflang must be fully qualified: Google ignores relative alternates.
 */

const DEFAULT_ORIGIN = 'https://maratkuzakhmetov.github.io';

export type SiteConfig = { origin: string; basePath: string };

export function siteConfig(): SiteConfig {
  // Direct member access, not a computed key — Next inlines these at build time.
  return {
    origin: process.env.NEXT_PUBLIC_SITE_ORIGIN ?? DEFAULT_ORIGIN,
    basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
  };
}

/** Normalising here, not only in `siteConfig`, keeps the guarantee wherever the config came from. */
function normalize(config: SiteConfig): SiteConfig {
  const origin = config.origin.replace(/\/+$/, '');
  let basePath = config.basePath.replace(/\/+$/, '');
  if (basePath !== '' && !basePath.startsWith('/')) basePath = `/${basePath}`;
  return { origin, basePath };
}

export function localePath(lang: Locale, config: SiteConfig = siteConfig()): string {
  return `${normalize(config).basePath}/${lang}/`;
}

export function localeUrl(lang: Locale, config: SiteConfig = siteConfig()): string {
  const { origin } = normalize(config);
  return `${origin}${localePath(lang, config)}`;
}
