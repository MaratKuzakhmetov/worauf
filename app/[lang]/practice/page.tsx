import { notFound } from 'next/navigation';
import { PracticePage } from '@/_pages/practice';
import { isLocale, locales, strings } from '@/shared/i18n';
import { alternatesFor } from '@/shared/lib/urls';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return {
    title: `${strings[lang].practice} — ${strings[lang].title}`,
    alternates: alternatesFor(`/${lang}/practice/`),
  };
}

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <PracticePage lang={lang} />;
}
