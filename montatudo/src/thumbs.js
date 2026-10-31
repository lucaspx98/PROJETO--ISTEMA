// Miniaturas das peças para a bandeja: renderiza cada peça sozinha num renderizador pequeno.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const SIZE = 160;
let r;
let scene;
let cam;

function init() {
  r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(SIZE, SIZE);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
  const light = new THREE.DirectionalLight(0xffffff, 1.5);
  light.position.set(1, 2, 2);
  scene.add(light, new THREE.AmbientLight(0xffffff, 0.4));
  cam = new THREE.PerspectiveCamera(30, 1, 0.001, 50);
}

/** Retorna um data URL com a peça enquadrada. A peça volta para onde estava. */
export function thumbnail(obj) {
  if (!r) init();
  const parent = obj.parent;
  const pos = obj.position.clone();
  scene.add(obj);
  obj.position.set(0, 0, 0);
  obj.updateMatrixWorld(true);
  const sphere = new THREE.Box3().setFromObject(obj).getBoundingSphere(new THREE.Sphere());
  const dir = new THREE.Vector3(0.6, 0.55, 1).normalize();
  const dist = sphere.radius / Math.sin(THREE.MathUtils.degToRad(cam.fov / 2)) * 1.05;
  cam.position.copy(sphere.center).addScaledVector(dir, dist);
  cam.near = dist / 100;
  cam.far = dist * 10;
  cam.updateProjectionMatrix();
  cam.lookAt(sphere.center);
  r.render(scene, cam);
  const url = r.domElement.toDataURL('image/png');
  scene.remove(obj);
  obj.position.copy(pos);
  if (parent) parent.add(obj);
  return url;
}
