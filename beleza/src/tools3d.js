// Ferramentas 3D que seguem o dedo e partículas (gotas, pó, bolhas, brilhos).
// Cada ferramenta tem a ponta de contato na origem e o corpo para +Y.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, ...o });
const chrome = std(0xeef0f3, { metalness: 1, roughness: 0.15 });
const gold = std(0xe2b56b, { metalness: 1, roughness: 0.25 });
const white = std(0xffffff, { roughness: 0.95 });

function m(geo, mat, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, mat);
  o.position.set(x, y, z);
  o.castShadow = true;
  return o;
}
const cyl = (rt, rb, h, mat, y) => m(new THREE.CylinderGeometry(rt, rb, h, 24), mat, 0, y, 0);

/** Devolve { group, tint(cor), offset } — offset = distância da ponta até a pele. */
export function makeTool(id) {
  const g = new THREE.Group();
  const tintable = [];
  let offset = 0.001;
  const tinted = (mat) => {
    tintable.push(mat);
    return mat;
  };
  switch (id) {
    case 'algodao': {
      const pad = cyl(0.02, 0.02, 0.005, white, 0.0025);
      pad.scale.set(1, 1, 0.85);
      g.add(pad);
      break;
    }
    case 'extrator':
      g.add(cyl(0.0014, 0.0014, 0.08, chrome, 0.042));
      g.add(m(new THREE.TorusGeometry(0.0035, 0.0007, 8, 20), chrome, 0, 0.002, 0));
      g.children[1].rotation.x = Math.PI / 2;
      break;
    case 'pinca':
      [-1, 1].forEach((s) => {
        const arm = m(new THREE.BoxGeometry(0.002, 0.075, 0.004), chrome, s * 0.0035, 0.037, 0);
        arm.rotation.z = -s * 0.07;
        g.add(arm);
      });
      break;
    case 'pincel':
    case 'tintura':
    case 'esmalte': {
      const small = id === 'esmalte';
      g.add(cyl(0.004, 0.005, small ? 0.04 : 0.08, std(id === 'tintura' ? 0x333333 : 0xf2a6c0), small ? 0.035 : 0.06));
      g.add(cyl(0.005, 0.004, 0.012, gold, small ? 0.012 : 0.017));
      const bristles = m(new RoundedBoxGeometry(small ? 0.005 : id === 'tintura' ? 0.016 : 0.011, small ? 0.008 : 0.013, 0.003, 2, 0.001), tinted(std(0xcfa27a, { roughness: 0.8 })), 0, small ? 0.004 : 0.006, 0);
      g.add(bristles);
      if (small) g.add(cyl(0.007, 0.007, 0.03, std(0x111111), 0.07));
      break;
    }
    case 'esponja': {
      const s = m(new THREE.SphereGeometry(0.016, 24, 16), tinted(std(0xf6a5c0, { roughness: 1 })), 0, 0.019, 0);
      s.scale.set(1, 1.3, 1);
      g.add(s);
      break;
    }
    case 'blush': {
      g.add(cyl(0.004, 0.006, 0.07, std(0x1f1f1f), 0.06));
      g.add(cyl(0.006, 0.005, 0.012, gold, 0.022));
      const puff = m(new THREE.SphereGeometry(0.012, 24, 16), tinted(std(0xf2c7b5, { roughness: 1 })), 0, 0.01, 0);
      puff.scale.set(1, 1.2, 0.8);
      g.add(puff);
      break;
    }
    case 'batom': {
      const bullet = m(new THREE.CylinderGeometry(0.0045, 0.0055, 0.012, 24), tinted(std(0xc8102e, { roughness: 0.25 })), 0, 0.006, 0);
      g.add(bullet);
      g.add(cyl(0.0065, 0.0065, 0.04, gold, 0.032));
      break;
    }
    case 'lixa': {
      const file = m(new RoundedBoxGeometry(0.09, 0.003, 0.013, 2, 0.0012), std(0x9b8ea6, { roughness: 1 }), 0, 0.002, 0);
      g.add(file);
      break;
    }
    case 'strass':
      g.add(m(new THREE.OctahedronGeometry(0.004), std(0xffffff, { metalness: 0.2, roughness: 0.05, emissive: 0x332233 }), 0, 0.004, 0));
      break;
    case 'chuveiro': {
      g.add(m(new THREE.CylinderGeometry(0.022, 0.018, 0.012, 32), chrome, 0, 0.0, 0));
      const handle = cyl(0.006, 0.007, 0.09, chrome, 0.05);
      handle.rotation.z = 0.5;
      handle.position.x = -0.022;
      g.add(handle);
      offset = 0.06;
      break;
    }
    case 'shampoo': {
      g.add(m(new RoundedBoxGeometry(0.03, 0.07, 0.018, 3, 0.008), std(0x8fd3c9, { roughness: 0.3 }), 0, 0.045, 0));
      g.add(cyl(0.006, 0.008, 0.012, std(0xffffff), 0.004));
      offset = 0.03;
      break;
    }
    case 'secador': {
      const body = cyl(0.022, 0.022, 0.08, std(0xf7a8c4, { roughness: 0.3 }), 0.06);
      g.add(body);
      g.add(cyl(0.014, 0.02, 0.025, std(0x333333), 0.012));
      const h = cyl(0.008, 0.009, 0.07, std(0xf7a8c4, { roughness: 0.3 }), 0.07);
      h.rotation.z = Math.PI / 2;
      h.position.x = 0.04;
      g.add(h);
      offset = 0.06;
      break;
    }
    default:
      break;
  }
  g.traverse((o) => (o.castShadow = false));
  return {
    group: g,
    offset,
    tint(hex) {
      tintable.forEach((mat) => mat.color.set(hex));
    },
  };
}

