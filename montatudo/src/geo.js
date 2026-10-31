// Atalhos para montar peças com formas simples. Todas as medidas em metros.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { M } from './materials.js';

function mesh(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Caixa (com cantos arredondados se `r` > 0). */
export function box(w, h, d, mat, x = 0, y = 0, z = 0, r = 0) {
  const rr = Math.min(r, Math.min(w, h, d) / 2 - 1e-5);
  const geo = rr > 0 ? new RoundedBoxGeometry(w, h, d, 3, rr) : new THREE.BoxGeometry(w, h, d);
  return mesh(geo, mat, x, y, z);
}

/** Cilindro em pé (eixo Y). */
export function cyl(rTop, rBot, h, mat, x = 0, y = 0, z = 0, seg = 28) {
  return mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat, x, y, z);
}

export function sphere(r, mat, x = 0, y = 0, z = 0) {
  return mesh(new THREE.SphereGeometry(r, 32, 20), mat, x, y, z);
}

export function torus(r, tube, mat, x = 0, y = 0, z = 0) {
  return mesh(new THREE.TorusGeometry(r, tube, 12, 48), mat, x, y, z);
}

export function group(...children) {
  const g = new THREE.Group();
  children.flat().forEach((c) => g.add(c));
  return g;
}

export function at(obj, x, y, z) {
  obj.position.set(x, y, z);
  return obj;
}

export function rot(obj, x = 0, y = 0, z = 0) {
  obj.rotation.set(x, y, z);
  return obj;
}

/**
 * Ventoinha quadrada de PC virada para +Z. As pás giram depois que a peça é encaixada
 * (`userData.spin`). `rgb` desenha o anel de LED.
 */
export function fan(size = 0.12, rgb = M.rgbCyan) {
  const t = 0.025;
  const s = size;
  const bar = s * 0.12;
  const frame = group(
    box(s, bar, t, M.plasticBlack, 0, (s - bar) / 2, 0, 0.003),
    box(s, bar, t, M.plasticBlack, 0, -(s - bar) / 2, 0, 0.003),
    box(bar, s, t, M.plasticBlack, (s - bar) / 2, 0, 0, 0.003),
    box(bar, s, t, M.plasticBlack, -(s - bar) / 2, 0, 0, 0.003),
  );
  const ring = rot(torus(s * 0.4, 0.0025, rgb, 0, 0, t / 2 - 0.002), 0, 0, 0);
  const blades = new THREE.Group();
  blades.add(rot(cyl(s * 0.14, s * 0.14, t * 0.8, M.plasticDark), Math.PI / 2, 0, 0));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const b = box(s * 0.25, s * 0.07, 0.002, M.plasticDark, Math.cos(a) * s * 0.24, Math.sin(a) * s * 0.24, 0);
    b.rotation.set(0.35, 0, a);
    blades.add(b);
  }
  blades.userData.spin = 18;
  return group(frame, ring, blades);
}

/** Desliga sombras de objetos pequenos (melhor desempenho no celular). */
export function noShadow(obj) {
  obj.traverse((o) => {
    o.castShadow = false;
  });
  return obj;
}
