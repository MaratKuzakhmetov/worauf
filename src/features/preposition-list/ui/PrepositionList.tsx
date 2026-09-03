'use client';

import Link from 'next/link';
import { daForm, prepositions, prepositionSlug, woForm } from '@/entities/preposition';
import { caseTag, type WordEntry } from '@/entities/rektion';
import { routes } from '@/shared/config';
import { strings, type Locale } from '@/shared/i18n';
import styles from './PrepositionList.module.css';

type Props = {
  lang: Locale;
  counts: Readonly<Record<string, number>>;
  /** The selected word, when there is one — it decides which prepositions are available. */
  word: WordEntry | null;
  selectedPrep: string | null;
};

const CASE_CLASS = { akk: styles.akk, dat: styles.dat, gen: styles.gen } as const;

export function PrepositionList({ lang, counts, word, selectedPrep }: Props) {
  const t = strings[lang];
  const available = word ? new Set(word.prepositions) : null;

  return (
    <section className={styles.pane} aria-label={t.prepositionsPane}>
      <h2 className={styles.head}>
        <span>{t.prepositionsPane}</span>
        <b>{available ? available.size : prepositions.length}</b>
      </h2>

      <ol className={styles.rows}>
        {prepositions.map(({ key }) => {
          const slug = prepositionSlug(key);
          const pattern = word?.patterns.find((p) => p.prep === key);
          const dimmed = available !== null && pattern === undefined;
          const selected = key === selectedPrep;

          // Always the preposition's own page. Clicking one never combines it with the
          // selected word — it asks the same question from the other end.
          const target = routes.preposition(lang, slug);

          return (
            <li key={key}>
              <Link
                href={target}
                className={[styles.row, dimmed ? styles.dim : '', selected ? styles.on : '']
                  .filter(Boolean)
                  .join(' ')}
                data-prep={key}
                aria-disabled={dimmed ? 'true' : undefined}
                aria-current={selected ? 'page' : undefined}
                title={`${woForm(key)}? · ${daForm(key)}`}
              >
                <span className={styles.prep}>{key}</span>
                {pattern ? (
                  <span className={`${styles.tag} ${CASE_CLASS[pattern.case]}`}>
                    {caseTag(pattern.case)}
                  </span>
                ) : (
                  <span className={styles.count}>{counts[key] ?? 0}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
