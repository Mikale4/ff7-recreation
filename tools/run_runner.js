// Headless runner harness (docs/RUNNER.md): plays the runner's plan through the real game code in node
// at full speed (tools/sim_prelude.js: rendering and audio stubbed), prints progress, and stops on the
// first issue with the step, map and position.
//   node tools/run_runner.js [options]
//     --plan c1[,c2...] | file.js   chapters to play (default: the whole route, up to the first unwritten
//                                   chapter); a .js file is loaded first and its plans are played
//     --from <ckpt>                 start from a saved checkpoint (a ckpt step of an earlier run)
//     --to <ckpt>                   stop after that checkpoint
//     --start <chapter>             a synthetic start: FF7.runner.starts[chapter] (see the plan files)
//     --load <file.json>            load a checkpoint / save file and resume from its story state (the
//                                   Demo's "Esc in any game" path)
//     --demo                        pick "Demo" on the title screen and let the Demo play (real-time pacing);
//                                   with --start <ch>: the chapter's start profile, then the Demo from there;
//                                   with --load <file>: that game, then the Demo resuming from its story state
//     --report                      print the report (JSON) and write runner_report.json
//     --ckpt-dir <dir>              checkpoints, saves and the report (default: %TEMP%/ff7_runner)
//     --seed <n>                    repeatable random numbers
//     --frames <n>                  frame cap (default 4,000,000: a 100% run takes about 2.9 million)
//     --retries <n>                 restore the last checkpoint after a Game Over / failed step (default 0)
//     --date-target <id>            whom the FF7 date-point answers favour: aeris (default) | tifa | yuffie | barret
//     --movies                      watch movies instead of skipping them
//     --verbose / --quiet           every log line / only the summary
//     --battle-log                  every battle action: who, what, on whom, then everyone's HP (tuning a fight)
//     --menus apply                 menu ops through the systems instead of the menu screens (default:
//                                   the screens, driven with the buttons, as in the Demo)
//     --check                       lint the plan files (ops, map / item / NPC ids) and exit
const fs = require('fs'), path = require('path'), os = require('os');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] != null && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const has = (k) => argv.includes('--' + k);

