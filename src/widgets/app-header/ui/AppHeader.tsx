import Link from 'next/link';
import type { RefObject } from 'react';
import { LocaleSwitch } from '@/features/locale-switch';
import { SearchBox } from '@/features/search';
import { ThemeToggle } from '@/features/theme-toggle';
import { strings, type Locale } from '@/shared/i18n';
import { Wordmark } from '@/shared/ui/wordmark';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
  lang: Locale;
  query: string;
  onQuery: (value: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
}

export function AppHeader({ lang, query, onQuery, searchRef }: AppHeaderProps) {
  const t = strings[lang];

  return (
    <header className={styles.header}>
      <Link href={`/${lang}/`} className={styles.brand}>
        <Wordmark />
      </Link>

      <div className={styles.search}>
        <SearchBox lang={lang} value={query} onChange={onQuery} inputRef={searchRef} />
      </div>

      <div className={styles.spacer} />

      <LocaleSwitch lang={lang} />
      <ThemeToggle toLight={t.toLightTheme} toDark={t.toDarkTheme} />
    </header>
  );
}
