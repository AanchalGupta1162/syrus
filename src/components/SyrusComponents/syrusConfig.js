/**
 * SYRUS 7.0 — page settings.
 * Change things here; the components read from this file.
 */

// Which button is the main call-to-action in the Hero and the Navbar:
//   "register" -> Register on Unstop (default)
//   "mentor"   -> Call a Mentor (opens the Call A Mentor modal)
export const PRIMARY_ACTION = "register";

export const REGISTER_URL =
  import.meta.env.VITE_UNSTOP_REG_FORM_URL || "https://unstop.com";

export const JOIN_GROUP_URL =
  "https://chat.whatsapp.com/D1lcqTuiNsM4gkqnKHThIH";

export const EVENT_DATES = "9th – 10th October";

/** Scroll position (px) at which the intro has finished and the hero is fully shown. */
export function getHeroScrollY() {
  const intro = document.getElementById("intro");
  if (!intro) return 0;
  return Math.max(
    0,
    intro.getBoundingClientRect().top +
      window.scrollY +
      intro.offsetHeight -
      window.innerHeight,
  );
}

export function scrollToHero() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({
    top: getHeroScrollY(),
    behavior: reduce ? "auto" : "smooth",
  });
}
