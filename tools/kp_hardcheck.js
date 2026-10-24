// Kupomon's Hard Mode (the user, 2026-10-02), checked through the real engine: the mode at a new game, the level cap
// (the next big battle's ace, rising as they're won; no EXP past it), one befriend per area (a gift doesn't count), a
// moogle that powers down in battle gone for good (the team refilled from the box; nobody left: the run is over), and
// breeding that keeps the parents on badge permits (36 in all). Normal Mode untouched.
//   node tools/kp_hardcheck.js
const { boot } = require('./sim_prelude');
const { FF7 } = boot();
const KP = FF7.kupomon;
FF7.audio.sfx = () => {}; FF7.audio.push = () => {}; FF7.audio.pop = () => {}; FF7.audio.play = () => {};
let pass = 0, fail = 0;
const check = (name, ok, why) => { if (ok) pass++; else { fail++; console.log('FAIL ' + name + (why != null ? ': ' + why : '')); } };
const st0 = FF7.state; (st0.keyItems = st0.keyItems || []).push('mogboy'); st0.vars.mogboy_carts = 127;
KP.play();
const start = (mode) => { KP.enter(null, null, mode); ['kp_intro', 'kp_starter', 'kp_rival1', 'kp_sent_off'].forEach(f => { FF7.state.flags[f] = true; }); for (let i = 0; i < 20; i++) FF7.stepFrame(); return FF7.state.kp; };
KP.learnOnLevels = function* () {};

// ---- the mode
let d = start('normal');
check('a new game in Normal Mode', d.mode === 'normal' && !KP.hard() && KP.levelCap() === KP.MAX_LEVEL);
{   // (a plain wild battle in Normal Mode, no trainer at all: the opening's wild and trainer lines stay apart)
  const dd = FF7.state.kp; dd.party = [KP.make('grumog_viking', 30)]; let w = null, err = null;
  FF7.fieldScene.runScript(function* (s) { try { w = yield* KP.fight(s, { kind: 'wild', foes: [KP.make('tufty_freelancer', 3)], bg: 'grass' }); } catch (e) { err = e; } }, { name: 'normal-wild' });
  for (let i = 0; i < 40000 && w == null && !err; i++) {
    try { FF7.stepFrame(); } catch (e) { err = e; break; }
    const b = FF7.sceneMgr.stack.find(sc => sc instanceof KP.Battle);
    if (b && !b.__h) { b.__h = true; b.command = function* () { return { kind: 'move', move: this.strongest(this.me) }; }; }
    if (b && b.ui && b.ui.kind === 'nut') b.answer(null);
  }
  check('a Normal Mode wild battle plays through', !err && w === 'win', err ? String(err) : w);
}
d = start('hard');
check('a new game in Hard Mode', d.mode === 'hard' && KP.hard());

// ---- the level cap: the lowest ace of the big battles not won, never below the highest won
const cap0 = KP.levelCap();
check('the first cap is the first dojo master\'s ace', cap0 === KP.LV(16), 'cap ' + cap0);
FF7.state.flags.kp_badge_1 = true; d.badges = [1];
const cap1 = KP.levelCap();
check('the cap rises once the badge is won', cap1 > cap0, `${cap0} -> ${cap1}`);
const m = KP.make('grumog_viking', cap1); m.exp = KP.expAt(m, cap1);
const ups = KP.gainExp(m, 999999);
check('no EXP past the cap', !ups.length && m.lv === cap1 && m.exp === KP.expAt(m, cap1), `lv ${m.lv}`);
const m2 = KP.make('grumog_viking', cap1 - 3); KP.gainExp(m2, 999999);
check('it grows up to the cap, no further', m2.lv === cap1, 'lv ' + m2.lv);
FF7.state.flags.kp_champion = true;
check('no cap once the Champion', KP.levelCap() === KP.MAX_LEVEL);
delete FF7.state.flags.kp_champion;

