// Kupomon learning data check (docs/KUPOMON_WORLD.md "Learnsets", "Skill Chips", "Abilities"): the level-up learnsets
// (js/kupomon/kp_learnsets.js), the Skill Chips and where they lie (kp_chips.js) and the abilities (kp_abilities.js).
//   node tools/kp_learncheck.js [-v]        exit code 1 on any error; -v also lists the warnings in full
// Learnsets: a. every species has one, real moves, levels 1..30; b. the last four by Lv 30 are exactly the species' four;
// c. at every level an attack with no cooldown; d. no two species' moves walled by immunities at Lv 5/10/../30 (abilities
// included); e. an evolved species keeps its earlier job's entries up to the evolution level, adds its own from there,
// at most one at the evolution level (two when that's the level cap); f. (warnings) the pacing; g. the new moves.
// Chips: 40-60, real moves, prices, types; each placed once: a Mog Center's Mart, or a free, reachable tile.
// Abilities: 40-60, only the engine's effect keys, every species 1-2 that exist.
const fs = require('fs'), path = require('path');
const { boot, ROOT } = require('./sim_prelude');
const { FF7 } = boot();
const KP = FF7.kupomon, SP = KP.SPECIES, MV = KP.MOVES, MAX = KP.MAX_LEVEL || 30;
const verbose = process.argv.includes('-v');
const errs = [], warns = [];
const err = (s) => errs.push(s), warn = (s) => warns.push(s);
const TYPES = new Set(KP.TYPES), STATUSES = new Set(Object.keys(KP.STATUS));
const pre = {};
for (const id in SP) if (SP[id].evo) pre[SP[id].evo.to] = id;
const movesAt = KP.movesAt || ((sp, lv) => { const o = []; for (const [l, m] of KP.LEARN[sp] || []) { if (l > lv) break; const i = o.indexOf(m); if (i >= 0) o.splice(i, 1); o.push(m); } return o.slice(-4); });
const atk0 = (m) => MV[m] && MV[m].power > 0 && MV[m].cd === 0;

// ================================================================== abilities (first: the wall check uses them)
const ABIL_KEYS = new Set(['name', 'desc', 'boost', 'stab', 'immune', 'absorb', 'resist', 'noStatus', 'onEnter', 'regen', 'onHit', 'crit', 'noCrit', 'counterHit',
  'noMiss', 'guts', 'sturdy', 'coins', 'healMul', 'drainMul', 'firstStrike', 'statMul', 'statusChance', 'pinchSpd', 'expMul']);
