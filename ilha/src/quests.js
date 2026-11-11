// A história em missões. Cada missão diz quando está concluída (done) e para onde a bússola aponta (where).
import { BOSS, BUILDS, NPC, UPGRADES } from './world.js';

const RES_NODE = { wood: ['tree', 'pine'], stone: ['rock'], crystal: ['crystal'], berry: ['bush'] };

/** Enquanto falta recurso, aponta para o recurso mais perto; depois, para o lugar de usar. */
function gather(w, cost, site) {
  for (const [item, n] of Object.entries(cost)) {
    if (w.player.inv[item] < n && RES_NODE[item]) {
      const node = w.nearestNode(RES_NODE[item]);
      if (node) return { x: node.x, z: node.z, label: item };
    }
  }
  return site;
}

export const QUESTS = [
  {
    title: 'Fale com o Capitão Bento',
    hint: 'Estou aqui no acampamento.',
    talk: true,
    where: () => NPC,
    after: 'Você sobreviveu ao naufrágio! Eu também, mas minha perna não ajuda. Vamos montar um acampamento.',
    reward: { xp: 5 },
  },
  {
    title: 'Colete 5 madeiras e 3 pedras',
    hint: 'Bata nas árvores e nas pedras com o machado.',
    done: (w) => (w.player.inv.wood >= 5 && w.player.inv.stone >= 3) || w.builds.fogueira,
    where: (w) => gather(w, { wood: 5, stone: 3 }, BUILDS.fogueira),
    after: 'Boa! Com isso já dá para acender um fogo.',
    reward: { xp: 10 },
  },
  {
    title: 'Construa a fogueira',
    hint: 'O lugar da fogueira fica aqui no acampamento.',
    done: (w) => w.builds.fogueira,
    where: (w) => gather(w, BUILDS.fogueira.cost, BUILDS.fogueira),
    after: 'Fogo aceso! Ele cura você e espanta os bichos. Falando neles… tem gosmas rondando por aí.',
    reward: { xp: 15, coin: 10 },
  },
  {
    title: 'Derrote 4 gosmas',
    hint: 'As gosmas ficam nos campos, fora do acampamento. Role para desviar!',
    done: (w) => w.counters.slimes >= 4,
    where: (w) => {
      let best = null;
      let bd = Infinity;
      for (const e of w.enemies) {
        const d = Math.hypot(e.x - w.player.x, e.z - w.player.z);
        if (e.type === 'slime' && d < bd) {
          bd = d;
          best = e;
        }
      }
      return best ?? { x: NPC.x - 30, z: NPC.z - 55 };
    },
    after: 'Você luta bem! Agora precisamos de uma bancada para fazer ferramentas melhores.',
    reward: { xp: 20, coin: 15, potion: 1 },
  },
  {
    title: 'Construa a bancada',
    hint: 'Precisa de 10 madeiras e 6 pedras.',
    done: (w) => w.builds.bancada,
    where: (w) => gather(w, BUILDS.bancada.cost, BUILDS.bancada),
    after: 'Perfeito. Na bancada você melhora sua arma.',
    reward: { xp: 20 },
  },
  {
    title: 'Melhore sua arma na bancada',
    hint: 'Custa 6 madeiras e 8 pedras.',
    done: (w) => w.player.weapon >= 2,
    where: (w) => gather(w, UPGRADES[1], BUILDS.bancada),
    after: 'Agora sim! Escute: esta ilha guarda 3 relíquias antigas. Com elas vamos entender como sair daqui.',
    reward: { xp: 20 },
  },
  {
    title: 'Encontre as 3 relíquias',
    hint: 'Estão nos cantos da ilha. Siga a bússola.',
    done: (w) => w.nodes.filter((n) => n.type === 'relic' && !n.alive).length >= 3,
    where: (w) => w.nearestNode(['relic']) ?? NPC,
    after: 'As relíquias falam de um Golem no topo da montanha. O coração dele move qualquer barco! Mas antes, descanse.',
    reward: { xp: 60, coin: 30 },
  },
  {
    title: 'Construa a cabana',
    hint: 'Precisa de 20 madeiras e 12 pedras. Nela você dorme e pula a noite.',
    done: (w) => w.builds.cabana,
    where: (w) => gather(w, BUILDS.cabana.cost, BUILDS.cabana),
    after: 'Um teto, enfim! Para enfrentar o Golem você precisa de uma lâmina de cristal. Os cristais ficam no alto da montanha.',
    reward: { xp: 30 },
  },
  {
    title: 'Colete 6 cristais na montanha',
    hint: 'Cristais só quebram com a arma melhorada.',
    done: (w) => w.player.inv.crystal >= 6 || w.player.weapon >= 3,
    where: (w) => {
      const n = w.nearestNode(['crystal']);
      return n ? { x: n.x, z: n.z, label: 'crystal' } : BOSS;
    },
    after: 'Lindos! Leve para a bancada.',
    reward: { xp: 40 },
  },
  {
    title: 'Forje a lâmina de cristal',
    hint: 'Na bancada: 12 pedras e 6 cristais.',
    done: (w) => w.player.weapon >= 3,
    where: (w) => gather(w, UPGRADES[2], BUILDS.bancada),
    after: 'Essa lâmina corta até pedra viva. Suba a montanha e enfrente o Golem. Leve frutinhas e poções!',
    reward: { xp: 40, potion: 2 },
  },
  {
    title: 'Derrote o Golem no topo da montanha',
    hint: 'Quando ele levantar os braços, role para longe!',
    done: (w) => w.bossDead,
    where: () => BOSS,
    after: 'Você conseguiu! Com o coração do Golem, o barco volta a navegar.',
    reward: { xp: 100, coin: 50 },
  },
  {
    title: 'Conserte o barco',
    hint: 'Na praia: 30 madeiras, 8 cristais e o coração do Golem.',
    done: (w) => w.builds.barco,
    where: (w) => gather(w, { wood: 30, crystal: 8 }, BUILDS.barco),
    after: 'Está pronto! Quando quiser, suba no barco… ou fique. A ilha agora é sua.',
    reward: { xp: 50 },
  },
  {
    title: 'Zarpe no barco (ou continue explorando)',
    hint: 'O barco está na praia, ao sul do acampamento.',
    done: (w) => w.finished,
    where: () => BUILDS.barco,
    after: 'Boa viagem, capitão!',
    reward: {},
  },
];
