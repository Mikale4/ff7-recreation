// Kupomon's battle AI, checked (js/kupomon/kp_tactics.js; the user's rule, 2026-10-02: every AI knows every move,
// ability, held item, field effect and status):
//  1. coverage: every effect key in the data (the moves', their states', the abilities', the held items') and every
//     status, state, weather, terrain, zone, side condition and hazard has its place in KP.tactics.KNOWS
//  2. positions: battles set up through the real engine, and the choice the AI makes in each (an immunity, an absorbing
//     ability, Magic Bounce, Guts, Poison Heal, Defiant, Contrary, a priority finish, Sturdy, a weather or heal or
//     status that would do nothing, Safeguard, the Fog, a Decoy, a target out of reach, a Rocky Helmet, a Zombie, a
//     Time Warp up, the wild moogles' wasted moves, the max AI's switch)
//  3. a fuzz: random teams of every kind, the AI's choice for both sides over many turns: no errors, and its time
//   node tools/kp_aicheck.js [--fuzz N] [--verbose]
const { boot } = require('./sim_prelude');
const { FF7 } = boot();
const KP = FF7.kupomon, T = KP.tactics;
const argv = process.argv.slice(2), verbose = argv.includes('--verbose'), fuzzN = argv.includes('--fuzz') ? +argv[argv.indexOf('--fuzz') + 1] : 300;
FF7.audio.sfx = () => {}; FF7.audio.push = () => {}; FF7.audio.pop = () => {}; FF7.audio.play = () => {};
let pass = 0, fail = 0;
const check = (name, ok, why) => { if (ok) pass++; else { fail++; console.log('FAIL ' + name + (why ? ': ' + why : '')); } };

// ------------------------------------------------------------------ 1. coverage
{
  const K = T.KNOWS, miss = [], seen = {};
  const need = (sec, k, from) => { (seen[sec] = seen[sec] || new Set()).add(k); if (!K[sec] || !K[sec][k]) miss.push(`${sec}.${k} (${from})`); };
  for (const [id, mv] of Object.entries(KP.MOVES)) {
    for (const k of Object.keys(mv)) need('move', k, id);
    for (const k of Object.keys(mv.vol || {})) need('vol', k, id);
    if (mv.status) for (const s of [].concat(mv.status[0])) need('status', s, id);
    if (mv.weather) need('weather', mv.weather, id); if (mv.terrain) need('terrain', mv.terrain, id);
    if (mv.room) need('room', mv.room, id); if (mv.side) need('side', mv.side, id); if (mv.hazard) need('hazard', mv.hazard, id);
  }
  for (const k of Object.keys(KP.VOLATILES)) need('vol', k, 'KP.VOLATILES');
  for (const k of Object.keys(KP.STATUS)) need('status', k, 'KP.STATUS');
  for (const k of Object.keys(KP.WEATHERS)) need('weather', k, 'KP.WEATHERS');
  for (const k of Object.keys(KP.TERRAINS)) need('terrain', k, 'KP.TERRAINS');
  for (const k of Object.keys(KP.ROOMS)) need('room', k, 'KP.ROOMS');
  for (const k of Object.keys(KP.SIDE_CONDS)) need('side', k, 'KP.SIDE_CONDS');
  for (const k of Object.keys(KP.HAZARDS)) need('hazard', k, 'KP.HAZARDS');
  for (const [id, a] of Object.entries(KP.ABILITIES)) for (const k of Object.keys(a)) if (!/^on[A-Z]/.test(k) && k !== 'id' && k[0] !== '_') need('ability', k, id);
  for (const k of KP.ABILITY_FLAGS.concat(Object.keys(KP.ABILITY_EFFECTS))) need('ability', k, 'the engine');
  for (const [id, it] of Object.entries(KP.ITEMS)) if (it.kind === 'held') for (const k of Object.keys(it)) if (!/^on[A-Z]/.test(k) && k[0] !== '_') need('item', k, id);
  for (const k of KP.ITEM_FLAGS.concat(Object.keys(KP.ITEM_EFFECTS))) need('item', k, 'the engine');
  // the states the battle itself puts on a moogle (not given by moves): they must be known too
  for (const k of ['guard', 'endure', 'invuln', 'charging', 'rampage', 'flinch', 'bound', 'confuse', 'berserk', 'doom', 'recharge']) need('vol', k, 'kp_battle.js');
  check('coverage: every effect key known (' + Object.values(seen).reduce((a, s) => a + s.size, 0) + ' keys)', !miss.length, miss.slice(0, 40).join(', '));
  const stale = []; for (const sec of Object.keys(K)) for (const k of Object.keys(K[sec])) if (!(seen[sec] && seen[sec].has(k))) stale.push(sec + '.' + k);
  if (stale.length) console.log('  (known but in no data now: ' + stale.join(', ') + ')');
}

