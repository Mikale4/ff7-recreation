// The World Championship's archetype opponents (the user, 2026-10-03: "create new extra opponents for champion
// tournament only that adopts all of those playstyles and not just one variation of each, but multiple variations of
// each and each sub playstyle and all of the styles in-between"). Built from the two Showdown OU guides the user gave
// (pokemon_showdown_ou_team_archetypes_complete_guide.md, pokemon_showdown_ou_archetypes_examples_strategies_complete.md;
// their Kupomon translation: docs/KUPOMON_METAGAME.md).
//
// Each archetype is a five-slot spec (tournaments are 5v5) of ROLES (a hazard lead, a screen setter, a physical setup
// sweeper, a bulky pivot, a weather setter and its abusers, a Time Warp attacker, a Doom trapper...), labelled with the
// guides' four labels: primary playstyle / engine / progress / win condition. A role is a test on a kind's real data
// (its whole line's level-up moves and every Skill Chip that fits it, its ability slots, its stats), the moves it must
// carry, the ability, held items and appetite it wants. A team is drawn at random among the kinds that fit each slot,
// best first (a role's score: the stats that role uses), many times over, and the best whole team kept: its roles'
// scores, a defensive spread (every attacking job resisted by someone, no job that half the team is weak to), a
// defensive core where the spec asks for one, the species clause, the item clause; and a kind already used by another
// archetype team counts for less, so the variations differ. Moves: the role's own, then attacks (its own job's strongest,
// then coverage: the tactics engine's T.pickFour), always one with no cooldown.
//
// Writes js/kupomon/content/kp_c96_wcteams.js (KP.WC_ARCHETYPES: the trainers, kp_league.js draws them into the World
// Championship only) and docs/KUPOMON_WC_TEAMS.md (every team, role by role).
//   node tools/kp_archetypes.js [--dry] [--seed N] [--only key1,key2] [--verbose]
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
process.chdir(ROOT);
const { boot } = require('./sim_prelude');
const { FF7 } = boot();
const KP = FF7.kupomon, T = KP.tactics;
FF7.audio.sfx = () => {}; FF7.audio.push = () => {}; FF7.audio.pop = () => {}; FF7.audio.play = () => {};
FF7.state = KP.newState(FF7.state);
const argv = process.argv.slice(2), dry = argv.includes('--dry'), verbose = argv.includes('--verbose');
const only = argv.includes('--only') ? new Set(argv[argv.indexOf('--only') + 1].split(',')) : null;
let seed = argv.includes('--seed') ? +argv[argv.indexOf('--seed') + 1] : 20261003;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const OUT = 'js/kupomon/content/kp_c96_wcteams.js', DOC = 'docs/KUPOMON_WC_TEAMS.md';
const LV = KP.MAX_LEVEL, perfect = Object.fromEntries(KP.STATS.map(k => [k, 31]));

// ------------------------------------------------------------------ the kinds (fully evolved, no legends or mythicals)
const pre = {}; for (const k of Object.keys(KP.SPECIES)) { const e = KP.SPECIES[k].evo; if (e) pre[e.to] = k; }
// (legends and mythicals too, since the legend clause, the user, 2026-10-03: one of them a team at most, buildTeam)
const kinds = Object.keys(KP.SPECIES).filter(sp => KP.finalOf(sp) === sp);
const MV = (id) => KP.MOVES[id];
const cat = (mv) => KP.category(mv);
const dmg = (mv) => !!(mv && mv.power > 0 && cat(mv) !== 'status');
const poolOf = (sp) => {
  const s = new Set();
  for (let q = sp; q; q = pre[q]) for (const [l, m] of (KP.LEARN && KP.LEARN[q]) || []) if (l <= LV && MV(m)) s.add(m);
  if (!s.size) ((KP.SPECIES[sp] || {}).moves || []).forEach(m => MV(m) && s.add(m));
  for (const id of Object.keys(KP.ITEMS)) { const it = KP.ITEMS[id]; if (it.kind === 'chip' && MV(it.move) && KP.chipFits({ sp, moves: [] }, id)) s.add(it.move); }
  return s;
};
const B = {};
for (const sp of kinds) {
  const S = KP.SPECIES[sp], base = Object.assign({ hp: 50, atk: 50, def: 50, mag: 50, res: 50, spd: 50 }, S.base || {});
  const b = { sp, S, base, types: [S.type, S.type2].filter(Boolean), pool: poolOf(sp), abil: ((KP.SPECIES_ABIL && KP.SPECIES_ABIL[sp]) || []).slice(0, 3) };
  b.bst = KP.bst(sp); b.phys = base.atk >= base.mag; b.off = Math.max(base.atk, base.mag);
  b.mixed = Math.min(base.atk, base.mag) >= 0.85 * b.off;
  b.mon = KP.make(sp, LV, { iv: perfect, app: 'content', abil: 0 });
  b.mon.plus = 5;
  B[sp] = b;
}
const ALL = Object.values(B);

// ------------------------------------------------------------------ move tags
const st = (mv, k) => !!(mv.status && !mv.power && [].concat(mv.status[0]).includes(k));
const TAG = {
  hazard: mv => !!mv.hazard, mines: mv => mv.hazard === 'mines', caltrops: mv => mv.hazard === 'caltrops',
  venomSpikes: mv => mv.hazard === 'venom_spikes', web: mv => mv.hazard === 'web',
  spin: mv => mv.clearHazards === 'own' && mv.power > 0, defog: mv => !!mv.clearHazards && !(mv.clearHazards === 'own' && mv.power > 0),
  removal: mv => !!mv.clearHazards,
  pivot: mv => mv.selfSwitch === true, pass: mv => mv.selfSwitch === 'pass',
  phaze: mv => !!mv.forceSwitch, haze: mv => !!mv.haze,
  wall: mv => mv.side === 'wall', shell: mv => mv.side === 'shell', veil: mv => mv.side === 'veil', tailwind: mv => mv.side === 'tailwind',
  knock: mv => !!mv.knockOff, trick: mv => !!mv.trick, cleric: mv => !!mv.cureTeam,
  kaboom: mv => !!mv.selfFaint, destiny: mv => !!(mv.vol && mv.vol.destiny),
  decoy: mv => !!(mv.vol && mv.vol.decoy), taunt: mv => !!(mv.vol && mv.vol.taunt), leech: mv => !!(mv.vol && mv.vol.leech),
  block: mv => !!((mv.vol && mv.vol.block) || mv.trap === 'block'),
  doom: mv => st(mv, 'doom') || !!mv.perish,   // (Last Refrain: Perish Song)
  perish: mv => !!mv.perish, encore: mv => !!(mv.vol && mv.vol.encore), wish: mv => !!mv.wish, resetFoe: mv => !!mv.resetFoe, teleport: mv => mv.selfSwitch === true && !mv.power && mv.prio < 0, sleep: mv => st(mv, 'sleep'), stop: mv => st(mv, 'stop'), slow: mv => st(mv, 'slow'),
  toxic: mv => st(mv, 'venom'), burn: mv => st(mv, 'burn'), poison: mv => st(mv, 'poison') || st(mv, 'venom'),
  cripple: mv => st(mv, 'venom') || st(mv, 'burn') || st(mv, 'stop') || st(mv, 'slow'),
  heal: mv => (mv.heal > 0 || mv.rest || mv.wish) && !mv.power,   // (Kupo Nap and Star Wish heal too: the missing tools)
  setupP: mv => !mv.power && ((mv.self && mv.self.atk > 0) || (mv.stat && mv.stat[0] === 'atk' && mv.stat[2] === 'self')),
  setupS: mv => !mv.power && ((mv.self && mv.self.mag > 0) || (mv.stat && mv.stat[0] === 'mag' && mv.stat[2] === 'self')),
  setupSpd: mv => !mv.power && mv.self && mv.self.spd > 0 && ((mv.self.atk || 0) > 0 || (mv.self.mag || 0) > 0),
  setupD: mv => !mv.power && ((mv.self && ((mv.self.def || 0) > 0 || (mv.self.res || 0) > 0)) || (mv.stat && ['def', 'res'].includes(mv.stat[0]) && mv.stat[2] === 'self')),
  prio: mv => mv.power > 0 && mv.prio > 0 && !mv.firstTurnOnly && !mv.onlyIfFoeAttacks,
  speedCtl: mv => mv.side === 'tailwind' || st(mv, 'stop') || st(mv, 'slow') || mv.hazard === 'web',
};
const moveTag = (k) => typeof k === 'function' ? k : TAG[k];
const has = (b, k) => { const f = moveTag(k); for (const id of b.pool) { const mv = MV(id); if (mv && f(mv, id)) return true; } return false; };
const prefBy = (mv) => -(mv.cd || 0) * 2 + ((mv.acc === true ? 100 : mv.acc || 100) / 50) + (mv.power || 0) / 60 - (mv.hpCost ? 2 : 0);
const pick = (b, k, not = []) => { const f = moveTag(k); const L = [...b.pool].filter(id => MV(id) && f(MV(id), id) && !not.includes(id)); return L.sort((x, y) => prefBy(MV(y)) - prefBy(MV(x)))[0] || null; };
const wMove = (w) => (mv) => mv.weather === w, tMove = (t) => (mv) => mv.terrain === t, rMove = (r) => (mv) => mv.room === r;

// ------------------------------------------------------------------ abilities
const AB = (id) => KP.ABILITIES[id] || {};
const slotWhere = (b, f) => { for (let i = 0; i < b.abil.length; i++) { const a = AB(b.abil[i]); if (b.abil[i] && f(a, b.abil[i]) && !a.legend) return i; } return null; };
const ABT = {
  regen: a => !!a.regenerator, unaware: a => !!a.unaware, bounce: a => !!a.magicBounce, sturdy: a => !!a.sturdy, prankster: a => !!a.prankster,
  trap: a => !!a.trapFoes, intimidate: a => !!((a.onEnter && a.onEnter.foe) || (a.onEnterBoosts && a.onEnterBoosts.foe) || a.foeStatMul),   // (Menace: the Intimidate of Kupomon) guts: a => !!a.guts, poisonHeal: a => !!a.poisonHeal,
  magicGuard: a => !!a.magicGuard, float: a => !!a.float, regenPassive: a => !!a.regen, naturalCure: a => !!a.naturalCure, multiscale: a => !!a.multiscale,
  setWeather: (w) => a => a.setWeather === w && !a.extreme, setTerrain: (t) => a => a.setTerrain === t, setRoom: (r) => a => a.setRoom === r,
  likesWeather: (w) => a => !!((a.fieldSpd && a.fieldSpd[w]) || a.boostHighest === w || (a.fieldStat && a.fieldStat[w]) || (a.fieldHeal && a.fieldHeal[w])),
  likesTerrain: (t) => a => !!((a.fieldSpd && a.fieldSpd[t]) || a.boostHighest === t || (a.fieldStat && a.fieldStat[t])),
};

