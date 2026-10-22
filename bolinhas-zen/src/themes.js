// Temas de bolinhas vendidos na loja. Cada um tem sua paleta (11 cores), estilo de desenho e fundo.
export const THEMES = [
  {
    id: 'classico',
    name: 'Clássico',
    price: 0,
    style: 'glossy',
    bg: ['#1b1033', '#3b1e6e', '#6a2c91'],
    colors: ['#ff4d6d', '#ff9f1c', '#ffd60a', '#9ef01a', '#2dc653', '#2ec4b6', '#4cc9f0', '#3a5aff', '#8338ec', '#ff70c8', '#a0623d'],
  },
  {
    id: 'doces',
    name: 'Doces',
    price: 150,
    style: 'candy',
    bg: ['#3d1f4f', '#8a4f7d', '#f4a4c0'],
    colors: ['#ff8fa3', '#ffb86b', '#fff07a', '#c5f277', '#7fe0a1', '#7ff0e0', '#9ad8ff', '#8fa8ff', '#c9a0ff', '#ffa8e2', '#c79a7a'],
  },
  {
    id: 'neon',
    name: 'Neon',
    price: 300,
    style: 'neon',
    bg: ['#05010f', '#0d0628', '#1b0a3d'],
    colors: ['#ff2a6d', '#ff8c00', '#f9f871', '#b6ff00', '#00ff9f', '#f0f0ff', '#00b3ff', '#4d6bff', '#b026ff', '#ff4ecd', '#ff6b4a'],
  },
  {
    id: 'gemas',
    name: 'Gemas',
    price: 500,
    style: 'gem',
    bg: ['#0b1a2e', '#123a5a', '#1f6b80'],
    colors: ['#e0115f', '#ff7518', '#ffc30b', '#7fff00', '#009b77', '#30d5c8', '#0f52ba', '#2a3cff', '#9966cc', '#ff66cc', '#b87333'],
  },
];

export const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES[0];
