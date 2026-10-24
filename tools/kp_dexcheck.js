// The Kupodex, checked (the user, 2026-10-03: "yes write the tool"): can every one of its entries be had? The 100%
// (Prof. Sith's Kupodex Diploma) needs all of them, and until now only the Demo's run would have found one that can't.
// What a player can get, worked out from the game's own data and rules until nothing new turns up:
//   - the wild: each KP.WILD table on a map whose tall grass (or a cave's floor) can be stood on from its entries
//     (tools/kp_reach.js: the game's collision, ledges, launch pads, levers);
//   - the legends standing in the world (KP.W.legend: an NPC with a kp_ model), and the scripted wild fights in the
//     maps (a KP.fight of kind 'wild' on a KP.make of a fixed kind; a quest's list of them);
//   - the starter: each of the three choices checked on its own (the other two lines only by breeding);
//   - evolutions (by level, up to KP.MAX_LEVEL);
//   - breeding (js/kupomon/kp_breed.js): the job pairings (KP.BREED), the recipes (KP.BREED_RECIPES: their needs, and
//     a recipe that fits the same pair before it and never misses keeps the egg from ever being this one), and the egg
//     that takes after its first parent when nothing else fits; a legend's egg needs its item (kp_legendbreed.js);
//   - by luck alone: the MogNet Swap (any kind but the legends and the breeding-only ones) and the Shinra Recycler (a
//     Machinist or Knight), counted last, so a kind that only luck gives is listed apart.
// It fails on an entry no starter choice can get, and lists those only luck gives, the wild tables no one can reach,
// and the recipes whose item nothing sells or leaves on a map.
//   node tools/kp_dexcheck.js [--verbose] [--why <species id>[,<species id>...]]
const path = require('path');
process.chdir(path.join(__dirname, '..'));
const { boot } = require('./sim_prelude');
const { FF7 } = boot();
const KP = FF7.kupomon;
FF7.audio.sfx = () => {}; FF7.audio.push = () => {}; FF7.audio.pop = () => {}; FF7.audio.play = () => {};
if (FF7.fx) FF7.fx.clear = () => {};
FF7.state = KP.newState(FF7.state);
if (KP.rescaleWild) KP.rescaleWild();   // (as a new game does: the expansion's wild rows join the maps' tables, KP.WILD_ADD)
const fs = require('fs');
const argv = process.argv.slice(2), verbose = argv.includes('--verbose'), why = argv.includes('--why') ? argv[argv.indexOf('--why') + 1] : null;
const SP = KP.SPECIES, DEX = KP.DEX.filter(id => SP[id]), CAP = KP.MAX_LEVEL;
const name = (id) => (SP[id] && SP[id].moogle ? SP[id].moogle + ' (' + id + ')' : id);
const types = (id) => [SP[id].type, SP[id].type2].filter(Boolean);
const legend = (id) => KP.isLegend({ sp: id });
console.log(`Kupodex: ${DEX.length} entries, ${Object.keys(SP).length} kinds`);