// ------------------------------------------------------------------ attacks, appetites
const stab = (b, mv) => b.types.includes(mv.type);
const statFor = (b, mv) => cat(mv) === 'magic' ? b.base.mag : b.base.atk;
const pw = (b, mv) => (KP.nominalPower ? KP.nominalPower(mv) : mv.power || 0) * (stab(b, mv) ? 1.5 : 1) * ((mv.acc === true ? 100 : mv.acc || 100) / 100) * statFor(b, mv) / 100;
const atkPool = (b, o = {}) => [...b.pool].filter(id => { const mv = MV(id); return dmg(mv) && !mv.selfFaint && !mv.recharge && !mv.charge && !mv.crash && !mv.firstTurnOnly && !mv.onlyIfFoeAttacks && !mv.hpCost && (!o.cat || cat(mv) === o.cat); });
const bestAtk = (b, o = {}) => atkPool(b, o).reduce((a, id) => Math.max(a, pw(b, MV(id))), 0);
const bestOfType = (b, type, o = {}) => atkPool(b, o).filter(id => MV(id).type === type).sort((x, y) => pw(b, MV(y)) - pw(b, MV(x)))[0] || null;
function attacks(b, n, o = {}) {
  if (n <= 0) return [];
  let P = atkPool(b, o); if (!P.length && o.cat) P = atkPool(b);
  const out = (o.first || []).filter(id => P.includes(id));
  if (o.type) { const t = bestOfType(b, o.type, o.cat ? { cat: o.cat } : {}) || bestOfType(b, o.type); if (t && !out.includes(t)) out.push(t); }
  let four = [];
  const rest = P.filter(id => !out.includes(id));
  if (rest.length) { try { four = T.pickFour(b.mon, rest); } catch (e) { four = []; } if (!four.length) four = rest.slice().sort((x, y) => pw(b, MV(y)) - pw(b, MV(x))); }
  for (const id of four) { if (out.length >= n) break; if (!out.includes(id)) out.push(id); }
  for (const id of rest.sort((x, y) => pw(b, MV(y)) - pw(b, MV(x)))) { if (out.length >= n) break; if (!out.includes(id)) out.push(id); }
  return out.slice(0, n);
}
const APP = (plus, minus) => KP.APPETITE_IDS.find(k => KP.APPETITES[k].plus === plus && KP.APPETITES[k].minus === minus) || 'content';
const dump = (b) => b.phys ? 'mag' : 'atk';
const offApp = (b, o = {}) => {
  const P = o.cat === 'magic' ? 'mag' : o.cat === 'physical' ? 'atk' : b.phys ? 'atk' : 'mag', U = P === 'atk' ? 'mag' : 'atk';
  if (o.slow) return APP(P, 'spd');
  if (o.mixed) return APP(P, b.base.def <= b.base.res ? 'def' : 'res');
  if (o.fast || (b.base.spd >= 85 && !o.power)) return APP('spd', U);
  return APP(P, U);
};
const defApp = (b, side) => APP(side || (b.base.def >= b.base.res ? 'def' : 'res'), dump(b));
const bulk = (b) => b.base.hp + (b.base.def + b.base.res) / 2;
const typeWeak = (b, t) => KP.eff(t, b.types[0]) * (b.types[1] ? KP.eff(t, b.types[1]) : 1);

// the jobs each weather and terrain favours
const WX = { radiance: { boost: 'whitemage', name: 'Radiance', rock: 'sun_fragment' }, gloom: { boost: 'summoner', name: 'Gloom', rock: 'shadow_fragment' },
  sandstorm: { safe: ['beast', 'knight', 'machinist'], name: 'Sandstorm', rock: 'desert_rose' }, manastorm: { boost: 'blackmage', name: 'Manastorm', rock: 'mana_prism' } };
const TX = { rhythm: { boost: 'bard', name: 'Rhythm Field', seed: 'melody_seed' }, lifestream: { boost: 'beast', name: 'Lifestream', seed: 'gaia_seed' },
  fog: { name: 'Fog', seed: 'mist_seed' }, chrono: { boost: 'timemage', name: 'Time Field', seed: 'chrono_seed' } };
const ROOMNAME = { timewarp: 'Time Warp', gravity: 'Gravity', nullzone: 'Null Zone', wonderzone: 'Wonder Zone' };

// ------------------------------------------------------------------ the roles
// role: { need(b, e), score(b, e), req(b, e) -> move ids it must carry, atk(b, e) -> attack fill options, abil(b, e) ->
// a slot or null (the World Championship set's), items(b, e) -> held items best first, app(b, e) -> appetite }
const ROLE = {};
const role = (id, d) => { ROLE[id] = Object.assign({ id, need: () => true, score: (b) => b.bst / 6, req: () => [], atk: (b) => ({ cat: b.mixed ? null : b.phys ? 'physical' : 'magic' }), abil: () => null, items: () => [], app: (b) => offApp(b) }, d); };
const reqs = (...ids) => ids.filter(Boolean);
const OFF_ITEMS = (b) => [b.phys ? 'hyper_wrist' : 'wizard_earring', 'cursed_ring', 'champion_belt', 'boost_' + b.types[0], 'limit_charm'];
const BULK_ITEMS = ['leftover_nut', 'cats_bell', 'thornlet', 'germinas_boots', 'hp_absorb', 'mamook_pear'];

role('hazard_lead', { label: 'hazard lead',
  need: b => has(b, 'hazard') && b.base.spd >= 70,
  score: b => b.base.spd * 1.2 + bulk(b) * 0.2 + (has(b, 'taunt') ? 20 : 0) + (has(b, 'mines') ? 15 : 0) + (slotWhere(b, ABT.sturdy) != null ? 20 : 0) + (new Set([...b.pool].map(id => MV(id) && MV(id).hazard).filter(Boolean)).size > 1 ? 25 : 0),
  req: b => { const h1 = pick(b, 'mines') || pick(b, 'caltrops') || pick(b, 'hazard'); const h2 = pick(b, mv => mv.hazard && mv.hazard !== MV(h1).hazard); return reqs(h1, h2, pick(b, 'taunt') || pick(b, 'destiny') || pick(b, 'kaboom')); },
  abil: b => slotWhere(b, ABT.sturdy), items: () => ['safety_bit', 'tranquilizer', 'white_wind_leaf'], app: b => offApp(b, { fast: true }) });
role('hazard_setter', { label: 'hazard setter',
  need: b => has(b, 'hazard') && bulk(b) >= 85,
  score: b => bulk(b) + b.off * 0.3 + (has(b, 'mines') ? 25 : 0) + (has(b, 'heal') ? 30 : 0),
  req: b => reqs(pick(b, 'mines') || pick(b, 'hazard'), pick(b, 'heal'), pick(b, 'knock') || pick(b, 'phaze') || pick(b, 'cripple')),
  items: () => ['leftover_nut', 'thornlet', 'cats_bell', 'germinas_boots'], app: b => defApp(b) });
role('hazard_offense', { label: 'offensive hazard setter',
  need: b => has(b, 'hazard') && b.off >= 90,
  score: b => b.off * 1.0 + b.base.spd * 0.4 + bulk(b) * 0.3 + (has(b, 'mines') ? 20 : 0),
  req: b => reqs(pick(b, 'mines') || pick(b, 'hazard')), items: b => ['cursed_ring', 'germinas_boots', 'leftover_nut', ...OFF_ITEMS(b)], app: b => offApp(b) });
role('spiker', { label: 'caltrops / venom spikes setter',
  need: b => has(b, 'caltrops') || has(b, 'venomSpikes'),
  score: b => bulk(b) * 0.6 + b.base.spd * 0.4 + b.off * 0.3 + (has(b, 'caltrops') && has(b, 'venomSpikes') ? 25 : 0),
  req: b => reqs(pick(b, 'caltrops') || pick(b, 'venomSpikes'), pick(b, 'venomSpikes') && pick(b, 'caltrops') ? pick(b, 'venomSpikes') : null, pick(b, 'heal')),
  items: () => ['germinas_boots', 'leftover_nut', 'safety_bit'], app: b => b.off > bulk(b) ? offApp(b) : defApp(b) });
role('web_setter', { label: 'web setter',
  need: b => has(b, 'web'), score: b => b.base.spd + (has(b, 'taunt') ? 20 : 0) + (has(b, 'mines') ? 15 : 0) + b.off * 0.2,
  req: b => reqs(pick(b, 'web'), pick(b, 'taunt') || pick(b, 'mines') || pick(b, 'caltrops')),
  abil: b => slotWhere(b, ABT.sturdy), items: () => ['safety_bit', 'tranquilizer'], app: b => offApp(b, { fast: true }) });
role('screen_setter', { label: 'screen setter',
  need: b => has(b, 'wall') && has(b, 'shell'),
  score: b => b.base.spd * 0.7 + bulk(b) * 0.5 + (has(b, 'taunt') ? 15 : 0) + (slotWhere(b, ABT.prankster) != null ? 40 : 0),
  req: b => reqs(pick(b, 'wall'), pick(b, 'shell'), pick(b, 'taunt') || pick(b, 'destiny') || pick(b, 'stop')),
  abil: b => slotWhere(b, ABT.prankster), items: () => ['protect_ring', 'safety_bit'], app: b => offApp(b, { fast: true }) });
role('veil_setter', { label: 'Veil setter (Radiance)',
  need: b => has(b, 'veil'), score: b => b.base.spd * 0.6 + bulk(b) * 0.6 + (has(b, wMove('radiance')) ? 30 : 0),
  req: b => reqs(pick(b, 'veil'), pick(b, wMove('radiance')), pick(b, 'wall') || pick(b, 'shell')),
  items: () => ['protect_ring', 'sun_fragment', 'safety_bit'], app: b => offApp(b, { fast: true }) });
const setupRole = (id, label, tag, catOf, statK) => role(id, { label,
  need: b => has(b, tag) && (statK === 'off' ? b.off : b.base[statK]) >= 85,
  score: b => (statK === 'off' ? b.off : b.base[statK]) * 1.1 + b.base.spd * 0.8 + bulk(b) * 0.2 + bestAtk(b, { cat: catOf(b) }) * 0.3,
  req: b => reqs(pick(b, tag)), atk: b => ({ cat: catOf(b) }),
  items: b => ['limit_charm', 'cursed_ring', 'leftover_nut', 'champion_belt', 'boost_' + b.types[0]], app: b => offApp(b, { cat: catOf(b) }) });
setupRole('setup_phys', 'physical setup sweeper', 'setupP', () => 'physical', 'atk');
setupRole('setup_spec', 'magic setup sweeper', 'setupS', () => 'magic', 'mag');
setupRole('setup_speed', 'speed-boosting sweeper', 'setupSpd', b => b.phys ? 'physical' : 'magic', 'off');
role('setup_bulky', { label: 'bulky setup sweeper',
  need: b => (has(b, 'setupD') || has(b, 'setupS') || has(b, 'setupP')) && has(b, 'heal') && bulk(b) >= 85,
  score: b => bulk(b) * 0.9 + b.off * 0.6 + (has(b, 'setupD') ? 15 : 0),
  req: b => reqs(pick(b, 'setupD') || pick(b, b.phys ? 'setupP' : 'setupS') || pick(b, 'setupP') || pick(b, 'setupS'), pick(b, 'heal')),
  items: () => ['leftover_nut', 'cats_bell', 'limit_charm', 'hp_absorb'], app: b => defApp(b) });
role('sub_setup', { label: 'Decoy setup sweeper',
  need: b => has(b, 'decoy') && (has(b, 'setupP') || has(b, 'setupS') || has(b, 'setupSpd')) && b.off >= 85,
  score: b => b.off * 1.0 + b.base.spd * 0.6 + bulk(b) * 0.3,
  req: b => reqs(pick(b, 'decoy'), pick(b, 'setupSpd') || pick(b, b.phys ? 'setupP' : 'setupS') || pick(b, 'setupP') || pick(b, 'setupS')),
  items: () => ['leftover_nut', 'cats_bell', 'limit_charm'], app: b => offApp(b) });
role('breaker_phys', { label: 'physical wallbreaker',
  need: b => b.base.atk >= 100 && bestAtk(b, { cat: 'physical' }) > 0, score: b => b.base.atk * 1.4 + bestAtk(b, { cat: 'physical' }) * 0.6 + b.base.spd * 0.2,
  atk: () => ({ cat: 'physical' }), items: b => ['hyper_wrist', 'cursed_ring', 'champion_belt', 'boost_' + b.types[0]], app: b => offApp(b, { cat: 'physical', power: true }) });
role('breaker_spec', { label: 'magic wallbreaker',
  need: b => b.base.mag >= 100 && bestAtk(b, { cat: 'magic' }) > 0, score: b => b.base.mag * 1.4 + bestAtk(b, { cat: 'magic' }) * 0.6 + b.base.spd * 0.2,
  atk: () => ({ cat: 'magic' }), items: b => ['wizard_earring', 'cursed_ring', 'champion_belt', 'boost_' + b.types[0]], app: b => offApp(b, { cat: 'magic', power: true }) });
