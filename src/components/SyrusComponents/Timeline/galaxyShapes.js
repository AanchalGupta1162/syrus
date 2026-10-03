// Star layouts for the timeline's galaxies. Pure maths (no React, no canvas) so it
// can be checked from node (see scripts/check-galaxies.mjs).
//
// Every shape is built in a unit disc (radius 1 = the galaxy's radius on screen) as
// a list of stars. Stars come in tight sparkly knots plus a thinner diffuse haze.
// How a shape is *drawn* is described by:
//   flat  how squashed it looks (1 = round, small = seen edge-on)
//   tilt  rotation of the whole galaxy on screen, radians
//   rot   how fast it turns (0 = still; 1 = the base spin)

const TAU = Math.PI * 2;

// Normal-distributed random number (Box-Muller).
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(TAU * Math.random());

// A star: mostly tiny pinpoints, about one in nine slightly bigger with a glint.
// `speed` is slow on purpose, the twinkle is meant to be gentle.
const makeAdder = (pts) => (x, y, look = {}) => {
  const sparkle = look.sparkle ?? Math.random() < 0.11;
  pts.push({
    x,
    y,
    k: Math.min(1, Math.hypot(x, y)),
    size: sparkle ? 1.2 + Math.random() * 0.9 : 0.45 + Math.random() * 0.75,
    bright: look.bright ?? (sparkle ? 0.95 : 0.5 + Math.random() * 0.4),
    sparkle,
    phase: Math.random() * TAU,
    speed: 0.5 + Math.random() * 1.1,
  });
};

const scatter = (add, cx, cy, sx, n, sy = sx) => {
  for (let i = 0; i < n; i += 1) add(cx + gauss() * sx, cy + gauss() * sy);
};

// A point on a spiral arm: `k` runs 0 (centre) .. 1 (tip).
const armPoint = (arm, count, k, wind, r0, a0) => {
  const a = a0 + (arm * TAU) / count + k * wind;
  const r = r0 + (1 - r0) * k;
  return [Math.cos(a) * r, Math.sin(a) * r];
};

const arms = (add, count, wind, { r0 = 0.08, a0 = 0, knots = 13, perKnot = 14, diffuse = 80 } = {}) => {
  for (let arm = 0; arm < count; arm += 1) {
    for (let j = 0; j < knots; j += 1) {
      const k = Math.pow((j + 0.5) / knots, 0.9);
      const [cx, cy] = armPoint(arm, count, k, wind, r0, a0);
      scatter(add, cx, cy, 0.022 + 0.03 * k, perKnot);
    }
    for (let i = 0; i < diffuse; i += 1) {
      const k = Math.pow(Math.random(), 0.85);
      const [x, y] = armPoint(arm, count, k, wind, r0, a0);
      add(x + gauss() * 0.03 * (1 + k), y + gauss() * 0.03 * (1 + k));
    }
  }
};

const ringOf = (add, radius, spread, knots, perKnot, haze) => {
  for (let j = 0; j < knots; j += 1) {
    const a = (j / knots) * TAU + Math.random() * 0.3;
    scatter(add, Math.cos(a) * radius, Math.sin(a) * radius, 0.03, perKnot);
  }
  for (let i = 0; i < haze; i += 1) {
    const a = Math.random() * TAU;
    const r = radius + gauss() * spread;
    add(Math.cos(a) * r, Math.sin(a) * r);
  }
};

