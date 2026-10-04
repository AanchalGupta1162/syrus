import { useEffect, useRef } from "react";
import { starState } from "../Starfield/Starfield";
import styles from "./ForceQuote.module.css";

/**
 * "May the Force be with you" — a scroll-driven moment between Tracks and FAQ.
 *
 * The section is a short scroll track with a sticky full-screen stage that
 * OVERLAPS its neighbours: it starts once the Tracks section is 50% scrolled
 * (so its top margin is -50% of Tracks' height) and is finished when 50% of
 * the FAQ section has come into view (bottom margin of -50% of the FAQ's
 * height). A dark scrim fades in behind the quote so it reads over whatever is
 * still on screen, and the section ignores pointer events so nothing under it
 * becomes unclickable.
 *
 * Scroll progress p (0..1) is eased with an exponential follower (same idea as
 * the intro). The complete quote holds before a further scroll spins FORCE
 * into CODE like a slot machine, then the quote rushes away.
 *
 *   0.02 – 0.15  a blade of light draws across the screen
 *   0.13 – 0.27  the blade splits open and reveals the quote, from the middle out
 *   0.08 – 0.30  the six words land one after another
 *   0.30 – 0.62  hold on the complete quote
 *   0.60 – 0.84  the FORCE word spins like a slot machine and lands on CODE, Yoda winks
 *   0.88 – 1.00  the quote rushes toward the viewer and gives way to the FAQ
 *
 * With prefers-reduced-motion the section is a normal block showing the final
 * quote: no overlap, no scroll animation, no hyperspace.
 */

const LINES = [
  ["may", "the", "force"],
  ["be", "with", "you"],
];
// The FORCE word is a slot machine: one reel per letter, each spinning through
// random letters and stopping (left to right) on C, O, D, E. CODE is a letter
// shorter, so the last reel stops on a blank, which Yoda then fills.
const SLOT_FROM = "force";
const SLOT_TO = "code ";
const REEL_ROW = 1.32; // em, one letter's height (matches .reelCell in the css)
const REELS = SLOT_FROM.split("").map((from, i) => {
  // A fixed pseudo-random run of letters per reel, so renders never differ.
  let seed = 17 + i * 31;
  const fill = Array.from({ length: 10 + i * 3 }, () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return "abcdefghijklmnopqrstuvwxyz"[seed % 26];
  });
  return [from, ...fill, SLOT_TO[i]];
});
const FOLLOW_RATE = 8;
/**
 * How much of the neighbouring sections the stage overlaps:
 * it starts when Tracks is 50% scrolled and is done when 50% of the FAQ is in view.
 */
const OVERLAP_TRACKS = 0.5;
const OVERLAP_FAQ = 0.5;
const WARP_PEAK = 0.6;
const QUOTE_HOLD_END = 0.58;
// The slot spin is driven by scroll, after the quote has held for a while.
const SLOT_START = 0.6;
const SLOT_END = 0.84;
const EXIT_START = 0.88;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;

