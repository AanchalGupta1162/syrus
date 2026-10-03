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

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.round(v)]));

/**
 * The column of timeline cards. Exactly three cards are visible at a time (previous,
 * current, next), so the column is three cards tall. Wide stages put it on the right
 * edge, centred in the usable height; narrow stages put it full width just above the
 * bottom strip, under the ship.
 * @returns {{ x:number, y:number, w:number, h:number, cardH:number, gap:number, stacked:boolean }}
 */
export function cardsRect(w, h) {
  const m = clamp(w * 0.03, 12, 48);
  const usable = h - bottomZone(w);

  if (w < 900) {
    const gap = 8;
    const cardH = clamp(Math.floor((usable * 0.6 - 2 * gap) / 3), 82, 124);
    const ch = 3 * cardH + 2 * gap;
    return { x: m, y: Math.round(usable - ch), w: Math.round(w - 2 * m), h: ch, cardH, gap, stacked: true };
  }

  const gap = 14;
  const cw = clamp(w * 0.34, 340, 520);
  const cardH = clamp(Math.floor((usable - 12 - 2 * gap) / 3), 116, 200);
  const ch = 3 * cardH + 2 * gap;
  return {
    x: Math.round(w - m - cw),
    y: Math.round(Math.max(8, (usable - ch) / 2)),
    w: Math.round(cw),
    h: ch,
    cardH,
    gap,
    stacked: false,
  };
}

/**
 * @param {number} w stage width
 * @param {number} h stage height
 * @param {{ ship: "left"|"right", card: "high"|"mid"|"low" }} layout
 * @returns {{ ship: Rect, star: {x:number,y:number} }}
 *   Rect = { x, y, w, h } (top-left origin). The ship parks on the side `layout.ship`
 *   of the free area (everything left of the card column on wide stages, everything
 *   above it on narrow ones). The galaxy's star sits on the inner side of the ship,
 *   at the height `layout.card` (kept from the old layout so each galaxy keeps its place).
 */
export function placements(w, h, layout) {
  const m = clamp(w * 0.03, 12, 48);
  const usable = h - bottomZone(w);
  const onLeft = layout.ship === "left";
  const cards = cardsRect(w, h);

  if (cards.stacked) {
    // Stacked: star and ship above, the cards just above the bottom strip.
    const area = cards.y - 8;
    const shipW = Math.min(w - 2 * m, 440);
    const shipH = Math.max(100, area * 0.72);
    const starX = onLeft ? w * 0.3 : w * 0.7;
    return {
      ship: round({
        x: clamp(starX - shipW / 2, m, w - m - shipW),
        y: area - shipH,
        w: shipW,
        h: shipH,
      }),
      star: { x: Math.round(starX), y: Math.round(area * STACKED_STAR_ROW[layout.card]) },
    };
  }

  // Wide stages: the card column takes the right edge, everything else sits to its left.
  const right = cards.x - clamp(w * 0.02, 16, 32); // right edge of the ship / star area
  const iw = right - m;
  const shipW = clamp(iw * 0.4, 280, 560);
  const shipH = clamp(usable * 0.82, 150, 500);
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
    star: { x: Math.round(starX), y: Math.round(starY) },
  };
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
