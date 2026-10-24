// Kupomon expansion content check (docs/KUPOMON_CONTENT.md): every pack handed to KP.content (js/kupomon/content/*.js)
// against the vocabulary of docs/KUPOMON_MECHANICS.md and the content rules (stat totals by stage and class, evolution
// levels, learnsets that always leave an attack with no cooldown, names that fit the screens, looks built from real
// model parts). Packs in js/kupomon/content/ that the loader doesn't list yet are loaded here too.
//   node tools/kp_contentcheck.js [--pack name] [-v]       exit 1 on any error
const fs = require('fs'), path = require('path');
const { boot, ROOT } = require('./sim_prelude');
const { FF7, load } = boot();
const KP = FF7.kupomon;
const argv = process.argv.slice(2), only = argv.includes('--pack') ? argv[argv.indexOf('--pack') + 1] : null, verbose = argv.includes('-v');
const errs = [], warns = [];
const err = (p, s) => errs.push(`[${p}] ${s}`), warn = (p, s) => warns.push(`[${p}] ${s}`);

// ------------------------------------------------------------------ the packs not in the loader yet
const loaderSrc = fs.readFileSync(path.join(ROOT, 'js/loader.js'), 'utf8');
const dir = path.join(ROOT, 'js/kupomon/content');
const before = { moves: new Set(Object.keys(KP.MOVES)), abilities: new Set(Object.keys(KP.ABILITIES)), items: new Set(Object.keys(KP.ITEMS)) };
if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort()) {
  const rel = 'js/kupomon/content/' + f;
  if (!loaderSrc.includes(rel)) { try { load(rel); } catch (e) { errs.push(`[${f}] failed to load: ${e.message}`); } }
}
const packs = Object.keys(KP.CONTENT || {}).filter(p => !only || p === only);
if (only && !packs.length) { console.log(`no pack named ${only} (packs: ${Object.keys(KP.CONTENT || {}).join(', ') || 'none'})`); process.exit(1); }

// ------------------------------------------------------------------ the vocabulary
const TYPES = new Set(KP.TYPES), STATS = ['hp', 'atk', 'def', 'mag', 'res', 'spd'], STAGE_STATS = new Set(['atk', 'def', 'mag', 'res', 'spd', 'crit']);
const STATUSES = new Set(Object.keys(KP.STATUS)), VOLS = new Set(Object.keys(KP.VOLATILES));
const FLAGS = new Set(['contact', 'punch', 'bite', 'slice', 'sound', 'pulse', 'bullet', 'wind', 'dance', 'powder']);
const MOVE_KEYS = new Set(['name', 'type', 'power', 'acc', 'cd', 'desc', 'cat', 'prio', 'crit', 'alwaysCrit', 'flags', 'hits', 'recoil', 'drain', 'hpCost', 'crash',
  'rest', 'wish', 'perish', 'courtChange', 'resetFoe',   // (the missing tools: content/kp_c03_tools.js)
  'selfFaint', 'recharge', 'charge', 'hitsInvuln', 'rampage', 'ohko', 'fixed', 'counter', 'powerBy', 'typeBy', 'useStat', 'statFrom', 'hitStat', 'ignoreDefStages',
  'breakWalls', 'knockOff', 'stealItem', 'trap', 'bypassGuard', 'firstTurnOnly', 'onlyIfFoeAttacks', 'selfSwitch', 'forceSwitch', 'status', 'flinch', 'foe', 'foeChance',
  'self', 'selfChance', 'stat', 'vol', 'heal', 'cures', 'weather', 'terrain', 'room', 'side', 'hazard', 'clearHazards', 'guard', 'endure', 'haze', 'invertFoe',
  'cureTeam', 'trick', 'fx', 'sig']);
