import { daForm, woForm } from '@/entities/preposition';
import type { Locale } from '@/shared/i18n';
import { caseLabel, caseNumber } from '../model/selectors';
import type { Rektion } from '../model/schema';
import styles from './PatternCard.module.css';

const CASE_CLASS = { akk: styles.akk, dat: styles.dat, gen: styles.gen } as const;

/**
 * The governed phrase is the preposition plus whatever determiner follows it. That pair is
 * where the case becomes visible, so it is what carries the colour — the grammar is shown
 * in the sentence rather than stated beside it (docs/DESIGN.md §4).
 */
function splitExample(sentence: string, preposition: string) {
  const words = sentence.split(' ');
  const at = words.findIndex((w) => w.replace(/[.,!?;:]/g, '').toLowerCase() === preposition);
  return words.map((word, index) => ({
    word,
    governed: at !== -1 && (index === at || index === at + 1),
  }));
}

export function PatternCard({
  pattern,
  lang,
  compact = false,
}: {
  pattern: Rektion;
  lang: Locale;
  compact?: boolean;
}) {
  const tone = CASE_CLASS[pattern.case];
  const [example] = pattern.examples;
  const reflexive = pattern.reflexive ? 'sich ' : '';
  const article = pattern.article ? `${pattern.article} ` : '';

  return (
    <article className={compact ? `${styles.card} ${styles.compact}` : styles.card}>
      <div className={styles.lockup}>
        <span className={styles.head}>
          {article}
          {reflexive}
          {pattern.lemma} <span className={tone}>{pattern.prep}</span>
        </span>
        <span className={`${styles.kase} ${tone}`}>
          {caseLabel(pattern.case)} · {caseNumber(pattern.case)}. Fall
        </span>
      </div>

      <p className={styles.gloss}>{pattern.gloss[lang]}</p>
      {pattern.senseNote ? <p className={styles.note}>{pattern.senseNote[lang]}</p> : null}

      {example ? (
        <>
          <p className={styles.example} lang="de">
            {splitExample(example.de, pattern.prep).map(({ word, governed }, index) => (
              <span key={index} className={governed ? `${styles.governed} ${tone}` : undefined}>
                {word}{' '}
              </span>
            ))}
          </p>
          <p className={styles.exampleGloss}>{example[lang]}</p>
        </>
      ) : null}

      <p className={styles.chips}>
        <span className={styles.chip}>{woForm(pattern.prep)}?</span>
        <span className={styles.chip}>{daForm(pattern.prep)}</span>
        {pattern.clause?.dass ? (
          <span className={styles.chip}>{daForm(pattern.prep)}, dass …</span>
        ) : null}
      </p>
    </article>
  );
}
