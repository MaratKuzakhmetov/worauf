import { headword, PatternCard, type WordEntry } from '@/entities/rektion';
import { strings, type Locale } from '@/shared/i18n';
import styles from './WordPage.module.css';

/** Every pattern of the word at once. The contrast cannot be read one card at a time. */
export function WordPage({ word, lang }: { word: WordEntry; lang: Locale }) {
  const t = strings[lang];

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>{headword(word)}</h1>
      {/*
        Every form present, not just the primary one: `vertrauen` is a verb AND a noun at
        one slug, and naming only the verb would make the noun's cards below look like a
        mistake. Reads "verb · noun · 3 patterns".
      */}
      <p className={styles.meta}>
        {word.forms.map((form) => t.pos[form]).join(' · ')} · {t.patterns(word.patterns.length)}
      </p>

      <div className={styles.cards}>
        {word.patterns.map((pattern) => (
          <PatternCard key={pattern.id} pattern={pattern} lang={lang} />
        ))}
      </div>
    </div>
  );
}