// ---- a battle harness (wild, on a given map's area)
function fight(o) {
  const dd = FF7.state.kp;
  dd.party = o.team.map(([sp, lv, x]) => Object.assign(KP.make(sp, lv), x || {}));
  dd.box = (o.box || []).map(([sp, lv]) => KP.make(sp, lv));
  const foes = o.foes.map(([sp, lv, x]) => Object.assign(KP.make(sp, lv), x || {}));
  let w; FF7.fieldScene.runScript(function* (s) { w = { r: yield* KP.fight(s, Object.assign({ kind: o.kind || 'wild', foes, bg: 'grass', area: o.area, trainer: { name: 'Tester', money: 0 } }, o.opts || {})) }; }, { name: 'hard-test' });
  const B = () => FF7.sceneMgr.stack.find(sc => sc instanceof KP.Battle);
  const log = [];
  for (let i = 0; i < 60000 && !(w && w.r !== undefined); i++) {
    FF7.stepFrame();
    const b = B(); if (!b) continue;
    if (!b.__hooked) { b.__hooked = true; const say0 = KP.Battle.prototype.say; b.say = function* (t) { log.push(t); yield* say0.call(this, t, 2); }; b.command = function* () { return o.me ? o.me(this) : { kind: 'move', move: this.strongest(this.me) }; }; if (o.foe) b.foeChoose = function () { return o.foe(this); }; }
    if (b.ui && b.ui.kind === 'nut') b.answer(Object.keys(KP.ITEMS).find(k => KP.ITEMS[k].nut && (dd.bag[k] || 0) > 0) || null);
    if (b.ui && b.ui.kind === 'party') b.answer(dd.party.find(x => x.hp > 0 && (!b.me || x !== b.me.mon)) || null);
    if (FF7.sceneMgr.top() && FF7.sceneMgr.top().constructor && FF7.sceneMgr.top().constructor.name === 'Evolve') FF7.sceneMgr.pop();
  }
  if (!(w && w.r !== undefined) && process.env.KP_DBG) { const fs = FF7.fieldScene; console.log('  dbg stuck: stack', FF7.sceneMgr.stack.map(x => x.constructor.name).join(','), 'busy', fs && fs.busy, 'queue', fs && fs.queue && fs.queue.map(q => q.name).join(','), 'scripts', fs && fs.scripts && fs.scripts.map && fs.scripts.map(q => q.name).join(','), 'map', fs && fs.map && fs.map.id); }
  return { r: w && w.r, log, d: FF7.state.kp };
}
// (the battles are started from a quiet room, the Mog Center: no trainer on a route spots the party between them;
// each wild one says which area it's in)
const ONE = 'kp_route1';
FF7.fieldScene.load('kp_center', null); for (let i = 0; i < 5; i++) FF7.stepFrame();
const area = KP.areaOf(ONE);
KP.MOVES.t_kill = { name: 'Test Kill', type: null, power: 400, acc: 100, cd: 0, desc: '' };
KP.MOVES.t_tap = { name: 'Test Tap', type: null, power: 1, acc: 100, cd: 0, desc: '' };
FF7.state.kp.bag.golden_nut = 30;
const nutChance0 = KP.nutChance; KP.nutChance = () => 1;   // (every nut liked: the befriending is what's tested)

// one befriend per area
let r = fight({ team: [['grumog_viking', 30, { moves: ['t_kill'] }]], foes: [['tufty_freelancer', 5]], area });
check('the first befriend in an area', r.r === 'caught' && KP.areaUsed(area), r.r);
r = fight({ team: [['grumog_viking', 30, { moves: ['t_kill'] }]], foes: [['tufty_freelancer', 5]], area });
check('no second befriend in that area', r.r === 'win' && r.log.some(t => /one per area/.test(t)), r.r + ' ' + r.log.filter(t => /Hard/.test(t)).join(' | '));
r = fight({ team: [['grumog_viking', 30, { moves: ['t_kill'] }]], foes: [['tufty_freelancer', 5]], area: 'Somewhere Else' });
check('another area: a befriend again', r.r === 'caught', r.r);
const before = FF7.state.kp.party.length + FF7.state.kp.box.length; KP.receive(KP.make('mopluff_bard', 10));
check('a gift moogle doesn\'t count', FF7.state.kp.party.length + FF7.state.kp.box.length === before + 1 && Object.keys(FF7.state.kp.nuz).length === 2);
KP.nutChance = nutChance0;

