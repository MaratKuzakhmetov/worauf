import Link from 'next/link';
import { LocaleSwitch } from '@/features/locale-switch';
import { ThemeToggle } from '@/features/theme-toggle';
import { strings, type Locale } from '@/shared/i18n';
import { Wordmark } from '@/shared/ui/wordmark';
import styles from './AppHeader.module.css';

export function AppHeader({ lang }: { lang: Locale }) {
  const t = strings[lang];

  return (
    <header className={styles.header}>
      <Link href={`/${lang}/`} className={styles.brand}>
        <Wordmark />
      </Link>

      <div className={styles.spacer} />

      <LocaleSwitch lang={lang} />
      <ThemeToggle toLight={t.toLightTheme} toDark={t.toDarkTheme} />
    </header>
  );
}