// A baby-Yoda style face for the slot the shorter word frees up. The right eye winks
// (see the css): the dark eye gives way to a happy arc.
function YodaFace() {
  return (
    <svg viewBox="0 0 120 100" aria-hidden="true" focusable="false">
      <path d="M33 58 Q14 40 3 50 Q4 70 30 74 Z" fill="#a9d08b" />
      <path d="M87 58 Q106 40 117 50 Q116 70 90 74 Z" fill="#a9d08b" />
      <path d="M31 60 Q17 49 10 54 Q12 66 30 70 Z" fill="#e3b9a2" />
      <path d="M89 60 Q103 49 110 54 Q108 66 90 70 Z" fill="#e3b9a2" />
      <ellipse cx="60" cy="58" rx="31" ry="29" fill="#bfe09f" />
      <path d="M52 30 Q55 24 58 30 M62 30 Q66 23 69 30" fill="none" stroke="#8fb872" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="39" cy="69" rx="6" ry="4" fill="#f0a6a0" opacity="0.5" />
      <ellipse cx="81" cy="69" rx="6" ry="4" fill="#f0a6a0" opacity="0.5" />
      <g>
        <circle cx="47" cy="58" r="8" fill="#1f1a14" />
        <circle cx="44.6" cy="55.2" r="2.6" fill="#fff" />
        <circle cx="49.6" cy="60.8" r="1.2" fill="#fff" />
      </g>
      <g className={styles.eyeR}>
        <circle cx="73" cy="58" r="8" fill="#1f1a14" />
        <circle cx="70.6" cy="55.2" r="2.6" fill="#fff" />
        <circle cx="75.6" cy="60.8" r="1.2" fill="#fff" />
      </g>
      <path
        className={styles.winkArc}
        d="M65 60 Q73 51 81 60"
        fill="none"
        stroke="#1f1a14"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path d="M54 72 Q60 78 66 72" fill="none" stroke="#6d8f55" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function ForceQuote() {
  const trackRef = useRef(null);
  const contentRef = useRef(null);
  const revealRef = useRef(null);
  const bladeRef = useRef(null);
  const glowRef = useRef(null);
  const scrimRef = useRef(null);
  const wordRefs = useRef([]);
  const reelRefs = useRef([]);
  const yodaRef = useRef(null);
  const forceLabelRef = useRef(null);

  useEffect(() => {
    const track = trackRef.current;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let target = 0;
    let current = -1;
    let raf = 0;
    let last = 0;

    // Pull the track over the end of Tracks and the start of the FAQ.
    const prev = track.previousElementSibling;
    const next = track.nextElementSibling;
    const setOverlap = () => {
      if (reduceMotion) return;
      track.style.marginTop = prev ? `${-Math.round(prev.offsetHeight * OVERLAP_TRACKS)}px` : "";
      track.style.marginBottom = next ? `${-Math.round(next.offsetHeight * OVERLAP_FAQ)}px` : "";
    };

    const readTarget = () => {
      const r = track.getBoundingClientRect();
      const total = Math.max(1, r.height - window.innerHeight);
      target = clamp(-r.top / total);
    };

    // The slot machine: each reel's letters scroll with the page.
    const renderSlot = (v) => {
      REELS.forEach((strip, r) => {
        const reel = reelRefs.current[r];
        if (!reel) return;
        const done = easeOut(seg(v, r * 0.07, 0.62 + r * 0.09));
        reel.style.transform = `translate3d(0, ${-done * (strip.length - 1) * REEL_ROW}em, 0)`;
      });
      // Yoda takes the fifth slot once CODE has landed, then winks.
      yodaRef.current?.classList.toggle(styles.yodaOn, v >= 0.8);
    };
    const apply = (p) => {
      const intro = Math.min(p / QUOTE_HOLD_END, 1);
      const exit = ease(seg(p, EXIT_START, 1));

      // Blade: draws out from the middle, splits open, then settles to a thin divider.
      const draw = ease(seg(intro, 0.02, 0.15));
      const split = seg(intro, 0.13, 0.27);
      const bladeFade =
        seg(intro, 0.02, 0.06) *
        (1 - 0.7 * seg(intro, 0.24, 0.42)) *
        (1 - seg(intro, 0.7, 0.86)) *
        (1 - exit);
      const blade = bladeRef.current;
      blade.style.opacity = String(bladeFade);
      blade.style.transform = `translate3d(0, -50%, 0) scale(${draw}, ${1 + 1.6 * Math.sin(split * Math.PI)})`;

      // Quote is revealed from the blade outwards.
      const open = easeOut(split);
      revealRef.current.style.clipPath = `inset(${(1 - open) * 50}% 0 ${(1 - open) * 50}% 0)`;

      // Words land one after another.
      wordRefs.current.forEach((el, i) => {
        if (!el) return;
        const start = 0.14 + i * 0.05;
        const w = easeOut(seg(intro, start, start + 0.13));
        el.style.opacity = String(w);
        el.style.transform = `translate3d(0, ${(1 - w) * 34}px, 0) scale(${1 + (1 - w) * 0.22})`;
      });

      const slotSpin = reduceMotion ? 0 : seg(p, SLOT_START, SLOT_END);
      renderSlot(slotSpin);
      forceLabelRef.current?.setAttribute(
        "aria-label",
        slotSpin >= 0.6 ? "CODE" : "FORCE",
      );

      // Hold the completed quote for the slot reel, then rush toward the viewer.
      const settle = ease(seg(intro, 0, 0.5));
      const rush = ease(seg(p, EXIT_START, 0.99));
      const scale = lerp(0.92, 1, settle) * lerp(1, 1.5, rush * rush);
      const content = contentRef.current;
      content.style.transform = `scale(${scale})`;
      content.style.opacity = String(1 - exit);

      // Scrim darkens whatever is still on screen so the quote stays readable.
      scrimRef.current.style.opacity = String(
        ease(seg(intro, 0, 0.18)) * (1 - exit),
      );

      // Glow swells behind the quote.
      const glow = glowRef.current;
      glow.style.opacity = String(
        ease(seg(intro, 0.12, 0.4)) * (1 - exit),
      );
      glow.style.transform = `translate3d(-50%, -50%, 0) scale(${lerp(0.7, 1.15, ease(seg(intro, 0.08, 0.85)))})`;

      // Hyperspace streak on the way out (shared starfield).
      // (Skipped at exactly 0 and 1 so it never fights the intro's own warp.)
      if (!reduceMotion && p > 0 && p < 1) {
        starState.warp =
          WARP_PEAK * ease(seg(p, EXIT_START - 0.12, EXIT_START + 0.02)) * (1 - exit);
      }
    };

    if (reduceMotion) {
      apply(0.62); // final composition, no scroll animation
      return undefined;
    }

    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      current += (target - current) * (1 - Math.exp(-dt * FOLLOW_RATE));
      if (Math.abs(target - current) < 0.0003) current = target;
      apply(current);
      raf = current !== target ? requestAnimationFrame(tick) : 0;
    };

    const kick = () => {
      readTarget();
      if (current === target && (target === 0 || target === 1)) return; // nothing to move
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    setOverlap();
    readTarget();
    current = target; // no animation when restoring a scrolled page
    apply(current);

    // Re-measure on resize / font load only (not when an FAQ item opens, which
    // would move the page under the reader).
    const onResize = () => {
      setOverlap();
      kick();
    };
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", onResize);
    document.fonts?.ready.then(onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", onResize);
      track.style.marginTop = "";
      track.style.marginBottom = "";
    };
  }, []);

  let wordIndex = 0;

  return (
    <section
      id="the-force"
      ref={trackRef}
      className={styles.track}
      aria-label="May the Force be with you"
    >
      <div className={styles.stage}>
        <div ref={scrimRef} className={styles.scrim} aria-hidden="true" />
        <div ref={glowRef} className={styles.glow} aria-hidden="true" />
        <div ref={bladeRef} className={styles.blade} aria-hidden="true" />

        <div ref={contentRef} className={styles.content}>
          <div ref={revealRef} className={styles.reveal}>
            <p className={styles.quote}>
              {LINES.map((line, li) => (
                <span key={li} className={styles.line}>
                  {line.map((word) => {
                    const i = wordIndex++;
                    const isForce = word === "force";
                    return (
                      <span
                        key={word}
                        ref={(el) => {
                          wordRefs.current[i] = el;
                          if (isForce) forceLabelRef.current = el;
                        }}
                        className={`${styles.word} ${isForce ? styles.force : ""}`}
                        aria-label={isForce ? "FORCE" : undefined}
                        role={isForce ? "text" : undefined}
                      >
                        {isForce ? (
                          <span className={styles.slotViewport} aria-hidden="true">
                            {REELS.map((strip, r) => (
                              <span
                                key={r}
                                className={styles.reel}
                              >
                                <span
                                  ref={(el) => {
                                    reelRefs.current[r] = el;
                                  }}
                                  className={styles.reelStrip}
                                >
                                  {strip.map((ch, k) => (
                                    <span key={k} className={styles.reelCell}>
                                      {ch}
                                    </span>
                                  ))}
                                </span>
                              </span>
                            ))}
                            <span ref={yodaRef} className={styles.yoda}>
                              <YodaFace />
                            </span>
                          </span>
                        ) : (
                          word
                        )}
                      </span>
                    );
                  })}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
