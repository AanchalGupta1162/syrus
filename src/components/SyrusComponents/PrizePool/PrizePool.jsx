import { useEffect, useRef, useState } from "react";
import styles from "./PrizePool.module.css";

const START = 10000;
const TARGET = 100000;
const STEP = 1000;
const HOLDS = [50000, 70000]; // pause here for a beat
const TICK_MS = 20;
const HOLD_MS = 500;

const fmt = (n) => n.toLocaleString("en-IN");

export default function PrizePool() {
  const ref = useRef(null);
  const [value, setValue] = useState(START);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      setValue(TARGET);
      return undefined;
    }

    let raf = 0;
    let started = false;

    const run = () => {
      let current = START;
      let last = performance.now();
      let wait = TICK_MS;
      const frame = (now) => {
        if (now - last >= wait) {
          last = now;
          current += STEP;
          setValue(current);
          if (current >= TARGET) return;
          wait = HOLDS.includes(current) ? HOLD_MS : TICK_MS;
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      id="prizepool"
      className={`syrus-section ${styles.section}`}
      aria-label="Prize pool"
    >
      <div className="syrus-container">
        <div ref={ref} className={styles.wrap} data-reveal>
          <span className={styles.kicker}>Total worth of prizes</span>
          <p className={styles.amount} aria-label="Rupees 1,00,000">
            <span className={styles.currency} aria-hidden="true">
              ₹
            </span>
            <span aria-hidden="true">{fmt(value)}</span>
          </p>
          <p className={styles.perks}>Internships • Swags • Goodies</p>
        </div>
      </div>
    </section>
  );
}