role('breaker_mixed', { label: 'mixed wallbreaker',
  need: b => b.base.atk >= 85 && b.base.mag >= 85 && bestAtk(b, { cat: 'physical' }) > 0 && bestAtk(b, { cat: 'magic' }) > 0,
  score: b => (b.base.atk + b.base.mag) * 0.8 + b.base.spd * 0.3,
  req: b => [...attacks(b, 2, { cat: 'physical' }), ...attacks(b, 2, { cat: 'magic' })], atk: () => ({}),
  items: () => ['cursed_ring', 'champion_belt', 'limit_charm'], app: b => offApp(b, { mixed: true }) });
role('breaker_any', { label: 'wallbreaker', need: b => b.off >= 100, score: b => b.off * 1.4 + bestAtk(b) * 0.6 + b.base.spd * 0.2, items: b => OFF_ITEMS(b), app: b => offApp(b, { power: true }) });
role('cleaner_scarf', { label: 'Sprint Shoes cleaner',
  need: b => b.base.spd >= 90 && b.off >= 90, score: b => b.base.spd * 1.2 + b.off * 1.0,
  items: () => ['sprint_shoes', 'cursed_ring'], app: b => offApp(b, { fast: true }) });
role('cleaner_prio', { label: 'priority cleaner',
  need: b => has(b, 'prio') && b.off >= 90, score: b => b.off * 1.2 + pw(b, MV(pick(b, 'prio'))) * 1.5 + bulk(b) * 0.2,
  req: b => reqs(pick(b, mv => TAG.prio(mv) && stab(b, mv)) || pick(b, 'prio')), atk: b => ({ cat: cat(MV(pick(b, 'prio'))) }),
  items: b => ['cursed_ring', b.phys ? 'hyper_wrist' : 'wizard_earring', 'limit_charm', 'champion_belt'], app: b => offApp(b, { power: true }) });
role('fast_pivot', { label: 'fast pivot',
  need: b => has(b, 'pivot') && b.base.spd >= 80, score: b => b.base.spd * 1.0 + b.off * 0.8 + bulk(b) * 0.2,
  req: b => reqs(pick(b, 'pivot'), pick(b, 'knock')), atk: b => ({ cat: cat(MV(pick(b, 'pivot'))) }),
  items: b => ['sprint_shoes', 'germinas_boots', 'cursed_ring', ...OFF_ITEMS(b)], app: b => offApp(b, { fast: true }) });
role('bulky_pivot', { label: 'bulky pivot',
  need: b => (has(b, 'pivot') || slotWhere(b, ABT.regen) != null) && bulk(b) >= 90,
  score: b => bulk(b) * 1.0 + b.off * 0.3 + (slotWhere(b, ABT.regen) != null ? 40 : 0) + (has(b, 'heal') ? 20 : 0) + (has(b, 'pivot') ? 25 : 0),
  req: b => reqs(pick(b, 'pivot'), pick(b, 'heal'), pick(b, 'knock') || pick(b, 'cripple')),
  abil: b => slotWhere(b, ABT.regen), items: () => ['germinas_boots', 'leftover_nut', 'thornlet', 'fury_ring', 'cats_bell'], app: b => defApp(b) });
// (a VoltTurn team's bulky pivot: one that really has Repelling Shot or Arc Relay)
role('volt_pivot', { label: 'bulky pivot (Arc Relay / Repelling Shot)',
  need: b => has(b, 'pivot') && bulk(b) >= 80,
  score: b => bulk(b) * 1.0 + b.off * 0.4 + (slotWhere(b, ABT.regen) != null ? 40 : 0) + (has(b, 'heal') ? 20 : 0),
  req: b => reqs(pick(b, 'pivot'), pick(b, 'heal'), pick(b, 'knock') || pick(b, 'cripple')), atk: b => ({ cat: cat(MV(pick(b, 'pivot'))) }),
  abil: b => slotWhere(b, ABT.regen), items: () => ['germinas_boots', 'leftover_nut', 'thornlet', 'fury_ring', 'cats_bell'], app: b => defApp(b) });
role('regen_pivot', { label: 'Auto-Potion pivot',
  need: b => slotWhere(b, ABT.regen) != null && bulk(b) >= 80, score: b => bulk(b) + b.off * 0.4 + (has(b, 'pivot') ? 30 : 0),
  req: b => reqs(pick(b, 'pivot'), pick(b, 'heal'), pick(b, 'cripple') || pick(b, 'knock')),
  abil: b => slotWhere(b, ABT.regen), items: () => ['germinas_boots', 'leftover_nut', 'thornlet', 'fury_ring'], app: b => defApp(b) });
const wallRole = (id, label, f, side) => role(id, { label,
  need: b => has(b, 'heal') && f(b) >= 190,
  score: b => f(b) * 1.0 + b.off * 0.15 + (has(b, 'cripple') ? 15 : 0) + (has(b, 'hazard') || has(b, 'phaze') ? 10 : 0),
  req: b => reqs(pick(b, 'heal'), pick(b, 'toxic') || pick(b, 'burn') || pick(b, 'cripple'), pick(b, 'phaze') || pick(b, 'knock') || pick(b, 'hazard') || pick(b, 'haze')),
  items: b => side === 'def' ? ['thornlet', 'leftover_nut', 'protect_vest', 'cats_bell'] : side === 'res' ? ['leftover_nut', 'talisman', 'cats_bell', 'fury_ring'] : ['leftover_nut', 'cats_bell', 'marvel_shoes'],
  app: b => defApp(b, side === 'mixed' ? null : side) });
wallRole('phys_wall', 'physical wall', b => b.base.hp + b.base.def, 'def');
wallRole('spec_wall', 'magic wall', b => b.base.hp + b.base.res, 'res');
wallRole('mixed_wall', 'mixed wall', b => b.base.hp + Math.min(b.base.def, b.base.res) + 10, 'mixed');
role('unaware_wall', { label: 'Zen Mind wall',
  need: b => slotWhere(b, ABT.unaware) != null && has(b, 'heal'), score: b => bulk(b) + b.off * 0.2,
  req: b => reqs(pick(b, 'heal'), pick(b, 'cripple'), pick(b, 'phaze') || pick(b, 'haze')), abil: b => slotWhere(b, ABT.unaware), items: () => ['leftover_nut', 'cats_bell', 'thornlet'], app: b => defApp(b) });
role('encorer', { label: 'Encore anti-setup', need: b => has(b, 'encore') && b.base.spd >= 70, score: b => b.base.spd + b.off * 0.6 + bulk(b) * 0.3,
  req: b => reqs(pick(b, 'encore'), pick(b, 'taunt') || pick(b, 'resetFoe')), items: () => ['leftover_nut', 'safety_bit', 'germinas_boots'], app: b => offApp(b, { fast: true }) });
role('wish_support', { label: 'Star Wish support', need: b => has(b, 'wish') && bulk(b) >= 85, score: b => bulk(b) + (has(b, 'cleric') ? 25 : 0),
  req: b => reqs(pick(b, 'wish'), pick(b, mv => mv.heal > 0 && !mv.power) || pick(b, 'cleric'), pick(b, 'pivot') || pick(b, 'cripple')), items: () => ['leftover_nut', 'cats_bell', 'germinas_boots'], app: b => defApp(b) });
role('tr_pivot', { label: 'Teleport pivot (slow)', need: b => has(b, 'teleport') && b.base.spd <= 70 && bulk(b) >= 85, score: b => bulk(b) + (90 - b.base.spd) * 0.5,
  req: b => reqs(pick(b, 'teleport'), pick(b, 'heal'), pick(b, rMove('timewarp')) || pick(b, 'cripple')), abil: b => slotWhere(b, ABT.regen), items: () => ['leftover_nut', 'germinas_boots', 'cats_bell'], app: b => defApp(b) });
role('perish_trapper', { label: 'Last Refrain trapper (Perish Trap)', need: b => has(b, 'perish') && (has(b, 'block') || slotWhere(b, ABT.trap) != null), score: b => bulk(b) + b.base.spd * 0.4,
  req: b => reqs(pick(b, 'perish'), slotWhere(b, ABT.trap) != null ? null : pick(b, 'block'), pick(b, 'heal') || pick(b, 'decoy')), abil: b => slotWhere(b, ABT.trap), items: () => ['leftover_nut', 'cats_bell', 'thornlet'], app: b => defApp(b) });
role('cleric', { label: 'cleric', need: b => has(b, 'cleric') && bulk(b) >= 80, score: b => bulk(b) + (has(b, 'heal') ? 25 : 0),
  req: b => reqs(pick(b, 'cleric'), pick(b, 'heal'), pick(b, 'cripple')), items: () => ['leftover_nut', 'cats_bell', 'germinas_boots'], app: b => defApp(b) });
role('status_spreader', { label: 'status spreader',
  need: b => has(b, 'cripple') && bulk(b) >= 85, score: b => bulk(b) + (has(b, 'toxic') ? 15 : 0) + (has(b, 'burn') ? 15 : 0) + (has(b, 'heal') ? 20 : 0),
  req: b => reqs(pick(b, 'toxic') || pick(b, 'burn') || pick(b, 'cripple'), pick(b, mv => TAG.cripple(mv) && !TAG.toxic(mv)) , pick(b, 'heal')),
  items: () => ['leftover_nut', 'cats_bell', 'thornlet'], app: b => defApp(b) });
role('toxic_user', { label: 'Envenom spreader', need: b => has(b, 'toxic'), score: b => bulk(b) + (has(b, 'heal') ? 25 : 0),
  req: b => reqs(pick(b, 'toxic'), pick(b, 'heal'), pick(b, 'phaze') || pick(b, 'hazard')), items: () => ['leftover_nut', 'thornlet', 'cats_bell'], app: b => defApp(b) });
role('burn_user', { label: 'Wildfire Oil spreader', need: b => has(b, 'burn'), score: b => bulk(b) + (has(b, 'heal') ? 25 : 0),
  req: b => reqs(pick(b, 'burn'), pick(b, 'heal'), pick(b, 'knock') || pick(b, 'hazard')), items: () => ['leftover_nut', 'thornlet', 'cats_bell'], app: b => defApp(b) });
role('phazer', { label: 'phazer', need: b => has(b, 'phaze') && bulk(b) >= 80, score: b => bulk(b) + (has(b, 'heal') ? 25 : 0) + (has(b, 'hazard') ? 15 : 0),
  req: b => reqs(pick(b, 'phaze'), pick(b, 'heal'), pick(b, 'hazard') || pick(b, 'cripple')), items: () => ['leftover_nut', 'thornlet', 'cats_bell'], app: b => defApp(b) });
role('haze_user', { label: 'Rewind / Null Haze (haze) user', need: b => has(b, 'haze') || has(b, 'resetFoe'), score: b => bulk(b) + (has(b, 'heal') ? 25 : 0),
  req: b => reqs(pick(b, 'haze') || pick(b, 'resetFoe'), pick(b, 'heal'), pick(b, 'cripple')), items: () => ['leftover_nut', 'cats_bell'], app: b => defApp(b) });
role('spinner', { label: 'hazard remover', need: b => has(b, 'removal'), score: b => bulk(b) * 0.6 + b.off * 0.5 + b.base.spd * 0.3 + (has(b, 'spin') ? 10 : 0),
  req: b => reqs(pick(b, 'spin') || pick(b, 'defog'), pick(b, 'heal') || pick(b, 'pivot')), items: () => ['germinas_boots', 'leftover_nut', 'thornlet'], app: b => b.off > bulk(b) ? offApp(b) : defApp(b) });
role('anti_removal', { label: 'removal blocker',
  // (Whirlwind, Kupomon's Rapid Spin, is a Monk move: a Summoner or a floating moogle can't be touched by it, as a Ghost
  // blocks Rapid Spin. Nothing blocks Wyrmwind, the Defog: Auto-Reflect only turns back moves aimed at it)
  need: b => (b.types.includes('summoner') || slotWhere(b, ABT.float) != null) && b.off >= 85,
  score: b => b.off + bulk(b) * 0.4 + (b.types.includes('summoner') ? 20 : 0), abil: b => b.types.includes('summoner') ? null : slotWhere(b, ABT.float),
  req: b => reqs(pick(b, 'knock') || pick(b, 'taunt')), items: b => ['cursed_ring', 'leftover_nut', ...OFF_ITEMS(b)], app: b => offApp(b) });
