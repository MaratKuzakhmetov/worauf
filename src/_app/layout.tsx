import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
  };
}

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
        <RektionBrowser lang={lang}>{children}</RektionBrowser>
      </body>
    </html>
  );
}
