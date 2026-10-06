// כלי עזר לעיצוב שלבים: חיפוש אקראי של מיקומי חלקים שפותרים שלב
// שימוש: node tests/search.js <מספר שלב> '<JSON של תבניות>' [ניסיונות]
// תבנית: {"type":"ramp","x":[200,500],"y":[300,560],"angle":[5,40],"flip":[0,1]}  (זווית במעלות)
global.Matter = require('matter-js');
const { createSim } = require('../public/js/sim.js');
const LEVELS = require('../public/js/levels.js');
const L = LEVELS[Number(process.argv[2]) - 1];
const tpl = JSON.parse(process.argv[3]);
const N = Number(process.argv[4] || 300);
const r = ([a, b]) => a + Math.random() * (b - a);
const found = [];
for (let n = 0; n < N && found.length < 8; n++) {
  const sol = tpl.map((t) => {
    const d = { type: t.type };
    for (const k of Object.keys(t)) if (k !== 'type') d[k] = Array.isArray(t[k]) ? r(t[k]) : t[k];
    if (d.angle !== undefined) d.angle = Math.round(d.angle / 5) * 5 * Math.PI / 180;
    if (d.flip !== undefined) d.flip = d.flip > 0.5;
    d.x = Math.round(d.x); d.y = Math.round(d.y);
    return d;
  });
  const sim = createSim(L.fixed.concat(sol).map((d) => ({ ...d })), L.goals);
  let won = false;
  for (let i = 0; i < 60 * 15 && !won; i++) won = sim.step();
  if (won) { found.push(sol); console.log(JSON.stringify(sol.map((d) => ({ ...d, angle: d.angle !== undefined ? Math.round(d.angle * 180 / Math.PI) : undefined }))), (sim.steps / 60).toFixed(1) + 's'); }
}
console.log('found', found.length);
