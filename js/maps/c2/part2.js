// Chapter 2 — Part 2: the midnight train to Sector 4. Talking to Tifa sets off the ID-scan alarm;
// the cars are sealed one after another from the rear (15 seconds per car). Passengers along the way:
// the man who hands over a Phoenix Down (car 1), the man with the Hi-Potion (car 2), the pickpocket
// (car 3). In the front car Jessie explains the plan and everyone jumps into the Sector 4 tunnel.
// If a car is sealed before the party gets through, they jump early and land farther back in the
// tunnel (FF7: "nothing serious happens, just a longer walk").
(function () {
  // FF7's midnight train cars (same build as train1_car): blue padded benches along both walls, brass
  // poles and an overhead rail with straps, plank floor with a grating strip, lit windows, red end lamps;
  // seen diagonally from above like the game's cutaway shot of the car.
  const TRAIN_LOOK = { wall: '#4a3a2e', wallTop: '#1a120c', floor: ['#6a4a30', '#62442c'], floorTex: { floor: 'planks' }, wallTex: 'panel',
    window: '#d0a050', seat: '#2e5a7a', sky: ['#000000', '#000000'], indoor: true };
  const TRAIN_CAM = { yaw: 32, pitch: 44, dist: 9.5 };
  const TRAIN_LEGEND = { N: 'trainseat_n', S: 'trainseat_s' };
  const TRAIN_LIGHTS = [[1, 3, '#ff3020', 3], [20, 3, '#ff3020', 3], [6, 3, '#ffd8a0', 3], [11, 3, '#ffd8a0', 3], [16, 3, '#ffd8a0', 3]];
  const CAR = [
    "##ww##ww##ww##ww##ww##",
    "#NNNNNNNNNN.NNNNNNNNN#",
    "+....................+",
    "+.gggggggggggggggggg.+",
    "+....................+",
    "#SSSSSSSSSS.SSSSSSSSS#",
    "######################",
  ];
  const CAR_SECONDS = 15;
  const caughtPending = s => s.flag('c2_train_caught') && !s.flag('c2_jumped');
  const tileOf = (s) => { const p = s.actor('player') || { x: 0, z: 0 }; return [Math.floor(p.x / 0.5), Math.floor(p.z / 0.5)]; };

  // Background watcher: when the car's countdown is about to run out, the car is sealed.
  // (A plain s.timer() would end in Game Over, so the watcher clears it just before zero and
  // flags the party as caught; the "caught" scene then plays on the next step or at the door.)
  function* carWatch(s, doneFlag) {
    for (let i = 0; i < 60 * (CAR_SECONDS + 10); i++) {
      if (s.flag(doneFlag) || s.flag('c2_train_caught') || s.flag('c2_jumped')) return;
      if (s.timeLeft() <= 0.3) {
        s.timer(null);
        s.set('c2_train_caught');
        s.sfx('alarm_long');
        s.shake(3, 40);
        return;
      }
      yield 1;
    }
  }
  function startCarTimer(s, doneFlag) {
    s.timer(CAR_SECONDS);
    s.parallel(function* (s) { yield* carWatch(s, doneFlag); });
  }
  // One step trigger per aisle column: fires the caught scene as soon as the player moves.
  function caughtTriggers() {
    const t = [];
    for (let x = 1; x <= 20; x++) t.push({ at: [x, 2, 1, 3], if: caughtPending, run: function* (s) { yield* FF7.story.c2_trainCaught(s); } });
    return t;
  }
  function frontExit(next, flag) {
    return { at: [21, 2, 1, 3], run: function* (s) {
      if (!s.flag('c2_alarm')) {
        yield s.say('tifa', "{CLOUD}, let's not draw attention to ourselves. Stay put for now.");
        yield s.walk('player', -1, 0);
        return;
      }
      if (s.flag('c2_train_caught')) { yield* FF7.story.c2_trainCaught(s); return; }
      s.timer(null);
      s.set(flag);
      s.sfx('door');
      yield s.goto(next, 'from_rear');
    } };
  }
  function rearExit(isLast) {
    return { at: [0, 2, 1, 3], run: function* (s) {
      if (isLast) yield s.msg("The rear door of the last car. Nothing out there but tracks and darkness.");
      else yield s.msg('The door behind you has been sealed shut.');
      yield s.walk('player', 1, 0);
    } };
  }
  function carEnter(doneFlag) {
    return function* (s) {
      s.sfx('train');
      if (!s.flag('c2_alarm') || s.flag('c2_jumped') || s.flag('c2_train_caught') || s.flag(doneFlag)) return;
      startCarTimer(s, doneFlag);
    };
  }

  // ------------------------------------------------------------------ the alarm
  FF7.story.c2_trainAlarm = function* (s) {
    s.set('c2_alarm');
    s.music('none');
    s.sfx('alarm');
    s.shake(2, 30);
    yield s.msg('<< ATTENTION, PASSENGERS >>\nAn unregistered ID has been detected aboard this train.\nSecurity Level 3 is now in effect.', { pos: 'top' });
    yield s.msg('All cars will be sealed in sequence, starting from the rear.\nPlease remain in your seats.', { pos: 'top' });
    s.stopAnim('jessie'); s.stopAnim('biggs'); s.stopAnim('wedge');
    s.emote('jessie', '!!');
    yield s.say('jessie', "Uh-oh. They flagged my IDs! Shinra must've upgraded the scanners today!");
    yield s.say('biggs', "If they seal us in back here, we're finished. Front car, everybody! Go!");
    yield [s.run('jessie', [[19, 3], [21, 3]]), s.run('biggs', [[15, 2], [21, 2]]), s.run('wedge', [[16, 4], [21, 4]])];
    s.hide('jessie'); s.hide('biggs'); s.hide('wedge');
    s.stopAnim('barret');
    yield s.say('barret', "Damn it! Move it, move it, MOVE IT!");
    s.hide('barret'); s.hide('tifa');
    s.music('hurry');
    s.menu(false);
    startCarTimer(s, 'c2_car2');
  };

  // ------------------------------------------------------------------ caught: jump early
  FF7.story.c2_trainCaught = function* (s) {
    if (s.flag('c2_jumped')) return;
    s.set('c2_jumped');
    s.set('c2_train_caught');
    s.timer(null);
    s.sfx('alarm_long');
    s.shake(3, 40);
    yield s.msg('<< SECURITY LEVEL 3 >>\nThis car has been sealed. ID scan in progress.', { pos: 'top' });
    const [px] = tileOf(s);
    const x = Math.max(3, Math.min(18, px));
    s.spawn('barret', 'barret', x - 2, 2, 'right', { name: 'Barret' });
    s.spawn('tifa', 'tifa', x - 2, 4, 'right', { name: 'Tifa' });
    yield s.say('barret', "Damn it all! The door's locked up tight!");
    yield s.say('tifa', "The window hatch is still open... We'll have to jump. From right here!");
    yield s.say('barret', "Here?! We ain't even close to the drop point!");
    yield s.say('tifa', "It's that, or wait for Shinra's welcoming committee. {CLOUD}!");
    yield s.say('cloud', "......Let's go.");
    yield s.jump('tifa', x - 2, 0, 0.9, 22);
    s.hide('tifa');
    yield s.say('barret', "Aw, hell...! Here goes nothin'!");
    yield s.jump('barret', x - 1, 0, 0.9, 22);
    s.hide('barret');
    yield s.jump('player', x, 0, 1.0, 24);
    s.hide('player');
    s.shake(4, 20);
    yield s.fadeOut(20);
    s.music('none');
    s.menu(true);
    yield s.goto('s4_tunnel_s', 'from_train');
  };

  // ------------------------------------------------------------------ car 1 (rear)
  FF7.defineMap('train2_car1', {
    name: 'Midnight Train', area: 'Midgar', theme: 'station', music: 'none', look: TRAIN_LOOK, camera: TRAIN_CAM, legend: TRAIN_LEGEND, lights: TRAIN_LIGHTS,
    lights: [[5, 3, '#fff0c0', 3], [16, 3, '#fff0c0', 3]],
    grid: CAR,
    entries: { start: [6, 3, 'right'], from_rear: [1, 3, 'right'], from_front: [20, 3, 'left'] },
    exits: [rearExit(true), frontExit('train2_car2', 'c2_car2')],
    npcs: [
      { id: 'tifa', name: 'Tifa', model: 'tifa', at: [12, 2], dir: 'down', show: s => !s.flag('c2_alarm'),
        talk: function* (s) {
          yield s.say('tifa', "It's so quiet at this hour...\fHey, {CLOUD}. Thanks for staying. I mean it.");
          yield s.say('cloud', "......I'm getting paid.");
          yield s.say('tifa', "Mm-hm. Sure you are.");
          yield* FF7.story.c2_trainAlarm(s);
        } },
      { id: 'barret', name: 'Barret', model: 'barret', at: [7, 5], dir: 'up', anim: 'sit', hover: 0.14, faceOnTalk: false, show: s => !s.flag('c2_alarm'),
        talk: function* (s) { yield s.say('barret', "Quit pacin' around. You're makin' the other passengers nervous.\f...An' don't talk to Jessie an' them. We're strangers, remember?"); } },
      { id: 'jessie', name: 'Jessie', model: 'jessie', at: [19, 5], dir: 'up', anim: 'sit', hover: 0.14, faceOnTalk: false, show: s => !s.flag('c2_alarm'),
        talk: function* (s) { yield s.say('jessie', "(Pssst! We don't know each other, remember? We're total strangers! ...Nice night, isn't it, stranger?)"); } },
      { id: 'biggs', name: 'Biggs', model: 'biggs', at: [15, 1], dir: 'down', anim: 'sit', hover: 0.14, faceOnTalk: false, show: s => !s.flag('c2_alarm'),
        talk: function* (s) { yield s.say('biggs', "......(He pretends to read a newspaper. It's upside down.)"); } },
      { id: 'wedge', name: 'Wedge', model: 'wedge', at: [16, 1], dir: 'down', anim: 'sit', hover: 0.14, faceOnTalk: false, show: s => !s.flag('c2_alarm'),
        talk: function* (s) { yield s.say('wedge', "Hi, stranger! I'm... nobody! Just a regular guy! Riding a regular train!"); } },
      { id: 'pdman', name: 'Passenger', model: 'man6', at: [20, 1], dir: 'down', anim: 'sit', hover: 0.14, faceOnTalk: false,
        talk: function* (s) {
          if (s.flag('c2_pd_given')) { yield s.say('Passenger', "What're you still doin' here? Go on, go!"); return; }
          if (!s.flag('c2_alarm')) { yield s.msg('The man glances at you, then quickly looks back out the window.'); return; }
          yield s.say('Passenger', "It's you they're after, huh? Heh... I read about Reactor No.1.\fShinra flattened my old neighborhood to build that thing. Here. You'll need this more than me.");
          s.set('c2_pd_given');
          yield s.give('phoenix_down');
          yield s.say('Passenger', "Now get movin'! Before the doors lock!");
        } },
      { id: 'salaryman', name: 'Salaryman', model: 'exec', at: [2, 5], dir: 'up', anim: 'sit', hover: 0.14, faceOnTalk: false,
        talk: function* (s) {
          if (s.flag('c2_alarm')) yield s.say('Salaryman', "Level 3?! Not again! I have a presentation in the morning!");
          else yield s.say('Salaryman', "Zzz... quarterly Mako yields... up... four percent... zzz...");
        } },
      { id: 'granny', name: 'Old Woman', model: 'oldwoman1', at: [2, 1], dir: 'down', anim: 'sit', hover: 0.14, faceOnTalk: false,
        talk: function* (s) { yield s.say('Old Woman', "The last train always smells of oil and tired people. I've ridden it for forty years."); } },
    ],
    triggers: caughtTriggers(),
    onEnter: function* (s) {
      s.sfx('train');
      if (s.flag('c2_train_intro')) return;
      s.set('c2_train_intro');
      yield s.say('cloud', "(Jessie, Biggs and Wedge are scattered through the car, pretending not to know us.\n Tifa's standing by the window.)");
    },
  });

  // ------------------------------------------------------------------ car 2
  FF7.defineMap('train2_car2', {
    name: 'Midnight Train', area: 'Midgar', theme: 'station', look: TRAIN_LOOK, camera: TRAIN_CAM, legend: TRAIN_LEGEND, lights: TRAIN_LIGHTS,
    lights: [[5, 3, '#fff0c0', 3], [16, 3, '#fff0c0', 3]],
    grid: CAR,
    entries: { from_rear: [1, 3, 'right'], from_front: [20, 3, 'left'] },
    exits: [rearExit(false), frontExit('train2_car3', 'c2_car3')],
    npcs: [
      { id: 'hpman', name: 'Passenger', model: 'man4', at: [2, 5], dir: 'up', anim: 'sit', hover: 0.14, faceOnTalk: false,
        talk: function* (s) {
          if (s.flag('c2_hipotion')) { yield s.say('Passenger', "Good luck out there. Give 'em one for me."); return; }
          yield s.say('Passenger', "Hey... hey, you. That alarm's about you, isn't it?");
          const c = yield s.ask('Passenger', "You folks with AVALANCHE?", ['Yeah.', "Never heard of 'em."]);
          if (c === 0) {
            s.set('c2_hipotion');
            yield s.say('Passenger', "I knew it! My brother lost his farm when they sank the pipes for the Sector 4 reactor.\fTake this. And give Shinra hell for us little guys.");
            yield s.give('hi_potion');
          } else {
            yield s.say('Passenger', "...Right. Course not. Forget I said anything.");
          }
        } },
      { id: 'woman', name: 'Woman', model: 'woman3', at: [7, 1], dir: 'down', anim: 'sit', hover: 0.14, faceOnTalk: false,
        talk: function* (s) { yield s.say('Woman', "Wh-what's happening?! Are we being hijacked?!"); } },
      { id: 'worker', name: 'Worker', model: 'worker3', at: [15, 5], dir: 'up', anim: 'sit', hover: 0.14, faceOnTalk: false,
        talk: function* (s) { yield s.say('Worker', "Level 3 again? Last month they held the whole train two hours over some bum ID.\fI'm gonna be late for my shift. Again."); } },
      { id: 'mother', name: 'Mother', model: 'woman7', at: [15, 1], dir: 'down', anim: 'sit', hover: 0.14, faceOnTalk: false,
        talk: function* (s) { yield s.say('Mother', "Shh, shh, it's just a drill, sweetie. Nothing's wrong."); } },
      { id: 'child', name: 'Child', model: 'kid6', at: [16, 1], dir: 'down', anim: 'sit', hover: 0.14, faceOnTalk: false,
        talk: function* (s) { yield s.say('Child', "Mommy, why's that man running? Is he a bad guy? He's got a really big sword!"); } },
    ],
    triggers: caughtTriggers(),
    onEnter: carEnter('c2_car3'),
  });

  // ------------------------------------------------------------------ car 3 (pickpocket)
  const STEALABLE = ['potion', 'phoenix_down', 'hi_potion', 'ether'];
  FF7.defineMap('train2_car3', {
    name: 'Midnight Train', area: 'Midgar', theme: 'station', look: TRAIN_LOOK, camera: TRAIN_CAM, legend: TRAIN_LEGEND, lights: TRAIN_LIGHTS,
    lights: [[5, 3, '#fff0c0', 3], [16, 3, '#fff0c0', 3]],
    grid: CAR,
    entries: { from_rear: [1, 3, 'right'], from_front: [20, 3, 'left'] },
    exits: [rearExit(false), frontExit('train2_car4', 'c2_car4')],
    npcs: [
      { id: 'pickpocket', name: 'Passenger', model: 'man7', at: [12, 3], dir: 'left',
        talk: function* (s) {
          const it = s.get('c2_stolen');
          if (!s.flag('c2_pickpocketed')) { yield s.say('Passenger', "Busy night, huh? Real busy. Heh."); return; }
          if (!it) { yield s.say('Passenger', "Whaddaya want? I didn't take nothin'. Honest!"); return; }
          const c = yield s.ask('Passenger', "Wh-what? You got some kinda business with me?", ['No... never mind.', "That's right. Hand it over."]);
          if (c === 1) {
            yield s.say('Passenger', "Tch... Alright, alright! Here. No hard feelings, yeah?");
            s.setVar('c2_stolen', 0);
            yield s.give(it);
          } else {
            yield s.say('Passenger', "Heh. Then scram, pal.");
          }
        } },
      { id: 'granny2', name: 'Old Woman', model: 'oldwoman2', at: [4, 1], dir: 'down', anim: 'sit', hover: 0.14, faceOnTalk: false,
        talk: function* (s) { yield s.say('Old Woman', "Mind that fellow standing in the aisle, dear. He's been bumping into everyone all night."); } },
      { id: 'girl', name: 'Girl', model: 'girl3', at: [8, 5], dir: 'up', anim: 'sit', hover: 0.14, faceOnTalk: false,
        talk: function* (s) { yield s.say('Girl', "Is this about the reactor thing? My dad works in Sector 5. He says Shinra's been jumpy all day."); } },
      { id: 'man', name: 'Man', model: 'man2', at: [17, 5], dir: 'up', anim: 'sit', hover: 0.14, faceOnTalk: false,
        talk: function* (s) { yield s.say('Man', "The doors behind us just locked! Whatever you did, buddy, you'd better keep running."); } },
    ],
    triggers: caughtTriggers().concat([
      { id: 'bump', at: [9, 2, 1, 3], once: true, if: s => !s.flag('c2_train_caught'),
        run: function* (s) {
          yield s.face('pickpocket', 'player');
          s.emote('pickpocket', '!');
          yield s.say('Passenger', "Whoa! Sorry, pal! Didn't see ya there!");
          const it = STEALABLE.find(i => s.has(i));
          if (it) { s.take(it, 1); s.setVar('c2_stolen', it); }
          s.set('c2_pickpocketed');
          yield s.face('pickpocket', 'left');
        } },
    ]),
    onEnter: carEnter('c2_car4'),
  });

  // ------------------------------------------------------------------ car 4 (front): the jump
  FF7.defineMap('train2_car4', {
    name: 'Midnight Train', area: 'Midgar', theme: 'station', look: TRAIN_LOOK, camera: TRAIN_CAM, legend: TRAIN_LEGEND, lights: TRAIN_LIGHTS,
    lights: [[5, 3, '#fff0c0', 3], [16, 3, '#fff0c0', 3]],
    grid: CAR,
    entries: { from_rear: [1, 3, 'right'] },
    exits: [
      rearExit(false),
      { at: [21, 2, 1, 3], run: function* (s) { yield s.msg("The door to the engine is bolted shut."); yield s.walk('player', -1, 0); } },
    ],
    npcs: [
      { id: 'jessie', name: 'Jessie', model: 'jessie', at: [16, 3], dir: 'left', show: s => !s.flag('c2_jumped'),
        talk: function* (s) { yield s.say('jessie', "Ready when you are!"); } },
      { id: 'biggs', name: 'Biggs', model: 'biggs', at: [18, 2], dir: 'left', show: s => !s.flag('c2_jumped'),
        talk: function* (s) { yield s.say('biggs', "Next checkpoint's coming up fast."); } },
      { id: 'wedge', name: 'Wedge', model: 'wedge', at: [17, 4], dir: 'left', show: s => !s.flag('c2_jumped'),
        talk: function* (s) { yield s.say('wedge', "I'm not scared. I'm not scared. I'm... a little scared."); } },
    ],
    onEnter: function* (s) {
      s.sfx('train');
      if (s.flag('c2_jumped') || !s.flag('c2_car4')) return;
      s.timer(null);
      // FF7 date points: through every car before the lockdown caught up (Tifa +5, Barret +5)
      if (!s.flag('c2_train_front')) { s.set('c2_train_front'); FF7.story.datePts(s, { tifa: 5, barret: 5 }); }
      s.spawn('barret', 'barret', 1, 2, 'right', { name: 'Barret' });
      s.spawn('tifa', 'tifa', 1, 4, 'right', { name: 'Tifa' });
      yield [s.move('barret', 4, 2), s.move('tifa', 4, 4), s.move('player', 6, 3)];
      yield s.face('jessie', 'player');
      yield s.say('jessie', "You made it! Phew... I was about to start praying.");
      yield s.say('jessie', "Okay, listen up. At the next checkpoint, the scanner sweeps the whole train. We can't be on it when that happens.");
      yield s.say('biggs', "Which means we're getting off. Right now.");
      yield s.say('wedge', "W-while it's still MOVING?!");
      yield s.say('jessie', "The train slows down going through the Sector 4 tunnel. From there, a maintenance route runs up inside the plate, all the way to Reactor No.5.\fThe three of us will go first and scout it out. You follow the tunnel north. We'll be waiting for you along the way!");
      yield s.say('biggs', "See you on the other side!");
      yield s.jump('biggs', 18, 0, 0.9, 22);
      s.hide('biggs');
      yield s.say('wedge', "Here goes... n-nothing...!");
      yield s.jump('wedge', 17, 0, 0.9, 22);
      s.hide('wedge');
      yield s.say('jessie', "Last one out buys the drinks!");
      yield s.jump('jessie', 16, 0, 0.9, 22);
      s.hide('jessie');
      yield s.say('barret', "......Y'know, I just remembered somethin'. I got a thing about heights.");
      yield s.say('tifa', "It's a tunnel, Barret.");
      yield s.say('barret', "Tunnels got heights too!");
      yield s.say('cloud', "......Go.");
      yield s.jump('tifa', 4, 0, 0.9, 22);
      s.hide('tifa');
      yield s.say('barret', "Aw, hell...! Marlene, Papa loves ya!");
      yield s.jump('barret', 5, 0, 0.9, 22);
      s.hide('barret');
      yield s.jump('player', 6, 0, 1.0, 24);
      s.hide('player');
      s.set('c2_jumped');
      s.menu(true);
      s.shake(3, 20);
      yield s.fadeOut(20);
      s.music('none');
      yield s.goto('s4_tunnel', 'from_train');
    },
  });
})();
