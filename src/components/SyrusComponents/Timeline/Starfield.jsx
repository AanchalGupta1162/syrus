/* eslint-disable react/prop-types -- internal component, props are fixed by Timeline.jsx */
import { useEffect, useRef } from "react";
import galaxies from "../../../assets/data/galaxies";
import { buildGalaxy } from "./galaxyShapes";
import styles from "./Starfield.module.css";

const TRAVEL_S = 1.3; // time to fly from one galaxy to the next
const FULL = 1.5; // the baked picture covers this many galaxy radii each side of the centre
const GLINT = 32; // size (px) of the baked four-point glint

const parse = (rgb) => rgb.split(",").map((n) => Number(n.trim()));
const round = (v) => Math.round(v);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const mix = (a, b, k) => a.map((v, i) => round(v + (b[i] - v) * k));
const rgba = (c, a) => `rgba(${round(c[0])}, ${round(c[1])}, ${round(c[2])}, ${a})`;
const WHITE = [255, 255, 255];

const idle = (fn) =>
  typeof window.requestIdleCallback === "function"
    ? window.requestIdleCallback(fn, { timeout: 1500 })
    : window.setTimeout(fn, 400);
const cancelIdle = (h) =>
  typeof window.cancelIdleCallback === "function"
    ? window.cancelIdleCallback(h)
    : window.clearTimeout(h);

/* ---------- baked galaxies ---------------------------------------------------
   A galaxy is ~450 to 2,500 tiny stars. Drawing them one by one every frame (each
   with its own colour string and path) is far too much work for a phone, so each
   galaxy is drawn ONCE into a small off-screen picture (its core glow and every star,
   seen flat-on). Each frame then draws that picture with one drawImage call, using
   the same tilt / squash / spin the stars used to get one by one. Only the bright
   four-point glints, about 60 to 90 per galaxy, are still drawn live so they keep
   twinkling and stay upright. */

const shapeCache = new Map(); // shape -> { pts, glints, flat, tilt, rot }
const getShape = (name) => {
  let s = shapeCache.get(name);
  if (!s) {
    const g = buildGalaxy(name);
    s = { ...g, glints: g.pts.filter((p) => p.sparkle) };
    shapeCache.set(name, s);
  }
  return s;
};

const makeCanvas = (w, h) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

/** Draw one galaxy flat-on into a canvas. `rs` is pixels per galaxy radius, `k` pixels per CSS px. */
function bake(shape, c1, c2, rsIn, k) {
  const rs = Number.isFinite(rsIn) && rsIn > 0 ? rsIn : 1; // canvas not laid out yet
  const side = Math.min(1024, Math.max(16, Math.ceil(2 * FULL * rs)));
  const scale = side / (2 * FULL * rs);
  const unit = rs * scale;
  const canvas = makeCanvas(side, side);
  const g = canvas.getContext("2d");
  const cx = side / 2;

  // faint core glow
  const glowR = unit * 0.45;
  const glow = g.createRadialGradient(cx, cx, 0, cx, cx, glowR);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.3)");
  glow.addColorStop(0.5, rgba(c1, 0.09));
  glow.addColorStop(1, rgba(c1, 0));
  g.fillStyle = glow;
  g.fillRect(cx - glowR, cx - glowR, glowR * 2, glowR * 2);

  // every star at its average brightness (the live glints supply the twinkle)
  const px = k * scale;
  for (const p of shape.pts) {
    const a = Math.min(1, p.bright * (1 - 0.3 * p.k)) * 0.78;
    const col = mix(mix(c1, c2, p.k), WHITE, p.sparkle ? 0.75 : 0.4);
    const r = p.size * px;
    g.fillStyle = rgba(col, a.toFixed(3));
    const x = cx + p.x * unit;
    const y = cx + p.y * unit;
    if (r < 1.1 * px) {
      g.fillRect(x - r, y - r, r * 2, r * 2);
    } else {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  }

  // the glint: a soft four-point cross, scaled per star when drawn
  const glint = makeCanvas(GLINT, GLINT);
  const gg = glint.getContext("2d");
  const gc = mix(c1, WHITE, 0.7);
  const h = GLINT / 2;
  gg.lineWidth = 2.2;
  gg.lineCap = "round";
  for (const [x1, y1, x2, y2] of [
    [1, h, GLINT - 1, h],
    [h, 1, h, GLINT - 1],
  ]) {
    const line = gg.createLinearGradient(x1, y1, x2, y2);
    line.addColorStop(0, rgba(gc, 0));
    line.addColorStop(0.5, rgba(gc, 1));
    line.addColorStop(1, rgba(gc, 0));
    gg.strokeStyle = line;
    gg.beginPath();
    gg.moveTo(x1, y1);
    gg.lineTo(x2, y2);
    gg.stroke();
  }
  return { sprite: canvas, glint };
}