// (the expansion's content packs have their own check, tools/kp_contentcheck.js: this one holds the original data to
// its rules)
const NEW = { moves: new Set(), abilities: new Set(), species: new Set() };
for (const r of Object.values(KP.CONTENT || {})) { r.moves.forEach(x => NEW.moves.add(x)); r.abilities.forEach(x => NEW.abilities.add(x)); r.species.forEach(x => NEW.species.add(x)); }
const OLD_DEX = KP.DEX.filter(id => !NEW.species.has(id));
const AB = Object.fromEntries(Object.entries(KP.ABILITIES || {}).filter(([k]) => !NEW.abilities.has(k))), SA = KP.SPECIES_ABIL || {};
const num = (v) => typeof v === 'number' && isFinite(v);
const nAb = Object.keys(AB).length;
if (nAb < 40 || nAb > 60) err(`abilities: ${nAb} (want 40-60)`);
for (const [id, a] of Object.entries(AB)) {
  const p = `ability ${id}`;
  if (typeof a.name !== 'string' || !a.name) err(`${p}: no name`);
  if (typeof a.desc !== 'string' || !a.desc) err(`${p}: no desc`); else if (a.desc.length > 60) err(`${p}: desc is ${a.desc.length} chars (max 60)`);
  for (const k of Object.keys(a)) if (!ABIL_KEYS.has(k)) err(`${p}: unknown effect key "${k}"`);
  if (Object.keys(a).filter(k => k !== 'name' && k !== 'desc').length === 0) err(`${p}: no effect`);
  if (a.boost) { const b = a.boost; if (!Array.isArray(b.types) || !b.types.length || b.types.some(t => t !== 'own' && !TYPES.has(t))) err(`${p}: boost.types`); if (!num(b.mul)) err(`${p}: boost.mul`); if (b.below != null && !num(b.below)) err(`${p}: boost.below`); }
  for (const k of ['stab', 'regen', 'crit', 'guts', 'coins', 'healMul', 'drainMul', 'statusChance', 'pinchSpd', 'expMul']) if (k in a && !num(a[k])) err(`${p}: ${k} must be a number`);
  for (const k of ['absorb', 'noCrit', 'noMiss', 'sturdy', 'firstStrike']) if (k in a && a[k] !== true) err(`${p}: ${k} must be true`);
  if (a.immune && (!Array.isArray(a.immune) || !a.immune.length || a.immune.some(t => !TYPES.has(t)))) err(`${p}: immune types`);
  if (a.absorb && !a.immune) err(`${p}: absorb without immune`);
  if (a.resist && (typeof a.resist !== 'object' || Object.entries(a.resist).some(([t, m]) => !TYPES.has(t) || !num(m)))) err(`${p}: resist`);
  if (a.noStatus && a.noStatus !== 'all' && (!Array.isArray(a.noStatus) || a.noStatus.some(s => !STATUSES.has(s)))) err(`${p}: noStatus`);
  if (a.onEnter) { const w = a.onEnter.foe || a.onEnter.self; if (!Array.isArray(w) || !['atk', 'def', 'spd', 'crit'].includes(w[0]) || !num(w[1]) || Object.keys(a.onEnter).length !== 1) err(`${p}: onEnter`); }
  if (a.onHit) { const h = a.onHit; if (h.status) { if (!Array.isArray(h.status) || !STATUSES.has(h.status[0]) || !num(h.status[1])) err(`${p}: onHit.status`); } else if (!num(h.recoil)) err(`${p}: onHit needs status or recoil`); }
  if (a.statMul && (typeof a.statMul !== 'object' || Object.entries(a.statMul).some(([k, m]) => !['atk', 'def', 'spd'].includes(k) || !num(m) || m < 1 || m > 1.3))) err(`${p}: statMul (atk/def/spd, 1-1.3)`);
}
const used = new Set();
for (const id of OLD_DEX) {
  const L = SA[id];
  if (!Array.isArray(L) || L.length < 1 || L.length > 2) { err(`${id}: ${L ? L.length : 0} abilities (want 1-2)`); continue; }
  for (const a of L) { if (!AB[a]) err(`${id}: unknown ability "${a}"`); used.add(a); }
  if (L.length === 2 && L[0] === L[1]) warn(`${id}: the same ability twice`);
  // an immunity that takes away every weakness it has
  const weak = KP.TYPES.filter(t => KP.effOn(t, { sp: id }) > 1);
  for (const a of L) if (AB[a] && AB[a].immune && weak.length && weak.every(t => AB[a].immune.includes(t))) err(`${id}: ${a} makes it immune to all its weaknesses (${weak.join(', ')})`);
}
for (const id in SA) if (!SP[id]) err(`SPECIES_ABIL: unknown species ${id}`);   // (any species)
for (const id in AB) if (!used.has(id)) warn(`ability ${id} isn't given to any species`);

