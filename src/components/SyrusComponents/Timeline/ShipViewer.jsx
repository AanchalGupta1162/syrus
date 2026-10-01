/* eslint-disable react/prop-types -- internal component, props are fixed by Timeline.jsx */
import { useEffect, useRef, useState } from "react";
import { createShipScene, webglAvailable } from "./shipScene";
import styles from "./ShipViewer.module.css";

/**
 * 3D starship viewer. Shows the model for build step `index` and plays a
 * scan-wipe when the step changes. Loaded lazily by Timeline.jsx.
 */
export default function ShipViewer({ steps, index }) {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const indexRef = useRef(index);
  const [status, setStatus] = useState({ loading: true, error: false });
  const [touched, setTouched] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [supported] = useState(() => webglAvailable());

  indexRef.current = index;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !supported) return undefined;
    let api;
    setStatus({ loading: true, error: false });
    try {
      api = createShipScene(host, {
        steps,
        onStatus: (s) => setStatus((prev) => ({ ...prev, ...s })),
      });
    } catch (err) {
      console.warn("[Syrus ship] could not start the 3D viewer:", err);
      setStatus({ loading: false, error: "init" });
      return undefined;
    }
    sceneRef.current = api;
    api.show(indexRef.current);
    return () => {
      api.dispose();
      sceneRef.current = null;
    };
  }, [steps, supported, attempt]);

  useEffect(() => {
    sceneRef.current?.show(index);
  }, [index]);

  const failed = !supported || Boolean(status.error);
  const message = !supported || status.error === "init"
    ? "3D preview isn’t available in this browser. Check that hardware acceleration is on."
    : "The 3D model couldn’t be loaded.";

  return (
    <div
      className={styles.viewer}
      onPointerDown={() => setTouched(true)}
      role="img"
      aria-label={`Interactive 3D model of the Syrus starship, build step ${index + 1} of ${steps.length}: ${steps[index].label}. Drag to rotate.`}
    >
      <div ref={hostRef} className={styles.host} />

      <div className={styles.caption} aria-hidden="true">
        <span className={styles.kicker}>
          Build {String(index + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
        </span>
        <span key={index} className={styles.label}>
          {steps[index].label}
        </span>
      </div>

      {!failed && status.loading && (
        <span className={styles.loading} aria-hidden="true">
          <i /> Loading
        </span>
      )}

      {!failed && !touched && !status.loading && (
        <span className={styles.hint} aria-hidden="true">
          Drag to rotate
        </span>
      )}

      {failed && (
        <div className={styles.fallback} role="status">
          <p>{message}</p>
          {supported && (
            <button type="button" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