const ABIL_KEYS = new Set([...KP.ABILITY_FLAGS, ...Object.keys(KP.ABILITY_EFFECTS)]);
const ITEM_KEYS = new Set([...KP.ITEM_FLAGS, ...Object.keys(KP.ITEM_EFFECTS), 'kind', 'price', 'shop', 'find']);
const HABITATS = new Set(['grass', 'forest', 'beach', 'sea', 'mountain', 'cave', 'snow', 'desert', 'ruins', 'swamp', 'night', 'sky', 'town', 'lifestream', 'crater', 'factory', 'volcano']);
const RARITY = new Set(['common', 'uncommon', 'rare', 'none']), CLASSES = new Set(['normal', 'pseudo', 'breed', 'legend', 'mythical']);
// the model parts (js/kupomon/kp_models.js: the base tables and every Object.assign onto them)
const models = fs.readFileSync(path.join(ROOT, 'js/kupomon/kp_models.js'), 'utf8');
const PARTS = { HATS: new Set(), BODIES: new Set(), WEAPONS: new Set(), EXTRAS: new Set(), SHIELDS: new Set() };
for (const n of Object.keys(PARTS)) for (const pat of ['const ' + n + ' = {', 'Object.assign(' + n + ', {']) {
  let p = 0;
  while ((p = models.indexOf(pat, p)) >= 0) {
    let i = models.indexOf('{', p), d = 0, k = i;
    for (; k < models.length; k++) { const c = models[k]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } }
    const re = /^    ([a-z_0-9]+)(?:: |\()/gm, body = models.slice(i + 1, k); let m;
    while ((m = re.exec(body))) PARTS[n].add(m[1]);
    p += pat.length;
  }
}
const HEX = /^#[0-9a-fA-F]{6}$/;
const isNum = (v) => typeof v === 'number' && isFinite(v);
const frac = (v) => isNum(v) && v > 0 && v <= 1;
const boosts = (p, what, b) => { if (!b || typeof b !== 'object') return err(p, `${what}: not { stat: n }`); for (const [k, n] of Object.entries(b)) { if (!STAGE_STATS.has(k)) err(p, `${what}: no stat ${k}`); if (!Number.isInteger(n) || !n || Math.abs(n) > 12) err(p, `${what}.${k}: ${n}`); } };
const len = (p, what, s, max) => { if (typeof s !== 'string' || !s.trim()) err(p, `${what} missing`); else if (s.length > max) err(p, `${what} too long (${s.length} > ${max}): "${s}"`); };

