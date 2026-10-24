// Content validator: node tools/validate.js [--quiet] [--file substring]
// Loads every game script in a sandbox (browser APIs stubbed), then checks data + maps and
// dry-runs every event script with a mock script API.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const onlyFile = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;

// ---------------------------------------------------------------- sandbox
const noop = () => {};
const ctxStub = new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 10 }) : k === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4) }) : k === 'createImageData' ? () => ({ data: new Uint8ClampedArray(16) }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : typeof k === 'string' ? noop : undefined), set: () => true });
const makeEl = () => ({ getContext: () => ctxStub, style: {}, width: 1, height: 1, addEventListener: noop, appendChild: noop, click: noop });
const sandbox = {
  console, Math, JSON, Date, Array, Object, String, Number, Boolean, Set, Map, WeakMap, Proxy, Promise, Symbol, Error, TypeError,
  Float32Array, Uint8Array, Uint8ClampedArray, Int32Array, parseInt, parseFloat, isFinite, isNaN, setTimeout: noop, clearTimeout: noop,
  performance: { now: () => 0 }, navigator: { getGamepads: () => [] }, location: { search: '', protocol: 'file:' },
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  document: { createElement: makeEl, getElementById: makeEl, body: { appendChild: noop } },
  Image: function () { this.onload = null; }, Audio: function () { this.play = () => Promise.resolve(); this.pause = noop; },
  requestAnimationFrame: noop, addEventListener: noop, innerWidth: 640, innerHeight: 480, devicePixelRatio: 1,
};
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const loaderSrc = fs.readFileSync(path.join(ROOT, 'js/loader.js'), 'utf8');
const listOf = (name) => { const m = loaderSrc.match(new RegExp('var ' + name + ' = \\[([\\s\\S]*?)\\];')); return m ? [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : []; };
const CORE = listOf('CORE'), DATA = listOf('DATA');
const problems = [];
const report = (file, msg, level = 'error') => problems.push({ file, msg, level });
let currentFile = '';
function load(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { if (!rel.includes('minigames') && !rel.includes('scenes/') && !rel.startsWith('js/maps/')) report(rel, 'file listed in loader but missing', 'warn'); return; }
  currentFile = rel;
  try { vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: rel }); }
  catch (e) { report(rel, 'LOAD ERROR: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
}
load('js/core/namespace.js');
const FF7 = sandbox.FF7;
// track which file defines each map
const origDefine = FF7.defineMap;
const mapFile = {};
FF7.defineMap = function (id, def) { if (FF7.maps[id]) report(currentFile, `map "${id}" defined twice (also in ${mapFile[id]})`); mapFile[id] = currentFile; return origDefine(id, def); };
CORE.forEach(load);
DATA.forEach(load);
// duplicate data keys across files
{
  const seen = {};
  for (const f of DATA) {
    const p = path.join(ROOT, f); if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, 'utf8');
    const m = src.match(/Object\.assign\(FF7\.data\.(\w+),/g) || [];
    // (cheap) top-level keys: lines with exactly 2-space indent "  id: {"
    const table = (m[0] || '').replace(/Object\.assign\(FF7\.data\.|,/g, '');
    for (const k of src.matchAll(/^  '?([a-z0-9_]+)'?\s*:\s*\{/gm)) {
      const key = table + ':' + k[1];
      if (seen[key] && seen[key] !== f) report(f, `data id "${k[1]}" in FF7.data.${table} also defined in ${seen[key]}`);
      seen[key] = f;
    }
  }
}
// maps
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/maps/_maps.js'), 'utf8'), sandbox);
const MAPFILES = (sandbox.FF7_MAP_FILES || []).map(f => 'js/maps/' + f);
MAPFILES.forEach(load);
// every js file listed?
{
  const all = [];
  const walk = (d) => fs.readdirSync(path.join(ROOT, d)).forEach(f => { const r = d + '/' + f; if (fs.statSync(path.join(ROOT, r)).isDirectory()) walk(r); else if (r.endsWith('.js')) all.push(r); });
  walk('js');
  const listed = new Set(['js/loader.js', 'js/main.js', 'js/core/namespace.js', 'js/maps/_maps.js', ...CORE, ...DATA, ...MAPFILES]);
  all.forEach(f => { if (!listed.has(f)) report(f, 'JS file not listed in js/loader.js or js/maps/_maps.js', 'warn'); });
}

// ---------------------------------------------------------------- reference checks
const D = FF7.data;
const anyItem = (id) => D.items[id] || D.weapons[id] || D.armor[id] || D.accessories[id] || D.keyItems[id];
const MUSIC = new Set(Object.keys((FF7.AUDIO_MAP || {}).music || {}));
const SFX = new Set(Object.keys((FF7.AUDIO_MAP || {}).sfx || {}));
const PRESETS = FF7.chars3d ? FF7.chars3d.PRESETS : {};
const MOVIES = new Set('opening reactor1_blast midgar_train plate_fall shinra_escape leave_midgar nibel_fire junon_ship gold_saucer temple_shrink aeris_death weapons_awaken meteor highwind_escape sapphire_weapon ultimate_weapon lifestream_fall rocket_launch diamond_weapon sister_ray highwind_night holy ending seto shinra_motors_ad aeris_lake black_materia rocket_meteor pod_splashdown bizarro_rises safer_rises safer_falls highwind_crater_escape bronco_escape'.split(' '));
const MINIGAMES = new Set('motorcycle snowboard chocobo_race submarine squats fort_condor condor_command arm_wrestle catcher battler mog_house dolphin parade sendoff shinra_sneak cpr train_escape parachute shooting darts wall_climb'.split(' '));
const BGS = new Set('reactor train tunnel train_roof midgar slums church wallmarket sewer graveyard shinra shinra_roof shinra_elevator lab highway grass marsh mine condor junon ship beach mtcorel corel desert prison goldsaucer jungle canyon cave nibelheim mansion mtnibel rocket wutai temple bone forest city_ancients capital_altar snow glacier cliff crater crater_core synthesis underwater seafloor space lifestream mideel sisterray ocean sky'.split(' '));
const THEMES = FF7.field && FF7.field.themes ? FF7.field.themes : {};
const WORLD_LOCS = new Set(((D.world || {}).locations || []).map(l => l.id));
const CHARS = new Set(Object.keys(D.characters));
function modelOk(m) {
  if (!m) return true;
  if (typeof m === 'object') return !m.base || modelOk(m.base);
  if (PRESETS[m]) return true;
  const mm = m.match(/^([a-z_]+?)(\d+)$/);
  return !!(mm && PRESETS[mm[1]]);
}

// ---------------------------------------------------------------- map checks
const F = FF7.field;
const flagsSet = new Set(), flagsRead = new Set();
for (const id in FF7.maps) {
  const map = FF7.maps[id];
  const file = mapFile[id] || '?';
  if (onlyFile && !file.includes(onlyFile)) continue;
  if (!map.grid || !map.grid.length) { report(file, `${id}: no grid`); continue; }
  const P = F.parseMap(map);
  const w0 = map.grid[0].length;
  map.grid.forEach((r, i) => { if (r.length !== w0) report(file, `${id}: grid row ${i} has length ${r.length} (row 0 has ${w0})`, 'warn'); });
  if (map.heights) { if (map.heights.length !== map.grid.length) report(file, `${id}: heights has ${map.heights.length} rows, grid has ${map.grid.length}`); }
  if (map.theme && !THEMES[map.theme]) report(file, `${id}: unknown theme "${map.theme}"`);
  // missing stairs: walkable areas separated by a small height step (the engine blocks steps > 0.2
  // unless one side is a stair tile) — the player sees a walkable edge but hits an invisible wall
  if (!map.hidePlayer && map.entries) {
    const ok = (x, y) => x >= 0 && y >= 0 && x < P.w && y < P.h && P.walkable(x, y);
    const seen = new Set(), q = [];
    Object.values(map.entries).forEach(e => { if (Array.isArray(e) && ok(e[0], e[1]) && !seen.has(e[0] + ',' + e[1])) { seen.add(e[0] + ',' + e[1]); q.push([e[0], e[1]]); } });
    while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || !ok(nx, ny)) continue; if (Math.abs(P.el(x, y) - P.el(nx, ny)) > 0.2 && !P.at(x, y).stair && !P.at(nx, ny).stair) continue; seen.add(k); q.push([nx, ny]); } }
    let bad = null;
    for (let y = 0; y < P.h && !bad; y++) for (let x = 0; x < P.w && !bad; x++) {
      if (!ok(x, y) || seen.has(x + ',' + y)) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (seen.has(nx + ',' + ny)) { const dh = Math.abs(P.el(x, y) - P.el(nx, ny)); if (dh > 0.2 && dh <= 1.0) { bad = [x, y, nx, ny, dh]; break; } } }
    }
    if (bad) report(file, `${id}: walkable tile [${bad[0]},${bad[1]}] is ${bad[4].toFixed(2)} higher/lower than reachable [${bad[2]},${bad[3]}] with no stair tile between (invisible wall) — add '^' stairs or level the heights`, 'warn');
  }
  if (typeof map.music === 'string' && map.music !== 'none' && !MUSIC.has(map.music)) report(file, `${id}: unknown music "${map.music}"`);
  if (map.battle) {
    if (map.battle.table && !D.encounters[map.battle.table]) report(file, `${id}: unknown encounter table "${map.battle.table}"`);
    if (map.battle.bg && !BGS.has(map.battle.bg)) report(file, `${id}: unknown battle bg "${map.battle.bg}"`, 'warn');
  }
  for (const ch of new Set(map.grid.join(''))) { const t = (map.legend || {})[ch] || F.LEGEND[ch]; if (!t) report(file, `${id}: unknown grid char "${ch}" (treated as floor)`, 'warn'); else if (!F.tileTypes[t]) report(file, `${id}: legend maps "${ch}" to unknown tile type "${t}"`); }
  const walk = (x, y) => P.walkable(x, y);
  // prop overrides, labels, buildings (docs/SCRIPTING.md "Props, labels and buildings")
  const inside = (at, m = 0.5) => Array.isArray(at) && at.length >= 2 && at[0] >= -m && at[1] >= -m && at[0] <= P.w - 1 + m && at[1] <= P.h - 1 + m;
  (map.props || []).forEach((o, i) => {
    // (props may stand up to 4 tiles beyond the edge: backdrops)
    if (!o || !inside(o.at, 4)) { report(file, `${id}: props[${i}] needs an "at" inside the map (or within 4 tiles of it)`); return; }
    // (o.far: a line meant to run off into the distance, a ropeway's ropes)
    if (o.to && !o.far && !inside(o.to, 4)) report(file, `${id}: props[${i}] "to" ${o.to} is outside the map`);
    if (o.vehicle) { if (FF7.vehicles3d && !FF7.vehicles3d.has(o.vehicle)) report(file, `${id}: props[${i}] unknown vehicle "${o.vehicle}"`); return; }
    const name = o.prop || (o.to ? 'string' : P.at(Math.round(o.at[0]), Math.round(o.at[1])).prop);
    if (o.prop !== 'none' && o.prop !== null && !F.props[name]) report(file, `${id}: props[${i}] unknown prop "${o.prop || name}"`);
    if (name === 'string' && !o.to) report(file, `${id}: props[${i}] a cable ('string') needs "to"`);
  });
  (map.labels || []).forEach((L, i) => { if (!L || !inside(L.at) || L.text == null) report(file, `${id}: labels[${i}] needs "at" inside the map and "text"`); else if (L.face && !'nsew'.includes(L.face)) report(file, `${id}: labels[${i}] face must be n, s, e or w`); });
  (map.buildings || []).forEach((b, i) => { if (!b || !inside(b.at)) report(file, `${id}: buildings[${i}] needs an "at" [x, y, w, h] inside the map`); else if (b.top && !['flat', 'gable', 'shed', 'hip'].includes(b.top)) report(file, `${id}: buildings[${i}] unknown top "${b.top}"`); });
  for (const [en, e] of Object.entries(map.entries || {})) if (!walk(e[0], e[1])) report(file, `${id}: entry "${en}" at ${e[0]},${e[1]} is not walkable`);
  (map.exits || []).forEach((ex, i) => {
    const [x, y, w = 1, h = 1] = ex.at;
    let anyWalk = false; for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (walk(xx, yy)) anyWalk = true;
    if (!anyWalk) report(file, `${id}: exit #${i} rect ${ex.at} has no walkable tile`);
    for (const [en, e] of Object.entries(map.entries || {})) if (e[0] >= x && e[0] < x + w && e[1] >= y && e[1] < y + h) report(file, `${id}: entry "${en}" is inside exit #${i} — put entries one tile inside`, 'warn');
    if (ex.run) return;
    if (ex.to === 'world') { if (ex.loc && typeof ex.loc === 'string' && !WORLD_LOCS.has(ex.loc)) report(file, `${id}: exit to unknown world location "${ex.loc}"`); return; }
    if (!FF7.maps[ex.to]) report(file, `${id}: exit #${i} to unknown map "${ex.to}"`, 'warn');
    else if (ex.entry && !(FF7.maps[ex.to].entries || {})[ex.entry]) report(file, `${id}: exit #${i} to ${ex.to} uses unknown entry "${ex.entry}"`);
  });
  (map.npcs || []).forEach(n => {
    if (!n.id) report(file, `${id}: npc without id`);
    if (!n.at) { report(file, `${id}: npc ${n.id} without at`); return; }
    const t = P.at(n.at[0], n.at[1]);
    if (!t.walk && !t.prop && !n.hover) report(file, `${id}: npc ${n.id} at ${n.at} stands on non-walkable tile`, 'warn');   // (hover: seated on something)
    if (!modelOk(n.model || n.id)) report(file, `${id}: npc ${n.id} unknown model "${JSON.stringify(n.model || n.id)}"`);
    if (n.flagHide) flagsRead.add(n.flagHide); if (n.flagShow) flagsRead.add(n.flagShow);
  });
  (map.items || []).concat(map.chests || []).forEach(it => {
    if (it.item && !anyItem(it.item)) report(file, `${id}: unknown item "${it.item}"`);
    if (it.kp && !(FF7.kupomon && FF7.kupomon.ITEMS && FF7.kupomon.ITEMS[it.kp])) report(file, `${id}: unknown Kupomon item "${it.kp}"`);
    if (it.materia && !D.materia[it.materia]) report(file, `${id}: unknown materia "${it.materia}"`);
    if (!it.id) report(file, `${id}: item/chest at ${it.at} has no unique id`, 'warn');
    if (it.at && !walk(it.at[0], it.at[1]) && !P.at(it.at[0], it.at[1]).prop) report(file, `${id}: item at ${it.at} not on a walkable tile`, 'warn');
  });
}