role('taunter', { label: 'Taunt breaker', need: b => has(b, 'taunt') && b.off >= 90, score: b => b.off + b.base.spd * 0.6,
  req: b => reqs(pick(b, 'taunt')), items: b => ['cursed_ring', ...OFF_ITEMS(b)], app: b => offApp(b) });
role('knocker', { label: 'item remover', need: b => has(b, 'knock') && bulk(b) >= 80, score: b => bulk(b) * 0.6 + b.off * 0.6,
  req: b => reqs(pick(b, 'knock'), pick(b, 'pivot') || pick(b, 'heal')), items: () => ['leftover_nut', 'germinas_boots', 'thornlet'], app: b => offApp(b) });
role('tricker', { label: 'Sleight of Hand user', need: b => has(b, 'trick') && b.off >= 85, score: b => b.off + b.base.spd * 0.8,
  req: b => reqs(pick(b, 'trick')), items: b => ['sprint_shoes', b.phys ? 'hyper_wrist' : 'wizard_earring'], app: b => offApp(b, { fast: true }) });
role('weather_setter', { label: 'weather setter',
  need: (b, e) => slotWhere(b, ABT.setWeather(e.weather)) != null || has(b, wMove(e.weather)),
  score: (b, e) => (slotWhere(b, ABT.setWeather(e.weather)) != null ? 70 : 0) + bulk(b) * 0.5 + b.base.spd * 0.3 + b.off * 0.3,
  req: (b, e) => slotWhere(b, ABT.setWeather(e.weather)) != null ? reqs(pick(b, 'pivot'), pick(b, 'heal')) : reqs(pick(b, wMove(e.weather)), pick(b, 'pivot') || pick(b, 'heal')),
  abil: (b, e) => slotWhere(b, ABT.setWeather(e.weather)), items: (b, e) => [WX[e.weather].rock, 'weather_vane', 'leftover_nut', 'germinas_boots'], app: b => b.off > bulk(b) ? offApp(b) : defApp(b) });
const wAbuse = (b, w) => w === 'sandstorm' ? (b.types.some(t => WX.sandstorm.safe.includes(t)) || slotWhere(b, ABT.likesWeather(w)) != null) : (!!bestOfType(b, WX[w].boost) && b.types.includes(WX[w].boost)) || slotWhere(b, ABT.likesWeather(w)) != null;
role('weather_abuser', { label: 'weather abuser',
  need: (b, e) => wAbuse(b, e.weather) && b.off >= 90,
  score: (b, e) => b.off * 1.2 + b.base.spd * 0.5 + (WX[e.weather].boost && bestOfType(b, WX[e.weather].boost) ? pw(b, MV(bestOfType(b, WX[e.weather].boost))) : 0) + (slotWhere(b, ABT.likesWeather(e.weather)) != null ? 40 : 0),
  atk: (b, e) => ({ cat: b.phys ? 'physical' : 'magic', type: WX[e.weather].boost }), abil: (b, e) => slotWhere(b, ABT.likesWeather(e.weather)),
  items: (b, e) => ['cursed_ring', WX[e.weather].boost ? 'boost_' + WX[e.weather].boost : null, 'sprint_shoes', ...OFF_ITEMS(b)].filter(Boolean), app: b => offApp(b) });
role('weather_wall', { label: 'weather-boosted wall',
  need: (b, e) => has(b, 'heal') && bulk(b) >= 90 && (e.weather === 'sandstorm' ? b.types.includes('beast') || b.types.includes('knight') || b.types.includes('machinist')
    : e.weather === 'gloom' ? (slotWhere(b, ABT.likesWeather('gloom')) != null || typeWeak(b, 'whitemage') > 1) : e.weather === 'radiance' ? typeWeak(b, 'summoner') > 1 || has(b, 'veil') : typeWeak(b, 'machinist') > 1),
  score: b => bulk(b) + (has(b, 'cripple') ? 15 : 0), abil: (b, e) => slotWhere(b, ABT.likesWeather(e.weather)),
  req: b => reqs(pick(b, 'heal'), pick(b, 'cripple'), pick(b, 'hazard') || pick(b, 'phaze')), items: () => ['leftover_nut', 'cats_bell', 'thornlet'], app: b => defApp(b) });
// (the jobs that resist a weather's job: an attacker that hits them hard keeps the weather's answers honest)
const resisters = (type) => Object.keys(KP.CHART).filter(t => KP.eff(type, t) < 1);
role('coverage_breaker', { label: 'coverage breaker',
  need: (b, e) => b.off >= 95 && resisters(WX[e.weather] && WX[e.weather].boost || (TX[e.terrain] || {}).boost || 'knight').filter(t => atkPool(b).some(id => KP.eff(MV(id).type, t) > 1)).length >= 2,
  score: (b, e) => b.off * 1.3 + b.base.spd * 0.4, items: b => OFF_ITEMS(b), app: b => offApp(b, { power: true }) });
role('terrain_setter', { label: 'terrain setter',
  need: (b, e) => slotWhere(b, ABT.setTerrain(e.terrain)) != null || has(b, tMove(e.terrain)),
  score: (b, e) => (slotWhere(b, ABT.setTerrain(e.terrain)) != null ? 70 : 0) + bulk(b) * 0.4 + b.base.spd * 0.3 + b.off * 0.4,
  req: (b, e) => slotWhere(b, ABT.setTerrain(e.terrain)) != null ? reqs(pick(b, 'pivot')) : reqs(pick(b, tMove(e.terrain)), pick(b, 'pivot')),
  abil: (b, e) => slotWhere(b, ABT.setTerrain(e.terrain)), items: (b, e) => ['geomancers_bell', ({ rhythm: 'tuning_fork', lifestream: 'lifestream_vial', fog: 'fog_lantern', chrono: 'chrono_gear' })[e.terrain], 'germinas_boots', 'leftover_nut'], app: b => offApp(b) });
const tAbuse = (b, t) => (TX[t].boost ? b.types.includes(TX[t].boost) && !!bestOfType(b, TX[t].boost) : (has(b, 'setupP') || has(b, 'setupS') || has(b, 'setupD'))) || slotWhere(b, ABT.likesTerrain(t)) != null;
role('terrain_abuser', { label: 'terrain abuser',
  need: (b, e) => tAbuse(b, e.terrain) && b.off >= 90,
  score: (b, e) => b.off * 1.2 + b.base.spd * 0.5 + (TX[e.terrain].boost && bestOfType(b, TX[e.terrain].boost) ? pw(b, MV(bestOfType(b, TX[e.terrain].boost))) : 0) + (slotWhere(b, ABT.likesTerrain(e.terrain)) != null ? 40 : 0),
  req: (b, e) => TX[e.terrain].boost ? [] : reqs(pick(b, b.phys ? 'setupP' : 'setupS') || pick(b, 'setupD')),
  atk: (b, e) => ({ cat: b.phys ? 'physical' : 'magic', type: TX[e.terrain].boost }), abil: (b, e) => slotWhere(b, ABT.likesTerrain(e.terrain)),
  items: (b, e) => [TX[e.terrain].seed, 'cursed_ring', ...OFF_ITEMS(b)], app: b => offApp(b) });
role('room_setter', { label: 'zone setter',
  need: (b, e) => slotWhere(b, ABT.setRoom(e.room)) != null || has(b, rMove(e.room)),
  score: (b, e) => (slotWhere(b, ABT.setRoom(e.room)) != null ? 60 : 0) + bulk(b) * 0.8 + (e.room === 'timewarp' ? (120 - b.base.spd) * 0.5 : b.base.spd * 0.2),
  req: (b, e) => reqs(slotWhere(b, ABT.setRoom(e.room)) != null ? null : pick(b, rMove(e.room)), pick(b, 'heal') || pick(b, 'kaboom') || pick(b, 'destiny')),
  abil: (b, e) => slotWhere(b, ABT.setRoom(e.room)), items: (b, e) => ['turtleshell_choker', 'tranquilizer', 'leftover_nut', 'mamook_pear'], app: (b, e) => e.room === 'timewarp' ? defApp(b) : offApp(b) });
role('tr_attacker', { label: 'Time Warp attacker',
  need: b => b.base.spd <= 60 && b.off >= 95, score: b => b.off * 1.3 + (90 - b.base.spd) * 0.8 + bulk(b) * 0.3,
  items: b => [b.phys ? 'hyper_wrist' : 'wizard_earring', 'cursed_ring', 'iron_ball', 'champion_belt'], app: b => offApp(b, { slow: true }) });
role('fast_attacker', { label: 'fast attacker', need: b => b.base.spd >= 95 && b.off >= 95, score: b => b.off * 1.1 + b.base.spd, items: b => ['cursed_ring', ...OFF_ITEMS(b)], app: b => offApp(b, { fast: true }) });
role('gravity_abuser', { label: 'Gravity abuser',
  // (Gravity: accuracy x1.67, floaters grounded: the strong but shaky moves land, Monk moves reach the Pom Wings kinds)
  need: b => b.off >= 95 && atkPool(b).some(id => { const mv = MV(id); return (mv.acc !== true && mv.acc <= 85 && mv.power >= 90) || (mv.type === 'monk' && mv.power >= 80); }),
  score: b => b.off * 1.3 + atkPool(b).filter(id => { const mv = MV(id); return mv.acc !== true && mv.acc <= 85; }).length * 10,
  req: b => atkPool(b).filter(id => { const mv = MV(id); return (mv.acc !== true && mv.acc <= 85 && mv.power >= 90) || (mv.type === 'monk' && mv.power >= 80); }).sort((x, y) => pw(b, MV(y)) - pw(b, MV(x))).slice(0, 2),
  items: b => ['cursed_ring', ...OFF_ITEMS(b)], app: b => offApp(b, { power: true }) });
role('lopsided', { label: 'Wonder Zone abuser', need: b => Math.abs(b.base.def - b.base.res) >= 35 && b.off >= 85, score: b => Math.abs(b.base.def - b.base.res) * 1.5 + b.off,
  items: b => ['leftover_nut', ...OFF_ITEMS(b)], app: b => offApp(b) });
role('passer', { label: 'Mognet Relay passer (Baton Pass)',
  need: b => has(b, 'pass') && (has(b, 'setupP') || has(b, 'setupS') || has(b, 'setupD') || has(b, 'setupSpd')),
  score: b => bulk(b) * 0.6 + b.base.spd * 0.6 + (has(b, 'decoy') ? 20 : 0),
  req: b => reqs(pick(b, 'setupSpd') || pick(b, 'setupD') || pick(b, 'setupP') || pick(b, 'setupS'), pick(b, 'pass'), pick(b, 'decoy')),
  items: () => ['leftover_nut', 'cats_bell', 'safety_bit'], app: b => offApp(b, { fast: true }) });
role('doom_trapper', { label: 'Doom trapper',
  need: b => has(b, 'doom') && (has(b, 'block') || slotWhere(b, ABT.trap) != null),
  score: b => bulk(b) + b.base.spd * 0.3 + (slotWhere(b, ABT.trap) != null ? 30 : 0),
  req: b => reqs(pick(b, 'doom'), slotWhere(b, ABT.trap) != null ? null : pick(b, 'block'), pick(b, 'heal') || pick(b, 'decoy')),
  abil: b => slotWhere(b, ABT.trap), items: () => ['leftover_nut', 'cats_bell', 'thornlet'], app: b => defApp(b) });
role('trapper', { label: 'trapper',
  need: b => (slotWhere(b, ABT.trap) != null || has(b, mv => mv.trap === 'block' && mv.power > 0)) && b.off >= 85,
  score: b => b.off + b.base.spd * 0.5 + (slotWhere(b, ABT.trap) != null ? 40 : 0),
  req: b => reqs(slotWhere(b, ABT.trap) != null ? null : pick(b, mv => mv.trap === 'block' && mv.power > 0)), abil: b => slotWhere(b, ABT.trap),
  items: b => ['sprint_shoes', ...OFF_ITEMS(b)], app: b => offApp(b) });
