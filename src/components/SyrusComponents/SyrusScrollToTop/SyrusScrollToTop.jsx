import { useEffect, useState } from "react";
import { ArrowIcon } from "../icons";
import { getHeroScrollY, scrollToHero } from "../syrusConfig";
import styles from "./SyrusScrollToTop.module.css";

/** Appears after the hero and returns the visitor to it. */
export default function SyrusScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      setVisible(window.scrollY > getHeroScrollY() + window.innerHeight * 0.6);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      className={`syrus-btn syrus-btn--ghost ${styles.btn} ${visible ? styles.on : ""}`}
      onClick={scrollToHero}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
    >
      <ArrowIcon dir="up" className={styles.icon} />
    </button>
  );
}
