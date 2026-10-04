/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowIcon, CloseIcon } from "../icons";
import styles from "./GalleryLightbox.module.css";

const SWIPE_PX = 50;

/**
 * Full-screen photo viewer for the gallery.
 *  - Esc or a click outside the photo closes it; arrow keys, the buttons or
 *    a swipe move between photos (wrapping at both ends).
 *  - Focus moves into the viewer and returns to the photo that opened it.
 *  - The page behind does not scroll while it is open.
 * It is portalled into the .syrus-page element so the theme tokens apply.
 */
export default function GalleryLightbox({
  images,
  index,
  onIndexChange,
  onClose,
  anchorRef,
}) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const imgRef = useRef(null);
  const swipeStart = useRef(null);
  const [loaded, setLoaded] = useState(false);

  const total = images.length;
  const current = images[index];
  const edition = current.src.match(/Syrus_(\d+)/)?.[1];

  const go = useCallback(
    (dir) => onIndexChange((index + dir + total) % total),
    [index, total, onIndexChange],
  );

  // Open: remember the opener, lock page scroll, move focus in. Close: undo.
  useEffect(() => {
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, []);

  // Keyboard: Esc, arrows, and a Tab loop inside the dialog.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "Tab") {
        const items = dialogRef.current?.querySelectorAll("button:not(:disabled)");
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [go, onClose]);

  // New photo: show the loading state unless the browser already has it.
  useEffect(() => {
    const img = imgRef.current;
    setLoaded(Boolean(img?.complete && img.naturalWidth > 0));
  }, [index]);

  // Warm the cache for the photos either side so stepping feels instant.
  useEffect(() => {
    [-1, 1].forEach((d) => {
      const img = new Image();
      img.src = images[(index + d + total) % total].src;
    });
  }, [index, images, total]);

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse") return;
    swipeStart.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      go(dx < 0 ? 1 : -1);
    }
  };

  const target = anchorRef?.current?.closest(".syrus-page") || document.body;

  return createPortal(
    <div
      ref={dialogRef}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={(e) => {
        if (!e.target.closest("[data-keep]")) onClose();
      }}
    >
      <div className={styles.top}>
        <button
          ref={closeRef}
          type="button"
          data-keep
          className={`syrus-btn syrus-btn--ghost ${styles.round}`}
          onClick={onClose}
          aria-label="Close photo viewer"
        >
          <CloseIcon className={styles.icon} />
        </button>
      </div>

      <div
        className={styles.stage}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeStart.current = null)}
      >
        {!loaded && <span className={styles.loading} aria-hidden="true" />}
        <img
          key={current.src}
          ref={imgRef}
          data-keep
          className={`${styles.photo} ${loaded ? styles.photoIn : ""}`}
          src={current.src}
          alt={current.alt}
          decoding="async"
          draggable="false"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
        />
      </div>

      <div className={styles.bar}>
        <button
          type="button"
          data-keep
          className={`syrus-btn syrus-btn--ghost ${styles.round}`}
          onClick={() => go(-1)}
          aria-label="Previous photo"
        >
          <ArrowIcon dir="left" className={styles.icon} />
        </button>
        <p className={styles.caption} data-keep aria-live="polite">
          {edition && <span className={styles.edition}>Syrus &rsquo;{edition}</span>}
          <span className={styles.count}>
            {index + 1} / {total}
          </span>
        </p>
        <button
          type="button"
          data-keep
          className={`syrus-btn syrus-btn--ghost ${styles.round}`}
          onClick={() => go(1)}
          aria-label="Next photo"
        >
          <ArrowIcon dir="right" className={styles.icon} />
        </button>
      </div>
    </div>,
    target,
  );
}
