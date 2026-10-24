// Kupomon, region 2 (docs/KUPOMON_WORLD.md "Region 2", Lv 10-18): Route 4 (the sea cliffs, the lighthouse, the cove),
// Fernwick (the treehouse village; Zack's 4th battle), Route 5 (foothills, the waterfall, the miner's shack), the Mt. Kupo
// Caves (two floors; Team Hojo's Admin Scarlet digging for mako crystals), Cogsworth (the terraced mining town; Sephiroth's
// 5th battle in the mine yard; Dojo 2, Barret's Gun-Arm Arcade), Route 6 (farmland, the windmill) and Mogfield (the
// ranch town; the Kupo Ranch's breeding). Dialogue in our own words.
(function () {
  const KP = FF7.kupomon, W = KP.W;
  // a one-way ledge (KP.W.ledge), remembering its shape (for map checks)
  const ledge = (at, dir, drop) => Object.assign(W.ledge(at, dir, drop), { ledge: { at, dir, drop } });
  const say = (who, text) => function* (s) { yield s.say(who, text); };
  // a cable strung between two tiles: rope-bridge hand ropes, washing lines, bunting
  const rope = (a, b, h = 0.85, o = {}) => Object.assign({ at: a, to: b, h, h2: o.h2 != null ? o.h2 : h, sag: 0.22, col: '#8a6a40', r: 0.016, count: 1 }, o);
  // a rope bridge's two hand ropes and four posts: x0/x1 the ropes' x (between tiles), y0/y1 the anchor rows (or along x)
  const ropeBridge = (x0, x1, y0, y1, o = {}) => {
    const post = (x, y) => ({ at: [x, y], prop: 'stump', scale: [0.45, 2.4, 0.45], col: '#6a4a2a' });
    return [rope([x0, y0], [x0, y1], 0.85, o), rope([x1, y0], [x1, y1], 0.85, o), post(x0, y0), post(x1, y0), post(x0, y1), post(x1, y1)];
  };
  const ropeBridgeX = (x0, x1, y0, y1, o = {}) => {
    const post = (x, y) => ({ at: [x, y], prop: 'stump', scale: [0.45, 2.4, 0.45], col: '#6a4a2a' });
    return [rope([x0, y0], [x1, y0], 0.85, o), rope([x0, y1], [x1, y1], 0.85, o), post(x0, y0), post(x1, y0), post(x0, y1), post(x1, y1)];
  };

  // Wild tables: each route's or cave's own (KP.WILD, [species, weight, min Lv, max Lv]), from the Kupodex's "Where" column.

  // ================================================================== Route 4: the Seaspray Cliffs
  // North from Kurotsuki along the coast: a meadow terrace, a rope bridge over the first inlet, the lighthouse point
  // (a one-way ledge drops into the cove below it; stairs climb back up), a second rope bridge over a sea gorge, and the
  // pine woods that hide Fernwick.
  KP.WILD.kp_route4 = [['seamog_sailor', 30, 10, 13], ['angler_fisher', 20, 10, 12], ['mogpirate_pirate', 17, 11, 13],
    ['chocomog_rider', 15, 10, 13], ['mogpost_ranger', 12, 10, 12], ['chatmog_mediator', 6, 11, 13]];
  const R4 = {
    flint: W.trainer({ id: 'kp_r4_flint', cls: 'Youngster', name: 'Flint', model: 'kid3', at: [15, 29], dir: 'left', sight: [12, 29, 3, 1],
      line: "Arr! I'm the terror of the Seaspray Cliffs! ...My mom says I can be a pirate after lunch.", lose: 'Shiver me pom-poms...',
      after: "One day I'll have a ship. A real one. With a moogle in the crow's nest.", team: [['nutmog_thief', 11], ['mogpirate_pirate', 12]], money: 480 }),
    bosun: W.trainer({ id: 'kp_r4_bosun', cls: 'Sailor', name: 'Bosun', model: 'sailor', at: [16, 11], dir: 'down', sight: [16, 12, 1, 2],
      line: "Ahoy! Thirty years at sea, and I've never met a landlubber who could beat my crew!", lose: 'Well, blow me down. Make that thirty years and one.',
      after: 'The lighthouse keeper up on the point knows every moogle on this coast. Go say hello.', team: [['seamog_sailor', 12], ['angler_fisher', 11], ['seamog_sailor', 12]], money: 480 }),
    sandy: W.trainer({ id: 'kp_r4_sandy', cls: 'Beachcomber', name: 'Sandy', model: 'girl3', at: [27, 20], dir: 'left', sight: [19, 20, 8, 1],
      line: "Shh! The tide's out and the moogles are napping in the rock pools. ...Oh, well, since you're here!", lose: 'Ack, sand in my pom-pom!',
      after: "You jumped down the ledge, right? The stairs by the inlet take you back up. Everybody forgets that.", team: [['mopluff_bard', 11], ['seamog_sailor', 13]], money: 520 }),
    wade: W.trainer({ id: 'kp_r4_wade', cls: 'Fisher', name: 'Wade', model: 'oldman2', at: [13, 4], dir: 'left', sight: [9, 4, 4, 1],
      line: 'Hold it! You scared off a whopper. The least you can do is battle me.', lose: "Hah! That one got away too.",
      after: "The gorge down there's deep. Folks say a moogle pirate hid his loot somewhere along these cliffs.", team: [['angler_fisher', 12], ['angler_fisher', 12], ['seamog_sailor', 13]], money: 520 }),
  };
  FF7.defineMap('kp_route4', {
    name: 'Route 4', area: 'Route 4', theme: 'beach', music: 'costadelsol', kpWild: 'kp_route4', kpBg: 'beach',
    look: { grass: ['#5a8c3a', '#548636'], floor: ['#5a8c3a', '#548636'], floorTex: { floor: 'grass' }, wall: '#9a8e78', dirt: ['#a08a62', '#98825a'], water: '#2a7ab8' },
    grid: [
      "TTTTTTTTdddTTTTTTTTT~~~~~~~~~~~~~~~~",
      "TTTT,,,,ddd,,%TTT,,,,~~~~~~~~~~~~~~~",
      "TTT,,GGGGdd,,,,,,,,,,,~~~~~~~~~~~~~~",
      "TTT,GGGGGGGGG,%,,,G,,,R~~~~~~~~~~~~~",
      "TT%,,GGGGdd,,,,,,GGG,,,~~~~~~~~~~~~~",
      "TTT,,,,,,dd,,fR,,GG,,,~~~~~~~~~~~~~~",
      "TTTT,,,,,dd,,,,,,,,,,~~~~~~~~~~~~~~~",
      "TTTTT~~~~KK~~~~~~~~~~~~~~~~~~~~~~~~~",
      "TTTTT~~~~KK~~~~~~~~~~~~~~~R~~~~~~~~~",
      "TTTTT~~~~KK~~~~~~~~~~~~~~~~~~~~~~~~~",
      "TTTT,,,,,dd,,,,%,,,R~~~~~~~~~~~~~~~~",
      "TTT,,GGG,ddd,,,,,,,,,~~~~~~~~~~~~~~~",
      "TT,,GGGG,,ddd,,,,,,,,,ff,,,,,~~~~~~~",
      "TT,,GGG,,,,dddddddddddddd,,=hhh,~~~~",
      "TT%,,,,R,,,dd,,,,,,,,,,,dd,=hhh,,~~~",
      "TTT,,,,,,,,dd,,,,%,%,,,,dddd+hh,,~~~",
      "TTT,,f,,,,,dd,ff,,,GGGGGG,dd,,,,~~~~",
      "TTTT,,,,,,,dd,,,,,,,,,,,,,,,,,,~~~~~",
      "TTTT,,,,,,dd,,,,,,RsssssssRssR~~~~~~",
      "TTTT,,,,,,dd,,,,^^^ssssGGssoB~~~~~~~",
      "TTTTT,,,,,dd,,,,~~~ssssGGGss~~~~~~~~",
      "TTTTTTTT,,dd,,~~~~~~~sss~~~~~~~~~~~~",
      "TTTTTTTT~~~~KK~~~~~~~~~~~~~~~~~~~~~~",
      "TTTTTTTT~~~~KK~~~~~~~~~~R~~~~~~~~~~~",
      "TTTTTTTT~~~~KK~~~~~~~~~~~~~~~~~~~~~~",
      "TTTTTTT,,,,,dd,,,,,,~~~~~~~~~~~~~~~~",
      "TTTTTT,,,%,,dd,,ff,R~~~~~~~~~~~~~~~~",
      "TTTTT,%,,,,,^^,,,,,,,~~~~~~~~~~~~~~~",
      "TTTTT,,GG,,,^^,,,,,,R~~~~~~~~~~~~~~~",
      "TTTT,,GGGGG,dd,,,,,,,~~~~~~~~~~~~~~~",
      "TTT,,GGGGGGGGGG,G,,,,,~~~~~~~~~~~~~~",
      "TTT,,,GGGGGGGGGGGG,,,R~~~~~~~~~~~~~~",
      "TTT,!,,,,,ddd,,GG,,,,,~~~~~~~~~~~~~~",
      "TTT%%R%%%ddd%R%%%%%%~~~~~~~~~~~~~~~~",
    ],
    heights: [
      "888886666666666666660000000000000000",
      "888866666666666666666000000000000000",
      "888666666666666666666600000000000000",
      "888666666666666666666660000000000000",
      "886666666666666666666660000000000000",
      "888666666666666666666600000000000000",
      "888866666666666666666000000000000000",
      "888880000660000000000000000000000000",
      "888880000660000000000000002000000000",
      "888880000660000000000000000000000000",
      "888866666666666666660000000000000000",
      "888666666666666666666000000000000000",
      "886666666666666666666666666660000000",
      "886666666666666666666666666666660000",
      "886666666666666666666666666666666000",
      "888666666666666666666666666666666000",
      "888666666666666666666666666666660000",
      "888866666666666666666666666666600000",
      "888866666666666666111111111111000000",
      "888866666666666666611111111110000000",
      "888886666666666600011111111100000000",
      "888886666666660000000111000000000000",
      "888886660000660000000000000000000000",
      "888886660000660000000000100000000000",
      "888886660000660000000000000000000000",
      "888886666666666666660000000000000000",
      "888886666666666666660000000000000000",
      "888886666666666666666000000000000000",
      "888886666666666666666000000000000000",
      "888833333333333333333000000000000000",
      "888333333333333333333300000000000000",
      "888333333333333333333300000000000000",
      "888333333333333333333300000000000000",
      "888883333333333333330000000000000000",
    ],
    entries: { from_kurotsuki: [10, 32, 'up'], from_fernwick: [9, 1, 'down'], from_lighthouse: [28, 16, 'down'] },
    exits: [
      { at: [9, 33, 3, 1], to: 'kp_kurotsuki', entry: 'from_route4' },
      { at: [8, 0, 3, 1], to: 'kp_fernwick', entry: 'from_route4' },
      { at: [28, 15, 1, 1], to: 'kp_route4_lighthouse', entry: 'from_town', sfx: 'door' },
    ],
    buildings: [
      // the lighthouse: a white tower with a red cap, its lamp on top
      { at: [28, 13, 3, 3], h: 4.0, col: '#f2eee4', roof: '#d8d2c4', top: 'flat', win: '#ffe8a0', tex: 'plaster' },
    ],
    props: [
      { at: [4, 32], prop: 'sign', text: 'ROUTE 4' },
      // the rope bridges' hand ropes
      ...ropeBridge(11.6, 13.4, 21.3, 24.7), ...ropeBridge(8.6, 10.4, 6.3, 9.7),
      // the lighthouse lamp: a gallery, the lit glass lantern room, a red cap
      { at: [29.01, 14.01], prop: 'disc', r: 1.7, h: 0.1, lift: 4.0, col: '#3a3a40', top: '#5a5a62', rim: '#2a2a30' },
      { at: [29.01, 14.01], prop: 'capsule', lift: 4.05, col: '#fff2a0', h: 0.8, scale: [2.4, 1, 2.4] },
      { at: [29.01, 14.01], prop: 'tent', lift: 5.28, scale: 1.5, col: '#c03a2a' },
      // sea stacks and surf rocks
      { at: [31.5, 4.5], prop: 'spire', h: 2.6, r: 1.6, col: '#8a8070' },
      { at: [33.5, 26.5], prop: 'spire', h: 3.2, r: 1.9, col: '#857a6a' },
      { at: [27.5, 30.5], prop: 'spire', h: 1.8, r: 1.2, col: '#8a8070' },
      { at: [34, 11], prop: 'rock', scale: 1.6, col: '#7a7262' },
      ...[[31.5, 4.5, 1.9], [33.5, 26.5, 2.2], [27.5, 30.5, 1.5], [34, 11, 1.1], [24, 23, 0.9], [26, 8, 0.9]].map(([x, y, r]) => ({ at: [x + 0.01, y + 0.01], prop: 'disc', r, h: 0.01, col: '#e8f4fa', top: '#e8f4fa', rim: '#d0e8f4', y0: 0.02 })),
      // a bench on the point, looking out to sea
      { at: [31.01, 16.2], prop: 'bench', w: 2, rot: 180, col: '#7a5a38' },
    ],
    npcs: [R4.flint.npc, R4.bosun.npc, R4.sandy.npc, R4.wade.npc],
    items: [
      W.item('r4_cove', [21, 21], 'golden_nut', 2),
      W.item('r4_point', [32, 14], 'hi_oil'),
      W.item('r4_grass', [6, 30], 'battery'),
    ],
    triggers: [R4.flint.trig, R4.bosun.trig, R4.sandy.trig, R4.wade.trig,
      ledge([20, 17, 6], 'down', 1),
      W.hidden('r4_flowers', [5, 16], 'quick_nut'),
      W.sign([4, 32], 'ROUTE 4 - THE SEASPRAY CLIFFS\fNorth: Fernwick, the village in the trees.   South: Kurotsuki.\fMind the cliff edges, and hold on to the ropes!'),
    ],
  });
  W.house('kp_route4_lighthouse', {
    name: 'Seaspray Lighthouse', area: 'Route 4', town: 'kp_route4', back: 'from_lighthouse', decor: 'rustic', music: 'costadelsol',
    grid: [
      "##########",
      "#k..b..q.#",
      "#........#",
      "#.t......#",
      "#.......j#",
      "####+#####",
    ],
    door: [4, 5],
    npcs: [
      { id: 'kp_r4_keeper', name: 'Keeper Morrow', model: { base: 'oldman', top: '#2a3a5a', hairStyle: 'cap', extras: ['beard'] }, at: [6, 2], dir: 'down',
        talk: function* (s) {
          yield s.say('Keeper Morrow', "Welcome aboard, young trainer. Forty years I've kept this light burning for the fishing boats.");
          yield s.say('Keeper Morrow', "Seamogs come ashore at dusk to look at the lamp. Pirate moogles too, the scamps: they think it's treasure.\fAnd the big Chocomogs? They run the cliff tops just for the joy of it.");
          if (s.flag('kp_r4_keeper_gift')) { yield s.say('Keeper Morrow', 'Fernwick is just past the gorge, up in the big trees. Mind the rope bridge. It sways.'); return; }
          s.set('kp_r4_keeper_gift'); KP.give('golden_nut', 1); KP.give('oil_can', 2); s.sfx('found');
          yield s.msg('Received a Golden Kupo Nut and 2 Oil Cans!');
          yield s.say('Keeper Morrow', "Take those. A keeper always has a spare. ...Strange boats out at night lately, mind. Folk in white coats, rowing toward the mountain.");
        } },
    ],
  });

  // ================================================================== Fernwick: the treehouse village
  // The village lives in three giant trees: decks at the treetops (A west, B north with the elder's house, C east with the
  // kids' clubhouse) joined by rope bridges, a ladder up from the forest floor, a lift basket up to deck C, and the Mog
  // Center in a great hollow tree on the green below. Route 5 is across the Long Bridge over the ravine, where Zack waits.
  const FW_MART = ['kupo_nut', 'golden_nut', 'sprout_nut', 'quick_nut', 'roast_nut', 'familiar_nut', 'wild_nut', 'tough_nut', 'oil_can', 'hi_oil', 'fixit', 'battery'];
  const trunk = (x, y, o = {}) => [
    { at: [x, y], prop: 'stump', scale: [o.r || 4.6, o.h || 24, o.r || 4.6], col: o.col || '#5a4430', fade: true },
    { at: [x + 0.01, y + 0.01], prop: 'canopy', trunk: false, h: o.top || 4.7, r: o.crown || 5, col: o.leaf || '#3e6e2c' },
  ];
  const basket = { prop: 'planter', r: 0.75, h: 0.42, col: '#9a7038', col2: '#c09050', soil: '#6a4a28', plant: 'none' };
  // Zack, at the bridgehead: the 4th battle (friendly; losing is fine), then he lets you over the Long Bridge
  function* fwZack(s) {
    if (s.flag('kp_r2_zack')) return;
    s.emote('kp_fw_zack', '!');
    yield s.say('zack', "Cloud! There you are! I've been waiting up here for ages. Well, twenty minutes.");
    yield s.move('kp_fw_zack', 3, 8);
    yield s.face('kp_fw_zack', 'player'); yield s.face('player', 'kp_fw_zack');
    yield s.say('zack', "Heard you got Yuffie's badge in Kurotsuki! Nice! Me too. ...Okay, it took me three tries. But who's counting?\fSo before you cross: one more round? For old times' sake. I've been training on the cliffs!");
    const r = yield* W.rival(s, 'zack', 4, { patched: true, lose: 'Aw, man! You got me again!', win: 'Yes! Finally! ...Wait, was that a fluke?' });
    if (r === 'lose') yield s.say('zack', "Ha! Don't look so down. Here, I patched your team up. ...There! Good as new.");
    else yield s.say('zack', "Whew! You're getting scary good, Cloud. My Chocomog's still dizzy.");
    yield s.say('zack', "Hey, listen. The elder says there are folks in white coats sneaking around Mt. Kupo. Lab coats, in a cave! Weird, right?\fRoute 5's over the bridge, then up to the caves. Cogsworth's on the far side: Barret's dojo! Race you there, buddy!");
    s.set('kp_r2_zack');
    yield s.move('kp_fw_zack', [[0, 8]], { run: true });
    s.remove('kp_fw_zack');
  }
  FF7.defineMap('kp_fernwick', {
    name: 'Fernwick', area: 'Fernwick', theme: 'forest', music: 'parochial',
    look: { floor: ['#3e5e2a', '#3a5826'], floorTex: { floor: 'grass' }, grass: ['#46682e', '#42622a'], water: '#3a7a8a', wood: ['#9a7448', '#8e6a40'], bldg: '#8a6a44', roof: '#4a6a30', sky: ['#4a7a5a', '#a8c8a0'], fog: { color: [0.32, 0.45, 0.34], near: 12, far: 30 } },
    grid: [
      "~~~TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
      "~~~TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
      "~~~TTTTTTTTTTTTThhhhKKKKKTTTTTTTTTTT",
      "~~~TTTTTTTTTTTTThh+hK222KTTTTTTTTTTT",
      "~~~TTTTTTTTTTTTTKKKKK222KTTTTTTTTTTT",
      "~~~TTTTTTTTTTTTTKKKKK222KKKKKKhhhKTT",
      "~~~~KKKKKKKKKKKKKKKKKKKKK%%KKKh+hKTT",
      "~~~~KKKK222KKK,,%,,,,,,,,%,KKKKKKKTT",
      "KKKKKKKK222KKK,,,,,,f,,,,,,KK222KKTT",
      "KKKKKKKK222KKK,,,f,,,,,,,,,KK222KKTT",
      "~~~~KKKKKKKKKK,,,,,,,,,,,,,KK222KKTT",
      "~~~~KKKKKKKKKK%,,,,,,,,,,,,KKKKKKKTT",
      "~~~~KKKKKKKKKK,,,,,,,,,,,,,KKKKKKKTT",
      "~~~~%H%,,,,,,,,,222,,,,,,,,,,,,,,%,T",
      "~~~~,H,,Y,,,,,,,222,,,,,,,,,,,,,,,,T",
      "~~~~,,,,,,,,,,,,222,,,,,,,,,,,,,,G,T",
      "~~~~,GG%,,,,,,,,,d,,,,,hhhh,f,,,,,,T",
      "~~~~,GGG,,,,,,,,,dd,,O,hhhh,,,,,,,,T",
      "~~~~,,,,hhhh,,,,,dd,ff,hhh+,,,@,,,,T",
      "~~~~,f,,hhhh,,Y,,dd,,,,,,dd,,,,,,,,T",
      "~~~~,,,,h+hh,,,,,dddddddddd,,,,,f,,T",
      "~~~~~,,,,dd,,,,,,dd,,,,,,,,,,%,,R,,T",
      "~~~~~~~~~~~~~~~~~KK~~~~~~~~~~~~~~~~~",
      "~~~~T,,,,,,f,,,,,dd,,,,,,,,,GGG,TTTT",
      "~~~~TT,,,f,,,G,,,dd,,,,%,,,Y,f,TTTTT",
      "~~~~TTT,,,,,GG,,,dd,,,GG,,,,,TTTTTTT",
      "~~~~TTTTTT%,,,,,,dd,,,,%,,,TTTTTTTTT",
      "~~~~TTTTTTTTTTTTdddTTTTTTTTTTTTTTTTT",
    ],
    heights: [
      "000222222222222222222222222222222222",
      "000222222222222222222222222222222222",
      "000222222222222299999999922222222222",
      "000222222222222299999222922222222222",
      "000222222222222299999222922222222222",
      "000222222222222299999222999999999922",
      "000099999999999999999999922999999922",
      "000099992229992222222222222999999922",
      "999999992229992222222222222992229922",
      "999999992229992222222222222992229922",
      "000099999999992222222222222992229922",
      "000099999999992222222222222999999922",
      "000099999999992222222222222999999922",
      "000022222222222222222222222222222222",
      "000022222222222222222222222222222222",
      "000022222222222222222222222222222222",
      "000022222222222222222222222222222222",
      "000022222222222222222222222222222222",
      "000022222222222222222222222222222222",
      "000022222222222222222222222222222222",
      "000022222222222222222222222222222222",
      "000002222222222222222222222222222222",
      "000011111111111112211111111111111111",
      "000022222222222222222222222222222222",
      "000022222222222222222222222222222222",
      "000022222222222222222222222222222222",
      "000022222222222222222222222222222222",
      "000022222222222222222222222222222222",
    ],
    legend: { '2': 'block' },
    entries: { from_route4: [17, 26, 'up'], from_route5: [1, 8, 'right'], from_center: [17, 17, 'down'], from_elder: [18, 4, 'down'],
      from_clubhouse: [31, 7, 'down'], from_cottage: [26, 19, 'down'], from_workshop: [9, 21, 'down'], lift_top: [28, 11, 'down'], lift_bottom: [28, 14, 'up'] },
    exits: [
      { at: [16, 27, 3, 1], to: 'kp_route4', entry: 'from_fernwick' },
      { at: [0, 8, 1, 2], to: 'kp_route5', entry: 'from_fernwick', if: s => s.flag('kp_r2_zack'), blocked: say('zack', 'Hey, Cloud! Over here!') },
      { at: [17, 16, 1, 1], to: 'kp_fernwick_center', entry: 'from_town', sfx: 'door' },
      { at: [18, 3, 1, 1], to: 'kp_fernwick_elder', entry: 'from_town', sfx: 'door' },
      { at: [31, 6, 1, 1], to: 'kp_fernwick_clubhouse', entry: 'from_town', sfx: 'door' },
      { at: [26, 18, 1, 1], to: 'kp_fernwick_cottage', entry: 'from_town', sfx: 'door' },
      { at: [9, 20, 1, 1], to: 'kp_fernwick_workshop', entry: 'from_town', sfx: 'door' },
    ],
    buildings: [
      { at: [16, 2, 4, 2], h: 1.9, col: '#7a5a3a', roof: '#4a6a30', top: 'hip', rise: 0.8, over: 0.2, tex: 'siding', win: '#ffd890' },
      { at: [30, 5, 3, 2], h: 1.6, col: '#8a6a44', roof: '#a04a2a', top: 'gable', ridge: 'x', rise: 0.7, tex: 'siding', win: '#ffd890' },
      { at: [23, 16, 4, 3], h: 2.0, col: '#8a6a44', roof: '#5a7a34', top: 'hip', rise: 1.0, over: 0.2, tex: 'siding', win: '#ffd890', chimney: true },
      { at: [8, 18, 4, 3], h: 2.0, col: '#7a5a3a', roof: '#8a4a2a', top: 'gable', ridge: 'x', rise: 0.9, tex: 'siding', win: '#ffd890' },
    ],
    props: [
      { at: [33, 13], prop: 'sign', text: 'FERNWICK' },
      ...trunk(9, 8), ...trunk(22, 4, { top: 4.9, crown: 5.4 }), ...trunk(30, 9, { leaf: '#46762e' }),
      // the Mog Center: the great hollow tree on the green
      { at: [17, 14], prop: 'hollowtree', scale: 2.4, h: 2.0, col: '#6a5034', col2: '#4a7a30', fade: true },
      { at: [17, 15.95], prop: 'banner', w: 2.2, h: 0.42, y: 2.5, col: '#3a5a2a', col2: '#d8b060', text: 'MOG CENTER', textCol: '#f8ecc8' },
      // rope bridges: the Long Bridge (west), deck A to deck B, deck B to deck C
      ...ropeBridgeX(-0.4, 3.6, 7.6, 9.4), ...ropeBridgeX(13.5, 15.5, 5.6, 6.4), ...ropeBridgeX(24.5, 26.5, 4.6, 5.4),
      // the lift basket's ropes, up over a pulley on tree C
      rope([28, 12], [29.6, 9.5], 0.7, { h2: 3.6, sag: 0.02 }), rope([28, 13], [29.6, 9.5], 2.8, { h2: 3.6, sag: 0.02 }),
      // the campfire's log benches, the brook's footbridge rails, a washing line
      { at: [30, 17.3], prop: 'bench', w: 2, rot: 0, col: '#6a4a2a' }, { at: [30, 18.8], prop: 'bench', w: 2, rot: 180, col: '#6a4a2a' },
      rope([16.5, 21.6], [16.5, 22.6], 0.6, { sag: 0.02 }), rope([18.5, 21.6], [18.5, 22.6], 0.6, { sag: 0.02 }),
      rope([20, 15], [22.4, 15], 1.5, { col: '#d8d0c0', count: 6, bulbs: ['#e0e0e0', '#c05050', '#5a8ad0'], sag: 0.15, r: 0.006 }),
      // lanterns along the decks
      { at: [12.6, 6], prop: 'lantern', col: '#ffcf70', hang: 1.2, size: 0.8 }, { at: [24, 6.6], prop: 'lantern', col: '#ffcf70', hang: 1.2, size: 0.8 },
      { at: [27, 11.6], prop: 'lantern', col: '#ffcf70', hang: 1.2, size: 0.8 }, { at: [4, 7.4], prop: 'lantern', col: '#ffcf70', hang: 1.2, size: 0.8 },
    ],
    npcs: [
      { id: 'kp_fw_zack', name: 'Zack', model: 'zack', at: [2, 8], dir: 'right', show: s => !s.flag('kp_r2_zack'), talk: fwZack },
      { id: 'kp_fw_lookout', name: 'Lookout Fern', model: { base: 'girl', hair: '#a05a2a', hairStyle: 'ponytail', top: '#4a7a3a' }, at: [11, 11], dir: 'down',
        talk: say('Lookout Fern', "From up here you can see all the way to the sea! ...And down there, the Mog Center. It's the oldest tree in the forest, hollow as a drum.") },
      { id: 'kp_fw_liftman', name: 'Lift Hand Bram', model: 'man4', at: [27, 14], dir: 'right',
        talk: say('Lift Hand Bram', "Hop in the basket and give it a tug! The other basket comes down as you go up. Counterweights, see? No moogle power needed.") },
      { id: 'kp_fw_woodcutter', name: 'Woodcutter', model: { base: 'man', build: 'big', top: '#8a3a2a', hair: '#5a3a1a', extras: ['beard', 'suspenders'] }, at: [12, 16], dir: 'down', wander: 2,
        talk: say('Woodcutter', "Chop a giant tree? Never! We only take fallen branches. These trees hold up the whole village, and the moogles nest in their crowns.") },
      { id: 'kp_fw_kid', name: 'Boy', model: 'kid4', at: [24, 21], dir: 'down', wander: 2,
        talk: say('Boy', "The Mopluffs sing at the campfire every night. If you hum along they get embarrassed and stop!") },
      { id: 'kp_fw_campfire', name: 'Old Woman', model: 'oldwoman2', at: [32, 18], dir: 'left',
        talk: say('Old Woman', "Barret's dojo in Cogsworth is all switches and conveyor belts, so I hear. Machinist moogles are tough as nails: hit them with a Monk, or a Black Mage's lightning.") },
      { id: 'kp_fw_ranger', name: 'Ranger', model: { base: 'man', top: '#3a5a2a', jacket: '#4a3a24', hair: '#2a2a1a', hairStyle: 'short' }, at: [20, 9], dir: 'down', wander: 1,
        talk: say('Ranger', "Route 5 climbs to Mt. Kupo. There's a waterfall halfway, and an old miner's shack. The miner knows the caves better than anyone.") },
      { id: 'kp_fw_deckkid', name: 'Girl', model: 'girl4', at: [32, 9], dir: 'left', wander: 1,
        talk: say('Girl', "That's our clubhouse! The password is... nope! Not telling!") },
      W.moogle('kp_fw_mog1', 'fletchmog_archer', [20, 12], { line: 'Fletchmog: Kupo! (It aims a tiny arrow at a pine cone. Thwip!)' }),
      W.moogle('kp_fw_mog2', 'mopluff_bard', [29, 20], { line: 'Mopluff: Kupo kupo! (It hums along to nothing in particular.)' }),
      W.moogle('kp_fw_mog3', 'mossmog_geomancer', [8, 24], { line: 'Mossmog: Kupo... (A tiny fern is growing on its head.)' }),
    ],
    objects: [
      { id: 'kp_fw_basket_lo', at: [28, 13], model: basket, solid: true, talk: function* (s) {
        const c = yield s.ask(null, 'A big wicker basket on a rope. Ride it up to the treetops?', ['Up we go', 'Not now']);
        if (c !== 0) return;
        yield s.fadeOut(20); s.place('player', 28, 11, 'down'); yield s.fadeIn(20);
      } },
      { id: 'kp_fw_basket_hi', at: [28, 12], model: basket, solid: true, talk: function* (s) {
        const c = yield s.ask(null, 'The lift basket. Ride it down to the forest floor?', ['Down we go', 'Not now']);
        if (c !== 0) return;
        yield s.fadeOut(20); s.place('player', 28, 14, 'up'); yield s.fadeIn(20);
      } },
    ],
    triggers: [
      { id: 'zack4', at: [4, 6, 2, 7], once: false, if: s => !s.flag('kp_r2_zack'), run: fwZack },
      W.sign([33, 13], 'FERNWICK\fThe village in the treetops. Please do not feed the Mopluffs after dark.'),
    ],
  });
  W.mogCenter('kp_fernwick_center', { name: 'Fernwick Mog Center', town: 'kp_fernwick', back: 'from_center', mart: FW_MART, decor: 'rustic',
    look: { wall: '#7a5a3a', floor: ['#8a6a44', '#82623e'] },
    npcs: [{ id: 'kp_fwc_hiker', name: 'Hiker', model: { base: 'man', build: 'big', top: '#7a5a3a', extras: ['beard'] }, at: [9, 5], dir: 'left',
      talk: say('Hiker', "A Mog Center inside a tree! The roots hold the floor up, and the sap smells like maple. Best rest stop on the coast.") }] });
  W.house('kp_fernwick_elder', {
    name: "Elder's House", area: 'Fernwick', town: 'kp_fernwick', back: 'from_elder', decor: 'rustic', music: 'parochial',
    npcs: [
      { id: 'kp_fw_elder', name: 'Elder Oakley', model: { base: 'oldman', top: '#5a6a3a', extras: ['beard', 'robe'] }, at: [7, 2], dir: 'down',
        talk: function* (s) {
          yield s.say('Elder Oakley', "Welcome, traveler. You'll be bound for Mt. Kupo, I expect. Everyone headed west is.");
          yield s.say('Elder Oakley', "The old moogles say the mountain is hollow, full of crystals that hum when you sing to them. The Cogsworth miners dug their tunnels clean through it, long ago, and laid rails for their carts.\fDeep inside there's a chamber that glows all on its own. A shy moogle lives there, the Lumimog, with a lamp for a heart. Few have seen it.");
          yield s.say('Elder Oakley', "But lately... strangers in white coats have been hauling crates up the mountain path, and the crystals have gone quiet. I don't like it.\fIf you go through, keep your moogles close.");
          if (s.flag('kp_fw_elder_gift')) return;
          s.set('kp_fw_elder_gift'); KP.give('glow_nut', 3); s.sfx('found');
          yield s.msg('Received 3 Glow Nuts!');
          yield s.say('Elder Oakley', "Glow Nuts. Cave moogles can't resist them in the dark. Take them, and mind the Lumimog's light if you find it.");
        } },
      { id: 'kp_fw_granddaughter', name: 'Willow', model: 'girl2', at: [3, 3], dir: 'right',
        talk: say('Willow', "Grandpa's been the elder for fifty years. He says the trees remember everything. I think they mostly remember squirrels.") },
    ],
  });
  W.house('kp_fernwick_clubhouse', {
    name: 'The Clubhouse', area: 'Fernwick', town: 'kp_fernwick', back: 'from_clubhouse', decor: 'rustic', music: 'parochial',
    grid: [
      "##########",
      "#k..j..b.#",
      "#........#",
      "#..t.....#",
      "####+#####",
    ],
    door: [4, 4],
    npcs: [
      { id: 'kp_fw_club1', name: 'Club Leader Pip', model: 'kid2', at: [6, 2], dir: 'down',
        talk: function* (s) {
          if (s.flag('kp_fw_club_gift')) { yield s.say('Club Leader Pip', "You're an honorary member now! That means you have to keep the secret. ...We don't have a secret yet."); return; }
          yield s.say('Club Leader Pip', "Hey! How'd you get in? Did you know the password?");
          const c = yield s.ask('Club Leader Pip', 'What is it, then?', ['Kupo?', '...']);
          if (c === 0) yield s.say('Club Leader Pip', "...Huh. That IS the password. Everything's \"kupo\" with us. Welcome to the club!");
          else yield s.say('Club Leader Pip', "The strong, silent type, huh? That's so cool. You're in!");
          s.set('kp_fw_club_gift'); KP.give('familiar_nut', 2); s.sfx('found');
          yield s.msg('Received 2 Familiar Nuts!');
        } },
      { id: 'kp_fw_club2', name: 'Club Member Moss', model: 'kid5', at: [2, 2], dir: 'right',
        talk: say('Club Member Moss', "We keep a list of every moogle we've ever seen. We've got 31! Well, 30. Pip counted a pine cone.") },
    ],
  });
  W.house('kp_fernwick_cottage', {
    name: 'Cottage', area: 'Fernwick', town: 'kp_fernwick', back: 'from_cottage', decor: 'cosy', music: 'parochial',
    grid: [
      "############",
      "#k..F...b..#",
      "#..........#",
      "#.ctc......#",
      "#........jj#",
      "#####+######",
    ],
    npcs: [
      { id: 'kp_fw_baker', name: 'Mrs. Bramble', model: 'woman5', at: [5, 2], dir: 'down',
        talk: say('Mrs. Bramble', "Berry pie's almost ready! The Mopluffs can smell it from the treetops. They'll be at the window any minute.") },
      { id: 'kp_fw_hubby', name: 'Mr. Bramble', model: 'man6', at: [8, 2], dir: 'down',
        talk: say('Mr. Bramble', "On Route 5 there's a pool under the waterfall. Folks say a trainer dropped something shiny in there. Look along the bank.") },
    ],
  });
  W.house('kp_fernwick_workshop', {
    name: "Woodcarver's Workshop", area: 'Fernwick', town: 'kp_fernwick', back: 'from_workshop', decor: 'rustic', music: 'parochial',
    grid: [
      "############",
      "#kuuu.tt.uq#",
      "#..........#",
      "#.tu.....j.#",
      "#..........#",
      "#####+######",
    ],
    props: [[2, 1], [3, 1], [4, 1], [9, 1], [3, 3]].map(([x, y], i) => ({ at: [x, y], prop: 'statue', scale: 0.55, col: ['#c8a070', '#b08858', '#d8b888'][i % 3], col2: '#6a4a2a' })),
    npcs: [
      { id: 'kp_fw_carver', name: 'Carver Elm', model: { base: 'man', top: '#6a5a40', extras: ['apron', 'glasses'] }, at: [6, 2], dir: 'down',
        talk: function* (s) {
          const n = KP.dexCount();
          yield s.say('Carver Elm', `I carve a little wooden moogle for every kind I've seen. You've befriended ${n.caught} kinds, eh? My shelves are jealous.`);
          yield s.say('Carver Elm', 'Fill your Kupodex and Prof. Sith will be proud. I hear he keeps a shelf of his own.');
        } },
    ],
  });

  // ================================================================== Route 5: the foothills of Mt. Kupo
  // From the Long Bridge the road drops to the meadows by the stream, crosses it, then zigzags up three terraces
  // (switchback stairs at alternate ends; one-way ledges are the quick way back down) to the cave mouth. A waterfall
  // spills into a pool in the gorge (walk up the stream bank to it); a log bridge over the top of the falls leads to a
  // lookout with a prize; the old miner's shack stands by the road in.
  KP.WILD.kp_route5 = [['grumog_berserker', 24, 12, 15], ['mossmog_geomancer', 20, 12, 14], ['stampo_monk', 14, 12, 15],
    ['huntmog_hunter', 14, 12, 14], ['chocomog_rider', 12, 13, 15], ['minemog_miner', 11, 12, 15], ['kurogen_genin', 5, 13, 15]];
  const R5 = {
    gus: W.trainer({ id: 'kp_r5_gus', cls: 'Hiker', name: 'Gus', model: { base: 'man', build: 'big', top: '#8a5a2a', hair: '#4a3020', hairStyle: 'cap', extras: ['beard'] }, at: [6, 13], dir: 'down', sight: [6, 14, 1, 2],
      line: 'Hoo boy! These stairs are a workout! Let me catch my breath... by battling you!', lose: "Whew. I'm more winded than ever.",
      after: 'The stairs zigzag up, but you can hop down the ledges to get back fast. Mind your knees.', team: [['stampo_monk', 14], ['grumog_berserker', 14]], money: 560 }),
    twins: W.trainer({ id: 'kp_r5_twins', cls: 'Twins', name: 'Bea & Bo', model: 'girl5', at: [5, 19], dir: 'down', sight: [5, 20, 1, 2],
      line: "We're twins! We do everything together! Even battling! ...Bo is mostly here for moral support.", lose: "Bo! You were supposed to cheer louder!",
      after: 'We named our moogles after each other. It gets confusing at dinner.', team: [['mopluff_bard', 13], ['tufty_mime', 13]], money: 520 }),
    lulu: W.trainer({ id: 'kp_r5_lulu', cls: 'Picnicker', name: 'Lulu', model: 'woman7', at: [32, 22], dir: 'left', sight: [30, 22, 2, 1],
      line: 'A battle before lunch builds an appetite! Ready?', lose: "Oh dear. I'll need a second sandwich.",
      after: 'The stream comes from the waterfall up the gorge. The pool at the bottom is lovely, if you walk up the bank.', team: [['mopluff_bard', 13], ['chocomog_rider', 14]], money: 560 }),
    kesha: W.trainer({ id: 'kp_r5_kesha', cls: 'Climber', name: 'Kesha', model: { base: 'woman', top: '#c05030', bottom: '#3a3a4a', hair: '#2a1a10', hairStyle: 'ponytail', extras: ['goggles'] }, at: [30, 8], dir: 'left', sight: [27, 8, 3, 1],
      line: "You climbed all the way up here? Respect! Now let's see if your moogles can keep up.", lose: "Ha! I slipped. That never happens!",
      after: "From the top of the falls you can jump straight down here. Shortcut! Climber's secret.", team: [['chocomog_rider', 14], ['huntmog_hunter', 14]], money: 560 }),
    rowan: W.trainer({ id: 'kp_r5_rowan', cls: 'Ace Trainer', name: 'Rowan', model: { base: 'man', top: '#3a4a8a', jacket: '#2a2a3a', hair: '#c0a060', hairStyle: 'spiky' }, at: [6, 2], dir: 'left', sight: [3, 2, 3, 1],
      line: "Heading into Mt. Kupo? Then you'll need to get past the best trainer on this mountain. That's me.", lose: 'Hm. Not bad. Not bad at all.',
      after: "The caves are dark: moogles jump out at every step, not just in the grass. Bring Oil Cans, and a few Glow Nuts.", team: [['chocomog_rider', 14], ['mogsquire_squire', 14], ['huntmog_hunter', 15]], money: 600 }),
  };
  FF7.defineMap('kp_route5', {
    name: 'Route 5', area: 'Route 5', theme: 'mountain', music: 'othermountain', kpWild: 'kp_route5', kpBg: 'mountain',
    look: { grass: ['#5a7a3a', '#547436'], floor: ['#5a7a3a', '#547436'], floorTex: { floor: 'grass' }, wall: '#7e7260', wallTop: '#6e6656', water: '#4a8ab8', dirt: ['#8a7456', '#826c4e'] },
    grid: [
      "###dd#############~~########TTRTTTRTTT",
      "T,,dd,,,R,,,,%,,,,KK,,,,,,,RTRTTTTTRTT",
      "T,,dd,,,,,GGG,,,,,~~R,,,,,,,TTTRTTTTRT",
      "T,,dd,,,,GGGG,,,,,WW,,,,,,%,RTTTTRTTTT",
      "TT,dd,,,,,GGT,,,,~~~~,,,,,TTTTRTTTTRTT",
      "R,,dd,,,,%,,,,,,,~~~~,,,,,,TTTTTRTTTTT",
      "T,dd,,,,,,,,,,,,,~~~~R,,R,GGG,,,R,,,,T",
      "T,^,,,,,GG,,,,,,,~~~~,,T,,GGG,,,,,,,,T",
      "T,dddddGGG,T,,R,,,~~,,,,,,R,,,,,,,,,,T",
      "T,,,GGdddddddd%,,,~~,,,,,,,,,GG,,,,,TT",
      "R,%T,GGGG,,,,d,%,,~~,,,,,,R,,,,GG,R,,T",
      "T,,,,,,,,,,,Rd,,,,~~,,,,,,%,,,,,,,,,,T",
      "T,,,,,,,,,,,,^,,,,~~,,,,,,,,,,,,,,,^,T",
      "T,T,%,,,,ddddd,,,,~~,,hhhh,o,,,,,,,,!T",
      "T,,GGG,,,d,,,,T,,,~~,,hhhh,B,,dddddddd",
      "R,,ddddddd,,,,,T,,~~,,hh+h,,,,dddddddd",
      "T,,dGG,,,,,R,,,,,,~~,,,,d,,,,,d,,,T,,T",
      "T,,d,,,,,,,,,,,,,,~~,,,Tddddddd,,,,,,T",
      "T,,^,,,,,,,,,,,,,,~~,,,,,,,,,,^,,,,,,T",
      "T,,d,,,,,,,R,,T,,,~~,,,,T,,,,,d,,,,,,T",
      "R,,dGGGG,,,,T,,,,,~~,,,R,,,GGGd,,,,,,T",
      "T,Gdddddd,,%,T,%,,~~,,,,,,GGGGdG,,,,,T",
      "T,,GGGGGdGGG,,,,,,~~,,,,,,GGGGd,,,,,TT",
      "T,,,,GGGdGGGG,,,,,~~,,,,,,,GGGd,,,,,,T",
      "T,,,,,,,ddddddddddKKddddddddddd,,,T,,T",
      "R,T,R,,,,,,,,,,,,,~~,,,,,,,,,,,R,,,T,T",
      "T,,,,,,%,,,,,,R,,,~~,,,,,%,,,,,,,T,,,T",
      "TT,,,,T,,,,,,,,,,,~~,,,,,%,,,,,,,,,TTT",
      "TTT,,,,,,,R,,,,,,,~~,,,,,,,,,R,,,,TTTT",
      "TTTTTTTTTTTTTTTTTT~~TTTTTTTTTTTTTTTTTT",
    ],
    heights: [
      "99988999999999999977999999999999999999",
      "98888888888888888888888888889999999999",
      "98888888888888888877888888889999999999",
      "98888888888888888811888888889999999999",
      "98888888888888882111128888889999999999",
      "98888888888888662111128888889999999999",
      "98886688888866662111126666666666666666",
      "96666666666666662111126666666666666666",
      "96666666666666662211226666666666666666",
      "96666666666666662211226666666666666666",
      "96666666666666662211226666666666666666",
      "96666666644666442211224666446664466666",
      "94664444444444442211224444444444444444",
      "94444444444444442211224444444444444444",
      "94444444444444442211224444444444444444",
      "94444444444444442211224444444444444444",
      "94444444444444442211224444444444444444",
      "94444444444422442211224424444444224444",   // (x4-5 filled: they notched the top of the stair at x3, wedging a body that came up off-centre)
      "92222222222222222211222222222222222222",
      "92222222222222222211222222222222222222",
      "92222222222222222211222222222222222222",
      "92222222222222222211222222222222222222",
      "92222222222222222211222222222222222222",
      "92222222222222222211222222222222222222",
      "92222222222222222222222222222222222222",
      "92222222222222222211222222222222222222",
      "92222222222222222211222222222222222222",
      "92222222222222222211222222222222222222",
      "92222222222222222211222222222222222222",
      "92222222222222222211222222222222222222",
    ],
    entries: { from_fernwick: [36, 14, 'left'], from_mtkupo: [3, 1, 'down'], from_shack: [24, 16, 'down'] },
    exits: [
      { at: [37, 14, 1, 2], to: 'kp_fernwick', entry: 'from_route5' },
      { at: [3, 0, 2, 1], to: 'kp_mtkupo_1', entry: 'from_route5' },
      { at: [24, 15, 1, 1], to: 'kp_route5_shack', entry: 'from_town', sfx: 'door' },
    ],
    buildings: [
      { at: [22, 13, 4, 3], h: 1.7, col: '#7a6a58', roof: '#8a5a3a', top: 'shed', tin: '#8a4a2a', tex: 'siding', win: '#ffd890', chimney: true },
    ],
    props: [
      { at: [36, 13], prop: 'sign', text: 'ROUTE 5' },
      // the waterfall (taller sheets, from the pool up to the river), its spray, the log bridge's ropes
      { at: [18, 3], prop: 'waterfall', scale: [1, 1.45, 1] }, { at: [19, 3], prop: 'waterfall', scale: [1, 1.45, 1] },
      { at: [18.5, 4.4], prop: 'disc', r: 1.15, h: 0.02, col: '#e8f4ff', top: '#e8f4ff', rim: '#d0e8f8' },
      ...ropeBridgeX(17.5, 19.5, 0.6, 1.4), rope([16.5, 24.4], [20.5, 24.4], 0.6, { sag: 0.05 }), rope([16.5, 23.6], [20.5, 23.6], 0.6, { sag: 0.05 }),
      // the mine entrance: timber posts, a lintel, darkness behind
      { at: [3.5, -0.3], prop: 'banner', w: 2.6, h: 2.3, y: 2.2, col: '#0a0806', col2: '#0a0806', border: false },
      { at: [2.55, 0.1], prop: 'stump', scale: [0.7, 11, 0.7], col: '#5a3a1a' }, { at: [4.45, 0.1], prop: 'stump', scale: [0.7, 11, 0.7], col: '#5a3a1a' },
      rope([2.3, 0.1], [4.7, 0.1], 2.2, { r: 0.07, sag: 0, col: '#5a3a1a' }),
      { at: [2.2, 0.6], prop: 'lantern', col: '#ffc860', hang: 1.5, size: 0.8 },
      // peaks behind the north wall, boulders
      { at: [9.3, 0.1], prop: 'spire', h: 2.6, r: 2.2, lift: 2.8, col: '#7a7262' }, { at: [13.6, 0.2], prop: 'spire', h: 1.8, r: 1.6, lift: 2.8, col: '#827a68' },
      { at: [24.4, 0.1], prop: 'spire', h: 3.2, r: 2.6, lift: 2.8, col: '#827a68' }, { at: [7.2, 0.3], prop: 'rock', scale: 2.2, lift: 2.8, col: '#6e6656' },
      { at: [16.3, 0.2], prop: 'tree', lift: 2.8, scale: 1.2 }, { at: [21.6, 0.2], prop: 'tree', lift: 2.8, scale: 1.4 }, { at: [26.5, 0.3], prop: 'tree', lift: 2.8, scale: 1.1 },
    ],
    labels: [{ at: [3.5, 0.05], face: 's', text: 'MT. KUPO', size: 0.13, col: '#e8d8b0', y: 2.25, back: '#2a1a0a' }],
    npcs: [R5.gus.npc, R5.twins.npc, R5.lulu.npc, R5.kesha.npc, R5.rowan.npc,
      { id: 'kp_r5_bo', name: 'Bo', model: 'kid6', at: [4, 19], dir: 'down',
        talk: say('Bo', "Go, Bea! ...Oh. Hi. I'm the other twin. I mostly hold the snacks.") },
      { id: 'kp_r5_painter', name: 'Painter', model: { base: 'woman', top: '#d0b060', extras: ['apron'], hairStyle: 'bun' }, at: [20, 10], dir: 'up',
        talk: say('Painter', "I've painted this waterfall two hundred times. Every time, a moogle wanders into the picture. I've started charging them.") },
    ],
    items: [
      W.item('r5_east', [33, 9], 'tough_nut', 2),
      W.item('r5_top', [25, 2], 'lucky_pom'),
      W.item('r5_grass', [5, 22], 'oil_can', 3),
    ],
    triggers: [R5.gus.trig, R5.twins.trig, R5.lulu.trig, R5.kesha.trig, R5.rowan.trig,
      ledge([8, 6, 4], 'down', 1), ledge([5, 11, 4], 'down', 1), ledge([9, 17, 3], 'down', 1), ledge([22, 5, 2], 'down', 1),
      W.hidden('r5_pool', [21, 6], 'quick_gear'),
      W.sign([36, 13], 'ROUTE 5\fWest: up the terraces to Mt. Kupo.   East: Fernwick.'),
    ],
  });
  W.house('kp_route5_shack', {
    name: "Miner's Shack", area: 'Route 5', town: 'kp_route5', back: 'from_shack', decor: 'rustic', music: 'mining',
    grid: [
      "##########",
      "#B.o..b.q#",
      "#........#",
      "#..t.....#",
      "#B......j#",
      "####+#####",
    ],
    door: [4, 5],
    npcs: [
      { id: 'kp_r5_miner', name: 'Old Miner Dusty', model: { base: 'oldman', top: '#5a5a4a', extras: ['beard', 'suspenders'], hairStyle: 'helmet' }, at: [6, 2], dir: 'down',
        talk: function* (s) {
          yield s.say('Old Miner Dusty', "Forty years I dug those tunnels. The rails still run clear through to Cogsworth, if the carts haven't rusted solid.");
          yield s.say('Old Miner Dusty', "Inside, wild moogles come at you from every corner, not just the grass. Minemogs, mostly, and those Shellmogs with backs like boulders.\fThere's an underground river halfway. We put a plank bridge over it. Don't bounce on it.");
          if (s.flag('kp_r5_miner_gift')) { yield s.say('Old Miner Dusty', "And if you ever see a light down there that isn't your own... that's the Lumimog. Be gentle with it."); return; }
          yield s.say('Old Miner Dusty', "Lately there's noise in there at night. Drilling. And it ain't miners. Here, you'll want these.");
          s.set('kp_r5_miner_gift'); KP.give('glow_nut', 2); KP.give('hi_oil', 1); s.sfx('found');
          yield s.msg('Received 2 Glow Nuts and a Hi-Oil!');
        } },
    ],
  });

  // ================================================================== Mt. Kupo Caves (two floors; every floor tile can turn up a moogle)
  KP.WILD.kp_mtkupo_1 = [['minemog_miner', 32, 13, 16], ['shellmog_guardian', 24, 13, 15], ['grumog_berserker', 14, 13, 16],
    ['stampo_monk', 10, 13, 15], ['nutmog_thief', 10, 13, 15], ['mossmog_geomancer', 8, 13, 15], ['lumimog_lamplighter', 2, 13, 15]];
  KP.WILD.kp_mtkupo_2 = [['minemog_miner', 30, 14, 16], ['shellmog_guardian', 28, 14, 16], ['grumog_berserker', 16, 14, 16],
    ['nutmog_treasure_hunter', 10, 15, 16], ['angler_fisher', 10, 14, 16], ['stampo_monk', 6, 14, 16]];
  // the glowing chamber (2F, north-west): the Lumimog's home
  KP.WILD.kp_mtkupo_glow = [['lumimog_lamplighter', 22, 14, 16], ['minemog_miner', 40, 14, 16], ['shellmog_guardian', 38, 14, 16]];
  const CAVE_LOOK = { floor: ['#4a4038', '#443a32'], wall: '#5e4e42', wallTop: '#3a3028', wallH: 1.6, ambient: [0.36, 0.33, 0.3], water: '#2a5a7a', glow: '#7ae0d8', wood: ['#7a5a38', '#6e5232'] };
  const crystal = (x, y, col, k = 1) => ({ at: [x, y], prop: 'crystal', col, scale: k });
  // an ore cart on the rails: an iron tub with ore heaped in it
  const cart = (x, y) => [{ at: [x, y], prop: 'crate', col: '#5a5a62', scale: [1, 0.8, 1.25] }, { at: [x + 0.01, y], prop: 'rock', col: '#6a5a4a', scale: 0.7, lift: 0.36 }];

  const MK1 = {
    ivy: W.trainer({ id: 'kp_mk_ivy', cls: 'Spelunker', name: 'Ivy', model: { base: 'woman', top: '#6a7a3a', hairStyle: 'helmet', extras: ['goggles', 'belt'] }, at: [12, 19], dir: 'right', sight: [13, 19, 5, 1],
      line: "Whoa! A light! Oh, it's just you. I thought you were the Lumimog. Battle me anyway!", lose: 'My headlamp went out from the shock.',
      after: "The glowing chamber's on the floor below, way up in the north-west. Squeeze through the gap by the rails.", team: [['minemog_miner', 15], ['shellmog_guardian', 14]], money: 600 }),
    stone: W.trainer({ id: 'kp_mk_stone', cls: 'Hiker', name: 'Stone', model: { base: 'man', build: 'big', top: '#5a4a3a', hairStyle: 'helmet', extras: ['beard'] }, at: [8, 2], dir: 'down', sight: [8, 3, 1, 2],
      line: "I came in here to find myself. Instead I found you! Let's rumble!", lose: "Huh. I found a loss.",
      after: 'The rails run west to the lower level. Follow them and you can\'t get lost. Probably.', team: [['stampo_monk', 15], ['grumog_berserker', 15]], money: 600 }),
  };
  FF7.defineMap('kp_mtkupo_1', {
    name: 'Mt. Kupo Caves', area: 'Mt. Kupo', theme: 'cave', music: 'lurking', camera: { bounds: false }, kpWild: 'kp_mtkupo_1', kpBg: 'cave', kpCave: true,
    look: CAVE_LOOK,
    grid: [
      "       ########  ########               ",
      "########.....U####...U..#####           ",
      ".U.................B.....o.U#           ",
      "rrrrrrrrrrrrrrrrrrrrrrrrrrB.#           ",
      "..o.R.......................            ",
      "   U.....  ^^    .......R.       ###### ",
      "           ^^                    #U...##",
      "        ...............         ##.....#",
      "      ..........R.......U #     #....U.#",
      "     .U...................       .....U#",
      "##### .R................. #####   .....#",
      "~~~~~~~~~~~~~~KK~~~~~~~~~~~~~~### ....U ",
      "~~~~~~~~~~~~~~KK~~~~~~~~~~~~~~~##U...   ",
      "~~~~~~~~~~~~~~KK~~~~~~~~~~~~~~~.....    ",
      "~~~~~~~~~~~~~~KK~~~~~~~~~~~~~......     ",
      "            .........      ........R #  ",
      "          .............   ...|...|..U## ",
      "         .R............^^.............# ",
      "         U.............^^.............  ",
      "          .............  .U..........   ",
      "           ..........R    ...|......U   ",
      "             .......U      ...R.....    ",
      "                           U........    ",
      "                             ......     ",
      "                               ...      ",
      "                               ...      ",
      "                               ...      ",
      "                               ...      ",
    ],
    heights: [
      "4444444444444444444444444444444444444444",
      "4444444444444444444444444444444444444444",
      "4444444444444444444444444444444444444444",
      "4444444444444444444444444444444444444444",
      "4444444444444444444444444444444444444444",
      "4444444444422444444444444444444444333334",
      "4444444444222211444444444444444443333333",
      "4444411111111111111111111144444433333333",
      "4444111111111111111111111114444433333333",
      "4444111111111111111111111114444433333333",
      "0000111111111111111111111110000433333333",
      "0000000000000011000000000000000033333333",
      "0000000000000011000000000000000333333334",
      "0000000000000011000000000000000333333344",
      "0000000000000011000000000000033333333444",
      "0000000001111111111111110333333333333344",
      "4444444411111111111111123333333333333334",
      "4444444411111111111111122333333333333334",
      "4444444411111111111111122333333333333334",
      "4444444411111111111111123333333333333334",
      "4444444441111111111111113333333333333344",
      "4444444444111111111111144333333333333344",
      "4444444444441111111114444433333333333444",
      "4444444444444444444444444443333333333444",
      "4444444444444444444444444444333333334444",
      "4444444444444444444444444444443333344444",
      "4444444444444444444444444444443333344444",
      "4444444444444444444444444444443333344444",
    ],
    entries: { from_route5: [32, 26, 'up'], from_2: [1, 3, 'right'] },
    exits: [
      { at: [31, 27, 3, 1], to: 'kp_route5', entry: 'from_mtkupo' },
      { at: [0, 2, 1, 3], to: 'kp_mtkupo_2', entry: 'from_1' },
    ],
    props: [
      ...cart(26, 3),
      crystal(36, 16, '#8ab8ff', 1.2), crystal(36, 20, '#b08aff'), crystal(37, 8, '#8ab8ff', 1.4), crystal(38, 9, '#b08aff', 1.1), crystal(34, 6, '#8ab8ff'),
      crystal(38, 11, '#a0e0ff', 1.3), crystal(33, 12, '#b08aff'),
      // timber props along the mine level, lamps on posts
      { at: [5.5, 1.6], prop: 'lantern', col: '#ffc860', hang: 1.6, size: 0.8 }, { at: [16.5, 1.6], prop: 'lantern', col: '#ffc860', hang: 1.6, size: 0.8 },
      { at: [27.5, 15.4], prop: 'lantern', col: '#ffc860', hang: 1.6, size: 0.8 }, { at: [12.6, 15.4], prop: 'lantern', col: '#ffc860', hang: 1.6, size: 0.8 },
      // the plank bridge's ropes
      ...ropeBridge(13.6, 15.4, 10.6, 14.4, { h: 0.7 }),
      // stalagmites
      { at: [19.5, 9.5], prop: 'spire', h: 1.2, r: 0.7, col: '#5a4a3e' }, { at: [31.5, 21.5], prop: 'spire', h: 1.4, r: 0.8, col: '#5a4a3e' },
    ],
    lights: [[36, 9, '#8ab8ff', 4], [36, 18, '#a090ff', 3.5], [20, 18, '#ffc070', 4], [14, 3, '#ffc070', 4], [33, 24, '#ffd8a0', 3]],
    npcs: [MK1.ivy.npc, MK1.stone.npc],
    items: [W.item('mk1_grotto', [36, 9], 'glow_nut', 2), W.item('mk1_cart', [25, 4], 'cure_nut')],
    triggers: [MK1.ivy.trig, MK1.stone.trig, W.hidden('mk1_rock', [21, 20], 'hi_oil'),
      W.sign([33, 22], "A miner's chalk mark on the wall: \"RIVER - BRIDGE - RAILS WEST TO THE DEEP LEVEL.\" Someone has added a doodle of a moogle.")],
  });

  // ---- 2F: the lake, the glowing chamber, Team Hojo's dig at the far mouth
  // (the chamber has its own wild table: the map's kpWild is read at every step)
  const inGlow = () => { const p = FF7.fieldScene && FF7.fieldScene.player; return !!p && p.tx <= 11 && p.ty <= 9; };
  const G1 = W.grunt({ id: 'kp_mk_grunt1', name: 'Grunt', at: [5, 23], dir: 'right', team: [['chemmog_chemist', 15], ['minemog_miner', 15]], money: 600,
    line: "You heard the Admin! This mountain's closed for science!", lose: 'The crystals! Somebody save the crystals!', after: 'We were just... sampling. Scientifically.' });
  const G2 = W.grunt({ id: 'kp_mk_grunt2', name: 'Grunt', at: [5, 25], dir: 'right', team: [['huntmog_hunter', 15], ['nutmog_treasure_hunter', 16]], money: 640,
    line: 'Specimen collection! Your moogles would look great in a jar. A nice, roomy jar!', lose: 'My jar collection weeps.', after: '...I still think they\'d look nice in a jar.' });
  const SCARLET = W.trainer({ id: 'kp_mk_scarlet', cls: 'Team Hojo Admin', name: 'Scarlet', model: 'scarlet', at: [2, 24], dir: 'right', music: 'fullscale',   // (Team Hojo's admins: Full-Scale Attack)
    team: [['chemmog_chemist', 15], ['gunmog_gunner', 16], ['minemog_foreman', 17]], money: 1400,
    line: 'Fine, I\'ll do it myself. Watch closely, darling: this is how a professional crushes a pest!', lose: 'My NAILS! Do you know what these cost?!',
    after: 'Team Hojo never forgets a face.' });
  function* mkHojo(s) {
    if (s.flag('kp_r2_scarlet')) return;
    s.stopAnim('kp_mk_grunt1'); s.stopAnim('kp_mk_grunt2');
    yield s.cam(4, 23, 30);
    yield s.say('Grunt', 'Admin Scarlet! The drill hit another seam! Green as a frog and glowing like a lamp!');
    yield s.say('Scarlet', "Kyahaha! Splendid. Professor Hojo wants every mako crystal in this mountain. Feed those to a moogle and... well. You'll see.");
    s.emote('kp_mk_grunt1', '!');
    yield s.say('Grunt', 'Admin! Intruder at the stairs!');
    yield s.face('kp_mk_scarlet', 'player');
    yield s.say('Scarlet', 'A child? With moogles? In MY dig site? ...Boys, make it go away.');
    // the Shinra Recycler (js/kupomon/kp_scrap.js, the user's design): what she means to do with the moogles
    yield s.cam(9, 22, 24);
    s.sfx('cursor'); s.shake(2, 20);
    yield s.say('Scarlet', "And when you're done, feed its moogles to the Recycler. Kyahaha! Shinra's finest: scrap goes in, profit comes out.");
    yield s.say('Grunt', "The Shinra Scrap Metal Recycling Machine! It'll eat anything made of metal, kid. And your moogles are ALL metal!");
    yield s.cam(4, 23, 20);
    s.camFollow(30);
    for (const G of [G1, G2]) {
      if (W.beaten(G.npc.id)) continue;
      yield* G.npc.talk(s);
      if (!W.beaten(G.npc.id)) return;   // (blacked out: back at the Mog Repair)
    }
    yield s.say('Scarlet', "Useless! Both of you! Do I have to do EVERYTHING myself?");
    yield s.move('kp_mk_scarlet', 4, 24);
    yield* SCARLET.npc.talk(s);
    if (!W.beaten('kp_mk_scarlet')) return;
    yield s.say('Scarlet', "Hmph! We have crates enough for the Professor anyway. Pull out, boys! And bring the Recycler: it's company property.\fAnd you... I'll remember that silly hair.");
    s.set('kp_r2_scarlet');
    // the two of them and the Recycler: it doesn't move
    yield s.cam(9, 22, 24);
    yield [s.move('kp_mk_grunt1', [[5, 22], [9, 22]]), s.move('kp_mk_grunt2', [[7, 25], [11, 25], [11, 22]])];
    yield [s.face('kp_mk_grunt1', 'right'), s.face('kp_mk_grunt2', 'left')];
    yield s.say('Grunt', 'Right. On three. One... two... THREE!');
    s.anim('kp_mk_grunt1', 'carry'); s.anim('kp_mk_grunt2', 'carry'); s.sfx('hit'); s.shake(3, 45);
    yield 45;
    s.emote('kp_mk_grunt1', '!!'); s.emote('kp_mk_grunt2', '!!');
    yield s.say('Grunt', "Hnnnnnngh! It won't... BUDGE!");
    s.sfx('hit'); s.shake(4, 30); yield 30;
    s.stopAnim('kp_mk_grunt2'); s.anim('kp_mk_grunt2', 'kneel'); s.emote('kp_mk_grunt2', '...');
    yield s.say('Grunt', "My back! Admin, it weighs more than the drill! It weighs more than the MOUNTAIN!");
    s.stopAnim('kp_mk_grunt1'); s.anim('kp_mk_grunt1', 'weak');
    yield 24;
    yield s.face('kp_mk_scarlet', 'kp_mk_grunt1');
    s.anim('kp_mk_scarlet', 'armscross'); s.emote('kp_mk_scarlet', '!?');
    yield s.say('Scarlet', "Oh, for... LEAVE it! Ditch the junk and MOVE, the pair of you! Kyahaha... ha... HMPH!");
    s.stopAnim('kp_mk_scarlet'); s.stopAnim('kp_mk_grunt1'); s.stopAnim('kp_mk_grunt2');
    s.camFollow(20);
    yield [s.move('kp_mk_scarlet', [[1, 24], [0, 24]], { run: true }), s.move('kp_mk_grunt1', [[9, 23], [2, 23], [0, 23]], { run: true }), s.move('kp_mk_grunt2', [[11, 25], [2, 25], [0, 25]], { run: true })];
    s.remove('kp_mk_scarlet'); s.remove('kp_mk_grunt1'); s.remove('kp_mk_grunt2');
    yield s.say('cloud', '(...Mako crystals. Fed to moogles? What is that Professor up to?)');
    s.sfx('cursor');
    yield s.msg('The Recycler hums to itself. A stencil on its slot reads: FEED ME SCRAP METAL. 5 PIECES A GO.\f(Wild moogles drop Scrap Metal when they power down.)');
  }
  const MK2 = {
    kage: W.trainer({ id: 'kp_mk_kage', cls: 'Ninja', name: 'Kage', model: 'ninja', at: [34, 10], dir: 'left', sight: [29, 10, 5, 1],
      line: 'I have waited in the dark for three days for a worthy foe. ...Also I am a bit lost.', lose: 'Defeated... and still lost.',
      after: 'The stones across the lake wobble. Do not look down. I looked down.', team: [['kurogen_genin', 15], ['nutmog_treasure_hunter', 16]], money: 640 }),
    ozzie: W.trainer({ id: 'kp_mk_ozzie', cls: 'Spelunker', name: 'Ozzie', model: { base: 'man', top: '#7a6a3a', hairStyle: 'helmet', extras: ['goggles', 'suspenders'] }, at: [33, 20], dir: 'left', sight: [29, 20, 4, 1],
      line: 'This old pump hasn\'t run in years. Neither have I! Battle!', lose: 'Out of puff.',
      after: 'Those lab-coat folks came through here with a drill as big as a cart. Rude, too.', team: [['minemog_miner', 15], ['shellmog_guardian', 15], ['minemog_miner', 16]], money: 640 }),
  };
  FF7.defineMap('kp_mtkupo_2', {
    name: 'Mt. Kupo Caves B2F', area: 'Mt. Kupo', theme: 'cave', music: 'lurking', camera: { bounds: false }, kpBg: 'cave', kpCave: true,
    kpWildBase: 'kp_mtkupo_2', kpWildZones: { kp_mtkupo_glow: (P, x, y) => x <= 11 && y <= 9 },   // (the glowing hollow: inGlow)
    get kpWild() { return inGlow() ? 'kp_mtkupo_glow' : 'kp_mtkupo_2'; },
    look: CAVE_LOOK,
    legend: { O: 'roundpillar' },
    grid: [
      "  #########      #######                ",
      " ##UeUeeeU## #####..U..#################",
      "##eeeeeeeee###..........U...........U...",
      "#eeeeeeeeeee^^.R........................",
      "#Ueeeeeeeeee^^..Brrrrrrrrrrrrrrrrrrrrrrr",
      " eeeeeeeeeeU  ...................U......",
      "  eeeeeeeee               ... ^^        ",
      "  eeeeeeeeU                   ^^        ",
      "  Ueeeeeee                  ......      ",
      "    eeeeU  #####~~~~~~~~~~~~ .......R#  ",
      "       .....##~~~~~~~~~~~~~~~~~......#  ",
      "      ......#~~~~~~~~~~~~~~~~~~~.....#  ",
      "     R......~~~~~~~~~~~~~~~~~~~~.....   ",
      "    #.......OOOOOOOO~~OOOO~~OOOO....    ",
      "     .......~~~~~~~OOOO~~OOOO~~~....    ",
      "      ...... ~~~~~~~~~~~~~~~~~~  ..     ",
      "      ....R.  ~~~~~~~~~~~~~~~~   ..     ",
      "       .....    ~~~~~~~~~~~~     .. ### ",
      "       ^^                    .........##",
      "  #### ^^   ##              ...M.....R.#",
      "###............#            ...........#",
      "#U..MM.....BB..U#           ........... ",
      "#..----.........#            R......P.  ",
      "................              .......   ",
      "..............U                         ",
      "...............                         ",
      " ...........o.                          ",
      "  U..........B                          ",
      "   ........                             ",
      "                                        ",
    ],
    heights: [
      "4422222222244444444444444444444444444444",
      "4222222222224444444444444444444444444444",
      "2222222222233444444444444444444444444444",
      "2222222222223344444444444444444444444444",
      "2222222222223344444444444444444444444444",
      "2222222222223444444444444444444444444444",
      "2222222222222444444444444444442244444444",
      "4222222222224444444444444444442221144444",
      "4222222222224440000000000001111111111144",
      "4422222222211000000000000000111111111144",
      "4442222111111000000000000000000111111144",
      "4444111111111000000000000000000011111144",
      "4444111111110000000000000000000011111144",
      "4444111111111111111100111100111111111144",
      "4444111111110000000111100111100011111444",
      "4444111111111000000000000000000111111444",
      "4444411111111000000000000000000011114444",
      "4444412111111000000000000000111111111114",
      "4444442222111440000000000001111111111111",
      "4433333223333333444444444441111111111111",
      "4333333333333333344444444441111111111111",
      "3333333333333333344444444441111111111111",
      "3333333333333333344444444441111111111111",
      "3333333333333333344444444444111111111114",
      "3333333333333333344444444444411111111144",
      "3333333333333333444444444444444444444444",
      "3333333333333333444444444444444444444444",
      "3333333333333334444444444444444444444444",
      "4333333333333344444444444444444444444444",
      "4433333333334444444444444444444444444444",
    ],
    entries: { from_1: [38, 4, 'left'], from_cogsworth: [1, 23, 'right'] },
    exits: [
      { at: [39, 2, 1, 4], to: 'kp_mtkupo_1', entry: 'from_2' },
      { at: [0, 22, 1, 4], to: 'kp_cogsworth', entry: 'from_mtkupo', if: s => s.flag('kp_r2_scarlet'), blocked: say('Grunt', "Hey! Nobody leaves while the Admin's working!") },
    ],
    props: [
      // the glowing chamber's crystals
      crystal(3, 1, '#9af0e8', 1.3), crystal(9, 1, '#c0fff0', 1.1), crystal(1, 4, '#9af0e8', 1.5), crystal(11, 5, '#c0fff0'), crystal(2, 8, '#9af0e8', 1.2),
      crystal(8, 9, '#c0fff0', 1.4), crystal(5, 1, '#9af0e8'), crystal(10, 7, '#c0fff0', 1.2),
      crystal(24, 2, '#8ab8ff'), crystal(36, 2, '#b08aff', 1.2), crystal(20, 1, '#8ab8ff'), crystal(33, 5, '#a0e0ff'),
      // Team Hojo's mako crystals: green, and glowing
      crystal(1, 21, '#50f0a0', 1.4), crystal(2, 27, '#50f0a0', 1.2), crystal(14, 24, '#50f0a0', 1.3), crystal(15, 21, '#50f0a0'),
      // the drill rig, work lamps, the old pump and its pipes
      { at: [4.5, 21], prop: 'machine', col: '#8a3a3a', scale: 1.3 }, { at: [4, 21], prop: 'none' }, { at: [5, 21], prop: 'none' },
      { at: [8.5, 20.4], prop: 'lantern', col: '#f0f0d0', hang: 1.8, size: 0.9 }, { at: [2.4, 25.6], prop: 'lantern', col: '#f0f0d0', hang: 1.8, size: 0.9 },
      ...cart(16, 4),
      { at: [30.5, 7.6], prop: 'lantern', col: '#ffc860', hang: 1.6, size: 0.8 }, { at: [33.5, 17.4], prop: 'lantern', col: '#ffc860', hang: 1.6, size: 0.8 },
      { at: [21.5, 11.5], prop: 'spire', h: 1.0, r: 0.6, col: '#5a4a3e' },
    ],
    lights: [[6, 5, '#7ae0d8', 6], [3, 3, '#a0fff0', 4], [9, 8, '#a0fff0', 4], [8, 23, '#60f0a0', 5], [3, 26, '#60f0a0', 3], [22, 13, '#6090c0', 5], [33, 20, '#ffc070', 4], [30, 4, '#ffc070', 4]],
    npcs: [MK2.kage.npc, MK2.ozzie.npc,
      Object.assign(G1.npc, { show: s => !s.flag('kp_r2_scarlet'), anim: 'kneel', dir: 'left' }),
      Object.assign(G2.npc, { show: s => !s.flag('kp_r2_scarlet'), anim: 'kneel', dir: 'left' }),
      Object.assign(SCARLET.npc, { show: s => !s.flag('kp_r2_scarlet'), dir: 'right' }),
      // the Shinra Recycler: Team Hojo couldn't lift it (js/kupomon/kp_scrap.js: Scrap Metal in, coins and prizes out)
      { id: 'kp_mk_recycler', name: 'Shinra Recycler', model: { prop: 'recycler', scale: 1.25, height: 2.1 }, at: [10, 22], dir: 'down', faceOnTalk: false,   // (its own model, gears and beacon going: kp_scrap.js)
        talk: function* (s) { yield* KP.recycler(s); } },
    ],
    items: [W.item('mk2_glow', [3, 3], 'focus_pom'), W.item('mk2_pump', [35, 21], 'mini_oil', 2)],
    triggers: [MK2.kage.trig, MK2.ozzie.trig,
      { id: 'hojo', at: [3, 19, 9, 2], once: false, if: s => !s.flag('kp_r2_scarlet'), run: mkHojo },
      W.hidden('mk2_shore', [5, 12], 'glow_nut', 2),
      W.hidden('mk2_crate', [11, 21], 'hi_oil', 2),
    ],
  });

  // ================================================================== Cogsworth: the terraced mining town
  // Three terraces climb the mountainside: the lower lane with the houses, the scrap yard and the gate to Route 6; the main
  // street with the Mog Center and the water tower (the cave mouth from Mt. Kupo opens onto it); and the mine yard on top
  // with the pithead, the rails and Barret's dojo in the old ore-sorting works. The slag heap looms over the north-west.
  const CW_MART = FW_MART.concat(['glow_nut', 'hefty_nut', 'cure_nut', 'mini_oil']);
  // the scrap yard's weeds hide a rare Puppetmog among the scrap moogles
  KP.WILD.kp_cogsworth = [['gearmog_tinker', 40, 14, 16], ['minemog_miner', 30, 14, 16], ['gunmog_gunner', 24, 14, 16], ['puppetmog_puppeteer', 6, 15, 16]];
  // Sephiroth, in front of the dojo: Barret's badge is already his. The 5th battle
  function* cwSeph(s) {
    if (s.flag('kp_r2_seph')) return;
    yield s.face('kp_cw_seph', 'player');
    yield s.say('sephiroth', '...Cloud.');
    yield s.face('player', 'kp_cw_seph');
    yield s.say('sephiroth', "Barret's badge. It took me four minutes.\fYou came through the mountain. Then you saw them: Hojo's people, digging for crystals. ...Curious.");
    yield s.say('sephiroth', "Show me what you've learned since Kurotsuki. If anything.");
    const r = yield* W.rival(s, 'sephiroth', 5, { lose: '...Hm. Adequate.', win: 'As expected.' });
    yield s.say('sephiroth', "You've improved. Not enough to matter.\fThe next badge waits in Nibel Peaks. I won't.");
    s.set('kp_r2_seph');
    yield s.move('kp_cw_seph', [[17, 8], [10, 8], [10, 12]]);
    s.remove('kp_cw_seph');
  }
  FF7.defineMap('kp_cogsworth', {
    name: 'Cogsworth', area: 'Cogsworth', theme: 'canyon', music: 'mining', kpWild: 'kp_cogsworth', kpBg: 'mountain',
    look: { floor: ['#9a6e4e', '#946848'], floor2: ['#7e6e5e', '#786858'], wall: '#8a5e40', wallTop: '#7a5038', bldg: '#8a7a68', roof: '#8a4a2a',
      grass: ['#6a7a3a', '#647436'], sky: ['#d88a50', '#f4d4a8'], wallTex: { wall: 'rock', bldg: 'corrugated' }, lamp: '#ffd080' },
    grid: [
      "##########################################",
      "#xxxxxxx....hhhhhhhhhh........rr........##",
      "#xxxxxxx....hhhhhhhhhh.BBo....rr.hhhh...##",
      "#xxxxxxx....hhhhhhhhhh.B......Br.hhhh...##",
      "#xxxxxxx....hwhhhhhhwh........rr.hwhho..##",
      "#xxxxxxx....hhhh++hhhh........rr........##",
      "#xxxxxxx..............rrBrrrrrr.........##",
      "#xxxxxxx..::::::::::::::::::::::::......##",
      "#xxxxxxx..:........................:....##",
      "#xxxxxxxl.:................l.......:..BB##",
      "#xxxxxxx..^^.......................:....##",
      "#.........^^.......................^^...##",
      "#.........:...............hhhhhh...^^...##",
      "#.........:..hhhhh...B....hhhhhh.o...B..##",
      "#.........:..hwhhh....o...hwhhwh........##",
      "#.........:..hh+hh......::hh+hhh::::::::.:",
      "#.........:.............::::::::::::::::.:",
      "#.........:::::::::::::::........l......##",
      "#......................:............QQ..##",
      "#...........l..........:............QQ..##",
      "#...^^.................:................##",
      "#...^^.................:.l..............##",
      "#.....o..............^^^^.......B.......##",
      "#..B...hhhhh.........^^^^...............##",
      "#.B....hwhhh..........:.:::::::.........##",
      "#..l...hh+hh..........:....hhhhh........##",
      ":::::::::::::::::::::::....hwhhh........##",
      ":.::::::::::::::::l::::....hhwhh.===.===##",
      "#.!...............................GGGGGG##",
      "#.................................GxGxGG##",
      "#..................B......o.......GGGGGG##",
      "#...........o.....................GGGGxG##",
      "#.......................................##",
      "##########################################",
    ],
    heights: [
      "777777799999999999999999999999999999999999",
      "766666668888888888888888888888888888888899",
      "767777768888888888888888888888888888888899",
      "768888868888888888888888888888888888888899",
      "768999868888888888888888888888888888888899",
      "768999868888888888888888888888888888888899",
      "768999868888888888888888888888888888888899",
      "768888868888888888888888888888888888888899",
      "767777768888888888888888888888888888888899",
      "766666668888888855555558888888888888888899",
      "755555555555555555555555555555588888888899",
      "655555555555555555555555555555555555555599",
      "655555555555555555555555555555555555555569",
      "655555555555555555555555555555555555555569",
      "655555555555555555555555555555555555555566",
      "655555555555555555555555555555555555555555",
      "655555555555555555555555555555555555555555",
      "655555555555555555555555555555555555555566",
      "655555555555555555555555555555555555555569",
      "655555555555555555555555555555555555555569",
      "622222222255555555555555555555555555555569",
      "322222222222222222222555555555522222222269",
      "322222222222222222222222222222222222222239",
      "322222222222222222222222222222222222222239",
      "322222222222222222222222222222222222222239",
      "322222222222222222222222222222222222222239",
      "222222222222222222222222222222222222222239",
      "222222222222222222222222222222222222222239",
      "322222222222222222222222222222222222222239",
      "322222222222222222222222222222222222222239",
      "322222222222222222222222222222222222222239",
      "322222222222222222222222222222222222222239",
      "322222222222222222222222222222222222222239",
      "333333333333333333333333333333333333333339",
    ],
    entries: { from_mtkupo: [39, 15, 'left'], from_route6: [1, 26, 'right'], from_center: [28, 16, 'down'], from_foreman: [15, 16, 'down'],
      from_house: [9, 26, 'down'], from_dojo: [16, 6, 'down'] },
    exits: [
      { at: [41, 15, 1, 2], to: 'kp_mtkupo_2', entry: 'from_cogsworth' },
      { at: [0, 26, 1, 2], to: 'kp_route6', entry: 'from_cogsworth', ...W.gate(2, 'Gate Guard') },
      { at: [28, 15, 1, 1], to: 'kp_cogsworth_center', entry: 'from_town', sfx: 'door' },
      { at: [15, 15, 1, 1], to: 'kp_cogsworth_foreman', entry: 'from_town', sfx: 'door' },
      { at: [9, 25, 1, 1], to: 'kp_cogsworth_house', entry: 'from_town', sfx: 'door' },
      { at: [16, 5, 2, 1], to: 'kp_cogsworth_dojo', entry: 'from_town', sfx: 'door' },
    ],
    buildings: [
      // the dojo: the old ore-sorting works, a tall tin shed
      { at: [12, 1, 10, 5], h: 2.9, col: '#7a6a5a', roof: '#9a5a32', top: 'shed', tin: '#8a4a2a', win: '#ffc070' },
      { at: [33, 2, 4, 3], h: 2.2, col: '#6a6058', roof: '#7a6a5a', top: 'gable', tin: true, win: '#ffc070' },
      { at: [26, 12, 6, 4], h: 2.4, col: '#c8b8a0', roof: '#c04a3a', top: 'gable', ridge: 'x', tin: '#9a3a2a', win: '#fff0c0', chimney: true },
      { at: [13, 13, 5, 3], h: 2.1, col: '#8a7a68', roof: '#5a6a7a', top: 'gable', tin: true, win: '#ffd890' },
      { at: [7, 23, 5, 3], h: 2.0, col: '#9a8468', roof: '#7a5a3a', top: 'shed', tin: '#8a4a2a', win: '#ffd890' },
      { at: [27, 25, 5, 3], h: 2.0, col: '#7a6e60', roof: '#6a7a5a', top: 'gable', ridge: 'x', tin: true, win: '#ffd890' },
    ],
    props: [
      { at: [2, 28], prop: 'sign', text: 'COGSWORTH' },
      // the pithead: a headframe over the shaft with its great winding wheel; the shaft mouth in the cliff
      { at: [30.5, 1.4], prop: 'pylon', h: 5.2, w: 2.2, top: 1.0, col: '#5a4a3a', thick: 0.06 },
      { at: [30.5, 1.0], prop: 'helm', r: 0.9, h: 5.2, scale: 1.4, col: '#6a5a4a', col2: '#4a3a2a' },
      { at: [30.5, 0.35], prop: 'banner', w: 2.2, h: 1.9, y: 1.95, col: '#0a0806', col2: '#0a0806', border: false },
      rope([30.5, 1.0], [34.5, 3.0], 5.0, { h2: 2.3, sag: 0.1, r: 0.012, col: '#3a3a3a' }),
      // ore carts on the rails
      ...cart(30, 3), ...cart(24, 6),
      // the cave mouth's timbers
      { at: [40.5, 14.4], prop: 'stump', scale: [0.6, 10, 0.6], col: '#5a3a1a' }, { at: [40.5, 16.6], prop: 'stump', scale: [0.6, 10, 0.6], col: '#5a3a1a' },
      // bunting across the main street, lanterns down the stepped street
      rope([12, 17], [24, 17], 2.7, { count: 14, bulbs: ['#e05040', '#f0c040', '#4a8ad0', '#f0f0e0'], sag: 0.3 }),
      rope([25, 16], [39, 16], 2.7, { count: 16, bulbs: ['#e05040', '#f0c040', '#4a8ad0', '#f0f0e0'], sag: 0.3 }),
      { at: [20.6, 22.5], prop: 'lantern', col: '#ffb860', hang: 1.6, size: 0.8 }, { at: [25.4, 22.5], prop: 'lantern', col: '#ffb860', hang: 1.6, size: 0.8 },
      // the water tower, the scrap heaps in the yard
      { at: [36, 18], prop: 'watertower', h: 2.4, col: '#7a5a3a' },
      { at: [35, 29], prop: 'scrap', col: '#7a6a5a', scale: 1.4 }, { at: [37, 29], prop: 'scrap', col: '#8a5a3a', scale: 1.2 }, { at: [38, 31], prop: 'scrap', col: '#6a6a70', scale: 1.5 },
      // benches on the main street
      { at: [20, 18.4], prop: 'bench', w: 2, rot: 180, col: '#6a4a2a' }, { at: [33, 19.4], prop: 'bench', w: 2, rot: 180, col: '#6a4a2a' },
    ],
    labels: [
      { at: [16.5, 5], face: 's', text: 'GUN-ARM ARCADE', size: 0.2, col: '#ff9a30', glow: true, y: 2.25, light: 2 },
      { at: [28.5, 15], face: 's', text: 'MOG CENTER', size: 0.15, col: '#fff0d0', y: 2.0, back: '#7a2a20' },
      { at: [30.5, 1.4], face: 's', text: 'SHAFT 3', size: 0.12, col: '#e8d8a0', y: 1.0 },
    ],
    npcs: [
      { id: 'kp_cw_seph', name: 'Sephiroth', model: 'sephiroth', at: [17, 6], dir: 'down', show: s => !s.flag('kp_r2_seph'), talk: cwSeph },
      { id: 'kp_cw_guard', name: 'Gate Guard', model: { base: 'man', top: '#5a4a3a', hairStyle: 'helmet', extras: ['vest'] }, at: [2, 25], dir: 'right',
        talk: function* (s) {
          if (KP.badgeCount() >= 2) { yield s.say('Gate Guard', "Two badges! Route 6 is all yours. Say hi to the cows in Mogfield. Er, the moogles. They're basically cows."); return; }
          yield s.say('Gate Guard', "Route 6 is ranch land, and the ranchers don't want greenhorns riling their moogles. Two dojo badges, or no entry.\fBarret's up in the mine yard. Go earn it!");
        } },
      { id: 'kp_cw_miner1', name: 'Miner Hal', model: { base: 'man', top: '#6a6a5a', hairStyle: 'helmet', extras: ['suspenders'] }, at: [33, 15], dir: 'left',
        talk: function* (s) {
          if (s.flag('kp_r2_scarlet')) { yield s.say('Miner Hal', "You ran those lab coats out of the mountain? Ha! Drinks are on me. ...Milk. I'm on shift."); return; }
          yield s.say('Miner Hal', "Folks in white coats have been buying mako crystals off anyone who'll sell. Paying double! That's not natural.");
        } },
      { id: 'kp_cw_miner2', name: 'Miner Jo', model: { base: 'woman', top: '#7a5a3a', hairStyle: 'helmet', extras: ['goggles'] }, at: [12, 28], dir: 'up', wander: 2,
        talk: say('Miner Jo', "Team Hojo, they call themselves. Came through town with a drill the size of a cart, asking about 'moogle growth factors'. I asked them to leave. With a shovel.") },
      { id: 'kp_cw_kid', name: 'Boy', model: 'kid6', at: [20, 29], dir: 'down', wander: 2,
        talk: say('Boy', "Barret's got a gun for an arm! It shoots foam darts. He says they're for safety. I got hit by one once. Best day ever.") },
      { id: 'kp_cw_woman', name: 'Woman', model: 'woman4', at: [21, 18], dir: 'down',
        talk: say('Woman', "Past Route 6 is Mogfield. The ranchers there hatch moogles from eggs! Bring two strong ones and they'll show you how.") },
      { id: 'kp_cw_slag', name: 'Old Man', model: 'oldman3', at: [9, 12], dir: 'left',
        talk: say('Old Man', "That slag heap's been growing since my grandpa's day. When the mine ran full tilt, this town hummed all night. Now it's mostly Barret's arcade that hums.") },
      { id: 'kp_cw_engineer', name: 'Engineer', model: { base: 'man', top: '#4a5a6a', extras: ['goggles', 'belt'] }, at: [26, 8], dir: 'down', wander: 1,
        talk: say('Engineer', "Barret's arcade runs on the old sorting belts. Pull a lever and the crates on a belt slide along to the other gap. Watch which gaps open... and which ones close!") },
      { id: 'kp_cw_scrapkid', name: 'Girl', model: 'girl6', at: [33, 26], dir: 'right',
        talk: say('Girl', "Mom says not to play in the scrap yard. There's a puppet moogle in there that dances when nobody's looking. I SAW it!") },
      W.moogle('kp_cw_mog1', 'gearmog_tinker', [24, 19], { line: 'Gearmog: Kupo! (It is tightening a bolt on the bench. The bench was fine.)' }),
      W.moogle('kp_cw_mog2', 'minemog_miner', [16, 9], { line: 'Minemog: Kupo kupo! (Its tiny pickaxe tings off a cart.)' }),
    ],
    triggers: [
      { id: 'seph5', at: [8, 6, 16, 4], once: false, if: s => !s.flag('kp_r2_seph'), run: cwSeph },
      W.sign([2, 28], 'COGSWORTH\fThe town that dug the mountain.   West: Route 6 to Mogfield (two badges, please).   East: Mt. Kupo.'),
      W.hidden('cw_slag', [8, 4], 'hefty_nut'),
    ],
  });
  W.mogCenter('kp_cogsworth_center', { name: 'Cogsworth Mog Center', town: 'kp_cogsworth', back: 'from_center', mart: CW_MART, decor: 'metal',
    look: { wall: '#8a7a68', floor: ['#7a6a5a', '#746454'] },
    npcs: [{ id: 'kp_cwc_trainer', name: 'Trainer', model: 'man7', at: [9, 5], dir: 'left',
      talk: say('Trainer', "Barret's Gearmogs and Gunmogs are Machinists: sturdy, but a Monk's fists or a Black Mage's spells crack them open.") }] });
  W.house('kp_cogsworth_foreman', {
    name: "Foreman's House", area: 'Cogsworth', town: 'kp_cogsworth', back: 'from_foreman', decor: 'rustic', music: 'mining',
    grid: [
      "############",
      "#B.o..b..k.#",
      "#..........#",
      "#.t....F...#",
      "#.........B#",
      "#####+######",
    ],
    npcs: [
      { id: 'kp_cw_foreman', name: 'Foreman Dale', model: { base: 'man', build: 'big', top: '#5a4a3a', hairStyle: 'buzz', extras: ['mustache', 'vest'] }, at: [7, 2], dir: 'down',
        talk: function* (s) {
          yield s.say('Foreman Dale', "Thirty years I ran Shaft 3. Then the seam ran dry and the bosses ran off. Barret stayed, though. Turned the sorting works into that racket of an arcade.");
          if (s.flag('kp_r2_scarlet')) yield s.say('Foreman Dale', "I heard what you did in the caves. Those crystals belong to the mountain, not some professor's test tubes.");
          else yield s.say('Foreman Dale', "Somebody's been drilling in the deep level at night. If I were twenty years younger...");
          if (s.flag('kp_cw_foreman_gift')) return;
          s.set('kp_cw_foreman_gift'); KP.give('hefty_nut', 2); s.sfx('found');
          yield s.msg('Received 2 Hefty Nuts!');
          yield s.say('Foreman Dale', "Hefty Nuts. The bigger your moogle is next to a wild one, the better they taste. Don't ask me why. Moogles are weird.");
        } },
    ],
  });
  W.house('kp_cogsworth_house', {
    name: "Miner's House", area: 'Cogsworth', town: 'kp_cogsworth', back: 'from_house', decor: 'rustic', music: 'mining',
    npcs: [
      { id: 'kp_cw_mom', name: 'Mrs. Pike', model: 'woman6', at: [3, 2], dir: 'right',
        talk: say('Mrs. Pike', "My husband rides the ore carts all day. He comes home covered in dust and says 'Kupo.' I think the moogles are rubbing off on him.") },
      { id: 'kp_cw_son', name: 'Tim', model: 'kid3', at: [8, 3], dir: 'left',
        talk: say('Tim', "When I grow up I'm gonna battle Barret! Right now I just battle my sister. She wins.") },
    ],
  });

  // ================================================================== Dojo 2: the Gun-Arm Arcade (Barret)
  // The old ore-sorting floor. Three conveyor belts cross the hall (raised belts you can't climb), each with gaps a
  // crate slides along between; levers drive the belts.
  //   Belt A (the first, by the door): one crate, which sits in the WEST gap X or the EAST gap Y. Red lever (by the door):
  //     red ON  -> the crate slides east: X open, Y shut.   red OFF (the start) -> X shut, Y open.
  //   Belt B (the middle): gap Z, west side. Blue lever (in the west hall, past X): ON -> Z open.
  //   Belt C (Barret's stage): the double gap Q. Yellow lever (in the east hall, past Y): ON -> Q open.
  //   The middle floor is cut in two by the old ore press: the east hall (yellow lever) is reached only through Y, the
  //   west hall (blue lever, gap Z north) only through X.
  // SOLUTION: walk through Y (open at the start) into the east hall, beat Engineer Gil, pull the YELLOW lever (Q opens);
  // back through Y, pull the RED lever by the door (X opens, Y shuts); through X into the west hall, beat Mechanic Rosa,
  // pull the BLUE lever (Z opens); through Z, beat Foreman Rigg; through Q to Barret. (Every lever can be pulled back,
  // so any order can be fixed by walking back and flipping again.)
  const fl = (f) => !!(FF7.state && FF7.state.flags && FF7.state.flags[f]);
  const crateM = { prop: 'crate', col: '#c89a30' };
  const lever = (id, at, flag, col, on, off) => W.toggle(id, at, flag, { model: { prop: 'lever', col, n: 1 }, sfx: 'gate',
    msg: s => s.flag(flag) ? on : off });
  const D2 = {
    gil: W.trainer({ id: 'kp_d2_gil', cls: 'Engineer', name: 'Gil', model: { base: 'man', top: '#4a5a6a', hairStyle: 'short', extras: ['goggles', 'belt'] }, at: [25, 11], dir: 'down', sight: [17, 13, 12, 3],
      line: "Welcome to the east hall! The yellow lever's right behind me. You'll have to get through my Gearmogs first!", lose: 'My gears... stripped...',
      after: 'Yellow drives the stage belt. Pull it, then find your way round to the middle belt.', team: [['gearmog_tinker', 14], ['minemog_miner', 15]], money: 600, noBag: true, bg: 'dojo' }),
    rosa: W.trainer({ id: 'kp_d2_rosa', cls: 'Mechanic', name: 'Rosa', model: { base: 'woman', top: '#7a3a2a', hairStyle: 'bun', extras: ['apron', 'goggles'] }, at: [5, 11], dir: 'down', sight: [1, 13, 12, 3],
      line: "You found the west hall! Most folks give up at the first belt. Let's see your moogles' torque!", lose: 'Ha! Nicely tuned.',
      after: "Blue opens the middle belt's gap. Barret's on the far side of the stage belt.", team: [['gunmog_gunner', 15], ['gearmog_tinker', 15]], money: 640, noBag: true, bg: 'dojo' }),
    rigg: W.trainer({ id: 'kp_d2_rigg', cls: 'Foreman', name: 'Rigg', model: { base: 'man', build: 'big', hairStyle: 'helmet', extras: ['beard', 'vest'] }, at: [11, 6], dir: 'down', sight: [1, 7, 13, 2],
      line: "Last shift before the boss! Thirty years of mining, kid. My Minemogs dig deep!", lose: 'Cave-in! ...On me.',
      after: "Barret's waiting. He's louder than the ore press, but he's fair.", team: [['minemog_miner', 15], ['minemog_foreman', 16]], money: 680, noBag: true, bg: 'dojo' }),
  };
  const BARRET = W.master({ id: 'kp_d2_barret', name: 'Barret', model: 'barret', at: [14, 2], badge: 2,
    team: [['gearmog_engineer', 17], ['gunmog_gunner', 18], ['minemog_foreman', 18], ['gunmog_gun_arm', 20]],
    intro: "HAH! So you're the one makin' all that racket on my belts! Name's Barret, master of the Gun-Arm Arcade!\fMy moogles are built like the mountain: tough, loud, and they don't quit! You want the Gear Badge? Then show me some STEEL!",
    lose: "Damn! ...Heh. Nah, that's a good kind of damn. You earned it, kid.",
    after: "That Gear Badge means you can handle machines that bite back. Route 6 is open to ya now. Take care of those moogles, ya hear?\fAnd if you see them lab-coat creeps again, give 'em one from me!",
    reward: [['boost_machinist', 1]] });
  FF7.defineMap('kp_cogsworth_dojo', {
    name: 'Gun-Arm Arcade', area: 'Cogsworth', theme: 'reactor', music: 'barret', kpBg: 'dojo',
    look: { floor: ['#5e5a54', '#58544e'], floor2: ['#6a5a40', '#64543a'], wall: '#6e5e4c', trim: '#3a3028', wallTop: '#2a2420', sky: ['#000000', '#000000'],
      ambient: [0.44, 0.42, 0.4], light: [0.82, 0.74, 0.62], fog: null, mako: '#ff9030', lamp: '#ffc070' },
    legend: { '=': 'block', '1': 'pinball', '2': 'jukebox', '3': 'punchbag' },
    grid: [
      "##############################",
      "#1.1.2..................2.1.1#",
      "#............................#",
      "#3..........................3#",
      "#=============--=============#",
      "#............................#",
      "#............................#",
      "#............................#",
      "#............................#",
      "#=====-======================#",
      "#............MMMM............#",
      "#............MMMM............#",
      "#............PPPP............#",
      "#............MMMM............#",
      "#............MMMM............#",
      "#............PPPP............#",
      "#=====-================-=====#",
      "#............................#",
      "#............................#",
      "#..........................1.#",
      "#.B..........................#",
      "##############++##############",
    ],
    heights: [
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "011111111111110011111111111110",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "011111011111111111111111111110",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "011111011111111111111110111110",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
    ],
    entries: { from_town: [14, 20, 'up'] },
    exits: [{ at: [14, 21, 2, 1], to: 'kp_cogsworth', entry: 'from_dojo', sfx: 'door' }],
    props: [
      // the belts: rollers along each belt block
      ...[4, 9, 16].flatMap(y => Array.from({ length: 28 }, (_, i) => i + 1).filter(x => !(y === 4 && (x === 14 || x === 15)) && !(y === 9 && x === 6) && !(y === 16 && (x === 6 || x === 23)))
        .map(x => ({ at: [x, y], prop: 'grate' }))),
      // hazard paint in the gaps, the stage's spotlight disc, the arcade's neon
      { at: [14.5, 2], prop: 'disc', r: 2.4, h: 0.06, col: '#3a3030', top: '#5a3a2a', ring: '#ff9030' },
      { at: [14.5, 0.6], prop: 'neon', text: 'GUN-ARM ARCADE', col: '#ff9030', y: 2.0, size: 0.3 },
    ],
    labels: [
      { at: [6, 16.5], text: 'A', size: 0.18, col: '#f0c030' }, { at: [23, 16.5], text: 'A', size: 0.18, col: '#f0c030' },
      { at: [6, 9.5], text: 'B', size: 0.18, col: '#4a8af0' }, { at: [14.5, 4.5], text: 'C', size: 0.18, col: '#f0e040' },
    ],
    lights: [[14, 2, '#ffb060', 6], [6, 12, '#ffc070', 5], [23, 12, '#ffc070', 5], [14, 18, '#ffc070', 6], [14, 7, '#ffc070', 6]],
    npcs: [BARRET, D2.gil.npc, D2.rosa.npc, D2.rigg.npc,
      { id: 'kp_d2_guide', name: 'Dojo Guide', model: { base: 'man', top: '#e0a030', hairStyle: 'cap', extras: ['shades'] }, at: [17, 19], dir: 'left',
        talk: function* (s) {
          if (s.flag('kp_badge_2')) { yield s.say('Dojo Guide', "The Gear Badge! Barret hasn't stopped grinning. Well, he's scowling. That's his grin."); return; }
          yield s.say('Dojo Guide', "Yo, future champ! Welcome to the Gun-Arm Arcade!\fThe three belts are too high to climb. Each one's got gaps, and the crates on 'em slide when you pull a lever.\fThe red lever's right here by the door. Where the crate goes, the gap closes. Think about which hall you need first!");
          yield s.say('Dojo Guide', "Oh, and it's trainer battles in there, so no bag items. Your moogles' held items work, though. Good luck!");
        } },
    ],
    objects: [
      lever('kp_d2_red', [11, 17], 'kp_d2_red', '#e03030', 'You pull the RED lever. Belt A rumbles... the crate slides EAST into gap Y. Gap X is open!', 'You push the RED lever back. Belt A rumbles... the crate slides WEST into gap X. Gap Y is open!'),
      lever('kp_d2_blue', [2, 11], 'kp_d2_blue', '#3070e0', 'You pull the BLUE lever. Belt B whirs... the crate slides off along the belt. Gap Z is open!', 'You push the BLUE lever back. The crate rolls back into gap Z.'),
      lever('kp_d2_yellow', [27, 11], 'kp_d2_yellow', '#e0c020', 'You pull the YELLOW lever. Far to the north, belt C clanks... the stage gap is open!', 'You push the YELLOW lever back. Belt C clanks shut.'),
      // the crates (gates): A's one crate in X or Y; B's in Z or moved aside; C's pair in Q or moved aside
      W.barrier('kp_d2_gx', [6, 16], () => fl('kp_d2_red'), crateM), W.barrier('kp_d2_gy', [23, 16], () => !fl('kp_d2_red'), crateM),
      W.barrier('kp_d2_gz', [6, 9], () => fl('kp_d2_blue'), crateM), W.barrier('kp_d2_gz2', [8, 9], () => !fl('kp_d2_blue'), crateM),
      W.barrier('kp_d2_gq1', [14, 4], () => fl('kp_d2_yellow'), crateM), W.barrier('kp_d2_gq2', [15, 4], () => fl('kp_d2_yellow'), crateM),
      W.barrier('kp_d2_gq3', [11, 4], () => !fl('kp_d2_yellow'), crateM), W.barrier('kp_d2_gq4', [12, 4], () => !fl('kp_d2_yellow'), crateM),
    ],
    triggers: [D2.gil.trig, D2.rosa.trig, D2.rigg.trig,
      W.sign([27, 19], "A battered arcade cabinet: \"GUN-ARM GALLERY - HIGH SCORE: BARRET\". Every score on the board is Barret's."),
    ],
  });

  // ================================================================== Route 6: the farmland
  // A patchwork of fields between hedgerows: the wheat field you wade through (its scarecrows are not all scarecrows),
  // the vegetable rows, the fenced pasture with the barn, haystacks, the mill stream and its watermill, an orchard, and
  // the timber windmill on its terraced knoll (stairs spiral up; ledges hop back down the east side).
  KP.WILD.kp_route6 = [['farmmog_farmer', 22, 14, 17], ['redpom_red_mage', 20, 14, 17], ['gearmog_tinker', 18, 14, 16],
    ['bluemog_blue_mage', 14, 15, 17], ['gunmog_gunner', 12, 15, 17], ['chocomog_rider', 10, 15, 17], ['mopluff_bard', 4, 14, 16]];
  // a windmill's four sails, strung from cables in the plane of the tile row cz: the hub hub metres over y0 (m), R metres long
  const sails = (cx, cz, y0, hub, R, spar = '#4a3a2a', cloth = '#f2ece0') => {
    const out = [], X = (m) => cx + m / 0.5;
    const ln = (x0, h0, x1, h1, r, col) => out.push({ at: [X(x0), cz], to: [X(x1), cz], h: hub + h0, h2: hub + h1, y0, sag: 0, r, count: 1, col });
    for (const [a, b] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
      const ux = a * Math.SQRT1_2, uy = b * Math.SQRT1_2, vx = -uy, vy = ux;
      ln(0, 0, ux * R, uy * R, 0.03, spar);
      for (const k of [0.1, 0.2, 0.28]) ln(ux * R * 0.25 + vx * k, uy * R * 0.25 + vy * k, ux * R + vx * k, uy * R + vy * k, 0.011, cloth);
      for (const t of [0.25, 0.5, 0.75, 1]) ln(ux * R * t, uy * R * t, ux * R * t + vx * 0.28, uy * R * t + vy * 0.28, 0.011, cloth);
    }
    out.push({ at: [cx, cz], prop: 'bush', col: spar, scale: 0.4, y0: y0 + hub - 0.1 });
    return out;
  };
  const SCARECROW = { base: 'man', top: '#9a7a40', sleeve: '#8a6a34', bottom: '#4a5a7a', hair: '#e0c870', hairStyle: 'cap', extras: ['vest'] };
  const scarecrow = (id, at) => ({ id, name: 'Scarecrow', model: SCARECROW, at, dir: 'down',
    talk: function* (s) { yield s.msg('A scarecrow in a straw hat. Its button eyes stare at nothing.\f...Probably.'); } });
  const R6 = {
    tobias: W.trainer({ id: 'kp_r6_tobias', cls: 'Youngster', name: 'Tobias', model: SCARECROW, at: [9, 16], dir: 'up', sight: [4, 13, 11, 2],
      line: "BOO! Ha! Got you! I'm not a scarecrow at all! I'm a TRAINER scarecrow!", lose: 'I should have stayed a regular scarecrow.',
      after: "The crows aren't scared of me. The moogles aren't either. Nobody is.", team: [['redpom_red_mage', 15], ['bluemog_blue_mage', 15], ['gearmog_tinker', 15]], money: 600 }),
    dolly: W.trainer({ id: 'kp_r6_dolly', cls: 'Cowgirl', name: 'Dolly', model: { base: 'woman', top: '#c04a3a', bottom: '#3a4a7a', hair: '#c88a3a', hairStyle: 'ponytail', extras: ['redcap', 'vest'] }, at: [30, 12], dir: 'down', sight: [30, 13, 1, 4],
      line: "Yee-haw! Fresh trainer on the trail! Let's see if you can ride as hard as my Chocomog!", lose: 'Well, slap my saddle. You can ride!',
      after: 'The Kupo Ranch in Mogfield raises moogles from eggs. Bring two good ones and the rancher works his magic.', team: [['chocomog_rider', 16], ['farmmog_farmer', 15]], money: 640 }),
    hank: W.trainer({ id: 'kp_r6_hank', cls: 'Farmer', name: 'Hank', model: { base: 'man', top: '#4a6a8a', bottom: '#4a4a5a', hair: '#8a6a3a', hairStyle: 'cap', extras: ['suspenders', 'beard'] }, at: [12, 24], dir: 'left', sight: [3, 24, 9, 1],
      line: "Hey! Get off my carrots! ...Oh, you're on the path. Well, battle me anyway!", lose: "Shucks. Beaten by a city slicker.",
      after: 'Farmmogs plant seeds with their pom-poms. Takes forever. Very cute, though.', team: [['farmmog_farmer', 15], ['farmmog_harvester', 17]], money: 680 }),
    mae: W.trainer({ id: 'kp_r6_mae', cls: 'Picnicker', name: 'Mae', model: 'girl7', at: [12, 6], dir: 'left', sight: [6, 6, 6, 2],
      line: "The view from the windmill is the best in the isles! Battle first, view after!", lose: 'Aww. My sandwiches got squished.',
      after: "From the top you can hop down the east side, ledge by ledge. It's the fastest way down. And the most fun!", team: [['mopluff_dancer', 16], ['redpom_red_mage', 16]], money: 640 }),
    edison: W.trainer({ id: 'kp_r6_edison', cls: 'Tinker', name: 'Edison', model: { base: 'man', top: '#5a5a6a', hair: '#e8e8e8', hairStyle: 'tuft', extras: ['goggles', 'apron'] }, at: [22, 22], dir: 'down', sight: [20, 23, 6, 2],
      line: "Eureka! A test subject! I mean, a worthy opponent! My mechanical moogles await!", lose: 'Back to the drawing board...',
      after: "The watermill grinds the ranch's moogle feed. I keep its gears oiled. Gearmogs love the smell.", team: [['gearmog_tinker', 16], ['gunmog_gunner', 17]], money: 680 }),
  };
  FF7.defineMap('kp_route6', {
    name: 'Route 6', area: 'Route 6', theme: 'grass', music: 'fiddle', kpWild: 'kp_route6', kpBg: 'grass',
    look: { grass: ['#6a9a3a', '#649436'], floor: ['#6a9a3a', '#649436'], wall: '#7a6a50', dirt: ['#9a7a52', '#92724a'], water: '#3a7ab0', bldg: '#a02a22' },
    legend: { '2': 'block' },
    grid: [
      "TTTTTTTTTTTTTTTTTTT~~TTTTTTTTTTTTTTTTTTT",
      "TT,,,,,,,,,,,,,,,,,~~,,,,,,,,,,,,,,,,,TT",
      "T,,,,,,,,,,,,,,,R,,~~,,,,=============,T",
      "T,,,,,,,hh,,,,,,,,,~~,,,,=,,,,,,hhhhh=,T",
      "T,,,,,,,hh,,,,,,,,,~~,,,,=,,,,,,hhhhh=,T",
      "T,,,,,,,,,,,,,,,,,,~~,,,,=,,,,,,hhhhh=,T",
      "T,,,^,,,,^,,,,,,f,,~~,,f,=,,,,,,,,,,,=,T",
      "T,,,,,,,,,,,,,,,,f,~~,,,,=,,,,,,,,,,,=,T",
      "T,,,,,,,,,,,,,,,,,,~~,,,,=,,,,,,,,,,,=,T",
      "T,,,,,,,,,,,,,,,,,~~,,,,,=,,,,,,,,,,,=,T",
      "T,,,,,,,,,,^,,,,,,~~,,,,,======,======,T",
      "T,%%%%%%%%%,%%%%,,~~,,%,,,,,,,,,,,,,,,,T",
      "T,GGGGGGGGGGGGG%,,~~,,,,,,,%%,,,,,,,,,,T",
      "T,GGGGGGGGGGGGGdddKKddddd,,,,%,,,,,,,!,T",
      "T,GGGGGGGGGGGGGdddKKdddddd,,,,,,,,,,,,,T",
      "T,GGGGGGGGGGGGG%,,~~,,,,dddddddddddddddd",
      "ddGGGGGGGGGGGGG%,,~~,,,,,ddddddddddddddd",
      "ddGGGGGGGGGGGGG%,,~~,,,,,,,,,,,,,,,,,,,T",
      "T,GGGGGGGGGGGGR%,,~~,,,,,,%,,,,,,,,,,,,T",
      "T,GGGGGGGGGGGGG%,,,~~hhhh,,%%%,,%%%%%,,T",
      "T,GGGGGGGGGGGGG%,,,~~hhhh,,,,,,,,,,,,,,T",
      "T%%%%%%%,%%%%%%%,,,~~hhhh,,,2,,2,,2,,,,T",
      "T,,,,,,,,,,,,,,,,,,~~,,,,,,,,GG,GG,GG,,T",
      "T,,%f%f%f%f%,,,,,,,~~,,,,,,,,GG,GG,GG,,T",
      "T,,,,,,,,,,,,,,,f,,~~,f,,,,,2,,2,,2GG,,T",
      "T,,%f%f%f%f%,,,,,,,~~,,,O,,,,GG,GG,GG,,T",
      "T,,,,,,,,,,,,f,,,,,~~,,,,,,,,GG,GG,,,,,T",
      "TT,%f%f%f%f%,,,,,,,~~,,R,,,,2,,2,,2,,,TT",
      "TTT,,,,,,,,,,,,,,,,~~,,,,,,,,,,,,,,,,TTT",
      "TTTTTTTTTTTTTTTTTTT~~TTTTTTTTTTTTTTTTTTT",
    ],
    heights: [
      "1111111111111111111001111111111111111111",
      "1111333333333331111001111111111111111111",
      "1113335555555333111001111111111111111111",
      "1113355777775533111001111111111111111111",
      "1113355777775533111001111111111111111111",
      "1113355777775533111001111111111111111111",
      "1113355555555533111001111111111111111111",
      "1113335555555333111001111111111111111111",
      "1111333333333331111001111111111111111111",
      "1111133333333311110011111111111111111111",
      "1111111111111111110011111111111111111111",
      "1111111111111111110011111111111111111111",
      "1111111111111111110011111111111111111111",
      "1111111111111111111111111111111111111111",
      "1111111111111111111111111111111111111111",
      "1111111111111111110011111111111111111111",
      "1111111111111111110011111111111111111111",
      "1111111111111111110011111111111111111111",
      "1111111111111111110011111111111111111111",
      "1111111111111111111001111111111111111111",
      "1111111111111111111001111111111111111111",
      "1111111111111111111001111111111111111111",
      "1111111111111111111001111111111111111111",
      "1111111111111111111001111111111111111111",
      "1111111111111111111001111111111111111111",
      "1111111111111111111001111111111111111111",
      "1111111111111111111001111111111111111111",
      "1111111111111111111001111111111111111111",
      "1111111111111111111001111111111111111111",
      "1111111111111111111001111111111111111111",
    ],
    entries: { from_cogsworth: [38, 15, 'left'], from_mogfield: [1, 16, 'right'] },
    exits: [
      { at: [39, 15, 1, 2], to: 'kp_cogsworth', entry: 'from_route6' },
      { at: [0, 16, 1, 2], to: 'kp_mogfield', entry: 'from_route6' },
    ],
    buildings: [
      // the windmill: a dark timber smock mill with a grey cap
      { at: [8, 3, 2, 2], h: 2.6, col: '#5a4030', roof: '#6a6a6a', top: 'hip', rise: 0.9, over: 0.18, tex: 'siding', win: '#ffd890' },
      // the barn (red, white trim) and the watermill (stone and timber)
      { at: [32, 3, 5, 3], h: 2.2, col: '#a8322a', roof: '#5a5a5a', top: 'gable', ridge: 'x', rise: 1.0, tex: 'siding', win: false },
      { at: [21, 19, 4, 3], h: 2.0, col: '#9a8a74', roof: '#7a4a2a', top: 'gable', ridge: 'z', rise: 0.8, tex: 'stoneblock', win: '#ffd890', chimney: true },
    ],
    props: [
      { at: [37, 13], prop: 'sign', text: 'ROUTE 6' },
      ...sails(8.5, 4.66, 2.1, 2.55, 1.35),
      // haystacks (round yellow bales), the watermill's wheel, fruit trees, scarecrow posts
      ...[[27, 12], [28, 12], [29, 13], [22, 11], [26, 18]].map(([x, y]) => ({ at: [x, y], prop: 'bush', col: '#d8b858', scale: 1.15 })),
      { at: [20, 20], prop: 'helm', r: 0.75, h: 0.55, scale: 1.4, rot: 90, col: '#6a4a2a', col2: '#4a3a2a' },
      ...[[28, 21], [31, 21], [34, 21], [28, 24], [31, 24], [34, 24], [28, 27], [31, 27], [34, 27]].map(([x, y], i) => ({ at: [x, y], prop: 'planter', r: 0.32, h: 0.04, col: '#5a8a34', col2: i % 2 ? '#4a8a30' : '#5a9a38', plant: 'tree', treeH: 2.2 })),
      { at: [24, 25], prop: 'well', col: '#3a7ab0' },
    ],
    npcs: [R6.tobias.npc, R6.dolly.npc, R6.hank.npc, R6.mae.npc, R6.edison.npc,
      scarecrow('kp_r6_crow1', [5, 15]), scarecrow('kp_r6_crow2', [12, 18]), scarecrow('kp_r6_crow3', [6, 19]),
      { id: 'kp_r6_miller', name: 'Miller Grist', model: { base: 'oldman', top: '#e8e0d0', extras: ['apron'], hairStyle: 'cap' }, at: [10, 3], dir: 'down',
        talk: say('Miller Grist', "Up here the wind never stops! My mill grinds oats for the whole valley. The moogles at the ranch eat like you wouldn't believe.") },
      W.moogle('kp_r6_cow1', 'farmmog_farmer', [28, 5], { line: 'Farmmog: Kuuupo. (It is chewing something. Thoughtfully.)' }),
      W.moogle('kp_r6_cow2', 'chocomog_rider', [34, 8], { line: 'Chocomog: Kweh-po! (It stamps its little feet.)' }),
    ],
    items: [W.item('r6_mill', [7, 5], 'leftover_nut'), W.item('r6_orchard', [36, 27], 'golden_nut', 2), W.item('r6_wheat', [3, 19], 'hi_oil')],
    triggers: [R6.tobias.trig, R6.dolly.trig, R6.hank.trig, R6.mae.trig, R6.edison.trig,
      ledge([11, 3, 3], 'right', 1), ledge([13, 3, 3], 'right', 1), ledge([15, 3, 3], 'right', 1),
      W.hidden('r6_hay', [28, 12], 'oil_nut', 3),
      W.sign([37, 13], 'ROUTE 6 - THE KUPO VALE\fWest: Mogfield and the Kupo Ranch.   East: Cogsworth.\fPlease close the pasture gate behind you.'),
    ],
  });

  // ================================================================== Mogfield: the ranch town
  // Wide open ranch land at a crossroads: the Kupo Ranch's big red barn up on its yard (breeding), corrals full of
  // moogles, silos and the hay barn, a duck pond with reeds, the Mog Center in a farmhouse, a farmer's vegetable patch.
  // North to Route 7 and the mountains; east back to Route 6.
  const MF_MART = CW_MART.concat(['fancy_nut', 'oil_nut', 'focus_pom']);
  const shadeTree = (x, y, k = 1) => ({ at: [x, y], prop: 'planter', r: 0.3, h: 0.04, col: '#5a8a34', col2: '#4a8a30', plant: 'tree', treeH: 2.6 * k });
  FF7.defineMap('kp_mogfield', {
    name: 'Mogfield', area: 'Mogfield', theme: 'grass', music: 'cinco_chocobo',
    look: { grass: ['#76a442', '#70a03e'], floor: ['#76a442', '#70a03e'], floor2: ['#b09068', '#a88a62'], floorTex: { floor2: 'dirt' }, wall: '#8a7458', dirt: ['#a8865a', '#a08054'], water: '#4a8ac0', bldg: '#b03428', roof: '#5a5a5e' },
    legend: { '2': 'block' },
    grid: [
      "TTTTTTTTTTTTTTTTTTTddTTTTTTTTTTTTTTTTTTT",
      "T::::::::::::::,,,,dd,,,,,,,,,,,,,,,,,TT",
      "T::hhhhhhhhh:::,,,,dd,,,,22,22,,hhhhhh,T",
      "T::hhhhhhhhh:::,,f,dd,,%,22,22,,hhhhhh,T",
      "T::hhhhhhhhh:::,,,%dd,,,,,,,,,,,hhhhhh,T",
      "T::hhhh++hhh:::,,,,dd,,,%,,,,,%,hhhhhh,T",
      "T::::::::::::::,f,,dd,,,,,,,,,,,hhhhhh,T",
      "T::::::::::::::,,,,dd,%,,,,,,,,%,,,,,,,T",
      "T,,,,,,,,^^,,,,,,,,dd,,,,,,,,,,,,,,,,,,T",
      "T,,,,,,,,,,dddddddddd,,222,f,,,,,,,,f,,T",
      "T,,,,,,,,,,dddddddddd,,222,,,,,,,,,%,,,T",
      "T,========,===,,,,,dd,,O,,,,,,,,,,f,,,,T",
      "T,=,,,,=,,,,,=,,,,,dd,,,,,,,,,,,,,,,,,,T",
      "T,=,,,,=,,,,,=,,,,,dd======,,,========,T",
      "T,=,,,,,,,,,,,,,,,,ddddddddddddddddddddd",
      "T,=,,,,=,,,,,=,,,,,ddddddddddddddddddddd",
      "T,=,,,,=,,,,,=,,,,,dd,,,,,,,,,,,,,,,,,,T",
      "T,=,,,,=,,,,,=,,ddddd!,,,,,,,,,,,,,,,,,T",
      "T,============hhhhh,d,,,,,,hhhhh,%f%f%,T",
      "T,,,,,,,,,,,,,hhhhh,d,,,,,,hhhhh,,,,,,,T",
      "T,,G,~~~~~,,,,hhhhh,d,,,,,,hhhhh,%f%f%,T",
      "T,,,~~~~~~~G,,hh+hh,d,,,,O,hh+hh,,,,,,,T",
      "T,G~~~~~~~~~,,,,d,,,d,,,,,,,,d,,,%f%f%,T",
      "T,,~~~~~~~~~G,,,dddddddddddddd,,,,,,,,,T",
      "T,,,~~~~~~~,,,,,,,,,,hhhh,,,,,,,,%f%f%,T",
      "T,,G,~~~~~,G,,,,,,,,,hhhh,,,,,,,,,,,,,,T",
      "T,,,,,,,,,G,,f,,,,,,,h+hh,,,,,,,,f,,f,,T",
      "T,,,,,,,,,,,,,,,f,,,,,d,,,%,,,,,,,,,,,TT",
      "TT,,,,,,,,,,,,,,,,,,,,d,,,,,,,,,,,,,,,TT",
      "TT%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%TT",
    ],
    heights: [
      "1111111111111111111111111111111111111111",
      "1222222222222221111111111111111111111111",
      "1222222222222221111111111111111111111111",
      "1222222222222221111111111111111111111111",
      "1222222222222221111111111111111111111111",
      "1222222222222221111111111111111111111111",
      "1222222222222221111111111111111111111111",
      "1222222222222221111111111111111111111111",
      "1111111111111111111111111111111111111111",
      "1111111111111111111111111111111111111111",
      "1111111111111111111111111111111111111111",
      "1111111111111111111111111111111111111111",
      "1111111111111111111111111111111111111111",
      "1111111111111111111111111111111111111111",
      "1111111111111111111111111111111111111111",
      "1111111111111111111111111111111111111111",
      "1111111111111111111111111111111111111111",
      "1111111111111111111111111111111111111111",
      "1111111111111111111111111111111111111111",
      "1111111111111111111111111111111111111111",
      "1111100000111111111111111111111111111111",
      "1111000000011111111111111111111111111111",
      "1110000000001111111111111111111111111111",
      "1110000000001111111111111111111111111111",
      "1111000000011111111111111111111111111111",
      "1111100000111111111111111111111111111111",
      "1111111111111111111111111111111111111111",
      "1111111111111111111111111111111111111111",
      "1111111111111111111111111111111111111111",
      "1111111111111111111111111111111111111111",
    ],
    entries: { from_route6: [38, 14, 'left'], from_route7: [19, 1, 'down'], from_ranch: [7, 6, 'down'], from_center: [16, 22, 'down'],
      from_farm: [29, 22, 'down'], from_house: [22, 27, 'down'] },
    exits: [
      { at: [39, 14, 1, 2], to: 'kp_route6', entry: 'from_mogfield' },
      { at: [19, 0, 2, 1], to: 'kp_route7', entry: 'from_mogfield' },
      { at: [7, 5, 2, 1], to: 'kp_mogfield_ranch', entry: 'from_town', sfx: 'door' },
      { at: [16, 21, 1, 1], to: 'kp_mogfield_center', entry: 'from_town', sfx: 'door' },
      { at: [29, 21, 1, 1], to: 'kp_mogfield_farm', entry: 'from_town', sfx: 'door' },
      { at: [22, 26, 1, 1], to: 'kp_mogfield_house', entry: 'from_town', sfx: 'door' },
    ],
    buildings: [
      // the Kupo Ranch: a big red barn with a steep grey roof and a hay loft
      { at: [3, 2, 9, 4], h: 2.8, col: '#b03428', roof: '#5a5a5e', top: 'gable', ridge: 'x', rise: 1.5, over: 0.2, tex: 'siding', win: '#fff0c0' },
      { at: [32, 2, 6, 5], h: 2.4, col: '#a8322a', roof: '#6a6a6e', top: 'gable', ridge: 'z', rise: 1.3, over: 0.2, tex: 'siding', win: false },
      // the Mog Center farmhouse (white, a red roof), the farmer's house (yellow), the kid's house (blue)
      { at: [14, 18, 5, 4], h: 2.2, col: '#ece4d4', roof: '#c04a3a', top: 'hip', rise: 1.0, tex: 'siding', win: '#fff0c0', chimney: true },
      { at: [27, 18, 5, 4], h: 2.1, col: '#e0c070', roof: '#7a5a3a', top: 'gable', ridge: 'x', rise: 0.9, tex: 'siding', win: '#fff0c0', chimney: true },
      { at: [21, 24, 4, 3], h: 2.0, col: '#7a9ac0', roof: '#4a4a5a', top: 'gable', ridge: 'x', rise: 0.8, tex: 'siding', win: '#fff0c0' },
    ],
    props: [
      { at: [21, 17], prop: 'sign', text: 'MOGFIELD' },
      // the silos, the parked chocobo wagon, hay bales, shade trees, the hay loft's pulley
      { at: [25.5, 2.5], prop: 'tank', r: 1.9, h: 4.2, col: '#c8c8c0', text: '1', rust: false }, { at: [28.5, 2.5], prop: 'tank', r: 1.9, h: 3.6, col: '#b8b8b0', text: '2' },
      { at: [24, 9.5], vehicle: 'wagon', scale: 0.55, rot: 90 },
      ...[[23, 3], [24, 5], [30, 5], [31, 7], [22, 7]].map(([x, y]) => ({ at: [x, y], prop: 'bush', col: '#d8b858', scale: 1.1 })),
      shadeTree(16.5, 13.5, 1.2), shadeTree(26.5, 24.5), shadeTree(12.5, 27.5), shadeTree(36.5, 16.5, 1.1),
      // the pond's ducks are NPCs; lily pads on the water
      { at: [6, 22], prop: 'disc', r: 0.4, h: 0.01, col: '#3a8a3a', top: '#4a9a40', rim: '#3a7a30' }, { at: [9, 23], prop: 'disc', r: 0.35, h: 0.01, col: '#3a8a3a', top: '#4a9a40', rim: '#3a7a30' },
      { at: [5, 24], prop: 'disc', r: 0.3, h: 0.01, col: '#3a8a3a', top: '#4a9a40', rim: '#3a7a30' },
      { at: [13, 22.6], prop: 'bench', w: 2, rot: -90, col: '#6a4a2a' },
    ],
    labels: [
      { at: [7.5, 5], face: 's', text: 'KUPO RANCH', size: 0.22, col: '#f8f0dc', y: 2.4, back: '#5a1a14' },
      { at: [16, 21], face: 's', text: 'MOG CENTER', size: 0.12, col: '#c04a3a', y: 2.0 },
    ],
    npcs: [
      { id: 'kp_mf_hand', name: 'Ranch Hand', model: { base: 'man', top: '#8a4a3a', bottom: '#3a4a6a', hairStyle: 'cap', extras: ['vest'] }, at: [9, 7], dir: 'down',
        talk: function* (s) {
          yield s.say('Ranch Hand', "Rancher Mog's inside the big barn. Bring him two moogles of Lv 10 or more and they'll leave you an egg!");
          yield s.say('Ranch Hand', "Most young'uns take after their first parent. But some pairs make something brand new. I've seen a Machinist and a Thief hatch a little gunslinger!\fAnd a Warrior with a Black Mage? Swords that cast spells. Wild stuff.");
        } },
      { id: 'kp_mf_bess', name: 'Farmer Bess', model: { base: 'woman', build: 'big', top: '#6a8a3a', bottom: '#4a4a5a', hair: '#c8a060', hairStyle: 'bun', extras: ['apron'] }, at: [34, 21], dir: 'left',
        talk: function* (s) {
          if (s.flag('kp_mf_bess_gift')) { yield s.say('Farmer Bess', "How are those nuts treating you? A glazed one for a moogle that's had a hard fight, a fancy one for a special friend."); return; }
          yield s.say('Farmer Bess', "Well now! A trainer who walked all the way from Cogsworth. You must be starving. ...Oh, you meant the moogles. They're starving too!");
          s.set('kp_mf_bess_gift'); KP.give('oil_nut', 1); KP.give('fancy_nut', 1); s.sfx('found');
          yield s.msg('Received an Oil-Glazed Nut and a Fancy Nut!');
          yield s.say('Farmer Bess', "A moogle that joins you over the glazed one comes fully mended. And the fancy one? Pure luxury. Any moogle that joins over it comes out a little stronger.");
        } },
      { id: 'kp_mf_kid', name: 'Boy', model: 'kid7', at: [12, 24], dir: 'left', wander: 1,
        talk: say('Boy', "The ducks here aren't moogles. I checked. Twice. ...They were very rude about it.") },
      { id: 'kp_mf_old', name: 'Old Rancher', model: { base: 'oldman', top: '#7a5a3a', hairStyle: 'cap', extras: ['beard', 'vest'] }, at: [22, 16], dir: 'down',
        talk: function* (s) {
          yield s.say('Old Rancher', "North of here the road climbs into the mountains. Route 7, then Nibel Peaks. Bring a scarf. The snow comes down halfway up.");
          if (s.flag('kp_r2_seph')) yield s.say('Old Rancher', "A tall fellow with silver hair came through a while back. Didn't stop for pie. Who doesn't stop for pie?");
        } },
      { id: 'kp_mf_cowboy', name: 'Wagon Driver', model: { base: 'man', top: '#c0a060', bottom: '#4a3a2a', hair: '#3a2a1a', hairStyle: 'cap', extras: ['mustache'] }, at: [26, 11], dir: 'left',
        talk: say('Wagon Driver', "Every week I haul moogle feed to Cogsworth. The chocobo pulls, I steer, the moogles ride on top and sing. Mostly off-key.") },
      { id: 'kp_mf_silo', name: 'Silo Keeper', model: 'woman8', at: [27, 5], dir: 'down',
        talk: say('Silo Keeper', "Silo One is oats. Silo Two is also oats. The moogles have very simple tastes. And very big appetites.") },
      { id: 'kp_mf_duck1', name: 'Duck', model: 'bird', at: [10, 20], dir: 'left', wander: 1, talk: function* (s) { yield s.msg('Quack.'); } },
      { id: 'kp_mf_duck2', name: 'Duck', model: 'bird2', at: [2, 24], dir: 'right', wander: 1, talk: function* (s) { yield s.msg('Quack quack!'); } },
      W.moogle('kp_mf_mog1', 'farmmog_farmer', [4, 14], { wander: 1, line: 'Farmmog: Kupo! (It offers you a carrot. It is a little chewed.)' }),
      W.moogle('kp_mf_mog2', 'chocomog_rider', [10, 15], { wander: 1, line: 'Chocomog: Kweh-po! (It trots in a circle, very pleased with itself.)' }),
      W.moogle('kp_mf_mog3', 'mopluff_bard', [5, 16], { wander: 1, line: 'Mopluff: Kupo kupo! (It hums to the other moogles in the pen.)' }),
      W.moogle('kp_mf_mog4', 'tufty_freelancer', [11, 13], { wander: 1, line: 'Tufty: Kupo? (It looks at you as if you might have a job for it.)' }),
    ],
    triggers: [
      W.sign([21, 17], 'MOGFIELD - HOME OF THE KUPO RANCH\fNorth: Route 7 to Nibel Peaks.   East: Route 6 to Cogsworth.\fThis week at the ranch: \"Egg-cellent results, or your moogles back!\"'),
      W.hidden('mf_pond', [12, 23], 'sprout_nut', 2),
    ],
  });
  W.mogCenter('kp_mogfield_center', { name: 'Mogfield Mog Center', town: 'kp_mogfield', back: 'from_center', mart: MF_MART, decor: 'cosy',
    npcs: [{ id: 'kp_mfc_relearn', name: 'Memory Mog', model: { enemy: 'kp_tomekin_scholar', scale: 0.85 }, at: [7, 1], dir: 'down', talk: function* (s) { yield* KP.relearner(s); } },   // (the Move Relearner)
      { id: 'kp_mfc_cowgirl', name: 'Cowgirl', model: 'woman9', at: [9, 5], dir: 'left',
      talk: say('Cowgirl', "A Focus Pom! Hold one and your moogle might hang on with 1 HP when it should've gone down. Saved my Chocomog's hide a dozen times.") }] });
  // the Kupo Ranch: the barn's inside: stalls, nests of eggs, the hay loft ladder, Rancher Mog at his counter (breeding)
  const rancher = function* (s) { if (KP.breed) yield* KP.breed(s); else yield s.say('Rancher Mog', "The egg nests aren't ready yet, kupo! Come back soon."); };
  W.house('kp_mogfield_ranch', {
    name: 'Kupo Ranch', area: 'Mogfield', town: 'kp_mogfield', back: 'from_ranch', decor: 'rustic', music: 'cinco_chocobo',
    grid: [
      "##################",
      "#B.=..=..=..=...B#",
      "#..=..=..=..=....#",
      "#................#",
      "#..DDD.......jjj.#",
      "#................#",
      "#BB............B.#",
      "########+#########",
    ],
    door: [8, 7],
    look: { floor: ['#9a7a4a', '#927244'], wall: '#8a3a2a' },
    props: [
      ...[[1, 1], [16, 1], [1, 6], [2, 6], [15, 6]].map(([x, y]) => ({ at: [x, y], prop: 'bush', col: '#d8b858', scale: 1.05 })),
      ...[[13, 4], [14, 4], [15, 4]].map(([x, y]) => ({ at: [x, y], prop: 'jar', col: '#f4ecd8', size: 0.9 })),
      { at: [13, 3], prop: 'kp_mognetpad' },   // (the MogNet pad: the swap's moogles walk on and off it, js/kupomon/kp_trade.js)
    ],
    extra: { kpMognetPad: [13, 3] },   // (the MogNet pad's tile: W.house keeps a map's own keys under extra)
    npcs: [
      { id: 'rancher', name: 'Rancher Mog', model: { enemy: 'kp_farmmog_harvester', scale: 0.9 }, at: [4, 3], dir: 'down', talk: rancher },
      { id: 'kp_mfr_helper', name: 'Egg Sitter', model: 'girl8', at: [12, 5], dir: 'up',
        talk: say('Egg Sitter', "Shh! These eggs are almost ready. Every one hatches a little different. Rancher Mog says the parents' best moves get passed down.") },
      // the ranch's other jobs: back to the wild (a fee), and the MogNet Swap (a moogle for a moogle, sight unseen)
      { id: 'kp_mfr_hand', name: 'Ranch Hand', model: { base: 'man', top: '#6a8a3a', hairStyle: 'cap' }, at: [9, 5], dir: 'up', talk: function* (s) { yield* KP.ranchRelease(s); } },
      { id: 'kp_mfr_mognet', name: 'MogNet Mog', model: { enemy: 'kp_mogpost_ranger', scale: 0.85 }, at: [15, 3], dir: 'left', talk: function* (s) { yield* KP.mognetSwap(s); } },
      // Coach Mog: after the Kupo League (his arrival: KP.coachIntro)
      { id: 'kp_mfr_coach', name: 'Coach Mog', model: { enemy: 'kp_kupochi_master', scale: 0.85 }, at: [7, 3], dir: 'down', show: s => s.flag('kp_champion') && s.flag('kp_coach_intro'), talk: function* (s) { yield* KP.coach(s); } },
      W.moogle('kp_mfr_mog1', 'farmmog_farmer', [4, 1], { wander: 0, line: 'Farmmog: Kupo... (It is snoozing in the straw.)' }),
      W.moogle('kp_mfr_mog2', 'pomsprout_whitemage', [10, 1], { wander: 0, line: 'Pomsprout: Kupo! (It is patching up a sleepy Farmmog next door.)' }),
      W.moogle('kp_mfr_mog3', 'mopluff_bard', [14, 2], { wander: 0, line: 'Mopluff: Kupo kupo! (It is singing to the eggs.)' }),
    ],
    triggers: [{ at: [3, 4, 3, 1], on: 'talk', run: rancher }],
    onEnter: function* (s) { yield* KP.coachIntro(s); },   // (the Champion's first visit: Coach Mog arrives)
  });
  W.house('kp_mogfield_farm', {
    name: "Farmer's House", area: 'Mogfield', town: 'kp_mogfield', back: 'from_farm', decor: 'cosy', music: 'cinco_chocobo',
    npcs: [
      { id: 'kp_mf_husband', name: 'Mr. Bess', model: 'man8', at: [3, 2], dir: 'right',
        talk: say('Mr. Bess', "Everybody calls me Mr. Bess. I've stopped correcting them. My wife grows the best carrots in the isles, and she knows it.") },
      { id: 'kp_mf_cat', name: 'Cat', model: 'cat', at: [8, 3], dir: 'left', talk: function* (s) { yield s.msg('Mrow. (The cat ignores you magnificently.)'); } },
    ],
  });
  W.house('kp_mogfield_house', {
    name: 'House', area: 'Mogfield', town: 'kp_mogfield', back: 'from_house', decor: 'cosy', music: 'cinco_chocobo',
    npcs: [
      { id: 'kp_mf_eggkid', name: 'Poppy', model: 'girl9', at: [6, 2], dir: 'down',
        talk: say('Poppy', "I'm keeping this egg warm until it hatches! Rancher Mog says it'll be a Mopluff. I'm going to name it Sir Fluffington the Third.") },
    ],
  });
})();
