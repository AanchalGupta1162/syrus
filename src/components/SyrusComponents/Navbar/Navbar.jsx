import { useCallback, useEffect, useRef, useState } from "react";
import ActionButtons from "../ActionButtons/ActionButtons";
import { CloseIcon, MenuIcon } from "../icons";
import { scrollToHero } from "../syrusConfig";
import styles from "./Navbar.module.css";

const MENU_ITEMS = [
  { id: "sponsors", label: "Sponsors" },
  { id: "prizepool", label: "Prize Pool" },
  { id: "timeline", label: "Timeline" },
  { id: "tracks", label: "Tracks" },
  { id: "faq-section", label: "FAQs" },
  { id: "gallery", label: "Gallery" },
];

/**
 * - The menu button is visible from the hero onwards.
 * - The full bar (logo + buttons) appears once the Sponsors section arrives.
 */
export default function Navbar({ onCallMentor }) {
  const [showBar, setShowBar] = useState(false);
  const [showMenuBtn, setShowMenuBtn] = useState(false);
  const [open, setOpen] = useState(false);
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

  const closeMenu = useCallback(() => {
    setOpen(false);
    menuBtnRef.current?.focus({ preventScroll: true });
  }, []);

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

  const goTo = (id) => {
    setOpen(false);
    // Let the scroll lock release before scrolling.
    window.setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }, 80);
  };

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
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="syrus-menu"
        aria-label="Open menu"
        tabIndex={showMenuBtn ? 0 : -1}
      >
        <MenuIcon className={styles.menuIcon} />
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
        <div className={styles.overlayTop}>
          <span className={styles.overlayTitle}>syrus 7.0</span>
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

        <nav className={styles.nav} aria-label="Sections">
          {MENU_ITEMS.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className={styles.item}
              style={{ "--i": i }}
              onClick={() => goTo(item.id)}
            >
              <span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
              <span className={styles.itemLabel}>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