// ------------------------------------------------------------------ the positions' harness
const st0 = FF7.state; (st0.keyItems = st0.keyItems || []).push('mogboy'); st0.vars.mogboy_carts = 127;
KP.play(); KP.enter(null, null);
['kp_intro', 'kp_starter', 'kp_rival1', 'kp_sent_off'].forEach(f => { FF7.state.flags[f] = true; });
for (let i = 0; i < 30; i++) FF7.stepFrame();
const abilityOf0 = KP.abilityOf; let abilities = 'marked';
KP.abilityOf = (mon) => abilities === 'all' ? abilityOf0(mon) : (mon && mon.__ab ? Object.assign({ id: mon.__ab }, KP.ABILITIES[mon.__ab]) : null);
KP.learnOnLevels = function* () {};
const mv = (id, o) => { KP.MOVES[id] = Object.assign({ name: id, type: null, power: 0, acc: 100, cd: 0, desc: '' }, o); return id; };
const ab = (id, o) => { KP.ABILITIES[id] = Object.assign({ name: id, desc: '' }, o); delete KP.ABILITIES[id]._h; return id; };
mv('t_hit', { power: 40 }); mv('t_hit80', { power: 80 }); mv('t_big', { power: 250 }); mv('t_quick', { power: 40, prio: 1 });
mv('t_multi', { power: 45, hits: 2 }); mv('t_sleep', { status: ['sleep', 100] }); mv('t_burn', { status: ['burn', 100] });
mv('t_poison', { status: ['poison', 100] }); mv('t_growl', { stat: ['atk', -1, 'foe'] }); mv('t_swords', { stat: ['atk', 2, 'self'] });
mv('t_heal', { heal: 0.5 }); mv('t_punch', { power: 80, flags: ['contact'] }); mv('t_beam', { power: 75 });
mv('t_sound', { status: ['confuse', 100], flags: ['sound'] }); mv('t_warp', { room: 'timewarp' }); mv('t_wait', { power: 0 });
KP.ITEMS.rocky_helmet_t = { name: 'Helmet', kind: 'held', helmet: 1 / 6, desc: '' };
// a battle up to the first command; o.team / o.foes [[species, lv, extra]]; then setup(B) and ask(B)
// (each position on the same dice: a moogle's IVs and appetite, and the AI's coin flips, the same every run)
function position(o) {
  const rnd0 = Math.random; let seed = o.seed || +(process.env.KP_SEED || 4242);
  if (!o.live) Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  try { return position0(o); } finally { Math.random = rnd0; }
}
function position0(o) {
  const d = FF7.state.kp;
  const make = ([sp, lv, x]) => { const m = Object.assign(KP.make(sp, lv), x || {}); if (m.__hp != null) m.hp = Math.max(1, Math.floor(KP.maxHp(m) * m.__hp)); if (x && x.moves) m.moves = x.moves; return m; };
  d.party = o.team.map(make);
  const foes = o.foes.map(make);
  const w = KP.battle(Object.assign({ kind: o.kind || 'trainer', foes, trainer: { name: 'Tester', money: 0 }, canLose: true, bg: 'town', noCrit: true, ai: o.ai || 'smart' }, o.opts || {}));
  const B = FF7.sceneMgr.stack.find(sc => sc instanceof KP.Battle);
  for (let i = 0; i < 3000 && !(B.ui && B.ui.kind === 'command'); i++) { FF7.stepFrame(); if (B.text) B.text = null; }
  let r;
  try { if (o.setup) o.setup(B); r = o.ask(B); }
  finally { while (FF7.sceneMgr.stack.length && !(FF7.sceneMgr.top() instanceof FF7.field.FieldScene)) FF7.sceneMgr.pop(); }
  return r;
}
const SP = 'grumog_viking', SP2 = 'stampo_blackbelt';
const ai = (B) => T.choose(B, B.foe, B.me);
const why = (B) => (T.last || []).map(x => x.id + '=' + x.v.toFixed(1)).join(' ');
// a species a type can't touch (for the immunity position)
let IMM = null;
for (const ty of Object.keys(KP.TYPE_NAMES)) { for (const sp of Object.keys(KP.SPECIES)) { const s = KP.SPECIES[sp]; if (s.class || !s.base) continue; if (KP.effOn(ty, KP.make(sp, 30)) === 0) { IMM = [ty, sp]; break; } } if (IMM) break; }

