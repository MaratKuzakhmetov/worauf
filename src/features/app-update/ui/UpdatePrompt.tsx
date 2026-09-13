'use client';

import { strings, type Locale } from '@/shared/i18n';
import { useAppUpdate } from '../model/useAppUpdate';
import styles from './UpdatePrompt.module.css';

/**
 * The visible half of the update flow. Absent until there is genuinely a newer version
 * waiting, which is most of the time — so it costs nothing to have it mounted in the layout.
 *
 * `role="status"` rather than `alert`: a new version is worth noticing, not worth
 * interrupting a screen reader mid-sentence for.
 */
export function UpdatePrompt({ lang }: { lang: Locale }) {
  const { ready, accept } = useAppUpdate();
  const t = strings[lang];

  if (!ready) return null;

  return (
    <div className={styles.prompt} role="status">
      <span>{t.updateReady}</span>
      <button type="button" className={styles.button} onClick={accept}>
        {t.updateReload}
      </button>
    </div>
  );
}
