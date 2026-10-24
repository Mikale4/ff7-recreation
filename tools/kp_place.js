// Kupomon expansion: the wild placement (docs/KUPOMON_CONTENT.md "habitat"). Every new line that lives in the wild
// (class normal or pseudo, rarity common / uncommon / rare) goes into one or two of the world's wild tables whose
// ground fits its habitat, at the stage that fits the table's levels (a late route meets the evolved jobs), spread so no
// table gets crowded. Writes js/kupomon/content/kp_c90_wild.js (pack 'wild'); run it again after any species change.
//   node tools/kp_place.js [--dry]
const fs = require('fs'), path = require('path');
const { boot, ROOT } = require('./sim_prelude');
const { FF7, load } = boot();
const KP = FF7.kupomon;
const dry = process.argv.includes('--dry');
const OUT = 'js/kupomon/content/kp_c90_wild.js';
// the packs not in the loader yet (as tools/kp_contentcheck.js), the wild pack itself left out
const loaderSrc = fs.readFileSync(path.join(ROOT, 'js/loader.js'), 'utf8');
const dir = path.join(ROOT, 'js/kupomon/content');
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js') && !OUT.endsWith(f)).sort()) { const rel = 'js/kupomon/content/' + f; if (!loaderSrc.includes(rel)) load(rel); }
KP.WILD_ADD = {};   // (the old placement aside: this run places afresh)
KP.rescaleWild();

// each table's ground, and how many new rows it takes
const GROUND = {
  kp_route1: ['grass', 'town'], kp_route1_north: ['grass', 'town', 'forest'], kp_route2: ['grass', 'beach'], kp_whisperwood: ['forest'], kp_whisperwood_glade: ['forest', 'grass'],
  kp_route3: ['grass', 'town'], kp_route4: ['beach', 'sea'], kp_route5: ['mountain', 'grass'], kp_mtkupo_1: ['cave'], kp_mtkupo_2: ['cave'], kp_mtkupo_glow: ['cave', 'lifestream'],
  kp_cogsworth: ['factory', 'town'], kp_route6: ['grass', 'town'], kp_route7: ['mountain', 'snow'], kp_route8: ['desert'], kp_sandsea: ['desert', 'town'], kp_ruins: ['ruins', 'desert'],
  kp_route9: ['desert', 'sky', 'ruins'], kp_route10: ['beach', 'sea'], kp_route11: ['swamp', 'forest'], kp_ravenmoor: ['night', 'swamp'], kp_route12: ['mountain', 'night'],
  kp_lifestream: ['lifestream', 'night'], kp_route13: ['mountain', 'snow'], kp_summit: ['mountain', 'snow', 'volcano'], kp_route14: ['sky'], kp_crater: ['crater', 'volcano', 'lifestream'],
  kp_mognet: ['town', 'factory', 'sky'],
};
const CAP = 12;
const HAB_NEAR = { volcano: ['crater', 'mountain'], snow: ['mountain'], sea: ['beach'], factory: ['town', 'cave'], night: ['swamp', 'forest'], lifestream: ['crater', 'cave'], ruins: ['desert', 'cave'], sky: ['mountain'], town: ['grass'], crater: ['volcano', 'cave'], swamp: ['forest'], cave: ['mountain'], desert: ['ruins'], beach: ['grass'], forest: ['grass'], mountain: ['cave'], grass: ['forest'] };
const tables = Object.keys(GROUND).filter(k => KP.WILD[k]);
const range = (k) => { const L = KP.WILD[k]; return [Math.min(...L.map(r => r[2])), Math.max(...L.map(r => r[3]))]; };
const load0 = {}; tables.forEach(k => { load0[k] = 0; });