// a moogle that powers down is gone; the team refilled from the box
r = fight({ kind: 'trainer', team: [['tufty_freelancer', 5, { moves: ['t_tap'] }], ['grumog_viking', 50, { moves: ['t_kill'] }]], foes: [['grumog_viking', 30, { moves: ['t_kill'] }], ['tufty_freelancer', 3, { moves: ['t_tap'] }]],
  me: (B) => ({ kind: 'move', move: B.me.mon.moves[0] }), foe: (B) => B.foe.mon.moves[0], opts: { canLose: true } });
const dd = FF7.state.kp;
check('a moogle that powered down is gone for good', !dd.party.some(x => x.sp === 'tufty_freelancer') && (dd.fallen || []).some(x => x.sp === 'tufty_freelancer'), JSON.stringify(dd.party.map(x => x.sp)) + ' fallen ' + JSON.stringify((dd.fallen || []).map(x => x.sp)));
r = fight({ kind: 'trainer', team: [['tufty_freelancer', 5, { moves: ['t_tap'] }]], box: [['mopluff_bard', 20], ['grumog_viking', 25]], foes: [['grumog_viking', 40, { moves: ['t_kill'] }]],
  me: (B) => ({ kind: 'move', move: 't_tap' }), foe: () => 't_kill', opts: { canLose: true } });
check('the whole team gone: the box sends the strongest', FF7.state.kp.party.length === 2 && FF7.state.kp.party[0].sp === 'grumog_viking' && !FF7.state.kp.box.length, JSON.stringify(FF7.state.kp.party.map(x => x.sp)));
KP.gameOver = false;
r = fight({ kind: 'trainer', team: [['tufty_freelancer', 5, { moves: ['t_tap'] }]], foes: [['grumog_viking', 40, { moves: ['t_kill'] }]], me: () => ({ kind: 'move', move: 't_tap' }), foe: () => 't_kill', opts: { canLose: true } });
check('nobody left anywhere: the run is over', KP.gameOver === true && FF7.sceneMgr.top() instanceof KP.Title, 'gameOver ' + KP.gameOver + ', top ' + (FF7.sceneMgr.top() && FF7.sceneMgr.top().constructor.name));

// ---- breeding: permits from the badges, the parents stay
d = start('hard');
d.badges = [1, 2, 3]; FF7.state.flags.kp_ranch_met = true; FF7.state.flags.kp_ranch_tip = true;
check('permits: badge N gives N', KP.breedPermits() === 6, KP.breedPermits());
d.badges = [1, 2, 3, 4, 5, 6, 7, 8];
check('36 with all eight', KP.breedPermits() === 36, KP.breedPermits());
d.badges = [1];
d.party = [KP.make('grumog_viking', 30), KP.make('mopluff_bard', 30)]; d.money = 10000;   // (every egg's wee fee)
const pickMoves0 = KP.pickMoves; KP.pickMoves = () => ({ done: true, result: null });
const hatch0 = KP.hatchScene; KP.hatchScene = () => ({ done: true, result: true });
const runBreed = (answers) => {
  let done = false;
  FF7.fieldScene.runScript(function* (s) {
    s.ask = function () { const a = answers.length ? answers.shift() : 0; return { done: true, result: a }; };
    s.say = function () { return { done: true }; }; s.msg = s.say;
    yield* KP.breed(s); done = true;
  }, { name: 'breed-test' });
  for (let i = 0; i < 2000 && !done; i++) FF7.stepFrame();
  return done;
};
runBreed([0, 0, 0, 0]);
check('Hard Mode breeding keeps both parents and uses a permit', d.party.length === 3 && d.bred === 1 && KP.breedPermits() === 0, `party ${d.party.length}, bred ${d.bred}, permits ${KP.breedPermits()}`);
runBreed([0, 0, 0, 0]);
check('no permits: no breeding', d.party.length === 3 && d.bred === 1);
d = start('normal'); d.badges = [1]; FF7.state.flags.kp_ranch_met = true; FF7.state.flags.kp_ranch_tip = true;
d.party = [KP.make('grumog_viking', 30), KP.make('mopluff_bard', 30)]; d.money = 10000;
{ const fee = KP.eggCost(d.party[0], d.party[1]).fee;
  runBreed([0, 0, 0, 0]);
  check('Normal Mode breeding: the parents retire, no permits', d.party.length === 1 && !d.bred, `party ${d.party.length}`);
  check('every egg costs 100 coins a "+"', d.money === 10000 - fee, `coins ${d.money}, fee ${fee}`); }
