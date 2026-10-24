// Chapter 2 — Part 3: Sector 4. The train tunnel (landing spots for both outcomes of the train
// alarm, the winding south tunnel and the guarded door with endless Special Combatants), the laser
// sensors and the ventilation shaft, then the plate interior: the first area (Ether, two ladders),
// the huge lattice (Wedge, the long ladder), Jessie's area (Potion) and Biggs' catwalk (Tent, Save
// Point, the hole into Mako Reactor No.5).
(function () {
  const TUNNEL_LOOK = { sky: ['#000000', '#05070a'], fog: { color: [0.01, 0.015, 0.02], near: 6, far: 17 }, ambient: [0.26, 0.27, 0.3] };
  const PLATE_LOOK = { sky: ['#020304', '#0a1016'], fog: { color: [0.02, 0.03, 0.04], near: 7, far: 20 }, ambient: [0.28, 0.3, 0.34] };
  const TUNNEL_BATTLE = { table: 'train_tunnel', bg: 'tunnel', rate: 1.3 };

  // Landing after the jump (Barret and Tifa pick themselves up, then "follow" Cloud again).
  FF7.story.c2_tunnelLanding = function* (s, far) {
    s.set('c2_landed');
    yield 40;
    s.stopAnim('player');
    s.stopAnim('tifa');
    yield s.say('tifa', "Ow... Is everybody in one piece?");
    s.stopAnim('barret');
    yield s.say('barret', "Ugh... my back... Remind me never to let Jessie plan our exits again.");
    if (far) {
      yield s.say('barret', "An' now we gotta hoof it the long way 'round. Perfect. Just perfect.");
      yield s.say('tifa', "At least we're not sitting in a Shinra cell. The reactor should be north, through the tunnel.");
    } else {
      yield s.say('tifa', "Jessie said they'd be waiting along the maintenance route. We should hurry.");
    }
    yield s.say('cloud', "The reactor's north. Let's move.");
    s.remove('tifa'); s.remove('barret');
    s.music('lurking');
  };
  // onLoad helper: the party lies sprawled next to the landing spot (x, y = the from_train entry).
  const landingSetup = (x, y) => function (s) {
    if (s.entry() !== 'from_train' || s.flag('c2_landed')) return;
    s.anim('player', 'kneel');
    s.spawn('tifa', 'tifa', x + 1, y, 'up', { name: 'Tifa', anim: 'kneel' });
    s.spawn('barret', 'barret', x - 1, y + 1, 'up', { name: 'Barret', anim: 'lie' });
  };

  // ------------------------------------------------------------------ winding tunnel (south)
  FF7.defineMap('s4_tunnel_s', {
    name: 'Sector 4 Train Tunnel', area: 'Midgar', theme: 'station', music: 'lurking', look: TUNNEL_LOOK,
    battle: TUNNEL_BATTLE,
    lights: [[4, 3, '#ffb060', 2], [20, 12, '#ffb060', 2]],
    grid: [
      "XXXXXXXXXXXXXXXXrrrXXXXXXX",
      "#PPPPPPPPPPPP..rrr..PPPPP#",
      "#.............rrr........#",
      "#..o.........rrr.........#",
      "#...........rrr......x...#",
      "#..........rrr...........#",
      "#.........rrr............#",
      "#........rrr.....B.......#",
      "#.......rrr..............#",
      "#.x....rrr...............#",
      "#.....rrr................#",
      "#.....rrr........o.......#",
      "#.....rrr...........P....#",
      "#.....rrr................#",
      "######rrr#################",
    ],
    entries: { from_north: [16, 2, 'down'], from_south: [7, 13, 'up'], from_train: [12, 8, 'up'] },
    exits: [
      { at: [16, 0, 3, 1], to: 's4_tunnel', entry: 'from_south' },
      { at: [6, 14, 3, 1], to: 's4_guard', entry: 'from_north' },
    ],
    onLoad: landingSetup(12, 8),
    onEnter: function* (s) {
      if (s.entry() === 'from_train' && !s.flag('c2_landed')) yield* FF7.story.c2_tunnelLanding(s, true);
    },
  });

  // ------------------------------------------------------------------ the guarded door (dead end)
  FF7.defineMap('s4_guard', {
    name: 'Sector 4 Train Tunnel', area: 'Midgar', theme: 'station', music: 'lurking', look: TUNNEL_LOOK,
    battle: TUNNEL_BATTLE,
    lights: [[17, 4, '#ff4030', 3]],
    grid: [
      "XXXXXXXXrrrXXXXXXXXX",
      "#PPPP...rrr....PPPP#",
      "#.......rrr........#",
      "#..o....rrr.......MM",
      "#.......rrr.......MM",
      "#....B..rrr.......MM",
      "#.......rrr.......MM",
      "#.......rrr........#",
      "####################",
    ],
    entries: { from_north: [9, 1, 'down'] },
    exits: [{ at: [8, 0, 3, 1], to: 's4_tunnel_s', entry: 'from_south' }],
    npcs: [
      { id: 'guard', name: 'Shinra Guard', model: 'soldier', at: [17, 4], dir: 'left',
        talk: function* (s) {
          const n = s.inc('c2_guard_fights');
          if (n <= 1) yield s.say('Shinra Guard', "Halt! This area's restricted! You're no maintenance crew... Intruders! Get 'em!");
          else yield s.say('Shinra Guard', "M-more of you?! Backup! I need backup down here!");
          s.sfx('alarm_short');
          yield s.battle({ enemies: ['special_combatant', 'special_combatant'], bg: 'tunnel', music: 'battle' });
          yield s.say('Shinra Guard', "Ngh... Th-there's plenty more where they came from...!");
        } },
    ],
    triggers: [{ at: [18, 3, 2, 4], on: 'talk', run: function* (s) { yield s.msg('A heavy blast door marked "SHINRA ELECTRIC POWER CO. — AUTHORIZED PERSONNEL ONLY".'); } }],
  });

  // ------------------------------------------------------------------ landing tunnel
  FF7.defineMap('s4_tunnel', {
    name: 'Sector 4 Train Tunnel', area: 'Midgar', theme: 'station', music: 'lurking', look: TUNNEL_LOOK,
    battle: TUNNEL_BATTLE,
    lights: [[3, 3, '#ffb060', 2.5], [22, 3, '#ffb060', 2.5]],
    grid: [
      "XXXXXXXXXXrrrXXXXXXXXXXXXX",
      "#PPPPPPPP.rrr.PPPPPPPPPPP#",
      "#.........rrr............#",
      "#..l......rrr.........l..#",
      "#.........rrr............#",
      "#...B.....rrr.....o......#",
      "#.........rrr............#",
      "#.........rrr......x.....#",
      "#..x......rrr............#",
      "#.........rrr............#",
      "#.........rrr......B.....#",
      "#.........rrr............#",
      "##########rrr#############",
    ],
    entries: { from_train: [15, 6, 'up'], from_south: [11, 11, 'up'], from_north: [11, 1, 'down'] },
    exits: [
      { at: [10, 0, 3, 1], to: 's4_lasers', entry: 'from_south' },
      { at: [10, 12, 3, 1], to: 's4_tunnel_s', entry: 'from_north' },
    ],
    onLoad: landingSetup(15, 6),
    onEnter: function* (s) {
      if (s.entry() === 'from_train' && !s.flag('c2_landed')) yield* FF7.story.c2_tunnelLanding(s, false);
    },
  });

  // ------------------------------------------------------------------ laser sensors & the vent
  FF7.defineMap('s4_lasers', {
    name: 'Sector 4 Train Tunnel', area: 'Midgar', theme: 'station', music: 'lurking', look: TUNNEL_LOOK,
    battle: TUNNEL_BATTLE,
    lights: [[6, 4, '#50ff70', 3], [12, 4, '#50ff70', 3], [19, 4, '#50ff70', 3], [1, 7, '#a0c0ff', 2]],
    grid: [
      "XXXXXXXXXXrrrXXXXXXXXXXXXX",
      "#PPPPPPPP.rrr.PPPPPPPPPPP#",
      "#.........rrr............#",
      "#.........rrr............#",
      "#************************#",
      "#.........rrr............#",
      "#.........rrr......B.....#",
      "+.........rrr............#",
      "#PP.......rrr.......o....#",
      "#.........rrr............#",
      "#..x......rrr............#",
      "#.........rrr............#",
      "##########rrr#############",
    ],
    entries: { from_south: [11, 11, 'up'] },
    exits: [
      { at: [10, 12, 3, 1], to: 's4_tunnel', entry: 'from_north' },
      { at: [0, 7], run: function* (s) {
          const c = yield s.ask(null, 'Crawl into the ventilation shaft?\n(There will be no turning back.)', ['Crawl in', 'Not yet']);
          if (c !== 0) { yield s.walk('player', 1, 0); return; }
          s.set('c2_vent');
          yield s.say('barret', "Hrrgh...! This thing was built for rats, not for me...!");
          yield s.say('tifa', "Keep crawling, Barret. And please don't stop suddenly.");
          yield s.say('barret', "...Hey! I'm STUCK! No, wait... okay, I'm good. Nobody saw that.");
          yield s.goto('s4_underground', 'from_vent');
        } },
    ],
    triggers: [
      { at: [1, 4, 24, 1], on: 'talk', run: function* (s) { yield s.msg('A curtain of green sensor beams fills the tunnel from wall to wall.\nBreaking it would set off every alarm on the plate.'); } },
      { id: 'lasers', at: [1, 5, 24, 2], once: true,
        run: function* (s) {
          s.spawn('tifa', 'tifa', 10, 7, 'up', { name: 'Tifa' });
          s.spawn('barret', 'barret', 13, 7, 'up', { name: 'Barret' });
          yield s.say('barret', "Whoa, whoa! Hold up! Them green lights...");
          yield s.say('tifa', "Sensors. If we walk through those, all of Shinra will know exactly where we are.");
          yield s.say('barret', "So what, we just turn around?!");
          yield s.face('player', 'left');
          yield s.say('cloud', "......There. A ventilation shaft, on the left wall.");
          yield s.say('barret', "......In THERE? Y'gotta be kiddin' me.");
          s.remove('tifa'); s.remove('barret');
        } },
    ],
  });

  // ------------------------------------------------------------------ plate interior: first area
  FF7.defineMap('s4_underground', {
    name: 'Sector 4 Plate Interior', area: 'Midgar', theme: 'midgar', music: 'lurking', look: PLATE_LOOK,
    battle: { table: 'sector4_plate', bg: 'midgar', rate: 1.3 },
    lights: [[5, 2, '#a0c0ff', 3], [14, 8, '#ffb060', 3]],
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXX",
      "#gggggggggg PPPPPPPPPPP#",
      "#gggggggggg            #",
      "#gggggggHgg            #",
      "#       H              #",
      "#   ggggggggggggggg    #",
      "#   gggggggggggggHg    #",
      "#                H     #",
      "#     gggBggggggggggoggg",
      "#     ggggggggggggggggg#",
      "########################",
    ],
    heights: [
      "000000000000000000000000",
      "088888888880000000000000",
      "088888888880000000000000",
      "088888886880000000000000",
      "000000006000000000000000",
      "000044444444444444440000",
      "000044444444444442400000",
      "000000000000000002000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
    ],
    entries: { from_vent: [2, 1, 'down'], from_lattice: [22, 8, 'left'] },
    exits: [{ at: [23, 8], to: 's4_lattice', entry: 'from_underground' }],
    items: [{ at: [9, 2], item: 'ether', id: 's4_underground_ether' }],
    onEnter: function* (s) {
      if (s.flag('c2_plate_in')) return;
      s.set('c2_plate_in');
      yield s.say('tifa', "We're inside the plate... It's like a whole other city of steel up here.");
      yield s.say('barret', "Two ladders down, then keep headin' for the reactor. An' no more vents!");
    },
  });

  // ------------------------------------------------------------------ plate interior: the lattice
  FF7.defineMap('s4_lattice', {
    name: 'Sector 4 Plate Interior', area: 'Midgar', theme: 'midgar', music: 'lurking', look: PLATE_LOOK,
    battle: { table: 'sector4_walkways', bg: 'midgar', rate: 1.3 },
    camera: { dist: 11, pitch: 52 },
    lights: [[2, 2, '#a0c0ff', 3], [28, 2, '#a0c0ff', 3], [16, 9, '#ffb060', 3]],
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "XX+XXXXXXXXXXXXXXXXXXXXXXXXXHXXX",
      "#zzzz                    zzzzz #",
      "#zzzz                    zzzzz #",
      "#H                          H  #",
      "#H     zzzzzzzzzzzzz        H  #",
      "#zzzzzzz           z        z  #",
      "#   z              zzzzzzzzzz  #",
      "#   z                     z    #",
      "#   zzzzzzzzzzzz          z    #",
      "#              z          z    #",
      "#              zzzzzzzzzzzzzzzzz",
      "################################",
    ],
    heights: [
      "00000000000000000000000000000000",
      "00900000000000000000000000007000",
      "09999000000000000000000007777700",
      "09999000000000000000000007777700",
      "05000000000000000000000000004000",
      "05000000000000000000000000004000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
    ],
    entries: { from_underground: [30, 11, 'left'], from_shaft: [2, 2, 'down'], from_jessie: [28, 2, 'down'] },
    exits: [
      { at: [31, 11], to: 's4_underground', entry: 'from_lattice' },
      { at: [2, 1], to: 's4_jessie', entry: 'from_shaft' },
      { at: [28, 1], to: 's4_jessie', entry: 'from_lattice' },
    ],
    npcs: [
      { id: 'wedge', name: 'Wedge', model: 'wedge', at: [6, 6], dir: 'left',   // on the stub east of the junction (at [3, 6] he blocked the only way to the long ladder)
        talk: function* (s) {
          if (!s.flag('c2_wedge_talk')) {
            s.set('c2_wedge_talk');
            yield s.say('wedge', "Cloud! Over here! You guys made it!\fI'm keeping watch on the escape route. Jessie's farther ahead, and Biggs is right by the reactor.");
            yield s.say('wedge', "That long ladder behind me goes up to a crawlspace. Follow it and you'll find Jessie.\f......Don't look down while you climb. I did. Big mistake.");
            return;
          }
          yield s.say('wedge', "I'll be right here if anything goes wrong! ...Please don't let anything go wrong.");
        } },
    ],
  });

  // ------------------------------------------------------------------ plate interior: Jessie
  FF7.defineMap('s4_jessie', {
    name: 'Sector 4 Plate Interior', area: 'Midgar', theme: 'midgar', music: 'lurking', look: PLATE_LOOK,
    battle: { table: 'sector4_plate', bg: 'midgar', rate: 1.3 },
    lights: [[10, 2, '#a0c0ff', 3], [12, 5, '#ffb060', 3]],
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXX",
      "#H#PPPPPPP+PPPPPPPPPP#H#",
      "#gggggggggggggggggggggg#",
      "#gBBgggggggggggggggoggg#",
      "#gBgggggggggggggggggggg#",
      "#xggggggggggggggggggggx#",
      "#gggggggggggggggggggggg#",
      "########################",
    ],
    heights: [
      "000000000000000000000000",
      "030000000000000000000030",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
    ],
    entries: { from_shaft: [10, 2, 'down'], from_catwalk: [1, 2, 'down'], from_lattice: [22, 2, 'down'] },
    exits: [
      { at: [10, 1], to: 's4_lattice', entry: 'from_shaft' },
      { at: [1, 1], to: 's4_catwalk', entry: 'from_jessie' },
      { at: [22, 1], to: 's4_lattice', entry: 'from_jessie' },
    ],
    items: [{ at: [1, 4], item: 'potion', id: 's4_jessie_potion' }],
    npcs: [
      { id: 'jessie', name: 'Jessie', model: 'jessie', at: [12, 4], dir: 'up',
        talk: function* (s) {
          if (!s.flag('c2_jessie_talk')) {
            s.set('c2_jessie_talk');
            yield s.say('jessie', "You made it through the vent! And Barret didn't get stuck? ...Darn. I had a bet going with Biggs.");
            yield s.say('barret', "I heard that!");
            yield s.say('jessie', "The reactor's straight up from here. Take the ladder on the left. Biggs is waiting at the top.\fThe one on the right just drops you back into the big lattice, so don't bother with it.");
            yield s.say('jessie', "Oh, and I dropped some supplies behind those crates on the left. They're yours if you want 'em. Be careful, okay?");
            return;
          }
          yield s.say('jessie', "Left ladder, then straight on to the reactor. Go get 'em!");
        } },
    ],
  });

  // ------------------------------------------------------------------ plate interior: Biggs' catwalk
  FF7.defineMap('s4_catwalk', {
    name: 'Sector 4 Plate Interior', area: 'Midgar', theme: 'midgar', music: 'lurking', look: PLATE_LOOK,
    battle: { table: 'sector4_walkways', bg: 'midgar', rate: 0.9 },
    lights: [[18, 2, '#50ff90', 3], [9, 6, '#ffb060', 2]],
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXX",
      "hhhhhhhhhhhhhhhhhh+hhhhhhh",
      "#Hzzzzzzzzzzzzzzzzzzzzzzz#",
      "#zzzzzzzzzSzzzzzzzzzzzzzz#",
      "#======zzzz==============#",
      "#      zzzz              #",
      "#      zzzz              #",
      "#      zzzz              #",
      "##########################",
    ],
    entries: { from_jessie: [2, 2, 'right'], from_reactor: [18, 2, 'down'] },
    exits: [
      { at: [1, 2], to: 's4_jessie', entry: 'from_catwalk' },
      { at: [18, 1], run: function* (s) {
          if (!s.flag('c2_md5_in')) {
            yield s.say('tifa', "This is it... Reactor No.5.");
            yield s.say('barret', "Awright. In we go!");
          }
          yield s.goto('md5_pipes', 'from_hole');
        } },
    ],
    items: [{ at: [8, 7], item: 'tent', id: 's4_catwalk_tent' }],
    npcs: [
      { id: 'biggs', name: 'Biggs', model: 'biggs', at: [14, 2], dir: 'left',
        talk: function* (s) {
          if (!s.flag('c2_biggs_talk')) {
            s.set('c2_biggs_talk');
            yield s.say('biggs', "There you are! This is the end of the line for the maintenance route.\fThat hole in the wall leads straight into Reactor No.5.");
            yield s.say('biggs', "Rest up while you can. There's a save point right here, and I left a Tent at the end of that side walkway.\fWe'll hold the escape route. Good luck, all of you.");
            return;
          }
          yield s.say('biggs', "Go on. We've got your backs.");
        } },
    ],
  });
})();