// the lines to place: their first stage, its stages and their level bands
const newSp = Object.values(KP.CONTENT).flatMap(r => r.species);
const bases = newSp.filter(id => !newSp.some(o => (KP.SPECIES[o].evo || {}).to === id));
const stagesOf = (b) => { const L = []; let lo = 1, q = b; while (q) { const e = KP.SPECIES[q].evo; L.push({ id: q, lo, hi: e ? e.at - 1 : 50 }); lo = e ? e.at : 51; q = e && e.to; } return L; };
const W = { common: 10, uncommon: 5, rare: 2 };
const out = {}; let placed = 0, skipped = [];
// the rarer and pickier first (pseudos), then by habitat scarcity
const order = bases.slice().sort((a, b) => (KP.SPECIES[b].class === 'pseudo') - (KP.SPECIES[a].class === 'pseudo'));
for (const b of order) {
  const S = KP.SPECIES[b], cls = S.class || 'normal';
  if (!['normal', 'pseudo'].includes(cls) || !S.rarity || S.rarity === 'none') { skipped.push(b); continue; }
  const habs = [S.habitat, ...(HAB_NEAR[S.habitat] || [])];
  const st = stagesOf(b);
  // candidate tables: the habitat's, then the near ones'; each with the stage that fits its levels
  const cand = [];
  habs.forEach((h, hi) => tables.forEach(k => {
    if (!GROUND[k].includes(h)) return;
    const [lo, hiLv] = range(k), mid = (lo + hiLv) / 2;
    const s = st.find(x => mid >= x.lo && mid <= x.hi) || st[st.length - 1];
    const a = Math.max(lo, s.lo), z = Math.min(hiLv, s.hi);
    if (a > z) return;
    if (cls === 'pseudo' && lo < 25) return;   // (a pseudo-legendary only later on)
    cand.push({ k, s, a, z, pref: hi, load: load0[k] });
  }));
  if (!cand.length) { skipped.push(b + ' (no table)'); continue; }
  cand.sort((x, y) => x.pref - y.pref || x.load - y.load || x.a - y.a);
  const n = 1, picks = [];   // (one table a line: a route keeps about a dozen new kinds)
  for (const c of cand) { if (picks.length >= n) break; if (load0[c.k] >= CAP && cand.some(o => load0[o.k] < CAP)) continue; if (picks.some(p => p.k === c.k)) continue; picks.push(c); }
  for (const c of picks) {
    (out[c.k] = out[c.k] || []).push([c.s.id, cls === 'pseudo' ? 1 : W[S.rarity] || 5, c.a, c.z]);
    load0[c.k]++; placed++;
  }
}
// the held items found on the maps (find: true): one each, on a free tile a player can reach, on the later maps in
// turn (every third one hidden)
FF7.state = KP.newState(FF7.state); FF7.state.kp.party.push(KP.make(KP.STARTERS[0], 5));
const reach = require('./kp_reach')(FF7), key = (x, y) => x + ',' + y;
const FIND_MAPS = ['kp_route7', 'kp_route8', 'kp_sandsea', 'kp_ruins', 'kp_route9', 'kp_route10', 'kp_route11', 'kp_ravenmoor', 'kp_route12', 'kp_lifestream', 'kp_route13', 'kp_summit', 'kp_route14', 'kp_crater', 'kp_mognet'].filter(m => FF7.maps[m]);
const taken = new Set((KP.CHIP_PLACES || []).filter(p => p.map).map(p => p.map + ':' + key(p.at[0], p.at[1])));
const finds = Object.keys(KP.ITEMS).filter(k => KP.ITEMS[k].kind === 'held' && KP.ITEMS[k].find);
const places = [];
finds.forEach((it, i) => {
  const map = FIND_MAPS[i % FIND_MAPS.length], r = reach(map), cand = [...r.got].filter(k => !r.busy.has(k) && !taken.has(map + ':' + k) && !k.split(',').some(v => +v <= 1));
  if (!cand.length) return;
  // a spot away from the entries: the reachable tile farthest from the map's first entry (a little searching)
  const e = Object.values(FF7.maps[map].entries || {})[0] || [0, 0];
  cand.sort((a, b) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return (Math.abs(bx - e[0]) + Math.abs(by - e[1])) - (Math.abs(ax - e[0]) + Math.abs(ay - e[1])); });
  const k = cand[Math.min(cand.length - 1, 3 + (i * 7) % 11)], [x, y] = k.split(',').map(Number);
  taken.add(map + ':' + k);
  places.push({ item: it, map, at: [x, y], hidden: i % 3 === 2 });
});
const lines = ["// GENERATED by tools/kp_place.js: the expansion's wild moogles, spread over the world's wild tables by habitat and",
  "// level (docs/KUPOMON_CONTENT.md). Don't edit by hand: change a species' habitat or rarity and run the tool again.",
  '(function () {', '  const KP = FF7.kupomon;', "  KP.content('wild', {", '    wild: {'];
for (const k of tables) if (out[k]) lines.push(`      ${k}: [${out[k].map(r => `['${r[0]}', ${r[1]}, ${r[2]}, ${r[3]}]`).join(', ')}],`);
lines.push('    },', `    places: [${places.map(p => `{ item: '${p.item}', map: '${p.map}', at: [${p.at[0]}, ${p.at[1]}]${p.hidden ? ', hidden: true' : ''} }`).join(', ')}],`, '  });', '})();', '');
console.log(`lines ${bases.length}, placed rows ${placed}, not wild ${skipped.length}`);
tables.forEach(k => console.log(`  ${k.padEnd(22)} ${String(range(k)).padEnd(7)} +${load0[k]}`));
if (!dry) { fs.writeFileSync(path.join(ROOT, OUT), lines.join('\n')); console.log('wrote ' + OUT); }