d = start('normal'); d.badges = [1]; FF7.state.flags.kp_ranch_met = true; FF7.state.flags.kp_ranch_tip = true;
d.party = [KP.make('grumog_viking', 30), KP.make('mopluff_bard', 30)]; d.money = 50;
runBreed([0, 0, 0, 0]);
check('short of the egg fee: no egg', d.party.length === 2 && d.money === 50, `party ${d.party.length}, coins ${d.money}`);
// ---- a legend's egg (js/kupomon/kp_legendbreed.js; the user, 2026-10-03): its own item, used up, and 5,000 a "+"
{
  const L = () => KP.make('bahamog_bahamut', 50), item = KP.legendItem('bahamog_bahamut');
  d = start('normal'); d.badges = [1]; FF7.state.flags.kp_ranch_met = true; FF7.state.flags.kp_ranch_tip = true;
  d.party = [L(), KP.make('grumog_viking', 50)]; d.money = 100000;
  runBreed([0, 0, 0, 0]);
  check('a legend egg: no item, no egg', d.party.length === 2 && d.money === 100000, `party ${d.party.length}, coins ${d.money}`);
  KP.give(item, 1); d.money = 1000;
  runBreed([0, 0, 0, 0]);
  check('a legend egg: short of the fee, no egg', d.party.length === 2 && (d.bag[item] || 0) === 1, `party ${d.party.length}, item ${d.bag[item]}`);
  d.money = 100000;
  const fee = KP.eggCost(d.party[0], d.party[1]).fee;
  runBreed([0, 0, 0, 0]);
  check('a legend egg: the item used up, the fee paid, the legend back, the other retired', !(d.bag[item] > 0) && d.money === 100000 - fee && d.party.length === 2 && d.party.some(m => m.sp === 'bahamog_bahamut' && m.lv === 50), `item ${d.bag[item]}, coins ${d.money} (fee ${fee}), party ${d.party.map(m => m.sp + ' ' + m.lv)}`);
  // breeding's two stages (the user, 2026-10-04): no "+" before the Championship, the "+" after
  { const A = KP.make('grumog_viking', 50, { plus: 3 }), B = KP.make('mopluff_bard', 50);
    const was = !!FF7.state.flags.kp_champion;
    FF7.state.flags.kp_champion = false; const p1 = KP.breedPlus(A, B), f1 = KP.eggCost(A, B).fee;
    FF7.state.flags.kp_champion = true; const p2 = KP.breedPlus(A, B), f2 = KP.eggCost(A, B).fee;
    FF7.state.flags.kp_champion = was;
    check('stage one: an egg has no "+", the fee one "+"\'s worth', p1 === 0 && f1 === KP.BREED_FEE_PER_PLUS, `plus ${p1}, fee ${f1}`);
    check('stage two (the Championship): the "+" (+3 and two more = +5), the fee by it', p2 === 5 && f2 === 5 * KP.BREED_FEE_PER_PLUS, `plus ${p2}, fee ${f2}`); }
  check('every legend has its own item', Object.keys(KP.SPECIES).filter(sp => KP.isLegend({ sp })).every(sp => KP.legendItem(sp) && KP.ITEMS[KP.legendItem(sp)]), Object.keys(KP.SPECIES).filter(sp => KP.isLegend({ sp }) && !KP.legendItem(sp)).join(', '));
}
KP.pickMoves = pickMoves0; KP.hatchScene = hatch0;
console.log(`${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
