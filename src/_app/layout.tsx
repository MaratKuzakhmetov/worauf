import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ThemeBootScript } from '@/features/theme-toggle';
import { isLocale, locales, strings } from '@/shared/i18n';
import { localeUrl } from '@/shared/lib/urls';
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
    alternates: {
      canonical: localeUrl(lang),
      languages: {
        en: localeUrl('en'),
        ru: localeUrl('ru'),
        'x-default': localeUrl('en'),
      },
    },
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
        {children}
      </body>
    </html>
  );
}
