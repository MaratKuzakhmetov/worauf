import { notFound } from 'next/navigation';
import { StartPage } from '@/_pages/start';
import { isLocale } from '@/shared/i18n';

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <StartPage lang={lang} />;
}
