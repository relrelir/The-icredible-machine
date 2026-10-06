// בדיקת שלבים: כל שלב לא נפתר בלי חלקים, ונפתר עם הפתרון השמור
global.Matter = require('matter-js');
const { createSim } = require('../public/js/sim.js');
const LEVELS = require('../public/js/levels.js');

const MAX_STEPS = 60 * 20;
const only = process.argv[2] ? Number(process.argv[2]) : null;
const verbose = process.argv.includes('-v');

function run(descs, goals, trace) {
  const sim = createSim(descs.map((d) => ({ ...d })), goals);
  for (let i = 0; i < MAX_STEPS; i++) {
    if (sim.step()) return { won: true, t: (i / 60).toFixed(1) };
    if (trace && i % 15 === 0) {
      const s = sim.parts.filter((p) => p.desc.tag && p.main).map((p) => `${p.desc.tag}:${p.main.position.x.toFixed(0)},${p.main.position.y.toFixed(0)}`);
      console.log('   t=' + (i / 60).toFixed(2), s.join(' '));
    }
  }
  return { won: false };
}

let fail = 0;
LEVELS.forEach((L, i) => {
  if (only !== null && only !== i + 1) return;
  if (!L.goals || !L.goals.length) return;
  const base = run(L.fixed, L.goals);
  const sol = run(L.fixed.concat(L.solution), L.goals, verbose);
  // הפתרון חייב להשתמש רק במה שיש במגש
  const use = {};
  L.solution.forEach((d) => { use[d.type] = (use[d.type] || 0) + 1; });
  const trayOk = Object.entries(use).every(([k, n]) => (L.tray[k] || 0) >= n);
  const ok = !base.won && sol.won && trayOk;
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✗'} ${i + 1}. ${L.title}  בלי-פתרון:${base.won ? 'נפתר(!)' : 'לא'}  עם-פתרון:${sol.won ? 'נפתר ב-' + sol.t + 'ש' : 'לא'}${trayOk ? '' : '  (מגש חסר)'}`);
});
process.exit(fail ? 1 : 0);
