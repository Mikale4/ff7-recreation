// Chapter 2 — Part 4: Mako Reactor No.5. In through the hole from the plate (upper piping), down the
// main staircase and the lower piping to the core (the bomb; Cloud's vision of Tifa in Nibelheim),
// back up by elevator to the entrance (Ether chest, the three-button door), the save point, then
// President Shinra's trap on the bridge, Air Buster (side battle), and Cloud's fall.
(function () {
  const REACTOR_LOOK = { sky: ['#020604', '#08201a'] };

  // ------------------------------------------------------------------ upper piping (arrival)
  FF7.defineMap('md5_pipes', {
    name: 'Mako Reactor No.5', area: 'Midgar', theme: 'reactor', music: 'bombing', look: REACTOR_LOOK,
    battle: { table: 'reactor5', bg: 'reactor', rate: 1.3 },
    lights: [[12, 5, '#40ff90', 4], [18, 3, '#40ff90', 2]],
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXX",
      "#PPPPPPPPzPPPPPPPPPPPPPPP#",
      "#P......zzz.......PPP...P#",
      "#P..o.....z.......y......#",
      "#P.........zzzzzzzzz.....#",
      "#PPPPPPP**********^PPPPPP#",
      "#PPPPPPP**********^PPPPPP#",
      "#..x...B..........z......#",
      "#.......................zz",
      "#.......................zz",
      "##########################",
    ],
    heights: [
      "00000000000000000000000000",
      "06666666666666666666666660",
      "06666666666666666666666660",
      "06666666666666666666666660",
      "06666666666666666666666660",
      "00000000000000000030000000",
      "00000000000000000030000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
    ],
    entries: { from_hole: [9, 2, 'down'], from_stairs: [24, 9, 'left'] },
    exits: [
      { at: [9, 1], to: 's4_catwalk', entry: 'from_reactor' },
      { at: [25, 8, 1, 2], to: 'md5_stairs', entry: 'from_pipes' },
    ],
    onEnter: function* (s) {
      if (s.flag('c2_md5_in')) return;
      s.set('c2_md5_in');
      s.spawn('barret', 'barret', 8, 2, 'down', { name: 'Barret' });
      s.spawn('tifa', 'tifa', 10, 2, 'down', { name: 'Tifa' });
      yield [s.move('barret', 7, 3), s.move('tifa', 11, 3)];
      yield s.say('barret', "We're in! Same drill as Reactor No.1. The core's all the way down.");
      yield s.say('tifa', "So this is what the inside of a reactor looks like... It's like the Planet's veins, cut wide open.");
      yield s.say('cloud', "......Let's get this over with.");
      s.remove('barret'); s.remove('tifa');
    },
  });

  // ------------------------------------------------------------------ main staircase
  const STAIR_H = "000000000133333333346666666660";
  FF7.defineMap('md5_stairs', {
    name: 'Reactor No.5 Main Staircase', area: 'Midgar', theme: 'reactor', music: 'bombing', look: REACTOR_LOOK,
    battle: { table: 'reactor5', bg: 'reactor', rate: 1.0 },
    grid: [
      "##############################",
      "#+PPPPPPP#PPPPPPPPP#PPPPEEE+P#",
      "#........^.........^.........#",
      "#...o....^.........^.........#",
      "#..l.....^....B....^.....l...#",
      "#........^.........^.........#",
      "#........^.........^.........#",
      "##############################",
    ],
    heights: [STAIR_H, STAIR_H, STAIR_H, STAIR_H, STAIR_H, STAIR_H, STAIR_H, STAIR_H],
    entries: { from_pipes: [27, 2, 'down'], from_lower: [1, 2, 'down'], from_elevator: [25, 2, 'down'] },
    exits: [
      { at: [27, 1], to: 'md5_pipes', entry: 'from_stairs' },
      { at: [1, 1], to: 'md5_lower', entry: 'from_stairs' },
      { at: [24, 1, 3, 1], to: 'md5_elevator', entry: 'from_stairs', sfx: 'door_shinra', if: s => s.flag('c2_md5_bomb'),
        blocked: function* (s) {
          yield s.say('barret', "That elevator's our ride out. Bomb first, then we ride it up!");
          yield s.walk('player', 0, 1);
        } },
    ],
  });

  // ------------------------------------------------------------------ lower piping
  FF7.defineMap('md5_lower', {
    name: 'Reactor No.5 Lower Piping', area: 'Midgar', theme: 'reactor', music: 'bombing', look: REACTOR_LOOK,
    battle: { table: 'reactor5_pipes', bg: 'reactor', rate: 1.3 },
    lights: [[11, 3, '#40ff90', 4]],
    grid: [
      "############################",
      "#+PPPPPPPPPPPPPPPPPPPPPPPP+#",
      "#........******............#",
      "#..o.....zzzzzz.......B....#",
      "#........zzzzzz............#",
      "#........******......l.....#",
      "#........******............#",
      "############################",
    ],
    entries: { from_stairs: [1, 2, 'down'], from_core: [26, 2, 'down'] },
    exits: [
      { at: [1, 1], to: 'md5_stairs', entry: 'from_lower' },
      { at: [26, 1], to: 'md5_core', entry: 'from_lower' },
    ],
  });

  // ------------------------------------------------------------------ the core (reactor valve)
  FF7.defineMap('md5_core', {
    name: 'Reactor No.5 Core', area: 'Midgar', theme: 'reactor', music: 'reactor', look: REACTOR_LOOK,
    battle: { table: 'reactor5_pipes', bg: 'reactor', rate: 1.3 },
    grid: [
      "#############################",
      "#yy*********zzzzz*********yy#",
      "#yy*********zzzzz*********yy#",
      "#PPPP.......zzzzz...........#",
      "#...........zzzzz.......M...#",
      "#...........zzzzz...........#",
      "#...........................#",
      "#####+#######################",
    ],
    entries: { from_lower: [5, 6, 'up'] },
    exits: [{ at: [5, 7], to: 'md5_lower', entry: 'from_core' }],
    objects: [
      { at: [14, 1], if: s => !s.flag('c2_md5_bomb'), talk: function* (s) {
          s.spawn('barret', 'barret', 12, 3, 'up', { name: 'Barret' });
          s.spawn('tifa', 'tifa', 16, 3, 'up', { name: 'Tifa' });
          if (!s.flag('c2_md5_vision')) {
            s.set('c2_md5_vision');
            yield s.say('barret', "This is it. Slap the bomb on that valve, same as last time.");
            yield s.say('cloud', "(......This feeling again. The Mako... it's pulling at something...)");
            s.music('whoareyou');
            s.flash('#ffffff', 20, 0.8);
            s.shake(2, 30);
            yield s.caption('"Papa...? ......Papa!"', { hold: 90, bg: 'rgba(0,0,0,0.7)' });
            yield s.caption('"Sephiroth... Did you do this?"', { hold: 90, bg: 'rgba(0,0,0,0.7)' });
            yield s.caption('"SOLDIER... Shinra... the reactors...\nI hate them. I hate every one of them!"', { hold: 130, bg: 'rgba(0,0,0,0.75)' });
            s.flash('#ffffff', 16, 0.6);
            yield s.face('tifa', 'player');
            yield s.say('tifa', "{CLOUD}? What's wrong? You're white as a sheet.");
            yield s.face('player', 'tifa');
            yield s.say('cloud', "......Tifa. ......No. It's nothing.");
            yield s.say('tifa', "......");
            yield s.say('barret', "Oi! Daydreamin' on the job again? Set the damn bomb!");
            s.music('reactor');
          }
          const c = yield s.ask(null, 'Set the bomb?', ['Set it', 'Not yet']);
          if (c !== 0) { s.remove('barret'); s.remove('tifa'); return; }
          s.sfx('beep');
          yield s.msg('The bomb is armed.');
          s.set('c2_md5_bomb');
          yield s.say('barret', "Done! Now let's get outta here before Shinra figures out what's goin' on.\fBack up the stairs to that elevator. We'll ride it straight to the exit this time.");
          yield s.say('tifa', "Right behind you.");
          s.remove('barret'); s.remove('tifa');
          s.music('bombing');
        } },
    ],
  });

  // ------------------------------------------------------------------ elevator
  FF7.defineMap('md5_elevator', {
    name: 'Reactor No.5 Elevator', area: 'Midgar', theme: 'reactor', music: 'bombing', look: REACTOR_LOOK,
    grid: [
      "################",
      "#MMMMMEEEEMMMMM#",
      "#.....EEEE.....#",
      "#..............#",
      "#..............#",
      "#..............#",
      "#..............#",
      "################",
    ],
    entries: { from_stairs: [7, 2, 'down'], from_entrance: [8, 2, 'down'] },
    onEnter: function* (s) {
      const up = s.entry() === 'from_stairs';
      s.sfx('elevator');
      s.shake(1, 150);
      yield 50;
      if (up && !s.flag('c2_md5_lift_talk')) {
        s.set('c2_md5_lift_talk');
        s.spawn('barret', 'barret', 6, 3, 'up', { name: 'Barret' });
        s.spawn('tifa', 'tifa', 9, 3, 'up', { name: 'Tifa' });
        yield s.say('tifa', "{CLOUD}... Back there at the core. What did you see?");
        yield s.say('cloud', "......Just a headache.");
        yield s.say('tifa', "......If you say so.");
        yield s.say('barret', "Headache, huh? Don't go keelin' over when Shinra shows up. I ain't carryin' ya.");
        s.remove('barret'); s.remove('tifa');
      }
      yield 40;
      s.sfx('door_shinra');
      yield s.goto(up ? 'md5_entrance' : 'md5_stairs', 'from_elevator');
    },
  });

  // ------------------------------------------------------------------ entrance: the three-button door
  FF7.defineMap('md5_entrance', {
    name: 'Reactor No.5 Entrance', area: 'Midgar', theme: 'reactor', music: 'bombing', look: REACTOR_LOOK,
    battle: { table: 'reactor5_entrance', bg: 'reactor', rate: 1.3 },
    lights: [[4, 2, '#ff4030', 2], [14, 2, '#80ffa0', 2]],
    grid: [
      "##########################",
      "#PZPZPZPPPPPhh++hhPPPPPPP#",
      "#........................#",
      "#....................o...#",
      "#.....B..................#",
      "#EEE..............l......#",
      "#EEE.....................#",
      "##########################",
    ],
    entries: { from_elevator: [4, 5, 'right'], from_hall: [14, 2, 'down'] },
    exits: [
      { at: [1, 5, 3, 2], to: 'md5_elevator', entry: 'from_entrance', sfx: 'door_shinra' },
      { at: [14, 1, 2, 1], to: 'md5_hall', entry: 'from_entrance', sfx: 'door_shinra', if: s => s.flag('c2_door_open'),
        blocked: function* (s) {
          yield s.msg('The door is sealed tight. The control panels on the left must operate it.');
          yield s.walk('player', 0, 1);
        } },
    ],
    chests: [{ at: [22, 2], item: 'ether', id: 'md5_entrance_ether' }],
    npcs: [
      { id: 'barret', name: 'Barret', model: 'barret', at: [2, 2], dir: 'up', show: s => s.flag('c2_md5_panel') && !s.flag('c2_door_open'),
        talk: function* (s) { yield s.say('barret', "I got this one! Get on the button over on the right, an' we push 'em together!"); } },
      { id: 'tifa', name: 'Tifa', model: 'tifa', at: [4, 2], dir: 'up', show: s => s.flag('c2_md5_panel') && !s.flag('c2_door_open'),
        talk: function* (s) { yield s.say('tifa', "The last panel's yours, {CLOUD}. The one on the far right."); } },
    ],
    objects: [
      { at: [6, 1], talk: function* (s) {
          if (s.flag('c2_door_open')) { yield s.msg('The control panel hums quietly. The door is open.'); return; }
          if (!s.flag('c2_md5_panel')) { yield s.msg('A control panel with a large button. There are two more just like it.'); return; }
          yield s.say('barret', "Awright! On three, everybody push at the same time!");
          yield s.say('barret', "One......");
          let c = yield s.ask('barret', "Two......", ['Push!', 'Wait for it...']);
          if (c === 0) {
            s.sfx('error');
            yield s.say('barret', "Whoa! Too early, genius! Ya gotta push it WITH us!");
            yield s.say('tifa', "Let's try that again. Together this time.");
            return;
          }
          c = yield s.ask('barret', "THREE!", ['Push!', 'Wait for it...']);
          if (c !== 0) {
            s.sfx('error');
            yield s.say('tifa', "{CLOUD}! You were too slow!");
            yield s.say('barret', "Wake up, spiky! One more time!");
            return;
          }
          s.sfx('beep');
          yield 10;
          s.sfx('door_shinra');
          s.shake(2, 20);
          s.set('c2_door_open');
          yield s.msg('Three buttons click at once. The door grinds open.');
          yield s.say('barret', "Hah! Teamwork, baby!");
          yield s.say('tifa', "The exit should be close. Let's go!");
          s.hide('barret'); s.hide('tifa');
        } },
      { at: [2, 1], talk: function* (s) { yield s.msg("Barret's control panel."); } },
      { at: [4, 1], talk: function* (s) { yield s.msg("Tifa's control panel."); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c2_md5_panel') || s.entry() !== 'from_elevator') return;
      s.set('c2_md5_panel');
      s.spawn('barret', 'barret', 5, 5, 'up', { name: 'Barret' });
      s.spawn('tifa', 'tifa', 5, 6, 'up', { name: 'Tifa' });
      yield [s.move('barret', [[8, 4], [13, 2]]), s.move('tifa', [[9, 5], [15, 2]])];
      s.sfx('error');
      yield s.say('barret', "The exit's right here! ...Locked?! Figures!");
      yield s.face('tifa', 'left');
      yield s.say('tifa', "Look over there. Three control panels... I bet they all have to be pushed at the same time.");
      yield s.say('barret', "Three of us, three buttons. Everybody grab one!");
      yield [s.move('barret', [[8, 3], [2, 2]]), s.move('tifa', [[8, 3], [4, 2]])];
      // swap the walk-on actors for the map's NPCs (which have their own talk scripts)
      s.remove('barret'); s.remove('tifa');
      s.show('barret', 2, 2, 'up');
      s.show('tifa', 4, 2, 'up');
    },
  });

  // ------------------------------------------------------------------ the hall (save point)
  FF7.defineMap('md5_hall', {
    name: 'Reactor No.5 Exit Hall', area: 'Midgar', theme: 'reactor', music: 'bombing', look: REACTOR_LOOK,
    camera: { yaw: 35, pitch: 58, dist: 10 },   // diagonal, high view like 01-midgar_050 (east side open)
    grid: [
      "####################### ",
      "#PPPPPPPPPP++PPPPPPPPPP ",
      "#...................... ",
      "#..l.......S........l.. ",
      "#o...................o. ",
      "#...................... ",
      "###########++########## ",
    ],
    entries: { from_entrance: [11, 5, 'up'], from_bridge: [12, 2, 'down'] },
    exits: [
      { at: [11, 6, 2, 1], to: 'md5_entrance', entry: 'from_hall', sfx: 'door_shinra' },
      { at: [11, 1, 2, 1], to: 'md5_bridge', entry: 'from_hall', sfx: 'door_shinra' },
    ],
    onEnter: function* (s) {
      if (s.flag('c2_md5_hall')) return;
      s.set('c2_md5_hall');
      yield s.say('cloud', "(The way out is just ahead... It's too quiet.)");
    },
  });

  // ------------------------------------------------------------------ the bridge: President Shinra & Air Buster
  FF7.defineMap('md5_bridge', {
    name: 'Reactor No.5 Bridge', area: 'Midgar', theme: 'reactor', music: 'none',
    look: { sky: ['#01030a', '#0a1830'], fog: { color: [0.02, 0.04, 0.08], near: 10, far: 30 } },
    camera: { dist: 11, pitch: 46 },
    lights: [[9, 2, '#ffe0a0', 3], [25, 2, '#ffe0a0', 3], [9, 5, '#ffe0a0', 3], [25, 5, '#ffe0a0', 3]],
    grid: [
      "XXXXXXXXXX               XXXXXXXXX",
      "hhhhh++hhh               hhhhhhhhh",
      "P........l               l.......P",
      "P.........zzzzzzzzzzzzzzz........P",
      "P.........zzzzzzzzzzzzzzz........P",
      "PP.......l               l......PP",
      "..........               .........",
      "##########               #########",
      "                                  ",
    ],
    entries: { from_hall: [5, 2, 'down'] },
    exits: [{ at: [5, 1, 2, 1], to: 'md5_hall', entry: 'from_bridge', sfx: 'door_shinra' }],
    onLoad: function (s) {
      if (s.flag('c2_trap')) return;
      s.spawn('barret', 'barret', 4, 2, 'down', { name: 'Barret' });
      s.spawn('tifa', 'tifa', 6, 2, 'down', { name: 'Tifa' });
    },
    onEnter: function* (s) {
      if (!s.flag('c2_trap')) yield* FF7.story.c2_presidentTrap(s);
    },
  });

  FF7.story.c2_presidentTrap = function* (s) {
    s.set('c2_trap');
    yield [s.move('player', 8, 3), s.move('barret', 7, 4), s.move('tifa', 8, 4)];
    yield s.say('barret', "Awright, we're out! Now all we gotta do is—");
    s.sfx('alarm');
    s.shake(2, 30);
    s.spawn('sw1', 'soldier', 5, 2, 'down', { name: 'Soldier' });
    s.spawn('sw2', 'soldier', 6, 2, 'down', { name: 'Soldier' });
    s.spawn('se1', 'soldier', 33, 3, 'left', { name: 'Soldier' });
    s.spawn('se2', 'soldier', 33, 4, 'left', { name: 'Soldier' });
    s.spawn('se3', 'soldier', 32, 2, 'left', { name: 'Soldier' });
    yield [s.run('sw1', 3, 3), s.run('sw2', 3, 4), s.run('se1', 20, 3), s.run('se2', 20, 4), s.run('se3', 26, 2)];
    s.face('player', 'right');
    yield s.say('tifa', "Soldiers! On both sides!");
    yield s.say('barret', "A trap! They were waitin' for us the whole time!");
    s.music('shinra');
    s.spawn('president', 'president', 33, 3, 'left', { name: 'President Shinra' });
    yield [s.cam(16, 3, 60), s.move('president', 23, 3)];
    yield s.say('president', "Well, well. So these are the vermin who blew up my reactor.");
    yield s.say('barret', "President Shinra?! What're YOU doin' here?!");
    yield s.say('president', "You must be AVALANCHE. I confess, I pictured something rather more... impressive.\fStill, I wanted a look at the people who think they can save the Planet with bombs.");
    yield s.say('barret', "Shinra's the one killin' this Planet! You're bleedin' it dry with them reactors, an' people are sufferin' for it!");
    yield s.say('president', "Suffering? Mako lights your homes. Mako runs your trains. Mako keeps this entire city breathing.\fAnd what have you given Midgar? Rubble. And a few more funerals.");
    yield s.say('tifa', "......!");
    yield s.say('president', "And you... Those eyes. A SOLDIER, playing hired muscle for a band of fanatics? How far some people fall.");
    yield s.say('cloud', "......I left SOLDIER. I've got nothing to do with you people.");
    yield s.say('president', "Hmph. It makes no difference to me what you call yourself.\fNow, I'm afraid I have a dinner engagement, and you're making me late. I'll leave you in the capable hands of our newest product.");
    s.sfx('helicopter');
    s.shake(1, 150);
    yield s.say('barret', "Hey! Get back here, ya coward!");
    yield s.move('president', 33, 3);
    s.hide('president');
    yield s.say('President Shinra', "Do give it a thorough field test. Farewell!", { pos: 'top' });
    yield [s.run('sw1', [[5, 3], [5, 2]]), s.run('sw2', [[6, 3], [6, 2]]), s.run('se1', 33, 3), s.run('se2', 33, 4), s.run('se3', 33, 2)];
    ['sw1', 'sw2', 'se1', 'se2', 'se3', 'president'].forEach(id => s.remove(id));
    s.music('none');
    s.sfx('alarm_long');
    yield 30;
    s.spawn('airbuster', { enemy: 'air_buster' }, 17, 3, 'left', { name: 'Air Buster' });
    s.shake(7, 30);
    s.sfx('hit');
    yield s.say('tifa', "What is THAT?!");
    yield s.say('barret', "Some kinda... war machine!");
    yield [s.move('barret', 13, 3), s.move('tifa', 13, 4), s.move('player', 14, 3)];
    yield s.jump('player', 20, 3, 1.4, 34);
    yield s.camFollow(30);
    yield s.face('player', 'left');
    yield s.say('cloud', "I'll hit it from behind. Keep it busy from the front!");
    const r = yield s.battle({ table: 'boss_air_buster', bg: 'reactor', music: 'boss', noEscape: true });
    // ---- after the battle: Air Buster's death throes take the bridge with it
    s.set('c2_air_buster_beaten');
    yield s.say('barret', "Hah! Scrap metal! That's what ya get!");
    s.emote('airbuster', '!!');
    s.sfx('alarm_short');
    yield s.say('tifa', "Wait, it's still moving! {CLOUD}, get away from it!");
    s.flash('#ffffff', 24, 1);
    s.sfx('bosskill');
    s.shake(9, 60);
    s.remove('airbuster');
    for (let x = 15; x <= 19; x++) { s.block(x, 3); s.block(x, 4); }
    s.place('player', 19, 4, 'up');
    s.anim('player', 'climb');
    yield 50;
    yield s.say('tifa', "{CLOUD}!!");
    yield s.run('tifa', 14, 4);
    yield s.say('cloud', "......Ngh...!");
    yield s.say('barret', "{CLOUD}! You still with us?!");
    // FF7 date points: staying strong (Barret +2) or letting it show (Barret -3, Tifa +1)
    const DP = [{ barret: 2 }, { barret: -3, tifa: 1 }];
    const c = yield s.ask('cloud', '', ['(Stay strong. Hold on.)', "(Can't... hang on much longer...)"], { noQuotes: true, date: DP });
    FF7.story.datePts(s, DP[c]);
    if (c === 1) yield s.say('tifa', "{CLOUD}, don't let go! Please!");
    yield s.say('barret', "Hang on! We're comin' over there—");
    yield s.say('cloud', "Don't! The whole bridge is coming apart!\fGo! Get out of here, both of you!");
    yield s.say('tifa', "No! I'm not leaving you here!");
    yield s.say('cloud', "......I'll be fine. Just go!");
    s.shake(4, 40);
    s.sfx('hit');
    yield s.say('barret', "......Dammit! Tifa, c'mon, the whole thing's gonna fall!\f{CLOUD}! Ya better not die on us, ya hear me?!");
    yield 30;
    yield s.say('cloud', "(......My grip... I can't...)");
    s.stopAnim('player');
    s.sfx('falling');
    yield s.jump('player', 19, 8, 0.4, 34);
    s.hide('player');
    yield s.say('tifa', "{CLOUD}——!!", { pos: 'top' });
    // Barret and Tifa are left behind on the plate. Chapter 3 starts with Cloud alone.
    s.leave('barret');
    s.leave('tifa');
    s.set('c2_fell');
    yield s.fadeOut(70, '#ffffff');
    yield s.caption('Cloud falls from the plate, down through the dark,\ntoward the slums of Sector 5 far below...', { hold: 170, bg: '#000' });
    yield s.goto('s5_church', 'from_fall');
  };
})();