// ------------------------------------------------------------------ the fixed sources
const fixed = new Map();   // kind -> where
const put = (id, where) => { if (SP[id] && !fixed.has(id)) fixed.set(id, where); };
const deadTables = [];
let reach = null; try { reach = require('./kp_reach')(FF7); } catch (e) { console.log('(no reachability helper: every wild map counted)'); }
// (a map's tables: kpWild, or every one its getter can answer: Whisperwood's low glade, Mt. Kupo's glowing hollow pick
// their own table by where the player stands, kp_region1.js / kp_region2.js)
const tablesOf = (m) => {
  if (KP.wildTablesOf) return KP.wildTablesOf(m);   // (the game's own: kpWild, or kpWildBase and kpWildZones)
  const d = Object.getOwnPropertyDescriptor(m, 'kpWild');
  if (d && d.get) return [...new Set([...String(d.get).matchAll(/'([a-z0-9_]+)'/g)].map(x => x[1]).filter(t => KP.WILD[t]))];
  return m.kpWild && KP.WILD[m.kpWild] ? [m.kpWild] : [];
};
// (a getter with no kpWildZones beside it: tables the Demo and the Kupodex screen can't see, flagged)
const hidden = Object.keys(FF7.maps).filter(id => { const m = FF7.maps[id], d = Object.getOwnPropertyDescriptor(m, 'kpWild'); return d && d.get && !m.kpWildZones; });
for (const id of Object.keys(FF7.maps)) {
  const m = FF7.maps[id], tabs = tablesOf(m); if (!tabs.length) continue;
  // (each table counts where a player can stand on its grass: a zone's, on the zone's own tiles)
  let live = new Set(tabs);
  if (reach) {
    try {
      const r = reach(id); live = new Set();
      for (const k of r.got) {
        const [x, y] = k.split(',').map(Number), t = r.P.at(x, y);
        if (t && (t.prop === 'tallgrass' || (m.kpCave && t.walk && !t.stair && t.prop !== 'door'))) live.add(KP.wildTableAt && m.kpWildZones ? KP.wildTableAt(m, r.P, x, y) : tabs[0]);
      }
    } catch (e) { live = new Set(tabs); if (verbose) console.log('  (could not walk ' + id + ': ' + String(e.message).slice(0, 80) + ')'); }
  }
  for (const t of tabs) {
    if (!live.has(t)) { deadTables.push(id + ' (' + t + ')'); continue; }
    for (const row of KP.WILD[t]) put(row[0], 'wild on ' + (m.name || id) + (t !== tabs[0] ? ' (' + t + ')' : ''));
  }
}
for (const id of Object.keys(FF7.maps)) for (const n of FF7.maps[id].npcs || []) {
  const e = n.model && n.model.enemy; if (typeof e === 'string' && e.startsWith('kp_') && SP[e.slice(3)]) put(e.slice(3), 'standing on ' + (FF7.maps[id].name || id) + ' (' + n.id + ')');
}
// (the scripted wild fights: read from the map scripts, as the game would run them)
const srcFiles = [...fs.readdirSync('js/maps/kupomon').map(f => 'js/maps/kupomon/' + f), ...fs.readdirSync('js/kupomon').filter(f => f.endsWith('.js')).map(f => 'js/kupomon/' + f)];
for (const f of srcFiles) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/kind: 'wild', foes: \[KP\.make\('([a-z0-9_]+)'/g)) put(m[1], 'a scripted wild fight (' + path.basename(f) + ')');
  for (const m of src.matchAll(/const ([A-Z_]*MONS) = \[([^\]]*)\]/g)) if (new RegExp(m[1] + '\\[[^\\]]*\\]').test(src.replace(m[0], ''))) for (const s of m[2].matchAll(/'([a-z0-9_]+)'/g)) put(s[1], 'a scripted wild fight (' + path.basename(f) + ')');
}
// (by luck: the MogNet Swap's kinds, the Recycler's)
const only = KP.breedOnly ? KP.breedOnly() : new Map();
const luck = new Map();
for (const id of DEX) { const s = SP[id]; if ((s.rate || 120) > 5 && !only.has(KP.baseOf(id)) && !only.has(id) && s.class !== 'mythical') luck.set(KP.baseOf(id), 'the MogNet Swap (luck)'); }
{ const pre = new Set(); for (const s of Object.values(SP)) if (s.evo && s.evo.to) pre.add(s.evo.to);
  for (const id of DEX) { const s = SP[id]; if ((KP.RECYCLE_TYPES || []).some(t => types(id).includes(t)) && !pre.has(id) && (s.rate || 120) > 5 && !legend(id) && !only.has(id)) if (!luck.has(id)) luck.set(id, 'the Shinra Recycler (luck)'); } }

// ------------------------------------------------------------------ the items a recipe can ask for: sold, or on a map
const itemSource = (id) => {
  for (const c of Object.keys(KP.CENTER_TIER || {})) { try { if (KP.heldStock(c).includes(id)) return true; } catch (e) { } }
  for (const m of Object.values(FF7.maps)) for (const it of [...(m.items || []), ...(m.chests || [])]) if (it.item === id || it.id === id || (it.give && it.give[0] === id)) return true;
  if ((KP.ITEM_PLACES || []).some(pl => pl.item === id)) return true;   // (a pack's held items on the maps)
  return srcFiles.some(f => new RegExp(`KP\\.give\\('${id}'`).test(fs.readFileSync(f, 'utf8')));
};
const noItem = new Set();

