// Shared by the Kupomon tools: which tiles of a map a player can stand on and reach from its entries (the game's own
// collision, one-way ledge hops, launch pads, every state of the map's levers), and which are taken (exits, NPCs,
// objects, triggers, items, chests, entries). From tools/kp_learncheck.js.
//   const reach = require('./kp_reach')(FF7); reach(mapId) -> { P, busy: Map, got: Set }
module.exports = function (FF7) {
const R = FF7.runner, F = FF7.field, key = (x, y) => x + ',' + y, D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const reach = (id) => {
    const sc = new F.FieldScene(); FF7.fieldScene = sc; sc.load(id, null, { skipEnter: true });
    const P = sc.P, m = sc.map, busy = new Map();
    const mark = (at, what) => { const [x0, y0, w = 1, h = 1] = at; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) busy.set(key(x, y), what); };
    (m.exits || []).forEach(e => mark(e.at, 'an exit')); (m.npcs || []).forEach(n => n.at && mark(n.at, 'an NPC (' + n.id + ')'));
    (m.objects || []).forEach(o => o.at && mark(o.at, 'an object')); (m.triggers || []).forEach(t => t.at && !/^kph_chip_/.test(t.kpHidden || '') && mark(t.at, 'a trigger'));   // (a hidden chip's own trigger aside)
    (m.items || []).forEach(t => t.at && !/^kpi_chip_/.test(t.id || '') && mark(t.at, 'an item')); (m.chests || []).forEach(t => t.at && mark(t.at, 'a chest'));
    Object.values(m.entries || {}).forEach(e => mark([e[0], e[1]], 'an entry'));
    const solid = new Set([...(m.npcs || []).filter(n => n.at && n.solid !== false).map(n => key(n.at[0], n.at[1])), ...(m.objects || []).filter(o => o.at && o.solid !== false).map(o => key(o.at[0], o.at[1]))]);
    const trig = new Map();
    (m.triggers || []).forEach(t => {
      if (t.kpJump) trig.set(key(t.at[0], t.at[1]), { to: t.kpJump });
      if (t.ledgeTrig) {
        const [x0, y0, w, h] = [t.at[0], t.at[1], t.at[2] || 1, t.at[3] || 1], meta = t.ledge || ((t._ledge || t.kpLedge) && { dir: (t._ledge || t.kpLedge)[0], drop: (t._ledge || t.kpLedge)[1] }) || {};
        const s = String(t.if), dir = meta.dir || (/'left'/.test(s) ? 'left' : /'right'/.test(s) ? 'right' : 'down'), drop = meta.drop || 2, d = { down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
        for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) trig.set(key(x, y), { dir: d, to: [x + d[0] * drop, y + d[1] * drop] });
      }
    });
    const exits = new Set(); (m.exits || []).forEach(e => { for (let y = e.at[1]; y < e.at[1] + (e.at[3] || 1); y++) for (let x = e.at[0]; x < e.at[0] + (e.at[2] || 1); x++) exits.add(key(x, y)); });
    const levers = sc.objects.filter(o => o.toggleFlag && !o.toggleOnce), fl = FF7.state.flags;
    const setMask = (mk) => { levers.forEach((o, i) => { fl[o.toggleFlag] = !!(mk & (1 << i)); }); sc.objects.forEach(o => { if (o.tick) o.tick(o); }); };
    const mask0 = levers.reduce((mk, o, i) => mk | (fl[o.toggleFlag] ? 1 << i : 0), 0);
    const seen = new Set(), got = new Set(), q = [];
    Object.values(m.entries || {}).forEach(e => { const s = mask0 + '|' + key(e[0], e[1]); if (!seen.has(s)) { seen.add(s); q.push([mask0, e[0], e[1]]); } });
    let cur = -1;
    while (q.length) {
      const [mk, x, y] = q.shift(), k = key(x, y); got.add(k);
      if (exits.has(k)) continue;
      if (mk !== cur) { setMask(mk); cur = mk; }
      const nx = [], t = trig.get(k);
      if (t && !t.dir) nx.push([mk, t.to[0], t.to[1]]);
      else for (const [dx, dy] of D4) {
        const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= P.w || b >= P.h || !P.walkable(a, b) || solid.has(key(a, b))) continue;
        const tn = trig.get(key(a, b));
        if (tn && tn.dir && tn.dir[0] === dx && tn.dir[1] === dy) { nx.push([mk, tn.to[0], tn.to[1]]); continue; }
        if (R.edgeOK(sc, x, y, a, b)) nx.push([mk, a, b]);
      }
      levers.forEach((o, i) => { if (Math.abs(o.at[0] - x) + Math.abs(o.at[1] - y) === 1) nx.push([mk ^ (1 << i), x, y]); });
      for (const s of nx) { const kk = s[0] + '|' + key(s[1], s[2]); if (!seen.has(kk)) { seen.add(kk); q.push(s); } }
    }
    setMask(mask0);
    return { P, busy, got };
  };
  return reach;
};
