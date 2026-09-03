import { headword, PatternCard, type WordEntry } from '@/entities/rektion';
import { strings, type Locale } from '@/shared/i18n';
import styles from './WordPage.module.css';

/** Every pattern of the word at once. The contrast cannot be read one card at a time. */
export function WordPage({ word, lang }: { word: WordEntry; lang: Locale }) {
  const t = strings[lang];

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>{headword(word)}</h1>
      <p className={styles.meta}>
        {t.pos[word.pos]} · {word.patterns.length} {t.patterns}
      </p>

      <div className={styles.cards}>
        {word.patterns.map((pattern) => (
          <PatternCard key={pattern.id} pattern={pattern} lang={lang} />
        ))}
      </div>
    </div>
  );
}
