/* eslint-disable react/prop-types -- internal component, props are fixed by Timeline.jsx */
import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import { rollSeconds } from "./journey";
import styles from "./BB8.module.css";

// Orange panels around the ball; the one at the top is bigger so the
// rotation is easy to read while he rolls.
const SPOTS = Array.from({ length: 6 }, (_, k) => {
  const a = ((-90 + k * 60) * Math.PI) / 180;
  return { cx: 50 + 39 * Math.cos(a), cy: 50 + 39 * Math.sin(a), r: k === 0 ? 7.5 : 4.2 };
});

const SEAMS = Array.from({ length: 6 }, (_, k) => {
  const a = ((30 + k * 60) * Math.PI) / 180;
  return {
    x1: 50 + 27 * Math.cos(a),
    y1: 50 + 27 * Math.sin(a),
    x2: 50 + 34 * Math.cos(a),
    y2: 50 + 34 * Math.sin(a),
  };
});

function BodyArt() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="49" className={styles.skin} />
      <circle cx="50" cy="50" r="34" className={styles.seam} />
      {SEAMS.map((s, i) => (
        // fixed lists that never reorder, so the index is a safe key
        <line key={i} {...s} className={styles.seam} />
      ))}
      {SPOTS.map((s, i) => (
        <circle key={i} {...s} className={styles.orange} />
      ))}
      <circle cx="50" cy="50" r="24" className={styles.orangeRing} />
      <circle cx="50" cy="50" r="15" className={styles.steel} />
      <circle cx="50" cy="50" r="6.5" className={styles.orange} />
    </svg>
  );
}

function HeadArt() {
  return (
    <svg viewBox="0 0 60 38" aria-hidden="true" focusable="false">
      <g className={styles.antLong}>
        <line x1="33" y1="13" x2="34.5" y2="2" className={styles.antenna} />
        <circle cx="34.5" cy="2" r="1.3" className={styles.lens} />
      </g>
      <g className={styles.antShort}>
        <line x1="26" y1="14" x2="25" y2="7" className={styles.antenna} />
      </g>
      <clipPath id="bb8-dome">
        <path d="M4 37 A26 25 0 0 1 56 37 Z" />
      </clipPath>
      <path d="M4 37 A26 25 0 0 1 56 37 Z" className={styles.skin} />
      <g clipPath="url(#bb8-dome)">
        <rect x="0" y="29" width="60" height="4.5" className={styles.orange} />
        <rect x="0" y="24.6" width="60" height="1" className={styles.steel} />
        <rect x="0" y="35.4" width="60" height="2" className={styles.steel} />
      </g>
      <circle cx="38" cy="24" r="7" className={styles.eyeRing} />
      <circle cx="38" cy="24" r="4.3" className={styles.lens} />
      <circle cx="36.6" cy="22.6" r="1.2" className={styles.glint} />
      <circle cx="22" cy="22" r="3" className={styles.eyeRing} />
      <circle cx="22" cy="22" r="1.5" className={styles.lens} />
    </svg>
  );
}

/**
 * BB-8 rolls along the timeline rail to stop `index`.
 *
 * `x` is his live position in stop units (0 .. count-1). Everything visual is
 * derived from it: where he is, how far the ball has turned, how far his head
 * leans, and how much of the lane is lit behind him.
 *
 * onStep(n)    nearest stop to his live position, so dots can light as he passes
 * onArrive(i)  he has stopped at stop i; the ship and card build from here
 */
export default function BB8({ count, index, onStep, onArrive }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const laneRef = useRef(null);
  const ballRef = useRef(null);
  const size = useRef({ lane: 0, ball: 0 });
  const cb = useRef({ onStep, onArrive });
  cb.current = { onStep, onArrive };

  const [moving, setMoving] = useState(false);
  const [dir, setDir] = useState(1);
  const [pings, setPings] = useState(0);

  // hop + squash, played when he sets off and when he lands
  const hop = useMotionValue(0);
  const squash = useMotionValue(1);

  // Needed to turn distance travelled into degrees rolled (arc = radius * angle).
  useEffect(() => {
    const lane = laneRef.current;
    const ball = ballRef.current;
    if (!lane || !ball) return undefined;
    const measure = () => {
      size.current = { lane: lane.offsetWidth, ball: ball.offsetWidth };
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(lane);
    ro.observe(ball);
    return () => ro.disconnect();
  }, []);

  const pct = useTransform(x, (v) => `${(v / (count - 1)) * 100}%`);
  const spin = useTransform(x, (v) => {
    const { lane, ball } = size.current;
    if (!ball) return 0;
    return ((v * (lane / (count - 1))) / (ball / 2)) * (180 / Math.PI);
  });
  const velocity = useSpring(useVelocity(x), { stiffness: 220, damping: 28 });
  const tilt = useTransform(velocity, [-4, 4], [-14, 14]);

  useMotionValueEvent(x, "change", (v) => cb.current.onStep(Math.round(v)));

  useEffect(() => {
    const from = x.get();
    const dist = Math.abs(index - from);
    if (dist < 0.001) {
      cb.current.onArrive(index);
      return undefined;
    }
    setDir(index > from ? 1 : -1);
    setMoving(true);
    if (!reduce) {
      animate(hop, [0, -5, 0], { duration: 0.3, ease: "easeOut" });
      animate(squash, [1, 0.9, 1], { duration: 0.25 });
    }
    const controls = animate(x, index, {
      duration: reduce ? 0 : rollSeconds(dist),
      ease: [0.45, 0, 0.2, 1],
      onComplete: () => {
        setMoving(false);
        setPings((n) => n + 1);
        if (!reduce) {
          animate(hop, [0, 0, -11, 0], { duration: 0.55, times: [0, 0.15, 0.5, 1], ease: "easeOut" });
          animate(squash, [1, 0.84, 1.06, 1], { duration: 0.55, times: [0, 0.15, 0.6, 1] });
        }
        cb.current.onArrive(index);
      },
    });
    return () => controls.stop();
  }, [index, reduce, x, hop, squash]);

  return (
    <div ref={laneRef} className={styles.lane} aria-hidden="true">
      <div className={styles.track} />
      <motion.div className={styles.fill} style={{ width: pct }} />

      <motion.div
        className={styles.bb8}
        style={{ left: pct }}
        data-moving={moving}
        data-dir={dir}
      >
        <div className={styles.glow} />
        {pings > 0 && <span key={pings} className={styles.ping} />}

        <div className={styles.beam} />

        <motion.div className={styles.rider} style={{ y: hop, scaleY: squash }}>
          <motion.div ref={ballRef} className={styles.ball} style={{ rotate: spin }}>
            <BodyArt />
          </motion.div>
          <div className={styles.shade} />

          <motion.div className={styles.headTilt} style={{ rotate: reduce ? 0 : tilt }}>
            <div className={styles.bob}>
              <div className={styles.flip}>
                <HeadArt />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
