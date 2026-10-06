// ניסוי מהיר: node tests/try.js <שלב> '<JSON פתרון, זוויות במעלות>'
global.Matter = require('matter-js');
const { createSim } = require('../public/js/sim.js');
const L = require('../public/js/levels.js')[Number(process.argv[2]) - 1];
const sol = JSON.parse(process.argv[3] || '[]').map((d) => ({ ...d, angle: (d.angle || 0) * Math.PI / 180 }));
const sim = createSim(L.fixed.concat(sol).map((d) => ({ ...d })), L.goals);
for (let i = 0; i < 60 * 12; i++) {
  if (sim.step()) { console.log('WON', (i / 60).toFixed(1)); break; }
  if (i % 20 === 0) console.log((i / 60).toFixed(2), sim.parts.filter((p) => p.desc.tag && p.main).map((p) => `${p.desc.tag}:${p.main.position.x.toFixed(0)},${p.main.position.y.toFixed(0)}${p.popped ? '(x)' : ''}`).join(' '));
}
