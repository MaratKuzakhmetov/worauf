'use client';

import Link from 'next/link';
import { useEffect, useReducer } from 'react';
import {
  advance,
  isFinished,
  newSeed,
  restoreRun,
  score,
  serialiseRun,
  startRun,
  type Run,
  type SavedRun,
  type SessionAction,
  type SessionConfig,
} from '@/entities/exercise';
import { caseLabel, patternHeadword, rektionen } from '@/entities/rektion';
import { routes } from '@/shared/config';
import { strings, type Locale } from '@/shared/i18n';
import { clearRun, saveRun } from '../model/storage';
import { ItemView } from './ItemView';
import styles from './Trainer.module.css';

const CASE_CLASS = { akk: styles.akk, dat: styles.dat, gen: styles.gen } as const;

/**
 * `restart` lives outside `SessionAction` on purpose: the entity knows how to advance a
 * session, not how to throw one away and deal a new one, and folding that in would make
 * `entities/exercise` respond to a UI decision ("Play again") that belongs to this widget.
 */
type TrainerAction = SessionAction | { type: 'restart' };

function trainerReducer(run: Run, action: TrainerAction, config: SessionConfig): Run {
  if (action.type === 'restart') return startRun(rektionen, config, newSeed());
  return advance(run, action);
}

/**
 * The session screen from the design canvas (`Trainer.dc.html`).
 *
 * Feedback is immediate and per item, never batched at the end. Retrieval practice pays off
 * when the answer follows the attempt closely; the "check all 19" screen that german.net and
 * schubert-verlag use is the exact condition under which the benefit disappears, and it is
 * also the screen where a learner has forgotten why they picked what they picked
 * (docs/TRAINER.md §5).
 */
export function Trainer({
  lang,
  config,
  saved,
}: {
  lang: Locale;
  config: SessionConfig;
  /** A run in progress, handed down by the page so the first paint is already correct. */
  saved: SavedRun | null;
}) {
  const t = strings[lang];
  const [run, dispatch] = useReducer(
    (current: Run, action: TrainerAction) => trainerReducer(current, action, config),
    { config, saved },
    (init) => {
      const restored = init.saved ? restoreRun(init.saved, rektionen, init.config) : null;
      return restored ?? startRun(rektionen, init.config);
    },
  );

  /*
   * Written after every action rather than on unmount: a locale switch is a navigation, and
   * there is no unmount hook that reliably survives one.
   *
   * A FINISHED run is cleared instead of saved. There is nothing left to resume, and
   * without this a later visit to `/practice/` would restore straight to the debrief of a
   * session already seen, rather than to a fresh start.
   */
  useEffect(() => {
    if (isFinished(run.session)) clearRun();
    else saveRun(serialiseRun(run, rektionen));
  }, [run]);

  /*
   * `Esc — finish` is advertised in the progress row and in the footer hint, so it has to
   * actually fire: this is the one keyboard shortcut in the app that used to be a promise
   * with nothing behind it. Scoped to the active session only — once `isFinished` is true
   * there is nothing left to end, and the summary below has its own controls.
   */
  useEffect(() => {
    if (isFinished(run.session)) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === 'Escape') dispatch({ type: 'finish' });
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [run.session]);

  if (isFinished(run.session)) {
    return <Summary lang={lang} run={run} onRestart={() => dispatch({ type: 'restart' })} />;
  }
  const item = run.session.current;
  if (!item) return null;

  return (
    <div className={styles.session}>
      <div className={styles.progress}>
        <Ticks asked={run.session.asked} planned={run.session.planned} />
        <span className={styles.mono}>
          {run.session.asked} / {run.session.planned}
        </span>
        {/* A real button, not a keyboard hint styled to look like one: Esc is the
            shortcut, this is how the same action is reached without a keyboard. */}
        <button
          type="button"
          className={styles.finish}
          onClick={() => dispatch({ type: 'finish' })}
        >
          {t.finishSession}
          <kbd className={styles.kbd} aria-hidden="true">
            Esc
          </kbd>
        </button>
      </div>

      <ItemView
        key={`${item.id}:${run.log.length}`}
        lang={lang}
        item={item}
        given={run.session.given}
        onAnswer={(given: string) => dispatch({ type: 'answer', given } satisfies SessionAction)}
        onNext={() => dispatch({ type: 'next' })}
      />

      {/* True of the article and case items, and only those: a preposition item's rivals
          are other prepositions, so claiming otherwise under it would be a small lie. */}
      {item.kind === 'article' || item.kind === 'case' ? (
        <p className={styles.note}>{t.distractorNote}</p>
      ) : null}
    </div>
  );
}

function Ticks({ asked, planned }: { asked: number; planned: number }) {
  return (
    <span className={styles.ticks} aria-hidden="true">
      {Array.from({ length: planned }, (_, i) => (
        <span
          key={i}
          className={[
            styles.tick,
            i < asked - 1 ? styles.done : '',
            i === asked - 1 ? styles.now : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ))}
    </span>
  );
}

function Summary({
  lang,
  run,
  onRestart,
}: {
  lang: Locale;
  run: Run;
  onRestart: () => void;
}) {
  const t = strings[lang];
  const { right, total } = score(run.session);
  const seen = new Set<string>();
  const missed = run.session.results.filter((result) => {
    if (seen.has(result.item.id)) return false;
    seen.add(result.item.id);
    return result.verdict === 'wrong';
  });

  return (
    <div className={styles.summary}>
      <p className={styles.eyebrow}>{t.sessionOver}</p>
      <p className={styles.score}>{t.scoreLine(right, total)}</p>

      {missed.length > 0 ? (
        <>
          <p className={styles.missedLabel}>{t.reviewMissed}</p>
          <ul className={styles.missed}>
            {missed.map(({ item }) => (
              <li key={item.id}>
                <Link href={routes.word(lang, item.pattern.slug.word)} className={styles.missedRow}>
                  <span lang="de" className={styles.missedHead}>
                    {patternHeadword(item.pattern)}{' '}
                    <span className={CASE_CLASS[item.pattern.case]}>{item.pattern.prep}</span>
                  </span>
                  <span className={`${styles.verdict} ${CASE_CLASS[item.pattern.case]}`}>
                    {caseLabel(item.pattern.case)}
                  </span>
                  <span className={styles.gloss}>{item.pattern.gloss[lang]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <div className={styles.actions}>
        {/* Deals a fresh run in place rather than navigating: a `Link` to this same URL
            would not remount anything, since the router treats it as already there. */}
        <button type="button" className={styles.button} onClick={onRestart}>
          {t.again}
        </button>
      </div>
    </div>
  );
}