role('sacrifice', { label: 'sacrifice support (Kaboom / Living Dead)',
  need: b => has(b, 'kaboom') || has(b, 'destiny'), score: b => b.base.spd * 0.8 + bulk(b) * 0.3 + (has(b, 'kaboom') ? 30 : 0) + (has(b, 'hazard') ? 20 : 0),
  req: b => reqs(pick(b, 'kaboom') || pick(b, 'destiny'), pick(b, 'hazard') || pick(b, 'taunt') || pick(b, 'wall')), items: () => ['safety_bit', 'tranquilizer'], app: b => offApp(b, { fast: true }) });
role('decoy_breaker', { label: 'Decoy breaker', need: b => has(b, 'decoy') && b.off >= 95, score: b => b.off * 1.2 + b.base.spd * 0.5,
  req: b => reqs(pick(b, 'decoy')), items: () => ['leftover_nut', 'cursed_ring', 'cats_bell'], app: b => offApp(b) });
role('anti_offense', { label: 'anti-offense tank',
  need: b => bulk(b) >= 95 && (has(b, 'prio') || slotWhere(b, ABT.intimidate) != null || has(b, 'heal')),
  score: b => bulk(b) + b.off * 0.4 + (slotWhere(b, ABT.intimidate) != null ? 35 : 0) + (has(b, 'prio') ? 20 : 0),
  req: b => reqs(pick(b, 'prio'), pick(b, 'heal'), pick(b, 'cripple') || pick(b, 'phaze')), abil: b => slotWhere(b, ABT.intimidate),
  items: () => ['thornlet', 'triad_card', 'chocobo_whistle', 'leftover_nut', 'fury_ring'], app: b => defApp(b) });
role('speed_control', { label: 'speed control', need: b => has(b, 'speedCtl') && b.base.spd >= 70, score: b => b.base.spd + bulk(b) * 0.3 + b.off * 0.3,
  req: b => reqs(pick(b, 'tailwind') || pick(b, 'stop') || pick(b, 'web') || pick(b, 'slow')), items: () => ['safety_bit', 'germinas_boots', 'leftover_nut'], app: b => offApp(b, { fast: true }) });
role('bulky_attacker', { label: 'bulky attacker', need: b => bulk(b) >= 95 && b.off >= 95, score: b => bulk(b) * 0.8 + b.off * 0.9,
  items: () => ['fury_ring', 'leftover_nut', 'hp_absorb', 'vampire_fang'], app: b => offApp(b, { power: true }) });
role('core_wall', { label: 'core wall', need: b => bulk(b) >= 90 && has(b, 'heal'), score: b => bulk(b) + b.off * 0.2,
  req: b => reqs(pick(b, 'heal'), pick(b, 'cripple') || pick(b, 'hazard')), items: () => BULK_ITEMS, app: b => defApp(b) });

// ------------------------------------------------------------------ the archetypes (five slots; slot 0 leads)
// A slot is a role, or 'a|b' (either, the best that fits). env: the weather / terrain / zone; core: a defensive core
// the slots marked * form ('triangle': each covers another's weakness; 'knight': a Knight with partners covering it)
const SPECS = [];
// (six a team, Pokémon's metagame size: the user, 2026-10-03. A spec written with five takes a sixth: o.sixth, or its
// playstyle's, as the guides' six-slot shells end: another cleaner for HO, a pivot for BO, removal or a wall for Balance,
// a cleric or a Zen Mind wall for Stall, another abuser for a weather or terrain, a second setter for Time Warp)
const SIXTH = (labels, o) => o.sixth || (o.env && o.env.room === 'timewarp' ? 'room_setter|tr_pivot|tr_attacker' : o.env && o.env.room === 'gravity' ? 'gravity_abuser|cleaner_scarf'
  : o.env && o.env.room ? 'breaker_any|bulky_pivot' : o.env && o.env.weather ? (/Stall/.test(labels.primary) ? 'cleric|spinner|wish_support' : 'weather_abuser|coverage_breaker')
  : o.env && o.env.terrain ? 'terrain_abuser|breaker_any' : /^Hyper/.test(labels.primary) ? 'cleaner_prio|cleaner_scarf|breaker_any'
  : /^Offense/.test(labels.primary) ? 'breaker_any|cleaner_scarf|encorer' : /^Bulky/.test(labels.primary) ? 'bulky_pivot|regen_pivot|spinner'
  : /^Fat/.test(labels.primary) ? 'cleric|wish_support|spinner' : /^Balance/.test(labels.primary) ? 'spinner|phys_wall|spec_wall|wish_support'
  : /^Semi/.test(labels.primary) ? 'cleric|spinner|wish_support' : /^Stall/.test(labels.primary) ? 'cleric|unaware_wall|wish_support|spinner' : 'breaker_any');
