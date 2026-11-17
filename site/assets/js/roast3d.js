// The roast: four batches of one procedural coffee bean under one temperature slider (the owner, 2026-11-17).
// All four heat together; each is pulled at its stage (raw, first crack, 210 C, second crack) and holds, so the
// slider shows the change and its end shows the four roasts side by side. No bean ever turns. The grains gather
// into the beans once, as the section arrives. three r185 (vendored, loaded only near the section).
// Skills applied: damped-scroll-progress (a critically damped spring on the slider value, render on demand),
// adaptive-render-quality (EMA + hysteresis, sharp at rest), three-pmrem-async-warmup.
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/addons/RoomEnvironment.js';
import { state, clamp01, smooth, mix, hash, delayAt, FLIGHT, REVEAL_GLSL, degreeAt } from './roast-state.js';

// One row per roast degree (0 green .. 3 dark). Colours are sRGB; three converts them.
const LOOKS = [
  { bean: '#7a8065', crease: 1.25, rough: 0.78, coat: 0.0 },
  { bean: '#9a683c', crease: 1.15, rough: 0.62, coat: 0.04 },
  { bean: '#5c361d', crease: 0.75, rough: 0.46, coat: 0.18 },
  { bean: '#22140b', crease: 0.55, rough: 0.24, coat: 0.7 },
];
const LIGHT = [
  { key: '#eef1ff', rim: '#cdd6ff', rimI: 1.2, env: 0.8 },
  { key: '#fff0dc', rim: '#ffd7aa', rimI: 1.5, env: 0.7 },
  { key: '#ffd9ac', rim: '#ffab6e', rimI: 2.0, env: 0.6 },
  { key: '#ffc596', rim: '#ff8a4c', rimI: 2.8, env: 0.55 },
];
const lerpRow = (rows, x) => {
  const i = Math.min(rows.length - 2, Math.floor(x)), f = x - i, a = rows[i], b = rows[i + 1], o = {};
  for (const k of Object.keys(a)) o[k] = typeof a[k] === 'string' ? new THREE.Color(a[k]).lerp(new THREE.Color(b[k]), f) : mix(a[k], b[k], f);
  return o;
};
const smoother = (u) => { u = clamp01(u); return u * u * u * (u * (u * 6 - 15) + 10); };
const easeOut = (u) => 1 - (1 - u) ** 3;

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

