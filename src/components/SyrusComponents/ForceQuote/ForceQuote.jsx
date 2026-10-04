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
 * into CODE, then the quote rushes away.
 *
 *   0.02 – 0.15  a blade of light draws across the screen
 *   0.13 – 0.27  the blade splits open and reveals the quote, from the middle out
 *   0.08 – 0.30  the six words land one after another
 *   0.30 – 0.62  hold on the complete quote
 *   0.62 – 0.84  the FORCE word spins vertically into CODE
 *   0.88 – 1.00  the quote rushes toward the viewer and gives way to the FAQ
 *
 * With prefers-reduced-motion the section is a normal block showing the final
 * quote: no overlap, no scroll animation, no hyperspace.
 */

const LINES = [
  ["may", "the", "force"],
  ["be", "with", "you"],
];
const FOLLOW_RATE = 8;
/**
 * How much of the neighbouring sections the stage overlaps:
 * it starts when Tracks is 50% scrolled and is done when 50% of the FAQ is in view.
 */
const OVERLAP_TRACKS = 0.5;
const OVERLAP_FAQ = 0.5;
const WARP_PEAK = 0.6;
const QUOTE_HOLD_END = 0.58;
const SLOT_START = 0.62;
const SLOT_END = 0.84;
const EXIT_START = 0.88;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;

export default function ForceQuote() {
  const trackRef = useRef(null);
  const contentRef = useRef(null);
  const revealRef = useRef(null);
  const bladeRef = useRef(null);
  const glowRef = useRef(null);
  const scrimRef = useRef(null);
  const wordRefs = useRef([]);
  const slotTextRef = useRef(null);
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

    const apply = (p) => {
      const intro = Math.min(p / QUOTE_HOLD_END, 1);
      const slot = reduceMotion ? 0 : easeOut(seg(p, SLOT_START, SLOT_END));
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

      const slotText = slotTextRef.current;
      const slotActive = p >= SLOT_START && p <= SLOT_END;
      const showingCode = p > SLOT_END || (p >= SLOT_START && slot >= 0.5);
      if (slotText) {
        slotText.textContent = showingCode ? "code" : "force";

        if (slotActive) {
          const turn = slot < 0.5 ? -slot * 180 : (1 - slot) * 180;
          const visibility = Math.min(1, Math.abs(0.5 - slot) * 10);
          slotText.style.transform = `translate3d(0, ${Math.sin(slot * Math.PI) * -0.25}em, 0) rotateX(${turn}deg)`;
          slotText.style.opacity = String(visibility);
        } else {
          slotText.style.transform = "none";
          slotText.style.opacity = "1";
        }
      }
      forceLabelRef.current?.setAttribute(
        "aria-label",
        showingCode ? "CODE" : "FORCE",
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
                            <span ref={slotTextRef} className={styles.slotText}>
                              force
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
