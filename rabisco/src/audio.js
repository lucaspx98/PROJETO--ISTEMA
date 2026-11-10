// Sons sintetizados com WebAudio (sem arquivos de áudio).
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

function noise(a) {
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function tone(freq, dur, type = 'sine', vol = 0.08, slideTo, delay = 0) {
  if (Save.get('muted')) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function hiss(dur, vol, freq, q = 1, delay = 0) {
  if (Save.get('muted')) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const s = a.createBufferSource();
  s.buffer = noise(a);
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(a.destination);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur);
}

/** Som contínuo: 'risco' (caneta no papel, segue a velocidade) ou 'zumbido' (enxame). */
export function loop(kind) {
  const a = ac();
  if (!a || Save.get('muted')) return { set() {}, stop() {} };
  const g = a.createGain();
  g.gain.value = 0.0001;
  g.connect(a.destination);
  const nodes = [];
  if (kind === 'risco') {
    const s = a.createBufferSource();
    s.buffer = noise(a);
    s.loop = true;
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2400;
    f.Q.value = 1.2;
    s.connect(f).connect(g);
    s.start();
    nodes.push(s);
  } else {
    // zumbido: duas serras levemente desafinadas, filtradas
    [220, 226].forEach((fq) => {
      const o = a.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = fq;
      const f = a.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      o.connect(f).connect(g);
      o.start();
      nodes.push(o);
    });
  }
  return {
    set(v) {
      const t = a.currentTime;
      g.gain.setTargetAtTime(Math.max(0.0001, Math.min(1, v) * (kind === 'risco' ? 0.35 : 0.06)), t, 0.05);
      if (kind === 'zumbido') nodes.forEach((o, i) => o.frequency.setTargetAtTime(210 + i * 7 + Math.sin(t * 9) * 12, t, 0.05));
    },
    stop() {
      const t = a.currentTime;
      g.gain.setTargetAtTime(0.0001, t, 0.08);
      nodes.forEach((n) => n.stop(t + 0.5));
    },
  };
}

export const Sfx = {
  click: () => tone(880, 0.05, 'triangle', 0.06),
  pop: () => tone(600, 0.08, 'sine', 0.15, 900),
  thud: () => {
    tone(120, 0.18, 'sine', 0.25, 60);
    hiss(0.08, 0.3, 800, 1);
  },
  boom: () => {
    tone(90, 0.3, 'sawtooth', 0.15, 40);
    hiss(0.25, 0.4, 500, 0.8);
  },
  hurt: () => {
    tone(700, 0.12, 'square', 0.08, 300);
    tone(300, 0.4, 'triangle', 0.1, 120, 0.12);
  },
  tick: () => tone(1200, 0.04, 'square', 0.03),
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.09, null, i * 0.08)),
  star: (i) => tone(880 + i * 220, 0.18, 'triangle', 0.08),
  coin: () => {
    tone(988, 0.07, 'square', 0.04);
    tone(1319, 0.14, 'square', 0.04, null, 0.06);
  },
  unlock: () => ac(),
};

document.addEventListener('pointerdown', () => ac(), { capture: true });
let adPlaying = false;
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend();
  else if (!adPlaying) ctx.resume();
});

export function setAdPlaying(on) {
  adPlaying = on;
  if (!ctx) return;
  if (on) ctx.suspend();
  else ctx.resume();
}