// ---------------------------------------------------------------- script dry-run
const API = F.ScriptAPI ? F.ScriptAPI.prototype : {};
const apiMethods = Object.getOwnPropertyNames(API).filter(k => k !== 'constructor');
function makeMock(file, where, mode) {
  const W = (r) => ({ done: true, result: r });
  const chk = (cond, msg) => { if (!cond) report(file, `${where}: ${msg}`); };
  const m = {
    field: { actors: {}, map: {}, cam: {}, player: {} },
    st: FF7.state,
  };
  for (const k of apiMethods) m[k] = () => 1;
  Object.assign(m, {
    say: (who, t) => { chk(typeof t === 'string' || Array.isArray(t), 'say() text must be a string'); return W(); },
    ask: (who, t, ch) => { chk(Array.isArray(ch) && ch.length > 0, 'ask() needs a choices array'); return W(mode.choice === 'last' ? ch.length - 1 : 0); },
    msg: () => W(), caption: () => W(),
    flag: (n) => { flagsRead.add(n); return mode.flags; },
    set: (n) => { flagsSet.add(n); return 1; }, unset: () => 1,
    get: () => 0, inc: () => 1, has: () => mode.flags, count: () => 0, gil: () => 99999, takeGil: () => true,
    give: (id) => { chk(id && (anyItem(id) || (id.startsWith('materia:') && D.materia[id.slice(8)])), `give(): unknown item "${id}"`); return W(); },
    take: (id) => { chk(anyItem(id), `take(): unknown item "${id}"`); return 1; },
    giveMateria: (id) => { chk(D.materia[id], `giveMateria(): unknown materia "${id}"`); return W(); },
    hasMateria: () => mode.flags,
    join: (id) => { chk(CHARS.has(id), `join(): unknown character "${id}"`); return 1; },
    leave: (id) => { chk(CHARS.has(id), `leave(): unknown character "${id}"`); return 1; },
    party: (ids) => { chk(Array.isArray(ids) && ids.every(i => !i || CHARS.has(i)), `party(): bad ids ${JSON.stringify(ids)}`); return 1; },
    inParty: () => mode.flags, isMember: () => mode.flags, leader: () => 'cloud', name: () => 'Cloud', level: () => 10,
    battle: (o) => {
      chk(o && typeof o === 'object', 'battle() needs an options object');
      if (o.enemies) o.enemies.forEach(e => chk(D.enemies[e], `battle(): unknown enemy "${e}"`));
      if (o.table) chk(D.encounters[o.table], `battle(): unknown table "${o.table}"`);
      if (o.bg) chk(BGS.has(o.bg), `battle(): unknown bg "${o.bg}"`);
      if (o.music) chk(MUSIC.has(o.music), `battle(): unknown music "${o.music}"`);
      chk(o.enemies || o.table || o.formation, 'battle(): needs enemies, table or formation');
      return W('win');
    },
    goto: (map, entry) => { if (!FF7.maps[map]) report(file, `${where}: goto(): unknown map "${map}" (ok if another chapter defines it)`, 'warn'); if (FF7.maps[map] && entry && typeof entry === 'string') chk((FF7.maps[map].entries || {})[entry], `goto(): map ${map} has no entry "${entry}"`); return W(); },
    world: (loc) => { if (typeof loc === 'string') chk(WORLD_LOCS.has(loc), `world(): unknown location "${loc}"`); return W(); },
    shop: (id) => { chk(D.shops[id], `shop(): unknown shop "${id}"`); return W(); },
    music: (id) => { chk(!id || id === 'none' || MUSIC.has(id), `music(): unknown track "${id}"`); return 1; },
    sfx: (id) => { chk(SFX.has(id), `sfx(): unknown sound "${id}"`); return 1; },
    spawn: (id, model) => { chk(modelOk(model || id), `spawn(): unknown model ${JSON.stringify(model)}`); return 1; },
    setModel: (id, model) => { chk(modelOk(model), `setModel(): unknown model ${JSON.stringify(model)}`); return 1; },
    movie: (id) => { if (!MOVIES.has(id)) report(file, `${where}: movie id "${id}" not in the standard list (caption fallback)`, 'warn'); return W(); },
    minigame: (id) => { chk(MINIGAMES.has(id), `minigame(): unknown id "${id}"`); return W(true); },
    choosePArty: () => W(), nameEntry: (id) => { chk(CHARS.has(id) || !!(FF7.state.chars && FF7.state.chars[id]), `nameEntry(): unknown character ${id}`); return W(); },
    inn: () => W(true), save: () => W(), discEnd: () => W(), timeLeft: () => 100, random: () => 0, mapId: () => 'x',
    call: (fn, ...a) => fn(m, ...a), parallel: (fn) => { runGen(fn, file, where + '/parallel', mode); return 1; },
    actor: () => ({ x: 0, z: 0, visible: true }), anim: (id, name) => { chk(FF7.anims[name] || ['idle','walk','run','victory','hurt','dead','cast','slash','punch','attack','battle','none'].includes(name) || !name, `anim(): unknown animation "${name}"`); return 1; },
    emote: () => 1, face: () => 1, move: () => W(), run: () => W(), walk: () => W(), jump: () => W(), cam: () => W(), camFollow: () => 1,
  });
  return new Proxy(m, { get(t, k) { if (k in t) return t[k]; if (typeof k === 'string' && !k.startsWith('_') && k !== 'then' && k !== 'toJSON') report(file, `${where}: s.${k} is not a script API method`); return () => 1; } });
}
function runGen(fn, file, where, mode) {
  if (typeof fn !== 'function') { report(file, `${where}: not a function`); return; }
  let gen;
  try { gen = fn(makeMock(file, where, mode)); } catch (e) { report(file, `${where}: throws when called: ${e.message}`); return; }
  if (!gen || typeof gen.next !== 'function') return; // plain function (e.g. show) is fine
  let val, steps = 0;
  try {
    while (steps++ < 3000) {
      const r = gen.next(val);
      if (r.done) return;
      const v = r.value;
      if (v && typeof v.next === 'function' && typeof v.throw === 'function') { // sub-generator yielded
        let sv; let s2 = 0; while (s2++ < 2000) { const rr = v.next(sv); if (rr.done) { val = rr.value; break; } sv = rr.value && rr.value.result; }
        continue;
      }
      val = Array.isArray(v) ? v.map(x => x && x.result) : (v && typeof v === 'object' ? v.result : undefined);
    }
    report(file, `${where}: script did not finish within 3000 steps (infinite loop?)`, 'warn');
  } catch (e) { report(file, `${where}: runtime error: ${e.message}`); }
}
FF7.state = FF7.newState ? FF7.newState() : {};
for (const id in FF7.maps) {
  const map = FF7.maps[id];
  const file = mapFile[id] || '?';
  if (onlyFile && !file.includes(onlyFile)) continue;
  const scripts = [];
  if (map.onEnter) scripts.push(['onEnter', map.onEnter]);
  (map.npcs || []).forEach(n => { if (n.talk) scripts.push(['npc ' + n.id + '.talk', n.talk]); if (n.show) scripts.push(['npc ' + n.id + '.show', n.show]); });
  (map.triggers || []).forEach((t, i) => { if (t.run) scripts.push(['trigger ' + (t.id || i), t.run]); if (t.if) scripts.push(['trigger ' + (t.id || i) + '.if', t.if]); });
  (map.exits || []).forEach((e, i) => { if (e.run) scripts.push(['exit ' + i, e.run]); if (e.blocked) scripts.push(['exit ' + i + '.blocked', e.blocked]); if (e.if) scripts.push(['exit ' + i + '.if', e.if]); });
  (map.objects || []).forEach((o, i) => { if (o.talk) scripts.push(['object ' + i, o.talk]); });
  if (map.onLoad) scripts.push(['onLoad', map.onLoad]);
  // (Kupomon's maps, kp_*, run in its sandbox state: js/kupomon/kp_core.js, with a moogle on the team)
  const real = FF7.state, kp = /^kp_/.test(id) && FF7.kupomon && FF7.kupomon.newState;
  if (kp) { FF7.state = FF7.kupomon.newState(real); FF7.state.kp.party.push(FF7.kupomon.make(FF7.kupomon.STARTERS[0], 5)); }
  for (const [where, fn] of scripts) for (const mode of [{ flags: false, choice: 0 }, { flags: true, choice: 'last' }]) runGen(fn, file, id + ' ' + where, mode);
  FF7.state = real;
}
// story scripts
for (const k in FF7.story || {}) if (typeof FF7.story[k] === 'function' && FF7.story[k].constructor.name === 'GeneratorFunction') runGen(FF7.story[k], 'FF7.story', 'story.' + k, { flags: false, choice: 0 });
// world links
if (FF7.world && FF7.world._links) for (const [loc, links] of Object.entries(FF7.world._links)) {
  if (!WORLD_LOCS.has(loc) && !/_interior$/.test(loc)) report(links[0].file || '?', `world.link: unknown location "${loc}"`);
  links.forEach(l => { if (l.map && !FF7.maps[l.map]) report(l.file || '?', `world.link(${loc}): unknown map "${l.map}"`); else if (l.map && l.entry && !(FF7.maps[l.map].entries || {})[l.entry]) report(l.file || '?', `world.link(${loc}): map ${l.map} has no entry "${l.entry}"`); });
}
// Kupomon softlocks: two moogles whose attacks are all of a type the other is immune to could never end their battle
// (a Freelancer-only one and a Summoner-only one). Every species keeps an attack the other side can feel; a one-sided
// wall (a Monk against a Summoner) is fine: the Summoner still wins
const KPm = FF7.kupomon;
if (KPm && KPm.SPECIES && KPm.MOVES && KPm.effOn) {
  const sps = Object.keys(KPm.SPECIES), file = 'js/kupomon (movesets)';
  const attacks = (id) => (KPm.SPECIES[id].moves || []).map(m => KPm.MOVES[m]).filter(m => m && m.power);
  const walled = (a, d) => { const at = attacks(a); return at.every(mv => KPm.effOn(mv.type, { sp: d }) === 0); };
  const seen = new Set();
  for (const id of sps) {
    if (!attacks(id).length) report(file, `${id}: no attacking move (it could never end a battle)`);
    (KPm.SPECIES[id].moves || []).forEach(m => { if (!KPm.MOVES[m]) report(file, `${id}: unknown move "${m}"`); });
  }
  for (const a of sps) for (const d of sps) {
    if (a >= d || !walled(a, d) || !walled(d, a)) continue;
    const k = KPm.typeOf({ sp: a }) + '/' + KPm.typeOf({ sp: d }); if (seen.has(k + a)) continue; seen.add(k + a);
    report(file, `${a} and ${d} can't hurt each other (all their attacks are of types the other is immune to): give one of them a coverage attack`);
  }
}

