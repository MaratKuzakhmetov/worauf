'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { prepositionSlug, prepositions } from '@/entities/preposition';
import { findWord, prepositionCounts, words } from '@/entities/rektion';
import { PrepositionList } from '@/features/preposition-list';
import { WordList } from '@/features/word-list';
import { strings, type Locale } from '@/shared/i18n';
import { AppHeader } from '@/widgets/app-header';
import styles from './RektionBrowser.module.css';

/**
 * Lives in the root layout so it never unmounts: moving between patterns must not reset the
 * scroll position of either pane. That is the reason the App Router was chosen (ADR 0001) —
 * do not move this into a page.
 *
 * Selection is read from the path rather than passed down, because the panes sit above the
 * route segments that carry it. `useParams` cannot tell `/[lang]/[word]/[prep]` from the
 * reserved `/[lang]/p/[prep]`, since both fill a `prep` param — the path can.
 */
export function RektionBrowser({ lang, children }: { lang: Locale; children: ReactNode }) {
  const pathname = usePathname();
  const [, , first, second] = pathname.split('/');

  /*
   * Exactly one side is ever selected. A word and a preposition together would be a third
   * state to explain, and it says nothing the two single states do not: pick a word and you
   * get everything it governs, pick a preposition and you get everything that governs it.
   */
  const byPreposition = first === 'p';
  const word = byPreposition || !first ? null : (findWord(first) ?? null);
  const prepKey = byPreposition
    ? (prepositions.find((p) => prepositionSlug(p.key) === second)?.key ?? null)
    : null;

  /*
   * Neither list is ever filtered. Both stay whole, and a selection only changes what is
   * LIT: pick a word and its prepositions light up, pick a preposition and its words do.
   * Removing rows moves everything below them, and a list that reshuffles cannot be learned
   * by position — which is most of what a reference list is for.
   */
  const t = strings[lang];

  return (
    <div className={styles.shell}>
      <AppHeader lang={lang} />

      <div className={styles.body}>
        <div className={styles.reels}>
          <WordList
            lang={lang}
            words={words}
            selectedWord={word?.slug ?? null}
            selectedPrep={prepKey}
          />
          <PrepositionList
            lang={lang}
            counts={prepositionCounts()}
            word={word}
            selectedPrep={prepKey}
          />
        </div>

        <div className={styles.detail}>{children}</div>
      </div>

      <footer className={styles.status}>
        <span>
          {words.reduce((n, w) => n + w.patterns.length, 0)} {t.patterns} · {words.length}{' '}
          {t.words} · {prepositions.length} {t.prepositions}
        </span>
      </footer>
    </div>
  );
}
