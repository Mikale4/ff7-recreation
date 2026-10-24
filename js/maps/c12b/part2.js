// Chapter 12b, part 2 — the Sunken Gelnika (reached by submarine; world location `gelnika`).
// A Shinra cargo plane lying on the sea floor near the Gold Saucer coast: the entry hallway (save point,
// Heaven's Cloud), the upper room (bridge to the Megalixir, Escort Guard), the lower deck (hidden Double
// Cut and the hidden Conformer chest), the corridor where Reno and Rude guard the cargo, and the cargo
// room (Megalixir, Spirit Lance, Hades near the wrecked helicopter, Outsider, and Cid's "Highwind").
// Flags: c12b_gel_intro, c12b_gel_turks, c12b_gel_doublecut, c12b_gel_conformer.
// (Dialogue paraphrased in our own words; see docs/SCRIPTING.md.)
(function () {
  const BG = 'ship';
  const LOOK = { floor: ['#4a525a', '#444c54'], floor2: ['#3a4048', '#363c44'], wall: '#56626c', trim: '#2a343c', wallH: 2.4 };
  const MUSIC = 'deepsea';

  FF7.world.link('gelnika', { map: 'side_gelnika_hall', entry: 'from_sub', if: s => !!(FF7.state && FF7.state.flags.has_submarine), priority: 1 });
  FF7.world.link('gelnika', { run: function* (s) { yield s.msg('Far below the waves lies the dark shape of a sunken aircraft.\nThere is no way down there without a submarine.'); } });

  const toSub = function* (s) { yield s.world({ resume: true }); };

  // ------------------------------------------------------------------ entry hallway
  FF7.defineMap('side_gelnika_hall', {
    name: 'Sunken Gelnika', area: 'Gelnika', theme: 'underwater', look: LOOK, music: MUSIC,
    grid: [
      "##############################",
      "#PPPPPPPPPP++PPPPPPPPPPPPPPPP#",
      "#gggggggggggggggggggggggggggg#",
      "+ggBBgggggggggggggggggggggggg+",
      "+gggggggggggggSgggggggggggggg+",
      "#ggogggggggggggggggggggggggBB#",
      "#xxggggggggggggggggggggggBBBx#",
      "#gggggggggggggggggggggggggggg#",
      "#############++###############",
    ],
    entries: { from_sub: [13, 7, 'up'], from_upper: [11, 2, 'down'], from_corridor: [1, 4, 'right'], from_lower: [28, 4, 'left'] },
    exits: [
      { at: [11, 1, 2, 1], to: 'side_gelnika_upper', entry: 'from_hall', sfx: 'door_shinra' },
      { at: [0, 3, 1, 2], to: 'side_gelnika_corridor', entry: 'from_hall', sfx: 'door_shinra' },
      { at: [29, 3, 1, 2], to: 'side_gelnika_lower', entry: 'from_hall', sfx: 'door' },
      { at: [13, 8, 2, 1], run: toSub },
    ],
    chests: [{ at: [26, 2], item: 'heavens_cloud', id: 'c12b_gel_heavens_cloud' }],
    triggers: [
      { at: [5, 1, 5, 1], on: 'talk', run: function* (s) { yield s.msg('Rows of cargo manifests, swollen with seawater.\nThe Shinra logo is still readable on every page.'); } },
      { at: [29, 3, 1, 2], on: 'talk', run: function* (s) { yield s.msg('A stairwell leads down to the lower deck.'); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c12b_gel_intro')) return;
      s.set('c12b_gel_intro');
      yield s.msg('The submarine locks onto a tear in the fuselage.\nInside, the sunken plane still holds a pocket of stale air.');
      yield s.say('cloud', "(A Shinra cargo plane... the Gelnika. It went down with its whole load still aboard.)");
    },
  });

  // ------------------------------------------------------------------ upper room
  FF7.defineMap('side_gelnika_upper', {
    name: 'Sunken Gelnika', area: 'Gelnika', theme: 'underwater', look: LOOK, music: MUSIC,
    battle: { table: 'gelnika_north', bg: BG },
    grid: [
      "############################",
      "#PPPPPPPPPPMMPPPPPPPPPPPPPP#",
      "#ggggggggggPPgggggggggggggg#",
      "#   K      Pgggggggggggoggg#",
      "#   K      Pggggggggggggggg#",
      "#   K      PPPPggggggggBBgg#",
      "#gggggggggggggggggggggggggg#",
      "#gggggggggggggggggggggggggg#",
      "#xgggggggggggg++ggggggggggx#",
    ],
    entries: { from_hall: [14, 7, 'up'] },
    exits: [{ at: [14, 8, 2, 1], to: 'side_gelnika_hall', entry: 'from_upper', sfx: 'door_shinra' }],
    chests: [
      { at: [10, 2], item: 'megalixir', id: 'c12b_gel_megalixir1' },
      { at: [25, 2], item: 'escort_guard', id: 'c12b_gel_escort_guard' },
    ],
    triggers: [
      { at: [1, 3, 3, 3], on: 'talk', run: function* (s) { yield s.msg('The deck has torn away here. Far below, black water sloshes against twisted metal.'); } },
    ],
  });

  // ------------------------------------------------------------------ lower deck (two hidden treasures)
  const hidden = (flag, give, text) => function* (s) {
    if (s.flag(flag)) { yield s.msg('Nothing else is hidden here.'); return; }
    s.set(flag);
    yield s.msg(text);
    yield* give(s);
  };
  const conformer = hidden('c12b_gel_conformer', function* (s) { s.sfx('chest'); yield s.give('conformer'); },
    'Behind a sagging cargo net, your hand bumps into a box nobody could see...');
  const doubleCut = hidden('c12b_gel_doublecut', function* (s) { yield s.giveMateria('double_cut'); },
    'Something glints in the shadows of the corner...');
  FF7.defineMap('side_gelnika_lower', {
    name: 'Sunken Gelnika', area: 'Gelnika', theme: 'underwater', look: LOOK, music: MUSIC,
    battle: { table: 'gelnika_north', bg: BG },
    grid: [
      "##########################",
      "#qqPPPPPPPPPPPPPPPPPPPPqq#",
      "#gggggBBggggggggggggBgggg#",
      "#gggggBgggggggggggggggggg#",
      "#ggggggggggooggggggggggBB#",
      "#gggggggggggggggggggggggg+",
      "#ggBBggggggggggggggggoggg+",
      "#ggBggggggggggBBBgggggggg#",
      "#gggggggggggggBgggggggggg#",
      "#xxggggggggggggggggggggxx#",
      "##########################",
    ],
    entries: { from_hall: [24, 5, 'left'] },
    exits: [{ at: [25, 5, 1, 2], to: 'side_gelnika_hall', entry: 'from_lower', sfx: 'door' }],
    triggers: [
      { at: [0, 1, 3, 2], on: 'talk', run: conformer },
      { at: [23, 1, 3, 1], on: 'talk', run: doubleCut },
      { at: [25, 2, 1, 1], on: 'talk', run: doubleCut },
      { at: [13, 7, 3, 2], on: 'talk', run: function* (s) { yield s.msg('Crates stamped "SHINRA - WEAPONS DEVELOPMENT". All of them have been emptied.'); } },
    ],
  });

  // ------------------------------------------------------------------ corridor (Reno & Rude)
  // (Config > Turks Join, js/maps/extra/turks.js: once they have joined the group they aren't down here; beaten in
  // the Sector 8 underground but not yet recruited, they are salvaging for themselves - no orders any more)
  const gelTurksGone = (s) => s.flag('c12b_gel_turks') || s.flag('tk_joined');
  const freelancing = (s) => FF7.state.config.turksJoin !== false && s.flag('c11a_turks_fought') && s.flag('disc3');
  function* turksFight(s) {
    s.spawn('reno', 'reno', 10, 3, 'right', { name: 'Reno' });
    s.spawn('rude', 'rude', 10, 4, 'right', { name: 'Rude' });
    yield s.move('player', 16, 3);
    yield s.cam(13, 3, 30);
    yield s.say('reno', "Yo. Knew somebody'd come pokin' around this wreck sooner or later.");
    yield s.say('rude', '......');
    yield s.say('cloud', "The Turks. What are you doing down here?");
    if (freelancing(s)) yield s.say('reno', "Salvage. The company's gone, but this bird sank with a fortune in Shinra hardware.\fA guy's gotta eat. ...And you're here for the same stuff, huh?");
    else yield s.say('reno', "Workin', what else? This bird sank with a whole load of Shinra hardware.\fThe company wants it back before any treasure hunters show up. ...Which, heh, would be you guys.");
    if (s.inParty('tifa')) {
      yield s.say('rude', '......Tifa.');
      yield s.say('reno', "Don't start, partner. Not now.");
    }
    yield s.say('reno', freelancing(s) ? "Nothin' personal. Finders keepers, yo." : "Nothin' personal, alright? Orders are orders.");
    yield s.move('reno', 12, 3);
    const r = yield s.battle({ enemies: ['reno_3', 'rude_5'], bg: BG, music: 'boss', noEscape: true });
    if (r !== 'win') return;
    s.set('c12b_gel_turks');
    s.anim('reno', 'kneel');
    yield s.say('reno', "Ugh... okay, okay. I get it. We're clockin' out early today.");
    s.stopAnim('reno');
    if (s.inParty('tifa')) yield s.say('rude', '......Take care of yourself.');
    else yield s.say('rude', "......Let's go.");
    yield [s.run('reno', 29, 2), s.run('rude', 29, 3)];
    s.remove('reno'); s.remove('rude');
    yield s.camFollow(20);
  }
  FF7.defineMap('side_gelnika_corridor', {
    name: 'Sunken Gelnika', area: 'Gelnika', theme: 'underwater', look: LOOK, music: MUSIC,
    battle: { table: 'gelnika_corridor', bg: BG, if: s => gelTurksGone(s) },
    grid: [
      "##############################",
      "#PPPPPPqqPPPPPPPPPPPPqqPPPPPP#",
      "+gggggggggggggggggggggggggggg+",
      "+gggggggggggggggggggggggggggg+",
      "#ggBgggggggggggggggggggggoggg#",
      "#gggggggggggggggggggggggggggg#",
      "#xxgggggggggggggggggggggggxxx#",
      "#gggggggggggggggggggggggggggg#",
      "##############################",
    ],
    entries: { from_hall: [28, 3, 'left'], from_cargo: [1, 3, 'right'] },
    exits: [
      { at: [29, 2, 1, 2], to: 'side_gelnika_hall', entry: 'from_corridor', sfx: 'door_shinra' },
      { at: [0, 2, 1, 2], to: 'side_gelnika_cargo', entry: 'from_corridor', sfx: 'door_shinra' },
    ],
    npcs: [
      { id: 'reno_w', name: 'Reno', model: 'reno', at: [10, 3], dir: 'right', show: s => !gelTurksGone(s),
        talk: function* (s) { yield s.say('reno', "Somethin' on your mind?"); } },
      { id: 'rude_w', name: 'Rude', model: 'rude', at: [10, 4], dir: 'right', show: s => !gelTurksGone(s),
        talk: function* (s) { yield s.say('rude', '......'); } },
    ],
    triggers: [
      { id: 'turks', at: [18, 2, 1, 6], if: s => !gelTurksGone(s),
        run: function* (s) { s.hide('reno_w'); s.hide('rude_w'); yield* turksFight(s); } },
    ],
  });

  // ------------------------------------------------------------------ cargo room (two levels)
  FF7.defineMap('side_gelnika_cargo', {
    name: 'Sunken Gelnika - Cargo Room', area: 'Gelnika', theme: 'underwater', look: LOOK, music: MUSIC,
    battle: { table: 'gelnika_cargo', bg: BG },
    grid: [
      "################################",
      "#PPPPPPPPPPPPPPPPPPPPPPPPPPPPPP#",
      "#zzzzzzzzzzzzzzzzzzzzzzzzzzzzzz+",
      "#zzzzzzzzzzzzzzzzzzzzzzzzzzzzzz+",
      "#=====^^=======================#",
      "#gggggggggggggggggggggggggggggg#",
      "#ggBBgggggggggggggggggggggooggg#",
      "#ggBgggggxxMMxggggggggggggggBgg#",
      "#gggggggxMMMMMxgggggggggggggggg#",
      "#ggggggggxMMMxxggggggggBBgggggg#",
      "#gggggggggxxgggggggggggBggggggg#",
      "#gggggggggggggggggggggggggggggg#",
      "#oggggggggggggggggggggggggggggo#",
      "#gggggggggggggggggggggggggggggg#",
      "#xxgggggggggggggggggggggggggxxx#",
      "################################",
    ],
    heights: [
      "44444444444444444444444444444444",
      "44444444444444444444444444444444",
      "44444444444444444444444444444444",
      "44444444444444444444444444444444",
      "44444422444444444444444444444444",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
    ],
    entries: { from_corridor: [30, 3, 'left'] },
    exits: [{ at: [31, 2, 1, 2], to: 'side_gelnika_corridor', entry: 'from_cargo', sfx: 'door_shinra' }],
    chests: [
      { at: [26, 2], item: 'megalixir', id: 'c12b_gel_megalixir2' },
      { at: [1, 2], item: 'spirit_lance', id: 'c12b_gel_spirit_lance' },
      { at: [2, 13], item: 'outsider', id: 'c12b_gel_outsider' },
      { at: [28, 13], item: 'highwind', id: 'c12b_gel_highwind' },
    ],
    items: [{ at: [14, 10], materia: 'hades', id: 'c12b_gel_hades' }],
    triggers: [
      { at: [9, 7, 6, 4], on: 'talk', run: function* (s) {
        yield s.msg('The wreck of a Shinra helicopter, crushed when the plane went down.');
        if (s.inParty('cid')) yield s.say('cid', "Heh. Shoddy rotor mounts. Figures. If I'd built this thing, it'd still be flyin'... well, floatin' anyway.");
      } },
    ],
  });
})();
