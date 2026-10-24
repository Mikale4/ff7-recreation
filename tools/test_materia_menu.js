// Headless test of the Materia menu (js/ui/menu_materia.js): Check, and the Arrange sub-commands
// Arrange / Exchange / Remove all / Trash, driven through the real panel with scripted button presses
// (the game is loaded the way tools/sim.js does). Checks the materia state after every step: no
// instance lost or duplicated, AP untouched, stats recomputed.
//   node tools/test_materia_menu.js          (exit code 1 on failure)
const fs = require('fs'), path = require('path'), Module = require('module');
const simPath = path.join(__dirname, 'sim.js');
const src = fs.readFileSync(simPath, 'utf8');
const mod = new Module(simPath); mod.paths = Module._nodeModulePaths(__dirname); mod.filename = simPath;
process.argv = [process.argv[0], simPath, 'none'];
mod._compile(src.slice(0, src.indexOf('const mode = argv[0]')) + '\nmodule.exports = { FF7 };', simPath);
const { FF7 } = mod.exports;
const UI = FF7.ui, M = FF7.sys.materia, ST = FF7.sys.stats, st = FF7.state, I = FF7.input;

let fails = 0;
const check = (cond, msg) => { console.log((cond ? '  ok    ' : '  FAIL  ') + msg); if (!cond) fails++; };

// ---------------------------------------------------------------- setup
['cloud', 'barret', 'tifa', 'aeris'].forEach(id => FF7.sys.party.join(id));
st.party = ['cloud', 'barret', 'tifa'];
const cloud = st.chars.cloud, tifa = st.chars.tifa;
cloud.weapon = 'butterfly_edge'; cloud.armor = 'carbon_bangle'; tifa.weapon = 'mythril_claw';
Object.values(st.chars).forEach(c => { ST.fitMateriaSlots(c); c.weaponMateria.fill(null); c.armorMateria.fill(null); });
const mk = (id, ap) => M.make(id, ap);
const fire = mk('fire', 2500), all = mk('all', 1600), restore = mk('restore', 40000), shiva = mk('shiva', 0), cover = mk('cover', 300), ice = mk('ice', 0);
cloud.weaponMateria.splice(0, 3, fire, all, restore);
cloud.armorMateria.splice(0, 2, shiva, cover);
tifa.weaponMateria[0] = ice;
st.materia = ['ifrit', 'earth', 'hp_plus', 'steal', 'elemental', 'heal', 'ramuh', 'counter_attack', 'revive'].map((id, i) => mk(id, i * 700));
Object.values(st.chars).forEach(c => ST.recalc(c));
let alive = new Set([].concat(st.materia, ...Object.values(st.chars).map(c => M.equippedList(c))));
const apOf = new Map([...alive].map(m => [m, m.ap]));

// every instance still exists exactly once (stock + everyone's slots), AP unchanged, stats fresh
function invariants(label) {
  const seen = [].concat(st.materia, ...Object.values(st.chars).map(c => M.equippedList(c)));
  const uniq = new Set(seen);
  check(uniq.size === seen.length && seen.length === alive.size && seen.every(m => alive.has(m)), `${label}: ${seen.length} materia, none lost or duplicated`);
  check(seen.every(m => m.ap === apOf.get(m)), `${label}: AP unchanged`);
  const stale = Object.values(st.chars).filter(c => { const a = JSON.stringify([c.d, c.maxHp, c.maxMp]); ST.recalc(c); return JSON.stringify([c.d, c.maxHp, c.maxMp]) !== a; });
  check(!stale.length, `${label}: stats recomputed${stale.length ? ' (stale: ' + stale.map(c => c.id).join(', ') + ')' : ''}`);
}
// stats a character would have with no materia at all
function bare(c) { const copy = JSON.parse(JSON.stringify(c)); copy.weaponMateria = copy.weaponMateria.map(() => null); copy.armorMateria = copy.armorMateria.map(() => null); ST.recalc(copy); return copy; }

