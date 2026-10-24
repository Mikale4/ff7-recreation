// Chapter 5a (part 3) — Cloud's story, continued: Mt. Nibel (the path, the rope bridge collapse, the
// Mako fountain caves), the Nibelheim reactor (the pods, "JENOVA"), the Shinra Mansion and its
// basement library (the Jenova Project, Sephiroth's madness), and the end of the story in Jenova's
// chamber — then back to the Kalm inn (part1). (Dialogue paraphrased; see docs/SCRIPTING.md.)
//
// Flags: c5a_fb_path, c5a_fb_bridge, c5a_fb_fall, c5a_fb_fountain, c5a_fb_door, c5a_fb_reactor,
// c5a_fb_mansion_in, c5a_fb_library1, c5a_fb_library2, c5a_fb_chase, c5a_fb_tifa, c5a_fb_end.
(function () {
  const TIFA_YOUNG = { base: 'tifa', top: '#f0ece0', sleeve: 'skin', bottom: '#8a5a30', skirt: 'short', boots: '#6a4020', extras: ['vest'] };
  const TIFA_DAD = { base: 'man', hair: '#3a2a1a', hairStyle: 'short', top: '#5a4a6a', sleeve: '#5a4a6a', bottom: '#3a3a40', extras: ['mustache'] };
  const JENOVA = { base: 'woman', skin: '#8aa0b8', hair: '#b0c0d0', hairStyle: 'longstraight', eyes: '#e04040', top: '#8aa0b8', sleeve: 'skin', bottom: '#8aa0b8', boots: '#8aa0b8', skirt: 'long', female: true };
  const tifaName = (s) => s.name('tifa') || 'Tifa';

  // ------------------------------------------------------------------ Mt. Nibel: the path to the bridge
  FF7.defineMap('fb_mt_path', {
    name: 'Mt. Nibel', area: 'Five Years Ago', theme: 'mountain', music: 'fiveyears',
    battle: { table: 'flashback_nibel_path', bg: 'mtnibel', rate: 1 },
    grid: [
      "##################################",
      "###..R.......................R.###",
      "###ddddddddddddddddddddddddddddddd",
      "###d..........................dddd",
      "###d...R......R.........R.....dddd",
      "###d......dd..................    ",
      "   d......dd.............RR.      ",
      "        RR^^RR................    ",
      "        RR^^RR................    ",
      "      ddddddd.........R.......    ",
      "      d..........%.............   ",
      "      d..R.................R...   ",
      "      ddddddddddddddd..........   ",
      "       ..........RddR.........    ",
      " ................R^^R.........    ",
      " ................R^^R.........    ",
      " ......%..........dd.........R.   ",
      " ..R..............dd............  ",
      " dddddddddddddddddddd..........%  ",
      " dd......R.............R......    ",
      " dd....                           ",
    ],
    heights: [
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "4444444444664444444444444444444444",
      "4444444444664444444444444444444444",
      "4444444444444444444444444444444444",
      "4444444444444444444444444444444444",
      "4444444444444444444444444444444444",
      "4444444444444444444444444444444444",
      "4444444444444444444444444444444444",
      "0000000000000000002200000000000000",
      "0000000000000000002200000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
    ],
    entries: { from_town: [2, 19, 'up'], from_bridge: [32, 3, 'left'] },
    exits: [
      { at: [1, 20, 2, 1], run: function* (s) {
          yield s.say('cloud', "(No going back now. Sephiroth and Tifa are up ahead.)");
        } },
      { at: [33, 2, 1, 3], to: 'fb_bridge', entry: 'from_path' },
    ],
    npcs: [
      { id: 'sephiroth', model: 'sephiroth', at: [29, 2], dir: 'left', show: s => s.flag('c5a_fb_path') && !s.flag('c5a_fb_bridge'),
        talk: function* (s) { yield s.say('sephiroth', "Keep moving. The reactor won't fix itself."); } },
      { id: 'tifa', model: TIFA_YOUNG, at: [30, 4], dir: 'left', show: s => s.flag('c5a_fb_path') && !s.flag('c5a_fb_bridge'),
        talk: function* (s) { yield s.say('tifa', "The bridge is just past here. It's really old, so watch your step, okay?"); } },
    ],
    onEnter: function* (s) {
      if (!s.flag('c5a_fb_path')) yield* FF7.story.c5a_pathIntro(s);
    },
  });

  FF7.story.c5a_pathIntro = function* (s) {
    s.spawn('tifa_i', TIFA_YOUNG, 4, 18, 'left', { name: tifaName(s) });
    s.spawn('seph_i', 'sephiroth', 5, 17, 'left', { name: 'Sephiroth' });
    yield s.wait(20);
    yield s.say('tifa', "This is Mt. Nibel. The trail's steep, and the rocks come loose easily, so watch your footing.\fPast the ridge there's an old rope bridge. The reactor's not far after that.");
    yield s.say('sephiroth', "Lead the way.");
    yield [s.move('tifa_i', 12, 18), s.move('seph_i', 11, 17)];
    s.remove('tifa_i'); s.remove('seph_i');
    s.set('c5a_fb_path');
    s.show('tifa'); s.show('sephiroth');
  };

  // ------------------------------------------------------------------ Mt. Nibel: the rope bridge
  FF7.defineMap('fb_bridge', {
    name: 'Mt. Nibel', area: 'Five Years Ago', theme: 'mountain', music: 'fiveyears',
    battle: { table: 'flashback_nibel_bridge', bg: 'mtnibel', rate: 0.8, if: s => !s.flag('c5a_fb_bridge') },
    grid: [
      "##########              ##########",
      "#..R.....R              R.....R..#",
      "#.........              .........#",
      "#...T.....              ......T..#",
      "#.........              .........#",
      "#....R....              ....R....#",
      "ddddddddddKKKKKKKKKKKKKKddddddddd#",
      "ddddddddddKKKKKKKKKKKKKKddddddddd#",
      "#.........              .........#",
      "#..R......              ......R..#",
      "#.........              .........#",
      "%%%%%%%%%%              %%%%%%%%%%",
    ],
    entries: { from_path: [2, 6, 'right'] },
    exits: [{ at: [0, 6, 1, 2], to: 'fb_mt_path', entry: 'from_bridge' }],
    npcs: [
      { id: 'sephiroth', model: 'sephiroth', at: [20, 6], dir: 'left', show: s => !s.flag('c5a_fb_bridge'),
        talk: function* (s) { yield s.say('sephiroth', "Don't stop in the middle."); } },
      { id: 'tifa', model: TIFA_YOUNG, at: [22, 7], dir: 'left', show: s => !s.flag('c5a_fb_bridge'),
        talk: function* (s) { yield s.say('tifa', "It sways a little, but it's held up for years. Come on!"); } },
      { id: 'trooper', name: 'Shinra Trooper', model: 'young_cloud', at: [18, 7], dir: 'right', show: s => !s.flag('c5a_fb_bridge'),
        talk: function* (s) { yield s.say('Shinra Trooper', "......"); } },
      { id: 'trooper2', name: 'Shinra Trooper', model: 'soldier', at: [23, 6], dir: 'left', show: s => !s.flag('c5a_fb_bridge'),
        talk: function* (s) { yield s.say('Shinra Trooper', "D-don't look down, don't look down..."); } },
    ],
    triggers: [
      { id: 'collapse', at: [14, 6, 2, 2], if: s => !s.flag('c5a_fb_bridge'),
        run: function* (s) { yield* FF7.story.c5a_bridgeCollapse(s); } },
    ],
  });

  FF7.story.c5a_bridgeCollapse = function* (s) {
    s.sfx('search');
    s.shake(2, 50);
    yield s.wait(40);
    yield s.emote('tifa', '!');
    yield s.say('tifa', "W-wait... the bridge is—!");
    s.sfx('falling');
    s.shake(8, 70);
    s.anim('tifa', 'hurt'); s.anim('trooper', 'hurt'); s.anim('trooper2', 'hurt');
    yield s.wait(20);
    s.set('c5a_fb_bridge');
    yield s.flash('#ffffff', 20);
    yield s.fadeOut(40);
    yield s.wait(60);
    yield s.goto('fb_cave', 'after_fall');
  };

  // ------------------------------------------------------------------ Mt. Nibel caves (the Mako fountain)
  FF7.defineMap('fb_cave', {
    name: 'Mt. Nibel Cave', area: 'Five Years Ago', theme: 'cave', music: 'fiveyears',
    battle: { table: 'flashback_nibel_cave', bg: 'cave', rate: 0.9 },
    lights: [[24, 5, '#60ff90', 5], [26, 7, '#60ff90', 4]],
    grid: [
      "####################################",
      "#..........R#######U...........U####",
      "#..U.......R#######......U......::::",
      "#.........::::::::::.............:::",
      "#.........::::::::::...****.......##",
      "#....R....#########..U******U.....  ",
      "#.........         ...******......  ",
      "#R.....R.          ..U.****.U.....  ",
      "   ...             ...........R...  ",
      "   ...             .......::::....  ",
      "   ...                    ::::      ",
      "   ...                    ::::      ",
      "   ...                    ::::      ",
      "   ...                    ::::      ",
      " .......                  ::::      ",
      " ..R....                  ::::      ",
      " .......                  ::::      ",
      " .......                  ::::      ",
      " ..U....                  ::::      ",
      " .......::::::::::::::::::::::      ",
      " .U...R.::::::::::::::::::::::      ",
      "####################################",
    ],
    entries: { after_fall: [4, 17, 'up'], from_path: [33, 3, 'left'] },
    exits: [{ at: [35, 2, 1, 2], to: 'fb_reactor_path', entry: 'from_cave' }],
    npcs: [
      { id: 'sephiroth', model: 'sephiroth', at: [21, 4], dir: 'right', show: s => s.flag('c5a_fb_fall') && !s.flag('c5a_fb_fountain'),
        talk: function* (s) { yield s.say('sephiroth', "......"); } },
      { id: 'tifa', model: TIFA_YOUNG, at: [24, 3], dir: 'down', show: s => s.flag('c5a_fb_fall') && !s.flag('c5a_fb_fountain'),
        talk: function* (s) { yield s.say('tifa', "Look at it glow..."); } },
      { id: 'trooper', name: 'Shinra Trooper', model: 'young_cloud', at: [20, 6], dir: 'right', show: s => s.flag('c5a_fb_fall') && !s.flag('c5a_fb_fountain'),
        talk: function* (s) { yield s.say('Shinra Trooper', "......"); } },
    ],
    objects: [
      { at: [24, 4], talk: function* (s) { yield s.msg('Pure Mako wells up from deep within the mountain, glowing softly green.'); } },
      { at: [21, 5], talk: function* (s) { yield s.msg('A crystal of condensed Mako, cloudy and not yet formed.'); } },
    ],
    triggers: [
      { at: [19, 1, 2, 9], if: s => s.flag('c5a_fb_fall') && !s.flag('c5a_fb_fountain'), run: function* (s) { yield* FF7.story.c5a_fountain(s); } },
      { at: [26, 9, 4, 1], if: s => s.flag('c5a_fb_fall') && !s.flag('c5a_fb_fountain'), run: function* (s) { yield* FF7.story.c5a_fountain(s); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c5a_fb_bridge') && !s.flag('c5a_fb_fall')) yield* FF7.story.c5a_afterFall(s);
    },
  });

  FF7.story.c5a_afterFall = function* (s) {
    s.spawn('seph_f', 'sephiroth', 6, 16, 'left', { name: 'Sephiroth' });
    s.spawn('tifa_f', TIFA_YOUNG, 2, 16, 'right', { name: tifaName(s), anim: 'kneel' });
    s.spawn('trooper_f', 'young_cloud', 5, 19, 'up', { name: 'Shinra Trooper', anim: 'kneel' });
    s.anim('player', 'lie');
    yield s.fadeIn(40);
    yield s.wait(40);
    yield s.say('tifa', "Ow... ow... Is everyone all right?");
    s.stopAnim('player');
    s.stopAnim('tifa_f');
    s.stopAnim('trooper_f');
    yield s.wait(20);
    yield s.say('sephiroth', "We're fine. ...But one of the troopers is missing.");
    yield s.say('tifa', "He could have landed anywhere. These caves run all through the mountain. It's like a maze down here.");
    yield s.face('player', 'seph_f');
    yield s.say('cloud', "We should look for him.");
    yield s.say('sephiroth', "No. We don't have time. We keep going to the reactor.");
    yield s.say('tifa', "......Okay. I think I know where we are. This way.");
    yield [s.move('tifa_f', [[4, 15], [4, 8], [4, 3]]), s.move('seph_f', [[5, 15], [5, 8], [5, 4]]), s.move('trooper_f', [[4, 16], [4, 9], [4, 5]])];
    s.remove('tifa_f'); s.remove('seph_f'); s.remove('trooper_f');
    s.set('c5a_fb_fall');
    s.show('sephiroth'); s.show('tifa'); s.show('trooper');
  };

  FF7.story.c5a_fountain = function* (s) {
    s.set('c5a_fb_fountain');
    yield s.face('player', 'tifa');
    yield s.say('tifa', "Wow... It's so beautiful. I've heard stories about this place, but I never thought I'd see it.");
    yield s.say('cloud', "A Mako fountain...");
    yield s.say('sephiroth', "Mako, welling straight up out of the planet. This mountain is full of it. That's why Shinra built a reactor here.");
    yield s.say('sephiroth', "When Mako condenses like this, over a very long time... it crystallizes. Into materia.");
    yield s.say('cloud', "Materia just... forms on its own?");
    yield s.face('sephiroth', 'player');
    yield s.say('sephiroth', "Most people never wonder where it comes from.\fMateria holds the knowledge of the Ancients. The wisdom of the planet itself.\fWhoever wields that knowledge can call on the power of the land and the planet. That's what we call magic.");
    yield s.say('tifa', "The knowledge of the Ancients...?");
    yield s.say('sephiroth', "...Heh. Something a certain scientist liked to say. Never mind.");
    yield s.say('sephiroth', "The reactor is close. Let's go.");
    yield [s.move('sephiroth', [[21, 3], [34, 3]]), s.move('tifa', [[24, 2], [34, 2]]), s.move('trooper', [[20, 3], [33, 3]])];
    s.hide('sephiroth'); s.hide('tifa'); s.hide('trooper');
  };

  // ------------------------------------------------------------------ Mt. Nibel: the path to the reactor
  FF7.defineMap('fb_reactor_path', {
    name: 'Mt. Nibel', area: 'Five Years Ago', theme: 'mountain',
    music: s => s.flag('c5a_fb_fire') ? 'nightmare' : 'fiveyears',
    battle: { table: 'flashback_nibel_reactor', bg: 'mtnibel', rate: 1, if: s => !s.flag('c5a_fb_fire') },
    grid: [
      "##########XXXXXXXXXXXXXX##########",
      "######RRRRPPPPhhhhhhPPPPRRRR######",
      "######....MMPPhhhhhhPPMM....######",
      "######.o..MMPhhhhhhhhPMM..B.######",
      "######....hhhhhh++hhhhhh....######",
      "######......................######",
      "######...l..............l...######",
      "######......................######",
      "######RR..................RR######",
      "      RR^^RRRRRRRRRRRRRRRRRR      ",
      "      RR^^RRRRRRRRRRRRRRRRRR      ",
      "  dddddddd..................R...  ",
      "  d.......................dd....  ",
      "  d....R.........R........dd....  ",
      "  dddddddddddddddddddddddddd....  ",
      "  ..............%.........dd....  ",
      "  RRRRRRRRRRRRRRRRRRRRRRRR^^RRRR  ",
      "  RRRRRRRRRRRRRRRRRRRRRRRR^^RRRR  ",
      " .........................dd..... ",
      " ....R.........%..........dd...R. ",
      " ddddddddddddddddddddddddddd..... ",
      " dd....     ...........           ",
    ],
    heights: [
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "6666666666666666666666666666666666",
      "6666666666666666666666666666666666",
      "4444444444444444444444444444444444",
      "4444444444444444444444444444444444",
      "4444444444444444444444444444444444",
      "4444444444444444444444444444444444",
      "4444444444444444444444444444444444",
      "2222222222222222222222222222222222",
      "2222222222222222222222222222222222",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
    ],
    entries: { from_cave: [2, 20, 'up'], chase: [2, 20, 'up'], from_reactor: [16, 5, 'down'] },
    exits: [
      { at: [1, 21, 2, 1], to: 'fb_cave', entry: 'from_path', if: s => !s.flag('c5a_fb_fire'),
        blocked: function* (s) { yield s.say('cloud', "(No time! Tifa's up there!)"); } },
      { at: [16, 4, 2, 1], to: 'fb_reactor', entry: 'from_outside', sfx: 'door_shinra', if: s => s.flag('c5a_fb_door') || s.flag('c5a_fb_fire'),
        blocked: function* (s) { yield s.say('cloud', "(Sephiroth and Tifa should be around here somewhere...)"); } },
    ],
    npcs: [
      { id: 'sephiroth', model: 'sephiroth', at: [15, 5], dir: 'down', show: s => s.flag('c5a_fb_fountain') && !s.flag('c5a_fb_door'),
        talk: function* (s) { yield s.say('sephiroth', "This is it."); } },
      { id: 'tifa', model: TIFA_YOUNG, at: [18, 5], dir: 'down', show: s => s.flag('c5a_fb_fountain') && !s.flag('c5a_fb_reactor') && !s.flag('c5a_fb_fire'),
        talk: function* (s) {
          if (s.flag('c5a_fb_door')) { yield s.say('tifa', "Go on. I'll wait right here. ...Just hurry, okay?"); return; }
          yield s.say('tifa', "That's the reactor. We made it!");
        } },
      { id: 'trooper', name: 'Shinra Trooper', model: 'young_cloud', at: [20, 6], dir: 'left', show: s => s.flag('c5a_fb_fountain') && !s.flag('c5a_fb_reactor') && !s.flag('c5a_fb_fire'),
        talk: function* (s) { yield s.say('Shinra Trooper', "......I'll look after her, sir."); } },
    ],
    triggers: [
      { at: [8, 8, 18, 1], if: s => s.flag('c5a_fb_fountain') && !s.flag('c5a_fb_door') && !s.flag('c5a_fb_fire'),
        run: function* (s) { yield* FF7.story.c5a_reactorDoor(s); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c5a_fb_fire') && !s.flag('c5a_fb_chase')) {
        s.set('c5a_fb_chase');
        yield s.say('cloud', "(Tifa... Hang on! I'm coming!)");
      }
    },
  });

  FF7.story.c5a_reactorDoor = function* (s) {
    yield s.move('player', 16, 7);
    yield s.face('player', 'up');
    yield s.say('tifa', "Here it is. The Mako reactor.");
    yield s.move('tifa', 17, 5);
    yield s.say('sephiroth', "Stop. Past this door, only authorized personnel. What's inside the reactor is classified.");
    yield s.face('tifa', 'sephiroth');
    yield s.say('tifa', "Oh, come on! I brought you all the way up here. I want to see inside too!");
    yield s.say('sephiroth', "The guide waits outside.");
    yield s.face('tifa', 'player');
    yield s.say('cloud', "Tifa... It's for your own safety. Just wait here, okay?");
    yield s.say('tifa', "......Fine. But you'd better hurry.");
    yield s.face('sephiroth', 'trooper');
    yield s.say('sephiroth', "You. Keep the guide safe.");
    yield s.say('Shinra Trooper', "......Yes, sir.");
    yield s.move('tifa', 18, 5);
    yield s.move('sephiroth', [[16, 5], [16, 4]]);
    s.hide('sephiroth');
    s.set('c5a_fb_door');
  };

  // ------------------------------------------------------------------ the Nibelheim reactor
  FF7.defineMap('fb_reactor', {
    name: 'Nibelheim Reactor', area: 'Five Years Ago', theme: 'reactor',
    music: s => s.flag('c5a_fb_fire') ? 'nightmare' : 'lurking',
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "#PPPPPPPPPPPhh++hhPPPPPPPPPPP#",
      "#   y.y.y............y.y.y   #",
      "#   ......................   #",
      "#   ....Z.............Z...   #",
      "#   =========....=========   #",
      "#            ^^^^            #",
      "#            ^^^^            #",
      "#     yyy............yyy     #",
      "#     =======....=======     #",
      "#            ^^^^            #",
      "#            ^^^^            #",
      "#yy........................yy#",
      "#.........M..................#",
      "#PP........................PP#",
      "#............................#",
      "#***......................***#",
      "#***......................***#",
      "#............................#",
      "##############++##############",
    ],
    heights: [
      "888888888888888888888888888888",
      "888888888888888888888888888888",
      "888888888888888888888888888888",
      "888888888888888888888888888888",
      "888888888888888888888888888888",
      "888888888888888888888888888888",
      "666666666666666666666666666666",
      "666666666666666666666666666666",
      "444444444444444444444444444444",
      "444444444444444444444444444444",
      "222222222222222222222222222222",
      "222222222222222222222222222222",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
    ],
    entries: { from_outside: [14, 18, 'up'], from_jenova: [14, 2, 'down'] },
    exits: [
      { at: [14, 19, 2, 1], to: 'fb_reactor_path', entry: 'from_reactor', sfx: 'door_shinra', if: s => !s.flag('c5a_fb_tifa'),
        blocked: function* (s) { yield s.say('cloud', "(Sephiroth's in there. I can't leave Tifa like this... but I have to end it.)"); } },
      { at: [14, 1, 2, 1], to: 'fb_jenova', entry: 'from_reactor', sfx: 'door_shinra', if: s => s.flag('c5a_fb_tifa'),
        blocked: function* (s) {
          yield s.msg('A heavy sealed door. The plate above it reads:\n"JENOVA"');
        } },
    ],
    npcs: [
      { id: 'dad_body', name: "Tifa's Father", model: TIFA_DAD, at: [14, 13], dir: 'down', anim: 'lie', show: s => s.flag('c5a_fb_tifa'),
        talk: function* (s) { yield s.say('cloud', "(Tifa's father... Sephiroth cut him down without a second thought.)"); } },
      { id: 'tifa_down', model: TIFA_YOUNG, at: [15, 8], dir: 'down', anim: 'lie', show: s => s.flag('c5a_fb_tifa'),
        talk: function* (s) { yield s.say('cloud', "(She's still breathing... Hang on, Tifa. Just a little longer.)"); } },
    ],
    objects: [
      { at: [10, 13], talk: function* (s) { yield s.msg('A pressure valve. Its casing is cracked, and Mako hisses from the seam.'); } },
      { at: [8, 4], talk: function* (s) { yield s.msg('A terminal. The screen scrolls with capsule numbers and Mako concentrations.'); } },
      { at: [22, 4], talk: function* (s) { yield s.msg('"Specimen status: stable. Mako saturation: 400%."'); } },
    ],
    onEnter: function* (s) {
      if (!s.flag('c5a_fb_reactor') && !s.flag('c5a_fb_fire')) { yield* FF7.story.c5a_reactorFirst(s); return; }
      if (s.flag('c5a_fb_fire') && !s.flag('c5a_fb_tifa')) yield* FF7.story.c5a_reactorTifa(s);
    },
  });

  // ---- first visit: the broken valve, "JENOVA", the pods — Sephiroth's doubt
  FF7.story.c5a_reactorFirst = function* (s) {
    s.spawn('seph', 'sephiroth', 11, 14, 'left', { name: 'Sephiroth' });
    yield s.move('player', 13, 15);
    yield s.say('sephiroth', "...Here. This valve is broken. That's the cause of the malfunction.");
    yield s.say('cloud', "That's all it was?");
    yield s.say('sephiroth', "Replace it and the reactor will run normally again.");
    yield s.face('seph', 'up');
    yield s.say('sephiroth', "But that doesn't explain the monsters...");
    yield s.move('seph', [[13, 12], [13, 5], [14, 3], [14, 2]]);
    yield s.face('seph', 'up');
    yield s.move('player', [[14, 12], [14, 5], [15, 3]]);
    yield s.face('player', 'up');
    yield s.say('sephiroth', "......'JENOVA'.");
    yield s.move('seph', [[9, 3], [7, 3]]);
    yield s.face('seph', 'up');
    yield s.say('sephiroth', "...I see. So that's what this is. Hojo...");
    yield s.say('cloud', "What's inside these things?");
    yield s.move('player', [[20, 3], [22, 3]]);
    yield s.face('player', 'up');
    yield s.emote('player', '!');
    yield s.say('cloud', "What... is this!? Is that... a person!?");
    yield s.say('sephiroth', "You ordinary SOLDIER members were showered in Mako too. It changed you, made you stronger than other people... but you're still human.\fThese are different. They were exposed to far more Mako than you ever were.");
    yield s.face('player', 'seph');
    yield s.say('cloud', "Then... are they monsters?");
    yield s.say('sephiroth', "Monsters. All the monsters that roam this world were born from Mako, just like these. Made.\fBy Shinra... by Hojo. The man who took over from Professor Gast.");
    s.sfx('hit');
    s.shake(4, 20);
    yield s.face('player', 'up');
    yield s.emote('player', '!!');
    yield s.msg('Something inside the capsule slams against the glass.');
    s.anim('seph', 'lookdown');
    yield s.wait(40);
    yield s.say('sephiroth', "......Was I made the same way?\fAm I... the same as these monsters?");
    yield s.say('sephiroth', "Ever since I was a child, I knew I was different from everyone else. Special, I thought.\fBut not like this. Not like... THIS.");
    yield s.say('cloud', "Sephiroth...");
    s.stopAnim('seph');
    yield s.say('sephiroth', "......We're done here.");
    yield s.move('seph', [[13, 3], [13, 12], [14, 18]], { run: true });
    s.remove('seph');
    yield s.say('cloud', "(...Sephiroth...)");
    yield s.fadeOut(60);
    s.set('c5a_fb_reactor');
    yield s.caption("After we got back to Nibelheim,\nSephiroth locked himself inside the Shinra Mansion.\n\nFor days, he didn't come out.", { hold: 240, bg: '#000' });
    yield s.goto('fb_nibel', 'from_mountain');
  };

  // ---- the night of the fire: Tifa finds her father, then goes after Sephiroth
  FF7.story.c5a_reactorTifa = function* (s) {
    s.spawn('dad', TIFA_DAD, 14, 13, 'down', { name: "Tifa's Father", anim: 'lie' });
    s.spawn('tifa_r', TIFA_YOUNG, 15, 13, 'left', { name: tifaName(s), anim: 'kneel' });
    yield s.wait(30);
    yield s.say('tifa', "Papa...! Papa!!");
    yield s.say('tifa', "...Sephiroth. You did this... didn't you?");
    s.stopAnim('tifa_r');
    yield s.face('tifa_r', 'down');
    yield s.msg("A long sword lies on the floor beside her father's body.");
    yield s.say('tifa', "SOLDIER... Shinra... the Mako reactors... Sephiroth...\fI hate you. I hate ALL of you!!");
    yield s.run('tifa_r', [[15, 12], [14, 8], [14, 3], [14, 2]]);
    s.hide('tifa_r');
    yield s.wait(50);
    s.sfx('crit');
    yield s.flash('#ffffff', 12);
    s.shake(5, 20);
    yield s.say('tifa', "Aaaah!!");
    s.show('tifa_r', 14, 2, 'down');
    s.anim('tifa_r', 'hurt');
    yield s.jump('tifa_r', 15, 8, 1.0, 34);
    s.anim('tifa_r', 'lie');
    yield s.run('player', [[13, 13], [13, 9], [14, 9]]);
    yield s.face('player', 'tifa_r');
    yield s.say('cloud', "TIFA!!");
    yield s.say('cloud', "Tifa! ...Tifa!");
    yield s.emote('tifa_r', '...');
    yield s.say('cloud', "(She's breathing... Hold on, Tifa. Just a little longer.)");
    yield s.face('player', 'up');
    yield s.say('cloud', "Sephiroth...!!");
    s.remove('dad'); s.remove('tifa_r');
    s.set('c5a_fb_tifa');
    s.show('dad_body'); s.show('tifa_down');
  };

  // ------------------------------------------------------------------ Jenova's chamber: the end of Cloud's story
  FF7.defineMap('fb_jenova', {
    name: 'Nibelheim Reactor', area: 'Five Years Ago', theme: 'lab', music: 'chosen',
    grid: [
      "XXXXXXXXXXXXXXXXXXXX",
      "#PPPPPPP.yy.PPPPPPP#",
      "#PP..............PP#",
      "#M................M#",
      "#..................#",
      "#.y..............y.#",
      "#..................#",
      "#.y..............y.#",
      "#..................#",
      "#########++#########",
    ],
    entries: { from_reactor: [9, 8, 'up'] },
    exits: [{ at: [9, 9, 2, 1], to: 'fb_reactor', entry: 'from_jenova', sfx: 'door_shinra' }],
    lights: [[9, 1, '#80ffb0', 4]],
    onEnter: function* (s) {
      if (!s.flag('c5a_fb_end')) yield* FF7.story.c5a_jenova(s);
    },
  });

  FF7.story.c5a_jenova = function* (s) {
    s.spawn('jenova', JENOVA, 9.5, 1, 'down', { name: 'JENOVA' });
    s.spawn('seph', 'sephiroth', 9, 2, 'up', { name: 'Sephiroth' });
    yield s.wait(30);
    yield s.move('player', 9, 5);
    yield s.say('sephiroth', "Mother... I've come for you.");
    yield s.say('sephiroth', "They locked you away in here, didn't they? The ones who came after... Ignorant, powerless things. They stole this planet from you.\fBut I'm here now, Mother. Let's take it back. Together.");
    yield s.say('cloud', "Sephiroth!! My hometown... my family... Why!?");
    yield s.say('sephiroth', "......Mother. They've come again.");
    yield s.say('sephiroth', "With their feeble powers, they think they can keep the planet from you.\fDon't be sad, Mother. I'm here now.");
    yield s.say('cloud', "I looked up to you... You were everything I wanted to be!");
    s.sfx('heartbeat');
    yield s.wait(30);
    yield s.say('cloud', "SEPHIROTH!!!");
    s.music('none');
    yield s.run('player', 9, 3);
    s.anim('player', 'slash');
    s.sfx('crit');
    s.shake(8, 40);
    yield s.flash('#ffffff', 30);
    yield s.fadeOut(60, '#ffffff');
    yield s.wait(60);
    yield s.caption('......', { hold: 150, bg: '#000' });
    s.set('c5a_fb_end');
    yield s.goto('kalm_inn_2f', 'after_flashback');
  };

  // ------------------------------------------------------------------ the Shinra Mansion
  FF7.defineMap('fb_mansion', {
    name: 'Shinra Mansion', area: 'Five Years Ago', theme: 'mansion', music: 'lurking',
    grid: [
      "###########################+##",
      "#kk....b..#........#q........#",
      "#......b..#........#.........#",
      "#.........................t..#",
      "#.........#........#.........#",
      "#==========^^====^^==========#",
      "#.........|^^|..|^^|.........#",
      "#............................#",
      "#..u......................u..#",
      "#............................#",
      "#......________________......#",
      "#......________________......#",
      "#..|...________________...|..#",
      "#......________________......#",
      "#.j....________________....j.#",
      "#.............__.............#",
      "##############++##############",
    ],
    heights: [
      "666666666666666666666666666666",
      "666666666666666666666666666666",
      "666666666666666666666666666666",
      "666666666666666666666666666666",
      "666666666666666666666666666666",
      "666666666663366663366666666666",
      "000000000003300003300000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
    ],
    entries: { from_town: [14, 15, 'up'], from_basement: [27, 1, 'down'] },
    exits: [
      { at: [14, 16, 2, 1], to: 'fb_nibel', entry: 'from_mansion', sfx: 'door' },
      { at: [27, 0, 1, 1], to: 'fb_mansion_base', entry: 'from_mansion', sfx: 'door2' },
    ],
    npcs: [
      { id: 'mansion_trooper', name: 'Shinra Trooper', model: 'soldier', at: [25, 1], dir: 'down', show: s => s.flag('c5a_fb_reactor') && !s.flag('c5a_fb_library2'),
        talk: function* (s) {
          yield s.say('Shinra Trooper', "Sir! Sephiroth is down there, past the hidden passage behind this wall.\fHe ordered that no one disturb him... but I guess that doesn't include you, sir.");
        } },
    ],
    objects: [
      { at: [1, 1], talk: function* (s) { yield s.msg('Dusty volumes on botany and geology. Nobody has touched them in years.'); } },
      { at: [7, 1], talk: function* (s) { yield s.msg('An old bed. The sheets are grey with dust.'); } },
      { at: [26, 3], talk: function* (s) { yield s.msg('A desk covered in scattered notes. The handwriting is cramped and hurried.'); } },
      { at: [20, 1], talk: function* (s) { yield s.msg('A wardrobe. Lab coats hang inside, stiff with age.'); } },
    ],
    onEnter: function* (s) {
      if (!s.flag('c5a_fb_mansion_in')) {
        s.set('c5a_fb_mansion_in');
        yield s.say('cloud', "(The Shinra Mansion... Sephiroth's somewhere in here.)");
      }
    },
  });

  // ------------------------------------------------------------------ the mansion basement: the library
  FF7.defineMap('fb_mansion_base', {
    name: 'Shinra Mansion Basement', area: 'Five Years Ago', theme: 'mansion', music: 'lurking',
    look: { wall: '#5a5048', trim: '#3a3028', floor: ['#4a4038', '#443a32'], floor2: ['#55504a', '#4e4a44'], floor3: ['#6a3a2a', '#643424'] },
    lights: [[25, 6, '#ffd080', 4], [17, 8, '#80ffb0', 3]],
    grid: [
      "#:::##############################",
      "#:::####################kkkkkkkkk#",
      "#:.:####################_________#",
      "#::R####################k_k_k_k_k#",
      "#R::####################k_k_k_k_k#",
      "#:::##########.......###_________#",
      "#::R##########y.y.y.y###_t_______#",
      "#R::##########.......###_c_______#",
      "#::::::::::::..........._________#",
      "#:R:::::R::::..........._________#",
      "              Z....M.###k_k_k_k_k#",
      "              y.y.y.y   k_k_k_k_k#",
      "              .......   _________#",
      "              #######   kkkkkkkkk#",
      "                                  ",
    ],
    entries: { from_mansion: [2, 2, 'down'] },
    exits: [{ at: [1, 0, 3, 1], to: 'fb_mansion', entry: 'from_basement', if: s => !s.flag('c5a_fb_library1') || s.flag('c5a_fb_library2'),
      blocked: function* (s) { yield s.say('cloud', "(...Sephiroth.)"); } }],
    npcs: [
      { id: 'sephiroth', model: 'sephiroth', at: [28, 5], dir: 'up', show: s => s.flag('c5a_fb_reactor') && !s.flag('c5a_fb_library2'),
        talk: function* (s) {
          if (s.flag('c5a_fb_library1')) { yield s.say('sephiroth', "......Leave me alone."); return; }
          yield s.say('sephiroth', "......");
        } },
    ],
    objects: [
      { at: [14, 6], talk: function* (s) { yield s.msg('A glass capsule, empty except for a faint green residue.'); } },
      { at: [14, 10], talk: function* (s) { yield s.msg('A research terminal. Most of the files have been erased.'); } },
      { at: [19, 10], talk: function* (s) { yield s.msg('Laboratory equipment, cold and covered in dust.'); } },
      { at: [25, 6], talk: function* (s) { yield s.msg('Stacks of reports, piled high. Sephiroth has read every one.'); } },
      { at: [24, 3], talk: function* (s) { yield s.msg('"Report on the Jenova Project, Vol. 3"\n"On the Ancients and the Promised Land"\n...Row after row of Shinra research files.'); } },
    ],
    triggers: [
      { at: [22, 8, 2, 2], if: s => s.flag('c5a_fb_reactor') && !s.flag('c5a_fb_library1'), run: function* (s) { yield* FF7.story.c5a_library1(s); } },
      { at: [13, 8, 1, 2], if: s => s.flag('c5a_fb_library1') && !s.flag('c5a_fb_library2'), run: function* (s) { yield* FF7.story.c5a_library2(s); } },
    ],
  });

  // ---- first visit: Sephiroth reading the reports
  FF7.story.c5a_library1 = function* (s) {
    s.set('c5a_fb_library1');
    yield s.move('player', 25, 8);
    yield s.face('player', 'sephiroth');
    yield s.say('cloud', "Sephiroth...?");
    yield s.say('sephiroth', "'...From a geological stratum two thousand years old, the remains of an organism were recovered. Designated: JENOVA.'");
    yield s.say('sephiroth', "'...It is confirmed that JENOVA is one of the Ancients, the Cetra.'\f'The Jenova Project is approved. Use of the No. 1 Mako Reactor is authorized.'");
    yield s.say('sephiroth', "Jenova... the Jenova Project...\fProfessor Gast... Why didn't you tell me anything? Why did you have to die...?");
    yield s.say('cloud', "Sephiroth, what is all this?");
    yield s.say('sephiroth', "......Leave me alone.");
  };

  // ---- days later: the madness
  FF7.story.c5a_library2 = function* (s) {
    s.set('c5a_fb_library2');
    yield s.fadeOut(40);
    yield s.caption("Sephiroth never came out of that basement.\nDay and night, the lamp in the library stayed lit...", { hold: 200, bg: '#000' });
    yield s.caption('...And then, one night...', { hold: 120, bg: '#000' });
    s.place('player', 24, 8, 'right');
    s.place('sephiroth', 28, 5, 'up');
    yield s.fadeIn(40);
    yield s.emote('sephiroth', '...');
    yield s.say('sephiroth', "Heh heh heh...");
    yield s.say('sephiroth', "Who's there? ...Ah. A traitor.");
    yield s.say('cloud', "...A traitor?");
    yield s.face('sephiroth', 'player');
    yield s.say('sephiroth', "Long ago, the Cetra wandered this planet. They would settle, awaken the land, and move on.\fTheirs was a journey of hardship. They took only what they needed, and gave back to the planet what they could.");
    yield s.say('sephiroth', "Then came those who stopped wandering. They built houses and chose an easier life.\fThey took everything the Cetra and the planet had made, and gave nothing back. Those were your ancestors.");
    yield s.say('cloud', "Sephiroth, what are you saying?");
    yield s.say('sephiroth', "Two thousand years ago, a calamity fell from the skies. The Cetra fought it, and were destroyed.\fAnd your ancestors? They hid. They survived only because they hid.");
    yield s.say('sephiroth', "'The Jenova Project: an attempt to create a human being with the powers of the Cetra.'\f...It was me. Professor Gast created me. From Jenova.");
    yield s.say('sephiroth', "I am the one who will inherit this planet. The last of the Cetra.");
    yield s.say('cloud', "Sephiroth! Snap out of it!");
    yield s.move('sephiroth', 26, 8);
    yield s.say('sephiroth', "Out of my way, traitor. I'm going to see my mother.");
    yield s.move('player', 24, 9);
    yield s.move('sephiroth', [[21, 8], [13, 8], [2, 8], [2, 1]]);
    s.remove('sephiroth');
    yield s.say('cloud', "Sephiroth! Wait!");
    s.music('none');
    yield s.fadeOut(40);
    yield s.movie('nibel_fire', { text: "I ran after him. When I got outside...\nNibelheim was on fire.\n\nThe houses I grew up with were burning,\nand walking through the flames was Sephiroth." });
    yield s.goto('fb_nibel_fire', 'from_mansion');
  };
})();
