'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { locales, strings, type Locale } from '@/shared/i18n';
import { swapLocale } from '@/shared/lib/urls';
import styles from './LocaleSwitch.module.css';

export function LocaleSwitch({ lang }: { lang: Locale }) {
  const pathname = usePathname();

  return (
    <nav className={styles.languages} aria-label={strings[lang].languageLabel}>
      {locales.map((locale) => (
        <Link
          key={locale}
          // The same page in the other language, not the start page: switching the language
          // of what you are reading should keep you on what you are reading.
          href={swapLocale(pathname, locale)}
          className={locale === lang ? `${styles.language} ${styles.current}` : styles.language}
          hrefLang={locale}
          aria-current={locale === lang ? 'true' : undefined}
        >
          {locale.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
