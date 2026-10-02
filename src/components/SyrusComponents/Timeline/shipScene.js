/**
 * Plain-three.js scene for the timeline starship (no React in here).
 *
 *  - Shows one of the 10 build-step models at a time.
 *  - Changing step crossfades to the next model (the new one fades in and grows
 *    in slightly), so each added part is clearly noticeable.
 *  - Auto-rotates by orbiting the camera; the visitor can drag to rotate.
 *    Zoom is off and touch uses `pan-y`, so the page always keeps scrolling.
 *  - Renders only while visible, DPR capped, models are loaded on demand.
 */
import {
  ACESFilmicToneMapping,
  DirectionalLight,
  Box3,
  HemisphereLight,
  MathUtils,
  Object3D,
  PerspectiveCamera,
  PMREMGenerator,
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
const FADE_MS = 750;
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

  /* ---------- state ---------- */
  const loader = new GLTFLoader();
  const models = new Map(); // index -> { root, mats, pos, scale }
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
  // `quiet` loads (background prefetch) never show the "Loading" badge. Only
  // models the visitor is actually waiting on are tracked in `blocking`.
  const blocking = new Set();
  function load(i, quiet = false) {
    if (models.has(i)) return Promise.resolve(models.get(i));
    if (!quiet && !blocking.has(i)) {
      blocking.add(i);
      emit({ loading: true });
    }
    if (pending.has(i)) return pending.get(i);
    const p = loader
      .loadAsync(steps[i].file)
      .then((gltf) => {
        if (disposed) return null;
        const root = gltf.scene;
        const mats = new Set();
        root.traverse((o) => {
          if (o.isMesh || o.isLine || o.isLineSegments) {
            (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m));
          }
        });
        root.visible = false;
        scene.add(root);
        root.updateMatrixWorld(true);
        if (!bounds) applyBounds(new Box3().setFromObject(root));
        const model = { root, mats: [...mats], pos: root.position.clone(), scale: root.scale.x };
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
        blocking.delete(i);
        emit({ loading: blocking.size > 0 });
      });
    pending.set(i, p);
    return p;
  }

  // Once the first model is up, pull in the rest two at a time so every later
  // step is already in memory (steps 8-10 are 1-2 MB each).
  let preloading = false;
  function preloadAll() {
    if (preloading) return;
    preloading = true;
    const queue = steps.map((_, k) => k).filter((k) => !models.has(k) && !pending.has(k));
    const worker = async () => {
      while (queue.length && !disposed) await load(queue.shift(), true);
    };
    worker();
    worker();
  }

  // Fade a whole model. Materials only go transparent while fading, so a settled
  // ship renders as a normal opaque model.
  function setFade(model, o) {
    for (const m of model.mats) {
      m.transparent = o < 1;
      m.opacity = o;
    }
  }

  // Grow the incoming model slightly about the ship's centre (s = 1 is settled).
  function setGrow(model, s) {
    model.root.scale.setScalar(model.scale * s);
    model.root.position.copy(model.pos);
    if (bounds) model.root.position.addScaledVector(bounds.center, 1 - s);
  }

  function finishTransition() {
    if (!transition) return;
    const { from, to } = transition;
    if (from && from !== to) {
      from.root.visible = false;
      setFade(from, 1);
    }
    setFade(to, 1);
    setGrow(to, 1);
    to.root.visible = true;
    current = transition.toIndex;
    transition = null;
  }

  function begin(i, model) {
    finishTransition();
    const from = current >= 0 ? models.get(current) : null;
    if (from === model) {
      // Already showing this model (a move to a stop whose model was still loading,
      // then back again). Nothing to fade between, and it must stay visible.
      setFade(model, 1);
      setGrow(model, 1);
      model.root.visible = true;
      current = i;
      return;
    }
    if (!from || reduceMotion) {
      if (from) from.root.visible = false;
      setFade(model, 1);
      setGrow(model, 1);
      model.root.visible = true;
      current = i;
      return;
    }
    model.root.visible = true;
    transition = { from, to: model, toIndex: i, t0: performance.now() };
    // Make sure the first frame already has the right fade.
    updateTransition(transition.t0);
  }

  function updateTransition(now) {
    if (!transition) return;
    const p = Math.min(1, (now - transition.t0) / FADE_MS);
    const e = easeInOut(p);
    setFade(transition.to, e);
    setFade(transition.from, 1 - e);
    setGrow(transition.to, 0.94 + 0.06 * e);
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
    // Next step first so it's ready, then everything else in the background.
    if (i + 1 < steps.length) load(i + 1, true);
    load(i).then(preloadAll);
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
