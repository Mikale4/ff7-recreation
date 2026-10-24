// The World Championship's archetype opponents, checked (js/kupomon/content/kp_c96_wcteams.js, tools/kp_archetypes.js):
//  1. every team is legal: five kinds, no two alike (the species clause), no two items alike (the item clause), every
//     move one its kind can learn (its line's level-up moves to Lv 50, or a Skill Chip that fits), a real ability slot,
//     at least one attack;
//  2. every team carries its engine: a weather team its setter, a Time Warp team Time Warp, a screens team both
//     screens, a hazard team a hazard, a VoltTurn team its pivots...;
//  3. bouts between them, played out by the tournament AI (the 'max' tactics AI, team preview, +5, perfect IVs), and how
//     often each team actually runs its engine: sets its hazards, its weather / terrain / zone, its screens, pivots,
//     passes, phazes, boosts, Dooms, spreads status. No errors, every bout ends.
//   node tools/kp_archcheck.js [--bouts N] [--verbose]
const path = require('path');
process.chdir(path.join(__dirname, '..'));
const { boot } = require('./sim_prelude');
const { FF7 } = boot();
const KP = FF7.kupomon;
FF7.audio.sfx = () => {}; FF7.audio.push = () => {}; FF7.audio.pop = () => {}; FF7.audio.play = () => {};
if (FF7.fx) FF7.fx.clear = () => {};
FF7.state = KP.newState(FF7.state);
const argv = process.argv.slice(2), verbose = argv.includes('--verbose');
const BOUTS = argv.includes('--bouts') ? +argv[argv.indexOf('--bouts') + 1] : 120;
let pass = 0, fail = 0;
const check = (name, ok, why) => { if (ok) pass++; else { fail++; console.log('FAIL ' + name + (why ? ': ' + why : '')); } };
const A = KP.WC_ARCHETYPES || [];
check('archetype teams loaded', A.length >= 100, A.length + ' teams');

