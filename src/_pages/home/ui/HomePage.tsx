import { AppHeader } from '@/widgets/app-header';
import { strings, type Locale } from '@/shared/i18n';
import { Wordmark } from '@/shared/ui/wordmark';
import styles from './HomePage.module.css';

export function HomePage({ lang }: { lang: Locale }) {
  const t = strings[lang];

  return (
    <>
      <AppHeader lang={lang} />
      <main className={styles.main}>
        <Wordmark large />
        <p className={styles.tagline}>{t.tagline}</p>

        {/*
          One real pattern, rendered through the whole type and colour system. It is here
          to prove the tokens, the four faces, the case colour and the case numeral all
          work end to end — not as decoration.
        */}
        <div className={styles.specimen}>
          <div className={styles.lockup}>
            warten <span className={styles.preposition}>auf</span>
            <span className={styles.caseNumber}>4</span>
          </div>
          <div className={styles.caseName}>{t.caseAkkusativ} · 4. Fall</div>
          <p className={styles.gloss}>{t.specimenGloss}</p>
          <p className={styles.example} lang="de">
            Ich warte <span className={styles.governed}>auf den</span> Bus.
          </p>
          <p className={styles.exampleGloss}>{t.specimenExample}</p>
        </div>
      </main>
    </>
  );
}
