/* eslint-disable react/prop-types -- internal component, props are fixed by Timeline.jsx */
import { useEffect, useRef } from "react";
import { buildGalaxy } from "./galaxyShapes";
import styles from "./Starfield.module.css";

const STAR_COUNT = 150;
const TRAVEL_S = 1.3; // time to fly from one galaxy to the next

const parse = (rgb) => rgb.split(",").map((n) => Number(n.trim()));
const round = (v) => Math.round(v);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const mix = (a, b, k) => a.map((v, i) => round(v + (b[i] - v) * k));
const rgba = (c, a) => `rgba(${round(c[0])}, ${round(c[1])}, ${round(c[2])}, ${a})`;

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
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      a: Math.random() * Math.PI * 2,
      r: Math.random(),
      d: 0.3 + Math.random() * 0.7,
    }));
    // bodies.to is the galaxy we're at (or flying to); bodies.from is the one we left.
    const snap = () => ({
      c1: [...target.current.c1],
      c2: [...target.current.c2],
      ax: target.current.ax,
      ay: target.current.ay,
      ...buildGalaxy(target.current.shape),
    });
    const bodies = { index: target.current.index, from: null, to: snap(), t: 1, dx: 1, dy: 0 };
    let spin = 0;
    let clock = 0; // seconds, drives the twinkle
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let visible = false;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    };

    // One galaxy: a faint core glow plus its stars, in the shape's own proportions.
    const galaxy = (body, x, y, scale, alpha, reach) => {
      if (alpha < 0.01 || scale < 0.01) return;
      const R = reach * 0.2 * scale;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, R * 0.45);
      glow.addColorStop(0, `rgba(255, 255, 255, ${0.3 * alpha})`);
      glow.addColorStop(0.5, rgba(body.c1, 0.09 * alpha));
      glow.addColorStop(1, rgba(body.c1, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(x - R * 0.45, y - R * 0.45, R * 0.9, R * 0.9);

      const sizeK = Math.min(1, scale + 0.3);
      const cosT = Math.cos(body.tilt);
      const sinT = Math.sin(body.tilt);
      const turn = spin * body.rot;
      const cosS = Math.cos(turn);
      const sinS = Math.sin(turn);
      ctx.lineWidth = 0.7;
      for (const p of body.pts) {
        const gx = p.x * cosS - p.y * sinS;
        const gy = (p.x * sinS + p.y * cosS) * body.flat;
        const px = x + (gx * cosT - gy * sinT) * R;
        const py = y + (gx * sinT + gy * cosT) * R;

        // a very gentle shimmer: each star dims by at most ~25% on its own slow beat
        const tw = 0.78 + 0.22 * Math.sin(clock * p.speed + p.phase);
        const a = Math.min(1, p.bright * (1 - 0.3 * p.k)) * tw * alpha;
        const col = mix(mix(body.c1, body.c2, p.k), [255, 255, 255], p.sparkle ? 0.75 : 0.4);
        const r = p.size * sizeK;
        ctx.fillStyle = rgba(col, a);
        if (r < 1.1) {
          ctx.fillRect(px - r, py - r, r * 2, r * 2);
        } else {
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
        if (p.sparkle) {
          // steady four-point glint on the brighter stars
          const len = (3.5 + p.size * 2.6) * sizeK;
          ctx.strokeStyle = rgba(col, Math.min(1, a * 0.85));
          ctx.beginPath();
          ctx.moveTo(px - len, py);
          ctx.lineTo(px + len, py);
          ctx.moveTo(px, py - len);
          ctx.lineTo(px, py + len);
          ctx.stroke();
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const reach = Math.hypot(w, h) / 2;
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
          reach,
        );
      }
      const t = bodies.to;
      galaxy(
        t,
        t.ax * w + bodies.dx * run * (1 - e),
        t.ay * h + bodies.dy * run * (1 - e),
        0.6 + 0.4 * e,
        Math.min(1, e * 2.2),
        reach,
      );

      // stars: slow drift
      const cx = w / 2;
      const cy = h / 2;
      for (const s of stars) {
        const x = cx + Math.cos(s.a) * s.r * reach;
        const y = cy + Math.sin(s.a) * s.r * reach;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.25 + 0.55 * s.d})`;
        ctx.beginPath();
        ctx.arc(x, y, 0.5 + s.d * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const frame = (now) => {
      raf = 0;
      if (!visible) return;
      // First frame after (re)starting has no previous timestamp, so dt is tiny.
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;

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
      raf = requestAnimationFrame(frame);
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
    if (reduce) still();
    else draw();

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
      apiRef.current = null;
    };
  }, []);

  // Reduced motion has no loop, so repaint when the galaxy changes.
  useEffect(() => {
    apiRef.current?.still?.();
  }, [rgb, rgb2, shape, index, anchor.x, anchor.y, dir.x, dir.y]);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