const spec = (key, labels, slots, o = {}) => { const six = slots.length < 6 ? slots.concat([SIXTH(labels, o)]) : slots; SPECS.push(Object.assign({ key, labels, variants: 2, env: {} }, o, { slots: six })); };
const L4 = (p, e, g, w) => ({ primary: p, engine: e, progress: g, win: w });
// the spectrum: Hyper Offense -> Offense -> Bulky Offense -> Balance -> Semi-Stall -> Stall, and the steps between
spec('ho', L4('Hyper Offense', 'Landmines + setup', 'Hazards, then setup', 'Setup sweepers'), ['hazard_lead', 'breaker_any', 'setup_phys', 'setup_spec', 'cleaner_scarf|cleaner_prio'], { variants: 3 });
spec('ho_suicide', L4('Hyper Offense', 'Suicide lead', 'Hazards + Taunt, then breakers', 'Multiple sweepers'), ['hazard_lead', 'breaker_phys', 'breaker_spec', 'setup_phys|setup_speed', 'setup_spec|cleaner_prio']);
spec('ho_screens', L4('Hyper Offense', 'Screens (Protect + Shell)', 'Setup behind screens', 'Multiple sweepers'), ['screen_setter', 'setup_phys', 'setup_spec', 'setup_speed', 'breaker_any|cleaner_prio'], { variants: 3 });
spec('ho_hazstack', L4('Hyper Offense', 'Hazard Stack', 'Chip from layered hazards', 'Setup sweeper'), ['hazard_lead', 'spiker', 'anti_removal', 'setup_phys|setup_speed', 'cleaner_prio|cleaner_scarf']);
spec('ho_webs', L4('Hyper Offense', 'Web', 'Speed control from Web', 'Mid-speed breakers'), ['web_setter', 'breaker_phys', 'breaker_spec|breaker_mixed', 'setup_phys', 'cleaner_prio']);
spec('ho_screens_webs', L4('Hyper Offense', 'Screens + Web', 'Setup Spam', 'Multiple sweepers'), ['screen_setter', 'web_setter', 'setup_phys', 'setup_spec', 'setup_speed|breaker_any']);
spec('ho_sacrifice', L4('Hyper Offense', 'Sacrifice (Kaboom / Living Dead)', 'A free setup turn', 'Setup sweepers'), ['sacrifice', 'setup_phys', 'setup_spec', 'breaker_any', 'cleaner_prio|cleaner_scarf']);
spec('ho_nonscreens', L4('Hyper Offense', 'Pure pressure (no screens)', 'Wallbreaking', 'Cleaner'), ['hazard_offense', 'breaker_phys', 'breaker_spec', 'breaker_mixed|setup_speed', 'cleaner_scarf']);
spec('setup_spam', L4('Hyper Offense', 'Setup Spam', 'Answer overloading', 'Multiple overlapping setup threats'), ['hazard_lead|hazard_offense', 'setup_phys', 'setup_spec', 'sub_setup|setup_speed', 'cleaner_prio|setup_bulky'], { variants: 3 });
spec('full_setup', L4('Offense', 'Full Setup', 'Every member boosts', 'Whoever the answers miss'), ['setup_speed', 'setup_phys', 'setup_spec', 'setup_bulky', 'sub_setup|passer']);
spec('ho_offense', L4('Hyper Offense / Offense', 'Landmines', 'Breaking with a pivot behind', 'Cleaner'), ['hazard_lead', 'breaker_phys', 'setup_phys|setup_spec', 'bulky_pivot', 'cleaner_scarf']);
spec('offense', L4('Offense', 'Hazards + removal', 'Wallbreaking', 'Cleaner'), ['hazard_offense', 'cleaner_scarf', 'breaker_mixed|breaker_spec', 'breaker_phys', 'spinner'], { variants: 3 });
spec('offense_volturn', L4('Offense', 'VoltTurn (Arc Relay / Repelling Shot)', 'Pivoting into breakers', 'Cleaner'), ['volt_pivot', 'fast_pivot', 'breaker_spec', 'breaker_phys', 'cleaner_prio|cleaner_scarf']);
spec('offense_breakers', L4('Offense', 'Wallbreaker stacking', 'Wallbreaking (physical + magic)', 'Cleaner'), ['hazard_setter|hazard_offense', 'breaker_phys', 'breaker_spec', 'bulky_pivot', 'cleaner_scarf']);
spec('offense_cleaner', L4('Offense', 'Cleaner-centred', 'Chip, then clean', 'Late-game cleaner'), ['hazard_offense', 'breaker_phys', 'breaker_spec', 'status_spreader|speed_control', 'setup_speed|cleaner_prio']);
spec('offense_choice', L4('Offense', 'Choice stacking', 'Immediate power', 'Wallbreaker / Sprint Shoes cleaner'), ['bulky_pivot', 'breaker_phys', 'breaker_spec', 'cleaner_scarf', 'tricker|hazard_setter']);
spec('offense_decoy', L4('Offense', 'Decoy (Substitute)', 'Decoy, then setup or break', 'Decoy setup sweeper'), ['hazard_offense', 'sub_setup', 'decoy_breaker', 'fast_pivot', 'cleaner_scarf|cleaner_prio']);
spec('offense_haz_volturn', L4('Offense', 'Hazard Stack + VoltTurn', 'Pivoting through layered hazards', 'Breaker'), ['hazard_setter|hazard_lead', 'spiker', 'fast_pivot', 'volt_pivot', 'cleaner_scarf|breaker_any']);
spec('offense_screens', L4('Offense', 'Screens', 'Setup behind screens, a pivot to fall back on', 'Setup sweeper'), ['screen_setter', 'bulky_pivot', 'breaker_any', 'setup_phys|setup_spec', 'cleaner_prio']);
spec('offense_bo', L4('Offense / Bulky Offense', 'Pivots', 'Breaking from safe entries', 'Cleaner'), ['bulky_pivot', 'hazard_setter', 'breaker_phys', 'breaker_spec', 'cleaner_scarf']);
spec('bo', L4('Bulky Offense', 'Pivots', 'Breakers from safe entries', 'Setup cleaner'), ['bulky_pivot', 'regen_pivot|bulky_pivot', 'breaker_spec', 'cleaner_prio|breaker_phys', 'setup_phys|setup_bulky'], { variants: 3 });
spec('bo_volturn', L4('Bulky Offense', 'VoltTurn', 'Pivoting', 'Breaker'), ['volt_pivot', 'fast_pivot', 'breaker_phys', 'breaker_spec', 'hazard_setter']);
spec('bo_hazstack', L4('Bulky Offense', 'Hazard Stack', 'Hazards + forced switches', 'Breaker'), ['hazard_setter', 'spiker', 'bulky_pivot', 'breaker_any', 'phazer|bulky_attacker']);
spec('bo_setup', L4('Bulky Offense', 'Bulky setup', 'Setup on forced switches', 'Bulky setup sweeper'), ['hazard_setter', 'setup_bulky', 'setup_phys|setup_spec', 'bulky_pivot', 'breaker_any']);
spec('bo_anti', L4('Bulky Offense', 'Anti-Offense', 'Absorb, force out, punish', 'Priority cleaner'), ['anti_offense', 'bulky_pivot', 'phys_wall|anti_offense', 'cleaner_prio', 'speed_control|breaker_any']);
spec('bo_fat', L4('Bulky Offense', 'Fat (bulky attackers)', 'Longevity', 'Bulky setup sweeper'), ['bulky_attacker', 'bulky_attacker', 'regen_pivot|bulky_pivot', 'hazard_setter', 'setup_bulky']);
spec('bo_balance', L4('Bulky Offense / Balance', 'Pivots + a magic wall', 'Breaking and walling in turn', 'Setup sweeper'), ['bulky_pivot', 'spec_wall', 'hazard_setter', 'breaker_mixed|breaker_any', 'setup_phys']);
spec('balance', L4('Balance', 'Defensive core', 'Positioning', 'Setup sweeper'), ['hazard_setter', 'spec_wall', 'bulky_pivot', 'breaker_any', 'setup_phys|setup_spec'], { variants: 3 });
spec('balance_offensive', L4('Balance (offensive)', 'Pivots', 'Breaking from pivots', 'Cleaner'), ['bulky_pivot', 'hazard_setter', 'fast_pivot', 'breaker_phys', 'breaker_spec']);
spec('balance_defensive', L4('Balance (defensive)', 'Defensive core', 'Hazard control', 'One win condition'), ['phys_wall', 'spec_wall', 'hazard_setter', 'spinner', 'setup_phys|setup_spec']);
spec('balance_fat', L4('Fat Balance', 'Auto-Potion core', 'Resetting the board', 'Bulky setup sweeper'), ['phys_wall', 'regen_pivot', 'spec_wall', 'hazard_setter', 'setup_bulky']);
spec('balance_hazstack', L4('Balance', 'Hazard Stack', 'Hazards, pivot, recover, repeat', 'Breaker'), ['hazard_setter', 'spiker', 'anti_removal', 'bulky_pivot', 'breaker_any']);
spec('balance_volturn', L4('Balance', 'VoltTurn', 'Pivoting, and walling when it must', 'Cleaner'), ['volt_pivot', 'volt_pivot', 'spec_wall', 'breaker_any', 'cleaner_scarf|cleaner_prio']);
spec('balance_regen', L4('Balance', 'Auto-Potion core', 'Switching heals', 'Breaker'), ['regen_pivot', 'regen_pivot', 'hazard_setter', 'breaker_any', 'cleaner_prio|cleaner_scarf']);
spec('balance_triangle', L4('Balance', 'Triangle core', 'Three walls covering each other', 'Setup sweeper'), ['core_wall*', 'core_wall*', 'core_wall*', 'breaker_any', 'setup_phys|setup_spec'], { core: 'triangle' });
spec('balance_knight', L4('Balance', 'Knight core (Steel-like)', 'Resistances', 'Breaker'), ['core_wall*', 'core_wall*', 'bulky_pivot*', 'breaker_any', 'cleaner_scarf|setup_phys'], { core: 'knight' });
spec('balance_removal', L4('Balance', 'Hazard control', 'Clean field, own hazards up', 'Cleaner'), ['hazard_setter', 'spinner', 'bulky_pivot', 'breaker_any', 'cleaner_scarf|cleaner_prio']);
spec('balance_status', L4('Balance', 'Status', 'Status and pressure', 'Setup sweeper'), ['status_spreader', 'spec_wall', 'bulky_pivot', 'breaker_any', 'setup_phys|setup_spec']);
spec('balance_anti', L4('Balance', 'Anti-Offense', 'Absorb and punish', 'Priority cleaner'), ['anti_offense', 'phys_wall', 'spec_wall', 'cleaner_prio', 'phazer|bulky_pivot']);
spec('balance_semistall', L4('Balance / Semi-Stall', 'Walls + cleric', 'Attrition with pressure', 'Breaker'), ['phys_wall', 'spec_wall', 'cleric', 'hazard_setter', 'breaker_any']);
spec('semistall', L4('Semi-Stall', 'Defensive core + hazards', 'Attrition', 'Setup win condition'), ['phys_wall', 'spec_wall', 'regen_pivot|bulky_pivot', 'hazard_setter', 'setup_bulky|setup_phys'], { variants: 3 });
spec('semistall_status', L4('Semi-Stall', 'Status + hazards', 'Status and phazing', 'Setup win condition'), ['toxic_user|status_spreader', 'burn_user|status_spreader', 'hazard_setter', 'phazer', 'setup_bulky|setup_spec']);
spec('semistall_breaker', L4('Semi-Stall', 'Walls + cleric', 'Attrition', 'Wallbreaker win condition'), ['phys_wall', 'spec_wall', 'cleric', 'hazard_setter', 'breaker_any']);
spec('stall', L4('Stall', 'Recovery + status + hazards', 'Attrition', 'Defensive endgame'), ['phys_wall', 'spec_wall', 'status_spreader', 'hazard_setter', 'spinner'], { variants: 3 });
spec('stall_hard', L4('Stall (hard)', 'Every slot defends', 'Denial', 'The foe runs out of ways to win'), ['phys_wall', 'spec_wall', 'mixed_wall', 'hazard_setter', 'unaware_wall|haze_user']);
spec('stall_removal', L4('Stall', 'Hazard control', 'Remove, punish, set', 'Defensive endgame'), ['hazard_setter', 'spinner', 'phys_wall', 'spec_wall', 'status_spreader']);
spec('stall_status', L4('Stall', 'Status + phazing', 'Status attrition', 'Resource collapse'), ['toxic_user|status_spreader', 'burn_user|status_spreader', 'hazard_setter', 'phazer', 'spec_wall']);
spec('stall_cooldown', L4('Stall', 'Cooldown stall (Kupomon has no PP)', 'Making the foe spend its cooldowns', 'The foe runs dry'), ['unaware_wall|mixed_wall', 'phys_wall', 'spec_wall', 'cleric', 'haze_user|phazer']);
spec('stall_denial', L4('Stall', 'Setup denial (Zen Mind, Rewind, phazing)', 'Resetting boosts', 'Defensive endgame'), ['phys_wall', 'spec_wall', 'haze_user', 'phazer', 'unaware_wall|status_spreader']);
spec('stall_phazing', L4('Stall', 'Hazard Stack + phazing', 'Hazards and forced switches', 'Hazard attrition'), ['hazard_setter', 'spiker', 'phazer', 'phys_wall', 'spec_wall']);
// weather (Gloom ~ rain, Radiance ~ sun, Sandstorm ~ sand, Manastorm ~ snow / hail)
spec('gloom_offense', L4('Offense', 'Gloom (Summoner x1.5)', 'Gloom abusers force resists', 'Weather abuser'), ['weather_setter', 'weather_abuser', 'weather_abuser', 'coverage_breaker', 'cleaner_scarf|cleaner_prio'], { env: { weather: 'gloom' } });
spec('gloom_ho', L4('Hyper Offense', 'Gloom + Landmines', 'Immediate weather pressure', 'Weather abusers'), ['weather_setter', 'hazard_lead', 'weather_abuser', 'weather_abuser', 'setup_phys|setup_spec'], { env: { weather: 'gloom' } });
spec('gloom_bo', L4('Bulky Offense', 'Gloom', 'Pivoting the setter back in', 'Weather abuser'), ['weather_setter', 'weather_abuser', 'bulky_pivot', 'fast_pivot', 'cleaner_prio|cleaner_scarf'], { env: { weather: 'gloom' } });
spec('gloom_bo_volturn_haz', L4('Bulky Offense', 'Gloom + VoltTurn + Hazard Stack', 'Pivoting through hazards', 'Late-game Gloom abuser'), ['weather_setter', 'fast_pivot', 'volt_pivot', 'spiker|hazard_setter', 'weather_abuser'], { env: { weather: 'gloom' } });
spec('gloom_balance', L4('Balance', 'Gloom', 'Defend, then 2-4 turns of Gloom', 'Weather abuser'), ['weather_setter', 'weather_abuser', 'spec_wall', 'bulky_pivot', 'setup_phys|setup_spec'], { env: { weather: 'gloom' } });
spec('gloom_stall', L4('Stall', 'Gloom', 'Gloom makes the walls harder to break', 'Defensive endgame'), ['weather_setter', 'weather_wall', 'spinner', 'spec_wall', 'phys_wall'], { env: { weather: 'gloom' } });
spec('radiance_offense', L4('Offense', 'Radiance (White Mage x1.5)', 'Boosted hits, coverage on the resists', 'Weather abuser'), ['weather_setter', 'weather_abuser', 'coverage_breaker', 'spinner|bulky_pivot', 'cleaner_scarf'], { env: { weather: 'radiance' } });
spec('radiance_ho', L4('Hyper Offense', 'Radiance', 'An immediate multiplier', 'Weather abusers'), ['weather_setter', 'weather_abuser', 'breaker_any', 'setup_phys|setup_spec', 'hazard_lead'], { env: { weather: 'radiance' } });
spec('radiance_veil', L4('Hyper Offense', 'Radiance + Veil (Aurora Veil-like)', 'Setup behind Veil', 'Setup sweepers'), ['weather_setter', 'veil_setter', 'setup_phys', 'setup_spec', 'weather_abuser'], { env: { weather: 'radiance' } });
spec('radiance_balance', L4('Balance', 'Radiance', 'Balance mode, then Radiance mode', 'Win condition'), ['weather_setter', 'weather_wall|spec_wall', 'bulky_pivot', 'breaker_any', 'weather_abuser'], { env: { weather: 'radiance' } });
spec('sand_offense', L4('Offense', 'Sandstorm', 'The storm wears them down', 'Sand abuser'), ['weather_setter', 'weather_abuser', 'breaker_phys', 'core_wall', 'cleaner_scarf|cleaner_prio'], { env: { weather: 'sandstorm' } });
spec('sand_balance', L4('Balance', 'Sandstorm', 'Sand as one layer', 'Breaker'), ['weather_setter', 'weather_wall', 'core_wall', 'spec_wall', 'breaker_any'], { env: { weather: 'sandstorm' } });
spec('sand_stall', L4('Stall', 'Sandstorm', 'Chip from the storm', 'Attrition'), ['weather_setter', 'weather_wall', 'weather_wall', 'status_spreader', 'phazer|spinner'], { env: { weather: 'sandstorm' } });
spec('sand_semistall', L4('Semi-Stall', 'Sandstorm', 'Storm chip + hazards', 'Setup win condition'), ['weather_setter', 'weather_wall', 'hazard_setter', 'spec_wall', 'setup_bulky'], { env: { weather: 'sandstorm' } });
spec('sand_bo_volturn', L4('Bulky Offense', 'Sandstorm + VoltTurn', 'Pivoting in the storm', 'Sand abuser'), ['weather_setter', 'fast_pivot', 'weather_abuser', 'volt_pivot', 'breaker_any'], { env: { weather: 'sandstorm' } });
spec('mana_offense', L4('Offense', 'Manastorm (Black Mage x1.5)', 'Boosted Black Mage hits', 'Weather abuser'), ['weather_setter', 'weather_abuser', 'weather_abuser', 'hazard_setter|hazard_offense', 'breaker_any'], { env: { weather: 'manastorm' } });
spec('mana_balance', L4('Balance', 'Manastorm', 'Walls, then the storm', 'Weather abuser'), ['weather_setter', 'weather_abuser', 'phys_wall', 'spec_wall', 'cleaner_scarf|cleaner_prio'], { env: { weather: 'manastorm' } });
// terrain (Rhythm ~ Electric, Lifestream ~ Grassy, Fog ~ Misty, Time Field ~ Psychic)
for (const [t, nm] of [['rhythm', 'Rhythm Field'], ['lifestream', 'Lifestream'], ['chrono', 'Time Field']]) {
  spec(t + '_offense', L4('Offense', nm, 'Terrain-boosted attackers', 'Terrain abuser'), ['terrain_setter', 'terrain_abuser', 'terrain_abuser', 'breaker_any', 'fast_pivot|cleaner_scarf'], { env: { terrain: t } });
  spec(t + '_balance', L4('Balance', nm, 'The terrain on a defensive backbone', 'Terrain abuser'), ['terrain_setter', 'terrain_abuser', 'spec_wall', 'phys_wall|bulky_pivot', 'setup_phys|setup_spec'], { env: { terrain: t }, variants: 1 });
}
spec('fog_balance', L4('Balance', 'Fog (Misty-like: no ailments, Dragoon weakened)', 'Setup safe from status', 'Setup sweeper'), ['terrain_setter', 'terrain_abuser', 'spec_wall', 'phys_wall', 'setup_bulky'], { env: { terrain: 'fog' } });
spec('fog_offense', L4('Offense', 'Fog', 'Status-proof sweepers', 'Setup sweepers'), ['terrain_setter', 'terrain_abuser', 'terrain_abuser', 'breaker_any', 'cleaner_prio'], { env: { terrain: 'fog' }, variants: 1 });
spec('radiance_rhythm', L4('Offense', 'Radiance + Rhythm Field', 'Two fields at once', 'Weather and terrain abusers'), ['weather_setter', 'terrain_setter', 'weather_abuser', 'terrain_abuser', 'cleaner_scarf'], { env: { weather: 'radiance', terrain: 'rhythm' }, variants: 1 });
// zones
spec('timewarp', L4('Offense', 'Time Warp (Trick Room-like)', 'Slow breakers move first', 'Time Warp attackers'), ['room_setter', 'tr_attacker', 'tr_attacker', 'room_setter|tr_attacker', 'tr_attacker'], { env: { room: 'timewarp' } });
spec('timewarp_ho', L4('Hyper Offense', 'Time Warp + sacrifice', 'Every Time Warp turn spent attacking', 'Time Warp attackers'), ['room_setter', 'sacrifice|tr_attacker', 'tr_attacker', 'tr_attacker', 'tr_attacker'], { env: { room: 'timewarp' }, variants: 1 });
spec('timewarp_dual', L4('Offense (dual-mode)', 'Semi-Time Warp', 'Time Warp against the fast, plain offense against the slow', 'Either mode'), ['room_setter', 'tr_attacker', 'tr_attacker', 'fast_attacker', 'fast_attacker|fast_pivot'], { env: { room: 'timewarp' } });
spec('gravity', L4('Offense', 'Gravity', 'Shaky moves land, floaters fall', 'Gravity abusers'), ['room_setter', 'gravity_abuser', 'gravity_abuser', 'spiker|hazard_setter', 'cleaner_scarf|breaker_any'], { env: { room: 'gravity' } });
spec('nullzone', L4('Balance', 'Null Zone (Magic Room-like)', 'Their held items switched off', 'Raw stats'), ['room_setter', 'bulky_attacker', 'breaker_any', 'phys_wall|spec_wall', 'setup_phys|setup_spec'], { env: { room: 'nullzone' }, variants: 1 });
spec('wonderzone', L4('Balance', 'Wonder Zone (Wonder Room-like)', 'Defense and Resistance swapped', 'Lopsided walls'), ['room_setter', 'lopsided', 'lopsided', 'breaker_any', 'bulky_pivot'], { env: { room: 'wonderzone' }, variants: 1 });
// specialized
spec('baton_pass', L4('Offense', 'Mognet Relay (Baton Pass)', 'Boosts passed down the line', 'The final recipient'), ['passer', 'passer', 'passer|setup_bulky', 'breaker_any', 'setup_phys|breaker_any']);
spec('doom_trap', L4('Balance', 'Doom Trap (Perish Trap-like)', 'Trap the key check, Doom it', 'The sweeper it checked'), ['doom_trapper', 'trapper|doom_trapper', 'spec_wall|bulky_pivot', 'setup_phys|setup_spec', 'cleaner_scarf|cleaner_prio']);
spec('trap_offense', L4('Offense', 'Trapping', 'Remove the key check', 'Setup sweeper'), ['trapper', 'breaker_any', 'setup_phys|setup_spec', 'hazard_offense|hazard_setter', 'cleaner_prio'], { variants: 1 });
// (the missing tools in play, content/kp_c03_tools.js: Perish Trap, Teleport Time Warp, Wish stall, Encore anti-setup)
spec('perish_trap', L4('Balance', 'Perish Trap (Last Refrain + trapping)', 'Trap the key check, sing it out', 'The sweeper it checked'), ['perish_trapper', 'trapper|doom_trapper', 'spec_wall|bulky_pivot', 'setup_phys|setup_spec', 'cleaner_scarf|cleaner_prio', 'phys_wall|wish_support']);
spec('timewarp_teleport', L4('Offense', 'Time Warp + Teleport', 'Slow pivots into slow breakers', 'Time Warp attackers'), ['room_setter', 'tr_pivot', 'tr_attacker', 'tr_attacker', 'tr_attacker', 'room_setter|tr_pivot|tr_attacker'], { env: { room: 'timewarp' }, variants: 1 });
spec('stall_wish', L4('Stall', 'Star Wish + Kupo Nap', 'Healing passed down the line', 'Defensive endgame'), ['wish_support', 'phys_wall', 'spec_wall', 'hazard_setter', 'status_spreader', 'cleric|spinner']);
spec('anti_setup', L4('Balance', 'Encore + Null Haze (anti-setup)', 'Punish every setup turn', 'Breaker'), ['encorer', 'haze_user', 'bulky_pivot', 'phys_wall|spec_wall', 'breaker_any', 'cleaner_scarf|cleaner_prio']);

