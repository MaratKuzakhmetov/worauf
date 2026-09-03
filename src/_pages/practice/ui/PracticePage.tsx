'use client';

import { useEffect, useState } from 'react';
import { defaultConfig, SESSION_LENGTH, type SavedRun } from '@/entities/exercise';
import { strings, type Locale } from '@/shared/i18n';
import { AppHeader } from '@/widgets/app-header';
import { Trainer, loadRun } from '@/widgets/trainer';
import styles from './PracticePage.module.css';

/**
 * The trainer sits outside the `(browse)` route group, so the two panes are not behind it.
 * A drill wants the whole screen, and the reference is one click away in the header.
 *
 * A run in progress is picked up here rather than inside the trainer, because the answer
 * decides which screen to show at all. It is read in an effect, not during render: the
 * static HTML cannot know what is in this browser's `sessionStorage`, and rendering the
 * session straight away would be a hydration mismatch. The intro is the honest first paint.
 */
export function PracticePage({ lang }: { lang: Locale }) {
  const t = strings[lang];
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState<SavedRun | null>(null);

  useEffect(() => {
    const stored = loadRun();
    if (stored) {
      setSaved(stored);
      setRunning(true);
    }
  }, []);

  return (
    <div className={styles.shell}>
      <AppHeader lang={lang} />

      <main className={styles.main}>
        {running ? (
          <Trainer lang={lang} config={defaultConfig} saved={saved} />
        ) : (
          <div className={styles.intro}>
            <p className={styles.count}>{SESSION_LENGTH}</p>
            <p className={styles.lead}>{t.practiceIntro}</p>

            <button type="button" className={styles.button} onClick={() => setRunning(true)}>
              {t.startSession}
            </button>
          </div>
        )}
      </main>

      <footer className={styles.status}>
        <span>{t.trainerKeys}</span>
      </footer>
    </div>
  );
}
