// Cena 3D do salão: renderizador, luz suave, cenário, câmera orbital com transições e tweens.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.1;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf6dfe4);
    const pmrem = new THREE.PMREMGenerator(r);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.8;
    this.scene = scene;

    // Cenário: parede rosada com faixa, espelho redondo com luzinhas e piso claro
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf3cfd8, roughness: 0.95 });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), wallMat);
    wall.position.set(0, 0.6, -0.9);
    wall.receiveShadow = true;
    scene.add(wall);
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.05), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
    stripe.position.set(0, -0.18, -0.899);
    scene.add(stripe);
    const mirror = new THREE.Mesh(new THREE.CircleGeometry(0.42, 64), new THREE.MeshStandardMaterial({ color: 0xdfe9f2, metalness: 1, roughness: 0.08 }));
    mirror.position.set(0, 0.25, -0.895);
    scene.add(mirror);
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.018, 16, 96), new THREE.MeshStandardMaterial({ color: 0xe0b07a, metalness: 1, roughness: 0.3 }));
    frame.position.copy(mirror.position);
    scene.add(frame);
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d6, emissiveIntensity: 1.6 });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 12), bulbMat);
      b.position.set(Math.cos(a) * 0.46, 0.25 + Math.sin(a) * 0.46, -0.88);
      scene.add(b);
    }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ color: 0xf7efe9, roughness: 0.4 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.75;
    floor.receiveShadow = true;
    scene.add(floor);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xf0c8d0, 0.9));
    const key = new THREE.DirectionalLight(0xfff4ec, 2.2);
    key.position.set(0.6, 1.2, 1.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -0.8;
    key.shadow.camera.right = key.shadow.camera.top = 0.8;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.01;
    key.shadow.radius = 6;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffd6e8, 1.1);
    rim.position.set(-1, 0.6, -0.6);
    scene.add(rim);

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.005, 20);
    const c = new OrbitControls(this.camera, canvas);
    c.enableDamping = true;
    c.dampingFactor = 0.1;
    c.enablePan = false;
    c.rotateSpeed = 0.6;
    c.minPolarAngle = 0.25;
    c.maxPolarAngle = 2.0;
    this.controls = c;

    this.tickers = new Set();
    this.tweens = [];
    this.clock = new THREE.Clock();
    this.bottomInset = 0;
    window.addEventListener('resize', () => this.resize());
    this.resize();
    r.setAnimationLoop(() => this.frame());
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 46 : 35;
    // Durante o atendimento, a imagem sobe para o rosto não ficar atrás do painel de baixo
    if (this.bottomInset) this.camera.setViewOffset(w, h + this.bottomInset, 0, this.bottomInset, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  setBottomInset(px) {
    this.bottomInset = px;
    this.resize();
  }

  /**
   * Leva a câmera até uma vista: alvo, distância, ângulo horizontal (az) e vertical (polar).
   * `free` libera girar em volta (cabelo); senão só um pouco para os lados.
   */
  view({ target, dist, az = 0, polar = 1.45, free = false }, ms = 700) {
    // Em pé, a tela é estreita: afasta para o objeto caber na largura
    const portrait = window.innerWidth < window.innerHeight ? Math.min(1.9, 0.9 / (window.innerWidth / window.innerHeight)) * 0.85 : 1;
    const t1 = new THREE.Vector3(...target);
    const d = dist * portrait;
    const p1 = new THREE.Vector3(
      t1.x + d * Math.sin(polar) * Math.sin(az),
      t1.y + d * Math.cos(polar),
      t1.z + d * Math.sin(polar) * Math.cos(az),
    );
    const c = this.controls;
    c.minDistance = d * 0.55;
    c.maxDistance = d * 1.6;
    c.minAzimuthAngle = free ? -Infinity : az - 0.9;
    c.maxAzimuthAngle = free ? Infinity : az + 0.9;
    const t0 = c.target.clone();
    const p0 = this.camera.position.clone();
    if (!ms) {
      c.target.copy(t1);
      this.camera.position.copy(p1);
      c.update();
      return;
    }
    c.enabled = false;
    this.tween(
      ms,
      (k) => {
        const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        c.target.lerpVectors(t0, t1, e);
        this.camera.position.lerpVectors(p0, p1, e);
      },
      () => {
        c.enabled = true;
        c.update();
      },
    );
  }

  tween(ms, fn, done) {
    this.tweens.push({ t: 0, ms, fn, done });
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt * 1000;
      const k = Math.min(1, tw.t / tw.ms);
      tw.fn(k);
      if (k >= 1) {
        this.tweens.splice(i, 1);
        tw.done?.();
      }
    }
    this.tickers.forEach((f) => f(dt));
    if (this.controls.enabled) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
