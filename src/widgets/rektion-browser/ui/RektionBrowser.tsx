'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState, type ReactNode } from 'react';
import { prepositionSlug, prepositions } from '@/entities/preposition';
import { findWord, prepositionCounts, words } from '@/entities/rektion';
import { PrepositionList } from '@/features/preposition-list';
import { WordList } from '@/features/word-list';
import { routes } from '@/shared/config';
import { strings, type Locale } from '@/shared/i18n';
import { AppHeader } from '@/widgets/app-header';
import { useBrowserKeys } from '../model/useBrowserKeys';
import styles from './RektionBrowser.module.css';

/**
 * Lives in the root layout so it never unmounts: moving between patterns must not reset the
 * scroll position of either pane, nor the text in the search box. That is the reason the
 * App Router was chosen (ADR 0001) — do not move this into a page.
 *
 * Selection is read from the path rather than passed down, because the panes sit above the
 * route segments that carry it. The search query is the opposite: it is local state and
 * never touches the address, or every keystroke would be a history entry.
 */
export function RektionBrowser({ lang, children }: { lang: Locale; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);

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
   * The search does not narrow them either — it answers in its own dropdown and leaves the
   * reference alone. Removing rows moves everything below them, and a list that reshuffles
   * cannot be learned by position, which is most of what a reference list is for.
   */
  const t = strings[lang];

  useBrowserKeys({
    query,
    hasSelection: word !== null || prepKey !== null,
    searchRef,
    onClearQuery: () => setQuery(''),
    onClearSelection: () => router.push(routes.home(lang)),
    onRandom: () => {
      const pick = words[Math.floor(Math.random() * words.length)];
      if (pick) router.push(routes.word(lang, pick.slug));
    },
  });

  const announcement = word
    ? t.prepositionsAvailable(new Set(word.prepositions).size, prepositions.length)
    : prepKey
      ? t.wordsFound(words.filter((w) => w.prepositions.includes(prepKey)).length, words.length)
      : '';

  return (
    <div className={styles.shell}>
      <AppHeader lang={lang} query={query} onQuery={setQuery} searchRef={searchRef} />

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

      {/*
        The counters are the one thing a sighted reader gets from the pane headings and a
        screen reader would otherwise not: how much of the base is still in play.
      */}
      <p className={styles.live} role="status" aria-live="polite">
        {announcement}
      </p>

      <footer className={styles.status}>
        <span>
          {t.patterns(words.reduce((n, w) => n + w.patterns.length, 0))} · {t.words(words.length)}{' '}
          · {t.prepositions(prepositions.length)}
        </span>
        <span className={styles.keys}>{t.keyboardHint}</span>
      </footer>
    </div>
  );
}
