// Chapter 4 (part 4) — The escape: the lobby reunion, the truck and the Hardy-Daytona crashing out
// of the 2F showroom, the motorcycle chase on the expressway, Motor Ball, and the end of the
// unfinished highway where the party decides to go after Sephiroth and leaves Midgar.
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
(function () {
  const C4 = FF7.c4 = FF7.c4 || {};
  const restoreParty = (s) => {
    const prev = s.get('c4_prev_party');
    const ids = ['cloud'].concat(Array.isArray(prev) ? prev.filter(id => id && id !== 'cloud' && s.isMember(id)) : []);
    s.party(ids.length > 1 ? ids : ['cloud', 'tifa', 'barret']);
  };

  // ------------------------------------------------------------------ 1F lobby: the reunion
  FF7.story.c4_lobbyEscape = function* (s) {
    if (s.flag('c4_lobby_reunion')) return;
    s.music('hurry');
    s.spawn('tifa', 'tifa', 16, 9, 'up', { name: s.name('tifa') });
    yield s.run('tifa', 16, 4);
    yield s.say('tifa', "Cloud! You're alright!");
    yield s.say('cloud', "Rufus got away. Where are the others?");
    yield s.say('tifa', "They should be right behind—");
    s.sfx('elevator');
    yield 40;
    s.sfx('door_shinra');
    s.spawn('barret', 'barret', 18, 2, 'down', { name: s.name('barret') });
    s.spawn('redxiii', 'redxiii', 19, 3, 'down', { name: s.name('redxiii') });
    s.spawn('aeris', 'aeris', 17, 3, 'down', { name: s.name('aeris') });
    yield s.say('barret', "...and I'm tellin' ya, it was MY shot that brought that thing down!");
    yield s.say('redxiii', "You have mentioned that. Several times.");
    yield s.say('aeris', "Cloud! You made it!");
    yield s.say('barret', "Heh. Knew you wouldn't go and die on us.");
    s.sfx('alarm'); s.shake(3, 60);
    s.spawn('t1', 'soldier', 14, 13, 'up', { name: 'Shinra Trooper' });
    s.spawn('t2', 'soldier', 16, 13, 'up', { name: 'Shinra Trooper' });
    s.spawn('t3', 'mp', 18, 13, 'up', { name: 'Shinra MP' });
    yield [s.run('t1', 14, 10), s.run('t2', 16, 10), s.run('t3', 18, 10)];
    yield s.say('Shinra Trooper', "There they are! Surround the lobby! Don't let a single one escape!");
    s.sfx('train'); s.shake(4, 60);
    yield s.say('tifa', "There's a tank blocking the front doors!");
    yield s.say('barret', "Damn! They got us boxed in!");
    yield s.say('cloud', "...The showroom on the 2nd floor. Follow me!");
    s.set('c4_lobby_reunion');
    ['tifa', 'barret', 'redxiii', 'aeris', 't1', 't2', 't3'].forEach(id => s.remove(id));
    yield s.goto('shinra_2f', 'escape');
  };

  // ------------------------------------------------------------------ 2F showroom: the breakout
  FF7.story.c4_showroomEscape = function* (s) {
    if (s.flag('c4_bike')) return;
    s.music('hurry');
    s.spawn('tifa', 'tifa', 16, 8, 'up', { name: s.name('tifa') });
    s.spawn('barret', 'barret', 17, 8, 'up', { name: s.name('barret') });
    s.spawn('aeris', 'aeris', 19, 8, 'up', { name: s.name('aeris') });
    s.spawn('redxiii', 'redxiii', 20, 8, 'up', { name: s.name('redxiii') });
    yield s.run('player', 21, 6);
    yield s.jump('player', 21, 5, 0.8, 22);
    yield s.face('player', 'down');
    yield s.say('barret', "Cloud!? What the hell are you doin' up there!?");
    yield s.say('cloud', "Everyone, into the truck! We're breaking out through the window!");
    yield s.say('barret', "Through the—!? Aw, what the hell. Leave the drivin' to me!");
    yield [s.run('barret', 20, 4), s.run('tifa', 21, 4), s.run('aeris', 22, 4), s.run('redxiii', 23, 4)];
    ['tifa', 'barret', 'aeris', 'redxiii'].forEach(id => s.hide(id));
    yield s.say('aeris', "Wait, wait! Everybody in? ...Okay!");
    restoreParty(s);
    yield s.msg('Prepare your party before the escape.');
    yield s.choosePArty(['cloud']);
    s.set('c4_bike');
    yield s.fadeOut(30);
    s.music('none');
    yield s.movie('shinra_escape', { text: 'Cloud guns the Hardy-Daytona and smashes through the showroom glass,\nthe truck roaring right behind him.\nThey land on the Midgar expressway, with Shinra bikers in hot pursuit...' });
    yield s.goto('hwy_road', 'start');
  };

  // ------------------------------------------------------------------ the expressway
  const rail = (n, off) => Array.from({ length: n }, (_, i) => (i % 8 === off ? 'l' : '=')).join('');
  const dash = (n) => Array.from({ length: n }, (_, i) => (Math.floor(i / 2) % 2 === 0 ? ':' : '.')).join('');
  FF7.defineMap('hwy_road', {
    name: 'Midgar Expressway', area: 'Midgar', theme: 'highway', music: 'motorcycle',
    look: { sky: ['#01020a', '#1a2440'] },
    lights: [[1, 1, '#ffd890', 3], [9, 1, '#ffd890', 3], [17, 1, '#ffd890', 3], [25, 1, '#ffd890', 3], [33, 1, '#ffd890', 3]],
    grid: [
      "X".repeat(40),
      rail(40, 1),
      ".".repeat(40),
      ".".repeat(40),
      dash(40),
      ".".repeat(40),
      ".".repeat(40),
      rail(40, 5),
      " ".repeat(40),
    ],
    entries: { start: [4, 4, 'right'], from_end: [37, 4, 'left'] },
    exits: [
      { at: [39, 2, 1, 5], to: 'hwy_end', entry: 'start', if: s => s.flag('c4_motorball_done'),
        blocked: C4.locked("(Not yet...)") },
    ],
    onEnter: function* (s) {
      if (s.flag('c4_motorball_done')) return;
      s.music('motorcycle');
      const r = yield s.minigame('motorcycle');
      s.set('c4_chase_done');
      // ---- the truck pulls over; Motor Ball comes rolling after them
      s.spawn('barret', 'barret', 7, 3, 'right', { name: s.name('barret') });
      s.spawn('tifa', 'tifa', 7, 5, 'right', { name: s.name('tifa') });
      s.spawn('aeris', 'aeris', 6, 4, 'right', { name: s.name('aeris') });
      s.spawn('redxiii', 'redxiii', 8, 5, 'right', { name: s.name('redxiii') });
      s.place('player', 10, 4, 'left');
      yield 20;
      if (r === false) yield s.say('barret', "Ugh... that was too close. The truck's all banged up, but we're still in one piece!");
      else yield s.say('barret', "Hah! Shook 'em off! Shinra's bikers ain't nothin'!");
      s.sfx('train'); s.shake(3, 80);
      yield s.say('tifa', "Wait... Something's coming up behind us!");
      s.music('none');
      s.spawn('motorball', { enemy: 'motor_ball' }, 0, 4, 'right', { name: 'Motor Ball', scale: 0.6 });
      yield s.move('motorball', 4, 4, { run: true });
      yield s.say('aeris', "What IS that thing!?");
      yield s.say('cloud', "...Get ready!");
      yield s.battle({ table: 'boss_motor_ball', bg: 'highway', music: 'boss', noEscape: true, back: true });
      s.remove('motorball');
      s.set('c4_motorball_done');
      yield s.say('barret', "Phew... That had better be the last of 'em.");
      yield s.say('redxiii', "The road continues east. Let us not linger here.");
      ['barret', 'tifa', 'aeris', 'redxiii'].forEach(id => s.remove(id));
      s.music('ahead');
    },
  });

  // ------------------------------------------------------------------ the end of the highway
  const endRow = (body) => (body + ' '.repeat(34)).slice(0, 34);
  FF7.defineMap('hwy_end', {
    name: 'Midgar Expressway (Unfinished)', area: 'Midgar', theme: 'highway', music: 'ahead',
    look: { sky: ['#1a2448', '#d09070'], fog: { color: [0.5, 0.4, 0.38], near: 14, far: 34 } },
    lights: [[1, 1, '#ffd890', 3], [9, 1, '#ffd890', 3], [17, 1, '#ffd890', 3]],
    grid: [
      endRow("X".repeat(24)),
      endRow(rail(26, 1) + "x"),
      endRow(".".repeat(28)),
      endRow(".".repeat(25) + "x.."),
      endRow(dash(24) + "...."),
      endRow(".".repeat(26) + "x."),
      endRow(".".repeat(28)),
      endRow(rail(26, 5) + "x"),
      endRow(""),
    ],
    entries: { start: [1, 4, 'right'] },
    exits: [
      { at: [0, 2, 1, 5], to: 'hwy_road', entry: 'from_end' },
    ],
    triggers: [
      { at: [27, 2, 1, 5], once: false, if: s => s.flag('c4_decided'), run: C4.locked("(The highway just... ends. It's a long way down.)") },
      { id: 'decide', at: [20, 2, 2, 5], run: function* (s) {
          s.music('ahead');
          s.spawn('barret', 'barret', 17, 3, 'right', { name: s.name('barret') });
          s.spawn('tifa', 'tifa', 17, 5, 'right', { name: s.name('tifa') });
          s.spawn('aeris', 'aeris', 16, 4, 'right', { name: s.name('aeris') });
          s.spawn('redxiii', 'redxiii', 16, 6, 'right', { name: s.name('redxiii') });
          yield [s.move('player', 25, 4), s.move('barret', 22, 3), s.move('tifa', 23, 5), s.move('aeris', 21, 4), s.move('redxiii', 22, 6)];
          yield s.face('player', 'right');
          yield s.cam(30, 4, 70, { dist: 13, pitch: 34 });
          yield s.msg('The unfinished highway ends in mid-air.\nBeyond it, the wasteland stretches out to the horizon under a pale dawn.');
          yield s.say('barret', "Man... We actually made it out.");
          yield s.say('aeris', "Look at that... There's nothing out there. Just open land, as far as you can see.");
          s.camFollow(40); s.camZoom(9.5, 50);
          yield s.face('tifa', 'player');
          yield s.say('tifa', "Cloud... what happens now?");
          yield s.face('player', 'tifa');
          yield s.say('cloud', "Sephiroth is alive. ...I'm going after him.\fI have to settle things with him. Once and for all.");
          yield s.say('barret', "Heh. You think I'm lettin' you go alone? If Sephiroth's out to hurt the Planet, that makes him AVALANCHE's business!\fThe Planet's in danger, and I'm gonna save it!");
          yield s.say('barret', "Marlene's safe with Elmyra. ...Just wait for your daddy, baby.");
          yield s.say('tifa', "I'm coming too. You're not getting rid of me that easily.");
          yield s.say('aeris', "Me too. I want to know about the Ancients... about myself.\fAnd Sephiroth... I have a feeling I need to see this through.");
          yield s.say('redxiii', "I will go with you as far as my home, Cosmo Canyon.\fAnd I find I would like to see how this story ends.");
          yield s.say('cloud', "......");
          yield s.say('tifa', "It's strange. It feels like we're leaving everything behind.");
          yield s.say('aeris', "Or like everything's only just beginning.");
          yield s.say('cloud', "...Let's go.");
          yield s.fadeOut(40);
          s.music('none');
          yield s.movie('leave_midgar', { text: 'The party drops from the broken end of the highway\nand walks out across the wasteland,\nleaving the great city of Midgar behind them.' });
          s.set('c4_decided');
          s.music('worldmap');
          s.place('player', 24, 4, 'left');
          yield s.fadeIn(40);
          yield s.say('cloud', "We'll stand out too much traveling as one big group. Let's split up.");
          yield s.say('cloud', "There's a town called Kalm to the northeast. We'll meet up there.");
          yield s.say('aeris', "Kalm, northeast. Got it! Don't get lost, bodyguard.");
          yield s.choosePArty(['cloud'], { msg: 'Who travels with Cloud? The others will wait in Kalm.' });
          // FF7 date points: +1 for each of Barret, Tifa and Aeris in the party that leaves Midgar
          ['barret', 'tifa', 'aeris'].forEach(id => { if (s.inParty(id)) FF7.story.datePts(s, { [id]: 1 }); });
          ['barret', 'tifa', 'aeris', 'redxiii'].forEach(id => s.remove(id));
          s.set('left_midgar');
          yield s.world('midgar');
        } },
    ],
  });

  // ------------------------------------------------------------------ world map link
  // Midgar can't be entered again during Disc 1 (FF7: the gates are sealed until the Disc 2 raid).
  FF7.world.link('midgar', {
    run: function* (s) { yield s.msg("There's no way back into Midgar right now."); },
    if: s => !s.flag('disc2'),
  });
})();
