import Link from 'next/link';
import { locales, strings, type Locale } from '@/shared/i18n';
import styles from './LocaleSwitch.module.css';

export function LocaleSwitch({ lang }: { lang: Locale }) {
  return (
    <nav className={styles.languages} aria-label={strings[lang].languageLabel}>
      {locales.map((locale) => (
        <Link
          key={locale}
          href={`/${locale}/`}
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
