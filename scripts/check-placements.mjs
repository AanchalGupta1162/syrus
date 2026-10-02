// Run with: node scripts/check-placements.mjs
// For a spread of stage sizes and every galaxy layout, the ship and the card must
// stay inside the stage, clear of the bottom bar (rail + controls) and of each other.
import galaxies from "../src/assets/data/galaxies.js";
import { placements, bottomZone, panelRect } from "../src/components/SyrusComponents/Timeline/journey.js";

const SIZES = [
  [1500, 800],
  [1440, 600],
  [1280, 560],
  [1024, 540],
  [1280, 740],
  [1024, 700],
  [900, 700],
  [820, 900],
  [768, 700],
  [390, 784],
  [360, 640],
];

const errors = [];
const overlap = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

for (const [w, h] of SIZES) {
  for (const [i, g] of galaxies.entries()) {
    const at = `${w}x${h} galaxy ${i + 1}`;
    const p = placements(w, h, g.layout);
    const usable = h - bottomZone(w);
    const inside = (r, name) => {
      if (r.x < 0 || r.y < 0 || r.x + r.w > w + 0.5 || r.y + r.h > usable + 0.5) {
        errors.push(`${at}: ${name} leaves its area (${JSON.stringify(r)}) usable=${usable}`);
      }
    };
    inside(p.ship, "ship");
    inside(p.card, "card");
    const panel = panelRect(w, h);
    if (w >= 900 && !panel) errors.push(`${at}: no schedule panel on a wide stage`);
    if (panel) {
      if (panel.y < 0 || panel.y + panel.h > h || panel.x + panel.w > w) errors.push(`${at}: panel leaves the stage`);
      const rail = { x: 0, y: h - bottomZone(w), w: Math.min(560, w - 56) + Math.max(12, Math.min(48, w * 0.03)), h: bottomZone(w) };
      if (overlap(panel, rail)) errors.push(`${at}: schedule panel overlaps BB-8's rail`);
      if (overlap(panel, p.ship)) errors.push(`${at}: ship overlaps the schedule panel`);
      if (overlap(panel, p.card)) errors.push(`${at}: card overlaps the schedule panel`);
      if (p.star.x + 60 > panel.x) errors.push(`${at}: star hides behind the schedule panel`);
    }
    if (overlap(p.ship, p.card)) errors.push(`${at}: ship overlaps card`);
    if (p.ship.w < 120 || p.ship.h < 100) errors.push(`${at}: ship too small ${p.ship.w}x${p.ship.h}`);
    if (p.card.h < 100) errors.push(`${at}: card too short ${p.card.h}`);
    if (p.star.x < 0 || p.star.x > w || p.star.y < 0 || p.star.y > usable) {
      errors.push(`${at}: star off stage (${p.star.x}, ${p.star.y})`);
    }
  }
}

if (errors.length) {
  console.error(errors.slice(0, 25).join("\n") + (errors.length > 25 ? `\n... ${errors.length} total` : ""));
  process.exit(1);
}
console.log("ok");
