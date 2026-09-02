import styles from './Wordmark.module.css';

/**
 * `wo` carries the Akkusativ colour because the name is itself the rule the app teaches:
 * `worauf` is the wo-form of `auf` (docs/DESIGN.md §12).
 */
export function Wordmark({ large = false }: { large?: boolean }) {
  return (
    <span className={large ? `${styles.mark} ${styles.large}` : styles.mark}>
      <span className={styles.wo}>wo</span>rauf?
    </span>
  );
}
