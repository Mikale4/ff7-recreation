// Kupomon model gallery (a dev helper for reviewing moogle models in a browser tab, never shipped in the game).
// Load it in a side tab of the running game (the console, or a script tag), wait for "ready", then:
//   KPG.show(['goldkweh_gold_chocobo', 'hellkupo_hell_knight@-0.7'], 2, { dist: 2.4, ty: 0.5 })
// Each id may carry an orbit (radians round the model, from the front) after an @. Options: dist, ty (the height
// looked at), tx/tz (the point looked at), up (camera lift), yaw (the model's turn), side (the crop in screen px).
// The tab's saves are stubbed first so a review never writes over the player's files.
(async function () {
  await new Promise(r => { const t = setInterval(() => { if (window.FF7 && FF7.save && FF7.stepFrame && FF7.kupomon && FF7.kupomon.SPECIES && Object.keys(FF7.kupomon.SPECIES).length > 900 && FF7.sceneMgr.top()) { clearInterval(t); r(); } }, 200); });
  const keep = /^(list|read|demoSlot|demoSummary|autoSummary|lastSlot|hasAny|SLOTS|migrate)$/;
  for (const k of Object.keys(FF7.save)) if (typeof FF7.save[k] === 'function' && !keep.test(k)) FF7.save[k] = () => true;
  const KP = FF7.kupomon, R = FF7.render, MG = FF7.minigames, GL = FF7.GL, W = FF7.W, H = FF7.H;
  KP.save = () => true; KP.saveDemo = () => true;
  const cache = new Map();
  const shoot = (id, o = {}) => {
    const m = KP.moogleModel(id); if (m.anims && m.anims.idle && m.play) m.play(m.anims.idle); if (m.update) m.update(1);
    const cam = new MG.Cam(), d = o.dist || 4.4, ty = o.ty != null ? o.ty : 0.55, tx = o.tx || 0, tz = o.tz || 0, orb = o.orbit || 0;
    cam.set([tx + Math.sin(orb) * d, ty - 0.3 + d * 0.12 + (o.up || 0), tz + Math.cos(orb) * d], [tx, ty, tz], o.fov || 30, 0.05, 40);
    GL.begin({ clear: [0.1, 0.12, 0.3, 1], light: { dir: [-0.35, -0.7, -0.6], color: [0.95, 0.93, 0.9], ambient: [0.55, 0.55, 0.62] } });
    cam.apply(); MG.drawModel(m, [0, 0, 0], o.yaw != null ? o.yaw : 0.45, 0, 0);
    const k = GL.canvas.width / W, side = o.side || 300, c = document.createElement('canvas'); c.width = c.height = 220;
    c.getContext('2d').drawImage(GL.canvas, (W - side) / 2 * k, (H - side) / 2 * k, side * k, side * k, 0, 0, 220, 220);
    return c;
  };
  const shot = (spec, o) => {
    const key = spec + JSON.stringify(o); if (cache.has(key)) return cache.get(key);
    const [id, orb] = spec.split('@'), c = shoot(id, Object.assign({}, o, orb != null ? { orbit: +orb } : {}));
    cache.set(key, c); return c;
  };
  const G = { ids: [], o: {}, cols: 4 };
  FF7.sceneMgr.addWidget({ persistent: true, aboveFade: true, render() {
    if (!G.ids.length) return;
    const c = R.ctx, rows = Math.ceil(G.ids.length / G.cols), s = Math.min(W / G.cols, H / rows);
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    G.ids.forEach((id, i) => {
      const x = (i % G.cols) * s, y = Math.floor(i / G.cols) * s;
      try { c.drawImage(shot(id, G.o), x, y, s, s); } catch (e) { }
      c.fillStyle = '#fff'; c.font = '10px sans-serif'; c.fillText(id, x + 3, y + 11);
    });
  } });
  const look = (id) => { const S = KP.SPECIES[id] || {}; return Object.assign({}, (KP.JOBS[S.job] || {}).look, S.look || {}); };
  window.KPG = {
    show(ids, cols, o) { G.ids = ids; G.cols = cols || 4; G.o = o || {}; FF7.stepFrame(); FF7.stepFrame(); return ids.length; },
    clear() { cache.clear(); },
    look,
    where: (test) => Object.keys(KP.SPECIES).filter(id => test(look(id), id)),
    byWeapon: (w) => Object.keys(KP.SPECIES).filter(id => look(id).weapon === w),
  };
  console.log('KPG ready');
})();
