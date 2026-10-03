// Where things sit on the timeline stage for each stop. Pure maths, no React, so
// it can be checked from node (see scripts/check-placements.mjs).
//
// Stage coordinates are pixels from the stage's top-left. The bottom strip of the
// stage (BB-8's rail) is reserved; everything else is "usable".

// How long BB-8 (and the ship, and the galaxy) take to travel `dist` stops.
export const rollSeconds = (dist) => Math.min(2, 1.2 + 0.1 * dist);

// Height reserved at the bottom for BB-8 and his rail.
// eslint-disable-next-line no-unused-vars -- keeps the (w) signature callers use
export const bottomZone = (w) => 124;

// Where the galaxy sits vertically, as a share of the usable height.
const STAR_ROW = { high: 0.3, mid: 0.44, low: 0.58 };
const STACKED_STAR_ROW = { high: 0.2, mid: 0.27, low: 0.34 };

// The schedule panel shows this many dates at a time, each this tall (px).
export const SCHEDULE_ROWS = 3;
export const SCHEDULE_ROW_H = 76;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.round(v)]));

/**
 * @param {number} w stage width
 * @param {number} h stage height
 * @param {{ ship: "left"|"right", card: "high"|"mid"|"low" }} layout
 * @returns {{ ship: Rect, card: Rect, star: {x:number,y:number} }}
 *   Rect = { x, y, w, h } (top-left origin). The card's `h` is only an estimate of
 *   its tallest text (the card sizes itself to its text); it keeps the card clear of
 *   the ship, the panel and the bottom bar. `ship` is the side the ship parks on,
 *   the star sits between the ship and the card, and the card sits beside the star.
 */
export function placements(w, h, layout) {
  const m = clamp(w * 0.03, 12, 48);
  const usable = h - bottomZone(w);
  const onLeft = layout.ship === "left";

  if (w < 900) {
    // Stacked: star and ship above, card just above the bottom strip.
    const cardH = clamp(usable * 0.38, 120, 200);
    const area = usable - cardH - 8;
    const shipW = Math.min(w - 2 * m, 440);
    const shipH = Math.max(110, area * 0.62);
    const starX = onLeft ? w * 0.3 : w * 0.7;
    return {
      ship: round({
        x: clamp(starX - shipW / 2, m, w - m - shipW),
        y: area - shipH,
        w: shipW,
        h: shipH,
      }),
      card: round({ x: m, y: usable - cardH, w: w - 2 * m, h: cardH }),
      star: { x: Math.round(starX), y: Math.round(area * STACKED_STAR_ROW[layout.card]) },
    };
  }

  // Wide stages: the schedule panel takes the right edge, everything else sits to its left.
  const panel = panelRect(w, h);
  const right = panel.x - clamp(w * 0.02, 16, 32); // right edge of the ship/star/card area
  const iw = right - m;
  const shipW = clamp(iw * 0.4, 280, 560);
  const shipH = clamp(usable * 0.82, 150, 500);
  const cardW = clamp(iw * 0.27, 270, 340);
  const cardH = clamp(usable * 0.55, 170, 260);
  const starX = m + (onLeft ? 0.57 : 0.43) * iw;
  const starY = STAR_ROW[layout.card] * usable;
  const shipCy = clamp(starY + usable * 0.06, shipH / 2, usable - shipH / 2);
  return {
    ship: round({
      x: clamp(m + (onLeft ? 0.25 : 0.75) * iw - shipW / 2, m, right - shipW),
      y: shipCy - shipH / 2,
      w: shipW,
      h: shipH,
    }),
    card: round({
      x: onLeft ? right - cardW : m,
      y: clamp(starY - cardH / 2, 0, usable - cardH),
      w: cardW,
      h: cardH,
    }),
    star: { x: Math.round(starX), y: Math.round(starY) },
  };
}

/**
 * The schedule panel on the right edge (wide stages only; null on narrow ones, where
 * the dots along the bottom do the job). It shows SCHEDULE_ROWS dates at a time and
 * sits in the middle of the usable height.
 */
export function panelRect(w, h) {
  if (w < 900) return null;
  const m = clamp(w * 0.03, 12, 48);
  const pw = clamp(w * 0.17, 190, 240);
  const ph = SCHEDULE_ROW_H * SCHEDULE_ROWS + 20;
  const usable = h - bottomZone(w);
  return round({ x: w - m - pw, y: Math.max(12, (usable - ph) / 2), w: pw, h: ph });
}

/**
 * Unit vector from where the ship was to where it is going (screen coordinates,
 * y down). Falls back to straight right when the two spots coincide or are unknown.
 */
export function flightDirection(from, to) {
  if (!from || !to) return { x: 1, y: 0 };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  return len < 1 ? { x: 1, y: 0 } : { x: dx / len, y: dy / len };
}

// How far the ship leans (degrees, clockwise positive) while flying along `dir`:
// nose down when it is descending, nose up when climbing, whichever way it faces.
export function bankDegrees(dir) {
  const side = dir.x < 0 ? -1 : 1;
  const deg = (Math.atan2(dir.y * side, Math.abs(dir.x)) * 180) / Math.PI;
  return clamp(deg * 0.5, -12, 12);
}
