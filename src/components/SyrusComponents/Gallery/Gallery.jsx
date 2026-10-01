import { useCallback, useEffect, useRef, useState } from "react";
import SectionHeading from "../SectionHeading/SectionHeading";
import { ArrowIcon } from "../icons";
import styles from "./Gallery.module.css";

const IMAGES = [
  ...[3, 8, 10, 12, 13, 14].map((n) => `/Gallery/Syrus_24/Gallery_${n}.webp`),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `/Gallery/Syrus_25/Gallery_${n}.webp`),
];

/** Native scroll-snap carousel. No autoplay, no JS animation. */
export default function Gallery() {
  const trackRef = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const updateEdge = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setEdge({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    updateEdge();
    window.addEventListener("resize", updateEdge);
    return () => window.removeEventListener("resize", updateEdge);
  }, [updateEdge]);

  const step = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: dir * (el.clientWidth * 0.9),
      behavior: reduce ? "auto" : "smooth",
    });
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

      <div className={styles.frame} data-reveal>
        <ul
          ref={trackRef}
          className={styles.track}
          onScroll={updateEdge}
          tabIndex={0}
          aria-label="Photos from previous Syrus editions"
        >
          {IMAGES.map((src, i) => (
            <li key={src} className={styles.slide}>
              <img
                src={src}
                alt={`Syrus hackathon photo ${i + 1}`}
                loading="lazy"
                decoding="async"
                draggable="false"
              />
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
    </section>
  );
}
