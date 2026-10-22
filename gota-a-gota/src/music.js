// Trilha ambiente original e generativa: chuva fininha de fundo, acordes suaves e sininhos esparsos.
// Nunca se repete igual e é calma o bastante para tocar por horas.
import { ac } from './audio.js';
import { Save } from './storage.js';

const VOLUME = 0.22;
const CHORD_SECONDS = 6;

// Cmaj9 – Am9 – Fmaj9 – G6 (notas MIDI)
const CHORDS = [
  [48, 55, 59, 62, 64],
  [45, 52, 55, 59, 60],
  [41, 48, 52, 55, 57],
  [43, 50, 55, 59, 64],
];
const BELLS = [72, 74, 76, 79, 81, 84, 86, 88];

let master = null;
let timer = null;
let nextTime = 0;
let chord = 0;
let rain = null;

const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);

function pad(a, midi, t, dur) {
  const osc = a.createOscillator();
  const osc2 = a.createOscillator();
  const g = a.createGain();
  osc.type = 'sine';
  osc2.type = 'triangle';
  osc.frequency.value = freq(midi);
  osc2.frequency.value = freq(midi) * 1.003; // leve desafinação = som mais "quente"
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05, t + 2);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  osc2.connect(g);
  g.connect(master);
  [osc, osc2].forEach((o) => {
    o.start(t);
    o.stop(t + dur + 0.1);
  });
}

function bell(a, midi, t) {
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq(midi);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.035, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + 2.6);
}

function schedule() {
  const a = ac();
  if (!a || !master) return;
  while (nextTime < a.currentTime + 1) {
    CHORDS[chord].forEach((m) => pad(a, m, nextTime, CHORD_SECONDS + 2));
    const bells = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < bells; i++) {
      bell(a, BELLS[Math.floor(Math.random() * BELLS.length)], nextTime + 0.5 + Math.random() * (CHORD_SECONDS - 1));
    }
    chord = (chord + 1) % CHORDS.length;
    nextTime += CHORD_SECONDS;
  }
}

export const Music = {
  start() {
    if (timer || Save.get('musicOff')) return;
    const a = ac();
    if (!a) return;
    master = a.createGain();
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    master.gain.value = VOLUME;
    master.connect(lp).connect(a.destination);
    // Chuva: ruído filtrado bem baixinho
    const buf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    rain = a.createBufferSource();
    rain.buffer = buf;
    rain.loop = true;
    const rf = a.createBiquadFilter();
    rf.type = 'lowpass';
    rf.frequency.value = 900;
    const rg = a.createGain();
    rg.gain.value = 0.18;
    rain.connect(rf).connect(rg).connect(master);
    rain.start();
    nextTime = a.currentTime + 0.1;
    schedule();
    timer = setInterval(schedule, 400);
  },
  stop() {
    clearInterval(timer);
    timer = null;
    rain?.stop(ac().currentTime + 1.5);
    rain = null;
    if (master) {
      const m = master;
      const a = ac();
      m.gain.setTargetAtTime(0.0001, a.currentTime, 0.3);
      setTimeout(() => m.disconnect(), 1500);
    }
    master = null;
  },
  toggle() {
    const off = Save.toggle('musicOff');
    if (off) this.stop();
    else this.start();
    return !off;
  },
};
