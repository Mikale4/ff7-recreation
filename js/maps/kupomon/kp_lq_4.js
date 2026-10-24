// Kupomon, the legends' sidequests 9-11 (docs/KUPOMON_LEGENDS.md):
//   9  Montblanc, "Clan Kupo": a hunters' lodge through a door in the Champions' Rest's front in the Kupo Coliseum
//      (new map kp_lq_clan_hall, with its practice yard), three marks out on Route 11, Route 8 and the Summit Road,
//      Hunter Rasla, the badge, and the clan's leader dropping in through the skylight.
//   10 Stiltzkin, "The Long Walk": a town a day by the weekday (KP.clock()), three bundles on three different days in
//      three different towns, a postcard, and the Old Oak on Route 1 at sunset (17:00-20:59). No new map.
//   11 Dr. Mog, "The Locked Record": a book with a brass mouth on the right-hand shelf of Prof. Sith's lab, a password
//      from three library books, and a library inside the book (new map kp_lq_drmog_record).
// The region maps are added to at load time (FF7.patchMap, and a door tile cut into the Champions' Rest's front);
// nothing in their files is changed. Dialogue in our own words. Each reward also gives the legend's first breeding
// item, and someone from the quest sells more afterwards (js/kupomon/kp_legendbreed.js): Moglo in the Hall (Clan
// Writ), the Coliseum Mog Center's Ace Trainer (Road Map), the brass mouth on the lab's shelf (Record Key).
//
// THE SOLUTIONS (the Demo's plan, KP.QUESTS at the bottom, plays them):
//   Clan Kupo: talk to Moglo in the Hall (the Mark Bills); beat the Bog Queen (Route 11, by the witch's hut, [8,10]),
//     the Dune Tyrant (Route 8, under the natural arch, [14,18]) and the Summit Ram (Summit Road, the high bridge,
//     [16,6]), any order; beat Hunter Rasla in the Hall; Moglo again (the badge: the boss drops in); Montblanc in the yard.
//   The Long Walk: Sunday Bloomhaven (by the church steps), Monday Mogridge (the market), Tuesday Kurotsuki (the tea
//     house porch), Wednesday Fernwick (the west deck), Thursday Cogsworth (the mine yard), Friday Sandsea (the oasis),
//     Saturday Skyport (by the hangars). Buy a bundle on three different days in three towns (3,333 / 4,444 / 5,555
//     coins); the third gives the postcard. Then Route 1, the Old Oak (Stiltzkin by his fire west of the trunk, 18,10),
//     17:00-20:59: the answer is the town of the second bundle (kept in the var kp_lq_stilt_where2).
//   The Locked Record: the lab's right-hand shelf (12,5); the words: Elder Oakley's shelf in Fernwick (1,1) EVERY, the
//     Grand Bazaar's bookstall in Sandsea (16,3) BATTLE, the Nightmare Arcade's library, floor 2 (7,10) RECORDED. The
//     password: EVERY, BATTLE, RECORDED. In the Record: west along the bottom row, up the gap at x2 (row 9), east along
//     rows 7-8 round the shelves and the ink, up the gap at x15 (row 6), west along row 5 to the Archivist at the foot
//     of the stair (9,5); up the stair to Dr. Mog at the lectern.
(function () {
  const KP = FF7.kupomon, W = KP && KP.W;
  if (!KP || !W || KP._lq4) return;   // (once: a file loaded twice adds nothing twice)
  KP._lq4 = true;

  // ------------------------------------------------------------------ helpers
  const M = (id) => FF7.maps[id];
  const D = () => FF7.state && FF7.state.kp;
  const fl = (f) => !!(FF7.state && FF7.state.flags && FF7.state.flags[f]);
  const vr = (v) => (FF7.state && FF7.state.vars && FF7.state.vars[v]) || 0;
  const say = (who, line) => function* (s) { yield s.say(who, line); };
  const got = function* (s, id, n = 1) { KP.give(id, n); s.sfx('found'); yield s.msg(KP.got(id, n)); };
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const coins = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  // (levels on the cap of 50 written for W.team's old scale of 30: KP.LV reads them back)
  const L50 = (lv) => lv / 50 * 30;
  const addEntry = (map, name, at) => { const m = M(map); if (m) (m.entries = m.entries || {})[name] = at; };
  // before adding to another file's map: a tile still free of exits, NPCs, talk spots, items and objects (the other
  // quest files write to the same maps): the first free one of the candidates
  const freeTile = (map, x, y) => {
    const m = M(map); if (!m) return false;
    const inR = (at) => at && x >= at[0] && x < at[0] + (at[2] || 1) && y >= at[1] && y < at[1] + (at[3] || 1);
    return !((m.exits || []).some(e => inR(e.at)) || (m.npcs || []).some(n => n && n.at && n.at[0] === x && n.at[1] === y) ||
      (m.items || []).some(i => i && i.at && i.at[0] === x && i.at[1] === y) || (m.triggers || []).some(t => t && t.on === 'talk' && inR(t.at)) ||
      (m.objects || []).some(o => o && o.at && o.at[0] === x && o.at[1] === y));
  };
  const pick = (map, cands, what) => {
    const at = cands.find(([x, y]) => freeTile(map, x, y));
    if (!at) console.warn(`kp_lq_4: no free tile on ${map} for ${what}`);
    else if (at !== cands[0]) console.warn(`kp_lq_4: ${map} ${cands[0]} (${what}) was taken; using ${at}`);
    return at || cands[0];
  };
  // an NPC already on a map: its talk run through fn(s, oldTalk)
  const wrapTalk = (map, id, fn) => {
    const m = M(map), n = m && (m.npcs || []).find(x => x.id === id); if (!n) return;
    const t0 = n.talk; n.talk = function* (s) { yield* fn(s, t0); };
  };

  // ------------------------------------------------------------------ key items (the Bag's Key Items pocket)
  const WORDS = [['kp_lq_drmog_w1', 'EVERY'], ['kp_lq_drmog_w2', 'BATTLE'], ['kp_lq_drmog_w3', 'RECORDED']];
  KP.ITEMS.lq_mark_bills = { name: 'Mark Bills', kind: 'key', price: 0,
    get desc() { return `Bounty bills from Clan Kupo's board. Marks hunted: ${[1, 2, 3].filter(n => fl('kp_lq_clan_m' + n)).length} of 3.`; } };
  KP.ITEMS.lq_clan_badge = { name: 'Clan Kupo Badge', kind: 'key', price: 0, desc: "A pom-pom badge, pinned on by Moglo. Proof you're a Clan Kupo hunter, kupo." };
  KP.ITEMS.lq_postcard = { name: "Stiltzkin's Card", kind: 'key', price: 0, desc: 'An oak tree drawn in pencil. Underneath, in careful letters: SUNSET.' };
  KP.ITEMS.lq_password = { name: 'Password Scraps', kind: 'key', price: 0,
    get desc() { const w = WORDS.map(([f, t]) => fl(f) ? t : '???'); return `The locked book's password: ${w.join(' ')}. Words found: ${WORDS.filter(([f]) => fl(f)).length} of 3.`; } };

  // =================================================================================================================
  // 9. MONTBLANC: CLAN KUPO
  // =================================================================================================================
  const MOGLO = 'Moglo', MB = 'lq_montblanc';
  const MARKS = [
    { n: 1, id: 'lqclan_bogqueen', map: 'kp_route11', sp: 'bogmog_hag', name: 'the Bog Queen', at: [8, 10], alt: [[9, 10], [8, 9]], dir: 'down', bg: 'swamp', held: 'leftover_nut',
      where: "Route 11, by the witch's hut",
      rise: 'The bog bubbles. Out of the reeds rises a Bogmog the size of a hut, crowned in pondweed: the Bog Queen!',
      gone: 'The Bog Queen sinks into the mire with a sulky gurgle. A tuft of her fur is left caught on a reed.' },
    { n: 2, id: 'lqclan_dunetyrant', map: 'kp_route8', sp: 'dunemog_raider', name: 'the Dune Tyrant', at: [14, 18], alt: [[13, 18], [15, 18]], dir: 'down', bg: 'desert', held: 'lucky_pom',
      where: "under the natural arch on Route 8",
      rise: 'The shade under the arch growls. A Dunemog three times the usual size unwinds its scarf: the Dune Tyrant!',
      gone: 'The Dune Tyrant bolts off over the dunes, scarf flapping. A tuft of its fur is left on the rock.' },
    { n: 3, id: 'lqclan_summitram', map: 'kp_summit_2', sp: 'grumog_viking', name: 'the Summit Ram', at: [16, 6], alt: [[15, 6], [17, 6]], dir: 'right', bg: 'mountain', held: 'focus_pom',
      where: "the high bridge on the Summit Road",
      rise: 'The planks shudder. A colossal Grumog lowers its horned helm at you from across the bridge: the Summit Ram!',
      gone: 'The Summit Ram stamps off into the dark, and the bridge sways for a while. A tuft of its fur is snagged on a rope.' },
  ];
  const allMarks = () => MARKS.every(m => fl('kp_lq_clan_m' + m.n));
  // a mark: one huge moogle, Lv 49 +2 with a held item, one on one (no befriending, no bag: a trainer battle of one)
  MARKS.forEach(m => FF7.patchMap(m.map, { npcs: [{
    id: m.id, name: cap(m.name), model: { enemy: 'kp_' + m.sp, scale: 1.6 }, at: pick(m.map, [m.at].concat(m.alt), cap(m.name)), dir: m.dir,
    show: () => fl('kp_lq_clan_bills') && !fl('kp_lq_clan_m' + m.n),
    talk: function* (s) {
      s.emote(m.id, '!'); s.sfx('found'); s.shake(3, 30);
      yield s.msg(m.rise);
      yield s.msg(`Moglo's bill flaps in your pocket: MARK - ${m.name.toUpperCase()}. Hunt it down!`);
      const mon = KP.make(m.sp, 49, { plus: 2, held: m.held });
      const r = yield* KP.fight(s, { kind: 'trainer', foes: [mon], trainer: { name: cap(m.name), money: 0 }, bg: m.bg, ai: 'smart' });
      if (r !== 'win') return;
      s.set('kp_lq_clan_m' + m.n);
      s.remove(m.id);
      yield s.msg(m.gone);
      s.sfx('found');
      yield s.msg(`You tuck the tuft of fur into the Mark Bills. Marks hunted: ${MARKS.filter(x => fl('kp_lq_clan_m' + x.n)).length} of 3.`);
    } }] }));

  // the hall: a hunters' lodge (south), and through its north door the fenced practice yard of sand. (The lodge's
  // north wall stands free of its other walls, a pillar at each end, so it fades when it hides someone in the yard)
  const CLAN = [
    "================",
    "=sPssssssssssPs=",
    "=ssssssssssssss=",
    "=ssssssssssssss=",
    "=ssssssssssssss=",
    "=ssssssssssssss=",
    "|###w##+##w####|",
    "#..............#",
    "#..............#",
    "#.............F#",
    "#.....tttttt...#",
    "#.....tttttt...#",
    "#..............#",
    "#..............#",
    "#j............j#",
    "#..............#",
    "#######+########",
  ];
  const BILLS = [
    ['#f4ecd8', 'A scribble of something huge and damp. MARK: THE BOG QUEEN. Last seen: Route 11, by the witch\'s hut.'],
    ['#f0e4cc', 'A scribble of something with a scarf and a temper. MARK: THE DUNE TYRANT. Last seen: under the arch on Route 8.'],
    ['#ece6d8', 'A scribble of mostly horns. MARK: THE SUMMIT RAM. Last seen: the Summit Road\'s high bridge.'],
  ];
  const billModel = (i) => ({ prop: 'whiteboard', wall: true, w: 0.6, col: BILLS[i][0] });
  // Hunter Rasla, the clan's second (step 3): only once all three marks are down
  const RASLA = W.trainer({ id: 'lq_rasla', cls: 'Hunter', name: 'Rasla', at: [12, 13], dir: 'left', bg: 'town', ai: 'smart', money: 2600,
    model: { base: 'woman7', top: '#6a4a2a', bottom: '#4a3a28', jacket: '#5a3a22', hair: '#c86a2a', hairStyle: 'ponytail', extras: ['vest', 'belt', 'armguard'] },
    line: "Three marks? Lucky. Let's see you do it again, in front of the clan.",
    lose: "...Not lucky, then. Good. I'll tell Moglo.",
    after: "Moglo's got something for you. Go on, before he pins it on the wrong hunter.",
    team: [['bogmog_hag', L50(50), { held: 'leftover_nut' }], ['huntmog_trapper', L50(50), { held: 'lucky_pom' }], ['flintkin_flintlock', L50(50), { held: 'boost_ranger' }],
      ['embermog_archmage', L50(50), { held: 'focus_pom' }], ['galimog_galian', L50(50), { held: 'quick_gear' }]] });
  const raslaFight = RASLA.npc.talk;
  RASLA.npc.talk = function* (s) {
    if (fl('kp_lq_clan_done')) { yield s.say('Hunter Rasla', 'Hunter. ...Fine. You earned the word. Don\'t wear it out.'); return; }
    if (!W.beaten('lq_rasla') && !allMarks()) {
      yield s.say('Hunter Rasla', s.flag('kp_lq_clan_bills') ? 'Marks first. All three of them. Then we\'ll talk.' : "Rasla. The clan's second. New faces talk to Moglo, not me.");
      return;
    }
    yield* raslaFight(s);
    if (W.beaten('lq_rasla')) s.set('kp_lq_clan_second');
  };

  // A. The board (Moglo's first talk): three posters pinned one at a time; a red pom-pom bobs past the skylight
  function* clanBoard(s) {
    const id = 'lqclan_moglo';
    yield s.face(id, 'player');
    s.emote(id, '!');
    yield s.say(MOGLO, "A new face! Moglo, Clan Kupo's agent. Hunts, bounties and paperwork, kupo. Mostly paperwork.");
    yield s.face(id, 'up');
    for (let i = 0; i < 3; i++) {
      s.spawn('lqclan_poster' + i, billModel(i), 1 + i, 7, 'down', { hover: 0.85 });
      s.sfx('set');
      yield 18;
    }
    yield s.face(id, 'player');
    yield s.say(MOGLO, "Clan Kupo takes hunters, not tourists. Three marks off the board, then we'll talk.\fThe Bog Queen, the Dune Tyrant and the Summit Ram. Big, grumpy and very overdue, kupo.");
    yield s.say(MOGLO, 'Clan Kupo hunts what other trainers run away from. The pay is terrible. The stories are great.');
    // past the skylight, a red pom-pom
    s.spawn('lqclan_pom', { enemy: 'kp_montblanc_clan_leader', scale: 0.7 }, 4, 13, 'right', { hover: 3.3 });
    yield s.cam(7, 13, 30);
    yield s.move('lqclan_pom', 11, 13, { speed: 0.06 });
    s.remove('lqclan_pom');
    s.anim('player', 'lookup');
    yield s.emote('player', '?');
    yield 20;
    s.stopAnim('player');
    s.camFollow();
    yield s.say(MOGLO, "Ignore that. That's nobody.");
    s.set('kp_lq_clan_bills');
    yield* got(s, 'lq_mark_bills');
    yield s.say(MOGLO, "Where they turn up: Route 11 by the witch's hut, under the arch on Route 8, and the Summit Road's high bridge.\fBring a tuft of fur from each. Off you go, kupo!");
  }
  // B. The boss drops in (the badge): through the skylight onto the long table, a circle round Cloud, to the yard
  function* clanBoss(s) {
    const id = 'lqclan_moglo';
    yield s.face(id, 'player');
    yield s.say(MOGLO, 'Three marks AND Rasla? Kupo! Hold still, hold still...');
    KP.take('lq_mark_bills'); s.set('kp_lq_clan_badge'); KP.give('lq_clan_badge'); s.sfx('levelup');
    yield s.msg(`Moglo pins a pom-pom badge on ${s.name('cloud')}'s collar. Received "Clan Kupo Badge"!`);
    yield s.say(MOGLO, 'Welcome to the clan, kupo! Now. The boss wants a word. Stand in the middle of the room: he likes an audience.');
    const p = s.actor('player'), px = p && p.tx != null ? p.tx : 3, py = p && p.ty != null ? p.ty : 9;
    yield s.move('player', [[px, Math.max(py, 9)], [px, 13], [8, 13]]);
    yield s.face('player', 'up');
    s.sfx('door');
    yield s.cam(8, 11, 30);
    s.emote('player', '!'); s.emote(id, '!');
    s.show(MB, 8, 10, 'down'); s.hover(MB, 3.2);
    yield s.hover(MB, 0.36, 36);
    s.shake(1, 10); s.sfx('hop');
    for (const d of ['left', 'up', 'right', 'down']) yield s.face(MB, d);   // (a twirl)
    s.emote(MB, '♪');
    yield s.say('Montblanc', "So YOU'RE the one taking my marks! All three! Do you know how long I was saving the Dune Tyrant?");
    s.hover(MB, 0, 22);
    yield s.jump(MB, 8, 12, 0.7, 22);
    yield s.move(MB, [[9, 12], [9, 14], [7, 14], [7, 12], [8, 12]]);   // (a circle round Cloud)
    yield s.face(MB, 'player');
    yield s.say('Montblanc', "Hmm. Hmmm. Good boots. Shifty eyes. Big sword. ...You'll do.\fClan rules, kupo: the leader tests every new member. Personally. Every. Single. One.");
    yield s.say('Montblanc', 'To the yard!');
    ['lqclan_fan1', 'lqclan_fan2', 'lqclan_fan3'].forEach(f => s.show(f));
    yield s.move(MB, [[12, 12], [12, 8], [7, 8], [7, 3]], { run: true });
    yield s.face(MB, 'down');
    s.camFollow();
    yield s.say(MOGLO, "That was the boss. Montblanc. He does that. The skylight's never been the same, kupo.");
  }
  function* mogloTalk(s) {
    s.set('kp_lq_clan_open');
    if (!s.flag('kp_lq_clan_bills')) { yield* clanBoard(s); return; }
    if (!allMarks()) {
      const left = MARKS.filter(m => !fl('kp_lq_clan_m' + m.n));
      yield s.say(MOGLO, `${['One', 'Two', 'Three'][left.length - 1]} mark${left.length > 1 ? 's' : ''} still on the board, kupo:\n` + left.map(m => `${cap(m.name)}: ${m.where}.`).join('\n'));
      return;
    }
    if (!s.flag('kp_lq_clan_second')) { yield s.say(MOGLO, "Three for three! I'd sign you up right now, but Rasla wants a word first. She always wants a word. Usually it's 'no'."); return; }
    if (!s.flag('kp_lq_clan_badge')) { yield* clanBoss(s); return; }
    if (!s.flag('kp_lq_clan_done')) { yield s.say(MOGLO, "The boss is out in the yard, kupo. Don't keep him waiting. He's terrible at waiting."); return; }
    yield s.say(MOGLO, "Morning, Hunter! The board's quiet. Too quiet. I'll pin up something nasty soon, kupo.");
    // (then the boss's writs for the Kupo Ranch, sold: js/kupomon/kp_legendbreed.js)
    yield s.say(MOGLO, "Oh, and the boss signs writs for the Kupo Ranch now. Clan paperwork, kupo. Clan fees, too. Mostly fees.");
    yield* KP.legendItemShop(s, 'montblanc_clan_leader', { who: MOGLO, done: 'kp_lq_clan_done' });
  }
  // C. The yard: the clan along the fence, a purple sky, and the leader's test
  const MONT = W.legend(MB, 'montblanc_clan_leader', { at: [7, 3], dir: 'down', scaled: true, lv: 50, abil: 0, bg: 'town', music: 'weaponraid', scale: 1.2,
    done: 'kp_lq_clan_done', show: s => s.flag('kp_lq_clan_badge'),
    intro: 'Montblanc twirls his staff. The pom-pom on his head starts to crackle.',
    opening: 'Montblanc tips his hat. "Clan Kupo\'s leader, at your service... and at your throat, kupo!"',
    after: 'Montblanc dusts off his hat. "Good! Again tomorrow. Same time, same yard."',
    then: function* (s) {
      yield* got(s, 'kupo_coin');
      yield* KP.giveLegendItem(s, 'montblanc_clan_leader');   // (the first Clan Writ: js/kupomon/kp_legendbreed.js)
      yield s.say(MOGLO, "The boss? Befriended? By a NEW member? ...I'm putting that on the board, kupo. In very big letters.");
      yield s.say(MOGLO, "Oh, and if two moogles sharing one coat ever come asking for him: he's out. On a hunt. Forever.");
      yield s.msg('From now on, Clan Kupo calls you "Hunter".');
    } });
  const montTalk = MONT.talk;
  MONT.talk = function* (s) {
    if (!s.flag('kp_lq_clan_yard')) {
      s.set('kp_lq_clan_yard');
      yield s.cam(7, 3, 30);
      for (const f of ['lqclan_fan1', 'lqclan_fan2', 'lqclan_fan3']) { s.emote(f, '!'); s.sfx('hop'); yield 10; }
      yield s.say('Clan Hunter', 'Go on, boss! Show the new one the storm!');
      for (const f of ['lqclan_fan1', 'lqclan_fan2', 'lqclan_fan3']) { s.emote(f, '♪'); yield 8; }
      s.sfx('ching');
      s.flash('#8040c0', 30); s.sfx('magic'); s.shake(2, 40);
      yield s.msg('The sky over the yard turns purple. Little sparks run up and down Montblanc\'s staff.');
      yield s.say('Montblanc', "Relax, it's only a little storm. A big little storm, kupo.");
      s.camFollow();
    } else yield s.say('Montblanc', 'Back for more? Good! Same yard, same storm, kupo!');
    yield* montTalk(s);
  };
  const clanFolk = (o) => ({ id: o.id, name: o.name, model: o.model, at: o.at, dir: o.dir || 'down', wander: o.wander || 0, show: o.show,
    talk: function* (s) { yield s.say(o.name, typeof o.lines === 'function' ? o.lines(s) : o.lines); } });
  FF7.defineMap('kp_lq_clan_hall', {
    name: 'Clan Kupo Hall', area: 'Kupo Coliseum', theme: 'house', music: 'fiddle', kpBg: 'town',
    look: { floor: ['#8a6a44', '#82623e'], wall: '#7a5a3a', trim: '#3a2a1a', wallTop: '#3a2a1a', pillar: '#5a3e24', sand: ['#d8c088', '#d0b880'], wood: ['#7a5232', '#6e4a2c'],
      sky: ['#5a8ac8', '#d0dcec'], ambient: [0.52, 0.48, 0.44], light: [0.9, 0.82, 0.68], floorTex: { floor: 'planks' }, wallTex: 'boards' },
    camera: { dist: 10.5, pitch: 56 },
    grid: CLAN,
    legend: { P: 'punchbag' },
    props: [
      // the bounty board along the north wall, and the cardboard trophy heads
      { at: [2, 6], prop: 'banner', rot: 0, w: 2.9, h: 1.35, y: 2.15, col: '#a87a48', col2: '#5a3a1a', text2: 'BOUNTIES', text2Col: '#f0e0b0' },
      ...[['BEHEMOG', 12], ['MALBOMOG', 13], ['TONBERPOM', 14]].map(([t, x]) => ({ at: [x, 6], prop: 'banner', rot: 0, w: 0.8, h: 0.5, y: 2.1, col: '#c8a878', col2: '#7a5a3a', text: t, textCol: '#4a3018' })),
      { at: [14, 9], prop: 'fireplace', rot: -90, col: '#ff9040', col2: '#6a5a4a' },
      // the long table: maps and mugs; benches either side
      ...[6, 7, 8, 9, 10, 11].flatMap(x => [{ at: [x, 10], prop: 'table', style: 'planks' }, { at: [x, 11], prop: 'table', style: 'planks' }]),
      { at: [6.7, 10.2], prop: 'jar', col: '#d8d0c0', scale: 0.32, lift: 0.31 }, { at: [10.3, 11.1], prop: 'jar', col: '#c8b8a0', scale: 0.32, lift: 0.31 },
      { at: [8.2, 10.5], prop: 'disc', r: 0.45, h: 0.33, sides: 4, col: '#e8dcb8', top: '#e8dcb8', rot: 20 },
      { at: [9.6, 10.9], prop: 'disc', r: 0.35, h: 0.33, sides: 4, col: '#dcd0a8', top: '#dcd0a8', rot: -15 },
      { at: [8.5, 9.15], prop: 'bench', w: 6, rot: 0, col: '#6a4a2a' }, { at: [8.5, 11.85], prop: 'bench', w: 6, rot: 180, col: '#6a4a2a' },
      // the skylight's square of daylight on the floor
      { at: [7.5, 12.5], prop: 'disc', r: 1.0, h: 0.006, sides: 4, rot: 45, col: '#fff0c8', top: '#fff4d8' },
    ],
    labels: [{ at: [7.5, 4.6], text: 'CLAN KUPO', size: 0.32, col: '#a02838', y: 0.01 }],
    lights: [[13.5, 9, '#ffb060', 4], [7.5, 12.5, '#fff4d8', 3]],
    entries: { from_coliseum: [7, 15, 'up'] },
    exits: [{ at: [7, 16, 1, 1], to: 'kp_coliseum', entry: 'from_clan', sfx: 'door' }],
    npcs: [
      { id: 'lqclan_moglo', name: MOGLO, model: { enemy: 'kp_mogpirate_pirate', scale: 0.9 }, at: [3, 8], dir: 'down', talk: mogloTalk },
      RASLA.npc,
      MONT,
      clanFolk({ id: 'lqclan_old', name: 'Old Hunter', model: { base: 'oldman', top: '#5a4a32', bottom: '#3a3228', extras: ['beard', 'coat'] }, at: [13, 14], dir: 'left',
        lines: () => fl('kp_lq_clan_done') ? "Hunter! Sit down, sit down. Tell me about the Summit Ram again. The bit where it sneezed." :
          fl('kp_lq_clan_bills') ? "Marks don't come to you, youngster. You go to them, you look them in the eye, and you try very hard not to blink." :
            'Forty years in the clan. I hunted the Behemog on that wall with nothing but a rolling pin. ...It was a very angry rolling pin.' }),
      W.moogle('lqclan_huntmog', 'huntmog_trapper', [11, 8], { wander: 1, line: 'Huntmog: Kupo. It is sharpening a pencil as if it were a spear.' }),
      // the clan along the yard fence (from the badge on)
      clanFolk({ id: 'lqclan_fan1', name: 'Chocomog', model: { enemy: 'kp_chocomog_knight', scale: 0.8 }, at: [2, 3], dir: 'right', show: s => s.flag('kp_lq_clan_badge'),
        lines: 'Chocomog: Kweh-po! It waves a little flag with a pom-pom on it.' }),
      clanFolk({ id: 'lqclan_fan2', name: 'Clan Hunter', model: { base: 'man4', top: '#7a3a2a', bottom: '#4a3a2a', extras: ['vest', 'belt'] }, at: [13, 3], dir: 'left', show: s => s.flag('kp_lq_clan_badge'),
        lines: () => fl('kp_lq_clan_done') ? "You befriended the BOSS? I've been trying for six years. He keeps eating my nuts and walking off." : "Every new member gets the yard. Nobody's ever stayed standing. ...Well. Rasla did. Once." }),
      clanFolk({ id: 'lqclan_fan3', name: 'Kupage', model: { enemy: 'kp_kupage_mog_knight', scale: 0.8 }, at: [9, 1], dir: 'down', show: s => s.flag('kp_lq_clan_badge'),
        lines: 'Kupage: Kupo! It salutes, and its helmet falls over its eyes.' }),
    ],
    objects: [0, 1, 2].map(i => ({ id: 'lqclan_bill' + i, at: [1 + i, 7], model: billModel(i), dir: 'down', hover: 0.85, solid: true,
      if: s => s.flag('kp_lq_clan_bills') && !s.flag('kp_lq_clan_badge'),
      talk: function* (s) { yield s.msg(BILLS[i][1] + (fl('kp_lq_clan_m' + (i + 1)) ? '\fAcross it, in Moglo\'s writing: HUNTED.' : '')); } })),
    items: [W.item('lqclan_yard', [14, 5], 'royal_nut', 2)],
    triggers: [
      W.sign([14, 9], 'A crackling fire. A pair of very small boots is drying in front of it.'),
      { at: [6, 10, 6, 2], on: 'talk', run: function* (s) { yield s.msg("Maps of every route in the isles, pinned down with mugs. Someone has circled the Summit Road and written \"NOPE\" next to it."); } },
    ],
    onEnter: function* (s) { if (!s.flag('kp_lq_clan_open')) s.set('kp_lq_clan_open'); },
  });
  KP.legendSeller('montblanc_clan_leader', 'kp_lq_clan_hall', 'lqclan_moglo');

  // the Coliseum: the board by the Champions' Rest, and the hall's door cut into its front (the facade tile east of
  // the hotel's door), open from the Gold League on
  {
    const co = M('kp_coliseum'), row = co && co.grid[18];
    if (row && row[8] === 'h' && freeTile('kp_coliseum', 8, 18) && freeTile('kp_coliseum', 8, 19)) co.grid[18] = row.slice(0, 8) + '+' + row.slice(9);
    else console.warn('kp_lq_4: the Coliseum tile 8,18 (the Clan Kupo Hall door) is not the hotel wall it was');
    addEntry('kp_coliseum', 'from_clan', [8, 19, 'down']);
    if (co) (co.labels = co.labels || []).push({ at: [8, 18], face: 's', text: 'CLAN KUPO', size: 0.09, col: '#a02838', y: 1.98 });
    if (co) (co.props = co.props || []).push({ at: [9, 18], prop: 'banner', rot: 0, w: 0.55, h: 1.1, y: 2.5, col: '#a02838', col2: '#e8c040', text: 'KUPO', textCol: '#f8e8c0', size: 0.09 });   // (the clan's pennant)
    FF7.patchMap('kp_coliseum', {
      exits: [{ at: [8, 18, 1, 1], to: 'kp_lq_clan_hall', entry: 'from_coliseum', sfx: 'door', if: s => s.flag('kp_league_1'),
        blocked: function* (s) { yield s.msg("A sturdy door beside the Champions' Rest, with a little sign: CLAN KUPO. HUNTERS ONLY.\fIt's locked. From the other side, someone is singing about a Behemog."); } }],
      objects: [{ id: 'lqclan_board', at: pick('kp_coliseum', [[11, 19], [12, 19], [11, 20]], 'the Clan Kupo board'), model: { prop: 'sign', text: 'CLAN KUPO', col: '#c8a070', scale: 1.5 }, dir: 'down', solid: true, if: s => s.flag('kp_league_1'),   // (a tile clear of the hotel's wall: it sank into it, the user, 2026-10-03)
        talk: function* (s) {
          s.set('kp_lq_clan_open');
          yield s.msg('A notice board by the Champions\' Rest:\f"CLAN KUPO IS HIRING. Hunters only. Ask inside, kupo."\fSomeone has drawn a pom-pom in the corner. It\'s a very good pom-pom.');
        } }],
      npcs: [clanFolk({ id: 'lqclan_co_hunter', name: 'Clan Hunter', model: { base: 'man6', top: '#5a3a2a', bottom: '#3a3228', hairStyle: 'cap', extras: ['vest'] }, at: pick('kp_coliseum', [[3, 20], [3, 21], [4, 20]], 'a clan hunter'), dir: 'right',
        show: s => s.flag('kp_lq_clan_done'), lines: "Morning, Hunter! The boss says you're the only one who ever made him say 'ow'. He seemed pleased about it." })],
    });
  }

  // =================================================================================================================
  // 10. STILTZKIN: THE LONG WALK
  // =================================================================================================================
  const STILT = 'Stiltzkin', STILT_SP = 'stiltzkin_globetrotter';
  // one town a day (KP.clock().day, Sunday 0): where he stands, which way, and the road he strolls off along (he walks
  // in along it backwards on the first meeting)
  const TOWNS = [
    { day: 0, map: 'kp_bloomhaven', name: 'Bloomhaven', place: 'by the church steps', at: [9, 6], alt: [[10, 6], [9, 5]], dir: 'down', path: [[8, 6], [8, 16]] },
    { day: 1, map: 'kp_mogridge', name: 'Mogridge', place: 'in the market square', at: [28, 9], alt: [[27, 9], [28, 10]], dir: 'down', path: [[28, 13], [38, 13]] },
    { day: 2, map: 'kp_kurotsuki', name: 'Kurotsuki', place: 'on the tea house porch', at: [13, 15], alt: [[13, 16], [14, 16]], dir: 'down', path: [[13, 17], [19, 17], [19, 20]] },
    { day: 3, map: 'kp_fernwick', name: 'Fernwick', place: 'out on the west deck', at: [7, 11], alt: [[6, 11], [7, 12]], dir: 'down', path: [[7, 8], [1, 8]] },
    { day: 4, map: 'kp_cogsworth', name: 'Cogsworth', place: 'up in the mine yard', at: [27, 4], alt: [[26, 4], [28, 4]], dir: 'down', path: [[27, 8], [12, 8]] },
    { day: 5, map: 'kp_sandsea', name: 'Sandsea', place: 'by the oasis', at: [13, 16], alt: [[12, 16], [13, 15]], dir: 'right', path: [[13, 18], [3, 18]] },
    { day: 6, map: 'kp_skyport', name: 'Skyport', place: 'by the hangars', at: [26, 13], alt: [[27, 13], [26, 14]], dir: 'down', path: [[26, 16], [31, 16], [31, 8]] },
  ].map(t => Object.assign(t, { npc: 'lqstilt_' + t.map.replace(/^kp_/, ''), at: pick(t.map, [t.at].concat(t.alt), 'Stiltzkin') }));
  const BUNDLES = [
    { name: "Traveller's Bundle", price: 3333, items: [['royal_nut', 3], ['max_oil', 3]], blurb: '3 Royal Kupo Nuts and 3 Max Oils' },
    { name: "Wayfarer's Bundle", price: 4444, items: [['familiar_nut', 4], ['quick_gear', 1], ['battery', 4]], blurb: '4 Familiar Nuts, a Quick Gear and 4 Spare Batteries' },
    { name: "Globetrotter's Bundle", price: 5555, items: [['fancy_nut', 5], ['hermes_sandals', 1]], blurb: '5 Fancy Nuts and a pair of Hermes Sandals' },
  ];
  const stiltBought = () => [1, 2, 3].filter(i => fl('kp_lq_stilt_b' + i)).length;
  const stiltIn = (map) => [1, 2, 3].some(i => vr('kp_lq_stilt_where' + i) === map);
  const townToday = () => TOWNS[KP.clock().day] || TOWNS[0];
  // he's in this town now: after the League, bundles left to sell, his town today, not one he's sold in, not met today
  const stiltHere = (map) => fl('kp_champion') && !fl('kp_lq_stilt_b3') && townToday().map === map && !stiltIn(map) && vr('kp_lq_stilt_last') !== KP.clock().date;
  const evening = () => { const h = KP.clock().hour; return h >= 17 && h <= 20; };

  // A. A customer! (the first meeting, on entering the town): in along the road, the pack dropped with a thump
  const stiltArrive = (T) => function* (s) {
    if (!stiltHere(T.map) || fl('kp_lq_stilt_b1') || vr('kp_lq_stilt_seen') === KP.clock().date) return;
    const a = s.actor(T.npc); if (!a || !a.visible || !s.field || !s.field.P) return;
    s.setVar('kp_lq_stilt_seen', KP.clock().date);
    s.set('kp_lq_stilt_open');
    const from = T.path[T.path.length - 1], inward = T.path.slice(0, -1).reverse().concat([T.at]);
    s.place(T.npc, from[0], from[1]);
    yield s.cam(T.at[0], T.at[1], 30);
    yield s.move(T.npc, inward);
    yield s.face(T.npc, T.dir);
    s.shake(1, 14); s.sfx('set');
    yield s.msg('Thump! A moogle drops an enormous backpack and mops his brow.');
    s.emote(T.npc, '!');
    yield 20;
    yield s.say(STILT, "Kupo! A customer! I'm only in town for the day, so it's now or never. Mostly never.");
    s.camFollow();
  };
  // a bundle (B. the postcard comes with the third)
  const stiltShop = (T) => function* (s) {
    s.set('kp_lq_stilt_open');
    const k = Math.min(2, stiltBought()), B = BUNDLES[k], d = D();
    yield s.face(T.npc, 'player');
    yield s.say(STILT, [
      "Today's special, kupo! Hand-picked, back-carried, and only a little bit squashed.",
      "You again! Small isles, kupo. I'd say it's fate, but fate doesn't usually carry coins. Today's special:",
      "Third time, kupo! A moogle could get used to a face like yours. Today's special, and it's a big one:"][k]);
    const c = yield s.ask(STILT, `The ${B.name}: ${B.blurb}. ${coins(B.price)} coins!`, ['Buy it', 'No thanks']);
    if (c !== 0) { yield s.say(STILT, "Suit yourself! I'm here till sundown. Then I'm somewhere else, kupo."); return; }
    if (!d || d.money < B.price) { yield s.say(STILT, `Kupo... that isn't ${coins(B.price)} coins. I can count. I'm a merchant! I'll be here till sundown.`); return; }
    d.money -= B.price; s.sfx('purchase');
    for (const [id, n] of B.items) { KP.give(id, n); yield s.msg(KP.got(id, n)); }
    s.set('kp_lq_stilt_b' + (k + 1)); s.setVar('kp_lq_stilt_where' + (k + 1), T.map); s.setVar('kp_lq_stilt_last', KP.clock().date);
    if (k === 0) yield s.say(STILT, 'Pleasure doing business! Same time next week? Different town. Different price. Higher, kupo!');
    else if (k === 1) yield s.say(STILT, 'Two down! Spend those wisely. I never do. That\'s why the prices keep going up, kupo.');
    else {
      // B. The postcard: he doesn't open the pack this time; he looks up at the sky
      s.anim(T.npc, 'lookup');
      yield 30;
      yield s.say(STILT, "I've walked every road on these isles but one. The first. Funny, isn't it? Nobody looks at the first road. They're always looking down the next one.");
      s.stopAnim(T.npc);
      yield s.say(STILT, 'Here. A postcard. Meet me there when the sun goes down. Bring your best, kupo.');
      s.set('kp_lq_stilt_card');
      yield* got(s, 'lq_postcard');
      yield s.msg('An oak tree, drawn in pencil. Underneath, in careful letters: SUNSET.');
    }
    // he shoulders the pack and strolls off the way he came
    yield s.move(T.npc, T.path);
    s.remove(T.npc);
  };
  TOWNS.forEach(T => FF7.patchMap(T.map, {
    npcs: [{ id: T.npc, name: STILT, model: { enemy: 'kp_' + STILT_SP, scale: 0.95 }, at: T.at, dir: T.dir, show: () => stiltHere(T.map), talk: stiltShop(T) }],
    // once he's sold in a town he's gone from it: a note on a post
    objects: [{ id: T.npc + '_note', at: T.at, model: { prop: 'sign', text: 'MOVED ON', col: '#c8a870' }, dir: 'down', solid: true, if: () => stiltIn(T.map) && !fl('kp_lq_stilt_done'),
      talk: function* (s) { yield s.msg('A note is tacked to the post: "Moved on. Back next week, kupo! - S."'); } }],
    onEnter: stiltArrive(T),
  }));
  // the rumour: the Ace Trainers in the Mog Centers have met him (their first talk of the day names today's town)
  function* stiltRumour(s, who) {
    if (fl('kp_lq_stilt_done')) { yield s.say(who, "A moogle with a huge backpack was asking after you. Said to tell you the kettle's on. Whatever that means."); return; }
    s.set('kp_lq_stilt_open');
    if (fl('kp_lq_stilt_card')) { yield s.say(who, 'That backpack moogle? He passed through and said to remind you: the first road, when the sun goes down. Then he winked. With his whole backpack.'); return; }
    const T = townToday();
    yield s.say(who, stiltHere(T.map) ? `Have you met him? A moogle with an enormous backpack! He sold me three nuts for the price of four. I was thrilled.\fHe's in ${T.name} today, ${T.place}. Only for the day, mind!`
      : `That moogle with the enormous backpack? He was in ${T.name} today, but he's already moved on. A different town every day, kupo.`);
  }
  // (after the quest the Coliseum's Ace Trainer keeps the Road Maps he left behind, and sells them as he asked: the
  // Kupo Ranch takes one for a Stiltzkin egg, js/kupomon/kp_legendbreed.js)
  const STILT_SELLER = ['kp_coliseum_center', 'coc_trainer'];
  [['kp_coliseum_center', 'coc_trainer'], ['kp_costa_center', 'cdc_trainer'], ['kp_bloomhaven_center', 'bhc_trainer']].forEach(([map, id]) => wrapTalk(map, id, function* (s, t0) {
    const heard = 'kp_lq_stilt_heard_' + id;
    if (s.flag('kp_champion') && vr(heard) !== KP.clock().date) { s.setVar(heard, KP.clock().date); yield* stiltRumour(s, 'Ace Trainer'); }
    else if (t0) yield* t0(s);
    if (id !== STILT_SELLER[1] || !fl('kp_lq_stilt_done')) return;
    yield s.say('Ace Trainer', "That backpack moogle left a stack of maps with me. For you. He said to charge you for them, though. He was very firm about that.");
    yield* KP.legendItemShop(s, STILT_SP, { who: 'Ace Trainer', done: 'kp_lq_stilt_done' });
  }));
  KP.legendSeller(STILT_SP, STILT_SELLER[0], STILT_SELLER[1]);

  // C. Sunset under the Old Oak (Route 1, 17:00-20:59): the riddle, then the last stop
  const OAK = W.legend('lq_stiltzkin', STILT_SP, { at: [18, 10], dir: 'right', scaled: true, lv: 45, abil: 0, bg: 'grass', music: 'weaponraid', scale: 1.1,
    done: 'kp_lq_stilt_done', show: () => fl('kp_lq_stilt_card') && evening(),
    intro: 'Stiltzkin plants his walking stick in the grass. The little fire pops.',
    opening: 'Stiltzkin tightens his pack straps. "Last stop, kupo! Mind the walking stick."',
    after: 'Stiltzkin dusts himself off and waves. "Same time tomorrow, kupo? I\'ll put the kettle on."',
    then: function* (s) {
      KP.give('roast_nut', 5); s.sfx('found');
      yield s.msg('In the pack left by the fire: 5 Slow-Roast Nuts, and a note.\f"For the road. Not this road. The next one."');
      yield* KP.giveLegendItem(s, STILT_SP);   // (and under the nuts, the first Road Map: js/kupomon/kp_legendbreed.js)
    } });
  const oakTalk = OAK.talk;
  OAK.talk = function* (s) {
    if (!s.flag('kp_lq_stilt_quiz')) {
      yield s.msg('An orange sky, long shadows. Under the Old Oak, Stiltzkin sits by a tiny fire, his pack open and a kettle on.');
      yield s.face('lq_stiltzkin', 'player');
      s.emote('lq_stiltzkin', '♪');
      yield s.say(STILT, 'Kupo! You came! I knew you would. Before we start, a little test.');
      const where = [1, 2, 3].map(i => vr('kp_lq_stilt_where' + i)).map(m => TOWNS.find(t => t.map === m)).filter(Boolean);
      const opts = (where.length === 3 ? where : TOWNS.slice(1, 4)).map(t => t.name).sort();
      const right = (TOWNS.find(t => t.map === vr('kp_lq_stilt_where2')) || {}).name;
      const c = yield s.ask(STILT, 'Where did I sell you my second bundle?', opts);
      if (opts[c] !== right) { s.sfx('error'); yield s.say(STILT, "Hm! You'd make a terrible travel writer. Think again, kupo."); return; }
      s.set('kp_lq_stilt_quiz'); s.sfx('ching');
      yield s.say(STILT, 'Right you are! You were paying attention. Most customers only look at the price.');
    }
    yield s.msg('Stiltzkin stands, shoulders the pack and leans on his stick.');
    yield s.say(STILT, "Every journey ends where it started. Mine too, kupo. Let's see how far you've come.");
    yield* oakTalk(s);
  };
  // Route 1 takes an evening look from 17:00 to 20:59 (the live theme of its loaded scene: sky, fog and light)
  const EVENING = { sky: ['#d86a3a', '#f6c070'], fog: { color: [0.86, 0.56, 0.4], near: 12, far: 30 }, light: [1.0, 0.72, 0.5], ambient: [0.5, 0.4, 0.38], lightDir: [-0.85, -0.42, -0.2] };
  FF7.patchMap('kp_route1', {
    npcs: [OAK],
    objects: [{ id: 'lqstilt_fire', at: [19, 10], model: { prop: 'campfire', size: 0.6, col2: '#6a6058' }, solid: true, if: () => fl('kp_lq_stilt_card') && !fl('kp_lq_stilt_done') && evening(),
      talk: function* (s) { yield s.msg('A tiny fire with a kettle humming on it. It smells of tea and long roads.'); } }],
    onLoad: function (s) {
      const th = s && s.field && s.field.geo && s.field.geo.th; if (!th) return;
      if (!th._lqDay) th._lqDay = { sky: th.sky, fog: th.fog, light: th.light, ambient: th.ambient, lightDir: th.lightDir };
      Object.assign(th, evening() ? EVENING : th._lqDay);
    },
  });

  // =================================================================================================================
  // 11. DR. MOG: THE LOCKED RECORD
  // =================================================================================================================
  const MOUTH = 'Brass Mouth';
  const PASS = [['ANY', 'EVERY', 'NO'], ['MOOGLE', 'LETTER', 'BATTLE'], ['FORGOTTEN', 'RECORDED', 'DELIVERED']];
  const wordsFound = () => WORDS.filter(([f]) => fl(f)).length;
  // Dr. Mog's notes, read from the open Record once he's befriended: a type match-up (from the chart itself) or a tip
  const NOTES = [
    "Footnote 4: a held Leftover Nut nibbles back a little HP every turn. Delicious AND educational.",
    "Chapter 9: a move with no cooldown is never wasted. A moogle with four big moves is a moogle that naps a lot.",
    "Appendix C: every '+' from the Kupo Ranch adds 4% to every stat. Plus, plus, plus. It adds up, kupo.",
    "Erratum: a wild moogle that went down asleep or poisoned is HUNGRIER for Kupo Nuts. Earlier editions said 'angrier'.",
    "Lecture 12: a trainer's battle allows no bag items. Held items, however, are always welcome in my classroom.",
  ];
  const drNote = () => {
    const T = KP.TYPES || [], pairs = [];
    for (const a of T) for (const b of T) { const e = KP.eff ? KP.eff(a, b) : 1; if (e >= 2 || e === 0) pairs.push([a, b, e]); }
    if (pairs.length && Math.random() < 0.6) {
      const [a, b, e] = pairs[Math.floor(Math.random() * pairs.length)], N = KP.TYPE_NAMES || {};
      return e === 0 ? `A margin note, underlined twice: ${N[a] || a} moves can't touch ${N[b] || b} moogles at all. Not even a little.` : `A margin note, underlined twice: ${N[a] || a} moves hit ${N[b] || b} moogles twice as hard.`;
    }
    return NOTES[Math.floor(Math.random() * NOTES.length)];
  };
  // B. Into the page (the password right, or the open Record again): the book flies off the shelf, white light
  function* intoBook(s, first) {
    const B = 'lqdrmog_book';
    s.sfx('chest');
    yield s.msg(first ? 'Click! The brass clasp springs open, and the book jumps off the shelf.' : 'The Record flutters off its shelf.');
    s.spawn(B, { prop: 'crate', col: '#6a2a3a', flat: true, scale: 0.4 }, SHELF_AT[0], SHELF_AT[1], 'left', { hover: 0.8 });
    yield s.hover(B, 1.7, 30);
    s.sfx('typing'); s.emote(B, '...');
    yield 24;
    s.sfx('typing'); s.emote('player', '!');
    yield 16;
    s.flash('#ffffff', 20);
    yield s.fadeOut(30, '#ffffff');
    yield s.goto('kp_lq_drmog_record', 'from_book');
    yield s.say('A Voice', first ? 'Visitor! Wipe your feet. Mind the footnotes.' : 'Back again? Wipe your feet. The footnotes remember you.');
  }
  // A. A book with a mouth (the lab's right-hand shelf)
  function* shelfTalk(s) {
    if (!s.flag('kp_champion')) {
      yield s.msg("The right-hand shelf: 'Pom-Pom Aerodynamics', 'Moogles and You', 'Moogles and You 2: Still Moogles'.\fOne very thick book is fastened shut with a brass clasp.");
      return;
    }
    if (s.flag('kp_lq_drmog_done')) {
      yield s.msg('The Record lies open on the shelf. Today it says:\f' + drNote());
      // (then the brass mouth sells its keys, for the Kupo Ranch: js/kupomon/kp_legendbreed.js)
      yield s.say(MOUTH, 'A key, kupo? Each one opens one more page of the Record. Not cheap. Knowledge never is.');
      yield* KP.legendItemShop(s, 'drmog_record_keeper', { who: MOUTH, done: 'kp_lq_drmog_done' });
      return;
    }
    if (s.flag('kp_lq_drmog_pass')) {
      const c = yield s.ask(null, 'The Record lies open on its shelf, its pages stirring. Step inside?', ['Step inside', 'Not now']);
      if (c === 0) yield* intoBook(s, false);
      return;
    }
    if (!s.flag('kp_lq_drmog_open')) {
      s.shake(1, 16); s.sfx('hit');
      yield s.msg('One very thick book on the shelf wriggles. Its brass clasp has a little brass mouth.');
      const c = yield s.ask(MOUTH, 'Password, kupo?', ['Kupo?', 'Open sesame?']);
      yield s.say(MOUTH, c === 0 ? 'Nice try.' : 'Nice try. Wrong story.');
      yield s.msg("A note is pinned beside it, in Prof. Sith's writing:\f\"My old teacher's book. He hid the password in libraries. Three of them. He was like that.\"");
      s.set('kp_lq_drmog_open');
      yield* got(s, 'lq_password');
      yield s.msg("Libraries... Elder Oakley in Fernwick keeps a shelf. The Sandsea bazaar sells books. And that gloomy mansion in Ravenmoor must hide a few.");
      return;
    }
    const n = wordsFound();
    if (n < 3) {
      yield s.say(MOUTH, 'Password, kupo?');
      yield s.msg(n ? `You only have ${n} of the three words. The brass mouth waits, very smugly.` : "You don't know a single word of it yet. The brass mouth looks almost sorry for you.");
      return;
    }
    yield s.say(MOUTH, 'Password, kupo? One word at a time. Slowly. I bruise easily.');
    for (let i = 0; i < 3; i++) {
      const c = yield s.ask(MOUTH, ['First word?', 'Second word?', 'Last word?'][i], PASS[i]);
      if (PASS[i][c] !== WORDS[i][1]) { s.sfx('error'); s.shake(1, 10); yield s.say(MOUTH, 'Wrong, kupo. Have you tried reading?'); return; }
      s.sfx('set');
    }
    s.set('kp_lq_drmog_pass');
    yield* intoBook(s, true);
  }
  const SHELF_AT = pick('kp_lab', [[12, 5], [12, 6], [12, 7]], "the lab's right-hand shelf");
  FF7.patchMap('kp_lab', { npcs: [{ id: 'lqdrmog_shelf', name: 'Bookshelf', model: { prop: 'bookshelf', col: '#5a3a24' }, at: SHELF_AT, dir: 'left', faceOnTalk: false, talk: shelfTalk }] });
  KP.legendSeller('drmog_record_keeper', 'kp_lab', 'lqdrmog_shelf');   // (the brass mouth: the Record itself can't be entered again)
  addEntry('kp_lab', 'from_record', [SHELF_AT[0] - 1, SHELF_AT[1], 'left']);
  // (the runner's way into the Record: a travel link, the shelf's "Step inside")
  { const lab = M('kp_lab'); if (lab) (lab.links = lab.links || []).push({ to: 'kp_lq_drmog_record', npc: 'lqdrmog_shelf', choose: 'Step inside', if: () => fl('kp_lq_drmog_pass') && !fl('kp_lq_drmog_done') }); }
  // the three books: one word each, underlined in red ink
  const book = (flag, word, plain, find) => function* (s) {
    if (!s.flag('kp_lq_drmog_open')) { yield s.msg(plain); return; }
    if (s.flag(flag)) { yield s.msg(`The red ink still says: ${word}.`); return; }
    s.set(flag); s.sfx('found');
    yield s.msg(find + `\fYou copy it onto the Password Scraps. Words found: ${wordsFound()} of 3.`);
  };
  const BOOK1 = pick('kp_fernwick_elder', [[1, 1], [2, 3]], "Elder Oakley's shelf"), BOOK2 = pick('kp_sandsea_bazaar', [[16, 3], [16, 4], [16, 5]], 'the bookstall'),
    BOOK3 = pick('kp_raven_dojo_2', [[7, 10], [8, 10]], 'the mansion library');
  FF7.patchMap('kp_fernwick_elder', { triggers: [{ at: BOOK1, on: 'talk', run: book('kp_lq_drmog_w1', 'EVERY',
    "Elder Oakley's shelf: 'Trees I Have Known', 'More Trees I Have Known', and a slim volume, 'Moogles Who Kept Everything'.",
    "'Moogles Who Kept Everything'. Halfway through, one word is underlined in red ink: EVERY.\fElder Oakley: \"Ah, that one. A professor's cat borrowed it once. Brought it back with ink on it.\"") }] });
  FF7.patchMap('kp_sandsea_bazaar', { objects: [{ id: 'lqdrmog_bookstall', at: BOOK2, model: { prop: 'bookshelf', col: '#8a5a32' }, dir: 'left', solid: true,
    talk: book('kp_lq_drmog_w2', 'BATTLE',
      "A bookstall: almanacs, phrasebooks and 'A Map-Seller's Atlas of the Isles'. A sign: BROWSING FREE. BUYING ALSO FREE. PLEASE BUY.",
      "'A Map-Seller's Atlas of the Isles'. A pressed petal marks a page. Under it, one word is underlined in red ink: BATTLE.") }] });
  FF7.patchMap('kp_raven_dojo_2', { triggers: [{ at: BOOK3, on: 'talk', run: book('kp_lq_drmog_w3', 'RECORDED',
    'Dusty books on clocks, curses and the correct temperature for tea.',
    "'An Index of Lost Things'. You turn to the very last page. One word is underlined in red ink: RECORDED.") }] });

  // the Record: a library inside the book. A paper floor ruled in faint blue, shelves floating at a tilt, standing pages
  // for arches, ink puddles; the dais at the north with the lectern and the blackboard
  const REC = [
    "##################",
    "#k.|kkBBBBBBkk|.k#",
    "#...k______L_k...#",
    "#~..k________k..~#",
    "#...=====^====...#",
    "#.k.............k#",
    "#k|kkkk|kkkkk|k.k#",
    "#..~.....k....~..#",
    "#.....~.....|....#",
    "#k.kkk|kkkk|kkkkk#",
    "#.......k....~...#",
    "#..~..|.......|..#",
    "#~..............~#",
    "#########+########",
  ];
  const tilt = (x, y) => { const s0 = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s0 - Math.floor(s0); };
  const recProps = [];
  REC.forEach((row, y) => { for (let x = 0; x < row.length; x++) {
    if (row[x] === 'k' && y >= 5) recProps.push({ at: [x, y], prop: 'bookshelf', rot: Math.round((tilt(x, y) - 0.5) * 30), lift: 0.12 + tilt(y, x) * 0.25, col: ['#7a3a3a', '#3a4a7a', '#4a6a3a'][(x + y) % 3] });
    if (row[x] === '|') recProps.push({ at: [x, y], prop: 'banner', w: 0.85, h: 2.1, y: 2.25, col: '#fbf8ee', col2: '#c8d0e0', rot: Math.round((tilt(x, y) - 0.5) * 40) });
  } });
  for (let r = 4; r < 12; r++) recProps.push({ at: [0.6, r + 0.5], to: [16.4, r + 0.5], prop: 'string', h: 0.012, h2: 0.012, sag: 0, r: 0.008, count: 1, col: '#9ab8e8' });
  recProps.push({ at: [2.5, 4.6], to: [2.5, 12.4], prop: 'string', h: 0.014, h2: 0.014, sag: 0, r: 0.009, count: 1, col: '#e08080' });
  recProps.push({ at: [8.5, 1], prop: 'whiteboard', w: 5.2, col: '#24382c' }, { at: [11, 2], prop: 'console', style: 'desk', w: 1, col: '#6a4a2a', col2: '#f4f0e0' });
  const ARCH = W.trainer({ id: 'lq_archivist', name: 'The Archivist', at: [9, 5], dir: 'right', sight: [10, 5, 5, 1], bg: 'lab', ai: 'smart', money: 2200,
    model: { base: 'man15', top: '#d8c8a0', jacket: '#7a5a8a', bottom: '#4a4a52', extras: ['glasses'] },
    show: () => !W.beaten('lq_archivist'),
    line: 'Shh! This is a library. ...You may battle. You may not shush back.',
    lose: 'Overdue. Very, very overdue.',
    after: "Dr. Mog is at the lectern. There's no door to knock on. Cough politely.",
    team: [['tomekin_scholar', L50(46), { held: 'leftover_nut' }], ['mathmog_arithmetician', L50(46), { held: 'quick_gear' }], ['relikin_archaeologist', L50(46), { held: 'focus_pom' }],
      ['orbmog_seer', L50(47), { held: 'boost_timemage' }], ['redpom_sage', L50(47), { held: 'lucky_pom' }]] });
  const archFight = ARCH.npc.talk;
  const archTalk = function* (s) {
    yield* archFight(s);
    if (!W.beaten('lq_archivist') || s.flag('kp_lq_drmog_archivist')) return;
    s.set('kp_lq_drmog_archivist');
    yield s.say('The Archivist', "Fine. FINE. The stair is yours. Dr. Mog is at the lectern. There's no door to knock on, so cough politely.");
    yield s.move('lq_archivist', 8, 5);
    yield s.face('lq_archivist', 'right');
  };
  ARCH.npc.talk = archTalk; ARCH.trig.run = archTalk;
  // C. Class is in session: the blackboard, Cloud's team graded on it
  const grade = (m) => { const v = m.lv + 3 * (m.plus || 0); return v >= 62 ? 'A+' : v >= 56 ? 'A' : v >= 50 ? 'B+' : v >= 46 ? 'B' : v >= 40 ? 'C+' : 'C'; };
  const DRMOG = W.legend('lq_drmog', 'drmog_record_keeper', { at: [8, 2], dir: 'up', scaled: true, lv: 45, abil: 0, bg: 'lab', music: 'weaponraid', scale: 1.1,
    done: 'kp_lq_drmog_done',
    intro: 'Dr. Mog snaps his chalk in two. Very deliberately.',
    opening: 'Dr. Mog taps the board. "Question one: can you beat me? Show your working, kupo."',
    after: 'Dr. Mog marks your paper "See me" and vanishes between the pages. Open the book again to resit.',
    then: function* (s) {
      yield* got(s, 'royal_nut', 3);
      yield* KP.giveLegendItem(s, 'drmog_record_keeper');   // (the first Record Key: js/kupomon/kp_legendbreed.js)
      yield s.msg("The pages around you settle. From now on the Record will lie open on Prof. Sith's shelf: read it for Dr. Mog's notes.");
    } });
  const drTalk = DRMOG.talk;
  DRMOG.talk = function* (s) {
    if (!s.flag('kp_lq_drmog_class')) {
      s.set('kp_lq_drmog_class');
      yield s.msg('Dr. Mog is writing on the blackboard, very fast, in very small letters.');
      yield s.face('lq_drmog', 'player');
      s.emote('lq_drmog', '!');
      yield s.say('Dr. Mog', "A visitor! Do sit. Class is in session. Today's lesson: you.");
      yield s.cam(8, 1, 30);
      const P = (D() && D().party) || [], lines = P.map(m => `${KP.name(m)} (${KP.jobName(m)}): ${grade(m)}`);
      yield s.msg('He taps the board. Your team is on it, with grades:\n' + (lines.slice(0, 3).join('\n') || '(nobody)') + (lines.length > 3 ? '\f' + lines.slice(3).join('\n') : ''));
      s.camFollow();
      yield s.say('Dr. Mog', "Hmm. B-minus. Class average. Let's see you raise it.");
    } else yield s.say('Dr. Mog', 'Ah, the resit. Pencils ready. No talking at the back, kupo.');
    yield* drTalk(s);
  };
  FF7.defineMap('kp_lq_drmog_record', {
    name: 'The Record', area: 'Pomville', theme: 'lab', music: 'cosmo', kpBg: 'lab',
    look: { floor: ['#f6f4ec', '#f0eee4'], floor3: ['#e4dcc4', '#e0d8c0'], wall: '#ece8dc', wallTop: '#c8c2b2', trim: '#9ab0d0', water: '#15151f', sky: ['#cfd6e4', '#f2f0e8'],
      ambient: [0.62, 0.62, 0.64], light: [0.92, 0.9, 0.86], fog: null, floorTex: { floor: false, floor3: 'carpet' }, wallTex: false, pillar: '#fbf8ee' },
    grid: REC,
    heights: [
      "000000000000000000",
      "000022222222220000",
      "000022222222220000",
      "000022222222220000",
      "000022222122220000",
      "000000000000000000",
      "000000000000000000",
      "000000000000000000",
      "000000000000000000",
      "000000000000000000",
      "000000000000000000",
      "000000000000000000",
      "000000000000000000",
      "000000000000000000",
    ],
    legend: { B: 'block', L: 'block' },
    props: recProps,
    lights: [[9, 2, '#fff8e0', 4], [9, 11, '#e8f0ff', 5]],
    entries: { from_book: [9, 12, 'up'] },
    exits: [{ at: [9, 13, 1, 1], to: 'kp_lab', entry: 'from_record', sfx: 'door' }],
    npcs: [ARCH.npc,
      { id: 'lq_archivist_after', name: 'The Archivist', model: { base: 'man15', top: '#d8c8a0', jacket: '#7a5a8a', bottom: '#4a4a52', extras: ['glasses'] }, at: [8, 5], dir: 'right',
        show: () => W.beaten('lq_archivist'), talk: say('The Archivist', "Shh. ...Oh, it's you. Dr. Mog says your homework is late. You didn't know you had homework. Nobody ever does.") },
      DRMOG],
    triggers: [ARCH.trig,
      { at: [6, 1, 6, 1], on: 'talk', run: function* (s) { yield s.msg(fl('kp_lq_drmog_done') ? 'The blackboard: HOMEWORK - NONE. CLASS DISMISSED. Someone has drawn a little monocle in the corner.' : 'The blackboard is covered in very small writing: every battle ever fought on the isles, in order. Yours are near the bottom.'); } },
      { at: [11, 2], on: 'talk', run: function* (s) { yield s.msg("A book on the lectern: the Record itself, open somewhere in the middle. You're inside it. Try not to think about that."); } },
    ],
  });

  // =================================================================================================================
  // the Demo (js/kupomon/kp_runner.js O.kp_quests): each quest, in the plan's words
  // =================================================================================================================
  const win = (flag, train, ...steps) => ['kp_win', steps, flag, train && typeof train === 'object' ? train : { train }];
  // Stiltzkin's days (the Demo sets KP._clock): the next town he hasn't sold in, nearest Pomville first, on its next
  // weekday after the last meeting; the coins for the bundle first (the tournaments, as the Demo earns them)
  const PREFER = ['kp_mogridge', 'kp_kurotsuki', 'kp_fernwick', 'kp_cogsworth', 'kp_bloomhaven', 'kp_sandsea', 'kp_skyport'];
  const stiltBuy = (k) => ['js', function* (api, R) {
    const used = [1, 2, 3].map(i => vr('kp_lq_stilt_where' + i)).filter(Boolean), last = String(vr('kp_lq_stilt_last') || '2089-12-31');
    const T = TOWNS.find(t => t.map === PREFER.find(m => !used.includes(m)));
    if (!T) return 'stiltzkin: no town left';
    let date = null;
    for (let i = 0; i < 400 && !date; i++) { const t = Date.UTC(2090, 0, 1) + i * 86400000, ds = new Date(t).toISOString().slice(0, 10); if (ds > last && new Date(t).getUTCDay() === T.day) date = ds; }
    KP._clock = { day: T.day, hour: 12, date };
    if (R.kpEarn) { const e = yield* R.kpEarn(BUNDLES[k].price + 1500, `Stiltzkin's ${BUNDLES[k].name}`); if (e !== true) R.note('stiltzkin: ' + e); }
    R.choices.push({ a: 'Buy it', pc: R.pc });
    try { return yield* R.ops.talk(T.npc, { map: T.map }); } finally { R.choices = R.choices.filter(c => c.pc !== R.pc); }
  }, { done: 'kp_lq_stilt_b' + (k + 1) }];
  const stiltDay = () => (TOWNS.find(t => t.map === vr('kp_lq_stilt_where3')) || TOWNS[3]).day;
  KP.QUESTS = KP.QUESTS || {};
  KP.QUESTS.clan = { name: 'Clan Kupo', order: 9, ready: () => fl('kp_league_1'), done: 'kp_lq_clan_done', plan: [
    ['talk', 'lqclan_moglo', { map: 'kp_lq_clan_hall', done: 'kp_lq_clan_bills' }],
    win('kp_lq_clan_m1', 'kp_summit_2', ['talk', 'lqclan_bogqueen', { map: 'kp_route11', done: 'kp_lq_clan_m1' }]),
    win('kp_lq_clan_m2', 'kp_summit_2', ['talk', 'lqclan_dunetyrant', { map: 'kp_route8', done: 'kp_lq_clan_m2' }]),
    win('kp_lq_clan_m3', 'kp_summit_2', ['talk', 'lqclan_summitram', { map: 'kp_summit_2', done: 'kp_lq_clan_m3' }]),
    win('kp_lq_clan_second', 'kp_summit_2', ['talk', 'lq_rasla', { map: 'kp_lq_clan_hall', done: 'kp_lq_clan_second' }]),
    ['talk', 'lqclan_moglo', { map: 'kp_lq_clan_hall', done: 'kp_lq_clan_badge' }],
    win('kp_legend_lq_montblanc', null, ['talk', MB, { map: 'kp_lq_clan_hall', done: 'kp_legend_lq_montblanc' }]),
  ] };
  KP.QUESTS.stilt = { name: 'The Long Walk', order: 10, ready: () => fl('kp_champion'), done: 'kp_lq_stilt_done', plan: [
    stiltBuy(0), stiltBuy(1), stiltBuy(2),
    // the Old Oak at sunset, the evening of the third meeting: the riddle's answer is the second bundle's town
    win('kp_legend_lq_stiltzkin', null,
      ['js', () => { KP._clock = { day: stiltDay(), hour: 18, date: String(vr('kp_lq_stilt_last') || '2090-01-04') }; return true; }],
      ['talk', 'lq_stiltzkin', { map: 'kp_route1', choose: (choices) => { const T = TOWNS.find(t => t.map === vr('kp_lq_stilt_where2')); const i = T ? choices.indexOf(T.name) : -1; return i >= 0 ? i : null; } }]),
    ['js', () => { KP._clock = null; return true; }],
  ] };
  KP.QUESTS.drmog = { name: 'The Locked Record', order: 11, ready: () => fl('kp_champion'), done: 'kp_lq_drmog_done', plan: [
    ['js', () => { if (KP._clock && String(KP._clock.date) >= '2090') KP._clock = null; return true; }],   // (the Long Walk's clock, if it was left set)
    ['talk', 'lqdrmog_shelf', { map: 'kp_lab', done: 'kp_lq_drmog_open' }],
    ['use', BOOK1[0], BOOK1[1], { map: 'kp_fernwick_elder', done: 'kp_lq_drmog_w1' }],
    ['use', BOOK2[0], BOOK2[1], { map: 'kp_sandsea_bazaar', done: 'kp_lq_drmog_w2' }],
    ['use', BOOK3[0], BOOK3[1], { map: 'kp_raven_dojo_2', done: 'kp_lq_drmog_w3' }],
    ['talk', 'lqdrmog_shelf', { map: 'kp_lab', choose: ['EVERY', 'BATTLE', 'RECORDED'], done: 'kp_lq_drmog_pass' }],
    win('kp_tr_lq_archivist', 'kp_summit_2', ['goto', 'kp_lq_drmog_record'], ['talk', 'lq_archivist', { done: 'kp_tr_lq_archivist' }]),
    win('kp_legend_lq_drmog', null, ['goto', 'kp_lq_drmog_record'], ['talk', 'lq_drmog', { done: 'kp_legend_lq_drmog' }]),
  ] };
})();
