import {
  LinkedInIcon,
  InstagramIcon,
  GitHubIcon,
  DiscordIcon,
  WhatsAppIcon,
} from "../icons";
import styles from "./SyrusFooter.module.css";

const SOCIALS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/vesit-tinkers-codecell-computer-department",
    Icon: LinkedInIcon,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/codecell_vesit/",
    Icon: InstagramIcon,
  },
  {
    label: "GitHub",
    href: "https://github.com/CMPN-CODECELL",
    Icon: GitHubIcon,
  },
  {
    label: "Discord",
    href: "https://discord.com/invite/muCduvJMFQ",
    Icon: DiscordIcon,
  },
  {
    label: "WhatsApp",
    href: "https://chat.whatsapp.com/D1lcqTuiNsM4gkqnKHThIH",
    Icon: WhatsAppIcon,
  },
];

export default function SyrusFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`syrus-container ${styles.inner}`}>
        <a href="/" className={styles.brand}>
          <img
            src="/codecell-logo.webp"
            alt=""
            width="44"
            height="44"
            loading="lazy"
            decoding="async"
          />
          <span className={styles.brandText}>CodeCell++</span>
        </a>

        <div className={styles.college}>
          <p className={styles.collegeName}>
            <img
              src="/VESIT.png"
              alt=""
              width="40"
              height="40"
              loading="lazy"
              decoding="async"
            />
            <span>Vivekanand Education Society's Institute Of Technology</span>
          </p>
          <p className={styles.address}>
            Hashu Adwani Memorial Complex, Collector's Colony, Chembur, Mumbai,
            Maharashtra, 400074
          </p>
        </div>

        <ul className={styles.socials}>
          {SOCIALS.map(({ label, href, Icon }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className={styles.social}
              >
                <Icon className={styles.socialIcon} />
              </a>
            </li>
          ))}
        </ul>

        <p className={styles.legal}>
          © 2026-2027 CodeCell++ VESIT. All Rights Reserved.{" "}
          <span aria-hidden="true">|</span>{" "}
          <a href="/code-of-conduct">Code of Conduct</a>
        </p>
      </div>
    </footer>
  );
}
