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

/** Estalo curto de ruído filtrado: dá o "clique" de encaixe da bolinha. */
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

export const Sfx = {
  /** Bolinha levantada do tubo. */
  lift: () => {
    tone(330, 0.12, { vol: 0.08, slideTo: 520 });
    click(0.06, 3500);
  },
  /** Bolinha pousa: quanto mais alto no tubo, mais aguda a nota. */
  drop: (slot, step = 0) => {
    const f = PENTA[Math.min(slot + step, PENTA.length - 1)];
    tone(f * 0.5, 0.18, { vol: 0.16, slideTo: f * 0.42 });
    tone(f, 0.25, { type: 'triangle', vol: 0.05, delay: 0.005 });
    click(0.14, 1800);
  },
  putBack: () => {
    tone(440, 0.1, { vol: 0.07, slideTo: 300 });
    click(0.05, 1500);
  },
  nope: () => tone(160, 0.22, { type: 'triangle', vol: 0.14, slideTo: 110 }),
  /** Tubo completo: arpejo de sininhos. */
  complete: (color = 0) => {
    const base = color % 3;
    [0, 2, 4, 5].forEach((s, i) => {
      tone(PENTA[base + s], 0.6, { type: 'sine', vol: 0.09, delay: i * 0.07 });
      tone(PENTA[base + s] * 2, 0.4, { type: 'sine', vol: 0.025, delay: i * 0.07 });
    });
  },
  win: () => {
    [0, 2, 4, 5, 7, 9].forEach((s, i) => tone(PENTA[s], 0.9, { type: 'triangle', vol: 0.08, delay: i * 0.09 }));
    [261.63, 329.63, 392.0].forEach((f) => tone(f, 1.6, { vol: 0.06, delay: 0.5, attack: 0.08 }));
  },
  undo: () => tone(700, 0.12, { type: 'triangle', vol: 0.06, slideTo: 420 }),
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
