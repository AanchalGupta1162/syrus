import { useState } from "react";
import SectionHeading from "../SectionHeading/SectionHeading";
import tracks from "../../../assets/data/tracks";
import styles from "./Tracks.module.css";

export default function Tracks() {
  const [replayCount, setReplayCount] = useState(0);
  const [tracedCards, setTracedCards] = useState(() => new Set());

  return (
    <section
      id="tracks"
      className="syrus-section"
      aria-labelledby="tracks-title"
    >
      <div className="syrus-container">
        <div className={styles.headingRow}>
          <SectionHeading id="tracks-title">domain</SectionHeading>
          <button
            className={styles.replay}
            type="button"
            aria-controls="tracks-grid"
            onClick={() => {
              setTracedCards(new Set());
              setReplayCount((count) => count + 1);
            }}
          >
            Replay
          </button>
        </div>

        <ul id="tracks-grid" className={styles.grid}>
          {tracks.map((t, i) => (
            <li
              key={t.id}
              className={`syrus-panel ${styles.card} ${replayCount ? "is-in" : ""}`}
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
                key={replayCount}
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
                {t.by && <p className={styles.by}>by {t.by}</p>}
                {t.note && <p className={styles.note}>{t.note}</p>}
                <p className={styles.desc}>{t.description}</p>

                {/*
                  "View Problem Statements" is revealed on hackathon day.
                  Uncomment this block and set `problemStatementsUrl` in
                  src/assets/data/tracks.js.

                  <a
                    className={`syrus-btn syrus-btn--ghost ${styles.cta}`}
                    href={t.problemStatementsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Problem Statements
                  </a>
                */}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
