// Chapter 1 — Opening: the Mako Reactor No.1 bombing mission, the escape through Sector 8 and
// the train ride to Sector 7. (Dialogue paraphrased; see docs/SCRIPTING.md.)
(function () {
  // ------------------------------------------------------------------ new game
  FF7.story.newGameSetup = function (st) {
    if (st.chars.cloud) st.chars.cloud.name = 'Ex-SOLDIER';   // FF7: named at the reactor gate
    st.gil = 0;
    st.items = [];
    st.party = ['cloud', null, null];
    st.menuEnabled = true;
    st.phsEnabled = false;
  };
  FF7.story.begin = function () {
    FF7.field.start('md1_platform', 'start');
  };

  // Config > AVALANCHE Scenes (not in the PS1 game): Jessie comes along from the reactor door to Sector 8
  const AV = () => FF7.state.config.avalancheScenes !== false;
  FF7.story.c1_jessieIn = (s) => s.flag('c1_jessie_party') && s.isMember('jessie');

  // a sliding door object (js/field/tiles.js reactorgatedoors) opening (to 1) or shutting (to 0) over n frames
  function* slideDoor(s, id, to, n = 24) {
    const d = (s.field && s.field.objects || []).find(o => o.id === id); if (!d) return;
    const from = d.open || 0;
    for (let t = 1; t <= n; t++) { const k = t / n; d.open = from + (to - from) * k * k * (3 - 2 * k); d.stateKey = 'o' + Math.round(d.open * 40); yield 1; }
  }

  const guardTalk = (n) => function* (s) {
    if (s.get('c1_guard_potions') >= 2) { yield s.msg('Nothing else here.'); return; }
    s.inc('c1_guard_potions');
    yield s.give('potion');
  };

  // ------------------------------------------------------------------ Sector 1 station
  FF7.defineMap('md1_platform', {
    name: 'Sector 1 Station', area: 'Midgar', theme: 'station',
    music: s => s.flag('c1_intro_done') ? 'bombing' : null,
    battle: { table: 'reactor1_outside', bg: 'train', rate: 0.6, if: s => s.flag('c1_intro_done') && !s.flag('c1_escape') },
    // 01-midgar_004: the platform runs north along the stopped train (east), a concrete wall on the west;
    // the camera sits low behind Cloud looking up the platform to the way out at the north end.
    look: { floor2: ['#8a7a2c', '#6a5e24'] },
    camera: { pitch: 35, dist: 8 },
    // the stopped train: the Midgar train model (js/gl/vehicles.js, the one the overpass escape and Sector 7 use)
    // on its track beside the platform, the track bed (q) out of bounds
    legend: { q: 'block' },
    props: [{ at: [8.5, 22], prop: 'track', len: 20, rot: 90 }],
    objects: [{ id: 'md1_train', at: [8.5, 11], model: { vehicle: 'train', opts: { cars: 1 } }, dir: 'up' }],
    lights: [[4, 4, '#ffe0a0', 3], [4, 10, '#ffe0a0', 3], [4, 16, '#ffe0a0', 3], [4, 21, '#ffe0a0', 3]],
    grid: [
      "X......XXXXX",
      "#......:BB#X",
      "#......:BB#X",
      "#......:qq#X",
      "#l.....:qq#X",
      "#......:qq#X",
      "#......:qq#X",
      "#B.....:qq#X",
      "#......:qq#X",
      "#......:qq#X",
      "#l.....:qq#X",
      "#......:qq#X",
      "#......:qq#X",
      "#oB....:qq#X",
      "#......:qq#X",
      "#......:qq#X",
      "#l.....:qq#X",
      "#......:qq#X",
      "#......:qq#X",
      "#v.....:qq#X",
      "#......:qq#X",
      "#l.....:qq#X",
      "#......:qq#X",
      "############",
    ],
    entries: { start: [6, 17, 'up'], from_gate: [4, 1, 'down'] },
    exits: [{ at: [1, 0, 6, 1], to: 'md1_gate', entry: 'from_platform' }],
    npcs: [
      { id: 'guard1', name: 'Guard', model: 'soldier', at: [6, 11], dir: 'down', anim: 'lie', talk: guardTalk(1), show: s => s.flag('c1_intro_done') },
      { id: 'guard2', name: 'Guard', model: 'soldier', at: [4, 10], dir: 'left', anim: 'lie', talk: guardTalk(2), show: s => s.flag('c1_intro_done') },
    ],
    triggers: [
      { id: 'mp_ambush', at: [1, 5, 6, 1], once: true, if: s => s.flag('c1_intro_done'),
        run: function* (s) {
          s.spawn('mpA', 'mp', 3, 1, 'down'); s.spawn('mpB', 'mp', 5, 1, 'down');
          yield [s.run('mpA', 3, 3), s.run('mpB', 5, 3)];
          yield s.say('Shinra MP', "Halt! Intruder!");
          const r = yield s.battle({ enemies: ['mp', 'mp'], bg: 'train', music: 'battle', noEscape: true });
          s.remove('mpA'); s.remove('mpB');
        } },
    ],
    onEnter: function* (s) {
      if (s.flag('c1_intro_done')) return;
      // --- Opening: the train pulls into Sector 1 and AVALANCHE jumps out
      s.music('none');
      yield s.movie('opening', { text: 'Midgar.\nThe city of Mako, built on a plate high above the slums.\nA train rolls into Sector 1 station...' });
      s.music('bombing', { fadeIn: 0 });   // the FMV carries the opening prelude; Bombing Mission starts as it ends
      s.hide('player');
      s.spawn('guard1', 'soldier', 6, 11, 'down', { name: 'Guard' });
      s.spawn('guard2', 'soldier', 4, 11, 'down', { name: 'Guard' });
      s.spawn('jessie', 'jessie', 6, 19, 'up', { name: 'Jessie' });
      s.spawn('biggs', 'biggs', 5, 20, 'up', { name: 'Biggs' });
      s.spawn('wedge', 'wedge', 6, 21, 'up', { name: 'Wedge' });
      s.spawn('barret', 'barret', 4, 21, 'up', { name: 'Barret' });
      yield s.fadeIn(40);
      yield 20;
      // the guards are taken down
      yield [s.run('jessie', 6, 12), s.run('biggs', 4, 12)];
      s.anim('guard1', 'hurt'); s.sfx('hit');
      yield 8;
      s.anim('guard2', 'hurt'); s.sfx('hit');
      yield 10;
      s.anim('guard1', 'lie'); s.anim('guard2', 'lie');
      s.place('guard1', 6, 11); s.place('guard2', 4, 10);
      yield 20;
      yield [s.run('jessie', [[5, 9], [5, 4]]), s.run('biggs', [[3, 11], [3, 5]]), s.run('wedge', [[5, 14], [2, 12], [2, 4]])];
      yield [s.run('jessie', 4, 0, { noWait: true }), s.run('biggs', 4, 0, { noWait: true }), s.run('wedge', 4, 0, { noWait: true })];
      yield 30;
      s.hide('jessie'); s.hide('biggs'); s.hide('wedge');
      // Cloud drops from the train roof
      s.show('player', 8.5, 17, 'left');
      const pl = s.field && s.field.player; if (pl) pl.hover = 1.64;   // (on the car's roof)
      yield [s.jump('player', 6, 17, 0.5, 26), s.hover('player', 0, 26)];
      yield 10;
      yield s.move('barret', 5, 18);
      s.face('player', 'barret');
      yield s.face('barret', 'player');
      yield s.say('barret', "Hey, newcomer! Don't just stand there gawkin'. C'mon, follow me!");
      yield s.run('barret', [[3, 12], [3, 2], [4, 0]]);
      s.hide('barret');
      s.set('c1_intro_done');
      s.music('bombing');
      s.remove('guard1'); s.remove('guard2');
      s.show('guard1'); s.show('guard2');
    },
  });

  // ------------------------------------------------------------------ reactor gate
  FF7.defineMap('md1_gate', {
    name: 'No.1 Reactor Gate', area: 'Midgar', theme: 'reactor', music: 'bombing',
    camera: { yaw: -30, pitch: 55, dist: 10 },   // the walkway seen diagonally from above (01-midgar_006); west side open
    battle: { table: 'reactor1_outside', bg: 'reactor', rate: 0.7, if: s => !s.flag('c1_escape') },
    grid: [
      " XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      " PPPPPPPP#####...#####PPPPPPPPX",
      " P............................X",
      " .......o.....................X",
      "..............................X",
      "...........................B..X",
      " ......B......................X",
      " =============================X",
      "                               ",
    ],
    // the reactor's security gate in the concrete wall (01-midgar_006): steel doors that slide into the walls
    // (js/field/tiles.js reactorgate, reactorgatedoors), shut until Jessie beats the lock
    props: [{ at: [15, 1], prop: 'reactorgate' }],
    objects: [{ id: 'gate', at: [15, 1], prop: 'reactorgatedoors',
      get open() { return FF7.state.flags.c1_gate_open ? 1 : 0; }, get unlocked() { return !!FF7.state.flags.c1_gate_open; },
      get stateKey() { return FF7.state.flags.c1_gate_open ? 'open' : 'shut'; } }],
    entries: { from_platform: [2, 4, 'right'], from_bridge: [15, 2, 'down'] },
    exits: [
      { at: [0, 4, 1, 2], to: 'md1_platform', entry: 'from_gate' },
      { at: [14, 1, 3, 1], to: 'md1_bridge', entry: 'from_gate', if: s => s.flag('c1_gate_open'),
        blocked: function* (s) { yield s.msg("The reactor gate is sealed shut."); } },
    ],
    npcs: [
      { id: 'jessie', name: 'Jessie', model: 'jessie', at: [15, 1], dir: 'up', show: s => !s.flag('c1_gate_open'),
        talk: function* (s) { yield s.say('jessie', "Almost... there. Shinra's gate locks are a joke if you know where to poke."); } },
      { id: 'biggs', name: 'Biggs', model: 'biggs', at: [12, 3], dir: 'down', show: s => !s.flag('c1_gate_open'),
        talk: function* (s) { yield s.say('biggs', "An ex-SOLDIER on our side... Can't believe it. Welcome aboard."); } },
      { id: 'wedge', name: 'Wedge', model: 'wedge', at: [19, 3], dir: 'left', show: s => !s.flag('c1_gate_open'),
        talk: function* (s) { yield s.say('wedge', "The gate'll be open in a sec. Jessie's the best there is at this stuff."); } },
    ],
    triggers: [
      { id: 'meet_team', at: [9, 2, 2, 5], once: true,
        run: function* (s) {
          s.spawn('barret', 'barret', 20, 5, 'left', { name: 'Barret' });
          yield s.move('player', 12, 4);
          yield s.face('biggs', 'player');
          yield s.say('biggs', "Whoa... so you're the ex-SOLDIER, huh? Didn't think we'd ever get one of you guys.\fName's Biggs. And you are...?");
          yield s.nameEntry('cloud');
          yield s.say('biggs', `${s.name('cloud')}, huh? Good to have you.`);
          yield s.say('cloud', "......\fI'm not interested in names.");
          yield s.face('jessie', 'player');
          yield s.say('jessie', "Hi! I'm Jessie. That's Wedge over there. Don't mind Biggs, he gets excited.");
          yield s.say('wedge', "H-hey!");
          yield s.move('barret', 16, 4);
          yield s.say('barret', "Quit yakkin' and get that gate open! We're on the clock!\fAnd YOU, newcomer... Don't go thinkin' you're somethin' special. I'm keepin' my eye on you.");
          // Jessie at the lock: a few keys, the light goes green, the doors slide into the walls
          yield s.face('jessie', 'up');
          s.anim('jessie', 'kneel');
          const gate = (s.field && s.field.objects || []).find(o => o.id === 'gate') || {};
          for (let i = 0; i < 4; i++) { yield 12; s.sfx('beep'); }
          yield 16;
          gate.unlocked = true; gate.stateKey = 'unlocked'; s.sfx('confirm');
          yield 20;
          s.sfx('gate'); s.shake(2, 20);
          for (let t = 1; t <= 40; t++) { const k = t / 40; gate.open = k * k * (3 - 2 * k); gate.stateKey = 'o' + t; yield 1; }
          gate.stateKey = 'open';
          yield s.say('jessie', "Got it! Gate's open!");
          s.stopAnim('jessie');
          s.set('c1_gate_open');
          // in through the dark doorway
          yield [s.run('jessie', 15, 0.1), s.run('biggs', [[14, 1], [14.7, 0.1]]), s.run('wedge', [[16, 1], [15.3, 0.1]])];
          s.hide('jessie'); s.hide('biggs'); s.hide('wedge');
          yield s.say('barret', "Move it! Inside, now!");
          yield s.run('barret', [[15, 1], [15, 0.1]]);
          s.remove('barret');
        } },
    ],
  });

  // ------------------------------------------------------------------ walkway / bridge
  FF7.defineMap('md1_bridge', {
    name: 'Mako Reactor No.1', area: 'Midgar', theme: 'reactor', music: 'bombing',
    battle: { table: 'reactor1_walkway', bg: 'reactor', rate: 1, if: s => !s.flag('c1_escape') },
    look: { sky: ['#000204', '#062016'] },
    grid: [
      "  XXXXXXXXXXXXXXXXXXXXXXXXX  ",
      "  hhhhhhhhhhhh+++hhhhhhhhhh  ",
      "  PP.........zzzzz.......PP  ",
      "  PP.........zzzzz.......PP  ",
      "              zzz            ",
      "              zzz            ",
      "              zzz            ",
      "   l          zzz         l  ",
      "  ............zzz..........  ",
      "  ..B.........zzz.......o..  ",
      "  hhhhhhhhhhhh+++hhhhhhhhhh  ",
    ],
    entries: { from_gate: [15, 9, 'up'], from_entrance: [15, 2, 'down'] },
    exits: [
      { at: [14, 10, 3, 1], to: 'md1_gate', entry: 'from_bridge' },
      { at: [14, 1, 3, 1], to: 'md1_entrance', entry: 'from_bridge' },
    ],
    onEnter: function* (s) {
      if (s.flag('c1_escape') || s.flag('c1_bridge_seen')) return;
      s.set('c1_bridge_seen');
      yield s.say('cloud', "(Mako Reactor No.1... Shinra's pride. Sucking the planet dry, one pipe at a time.)");
    },
  });

  // ------------------------------------------------------------------ reactor entrance
  FF7.defineMap('md1_entrance', {
    name: 'Reactor No.1 Entrance', area: 'Midgar', theme: 'reactor', music: 'bombing',
    battle: { table: 'reactor1_entrance', bg: 'reactor', rate: 0.8, if: s => s.flag('c1_barret_joined') && !s.flag('c1_escape') },
    grid: [
      "################################",
      "#PPPP#MMMMMMMM11MMMMMMMM#PPPPPP#",
      "#....#.........................#",
      "#....+.......................Z.#",
      "#....#.........................#",
      "#....#.........................#",
      "######.........................#",
      "#yyy.....................yy....#",
      "#............................|.#",
      "##############+++###############",
    ],
    // the security door to the elevator: a dark doorway ('1') behind steel doors that slide apart once Jessie
    // beats the ID scanner beside it (js/field/tiles.js reactorgatedoors)
    legend: { '1': 'doorway' },
    objects: [{ id: 'door', at: [14.5, 1], prop: 'reactorgatedoors', halfW: 0.42, h: 1.66, zOff: 0.03, pocket: true, lock: 'wall', lockY: 1.3,
      get open() { return FF7.state.flags.c1_door_open ? 1 : 0; }, get unlocked() { return !!FF7.state.flags.c1_door_open; },
      get stateKey() { return FF7.state.flags.c1_door_open ? 'open' : 'shut'; } }],
    entries: { from_bridge: [15, 8, 'up'], from_elevator: [14, 2, 'down'] },
    chests: [{ at: [2, 4], item: 'phoenix_down', id: 'md1_entrance_box' }],
    exits: [
      { at: [14, 9, 3, 1], run: function* (s) {
          if (!s.flag('c1_escape')) { yield s.goto('md1_bridge', 'from_entrance'); return; }
          yield* FF7.story.c1_reactorBlast(s);
        } },
      { at: [14, 1, 2, 1], to: 'md1_elevator', entry: 'from_entrance', sfx: 'door_shinra', if: s => s.flag('c1_door_open'),
        blocked: function* (s) { yield s.msg("The door is locked. An ID scanner blinks red."); } },
    ],
    npcs: [
      { id: 'barret', name: 'Barret', model: 'barret', at: [15, 5], dir: 'down', show: s => !s.flag('c1_barret_joined'),
        talk: function* (s) {
          yield s.say('barret', "Listen up, newcomer. This ain't a picnic. We're blowin' this reactor sky-high.\fFrom here on, you're with me. And don't try nothin'!");
          yield s.nameEntry('barret');
          s.join('barret');
          s.hide('barret');
          yield s.msg(`${s.name('barret')} joined the party.`);
          s.set('c1_barret_joined');
          yield s.say('barret', "Oh, and one more thing. Don't slow me down.");
        } },
      { id: 'jessie', name: 'Jessie', model: 'jessie', at: [14, 2], dir: 'up', show: s => !s.flag('c1_door_open'),
        talk: function* (s) {
          if (!s.flag('c1_barret_joined')) { yield s.say('jessie', "Talk to Barret first. He's got his 'leader' face on."); return; }
          yield s.face('jessie', 'up');
          yield s.say('jessie', "Give me one second... there!");
          // the scanner goes green, the doors slide apart
          const door = (s.field && s.field.objects || []).find(o => o.id === 'door');
          s.sfx('confirm');
          if (door) { door.unlocked = true; door.stateKey = 'unlocked'; }
          yield 14;
          s.sfx('door_shinra');
          if (door) { for (let t = 1; t <= 30; t++) { const k = t / 30; door.open = k * k * (3 - 2 * k); door.stateKey = 'o' + t; yield 1; } door.stateKey = 'open'; }
          s.set('c1_door_open');
          if (AV()) {
            yield s.say('jessie', "Door's open. ...And I'm coming with you. Nobody knows this reactor's wiring like I do, and that bomb's timer is my baby.");
            yield s.say('barret', "Tch. Fine. Just keep up, Jessie.");
            yield s.say('jessie', "Biggs, Wedge, you've got the door! ......{CLOUD}, try not to get us all killed, okay?");
            s.remove('jessie');
            FF7.sys.party.joinGuest('jessie', FF7.sys.party.avgLevel());
            s.party(['cloud', 'barret', 'jessie']);
            s.set('c1_jessie_party');
            yield s.msg('Jessie joined the party!');
            return;
          }
          yield s.say('jessie', "Door's open. Take the elevator down to the core. We'll hold this spot.");
          yield s.move('jessie', 18, 3);
        } },
      { id: 'biggs', name: 'Biggs', model: 'biggs', at: [8, 5], dir: 'right', show: s => !s.flag('c1_escape'),
        talk: function* (s) {
          if (s.flag('c1_escape')) return;
          yield s.say('biggs', "I'll keep watch here. Somebody check that room to the west, I thought I saw supplies.");
        } },
      { id: 'wedge', name: 'Wedge', model: 'wedge', at: [22, 6], dir: 'left', show: s => !s.flag('c1_escape'),
        talk: function* (s) { yield s.say('wedge', "M-my first reactor... I'm fine! Totally fine."); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c1_escape') && !s.flag('c1_out_msg')) {
        s.set('c1_out_msg');
        s.spawn('biggsE', 'biggs', 15, 7, 'up', { name: 'Biggs' });
        yield s.say('biggs', "You made it! C'mon, the whole place is gonna blow!");
        yield s.run('biggsE', 15, 9);
        s.remove('biggsE');
      }
    },
  });

  // ------------------------------------------------------------------ elevator
  // The car, hanging in the dark shaft: steel walls, a window at the back with the shaft going by (up past the glass on
  // the way down, down past it on the way up), the doors at the front (the cut-away near wall: the way in and out on
  // both floors). Whoever is in the party rides along beside Cloud
  FF7.defineMap('md1_elevator', {
    name: 'Reactor No.1 Elevator', area: 'Midgar', theme: 'reactor', music: 'bombing',
    camera: { pitch: 44, dist: 6.5 },
    lights: [[4, 3, '#d8ffe8', 3]],
    grid: [
      "         ",
      " ####### ",
      " #.....# ",
      " #.....# ",
      " #.....# ",
      " ##+++## ",
      "         ",
    ],
    // (the shaft going by: `target` is the car's speed, 1 down, -1 up, 0 stopped; it gets there smoothly)
    objects: [{ id: 'window', at: [4, 2], prop: 'liftwindow', phase: 0, stateKey: 'p0', speed: 0, target: 0,
      tick(o) {
        o.speed += (o.target - o.speed) * 0.05; if (!o.target && Math.abs(o.speed) < 0.003) o.speed = 0;
        o.phase = ((o.phase + o.speed * 0.022) % 1 + 1) % 1; o.stateKey = 'p' + Math.floor(o.phase * 32) % 32;
      } }],
    entries: { from_entrance: [4, 4, 'up'], from_shaft: [4, 4, 'up'] },
    onEnter: function* (s) {
      const down = s.entry() === 'from_entrance';
      const riders = (FF7.state.party || []).slice(1).filter(Boolean);   // (the leader is the player)
      riders.forEach((id, i) => s.spawn(id, id, i ? 3 : 5, 3, 'up', { name: s.name(id) }));
      const win = (s.field && s.field.objects || []).find(o => o.id === 'window') || {};
      win.target = down ? 1 : -1;
      s.sfx('elevator');
      s.shake(1, 30);
      yield 50;
      if (down && !s.flag('c1_elevator_talk')) {
        s.set('c1_elevator_talk');
        s.face('barret', 'player'); yield s.face('player', 'barret');
        yield s.say('barret', "Hey. You used to be in SOLDIER, right? Then you know what's goin' on down there.This planet's full of Mako. The life of the planet! And Shinra's suckin' it dry with these reactors.");
        yield s.say('cloud', "......I'm only here for the money. The planet's your problem.");
        yield s.say('barret', "Why you...!Hmph. We'll see how long that attitude lasts.");
      }
      s.face('barret', 'up'); s.face('player', 'up');
      yield 30;
      win.target = 0;                  // slowing down
      yield 50;
      s.shake(1, 10); s.sfx('confirm');
      yield 24;
      // out through the doors behind them
      riders.forEach(id => s.face(id, 'down'));
      yield s.face('player', 'down');
      s.sfx('door_shinra');
      yield s.walk('player', 0, 1);
      yield s.goto(down ? 'md1_shaft' : 'md1_entrance', 'from_elevator');
    },
  });

  // ------------------------------------------------------------------ the shaft (three levels)
  FF7.defineMap('md1_shaft', {
    name: 'Reactor No.1 Interior', area: 'Midgar', theme: 'reactor', music: 'bombing',
    camera: { yaw: 28 },     // angled so the stairs (stepping down to the east) show their steps
    battle: { table: 'reactor1', bg: 'reactor', rate: 1, if: s => !s.flag('c1_escape') },
    grid: [
      "##############################",
      "#111.....#PPPPPPPPP#PPPPPPPP+#",
      "#........^^........^^........#",
      "#........^^...o....^^........#",
      "#...l....^^........^^....B...#",
      "#........^^........^^........#",
      "#PPPPPPPP#PPPPPPPPP#PPPPPPPPP#",
      "##############################",
    ],
    heights: [
      "666666666633333333330000000000",
      "666666666633333333330000000000",
      "666666666543333333321000000000",
      "666666666543333333321000000000",
      "666666666543333333321000000000",
      "666666666543333333321000000000",
      "666666666633333333330000000000",
      "666666666633333333330000000000",
    ],
    // the elevator's doors in the west end's back wall (a dark doorway, '1', behind sliding steel doors): they open
    // to let the party out and shut behind it, and open again to take it back up
    legend: { '1': 'doorway' },
    objects: [{ id: 'liftdoor', at: [2, 1], prop: 'reactorgatedoors', halfW: 0.67, h: 1.66, zOff: 0.03, pocket: true, lock: 'wall', lockY: 1.15,
      unlocked: true, open: 0, stateKey: 'o0' }],
    entries: { from_elevator: [2, 2, 'down'], from_core: [28, 2, 'down'] },
    onEnter: function* (s) {
      if (s.entry() !== 'from_elevator') return;
      const d = (s.field && s.field.objects || []).find(o => o.id === 'liftdoor');
      if (d) { d.open = 1; d.stateKey = 'o40'; }
      s.place('player', 2, 1, 'down');   // (out of the doorway)
      yield s.walk('player', 0, 2);
      s.sfx('door_shinra');
      yield* slideDoor(s, 'liftdoor', 0);
    },
    items: [{ at: [15, 5], item: 'potion', id: 'md1_shaft_potion' }],
    exits: [
      { at: [1, 1, 3, 1], run: function* (s) {
          s.sfx('door_shinra');
          yield* slideDoor(s, 'liftdoor', 1, 18);
          yield s.walk('player', 0, -0.4);
          yield s.goto('md1_elevator', 'from_shaft');
        } },
      { at: [28, 1, 1, 1], to: 'md1_core', entry: 'from_shaft' },
    ],
    npcs: [
      { id: 'jessie', name: 'Jessie', model: 'jessie', at: [6, 4], dir: 'right', show: s => !s.flag('c1_escape') && !s.flag('c1_jessie_tip') && !s.flag('c1_jessie_party'),
        talk: function* (s) { yield s.say('jessie', "Careful on these stairs. The whole shaft drops straight into the core."); } },
      { id: 'jessie_stuck', name: 'Jessie', model: 'jessie', at: [13, 3], dir: 'down', anim: 'kneel', show: s => s.flag('c1_escape') && !s.flag('c1_jessie_free'),
        talk: function* (s) {
          yield s.say('jessie', "Ugh, my foot's caught in the grating! I can't get it loose!");
          s.stopAnim('jessie_stuck');
          yield s.msg(`${s.name('cloud')} pulls Jessie's foot free.`);
          s.set('c1_jessie_free');
          yield s.say('jessie', "Thanks! I owe you one. Now let's get outta here!");
          yield s.run('jessie_stuck', 3, 2);
          s.hide('jessie_stuck');
        } },
    ],
    triggers: [
      { id: 'jessie_tip', at: [5, 2, 3, 4], once: true, if: s => !s.flag('c1_escape') && !s.flag('c1_jessie_party'),
        run: function* (s) {
          yield s.say('jessie', "The core's at the very bottom. Barret's waiting down there with the bomb... go on, I'll cover the elevator.");
          s.set('c1_jessie_tip');
          yield s.run('jessie', 3, 2);
          s.hide('jessie');
        } },
    ],
  });

  // ------------------------------------------------------------------ the core
  // After 01-midgar_013 / 014 (and backgrounds/ff7art31.jpg): a single narrow railed catwalk runs along the huge teal
  // core casing to the valve at its end - the bronze gear-wheel hatch the pipes come down into, where the bomb goes.
  // Beside it the pit drops away into the dark, the mako glowing far below, and a huge pipe runs alongside. The
  // landing at its start has the save point. The camera looks along it diagonally.
  FF7.defineMap('md1_core', {
    name: 'Reactor No.1 Core', area: 'Midgar', theme: 'reactor', music: 'bombing',
    look: { floor3: ['#2a6a6a', '#286464'], wall: '#2a6060', wallTop: '#0a1a1a', floor2: ['#3a4448', '#363e42'], sky: ['#020605', '#06140f'], mako: '#1f8a58' },
    camera: { yaw: 35, pitch: 50, dist: 9 },
    battle: { table: 'reactor1_lower_pipes', bg: 'reactor', rate: 0.8, if: s => !s.flag('c1_bomb_set') },
    lights: [[5, 2, '#ffd8a0', 2.5], [9, 6, '#40ff90', 4], [9, 14, '#40ff90', 4], [6, 18, '#c0ffe0', 2.5]],
    legend: { q: 'block' },
    grid: [
      "hhhhhhhhhhhhhhhh",
      "hhh =qq=        ",
      "hhh =zz=        ",
      "hhh =zz=        ",
      "hhh =zz=        ",
      "hhh =zz=        ",
      "hhh =zz=        ",
      "hhh =zz=        ",
      "hhh =zz=        ",
      "hhh =zz=        ",
      "hhh =zz=        ",
      "hhh =zz=        ",
      "hhh =zz=        ",
      "hhh =zz=        ",
      "hhh =zz=        ",
      "hhh =zz=        ",
      "hhh==zz===      ",
      "hhhggggggg=     ",
      "hhhgSggggg=     ",
      "hhhggggggg=     ",
      "hhhggggggB=     ",
      "hhh  +          ",
    ],
    props: [
      { at: [5.5, 1], prop: 'corevalve' },
      { at: [9, 15], prop: 'corepipe', len: 17, rot: 90, r: 0.75, y0: -0.6 },
      { at: [8, 10], prop: 'makopit', w: 22, d: 34, y0: -14, col: '#0e4a2e' },
    ],
    heights: [
      "9999999999999999",
      "9990555500000000",
      "9990555500000000",
      "9990555500000000",
      "9990555500000000",
      "9990555500000000",
      "9990555500000000",
      "9990555500000000",
      "9990555500000000",
      "9990555500000000",
      "9990555500000000",
      "9990555500000000",
      "9990555500000000",
      "9990555500000000",
      "9990555500000000",
      "9990555500000000",
      "9995555555000000",
      "9995555555500000",
      "9995555555500000",
      "9995555555500000",
      "9995555555500000",
      "5555555555555555",
    ],
    entries: { from_shaft: [5, 20, 'up'] },
    items: [{ at: [9, 19], materia: 'restore', id: 'md1_core_restore' }],
    exits: [{ at: [5, 21, 1, 1], to: 'md1_shaft', entry: 'from_core' }],
    npcs: [
      { id: 'barret', name: 'Barret', model: 'barret', at: [7, 18], dir: 'up', show: s => !s.flag('c1_bomb_set'),
        talk: function* (s) { yield s.say('barret', "The bomb goes on the core, at the far end of the walkway.Go on, Mr. SOLDIER. Walk up there and set it!"); } },
    ],
    triggers: [
      // reaching the end of the walkway, right in front of the core, starts the scene (as in FF7)
      { id: 'core_reached', at: [5, 2, 2, 2], once: false, if: s => !s.flag('c1_bomb_set') && !s.flag('c1_core_declined'),
        run: function* (s) { yield* FF7.story.c1_setBomb(s); } },
      { id: 'core_rearm', at: [5, 5, 2, 2], once: false, if: s => s.flag('c1_core_declined'), run: function* (s) { s.unset('c1_core_declined'); } },
    ],
    objects: [
      { at: [5, 1], if: s => !s.flag('c1_bomb_set'), talk: function* (s) { yield* FF7.story.c1_setBomb(s); } },
      { at: [6, 1], if: s => !s.flag('c1_bomb_set'), talk: function* (s) { yield* FF7.story.c1_setBomb(s); } },
    ],
  });

  // Planting the bomb on Reactor No.1's core, then Guard Scorpion
  FF7.story.c1_setBomb = function* (s) {
    {
        if (!s.flag('c1_core_talk')) {
          s.set('c1_core_talk');
          yield s.say('cloud', "(This... this is what's left of the planet's life. Glowing green, pumped out like oil.)");
          yield 20;
          yield s.say('cloud', "(...Hm? Something's... My head...)");
          s.flash('#ffffff', 20, 0.6);
          yield s.caption('"Watch out... This isn\'t just a reactor..."', { hold: 110, bg: 'rgba(0,0,0,0.6)' });
          yield s.say('barret', "Oi! Spacin' out on me? Hurry up and set it!");
        }
        const c = yield s.ask(null, 'Set the bomb?', ['Set it', 'Not yet']);
        if (c !== 0) { s.set('c1_core_declined'); return; }
        s.sfx('beep');
        yield s.msg('The bomb is armed.');
        s.set('c1_bomb_set');
        s.shake(4, 40); s.sfx('alarm');
        yield s.say('barret', "Somethin's comin'!");
        s.spawn('scorp', { enemy: 'guard_scorpion' }, 5, 7, 'up');
        yield s.move('player', 5, 3, { noWait: true });
        yield 40;
        const r = yield s.battle({ enemies: ['guard_scorpion'], bg: 'reactor', music: 'bombing', noEscape: true });
        s.remove('scorp');
        s.show('barret', 6, 4, 'up');
        yield s.say('barret', "Hah! Scrap metal! Now let's get the hell outta here before this place blows!");
        yield s.say('barret', "Ten minutes on the clock. MOVE!");
        s.hide('barret');
        s.set('c1_escape');
        s.music('hurry');
        s.timer(600);
    }
  };

  // ------------------------------------------------------------------ the blast
  FF7.story.c1_reactorBlast = function* (s) {
    s.timer(null);
    yield s.fadeOut(20);
    s.music('none');
    yield s.movie('reactor1_blast', { text: 'The bomb goes off.\nMako Reactor No.1 erupts in a pillar of green fire,\nand the blast shakes the whole of Midgar.' });
    yield s.goto('md8_plaza', 'start');
  };

  // ------------------------------------------------------------------ Sector 8
  FF7.defineMap('md8_plaza', {
    name: 'Sector 8', area: 'Midgar', theme: 'midgar', music: 'bombing',
    camera: { pitch: 66, dist: 11 },   // the plaza seen almost from above (01-midgar_022)
    look: { sky: ['#140404', '#3a1408'], fog: { color: [0.16, 0.06, 0.03], near: 9, far: 24 } },
    lights: [[9, 3, '#ff8030', 4], [23, 6, '#ff8030', 3]],
    grid: [
      "XXhhhhhhhwhhhhhhhhhhhwhhhhhhhXX",
      "Xh...........................hX",
      "Xh....x..............l.......hX",
      "Xh...........................hX",
      "X..............f............. X",
      "X.............fOf..........x. X",
      "X..............f..............X",
      "Xh.....l..............B......hX",
      "Xh...........................hX",
      "Xhhhhhhhhhhhh.....hhhhhhhhhhhhX",
    ],
    entries: { start: [15, 3, 'down'] },
    exits: [{ at: [13, 9, 5, 1], to: 'md8_street', entry: 'from_plaza', if: s => s.flag('c1_flower_done'),
      blocked: function* (s) { yield s.say('cloud', "(Hm? Someone's coming...)"); } }],
    npcs: [
      { id: 'man', model: 'man4', at: [6, 6], dir: 'up', talk: function* (s) { yield s.say('Man', "What was that explosion!? The reactor... it's gone!"); } },
      { id: 'woman', model: 'woman3', at: [24, 3], dir: 'left', talk: function* (s) { yield s.say('Woman', "They're saying it's terrorists. AVALANCHE... I just want to go home."); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c1_s8_intro')) return;
      s.set('c1_s8_intro');
      s.spawn('barret', 'barret', 15, 4, 'up', { name: 'Barret' });
      s.spawn('jessie', 'jessie', 13, 3, 'right', { name: 'Jessie' });
      s.spawn('biggs', 'biggs', 17, 3, 'left', { name: 'Biggs' });
      s.spawn('wedge', 'wedge', 16, 2, 'down', { name: 'Wedge' });
      s.shake(3, 60);
      yield s.say('barret', "Yeah! That's how it's done! Shinra's gonna be pickin' up pieces for weeks!\fAlright, listen up! We split up here. Everyone meet at Sector 8 station. Catch the train back to the slums!");
      yield [s.run('jessie', 1, 4, { noWait: true }), s.run('biggs', 29, 4, { noWait: true }), s.run('wedge', 15, 9, { noWait: true })];
      yield 20;
      yield s.face('barret', 'player');
      yield s.say('barret', "And you! Don't think your pay's comin' early. We'll talk at the hideout.");
      yield s.run('barret', 15, 9);
      s.remove('barret'); s.remove('jessie'); s.remove('biggs'); s.remove('wedge');
      if (s.isMember('jessie')) { s.leave('jessie'); yield s.msg('Jessie left the party.'); }   // (AVALANCHE Scenes)
      // the flower girl
      s.music('aeris');
      s.spawn('aeris', 'aeris', 2, 7, 'right', { name: 'Flower Girl' });
      yield s.move('aeris', 14, 5);
      yield s.face('player', 'aeris');
      yield s.face('aeris', 'player');
      yield s.say('aeris', "Excuse me... what happened over there?");
      const c1 = yield s.ask('cloud', "", ['Don\'t worry about it.', 'Nothing. Get going.']);
      yield s.say('aeris', "Oh... okay.\fYou know, you don't see many flowers around here. Would you like one? They're only a gil.");
      const c2 = yield s.ask('cloud', "", ['I\'ll buy one.', 'No thanks.']);
      if (c2 === 0) {
        if (s.gil() >= 1) s.takeGil(1);
        s.set('c1_bought_flower');
        yield s.say('aeris', "Thank you! I hope it brings you luck.");
      } else {
        yield s.say('aeris', "Oh... well. Maybe next time.");
      }
      yield s.move('aeris', 28, 4);
      s.remove('aeris');
      s.set('c1_flower_done');
      s.music('bombing');
    },
  });

  FF7.defineMap('md8_street', {
    name: 'Sector 8 Streets', area: 'Midgar', theme: 'midgar', music: 'bombing',
    look: { sky: ['#140404', '#3a1408'], fog: { color: [0.16, 0.06, 0.03], near: 9, far: 24 } },
    lights: [[8, 4, '#ff6020', 4], [18, 6, '#80c0ff', 3]],
    grid: [
      "hhhhhhhhhhhhh.....hhhhhhhhhhhh",
      "h............................h",
      "h...x.....x.................xh",
      "h........x......x............h",
      "h....x..........o.......x....h",
      "h...............l............h",
      "h..............x.............h",
      "h............................h",
      "hhhhhhhhhhhhhhhhhhhhhhhhh....h",
    ],
    entries: { from_plaza: [15, 1, 'down'], from_overpass: [26, 7, 'up'] },
    items: [{ at: [18, 6], item: 'potion', id: 'md8_street_potion' }],
    exits: [
      { at: [13, 0, 5, 1], to: 'md8_plaza', entry: 'start', hidden: true, if: s => false, blocked: function* (s) { yield s.say('cloud', "(No time. Gotta reach the station.)"); } },
      { at: [25, 8, 4, 1], to: 'md8_overpass', entry: 'from_street' },
    ],
    npcs: [
      { id: 'citizen', model: 'man7', at: [6, 6], dir: 'right', talk: function* (s) { yield s.say('Man', "Stay away from the sparks, those cables are live!"); } },
    ],
    triggers: [
      { id: 'mps1', at: [20, 1, 4, 7], once: true,
        run: function* (s) {
          s.spawn('mpA', 'mp', 27, 7, 'left'); s.spawn('mpB', 'mp', 28, 6, 'left');
          yield [s.run('mpA', 24, 5), s.run('mpB', 25, 4)];
          yield s.say('Shinra MP', "There he is! One of the terrorists!");
          const c = yield s.ask('cloud', "", ['Fight', 'Run']);
          if (c === 0) yield s.battle({ formation: FF7.data.encounters.sector8[0], bg: 'midgar' });
          else { yield s.run('player', 26, 7); yield s.battle({ formation: FF7.data.encounters.sector8[0], bg: 'midgar', back: true }); }
          s.remove('mpA'); s.remove('mpB');
        } },
    ],
  });

  FF7.defineMap('md8_overpass', {
    name: 'Sector 8 Overpass', area: 'Midgar', theme: 'highway', music: 'bombing',
    look: { sky: ['#0a0406', '#2a1018'] },
    // the overpass stands high over the railway (FF7: Cloud cornered on the bridge, the midnight train passing below)
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "hhhhhhhhhhhhhhhhhhhhhhh...h",
      "=.........................=",
      "=.......B.................=",
      "=.........................=",
      "===========================",
      "                           ",
      "___________________________",
      "___________________________",
      "___________________________",
      "                           ",
    ],
    heights: [
      "999999999999999999999999999",
      "999999999999999999999999999",
      "999999999999999999999999999",
      "999999999999999999999999999",
      "999999999999999999999999999",
      "999999999999999999999999999",
      "000000000000000000000000000",
      "000000000000000000000000000",
      "000000000000000000000000000",
      "000000000000000000000000000",
      "000000000000000000000000000",
    ],
    props: [{ at: [0, 8], prop: 'track', len: 27 }],
    entries: { from_street: [24, 2, 'left'] },
    exits: [],
    triggers: [
      { id: 'cornered', at: [14, 2, 2, 3], once: true,
        run: function* (s) {
          s.spawn('mpA', 'mp', 25, 2, 'left'); s.spawn('mpB', 'mp', 25, 3, 'left'); s.spawn('mpC', 'mp', 2, 3, 'right');
          yield [s.run('mpA', 19, 2), s.run('mpB', 19, 4), s.run('mpC', 9, 3)];
          yield s.say('Shinra MP', "You're surrounded! Give it up!");
          yield s.battle({ formation: FF7.data.encounters.sector8[2], bg: 'midgar' });
          yield s.say('Shinra MP', "Reinforcements are on the way! You've got nowhere to run!");
          // the midnight train comes along the tracks below: Cloud drops onto the middle car's roof as it passes and
          // rides it away, the MPs left at the railing. (The train faces west, its cars trailing east of its centre u.)
          const f = s.field, T = FF7.field.TILE, pl = f && f.P && f.player, ROW = 8, ROOF = 1.64;
          const train = { kind: 'object', id: 'md8_train', model: { vehicle: 'train', opts: { cars: 2 } }, dir: 'left', u: 42, v: 0, at: [41.5, ROW],
            tick(o) { o.u += o.v; o.at = [o.u - 0.5, ROW]; if (o._model && o.v) { o._model.play('move'); o._model.speed = -o.v * T * 40 / 3.77; } } };
          if (f && f.objects) f.objects.push(train);
          const carX = () => train.u * T + 0.05;
          s.sfx('train_horn');
          yield s.cam(14, 6, 30, { height: 1.6 });
          yield s.say('cloud', "(The train... right on time.)");
          yield s.face('player', 'down');
          train.v = -0.22; s.sfx('train');
          s.anim('mpA', 'point'); s.anim('mpC', 'point');
          const n = 34, x0 = pl ? pl.x : 0;
          for (let i = 0; i < 400 && carX() > x0 - train.v * T * n; i++) yield 1;
          if (pl) {   // the jump: over the rail and down onto the moving roof
            const fx = pl.x, fz = pl.z, fy = pl.y + pl.hover, tz = (ROW + 0.5) * T;
            s.sfx('jump');
            for (let i = 1; i <= n; i++) {
              const k = i / n;
              pl.x = fx + (carX() - fx) * k; pl.z = fz + (tz - fz) * k;
              pl.hover = fy + (ROOF - fy) * k + Math.sin(k * Math.PI) * 0.9 - FF7.field.groundAt(f.P, pl.x, pl.z);
              yield 1;
            }
            s.shake(3, 16); s.anim('player', 'kneel');
          }
          s.run('mpA', 16, 4, { noWait: true }); s.run('mpC', 12, 4, { noWait: true });
          for (let i = 0; i < 300 && train.u > -16; i++) {
            if (pl) { pl.x = carX(); pl.z = (ROW + 0.5) * T; pl.hover = ROOF - FF7.field.groundAt(f.P, pl.x, pl.z); }
            yield 1;
          }
          s.hide('player');
          yield 20;
          yield s.fadeOut(30);
          if (pl) pl.hover = 0;
          s.stopAnim('player');
          yield s.goto('train1_car', 'start');
        } },
    ],
  });

  // ------------------------------------------------------------------ the train
  FF7.defineMap('train1_car', {
    // FF7's midnight train car: long and narrow, blue padded benches along both walls, brass poles and
    // an overhead rail with straps, plank floor with a grating strip down the aisle, lit windows, red
    // lamps at the ends. Seen like the game's cutaway shot: diagonally from above, floating in the dark.
    name: 'Midnight Train', area: 'Midgar', theme: 'station', music: 'none',
    look: { wall: '#4a3a2e', wallTop: '#1a120c', floor: ['#6a4a30', '#62442c'], floorTex: { floor: 'planks' }, wallTex: 'panel',
      window: '#d0a050', seat: '#2e5a7a', sky: ['#000000', '#000000'], indoor: true, cutaway: true },
    camera: { yaw: 32, pitch: 44, dist: 9.5 },
    legend: { N: 'trainseat_n', S: 'trainseat_s' },
    lights: [[1, 3, '#ff3020', 3], [22, 3, '#ff3020', 3], [6, 3, '#ffd8a0', 3], [12, 3, '#ffd8a0', 3], [18, 3, '#ffd8a0', 3]],
    props: [{ at: [11, 0], prop: 'tv', rot: 0, col: '#40e070', lift: 0.75, scale: 0.8 }],   // the route-map monitor, on the wall
    grid: [
      "#wwww#wwww#wwww#wwww#ww#",
      "#..NNNNNNNN..NNNNNNNN..#",
      "#......................#",
      "#.gggggggggggggggggggg.#",
      "#......................#",
      "#..SSSSSSSS..SSSSSSSS..#",
      "########################",
    ],
    entries: { start: [19, 3, 'left'] },
    npcs: [
      { id: 'jessie', name: 'Jessie', model: 'jessie', at: [16, 2], dir: 'right', talk: function* (s) { yield s.say('jessie', "Wanna see the route map again? It's fun, I promise."); yield* FF7.story.c1_midgarMap(s); } },
      { id: 'biggs', name: 'Biggs', model: 'biggs', at: [9, 2], dir: 'right', talk: function* (s) { yield s.say('biggs', "Look at all these tired faces... they've got no idea what we just did for them."); } },
      { id: 'wedge', name: 'Wedge', model: 'wedge', at: [8, 4], dir: 'right', talk: function* (s) { yield s.say('wedge', "I'm starving. Tifa's cooking, here I come..."); } },
      { id: 'barret', name: 'Barret', model: 'barret', at: [14, 4], dir: 'right', talk: function* (s) { yield s.say('barret', "Don't get comfortable. Soon as we're back, we're plannin' the next one."); } },
      { id: 'salaryman', name: 'Salaryman', model: 'exec', at: [4, 2], dir: 'down', talk: function* (s) { yield s.say('Salaryman', "(...Just avoid eye contact. Just avoid eye contact.)"); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c1_train_talk')) return;
      s.set('c1_train_talk');
      s.music('none');
      s.sfx('train');
      yield s.fadeIn(30);
      yield s.say('jessie', "Cloud! You made it! We were so worried when you didn't show up at the station.");
      yield s.say('barret', "Hmph. Thought he was toast. Would've saved me some money.");
      yield s.say('jessie', "Here, check this out. I love showing people this.");
      yield* FF7.story.c1_midgarMap(s);
      yield s.say('barret', "......\fThat plate up there... Sittin' up in the sky while everyone below gets nothin' but its shadow.");
      yield s.say('cloud', "......");
      if (s.flag('c1_jessie_free')) {
        // FF7 (talking to Jessie again): her thanks for the grating. Date points: Tifa -3 for the flirt.
        yield s.say('jessie', "Oh, and {CLOUD}... thanks for back in the reactor. My foot, the grating?\fI owe you one. I'll think of a proper way to thank you sometime.");
        const DP = [{}, { tifa: -3 }];
        const c = yield s.ask('cloud', '', ['No need.', "I'll hold you to that."], { noQuotes: true, date: DP });
        FF7.story.datePts(s, DP[c]);
        yield s.say('jessie', c === 1 ? "Hee hee. It's a deal, then!" : "Aw, so modest. Well, the offer stands!");
      }
      yield 60;
      s.sfx('train_horn');
      yield s.msg('The train pulls into Sector 7 Station.');
      yield s.fadeOut(40);
      yield s.goto('s7_station', 'from_train');
    },
  });

  FF7.story.c1_midgarMap = function* (s) {
    yield s.caption("MIDGAR\n\nEight sectors on a great plate, 50 meters above the ground.\nEight Mako reactors ring the city, one per sector.\n\nBelow the plate: the slums, where the sun never reaches.", { bg: 'rgba(0,10,20,0.9)' });
    yield s.say('jessie', "The plate's held up by a huge central pillar and one support in each sector. Pretty amazing, huh?\fWe're heading down to Sector 7. Home sweet home.");
  };
})();
