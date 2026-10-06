/* מכונת הפלאים – הגדרות החלקים: פיזיקה (Matter.js) + ציור (Canvas) */
(function (root, factory) {
  const M = root.Matter || (typeof require !== 'undefined' ? require('matter-js') : null);
  const api = factory(M);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WMParts = api;
})(typeof self !== 'undefined' ? self : this, function (Matter) {
  'use strict';
  const { Bodies, Body } = Matter;
  const DEG = Math.PI / 180;

  // ---------- עזרי ציור ----------
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function withPose(ctx, p, fn) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle || 0);
    fn();
    ctx.restore();
  }
  function shadeBall(ctx, r, c1, c2) {
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  }
  function outline(ctx, w) {
    ctx.lineWidth = w || 2;
    ctx.strokeStyle = 'rgba(30,20,10,.75)';
    ctx.stroke();
  }

  // מיקום נוכחי: בזמן ריצה מהגוף הפיזיקלי, בעריכה מהתיאור
  function pose(d, rt) {
    if (rt && rt.main) return { x: rt.main.position.x, y: rt.main.position.y, angle: rt.main.angle };
    return { x: d.x, y: d.y, angle: d.angle || 0 };
  }
  function dyn(d, body) {
    Body.setAngle(body, d.angle || 0);
    return { main: body, bodies: [body] };
  }
  function stat(d, body) {
    Body.setAngle(body, d.angle || 0);
    return { main: body, bodies: [body] };
  }

  const PARTS = {
    // ---------------- כדורים ----------------
    bowling: {
      name: 'כדור כבד', box: [38, 38], rotate: false, flip: false,
      build(d) {
        return dyn(d, Bodies.circle(d.x, d.y, 18, { density: 0.012, restitution: 0.05, friction: 0.06, frictionAir: 0.001 }));
      },
      draw(ctx, d, rt) {
        withPose(ctx, pose(d, rt), () => {
          shadeBall(ctx, 18, '#6b7cff', '#141a5c');
          outline(ctx, 1.5);
          ctx.fillStyle = '#0a0d2e';
          [[-5, -7], [3, -9], [-1, -1]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill(); });
        });
      },
    },
    basketball: {
      name: 'כדורסל', box: [34, 34], rotate: false, flip: false,
      build(d) {
        return dyn(d, Bodies.circle(d.x, d.y, 16, { density: 0.0015, restitution: 0.78, friction: 0.05, frictionAir: 0.002 }));
      },
      draw(ctx, d, rt) {
        withPose(ctx, pose(d, rt), () => {
          shadeBall(ctx, 16, '#ffb35c', '#d4560b');
          outline(ctx, 1.5);
          ctx.strokeStyle = '#5a2304'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, 16); ctx.stroke();
          ctx.beginPath(); ctx.arc(-16, 0, 11, -1.1, 1.1); ctx.stroke();
          ctx.beginPath(); ctx.arc(16, 0, 11, Math.PI - 1.1, Math.PI + 1.1); ctx.stroke();
        });
      },
    },
    beachball: {
      name: 'כדור ים', box: [44, 44], rotate: false, flip: false,
      build(d) {
        return dyn(d, Bodies.circle(d.x, d.y, 22, { density: 0.00025, restitution: 0.35, friction: 0.05, frictionAir: 0.012 }));
      },
      draw(ctx, d, rt) {
        withPose(ctx, pose(d, rt), () => {
          const cols = ['#ff4d4d', '#ffffff', '#3d8bff', '#ffffff', '#ffd23d', '#ffffff'];
          for (let i = 0; i < 6; i++) {
            ctx.fillStyle = cols[i];
            ctx.beginPath(); ctx.moveTo(0, 0);
            ctx.arc(0, 0, 22, i * Math.PI / 3, (i + 1) * Math.PI / 3); ctx.closePath(); ctx.fill();
          }
          const g = ctx.createRadialGradient(-8, -9, 2, 0, 0, 22);
          g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(0,0,0,.18)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.fill();
          outline(ctx, 1.5);
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill();
        });
      },
    },
    balloon: {
      name: 'בלון', box: [38, 60], boxOffsetY: 10, rotate: false, flip: false,
      build(d) {
        const b = Bodies.circle(d.x, d.y, 18, { density: 0.0004, restitution: 0.3, friction: 0.02, frictionAir: 0.04 });
        return { main: b, bodies: [b], buoyant: true };
      },
      draw(ctx, d, rt) {
        if (rt && rt.popped) return;
        const p = pose(d, rt);
        const t = (typeof performance !== 'undefined' ? performance.now() : 0) / 400;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, 21);
        ctx.quadraticCurveTo(6 * Math.sin(t), 32, 0, 42); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, 0, 17, 20, 0, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(-6, -8, 2, 0, 0, 21);
        g.addColorStop(0, '#ff9a9a'); g.addColorStop(1, '#c4101a');
        ctx.fillStyle = g; ctx.fill(); outline(ctx, 1.5);
        ctx.fillStyle = '#c4101a';
        ctx.beginPath(); ctx.moveTo(-3, 23); ctx.lineTo(3, 23); ctx.lineTo(0, 19); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath(); ctx.ellipse(-7, -8, 3, 6, 0.5, 0, 7); ctx.fill();
        ctx.restore();
      },
    },

    // ---------------- מבנים קבועים ----------------
    brick: {
      name: 'קיר לבנים', box: [120, 22], rotate: true, flip: false,
      size(d) { return [d.w || 120, 22]; },
      build(d) {
        return stat(d, Bodies.rectangle(d.x, d.y, d.w || 120, 22, { isStatic: true, friction: 0.5 }));
      },
      draw(ctx, d, rt) {
        const w = d.w || 120, h = 22;
        withPose(ctx, pose(d, rt), () => {
          ctx.fillStyle = '#e8d9c4'; ctx.fillRect(-w / 2, -h / 2, w, h);
          const bw = 24, bh = 11;
          for (let row = 0; row < 2; row++) {
            const off = row ? bw / 2 : 0;
            for (let x = -w / 2 - off; x < w / 2; x += bw) {
              const x0 = Math.max(x + 1, -w / 2 + 1), x1 = Math.min(x + bw - 1, w / 2 - 1);
              if (x1 <= x0) continue;
              ctx.fillStyle = (Math.round(x) + row * 7) % 3 ? '#b8402e' : '#a3372a';
              ctx.fillRect(x0, -h / 2 + row * bh + 1, x1 - x0, bh - 2);
            }
          }
          ctx.strokeStyle = 'rgba(60,20,10,.8)'; ctx.lineWidth = 1.5; ctx.strokeRect(-w / 2, -h / 2, w, h);
        });
      },
    },
    ramp: {
      name: 'קרש משופע', box: [150, 14], rotate: true, flip: false, defaultAngle: 20 * DEG,
      size(d) { return [d.w || 150, 14]; },
      build(d) {
        return stat(d, Bodies.rectangle(d.x, d.y, d.w || 150, 12, { isStatic: true, friction: 0.02 }));
      },
      draw(ctx, d, rt) {
        const w = d.w || 150;
        withPose(ctx, pose(d, rt), () => {
          const g = ctx.createLinearGradient(0, -6, 0, 6);
          g.addColorStop(0, '#f2c27b'); g.addColorStop(1, '#b97a35');
          ctx.fillStyle = g; rr(ctx, -w / 2, -6, w, 12, 3); ctx.fill(); outline(ctx, 1.5);
          ctx.strokeStyle = 'rgba(120,70,20,.5)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(-w / 2 + 8, -1); ctx.bezierCurveTo(-10, -4, 10, 3, w / 2 - 8, 0); ctx.stroke();
          ctx.fillStyle = '#7b7b7b';
          [-w / 2 + 6, w / 2 - 6].forEach((x) => { ctx.beginPath(); ctx.arc(x, 0, 2, 0, 7); ctx.fill(); });
        });
      },
    },
    trampoline: {
      name: 'טרמפולינה', box: [90, 38], boxOffsetY: 10, rotate: false, flip: false,
      build(d) {
        const b = Bodies.rectangle(d.x, d.y, 90, 14, { isStatic: true, restitution: 0.9, friction: 0.3 });
        return { main: b, bodies: [b], bouncy: true };
      },
      draw(ctx, d, rt) {
        const p = { x: d.x, y: d.y, angle: 0 };
        const squash = rt && rt.squash ? rt.squash : 0;
        withPose(ctx, p, () => {
          ctx.strokeStyle = '#555'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(-38, 4); ctx.lineTo(-44, 28); ctx.moveTo(38, 4); ctx.lineTo(44, 28); ctx.stroke();
          ctx.fillStyle = '#1e88e5'; rr(ctx, -45, -7, 90, 12, 5); ctx.fill(); outline(ctx, 1.5);
          ctx.fillStyle = '#222';
          ctx.beginPath(); ctx.moveTo(-36, -6); ctx.quadraticCurveTo(0, -6 + squash * 8, 36, -6); ctx.lineTo(36, -2); ctx.quadraticCurveTo(0, -2 + squash * 8, -36, -2); ctx.fill();
          ctx.fillStyle = '#fdd835';
          for (let i = -30; i <= 30; i += 15) { ctx.beginPath(); ctx.arc(i, 1, 2, 0, 7); ctx.fill(); }
        });
        if (rt && rt.squash) rt.squash *= 0.85;
      },
    },
    fan: {
      name: 'מאוורר', box: [48, 52], rotate: true, flip: true,
      reach: 320,
      build(d) {
        const b = Bodies.rectangle(d.x, d.y, 30, 46, { isStatic: true, friction: 0.3 });
        Body.setAngle(b, d.angle || 0);
        return { main: b, bodies: [b], fan: true, spin: 0 };
      },
      draw(ctx, d, rt, running) {
        const dir = d.flip ? -1 : 1;
        withPose(ctx, { x: d.x, y: d.y, angle: d.angle || 0 }, () => {
          ctx.scale(dir, 1);
          if (running) {
            const t = performance.now() / 200;
            ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
              const y = -24 + i * 16;
              const off = ((t * 40 + i * 37) % 260);
              ctx.beginPath(); ctx.moveTo(30 + off, y); ctx.lineTo(60 + off, y + 3 * Math.sin(t + i)); ctx.stroke();
            }
          }
          // מעמד
          ctx.fillStyle = '#5d6d7e'; rr(ctx, -20, 14, 26, 12, 3); ctx.fill(); outline(ctx, 1);
          ctx.fillStyle = '#85929e'; ctx.fillRect(-10, 0, 6, 16);
          // גוף + רשת
          ctx.fillStyle = '#2e86c1'; rr(ctx, -18, -24, 22, 40, 6); ctx.fill(); outline(ctx, 1.5);
          ctx.fillStyle = '#d6eaf8'; ctx.beginPath(); ctx.ellipse(8, -4, 9, 22, 0, 0, 7); ctx.fill(); outline(ctx, 1.5);
          const a = rt ? rt.spin : 0;
          ctx.fillStyle = '#1b4f72';
          for (let i = 0; i < 3; i++) {
            const ang = a + i * 2.094;
            ctx.beginPath(); ctx.ellipse(8, -4 + Math.sin(ang) * 10, 3, 7 * Math.abs(Math.cos(ang)) + 1, 0, 0, 7); ctx.fill();
          }
          ctx.fillStyle = '#f4d03f'; ctx.beginPath(); ctx.arc(8, -4, 3, 0, 7); ctx.fill();
        });
      },
    },
    conveyor: {
      name: 'מסוע', box: [170, 22], rotate: false, flip: true,
      build(d) {
        const b = Bodies.rectangle(d.x, d.y, 170, 18, { isStatic: true, friction: 0.9, chamfer: { radius: 8 } });
        return { main: b, bodies: [b], conveyor: d.flip ? -1 : 1, phase: 0 };
      },
      draw(ctx, d, rt) {
        const dir = d.flip ? -1 : 1;
        const ph = rt ? rt.phase : 0;
        withPose(ctx, { x: d.x, y: d.y, angle: 0 }, () => {
          ctx.fillStyle = '#333'; rr(ctx, -85, -9, 170, 18, 9); ctx.fill(); outline(ctx, 1.5);
          ctx.fillStyle = '#9e9e9e';
          for (let x = -72; x <= 72; x += 24) { ctx.beginPath(); ctx.arc(x, 0, 5, 0, 7); ctx.fill(); }
          ctx.save(); rr(ctx, -82, -9, 164, 4, 2); ctx.clip();
          ctx.fillStyle = '#ffca28';
          for (let x = -100 + (ph % 20); x < 100; x += 20) ctx.fillRect(x, -9, 8, 4);
          ctx.restore();
          ctx.fillStyle = '#ffca28'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(dir > 0 ? '▶' : '◀', 0, 3);
        });
      },
    },
    pin: {
      name: 'סיכה', box: [16, 36], rotate: true, flip: false,
      build(d) {
        const b = Bodies.rectangle(d.x, d.y, 8, 34, { isStatic: true });
        Body.setAngle(b, d.angle || 0);
        return { main: b, bodies: [b], sharp: true };
      },
      draw(ctx, d) {
        withPose(ctx, { x: d.x, y: d.y, angle: d.angle || 0 }, () => {
          ctx.strokeStyle = '#9aa3ad'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(0, 6); ctx.stroke();
          ctx.fillStyle = '#e53935'; rr(ctx, -7, 6, 14, 6, 2); ctx.fill(); outline(ctx, 1);
          ctx.beginPath(); ctx.arc(0, 15, 6, 0, 7); ctx.fill(); outline(ctx, 1);
        });
      },
    },
    bucket: {
      name: 'דלי', box: [80, 66], rotate: false, flip: false,
      build(d) {
        const o = { isStatic: true, friction: 0.4, restitution: 0.1 };
        const parts = [
          Bodies.rectangle(d.x - 36, d.y, 8, 60, o),
          Bodies.rectangle(d.x + 36, d.y, 8, 60, o),
          Bodies.rectangle(d.x, d.y + 28, 80, 8, o),
        ];
        return { main: null, bodies: parts };
      },
      zone(d) { return { x: d.x - 32, y: d.y - 22, w: 64, h: 48 }; },
      draw(ctx, d) {
        withPose(ctx, { x: d.x, y: d.y, angle: 0 }, () => {
          const g = ctx.createLinearGradient(-40, 0, 40, 0);
          g.addColorStop(0, '#8e9eab'); g.addColorStop(0.45, '#eef2f3'); g.addColorStop(1, '#7b8a97');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(-40, -30); ctx.lineTo(40, -30); ctx.lineTo(36, 32); ctx.lineTo(-36, 32); ctx.closePath();
          ctx.fill(); outline(ctx, 2);
          ctx.fillStyle = 'rgba(40,50,60,.55)';
          ctx.beginPath(); ctx.ellipse(0, -30, 40, 6, 0, 0, 7); ctx.fill(); outline(ctx, 1.5);
          ctx.strokeStyle = '#5d6d7e'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, -26, 42, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
          ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1;
          [0, 14].forEach((y) => { ctx.beginPath(); ctx.moveTo(-38, y); ctx.lineTo(38, y); ctx.stroke(); });
        });
      },
      // ציור קדמי – שפת הדלי מעל הכדור
      drawFront(ctx, d) {
        ctx.save(); ctx.translate(d.x, d.y);
        ctx.strokeStyle = 'rgba(30,20,10,.75)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, -30, 40, 6, 0, 0, Math.PI); ctx.stroke();
        ctx.restore();
      },
    },

    // ---------------- חלקים נעים ----------------
    domino: {
      name: 'דומינו', box: [12, 54], rotate: true, flip: false,
      build(d) {
        return dyn(d, Bodies.rectangle(d.x, d.y, 10, 52, { density: 0.003, friction: 0.6, restitution: 0.05 }));
      },
      draw(ctx, d, rt) {
        withPose(ctx, pose(d, rt), () => {
          ctx.fillStyle = '#fffaf0'; rr(ctx, -5, -26, 10, 52, 2); ctx.fill(); outline(ctx, 1.5);
          ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.stroke();
          ctx.fillStyle = '#222';
          [-16, -8, 8, 16].forEach((y) => { ctx.beginPath(); ctx.arc(0, y, 1.8, 0, 7); ctx.fill(); });
        });
      },
    },
    crate: {
      name: 'ארגז', box: [40, 40], rotate: true, flip: false,
      build(d) {
        return dyn(d, Bodies.rectangle(d.x, d.y, 40, 40, { density: 0.002, friction: 0.5, restitution: 0.05 }));
      },
      draw(ctx, d, rt) {
        withPose(ctx, pose(d, rt), () => {
          ctx.fillStyle = '#c68642'; ctx.fillRect(-20, -20, 40, 40);
          ctx.strokeStyle = '#7a4a1c'; ctx.lineWidth = 4; ctx.strokeRect(-18, -18, 36, 36);
          ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-17, -17); ctx.lineTo(17, 17); ctx.stroke();
          ctx.beginPath(); ctx.rect(-20, -20, 40, 40); outline(ctx, 1.5);
        });
      },
    },
    seesaw: {
      name: 'נדנדה', box: [180, 50], boxOffsetY: 12, rotate: false, flip: true,
      build(d, M) {
        const group = Body.nextGroup(true);
        const plank = Bodies.rectangle(d.x, d.y, 180, 10, { density: 0.002, friction: 0.6, collisionFilter: { group } });
        Body.setAngle(plank, (d.flip ? -1 : 1) * 14 * DEG);
        const base = Bodies.polygon(d.x, d.y + 20, 3, 20, { isStatic: true, collisionFilter: { group } });
        Body.setAngle(base, -Math.PI / 2);
        Body.setPosition(base, { x: d.x, y: d.y + 22 });
        const c = M.Constraint.create({ pointA: { x: d.x, y: d.y }, bodyB: plank, pointB: { x: 0, y: 0 }, length: 0, stiffness: 1 });
        return { main: plank, bodies: [plank, base], constraints: [c] };
      },
      draw(ctx, d, rt) {
        ctx.save(); ctx.translate(d.x, d.y);
        ctx.fillStyle = '#7d3c98';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, 32); ctx.lineTo(-18, 32); ctx.closePath(); ctx.fill(); outline(ctx, 1.5);
        ctx.restore();
        const a = rt ? rt.main.angle : (d.flip ? -1 : 1) * 14 * DEG;
        withPose(ctx, { x: d.x, y: d.y, angle: a }, () => {
          ctx.fillStyle = '#e67e22'; rr(ctx, -90, -5, 180, 10, 4); ctx.fill(); outline(ctx, 1.5);
          ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill();
        });
      },
    },
  };

  // סדר הצגה במגש
  const ORDER = ['ramp', 'brick', 'trampoline', 'fan', 'conveyor', 'seesaw', 'pin', 'domino', 'crate', 'bowling', 'basketball', 'beachball', 'balloon', 'bucket'];

  // בדיקת פגיעה בחלק (במצב עריכה)
  function hitTest(d, x, y) {
    const def = PARTS[d.type];
    const [w, h] = def.size ? def.size(d) : def.box;
    const oy = def.boxOffsetY || 0;
    const a = -(d.angle || 0);
    const dx = x - d.x, dy = y - d.y;
    const lx = dx * Math.cos(a) - dy * Math.sin(a);
    const ly = dx * Math.sin(a) + dy * Math.cos(a) - oy;
    const pad = 6;
    return Math.abs(lx) <= w / 2 + pad && Math.abs(ly) <= h / 2 + pad;
  }

  return { PARTS, ORDER, hitTest, DEG, rr };
});