// ------------------------------------------------------------------ the closure: evolutions and breeding
// (a parent at a level it can be: a stage that evolves stays below its evolution, as the game can't stop one)
const mons = new Map(), mon = (id, held) => { const k = id + '|' + (held || ''); if (!mons.has(k)) { const e = SP[id].evo, lv = e ? Math.max(KP.MIN_BREED_LV, Math.min(CAP, e.at - 1)) : CAP; const m = KP.make(id, lv, { plus: 5, held: held || null, abil: 0 }); mons.set(k, m); } return mons.get(k); };
const lineSet = (id) => { const L = new Set(); let q = KP.baseOf(id); for (let i = 0; q && i < 6; i++) { L.add(q); q = (SP[q].evo || {}).to; } return L; };
const fits = (side, id) => side === id || (side.startsWith('line:') ? lineSet(side.slice(5)).has(id) : types(id).includes(side));
const certain = (r) => r.chance == null || r.chance >= 1;
function closure(seed) {
  const how = new Map(seed);
  const add = (id, kind, from) => { if (!SP[id] || how.has(id)) return false; how.set(id, { kind, from }); return true; };
  for (let pass = 0, grew = true; grew && pass < 60; pass++) {
    grew = false;
    const have = [...how.keys()];
    for (const id of have) { const e = SP[id].evo; if (e && e.to && e.at <= CAP && add(e.to, 'evolves', `${name(id)} at Lv ${e.at}`)) grew = true; }
    // the recipes: the pair it needs, its needs met, and no recipe before it on that pair that never misses
    for (const r of KP.BREED_RECIPES || []) {
      if (how.has(r.child) || !SP[r.child]) continue;
      const n = r.needs || {};
      if (n.item && !itemSource(n.item)) noItem.add(`${r.child}: ${n.item}`);
      const As = have.filter(id => fits(r.a, id)).slice(0, 30), Bs = have.filter(id => fits(r.b, id)).slice(0, 30);
      search: for (const a of As) for (const b of Bs) {
        const A = mon(a, n.item), B = mon(b);
        const ms = KP.breedMatches(A, B).filter(x => x.ok), i = ms.findIndex(x => x.r === r);
        if (i >= 0 && ms.slice(0, i).every(x => !certain(x.r))) { if (add(r.child, 'recipe', `${name(a)}${n.item ? ' holding ' + n.item : ''} + ${name(b)}${r.chance != null && r.chance < 1 ? ' (a ' + Math.round(r.chance * 100) + '% egg)' : ''}`)) grew = true; break search; }
      }
    }
    // the job pairings, and the egg that takes after its first parent: with no recipe on the pair that never misses
    const plain = (a, b) => { const A = mon(a), B = mon(b); if (KP.breedMatches(A, B).some(x => x.ok && certain(x.r))) return null; return KP.breedResult(A, B, { roll: () => 2 }).sp; };
    for (const [x, y, child] of KP.BREED) {
      if (how.has(child) || !SP[child]) continue;
      const As = have.filter(id => KP.typeOf({ sp: id }) === x).slice(0, 40), Bs = have.filter(id => KP.typeOf({ sp: id }) === y).slice(0, 40);
      search2: for (const a of As) for (const b of Bs) if (plain(a, b) === child) { if (add(child, 'bred', `${name(a)} + ${name(b)} (the ${x} and ${y} pairing)`)) grew = true; break search2; }
    }
    for (const a of have) {
      const base = KP.baseOf(a); if (how.has(base)) continue;
      for (const b of have.slice(0, 300)) if (plain(a, b) === base) { if (add(base, 'bred', `${name(a)} first, with ${name(b)} (takes after its first parent)`)) grew = true; break; }
    }
  }
  return how;
}