// ---------------------------------------------------------------- scripted input
const menu = new UI.MainMenu();
const panel = new UI.MateriaPanel(menu, cloud);
menu.panels = [panel];
const orig = { pressed: I.pressed, repeat: I.repeat, back: I.back };
let renderErr = null;
function press(...btns) {
  for (const b of btns) {
    I.pressed = (x) => x === b; I.repeat = (x) => x === b; I.back = () => b === 'cancel' || b === 'menu';
    menu.update(true);
    Object.assign(I, orig);
    try { menu.render(); } catch (e) { renderErr = renderErr || `${panel.mode}: ${e.stack.split('\n').slice(0, 2).join(' | ')}`; }
  }
}
function pressUntil(btn, cond, max = 40) { for (let i = 0; i < max && !cond(); i++) press(btn); return cond(); }

// ---------------------------------------------------------------- Check
console.log('Check');
press('up');
check(panel.mode === 'cmd' && panel.cmd === 1, 'Up from the weapon row reaches Arrange');
press('up');
check(panel.mode === 'cmd' && panel.cmd === 0, 'Up again reaches Check');
press('ok');
check(panel.mode === 'check', 'Check: pick a slot');
press('ok');                                   // weapon slot 0 = Fire (Lv2)
check(panel.mode === 'checkView' && panel.chk.focus === 'list', 'picking Fire opens the Magic list');
const magic = panel.checkList(), by = (id) => magic.find(e => e.id === id);
check(by('fire') && by('fire').ok && by('fire2') && by('fire2').ok && by('fire3') && !by('fire3').ok, 'Fire, Fire2 learned; Fire3 greyed (not learned yet)');
check(magic[panel.chk.li] && magic[panel.chk.li].src === fire, 'cursor on the picked materia\'s first spell');
check(by('fire').all === true, 'Fire linked with All shows the All marker');
check(by('cure3') && by('cure3').ok, 'mastered Restore: Cure3 learned');
press('cancel');
check(panel.chk.focus === 'cmd', 'Cancel returns to the command window');
pressUntil('down', () => (panel.chk.cells[panel.chk.ci] || {}).id === 'summon', 4);
check(panel.checkList().some(e => e.id === 'shiva' && e.src === shiva), 'Summon list shows Shiva from its materia');
press('cancel', 'cancel');
check(panel.mode === 'cmd' && panel.cmd === 0, 'back on Check');
invariants('Check');

// ---------------------------------------------------------------- Arrange
console.log('Arrange');
press('down', 'ok');
check(panel.mode === 'arrange' && panel.arrIdx === 0, 'Arrange menu open');
const before = st.materia.slice();
press('ok');
const ORDER = ['magic', 'support', 'command', 'independent', 'summon'];
const ranks = st.materia.map(m => ORDER.indexOf(M.def(m).type));
check(ranks.every((r, i) => i === 0 || ranks[i - 1] <= r), 'list sorted magic, support, command, independent, summon: ' + st.materia.map(m => m.id).join(' '));
check(st.materia.length === before.length && before.every(m => st.materia.includes(m)), 'same materia after sorting');
invariants('Arrange');

// ---------------------------------------------------------------- Remove all
console.log('Remove all');
const had = M.equippedList(cloud), baseC = bare(cloud);
press('down', 'down');
check(panel.arrIdx === 2, 'cursor on Remove all');
press('ok');
check(M.equippedList(cloud).length === 0, 'Cloud has no materia left');
check(had.every(m => st.materia.includes(m)), 'his ' + had.length + ' materia are in the list');
check(cloud.d.mag === baseC.d.mag && cloud.maxHp === baseC.maxHp && cloud.maxMp === baseC.maxMp, `stats back to no-materia values (Mag ${cloud.d.mag}, MaxHP ${cloud.maxHp})`);
check(M.isMaster(restore), 'Restore still MASTER');
invariants('Remove all');

// ---------------------------------------------------------------- equip Fire again from the list (slot -> list)
console.log('Equip from the list');
press('cancel');
check(panel.mode === 'cmd', 'Cancel closes the Arrange menu');
press('down');
check(panel.mode === 'slots' && panel.row === 0, 'Down from Arrange returns to the weapon row');
press('ok');
pressUntil('down', () => st.materia[panel.idx] === fire);
press('ok');
check(cloud.weaponMateria[panel.col] === fire && !st.materia.includes(fire), 'Fire equipped from the list');
invariants('Equip');

