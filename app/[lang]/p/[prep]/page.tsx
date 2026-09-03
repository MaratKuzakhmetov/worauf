import { notFound } from 'next/navigation';
import { PrepositionPage } from '@/_pages/preposition';
import { prepositions, prepositionSlug } from '@/entities/preposition';
import { wordsWithPreposition } from '@/entities/rektion';
import { isLocale, locales, strings } from '@/shared/i18n';
import { alternatesFor } from '@/shared/lib/urls';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; prep: string }>;
}) {
  const { lang, prep } = await params;
  const preposition = prepositions.find((p) => prepositionSlug(p.key) === prep);
  if (!isLocale(lang) || !preposition) return {};
  return {
    title: `${preposition.key} — ${strings[lang].title}`,
    alternates: alternatesFor(`/${lang}/p/${prep}/`),
  };
}

export function generateStaticParams() {
  return locales.flatMap((lang) =>
    prepositions.map(({ key }) => ({ lang, prep: prepositionSlug(key) })),
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string; prep: string }>;
}) {
  const { lang, prep } = await params;
  if (!isLocale(lang)) notFound();
  const preposition = prepositions.find((p) => prepositionSlug(p.key) === prep);
  if (!preposition) notFound();
  return (
    <PrepositionPage
      preposition={preposition}
      words={wordsWithPreposition(preposition.key)}
      lang={lang}
    />
  );
}
