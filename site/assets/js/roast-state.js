// The still-life bean's state as a pure function of scroll progress p in [0, 1] (3D guide rule 3). No three.js
// here, so node --test can check it (tests/roast-state.test.mjs).
//
// The owner, 2026-11-17: "I don't need the bean to be turned around. I need him to be smooth", "on the beginning
// stage, it just appears like combining from the little particles", and then: no path, "just changing the color
// itself while scrolling". So: p 0 to ASSEMBLED_AT, green fragments gather into the bean; after that the bean
// holds one pose and only its roast changes, resting on each stage while its text is read.

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const mix = (a, b, t) => a + (b - a) * t;

/** One pose for the whole section: the flat face and its S-shaped cut toward the camera (pitch -90 deg), the length
 *  leaning 0.55 rad on a diagonal, rolled 0.3 rad so a little of the dome shows. The first pose (-0.95, 0.45, 0.35)
 *  rolled the bean about its length and left the cut on its edge; the owner asked to see the cut (2026-11-17). */
export const POSE = { x: -1.5708, y: 0.55, z: -0.3 };
export const ASSEMBLED_AT = 0.2;
/** Where each stage (green, light, medium, dark) is reached exactly. */
export const STAGE_P = [0, 1, 2, 3].map((k) => ASSEMBLED_AT + ((1 - ASSEMBLED_AT) * k) / 3);

export function state(p) {
  p = clamp01(p);
  const s = (clamp01((p - ASSEMBLED_AT) / (1 - ASSEMBLED_AT))) * 3;   // 0..3
  const i = Math.min(2, Math.floor(s));
  const stageX = s >= 3 ? 3 : i + smooth(s - i);                      // holds near each stage, eases between
  return {
    stageX,
    rotX: POSE.x, rotY: POSE.y, rotZ: POSE.z,
    assemble: clamp01(p / ASSEMBLED_AT),                                // 0 scattered, 1 whole
    lift: Math.sin(p * Math.PI) * 0.05,                                 // a slow rise and settle, a few pixels, never a turn
    smoke: smooth((stageX - 2.55) / 0.45),                              // a wisp near second crack
    warm: smooth(stageX / 3),                                           // the light warms with the roast
  };
}

/** Under reduced motion the section snaps to the nearest stage (the bean already whole). */
export function snapReduced(raw) {
  let best = STAGE_P[0];
  for (const q of STAGE_P) if (Math.abs(q - raw) < Math.abs(best - raw)) best = q;
  return best;
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