if (opt('seed') != null) {   // mulberry32: the same run twice (xorshift32's neighbouring draws were correlated: two
  // draws back to back, a step's encounter timer then its species pick, left some species of a table never met)
  let s = (+opt('seed') >>> 0) || 1;
  Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const { boot } = require('./sim_prelude');
const { FF7, load } = boot();
const R = FF7.runner, U = FF7.util;
const quiet = has('quiet'), verbose = has('verbose');
if (has('battle-log')) {   // (each action as it ends, with both sides' HP after it)
  const A = FF7.battle.actions, exec = A.exec, nm = (x) => x ? x.name : '?';
  A.exec = function* (b, act) {
    yield* exec.call(this, b, act);
    const what = act.type + (act.id ? ':' + act.id : act.item ? ':' + act.item : '');
    const on = act.all ? 'all' : (act.targets || []).map(nm).join(',');
    console.log('      [t' + (b.turnCount || 0) + '] ' + nm(act.actor) + ' ' + what + ' -> ' + on + ' | ' + b.party.filter(x => !x.hidden).map(x => x.name + ' ' + x.hp).join(', ') + ' | ' + b.enemies.filter(e => !e.hidden).map(e => e.name + ' ' + e.hp).join(', '));
  };
}

if (has('battle-log') && FF7.kupomon && FF7.kupomon.Battle) {   // (Kupomon: every battle line, with both moogles' HP)
  const KP = FF7.kupomon, say = KP.Battle.prototype.say;
  KP.Battle.prototype.say = function* (text) {
    const hp = (f) => f && f.mon ? KP.name(f.mon) + ' ' + f.mon.hp + '/' + KP.maxHp(f.mon) : '-';
    console.log('      [kp t' + (this.turn || 0) + '] ' + String(text).replace(//g, ' ') + '   | ' + hp(this.me) + ' vs ' + hp(this.foe));
    yield* say.apply(this, arguments);
  };
}

// ---- plans
const planArg = opt('plan', null);
let chapters = null;
if (planArg) {
  chapters = [];
  for (const p of planArg.split(',')) {
    if (/\.js$/.test(p)) {
      const before = new Set(Object.keys(R.plans));
      const f = path.resolve(p);
      if (!fs.existsSync(f)) { console.error('no plan file ' + f); process.exit(2); }
      load(f);
      Object.keys(R.plans).filter(k => !before.has(k)).forEach(k => chapters.push(k));
    } else chapters.push(p);
  }
  const missing = chapters.filter(c => !R.plans[c]);
  if (missing.length) { console.error('no plan for ' + missing.join(', ') + ' (have: ' + Object.keys(R.plans).join(', ') + ')'); process.exit(2); }
}
if (opt('start') && !planArg) chapters = R.CHAPTERS.slice(Math.max(0, R.CHAPTERS.indexOf(opt('start'))));

if (has('check')) {
  const out = R.lint(chapters || Object.keys(R.plans));
  out.forEach(l => console.log(l));
  const errors = out.filter(l => !/\(warning\)/.test(l));
  console.log(`${Object.keys(R.plans).length} plan file(s): ${errors.length} error(s), ${out.length - errors.length} warning(s)`);
  process.exit(errors.length ? 1 : 0);
}

// ---- checkpoints, saves and the report go to a folder (the scratch folder)
const dir = path.resolve(opt('ckpt-dir', path.join(os.tmpdir(), 'ff7_runner')));
fs.mkdirSync(dir, { recursive: true });
const fileOf = (kind, label) => path.join(dir, 'runner_' + kind + '_' + String(label).replace(/[^\w.-]+/g, '_') + '.json');
R.persist = {
  saveCkpt(label, data) { fs.writeFileSync(fileOf('ckpt', label), JSON.stringify(data)); },
  loadCkpt(label) { const f = fileOf('ckpt', label); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; },
  saveGame(why, data) { fs.writeFileSync(fileOf('save', why), JSON.stringify(data)); },
};

// ---- progress
const t0 = Date.now();
let frames = 0;
const maxFrames = +opt('frames', 4000000);
const partyText = () => { const st = FF7.state; return st.party.filter(Boolean).map(id => { const c = st.chars[id]; return c ? c.name + ' L' + c.level : id; }).join(', '); };
const stepLine = () => {
  const s = R.status(), st = FF7.state;
  return `#${String(s.step).padStart(3)}/${s.of} ${s.op.padEnd(44).slice(0, 44)} | ${(s.map || '-')} ${s.pos ? s.pos.join(',') : ''} | flags ${Object.keys(st.flags).length} | ${partyText()} | ${U.fmtTime(st.time)} | f${frames}`;
};
const logSeen = new Set(['!!', 'checkpoint', 'battle ', 'received', 'choice', 'date ', 'minigame', 'saved', 'restored', 'resum', 'the route ends', 'runner stopped', 'note:', 'equip:', 'materia:', 'name ',
  'bought ', 'stole ', 'morphed ', 'eskill learned', 'learned:', 'limit manual', 'buyNew']);
R.onLogHook = (line) => {
  if (quiet) return;
  if (verbose) { console.log('   ' + line); return; }
  const body = line.replace(/^\[[^\]]*\]\s*/, '');
  for (const k of logSeen) if (body.startsWith(k)) { console.log('   ' + line); return; }
};
const startOpts = { mode: 'fast', retries: +opt('retries', 0), movies: has('movies') ? 'watch' : 'skip', to: opt('to', undefined), onLog: (l) => R.onLogHook(l) };
if (opt('menus')) startOpts.menus = opt('menus');
if (opt('date-target')) startOpts.dateTarget = opt('date-target');
if (chapters) startOpts.chapters = chapters;

// ---- the start
let started = false;
if (has('demo') && (opt('start') || opt('load'))) {
  // the Demo from a chapter start or a saved game (as Esc in a game would start it), with the Demo's pacing
  if (opt('load')) {
    const data = JSON.parse(fs.readFileSync(path.resolve(opt('load')), 'utf8'));
    FF7.loadState(data.state || data);
    for (let i = 0; i < 3; i++) { FF7.stepFrame(); frames++; }
  } else {
    const prof = R.starts[opt('start')];
    if (!prof) { console.error('no start profile FF7.runner.starts.' + opt('start') + ' (define it in the plan file of the chapter)'); process.exit(2); }
    R.applyStart(prof);
  }
  const ro = { onLog: (l) => R.onLogHook(l) };
  ['menus', 'to'].forEach(k => { if (opt(k)) ro[k] = opt(k); });
  if (opt('date-target')) ro.dateTarget = opt('date-target');
  if (opt('retries') != null) ro.retries = +opt('retries');
  if (has('movies')) ro.movies = 'watch';
  if (chapters) ro.chapters = chapters;
  started = R.demo.start({ resume: !!opt('load'), runner: ro }) && R.active;
  if (started && !quiet) console.log('Demo started from ' + (opt('load') ? opt('load') : 'the ' + opt('start') + ' start') + ' (' + R.plan.length + ' steps)');
} else if (has('demo')) {
  // a player on the title screen: down to "Demo", OK
  FF7.sceneMgr.set(new FF7.scenes.Title());
  const T = FF7.sceneMgr.top();
  const tap = (b) => { FF7.input.setVirtual([b]); FF7.stepFrame(); FF7.input.setVirtual([]); FF7.stepFrame(); frames += 2; };
  while (T.t < 52) { FF7.stepFrame(); frames++; }
  for (let g = 0; g < 10 && T.items[T.idx] !== 'Demo'; g++) tap('down');
  tap('ok');
  if (!R.active || !R.demo.active) { console.error('the Demo did not start from the title screen'); process.exit(1); }
  R.opts.onLog = (l) => R.onLogHook(l);
  if (opt('menus')) R.opts.menus = opt('menus');
  if (chapters) { R.plan = R.buildPlan(chapters); R.ctx = R.contexts(R.plan); }   // --plan: only those chapters
  if (!quiet) console.log('Demo started from the title menu (' + R.plan.length + ' steps)');
  started = true;
} else if (opt('load')) {
  const data = JSON.parse(fs.readFileSync(path.resolve(opt('load')), 'utf8'));
  FF7.loadState(data.state || data);
  for (let i = 0; i < 3; i++) { FF7.stepFrame(); frames++; }
  started = R.start(Object.assign({ resume: true }, startOpts));
} else if (opt('start')) {
  const prof = R.starts[opt('start')];
  if (!prof) { console.error('no start profile FF7.runner.starts.' + opt('start') + ' (define it in the chapter\'s plan file)'); process.exit(2); }
  R.applyStart(prof);
  started = R.start(startOpts);
} else {
  if (opt('from')) startOpts.from = opt('from');
  started = R.start(startOpts);
}
if (!started) { console.error('the runner did not start: ' + (R.log || []).slice(-3).join(' | ')); process.exit(1); }

// ---- run
let lastPc = -1, lastStatus = 0;
while (R.active && frames < maxFrames) {
  FF7.stepFrame(); frames++;
  if (R.pc !== lastPc && !quiet) { lastPc = R.pc; console.log(stepLine()); }
  if (frames - lastStatus >= 60000 && !quiet) { lastStatus = frames; console.log('   ... ' + stepLine()); }
}
if (R.active) { R.issue('frames', 'the frame cap (' + maxFrames + ') was reached'); }

// ---- summary
const rep = R.report(), st = FF7.state;
const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log('');
console.log(`== ${rep.state}${R.issues.length ? '' : ''}: step ${rep.step}/${rep.of} on ${rep.map} ${rep.pos ? rep.pos.join(',') : ''} after ${frames} frames (${U.fmtTime(frames / 60)} of game frames, playtime ${rep.playtime}) in ${secs} s`);
console.log(`   party: ${rep.party.join(' | ')} | gil ${st.gil} | flags ${rep.flags}`);
console.log(`   battles: ${rep.battles.total} (won ${rep.battles.won}, escaped ${rep.battles.escaped}, lost ${rep.battles.lost}, game overs ${rep.battles.gameOvers}) | saves ${rep.saves} | restores ${rep.restores}`);
console.log(`   received: ${rep.received.join(', ') || '-'}`);
if (rep.drops.length) console.log(`   battle drops: ${rep.drops.map(i => U.itemName(i)).join(', ')}`);
if (rep.minigames.length) console.log(`   minigames: ${rep.minigames.map(m => m.id + (m.won ? ' won' : ' lost')).join(', ')}`);
console.log(`   choices: ${rep.choices.map(c => c.choices[c.pick]).join(' | ') || '-'}`);
if (R.notes.length) console.log(`   notes: ${R.notes.length} (${R.notes.slice(-3).join(' | ')})`);
R.issues.forEach(i => console.log(`!! ISSUE ${i.kind}: ${i.msg}\n   at step ${i.step} (${i.op}) in chapter ${i.chapter}, map ${i.map} ${JSON.stringify(i.pos)}, frame ${i.frame}, playtime ${U.fmtTime(i.time || 0)}, screen ${i.top}`));
if (R.issues.length) console.log('   last log lines:\n' + R.log.slice(-12).map(l => '     ' + l).join('\n'));
console.log(`   checkpoints and saves: ${dir}`);
if (has('report')) {
  fs.writeFileSync(path.join(dir, 'runner_report.json'), JSON.stringify(rep, null, 1));
  console.log(JSON.stringify(Object.assign({}, rep, { log: rep.log.slice(-20) }), null, 1));
}
process.exitCode = R.issues.length ? 1 : 0;
