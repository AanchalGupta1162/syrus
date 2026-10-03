/* eslint-disable react/prop-types -- internal component, props are fixed by Timeline.jsx */
import { useEffect, useRef, useState } from "react";
import { createShipScene, webglAvailable } from "./shipScene";
import styles from "./ShipViewer.module.css";

/**
 * 3D starship viewer. Shows the model for build step `index` and plays a
 * scan-wipe when the step changes. Loaded lazily by Timeline.jsx.
 */
export default function ShipViewer({ steps, index, galaxy, heading }) {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const indexRef = useRef(index);
  const [status, setStatus] = useState({ loading: true, error: false });
  const [moved, setMoved] = useState(false);
  // Only devices with a mouse can point the ship, so only they get the hint.
  const [hasMouse] = useState(
    () => typeof window.matchMedia === "function" && window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  );
  const [attempt, setAttempt] = useState(0);
  const [supported] = useState(() => webglAvailable());

  indexRef.current = index;
  const headingRef = useRef(heading);
  headingRef.current = heading;

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
    api.setHeading(headingRef.current.x, headingRef.current.y);
    api.show(indexRef.current);

    // The ship turns to face the mouse. Touch screens have no cursor, so they keep the
    // flight heading; leaving the window hands control back to it too.
    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      api.setPointer(e.clientX, e.clientY);
      setMoved(true);
    };
    const onLeave = () => api.setPointer(null);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onLeave);
      api.dispose();
      sceneRef.current = null;
    };
  }, [steps, supported, attempt]);

  useEffect(() => {
    sceneRef.current?.setHeading(heading.x, heading.y);
  }, [heading.x, heading.y]);

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
      role="img"
      aria-label={`3D model of the Syrus starship, build step ${index + 1} of ${steps.length}: ${steps[index].label}, in ${galaxy.name}. The ship turns to face your cursor.`}
    >
      <div ref={hostRef} className={styles.host} />

      {!failed && status.loading && (
        <span className={styles.loading} aria-hidden="true">
          <i /> Loading
        </span>
      )}

      {!failed && hasMouse && !moved && !status.loading && (
        <span className={styles.hint} aria-hidden="true">
          Move your cursor
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
