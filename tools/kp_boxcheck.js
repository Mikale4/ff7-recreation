// The Mog Box (js/kupomon/kp_box.js), checked through the real game code: 50 boxes of 30 (each boxed moogle at its own
// place, mon.bx, so a box can have gaps; an old save's list keeps its layout), L1 / R1 (A / S) the box before / after,
// Box 1 and Box 50 joined, the Sort menu (by level, and the same sort again the other way), moves between the team and
// the boxes, a full storage (KP.receive: 'full'), the bag's Skill Chips panel and the party menu's moogle pictures
// drawn without errors, and the Demo's box op (kp_runner.js O.kp_box) fetching a moogle from Box 7 and one from Box 46
// (the short way round: A) into the team.
//   node tools/kp_boxcheck.js          (exit code 1 on a failure)
const { boot } = require('./sim_prelude');
const { FF7 } = boot();
const KP = FF7.kupomon, R = FF7.runner, I = FF7.input, S = FF7.sceneMgr;
FF7.audio.sfx = () => {}; FF7.audio.push = () => {}; FF7.audio.pop = () => {}; FF7.audio.play = () => {};
FF7.GL.canvas = FF7.GL.canvas || { width: 640, height: 480 };   // (a stand-in, so the moogles' pictures are made and drawn: KP.moogleIcon, KP.drawMoogleLive)
let pass = 0, fail = 0;
const check = (name, ok, why) => { if (ok) { pass++; console.log('  ok    ' + name); } else { fail++; console.log('  FAIL  ' + name + (why != null ? ': ' + why : '')); } };

// ---- a Kupomon game, in a Mog Center
const st0 = FF7.state; (st0.keyItems = st0.keyItems || []).push('mogboy'); st0.vars.mogboy_carts = 127;
KP.play();
KP.enter(null, null, 'normal');
['kp_intro', 'kp_starter', 'kp_rival1', 'kp_sent_off'].forEach(f => { FF7.state.flags[f] = true; });
for (let i = 0; i < 20; i++) FF7.stepFrame();
const CENTER = 'kp_mogridge_center';
FF7.fieldScene.load(CENTER, 'from_town'); for (let i = 0; i < 10; i++) FF7.stepFrame();
const d = FF7.state.kp;
const sps = KP.DEX.filter(id => KP.SPECIES[id] && (KP.SPECIES[id].rate || 120) > 5).slice(0, 40);
d.party = [0, 1, 2, 3, 4, 5].map(i => KP.make(sps[i], 20 + i));
// (an old save's box: a plain list, no places: they take the first ones in list order)
d.box = [6, 7, 8, 9, 10, 11, 12].map(i => KP.make(sps[i], 10 + ((i * 7) % 23)));
let grid = KP.boxGrid();
check('an old save\'s box keeps its order (places 0..6)', d.box.every((m, i) => m.bx === i && grid[i] === m), d.box.map(m => m.bx).join());

// ---- the screen, driven with presses (each press: one update, then a render; every text drawn is kept)
let texts = [];
const text0 = FF7.render.text;
FF7.render.text = function (s) { texts.push(String(s)); return text0.apply(this, arguments); };
const orig = { pressed: I.pressed, repeat: I.repeat, back: I.back };
let renderErr = null;
function press(scene, ...btns) {
  for (const b of btns) {
    I.pressed = (x) => x === b; I.repeat = (x) => x === b; I.back = () => b === 'cancel' || b === 'menu';
    try { scene.update(); } finally { Object.assign(I, orig); }
    texts = [];
    try { scene.render(); } catch (e) { renderErr = renderErr || e.stack.split('\n').slice(0, 3).join(' | '); }
  }
}
const shows = (re) => texts.some(t => re.test(t));
d.boxPage = 0;
KP.boxView();
const B = S.top();
check('the box screen opens', B instanceof KP.BoxView);
press(B, 'down');   // (a render first)
check('it shows "BOX 1 of 50"', B.page === 0 && shows(/BOX 1 of 50/), texts.filter(t => /BOX/.test(t)).join(' | '));
press(B, 'l1');
check('L1 (A) on Box 1: Box 50', B.page === 49 && shows(/BOX 50 of 50/), 'page ' + B.page);
press(B, 'r1');
check('R1 (S) on Box 50: Box 1', B.page === 0 && shows(/BOX 1 of 50/), 'page ' + B.page);
press(B, 'r1', 'r1', 'r1');
check('R1 three times: Box 4', B.page === 3 && shows(/BOX 4 of 50/), 'page ' + B.page);
B.zone = 'header'; press(B, 'left');
check('left on the box\'s name still turns the box', B.page === 2, 'page ' + B.page);
press(B, 'up'); B.zone = 'team'; press(B, 'l1');
check('L1 works from the team\'s column too', B.page === 1, 'page ' + B.page);
check('the hint names the player\'s own keys', shows(new RegExp(I.label('l1') + ' / ' + I.label('r1') + ': box')) && shows(new RegExp(I.label('square') + ': sort')), texts.filter(t => /box/.test(t)).join(' | '));