// ------------------------------------------------------------------ moves
const checkMove = (pack, id, m) => {
  const p = `${pack} move ${id}`;
  if (!/^[a-z][a-z0-9_]*$/.test(id)) err(p, 'id: lower_snake_case');
  for (const k of Object.keys(m)) if (!MOVE_KEYS.has(k)) err(p, `unknown key ${k}`);
  len(p, 'name', m.name, 15); len(p, 'desc', m.desc, 70);
  if (m.type !== null && !TYPES.has(m.type)) err(p, `type ${m.type}`);
  if (!isNum(m.power) || m.power < 0 || m.power > 250) err(p, `power ${m.power}`);
  if (!(m.acc === true || (isNum(m.acc) && m.acc >= 1 && m.acc <= 100))) err(p, `acc ${m.acc}`);
  if (!Number.isInteger(m.cd) || m.cd < 0 || m.cd > 5) err(p, `cd ${m.cd}`);
  if (m.cat && !['physical', 'magic', 'status'].includes(m.cat)) err(p, `cat ${m.cat}`);
  const dmgKey = m.fixed != null || m.ohko || m.counter || m.powerBy;
  const cat = KP.category(m);
  if (dmgKey && cat === 'status') err(p, 'fixed / ohko / counter / powerBy need power or cat');
  if (m.cat === 'status' && m.power) err(p, 'a status move with power');
  if (m.prio != null && (!Number.isInteger(m.prio) || m.prio < -7 || m.prio > 5)) err(p, `prio ${m.prio}`);
  if (m.crit != null && (!Number.isInteger(m.crit) || m.crit < 1 || m.crit > 3)) err(p, `crit ${m.crit}`);
  if (m.flags) { if (!Array.isArray(m.flags)) err(p, 'flags: a list'); else m.flags.forEach(f => FLAGS.has(f) || err(p, `flag ${f}`)); }
  if (m.hits != null && !(Number.isInteger(m.hits) && m.hits >= 2 && m.hits <= 10) && !(Array.isArray(m.hits) && m.hits.length === 2 && m.hits[0] >= 1 && m.hits[1] > m.hits[0] && m.hits[1] <= 10)) err(p, `hits ${JSON.stringify(m.hits)}`);
  for (const k of ['recoil', 'drain', 'hpCost', 'crash']) if (m[k] != null && !frac(m[k])) err(p, `${k} ${m[k]}`);
  if (m.heal != null && m.heal !== 0.5) err(p, 'heal is always 0.5 (the user\'s rule)');
  if (m.cures && (!Array.isArray(m.cures) || m.cures.some(k => !STATUSES.has(k)))) err(p, `cures ${m.cures}`);
  if (m.charge != null) { if (typeof m.charge !== 'object') err(p, 'charge: an object'); else { for (const k of Object.keys(m.charge)) if (!['text', 'invuln', 'skipIn', 'self'].includes(k)) err(p, `charge.${k}`); if (m.charge.invuln && !['air', 'under', 'vanish'].includes(m.charge.invuln)) err(p, `charge.invuln ${m.charge.invuln}`); if (m.charge.self) boosts(p, 'charge.self', m.charge.self); if (m.charge.skipIn && !(KP.WEATHERS[m.charge.skipIn] || KP.TERRAINS[m.charge.skipIn])) err(p, `charge.skipIn ${m.charge.skipIn}`); } }
  if (m.hitsInvuln && (!Array.isArray(m.hitsInvuln) || m.hitsInvuln.some(k => !['air', 'under', 'vanish'].includes(k)))) err(p, 'hitsInvuln');
  if (m.fixed != null && !(['level', 'half', 'equal'].includes(m.fixed) || (Number.isInteger(m.fixed) && m.fixed > 0 && m.fixed < 300))) err(p, `fixed ${m.fixed}`);
  if (m.counter && !['physical', 'magic', 'any'].includes(m.counter)) err(p, `counter ${m.counter}`);
  if (m.powerBy && !KP.POWER_BY[m.powerBy]) err(p, `powerBy ${m.powerBy}`);
  if (m.typeBy && !['user', 'weather', 'terrain'].includes(m.typeBy)) err(p, `typeBy ${m.typeBy}`);
  for (const k of ['useStat', 'hitStat']) if (m[k] && !['atk', 'def', 'mag', 'res', 'spd'].includes(m[k])) err(p, `${k} ${m[k]}`);
  if (m.statFrom && m.statFrom !== 'target') err(p, `statFrom ${m.statFrom}`);
  if (m.trap && !['bind', 'block'].includes(m.trap)) err(p, `trap ${m.trap}`);
  if (m.selfSwitch && m.selfSwitch !== true && m.selfSwitch !== 'pass') err(p, `selfSwitch ${m.selfSwitch}`);
  if (m.status) {
    const [k, ch] = m.status, ks = Array.isArray(k) ? k : [k];
    if (ks.some(x => !STATUSES.has(x))) err(p, `status ${JSON.stringify(m.status)}`);
    if (!(isNum(ch) && ch > 0 && ch <= 100)) err(p, `status chance ${ch}`);
  }
  if (m.flinch != null && !(isNum(m.flinch) && m.flinch > 0 && m.flinch <= 100)) err(p, `flinch ${m.flinch}`);
  if (m.foe) boosts(p, 'foe', m.foe); if (m.self) boosts(p, 'self', m.self);
  for (const k of ['foeChance', 'selfChance']) if (m[k] != null && !(isNum(m[k]) && m[k] > 0 && m[k] <= 100)) err(p, `${k} ${m[k]}`);
  if (m.stat) { const [k, n, who, ch] = m.stat; if (!STAGE_STATS.has(k) || !Number.isInteger(n) || !['self', 'foe'].includes(who) || (ch != null && !(ch > 0 && ch <= 100))) err(p, `stat ${JSON.stringify(m.stat)}`); }
  if (m.vol) { if (typeof m.vol !== 'object') err(p, 'vol: an object'); else for (const k of Object.keys(m.vol)) if (!VOLS.has(k)) err(p, `vol ${k}`); }
  if (m.weather && !KP.WEATHERS[m.weather]) err(p, `weather ${m.weather}`);
  if (m.terrain && !KP.TERRAINS[m.terrain]) err(p, `terrain ${m.terrain}`);
  if (m.room && !KP.ROOMS[m.room]) err(p, `room ${m.room}`);
  if (m.side && !KP.SIDE_CONDS[m.side]) err(p, `side ${m.side}`);
  if (m.hazard && !KP.HAZARDS[m.hazard]) err(p, `hazard ${m.hazard}`);
  if (m.clearHazards && !['own', 'all'].includes(m.clearHazards)) err(p, `clearHazards ${m.clearHazards}`);
  if (m.guard != null && m.guard !== true && !(typeof m.guard === 'object' && Object.keys(m.guard).every(k => ['hurt', 'status', 'foe'].includes(k)))) err(p, `guard ${JSON.stringify(m.guard)}`);
  if ((m.guard || m.endure) && !(m.cd >= 1)) err(p, 'a guard or endure needs a cooldown of 1 or more');
  if ((m.guard || m.endure) && m.prio !== 4) warn(p, 'a guard or endure usually has prio 4');
  // does it do anything at all
  if (cat === 'status') {
    const does = ['status', 'foe', 'self', 'stat', 'vol', 'heal', 'weather', 'terrain', 'room', 'side', 'hazard', 'clearHazards', 'guard', 'endure', 'haze', 'invertFoe', 'cureTeam', 'trick', 'forceSwitch', 'selfSwitch', 'trap', 'rest', 'wish', 'perish', 'courtChange'].some(k => m[k]);
    if (!does) err(p, 'a status move that does nothing');
    if (m.status && m.status[1] < 100 && !m.foe && !m.vol) warn(p, `a status move with a ${m.status[1]}% ailment (its accuracy is the chance: use 100)`);
  } else {
    // power and cooldown norms (docs/KUPOMON_MECHANICS.md)
    const drawback = m.recharge || m.charge || m.recoil >= 0.33 || m.selfFaint || m.hpCost || (m.self && Object.values(m.self).some(n => n < 0)) || m.crash || m.rampage || (m.acc !== true && m.acc <= 80) || m.firstTurnOnly || m.onlyIfFoeAttacks;
    const pw = (m.power || 0) * (Array.isArray(m.hits) ? 3 : m.hits || 1);
    if (m.cd === 0 && pw > 75 && !drawback) warn(p, `power ${pw} with no cooldown`);
    if (pw >= 110 && m.cd < 2 && !drawback) warn(p, `power ${pw} with cooldown ${m.cd}`);
    if (pw >= 140 && !drawback) warn(p, `power ${pw} with no drawback`);
  }
};

