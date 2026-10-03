import styles from "./SectionHeading.module.css";

/**
 * Section title in the secondary font (Star Jedi Hollow).
 * Write the title in lowercase: Star Jedi renders lowercase as capitals.
 */
export default function SectionHeading({ id, children, align = "left" }) {
  return (
    <div
      className={`${styles.head} ${align === "center" ? styles.center : ""}`}
      data-reveal
    >
      <h2 id={id} className={styles.title}>
        {children}
      </h2>
      <span className={styles.rule} aria-hidden="true" />
    </div>
  );
}