// ---------------------------------------------------------------- Exchange
console.log('Exchange');
const cMag = cloud.d.mag, cHp = cloud.maxHp, tMag = tifa.d.mag;
press('up', 'ok', 'down', 'ok');
check(panel.mode === 'exchange', 'Exchange open');
pressUntil('left', () => panel.ex.col === 0, 8);
check(panel.exRows()[panel.ex.ri].c === cloud && panel.ex.col === 0, 'cursor on Cloud\'s first weapon slot');
press('ok');
check(!!panel.ex.pick, 'first slot picked');
pressUntil('down', () => { const r = panel.exRows()[panel.ex.ri]; return r.c === tifa && r.key === 'weaponMateria'; });
const empty = tifa.weaponMateria.indexOf(null);
pressUntil('right', () => panel.ex.col === empty, 8);
press('ok');
check(tifa.weaponMateria[empty] === fire && cloud.weaponMateria[0] === null, 'Fire moved from Cloud to Tifa\'s empty slot');
check(cloud.d.mag === cMag - 1 && cloud.maxHp > cHp && tifa.d.mag === tMag + 1, `equip effects moved with it (Cloud Mag ${cMag}->${cloud.d.mag}, MaxHP ${cHp}->${cloud.maxHp}; Tifa Mag ${tMag}->${tifa.d.mag})`);
invariants('Exchange into an empty slot');
// and back the other way: Tifa's Ice into Cloud's now empty first slot
pressUntil('left', () => panel.ex.col === 0, 8);
press('ok');
pressUntil('up', () => { const r = panel.exRows()[panel.ex.ri]; return r.c === cloud && r.key === 'weaponMateria'; });
press('ok');
check(cloud.weaponMateria[0] === ice && tifa.weaponMateria[0] === null, 'Ice moved from Tifa to Cloud');
invariants('Exchange back');
// two filled slots: Cloud's Ice <-> Tifa's Fire
press('ok');
pressUntil('down', () => { const r = panel.exRows()[panel.ex.ri]; return r.c === tifa && r.key === 'weaponMateria'; });
pressUntil('right', () => panel.ex.col === empty, 8);
press('ok');
check(cloud.weaponMateria[0] === fire && tifa.weaponMateria[empty] === ice, 'filled slots swapped (Cloud gets Fire, Tifa gets Ice)');
invariants('Exchange two filled slots');
press('cancel');
check(panel.mode === 'arrange', 'Cancel returns to the Arrange menu');

// ---------------------------------------------------------------- Trash
console.log('Trash');
pressUntil('down', () => panel.arrIdx === 3, 4);
press('ok');
check(panel.mode === 'trash', 'Trash: choose from the list');
const earth = st.materia.find(m => m.id === 'earth');
pressUntil('down', () => st.materia[panel.idx] === earth);
press('ok');
check(panel.mode === 'confirm' && panel.yes === 1, 'confirmation asked, cursor on No');
press('ok');
check(st.materia.includes(earth) && panel.mode === 'trash', 'No keeps it');
press('ok', 'up', 'ok');
check(!st.materia.includes(earth), 'Yes throws Earth away');
alive.delete(earth);
invariants('Trash');
press('cancel', 'cancel', 'cancel');
check(menu.panels.length === 0, 'Cancel x3 leaves the Materia menu');

// ---------------------------------------------------------------- full list: nothing may be lost
console.log('Full materia list');
const saved = st.materia.slice();
while (st.materia.length < 200) st.materia.push(mk('poison'));
menu.panels = [panel]; panel.mode = 'slots'; panel.row = 0; panel.col = 0;
const eq = M.equippedList(cloud).length, first = cloud.weaponMateria[0];
press('square');
check(M.equippedList(cloud).length === eq && st.materia.length === 200, 'Remove all is refused when the list is full');
press('menu');
check(first && cloud.weaponMateria[0] === first && st.materia.length === 200, 'Triangle (remove one) is refused when the list is full');
st.materia.length = 0; saved.forEach(m => st.materia.push(m));
invariants('Full list');

check(!renderErr, 'every screen rendered' + (renderErr ? ': ' + renderErr : ''));
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exitCode = fails ? 1 : 0;
