// Persistência simples do progresso do jogador (localStorage funciona no WebView do Capacitor).
const KEY = 'correcorre.save.v1';

const DEFAULTS = {
  best: 0,
  coins: 0,
  ownedSkins: ['classico'],
  skin: 'classico',
  muted: false,
  gamesPlayed: 0,
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
  submitScore(score) {
    const isRecord = score > data.best;
    if (isRecord) data.best = score;
    data.gamesPlayed += 1;
    save();
    return isRecord;
  },
  owns: (id) => data.ownedSkins.includes(id),
  buySkin(id, price) {
    if (data.ownedSkins.includes(id) || data.coins < price) return false;
    data.coins -= price;
    data.ownedSkins.push(id);
    data.skin = id;
    save();
    return true;
  },
};
