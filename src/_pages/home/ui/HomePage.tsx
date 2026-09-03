import { notFound } from 'next/navigation';
import { caseLabel, caseNumber, findRektion } from '@/entities/rektion';
import { AppHeader } from '@/widgets/app-header';
import { strings, type Locale } from '@/shared/i18n';
import { Wordmark } from '@/shared/ui/wordmark';
import styles from './HomePage.module.css';

/** Phase 0 hard-coded this. Now it comes from the dataset, which is the point of phase 1. */
const SPECIMEN_ID = 'warten-auf-akk';

export function HomePage({ lang }: { lang: Locale }) {
  const t = strings[lang];
  const specimen = findRektion(SPECIMEN_ID);
  if (!specimen) notFound();

  const [example] = specimen.examples;
  if (!example) notFound();

  // The governed phrase is the preposition and whatever determiner follows it — that pair
  // is where the case becomes visible, so it is what carries the colour.
  const words = example.de.split(' ');
  const prepositionAt = words.findIndex((word) => word.replace(/[.,!?]/g, '') === specimen.prep);

  return (
    <>
      <AppHeader lang={lang} />
      <main className={styles.main}>
        <Wordmark large />
        <p className={styles.tagline}>{t.tagline}</p>

        <div className={styles.specimen}>
          <div className={styles.lockup}>
            {specimen.lemma} <span className={styles.preposition}>{specimen.prep}</span>
            <span className={styles.caseNumber}>{caseNumber(specimen.case)}</span>
          </div>
          <div className={styles.caseName}>
            {caseLabel(specimen.case)} · {caseNumber(specimen.case)}. Fall
          </div>
          <p className={styles.gloss}>{specimen.gloss[lang]}</p>
          <p className={styles.example} lang="de">
            {words.map((word, index) => {
              const governed = index === prepositionAt || index === prepositionAt + 1;
              return (
                <span key={index} className={governed ? styles.governed : undefined}>
                  {word}
                  {index < words.length - 1 ? ' ' : ''}
                </span>
              );
            })}
          </p>
          <p className={styles.exampleGloss}>{example[lang]}</p>
        </div>
      </main>
    </>
  );
}
