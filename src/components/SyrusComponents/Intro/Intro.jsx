import { useEffect, useRef } from "react";
import { starState } from "../Starfield/Starfield";
import { scrollToHero } from "../syrusConfig";
import styles from "./Intro.module.css";

/**
 * Opening sequence, driven entirely by scrolling (no video):
 *
 *   0.00 – 0.10  "A long time ago…" line
 *   0.09 – 0.25  SYRUS 7.0 title recedes into space
 *   0.20 – 0.80  perspective crawl
 *   0.70 – 0.89  hyperspace jump (starfield streaks, accelerating)
 *   0.89 – 1.00  flash, then the hero arrives and the stars slow down
 *
 * `children` is the hero. It lives inside the pinned stage so it is the last
 * frame of the intro, then the page scrolls on normally to the sponsors.
 */

const INTRO_PARAGRAPHS = [
  "It is a period of rapid innovation. Hidden at VESIT in Chembur, the builders of CodeCell++ have opened the gates to SYRUS 7.0, a two-day hackathon for teams of builders, dreamers and tinkerers.",
  "Five tracks await: Blockchain, FinTech, Agentic AI, Quantum, and a special mission for first-year students. Choose your mission, assemble your crew and prepare to build.",
  "On the 9th and 10th of October the galaxy will be watching. Prepare to jump to lightspeed…",
];

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

export default function Intro({ children }) {
  const trackRef = useRef(null);
  const stageRef = useRef(null);
  const prologueRef = useRef(null);
  const titleRef = useRef(null);
  const crawlWrapRef = useRef(null);
  const crawlRef = useRef(null);
  const hintRef = useRef(null);
  const skipRef = useRef(null);
  const flashRef = useRef(null);
  const heroRef = useRef(null);

  useEffect(() => {
    const track = trackRef.current;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let target = 0;
    let current = -1;
    let raf = 0;
    let last = 0;
    let stageH = window.innerHeight;
    let crawlH = 0;

    const measure = () => {
      stageH = window.innerHeight;
      crawlH = crawlRef.current?.offsetHeight || 0;
    };

    const readTarget = () => {
      const r = track.getBoundingClientRect();
      const total = Math.max(1, r.height - window.innerHeight);
      target = clamp(-r.top / total);
    };

    const apply = (p) => {
      // Prologue line
      const pro = prologueRef.current;
      pro.style.opacity = String(1 - seg(p, 0.045, 0.1));
      pro.style.transform = `translate3d(0, ${-seg(p, 0.03, 0.1) * 24}px, 0)`;

      // Title recedes
      const tIn = seg(p, 0.085, 0.12);
      const tOut = seg(p, 0.2, 0.25);
      const tMove = ease(seg(p, 0.1, 0.25));
      const title = titleRef.current;
      title.style.opacity = String(tIn * (1 - tOut));
      title.style.transform = `translate3d(0, ${lerp(0, -stageH * 0.1, tMove)}px, 0) scale(${lerp(1.5, 0.05, tMove)})`;

      // Crawl
      const crawlP = seg(p, 0.2, 0.8);
      const wrap = crawlWrapRef.current;
      wrap.style.opacity = String(seg(p, 0.19, 0.23) * (1 - seg(p, 0.76, 0.83)));
      const y = lerp(crawlH + 60, -stageH * 0.9, crawlP);
      crawlRef.current.style.transform = `translateX(-50%) rotateX(26deg) translate3d(0, ${y}px, 0)`;

      // Hints
      hintRef.current.style.opacity = String(1 - seg(p, 0.015, 0.05));
      skipRef.current.style.opacity = String(1 - seg(p, 0.8, 0.88));
      skipRef.current.style.pointerEvents = p > 0.86 ? "none" : "auto";

      // Hyperspace jump
      const warpUp = ease(seg(p, 0.7, 0.87));
      const warpDown = ease(seg(p, 0.89, 1));
      starState.warp = reduceMotion ? 0 : warpUp * (1 - warpDown);

      const flash = Math.max(0, 1 - Math.abs(p - 0.885) / 0.028);
      flashRef.current.style.opacity = String(
        reduceMotion ? 0 : Math.pow(flash, 1.6) * 0.9,
      );

      // Hero arrives
      const h = ease(seg(p, 0.89, 0.99));
      const hero = heroRef.current;
      hero.style.opacity = String(h);
      hero.style.transform = `scale(${lerp(0.78, 1, h)})`;
      hero.style.visibility = h > 0.001 ? "visible" : "hidden";
      hero.style.pointerEvents = p > 0.96 ? "auto" : "none";
    };

    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 9);
      current += (target - current) * k;
      if (Math.abs(target - current) < 0.0003) current = target;
      apply(current);
      if (current !== target) raf = requestAnimationFrame(tick);
      else raf = 0;
    };

    const kick = () => {
      readTarget();
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    measure();
    readTarget();
    current = target; // no animation when restoring a scrolled page
    apply(current);

    const onResize = () => {
      measure();
      kick();
    };

    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", onResize);
    // Fonts change the crawl height once they load.
    document.fonts?.ready.then(onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", onResize);
      starState.warp = 0;
    };
  }, []);

  return (
    <section id="intro" ref={trackRef} className={styles.track}>
      <div ref={stageRef} className={styles.stage}>
        <div ref={prologueRef} className={styles.prologue}>
          <p className={styles.prologueText}>
            A long time ago in a galaxy far,
            <br />
            far away....
          </p>
        </div>

        <div ref={titleRef} className={styles.title} aria-hidden="true">
          syrus 7.0
        </div>

        <div ref={crawlWrapRef} className={styles.crawlWrap}>
          <div ref={crawlRef} className={styles.crawl}>
            {INTRO_PARAGRAPHS.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>
        </div>

        <div ref={flashRef} className={styles.flash} aria-hidden="true" />

        <div ref={heroRef} className={styles.hero}>
          {children}
        </div>

        <div ref={hintRef} className={styles.hint} aria-hidden="true">
          <span>Scroll</span>
          <i />
        </div>

        <button
          ref={skipRef}
          type="button"
          className={styles.skip}
          onClick={scrollToHero}
        >
          Skip intro
        </button>
      </div>
    </section>
  );
}