// ------------------------------------------------------------------ 1-2. legality and engines
const pre = {}; for (const k of Object.keys(KP.SPECIES)) { const e = KP.SPECIES[k].evo; if (e) pre[e.to] = k; }
const poolOf = (sp) => {
  const s = new Set();
  for (let q = sp; q; q = pre[q]) for (const [l, m] of (KP.LEARN && KP.LEARN[q]) || []) if (l <= KP.MAX_LEVEL && KP.MOVES[m]) s.add(m);
  ((KP.SPECIES[sp] || {}).moves || []).forEach(m => s.add(m));
  for (const id of Object.keys(KP.ITEMS)) { const it = KP.ITEMS[id]; if (it.kind === 'chip' && KP.MOVES[it.move] && KP.chipFits({ sp, moves: [] }, id)) s.add(it.move); }
  return s;
};
const MV = (id) => KP.MOVES[id] || {};
const anyMove = (t, f) => t.team.some(([, , o]) => o.moves.some(id => f(MV(id))));
const anyAbil = (t, f) => t.team.some(([sp, , o]) => { const a = KP.ABILITIES[(KP.SPECIES_ABIL[sp] || [])[o.abil]]; return a && f(a); });
const roles = (t) => t.team.map(([, , o]) => o.role);
const ENGINE = {
  hazard: { has: t => roles(t).some(r => /hazard|spiker|web_setter/.test(r)), carries: t => anyMove(t, mv => mv.hazard) },
  screen: { has: t => roles(t).includes('screen_setter'), carries: t => anyMove(t, mv => mv.side === 'wall') && anyMove(t, mv => mv.side === 'shell') },
  veil: { has: t => roles(t).includes('veil_setter'), carries: t => anyMove(t, mv => mv.side === 'veil') },
  weather: { has: t => roles(t).includes('weather_setter'), carries: t => anyMove(t, mv => mv.weather) || anyAbil(t, a => a.setWeather) },
  terrain: { has: t => roles(t).includes('terrain_setter'), carries: t => anyMove(t, mv => mv.terrain) || anyAbil(t, a => a.setTerrain) },
  room: { has: t => roles(t).includes('room_setter'), carries: t => anyMove(t, mv => mv.room) || anyAbil(t, a => a.setRoom) },
  pivot: { has: t => /volturn/.test(t.key), carries: t => t.team.filter(([, , o]) => o.moves.some(id => MV(id).selfSwitch === true)).length >= 2 },
  pass: { has: t => roles(t).includes('passer'), carries: t => anyMove(t, mv => mv.selfSwitch === 'pass') },
  phaze: { has: t => roles(t).includes('phazer'), carries: t => anyMove(t, mv => mv.forceSwitch) },
  doom: { has: t => roles(t).some(r => r === 'doom_trapper' || r === 'perish_trapper'), carries: t => anyMove(t, mv => (mv.status && [].concat(mv.status[0]).includes('doom')) || mv.perish) },   // (Doom, or Last Refrain: Perish Song)
  setup: { has: t => roles(t).some(r => /^setup_|sub_setup|passer/.test(r)), carries: t => anyMove(t, mv => !mv.power && ((mv.self && (mv.self.atk > 0 || mv.self.mag > 0 || mv.self.def > 0 || mv.self.res > 0 || mv.self.spd > 0)) || (mv.stat && mv.stat[2] === 'self'))) },
  status: { has: t => roles(t).some(r => /status_spreader|toxic_user|burn_user/.test(r)), carries: t => anyMove(t, mv => mv.status && !mv.power) },
};
for (const t of A) {
  const sps = t.team.map(([sp]) => sp), held = t.team.map(([, , o]) => o.held).filter(Boolean);
  check(`${t.name}: six kinds`, t.team.length === KP.PARTY_MAX && sps.every(sp => KP.SPECIES[sp]), sps.join(','));
  check(`${t.name}: species clause`, new Set(sps).size === sps.length, sps.join(','));
  check(`${t.name}: legend clause (one legendary or mythical at most)`, sps.filter(sp => KP.isLegend({ sp })).length <= 1, sps.join(','));
  check(`${t.name}: item clause`, new Set(held).size === held.length, held.join(','));
  for (const [sp, , o] of t.team) {
    const pool = poolOf(sp), bad = o.moves.filter(id => !KP.MOVES[id] || !pool.has(id));
    check(`${t.name}: ${sp}'s moves are its own`, !bad.length, bad.join(','));
    check(`${t.name}: ${sp} has an attack`, o.moves.some(id => MV(id).power > 0));
    check(`${t.name}: ${sp}'s ability slot`, o.abil != null && (KP.SPECIES_ABIL[sp] || [])[o.abil] && KP.ABILITIES[(KP.SPECIES_ABIL[sp] || [])[o.abil]], 'slot ' + o.abil);
    check(`${t.name}: ${sp}'s item and appetite`, (!o.held || (KP.ITEMS[o.held] && KP.ITEMS[o.held].kind === 'held')) && KP.APPETITES[o.app], o.held + ' ' + o.app);
  }
  for (const [k, E] of Object.entries(ENGINE)) if (E.has(t)) check(`${t.name}: carries its ${k} engine`, E.carries(t), t.key);
}
const keys = new Set(A.map(t => t.key)), names = new Set(A.map(t => t.name));
check('every archetype has a team', keys.size >= 80, keys.size + ' archetypes');
check('every trainer has a name of their own', names.size === A.length, names.size + ' of ' + A.length);