// ---------- partículas ----------

const TYPES = {
  gota: { color: 0x9fd8ff, size: 0.0022, gravity: -0.6, life: 0.7, opacity: 0.8 },
  po: { color: 0xf5eef2, size: 0.0012, gravity: -0.05, life: 0.9, opacity: 0.9 },
  bolha: { color: 0xffffff, size: 0.003, gravity: 0.03, life: 0.8, opacity: 0.85 },
  brilho: { color: 0xfff1a8, size: 0.002, gravity: 0, life: 0.6, opacity: 1, emissive: true },
  pelo: { color: 0x3a2a20, size: 0.0009, gravity: -0.3, life: 0.8, opacity: 1 },
};

export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.geo = new THREE.SphereGeometry(1, 8, 6);
    this.mats = {};
    Object.entries(TYPES).forEach(([k, t]) => {
      this.mats[k] = new THREE.MeshStandardMaterial({
        color: t.color,
        transparent: true,
        opacity: t.opacity,
        roughness: 0.2,
        emissive: t.emissive ? t.color : 0x000000,
        emissiveIntensity: t.emissive ? 2 : 0,
      });
    });
  }

  spawn(type, pos, vel, n = 1, spread = 0.02) {
    const t = TYPES[type];
    for (let i = 0; i < n; i++) {
      if (this.list.length > 220) return;
      const o = new THREE.Mesh(this.geo, this.mats[type]);
      const s = t.size * (0.6 + Math.random() * 0.8);
      o.scale.setScalar(s);
      o.position.copy(pos);
      this.scene.add(o);
      const v = vel.clone().add(new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread));
      this.list.push({ o, v, life: t.life * (0.7 + Math.random() * 0.6), age: 0, s, g: t.gravity });
    }
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.age += dt;
      p.v.y += p.g * dt;
      p.o.position.addScaledVector(p.v, dt);
      const k = 1 - p.age / p.life;
      p.o.scale.setScalar(p.s * Math.max(0.05, k));
      if (p.age >= p.life) {
        this.scene.remove(p.o);
        this.list.splice(i, 1);
      }
    }
  }

  clear() {
    this.list.forEach((p) => this.scene.remove(p.o));
    this.list = [];
  }
}