export async function mount(section) {
  const stage = section.querySelector('.roast__stage');
  const canvas = section.querySelector('.roast__canvas');
  const glow = section.querySelector('.roast__glow');
  const range = section.querySelector('#roast-temp');
  const slots = [...section.querySelectorAll('[data-bean-slot]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const qa = new URLSearchParams(location.search).has('qa');

  // Guide 7.1: one WebGL renderer off screen, each frame copied into the page's 2D canvas (WebKit stopped presenting
  // an in-page WebGL canvas after a resize).
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
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  let W = 1, H = 1;
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

  // one unit is one CSS pixel; an orthographic camera, so the four beans in the row look alike (no perspective skew)
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -4000, 4000);
  camera.position.set(0, 0, 1000);
  camera.lookAt(0, 0, 0);

  const hemi = new THREE.HemisphereLight(0xfff6ea, 0x1b1b19, 0.45); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2); rim.position.set(3.5, 2.5, -4); scene.add(rim);
  const kicker = new THREE.DirectionalLight(0xffffff, 0.5); kicker.position.set(4, -2, 3); scene.add(kicker);

  await yieldTask();
  const beanGeo = beanGeometry(touch);
  const bump = noiseTexture();
  await yieldTask();
  const fragGeo = new THREE.IcosahedronGeometry(1, 1);
  const FRAGS = touch ? 260 : 480;                       // per bean
  const pos = beanGeo.attributes.position, nrm = beanGeo.attributes.normal;
  const beans = state(0).poses.map((pose, b) => {
    const creaseU = { value: 1 }, revealU = { value: 1 };
    const mat = new THREE.MeshPhysicalMaterial({ roughness: 0.7, clearcoat: 0, clearcoatRoughness: 0.3,
      bumpMap: bump, bumpScale: 1.6, sheen: 0.12, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xfff2e0) });
    // the fill-in: the same formula as delayAt in roast-state.js, so the surface appears where its grains land
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uCrease = creaseU; sh.uniforms.uReveal = revealU;
      sh.vertexShader = 'attribute float crease;\nvarying float vCrease;\nvarying vec3 vObj;\n' +
        sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCrease = crease;\nvObj = position;');
      sh.fragmentShader = 'uniform float uCrease;\nuniform float uReveal;\nvarying float vCrease;\nvarying vec3 vObj;\n' + REVEAL_GLSL +
        sh.fragmentShader
          .replace('void main() {', `void main() {
  if (uReveal < 1.0 && uReveal < dnDelay(vObj) + ${FLIGHT.toFixed(4)}) discard;`)
          .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(1.0, uCrease, clamp(vCrease, 0.0, 1.0));');
    };
    const mesh = new THREE.Mesh(beanGeo, mat);
    mesh.rotation.set(pose.x, pose.y, pose.z);
    scene.add(mesh);
    // its grains: green chips flying to points on its own surface, in its own space
    const frags = new THREE.InstancedMesh(fragGeo, new THREE.MeshStandardMaterial({ color: new THREE.Color(LOOKS[0].bean), roughness: 0.85 }), FRAGS);
    frags.frustumCulled = false;
    const data = [], tint = new THREE.Color();
    for (let k = 0; k < FRAGS; k++) {
      const vi = Math.floor(hash(k + b * 997, 13.1, 2.7) * pos.count);
      const target = new THREE.Vector3().fromBufferAttribute(pos, vi);
      const normal = new THREE.Vector3().fromBufferAttribute(nrm, vi);
      const dir = normal.clone().add(new THREE.Vector3(hash(k, b, 7) - 0.5, hash(k, b, 8) - 0.5, hash(k, b, 9) - 0.5).multiplyScalar(1.6)).normalize();
      data.push({ target, start: target.clone().addScaledVector(dir, 0.45 + hash(k, b, 1) * 0.9), delay: delayAt(target.x, target.y, target.z),
        size: 0.012 + hash(k, b, 2) * 0.022, spin: new THREE.Vector3(hash(k, 6, b), hash(k, 7, b), hash(k, 8, b)).multiplyScalar(6), swirl: (hash(k, 9, b) - 0.5) * 2.4 });
      frags.setColorAt(k, tint.set(LOOKS[0].bean).multiplyScalar(1.5 + hash(k, 3, b) * 0.4));
    }
    mesh.add(frags);
    return { mesh, mat, creaseU, revealU, frags, data };
  });
  await yieldTask();

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eul = new THREE.Euler(), sc = new THREE.Vector3(), at = new THREE.Vector3();
  let lastAssemble = -1;
  function placeFragments(a) {
    if (a === lastAssemble) return;
    lastAssemble = a;
    for (const bean of beans) {
      bean.frags.visible = a < 1;
      bean.revealU.value = a;
      if (a >= 1) continue;
      bean.data.forEach((f, k) => {
        const u = clamp01((a - f.delay) / FLIGHT), e = easeOut(u);
        at.lerpVectors(f.start, f.target, e);
        const ang = f.swirl * (1 - e), c = Math.cos(ang), s = Math.sin(ang);
        at.set(at.x * c - at.y * s, at.x * s + at.y * c, at.z);
        eul.set(f.spin.x * (1 - e), f.spin.y * (1 - e), f.spin.z * (1 - e)); q.setFromEuler(eul);
        const size = f.size * (1 - smooth((u - 0.82) / 0.18));
        sc.set(size * 1.4, size * 0.7, size);
        m4.compose(at, q, sc); bean.frags.setMatrixAt(k, m4);
      });
      bean.frags.instanceMatrix.needsUpdate = true;
    }
  }

  // a wisp of smoke over the dark batch near second crack
  const puffMat = new THREE.SpriteMaterial({ map: puffTexture(), color: 0xebe7df, transparent: true, opacity: 0, depthWrite: false });
  const puffs = Array.from({ length: 4 }, () => { const s = new THREE.Sprite(puffMat); scene.add(s); return s; });

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

  // ---- layout: each bean sits over its slot (the slots are the HTML grid with the captions under them)
  const homes = beans.map(() => new THREE.Vector3());
  let beanScale = 100;
  function layout() {
    W = stage.clientWidth; H = stage.clientHeight;
    camera.left = -W / 2; camera.right = W / 2; camera.top = H / 2; camera.bottom = -H / 2; camera.updateProjectionMatrix();
    const box = stage.getBoundingClientRect();
    slots.forEach((el, k) => {
      const r = el.getBoundingClientRect();
      homes[k].set(r.left + r.width / 2 - box.left - W / 2, -(r.top + r.height / 2 - box.top - H / 2), 0);
      beans[k].mesh.position.copy(homes[k]);
    });
    beanScale = slots[0].getBoundingClientRect().width * 0.42;
    beans.forEach((b) => b.mesh.scale.setScalar(beanScale));
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

  // ---- apply one state (pure in the slider value u and the assembly a)
  let lastGlow = '';
  function apply(u, a) {
    const st = state(u, a);
    placeFragments(reduced ? 1 : st.assemble);
    beans.forEach((b, k) => {
      const look = lerpRow(LOOKS, st.beans[k]);
      b.mat.color.copy(look.bean); b.mat.roughness = look.rough; b.mat.clearcoat = look.coat;
      b.mat.sheen = 0.12 * (1 - st.beans[k] / 3);
      b.creaseU.value = look.crease;
    });
    const light = lerpRow(LIGHT, degreeAt(st.temp));
    key.color.copy(light.key); rim.color.copy(light.rim); rim.intensity = light.rimI;
    scene.environmentIntensity = light.env;
    hemi.intensity = mix(0.5, 0.32, degreeAt(st.temp) / 3);
    const dark = homes[3];
    puffs.forEach((s, k) => {
      // low and soft, inside the dark bean's own slot (a taller plume was cut by the canvas edge)
      const rise = st.smoke * (0.12 + k * 0.1) * beanScale;
      s.position.set(dark.x + Math.sin(k * 2.1) * 0.12 * beanScale, dark.y + 0.3 * beanScale + rise, 50);
      s.scale.setScalar((0.4 + k * 0.08 + st.smoke * 0.15) * beanScale);
    });
    puffMat.opacity = st.smoke * 0.18;
    const g = st.warm.toFixed(3);
    if (g !== lastGlow && glow) { glow.style.opacity = g; lastGlow = g; }
  }

  // ---- the slider value follows a critically damped spring (a tap on a mark glides there); render on demand
  const OMEGA = 12, ASSEMBLE_MS = 1800;
  let goalU = Number(range.value) || 0, shownU = goalU, vel = 0, raf = 0, last = 0, ready = false, dirty = true, sharpTimer = 0;
  let assembleStart = -1, assembled = reduced ? 1 : 0;
  function frame(now) {
    raf = 0;
    if (!ready || broken) return;
    const gap = last ? (now - last) / 1000 : 1 / 60;
    const dt = Math.min(0.1, gap > 0.25 ? 1 / 60 : Math.max(gap, 1 / 240));
    if (last && gap <= 0.25) sample(dt);
    last = now;
    if (reduced) { shownU = goalU; vel = 0; }
    else {
      const e0 = shownU - goalU, ex = Math.exp(-OMEGA * dt), k = (vel + OMEGA * e0) * dt;
      const err = (e0 + k) * ex; vel = (vel - OMEGA * k) * ex; shownU = goalU + err;
      if (Math.abs(err) < 1e-3 && Math.abs(vel) < 1e-2) { shownU = goalU; vel = 0; }
    }
    if (assembleStart >= 0 && assembled < 1) assembled = smoother((now - assembleStart) / ASSEMBLE_MS);
    apply(shownU, assembled);
    if (sharpLevel) { applySize(LEVELS[level]); sharpLevel = 0; }
    draw();
    dirty = false;
    if (vel !== 0 || shownU !== goalU || (assembleStart >= 0 && assembled < 1)) raf = requestAnimationFrame(frame);
    else { last = 0; clearTimeout(sharpTimer); sharpTimer = setTimeout(sharpPass, 140); }
  }
  const go = () => { if (!raf) raf = requestAnimationFrame(frame); };
  let sharpLevel = 0, active = false;
  function sharpPass() {
    if (!ready || raf || !active || broken) return;
    const full = Math.min(devicePixelRatio || 1, 3);
    if (full <= LEVELS[level] + 0.01) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (shownU !== goalU || vel !== 0) { go(); return; }
      applySize(full); apply(shownU, assembled); draw(); sharpLevel = full;
    });
  }
  section.addEventListener('roast:input', (e) => { goalU = e.detail.u; if (active) go(); });

  // ---- build, warm up, start
  layout(); applySize(LEVELS[level]);
  await yieldTask();
  try { await buildEnvironment(); } catch (e) { /* lights alone still read well */ }
  await yieldTask();
  placeFragments(0.5);                                   // compile with the grains and the cut-out on screen
  await renderer.compileAsync(scene, camera);
  await yieldTask();
  goalU = shownU = Number(range.value) || 0; lastAssemble = -1; apply(shownU, assembled); draw();
  if (broken) return null;
  ready = true; canvas.classList.add('is-ready');
  // the grains gather once, when a good part of the section is on screen
  new IntersectionObserver(([e]) => {
    active = e.isIntersecting;
    if (active && assembleStart < 0 && e.intersectionRatio >= 0.35) assembleStart = performance.now();
    if (active) { dirty = true; go(); }
  }, { threshold: [0, 0.35] }).observe(section);
  new ResizeObserver(() => { layout(); applySize(sharpLevel || LEVELS[level]); lastAssemble = -1; dirty = true; if (active) go(); }).observe(stage);
  sharpTimer = setTimeout(sharpPass, 140);

  const api = {
    get u() { return shownU; },
    get assembled() { return assembled; },
    get quality() { return { level, pixelRatio: renderer.getPixelRatio(), dpr: devicePixelRatio, locked: qa }; },
    _debug: { renderer, redraw: () => { apply(shownU, assembled); draw(); } },
    stepQuality() { if (level < LEVELS.length - 1) { level++; applySize(LEVELS[level]); sharpLevel = 0; dirty = true; go(); } },
    // resolves once the slider has settled and the grains have gathered (tests scroll the section in first)
    settled: () => new Promise((res) => { go(); let n = 0; const chk = () => (++n > 2 && !raf && shownU === goalU && assembled >= 1 ? setTimeout(res, 200) : requestAnimationFrame(chk)); requestAnimationFrame(chk); }),
  };
  window.__roast = api;
  return api;
}
