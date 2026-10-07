// Todos os gráficos são desenhados por código: não há arquivos de imagem para licenciar.
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config.js';
import { SKINS } from './skins.js';

export function createTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // Céu em degradê
  const sky = scene.textures.createCanvas('sky', GAME_WIDTH, GAME_HEIGHT);
  const sctx = sky.getContext();
  const grad = sctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  grad.addColorStop(0, '#0b0820');
  grad.addColorStop(0.55, '#2b1055');
  grad.addColorStop(1, '#d53369');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  sky.refresh();

  // Estrelas
  g.clear();
  for (let i = 0; i < 70; i++) {
    g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.3, 1));
    g.fillCircle(Phaser.Math.Between(0, 511), Phaser.Math.Between(0, 299), Phaser.Math.FloatBetween(0.6, 1.8));
  }
  g.generateTexture('stars', 512, 300);

  // Montanhas distantes e prédios próximos (repetem horizontalmente)
  g.clear();
  g.fillStyle(0x3a1c71, 1);
  g.beginPath();
  g.moveTo(0, 200);
  const peaks = [[0, 120], [90, 40], [170, 110], [250, 30], [340, 120], [420, 60], [512, 120]];
  peaks.forEach(([x, y]) => g.lineTo(x, y));
  g.lineTo(512, 200);
  g.closePath();
  g.fillPath();
  g.generateTexture('mountains', 512, 200);

  g.clear();
  g.fillStyle(0x1a0f3a, 1);
  let x = 0;
  while (x < 512) {
    const w = Phaser.Math.Between(30, 60);
    const h = Phaser.Math.Between(40, 130);
    g.fillRect(x, 160 - h, w - 4, h);
    g.fillStyle(0xffd166, 0.5);
    for (let wy = 160 - h + 8; wy < 150; wy += 14) {
      for (let wx = x + 5; wx < x + w - 10; wx += 10) {
        if (Math.random() < 0.35) g.fillRect(wx, wy, 4, 6);
      }
    }
    g.fillStyle(0x1a0f3a, 1);
    x += w;
  }
  g.generateTexture('city', 512, 160);

  // Chão
  g.clear();
  g.fillStyle(0x16112e, 1);
  g.fillRect(0, 0, 64, 100);
  g.fillStyle(0x37e2d5, 1);
  g.fillRect(0, 0, 64, 6);
  g.fillStyle(0x2a2050, 1);
  g.fillRect(4, 18, 24, 8);
  g.fillRect(36, 44, 22, 8);
  g.generateTexture('ground', 64, 100);

  // Personagens
  SKINS.forEach((s) => {
    g.clear();
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(4, 6, 44, 44, 12);
    g.fillStyle(s.body, 1);
    g.fillRoundedRect(2, 2, 44, 44, 12);
    g.fillStyle(s.accent, 1);
    g.fillRect(2, 14, 44, 6); // faixa
    g.fillStyle(0xffffff, 1);
    g.fillCircle(28, 27, 7);
    g.fillCircle(40, 27, 5);
    g.fillStyle(0x111111, 1);
    g.fillCircle(31, 27, 3.5);
    g.fillCircle(42, 27, 2.5);
    g.generateTexture(`player-${s.id}`, 52, 52);
  });

  // Espinho
  g.clear();
  g.fillStyle(0xff3860, 1);
  g.fillTriangle(0, 40, 20, 0, 40, 40);
  g.fillStyle(0xffffff, 0.35);
  g.fillTriangle(12, 26, 20, 6, 22, 26);
  g.generateTexture('spike', 40, 40);

  // Blocos
  const block = (key, h) => {
    g.clear();
    g.fillStyle(0xf72585, 1);
    g.fillRoundedRect(0, 0, 46, h, 6);
    g.fillStyle(0x7209b7, 1);
    g.fillRoundedRect(5, 5, 36, h - 10, 4);
    g.lineStyle(3, 0xf72585, 1);
    g.lineBetween(5, 5, 41, h - 5);
    g.lineBetween(41, 5, 5, h - 5);
    g.generateTexture(key, 46, h);
  };
  block('block', 64);
  block('tall', 118);

  // Serra voadora
  g.clear();
  g.fillStyle(0xcfd8dc, 1);
  const teeth = 10;
  g.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? 24 : 18;
    const px = 24 + Math.cos(a) * r;
    const py = 24 + Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.fillPath();
  g.fillStyle(0xff3860, 1);
  g.fillCircle(24, 24, 7);
  g.generateTexture('saw', 48, 48);

  // Moeda
  g.clear();
  g.fillStyle(0xb8860b, 1);
  g.fillCircle(13, 13, 13);
  g.fillStyle(0xffd23f, 1);
  g.fillCircle(13, 13, 10);
  g.fillStyle(0xfff3b0, 1);
  g.fillRect(11, 7, 4, 12);
  g.generateTexture('coin', 26, 26);

  // Partícula
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture('dot', 8, 8);

  g.destroy();
}
