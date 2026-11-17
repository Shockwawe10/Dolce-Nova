// The roast path: one procedural coffee bean travels a drawn path while the page scrolls, turning from green
// to dark as the light warms. three r185 (vendored, loaded only near the section).
// Skills applied: damped-scroll-progress (critically damped spring, pure state(p), render on demand),
// ios-sticky-stage (lvh stage, ResizeObserver sizing), adaptive-render-quality (EMA + hysteresis, sharp at rest),
// three-pmrem-async-warmup (GGX/blur materials compiled async before fromScene).
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/addons/RoomEnvironment.js';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const mix = (a, b, t) => a + (b - a) * t;

// One row per roast stage. Colours are sRGB; three converts them.
const STAGES = [
  { bean: '#7a8065', crease: 1.25, rough: 0.78, coat: 0.0, key: '#eef1ff', rim: '#cdd6ff', rimI: 0.5, env: 0.8, bg: 0 },
  { bean: '#9a683c', crease: 1.15, rough: 0.62, coat: 0.04, key: '#fff0dc', rim: '#ffd7aa', rimI: 0.9, env: 0.7, bg: 1 },
  { bean: '#5c361d', crease: 0.75, rough: 0.46, coat: 0.18, key: '#ffd9ac', rim: '#ff9a58', rimI: 1.4, env: 0.6, bg: 2 },
  { bean: '#22140b', crease: 0.55, rough: 0.24, coat: 0.7, key: '#ffb47c', rim: '#ff6a2c', rimI: 2.4, env: 0.5, bg: 3 },
];
const PATH = [[-0.55, 2.3, 0], [0.75, 1.35, 0.35], [-0.6, 0.35, -0.25], [0.7, -0.75, 0.2], [-0.45, -1.75, -0.1], [0.2, -2.5, 0]];

/** Pure state for scroll progress p in [0, 1]: the intro holds green, then four stages. */
export function state(p) {
  const s = Math.max(0, p * 4 - 1);                 // 0..3 across green, light, medium, dark
  const i = Math.min(2, Math.floor(s));
  const f = s >= 3 ? 1 : smooth(s - i);             // the bean settles at each stage, moves between them
  const stageX = i + f;                              // eased, 0..3
  return {
    stageX,
    t: 0.04 + (stageX / 3) * 0.9,                    // where on the path
    // the flat face and its cut turn toward the camera at green and dark, the dome in between
    rotY: 0.45 + stageX * 1.05, rotX: -1.0 + 1.75 * Math.sin((stageX * Math.PI) / 3), rotZ: 0.35,
    smoke: smooth((stageX - 2.55) / 0.45),           // second crack
    bg: [1 - smooth(stageX), smooth(stageX) - smooth(stageX - 1), smooth(stageX - 1) - smooth(stageX - 2), smooth(stageX - 2)],
  };
}

function lerpStage(x) {
  const i = Math.min(2, Math.floor(x)), f = x - i, a = STAGES[i], b = STAGES[i + 1];
  const c = (k) => new THREE.Color(a[k]).lerp(new THREE.Color(b[k]), f);   // lerps in linear space
  return { bean: c('bean'), key: c('key'), rim: c('rim'), crease: mix(a.crease, b.crease, f), rough: mix(a.rough, b.rough, f),
    coat: mix(a.coat, b.coat, f), rimI: mix(a.rimI, b.rimI, f), env: mix(a.env, b.env, f) };
}

function hash(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }

/** A coffee bean: a domed ellipsoid with a flat face and an S-shaped centre cut, with a darker crease. */
function beanGeometry(touch) {
  const g = new THREE.SphereGeometry(1, touch ? 96 : 144, touch ? 72 : 108);
  const pos = g.attributes.position, colors = new Float32Array(pos.count), v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let x = v.x * 0.64, y = v.y, z = v.z;
    const flatW = clamp01(-y / 0.55);                      // 0 on the dome, 1 on the flat face
    y = y < 0 ? y * 0.3 : y * 0.5;                         // dome 0.5 high, face nearly flat
    x += 0.05 * z * z;                                     // a slight kidney curve
    const dx = x - 0.06 * Math.sin(z * 2.7) - 0.05 * z * z;
    const groove = Math.exp(-(dx * dx) / (2 * 0.045 * 0.045)) * (1 - smooth((Math.abs(z) - 0.74) / 0.2)) * flatW;
    const lip = Math.exp(-(dx * dx) / (2 * 0.11 * 0.11)) * flatW * (1 - smooth((Math.abs(z) - 0.74) / 0.2));
    y += groove * 0.17 - lip * 0.02;                       // the cut pressed into the flat face, with raised lips
    const n = (hash(x, y, z) - 0.5) * 0.006;
    pos.setXYZ(i, x * (1 + n), y, z * (1 + n));
    colors[i] = groove;                                    // crease mask, read by the material's shader
  }
  g.setAttribute('crease', new THREE.BufferAttribute(colors, 1));
  g.computeVertexNormals();
  return g;
}

