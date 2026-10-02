import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import SectionHeading from "../SectionHeading/SectionHeading";
import events from "../../../assets/data/timelineEvents";
import shipModels from "../../../assets/data/shipModels";
import galaxies from "../../../assets/data/galaxies";
import BB8 from "./BB8";
import Starfield from "./Starfield";
import { bankDegrees, flightDirection, panelRect, placements, rollSeconds } from "./journey";
import styles from "./Timeline.module.css";

// three.js is only downloaded when the timeline is about to be seen.
const ShipViewer = lazy(() => import("./ShipViewer"));

const N = events.length;
const pad2 = (n) => String(n).padStart(2, "0");

// How long BB-8 waits at a stop (after the ship has built) before rolling on.
const DWELL_MS = 2300;

const FLIGHT_EASE = [0.45, 0, 0.2, 1];

// Hovering a date in the schedule panel jumps there after this short pause, so
// sweeping the mouse across the list doesn't fire every stop on the way.
const HOVER_INTENT_MS = 120;

// The schedule panel lists the stops under their phase headings.
const SCHEDULE = events.reduce((groups, ev, index) => {
  const last = groups[groups.length - 1];
  if (last && last.phase === ev.phase) last.items.push({ ev, index });
  else groups.push({ phase: ev.phase, items: [{ ev, index }] });
  return groups;
}, []);

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Timeline() {
  const stageRef = useRef(null);
  const headRef = useRef(null);
  const [headH, setHeadH] = useState(0);
  const reduceMotion = useReducedMotion();
  // active: the stop BB-8 and the ship are heading to. lit: where BB-8 is right now
  // (dots light as he passes). shown: the stop he last arrived at, which is what
  // the ship builds to and what the card says.
  const [active, setActive] = useState(0);
  const [lit, setLit] = useState(0);
  const [shown, setShown] = useState(0);
  const [mountViewer, setMountViewer] = useState(false);
  const [inView, setInView] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hovering, setHovering] = useState(false);
  const hoverTimer = useRef(0);
  // Autoplay runs on its own; people who asked their system for less motion get no
  // autoplay and move with the schedule, the dots or the arrow keys instead.
  const playing = !prefersReducedMotion();

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
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const h = idle(() => import("./ShipViewer"));
    return () => cancel(h);
  }, []);

  // Load the 3D viewer shortly before the section scrolls into view, and only
  // autoplay while the stage is actually on screen.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    if (!("IntersectionObserver" in window)) {
      setMountViewer(true);
      setInView(true);
      return undefined;
    }
    const preload = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMountViewer(true);
          preload.disconnect();
        }
      },
      { rootMargin: "1600px 0px" },
    );
    const visible = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.35,
    });
    preload.observe(el);
    visible.observe(el);
    return () => {
      preload.disconnect();
      visible.disconnect();
    };
  }, []);

  const goTo = useCallback((index) => setActive(((index % N) + N) % N), []);

  useEffect(() => () => clearTimeout(hoverTimer.current), []);
  // Mouse only: touch has no hover, a tap on the row jumps via onClick.
  const hoverStop = (k, e) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => goTo(k), HOVER_INTENT_MS);
  };
  const leaveSchedule = () => {
    clearTimeout(hoverTimer.current);
    setHovering(false);
  };

  // Autoplay: once BB-8 has arrived and the ship has built, wait, then roll on.
  // Any manual move changes `active`, so the wait only starts once he arrives.
  const arrived = shown === active;
  // Autoplay holds still while the mouse is over the schedule, so it never moves on mid-read.
  const autoplaying = playing && inView && !hovering;
  useEffect(() => {
    if (!autoplaying || !arrived) return undefined;
    const t = setTimeout(() => setActive((i) => (i + 1) % N), DWELL_MS);
    return () => clearTimeout(t);
  }, [autoplaying, arrived, shown]);

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

  // The ship flies as long as BB-8 takes to roll.
  const prevActive = useRef(active);
  const flight = useRef(rollSeconds(1));
  if (prevActive.current !== active) {
    flight.current = rollSeconds(Math.abs(active - prevActive.current));
    prevActive.current = active;
  }

  const measured = size.w > 0;
  const panel = measured ? panelRect(size.w, size.h) : null;
  const to = measured ? placements(size.w, size.h, galaxies[active].layout) : null;
  const here = measured ? placements(size.w, size.h, galaxies[shown].layout) : null;
  const anchor = to ? { x: to.star.x / size.w, y: to.star.y / size.h } : { x: 0.6, y: 0.3 };

  // Which way the ship is flying for this move: the next galaxy comes in from there.
  const dir = flightDirection(
    here && { x: here.ship.x + here.ship.w / 2, y: here.ship.y + here.ship.h / 2 },
    to && { x: to.ship.x + to.ship.w / 2, y: to.ship.y + to.ship.h / 2 },
  );
  // The ship leans a little into the turn while it flies, then levels out on arrival.
  const bank = arrived ? 0 : bankDegrees(dir);
  const g = galaxies[active];
  const ev = events[shown];
  const isTBA = ev.date === "TBA";

  return (
    <section
      id="timeline"
      className={styles.section}
      style={{ "--n": N, "--head-h": `${headH}px` }}
      aria-labelledby="timeline-title"
    >
      <div className={styles.pinWrap}>
      <div className={styles.pinInner}>
      <div ref={headRef} className={`syrus-container ${styles.head}`}>
        <SectionHeading id="timeline-title">timeline</SectionHeading>
      </div>

      <div className={styles.track}>
        <Starfield
          rgb={g.rgb}
          rgb2={g.rgb2}
          shape={g.shape}
          index={active}
          anchor={anchor}
          dir={dir}
        />
        <div
          ref={stageRef}
          className={styles.stage}
          tabIndex={0}
          onKeyDown={onKeyDown}
          aria-label="Timeline. Use the arrow keys to move between events."
        >
          {panel && (
            <nav
              className={styles.schedule}
              aria-label="Schedule"
              data-dense={panel.h < 440}
              style={{ left: panel.x, top: panel.y, width: panel.w, height: panel.h }}
              onPointerEnter={(e) => e.pointerType === "mouse" && setHovering(true)}
              onPointerLeave={leaveSchedule}
            >
              {SCHEDULE.map((group) => (
                <div key={group.phase} className={styles.group}>
                  <div className={styles.groupLabel}>{group.phase}</div>
                  {group.items.map(({ ev: item, index }) => (
                    <button
                      key={item.title}
                      type="button"
                      className={`${styles.row} ${index < active ? styles.rowDone : ""} ${
                        index === active ? styles.rowActive : ""
                      }`}
                      onPointerEnter={(e) => hoverStop(index, e)}
                      onClick={() => goTo(index)}
                      aria-current={index === active ? "step" : undefined}
                      aria-label={`${item.date}, ${item.title}`}
                    >
                      <span className={`${styles.rowDate} ${item.date === "TBA" ? styles.tba : ""}`}>
                        {item.date}
                      </span>
                      <span className={styles.rowTitle}>{item.title}</span>
                    </button>
                  ))}
                </div>
              ))}
            </nav>
          )}

          {measured && (
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
                    galaxy={{ number: shown + 1, name: galaxies[shown].name }}
                  />
                </Suspense>
              )}
            </motion.div>
          )}

          {measured && (
            <div
              className={styles.cardPos}
              style={
                // The card is as tall as its text. Wide stages centre it on the galaxy;
                // narrow ones sit it on the bottom bar and let it grow upwards.
                panel
                  ? {
                      left: here.card.x,
                      top: here.card.y + here.card.h / 2,
                      width: here.card.w,
                      transform: "translateY(-50%)",
                    }
                  : {
                      left: here.card.x,
                      bottom: size.h - (here.card.y + here.card.h),
                      width: here.card.w,
                    }
              }
            >
              <motion.div
                className={`syrus-panel ${styles.card}`}
                initial={false}
                animate={{ opacity: arrived ? 1 : 0, y: arrived ? 0 : 12 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: arrived ? 0.45 : 0.2, delay: arrived ? 0.15 : 0 }
                }
                style={{ pointerEvents: arrived ? "auto" : "none" }}
                aria-hidden={!arrived}
                aria-live={playing ? "off" : "polite"}
              >
                <div className={styles.cardInner}>
                  <div key={`meta-${shown}`} className={`${styles.meta} ${styles.reveal}`}>
                    <span className={styles.phase}>{ev.phase}</span>
                    <span className={styles.step}>
                      Stop {pad2(shown + 1)} / {pad2(N)}
                    </span>
                  </div>
                  <div
                    key={`date-${shown}`}
                    className={`${styles.date} ${styles.reveal} ${isTBA ? styles.tba : ""}`}
                    style={{ "--d": "70ms" }}
                  >
                    {ev.date}
                  </div>
                  <h3
                    key={`title-${shown}`}
                    className={`${styles.title} ${styles.reveal}`}
                    style={{ "--d": "150ms" }}
                  >
                    {ev.title}
                  </h3>
                  {ev.description && (
                    <p
                      key={`desc-${shown}`}
                      className={`${styles.desc} ${styles.reveal}`}
                      style={{ "--d": "230ms" }}
                    >
                      {ev.description}
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          <div className={styles.bottom}>
            <nav className={styles.railWrap} aria-label="Timeline stops">
              <div className={styles.railInner}>
                <BB8 count={N} index={active} onStep={setLit} onArrive={setShown} />
                <ol className={styles.rail}>
                  {events.map((e, k) => (
                    <li
                      key={e.title}
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
