// Fase 4 — PC gamer. O gabinete está deitado de lado, com a abertura virada para a câmera (+Z).
// Frente do gabinete em -X, traseira em +X. A ordem segue a montagem real.
import { M } from '../materials.js';
import { box, cyl, fan, group, noShadow, rot } from '../geo.js';

const BOARD_Z = -0.096; // centro da placa-mãe (encostada na bandeja)
const FACE = BOARD_Z + 0.0015; // superfície da placa
const MB = { x: 0.093, y: 0.2875, w: 0.244, h: 0.305 };
const SOCKET = { x: 0.1, y: 0.355 };

const RAM_PRESS = { tool: 'mao', hits: 2, dir: [0, 0, -1], dist: 0.012 };

function ramStick(x) {
  return group(
    box(0.002, 0.133, 0.03, M.pcbGreen, x, SOCKET.y, FACE + 0.017),
    box(0.007, 0.13, 0.034, M.ramLabel, x, SOCKET.y, FACE + 0.021, 0.0015),
    box(0.006, 0.124, 0.006, M.rgbPurple, x, SOCKET.y, FACE + 0.04, 0.002),
  );
}

export const computadorParts = [
  {
    id: 'gabinete',
    name: 'Gabinete',
    build: () =>
      group(
        box(0.45, 0.012, 0.21, M.metalBlack, 0, 0.006, 0, 0.003),
        // Tampo e frente não fazem sombra, senão o interior fica escuro demais
        noShadow(group(box(0.45, 0.012, 0.21, M.metalBlack, 0, 0.454, 0, 0.003))),
        box(0.45, 0.46, 0.006, M.metalGray, 0, 0.23, -0.102),
        box(0.006, 0.46, 0.21, M.metalBlack, 0.222, 0.23, 0),
        noShadow(group(box(0.014, 0.46, 0.21, M.frontMesh, -0.218, 0.23, 0, 0.003))),
        box(0.004, 0.03, 0.1, M.ledWhite, -0.226, 0.42, 0),
        ...[-0.17, 0.17].flatMap((x) => [-0.07, 0.07].map((z) => cyl(0.014, 0.016, 0.01, M.rubber, x, -0.004, z))),
      ),
  },
  {
    id: 'fonte',
    name: 'Fonte',
    after: ['gabinete'],
    build: () =>
      group(
        box(0.15, 0.086, 0.14, M.metalBlack, 0.14, 0.056, -0.02, 0.004),
        box(0.12, 0.05, 0.002, M.psuLabel, 0.14, 0.058, 0.051),
        box(0.004, 0.06, 0.1, M.frontMesh, 0.2165, 0.056, -0.02),
      ),
  },
  {
    id: 'placa-mae',
    name: 'Placa-mãe',
    after: ['gabinete'],
    build: () =>
      noShadow(
        group(
          box(MB.w, MB.h, 0.003, M.pcbBlack, MB.x, MB.y, BOARD_Z),
          box(0.055, 0.055, 0.005, M.aluminum, SOCKET.x, SOCKET.y, FACE + 0.0025, 0.001),
          box(0.044, 0.044, 0.006, M.plasticBlack, SOCKET.x, SOCKET.y, FACE + 0.002),
          box(0.007, 0.135, 0.008, M.plasticDark, 0.155, SOCKET.y, FACE + 0.004),
          box(0.007, 0.135, 0.008, M.plasticDark, 0.168, SOCKET.y, FACE + 0.004),
          box(0.09, 0.008, 0.011, M.plasticDark, 0.125, 0.255, FACE + 0.0055),
          box(0.09, 0.008, 0.011, M.plasticDark, 0.125, 0.155, FACE + 0.0055),
          box(0.075, 0.022, 0.016, M.metalGray, 0.095, 0.415, FACE + 0.008, 0.003),
          box(0.022, 0.07, 0.016, M.metalGray, 0.045, 0.36, FACE + 0.008, 0.003),
          box(0.05, 0.05, 0.009, M.metalGray, 0.03, 0.17, FACE + 0.0045, 0.003),
          box(0.032, 0.006, 0.0015, M.rgbCyan, 0.03, 0.17, FACE + 0.0095),
          box(0.026, 0.13, 0.022, M.plasticBlack, 0.2, 0.36, FACE + 0.011, 0.003),
          box(0.035, 0.012, 0.004, M.plasticDark, 0.075, 0.185, FACE + 0.002),
          box(0.006, 0.05, 0.009, M.plasticDark, 0.205, 0.2, FACE + 0.0045),
        ),
      ),
  },
  {
    id: 'processador',
    name: 'Processador',
    after: ['placa-mae'],
    build: () => box(0.04, 0.04, 0.004, M.cpuLabel, SOCKET.x, SOCKET.y, FACE + 0.007, 0.002),
  },
  {
    id: 'cooler',
    name: 'Cooler',
    after: ['processador'],
    build: () => {
      const fins = [];
      for (let i = 0; i < 26; i++) fins.push(box(0.052, 0.125, 0.0012, M.aluminum, SOCKET.x, SOCKET.y, -0.068 + i * 0.0048));
      const pipes = [-0.015, -0.005, 0.005, 0.015].map((dx) =>
        rot(cyl(0.003, 0.003, 0.14, M.copper, SOCKET.x + dx, SOCKET.y, -0.02, 12), Math.PI / 2, 0, 0),
      );
      const f = fan(0.12, M.rgbCyan);
      f.rotation.y = -Math.PI / 2;
      f.position.set(SOCKET.x - 0.04, SOCKET.y, 0.0);
      return group(
        box(0.045, 0.045, 0.01, M.copper, SOCKET.x, SOCKET.y, FACE + 0.014, 0.002),
        noShadow(group(fins)),
        pipes,
        box(0.054, 0.127, 0.006, M.metalBlack, SOCKET.x, SOCKET.y, 0.058, 0.002),
        box(0.04, 0.004, 0.002, M.rgbCyan, SOCKET.x, SOCKET.y, 0.0615),
        f,
      );
    },
  },
  // Memória entra no slot apertando com o dedo até a trava fechar
  { id: 'ram-1', name: 'Memória RAM', after: ['placa-mae'], press: RAM_PRESS, build: () => ramStick(0.155) },
  { id: 'ram-2', name: 'Memória RAM', after: ['placa-mae'], press: RAM_PRESS, build: () => ramStick(0.168) },
  {
    id: 'ssd',
    name: 'SSD M.2',
    after: ['placa-mae'],
    build: () =>
      group(
        box(0.08, 0.022, 0.0015, M.pcbBlack, 0.1, 0.185, FACE + 0.005),
        box(0.022, 0.016, 0.0015, M.plasticBlack, 0.09, 0.185, FACE + 0.0065),
        box(0.022, 0.016, 0.0015, M.plasticBlack, 0.115, 0.185, FACE + 0.0065),
      ),
  },
  {
    id: 'placa-video',
    name: 'Placa de vídeo',
    after: ['placa-mae', 'ssd'],
    press: { tool: 'mao', hits: 2, dir: [0, 0, -1], dist: 0.01 },
    build: () => {
      const y = 0.235;
      const z = FACE + 0.062;
      const fans = [-0.08, 0.015].map((dx) => {
        const f = fan(0.085, M.rgbPink);
        f.rotation.x = Math.PI / 2;
        f.position.set(0.075 + dx, y - 0.028, z);
        return f;
      });
      return group(
        box(0.28, 0.04, 0.115, M.plasticBlack, 0.075, y, z, 0.006),
        box(0.28, 0.004, 0.115, M.metalGray, 0.075, y + 0.022, z, 0.002),
        box(0.22, 0.006, 0.003, M.rgbPink, 0.06, y + 0.004, z + 0.058),
        box(0.07, 0.006, 0.012, M.gold, 0.125, 0.255, FACE + 0.006),
        box(0.003, 0.05, 0.12, M.aluminum, 0.217, y, z),
        fans,
      );
    },
  },
  {
    id: 'ventoinhas',
    name: 'Ventoinhas',
    after: ['gabinete'],
    build: () =>
      group(
        [0.11, 0.24, 0.37].map((y) => {
          const f = fan(0.12, M.rgbCyan);
          f.rotation.y = Math.PI / 2;
          f.position.set(-0.198, y, 0);
          return f;
        }),
      ),
  },
  {
    id: 'ventoinha-traseira',
    name: 'Ventoinha',
    after: ['gabinete'],
    build: () => {
      const f = fan(0.12, M.rgbCyan);
      f.rotation.y = -Math.PI / 2;
      f.position.set(0.206, 0.37, 0.005);
      return group(f);
    },
  },
  {
    id: 'tampa-vidro',
    name: 'Tampa de vidro',
    after: ['fonte', 'cooler', 'ram-1', 'ram-2', 'placa-video', 'ventoinhas', 'ventoinha-traseira'],
    build: () => {
      const g = box(0.44, 0.45, 0.004, M.glass, 0, 0.23, 0.107);
      g.castShadow = false;
      g.renderOrder = 2;
      return group(
        g,
        box(0.44, 0.01, 0.005, M.plasticBlack, 0, 0.45, 0.107),
        box(0.44, 0.01, 0.005, M.plasticBlack, 0, 0.01, 0.107),
        box(0.01, 0.45, 0.005, M.plasticBlack, -0.215, 0.23, 0.107),
        box(0.01, 0.45, 0.005, M.plasticBlack, 0.215, 0.23, 0.107),
      );
    },
  },
];

