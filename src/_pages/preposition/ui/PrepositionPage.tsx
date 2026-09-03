import Link from 'next/link';
import { daForm, woForm, type Preposition } from '@/entities/preposition';
import { caseLabel, caseTag, headword, type WordEntry } from '@/entities/rektion';
import { routes } from '@/shared/config';
import { strings, type Locale } from '@/shared/i18n';
import styles from './PrepositionPage.module.css';

const CASE_CLASS = { akk: styles.akk, dat: styles.dat, gen: styles.gen } as const;

/**
 * Everything one preposition governs, grouped by case. This direction is the dense one —
 * `auf` governs dozens of words — and it is where the arbitrariness of the case becomes
 * visible: the same preposition, two columns, no rule connecting them.
 */
export function PrepositionPage({
  preposition,
  words,
  lang,
}: {
  preposition: Preposition;
  words: readonly WordEntry[];
  lang: Locale;
}) {
  const t = strings[lang];
  const patterns = words.flatMap((w) =>
    w.patterns.filter((p) => p.prep === preposition.key).map((p) => ({ word: w, pattern: p })),
  );
  const groups = (['akk', 'dat', 'gen'] as const)
    .map((kase) => ({ kase, items: patterns.filter(({ pattern }) => pattern.case === kase) }))
    .filter(({ items }) => items.length > 0);

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>{preposition.key}</h1>
      <p className={styles.forms}>
        {woForm(preposition.key)}? · {daForm(preposition.key)} · {preposition.gloss[lang]}
      </p>

      {groups.map(({ kase, items }) => (
        <section key={kase} className={styles.group}>
          <h2 className={`${styles.groupHead} ${CASE_CLASS[kase]}`}>
            {preposition.key} <span className={styles.tag}>{caseTag(kase)}</span> ·{' '}
            {caseLabel(kase)} · {t.patterns(items.length)}
          </h2>
          <ul className={styles.list}>
            {items.map(({ word, pattern }) => (
              <li key={pattern.id}>
                <Link className={styles.item} href={routes.word(lang, word.slug)}>
                  <span className={styles.word}>{headword(word)}</span>
                  <span className={styles.gloss}>{pattern.gloss[lang]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
