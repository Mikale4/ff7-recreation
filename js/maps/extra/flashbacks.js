// Extra (not in the PS1 game; Config > Playable Flashbacks): Zack's last stand. The Shinra Mansion basement's memory
// (C12b, js/maps/c12b/part4.js) goes on after the breakout: months later, Zack crosses the wasteland outside Midgar with
// Cloud, barely conscious, on his back. Two Shinra patrols on the way; at the cliff over Midgar the whole detachment
// (Shinra Army: a fight that is lost); Zack falls, and Cloud takes the Buster Sword. Then back to the basement.
// Zack is a guest (js/data/characters.js), at the party's level (40 at least). The Corel flashback's guests (young
// Barret and Dyne) are in js/maps/c6a/part4.js; their battle models are registered here.
// Flags: zk_on (playing), zk_p1, zk_p2 (the patrols), zk_done. Var: zk_party. (Dialogue original.)
(function () {
  const C3 = FF7.chars3d;
  // the flashback guests' battle models: Barret before the gun-arm, Dyne before his; miners' rifles
  if (C3 && C3.setPreset && C3.resolve) {
    C3.setPreset('young_barret', Object.assign({}, C3.resolve('barret'), { extras: ['vest', 'beard', 'belt', 'wristband'], weapon: 'rifle' }));
    C3.setPreset('young_dyne', Object.assign({}, C3.resolve('dyne'), { extras: ['stubble', 'dyneVest', 'necklace', 'belt'], weapon: 'rifle' }));
  }
  const ON = () => FF7.state.config.flashbacks !== false;
  FF7.story.zk_playable = ON;
  const FIGHT = { bg: 'cliff', noEscape: true, noRewards: true, canLose: true };

  // from the basement (c12b/part4.js): the breakout captions, then this
  FF7.story.zk_start = function* (s) {
    s.set('zk_on');
    s.setVar('zk_party', FF7.state.party.filter(Boolean).join(','));
    s.setVar('zk_phs', FF7.state.phsEnabled ? 1 : 0); s.phs(false);   // (no swapping Zack out on the way)
    FF7.sys.party.joinGuest('zack', Math.max(40, FF7.sys.party.avgLevel()));
    s.party(['zack']);
    yield s.caption('Months later.\nThe wasteland outside Midgar.', { hold: 160, bg: '#000' });
    yield s.goto('fb_wasteland', 'start');
  };
  function* finish(s) {
    const saved = String(s.get('zk_party') || 'cloud').split(',').filter(id => id && !FF7.isGuest(id));
    if (s.isMember('zack')) s.leave('zack');
    s.party(saved.length ? saved : ['cloud']);
    if (s.get('zk_phs')) s.phs(true);
    s.unset('zk_on');
    s.set('zk_done');
    yield s.goto('mansion_basement', 'zk_back');
  }
  function* patrol(s, flag, spots, enemies, line) {
    s.set(flag);
    spots.forEach(([x, y], i) => s.spawn('zk_g' + i, 'soldier', x, y, 'down', { name: 'Shinra Soldier' }));
    yield s.say('Shinra Soldier', line);
    yield s.battle(Object.assign({ enemies }, FIGHT));
    spots.forEach((_, i) => s.remove('zk_g' + i));
  }

  const GRID = [
    "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
    "#..x.......................x.#",
    "#...............R............#",
    "#......R.............x.......#",
    "#............................#",
    "#...x...........R........x...#",
    "#............................#",
    "#.......R...........x........#",
    "#............................#",
    "#..x..........R..........R...#",
    "#............................#",
    "#......x.............x.......#",
    "##############################",
  ];
  FF7.defineMap('fb_wasteland', {
    name: 'The Wasteland (Five Years Ago)', area: 'Midgar Area', theme: 'desert', music: 'fiveyears',
    // (grey rock under a rain-dark sky, Midgar on the horizon: the city Zack never reaches)
    look: { wall: '#5a5048', trim: '#241e18', floor: ['#6a5e50', '#645848'], floor2: ['#5e5446', '#585040'], sky: ['#23262e', '#5a5c62'], fog: { color: [0.36, 0.37, 0.4], near: 9, far: 28 },
      light: [0.66, 0.66, 0.7], ambient: [0.4, 0.41, 0.46], skyline: 'midgar', rain: true },
    grid: GRID,
    entries: { start: [14, 11, 'up'] },
    exits: [],
    triggers: [
      { id: 'zk_p1', at: [1, 8, 28, 1], once: true, if: s => s.flag('zk_on') && !s.flag('zk_p1'),
        run: function* (s) { yield* patrol(s, 'zk_p1', [[12, 5], [16, 5]], ['attack_squad', 'attack_squad', 'attack_squad'], "There! The escaped specimens! Orders are to dispose of them on sight!"); } },
      { id: 'zk_p2', at: [1, 5, 28, 1], once: true, if: s => s.flag('zk_on') && !s.flag('zk_p2') && s.flag('zk_p1'),
        run: function* (s) {
          yield* patrol(s, 'zk_p2', [[11, 2], [18, 2]], ['soldier_1st', 'attack_squad', 'attack_squad'], "Specimen Zack, SOLDIER First Class. Surrender now and this ends quietly.");
          yield s.say('zack', "Quietly? Nah. That's not really my style.");
        } },
      { id: 'zk_cliff', at: [1, 2, 28, 1], once: true, if: s => s.flag('zk_on') && s.flag('zk_p2'),
        run: function* (s) { yield* FF7.story.zk_cliff(s); } },
    ],
    onEnter: function* (s) {
      if (!s.flag('zk_on') || s.flag('zk_p1')) return;
      yield s.wait(30);
      yield s.say('zack', "Hey, Cloud... You awake back there? Look. Midgar. We're almost there.");
      yield s.say('zack', "We made it, buddy. Once we're in the city, we'll figure it all out. Get some work, make some money...\fMaybe I'll finally see Aeris again, huh?");
    },
  });

  // the cliff: Cloud set down against a rock; the detachment; the fight that is lost; the sword
  FF7.story.zk_cliff = function* (s) {
    s.spawn('zk_cloud', 'cloud', 14, 3, 'down', { name: 'Cloud', anim: 'kneel' });
    yield s.say('zack', "Rest here a sec, okay? ...Stay put.");
    s.sfx('helicopter'); s.shake(1, 80);
    for (let i = 0; i < 6; i++) s.spawn('zk_s' + i, 'soldier', 8 + i * 3, 9, 'up', { name: 'Shinra Soldier' });
    yield s.say('Shinra Soldier', "Target sighted! All units, open fire on my command!");
    yield s.move('player', 14, 5);
    yield s.face('player', 'down');
    yield s.say('zack', "......So that's how it is. The whole army, huh?");
    yield s.say('zack', "Heh. You know what? I've got a dream to protect. And a friend who needs me to keep him alive.\fSo come on! All of you!");
    yield s.battle(Object.assign({ enemies: ['shinra_army'], music: 'boss' }, FIGHT));
    // lost (or, somehow, standing): he falls either way
    for (let i = 0; i < 6; i++) s.remove('zk_s' + i);
    s.music('none');
    s.anim('player', 'lie');
    yield 60;
    yield s.caption('The rain comes down on the wasteland.', { hold: 120, bg: 'rgba(0,0,0,0.6)' });
    s.stopAnim('zk_cloud');
    yield s.move('zk_cloud', 15, 5);   // (beside him, not over him)
    yield s.face('zk_cloud', 'left');
    s.anim('zk_cloud', 'kneel');
    yield s.say('zack', "......Cloud... Heh. You're awake...");
    yield s.say('zack', "Listen... You gotta live. For both of us, okay? My dreams... my honor...\fThey're yours now.");
    yield s.msg("Zack presses the Buster Sword into Cloud's hand.");
    yield s.say('zack', "......You're gonna be... my living proof...");
    yield 60;
    yield s.say('cloud', "......Zack......");
    yield s.fadeOut(90);
    yield* finish(s);
  };

  // back in the basement: the present (an entry beside the library shelves where the memory began)
  if (FF7.maps.mansion_basement) FF7.maps.mansion_basement.entries.zk_back = [21, 9, 'up'];
  FF7.patchMap('mansion_basement', {
    onEnter: function* (s) {
      if (!s.flag('zk_done') || s.flag('zk_back_seen')) return;
      s.set('zk_back_seen');
      yield s.fadeIn(40);
      yield s.say('cloud', "(Zack... You carried me the whole way. And you gave me everything you had left.)");
      yield s.say('cloud', "(I'll live. For both of us.)");
    },
  });
})();
