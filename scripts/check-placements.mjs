// Run with: node scripts/check-placements.mjs
// For a spread of stage sizes and every galaxy layout, the ship and the column of
// three timeline cards must stay inside the stage, clear of the bottom bar (BB-8's
// rail + controls) and of each other, and the galaxy's star must stay in view.
import galaxies from "../src/assets/data/galaxies.js";
import { placements, bottomZone, cardsRect } from "../src/components/SyrusComponents/Timeline/journey.js";

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
  [412, 780],
  [390, 784],
  [360, 640],
  [320, 640],
];

const errors = [];
const overlap = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

for (const [w, h] of SIZES) {
  const usable = h - bottomZone(w);
  const cards = cardsRect(w, h);
  const at0 = `${w}x${h}`;

  if (cards.x < 0 || cards.y < 0 || cards.x + cards.w > w + 0.5 || cards.y + cards.h > usable + 0.5) {
    errors.push(`${at0}: card column leaves its area (${JSON.stringify(cards)}) usable=${usable}`);
  }
  if (cards.h !== 3 * cards.cardH + 2 * cards.gap) errors.push(`${at0}: column is not exactly three cards tall`);
  if (cards.cardH < 82) errors.push(`${at0}: cards too short ${cards.cardH}`);
  if (cards.stacked !== w < 900) errors.push(`${at0}: wrong layout mode`);

  for (const [i, g] of galaxies.entries()) {
    const at = `${at0} galaxy ${i + 1}`;
    const p = placements(w, h, g.layout);
    if (p.ship.x < 0 || p.ship.y < 0 || p.ship.x + p.ship.w > w + 0.5 || p.ship.y + p.ship.h > usable + 0.5) {
      errors.push(`${at}: ship leaves its area (${JSON.stringify(p.ship)}) usable=${usable}`);
    }
    if (overlap(p.ship, cards)) errors.push(`${at}: ship overlaps the card column`);
    if (p.ship.w < 120 || p.ship.h < 100) errors.push(`${at}: ship too small ${p.ship.w}x${p.ship.h}`);
    if (p.star.x < 0 || p.star.x > w || p.star.y < 0 || p.star.y > usable) {
      errors.push(`${at}: star off stage (${p.star.x}, ${p.star.y})`);
    }
    if (!cards.stacked && p.star.x + 60 > cards.x) errors.push(`${at}: star hides behind the card column`);
    if (cards.stacked && p.star.y > cards.y) errors.push(`${at}: star is below the top of the card column`);
  }
}

if (errors.length) {
  console.error(errors.slice(0, 25).join("\n") + (errors.length > 25 ? `\n... ${errors.length} total` : ""));
  process.exit(1);
}
console.log("ok");
