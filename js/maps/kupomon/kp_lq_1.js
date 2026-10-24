// Kupomon: the legends' sidequests 1-3 (docs/KUPOMON_LEGENDS.md). Jenomog, "What Project J Remembers": the Lifestream
// Tower, Team Hojo's old HQ in Skyport, Hojo's camp on Route 12, and a new map under the tower, the Wellspring.
// Ultimog, "The Four Seals": the Northern Crater, four old places on the isles, and a new map under the crater's heart,
// the Crater's Eye. Omegamog, "Omega's Tally": the Depths, and a new map behind Omegamog's dais, the Proving Ground.
// The region maps are added to at load time (their files untouched: this one loads after them), and each quest is
// registered for the Demo (KP.QUESTS, played by js/kupomon/kp_runner.js O.kp_quests). Dialogue in our own words.
// Each reward also gives the legend's first breeding item, and someone from the quest sells more afterwards
// (js/kupomon/kp_legendbreed.js): the Baker in Mogridge (Lifestream Seed), the Scholar in the Eye (Fifth Seal), Ulric
// up on the crater rim (Tally Plate).
// The puzzles' answers (the Demo's too):
//   Jenomog: touch the Wellspring's pods in the Logs' order: sky (the north pod), falling (east), cold (west).
//   Ultimog: the verses are copied from the Ruins' tomb wall, Mt. Kupo's glowing chamber, the Nibel Peaks temple and
//     the flower bed in Bloomhaven's church; beating Morrigan lifts her ward off the seal stones; then each stone's
//     riddle: the rim "A breath", the first ring "A spark", the second ring "A sky", the floor "A seed".
//   Omegamog: the tally wall's order, "the sea, the red sand, the deep green, the hard light, the sky": Sapphire
//     (the south-west plinth), Ruby (north-east), Emerald (south-east), Diamond (north-west), Ultimate (west).
(function () {
  const KP = FF7.kupomon, W = KP && KP.W;
  if (!W || KP._lq1) return;   // (once: a headless tool may load this file a second time)
  KP._lq1 = true;

  // ------------------------------------------------------------------ shared pieces
  const flag = (f) => !!(FF7.state && FF7.state.flags && FF7.state.flags[f]);
  const vget = (v) => (FF7.state && FF7.state.vars && FF7.state.vars[v]) || 0;
  const map = (id) => FF7.maps[id];
  const npcOf = (m, id) => (map(m).npcs || []).find(n => n && n.id === id);
  const trigOf = (m, id) => (map(m).triggers || []).find(t => t && t.id === id);
  const inRect = (r, x, y) => x >= r[0] && x < r[0] + (r[2] || 1) && y >= r[1] && y < r[1] + (r[3] || 1);
  // a tile another file already uses (an NPC, an item, a talk spot, an exit): checked as each addition is made (this
  // file's own additions to a tile, a hatch's exit and its talk spot, are meant to share it)
  const MINE = new Set();
  const others = (list) => (list || []).filter(e => e && e.at && !MINE.has(e));
  const taken = (m, x, y) => others(m.npcs).concat(others(m.items)).some(n => n.at[0] === x && n.at[1] === y) ||
    others(m.triggers).filter(t => t.on === 'talk').concat(others(m.exits)).some(t => inRect(t.at, x, y));
  const add = (id, key, list) => {
    const m = map(id); if (!m) { console.warn('kp_lq_1: no map ' + id); return; }
    m[key] = m[key] || [];
    for (const e of list) {
      if (['npcs', 'items', 'triggers', 'exits'].includes(key) && e.at) {
        const [x0, y0, w, h] = [e.at[0], e.at[1], e.at[2] || 1, e.at[3] || 1];
        for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (taken(m, x, y)) console.warn(`kp_lq_1: ${id} ${x},${y} is already in use`);
      }
      MINE.add(e); m[key].push(e);
    }
  };
  const onEnter = (id, fn) => { const m = map(id), a = m.onEnter; m.onEnter = a ? function* (s) { yield* a(s); yield* fn(s); } : fn; };
  const onLoad = (id, fn) => { const m = map(id), a = m.onLoad; m.onLoad = a ? function (s) { a(s); fn(s); } : fn; };
  const flat = (grid, set = {}) => grid.map((r, y) => r.split('').map((c, x) => set[x + ',' + y] != null ? String(set[x + ',' + y]) : '0').join(''));
  // a scene piece: a field prop as an object's model (model: { prop, ...its options }), shown while show() holds;
  // o.block: solid while shown. (Two pieces on one tile make a lit and an unlit state.)
  const piece = (id, at, model, show, o = {}) => Object.assign({ id, at, model, solid: false, hidden: true,
    tick(ob) { ob.hidden = !show(); ob.solid = !ob.hidden && !!o.block; } }, o);
  // what a scene's dynamic objects show while it plays (each new map resets its own on load)
  const CUT = { jenoBeam: 0, jenoCalm: false, heartWait: false, ultiAwake: false, ultiCalm: false, ultiPillars: false, omegaAwake: -1, mark: true, line: true };

  // the quests' done flags, and the plain encounters a save may have befriended already (that counts as done)
  const LEGEND = { jeno: 'kp_legend_ls_jenomog', ulti: 'kp_legend_cr_ultimog', omega: 'kp_legend_cr_omegamog' };
  const done = (q) => flag('kp_lq_' + q + '_done') || flag(LEGEND[q]);
  const sync = () => { const f = FF7.state && FF7.state.flags; if (!f) return; for (const q in LEGEND) if (f[LEGEND[q]] && !f['kp_lq_' + q + '_done']) f['kp_lq_' + q + '_done'] = true; };

  // a quest trainer: held items as the leagues' (KP.leagueHeld), the smart AI, the team's levels written for the old
  // cap of 30 and read through KP.LV as the maps' trainers are (30 is Lv 50, 29 is 48, 28 is 47)
  const trainer = (T) => {
    T.team = KP.leagueHeld ? KP.leagueHeld(T.team) : T.team;
    KP.TRAINER_DEFS[T.id] = { id: T.id, kind: 'trainer', cls: T.cls, name: T.name, team: T.team, bg: T.bg };
    return T;
  };
  // its battle (o.canLose: a loss is the scene's to handle, no blackout); won, its flag kp_tr_<id>
  const duel = function* (s, T, o = {}) {
    const r = yield* KP.fight(s, { kind: 'trainer', foes: W.team(KP.teamFor(T.id, T.team)), bg: T.bg, music: T.music, ai: 'smart', canLose: !!o.canLose, gauntlet: o.gauntlet,
      trainer: { name: T.cls ? T.cls + ' ' + T.name : T.name, lose: T.lose, money: T.money, model: T.model } });
    if (r === 'win') s.set('kp_tr_' + T.id);
    return r;
  };
  // the legend itself: a wild battle at Lv 50, its signature ability, Weapon Raid. Befriended: it's yours for good
  // (kp_legend_<id> and kp_lq_<quest>_done), then o.then. Beaten: o.beaten (else it's gone from the map) and o.after;
  // it's back the next time its map loads
  const legend = function* (s, o) {
    if (o.opening) yield s.msg(o.opening);
    s.sfx('found');
    const leg = KP.make(o.sp, 50, { abil: 0 }); leg.bond = 4;   // (met at the end of its quest: nuts taste 4x as good to it, as W.legend's)
    const r = yield* KP.fight(s, { kind: 'wild', foes: [leg], bg: o.bg, music: 'weaponraid' });
    if (r === 'caught') {
      s.set(LEGEND[o.q]); s.set('kp_lq_' + o.q + '_done'); s.remove(o.actor);
      if (o.then) yield* o.then(s);
    } else if (r === 'win') {
      if (o.beaten) yield* o.beaten(s); else s.remove(o.actor);
      yield s.msg(o.after);
    }
    return r;
  };
  const bag = (id) => ((KP.data() || {}).bag || {})[id] > 0;
  const allOf = (s, pre, n) => { for (let k = 1; k <= n; k++) if (!s.flag(pre + k)) return false; return true; };
  const countOf = (pre, n) => { let c = 0; for (let k = 1; k <= n; k++) if (flag(pre + k)) c++; return c; };

  // ==================================================================== 1. JENOMOG: WHAT PROJECT J REMEMBERS
  // Opens with Hojo's finale (kp_hojo_done): Project J sinks through the lab floor (cutscene A). The Scientist on 1F
  // gives Hojo's Logs, volume 1; volume 2 is in Hojo's old desk on the HQ's top floor; Hojo, camped on Route 12's cliff
  // top, battles for volume 3 and Lab Keycard J (cutscene B); the keycard opens a hatch beside the tank, down to the
  // Wellspring, where the pods are touched in the Logs' order and Jenomog rises (cutscene C). The Scientist's Lifestream
  // Vial after; then he bakes in Mogridge, and Hojo's camp is a note.
  KP.ITEMS.lq_hojo_logs = { name: "Hojo's Logs", kind: 'key', price: 0,
    get desc() { const n = ['kp_lq_jeno_log1', 'kp_lq_jeno_log2', 'kp_lq_jeno_hojo'].filter(flag).length;
      return n >= 3 ? "Hojo's notebooks on Project J: the sky, the fall, the cold. Signed on every page." : `Hojo's notebooks on Project J, in very small writing. Volumes: ${n} of 3.`; } };
  KP.ITEMS.lq_keycard_j = { name: 'Lab Keycard J', kind: 'key', price: 0, desc: 'A lab keycard with a big green J on it. It smells faintly of lunch.' };
  const JENO_M = { enemy: 'kp_jenomog_project_j', scale: 1.2 };

  // ---- cutscene A: it sinks (the lab, after Hojo runs; on a file from before this quest, as the lab loads)
  const jenoSinks = function* (s) {
    if (!s.actor('ls_jenomog')) s.spawn('ls_jenomog', JENO_M, 11, 5, 'down', { name: 'Project J' });
    yield s.cam(11, 4, 60);
    s.emote('ls_jenomog', '...', 60);
    yield 60;
    yield s.face('ls_jenomog', 'up');
    yield s.msg('Project J lays a paw on the cracked glass of its tank.');
    s.sfx('magic'); s.shake(2, 40);
    yield 40;
    yield s.face('ls_jenomog', 'player');
    s.flash('#c0ffe0', 24); s.sfx('gate'); s.shake(3, 30);
    yield s.msg('The floor under the tank splits open in green light!');
    yield s.hover('ls_jenomog', -1.6, 150);
    s.remove('ls_jenomog');
    s.flash('#c0ffe0', 12, 0.5);
    yield 40;
    yield s.msg('The crack glows a moment longer... then goes still.');
    if (s.actor('ls_nurse')) {
      yield s.move('ls_nurse', [[8, 14], [9, 14]]);
      yield s.say('Nurse Mog', "Kupo... it didn't look angry. It looked lost.");
    }
    yield s.camFollow(40);
    s.set('kp_lq_jeno_open');
    yield s.msg('(Somebody on the floor below might know what Project J really was.)');
  };
  // Hojo's finale (the lab's Hojo and his trigger): the scene as before, then Project J sinks instead of staying put
  const ls2 = map('kp_lifestream_2'), hojoNpc = npcOf('kp_lifestream_2', 'ls_hojo'), hojoSee = trigOf('kp_lifestream_2', 'ls_hojo_see');
  const finale0 = hojoNpc.talk;
  const finale = function* (s) {
    const was = s.flag('kp_hojo_done');
    yield* finale0(s);
    if (was || !s.flag('kp_hojo_done')) return;
    if (!s.flag('kp_lq_jeno_open') && !done('jeno')) yield* jenoSinks(s);
    else s.remove('ls_jenomog');
  };
  hojoNpc.talk = finale; if (hojoSee) hojoSee.run = finale;
  npcOf('kp_lifestream_2', 'ls_jenomog').show = () => false;   // (Project J lives under the tower now)
  onEnter('kp_lifestream_2', function* (s) {
    if (s.flag('kp_hojo_done') && !s.flag('kp_lq_jeno_open') && !done('jeno')) { yield 20; yield* jenoSinks(s); }
  });
  // ---- the hatch beside the tank (step 4): Lab Keycard J opens it, and the spiral stair down to the Wellspring
  const hatchTalk = function* (s) {
    if (s.flag('kp_lq_jeno_hatch')) { yield s.msg('The hatch stands open. A spiral stair winds down into green light.'); return; }
    const look = 'A round hatch in the floor beside the tank, sealed tight. The card reader next to it has a big green J on it.';
    if (!bag('lq_keycard_j')) { yield s.msg(look); return; }
    const c = yield s.ask(null, look, ['Use Lab Keycard J', 'Leave it']);
    if (c !== 0) return;
    KP.take('lq_keycard_j');
    s.sfx('beep'); yield 20;
    s.sfx('door_shinra'); s.shake(2, 30); s.flash('#c0ffe0', 16, 0.6);
    s.set('kp_lq_jeno_hatch');
    yield s.msg('The reader blinks green and keeps the card. With a hiss, the hatch slides open.\fA stair winds down into the light below the tower.');
  };
  add('kp_lifestream_2', 'objects', [
    piece('lq_jeno_hatch_shut', [13, 3], { prop: 'disc', r: 0.42, h: 0.04, col: '#2a3a36', top: '#3e524c', ring: '#70e0b0' }, () => !flag('kp_lq_jeno_hatch')),
    piece('lq_jeno_hatch_open', [13, 3], { prop: 'hole', r: 0.42, col: '#a0ffd8', col2: '#3e524c' }, () => flag('kp_lq_jeno_hatch')),
  ]);
  add('kp_lifestream_2', 'triggers', [{ at: [13, 3], on: 'talk', run: hatchTalk }]);
  add('kp_lifestream_2', 'exits', [{ at: [13, 3, 1, 1], to: 'kp_lq_jeno_well', entry: 'from_hatch', sfx: 'door_shinra', if: s => s.flag('kp_lq_jeno_hatch') }]);
  ls2.entries.from_well = [14, 3, 'down'];

  // ---- the Scientist on 1F (the one who wants to go home): the Logs, the hints, and the Vial after
  const sci = npcOf('kp_lifestream_1', 'ls1_sci'), sci0 = sci.talk, sciShow0 = sci.show || (() => true);
  sci.show = s => sciShow0(s) && !s.flag('kp_lq_jeno_reward');
  sci.talk = function* (s) {
    if (!s.flag('kp_lq_jeno_open')) { yield* sci0(s); return; }
    if (done('jeno')) {
      yield s.say('Scientist', "You found it? Under the tower? And it went with you? ...Huh.\fIt never chose anything here. Nobody let it.");
      yield s.say('Scientist', "Take this. I'm done with glowing things.");
      KP.give('lifestream_vial', 1); s.sfx('found');
      yield s.msg(KP.got('lifestream_vial'));
      yield* KP.giveLegendItem(s, 'jenomog_project_j');   // (the first Lifestream Seed: js/kupomon/kp_legendbreed.js)
      yield s.say('Scientist', "I'm going home. Then I'm learning to bake. Bread doesn't glow. I checked.");
      s.set('kp_lq_jeno_reward');
      return;
    }
    if (!s.flag('kp_lq_jeno_log1')) {
      yield s.say('Scientist', "It sank? Through the FLOOR? ...Of course it did. Nothing in this tower stays where you put it.");
      yield s.say('Scientist', "Here. The Professor's logs on Project J, volume one. He wrote everything down. Even the snacks.");
      KP.give('lq_hojo_logs', 1); s.set('kp_lq_jeno_log1'); s.sfx('found');
      yield s.msg(KP.got('lq_hojo_logs'));
      yield s.msg('Mostly lunch orders. The last page says:\f"Day 40. It remembered the sky first."');
      yield s.say('Scientist', "Volume two should still be in his old desk, top floor of the Skyport HQ. He never cleaned it out. He never cleaned anything out.");
      return;
    }
    if (!s.flag('kp_lq_jeno_log2')) { yield s.say('Scientist', "Volume two: Hojo's old desk, top floor of the HQ in Skyport. Mind the snack wrappers."); return; }
    if (!s.flag('kp_lq_jeno_hojo')) { yield s.say('Scientist', "He's camped on the Green Road, watching the tower? From a safe distance, I bet. He loves a safe distance."); return; }
    if (!s.flag('kp_lq_jeno_hatch')) { yield s.say('Scientist', "A keycard with a J on it? There's a hatch beside the tank upstairs. We were never allowed to open it."); return; }
    yield s.say('Scientist', "Whatever's down there... be gentle with it. Somebody should be.");
  };
  // ...and afterwards, outside Mogridge's bakery (where he sells the Lifestream Seeds he keeps finding in his old lab
  // coat: the Kupo Ranch takes one for a Jenomog egg, js/kupomon/kp_legendbreed.js)
  add('kp_mogridge', 'npcs', [{ id: 'lq_jeno_baker', name: 'Baker', model: { base: 'scientist', extras: ['apron'] }, at: [3, 24], dir: 'down', show: s => s.flag('kp_lq_jeno_reward'),
    talk: function* (s) {
      yield s.say('Baker', "I've taken up baking. Nothing glows. It's wonderful.\fThe Nutmog keeps stealing the buns, mind. Some experiments never end.");
      yield s.say('Baker', "Except those green beads from the Wellspring. They keep turning up in my old lab coat. They glow. I want them gone.");
      yield* KP.legendItemShop(s, 'jenomog_project_j', { who: 'Baker', done: 'kp_lq_jeno_done' });
    } }]);
  KP.legendSeller('jenomog_project_j', 'kp_mogridge', 'lq_jeno_baker');

  // ---- volume 2: Hojo's old desk (Team Hojo HQ 3F)
  add('kp_hojo_hq_3', 'props', [{ at: [17, 7], prop: 'counter', col: '#5a4a3c', col2: '#7a6a58' }]);
  add('kp_hojo_hq_3', 'triggers', [{ at: [17, 7], on: 'talk', run: function* (s) {
    if (s.flag('kp_lq_jeno_log2')) { yield s.msg("Hojo's old desk. Nothing left but graph paper and a very old sandwich."); return; }
    if (!s.flag('kp_lq_jeno_log1')) { yield s.msg("Hojo's old desk. The drawers are stuffed with graph paper and snack wrappers."); return; }
    s.sfx('search'); yield 20;
    yield s.msg('Under a drift of graph paper: a notebook marked "PROJECT J - VOL. 2"!');
    s.set('kp_lq_jeno_log2'); s.sfx('found');
    yield s.msg("(Hojo's Logs: volume 2 of 3.)\fIt reads: \"Day 61. Then it remembered falling. It hummed in C minor all week.\"");
    yield s.msg('Scribbled in the margin: "Vol. 3 stays with me. Observing from the Green Road. Do NOT disturb."');
  } }]);

  // ---- cutscene B: the camp (Route 12's cliff top, from volume 2 on; a note once Jenomog is befriended)
  const HOJO_T = trainer({ id: 'lq_jeno_hojo', cls: 'Professor', name: 'Hojo', model: 'hojo', bg: 'mountain', music: 'makocannon', money: 3000,
    team: [['galimog_galian', 28], ['spookmog_necromancer', 28], ['clockmog_chrono', 29], ['embermog_archmage', 29], ['ghostmog_specter', 29]],
    lose: "Results: inconclusive. Repeat the experiment! ...No. Don't." });
  const campUp = () => flag('kp_lq_jeno_log2') && !done('jeno');
  const campTalk = function* (s) {
    if (s.flag('kp_lq_jeno_hojo')) { yield s.say('Hojo', "Hm? Oh. You. The hatch is beside the tank. Mind the glow.\f...And don't block the lens."); return; }
    yield s.say('Hojo', "Don't block the lens. I'm observing. From a SAFE distance.");
    yield 30;
    s.stopAnim('lq_hojo_camp'); s.hover('lq_hojo_camp', 0);
    yield s.face('lq_hojo_camp', 'player');
    s.emote('lq_hojo_camp', '!'); s.sfx('found');
    yield 30;
    yield s.say('Hojo', "You! Here for my notes? My last volume? My lunch?\f...All three? Then you'll have to win them. Science demands a control group!");
    const r = yield* duel(s, HOJO_T);
    if (r !== 'win') return;
    s.set('kp_lq_jeno_hojo');
    yield s.say('Hojo', "Fine. FINE. Volume three. And the keycard, since you'd only pester me for it.");
    s.sfx('found');
    yield s.msg("(Hojo's Logs: volume 3 of 3.)\fIt reads: \"Day 77. Last, it remembered the cold. Then it remembered me. It did not look pleased.\"");
    KP.give('lq_keycard_j', 1); s.sfx('found');
    yield s.msg(KP.got('lq_keycard_j'));
    yield s.say('Hojo', "The hatch beside the tank. If it's going to remember anyone, it may as well be someone who keeps winning. Hehehe.");
    yield s.face('lq_hojo_camp', 'left');
    s.anim('lq_hojo_camp', 'sit'); s.hover('lq_hojo_camp', 0.14);
  };
  add('kp_route12', 'npcs', [{ id: 'lq_hojo_camp', name: 'Hojo', model: 'hojo', at: [25, 6], dir: 'left', anim: 'sit', hover: 0.14, faceOnTalk: false, show: campUp, talk: campTalk }]);
  add('kp_route12', 'objects', [
    piece('lq_hojo_tent', [27, 6], { prop: 'tent', col: '#6e7a52' }, campUp, { scale: 1.6, block: true }),
    piece('lq_hojo_stool', [25, 6], { prop: 'stool', style: 'wood', col: '#8a6a40' }, campUp),
    piece('lq_hojo_tripod', [24, 6], { prop: 'pylon', h: 0.85, w: 0.6, top: 0.12, thick: 0.6, deck: false, col: '#5a4a36' }, campUp, { block: true }),
    piece('lq_hojo_scope', [24, 6], { prop: 'tank', r: 0.18, h: 0.5, col: '#b89a50' }, campUp, { hover: 0.8 }),
    piece('lq_hojo_note', [25, 6], { prop: 'sign', text: 'NOTE', col: '#e8e0c8' }, () => flag('kp_lq_jeno_log2') && done('jeno'), { block: true,
      talk: function* (s) { yield s.msg('Hojo\'s camp is gone. A note is pinned to a stake:\f"Observation complete. Results: humbling. - H."'); } }),
  ]);

  // ---- the Wellspring (new): a round green-lit cave under the tower, a pool of rising Lifestream, three memory pods
  // (north, east, west) and the spiral stair up to the hatch
  const WELL = [
    "   ##########   ",
    "  ##...1....##  ",
    " ##U........U## ",
    "##............##",
    "#.....****.....#",
    "#....******....#",
    "#2...******...3#",
    "#....******....#",
    "#.....****.....#",
    "##U..........U##",
    " ##......Z...## ",
    "  #####Z|Z##### ",
    "    ###ZZZ###   ",
    "    #########   ",
  ];
  const POD_DIM = '#2e5a4c', POD_LIT = '#c0ffe8';
  const PODS = [   // in the Logs' order: [x, y, what it shows, the memory once lit]
    [7, 1, 'Inside it, something wide and blue drifts by, like a sky seen from far, far below.', 'A memory rises out of it: the sky. Wide, and blue, and very far away.'],
    [14, 6, 'Inside it, shapes tumble down and down, and never land.', 'A memory rises out of it: falling. A long, long way.'],
    [1, 6, 'Frost creeps across the inside of its glass, melts, and creeps again.', 'A memory rises out of it: the cold. Then a face in a lab coat.'],
  ];
  const podTalk = (i) => function* (s) {
    const n = s.get('kp_lq_jeno_pods');
    if (n > i) { yield s.msg('The pod glows softly. ' + PODS[i][3]); return; }
    const c = yield s.ask(null, 'A tall pod of glowing stone. ' + PODS[i][2], ['Touch it', 'Leave it']);
    if (c !== 0) return;
    if (i !== n) {
      s.setVar('kp_lq_jeno_pods', 0); s.sfx('error'); s.flash('#103028', 16, 0.6);
      yield s.msg('The pods dim, all three at once. The memories slip away.\fStart from the first.');
      return;
    }
    s.inc('kp_lq_jeno_pods'); s.sfx('magic'); s.flash('#c0ffe0', 14, 0.6);
    yield s.msg('The pod lights up. ' + PODS[i][3]);
    if (i === 2) yield* jenoRises(s);
  };
  // the encounter, and when it comes back
  const jenoFight = function* (s) {
    const r = yield* legend(s, { q: 'jeno', sp: 'jenomog_project_j', actor: 'lq_jenomog', bg: 'lifestream',
      opening: "Project J hums in C minor. It won't be anybody's project again.",
      after: 'Jenomog sinks back into the light. The pods flicker. It will rise when you come back.',
      beaten: function* (s) { yield s.hover('lq_jenomog', -1.4, 60); s.remove('lq_jenomog'); CUT.jenoCalm = true; },
      then: function* (s) { yield s.msg('Jenomog settles beside you, humming. For the first time, the tune sounds like its own.\f(The Scientist on the tower\'s first floor would want to know.)'); } });
    if (r === 'lose') return;
    if (r === 'escape') CUT.jenoCalm = true;
    CUT.jenoBeam = 0;
    s.music('lifestream');
    yield s.camFollow(30);
  };
  // ---- cutscene C: the Wellspring (the third pod)
  const jenoRises = function* (s) {
    yield 20;
    for (let k = 1; k <= 3; k++) { CUT.jenoBeam = k; s.sfx('magic'); s.flash('#a0ffd8', 10, 0.5); yield 30; }
    s.stopMusic(60);
    yield s.cam(7, 6, 60);
    yield 30;
    s.shake(4, 60); s.sfx('summon'); s.flash('#c0ffe0', 20);
    yield s.msg('The pool rises in a column of light!');
    s.spawn('lq_jenomog', JENO_M, 7, 6, 'down', { name: 'Jenomog', hover: -1.2 });
    yield s.hover('lq_jenomog', 1.2, 90);
    yield s.msg('Jenomog lifts out of the light, its one wing unfolding.');
    yield s.msg('It remembers the sky. It remembers the fall.\fNow it wants to know what it is.');
    yield s.face('lq_jenomog', 'player');
    s.emote('lq_jenomog', '!'); s.sfx('found');
    yield 30;
    yield* jenoFight(s);
  };
  const jenoAgain = function* (s) {
    if (!s.actor('lq_jenomog')) { s.spawn('lq_jenomog', JENO_M, 7, 8, 'down', { name: 'Jenomog', hover: -1.2 }); yield s.hover('lq_jenomog', 1.2, 60); }
    yield s.cam(7, 7, 30);
    yield s.msg('The pool swells with light. Jenomog rises to meet you again.');
    yield s.face('lq_jenomog', 'player');
    s.emote('lq_jenomog', '!');
    yield 24;
    yield* jenoFight(s);
  };
  const back = (s) => s.get('kp_lq_jeno_pods') >= 3 && !done('jeno');
  FF7.defineMap('kp_lq_jeno_well', {
    name: 'The Wellspring', area: 'Lifestream Tower', theme: 'lifestream', music: 'lifestream', kpBg: 'lifestream',
    look: { floor: ['#24463e', '#20403a'], floor3: ['#2e5048', '#2a4a42'], wall: '#163a32', trim: '#0a2a24', mako: '#90ffd0', glow: '#80ffc8', wallH: 3.2,
      sky: ['#010806', '#04221a'], ambient: [0.3, 0.48, 0.42], light: [0.46, 0.8, 0.66], fog: { color: [0.02, 0.12, 0.09], near: 7, far: 18 },
      wallTex: { wall: 'rock' }, floorTex: { floor: 'rock' } },
    grid: WELL,
    // (the spiral: up from the floor at 7,10, round the column at 8,11, to the hatch at 9,10)
    heights: flat(WELL, { '7,11': 1, '7,12': 2, '8,12': 3, '9,12': 4, '9,11': 5, '9,10': 6 }),
    legend: { Z: 'steps', 1: 'block', 2: 'block', 3: 'block' },
    props: [
      { at: [3, 2], col: '#7ae8c0' }, { at: [12, 2], col: '#7ae8c0' }, { at: [2, 9], col: '#5ad0a8' }, { at: [13, 9], col: '#5ad0a8' },
      { at: [8, 11], prop: 'pillar', h: 2.3, col: '#2a4a42', col2: '#3e6a5c', fade: true },
      { at: [5, 5], prop: 'crystal', col: '#b0ffe0' }, { at: [10, 7], prop: 'crystal', col: '#b0ffe0' },   // (crystal roots in the pool)
    ],
    lights: [[7.5, 6, '#90ffd0', 7], [7, 1, '#a0ffd8', 2.5], [1, 6, '#a0ffd8', 2.5], [14, 6, '#a0ffd8', 2.5], [8, 11, '#90ffd0', 2.5]],
    entries: { from_hatch: [9, 11, 'down'] },
    exits: [{ at: [9, 10, 1, 1], to: 'kp_lifestream_2', entry: 'from_well', sfx: 'door_shinra' }],
    npcs: [{ id: 'lq_jenomog', name: 'Jenomog', model: JENO_M, at: [7, 8], dir: 'down', hover: 1.2, show: back, talk: jenoAgain }],
    objects: [].concat(...PODS.map(([x, y], i) => {
      const lit = () => vget('kp_lq_jeno_pods') > i || CUT.jenoBeam > i || done('jeno');
      return [piece('lq_jeno_pod' + i, [x, y], { prop: 'pod', col: POD_DIM }, () => !lit(), { scale: 1.25 }),
        piece('lq_jeno_podlit' + i, [x, y], { prop: 'pod', col: POD_LIT }, lit, { scale: 1.25 })];
    })),
    triggers: PODS.map(([x, y], i) => ({ at: [x, y], on: 'talk', run: podTalk(i) })).concat([
      { id: 'lq_jeno_rise', at: [6, 9, 4, 1], once: false, if: s => back(s) && !CUT.jenoCalm, run: jenoAgain }]),
    onLoad: function () { CUT.jenoBeam = 0; CUT.jenoCalm = false; },
  });

  // ==================================================================== 2. ULTIMOG: THE FOUR SEALS
  // Opens with the Gold League (kp_league_1) and the Scholar on the crater rim (cutscene A: the Ultima Primer). Four
  // verses from four old places; Morrigan's rematch on the second ring lifts her ward off the seal stones; each
  // stone's riddle answered with its verse; the fourth opens the heart (cutscene B), steps down to the Crater's Eye
  // (cutscene C: the crystal breaks, Ultimog wakes). The Scholar comes down after, with a Mana Prism.
  KP.ITEMS.lq_ultima_primer = { name: 'Ultima Primer', kind: 'key', price: 0,
    get desc() { const n = countOf('kp_lq_ulti_v', 4);
      return n >= 4 ? 'Four verses: a breath, a spark, a sky, a seed. The last spell, one page at a time.' : `A primer of four blank pages for the old verses. Copied: ${n} of 4.`; } };
  const VERSES = [
    { map: 'kp_ruins_2', at: [4, 9], text: 'Before every spell, a breath.', look: 'Glyphs worn almost smooth, cut into the tomb wall long before the Wrapmog moved in.' },
    { map: 'kp_mtkupo_2', at: [5, 1], text: 'Under every stone, a spark.', look: 'Behind the crystal, a glyph is cut into the rock. The glow makes it swim.' },
    { map: 'kp_nibelpeaks', at: [16, 3], text: 'Over every peak, a sky.', look: 'An old altar stone set into the temple wall, its glyph worn by a thousand winters.' },
    { map: 'kp_bloomhaven_church', at: [10, 4], text: 'After every ending, a seed.', look: 'A broken stone among the flowers. Under the petals, a glyph.' },
  ];
  VERSES.forEach((V, i) => add(V.map, 'triggers', [{ at: V.at, on: 'talk', run: function* (s) {
    const f = 'kp_lq_ulti_v' + (i + 1);
    if (s.flag(f)) { yield s.msg(V.look + `\f"${V.text}"\nIt's copied in the Primer.`); return; }
    if (!s.flag('kp_lq_ulti_open')) { yield s.msg(V.look + '\fThe letters are older than any you know.'); return; }
    yield s.msg(V.look);
    s.set(f); s.sfx('learn');
    yield s.msg(`${s.name('cloud')} copies the verse into the Ultima Primer:\f"${V.text}"\f(Verses copied: ${countOf('kp_lq_ulti_v', 4)} of 4.)`);
  } }]));
  add('kp_ruins_2', 'labels', [{ at: [4, 9], face: 's', text: '* + *', size: 0.16, col: '#b89a64', y: 1.3 }]);
  add('kp_nibelpeaks', 'labels', [{ at: [16, 3], face: 's', text: '* + *', size: 0.16, col: '#9ab8d8', y: 1.1 }]);

  // ---- cutscene A: a theory (the Scholar on the rim)
  const sch = npcOf('kp_crater_1', 'cr_scholar'), sch0 = sch.talk;
  const PLACES = ['the tomb in the Sunken Ruins', 'the glowing chamber under Mt. Kupo', 'the temple at Nibel Peaks', 'the old church in Bloomhaven'];
  const theory = function* (s) {
    yield s.msg('The Scholar is buried in an enormous book.');
    s.emote('cr_scholar', '!'); s.sfx('found');
    yield 30;
    yield s.face('cr_scholar', 'player');
    yield s.say('Scholar', 'A Gold League champion! Perfect. You have legs, and I have a theory.');
    yield s.say('Scholar', 'Down there, round the glowing heart, are four seal stones: one on the rim, one on each ring below. All four are blank.');
    yield s.cam(17, 14, 90);
    yield 30;
    yield s.say('Scholar', "Four seals, four verses, and something asleep under the glow.\fThe old texts call it the last spell. I call it Tuesday's reading.", { pos: 'top' });
    yield s.camFollow(90);
    yield s.say('Scholar', 'The verses that wake the stones were carried off to the four oldest places on the isles:\f' + PLACES.slice(0, 3).join(', ') + ', and ' + PLACES[3] + '.');
    KP.give('lq_ultima_primer', 1); s.set('kp_lq_ulti_open'); s.sfx('found');
    yield s.msg(KP.got('lq_ultima_primer'));
    yield s.say('Scholar', "Four blank pages. Copy a verse onto each, then read them to the stones. Politely. They're very old.");
  };
  sch.show = () => !done('ulti');   // (he's in the Eye afterwards)
  sch.talk = function* (s) {
    if (!s.flag('kp_league_1') || done('ulti')) { yield* sch0(s); return; }
    if (!s.flag('kp_lq_ulti_open')) { yield* theory(s); return; }
    const left = PLACES.filter((p, k) => !s.flag('kp_lq_ulti_v' + (k + 1)));
    if (left.length) { yield s.say('Scholar', `${4 - left.length} of 4 verses! Still to copy: ${left.join('; ')}.`); return; }
    if (!s.flag('kp_lq_ulti_morrigan')) { yield s.say('Scholar', "All four! ...The stones won't listen? Black sigils all over them?\fThat's a ward. Morrigan, on the second ring, collects old books. And grudges."); return; }
    if (!s.flag('kp_lq_ulti_s4')) { yield s.say('Scholar', 'Read them to the stones: the rim, then the rings, then the floor. Ask nicely.'); return; }
    yield s.say('Scholar', "Go on down! I'll be up here. Taking notes. From up here.");
  };
  npcOf('kp_crater_1', 'cr_ultimog').show = () => false;   // (Ultimog sleeps in the Eye now)

  // ---- Morrigan's rematch: the Black Circle (her ward on the seal stones)
  const morr = npcOf('kp_crater_1', 'cr_morrigan'), morr0 = morr.talk, morrSee = trigOf('kp_crater_1', 'see_cr_morrigan');
  const MORR_T = trainer({ id: 'lq_ulti_morrigan', cls: 'Elite', name: 'Morrigan', model: morr.model, bg: 'crater', money: 2600,
    team: [['kupwick_magus', 30], ['embermog_archmage', 30], ['chillkin_elementalist', 30], ['voltkin_stormcaller', 30], ['sootkin_pyromancer', 30]],
    lose: 'Hm. You read better than you look.' });
  const morrTalk = function* (s) {
    const on = s.flag('kp_lq_ulti_open') && !done('ulti');
    if (on && s.flag('kp_lq_ulti_morrigan')) { yield s.say('Elite Morrigan', "The ward's gone. Go and read to your stones. Don't blame me if one reads back."); return; }
    if (!on || !allOf(s, 'kp_lq_ulti_v', 4)) {
      if (on && s.flag('kp_tr_cr_morrigan')) { yield s.say('Elite Morrigan', "Hunting the old verses? Come back when your book's full. I don't waste spells on half-read trainers."); return; }
      yield* morr0(s); return;
    }
    s.emote('cr_morrigan', '!'); s.sfx('found');
    yield 24;
    yield s.face('cr_morrigan', 'player'); yield s.face('player', 'cr_morrigan');
    yield s.say('Elite Morrigan', "Four verses in a primer. The last spell? You're reading the wrong books.\fI warded those stones myself. Show me you're worth the right ones.");
    const r = yield* duel(s, MORR_T);
    if (r !== 'win') return;
    s.set('kp_lq_ulti_morrigan'); s.set('kp_tr_cr_morrigan');
    yield s.say('Elite Morrigan', "...Fine. You're worth them.");
    s.sfx('magic'); s.flash('#8040c0', 12, 0.5);
    yield s.msg('Morrigan snaps her fingers. All down the crater, the black sigils on the seal stones burn away.');
  };
  morr.talk = morrTalk; if (morrSee) morrSee.run = morrTalk;

  // ---- the seal stones (one on each ring, rim to floor) and their riddles
  const SEAL_DIM = '#2c2a3a', SEAL_LIT = '#8ae8c8';
  const SEALS = [
    { at: [24, 29], name: "rim's", q: 'What comes before every spell?', ch: ['A seed', 'A breath', 'A spark'], right: 1, verse: 'Before every spell, a breath.' },
    { at: [28, 21], name: "first ring's", q: 'What sleeps under every stone?', ch: ['A spark', 'A sky', 'A breath'], right: 0, verse: 'Under every stone, a spark.' },
    { at: [26, 9], name: "second ring's", q: 'What waits over every peak?', ch: ['A breath', 'A seed', 'A sky'], right: 2, verse: 'Over every peak, a sky.' },
    { at: [22, 13], name: "floor's", q: 'What is left after every ending?', ch: ['A sky', 'A seed', 'A spark'], right: 1, verse: 'After every ending, a seed.' },
  ];
  // ---- cutscene B: the heart opens (the fourth seal)
  const heartOpens = function* (s) {
    CUT.heartWait = true;
    yield 20;
    for (const S of SEALS) { yield s.cam(S.at[0], S.at[1], 40); s.flash('#a0ffd8', 12, 0.6); s.sfx('magic'); yield 40; }
    yield s.cam(17, 15, 50);
    s.shake(3, 90); s.sfx('gate'); s.flash('#c8fff0', 20, 0.7);
    CUT.heartWait = false;
    yield s.msg('The heart of the crater folds open like petals. Crystal steps unfold down into the light.');
    yield 30;
    yield s.say('Scholar', "IT WORKED! ...I'll be up here. Taking notes. From up here.", { pos: 'top' });
    yield s.camFollow(50);
  };
  const sealTalk = (i) => function* (s) {
    const S = SEALS[i], f = 'kp_lq_ulti_s' + (i + 1);
    if (s.flag(f)) { yield s.msg(`The ${S.name} seal stone glows: "${S.verse}"`); return; }
    if (!s.flag('kp_lq_ulti_open')) { yield s.msg('A standing stone of black glass, smooth and blank. It feels like it is waiting for something.'); return; }
    if (!allOf(s, 'kp_lq_ulti_v', 4)) { yield s.msg('The seal stone hums a question you can almost hear.\fYou need all four verses in the Primer to answer it.'); return; }
    if (!s.flag('kp_lq_ulti_morrigan')) { yield s.msg('Black sigils crawl over the seal stone and swallow its question. Somebody has warded it.\f(Morrigan, on the second ring, reads the same old books...)'); return; }
    for (let t = 0; ; t++) {
      const c = yield s.ask(null, `The seal stone hums a question:\n"${S.q}"`, S.ch.concat(['Step back']));
      if (c === S.right) break;
      if (c == null || c >= S.ch.length || t >= 8) return;
      s.sfx('error'); s.flash('#ff3030', 14, 0.6);
      yield s.msg('The stone flares red and goes dark. Pick again.');
    }
    s.set(f); s.sfx('magic'); s.flash('#a0ffd8', 14, 0.6);
    yield s.msg(`The ${S.name} seal stone lights up:\n"${S.verse}"`);
    if (allOf(s, 'kp_lq_ulti_s', 4)) yield* heartOpens(s);
  };
  add('kp_crater_1', 'props', SEALS.map(S => ({ at: S.at, prop: 'none' })));
  const heartOpen = () => flag('kp_lq_ulti_s4') && !CUT.heartWait;
  add('kp_crater_1', 'objects', [].concat(...SEALS.map((S, i) => {
    const lit = () => flag('kp_lq_ulti_s' + (i + 1));
    return [piece('lq_ulti_seal' + i, S.at, { prop: 'spire', h: 1.5, r: 0.55, col: SEAL_DIM }, () => !lit()), piece('lq_ulti_seallit' + i, S.at, { prop: 'spire', h: 1.5, r: 0.55, col: SEAL_LIT }, lit)];
  }),
    // the heart, opened: a well of light and the crystal petals round it
    [piece('lq_ulti_heart', [17.5, 15], { prop: 'hole', r: 1.3, col: '#c8fff0', col2: '#3a3a48' }, heartOpen)],
    [0, 1, 2, 3, 4, 5].map(k => { const a = k / 6 * Math.PI * 2 + 0.3;
      return piece('lq_ulti_petal' + k, [17.5 + Math.cos(a) * 1.25, 15 + Math.sin(a) * 0.9], { prop: 'crystal', col: '#b8fff0' }, heartOpen, { scale: 1.1 }); })));
  add('kp_crater_1', 'triggers', SEALS.map((S, i) => ({ at: S.at, on: 'talk', run: sealTalk(i) })));
  add('kp_crater_1', 'exits', [{ at: [17, 13, 2, 1], to: 'kp_lq_ulti_eye', entry: 'from_crater', if: s => s.flag('kp_lq_ulti_s4') }]);
  map('kp_crater_1').entries.from_eye = [18, 12, 'up'];
  onLoad('kp_crater_1', function () { CUT.heartWait = false; });

  // ---- the Crater's Eye (new): a round chamber of black glass under the heart, four glyph pillars, crystal shards
  // drifting overhead, and the great crystal in the middle with Ultimog asleep inside
  const EYE = [
    "   #######    ",
    "  ##.....##   ",
    " ##.......##  ",
    "##..|...|..## ",
    "#...........# ",
    "#....888....# ",
    "#....888....# ",
    "#....888....# ",
    "#...........# ",
    "##..|...|..## ",
    " ##.......##  ",
    "  ##.....##   ",
    "   ###.###    ",
    "     #^#      ",
  ];
  const ULTI_M = { enemy: 'kp_ultimog_ultima', scale: 1.2 };
  const ultiReward = function* (s) {
    yield s.say('Scholar', 'For the champion who did all the walking: a Mana Prism, and some nuts for the climb back up.');
    KP.give('mana_prism', 1); KP.give('royal_nut', 3); s.sfx('found');
    yield s.msg(KP.got('mana_prism')); yield s.msg(KP.got('royal_nut', 3));
    yield* KP.giveLegendItem(s, 'ultimog_ultima');   // (the first Fifth Seal: js/kupomon/kp_legendbreed.js)
    s.set('kp_lq_ulti_reward');
    yield s.say('Scholar', 'Now if you will excuse me, I have thirty years of notes to correct.');
  };
  const scholarArrives = function* (s) {
    yield 30;
    s.spawn('lq_ulti_scholar', 'man15', 6, 12, 'up', { name: 'Scholar' });
    yield s.move('lq_ulti_scholar', [[6, 10], [5, 9]]);
    yield s.face('lq_ulti_scholar', 'player');
    yield s.say('Scholar', "I came down! I actually came down!\f...Thirty years I've read about this room. It's smaller than I thought.");
    yield* ultiReward(s);
  };
  // ---- cutscene C: the Eye (three tiles from the crystal)
  const ultiWakes = function* (s) {
    const first = !s.flag('kp_lq_ulti_eye');
    yield s.face('player', 'up');
    yield s.cam(6, 6, 50);
    yield s.msg(first ? 'The great crystal hums. Inside it, curled up and fast asleep: Ultimog.' : 'The new crystal hums. Inside it, Ultimog opens one eye.');
    CUT.ultiPillars = true; s.sfx('magic'); s.flash('#a0ffd8', 16, 0.6);
    yield 40;
    CUT.ultiAwake = true; s.flash('#ffffff', 24); s.sfx('bosskill'); s.shake(3, 30);
    yield 30;
    s.emote('lq_ultimog', '!');
    yield s.hover('lq_ultimog', 1.0, 60);
    if (first) yield s.msg('Ultimog has waited a very, very long time for someone worth looking at.\fIt looks at you. It keeps looking.');
    s.set('kp_lq_ulti_eye');
    const sleep = function* (s) { yield s.hover('lq_ultimog', 0.3, 40); CUT.ultiAwake = false; CUT.ultiPillars = false; CUT.ultiCalm = true; s.flash('#c8fff4', 12, 0.5); s.sfx('ice'); };
    const r = yield* legend(s, { q: 'ulti', sp: 'ultimog_ultima', actor: 'lq_ultimog', bg: 'crater',
      opening: 'Ultimog spreads its crystal wings. The last spell begins with a breath.',
      after: 'Ultimog folds itself into a new crystal and sleeps. It will wake when you come back.',
      beaten: sleep, then: scholarArrives });
    if (r === 'lose') return;
    if (r === 'escape') yield* sleep(s);
    yield s.camFollow(40);
  };
  FF7.defineMap('kp_lq_ulti_eye', {
    name: "The Crater's Eye", area: 'Northern Crater', theme: 'crater', music: 'northcave', kpBg: 'crater',
    look: { floor: ['#16141e', '#1b1924'], floor3: ['#22202c', '#1e1c28'], wall: '#2a2638', wallTop: '#1a1824', mako: '#a0ffd8', glow: '#a0ffd8', wallH: 3.4,
      sky: ['#02020a', '#120e24'], ambient: [0.32, 0.32, 0.44], light: [0.6, 0.62, 0.86], fog: { color: [0.04, 0.03, 0.1], near: 8, far: 22 },
      floorTex: { floor: 'marble' }, wallTex: { wall: 'rock' } },
    grid: EYE,
    heights: flat(EYE, { '6,13': 1 }),
    legend: { 8: 'block' },
    props: [{ at: [6, 6], prop: 'disc', r: 1.45, h: 0.12, col: '#14121c', top: '#22202e', ring: '#7ae8c8' }].concat(
      [[4, 3], [8, 3], [4, 9], [8, 9]].map(at => ({ at, prop: 'none' }))),
    lights: [[6, 6, '#a0ffd8', 6], [4, 3, '#a0ffd8', 2], [8, 3, '#a0ffd8', 2], [4, 9, '#a0ffd8', 2], [8, 9, '#a0ffd8', 2]],
    entries: { from_crater: [6, 12, 'up'] },
    exits: [{ at: [6, 13, 1, 1], to: 'kp_crater_1', entry: 'from_eye' }],
    npcs: [
      { id: 'lq_ultimog', name: 'Ultimog', model: ULTI_M, at: [6, 6], dir: 'down', hover: 0.3, show: () => !done('ulti') },
      { id: 'lq_ulti_scholar', name: 'Scholar', model: 'man15', at: [2, 4], dir: 'right', show: () => done('ulti'),
        talk: function* (s) {
          if (!s.flag('kp_lq_ulti_reward')) { yield* ultiReward(s); return; }
          yield s.say('Scholar', "Page four hundred and twelve: 'The Eye is cold, and smaller than expected. The champion was very polite.'\f...Too much?");
          // (then the Fifth Seals he chips off the lattice, for the Kupo Ranch: js/kupomon/kp_legendbreed.js)
          yield s.say('Scholar', "Oh! The lattice sheds a shard now and then, cut just like the seal stones. I keep them. For study. And for sale. Research is expensive.");
          yield* KP.legendItemShop(s, 'ultimog_ultima', { who: 'Scholar', done: 'kp_lq_ulti_done' });
        } },
    ],
    objects: [].concat(
      // the great crystal round the sleeper (it breaks when Ultimog wakes, and grows back when it sleeps)
      [0, 1, 2, 3, 4, 5].map(k => { const a = k / 6 * Math.PI * 2;
        return piece('lq_ulti_cage' + k, [6 + Math.cos(a) * 0.72, 6 + Math.sin(a) * 0.72], { prop: 'crystal', col: '#c8fff4' }, () => !done('ulti') && !CUT.ultiAwake, { scale: 1.6, dir: a }); }),
      // the four glyph pillars (lit as it wakes, and once it's befriended)
      [].concat(...[[4, 3], [8, 3], [4, 9], [8, 9]].map((at, k) => { const lit = () => CUT.ultiPillars || done('ulti');
        return [piece('lq_ulti_pillar' + k, at, { prop: 'pod', col: '#2a2a3a' }, () => !lit(), { scale: 1.45 }), piece('lq_ulti_pillarlit' + k, at, { prop: 'pod', col: '#a0ffd8' }, lit, { scale: 1.45 })]; })),
      // the slow lattice of shards overhead
      [[2, 2, 2.5], [10, 2, 2.3], [1, 6, 2.7], [11, 6, 2.4], [6, 1, 2.6]].map(([x, y, h], k) => ({ id: 'lq_ulti_shard' + k, at: [x, y], model: { prop: 'crystal', col: '#90f0d0' }, scale: 0.55, solid: false, hover: h,
        tick(o) { const t = o.t || 0; o.hover = h + Math.sin(t * 0.02 + k * 1.7) * 0.12; o.dir = t * 0.004 + k * 1.2; } }))),
    triggers: [{ id: 'lq_ulti_wake', at: [3, 10, 7, 1], once: false, if: () => !done('ulti') && !CUT.ultiCalm && !CUT.ultiAwake, run: ultiWakes }],
    onLoad: function () { CUT.ultiAwake = false; CUT.ultiCalm = false; CUT.ultiPillars = false; },
  });
  KP.legendSeller('ultimog_ultima', 'kp_lq_ulti_eye', 'lq_ulti_scholar');

  // ==================================================================== 3. OMEGAMOG: OMEGA'S TALLY
  // Opens with the Master League (kp_league_4) and the Four Seals done. Ulric, by the river (cutscene A: the wall),
  // battles again for the Tally Stone, and the door behind the dais grinds open. In the Proving Ground the five
  // Keepers wake in the tally wall's order and battle back to back (cutscene B each; lose one and the wall scrapes the
  // marks off); the fifth carves a new mark and Omegamog walks in (cutscene C). Beaten, it's back on its dais.
  // Befriended: Ulric's Aegis Shield, and he leaves the Depths for the crater rim.
  KP.ITEMS.lq_tally_stone = { name: 'Tally Stone', kind: 'key', price: 0,
    get desc() { return flag('kp_lq_omega_k5') || done('omega') ? 'A flat grey stone: five scratches, crossed through with one long line. Omega counted.'
      : `A flat grey stone for keeping count. Marks so far: ${vget('kp_lq_omega_run')} of 5.`; } };
  const OMEGA_M = { enemy: 'kp_omegamog_omega', scale: 1.2 };
  const uln = npcOf('kp_crater_2', 'cr_ulric'), uln0 = uln.talk, ulnSee = trigOf('kp_crater_2', 'see_cr_ulric');
  const ULRIC_M = uln.model;
  const ULRIC_T = trainer({ id: 'lq_omega_ulric', cls: 'Elite', name: 'Ulric', model: ULRIC_M, bg: 'crater', money: 2600,
    team: [['grumog_viking', 30], ['wyrmog_rider', 30], ['tickmog_chronomancer', 30], ['shellmog_guardian', 30], ['moglin_samurai', 30]],
    lose: 'Hah. One mark for you. Keep counting.' });
  const omegaOpen = (s) => s.flag('kp_league_4') && done('ulti') && !done('omega');
  // ---- the reward: Ulric comes to see it for himself, then leaves the Depths
  const ulricThanks = function* (s) {
    const at = s.mapId() === 'kp_crater_2' ? [12, 19] : [16, 8];
    s.hide('cr_ulric');
    s.spawn('lq_ulric', ULRIC_M, at[0], at[1], 'left', { name: 'Ulric' });
    yield 20;
    yield s.face('lq_ulric', 'player');
    yield s.say('Elite Ulric', "It crossed one out. I never thought I'd see it.");
    yield s.say('Elite Ulric', "Here. An Aegis Shield, and a few nuts. ...I'm going up into the light for a while. I've been counting long enough.");
    KP.give('aegis_shield', 1); KP.give('royal_nut', 3); s.sfx('found');
    yield s.msg(KP.got('aegis_shield')); yield s.msg(KP.got('royal_nut', 3));
    yield* KP.giveLegendItem(s, 'omegamog_omega');   // (the first Tally Plate: js/kupomon/kp_legendbreed.js)
    s.set('kp_lq_omega_reward');
    yield s.move('lq_ulric', at[0] + 1, at[1]);
    s.remove('lq_ulric');
  };
  const omegaFight = function* (s, actor) {
    return yield* legend(s, { q: 'omega', sp: 'omegamog_omega', actor, bg: 'crater',
      opening: 'Omegamog levels its wave cannon. Somewhere inside it, a counter ticks over.',
      after: 'Omegamog climbs back onto its dais to recount. It will be ready when you are.',
      then: ulricThanks });
  };
  // ---- cutscene A: the wall (the Depths), and Ulric's rematch
  const theWall = function* (s) {
    yield s.face('cr_ulric', 'left');
    yield s.say('Elite Ulric', 'Look at the wall behind it.');
    yield s.cam(7, 19, 50);
    yield s.cam(7, 22, 120);
    yield s.say('Elite Ulric', 'Every challenger, a mark. It has never once crossed one out.', { pos: 'top' });
    yield s.camFollow(50);
    yield s.face('cr_ulric', 'player');
    yield s.say('Elite Ulric', "Omega fights nobody whose tally is shorter than its own. Mine's short. Yours is shorter.");
    s.set('kp_lq_omega_open');
  };
  const ulricTalk = function* (s) {
    if (!omegaOpen(s)) { yield* uln0(s); return; }
    if (!s.flag('kp_lq_omega_open')) yield* theWall(s);
    if (s.flag('kp_lq_omega_k5')) { yield s.say('Elite Ulric', "It's waiting on its dais. Don't keep it waiting."); return; }
    if (s.flag('kp_lq_omega_ulric')) { yield s.say('Elite Ulric', "Five Keepers, and Omega's own words on the wall in there. Read every word. It doesn't repeat itself."); return; }
    yield s.say('Elite Ulric', "So add to yours. Beat me, and I'll tell the wall you're worth counting.");
    const r = yield* duel(s, ULRIC_T);
    if (r !== 'win') return;
    s.set('kp_lq_omega_ulric'); s.set('kp_tr_cr_ulric');
    yield s.say('Elite Ulric', "...One mark. Here. Keep count on this. It'll want to see it.");
    KP.give('lq_tally_stone', 1); s.sfx('found');
    yield s.msg(KP.got('lq_tally_stone'));
    yield s.cam(6, 20, 50);
    s.shake(3, 60); s.sfx('gate');
    yield s.msg('Behind the dais, a door in the rock grinds open.');
    yield s.say('Elite Ulric', "The Proving Ground. Five Keepers, one after another, no breaks. Don't lose count.", { pos: 'top' });
    yield s.camFollow(40);
  };
  uln.talk = ulricTalk; if (ulnSee) ulnSee.run = ulricTalk;
  uln.show = s => !s.flag('kp_lq_omega_reward');
  // ---- ...and up in the light afterwards: Ulric on the crater rim, by the way in, where the Scholar used to read (he
  // sells the Tally Plates he pried off the Proving Ground's wall: the Kupo Ranch takes one for an Omegamog egg,
  // js/kupomon/kp_legendbreed.js)
  add('kp_crater_1', 'npcs', [{ id: 'lq_omega_ulric', name: 'Ulric', model: ULRIC_M, at: [22, 29], dir: 'up', show: s => s.flag('kp_lq_omega_reward'),
    talk: function* (s) {
      yield s.say('Elite Ulric', "The sky's bigger than I remembered. I keep counting the clouds. Old habit.");
      yield s.say('Elite Ulric', "I pried a few plates off the Proving Ground's wall on my way up. Five marks cut in each. Omega won't miss them. Probably.");
      yield* KP.legendItemShop(s, 'omegamog_omega', { who: 'Elite Ulric', done: 'kp_lq_omega_done' });
    } }]);
  KP.legendSeller('omegamog_omega', 'kp_crater_1', 'lq_omega_ulric');
  // ---- Omegamog on its dais: silent until the gauntlet is won, then the encounter
  const omn = npcOf('kp_crater_2', 'cr_omegamog'), omShow0 = omn.show;
  omn.show = s => omShow0(s) && !done('omega');
  omn.talk = function* (s) {
    if (!s.flag('kp_lq_omega_k5')) {
      yield s.msg(s.flag('kp_lq_omega_open') ? "Omegamog's gears are silent. It's watching the door behind its dais, as if a tally there needs settling."
        : 'Omegamog stands on its dais. Its gears are silent. Behind it, a wall of scratched marks.');
      return;
    }
    yield s.msg('Omegamog has climbed back onto its dais to recount. Its gears are already turning.');
    yield* omegaFight(s, 'cr_omegamog');
  };
  // ---- the door behind the dais, and the wall of marks round it
  add('kp_crater_2', 'exits', [{ at: [6, 20, 1, 2], to: 'kp_lq_omega_ground', entry: 'from_depths', sfx: 'door', if: s => s.flag('kp_lq_omega_ulric'),
    blocked: function* (s) { yield s.msg("A heavy door is set into the rock behind the dais, scored with the same marks as the wall. It doesn't budge."); } }]);
  map('kp_crater_2').entries.from_ground = [7, 21, 'right'];
  const doorOpen = () => flag('kp_lq_omega_ulric');
  add('kp_crater_2', 'objects', [
    piece('lq_omega_door', [5.56, 20.5], { prop: 'banner', w: 1.9, h: 1.6, y: 1.75, col: '#2a2830', col2: '#5a2420' }, () => !doorOpen(), { dir: 'right' }),
    piece('lq_omega_dooropen', [5.56, 20.5], { prop: 'banner', w: 1.9, h: 1.6, y: 1.75, col: '#060608', col2: '#c03020' }, doorOpen, { dir: 'right' }),
  ]);
  const MARKS = 'IIII/ IIII/ IIII/';
  add('kp_crater_2', 'labels', [].concat(...[[6, 19], [6, 22]].map(([x, y]) => [0.5, 0.8, 1.1, 1.4, 1.7].map(h => ({ at: [x, y], face: 'e', text: MARKS, size: 0.09, col: '#8a8494', y: h })))));

  // ---- the Proving Ground (new): a riveted arena under red lamps, five Keeper statues round the edge, Omega's tally
  // wall at the north, and a Mog Repair stand by the door
  const PG = [
    "##################",
    "#####........#####",
    "###............###",
    "##..P........P..##",
    "##..............##",
    "#................#",
    "#................#",
    "#................#",
    "#.P..............+",
    "#...............##",
    "#..............D.#",
    "#...............##",
    "##..............##",
    "##.P.........P..##",
    "###............###",
    "##################",
  ];
  const KEEPERS = [   // in the tally wall's order
    { name: 'Sapphire', at: [3, 13], to: [4, 12], col: '#2850c0', col2: '#16306e', look: 'deep blue stone, its wings curled like a breaking wave',
      line: 'The tide keeps count too.', lose: 'The tide turns. Fine.', team: [['angler_harpooner', 30], ['bubblin_deep_diver', 30], ['seamog_captain', 30]] },
    { name: 'Ruby', at: [13, 3], to: [12, 4], col: '#c02838', col2: '#6e1420', look: 'red stone, rough as desert sand',
      line: 'Sand in every joint, kupo.', lose: 'Gritty. Good.', team: [['dunemog_raider', 30], ['cactumog_guard', 30], ['embermog_archmage', 30]] },
    { name: 'Emerald', at: [13, 13], to: [12, 12], col: '#2a9a50', col2: '#145a2c', look: 'green stone, moss in every crack',
      line: 'Deep. Green. Grumpy.', lose: '...Grumpier now.', team: [['puddlepom_hydromancer', 30], ['truffkin_morpher', 30], ['petalmog_maiden', 30]] },
    { name: 'Diamond', at: [4, 3], to: [5, 4], col: '#eef2fa', col2: '#9aa4b8', look: 'white stone, so hard it rings when you tap it',
      line: 'Nothing gets through. Try anyway.', lose: 'Something got through. Huh.', team: [['shellmog_guardian', 30], ['aegimog_holy_knight', 30], ['brawnpom_defender', 30]] },
    { name: 'Ultimate', at: [2, 8], to: [3, 8], col: '#60d0f0', col2: '#2a6a88', look: 'sky-blue stone, its little wings spread wide',
      line: 'Last, and highest.', lose: 'Highest... but not the last word.', team: [['lancemog_highwind', 30], ['seramog_seraph', 30], ['wyrmog_rider', 30]] },
  ];
  // (each statue a moogle of coloured stone: FF7's moogle rig in its stone's colours; awake, the same in the arena)
  KEEPERS.forEach((K, i) => {
    K.model = { rig: 'moogle', c1: K.col, c2: K.col2, wing: K.col2 };
    K.T = trainer({ id: 'lq_omega_keeper' + (i + 1), cls: 'Keeper', name: K.name, model: K.model, bg: 'crater', music: 'fullscale', money: 1500, team: K.team, lose: K.lose });
  });
  // ---- cutscene C: a new mark (after the fifth Keeper)
  const newMark = function* (s) {
    CUT.mark = false; CUT.line = false;
    s.stopMusic(60);
    yield s.cam(8, 1, 60);
    yield 40;
    for (let k = 0; k < 5; k++) { s.sfx('hit'); yield 14; }
    CUT.mark = true;
    yield s.msg('A new mark carves itself into the tally wall.');
    yield 20;
    s.sfx('crit'); s.flash('#ff5040', 14, 0.6); CUT.line = true;
    yield s.msg("Then one long line, straight through every one of Omega's own.");
    for (let k = 0; k < 6; k++) { s.shake(2 + k, 16); s.sfx('set'); yield 15; }
    yield s.msg('Beyond the door, gears begin to turn: slowly, then very, very fast.');
    s.spawn('lq_omegamog', OMEGA_M, 17, 8, 'left', { name: 'Omegamog', talk: function* (s) { yield* omegaFight(s, 'lq_omegamog'); } });
    yield s.cam(14, 8, 40);
    for (const x of [16, 15, 14, 13]) { yield s.move('lq_omegamog', x, 8); s.shake(4, 10); s.sfx('hit'); yield 12; }
    yield s.msg('Omegamog adds one more line to its tally. Yours.');
    const r = yield* omegaFight(s, 'lq_omegamog');
    if (r === 'lose') return;
    s.music('lurking');
    yield s.camFollow(40);
  };
  // ---- the gauntlet's rule (docs/KUPOMON_LEGENDS.md: "five battles back to back, no healing between"; the audit found
  // it unenforced, the user had it fixed, 2026-10-02): once the first Keeper is down the run is on, and a repair at the
  // stand, an oil or a cure from the bag, or leaving the Proving Ground scrapes the marks off. The team's HP and
  // ailments are noted after each Keeper and looked at when the next statue is touched
  let runHp = null;
  const runOn = () => { const r = vget('kp_lq_omega_run'); return r > 0 && r < KEEPERS.length && !flag('kp_lq_omega_k5'); };
  const noteTeam = () => { runHp = new Map(KP.data().party.map(m => [m.uid, { hp: m.hp, status: m.status || null }])); };
  const healedSince = () => runHp && KP.data().party.some(m => { const o = runHp.get(m.uid); return !o ? false : m.hp > o.hp || (o.status && !m.status); });
  const scrape = function* (s, why) {
    s.setVar('kp_lq_omega_run', 0);
    for (let k = 1; k <= KEEPERS.length; k++) s.unset('kp_lq_omega_k' + k);
    runHp = null;
    s.sfx('hit'); s.shake(2, 30);
    yield s.msg(`Behind you, something scrapes along the tally wall. ${why}\fYour marks are gone, and the statues are only statues again. (Five in a row: start over from the first.)`);
  };
  // (the gauntlet as the Demo plans it: every Keeper's team as it will battle, in the wall's order; a run under way)
  KP.GAUNTLETS = KP.GAUNTLETS || {};
  KP.GAUNTLETS.omega = { name: "Omega's five Keepers", flag: 'kp_lq_omega_k5', running: () => runOn(),
    teams: () => KEEPERS.map((K, i) => ({ name: 'Keeper ' + K.name, done: 'kp_lq_omega_k' + (i + 1), foes: W.team(KP.teamFor(K.T.id, K.T.team)) })) };
  // (the Demo keeps its hands off its repairs while a run is on: js/kupomon/kp_runner.js R.kpSide, O.kp_patch)
  KP.healLocked = () => { const fs = FF7.fieldScene; return !!(fs && fs.map && fs.map.id === 'kp_lq_omega_ground' && runOn()); };
  // ---- cutscene B: a Keeper wakes (each statue, in its turn)
  const keeperWakes = function* (s, i) {
    const K = KEEPERS[i], id = 'lq_keeper';
    s.flash(K.col, 16, 0.7); s.sfx('magic');
    yield s.msg("The statue's eyes light up.");
    CUT.omegaAwake = i;
    s.spawn(id, K.model, K.at[0], K.at[1], 'down', { name: 'Keeper ' + K.name, hover: 0.35, scale: 1.3 });
    // (it lands in front of its plinth, unless the party stands there (it touched the plinth from that tile: the user saw
    // the Keepers jump into Cloud): then on a free tile beside the party, nearest the plinth)
    let to = K.to;
    { const fs = s.field, p = fs && fs.player;
      if (p && p.tx === to[0] && p.ty === to[1]) {
        const taken = (x, y) => Object.values(fs.actors || {}).some(a => a && a.visible && a !== p && a.tx === x && a.ty === y);
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]) => [p.tx + dx, p.ty + dy])
          .filter(([x, y]) => fs.P.walkable(x, y) && !taken(x, y) && !(x === K.at[0] && y === K.at[1]))
          .sort((u, v) => Math.hypot(u[0] - K.at[0], u[1] - K.at[1]) - Math.hypot(v[0] - K.at[0], v[1] - K.at[1]));
        if (near.length) to = near[0];
      } }
    yield [s.jump(id, to[0], to[1], 0.6, 24), s.hover(id, 0, 24)];
    yield s.face(id, 'player'); yield s.face('player', id);
    yield s.say('Keeper ' + K.name, K.line);
    const r = yield* duel(s, K.T, { canLose: true, gauntlet: KEEPERS.length - i });   // (the fights left: the Demo's AI keeps HP for them)
    if (r === 'win') {
      s.anim(id, 'kneel'); s.sfx('set'); s.flash(K.col, 12, 0.5);
      yield 40;
      s.remove(id); CUT.omegaAwake = -1;
      s.set('kp_lq_omega_k' + (i + 1)); s.inc('kp_lq_omega_run');
      yield s.msg(`Keeper ${K.name} kneels, and turns back to stone on its plinth.\n(Tally Stone: ${s.get('kp_lq_omega_run')} of 5.)`);
      if (i === KEEPERS.length - 1) { runHp = null; yield* newMark(s); return; }
      noteTeam();
      if (i === 0) yield s.msg('The wall is counting now. Four more, back to back: no repairs, no oils or cures from the bag, and no leaving the Proving Ground until the fifth.');
      return;
    }
    // lost (or worse): the wall scrapes the marks off, and the statues are statues again
    s.remove(id); CUT.omegaAwake = -1;
    s.setVar('kp_lq_omega_run', 0);
    for (let k = 1; k <= KEEPERS.length; k++) s.unset('kp_lq_omega_k' + k);
    runHp = null;
    s.sfx('hit'); s.shake(2, 30);
    yield s.msg('Behind you, something scrapes along the tally wall. Your marks are gone, and the statues are only statues again.\f(Repair at the Mog Repair stand, then start over from the first.)');
  };
  const statueTalk = (i) => function* (s) {
    const K = KEEPERS[i];
    if (s.flag('kp_lq_omega_k5') || done('omega')) { yield s.msg(`${K.name}: a moogle of ${K.look}. It stands on its plinth again, eyes softly lit. It has had its turn.`); return; }
    if (s.flag('kp_lq_omega_k' + (i + 1))) { yield s.msg(`${K.name} is stone again, back on its plinth. It has had its turn.`); return; }
    if (i !== s.get('kp_lq_omega_run')) { s.sfx('error'); yield s.msg(`A moogle statue of ${K.look}. The plaque: ${K.name.toUpperCase()}.\fIt stares straight through you. It isn't its turn.`); return; }
    const c = yield s.ask(null, `A moogle statue of ${K.look}. The plaque on its plinth: ${K.name.toUpperCase()}.`, ['Touch the plinth', 'Leave it']);
    if (c !== 0) return;
    if (runOn() && healedSince()) { yield* scrape(s, 'The wall saw you mend your moogles between Keepers. It counts only five in a row.'); return; }
    yield* keeperWakes(s, i);
  };
  const standRepair = function* (s) {
    if (runOn()) {   // (mid-run: a repair now is a break, and the wall counts no breaks)
      const c0 = yield s.ask('Nurse Mog', "Kupo... the wall is counting! If I fix them up now, it'll scrape your marks off. Repair anyway?", ['Repair anyway', 'No thanks']);
      if (c0 !== 0) { yield s.say('Nurse Mog', 'Good luck, kupo. Five in a row!'); return; }
      s.sfx('heal'); s.flash('#ffd0e0', 10, 0.5); KP.healAll();
      yield 30;
      yield* scrape(s, 'A repair is a break, and the wall counts no breaks.');
      return;
    }
    const c = yield s.ask('Nurse Mog', 'A Mog Repair stand, kupo! Even down here. Shall I fix up your moogles?', ['Yes, please', 'No thanks']);
    if (c !== 0) { yield s.say('Nurse Mog', 'Mind the statues, kupo. They bite.'); return; }
    s.sfx('heal'); s.flash('#ffd0e0', 10, 0.5); KP.healAll();
    yield 30;
    yield s.say('Nurse Mog', 'All better! The wall is very strict, kupo. Five in a row, no breaks.');
  };
  const wallTalk = function* (s) {
    yield s.msg(s.flag('kp_lq_omega_k5') ? "Omega's tally wall: hundreds of marks in bundles of five, one long line struck through them all, and a single new mark."
      : "Omega's tally wall: hundreds of marks, scratched deep in bundles of five. Not one of them is crossed out.");
    yield s.msg('Above the marks, gouged by something very strong:\f"THE SEA GOES FIRST. THEN THE RED SAND. THEN THE DEEP GREEN.\nTHEN THE HARD LIGHT. THE SKY GOES LAST."');
  };
  const LAMPS = [[3.5, 4.5], [13.5, 4.5], [3.5, 11.5], [13.5, 11.5], [8.5, 8]];
  FF7.defineMap('kp_lq_omega_ground', {
    name: 'The Proving Ground', area: 'Northern Crater', theme: 'crater', music: 'lurking', kpBg: 'crater',
    look: { floor: ['#3a3438', '#36303a'], floor3: ['#443c40', '#40383c'], wall: '#2a2428', wallTop: '#1e1a1e', trim: '#5a2420', wallH: 3.6,
      sky: ['#040204', '#1a0808'], ambient: [0.42, 0.3, 0.3], light: [0.86, 0.5, 0.46], fog: { color: [0.08, 0.02, 0.02], near: 9, far: 24 },
      floorTex: { floor: 'metal' }, wallTex: { wall: 'panel' } },
    grid: PG,
    legend: { P: 'block' },
    props: KEEPERS.map(K => ({ at: K.at, prop: 'disc', r: 0.46, h: 0.35, col: K.col2, top: K.col })).concat([{ at: [15, 10], prop: 'counter', col: '#7a6470', col2: '#e8b8c8' }])
      .concat(LAMPS.map(at => ({ at, prop: 'lantern', col: '#ff4030', hang: 2.6, pole: false, size: 0.8 }))),
    labels: [
      { at: [8.5, 0], face: 's', text: 'THE SEA GOES FIRST. THEN THE RED SAND.', size: 0.1, col: '#d8c8b0', y: 2.4 },
      { at: [8.5, 0], face: 's', text: 'THEN THE DEEP GREEN. THEN THE HARD LIGHT.', size: 0.1, col: '#d8c8b0', y: 2.2 },
      { at: [8.5, 0], face: 's', text: 'THE SKY GOES LAST.', size: 0.1, col: '#d8c8b0', y: 2.0 },
    ].concat(...[5, 6, 7, 8, 9, 10, 11, 12].map(x => [0.5, 0.8, 1.1, 1.4, 1.7].map(h => ({ at: [x, 0], face: 's', text: 'IIII/', size: 0.1, col: '#9a8a80', y: h }))),
      [[3, 1], [4, 1], [13, 1], [14, 1]].map(([x, y]) => ({ at: [x, y], face: 's', text: 'IIII/ IIII/', size: 0.08, col: '#8a7a70', y: 1.2 })),
      KEEPERS.map(K => ({ at: K.to, text: K.name.toUpperCase(), size: 0.09, col: K.col })),
      [{ at: [15.3, 10], text: 'MOG REPAIR', size: 0.11, col: '#e05a7a', y: 0.02 }]),   // (at its door, on the floor: on the side wall it was off the screen)
    lights: LAMPS.map(([x, y]) => [x, y, '#ff5038', 4]).concat([[16, 10, '#ffd0e0', 2]]),
    entries: { from_depths: [16, 8, 'left'] },
    exits: [{ at: [17, 8, 1, 1], to: 'kp_crater_2', entry: 'from_ground', sfx: 'door' }],
    npcs: [{ id: 'nurse', name: 'Nurse Mog', model: { enemy: 'kp_pomsprout_devout', scale: 0.85 }, at: [16, 10], dir: 'left', talk: standRepair }],
    objects: KEEPERS.map((K, i) => piece('lq_omega_statue' + i, K.at, K.model, () => CUT.omegaAwake !== i, { hover: 0.35, scale: 1.3, dir: 'down' })).concat([
      // the new mark, and the long line through Omega's own
      piece('lq_omega_line', [8.5, 0.56], { prop: 'banner', w: 8, h: 0.05, y: 1.18, col: '#d83020', border: false }, () => flag('kp_lq_omega_k5') && CUT.line),
      piece('lq_omega_mark', [12.2, 0.56], { prop: 'banner', w: 0.12, h: 0.32, y: 2.0, col: '#f0e8d8', border: false }, () => flag('kp_lq_omega_k5') && CUT.mark),
    ]),
    triggers: KEEPERS.map((K, i) => ({ at: K.at, on: 'talk', run: statueTalk(i) })).concat([{ at: [5, 0, 8, 1], on: 'talk', run: wallTalk }, { at: [15, 10], on: 'talk', run: standRepair }]),
    onLoad: function () { CUT.omegaAwake = -1; CUT.mark = true; CUT.line = true; CUT.omegaLeft = runOn(); },
    // (back after leaving mid-run: the wall has scraped the marks off)
    onEnter: function* (s) { if (!CUT.omegaLeft) return; CUT.omegaLeft = false; yield* scrape(s, 'The wall counts no one who walks out in the middle.'); },
  });

  // ==================================================================== the Demo (js/kupomon/kp_runner.js O.kp_quests)
  // (each fight that must be won is a kp_win block: lost, the team is repaired, trains and goes again)
  const win = (f, train, ...steps) => ['kp_win', steps, f, train && typeof train === 'object' ? train : { train }];
  KP.QUESTS = KP.QUESTS || {};
  KP.QUESTS.jeno = { name: 'Jenomog: What Project J Remembers', order: 1, done: 'kp_lq_jeno_done',
    ready: () => { sync(); return flag('kp_hojo_done') && !flag('kp_lq_jeno_done'); },
    plan: [
      ['goto', 'kp_lifestream_2', { done: 'kp_lq_jeno_open' }],   // (a file from before the quest: Project J sinks as the lab loads)
      ['talk', 'ls1_sci', { map: 'kp_lifestream_1', done: 'kp_lq_jeno_log1' }],
      ['use', 17, 7, { map: 'kp_hojo_hq_3', done: 'kp_lq_jeno_log2' }],
      win('kp_lq_jeno_hojo', 'kp_route12', ['talk', 'lq_hojo_camp', { map: 'kp_route12', done: 'kp_lq_jeno_hojo' }]),
      ['use', 13, 3, { map: 'kp_lifestream_2', done: 'kp_lq_jeno_hatch', choose: 'Use' }],
      win('kp_legend_ls_jenomog', null, ['goto', 'kp_lq_jeno_well'],
        ['use', 7, 1, { done: { var: 'kp_lq_jeno_pods', atLeast: 1 }, choose: 'Touch' }],    // sky
        ['use', 14, 6, { done: { var: 'kp_lq_jeno_pods', atLeast: 2 }, choose: 'Touch' }],   // falling
        ['use', 1, 6, { done: { var: 'kp_lq_jeno_pods', atLeast: 3 }, choose: 'Touch' }],    // cold: Jenomog rises
        ['walk', 7, 9, { done: 'kp_legend_ls_jenomog' }]),                                    // (beaten before: it rises again)
      ['talk', 'ls1_sci', { map: 'kp_lifestream_1', done: 'kp_lq_jeno_reward' }],
    ] };
  KP.QUESTS.ulti = { name: 'Ultimog: The Four Seals', order: 2, done: 'kp_lq_ulti_done',
    ready: () => { sync(); return flag('kp_league_1') && !flag('kp_lq_ulti_done'); },
    plan: [
      ['talk', 'cr_scholar', { map: 'kp_crater_1', done: 'kp_lq_ulti_open' }],
      ['use', 4, 9, { map: 'kp_ruins_2', done: 'kp_lq_ulti_v1' }],
      ['use', 5, 1, { map: 'kp_mtkupo_2', done: 'kp_lq_ulti_v2' }],
      ['use', 16, 3, { map: 'kp_nibelpeaks', done: 'kp_lq_ulti_v3' }],
      ['use', 10, 4, { map: 'kp_bloomhaven_church', done: 'kp_lq_ulti_v4' }],
      win('kp_lq_ulti_morrigan', 'kp_crater_1', ['talk', 'cr_morrigan', { map: 'kp_crater_1', done: 'kp_lq_ulti_morrigan' }]),
      ['use', 24, 29, { map: 'kp_crater_1', done: 'kp_lq_ulti_s1', choose: 'A breath' }],
      ['use', 28, 21, { map: 'kp_crater_1', done: 'kp_lq_ulti_s2', choose: 'A spark' }],
      ['use', 26, 9, { map: 'kp_crater_1', done: 'kp_lq_ulti_s3', choose: 'A sky' }],
      ['use', 22, 13, { map: 'kp_crater_1', done: 'kp_lq_ulti_s4', choose: 'A seed' }],   // (the heart opens)
      win('kp_legend_cr_ultimog', null, ['goto', 'kp_lq_ulti_eye'], ['walk', 6, 10, { done: 'kp_legend_cr_ultimog' }]),
      ['talk', 'lq_ulti_scholar', { map: 'kp_lq_ulti_eye', done: 'kp_lq_ulti_reward' }],
    ] };
  KP.QUESTS.omega = { name: "Omegamog: Omega's Tally", order: 3, done: 'kp_lq_omega_done',
    ready: () => { sync(); return flag('kp_league_4') && flag('kp_lq_ulti_done') && !flag('kp_lq_omega_done'); },
    plan: [
      win('kp_lq_omega_ulric', 'kp_crater_2', ['talk', 'cr_ulric', { map: 'kp_crater_2', done: 'kp_lq_omega_ulric' }]),
      // the gauntlet (five in a row; one lost wipes the marks: repaired at the stand, all five again)
      // (planned as a whole first, kp_win's gauntlet: the box and held items against all fifteen; before each statue
      // that Keeper's own held items and the best lead from where the team stands, O.kp_gauntlet_next)
      win('kp_lq_omega_k5', { train: 'kp_crater_2', center: 'kp_lq_omega_ground', gauntlet: 'omega' }, ['goto', 'kp_lq_omega_ground'],
        ['kp_gauntlet_next', 'omega', 0, { done: 'kp_lq_omega_k1' }], ['use', 3, 13, { done: 'kp_lq_omega_k1', choose: 'Touch' }],    // Sapphire: the sea
        ['kp_gauntlet_next', 'omega', 1, { done: 'kp_lq_omega_k2' }], ['use', 13, 3, { done: 'kp_lq_omega_k2', choose: 'Touch' }],    // Ruby: the red sand
        ['kp_gauntlet_next', 'omega', 2, { done: 'kp_lq_omega_k3' }], ['use', 13, 13, { done: 'kp_lq_omega_k3', choose: 'Touch' }],   // Emerald: the deep green
        ['kp_gauntlet_next', 'omega', 3, { done: 'kp_lq_omega_k4' }], ['use', 4, 3, { done: 'kp_lq_omega_k4', choose: 'Touch' }],     // Diamond: the hard light
        ['kp_gauntlet_next', 'omega', 4, { done: 'kp_lq_omega_k5' }], ['use', 2, 8, { done: 'kp_lq_omega_k5', choose: 'Touch' }]),    // Ultimate: the sky (then Omegamog walks in)
      win('kp_legend_cr_omegamog', null, ['talk', 'cr_omegamog', { map: 'kp_crater_2', done: 'kp_legend_cr_omegamog' }]),
    ] };
})();
