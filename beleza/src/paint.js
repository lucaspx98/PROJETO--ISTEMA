// Superfície pintável: uma textura feita de camadas (canvas) que o dedo pinta ou apaga
// pelas coordenadas UV do ponto tocado no modelo 3D.
import * as THREE from 'three';

const SAMPLE = 48; // resolução usada para medir o progresso

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

export class Surface {
  /** drawBase(ctx, size) pinta a camada de fundo (pele, unha, cabelo). */
  constructor(size, drawBase) {
    this.size = size;
    this.out = makeCanvas(size);
    this.outCtx = this.out.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.out);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    this.stack = []; // { name, canvas, ctx, op, alpha, visible }
    this.add('base', 'source-over', 1);
    drawBase(this.ctx('base'), size);
    this.sampleCanvas = makeCanvas(SAMPLE);
    this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });
    this.dirty = true;
    this.update();
  }

  /** Adiciona uma camada no topo da pilha (op = modo de mistura do canvas). */
  add(name, op = 'source-over', alpha = 1) {
    const canvas = makeCanvas(this.size);
    this.stack.push({ name, canvas, ctx: canvas.getContext('2d'), op, alpha, visible: true });
    this.dirty = true;
    return this.ctx(name);
  }

  layer(name) {
    return this.stack.find((l) => l.name === name);
  }

  ctx(name) {
    return this.layer(name).ctx;
  }

  clear(name) {
    const l = this.layer(name);
    l.ctx.clearRect(0, 0, this.size, this.size);
    this.dirty = true;
  }

  /** Um toque macio de pincel em (u, v). r é o raio em fração da textura. */
  dab(name, u, v, r, color, alpha = 1, erase = false) {
    const c = this.ctx(name);
    const x = u * this.size;
    const y = (1 - v) * this.size;
    const R = r * this.size;
    const g = c.createRadialGradient(x, y, 0, x, y, R);
    const col = erase ? '0,0,0' : color;
    g.addColorStop(0, `rgba(${col},${alpha})`);
    g.addColorStop(0.55, `rgba(${col},${alpha * 0.8})`);
    g.addColorStop(1, `rgba(${col},0)`);
    c.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, R, 0, Math.PI * 2);
    c.fill();
    c.globalCompositeOperation = 'source-over';
    this.dirty = true;
  }

  /** Traço entre dois pontos UV (vários toques espaçados). Ignora saltos na emenda da textura. */
  stroke(name, a, b, r, color, alpha, erase) {
    if (a && Math.abs(a.x - b.x) < 0.3 && Math.abs(a.y - b.y) < 0.3) {
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const n = Math.max(1, Math.ceil(d / (r * 0.35)));
      for (let i = 1; i <= n; i++) this.dab(name, a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n, r, color, alpha, erase);
    } else {
      this.dab(name, b.x, b.y, r, color, alpha, erase);
    }
  }

  update() {
    if (!this.dirty) return;
    const c = this.outCtx;
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.clearRect(0, 0, this.size, this.size);
    for (const l of this.stack) {
      if (!l.visible) continue;
      c.globalCompositeOperation = l.op;
      c.globalAlpha = l.alpha;
      c.drawImage(l.canvas, 0, 0);
    }
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    this.tex.needsUpdate = true;
    this.dirty = false;
  }

  /** Máscara de região (u, v) => bool, pré-calculada na resolução de amostragem. */
  region(fn) {
    const m = new Uint8Array(SAMPLE * SAMPLE);
    let count = 0;
    for (let j = 0; j < SAMPLE; j++) {
      for (let i = 0; i < SAMPLE; i++) {
        const ok = fn((i + 0.5) / SAMPLE, 1 - (j + 0.5) / SAMPLE);
        m[j * SAMPLE + i] = ok ? 1 : 0;
        count += ok ? 1 : 0;
      }
    }
    return { m, count };
  }

  /**
   * Região = partes da textura usadas pelos vértices que passam no filtro `keep(normalNoMundo)`.
   * Serve para medir só o lado visível (ex.: frente dos lábios, não a parte escondida).
   */
  regionFromMeshes(meshes, keep) {
    const m = new Uint8Array(SAMPLE * SAMPLE);
    const n = new THREE.Vector3();
    const nm = new THREE.Matrix3();
    for (const mesh of meshes) {
      mesh.updateMatrixWorld(true);
      nm.getNormalMatrix(mesh.matrixWorld);
      const uv = mesh.geometry.attributes.uv;
      const normal = mesh.geometry.attributes.normal;
      for (let i = 0; i < uv.count; i++) {
        n.fromBufferAttribute(normal, i).applyMatrix3(nm).normalize();
        if (!keep(n)) continue;
        const ci = Math.min(SAMPLE - 1, Math.floor(uv.getX(i) * SAMPLE));
        const cj = Math.min(SAMPLE - 1, Math.floor((1 - uv.getY(i)) * SAMPLE));
        // marca a célula e as vizinhas (os vértices são mais espaçados que a amostragem)
        for (let dj = -2; dj <= 2; dj++) {
          for (let di = -2; di <= 2; di++) {
            const x = ci + di;
            const y = cj + dj;
            if (x >= 0 && y >= 0 && x < SAMPLE && y < SAMPLE) m[y * SAMPLE + x] = 1;
          }
        }
      }
    }
    let count = 0;
    for (let k = 0; k < m.length; k++) count += m[k];
    return { m, count };
  }

  /** Fração da região em que a camada está com alfa acima do limite. */
  coverage(name, region, threshold = 0.45) {
    const c = this.sampleCtx;
    c.clearRect(0, 0, SAMPLE, SAMPLE);
    c.drawImage(this.layer(name).canvas, 0, 0, SAMPLE, SAMPLE);
    const d = c.getImageData(0, 0, SAMPLE, SAMPLE).data;
    let hit = 0;
    for (let k = 0; k < SAMPLE * SAMPLE; k++) {
      if (region && !region.m[k]) continue;
      if (d[k * 4 + 3] / 255 > threshold) hit++;
    }
    return hit / (region ? Math.max(1, region.count) : SAMPLE * SAMPLE);
  }
}

/** Cor "#rrggbb" ou número para "r,g,b" (formato usado nos gradientes). */
export function rgb(color) {
  const h = new THREE.Color(color).getHex(); // getHex devolve em sRGB, como o canvas espera
  return `${(h >> 16) & 255},${(h >> 8) & 255},${h & 255}`;
}
