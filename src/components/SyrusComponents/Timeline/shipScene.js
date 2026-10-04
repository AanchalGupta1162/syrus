/**
 * Plain-three.js scene for the timeline starship (no React in here).
 *
 *  - Shows one of the 10 build-step models at a time.
 *  - Changing step crossfades to the next model (the new one fades in and grows
 *    in slightly), so each added part is clearly noticeable.
 *  - The ship turns on the spot to point at the visitor's cursor (setPointer). With no
 *    mouse (touch screens, cursor outside the window) it holds its flight heading
 *    instead (setHeading). There is no dragging, so touch never fights page scroll.
 *  - Renders only while visible, DPR capped, models are loaded on demand.
 */
import {
  ACESFilmicToneMapping,
  DirectionalLight,
  Group,
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

  /* ---------- camera ---------- */
  // Fixed camera looking at the middle of the model (set in applyBounds / fit).
  const target = new Vector3();

  /* ---------- heading ---------- */
  // The models' nose points along +z. pivot sits on the model's centre and turns
  // about the vertical axis, so the nose can be aimed at any direction on screen.
  const pivot = new Group();
  const holder = new Group();
  pivot.add(holder);
  scene.add(pivot);
  let yaw = 0;
  let yawTarget = 0;
  let yawSet = false;
  let headingYaw = 0; // where the flight is heading (used when there is no cursor)
  let pointer = null; // last mouse position { x, y } in client pixels, or null
  let aimYaw = null; // yaw towards the cursor, when there is one

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
    target.copy(center);
    pivot.position.set(center.x, 0, center.z);
    holder.position.set(-center.x, 0, -center.z);

    // Look down from the front and above: screen right is +x, screen down is +z.
    const az = 0;
    const el = MathUtils.degToRad(52);
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
    const dir = camera.position.clone().sub(target).normalize();
    camera.position.copy(target).addScaledVector(dir, dist);
    camera.far = dist * 4;
    camera.updateProjectionMatrix();
    camera.lookAt(target);
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
        holder.add(root);
        pivot.updateMatrixWorld(true);
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
    // Aim at the cursor from the middle of the viewer (re-read every frame, since the
    // ship also moves when it flies to the next galaxy and the page scrolls).
    if (pointer) {
      const r = container.getBoundingClientRect();
      const dx = pointer.x - (r.left + r.width / 2);
      const dy = pointer.y - (r.top + r.height / 2);
      // Right on top of the ship the angle is meaningless, so keep the last aim.
      if (dx * dx + dy * dy > 30 * 30) aimYaw = Math.atan2(dx, dy);
    }
    yawTarget = pointer && aimYaw !== null ? aimYaw : headingYaw;
    if (yawTarget !== yaw) {
      const diff = Math.atan2(Math.sin(yawTarget - yaw), Math.cos(yawTarget - yaw));
      const rate = pointer ? 8 : 3.5;
      yaw =
        reduceMotion || Math.abs(diff) < 0.002
          ? yawTarget
          : yaw + diff * (1 - Math.exp(-dt * rate));
      pivot.rotation.y = yaw;
    }
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

  // Turn the nose to point along the screen direction (dx right, dy down).
  function setHeading(dx, dy) {
    headingYaw = Math.atan2(dx, dy);
    if (!yawSet || reduceMotion) {
      yaw = pointer && aimYaw !== null ? aimYaw : headingYaw;
      pivot.rotation.y = yaw;
      yawSet = true;
    }
  }

  // Aim at a point in client pixels, or pass null to go back to the flight heading.
  function setPointer(x, y) {
    pointer = x === null ? null : { x, y };
    if (!pointer) aimYaw = null;
  }

  return {
    show,
    setHeading,
    setPointer,
    dispose() {
      disposed = true;
      isDead = true;
      clearTimeout(lostTimer);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
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
