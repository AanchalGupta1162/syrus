import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import SectionHeading from "../SectionHeading/SectionHeading";
import events from "../../../assets/data/timelineEvents";
import shipModels from "../../../assets/data/shipModels";
import galaxies from "../../../assets/data/galaxies";
import BB8 from "./BB8";
import Starfield from "./Starfield";
import { bankDegrees, cardsRect, flightDirection, placements, rollSeconds } from "./journey";
import styles from "./Timeline.module.css";

// three.js is only downloaded when the timeline is about to be seen.
const ShipViewer = lazy(() => import("./ShipViewer"));

const N = events.length;
const pad2 = (n) => String(n).padStart(2, "0");

const FLIGHT_EASE = [0.45, 0, 0.2, 1];

// How quickly the card column catches up with the scroll position (per second). The
// column follows the page smoothly instead of snapping from card to card.
const FOLLOW_RATE = 9;

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// What a card shows, richest first. A card starts at the richest level its height
// allows (see startLevel) and, if its text still doesn't fit once laid out, steps down
// the list until nothing is clipped. Titles always get up to two lines.
const WIDE_LEVELS = [
  { meta: true, lines: 3 },
  { meta: true, lines: 2 },
  { meta: true, lines: 1 },
  { meta: true, lines: 0 },
  { meta: false, lines: 0 },
];
const STACKED_LEVELS = [
  { meta: true, lines: 2 },
  { meta: false, lines: 2 },
  { meta: false, lines: 1 },
  { meta: false, lines: 0 },
];

// Where a card starts, from its height (px) with one-line titles. If a title wraps and
// the text no longer fits, the clip check below steps every card down a level.
const startLevel = (cards) => {
  const h = cards.cardH;
  if (cards.stacked) return h >= 130 ? 0 : h >= 110 ? 1 : h >= 90 ? 2 : 3;
  if (h >= 184) return 0;
  if (h >= 158) return 1;
  if (h >= 138) return 2;
  if (h >= 114) return 3;
  return 4;
};

