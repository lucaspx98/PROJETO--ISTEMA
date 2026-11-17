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
    noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
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

function hiss(dur, vol, freq, q = 1, type = 'bandpass', delay = 0) {
  if (Save.get('muted')) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const s = a.createBufferSource();
  s.buffer = noise(a);
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(a.destination);
  s.start(t, Math.random());
  s.stop(t + dur);
}

/** Som do mar: ruído grave contínuo; set(0..1) conforme a distância da praia. */
export function seaLoop() {
  const a = ac();
  if (!a || Save.get('muted')) return { set() {}, stop() {} };
  const s = a.createBufferSource();
  s.buffer = noise(a);
  s.loop = true;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 500;
  const g = a.createGain();
  g.gain.value = 0.0001;
  s.connect(f).connect(g).connect(a.destination);
  s.start();
  return {
    set(v) {
      const t = a.currentTime;
      g.gain.setTargetAtTime(Math.max(0.0001, v * 0.12 * (0.7 + 0.3 * Math.sin(t * 0.9))), t, 0.3);
    },
    stop() {
      s.stop();
    },
  };
}

export const Sfx = {
  click: () => tone(880, 0.05, 'triangle', 0.06),
  swing: () => hiss(0.12, 0.25, 1800, 0.8),
  hit: () => {
    tone(180, 0.1, 'square', 0.1, 90);
    hiss(0.06, 0.3, 2500, 1);
  },
  chop: (kind) => {
    if (kind === 'rock' || kind === 'crystal') {
      tone(kind === 'crystal' ? 1900 : 900, 0.07, 'triangle', 0.1, kind === 'crystal' ? 2600 : 600);
      hiss(0.05, 0.3, 3500, 2);
    } else {
      tone(140, 0.09, 'sine', 0.25, 80);
      hiss(0.05, 0.25, 900, 1);
    }
  },
  fall: () => {
    tone(90, 0.3, 'sine', 0.25, 50);
    hiss(0.25, 0.3, 600, 0.7);
  },
  pickup: () => {
    tone(880, 0.06, 'triangle', 0.06);
    tone(1320, 0.1, 'triangle', 0.06, null, 0.05);
  },
  hurt: () => tone(320, 0.25, 'sawtooth', 0.1, 110),
  roll: () => hiss(0.2, 0.2, 900, 0.6),
  eat: () => [0, 0.09, 0.18].forEach((d) => hiss(0.05, 0.25, 1400, 2, 'bandpass', d)),
  growl: () => tone(110, 0.3, 'sawtooth', 0.06, 70),
  slam: () => {
    tone(60, 0.5, 'sine', 0.4, 30);
    hiss(0.4, 0.5, 300, 0.6, 'lowpass');
  },
  levelup: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.09, null, i * 0.08)),
  quest: () => [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.25, 'sine', 0.09, null, i * 0.1)),
  build: () => [0, 0.12, 0.24].forEach((d) => tone(140, 0.08, 'sine', 0.25, 90, d)),
  death: () => tone(300, 0.8, 'triangle', 0.12, 60),
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

/** Passo: grama (abafado), areia (chiado), neve (crocante), pedra (seco). */
export function step(surface) {
  if (surface === 'sand') hiss(0.09, 0.07, 2600, 0.8, 'highpass');
  else if (surface === 'snow') hiss(0.11, 0.09, 1600, 1.5);
  else if (surface === 'rock') tone(150, 0.05, 'triangle', 0.05, 110);
  else hiss(0.08, 0.06, 700, 0.9);
}

/**
 * Som ambiente: pássaros de dia, grilos à noite, vento no alto da montanha e
 * estalos da fogueira. Tudo sintetizado, poucas notas por segundo.
 */
export function ambience() {
  const a = ac();
  if (!a || Save.get('muted')) return { update() {}, stop() {} };
  // vento: ruído filtrado em loop, volume pela altura
  const s = a.createBufferSource();
  s.buffer = noise(a);
  s.loop = true;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 420;
  f.Q.value = 0.5;
  const g = a.createGain();
  g.gain.value = 0.0001;
  s.connect(f).connect(g).connect(a.destination);
  s.start();
  let birdT = 2;
  let cricketT = 1;
  let fireT = 0.3;
  return {
    update(dt, { night, height, nearFire, beach }) {
      const t = a.currentTime;
      const wind = Math.min(1, Math.max(0, (height - 18) / 20));
      g.gain.setTargetAtTime(Math.max(0.0001, wind * 0.09 * (0.6 + 0.4 * Math.sin(t * 0.4))), t, 0.5);
      f.frequency.setTargetAtTime(380 + Math.sin(t * 0.23) * 160, t, 0.8);
      birdT -= dt;
      if (!night && !beach && height < 26 && birdT <= 0) {
        birdT = 2.5 + Math.random() * 5;
        const base = 2200 + Math.random() * 1600;
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) tone(base, 0.09, 'sine', 0.018, base * (1.2 + Math.random() * 0.3), i * 0.13);
      }
      cricketT -= dt;
      if (night && height < 24 && cricketT <= 0) {
        cricketT = 0.9 + Math.random() * 1.6;
        for (let i = 0; i < 4; i++) tone(4400, 0.025, 'square', 0.006, null, i * 0.05);
      }
      fireT -= dt;
      if (nearFire > 0 && fireT <= 0) {
        fireT = 0.08 + Math.random() * 0.35;
        hiss(0.03, 0.12 * nearFire, 2500 + Math.random() * 2000, 3);
      }
    },
    stop() {
      s.stop();
    },
  };
}
