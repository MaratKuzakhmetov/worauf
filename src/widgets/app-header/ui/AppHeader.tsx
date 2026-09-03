'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { RefObject } from 'react';
import { LocaleSwitch } from '@/features/locale-switch';
import { SearchBox } from '@/features/search';
import { ThemeToggle } from '@/features/theme-toggle';
import { routes } from '@/shared/config';
import { strings, type Locale } from '@/shared/i18n';
import { Wordmark } from '@/shared/ui/wordmark';
import styles from './AppHeader.module.css';

/**
 * The search half is optional because the trainer has no use for it: a drill is not a place
 * to look things up, and an input that does nothing on the screen it sits on is worse than
 * an absent one.
 */
interface AppHeaderProps {
  lang: Locale;
  search?: {
    value: string;
    onQuery: (value: string) => void;
    inputRef: RefObject<HTMLInputElement | null>;
  };
}

export function AppHeader({ lang, search }: AppHeaderProps) {
  const t = strings[lang];
  const pathname = usePathname();
  const practising = pathname.startsWith(routes.practice(lang));

  return (
    <header className={styles.header}>
      <Link href={routes.home(lang)} className={styles.brand}>
        <Wordmark />
      </Link>

      {search ? (
        <div className={styles.search}>
          <SearchBox
            lang={lang}
            value={search.value}
            onChange={search.onQuery}
            inputRef={search.inputRef}
          />
        </div>
      ) : null}

      <div className={styles.spacer} />

      <nav className={styles.modes} aria-label={t.browse}>
        <Link
          href={routes.home(lang)}
          className={practising ? styles.mode : `${styles.mode} ${styles.on}`}
          aria-current={practising ? undefined : 'page'}
        >
          {t.browse}
        </Link>
        <Link
          href={routes.practice(lang)}
          className={practising ? `${styles.mode} ${styles.on}` : styles.mode}
          aria-current={practising ? 'page' : undefined}
        >
          {t.practice}
        </Link>
      </nav>

      <LocaleSwitch lang={lang} />
      <ThemeToggle toLight={t.toLightTheme} toDark={t.toDarkTheme} />
    </header>
  );
}
