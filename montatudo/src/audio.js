// Efeitos sonoros sintetizados com WebAudio (sem arquivos de áudio).
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
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur);
}

/** Ruído filtrado: batidas, cliques metálicos. */
function noise(dur, vol, freq, q = 1, delay = 0) {
  if (Save.get('muted')) return;
  const a = ac();
  if (!a) return;
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = a.currentTime + delay;
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
  src.stop(t + dur);
}

export const Sfx = {
  click: () => tone(660, 0.05, 'triangle', 0.07),
  pick: () => noise(0.08, 0.25, 1800, 2),
  snap: () => {
    tone(140, 0.12, 'sine', 0.25, 70);
    noise(0.06, 0.35, 2500, 3);
  },
  wrong: () => tone(200, 0.22, 'square', 0.05, 120),
  screw: () => {
    for (let i = 0; i < 7; i++) noise(0.03, 0.25, 3500 + i * 150, 6, i * 0.075);
    tone(900, 0.06, 'square', 0.03, null, 0.55);
  },
  /** Clique da catraca a cada quarto de volta (mais agudo apertando, mais grave afrouxando). */
  ratchet: (tight) => noise(0.025, 0.3, tight ? 4200 : 2600, 8),
  hammer: () => {
    tone(95, 0.16, 'sine', 0.45, 55);
    noise(0.07, 0.55, 1300, 1.5);
  },
  drill: () => tone(180 + Math.random() * 30, 0.13, 'sawtooth', 0.035, 240),
  coin: () => {
    tone(988, 0.07, 'square', 0.04);
    tone(1319, 0.14, 'square', 0.04, null, 0.06);
  },
  done: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.08, null, i * 0.09)),
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