// ------------------------------------------------------------------ abilities and items
const checkAbility = (pack, id, a) => {
  const p = `${pack} ability ${id}`;
  if (!/^[a-z][a-z0-9_]*$/.test(id)) err(p, 'id: lower_snake_case');
  for (const k of Object.keys(a)) if (!ABIL_KEYS.has(k) && !/^on[A-Z]/.test(k)) err(p, `unknown key ${k}`);
  len(p, 'name', a.name, 16); len(p, 'desc', a.desc, 64);
  if (Object.keys(a).filter(k => k !== 'name' && k !== 'desc').length === 0) err(p, 'does nothing');
  for (const k of ['setWeather']) if (a[k] && !KP.WEATHERS[a[k]]) err(p, `${k} ${a[k]}`);
  if (a.setTerrain && !KP.TERRAINS[a.setTerrain]) err(p, `setTerrain ${a.setTerrain}`);
  if (a.setRoom && !KP.ROOMS[a.setRoom]) err(p, `setRoom ${a.setRoom}`);
  for (const k of ['immune', 'resist']) if (a[k]) { const ts = Array.isArray(a[k]) ? a[k] : Object.keys(a[k]); ts.forEach(t => TYPES.has(t) || err(p, `${k} type ${t}`)); }
  if (a.noStatus && a.noStatus !== 'all' && (!Array.isArray(a.noStatus) || a.noStatus.some(k => !STATUSES.has(k) && !VOLS.has(k)))) err(p, `noStatus ${a.noStatus}`);
  for (const k of ['onResidualBoost', 'onKOBoost', 'absorbBoost']) if (a[k]) boosts(p, k, a[k]);
  if (a.onEnter) { const kn = a.onEnter.foe || a.onEnter.self; if (!kn || !STAGE_STATS.has(kn[0]) || !Number.isInteger(kn[1])) err(p, 'onEnter'); }
  if (a.onEnterBoosts) { if (a.onEnterBoosts.self) boosts(p, 'onEnterBoosts.self', a.onEnterBoosts.self); if (a.onEnterBoosts.foe) boosts(p, 'onEnterBoosts.foe', a.onEnterBoosts.foe); }
  if (a.whenHit) for (const w of [].concat(a.whenHit)) { for (const k of Object.keys(w)) if (!['cat', 'type', 'contact', 'superEff', 'crit', 'chance', 'boosts', 'max', 'foe', 'status', 'hurt', 'weather', 'terrain', 'hazard'].includes(k)) err(p, `whenHit.${k}`); if (w.boosts) boosts(p, 'whenHit.boosts', w.boosts); if (w.foe) boosts(p, 'whenHit.foe', w.foe); if (w.status && !STATUSES.has(w.status[0])) err(p, 'whenHit.status'); if (w.hazard && !KP.HAZARDS[w.hazard]) err(p, 'whenHit.hazard'); }
  if (a.flagBoost) Object.keys(a.flagBoost).forEach(f => FLAGS.has(f) || f === 'recoil' || err(p, `flagBoost ${f}`));
  if (a.flagImmune) a.flagImmune.forEach(f => FLAGS.has(f) || err(p, `flagImmune ${f}`));
  if (a.statMul) Object.keys(a.statMul).forEach(k => ['atk', 'def', 'mag', 'res', 'spd'].includes(k) || err(p, `statMul ${k}`));
};
const checkItem = (pack, id, it) => {
  const p = `${pack} item ${id}`;
  if (!/^[a-z][a-z0-9_]*$/.test(id)) err(p, 'id: lower_snake_case');
  for (const k of Object.keys(it)) if (!ITEM_KEYS.has(k) && !/^on[A-Z]/.test(k)) err(p, `unknown key ${k}`);
  len(p, 'name', it.name, 18); len(p, 'desc', it.desc, 90);
  if (it.kind !== 'held') err(p, `kind ${it.kind} (packs add held items)`);
  if (!Number.isInteger(it.price) || it.price < 0) err(p, `price ${it.price}`);
  if (Object.keys(it).filter(k => !['name', 'desc', 'kind', 'price', 'once', 'shop', 'find'].includes(k)).length === 0) err(p, 'does nothing');
  for (const k of ['gem', 'resistBerry', 'sludge', 'boost']) if (it[k] && !TYPES.has(it[k])) err(p, `${k} type ${it[k]}`);
  if (it.choice && !['atk', 'mag', 'spd'].includes(it.choice)) err(p, `choice ${it.choice}`);
  if (it.orb && !STATUSES.has(it.orb)) err(p, `orb ${it.orb}`);
  if (it.pinchBoost) boosts(p, 'pinchBoost.boosts', it.pinchBoost.boosts);
  if (it.hitBoost) boosts(p, 'hitBoost.boosts', it.hitBoost.boosts);
  if (it.cureStatus && it.cureStatus !== 'all' && it.cureStatus !== 'lasting' && (!Array.isArray(it.cureStatus) || it.cureStatus.some(k => !STATUSES.has(k)))) err(p, `cureStatus ${it.cureStatus}`);
  if (it.extend && !(['weather', 'terrain', 'walls'].includes(it.extend) || KP.WEATHERS[it.extend] || KP.TERRAINS[it.extend])) err(p, `extend ${it.extend}`);
  if (it.terrainBoost) Object.keys(it.terrainBoost).forEach(t => KP.TERRAINS[t] || err(p, `terrainBoost ${t}`));
  if ((it.sash || it.balloon || it.gem || it.resistBerry || it.pinchHeal || it.pinchBoost || it.cureStatus || it.whiteHerb || it.mentalHerb || it.powerHerb || it.weaknessPolicy || it.ejectButton || it.redCard || it.hitBoost || it.hitHurt || it.throatSpray || it.blunderPolicy || it.terrainBoost || it.roomService) && !it.once) warn(p, 'used up: mark it once: true');
};

