import { useState } from "react";
import SectionHeading from "../SectionHeading/SectionHeading";
import { ChevronIcon } from "../icons";
import styles from "./Faq.module.css";

const FAQ_DATA = [
  {
    question:
      "I do not have a lot of experience in coding. Can I still join this hackathon?",
    answer:
      "Yes, Syrus 7.0 is beginner-friendly. Even if you do not have a lot of experience, you can participate and learn new things.",
  },
  {
    question: "Where can I register for the hackathon?",
    answer:
      "Register via the registration links available on SYRUS's official website or through links provided in the emails and WhatsApp messages.",
  },
  {
    question: "What is the required team size to participate?",
    answer: "The required team size to participate is 2-4 members.",
  },
  {
    question: "Can people from different branches/years form a team?",
    answer:
      "Yes, there are no restrictions in forming teams from diverse branches and years. However, all participants must be from VESIT only.",
  },
  {
    question: "Is there any entry fee for the registration?",
    answer: "No, Syrus is free for all the participants.",
  },
  {
    question: "What is the judging criteria for the hackathon?",
    answer:
      "The judging criteria for the hackathon will be based on your innovation and understanding of the problem statement. A detailed document containing the guidelines and judging criteria will be sent to all the registered teams.",
  },
  {
    question: "Are there any particular domains for the hackathon?",
    answer:
      "Yes, the hackathon has five domains: Blockchain, FinTech, Agentic AI, Quantum, and FE Special (only for first-year students).",
  },
];

export default function Faq() {
  const [open, setOpen] = useState(null);

  return (
    <section
      id="faq-section"
      className={`syrus-section ${styles.section}`}
      aria-labelledby="faq-title"
    >
      <img
          src="/syrus-characters/mandalorian.png"
          alt=""
          aria-hidden="true"
          className={styles.character}
          loading="lazy"
        />
      <div className="syrus-container">
        <SectionHeading id="faq-title">faqs</SectionHeading>

        <div className={styles.list} data-reveal>
          {FAQ_DATA.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.question} className={styles.item}>
                <h3 className={styles.q}>
                  <button
                    type="button"
                    className={styles.btn}
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${i}`}
                    id={`faq-q-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <span className={styles.num} aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.text}>{item.question}</span>
                    <ChevronIcon
                      className={`${styles.chev} ${isOpen ? styles.chevOpen : ""}`}
                    />
                  </button>
                </h3>
                <div
                  id={`faq-a-${i}`}
                  role="region"
                  aria-labelledby={`faq-q-${i}`}
                  className={`${styles.panel} ${isOpen ? styles.panelOpen : ""}`}
                >
                  <div className={styles.panelInner}>
                    <p className={styles.a}>{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