// ------------------------------------------------------------------ building one team
const used = new Map();   // (kind -> how many archetype teams use it: variety across the teams)
const CAND = new Map();
const candidates = (rid, env) => {
  const k = rid + '|' + JSON.stringify(env);
  if (!CAND.has(k)) {
    const R = ROLE[rid]; if (!R) throw new Error('no role ' + rid);
    CAND.set(k, ALL.filter(b => { try { return R.need(b, env); } catch (e) { return false; } }).map(b => [b, R.score(b, env)]).sort((a, c) => c[1] - a[1]));
  }
  return CAND.get(k);
};
const defense = (bs) => {   // (every attacking job resisted by someone; no job that hits three or more hard and none resists)
  let v = 0;
  for (const t of Object.keys(KP.CHART)) {
    const weak = bs.filter(b => typeWeak(b, t) > 1).length, res = bs.filter(b => typeWeak(b, t) < 1).length;
    if (res) v += 4; if (weak >= 3 && !res) v -= 18; else if (weak >= 3) v -= 6;
  }
  return v;
};
const coreBonus = (core, cs) => {
  if (!core || cs.length < 2) return 0;
  let covered = 0, total = 0;
  for (const a of cs) for (const t of Object.keys(KP.CHART)) if (typeWeak(a, t) > 1) { total++; if (cs.some(c => c !== a && typeWeak(c, t) < 1)) covered++; }
  let v = total ? 80 * covered / total : 0;
  if (core === 'knight') v += cs.some(c => c.types.includes('knight')) ? 40 : -60;
  return v;
};
function buildTeam(sp, vi) {
  const env = sp.env, slots = sp.slots.map(s => ({ core: s.endsWith('*'), alts: s.replace('*', '').split('|') }));
  const order = slots.map((s, i) => i).sort((a, c) => Math.min(...slots[a].alts.map(r => candidates(r, env).length)) - Math.min(...slots[c].alts.map(r => candidates(r, env).length)));
  let best = null;
  for (let attempt = 0; attempt < 160; attempt++) {
    const picks = new Array(slots.length), taken = new Set(); let ok = true, sc = 0, legend = false;
    for (const i of order) {
      const opts = [];
      for (const r of slots[i].alts) for (const [b, s] of candidates(r, env).slice(0, 30)) if (!taken.has(b.sp) && !(legend && KP.isLegend({ sp: b.sp }))) opts.push([b, s * Math.pow(0.82, used.get(b.sp) || 0), r]);
      if (!opts.length) { ok = false; break; }
      opts.sort((a, c) => c[1] - a[1]);
      const top = opts.slice(0, 7), tot = top.reduce((a, o) => a + Math.max(1, o[1]) ** 2, 0);
      let x = rnd() * tot, ch = top[0];
      for (const o of top) { x -= Math.max(1, o[1]) ** 2; if (x <= 0) { ch = o; break; } }
      picks[i] = { b: ch[0], role: ch[2], s: ch[1] }; taken.add(ch[0].sp); sc += ch[1]; if (KP.isLegend({ sp: ch[0].sp })) legend = true;
    }
    if (!ok) continue;
    const bs = picks.map(p => p.b);
    sc += defense(bs) * 2 + coreBonus(sp.core, picks.filter((p, i) => slots[i].core).map(p => p.b));
    if (!best || sc > best.sc) best = { sc, picks };
  }
  if (!best) return null;
  for (const p of best.picks) used.set(p.b.sp, (used.get(p.b.sp) || 0) + 1);
  // each member's set: the role's moves, then attacks; its ability, appetite; items by the item clause
  const team = best.picks.map(p => {
    const R = ROLE[p.role], b = p.b;
    let moves = [...new Set((R.req(b, env) || []).filter(id => id && b.pool.has(id)))].slice(0, 4);
    const ao = Object.assign({ first: [] }, R.atk(b, env) || {});
    moves = moves.concat(attacks(b, 4 - moves.length, Object.assign({}, ao, { first: [] })).filter(id => !moves.includes(id)));
    if (moves.length < 4) { const more = T.pickFour(b.mon, [...b.pool].filter(id => !moves.includes(id))); for (const id of more) if (moves.length < 4 && !moves.includes(id)) moves.push(id); }
    // (always one attack with no cooldown, when the kind has one)
    if (!moves.some(id => dmg(MV(id)) && !MV(id).cd)) {
      const free = atkPool(b).filter(id => !MV(id).cd).sort((x, y) => pw(b, MV(y)) - pw(b, MV(x)))[0];
      if (free) { const req = new Set(R.req(b, env) || []); const j = moves.map((id, k) => [id, k]).reverse().find(([id]) => !req.has(id)); if (j) moves[j[1]] = free; else if (moves.length < 4) moves.push(free); }
    }
    const ws = KP.WC_SETS && KP.WC_SETS[b.sp];
    let abil = R.abil(b, env); if (abil == null) abil = ws ? ws.abil : 0;
    const app = R.app(b, env) || (ws && ws.app) || 'content';
    return { sp: b.sp, role: p.role, label: R.label, moves: moves.slice(0, 4), abil, app, items: [...(R.items(b, env) || []), ...((ws && ws.held.map(h => h[0])) || []), ...BULK_ITEMS].filter(k => k && KP.ITEMS[k] && KP.ITEMS[k].kind === 'held' && (!KP.ITEMS[k].forSpecies || KP.ITEMS[k].forSpecies.includes(b.sp))) };
  });
  const usedItems = new Set();
  for (const m of team) { m.held = m.items.find(k => !usedItems.has(k)) || null; if (m.held) usedItems.add(m.held); delete m.items; }
  return team;
}

