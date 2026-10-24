// Chapter 8, part 4 — the Forgotten Capital. The spiny path, the shell houses (Magic Source and the
// save point, Guard Source, the inn house: Elixir, the Enemy Skill hidden behind the bed, the rest
// and Cloud's nightmare), the great conch shell (Aurora Armlet), the north building (Comet) and the
// shining stairs, the crystal staircase, the water altar: Cloud nearly strikes Aeris, Sephiroth
// kills her, Jenova·LIFE, the farewell at the lake. END OF DISC 1. Disc 2 opens with the party's
// resolve; they leave north through Corral Valley and its cave toward Icicle Inn (C9: icicle_gate).
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
(function () {
  const TEAM = ['tifa', 'barret', 'redxiii', 'yuffie', 'caitsith', 'vincent', 'cid'];
  const members = s => TEAM.filter(id => s.isMember(id));
  const third = s => TEAM.find(id => s.inParty(id)) || null;
  function spawnCrew(s, ids, spots, dir) {
    const used = ids.slice(0, spots.length);
    used.forEach((id, i) => s.spawn(id, id, spots[i][0], spots[i][1], spots[i][2] || dir || 'up', { name: s.name(id) }));
    return used;
  }
  const clearCrew = (s, ids) => ids.forEach(id => s.remove(id));
  // The city at night under its canopy of white coral (refs 10-forgottencity28-34, ff7art42/43): blue-grey
  // stone, bone-white shells and ruins, teal-tipped coral trees (T leaves take `grass`), dark blue sky and fog.
  const CITY = { floor: ['#72829e', '#6c7c98'], floor2: ['#a4aec0', '#9ca6b8'], floor3: ['#d6d8d0', '#ced0c8'], wall: '#cdd2d6', trim: '#46546e',
    grass: ['#bcd8dc', '#b4d0d4'], water: '#2a5a98', mako: '#80d0ff',
    ambient: [0.3, 0.36, 0.5], light: [0.62, 0.7, 0.9], sky: ['#02050f', '#1a2c52'], fog: { color: [0.07, 0.11, 0.22], near: 10, far: 26 }, wallTop: '#b4bccb' };
  // inside the shell houses: warm wooden floors round the shell's twisted central column (refs 11-gaeacliff02, 03)
  const SHELL_IN = { floor: ['#8a6440', '#825c3a'], floor2: ['#9a7650', '#926e48'], floor3: ['#6a5a48', '#625242'], wall: '#b8b4a4', trim: '#5a4028',
    wood: ['#7a5a36', '#72522e'], wallH: 2.8, indoor: true, sky: ['#000000', '#000000'], fog: null,
    ambient: [0.46, 0.42, 0.4], light: [0.82, 0.76, 0.66] };
  // FF7: whatever materia Aeris was carrying is lost with her.
  function loseAerisMateria() {
    const c = FF7.state && FF7.state.chars && FF7.state.chars.aeris;
    if (!c) return;
    c.weaponMateria = (c.weaponMateria || []).map(() => null);
    c.armorMateria = (c.armorMateria || []).map(() => null);
    if (FF7.sys && FF7.sys.stats && FF7.sys.stats.recalc) FF7.sys.stats.recalc(c);
  }

  FF7.world.link('forgotten_capital', { map: 'capital_path', entry: 'from_world' });
  FF7.world.link('corral_valley', { map: 'corral_valley', entry: 'from_world' });
  FF7.world.link('corral_valley_n', { map: 'corral_cave_end', entry: 'from_north' });

  // ================================================================== the spiny path
  FF7.defineMap('capital_path', {
    name: 'Forgotten Capital', area: 'Forgotten Capital', theme: 'city_ancients', music: 'cry', look: CITY,
    camera: { pitch: 36, dist: 8 },   // ref 10-forgottencity28: low, behind Cloud, looking up the coral path
    battle: { table: 'forgotten_capital_path', bg: 'city_ancients', rate: 0.7 },
    // branching white coral trees (T) among the spiny crystal coral, broad teal shell canopies overhead
    legend: { 'T': 'coraltree' },
    props: [
      { at: [4.5, 16.5], prop: 'canopy', r: 3.2, h: 3.4, col: '#5e9ea6', col2: '#c8c0b4' },
      { at: [21.5, 14.5], prop: 'canopy', r: 3.6, h: 3.8, col: '#6aa8ae', col2: '#c8c0b4' },
      { at: [5.5, 8.5], prop: 'canopy', r: 3.0, h: 3.0, col: '#568e9c', col2: '#c8c0b4' },
      { at: [23.5, 5.5], prop: 'canopy', r: 3.4, h: 3.6, col: '#62a2a8', col2: '#c8c0b4' },
      { at: [8.5, 1.5], prop: 'canopy', r: 2.8, h: 3.2, col: '#5a96a0', col2: '#c8c0b4' },
    ],
    grid: [
      "UU%UUUUTUU...::..UTUUUUU%UUU",
      "UUTUUUUU%UU...::..%%UUUUTUUU",
      "UUU%UUUUTUUU...::..UTUUUU%UU",
      "UUUTUUUUU%UU%...::..UUUUUTUU",
      "UUUU%UUUTRTUU...::..UTUUUU%U",
      "UUUUTUUUUU%UU...::..%%UUUUTU",
      "TUUUU%UUUUTUU...::..UTUUUUU%",
      "%UUUUTUUUUUU...::..UUU%UUUTU",
      "TUUUUU%UUUU...::..UUUUTUUUUU",
      "U%UUUUTUUU...::..URUUUU%UUUT",
      "UTUUUUU%U...::..UU%UUUUTUUUU",
      "UU%UUUTU...::..UUUTUUUUU%UUU",
      "UUTUUUU%...::..UUUU%UUUUTUUU",
      "UUU%UU%...::..UUUUUTUUUUU%UU",
      "UUUTUUU...R:..UTUUUU%UUUUTUU",
      "UUUU%UU...::..%%UUUUTUUUUU%U",
      "UUUUTUUU...::..UTRUUU%UUUUTU",
      "TUUUU%UU...::..%%UUUUTUUUUU%",
      "%UUUUTUUU...::..UTUUUU%UUUTU",
      "TUUUUU%UU%...::..UUUUUTUUUUU",
    ],
    entries: { from_world: [13, 18, 'up'], from_center: [13, 1, 'down'] },
    exits: [
      { at: [10, 19, 7, 1], to: 'world', loc: 'forgotten_capital' },
      { at: [10, 0, 7, 1], to: 'capital_center', entry: 'from_path' },
    ],
    onEnter: function* (s) {
      if (s.flag('c8_capital_arrived')) return;
      s.set('c8_capital_arrived');
      yield s.msg('A path winds between towering spires of pale, spiny coral... Beyond it, strange white shapes rise out of the mist.');
      const t = third(s);
      if (t === 'redxiii') yield s.say('redxiii', "The Forgotten Capital... the City of the Ancients. Grandfather spoke of it. I never thought I would see it with my own eyes.");
      else if (t === 'tifa') yield s.say('tifa', "This is where Aeris was heading... Cloud, she's here somewhere. I know it.");
      else if (t === 'barret') yield s.say('barret', "Place gives me the creeps. Let's find Aeris and get outta here.");
      else if (t === 'cid') yield s.say('cid', "Don't that beat all... A whole city made outta seashells.");
      else if (t) yield s.say(t, t === 'yuffie' ? "Whoa... it's so quiet. Like the whole place is holding its breath." : t === 'vincent' ? "......The air here is still. As if time stopped long ago." : "The city of the Ancients... So this is where Aeris' people lived.");
      yield s.say('cloud', "(Aeris... are you here?)");
    },
  });

  // ================================================================== the city centre
  FF7.defineMap('capital_center', {
    name: 'Forgotten Capital', area: 'Forgotten Capital', theme: 'city_ancients', music: 'cry',
    // ref 10-forgottencity29: a pale stone stair-path climbs north between low ruins on three terraces,
    // round white shell houses (domes of stepped walls rising to an off-centre crown; walls are 1.2 m
    // above their height digit), coral forest all round under broad shell canopies
    look: Object.assign({}, CITY, { wallH: 1.2 }),
    camera: { pitch: 42, dist: 12 },
    legend: { 'T': 'coraltree' },
    // the great hall to the north keeps its full height
    buildings: [{ at: [13, 0, 14, 3], h: 3.0, col: '#cdd2d6', roof: '#b4bccb', win: false }],
    props: [
      { at: [15, 13], h: 3.0 }, { at: [24, 14], h: 3.0 },       // the ruined pillars
      { at: [2.5, 22.5], prop: 'canopy', r: 3.6, h: 4.4, col: '#5a96a0', col2: '#c8c0b4' },
      { at: [37, 22.5], prop: 'canopy', r: 3.2, h: 4.0, col: '#62a0a8', col2: '#c8c0b4' },
      { at: [38.5, 10.5], prop: 'canopy', r: 2.8, h: 4.2, col: '#568e9c', col2: '#c8c0b4' },
      { at: [9.5, 0.5], prop: 'canopy', r: 3.0, h: 4.6, col: '#5e9ea6', col2: '#c8c0b4' },
      { at: [31.5, 0.5], prop: 'canopy', r: 3.2, h: 4.8, col: '#5a96a0', col2: '#c8c0b4' },
    ],
    grid: [
      "UU::%URUT%UUU##############UT%UUUU%URUT%",
      "%U::U%URUT%UR##############RUT%UUUU%URUT",
      "T%::.#####.UR##############RU.#####.U.RU",
      "UT..#######.RRRRRRR++RRRRRRR.#######..UR",
      "RU.#########U.....::::.....U#########U%U",
      "UR.#########....U.::::.U....#########.U%",
      "%U..##U+U##U..U...::::...U...##U+U##..UU",
      "U%................::::......U.........UU",
      "UU................::::................UU",
      "UUxxxxxxxxxxxxxxx^^^^^^xxxxxxxxxxxxxxx%U",
      "UU..#####..U......::::.....T..........T%",
      "%U#########..xxx..::::.......U.#####.UUT",
      "T###########.x....::::..xxx...#######.RU",
      "U###########Ux.|..::::....x.U#########UR",
      "R###########......::::..|.x..#########%U",
      "UU###U+U###..xxx..::::........##U+U##.U%",
      "%U..........T.....::::..xxx...........UU",
      "U%.........T......::::............T...UU",
      "UUxxxxxxxxxxxxxxx^^^^^^xxxxxxxxxxxxxxxUU",
      "UU................::::...U...T......U.%U",
      "UU...xxx.......U..::::::::::::::::::::::",
      "%U...x....OO......::::::::::::::::::::::",
      "T%.U.x.......xxx..::::....xxxx.....T..RU",
      "UT......T.........::::...........U....UR",
      "RUT%UUUU%URUT%UUUU::::T%UUUU%URUT%UUUU%U",
      "URUT%UUUU%URUT%UUU::::UT%UUUU%URUT%UUUU%",
    ],
    heights: [
      "4444444444444777777777777774444444444444",
      "4444444444447777777777777777444444444444",
      "4444457777447777777777777777447777544444",
      "4444579997745777777447777775477999754444",
      "4445579997754444444444444444577999755444",
      "4445577777554444444444444444557777755444",
      "4444554445544444444444444444455444554444",
      "4444444444444444444444444444444444444444",
      "4444444444444444444444444444444444444444",
      "2255555555555555233333325555555555555522",
      "2222555532222222222222222222222222222222",
      "2257777755322333222222222222222555552222",
      "2577999775532322222222223332225577775222",
      "2577997755332322222222222232235779975522",
      "2555555553332222222222222232233577755322",
      "2233322233322333222222222222223322233222",
      "2222222222222222222222223332222222222222",
      "2222222222222222222222222222222222222222",
      "0033333333333333011111103333333333333300",
      "0000000000000000000000000000000000000000",
      "0000011100000000000000000000000000000000",
      "0000010000000000000000000000000000000000",
      "0000010000000111000000000011110000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
    ],
    lights: [[19, 4, '#c0e8ff', 3], [10, 21, '#a0d0ff', 2], [6, 17, '#a0c8ff', 2], [19, 13, '#80b0ff', 3], [33, 17, '#a0c8ff', 2]],
    entries: {
      from_path: [19, 23, 'up'], from_north: [19, 4, 'down'], from_house_w: [7, 7, 'down'], from_house_e1: [32, 7, 'down'],
      from_house_e2: [33, 16, 'down'], from_shell: [6, 16, 'down'], from_lake: [38, 20, 'left'], from_valley: [3, 2, 'down'],
    },
    exits: [
      { at: [18, 25, 4, 1], to: 'capital_path', entry: 'from_center' },
      { at: [19, 3, 2, 1], to: 'capital_north', entry: 'from_center', sfx: 'door' },
      { at: [7, 6, 1, 1], to: 'capital_house_w', entry: 'from_center', sfx: 'door' },
      { at: [32, 6, 1, 1], to: 'capital_house_e1', entry: 'from_center', sfx: 'door' },
      { at: [33, 15, 1, 1], to: 'capital_house_e2', entry: 'from_center', sfx: 'door' },
      { at: [6, 15, 1, 1], to: 'capital_shell', entry: 'from_center' },
      { at: [39, 20, 1, 2], to: 'capital_lake', entry: 'from_center' },
      { at: [2, 0, 2, 1], to: 'corral_valley', entry: 'from_capital', if: s => s.flag('disc2'),
        blocked: function* (s) { yield s.say('cloud', "(The path leads north, out of the city... Not yet. Aeris is somewhere here.)"); } },
    ],
    objects: [
      { at: [10, 21], talk: function* (s) { yield s.msg('A round basin carved from pale shell, filled with clear water. The bottom glitters like scattered stars.'); } },
      { at: [11, 17], talk: function* (s) { yield s.msg('A tall white tree. Its bark is smooth and cool, almost like bone... or shell.'); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c8_center_seen') || s.flag('disc2')) return;
      s.set('c8_center_seen');
      yield s.msg('Houses shaped like great seashells stand silent among the white trees. No one has lived here for a very long time.');
      yield s.say('cloud', "(Where are you, Aeris...?)");
    },
  });

  // ------------------------------------------------------------------ the shell houses
  FF7.defineMap('capital_house_w', {
    name: 'Forgotten Capital', area: 'Forgotten Capital', theme: 'city_ancients', music: 'cry', look: SHELL_IN,
    // round shell interior: curved bone walls, wooden floor, the shell's twisted column at the back
    camera: { pitch: 60, dist: 9 },
    // the shell's twisted central column at the back, little coral trees in the curve of the wall
    props: [
      { at: [8.5, 1], prop: 'spire', h: 2.8, r: 0.95, col: '#d6ccbc' }, { at: [8, 1], prop: 'none' }, { at: [9, 1], prop: 'none' },
      { at: [2, 3], prop: 'coraltree', h: 1.9, col: '#e0d6c8' }, { at: [15, 3], prop: 'coraltree', h: 1.9, col: '#e0d6c8' },
    ],
    grid: [
      "    ##########    ",
      "  ###k..||..k###  ",
      " ##j..........q## ",
      " #U............U# ",
      "##..S...........##",
      " #..........t.c.# ",
      " ##............## ",
      "  ###........###  ",
      "    ####++####    ",
    ],
    lights: [[8, 3, '#c0d8ff', 3], [2, 3, '#a0c8ff', 2], [15, 3, '#a0c8ff', 2]],
    entries: { from_center: [8, 7, 'up'] },
    exits: [{ at: [8, 8, 2, 1], to: 'capital_center', entry: 'from_house_w', sfx: 'door' }],
    chests: [{ at: [11, 6], item: 'magic_source', id: 'capital_house_w_magic_source' }],
    objects: [{ at: [5, 1], talk: function* (s) { yield s.msg('Shelves of smooth stone tablets, covered in flowing script nobody can read anymore.'); } }],
  });
  FF7.defineMap('capital_house_e1', {
    name: 'Forgotten Capital', area: 'Forgotten Capital', theme: 'city_ancients', music: 'cry', look: SHELL_IN,
    camera: { pitch: 60, dist: 9 },
    // the shell's twisted central column at the back, little coral trees in the curve of the wall
    props: [
      { at: [7.5, 1], prop: 'spire', h: 2.8, r: 0.95, col: '#d6ccbc' }, { at: [7, 1], prop: 'none' }, { at: [8, 1], prop: 'none' },
      { at: [2, 3], prop: 'coraltree', h: 1.9, col: '#e0d6c8' }, { at: [13, 3], prop: 'coraltree', h: 1.9, col: '#e0d6c8' },
    ],
    grid: [
      "   ##########   ",
      "  ##k..||..k##  ",
      " ##.........j## ",
      " #U..........U# ",
      "##..tc........##",
      " ##..........## ",
      "  ###......###  ",
      "   ####++####   ",
    ],
    lights: [[7, 3, '#c0d8ff', 3]],
    entries: { from_center: [7, 6, 'up'] },
    exits: [{ at: [7, 7, 2, 1], to: 'capital_center', entry: 'from_house_e1', sfx: 'door' }],
    chests: [{ at: [12, 4], item: 'guard_source', id: 'capital_house_e1_guard_source' }],
  });

  // the house with beds: rest, and Cloud's nightmare
  function* nightmare(s) {
    s.set('c8_capital_slept');
    yield s.fadeOut(40);
    s.music('goodnight');
    s.heal();
    yield 120;
    s.music('none');
    yield s.caption('...That night...', { hold: 90, bg: '#000' });
    yield s.say('Voice', "......Cloud.", { pos: 'middle' });
    yield s.say('Voice', "The girl is kneeling at the altar, deep inside this city, praying to the Planet.\fSoon... she will stand in our way.", { pos: 'middle' });
    yield s.say('Voice', "Hurry. Stop her, Cloud. Before it's too late...", { pos: 'middle' });
    yield s.say('cloud', "(Stop... her......?)", { pos: 'middle' });
    s.flash('#ffffff', 20, 0.7); s.sfx('heartbeat');
    const all = members(s);
    const crew = spawnCrew(s, all, [[13, 4, 'right'], [13, 6, 'right'], [12, 5, 'right'], [15, 3, 'down'], [15, 7, 'up'], [6, 4, 'right'], [6, 7, 'right']]);
    s.place('player', 15, 5, 'left');
    s.music('cry');
    yield s.fadeIn(30);
    yield s.say('cloud', "......!");
    yield s.say('tifa', "Cloud? What's wrong? You were talking in your sleep.");
    yield s.say('cloud', "......She's here. Aeris is here, deep inside this city. Kneeling at an altar... surrounded by water.");
    yield s.say('cloud', "And Sephiroth knows it too.");
    yield s.say('barret', "Then what're we waitin' for?! Let's go get her!");
    if (crew.includes('redxiii')) yield s.say('redxiii', "The great building to the north of the square... The path deeper into the city must lie beyond it.");
    yield s.fadeOut(30);
    clearCrew(s, crew);
    yield s.fadeIn(30);
  }
  function* restHere(s) {
    if (!s.flag('c8_capital_slept') && !s.flag('aeris_dead')) {
      const c = yield s.ask(null, 'Soft beds woven from pale fibers. Everyone is exhausted.\nRest here for the night?', ['Rest', 'Not yet']);
      if (c === 0) yield* nightmare(s);
      return;
    }
    const c = yield s.ask(null, 'Rest for a while?', ['Rest', 'Not now']);
    if (c !== 0) return;
    yield s.fadeOut(30);
    s.music('goodnight');
    s.heal();
    yield 150;
    s.music('cry');
    yield s.fadeIn(30);
  }
  FF7.defineMap('capital_house_e2', {
    name: 'Forgotten Capital', area: 'Forgotten Capital', theme: 'city_ancients', music: 'cry', look: SHELL_IN,
    // refs 11-gaeacliff02, 03: round wooden floor, beds along the east curve, a railed stair-well in the
    // middle and the shell's twisted column rising at the back; seen steeply from above
    camera: { pitch: 60, dist: 9.5 },
    props: [{ at: [9.5, 1], prop: 'spire', h: 2.8, r: 0.95, col: '#d6ccbc' }, { at: [9, 1], prop: 'none' }, { at: [10, 1], prop: 'none' }],
    grid: [
      "     ##########     ",
      "   ###j..||..q###   ",
      "  ##..........bb##  ",
      " ##.tc...........## ",
      " #..............bb# ",
      "##......====......##",
      " #......=  =....bb# ",
      " ##.....====.....## ",
      "  ##............##  ",
      "   ###........###   ",
      "     ####++####     ",
    ],
    lights: [[9, 2, '#c0d8ff', 3], [15, 4, '#ffe0b0', 3]],
    entries: { from_center: [9, 9, 'up'] },
    exits: [{ at: [9, 10, 2, 1], to: 'capital_center', entry: 'from_house_e2', sfx: 'door' }],
    items: [{ at: [17, 5], materia: 'enemy_skill', id: 'capital_house_e2_enemy_skill' }],
    chests: [{ at: [3, 6], item: 'elixir', id: 'capital_house_e2_elixir' }],
    triggers: [
      { at: [14, 2, 2, 1], on: 'talk', run: restHere },
      { at: [16, 4, 2, 1], on: 'talk', run: restHere },
      { at: [16, 6, 2, 1], on: 'talk', run: restHere },
    ],
  });

  // ------------------------------------------------------------------ the great conch shell
  FF7.defineMap('capital_shell', {
    name: 'Forgotten Capital', area: 'Forgotten Capital', theme: 'city_ancients', music: 'cry',
    // ref 10-forgottencity31: the round inside of the great shell, seen from high above. A railed balcony
    // (red railings) rings the wall; two curved stairs ('steps', Z), railed on their inner side, wind down
    // inside the railing the same way round, like the shell's own spiral, to a pool fringed with green reeds.
    legend: { 'Z': 'steps' },
    look: Object.assign({}, CITY, { floor: ['#5e6c66', '#5a6862'], floor3: ['#5c5852', '#58544e'], wall: '#a6b2a2', trim: '#c46a6a',
      floor2: ['#6e604e', '#685a48'], grass: ['#2e6656', '#2a6050'], water: '#3a78c0', wallH: 3.4, indoor: true, sky: ['#000000', '#000000'], fog: null, wallTop: '#6a7468',
      ambient: [0.42, 0.48, 0.5], light: [0.7, 0.8, 0.78] }),
    camera: { pitch: 64, dist: 13 },
    battle: { table: 'forgotten_capital_shell', bg: 'city_ancients', rate: 0.8 },
    grid: [
      "        ############        ",
      "      ###__________###      ",
      "    ###______________###    ",
      "   ##_____========_____##   ",
      "  ##____==........==____##  ",
      "  #____=Z...........=____#  ",
      " ##___=ZZ=..GGGG.....=___## ",
      " #___=ZZ=.GGGGGGGG....=___# ",
      " #___=Z=..GG~~~~GG...%=___# ",
      "##___ZZ=..G~~~~~~G..=ZZ___##",
      " #___=%...GG~~~~GG..=Z=___# ",
      " #___=....GGGGGGGG.=ZZ=___# ",
      " ##___=.....GGGG..=ZZ=___## ",
      "  #____=...........Z=____#  ",
      "  ##____==........==____##  ",
      "   ##_____========_____##   ",
      "    ###______________###    ",
      "      ###__________###      ",
      "        #####__#####        ",
    ],
    heights: [
      "0000000099999999999900000000",
      "0000009999999999999999000000",
      "0000999999999999999999990000",
      "0009999999999999999999999000",
      "0099999999000000009999999900",
      "0099999910000000000099999900",
      "0999999322000000000009999990",
      "0999995430000000000000999990",
      "0999996500000000000000999990",
      "9999987700000000000077899999",
      "0999990000000000000056999990",
      "0999990000000000000345999990",
      "0999999000000000002239999990",
      "0099999900000000000199999900",
      "0099999999000000009999999900",
      "0009999999999999999999999000",
      "0000999999999999999999990000",
      "0000009999999999999999000000",
      "0000000099999999999900000000",
    ],
    lights: [[13, 9, '#60e0d0', 4], [4, 4, '#60e0d0', 2], [23, 4, '#60e0d0', 2], [4, 15, '#60e0d0', 2], [23, 15, '#60e0d0', 2]],
    entries: { from_center: [13, 17, 'up'] },
    exits: [{ at: [13, 18, 2, 1], to: 'capital_center', entry: 'from_shell' }],
    chests: [{ at: [13, 13], item: 'aurora_armlet', id: 'capital_shell_aurora_armlet' }],
    onEnter: function* (s) {
      if (s.flag('c8_shell_seen')) return;
      s.set('c8_shell_seen');
      yield s.msg('The inside of an enormous shell. Its smooth walls spiral down and down into the dim depths.');
    },
  });

  // ------------------------------------------------------------------ the north building and the shining stairs
  FF7.defineMap('capital_north', {
    name: 'Forgotten Capital', area: 'Forgotten Capital', theme: 'city_ancients', music: 'cry', look: Object.assign({}, CITY, { indoor: true, fog: null, sky: ['#000000', '#000000'] }),
    // a tall round shell hall; a curved gallery runs round its north side; white coral trees by the door
    camera: { pitch: 54, dist: 10.5 },
    props: [{ at: [2, 14], prop: 'coraltree', h: 2.4 }, { at: [21, 14], prop: 'coraltree', h: 2.4 }],
    grid: [
      "      ############      ",
      "    ###__________###    ",
      "  ###______________###  ",
      " ##__________________## ",
      " #____________________# ",
      "##=================^^=##",
      " #.................^^.# ",
      " #.................^^.# ",
      "#..|............|..^^..#",
      "#.........EEEE.....^^..#",
      "#.........EEEE.....^^..#",
      "#.........EEEE.....^^..#",
      "#..|............|......#",
      " #....................# ",
      " #U..................U# ",
      "  ##................##  ",
      "    #######++#######    ",
    ],
    heights: [
      "888888888888888888888888",
      "888888888888888888888888",
      "888888888888888888888888",
      "888888888888888888888888",
      "888888888888888888888888",
      "888888888888888888877888",
      "000000000000000000066000",
      "000000000000000000055000",
      "000000000000000000044000",
      "000000000000000000033000",
      "000000000000000000022000",
      "000000000000000000011000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
    ],
    lights: [[11, 10, '#80d0ff', 4], [3, 3, '#e0a0ff', 2]],
    entries: { from_center: [11, 15, 'up'], from_crystal: [11, 13, 'up'] },
    exits: [
      { at: [11, 16, 2, 1], to: 'capital_center', entry: 'from_north', sfx: 'door' },
      { at: [10, 9, 4, 3], to: 'capital_crystal', entry: 'from_north', if: s => s.flag('c8_capital_slept'),
        blocked: function* (s) { yield s.msg('A stairway of shining blue light leads down into the depths of the city...'); yield s.say('cloud', "(Everyone's worn out. We should rest before going any further.)"); } },
    ],
    items: [{ at: [3, 3], materia: 'comet', id: 'capital_north_comet' }],
    onEnter: function* (s) {
      if (s.flag('c8_north_seen')) return;
      s.set('c8_north_seen');
      yield s.msg('A tall, hollow hall. In the middle of the floor, a stairway of shimmering blue light spirals away into the earth.');
    },
  });

  // ------------------------------------------------------------------ the crystal staircase
  FF7.defineMap('capital_crystal', {
    name: 'Forgotten Capital', area: 'Forgotten Capital', theme: 'city_ancients', music: 'cry',
    // ref backgrounds/ff7art43: a tall shaft of blue crystal, light falling from above. A ledge path winds
    // down its walls and crosses the abyss over the flat tops of two crystal pillars; tall crystal spires
    // rise out of the depths between the ledges.
    look: Object.assign({}, CITY, { floor: ['#9ab4d8', '#94aed2'], floor2: ['#b4c8e8', '#aec2e2'], wall: '#5a7cb8', trim: '#30487a', wallTop: '#8aa8d8',
      wallH: 3.4, sky: ['#00020a', '#0a3a9a'], fog: { color: [0.02, 0.08, 0.3], near: 9, far: 24 }, ambient: [0.36, 0.46, 0.66], light: [0.6, 0.74, 1.0] }),
    camera: { pitch: 62, dist: 12 },
    props: [
      { at: [8, 7], prop: 'spire', h: 4.6, r: 1.5, col: '#7e9ed8' },
      { at: [15.5, 6], prop: 'spire', h: 3.4, r: 1.1, col: '#8aaae0' },
      { at: [5, 17], prop: 'spire', h: 4.0, r: 1.3, col: '#7496d0' },
      { at: [16, 15.5], prop: 'spire', h: 2.8, r: 1.0, col: '#86a6dc' },
      { at: [17.5, 22], prop: 'spire', h: 3.6, r: 1.2, col: '#7e9ed8' },
      { at: [6, 21.5], prop: 'spire', h: 2.2, r: 0.9, col: '#8aaae0' },
    ],
    grid: [
      "########################",
      "## U..........U       ##",
      "## ............       ##",
      "## ............       ##",
      "##U::                 ##",
      "##:::                 ##",
      "##^^^                 ##",
      "##^^^                 ##",
      "##^^^                 ##",
      "##^^^                 ##",
      "##:::     ...      ::U##",
      "##:::::::U....::::::::##",
      "##::U::::....U::::::::##",
      "##        ...      :::##",
      "##                 ^^^##",
      "##                 ^^^##",
      "##                 ^^^##",
      "##        ...      ^^^##",
      "##       ....U::::::::##",
      "##       U....:::::::U##",
      "##        ...         ##",
      "##        ^^^         ##",
      "##        ^^^         ##",
      "##        ^^^         ##",
      "##  U..............U  ##",
      "##  ..S.............  ##",
      "##  ................  ##",
      "##  U..............U  ##",
    ],
    heights: [
      "999999999999999999999999",
      "990999999999999000000099",
      "990999999999999000000099",
      "990999999999999000000099",
      "009990000000000000000000",
      "009990000000000000000000",
      "007770000000000000000000",
      "007770000000000000000000",
      "007770000000000000000000",
      "007770000000000000000000",
      "006660000066600000066600",
      "006666666666666666666600",
      "006666666666666666666600",
      "000000000066600000066600",
      "000000000000000000044400",
      "000000000000000000044400",
      "000000000000000000044400",
      "000000000033300000044400",
      "000000000333333333333300",
      "000000000333333333333300",
      "000000000033300000000000",
      "000000000011100000000000",
      "000000000011100000000000",
      "000000000011100000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
    ],
    lights: [[11, 11, '#a0d8ff', 4], [11, 18, '#a0d8ff', 4], [8, 2, '#e0f0ff', 3], [3, 8, '#80c0ff', 2], [20, 15, '#80c0ff', 2], [6, 25, '#ffffff', 2], [11, 25, '#80c0ff', 3]],
    entries: { from_north: [8, 3, 'down'], from_altar: [11, 25, 'up'] },
    exits: [
      { at: [6, 1, 4, 1], to: 'capital_north', entry: 'from_crystal' },
      { at: [10, 27, 4, 1], to: 'capital_altar', entry: 'from_stairs' },
    ],
    onEnter: function* (s) {
      if (s.flag('c8_crystal_seen') || s.flag('aeris_dead')) return;
      s.set('c8_crystal_seen');
      yield s.msg('A staircase of living crystal descends through the dark, glowing softly with every step.');
      yield s.say('cloud', "(She's close. Very close...)");
    },
  });

  // ================================================================== the altar
  // the round stepping pillars, pier -> stair foot (corner to corner, so each one stands alone in the water)
  const STONES = [[19, 16], [18, 15], [17, 14], [16, 13]];
  // the spiral stair from its foot (15, 12) once round the altar (west along the south side, north, east,
  // down the east side) into the gap in the railing: the turning points
  const SPIRAL = [[8, 12], [8, 11], [7, 11], [7, 10], [6, 10], [6, 6], [7, 6], [7, 5], [8, 5], [8, 4], [12, 4], [12, 5], [13, 5], [13, 6], [14, 6], [14, 8], [11, 8]];
  function* altarScene(s) {
    s.set('c8_altar_scene');
    s.music('none');
    const all = members(s);
    const crew = spawnCrew(s, all, [[22, 18, 'up'], [24, 19, 'up'], [21, 18, 'up'], [25, 20, 'up'], [23, 20, 'up'], [22, 19, 'up'], [26, 20, 'up']]);
    const has = id => crew.includes(id);
    s.spawn('aeris', 'aeris', 10, 8, 'down', { name: s.name('aeris'), anim: 'pray' });
    yield s.move('player', 20, 17);
    yield s.cam(10, 8, 60);
    yield s.msg('At the heart of a still, clear pool, on an altar of white stone... a girl in pink kneels, praying.');
    s.camFollow(40);
    yield s.say('cloud', "Aeris...!");
    for (const [x, y] of STONES) yield s.jump('player', x, y, 0.5, 18);
    yield s.jump('player', 15, 12, 0.5, 18);
    yield s.move('player', SPIRAL);
    yield s.face('player', 'aeris');
    yield 40;
    // Sephiroth's will takes hold of Cloud
    s.sfx('heartbeat'); s.flash('#ffffff', 16, 0.5);
    yield s.msg(`${s.name('cloud')}'s hand closes around the hilt of his sword...\n...and slowly raises it, high above Aeris' head.`);
    s.anim('player', 'cast');
    yield 30;
    yield s.say('tifa', "Cloud!! What are you doing?!", { pos: 'bottom' });
    if (has('barret')) yield s.say('barret', "CLOUD! Snap out of it!!", { pos: 'bottom' });
    s.stopAnim('player');
    s.anim('player', 'hurt');
    yield s.say('cloud', "......!? What... what am I...?!\f(What are you making me do?!)");
    s.stopAnim('player');
    yield s.move('player', 12, 8, { speed: 0.02 });
    yield s.face('player', 'left');
    yield 30;
    s.stopAnim('aeris');
    yield s.face('aeris', 'player');
    yield 20;
    yield s.emote('aeris', '♪');
    yield 40;
    // Sephiroth
    s.spawn('seph', 'sephiroth', 10, 6, 'down', { name: 'Sephiroth' });
    s.flash('#ffffff', 10, 0.8); s.sfx('crit');
    yield s.movie('aeris_death', { text: 'From high above, a figure drops like a falling blade.\nSephiroth\'s long sword pierces Aeris.\n\nHer hair ribbon comes loose. A small white materia slips free,\nbounces down the altar steps... and sinks into the water.' });
    s.music('aeris');
    s.anim('aeris', 'dead');
    s.place('aeris', 11, 8, 'left');
    yield 40;
    s.anim('player', 'kneel');
    yield s.say('cloud', "......Aeris......");
    yield s.face('seph', 'player');
    yield s.say('sephiroth', "Do not trouble yourself over her. Soon, she too will become part of the Planet.");
    yield s.say('sephiroth', "All that remains is to go north. Beyond the snowfields, the Promised Land is waiting.\fThere, I will be reborn... joined with the Planet. A new being. And you, Cloud... will be there to see it.");
    yield s.say('cloud', "......Shut up.");
    yield s.say('cloud', "The cycle of the Planet, your Promised Land, your plans... none of it means a thing. Aeris is gone.");
    yield s.say('cloud', "She won't talk anymore. She won't laugh, or cry, or get mad at me... never again.\fSo what are we supposed to do? What am I supposed to do with... this?");
    yield s.say('cloud', "My hands are shaking. My throat's closing up. My eyes are burning......");
    yield s.say('sephiroth', "...What's this? Are you pretending to grieve?");
    yield s.say('sephiroth', "Hmph. Allow me to leave you a parting gift.");
    s.flash('#80c0ff', 20, 0.7);
    s.remove('seph');
    s.stopAnim('player');
    s.shake(4, 40);
    yield s.msg('Something vast and pale rises out of the water behind the altar...');
    yield s.battle({ table: 'boss_jenova_life', bg: 'capital_altar', music: 'aeris', noEscape: true });
    yield s.say('Voice', "......Stop pretending, Cloud. Grief, anger... you have no right to them.\fAfter all... you are only a puppet.", { pos: 'middle' });
    yield s.say('cloud', "......");
    // the others gather round
    yield s.fadeOut(40);
    clearCrew(s, crew);
    const near = spawnCrew(s, all, [[10, 7, 'right'], [10, 9, 'right'], [11, 7, 'down'], [11, 9, 'up'], [9, 8, 'right'], [12, 7, 'down'], [12, 9, 'up']]);
    s.place('player', 12, 8, 'left');
    s.anim('player', 'kneel');
    yield s.fadeIn(40);
    yield s.say('tifa', "Aeris...... No...... Aeris......");
    if (near.includes('barret')) yield s.say('barret', "Damn it... DAMN IT! She never hurt nobody!");
    if (near.includes('redxiii')) yield s.say('redxiii', "......She was the last of the Cetra. And she came here... for all of us.");
    if (near.includes('yuffie')) yield s.say('yuffie', "*sniff*...... This isn't fair...... It isn't fair!");
    if (near.includes('cid')) yield s.say('cid', "......Hell of a girl. Hell of a girl.");
    if (near.includes('caitsith')) yield s.say('caitsith', "......If I'd only... No. There's nothin' anyone could've done now.");
    if (near.includes('vincent')) yield s.say('vincent', "......");
    yield s.say('cloud', "......Let's take her somewhere peaceful.");
    yield s.fadeOut(60);
    clearCrew(s, near);
    s.remove('aeris');
    s.stopAnim('player');
    yield s.goto('capital_lake', 'farewell');
    yield* lakeFarewell(s);
  }
  const hopToAltar = function* (s) {
    if (!s.flag('aeris_dead')) return;
    const c = yield s.ask(null, 'Hop across the stepping pillars to the altar?', ['Go across', 'Stay']);
    if (c !== 0) return;
    for (const [x, y] of STONES) yield s.jump('player', x, y, 0.5, 18);
    yield s.jump('player', 15, 12, 0.5, 18);
  };
  const hopBack = function* (s) {
    const c = yield s.ask(null, 'Hop back across the pillars to the pier?', ['Go back', 'Stay']);
    if (c !== 0) return;
    for (const [x, y] of STONES.slice().reverse()) yield s.jump('player', x, y, 0.5, 18);
    yield s.jump('player', 20, 17, 0.5, 18);
    yield s.jump('player', 21, 18, 0.5, 18);
  };
  FF7.defineMap('capital_altar', {
    name: 'Forgotten Capital — Altar', area: 'Forgotten Capital', theme: 'city_ancients', music: null,
    // refs 10-forgottencity33, 34, 48, references/forgottencity.jpg: a still pool inside the crystal
    // building, round pillars standing in the water, a line of round pillar tops from the pier to the foot
    // of a spiral stair ('steps', Z) that winds once round the tall pedestal up to the railed altar top.
    // Seen from high in the south-east.
    legend: { 'Z': 'steps', 'o': 'roundpillar' },
    look: Object.assign({}, CITY, { floor: ['#7e8c8e', '#788688'], floor2: ['#96a2a2', '#909c9c'], floor3: ['#a4acb4', '#9ea6ae'], wall: '#6e6c9c',
      trim: '#8a90a8', wallTop: '#5a5880', water: '#46668e', wallH: 3.4, sky: ['#060614', '#2e3462'],
      fog: { color: [0.14, 0.14, 0.3], near: 10, far: 26 }, ambient: [0.44, 0.48, 0.6], light: [0.8, 0.84, 0.96] }),
    camera: { yaw: 35, pitch: 50, dist: 12 },
    grid: [
      "##############################",
      "#~~~~~~~~~~~~o~~~~~~~~~~~~~~~~",
      "#~~~~~~~~~~~~~~~~|~~~~~~~~|~~~",
      "#~|~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "#~~~~~~~ZZZZZ~~~~~~~~~~~~~~~~~",
      "#~~~~~~ZZ===ZZ~~~~~~~|~~~~~~~~",
      "#~~~~~ZZ=___=ZZ~~~~~~~~~~~~~~~",
      "#~o~~~Z=_____=Z~~~~~~~~~o~~~~~",
      "#~~~~~Z=______Z~~~o~~~~~~~~~~~",
      "#~~~~~Z=_____=~~~~~~~~~~~~~~~~",
      "#~~~~~ZZ=___=~~~~o~~~~~~~|~~~~",
      "#~~~|~~ZZ===~~~~~~~~~~~~~~~~~~",
      "#~~~~~~~ZZZZZZZ:~~~~~~o~~~~~~~",
      "#~~~~~~~~~~~~~~~o~~~~~~~~~~~~~",
      "#~~~o~~~~~~~~~~~~o~~~~~~~~~|~~",
      "#~~~~~~~~~~~~~~~~~o~~~~~~~~~~~",
      "#~~|~~~~~~o~~~~~~~~o~~~~~~~~~~",
      "#~~~~~~~~~~~~~~~~~~~....U~~~~~",
      "#~~~~~~o~~~~~~~~~~~~.......~~~",
      "#~~~~~~~~~~~|~~~~~~~~.......U~",
      "#~~~~~~~~~~~~~~~~~~~~.........",
      "#~~~~~~~~~~~~~~|~~~~~~........",
      "#~~~~~~~~o~~~~~~~~~~~~~.......",
      "#~~~~~~~~~~~~~~~~~~~~~~~......",
    ],
    heights: [
      "000000000000000000000000000000",
      "000000000000060000000000000000",
      "000000000000000001000000001000",
      "001000000000000000000000000000",
      "000000007788800000000000000000",
      "000000077999880000000100000000",
      "000000679999988000000000000000",
      "005000699999998000000000300000",
      "000000699999998000400000000000",
      "000000599999990000000000000000",
      "000000559999900005000000010000",
      "000010044999000000000000000000",
      "000000004332211100000020000000",
      "000000000000000010000000000000",
      "000030000000000002000000000100",
      "000000000000000000200000000000",
      "000100000020000000010000000000",
      "000000000000000000001111100000",
      "000000030000000000001111111000",
      "000000000000100000000111111110",
      "000000000000000000000111111111",
      "000000000000000100000011111111",
      "000000000100000000000001111111",
      "000000000000000000000000111111",
    ],
    // the round altar floor with its engraved rings (ref 10-forgottencity44)
    props: [{ at: [10, 8], prop: 'disc', r: 2.45, h: 0.02, col: '#8a90a8', top: '#b4bcc6', rim: '#8a90a8', ring: '#c8d2e0' }],
    lights: [[10, 8, '#e0f0ff', 3], [15, 12, '#a0c8ff', 2], [20, 17, '#a0c8ff', 2], [25, 21, '#c0d0ff', 2]],
    entries: { from_stairs: [26, 21, 'up'] },
    exits: [{ at: [25, 23, 4, 1], to: 'capital_crystal', entry: 'from_altar' }],
    objects: [{ at: [10, 8], talk: function* (s) { yield s.msg('The altar where Aeris prayed. The water all around is perfectly still.'); } }],
    triggers: [
      { at: [20, 17, 1, 1], if: s => s.flag('aeris_dead'), run: hopToAltar },
      { at: [16, 12, 1, 1], on: 'talk', run: hopBack },
      { at: [15, 13, 1, 1], on: 'talk', run: hopBack },
    ],
    onEnter: function* (s) {
      if (s.flag('aeris_dead') || s.flag('c8_altar_scene')) { s.music('cry'); return; }
      yield* altarScene(s);
    },
  });

  // ================================================================== the farewell at the lake, END OF DISC 1
  function* lakeFarewell(s) {
    s.music('aeris');
    const all = members(s);
    const crew = spawnCrew(s, all, [[11, 13, 'up'], [17, 13, 'up'], [9, 14, 'up'], [19, 14, 'up'], [12, 15, 'up'], [16, 15, 'up'], [14, 15, 'up']]);
    s.place('player', 14, 11, 'up');
    yield s.fadeIn(60);
    yield s.msg(`${s.name('cloud')} carries Aeris down to the edge of a clear, quiet lake.`);
    yield s.move('player', 14, 6, { speed: 0.012 });
    s.spawn('aeris', 'aeris', 14, 5, 'down', { name: s.name('aeris'), anim: 'dead' });
    s.anim('player', 'kneel');
    yield 60;
    yield s.movie('aeris_lake', { text: 'Gently, he lays her in the water.\n\nFor a moment she floats there, as if only sleeping...\nthen slowly, slowly, she sinks away into the blue depths,\nuntil she is gone.' });   // (the lake burial, js/gfx/cinema.js)
    s.remove('aeris');
    yield 60;
    s.stopAnim('player');
    yield s.move('player', 14, 10, { speed: 0.012 });
    yield s.face('player', 'down');
    // Aeris is gone for good; whatever she carried goes with her.
    s.leave('aeris');
    s.set('aeris_dead');
    loseAerisMateria();
    yield 60;
    yield s.fadeOut(120);
    clearCrew(s, crew);
    s.stopMusic(60);
    yield s.discEnd(1);
    s.set('disc2');
    yield* discTwoBegins(s);
  }

  function* discTwoBegins(s) {
    s.music('cry');
    const all = members(s);
    const crew = spawnCrew(s, all, [[12, 13, 'up'], [16, 13, 'up'], [11, 14, 'up'], [17, 14, 'up'], [13, 15, 'up'], [15, 15, 'up'], [14, 15, 'up']]);
    const has = id => crew.includes(id);
    s.place('player', 14, 11, 'down');
    yield s.fadeIn(60);
    yield s.say('cloud', "......Aeris isn't coming back.");
    yield s.say('tifa', "Cloud......");
    yield s.say('cloud', "She came all this way, alone, to stop Sephiroth. She never got to finish.\fSo we'll finish it. For her.");
    yield s.say('cloud', "Sephiroth said he was going north. Past the snowfields. I'm going after him.");
    yield s.say('cloud', "...But I can't trust myself anymore. If he gets inside my head again... if I start doing something I shouldn't...\fI need you to stop me. Whatever it takes.");
    yield s.say('barret', "Hell, you don't even gotta ask! We're comin', and that's that!");
    yield s.say('tifa', "We're with you, Cloud. All of us. To the end.");
    if (has('redxiii')) yield s.say('redxiii', "For Aeris... and for the Planet she prayed for.");
    if (has('cid')) yield s.say('cid', "North of this city there's a valley, and past that, nothin' but snow. Better bundle up.");
    if (has('yuffie')) yield s.say('yuffie', "...I'm coming too. Sephiroth's gonna pay for this. Big time.");
    if (has('vincent')) yield s.say('vincent', "......I'll go. I have my own reasons to face him.");
    if (has('caitsith')) yield s.say('caitsith', "Count me in as well. ...And I mean that, whatever else I am.");
    yield s.say('cloud', "......Thanks. Let's go.");
    s.set('c8_disc2_speech');
    yield s.fadeOut(30);
    clearCrew(s, crew);
    yield s.fadeIn(30);
    yield s.say('cloud', "(Who should come with me?)");
    yield s.choosePArty(['cloud']);
    yield s.say('cloud', "(The way north... through the valley past the edge of the city.)");
  }

  FF7.defineMap('capital_lake', {
    name: 'Forgotten Capital — Lake', area: 'Forgotten Capital', theme: 'city_ancients', music: 'cry',
    look: Object.assign({}, CITY, { water: '#3a78b0', grass: ['#5a8a88', '#548482'] }),
    legend: { 'T': 'coraltree' },   // the white coral trees of the city round the shore
    camera: { pitch: 40, dist: 10 },
    grid: [
      "UUT%TUUUUT%TUUUUT%TUUUUT%TUUUU",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~:::~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~:::~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~:::~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~:::~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~:::~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~:::~~~~~~~~~~~~~~",
      "U,,T,,,,,,,,,,,,,,,,,,,,,,,,,T",
      "%,,,,,,,,,,,,,,,,,,,,,,,,,U,,T",
      ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,U",
      ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,U",
      "T,,,,,,,%,,,,,,,,,,,,,,,,,,,,%",
      "T,,,,,,,,,,,,,,,,,,,,,,U,,,,,U",
      "UUUT%TUUUUT%TUUUUT%TUUUUT%TUUU",
    ],
    lights: [[14, 5, '#c0e0ff', 3]],
    entries: { from_center: [1, 13, 'right'], farewell: [14, 11, 'up'], disc2: [14, 12, 'down'] },
    exits: [{ at: [0, 13, 1, 2], to: 'capital_center', entry: 'from_lake' }],
    objects: [{ at: [14, 4], talk: function* (s) { yield s.msg('The water is so clear you can see all the way down... and so deep you can see nothing at all.'); } }],
  });

  // ================================================================== Corral Valley (Disc 2)
  const hopUp = function* (s) {
    const c = yield s.ask(null, 'Stepping stones lead up across the gap to the top of the great shell. Hop across?', ['Hop across', 'Stay']);
    if (c !== 0) return;
    yield s.jump('player', 9, 4, 0.7, 20);
    yield s.jump('player', 11, 3, 0.7, 20);
    yield s.jump('player', 14, 3, 0.8, 22);
  };
  const hopDown = function* (s) {
    const c = yield s.ask(null, 'Hop back down the stepping stones?', ['Hop down', 'Stay']);
    if (c !== 0) return;
    yield s.jump('player', 11, 3, 0.7, 20);
    yield s.jump('player', 9, 4, 0.7, 20);
    yield s.jump('player', 5, 5, 0.7, 22);
  };
  FF7.defineMap('corral_valley', {
    name: 'Corral Valley', area: 'Corral Valley', theme: 'city_ancients', music: 'cry',
    // refs 11-gaeacliff04, 06: pale coiled rock like stacked shells, grey-green scrub, coral overhead
    look: Object.assign({}, CITY, { floor: ['#7a8274', '#747c6e'], floor2: ['#a8a898', '#a0a090'], floor3: ['#c8c4b4', '#c0bcac'], wall: '#b4b0a0', wallTop: '#d0ccbc',
      grass: ['#6a7a5a', '#647454'], sky: ['#8aa0b8', '#dce4ec'], fog: { color: [0.62, 0.68, 0.72], near: 10, far: 28 }, ambient: [0.5, 0.52, 0.54], light: [0.8, 0.8, 0.78] }),
    battle: { table: 'forgotten_capital_shell', bg: 'city_ancients', rate: 0.8 },
    grid: [
      "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR",
      "RRRRRRRR     h+hhhhhhhhhhhhhRRRRRRRR",
      "RRRRRRRR     ...............RRRRRRRR",
      "RR,,,,,,   : ...............RRRRRRRR",
      "RR,,,,,, :   ...............RRRRRRRR",
      "RR,,,,,,    ................RRRRRRRR",
      "RR,,,,,,    ................RRRRRRRR",
      "RR,,,,,,    ....U...........RRRRRRRR",
      "RR,,,,,,    ................RRRRRRRR",
      "RR,,,,,,    ............U...RRRRRRRR",
      "RR,,,,,,    ................RRRRRRRR",
      "RR,,,,,,    ..U.............RRRRRRRR",
      "RR,,,,,,    .......U........RRRRRRRR",
      "RR,,,,,,    ................RRRRRRRR",
      "R,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,R",
      "R,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,U,,,R",
      "R,,,,U,,,,,,,,,,,,,,,,T,,,,,,,,,,,,R",
      "R,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,R",
      "R,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
      "R,,,,,,,,,,,,,,,,,,,,,,,,,,U,,,,,,,,",
      "R,,,,,,,,,U,,,,,,,,,,,,,,,,,,,,,,,,R",
      "R,,T,,,,,,,,,,,,,,,,,,,,,,,,,,,,,T,R",
      "R,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,R",
      "RRRRRRRRRRRRRRRRR,,,,RRRRRRRRRRRRRRR",
    ],
    heights: [
      "000000000000000000000000000000000000",
      "000000000000666666666666666600000000",
      "000000000000066666666666666600000000",
      "000000000004066666666666666600000000",
      "000000000200066666666666666600000000",
      "000000000000666666666666666600000000",
      "000000000000666666666666666600000000",
      "000000000000666666666666666600000000",
      "000000000000666666666666666600000000",
      "000000000000666666666666666600000000",
      "000000000000666666666666666600000000",
      "000000000000666666666666666600000000",
      "000000000000666666666666666600000000",
      "000000000000666666666666666600000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
    ],
    entries: { from_world: [18, 22, 'up'], from_capital: [34, 18, 'left'], from_cave: [14, 2, 'down'] },
    exits: [
      { at: [17, 23, 4, 1], to: 'world', loc: 'corral_valley' },
      { at: [35, 18, 1, 2], to: 'capital_center', entry: 'from_valley' },
      { at: [14, 1, 1, 1], to: 'corral_cave', entry: 'from_valley', sfx: 'door' },
    ],
    chests: [{ at: [3, 4], item: 'viper_halberd', id: 'corral_valley_viper_halberd' }],
    triggers: [
      { at: [6, 3, 2, 2], run: hopUp },
      { at: [13, 3, 1, 2], run: hopDown },
    ],
    onEnter: function* (s) {
      if (s.flag('c8_valley_seen')) return;
      s.set('c8_valley_seen');
      yield s.msg('A cold wind blows down the valley. Above the path looms a shell as big as a hill, its top reached only by a line of stepping stones.');
    },
  });

  // ------------------------------------------------------------------ the Corel Valley cave
  FF7.defineMap('corral_cave', {
    name: 'Corral Valley Cave', area: 'Corral Valley', theme: 'cave', music: 'cry',
    // ref 11-gaeacliff05: inside a great shell - pinkish root-like rock, grey gravel ledges, rope ladders
    look: { wall: '#9a6a62', trim: '#5a3a36', wallTop: '#6a4440', floor: ['#8a8680', '#84807a'], dirt: ['#8a8680', '#84807a'] },
    battle: { table: 'corel_valley_cave', bg: 'cave', rate: 1 },
    grid: [
      "####################################",
      "####################################",
      "##ddddddddd###dddddddddddddddddddddd",
      "##ddddddddddddddRddddddddddddddddddd",
      "##ddddddddd###dddddddddddddddddddd##",
      "        H                     H     ",
      "        H                     H     ",
      "        H                     H     ",
      "        H                     H     ",
      "##ddddddddddd##ddddddddddddddddddU##",
      "##dddddddddRdddddddddddddddddddddd##",
      "##dddddddddddddddddddddddddRdddddd##",
      "##ddddddddddd##ddddddddddddddddddd##",
      "      H               H             ",
      "      H               H             ",
      "      H               H             ",
      "      H               H             ",
      "##dddddddddddU####ddddddddd#########",
      "dddddddddddddd####ddddddddd#########",
      "ddddRddddddddd####ddddddddd#########",
      "##dddddddddddd####ddddddRdd#########",
      "##Uddddddddddd####ddddddddd#########",
      "####################################",
      "####################################",
    ],
    heights: [
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "008888888880008888888888888888888888",
      "008888888888888888888888888888888888",
      "008888888880008888888888888888888800",
      "000000007000000000000000000000700000",
      "000000006000000000000000000000600000",
      "000000005000000000000000000000500000",
      "000000005000000000000000000000500000",
      "004444444444400444444444444444444400",
      "004444444444444444444444444444444400",
      "004444444444444444444444444444444400",
      "004444444444400444444444444444444400",
      "000000300000000000000030000000000000",
      "000000200000000000000020000000000000",
      "000000100000000000000010000000000000",
      "000000100000000000000010000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
    ],
    camera: { dist: 11, pitch: 52 },
    lights: [[33, 9, '#a0c0ff', 2], [13, 17, '#a0c0ff', 2], [2, 21, '#a0c0ff', 2]],
    entries: { from_valley: [2, 18, 'right'], from_end: [34, 3, 'left'] },
    exits: [
      { at: [0, 18, 1, 2], to: 'corral_valley', entry: 'from_cave' },
      { at: [35, 2, 1, 2], to: 'corral_cave_end', entry: 'from_cave' },
    ],
    items: [{ at: [3, 11], materia: 'magic_plus', id: 'corral_cave_magic_plus' }],
    chests: [
      { at: [3, 3], item: 'bolt_armlet', id: 'corral_cave_bolt_armlet' },
      { at: [25, 19], item: 'hypnocrown', id: 'corral_cave_hypnocrown' },
      { at: [32, 4], item: 'megalixir', id: 'corral_cave_megalixir' },
    ],
    onEnter: function* (s) {
      if (s.flag('c8_cave_seen')) return;
      s.set('c8_cave_seen');
      yield s.msg('A cave of ice-cold rock. Deep cracks in the walls climb up and down between the ledges.');
    },
  });

  FF7.defineMap('corral_cave_end', {
    name: 'Corral Valley Cave', area: 'Corral Valley', theme: 'cave', music: 'cry',
    battle: { table: 'corel_valley_cave', bg: 'cave', rate: 0.7 },
    look: { snow: ['#e8eef4', '#e0e8f0'] },
    grid: [
      "##########nnnn##########",
      "##########dddd##########",
      "##########dddd##########",
      "##########dddd##########",
      "##########dddd##########",
      "#dddddddddddddddddddddd#",
      "#dddRdddddddddddUdddddd#",
      "#dddddddddddddddddddddd#",
      "ddddddddddddddddddddddd#",
      "ddddddddddddddddddddddd#",
      "#ddddddRdddddddddddRddd#",
      "#dUdddddddddddddddddddd#",
      "########################",
      "########################",
    ],
    lights: [[11, 1, '#e0f0ff', 3]],
    entries: { from_cave: [1, 8, 'right'], from_north: [11, 1, 'down'] },
    exits: [
      { at: [0, 8, 1, 2], to: 'corral_cave', entry: 'from_end' },
      { at: [10, 0, 4, 1], run: function* (s) {
          if (!s.flag('c8_valley_out')) {
            s.set('c8_valley_out');
            yield s.msg('Beyond the cave mouth, a blinding white world of snow stretches away to the north...');
            if (FF7.maps.icicle_gate) { yield s.goto('icicle_gate', 'from_valley'); return; }
          }
          yield s.world('corral_valley_n');
        } },
    ],
    chests: [{ at: [19, 6], item: 'power_source', id: 'corral_cave_end_power_source' }],
  });
})();
