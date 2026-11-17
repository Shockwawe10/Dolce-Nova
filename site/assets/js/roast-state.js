// The roast as four batches under one temperature slider (the owner, 2026-11-17: "sliders that user can slide and
// see how coffee roasting changes ... four bins"). Pure functions of the slider position u (0..100) and the one-time
// assembly a (0..1), so node --test can check them (tests/roast-state.test.mjs; 3D guide rule 3).
//
// All four beans heat together; each batch is pulled at its own stage and then holds: one stays raw for comparison,
// one stops at first crack (light), one at 210 C (medium), one at second crack (dark). So sliding up shows the
// change, and the end of the slider shows the four roasts side by side. No bean ever turns.

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const mix = (a, b, t) => a + (b - a) * t;
const piecewise = (knots, x) => {
  if (x <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    const [x0, y0] = knots[i - 1], [x1, y1] = knots[i];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return knots.at(-1)[1];
};

/** Slider position (0..100) to bean temperature in C: stretched where the cracks are, so they are not crowded. */
const TEMP_KNOTS = [[0, 20], [20, 100], [40, 160], [60, 196], [75, 210], [90, 224], [100, 230]];
export const uToTemp = (u) => piecewise(TEMP_KNOTS, u);
export const tempToU = (t) => piecewise(TEMP_KNOTS.map(([u, T]) => [T, u]), t);
/** Where each batch is pulled: raw, light (first crack), medium, dark (second crack). */
export const STOPS = [20, 196, 210, 224];
export const NAMES = ['Green', 'Light', 'Medium', 'Dark'];
/** The slider's marks. */
export const TICKS = STOPS.map((temp, k) => ({ u: tempToU(temp), temp, name: NAMES[k] }));

/** Roast degree for a bean at a temperature: 0 green, 1 light, 2 medium, 3 dark (general roasting knowledge). */
const DEGREE_KNOTS = [[20, 0], [100, 0.06], [160, 0.4], [196, 1], [210, 2], [224, 3]];
export const degreeAt = (t) => piecewise(DEGREE_KNOTS, t);

/** What is happening at a temperature, for the note under the slider. */
const PHASES = [
  { from: -Infinity, name: 'Raw', note: 'Green coffee at room temperature: dense, grassy and about 11% water.' },
  { from: 40, name: 'Drying', note: 'The beans warm through and give up their water. Still green, still grassy.' },
  { from: 150, name: 'Yellowing', note: 'Sugars start to brown and the drum smells of bread and hay.' },
  { from: 190, name: 'First crack', note: 'The beans pop open. Pulled here, the light batch keeps its fruit and florals.' },
  { from: 205, name: 'Development', note: 'Sugars caramelise toward chestnut. Pulled at 210 °C, the medium batch is sweet and round.' },
  { from: 220, name: 'Second crack', note: 'Oils rise and the beans turn glossy: cocoa, smoke, a bitter edge. The dark batch is done.' },
];
export const phaseAt = (t) => PHASES.reduce((cur, p) => (t >= p.from ? p : cur), PHASES[0]);

/** One still pose per bean: the flat face and its S-shaped cut toward the camera, leaning on a diagonal, each
 *  rolled a little differently so the row looks like beans, not copies. */
export const POSES = [
  { x: -1.5708, y: 0.5, z: -0.3 }, { x: -1.5708, y: 0.62, z: -0.18 },
  { x: -1.5708, y: 0.46, z: -0.36 }, { x: -1.5708, y: 0.58, z: -0.24 },
];

export function state(u, assemble = 1) {
  const temp = uToTemp(Math.min(100, Math.max(0, u)));
  const beans = STOPS.map((stop) => degreeAt(Math.min(temp, stop)));
  return {
    temp,
    beans,
    done: STOPS.map((stop, k) => k === 0 || temp >= stop),
    poses: POSES,
    smoke: smooth((temp - 218) / 10),               // a wisp over the dark batch near second crack
    warm: smooth(degreeAt(temp) / 3),               // the light warms with the drum
    phase: phaseAt(temp),
    assemble: clamp01(assemble),
  };
}

/** The same hash in JS and in the bean's shader (GLSL), so each fragment lands where the surface fills in. */
export function hash(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
/** Smooth 3D value noise from that hash (trilinear, smoothstep weights). */
export function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const u = smooth(x - xi), v = smooth(y - yi), w = smooth(z - zi);
  const h = (i, j, k) => hash(xi + i, yi + j, zi + k);
  return mix(mix(mix(h(0, 0, 0), h(1, 0, 0), u), mix(h(0, 1, 0), h(1, 1, 0), u), v),
    mix(mix(h(0, 0, 1), h(1, 0, 1), u), mix(h(0, 1, 1), h(1, 1, 1), u), v), w);
}
// The fill-in pattern: soft patches (noise) with a little grain, so the surface grows like something gathering,
// not like tiles. delayAt (JS) and REVEAL_GLSL (the bean's shader) are the same formula.
export const PATCH = 3.2;           // patches per object unit
export const GRAIN = 26;            // grain cells per object unit
export const REVEAL_SPREAD = 0.55;  // the last point starts this far into the assembly
export const FLIGHT = 0.45;         // each fragment's flight, as a share of the assembly
const shape = (n, g) => clamp01((0.85 * n + 0.15 * g - 0.18) / 0.64);
/** When a point of the bean's surface (object space) fills in: its fragment lands at assembly = delay + FLIGHT. */
export const delayAt = (x, y, z) => shape(vnoise(x * PATCH, y * PATCH, z * PATCH), hash(Math.floor(x * GRAIN), Math.floor(y * GRAIN), Math.floor(z * GRAIN))) * REVEAL_SPREAD;
const f1 = (n) => n.toFixed(4);
export const REVEAL_GLSL = `
float dnH(vec3 c) { return fract(sin(dot(c, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float dnNoise(vec3 p) {
  vec3 i = floor(p), f = p - i, u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(dnH(i), dnH(i + vec3(1.0, 0.0, 0.0)), u.x), mix(dnH(i + vec3(0.0, 1.0, 0.0)), dnH(i + vec3(1.0, 1.0, 0.0)), u.x), u.y),
             mix(mix(dnH(i + vec3(0.0, 0.0, 1.0)), dnH(i + vec3(1.0, 0.0, 1.0)), u.x), mix(dnH(i + vec3(0.0, 1.0, 1.0)), dnH(i + vec3(1.0, 1.0, 1.0)), u.x), u.y), u.z);
}
float dnDelay(vec3 p) {
  float n = dnNoise(p * ${f1(PATCH)}), g = dnH(floor(p * ${f1(GRAIN)}));
  return clamp((0.85 * n + 0.15 * g - 0.18) / 0.64, 0.0, 1.0) * ${f1(REVEAL_SPREAD)};
}
`;