/** Tileable multi-octave value noise: soft wrinkles plus fine grain, for the bump map. */
function noiseTexture() {
  const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d'), img = ctx.createImageData(s, s);
  const lattice = (f, x, y) => hash(((x % f) + f) % f, ((y % f) + f) % f, f);
  const value = (f, u, v) => {
    const x = u * f, y = v * f, x0 = Math.floor(x), y0 = Math.floor(y), tx = smooth(x - x0), ty = smooth(y - y0);
    return mix(mix(lattice(f, x0, y0), lattice(f, x0 + 1, y0), tx), mix(lattice(f, x0, y0 + 1), lattice(f, x0 + 1, y0 + 1), tx), ty);
  };
  for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
    const u = i / s, v = j / s;
    const n = value(6, u, v) * 0.55 + value(12, u, v) * 0.3 + value(32, u, v) * 0.15;
    const w = Math.abs(n - 0.5) * 2;                     // ridged: wrinkles rather than blobs
    const g = 255 * (0.25 + 0.75 * (1 - w));
    img.data.set([g, g, g, 255], (j * s + i) * 4);
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
  return t;
}

function puffTexture() {
  const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d'), g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}

/** Give the main thread back between setup steps, so no single task runs long. */
const yieldTask = () => (globalThis.scheduler && scheduler.yield ? scheduler.yield() : new Promise((r) => setTimeout(r, 0)));

export async function mount(section) {
  const stage = section.querySelector('.roastpath__stage');
  const canvas = section.querySelector('.roastpath__canvas');
  const layers = [...section.querySelectorAll('.roastpath__bg')];
  const markersEl = [...section.querySelectorAll('[data-roast-stage]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const qa = new URLSearchParams(location.search).has('qa');

  // Guide 7.1: one WebGL renderer on a canvas that never enters the page; the visible canvas is 2D and the frame
  // is copied in with drawImage. Quality steps resize only the off-screen buffer. (WebKit stopped presenting an
  // in-page WebGL canvas after any resize; the buffer still held the bean: qa/roast-pixels.mjs found it.)
  const glCanvas = document.createElement('canvas');
  const view = canvas.getContext('2d');
  let renderer;
  try {
    if (!view) throw new Error('no 2d context');
    renderer = new THREE.WebGLRenderer({ canvas: glCanvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { section.classList.add('roastpath--fallback'); return null; }
  // a shader a strict GPU refuses must not leave a bare gradient: switch to the real roast photographs
  let broken = false;
  const fallback = () => { broken = true; section.classList.add('roastpath--fallback'); };
  renderer.debug.onShaderError = (gl, program, vs, fs) => {
    fallback();
    console.warn('roast path: shader failed, showing photographs', gl.getProgramInfoLog(program), gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs));
  };
  glCanvas.addEventListener('webglcontextlost', fallback);
  // draw = render off screen, then copy into the page's canvas in the same task (the buffer is not preserved)
  const REST_PX = 3.2e6;
  function sizeView() {
    let r = Math.min(devicePixelRatio || 1, 3);
    r = Math.min(r, Math.sqrt(REST_PX / (W * H)));
    const w = Math.round(W * r), h = Math.round(H * r);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }
  function draw() {
    renderer.render(scene, camera);
    view.clearRect(0, 0, canvas.width, canvas.height);
    view.drawImage(glCanvas, 0, 0, canvas.width, canvas.height);
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  camera.position.set(0, 0, 7);
  const world = new THREE.Group(); scene.add(world);

  // lights: a key that warms with the roast, a rim that turns to ember, a soft sky fill
  const hemi = new THREE.HemisphereLight(0xfff6ea, 0x1b1b19, 0.5); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1); rim.position.set(4, 1.5, -4); scene.add(rim);

  // the path, the progress drawn over it, and the four stage markers
  const curve = new THREE.CatmullRomCurve3(PATH.map((q) => new THREE.Vector3(...q)), false, 'centripetal');
  const TUBE_SEG = 360, RAD_SEG = 8;
  const tubeGeo = new THREE.TubeGeometry(curve, TUBE_SEG, 0.011, RAD_SEG, false);
  const ghost = new THREE.Mesh(tubeGeo, new THREE.MeshBasicMaterial({ color: 0x9a6a3a, transparent: true, opacity: 0.28, depthWrite: false }));
  const trail = new THREE.Mesh(tubeGeo.clone(), new THREE.MeshBasicMaterial({ color: 0x9a6a3a }));
  world.add(ghost, trail);
  const markerGeo = new THREE.SphereGeometry(0.045, 24, 16);
  const markers = STAGES.map((s, k) => {
    const m = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(s.bean) }));
    m.position.copy(curve.getPointAt(0.04 + (k / 3) * 0.9)); world.add(m); return m;
  });

  await yieldTask();
  // the bean
  const beanMat = new THREE.MeshPhysicalMaterial({ roughness: 0.7, clearcoat: 0, clearcoatRoughness: 0.3,
    bumpMap: noiseTexture(), bumpScale: 1.6, sheen: 0.12, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xfff2e0) });
  // the crease: lighter silverskin early in the roast, darker once the bean browns (uCrease > 1 lightens)
  const creaseU = { value: 1 };
  beanMat.onBeforeCompile = (sh) => {
    sh.uniforms.uCrease = creaseU;
    sh.vertexShader = 'attribute float crease;\nvarying float vCrease;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCrease = crease;');
    sh.fragmentShader = 'uniform float uCrease;\nvarying float vCrease;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(1.0, uCrease, clamp(vCrease, 0.0, 1.0));');
  };
  const beanGeo = beanGeometry(touch);
  await yieldTask();
  const bean = new THREE.Mesh(beanGeo, beanMat);
  bean.scale.setScalar(0.42);
  world.add(bean);
  await yieldTask();

  // chaff in the air at several depths (parallax only from the desktop camera's follow, never on touch)
  const SPECKS = 70, speckMat = new THREE.MeshBasicMaterial({ color: 0xd8d3c9, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
  const specks = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.03, 0.018), speckMat, SPECKS);
  const m4 = new THREE.Matrix4(), qn = new THREE.Quaternion(), e = new THREE.Euler();
  for (let k = 0; k < SPECKS; k++) {
    e.set(hash(k, 1, 2) * 6, hash(k, 3, 4) * 6, hash(k, 5, 6) * 6); qn.setFromEuler(e);
    const sc = 0.6 + hash(k, 7, 8) * 1.4;
    m4.compose(new THREE.Vector3((hash(k, 9, 1) - 0.5) * 7, (hash(k, 2, 9) - 0.5) * 7, -3.5 + hash(k, 4, 4) * 5), qn, new THREE.Vector3(sc, sc, sc));
    specks.setMatrixAt(k, m4);
  }
  world.add(specks);

  // smoke at second crack
  const puffMat = new THREE.SpriteMaterial({ map: puffTexture(), color: 0xebe7df, transparent: true, opacity: 0, depthWrite: false });
  const puffs = Array.from({ length: 6 }, () => { const s = new THREE.Sprite(puffMat); world.add(s); return s; });

  // environment for reflections, without the PMREM main-thread stall
  async function buildEnvironment() {
    const pm = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment(), size = touch ? 128 : 256;
    const tm = renderer.toneMapping, cs = renderer.outputColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    if (typeof pm._allocateTargets === 'function') {
      pm._setSize(size); const rt = pm._allocateTargets();
      const filters = new THREE.Scene();
      for (const m of [pm._ggxMaterial, pm._blurMaterial]) if (m) filters.add(new THREE.Mesh(pm._lodMeshes[0].geometry, m));
      renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
      await Promise.all([renderer.compileAsync(room, camera), renderer.compileAsync(filters, camera)]);
      renderer.outputColorSpace = cs; rt.dispose(); filters.clear();
    }
    const envRT = pm.fromScene(room, 0.04, 0.1, 100, { size });
    renderer.toneMapping = tm; scene.environment = envRT.texture; room.dispose(); pm.dispose();
  }

  // ---- layout: desktop keeps the bean on the right split and follows it; touch frames the whole path, camera still
  let W = 1, H = 1, follow = !touch, wide = true;
  const halfH = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  function layout() {
    W = stage.clientWidth; H = stage.clientHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    wide = W >= 1024;
    const vh = halfH() * 2, vw = vh * camera.aspect;
    if (wide) {
      world.scale.setScalar(1);
      world.position.set(vw * 0.19, 0, 0);
      bean.scale.setScalar(0.42);
      follow = !touch;
    } else {
      // the whole path between the header and the card: 12% to 66% of the stage height, camera still
      const s = (vh * 0.54) / 5.4;
      world.scale.setScalar(s);
      world.position.set(0, vh / 2 - vh * 0.39 - s * -0.1, 0);
      bean.scale.setScalar(0.6);
      follow = false;
    }
  }

  // ---- quality (adaptive-render-quality)
  const LEVELS = (touch ? [1.5, 1.25, 1.0, 0.85] : [2, 1.5, 1.25, 1.0]).map((l) => Math.min(l, devicePixelRatio || 1));
  let level = 0, ema = 16.7, slow = 0, fast = 0, lastUp = 0;
  function applySize(pr) { renderer.setPixelRatio(pr); renderer.setSize(W, H, false); sizeView(); }
  function sample(dt) {
    if (qa) return;
    ema += (dt * 1000 - ema) * 0.1;
    if (ema > 20) { slow++; fast = 0; } else if (ema < 13) { fast++; slow = 0; } else { slow = 0; fast = 0; }
    const now = performance.now();
    if (slow >= 12 && level < LEVELS.length - 1) { level++; applySize(LEVELS[level]); ema = 16.7; slow = 0; dirty = true; }
    else if (fast >= 240 && level > 0 && now - lastUp > 4000) { level--; applySize(LEVELS[level]); ema = 16.7; fast = 0; lastUp = now; dirty = true; }
  }

  // ---- apply one state (pure in p)
  const tmp = new THREE.Vector3();
  let lastBg = '';
  function apply(p) {
    const st = state(p), look = lerpStage(st.stageX);
    curve.getPointAt(st.t, tmp);
    bean.position.copy(tmp);
    bean.rotation.set(st.rotX, st.rotY, st.rotZ);
    beanMat.color.copy(look.bean).multiplyScalar(1);
    beanMat.roughness = look.rough; beanMat.clearcoat = look.coat;
    beanMat.sheen = 0.12 * (1 - st.stageX / 3);
    creaseU.value = look.crease;
    key.color.copy(look.key); rim.color.copy(look.rim); rim.intensity = look.rimI;
    scene.environmentIntensity = look.env;
    hemi.intensity = mix(0.55, 0.25, st.stageX / 3);
    const segs = Math.round(clamp01((st.t - 0.0) / 1) * TUBE_SEG);
    trail.geometry.setDrawRange(0, segs * RAD_SEG * 6);
    markers.forEach((m, k) => m.scale.setScalar(st.stageX >= k - 0.02 ? 1.5 : 1));
    puffs.forEach((s, k) => {
      const rise = st.smoke * (0.4 + k * 0.22);
      s.position.set(tmp.x + Math.sin(k * 2.1 + st.stageX) * 0.18, tmp.y + 0.25 + rise, tmp.z - 0.1);
      s.scale.setScalar(0.35 + k * 0.08 + st.smoke * 0.3);
    });
    puffMat.opacity = st.smoke * 0.32;
    speckMat.opacity = mix(0.35, 0.6, st.stageX / 3);
    camera.position.y = follow ? tmp.y * world.scale.y + world.position.y : 0;
    camera.lookAt(0, camera.position.y, 0);
    const bg = st.bg.map((o) => o.toFixed(3)).join();
    if (bg !== lastBg) { layers.forEach((el, k) => { el.style.opacity = st.bg[k].toFixed(3); }); lastBg = bg; }
    markersEl.forEach((el, k) => el.classList.toggle('is-on', Math.round(st.stageX) === k));
  }

  // ---- damped progress and render on demand (damped-scroll-progress)
  const OMEGA = 10;
  let goalP = 0, shownP = 0, vel = 0, raf = 0, last = 0, ready = false, dirty = true, sharpTimer = 0;
  const readScroll = () => {
    const span = section.offsetHeight - stage.clientHeight;
    const raw = clamp01((scrollY - section.offsetTop) / (span || 1));
    goalP = reduced ? Math.round(raw * 4) / 4 : raw;
  };
  function frame(now) {
    raf = 0;
    if (!ready || broken) return;
    const gap = last ? (now - last) / 1000 : 1 / 60;
    const dt = Math.min(0.1, gap > 0.25 ? 1 / 60 : Math.max(gap, 1 / 240));
    if (last && gap <= 0.25) sample(dt);
    last = now;
    if (reduced) { shownP = goalP; vel = 0; }
    else {
      const e0 = shownP - goalP, ex = Math.exp(-OMEGA * dt), k = (vel + OMEGA * e0) * dt;
      const err = (e0 + k) * ex; vel = (vel - OMEGA * k) * ex; shownP = goalP + err;
      if (Math.abs(err) < 1e-4 && Math.abs(vel) < 1e-3) { shownP = goalP; vel = 0; }
    }
    apply(shownP);
    if (sharpLevel) { applySize(LEVELS[level]); sharpLevel = 0; }   // back to the motion level, drawn this same frame
    draw();
    dirty = false;
    if (vel !== 0 || shownP !== goalP) raf = requestAnimationFrame(frame);
    else { last = 0; clearTimeout(sharpTimer); sharpTimer = setTimeout(sharpPass, 140); }
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  // sharp at rest: one redraw at the full device pixel ratio, then back to the motion level
  let sharpLevel = 0, active = false;
  // The resize and the redraw happen together inside an animation frame: setSize clears the canvas, and WebKit
  // showed a blank canvas when the pair ran from a timer (guide 13: a quality change must redraw).
  function sharpPass() {
    if (!ready || raf || !active || broken) return;
    const full = Math.min(devicePixelRatio || 1, 3);
    if (full <= LEVELS[level] + 0.01) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (shownP !== goalP || vel !== 0) { kick(); return; }   // motion resumed: the normal loop draws
      applySize(full); apply(shownP); draw(); sharpLevel = full;
    });
  }
  // render only while the section is on screen, and only when the progress actually moved
  const onScroll = () => {
    if (!active) return;
    const before = goalP; readScroll();
    if (goalP !== before || shownP !== goalP || vel !== 0 || dirty) kick();
  };

  // ---- build, warm up, start
  layout(); applySize(LEVELS[level]);
  await yieldTask();
  try { await buildEnvironment(); } catch (e) { /* lights alone still read well */ }
  await yieldTask();
  await renderer.compileAsync(scene, camera);
  await yieldTask();
  readScroll(); shownP = goalP; apply(shownP); draw();
  if (broken) return null;
  ready = true; canvas.classList.add('is-ready');
  addEventListener('scroll', onScroll, { passive: true });
  new IntersectionObserver(([e]) => { active = e.isIntersecting; if (active) { readScroll(); dirty = true; kick(); } }).observe(section);
  new ResizeObserver(() => { layout(); applySize(sharpLevel || LEVELS[level]); readScroll(); dirty = true; if (active) kick(); }).observe(stage);
  sharpTimer = setTimeout(sharpPass, 140);

  const api = {
    get p() { return shownP; },
    get quality() { return { level, pixelRatio: renderer.getPixelRatio(), dpr: devicePixelRatio, locked: qa }; },
    _debug: { renderer, redraw: () => { apply(shownP); draw(); }, sizes: () => ({ W, H, pr: renderer.getPixelRatio(), cw: canvas.width, ch: canvas.height }) },
    // test hook: one quality step down at rest, exactly as the adaptive loop would take it (it must redraw)
    stepQuality() { if (level < LEVELS.length - 1) { level++; applySize(LEVELS[level]); sharpLevel = 0; dirty = true; kick(); } },
    settled: () => new Promise((res) => { readScroll(); kick(); let n = 0; const chk = () => (++n > 2 && !raf && shownP === goalP ? setTimeout(res, 200) : requestAnimationFrame(chk)); requestAnimationFrame(chk); }),
  };
  window.__roast = api;
  return api;
}
