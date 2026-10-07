// Personagens desbloqueáveis com moedas.
export const SKINS = [
  { id: 'classico', name: 'Clássico', price: 0, body: 0x37e2d5, accent: 0xffffff },
  { id: 'brasa', name: 'Brasa', price: 150, body: 0xff6b35, accent: 0xffd23f },
  { id: 'limao', name: 'Limão', price: 300, body: 0xa3e635, accent: 0x14532d },
  { id: 'uva', name: 'Uva', price: 500, body: 0xa855f7, accent: 0xf0abfc },
  { id: 'ouro', name: 'Ouro', price: 1000, body: 0xfacc15, accent: 0x7c2d12 },
  { id: 'ninja', name: 'Ninja', price: 2000, body: 0x1f2937, accent: 0xef4444 },
];

export const getSkin = (id) => SKINS.find((s) => s.id === id) ?? SKINS[0];
