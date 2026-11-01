// Loja do salão: melhorias compradas com moedas.
import { Save } from './storage.js';

export const UPGRADES = [
  {
    id: 'pincel',
    icon: '🖌️',
    name: 'Pincéis macios',
    costs: [80, 160, 300, 500],
    value: [1, 1.15, 1.3, 1.45, 1.6],
    desc: (v) => `Pincel, algodão e esponja ${Math.round((v - 1) * 100)}% maiores`,
  },
  {
    id: 'eletrico',
    icon: '⚡',
    name: 'Lixa elétrica e secador turbo',
    costs: [80, 160, 300, 500],
    value: [1, 1.4, 1.8, 2.3, 3],
    desc: (v) => `Lixa e secador ${String(v).replace('.', ',')}× mais rápidos`,
  },
  {
    id: 'decoracao',
    icon: '🪴',
    name: 'Salão decorado',
    costs: [120, 240, 400],
    value: [1, 1.25, 1.5, 1.8],
    desc: (v) => `Clientes dão ${Math.round((v - 1) * 100)}% a mais de gorjeta`,
  },
  { id: 'neon', icon: '🌈', name: 'Cores neon', costs: [250], value: [0, 1], desc: (v) => (v ? 'Verde, pink e azul neon liberados' : 'Novas cores para tudo') },
  { id: 'strass', icon: '💎', name: 'Strass coloridos', costs: [150], value: [0, 1], desc: (v) => (v ? 'Strass maiores e coloridos' : 'Decore as unhas com cores') },
];

export const upgrade = (id) => UPGRADES.find((u) => u.id === id);
export const valueOf = (id) => upgrade(id).value[Save.level(id)];
export const priceOf = (id) => upgrade(id).costs[Save.level(id)] ?? null;

export function buy(id) {
  const price = priceOf(id);
  if (price == null || !Save.spend(price)) return false;
  Save.setLevel(id, Save.level(id) + 1);
  return true;
}
