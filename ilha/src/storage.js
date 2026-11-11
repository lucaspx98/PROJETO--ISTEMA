// Jogo salvo no aparelho (localStorage funciona no WebView do Capacitor).
const KEY = 'ilhabrava.save.v1';
const PREFS = 'ilhabrava.prefs.v1';

let prefs = { muted: false, musicOff: false };
try {
  prefs = { ...prefs, ...JSON.parse(localStorage.getItem(PREFS) ?? '{}') };
} catch {
  // sem armazenamento: usa o padrão
}

export const Save = {
  get: (k) => prefs[k],
  set(k, v) {
    prefs[k] = v;
    try {
      localStorage.setItem(PREFS, JSON.stringify(prefs));
    } catch {
      // segue sem salvar
    }
  },
  loadGame() {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? 'null');
    } catch {
      return null;
    }
  },
  saveGame(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // segue sem salvar
    }
  },
  clearGame() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // nada
    }
  },
};
