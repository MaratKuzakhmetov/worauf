'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, type KeyboardEvent, type RefObject } from 'react';
import { caseTag, headword, patternHeadword, words } from '@/entities/rektion';
import { routes } from '@/shared/config';
import { strings, type Locale } from '@/shared/i18n';
import { indexFor, search } from '../model/searchIndex';
import { nearest } from '../model/suggest';
import styles from './SearchBox.module.css';

interface SearchBoxProps {
  lang: Locale;
  value: string;
  onChange: (value: string) => void;
  /** Owned above, because `/` focuses this input from anywhere on the page. */
  inputRef: RefObject<HTMLInputElement | null>;
}

const CASE_CLASS = { akk: styles.akk, dat: styles.dat, gen: styles.gen } as const;

/**
 * Results drop out of the box; the two panes behind it are never touched.
 *
 * The reasoning is the same one that keeps a selection from filtering a pane
 * (docs/DESIGN.md §5): a list is learned by position, and a list that empties out under
 * the cursor while you type cannot be. So the search does not narrow the reference — it
 * answers beside it, and the answer disappears the moment you take it or dismiss it.
 *
 * A result row is a PATTERN, not a word. The gloss is what was matched and the gloss
 * belongs to the pattern, so `sich freuen` searched by meaning gives back two rows with
 * two prepositions and two cases — the contrast, visible before the click.
 */
export function SearchBox({ lang, value, onChange, inputRef }: SearchBoxProps) {
  const t = strings[lang];
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  const query = value.trim();
  const { patterns: results, approximate } =
    query === ''
      ? { patterns: [], approximate: false }
      : search(indexFor(lang), value);
  const suggestions = query !== '' && results.length === 0 ? nearest(words, value) : [];
  // Open only while the box has focus: a panel left hanging over the two panes would cover
  // the very rows the reader turned to it to reach.
  const open = query !== '' && focused;

  useEffect(() => {
    setActive(0);
  }, [value]);

  function go(href: string): void {
    onChange('');
    router.push(href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (!open || results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => Math.min(results.length - 1, current + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => Math.max(0, current - 1));
    } else if (event.key === 'Enter') {
      const pattern = results[active];
      if (pattern) {
        event.preventDefault();
        go(routes.word(lang, pattern.slug.word));
      }
    }
  }

  return (
    <div className={styles.box} role="search">
      <label className={styles.label} htmlFor="worauf-search">
        {t.searchLabel}
      </label>
      <input
        id="worauf-search"
        ref={inputRef}
        className={styles.input}
        type="search"
        role="combobox"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={t.searchPlaceholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        // The query never reaches the address (ADR 0002): the URL carries the selection,
        // and a search that rewrote it would push a history entry per keystroke.
        aria-expanded={open}
        aria-controls="worauf-results"
        aria-activedescendant={
          open && results.length > 0 ? `worauf-result-${active}` : undefined
        }
      />
      {value === '' ? (
        <kbd className={styles.hint} aria-hidden="true">
          /
        </kbd>
      ) : (
        <button type="button" className={styles.clear} onClick={() => onChange('')}>
          <span className={styles.label}>{t.clearSearch}</span>
          <span aria-hidden="true">×</span>
        </button>
      )}

      {open ? (
        <ul
          className={styles.panel}
          id="worauf-results"
          role="listbox"
          aria-label={t.searchLabel}
          // Keeps focus in the input, so the row's own click still fires: without this the
          // blur closes the panel first and the click lands on nothing.
          onMouseDown={(event) => event.preventDefault()}
        >
          {approximate ? (
            <li className={styles.approx} aria-hidden="true">
              {t.approximate}
            </li>
          ) : null}
          {results.map((pattern, i) => (
            <li
              key={pattern.id}
              id={`worauf-result-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? `${styles.result} ${styles.active}` : styles.result}
            >
              <Link
                href={routes.word(lang, pattern.slug.word)}
                className={styles.hit}
                onMouseEnter={() => setActive(i)}
                onClick={() => onChange('')}
              >
                <span className={styles.lemma} lang="de">
                  {patternHeadword(pattern)}{' '}
                  <span className={CASE_CLASS[pattern.case]}>{pattern.prep}</span>
                </span>
                <span className={`${styles.tag} ${CASE_CLASS[pattern.case]}`}>
                  {caseTag(pattern.case)}
                </span>
                <span className={styles.gloss}>{pattern.gloss[lang]}</span>
              </Link>
            </li>
          ))}

          {results.length === 0 ? (
            /*
             * tja shows nothing here. The base is finite, so silence is a worse answer than
             * its size plus the word that was probably meant (docs/DESIGN.md §8).
             */
            <li className={styles.absent}>
              <p className={styles.absentLine}>{t.nothingFound(words.length)}</p>
              {suggestions.length > 0 ? (
                <p className={styles.suggest}>
                  {t.maybeYouMean}{' '}
                  {suggestions.map((word, i) => (
                    <span key={word.slug}>
                      {i > 0 ? ', ' : ''}
                      <button
                        type="button"
                        className={styles.suggestion}
                        lang="de"
                        onClick={() => go(routes.word(lang, word.slug))}
                      >
                        {headword(word)}
                      </button>
                    </span>
                  ))}
                </p>
              ) : null}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