// ------------------------------------------------------------------ species
const stageInfo = (id) => { const st = KP.stageOf(id); return st; };
const BST = (b) => STATS.reduce((a, k) => a + (b[k] || 0), 0);
const TIERS = {   // [min, max] total by class and stage (n of `of`)
  normal: { '1/1': [380, 520], '1/2': [270, 390], '2/2': [420, 525], '1/3': [240, 340], '2/3': [350, 455], '3/3': [470, 545] },
  pseudo: { '1/3': [280, 320], '2/3': [400, 450], '3/3': [590, 610], '1/2': [300, 420], '2/2': [580, 610] },
  breed: { '1/1': [440, 600], '1/2': [300, 420], '2/2': [470, 600], '1/3': [280, 340], '2/3': [400, 460], '3/3': [500, 600] },
  legend: { '1/1': [570, 700] },
  mythical: { '1/1': [580, 620] },
};
const names = new Map();   // moogle name -> line base (old and new)
for (const id of Object.keys(KP.SPECIES)) { const b = KP.baseOf ? KP.baseOf(id) : id; const nm = KP.SPECIES[id].moogle; if (!names.has(nm)) names.set(nm, b); }
const checkSpecies = (pack, id, s) => {
  const p = `${pack} species ${id}`;
  if (!/^[a-z][a-z0-9_]*$/.test(id)) err(p, 'id: lower_snake_case');
  len(p, 'moogle', s.moogle, 12); len(p, 'desc', s.desc, 130);
  const J = KP.JOBS[s.job]; if (!J) err(p, `job ${s.job}`);
  if (!TYPES.has(s.type)) err(p, `type ${s.type}`);
  if (s.type2 && (!TYPES.has(s.type2) || s.type2 === s.type)) err(p, `type2 ${s.type2}`);
  const b = s.base || {};
  for (const k of STATS) if (!Number.isInteger(b[k]) || b[k] < 5 || b[k] > (s.class === 'legend' ? 255 : 200)) err(p, `base ${k} ${b[k]}`);
  for (const k of Object.keys(b)) if (!STATS.includes(k)) err(p, `base key ${k}`);
  const cls = s.class || 'normal'; if (!CLASSES.has(cls)) err(p, `class ${cls}`);
  const st = stageInfo(id), key = `${st.n}/${st.of}`, tier = (TIERS[cls] || {})[key];
  if (!tier) err(p, `class ${cls} can't be stage ${key}`);
  else { const t = BST(b); if (t < tier[0] || t > tier[1]) err(p, `stat total ${t} outside ${tier[0]}-${tier[1]} for a ${cls} at stage ${key}`); }
  if (!['fast', 'medium', 'slow'].includes(s.curve)) err(p, `curve ${s.curve}`);
  if (!Number.isInteger(s.rate) || s.rate < 3 || s.rate > 255) err(p, `rate ${s.rate}`);
  if ((cls === 'legend' || cls === 'mythical') && s.rate > 5) err(p, 'a legend or mythical has rate 3');
  if (cls !== 'legend' && cls !== 'mythical' && s.rate <= 5) err(p, 'rate 5 or less is for legends (it changes the look)');
  if (!Number.isInteger(s.exp) || s.exp < 30 || s.exp > 400) err(p, `exp ${s.exp}`);
  for (const k of ['fur', 'pom', 'nose', 'wing']) if (s[k] != null && !HEX.test(s[k])) err(p, `${k} ${s[k]}`);
  if (!s.habitat || !HABITATS.has(s.habitat)) err(p, `habitat ${s.habitat} (one of ${[...HABITATS].join(' ')})`);
  if (s.rarity && !RARITY.has(s.rarity)) err(p, `rarity ${s.rarity}`);
  if (s.evo) {
    const t = KP.SPECIES[s.evo.to];
    if (!t) err(p, `evo to ${s.evo.to}`);
    if (!Number.isInteger(s.evo.at) || s.evo.at < 8 || s.evo.at > 45) err(p, `evo at ${s.evo.at}`);
    if (t && KP.CONTENT[pack] && !KP.CONTENT[pack].species.includes(s.evo.to)) err(p, 'a line must be in one pack');
    const pre = Object.keys(KP.SPECIES).find(k => (KP.SPECIES[k].evo || {}).to === id);
    if (pre && KP.SPECIES[pre].evo.at >= s.evo.at) err(p, `evolves at ${s.evo.at}, not after its own evolution at ${KP.SPECIES[pre].evo.at}`);
    if (t && t.moogle !== s.moogle) err(p, `the line's name changes (${s.moogle} -> ${t.moogle}): a line keeps its moogle name, the job changes`);
  }
  if (names.has(s.moogle) && names.get(s.moogle) !== (KP.baseOf ? KP.baseOf(id) : id)) err(p, `moogle name ${s.moogle} is another line's`);
  const ab = KP.SPECIES_ABIL[id] || [];
  if (!ab.length || ab.length > 3) err(p, `abilities: 1-3 (${ab.length})`);
  ab.forEach(a => KP.ABILITIES[a] || err(p, `ability ${a}`));
  // the learnset: real moves, levels 1-50, at least two at Lv 1, and at every level an attack with no cooldown among
  // the last four; its own type's attacks (STAB) by the end
  const L = KP.LEARN[id] || [];
  if (L.length < 6) err(p, `learnset: ${L.length} entries`);
  L.forEach(([l, m]) => { if (!Number.isInteger(l) || l < 1 || l > 50) err(p, `learn level ${l}`); if (!KP.MOVES[m]) err(p, `learn move ${m}`); });
  if (st.n === 1 && L.filter(([l]) => l === 1).length < 2) err(p, 'learnset: two moves at Lv 1');
  for (let lv = 1; lv <= 50; lv++) {
    const four = KP.movesAt(id, lv).map(m => KP.MOVES[m]).filter(Boolean);
    if (!four.some(m => KP.category(m) !== 'status' && !m.cd && !m.charge && !m.recharge)) { err(p, `at Lv ${lv} no attack without a cooldown in its four (${KP.movesAt(id, lv).join(', ')})`); break; }
  }
  const last = KP.movesAt(id, 50).map(m => KP.MOVES[m]).filter(Boolean);
  if (!last.some(m => KP.category(m) !== 'status' && (m.type === s.type || m.type === s.type2))) warn(p, 'no own-type attack in its last four');
  const atk = last.filter(m => KP.category(m) !== 'status');
  if (atk.length && atk.every(m => m.type === 'freelancer' || m.type === 'monk')) warn(p, 'its last four can\'t touch a Summoner');
  if (atk.length && atk.every(m => m.type === 'summoner')) warn(p, 'its last four can\'t touch a Freelancer');
  // the look: real parts
  const Lk = Object.assign({}, J ? J.look : {}, s.look || {});
  if (Lk.hat && !PARTS.HATS.has(Lk.hat)) err(p, `hat ${Lk.hat}`);
  if (Lk.body && !PARTS.BODIES.has(Lk.body)) err(p, `body ${Lk.body}`);
  if (Lk.weapon && !PARTS.WEAPONS.has(Lk.weapon)) err(p, `weapon ${Lk.weapon}`);
  if (Lk.shield && !PARTS.SHIELDS.has(Lk.shield)) err(p, `shield ${Lk.shield}`);
  (Lk.extra || []).forEach(e => PARTS.EXTRAS.has(e) || err(p, `extra ${e}`));
  for (const k of ['g1', 'g2', 'cape', 'liquid', 'glow', 'eyes']) if (Lk[k] != null && !HEX.test(Lk[k])) err(p, `look.${k} ${Lk[k]}`);
};
const checkJob = (pack, id, j) => {
  const p = `${pack} job ${id}`;
  len(p, 'name', j.name, 16);
  if (!TYPES.has(j.type)) err(p, `type ${j.type}`);
  if (!j.look) err(p, 'look missing');
};

