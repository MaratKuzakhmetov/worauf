'use client';

import Link from 'next/link';
import { useEffect, useReducer } from 'react';
import {
  advance,
  isCorrect,
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
import { useProgress } from '../model/useProgress';
import { ItemView } from './ItemView';
import styles from './Trainer.module.css';

const CASE_CLASS = { akk: styles.akk, dat: styles.dat, gen: styles.gen } as const;

/**
 * `deal` lives outside `SessionAction` on purpose: the entity knows how to advance a session,
 * not how to throw one away and hand over a new one, and folding that in would make
 * `entities/exercise` respond to a UI decision ("Play again") that belongs to this widget.
 *
 * The run arrives already built rather than being built in here, because dealing one now
 * needs the selection weights, and a reducer has no business reaching for them.
 */
type TrainerAction = SessionAction | { type: 'deal'; run: Run };

function trainerReducer(run: Run | null, action: TrainerAction): Run | null {
  if (action.type === 'deal') return action.run;
  return run ? advance(run, action) : run;
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
  const { recordAnswer, weightAt, writeFailed, progress } = useProgress();
  const [run, dispatch] = useReducer(trainerReducer, null);

  /*
   * The first deal waits for stored history to arrive, so the very first session of a visit
   * is weighted like every later one. It is a wait of milliseconds against IndexedDB, and
   * the alternative — deal now, weight from the next session on — makes the feature quietly
   * inconsistent in exactly the case a returning learner notices.
   */
  useEffect(() => {
    if (run || !progress) return;
    const restored = saved ? restoreRun(saved, rektionen, config) : null;
    dispatch({
      type: 'deal',
      run: restored ?? startRun(rektionen, config, newSeed(), weightAt(Date.now())),
    });
  }, [run, progress, saved, config, weightAt]);

  /*
   * Written after every action rather than on unmount: a locale switch is a navigation, and
   * there is no unmount hook that reliably survives one.
   *
   * A FINISHED run is cleared instead of saved. There is nothing left to resume, and
   * without this a later visit to `/practice/` would restore straight to the debrief of a
   * session already seen, rather than to a fresh start.
   */
  useEffect(() => {
    if (!run) return;
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
    if (!run || isFinished(run.session)) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === 'Escape') dispatch({ type: 'finish' });
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [run]);

  if (!run) return null;

  if (isFinished(run.session)) {
    return (
      <Summary
        lang={lang}
        run={run}
        writeFailed={writeFailed}
        onRestart={() =>
          dispatch({
            type: 'deal',
            run: startRun(rektionen, config, newSeed(), weightAt(Date.now())),
          })
        }
      />
    );
  }
  const item = run.session.current;
  if (!item) return null;

  /*
   * Only the FIRST answer to an item is recorded, matching `score()`: a retry that finally
   * lands is the in-session queue doing its job, not evidence the pattern is known. Logging
   * it would tell the scheduler the opposite of what happened.
   */
  const answered = new Set(run.session.results.map((result) => result.item.id));

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
        onAnswer={(given: string) => {
          if (!answered.has(item.id)) {
            recordAnswer(item.pattern.id, isCorrect(item, given));
          }
          dispatch({ type: 'answer', given } satisfies SessionAction);
        }}
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
  writeFailed,
  onRestart,
}: {
  lang: Locale;
  run: Run;
  /** Storage refused the write. Said once, at the end, never mid-drill. */
  writeFailed: boolean;
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

      {/* Not an error dialog and not a nag: the drill worked, only the remembering did not,
          and the one useful thing to say is where the progress can be kept instead. */}
      {writeFailed ? <p className={styles.warning}>{t.progressNotSaved}</p> : null}

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
