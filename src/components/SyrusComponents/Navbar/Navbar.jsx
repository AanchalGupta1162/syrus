import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import ActionButtons from "../ActionButtons/ActionButtons";
import { CloseIcon } from "../icons";
import { scrollToHero } from "../syrusConfig";
import styles from "./Navbar.module.css";

const MENU_ITEMS = [
  { id: "sponsors", label: "Sponsors" },
  { id: "prizepool", label: "Prize Pool" },
  { id: "timeline", label: "Timeline" },
  { id: "tracks", label: "Domain" },
  { id: "faq-section", label: "FAQs" },
  { id: "gallery", label: "Gallery" },
];

const STAR_COUNT = 220;

/** Hyperspace star-streak canvas: streaks on open, then settles to a slow drift. */
function Hyperspace({ open }) {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    if (!open || !cv) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const ctx = cv.getContext("2d");
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      a: Math.random() * Math.PI * 2,
      r: Math.random(),
      c: Math.random() < 0.2,
    }));
    let raf;
    let last = performance.now();
    let k = 0;
    const t0 = last;

    const draw = (now) => {
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      if (cv.width !== Math.round(w * dpr)) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const t = now - t0;
      const dt = Math.min(50, now - last);
      last = now;
      const target =
        t < 650 ? Math.sin((t / 650) * (Math.PI / 2)) : Math.max(0.02, Math.exp(-(t - 650) / 260));
      k += (target - k) * 0.3;
      const cx = w / 2;
      const cy = h * 0.45;
      const R = Math.hypot(w, h) / 2;
      stars.forEach((st) => {
        st.r += (0.00004 + k * 0.0022) * dt * (0.3 + st.r);
        if (st.r > 1) {
          st.r = 0.02 + Math.random() * 0.1;
          st.a = Math.random() * Math.PI * 2;
        }
        const r1 = st.r * R;
        const r0 = Math.max(0, r1 - (1 + k * 180 * st.r));
        const ca = Math.cos(st.a);
        const sa = Math.sin(st.a);
        ctx.strokeStyle = st.c
          ? `rgba(95,212,240,${0.25 + 0.5 * st.r})`
          : `rgba(232,226,208,${0.2 + 0.5 * st.r})`;
        ctx.lineWidth = 0.6 + st.r * 1.2;
        ctx.beginPath();
        ctx.moveTo(cx + ca * r0, cy + sa * r0);
        ctx.lineTo(cx + ca * (r1 + 0.6), cy + sa * (r1 + 0.6));
        ctx.stroke();
      });
      if (t < 900) {
        const f = Math.max(0, 1 - t / 900);
        ctx.fillStyle = `rgba(232,240,255,${0.25 * f * f})`;
        ctx.fillRect(0, 0, w, h);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  return <canvas ref={ref} className={styles.hyperspace} aria-hidden="true" />;
}

/* ---- Saber dial ---------------------------------------------------- */

const DIAL_DESKTOP = {
  angles: [-44, -26, -9, 9, 26, 44],
  hilt: [[-78, 8, 10], [-70, 62, 14], [-60, 32, 14], [-10, 10, 18]],
  bladeLen: 290,
  tick: [304, 12],
  rowH: 100,
};
const DIAL_MOBILE = {
  angles: [-60, -36, -12, 12, 36, 60],
  hilt: [[-50, 6, 8], [-44, 38, 12], [-36, 20, 12], [-8, 8, 16]],
  bladeLen: 100,
  tick: [108, 9],
  rowH: 48,
};

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

/** Pivot, radius and scale of the dial for a given stage size. */
function dialGeometry(w, h) {
  if (w < 720) {
    const k = clamp(w / 375, 0.8, 1.25);
    return { mobile: true, k, px: w * 0.155, py: h * 0.46, R: 124 * k, ...DIAL_MOBILE };
  }
  const k = clamp(Math.min(w / 1280, h / 576), 0.62, 1);
  return { mobile: false, k, px: w * 0.125, py: h * 0.5, R: 330 * k, ...DIAL_DESKTOP };
}

const SPIN_MS = 1150; // pick -> menu closed
const RETRACT_MS = 760; // pick -> blade switches off

/**
 * - The menu button is visible from the hero onwards.
 * - The full bar (logo + buttons) appears once the Sponsors section arrives.
 */
export default function Navbar({ onCallMentor }) {
  const [showBar, setShowBar] = useState(false);
  const [showMenuBtn, setShowMenuBtn] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(null);
  const [phase, setPhase] = useState("off"); // off | pre | ign | sweep | rest
  const [picking, setPicking] = useState(false);
  const [retract, setRetract] = useState(false);
  const [spin, setSpin] = useState(0);
  const [tipOn, setTipOn] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const stageRef = useRef(null);
  const timers = useRef([]);
  const leaveTimer = useRef(null);
  const menuBtnRef = useRef(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    let ticking = false;

    const update = () => {
      ticking = false;
      const vh = window.innerHeight;
      const intro = document.getElementById("intro");
      const sponsors = document.getElementById("sponsors");
      if (intro) {
        const r = intro.getBoundingClientRect();
        const progress = -r.top / Math.max(1, r.height - vh);
        setShowMenuBtn(progress > 0.9);
      }
      if (sponsors) {
        setShowBar(sponsors.getBoundingClientRect().top < vh * 0.55);
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
  }, []);

  const later = (ms, fn) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    clearTimeout(leaveTimer.current);
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const openMenu = () => {
    // Rest the flare on the section currently nearest the top of the viewport.
    let best = 0;
    let bestDist = Infinity;
    MENU_ITEMS.forEach((item, i) => {
      const el = document.getElementById(item.id);
      if (!el) return;
      const d = Math.abs(el.getBoundingClientRect().top);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActive(best);
    setHovered(null);
    setPicking(false);
    setRetract(false);
    clearTimers();
    setOpen(true);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("rest");
      return;
    }
    // Saber powers up at the top, sweeps down revealing each link, swings back.
    setPhase("pre");
    later(380, () => {
      setPhase("ign");
      setTipOn(true);
    });
    later(900, () => {
      setPhase("sweep");
      setTipOn(false);
    });
    later(1850, () => setPhase("rest"));
  };

  const closeMenu = useCallback(() => {
    clearTimers();
    setPhase("off");
    setPicking(false);
    setRetract(false);
    setOpen(false);
    setHovered(null);
    menuBtnRef.current?.focus({ preventScroll: true });
  }, [clearTimers]);

  // Lock page scroll and handle Esc while the menu is open.
  useEffect(() => {
    if (!open) return undefined;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    closeBtnRef.current?.focus({ preventScroll: true });

    const onKey = (e) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, closeMenu]);

  const scrollTo = (id) => {
    // Let the scroll lock release before scrolling.
    window.setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }, 80);
  };

  // The saber spins a full turn, switches off, then the menu closes and we scroll.
  const pick = (id, i) => {
    if (picking) return;
    clearTimeout(leaveTimer.current);
    setActive(i);
    setHovered(null);
    setPicking(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      later(120, () => {
        closeMenu();
        scrollTo(id);
      });
      return;
    }
    setSpin((v) => v + 360);
    later(RETRACT_MS, () => setRetract(true));
    later(SPIN_MS, () => {
      closeMenu();
      scrollTo(id);
    });
  };

  const hoverIn = (i) => {
    clearTimeout(leaveTimer.current);
    if (phase === "rest" && !picking) setHovered(i);
  };
  const hoverOut = () => {
    clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => setHovered(null), 140);
  };

  // Dial geometry + animation state
  const geo = dialGeometry(size.w, size.h);
  const { k, px, py, R, angles, bladeLen } = geo;
  const lit = open && (phase === "ign" || phase === "sweep" || phase === "rest") && !retract;
  const shown = lit && (phase === "sweep" || phase === "rest");
  const idx = phase === "rest" ? (geo.mobile ? active : hovered ?? active) : -1;
  const angle =
    (phase === "sweep" ? angles[5] : phase === "rest" ? angles[idx] : angles[0]) + spin;
  const rotT = (extra) =>
    phase === "sweep"
      ? `transform ${0.9 + extra}s cubic-bezier(.45,0,.55,1)`
      : phase === "rest"
        ? picking
          ? `transform ${0.72 + extra}s cubic-bezier(.6,0,.3,1)`
          : `transform ${0.55 + extra}s cubic-bezier(0.34,1.4,0.64,1)`
        : "none";
  const rot = `rotate(${angle}deg)`;
  const L = bladeLen * k;
  const clipOn = lit ? "inset(-40px -40px -40px -40px)" : "inset(-40px 100% -40px -40px)";
  const clipT = lit
    ? "clip-path .5s cubic-bezier(0.16,1,0.3,1)"
    : "clip-path .32s cubic-bezier(0.7,0,0.84,0)";
  const rowDelay = (i) => (phase === "sweep" ? `${120 + i * 150}ms` : "0ms");
  const [tickR, tickL] = geo.tick;

  return (
    <>
      <header className={`${styles.bar} ${showBar ? styles.barOn : ""}`}>
        <div className={styles.inner}>
          <button
            type="button"
            className={styles.logo}
            onClick={scrollToHero}
            aria-label="Syrus 7.0, back to the start"
            tabIndex={showBar ? 0 : -1}
          >
            syrus
          </button>
          <div
            className={styles.actions}
            {...(!showBar ? { inert: "" } : {})}
          >
            <ActionButtons onCallMentor={onCallMentor} compact />
          </div>
        </div>
      </header>

      <button
        ref={menuBtnRef}
        type="button"
        className={`syrus-btn syrus-btn--ghost ${styles.menuBtn} ${showMenuBtn ? styles.menuBtnOn : ""}`}
        onClick={openMenu}
        aria-expanded={open}
        aria-controls="syrus-menu"
        aria-label="Open menu"
        tabIndex={showMenuBtn ? 0 : -1}
      >
        <span className={styles.burger} aria-hidden="true">
          <span />
          <span className={styles.burgerMid} />
          <span />
        </span>
        <span className={styles.menuLabel}>Menu</span>
      </button>

      <div
        id="syrus-menu"
        className={`${styles.overlay} ${open ? styles.overlayOpen : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        aria-hidden={!open}
        {...(!open ? { inert: "" } : {})}
      >
        <Hyperspace open={open} />
        <div className={styles.overlayTop}>
          <span className={styles.overlayTitle}>syrus 7.0</span>
          <div className={styles.overlayActions}>
            <ActionButtons onCallMentor={onCallMentor} compact />
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className={`syrus-btn syrus-btn--ghost ${styles.menuBtn} ${styles.closeBtn}`}
            onClick={closeMenu}
            aria-label="Close menu"
          >
            <CloseIcon className={styles.menuIcon} />
            <span className={styles.menuLabel}>Close</span>
          </button>
        </div>

        <div ref={stageRef} className={styles.stage}>
          {angles.map((a, i) => (
            <span
              key={a}
              className={styles.pivot}
              style={{ left: px, top: py, transform: `rotate(${a}deg)` }}
              aria-hidden="true"
            >
              <span
                className={styles.tick}
                style={{
                  left: tickR * k,
                  width: tickL * k,
                  background: i === idx ? "var(--syrus-yellow)" : "rgba(232,226,208,0.3)",
                  boxShadow: i === idx ? "0 0 8px 1px rgba(255,232,31,0.7)" : "none",
                  opacity: shown ? 1 : 0,
                  transitionDelay: rowDelay(i),
                }}
              />
            </span>
          ))}

          <span
            className={styles.pivot}
            style={{ left: px, top: py, transform: rot, transition: rotT(0.24), opacity: lit ? 0.12 : 0 }}
            aria-hidden="true"
          >
            <span
              className={`${styles.glow} ${styles.glowWide}`}
              style={{ width: L, clipPath: clipOn, transition: clipT }}
            />
          </span>
          <span
            className={styles.pivot}
            style={{ left: px, top: py, transform: rot, transition: rotT(0.1), opacity: lit ? 0.32 : 0 }}
            aria-hidden="true"
          >
            <span
              className={`${styles.glow} ${styles.glowTight}`}
              style={{ width: L, clipPath: clipOn, transition: clipT }}
            />
          </span>

          <span
            className={styles.pivot}
            style={{ left: px, top: py, transform: rot, transition: rotT(0) }}
            aria-hidden="true"
          >
            {geo.hilt.map(([x, w, h], n) => (
              <span
                key={n}
                className={`${styles.hiltPart} ${styles[`hilt${n}`]}`}
                style={{ left: x * k, top: (-h / 2) * k, width: w * k, height: h * k }}
              />
            ))}
            <span
              className={styles.core}
              style={{ width: L, clipPath: clipOn, transition: clipT }}
            />
            <span
              className={styles.tip}
              style={{
                left: (lit ? L : 0) - 12 * k,
                width: 24 * k,
                height: 24 * k,
                top: -12 * k,
                opacity: tipOn && lit ? 1 : 0,
                transition: lit
                  ? "left .5s cubic-bezier(0.16,1,0.3,1), opacity .3s"
                  : "left .32s cubic-bezier(0.7,0,0.84,0), opacity .2s",
              }}
            />
          </span>

          <nav className={styles.nav} aria-label="Sections">
            {MENU_ITEMS.map((item, i) => {
              const a = (angles[i] * Math.PI) / 180;
              const hi = i === idx;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.item} ${hi ? styles.itemOn : ""}`}
                  style={{
                    left: px + R * Math.cos(a),
                    top: py + R * Math.sin(a),
                    height: geo.rowH * k,
                    marginTop: (-geo.rowH * k) / 2,
                    opacity: shown ? 1 : 0,
                    transform: shown
                      ? hi && !geo.mobile && hovered === i
                        ? "translateX(8px)"
                        : "none"
                      : "translateX(-12px)",
                    transitionDelay: rowDelay(i),
                    pointerEvents: shown ? "auto" : "none",
                    "--k": k,
                  }}
                  tabIndex={shown ? 0 : -1}
                  onMouseEnter={() => hoverIn(i)}
                  onMouseLeave={hoverOut}
                  onFocus={() => hoverIn(i)}
                  onClick={() => pick(item.id, i)}
                >
                  <span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={styles.itemLabel}>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className={`${styles.cta} ${shown ? styles.ctaOn : ""}`}>
          <ActionButtons onCallMentor={onCallMentor} />
        </div>
      </div>
    </>
  );
}
