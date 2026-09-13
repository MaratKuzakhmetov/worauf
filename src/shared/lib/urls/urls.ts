import type { Locale } from '@/shared/i18n';

/**
 * Next applies `basePath` to <Link> and to static assets, but NOT to the URLs inside
 * `alternates` metadata — those come out exactly as written. On github.io that silently
 * points hreflang and canonical at the host root instead of the project. So we build them
 * here, explicitly, rather than relying on metadata URL resolution.
 *
 * hreflang must be fully qualified: Google ignores relative alternates.
 */

/**
 * The site will live on a subdomain, served from its root — so there is no basePath, and
 * the origin is the single thing that changes on deploy day.
 *
 * The fallback deliberately uses the reserved `.invalid` TLD: it can never resolve, so a
 * build that forgot NEXT_PUBLIC_SITE_ORIGIN produces canonical and hreflang that are
 * obviously broken rather than quietly pointing at the wrong host. Wrong-but-plausible is
 * the failure mode that survives for months.
 */
const UNSET_ORIGIN = 'https://worauf.invalid';

export type SiteConfig = { origin: string; basePath: string };

/**
 * `basePath` is a parameter of the functions below and stays one — the normalisation it gets
 * there is tested and describes a real bug class. What is gone is reading it from the
 * environment: `NEXT_PUBLIC_BASE_PATH` was removed from `next.config.mjs` with ADR 0004
 * (subdomain, served from the root), so routing no longer applies one. Were the variable
 * still honoured here, setting it would produce canonical and hreflang URLs pointing at a
 * prefix no route answers on — and per ADR 0006 it would also narrow the service worker's
 * scope and silently disable offline. One deployment fact, one place that knows it.
 */
export function siteConfig(): SiteConfig {
  // Direct member access, not a computed key — Next inlines these at build time.
  return {
    origin: process.env.NEXT_PUBLIC_SITE_ORIGIN ?? UNSET_ORIGIN,
    basePath: '',
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

/** Absolute URL for an arbitrary in-app path, for canonical and hreflang on every page. */
export function absoluteUrl(path: string, config: SiteConfig = siteConfig()): string {
  const { origin, basePath } = normalize(config);
  return `${origin}${basePath}${path}`;
}

/**
 * The same page in the other locale. Only the first segment changes — switching language
 * must not drop the reader back to the start page, and the hreflang pair has to point at
 * the counterpart of the page they are actually on.
 */
export function swapLocale(pathname: string, target: Locale): string {
  const segments = pathname.split('/');
  segments[1] = target;
  return segments.join('/');
}
