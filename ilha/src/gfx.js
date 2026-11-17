// Gráficos "de console": céu físico, mar com ondas e espuma, grama com vento na GPU,
// detalhe procedural no terreno, nuvens, vaga-lumes e pós-processamento (bloom + cor).
// Tudo é gerado por código; a qualidade (alto/médio/baixo) liga e desliga as partes pesadas.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BUILDS, CAMP, HALF } from './world.js';

export const QUALITY = {
  alto: { ratio: 1.75, post: true, msaa: 4, grass: 55000, grassR: 30, shadow: 2048, clouds: true, near: 70, far: 400 },
  medio: { ratio: 1.25, post: true, msaa: 0, grass: 20000, grassR: 22, shadow: 1024, clouds: true, near: 50, far: 320 },
  baixo: { ratio: 1.0, post: false, msaa: 0, grass: 0, grassR: 0, shadow: 1024, clouds: false, near: 35, far: 240 },
};

// ruído de valor em GLSL (usado no terreno e no mar)
const NOISE = /* glsl */ `
float gHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float gNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(gHash(i), gHash(i + vec2(1, 0)), f.x), mix(gHash(i + vec2(0, 1)), gHash(i + vec2(1, 1)), f.x), f.y);
}
`;

// ---------- mapa de altura (compartilhado por terreno, grama e mar) ----------

/**
 * Amostra o terreno numa grade (N×N vértices cobrindo a ilha). Devolve as alturas,
 * uma textura half-float (R = altura, G = densidade da grama) e uma textura de cor.
 */
export function heightField(world, biomeColor, N = 257) {
  const t = world.t;
  const heights = new Float32Array(N * N);
  const colors = new Float32Array(N * N * 3);
  const hf = new Uint16Array(N * N * 4);
  const cb = new Uint8Array(N * N * 4);
  const col = new THREE.Color();
  const step = (HALF * 2) / (N - 1);
  const sm = (a, b, x) => {
    const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };
  const bare = [CAMP, ...Object.values(BUILDS)];
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = -HALF + i * step;
      const z = -HALF + j * step;
      const h = t.height(x, z);
      const k = j * N + i;
      heights[k] = h;
      biomeColor(x, z, h, col);
      colors.set([col.r, col.g, col.b], k * 3);
      const slope = t.slope(x, z);
      let g = sm(2.0, 3.2, h) * (1 - sm(19, 25, h)) * (1 - sm(0.5, 0.85, slope));
      g *= 1 - 0.35 * sm(0.5, 0.8, t.forest(x, z));
      for (const b of bare) {
        const d = Math.hypot(x - b.x, z - b.z);
        g *= b === CAMP ? 0.35 + 0.65 * sm(6, 11, d) : sm(2, 4.5, d);
      }
      hf[k * 4] = THREE.DataUtils.toHalfFloat(h);
      hf[k * 4 + 1] = THREE.DataUtils.toHalfFloat(g);
      hf[k * 4 + 2] = 0;
      hf[k * 4 + 3] = THREE.DataUtils.toHalfFloat(1);
      const c = col.clone().convertLinearToSRGB();
      cb.set([c.r * 255, c.g * 255, c.b * 255, 255], k * 4);
    }
  }
  const tex = new THREE.DataTexture(hf, N, N, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  const ctex = new THREE.DataTexture(cb, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  ctex.colorSpace = THREE.SRGBColorSpace;
  ctex.magFilter = ctex.minFilter = THREE.LinearFilter;
  ctex.needsUpdate = true;
  return { N, heights, colors, tex, ctex };
}

// uv da textura de altura a partir de x/z do mundo (centro dos texels = vértices da malha)
const TERR_UV = (N) => /* glsl */ `
vec2 terrUv(vec2 p) { return ((p + ${HALF.toFixed(1)}) / ${(HALF * 2).toFixed(1)}) * ${((N - 1) / N).toFixed(6)} + ${(0.5 / N).toFixed(6)}; }
`;

// ---------- terreno ----------

/** Material do terreno: cor dos biomas + textura procedural, rocha nas encostas e areia molhada. */
export function terrainMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1.0, envMapIntensity: 0.7 });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = transformed; vWN = normal;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWP; varying vec3 vWN;\n${NOISE}`)
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        float n1 = gNoise(vWP.xz * 0.45);
        float n2 = gNoise(vWP.xz * 1.9);
        float n3 = gNoise(vWP.xz * 7.5);
        float n4 = gNoise(vWP.xz * 23.0);
        diffuseColor.rgb *= 0.78 + n1 * 0.22 + n2 * 0.14 + n3 * 0.1 + n4 * 0.06;
        // rocha nas encostas (com estrias)
        float slope = 1.0 - normalize(vWN).y;
        float strata = 0.8 + 0.2 * sin(vWP.y * 3.0 + n2 * 4.0);
        vec3 rock = vec3(0.24, 0.22, 0.2) * (0.55 + n2 * 0.5 + n3 * 0.3 + n4 * 0.25) * strata;
        rock = mix(rock, vec3(0.13, 0.2, 0.07), smoothstep(0.55, 0.8, n2) * 0.6); // musgo
        float rk = smoothstep(0.36, 0.42, slope + (n1 - 0.5) * 0.2 + (n3 - 0.5) * 0.08) * smoothstep(0.6, 1.6, vWP.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, rock, rk);
        // areia: ondulações e areia molhada perto da água
        float sand = 1.0 - smoothstep(1.4, 2.2, vWP.y);
        diffuseColor.rgb *= 1.0 - sand * (0.09 * sin(vWP.x * 3.1 + vWP.z * 1.3 + n2 * 3.0) + 0.12 * n3 + 0.1);
        diffuseColor.rgb *= mix(0.55, 1.0, smoothstep(-0.3, 0.7, vWP.y));`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.35, roughnessFactor, smoothstep(-0.3, 0.6, vWP.y));')
      // terra seca quase não reflete o céu (sem isso, morros vistos de lado ficavam com um véu azulado)
      .replace('#include <aomap_fragment>', 'reflectedLight.indirectSpecular *= mix(0.6, 0.08, smoothstep(-0.3, 0.6, vWP.y));\n#include <aomap_fragment>');
  };
  return m;
}

