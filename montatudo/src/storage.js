// Progresso salvo no aparelho (localStorage funciona no WebView do Capacitor).
const KEY = 'montatudo.save.v1';

const DEFAULTS = {
  coins: 40,
  stars: {}, // id da fase -> melhor número de estrelas (1 a 3)
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
  starsOf: (id) => data.stars[id] ?? 0,
  setStars(id, n) {
    data.stars[id] = Math.max(n, data.stars[id] ?? 0);
    save();
  },
};
