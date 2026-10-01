import SectionHeading from "../SectionHeading/SectionHeading";
import tracks from "../../../assets/data/tracks";
import styles from "./Tracks.module.css";

export default function Tracks() {
  return (
    <section
      id="tracks"
      className="syrus-section"
      aria-labelledby="tracks-title"
    >
      <div className="syrus-container">
        <SectionHeading id="tracks-title">tracks</SectionHeading>

        <ul className={styles.grid}>
          {tracks.map((t, i) => (
            <li
              key={t.id}
              className={`syrus-panel ${styles.card}`}
              data-reveal
              style={{ "--reveal-delay": `${(i % 3) * 0.08}s` }}
            >
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