export default function Timeline() {
  const pinRef = useRef(null);
  const innerRef = useRef(null);
  const stageRef = useRef(null);
  const headRef = useRef(null);
  const [headH, setHeadH] = useState(0);
  const reduceMotion = useReducedMotion();
  // active: the stop the scroll position is at, which BB-8 and the ship are heading
  // to. lit: where BB-8 is right now (dots light as he passes). shown: the stop he
  // last arrived at, which is what the ship builds to and what the card says.
  const [active, setActive] = useState(0);
  const [lit, setLit] = useState(0);
  const [shown, setShown] = useState(0);
  const [mountViewer, setMountViewer] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // Extra steps down the detail list that were needed to stop text being clipped.
  const [fit, setFit] = useState({ key: "", extra: 0 });
  const [fontsTick, setFontsTick] = useState(0);
  const reelRef = useRef(null);
  const thumbRef = useRef(null);
  const cardRefs = useRef([]);
  // c: which card is in the centre slot, as a fraction (2.5 = halfway from card 2 to 3).
  const reel = useRef({ cur: 0, target: 0, raf: 0, last: 0, ready: false });
  const geom = useRef({ step: 0, h: 0, cardH: 0 });

  // The stage is sized to fit under the heading, so "Timeline" stays on screen
  // while the stage is in use.
  useEffect(() => {
    const el = headRef.current;
    if (!el) return undefined;
    const measure = () => setHeadH(el.offsetHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Everything on the stage is placed in pixels, so keep the stage size.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fetch the viewer code while the browser is idle so it's ready before the
  // visitor gets here.
  useEffect(() => {
    // Phones don't show the ship at all, so they never download the 3D code.
    if (window.innerWidth < 900) return undefined;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const h = idle(() => import("./ShipViewer"));
    return () => cancel(h);
  }, []);

  // Load the 3D viewer shortly before the section scrolls into view.
  useEffect(() => {
    const el = stageRef.current;
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
      { rootMargin: "1600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The section is a tall block with the heading + stage pinned inside it. How far
  // you have scrolled through that block decides which stop you are at.
  const pinMetrics = useCallback(() => {
    const wrap = pinRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return null;
    const navH = parseFloat(getComputedStyle(wrap).getPropertyValue("--syrus-nav-h")) || 60;
    const r = wrap.getBoundingClientRect();
    return { r, navH, span: r.height - inner.offsetHeight };
  }, []);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      const m = pinMetrics();
      if (!m || m.span <= 0) return;
      const p = Math.min(0.9999, Math.max(0, (m.navH - m.r.top) / m.span));
      setActive(Math.floor(p * N));
      // Card k sits in the centre while p*N is k + 0.5, so the column glides between
      // cards as you scroll and the centre card flips at the halfway point.
      const r = reel.current;
      r.target = Math.max(0, Math.min(N - 1, p * N - 0.5));
      if (!r.ready) {
        r.ready = true;
        r.cur = r.target;
        paintReel();
      } else {
        kickReel();
      }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- paintReel / kickReel only read refs
  }, [pinMetrics]);

  // Dots, the cards and the arrow keys all move by scrolling to that stop's spot,
  // so the timeline always agrees with where the page is.
  const goTo = useCallback(
    (index) => {
      const k = Math.max(0, Math.min(N - 1, index));
      const m = pinMetrics();
      if (!m) return;
      const top = window.scrollY + m.r.top - m.navH + ((k + 0.5) / N) * m.span;
      window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    },
    [pinMetrics, reduceMotion],
  );

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      goTo(active + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      goTo(active - 1);
    }
  };

  // The ship flies as long as BB-8 takes to roll.
  const arrived = shown === active;
  const prevActive = useRef(active);
  const flight = useRef(rollSeconds(1));
  if (prevActive.current !== active) {
    flight.current = rollSeconds(Math.abs(active - prevActive.current));
    prevActive.current = active;
  }

  const measured = size.w > 0;
  const cards = measured ? cardsRect(size.w, size.h) : null;
  const to = measured ? placements(size.w, size.h, galaxies[active].layout) : null;
  const here = measured ? placements(size.w, size.h, galaxies[shown].layout) : null;
  const anchor = to ? { x: to.star.x / size.w, y: to.star.y / size.h } : { x: 0.6, y: 0.3 };

  // The ship flies towards the next galaxy: the heading is from where the ship is now
  // to where that galaxy's star sits, and the galaxy comes in from dead ahead.
  const dir = flightDirection(
    here && { x: here.ship.x + here.ship.w / 2, y: here.ship.y + here.ship.h / 2 },
    to && to.star,
  );
  // The ship leans a little into the turn while it flies, then levels out on arrival.
  const bank = arrived ? 0 : bankDegrees(dir);
  const g = galaxies[active];

  const sizeKey = `${size.w}x${size.h}`;
  const extra = fit.key === sizeKey ? fit.extra : 0;
  const levels = cards && cards.stacked ? STACKED_LEVELS : WIDE_LEVELS;
  const levelIdx = cards ? Math.min(levels.length - 1, startLevel(cards) + extra) : 0;
  const { meta: showMeta, lines } = levels[levelIdx];

  // --- the card column --------------------------------------------------------
  // Moves in pixels through refs so scrolling never re-renders React. Every card is
  // placed by its distance d from the centre slot: full strength at d = 0, about 62%
  // at d = 1 (the card above / below), gone beyond that.
  reel.current.reduce = Boolean(reduceMotion);
  geom.current = cards
    ? { step: cards.cardH + cards.gap, h: cards.h, cardH: cards.cardH, thumb: cards.h }
    : geom.current;

  function paintReel() {
    const { step, h } = geom.current;
    const list = reelRef.current;
    if (!list || !step) return;
    const c = reel.current.cur;
    list.style.transform = `translate3d(0, ${((1 - c) * step).toFixed(2)}px, 0)`;
    cardRefs.current.forEach((el, k) => {
      if (!el) return;
      const d = Math.abs(k - c);
      // Cards two or more slots away are clipped out of sight: hide them once and
      // leave them alone, so a scroll only restyles the three cards you can see.
      if (d >= 2) {
        if (el.dataset.far !== "1") {
          el.dataset.far = "1";
          el.style.opacity = "0";
        }
        return;
      }
      if (el.dataset.far === "1") delete el.dataset.far;
      const near = clamp01(1 - d); // 1 in the centre, 0 a full card away
      el.style.opacity = (1 - 0.38 * Math.min(d, 1) - 0.62 * clamp01(d - 1)).toFixed(3);
      el.style.transform = `scale(${(1 - 0.045 * (1 - near)).toFixed(4)})`;
    });
    const thumb = thumbRef.current;
    if (thumb) {
      const size = Math.max(24, h * (3 / N));
      thumb.style.height = `${size}px`;
      thumb.style.transform = `translateY(${((h - size) * (c / (N - 1))).toFixed(2)}px)`;
    }
  }

  function kickReel() {
    const r = reel.current;
    if (r.raf) return;
    if (r.reduce) {
      r.cur = r.target;
      paintReel();
      return;
    }
    r.last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.12, (now - r.last) / 1000);
      r.last = now;
      r.cur += (r.target - r.cur) * (1 - Math.exp(-FOLLOW_RATE * dt));
      if (Math.abs(r.target - r.cur) < 0.0008) r.cur = r.target;
      paintReel();
      r.raf = r.cur === r.target ? 0 : requestAnimationFrame(tick);
    };
    r.raf = requestAnimationFrame(tick);
  }

  // Re-place the cards when the stage is measured or resized (before the browser paints).
  useLayoutEffect(() => {
    paintReel();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paintReel only reads refs
  }, [cards && cards.cardH, cards && cards.gap, cards && cards.h]);

  useEffect(() => () => cancelAnimationFrame(reel.current.raf), []);

  // The web font arrives after the first layout and changes how text wraps.
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => live && setFontsTick((n) => n + 1));
    return () => {
      live = false;
    };
  }, []);

  // Safety net: if any card's text is taller than the card, show a little less
  // (drop the description lines, then the top row) rather than cut a title off.
  useLayoutEffect(() => {
    if (!cards || levelIdx >= levels.length - 1) return;
    const clipped = cardRefs.current.some((el) => {
      const inner = el && el.firstElementChild;
      return inner && inner.scrollHeight > inner.clientHeight + 1;
    });
    if (clipped) setFit({ key: sizeKey, extra: extra + 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-measure on size / level / font changes
  }, [sizeKey, cards && cards.cardH, levelIdx, fontsTick]);

  return (
    <section
      id="timeline"
      className={styles.section}
      style={{ "--n": N, "--head-h": `${headH}px` }}
      aria-labelledby="timeline-title"
    >
      <div ref={pinRef} className={styles.pinWrap}>
        <div ref={innerRef} className={styles.pinInner}>
          <div ref={headRef} className={`syrus-container ${styles.head}`}>
            <SectionHeading id="timeline-title">timeline</SectionHeading>
          </div>

          <div className={styles.track}>
            {!cards ? null : cards.stacked ? (
              // Phones get a still glow instead of the animated galaxy canvas: that canvas was
              // the main cause of lag on weaker devices.
              <div
                key={active}
                className={styles.glow}
                aria-hidden="true"
                style={{ "--g": g.rgb, "--gx": `${to.star.x}px`, "--gy": `${to.star.y}px` }}
              />
            ) : (
              <Starfield
                rgb={g.rgb}
                rgb2={g.rgb2}
                shape={g.shape}
                index={active}
                anchor={anchor}
                dir={dir}
              />
            )}
            <div
              ref={stageRef}
              className={styles.stage}
              tabIndex={0}
              onKeyDown={onKeyDown}
              aria-label="Timeline. Scroll or use the arrow keys to move between events."
            >
              {measured && !cards.stacked && (
                <motion.div
                  className={styles.ship}
                  initial={false}
                  animate={{ x: to.ship.x, y: to.ship.y, rotate: reduceMotion ? 0 : bank }}
                  transition={
                    reduceMotion ? { duration: 0 } : { duration: flight.current, ease: FLIGHT_EASE }
                  }
                  style={{ width: to.ship.w, height: to.ship.h }}
                >
                  {mountViewer && (
                    <Suspense fallback={null}>
                      <ShipViewer
                        steps={shipModels}
                        index={shown}
                        heading={dir}
                        galaxy={{ number: shown + 1, name: galaxies[shown].name }}
                      />
                    </Suspense>
                  )}
                </motion.div>
              )}

              {cards && (
                <div
                  className={styles.cards}
                  style={{ left: cards.x, top: cards.y, width: cards.w, height: cards.h }}
                >
                  <div className={styles.window}>
                    <ol
                      ref={reelRef}
                      className={styles.reel}
                      style={{ gap: cards.gap }}
                      aria-label="Event schedule"
                    >
                      {events.map((ev, k) => (
                        <li key={`${ev.date}-${ev.title}`} style={{ height: cards.cardH }}>
                          <button
                            type="button"
                            ref={(el) => {
                              cardRefs.current[k] = el;
                            }}
                            className={`syrus-panel ${styles.card} ${
                              k === active ? styles.cardActive : ""
                            }`}
                            style={{ "--lines": lines }}
                            tabIndex={Math.abs(k - active) <= 1 ? 0 : -1}
                            onClick={() => goTo(k)}
                            aria-current={k === active ? "step" : undefined}
                          >
                            <span className={styles.cardInner}>
                              {showMeta && (
                                <span className={styles.meta}>
                                  <span className={styles.phase}>{ev.phase}</span>
                                  <span className={styles.step}>
                                    {pad2(k + 1)} / {pad2(N)}
                                  </span>
                                </span>
                              )}
                              <span className={styles.when}>
                                <span className={styles.date}>{ev.date}</span>
                                {ev.time && <span className={styles.time}>{ev.time}</span>}
                              </span>
                              <span className={styles.title}>{ev.title}</span>
                              {lines > 0 && <span className={styles.desc}>{ev.description}</span>}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className={styles.thumbTrack} aria-hidden="true">
                    <span ref={thumbRef} className={styles.thumb} />
                  </div>
                </div>
              )}

              <div className={styles.bottom}>
                <nav className={styles.railWrap} aria-label="Timeline stops">
                  <div className={styles.railInner}>
                    <BB8 count={N} index={active} onStep={setLit} onArrive={setShown} />
                    <ol className={styles.rail}>
                      {events.map((e, k) => (
                        <li
                          key={`${e.date}-${e.title}`}
                          className={`${styles.stop} ${k < lit ? styles.stopDone : ""} ${
                            k === lit ? styles.stopActive : ""
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
                  </div>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
