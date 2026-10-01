import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import SectionHeading from "../SectionHeading/SectionHeading";
import { ArrowIcon } from "../icons";
import events from "../../../assets/data/timelineEvents";
import shipModels from "../../../assets/data/shipModels";
import styles from "./Timeline.module.css";

// three.js is only downloaded when the timeline is about to be seen.
const ShipViewer = lazy(() => import("./ShipViewer"));

const N = events.length;
const pad2 = (n) => String(n).padStart(2, "0");

export default function Timeline() {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const [mountViewer, setMountViewer] = useState(false);
  const lockRef = useRef(false);
  const lockTimer = useRef(0);

  // Start loading the 3D viewer shortly before the section scrolls into view.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    if (!("IntersectionObserver" in window)) {
      setMountViewer(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMountViewer(true);
          io.disconnect();
        }
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const getSpan = useCallback(() => {
    const track = trackRef.current;
    if (!track) return null;
    const navH =
      parseFloat(getComputedStyle(track).getPropertyValue("--syrus-nav-h")) || 60;
    const r = track.getBoundingClientRect();
    return { r, navH, span: r.height - (window.innerHeight - navH) };
  }, []);

  // Active stop follows native scroll progress
  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      if (lockRef.current) return;
      const m = getSpan();
      if (!m || m.span <= 0) return;
      const { r, navH, span } = m;
      if (r.top > window.innerHeight || r.bottom < 0) return;
      const p = Math.min(0.9999, Math.max(0, (navH - r.top) / span));
      setActive(Math.floor(p * N));
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [getSpan]);

  useEffect(() => () => clearTimeout(lockTimer.current), []);

  const goTo = useCallback(
    (index) => {
      const i = Math.max(0, Math.min(N - 1, index));
      setActive(i);
      const m = getSpan();
      if (!m) return;
      const top = window.scrollY + m.r.top - m.navH + ((i + 0.5) / N) * m.span;
      lockRef.current = true;
      clearTimeout(lockTimer.current);
      lockTimer.current = window.setTimeout(() => {
        lockRef.current = false;
      }, 700);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    },
    [getSpan],
  );

  const onKeyDown = (e) => {
    if (e.target.closest("button")) {
      // let buttons keep their own arrow-key/focus behaviour except left/right
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    }
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      goTo(active + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      goTo(active - 1);
    }
  };

  const ev = events[active];
  const isTBA = ev.date === "TBA";

  return (
    <section
      id="timeline"
      className={styles.section}
      style={{ "--n": N }}
      aria-labelledby="timeline-title"
    >
      <div className={`syrus-container ${styles.head}`}>
        <SectionHeading id="timeline-title">timeline</SectionHeading>
      </div>

      <div ref={trackRef} className={styles.track}>
        <div
          className={styles.stage}
          tabIndex={0}
          onKeyDown={onKeyDown}
          aria-label="Timeline. Use the arrow keys to move between events."
        >
          <div className={styles.viewerPanel}>
            {mountViewer && (
              <Suspense fallback={null}>
                <ShipViewer steps={shipModels} index={active} />
              </Suspense>
            )}

            <nav className={styles.railWrap} aria-label="Timeline stops">
              <ol className={styles.rail}>
                {events.map((e, k) => (
                  <li
                    key={e.title}
                    className={`${styles.stop} ${k < active ? styles.stopDone : ""} ${
                      k === active ? styles.stopActive : ""
                    }`}
                  >
                    <button
                      type="button"
                      className={styles.stopBtn}
                      onClick={() => goTo(k)}
                      aria-label={`Stop ${k + 1}: ${e.title}`}
                      aria-current={k === active ? "step" : undefined}
                    >
                      <span className={styles.dot}>{pad2(k + 1)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          <div className={`syrus-panel ${styles.card}`} aria-live="polite">
            <div className={styles.cardInner}>
              <div className={styles.meta}>
                <span className={styles.phase}>{ev.phase}</span>
                <span className={styles.step}>
                  Stop {pad2(active + 1)} / {pad2(N)}
                </span>
              </div>
              <div className={`${styles.date} ${isTBA ? styles.tba : ""}`}>{ev.date}</div>
              <h3 className={styles.title}>{ev.title}</h3>
              {ev.description && <p className={styles.desc}>{ev.description}</p>}

              <div className={styles.nav}>
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={() => goTo(active - 1)}
                  disabled={active === 0}
                >
                  <ArrowIcon dir="left" className={styles.navIcon} />
                  Prev
                </button>
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={() => goTo(active + 1)}
                  disabled={active === N - 1}
                >
                  Next
                  <ArrowIcon dir="right" className={styles.navIcon} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
