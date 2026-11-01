// Sons ASMR sintetizados com WebAudio (sem arquivos de áudio).
// Sons contínuos (algodão, pincel, lixa, água, espuma, secador) seguem a velocidade do dedo.
import { Save } from './storage.js';

let ctx;
let noiseBuf;

export function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseBuffer(a) {
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    // ruído "rosa" aproximado: mais suave que o branco, melhor para ASMR
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + w * 0.029591;
      b1 = 0.985 * b1 + w * 0.032534;
      b2 = 0.95 * b2 + w * 0.048056;
      d[i] = (b0 + b1 + b2 + w * 0.05) * 2.2;
    }
  }
  return noiseBuf;
}

function tone(freq, dur, type = 'sine', vol = 0.08, slideTo, delay = 0) {
  if (Save.get('muted')) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function burst(dur, vol, type, freq, q = 1, delay = 0) {
  if (Save.get('muted')) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a);
  src.playbackRate.value = 1 + Math.random() * 0.3;
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t, Math.random());
  src.stop(t + dur);
}

// Cada som contínuo: filtros sobre ruído + (às vezes) um zumbido
const LOOPS = {
  algodao: { filters: [['lowpass', 1100, 0.7]], vol: 0.55 },
  esponja: { filters: [['lowpass', 700, 0.9]], vol: 0.6 },
  pincel: { filters: [['bandpass', 3800, 0.9]], vol: 0.45 },
  lixa: { filters: [['bandpass', 2600, 3]], vol: 0.9, wobble: 14 },
  agua: { filters: [['bandpass', 1600, 0.5], ['highshelf', 4000, 0.7]], vol: 0.5 },
  espuma: { filters: [['bandpass', 5200, 1.5]], vol: 0.35, blips: true },
  secador: { filters: [['lowpass', 900, 0.8]], vol: 0.45, hum: 140, constant: true },
};

/** Liga um som contínuo; `set(intensidade 0..1)` a cada quadro; `stop()` ao soltar. */
export function loop(kind) {
  const cfg = LOOPS[kind];
  const a = ac();
  if (!a || !cfg || Save.get('muted')) return { set() {}, stop() {} };
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a);
  src.loop = true;
  let node = src;
  cfg.filters.forEach(([type, freq, q]) => {
    const f = a.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    if (type === 'highshelf') f.gain.value = 6;
    node.connect(f);
    node = f;
  });
  const g = a.createGain();
  g.gain.value = 0.0001;
  node.connect(g).connect(a.destination);
  src.start();
  let hum;
  if (cfg.hum) {
    hum = a.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = cfg.hum;
    const hg = a.createGain();
    hg.gain.value = 0.015;
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    hum.connect(lp).connect(hg).connect(g);
    hum.start();
  }
  let lastBlip = 0;
  return {
    set(intensity) {
      const t = a.currentTime;
      let v = cfg.constant ? 0.6 + intensity * 0.4 : Math.min(1, intensity);
      if (cfg.wobble) v *= 0.6 + 0.4 * Math.abs(Math.sin(t * cfg.wobble));
      g.gain.setTargetAtTime(Math.max(0.0001, v * cfg.vol), t, 0.04);
      if (cfg.blips && intensity > 0.2 && t - lastBlip > 0.05 + Math.random() * 0.1) {
        lastBlip = t;
        tone(1800 + Math.random() * 2500, 0.04, 'sine', 0.02 * intensity);
      }
    },
    stop() {
      const t = a.currentTime;
      g.gain.setTargetAtTime(0.0001, t, 0.06);
      src.stop(t + 0.4);
      hum?.stop(t + 0.4);
    },
  };
}

export const Sfx = {
  click: () => tone(880, 0.05, 'triangle', 0.05),
  pop: () => {
    tone(520, 0.09, 'sine', 0.18, 180);
    burst(0.03, 0.4, 'highpass', 3000, 1);
  },
  pluck: () => {
    burst(0.02, 0.5, 'highpass', 6000, 2);
    tone(2400, 0.03, 'sine', 0.04, 3200, 0.01);
  },
  gem: () => [1568, 2093, 2637].forEach((f, i) => tone(f, 0.15, 'sine', 0.04, null, i * 0.05)),
  stepDone: () => [659, 880, 1175].forEach((f, i) => tone(f, 0.18, 'sine', 0.06, null, i * 0.07)),
  pick: () => tone(1200, 0.05, 'sine', 0.05, 1600),
  coin: () => {
    tone(988, 0.07, 'square', 0.035);
    tone(1319, 0.14, 'square', 0.035, null, 0.06);
  },
  done: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.3, 'sine', 0.07, null, i * 0.09)),
  unlock: () => ac(),
};

// Navegadores e o iOS só liberam áudio depois de um toque; ao ir para segundo plano
// suspendemos manualmente para não tocar com o app fechado.
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
