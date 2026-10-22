// Vistas da janela vendidas na loja: o que aparece atrás do vidro embaçado.
export const VIEWS = [
  { id: 'cidade', name: 'Cidade', price: 0, sky: ['#141b3a', '#3a2f6b', '#c46b8a'], ground: '#0b0f24', lights: ['#ffd28a', '#ff9f6b', '#9ad8ff', '#ffffff'] },
  { id: 'por-do-sol', name: 'Pôr do sol', price: 150, sky: ['#2b1846', '#c4486b', '#ffb36b'], ground: '#2a1430', lights: ['#ffe39a', '#ffb36b'] },
  { id: 'floresta', name: 'Floresta', price: 300, sky: ['#0f2a2a', '#2f5d50', '#9cc79a'], ground: '#0b1d17', lights: ['#e8ffb0', '#b7ffde'] },
  { id: 'aurora', name: 'Aurora', price: 500, sky: ['#020a1a', '#0b2a4a', '#1b6b6b'], ground: '#030812', lights: ['#7fffd4', '#c38bff', '#ffffff'] },
];

export const viewById = (id) => VIEWS.find((v) => v.id === id) || VIEWS[0];
