// Trilha original "espacial": Ré menor, 96 BPM, pad suave + arpejo + melodia, em loop de 8 compassos.
import { ac } from './audio.js';
import { Save } from './storage.js';

const BPM = 96;
const STEP = 60 / BPM / 4; // semicolcheia
const STEPS_PER_BAR = 16;
const BARS = 8;
const VOLUME = 0.3;

// Dm – Bb – F – C (MIDI) e fundamentais para o baixo
const CHORDS = [
  [62, 65, 69],
  [58, 62, 65],
  [60, 65, 69],
  [60, 64, 67],
];
const ROOTS = [38, 34, 41, 36];
// Melodia por compasso: [passo, nota MIDI, duração em passos]
const MELODY = [
  [[0, 74, 4], [6, 77, 2], [8, 76, 4], [12, 72, 4]],
  [[0, 74, 6], [8, 70, 4], [12, 72, 4]],
  [[0, 69, 4], [4, 72, 4], [8, 77, 6]],
  [[0, 76, 4], [6, 74, 2], [8, 72, 8]],
];
const ARP = [0, 1, 2, 1];

let master = null;
let timer = null;
let nextTime = 0;
let step = 0;
let paused = false;

const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);

function voice(a, type, midi, t, dur, vol, attack = 0.01) {
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq(midi), t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function kick(a, t) {
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.frequency.setValueAtTime(110, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
  g.gain.setValueAtTime(0.6, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + 0.3);
}

function scheduleStep(a, s, t) {
  const bar = Math.floor(s / STEPS_PER_BAR);
  const i = s % STEPS_PER_BAR;
  const chord = bar % 4;
  const notes = CHORDS[chord];

  if (i === 0 || i === 10) kick(a, t);
  // Pad: acorde inteiro com ataque lento no começo do compasso
  if (i === 0) notes.forEach((n) => voice(a, 'sine', n, t, STEP * 16, 0.06, 0.6));
  if (i % 4 === 0) voice(a, 'triangle', ROOTS[chord], t, STEP * 3.5, 0.35);
  if (i % 2 === 0) voice(a, 'triangle', notes[ARP[(i / 2) % 4]] + 12, t, STEP * 1.5, 0.05);

  if (bar >= 4) {
    const n = MELODY[chord].find((m) => m[0] === i);
    if (n) voice(a, 'sine', n[1], t, STEP * n[2] * 0.95, 0.12, 0.03);
  }
}

function tick() {
  const a = ac();
  if (!a || paused) return;
  if (nextTime < a.currentTime) nextTime = a.currentTime + 0.05;
  while (nextTime < a.currentTime + 0.15) {
    scheduleStep(a, step, nextTime);
    nextTime += STEP;
    step = (step + 1) % (STEPS_PER_BAR * BARS);
  }
}

export const Music = {
  start() {
    if (timer || Save.get('musicOff')) return;
    const a = ac();
    if (!a) return;
    master = a.createGain();
    master.gain.value = VOLUME;
    master.connect(a.destination);
    nextTime = a.currentTime + 0.1;
    step = 0;
    paused = false;
    timer = setInterval(tick, 25);
  },

  stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    const a = ac();
    const m = master;
    m.gain.setTargetAtTime(0.0001, a.currentTime, 0.05);
    setTimeout(() => m.disconnect(), 300);
  },

  /** Abafa a música (fim de jogo) sem perder o ritmo. */
  duck(on) {
    if (!master) return;
    const a = ac();
    master.gain.setTargetAtTime(on ? VOLUME * 0.3 : VOLUME, a.currentTime, 0.1);
  },

  pause(on) {
    paused = on;
  },

  toggle() {
    Save.set('musicOff', !Save.get('musicOff'));
    if (Save.get('musicOff')) this.stop();
    else this.start();
  },
};
