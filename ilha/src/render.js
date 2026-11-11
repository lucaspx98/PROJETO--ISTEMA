// Desenho 3D do mundo (Three.js): terreno, mar, céu com dia/noite, recursos instanciados,
// personagens animados, construções e efeitos. Só lê o estado de world.js.
import * as THREE from 'three';
import { BOSS, BUILDS, GRID, HALF, NPC, centerOf } from './world.js';
import * as Mo from './models.js';

const C = (hex) => new THREE.Color(hex);
const SKY = { day: C(0x8fd3ff), dusk: C(0xff9d6b), night: C(0x0c1330) };
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export class View {
  constructor(canvas, world) {
    this.w = world;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x8fd3ff, 120, 380);
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.3, 600);
    this.camYaw = Math.PI;
    this.camPitch = 0.5;
    this.camDist = 12;
    this.time = 0;

    this.hemi = new THREE.HemisphereLight(0xffffff, 0xb9c7a0, 1.7);
    this.sun = new THREE.DirectionalLight(0xfff2d6, 2.0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -42;
    sc.right = sc.top = 42;
    sc.near = 1;
    sc.far = 220;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.06;
    this.lantern = new THREE.PointLight(0xffd9a0, 0, 26, 1.4);
    this.scene.add(this.hemi, this.sun, this.sun.target, this.lantern);

    this.buildTerrain();
    this.buildWater();
    this.buildSky();
    this.buildNodes();
    this.buildActors();
    this.buildSites();
    this.fx = [];
    this.fxGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    this.shakes = new Map();
    this.enemyMeshes = new Map();
    this.shotMeshes = new Map();
    this.rings = [];

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.fov = window.innerWidth < window.innerHeight ? 68 : 55;
    this.camera.updateProjectionMatrix();
  }

  // ---------- cenário ----------

  biomeColor(x, z, h, out) {
    const t = this.w.t;
    const n = t.n.value(x * 0.15, z * 0.15) * 0.12 - 0.06;
    if (h < 0.2) out.set(0xc9b98a);
    else if (h < 1.7) out.set(0xe9d8a6);
    else if (h > 38) out.set(0xf4f7fb);
    else if (h > 26 || t.slope(x, z) > 0.95) out.set(0x8a8e96);
    else {
      const f = t.forest(x, z);
      out.set(0x79c24f).lerp(C(0x3f8f3d), Math.min(1, Math.max(0, (f - 0.35) * 2.5)));
      if (h > 20) out.lerp(C(0x8a8e96), (h - 20) / 6);
    }
    out.offsetHSL(0, 0, n);
    return out;
  }

  buildTerrain() {
    const seg = 160;
    const geo = new THREE.PlaneGeometry(HALF * 2, HALF * 2, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const col = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = this.w.t.height(x, z);
      pos.setY(i, h);
      this.biomeColor(x, z, h, col);
      colors.set([col.r, col.g, col.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  buildWater() {
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(1600, 1600, 1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x2aa7d8, transparent: true, opacity: 0.82, roughness: 0.25, metalness: 0.1 }),
    );
    water.position.y = -0.25;
    this.water = water;
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x14618a }));
    bed.position.y = -7;
    this.scene.add(water, bed);
  }

  buildSky() {
    const n = 500;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const e = Math.random() * 1.2 + 0.1;
      p.set([Math.cos(a) * Math.cos(e) * 450, Math.sin(e) * 450, Math.sin(a) * Math.cos(e) * 450], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false }));
    this.sunBall = new THREE.Mesh(new THREE.SphereGeometry(14, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff1b8, fog: false }));
    this.scene.add(this.stars, this.sunBall);
  }

  // ---------- recursos (instanciados) ----------

  buildNodes() {
    const parts = Mo.nodeParts();
    this.inst = {};
    const byType = {};
    this.w.nodes.forEach((n) => (byType[n.type] ??= []).push(n));
    const make = (key, list) => {
      this.inst[key] = parts[key].map(([geo, material]) => {
        const im = new THREE.InstancedMesh(geo, material, list.length);
        im.castShadow = true;
        im.receiveShadow = true;
        im.frustumCulled = false;
        this.scene.add(im);
        return im;
      });
    };
    Object.entries(byType).forEach(([type, list]) => {
      make(type, list);
      if (type === 'bush') make('berries', list);
      list.forEach((n, i) => {
        n.slot = i;
        this.placeNode(n);
      });
    });
    // facho de luz das relíquias (para achar de longe)
    this.beams = this.w.nodes
      .filter((n) => n.type === 'relic')
      .map((n) => {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 60, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe07a, transparent: true, opacity: 0.35, fog: false, depthWrite: false }));
        b.position.set(n.x, n.y + 30, n.z);
        b.userData.node = n;
        this.scene.add(b);
        return b;
      });
  }

  placeNode(n, shake = 0) {
    const visible = n.alive || n.type === 'bush';
    const s = visible ? n.scale : 0;
    tmpQ.setFromAxisAngle(UP, n.rot);
    if (shake) tmpQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), shake));
    tmpM.compose(tmpV.set(n.x, n.y - 0.05, n.z), tmpQ, tmpS.setScalar(s));
    this.inst[n.type].forEach((im) => {
      im.setMatrixAt(n.slot, tmpM);
      im.instanceMatrix.needsUpdate = true;
    });
    if (n.type === 'bush') {
      tmpM.compose(tmpV.set(n.x, n.y - 0.05, n.z), tmpQ, tmpS.setScalar(n.alive ? n.scale : 0));
      this.inst.berries.forEach((im) => {
        im.setMatrixAt(n.slot, tmpM);
        im.instanceMatrix.needsUpdate = true;
      });
    }
  }

  // ---------- personagens e construções ----------

  buildActors() {
    this.hero = Mo.humanoid();
    this.heroWeaponLevel = 0;
    this.scene.add(this.hero.root);
    this.npc = Mo.humanoid({ captain: true });
    this.npc.root.position.set(NPC.x, this.w.t.height(NPC.x, NPC.z), NPC.z);
    this.npc.root.rotation.y = Math.PI;
    this.mark = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 4), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
    this.mark.rotation.x = Math.PI;
    this.mark.position.y = 3.2;
    this.npc.root.add(this.mark);
    this.scene.add(this.npc.root);
  }

  buildSites() {
    this.sites = {};
    Object.entries(BUILDS).forEach(([id, b]) => {
      const g = new THREE.Group();
      g.position.set(b.x, this.w.t.height(b.x, b.z), b.z);
      this.scene.add(g);
      this.sites[id] = { g, built: null };
    });
    this.refreshSites();
  }

  refreshSites() {
    const makers = { fogueira: Mo.fogueira, bancada: Mo.bancada, cabana: Mo.cabana, barco: () => Mo.barco(true) };
    Object.entries(this.sites).forEach(([id, s]) => {
      const built = this.w.builds[id];
      if (s.built === built) return;
      s.built = built;
      s.g.clear();
      if (built) s.g.add(makers[id]());
      else {
        s.g.add(Mo.buildSiteMarker());
        if (id === 'barco') s.g.add(Mo.barco(false));
      }
    });
  }

  enemyMesh(e) {
    let m = this.enemyMeshes.get(e.id);
    if (!m) {
      m = Mo[e.type]();
      m.kind = e.type;
      this.scene.add(m.root);
      this.enemyMeshes.set(e.id, m);
    }
    return m;
  }

  // ---------- efeitos ----------

  burst(x, y, z, color, n = 8, speed = 5) {
    for (let i = 0; i < n; i++) {
      if (this.fx.length > 120) return;
      const m = new THREE.Mesh(this.fxGeo, new THREE.MeshBasicMaterial({ color }));
      m.position.set(x, y, z);
      this.scene.add(m);
      const a = Math.random() * 6.28;
      this.fx.push({ m, vx: Math.cos(a) * speed * Math.random(), vy: 3 + Math.random() * speed, vz: Math.sin(a) * speed * Math.random(), life: 0.7 });
    }
  }

  ring(x, z, radius, time, color = 0xff3b3b) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
    m.position.set(x, this.w.t.height(x, z) + 0.25, z);
    this.scene.add(m);
    this.rings.push({ m, radius, time, t: 0 });
  }

  /** Reage aos eventos do mundo (os mesmos que o som usa). */
  handle(ev) {
    const w = this.w;
    const colors = { tree: 0x8a5a33, pine: 0x8a5a33, rock: 0x9aa0aa, bush: 0xd62f4b, crystal: 0x6ff2ff, chest: 0xf2c230, relic: 0xf2c230 };
    if (ev.type === 'chop') {
      this.shakes.set(ev.id, 0.25);
      this.burst(ev.x, w.t.height(ev.x, ev.z) + 1.4, ev.z, colors[ev.kind], 5, 4);
    } else if (ev.type === 'nodeDown') {
      this.placeNode(w.nodes[ev.id]);
      this.burst(ev.x, w.t.height(ev.x, ev.z) + 1.2, ev.z, colors[ev.kind], 14, 6);
    } else if (ev.type === 'nodeUp') this.placeNode(w.nodes[ev.id]);
    else if (ev.type === 'hit') this.burst(ev.x, ev.y + 1, ev.z, ev.kind === 'slime' ? 0x6fdc5a : ev.kind === 'wolf' ? 0xd0d3d8 : 0xffa033, 6, 5);
    else if (ev.type === 'enemyDie') {
      this.burst(ev.x, ev.y + 1, ev.z, ev.kind === 'slime' ? 0x6fdc5a : ev.kind === 'wolf' ? 0x6c7078 : 0xffa033, ev.kind === 'golem' ? 60 : 16, ev.kind === 'golem' ? 12 : 7);
      this.burst(ev.x, ev.y + 1, ev.z, 0xffd23f, 5, 4);
    } else if (ev.type === 'windup' && ev.kind === 'slam') this.ring(ev.x, ev.z, ev.r, ev.time);
    else if (ev.type === 'boom') this.burst(ev.x, w.t.height(ev.x, ev.z) + 0.5, ev.z, 0x8a8e96, 18, 8);
    else if (ev.type === 'build') {
      this.refreshSites();
      const b = BUILDS[ev.id];
      this.burst(b.x, w.t.height(b.x, b.z) + 1.5, b.z, 0xffd23f, 30, 8);
    } else if (ev.type === 'levelup') this.burst(w.player.x, w.player.y + 2, w.player.z, 0xffd23f, 30, 7);
  }

  // ---------- quadro ----------

  frame(dt) {
    const w = this.w;
    const p = w.player;
    this.time += dt;
    const T = this.time;

    // céu e luz
    const dark = w.darkness;
    const cyc = (w.clock % 350) / 350;
    const dusk = Math.max(0, 1 - Math.abs(dark - 0.5) * 2);
    const sky = SKY.day.clone().lerp(SKY.night, dark).lerp(SKY.dusk, dusk * 0.6);
    this.scene.background = sky;
    this.scene.fog.color.copy(sky);
    this.hemi.intensity = 1.7 - dark * 1.25;
    this.sun.intensity = 2.0 * (1 - dark) + 0.25;
    this.sun.color.set(0xfff2d6).lerp(C(0x9fb4ff), dark);
    const sa = cyc * Math.PI * 2;
    const sx = Math.cos(sa) * 70;
    const sy = 55 + Math.sin(sa * 0.5) * 15;
    this.sun.position.set(p.x + sx, p.y + sy, p.z + 60);
    this.sun.target.position.set(p.x, p.y, p.z);
    this.sunBall.position.set(p.x + sx * 5, 180 + dark * -60, p.z - 380);
    this.sunBall.material.color.set(0xfff1b8).lerp(C(0xdfe6ff), dark);
    this.stars.material.opacity = dark;
    this.stars.position.set(p.x, 0, p.z);
    this.lantern.intensity = dark * 26;
    this.lantern.position.set(p.x, p.y + 2.6, p.z);
    this.water.position.y = -0.25 + Math.sin(T * 0.8) * 0.08;

    // herói
    const h = this.hero;
    if (this.heroWeaponLevel !== p.weapon) {
      this.heroWeaponLevel = p.weapon;
      h.handR.remove(this.heroWeapon);
      this.heroWeapon = Mo.weapon(p.weapon);
      h.handR.add(this.heroWeapon);
    }
    h.root.position.set(p.x, p.y, p.z);
    let dy = p.yaw - h.root.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    h.root.rotation.y += dy * Math.min(1, dt * 16);
    // andar: coxas alternam, joelho dobra quando a perna vai para trás, braços no contratempo
    const on = p.moving && !p.dead ? 1 : 0;
    this.gait = (this.gait ?? 0) + (on - (this.gait ?? 0)) * Math.min(1, dt * 12);
    const ph = T * 12;
    const g = this.gait;
    h.legL.rotation.x = -Math.sin(ph) * 0.75 * g;
    h.legR.rotation.x = Math.sin(ph) * 0.75 * g;
    h.kneeL.rotation.x = Math.max(0, Math.sin(ph - 1.2)) * 1.0 * g;
    h.kneeR.rotation.x = Math.max(0, -Math.sin(ph - 1.2)) * 1.0 * g;
    h.armL.rotation.x = Math.sin(ph) * 0.6 * g;
    h.elbowL.rotation.x = -0.25 - 0.35 * g;
    const swing = p.attackT > 0 ? 1 - p.attackT / 0.24 : -1;
    h.armR.rotation.x = swing >= 0 ? -2.5 + swing * 3.0 : -Math.sin(ph) * 0.5 * g - 0.15;
    h.elbowR.rotation.x = swing >= 0 ? -0.2 : -0.45;
    h.armR.rotation.z = swing >= 0 ? -0.25 : 0;
    h.body.rotation.x = p.rollT > 0 ? (1 - p.rollT / 0.34) * Math.PI * 2 : 0.06 * g;
    h.body.position.y = p.rollT > 0 ? 0.5 : Math.abs(Math.sin(ph)) * 0.05 * g + Math.sin(T * 2) * 0.008;
    h.torso.scale.x = 1 + Math.sin(T * 2) * 0.015; // respiração
    h.head.rotation.y = Math.sin(T * 0.7) * 0.15 * (1 - g);
    h.root.rotation.z = p.dead ? Math.PI / 2 : 0;
    h.root.visible = !(p.hurtT > 0 && Math.floor(T * 20) % 2 === 0);

    // Capitão
    this.npc.body.position.y = Math.sin(T * 2) * 0.012;
    this.npc.elbowL.rotation.x = -0.5;
    this.npc.elbowR.rotation.x = -1.1 + Math.sin(T * 1.3) * 0.08;
    // o Capitão acompanha você com a cabeça
    let ny = Math.atan2(p.x - NPC.x, p.z - NPC.z) - this.npc.root.rotation.y;
    ny = Math.atan2(Math.sin(ny), Math.cos(ny));
    this.npc.head.rotation.y = Math.max(-1.1, Math.min(1.1, ny));
    this.mark.visible = !!this.w.questTalk;
    this.mark.position.y = 3.2 + Math.sin(T * 4) * 0.15;

    // inimigos
    const seen = new Set();
    for (const e of w.enemies) {
      seen.add(e.id);
      const m = this.enemyMesh(e);
      m.root.position.set(e.x, e.y, e.z);
      m.root.rotation.y = e.yaw;
      const wind = e.state === 'windup' || e.state === 'throw';
      const hitFlash = e.hitT > 0;
      if (e.type === 'slime') {
        const hop = Math.abs(Math.sin(T * 6 + e.id));
        m.root.position.y += e.state === 'idle' && e.pause ? 0 : hop * 0.5;
        m.body.scale.set(1 + (wind ? 0.35 : 0) - hop * 0.1, 0.8 + hop * 0.2 - (wind ? 0.25 : 0), 1 + (wind ? 0.35 : 0) - hop * 0.1);
        m.body.material.color.set(hitFlash ? 0xffffff : wind ? 0xff6a4a : 0x6fdc5a);
      } else if (e.type === 'wolf') {
        const run = e.state === 'chase' ? Math.sin(T * 18 + e.id) : e.state === 'idle' && !e.pause ? Math.sin(T * 8) * 0.5 : 0;
        m.legs.forEach((l, i) => (l.rotation.x = (i % 2 ? 1 : -1) * (i < 2 ? 1 : -1) * run * 0.9));
        m.root.position.y -= wind ? 0.2 : 0;
        m.tail.rotation.x = 0.6 + Math.sin(T * 10) * 0.2;
        m.tail.rotation.y = Math.sin(T * 7 + e.id) * 0.3;
        m.body.material.color.set(hitFlash ? 0xffffff : wind ? 0xff6a4a : 0x6e7279);
        m.head.rotation.x = wind ? 0.35 : Math.sin(T * 3 + e.id) * 0.06;
      } else {
        const stomp = e.state === 'chase' ? Math.sin(T * 5) : 0;
        m.root.position.y += Math.abs(stomp) * 0.25;
        const up = e.state === 'windup' ? -2.6 : e.state === 'throw' ? -2.0 : stomp * 0.4;
        m.armL.rotation.x += (up - m.armL.rotation.x) * Math.min(1, dt * 10);
        m.armR.rotation.x += ((e.state === 'throw' ? 0 : up) - m.armR.rotation.x) * Math.min(1, dt * 10);
        const rage = e.hp < e.maxHp * 0.4;
        m.core.material.emissive.set(rage ? 0xff2200 : 0xff7a00);
        m.core.scale.setScalar(1 + Math.sin(T * (rage ? 14 : 5)) * 0.12);
        m.body.material.color.set(hitFlash ? 0xffffff : 0x777b82);
      }
    }
    for (const [id, m] of this.enemyMeshes) {
      if (!seen.has(id)) {
        this.scene.remove(m.root);
        this.enemyMeshes.delete(id);
      }
    }

    // pedras arremessadas
    const shots = new Set();
    for (const s of w.shots) {
      shots.add(s.id);
      let m = this.shotMeshes.get(s.id);
      if (!m) {
        m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 0), Mo.MATS.rockDark);
        m.castShadow = true;
        this.scene.add(m);
        this.shotMeshes.set(s.id, m);
        this.ring(s.tx, s.tz, 2.6, s.time);
      }
      m.position.set(s.x, s.y, s.z);
      m.rotation.x += dt * 6;
    }
    for (const [id, m] of this.shotMeshes) {
      if (!shots.has(id)) {
        this.scene.remove(m);
        this.shotMeshes.delete(id);
      }
    }

    // balanço das árvores/pedras golpeadas
    for (const [id, t] of this.shakes) {
      const left = t - dt;
      const n = w.nodes[id];
      if (left <= 0 || !n.alive) {
        this.shakes.delete(id);
        this.placeNode(n);
      } else {
        this.shakes.set(id, left);
        this.placeNode(n, Math.sin(left * 50) * 0.12 * (left / 0.25));
      }
    }

    // marcadores, fogueira, relíquias
    Object.values(this.sites).forEach((s) => {
      const c = s.g.children[0];
      if (!c) return;
      if (c.userData.icon) {
        c.userData.icon.rotation.y = T * 2;
        c.userData.icon.position.y = 1.8 + Math.sin(T * 3) * 0.15;
      }
      if (c.userData.flame) {
        c.userData.flame.scale.set(1 + Math.sin(T * 17) * 0.12, 1 + Math.sin(T * 23) * 0.18, 1 + Math.cos(T * 19) * 0.12);
        c.userData.light.intensity = 26 + Math.sin(T * 21) * 6;
      }
    });
    this.beams.forEach((b) => {
      b.visible = b.userData.node.alive;
      b.material.opacity = 0.25 + Math.sin(T * 3) * 0.1;
    });

    // partículas e anéis de aviso
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.life -= dt;
      f.vy -= 14 * dt;
      f.m.position.x += f.vx * dt;
      f.m.position.y += f.vy * dt;
      f.m.position.z += f.vz * dt;
      f.m.rotation.x += dt * 8;
      f.m.scale.setScalar(Math.max(0.01, f.life / 0.7));
      if (f.life <= 0) {
        this.scene.remove(f.m);
        this.fx.splice(i, 1);
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const g = this.rings[i];
      g.t += dt;
      const k = Math.min(1, g.t / g.time);
      g.m.scale.setScalar(g.radius * (0.3 + 0.7 * k));
      g.m.material.opacity = 0.4 + 0.5 * k;
      if (g.t > g.time + 0.1) {
        this.scene.remove(g.m);
        this.rings.splice(i, 1);
      }
    }

    // câmera em terceira pessoa (não entra no chão)
    const cd = this.camDist;
    const cx = p.x - Math.sin(this.camYaw) * Math.cos(this.camPitch) * cd;
    const cz = p.z - Math.cos(this.camYaw) * Math.cos(this.camPitch) * cd;
    const cy = Math.max(p.y + 1.8 + Math.sin(this.camPitch) * cd, w.t.height(cx, cz) + 1.6, 1.2);
    this.camera.position.lerp(tmpV.set(cx, cy, cz), Math.min(1, dt * 10));
    this.camera.lookAt(p.x, p.y + 1.8, p.z);
    this.renderer.render(this.scene, this.camera);
  }

  /** Posição do mundo → pixels da tela (para números de dano e avisos). */
  project(x, y, z) {
    tmpV.set(x, y, z).project(this.camera);
    return { x: ((tmpV.x + 1) / 2) * window.innerWidth, y: ((1 - tmpV.y) / 2) * window.innerHeight, behind: tmpV.z > 1 };
  }

  /** Imagem do minimapa (uma vez): cada célula com a cor do terreno. */
  minimap() {
    const c = document.createElement('canvas');
    c.width = c.height = GRID;
    const g = c.getContext('2d');
    const col = new THREE.Color();
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        const x = centerOf(i);
        const z = centerOf(j);
        const h = this.w.t.height(x, z);
        if (h < -0.3) col.set(0x2aa7d8);
        else this.biomeColor(x, z, h, col);
        g.fillStyle = `#${col.getHexString()}`;
        g.fillRect(i, j, 1, 1);
      }
    }
    return c;
  }
}

export { BOSS };
