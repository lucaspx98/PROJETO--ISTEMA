// Ruído com semente (value noise + fbm) e gerador de números aleatórios determinístico.
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeNoise(seed) {
  const hash = (x, y) => {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed * 1442695041) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const fade = (t) => t * t * (3 - 2 * t);
  const value = (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const u = fade(x - xi);
    const v = fade(y - yi);
    const a = hash(xi, yi);
    const b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1);
    const d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  /** fbm em 0..1 */
  const fbm = (x, y, oct = 4) => {
    let amp = 0.5;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < oct; i++) {
      sum += value(x, y) * amp;
      norm += amp;
      amp *= 0.5;
      x *= 2.03;
      y *= 2.03;
    }
    return sum / norm;
  };
  return { value, fbm };
}

export const smoothstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
