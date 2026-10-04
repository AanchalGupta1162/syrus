import { useEffect, useRef, useState, useCallback } from "react";
import SectionHeading from "../SectionHeading/SectionHeading";
import styles from "./PrizePool.module.css";

const START = 10000;
const TARGET = 100000;
const STEP = 1000;
const HOLDS = [50000, 70000]; // pause here for a beat
const TICK_MS = 20;
const HOLD_MS = 500;

const fmt = (n) => n.toLocaleString("en-IN");

/* Glow scales with progress */
const GLOW_INNER_BLUR = 10;
const GLOW_INNER_SPREAD = 3.5;
const GLOW_OUTER_BLUR = 32;
const GLOW_OUTER_SPREAD = 10;

function bladeStyle(progress) {
  const p = Math.max(progress, 0);
  const gib = (GLOW_INNER_BLUR * p).toFixed(2);
  const gis = (GLOW_INNER_SPREAD * p).toFixed(2);
  const gob = (GLOW_OUTER_BLUR * p).toFixed(2);
  const gos = (GLOW_OUTER_SPREAD * p).toFixed(2);
  return {
    width: `${p * 100}%`,
    boxShadow:
      `rgb(255, 232, 31) 0px 0px ${gib}px ${gis}px, ` +
      `rgba(255, 232, 31, 0.45) 0px 0px ${gob}px ${gos}px`,
  };
}

export default function PrizePool() {
  const ref = useRef(null);
  const [value, setValue] = useState(START);
  const [flickering, setFlickering] = useState(false);
  const [landed, setLanded] = useState(false);
  const rafRef = useRef(0);

  const progress = (value - START) / (TARGET - START);

  /* Flicker the NUMBERS at each beat */
  const triggerFlicker = useCallback(() => {
    setFlickering(true);
    setTimeout(() => setFlickering(false), HOLD_MS);
  }, []);

  /* Reset everything to start state */
  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setValue(START);
    setFlickering(false);
    setLanded(false);
  }, []);

  /* Run the counting animation */
  const run = useCallback(() => {
    let current = START;
    let last = performance.now();
    let wait = TICK_MS;
    const frame = (now) => {
      if (now - last >= wait) {
        last = now;
        current += STEP;
        setValue(current);

        if (current >= TARGET) {
          setLanded(true);
          return;
        }

        if (HOLDS.includes(current)) {
          wait = HOLD_MS;
          triggerFlicker();
        } else {
          wait = TICK_MS;
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [triggerFlicker]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      setValue(TARGET);
      setLanded(true);
      return undefined;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          /* Ensure all data-reveal elements in this section are visible */
          el.closest(".syrus-section")
            ?.querySelectorAll("[data-reveal]")
            .forEach((node) => node.classList.add("is-in"));
          /* Reset and replay every time it comes into view */
          reset();
          run();
        } else {
          /* Reset when it leaves view so it's ready for next time */
          reset();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [run, reset]);

  /* Amount classes — flicker on beats, subtle glow on landing */
  const amountClasses = [
    styles.amount,
    flickering ? styles.amountFlicker : "",
    landed ? styles.amountLanded : "",
  ]
    .filter(Boolean)
    .join(" ");

  /* Blade gets idle pulse after landing */
  const bladeClasses = [
    styles.blade,
    landed ? styles.bladeIdle : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      id="prizepool"
      className={`syrus-section ${styles.section}`}
      aria-label="Prize pool"
    >
      <div className="syrus-container">
        <SectionHeading id="prizepool-title">prize pool</SectionHeading>

        <div ref={ref} className={styles.wrap} data-reveal>
          <span className={styles.kicker}>Total worth of prizes</span>

          <p className={amountClasses} aria-label="Rupees 1,00,000">
            <span className={styles.currency} aria-hidden="true">
              ₹
            </span>
            <span aria-hidden="true">{fmt(value)}</span>
          </p>

          {/* ── Lightsaber ── */}
          <div className={styles.saberWrap} aria-hidden="true">
            {/* Hilt */}
            <span className={styles.hilt}>
              <span className={styles.pommel} />
              <span className={styles.gripBar} />
              <span className={styles.gripBar} />
              <span className={styles.gripBar} />
              <span className={styles.emitterBlock} />
              <span className={styles.emitterCap} />
            </span>
            {/* Blade track */}
            <span className={styles.bladeTrack}>
              <span
                className={bladeClasses}
                style={bladeStyle(progress)}
              />
            </span>
          </div>

          <p className={styles.perks}>Internships • Swags • Goodies</p>
        </div>
      </div>

      {/* Stormtrooper accent */}
      <div className={styles.trooperWrap}>
        <img
          className={styles.trooper}
          src="/sponsors/StormTrooper.webp"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
        />
      </div>
    </section>
  );
}
