import { useRef, useState } from "react";
import "./Team.css";
import CodecellNav from "../../components/Navbar/Navbar";
import Card from "../../components/misc/Card/Card";
import Footer from "../../components/Footer/Footer";
import ScrollToTopButton from "../../components/misc/ScrollToTop/ScrollToTop";
import Matrix from "../../components/MatrixRainingCode/Matrix";
import faculty from "../../assets/data/faculty.json";
import be from "../../assets/data/be.json";
import te from "../../assets/data/te.json";
import se from "../../assets/data/se.json";

const GROUPS = [
  { id: "faculty", title: "Faculty Advisors", members: faculty, large: true },
  { id: "be", title: "BE Members", members: be },
  { id: "te", title: "TE Members", members: te },
  { id: "se", title: "SE Members", members: se },
];

const Chevron = () => (
  <svg className="team-acc-chev" viewBox="0 0 8 6" aria-hidden="true">
    <path d="M0 0h8v2H0zM2 2h4v2H2zM3 4h2v2H3z" />
  </svg>
);

const Team = () => {
  // One group open at a time; faculty starts open.
  const [openId, setOpenId] = useState("faculty");
  const headerRefs = useRef({});

  const toggle = (id) => {
    const opening = openId !== id;
    setOpenId(opening ? id : null);
    if (opening) {
      // Once the previous group has collapsed, bring the opened header near the top if it is off screen.
      setTimeout(() => {
        const header = headerRefs.current[id];
        if (!header) return;
        const top = header.getBoundingClientRect().top;
        if (top < 0 || top > window.innerHeight * 0.6) {
          window.scrollTo({ top: window.scrollY + top - 16, behavior: "smooth" });
        }
      }, 460);
    }
  };

  return (
    <div id="team">
      <Matrix />
      <ScrollToTopButton />
      <CodecellNav />

      <section className="team-hero">
        <div className="team-wrap team-hero-inner">
          {/* Single line on wide screens, stacked on phones; both type themselves out. */}
          <h1 className="team-title team-title-line" aria-label="Meet the CodeCell++ Team">
            <span className="team-tline" aria-hidden="true">
              <span className="team-type team-type-line">
                Meet the <span className="team-accent">CodeCell++</span> Team
              </span>
              <span className="team-cursor team-cursor-line" />
            </span>
          </h1>
          <h1 className="team-title team-title-stack" aria-label="Meet the CodeCell++ Team">
            <span className="team-tline" aria-hidden="true">
              <span className="team-type team-type-1">Meet the</span>
              <span className="team-cursor team-cursor-1" />
            </span>
            <span className="team-tline team-accent" aria-hidden="true">
              <span className="team-type team-type-2">CodeCell++</span>
              <span className="team-cursor team-cursor-2" />
            </span>
            <span className="team-tline" aria-hidden="true">
              <span className="team-type team-type-3">Team</span>
              <span className="team-cursor team-cursor-3" />
            </span>
          </h1>
        </div>
      </section>

      <main className="team-wrap team-roster">
        {GROUPS.map((group) => {
          const open = openId === group.id;
          const panelId = `team-panel-${group.id}`;
          return (
            <section key={group.id} className="team-group">
              <h2
                className={`team-acc ${open ? "is-open" : ""}`}
                ref={(el) => {
                  headerRefs.current[group.id] = el;
                }}
              >
                <span className="team-acc-frame">
                  <button
                    type="button"
                    className="team-acc-btn"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => toggle(group.id)}
                  >
                    <span className="team-acc-title">{group.title}</span>
                    <span className="team-acc-dash" aria-hidden="true" />
                    <Chevron />
                  </button>
                </span>
              </h2>
              <div id={panelId} className={`team-panel ${open ? "is-open" : ""}`}>
                <div className="team-panel-inner">
                  <div className="team-panel-body">
                    <div className={`team-cards ${group.large ? "is-large" : ""}`}>
                      {group.members.map((card) => (
                        <Card card={card} key={card.name} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </main>

      <Footer />
    </div>
  );
};

export default Team;
