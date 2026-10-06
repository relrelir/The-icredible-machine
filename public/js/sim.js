/* מכונת הפלאים – מנוע הסימולציה */
(function (root, factory) {
  const M = root.Matter || (typeof require !== 'undefined' ? require('matter-js') : null);
  const P = root.WMParts || (typeof require !== 'undefined' ? require('./parts.js') : null);
  const api = factory(M, P);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WMSim = api;
})(typeof self !== 'undefined' ? self : this, function (Matter, WMParts) {
  'use strict';
  const { Engine, Composite, Bodies, Body, Events } = Matter;
  const { PARTS } = WMParts;
  const W = 1000, H = 620;
  const SUBSTEPS = 3;
  const DT = 1000 / 60 / SUBSTEPS;

  // מחזיר את אזור המטרה (מלבן) עבור יעד
  function goalZone(goal, descs) {
    if (goal.zone) return goal.zone;
    if (goal.bucket) {
      const b = descs.find((d) => d.tag === goal.bucket);
      if (b) return PARTS.bucket.zone(b);
    }
    return null;
  }

  function createSim(descs, goals, hooks) {
    hooks = hooks || {};
    const engine = Engine.create({ positionIterations: 10, velocityIterations: 8 });
    engine.gravity.y = 1;
    const world = engine.world;

    // גבולות הלוח
    const wallOpts = { isStatic: true, friction: 0.6, restitution: 0.2 };
    Composite.add(world, [
      Bodies.rectangle(W / 2, H + 30, W + 200, 60, wallOpts),
      Bodies.rectangle(-30, H / 2, 60, H * 3, wallOpts),
      Bodies.rectangle(W + 30, H / 2, 60, H * 3, wallOpts),
      Bodies.rectangle(W / 2, -30, W + 200, 60, wallOpts),
    ]);

    const parts = descs.map((d) => {
      const rt = PARTS[d.type].build(d, Matter);
      rt.desc = d;
      rt.bodies.forEach((b) => { b.plugin = b.plugin || {}; b.plugin.rt = rt; });
      Composite.add(world, rt.bodies);
      if (rt.constraints) Composite.add(world, rt.constraints);
      return rt;
    });

    const pending = { pops: new Set(), bounces: new Map() };
    const rtOf = (b) => (b.parent && b.parent.plugin && b.parent.plugin.rt) || (b.plugin && b.plugin.rt);

    Events.on(engine, 'collisionStart', (ev) => {
      ev.pairs.forEach((pair) => {
        const A = rtOf(pair.bodyA), B = rtOf(pair.bodyB);
        [[A, B, pair.bodyB], [B, A, pair.bodyA]].forEach(([x, y, yb]) => {
          if (!x || !y) return;
          if (x.sharp && y.buoyant && !y.popped) pending.pops.add(y);
          if (x.bouncy && !yb.isStatic) {
            const v = Body.getVelocity(yb.parent);
            if (yb.parent.position.y < x.main.position.y - 4) {
              const prev = pending.bounces.get(yb.parent) || 0;
              pending.bounces.set(yb.parent, Math.max(prev, Math.abs(v.y)));
              x.squash = 1;
            }
          }
        });
      });
    });

    Events.on(engine, 'afterUpdate', () => {
      // פיצוץ בלונים
      pending.pops.forEach((rt) => {
        rt.popped = true;
        Composite.remove(world, rt.bodies);
        hooks.onPop && hooks.onPop(rt);
      });
      pending.pops.clear();
      // קפיצה מטרמפולינה
      pending.bounces.forEach((speed, body) => {
        const v = Body.getVelocity(body);
        Body.setVelocity(body, { x: v.x, y: -Math.min(Math.max(speed * 0.98, 9), 22) });
        hooks.onBounce && hooks.onBounce(body);
      });
      pending.bounces.clear();
      // מסועים
      engine.pairs.list.forEach((pair) => {
        if (!pair.isActive) return;
        const A = rtOf(pair.bodyA), B = rtOf(pair.bodyB);
        [[A, pair.bodyB], [B, pair.bodyA]].forEach(([x, yb]) => {
          if (!x || !x.conveyor || yb.isStatic) return;
          const body = yb.parent;
          const v = Body.getVelocity(body);
          const target = x.conveyor * 4.5;
          Body.setVelocity(body, { x: v.x + (target - v.x) * 0.15, y: v.y });
        });
      });
    });

    function applyForces() {
      const g = engine.gravity.y * engine.gravity.scale;
      parts.forEach((rt) => {
        if (rt.buoyant && !rt.popped) {
          Body.applyForce(rt.main, rt.main.position, { x: 0, y: -rt.main.mass * g * 1.9 });
        }
        if (rt.fan) {
          const d = rt.desc;
          const dir = d.flip ? -1 : 1;
          const a = d.angle || 0;
          const ax = Math.cos(a) * dir, ay = Math.sin(a) * dir; // כיוון הנשיפה
          const nx = -Math.sin(a), ny = Math.cos(a);
          const reach = PARTS.fan.reach;
          parts.forEach((o) => {
            if (o === rt || !o.main || o.main.isStatic || o.popped) return;
            const dx = o.main.position.x - d.x, dy = o.main.position.y - d.y;
            const along = dx * ax + dy * ay;
            const side = Math.abs(dx * nx + dy * ny);
            if (along < 15 || along > reach || side > 42) return;
            const f = 0.0005 * (1 - (along / reach) * 0.6);
            Body.applyForce(o.main, o.main.position, { x: ax * f, y: ay * f });
          });
        }
      });
    }

    let steps = 0;
    let okSteps = 0;
    let won = false;

    const latched = new Set(); // יעדי "נגיעה" שכבר הושגו
    function checkGoals() {
      if (!goals || !goals.length) return false;
      return goals.every((g) => {
        if (latched.has(g)) return true;
        const targets = parts.filter((p) => p.desc.tag === g.tag);
        if (g.type === 'pop') return targets.length > 0 && targets.every((p) => p.popped);
        const z = goalZone(g, descs);
        const inside = targets.some((p) => {
          if (!p.main || p.popped) return false;
          const { x, y } = p.main.position;
          return x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;
        });
        if (inside && g.touch) latched.add(g);
        return inside;
      });
    }

    function step() {
      for (let i = 0; i < SUBSTEPS; i++) {
        applyForces();
        Engine.update(engine, DT);
      }
      parts.forEach((rt) => {
        if (rt.fan) rt.spin += 0.6;
        if (rt.conveyor) rt.phase += rt.conveyor * 1.5;
      });
      steps++;
      if (!won) {
        okSteps = checkGoals() ? okSteps + 1 : 0;
        if (okSteps >= 20) won = true;
      }
      return won;
    }

    return { engine, parts, step, latched, get won() { return won; }, get steps() { return steps; } };
  }

  return { createSim, goalZone, W, H };
});