// flags read but never set (informational)
const unsetFlags = [...flagsRead].filter(f => !flagsSet.has(f) && !/^got_|^trig_/.test(f));

// ---------------------------------------------------------------- output
const byFile = {};
for (const p of problems) (byFile[p.file] = byFile[p.file] || []).push(p);
let errors = 0, warns = 0;
for (const [f, list] of Object.entries(byFile)) {
  if (onlyFile && !f.includes(onlyFile)) continue;
  console.log('\n' + f);
  const seenMsg = new Set();
  for (const p of list) { const k = p.level + p.msg; if (seenMsg.has(k)) continue; seenMsg.add(k); console.log(`  ${p.level === 'warn' ? 'warn ' : 'ERROR'} ${p.msg}`); if (p.level === 'warn') warns++; else errors++; }
}
console.log(`\nmaps: ${Object.keys(FF7.maps).length}, enemies: ${Object.keys(D.enemies).length}, items: ${Object.keys(D.items).length}`);
if (unsetFlags.length && !args.includes('--quiet')) console.log('flags read but never set anywhere (ok if set by engine/other chapters): ' + unsetFlags.slice(0, 60).join(', ') + (unsetFlags.length > 60 ? ' …' : ''));
console.log(`${errors} error(s), ${warns} warning(s)`);
process.exit(errors ? 1 : 0);
