// Chapter 3 (part 4) — the climb up the wire hanging from the collapsed Sector 7 plate, behind
// Don Corneo's mansion: battery sockets (a propeller bridge, a barricade bridge, an optional
// socket hiding an Ether), the swinging bar, and the arrival at Shinra HQ (handoff to Chapter 4).
(function () {
  const C3 = FF7.c3 = FF7.c3 || {};

  // Battery socket: uses one Battery (bought from the Wall Market weapon shop after the plate fell).
  C3.socket = (flag, onPower, idle, empty) => function* (s) {
    if (s.flag(flag)) { yield s.msg(idle); return; }
    yield s.msg(empty);
    if (!s.has('battery')) {
      yield s.say('barret', "Dead as a doornail. Needs juice... Didn't that guy at the weapon shop say somethin' about batteries?");
      return;
    }
    const c = yield s.ask(null, 'Put a Battery in the socket?', ['Use a Battery', 'Not now']);
    if (c !== 0) return;
    s.take('battery');
    s.set(flag);
    s.sfx('learn'); s.shake(2, 40);
    yield* onPower(s);
  };

  // ================================================================== the bottom of the wire
  const WB = [
    "###################+####",
    "#xxxxxxxxxxxxxxxxxxHxxx#",
    "#xxx            ......x#",
    "#xxx .......M   ......x#",
    "#xxx ........KKK......x#",
    "#xxx ........   ......x#",
    "#xxx ........   ......x#",
    "#xxx   H               #",
    "#x.........  xxxxxxxxxx#",
    "#x.........  xxxxxxxxxx#",
    "#x....o....  xxxxxxxxxx#",
    "#x.........  xxxxxxxxxx#",
    "#xx H      xxxxxxxxxxxx#",
    "#......................#",
    "#.....B.........o......#",
    ".......................#",
    "#......................#",
    "########################",
  ];
  const PROP = [[13, 4], [14, 4], [15, 4]];
  const wireLook = { sky: ['#0c0808', '#3a2018'], fog: { color: [0.08, 0.05, 0.04], near: 8, far: 22 }, wall: '#5a5048', wallH: 3.2 };
  FF7.defineMap('wire_base', {
    name: 'Collapsed Plate - Wire', area: 'Midgar', theme: 'midgar', music: 'anxious', look: wireLook,
    grid: WB,
    heights: C3.hm(WB, [[16, 2, 6, 5, 6], [5, 3, 8, 4, 6], [13, 4, 3, 1, 6], [2, 8, 9, 4, 3], [7, 7, 1, 1, 4], [4, 12, 1, 1, 1], [19, 1, 1, 1, 8], [19, 0, 1, 1, 9]]),
    lights: [[12, 3, '#80c0ff', 2]],
    entries: { from_wm: [1, 15, 'right'], from_upper: [19, 2, 'down'] },
    exits: [
      { at: [0, 15, 1, 1], to: 'corneo_gate', entry: 'from_wire' },
      { at: [19, 0, 1, 1], to: 'wire_upper', entry: 'from_below' },
    ],
    triggers: [
      { at: [12, 3], on: 'talk',
        run: C3.socket('c3_socket1', function* (s) {
          PROP.forEach(([x, y]) => s.block(x, y, false));
          yield s.msg('The rusted propeller shudders, spins... and stops dead, its blade lying level across the gap.\nIt is just wide enough to walk across!');
          yield s.say('tifa', "It won't hold forever. Let's hurry across!");
        }, 'The propeller blade lies level across the gap, humming faintly.',
        'An old socket wired to the huge propeller beside it. It looks like it takes a battery.') },
      { at: [13, 4], if: s => !s.flag('c3_socket1'), on: 'talk',
        run: function* (s) { yield s.msg("A rusted propeller blade hangs down into the dark. There's no way across."); } },
    ],
    onLoad: function (s) { if (!s.flag('c3_socket1')) PROP.forEach(([x, y]) => s.block(x, y, true)); },
    onEnter: function* (s) {
      if (s.flag('c3_wire_start')) return;
      s.set('c3_wire_start');
      s.spawn('barret', 'barret', 3, 15, 'right', { name: 'Barret' });
      s.spawn('tifa', 'tifa', 2, 14, 'right', { name: 'Tifa' });
      yield s.say('barret', "So this is it, huh? The whole damn plate, just... lyin' here in pieces.");
      yield s.say('tifa', "The wire goes all the way up. If we follow the wreckage, we should come out on the plate near the Shinra building.");
      yield s.say('barret', "Some of this junk's still wired to old machinery. Might need to give it a jolt to get across.\fAeris... Hang on. We're comin'.");
      s.remove('barret');
      s.remove('tifa');
    },
  });

  // ================================================================== the upper wreckage
  const WU = [
    "##################+#####",
    "#xxM...xxxxxxxxxxxHxxxx#",
    "#xx....xxxxxxxxxxxHxxxx#",
    "#xxxxHxxxx    ........x#",
    "#x........    ........x#",
    "#x........    ........x#",
    "#x...o....    ....B...x#",
    "#x........    ........x#",
    "#x........    ........x#",
    "#x........    xxxxxxxxx#",
    "#xxxH xxxxxxxxxxxxxxxxx#",
    "#x......    M.........x#",
    "#x......    ..........x#",
    "#x......KKKK..........x#",
    "#x......    ..........x#",
    "#x......    ..........x#",
    "#xxxxxxxxxxxxxxxxxx+xxx#",
    "########################",
  ];
  const BARRICADE = [[8, 13], [9, 13], [10, 13], [11, 13]];
  FF7.defineMap('wire_upper', {
    name: 'Collapsed Plate - Wire', area: 'Midgar', theme: 'midgar', music: 'anxious', look: wireLook,
    grid: WU,
    heights: C3.hm(WU, [[3, 1, 4, 2, 8], [5, 3, 1, 1, 6], [2, 4, 8, 6, 4], [4, 10, 1, 1, 2], [14, 3, 8, 6, 4], [18, 2, 1, 1, 6], [18, 1, 1, 1, 8], [18, 0, 1, 1, 9]]),
    lights: [[12, 11, '#80c0ff', 2], [3, 1, '#80c0ff', 2]],
    entries: { from_below: [19, 15, 'up'] },
    exits: [
      { at: [19, 16, 1, 1], to: 'wire_base', entry: 'from_upper' },
      { at: [18, 0, 1, 1], run: function* (s) { yield* FF7.story.c3_wireTop(s); } },
    ],
    triggers: [
      { at: [12, 11], on: 'talk',
        run: C3.socket('c3_socket2', function* (s) {
          BARRICADE.forEach(([x, y]) => s.block(x, y, false));
          yield s.msg('Gears grind somewhere below. A section of barricade tips over with a crash, landing across the gap like a bridge!');
        }, 'The fallen barricade makes a rickety bridge to the west.',
        'A socket wired to an old barricade mechanism. It takes a battery.') },
      { at: [3, 1], on: 'talk',
        run: C3.socket('c3_socket3', function* (s) {
          yield s.msg('A small hatch in the machine pops open with a clank. Something was stashed inside!');
          yield s.give('ether');
        }, 'The hatch hangs open. Nothing else inside.',
        'A little machine with a battery socket. There seems to be a hatch on the front.') },
      { at: [9, 7], run: function* (s) {
          yield s.msg('A steel bar dangles from a cable over the gap, swinging slowly back and forth.');
          const c = yield s.ask(null, 'Jump for the bar?', ['Jump... now!', 'Wait']);
          if (c !== 0) { s.place('player', 8, 7, 'right'); return; }
          s.anim('player', 'jump');
          yield s.jump('player', 15, 7, 1.4, 44);
          s.stopAnim('player');
          if (!s.flag('c3_swing_talk')) { s.set('c3_swing_talk'); yield s.say('barret', "Whoo! Now THAT'S how you cross a gap!"); }
        } },
      { at: [14, 7], run: function* (s) {
          const c = yield s.ask(null, 'Swing back across on the bar?', ['Swing back', 'Stay']);
          if (c !== 0) { s.place('player', 15, 7, 'right'); return; }
          yield s.jump('player', 8, 7, 1.4, 44);
        } },
    ],
    onLoad: function (s) { if (!s.flag('c3_socket2')) BARRICADE.forEach(([x, y]) => s.block(x, y, true)); },
  });

  FF7.story.c3_wireTop = function* (s) {
    s.set('c3_wire_done');
    s.spawn('barret', 'barret', 17, 3, 'up', { name: 'Barret' });
    s.spawn('tifa', 'tifa', 19, 3, 'up', { name: 'Tifa' });
    s.place('player', 18, 1, 'up');
    s.music('none');
    yield s.fadeOut(20);
    yield s.caption("Above the wreckage, the plate stretches out under a cold, starless sky.\nAt its center, lit from within like a giant tombstone,\nstands the Shinra Building.", { hold: 220, bg: '#000' });
    yield s.say('barret', "......There it is. Shinra Headquarters.");
    yield s.say('tifa', "Aeris is somewhere inside that thing.");
    yield s.say('barret', "Biggs. Wedge. Jessie. Everybody in Sector 7... This one's for them.\fAnd we're gettin' that flower girl back, no matter what!");
    yield s.say('cloud', "......Let's go.");
    s.remove('barret');
    s.remove('tifa');
    s.party(['cloud', 'barret', 'tifa']);
    yield s.goto('shinra_plaza', 'from_wire');
  };
})();
