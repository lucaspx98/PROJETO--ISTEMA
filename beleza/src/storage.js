// Progresso salvo no aparelho (localStorage funciona no WebView do Capacitor).
const KEY = 'salaorelax.save.v1';

const DEFAULTS = {
  coins: 30,
  clients: 0, // clientes atendidos
  stars: 0, // total de estrelas
  upgrades: {}, // id da melhoria -> nível
  muted: false,
  musicOff: false,
};

let data = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Sem armazenamento disponível: o jogo continua, só não salva.
  }
}

export const Save = {
  get: (k) => data[k],
  set(k, v) {
    data[k] = v;
    save();
  },
  addCoins(n) {
    data.coins += n;
    save();
  },
  spend(n) {
    if (data.coins < n) return false;
    data.coins -= n;
    save();
    return true;
  },
  level: (id) => data.upgrades[id] ?? 0,
  setLevel(id, n) {
    data.upgrades = { ...data.upgrades, [id]: n };
    save();
  },
};