// ------------------------------------------------------------------ breeding recipes (kp_breed.js)
const checkRecipe = (pack, r, i) => {
  const p = `${pack} recipe ${i}`;
  for (const k of Object.keys(r)) if (!['pack', 'a', 'b', 'child', 'chance', 'tier', 'needs', 'hint'].includes(k)) err(p, `unknown key ${k}`);
  const side = (x) => typeof x === 'string' && (KP.SPECIES[x] || TYPES.has(x) || (x.startsWith('line:') && KP.SPECIES[x.slice(5)]));
  if (!side(r.a) || !side(r.b)) err(p, `a / b: a species id, a type, or line:<species> (${r.a}, ${r.b})`);
  if (!KP.SPECIES[r.child]) err(p, `child ${r.child}`);
  if (r.chance != null && !(r.chance > 0 && r.chance <= 1)) err(p, `chance ${r.chance}`);
  if (r.tier && !['rare', 'super', 'ultra'].includes(r.tier)) err(p, `tier ${r.tier}`);
  if (r.needs) for (const k of Object.keys(r.needs)) if (!['plus', 'item', 'lv'].includes(k)) err(p, `needs.${k}`);
  if (r.needs && r.needs.item && !KP.ITEMS[r.needs.item]) err(p, `needs.item ${r.needs.item}`);
};