// a team member put in an empty place of Box 30: it stays there (a gap before it)
B.page = 0; B.zone = 'team'; B.ti = 5;
press(B, 'ok'); press(B, 'ok');   // (Move)
check('a team member lifted', B.held && B.held.list === 'team' && B.held.i === 5);
const lifted = d.party[5];
for (let i = 0; i < 29; i++) press(B, 'r1');
B.zone = 'box'; B.bi = 7;
press(B, 'ok');
check('put down in Box 30, place 8: it waits there', d.box.includes(lifted) && lifted.bx === 29 * 30 + 7 && d.party.length === 5 && lifted.hp === KP.maxHp(lifted), 'bx ' + lifted.bx);
// a boxed one onto a team member: a swap
B.page = 0; B.zone = 'box'; B.bi = 2;
const boxed = KP.boxGrid()[2], mate = d.party[0];
press(B, 'ok'); press(B, 'ok'); B.zone = 'team'; B.ti = 0; press(B, 'ok');
check('a boxed moogle onto a team member: a swap', d.party[0] === boxed && mate.bx === 2 && d.box.includes(mate) && !d.box.includes(boxed), `party0 ${d.party[0] === boxed}, mate.bx ${mate.bx}`);
check('the newest in the box is at the list\'s end', d.box[d.box.length - 1] === mate);

// ---- sorting: by level (high to low), from Box 1, no gaps; again: low to high
B.page = 5; B.zone = 'box';
press(B, 'square');
check('Square (D) opens the Sort menu', !!B.sortMenu);
const lvAt = KP.BOX_SORTS.findIndex(s => s.id === 'lv');
while (B.sortMenu.idx !== lvAt) press(B, 'down');
check('the menu offers "Level (high to low)"', shows(/Level\s+\(high to low\)/), texts.filter(t => /Level/.test(t)).join(' | '));
press(B, 'ok');
grid = KP.boxGrid();
const lvs = grid.slice(0, d.box.length).map(m => m && m.lv);
check('sorted by level, high to low, from Box 1 (no gaps)', lvs.every(Boolean) && lvs.every((v, i) => i === 0 || lvs[i - 1] >= v) && B.page === 0, lvs.join());
press(B, 'ok');   // (the message)
for (let i = 0; i < 100 && B.msg; i++) press(B, 'down');
B.zone = 'header'; press(B, 'ok');
check('OK on the box\'s name opens the Sort menu', !!B.sortMenu);
while (B.sortMenu.idx !== lvAt) press(B, 'down');
check('the same sort again goes the other way', shows(/Level\s+\(low to high\)/), texts.filter(t => /Level/.test(t)).join(' | '));
press(B, 'ok');
grid = KP.boxGrid();
const up = grid.slice(0, d.box.length).map(m => m && m.lv);
check('sorted by level, low to high', up.every((v, i) => i === 0 || up[i - 1] <= v), up.join());
for (let i = 0; i < 100 && B.msg; i++) press(B, 'down');
['dex', 'name', 'job', 'plus', 'new'].forEach(id => { KP.sortBox(id); const g = KP.boxGrid(); check('sorting by ' + id + ' keeps every moogle, from place 0', d.box.every(m => m.bx < d.box.length) && new Set(d.box.map(m => m.bx)).size === d.box.length && g.slice(0, d.box.length).every(Boolean)); });
press(B, 'cancel');
check('Cancel closes the box (and it remembers the box)', S.top() !== B && B.w.done && d.boxPage === B.page);
check('the box screen drew without errors', !renderErr, renderErr);

