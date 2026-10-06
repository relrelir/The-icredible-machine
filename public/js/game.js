/* מכונת הפלאים – ממשק המשחק */
(function () {
  'use strict';
  const { PARTS, ORDER, hitTest, DEG } = WMParts;
  const { createSim, goalZone, W, H } = WMSim;
  const LEVELS = WMLevels;
  const $ = (id) => document.getElementById(id);

  // ---------- שמירת התקדמות ----------
  const store = {
    get(k, def) { try { const v = localStorage.getItem('wm.' + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem('wm.' + k, JSON.stringify(v)); } catch (e) { /* אין אחסון */ } },
  };
  let done = store.get('done', []);
  let soundOn = store.get('sound', true);

  // ---------- צלילים קטנים ----------
  let actx = null;
  function beep(freq, dur, type, vol, slide) {
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, actx.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, actx.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.15, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + dur);
    } catch (e) { /* בלי צליל */ }
  }
  const sfx = {
    place: () => beep(520, 0.08, 'triangle', 0.12),
    pick: () => beep(380, 0.06, 'triangle', 0.1),
    pop: () => { beep(900, 0.12, 'square', 0.12, 120); },
    boing: () => beep(200, 0.25, 'sine', 0.18, 700),
    win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.22, 'triangle', 0.16), i * 120)),
  };

  // ---------- מצב ----------
  const canvas = $('board');
  const ctx = canvas.getContext('2d');
  let scale = 1, dpr = 1;
  let levelIdx = 0;         // -1 = משחק חופשי
  let level = null;
  let placed = [];          // חלקים שהשחקן הניח
  let selected = null;
  let carrying = null;      // סוג חלק שנגרר מהמגש
  let ghostPos = null;
  let trayDrag = false;     // גרירה שהתחילה במגש
  let drag = null;
  let sim = null;
  let running = false;
  let effects = [];
  let hint = null;
  let hintCount = 0;
  let winShown = false;

  const isSandbox = () => levelIdx < 0;

  // ---------- תפריט ----------
  function buildMenu() {
    const grid = $('levelGrid');
    grid.innerHTML = '';
    LEVELS.forEach((L, i) => {
      const b = document.createElement('button');
      const unlocked = i === 0 || done.includes(i - 1) || done.includes(i);
      b.className = 'level-btn' + (done.includes(i) ? ' done' : '') + (unlocked ? '' : ' locked');
      b.innerHTML = `<span class="n">${done.includes(i) ? '⭐' : i + 1}</span><span class="t">${unlocked ? L.title : '🔒'}</span>`;
      if (unlocked) b.onclick = () => startLevel(i);
      grid.appendChild(b);
    });
    $('soundBtn').textContent = soundOn ? '🔊' : '🔇';
  }
  $('sandboxBtn').onclick = () => startLevel(-1);
  $('soundBtn').onclick = () => { soundOn = !soundOn; store.set('sound', soundOn); buildMenu(); };
  $('menuBtn').onclick = () => { stopRun(); show('menu'); buildMenu(); };

  function show(id) {
    ['menu', 'game'].forEach((s) => $(s).classList.toggle('hidden', s !== id));
    if (id === 'game') resize();
  }

  // ---------- שלב ----------
  const SANDBOX = {
    title: 'משחק חופשי', text: 'בנו כל מכונה שתרצו! אין חוקים 🙂',
    fixed: [], tray: Object.fromEntries(ORDER.map((k) => [k, Infinity])), goals: [], solution: [],
  };

  function startLevel(i) {
    levelIdx = i;
    level = i < 0 ? SANDBOX : LEVELS[i];
    placed = [];
    selected = null; carrying = null; hint = null; hintCount = 0; winShown = false;
    stopRun();
    $('lvlTitle').textContent = i < 0 ? level.title : `שלב ${i + 1}: ${level.title}`;
    $('lvlText').textContent = level.text;
    $('hintBtn').style.display = isSandbox() ? 'none' : '';
    show('game');
    buildTray();
    updateButtons();
  }

  function remaining(type) {
    const total = level.tray[type] || 0;
    return total - placed.filter((d) => d.type === type).length;
  }

  // ---------- מגש החלקים ----------
  function buildTray() {
    const tray = $('tray');
    tray.innerHTML = '';
    ORDER.filter((t) => level.tray[t]).forEach((type) => {
      const def = PARTS[type];
      const item = document.createElement('div');
      item.className = 'tray-item';
      item.dataset.type = type;
      const c = document.createElement('canvas');
      const cw = 76, ch = 52, r = window.devicePixelRatio || 1;
      c.width = cw * r; c.height = ch * r; c.style.width = cw + 'px'; c.style.height = ch + 'px';
      const g = c.getContext('2d');
      const [bw, bh] = def.box;
      const s = Math.min((cw - 8) / bw, (ch - 8) / bh, 1);
      g.setTransform(r * s, 0, 0, r * s, (cw / 2) * r, (ch / 2 - (def.boxOffsetY || 0) * s) * r);
      def.draw(g, { type, x: 0, y: 0, angle: def.defaultAngle || 0 }, null, false);
      item.appendChild(c);
      const lbl = document.createElement('div'); lbl.className = 'lbl'; lbl.textContent = def.name; item.appendChild(lbl);
      const cnt = document.createElement('div'); cnt.className = 'cnt'; item.appendChild(cnt);
      item.addEventListener('pointerdown', (e) => {
        if (running || remaining(type) <= 0) return;
        e.preventDefault();
        carrying = type; trayDrag = true; selected = null; ghostPos = null;
        sfx.pick();
        updateTray(); updateButtons();
      });
      tray.appendChild(item);
    });
    updateTray();
  }
  function updateTray() {
    document.querySelectorAll('.tray-item').forEach((el) => {
      const n = remaining(el.dataset.type);
      el.querySelector('.cnt').textContent = n === Infinity ? '∞' : n;
      el.classList.toggle('empty', n <= 0);
      el.classList.toggle('active', carrying === el.dataset.type);
    });
    $('tray').classList.toggle('running', running);
  }

  // ---------- גודל הלוח ----------
  function resize() {
    const wrap = $('boardWrap');
    const tip = wrap.querySelector('.portrait-tip');
    const aw = wrap.clientWidth - 24, ah = wrap.clientHeight - 24 - (tip && tip.offsetHeight ? tip.offsetHeight + 10 : 0);
    if (aw <= 0 || ah <= 0) return;
    scale = Math.min(aw / W, ah / H);
    dpr = window.devicePixelRatio || 1;
    canvas.style.width = W * scale + 'px';
    canvas.style.height = H * scale + 'px';
    canvas.width = Math.round(W * scale * dpr);
    canvas.height = Math.round(H * scale * dpr);
  }
  window.addEventListener('resize', resize);

  function toWorld(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale, inside: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom };
  }
  const clampX = (x) => Math.max(10, Math.min(W - 10, x));
  const clampY = (y) => Math.max(10, Math.min(H - 10, y));
  function overTray(e) {
    const r = $('tray').getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }

  // ---------- עכבר / מגע ----------
  canvas.addEventListener('pointerdown', (e) => {
    if (running) return;
    e.preventDefault();
    const p = toWorld(e);
    if (carrying) { placeAt(carrying, p); return; }
    // חיפוש חלק שהונח (מלמעלה למטה)
    for (let i = placed.length - 1; i >= 0; i--) {
      if (hitTest(placed[i], p.x, p.y)) {
        selected = placed[i];
        drag = { d: selected, dx: selected.x - p.x, dy: selected.y - p.y, moved: false };
        placed.splice(i, 1); placed.push(selected); // להביא לחזית
        updateButtons();
        return;
      }
    }
    selected = null;
    updateButtons();
  });

  window.addEventListener('pointermove', (e) => {
    if (running) return;
    const p = toWorld(e);
    if (carrying) { ghostPos = p.inside ? p : null; return; }
    if (drag) {
      drag.d.x = clampX(p.x + drag.dx);
      drag.d.y = clampY(p.y + drag.dy);
      drag.moved = true;
    }
  });

  window.addEventListener('pointerup', (e) => {
    if (running) return;
    const p = toWorld(e);
    const fromTray = trayDrag;
    trayDrag = false;
    if (carrying && fromTray && p.inside) { placeAt(carrying, p); return; }
    if (drag) {
      if (overTray(e)) removePart(drag.d); // גרירה חזרה למגש
      drag = null;
    }
  });

  function placeAt(type, p) {
    if (remaining(type) <= 0) { carrying = null; updateTray(); return; }
    const def = PARTS[type];
    const d = { type, x: clampX(p.x), y: clampY(p.y), angle: def.defaultAngle || 0, flip: false };
    placed.push(d);
    selected = d;
    carrying = null; ghostPos = null;
    sfx.place();
    updateTray(); updateButtons();
  }
  function removePart(d) {
    placed = placed.filter((x) => x !== d);
    if (selected === d) selected = null;
    sfx.pick();
    updateTray(); updateButtons();
  }

  // ---------- כלים ----------
  function rotate(dir) {
    if (!selected || !PARTS[selected.type].rotate) return;
    selected.angle = Math.round(((selected.angle || 0) + dir * 15 * DEG) / (15 * DEG)) * 15 * DEG;
    sfx.place();
  }
  $('rotLBtn').onclick = () => rotate(-1);
  $('rotRBtn').onclick = () => rotate(1);
  $('flipBtn').onclick = () => { if (selected && PARTS[selected.type].flip) { selected.flip = !selected.flip; sfx.place(); } };
  $('delBtn').onclick = () => { if (selected) removePart(selected); };
  $('resetBtn').onclick = () => { stopRun(); placed = []; selected = null; updateTray(); updateButtons(); };
  $('hintBtn').onclick = () => {
    if (!level.solution.length) return;
    hint = { d: level.solution[hintCount % level.solution.length], until: performance.now() + 4000 };
    hintCount++;
  };
  $('playBtn').onclick = () => (running ? stopRun() : startRun());

  window.addEventListener('keydown', (e) => {
    if ($('game').classList.contains('hidden')) return;
    if (e.key === ' ') { e.preventDefault(); running ? stopRun() : startRun(); }
    if (running) return;
    if (e.key === 'Delete' || e.key === 'Backspace') selected && removePart(selected);
    if (e.key === 'r' || e.key === 'R' || e.key === 'ר') rotate(1);
    if (e.key === 'Escape') { carrying = null; selected = null; updateTray(); updateButtons(); }
  });

  function updateButtons() {
    const def = selected && PARTS[selected.type];
    $('rotLBtn').disabled = $('rotRBtn').disabled = running || !def || !def.rotate;
    $('flipBtn').disabled = running || !def || !def.flip;
    $('delBtn').disabled = running || !selected;
    $('resetBtn').disabled = running;
    $('hintBtn').disabled = running;
    const pb = $('playBtn');
    pb.textContent = running ? '■ עצור' : '▶ הפעל';
    pb.classList.toggle('stop', running);
  }

  // ---------- הרצה ----------
  function startRun() {
    const descs = level.fixed.concat(placed).map((d) => Object.assign({}, d));
    sim = createSim(descs, level.goals, {
      onPop: (rt) => { effects.push({ kind: 'pop', x: rt.main.position.x, y: rt.main.position.y, t: 0 }); sfx.pop(); },
      onBounce: () => sfx.boing(),
    });
    running = true; carrying = null; selected = null; winShown = false; effects = [];
    acc = 0; last = performance.now();
    updateTray(); updateButtons();
  }
  function stopRun() {
    running = false; sim = null; effects = [];
    $('winModal').classList.add('hidden');
    updateTray(); updateButtons();
  }

  function onWin() {
    winShown = true;
    sfx.win();
    if (!done.includes(levelIdx)) { done.push(levelIdx); store.set('done', done); }
    for (let i = 0; i < 120; i++) {
      effects.push({ kind: 'confetti', x: W / 2 + (Math.random() - 0.5) * 300, y: H / 3, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 12 - 2, c: `hsl(${Math.random() * 360},90%,55%)`, t: 0 });
    }
    setTimeout(() => {
      if (!running) return;
      const last = levelIdx >= LEVELS.length - 1;
      $('winText').textContent = last ? 'סיימתם את כל השלבים! אתם מהנדסים אמיתיים 🏆' : 'המכונה עבדה בדיוק כמו שצריך!';
      $('nextBtn').textContent = last ? 'לתפריט' : 'לשלב הבא ◀';
      $('winModal').classList.remove('hidden');
    }, 1300);
  }
  $('nextBtn').onclick = () => {
    $('winModal').classList.add('hidden');
    if (levelIdx >= LEVELS.length - 1) { stopRun(); show('menu'); buildMenu(); } else startLevel(levelIdx + 1);
  };
  $('stayBtn').onclick = () => { $('winModal').classList.add('hidden'); };

  // ---------- ציור ----------
  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#d6f1fa'); g.addColorStop(1, '#a9dcec');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(31,111,139,.12)'; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = '#8d6e4f'; ctx.fillRect(0, H - 4, W, 4);
  }

  function star(x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  function drawGoals(t) {
    if (!level.goals) return;
    const descs = level.fixed;
    level.goals.forEach((g) => {
      if (g.type !== 'zone') return;
      const z = goalZone(g, descs);
      const hit = sim && sim.latched && sim.latched.has(g);
      if (g.star) {
        const cx = z.x + z.w / 2, cy = z.y + z.h / 2;
        ctx.save();
        ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(255,170,0,.6)'; ctx.lineWidth = 2;
        ctx.strokeRect(z.x, z.y, z.w, z.h); ctx.setLineDash([]);
        star(cx, cy, 26 + Math.sin(t / 300) * 3, t / 1500);
        ctx.fillStyle = hit ? '#4caf50' : '#ffc107'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#b26a00'; ctx.stroke();
        ctx.restore();
      } else {
        // חץ קופץ מעל הדלי
        const cx = z.x + z.w / 2, cy = z.y - 40 + Math.sin(t / 250) * 5;
        ctx.fillStyle = 'rgba(255,122,26,.9)';
        ctx.beginPath(); ctx.moveTo(cx - 10, cy - 12); ctx.lineTo(cx + 10, cy - 12); ctx.lineTo(cx + 10, cy);
        ctx.lineTo(cx + 18, cy); ctx.lineTo(cx, cy + 16); ctx.lineTo(cx - 18, cy); ctx.lineTo(cx - 10, cy); ctx.closePath(); ctx.fill();
      }
    });
  }

  function drawPart(d, rt) {
    PARTS[d.type].draw(ctx, d, rt, running);
  }

  function selBox(d, color) {
    const def = PARTS[d.type];
    const [w, h] = def.size ? def.size(d) : def.box;
    ctx.save();
    ctx.translate(d.x, d.y); ctx.rotate(d.angle || 0);
    ctx.setLineDash([6, 4]); ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2 - 6, -h / 2 - 6 + (def.boxOffsetY || 0), w + 12, h + 12);
    ctx.restore();
  }

  function render(t) {
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    drawBackground();
    drawGoals(t);

    let list;
    if (running && sim) list = sim.parts.map((rt) => [rt.desc, rt]);
    else list = level.fixed.concat(placed).map((d) => [d, null]);
    // סטטיים קודם, ואז נעים
    const isDyn = (d) => ['bowling', 'basketball', 'beachball', 'balloon', 'domino', 'crate'].includes(d.type);
    list.filter(([d]) => !isDyn(d)).forEach(([d, rt]) => drawPart(d, rt));
    list.filter(([d]) => isDyn(d)).forEach(([d, rt]) => drawPart(d, rt));
    list.filter(([d]) => d.type === 'bucket').forEach(([d]) => PARTS.bucket.drawFront(ctx, d));

    if (!running) {
      if (selected) selBox(selected, '#ff7a1a');
      if (hint && t < hint.until) {
        ctx.save(); ctx.globalAlpha = 0.45 + 0.2 * Math.sin(t / 150);
        PARTS[hint.d.type].draw(ctx, hint.d, null, false);
        ctx.restore();
        selBox(hint.d, '#2fb344');
      }
      if (carrying && ghostPos) {
        ctx.save(); ctx.globalAlpha = 0.55;
        PARTS[carrying].draw(ctx, { type: carrying, x: ghostPos.x, y: ghostPos.y, angle: PARTS[carrying].defaultAngle || 0 }, null, false);
        ctx.restore();
      }
      if (carrying && !ghostPos) {
        ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('געו בלוח כדי להניח את ה' + PARTS[carrying].name, W / 2, 34);
      }
    }

    // אפקטים
    effects = effects.filter((f) => {
      f.t++;
      if (f.kind === 'pop') {
        ctx.save(); ctx.strokeStyle = '#e53935'; ctx.lineWidth = 3; ctx.globalAlpha = 1 - f.t / 30;
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4, r1 = 10 + f.t, r2 = 18 + f.t * 1.6;
          ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * r1, f.y + Math.sin(a) * r1); ctx.lineTo(f.x + Math.cos(a) * r2, f.y + Math.sin(a) * r2); ctx.stroke();
        }
        ctx.font = 'bold 24px sans-serif'; ctx.fillStyle = '#e53935'; ctx.textAlign = 'center'; ctx.fillText('פוף!', f.x, f.y - 30 - f.t);
        ctx.restore();
        return f.t < 30;
      }
      f.x += f.vx; f.y += f.vy; f.vy += 0.35; f.vx *= 0.99;
      ctx.fillStyle = f.c; ctx.fillRect(f.x, f.y, 7, 11);
      return f.y < H + 20;
    });
  }

  // ---------- לולאה ----------
  let last = performance.now(), acc = 0;
  function loop(t) {
    if (running && sim) {
      acc += Math.min(t - last, 100);
      while (acc >= 1000 / 60) {
        sim.step();
        acc -= 1000 / 60;
        if (sim.won && !winShown && !isSandbox()) onWin();
      }
    }
    last = t;
    if (!$('game').classList.contains('hidden')) render(t);
    requestAnimationFrame(loop);
  }

  buildMenu();
  requestAnimationFrame(loop);
})();
