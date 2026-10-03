/**
 * Calmer scrolling for the Syrus intro.
 *
 * The intro is a long scroll-driven sequence, and a hard flick of the wheel or
 * trackpad would rush through all of it in a blink. While the page is inside
 * the intro this smoother takes over the wheel and:
 *
 *  - passes normal scrolling through 1:1, only adding a soft ease so it glides;
 *  - when the visitor scrolls rapidly, keeps only part of the extra distance,
 *    so the page travels a little slower than the wheel asked for.
 *
 * Nothing plays by itself: the page only ever moves in response to the wheel.
 *
 * Outside the intro, and for touch, keyboard and scrollbar input, scrolling is
 * left completely native. `prefers-reduced-motion` disables the smoother.
 */

/* ---- tuning ---------------------------------------------------------- */
const EASE_RATE = 9; // how fast the page catches up with the wheel (1/s, higher = snappier)
const SPEED_WINDOW_MS = 100; // look-back window for wheel speed
const NORMAL_SPEED = 1500; // px/s: up to here the wheel is followed 1:1
const RAPID_SPEED = 5000; // px/s: from here the full slow-down applies
const RAPID_GAIN = 0.45; // share of the wheel distance kept at RAPID_SPEED and above
const EXTERNAL_SCROLL_PX = 2; // page moved this far without us: someone else is scrolling
const LISTEN_MARGIN = 1; // keep listening this many viewports past the hero

const smoothstep = (t) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** 1 for normal scrolling, easing down to RAPID_GAIN as the wheel gets faster. */
const gainForSpeed = (pxPerSecond) =>
  1 - (1 - RAPID_GAIN) * smoothstep((pxPerSecond - NORMAL_SPEED) / (RAPID_SPEED - NORMAL_SPEED));

/** Wheel distance in px, whatever unit the device reports. */
function wheelPixels(e) {
  if (e.deltaMode === 1) return e.deltaY * 16; // lines
  if (e.deltaMode === 2) return e.deltaY * window.innerHeight; // pages
  return e.deltaY;
}

const isScrollLocked = () =>
  [document.documentElement, document.body].some(
    (el) => getComputedStyle(el).overflowY === "hidden",
  );

/** True when the wheel is over something with its own scrolling (menu, modal…). */
function overInnerScroller(target) {
  for (let el = target; el && el !== document.body; el = el.parentElement) {
    if (!(el instanceof HTMLElement)) continue;
    const { overflowY } = getComputedStyle(el);
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
      return true;
    }
  }
  return false;
}

/**
 * @param {object} options
 * @param {() => {top:number, span:number}} options.getSpan
 *        Page Y where the intro starts and how many px it scrolls for.
 * @returns {{ destroy: () => void }}
 */
export function createIntroWheelSmoother({ getSpan }) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return { destroy() {} };
  }

  let target = 0; // where the wheel wants the page to be
  let pos = 0; // where the smoother has put it
  let lastSet = 0; // the last position we wrote, to notice outside scrolling
  let raf = 0;
  let last = 0;
  let samples = [];
  let wheelAttached = false;

  const heroY = () => {
    const { top, span } = getSpan();
    return top + span;
  };

  /* ---- easing loop ---------------------------------------------------- */
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  function frame(now) {
    raf = 0;
    if (Math.abs(window.scrollY - lastSet) > EXTERNAL_SCROLL_PX) return; // someone else took over

    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    pos += (target - pos) * (1 - Math.exp(-dt * EASE_RATE));
    if (Math.abs(target - pos) < 0.5) pos = target;

    lastSet = pos;
    window.scrollTo({ top: pos, left: 0, behavior: "instant" });
    if (pos !== target) raf = requestAnimationFrame(frame);
  }

  /* ---- wheel ---------------------------------------------------------- */
  function onWheel(e) {
    if (e.ctrlKey) return; // pinch-zoom
    const dy = wheelPixels(e);
    if (!dy || isScrollLocked() || overInnerScroller(e.target)) return;

    const y = raf ? pos : window.scrollY;
    const end = heroY();
    const insideIntro = dy > 0 ? y < end - 0.5 : y > 0.5 && y <= end + 0.5;
    if (!insideIntro) return; // top, or past the hero: native scrolling

    // How fast is the visitor scrolling right now?
    const now = e.timeStamp;
    samples.push({ at: now, px: Math.abs(dy) });
    samples = samples.filter((s) => now - s.at <= SPEED_WINDOW_MS);
    const speed = samples.reduce((sum, s) => sum + s.px, 0) / (SPEED_WINDOW_MS / 1000);

    e.preventDefault();
    if (!raf) {
      pos = window.scrollY;
      target = pos;
      lastSet = pos;
      last = performance.now();
    }
    target = Math.min(end, Math.max(0, target + dy * gainForSpeed(speed)));
    if (!raf) raf = requestAnimationFrame(frame);
  }

  /* ---- other input takes over immediately ----------------------------- */
  const onUserTakeover = () => stop();

  /* ---- only listen (non-passively) while the intro is on screen ------- */
  function syncWheelListener() {
    const { top, span } = getSpan();
    const near = window.scrollY < top + span + window.innerHeight * LISTEN_MARGIN;
    if (near === wheelAttached) return;
    wheelAttached = near;
    if (near) window.addEventListener("wheel", onWheel, { passive: false });
    else window.removeEventListener("wheel", onWheel);
  }

  syncWheelListener();
  window.addEventListener("scroll", syncWheelListener, { passive: true });
  window.addEventListener("resize", syncWheelListener);
  window.addEventListener("touchstart", onUserTakeover, { passive: true });
  window.addEventListener("mousedown", onUserTakeover);
  window.addEventListener("keydown", onUserTakeover);

  return {
    destroy() {
      stop();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", syncWheelListener);
      window.removeEventListener("resize", syncWheelListener);
      window.removeEventListener("touchstart", onUserTakeover);
      window.removeEventListener("mousedown", onUserTakeover);
      window.removeEventListener("keydown", onUserTakeover);
    },
  };
}
