'use client';

import { useRef, useState } from 'react';
import {
  emptyProgress,
  loadStoredProgress,
  parseImport,
  writeProgressNow,
  type ImportFailure,
} from '@/entities/progress';
import { datasetVersion } from '@/entities/rektion';
import { strings, type Locale } from '@/shared/i18n';
import styles from './ImportProgress.module.css';

/**
 * Reading a progress file back in.
 *
 * The import MERGES: per pattern, the more recently updated record wins (ADR 0005). That is
 * what makes the file a way to move between a phone and a laptop rather than only a way to
 * recover from a disaster — and a merge cannot silently destroy the history already here,
 * which a replace could.
 */

type Outcome =
  | { readonly kind: 'idle' }
  | { readonly kind: 'done'; readonly merged: number }
  | { readonly kind: 'failed'; readonly failure: ImportFailure };

export function ImportProgress({ lang }: { lang: Locale }) {
  const t = strings[lang];
  const inputRef = useRef<HTMLInputElement>(null);
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });

  async function onFile(file: File): Promise<void> {
    const into = (await loadStoredProgress()) ?? emptyProgress(datasetVersion, Date.now());
    const result = parseImport(await file.text(), into, Date.now());

    if (!result.ok) {
      setOutcome({ kind: 'failed', failure: result.failure });
      return;
    }
    // A merge that cannot be written is not an import: say nothing succeeded.
    const written = await writeProgressNow(result.progress);
    setOutcome(
      written
        ? { kind: 'done', merged: result.merged }
        : { kind: 'failed', failure: { kind: 'unreadable' } },
    );
  }

  return (
    <>
      <button
        type="button"
        className={styles.button}
        onClick={() => inputRef.current?.click()}
      >
        {t.importProgress}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className={styles.input}
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared so choosing the same file twice fires `change` the second time too.
          event.target.value = '';
          if (file) void onFile(file);
        }}
      />

      {/* A refusal has to say WHICH refusal: "a newer version wrote this" is a thing the
          reader can act on, "import failed" is not. */}
      {outcome.kind === 'done' ? (
        <span className={styles.note}>{t.importMerged(outcome.merged)}</span>
      ) : null}
      {outcome.kind === 'failed' ? (
        <span className={styles.error}>
          {outcome.failure.kind === 'too-new' ? t.importTooNew : t.importUnreadable}
        </span>
      ) : null}
    </>
  );
}
