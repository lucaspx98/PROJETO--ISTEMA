// Todos os gráficos são desenhados por código: nada de arquivos de imagem para licenciar.
import { SKINS } from './skins.js';

// [cor base, sombra, brilho]
export const PLANET_COLORS = [
  [0xff6b6b, 0xa83246, 0xffc2c2],
  [0x4dabf7, 0x1c5d99, 0xc5e6ff],
  [0x69db7c, 0x2b8a3e, 0xd3f9d8],
  [0xffd43b, 0xc78b00, 0xfff3bf],
  [0xb197fc, 0x5f3dc4, 0xe5dbff],
  [0xff922b, 0xb54708, 0xffe8cc],
  [0x63e6be, 0x087f5b, 0xc3fae8],
  [0xf783ac, 0xa61e4d, 0xffdeeb],
];
export const PLANET_TEX_R = 64;

export function createTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const R = PLANET_TEX_R;

  PLANET_COLORS.forEach(([base, dark, light], i) => {
    g.clear();
    const c = R + 4;
    g.fillStyle(dark, 1).fillCircle(c, c, R);
    g.fillStyle(base, 1).fillCircle(c - 6, c - 6, R - 9);
    // crateras / manchas em posições fixas por planeta
    for (let k = 0; k < 5; k++) {
      const a = i * 1.7 + k * 1.3;
      const d = 18 + ((i * 7 + k * 11) % 26);
      g.fillStyle(dark, 0.45).fillCircle(c - 6 + Math.cos(a) * d, c - 6 + Math.sin(a) * d, 5 + ((i + k) % 4) * 2);
    }
    g.fillStyle(light, 0.6).fillCircle(c - 26, c - 26, 11);
    g.fillStyle(0xffffff, 0.5).fillCircle(c - 30, c - 30, 4);
    g.generateTexture(`planet-${i}`, c * 2, c * 2);
  });

  // Lua (obstáculo)
  g.clear();
  g.fillStyle(0x495057, 1).fillCircle(16, 16, 15);
  g.fillStyle(0xadb5bd, 1).fillCircle(14, 14, 12);
  g.fillStyle(0x6c757d, 1).fillCircle(10, 16, 3).fillCircle(18, 10, 2.5).fillCircle(18, 20, 2);
  g.lineStyle(2, 0xff3860, 0.9).strokeCircle(16, 16, 15);
  g.generateTexture('moon', 32, 32);

  // Cometas
  SKINS.forEach((s) => {
    g.clear();
    for (let r = 22; r > 9; r -= 3) g.fillStyle(s.glow, 0.09).fillCircle(24, 24, r);
    g.fillStyle(s.glow, 1).fillCircle(24, 24, 10);
    g.fillStyle(s.core, 1).fillCircle(24, 24, 7);
    g.generateTexture(`comet-${s.id}`, 48, 48);
  });

  // Partícula do rastro
  g.clear();
  g.fillStyle(0xffffff, 1).fillCircle(6, 6, 6);
  g.generateTexture('dot', 12, 12);

  // Cristal (moeda do jogo)
  g.clear();
  g.fillStyle(0x0b7285, 1).fillPoints([{ x: 14, y: 1 }, { x: 27, y: 12 }, { x: 14, y: 33 }, { x: 1, y: 12 }], true);
  g.fillStyle(0x66d9e8, 1).fillPoints([{ x: 14, y: 4 }, { x: 24, y: 12 }, { x: 14, y: 29 }, { x: 4, y: 12 }], true);
  g.fillStyle(0xe3fafc, 1).fillPoints([{ x: 14, y: 4 }, { x: 19, y: 12 }, { x: 14, y: 12 }, { x: 8, y: 12 }], true);
  g.generateTexture('gem', 28, 34);

  // Céu estrelado (duas camadas para parallax) e nebulosas
  starLayer(g, 'stars-far', 512, 160, 1, 0.5);
  starLayer(g, 'stars-near', 512, 50, 2, 0.9);
  g.clear();
  const neb = [[120, 140, 0x5f3dc4], [400, 360, 0xa61e4d], [220, 470, 0x1c5d99]];
  // Desenha cada nebulosa também nas bordas opostas para o padrão emendar sem costura
  neb.forEach(([x, y, col]) => {
    for (let r = 150; r > 20; r -= 10) {
      for (const ox of [-512, 0, 512]) {
        for (const oy of [-512, 0, 512]) g.fillStyle(col, 0.025).fillCircle(x + ox, y + oy, r);
      }
    }
  });
  g.generateTexture('nebula', 512, 512);

  g.destroy();
}

function starLayer(g, key, size, count, maxR, maxA) {
  g.clear();
  // Pseudoaleatório fixo para o céu ser sempre o mesmo
  let seed = key.length * 9301;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < count; i++) {
    g.fillStyle(0xffffff, 0.2 + rnd() * maxA).fillCircle(rnd() * size, rnd() * size, 0.6 + rnd() * maxR);
  }
  g.generateTexture(key, size, size);
}
