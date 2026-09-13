'use client';

import { useState } from 'react';
import {
  buildExport,
  exportFilename,
  loadStoredProgress,
  reviewCount,
} from '@/entities/progress';
import { strings, type Locale } from '@/shared/i18n';
import { APP_VERSION } from '@/shared/config';
import styles from './ExportProgress.module.css';

/**
 * Writing the progress out as a file.
 *
 * With no account and no server, this file is the only way progress reaches another device —
 * and the only defence against "clear browsing data", which takes IndexedDB with it. The
 * download is built in the page from a Blob; there is nothing to fetch and no request to
 * make, which is what `output: 'export'` and this project's no-network rule both require.
 */
export function ExportProgress({ lang }: { lang: Locale }) {
  const t = strings[lang];
  const [empty, setEmpty] = useState(false);

  async function onExport(): Promise<void> {
    const progress = await loadStoredProgress();
    if (!progress || reviewCount(progress) === 0) {
      setEmpty(true);
      return;
    }
    setEmpty(false);

    const now = Date.now();
    const blob = new Blob([JSON.stringify(buildExport(progress, APP_VERSION, now), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = exportFilename(now);
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <button type="button" className={styles.button} onClick={() => void onExport()}>
        {t.exportProgress}
      </button>
      {empty ? <span className={styles.note}>{t.nothingToExport}</span> : null}
    </>
  );
}
