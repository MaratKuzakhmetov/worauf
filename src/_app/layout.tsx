import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { UpdatePrompt } from '@/features/app-update';
import { ThemeBootScript } from '@/features/theme-toggle';
import { RektionBrowser } from '@/widgets/rektion-browser';
import { isLocale, locales, strings } from '@/shared/i18n';
import { alternatesFor } from '@/shared/lib/urls';
import { fontVariables } from './fonts';
import './styles/tokens.css';
import './styles/global.css';

type LangParams = { lang: string };

export function generateStaticParams(): LangParams[] {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<LangParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = strings[lang];

  return {
    title: t.title,
    description: t.description,
    // Only the default for pages that do not set their own; every route below overrides it
    // with its own path, because hreflang is a claim about a specific URL.
    alternates: alternatesFor(`/${lang}/`),
    /*
     * Declared rather than left to convention: with no `rel="icon"` in the HTML a browser
     * falls back to probing `/favicon.ico`, which this project does not serve — a 404 on
     * every first load. The file stays in `public/` at a stable `/icon.svg` because
     * `app/manifest.ts` names that exact path; the `app/icon.svg` convention would move it
     * to a hashed URL and break the manifest's reference to it.
     */
    icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }] },
  };
}

/**
 * The locale shell and nothing else. The two-pane browser used to live here, which meant
 * every route under `/[lang]/` rendered inside it — including the trainer, which needs the
 * whole screen. It moved one level down into the `(browse)` route group, where it still
 * never unmounts between browse pages and no longer follows pages that are not browsing.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<LangParams>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <html lang={lang} className={fontVariables} suppressHydrationWarning>
      <body>
        <ThemeBootScript />
        {children}
        {/* Registers the worker and stays invisible until a newer one is waiting (ADR 0006). */}
        <UpdatePrompt lang={lang} />
      </body>
    </html>
  );
}


/** The browse group's layout: the two panes, persistent across every page inside them. */
export async function BrowseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<LangParams>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <RektionBrowser lang={lang}>{children}</RektionBrowser>;
}