// ------------------------------------------------------------------ each starter choice, without luck, then with it
const base = new Map([...fixed].map(([id, w]) => [id, { kind: 'source', from: w }]));
const missing = new Map(), luckOnly = new Map(); let shown = null;
for (const st of KP.STARTERS) {
  const seed = new Map(base); if (!seed.has(st)) seed.set(st, { kind: 'source', from: 'the starter' });
  const how = closure(seed);
  const withLuck = new Map(seed); for (const [id, w] of luck) if (!withLuck.has(id)) withLuck.set(id, { kind: 'source', from: w });
  const how2 = closure(withLuck);
  for (const id of DEX) {
    if (!how.has(id) && how2.has(id)) (luckOnly.get(id) || luckOnly.set(id, []).get(id)).push(st);
    if (!how2.has(id)) (missing.get(id) || missing.set(id, []).get(id)).push(st);
  }
  if (!shown) { shown = new Map(how); for (const [id, h] of how2) if (!shown.has(id)) shown.set(id, h); }   // (how a player gets it without luck, where there is a way)
  const n = DEX.filter(id => how.has(id)).length, n2 = DEX.filter(id => how2.has(id)).length;
  console.log(`starter ${name(st)}: ${n} of ${DEX.length} without luck, ${n2} with the MogNet Swap and the Recycler`);
}

// ------------------------------------------------------------------ the report
const kinds = {}; for (const id of DEX) { const h = shown.get(id); const k = h ? (h.kind === 'source' ? (/wild on/.test(h.from) ? 'wild' : /luck/.test(h.from) ? 'luck' : /standing/.test(h.from) ? 'legend' : 'other source') : h.kind) : 'none'; kinds[k] = (kinds[k] || 0) + 1; }
console.log('how each is first had (first starter): ' + Object.entries(kinds).map(([k, v]) => k + ' ' + v).join(', '));
if (deadTables.length) console.log('WARN wild tables on maps whose grass no one can reach: ' + deadTables.join('; '));
if (hidden.length) { console.log('FAIL maps that switch wild tables by a getter with no kpWildZones (the Demo never looks there): ' + hidden.join(', ')); process.exitCode = 1; }
if (noItem.size) console.log('WARN recipe items nothing sells or leaves on a map: ' + [...noItem].join('; '));
const allThree = [...missing].filter(([, s]) => s.length === KP.STARTERS.length).map(([id]) => id);
const some = [...missing].filter(([, s]) => s.length < KP.STARTERS.length);
if (luckOnly.size) console.log(`WARN ${luckOnly.size} only by luck (the MogNet Swap / the Recycler): ` + [...luckOnly.keys()].slice(0, verbose ? 999 : 25).map(name).join(', ') + (luckOnly.size > 25 && !verbose ? ` ... (--verbose for all)` : ''));
if (some.length) console.log(`FAIL ${some.length} out of reach for some starter choices: ` + some.map(([id, s]) => name(id) + ' [' + s.join(', ') + ']').join('; '));
if (allThree.length) console.log(`FAIL ${allThree.length} out of reach whatever the starter: ` + allThree.slice(0, verbose ? 999 : 40).map(name).join(', ') + (allThree.length > 40 && !verbose ? ' ... (--verbose for all)' : ''));
if (why) {
  const trail = (id, d = 0) => { const h = shown.get(id); console.log('  '.repeat(d + 1) + name(id) + ': ' + (h ? h.kind + ' - ' + h.from : 'NOT obtainable')); if (h && d < 12) { const m = /\(([a-z0-9_]+)\)/.exec(h.from); if (m && m[1] !== id && h.kind !== 'source') trail(m[1], d + 1); } };
  for (const w of why.split(',')) { console.log('how ' + w + ' is had:'); trail(w); }   // (--why a,b,c: several)
}
console.log(missing.size ? `${missing.size} entr${missing.size === 1 ? 'y' : 'ies'} out of reach` : `every entry can be had (${DEX.length})`);
process.exitCode = missing.size || hidden.length ? 1 : 0;
