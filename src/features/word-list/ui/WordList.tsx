'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { caseTag, headword, type WordEntry } from '@/entities/rektion';
import { routes } from '@/shared/config';
import { strings, type Locale } from '@/shared/i18n';
import styles from './WordList.module.css';

type Props = {
  lang: Locale;
  words: readonly WordEntry[];
  selectedWord: string | null;
  /** The preposition key in play, if any — decides which words are lit. */
  selectedPrep: string | null;
};

const CASE_CLASS = { akk: styles.akk, dat: styles.dat, gen: styles.gen } as const;

export function WordList({ lang, words, selectedWord, selectedPrep }: Props) {
  const t = strings[lang];
  const selectedRow = useRef<HTMLAnchorElement | null>(null);

  const matches = selectedPrep
    ? words.filter((w) => w.prepositions.includes(selectedPrep)).length
    : words.length;

  useEffect(() => {
    selectedRow.current?.scrollIntoView({ block: 'center' });
  }, [selectedWord, selectedPrep]);

  return (
    <section className={styles.pane} aria-label={t.wordsPane}>
      <h2 className={styles.head}>
        <span>{t.wordsPane}</span>
        <b>{selectedPrep ? `${matches} / ${words.length}` : words.length}</b>
      </h2>

      <ol className={styles.rows}>
        {words.map((word) => {
          /*
           * Nothing is ever removed from this list. Position is what makes a list learnable:
           * once `warten` sits where it sits, it stays there, and the reader learns the shape
           * of the alphabet rather than re-reading a list that reshuffles under them. What a
           * selection changes is what is LIT, never what is present.
           */
          const forPrep = selectedPrep
            ? word.patterns.find((p) => p.prep === selectedPrep)
            : undefined;
          const muted = selectedPrep !== null && forPrep === undefined;
          const shown = forPrep ?? (word.patterns.length === 1 ? word.patterns[0] : undefined);

          // Always the word. Word and preposition are never selected together: each side
          // answers the same question from its own end (docs/DESIGN.md §5).
          const target = routes.word(lang, word.slug);

          return (
            <li key={word.slug}>
              <Link
                href={target}
                ref={word.slug === selectedWord ? selectedRow : undefined}
                data-word={word.slug}
                className={[styles.row, muted ? styles.muted : '', word.slug === selectedWord ? styles.on : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-current={word.slug === selectedWord ? 'page' : undefined}
              >
                <span className={styles.word}>{headword(word)}</span>
                {shown ? (
                  <span className={styles.gov}>
                    {shown.prep}
                    <span className={`${styles.tag} ${CASE_CLASS[shown.case]}`}>
                      {caseTag(shown.case)}
                    </span>
                  </span>
                ) : (
                  <span className={styles.badge} title={t.severalPrepositions}>
                    {word.patterns.length}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
