// Kupomon map traps: tiles a player can reach (from an entry, walking, hopping one-way ledges, flying launch pads)
// but can't get back to any exit from: a softlock; and items (lying or hidden) no walk can reach. Uses the game's own
// collision (the runner's edge test).
//   node tools/kp_traps.js [map-id-substring] [--flags a,b] [--npcs]
// --npcs: the people standing on the map count as solid (every trainer beaten, as after a visit; wanderers aside), and
// what only they cut off is listed: an item or an exit a beaten trainer stands in front of
const { boot } = require('./sim_prelude');
const { FF7 } = boot(); const F = FF7.field, R = FF7.runner;
const argv = process.argv.slice(2), only = argv.find(a => !a.startsWith('--'));
const fi = argv.indexOf('--flags'); if (fi >= 0) argv[fi + 1].split(',').forEach(f => { FF7.state.flags[f] = true; });
const KP = FF7.kupomon, NPCS = argv.includes('--npcs');
FF7.state = KP.newState(FF7.state); FF7.state.kp.party.push(KP.make(KP.STARTERS[0], 5));
if (fi >= 0) argv[fi + 1].split(',').forEach(f => { FF7.state.flags[f] = true; });   // (again: the new state's own flags)
if (NPCS) for (const id of Object.keys(KP.TRAINER_DEFS || {})) FF7.state.flags['kp_tr_' + id] = true;   // (every trainer beaten)
KP.placeChips();   // (the Skill Chips lying on maps)
const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
let bad = 0, badItems = 0;
for (const id of Object.keys(FF7.maps).filter(k => k.startsWith('kp_') && (!only || k.includes(only)))) {
  const sc = new F.FieldScene(); FF7.fieldScene = sc;
  try { sc.load(id, null, { skipEnter: true }); } catch (e) { console.log(id, 'load failed', e.message); continue; }
  const P = sc.P, W = P.w, H = P.h, key = (x, y) => x + ',' + y;
  const trig = new Map();   // tile -> one-way move: { dir, to: [x, y] } (ledges) or { to } (pads)
  (sc.map.triggers || []).forEach(t => {
    if (t.kpJump) trig.set(key(t.at[0], t.at[1]), { to: t.kpJump });
    if (t.ledgeTrig) {
      const [x0, y0, w, h] = [t.at[0], t.at[1], t.at[2] || 1, t.at[3] || 1], meta = t.ledge || ((t._ledge || t.kpLedge) && { dir: (t._ledge || t.kpLedge)[0], drop: (t._ledge || t.kpLedge)[1] }) || {};
      const src = String(t.if), dir = meta.dir || (/'left'/.test(src) ? 'left' : /'right'/.test(src) ? 'right' : 'down'), drop = meta.drop || 2;   // (W.ledge's own default)
      const d = { down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) trig.set(key(x, y), { dir: d, to: [x + d[0] * drop, y + d[1] * drop] }); }
  });
  // (--npcs: the tiles people stand on, the ones who stay put; who stands where, for the report)
  const solid = new Map();
  if (NPCS) for (const [aid, a] of Object.entries(sc.actors || {})) if (a && a.visible && a !== sc.player && !(a.def && a.def.wander > 0)) solid.set(key(a.tx, a.ty), aid);
  const exits = new Set(); (sc.map.exits || []).forEach(e => { for (let y = e.at[1]; y < e.at[1] + (e.at[3] || 1); y++) for (let x = e.at[0]; x < e.at[0] + (e.at[2] || 1); x++) exits.add(key(x, y)); });
  // the moves out of a tile
  const out = (x, y) => {
    const t = trig.get(key(x, y)), res = [];
    if (t && !t.dir) return [t.to];   // a pad throws you, full stop
    for (const [dx, dy] of D8) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || !P.walkable(nx, ny)) continue;
      const tn = trig.get(key(nx, ny));
      if (tn && tn.dir && tn.dir[0] === dx && tn.dir[1] === dy) { res.push(tn.to); continue; }   // over the ledge's lip
      if (solid.has(key(nx, ny))) continue;   // (--npcs: someone stands there)
      if (R.edgeOK(sc, x, y, nx, ny)) res.push([nx, ny]);
    }
    return res;
  };
  // a hop or a flight that lands in something solid is a trap by itself
  for (const [k, t] of trig) if (!P.walkable(t.to[0], t.to[1])) console.log(id + ': ' + (t.dir ? 'the ledge at ' : 'the pad at ') + k + ' lands in a solid tile ' + t.to.join(','));
  // the map's levers (KP.W.toggle, not one-shot): every state of them is explored, a lever flipped from beside it
  // (one bit per flag: several levers or valves may share one, as the Bloom dojo's valves do)
  const levers = sc.objects.filter(o => o.toggleFlag && !o.toggleOnce), flags = Array.from(new Set(levers.map(o => o.toggleFlag)));
  const fl = FF7.state.flags, setMask = (m) => { flags.forEach((f, i) => { fl[f] = !!(m & (1 << i)); }); sc.objects.forEach(o => { if (o.tick) o.tick(o); }); };
  const mask0 = flags.reduce((m, f, i) => m | (fl[f] ? 1 << i : 0), 0);
  const nearLever = (x, y) => Array.from(new Set(levers.filter(o => Math.abs(o.at[0] - x) + Math.abs(o.at[1] - y) === 1).map(o => flags.indexOf(o.toggleFlag))));
  const S = (m, k) => m + '|' + k;
  const starts = Object.values(sc.map.entries || {}).map(e => [e[0], e[1]]);
  const seen = new Set(), q = [], edges = new Map();
  starts.forEach(([x, y]) => { const s0 = S(mask0, key(x, y)); seen.add(s0); q.push([mask0, x, y]); });
  let cur = -1;
  while (q.length) {
    const [m, x, y] = q.shift(), k = key(x, y), sk = S(m, k);
    if (exits.has(k)) continue;   // (stepping on an exit leaves)
    if (m !== cur) { setMask(m); cur = m; }
    const o = out(x, y).map(([a, b]) => [m, a, b]).concat(nearLever(x, y).map(i => [m ^ (1 << i), x, y]));
    edges.set(sk, o.map(([mm, a, b]) => S(mm, key(a, b))));
    for (const st of o) { const kk = S(st[0], key(st[1], st[2])); if (!seen.has(kk)) { seen.add(kk); q.push(st); } }
  }
  setMask(mask0);
  // which reached states can get to an exit
  const ok = new Set([...seen].filter(sk => exits.has(sk.split('|')[1])));
  for (let changed = true; changed;) { changed = false; for (const [k, o] of edges) if (!ok.has(k) && o.some(v => ok.has(v))) { ok.add(k); changed = true; } }
  const traps = [...seen].filter(k => !ok.has(k));
  if (traps.length) { bad++; console.log(id + ': ' + traps.length + ' trap state(s)' + (flags.length ? ' (levers ' + flags.join(',') + ')' : '') + ': ' + traps.slice(0, 12).join(' ') + (traps.length > 12 ? ' ...' : '')); }
  // every item lying on the map and every hidden one: reachable (stood on or beside, from an entry, in some lever state)
  const reached = new Set([...seen].map(sk => sk.split('|')[1]));
  const near = (x, y) => [[0, 0]].concat(D8).some(([dx, dy]) => reached.has(key(x + dx, y + dy)));
  const things = (sc.map.items || []).filter(it => it.id).map(it => [it.id, it.at]).concat((sc.map.triggers || []).filter(t => t.kpHidden).map(t => [t.kpHidden, t.at]));
  // (and none under a solid person or thing: beside a reachable tile isn't enough when a statue stands on it, as Route
  // 14's Mime Greasepaint did, under Red XIII's)
  const onTop = new Map([...(sc.map.npcs || []).filter(n => n.at && n.solid !== false).map(n => [key(n.at[0], n.at[1]), 'NPC ' + n.id]),
    ...(sc.map.objects || []).filter(o => o.at && o.solid !== false && !o.hidden).map(o => [key(o.at[0], o.at[1]), 'object ' + (o.id || '?')])]);
  things.forEach(([n, at]) => { const u = onTop.get(key(at[0], at[1])); if (u) { badItems++; console.log(id + ': the item ' + n + ' at ' + at[0] + ',' + at[1] + ' lies under the ' + u); } });
  things.forEach(([n, at]) => { if (!near(at[0], at[1])) { badItems++; console.log(id + ': the item ' + n + ' at ' + at[0] + ',' + at[1] + ' can never be reached' + (NPCS ? ' (people in the way: ' + [...solid].filter(([k]) => { const [x, y] = k.split(',').map(Number); return Math.abs(x - at[0]) + Math.abs(y - at[1]) <= 12; }).map(([k, a]) => a + '@' + k).join(' ') + ')' : '')); } });
  if (NPCS) { const cut = [...exits].filter(k => !reached.has(k) && ![...exits].some(k2 => k2 !== k && false)); const ex = (sc.map.exits || []).filter(e => { for (let y = e.at[1]; y < e.at[1] + (e.at[3] || 1); y++) for (let x = e.at[0]; x < e.at[0] + (e.at[2] || 1); x++) if (reached.has(key(x, y)) || [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => reached.has(key(x + dx, y + dy)))) return false; return true; });
    ex.forEach(e => { badItems++; console.log(id + ': the exit at ' + e.at.join(',') + ' to ' + e.to + ' can never be reached (people in the way)'); }); }
}
console.log(bad ? bad + ' map(s) with traps' : 'no traps');
console.log(badItems ? badItems + ' item(s) out of reach' : 'every item reachable');
