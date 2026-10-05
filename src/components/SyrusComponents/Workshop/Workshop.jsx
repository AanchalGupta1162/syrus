import { useCallback, useEffect, useRef, useState } from "react";
import SectionHeading from "../SectionHeading/SectionHeading";
import styles from "./Workshop.module.css";

// Files are named like "QFF-5Oct-1.png" (day, month, optional part number).
const files = import.meta.glob("../Workshop Images/*.{png,jpg,jpeg,webp}", {
  eager: true,
  import: "default",
});

const MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");

function sortKey(path) {
  const m = path.match(/(\d{1,2})([A-Za-z]{3})[A-Za-z]*(?:-(\d+))?\.[a-z]+$/);
  if (!m) return [99, 99, 99];
  return [MONTHS.indexOf(m[2].toLowerCase()), Number(m[1]), Number(m[3] || 0)];
}

const images = Object.entries(files)
  .sort(([a], [b]) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
  })
  .map(([path, src]) => ({ src, name: path.split("/").pop() }));

const AUTOPLAY_MS = 3000;
// Copies of the first photos sit after the last one so the loop can run forward
// into them and then jump back to the real start without anything visibly moving.
const CLONES = Math.min(3, images.length);

export default function Workshop() {
  const trackRef = useRef(null);
  const hovering = useRef(false);
  const visible = useRef(true);
  const lastTouch = useRef(0);

  const loopWidth = () => {
    const el = trackRef.current;
    const first = el?.children[0];
    const clone = el?.children[images.length];
    return first && clone ? clone.offsetLeft - first.offsetLeft : 0;
  };

  const stepWidth = () => {
    const first = trackRef.current?.firstElementChild;
    return first ? first.getBoundingClientRect().width + 16 : 0;
  };

  // Once the track has scrolled onto the copies, snap back by exactly one lap.
  const wrap = useCallback(() => {
    const el = trackRef.current;
    const loop = loopWidth();
    if (el && loop > 0 && el.scrollLeft >= loop - 1) el.scrollLeft -= loop;
  }, []);

  const slide = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    lastTouch.current = Date.now();
    if (dir < 0 && el.scrollLeft <= 4) {
      const loop = loopWidth();
      if (loop > 0) el.scrollLeft += loop;
    }
    el.scrollBy({ left: dir * stepWidth(), behavior: "smooth" });
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el || images.length < 2) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    let io;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(([entry]) => {
        visible.current = entry.isIntersecting;
      });
      io.observe(el);
    }
    const id = setInterval(() => {
      if (hovering.current || !visible.current || document.hidden) return;
      if (Date.now() - lastTouch.current < AUTOPLAY_MS) return;
      el.scrollBy({ left: stepWidth(), behavior: "smooth" });
    }, AUTOPLAY_MS);
    return () => {
      clearInterval(id);
      io?.disconnect();
    };
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      slide(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      slide(-1);
    }
  };

  const touched = () => {
    lastTouch.current = Date.now();
  };

  return (
    <section
      id="workshop"
      className="syrus-section"
      aria-labelledby="workshop-title"
    >
      <div className="syrus-container">
        <SectionHeading id="workshop-title">workshop</SectionHeading>

        <div className={`syrus-panel ${styles.card}`} data-reveal>
          <div className={styles.inner}>
            <div
              ref={trackRef}
              className={styles.track}
              onScroll={wrap}
              onKeyDown={onKeyDown}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") hovering.current = true;
              }}
              onPointerLeave={() => {
                hovering.current = false;
              }}
              onTouchStart={touched}
              onTouchMove={touched}
              onWheel={touched}
              onFocus={touched}
              tabIndex={0}
              role="region"
              aria-label="Workshop photos. Scroll or use the arrow keys to see more."
            >
              {images.map((img, i) => (
                <figure key={img.name} className={styles.slide}>
                  <img
                    src={img.src}
                    alt={`Workshop photo ${i + 1} of ${images.length}`}
                    loading="lazy"
                    decoding="async"
                    draggable="false"
                  />
                </figure>
              ))}
              {images.slice(0, CLONES).map((img, i) => (
                <figure key={`clone-${img.name}`} className={styles.slide} aria-hidden="true">
                  <img src={img.src} alt="" loading="lazy" decoding="async" draggable="false" />
                </figure>
              ))}
            </div>

            <div className={styles.controls}>
              <div className={styles.arrows}>
                <button
                  type="button"
                  className={styles.arrow}
                  onClick={() => slide(-1)}
                  aria-label="Previous photos"
                >
                  ←
                </button>
                <button
                  type="button"
                  className={styles.arrow}
                  onClick={() => slide(1)}
                  aria-label="Next photos"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
