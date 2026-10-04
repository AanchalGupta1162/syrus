import { useEffect, useRef } from "react";
import styles from "./Starfield.module.css";

/**
 * Shared state: the intro writes `warp` (0 → 1) to speed the stars into
 * hyperspace streaks, and eases it back to 0 when the hero arrives.
 */
export const starState = { warp: 0 };

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);

function makeGlint(color) {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, `rgba(${color},1)`);
  grad.addColorStop(0.12, `rgba(${color},.55)`);
  grad.addColorStop(0.4, `rgba(${color},.08)`);
  grad.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  g.strokeStyle = `rgba(${color},.85)`;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(s / 2, 2);
  g.lineTo(s / 2, s - 2);
  g.moveTo(2, s / 2);
  g.lineTo(s - 2, s / 2);
  g.stroke();
  return c;
}

export default function Starfield() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: true });
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let last = 0;
    let running = true;

    const small = () => window.innerWidth < 700;
    const lowEnd =
      (navigator.hardwareConcurrency || 8) <= 4 ||
      (navigator.deviceMemory || 8) <= 4;

    const COLORS = [
      "232,226,208", // bone
      "232,226,208",
      "232,226,208",
      "255,232,31", // yellow
      "95,212,240", // holo
    ];

    // Static twinkling layer (positions stored as fractions of the screen).
    const starCount = small() ? (lowEnd ? 70 : 95) : lowEnd ? 110 : 170;
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: rand(0.35, 1.35),
      a: rand(0.35, 0.95),
      s: rand(0.6, 2.4),
      p: rand(0, TAU),
      c: COLORS[(Math.random() * COLORS.length) | 0],
    })).map((s) => ({ ...s, f: `rgb(${s.c})` })); // colour string built once, not every frame

    // A few larger "shining" stars with a four-point glint.
    const glintCount = small() ? 6 : 12;
    const glints = Array.from({ length: glintCount }, (_, i) => ({
      x: rand(0.04, 0.96),
      y: rand(0.04, 0.96),
      size: rand(14, 30),
      s: rand(0.5, 1.2),
      p: rand(0, TAU),
      tone: i % 4 === 0 ? 1 : 0,
    }));
    const glintSprites = [makeGlint("255,246,214"), makeGlint("150,228,250")];

    // Hyperspace particles (only drawn while warp > 0).
    const warpCount = small() ? 90 : lowEnd ? 110 : 170;
    const warpers = Array.from({ length: warpCount }, () => ({
      a: rand(0, TAU),
      r: rand(0.02, 1),
      v: rand(0.5, 1),
      c: Math.random() < 0.18 ? "150,228,250" : "232,226,208",
    }));

    let shooting = null;
    let nextShot = performance.now() + rand(3000, 7000);

    const resize = () => {
      // Phones draw at 1x: the stars are tiny, and it cuts the pixels to paint by half or more.
      dpr = Math.min(window.devicePixelRatio || 1, small() ? 1 : 1.5);
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      // Ignore small height changes (mobile browser bars show/hide).
      if (w && nw === w && Math.abs(nh - h) < 120) return;
      w = nw;
      h = nh;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduceMotion) draw(performance.now(), 0);
    };

    function draw(now, dt) {
      const t = now / 1000;
      const warp = reduceMotion ? 0 : starState.warp;
      ctx.clearRect(0, 0, w, h);

      // Static layer dims as the ship accelerates.
      const dim = 1 - warp * 0.75;

      for (const s of stars) {
        const tw = reduceMotion ? 0.8 : 0.55 + 0.45 * Math.sin(t * s.s + s.p);
        ctx.globalAlpha = s.a * tw * dim;
        ctx.fillStyle = s.f;
        if (s.r < 0.9) {
          ctx.fillRect(s.x * w, s.y * h, s.r * 1.6, s.r * 1.6);
        } else {
          ctx.beginPath();
          ctx.arc(s.x * w, s.y * h, s.r, 0, TAU);
          ctx.fill();
        }
      }

      for (const g of glints) {
        const pulse = reduceMotion ? 0.7 : 0.45 + 0.55 * Math.sin(t * g.s + g.p);
        const sz = g.size * (0.65 + 0.5 * pulse);
        ctx.globalAlpha = (0.3 + 0.6 * pulse) * dim;
        ctx.drawImage(
          glintSprites[g.tone],
          g.x * w - sz / 2,
          g.y * h - sz / 2,
          sz,
          sz,
        );
      }

      // Shooting star
      if (!reduceMotion && warp < 0.05) {
        if (!shooting && now > nextShot) {
          const fromLeft = Math.random() < 0.5;
          shooting = {
            x: rand(0.1, 0.9) * w,
            y: rand(0, 0.35) * h,
            vx: (fromLeft ? 1 : -1) * rand(520, 760),
            vy: rand(220, 360),
            life: 0,
            max: rand(0.7, 1.0),
          };
        }
        if (shooting) {
          shooting.life += dt;
          shooting.x += shooting.vx * dt;
          shooting.y += shooting.vy * dt;
          const k = shooting.life / shooting.max;
          if (k >= 1) {
            shooting = null;
            nextShot = now + rand(5000, 11000);
          } else {
            const len = 90;
            const nx = shooting.vx / Math.hypot(shooting.vx, shooting.vy);
            const ny = shooting.vy / Math.hypot(shooting.vx, shooting.vy);
            const grad = ctx.createLinearGradient(
              shooting.x,
              shooting.y,
              shooting.x - nx * len,
              shooting.y - ny * len,
            );
            grad.addColorStop(0, "rgba(255,246,214,0.9)");
            grad.addColorStop(1, "rgba(255,246,214,0)");
            ctx.globalAlpha = Math.sin(k * Math.PI);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(shooting.x, shooting.y);
            ctx.lineTo(shooting.x - nx * len, shooting.y - ny * len);
            ctx.stroke();
          }
        }
      }

      // Hyperspace streaks
      if (warp > 0.004) {
        const cx = w / 2;
        const cy = h * 0.5;
        const maxR = Math.hypot(cx, cy) * 1.05;
        ctx.lineCap = "round";
        for (const p of warpers) {
          p.r += (0.004 + p.r * 0.06) * p.v * warp * dt * 60;
          if (p.r > 1) {
            p.r = rand(0.01, 0.08);
            p.a = rand(0, TAU);
          }
          const r1 = p.r * maxR;
          const len = (4 + warp * warp * 150) * (0.25 + p.r) * p.v;
          const r0 = Math.max(0, r1 - len);
          const cos = Math.cos(p.a);
          const sin = Math.sin(p.a);
          ctx.globalAlpha = Math.min(1, 0.15 + warp * 0.9) * Math.min(1, p.r * 4);
          ctx.strokeStyle = `rgb(${p.c})`;
          ctx.lineWidth = 0.6 + warp * (0.7 + p.r * 1.6);
          ctx.beginPath();
          ctx.moveTo(cx + cos * r0, cy + sin * r0);
          ctx.lineTo(cx + cos * r1, cy + sin * r1);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    // On phones and low-end devices the twinkle is redrawn every other frame (about
    // 30 fps); it is slow enough that nobody can tell. The intro's hyperspace streaks
    // (warp > 0) still get every frame.
    const capped = small() || lowEnd;

    // On phones the page-wide stars hold still while the Timeline is on screen: that
    // section already has plenty moving (scrolling cards, BB-8), and a full-screen
    // canvas repainting behind it is what makes it stutter. The stars stay visible.
    let holdStill = false;
    let stillDrawn = false;
    let timelineIO = null;
    let lookups = 0;
    const watchTimeline = () => {
      if (timelineIO || !small()) return;
      const el = document.getElementById("timeline");
      if (!el) {
        lookups += 1;
        return;
      }
      timelineIO = new IntersectionObserver(([entry]) => {
        holdStill = entry.isIntersecting;
        stillDrawn = false;
      });
      timelineIO.observe(el);
    };

    const frame = (now) => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (!timelineIO && lookups < 40 && small()) watchTimeline();
      if (holdStill && starState.warp < 0.004) {
        if (!stillDrawn) {
          stillDrawn = true;
          last = now;
          draw(now, 0.016);
        }
        return;
      }
      if (capped && starState.warp < 0.004 && last && now - last < 30) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      draw(now, dt);
    };

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduceMotion && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    if (!reduceMotion) raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      timelineIO?.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className={styles.wrap} aria-hidden="true">
      <div className={styles.glow} />
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