// ------------------------------------------------------------------ 3. bouts
const perfect = Object.fromEntries(KP.STATS.map(k => [k, 31]));
const monsOf = (t) => KP.W.team(t.team.map(([sp, lv, o]) => [sp, KP.MAX_LEVEL, Object.assign({}, o, { iv: perfect, plus: 5 })]), true);
const P = KP.Battle.prototype, hook = (name, fn) => { const f0 = P[name]; P[name] = function* (...a) { try { fn.apply(this, a); } catch (e) { } return yield* f0.apply(this, a); }; };
let rec = null;
const mark = (side, k) => { if (rec && side) (rec[side] = rec[side] || {})[k] = (rec[side][k] || 0) + 1; };
const sideOf = (B, src) => src ? (src.side || (B.me && src === B.me.mon ? 'me' : B.foe && src === B.foe.mon ? 'foe' : null)) : null;
hook('useMove', function (f, id) {
  const mv = MV(id), s = f && f.side;
  if (mv.hazard) mark(s, 'hazard'); if (mv.side === 'wall' || mv.side === 'shell') mark(s, 'screen'); if (mv.side === 'veil') mark(s, 'veil');
  if (mv.weather) mark(s, 'weather'); if (mv.terrain) mark(s, 'terrain'); if (mv.room) mark(s, 'room');
  if (mv.selfSwitch === true) mark(s, 'pivot'); if (mv.selfSwitch === 'pass') mark(s, 'pass'); if (mv.forceSwitch) mark(s, 'phaze');
  if (!mv.power && ((mv.self && Object.values(mv.self).some(v => v > 0)) || (mv.stat && mv.stat[2] === 'self'))) mark(s, 'setup');
  if (mv.status && !mv.power) { mark(s, 'status'); if ([].concat(mv.status[0]).includes('doom')) mark(s, 'doom'); }
  if (mv.perish) mark(s, 'doom');
});
hook('setWeather', function (id, src) { mark(sideOf(this, src), 'weather'); });   // (a setter's ability on entry)
hook('setTerrain', function (id, src) { mark(sideOf(this, src), 'terrain'); });
hook('setRoom', function (id, src) { mark(sideOf(this, src), 'room'); });
const stats = {}, perKey = {};
let turnsT = 0, done = 0, errors = 0;
const sayFast = P.say;
P.say = function* (t) { yield* sayFast.call(this, t, 1); };
for (let n = 0; n < BOUTS; n++) {
  const a = A[(n * 7 + 3) % A.length], b = A[(n * 13 + 11) % A.length]; if (a === b) continue;
  rec = {};
  let w = null, B = null;
  try {
    const ma = monsOf(a), mb = monsOf(b);
    w = KP.battle({ kind: 'trainer', spectate: { name: a.name, mons: ma }, foes: mb, noBag: true, canLose: true, bg: 'arena', ai: 'max', preview: true, meLead: a.lead, foeLead: b.lead, trainer: { name: b.name, money: 0 } });
    B = FF7.sceneMgr.stack.find(sc => sc instanceof KP.Battle);
    for (let i = 0; i < 400000 && !w.done; i++) FF7.stepFrame();
  } catch (e) { errors++; console.log('ERROR in ' + a.name + ' vs ' + b.name + ': ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  if (w && w.done) { done++; turnsT += (B && B.turn) || 0; }
  else check(`${a.name} vs ${b.name} ends`, false, 'turn ' + (B && B.turn));
  while (FF7.sceneMgr.stack.length && FF7.sceneMgr.top() instanceof KP.Battle) FF7.sceneMgr.pop();
  for (const [t, side] of [[a, 'me'], [b, 'foe']]) {
    const k = (perKey[t.key] = perKey[t.key] || { n: 0, won: 0, eng: {} }); k.n++;
    if (w && w.done && ((side === 'me') === (w.result === 'win'))) k.won++;
    for (const [e, E] of Object.entries(ENGINE)) if (E.has(t)) {
      const s = (stats[e] = stats[e] || { n: 0, ran: 0 }); s.n++; const ran = !!(rec[side] && rec[side][e]); if (ran) s.ran++;
      const ke = (k.eng[e] = k.eng[e] || { n: 0, ran: 0 }); ke.n++; if (ran) ke.ran++;
    }
  }
  if (verbose) console.log(`${a.name} vs ${b.name}: ${w && w.result} in ${B && B.turn} turns; ${JSON.stringify(rec)}`);
}
P.say = sayFast;
check('no errors in the bouts', errors === 0, errors + ' errors');
console.log(`bouts: ${done} played to the end, ${(turnsT / Math.max(1, done)).toFixed(1)} turns on average`);
console.log('engines run (the bouts where a team that carries it used it at least once):');
for (const [e, s] of Object.entries(stats)) console.log(`  ${e.padEnd(8)} ${s.ran}/${s.n} (${Math.round(100 * s.ran / Math.max(1, s.n))}%)`);
const low = Object.entries(perKey).flatMap(([k, v]) => Object.entries(v.eng).filter(([, x]) => x.n >= 2 && x.ran === 0).map(([e, x]) => `${k}: ${e} 0/${x.n}`));
if (low.length) console.log('never ran: ' + low.join('; '));
for (const [e, s] of Object.entries(stats)) if (s.n >= 6) check(`the ${e} engine runs`, s.ran / s.n >= 0.4, `${s.ran}/${s.n}`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