// ------------------------------------------------------------------ 2. positions
const P = (name, o, expect) => {
  let got, info = '';
  try { got = position(Object.assign({}, o, { ask: (B) => { const r = (o.ask || ai)(B); info = why(B); return r; } })); }
  catch (e) { check(name, false, 'threw ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' / ')); return; }
  const ok = typeof expect === 'function' ? expect(got) : got === expect;
  check(name, ok, `chose ${got}; ${info}`);
  if (verbose) console.log(`  ${name}: ${got}   ${info}`);
};
if (IMM) {
  mv('t_imm', { type: IMM[0], power: 150 });
  P('an attack it is immune to is not used', { team: [[IMM[1], 30]], foes: [[SP, 30, { moves: ['t_imm', 't_hit'] }]] }, 't_hit');
}
ab('t_absorb', { immune: ['blackmage'], absorb: true }); mv('t_fire', { type: 'blackmage', power: 120 });
P('an absorbing ability is not fed', { team: [[SP2, 30, { __ab: 't_absorb', __hp: 0.6 }]], foes: [[SP, 30, { moves: ['t_fire', 't_hit'] }]] }, 't_hit');
ab('t_bounce', { magicBounce: true });
P('no status move into Magic Bounce', { team: [[SP2, 30, { __ab: 't_bounce' }]], foes: [[SP, 30, { moves: ['t_sleep', 't_hit'] }]] }, 't_hit');
ab('t_guts', { guts: 1.5 });
P('no burn on a Guts kind', { team: [[SP2, 30, { __ab: 't_guts', moves: ['t_punch'] }]], foes: [[SP, 30, { moves: ['t_burn', 't_hit'] }]] }, 't_hit');
ab('t_pheal', { poisonHeal: true });
P('no poison on a Poison Heal kind', { team: [[SP2, 30, { __ab: 't_pheal', __hp: 0.5 }]], foes: [[SP, 30, { moves: ['t_poison', 't_hit'] }]] }, 't_hit');
ab('t_defiant', { defiant: true });
P('no stat drop into Defiant', { team: [[SP2, 30, { __ab: 't_defiant', moves: ['t_punch'] }]], foes: [[SP, 30, { moves: ['t_growl', 't_hit'] }]] }, 't_hit');
ab('t_contrary', { contrary: true });
P('Contrary: no self-boost that would drop', { team: [[SP2, 30]], foes: [[SP, 30, { __ab: 't_contrary', moves: ['t_swords', 't_hit'] }]] }, 't_hit');
P('a priority finish when it would be beaten first', { team: [[SP2, 40, { __hp: 0.1, moves: ['t_big'] }]], foes: [[SP, 30, { __hp: 0.3, moves: ['t_big', 't_quick'] }]] }, 't_quick');
ab('t_sturdy', { sturdy: true });
P('Sturdy at full HP: the multi-hit finishes it', { team: [[SP2, 20, { __ab: 't_sturdy' }]], foes: [[SP, 40, { moves: ['t_big', 't_multi'] }]] }, 't_multi');
mv('t_storm', { weather: 'manastorm' });
P('no weather already up', { team: [[SP2, 30]], foes: [[SP, 30, { moves: ['t_storm', 't_hit'] }]], setup: (B) => { B.wx = { id: 'manastorm', turns: 5 }; } }, 't_hit');
P('no healing at full HP', { team: [[SP2, 30, { moves: ['t_wait'] }]], foes: [[SP, 30, { moves: ['t_heal', 't_hit'] }]] }, 't_hit');
P('no ailment on one that has one', { team: [[SP2, 30, { status: 'poison' }]], foes: [[SP, 30, { moves: ['t_sleep', 't_hit'] }]] }, 't_hit');
P('no ailment through Safeguard', { team: [[SP2, 30]], foes: [[SP, 30, { moves: ['t_sleep', 't_hit'] }]], setup: (B) => { B.sides.me.cond.safeguard = 5; } }, 't_hit');
P('no lasting ailment in the Fog', { team: [[SP2, 30]], foes: [[SP, 30, { moves: ['t_burn', 't_hit'] }]], setup: (B) => { B.terrain = { id: 'fog', turns: 5 }; } }, 't_hit');
P('no status move into a Decoy (a sound one gets through)', { team: [[SP2, 30]], foes: [[SP, 30, { moves: ['t_sleep', 't_sound'] }]], setup: (B) => { B.me.vol.decoy = 30; } }, 't_sound');
P('a target out of reach: set up instead', { team: [[SP2, 30, { moves: ['t_hit'] }]], foes: [[SP, 30, { moves: ['t_swords', 't_hit'] }]], setup: (B) => { B.me.vol.invuln = 'air'; B.me.vol.charging = 't_hit'; } }, 't_swords');
mv('t_wait', { power: 0 });
P('a Rocky Helmet: no touch that would finish itself', { team: [[SP2, 30, { held: 'rocky_helmet_t', moves: ['t_wait'] }]], foes: [[SP, 30, { __hp: 0.12, moves: ['t_punch', 't_beam'] }]],
 }, 't_beam');
mv('t_holy', { type: 'whitemage', power: 60 });
P('a Zombie: White Mage hits twice as hard', { team: [[SP, 30, { status: 'zombie' }]], foes: [[SP2, 30, { moves: ['t_holy', 't_hit80'] }]] },
  (g) => g === 't_holy' || KP.effOn('whitemage', KP.make(SP, 30)) < 0.75);
P('a Time Warp it gains from is not ended', { team: [[SP2, 40]], foes: [[SP, 20, { moves: ['t_warp', 't_hit'] }]], setup: (B) => { B.rooms.timewarp = 4; } }, 't_hit');
// (and the good plays: a set-up when there's time, the weather its attacks want, a Taunt on a staller, a sleep on a sweeper)
P('a set-up when it has the time', { team: [[SP2, 30, { moves: ['t_hit'] }]], foes: [[SP, 30, { moves: ['t_swords', 't_hit'] }]] }, 't_swords');
mv('t_bolt', { type: 'blackmage', power: 30 });
P('the weather its attacks want', { team: [[SP2, 30, { moves: ['t_wait'] }]], foes: [[SP, 30, { moves: ['t_storm', 't_bolt'] }]] }, (g) => g === 't_storm' || KP.effOn('blackmage', KP.make(SP2, 30)) === 0);
mv('t_taunt', { vol: { taunt: true } });
P('a Taunt on a moogle that only heals', { team: [[SP2, 30, { moves: ['t_heal', 't_wait'] }]], foes: [[SP, 30, { moves: ['t_taunt', 't_hit'] }]] }, 't_taunt');
P('a sleep on a boosted sweeper', { team: [[SP2, 30, { moves: ['t_big'] }]], foes: [[SP, 42, { moves: ['t_sleep', 't_hit'] }]], setup: (B) => { B.me.st.atk = 2; } }, 't_sleep');
if (IMM) {
  const n = 120; let bad = 0;
  P('wild moogles never pick a move that does nothing', { kind: 'wild', team: [[IMM[1], 30]], foes: [[SP, 30, { moves: ['t_imm', 't_hit'] }]],
    ask: (B) => { for (let i = 0; i < n; i++) if (T.wildChoose(B, B.foe, B.me) === 't_imm') bad++; return bad; } }, 0);
  P('the max AI switches out of a moogle that can do nothing', { ai: 'max', team: [[IMM[1], 30, { moves: ['t_hit80'] }]], foes: [[SP, 30, { moves: ['t_imm'] }], [SP2, 36, { moves: ['t_hit80'] }]],
    ask: (B) => { const m = T.maxSwitch(B, B.foe, B.me, B.foes); return m ? m.sp : null; } }, SP2);
}

// ------------------------------------------------------------------ 3. a fuzz: random teams, both sides chosen by the AI
{
  abilities = 'all';
  const ids = Object.keys(KP.SPECIES).filter(id => !KP.SPECIES[id].class || KP.SPECIES[id].class !== 'breed'), pick = (a) => a[Math.floor(Math.random() * a.length)];
  const items = Object.keys(KP.ITEMS).filter(k => KP.ITEMS[k].kind === 'held');
  let n = 0, errs = 0, ms = 0, calls = 0;
  for (let i = 0; i < fuzzN; i++) {
    const mk = () => [pick(ids), 30 + Math.floor(Math.random() * 21), { held: Math.random() < 0.7 ? pick(items) : null }];
    try {
      position({ live: true, team: [mk(), mk()], foes: [mk(), mk()], ai: 'max', setup: (B) => {
        if (Math.random() < 0.3) B.wx = { id: pick(Object.keys(KP.WEATHERS)), turns: 4 };
        if (Math.random() < 0.3) B.terrain = { id: pick(Object.keys(KP.TERRAINS)), turns: 4 };
        if (Math.random() < 0.2) B.rooms[pick(Object.keys(KP.ROOMS))] = 3;
        if (Math.random() < 0.3) B.sides.me.haz[pick(Object.keys(KP.HAZARDS))] = 1;
        if (Math.random() < 0.3) B.me.mon.status = pick(Object.keys(KP.STATUS).filter(k => KP.STATUS[k].lasting !== false));
      }, ask: (B) => {
        for (const [f, t] of [[B.foe, B.me], [B.me, B.foe]]) {
          const t0 = Date.now(); T.choose(B, f, t); T.trainerChoose(B, f, t); T.wildChoose(B, f, t); T.maxSwitch(B, f, t, f.side === 'me' ? B.d.party : B.foes); ms += Date.now() - t0; calls++;
        }
        n++;
      } });
    } catch (e) { errs++; if (errs <= 5) console.log('  fuzz error: ' + (e.stack || e).toString().split('\n').slice(0, 4).join(' / ')); }
  }
  check(`fuzz: ${n} positions`, !errs && !T._warned, errs + ' errors' + (T._warned ? ', the look ahead warned' : ''));
  console.log(`  fuzz: ${n} positions, ${(ms / Math.max(1, calls)).toFixed(1)} ms a side for every choice (choose, trainer, wild, max switch)`);
}
console.log(`${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
