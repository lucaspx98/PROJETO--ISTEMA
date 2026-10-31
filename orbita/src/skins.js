// Cometas desbloqueáveis com cristais. `trail` é a cor do rastro (lista = sorteia por partícula).
export const SKINS = [
  { id: 'cometa', name: 'Cometa', price: 0, core: 0xffffff, glow: 0x7df9ff, trail: [0x7df9ff] },
  { id: 'brasa', name: 'Brasa', price: 100, core: 0xfff3b0, glow: 0xff6b35, trail: [0xff6b35, 0xffd23f] },
  { id: 'aurora', name: 'Aurora', price: 250, core: 0xeafff1, glow: 0x3dff9e, trail: [0x3dff9e, 0x2de2e6] },
  { id: 'nebulosa', name: 'Nebulosa', price: 450, core: 0xffe3ff, glow: 0xd16bff, trail: [0xd16bff, 0xff5fa2] },
  { id: 'sol', name: 'Sol', price: 800, core: 0xffffff, glow: 0xffc300, trail: [0xffc300, 0xff8c00, 0xffffff] },
  { id: 'arcoiris', name: 'Arco-íris', price: 1500, core: 0xffffff, glow: 0xffffff, trail: [0xff3860, 0xffb703, 0xfff75e, 0x3dff9e, 0x3a86ff, 0xd16bff] },
];

export const getSkin = (id) => SKINS.find((s) => s.id === id) ?? SKINS[0];
