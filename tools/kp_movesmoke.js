// Kupomon: every move in a real battle (both sides using it, four turns), looking for errors the engine throws or a
// battle that stalls; with --abilities every ability (both sides having it) and --items every held item (both holding
// it), each with a mixed set of moves. A smoke test for new content packs.
//   node tools/kp_movesmoke.js [--pack name] [--all] [--abilities] [--items]
const fs = require('fs'), path = require('path');
const { boot, ROOT } = require('./sim_prelude');
const { FF7, load } = boot();
const KP = FF7.kupomon;
FF7.audio.sfx = () => {}; FF7.audio.push = () => {}; FF7.audio.pop = () => {}; FF7.audio.play = () => {};
const argv = process.argv.slice(2), only = argv.includes('--pack') ? argv[argv.indexOf('--pack') + 1] : null, all = argv.includes('--all');
const loaderSrc = fs.readFileSync(path.join(ROOT, 'js/loader.js'), 'utf8'), dir = path.join(ROOT, 'js/kupomon/content');
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort()) { const rel = 'js/kupomon/content/' + f; if (!loaderSrc.includes(rel)) load(rel); }
const st0 = FF7.state; (st0.keyItems = st0.keyItems || []).push('mogboy'); st0.vars.mogboy_carts = 127;
KP.play(); KP.enter(null, null);
['kp_intro', 'kp_starter', 'kp_rival1', 'kp_sent_off'].forEach(f => { FF7.state.flags[f] = true; });
for (let i = 0; i < 30; i++) FF7.stepFrame();
KP.learnOnLevels = function* () {};
const mode = argv.includes('--abilities') ? 'abilities' : argv.includes('--items') ? 'items' : 'moves';
const packIds = (k) => Object.values(KP.CONTENT).filter((r, i) => !only || Object.keys(KP.CONTENT)[i] === only).flatMap(r => r[k]);
const ids = mode === 'abilities' ? (all ? Object.keys(KP.ABILITIES) : packIds('abilities')) : mode === 'items' ? (all ? Object.keys(KP.ITEMS).filter(k => KP.ITEMS[k].kind === 'held') : packIds('items')) : all ? Object.keys(KP.MOVES) : packIds('moves');
const abilityOf0 = KP.abilityOf;
if (mode === 'abilities') KP.abilityOf = (mon) => mon && mon.__ab ? Object.assign({ id: mon.__ab }, KP.ABILITIES[mon.__ab]) : null;
const MIX = ['kick', 'fire', 'slash', 'cure', 'bite', 'poison_dart'].filter(m => KP.MOVES[m]);
const errs = []; let n = 0;
const err0 = console.error; let caught = [];
console.error = (...a) => { caught.push(a.map(String).join(' ')); };
for (const id of ids) {
  const d = FF7.state.kp;
  d.party = [KP.make('stampo_blackbelt', 40), KP.make('tufty_mime', 40)]; d.party[0].moves = [id, 'kick'];
  const foes = [KP.make('grumog_viking', 40), KP.make('shellmog_guardian', 40)]; foes[0].moves = [id, 'slash'];
  if (mode !== 'moves') { d.party[0].moves = MIX.slice(0, 4); foes[0].moves = MIX.slice(2, 6); for (const m of [d.party[0], foes[0]]) { if (mode === 'abilities') m.__ab = id; else m.held = id; } }
  const useId = mode === 'moves' ? id : null;
  caught = [];
  const w = KP.battle({ kind: 'trainer', foes, trainer: { name: 'Tester', money: 0 }, canLose: true, bg: 'town' });
  const B = FF7.sceneMgr.stack.find(sc => sc instanceof KP.Battle);
  let turns = 0;
  const pick = (f, dflt) => { if (useId) return this_usable(f, useId) ? useId : dflt; const L = f.mon.moves.filter(m => B.usable(f, m)); return L.length ? L[Math.floor(Math.random() * L.length)] : 'flail'; };
  const this_usable = (f, m) => B.usable(f, m);
  B.command = function* () { const f = this.forcedMove(this.me); if (f) return { kind: 'move', move: f }; return { kind: 'move', move: pick(this.me, 'kick') }; };
  B.foeChoose = function () { const f = this.forcedMove(this.foe); return f || pick(this.foe, 'slash'); };
  const eot = B.endOfTurn.bind(B); B.endOfTurn = function* () { yield* eot(); turns++; };
  let i = 0;
  try {
    for (; i < 60000 && !w.done && turns < 4; i++) {
      FF7.stepFrame();
      if (B.ui && B.ui.kind === 'party') { const p = d.party.find(m => m.hp > 0 && (!B.me || m !== B.me.mon)); B.answer(p || null); }
      if (B.ui && B.ui.kind === 'nut') B.answer(null);
      if (B.text && !B.textHold) B.textT = 999;
    }
  } catch (e) { errs.push(`${id}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
  if (caught.length) errs.push(`${id}: ${caught.slice(0, 2).join(' / ')}`);
  if (!w.done && turns < 4) errs.push(`${id}: stalled (turn ${B.turn}, ui ${B.ui && B.ui.kind}, text ${B.text})`);
  while (FF7.sceneMgr.stack.length && !(FF7.sceneMgr.top() instanceof FF7.field.FieldScene)) FF7.sceneMgr.pop();
  n++;
}
console.error = err0;
console.log(`${n} ${mode} run, ${errs.length} problem(s)`);
errs.forEach(e => console.log('  ' + e));
process.exit(errs.length ? 1 : 0);
