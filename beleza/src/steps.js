// As etapas do atendimento, na ordem: rosto, unhas e cabelo.
// Cada etapa diz qual ferramenta usar, o que o dedo faz (esfregar ou tocar) e como medir o progresso.
import * as THREE from 'three';
import { HAND_POS, TIP_START, TIP_TARGET, dirToUV, inCheek, inFace, rgb, setTip, uvToDir } from './characters.js';
import { Sfx } from './audio.js';

const FACE_VIEW = { target: [0, -0.005, 0], dist: 0.42, az: 0, polar: 1.5 };
const CLOSE = (target, dist, az = 0, polar = 1.5) => ({ target, dist, az, polar });
const HAND_VIEW = { target: [HAND_POS.x + 0.0, HAND_POS.y + 0.01, HAND_POS.z + 0.045], dist: 0.24, az: 0, polar: 0.62 };
const HAIR_VIEW = (az) => ({ target: [0, 0.03, -0.01], dist: 0.5, az, polar: 1.15, free: true });

/** Etapa de "pintar/apagar" numa ou mais superfícies. */
const paintStep = (o) => ({ kind: 'drag', ...o });

/**
 * ctx: { c (cliente montada), fx (partículas), scene, tween(ms, fn, done), brush (tamanho do pincel),
 *        speed (lixa/secador), deco (pacote de strass coloridos) }
 */
