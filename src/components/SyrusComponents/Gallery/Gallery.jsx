import { useCallback, useEffect, useRef, useState } from "react";
import SectionHeading from "../SectionHeading/SectionHeading";
import { ArrowIcon } from "../icons";
import GalleryLightbox from "./GalleryLightbox";
import styles from "./Gallery.module.css";

/** Time between automatic slides. */
const AUTOPLAY_MS = 3000;

const edition = (year, numbers) =>
  numbers.map((n) => ({
    src: `/Gallery/Syrus_${year}/Gallery_${n}.webp`,
    alt: `Syrus '${year} hackathon photo ${n}`,
  }));

/** Newest edition first. To add photos, drop them in public/Gallery/Syrus_XX. */
const IMAGES = [
  ...edition(26, [1, 2, 3, 4, 5, 6, 7, 8, 9]),
  ...edition(25, [1, 2, 3, 4, 5, 6, 7, 8, 9]),
  ...edition(24, [3, 8, 10, 12, 13, 14]),
];

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ExpandIcon = (props) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M9.5 2H14v4.5M6.5 14H2V9.5M14 2L9 7M2 14l5-5" />
  </svg>
);

/**
 * Native scroll-snap carousel.
 *  - Moves on by one photo every AUTOPLAY_MS and wraps back to the start.
 *    It waits while a mouse is over the photos, a finger is on them, the
 *    keyboard is on them, a photo is open, the section is off screen or the
 *    tab is hidden. It never runs with "reduce motion" turned on.
 *  - Clicking a photo opens it large in GalleryLightbox.
 */
export default function Gallery() {
  const frameRef = useRef(null);
  const trackRef = useRef(null);
  const pauseReasons = useRef(new Set());
  const [edge, setEdge] = useState({ start: true, end: false });
  const [openIndex, setOpenIndex] = useState(null);
  // Bumped after any manual move so the next automatic slide is a full interval away.
  const [restartKey, setRestartKey] = useState(0);
  const restart = useCallback(() => setRestartKey((k) => k + 1), []);

  const updateEdge = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const start = el.scrollLeft <= 4;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setEdge((prev) =>
      prev.start === start && prev.end === end ? prev : { start, end },
    );
  }, []);

  useEffect(() => {
    updateEdge();
    window.addEventListener("resize", updateEdge);
    return () => window.removeEventListener("resize", updateEdge);
  }, [updateEdge]);

  // Reasons the carousel must not auto-advance. When the last one clears, the
  // timer restarts, so the first slide always comes a full AUTOPLAY_MS after
  // the carousel became active again (e.g. when the section scrolls into view).
  const setPaused = useCallback(
    (reason, on) => {
      const reasons = pauseReasons.current;
      if (on) {
        reasons.add(reason);
      } else if (reasons.delete(reason) && reasons.size === 0) {
        restart();
      }
    },
    [restart],
  );

  // --- Autoplay -----------------------------------------------------------
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;

    const advance = () => {
      const el = trackRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      // One photo = distance between the first two slides (width + gap).
      const [a, b] = el.children;
      const slide = a && b ? b.offsetLeft - a.offsetLeft : el.clientWidth * 0.9;
      el.scrollBy({ left: slide, behavior: "smooth" });
    };

    const id = window.setInterval(() => {
      if (pauseReasons.current.size === 0) advance();
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [restartKey]);

  // Pause while the section is off screen or the tab is in the background.
  useEffect(() => {
    const frame = frameRef.current;
    let io;
    if (frame && "IntersectionObserver" in window) {
      setPaused("offscreen", true);
      io = new IntersectionObserver(
        ([entry]) => setPaused("offscreen", !entry.isIntersecting),
        { threshold: 0.3 },
      );
      io.observe(frame);
    }
    const onVisibility = () => setPaused("hidden", document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [setPaused]);

  // Pause while a photo is open.
  useEffect(() => {
    setPaused("viewer", openIndex !== null);
  }, [openIndex, setPaused]);

  // --- Manual controls ------------------------------------------------------
  const step = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * (el.clientWidth * 0.9),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    restart();
  };

  // Keep the carousel behind the viewer on the photo being viewed, so closing
  // it leaves the user where they were looking.
  const showSlide = useCallback((index) => {
    const el = trackRef.current;
    const slide = el?.children[index];
    if (!el || !slide) return;
    const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    el.scrollTo({ left: Math.max(0, slide.offsetLeft - pad), behavior: "auto" });
  }, []);

  const closeViewer = useCallback(() => setOpenIndex(null), []);

  const changeViewerIndex = useCallback(
    (i) => {
      setOpenIndex(i);
      showSlide(i);
    },
    [showSlide],
  );

  const pauseHandlers = {
    onPointerEnter: (e) => e.pointerType === "mouse" && setPaused("hover", true),
    onPointerLeave: (e) => e.pointerType === "mouse" && setPaused("hover", false),
    onPointerDown: (e) => e.pointerType !== "mouse" && setPaused("touch", true),
    onPointerUp: () => setPaused("touch", false),
    onPointerCancel: () => setPaused("touch", false),
    onFocus: (e) => e.target.matches?.(":focus-visible") && setPaused("focus", true),
    onBlur: () => setPaused("focus", false),
    // Trackpad / wheel scrolling counts as the user moving the carousel.
    onWheel: restart,
  };

  return (
    <section
      id="gallery"
      className="syrus-section"
      aria-labelledby="gallery-title"
    >
      <div className="syrus-container">
        <SectionHeading id="gallery-title">gallery</SectionHeading>
      </div>

      <div ref={frameRef} className={styles.frame} data-reveal>
        <ul
          ref={trackRef}
          className={styles.track}
          onScroll={updateEdge}
          aria-label="Photos from previous Syrus editions"
          {...pauseHandlers}
        >
          {IMAGES.map((img, i) => (
            <li key={img.src} className={styles.slide}>
              <button
                type="button"
                className={styles.open}
                onClick={() => setOpenIndex(i)}
                aria-label={`View photo ${i + 1} of ${IMAGES.length} larger`}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  decoding="async"
                  draggable="false"
                />
                <span className={styles.zoom} aria-hidden="true">
                  <ExpandIcon className={styles.zoomIcon} />
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className={`syrus-container ${styles.controls}`}>
          <button
            type="button"
            className={`syrus-btn syrus-btn--ghost ${styles.arrow}`}
            onClick={() => step(-1)}
            disabled={edge.start}
            aria-label="Previous photos"
          >
            <ArrowIcon dir="left" className={styles.icon} />
          </button>
          <button
            type="button"
            className={`syrus-btn syrus-btn--ghost ${styles.arrow}`}
            onClick={() => step(1)}
            disabled={edge.end}
            aria-label="Next photos"
          >
            <ArrowIcon dir="right" className={styles.icon} />
          </button>
        </div>
      </div>

      {openIndex !== null && (
        <GalleryLightbox
          images={IMAGES}
          index={openIndex}
          onIndexChange={changeViewerIndex}
          onClose={closeViewer}
          anchorRef={frameRef}
        />
      )}
    </section>
  );
}
