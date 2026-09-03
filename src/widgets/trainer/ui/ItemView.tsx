'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { Item } from '@/entities/exercise';
import { prepositions } from '@/entities/preposition';
import { caseLabel, patternHeadword } from '@/entities/rektion';
import { routes } from '@/shared/config';
import { strings, type Locale } from '@/shared/i18n';
import styles from './Trainer.module.css';

const CASE_CLASS = { akk: styles.akk, dat: styles.dat, gen: styles.gen } as const;

/**
 * One item and its debrief. Split out of `Trainer` so it can be rendered against a chosen
 * item in a test — a random twelve-item session is no way to reach a particular kind, or a
 * particular state of one.
 */
export function ItemView({
  lang,
  item,
  given,
  onAnswer,
  onNext,
}: {
  lang: Locale;
  item: Item;
  given: string | null;
  onAnswer: (given: string) => void;
  onNext: () => void;
}) {
  const t = strings[lang];
  const answered = given !== null;
  const right = answered && given === item.answer;
  const nextRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (answered) nextRef.current?.focus();
  }, [answered]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return;
      if (answered) {
        if (event.key === 'Enter') onNext();
        return;
      }
      const n = Number(event.key);
      const option = item.options[n - 1];
      if (option) {
        event.preventDefault();
        onAnswer(option.label);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [answered, item, onAnswer, onNext]);

  return (
    <div className={styles.item}>
      <p className={styles.eyebrow}>{t.kind[item.kind]}</p>

      <Prompt item={item} reveal={answered} />
      <p className={styles.gloss}>{item.pattern.gloss[lang]}</p>

      <ol className={styles.options}>
        {item.options.map((option, i) => {
          const chosen = answered && given === option.label;
          return (
            <li key={option.id}>
              <button
                type="button"
                className={[
                  styles.option,
                  answered && option.correct ? styles.right : '',
                  chosen && !option.correct ? styles.wrong : '',
                  answered && !option.correct && !chosen ? styles.faded : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => !answered && onAnswer(option.label)}
                disabled={answered}
              >
                <span className={styles.key}>{i + 1}</span>
                <span className={styles.value} lang="de">
                  {option.label}
                </span>
                {answered ? (
                  <span className={`${styles.verdict} ${CASE_CLASS[option.case]}`}>
                    {caseLabel(option.case)}
                    {option.correct ? ` · ${t.correctAnswer}` : ''}
                    {chosen && !option.correct ? ` · ${t.yourAnswer}` : ''}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>

      {answered ? (
        <>
          {!right ? <Why lang={lang} item={item} /> : null}
          <div className={styles.actions}>
            <button ref={nextRef} type="button" className={styles.button} onClick={onNext}>
              {t.next} ↵
            </button>
            <Link
              href={routes.word(lang, item.pattern.slug.word)}
              className={styles.link}
              prefetch={false}
            >
              {t.openInBrowser}
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** The sentence with its gap, or the bare lockup for the kinds that have no sentence. */
function Prompt({ item, reveal }: { item: Item; reveal: boolean }) {
  const head = patternHeadword(item.pattern);

  if (item.sentence) {
    return (
      <p className={styles.prompt} lang="de">
        {item.sentence.before}{' '}
        {reveal ? (
          <span className={CASE_CLASS[item.pattern.case]}>{item.answer}</span>
        ) : (
          <span className={styles.gap} aria-label="…" />
        )}{' '}
        {item.sentence.after}
      </p>
    );
  }

  return (
    <p className={styles.prompt} lang="de">
      {head}{' '}
      {item.kind === 'case' ? (
        <span className={CASE_CLASS[item.pattern.case]}>{item.pattern.prep}</span>
      ) : (
        <span className={styles.gap} aria-label="…" />
      )}
    </p>
  );
}

/**
 * The whole point of the debrief: not "wrong", but why the rule the learner was probably
 * applying does not reach this case.
 */
function Why({ lang, item }: { lang: Locale; item: Item }) {
  const t = strings[lang];
  const preposition = prepositions.find((p) => p.key === item.pattern.prep);
  const wechsel = preposition?.defaultCase === 'wechsel';
  const kase = caseLabel(item.pattern.case);

  return (
    <div className={styles.why}>
      <span className={styles.whyLabel}>{t.why}</span>
      <div>
        <p className={styles.whyText}>
          {wechsel
            ? t.whyWechsel(patternHeadword(item.pattern), item.pattern.prep, kase)
            : t.whyFixed(item.pattern.prep, kase)}
        </p>
        {item.pattern.senseNote ? (
          <p className={styles.senseNote}>{item.pattern.senseNote[lang]}</p>
        ) : null}
      </div>
    </div>
  );
}
