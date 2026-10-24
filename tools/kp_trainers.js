// Kupomon trainers: every trainer, Team Hojo grunt and dojo master on the maps (KP.TRAINER_DEFS, kp_world.js), with
// their map, class, levels on the cap of 50 and team (the expansion's themed team if a pack gives one: KP.TEAM_OVERRIDES),
// plus the rivals' meetings and the tournament pool. For the trainer remake (docs/KUPOMON_CONTENT.md "Trainers").
//   node tools/kp_trainers.js [--json out.json] [--check]
//   --check: every species on two trainers' teams (the remake's rule: trainers don't share moogles), unknown species,
//            a stage too evolved for its level
const fs = require('fs'), path = require('path');
const { boot, ROOT } = require('./sim_prelude');
const { FF7, load } = boot();
const KP = FF7.kupomon;
const argv = process.argv.slice(2), out = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null, check = argv.includes('--check');
const loaderSrc = fs.readFileSync(path.join(ROOT, 'js/loader.js'), 'utf8'), dir = path.join(ROOT, 'js/kupomon/content');
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort()) { const rel = 'js/kupomon/content/' + f; if (!loaderSrc.includes(rel)) load(rel); }
// which map each one stands on
const mapOf = {};
for (const id of Object.keys(FF7.maps)) for (const n of FF7.maps[id].npcs || []) if (n && n.id) mapOf[n.id] = id;
const rows = Object.values(KP.TRAINER_DEFS).map(t => {
  const team = KP.teamFor(t.id, t.team);
  return { id: t.id, kind: t.kind, cls: t.cls || '', name: t.name, map: mapOf[t.id] || '?', area: (FF7.maps[mapOf[t.id]] || {}).name || '', bg: t.bg || '',
    levels: (t.team || []).map(([, lv]) => KP.LV(lv)), team: team.map(([sp, lv]) => [sp, KP.LV(lv)]), themed: !!KP.TEAM_OVERRIDES[t.id] };
});
rows.sort((a, b) => Math.min(...a.levels) - Math.min(...b.levels));
const rivals = Object.fromEntries(Object.entries(KP.RIVALS || {}).map(([who, R]) => [who, Object.fromEntries(Object.entries(R).filter(([k]) => !['name', 'model', 'music'].includes(k)))]));
const pool = Object.values(KP.TRAINER_POOL || {}).map(p => ({ name: p.name, teams: p.teams.map(t => t.team) }));
if (out) { fs.writeFileSync(out, JSON.stringify({ trainers: rows, rivals, pool }, null, 1)); console.log(`wrote ${rows.length} trainers to ${out}`); }
else for (const r of rows) console.log(`${r.id.padEnd(22)} ${(r.cls + ' ' + r.name).padEnd(28)} ${r.map.padEnd(22)} Lv ${r.levels.join('/')}  ${r.team.map(t => t[0]).join(', ')}${r.themed ? '  (themed)' : ''}`);
if (check) {
  const seen = {}, errs = [];
  for (const r of rows) for (const [sp, lv] of r.team) {
    if (!KP.SPECIES[sp]) { errs.push(`${r.id}: no species ${sp}`); continue; }
    (seen[sp] = seen[sp] || []).push(r.id);
    const pre = Object.keys(KP.SPECIES).find(k => (KP.SPECIES[k].evo || {}).to === sp);
    if (pre && KP.SPECIES[pre].evo.at > lv + 6) errs.push(`${r.id}: ${sp} at Lv ${lv} (its job comes at Lv ${KP.SPECIES[pre].evo.at})`);
  }
  // (a rematch with the same person, a quest's fight with a dojo master or an elite, may bring their own moogles back)
  const who = (id) => (KP.TRAINER_DEFS[id] || {}).name;
  for (const [sp, ids] of Object.entries(seen)) if (new Set(ids.map(who)).size > 1) errs.push(`${sp} on ${ids.length} trainers: ${ids.join(', ')}`);
  console.log(`${rows.length} trainers; ${errs.length} problem(s)`); errs.slice(0, 80).forEach(e => console.log('  ' + e));
}
