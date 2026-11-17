// The roast, as a still life: one procedural coffee bean on the page's dark studio ground. It gathers from green
// fragments as the section arrives, then holds one pose while scrolling turns its roast from green to dark.
// No path, no turning (the owner, 2026-11-17). three r185 (vendored, loaded only near the section).
// Skills applied: damped-scroll-progress (critically damped spring, pure state(p), render on demand),
// ios-sticky-stage (lvh stage, ResizeObserver sizing), adaptive-render-quality (EMA + hysteresis, sharp at rest),
// three-pmrem-async-warmup (GGX/blur materials compiled async before fromScene).
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/addons/RoomEnvironment.js';
import { state, snapReduced, clamp01, smooth, mix, hash, delayAt, FLIGHT, REVEAL_GLSL } from './roast-state.js';

// One row per roast stage. Colours are sRGB; three converts them.
const STAGES = [
  { bean: '#7a8065', crease: 1.25, rough: 0.78, coat: 0.0, key: '#eef1ff', rim: '#cdd6ff', rimI: 1.2, env: 0.8 },
  { bean: '#9a683c', crease: 1.15, rough: 0.62, coat: 0.04, key: '#fff0dc', rim: '#ffd7aa', rimI: 1.5, env: 0.7 },
  { bean: '#5c361d', crease: 0.75, rough: 0.46, coat: 0.18, key: '#ffd9ac', rim: '#ffab6e', rimI: 2.0, env: 0.6 },
  { bean: '#22140b', crease: 0.55, rough: 0.24, coat: 0.7, key: '#ffc596', rim: '#ff8a4c', rimI: 2.8, env: 0.55 },
];

function lerpStage(x) {
  const i = Math.min(2, Math.floor(x)), f = x - i, a = STAGES[i], b = STAGES[i + 1];
  const c = (k) => new THREE.Color(a[k]).lerp(new THREE.Color(b[k]), f);   // lerps in linear space
  return { bean: c('bean'), key: c('key'), rim: c('rim'), crease: mix(a.crease, b.crease, f), rough: mix(a.rough, b.rough, f),
    coat: mix(a.coat, b.coat, f), rimI: mix(a.rimI, b.rimI, f), env: mix(a.env, b.env, f) };
}