// ---- a full storage: 1,500 boxed and a full team: no room
const keepBox = d.box, keepParty = d.party;
d.party = keepParty.concat([KP.make(sps[20], 5)]).slice(0, KP.PARTY_MAX);
d.box = []; for (let i = 0; i < KP.BOX_MAX; i++) d.box.push(Object.assign(KP.make(sps[i % 30], 5), { bx: i }));
const extra = KP.make(sps[31], 5), r = KP.receive(extra);
check('every box full: KP.receive says \'full\' and keeps nothing', r === 'full' && !d.box.includes(extra) && d.box.length === KP.BOX_MAX && KP.storageFull(), r);
d.box.pop(); const r2 = KP.receive(extra);
check('a place free: it goes there', r2 === 'box' && extra.bx === KP.BOX_MAX - 1, r2 + ' ' + extra.bx);
d.box = keepBox; d.party = keepParty;

// ---- the menu: the party's pictures, and the bag's Skill Chips panel
FF7.render.text = text0;
KP.openMenu(); const M = S.top();
let menuErr = null;
try {
  M.mode = 'party'; M.sub = 1; for (let i = 0; i < 5; i++) { M.t++; M.render(); }
  M.mode = 'bag'; M.pocket = KP.BAG_POCKETS.findIndex(p => p.id === 'chips');
  const chip = Object.keys(KP.ITEMS).find(k => KP.ITEMS[k].kind === 'chip' && KP.MOVES[KP.ITEMS[k].move]);
  d.bag[chip] = 1; M.sub = 0;
  texts = []; FF7.render.text = function (s) { texts.push(String(s)); return text0.apply(this, arguments); };
  M.render();
  const mv = KP.MOVES[KP.ITEMS[chip].move];
  check('the Skill Chips pocket shows the move\'s numbers on its row', shows(new RegExp('Acc ' + (mv.acc === true ? '—' : mv.acc) + '  CD')), texts.join(' | ').slice(0, 300));
  check('and the team, who can learn it', texts.some(t => /^(ABLE|NOT ABLE|LEARNED)$/.test(t)));
} catch (e) { menuErr = e.stack.split('\n').slice(0, 3).join(' | '); }
FF7.render.text = text0;
check('the menu drew without errors', !menuErr, menuErr);
S.pop();

// ---- the Demo's box op: from Box 7 (R1 six times from Box 1), then from Box 46 (L1 five times, the short way round)
const taps = [];
const tap0 = R.tap; R.tap = function (b) { const ok = tap0.call(this, b); if (ok && (b === 'l1' || b === 'r1')) taps.push(b); return ok; };
function runOp(args, label) {
  taps.length = 0;
  R.start({ mode: 'fast', plan: [['kp_box', args]] });
  let i = 0; for (; i < 30000 && R.active; i++) FF7.stepFrame();
  check(label + ': the op finished', !R.active && R.statusText === 'done', R.statusText + ' after ' + i + ' frames; ' + (R.issues || []).map(x => x.msg || JSON.stringify(x)).join(' / '));
}
d.boxPage = 0;
const seven = KP.make(sps[25], 33); d.box.push(seven); seven.bx = 6 * 30 + 17;   // (Box 7, place 18)
const out = d.party.slice().sort((a, b) => a.lv - b.lv)[0];
runOp({ take: [seven], leave: [out], center: CENTER }, 'Box 7');
check('the Box 7 moogle joined the team, the weakest went in its place', d.party.includes(seven) && d.box.includes(out) && out.bx === 6 * 30 + 17, `team ${d.party.includes(seven)}, out.bx ${out.bx}`);
check('it went there by R1 six times', taps.join() === 'r1,r1,r1,r1,r1,r1', taps.join());
d.boxPage = 0;
const far = KP.make(sps[26], 34); d.box.push(far); far.bx = 45 * 30 + 3;   // (Box 46)
const out2 = d.party.slice().sort((a, b) => a.lv - b.lv)[0];
runOp({ take: [far], leave: [out2], center: CENTER }, 'Box 46');
check('the Box 46 moogle joined the team', d.party.includes(far) && d.box.includes(out2), `team ${d.party.includes(far)}`);
check('it went the short way: L1 five times', taps.join() === 'l1,l1,l1,l1,l1', taps.join());
// a team member put away alone: the nearest free place, then fetched back
const alone = d.party[d.party.length - 1];
runOp({ leave: [alone], center: CENTER }, 'put away');
check('put away: in a free place of the box on screen', d.box.includes(alone) && Math.floor(alone.bx / 30) === d.boxPage, `bx ${alone.bx}, box ${d.boxPage}`);
runOp({ take: [alone], center: CENTER }, 'fetched back');
check('and fetched back to the team', d.party.includes(alone) && !d.box.includes(alone));
R.tap = tap0;

console.log(`${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
