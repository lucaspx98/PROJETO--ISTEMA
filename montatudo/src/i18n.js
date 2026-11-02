// Idiomas do jogo. O texto em português é a própria chave; o que faltar na tabela aparece em português.
import { Save } from './storage.js';

export const LANGS = [
  { id: 'pt', nome: 'Português' },
  { id: 'en', nome: 'English' },
  { id: 'es', nome: 'Español' },
];

// [português, inglês, espanhol]
const ROWS = [
  // telas
  ['Monte móveis e computadores peça por peça', 'Build furniture and computers piece by piece', 'Monta muebles y computadoras pieza por pieza'],
  ['▶ Jogar', '▶ Play', '▶ Jugar'],
  ['🧰 Oficina', '🧰 Workshop', '🧰 Taller'],
  ['Escolha o que montar', 'Choose what to build', 'Elige qué montar'],
  ['Montagem concluída!', 'Build complete!', '¡Montaje terminado!'],
  ['Dobrar moedas (anúncio)', 'Double the coins (ad)', 'Duplicar monedas (anuncio)'],
  ['Próxima fase ▶', 'Next level ▶', 'Siguiente nivel ▶'],
  ['Fases', 'Levels', 'Niveles'],
  ['ANÚNCIO (simulado)', 'AD (simulated)', 'ANUNCIO (simulado)'],
  ['anúncio', 'ad', 'anuncio'],
  ['🔊 Efeitos', '🔊 Effects', '🔊 Efectos'],
  ['🔇 Efeitos', '🔇 Effects', '🔇 Efectos'],
  ['🎵 Música: sim', '🎵 Music: on', '🎵 Música: sí'],
  ['🎵 Música: não', '🎵 Music: off', '🎵 Música: no'],
  ['FASE {n}', 'LEVEL {n}', 'NIVEL {n}'],
  ['Termine a fase anterior para liberar', 'Finish the previous level to unlock', 'Termina el nivel anterior para desbloquear'],
  ['Arraste as peças até o contorno azul', 'Drag the parts to the blue outline', 'Arrastra las piezas hasta el contorno azul'],
  ['Tempo {t} · {n} erro', 'Time {t} · {n} mistake', 'Tiempo {t} · {n} error'],
  ['Tempo {t} · {n} erros', 'Time {t} · {n} mistakes', 'Tiempo {t} · {n} errores'],
  ['Tudo na bandeja já foi usado. Termine de prender com as ferramentas 🔧', 'Everything in the tray has been used. Finish fastening with the tools 🔧', 'Ya se usó todo lo de la bandeja. Termina de fijar con las herramientas 🔧'],
  ['Tudo montado! 🎉', 'All built! 🎉', '¡Todo montado! 🎉'],
  ['Anúncio indisponível agora', 'No ad available right now', 'Anuncio no disponible ahora'],
  // oficina
  ['Próximo nível: {x}', 'Next level: {x}', 'Siguiente nivel: {x}'],
  ['Nível máximo', 'Max level', 'Nivel máximo'],
  ['Melhorar · {n} 🪙', 'Upgrade · {n} 🪙', 'Mejorar · {n} 🪙'],
  ['Comprar · {n} 🪙', 'Buy · {n} 🪙', 'Comprar · {n} 🪙'],
  ['{x} melhorada!', '{x} upgraded!', '¡{x}: mejorado!'],
  ['Faltam {n} moedas. Monte mais coisas!', 'You need {n} more coins. Build more things!', 'Faltan {n} monedas. ¡Monta más cosas!'],
  // ferramentas
  ['Mão', 'Hand', 'Mano'],
  ['Encaixa memória, placa de vídeo e parafusos de dedo', 'Fits memory, graphics cards and thumb screws', 'Encaja memoria, tarjeta gráfica y tornillos de mano'],
  ['Chave de fenda', 'Screwdriver', 'Destornillador'],
  ['{n} voltas por parafuso', '{n} turns per screw', '{n} vueltas por tornillo'],
  ['Martelo', 'Hammer', 'Martillo'],
  ['{n} batidas por prego', '{n} hits per nail', '{n} golpes por clavo'],
  ['Parafusadeira', 'Power Drill', 'Atornillador eléctrico'],
  ['Segure no parafuso: {n} voltas/s', 'Hold on the screw: {n} turns/s', 'Mantén sobre el tornillo: {n} vueltas/s'],
  ['Aperta sozinha enquanto você segura', 'Tightens by itself while you hold', 'Aprieta sola mientras mantienes pulsado'],
  ['Nv{n}', 'Lv{n}', 'Nv{n}'],
  ['Parafuso', 'Screw', 'Tornillo'],
  ['Parafuso de dedo', 'Thumb Screw', 'Tornillo de mano'],
  ['Prego', 'Nail', 'Clavo'],
  // avisos durante a montagem
  ['Termine de prender: {x}', 'Finish fastening: {x}', 'Termina de fijar: {x}'],
  ['Antes, coloque: {x}', 'First, place: {x}', 'Antes, coloca: {x}'],
  ['Solte a peça em cima do contorno', 'Drop the part on the outline', 'Suelta la pieza sobre el contorno'],
  ['Arraste o parafuso até um furo laranja', 'Drag the screw to an orange hole', 'Arrastra el tornillo hasta un agujero naranja'],
  ['Arraste o prego até um furo laranja', 'Drag the nail to an orange hole', 'Arrastra el clavo hasta un agujero naranja'],
  ['Arraste a peça para cima, até o contorno', 'Drag the part up to the outline', 'Arrastra la pieza hacia arriba, hasta el contorno'],
  ['Pegue o martelo 🔨 e bata: {x}', 'Grab the hammer 🔨 and hit: {x}', 'Toma el martillo 🔨 y golpea: {x}'],
  ['Pressione com a mão 🖐️ até encaixar: {x}', 'Press with your hand 🖐️ until it fits: {x}', 'Presiona con la mano 🖐️ hasta encajar: {x}'],
  ['Arraste um parafuso da bandeja até o furo laranja', 'Drag a screw from the tray to the orange hole', 'Arrastra un tornillo de la bandeja hasta el agujero naranja'],
  ['Esse furo é de prego', 'That hole is for a nail', 'Ese agujero es para un clavo'],
  ['Esse furo é de parafuso', 'That hole is for a screw', 'Ese agujero es para un tornillo'],
  ['Solte em cima de um furo laranja', 'Drop it on an orange hole', 'Suéltalo sobre un agujero naranja'],
  ['Agora pegue o martelo 🔨 e bata no prego', 'Now grab the hammer 🔨 and hit the nail', 'Ahora toma el martillo 🔨 y golpea el clavo'],
  ['Gire com o dedo 🖐️ em círculos, no sentido horário ↻', 'Turn with your finger 🖐️ in circles, clockwise ↻', 'Gira con el dedo 🖐️ en círculos, en sentido horario ↻'],
  ['Pegue a chave 🪛 e gire o dedo em círculos sobre o parafuso, sentido horário ↻', 'Grab the screwdriver 🪛 and move your finger in circles over the screw, clockwise ↻', 'Toma el destornillador 🪛 y gira el dedo en círculos sobre el tornillo, en sentido horario ↻'],
  ['Primeiro arraste um prego até esse furo', 'First drag a nail to that hole', 'Primero arrastra un clavo hasta ese agujero'],
  ['Primeiro arraste um parafuso até esse furo', 'First drag a screw to that hole', 'Primero arrastra un tornillo hasta ese agujero'],
  ['Parafuso não se martela! Use a chave 🪛', "Don't hammer a screw! Use the screwdriver 🪛", '¡Un tornillo no se martilla! Usa el destornillador 🪛'],
  ['Cuidado! Martelo em peça de computador estraga 💥', 'Careful! A hammer breaks computer parts 💥', '¡Cuidado! El martillo daña las piezas de computadora 💥'],
  ['Essa peça se encaixa com a mão 🖐️', 'This part fits by hand 🖐️', 'Esta pieza encaja con la mano 🖐️'],
  ['Prego se bate com o martelo 🔨', 'Nails take the hammer 🔨', 'Los clavos se golpean con el martillo 🔨'],
  ['Essa peça precisa do martelo 🔨', 'This part needs the hammer 🔨', 'Esta pieza necesita el martillo 🔨'],
  ['Use o martelo 🔨', 'Use the hammer 🔨', 'Usa el martillo 🔨'],
  ['Esse parafuso precisa da chave 🪛', 'This screw needs the screwdriver 🪛', 'Este tornillo necesita el destornillador 🪛'],
  ['Martelo 🔨 + toques: {x}', 'Hammer 🔨 + taps: {x}', 'Martillo 🔨 + toques: {x}'],
  ['Mão 🖐️ + toques: {x}', 'Hand 🖐️ + taps: {x}', 'Mano 🖐️ + toques: {x}'],
  ['Martelo 🔨 + toques no prego', 'Hammer 🔨 + taps on the nail', 'Martillo 🔨 + toques en el clavo'],
  ['Mão 🖐️ + gire em círculos ↻', 'Hand 🖐️ + turn in circles ↻', 'Mano 🖐️ + gira en círculos ↻'],
  ['Chave 🪛 + gire o dedo em círculos ↻', 'Screwdriver 🪛 + move your finger in circles ↻', 'Destornillador 🪛 + gira el dedo en círculos ↻'],
  ['Arraste da bandeja até o furo laranja', 'Drag from the tray to the orange hole', 'Arrastra de la bandeja hasta el agujero naranja'],
  ['Próxima peça: {x}', 'Next part: {x}', 'Siguiente pieza: {x}'],
  // fases
  ['Mesa de escritório', 'Office Desk', 'Escritorio'],
  ['Cadeira de escritório', 'Office Chair', 'Silla de oficina'],
  ['Estante de livros', 'Bookcase', 'Estantería'],
  ['PC gamer', 'Gaming PC', 'PC gamer'],
  ['Setup gamer completo', 'Full Gaming Setup', 'Setup gamer completo'],
  // peças
  ['Perna', 'Leg', 'Pata'],
  ['Travessa', 'Crossbar', 'Travesaño'],
  ['Tampo', 'Tabletop', 'Tablero'],
  ['Gaveta', 'Drawer', 'Cajón'],
  ['Rodinhas', 'Casters', 'Ruedas'],
  ['Base estrela', 'Star Base', 'Base de estrella'],
  ['Pistão a gás', 'Gas Lift', 'Pistón de gas'],
  ['Mecanismo', 'Mechanism', 'Mecanismo'],
  ['Assento', 'Seat', 'Asiento'],
  ['Encosto', 'Backrest', 'Respaldo'],
  ['Braço', 'Armrest', 'Reposabrazos'],
  ['Lateral', 'Side Panel', 'Lateral'],
  ['Base', 'Base', 'Base'],
  ['Topo', 'Top', 'Parte superior'],
  ['Fundo', 'Back Panel', 'Fondo'],
  ['Prateleira', 'Shelf', 'Estante'],
  ['Livros', 'Books', 'Libros'],
  ['Gabinete', 'Case', 'Gabinete'],
  ['Fonte', 'Power Supply', 'Fuente de poder'],
  ['Placa-mãe', 'Motherboard', 'Placa base'],
  ['Processador', 'Processor', 'Procesador'],
  ['Cooler', 'CPU Cooler', 'Disipador'],
  ['Memória RAM', 'RAM', 'Memoria RAM'],
  ['SSD M.2', 'M.2 SSD', 'SSD M.2'],
  ['Placa de vídeo', 'Graphics Card', 'Tarjeta gráfica'],
  ['Ventoinhas', 'Fans', 'Ventiladores'],
  ['Ventoinha', 'Fan', 'Ventilador'],
  ['Tampa de vidro', 'Glass Panel', 'Panel de vidrio'],
  ['Mousepad', 'Mouse Pad', 'Alfombrilla'],
  ['Suporte', 'Stand', 'Soporte'],
  ['Monitor', 'Monitor', 'Monitor'],
  ['Teclado', 'Keyboard', 'Teclado'],
  ['Mouse', 'Mouse', 'Ratón'],
  ['Caixa de som', 'Speaker', 'Altavoz'],
  ['Computador', 'Computer', 'Computadora'],
  ['Luminária', 'Lamp', 'Lámpara'],
];

