import { PRIMARY_ACTION, REGISTER_URL, JOIN_GROUP_URL } from "../syrusConfig";
import { WhatsAppIcon, MentorIcon } from "../icons";
import styles from "./ActionButtons.module.css";

/**
 * The two call-to-action buttons shown in the Hero and in the Navbar.
 * Which one is the main button is set by PRIMARY_ACTION in syrusConfig.js.
 *
 * compact: icon-only on very small screens (used in the Navbar).
 */
export default function ActionButtons({ onCallMentor, compact = false }) {
  const isMentor = PRIMARY_ACTION === "mentor";

  return (
    <div className={`${styles.row} ${compact ? styles.compact : ""}`}>
      {isMentor ? (
        <button
          type="button"
          className="syrus-btn syrus-btn--primary"
          onClick={onCallMentor}
          aria-label="Call a Mentor"
        >
          <MentorIcon className={styles.icon} />
          <span className={styles.label}>Call a Mentor</span>
        </button>
      ) : (
        <a
          className="syrus-btn syrus-btn--primary"
          href={REGISTER_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Register on Unstop"
        >
          <span className={styles.label}>Register</span>
          <img
            className={styles.unstop}
            src="/sponsors/Unstop.webp"
            alt=""
            width="26"
            height="26"
            decoding="async"
          />
        </a>
      )}

      <a
        className="syrus-btn syrus-btn--ghost"
        href={JOIN_GROUP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Join the WhatsApp group"
      >
        <WhatsAppIcon className={styles.icon} />
        <span className={styles.label}>Join Group</span>
      </a>
    </div>
  );
}
