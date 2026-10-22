// Persistência simples do progresso do jogador (localStorage funciona no WebView do Capacitor).
const KEY = 'gotaagota.save.v1';

const DEFAULTS = {
  level: 1,
  best: 0,
  runs: 0,
  coins: 0,
  ownedThemes: ['cidade'],
  theme: 'cidade',
  muted: false,
  musicOff: false,
  vibrationOff: false,
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
  toggle(k) {
    data[k] = !data[k];
    save();
    return data[k];
  },
  addCoins(n) {
    data.coins += n;
    save();
  },
  owns: (id) => data.ownedThemes.includes(id),
  buyTheme(id, price) {
    if (data.ownedThemes.includes(id) || data.coins < price) return false;
    data.coins -= price;
    data.ownedThemes.push(id);
    data.theme = id;
    save();
    return true;
  },
};