const DICT = { en: new Map(ROWS.map((r) => [r[0], r[1]])), es: new Map(ROWS.map((r) => [r[0], r[2]])) };

function detect() {
  const saved = Save.get('lang');
  if (LANGS.some((l) => l.id === saved)) return saved;
  const sys = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return LANGS.some((l) => l.id === sys) ? sys : 'en';
}

let cur = detect();

export const langName = () => LANGS.find((l) => l.id === cur).nome;

/** Traduz um texto em português; {n}, {x} e {t} são trocados pelos valores de `vars`. */
export function tr(s, vars) {
  let out = cur === 'pt' ? s : (DICT[cur].get(s) ?? s);
  if (vars) for (const k of Object.keys(vars)) out = out.replace(`{${k}}`, vars[k]);
  return out;
}

/** Número decimal com a vírgula ou o ponto do idioma. */
export const num = (x) => (cur === 'en' ? String(x) : String(x).replace('.', ','));

/** Traduz os textos fixos do index.html (o original em português fica guardado no nó). */
export function applyDom() {
  document.documentElement.lang = cur === 'pt' ? 'pt-BR' : cur;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const n = w.currentNode;
    if (n.parentElement.tagName === 'SCRIPT' || n.parentElement.tagName === 'STYLE') continue;
    const raw = n._pt ?? n.nodeValue;
    const txt = raw.trim();
    if (!txt) continue;
    if (n._pt || DICT.en.has(txt)) {
      n._pt = raw;
      n.nodeValue = raw.replace(txt, tr(txt));
    }
  }
}

/** Passa para o próximo idioma da lista e guarda a escolha. */
export function nextLang() {
  const i = LANGS.findIndex((l) => l.id === cur);
  cur = LANGS[(i + 1) % LANGS.length].id;
  Save.set('lang', cur);
  applyDom();
}
