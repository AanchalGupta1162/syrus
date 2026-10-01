import { EVENT_DATES } from "../syrusConfig";
import ActionButtons from "../ActionButtons/ActionButtons";
import styles from "./Hero.module.css";

/**
 * Minimal hero: CodeCell++ and VESIT logos, the title (primary font),
 * the dates and the two action buttons.
 */
export default function Hero({ onCallMentor }) {
  return (
    <div className={styles.hero}>
      <div className={styles.logos}>
        <img
          src="/codecell-logo.webp"
          alt="CodeCell++"
          className={styles.logo}
          width="64"
          height="64"
        />
        <span className={styles.divider} aria-hidden="true" />
        <img
          src="/VESIT.png"
          alt="VESIT"
          className={`${styles.logo} ${styles.vesit}`}
          width="44"
          height="64"
        />
      </div>

      <h1 className={styles.title}>syrus 7.0</h1>

      <p className={styles.dates}>{EVENT_DATES}</p>

      <div className={styles.actions}>
        <ActionButtons onCallMentor={onCallMentor} />
      </div>
    </div>
  );
}
