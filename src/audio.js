// Efeitos sonoros sintetizados com WebAudio (sem arquivos de áudio).
import { Save } from './storage.js';

let ctx;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'square', vol = 0.08, slideTo) {
  if (Save.get('muted')) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur);
}

export const Sfx = {
  jump: () => tone(420, 0.12, 'square', 0.06, 760),
  doubleJump: () => tone(620, 0.12, 'square', 0.06, 1100),
  coin: () => {
    tone(988, 0.07, 'square', 0.05);
    setTimeout(() => tone(1319, 0.12, 'square', 0.05), 60);
  },
  hit: () => tone(220, 0.4, 'sawtooth', 0.1, 40),
  click: () => tone(660, 0.05, 'triangle', 0.08),
  buy: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.1, 'square', 0.05), i * 70)),
  unlock: () => ac(),
};