/** A coffee bean: a domed ellipsoid with a flat face and an S-shaped centre cut, with a darker crease. */
function beanGeometry(touch) {
  const g = new THREE.SphereGeometry(1, touch ? 112 : 160, touch ? 84 : 120);
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
const easeOut = (u) => 1 - (1 - u) ** 3;

export async function mount(section) {
  const stage = section.querySelector('.roastpath__stage');
  const canvas = section.querySelector('.roastpath__canvas');
  const warmLayer = section.querySelector('.roastpath__bg--warm');
  const steps = [...section.querySelectorAll('[data-roast-stage]')];
  const notes = [...section.querySelectorAll('[data-roast-note]')];
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
  let broken = false;
  const fallback = () => { broken = true; section.classList.add('roastpath--fallback'); };
  renderer.debug.onShaderError = (gl, program, vs, fs) => {
    fallback();
    console.warn('roast: shader failed, showing photographs', gl.getProgramInfoLog(program), gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs));
  };
  glCanvas.addEventListener('webglcontextlost', fallback);
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
  renderer.toneMappingExposure = 0.9;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  camera.position.set(0, 0, 7);
  camera.lookAt(0, 0, 0);
  const world = new THREE.Group(); scene.add(world);

  // studio light: a soft key from the upper left that warms with the roast, a rim behind that turns to ember and
  // keeps the dark bean's outline against the dark ground, and a low sky fill
  const hemi = new THREE.HemisphereLight(0xfff6ea, 0x1b1b19, 0.45); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2); rim.position.set(3.5, 2.5, -4); scene.add(rim);
  const kick = new THREE.DirectionalLight(0xffffff, 0.5); kick.position.set(4, -2, 3); scene.add(kick);

  await yieldTask();
  // the bean; its surface fills in cell by cell as its fragments land (uReveal < 1)
  const beanMat = new THREE.MeshPhysicalMaterial({ roughness: 0.7, clearcoat: 0, clearcoatRoughness: 0.3,
    bumpMap: noiseTexture(), bumpScale: 1.6, sheen: 0.12, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xfff2e0) });
  const creaseU = { value: 1 }, revealU = { value: 1 };
  beanMat.onBeforeCompile = (sh) => {
    sh.uniforms.uCrease = creaseU; sh.uniforms.uReveal = revealU;
    sh.vertexShader = 'attribute float crease;\nvarying float vCrease;\nvarying vec3 vObj;\n' +
      sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCrease = crease;\nvObj = position;');
    // the fill-in: the same formula as delayAt in roast-state.js, so the surface appears where its fragments land
    sh.fragmentShader = 'uniform float uCrease;\nuniform float uReveal;\nvarying float vCrease;\nvarying vec3 vObj;\n' + REVEAL_GLSL +
      sh.fragmentShader
        .replace('void main() {', `void main() {
  if (uReveal < 1.0 && uReveal < dnDelay(vObj) + ${FLIGHT.toFixed(4)}) discard;`)
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(1.0, uCrease, clamp(vCrease, 0.0, 1.0));');
  };
  const beanGeo = beanGeometry(touch);
  await yieldTask();
  const bean = new THREE.Mesh(beanGeo, beanMat);
  world.add(bean);

  // the fragments: small green chips, each flying to a point on the bean's surface (in the bean's own space,
  // so they follow its pose), landing as the surface fills in there
  const FRAGS = touch ? 800 : 1600;
  const fragMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(STAGES[0].bean), roughness: 0.85 });
  const frags = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), fragMat, FRAGS);
  frags.frustumCulled = false;
  const fragData = [];
  {
    const p = beanGeo.attributes.position, nrm = beanGeo.attributes.normal, tint = new THREE.Color();
    for (let k = 0; k < FRAGS; k++) {
      const vi = Math.floor(hash(k, 13.1, 2.7) * p.count);
      const target = new THREE.Vector3().fromBufferAttribute(p, vi);
      const normal = new THREE.Vector3().fromBufferAttribute(nrm, vi);
      const dir = normal.clone().add(new THREE.Vector3(hash(k, 1, 7) - 0.5, hash(k, 2, 8) - 0.5, hash(k, 3, 9) - 0.5).multiplyScalar(1.6)).normalize();
      const start = target.clone().addScaledVector(dir, 0.45 + hash(k, 4, 1) * 0.95);   // a cloud around the bean, clear of the text
      fragData.push({ target, start, delay: delayAt(target.x, target.y, target.z), size: 0.012 + hash(k, 5, 2) * 0.022,
        spin: new THREE.Vector3(hash(k, 6, 3), hash(k, 7, 4), hash(k, 8, 5)).multiplyScalar(6), swirl: (hash(k, 9, 6) - 0.5) * 2.4 });
      frags.setColorAt(k, tint.set(STAGES[0].bean).multiplyScalar(1.5 + hash(k, 3, 3) * 0.4));   // the lit bean's tone
    }
  }
  bean.add(frags);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eul = new THREE.Euler(), sc = new THREE.Vector3(), at = new THREE.Vector3();
  let lastAssemble = -1;
  function placeFragments(a) {
    if (a === lastAssemble) return;
    lastAssemble = a;
    frags.visible = a < 1;
    revealU.value = a;
    if (a >= 1) return;
    for (let k = 0; k < FRAGS; k++) {
      const f = fragData[k];
      const u = clamp01((a - f.delay) / FLIGHT), e = easeOut(u);
      at.lerpVectors(f.start, f.target, e);
      // a gentle swirl around the bean's long axis while in flight, none on landing
      const ang = f.swirl * (1 - e), c = Math.cos(ang), s = Math.sin(ang);
      at.set(at.x * c - at.y * s, at.x * s + at.y * c, at.z);
      eul.set(f.spin.x * (1 - e), f.spin.y * (1 - e), f.spin.z * (1 - e)); q.setFromEuler(eul);
      const size = f.size * (1 - smooth((u - 0.82) / 0.18));          // shrinks into the surface as it lands
      sc.set(size * 1.4, size * 0.7, size);
      m4.compose(at, q, sc); frags.setMatrixAt(k, m4);
    }
    frags.instanceMatrix.needsUpdate = true;
  }

  // a wisp of smoke near second crack
  const puffMat = new THREE.SpriteMaterial({ map: puffTexture(), color: 0xebe7df, transparent: true, opacity: 0, depthWrite: false });
  const puffs = Array.from({ length: 5 }, () => { const s = new THREE.Sprite(puffMat); world.add(s); return s; });

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

  // ---- layout: desktop sets the bean in the right half, a phone above the text
  let W = 1, H = 1, home = new THREE.Vector3(), beanScale = 1;
  const halfH = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  function layout() {
    W = stage.clientWidth; H = stage.clientHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    const vh = halfH() * 2, vw = vh * camera.aspect;
    if (W >= 1024) {
      home.set(vw * 0.23, -vh * 0.02, 0);
      beanScale = Math.min(1.0, vw * 0.2);
    } else {
      // the stage above the text block: the bean centred in the top 45% of the screen
      home.set(0, vh * 0.25, 0);
      beanScale = Math.min(vh * 0.16, vw * 0.36);
    }
    bean.scale.setScalar(beanScale);
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
  let lastWarm = '', lastStep = -1;
  const setOpacity = (el, o) => { const v = o.toFixed(3); if (el._o !== v) { el.style.opacity = v; el._o = v; } };
  function apply(p) {
    const st = state(p), look = lerpStage(st.stageX);
    bean.position.set(home.x, home.y + st.lift * beanScale, home.z);
    bean.rotation.set(st.rotX, st.rotY, st.rotZ);
    placeFragments(reduced ? 1 : st.assemble);
    beanMat.color.copy(look.bean);
    beanMat.roughness = look.rough; beanMat.clearcoat = look.coat;
    beanMat.sheen = 0.12 * (1 - st.stageX / 3);
    creaseU.value = look.crease;
    key.color.copy(look.key); rim.color.copy(look.rim); rim.intensity = look.rimI;
    scene.environmentIntensity = look.env;
    hemi.intensity = mix(0.5, 0.3, st.stageX / 3);
    puffs.forEach((s, k) => {
      const rise = st.smoke * (0.3 + k * 0.2) * beanScale;
      s.position.set(home.x + Math.sin(k * 2.1 + st.stageX) * 0.15 * beanScale, home.y + (0.55 + rise) * beanScale, home.z - 0.2);
      s.scale.setScalar((0.5 + k * 0.12 + st.smoke * 0.3) * beanScale);
    });
    puffMat.opacity = st.smoke * 0.22;
    const warm = st.warm.toFixed(3);
    if (warm !== lastWarm && warmLayer) { warmLayer.style.opacity = warm; lastWarm = warm; }
    // the list and the notes follow the same eased roast as the bean, continuously (no timed fades): the current
    // row at full strength, the others at 0.56 (5:1 on ink), each note fading out before the next fades in
    steps.forEach((el, k) => setOpacity(el, 0.56 + 0.44 * clamp01(1 - Math.abs(st.stageX - k) * 2)));
    notes.forEach((el, k) => setOpacity(el, clamp01(1 - Math.abs(st.stageX - k) * 2.2)));
    const step = Math.round(st.stageX);
    if (step !== lastStep) {
      steps.forEach((el, k) => { el.classList.toggle('is-on', k === step); if (k === step) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current'); });
      notes.forEach((el, k) => el.classList.toggle('is-on', k === step));
      lastStep = step;
    }
  }

  // ---- damped progress and render on demand (damped-scroll-progress)
  const OMEGA = 10;
  let goalP = 0, shownP = 0, vel = 0, raf = 0, last = 0, ready = false, dirty = true, sharpTimer = 0;
  const readScroll = () => {
    const span = section.offsetHeight - stage.clientHeight;
    const raw = clamp01((scrollY - section.offsetTop) / (span || 1));
    goalP = reduced ? snapReduced(raw) : raw;
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
  const go = () => { if (!raf) raf = requestAnimationFrame(frame); };
  // sharp at rest: one redraw at the full device pixel ratio, then back to the motion level
  let sharpLevel = 0, active = false;
  function sharpPass() {
    if (!ready || raf || !active || broken) return;
    const full = Math.min(devicePixelRatio || 1, 3);
    if (full <= LEVELS[level] + 0.01) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (shownP !== goalP || vel !== 0) { go(); return; }
      applySize(full); apply(shownP); draw(); sharpLevel = full;
    });
  }
  const onScroll = () => {
    if (!active) return;
    const before = goalP; readScroll();
    if (goalP !== before || shownP !== goalP || vel !== 0 || dirty) go();
  };

  // ---- build, warm up, start
  layout(); applySize(LEVELS[level]);
  await yieldTask();
  try { await buildEnvironment(); } catch (e) { /* lights alone still read well */ }
  await yieldTask();
  placeFragments(0.5);                                   // compile with the fragments and the cut-out on screen
  await renderer.compileAsync(scene, camera);
  await yieldTask();
  readScroll(); shownP = goalP; lastAssemble = -1; apply(shownP); draw();
  if (broken) return null;
  ready = true; canvas.classList.add('is-ready');
  addEventListener('scroll', onScroll, { passive: true });
  new IntersectionObserver(([e]) => { active = e.isIntersecting; if (active) { readScroll(); dirty = true; go(); } }).observe(section);
  new ResizeObserver(() => { layout(); applySize(sharpLevel || LEVELS[level]); readScroll(); lastAssemble = -1; dirty = true; if (active) go(); }).observe(stage);
  sharpTimer = setTimeout(sharpPass, 140);

  const api = {
    get p() { return shownP; },
    get quality() { return { level, pixelRatio: renderer.getPixelRatio(), dpr: devicePixelRatio, locked: qa }; },
    _debug: { renderer, redraw: () => { apply(shownP); draw(); }, sizes: () => ({ W, H, pr: renderer.getPixelRatio(), cw: canvas.width, ch: canvas.height }) },
    stepQuality() { if (level < LEVELS.length - 1) { level++; applySize(LEVELS[level]); sharpLevel = 0; dirty = true; go(); } },
    settled: () => new Promise((res) => { readScroll(); go(); let n = 0; const chk = () => (++n > 2 && !raf && shownP === goalP ? setTimeout(res, 200) : requestAnimationFrame(chk)); requestAnimationFrame(chk); }),
  };
  window.__roast = api;
  return api;
}
