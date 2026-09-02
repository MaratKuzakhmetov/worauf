import { notFound } from 'next/navigation';
import { HomePage } from '@/_pages/home';
import { isLocale } from '@/shared/i18n';

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <HomePage lang={lang} />;
}
