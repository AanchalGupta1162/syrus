/**
 * Plain-three.js scene for the timeline starship (no React in here).
 *
 *  - Shows one of the 10 build-step models at a time.
 *  - Changing step plays a "scan" wipe along the hull: the new model is
 *    revealed behind a moving holo plane while the old one is clipped away,
 *    so the ship visibly gets built (or un-built when scrolling back up).
 *  - Auto-rotates by orbiting the camera; the visitor can drag to rotate.
 *    Zoom is off and touch uses `pan-y`, so the page always keeps scrolling.
 *  - Renders only while visible, DPR capped, models are loaded on demand.
 */
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  CircleGeometry,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Box3,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  Plane,
  PlaneGeometry,
  RingGeometry,
  Scene,
  SRGBColorSpace,
  Sphere,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const HOLO = 0x5fd4f0;
const PASS_ALL = 1e5; // clip-plane constant that never clips anything
const WIPE_MS = 1100;
const FOV = 30;

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function createShipScene(container, { steps, onStatus = () => {} }) {
  // Status updates from a scene that has been disposed must never reach the UI.
  let isDead = false;
  const emit = (s) => {
    if (!isDead) onStatus(s);
  };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lowEnd =
    (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;

  /* ---------- renderer / scene / camera ---------- */
  const renderer = new WebGLRenderer({
    antialias: !lowEnd,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1.25 : 1.75));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.style.cssText = "display:block;width:100%;height:100%;outline:none";
  container.appendChild(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 1, 1000);
  scene.add(camera);

  // Soft image-based light so dark metal parts still read.
  const pmrem = new PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.42;
  pmrem.dispose();

  // Lights ride with the camera so the ship is lit the same from every angle.
  scene.add(new HemisphereLight(0xcfe3ff, 0x161b28, 1.05));
  const key = new DirectionalLight(0xfff1d6, 2.6);
  key.position.set(-30, 40, 30);
  const keyTarget = new Object3D();
  keyTarget.position.set(0, 0, -40);
  camera.add(key, keyTarget);
  key.target = keyTarget;
  const rim = new DirectionalLight(HOLO, 1.5);
  rim.position.set(40, 10, -30);
  const rimTarget = new Object3D();
  rimTarget.position.set(0, 0, -40);
  camera.add(rim, rimTarget);
  rim.target = rimTarget;

  /* ---------- controls ---------- */
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.rotateSpeed = 0.7;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 1.6;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.maxPolarAngle = Math.PI * 0.62;
  // OrbitControls sets touch-action:none; let vertical swipes scroll the page.
  canvas.style.touchAction = "pan-y";

  let resumeTimer = 0;
  controls.addEventListener("start", () => {
    controls.autoRotate = false;
    clearTimeout(resumeTimer);
  });
  controls.addEventListener("end", () => {
    clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => {
      controls.autoRotate = !reduceMotion;
    }, 2200);
  });

  /* ---------- scan plane (the glowing wipe front) ---------- */
  const scanFill = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({
      color: HOLO,
      transparent: true,
      opacity: 0,
      side: DoubleSide,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  const scanEdge = new LineSegments(
    new EdgesGeometry(new PlaneGeometry(1, 1)),
    new LineBasicMaterial({ color: HOLO, transparent: true, opacity: 0, depthWrite: false }),
  );
  scanFill.rotation.y = Math.PI / 2;
  scanEdge.rotation.y = Math.PI / 2;
  scanFill.visible = scanEdge.visible = false;
  scene.add(scanFill, scanEdge);

  /* ---------- state ---------- */
  const loader = new GLTFLoader();
  const models = new Map(); // index -> { root, plane }
  const pending = new Map(); // index -> Promise
  let current = -1; // index fully shown
  let wanted = -1; // index we're heading to
  let transition = null;
  let bounds = null; // { center, radius, minX, maxX, minY }
  let disposed = false;
  let running = false;
  let inView = false;
  let raf = 0;
  let last = 0;

  function applyBounds(box) {
    const center = box.getCenter(new Vector3());
    const sphere = box.getBoundingSphere(new Sphere());
    bounds = {
      center,
      radius: sphere.radius,
      minX: box.min.x,
      maxX: box.max.x,
      minY: box.min.y,
    };
    controls.target.copy(center);
    scanFill.scale.set(1, bounds.radius * 0.95, bounds.radius * 0.8);
    scanEdge.scale.copy(scanFill.scale);
    scanFill.position.set(0, center.y, center.z);
    scanEdge.position.copy(scanFill.position);

    // Hologram base: two thin rings and a faint disc under the ship.
    const baseY = box.min.y - 2.5;
    const ringMat = (o) =>
      new MeshBasicMaterial({
        color: HOLO,
        transparent: true,
        opacity: o,
        side: DoubleSide,
        depthWrite: false,
        blending: AdditiveBlending,
      });
    const r = bounds.radius;
    const rings = [
      [r * 0.98, r * 0.986, 0.55],
      [r * 0.68, r * 0.684, 0.3],
    ];
    rings.forEach(([a, b, o]) => {
      const m = new Mesh(new RingGeometry(a, b, 128), ringMat(o));
      m.rotation.x = -Math.PI / 2;
      m.position.set(center.x, baseY, center.z);
      scene.add(m);
    });
    const disc = new Mesh(new CircleGeometry(r * 0.98, 64), ringMat(0.035));
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(center.x, baseY - 0.05, center.z);
    scene.add(disc);

    // Start from a pleasant 3/4 view.
    const az = MathUtils.degToRad(38);
    const el = MathUtils.degToRad(24);
    camera.position
      .set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
      .multiplyScalar(100)
      .add(center);
    fit();
  }

  function fit() {
    if (!bounds) return;
    const vfov = MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const half = Math.min(vfov, hfov) / 2;
    const dist = (bounds.radius / Math.sin(half)) * 0.97;
    const dir = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(dir, dist);
    controls.minDistance = controls.maxDistance = dist;
    camera.far = dist * 4;
    camera.updateProjectionMatrix();
    controls.update();
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fit();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  /* ---------- loading ---------- */
  function load(i) {
    if (models.has(i)) return Promise.resolve(models.get(i));
    if (pending.has(i)) return pending.get(i);
    emit({ loading: true });
    const p = loader
      .loadAsync(steps[i].file)
      .then((gltf) => {
        if (disposed) return null;
        const root = gltf.scene;
        const plane = new Plane(new Vector3(1, 0, 0), PASS_ALL);
        root.traverse((o) => {
          if (o.isMesh || o.isLine || o.isLineSegments) {
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach((m) => {
              m.clippingPlanes = [plane];
            });
          }
        });
        root.visible = false;
        scene.add(root);
        root.updateMatrixWorld(true);
        if (!bounds) applyBounds(new Box3().setFromObject(root));
        const model = { root, plane };
        models.set(i, model);
        emit({ error: false });
        return model;
      })
      .catch((err) => {
        if (!disposed) {
          console.warn("[Syrus ship] model failed to load:", steps[i].file, err);
          emit({ error: "model" });
        }
        return null;
      })
      .finally(() => {
        pending.delete(i);
        if (!pending.size) emit({ loading: false });
      });
    pending.set(i, p);
    return p;
  }

  function setPlane(model, keepLowSide, front) {
    // keepLowSide: keep x <= front. Otherwise keep x >= front.
    if (keepLowSide) {
      model.plane.normal.set(-1, 0, 0);
      model.plane.constant = front;
    } else {
      model.plane.normal.set(1, 0, 0);
      model.plane.constant = -front;
    }
  }

  function finishTransition() {
    if (!transition) return;
    const { from, to } = transition;
    if (from) from.root.visible = false;
    to.plane.normal.set(1, 0, 0);
    to.plane.constant = PASS_ALL;
    scanFill.visible = scanEdge.visible = false;
    current = transition.toIndex;
    transition = null;
  }

  function begin(i, model) {
    finishTransition();
    const from = current >= 0 ? models.get(current) : null;
    if (!from || reduceMotion) {
      if (from) from.root.visible = false;
      model.plane.normal.set(1, 0, 0);
      model.plane.constant = PASS_ALL;
      model.root.visible = true;
      current = i;
      return;
    }
    model.root.visible = true;
    transition = {
      from,
      to: model,
      toIndex: i,
      forward: i > current,
      t0: performance.now(),
    };
    scanFill.visible = scanEdge.visible = true;
    // Make sure the first frame already has the right clipping.
    updateTransition(transition.t0);
  }

  function updateTransition(now) {
    if (!transition || !bounds) return;
    const p = Math.min(1, (now - transition.t0) / WIPE_MS);
    const e = easeInOut(p);
    const a = bounds.minX - 2;
    const b = bounds.maxX + 2;
    const front = transition.forward ? a + (b - a) * e : b - (b - a) * e;
    // New model sits behind the front, old model is what's ahead of it.
    setPlane(transition.to, transition.forward, front);
    setPlane(transition.from, !transition.forward, front);
    scanFill.position.x = scanEdge.position.x = front;
    const bell = Math.sin(Math.PI * p);
    scanFill.material.opacity = 0.22 * bell;
    scanEdge.material.opacity = 0.95 * bell;
    if (p >= 1) finishTransition();
  }

  function show(i) {
    if (i === wanted || i < 0 || i >= steps.length) return;
    wanted = i;
    load(i).then((model) => {
      if (!model || disposed || wanted !== i) return;
      begin(i, model);
      kick();
    });
    // Warm the cache for the next step so scrolling forward feels instant.
    if (i + 1 < steps.length) load(i + 1);
  }

  /* ---------- render loop ---------- */
  function frame(now) {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    updateTransition(now);
    controls.update(dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  function kick() {
    const should = inView && document.visibilityState === "visible" && !disposed;
    if (should && !running) {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } else if (!should && running) {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  const io = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      kick();
    },
    { threshold: 0 },
  );
  io.observe(container);
  const onVis = () => kick();
  document.addEventListener("visibilitychange", onVis);

  // A lost context (GPU switch, memory pressure) is usually restored by the
  // browser and three.js re-uploads everything on its own. Only give up if it
  // does not come back.
  let lostTimer = 0;
  const onLost = (e) => {
    e.preventDefault();
    clearTimeout(lostTimer);
    lostTimer = setTimeout(() => {
      if (!disposed) emit({ error: "context" });
    }, 4000);
  };
  const onRestored = () => {
    clearTimeout(lostTimer);
    emit({ error: false });
    kick();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  resize();

  return {
    show,
    dispose() {
      disposed = true;
      isDead = true;
      clearTimeout(lostTimer);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      running = false;
      cancelAnimationFrame(raf);
      clearTimeout(resumeTimer);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      controls.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
      envTex.dispose();
      renderer.dispose();
      // Free the GPU context right away so remounts (React dev double-mount,
      // hot reload) never pile up contexts until the browser evicts one.
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
