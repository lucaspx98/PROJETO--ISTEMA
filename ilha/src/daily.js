// Desafios do dia: 3 tarefas que mudam todo dia (mesmas para todo mundo naquela data),
// com moedas de prêmio. Dão motivo para voltar à ilha depois de zerar a história.
import { Save } from './storage.js';

const POOL = [
  { id: 'slime', text: 'Derrote {n} gosmas', n: [6, 10], coin: 30, ev: (e) => e.type === 'enemyDie' && e.kind === 'slime' },
  { id: 'wolf', text: 'Derrote {n} lobos', n: [3, 6], coin: 45, ev: (e) => e.type === 'enemyDie' && e.kind === 'wolf' },
  { id: 'wood', text: 'Junte {n} madeiras', n: [25, 40], coin: 25, ev: (e) => e.type === 'pickup' && e.item === 'wood', amt: (e) => e.n },
  { id: 'stone', text: 'Junte {n} pedras', n: [20, 30], coin: 25, ev: (e) => e.type === 'pickup' && e.item === 'stone', amt: (e) => e.n },
  { id: 'berry', text: 'Colha {n} frutinhas', n: [8, 14], coin: 20, ev: (e) => e.type === 'pickup' && e.item === 'berry', amt: (e) => e.n },
  { id: 'crystal', text: 'Quebre {n} cristais', n: [3, 5], coin: 40, ev: (e) => e.type === 'nodeDown' && e.kind === 'crystal' },
  { id: 'roll', text: 'Role {n} vezes', n: [25, 40], coin: 15, ev: (e) => e.type === 'roll' },
  { id: 'night', text: 'Derrote {n} inimigos à noite', n: [5, 8], coin: 50, ev: (e, w) => e.type === 'enemyDie' && w.night },
];

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

function pick(day) {
  let h = 0;
  for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rand = () => ((h = (h * 1664525 + 1013904223) >>> 0) / 4294967296);
  const ids = [...POOL];
  const out = [];
  while (out.length < 3) {
    const it = ids.splice(Math.floor(rand() * ids.length), 1)[0];
    const n = it.n[0] + Math.floor(rand() * (it.n[1] - it.n[0] + 1));
    out.push({ id: it.id, n, got: 0, done: false });
  }
  return out;
}

export const Daily = {
  state: null,
  load() {
    const day = today();
    const s = Save.get('daily');
    this.state = s && s.day === day ? s : { day, list: pick(day) };
    return this;
  },
  list() {
    return this.state.list.map((d) => {
      const def = POOL.find((p) => p.id === d.id);
      return { ...d, text: def.text.replace('{n}', d.n), coin: def.coin };
    });
  },
  /** Conta um evento do mundo; devolve os desafios que acabaram de ser concluídos. */
  track(ev, world) {
    if (!this.state) this.load();
    if (this.state.day !== today()) this.load();
    const done = [];
    for (const d of this.state.list) {
      if (d.done) continue;
      const def = POOL.find((p) => p.id === d.id);
      if (!def.ev(ev, world)) continue;
      d.got = Math.min(d.n, d.got + (def.amt ? def.amt(ev) : 1));
      if (d.got >= d.n) {
        d.done = true;
        world.player.inv.coin += def.coin;
        done.push({ text: def.text.replace('{n}', d.n), coin: def.coin });
      }
    }
    Save.set('daily', this.state);
    return done;
  },
};
