import { findPattern, PatternCard } from '@/entities/rektion';
import { strings, type Locale } from '@/shared/i18n';
import styles from './StartPage.module.css';

/**
 * Nothing selected. Not a placeholder: it shows the minimal pair the whole app exists for,
 * so the first screen already teaches something (docs/DESIGN.md §8).
 */
const SHOWCASE = ['freuen', 'auf'] as const;
const CONTRAST = ['freuen', 'ueber'] as const;

export function StartPage({ lang }: { lang: Locale }) {
  const t = strings[lang];
  const primary = findPattern(SHOWCASE[0], SHOWCASE[1]);
  const contrast = findPattern(CONTRAST[0], CONTRAST[1]);

  return (
    <div className={styles.wrap}>
      <p className={styles.eyebrow}>{t.startHere}</p>
      {primary ? <PatternCard pattern={primary} lang={lang} /> : null}
      {contrast ? (
        <>
          <p className={styles.versus}>≠</p>
          <PatternCard pattern={contrast} lang={lang} />
        </>
      ) : null}
      <p className={styles.hint}>{t.anotherPattern}</p>
    </div>
  );
}
