import { Level, hintPath } from '../src/game.js';
import { levelAt } from '../src/levels.js';
const i = Number(process.argv[2]) - 1;
const def = levelAt(i);
const lv = new Level(def, { onLose: (r) => console.log('PERDEU', r, 'em t=', lv.t.toFixed(2)) });
const pts = hintPath(def);
lv.beginStroke(pts[0].x, pts[0].y);
for (const p of pts.slice(1)) {
  lv.extendStroke(p.x, p.y);
  if (lv.blocked) { console.log('traço cortado em', p, 'livre?', lv.free(p.x, p.y)); break; }
}
console.log('fim traço ok?', lv.endStroke(), 'pontos', lv.points.length);
for (let t = 0; t < lv.timeTotal + 1 && lv.state === 'run'; t += 1 / 60) {
  lv.update(1 / 60);
  if (Math.abs(lv.t % 1) < 1 / 60) console.log(`t=${lv.t.toFixed(1)} bolota=(${lv.char.position.x.toFixed(0)},${lv.char.position.y.toFixed(0)}) traço=(${lv.line.position.x.toFixed(0)},${lv.line.position.y.toFixed(0)}) ang=${lv.line.angle.toFixed(2)} abelhas=${lv.bees.length}`);
}
const near = lv.bees.map((b) => Math.hypot(b.position.x - lv.char.position.x, b.position.y - lv.char.position.y)).sort((a, b) => a - b)[0];
console.log('estado', lv.state, 'abelha mais perto', near?.toFixed(0));
