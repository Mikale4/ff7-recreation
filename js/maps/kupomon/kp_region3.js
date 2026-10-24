// Kupomon, region 3 (docs/KUPOMON_WORLD.md "Region 3", Lv 16-23): Route 7 (farm switchbacks up into the snow, a frozen
// pond, a rope bridge over a gorge), Nibel Peaks (a stone mountain village round a water tower; Tifa's temple dojo up
// the long stair), Route 8 (down a red-rock canyon onto the dunes), Sandsea (an oasis bazaar; Sephiroth 6), the Sunken
// Ruins (a pressure-plate puzzle, the Wrapmog's tomb, Team Hojo's Heidegger and the ruins' key), Route 9 (badlands),
// and Skyport (an airship town on a cliff; Zack 7; Team Hojo's HQ and Hojo battle 1; Cid's hangar dojo).
// Boundaries: Route 7 <-> region 2's kp_mogfield (from_route7 / from_mogfield); Skyport <-> region 4's kp_route10
// (from_skyport / from_route10, badge 4). Dialogue in our own words.
(function () {
  const KP = FF7.kupomon, W = KP.W;
  const flag = (f) => !!(FF7.state && FF7.state.flags && FF7.state.flags[f]);
  // a one-way ledge, tagged so the reach checks know it (W.ledge: walk off the edge row facing the drop)
  const ledge = (at, dir = 'down', drop = 2) => Object.assign(W.ledge(at, dir, drop), { kpLedge: [dir, drop] });
  // props for every grid tile whose char is in `chars`: fn(x, y, ch) -> a props entry (or null)
  const each = (grid, chars, fn) => {
    const out = [];
    grid.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (chars.includes(row[x])) { const p = fn(x, y, row[x]); if (p) out.push(p); } });
    return out;
  };
  const hash = (x, y, k = 0) => { const s = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); };
  // a block of heights rows: n rows of one digit, w wide (with [x, y-in-block, digit] tweaks)
  const rows = (n, w, d, tweaks = []) => Array.from({ length: n }, (_, y) => { const r = d.repeat(w).split(''); tweaks.forEach(([tx, ty, td]) => { if (ty === y) r[tx] = td; }); return r.join(''); });
  // snowy pines (white-laden or dark) and the warmer greens below the snow line
  const SNOW_PINE = (x, y) => ({ at: [x, y], prop: 'tree', col: hash(x, y) > 0.45 ? '#e4ebf2' : '#2f4f3e', col2: '#4a3424' });
  const say = (who, text) => function* (s) { yield s.say(who, text); };

  // the Marts (docs/KUPOMON_WORLD.md Builder's guide): everything sold before, plus the new town's stock
  const MART_NIBEL = ['kupo_nut', 'golden_nut', 'sprout_nut', 'quick_nut', 'roast_nut', 'familiar_nut', 'wild_nut', 'tough_nut',
    'glow_nut', 'hefty_nut', 'spell_nut', 'sleepy_nut', 'fancy_nut', 'oil_nut', 'oil_can', 'hi_oil', 'max_oil', 'battery', 'fixit',
    'cure_nut', 'mini_oil', 'focus_pom'];
  const MART_SKYPORT = MART_NIBEL.slice(0, 2).concat(['royal_nut'], MART_NIBEL.slice(2));

  // ------------------------------------------------------------------ wild moogles (levels per the doc's guide)
  KP.WILD.kp_route7 = [['icemog_climber', 22, 16, 19], ['kupochi_pugilist', 20, 16, 19], ['lancemog_lancer', 16, 16, 18], ['darkmog_squire', 15, 16, 19],
    ['farmmog_harvester', 10, 16, 18], ['chocomog_rider', 9, 16, 18], ['stampo_monk', 6, 16, 17], ['grumog_berserker', 2, 18, 19]];

  // ================================================================== ROUTE 7
  // Farmland at the foot of the mountains (a turnip field and its scarecrow, a farmhouse by a stream), then the road
  // switchbacks up three terraces (stairs at alternate ends; the grass turns to snow), crosses a gorge on a rope bridge
  // and comes out on a snowfield with a frozen pond below the Nibel Peaks cairn. Ledges drop back down each terrace.
  const R7 = [
    "  TTRTTTTTTRTTTTTnnTTTTTTRTTTTTTTT  ",
    "  TnnTnnnnnnnnnun..n!nnnnnnnTnnnnT  ",
    "  Tnnniiiiiinnnnn..nnnnGGGGnnnnnnT  ",
    "  TnniiiiiiiinTnn..nnnGGGGGGGnTnnT  ",
    "  Tniiiiiiiiinnnn..nnnGGGGGGGGnnnT  ",
    "  TTniiiiiiiinnnn..nnnnnGGGGGnR^TT  ",
    "  Tnnniiiiinnnnnn..nnnRnnnnTnnnnnT  ",
    "  Tnnn.............nnnnnnnTnnnnnnT  ",
    "  RnnY..YnnnnnnRnnnnnnnnnnnnnnnTnR  ",
    "      KK                            ",
    "      KK                            ",
    "      KK                            ",
    " RnnnY..YnnnnnnnnTnnGGGnnRnnnnnnnR  ",
    " Tnnnn..nnnnTnnnnnnGGGGGnnnnnTnnnT  ",
    " Tnnnn.............GGGG.........nT  ",
    " TnnTnnnnnRnnnnnnnnnGGGGnnnnnn..nT  ",
    " RnnnnnTnnnnnnnnnnnnnGGGnnnnnn..nR  ",
    " RnnnnnnnTnnnGGnnnRnnnnnnnTTnn^^nR  ",
    " T,,nnnnnnnnGGGGnnnnnnnnnnRnnn..nT  ",
    " T@........GGGGG................nT  ",
    " T,..,,TnnnnGGGGGnnnnnTnnnnnnnnnTT  ",
    " R,..,,,nnnnnGGGnnnnnnnnnnnnnnnTTR  ",
    " T,^^,,,,,,,,GGG,,,,~~,,,,,,T,,,,TT ",
    " T,..,T,,T,,GGGG,,,,~~,,,,,,,,,,,TT ",
    " T,........GGGGG....KK........,,,TT ",
    " T,,,,T,,T,,GGGGG,,,~~,,,,,%..,,%TT ",
    " R,,,,,,,,,,,GG,,,,,~~,,,,,,..,,,TR ",
    " T,,GGGGG,,,,,,,,,,,~~,,,,,,^^,,,,T ",
    " TGGGGGG,,,,,,,,ddddKKdddddddd,,,,T ",
    " T,===========,!,d,,~~,hhhhhhhh,,,T ",
    " T,=%%%%%%%%%=,,,d,,~~,hhhhhhhh,o,T ",
    " T,=ddddddddd,,,,d,,~~,hhh+hhhh,,,T ",
    " T,=%%%%%%%%%=,,,dddKKddddd,,,,,,,T ",
    " TTT%TTTT%TTTT%TdddT~~TT%TTTTTT%TTT ",
  ];
  const R7H = [].concat(
    rows(17, 36, '6', [[30, 1, '8'], [31, 1, '8'], [32, 1, '8'], [30, 2, '8'], [31, 2, '8'], [32, 2, '8'], [30, 3, '8'], [31, 3, '8'], [32, 3, '8'],
      [30, 4, '8'], [31, 4, '8'], [32, 4, '8'], [30, 5, '7'], [31, 5, '7'], [2, 16, '4'], [3, 16, '4'], [4, 16, '4'], [5, 16, '4'], [6, 16, '4']]),
    rows(5, 36, '4', [[30, 0, '5'], [31, 0, '5'], [19, 0, '6'], [20, 0, '6'], [21, 0, '6'], [22, 0, '6'], [23, 0, '6'], [24, 0, '6'], [25, 0, '6']]),
    rows(5, 36, '2', [[3, 0, '3'], [4, 0, '3'], [30, 4, '0'], [31, 4, '0'], [32, 4, '0']]),
    rows(7, 36, '0', [[28, 0, '1'], [29, 0, '1']]));
  const r7 = {
    farmer: W.trainer({ id: 'r7_hob', cls: 'Farmer', name: 'Hob', model: { base: 'man', hairStyle: 'cap', top: '#c8b088', bottom: '#4a6a9a', extras: ['suspenders'] },
      at: [31, 28], dir: 'left', sight: [24, 28, 7, 1],
      line: "Whoa there! Nobody crosses my field without a friendly battle. Farm rules!",
      lose: "Well, I'll be. You plowed right through.",
      after: "Mountain moogles sneak down to steal my turnips. I don't mind. They pay me back in battles.",
      team: [['farmmog_harvester', 17], ['chocomog_rider', 16]], money: 680 }),
    hiker: W.trainer({ id: 'r7_brom', cls: 'Hiker', name: 'Brom', model: { base: 'man', build: 'big', hairStyle: 'short', top: '#8a5a2a', bottom: '#5a5040', extras: ['beard', 'harness'] },
      at: [17, 23], dir: 'down', sight: [16, 24, 3, 1],
      line: "Hup! Hup! The mountain made me strong, and my moogles too! Let's see what you've got!",
      lose: "Oof. Like getting flattened by a boulder.",
      after: "Take the switchbacks slow. Lungs first, legs second, pride last.",
      team: [['grumog_berserker', 17], ['minemog_foreman', 17], ['shellmog_guardian', 18]], money: 720 }),
    blackbelt: W.trainer({ id: 'r7_kenji', cls: 'Black Belt', name: 'Kenji', model: { base: 'man', hairStyle: 'buzz', top: '#f0ece0', bottom: '#f0ece0', belt: '#1a1a1a', extras: ['headband'] },
      at: [23, 18], dir: 'down', sight: [22, 19, 3, 1],
      line: "HAAA! I train in the snow for Master Tifa's trials! Face my fists!",
      lose: "My stance... was a snowman's stance...",
      after: "Tifa's temple is up in Nibel Peaks. Her trials test your heart as much as your moogles.",
      team: [['stampo_blackbelt', 18], ['kupochi_pugilist', 18]], money: 720 }),
    skier: W.trainer({ id: 'r7_tilda', cls: 'Skier', name: 'Tilda', model: { base: 'woman', hairStyle: 'ponytail', top: '#d04050', bottom: '#2a2a3a', extras: ['goggles', 'furcollar'] },
      at: [27, 13], dir: 'down', sight: [26, 14, 3, 1],
      line: "Out of the way, I'm carving a line! ...Oh, a battle? Even better!",
      lose: "Wiped out. Totally wiped out.",
      after: "The snow up here is perfect powder. The moogles love rolling down the slopes in it.",
      team: [['icemog_climber', 18], ['mopluff_dancer', 18]], money: 720 }),
    ace: W.trainer({ id: 'r7_rhea', cls: 'Ace Trainer', name: 'Rhea', model: { base: 'woman', hairStyle: 'longstraight', hair: '#2a2a40', top: '#3a5aa0', bottom: '#f0f0f0', extras: ['coat'] },
      at: [14, 6], dir: 'down', sight: [12, 7, 4, 1],
      line: "An Ace Trainer never passes up a challenger. Especially one with that look in their eye.",
      lose: "Your team has real fire. That's rare up in the cold.",
      after: "Nibel Peaks is just past the cairn. Get warm by a fire before you take on Tifa.",
      team: [['darkmog_squire', 18], ['lancemog_dragoon', 18], ['kupochi_pugilist', 19]], money: 760 }),
  };
  FF7.defineMap('kp_route7', {
    name: 'Route 7', area: 'Route 7', theme: 'mountain', music: 'othermountain', kpWild: 'kp_route7', kpBg: 'mountain',
    look: { floor2: ['#aab6c2', '#a2aeba'], floorTex: { floor2: 'ice' }, grass: ['#5a8a3a', '#548234'], wall: '#76705e', roof: '#7a3a28',
      fog: { color: [0.74, 0.78, 0.84], near: 14, far: 34 } },
    grid: R7, heights: R7H,
    buildings: [{ at: [23, 29, 8, 3], h: 1.9, top: 'gable', ridge: 'x', rise: 1.1, roof: '#7a3a28', chimney: true, tex: 'siding', col: '#b89a74' }],
    props: [].concat(
      each(R7, 'T', (x, y) => y < 22 ? SNOW_PINE(x, y) : null),
      // the rope bridge: hand ropes from post to post across the gorge
      [{ at: [5, 8], to: [5, 12], h: 0.75, h2: 0.75, sag: 0.3, col: '#7a5a34', r: 0.02, count: 1 }, { at: [8, 8], to: [8, 12], h: 0.75, h2: 0.75, sag: 0.3, col: '#7a5a34', r: 0.02, count: 1 },
        { at: [15, 1], prop: 'statue', col: '#9a9488', col2: '#7a7468', scale: 0.9 }]),
    entries: { from_mogfield: [17, 32, 'up'], from_nibelpeaks: [17, 1, 'down'], from_farm: [26, 32, 'down'] },
    exits: [
      { at: [16, 33, 3, 1], to: 'kp_mogfield', entry: 'from_route7' },
      { at: [17, 0, 2, 1], to: 'kp_nibelpeaks', entry: 'from_route7' },
      { at: [26, 31, 1, 1], to: 'kp_route7_farm', entry: 'from_town', sfx: 'door' },
    ],
    npcs: [r7.farmer.npc, r7.hiker.npc, r7.blackbelt.npc, r7.skier.npc, r7.ace.npc,
      { id: 'r7_scarecrow', name: 'Scarecrow', model: { base: 'man', hairStyle: 'cap', top: '#a08050', bottom: '#5a6a8a', skin: '#e0c890', extras: ['vest'] }, at: [8, 31], dir: 'down', faceOnTalk: false,
        talk: function* (s) { yield s.msg("A scarecrow in a battered straw hat.\fA wild Tufty is fast asleep on its shoulder. Some scarecrow."); } },
      { id: 'r7_guide', name: 'Old Guide', model: 'oldman2', at: [9, 12], dir: 'left',
        talk: say('Old Guide', "That rope bridge has held for fifty years. ...Mostly.\fWalk, don't run, and don't look down. That gorge goes all the way down to yesterday.") },
      { id: 'r7_camper', name: 'Camper', model: { base: 'man', hairStyle: 'cap', top: '#4a7a4a', bottom: '#5a4a3a', extras: ['furcollar'] }, at: [2, 18], dir: 'down',
        talk: say('Camper', "Tall grass grows up here even under the snow. The hardiest moogles on the mountain hide in it.\fCome warm up by the fire whenever you like. Fire's free. Marshmallows are not.") },
      W.moogle('r7_mog', 'farmmog_farmer', [10, 28], { wander: 2, line: 'The Farmmog is weeding along the fence. It waves a tiny trowel at you. Kupo!' }),
    ],
    items: [W.item('r7_golden', [32, 23], 'golden_nut', 2), W.item('r7_hioil', [8, 4], 'hi_oil', 2), W.item('r7_tough', [31, 2], 'tough_nut', 2)],
    triggers: [r7.farmer.trig, r7.hiker.trig, r7.blackbelt.trig, r7.skier.trig, r7.ace.trig,
      ledge([6, 26, 4]), ledge([24, 21, 4]), ledge([12, 16, 3]),
      W.hidden('r7_cairn', [15, 1], 'focus_pom'),
      W.sign([15, 29], 'ROUTE 7\nNorth: Nibel Peaks.   South: Mogfield.'),
      W.sign([20, 1], 'NIBEL PEAKS, just ahead.\nThe pond is frozen solid. Mind your footing!'),
    ],
  });
  // the farmhouse by the stream: Granny Mae's gift
  W.house('kp_route7_farm', {
    name: 'Farmhouse', area: 'Route 7', town: 'kp_route7', back: 'from_farm', decor: 'rustic',
    grid: [
      "############",
      "#kF..b.b.q.#",
      "#..........#",
      "#.ct.......#",
      "#.........j#",
      "#####+######",
    ],
    npcs: [
      { id: 'r7_granny', name: 'Granny Mae', model: 'oldwoman', at: [4, 3], dir: 'down',
        talk: function* (s) {
          if (!s.flag('kp_r7_granny')) {
            yield s.say('Granny Mae', "Oh! A trainer, come in out of the wind! Warm your hands by the fire, dearie.");
            s.set('kp_r7_granny'); KP.give('oil_nut', 3); s.sfx('found');
            yield s.msg('Received 3 Oil-Glazed Nuts!');
            yield s.say('Granny Mae', "My late husband glazed those himself. A moogle that takes one comes home good as new.");
            return;
          }
          yield s.say('Granny Mae', "Up the mountain is Nibel Peaks. Little Tifa runs the temple dojo up there now.\fSweetest girl you'll ever meet. Punches like a landslide.");
        } },
      { id: 'r7_farmkid', name: 'Boy', model: 'kid3', at: [8, 2], dir: 'left', wander: 1,
        talk: say('Boy', "Grandpa says the rope bridge is a hundred years old. Granny says fifty.\fThe bridge isn't saying.") },
    ],
  });

  // ================================================================== NIBEL PEAKS
  // A stone village on a mountain shelf, in four tiers: the lower village by the stream (the Lodge, a woodshed, the
  // stone bridge from Route 7), the walled square round the old water tower (up the village steps), two terraces of
  // steep-roofed houses (the Mog Center on the west one), and the temple of Tifa's dojo at the top of the long stair.
  // The canyon road to Route 8 leaves by the east gate (badge 3).
  const NP = [
    "  TTRTTTTRTTTThhhhhhhhhhhhTTTTRTTTTRTT  ",
    "  TnTTRnnTTT..hhhhhhhhhhhh..TTTnnRTTnT  ",
    "  TTnnnTRnTu..hwhhhhhhhhwh..uTnRTnnnTT  ",
    "  TnRnTTnnT...hwhhh++hhhwh...TnnTTnRnT  ",
    "  TTnnTnnTR.@..u........u..@.RTnnTnnTT  ",
    "  TnTTnRnTRnn..............nnRTnRnTTnT  ",
    "  ThhhhhhnhhhhhnTR^^^^RTnnhhhhhhnTnnnT  ",
    "  ThwhhwhnhwhwhnRT^^^^TRnnhwhhwhnnnnnT  ",
    "  Thw+hwhnhh+hhnTR^^^^RTnnhh+hhhnunnnT  ",
    "  TddddddddddddnRT^^^^TRnddddddddddnnT  ",
    "  Tn%nnddnnnn%nnRT^^^^TRnn%nnnddnn%nnT  ",
    "  TnnnR^^RnnnnnnTR^^^^RTnnnnnR^^RnnnnT  ",
    "  Tnn..............................nnT  ",
    "  Tn%....l....................l....%|T  ",
    "  Tn.............................ddddddd",
    "  Tn.............................ddddddd",
    "  Tn...............QQ...............|T  ",
    "  Tn...............QQ...............nT  ",
    "  Tn....O...............!...........nT  ",
    "  Tn=============^^^^^^=============nT  ",
    "  TnhhhhhhhnnnnnnddddddnnnhhhhhnTnnnnT  ",
    "  TnhwhhhwhnnTnnnddddddnnnhhhhhnnnnnnT  ",
    "  Tnhhh+hhhnnnnnnddddddnYYnnnnnnnTnnnT  ",
    "  TnnnnddddddddddddddddnnnnnnnnnnnnnnT  ",
    "  Tnnn%nnnnnnnnnnddddddnnnn%nnnnnnnnnT  ",
    "  ~~~~~~~~~~~~~~~=::::=~~~~~~~~~~~~~~~  ",
    "  ~~~~~~~~~~~~~~~=::::=~~~~~~~~~~~~~~~  ",
    "  TnnTnnnnnnnnnnnddddddnnnnnnnTnnnnnnT  ",
    "  TTnnnnTnnn%nnnnnddddnnnnnTnnnnnnnTTT  ",
    "  TTTTTTTTTTTTTTTTddddTTTTTTTTTTTTTTTT  ",
  ];
  const NPH = [].concat(rows(6, 40, '9'),
    rows(6, 40, '5', [18, 19, 20, 21].flatMap(x => [[x, 0, '8'], [x, 1, '7'], [x, 2, '6'], [x, 3, '5'], [x, 4, '4'], [x, 5, '3']]).concat([[7, 5, '3'], [8, 5, '3'], [30, 5, '3'], [31, 5, '3']])),
    rows(7, 40, '2'), rows(1, 40, '2', [17, 18, 19, 20, 21, 22].map(x => [x, 0, '1'])), rows(10, 40, '0'));
  function* waterTower(s) {
    yield s.msg("Nibel Peaks' old wooden water tower, iced over at the seams.");
    yield s.say('Old Woman', "The young ones climb it at night to watch the stars. We grown-ups pretend not to notice.\f...I used to climb it too, you know.");
  }
  FF7.defineMap('kp_nibelpeaks', {
    name: 'Nibel Peaks', area: 'Nibel Peaks', theme: 'nibelheim', music: 'snow', kpBg: 'snow',
    look: { floorTex: { floor: 'cobble', floor2: 'stone', floor3: 'dirt' }, floor: ['#9a9284', '#928a7c'], floor2: ['#8e8c86', '#86847e'],
      dirt: ['#7c664a', '#746044'], wall: '#6e665c', wallTex: { wall: 'rock', bldg: 'stoneblock' }, bldg: '#a89e8c', roof: '#5e3c32',
      water: '#3a6a7a', grass: ['#4e6a3e', '#48623a'], sky: ['#7a9ac0', '#d8e2ec'], fog: { color: [0.78, 0.82, 0.88], near: 14, far: 36 } },
    grid: NP, heights: NPH,
    buildings: [
      { at: [16, 0, 8, 3], h: 3.4, top: 'hip', rise: 1.2, roof: '#4a3a40', col: '#b0a894', over: 0.3 },
      { at: [14, 0, 12, 4], h: 2.4, top: 'hip', rise: 0.9, roof: '#4a3a40', col: '#b0a894', over: 0.3 },
      { at: [3, 6, 6, 3], h: 2.2, top: 'gable', ridge: 'x', rise: 1.5, roof: '#a8484e', chimney: true },
      { at: [10, 6, 5, 3], h: 2.0, top: 'gable', ridge: 'z', rise: 1.6, roof: '#5e3c32' },
      { at: [26, 6, 6, 3], h: 2.0, top: 'gable', ridge: 'x', rise: 1.7, roof: '#4a4a5a', chimney: true },
      { at: [4, 20, 7, 3], h: 2.2, top: 'gable', ridge: 'x', rise: 1.7, roof: '#6a4030', chimney: true, tex: 'siding', col: '#9a7a58' },
      { at: [26, 20, 5, 2], h: 1.5, top: 'shed', tin: true, roof: '#7a6a5a' },
    ],
    props: [].concat(each(NP, 'T', SNOW_PINE),
      [{ at: [19, 16], h: 2.6, col: '#5a4a36' }, { at: [12, 4], col: '#f0a040' }, { at: [27, 4], col: '#f0a040' },
        { at: [15, 4], prop: 'statue', col: '#b8b0a0', col2: '#8a8478' }, { at: [24, 4], prop: 'statue', col: '#b8b0a0', col2: '#8a8478' }]),
    labels: [{ at: [5, 8], face: 's', off: 0.25, text: 'MOG CENTER', size: 0.14, col: '#e05a7a', y: 1.85 },
      { at: [19.5, 3], face: 's', off: 0.25, text: 'SEVENTH HEAVEN ARCADE', size: 0.17, col: '#f0d070', y: 2.0 }],
    entries: { from_route7: [19, 28, 'up'], from_route8: [38, 14, 'left'], from_center: [5, 9, 'down'], from_house1: [12, 9, 'down'],
      from_house2: [28, 9, 'down'], from_lodge: [7, 23, 'down'], from_dojo: [19, 4, 'down'] },
    exits: [
      { at: [18, 29, 4, 1], to: 'kp_route7', entry: 'from_nibelpeaks' },
      Object.assign({ at: [39, 14, 1, 2], to: 'kp_route8', entry: 'from_nibelpeaks' },
        W.gate(3, 'Pass Warden', "Hold it! The canyon road's only open to trainers with three dojo badges.\fTifa's Fist Badge would make three. She's up the long stair. Good luck, kid.")),
      { at: [5, 8, 1, 1], to: 'kp_nibelpeaks_center', entry: 'from_town', sfx: 'door' },
      { at: [12, 8, 1, 1], to: 'kp_nibelpeaks_house1', entry: 'from_town', sfx: 'door' },
      { at: [28, 8, 1, 1], to: 'kp_nibelpeaks_house2', entry: 'from_town', sfx: 'door' },
      { at: [7, 22, 1, 1], to: 'kp_nibelpeaks_lodge', entry: 'from_town', sfx: 'door' },
      { at: [19, 3, 2, 1], to: 'kp_nibel_dojo', entry: 'from_town', sfx: 'door2' },
    ],
    npcs: [
      { id: 'np_warden', name: 'Pass Warden', model: { base: 'man', hairStyle: 'short', top: '#5a4a3a', bottom: '#3a3a40', extras: ['furcollar', 'beard'] }, at: [35, 16], dir: 'up',
        talk: function* (s) {
          if (KP.badgeCount() >= 3) { yield s.say('Pass Warden', "Three badges! The canyon road's all yours.\fIt drops off the mountain into red rock, then nothing but sand. Bring water. Bring a hat. Bring both."); return; }
          yield s.say('Pass Warden', "The road east winds down into canyon country. Rockslides, wild moogles, sunburn... I only let seasoned trainers through.\fThree dojo badges and it's yours.");
        } },
      { id: 'np_monk', name: 'Monk', model: { base: 'man', hairStyle: 'bald', top: '#d88a30', bottom: '#d88a30', extras: ['sash'] }, at: [17, 12], dir: 'down',
        talk: say('Monk', "The temple at the top of the long stair is Tifa's dojo. Her trials are no joke.\fIn the Court of Seasons, the bags must fall as the year turns. Spring first, winter last. ...Oops. Pretend I didn't say that.") },
      { id: 'np_oldwoman', name: 'Old Woman', model: 'oldwoman2', at: [21, 17], dir: 'left', talk: waterTower },
      { id: 'np_kid', name: 'Boy', model: 'kid4', at: [10, 15], dir: 'right', wander: 3,
        talk: say('Boy', "Tifa broke a boulder in half with one punch! I saw it!\f...Okay, my brother saw it. But he doesn't lie. Much.") },
      { id: 'np_climber', name: 'Climber', model: { base: 'woman', hairStyle: 'ponytail', top: '#3a7aa0', bottom: '#4a4a3a', extras: ['harness', 'goggles'] }, at: [31, 17], dir: 'left',
        talk: say('Climber', "Past the east gate the mountain falls away into the Red Canyon, and past that, the Sandsea desert.\fThere's an oasis town out there with a bazaar full of the strangest held items. Lucky Poms, Quick Gears...") },
      { id: 'np_rumor', name: 'Woman', model: 'woman5', at: [8, 13], dir: 'down',
        talk: say('Woman', "A gaggle of folks in lab coats came through last week. Team Hojo, they called themselves.\fTheir loud leader kept laughing like a hyena and asking about some ruins out in the desert. Gave me the creeps.") },
      { id: 'np_villager', name: 'Villager', model: 'man7', at: [26, 18], dir: 'down', show: s => !s.flag('kp_rival_sephiroth_6'),
        talk: say('Villager', "A tall trainer with long silver hair passed through. Beat every student in the temple, bowed to Tifa, and left by the east gate.\fDidn't even stop to look at the view. Who doesn't stop for the view?") },
      { id: 'np_sweeper', name: 'Temple Pupil', model: { base: 'girl', hairStyle: 'bun', top: '#f0ece0', bottom: '#c03030', extras: ['headband'] }, at: [12, 1], dir: 'down',
        talk: say('Temple Pupil', "Every morning I sweep the snow off the temple steps. Every night it snows again.\fMaster Tifa says that's the lesson. I think it's just the weather.") },
      { id: 'np_lowkid', name: 'Girl', model: 'girl3', at: [30, 23], dir: 'right',
        talk: say('Girl', "This is Biscuit. He's a mountain dog. He pulls the sled and eats the snow.\fHe's scared of the Icemogs, though. They throw snowballs.") },
      { id: 'np_dog', name: 'Biscuit', model: 'dog', at: [31, 23], dir: 'left', talk: function* (s) { yield s.msg('Biscuit: Woof! Woof!\nHe wags his whole back half.'); } },
      W.moogle('np_mog1', 'icemog_climber', [12, 16], { line: 'The Icemog is building a tiny snowmog. Kupo!' }),
      W.moogle('np_mog2', 'kupochi_pugilist', [27, 13], { line: 'The Kupochi throws a few practice jabs at the air. Kupo! Kupo!' }),
      W.moogle('np_mog3', 'stampo_monk', [14, 27], { line: 'The Stampo bows politely. Kupo.' }),
    ],
    objects: [[19, 16], [20, 16], [19, 17], [20, 17]].map(at => ({ at, talk: waterTower })),
    triggers: [W.sign([24, 18], 'NIBEL PEAKS\nThe village beneath the summit.   Temple Dojo: up the long stair.')],
  });
  W.mogCenter('kp_nibelpeaks_center', { name: 'Nibel Peaks Mog Center', town: 'kp_nibelpeaks', back: 'from_center', decor: 'stone', mart: MART_NIBEL,
    npcs: [{ id: 'npc_hiker', name: 'Hiker', model: 'man4', at: [8, 5], dir: 'left',
      talk: say('Hiker', "The Mart here sells Spellbound Nuts. Magic-job moogles can't resist them.\fBlack Mages, White Mages, Summoners... Perfect if you're after the clever ones.") }] });
  // the west terrace: the old master who taught Tifa
  W.house('kp_nibelpeaks_house1', { name: "Zangan's House", area: 'Nibel Peaks', town: 'kp_nibelpeaks', back: 'from_house1', decor: 'stone',
    grid: ["############", "#k..F...q..#", "#..........#", "#.t.....p..#", "#.c......j.#", "#####+######"],
    legend: { p: 'punchbag' },
    npcs: [{ id: 'np_zangan', name: 'Old Master Zangan', model: { base: 'oldman', hairStyle: 'short', hair: '#d8d8d0', top: '#4a6a8a', bottom: '#3a3a4a', extras: ['mustache', 'sash'] }, at: [5, 3], dir: 'down',
      talk: function* (s) {
        if (!KP.hasBadge(3)) { yield s.say('Old Master Zangan', "Hm? You're off to challenge Tifa? Ha! I taught that girl everything... and then she taught me a few things back.\fWin or lose, come and see me after. An old man likes to hear about a good fight."); return; }
        if (!s.flag('kp_np_zangan')) {
          yield s.say('Old Master Zangan', "Ohh, the Fist Badge! You beat my old student! Ha ha! She'll be training twice as hard tomorrow.");
          s.set('kp_np_zangan'); KP.give('focus_pom', 1); s.sfx('found');
          yield s.msg('Received a Focus Pom!');
          yield s.say('Old Master Zangan', "A Focus Pom. A moogle holding it will sometimes hang on by a thread when it should have gone down.\fTifa wore one just like it at your age. Never once stayed down.");
          return;
        }
        yield s.say('Old Master Zangan', "A fist is only as strong as the heart behind it. ...I say that to everyone. It's still true.");
      } }] });
  // the east terrace: a knitter of pom-poms
  W.house('kp_nibelpeaks_house2', { name: 'Stone House', area: 'Nibel Peaks', town: 'kp_nibelpeaks', back: 'from_house2', decor: 'stone',
    npcs: [
      { id: 'np_knitter', name: 'Knitter', model: 'woman8', at: [3, 2], dir: 'right',
        talk: function* (s) {
          if (!s.flag('kp_np_knit')) {
            yield s.say('Knitter', "Oh, hello, dear! I knit pom-poms for the village moogles. Theirs get so frosty in the winter.\fHere, take one of my lucky ones. Clip it on a moogle and watch it land the big hits.");
            s.set('kp_np_knit'); KP.give('lucky_pom', 1); s.sfx('found');
            yield s.msg('Received a Lucky Pom!');
            return;
          }
          yield s.say('Knitter', "Red for courage, blue for calm, yellow for luck. The Kupochi down the lane wants a purple one. I'm working on it.");
        } },
      { id: 'np_knitcat', name: 'Cat', model: 'cat', at: [6, 3], dir: 'left', talk: function* (s) { yield s.msg('The cat is tangled in a ball of yarn and seems very pleased about it.'); } },
    ] });
  // the lower village's lodge: a warm fire and a free rest
  W.house('kp_nibelpeaks_lodge', { name: 'Mountain Lodge', area: 'Nibel Peaks', town: 'kp_nibelpeaks', back: 'from_lodge', decor: 'rustic',
    grid: ["##############", "#F...k..b.b..#", "#............#", "#.ctc...ctc..#", "#............#", "#..........j.#", "#####+########"],
    npcs: [
      { id: 'np_lodgekeep', name: 'Lodge Keeper', model: 'man2', at: [6, 2], dir: 'down',
        talk: function* (s) {
          const c = yield s.ask('Lodge Keeper', "Welcome to the Mountain Lodge! Cold out there, eh? Let your moogles warm up by the fire. It's on the house.", ['Rest a while', 'No thanks']);
          if (c !== 0) { yield s.say('Lodge Keeper', "Suit yourself. The fire's always lit."); return; }
          s.sfx('heal'); s.flash('#ffd8a0', 12, 0.4); KP.healAll();
          yield 30;
          yield s.say('Lodge Keeper', "There! Toasty and fully recharged. Off you go.");
        } },
      { id: 'np_lodgehiker', name: 'Old Hiker', model: 'oldman3', at: [3, 4], dir: 'right',
        talk: say('Old Hiker', "When I was young there was no road over the pass. We crossed the canyon on chocobos, and the chocobos complained the whole way.") },
    ] });

  // ------------------------------------------------------------------ the Seventh Heaven Arcade (Dojo 3: Tifa, Monk)
  // A temple of trials in three halls side by side, west to east. The Hall of the First Strike: a punching bag hangs in
  // the doorway east (talk to it, punch it aside). The Court of Seasons: four coloured bags on plinths and a stone
  // tablet ("blossom, sun, leaf, snow"); the Great Bag blocks the way to the dais hall until all four are struck in the
  // year's order, and a wrong strike swings every bag back down. Then Tifa, on her dais.
  //   SOLUTION: punch the doorway bag [9,7]; in the court strike PINK (spring) [24,11], GOLD (summer) [12,3],
  //   RED (autumn) [12,11], WHITE (winter) [24,3]; the Great Bag [27,7] swings aside; up the dais steps to Tifa [33,7].
  const ND = [
    "#####################################",
    "#J......J#J.......u.......J#J......J#",
    "#........#.................#........#",
    "#.|....|.#.._..|.....|.._..#...____J#",
    "#........#.................#..._____#",
    "#........#.................#..|_____#",
    "#........#.................#..^_____#",
    "#.............................^_____#",
    "#........#.................#..^_____#",
    "#........#.................#..|_____#",
    "#.|....|.#.................#..._____#",
    "#........#.._..|.....|.._..#...____J#",
    "#........#.................#........#",
    "#J......J#J...............J#J......J#",
    "####+################################",
  ];
  const NDH = [].concat(rows(3, 37, '0'), rows(9, 37, '0', [31, 32, 33, 34, 35].flatMap(x => Array.from({ length: 9 }, (_, y) => [x, y, '3']))
    .concat([[30, 3, '2'], [30, 4, '2'], [30, 5, '2']])), rows(3, 37, '0'));
  const SEASONS = [
    { id: 'spring', name: 'blossom-pink', col: '#f0a0c8', at: [24, 11] },
    { id: 'summer', name: 'sun-gold', col: '#e8c030', at: [12, 3] },
    { id: 'autumn', name: 'leaf-red', col: '#c8502a', at: [12, 11] },
    { id: 'winter', name: 'snow-white', col: '#f4f4f8', at: [24, 3] },
  ];
  const struck = (i) => flag('kp_nd_' + SEASONS[i].id);
  const strike = (i) => function* (s) {
    const B = SEASONS[i];
    if (s.flag('kp_nd_' + B.id)) { yield s.msg(`The ${B.name} bag hangs high on its hook. A lantern glows beneath it.`); return; }
    s.sfx('hit'); s.shake(2, 8);
    const next = SEASONS.findIndex(x => !s.flag('kp_nd_' + x.id));
    if (i === next) {
      s.set('kp_nd_' + B.id);
      yield s.msg(`WHUMP! The ${B.name} bag swings up onto its hook and stays there.\nA lantern flickers to life on its plinth.`);
      if (i === SEASONS.length - 1) {
        s.set('kp_nd_great'); s.sfx('gate'); s.shake(3, 20);
        yield s.msg('Chains rattle somewhere to the east... The Great Bag swings aside!');
      }
      return;
    }
    SEASONS.forEach(x => s.unset('kp_nd_' + x.id));
    yield s.msg(`WHUMP! The ${B.name} bag swings... and every bag in the court comes swinging back down. The lanterns go out.`);
  };
  const nd = {
    aya: W.trainer({ id: 'nd_aya', cls: 'Pupil', name: 'Aya', model: { base: 'girl', hairStyle: 'ponytail', top: '#f0ece0', bottom: '#f0ece0', belt: '#d88a30', extras: ['headband'] },
      at: [6, 5], dir: 'down', sight: [6, 6, 1, 2], noBag: true, bg: 'dojo',
      line: "Welcome to the Hall of the First Strike! Before you punch that bag, you have to get past me!",
      lose: "Ow ow ow. Okay, you're ready. Go punch the bag!",
      after: "The bag in the doorway won't hit back. Probably.",
      team: [['stampo_monk', 17], ['kupochi_pugilist', 17]], money: 680 }),
    gorm: W.trainer({ id: 'nd_gorm', cls: 'Black Belt', name: 'Gorm', model: { base: 'man', build: 'big', hairStyle: 'buzz', top: '#f0ece0', bottom: '#f0ece0', belt: '#1a1a1a' },
      at: [14, 7], dir: 'left', sight: [11, 7, 3, 1], noBag: true, bg: 'dojo',
      line: "The Court of Seasons! Many have struck these bags. Few have struck them in the right order!",
      lose: "Hngh! Your timing is as good as your moogles.",
      after: "Read the tablet. The year turns the way it always has.",
      team: [['stampo_blackbelt', 18], ['icemog_climber', 18]], money: 720 }),
    lin: W.trainer({ id: 'nd_lin', cls: 'Senior Student', name: 'Lin', model: { base: 'woman', hairStyle: 'bun', hair: '#1a1a1a', top: '#c03030', bottom: '#2a2a2a', extras: ['sash'] },
      at: [29, 4], dir: 'down', sight: [29, 5, 1, 4], noBag: true, bg: 'dojo',
      line: "You turned the year! Then there's only me between you and Master Tifa.",
      lose: "Go on up. She's been looking forward to this.",
      after: "Master Tifa smiles before she punches. Don't let it fool you.",
      team: [['kupochi_pugilist', 18], ['icemog_climber', 18], ['stampo_blackbelt', 19]], money: 760 }),
  };
  FF7.defineMap('kp_nibel_dojo', {
    name: 'Seventh Heaven Arcade', area: 'Nibel Peaks', theme: 'temple', music: 'tifa', kpBg: 'dojo',
    look: { floor: ['#7a5a3c', '#725436'], floor3: ['#8a2a24', '#82261e'], floor2: ['#8a8070', '#827868'], wall: '#9a8a74', trim: '#4a3020',
      floorTex: { floor: 'planks', floor2: 'stone', floor3: 'carpet' }, sky: ['#000000', '#000000'], fog: null, ambient: [0.5, 0.46, 0.42], light: [0.85, 0.76, 0.62] },
    grid: ND, heights: NDH,
    props: [
      { at: [30, 0], prop: 'banner', col: '#c03030', col2: '#f0d070', text: 'FIST', textCol: '#f0d070', h: 1.6, y: 2.6 },
      { at: [35, 0], prop: 'banner', col: '#c03030', col2: '#f0d070', text: 'HEART', textCol: '#f0d070', h: 1.6, y: 2.6 },
      { at: [14, 0], prop: 'banner', col: '#3a6a3a', col2: '#e8c030', h: 1.4, y: 2.6 }, { at: [22, 0], prop: 'banner', col: '#3a6a3a', col2: '#e8c030', h: 1.4, y: 2.6 },
    ].concat(SEASONS.map(B => ({ at: B.at, prop: 'disc', r: 0.46, h: 0.1, col: '#5a4a3a', top: B.col }))),
    labels: [{ at: [32.5, 0], face: 's', text: 'SEVENTH HEAVEN', size: 0.16, col: '#f0d070', y: 2.25 },
      { at: [18, 0], face: 's', text: 'COURT OF SEASONS', size: 0.16, col: '#e8d8b0', y: 2.25 },
      { at: [4.5, 0], face: 's', text: 'FIRST STRIKE', size: 0.14, col: '#e8d8b0', y: 2.1 }],
    entries: { from_town: [4, 13, 'up'] },
    exits: [{ at: [4, 14, 1, 1], to: 'kp_nibelpeaks', entry: 'from_dojo', sfx: 'door2' }],
    npcs: [nd.aya.npc, nd.gorm.npc, nd.lin.npc,
      W.master({ id: 'nd_tifa', name: 'Tifa', model: 'tifa', at: [33, 7], dir: 'left', badge: 3,
        team: [['icemog_climber', 20], ['stampo_blackbelt', 21], ['kupochi_pugilist', 21], ['kupochi_master', 23]],
        intro: "Welcome to the Seventh Heaven Arcade! You made it through every trial, so I already like you.\fBut liking you won't stop me from giving it everything I've got. Ready? Here we go!",
        lose: "...Wow. You hit harder than my bags do.",
        after: "The Fist Badge suits you! Take care of your moogles out there, okay?\fAnd when you're back in town, stop by. I'll fix you something warm.",
        reward: [['boost_monk', 1], ['max_oil', 2]] }),
    ],
    objects: [
      Object.assign(W.barrier('nd_bag0', [9, 7], () => flag('kp_nd_bag0'), { prop: 'punchbag', col: '#8a2a20', scale: 1.1 }),
        { talk: function* (s) {
          if (s.flag('kp_nd_bag0')) return;
          const c = yield s.ask(null, 'A heavy punching bag hangs in the doorway, blocking the way on.', ['Punch it!', 'Leave it']);
          if (c !== 0) return;
          yield* W.toggle('nd_bag0_t', [9, 7], 'kp_nd_bag0', { once: true, sfx: 'hit', msg: 'WHUMP! The bag swings aside and catches on a hook. The way on is open!' }).talk(s);
        } }),
      Object.assign(W.barrier('nd_great', [27, 7], () => flag('kp_nd_great'), { prop: 'punchbag', col: '#3a3a48', scale: 1.4 }),
        { talk: function* (s) {
          if (s.flag('kp_nd_great')) return;
          s.sfx('hit');
          yield s.msg("The Great Bag is iron-heavy. It doesn't budge an inch.\nWords are burned into its leather: \"When the year has turned, I will yield.\"");
        } }),
    ].concat(SEASONS.map((B, i) => Object.assign(W.barrier('nd_bag_' + B.id, B.at, () => struck(i), { prop: 'punchbag', col: B.col }), { talk: strike(i) })),
      SEASONS.map((B, i) => ({ id: 'nd_lamp_' + B.id, at: B.at, model: { prop: 'lantern', col: B.col }, solid: true, hidden: true, tick(ob) { ob.hidden = !struck(i); } }))),
    triggers: [nd.aya.trig, nd.gorm.trig, nd.lin.trig,
      { at: [18, 1], on: 'talk', run: function* (s) { yield s.msg('A stone tablet, worn smooth by many hands:\f"Four bags, four seasons. Strike as the year turns:\nblossom, sun, leaf, snow.\nThen the Great Bag will yield."'); } }],
  });


  // ================================================================== ROUTE 8
  // Down the far side of the mountains: the last snow on the pass, the Long Steps cut into the canyon wall, a scrub
  // flat, the dry riverbed winding under a natural rock arch, a red mesa (up its steps for a Cowgirl and a nut, a ledge
  // back down), the great red butte, a prospector's camp in the east cove, and out over the dunes toward Sandsea.
  KP.WILD.kp_route8 = [['dunemog_nomad', 26, 18, 20], ['cactumog_guard', 18, 18, 21], ['embermog_sorcerer', 20, 18, 20], ['grumog_berserker', 12, 19, 21],
    ['chocomog_rider', 12, 18, 20], ['kupochi_pugilist', 10, 18, 19], ['gilmog_gambler', 2, 20, 21]];
  const R8 = [
    "########################################",
    "nnnnnn..R...Y.............##############",
    "dddddddddddddddd....R....###############",
    "dddddddddddddddd......R..###############",
    ".!...GGGGG.....dd......#################",
    "nn..GGGGGGG....ddR....##################",
    "nnnY.GGGGG...R.dd.......################",
    "nnn............dd.........##############",
    "##.sss........R^^R.......&...###########",
    "##.sss........R^^R..&.U........#########",
    "##.ssss.....R.R^^R...GGGG.............. ",
    "##..ssx........ddRR..GGGGGG.....R...A.. ",
    "##.Rssss.......dd^^...GGGG............. ",
    "##GGGGGGGGGGGGGGGRRG...GGG........@..B. ",
    "##GGGGGGGGGGGGGGGGGGG..........R....... ",
    "##....sssss...dd......................R ",
    "##.....ssxsssddd...............ssssssss ",
    "##..U...sssssss.....&........sssssRRsss ",
    "##........UssssssU.........RRsssGGGRsss ",
    "##..........ssssxssss.....sssssGGGGGGsR ",
    "##...........ddsssssxsssssssRRssGGGGsss ",
    "##..&.........ddd..ssssssss&sssssRRss!s ",
    "##.......R......ddd...ssssssssssssssssss",
    "##................ddddddssssssssssssssss",
    "##......&...............sssssss&ssssssss",
    "##...U.........U........ssssGGGGssssRRs ",
    "##....&.....&.....R..&...sRGGGGGRRsssss ",
    "##........................sRGGGssRss&ss ",
    "########################## sssssssssss  ",
    "##########################              ",
  ];
  const R8H = [
    "8888888888888888888888888888888888888888",
    "8888888888888888888888888888888888888888",
    "8888888888888888888888888888888888888888",
    "8888888888888888888888888888888888888888",
    "8888888888888888888888888888888888888888",
    "8888888888888888888888888888888888888888",
    "8888888888888888888800008888888888888888",
    "8888888888888888880000000088888888888888",
    "8800000000000006600000000000088888888888",
    "8800000000000004400000000000000888888888",
    "8800000000000002200044444444000000000000",
    "8800000000000000000444444444440000000000",
    "8800000000000000013444444444444000000000",
    "8800000000000000000044444444444000000000",
    "8800000000000000000004444444440000000000",
    "8800000000000000000000044444400000000000",
    "8800000000000000000000000000000000000000",
    "8800000000000000000000000000000000000000",
    "8800000000000000000000000000000000000000",
    "8800000000000000000000000000000000000000",
    "8800000000000000000000000000000000000000",
    "8800000000000000000000000000000000000000",
    "8800000000000000000000000000000000000000",
    "8800000000000000000000000000000000000000",
    "8800000000000000000000000000000000000000",
    "8800000000000000000000000000000000000000",
    "8800000000000000000000000000000000000000",
    "8800000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
  ];
  const r8 = {
    climber: W.trainer({ id: 'r8_dax', cls: 'Rock Climber', name: 'Dax', model: { base: 'man', hairStyle: 'spiky', hair: '#6a3a1a', top: '#c86a2a', bottom: '#4a4a3a', extras: ['harness', 'gloves'] },
      at: [11, 1], dir: 'down', sight: [11, 2, 1, 2],
      line: "From up here you can see the whole Red Canyon! And from down there, everyone can see you lose!",
      lose: "Whoa, whoa, losing my grip...",
      after: "The Long Steps were cut by the old river folk. Mind the bottom one. It's wobbly.",
      team: [['grumog_berserker', 19], ['minemog_foreman', 19]], money: 760 }),
    cowgirl: W.trainer({ id: 'r8_rosa', cls: 'Cowgirl', name: 'Rosa', model: { base: 'woman', hairStyle: 'braid', hair: '#a0602a', top: '#e0d0a0', bottom: '#5a6a9a', extras: ['vest', 'bangles'] },
      at: [26, 12], dir: 'left', sight: [19, 12, 7, 1],
      line: "Yee-haw! Nobody climbs my mesa without a duel at high noon! ...It's always high noon out here.",
      lose: "Well, shoot. Fastest moogles west of the Sandsea.",
      after: "Hop off the south edge if you're in a hurry. It's a one-way trip, mind.",
      team: [['chocomog_rider', 19], ['dunemog_nomad', 20]], money: 800 }),
    maniac: W.trainer({ id: 'r8_pip', cls: 'Ruin Maniac', name: 'Pip', model: { base: 'man', hairStyle: 'cap', top: '#c8b890', bottom: '#8a7a5a', extras: ['glasses', 'vest'] },
      at: [19, 21], dir: 'down', sight: [17, 22, 3, 1],
      line: "Shh! I'm listening to the arch. Old rocks whisper, you know. ...They're whispering 'battle'!",
      lose: "The rocks... lied to me.",
      after: "There's a buried temple past Sandsea. The Sunken Ruins! I'd go in, but I hear something wrapped in bandages lives there.",
      team: [['embermog_sorcerer', 20], ['cactumog_guard', 20]], money: 800 }),
    nomad: W.trainer({ id: 'r8_zahra', cls: 'Nomad', name: 'Zahra', model: { base: 'woman', hairStyle: 'longstraight', hair: '#1a1a1a', top: '#3a6aa0', bottom: '#e8dcc0', extras: ['robe', 'sash'] },
      at: [30, 22], dir: 'left', sight: [25, 22, 5, 3],
      line: "The dunes shift every night, but a good battle is always in the same place: right here.",
      lose: "The sand remembers your footsteps, traveler.",
      after: "Sandsea's just east. Drink from the oasis and rest in the shade. The desert can wait.",
      team: [['dunemog_nomad', 20], ['embermog_sorcerer', 20], ['cactumog_guard', 21]], money: 840 }),
  };
  const CACTUS = (x, y) => ({ at: [x, y], prop: 'spire', col: '#4a8a3a', h: 1.0 + hash(x, y) * 0.6, r: 0.3 });
  FF7.defineMap('kp_route8', {
    name: 'Route 8', area: 'Route 8', theme: 'canyon', music: 'cosmo', kpWild: 'kp_route8', kpBg: 'desert',
    look: { floor2: ['#c8a070', '#c09868'], floorTex: { floor2: 'sand' }, sand: ['#dcbc84', '#d4b47c'], grass: ['#8a8a48', '#828240'],
      dirt: ['#9a6a44', '#92623e'], wallTop: '#9a5434', fog: { color: [0.86, 0.66, 0.48], near: 16, far: 38 } },
    legend: { '&': 'spire', U: 'spire' },
    grid: R8, heights: R8H,
    props: [].concat(each(R8, '&', CACTUS), each(R8, 'U', (x, y) => ({ at: [x, y], prop: 'spire', col: '#a85a36', h: 2.2 + hash(x, y) * 0.8, r: 0.95 })),
      each(R8, 'R', (x, y) => x >= 24 && y >= 16 ? { at: [x, y], prop: 'rock', col: '#dcbc84', scale: [1.7, 0.8, 1.5] } : null),
      [{ at: [10, 18], to: [17, 18], h: 2.25, h2: 2.25, sag: -1.0, r: 0.34, count: 1, col: '#b0603a' },
        { at: [12, 1], prop: 'tree', col: '#6a5a40', h: 1.8 }, { at: [3, 6], prop: 'tree', col: '#6a5a40', h: 1.6 },
        { at: [36, 11], prop: 'tent', col: '#c89860' }]),
    entries: { from_nibelpeaks: [1, 3, 'right'], from_sandsea: [38, 23, 'left'] },
    exits: [
      { at: [0, 2, 1, 2], to: 'kp_nibelpeaks', entry: 'from_route8' },
      { at: [39, 22, 1, 3], to: 'kp_sandsea', entry: 'from_route8' },
    ],
    npcs: [r8.climber.npc, r8.cowgirl.npc, r8.maniac.npc, r8.nomad.npc,
      { id: 'r8_prospector', name: 'Prospector', model: { base: 'oldman', hairStyle: 'bald', top: '#8a6a4a', bottom: '#5a4a3a', extras: ['beard', 'suspenders'] }, at: [35, 12], dir: 'left',
        talk: say('Prospector', "This canyon was a river once. Folks say the water went underground, down under the old ruins past Sandsea.\fI've been digging for it for thirty years. Found a whole lot of rocks. Nice rocks, mind you.") },
    ],
    items: [W.item('r8_wild', [29, 13], 'wild_nut', 2), W.item('r8_golden', [22, 1], 'golden_nut', 2), W.item('r8_hioil', [33, 15], 'hi_oil', 2)],
    triggers: [r8.climber.trig, r8.cowgirl.trig, r8.maniac.trig, r8.nomad.trig,
      ledge([4, 7, 5]), ledge([23, 15, 6]),
      W.hidden('r8_skull', [6, 11], 'boost_blackmage'),
      W.sign([1, 4], 'ROUTE 8 - The Red Canyon\nWest: Nibel Peaks.   East: Sandsea.'),
      W.sign([37, 21], 'SANDSEA, just ahead!\nFresh water, cool shade and the famous Sandsea Bazaar.'),
    ],
  });

  // ================================================================== SANDSEA
  // A round oasis town ringed by dunes. The palm-ringed pool fills the middle (reeds on its east shore hide a rare
  // moogle); the Mog Center, the red tent of the Grand Bazaar and a sandstone house stand on a raised promenade to the
  // north; the stall street (umbrellas, bunting) runs along the south, past a sandstone house and the chocobo stable.
  // Sephiroth waits at the oasis (battle 6). The east gate leads out to the Sunken Ruins.
  KP.WILD.kp_sandsea = [['dunemog_nomad', 50, 19, 20], ['cactumog_guard', 42, 19, 21], ['gilmog_gambler', 8, 20, 22]];
  const SS = [
    "            RRRRRRRRRRRRRRRR            ",
    "      RRRRRRRRRRRRRRRRRRRRRRRRRRRR      ",
    "    RRRRRsssssshhhhhhhhhhhsssssRRRRR    ",
    "   RRhhhhhhhsTshhhhhhhhhhhsshhhhhhhRR   ",
    "  RRRhhhhhhhssshhhhhhhhhhhTshhhhhhhRRR  ",
    " RRRshhhhhhhssshhhhhhhhhhhsshhhhhhhsRRR ",
    " RRsshhhhhhhjsjhhhhhhhhhhhsjhhhhhhhssRR ",
    " RRsshhh+hhhssshhhhh+hhhhhsshhh+hhhssRR ",
    " RRs................................sRR ",
    "RRRT...^^..........^^^.........^^...TRRR",
    "RRR..................................RRR",
    "RRRs....ssssTss,T,,,,,,T,sssssss....sRRR",
    "RR!s....sssss,,,~~~~~~~~,,GGssss....s|RR",
    "R.......ssss,,~~~~~~~~~~~~,GGTss.......R",
    "........ssT,,,~~~~~~~~~~~~,GGsss........",
    "........sss,,,~~~~~~~~~~~~,GGsss........",
    "R.......ssss,,~~~~~~~~~~~~GGsTss.......R",
    "RRRs....sssTs,T,~~~~~~~~,T,sssss....s|RR",
    "RRR..................................RRR",
    "RRRT................................TRRR",
    "RRRsssssssssssDDsssDDsssDDss===..====RRR",
    " RRsshhhhhhhjsssssssssssssss=sssshhh=RR ",
    " RRsshhhhhhhsjssssssssssssss=sssshhh=RR ",
    " RRsshhhhhhhssssssssssssssss=sssssss=RR ",
    " RRRshhh+hhhssssssssssssssss=sOsssss=RR ",
    "  RRTsss.sssssssssssssssssss=ssssssTRR  ",
    "   RRRssssssssssssssssssssssssssssRRR   ",
    "    RRRRRssssssssssssssssssssssRRRRR    ",
    "      RRRRRRRRRRRRRRRRRRRRRRRRRRRR      ",
    "            RRRRRRRRRRRRRRRR            ",
  ];
  const SSH = [].concat(rows(2, 40, '0'), rows(7, 40, '2'), rows(1, 40, '0', [7, 8, 19, 20, 21, 31, 32].map(x => [x, 0, '1'])), rows(20, 40, '0'));
  const PALM = (x, y) => ({ at: [x, y], prop: 'canopy', col: '#3f8a3a', col2: '#8a6a3a', r: 1.05, h: 2.3 + hash(x, y) * 0.7 });
  const DUNE = (x, y) => ({ at: [x, y], prop: 'rock', col: '#dcbc84', scale: [1.7, 0.75, 1.6] });
  // the fortune teller reads your lead moogle's weak spots from the type chart
  function* fortune(s) {
    const d = FF7.state.kp, lead = d && d.party && d.party[0], sp = lead && KP.SPECIES[lead.sp];
    yield s.say('Fortune Teller', "Cross my palm with... no, keep your coins, dear. The sands tell me everything for free.");
    if (!sp) { yield s.say('Fortune Teller', "...The sands see no moogle at your side. How strange."); return; }
    const weak = KP.TYPES.filter(t => KP.eff(t, sp.type) === 2).map(t => KP.TYPE_NAMES[t]);
    yield s.say('Fortune Teller', `I see... a ${KP.TYPE_NAMES[sp.type]} walking in front of you, proud and loyal.\f` +
      (weak.length ? `But beware the ${weak.join(', the ')}! Their blows will land twice as hard.` : 'And I see no type that it need fear. Lucky you!'));
  }
  // Sephiroth at the oasis (battle 6)
  function* sephOasis(s) {
    if (s.flag('kp_rival_sephiroth_6')) return;
    s.emote('ss_seph', '...');
    yield s.face('ss_seph', 'player'); yield s.face('player', 'ss_seph');
    if (!s.flag('kp_ss_seph_met')) {
      s.set('kp_ss_seph_met');
      yield s.say('sephiroth', "...Cloud. Slower than I expected. Then again, I expected very little.");
      yield s.say('sephiroth', "Team Hojo marched into the Sunken Ruins two days ago with shovels and crates. Whatever's buried in there, they mean to dig it up.\fI intend to get there first. Unless you'd like to try and stop me.");
    } else yield s.say('sephiroth', "Back again. Your team looks rested. Let's see if that helps.");
    const r = yield* W.rival(s, 'sephiroth', 6, { lose: "...Hm. So you can keep up. For now.", win: "As expected.", bg: 'desert' });
    yield s.say('sephiroth', "Your moogles trust you. That's why they fight so hard for you.\f...Remember that when you meet Heidegger. He trusts nothing but the sound of his own laugh.");
    yield s.move('ss_seph', [[12, 18], [30, 18]]);
    s.remove('ss_seph');
  }
  const stall = (who, line) => function* (s) { yield s.say(who, line); };
  FF7.defineMap('kp_sandsea', {
    name: 'Sandsea', area: 'Sandsea', theme: 'desert', music: 'costadelsol', kpWild: 'kp_sandsea', kpBg: 'desert',
    look: { floorTex: { floor: 'stone', floor2: 'stone' }, floor: ['#dcc89c', '#d4c094'], floor2: ['#c8b08a', '#c0a882'], sand: ['#e2c48c', '#dabc84'],
      grass: ['#5a9a3a', '#549234'], water: '#2a8aa8', wall: '#c8a070', bldg: '#e0c89a', roof: '#c8a878', wallTop: '#c8a070',
      wallTex: { wall: 'rock', bldg: 'plaster' }, fog: { color: [0.9, 0.82, 0.64], near: 16, far: 40 } },
    grid: SS, heights: SSH,
    buildings: [
      { at: [5, 3, 7, 5], h: 2.0, top: 'flat', col: '#e4cc9e', roof: '#c8a878' },
      { at: [15, 2, 11, 6], h: 2.2, top: 'hip', rise: 1.7, roof: '#c0443a', col: '#ece0c4', tex: false, over: 0.35 },
      { at: [28, 3, 7, 5], h: 2.0, top: 'flat', col: '#dcbe8c', roof: '#c4a070' },
      { at: [5, 21, 7, 4], h: 1.9, top: 'flat', col: '#d8b888', roof: '#c09c6c' },
      { at: [33, 21, 3, 2], h: 1.5, top: 'shed', roof: '#8a6a3a' },
    ],
    props: [].concat(each(SS, 'T', PALM), each(SS, 'R', DUNE),
      [{ at: [14.5, 20], prop: 'canopy', col: '#d04a40', col2: '#6a5a4a', r: 1.25, h: 1.9 }, { at: [19.5, 20], prop: 'canopy', col: '#e0b030', col2: '#6a5a4a', r: 1.25, h: 1.9 },
        { at: [24.5, 20], prop: 'canopy', col: '#3a7ac0', col2: '#6a5a4a', r: 1.25, h: 1.9 },
        { at: [12, 19.4], to: [27, 19.4], h: 2.5, h2: 2.5, sag: 0.4, bulbs: ['#e04040', '#f0c040', '#40a0e0', '#f0f0f0'] },
        { at: [37, 12], prop: 'pillar', col: '#d8bc8a', h: 2.6 }, { at: [37, 17], prop: 'pillar', col: '#d8bc8a', h: 2.6 },
        { at: [37, 12], to: [37, 17], h: 2.5, h2: 2.5, sag: 0.25, count: 1, r: 0.12, col: '#c8a070' }]),
    labels: [{ at: [8, 7], face: 's', off: 0.25, text: 'MOG CENTER', size: 0.14, col: '#e05a7a', y: 1.6 },
      { at: [20, 7], face: 's', off: 0.25, text: 'GRAND BAZAAR', size: 0.17, col: '#f8e8b0', y: 1.75 }],
    entries: { from_route8: [1, 14, 'right'], from_ruins: [38, 14, 'left'], from_center: [8, 8, 'down'], from_bazaar: [20, 8, 'down'],
      from_house1: [31, 8, 'down'], from_house2: [8, 25, 'down'] },
    exits: [
      { at: [0, 14, 1, 2], to: 'kp_route8', entry: 'from_sandsea' },
      { at: [39, 14, 1, 2], to: 'kp_ruins_1', entry: 'from_sandsea' },
      { at: [8, 7, 1, 1], to: 'kp_sandsea_center', entry: 'from_town', sfx: 'door' },
      { at: [20, 7, 1, 1], to: 'kp_sandsea_bazaar', entry: 'from_town', sfx: 'door' },
      { at: [31, 7, 1, 1], to: 'kp_sandsea_house1', entry: 'from_town', sfx: 'door' },
      { at: [8, 24, 1, 1], to: 'kp_sandsea_house2', entry: 'from_town', sfx: 'door' },
    ],
    npcs: [
      { id: 'ss_seph', name: 'Sephiroth', model: 'sephiroth', at: [12, 15], dir: 'left', show: s => !s.flag('kp_rival_sephiroth_6'), talk: sephOasis },
      { id: 'ss_water', name: 'Water Carrier', model: { base: 'woman', hairStyle: 'long', top: '#3a8ab0', bottom: '#e8dcc0', extras: ['sash'] }, at: [18, 11], dir: 'down',
        talk: say('Water Carrier', "The oasis never runs dry, not even when the rains forget us for a whole year.\fThe old folks say it's fed by a river that runs under the desert, all the way from the mountains.") },
      { id: 'ss_elder', name: 'Old Man', model: 'oldman4', at: [11, 13], dir: 'right',
        talk: say('Old Man', "East of town, the sand swallowed a whole temple long ago. The Sunken Ruins.\fA Wrapmog guards the tomb at the bottom, wrapped head to toe. Folks say it sleeps until someone rattles the lid.") },
      { id: 'ss_kid', name: 'Boy', model: 'kid5', at: [24, 9], dir: 'down', wander: 3,
        talk: say('Boy', "Some guys in lab coats went into the ruins with shovels! Their boss had a big belly and laughed like this: Gya-ha-ha!\fI did it better, right? Gya-ha-HA!") },
      { id: 'ss_guard', name: 'Gate Guard', model: { base: 'man', hairStyle: 'cap', top: '#e8dcc0', bottom: '#8a6a4a', extras: ['sash', 'mustache'] }, at: [36, 16], dir: 'left',
        talk: function* (s) {
          if (s.flag('kp_ruins_key')) { yield s.say('Gate Guard', "You chased Team Hojo out of the ruins? The whole town owes you a cold drink!\fThe old stone door there opens onto the badlands. Skyport's on the far side."); return; }
          yield s.say('Gate Guard', "The road east goes to the Sunken Ruins and nowhere else. Past the ruins there's an old stone door to the badlands, but nobody's had its key for a hundred years.");
        } },
      { id: 'ss_fruit', name: 'Fruit Seller', model: 'woman9', at: [14, 21], dir: 'up', talk: stall('Fruit Seller', "Cactus fruit! Sweet as honey, prickly as my mother-in-law!\f...Don't tell her I said that.") },
      { id: 'ss_rugs', name: 'Rug Merchant', model: 'man8', at: [19, 21], dir: 'up', talk: stall('Rug Merchant', "Flying carpets? No, no, my friend. Just carpets.\fThey do fly if you throw them hard enough.") },
      { id: 'ss_teller', name: 'Fortune Teller', model: { base: 'oldwoman', hairStyle: 'long', hair: '#d8d8e0', top: '#6a3a8a', bottom: '#4a2a6a', extras: ['robe', 'bangles'] }, at: [24, 21], dir: 'up', talk: fortune },
      { id: 'ss_rancher', name: 'Stable Hand', model: { base: 'man', hairStyle: 'short', top: '#a07a4a', bottom: '#4a5a7a', extras: ['vest'] }, at: [31, 23], dir: 'up',
        talk: say('Stable Hand', "These are desert chocobos. They can go a week without water, and a whole hour without complaining.\fThe Dunemogs ride them sometimes. The chocobos pretend not to notice.") },
      { id: 'ss_choco1', name: 'Chocobo', model: 'chocobo', at: [30, 22], dir: 'right', wander: 1, talk: function* (s) { yield s.msg('Chocobo: Kweh! Kweh!'); } },
      { id: 'ss_choco2', name: 'Chocobo', model: 'chocobo', at: [33, 24], dir: 'left', wander: 1, talk: function* (s) { yield s.msg('The chocobo is napping in the shade with one eye open.'); } },
      W.moogle('ss_mog1', 'dunemog_nomad', [6, 10], { line: 'The Dunemog adjusts its scarf against the sand. Kupo.' }),
      W.moogle('ss_mog2', 'cactumog_guard', [33, 10], { line: 'The Cactumog stands perfectly still, like a cactus. It is not fooling anyone. Kupo!' }),
      W.moogle('ss_mog3', 'embermog_sorcerer', [22, 18], { line: 'The Embermog is warming its paws on its own staff. Kupo...' }),
    ],
    triggers: [
      { id: 'ss_seph_scene', at: [9, 8, 2, 12], once: false, if: s => !s.flag('kp_rival_sephiroth_6'), run: sephOasis },
      { at: [14, 20, 2, 1], on: 'talk', run: stall('Fruit Seller', "Cactus fruit! Sweet as honey, prickly as my mother-in-law!") },
      { at: [19, 20, 2, 1], on: 'talk', run: stall('Rug Merchant', "Every rug hand-woven! Every rug one of a kind! ...Except those twelve. Those are the same kind.") },
      { at: [24, 20, 2, 1], on: 'talk', run: fortune },
      W.sign([2, 12], 'SANDSEA\nThe oasis that never runs dry. Welcome, traveler!'),
    ],
  });
  W.mogCenter('kp_sandsea_center', { name: 'Sandsea Mog Center', town: 'kp_sandsea', back: 'from_center', decor: 'tent', mart: MART_NIBEL,
    look: { sky: ['#000000', '#000000'], fog: null, wall: '#dcc49a', trim: '#8a6a40', wallTex: { wall: 'plaster' }, floorTex: { floor: 'tiles' }, floor: ['#c8b08a', '#c0a882'] },
    npcs: [{ id: 'ssc_traveler', name: 'Traveler', model: 'woman6', at: [8, 5], dir: 'left',
      talk: say('Traveler', "The Mart only sells the usual. For held items you want the Grand Bazaar next door: the big red tent.\fLucky Poms, Quick Gears, and a whole wall of type charms!") }] });
  // the Grand Bazaar: held items (per the Builder's guide: Lucky Pom, Quick Gear, Leftover Nut, and the type boosters)
  const BAZAAR_ITEMS = ['lucky_pom', 'quick_gear', 'leftover_nut'], BAZAAR_CHARMS = ['gamblers_coin'].concat(KP.TYPES.map(t => 'boost_' + t));   // (his own lucky coin first)
  W.house('kp_sandsea_bazaar', { name: 'Grand Bazaar', area: 'Sandsea', town: 'kp_sandsea', back: 'from_bazaar', theme: 'house',
    look: { floor: ['#c8a878', '#c0a070'], floor3: ['#a8342a', '#a02e26'], wall: '#e8dcc0', trim: '#a0442a', floorTex: { floor: 'planks', floor3: 'carpet' } },
    grid: [
      "##################",
      "#m..............m#",
      "#..DDDD....DDDD..#",
      "#................#",
      "#.__..______..__.#",
      "#.__..______..__.#",
      "#................#",
      "#.ctc........ctc.#",
      "########+#########",
    ],
    door: [8, 8],
    npcs: [
      { id: 'ssb_held', name: 'Bazaar Mog', model: { enemy: 'kp_nutmog_treasure_hunter', scale: 0.85 }, at: [4, 1], dir: 'down', talk: W.mart(BAZAAR_ITEMS, 'Bazaar Mog') },
      { id: 'ssb_charm', name: 'Charm Mog', model: { enemy: 'kp_gilmog_gambler', scale: 0.85 }, at: [12, 1], dir: 'down', talk: W.mart(BAZAAR_CHARMS, 'Charm Mog') },
      { id: 'ssb_shopper', name: 'Shopper', model: 'woman3', at: [8, 5], dir: 'up',
        talk: say('Shopper', "A type charm makes every move of that type hit harder. My Embermog holds a Black Tome, and now it singes everything.\fAnd that Charm Mog's lucky coin? Give it to one of your team and every prize comes out doubled. He swears by it. ...He also owes me money.") },
      { id: 'ssb_tea', name: 'Tea Drinker', model: 'oldman5', at: [14, 6], dir: 'left',
        talk: say('Tea Drinker', "A Leftover Nut, my friend. Your moogle nibbles it all battle long and patches itself up a little every turn.\fBest money I ever spent. ...After this tea.") },
    ],
    triggers: [{ at: [3, 2, 4, 1], on: 'talk', run: W.mart(BAZAAR_ITEMS, 'Bazaar Mog') }, { at: [11, 2, 4, 1], on: 'talk', run: W.mart(BAZAAR_CHARMS, 'Charm Mog') }],
  });
  // the north-east house: a scholar of the ruins (the pressure-plate hint)
  W.house('kp_sandsea_house1', { name: "Scholar's House", area: 'Sandsea', town: 'kp_sandsea', back: 'from_house1', decor: 'tent',
    grid: ["############", "#kkk..b..q.#", "#..........#", "#.t........#", "#.c......j.#", "#####+######"],
    look: { sky: ['#000000', '#000000'], fog: null },
    npcs: [{ id: 'ssh_scholar', name: 'Scholar', model: { base: 'oldman', hairStyle: 'short', hair: '#c8c8c0', top: '#5a6a8a', bottom: '#4a4a4a', extras: ['glasses', 'robe'] }, at: [5, 2], dir: 'down',
      talk: say('Scholar', "The Sunken Ruins! I've studied them for forty years. The inner door is sealed by four pressure stones, carved with the old numerals.\fStep on them as the ancients counted: one, two, three, four. Step out of turn, and every stone rises again.\f...At least, that's my theory. I've never been brave enough to test it.") }] });
  // the south-west house: Glow Nuts for the dark ruins
  W.house('kp_sandsea_house2', { name: 'Sandstone House', area: 'Sandsea', town: 'kp_sandsea', back: 'from_house2', decor: 'tent',
    look: { sky: ['#000000', '#000000'], fog: null },
    npcs: [
      { id: 'ssh_granny', name: 'Grandma', model: 'oldwoman3', at: [3, 2], dir: 'down',
        talk: function* (s) {
          if (!s.flag('kp_ss_glow')) {
            yield s.say('Grandma', "Going into those dark old ruins? Then take these, dearie. Glow Nuts.\fMoogles that live in the dark can't resist a nut that shines like a little moon.");
            s.set('kp_ss_glow'); KP.give('glow_nut', 3); s.sfx('found');
            yield s.msg('Received 3 Glow Nuts!');
            return;
          }
          yield s.say('Grandma', "Mind the sand in those ruins. It gets into everything. EVERYTHING.");
        } },
      { id: 'ssh_kid', name: 'Girl', model: 'girl4', at: [7, 3], dir: 'left', wander: 1,
        talk: say('Girl', "When I grow up I'm going to ride a chocobo across the whole desert! And a Dunemog will ride on my head!") },
    ] });

  // ================================================================== THE SUNKEN RUINS
  // A temple half swallowed by the desert. The Sunken Hall (kp_ruins_1): down a sand ramp into a pillared hall, the great
  // sealed door north (to Route 9: it wants the Ruins' Key), the inner door east (sealed by the pressure stones).
  // The Wrapmog's Tomb (kp_ruins_2): a crypt under the hall, where Team Hojo's Admin Heidegger is prying at the
  // sarcophagus. Beat him and he drops the key; then the Wrapmog wakes. Encounters on every floor tile (kpCave).
  //   PRESSURE STONES (kp_ruins_1): four stones carved I-IV, one in each corner of the hall; step on them in number
  //   order: I [29,4] (north-east), II [3,17] (south-west), III [3,4] (north-west), IV [29,17] (south-east). A stone out
  //   of turn raises them all again. The fourth opens the inner door [32,10-11].
  KP.WILD.kp_ruins = [['tickmog_time_mage', 22, 20, 21], ['tickmog_chronomancer', 4, 22, 23], ['dunemog_nomad', 10, 20, 20], ['dunemog_raider', 8, 21, 22],
    ['wrapmog_tomb_guard', 14, 20, 23], ['nutmog_treasure_hunter', 15, 20, 22], ['embermog_sorcerer', 14, 20, 22], ['minemog_foreman', 10, 20, 22], ['mathmog_arithmetician', 3, 21, 23]];
  const RUINS_LOOK = { floor: ['#a89470', '#a08c68'], floor3: ['#8a7a5a', '#827252'], floor2: ['#9a8a68', '#928260'], wall: '#b09a6e', trim: '#5a4a30',
    wallTop: '#8a7a58', sand: ['#d8bc84', '#d0b47c'], sky: ['#0a0806', '#1a140c'], fog: { color: [0.1, 0.08, 0.05], near: 8, far: 24 },
    ambient: [0.46, 0.42, 0.36], light: [0.9, 0.8, 0.6], floorTex: { floor: 'stone', floor2: 'stone', floor3: 'stone' }, pillar: '#b8a478' };
  const RU1 = [
    "##################################",
    "################..################",
    "################..################",
    "##.........____________.........##",
    "##m........____________.......m.##",
    "##.........____________.........##",
    "##.............^^^^.............u#",
    "##..............................##",
    "#u....|....|..........|....|....##",
    "##..............................##",
    "##..............uu................",
    "##................................",
    "#u....|....|..........|....|....##",
    "##..............................##",
    "##..............................##",
    "##.R..........................R.u#",
    "##sss.|....|..........|....|.sss##",
    "##m..ss....................s..ms##",
    "##ssssssRs..............ssRsssss##",
    "##sssssRsssssssssssssssssRssssss##",
    "#############RR^^^^RR#############",
    "#############RR^^^^RR#############",
    "#############ssssssss#############",
    "             ssssssss             ",
    "             ssssssss             ",
  ];
  const RU1H = [].concat(['0'.repeat(34)], rows(2, 34, '0', [[16, 0, '2'], [17, 0, '2'], [16, 1, '2'], [17, 1, '2']]),
    rows(3, 34, '0', [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].flatMap(x => [[x, 0, '2'], [x, 1, '2'], [x, 2, '2']])),
    rows(1, 34, '0', [[15, 0, '1'], [16, 0, '1'], [17, 0, '1'], [18, 0, '1']]), rows(13, 34, '0'),
    ['0000000000000441111440000000000000', '0000000000000443333440000000000000'], rows(3, 34, '0', [13, 14, 15, 16, 17, 18, 19, 20].flatMap(x => [[x, 0, '4'], [x, 1, '4'], [x, 2, '4']])));
  const PLATES = [{ n: 'I', at: [29, 4], urn: [30, 4] }, { n: 'II', at: [3, 17], urn: [2, 17] }, { n: 'III', at: [3, 4], urn: [2, 4] }, { n: 'IV', at: [29, 17], urn: [30, 17] }];
  const pressed = (i) => flag('kp_ru_plate' + i);
  const plateStep = (i) => function* (s) {
    const P = PLATES[i];
    if (s.flag('kp_ruins_door') || s.flag('kp_ru_plate' + i)) return;
    const next = PLATES.findIndex((_, k) => !s.flag('kp_ru_plate' + k));
    s.sfx('hit'); s.shake(1, 8);
    if (i === next) {
      s.set('kp_ru_plate' + i);
      yield s.msg(`The stone carved "${P.n}" sinks into the floor with a grinding thud.\nA flame leaps up in the urn beside it.`);
      if (i === PLATES.length - 1) {
        s.set('kp_ruins_door'); s.sfx('gate'); s.shake(3, 30);
        yield s.msg('A deep rumble rolls through the hall...\nThe inner door to the east grinds open!');
      }
      return;
    }
    PLATES.forEach((_, k) => s.unset('kp_ru_plate' + k));
    yield s.msg(`The stone carved "${P.n}" sinks... and every stone in the hall grinds back up again.\nThe urn flames gutter out.`);
  };
  const SLAB = { prop: 'cabinet', col: '#9a8866', scale: 1.9 };
  function* northDoor(s) {
    if (s.flag('kp_ruins_northdoor')) return;
    if (!s.flag('kp_ruins_key')) { yield s.msg("A great stone door carved with a moogle's face. Beyond it, they say, lie the badlands.\fIn the middle of the carving is an empty keyhole, shaped like a pom-pom."); return; }
    yield s.msg("You fit the Ruins' Key into the pom-pom keyhole and turn it...");
    s.set('kp_ruins_northdoor'); s.sfx('gate'); s.shake(3, 40);
    yield 30;
    yield s.msg('With a groan of ancient stone, the great door slides open! Daylight pours in from the badlands beyond.');
  }
  const ru = {
    kip: W.trainer({ id: 'ru_kip', cls: 'Treasure Hunter', name: 'Kip', model: { base: 'man', hairStyle: 'short', top: '#3a5a8a', bottom: '#7a5a3a', extras: ['redband', 'vest'] },
      at: [21, 14], dir: 'left', sight: [16, 14, 5, 1],
      line: "Finders keepers! Whatever's in this ruin is MINE. Unless you beat me. Then it's still mine, but I'll be sad.",
      lose: "Aw, nuts. And not the tasty kind.",
      after: "Those numbers on the floor stones... I tried them in every order. Well, every order but the obvious one.",
      team: [['nutmog_treasure_hunter', 21], ['tickmog_time_mage', 21]], money: 840 }),
    grunt0: W.grunt({ id: 'ru_grunt0', name: 'Grunt', at: [29, 11], dir: 'left', sight: [24, 10, 5, 2], show: s => !s.flag('kp_ru_heid_done'),
      line: "Hey! This dig site is closed! ...Yes, the whole ruin. Yes, it's a very big dig site.",
      lose: "Ugh! Fine! The Admin's already down in the tomb anyway. We dug in through the roof!",
      after: "Don't look at me. I'm not allowed to solve puzzles. Admin's orders.",
      team: [['dunemog_nomad', 20], ['tickmog_time_mage', 21]], money: 840 }),
  };
  FF7.defineMap('kp_ruins_1', {
    name: 'Sunken Ruins', area: 'Sunken Ruins', theme: 'temple', music: 'temple', kpWild: 'kp_ruins', kpBg: 'ruins', kpCave: true,
    look: RUINS_LOOK,
    grid: RU1, heights: RU1H,
    lights: [[16, 21, '#fff0c8', 4], [16, 14, '#ffe8b0', 3], [30, 4, '#ffb060', 2], [2, 17, '#ffb060', 2], [2, 4, '#ffb060', 2], [30, 17, '#ffb060', 2]],
    props: [].concat(each(RU1, 'R', (x, y) => ({ at: [x, y], prop: 'rock', col: '#d8bc84', scale: [1.5, 0.8, 1.4] })),
      PLATES.map(P => ({ at: P.at, prop: 'disc', r: 0.42, h: 0.03, col: '#6a5a3a', top: '#b8a070' })),
      [{ at: [16, 1], prop: 'none' }, { at: [16, 10], prop: 'statue', col: '#c8b488', col2: '#9a8866' }, { at: [17, 10], prop: 'statue', col: '#c8b488', col2: '#9a8866' }]),
    labels: PLATES.map(P => ({ at: P.at, text: P.n, size: 0.2, col: '#4a3a20', y: 0.04 }))
      .concat([{ at: [16.5, 3], face: 's', text: 'GATE OF SANDS', size: 0.13, col: '#5a4a2a', y: 2.0, off: -0.25 }]),
    entries: { from_sandsea: [16, 23, 'up'], from_ruins2: [32, 11, 'left'], from_route9: [16, 3, 'down'] },
    exits: [
      { at: [13, 24, 8, 1], to: 'kp_sandsea', entry: 'from_ruins' },
      { at: [33, 10, 1, 2], to: 'kp_ruins_2', entry: 'from_ruins1', if: s => s.flag('kp_ruins_door'), blocked: function* (s) { yield s.msg('A heavy stone slab seals the way east.'); } },
      { at: [16, 1, 2, 1], to: 'kp_route9', entry: 'from_ruins', if: s => s.flag('kp_ruins_northdoor'), blocked: northDoor },
    ],
    npcs: [ru.kip.npc, ru.grunt0.npc],
    objects: [].concat(
      [16, 17].map(x => Object.assign(W.barrier('ru_north' + x, [x, 2], () => flag('kp_ruins_northdoor'), SLAB, { dir: 'down' }), { talk: northDoor })),
      [10, 11].map(y => Object.assign(W.barrier('ru_inner' + y, [32, y], () => flag('kp_ruins_door'), SLAB, { dir: 'left' }),
        { talk: function* (s) { if (!s.flag('kp_ruins_door')) yield s.msg('A heavy stone slab seals the way east. There is no handle, no keyhole... only a carving of four stones in a row.'); } })),
      PLATES.map((P, i) => ({ id: 'ru_flame' + i, at: P.urn, model: { prop: 'flames', col: '#ff9a40', size: 0.8 }, hover: 0.55, solid: false, hidden: true, tick(ob) { ob.hidden = !pressed(i) && !flag('kp_ruins_door'); } }))),
    items: [W.item('ru1_spell', [9, 4], 'spell_nut', 2), W.item('ru1_maxoil', [21, 4], 'max_oil', 1)],
    triggers: [ru.kip.trig, ru.grunt0.trig].concat(
      PLATES.map((P, i) => ({ id: 'ru_plate' + i, at: [P.at[0], P.at[1], 1, 1], once: false, if: s => !s.flag('kp_ruins_door'), run: plateStep(i) })),
      [{ at: [16, 10, 2, 1], on: 'talk', run: function* (s) { yield s.msg('Two weathered statues hold up a stone tablet between them:\f"Four stones guard the inner door.\nTread them as the ancients counted,\nand the way shall open."'); } },
        W.hidden('ru1_statue', [32, 15], 'boost_timemage')]),
  });

  // ------------------------------------------------------------------ the Wrapmog's Tomb: Heidegger
  const RU2 = [
    "##############################",
    "##############uu##############",
    "##########m__DDDD__m##########",
    "##########_B_DDDD_B_##########",
    "##########________B_##########",
    "##########__________##########",
    "##########m________m##########",
    "##########muu^^^^uum##########",
    "##########...^^^^...##########",
    "#########............#########",
    "##.....m..|........|..m.....##",
    "##.DD....................DD.##",
    "##u...........ss............##",
    "##........|..sRRs..|.......u##",
    "##.DD.........ss.........DD.##",
    "##.....m....................##",
    "#########.|........|..m.....##",
    "         ............#########",
    "#########............#########",
    ":::::::^^.|........|.#########",
    ":::::::^^............#########",
    "#########............#########",
    "##############################",
    "##############################",
  ];
  const RU2H = [].concat(rows(1, 30, '0'), rows(1, 30, '0', [[14, 0, '3'], [15, 0, '3']]), rows(5, 30, '0', [10, 11, 12, 13, 14, 15, 16, 17, 18, 19].flatMap(x => [0, 1, 2, 3, 4].map(y => [x, y, '3']))),
    ['000000000033322223330000000000', '000000000000011110000000000000'], rows(10, 30, '0'), rows(2, 30, '0', [0, 1, 2, 3, 4, 5, 6].flatMap(x => [[x, 0, '4'], [x, 1, '4']]).concat([[7, 0, '3'], [7, 1, '3'], [8, 0, '1'], [8, 1, '1']])), rows(3, 30, '0'));
  const heid = W.trainer({ id: 'ru_heidegger', cls: 'Team Hojo Admin', name: 'Heidegger', model: 'heidegger', at: [14, 5], dir: 'down', music: 'fullscale', bg: 'ruins',
    line: "Gya-ha-ha-ha! A tiny trainer, all the way down here in the dark? The Professor will be DELIGHTED.\fThis tomb's treasure is ours, and your moogles will make splendid specimens! Gya-ha-ha!",
    lose: "Gyaaah! My crack troops! Flattened by a child with a backpack full of fluff!",
    after: "Gya... hmph.",
    team: [['gunmog_gun_arm', 21], ['darkmog_knight', 22], ['grumog_viking', 22], ['embermog_archmage', 23]], money: 1500 });
  function* heideggerScene(s) {
    if (s.flag('kp_ru_heid_done')) return;
    if (!s.flag('kp_tr_ru_heidegger')) yield* heid.npc.talk(s);
    if (!s.flag('kp_tr_ru_heidegger')) return;
    yield s.say('Heidegger', "Gya... gya-ha... HMPH! Keep your dusty old tomb, then!\fThe Professor's real work is waiting at our tower in Skyport. You'll never get past THAT, brat! Team Hojo, fall back!");
    yield s.move('ru_heidegger', [[14, 9], [9, 19]]);
    s.remove('ru_heidegger'); s.remove('ru_grunt1'); s.remove('ru_grunt2');
    s.set('kp_ru_heid_done');
    yield s.msg('Something clattered to the floor as Heidegger ran...');
    s.set('kp_ruins_key'); s.sfx('found');
    yield s.msg("Found the Ruins' Key!\nAn old stone key, carved in the shape of a moogle's pom-pom.");
    s.shake(3, 40); s.sfx('gate');
    yield s.msg('Behind you, the great sarcophagus lid shifts with a deep, grinding scrape...');
  }
  const ru2 = {
    g1: W.grunt({ id: 'ru_grunt1', name: 'Grunt', at: [12, 20], dir: 'left', sight: [9, 19, 3, 2], show: s => !s.flag('kp_ru_heid_done'),
      line: "Intruder in the tomb! Halt, in the name of science!",
      lose: "Ack! Admin Heidegger's going to yell at me. Again.",
      team: [['dunemog_nomad', 20], ['nutmog_treasure_hunter', 21]], money: 840 }),
    g2: W.grunt({ id: 'ru_grunt2', name: 'Grunt', at: [17, 15], dir: 'left', sight: [11, 15, 8, 1], show: s => !s.flag('kp_ru_heid_done'),
      line: "We've been digging for three days! Sand in my shoes, sand in my lunch... and now YOU. Battle!",
      lose: "Sand in my shoes AND a loss. Worst. Expedition. Ever.",
      team: [['tickmog_time_mage', 21], ['embermog_sorcerer', 21]], money: 840 }),
  };
  FF7.defineMap('kp_ruins_2', {
    name: "Sunken Ruins - Wrapmog's Tomb", area: 'Sunken Ruins', theme: 'temple', music: 'temple', kpWild: 'kp_ruins', kpBg: 'ruins', kpCave: true,
    look: Object.assign({}, RUINS_LOOK, { floor3: ['#6a5a40', '#625238'], ambient: [0.36, 0.33, 0.3], fog: { color: [0.05, 0.04, 0.03], near: 7, far: 20 } }),
    grid: RU2, heights: RU2H,
    lights: [[14, 13, '#fff0c8', 3.5], [10, 6, '#ff9a40', 2.2], [19, 6, '#ff9a40', 2.2], [7, 15, '#ff9a40', 2], [22, 16, '#ff9a40', 2]],
    props: [].concat(each(RU2, 'D', (x, y) => ({ at: [x, y], prop: 'counter', col: '#9a8866', col2: '#b8a47e' })),
      [{ at: [14, 13], prop: 'rock', col: '#d8bc84', scale: [1.4, 0.9, 1.3] }, { at: [15, 13], prop: 'rock', col: '#d8bc84', scale: [1.4, 0.9, 1.3] },
        { at: [14.5, 13], to: [14.5, 12.9], h: 6, h2: 0.4, sag: 0, r: 0.02, count: 1, col: '#8a6a40' },
        { at: [11, 3], col: '#7a5a3a' }, { at: [18, 3], col: '#7a5a3a' }, { at: [18, 4], col: '#7a5a3a' }]),
    entries: { from_ruins1: [1, 19, 'right'] },
    exits: [{ at: [0, 19, 1, 2], to: 'kp_ruins_1', entry: 'from_ruins2' }],
    npcs: [ru2.g1.npc, ru2.g2.npc,
      Object.assign({}, heid.npc, { show: s => !s.flag('kp_ru_heid_done'), talk: heideggerScene }),
      W.legend('ru_wrapmog', 'wrapmog_tomb_guard', { at: [15, 4], dir: 'down', lv: 24, bg: 'ruins', scale: 1.05, show: s => s.flag('kp_ru_heid_done'),
        intro: "The Wrapmog has climbed out of its sarcophagus, trailing bandages. It doesn't look happy to be awake!" }),
    ],
    items: [W.item('ru2_golden', [5, 12], 'golden_nut', 3), W.item('ru2_battery', [24, 13], 'battery', 1)],
    triggers: [ru2.g1.trig, ru2.g2.trig,
      { id: 'see_ru_heid', at: [13, 6, 4, 1], once: false, if: s => !s.flag('kp_ru_heid_done'), run: heideggerScene },
      { at: [13, 2, 4, 2], on: 'talk', run: function* (s) { yield s.msg(s.flag('kp_ru_heid_done') ? 'The great sarcophagus stands open. It smells of old spices and older dust.' : 'A great stone sarcophagus covered in carvings of moogles. Fresh shovel marks scar the lid.'); } },
      W.hidden('ru2_coffin', [3, 14], 'leftover_nut'),
    ],
  });

  // ================================================================== ROUTE 9
  // The badlands north of the ruins: out of the old stone door, the dry canyon road winds between two red mesas (each
  // climbed by steps, each with a ledge back down), past a broken-down wagon and through cactus patches and
  // wind-carved hoodoos, to the cliff below Skyport: up the switchback stairs, along the ledge, up again to the top.
  KP.WILD.kp_route9 = [['orbmog_oracle', 19, 20, 21], ['orbmog_seer', 3, 22, 23], ['callmog_caller', 20, 20, 23], ['kitemog_flier', 20, 20, 21], ['dunemog_raider', 12, 21, 22],
    ['cactumog_guard', 10, 20, 22], ['grumog_berserker', 7, 20, 21], ['grumog_viking', 3, 22, 23], ['chocomog_rider', 6, 20, 21]];
  const R9 = [
    "      .................             ",
    "     .........R.........            ",
    "    ..........!..........           ",
    "   .R^^R.......................     ",
    "   .R^^R........................    ",
    "   .....R...............R.......    ",
    "    ............................    ",
    "     ...........................    ",
    "      ....................R^^R..    ",
    "    .....U..........U.....R^^R...   ",
    "   ..........R............ddd.....  ",
    "  ...U...............dddddd.......  ",
    "  ..............dddddd............  ",
    "  ..............dd.............U..  ",
    "  .............ddd................  ",
    "  R............dd................R  ",
    "  ....&........dd........GGGG&....  ",
    "  ..GGGG.......dd.......GGGGGG....  ",
    "  ..GGGGG......dd$$......GGGG...U.  ",
    "  ...GGG.......dd...RR............  ",
    "  .............dd...^^............  ",
    "  ......&..RR..dd...^^............  ",
    "  .........^^..dd...RR...&........  ",
    "  .........^^..dd.................  ",
    "  .........RR..dd................U  ",
    "  U..........GGGGGGG..............  ",
    "  ...........GGGGGGG..............  ",
    "  .G&GGGG.......dd.......GGGG&G...  ",
    "  GGGGG&GG......dd......GG&GGGGG..  ",
    "  .&GGGGG.......dd.R.....GGGGG&G..  ",
    "  ..G&GG...U....dd........G&GGR...  ",
    "   .............dd!...U..........   ",
    "      ..........dd............      ",
    "          ######dd#####             ",
  ];
  const R9H = [
    "000000888888888888888880000000000000",
    "000008888888888888888888000000000000",
    "000088888888888888888888800000000000",
    "000447744444444444444444444444400000",
    "000445544444444444444444444444440000",
    "000444444444444444444444444444440000",
    "000044444444444444444444444444440000",
    "000004444444444444444444444444440000",
    "000000000000000000000000000330000000",
    "000000000000000000000000000110000000",
    "000000000000000000000000000000000000",
    "000000000000000000000000000000000000",
    "000000000000000000000000000000000000",
    "000000000000000000000000000000000000",
    "000066666600000000000006666666600000",
    "000666666660000000000066666666660000",
    "000666666660000000000066666666660000",
    "000666666660000000000066666666660000",
    "000666666660000000000066666666660000",
    "000666666660000000000066666666660000",
    "000666666660000000002466666666660000",
    "000666666660000000002466666666660000",
    "000666666664200000000006666666660000",
    "000066666664200000000000666666600000",
    "000006666600000000000000066666000000",
    "000000000000000000000000000000000000",
    "000000000000000000000000000000000000",
    "000000000000000000000000000000000000",
    "000000000000000000000000000000000000",
    "000000000000000000000000000000000000",
    "000000000000000000000000000000000000",
    "000000000000000000000000000000000000",
    "000000000000000000000000000000000000",
    "000000000000000000000000000000000000",
  ];
  const r9 = {
    biker: W.trainer({ id: 'r9_rex', cls: 'Biker', name: 'Rex', model: { base: 'man', build: 'big', hairStyle: 'slick', hair: '#1a1a1a', top: '#2a2a2a', bottom: '#3a3a5a', extras: ['shades', 'coat', 'gloves'] },
      at: [13, 17], dir: 'right', sight: [14, 17, 3, 1],
      line: "My ride broke down out here, and so did my patience! Let's see if your moogles can rev their engines!",
      lose: "Total wipeout. Just like my bike.",
      after: "Wagon's broke, bike's broke, pride's broke. Good day all round.",
      team: [['grumog_viking', 22], ['gunmog_gun_arm', 21]], money: 880 }),
    skykid: W.trainer({ id: 'r9_tobi', cls: 'Sky Kid', name: 'Tobi', model: { base: 'kid', hairStyle: 'cap', top: '#e0a030', bottom: '#3a5a8a', extras: ['goggles'] },
      at: [26, 19], dir: 'left', sight: [22, 19, 4, 3],
      line: "Up here the wind is perfect for kite moogles! I'm gonna be a Skyport pilot someday. Watch this!",
      lose: "My kite... crashed. Again.",
      after: "From the mesa you can see the airship mast at Skyport! It's sooo tall!",
      team: [['kitemog_flier', 21], ['mogpost_cannoneer', 21]], money: 840 }),
    ace: W.trainer({ id: 'r9_dorian', cls: 'Ace Trainer', name: 'Dorian', model: { base: 'man', hairStyle: 'spikyback', hair: '#c8a040', top: '#a03030', bottom: '#2a2a2a', extras: ['coat'] },
      at: [6, 22], dir: 'right', sight: [7, 22, 3, 2],
      line: "Climbed all the way up here? Then you're my kind of trainer. Show me what four badges' worth looks like!",
      lose: "Hah! You've got Cid's badge written all over you already.",
      after: "Cid's dojo in Skyport is all launch pads and gaps. Look where you're flung before you fling!",
      team: [['callmog_caller', 22], ['lancemog_dragoon', 22], ['orbmog_oracle', 21]], money: 880 }),
    mystic: W.trainer({ id: 'r9_nell', cls: 'Mystic', name: 'Nell', model: { base: 'woman', hairStyle: 'longmessy', hair: '#8a5aa0', top: '#4a3a7a', bottom: '#2a2a4a', extras: ['robe', 'bangles'] },
      at: [18, 4], dir: 'down', sight: [17, 5, 3, 3],
      line: "The orbs foretold you'd climb this cliff... and that we'd battle. The orbs are never wrong. Mostly.",
      lose: "The orbs... did not foretell THAT.",
      after: "I see an airship, a tower, and a man who laughs at his own experiments. Be careful in Skyport.",
      team: [['orbmog_seer', 22], ['callmog_caller', 22], ['tickmog_chronomancer', 23]], money: 920 }),
  };
  FF7.defineMap('kp_route9', {
    name: 'Route 9', area: 'Route 9', theme: 'canyon', music: 'badlands', kpWild: 'kp_route9', kpBg: 'desert',
    look: { floor: ['#b47a4e', '#ac7448'], floor2: ['#b88a5a', '#b08252'], floorTex: { floor2: 'stone' }, grass: ['#8e8a4a', '#868244'],
      dirt: ['#8a5e3c', '#825636'], wallTop: '#9a5434', fog: { color: [0.88, 0.62, 0.42], near: 16, far: 40 } },
    legend: { '&': 'spire', U: 'spire' },
    grid: R9, heights: R9H,
    props: [].concat(each(R9, '&', CACTUS), each(R9, 'U', (x, y) => ({ at: [x, y], prop: 'spire', col: '#a85a36', h: 2.8 + hash(x, y) * 1.4, r: 0.8 + hash(y, x) * 0.3 })),
      [{ at: [17, 18], prop: 'wreck', vehicle: 'wagon', turn: 12, col: '#8a6a4a' }]),
    entries: { from_ruins: [16, 32, 'up'], from_skyport: [12, 1, 'down'] },
    exits: [
      { at: [16, 33, 2, 1], to: 'kp_ruins_1', entry: 'from_route9' },
      { at: [12, 0, 2, 1], to: 'kp_skyport', entry: 'from_route9' },
    ],
    npcs: [r9.biker.npc, r9.skykid.npc, r9.ace.npc, r9.mystic.npc,
      { id: 'r9_driver', name: 'Wagon Driver', model: { base: 'man', hairStyle: 'cap', top: '#6a8a5a', bottom: '#5a4a3a', extras: ['vest', 'beard'] }, at: [20, 18], dir: 'left',   // (a step back from the wagon: OK at the wagon searches it)
        talk: say('Wagon Driver', "Busted axle. I'm waiting for Skyport's tow-chocobo.\fBeen waiting two days. I think the chocobo's on strike.") },
    ],
    items: [W.item('r9_golden', [4, 19], 'golden_nut', 3), W.item('r9_horn', [29, 21], 'boost_summoner', 1), W.item('r9_hioil', [29, 5], 'hi_oil', 3)],
    triggers: [r9.biker.trig, r9.skykid.trig, r9.ace.trig, r9.mystic.trig,
      ledge([10, 15, 5], 'right', 2), ledge([22, 15, 4], 'left', 2),
      W.hidden('r9_wagon', [18, 18], 'max_oil'),
      W.sign([18, 31], 'ROUTE 9 - The Badlands\nNorth: Skyport, up the cliff road.   South: the Sunken Ruins.'),
      W.sign([14, 2], 'SKYPORT\nThe town where the sky begins.'),
    ],
  });

  // ================================================================== SKYPORT
  // An airship town on a cliff top: the runway along the north (lamps, windsocks, the control tower), the Mog Airship
  // moored to its mast, the Kupo-1 rocket on its raised launch pad, Cid's hangar (the Highwind Arcade, shuttered while
  // Team Hojo holds the town), the old weather tower Team Hojo took over (their HQ), the Mog Center and two houses.
  // Zack waits where the cliff road comes up (battle 7). The coast road east to Route 10 needs badge 4.
  const SK = [
    "        ............................        ",
    "     hh................................     ",
    "   ..hh..l.....l.....l.....l.............   ",
    "   ...--_______________________--........   ",
    "  .P..--_______________________--.......P.  ",
    "  ....--_______________________--.........  ",
    "  ....--_______________________--.........  ",
    "  .......l.....l.....l.....l......P.......  ",
    "  ........................................  ",
    "  .-_____-.oo.............................  ",
    "  ._______...hhhhhhhhhhhh.................  ",
    "  .__OOO__^..hhhhhhhhhhhh.MM.BB...........  ",
    "  .__OOO__^..hhhhhhhhhhhh.M..B.........BB.  ",
    "  .__OOO__...hhhhhhhhhhhh........hhhhhh...  ",
    "  ._______...hhhhhhhhhhhho.......hhhhhh...  ",
    "  .-_____-...hhhhh++hhhhh........hhhhhh...  ",
    "  ................::.............hhhhhh...  ",
    "  .........:::::::::::::::::::::.hhhhhh...  ",
    "  .........:::::::::::::::::::::.hh+hhh...  ",
    "  .hhhhhh.........::...............:......  ",
    "  .hhhhhh...BB....::....B..........:....P.  ",
    "  .hhhhhh........hhhhhh..hhhhhhB...:......  ",
    "   hh+hhh........hhhhhh..hhhhhh.o..:.....   ",
    "   ..............hhhhhh..hhhhhh....:.....   ",
    "   ..............hh+hhh..hh+hhh....:.....   ",
    "  .......:::::::::::::::::::::::::::::::::::",
    "  .......:::::::::::::::::::::::::::::::::::",
    "   ......::..........................o.!.   ",
    "     ....::...........................      ",
    "      ..!::..............                   ",
    "       ..::....                             ",
    "        .::..                               ",
  ];
  const SKH = [
    "00000000222222222222222222222222222200000000",
    "00000222222222222222222222222222222222200000",
    "00222222222222222222222222222222222222222200",
    "00222222222222222222222222222222222222222200",
    "00222222222222222222222222222222222222222200",
    "00222222222222222222222222222222222222222200",
    "00222222222222222222222222222222222222222200",
    "00222222222222222222222222222222222222222200",
    "00222222222222222222222222222222222222222200",
    "00244444442222222222222222222222222222222200",
    "00244444442222222222222222222222222222222200",
    "00244444443222222222222222222222222222222200",
    "00244444443222222222222222222222222222222200",
    "00244444442222222222222222222222222222222200",
    "00244444442222222222222222222222222222222200",
    "00244444442222222222222222222222222222222200",
    "00222222222222222222222222222222222222222200",
    "00222222222222222222222222222222222222222200",
    "00222222222222222222222222222222222222222200",
    "00222222222222222222222222222222222222222200",
    "00222222222222222222222222222222222222222200",
    "00222222222222222222222222222222222222222200",
    "00222222222222222222222222222222222222222200",
    "00222222222222222222222222222222222222222200",
    "00222222222222222222222222222222222222222200",
    "00222222222222222222222222222222222222222222",
    "00222222222222222222222222222222222222222222",
    "00022222222222222222222222222222222222222000",
    "00000222222222222222222222222222222222000000",
    "00000022222222222222222220000000000000000000",
    "00000002222222200000000000000000000000000000",
    "00000000222220000000000000000000000000000000",
  ];
  // Zack on the cliff road (battle 7)
  function* zackSkyport(s) {
    if (s.flag('kp_rival_zack_7')) return;
    s.emote('sk_zack', '!');
    yield s.face('sk_zack', 'player'); yield s.face('player', 'sk_zack');
    if (!s.flag('kp_sk_zack_met')) {
      s.set('kp_sk_zack_met');
      yield s.say('zack', "Cloud! Over here! You came across the badlands? Respect!");
      yield s.say('zack', "So get this: Team Hojo took over the old weather tower, right in the middle of town. And Cid shut his dojo till they're gone.\fHe says, and I quote, \"No lab coats sniffin' round my hangar!\"");
      yield s.say('zack', "But first, you and me. I've been training like crazy since Fernwick. Let's see who's grown more!");
    } else yield s.say('zack', "Round two! Or round eight? I lost count. Doesn't matter. Let's go!");
    const r = yield* W.rival(s, 'zack', 7, { lose: "Whoa... you really are something, Cloud.", win: "Ha! Gotcha this time!", bg: 'sky' });
    yield s.say('zack', (r === 'win' ? "Okay, okay, you're the real deal. My moogles are gonna need a long nap." : "Ha! Gotcha! Don't sweat it, buddy: you'll get me next time.") + "\fNow go kick Team Hojo out of that tower! I'll guard the door so none of 'em sneak out the front.");
    yield s.move('sk_zack', [[11, 25], [32, 25], [32, 20]]);
    yield s.face('sk_zack', 'right');
  }
  const ZACK_POST = function* (s) {
    if (s.flag('kp_hq_done')) { yield s.say('zack', "You did it! Hojo ran off, the moogles are free, and Cid's dojo is open. Heroes, Cloud. HEROES!\fGo get that badge. I'll catch up. I always do!"); return; }
    yield s.say('zack', "Nobody's getting out this door while I'm here! Up you go, Cloud. Hojo's on the top floor.");
  };
  const sk = {
    guard: W.grunt({ id: 'sk_grunt', name: 'Grunt', at: [36, 21], dir: 'left', sight: [35, 20, 1, 3], show: s => !s.flag('kp_hq_done'),
      line: "This tower is Team Hojo property now! Visitors must be screened. Screening is a battle. Good luck!",
      lose: "Screening... failed. For me.",
      after: "Go on in. The Professor's upstairs. He loves visitors. They hardly ever come back down.",
      team: [['gunmog_gunner', 20], ['chemmog_alchemist', 21]], money: 880 }),
  };
  const WINDSOCK = (x, y) => [{ at: [x, y], prop: 'pylon', h: 2.7, w: 0.3, top: 0.14, col: '#d8d8d0', lamp: '#ff5040' },
    { at: [x + 0.35, y], prop: 'banner', col: '#f07020', col2: '#f4f0e8', w: 0.6, h: 0.32, y: 2.55 }];
  FF7.defineMap('kp_skyport', {
    name: 'Skyport', area: 'Skyport', theme: 'rocket', music: 'cid', kpBg: 'sky',
    look: { floor: ['#8a7a62', '#82725a'], floor2: ['#8e8e92', '#86868a'], floor3: ['#4a4a50', '#46464c'], roof: '#3e3632', wallTop: '#3e3632',
      trim: '#e6e4da', window: '#7a8c96', floorTex: { floor: 'dirt', floor2: 'concrete', floor3: 'concrete' }, fog: { color: [0.66, 0.76, 0.88], near: 16, far: 40 }, clouds: true },
    legend: { P: 'pylon', O: 'block', M: 'tank' },
    grid: SK, heights: SKH,
    buildings: [
      { at: [13, 10, 12, 6], h: 3.2, top: 'gable', ridge: 'x', rise: 1.3, tin: true, roof: '#8a8a92', col: '#9a9aa0' },
      { at: [33, 13, 6, 6], h: 6.2, top: 'flat', col: '#7a8890', roof: '#4a5058', tex: 'panel' },
      { at: [5, 1, 2, 2], h: 4.2, top: 'hip', rise: 0.6, col: '#d0c8b8', roof: '#a83a30' },
      { at: [17, 21, 6, 4], h: 2.4, top: 'gable', ridge: 'x', rise: 1.0, roof: '#b8484e', tex: 'siding', col: '#c8b8a0' },
      { at: [3, 19, 6, 4], h: 2.1, top: 'gable', ridge: 'x', rise: 1.1, roof: '#3e3632', tex: 'siding', col: '#a89878' },
      { at: [25, 21, 6, 4], h: 2.1, top: 'gable', ridge: 'z', rise: 1.0, roof: '#4a3e36', tex: 'siding', col: '#b0a080' },
    ],
    props: [].concat(WINDSOCK(3, 4), WINDSOCK(34, 7), WINDSOCK(40, 20),
      [{ at: [6, 12], vehicle: 'rocket_26', scale: 0.5 },
        { at: [40, 4], prop: 'pylon', h: 4.6, w: 1.0, top: 0.45, col: '#8a4a2e', lamp: '#ff4040' },
        { at: [36, 1.5], vehicle: 'highwind', scale: 1.5, rot: -90, lift: 2.6 },
        { at: [26, 11], prop: 'tank', col: '#c8c0a0', text: '1' }, { at: [27, 11], prop: 'tank', col: '#c8c0a0', text: '2' }, { at: [26, 12], prop: 'tank', col: '#a8b0b8', text: '3' },
        { at: [34, 18], prop: 'banner', col: '#2e5e3e', col2: '#c8e0b8', text: 'HOJO', textCol: '#d8f0c8', h: 1.5, y: 3.4, w: 0.9 },
        { at: [37, 18], prop: 'banner', col: '#2e5e3e', col2: '#c8e0b8', text: 'HOJO', textCol: '#d8f0c8', h: 1.5, y: 3.4, w: 0.9 }]),
    labels: [{ at: [19, 4.5], text: 'SKYPORT', size: 0.62, col: '#e8e4d8', y: 0.01 },
      { at: [18.5, 15], face: 's', off: 0.25, text: 'HIGHWIND ARCADE', size: 0.2, col: '#f0c040', y: 2.6 },
      { at: [19, 24], face: 's', off: 0.25, text: 'MOG CENTER', size: 0.14, col: '#e05a7a', y: 1.85 }],
    entries: { from_route9: [9, 30, 'up'], from_route10: [42, 25, 'left'], from_center: [19, 25, 'down'], from_house1: [5, 23, 'down'],
      from_house2: [27, 25, 'down'], from_dojo: [18, 16, 'down'], from_hq: [35, 19, 'down'] },
    exits: [
      { at: [8, 31, 5, 1], to: 'kp_route9', entry: 'from_skyport' },
      Object.assign({ at: [43, 25, 1, 2], to: 'kp_route10', entry: 'from_skyport' },
        W.gate(4, 'Coast Guard', "Halt! The coast road's for trainers with four badges or more. Captain Cid's orders.\fWin his Wind Badge and I'll wave you through!")),
      { at: [19, 24, 1, 1], to: 'kp_skyport_center', entry: 'from_town', sfx: 'door' },
      { at: [5, 22, 1, 1], to: 'kp_skyport_house1', entry: 'from_town', sfx: 'door' },
      { at: [27, 24, 1, 1], to: 'kp_skyport_house2', entry: 'from_town', sfx: 'door' },
      { at: [18, 15, 2, 1], to: 'kp_skyport_dojo', entry: 'from_town', sfx: 'door', if: s => s.flag('kp_hq_done'),
        blocked: function* (s) { yield s.msg('The hangar shutters are down and padlocked.'); } },
      { at: [35, 18, 1, 1], to: 'kp_hojo_hq_1', entry: 'from_town', sfx: 'door_shinra' },
    ],
    npcs: [sk.guard.npc,
      { id: 'sk_zack', name: 'Zack', model: 'zack', at: [11, 27], dir: 'left', show: s => !s.flag('kp_rival_zack_7'), talk: zackSkyport },
      { id: 'sk_zack2', name: 'Zack', model: 'zack', at: [32, 20], dir: 'right', show: s => s.flag('kp_rival_zack_7') && !s.flag('kp_badge_4'), talk: ZACK_POST },
      { id: 'sk_shera', name: 'Shera', model: 'shera', at: [20, 16], dir: 'down',
        talk: function* (s) {
          if (s.flag('kp_hq_done')) { yield s.say('Shera', "The dojo's open again! The Captain's waiting inside. He's been pacing for an hour.\fHe'll never say it, but he's very grateful. ...So I'm saying it for him. Thank you."); return; }
          yield s.say('Shera', "I'm sorry, the Highwind Arcade is closed. Team Hojo took over the old weather tower across the square, and the Captain refuses to open while they're in town.\fIf someone chased them out of that tower... well. I think he'd open the doors in a heartbeat.");
        } },
      { id: 'sk_mechanic', name: 'Mechanic', model: { base: 'man', hairStyle: 'cap', top: '#4a5a7a', bottom: '#4a5a7a', extras: ['gloves', 'goggles'] }, at: [8, 16], dir: 'up',
        talk: say('Mechanic', "That's the Kupo-1. Captain Cid's been tinkering with her for ten years.\fWhen will she fly? \"When she's darn well ready,\" he says. Every single morning.") },
      { id: 'sk_pilot', name: 'Pilot', model: { base: 'woman', hairStyle: 'bob', top: '#7a5a3a', bottom: '#4a4a3a', extras: ['coat', 'goggles'] }, at: [38, 6], dir: 'up',
        talk: say('Pilot', "The Mog Airship rides that mast like a kite on a string. On clear days we take her up over the clouds.\fThe Kitemogs follow us the whole way, showing off.") },
      { id: 'sk_oldwoman', name: 'Old Woman', model: 'oldwoman4', at: [15, 25], dir: 'up',
        talk: function* (s) {
          if (s.flag('kp_hq_done')) { yield s.say('Old Woman', "My neighbor's moogle came home! Hopped right onto her bed and fell asleep. That scientist fellow will think twice before coming back here."); return; }
          yield s.say('Old Woman', "Those Team Hojo people took my neighbor's moogle! And the weather tower clock hasn't worked since they moved in.\fThat old professor with the glasses gives me the shivers. He giggles. Constantly.");
        } },
      { id: 'sk_kid', name: 'Boy', model: 'kid6', at: [24, 8], dir: 'down', wander: 2,
        talk: say('Boy', "The windsocks tell you which way the wind's blowing! Cid says a good pilot always checks them.\fI always forget. That's why my kite's in a tree.") },
      { id: 'sk_coast', name: 'Coast Guard', model: { base: 'man', hairStyle: 'cap', top: '#2a3a6a', bottom: '#2a2a3a', extras: ['belt'] }, at: [40, 24], dir: 'left',
        talk: function* (s) {
          if (KP.badgeCount() >= 4) { yield s.say('Coast Guard', "Four badges! The coast road east is all yours. Bloomhaven's down that way, past the beaches."); return; }
          yield s.say('Coast Guard', "This road runs east along the coast toward Bloomhaven. It's closed to trainers without four badges.");
        } },
      W.moogle('sk_mog1', 'kitemog_flier', [22, 9], { wander: 3, line: 'The Kitemog swoops low over the runway. Kupo-o-o!', show: s => !s.flag('kp_hq_done') }),
      W.moogle('sk_mog2', 'kitemog_flier', [12, 23], { line: 'The Kitemog is staring at the airship with big, dreamy eyes. Kupo...' }),
      W.moogle('sk_free1', 'tufty_freelancer', [14, 19], { show: s => s.flag('kp_hq_done'), line: 'A moogle freed from the tower! It bounces up and down. Kupo! Kupo!' }),
      W.moogle('sk_free2', 'mopluff_bard', [27, 17], { show: s => s.flag('kp_hq_done'), line: "The freed Mopluff hums a happy little tune. It's the first song it's sung in weeks." }),
      W.moogle('sk_free3', 'chocomog_rider', [30, 26], { show: s => s.flag('kp_hq_done'), line: 'The freed Chocomog is stretching its legs. Kupo-weh!' }),
    ],
    objects: [18, 19].map(x => Object.assign(W.barrier('sk_shutter' + x, [x, 15], () => flag('kp_hq_done'), { prop: 'cabinet', col: '#8a8a90', scale: 1.9 }, { dir: 'down' }),
      { talk: function* (s) { if (!s.flag('kp_hq_done')) yield s.msg('The hangar shutters are down and padlocked. A sign hangs on them:\n"CLOSED UNTIL THE LAB COATS LEAVE TOWN. - CID"'); } })),
    triggers: [sk.guard.trig,
      { id: 'sk_zack_scene', at: [8, 27, 4, 3], once: false, if: s => !s.flag('kp_rival_zack_7'), run: zackSkyport },
      W.hidden('sk_crate', [30, 12], 'royal_nut'),
      W.sign([8, 29], 'SKYPORT\nThe town where the sky begins.'),
      W.sign([39, 27], 'ROUTE 10 - East\nThe coast road to Bloomhaven.'),
    ],
  });
  W.mogCenter('kp_skyport_center', { name: 'Skyport Mog Center', town: 'kp_skyport', back: 'from_center', decor: 'metal', mart: MART_SKYPORT,
    npcs: [{ id: 'skc_pilot', name: 'Off-duty Pilot', model: 'man5', at: [8, 5], dir: 'left',
      talk: say('Off-duty Pilot', "The Mart here finally stocks Royal Kupo Nuts. Three times as tasty as the plain kind!\fA bit pricey. Then again, so is airship fuel.") }] });
  // the pilot's house: a retired flier's lucky nut
  W.house('kp_skyport_house1', { name: "Pilot's House", area: 'Skyport', town: 'kp_skyport', back: 'from_house1', decor: 'rustic',
    grid: ["############", "#k..F...q..#", "#..........#", "#.t.....b..#", "#.c......j.#", "#####+######"],
    npcs: [{ id: 'skh_oldpilot', name: 'Old Pilot', model: { base: 'oldman', hairStyle: 'short', hair: '#e0e0e0', top: '#6a4a2a', bottom: '#4a4a4a', extras: ['coat', 'goggles', 'mustache'] }, at: [5, 2], dir: 'down',
      talk: function* (s) {
        if (!s.flag('kp_sk_oldpilot')) {
          yield s.say('Old Pilot', "In my day we flew with a map, a compass and a Kitemog on each shoulder! Ha!\fHere. My good-luck nut from my very first flight. Never needed it. Never crashed. ...Well. Never crashed much.");
          s.set('kp_sk_oldpilot'); KP.give('royal_nut', 1); s.sfx('found');
          yield s.msg('Received a Royal Kupo Nut!');
          return;
        }
        yield s.say('Old Pilot', "Cid was the best student I ever had. Also the loudest. By a lot.");
      } }] });
  // the kite family's house
  W.house('kp_skyport_house2', { name: 'Kite House', area: 'Skyport', town: 'kp_skyport', back: 'from_house2', decor: 'cosy',
    npcs: [
      { id: 'skh_mom', name: 'Mother', model: 'woman10', at: [3, 2], dir: 'down',
        talk: say('Mother', "My son wants to be a test pilot like Captain Cid. I told him to start by keeping his kite out of the trees.\fHe's up to three trees a day now. Progress, I suppose.") },
      { id: 'skh_kitemog', name: 'Kitemog', model: { enemy: 'kp_kitemog_flier', scale: 0.8 }, at: [7, 3], dir: 'left', wander: 1,
        talk: function* (s) { yield s.msg('The family Kitemog is tangled in kite string again. It looks very proud of itself. Kupo!'); } },
    ] });

  // ------------------------------------------------------------------ the Highwind Arcade (Dojo 4: Cid, Dragoon)
  // Cid's hangar: steel platforms over the hangar pit, joined only by launch pads (hazard-striped tiles; an arrow on
  // each shows which way it flings you). Step on a pad and you're thrown to the platform it points at.
  //   Platforms: S start (south), A west, B centre, C east, D north-west, E north-east, F Cid's deck (north).
  //   Pads: S-west -> A, S-east -> C; A-north -> D, A-east -> B, A-corner -> S; B -> S; C-north -> E, C-corner -> S;
  //   D-east -> F, D-corner -> A; E-west -> B, E-corner -> C; F -> S (the way out).
  //   SOLUTION: S west pad [10,17] -> A; A north pad [4,12] -> D; D east pad [7,4] -> Cid's deck F; Cid [13,2].
  //   (C and E are optional: a Sky Pirate and a Quick Gear; B holds a Royal Kupo Nut.)
  const SD = [
    "############################",
    "#         .....OOO         #",
    "#         .....OOO         #",
    "# -.....  ........  ...... #",
    "# .....-  ........  -..... #",
    "# ......  .......-  ...... #",
    "# ......            ...... #",
    "# ......            .....- #",
    "#                          #",
    "#                          #",
    "#          -.....          #",
    "#          ......          #",
    "# ..-...   ......   ..-... #",
    "# .....-   ......   ...... #",
    "# ......            ...... #",
    "# ......            ...... #",
    "# -.....            .....- #",
    "#         -......-         #",
    "#         ........         #",
    "#         ........         #",
    "#         ........         #",
    "#############+##############",
  ];
  const SDH = [
    "0000000000000000000000000000",
    "0000000000666666660000000000",
    "0000000000666666660000000000",
    "0044444400666666660044444400",
    "0044444400666666660044444400",
    "0044444400666666660044444400",
    "0044444400000000000044444400",
    "0044444400000000000044444400",
    "0000000000000000000000000000",
    "0000000000000000000000000000",
    "0000000000033333300000000000",
    "0000000000033333300000000000",
    "0022222200033333300033333300",
    "0022222200033333300033333300",
    "0022222200000000000033333300",
    "0022222200000000000033333300",
    "0022222200000000000033333300",
    "0000000000222222220000000000",
    "0000000000222222220000000000",
    "0000000000222222220000000000",
    "0000000000222222220000000000",
    "0000000000000200000000000000",
  ];
  const SD_PADS = [
    [[10, 17], [5, 14]], [[17, 17], [22, 14]],
    [[4, 12], [4, 6]], [[7, 13], [13, 12]], [[2, 16], [12, 19]],
    [[11, 10], [14, 19]],
    [[22, 12], [22, 5]], [[25, 16], [15, 19]],
    [[7, 4], [11, 3]], [[2, 3], [3, 14]],
    [[20, 4], [12, 11]], [[25, 7], [23, 15]],
    [[17, 5], [13, 19]],
  ];
  const launch = ([at, to]) => ({ id: 'sd_pad_' + at[0] + '_' + at[1], at: [at[0], at[1], 1, 1], once: false, kpJump: to,
    run: function* (s) { s.sfx('alarm_short'); yield 8; yield s.jump('player', to[0], to[1], 1.7, 42); s.shake(1, 6); } });
  const padArrow = ([at, to]) => {
    const dx = to[0] - at[0], dy = to[1] - at[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    return { at: [at[0] + 0.001, at[1]], prop: 'floorarrow', path: [[-0.32 * ux, -0.32 * uy], [0.3 * ux, 0.3 * uy]], w: 0.12, col: '#f4f4f0' };
  };
  const sd = {
    wren: W.trainer({ id: 'sd_wren', cls: 'Pilot', name: 'Wren', model: { base: 'woman', hairStyle: 'bob', hair: '#c86a2a', top: '#5a6a3a', bottom: '#4a4a3a', extras: ['goggles', 'coat'] },
      at: [6, 16], dir: 'up', sight: [5, 13, 2, 3], noBag: true, bg: 'dojo',
      line: "Nice landing! ...Well, a landing. Before you fly any further, you'll have to get past me!",
      lose: "Grounded. Totally grounded.",
      after: "Read the arrows on the pads before you step on them. The Captain painted every one himself. Some of them on purpose.",
      team: [['kitemog_flier', 21], ['lancemog_dragoon', 22]], money: 880 }),
    gus: W.trainer({ id: 'sd_gus', cls: 'Mechanic', name: 'Gus', model: { base: 'man', build: 'fat', hairStyle: 'cap', top: '#4a5a7a', bottom: '#4a5a7a', extras: ['gloves', 'beard'] },
      at: [6, 6], dir: 'left', sight: [3, 6, 3, 1], noBag: true, bg: 'dojo',
      line: "I keep these pads tuned so they fling you exactly where they point. Mostly exactly. Let's see if you're tuned up too!",
      lose: "Well, slap my wrench. You're running smoother than my engines.",
      after: "The pad on the east edge goes straight to the Captain's deck. Good luck. He bites. Not literally. Usually.",
      team: [['gearmog_engineer', 22], ['kitemog_skydiver', 22]], money: 880 }),
    vex: W.trainer({ id: 'sd_vex', cls: 'Sky Pirate', name: 'Vex', model: { base: 'man', hairStyle: 'renotail', hair: '#2a2a2a', top: '#7a2a2a', bottom: '#2a2a2a', extras: ['vest', 'sash', 'bangles'] },
      at: [24, 14], dir: 'left', sight: [21, 14, 3, 2], noBag: true, bg: 'dojo',
      line: "Ahoy, landlubber! You've landed on the wrong platform, and the wrong platform's MINE!",
      lose: "Arr... shot down in flames.",
      after: "This side of the hangar's a scenic detour. Lovely view of the pit, though.",
      team: [['mogpirate_sky_pirate', 22], ['lancemog_dragoon', 22]], money: 880 }),
  };
  FF7.defineMap('kp_skyport_dojo', {
    name: 'Highwind Arcade', area: 'Skyport', theme: 'shinra', music: 'highwind', kpBg: 'dojo',
    look: { floor: ['#7a7c82', '#74767c'], wall: '#8a8a92', trim: '#3a3c44', floorTex: { floor: 'metal' }, sky: ['#06080c', '#141a24'],
      ambient: [0.5, 0.5, 0.54], light: [0.85, 0.84, 0.8], wallTex: { wall: 'corrugated' } },
    legend: { O: 'block' },
    grid: SD, heights: SDH,
    lights: [[13, 3, '#ffe0a0', 3], [4, 5, '#ffe0a0', 2.5], [22, 5, '#ffe0a0', 2.5], [4, 14, '#ffe0a0', 2.5], [22, 14, '#ffe0a0', 2.5], [13, 11, '#ffe0a0', 2.5], [13, 18, '#ffe0a0', 3]],
    props: SD_PADS.map(padArrow).concat([{ at: [16, 1.5], vehicle: 'tiny_bronco', scale: 0.55, rot: -90 },
      { at: [6, 0], prop: 'banner', col: '#2a4a8a', col2: '#f0c040', text: 'WIND', textCol: '#f0c040', h: 1.4, y: 2.6 },
      { at: [21, 0], prop: 'banner', col: '#2a4a8a', col2: '#f0c040', text: 'SKY', textCol: '#f0c040', h: 1.4, y: 2.6 }]),
    labels: [{ at: [13.5, 0], face: 's', text: 'HIGHWIND ARCADE', size: 0.22, col: '#f0c040', y: 2.4 }],
    entries: { from_town: [13, 20, 'up'] },
    exits: [{ at: [13, 21, 1, 1], to: 'kp_skyport', entry: 'from_dojo', sfx: 'door' }],
    npcs: [sd.wren.npc, sd.gus.npc, sd.vex.npc,
      W.master({ id: 'sd_cid', name: 'Cid', model: 'cid', at: [13, 2], badge: 4,
        team: [['kitemog_flier', 23], ['lancemog_dragoon', 24], ['wyrmog_rider', 24], ['kitemog_skydiver', 26]],
        intro: "So YOU'RE the kid who ran Hojo's creeps outta my town! ...Hmph. Don't think that buys you any slack!\fThis is the Highwind Arcade! Strap in, 'cause we're goin' up!",
        lose: "Well, I'll be... You fly better'n half my test pilots.",
        after: "Take the Wind Badge and get outta my hangar!\f...And, uh. Thanks. For the tower. Don't make it a whole thing.",
        reward: [['boost_dragoon', 1], ['royal_nut', 2]] }),
    ],
    items: [W.item('sd_royal', [15, 11], 'royal_nut', 1), W.item('sd_quick', [24, 4], 'quick_gear', 1)],
    triggers: [sd.wren.trig, sd.gus.trig, sd.vex.trig].concat(SD_PADS.map(launch)),
  });

  // ------------------------------------------------------------------ Team Hojo HQ (the old weather tower), three floors
  // 1F Lobby: a security fence splits the room; its shutters open from the terminal (by the desk, guarded).
  // 2F Laboratory: a row of cages full of stolen moogles; the lift to the top floor wants the Senior Scientist's keycard
  //   (beat him for it). 3F: Professor Hojo (Hojo battle 1). Beat him: he drops through a trapdoor, the cages spring
  //   open, the moogles go free (kp_hq_done) and Cid's hangar opens.
  const HQ_LOOK = { floor: ['#6a7a74', '#64746e'], floor2: ['#4a5a56', '#44544e'], floor3: ['#3a4a44', '#34443e'], wall: '#7a8a84', trim: '#2a3a34',
    mako: '#60ff90', sky: ['#020604', '#06100c'], ambient: [0.4, 0.46, 0.44], light: [0.66, 0.8, 0.74], floorTex: { floor: 'tiles', floor3: 'metal' } };
  const SHUTTER = { prop: 'cabinet', col: '#4a5a52', scale: 1.9 };
  const HQ1 = [
    "######################",
    "#q..y.....EE.....y..q#",
    "#....................#",
    "#....................#",
    "#=========..=========#",
    "#....................#",
    "#.DDD.........Z......#",
    "#....................#",
    "#..y..............y..#",
    "#....................#",
    "#..yy..........yy....#",
    "#q..................q#",
    "##########+###########",
  ];
  const HQ2 = [
    "########################",
    "#=.=.=.=.=.=.=.=.=..EE.#",
    "#=================.....#",
    "#......................#",
    "#.yy..M...ZZZ...M..yy..#",
    "#......................#",
    "#..DD....______....DD..#",
    "#........______........#",
    "#..DD....______....DD..#",
    "#......................#",
    "#.y..M.............M.y.#",
    "#......................#",
    "#EE....................#",
    "########################",
  ];
  const HQ3 = [
    "####################",
    "#yy.M..ZZZZZZ..M.yy#",
    "#....____________..#",
    "#y...____________.y#",
    "#....____________..#",
    "#.........^^.......#",
    "#..................#",
    "#.M..y........y..M.#",
    "#..................#",
    "#..................#",
    "#........EE........#",
    "####################",
  ];
  const HQ3H = [
    "00000000000000000000",
    "00000333333333333000",
    "00000333333333333000",
    "00000333333333333000",
    "00000333333333333000",
    "00000000002200000000",
    "00000000000000000000",
    "00000000000000000000",
    "00000000000000000000",
    "00000000000000000000",
    "00000000000000000000",
    "00000000000000000000",
  ];
  const hq1 = {
    g1: W.grunt({ id: 'hq1_grunt1', name: 'Grunt', at: [15, 6], dir: 'down', sight: [13, 7, 4, 2], show: s => !s.flag('kp_hq_done'),
      line: "Hands off the security terminal! Only authorized personnel may flip the big friendly switch!",
      lose: "Unauthorized... victory...",
      after: "Fine, flip the switch. It's not like I wanted to guard it. I wanted to guard the snack room.",
      team: [['gunmog_gun_arm', 21], ['chemmog_alchemist', 21]], money: 840 }),
    g2: W.grunt({ id: 'hq1_grunt2', name: 'Grunt', at: [5, 9], dir: 'right', sight: [6, 9, 6, 1], show: s => !s.flag('kp_hq_done'),
      line: "An intruder! In the lobby! On my shift! This is the worst day of my life!",
      lose: "...Okay, now THIS is the worst day of my life.",
      team: [['nutmog_treasure_hunter', 21], ['gearmog_engineer', 21]], money: 840 }),
  };
  FF7.defineMap('kp_hojo_hq_1', {
    name: 'Team Hojo HQ 1F', area: 'Skyport', theme: 'lab', music: 'infiltrate', kpBg: 'lab', look: HQ_LOOK,
    grid: HQ1,
    props: [{ at: [10.5, 0], prop: 'banner', col: '#2e5e3e', col2: '#c8e0b8', text: 'TEAM HOJO', textCol: '#d8f0c8', w: 2.4, h: 1.2, y: 2.6 }],
    labels: [{ at: [10.5, 12], face: 'n', text: 'SCIENCE NEEDS YOU', size: 0.14, col: '#a0e0b0', y: 2.2 }],
    entries: { from_town: [10, 11, 'up'], from_hq2: [10, 2, 'down'] },
    exits: [
      { at: [10, 12, 1, 1], to: 'kp_skyport', entry: 'from_hq', sfx: 'door_shinra' },
      { at: [10, 1, 2, 1], to: 'kp_hojo_hq_2', entry: 'from_hq1', sfx: 'elevator' },
    ],
    npcs: [hq1.g1.npc, hq1.g2.npc,
      { id: 'hq1_recept', name: 'Receptionist', model: { base: 'woman', hairStyle: 'bun', top: '#e8ece8', bottom: '#3a4a44', extras: ['labcoat', 'glasses'] }, at: [3, 5], dir: 'down', show: s => !s.flag('kp_hq_done'),
        talk: say('Receptionist', "Welcome to Team Hojo, where science never sleeps! Do you have an appointment?\f...No? Then you'll want to take a number. We're currently serving number... four. You are number nine hundred and twelve.") },
    ],
    objects: [Object.assign(W.toggle('hq1_term', [14, 6], 'kp_hq1_open', { once: true, sfx: 'beep',
        msg: 'SECURITY GATE: OPEN.\nThe shutters by the lift slide up with a hiss.', done: 'SECURITY GATE: OPEN.\nHave a scientific day!' }), {})]
      .concat([10, 11].map(x => Object.assign(W.barrier('hq1_shut' + x, [x, 4], () => flag('kp_hq1_open'), SHUTTER, { dir: 'down' }),
        { talk: function* (s) { if (!s.flag('kp_hq1_open')) yield s.msg('A security shutter. A sign reads: "LIFT ACCESS. Gate controls at the front desk terminal."'); } }))),
    triggers: [hq1.g1.trig, hq1.g2.trig],
  });
  // 2F: the cages
  const CAGED = [['tufty_freelancer', 2], ['mopluff_bard', 4], ['chocomog_rider', 6], ['farmmog_farmer', 8], ['nutmog_thief', 10], ['mossmog_geomancer', 12], ['angler_fisher', 14], ['stampo_monk', 16]];
  const hq2 = {
    sci: W.trainer({ id: 'hq2_sci', cls: 'Team Hojo Scientist', name: 'Senior Scientist', model: { base: 'scientist', extras: ['labcoat', 'glasses'] }, at: [18, 4], dir: 'left', sight: [13, 4, 5, 3],
      music: 'attackweapon', show: s => !s.flag('kp_hq_done'),
      line: "Hm? A test subject wandering loose? Back in your cage. ...Oh, you're not one of ours. Then you'll be one of ours SHORTLY.",
      lose: "My hypothesis... was wrong?! Impossible. I'll have to redo all my charts.",
      after: "Yes, yes, take the keycard. The Professor is upstairs. He hates being interrupted. I hope he interrupts YOU.",
      team: [['chemmog_alchemist', 22], ['gearmog_engineer', 22], ['orbmog_oracle', 21]], money: 920 }),
    g3: W.grunt({ id: 'hq2_grunt3', name: 'Grunt', at: [6, 11], dir: 'right', sight: [7, 11, 6, 1], show: s => !s.flag('kp_hq_done'),
      line: "Feeding time for the specimens is at three! You're early! And you're not a specimen! Battle!",
      lose: "I'm just here for the dental plan...",
      team: [['dunemog_raider', 21], ['puppetmog_puppeteer', 21]], money: 840 }),
  };
  FF7.defineMap('kp_hojo_hq_2', {
    name: 'Team Hojo HQ 2F', area: 'Skyport', theme: 'lab', music: 'infiltrate', kpBg: 'lab', look: HQ_LOOK,
    grid: HQ2,

    lights: [[2, 4, '#60ff90', 2], [20, 4, '#60ff90', 2], [2, 10, '#60ff90', 2], [21, 10, '#60ff90', 2]],
    entries: { from_hq1: [3, 12, 'right'], from_hq3: [20, 2, 'down'] },
    exits: [
      { at: [1, 12, 2, 1], to: 'kp_hojo_hq_1', entry: 'from_hq2', sfx: 'elevator' },
      { at: [20, 1, 2, 1], to: 'kp_hojo_hq_3', entry: 'from_hq2', sfx: 'elevator', if: s => s.flag('kp_tr_hq2_sci') || s.flag('kp_hq_done'),
        blocked: function* (s) { yield s.msg('The lift panel blinks red: "ACCESS: SENIOR STAFF ONLY. PLEASE PRESENT YOUR KEYCARD."'); } },
    ],
    npcs: [hq2.sci.npc, hq2.g3.npc].concat(CAGED.map(([sp, x]) => W.moogle('hq2_cage' + x, sp, [x, 1], { wander: 0, scale: 0.7, show: s => !s.flag('kp_hq_done'),
      line: `The caged ${KP.SPECIES[sp] ? KP.SPECIES[sp].moogle : 'moogle'} presses its nose to the bars and looks at you with huge, hopeful eyes.\nKupo...` }))),
    triggers: [hq2.sci.trig, hq2.g3.trig].concat(CAGED.map(([sp, x]) => ({ at: [x, 2], on: 'talk', run: function* (s) {
      if (s.flag('kp_hq_done')) { yield s.msg('The cage is empty. Its door hangs wide open.'); return; }
      yield s.msg(`The caged ${KP.SPECIES[sp] ? KP.SPECIES[sp].moogle : 'moogle'} presses its nose to the bars and looks up at you with huge, hopeful eyes.\nKupo...`);
    } }))).concat([
      { at: [10, 4, 3, 1], on: 'talk', run: function* (s) { yield s.msg(s.flag('kp_hq_done') ? 'The monitors are dark. Someone has taped a drawing of a happy moogle over one of them.' : 'The monitors scroll with numbers: "SPECIMEN POM-POM LUMINOSITY: 3.7 KUPOS. SUBJECT MOOD: GRUMPY."'); } }]),
  });
  // 3F: Hojo
  const hojo = W.trainer({ id: 'hq_hojo', cls: 'Team Hojo Boss', name: 'Hojo', model: 'hojo', at: [10, 3], dir: 'down', music: 'makocannon',   // (Hojo: The Makou Cannon Is Fired, his fight atop the Sister Ray) bg: 'lab', ai: 'smart',
    line: "Kukuku... A visitor! And you've brought specimens. How very thoughtful.\fDo you know what makes a moogle's pom-pom glow? No? Neither do I. YET. Kukukuku!\fNow hold still. This won't hurt. Much. Probably.",
    lose: "Hmm. Disappointing. No... FASCINATING! Your bond with them skewed every one of my readings!",
    after: "Kukuku...",
    team: [['chemmog_alchemist', 22], ['puppetmog_puppeteer', 22], ['orbmog_seer', 22], ['gearmog_engineer', 22], ['wyrmog_rider', 23]], money: 2200 });
  function* hojoScene(s) {
    if (s.flag('kp_hq_done')) return;
    if (!s.flag('kp_tr_hq_hojo')) yield* hojo.npc.talk(s);
    if (!s.flag('kp_tr_hq_hojo')) return;
    yield s.say('Hojo', "Kukuku... A setback. A teeny, tiny setback.\fKeep your little fluffballs. I've taken every measurement I need. My real work lies elsewhere...\fThe Lifestream, boy. The Lifestream holds secrets far juicier than this dusty weather tower. Kukukuku!");
    yield s.msg('Hojo pulls a lever on the console...');
    s.sfx('door_shinra'); s.flash('#ffffff', 8, 0.6);
    s.remove('hq_hojo');
    yield s.msg('...and drops through a trapdoor in the floor! It snaps shut behind him.');
    s.set('kp_hq_done'); s.sfx('gate'); s.shake(2, 30);
    yield s.msg("Somewhere below, cage doors clang open, one after another!\fThe stolen moogles pour out of the tower and into the streets of Skyport, kupo-ing with joy.");
    yield s.msg('Team Hojo is fleeing Skyport! Cid\'s hangar should open now.');
  }
  FF7.defineMap('kp_hojo_hq_3', {
    name: 'Team Hojo HQ 3F', area: 'Skyport', theme: 'lab', music: s => s.flag('kp_hq_done') ? 'infiltrate' : 'nightmare', kpBg: 'lab', look: Object.assign({}, HQ_LOOK, { floor3: ['#3a4440', '#343e3a'] }),
    grid: HQ3, heights: HQ3H,

    lights: [[1, 1, '#60ff90', 2.5], [18, 1, '#60ff90', 2.5], [1, 3, '#60ff90', 2], [18, 3, '#60ff90', 2], [10, 3, '#a0ffc0', 3]],
    entries: { from_hq2: [9, 9, 'up'] },
    exits: [{ at: [9, 10, 2, 1], to: 'kp_hojo_hq_2', entry: 'from_hq3', sfx: 'elevator' }],
    npcs: [Object.assign({}, hojo.npc, { show: s => !s.flag('kp_hq_done'), talk: hojoScene })],
    triggers: [{ id: 'see_hq_hojo', at: [8, 5, 4, 2], once: false, if: s => !s.flag('kp_hq_done'), run: hojoScene },
      { at: [1, 1, 2, 1], on: 'talk', run: function* (s) { yield s.msg('A specimen tank full of glowing green liquid. A label reads: "PROJECT J - PRELIMINARY." It bubbles ominously.'); } }],
  });

})();
