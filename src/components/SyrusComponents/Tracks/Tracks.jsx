import { useState } from "react";
import SectionHeading from "../SectionHeading/SectionHeading";
import tracks from "../../../assets/data/tracks";
import styles from "./Tracks.module.css";

export default function Tracks() {
  const [tracedCards, setTracedCards] = useState(() => new Set());

  return (
    <section
      id="tracks"
      className={`syrus-section ${styles.section}`}
      aria-labelledby="tracks-title"
    >
      <div className={`syrus-container ${styles.layout}`}>
        <img
          src="/syrus-characters/Yoda.png"
          alt=""
          aria-hidden="true"
          className={styles.character}
          loading="lazy"
        />
        <div className={styles.headingRow}>
          <SectionHeading id="tracks-title">domain</SectionHeading>
        </div>

        <ul id="tracks-grid" className={styles.grid}>
          {tracks.map((t, i) => (
            <li
              key={t.id}
              className={`syrus-panel ${styles.card}`}
              data-reveal
              data-traced={tracedCards.has(t.id)}
              onMouseLeave={() =>
                setTracedCards((previous) => new Set(previous).add(t.id))
              }
              style={{
                "--reveal-delay": `${i * 0.08}s`,
                "--trace-delay": `${0.2 + i * 0.18}s`,
              }}
            >
              <svg
                className={styles.edge}
                viewBox="0 0 565 300"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  className={styles.edgeBase}
                  d="M16.5 0.5 H564.5 V283.5 L548.5 299.5 H0.5 V16.5 Z"
                />
                <path
                  className={styles.edgeBlade}
                  d="M16.5 0.5 H564.5 V283.5 L548.5 299.5 H0.5 V16.5 Z"
                  pathLength="1"
                />
              </svg>
              <div className={styles.body}>
                <span className={styles.index} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className={styles.title}>{t.title}</h3>
                <p className={styles.desc}>{t.description}</p>
                <div className={styles.cardFooter}>
                  <span className={styles.problemCount}>04 problem statements</span>
                  <a
                    className={`syrus-btn syrus-btn--ghost ${styles.cta}`}
                    href={t.problemStatementsUrl || undefined}
                    target={t.problemStatementsUrl ? "_blank" : undefined}
                    rel={t.problemStatementsUrl ? "noopener noreferrer" : undefined}
                    aria-disabled={!t.problemStatementsUrl}
                  >
                    View problem statements <span aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
