// The World Championship's trainers ranked (a question of the user's, 2026-10-03: "if you were to make a top 10 list
// of the best championship tourney trainers, who would they be and why?"): every trainer who can be drawn for it,
// the main game's (KP.TRAINER_POOL: each bout one of its teams at random, as a bracket draws it) and the archetype
// opponents (KP.WC_ARCHETYPES), with their teams exactly as the bracket makes them (KP.tourneyTeamOf: six, +5, perfect
// IVs, the WC sets), in bouts against random others played out by the tournament AI ('max', team preview), each side
// in turn. The ranking is a Bradley-Terry rating fitted to every result (a win over a strong team counts for more
// than one over a weak one), with the raw record beside it.
//   node tools/kp_wcrank.js [--bouts N] [--seed S] [--out file.json]   (one shard; run several with different seeds)
//   node tools/kp_wcrank.js --merge a.json b.json ...                   (the ranking from every shard's results)
const path = require('path'), fs = require('fs');
process.chdir(path.join(__dirname, '..'));
const argv = process.argv.slice(2), arg = (k, d) => argv.includes(k) ? argv[argv.indexOf(k) + 1] : d;

function rank(results, names, info) {
  // Bradley-Terry by minorization-maximization: p_i = W_i / sum_j n_ij / (p_i + p_j)
  const ids = Object.keys(names), W = {}, N = {};
  for (const id of ids) { W[id] = 0; N[id] = {}; }
  for (const [a, b, aw] of results) { if (!(a in W) || !(b in W)) continue; if (aw) W[a]++; else W[b]++; N[a][b] = (N[a][b] || 0) + 1; N[b][a] = (N[b][a] || 0) + 1; }
  // (a prior: each trainer one win and one loss against an average one, rating 1 fixed: a short unbeaten record
  // against weak teams doesn't run off to infinity, and few games pull a rating towards the middle)
  let p = Object.fromEntries(ids.map(id => [id, 1]));
  for (let it = 0; it < 500; it++) {
    const q = {};
    for (const i of ids) { let den = 2 / (p[i] + 1); for (const [j, n] of Object.entries(N[i])) den += n / (p[i] + p[j]); q[i] = (W[i] + 1) / den; }
    p = q;
  }
  const games = (id) => Object.values(N[id]).reduce((s, n) => s + n, 0);
  return ids.map(id => ({ id, name: names[id], info: info[id], r: Math.round(400 * Math.log10(p[id]) + 1500), w: W[id], n: games(id) }))
    .sort((x, y) => y.r - x.r);
}

if (argv.includes('--merge')) {
  const files = argv.slice(argv.indexOf('--merge') + 1).filter((f, i, a) => !f.startsWith('--') && !['--json', '--top', '--topn'].includes(a[i - 1]));
  let results = [], names = {}, info = {};
  for (const f of files) { const j = JSON.parse(fs.readFileSync(f, 'utf8')); results = results.concat(j.results); Object.assign(names, j.names); Object.assign(info, j.info); }
  const R = rank(results, names, info);
  console.log(`${results.length} bouts, ${R.length} trainers`);
  // (each one's record against the archetype opponents alone too: the main game's trainers are the easy draws)
  const vsArch = (id) => { let w = 0, n = 0; for (const [a, b, aw] of results) { if (a === id && b.startsWith('arch:')) { n++; if (aw) w++; } else if (b === id && a.startsWith('arch:')) { n++; if (!aw) w++; } } return w + '-' + (n - w); };
  R.forEach((x, i) => console.log(`${String(i + 1).padStart(3)}. ${x.name.padEnd(22)} ${x.r}  ${x.w}-${x.n - x.w} (${Math.round(100 * x.w / Math.max(1, x.n))}%)  vs archetypes ${vsArch(x.id)}  ${x.info}`));
  if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify(R, null, 1));
  if (arg('--top')) fs.writeFileSync(arg('--top'), JSON.stringify(R.slice(0, +arg('--topn', 60)).map(x => x.id)));   // (the leaders, for a --pool pass)
  return;
}