export const SHAPES = {
  // The Death Star: a lit ball of pinpoints with the equatorial trench and the dish.
  deathstar: {
    flat: 1,
    tilt: 0,
    rot: 0,
    build: (add) => {
      const R = 0.6;
      const dish = { x: -0.22, y: -0.2, r: 0.17 };
      for (let i = 0; i < 2600; i += 1) {
        const a = Math.random() * TAU;
        const d = Math.sqrt(Math.random()) * R;
        const x = Math.cos(a) * d;
        const y = Math.sin(a) * d;
        // lit from the upper left, dark on the far edge
        const lit = 0.35 + 0.65 * Math.max(0, 1 - Math.hypot(x + 0.25, y + 0.25) / (R * 1.5));
        const inTrench = Math.abs(y - 0.07 - x * 0.04) < 0.014;
        const dd = Math.hypot(x - dish.x, y - dish.y);
        if (inTrench) {
          if (Math.random() < 0.8) continue; // the trench is a dark line
        }
        if (dd < dish.r - 0.02) {
          if (Math.random() < 0.7) continue; // the dish is a dark bowl
        }
        add(x, y, { bright: Math.min(0.95, 0.4 + lit * 0.55), sparkle: false });
      }
      // bright rim around the dish, a few windows along the trench
      for (let j = 0; j < 60; j += 1) {
        const a = (j / 60) * TAU;
        add(dish.x + Math.cos(a) * dish.r, dish.y + Math.sin(a) * dish.r, { bright: 0.9, sparkle: false });
      }
      add(dish.x, dish.y, { bright: 1, sparkle: true });
      for (let j = 0; j < 14; j += 1) {
        const x = (Math.random() * 2 - 1) * R * 0.95;
        if (Math.hypot(x, 0.07) < R) add(x, 0.07 + x * 0.04, { bright: 0.95, sparkle: Math.random() < 0.35 });
      }
    },
  },
  // Two tight arms.
  spiral2: {
    flat: 0.5,
    tilt: -0.35,
    rot: 1,
    build: (add) => {
      arms(add, 2, 4.4, { knots: 15, perKnot: 16, diffuse: 100 });
      scatter(add, 0, 0, 0.07, 70);
    },
  },
  // Three looser arms.
  spiral3: {
    flat: 0.48,
    tilt: 0.3,
    rot: 1,
    build: (add) => {
      arms(add, 3, 3.1, { knots: 12, perKnot: 13, diffuse: 70 });
      scatter(add, 0, 0, 0.07, 70);
    },
  },
  // Five faint, barely wound arms.
  pinwheel: {
    flat: 0.8,
    tilt: -0.5,
    rot: 0.8,
    build: (add) => {
      arms(add, 5, 1.5, { r0: 0.1, knots: 8, perKnot: 11, diffuse: 45 });
      scatter(add, 0, 0, 0.08, 60);
    },
  },
  // A straight bar of stars with two arms curling off its ends.
  barred: {
    flat: 0.55,
    tilt: -0.25,
    rot: 0.9,
    build: (add) => {
      const bar = 0.2;
      for (let i = 0; i < 130; i += 1) {
        const t = (Math.random() * 2 - 1) * 0.4;
        add(t * Math.cos(bar) + gauss() * 0.025, t * Math.sin(bar) + gauss() * 0.04);
      }
      arms(add, 2, 2.7, { r0: 0.4, a0: bar, knots: 10, perKnot: 14, diffuse: 60 });
      scatter(add, 0, 0, 0.07, 60);
    },
  },
  // A smooth, fuzzy egg: no arms.
  elliptical: {
    flat: 0.7,
    tilt: 0.55,
    rot: 0.25,
    build: (add) => {
      for (let i = 0; i < 520; i += 1) {
        const a = Math.random() * TAU;
        const r = Math.min(1, Math.abs(gauss()) * 0.3);
        add(Math.cos(a) * r, Math.sin(a) * r);
      }
      for (let j = 0; j < 8; j += 1) {
        const a = Math.random() * TAU;
        const r = Math.random() * 0.45;
        scatter(add, Math.cos(a) * r, Math.sin(a) * r, 0.04, 14);
      }
    },
  },
  // A hollow ring with a small bright core.
  ring: {
    flat: 0.55,
    tilt: 0.2,
    rot: 0.7,
    build: (add) => {
      ringOf(add, 0.74, 0.05, 14, 16, 160);
      scatter(add, 0, 0, 0.06, 70);
    },
  },
  // A ring joined to the centre by spokes.
  cartwheel: {
    flat: 0.85,
    tilt: -0.15,
    rot: 0.6,
    build: (add) => {
      ringOf(add, 0.78, 0.04, 12, 15, 90);
      for (let s = 0; s < 6; s += 1) {
        const a = (s / 6) * TAU + 0.2;
        for (let i = 0; i < 26; i += 1) {
          const r = 0.08 + Math.random() * 0.68;
          add(Math.cos(a) * r + gauss() * 0.02, Math.sin(a) * r + gauss() * 0.02);
        }
      }
      scatter(add, 0, 0, 0.07, 60);
    },
  },
  // A thin disc seen from the side, with a bulge.
  edgeon: {
    flat: 1,
    tilt: -0.3,
    rot: 0,
    build: (add) => {
      for (let i = 0; i < 480; i += 1) add(Math.max(-1, Math.min(1, gauss() * 0.5)), gauss() * 0.03);
      scatter(add, 0, 0, 0.14, 130, 0.07);
      for (let j = 0; j < 10; j += 1) scatter(add, (Math.random() * 2 - 1) * 0.8, gauss() * 0.02, 0.035, 12, 0.015);
    },
  },
  // A ragged mess of clumps with no centre.
  irregular: {
    flat: 0.85,
    tilt: 0.4,
    rot: 0.2,
    build: (add) => {
      for (let j = 0; j < 6; j += 1) {
        const a = Math.random() * TAU;
        const r = 0.15 + Math.random() * 0.5;
        scatter(add, Math.cos(a) * r, Math.sin(a) * r, 0.08 + Math.random() * 0.08, 95);
      }
      scatter(add, 0, 0, 0.45, 90);
    },
  },
  // A dense, round ball of stars.
  globular: {
    flat: 1,
    tilt: 0,
    rot: 0.3,
    build: (add) => {
      for (let i = 0; i < 640; i += 1) {
        const a = Math.random() * TAU;
        const r = Math.pow(Math.random(), 2.2) * 0.85;
        add(Math.cos(a) * r, Math.sin(a) * r);
      }
      for (let j = 0; j < 7; j += 1) {
        const a = Math.random() * TAU;
        const r = Math.random() * 0.6;
        scatter(add, Math.cos(a) * r, Math.sin(a) * r, 0.03, 12);
      }
    },
  },
};

export const SHAPE_NAMES = Object.keys(SHAPES);

/** Build the stars for one shape: { pts, flat, tilt, rot }. */
export function buildGalaxy(name) {
  const shape = SHAPES[name] || SHAPES.spiral2;
  const pts = [];
  shape.build(makeAdder(pts));
  return { pts, flat: shape.flat, tilt: shape.tilt, rot: shape.rot };
}