export const computador = {
  id: 'computador',
  name: 'PC gamer',
  icon: '🖥️',
  target: [0.0, 0.23, 0],
  view: { az: -0.5, polar: 1.15 },
  cam: { dist: 0.95, min: 0.45, max: 1.6 },
  snap: 0.035,
  screwSize: 0.32,
  fragile: true, // martelo aqui é erro
  shadow: 0.6,
  parts: computadorParts,
  screws: [
    ...[
      [MB.x - MB.w / 2 + 0.008, MB.y - MB.h / 2 + 0.008],
      [MB.x + MB.w / 2 - 0.008, MB.y - MB.h / 2 + 0.008],
      [MB.x - MB.w / 2 + 0.008, MB.y + MB.h / 2 - 0.008],
      [0.18, MB.y + MB.h / 2 - 0.008],
    ].map(([x, y]) => ({ pos: [x, y, FACE], normal: [0, 0, 1], after: 'placa-mae' })),
    ...[
      [-0.205, 0.025],
      [0.205, 0.025],
      [-0.205, 0.435],
      [0.205, 0.435],
    ].map(([x, y]) => ({ thumb: true, pos: [x, y, 0.1095], normal: [0, 0, 1], after: 'tampa-vidro' })),
    // SSD M.2 preso por um parafusinho na ponta
    { pos: [0.142, 0.185, FACE + 0.006], normal: [0, 0, 1], after: 'ssd' },
  ],
};
