// Developer test maps (reachable via ?map=dev_test)
FF7.defineMap('dev_test', {
  name: 'Test Area',
  theme: 'slums',
  music: 'slums',
  grid: [
    "################################",
    "#hhhhhh##w##w##hhhh#PPPP#......#",
    "#......+..........+.......l....#",
    "#..B...........................#",
    "#..BB....T..........o..........#",
    "#.......,,,,,,.........D...... #",
    "#..x....,,ff,,...~~~...ttt.....#",
    "#..x....,,,,,,...~~~.......S...#",
    "#.................^^...........#",
    "#.....l..........::::..........#",
    "#...............:::::::::......#",
    "#==========....................#",
    "#...........................####",
    "################################",
  ],
  heights: [
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
    "00000000000000000222200000000000",
    "00000000000000002222222220000000",
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
  ],
  entries: { default: [5, 8, 'down'] },
  npcs: [
    { id: 'barret', model: 'barret', at: [10, 3], dir: 'down', talk: function* (s) {
      yield s.say('barret', 'Yo, newcomer! This is just a test area.');
      const c = yield s.ask('barret', 'You wanna fight some Shinra?', ['Sure', 'Not now']);
      if (c === 0) { const r = yield s.battle({ enemies: ['1st_ray', 'guard_hound'], bg: 'slums' }); yield s.say('barret', 'Result: ' + r); }
    } },
    { id: 'tifa', model: 'tifa', at: [14, 3], dir: 'down', wander: 2, talk: function* (s) { yield s.emote('tifa', '!'); yield s.say('tifa', "Cloud! You look like you've seen a ghost."); } },
    { id: 'kid', model: 'kid3', at: [22, 9], dir: 'left', talk: function* (s) { yield s.say('Kid', 'Hey mister, you got any Gil?'); } },
  ],
  items: [{ at: [4, 9], item: 'potion', id: 'dev_potion' }, { at: [6, 10], materia: 'fire', id: 'dev_fire' }],
  chests: [{ at: [28, 2], item: 'ether', id: 'dev_chest1' }],
  exits: [{ at: [30, 3, 1, 4], to: 'dev_test', entry: 'default' }],
  battle: { table: 'sector4_plate', bg: 'slums' },
});
