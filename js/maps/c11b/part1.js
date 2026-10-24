// Chapter 11b, part 1 — Disc 3 opens: the night before the final battle.
// On the Highwind's bridge Cloud sends everyone home to find their own reason to fight; each member
// leaves. Cloud and Tifa spend the night together in the grass under the Highwind; at dawn everyone
// comes back, and the Highwind takes off for the Northern Crater (part 2).
// Also: a Disc 3 variation of C9's Highwind hub (FF7.patchMap on 'highwind_bridge').
// Entry: C11a ends with discEnd(2); set('disc3'); goto('hw_night', 'start').
// Flags: c11b_night_done c11b_field_done c11b_dawn_done c11b_morning_done c11b_hub_d3.
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
(function () {
  const CREW = ['barret', 'tifa', 'redxiii', 'yuffie', 'caitsith', 'vincent', 'cid'];
  // FF7: with Tifa's hidden affection at 50+ the night under the Highwind plays out a little closer.
  const tifaClose = () => { try { return FF7.story.affection('tifa') >= 50; } catch (e) { return false; } };
  const NIGHT = {
    sky: ['#01020a', '#0a1430'], fog: { color: [0.02, 0.03, 0.08], near: 10, far: 30 },
    ambient: [0.22, 0.24, 0.36], light: [0.42, 0.46, 0.66],
  };
  const DAWN = {
    sky: ['#e89a68', '#fbe2b8'], fog: { color: [0.86, 0.66, 0.52], near: 12, far: 32 },
    ambient: [0.52, 0.46, 0.42], light: [1.0, 0.8, 0.62],
  };
  // The Highwind's bridge (same room as C9's highwind_bridge; refs 15-cloud01, 02): the nose platform
  // with its curved railing out in the great window, console banks round both sides (helm on the right,
  // radar table on the left), the stair down the middle to the crew deck below the railing.
  const BRIDGE = FF7.c9.HW_BRIDGE;   // the shared bridge layout (c9/part3)
  // A grassy rise below the Highwind (it hovers HOVER metres up over the brow of the hill to the north, its
  // mooring posts stand in the grass; a drop to the south).
  const HOVER = 3.0;
  const FIELD = {
    grid: [
      "                                ",
      "                                ",
      "R,,,,|,,,,,,,,,,KK,,,,,,,,,|,,,R",
      "R,,,,,,,G,,,,,,,,,,,,,,,G,,,,,,R",
      "R,,,,,,,,,,,,,,,,,,,,,,,,,,,R,RR",
      "R,,R,,,,,,,,,,,,,,,,,,,,,,,,,,,R",
      "R,,,,,,,,,G,,,,,,,,,,,,,,,,G,,,R",
      "R,,,,,T,,,,,,,,,,,,,,,,,,,,,,,,R",
      "R,,,,,,,,,,,,,,,,,R,,,,,,,,,,,,R",
      "R,,G,,,,,,,,,,,,,,,,,,,,,R,,,T,R",
      "RR,,,,,,,,,,R,,,,,,,R,,,,,,,,,,R",
      "R,,,,,,,,R,,,,,,,,,,,,G,,,,,,,,R",
      "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
      "                                ",
    ],
    heights: null,
  };

  // ------------------------------------------------------------------ the bridge, that night
  const NIGHT_SPOTS = { tifa: [11, 9], barret: [13, 9], redxiii: [15, 9], cid: [17, 9], yuffie: [9, 8], caitsith: [19, 8], vincent: [22, 7] };
  function* nightOnBridge(s) {
    s.set('disc3');
    s.music('none');
    const crew = CREW.filter(id => s.isMember(id));
    crew.forEach(id => s.spawn('ev_' + id, id, NIGHT_SPOTS[id][0], NIGHT_SPOTS[id][1], 'up', { name: s.name(id) }));
    if (crew.includes('vincent')) s.anim('ev_vincent', 'armscross');
    yield 60;
    yield s.say('cloud', "Everyone... listen.");
    yield s.say('cloud', "Sephiroth is waiting at the bottom of the Northern Crater. Holy is down there too... and he's the one holding it back.\fIf we beat him, Holy can finally move. That's the only chance the Planet has left.");
    if (crew.includes('tifa')) yield s.say('tifa', "Then that's where we're going. All of us, together.");
    yield s.say('cloud', "...Before we go, there's something I have to say.");
    yield s.say('cloud', "I'm going after Sephiroth for my own reasons. For Aeris. For everything he took from me... and to settle who I really am.\fSaving the Planet... that almost comes second. Maybe that sounds selfish.");
    yield s.say('cloud', "So I want all of you to get off the ship for a while. Go home. See the people who matter to you.\fThink about what you're fighting for. And if you find your reason... come back. I'll be waiting.");
    if (crew.includes('barret')) {
      s.anim('ev_barret', 'shake');
      yield s.say('barret', "Get off the ship?! Now?! Man, what kinda crazy talk is...\f......\f...Marlene. Yeah. If this whole world's about to end, I wanna hug my little girl one more time.");
    }
    if (crew.includes('caitsith')) yield s.say('caitsith', "Meteor's gonna hit in about seven days, by my figurin'. That's all the time we've got, folks.\fMe? I'm just a stuffed toy... but there's a whole lotta scared people in Midgar. Somebody's gotta help 'em get someplace safe.");
    if (crew.includes('redxiii')) yield s.say('redxiii', "I will return to Cosmo Canyon. There is much I still wish to ask Grandpa...\fAnd I want to see the canyon once more, through the eyes of a warrior of my tribe.");
    if (crew.includes('yuffie')) yield s.say('yuffie', "Go home? To Wutai? Ugh, the old man's gonna lecture me till my ears fall off...\f...Well. Maybe I'll let him. Just this once.");
    if (crew.includes('vincent')) { s.stopAnim('ev_vincent'); yield s.say('vincent', "......There is a place I would visit. If only to say what I never said."); }
    if (crew.includes('cid')) yield s.say('cid', "Tch! Kickin' the captain off his own damn ship... Fine, fine!\fThere's somebody in Rocket Town who's been waitin' on me long enough, anyhow. Anybody scratches my Highwind while I'm gone, I'll know about it!");
    // one by one, they leave the bridge
    const leaving = crew.filter(id => id !== 'tifa');
    yield leaving.map((id, i) => s.move('ev_' + id, [[13 + (i % 2), 10], [13 + (i % 2), 11]], { speed: 0.03 + i * 0.004 }));
    leaving.forEach(id => s.remove('ev_' + id));
    s.sfx('door');
    yield 60;
    if (!crew.includes('tifa')) { s.set('c11b_night_done'); yield s.fadeOut(40); yield s.goto('hw_field', 'start'); return; }
    yield s.face('player', 'ev_tifa');
    yield s.say('cloud', "......Tifa? Aren't you going?");
    yield s.move('ev_tifa', 13, 8);
    yield s.face('ev_tifa', 'player');
    yield s.say('tifa', "...Where would I go, Cloud? Nibelheim's gone. My father... everyone I knew back then.\fThere's no one left waiting for me anywhere.");
    yield s.say('cloud', "...Me neither.");
    yield s.say('tifa', "Then I guess that makes two of us.\f...Hey. It's a clear night. Let's go outside for a little while.");
    s.set('c11b_night_done');
    s.remove('ev_tifa');
    yield s.fadeOut(40);
    yield s.goto('hw_field', 'start');
  }

  FF7.defineMap('hw_night', {
    name: 'Highwind', area: 'Highwind', theme: 'ship', leader: 'cloud',
    look: Object.assign({}, BRIDGE.look, NIGHT, { indoor: true, fog: null }), camera: BRIDGE.camera,
    grid: BRIDGE.grid, heights: BRIDGE.heights, legend: BRIDGE.legend, props: BRIDGE.props,
    lights: [[13, 3, '#80c0ff', 3], [3, 3, '#60ff90', 2], [24, 3, '#60ff90', 2], [14, 8, '#ffd8a0', 5]],
    entries: { start: [14, 7, 'down'] },
    onEnter: function* (s) {
      if (s.flag('c11b_night_done')) return;
      yield* nightOnBridge(s);
    },
  });

  // ------------------------------------------------------------------ under the Highwind (night)
  function* nightUnderTheStars(s) {
    s.music('openheart');
    s.spawn('ev_tifa', 'tifa', 17, 3, 'down', { name: s.name('tifa') });
    yield [s.move('player', [[16, 6], [15, 11]]), s.move('ev_tifa', [[17, 6], [16, 11]])];
    s.face('player', 'down'); yield s.face('ev_tifa', 'down');
    s.anim('player', 'sit'); s.anim('ev_tifa', 'sit');
    yield s.cam(15, 10, 80, { dist: 8, pitch: 8 });   // low, the Highwind hovering over the hill above them (ref 18-final10)
    yield 60;
    yield s.say('tifa', "Look at all those stars... You can hardly even tell Meteor's up there tonight.");
    yield s.say('tifa', "Do you remember? The night at the water tower in Nibelheim. You told me you were leaving to join SOLDIER.\fAnd I made you promise. If I was ever in trouble, you'd come and save me.");
    yield s.say('cloud', "...I remember.");
    yield s.say('tifa', "You kept that promise, Cloud. Again and again. Even when you didn't know who you were anymore.");
    yield s.say('cloud', "......");
    yield s.say('tifa', "In the Lifestream I saw so much of you. The things you never let anyone see... the boy who just wanted someone to notice him.\fI'm glad I got to meet that boy. Really.");
    yield s.say('cloud', "Tifa... There's so much I want to tell you. But now that it's just the two of us... I can't find a single word.");
    yield s.say('tifa', "...Cloud. Words aren't the only way to tell someone what's in your heart.");
    if (tifaClose()) {
      yield s.say('tifa', "...Can I lean on you? Just for tonight.");
      yield s.say('cloud', "...Yeah.");
      yield s.say('tifa', "(His heart's pounding... Mine too, I bet.)");
    } else {
      yield s.say('tifa', "Let's just stay like this for a while. Until we're ready.");
      yield s.say('cloud', "...Yeah.");
    }
    yield 90;
    s.set('c11b_field_done');
    yield s.fadeOut(90);
    yield s.movie('highwind_night', { text: 'Beneath the Highwind, under a sky crowded with stars\nand the red glare of Meteor, the two of them sit close together...\n\nand the last quiet night slips away.' });
    yield s.goto('hw_dawn', 'start');
  }

  FF7.defineMap('hw_field', {
    name: 'Under the Highwind', area: 'Highwind', theme: 'grass', leader: 'cloud',
    look: Object.assign({ wallH: 3.2, wall: '#586068', trim: '#2a3038' }, NIGHT),
    grid: FIELD.grid,
    // refs 18-final10, 11: the ship hovers low over the hill behind them
    onLoad: s => s.spawn('hw_ship', { vehicle: 'highwind', scale: 2.8 }, 16, -6, 'left', { hover: HOVER }),
    lights: [[16, 1, '#ffe0a0', 4], [15, 13, '#ff5030', 9], [5, 2, '#80a0ff', 2], [27, 2, '#80a0ff', 2]],
    entries: { start: [16, 3, 'down'] },
    onEnter: function* (s) {
      if (s.flag('c11b_field_done')) return;
      yield* nightUnderTheStars(s);
    },
  });

  // ------------------------------------------------------------------ dawn
  FF7.defineMap('hw_dawn', {
    name: 'Under the Highwind', area: 'Highwind', theme: 'grass', leader: 'cloud', music: 'none',
    look: Object.assign({ wallH: 3.2, wall: '#6a7078', trim: '#3a4048' }, DAWN),
    grid: FIELD.grid,
    onLoad: s => s.spawn('hw_ship', { vehicle: 'highwind', scale: 2.8 }, 16, -6, 'left', { hover: HOVER }),
    lights: [[16, 1, '#ffe0a0', 3], [15, 13, '#ffb070', 8]],
    entries: { start: [15, 11, 'up'] },
    exits: [{ at: [16, 2, 2, 1], to: 'hw_bridge', entry: 'from_ramp', sfx: 'door' }],   // the gangway up to the ship
    objects: [
      { at: [27, 2], talk: function* (s) { yield s.msg("One of the Highwind's mooring posts, driven deep into the soft earth. Dew beads on the cold metal."); } },
      { at: [6, 7], talk: function* (s) { yield s.say('cloud', "(A lone tree... It's the same sky as back in Nibelheim.)"); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c11b_dawn_done')) return;
      s.spawn('ev_tifa', 'tifa', 16, 11, 'down', { name: s.name('tifa') });
      s.anim('player', 'sit'); s.anim('ev_tifa', 'sit');
      yield s.cam(15, 10, 1, { dist: 8, pitch: 8 });   // the ship above the hill at sunrise (ref 18-final11)
      yield 90;
      s.stopAnim('ev_tifa');
      yield s.face('ev_tifa', 'player');
      yield s.say('tifa', "...Cloud. Cloud, wake up. It's morning.");
      s.stopAnim('player');
      yield s.face('player', 'ev_tifa');
      yield s.say('cloud', "...Mm. Already?");
      yield s.say('tifa', "Do you think... anyone will come back?");
      yield s.say('cloud', "Everyone has somewhere they belong. If they don't come back... I'll understand.");
      yield s.say('tifa', "Then if it's just the two of us, we'll do it together. Okay?");
      yield s.say('cloud', "...Right. Let's go.");
      s.camFollow(40);
      yield s.move('ev_tifa', [[16, 6], [17, 3], [17, 2]]);
      s.remove('ev_tifa');
      s.set('c11b_dawn_done');
    },
  });

  // ------------------------------------------------------------------ the bridge, next morning
  const MORNING_LINES = {
    barret: "Marlene told me somethin' before I left. She said, 'Go save the Planet, Papa. For everybody.'\fAin't no way I'm sittin' this one out after that!",
    redxiii: "Grandpa told me he is proud of me... and that the Planet will choose its own fate.\fBut until it does, we must do everything we can. I am a warrior of Cosmo Canyon. My place is here.",
    yuffie: "D-don't get the wrong idea! I just, uh... left some materia on the ship! Yeah! That's all!\f...Okay, FINE. The old man told me to go kick some butt. Happy now?",
    caitsith: "The folks in Midgar are all tucked away safe for now. The real me's keepin' an eye on 'em.\fSo! Where's this big bad Sephiroth, then? Let's get this show on the road!",
    vincent: "......It seems I still have a reason to fight.",
  };
  const ENTER_SPOTS = { barret: [10, 9], redxiii: [12, 9], yuffie: [16, 9], caitsith: [18, 9], vincent: [21, 8] };
  function* morningReturn(s) {
    s.music('none');
    const back = CREW.filter(id => id !== 'tifa' && s.isMember(id));
    const withTifa = s.isMember('tifa');
    if (withTifa) s.spawn('ev_tifa', 'tifa', 14, 10, 'up', { name: s.name('tifa') });
    yield [s.move('player', 13, 7), withTifa ? s.move('ev_tifa', 15, 7) : 1];
    yield 50;
    if (withTifa) yield s.say('tifa', "...It's so quiet.");
    yield s.say('cloud', "......");
    // the engines roar to life
    s.sfx('elevator'); s.shake(3, 100);
    yield 40;
    yield s.emote('player', '!');
    if (withTifa) yield s.say('tifa', "The engines...?!");
    if (back.includes('cid')) {
      s.spawn('ev_cid', 'cid', 13, 3, 'down', { name: s.name('cid') });
      yield s.say('cid', "Took you two long enough! I was about ready to take off without ya!");
      yield s.move('ev_cid', [[13, 4], [13, 5], [13, 6]]);
      yield s.say('cid', "What? Don't gimme that look. The engine's been runnin' rough ever since the Midgar job.\fCouldn't very well leave some greenhorn mechanic pokin' around in her guts, could I? That's the ONLY reason I came back. Got it?!");
    }
    const walkers = back.filter(id => id !== 'cid');
    walkers.forEach((id, i) => s.spawn('ev_' + id, id, 13 + (i % 2), 11, 'up', { name: s.name(id) }));
    yield walkers.map(id => s.move('ev_' + id, ENTER_SPOTS[id][0], ENTER_SPOTS[id][1]));
    for (const id of walkers) yield s.say(id, MORNING_LINES[id]);
    if (withTifa) {
      yield s.face('ev_tifa', 'player');
      yield s.say('tifa', "They came back, Cloud. Every one of them.");
    }
    yield s.say('cloud', "......Thanks. All of you.");
    if (withTifa && tifaClose()) {
      if (back.includes('cid')) yield s.say('cid', "Heh. So... what'd you two lovebirds get up to down there all night, huh?");
      yield s.emote('ev_tifa', '!!');
      yield s.say('tifa', "N-nothing! We were just... talking! Right, Cloud?");
      yield s.say('cloud', "......");
      if (back.includes('barret')) yield s.say('barret', "Hmph. I didn't see nothin', and I didn't hear nothin'.");
    } else if (back.includes('barret')) {
      yield s.say('barret', "Well? What're we all standin' around for?!");
    }
    yield s.say('cloud', "Let's go. To the Northern Crater. We end this.");
    if (back.includes('cid')) yield s.say('cid', "You heard him! Everybody grab onto somethin' — the Highwind's takin' off!");
    s.set('c11b_morning_done');
    s.heal();
    s.phs(true);
    s.menu(true);
    s.music('highwind');
    yield s.msg('The barrier around the Northern Crater is gone.\nThe Highwind can set down inside the crater.');
    yield s.world({ x: 256, y: 140, vehicle: 'highwind' });
  }

  FF7.defineMap('hw_bridge', {
    name: 'Highwind', area: 'Highwind', theme: 'ship', leader: 'cloud',
    look: Object.assign({}, BRIDGE.look, { indoor: true, sky: ['#f0b890', '#fce8c8'], ambient: [0.5, 0.46, 0.44], light: [0.9, 0.76, 0.62] }), camera: BRIDGE.camera,
    grid: BRIDGE.grid, heights: BRIDGE.heights, legend: BRIDGE.legend, props: BRIDGE.props,
    lights: [[13, 3, '#80c0ff', 3], [3, 3, '#60ff90', 2], [24, 3, '#60ff90', 2]],
    entries: { from_ramp: [13, 10, 'up'] },
    onEnter: function* (s) {
      if (s.flag('c11b_morning_done')) return;
      yield* morningReturn(s);
    },
  });

  // ------------------------------------------------------------------ Disc 3 on C9's Highwind hub
  FF7.patchMap('highwind_bridge', {
    onEnter: function* (s) {
      if (!s.flag('c11b_morning_done') || s.flag('c11b_hub_d3')) return;
      s.set('c11b_hub_d3');
      if (s.flag('final_dungeon')) return;
      yield s.say('cid', "Meteor's hangin' lower every time I look up. Just say the word, and I'll set her down right on the crater floor.");
      if (s.isMember('caitsith')) yield s.say('caitsith', "Folks in Midgar can see Meteor with their own eyes now. Whatever you're plannin' to do... best do it soon.");
    },
  });
})();
