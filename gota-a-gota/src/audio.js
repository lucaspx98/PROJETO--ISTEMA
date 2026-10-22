// Efeitos sonoros sintetizados com WebAudio (sem arquivos de áudio).
// Tudo afinado na escala pentatônica, então qualquer sequência de sons soa agradável.
import { Save } from './storage.js';

let ctx;
let noiseBuf;

export function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended' && !adPlaying) ctx.resume();
  return ctx;
}

// Dó maior pentatônico, duas oitavas
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0];

function tone(freq, dur, { type = 'sine', vol = 0.12, slideTo, delay = 0, attack = 0.005 } = {}) {
  if (Save.get('muted')) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur * 0.6);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Estalo curto de ruído filtrado: respingo e clique dos botões. */
function click(vol = 0.18, freq = 2500, delay = 0) {
  if (Save.get('muted')) return;
  const a = ac();
  if (!a) return;
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate * 0.05, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
  }
  const t = a.currentTime + delay;
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = 1.2;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

/** Bolha d'água: tom que sobe rápido. Gotas maiores = mais grave. */
function bloop(freq, vol = 0.14, delay = 0) {
  if (Save.get('muted')) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 2.2, t + 0.07);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + 0.15);
}

export const Sfx = {
  release: () => bloop(900, 0.05),
  merge: (units) => {
    bloop(520 / Math.sqrt(units), 0.16);
    bloop(780 / Math.sqrt(units), 0.06, 0.05);
  },
  fill: (n) => {
    bloop(260, 0.18);
    tone(PENTA[Math.min(n, PENTA.length - 1)], 0.5, { type: 'triangle', vol: 0.06, delay: 0.05 });
  },
  splash: () => {
    click(0.2, 1200);
    click(0.12, 2600, 0.03);
  },
  jarFull: (k = 0) =>
    [0, 2, 4, 5].forEach((s, i) => tone(PENTA[(k % 3) + s], 0.6, { vol: 0.09, delay: i * 0.07 })),
  /** Pote completo no arcade: a nota sobe a cada combo, como uma escada musical. */
  combo: (n) => {
    const k = Math.min(n - 1, PENTA.length - 1);
    bloop(300, 0.16);
    tone(PENTA[k], 0.35, { type: 'triangle', vol: 0.09, delay: 0.03 });
    tone(PENTA[k] * 2, 0.25, { vol: 0.03, delay: 0.03 });
    if (n >= 3) tone(PENTA[Math.min(k + 2, PENTA.length - 1)], 0.3, { type: 'triangle', vol: 0.06, delay: 0.1 });
  },
  levelUp: () => [0, 2, 4, 7, 9].forEach((s, i) => tone(PENTA[s], 0.3, { type: 'square', vol: 0.04, delay: i * 0.06 })),
  fever: () => {
    for (let i = 0; i < 10; i++) tone(PENTA[i], 0.25, { type: 'square', vol: 0.035, delay: i * 0.04 });
    tone(130.8, 1.2, { type: 'sawtooth', vol: 0.05, slideTo: 261.6 });
  },
  hurt: () => {
    tone(220, 0.35, { type: 'sawtooth', vol: 0.08, slideTo: 90 });
    click(0.2, 600);
  },
  record: () => [0, 4, 7, 9, 9].forEach((s, i) => tone(PENTA[s] * (i === 4 ? 2 : 1), 0.35, { type: 'triangle', vol: 0.08, delay: i * 0.08 })),
  nope: () => tone(160, 0.22, { type: 'triangle', vol: 0.14, slideTo: 110 }),
  win: () => {
    [0, 2, 4, 5, 7, 9].forEach((s, i) => tone(PENTA[s], 0.9, { type: 'triangle', vol: 0.08, delay: i * 0.09 }));
    [261.63, 329.63, 392.0].forEach((f) => tone(f, 1.6, { vol: 0.06, delay: 0.5, attack: 0.08 }));
  },
  tap: () => {
    tone(880, 0.06, { type: 'triangle', vol: 0.07 });
    click(0.05, 3000);
  },
  coin: () => {
    tone(1318.5, 0.08, { type: 'square', vol: 0.03 });
    tone(1760, 0.18, { type: 'square', vol: 0.03, delay: 0.06 });
  },
  buy: () => [0, 2, 4, 7].forEach((s, i) => tone(PENTA[s], 0.15, { type: 'triangle', vol: 0.08, delay: i * 0.07 })),
  unlock: () => ac(),
};

/**
 * Som contínuo do dedo no vidro: chiado macio de pano e um rangido leve quando o dedo vai rápido.
 * `set(intensidade 0..1)` a cada movimento; `stop()` quando o dedo sai.
 */
export const WipeSound = {
  nodes: null,
  start() {
    if (Save.get('muted') || this.nodes) return;
    const a = ac();
    if (!a) return;
    const buf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = a.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const bp = a.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400;
    bp.Q.value = 0.7;
    const ng = a.createGain();
    ng.gain.value = 0;
    noise.connect(bp).connect(ng).connect(a.destination);

    const squeak = a.createOscillator();
    squeak.type = 'triangle';
    squeak.frequency.value = 1300;
    const lfo = a.createOscillator();
    lfo.frequency.value = 11;
    const lfoGain = a.createGain();
    lfoGain.gain.value = 90;
    lfo.connect(lfoGain).connect(squeak.frequency);
    const sg = a.createGain();
    sg.gain.value = 0;
    squeak.connect(sg).connect(a.destination);
    [noise, squeak, lfo].forEach((n) => n.start());
    this.nodes = { a, noise, squeak, lfo, ng, sg, bp };
  },
  set(intensity) {
    const n = this.nodes;
    if (!n) return;
    const t = n.a.currentTime;
    const v = Math.min(1, intensity);
    n.ng.gain.setTargetAtTime(0.06 * v, t, 0.03);
    n.bp.frequency.setTargetAtTime(1000 + 1200 * v, t, 0.05);
    n.sg.gain.setTargetAtTime(v > 0.6 ? 0.012 * v : 0, t, 0.04);
    n.squeak.frequency.setTargetAtTime(1100 + 600 * v, t, 0.05);
  },
  stop() {
    const n = this.nodes;
    if (!n) return;
    this.nodes = null;
    const t = n.a.currentTime;
    n.ng.gain.setTargetAtTime(0, t, 0.05);
    n.sg.gain.setTargetAtTime(0, t, 0.03);
    [n.noise, n.squeak, n.lfo].forEach((o) => o.stop(t + 0.3));
  },
};

// Navegadores só liberam áudio depois de um toque; o Android não pausa o WebAudio sozinho
// quando o app vai para segundo plano, então suspendemos manualmente.
document.addEventListener('pointerdown', () => ac(), { capture: true });
let adPlaying = false;
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend();
  else if (!adPlaying) ctx.resume();
});

/** Silencia todo o áudio do jogo enquanto um anúncio está na tela. */
export function setAdPlaying(on) {
  adPlaying = on;
  if (!ctx) return;
  if (on) ctx.suspend();
  else ctx.resume();
}