// ================================================================== learnsets
const LEARN = KP.LEARN || {};
for (const id of OLD_DEX) {
  const L = LEARN[id], p = id;
  if (!Array.isArray(L) || !L.length) { err(`${p}: no learnset`); continue; }
  let last = 0, bad = false;
  for (const e of L) {
    if (!Array.isArray(e) || e.length !== 2) { err(`${p}: bad entry ${JSON.stringify(e)}`); bad = true; continue; }
    const [lv, m] = e;
    if (!Number.isInteger(lv) || lv < 1 || lv > MAX) { err(`${p}: level ${lv} out of 1..${MAX}`); bad = true; }
    if (!MV[m]) { err(`${p}: unknown move "${m}"`); bad = true; }
    if (lv < last) { err(`${p}: not sorted by level (${lv} after ${last})`); bad = true; }
    last = lv;
  }
  if (bad) continue;
  if (L[0][0] !== 1) err(`${p}: nothing at Lv 1`);
  // b. the last four by the cap are the species' own four
  const fin = movesAt(id, MAX), own4 = SP[id].moves;
  if (fin.length !== own4.length || own4.some(m => !fin.includes(m))) err(`${p}: Lv ${MAX} moves [${fin.join(', ')}] aren't its own [${own4.join(', ')}]`);
  // c. an attack with no cooldown at every level
  for (let lv = 1; lv <= MAX; lv++) {
    const w = movesAt(id, lv);
    if (!w.some(m => MV[m] && MV[m].power > 0)) { err(`${p}: no attack at Lv ${lv}`); break; }
    if (!w.some(atk0)) { err(`${p}: no attack without a cooldown at Lv ${lv} [${w.join(', ')}]`); break; }
  }
  // e. an evolved species: its earlier job's entries up to the evolution level, its own from there
  const pr = pre[id];
  if (pr && Array.isArray(LEARN[pr])) {
    const E = SP[pr].evo.at, rest = L.map(e => e[0] + ' ' + e[1]);
    for (const [l, m] of LEARN[pr]) {
      if (l > E) continue;
      const i = rest.indexOf(l + ' ' + m);
      if (i < 0) err(`${p}: lacks its earlier job's entry Lv ${l} ${m} (${pr})`); else rest.splice(i, 1);
    }
    const own = rest.map(s => s.split(' ')).map(([l, m]) => [+l, m]);
    const below = own.filter(([l]) => l < E);
    if (below.length) err(`${p}: own entries below its evolution level ${E}: ${below.map(e => e.join(' ')).join(', ')}`);
    const atE = own.filter(([l]) => l === E).length;
    if (atE > (E >= MAX ? 2 : 1)) err(`${p}: ${atE} own entries at its evolution level ${E} (one evolution move${E >= MAX ? ', two at the cap' : ''})`);
  }
  // f. pacing (warnings), for the last job of a line
  if (!SP[id].evo) {
    const lvs = [...new Set(L.map(e => e[0]))];
    if (L.length < 7 || L.length > 14) warn(`${p}: ${L.length} entries (want about 7-12)`);
    let gap = 0; for (let i = 1; i < lvs.length; i++) gap = Math.max(gap, lvs[i] - lvs[i - 1]);
    if (gap > 6) warn(`${p}: a gap of ${gap} levels between new moves`);
    if (lvs[lvs.length - 1] < (KP.LV ? KP.LV(24) : 24)) warn(`${p}: its last move comes at Lv ${lvs[lvs.length - 1]}`);
    const seen = new Set();
    for (const [l, m] of L) { if (!seen.has(m) && l <= (KP.LV ? KP.LV(8) : 8) && MV[m].power > 80) warn(`${p}: ${m} (power ${MV[m].power}) as early as Lv ${l}`); seen.add(m); }
  }
}
// d. walls: two species whose attacks are all of types the other can't be hurt by (type chart, or an ability's immune)
const immuneTo = (id, t) => KP.effOn(t, { sp: id }) === 0 || (SA[id] || []).some(a => AB[a] && AB[a].immune && AB[a].immune.includes(t));
for (const lv of [5, 10, 15, 20, 25, 30].map(l => KP.LV ? KP.LV(l) : l)) {   // (the old checkpoints, on the cap of 50)
  const atk = {};
  for (const id of OLD_DEX) atk[id] = [...new Set(movesAt(id, lv).filter(m => MV[m] && MV[m].power > 0).map(m => MV[m].type))];
  const ids = OLD_DEX;
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = ids[i], b = ids[j];
    if (!atk[a].length || !atk[b].length) continue;
    if (atk[a].every(t => immuneTo(b, t)) && atk[b].every(t => immuneTo(a, t))) err(`Lv ${lv}: ${a} [${atk[a]}] and ${b} [${atk[b]}] can't hurt each other`);
  }
}
// g. the new moves (kp_learnsets.js's own block)
const MOVE_KEYS = new Set(['name', 'type', 'power', 'acc', 'cd', 'desc', 'status', 'stat', 'heal', 'cures', 'drain', 'prio', 'crit']);
const src = fs.readFileSync(path.join(ROOT, 'js/kupomon/kp_learnsets.js'), 'utf8');
const blk = (src.match(/Object\.assign\(KP\.MOVES, \{([\s\S]*?)\n  \}\);/) || [])[1] || '';
const newIds = [...blk.matchAll(/^\s+(\w+): mv\(/gm)].map(m => m[1]);
if (newIds.length > 60) err(`${newIds.length} new moves (keep it under about 60)`);
for (const id of newIds) {
  const m = MV[id]; if (!m) { err(`new move ${id} missing`); continue; }
  if (!m.desc || m.desc.length > 44) err(`new move ${id}: desc ${m.desc ? m.desc.length + ' chars' : 'missing'} (max 44)`);
  if (!TYPES.has(m.type)) err(`new move ${id}: type ${m.type}`);
  if (!Object.values(LEARN).some(L => L.some(e => e[1] === id)) && !Object.values(KP.ITEMS).some(it => it.kind === 'chip' && it.move === id)) warn(`new move ${id} isn't learned or on a chip`);
}
for (const [id, m] of Object.entries(MV)) {
  if (NEW.moves.has(id)) continue;
  for (const k of Object.keys(m)) if (!MOVE_KEYS.has(k)) err(`move ${id}: unknown key ${k}`);
  if (m.status && !STATUSES.has(m.status[0])) err(`move ${id}: unknown status ${m.status[0]}`);
}

// ================================================================== Skill Chips
const chips = Object.entries(KP.ITEMS).filter(([, it]) => it.kind === 'chip');
if (chips.length < 40 || chips.length > 80) err(`Skill Chips: ${chips.length} (want 40-80: 1-59, and 60-71 the missing tools)`);
const chipMoves = {};
for (const [id, c] of chips) {
  const p = `chip ${id}`, n = (id.match(/^chip_(\d\d)$/) || [])[1];
  if (!n) err(`${p}: id should be chip_NN`);
  if (!MV[c.move]) { err(`${p}: unknown move ${c.move}`); continue; }
  if (c.name !== `Skill Chip ${n}: ${MV[c.move].name}`) err(`${p}: name "${c.name}" (want "Skill Chip ${n}: ${MV[c.move].name}")`);
  if (!Number.isInteger(c.price) || c.price < 1500 || c.price > 12000) err(`${p}: price ${c.price} (1500-12000)`);
  if (!Array.isArray(c.types) || c.types.some(t => !TYPES.has(t))) err(`${p}: types`);
  if (c.also && (!Array.isArray(c.also) || c.also.some(s => !SP[s]))) err(`${p}: also lists an unknown species`);
  if (!c.desc) err(`${p}: no desc`);
  if (chipMoves[c.move]) warn(`${p}: ${c.move} is also on ${chipMoves[c.move]}`); chipMoves[c.move] = id;
  const fits = KP.chipFits ? KP.DEX.filter(s => KP.chipFits({ sp: s }, id)).length : 0;
  if (fits < 5) warn(`${p}: only ${fits} species can learn it`);
  c._fits = fits;
}
// the places
const places = KP.CHIP_PLACES || [], placed = {};
const centers = new Set(Object.keys(FF7.maps).filter(k => /^kp_(.+_)?center$/.test(k)));
for (const pl of places) {
  if (!KP.ITEMS[pl.chip] || KP.ITEMS[pl.chip].kind !== 'chip') { err(`CHIP_PLACES: unknown chip ${pl.chip}`); continue; }
  placed[pl.chip] = (placed[pl.chip] || 0) + 1;
  if (pl.mart) { if (!centers.has(pl.mart)) err(`${pl.chip}: mart ${pl.mart} isn't a Mog Center`); if (pl.map) err(`${pl.chip}: both mart and map`); }
  else if (!pl.map || !FF7.maps[pl.map] || !Array.isArray(pl.at)) err(`${pl.chip}: needs a mart, or a map and a tile`);
}
for (const [id] of chips) if (placed[id] !== 1) err(`${id}: placed ${placed[id] || 0} times (want once)`);
// tiles: walkable, free, reachable from the map's entries (the game's own collision and one-way hops, as kp_traps.js)
FF7.state = KP.newState(FF7.state); FF7.state.kp.party.push(KP.make(KP.STARTERS[0], 5));
const R = FF7.runner, F = FF7.field, key = (x, y) => x + ',' + y, D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const tiles = {};
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
for (const pl of places.filter(p => p.map && FF7.maps[p.map] && Array.isArray(p.at))) {
  const [x, y] = pl.at, k = pl.map + ':' + key(x, y), p = `${pl.chip} on ${pl.map} [${x},${y}]`;
  if (tiles[k]) err(`${p}: shares its tile with ${tiles[k]}`); tiles[k] = pl.chip;
  let r; try { r = reach(pl.map); } catch (e) { err(`${p}: map didn't load (${e.message})`); continue; }
  if (x < 0 || y < 0 || x >= r.P.w || y >= r.P.h || !r.P.walkable(x, y)) err(`${p}: not a walkable tile`);
  else if (r.busy.has(key(x, y))) err(`${p}: on ${r.busy.get(key(x, y))}`);
  else if (!r.got.has(key(x, y))) err(`${p}: can't be reached from the map's entries`);
}

// ================================================================== report
const nNew = newIds.length, spN = KP.DEX.length;
console.log(`learnsets ${Object.keys(LEARN).length}/${spN} | new moves ${nNew} | Skill Chips ${chips.length} (marts ${places.filter(p => p.mart).length}, on maps ${places.filter(p => p.map).length}, hidden ${places.filter(p => p.hidden).length}) | abilities ${nAb}, used ${used.size}`);
if (warns.length) { console.log(`${warns.length} warning(s)` + (verbose ? ':' : ' (-v to list)')); if (verbose) warns.forEach(w => console.log('  warn: ' + w)); }
if (errs.length) { errs.slice(0, verbose ? 1e9 : 80).forEach(e => console.log("  ERROR: " + e)); if (!verbose && errs.length > 80) console.log(`  ... and ${errs.length - 80} more`); console.log(`${errs.length} error(s)`); process.exit(1); }
console.log('0 errors');