// ------------------------------------------------------------------ who fields them: names, looks, words
const NAMES = ['Aldric', 'Brienne', 'Cassia', 'Dorian', 'Elowen', 'Faris', 'Gwen', 'Hale', 'Isolde', 'Jarek', 'Kestra', 'Lorcan', 'Mira', 'Nolan', 'Orla', 'Pell', 'Quill', 'Rhosyn',
  'Soren', 'Tamsin', 'Ulric', 'Vesna', 'Wren', 'Xander', 'Yara', 'Zeke', 'Anwen', 'Bastian', 'Corin', 'Delphine', 'Emrys', 'Fenna', 'Garrick', 'Hesper', 'Ivo', 'Juniper',
  'Kael', 'Liora', 'Marek', 'Nessa', 'Osric', 'Petra', 'Ronan', 'Saskia', 'Tobin', 'Una', 'Viggo', 'Willa', 'Yusuf', 'Zinnia', 'Ambrose', 'Briar', 'Cedric', 'Dagny',
  'Ewan', 'Freya', 'Gideon', 'Hollis', 'Ingrid', 'Jory', 'Kaia', 'Leif', 'Maren', 'Niall', 'Oona', 'Piers', 'Rosalind', 'Silas', 'Thea', 'Ulla', 'Vaughn', 'Wynn',
  'Axel', 'Bryony', 'Caspian', 'Dahlia', 'Edric', 'Fiora', 'Gunnar', 'Helka', 'Idris', 'Jessamy', 'Kit', 'Linnea', 'Magnus', 'Noor', 'Oswin', 'Philippa', 'Reza', 'Signe',
  'Tavish', 'Ursa', 'Valen', 'Winona', 'Yorick', 'Zora', 'Alaric', 'Belen', 'Cato', 'Dulcie', 'Eamon', 'Flint', 'Greer', 'Hamish', 'Iona', 'Joss', 'Keira', 'Lyle',
  'Morwen', 'Nico', 'Odile', 'Pascal', 'Renata', 'Stellan', 'Tilda', 'Ulf', 'Verity', 'Warrick', 'Ysolde', 'Zoltan', 'Agnes', 'Bram', 'Celeste', 'Desmond', 'Esme',
  'Fergus', 'Galina', 'Hector', 'Imogen', 'Jasper', 'Kira', 'Lucan', 'Maeve', 'Neve', 'Olwen', 'Perrin', 'Rowena', 'Sable', 'Tristan', 'Uma', 'Vito', 'Wilhelmina',
  'Anselm', 'Beatrix', 'Conall', 'Dove', 'Elric', 'Fianna', 'Gaspard', 'Honora', 'Ignatz', 'Jolene', 'Kasimir', 'Lark', 'Mabyn', 'Nils', 'Ottilie', 'Quentin',
  'Rhiannon', 'Sorrel', 'Thane', 'Ulrika', 'Vance', 'Wilda', 'Yves', 'Zelda', 'Arden', 'Bree', 'Callum', 'Darcy', 'Emeric', 'Faye', 'Godric', 'Hazel',
  'Isak', 'Jinx', 'Keane', 'Lisette', 'Mathis', 'Nadia', 'Orrin', 'Pip', 'Rafe', 'Sunniva', 'Torin', 'Vela'];
const CLASS = { 'Hyper Offense': 'Blitz Ace', 'Offense': 'Ace Trainer', 'Bulky Offense': 'Vanguard', 'Balance': 'Tactician', 'Fat Balance': 'Tactician', 'Semi-Stall': 'Sentinel', 'Stall': 'Warden' };
const classOf = (s) => s.env.weather ? ({ gloom: 'Stormcaller', radiance: 'Sunseeker', sandstorm: 'Dune Rider', manastorm: 'Mana Witch' })[s.env.weather]
  : s.env.terrain ? ({ rhythm: 'Maestro', lifestream: 'Druid', fog: 'Fogwalker', chrono: 'Chronomancer' })[s.env.terrain]
  : s.env.room ? ({ timewarp: 'Time Warper', gravity: 'Gravitist', nullzone: 'Nullifier', wonderzone: 'Illusionist' })[s.env.room]
  : s.key === 'baton_pass' ? 'Relay Captain' : /doom|trap/.test(s.key) ? 'Doomsayer' : CLASS[Object.keys(CLASS).find(k => s.labels.primary.startsWith(k)) || 'Offense'];
const PAL = [['#c03030', '#2a2a34'], ['#e07020', '#3a2a20'], ['#d8b030', '#3a3a2a'], ['#3a9a50', '#2a3a2a'], ['#30a0a0', '#203a3a'], ['#3050c0', '#22263a'],
  ['#8040b0', '#2a2234'], ['#c04080', '#3a2230'], ['#808890', '#2a2a2a'], ['#f0f0f0', '#4a4a5a']];
const HAIR = ['ponytail', 'short', 'bun', 'slick', 'longstraight', 'spiky', 'bob', 'longmessy', 'buzz', 'braid', 'tuft', 'long'];
const EXTRAS = [[], ['vest'], ['glasses'], ['cape'], ['headband'], ['sash'], ['goggles'], ['bowtie'], ['robe', 'sash'], ['harness']];
const lookOf = (i, s) => {
  const fem = i % 2 === 1, age = i % 7 === 3 ? 'old' : '', base = age ? (fem ? 'oldwoman' : 'oldman') : (fem ? 'woman' : 'man') + (1 + (i * 3) % 9);
  const famC = s.env.weather ? { gloom: 6, radiance: 2, sandstorm: 1, manastorm: 6 }[s.env.weather] : s.env.terrain ? { rhythm: 7, lifestream: 3, fog: 9, chrono: 2 }[s.env.terrain] : s.env.room ? 6
    : /Hyper/.test(s.labels.primary) ? 0 : /^Offense/.test(s.labels.primary) ? 1 : /Bulky/.test(s.labels.primary) ? 2 : /Balance/.test(s.labels.primary) ? 3 : /Semi/.test(s.labels.primary) ? 4 : 5;
  const c = PAL[(famC + (i % 3 === 2 ? 1 : 0)) % PAL.length];
  return { base, top: c[0], bottom: c[1], jacket: PAL[(famC + 5) % PAL.length][0], hairStyle: age ? (fem ? 'bun' : 'bald') : HAIR[(i * 5) % HAIR.length], extras: EXTRAS[(i * 7) % EXTRAS.length] };
};
const WORDS = {
  'Hyper Offense': [['Too slow to stop me... and still I fell.', 'Hazards up, sweep done. Next!'], ['You weathered the storm. Few do.', 'Every turn I took, you paid for.']],
  'Offense': [['Out-positioned. Well played.', 'The breakers did their job. The cleaner did the rest.'], ['You found the gap in my offense.', 'Momentum, kupo. You never got it back.']],
  'Bulky Offense': [['My pivots ran out of safe turns.', 'In, out, in again... and you had nothing left.'], ['You broke the backbone. Respect.', 'Bulky enough to take it, strong enough to end it.']],
  'Balance': [['You read every exchange.', 'Resource management wins tournaments.'], ['My core cracked. Good game.', 'Scout, deny, trade, win. Textbook.']],
  'Semi-Stall': [['You broke through before my finisher came.', 'Defend, wear down, finish. As planned.'], ['My walls were not enough this time.', 'You had no answer to the endgame.']],
  'Stall': [['Something finally got through my walls.', 'You ran out of ways to hurt me.'], ['A wallbreaker... I knew it would be one.', 'Attrition is patience. Patience wins.']],
};
const wordsOf = (s, i) => { const k = Object.keys(WORDS).find(x => s.labels.primary.startsWith(x)) || 'Offense'; const w = WORDS[k][i % 2];
  const eng = s.env.weather ? ` Without my ${WX[s.env.weather].name}, I was just another trainer.` : s.env.terrain ? ` The ${TX[s.env.terrain].name} wasn't enough.` : s.env.room ? ` ${ROOMNAME[s.env.room]} ran out on me.` : '';
  return { lose: w[0] + (i % 3 === 0 ? eng : ''), win: w[1] }; };

// ------------------------------------------------------------------ the run
const out = [], seenNames = new Set();
let ni = 0;
for (const s of SPECS) {
  if (only && !only.has(s.key)) continue;
  for (let v = 0; v < s.variants; v++) {
    const team = buildTeam(s, v);
    if (!team) { console.error(`! ${s.key} #${v + 1}: no team (a slot nobody fits)`); continue; }
    // (a name only, no title: the user, 2026-10-03, "remove that title because its making the names too long")
    let nm; do { nm = NAMES[ni++ % NAMES.length]; } while ((seenNames.has(nm) || KP.TRAINER_POOL.some(t => t.name === nm)) && ni < NAMES.length * 3);
    const name = nm; seenNames.add(nm);
    const L = s.labels, style = `${L.primary} / ${L.engine} / ${L.progress} / ${L.win}`;
    out.push(Object.assign({ name, key: s.key, style, model: lookOf(out.length, s), lead: 0, team }, wordsOf(s, out.length)));
    if (verbose) console.error(`${name}: ${style}\n   ` + team.map(m => `${m.sp} (${m.label}: ${m.moves.map(id => MV(id).name).join(', ')}; ${(AB((KP.SPECIES_ABIL[m.sp] || [])[m.abil])).name || '-'}; ${m.held ? KP.ITEMS[m.held].name : '-'}; ${KP.APPETITES[m.app].name})`).join('\n   '));
  }
}
console.error(`${out.length} archetype teams from ${SPECS.length} specs; ${used.size} different kinds`);

// the content file
const q = (x) => JSON.stringify(x);
const lines = ["// GENERATED by tools/kp_archetypes.js: the World Championship's archetype opponents (docs/KUPOMON_METAGAME.md,",
  "// docs/KUPOMON_WC_TEAMS.md). Every trainer fields one of the Showdown OU archetypes in Kupomon terms: a five-moogle",
  "// team of roles, labelled primary / engine / progress / win condition. Don't edit by hand: change the tool, run it again.",
  '(function () {', '  const KP = FF7.kupomon;', '  KP.WC_ARCHETYPES = ['];
for (const t of out) {
  lines.push(`    { name: ${q(t.name)}, key: ${q(t.key)}, style: ${q(t.style)}, lead: ${t.lead},`);
  lines.push(`      model: ${q(t.model)},`);
  lines.push(`      lose: ${q(t.lose)}, win: ${q(t.win)},`);
  lines.push(`      team: [${t.team.map(m => `\n        [${q(m.sp)}, 50, { fixed: true, role: ${q(m.role)}, abil: ${m.abil}, app: ${q(m.app)}, held: ${q(m.held)}, moves: ${q(m.moves)} }]`).join(',')}] },`);
}
lines.push('  ];', '})();', '');
// the doc: every team, role by role
const doc = ['# The World Championship\'s archetype opponents', '',
  'Generated by `tools/kp_archetypes.js` from the two Showdown OU archetype guides (their Kupomon translation:',
  '[KUPOMON_METAGAME.md](KUPOMON_METAGAME.md)). They enter the **World Championship only** (the Coliseum\'s fifth',
  'tournament, a bracket of sixteen: eight of them beside the main game\'s seven). Each team is five moogles at the level cap, +5, perfect IVs,',
  'labelled with the guides\' four labels: primary playstyle / engine / progress / win condition. Its lead is slot 1',
  '(team preview: it always leads with it). Run the tool again after a change to moves, abilities, items or kinds.', '',
  `${out.length} teams from ${SPECS.length} archetype specs, ${used.size} different kinds.`, ''];
let lastKey = null;
for (const t of out) {
  if (t.key !== lastKey) { doc.push(`## ${t.style.split(' / ').slice(0, 2).join(' / ')} (\`${t.key}\`)`, ''); lastKey = t.key; }
  doc.push(`**${t.name}**: ${t.style}`, '');
  doc.push('| Slot | Moogle | Role | Moves | Ability | Item | Appetite |', '|---|---|---|---|---|---|---|');
  t.team.forEach((m, i) => doc.push(`| ${i + 1} | ${KP.SPECIES[m.sp].moogle} (${[KP.SPECIES[m.sp].type, KP.SPECIES[m.sp].type2].filter(Boolean).map(x => KP.TYPE_NAMES ? KP.TYPE_NAMES[x] || x : x).join('/')}) | ${m.label} | ${m.moves.map(id => MV(id).name).join(', ')} | ${(AB((KP.SPECIES_ABIL[m.sp] || [])[m.abil])).name || '-'} | ${m.held ? KP.ITEMS[m.held].name : '-'} | ${KP.APPETITES[m.app].name} |`));
  doc.push('');
}
if (!dry) {
  fs.writeFileSync(path.join(ROOT, OUT), lines.join('\n'));
  fs.writeFileSync(path.join(ROOT, DOC), doc.join('\n'));
  console.error('wrote ' + OUT + ' and ' + DOC);
}