const { boot } = require('./sim_prelude');
const { FF7 } = boot();
const KP = FF7.kupomon;
FF7.audio.sfx = () => {}; FF7.audio.push = () => {}; FF7.audio.pop = () => {}; FF7.audio.play = () => {};
if (FF7.fx) FF7.fx.clear = () => {};
FF7.state = KP.newState(FF7.state);
const BOUTS = +arg('--bouts', 200), L = KP.LEAGUES.find(l => l && l.n === 5);
let seed = +arg('--seed', Date.now() % 100000);
// (a shard's own draws, repeatable: mulberry32; a plain LCG in floating point lost its low bits and cycled, 2,200
// bouts that were 438 pairings over and over)
{ let x = seed >>> 0; Math.random = () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// every trainer who can be drawn: the main game's (a team at random each bout) and the archetypes
const field = [];
for (const t of KP.TRAINER_POOL) {
  const ov = KP.POOL_OVERRIDES && KP.POOL_OVERRIDES[t.name];
  const teams = t.teams.map(tm => ov ? Object.assign({}, tm, { team: ov.map(x => Array.isArray(x) ? x : [x, 30]), rival: null }) : tm);
  field.push({ id: 'main:' + t.name, name: t.name, teams, info: 'main game (' + teams.length + ' team' + (teams.length > 1 ? 's' : '') + ')' });
}
for (const a of KP.WC_ARCHETYPES || []) field.push({ id: 'arch:' + a.name, name: a.name, teams: [Object.assign({}, a, { arch: true })], info: a.style || a.key });
const names = Object.fromEntries(field.map(f => [f.id, f.name])), info = Object.fromEntries(field.map(f => [f.id, f.info]));
// (--pool file: only these trainers (a JSON list of ids: the leaders of a first pass, played off against each other)
if (arg('--pool')) { const keep = new Set(JSON.parse(fs.readFileSync(arg('--pool'), 'utf8'))); for (let i = field.length - 1; i >= 0; i--) if (!keep.has(field[i].id)) field.splice(i, 1); }

const P = KP.Battle.prototype, sayFast = P.say;
P.say = function* (t) { yield* sayFast.call(this, t, 1); };
const results = [];
let errors = 0;
const t0 = Date.now();
for (let n = 0; n < BOUTS; n++) {
  const a = field[Math.floor(Math.random() * field.length)]; let b = a; while (b === a) b = field[Math.floor(Math.random() * field.length)];
  const ea = a.teams[Math.floor(Math.random() * a.teams.length)], eb = b.teams[Math.floor(Math.random() * b.teams.length)];
  let w = null;
  try {
    const ma = KP.W.team(KP.tourneyTeamOf(ea, L), true), mb = KP.W.team(KP.tourneyTeamOf(eb, L), true);
    w = KP.battle({ kind: 'trainer', spectate: { name: a.name, mons: ma }, foes: mb, noBag: true, canLose: true, bg: 'arena', ai: 'max', preview: true, meLead: ea.lead, foeLead: eb.lead, trainer: { name: b.name, money: 0 } });
    for (let i = 0; i < 400000 && !w.done; i++) FF7.stepFrame();
  } catch (e) { errors++; console.log('ERROR in ' + a.name + ' vs ' + b.name + ': ' + String(e.stack || e).split('\n').slice(0, 2).join(' | ')); }
  while (FF7.sceneMgr.stack.length && FF7.sceneMgr.top() instanceof KP.Battle) FF7.sceneMgr.pop();
  if (w && w.done) results.push([a.id, b.id, w.result === 'win' ? 1 : 0]);
  if ((n + 1) % 25 === 0) {   // (saved as it goes: a shard stopped early still counts)
    console.log(`${n + 1} bouts (${Math.round((Date.now() - t0) / 1000)}s)`);
    if (arg('--out')) fs.writeFileSync(arg('--out'), JSON.stringify({ results, names, info }));
  }
}
P.say = sayFast;
const out = arg('--out');
if (out) fs.writeFileSync(out, JSON.stringify({ results, names, info }));
console.log(`${results.length} bouts played, ${errors} errors, ${Math.round((Date.now() - t0) / 1000)}s`);
if (!out) rank(results, names, info).slice(0, 15).forEach((x, i) => console.log(`${i + 1}. ${x.name} ${x.r} ${x.w}-${x.n - x.w}`));
