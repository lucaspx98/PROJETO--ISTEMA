// Efeitos sonoros sintetizados com WebAudio (sem arquivos de áudio).
import { Save } from './storage.js';

let ctx;

export function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.08, slideTo) {
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

// Escala pentatônica: cada captura sobe uma nota, fica gostoso emendar várias.
const PENTA = [0, 2, 4, 7, 9];
const note = (n) => 523.25 * 2 ** ((12 * Math.floor(n / 5) + PENTA[n % 5]) / 12);

export const Sfx = {
  launch: () => tone(300, 0.18, 'triangle', 0.07, 900),
  capture: (combo = 0) => {
    const f = note(Math.min(combo, 14));
    tone(f, 0.18, 'sine', 0.09);
    tone(f * 2, 0.12, 'triangle', 0.025);
  },
  gem: () => {
    tone(1568, 0.06, 'square', 0.035);
    setTimeout(() => tone(2093, 0.1, 'square', 0.035), 50);
  },
  die: () => tone(330, 0.6, 'sawtooth', 0.08, 50),
  click: () => tone(660, 0.05, 'triangle', 0.08),
  buy: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.1, 'square', 0.05), i * 70)),
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
