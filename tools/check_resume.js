// Resume check (docs/RUNNER.md "Resuming"): for every checkpoint a run saved, where would the runner carry on
// (R.findResume: after the last hard `expect` guard that holds) compared with where that checkpoint sits in the
// route? A resume far AFTER its checkpoint skips part of the story (a guard that holds too early: make it
// { soft: true } or narrower); one before it only replays steps whose done-conditions skip them.
//   node tools/check_resume.js <ckpt-dir> [--max 40]
// <ckpt-dir>: the --ckpt-dir of a full run (tools/run_runner.js), holding runner_ckpt_<label>.json files.
// Exit code 1 when any checkpoint resumes more than --max steps after itself.
const fs = require('fs'), path = require('path');
const argv = process.argv.slice(2);
const dir = argv.find(a => !a.startsWith('--'));
const maxI = argv.indexOf('--max'), MAX = maxI >= 0 ? +argv[maxI + 1] : 40;
if (!dir || !fs.existsSync(dir)) { console.error('usage: node tools/check_resume.js <ckpt-dir> [--max 40]'); process.exit(2); }
const { boot } = require('./sim_prelude');
const { FF7 } = boot();
const R = FF7.runner;
const plan = R.buildPlan(R.CHAPTERS);
R.plan = plan; R.ctx = R.contexts(plan);
const ckIdx = {};
plan.forEach((s, i) => { if (Array.isArray(s) && s[0] === 'ckpt') ckIdx[s[1]] = i; });
const guardText = (i) => { let g = i - 1; while (g >= 0 && !(Array.isArray(plan[g]) && plan[g][0] === 'expect')) g--; if (g < 0) return '-'; const c = plan[g][1]; return '#' + g + ' ' + (typeof c === 'function' ? c.toString().slice(0, 90) : JSON.stringify(c)); };
const rows = [];
for (const f of fs.readdirSync(dir).filter(f => /^runner_ckpt_.*\.json$/.test(f))) {
  const label = f.replace(/^runner_ckpt_|\.json$/g, ''), want = ckIdx[label];
  if (want == null) continue;
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  try { FF7.loadState(d.state || d); for (let i = 0; i < 3; i++) FF7.stepFrame(); } catch (e) { rows.push({ label, want, err: 'load: ' + e.message }); continue; }
  let at; try { at = R.findResume(plan); } catch (e) { rows.push({ label, want, err: 'findResume: ' + e.message }); continue; }
  rows.push({ label, want, at, d: at - want, guard: guardText(at) });
}
rows.sort((a, b) => a.want - b.want);
let bad = 0;
for (const r of rows) {
  if (r.err) { bad++; console.log('ERROR ', r.label, r.err); continue; }
  const late = r.d > MAX, early = r.d < -MAX;
  if (late) bad++;
  if (late || early) console.log((late ? 'AHEAD ' : 'BEHIND'), r.label.padEnd(24), 'ckpt #' + r.want, '-> resumes #' + r.at, '(' + (r.d > 0 ? '+' : '') + r.d + ')', r.guard);
}
console.log(rows.length + ' checkpoints: ' + bad + ' resume more than ' + MAX + ' steps ahead of themselves');
process.exitCode = bad ? 1 : 0;