/**
 * Backdrop for the timeline stage.
 *
 *  - Each stop has its own galaxy, in its own shape (see galaxyShapes.js): sparkly
 *    knots of tiny stars with a very gentle twinkle.
 *    When `index` changes the ship is flying in direction `dir`: the next galaxy
 *    comes in from that direction while the old one falls away behind.
 *  - `rgb` / `rgb2` are "r, g, b" strings: the colours of this stop's galaxy.
 *    The space behind it never changes colour.
 *  - `anchor` is where the galaxy rests, as fractions of the stage.
 *  - `dir` is the unit vector {x, y} the ship is flying along for this change.
 *
 * Kept light for phones: galaxies are baked once (see above), the canvas is drawn at
 * 1x on small screens, and while a galaxy is just sitting there it redraws at a
 * relaxed 20 to 30 frames a second (the movement is slow) instead of 60.
 */
export default function Starfield({ rgb, rgb2, shape, index, anchor, dir }) {
  const canvasRef = useRef(null);
  const target = useRef({});
  const apiRef = useRef(null);

  target.current = { c1: parse(rgb), c2: parse(rgb2), shape, index, ax: anchor.x, ay: anchor.y, dx: dir.x, dy: dir.y };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return undefined;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.matchMedia("(max-width: 899px), (pointer: coarse)").matches;
    const dprCap = small ? 1 : 1.5;
    const settledGap = 1000 / (small ? 20 : 30);

    // Background stars, grouped into three brightness bands so each band is one fillStyle.
    const BANDS = ["rgba(255, 255, 255, 0.36)", "rgba(255, 255, 255, 0.58)", "rgba(255, 255, 255, 0.8)"];
    const stars = Array.from({ length: small ? 80 : 150 }, () => {
      const d = 0.3 + Math.random() * 0.7;
      return {
        a: Math.random() * Math.PI * 2,
        r: Math.random(),
        d,
        band: Math.min(2, Math.floor(((d - 0.3) / 0.7) * 3)),
        half: (0.5 + d * 0.9) * 0.85,
      };
    });

    let w = 0;
    let h = 0;
    let dpr = 1;
    let reach = 1;

    // A galaxy ready to draw: its stars, its colours and its baked pictures. The
    // pictures are made for the current canvas size (pixels per galaxy radius).
    const bodyFor = (sh, c1, c2, ax, ay) => ({
      ...getShape(sh),
      shape: sh,
      c1: [...c1],
      c2: [...c2],
      ...bake(getShape(sh), c1, c2, reach * 0.2 * dpr, dpr),
      ax,
      ay,
    });
    const snap = () =>
      bodyFor(target.current.shape, target.current.c1, target.current.c2, target.current.ax, target.current.ay);

    // bodies.to is the galaxy we're at (or flying to); bodies.from is the one we left.
    const bodies = { index: target.current.index, from: null, to: null, t: 1, dx: 1, dy: 0 };
    let spin = 0;
    let clock = 0; // seconds, drives the twinkle
    let raf = 0;
    let last = 0;
    let lastDraw = 0;
    let visible = false;
    let warmHandle = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      reach = Math.hypot(w, h) / 2;
      // New size: the baked pictures were made for the old one.
      if (bodies.to) {
        const b = bodies.to;
        bodies.to = bodyFor(b.shape, b.c1, b.c2, b.ax, b.ay);
        if (bodies.from) {
          const f = bodies.from;
          bodies.from = bodyFor(f.shape, f.c1, f.c2, f.ax, f.ay);
        }
      }
    };

    // Build the neighbouring galaxies' stars while the browser is idle, so flying to
    // the next stop doesn't have to generate them on the spot.
    const warm = () => {
      cancelIdle(warmHandle);
      warmHandle = idle(() => {
        for (const i of [bodies.index + 1, bodies.index - 1]) {
          const g = galaxies[i];
          if (g) getShape(g.shape);
        }
      });
    };

    // The galaxy changed: the one we were at becomes `from`, the new one comes in from afar.
    const retarget = () => {
      if (target.current.index === bodies.index) {
        // same galaxy; keep its anchor current if the layout moved
        bodies.to.ax = target.current.ax;
        bodies.to.ay = target.current.ay;
        return;
      }
      bodies.index = target.current.index;
      bodies.dx = target.current.dx;
      bodies.dy = target.current.dy;
      if (reduce) {
        bodies.from = null;
        bodies.to = snap();
        bodies.t = 1;
      } else {
        bodies.from = bodies.t < 1 ? null : bodies.to;
        bodies.to = snap();
        bodies.t = 0;
      }
      warm();
    };

    // One galaxy: the baked picture, then its glints.
    const galaxy = (body, x, y, scale, alpha) => {
      if (alpha < 0.01 || scale < 0.01) return;
      const R = reach * 0.2 * scale; // CSS px per galaxy radius
      const half = FULL * R;
      const turn = spin * body.rot;

      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(body.tilt);
      ctx.scale(1, body.flat);
      ctx.rotate(turn);
      ctx.drawImage(body.sprite, -half, -half, half * 2, half * 2);
      ctx.restore();

      const glints = body.glints;
      if (!glints.length) return;
      const sizeK = Math.min(1, scale + 0.3);
      const cosT = Math.cos(body.tilt);
      const sinT = Math.sin(body.tilt);
      const cosS = Math.cos(turn);
      const sinS = Math.sin(turn);
      for (const p of glints) {
        const gx = p.x * cosS - p.y * sinS;
        const gy = (p.x * sinS + p.y * cosS) * body.flat;
        const px = x + (gx * cosT - gy * sinT) * R;
        const py = y + (gx * sinT + gy * cosT) * R;
        // a very gentle shimmer: each glint dims by at most ~25% on its own slow beat
        const tw = 0.78 + 0.22 * Math.sin(clock * p.speed + p.phase);
        ctx.globalAlpha = Math.min(1, p.bright * (1 - 0.3 * p.k) * 0.85) * tw * alpha;
        const len = (3.5 + p.size * 2.6) * sizeK;
        ctx.drawImage(body.glint, px - len, py - len, len * 2, len * 2);
      }
    };

    const draw = () => {
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, w, h);
      // Flying between galaxies along (dx, dy): the new one comes in from ahead,
      // the old one drops away behind.
      const e = easeInOut(bodies.t);
      const run = reach * 1.15;
      if (bodies.from && bodies.t < 1) {
        const f = bodies.from;
        galaxy(
          f,
          f.ax * w - bodies.dx * run * e,
          f.ay * h - bodies.dy * run * e,
          1 - 0.2 * e,
          Math.pow(1 - e, 1.3),
        );
      }
      const t = bodies.to;
      galaxy(
        t,
        t.ax * w + bodies.dx * run * (1 - e),
        t.ay * h + bodies.dy * run * (1 - e),
        0.6 + 0.4 * e,
        Math.min(1, e * 2.2),
      );

      // stars: slow drift, one fillStyle per brightness band
      ctx.globalAlpha = 1;
      const cx = w / 2;
      const cy = h / 2;
      for (let b = 0; b < 3; b += 1) {
        ctx.fillStyle = BANDS[b];
        for (const s of stars) {
          if (s.band !== b) continue;
          const x = cx + Math.cos(s.a) * s.r * reach;
          const y = cy + Math.sin(s.a) * s.r * reach;
          ctx.fillRect(x - s.half, y - s.half, s.half * 2, s.half * 2);
        }
      }
    };

    const frame = (now) => {
      raf = 0;
      if (!visible) return;
      raf = requestAnimationFrame(frame);
      // While a galaxy just sits there the movement is very slow, so skip frames.
      if (bodies.t >= 1 && last && now - lastDraw < settledGap) return;
      // First frame after (re)starting has no previous timestamp, so dt is tiny.
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
      last = now;
      lastDraw = now;

      retarget();
      bodies.t = Math.min(1, bodies.t + dt / TRAVEL_S);
      spin += dt * 0.12;
      clock += dt;

      for (const s of stars) {
        s.r += 0.012 * s.d * dt;
        if (s.r > 1) {
          s.r = Math.random() * 0.08;
          s.a = Math.random() * Math.PI * 2;
        }
      }
      draw();
    };

    const start = () => {
      if (reduce || raf) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    // Reduced motion: one still frame, redrawn when the galaxy or size changes.
    const still = () => {
      retarget();
      draw();
    };
    apiRef.current = { still: reduce ? still : null };

    resize();
    bodies.to = snap();
    if (reduce) still();
    else draw();
    warm();

    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) still();
      else if (!visible) draw();
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    io.observe(canvas);

    return () => {
      ro.disconnect();
      io.disconnect();
      cancelAnimationFrame(raf);
      cancelIdle(warmHandle);
      apiRef.current = null;
    };
  }, []);

  // Reduced motion has no loop, so repaint when the galaxy changes.
  useEffect(() => {
    apiRef.current?.still?.();
  }, [rgb, rgb2, shape, index, anchor.x, anchor.y, dir.x, dir.y]);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
