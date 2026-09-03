import { notFound } from 'next/navigation';
import { WordPage } from '@/_pages/word';
import { findWord, headword, words } from '@/entities/rektion';
import { isLocale, locales, strings } from '@/shared/i18n';
import { alternatesFor } from '@/shared/lib/urls';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; word: string }>;
}) {
  const { lang, word } = await params;
  const entry = findWord(word);
  if (!isLocale(lang) || !entry) return {};
  return {
    title: `${headword(entry)} — ${strings[lang].title}`,
    alternates: alternatesFor(`/${lang}/${word}/`),
  };
}

export function generateStaticParams() {
  return locales.flatMap((lang) => words.map((word) => ({ lang, word: word.slug })));
}

export default async function Page({ params }: { params: Promise<{ lang: string; word: string }> }) {
  const { lang, word } = await params;
  if (!isLocale(lang)) notFound();
  const entry = findWord(word);
  if (!entry) notFound();
  return <WordPage word={entry} lang={lang} />;
}
