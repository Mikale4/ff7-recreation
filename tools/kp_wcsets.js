// The World Championship's competitive sets (the user, 2026-10-03: optimal abilities, held items and natures on the
// tournament moogles, "for world championship only"). For every kind a World Championship team can field (the
// trainer pool's teams, the pack overrides and the rivals, each fully evolved: KP.finalOf), at the level cap with its
// competitive moveset (KP.compMoves), perfect IVs and the Championship's +5, the battle AI's duels (T.evaluate in an
// offline battle, as the Demo's R.kpItemGains) against a bench of strong tournament kinds pick:
//   1. its ability: each slot its kind has (the two usual, the hidden one);
//   2. its appetite (Pokemon's nature): every one;
//   3. its held items, ranked: every held item, by R.kpItemGains (the Demo's own scorer), the best few kept so the
//      item clause (no two alike on a team) can fall back to the next.
// Writes js/kupomon/content/kp_c95_wcsets.js (KP.WC_SETS), read by kp_league.js teamOf for the World Championship.
//   node tools/kp_wcsets.js [--dry] [--only sp1,sp2]
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
process.chdir(ROOT);
const { boot } = require('./sim_prelude');
const { FF7 } = boot();
const KP = FF7.kupomon, T = KP.tactics, R = FF7.runner;
FF7.audio.sfx = () => {}; FF7.audio.push = () => {}; FF7.audio.pop = () => {}; FF7.audio.play = () => {};
if (FF7.fx) FF7.fx.clear = () => {};
FF7.state = KP.newState(FF7.state);
const argv = process.argv.slice(2), dry = argv.includes('--dry');
const only = argv.includes('--only') ? new Set(argv[argv.indexOf('--only') + 1].split(',')) : null;
const OUT = 'js/kupomon/content/kp_c95_wcsets.js', PLUS = 5, LV = KP.MAX_LEVEL;

// the kinds a World Championship team can field
const kinds = new Set();
for (const t of KP.TRAINER_POOL) for (const tm of t.teams) {
  const ov = KP.POOL_OVERRIDES && KP.POOL_OVERRIDES[t.name];
  const team = ov ? ov.map(x => Array.isArray(x) ? x : [x, 30]) : tm.rival ? KP.W.rivalTeam(tm.rival[0], tm.rival[1]) : tm.team;
  for (const [sp] of team) if (KP.SPECIES[sp]) kinds.add(KP.finalOf(sp));
  // (the sixth a five-strong team takes in a tournament: kp_league.js KP.sixthFor)
  const t6 = team.slice(); while (KP.sixthFor && t6.length < KP.PARTY_MAX) { const x = KP.sixthFor(t6, t.name); if (!x) break; kinds.add(x); t6.push([x, 50, {}]); }
}
const perfect = Object.fromEntries(KP.STATS.map(k => [k, 31]));
const mk = (sp, o = {}) => {
  const m = KP.make(sp, LV, { iv: perfect, app: o.app || 'content', abil: o.abil != null ? o.abil : 0 });
  m.plus = PLUS; m.moves = KP.compMoves(sp, LV); m.hp = KP.maxHp(m); m.held = null; return m;
};
// one duel, played out (the Demo's: kp_runner.js duel)
const duel = (mon, foe) => {
  const B = new KP.Battle({ kind: 'trainer', area: '-', foes: [foe], spectate: { mons: [mon], name: 'x' }, noBag: true }, { done: false });
  B.turn = 0; const a = T.ghost(B, mon, 'me'), b = T.ghost(B, foe, 'foe'); B.me = a; B.foe = b; B.turn = 1;
  const ids = mon.moves.filter(id => KP.MOVES[id] && B.usable(a, id));
  return ids.length ? Math.max(...ids.map(id => T.evaluate(B, a, b, id))) : -150;
};
// the bench: strong tournament kinds, one of each job type in turn, strongest first (12)
const byType = {};
for (const sp of [...kinds].sort((a, b) => KP.bst(b) - KP.bst(a))) (byType[KP.SPECIES[sp].type] = byType[KP.SPECIES[sp].type] || []).push(sp);
const benchSp = [];
for (let r = 0, more = true; more && benchSp.length < 12; r++) { more = false; for (const t in byType) if (byType[t][r] && benchSp.length < 12) { benchSp.push(byType[t][r]); more = true; } }
const bench = benchSp.map(sp => mk(sp));
const avg = (m) => { let v = 0; for (const f of bench) { f.hp = KP.maxHp(f); f.status = null; m.hp = KP.maxHp(m); m.status = null; v += duel(m, f); } return v / bench.length; };
const drive = (g) => { let r; do r = g.next(); while (!r.done); return r.value; };
const heldPool = Object.keys(KP.ITEMS).filter(k => KP.ITEMS[k].kind === 'held');
const APPS = KP.APPETITE_IDS.filter(k => KP.APPETITES[k].plus || k === 'content');

