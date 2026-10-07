// Trilha de fundo original em estilo chiptune/synthwave, tocada por um sequenciador WebAudio.
// Lá menor, 140 BPM, 8 compassos em loop: 4 só com a base e 4 com a melodia.
import { ac } from './audio.js';
import { Save } from './storage.js';

const BPM = 140;
const STEP = 60 / BPM / 4; // semicolcheia
const STEPS_PER_BAR = 16;
const BARS = 8;
const VOLUME = 0.32;

// Acordes Am – F – C – G (notas MIDI) e a fundamental de cada um para o baixo
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [55, 60, 64],
  [55, 59, 62],
];
const ROOTS = [45, 41, 48, 43];

// Melodia: 16 passos por compasso, "." estende a nota anterior, "-" é pausa
const MELODY = [
  'A4 . C5 . E5 . D5 C5 . . A4 . C5 D5 E5 .',
  'F5 . E5 . C5 . A4 . . . C5 . A4 . G4 .',
  'G4 . C5 . E5 . G5 . E5 . D5 C5 . . E5 .',
  'D5 . . . B4 . D5 . G5 . . . - - - -',
].map(parseBar);

let master = null;
let timer = null;
let nextTime = 0;
let step = 0;
let noise = null;
let paused = false;

function parseBar(bar) {
  const names = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const tokens = bar.split(' ');
  const notes = [];
  tokens.forEach((tok, i) => {
    if (tok === '.' || tok === '-') return;
    let len = 1;
    while (tokens[i + len] === '.') len += 1;
    notes.push({ step: i, midi: 12 * (Number(tok[1]) + 1) + names[tok[0]], len });
  });
  return notes;
}

const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);

function voice(a, type, midi, t, dur, vol, out = master) {
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq(midi), t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function kick(a, t) {
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + 0.2);
}

function hiss(a, t, dur, vol, cutoff) {
  if (!noise) {
    noise = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = a.createBufferSource();
  src.buffer = noise;
  const f = a.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = cutoff;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur);
}

function scheduleStep(a, s, t) {
  const bar = Math.floor(s / STEPS_PER_BAR);
  const i = s % STEPS_PER_BAR;
  const chord = bar % 4;

  // Bateria
  if (i % 4 === 0) kick(a, t);
  if (i === 4 || i === 12) hiss(a, t, 0.14, 0.35, 1500);
  if (i % 2 === 1) hiss(a, t, 0.04, 0.12, 7000);

  // Baixo em oitavas (colcheias)
  if (i % 2 === 0) voice(a, 'triangle', ROOTS[chord] + (i % 4 === 2 ? 12 : 0), t, STEP * 1.8, 0.5);

  // Arpejo
  const notes = CHORDS[chord];
  voice(a, 'square', notes[i % 3] + 12, t, STEP * 0.9, 0.05);

  // Melodia só na segunda metade do loop
  if (bar >= 4) {
    const n = MELODY[chord].find((m) => m.step === i);
    if (n) {
      voice(a, 'square', n.midi, t, STEP * n.len * 0.95, 0.11);
      voice(a, 'sawtooth', n.midi + 12, t, STEP * n.len * 0.6, 0.025); // brilho
    }
  }
}

function tick() {
  const a = ac();
  if (!a || paused) return;
  // Se o contexto ficou parado (app em segundo plano), retoma sem despejar notas atrasadas
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

  /** Abafa a música (pausa, fim de jogo) sem perder o ritmo. */
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

/** Renderiza a trilha num OfflineAudioContext (usado para gerar a prévia em áudio). */
export function renderPreview(a, seconds) {
  const live = master;
  master = a.createGain();
  master.gain.value = VOLUME;
  master.connect(a.destination);
  for (let s = 0, t = 0.05; t < seconds - 0.3; s++, t += STEP) scheduleStep(a, s % (STEPS_PER_BAR * BARS), t);
  master = live;
}