// ---------- grama ----------

/** Grama na GPU: as folhas ficam presas ao mundo e "dão a volta" ao redor do jogador. */
export class Grass {
  constructor(field, max) {
    const seg = 3;
    const pos = [];
    const idx = [];
    for (let i = 0; i <= seg; i++) {
      const y = i / seg;
      const w = 0.075 * (1 - y) ** 0.9;
      if (i < seg) pos.push(-w, y, 0, w, y, 0);
      else pos.push(0, 1, 0);
    }
    for (let i = 0; i < seg - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const a = (seg - 1) * 2;
    idx.push(a, a + 1, a + 2);
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, k) => (k % 3 === 1 ? 1 : 0)), 3));
    geo.setIndex(idx);
    const off = new Float32Array(max * 4);
    for (let i = 0; i < max; i++) off.set([Math.random() * 1000, Math.random() * 1000, Math.random(), Math.random()], i * 4);
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(off, 4));
    geo.instanceCount = max;
    this.geo = geo;
    this.max = max;

    this.uniforms = {
      uHeight: { value: field.tex },
      uGCol: { value: field.ctex },
      uCenter: { value: new THREE.Vector3() },
      uPlayer: { value: new THREE.Vector3() },
      uTime: { value: 0 },
      uR: { value: 30 },
    };
    // Lambert: luz mais barata que a PBR (a grama é o que mais pesa na tela)
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    mat.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, this.uniforms);
      s.vertexShader = s.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform sampler2D uHeight; uniform sampler2D uGCol; uniform vec3 uCenter; uniform vec3 uPlayer; uniform float uTime; uniform float uR;
          attribute vec4 aOffset; varying vec3 vGCol; varying float vTip;
          ${TERR_UV(field.N)}`,
        )
        .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);')
        .replace(
          '#include <begin_vertex>',
          /* glsl */ `
          vec2 rel = mod(aOffset.xy - uCenter.xz + uR, 2.0 * uR) - uR;
          vec2 wp = uCenter.xz + rel;
          vec4 hd = texture2D(uHeight, terrUv(wp));
          float alive = step(aOffset.z, hd.g * 1.15) * smoothstep(uR, uR * 0.62, length(rel));
          float hgt = (0.38 + aOffset.w * 0.62) * (0.65 + hd.g * 0.55) * alive;
          float ang = fract(aOffset.z * 37.17) * 6.2832;
          vec2 dir = vec2(cos(ang), sin(ang));
          float t = position.y;
          vec3 transformed = vec3(wp.x + dir.x * position.x * alive, hd.r - 0.06 + t * hgt, wp.y + dir.y * position.x * alive);
          float gust = 0.5 + 0.5 * sin(uTime * 0.7 + wp.x * 0.05 + wp.y * 0.03);
          float wv = sin(uTime * 2.1 + wp.x * 0.33 + wp.y * 0.21) * (0.55 + gust * 0.6) + sin(uTime * 3.7 + wp.x * 1.1 + wp.y * 0.7) * 0.18;
          vec2 bend = vec2(0.75, 0.45) * wv * 0.4 + vec2(-dir.y, dir.x) * (aOffset.w - 0.5) * 0.3;
          vec2 away = wp - uPlayer.xz; float pd = length(away);
          bend += away / max(pd, 0.001) * smoothstep(1.4, 0.2, pd) * 1.1;
          float t2 = t * t;
          transformed.xz += bend * t2 * hgt;
          transformed.y -= dot(bend, bend) * t2 * hgt * 0.25;
          vGCol = texture2D(uGCol, terrUv(wp)).rgb * (0.85 + aOffset.w * 0.3);
          vTip = t;`,
        );
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vGCol; varying float vTip;')
        .replace('#include <color_fragment>', 'diffuseColor.rgb *= mix(vGCol * 0.42, vGCol * 1.3 + vec3(0.05, 0.06, 0.0), vTip);')
        .replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''));
    };
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
  }

  set(count, radius) {
    this.geo.instanceCount = Math.min(this.max, count);
    this.uniforms.uR.value = radius;
    this.mesh.visible = count > 0;
  }

  /** O quadrado de grama fica à frente da câmera: nada é gasto com o que está atrás dela. */
  update(T, p, cam) {
    this.uniforms.uTime.value = T;
    const R = this.uniforms.uR.value;
    const fx = p.x - cam.position.x;
    const fz = p.z - cam.position.z;
    const fl = Math.hypot(fx, fz) || 1;
    this.uniforms.uCenter.value.set(p.x + (fx / fl) * R * 0.5, 0, p.z + (fz / fl) * R * 0.5);
    this.uniforms.uPlayer.value.set(p.x, p.y, p.z);
  }
}

// ---------- mar ----------

export function waterMaterial(field) {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTime: { value: 0 },
      uHeight: { value: field.tex },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunCol: { value: new THREE.Color(1, 1, 1) },
      uSkyTop: { value: new THREE.Color(0x3d7fd6) },
      uSkyHor: { value: new THREE.Color(0xbfe0f5) },
      uDeep: { value: new THREE.Color(0x05304a) },
      uShallow: { value: new THREE.Color(0x1fb3b8) },
      uNight: { value: 0 },
    },
  ]);
  uniforms.uHeight.value = field.tex;
  const waves = /* glsl */ `
  // ondas: soma de senoides direcionais; devolve altura e derivadas
  vec3 waves(vec2 p, float t) {
    vec3 r = vec3(0.0);
    vec4 W[4];
    W[0] = vec4(normalize(vec2(1.0, 0.35)), 0.075, 0.22);
    W[1] = vec4(normalize(vec2(-0.4, 1.0)), 0.13, 0.12);
    W[2] = vec4(normalize(vec2(0.8, -0.7)), 0.21, 0.07);
    W[3] = vec4(normalize(vec2(-1.0, -0.2)), 0.33, 0.04);
    for (int i = 0; i < 4; i++) {
      float k = W[i].z; float a = W[i].w;
      float ph = dot(W[i].xy, p) * k + t * sqrt(9.8 * k);
      r.x += a * sin(ph);
      r.yz += a * k * cos(ph) * W[i].xy;
    }
    return r;
  }`;
  const mat = new THREE.ShaderMaterial({
    uniforms,
    fog: true,
    transparent: true,
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWP;
      ${waves}
      #include <fog_pars_vertex>
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        wp.y += waves(wp.xz, uTime).x;
        vWP = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform sampler2D uHeight;
      uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uSkyTop; uniform vec3 uSkyHor;
      uniform vec3 uDeep; uniform vec3 uShallow; uniform float uNight;
      varying vec3 vWP;
      ${waves}
      ${NOISE}
      ${TERR_UV(field.N)}
      #include <common>
      #include <fog_pars_fragment>
      void main() {
        vec3 wv = waves(vWP.xz, uTime);
        // ondulações finas que se movem em direções diferentes
        vec2 q = vWP.xz;
        float e = 0.15;
        float r0 = gNoise(q * 0.9 + uTime * vec2(0.35, 0.2)) + gNoise(q * 2.3 - uTime * vec2(0.3, 0.45)) * 0.5;
        float rx = gNoise((q + vec2(e, 0.0)) * 0.9 + uTime * vec2(0.35, 0.2)) + gNoise((q + vec2(e, 0.0)) * 2.3 - uTime * vec2(0.3, 0.45)) * 0.5;
        float rz = gNoise((q + vec2(0.0, e)) * 0.9 + uTime * vec2(0.35, 0.2)) + gNoise((q + vec2(0.0, e)) * 2.3 - uTime * vec2(0.3, 0.45)) * 0.5;
        vec3 N = normalize(vec3(-wv.y - (rx - r0) / e * 0.09, 1.0, -wv.z - (rz - r0) / e * 0.09));
        vec3 V = normalize(cameraPosition - vWP);
        float dist = length(cameraPosition - vWP);
        N = normalize(mix(N, vec3(0.0, 1.0, 0.0), smoothstep(60.0, 260.0, dist)));

        vec2 uv = terrUv(vWP.xz);
        float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
        float ground = mix(-30.0, texture2D(uHeight, clamp(uv, 0.0, 1.0)).r, inside);
        float depth = max(0.0, vWP.y - ground);

        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 R = reflect(-V, N);
        vec3 sky = mix(uSkyHor, uSkyTop, clamp(R.y * 1.6, 0.0, 1.0));
        vec3 body = mix(uShallow, uDeep, 1.0 - exp(-depth * 0.28));
        // luz do sol entrando nas cristas
        body += uShallow * 0.25 * max(wv.x, 0.0) * 3.0 * (1.0 - uNight);
        float sd = max(dot(R, uSunDir), 0.0);
        vec3 spec = uSunCol * (pow(sd, 900.0) * 18.0 + pow(sd, 60.0) * 0.35);
        vec3 col = mix(body, sky, clamp(fres, 0.0, 0.9)) + spec;

        // espuma na beira: faixa que vai e volta + espuma das ondas
        float fn = gNoise(q * 1.7 + uTime * 0.4) * 0.6 + gNoise(q * 5.0 - uTime * 0.3) * 0.4;
        float edge = smoothstep(0.9, 0.0, depth + (fn - 0.5) * 0.5);
        float band = smoothstep(0.18, 0.0, abs(depth - (0.9 + 0.55 * sin(uTime * 1.3 + q.x * 0.05)))) * step(fn, 0.62);
        float crest = smoothstep(0.24, 0.34, wv.x + fn * 0.12) * 0.55 * inside;
        float foam = clamp(max(edge * step(0.32, fn + edge * 0.6), band) + crest, 0.0, 1.0) * inside;
        col = mix(col, vec3(0.92, 0.96, 1.0) * (0.4 + 0.6 * (1.0 - uNight)), foam);

        float alpha = clamp(0.55 + depth * 0.35 + fres * 0.5, 0.0, 1.0);
        alpha = max(alpha, foam);
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  return mat;
}

// ---------- céu ----------

export function makeSky() {
  const sky = new Sky();
  sky.scale.setScalar(400);
  const u = sky.material.uniforms;
  u.turbidity.value = 2.2;
  u.rayleigh.value = 2.2;
  u.mieCoefficient.value = 0.003;
  u.mieDirectionalG.value = 0.86;
  u.uGain = { value: 0.55 };
  sky.material.fragmentShader = sky.material.fragmentShader
    .replace('uniform vec3 up;', 'uniform vec3 up;\nuniform float uGain;')
    .replace('gl_FragColor = vec4( retColor, 1.0 );', 'vec3 sc = retColor * uGain; float sl = dot(sc, vec3(0.299, 0.587, 0.114)); gl_FragColor = vec4(max(mix(vec3(sl), sc, 1.3), 0.0), 1.0 );');
  sky.material.fog = false;
  return sky;
}

/**
 * A mesma conta do shader do céu (Preetham), feita no processador para UMA direção.
 * Serve para a névoa ter a cor exata do horizonte sem ler pixels da placa de vídeo
 * (ler pixels trava a GPU e dava um "soluço" a cada poucos segundos no celular).
 */
export function skyColor(sky, dir, out = new THREE.Color()) {
  const u = sky.material.uniforms;
  const sun = u.sunPosition.value;
  const T = u.turbidity.value;
  const ray = u.rayleigh.value;
  const mieC = u.mieCoefficient.value;
  const g = u.mieDirectionalG.value;
  const gain = u.uGain.value;
  const zc = Math.max(-1, Math.min(1, sun.y));
  const sunE = 1000 * Math.max(0, 1 - Math.exp(-((1.6110731556870734 - Math.acos(zc)) / 1.5)));
  const fade = 1 - Math.max(0, Math.min(1, 1 - Math.exp(sun.y / 450000)));
  const rc = ray - (1 - fade);
  const tr = [5.804542996261093e-6, 1.3562911419845635e-5, 3.0265902468824876e-5];
  const mc = [1.8399918514433978e14, 2.7798023919660528e14, 4.0790479543861094e14];
  const c = 0.2 * T * 10e-18;
  const zen = Math.acos(Math.max(0, dir.y));
  const inv = 1 / (Math.cos(zen) + 0.15 * Math.pow(93.885 - (zen * 180) / Math.PI, -1.253));
  const sR = 8.4e3 * inv;
  const sM = 1.25e3 * inv;
  const cosT = dir.x * sun.x + dir.y * sun.y + dir.z * sun.z;
  const rP = 0.05968310365946075 * (1 + ((cosT * 0.5 + 0.5) ** 2));
  const g2 = g * g;
  const mP = 0.07957747154594767 * ((1 - g2) / Math.pow(1 - 2 * g * cosT + g2, 1.5));
  const k = Math.max(0, Math.min(1, Math.pow(1 - sun.y, 5)));
  const res = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const bR = tr[i] * rc;
    const bM = 0.434 * c * mc[i] * mieC;
    const Fex = Math.exp(-(bR * sR + bM * sM));
    const ratio = (bR * rP + bM * mP) / (bR + bM);
    let Lin = Math.pow(sunE * ratio * (1 - Fex), 1.5);
    Lin *= 1 + (Math.sqrt(sunE * ratio * Fex) - 1) * k;
    const tex = (Lin + 0.1 * Fex) * 0.04 + [0, 0.0003, 0.00075][i];
    res[i] = Math.pow(tex, 1 / (1.2 + 1.2 * fade)) * gain;
  }
  const l = res[0] * 0.299 + res[1] * 0.587 + res[2] * 0.114;
  return out.setRGB(...res.map((v) => Math.min(1, Math.max(0, l + (v - l) * 1.3))));
}

/** Textura macia de nuvem, desenhada em canvas. */
function cloudTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const x = 40 + Math.random() * 176;
    const y = 50 + Math.random() * 40 - Math.abs(x - 128) * 0.12;
    const r = 18 + Math.random() * 30;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Nuvens: todas numa malha só (1 desenho), cada uma um retângulo virado para a câmera. */
export class Clouds {
  constructor(n = 22) {
    this.list = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 380 + Math.random() * 180;
      const sc = 130 + Math.random() * 130;
      this.list.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, y: 150 + Math.random() * 90, w: sc / 2, h: sc * 0.225, flip: Math.random() < 0.5 });
    }
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 12);
    const uv = new Float32Array(n * 8);
    const idx = [];
    this.list.forEach((c, i) => {
      uv.set(c.flip ? [1, 0, 0, 0, 0, 1, 1, 1] : [0, 0, 1, 0, 1, 1, 0, 1], i * 8);
      const b = i * 4;
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    });
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    this.mat = new THREE.MeshBasicMaterial({ map: cloudTexture(), transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide });
    this.group = new THREE.Mesh(geo, this.mat);
    this.group.frustumCulled = false;
    this.right = new THREE.Vector3();
  }

  update(dt, cam, tint) {
    this.mat.color.copy(tint);
    const r = this.right.setFromMatrixColumn(cam.matrixWorld, 0);
    r.y = 0;
    r.normalize();
    const cp = cam.position;
    this.list.forEach((c, i) => {
      c.x += dt * 1.6;
      if (c.x > 560) c.x -= 1120;
      const cx = cp.x + c.x;
      const cz = cp.z + c.z;
      const wx = r.x * c.w;
      const wz = r.z * c.w;
      this.pos.set([cx - wx, c.y - c.h, cz - wz, cx + wx, c.y - c.h, cz + wz, cx + wx, c.y + c.h, cz + wz, cx - wx, c.y + c.h, cz - wz], i * 12);
    });
    this.group.geometry.attributes.position.needsUpdate = true;
  }
}

// ---------- vaga-lumes / pólen ----------

export class Motes {
  constructor(n = 160) {
    this.n = n;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3);
    this.seed = Array.from({ length: n }, () => [Math.random() * 60 - 30, Math.random() * 60 - 30, Math.random() * 3 + 0.4, Math.random() * 10]);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 32, 32);
    this.mat = new THREE.PointsMaterial({ size: 0.35, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
  }

  update(T, p, height, dark) {
    for (let i = 0; i < this.n; i++) {
      const [ox, oz, oy, ph] = this.seed[i];
      const x = p.x + (((ox + T * 0.4 + Math.sin(T * 0.3 + ph) * 2 - p.x + 30) % 60) + 60) % 60 - 30;
      const z = p.z + (((oz + Math.cos(T * 0.25 + ph) * 2 - p.z + 30) % 60) + 60) % 60 - 30;
      this.pos.set([x, height(x, z) + oy + Math.sin(T * 1.3 + ph) * 0.4, z], i * 3);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    // de dia: pólen discreto; à noite: vaga-lumes que brilham (e pegam bloom)
    this.mat.color.setRGB(1, 1, 0.85).lerp(new THREE.Color(2.2, 3.0, 0.6), dark);
    this.mat.size = 0.12 + dark * 0.3;
    this.mat.opacity = 0.35 + dark * 0.65;
  }
}

// ---------- pós-processamento ----------

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uVig: { value: 0.9 }, uSat: { value: 1.12 }, uWarm: { value: 0.03 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uVig; uniform float uSat; uniform float uWarm; varying vec2 vUv;
    void main() {
      vec4 t = texture2D(tDiffuse, vUv);
      vec3 c = t.rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      c *= vec3(1.0 + uWarm, 1.0, 1.0 - uWarm);
      vec2 d = vUv - 0.5;
      c *= 1.0 - dot(d, d) * uVig;
      gl_FragColor = vec4(c, t.a);
    }`,
};

export function makeComposer(renderer, scene, camera, msaa) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: msaa });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.32, 0.55, 0.92);
  composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  return { composer, bloom, grade };
}

// ---------- vento nas folhas (instanciadas) ----------

export const windUniform = { value: 0 };

/** Faz a copa das árvores balançar; a fase vem da posição de cada instância. */
export function addWind(material, amount = 0.07, from = 1.6) {
  material.onBeforeCompile = (s) => {
    s.uniforms.uWind = windUniform;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWind;').replace(
      '#include <begin_vertex>',
      /* glsl */ `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 ip = instanceMatrix[3].xyz;
      #else
        vec3 ip = vec3(0.0);
      #endif
      float sway = max(0.0, position.y - ${from.toFixed(2)});
      transformed.x += sin(uWind * 1.4 + ip.x * 0.21 + ip.z * 0.13) * ${amount.toFixed(3)} * sway + sin(uWind * 4.3 + position.y * 2.0 + ip.x) * 0.015 * sway;
      transformed.z += cos(uWind * 1.1 + ip.z * 0.19) * ${(amount * 0.6).toFixed(3)} * sway;`,
    );
  };
  material.customProgramCacheKey = () => `wind${amount}${from}`;
  return material;
}