console.error(`${kinds.size} kinds; bench: ${benchSp.join(', ')}`);
const sets = {}, t0 = Date.now();
let i = 0;
for (const sp of [...kinds].sort()) {
  i++;
  if (only && !only.has(sp)) continue;
  const slots = (KP.SPECIES_ABIL && KP.SPECIES_ABIL[sp]) || [];
  const abils = [0, 1, 2].filter(s => s < slots.length && slots[s] && KP.ABILITIES[slots[s]] && !(s > 0 && slots.slice(0, s).includes(slots[s])));
  if (!abils.length) abils.push(0);
  // 1. the ability (a neutral appetite), 2. the appetite (that ability), then the ability again with that appetite
  let abil = abils[0], app = 'content', best = -Infinity;
  for (const s of abils) { const v = avg(mk(sp, { abil: s, app })); if (v > best) { best = v; abil = s; } }
  best = -Infinity;
  for (const a of APPS) { const v = avg(mk(sp, { abil, app: a })); if (v > best) { best = v; app = a; } }
  if (abils.length > 1) { best = -Infinity; for (const s of abils) { const v = avg(mk(sp, { abil: s, app })); if (v > best) { best = v; abil = s; } } }
  // 3. the held items, ranked by the Demo's own scorer
  const m = mk(sp, { abil, app });
  FF7.state.kp.party = [m];
  const gains = drive(R.kpItemGains([m], heldPool, bench)).get(m);
  const held = [...gains].filter(([, v]) => v > 0.5).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => [k, +v.toFixed(1)]);
  sets[sp] = { abil, app, held, score: +best.toFixed(1) };
  const secs = (Date.now() - t0) / 1000;
  console.error(`${i}/${kinds.size} ${sp}: ${(KP.ABILITIES[slots[abil]] || {}).name || slots[abil]} / ${KP.APPETITES[app].name} / ${held.slice(0, 3).map(h => KP.ITEMS[h[0]].name + ' +' + h[1]).join(', ')}  (${secs.toFixed(0)}s)`);
}
const lines = ['// GENERATED by tools/kp_wcsets.js: the World Championship\'s competitive sets (docs/KUPOMON.md "The tournaments").',
  "// Each kind's ability slot, appetite and held items (best first, the gain over holding nothing), picked by the battle",
  "// AI's duels at the level cap, +5 and perfect IVs. Don't edit by hand: run the tool again.",
  '(function () {', '  const KP = FF7.kupomon;', '  KP.WC_SETS = {'];
const merged = Object.assign({}, only && fs.existsSync(path.join(ROOT, OUT)) ? (() => { const S = {}; try { new Function('FF7', fs.readFileSync(path.join(ROOT, OUT), 'utf8'))({ kupomon: S }); } catch (e) {} return S.WC_SETS || {}; })() : {}, sets);
for (const sp of Object.keys(merged).sort()) { const s = merged[sp]; lines.push(`    ${sp}: { abil: ${s.abil}, app: '${s.app}', held: [${s.held.map(([k, v]) => `['${k}', ${v}]`).join(', ')}] },`); }
lines.push('  };', '})();', '');
if (!dry) { fs.writeFileSync(path.join(ROOT, OUT), lines.join('\n')); console.error('wrote ' + OUT + ' (' + Object.keys(merged).length + ' kinds)'); }
else console.log(lines.slice(0, 20).join('\n'));
