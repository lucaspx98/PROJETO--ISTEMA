// Mistura de cores como tinta (modelo RYB): vermelho + amarelo = laranja, amarelo + azul = verde...
// Uma cor é um vetor de pigmentos [vermelho, amarelo, azul].

// Cantos do cubo RYB -> RGB (adaptado de Gossett & Chen), com tons mais vivos para o jogo.
const CUBE = {
  '000': [1, 1, 1],
  100: [0.93, 0.16, 0.22],
  '010': [1, 0.84, 0.1],
  '001': [0.13, 0.42, 0.95],
  110: [1, 0.52, 0.08],
  101: [0.58, 0.2, 0.78],
  '011': [0.16, 0.74, 0.32],
  111: [0.45, 0.27, 0.14],
};

/** Converte pigmentos em cor RGB (0xRRGGBB). */
export function pigmentToRgb(pig) {
  const m = Math.max(...pig, 1e-9);
  const [r, y, b] = pig.map((v) => v / m);
  const out = [0, 1, 2].map((c) => {
    let v = 0;
    for (const R of [0, 1]) {
      for (const Y of [0, 1]) {
        for (const B of [0, 1]) {
          const w = (R ? r : 1 - r) * (Y ? y : 1 - y) * (B ? b : 1 - b);
          v += w * CUBE[`${R}${Y}${B}`][c];
        }
      }
    }
    return Math.round(Math.min(1, v) * 255);
  });
  return (out[0] << 16) | (out[1] << 8) | out[2];
}

/** Proporção de cada pigmento (soma 1). */
export const proportions = (pig) => {
  const s = pig[0] + pig[1] + pig[2];
  return pig.map((v) => v / s);
};

/** Cores "iguais" se as proporções de pigmento forem parecidas. */
export function sameColor(a, b) {
  const pa = proportions(a);
  const pb = proportions(b);
  return Math.abs(pa[0] - pb[0]) + Math.abs(pa[1] - pb[1]) + Math.abs(pa[2] - pb[2]) < 0.2;
}

export const RECIPES = {
  vermelho: [1, 0, 0],
  amarelo: [0, 1, 0],
  azul: [0, 0, 1],
  laranja: [1, 1, 0],
  verde: [0, 1, 1],
  roxo: [1, 0, 1],
  marrom: [1, 1, 1],
};
