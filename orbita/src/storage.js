// Persistência simples do progresso do jogador (localStorage funciona no WebView do Capacitor).
const KEY = 'orbita.save.v1';

const DEFAULTS = {
  best: 0,
  gems: 0,
  ownedSkins: ['cometa'],
  skin: 'cometa',
  muted: false,
  musicOff: false,
  gamesPlayed: 0,
  lastGift: '',
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

const today = () => new Date().toISOString().slice(0, 10);

export const Save = {
  get: (k) => data[k],
  set(k, v) {
    data[k] = v;
    save();
  },
  addGems(n) {
    data.gems += n;
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
    if (data.ownedSkins.includes(id) || data.gems < price) return false;
    data.gems -= price;
    data.ownedSkins.push(id);
    data.skin = id;
    save();
    return true;
  },
  giftAvailable: () => data.lastGift !== today(),
  claimGift(amount) {
    data.lastGift = today();
    data.gems += amount;
    save();
  },
};