// ------------------------------------------------------------------ run
const seenNames = { moves: new Map(), abilities: new Map(), items: new Map() };
for (const k of Object.keys(KP.MOVES)) if (before.moves.has(k)) seenNames.moves.set(KP.MOVES[k].name, k);
for (const k of Object.keys(KP.ABILITIES)) if (before.abilities.has(k)) seenNames.abilities.set(KP.ABILITIES[k].name, k);
let n = { moves: 0, abilities: 0, items: 0, species: 0, jobs: 0, recipes: 0 };
for (const pack of packs) {
  const rec = KP.CONTENT[pack];
  rec.clash.forEach(c => err(pack, `id already taken: ${c}`));
  for (const id of rec.moves) { checkMove(pack, id, KP.MOVES[id]); const nm = KP.MOVES[id].name; if (seenNames.moves.has(nm) && seenNames.moves.get(nm) !== id) err(pack, `move name "${nm}" is also ${seenNames.moves.get(nm)}`); seenNames.moves.set(nm, id); n.moves++; }
  for (const id of rec.abilities) { checkAbility(pack, id, KP.ABILITIES[id]); const nm = KP.ABILITIES[id].name; if (seenNames.abilities.has(nm) && seenNames.abilities.get(nm) !== id) err(pack, `ability name "${nm}" is also ${seenNames.abilities.get(nm)}`); seenNames.abilities.set(nm, id); n.abilities++; }
  for (const id of rec.items) { checkItem(pack, id, KP.ITEMS[id]); n.items++; }
  for (const id of rec.jobs) { checkJob(pack, id, KP.JOBS[id]); n.jobs++; }
  for (const id of rec.species) { checkSpecies(pack, id, KP.SPECIES[id]); n.species++; }
  KP.BREED_RECIPES.filter(r => r.pack === pack).forEach((r, i) => { checkRecipe(pack, r, i); n.recipes++; });
}
// every new move learned by someone (or a chip), every new ability on someone
const learned = new Set(); Object.values(KP.LEARN).forEach(L => L.forEach(([, m]) => learned.add(m)));
Object.values(KP.ITEMS).forEach(it => { if (it.kind === 'chip') learned.add(it.move); });
const usedAb = new Set(); Object.values(KP.SPECIES_ABIL).forEach(L => L.forEach(a => usedAb.add(a)));
for (const pack of packs) {
  for (const id of KP.CONTENT[pack].moves) if (!learned.has(id)) warn(pack, `move ${id}: nobody learns it yet`);
  for (const id of KP.CONTENT[pack].abilities) if (!usedAb.has(id)) warn(pack, `ability ${id}: nobody has it yet`);
}
console.log(`packs ${packs.length} | moves ${n.moves} | abilities ${n.abilities} | items ${n.items} | jobs ${n.jobs} | species ${n.species} | recipes ${n.recipes} | Kupodex ${KP.DEX.length}`);
if (verbose) warns.forEach(w => console.log('  warn ' + w)); else if (warns.length) console.log(`${warns.length} warning(s) (-v to list)`);
errs.forEach(e => console.log('  ERROR ' + e));
console.log(`${errs.length} error(s)`);
process.exit(errs.length ? 1 : 0);
