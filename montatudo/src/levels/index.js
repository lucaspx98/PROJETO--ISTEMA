import { mesa } from './mesa.js';
import { cadeira } from './cadeira.js';
import { estante } from './estante.js';
import { computador } from './computador.js';
import { setup } from './setup.js';

// Ordem das fases. Para criar uma nova, copie um destes arquivos e adicione aqui.
export const LEVELS = [mesa, cadeira, estante, computador, setup];
