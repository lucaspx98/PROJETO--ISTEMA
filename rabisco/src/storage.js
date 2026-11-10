// Progresso salvo no aparelho (localStorage funciona no WebView do Capacitor).
const KEY = 'riscaesalva.save.v1';

const DEFAULTS = {
  level: 0, // próxima fase (índice)
  coins: 0,
  stars: {}, // índice da fase -> melhor número de estrelas
  skins: ['bolota'],
  skin: 'bolota',
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
  setStars(i, n) {
    data.stars = { ...data.stars, [i]: Math.max(n, data.stars[i] ?? 0) };
    save();
  },
  owns: (id) => data.skins.includes(id),
  buySkin(id, price) {
    if (data.skins.includes(id) || !this.spend(price)) return false;
    data.skins = [...data.skins, id];
    data.skin = id;
    save();
    return true;
  },
};
