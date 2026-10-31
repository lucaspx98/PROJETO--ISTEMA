// Cena 3D: renderizador, sala, luzes, câmera orbital e um loop com tweens simples.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { M } from './materials.js';
import { box } from './geo.js';

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd9d2c7);
    scene.fog = new THREE.Fog(0xd9d2c7, 6, 14);
    const pmrem = new THREE.PMREMGenerator(r);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.75;
    this.scene = scene;

    // Sala: piso de tacos, parede e rodapé
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), M.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 5), M.wall);
    wall.position.set(0, 2.5, -1.6);
    wall.receiveShadow = true;
    scene.add(wall);
    scene.add(box(14, 0.1, 0.02, M.baseboard, 0, 0.05, -1.59));

    scene.add(new THREE.HemisphereLight(0xfff8ee, 0x8a7560, 0.6));
    const sun = new THREE.DirectionalLight(0xfff1dd, 2.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.015;
    sun.shadow.radius = 4;
    scene.add(sun, sun.target);
    this.sun = sun;

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 40);
    const c = new OrbitControls(this.camera, canvas);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.enablePan = false;
    c.minPolarAngle = 0.15;
    c.maxPolarAngle = 1.5;
    c.minAzimuthAngle = -1.25;
    c.maxAzimuthAngle = 1.25;
    c.rotateSpeed = 0.7;
    c.autoRotateSpeed = 1.2;
    this.controls = c;

    this.tickers = new Set();
    this.tweens = [];
    this.clock = new THREE.Clock();
    window.addEventListener('resize', () => this.resize());
    this.resize();
    r.setAnimationLoop(() => this.frame());
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Celular em pé: abre um pouco o campo de visão para caber o objeto inteiro
    this.camera.fov = w < h ? 50 : 38;
    // Durante a montagem, a imagem sobe para o objeto não ficar atrás da bandeja e das ferramentas
    if (this.bottomInset) this.camera.setViewOffset(w, h + this.bottomInset, 0, this.bottomInset, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  /** Reserva `px` na parte de baixo da tela: o centro da cena sobe `px / 2`. */
  setBottomInset(px) {
    this.bottomInset = px;
    this.resize();
  }

  /** Enquadra a câmera num alvo. `dist` é ajustado para telas em pé. */
  frameView({ target, cam, shadow }, azimuth = 0.55, polar = 1.05) {
    const t = new THREE.Vector3(...target);
    const portrait = window.innerWidth < window.innerHeight ? 1.4 : 1;
    const d = cam.dist * portrait;
    this.controls.target.copy(t);
    this.controls.minDistance = cam.min * portrait;
    this.controls.maxDistance = cam.max * portrait;
    this.camera.position.set(
      t.x + d * Math.sin(polar) * Math.sin(azimuth),
      t.y + d * Math.cos(polar),
      t.z + d * Math.sin(polar) * Math.cos(azimuth),
    );
    this.controls.update();

    const s = this.sun.shadow.camera;
    s.left = s.bottom = -shadow;
    s.right = s.top = shadow;
    s.near = 0.1;
    s.far = shadow * 8;
    s.updateProjectionMatrix();
    this.sun.position.set(t.x + shadow * 1.4, t.y + shadow * 3, t.z + shadow * 2);
    this.sun.target.position.copy(t);
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
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

export const ease = {
  outBack: (k) => 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2,
  outCubic: (k) => 1 - (1 - k) ** 3,
  inOut: (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2),
};
