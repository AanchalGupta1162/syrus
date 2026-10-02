// The journey: one galaxy per timeline stop, in the same order as
// timelineEvents.js. Edit names/colours freely; run
// `node scripts/check-galaxies.mjs` after changing the list.
//
//   name    - shown as "Galaxy 03 · Kessel Run" on the ship viewer
//   rgb     - main colour          ("r, g, b")
//   rgb2    - second colour        ("r, g, b")
//   shape   - the galaxy's form: one of the names in galaxyShapes.js
//             (spiral2, spiral3, pinwheel, barred, elliptical, ring, cartwheel,
//              edgeon, irregular, globular)
//   layout  - where things sit for this stop
//     ship: "left" | "right"        which side the ship parks on (the card goes
//                                    on the other side of the galaxy)
//     card: "high" | "mid" | "low"  how high the galaxy and its card sit
const galaxies = [
  {
    name: "Tatooine Reach",
    rgb: "232, 170, 90",
    rgb2: "255, 120, 40",
    shape: "spiral2",
    layout: { ship: "left", card: "mid" },
  },
  {
    name: "Corellian Drift",
    rgb: "255, 190, 60",
    rgb2: "200, 90, 30",
    shape: "barred",
    layout: { ship: "right", card: "high" },
  },
  {
    name: "Kessel Run",
    rgb: "255, 90, 50",
    rgb2: "150, 30, 60",
    shape: "elliptical",
    layout: { ship: "left", card: "low" },
  },
  {
    name: "Alderaan Nebula",
    rgb: "150, 110, 255",
    rgb2: "60, 90, 220",
    shape: "spiral3",
    layout: { ship: "right", card: "mid" },
  },
  {
    name: "Dagobah Mist",
    rgb: "90, 210, 140",
    rgb2: "30, 120, 90",
    shape: "ring",
    layout: { ship: "left", card: "high" },
  },
  {
    name: "Naboo Veil",
    rgb: "70, 215, 210",
    rgb2: "50, 120, 200",
    shape: "edgeon",
    layout: { ship: "right", card: "low" },
  },
  {
    name: "Hoth Expanse",
    rgb: "170, 220, 255",
    rgb2: "100, 150, 230",
    shape: "irregular",
    layout: { ship: "left", card: "mid" },
  },
  {
    name: "Mustafar Rift",
    rgb: "255, 60, 40",
    rgb2: "255, 140, 30",
    shape: "pinwheel",
    layout: { ship: "right", card: "high" },
  },
  {
    name: "Coruscant Core",
    rgb: "255, 215, 120",
    rgb2: "255, 255, 255",
    shape: "globular",
    layout: { ship: "left", card: "low" },
  },
  {
    name: "Yavin Prime",
    rgb: "95, 212, 240",
    rgb2: "255, 107, 26",
    shape: "cartwheel",
    layout: { ship: "right", card: "mid" },
  },
];

export default galaxies;
