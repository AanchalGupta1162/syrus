import SectionHeading from "../SectionHeading/SectionHeading";
import styles from "./Sponsors.module.css";

/**
 * Logos are circles. `logo: null` renders an empty white circle until the
 * file is added (drop it in /public/sponsors and set `logo`).
 */
const TIERS = [
  {
    key: "title",
    label: "Title Sponsors",
    size: "lg",
    items: [
      { name: "EkamVistar", logo: "/sponsors/EkamVistar.webp" },
      { name: "021 Trade", logo: "/sponsors/012 Trade.webp" },
      { name: "FalconX", logo: "/sponsors/FalconX.webp", imgScale: 1.7},
    ],
  },
  {
    key: "partners",
    label: "Partners",
    size: "md",
    items: [
      { name: "GitHub", tag: "Brand Partner", logo: "/sponsors/github.webp" },
      { name: "Unstop", tag: "Platform Partner", logo: "/sponsors/Unstop.webp" },
      {
        name: "GiveMyCertificate",
        tag: "Certificate Partner",
        logo: "/sponsors/Certificate.webp",
      },
    ],
  },
  {
    key: "individual",
    label: "Individual Sponsors",
    size: "md",
    items: [
      { name: "Santosh Gupta", tag: "ML Engineer at Meta", logo: "/sponsors/SantoshGuptaSir.webp", objectFit: "cover" },
      { name: "Vishal Chandwani", tag: "Senior Engineer at Microsoft", logo: "/sponsors/VishalSir.webp", objectFit: "cover" },
      { name: "Ranjeet Shetye", tag: "MD at Everstream Analytics", logo: "/sponsors/RanjeetSir.webp", objectFit: "cover", objectPosition: "center 20%", imgScale: 1.2 },
    ],
  },
  {
    key: "associate",
    label: "Associate Sponsors",
    size: "sm",
    items: [
      { name: ".xyz", logo: "/sponsors/XYZ.webp" },
      { name: "Interview Buddy", logo: "/sponsors/InterviewBuddy.webp" },
    ],
  },
  {
    key: "community",
    label: "Community Partners",
    size: "sm",
    items: [
      { name: "GDG VESIT", logo: "/sponsors/GDG-VESIT.webp" },
      { name: "Prakhar", logo: "/sponsors/PrakharLogo.jpeg",     objectFit:"cover", imgScale: 1.80 , padding: "3%"},
      { name: "IBM Qiskit", logo: "/sponsors/QiskitLogo-WithoutBG.webp" , imgScale: 1.80 },
      { name: "LFDT", logo: "/sponsors/LFDT.webp",imgScale: 1.20 },
      { name: "CodeCell TechFusion", logo: "/sponsors/CodeCellTechfusionLogo.webp" },
    ],
  },
];

export default function Sponsors() {
  return (
    <section
      id="sponsors"
      className={`syrus-section ${styles.section}`}
      aria-labelledby="sponsors-title"
    >
      <div className="syrus-container">
        <SectionHeading id="sponsors-title">sponsors</SectionHeading>

        {TIERS.map((tier) => (
          <div key={tier.key} className={styles.tier} data-reveal>
            <h3 className={styles.tierLabel}>{tier.label}</h3>
            <ul className={`${styles.grid} ${styles[tier.size]}`}>
              {tier.items.map((s) => (
                <li key={s.name} className={styles.item}>
                  <span className={styles.circle}>
                    {s.logo && (
                      <img
                        src={s.logo}
                        alt={s.name}
                        loading="lazy"
                        decoding="async"
                        width="240"
                        height="240"
                        style={{
                          ...(s.objectFit && { objectFit: s.objectFit, padding: 0 }),
                          ...(s.objectPosition && { objectPosition: s.objectPosition }),
                          ...(s.imgScale && { transform: `scale(${s.imgScale})` }),
                        }}
                      />
                    )}
                  </span>
                  <span className={styles.name}>{s.name}</span>
                  {s.tag && <span className={styles.tag}>{s.tag}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