export function buildSteps(ctx) {
  const { c, fx } = ctx;
  const face = c.face;
  const faceRegion = face.region((u, v) => inFace(uvToDir(u, v)));
  const cheekRegion = face.region((u, v) => inCheek(uvToDir(u, v)));
  const R = (r) => r * ctx.brush;
  const lipMeshes = c.lipMeshes;
  if (!c.lips.layer('lipstick')) c.lips.add('lipstick', 'source-over', 0.95);

  const nails = c.hand.nails;
  const plates = nails.map((n) => n.plate);
  const nailOf = (obj) => nails.find((n) => n.plate === obj || n.tip === obj);
  const hairMeshes = c.hair.map((h) => h.mesh);
  const hairOf = (obj) => c.hair.find((h) => h.mesh === obj);
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

  // Começo de cada contagem "remover": quanto havia no início
  let dirt0 = 1;
  let old0 = [];

  const tapList = (list, hit, radius, onHit) => {
    let best = null;
    let bestD = radius;
    for (const it of list) {
      if (it.done) continue;
      const d = it.mesh.getWorldPosition(new THREE.Vector3()).distanceTo(hit.point);
      if (d < bestD) {
        bestD = d;
        best = it;
      }
    }
    if (best) {
      best.done = true;
      onHit(best);
    }
    return !!best;
  };

  const popOut = (it, distance) => {
    const from = it.mesh.position.clone();
    const to = from.clone().addScaledVector(it.dir, distance);
    ctx.tween(260, (k) => {
      it.mesh.position.lerpVectors(from, to, k);
      it.mesh.scale.setScalar(Math.max(0.01, 1 - k));
    }, () => (it.mesh.visible = false));
  };

  const steps = [
    // ---------------- ROSTO ----------------
    paintStep({
      station: 'rosto',
      title: 'Limpar a pele',
      tool: 'algodao',
      icon: '🧴',
      sound: 'algodao',
      hint: 'Esfregue o algodão com demaquilante no rosto todo',
      view: FACE_VIEW,
      targets: () => [c.head],
      setup() {
        dirt0 = Math.max(0.01, face.coverage('dirt', faceRegion, 0.15));
      },
      brush(hit, prev) {
        face.stroke('dirt', prev?.uv, hit.uv, R(0.022), '', 0.35, true);
      },
      measure() {
        return (1 - face.coverage('dirt', faceRegion, 0.15) / dirt0) / 0.92;
      },
      finish() {
        face.clear('dirt');
      },
    }),
    {
      station: 'rosto',
      kind: 'tap',
      title: 'Tirar cravos',
      tool: 'extrator',
      icon: '🔍',
      hint: 'Toque em cada cravo (pontinhos escuros no nariz, testa e queixo)',
      view: CLOSE([0, 0.0, 0.06], 0.26),
      targets: () => [c.head],
      tap(hit) {
        return tapList(c.blackheads, hit, 0.012, (b) => {
          Sfx.pop();
          popOut(b, 0.006);
          fx.spawn('po', b.mesh.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(0, 0.02, 0.03), 3, 0.02);
        });
      },
      measure: () => c.blackheads.filter((b) => b.done).length / c.blackheads.length,
      finish() {
        c.blackheads.forEach((b) => (b.mesh.visible = false));
      },
    },
    {
      station: 'rosto',
      kind: 'tap',
      title: 'Espinhas',
      tool: 'extrator',
      icon: '✨',
      hint: 'Toque nas espinhas para estourar (e deixe a pele lisinha)',
      view: FACE_VIEW,
      targets: () => [c.head, ...c.pimples.map((p) => p.mesh.children[0])],
      tap(hit) {
        return tapList(c.pimples, hit, 0.014, (p) => {
          Sfx.pop();
          const top = p.mesh.children[1];
          const pos = top.getWorldPosition(new THREE.Vector3());
          fx.spawn('bolha', pos, p.dir.clone().multiplyScalar(0.04), 5, 0.03);
          ctx.tween(300, (k) => p.mesh.scale.setScalar(Math.max(0.01, 1 - k)), () => (p.mesh.visible = false));
          const uv = dirToUV(p.dir);
          face.dab('redness', uv.x, uv.y, 0.008, '214,90,90', 0.5);
        });
      },
      measure: () => c.pimples.filter((p) => p.done).length / c.pimples.length,
      finish() {
        c.pimples.forEach((p) => (p.mesh.visible = false));
      },
    },
    paintStep({
      station: 'rosto',
      title: 'Máscara de argila',
      tool: 'pincel',
      icon: '🟢',
      sound: 'pincel',
      hint: 'Espalhe a máscara verde por todo o rosto',
      view: FACE_VIEW,
      targets: () => [c.head],
      setup() {
        this.toolTint = '#a7c98a';
      },
      brush(hit, prev) {
        face.stroke('mask', prev?.uv, hit.uv, R(0.024), '160,200,130', 0.9);
      },
      measure() {
        return face.coverage('mask', faceRegion) / 0.88;
      },
    }),
    paintStep({
      station: 'rosto',
      title: 'Tirar a máscara',
      tool: 'esponja',
      icon: '💦',
      sound: 'esponja',
      hint: 'Passe a esponja molhada para tirar toda a máscara',
      view: FACE_VIEW,
      targets: () => [c.head],
      setup() {
        this.toolTint = '#ffffff';
        this.start = Math.max(0.01, face.coverage('mask', faceRegion, 0.2));
      },
      brush(hit, prev) {
        face.stroke('mask', prev?.uv, hit.uv, R(0.026), '', 0.4, true);
        if (Math.random() < 0.3) fx.spawn('gota', hit.point, new THREE.Vector3(0, -0.02, 0.02), 1, 0.01);
      },
      measure() {
        return (1 - face.coverage('mask', faceRegion, 0.2) / this.start) / 0.93;
      },
      finish() {
        face.clear('mask');
      },
    }),
    {
      station: 'rosto',
      kind: 'tap',
      title: 'Sobrancelhas',
      tool: 'pinca',
      icon: '🪮',
      hint: 'Tire com a pinça os pelinhos fora do lugar',
      view: CLOSE([0, 0.03, 0.06], 0.22),
      targets: () => [c.head],
      tap(hit) {
        return tapList(c.strays, hit, 0.01, (s) => {
          Sfx.pluck();
          popOut(s, 0.02);
          fx.spawn('pelo', s.mesh.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(0, 0.05, 0.05), 1, 0.01);
        });
      },
      measure: () => c.strays.filter((s) => s.done).length / c.strays.length,
      finish() {
        c.strays.forEach((s) => (s.mesh.visible = false));
      },
    },
    paintStep({
      station: 'rosto',
      title: 'Base',
      tool: 'esponja',
      icon: '🧽',
      sound: 'esponja',
      hint: 'Espalhe a base para uniformizar a pele',
      view: FACE_VIEW,
      targets: () => [c.head],
      setup() {
        this.toolTint = c.client.skin;
        // base um pouquinho mais clara e mais "lisa" que a pele
        const col = new THREE.Color(c.client.skin).lerp(new THREE.Color('#ffe9dc'), 0.12);
        this.col = rgb(col.getHex());
      },
      brush(hit, prev) {
        face.stroke('foundation', prev?.uv, hit.uv, R(0.026), this.col, 0.55);
      },
      measure() {
        return face.coverage('foundation', faceRegion, 0.4) / 0.85;
      },
    }),
    paintStep({
      station: 'rosto',
      title: 'Blush',
      tool: 'blush',
      icon: '🌸',
      sound: 'pincel',
      colors: 'blush',
      hint: 'Escolha a cor e passe nas maçãs do rosto',
      view: CLOSE([0, -0.02, 0.03], 0.36),
      targets: () => [c.head],
      brush(hit, prev) {
        face.stroke('blush', prev?.uv, hit.uv, R(0.02), rgb(this.color), 0.22);
      },
      measure() {
        return face.coverage('blush', cheekRegion, 0.3) / 0.7;
      },
      onColor() {
        face.clear('blush');
      },
    }),
    paintStep({
      station: 'rosto',
      title: 'Batom',
      tool: 'batom',
      icon: '💄',
      sound: 'pincel',
      colors: 'lips',
      hint: 'Escolha a cor e pinte os lábios',
      view: CLOSE([0, -0.04, 0.09], 0.15),
      targets: () => lipMeshes,
      brush(hit, prev) {
        c.lips.stroke('lipstick', prev?.uv, hit.uv, R(0.09), rgb(this.color), 0.6);
      },
      measure() {
        return c.lips.coverage('lipstick', null) / 0.9;
      },
      onColor() {
        c.lips.clear('lipstick');
      },
    }),

    // ---------------- UNHAS ----------------
    paintStep({
      station: 'unhas',
      title: 'Tirar o esmalte velho',
      tool: 'algodao',
      icon: '🧴',
      sound: 'algodao',
      hint: 'Esfregue o algodão com removedor em cada unha',
      view: HAND_VIEW,
      targets: () => plates,
      setup() {
        old0 = nails.map((n) => Math.max(0.01, n.surface.coverage('old', null)));
      },
      brush(hit, prev) {
        const n = nailOf(hit.object);
        n.surface.stroke('old', prev?.object === hit.object ? prev.uv : null, hit.uv, R(0.18), '', 0.35, true);
      },
      measure() {
        return avg(nails.map((n, i) => Math.min(1, (1 - n.surface.coverage('old', null) / old0[i]) / 0.92)));
      },
      finish() {
        nails.forEach((n) => n.surface.clear('old'));
      },
    }),
    {
      station: 'unhas',
      kind: 'drag',
      title: 'Lixar',
      tool: 'lixa',
      icon: '💅',
      sound: 'lixa',
      hint: 'Passe a lixa para frente e para trás nas pontas das unhas',
      view: HAND_VIEW,
      targets: () => [...plates, ...nails.map((n) => n.tip)],
      brush(hit, prev, intensity, dt) {
        const n = nailOf(hit.object);
        if (!n || n.tipLen <= TIP_TARGET) return;
        setTip(n, Math.max(TIP_TARGET, n.tipLen - intensity * dt * 0.006 * ctx.speed));
        if (Math.random() < intensity) fx.spawn('po', n.tip.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(0, 0.01, 0.02), 2, 0.03);
      },
      measure: () => avg(nails.map((n) => (TIP_START - n.tipLen) / (TIP_START - TIP_TARGET))),
      finish() {
        nails.forEach((n) => setTip(n, TIP_TARGET));
      },
    },
    paintStep({
      station: 'unhas',
      title: 'Esmaltar',
      tool: 'esmalte',
      icon: '💅',
      sound: 'pincel',
      colors: 'nails',
      hint: 'Escolha a cor e pinte cada unha inteirinha',
      view: HAND_VIEW,
      targets: () => [...plates, ...nails.map((n) => n.tip)],
      brush(hit, prev) {
        const n = nailOf(hit.object);
        if (hit.object === n.tip) {
          n.tip.material.color.set(this.color);
          return;
        }
        n.surface.stroke('polish', prev?.object === hit.object ? prev.uv : null, hit.uv, R(0.2), rgb(this.color), 0.75);
      },
      measure() {
        return avg(nails.map((n) => Math.min(1, n.surface.coverage('polish', null) / 0.9)));
      },
      onColor() {
        nails.forEach((n) => {
          n.surface.clear('polish');
          n.tip.material.color.set(0xfbf3ee);
        });
      },
      finish() {
        nails.forEach((n) => n.tip.material.color.set(this.color));
      },
    }),
    {
      station: 'unhas',
      kind: 'tap',
      title: 'Decorar',
      tool: 'strass',
      icon: '💎',
      hint: 'Toque nas unhas para colar strass (pelo menos 3)',
      view: HAND_VIEW,
      targets: () => plates,
      tap(hit) {
        const gem = new THREE.Mesh(
          new THREE.OctahedronGeometry(ctx.deco ? 0.0028 : 0.0022),
          new THREE.MeshPhysicalMaterial({ color: ctx.deco ? ['#ffd1f0', '#d9f5ff', '#fff3b0'][c.gems.length % 3] : '#ffffff', metalness: 0.1, roughness: 0.02, clearcoat: 1, emissive: '#221522' }),
        );
        gem.position.copy(hit.point).addScaledVector(hit.normal, 0.0012);
        gem.scale.set(1, 0.5, 1);
        gem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), hit.normal);
        ctx.scene.add(gem);
        c.gems.push(gem);
        Sfx.gem();
        fx.spawn('brilho', gem.position, new THREE.Vector3(0, 0.03, 0), 4, 0.03);
        return true;
      },
      measure: () => c.gems.length / 3,
    },

    // ---------------- CABELO ----------------
    paintStep({
      station: 'cabelo',
      title: 'Molhar o cabelo',
      tool: 'chuveiro',
      icon: '🚿',
      sound: 'agua',
      hint: 'Molhe o cabelo todo. Arraste fora da cabeça para girar',
      view: HAIR_VIEW(-0.6),
      targets: () => hairMeshes,
      setup() {
        c.towel.visible = false;
        c.hairGroup.visible = true;
      },
      brush(hit, prev) {
        const h = hairOf(hit.object);
        h.surface.stroke('wet', prev?.object === hit.object ? prev.uv : null, hit.uv, R(0.07), '120,120,140', 0.6);
        const from = hit.point.clone().addScaledVector(hit.normal, 0.05);
        fx.spawn('gota', from, hit.normal.clone().multiplyScalar(-0.3), 2, 0.05);
      },
      measure() {
        return avg(c.hair.map((h) => h.surface.coverage('wet', null, 0.3))) / 0.85;
      },
    }),
    {
      station: 'cabelo',
      kind: 'drag',
      title: 'Shampoo',
      tool: 'shampoo',
      icon: '🫧',
      sound: 'espuma',
      hint: 'Esfregue o shampoo até fazer bastante espuma',
      view: HAIR_VIEW(0.6),
      targets: () => hairMeshes,
      setup() {
        this.foam = [];
        this.target = 55;
      },
      brush(hit) {
        if (this.foam.some((f) => f.position.distanceTo(hit.point) < 0.013)) return;
        const b = new THREE.Mesh(this.geo ?? (this.geo = new THREE.SphereGeometry(1, 14, 10)), this.mat ?? (this.mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, transmission: 0, clearcoat: 1, sheen: 1 })));
        const s = 0.006 + Math.random() * 0.006;
        b.position.copy(hit.point).addScaledVector(hit.normal, s * 0.4);
        b.scale.setScalar(0.001);
        ctx.scene.add(b);
        this.foam.push(b);
        ctx.tween(220, (k) => b.scale.setScalar(Math.max(0.001, s * k)));
        if (Math.random() < 0.5) fx.spawn('bolha', hit.point, hit.normal.clone().multiplyScalar(0.03), 1, 0.02);
      },
      measure() {
        return this.foam.length / this.target;
      },
    },
    {
      station: 'cabelo',
      kind: 'drag',
      title: 'Enxaguar',
      tool: 'chuveiro',
      icon: '🚿',
      sound: 'agua',
      hint: 'Tire toda a espuma com o chuveirinho',
      view: HAIR_VIEW(-0.6),
      targets: () => hairMeshes,
      setup() {
        this.foam = steps.find((s) => s.title === 'Shampoo').foam ?? [];
        this.total = Math.max(1, this.foam.length);
      },
      brush(hit) {
        this.foam.forEach((b) => {
          if (b.userData.gone || b.position.distanceTo(hit.point) > 0.03 * ctx.brush) return;
          b.userData.gone = true;
          const s = b.scale.x;
          ctx.tween(250, (k) => b.scale.setScalar(Math.max(0.0005, s * (1 - k))), () => ctx.scene.remove(b));
        });
        fx.spawn('gota', hit.point.clone().addScaledVector(hit.normal, 0.05), hit.normal.clone().multiplyScalar(-0.3), 2, 0.05);
      },
      measure() {
        return this.foam.filter((b) => b.userData.gone).length / this.total / 0.95;
      },
      finish() {
        this.foam.forEach((b) => ctx.scene.remove(b));
      },
    },
    paintStep({
      station: 'cabelo',
      title: 'Secar',
      tool: 'secador',
      icon: '💨',
      sound: 'secador',
      hint: 'Passe o secador em todo o cabelo',
      view: HAIR_VIEW(0.6),
      targets: () => hairMeshes,
      setup() {
        this.start = Math.max(0.01, avg(c.hair.map((h) => h.surface.coverage('wet', null, 0.15))));
      },
      brush(hit, prev, intensity) {
        const h = hairOf(hit.object);
        h.surface.stroke('wet', prev?.object === hit.object ? prev.uv : null, hit.uv, R(0.08), '', 0.12 + 0.2 * ctx.speed * intensity, true);
        // os fios "balançam" com o vento
        h.mesh.scale.multiplyScalar(1 + (Math.random() - 0.5) * 0.004);
      },
      measure() {
        return (1 - avg(c.hair.map((h) => h.surface.coverage('wet', null, 0.15))) / this.start) / 0.9;
      },
      finish() {
        c.hair.forEach((h) => h.surface.clear('wet'));
      },
    }),
    paintStep({
      station: 'cabelo',
      title: 'Pintar o cabelo',
      tool: 'tintura',
      icon: '🎨',
      sound: 'pincel',
      colors: 'hair',
      hint: 'Escolha a cor e pinte o cabelo todo (gire para pintar atrás)',
      view: HAIR_VIEW(-0.6),
      targets: () => hairMeshes,
      brush(hit, prev) {
        const h = hairOf(hit.object);
        h.surface.stroke('dye', prev?.object === hit.object ? prev.uv : null, hit.uv, R(0.07), rgb(this.color), 0.7);
      },
      measure() {
        return avg(c.hair.map((h) => h.surface.coverage('dye', null))) / 0.85;
      },
      onColor() {
        c.hair.forEach((h) => h.surface.clear('dye'));
      },
    }),
  ];
  return steps;
}

export const STATIONS = [
  { id: 'rosto', name: 'Rosto', icon: '💆' },
  { id: 'unhas', name: 'Unhas', icon: '💅' },
  { id: 'cabelo', name: 'Cabelo', icon: '💇' },
];

