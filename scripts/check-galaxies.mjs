// Run with: node scripts/check-galaxies.mjs
// Fails loudly if the galaxy list drifts out of step with the timeline events.
import events from "../src/assets/data/timelineEvents.js";
import galaxies from "../src/assets/data/galaxies.js";
import { SHAPE_NAMES, buildGalaxy } from "../src/components/SyrusComponents/Timeline/galaxyShapes.js";

const SHIP = ["left", "right"];
const CARD = ["high", "mid", "low"];
const RGB = /^\d{1,3}, \d{1,3}, \d{1,3}$/;

const errors = [];
const fail = (msg) => errors.push(msg);

if (galaxies.length !== events.length) {
  fail(`galaxies (${galaxies.length}) and events (${events.length}) differ in length`);
}

const names = new Set();
galaxies.forEach((g, i) => {
  const at = `galaxy ${i + 1}`;
  if (typeof g.name !== "string" || !g.name.trim()) fail(`${at}: missing name`);
  if (names.has(g.name)) fail(`${at}: duplicate name "${g.name}"`);
  names.add(g.name);
  if (!RGB.test(g.rgb)) fail(`${at}: bad rgb "${g.rgb}"`);
  if (!RGB.test(g.rgb2)) fail(`${at}: bad rgb2 "${g.rgb2}"`);
  if (!SHAPE_NAMES.includes(g.shape)) fail(`${at}: unknown shape "${g.shape}"`);
  if (!SHIP.includes(g.layout?.ship)) fail(`${at}: bad layout.ship`);
  if (!CARD.includes(g.layout?.card)) fail(`${at}: bad layout.card`);
});

// Neighbouring stops must not share a shape, and every shape must build real stars.
galaxies.forEach((g, i) => {
  const n = galaxies[(i + 1) % galaxies.length];
  if (g.shape === n.shape) fail(`galaxy ${i + 1} and ${((i + 1) % galaxies.length) + 1} share the shape "${g.shape}"`);
});
for (const name of SHAPE_NAMES) {
  const { pts } = buildGalaxy(name);
  if (pts.length < 300) fail(`shape ${name}: only ${pts.length} stars`);
  const far = pts.filter((p) => Math.hypot(p.x, p.y) > 1.3).length;
  if (far > pts.length * 0.02) fail(`shape ${name}: ${far} stars fall outside the galaxy`);
}

// Neighbouring stops (including the 10 -> 1 loop) must look different.
galaxies.forEach((g, i) => {
  const n = galaxies[(i + 1) % galaxies.length];
  const same = g.layout.ship === n.layout.ship && g.layout.card === n.layout.card;
  if (same) fail(`galaxy ${i + 1} and ${((i + 1) % galaxies.length) + 1} share a layout`);
});

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("ok");
