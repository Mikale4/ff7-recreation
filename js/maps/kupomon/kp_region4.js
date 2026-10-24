// Kupomon, region 4 (docs/KUPOMON_WORLD.md "Region 4", Lv 22-30): Route 10 (the coast road east from Skyport),
// Bloomhaven (Dojo 5: Aeris), Route 11 (the marsh), Ravenmoor (Dojo 6: Vincent; Sephiroth 8), Route 12 and the
// Lifestream Tower (Hojo's finale, Jenomog), Route 13 and Summit Road (the 6-badge gate, Victory Road), Route 14
// (the Champion's Bridge), the Kupo Coliseum (the Leagues; Zack 9), and after the Gold League: the Northern Crater
// (Ultimog, Omegamog) and Mognet Tower (Bahamog). Maps kp_*: they run in Kupomon's sandbox. Dialogue in our own words.
(function () {
  const KP = FF7.kupomon, W = KP.W;

  // ------------------------------------------------------------------ shared pieces
  // a one-way ledge the reach checks can see (W.ledge, tagged)
  const ledge = (at, dir = 'down', drop = 2) => Object.assign(W.ledge(at, dir, drop), { _ledge: [dir, drop] });
  // a stable pseudo-random number per tile (prop variety)
  const rnd = (x, y, k = 0) => { const s = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); };
  // props for every tile of the given characters: spec[ch](x, y) -> a props entry (without `at`)
  const deco = (grid, spec) => {
    const out = [];
    grid.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const f = spec[row[x]]; if (f) out.push(Object.assign({ at: [x, y] }, f(x, y))); } });
    return out;
  };
  // the coloured flower beds (bushes in bloom) and palms, shared by several maps
  const BLOOM = { 1: '#e0405a', 2: '#f0d040', 3: '#9a5ad0', 4: '#f4b8d4', 5: '#f08a30', 6: '#5a8ae0' };
  const bed = (col) => (x, y) => ({ prop: 'bush', col, scale: 0.78 + rnd(x, y) * 0.12 });
  const BEDS = { 1: bed(BLOOM[1]), 2: bed(BLOOM[2]), 3: bed(BLOOM[3]), 4: bed(BLOOM[4]), 5: bed(BLOOM[5]), 6: bed(BLOOM[6]) };
  const BED_LEGEND = { 1: 'bush', 2: 'bush', 3: 'bush', 4: 'bush', 5: 'bush', 6: 'bush' };
  const palm = (x, y) => ({ prop: 'canopy', r: 0.9 + rnd(x, y) * 0.4, h: 2.1 + rnd(x, y, 1) * 0.8, col: '#3e8a3a', col2: '#8a6a44' });
  // everything sold before (docs/KUPOMON_WORLD.md Builder's guide: Bloomhaven and later). Listed shelf by shelf here;
  // the Mart's screen sorts them into the bag's pockets
  const SHELVES = [
    ['Kupo Nuts', ['kupo_nut', 'golden_nut', 'royal_nut', 'sprout_nut', 'quick_nut', 'roast_nut', 'familiar_nut', 'sleepy_nut']],
    ['Special nuts', ['glow_nut', 'spell_nut', 'tough_nut', 'wild_nut', 'hefty_nut', 'oil_nut', 'fancy_nut']],
    ['Oils and repairs', ['oil_can', 'hi_oil', 'max_oil', 'battery', 'fixit']],
    ['Held items', ['leftover_nut', 'lucky_pom', 'quick_gear', 'focus_pom', 'cure_nut', 'mini_oil', 'gamblers_coin']],
    ['Boosters (Freelancer-Black Mage)', ['freelancer', 'warrior', 'knight', 'monk', 'thief', 'dragoon', 'ranger', 'blackmage'].map(t => 'boost_' + t)],
    ['Boosters (White Mage-Machinist)', ['whitemage', 'redmage', 'summoner', 'timemage', 'bard', 'beast', 'machinist'].map(t => 'boost_' + t)],
  ];
  const MART_ALL = [].concat(...SHELVES.map(s => s[1]));
  // (one Mart screen for all of it: its pocket tabs sort the stock as the bag does, and the list scrolls, js/kupomon/kp_menu.js)
  const martMenu = (clerk, hello) => function* (s) {
    yield s.say(clerk, hello || 'Welcome to the Mart, kupo! We stock a bit of everything out here.');
    const at = s.field && s.field.map && s.field.map.id;
    const chips = KP.chipStock ? KP.chipStock(at) : [], held = KP.heldStock ? KP.heldStock(at) : [];   // (its Skill Chips, the expansion's held items)
    yield KP.shop(Array.from(new Set(MART_ALL.concat(held, chips))), { name: clerk });
    yield s.say(clerk, 'Thanks for stopping by, kupo!');
  };
  // a Mog Center with the full Mart (W.mogCenter, then its clerk and counter sell all of it)
  const center = (id, def) => {
    W.mogCenter(id, Object.assign({ mart: MART_ALL }, def));
    const m = FF7.maps[id], talk = martMenu('Mart Mog', def.hello);
    m.npcs.find(n => n.id === 'merchant').talk = talk;
    m.triggers[1].run = talk;
  };
  const say = (who, line) => function* (s) { yield s.say(who, line); };
  // a townsperson: { id, name, model, at, dir, wander, lines (one string, or a function(s) -> string), show }
  const folk = (o) => ({ id: o.id, name: o.name, model: o.model, at: o.at, dir: o.dir || 'down', wander: o.wander || 0, anim: o.anim, show: o.show, faceOnTalk: o.faceOnTalk,
    talk: o.talk || function* (s) { const t = typeof o.lines === 'function' ? o.lines(s) : o.lines; yield s.say(o.name, t); } });
  const SWIM = (base, col, extra) => Object.assign({ base, top: col, bottom: col, sleeve: 'skin', legs: 'skin', skirt: false, shoes: true }, extra || {});
  // the S.S. Moogle (js/maps/kupomon/kp_ssmoogle.js): the grand liner between the quay on Route 10 and Costa del Kupo,
  // the tournaments' island. Her gangway leads aboard from either quay (a ticket, Prof. Sith's gift to the new Champion:
  // flag kp_ss_ticket); the Captain on her Bridge sails her across, and she lies at the other quay when you walk off.
  // The liner is js/gl/vehicles.js's ocean_liner at its field size (scale 1); her shell door (model z 2.2, m.door) meets
  // the gangway prop on the quay
  const STEWARD = { base: 'man', top: '#f4f0e8', jacket: '#f4f0e8', bottom: '#1a1e2a', hairStyle: 'slick', extras: ['bowtie'] };
  const gangwayTalk = (there) => function* (s) {
    if (!s.flag('kp_ss_ticket')) { yield s.say('Gangway Steward', "Good day! This is the S.S. Moogle, the grandest liner on the Kupo Isles. She sails between the Seabreeze Coast and Costa del Kupo, the tournament isle.\fTicket holders only, I'm afraid. They do say the Kupo League's Champion gets one."); return; }
    yield s.say('Gangway Steward', `Welcome aboard, Champion! Up the gangway, if you please. The Captain's on the Bridge, top deck forward: tell him when you'd like to sail for ${there}.\fDo have a look round while you're aboard. She's a floating palace, and every deck is open to you.`);
  };
  const ticketCheck = function* (s) { yield s.say('Gangway Steward', "Ticket, please! ...Ah. No ticket, no passage, I'm afraid. They say the Kupo League's Champion gets one."); };
  const boardIf = (s) => s.flag('kp_ss_ticket');
  // the quays' camera: eased back (and lower) while you're on the quay, so all of her fits, funnels and all; eased in
  // again when you step back on shore (step triggers over the quay and the head of the pier)
  const quayCam = (at, out) => ({ at, once: false, run: function* (s) {
    const c = s.field && s.field.cam; if (!c) return;
    const d1 = out ? 13.5 : 9.5, p1 = out ? 41 : 50;
    if (Math.abs((c.dist || 0) - d1) < 0.05 && Math.abs((c.pitch || 0) - p1) < 0.05) return;
    s.parallel(function* () { const d0 = c.dist, p0 = c.pitch; for (let i = 1; i <= 36; i++) { const k = i / 36, e = k * k * (3 - 2 * k); c.dist = d0 + (d1 - d0) * e; c.pitch = p0 + (p1 - p0) * e; yield 1; } });
  } });

  // ================================================================== Route 10: Seabreeze Coast
  // From Skyport's cliffs (west) a road drops down switchback stairs to a boardwalk along the dunes, east to Bloomhaven.
  // Below the boardwalk: the beach (stairs, or hop the gap in the rail), a stranded cargo ship, a pier, tide pools on
  // a rock shelf, and a hidden cove under the cliff.
  KP.WILD.kp_route10 = [['halomog_cleric', 20, 22, 24], ['petalmog_florist', 20, 22, 24], ['seamog_captain', 16, 23, 25], ['angler_harpooner', 14, 22, 25],
    ['shellmog_guardian', 12, 22, 25], ['mogpirate_sky_pirate', 10, 23, 25], ['halomog_bishop', 4, 24, 25], ['petalmog_maiden', 4, 24, 25]];
  const R10T = [
    W.trainer({ id: 'r10_brine', cls: 'Sailor', name: 'Brine', model: 'sailor2', at: [16, 4], dir: 'left', sight: [12, 3, 4, 3],
      line: "Ahoy! Came down the cliff road from Skyport, did you? Sky legs are fine. Let's see your sea legs!",
      lose: 'Sunk without a trace...', after: "The wind off this coast never quits. My Captain says it's good for the pom-pom.",
      team: [['seamog_captain', 24], ['mogpirate_sky_pirate', 23]], money: 960 }),
    W.trainer({ id: 'r10_daisy', cls: 'Picnicker', name: 'Daisy', model: 'woman4', at: [30, 7], dir: 'down', sight: [30, 8, 1, 2],
      line: "Off to Bloomhaven? Me too! But first, a warm-up. Flower power!",
      lose: 'My bouquet... it wilted.', after: "The flower fields are just past the dunes. You can smell them from here!",
      team: [['petalmog_florist', 23], ['halomog_cleric', 23], ['mopluff_dancer', 24]], money: 960 }),
    W.trainer({ id: 'r10_coral', cls: 'Swimmer', name: 'Coral', model: SWIM('woman6', '#30a0c0'), at: [25, 16], dir: 'left', sight: [19, 16, 6, 1],
      line: "The water's lovely! You'd know if you ever took your boots off. Battle me instead?",
      lose: "Washed up. Literally.", after: "Shellmogs nap in the tide pools. Don't wake them unless you mean it.",
      team: [['angler_harpooner', 23], ['shellmog_guardian', 23], ['halomog_cleric', 22]], money: 920 }),
    W.trainer({ id: 'r10_gill', cls: 'Fisher', name: 'Gill', model: 'oldman2', at: [23, 23], dir: 'up', sight: [22, 20, 2, 3],
      line: "Shh! You'll scare the fish. ...Too late. Fine, you're my catch of the day!",
      lose: 'The one that got away...', after: "Twenty years on this pier. Caught a Harpooner once. Well, it caught me.",
      team: [['angler_harpooner', 24], ['seamog_captain', 23], ['angler_harpooner', 24]], money: 960 }),
  ];
  const R10 = [
      "  TTTTTTTTRRRRRRRRRRPPRR  RRPPR  RPPRR  ",
      " T,,%,,,,TRR:::::RRPssGGsssssssssGGssP  ",
      " T,,GGG,,,RR:::::RRssssssGGssssssssssR  ",
      ",,,,GGG,,,^^:::::RRssss^ssssssss^sssss  ",
      ",,,GGGG,,,^^:::::RRsssssssssssssssssss  ",
      ",,,GGG,,,,^^:::::RRssGGssssssssssssPss  ",
      " T,,,,%,!RRRR^^RRRRssssssGGGsssssssssP  ",
      " TT,,,,TTRRRR^^RRRRsssssssssssssssssss  ",
      " RRRRRRRRRRKKKKKKKKKKKKKKKKKKKKKKKKKKKKK",
      " RRRRRRRRRRKKKKKKKKKKKKKKKKKKKKKKKKKKKKK",
      "~~~ssssssss=========^^=====KK=====^^====",
      "~~~sssPsssssssssssss^^sssssssshhhs^^ssss",
      "~~~ssssssssssssAsssssssssAsssshhhsssssss",
      "~~~sssssssssssssssPsssssssssssssssssssss",
      "~~~sssssRssssssssssssssssss:R:::~~::::RR",
      "~~~ssssssssssssssssssssssss::::~~~:R::RR",
      "~~~ssssssssss$$$$$$ssssssss:R::~~:::~RRR",
      "~~~sssPssssss$$$$$$ssssssss::::::R:~~RRR",
      "~~~ssssssssss$$$$$$ssssssss:~~:::::R:RR~",
      "~~~sssssss~~~~~~~~~sssKKsss::::~~::RRR~~",
      "~~~ssss~~~~~~~~~~~~~~~KK~~~~~~:::RR~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~KK~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~KK~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~KK~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~KK~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~KK~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~KK~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~K~~~~~~KK~~~~~~~~~~~~~~~~",
      "~~~~BbKKKKbKKKKKKKbKKKKK~~~~~~~~~~~~~~~~",
      "~~~~BBKKKKKKlKKKKKKKlKKK~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      " ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ ",
  ];
  FF7.defineMap('kp_route10', {
    name: 'Route 10', area: 'Route 10', theme: 'beach', music: 'costadelsol', kpWild: 'kp_route10', kpBg: 'beach',
    look: { grass: ['#8a9a50', '#82924a'], wreck: 'cargo_ship', floor2: ['#7a766e', '#726e66'], wood: ['#9a7a50', '#8a6a44'], floorTex: { floor2: 'rock' } },
    grid: R10,
    heights: [
      "0066666666444444444222222222222222222200",
      "0666666666664444444222222222222222222200",
      "0666666666664444444222224444444422222200",
      "6666666666554444444222234444444432222200",
      "6666666666554444444222224444444422222200",
      "6666666666554444444222222222222222222200",
      "0666666666444334444222222222222222222200",
      "0666666666444334444222222222222222222200",
      "0222222222222222222222222222222222222222",
      "0222222222222222222222222222222222222222",
      "0000000000022222222211222222222222112222",
      "0000000000000000000011000000000000110000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
    ],
    legend: { P: 'canopy', b: 'bollard', l: 'quaylamp', B: 'quaycrate' },
    props: deco(R10, { P: palm, A: (x) => ({ prop: 'tent', col: ['#e05a5a', '#f0d050', '#5aa0e0'][x % 3] }) })
      .concat([{ at: [15, 17], turn: 14, lift: -0.25 },
        // the S.S. Moogle, moored starboard side to the quay with her bow at the pier; her gangway from the shell door
        // (model z 2.2: x 12.8, the hull's side at row 27) down to its foot on the quay; mooring lines to the bollards
        { at: [7.9, 24.5], vehicle: 'ocean_liner', rot: 90, y0: -0.67 },
        { at: [15, 27.02], prop: 'gangway', dx: -2.7, dz: -0.45, rise: 0.48 },
        { at: [5, 28], to: [3, 26.5], h: 0.24, h2: 0.95, col: '#e8dcc0', sag: 0.12 },
        { at: [10, 28], to: [8, 26.5], h: 0.24, h2: 0.95, col: '#e8dcc0', sag: 0.12 },
        { at: [18, 28], to: [17, 26.1], h: 0.24, h2: 1.0, col: '#e8dcc0', sag: 0.1 }]),
    buildings: [{ at: [30, 11, 3, 2], h: 1.6, col: '#e8e0d0', roof: '#d04a3a', top: 'hip', win: '#ffe8b0' }],
    labels: [{ at: [31, 11], face: 's', text: 'LIFEGUARD', size: 0.11, col: '#c03030', y: 1.1 }],
    entries: { from_skyport: [1, 4, 'right'], from_bloomhaven: [38, 8, 'left'], from_ship: [15, 28, 'down'] },
    exits: [
      { at: [0, 3, 1, 3], to: 'kp_skyport', entry: 'from_route10' },
      { at: [39, 8, 1, 2], to: 'kp_bloomhaven', entry: 'from_route10' },
      // up the gangway: the starboard shell door on her Promenade Deck (the Captain sails her: docs/RUNNER.md "Travel links")
      { at: [15, 27, 1, 1], to: 'kp_ss_promenade', entry: 'from_route10', sfx: 'door', if: boardIf, blocked: ticketCheck },
    ],
    onLoad: s => { s.setVar('kp_ss_port', 'route10'); },   // (the S.S. Moogle lies here whenever you see her here: her doors and the Captain follow)
    npcs: [R10T[0].npc, R10T[1].npc, R10T[2].npc, R10T[3].npc,
      { id: 'r10_steward', name: 'Gangway Steward', model: STEWARD, at: [16, 28], dir: 'left', talk: gangwayTalk('Costa del Kupo') },
      folk({ id: 'r10_porter', name: 'Porter', model: { base: 'man', top: '#a82020', jacket: '#a82020', bottom: '#2a1a1a', hairStyle: 'cap', hair: '#a82020' }, at: [8, 29], dir: 'up',
        lines: "Look at her! Four funnels, sixteen lifeboats, and a ballroom you could land an airship in. They don't build them like the S.S. Moogle any more. Well, they built one. This one." }),
      folk({ id: 'r10_comber', name: 'Beachcomber', model: 'oldman3', at: [11, 15], dir: 'right',
        lines: "That's the Mog Marie. Ran aground in a storm twenty years back, hold full of Kupo Nuts.\fThe nuts are long gone, but the Mogpirates still poke around her deck. Old habits, I suppose." }),
      folk({ id: 'r10_guard', name: 'Lifeguard', model: SWIM('man4', '#e05030'), at: [33, 13], dir: 'down',
        lines: "Mind the tide pools! Shellmogs sit in them and look exactly like rocks. Until you step on one.\fBloomhaven? Straight along the boardwalk. Follow your nose: it smells like a perfume shop." }),
      folk({ id: 'r10_kid', name: 'Kid', model: 'kid3', at: [24, 14], dir: 'down', anim: 'kneel', faceOnTalk: false,
        lines: "I'm building a sand Coliseum! The real one's way up north, past the mountains. Only the champs get to go." }),
      W.moogle('r10_mog1', 'seamog_sailor', [20, 15], { wander: 3, line: 'Seamog: Kupo-hoy! It salutes smartly.' }),
      W.moogle('r10_mog2', 'petalmog_florist', [35, 5], { wander: 2, line: 'Petalmog: Kupo~! It smells of sweet peas.' }),
    ],
    items: [W.item('r10_cove', [4, 18], 'golden_nut', 3), W.item('r10_wreck', [19, 18], 'boost_thief'), W.item('r10_crest', [27, 2], 'lucky_pom'), W.coins('r10_balcony', [11, 9], 600)],
    triggers: [W.sign([8, 6], 'ROUTE 10 - SEABREEZE COAST\fWest: Skyport, the town in the clouds.\fEast: Bloomhaven, the Flower Town.'),
      W.hidden('r10_pool', [34, 18], 'max_oil'), ledge([27, 10, 2], 'down', 2), ledge([25, 4, 6], 'down', 2)].concat(R10T.map(t => t.trig))
      .concat([quayCam([4, 20, 20, 10], true), quayCam([19, 18, 8, 2], false)]),
  });
  // ================================================================== Bloomhaven: the Flower Town
  // A ring of streets round a lake. The church crowns a hill to the north-west, its slope terraced into bands of
  // red, gold, violet and white blooms; a canal runs down from the marsh through the town into the lake, with a branch
  // east; tulip fields in stripes to the south-west; on an island in the lake, the glass greenhouse of the Flower
  // Arcade (Dojo 5: Aeris). West: Route 10. North (the Bloom Badge): Route 11.
  const BH = [
      "TTTTTTTTTTTTTTTTTTTTTT~~TTTTTT..TTTTTTTT",
      "TT,,hhhhhhh,,%,T,,%,,,~~,,,,%=..=,,,,,,T",
      "TT,,ahhhhha,,,,Thhhh,,~~,,,,,=..=hhhhh,T",
      "TT,,ahhhhha,,,,Thhhh,,~~,,,,,=..=hhhhh,T",
      "TT,,haa+aah,,,,Thw+h,,~~,,,,,=..=hw+wh,T",
      "TT,,,,___,,!,,,T......KK...............T",
      "TT,%,,___,,,,%,Tl.....KK....l..........T",
      "TT11111^^111111T......~~.hhhhh.........T",
      "TTdddddddddddddT.&....~~.hhhhh.........T",
      "TT22222^^222222T......KK.hw+wh.........T",
      "TTdddddddddddddT......~~..&.........&..T",
      "TT33333^^333333T......~~...._____......T",
      "TTdddddddddddddT....&.~~...._fOf_......T",
      "TT44444^^444444T......~~...._____......T",
      "TTdddddddddddddT......~~~~~~~~KK~~~~~~~T",
      "TT%%%%%^^%%%%%%.......~~.........&...~~T",
      "T.....................~~.l.........l.~~T",
      "T...................~~~~~~~~~~~~~~~~~~~T",
      "T...A..A..A..A.......~~~~~~~~~~~~~~~~~~T",
      "T.!.................~~~~~~~~~ffff~~~~~~T",
      "....................~~~~~~~fwwwwwwf~~~~T",
      "....................~~~~~~~fwwwwwwf~~~~T",
      "T,111111111111,.....~~~~~~~fww+wwwf~~~~T",
      "T,dddddddddddd,.....KKKKKKK_______!~~~~T",
      "T,222222222222,.....KKKKKKK_______f~~~~T",
      "T,dddddddddddd,.....~~~~~~~~f____f~~~~~T",
      "T,333333333333,.....~~~~~~~~~ffff~~~~~~T",
      "T,dddddddddddd,.....~~~~~~~~~~~~~~~~~~~T",
      "T,666666666666,.....~~~~~~~~~~~~~~~~~~~T",
      "TTTTTTTTTTTTTTTTTTTT~~~~~~~~~~~~~~~~~~~T",
  ];
  FF7.defineMap('kp_bloomhaven', {
    name: 'Bloomhaven', area: 'Bloomhaven', theme: 'town', music: 'parochial',
    look: { floor: ['#b8a888', '#b0a080'], floor3: ['#d8ccb0', '#d0c4a8'], dirt: ['#7a5a3a', '#725234'], grass: ['#5a9a3a', '#549234'], water: '#3a7ab0', lamp: '#fff0c8' },
    grid: BH,
    heights: [
      "6666666666666666111111001111111111111111",
      "6666666666666666111111001111111111111111",
      "6666666666666666111111001111111111111111",
      "6666666666666666111111001111111111111111",
      "6666666666666666111111001111111111111111",
      "6666666666666666111111111111111111111111",
      "6666666666666666111111111111111111111111",
      "5555555555555555111111001111111111111111",
      "5555555555555555111111001111111111111111",
      "4444444444444444111111111111111111111111",
      "4444444444444444111111001111111111111111",
      "3333333333333333111111001111111111111111",
      "3333333333333333111111001111111111111111",
      "2222222222222222111111001111111111111111",
      "2222222222222222111111000000001100000001",
      "2222222112222221111111001111111111111001",
      "1111111111111111111111001111111111111001",
      "1111111111111111111100000000000000000001",
      "1111111111111111111110000000000000000001",
      "1111111111111111111100000000011110000001",
      "1111111111111111111100000001111111100001",
      "1111111111111111111100000001111111100001",
      "1111111111111111111100000001111111100001",
      "1111111111111111111111111111111111100001",
      "1111111111111111111111111111111111100001",
      "1111111111111111111100000000111111000001",
      "1111111111111111111100000000011110000001",
      "1111111111111111111100000000000000000001",
      "1111111111111111111100000000000000000001",
      "1111111111111111111100000000000000000001",
    ],
    legend: Object.assign({ '&': 'planter' }, BED_LEGEND),
    props: deco(BH, Object.assign({}, BEDS, { '&': () => ({ prop: 'planter', plant: 'flowers', r: 0.45, h: 0.35, col: '#d8d0c0' }), A: (x) => ({ prop: 'tent', col: ['#e05a7a', '#f0c040', '#7a5ad0', '#5aa0e0'][(x / 3 | 0) % 4] }) }))
      .concat([{ at: [30, 12], prop: 'well', col: '#5a9ad0', col2: '#e8e0d0' }]),
    buildings: [
      { at: [6, 1, 3, 2], h: 4.6, col: '#e8e0d0', roof: '#5a4a6a', top: 'hip', rise: 1.8 },
      { at: [4, 1, 7, 4], h: 3.0, col: '#e0d8c8', roof: '#6a5a7a', top: 'gable', ridge: 'z', rise: 1.2, win: '#ffe0a0' },
      { at: [16, 2, 4, 3], h: 2.0, col: '#f4e4cc', roof: '#c85a7a', top: 'gable', chimney: true },
      { at: [33, 2, 5, 3], h: 2.2, col: '#eef0f0', roof: '#5a7ac0', top: 'gable' },
      { at: [25, 7, 5, 3], h: 2.4, col: '#f8f2ea', roof: '#e05a7a', top: 'hip' },
      { at: [28, 20, 6, 3], h: 2.2, col: '#c8e8e0', roof: '#7ac0b0', top: 'gable', ridge: 'x', rise: 0.9, win: false, tin: '#7ac0b0' },
    ],
    labels: [
      { at: [27, 9], face: 's', text: 'MOG CENTER', size: 0.16, col: '#e05a7a', y: 1.9 },
      { at: [30.5, 22], face: 's', text: 'FLOWER ARCADE', size: 0.13, col: '#c0407a', y: 1.75 },
      { at: [18, 4], face: 's', text: 'FLORIST', size: 0.12, col: '#a03a5a', y: 1.6 },
    ],
    entries: { from_route10: [1, 20, 'right'], from_route11: [30, 1, 'down'], from_center: [27, 10, 'down'], from_house1: [18, 5, 'down'],
      from_house2: [35, 5, 'down'], from_church: [7, 5, 'down'], from_dojo: [30, 23, 'down'] },
    exits: [
      { at: [0, 20, 1, 2], to: 'kp_route10', entry: 'from_bloomhaven' },
      Object.assign({ at: [30, 0, 2, 1], to: 'kp_route11', entry: 'from_bloomhaven' }, W.gate(5, 'Gatekeeper', "Hold it! The marsh road to Ravenmoor is no place for beginners. Come back with the Bloom Badge from the Flower Arcade.")),
      { at: [27, 9, 1, 1], to: 'kp_bloomhaven_center', entry: 'from_town', sfx: 'door' },
      { at: [18, 4, 1, 1], to: 'kp_bloomhaven_house1', entry: 'from_town', sfx: 'door' },
      { at: [35, 4, 1, 1], to: 'kp_bloomhaven_house2', entry: 'from_town', sfx: 'door' },
      { at: [7, 4, 1, 1], to: 'kp_bloomhaven_church', entry: 'from_town', sfx: 'door' },
      { at: [30, 22, 1, 1], to: 'kp_bloom_dojo', entry: 'from_town', sfx: 'door' },
    ],
    npcs: [
      folk({ id: 'bh_gate', name: 'Gatekeeper', model: 'man7', at: [33, 1], dir: 'left',
        lines: s => KP.hasBadge(5) ? "The Bloom Badge! Go on through. The marsh is foggy, so keep to the boardwalks, and don't follow the floating lights." : "The road north runs through Mistmire Marsh to Ravenmoor. Only trainers with the Bloom Badge go past me. Aeris's orders, and the marsh's." }),
      folk({ id: 'bh_florist', name: 'Flower Seller', model: 'oldwoman2', at: [8, 19], dir: 'down',
        lines: "Tulips, sweet peas, moonlilies! ...Kupo Nuts? No, dear, that's the Mart. But my tulips are prettier, and they don't make moogles follow you home." }),
      folk({ id: 'bh_boy', name: 'Boy', model: 'kid4', at: [20, 10], dir: 'right', wander: 1,
        lines: "That glass house out on the lake is the Flower Arcade! Aeris is the master. She's really nice... right up until her Summoners start calling things." }),
      folk({ id: 'bh_girl', name: 'Girl', model: 'girl4', at: [27, 12], dir: 'right',
        lines: "The old church up the hill is the oldest building in town. Flowers grow right up through its floor. Nobody planted them. They just... came." }),
      folk({ id: 'bh_terrace', name: 'Old Gardener', model: 'oldman4', at: [12, 8], dir: 'down',
        lines: "Red, gold, violet, white: one color to a terrace. From the lake it looks like a rainbow tripped and fell down the hill.\fWild Petalmogs nap in the beds. I let them. They do the weeding." }),
      folk({ id: 'bh_rumor', name: 'Delivery Man', model: 'worker3', at: [35, 10], dir: 'left',
        lines: "Funny thing. A Team Hojo truck rolled through last week, loaded with crates of glowing moss. Glowing! They went north, toward Ravenmoor.\fI hear there's a tower out west of there that glows the same green. Gives me the shivers." }),
      folk({ id: 'bh_angler', name: 'Angler', model: 'woman8', at: [33, 24], dir: 'right',
        lines: "They say if you fish off this island at dawn, a Petalmog will tug your line. So far I've caught two boots and a very surprised Angler." }),
      folk({ id: 'bh_canal', name: 'Lock Keeper', model: 'oldman5', at: [29, 15], dir: 'up',
        lines: "The canal comes all the way down from Mistmire Marsh. Clean as anything by the time it gets here: the reeds filter it.\fThe marsh itself? Wouldn't drink a drop. Wouldn't even look at it too long." }),
      W.moogle('bh_mog1', 'petalmog_florist', [10, 12], { wander: 3, line: 'Petalmog: Kupo~. It sniffs a violet and sneezes.' }),
      W.moogle('bh_mog2', 'halomog_cleric', [4, 6], { wander: 2, line: 'Halomog: Kupo... It hums a hymn.' }),
      W.moogle('bh_mog3', 'mopluff_dancer', [12, 20], { wander: 3, line: 'Mopluff: Kupo kupo! It twirls between the market stalls.' }),
    ],
    items: [W.item('bh_terrace', [2, 10], 'fancy_nut'), W.item('bh_field', [13, 27], 'hi_oil', 2)],
    triggers: [
      W.sign([2, 19], 'BLOOMHAVEN\fThe Flower Town. Please do not pick the terraces.'),
      W.sign([11, 5], 'BLOOMHAVEN CHURCH\fOpen to all. Mind the flowers.'),
      W.sign([34, 23], 'FLOWER ARCADE\fDojo Master: Aeris\f"Every flower blooms in its own time. Yours too."'),
      W.hidden('bh_church_back', [13, 1], 'spell_nut', 2),
    ],
  });

  center('kp_bloomhaven_center', { name: 'Bloomhaven Mog Center', town: 'kp_bloomhaven', back: 'from_center', decor: 'cosy',
    hello: 'Welcome to the Mart, kupo! Every shelf is stocked, all the way from Pomville to here.',
    npcs: [folk({ id: 'bhc_trainer', name: 'Ace Trainer', model: 'woman9', at: [7, 4], dir: 'down',
      lines: "Aeris's Summoners shrug off fists and plain old hits, so leave your Monks at home. A Thief's dirty tricks work a treat, though." })] });

  W.house('kp_bloomhaven_house1', { name: 'Florist', area: 'Bloomhaven', town: 'kp_bloomhaven', back: 'from_house1', decor: 'cosy',
    npcs: [folk({ id: 'bhh1_florist', name: 'Florist', model: 'woman3', at: [7, 2], dir: 'down', talk: function* (s) {
      if (s.flag('kp_bh_gift')) { yield s.say('Florist', "A Cure Nut a day keeps the Fix-It Kit away! ...That's not a saying yet. I'm working on it."); return; }
      yield s.say('Florist', "Oh, a trainer! You look like you walked all the way from Skyport. Here: Cure Nuts. A moogle holding one shakes off its first poison or sleep all by itself.");
      s.set('kp_bh_gift'); KP.give('cure_nut', 2); s.sfx('found');
      yield s.msg('Received 2 Cure Nuts!');
    } })] });
  W.house('kp_bloomhaven_house2', { name: 'House', area: 'Bloomhaven', town: 'kp_bloomhaven', back: 'from_house2', decor: 'rustic',
    npcs: [
      folk({ id: 'bhh2_man', name: 'Old Man', model: 'oldman6', at: [3, 2], dir: 'down',
        lines: "My brother lives in Ravenmoor, past the marsh. Strange town. The clock tower there has been stuck at the same hour for as long as anyone remembers.\fThey say the dojo master up in the old mansion sleeps in a coffin. I say he just likes his privacy." }),
      folk({ id: 'bhh2_woman', name: 'Woman', model: 'woman10', at: [8, 3], dir: 'left',
        lines: "Trainers come through here bound for the Kupo Coliseum. Eight badges, then the Summit Road. My son tried. He came home with a sunburn and a very tired Mopluff." }),
    ] });

  // ------------------------------------------------------------------ the church: flowers through the floorboards
  FF7.defineMap('kp_bloomhaven_church', {
    name: 'Bloomhaven Church', area: 'Bloomhaven', theme: 'church', music: 'church',
    grid: [
      "#####aaaa#####",
      "#.....DD.....#",
      "#............#",
      "#...ffffff...#",
      "#..xffffffx..#",
      "#...ffffff...#",
      "#............#",
      "#.ppp....ppp.#",
      "#............#",
      "#.ppp....ppp.#",
      "#............#",
      "#.ppp....ppp.#",
      "#............#",
      "######+#######",
    ],
    props: [{ at: [9, 11], prop: 'pew', broken: true }, { at: [2, 9], prop: 'pew', broken: true }],
    lights: [[6.5, 4, '#fff2c0', 4.5]],
    entries: { from_town: [6, 12, 'up'] },
    exits: [{ at: [6, 13, 1, 1], to: 'kp_bloomhaven', entry: 'from_church', sfx: 'door' }],
    npcs: [
      folk({ id: 'bhc_elmyra', name: 'Elmyra', model: 'elmyra', at: [3, 4], dir: 'right', anim: 'kneel',
        lines: s => KP.hasBadge(5)
          ? "You beat her? She came home humming! I haven't heard her hum like that in years. ...Thank you for that."
          : "Oh! I didn't hear you come in. These flowers grow nowhere else in town. Only here, in the old church.\fMy daughter runs the Flower Arcade on the lake. If you're going to challenge her, don't step on her lilies. She notices." }),
      W.moogle('bhc_mog', 'halomog_cleric', [10, 8], { wander: 0, line: 'Halomog: Kupo... It is praying very, very quietly.' }),
    ],
    triggers: [W.hidden('bhc_altar', [7, 1], 'boost_whitemage'),
      { at: [6, 1], on: 'talk', run: function* (s) { yield s.msg('An old altar, worn smooth. Someone has left a single white lily on it.'); } }],
  });

  // ------------------------------------------------------------------ Dojo 5: the Flower Arcade (Aeris)
  // A glass greenhouse, its beds hedged into wings. Two water lines feed the flower beds: pink and gold. Every valve
  // switches the water over (they all share the flag kp_bd_gold): a watered bed opens up and lets you through, a dry
  // one curls into a thorny bud. Pink is watered at the start.
  // SOLUTION: 1. Through the pink bed (3,13) into the west wing; Florist Lily. 2. Turn the valve at (2,2): gold.
  //   3. Through the gold bed (6,9) into the central garden; Gardener Moss. 4. Turn the valve at (17,11): pink.
  //   5. Through the pink beds (12..13,6), up the steps: Aeris (12,2).
  //   Optional: in the south hall turn the valve at (6,16) to gold: the east wing (gold bed 22,13) has Summoner Iris
  //   and a Leftover Nut. To leave, the same valves in reverse. No dead ends: every wing whose bed can close behind
  //   you has its own valve, and the wings without one can't change while you're in them.
  const GOLD = 'kp_bd_gold';
  const valve = (id, at) => W.toggle(id, at, GOLD, { model: { prop: 'valve', col: '#d8a830', h: 0.55 }, sfx: 'gate',
    msg: s => s.flag(GOLD) ? 'You turn the valve. Water gurgles off toward the GOLD beds... They open up, and the pink beds close.' : 'You turn the valve. Water gurgles off toward the PINK beds... They open up, and the gold beds close.' });
  const pinkBed = (id, at) => W.barrier(id, at, s => !!s && !s.flag(GOLD), { prop: 'bush', col: '#e0609a', scale: 1.15 });
  const goldBed = (id, at) => W.barrier(id, at, s => !!s && s.flag(GOLD), { prop: 'bush', col: '#e8b820', scale: 1.15 });
  const D5 = [
      "wwwwwwwwwwwwwwwwwwwwwwwwww",
      "w_____%%1122332211%%_____w",
      "w_____%%1f______f1%%_____w",
      "w%%_%%%%2f______f2%%%%_%%w",
      "w_____%%33ff__ff33%%_____w",
      "w_____%%%%%%^^%%%%%%_____w",
      "w_%%%_%_____ff_____%_%%%_w",
      "w_%3%_%____________%_%4%_w",
      "w_%%%_%___112211___%_%%%_w",
      "w_____f___134431___%_____w",
      "w_____%___112211___%_____w",
      "w%%_%%%____________%%%_%%w",
      "w_____%____________%_____w",
      "w%%f%%%%%%%%%%%%%%%%%%f%%w",
      "w________________________w",
      "w__1221______1221________w",
      "w________________________w",
      "w__3443__________3443____w",
      "w________________________w",
      "wwwwwwwwwwww+wwwwwwwwwwwww",
  ];
  const D5T = [
    W.trainer({ id: 'bd_lily', cls: 'Florist', name: 'Lily', model: 'woman7', at: [1, 10], dir: 'right', sight: [2, 10, 3, 1], noBag: true, bg: 'dojo',
      line: "Welcome to the Flower Arcade! A tip, free of charge: a valve sends the water pink or gold, never both. Now, battle!",
      lose: 'Trampled!', after: "Water the gold beds and the pink ones dry up. Plan your route the way a gardener plans a bed.",
      team: [['petalmog_maiden', 24], ['halomog_bishop', 24]], money: 1000 }),
    W.trainer({ id: 'bd_moss', cls: 'Gardener', name: 'Moss', model: 'oldman7', at: [9, 9], dir: 'left', sight: [7, 9, 2, 1], noBag: true, bg: 'dojo',
      line: "Forty years I've tended these beds. Forty years of trainers stomping through them. Not this time!",
      lose: "Hmph. You wiped your feet, at least.", after: "Aeris is past the pink beds, up the steps. There's a valve over by the ferns.",
      team: [['fernwisp_dryad', 24], ['callmog_summoner', 25], ['lumimog_beacon', 24]], money: 1000 }),
    W.trainer({ id: 'bd_iris', cls: 'Summoner', name: 'Iris', model: 'girl3', at: [20, 5], dir: 'right', sight: [21, 5, 4, 1], noBag: true, bg: 'dojo',
      line: "You found the east wing! Nobody finds the east wing. Your prize: losing to me!",
      lose: "...Okay, the east wing is overrated.", after: "Take the Leftover Nut up there. Aeris leaves it for whoever's clever enough to find this place.",
      team: [['callmog_summoner', 25], ['petalmog_maiden', 25], ['halomog_bishop', 25]], money: 1000 }),
  ];
  FF7.defineMap('kp_bloom_dojo', {
    name: 'Flower Arcade', area: 'Bloomhaven', theme: 'house', music: 'aeris', kpBg: 'dojo',
    look: { floor3: ['#d4d0c0', '#ccc8b8'], wall: '#e8f4ee', trim: '#9ac8b8', window: '#a8e4f4', grass: ['#3a8a3a', '#348234'], wallH: 2.8,
      floorTex: { floor3: 'tiles' }, sky: ['#a8d8c8', '#e8f8f0'], ambient: [0.56, 0.6, 0.54], light: [0.9, 0.92, 0.82] },
    grid: D5,
    heights: [
      "00000000000000000000000000",
      "00000000222222222200000000",
      "00000000222222222200000000",
      "00000000222222222200000000",
      "00000000222222222200000000",
      "00000000000011000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
    ],
    legend: Object.assign({}, BED_LEGEND),
    props: deco(D5, BEDS),
    labels: [{ at: [12.5, 0], face: 's', text: 'FLOWER ARCADE', size: 0.24, col: '#d0508a', y: 2.2 }],
    lights: [[12.5, 3, '#fff4d0', 5], [12.5, 15, '#f0fff0', 6]],
    entries: { from_town: [12, 18, 'up'] },
    exits: [{ at: [12, 19, 1, 1], to: 'kp_bloomhaven', entry: 'from_dojo', sfx: 'door' }],
    npcs: [
      W.master({ id: 'bd_aeris', name: 'Aeris', model: 'aeris', at: [12, 2], badge: 5, money: 2600,
        team: [['petalmog_florist', 26], ['fernwisp_dryad', 26], ['callmog_summoner', 27], ['petalmog_maiden', 27], ['callmog_evoker', 29]],
        intro: "Oh, you made it! Most challengers end up stuck between the gold beds, watering the same flowers in circles. Not you, though.\fI'm Aeris, master of the Flower Arcade. My moogles are Summoners: they call on things you can't see.\fDon't worry, I'll go easy on you. ...That was a lie, by the way.",
        lose: "Ahh, I lost! You're good. Better than you look, and you look pretty good.",
        after: "Take care of that Bloom Badge, okay? It's not just shiny: it means the flowers like you.\fThe road north goes through the marsh to Ravenmoor. It's gloomy up there. Bring a little color with you.",
        reward: [['boost_summoner', 1]] }),
      folk({ id: 'bd_guide', name: 'Dojo Guide', model: 'man8', at: [14, 17], dir: 'up',
        lines: "Hey there, future champ! This greenhouse runs on two water lines: PINK and GOLD. Turn any valve and the water switches over.\fA watered bed opens up so you can walk through. A dry one curls into a thorny bud. Pink's running right now.\fAeris waits up past the pink beds in the middle. Getting into the middle... that's the trick!" }),
    ].concat(D5T.map(t => t.npc)),
    objects: [valve('bd_valve_s', [6, 16]), valve('bd_valve_w', [2, 2]), valve('bd_valve_c', [17, 11]),
      pinkBed('bd_pink_w', [3, 13]), pinkBed('bd_pink_n1', [12, 6]), pinkBed('bd_pink_n2', [13, 6]),
      goldBed('bd_gold_c', [6, 9]), goldBed('bd_gold_e', [22, 13])],
    items: [W.item('bd_east', [23, 1], 'leftover_nut')],
    triggers: D5T.map(t => t.trig),
  });
  // ================================================================== Route 11: Mistmire Marsh
  // Bog water and fog, crossed on weathered boardwalks that fork round the islands and meet again on the middle
  // island. West: the Swamp Witch's hut on a mound (stairs up from two sides; off its north-east lip, a one-way hop
  // to a little isle). East: a reed isle, and the old standing stones in the north-east. Will-o'-wisps drift over the
  // water. South: Bloomhaven. North: Ravenmoor.
  KP.WILD.kp_route11 = [['bogmog_witch', 26, 24, 26], ['batmog_stalker', 24, 24, 26], ['mossmog_beastmaster', 14, 25, 27], ['lumimog_beacon', 10, 25, 27],
    ['angler_harpooner', 7, 24, 26], ['bogmog_hag', 6, 26, 27], ['batmog_vampire', 6, 26, 27], ['fernwisp_dryad', 4, 25, 27], ['ghostmog_phantom', 3, 25, 26]];
  const R11 = [
    "~~~~~~~~~~&&&&&,,&&&&&~~~~~~~~~~~~",
    "~~~~~~~~~,,G&G,,,,,&,,,~~~~~~~~~~~",
    "~~~~~~~~~,,GGG,,,,GGGGKKKK~~~~~~~~",
    "~~~~~~~~~~,,,,,,,,,,,,~~~K~~~~~~~~",
    "~~~~~~~~~~~~~~~~K~~~~~~~~K~~~~~~~~",
    "~~~~~~~~~~~~~~~~K~~~~~~~~K~~~~~~~~",
    "~~~~~~~~~~~~~~~~K~~~~~~~~KK,,,~~~~",
    "~~~~~~,~~~~,GG~~K~~~~~~~~~|,,,|~~~",
    "~~~,,,,,,,&,,,KKK~~~~~~~&,,,,,,,~~",
    "~~Ghhhh,,,,,,,~~KK~~~~~~~|,,R,,|~~",
    "~~Ghhhh,,,,~~~~~~K~~~~~~~,,GGG,&~~",
    "~~Ghh+h,,&,~~~~~~K~~~~~~~~|,,,|~~~",
    "~&G,,,,,,,,,~~~~~K~~~~~~~~~,,,~~~~",
    "~~&,,,,@,,&~~~~~~K~~~~~~~~~~~~~~~~",
    "~~,,,,,,GG,^K~~,,,,,&~~~~~~~~~~~~~",
    "~~,&,,,,GG,~K~&,,,,,,~~~,,,~~~~~~~",
    "~~~,,,,,,,~~KK,GG,GG,KKK,,,,~~~~~~",
    "~~~~~,,,,,~~~~,GG,GG,~~~,K,~~~~~~~",
    "~~~~~~~^~~~~~~~GG,,&~~~~~K~~~~~~~~",
    "~~~~~~~^~~~~~~~~~,~~~~~~~KKK~~~~~~",
    "~~~~~~~KKKK~~~~~~~~~~~~~~~~K~~~~~~",
    "~~~~~~~~~~K~~~~~~~~~~~~~~~~K~~~~~~",
    "~~~~~~~~~~K~~~~~~~~~~~~~~~,K,,~~~~",
    "~~~~~~~KKKKKKKKKKKKKKKKKK,,,,,,~~~",
    "~~~~~~,K~~~~~~~~K~~~~~~~,GGGG,&,~~",
    "~~~~GGGK,~~~~~~~K~~~~~~~&GGGG,,~~~",
    "~~~&GGGG&,~~~~~~K~~~~~~~~~GGG,~~~~",
    "~~~~GGGG,~~~~~~~K~~~~~~~~~~~~~~~~~",
    "~~~~~~,~~~~~~~~~K~~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~&GGGGGGG,&~~~~~~~~~~~~",
    "~~~~~~~~~~Y,,GGGGGGG,,Y~~~~~~~~~~~",
    "~~~~~~~~~~~,,,GG,,,,,,,~~~~~~~~~~~",
    "~~~~~~~~~~~!,,GG,,,,,,,~~~~~~~~~~~",
    "~~~~~~~~~~~%Y%%Y,,Y%%Y%~~~~~~~~~~~",
  ];
  const R11T = [
    W.trainer({ id: 'r11_morwen', cls: 'Hex Maniac', name: 'Morwen', model: { base: 'woman5', top: '#3a2a4a', bottom: '#2a2034', hair: '#1a1a22', hairStyle: 'longstraight', skirt: 'long' },
      at: [5, 17], dir: 'right', sight: [6, 17, 4, 1],
      line: "Granny Bog says I'm not allowed to curse visitors. ...She said nothing about battling them.",
      lose: 'Hexed... by a hiker. How embarrassing.', after: "Granny's hut is just up there. Knock first. She's got a Bogmog that bites.",
      team: [['bogmog_witch', 25], ['batmog_stalker', 25], ['ghostmog_phantom', 26]], money: 1040 }),
    W.trainer({ id: 'r11_fen', cls: 'Ranger', name: 'Fen', model: { base: 'man6', top: '#4a5a30', bottom: '#3a3a2a', hairStyle: 'cap', extras: ['vest'] },
      at: [28, 23], dir: 'left', sight: [25, 23, 3, 1],
      line: "Twelve years I've walked these boardwalks. Never once fallen in. Let's see if you can say the same after this!",
      lose: "I'm soaked. Not from the bog. From shame.", after: "The stones up north-east are older than Ravenmoor. Folk leave offerings in the middle.",
      team: [['mossmog_beastmaster', 26], ['huntmog_trapper', 25], ['angler_harpooner', 25]], money: 1040 }),
    W.trainer({ id: 'r11_agatha', cls: 'Medium', name: 'Agatha', model: 'oldwoman3', at: [18, 14], dir: 'left', sight: [15, 14, 3, 1],
      line: "The spirits whispered you were coming. They also said you'd lose. Shall we find out who's right?",
      lose: "The spirits... have gone very quiet.", after: "Those floating lights? Lumimogs, mostly. Mostly.",
      team: [['lumimog_beacon', 26], ['ghostmog_phantom', 25], ['bogmog_hag', 26]], money: 1040 }),
    W.trainer({ id: 'r11_rowan', cls: 'Ace Trainer', name: 'Rowan', model: { base: 'man3', top: '#7a2a2a', bottom: '#2a2a34', jacket: '#3a3a44', hairStyle: 'spiky' },
      at: [18, 3], dir: 'left', sight: [15, 3, 3, 1],
      line: "You crossed the whole marsh? Then you're headed for Ravenmoor's dojo. Vincent's tough. I'm tougher. Prove me wrong!",
      lose: "Proven. Ugh.", after: "Ravenmoor's dojo is shut, last I heard. Something about Team Hojo and a tower out west. Weird times.",
      team: [['batmog_vampire', 26], ['bogmog_hag', 26], ['darkmog_knight', 26], ['mossmog_beastmaster', 27]], money: 1080 }),
  ];
  const deadTree = (x, y) => ({ prop: 'coraltree', col: '#4a4036', col2: '#3a5a40', h: 2.2 + rnd(x, y) * 1.2 });
  const WISPS = [[4, 4], [12, 4], [21, 10], [30, 16], [14, 21], [20, 26], [3, 20], [30, 29], [8, 30], [22, 6], [9, 2]];
  FF7.defineMap('kp_route11', {
    name: 'Route 11', area: 'Route 11', theme: 'jungle', music: 'cry', kpWild: 'kp_route11', kpBg: 'swamp',
    look: { water: '#3a4a30', grass: ['#5a6a3a', '#546434'], wood: ['#6a5a44', '#5e5040'], wall: '#4a4a3a', sky: ['#1a2018', '#4a5a48'],
      fog: { color: [0.3, 0.34, 0.28], near: 5, far: 16 }, ambient: [0.36, 0.4, 0.34], light: [0.62, 0.66, 0.56] },
    grid: R11,
    heights: [
      "0000000000111111111111000000000000",
      "0000000001111111111111100000000000",
      "0000000001111111111111111100000000",
      "0000000000111111111111000100000000",
      "0000000000000000100000000100000000",
      "0000000000000000100000000100000000",
      "0000000000000000100000000111110000",
      "0000003000011100100000000011111000",
      "0003333333111111100000000111111100",
      "0033333333311100110000000111111100",
      "0033333333300000010000000111111100",
      "0033333333300000010000000011111000",
      "0333333333330000010000000001110000",
      "0033333333300000010000000000000000",
      "0033333333321001111100000000000000",
      "0033333333301011111110001110000000",
      "0003333333001111111111111111000000",
      "0000033333000011111110001110000000",
      "0000000200000001111100000100000000",
      "0000000200000000010000000111000000",
      "0000000111100000000000000001000000",
      "0000000000100000000000000001000000",
      "0000000000100000000000000011110000",
      "0000000111111111111111111111111000",
      "0000001100000000100000001111111100",
      "0000111110000000100000000111111000",
      "0001111111000000100000000011110000",
      "0000111110000000100000000000000000",
      "0000001000000000100000000000000000",
      "0000000000000111111110000000000000",
      "0000000000011111111111100000000000",
      "0000000000011111111111100000000000",
      "0000000000011111111111100000000000",
      "0000000000011111111111100000000000",
    ],
    legend: { '&': 'coraltree' },
    props: deco(R11, { '&': deadTree, '|': () => ({ prop: 'pillar', h: 1.15, col: '#6a7466', col2: '#58625a' }), R: () => ({ prop: 'rock', col: '#7a7c70' }) })
      .concat(WISPS.map(([x, y]) => ({ at: [x, y], prop: 'lantern', pole: false, size: 0.42, col: '#b8ffe0', lift: 0.6 + rnd(x, y) * 0.6 })))
      .concat([{ at: [7, 13], prop: 'campfire', col: '#70ff60', size: 0.8 }]),
    buildings: [{ at: [3, 9, 4, 3], h: 1.7, col: '#5a4630', roof: '#4a5a30', top: 'gable', ridge: 'x', rise: 1.3, chimney: true, tex: 'siding' }],
    entries: { from_bloomhaven: [16, 32, 'up'], from_ravenmoor: [15, 1, 'down'], from_hut: [5, 12, 'down'] },
    exits: [
      { at: [16, 33, 2, 1], to: 'kp_bloomhaven', entry: 'from_route11' },
      { at: [15, 0, 2, 1], to: 'kp_ravenmoor', entry: 'from_route11' },
      { at: [5, 11, 1, 1], to: 'kp_route11_hut', entry: 'from_town', sfx: 'door' },
    ],
    npcs: R11T.map(t => t.npc).concat([
      folk({ id: 'r11_lost', name: 'Traveler', model: 'man9', at: [19, 30], dir: 'left',
        lines: "Did you see them? Little lights, floating over the water. They drift off when you get close.\fMy grandmother called them Lumimogs and said to never follow one home. I'm still not sure if that was advice or a threat." }),
      W.moogle('r11_mog1', 'bogmog_witch', [8, 13], { wander: 1, line: 'Bogmog: Kuuu-po. It stirs nothing in particular, very seriously.' }),
      W.moogle('r11_mog2', 'lumimog_lamplighter', [27, 8], { wander: 2, line: 'Lumimog: Kupo! Its lamp flickers hello.' }),
    ]),
    items: [W.item('r11_isle', [12, 8], 'max_oil'), W.item('r11_sw', [5, 26], 'royal_nut'), W.item('r11_reeds', [29, 25], 'boost_beast')],
    triggers: [
      W.sign([11, 32], 'ROUTE 11 - MISTMIRE MARSH\fNorth: Ravenmoor. South: Bloomhaven.\fStay on the boardwalks. Do not follow the lights.'),
      W.hidden('r11_stones', [28, 9], 'glow_nut', 3),
      ledge([10, 9, 1], 'right', 1),
    ].concat(R11T.map(t => t.trig)),
  });
  // the Swamp Witch's hut
  W.house('kp_route11_hut', { name: "Witch's Hut", area: 'Route 11', town: 'kp_route11', back: 'from_hut', decor: 'rustic',
    grid: [
      "############",
      "#k..j.m..q.#",
      "#..........#",
      "#.t..@.....#",
      "#.........j#",
      "#####+######",
    ],
    props: [{ at: [5, 3], prop: 'campfire', col: '#70ff60', size: 0.7 }],
    look: { ambient: [0.36, 0.4, 0.34], light: [0.6, 0.8, 0.55] },
    npcs: [
      folk({ id: 'r11h_witch', name: 'Granny Bog', model: { base: 'oldwoman', top: '#2a3a2a', bottom: '#2a2a22', hair: '#c8c8c0', skirt: 'long', extras: ['robe'] }, at: [7, 3], dir: 'left',
        talk: function* (s) {
          if (s.flag('kp_r11_witch')) { yield s.say('Granny Bog', "Still here? The soup's not for guests, dearie. It's for the Bogmogs. ...Mostly."); return; }
          yield s.say('Granny Bog', "Heh heh. A visitor! Don't mind the smell, dearie. Bog-root soup. Very good for the gears.");
          yield s.say('Granny Bog', "Off to Ravenmoor, are we? Gloomy place. Their dojo master keeps the old mansion and doesn't come out till the moon's up.\fAnd there's a green glow out west of town these days. Team Hojo's lot, poking at things that should stay buried.");
          yield s.say('Granny Bog', "Here. A book of hexes. Give it to a Black Mage and its spells will bite harder. I've no use for it: I know them all by heart.");
          s.set('kp_r11_witch'); KP.give('boost_blackmage', 1); s.sfx('found');
          yield s.msg('Received a Black Tome!');
        } }),
      W.moogle('r11h_mog', 'bogmog_hag', [2, 2], { wander: 1, line: 'Bogmog: KUPO! It snaps at your boots. Then it purrs.' }),
    ] });
  // ================================================================== Ravenmoor: the town where midnight lingers
  // A gothic town in the marsh fog, always night. Crooked houses with tall roofs; the clock tower in the square,
  // stuck at midnight; the graveyard to the west behind an iron fence (the road to Route 12 runs through it, and
  // Sephiroth waits there: rival battle 8); the Valentine mansion on the hill (Dojo 6: Vincent), shut until Hojo is
  // stopped at the Lifestream Tower. South: Route 11. West: Route 12. North: Route 13 (the 6-badge gate).
  KP.WILD.kp_ravenmoor = [['ghostmog_phantom', 30, 25, 27], ['clockmog_clockmaker', 25, 25, 27], ['batmog_stalker', 20, 25, 26], ['bogmog_witch', 12, 25, 26],
    ['ghostmog_specter', 5, 27, 27], ['clockmog_chrono', 4, 27, 27], ['batmog_vampire', 4, 26, 27]];
  const RV = [
    "    %%&%::%%&%%&%%&%%&%%&%%&%%&%%&%%&%%&",
    "    ....::..............&,,hhhhhhhhhh,,%",
    "%.......::.hhhh.........R,,hhhhhhhhhh,,%",
    "&.hhhhhl::.hhhh.........&,,whhhhhhhhw,,&",
    "%.hhhhh.::.hhhh.hhhhh...&,,hhhhhhhhhh,,%",
    "%.hhhhh.::.hwhh.hhhhh...R,,hwwh+whwwh,,%",
    "&.hh+hh.::......hhhhh...&,,,,,::,,,,,,,&",
    "%.......::......hh+hh...&,&,,,::,,,,,,,%",
    "%.......::l.............R,,,u,::,,,u,&,%",
    "&.......::...........l..&,&,,,::,,,,,,,&",
    "%.......:::::::::::::::.&====u..u======%",
    "%.......:::::::::::::::.RR%%R%^^%RRRR%%%",
    "&============..::.......%RR%RR^^%%%RR%%R",
    "%,hhh,,GGGGG=l_________lRRR%%%^^%%R%RR%R",
    "%,hhh,7.7.&G=___________l..............%",
    "&,hhh,,GGGGG=____h+h____..hhhhh..hhhhh.&",
    "%,GGG,7.7.7G=____hhh____..hhhhh..hhhhh.%",
    "%&GGG,,,,,,,=____hhh____..hhhhh..hhhhh.%",
    ":::::::::::::___________..hh+hh..hhwhh.&",
    ":::::::::::::___________...............%",
    "%,GGGGuGGGGG=___________.........l.....%",
    "&,7.7.7.77.7=l_________l.....l.hhhhhh..&",
    "%,GGGGGGGGGG=.....::...........hhhhhh..%",
    "%,7.7.7.77.7=.....::....hhhhh..hhhhhh..%",
    "&,GGGGGGGGGG=hhhh.::l...hhhhh..hhhhhh..&",
    "%&GGGGGGGGG&=hhhh.::....hhhhh..hhhhhh..%",
    "%============hhhh.::....hhhhh..........%",
    "&............hhhh.::...O......oB.......&",
    "%..hhhhh.o.l......::...................%",
    "   hhhhh.........l::.&&..............   ",
    "   hhhhh..........::.&&..............   ",
    "   %%%%%%%%%%%%%%%::%%%%%%%%%%%%%%%%%   ",
  ];
  const hojoGone = s => s.flag('kp_hojo_done');
  const sephScene = function* (s) {
    s.emote('rv_seph', '...');
    yield 30;
    yield s.face('rv_seph', 'player'); yield s.face('player', 'rv_seph');
    yield s.say('sephiroth', '...Cloud. You came through the marsh.');
    yield s.say('sephiroth', "Hojo is in that tower to the west. Whatever he's building in there, I can feel it. Like a voice I almost remember.\fI have questions for that man. But first...");
    yield s.say('sephiroth', "Show me how far you've come.");
    const r = yield* W.rival(s, 'sephiroth', 8, { bg: 'night', lose: "...Hm. You've grown.", win: 'Not yet, Cloud. Not yet.' });
    yield s.say('sephiroth', "...Go, then. See what Hojo has made in the green light. I'll be watching.");
    yield s.move('rv_seph', [[4, 18], [1, 18]]);
    s.remove('rv_seph');
  };
  FF7.defineMap('kp_ravenmoor', {
    name: 'Ravenmoor', area: 'Ravenmoor', theme: 'night_town', music: 'lurking', kpWild: 'kp_ravenmoor', kpBg: 'night',
    look: { sky: ['#06040e', '#241a34'], fog: { color: [0.08, 0.06, 0.12], near: 9, far: 26 }, ambient: [0.3, 0.28, 0.4], light: [0.5, 0.48, 0.68],
      floor: ['#4a4650', '#44404a'], floor2: ['#5a5048', '#544a42'], floor3: ['#585460', '#524e5a'], grass: ['#3a4a34', '#34442e'],
      lamp: '#ffd890', bldgWin: '#ffcc66', checker: ['#c8c0b0', '#2a2430'], floorTex: { floor: 'cobble', floor3: 'stone' } },
    grid: RV,
    heights: [
      "0000111111111111111111114444444444444444",
      "0000111111111111111111114444444444444444",
      "1111111111111111111111114444444444444444",
      "1111111111111111111111114444444444444444",
      "1111111111111111111111114444444444444444",
      "1111111111111111111111114444444444444444",
      "1111111111111111111111114444444444444444",
      "1111111111111111111111114444444444444444",
      "1111111111111111111111114444444444444444",
      "1111111111111111111111114444444444444444",
      "1111111111111111111111114444444444444444",
      "1111111111111111111111114444443344444444",
      "1111111111111111111111113333332233333333",
      "1111111111111111111111112222222222222222",
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
      "1111111111111111111111111111111111111111",
      "1111111111111111111111111111111111111111",
      "1111111111111111111111111111111111111111",
      "0001111111111111111111111111111111111000",
      "0001111111111111111111111111111111111000",
      "0001111111111111111111111111111111111000",
    ],
    legend: { '&': 'coraltree', 7: 'crate' },
    props: deco(RV, {
      '&': (x, y) => ({ prop: 'coraltree', col: '#3a3438', col2: '#5a4a6a', h: 2.4 + rnd(x, y) * 1.4 }),
      7: (x, y) => ({ prop: 'crate', col: '#7a7a84', scale: [0.62, 0.7 + rnd(x, y) * 0.35, 0.22], flat: true }),
      '=': () => ({ prop: 'rail', col: '#1e1e26' }),
      u: () => ({ prop: 'statue', col: '#8a8a94', col2: '#6a6a74' }),
      '%': (x, y) => ({ prop: 'bush', col: '#2a3a2e' }),
    }).concat([
      { at: [18, 17], prop: 'porthole', r: 0.55, y: 5.9, col: '#f0e8c8', col2: '#c8a040', stars: false, light: false },
      { at: [19, 16], prop: 'porthole', r: 0.55, y: 5.9, col: '#f0e8c8', col2: '#c8a040', stars: false, light: false, rot: 90 },
      { at: [17, 16], prop: 'porthole', r: 0.55, y: 5.9, col: '#f0e8c8', col2: '#c8a040', stars: false, light: false, rot: -90 },
      { at: [23, 27], prop: 'well', col: '#2a3040' },
    ]),
    buildings: [
      { at: [27, 1, 2, 2], h: 4.8, col: '#4a3a44', roof: '#2a2230', top: 'hip', rise: 2.4 },
      { at: [35, 1, 2, 2], h: 4.8, col: '#4a3a44', roof: '#2a2230', top: 'hip', rise: 2.4 },
      { at: [27, 1, 10, 5], h: 3.4, col: '#4a3a44', roof: '#2a2230', top: 'gable', ridge: 'x', rise: 1.9, win: '#ffcc66', tex: 'stoneblock' },
      { at: [17, 15, 3, 3], h: 7.0, col: '#5a4a52', roof: '#2a2030', top: 'hip', rise: 2.6, tex: 'brick' },
      { at: [2, 3, 5, 4], h: 2.6, col: '#5a4a5a', roof: '#3a2a3a', top: 'gable', ridge: 'z', rise: 1.8, chimney: true },
      { at: [11, 2, 4, 4], h: 4.2, col: '#4a4a5a', roof: '#2a2a3a', top: 'gable', ridge: 'z', rise: 2.0 },
      { at: [16, 4, 5, 4], h: 2.4, col: '#6a5040', roof: '#3a2a2a', top: 'gable', ridge: 'x', rise: 1.4, chimney: true },
      { at: [26, 15, 5, 4], h: 2.8, col: '#4a4050', roof: '#a03a5a', top: 'hip', rise: 1.2 },
      { at: [33, 15, 5, 4], h: 3.0, col: '#504a40', roof: '#2a3028', top: 'shed', rise: 1.4 },
      { at: [31, 21, 6, 5], h: 3.2, col: '#4a4048', roof: '#302838', top: 'gable', ridge: 'x', rise: 2.0, chimney: true },
      { at: [24, 23, 5, 4], h: 2.2, col: '#5a5040', roof: '#3a2a20', top: 'hip', rise: 1.2 },
      { at: [13, 24, 4, 4], h: 3.6, col: '#484050', roof: '#28202e', top: 'gable', ridge: 'z', rise: 2.2 },
      { at: [3, 28, 5, 3], h: 2.4, col: '#5a4a40', roof: '#3a3028', top: 'shed', rise: 1.0 },
      { at: [2, 13, 3, 3], h: 2.0, col: '#7a7a82', roof: '#5a5a62', top: 'gable', ridge: 'z', rise: 0.8, win: false },
    ],
    labels: [
      { at: [28, 18], face: 's', text: 'MOG CENTER', size: 0.16, col: '#e07a9a', y: 2.2, glow: true },
      { at: [31, 5], face: 's', text: 'NIGHTMARE ARCADE', size: 0.13, col: '#c04050', y: 2.75, glow: true },
    ],
    lights: [[18, 19, '#ffd890', 4], [31, 7, '#ff9070', 3]],
    entries: { from_route11: [18, 30, 'up'], from_route12: [1, 18, 'right'], from_route13: [8, 1, 'down'], from_center: [28, 19, 'down'],
      from_house1: [4, 7, 'down'], from_house2: [18, 8, 'down'], from_clock: [18, 14, 'up'], from_dojo: [31, 6, 'down'] },
    exits: [
      { at: [18, 31, 2, 1], to: 'kp_route11', entry: 'from_ravenmoor' },
      { at: [0, 18, 1, 2], to: 'kp_route12', entry: 'from_ravenmoor' },
      { at: [8, 0, 2, 1], to: 'kp_route13', entry: 'from_ravenmoor' },
      { at: [28, 18, 1, 1], to: 'kp_ravenmoor_center', entry: 'from_town', sfx: 'door' },
      { at: [4, 6, 1, 1], to: 'kp_ravenmoor_house1', entry: 'from_town', sfx: 'door' },
      { at: [18, 7, 1, 1], to: 'kp_ravenmoor_house2', entry: 'from_town', sfx: 'door' },
      { at: [18, 15, 1, 1], to: 'kp_ravenmoor_clock', entry: 'from_town', sfx: 'door' },
      { at: [31, 5, 1, 1], to: 'kp_raven_dojo', entry: 'from_town', sfx: 'door', if: hojoGone,
        blocked: function* (s) { yield s.msg("The mansion door is chained shut. A card is tucked into the chain:\f\"The Nightmare Arcade is closed while that man is in the tower. -V.\""); } },
    ],
    npcs: [
      { id: 'rv_seph', name: 'Sephiroth', model: 'sephiroth', at: [5, 18], dir: 'right', show: s => !s.flag('kp_rival_sephiroth_8'),
        talk: sephScene },
      folk({ id: 'rv_watch', name: 'Night Watchman', model: { base: 'oldman', top: '#3a3a4a', jacket: '#2a2a3a', hairStyle: 'cap' }, at: [14, 19], dir: 'right',
        lines: "Day? We don't really do days in Ravenmoor. The marsh fog keeps the sun out, and the clock's been stuck at midnight for eighty years.\fYou get used to it. The Batmogs certainly have." }),
      folk({ id: 'rv_widow', name: 'Old Woman', model: 'oldwoman4', at: [13, 21], dir: 'left',
        lines: "The graveyard's full of Ghostmogs at this hour. Which is every hour. They're harmless, mostly. They just want somebody to notice them." }),
      folk({ id: 'rv_kid', name: 'Kid', model: 'kid5', at: [22, 25], dir: 'down', wander: 2,
        lines: "Mom says if I'm not home by midnight, the Batmogs get me. ...But it's ALWAYS midnight! I'm so confused." }),
      folk({ id: 'rv_caretaker', name: 'Caretaker', model: { base: 'man4', top: '#3a3028', jacket: '#2a2420', hair: '#8a8a8a', extras: ['vest'] }, at: [33, 7], dir: 'left',
        lines: s => hojoGone(s)
          ? "The master's opened the doors again. He even smiled. Well. His mouth moved. I'm counting it."
          : "Master Vincent locked the Arcade the day Team Hojo's trucks came through. He watched them all the way to that green tower, out west.\fHe said he won't open his doors while 'that man' is up there. He didn't say who. He didn't have to." }),
      folk({ id: 'rv_grunt1', name: 'Team Hojo Grunt', model: 'scientist', at: [20, 11], dir: 'down', show: s => !hojoGone(s),
        lines: "The Professor's orders: nobody bothers the tower. And nobody, NOBODY, bothers the Professor about the tower." }),
      folk({ id: 'rv_grunt2', name: 'Team Hojo Grunt', model: 'scientist', at: [21, 10], dir: 'left', show: s => !hojoGone(s),
        lines: "Psst. Between you and me? Project J gives me the creeps. It HUMS. Moogles aren't supposed to hum." }),
      folk({ id: 'rv_postman', name: 'Postman', model: 'man10', at: [10, 4], dir: 'down',
        lines: "North of town the road climbs to the Summit Road gate. Eight badges to get past the guards, and then a whole mountain of tunnels.\fAt the top: the Kupo Coliseum! I deliver there every week. The stairs are murder." }),
      W.moogle('rv_mog1', 'ghostmog_phantom', [5, 22], { wander: 2, line: 'Ghostmog: Kuuu... It drifts through a headstone and looks pleased with itself.' }),
      W.moogle('rv_mog2', 'batmog_stalker', [22, 20], { wander: 3, line: 'Batmog: Kupi! It hangs upside down from nothing at all.' }),
      W.moogle('rv_mog3', 'clockmog_clockmaker', [16, 19], { wander: 2, line: 'Clockmog: Tick-kupo, tock-kupo.' }),
    ],
    items: [W.item('rv_court', [37, 6], 'focus_pom'), W.item('rv_alley', [1, 27], 'hi_oil', 3)],
    triggers: [
      { id: 'rv_seph_see', at: [7, 18, 4, 2], once: false, if: s => !s.flag('kp_rival_sephiroth_8'), run: sephScene },
      W.sign([17, 30], 'RAVENMOOR\fThe Town Where Midnight Lingers.'),
      W.hidden('rv_grave', [9, 23], 'royal_nut'),
      { at: [3, 15], on: 'talk', run: function* (s) { yield s.msg('The mausoleum door is sealed tight. A name is carved over it: VALENTINE.\fSomeone has polished the letters recently.'); } },
      { at: [6, 20], on: 'talk', run: function* (s) { yield s.msg('A stone angel, her face worn smooth by the rain. Someone has hung a little lantern on her hand.'); } },
    ],
  });

  center('kp_ravenmoor_center', { name: 'Ravenmoor Mog Center', town: 'kp_ravenmoor', back: 'from_center', decor: 'gothic',
    hello: 'Welcome to the Mart, kupo! Open all night. Which is... always, here.',
    npcs: [folk({ id: 'rvc_trainer', name: 'Ace Trainer', model: 'man11', at: [7, 4], dir: 'down',
      lines: "Vincent's Time Mages love to slow you down and speed themselves up. Hit hard and hit first: Thieves, Rangers and Dragoons all do a number on them." })] });
  W.house('kp_ravenmoor_house1', { name: 'House', area: 'Ravenmoor', town: 'kp_ravenmoor', back: 'from_house1', decor: 'gothic',
    npcs: [
      folk({ id: 'rvh1_gran', name: 'Grandmother', model: 'oldwoman5', at: [3, 2], dir: 'down',
        lines: "When I was a girl you could see the stars from Ravenmoor. Then the tower out west started glowing green, and now even the fog glows a little.\fThe moogles don't like it. My Ghostmog won't go west of the graveyard." }),
      folk({ id: 'rvh1_girl', name: 'Girl', model: 'girl5', at: [8, 3], dir: 'left',
        lines: "My Ghostmog's name is Mister Boo. He's shy. He's under the bed right now. ...No, you can't see him. He's SHY." }),
      W.moogle('rvh1_mog', 'ghostmog_phantom', [9, 1], { wander: 0, line: 'Mister Boo: ...kupo? It hides behind the bookcase.' }),
    ] });
  W.house('kp_ravenmoor_house2', { name: 'House', area: 'Ravenmoor', town: 'kp_ravenmoor', back: 'from_house2', decor: 'rustic',
    npcs: [folk({ id: 'rvh2_sci', name: 'Former Scientist', model: { base: 'scientist', top: '#6a6a70' }, at: [6, 2], dir: 'down', talk: function* (s) {
      if (s.flag('kp_rv_sci')) { yield s.say('Former Scientist', s.flag('kp_hojo_done') ? "The tower's quiet now. ...I think I'll sleep tonight. First time in a year." : "If you go up that tower, keep your moogles close. Hojo doesn't ask before he borrows things."); return; }
      yield s.say('Former Scientist', "You're a trainer. Then listen. I worked for Team Hojo, until I saw what Project J was.\fHojo found something down in the Lifestream: cells that remember. He's been feeding them to a moogle. It's... changing.");
      yield s.say('Former Scientist', "I quit. I took these on the way out. Batteries from the lab. If your moogles go down in that tower, these will bring them back.");
      s.set('kp_rv_sci'); KP.give('battery', 2); s.sfx('found');
      yield s.msg('Received 2 Spare Batteries!');
    } })] });
  W.house('kp_ravenmoor_clock', { name: 'Clock Tower', area: 'Ravenmoor', town: 'kp_ravenmoor', back: 'from_clock', decor: 'stone',
    grid: [
      "############",
      "#MMM.MM.MMM#",
      "#..........#",
      "#.M......M.#",
      "#..........#",
      "#####+######",
    ],
    look: { wallH: 3.2 },
    npcs: [folk({ id: 'rvt_clockmaker', name: 'Clockmaker', model: { base: 'oldman', top: '#5a4a3a', extras: ['apron', 'glasses'] }, at: [5, 2], dir: 'down', talk: function* (s) {
      yield s.say('Clockmaker', "Stuck at midnight, eighty years. I've oiled every gear in this tower and it won't budge. I think it's stubborn.\fThe clocks in the Valentine mansion, though, those still work. The old master had them rigged to his doors.");
      yield s.say('Clockmaker', "A brass lever moves the hour hand by three hours, an iron one by six. Each door opens only at its own hour. Think it through, and you'll never be late.");
      if (s.flag('kp_rv_clock')) return;
      s.set('kp_rv_clock'); KP.give('roast_nut', 3); s.sfx('found');
      yield s.msg('Received 3 Slow-Roast Nuts!');
      yield s.say('Clockmaker', "Slow-Roast Nuts. The longer a battle runs, the tastier they get. Patience, eh? Every good thing takes time.");
    } })] });

  // ------------------------------------------------------------------ Dojo 6: the Nightmare Arcade (Vincent), in the Valentine mansion
  // FLOOR 1, the Clock Hall: the great clock's hour hand starts at XII. Two levers by the clock: the brass one adds 3
  // hours (flag kp_rd_a), the iron one 6 (kp_rd_b); hour = 3a + 6b: XII, III, VI or IX. A door opens only at its own
  // hour: XII north (the gallery: Butler Grimsby, a note), III east (the study: Time Mage Corvin, a Quick Gear), VI
  // south-east (a closet: Royal Kupo Nuts), IX west (the stair up).
  // SOLUTION: XII is open at the start (the gallery, the note). Pull the brass lever (III): the study. Pull the iron
  //   lever too (IX): the stair. (Brass back alone gives VI: the closet.) The levers stand in the hall, so no door
  //   can close on you while you're behind it.
  // FLOOR 2, the Belfry Gallery: three rooms in a row, a gate between each pair: room 1's brass lever (kp_rd2_a, +3),
  // an iron one (kp_rd2_b, +6) in room 2 and a second on the same works in room 1 (either swings the same hand). Gate 1
  // opens only at III, gate 2 only at IX; room 1's closet at VI.
  // SOLUTION: room 1: pull the brass lever (III): gate 1 opens. Room 2: pull the iron lever (IX): gate 2 opens (gate 1
  //   closes behind you). Room 3: Vincent. Back: the iron lever again in room 2 (III) opens gate 1. Optional: with
  //   room 1's iron lever down and the brass one up (VI), room 1's closet (Max Oils). (Room 1 needs its own iron lever:
  //   the way back through gate 1 is at III, the iron lever up, so room 2's could never leave it at VI.)
  const HOUR = ['XII', '', '', 'III', '', '', 'VI', '', '', 'IX'];
  const hour1 = () => (FF7.state.flags.kp_rd_a ? 3 : 0) + (FF7.state.flags.kp_rd_b ? 6 : 0);
  const hour2 = () => (FF7.state.flags.kp_rd2_a ? 3 : 0) + (FF7.state.flags.kp_rd2_b ? 6 : 0);
  const lever = (id, at, flag, brass, hour) => W.toggle(id, at, flag, { model: { prop: 'lever', col: brass ? '#d8b040' : '#7a7a84', n: 1 }, sfx: 'gate',
    msg: () => `${brass ? 'The brass lever clanks' : 'The iron lever grinds'} over. Somewhere a great clock whirs, and the hour hand swings round to ${HOUR[hour()]}.` });
  // an iron shutter with its hour on it; gone while the clock shows that hour
  const shutter = (id, at, hour, h, dir) => W.barrier(id, at, () => hour() === h,
    { prop: 'banner', col: '#2a2630', col2: '#c8a040', y: 2.7, h: 2.6, w: 1.05, text: HOUR[h], textCol: '#e0b840', size: 0.32 }, { dir: dir || 'down' });
  const RD1 = [
    "########################",
    "#####q::::::::::q:######",
    "#####:::::::::::::######",
    "#####:::t:::::t:::######",
    "#####:::::::::::::######",
    "###########.############",
    "##+##qvvvvvvvvvvvq######",
    "##:##vvvvvvvvvvvvv#:::k#",
    "#q^q#vvvvvvvvvvvvv#:::k#",
    "#:^:#vvvvvvvvvvvvv#::::#",
    "#:::.vvvvvvvvvvvvv.::::#",
    "#:::#vvvvvvvvvvvvv#::::#",
    "#:::#vvvvvvvvvvvvv#::::#",
    "#:::#vvvvvvvvvvvvv#t::c#",
    "#####qvvvvvvvvvvvq######",
    "###########.####.#######",
    "#########m...m#:::######",
    "#########.....#:::######",
    "#########.....#b:j######",
    "###########+############",
  ];
  const RD1T = [
    W.trainer({ id: 'rd_grimsby', cls: 'Butler', name: 'Grimsby', model: { base: 'man', top: '#1a1a1e', jacket: '#1a1a1e', bottom: '#1a1a1e', hair: '#c8c8c8', hairStyle: 'slick', extras: ['suit', 'bowtie'] },
      at: [12, 2], dir: 'down', sight: [9, 3, 6, 2], noBag: true, bg: 'dojo',
      line: "Good evening. The master is not receiving guests... unless they can tell the time. Shall we see if you can?",
      lose: 'Splendid. Do mind the clocks on your way.', after: "The note on the table was the master's. He writes very small. He thinks very large.",
      team: [['orbmog_seer', 26], ['clockmog_clockmaker', 26]], money: 1100 }),
    W.trainer({ id: 'rd_corvin', cls: 'Time Mage', name: 'Corvin', model: { base: 'oldman', top: '#3a2a4a', bottom: '#2a2034', extras: ['robe'] },
      at: [21, 10], dir: 'left', sight: [19, 10, 2, 1], noBag: true, bg: 'dojo',
      line: "Three o'clock already? Then it's time for tea. And a beating. Not necessarily in that order.",
      lose: 'Out of time...', after: "One lever moves three hours, the other six. The stair is at the ninth hour. You're welcome.",
      team: [['tickmog_chronomancer', 27], ['galimog_werebeast', 26], ['ghostmog_specter', 26]], money: 1100 }),
  ];
  FF7.defineMap('kp_raven_dojo', {
    name: 'Nightmare Arcade', area: 'Ravenmoor', theme: 'mansion', music: 'nightmare', kpBg: 'dojo',
    look: { floorTex: { floor: false }, checker: ['#c8c0b0', '#2a2430'], wall: '#5a4048', trim: '#2a1a20', wallH: 3.0, ambient: [0.36, 0.32, 0.42], light: [0.66, 0.6, 0.72],
      floor: ['#5a1e26', '#541a22'], floor2: ['#5a4030', '#523a2c'] },
    grid: RD1,
    heights: [
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "003000000000000000000000",
      "033300000000000000000000",
      "002000000000000000000000",
      "001000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
    ],
    legend: { v: 'checker' },
    props: [
      { at: [11, 10], prop: 'disc', r: 2.6, h: 0.02, col: '#3a2a1a', top: '#e8dcc0', rim: '#8a6a30', rimW: 0.2 },
      { at: [11, 10], to: [11, 8.5], prop: 'string', h: 0.05, h2: 0.05, sag: 0, r: 0.022, count: 1, col: '#3a2a1a' },
      { at: [15, 18], prop: 'bed', col: '#3a1818', col2: '#1a1010' },
      { at: [8, 6], prop: 'banner', col: '#4a1a2a', col2: '#c8a040', y: 2.4, h: 1.0, rot: 180 },
    ],
    labels: [
      { at: [11, 8], text: 'XII', size: 0.24, col: '#2a1a10', y: 0.04 },
      { at: [13.2, 10], text: 'III', size: 0.24, col: '#2a1a10', y: 0.04 },
      { at: [11, 12], text: 'VI', size: 0.24, col: '#2a1a10', y: 0.04 },
      { at: [8.8, 10], text: 'IX', size: 0.24, col: '#2a1a10', y: 0.04 },
    ],
    lights: [[11, 10, '#ffd8a0', 5], [11, 2, '#ffc890', 3], [20, 10, '#ffc890', 3]],
    entries: { from_town: [11, 18, 'up'], from_up: [2, 7, 'down'] },
    exits: [
      { at: [11, 19, 1, 1], to: 'kp_ravenmoor', entry: 'from_dojo', sfx: 'door' },
      { at: [2, 6, 1, 1], to: 'kp_raven_dojo_2', entry: 'from_down', sfx: 'door' },
    ],
    npcs: RD1T.map(t => t.npc).concat([
      folk({ id: 'rd_guide', name: 'Dojo Guide', model: 'man8', at: [12, 17], dir: 'up',
        lines: "Psst! Future champ! Vincent's doors run on the great clock in the hall. Each door opens at its own hour: you'll see the hour painted right on it.\fThe two levers by the clock move the hour hand. Pull them, watch the hand, and think. ...Also, don't touch the coffins. Trust me." }),
    ]),
    objects: [
      lever('rd_lever_a', [9, 12], 'kp_rd_a', true, hour1), lever('rd_lever_b', [13, 12], 'kp_rd_b', false, hour1),
      shutter('rd_door_xii', [11, 5], hour1, 0), shutter('rd_door_iii', [18, 10], hour1, 3, 'left'),
      shutter('rd_door_vi', [16, 15], hour1, 6), shutter('rd_door_ix', [4, 10], hour1, 9, 'right'),
      // the great clock's hour hand (turns with the levers)
      { id: 'rd_hand', at: [11, 10], prop: 'string', from: [0, 0.07, 0], to: [0, 0.07, -0.9], r: 0.05, sag: 0, count: 1, col: '#1a1008', solid: false, tick(o) { o.rot = -hour1() * 30; } },
    ],
    items: [W.item('rd_study', [20, 8], 'quick_gear'), W.item('rd_closet', [16, 17], 'royal_nut', 2)],
    triggers: RD1T.map(t => t.trig).concat([
      { at: [8, 3], on: 'talk', run: function* (s) { yield s.msg("A note in small, spidery handwriting:\f\"The brass lever turns the hour hand three hours. The iron lever, six.\nEach door opens only at its own hour. -V\""); } },
      { at: [14, 3], on: 'talk', run: function* (s) { yield s.msg('An old photograph in a silver frame: a man in a red cloak beside a woman in a lab coat.\fA third face, a man in round glasses, has been scratched out. Thoroughly.'); } },
      { at: [15, 18], on: 'talk', run: function* (s) { yield s.msg('You lift the coffin lid. It\'s empty, apart from a pillow and a note: "Not this one. -V"'); } },
    ]),
  });
  const RD2 = [
    "##############################",
    "##:::::############m_________#",
    "##:::::############__________#",
    "####.#####q......q#__________#",
    "#q::::::q#........#____^^^^^^#",
    "#::::::::#........#__________#",
    "#::::::::#........#_b________#",
    "#::::::::..........________b_#",
    "#::::::::#........#__________#",
    "#::::::::#........#_b______b_#",
    "#::::::kk#........#__________#",
    "#+########b..b...b#m________m#",
    "##############################",
  ];
  const RD2T = [
    W.trainer({ id: 'rd_lenore', cls: 'Medium', name: 'Lenore', model: { base: 'woman5', top: '#2a1a2a', bottom: '#2a1a2a', hair: '#e8e8f0', hairStyle: 'longstraight', skirt: 'long' },
      at: [14, 4], dir: 'down', sight: [14, 5, 1, 5], noBag: true, bg: 'dojo',
      line: "The master is sleeping. He's been sleeping for a very long time. You'll have to wake him... if you get past me.",
      lose: "...How rude. And how strong.", after: "His gate opens at the ninth hour. The iron lever is right here. You'll know what to do.",
      team: [['ghostmog_specter', 27], ['clockmog_chrono', 27], ['batmog_vampire', 27]], money: 1100 }),
  ];
  FF7.defineMap('kp_raven_dojo_2', {
    name: 'Nightmare Arcade', area: 'Ravenmoor', theme: 'mansion', music: 'nightmare', kpBg: 'dojo',
    look: { wall: '#4a3840', trim: '#2a1a20', wallH: 3.0, ambient: [0.32, 0.3, 0.42], light: [0.6, 0.58, 0.74], floor: ['#5a1e26', '#541a22'], floor2: ['#5a4030', '#523a2c'], floor3: ['#3a3440', '#36303c'] },
    grid: RD2,
    heights: [
      "000000000000000000000000000000",
      "000000000000000000000001111110",
      "000000000000000000000001111110",
      "000000000000000000000001111110",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
    ],
    props: deco(RD2, { b: () => ({ prop: 'bed', col: '#3a1818', col2: '#1a1010' }) }).concat([
      { at: [24, 0], prop: 'viewwindow', w: 4, h: 1.6, y: 0.9, col: ['#1a1a3a', '#4a4a7a'], col2: '#2a1a1a', bars: 3 },
      { at: [26, 0], prop: 'porthole', r: 0.35, y: 2.2, col: '#f0f0d8', col2: '#2a1a1a', stars: false },
    ]),
    lights: [[25, 2, '#c8d0ff', 4], [13, 7, '#ffc890', 3], [4, 6, '#ffc890', 3]],
    entries: { from_down: [1, 10, 'up'] },
    exits: [{ at: [1, 11, 1, 1], to: 'kp_raven_dojo', entry: 'from_up', sfx: 'door' }],
    npcs: RD2T.map(t => t.npc).concat([
      W.master({ id: 'rd_vincent', name: 'Vincent', model: 'vincent', at: [26, 2], badge: 6, money: 2800,
        team: [['tickmog_time_mage', 28], ['orbmog_seer', 28], ['clockmog_chrono', 29], ['galimog_galian', 29], ['tickmog_chronomancer', 30]],
        intro: "...You found your way through the clocks. Most don't. They wander the hall until morning, and morning never comes here.\fI am Vincent. This is the Nightmare Arcade. My moogles bend time. A little. Enough.\fShall we begin? I've been waiting. I am very good at waiting.",
        lose: '...So. Time moves on without me. Again.',
        after: "Take the Chaos Badge. ...Six badges. Two dojos remain, east of town past the Cinder Moor: Candlerock, then Glimmerfair. After them, the Summit Road north of town, and the Coliseum above the clouds.\fAnd... thank you. For the tower. Some debts are older than they look.",
        reward: [['boost_timemage', 1]] }),
    ]),
    objects: [
      lever('rd2_lever_a', [5, 5], 'kp_rd2_a', true, hour2), lever('rd2_lever_b', [12, 9], 'kp_rd2_b', false, hour2), lever('rd2_lever_b1', [3, 5], 'kp_rd2_b', false, hour2),
      shutter('rd2_gate1', [9, 7], hour2, 3, 'left'), shutter('rd2_gate2', [18, 7], hour2, 9, 'left'), shutter('rd2_closet', [4, 3], hour2, 6),
    ],
    items: [W.item('rd2_closet', [4, 1], 'max_oil', 2)],
    triggers: RD2T.map(t => t.trig).concat([
      { at: [27, 7], on: 'talk', run: function* (s) { yield s.msg('A coffin, lined in red velvet. The pillow has a dent in it. Someone sleeps here. Often.'); } },
    ]),
  });
  // ================================================================== Route 12: the Green Road
  // A mountain road zigzagging west and up from Ravenmoor, three switchbacks above a rift where the Lifestream glows
  // far below; a bridge across the rift on every level, a viewpoint spur, dead grass on the wide bends. Two drops
  // from one level to the next are one-way shortcuts. At the top: the plaza before the Lifestream Tower.
  KP.WILD.kp_route12 = [['galimog_werebeast', 24, 26, 28], ['batmog_vampire', 14, 27, 28], ['ghostmog_specter', 12, 27, 29], ['orbmog_seer', 12, 26, 28],
    ['callmog_summoner', 10, 26, 28], ['lumimog_beacon', 10, 26, 28], ['galimog_galian', 6, 28, 29], ['embermog_archmage', 8, 27, 29], ['spookmog_necromancer', 4, 27, 29]];
  const R12 = [
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    "%hhhhhhh%Y%%TYT%TTYT%TTYTRRTTTT%TT%TYTTY",
    "ThhhhhhhR%T%T%TT%TRYT%T%TTT%TTTYRRTRTTTR",
    "RhhhhhhhT%TTYYTR%T%%Y%YYTYY%TTTYT%RTTTYR",
    "Thhhhhhh%%TY%TY%%YTTRTTTTTT%TR%T%%TTR%T%",
    "%hhh+hhhYTTTTRR%TTTTTTTRYTTR%TT%%%%TTTT%",
    "Y__________,U,,,,****,,,,,,,,%RRR%%RRRRR",
    "R__________,,,,,,****,,U,,,,,RR%RRYRRR%R",
    " __________,,,,,,KKKKGGGGGG,,YRR        ",
    " ____U_____,,,,,,KKKKGGGGUG,,YRR        ",
    " __________,,,,,,KKKKGGGGGG,,RY%        ",
    "RRRYRRRR%RRR%RR%Y****R%RRRR^^YRY%YRY%%R%",
    "RR%RR%RRR%RR%%RRR****R%R%RR^^RRYRRR%R%R%",
    "R%RRRYY%,,,GGGGG,KKKK,GGGUG,,YYR%R%RY%RR",   // (no crystal at x14: the ledge above lands there)
    "%R%Y%R%R,,UGGGGG,KKKK,GGGGG,,%%R%R%RRY%Y",
    "%RYRR%%R,,,GGGGG,KKKK,GGGGG,,%YRRYRRRRRR",
    "%RRRRRY%^^RY%RRRR****R%R%R%%YRRRRR%%RRYR",
    "%R%RRRRR^^RRYR%RR****%YR%RR%%R%RRYRYRRRY",
    "%RYRYR%R,,,,,,,,,KKKKGGGGGGG,,,,,,%%%%RR",   // (no crystal at x24: the ledge above lands there)
    "RRR%R%YR,,,U,,,,,KKKKGGGGGGG,,,,,,YYR%RR",
    "%RYRRRYR,,,,,,,,,KKKKGGGGGGG,U,,,,RR%RR%",
    "R%YYRYRR  RGGGGR%****YRRRRYYRY^^RRR%RRRR",
    "RRRRRR%R  YGGGG%%****RR%R%%RRR^^RY%RRRRR",
    "                      ,,,,,,,,,GGGG,,!,,",
    "                 **** ,,,,U,,,,GGGG,U,,,",
    "                 **** ,,,,,,,,,GGGG,,,,,",
    "                 ****                   ",
    "                 ****                   ",
    "                 ****                   ",
    "                 ****                   ",
  ];
  const R12T = [
    W.trainer({ id: 'r12_hiker', cls: 'Hiker', name: 'Basalt', model: { base: 'man5', top: '#8a5a30', bottom: '#4a4a3a', hairStyle: 'buzz', extras: ['beard', 'harness'] },
      at: [35, 23], dir: 'down', sight: [35, 24, 1, 2],
      line: "Going up the Green Road? Every rock on this mountain glows a little now. Even my lunch glows. Let's battle before I think about that too hard!",
      lose: "Rock bottom. Ha. Sorry.", after: "Mind the drops on the bends. You can hop down from one level to the next, but there's no hopping back up.",
      team: [['grumog_viking', 27], ['galimog_werebeast', 26], ['minemog_foreman', 27]], money: 1080 }),
    W.trainer({ id: 'r12_orla', cls: 'Seer', name: 'Orla', model: { base: 'woman4', top: '#3a5a7a', bottom: '#2a3a5a', skirt: 'long', extras: ['robe'] },
      at: [13, 18], dir: 'down', sight: [13, 19, 1, 2],
      line: "I foresaw a trainer climbing toward the green light. I also foresaw them losing. One of those visions is about to come true.",
      lose: "Ah. That one.", after: "The glow below us is the Lifestream: the planet's memory. Hojo is trying to bottle it. Memories don't like bottles.",
      team: [['orbmog_seer', 27], ['callmog_summoner', 27], ['ghostmog_specter', 27], ['lumimog_beacon', 28]], money: 1120 }),
    W.trainer({ id: 'r12_kade', cls: 'Ace Trainer', name: 'Kade', model: { base: 'man3', top: '#2a4a7a', bottom: '#1a2a3a', jacket: '#3a3a44', hairStyle: 'short' },
      at: [24, 13], dir: 'down', sight: [24, 14, 1, 2],
      line: "Eight badges is the dream. Five's where I'm stuck. You look like you're stuck at five too. Let's get unstuck!",
      lose: "Okay, YOU'RE unstuck.", after: "If you're going into that tower, go all the way to the top. Whatever's humming up there, it's not getting quieter.",
      team: [['galimog_galian', 28], ['darkmog_knight', 27], ['embermog_archmage', 27], ['lancemog_dragoon', 27], ['halomog_bishop', 27]], money: 1120 }),
    W.grunt({ id: 'r12_pell', name: 'Grunt Pell', at: [2, 8], dir: 'right', sight: [3, 6, 7, 5], show: s => !s.flag('kp_hojo_done'),
      line: "Stop right there! The tower is closed for... very important research. The Professor said no visitors. Especially not ones with moogles!",
      lose: "Ugh! Fine! But you can't beat Ives!", after: 'Go on, then. The Professor will deal with you personally. He LOVES dealing with people personally.',
      team: [['galimog_werebeast', 27], ['batmog_vampire', 27], ['clockmog_clockmaker', 27]], money: 1080 }),
    W.grunt({ id: 'r12_ives', name: 'Grunt Ives', at: [5, 6], dir: 'left', sight: [4, 6, 1, 1], show: s => !s.flag('kp_hojo_done'),
      line: "Pell lost? Pell ALWAYS loses. I'm the competent one. Watch!",
      lose: "...I am not the competent one.", after: 'Inside, take the long way round the well. The pipes on the east side are hot. Very hot. Ask me how I know.',
      team: [['ghostmog_specter', 27], ['galimog_werebeast', 28], ['embermog_archmage', 27]], money: 1120 }),
  ];
  FF7.defineMap('kp_route12', {
    name: 'Route 12', area: 'Route 12', theme: 'mountain', music: 'trail', kpWild: 'kp_route12', kpBg: 'mountain',
    look: { sky: ['#06120e', '#1e4a3a'], fog: { color: [0.06, 0.18, 0.13], near: 11, far: 30 }, ambient: [0.36, 0.42, 0.4], light: [0.6, 0.72, 0.66],
      wall: '#4a4a50', floor: ['#5a5a54', '#54544e'], floor3: ['#4a5a56', '#445450'], grass: ['#5a6a48', '#546442'], mako: '#70ffb8', wood: ['#6a5640', '#5e4c38'],
      wallTex: { wall: 'rock' }, floorTex: { floor3: 'stone' } },
    grid: R12,
    heights: [
      "9999999999999999999999999999999999999999",
      "9777777799999999999999999999999999999999",
      "9777777799999999999999999999999999999999",
      "9777777799999999999999999999999999999999",
      "9777777799999999999999999999999999999999",
      "9777777799999999999999999999999999999999",
      "9777777777777777700007777777799999999999",
      "9777777777777777700007777777799999999999",
      "0777777777777777777777777777777700000000",
      "0777777777777777777777777777777700000000",
      "0777777777777777777777777777777700000000",
      "7777777777777777700007777776677777777777",
      "7777777777777777700007777776677777777777",
      "5555555555555555555555555555555555555555",
      "5555555555555555555555555555555555555555",
      "5555555555555555555555555555555555555555",
      "5555555544555555500005555555555555555555",
      "5555555544555555500005555555555555555555",
      "3333333333333333333333333333333333333333",
      "3333333333333333333333333333333333333333",
      "3333333333333333333333333333333333333333",
      "3333333300333333300003333333332233111111",
      "3333333300333333300003333333332233111111",
      "0000000000000000000000111111111111111111",
      "0000000000000000000000111111111111111111",
      "0000000000000000000000111111111111111111",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
    ],
    props: deco(R12, { U: (x, y) => ({ prop: 'crystal', col: '#70ffb8' }) }),
    buildings: [{ at: [1, 1, 7, 5], h: 8.5, col: '#2a3a36', roof: '#1a2a26', top: 'flat', win: '#70ffb8', tex: 'panel' }],
    labels: [{ at: [4, 5], face: 's', text: 'LIFESTREAM TOWER', size: 0.14, col: '#80ffc0', y: 2.4, glow: true }],
    lights: [[18.5, 12, '#70ffb8', 6], [18.5, 22, '#70ffb8', 6], [4, 7, '#70ffb8', 4]],
    entries: { from_ravenmoor: [38, 24, 'left'], from_tower: [4, 6, 'down'] },
    exits: [
      { at: [39, 23, 1, 3], to: 'kp_ravenmoor', entry: 'from_route12' },
      { at: [4, 5, 1, 1], to: 'kp_lifestream_1', entry: 'from_route12', sfx: 'door' },
    ],
    npcs: R12T.map(t => t.npc).concat([
      folk({ id: 'r12_deserter', name: 'Nervous Scientist', model: 'scientist', at: [32, 19], dir: 'left', show: s => !s.flag('kp_hojo_done'),
        lines: "I'm not running away. I'm... relocating. Rapidly. Far from that tower.\fThe Professor's Project J started humming last night. Then the lights started humming. Then I started humming. I don't hum!" }),
      folk({ id: 'r12_deserter2', name: 'Former Scientist', model: 'scientist', at: [32, 19], dir: 'left', show: s => s.flag('kp_hojo_done'),
        lines: "Team Hojo's done for, they say. I'm going back to school. Botany. Flowers don't hum." }),
      W.moogle('r12_mog', 'galimog_werebeast', [27, 24], { wander: 2, line: 'Galimog: Grrrkupo! Its fur stands on end. Then it sits, politely.' }),
    ]),
    items: [W.item('r12_spur', [12, 22], 'royal_nut', 2), W.item('r12_top', [27, 7], 'max_oil', 2)],
    triggers: [
      W.sign([37, 23], 'ROUTE 12 - THE GREEN ROAD\fWest and up: the Lifestream Tower.\f"TEAM HOJO PROPERTY. KEEP OUT." (Someone has added: "please")'),
      W.hidden('r12_crystal', [14, 13], 'lucky_pom'),
      ledge([12, 10, 3], 'down', 3), ledge([23, 15, 3], 'down', 3),
    ].concat(R12T.map(t => t.trig)),
  });

  // ================================================================== the Lifestream Tower: Hojo's finale
  // Floor 1: a round hall round a well of rising light. Pipes from the well to the wall close off the east side of the
  // entrance, so the way up is round the west; the north-east arc leads through a gap in the machinery to a dead end
  // (pods, an item). Floor 2: Hojo's lab, the tank of Project J. Hojo battle 2, then Jenomog breaks free (met once,
  // W.legend), Team Hojo falls apart (kp_hojo_done: Ravenmoor's dojo opens).
  KP.WILD.kp_lifestream = [['lumimog_beacon', 20, 26, 28], ['callmog_summoner', 16, 26, 28], ['ghostmog_specter', 14, 27, 29], ['galimog_werebeast', 14, 26, 28],
    ['orbmog_seer', 12, 27, 28], ['fernwisp_dryad', 8, 27, 29], ['galimog_galian', 6, 28, 29], ['spookmog_necromancer', 5, 27, 29], ['callmog_evoker', 5, 28, 29]];
  const LS_LOOK = { floor: ['#2a5a50', '#28544a'], floor3: ['#3a6a60', '#36645a'], wall: '#1a3a34', trim: '#0a2a24', glow: '#80ffc8', mako: '#90ffd0', wallH: 3.0,
    sky: ['#010a08', '#062a1e'], ambient: [0.34, 0.52, 0.46], light: [0.5, 0.86, 0.7], fog: { color: [0.03, 0.16, 0.12], near: 7, far: 20 }, wallTex: { wall: 'panel' } };
  const caged = (id, sp, at) => W.moogle(id, sp, at, { wander: 2, show: s => s.flag('kp_hojo_done'), line: `${KP.SPECIES[sp] ? KP.SPECIES[sp].moogle : 'The moogle'}: Kupo! Kupo kupo! It's free, and it wants you to know it.` });
  const LS1 = [
    "           #^^#           ",
    "        ####..####        ",
    "      ##..........##      ",
    "    ##M............M##    ",
    "   ##................##   ",
    "   #..................#   ",
    "  #..................y.#  ",
    " ##y.......eeee........## ",
    " #.......eeeeeeee.......# ",
    " #......eee****eee....y.# ",
    " #......ee******ee......# ",
    "##y....ee********ee.....##",
    "##.....ee*******MMMPM.MMM#",
    " #......ee******MMMMM.MZM ",
    " #......eee***PPee......# ",
    " #.y.....eeeeePPe.......# ",
    " ##........eeePP.......## ",
    "  #...........PP......y#  ",
    "   #..........PP....y.#   ",
    "   ##M........PP.....##   ",
    "    ##........PP....##    ",
    "      ##.M....PP..##      ",
    "        ####..####        ",
    "           #..#           ",
  ];
  const LS1T = [
    W.grunt({ id: 'ls_kessler', name: 'Scientist Kessler', at: [2, 12], dir: 'right', sight: [3, 12, 7, 1], show: s => !s.flag('kp_hojo_done'),
      line: "An intruder! In the Lifestream Tower! Do you know what this light IS? Neither do we, entirely. That's what makes it science!",
      lose: "My data... my beautiful data...", after: 'The Professor is upstairs with Project J. He talks to it. It talks back. I take notes and try not to listen.',
      team: [['ghostmog_specter', 27], ['galimog_werebeast', 27], ['lumimog_beacon', 28]], money: 1120 }),
    W.grunt({ id: 'ls_ivers', name: 'Scientist Ivers', at: [15, 3], dir: 'left', sight: [11, 2, 4, 2], show: s => !s.flag('kp_hojo_done'),
      line: "The stairs are off-limits! The Professor is in the middle of a breakthrough. Or a breakdown. It's hard to tell with him.",
      lose: "Fine! Go up! Don't say I didn't warn you!", after: "Whatever happens up there, I was never here. Write that down. No, don't write that down.",
      team: [['spookmog_necromancer', 27], ['batmog_vampire', 28], ['orbmog_seer', 27]], money: 1120 }),
  ];
  FF7.defineMap('kp_lifestream_1', {
    name: 'Lifestream Tower', area: 'Lifestream Tower', theme: 'lifestream', music: 'lifestream', kpWild: 'kp_lifestream', kpBg: 'lifestream', kpCave: true,
    look: LS_LOOK,
    grid: LS1,
    heights: [
      "00000000000011000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
    ],
    props: deco(LS1, { y: () => ({ prop: 'pod', col: '#90ffd0' }) }).concat([{ at: [12.5, 11.5], prop: 'disc', r: 1.2, h: 0.05, col: '#2a5a50', top: '#c8fff0', skirt: 0.5 }]),
    lights: [[12.5, 11.5, '#90ffd0', 8], [12.5, 2, '#90ffd0', 3], [21, 17, '#90ffd0', 3]],
    entries: { from_route12: [12, 21, 'up'], from_up: [12, 2, 'down'] },
    exits: [
      { at: [12, 23, 2, 1], to: 'kp_route12', entry: 'from_tower' },
      { at: [12, 0, 2, 1], to: 'kp_lifestream_2', entry: 'from_down' },
    ],
    npcs: LS1T.map(t => t.npc).concat([
      caged('ls1_mog1', 'tufty_mime', [4, 9]), caged('ls1_mog2', 'mopluff_dancer', [20, 7]), caged('ls1_mog3', 'chocomog_rider', [19, 17]),
      folk({ id: 'ls1_sci', name: 'Scientist', model: 'scientist', at: [6, 18], dir: 'up', show: s => s.flag('kp_hojo_done'),
        lines: "The Professor's gone and the pods are open. We're... just going to go home, I think. Is that allowed? Nobody's told us if that's allowed." }),
    ]),
    items: [W.item('ls1_pods', [20, 19], 'leftover_nut'), W.item('ls1_north', [5, 5], 'battery')],
    triggers: LS1T.map(t => t.trig).concat([
      { at: [3, 7], on: 'talk', run: function* (s) { yield s.msg(s.flag('kp_hojo_done') ? 'An empty pod. Its lid hangs open.' : 'A glass pod full of green light. A moogle floats inside, fast asleep, its pom-pom drifting.'); } },
    ]),
  });

  // floor 2: the lab
  const HOJO2 = [['galimog_galian', 27], ['spookmog_necromancer', 27], ['clockmog_chrono', 28], ['embermog_archmage', 28], ['jenomog_project_j', 29]];   // (a team at the level cap still has to work for it)
  const JENO = W.legend('ls_jenomog', 'jenomog_project_j', { at: [11, 5], lv: 30, bg: 'lifestream', music: 'weaponraid', show: s => s.flag('kp_hojo_done'),
    intro: 'Project J hovers over the broken tank, lit from inside like the Lifestream itself.\fIt tilts its head. It remembers something... and it wants to know if you do too.' });
  const hojoFinale = function* (s) {
    if (s.flag('kp_hojo_done')) return;
    yield s.face('ls_hojo', 'player'); yield s.face('player', 'ls_hojo');
    yield s.say('hojo', "Ah! My favorite test subject has arrived! Well. Not my FAVORITE. My favorite is in the tank.");
    yield s.say('hojo', "Behold: Project J! I fished a few cells out of the Lifestream, the planet's own memory, and gave them to a moogle. Just a pinch.\fMoogles, you see, are wonderfully absorbent.");
    yield s.say('hojo', "It remembers things no moogle should. Ancient things. It has also eaten three of my assistants' lunches. Science is not without sacrifice.");
    yield s.say('hojo', "And now: a field test! Let's see how your little friends fare against the future. Hehehe... HAHAHAHA!");
    const r = yield* KP.fight(s, { kind: 'trainer', foes: W.team(HOJO2), bg: 'lifestream', music: 'makocannon', ai: 'smart',
      trainer: { name: 'Team Hojo Boss Hojo', lose: "Impossible! ...No. Entirely possible. Merely unexpected. I'll write that down.", money: 3200, model: 'hojo' } });
    if (r !== 'win') return;
    s.set('kp_tr_ls_hojo');
    yield s.say('hojo', "Hmph. A minor setback. Project J simply needs another... what is that noise?");
    s.shake(4, 60); s.sfx('alarm_short');
    yield 40;
    yield s.say('hojo', 'Project J. Sit. SIT!');
    yield s.move('ls_hojo', 11, 7);
    s.shake(8, 50); s.flash('#c0ffe0', 16);
    s.sfx('bosskill');
    s.set('kp_hojo_done');
    s.remove('ls_projj');
    yield 30;
    s.spawn('ls_jenomog', { enemy: 'kp_jenomog_project_j', scale: 1.2 }, 11, 5, 'down', { name: JENO.name, talk: JENO.talk });
    yield s.say('hojo', "It's... free. Fascinating! Terrifying! Mostly fascinating! I must take notes... from a very, very great distance!");
    yield s.move('ls_hojo', [[11, 10], [11, 15]], { run: true });
    s.remove('ls_hojo');
    yield s.msg('Hojo has fled the tower!\fThe pods hiss open below, and the captured moogles tumble out and scurry for the stairs.\fWithout its leader, Team Hojo is finished.');
    yield s.msg('Project J floats in front of its cracked tank, quite still, watching you.');
  };
  const LS2 = [
    "          ####          ",
    "      ############      ",
    "    #M#__________#M#    ",
    "   #DDDD__eeee__DDDD#   ",
    "  ##_____ee@eee_____##  ",
    " ##______eeeeee______## ",
    " #_y______eeee______y_# ",
    " #____________________# ",
    "##M__________________M##",
    "##____________________##",
    " #_y________________y_# ",
    " #____________________# ",
    " ##__________________## ",
    "  ##________________##  ",
    "   ##_y__________y_##   ",
    "    ###__________###    ",
    "      #####..#####      ",
    "          #..#          ",
  ];
  FF7.defineMap('kp_lifestream_2', {
    name: 'Lifestream Tower - Laboratory', area: 'Lifestream Tower', theme: 'lifestream', music: s => s.flag('kp_hojo_done') ? 'lifestream' : 'jenova', kpBg: 'lifestream',
    look: Object.assign({}, LS_LOOK, { floor3: ['#4a6a66', '#44645e'], wallTex: { wall: 'panel' } }),
    grid: LS2,
    heights: [
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
    ],
    legend: { '@': 'capsule' },
    props: deco(LS2, { y: () => ({ prop: 'pod', col: '#90ffd0' }) }).concat([
      { at: [11, 4], prop: 'capsule', col: '#a0ffd8', h: 1.6 },
      { at: [11, 0], prop: 'screen', w: 4, h: 1.0, y: 1.8, style: 'gauges', col: '#70ffb0', rot: 0 },
    ]),
    lights: [[11.5, 4.5, '#a0ffd8', 6], [11.5, 11, '#90ffd0', 4]],
    entries: { from_down: [11, 15, 'up'] },
    exits: [{ at: [11, 17, 2, 1], to: 'kp_lifestream_1', entry: 'from_up' }],
    npcs: [
      { id: 'ls_hojo', name: 'Hojo', model: 'hojo', at: [11, 6], dir: 'down', show: s => !s.flag('kp_hojo_done'), talk: hojoFinale },
      { id: 'ls_projj', name: 'Project J', model: { enemy: 'kp_jenomog_project_j', scale: 0.9 }, at: [11, 4], dir: 'down', hover: 0.35, show: s => !s.flag('kp_hojo_done'),
        talk: function* (s) { yield s.msg('Inside the tank, something floats in the green light. It opens one eye and looks straight at you.'); } },
      JENO,
      caged('ls2_mog1', 'nutmog_thief', [5, 7]), caged('ls2_mog2', 'pipkin_freelancer', [18, 11]),
      // a Nurse Mog Hojo "borrowed" from the Mog Center, kept by the stairs to patch up his test subjects: she patches
      // yours up instead (a rest before the boss, as Pokémon gives one in a villain's lair), and goes home after
      { id: 'ls_nurse', name: 'Nurse Mog', model: { enemy: 'kp_pomsprout_devout', scale: 0.85 }, at: [7, 14], dir: 'right', show: s => !s.flag('kp_hojo_done'),
        talk: function* (s) {
          if (!s.flag('kp_ls_nurse')) {
            s.set('kp_ls_nurse');
            yield s.say('Nurse Mog', "Kupo! You're not a lab coat! Hojo brought me here to fix up his \"test subjects\". I've been fixing them up AND telling them to run.");
          }
          const c = yield s.ask('Nurse Mog', "He's just up there. Shall I fix up your moogles first?", ['Yes, please', 'No thanks']);
          if (c !== 0) { yield s.say('Nurse Mog', 'Be careful, kupo. That tank hums at night.'); return; }
          s.sfx('heal'); s.flash('#ffd0e0', 10, 0.5); KP.healAll();
          yield 30;
          yield s.say('Nurse Mog', 'All better! Now go and show that man what moogles are for, kupo!');
        } },
    ],
    items: [W.item('ls2_desk', [17, 4], 'boost_summoner')],
    triggers: [
      { id: 'ls_hojo_see', at: [7, 8, 9, 3], once: false, if: s => !s.flag('kp_hojo_done'), run: hojoFinale },
      { at: [11, 4], on: 'talk', if: s => s.flag('kp_hojo_done'), run: function* (s) { yield s.msg('The tank is empty. A long crack runs up the glass, still glowing faintly at the edges.'); } },
      { at: [5, 3], on: 'talk', run: function* (s) { yield s.msg("Hojo's notes. Most of it is equations. One page just says \"IT HUMS\" in very large letters, underlined three times."); } },
    ],
  });
  // ================================================================== Route 13: the Badge Gate
  // North out of Ravenmoor the fog lifts. A wall closes the valley: the Badge Gate, its two towers hung with the six
  // dojo masters' banners; only a trainer with all eight badges goes through (KP.leagueReady). Beyond: an alpine meadow with a tarn,
  // a west terrace (hop down from its lip, or take the stairs), an upper terrace, and the mouth of the Summit Road.
  KP.WILD.kp_route13 = [['grumog_viking', 18, 27, 29], ['icemog_yeti', 14, 27, 29], ['kupochi_master', 12, 27, 29], ['stampo_blackbelt', 12, 27, 29],
    ['lancemog_highwind', 10, 28, 29], ['darkmog_knight', 10, 27, 29], ['minemog_foreman', 10, 27, 28], ['mogsquire_paladin', 10, 28, 29], ['wyrmog_rider', 4, 28, 30]];
  const R13 = [
    "TTTTTTTTTTTTTTTT############TTTT",
    "TTTTTTTTTTTTTTTT#####++#####TTTT",
    "TTTTTTTTTTTTTTTT,,,,::::,,,,,TTT",
    "TTTTTTTTTTTTTTTT,,,,,,,,,,R,,TTT",
    "TTTTTTTTTTTTTTTT,R,,,,,,GGGG,TTT",
    "TT,,,,,,,,,,R,RR,,,,,,,,GGGG,TTT",
    "TT,R,,GGGG,,,,^^,,,,,,,,GGGG,TTT",
    "TT,,,,GGGG,,,,^^,,,,,,,,,,,,,TTT",
    "TT,,,,GGGG,,,,RRTTTTTTTTTTTTTTTT",
    "TT,,,,,,,,,,,,RRTTTTTTTTTTTTTTTT",
    "TTTT^^RR,,,,,,,,,,,,,,,,,,TTTTTT",
    "TTTT^^,,,,,,,,,,,GGGG,,,,,,TTTTT",
    "TTT,,,,GGGGGG,,,,GGGG,,,,,,,TTTT",
    "TTT,,,,GGGGGG,,,,GGGG,~~~~,RTTTT",
    "TTT,,,,GGGGGG,,,,GGGG~~~~~~,TTTT",
    "TTT,,,,GGGGGG,,,,GGGG,~~~~,,TTTT",
    "TTT,,,,,,R,,,,,,,GGGG,,,,,,TTTTT",
    "TTTTTTT,,,,,,!,,,,,,,,,,,TTTTTTT",
    "TTTTTTTTTTTTTT^^^^TTTTTTTTTTTTTT",
    "TTTTTTTTTThhhh::::hhhhTTTTTTTTTT",
    "##########hhhh::::hhhh##########",
    "##########hhhh::::hhhh##########",
    "##########hhhh::::hhhh##########",
    "TTTTTTTTTThhhh::::hhhhTTTTTTTTTT",
    "TTTTTTTTTT,,,,::::,,,,TTTTTTTTTT",   // (a clearing before each shrine: the pines hid its banners)
    "TTTTTTTTTT,,,!::::,,,,TTTTTTTTTT",
    "TTTTTTTTTTTGG,::::,,,TTTTTTTTTTT",
    "TTTTTTTTTTGGG,::::,R,,TTTTTTTTTT",
    "TTTTTTTTT,GGG,::::,,,,,TTTTTTTTT",
    "TTTTTTTTT,GGG,::::,,,R,TTTTTTTTT",
    "TTTTTTTTT,,,,,::::,,,,,TTTTTTTTT",
    "TTTTTTTTTT,,,,::::,,,,TTTTTTTTTT",
  ];
  const BADGE_BANNERS = [[10, 'YUFFIE', 1], [11, 'BARRET', 2], [12, 'TIFA', 3], [19, 'CID', 4], [20, 'AERIS', 5], [21, 'VINCENT', 6]];
  const R13T = [
    W.trainer({ id: 'r13_gunnar', cls: 'Veteran', name: 'Gunnar', model: { base: 'oldman2', top: '#7a3a2a', bottom: '#3a3a3a', extras: ['beard', 'furcollar'] },
      at: [10, 14], dir: 'right', sight: [11, 14, 6, 1],
      line: "Eight badges, eh? I had six once, back when there were six. Then I had a family, a farm and a bad knee. Show me what eight looks like these days!",
      lose: "Hah! Still looks good.", after: "The Summit Road is a long climb in the dark. Bring Glow Nuts: the moogles in there love them.",
      team: [['grumog_viking', 28], ['icemog_yeti', 28], ['chocomog_knight', 28], ['mogsquire_paladin', 29]], money: 1160 }),
    W.trainer({ id: 'r13_mira', cls: 'Ace Trainer', name: 'Mira', model: { base: 'woman7', top: '#c03a4a', bottom: '#2a2a34', jacket: '#3a3a44', hairStyle: 'ponytail' },
      at: [9, 5], dir: 'down', sight: [9, 6, 1, 4],
      line: "I've been training up here for a month. Thin air, strong moogles. Let's see how yours breathe!",
      lose: "...Okay, I need another month.", after: "You can hop off the lip of this terrace into the meadow. Quicker than the stairs, but no climbing back.",
      team: [['lancemog_highwind', 28], ['kupochi_master', 28], ['redpom_sage', 28], ['mopluff_dancer', 28]], money: 1160 }),
    W.trainer({ id: 'r13_jonah', cls: 'Ace Trainer', name: 'Jonah', model: { base: 'man3', top: '#2a6a4a', bottom: '#2a2a34', jacket: '#3a3a44', hairStyle: 'spikyback' },
      at: [24, 3], dir: 'left', sight: [17, 3, 7, 1],
      line: "The Summit Road's right behind me. I'm the last warm-up before the dark. Ready?",
      lose: "Warmed up. Definitely warmed up.", after: "Inside, a Black Belt's been guarding a boulder for a week. Beat him and he'll move it. He's very proud of that boulder.",
      team: [['darkmog_knight', 28], ['wyrmog_rider', 28], ['embermog_archmage', 28], ['gearmog_artificer', 28], ['pomsprout_devout', 28]], money: 1200 }),
  ];
  FF7.defineMap('kp_route13', {
    name: 'Route 13', area: 'Route 13', theme: 'mountain', music: 'othermountain', kpWild: 'kp_route13', kpBg: 'mountain',
    look: { wallTex: { wall: 'stoneblock' }, wall: '#8a8478', wallTop: '#6a645a', grass: ['#5a8a44', '#54843e'], floor2: ['#8a7a60', '#827258'], water: '#4a7ab0' },
    grid: R13,
    heights: [
      "11111111111111118888888888881111",
      "11111111111111118888877888881111",
      "11111111111111117777777777777111",
      "11111111111111117777777777777111",
      "11111111111111117777777777777111",
      "11555555555555777777777777777111",
      "11555555555555667777777777777111",
      "11555555555555667777777777777111",
      "11555555555555557777777777777111",
      "11555555555555557777777777777111",
      "11554433333333333333333333311111",
      "11554433333333333333333333311111",
      "11133333333333333333333333331111",
      "11133333333333333333333333331111",
      "11133333333333333333333333331111",
      "11133333333333333333333333331111",
      "11133333333333333333333333311111",
      "11111333333333333333333333311111",
      "11111111111111222211111111111111",
      "11111111111111111111111111111111",
      "22222222221111111111112222222222",
      "22222222221111111111112222222222",
      "22222222221111111111112222222222",
      "11111111111111111111111111111111",
      "11111111111111111111111111111111",
      "11111111111111111111111111111111",
      "11111111111111111111111111111111",
      "11111111111111111111111111111111",
      "11111111111111111111111111111111",
      "11111111111111111111111111111111",
      "11111111111111111111111111111111",
      "11111111111111111111111111111111",
    ],
    props: BADGE_BANNERS.map(([x, t, n]) => ({ at: [x, 23], prop: 'banner', col: KP.BADGES[n].col, col2: '#e8d8a0', y: 2.6, h: 1.6, w: 0.9, text: t, size: 0.11, textCol: '#1a1a20' })),
    buildings: [
      { at: [10, 19, 4, 5], h: 3.2, col: '#8a8478', roof: '#5a3a3a', top: 'hip', rise: 1.4, tex: 'stoneblock', win: false },
      { at: [18, 19, 4, 5], h: 3.2, col: '#8a8478', roof: '#5a3a3a', top: 'hip', rise: 1.4, tex: 'stoneblock', win: false },
    ],
    labels: [{ at: [11.5, 23], face: 's', text: 'BADGE', size: 0.2, col: '#e8d8a0', y: 2.95 }, { at: [19.5, 23], face: 's', text: 'GATE', size: 0.2, col: '#e8d8a0', y: 2.95 }],
    entries: { from_ravenmoor: [15, 30, 'up'], from_summit: [21, 2, 'down'] },
    exits: [
      { at: [14, 31, 4, 1], to: 'kp_ravenmoor', entry: 'from_route13' },
      { at: [21, 1, 2, 1], to: 'kp_summit_1', entry: 'from_route13', sfx: 'door' },
    ],
    npcs: R13T.map(t => t.npc).concat([
      folk({ id: 'r13_captain', name: 'Gate Captain', model: { base: 'man7', top: '#4a5a8a', bottom: '#2a2a3a', hairStyle: 'helmet', extras: ['pauldronL', 'pauldronR'] }, at: [14, 24], dir: 'down',
        lines: s => KP.badgeCount() >= KP.LEAGUE_BADGES ? "Eight badges! Shuriken, Gear, Fist, Wind, Bloom, Chaos, Flame and Encore. The gate is yours. The Summit Road is a long, dark climb. Good luck."
          : KP.leagueReady() ? "The Champion! The gate's always open to you, badges or no badges. Though they say there are two new dojos east of Ravenmoor..."
          : `The Badge Gate opens only for trainers with all eight dojo badges. You have ${KP.badgeCount()}.${KP.badgeCount() >= 6 ? ' The last two are east of Ravenmoor: Candlerock, then Glimmerfair.' : ''} Come back when the banners would be proud of you.` }),
      W.moogle('r13_mog', 'icemog_yeti', [21, 13], { wander: 2, line: 'Icemog: Brrr-kupo! It is very fluffy and very proud of it.' }),
    ]),
    items: [W.item('r13_upper', [27, 6], 'royal_nut', 2), W.item('r13_west', [2, 5], 'boost_dragoon')],
    triggers: [
      { id: 'r13_gate', at: [14, 20, 4, 1], once: false, if: () => !KP.leagueReady(),
        run: function* (s) { yield* W.gate(KP.LEAGUE_BADGES, 'Gate Captain').blocked(s); yield s.walk('player', 0, 1); } },
      W.sign([13, 25], 'ROUTE 13 - THE BADGE GATE\fNorth: the Summit Road, and the Kupo Coliseum above the clouds.\fSouth: Ravenmoor.'),
      W.sign([13, 17], 'SUMMIT ROAD\fThe last climb before the Coliseum. Trainers only, and only the stubborn ones.'),
      W.hidden('r13_rock', [27, 13], 'max_oil'),
      ledge([8, 9, 6], 'down', 2),
    ].concat(R13T.map(t => t.trig)),
  });

  // ================================================================== the Summit Road (Victory Road)
  // Floor 1: three levels of cave: a lower cavern, a west chamber up one flight, an upper gallery up another. From the
  // east hollow a stair cuts straight up to the gallery, but a boulder sits on it until the Black Belt in the hollow
  // is beaten (his Blackbelt rolls it away). Floor 2: a chasm splits the cave; two bridges cross it, a side ledge
  // (west) is a dead end with a Dragon Tamer, and the way out is up on the high shelf in the north-west.
  KP.WILD.kp_summit = [['grumog_viking', 14, 27, 30], ['minemog_foreman', 14, 27, 29], ['shellmog_guardian', 12, 27, 30], ['icemog_yeti', 10, 28, 30],
    ['stampo_blackbelt', 10, 27, 29], ['lumimog_beacon', 10, 27, 29], ['darkmog_knight', 10, 28, 30], ['gearmog_artificer', 8, 28, 30], ['wyrmog_rider', 7, 28, 30], ['mogmk_mk1', 5, 27, 29]];
  const SU_LOOK = { floor: ['#4a4440', '#443e3a'], floor2: ['#5a5048', '#544a42'], wall: '#5a5048', water: '#2a4a6a', ambient: [0.4, 0.38, 0.38], light: [0.66, 0.62, 0.56] };
  const SU1 = [
    "##########################::######",
    "###################:::::::::######",
    "################:::::::::::::::###",
    "###############::R::::::::::::::##",
    "##############::::::::::::::::U::#",
    "########:#####::U::::::::::::R::##",
    "#####:::::::^^:::::::::::::::::###",
    "####::::::::^^::::::::::::::######",
    "###:::::::::::#######^^###########",
    "##::R::::::::::######^^....#######",
    "##:::::::::::U:#####.^^.....R#####",
    "##:U:::::::::::###.............###",
    "##:::::::::::::###..U...~~~~~..###",
    "##:::::::::R:::##....R.~~~~~~~..##",
    "###:::R:::::::####......~~~~~..###",
    "####:::::::::#####.........U...###",
    "#####:::::::#######..........#####",
    "########:^^########..#.....#######",
    "#########^^#..........############",
    "#########................#########",
    "#######....................#######",
    "######......R...||.......R..######",
    "######.R...................U######",
    "######..............R.......######",
    "#######....................#######",
    "#########................#########",
    "############..........############",
    "###############....###############",
  ];
  const SU1T = [
    W.trainer({ id: 'su_ox', cls: 'Black Belt', name: 'Ox', model: { base: 'man5', top: '#f0ece0', bottom: '#f0ece0', belt: '#1a1a1a', hairStyle: 'bald', build: 'big' },
      at: [24, 11], dir: 'down', sight: [22, 12, 5, 2], bg: 'cave',
      line: "HALT! This boulder is MY boulder. My Blackbelt carried it here. Beat me, and he'll carry it back!",
      lose: 'A deal is a deal! Blackbelt, the boulder!', after: "My Blackbelt moved it. Now he's sulking. He liked that boulder.",
      team: [['stampo_blackbelt', 28], ['kupochi_master', 28], ['grumog_viking', 29], ['icemog_yeti', 28]], money: 1160 }),
    W.trainer({ id: 'su_selene', cls: 'Ace Trainer', name: 'Selene', model: { base: 'woman5', top: '#5a3a8a', bottom: '#2a2a34', jacket: '#3a3a44', hairStyle: 'longmessy' },
      at: [2, 11], dir: 'right', sight: [3, 11, 12, 1], bg: 'cave',
      line: "Everyone on the Summit Road has eight badges. So badges don't matter in here. Only this does!",
      lose: 'Fair. Very fair.', after: "Up the steps and through the gallery. The air gets thinner... and the trainers get meaner.",
      team: [['embermog_archmage', 29], ['halomog_bishop', 28], ['lancemog_highwind', 29], ['clockmog_chrono', 28], ['nutmog_ninja', 28]], money: 1200 }),
    W.trainer({ id: 'su_tobias', cls: 'Ace Trainer', name: 'Tobias', model: { base: 'man9', top: '#8a6a2a', bottom: '#2a2a34', jacket: '#3a3a44', hairStyle: 'short' },
      at: [29, 3], dir: 'left', sight: [20, 2, 9, 3], bg: 'cave',
      line: "You've come this far, so you're good. Question is: are you Coliseum good?",
      lose: "Yeah. You're Coliseum good.", after: "One more floor. There's a chasm up there; the bridges are older than me. Don't look down.",
      team: [['gearmog_artificer', 29], ['darkmog_knight', 29], ['fletchmog_sniper', 28], ['mogpirate_sky_pirate', 28], ['callmog_evoker', 29]], money: 1200 }),
  ];
  FF7.defineMap('kp_summit_1', {
    name: 'Summit Road', area: 'Summit Road', theme: 'cave', music: 'despair', kpWild: 'kp_summit', kpBg: 'cave', kpCave: true,
    look: SU_LOOK,
    grid: SU1,
    heights: [
      "0000000000000000000000000066000000",
      "0000000000000000000666666666000000",
      "0000000000000000666666666666666000",
      "0000000000000006666666666666666600",
      "0000000000000066666666666666666660",
      "0000000030000066666666666666666600",
      "0000033333335566666666666666666000",
      "0000333333335566666666666666000000",
      "0003333333333300000003300000000000",
      "0033333333333330000003300000000000",
      "0033333333333330000003300000000000",
      "0033333333333330000000000000000000",
      "0033333333333330000000000000000000",
      "0033333333333330000000000000000000",
      "0003333333333300000000000000000000",
      "0000333333333000000000000000000000",
      "0000033333330000000000000000000000",
      "0000000032200000000000000000000000",
      "0000000002200000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
    ],
    props: deco(SU1, { U: () => ({ prop: 'crystal', col: '#a0c8ff' }), '|': () => ({ prop: 'spire', h: 3.2, r: 0.6, col: '#5a5048' }) }),
    lights: [[6, 20, '#a0c8ff', 3], [27, 22, '#a0c8ff', 3], [13, 10, '#a0c8ff', 3], [20, 12, '#a0c8ff', 3], [16, 5, '#a0c8ff', 3], [30, 4, '#a0c8ff', 3]],
    entries: { from_route13: [16, 26, 'up'], from_summit2: [26, 1, 'down'] },
    exits: [
      { at: [15, 27, 4, 1], to: 'kp_route13', entry: 'from_summit' },
      { at: [26, 0, 2, 1], to: 'kp_summit_2', entry: 'from_summit1' },
    ],
    npcs: SU1T.map(t => t.npc).concat([
      W.moogle('su1_mog', 'minemog_foreman', [8, 22], { wander: 2, line: 'Minemog: Kupo-ho! It taps the wall with its pick and listens.' }),
    ]),
    objects: [W.barrier('su_boulder1', [21, 10], () => W.beaten('su_ox'), { prop: 'rock', col: '#6a6058', scale: 1.6 }),
      W.barrier('su_boulder2', [22, 10], () => W.beaten('su_ox'), { prop: 'rock', col: '#6a6058', scale: 1.6 })],
    items: [W.item('su1_pool', [30, 12], 'royal_nut'), W.item('su1_west', [3, 13], 'max_oil'), W.item('su1_gallery', [31, 4], 'boost_monk')],
    triggers: SU1T.map(t => t.trig),
  });
  const SU2 = [
    "###::##########   ##################",
    "###::###########   #################",
    "###::#:::::::###   #################",
    "####::::::::U::#   #################",
    "###:::R:::::::::   ###.......#######",
    "##::::::::::::::   .............####",
    "###::::::::::KKKKKKK^^...........###",
    "####::::::R::KKKKKKK^^......R....###",
    "######:::::::#   ..............U..##",
    "##############   #....R..........###",
    "##############   #...............###",
    "##############   ##.............####",
    "###############   ####.......#######",
    "###############   #######^^#########",
    "#######:::::::##   ######^^#########",
    "#####:::::::::::   #####....########",
    "####::::::::::::   #####.......#####",
    "####::::R:::::::   ###...........###",
    "###::::::::::KKKKKKK^^........R...##",
    "####:U:::::::KKKKKKK^^.............#",
    "####::::::::R:   ###.............U.#",
    "#####:::::::::   ###....R..........#",
    "#######:::::::   ####U............##",
    "##############   #####...........###",
    "##############   #######.......#####",
    "###############   ###########..#####",
  ];
  const SU2T = [
    W.trainer({ id: 'su_hale', cls: 'Veteran', name: 'Hale', model: { base: 'oldman3', top: '#3a5a7a', bottom: '#2a2a2a', extras: ['beard', 'coat'] },
      at: [28, 9], dir: 'left', sight: [19, 9, 9, 1], bg: 'cave',
      line: "I've crossed this chasm fifty times. Lost at the Coliseum fifty times. Fifty-first time's the charm. Starting with you!",
      lose: "Fifty-one, then.", after: "The high bridge is solid. Creaks a bit. Everything up here creaks, me included.",
      team: [['mogsquire_paladin', 29], ['grumog_viking', 29], ['lumimog_beacon', 29], ['shellmog_guardian', 29], ['seamog_captain', 29]], money: 1200 }),
    W.trainer({ id: 'su_sasha', cls: 'Ace Trainer', name: 'Sasha', model: { base: 'woman9', top: '#e0a020', bottom: '#2a2a34', jacket: '#3a3a44', hairStyle: 'bob' },
      at: [8, 2], dir: 'down', sight: [8, 3, 1, 5], bg: 'cave',
      line: "I can see daylight behind me. You want it? Come and get it!",
      lose: "Daylight's yours. Go on.", after: "Out there is the Champion's Bridge. Walk it slowly. Everyone who's ever won is up there in stone.",
      team: [['kitemog_skydiver', 29], ['moglin_samurai', 29], ['bluemog_blue_wizard', 29], ['tickmog_chronomancer', 29], ['mossmog_beastmaster', 30]], money: 1240 }),
    W.trainer({ id: 'su_wyn', cls: 'Dragon Tamer', name: 'Wyn', model: { base: 'man6', top: '#7a2a2a', bottom: '#3a2a2a', hairStyle: 'longmessy', extras: ['cape'] },
      at: [6, 16], dir: 'right', sight: [7, 16, 5, 1], bg: 'cave',
      line: "You found my ledge. Nobody finds my ledge. My Wyrmogs are hungry for company!",
      lose: "My Wyrmogs like you. That's... unsettling.", after: "Wyrmogs nest in these caves. Rarely. Very rarely. Bring a lot of nuts.",
      team: [['wyrmog_rider', 29], ['lancemog_highwind', 29], ['wyrmog_rider', 30], ['kitemog_skydiver', 29]], money: 1200 }),
  ];
  FF7.defineMap('kp_summit_2', {
    name: 'Summit Road', area: 'Summit Road', theme: 'cave', music: 'despair', kpWild: 'kp_summit', kpBg: 'cave', kpCave: true,
    look: Object.assign({}, SU_LOOK, { wood: ['#6a5640', '#5e4c38'] }),
    grid: SU2,
    heights: [
      "000660000000000000000000000000000000",
      "000660000000000000000000000000000000",
      "000660666666600000000000000000000000",
      "000066666666666000000000000000000000",
      "000666666666666600000033333330000000",
      "006666666666666600033333333333330000",
      "000666666666666666665533333333333000",
      "000066666666666666665533333333333000",
      "000000666666600003333333333333333300",
      "000000000000000000333333333333333000",
      "000000000000000000333333333333333000",
      "000000000000000000033333333333330000",
      "000000000000000000000033333330000000",
      "000000000000000000000000022000000000",
      "000000033333330000000000022000000000",
      "000003333333333300000000000000000000",
      "000033333333333300000000000000000000",
      "000033333333333300000000000000000000",
      "000333333333333333332200000000000000",
      "000033333333333333332200000000000000",
      "000033333333330000000000000000000000",
      "000003333333330000000000000000000000",
      "000000033333330000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
    ],
    props: deco(SU2, { U: () => ({ prop: 'crystal', col: '#a0c8ff' }) }),
    lights: [[33, 20, '#a0c8ff', 3], [21, 22, '#a0c8ff', 3], [5, 19, '#a0c8ff', 3], [31, 8, '#a0c8ff', 3], [12, 3, '#a0c8ff', 3], [3.5, 0, '#fff4d8', 4]],
    entries: { from_summit1: [29, 24, 'up'], from_route14: [3, 1, 'down'] },
    exits: [
      { at: [29, 25, 2, 1], to: 'kp_summit_1', entry: 'from_summit2' },
      { at: [3, 0, 2, 1], to: 'kp_route14', entry: 'from_summit' },
    ],
    npcs: SU2T.map(t => t.npc),
    items: [W.item('su2_ledge', [4, 17], 'leftover_nut'), W.item('su2_shelf', [30, 11], 'royal_nut', 2)],
    triggers: SU2T.map(t => t.trig).concat([W.hidden('su2_crystal', [12, 3], 'quick_gear')]),
  });
  // ================================================================== Route 14: the Champion's Bridge
  // Out of the Summit Road into the sky: an alpine landing, then a grand stone bridge above the clouds, widening into
  // three round terraces where the dojo masters stand in stone (the last two by the Coliseum's gate), banners on its pillars. At the far end, the gate of
  // the Kupo Coliseum.
  KP.WILD.kp_route14 = [['kitemog_skydiver', 18, 28, 30], ['lancemog_highwind', 14, 28, 30], ['halomog_bishop', 12, 28, 30], ['mogsquire_paladin', 12, 28, 30],
    ['chocomog_knight', 12, 28, 30], ['pipkin_onion_knight', 12, 28, 30], ['mogpost_cannoneer', 8, 28, 30], ['wyrmog_rider', 8, 29, 30], ['mogmk_mk1', 4, 28, 30]];
  const R14 = [
    "      #####|______|#####      ",
    "       ________________       ",
    "       ________________       ",
    "       ________________       ",
    "         ____________         ",
    "           |______|           ",
    "           =______=           ",
    "           =______=           ",
    "         ==________==         ",
    "        =____________=        ",
    "         ==________==         ",
    "           =______=           ",
    "           =______=           ",
    "           |______|           ",
    "         ==________==         ",
    "        =____________=        ",
    "         ==________==         ",
    "           |______|           ",
    "           =______=           ",
    "           =______=           ",
    "         ==________==         ",
    "        =____________=        ",
    "         ==________==         ",
    "           =______=           ",
    "           =______=           ",
    "           |______|           ",
    "           ,^^^^^^,           ",
    "        ,GGGGGGGGGGGG,        ",
    "       ,,GRGGGGGGGGGG,R       ",
    "      ,R,GGGGG,,GGGGG,,,      ",
    "      ,,,,,,,,,,,,,R,,,,      ",
    "      #######::::#######      ",
    "      #######::::#######      ",
    "      #######::::#######      ",
  ];
  const STONE = '#b8b4a8';
  const statue = (id, who, at, dir, line) => ({ id, name: 'Statue', at, dir, hover: 0.42, anim: 'none', faceOnTalk: false,
    model: { base: who, stone: STONE, skin: STONE, hair: STONE, top: STONE, top2: STONE, sleeve: STONE, jacket: STONE, bottom: STONE, boots: STONE, gloves: STONE, belt: STONE, eyes: '#8a8678' },
    talk: function* (s) { yield s.msg(line); } });
  const R14T = [
    W.trainer({ id: 'r14_rhea', cls: 'Ace Trainer', name: 'Rhea', model: { base: 'woman7', top: '#e0e0f0', bottom: '#3a3a5a', jacket: '#5a5a8a', hairStyle: 'ponytail' },
      at: [12, 18], dir: 'right', sight: [13, 18, 5, 1], bg: 'sky',
      line: "Above the clouds, every trainer's an equal. Equally likely to lose to me!",
      lose: "Equal... ish.", after: "Look over the rail. That's the whole Kupo Isles down there, under the clouds. We came a long way, huh?",
      team: [['kitemog_skydiver', 29], ['halomog_bishop', 29], ['moglin_samurai', 29], ['gunmog_gun_arm', 29], ['mopluff_dancer', 30]], money: 1240 }),
    W.trainer({ id: 'r14_dorian', cls: 'Veteran', name: 'Dorian', model: { base: 'oldman4', top: '#5a4a8a', bottom: '#2a2a3a', extras: ['cape', 'beard'] },
      at: [17, 12], dir: 'left', sight: [12, 12, 5, 1], bg: 'sky',
      line: "Forty years ago I walked this bridge to the Coliseum. Lost in the first round. Let's see if you'd do better!",
      lose: "Better. Much better.", after: "The statues were all challengers once, same as you. Now look at them. Very stony.",
      team: [['mogsquire_paladin', 30], ['redpom_sage', 29], ['icemog_yeti', 29], ['chocomog_knight', 29], ['seamog_captain', 29]], money: 1280 }),
    W.trainer({ id: 'r14_lux', cls: 'Ace Trainer', name: 'Lux', model: { base: 'man3', top: '#f0d050', bottom: '#2a2a34', jacket: '#3a3a44', hairStyle: 'spiky' },
      at: [12, 6], dir: 'right', sight: [13, 6, 5, 1], bg: 'sky',
      line: "Last battle before the Coliseum gate. Make it count. I'm going to!",
      lose: "Counted. And I lost count.", after: "Your rival's been waiting at the gate since this morning. Spiky hair. Very loud. Very nice.",
      team: [['lancemog_highwind', 30], ['kupwick_magus', 29], ['nutmog_ninja', 29], ['gearmog_artificer', 29], ['petalmog_maiden', 30]], money: 1280 }),
  ];
  FF7.defineMap('kp_route14', {
    name: 'Route 14', area: 'Route 14', theme: 'temple', music: 'highwind', kpWild: 'kp_route14', kpBg: 'sky',
    look: { sky: ['#4a8ae0', '#eaf4ff'], clouds: { col: '#ffffff', alpha: 0.8, n: 9, speed: 0.2 }, fog: { color: [0.8, 0.88, 0.98], near: 16, far: 40 },
      ambient: [0.58, 0.6, 0.64], light: [0.95, 0.94, 0.9], floor3: ['#e0dacc', '#d8d2c4'], floor2: ['#8a8070', '#827868'], wall: '#c8c0b0', wallTop: '#a8a090',
      trim: '#8a7a50', grass: ['#6a9a4a', '#649444'], pillar: '#e8e2d4', floorTex: { floor3: 'marble' } },
    grid: R14,
    heights: [
      "000000333333333333333333000000",
      "000000033333333333333330000000",
      "000000033333333333333330000000",
      "000000033333333333333330000000",
      "000000000333333333333000000000",
      "000000000003333333300000000000",
      "000000000003333333300000000000",
      "000000000003333333300000000000",
      "000000000333333333333000000000",
      "000000003333333333333300000000",
      "000000000333333333333000000000",
      "000000000003333333300000000000",
      "000000000003333333300000000000",
      "000000000003333333300000000000",
      "000000000333333333333000000000",
      "000000003333333333333300000000",
      "000000000333333333333000000000",
      "000000000003333333300000000000",
      "000000000003333333300000000000",
      "000000000003333333300000000000",
      "000000000333333333333000000000",
      "000000003333333333333300000000",
      "000000000333333333333000000000",
      "000000000003333333300000000000",
      "000000000003333333300000000000",
      "000000000003333333300000000000",
      "000000000002333333200000000000",
      "000000002222222222222200000000",
      "000000022222222222222220000000",
      "000000222222222222222222000000",
      "000000222222222222222222000000",
      "000000222222222222222222000000",
      "000000222222222222222222000000",
      "000000222222222222222222000000",
    ],
    props: deco(R14, { '=': () => ({ prop: 'rail', col: '#d8d0c0' }) }).concat(
      // (each statue's plinth: statue() stands it 0.42 up, on one of these; Red XIII's and Dio's by the gate had none and floated)
      [[9, 21], [20, 21], [9, 15], [20, 15], [9, 9], [20, 9], [8, 3], [21, 3]].map(([x, y]) => ({ at: [x, y], prop: 'disc', r: 0.45, h: 0.42, sides: 8, col: '#a8a090', top: '#c8c0b0' })),
      [5, 13, 17, 25].flatMap(y => [{ at: [11, y + 0.45], prop: 'banner', col: '#c03030', col2: '#e8c040', y: 2.4, h: 1.5, w: 0.6 }, { at: [18, y + 0.45], prop: 'banner', col: '#3050c0', col2: '#e8c040', y: 2.4, h: 1.5, w: 0.6 }]),
      [{ at: [14.5, 0.4], prop: 'banner', col: '#c8a030', col2: '#7a2a2a', y: 2.75, h: 0.9, w: 6.2, text: 'KUPO COLISEUM', textCol: '#5a1a1a', size: 0.25 }]),   // (low enough to be in view from the gate: at 3.4 the camera cut its top off)
    labels: [{ at: [14.5, 27], text: "CHAMPION'S BRIDGE", size: 0.26, col: '#c8a030', y: 0.02 }],
    entries: { from_summit: [14, 30, 'up'], from_coliseum: [14, 1, 'down'] },
    exits: [
      { at: [13, 33, 4, 1], to: 'kp_summit_2', entry: 'from_route14' },
      { at: [12, 0, 6, 1], to: 'kp_coliseum', entry: 'from_route14' },
    ],
    npcs: R14T.map(t => t.npc).concat([
      statue('r14_st1', 'yuffie', [9, 21], 'right', "A statue of YUFFIE, master of the Shuriken Arcade.\fThe plaque reads: \"Finders keepers!\" Somebody has left a Kupo Nut on the plinth. It's gone when you look again."),
      statue('r14_st2', 'barret', [20, 21], 'left', "A statue of BARRET, master of the Gun-Arm Arcade.\fThe plaque reads: \"Never give up! Never back down! Never skip leg day!\""),
      statue('r14_st3', 'tifa', [9, 15], 'right', "A statue of TIFA, master of the Seventh Heaven Arcade.\fThe plaque reads: \"A strong team starts with a good breakfast.\""),
      statue('r14_st4', 'cid', [20, 15], 'left', "A statue of CID, master of the Highwind Arcade.\fThe plaque reads: \"Aim for the sky!\" The rest of the plaque has been censored."),
      statue('r14_st5', 'aeris', [9, 9], 'right', "A statue of AERIS, master of the Flower Arcade.\fThe plaque reads: \"Every flower blooms in its own time.\" Fresh flowers lie at her feet."),
      statue('r14_st6', 'vincent', [20, 9], 'left', "A statue of VINCENT, master of the Nightmare Arcade.\fThe plaque reads: \"...\" That's all it says."),
      statue('r14_st7', 'redxiii', [8, 3], 'right', "A statue of RED XIII, master of the Ember Arcade.\fThe plaque reads: \"Listen to the cry of the Planet.\" Someone has carved a tiny paw print under it."),
      statue('r14_st8', 'dio', [21, 3], 'left', "A statue of DIO, master of the Showtime Arcade.\fThe plaque reads: \"The show must go on!\" He is flexing. Even in stone, he is flexing."),
      W.moogle('r14_mog', 'kitemog_skydiver', [16, 29], { wander: 3, line: 'Kitemog: Kuuupo! It catches an updraft and hovers, very pleased with itself.' }),
    ]),
    items: [W.item('r14_landing', [7, 30], 'royal_nut', 2), W.item('r14_terrace', [10, 21], 'max_oil', 3)],
    triggers: [W.hidden('r14_rock', [19, 30], 'lucky_pom')].concat(R14T.map(t => t.trig)),
  });

  // ================================================================== the Kupo Coliseum
  // A round city on a mountaintop above the clouds. The arena (its drum ringed by a colonnade) stands in the middle;
  // the Champions' Rest hotel to the west, the Mog Center to the east, statues of past champions along the avenue.
  // Zack (rival battle 9) waits at the south gate. After the Gold League (flag kp_league_1, set by KP.league) the
  // north-west gate opens to the Northern Crater and the north-east gate to Mognet Tower.
  const CO = [
    "        __  ================  __        ",
    "       |__|=________________=|__|       ",
    "        __________|_||__________        ",
    "      ==________|______|________==      ",
    "     =________|____bbb___|________=     ",
    "    =____________bbbbbbb___________=    ",
    "   =_________|__bbbbbbbbb_|_________=   ",
    "  =_________|__bbbbbbbbbbb_|_________=  ",
    "  =____________bbbbbbbbbbb___________=  ",
    " =__________|_bbbbbbbbbbbbb|__________= ",
    " =____________bbbbbbbbbbbbb___________= ",
    "=___________|__bbbbbbbbbbb_|___________=",
    "=____________|_bbbbbbbbbbb|____________=",
    "=_______________bbbbbbbbb______________=",
    "=__hhhhhhh____|__bbbbbbb_|____hhhhhh___=",
    "=__hhhhhhh______|_|++|_|______hhhhhh___=",
    "=__hhhhhhh________|__|________hhhhhh___=",
    "=__hhhhhhh____________________hh+hhh___=",
    "=__hhh+hhh_____________________________=",
    "=________________l____l________________=",
    "=______________________________________=",
    " =______l_______u______u_______l______= ",
    " =___11111____________________22222___= ",
    "  =__11111___l_____OO_____l___22222__=  ",
    "  =__________________________________=  ",
    "   =____________u______u____________=   ",
    "    =______4444__________3333______=    ",
    "     =_____4444__l____l__3333_____=     ",
    "      ==________________________==      ",
    "        =________|____|________=        ",
    "         ===_____|____|_____===         ",
    "            =====|____|=====            ",
  ];
  const league1 = s => s.flag('kp_league_1');
  // the arena's gate, cut into the drum's south face over the hall's door (the user, 2026-10-03: "is that suppose to be a
  // door where the entrance is? because it looks like a wall"): a dark round-topped doorway in a gold frame, a step, and
  // a red carpet running in; faces south
  FF7.field.props.kp_arenagate = (mb, x, y, z, s, th, nb, o = {}) => {
    const PI = Math.PI, w = 1.0, h = 0.95, r = w / 2, gold = '#d8b040', dark = '#1c120a', zf = z + 0.05;
    mb.box(x, y + h / 2, zf, w, h, 0.1, dark);                                          // (the opening)
    mb.push(); mb.translate(x, y + h, zf - 0.05); mb.rotate(PI / 2, 0, 0); mb.prism(0, 0, 0, r, r, 0.1, 18, dark); mb.pop();   // (its round top)
    mb.box(x, y + 0.5, zf - 0.02, w * 0.8, 0.02, 0.08, '#3a2414');                      // (a glint of the corridor's floor)
    for (const k of [-1, 1]) mb.box(x + k * (r + 0.07), y + h / 2 + 0.05, zf + 0.02, 0.14, h + 0.1, 0.14, gold);   // (the posts)
    for (let i = 0; i <= 10; i++) {                                                      // (the arch: gold blocks round the top)
      const a = PI * i / 10, cx = x + Math.cos(a) * (r + 0.07), cy = y + h + Math.sin(a) * (r + 0.07);
      mb.push(); mb.translate(cx, cy, zf + 0.02); mb.rotate(0, 0, a); mb.box(0, 0, 0, 0.14, 0.17, 0.14, i === 5 ? '#f0d060' : gold); mb.pop();
    }
    mb.box(x, y + h + r + 0.2, zf + 0.04, 0.22, 0.22, 0.06, '#a02a2a');                  // (the keystone's crest)
    mb.box(x, y + 0.03, z + 0.22, w + 0.5, 0.06, 0.34, '#d8ccb0');                       // (the step)
    mb.box(x, y + 0.065, z + 0.75, w * 0.86, 0.012, 0.8, '#a02a2a');                     // (the carpet, gold-edged)
    for (const k of [-1, 1]) mb.box(x + k * (w * 0.43 + 0.02), y + 0.066, z + 0.75, 0.04, 0.013, 0.8, gold);
  };
  const zackScene = function* (s) {
    s.emote('co_zack', '!');
    yield 20;
    yield s.face('co_zack', 'player'); yield s.face('player', 'co_zack');
    yield s.say('zack', "Cloud!! You made it! I KNEW you'd make it. I've been waiting at this gate for two days.\f...Okay, two hours. It FELT like two days.");
    yield s.say('zack', "Eight badges each, the Coliseum right behind us... You know what this calls for. One more battle! For old times' sake.\fAnd for new times' sake!");
    const r = yield* W.rival(s, 'zack', 9, { bg: 'arena', lose: "Ha! Man, you're really something. I mean it.", win: "I won? ...I won! Don't tell anyone I looked surprised." });
    yield s.say('zack', "That was the best one yet! Okay, listen: the Kupo League's through the big north door in the Grand Hall. The Elite Four, then the Champion's seat.\fNobody's sat in it since the old Champion stepped down. Seph went in an hour ago... and I'm going in right after him.\fSee you at the top, buddy!");
    yield s.move('co_zack', [[21, 26], [21, 18], [20, 16]], { run: true });
    s.remove('co_zack');
  };
  FF7.defineMap('kp_coliseum', {
    name: 'Kupo Coliseum', area: 'Kupo Coliseum', theme: 'temple', music: 'goldsaucer',
    look: { sky: ['#3a7ad0', '#f0f6ff'], clouds: { col: '#ffffff', alpha: 0.85, n: 8, speed: 0.15 }, fog: { color: [0.82, 0.88, 0.98], near: 18, far: 44 },
      // (one floor all over, off-white marble: the tiles under the statues, the banners' poles and the side paths were the
      // temple's beige stone; the user, 2026-10-04, "make the flooring consistent")
      ambient: [0.6, 0.6, 0.62], light: [0.95, 0.93, 0.88], floor: ['#e6dfcf', '#ded7c6'], floor2: ['#e6dfcf', '#ded7c6'], floor3: ['#e6dfcf', '#ded7c6'], wall: '#e8e0d0', wallTop: '#c8c0b0', trim: '#c8a040',
      pillar: '#f0ead8', lamp: '#fff0c0', floorTex: { floor: 'marble', floor2: 'marble', floor3: 'marble' } },
    grid: CO,
    heights: [
      "0000000011001111111111111111001100000000",
      "0000000111111111111111111111111110000000",
      "0000000011111111111111111111111100000000",
      "0000001111111111111111111111111111000000",
      "0000011111111111111111111111111111100000",
      "0000111111111111111111111111111111110000",
      "0001111111111111111111111111111111111000",
      "0011111111111111111111111111111111111100",
      "0011111111111111111111111111111111111100",
      "0111111111111111111111111111111111111110",
      "0111111111111111111111111111111111111110",
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
      "0111111111111111111111111111111111111110",
      "0111111111111111111111111111111111111110",
      "0011111111111111111111111111111111111100",
      "0011111111111111111111111111111111111100",
      "0001111111111111111111111111111111111000",
      "0000111111111111111111111111111111110000",
      "0000011111111111111111111111111111100000",
      "0000001111111111111111111111111111000000",
      "0000000011111111111111111111111100000000",
      "0000000001111111111111111111111000000000",
      "0000000000001111111111111111000000000000",
    ],
    legend: Object.assign({ b: 'block' }, BED_LEGEND),
    props: deco(CO, Object.assign({}, BEDS, { '=': () => ({ prop: 'rail', col: '#d8d0c0' }), u: () => ({ prop: 'statue', col: '#e0d8c0', col2: '#b8a880' }) })).concat([
      { at: [19.5, 9], prop: 'disc', r: 6.2, h: 4.2, sides: 28, col: '#e8dcc0', top: '#b89a5a', rim: '#c8a040', ring: '#a03030' },
      { at: [19.5, 9], prop: 'disc', r: 4.6, h: 4.4, sides: 28, col: '#d8ccb0', top: '#c8a868' },
      { at: [19.5, 15.2], prop: 'kp_arenagate' },   // (the arena's gate, over the hall's door)
      // (KUPO LEAGUE across the portico, strung in front of the two pillars by the gate, where the camera sees it: at 3.2 it
      // was over the top of the screen, and at row 14.7 inside the arena's drum, whose face is at 15.2; the user,
      // 2026-10-04, "why doesnt the kupo league building have a banner that says kupo league on it?")
      { at: [19.5, 16.45], prop: 'banner', col: '#a02a2a', col2: '#e8c040', y: 2.75, h: 0.6, w: 3.8, text: 'KUPO LEAGUE', textCol: '#f0d870', size: 0.2 },
      { at: [19, 23], prop: 'well', col: '#5aa0e0', col2: '#e8e0d0' }, { at: [20, 23], prop: 'well', col: '#5aa0e0', col2: '#e8e0d0' },
      ...[[17, 19], [22, 19], [17, 27], [22, 27]].map(([x, y]) => ({ at: [x, y + 0.45], prop: 'banner', col: '#c8a030', col2: '#a02a2a', y: 2.9, h: 1.2, w: 0.5 })),
    ]),
    buildings: [
      { at: [3, 14, 7, 5], h: 3.4, col: '#f0e8d8', roof: '#3a5aa0', top: 'hip', rise: 1.4, win: '#ffe8a0' },
      { at: [30, 14, 6, 4], h: 2.8, col: '#f4ece0', roof: '#e05a7a', top: 'hip', rise: 1.2 },
    ],
    labels: [
      { at: [6, 18], face: 's', text: "CHAMPIONS' REST", size: 0.14, col: '#3a5aa0', y: 2.3 },
      { at: [32, 17], face: 's', text: 'MOG CENTER', size: 0.15, col: '#e05a7a', y: 2.0 },
      { at: [19.5, 28.5], text: 'HALL OF CHAMPIONS', size: 0.2, col: '#c8a040', y: 0.02 },
    ],
    entries: { from_route14: [19, 30, 'up'], from_hall: [19, 16, 'down'], from_hotel: [6, 19, 'down'], from_center: [32, 18, 'down'],
      from_crater: [8, 1, 'down'], from_mognet: [30, 1, 'down'] },
    exits: [
      { at: [18, 31, 4, 1], to: 'kp_route14', entry: 'from_coliseum' },
      { at: [19, 15, 2, 1], to: 'kp_coliseum_hall', entry: 'from_town', sfx: 'door' },
      { at: [6, 18, 1, 1], to: 'kp_coliseum_hotel', entry: 'from_town', sfx: 'door' },
      { at: [32, 17, 1, 1], to: 'kp_coliseum_center', entry: 'from_town', sfx: 'door' },
      { at: [8, 0, 2, 1], to: 'kp_crater_1', entry: 'from_coliseum', if: league1,
        blocked: function* (s) { yield s.say('Gate Guard', "This road leads to the Northern Crater. It's sealed to everyone but league champions. Win the Gold League, then come back!"); } },
      { at: [30, 0, 2, 1], to: 'kp_mognet_1', entry: 'from_coliseum', if: league1,
        blocked: function* (s) { yield s.say('Gate Guard', "Mognet Tower is a working post office, kupo! Champions only past this point. Win the Gold League first!"); } },
    ],
    npcs: [
      { id: 'co_zack', name: 'Zack', model: 'zack', at: [19, 26], dir: 'down', show: s => !s.flag('kp_rival_zack_9'), talk: zackScene },
      folk({ id: 'co_guard_nw', name: 'Gate Guard', model: { base: 'man7', top: '#e8e0d0', bottom: '#3a3a5a', hairStyle: 'helmet', extras: ['cape'] }, at: [11, 2], dir: 'left',
        lines: s => league1(s) ? "Champion! The Northern Crater lies beyond. Strange, ancient moogles live down in the glow. Watch your step." : "The north-west road leads to the Northern Crater. Champions only. Win the Gold League and it's yours to explore." }),
      folk({ id: 'co_guard_ne', name: 'Gate Guard', model: { base: 'man8', top: '#e8e0d0', bottom: '#3a3a5a', hairStyle: 'helmet', extras: ['cape'] }, at: [28, 2], dir: 'right',
        lines: s => league1(s) ? "Mognet Tower is just up the road, champion. The mail moogles say something big roosts on their antenna." : "That road goes to Mognet Tower. Champions only, by order of the Postmaster Mog. Don't ask me why. Nobody argues with the Postmaster." }),
      folk({ id: 'co_reporter', name: 'Reporter', model: 'woman11', at: [25, 20], dir: 'left', wander: 1,
        lines: "Kupo Weekly, sports desk! Every year a new face climbs that bridge and makes it all the way to the World Championship final.\fThe reigning champion has held the title for years. Nobody's even seen him battle lately. Some say he's a professor somewhere. Isn't that funny?" }),
      folk({ id: 'co_fan', name: 'Fan', model: 'kid6', at: [14, 22], dir: 'right', wander: 2,
        lines: "I'm gonna get EVERY champion's autograph! ...I have zero so far. Can I have yours? Wait, you're not a champion yet. I'll check back." }),
      folk({ id: 'co_old', name: 'Old Champion', model: 'oldman8', at: [27, 24], dir: 'left',
        lines: "Five leagues: Gold, Platinum, Diamond, Master, and the World Championship. Win one, the next one opens.\fLevels stop at 30 up here, so it's not how high your moogles go. It's what they are, what they hold, and how well you know them." }),
      folk({ id: 'co_vendor', name: 'Vendor', model: 'man12', at: [9, 24], dir: 'right',
        lines: "Kupo Nut on a stick! Kupo Nut in a bun! Kupo Nut... in a slightly bigger bun! ...I'm not allowed to sell to moogles anymore. Long story." }),
      W.moogle('co_mog1', 'chocomog_knight', [12, 20], { wander: 2, line: 'Chocomog: Kweh-po! It stands to attention.' }),
      W.moogle('co_mog2', 'moglin_samurai', [27, 10], { wander: 2, line: "Moglin: Kupo. It bows, very correctly." }),
    ],
    triggers: [
      { id: 'co_zack_see', at: [18, 27, 4, 2], once: false, if: s => !s.flag('kp_rival_zack_9'), run: zackScene },
      { at: [16, 21], on: 'talk', run: function* (s) { yield s.msg('A statue of a past champion: a man with a fan and a very big smile.\fThe plaque reads: "DIO - Champion of the 3rd Kupo League. The house always wins!"'); } },
      { at: [23, 21], on: 'talk', run: function* (s) { yield s.msg('A statue of a past champion: an old man with a long white beard, floating slightly.\fThe plaque reads: "BUGENHAGEN - Champion of the 9th Kupo League. Ho ho hoo!"'); } },
      { at: [16, 25], on: 'talk', run: function* (s) { yield s.msg('A statue of a past champion: a big man with one arm raised to the sky.\fThe plaque reads: "DYNE - Champion of the 15th Kupo League."'); } },
      { at: [23, 25], on: 'talk', run: function* (s) { yield s.msg('The newest statue. A cloth hangs over its head.\fThe plaque reads: "THE REIGNING WORLD CHAMPION". The name has been taped over.\f...The cloth has two pointy bumps on top. Like ears.'); } },
    ],
  });

  // the arena hall: the league desk
  const HALL = [
    "###++###################",
    "#:::::::D::::::D:::::::#",
    "#.......D......D.......#",
    "#.......DDDDDDDD.......#",
    "#.........____.........#",
    "#.q.......____.......q.#",
    "#.q..|....____....|..q.#",
    "#.q.......____.......q.#",
    "#.........____.........#",
    "#.q.......____.......q.#",
    "#.q.......____.......q.#",
    "#.q..|....____....|..q.#",
    "#.q.......____.......q.#",
    "#...III...____...III...#",
    "#.........____.........#",
    "###########++###########",
  ];
  const registrar = function* (s) { if (KP.league) yield* KP.league(s); else yield s.say('Registrar', 'Welcome to the Battle Square! The league brackets are being drawn up as we speak. Please come back soon!'); };
  // the Coliseum's own desk: the Kupo League here; the tournaments over the sea, on Costa del Kupo
  const hallClerk = function* (s) {
    if (!s.flag('kp_champion')) { yield s.say('League Clerk', "Welcome to the Kupo Coliseum, home of the Kupo League! The Elite Four await through the north door, and after them, the Champion's seat.\fEight badges to enter, kupo. The League Guard will check."); return; }
    yield s.say('League Clerk', "Champion! An honour, kupo. The tournaments? Those are held in the Battle Square on Costa del Kupo, across the sea.\fThe S.S. Moogle sails there from the pier on Route 10. Champions travel free!");
  };
  FF7.defineMap('kp_coliseum_hall', {
    name: 'Kupo Coliseum - Grand Hall', area: 'Kupo Coliseum', theme: 'temple', music: 'cinco_chocobo',
    look: { floor: ['#e6dfcf', '#ded7c6'], floor2: ['#e6dfcf', '#ded7c6'], floor3: ['#a02a2a', '#982626'], wall: '#e0d8c4', trim: '#c8a040', wallH: 3.4,
      sky: ['#000000', '#000000'], ambient: [0.56, 0.54, 0.52], light: [0.92, 0.88, 0.8], pillar: '#f0ead8', indoor: true, floorTex: { floor: 'marble', floor2: 'marble', floor3: 'carpet' } },   // (one marble: the strip by the north wall was beige, the user, 2026-10-04)
    grid: HALL,
    props: [
      { at: [11.5, 0], prop: 'viewwindow', w: 8, h: 1.5, y: 1.2, col: ['#6aa8e0', '#c8a868'], col2: '#c8a040', bars: 5 },
      // (2.65: at 2.9 the tops were above the screen; GOLD was over the north door at 3, behind its frame: the four now
      // either side of WORLD CHAMPIONSHIP, clear of the door)
      ...[['GOLD', '#d8b030', 6], ['PLATINUM', '#c8d0d8', 8], ['DIAMOND', '#a8e0f0', 15], ['MASTER', '#8a3ab0', 17]].map(([t, col, x]) => ({ at: [x, 0], prop: 'banner', col, col2: '#3a2a1a', y: 2.65, h: 1.6, w: 1.4, text: t, size: 0.13, textCol: '#1a1a20' })),
      { at: [11.5, 1.6], prop: 'banner', col: '#e8e0f0', col2: '#c8a040', y: 3.2, h: 0.9, w: 5, text: 'WORLD CHAMPIONSHIP', size: 0.14, textCol: '#3a2a6a' },
    ],
    labels: [{ at: [11.5, 3], face: 's', text: 'LEAGUE DESK', size: 0.14, col: '#a02a2a', y: 1.1 }, { at: [4, 0.4], face: 's', text: 'KUPO LEAGUE', size: 0.14, col: '#c8a040', y: 2.7 }],
    lights: [[11.5, 4, '#fff0d0', 6], [11.5, 11, '#fff0d0', 6]],
    entries: { from_town: [11, 14, 'up'], from_league: [4, 2, 'down'] },
    exits: [{ at: [11, 15, 2, 1], to: 'kp_coliseum', entry: 'from_hall', sfx: 'door' },
      // (the Kupo League's door: the guard beside it lets challengers through: js/maps/kupomon/kp_kupoleague.js)
      { at: [3, 0, 2, 1], to: 'kp_kl_1', entry: 'from_prev', if: () => false, blocked: function* (s) { yield s.say('League Guard', 'Hold on! Speak to me before you go through, challenger.'); } }],
    npcs: [
      { id: 'kl_guard', name: 'League Guard', model: { base: 'man7', top: '#e8e0d0', bottom: '#3a3a5a', hairStyle: 'helmet', extras: ['cape'] }, at: [5, 1], dir: 'down', talk: function* (s) { yield* KP.klGuard(s); } },
      { id: 'coh_clerk', name: 'League Clerk', model: { base: 'woman3', top: '#a02a2a', jacket: '#a02a2a', bottom: '#2a2a3a', extras: ['tie'] }, at: [11, 2], dir: 'down', talk: hallClerk },
    ],
    triggers: [
      { at: [9, 3, 6, 1], on: 'talk', run: hallClerk },
      { at: [2, 6], on: 'talk', run: function* (s) { yield s.msg('A trophy case. Gold, platinum, diamond... and at the very top, an empty space with a little card: "Reserved."'); } },
      { at: [21, 6], on: 'talk', run: function* (s) { yield s.msg('Photographs of past finals. In the newest, the champion is hidden behind a giant stuffed moogle. Deliberately, it seems.'); } },
    ],
  });

  // the Champions' Rest (hotel): a free rest for challengers
  const HOTEL = [
    "####################",
    "#kk..............kk#",
    "#......DDDDDD......#",
    "#.......____.......#",
    "#.......____.......#",
    "#.ccc...____...ccc.#",
    "#..t....____....t..#",
    "#.......____.......#",
    "#.......____.......#",
    "#j.bb...____...bb.j#",
    "#.......____.......#",
    "#########++#########",
  ];
  FF7.defineMap('kp_coliseum_hotel', {
    name: "Champions' Rest", area: 'Kupo Coliseum', theme: 'house', music: 'waltz_chocobo',
    look: { floor: ['#c8b890', '#c0b088'], floor3: ['#3a5aa0', '#34549a'], wall: '#e8dcc8', trim: '#c8a040' },
    grid: HOTEL,
    props: [{ at: [3, 9], prop: 'bed', col: '#e8e0f0', col2: '#6a4a30' }, { at: [15, 9], prop: 'bed', col: '#e8e0f0', col2: '#6a4a30' }],
    legend: { b: 'bed' },
    entries: { from_town: [9, 10, 'up'] },
    exits: [{ at: [9, 11, 2, 1], to: 'kp_coliseum', entry: 'from_hotel', sfx: 'door' }],
    npcs: [
      { id: 'cht_dio', name: 'Dio', model: 'dio', at: [9, 1], dir: 'down', talk: function* (s) {
        const c = yield s.ask('Dio', "Welcome, welcome! Dio's Champions' Rest! Every champion slept here! Some of them even paid!\fChallengers stay free, of course. Would you like a nap?", ['Rest', 'Not now']);
        if (c !== 0) { yield s.say('Dio', 'Come back any time! The pillows are stuffed with moogle fluff. Shed naturally! Mostly.'); return; }
        yield s.fadeOut(30);
        KP.healAll(); s.sfx('heal');
        yield 30;
        yield s.fadeIn(30);
        yield s.say('Dio', 'Rise and shine, champion! Your moogles are fully rested. Go out there and win something!');
      } },
      folk({ id: 'cht_reeve', name: 'Guest', model: 'reeve', at: [16, 5], dir: 'down', anim: 'sit', hover: 0.14,
        lines: "Oh, hello. I'm only here on vacation. Strictly a spectator. ...I may have a friend in the World Championship. He's a bit of a showman. Big personality. Small, furry hands." }),
      folk({ id: 'cht_girl', name: 'Girl', model: 'girl6', at: [4, 6], dir: 'right',
        lines: "Mom says I can enter the leagues when I'm older. Mom also says I can't bring my Tufty to dinner. Mom says a lot of things." }),
    ],
  });

  center('kp_coliseum_center', { name: 'Coliseum Mog Center', town: 'kp_coliseum', back: 'from_center', decor: 'stone',
    hello: 'Welcome to the Coliseum Mart, kupo! Everything we have, from Kupo Nuts to Royal ones. Champions deserve choices!',
    npcs: [folk({ id: 'coc_trainer', name: 'Ace Trainer', model: 'man14', at: [7, 4], dir: 'down',
      lines: "Breeding at the Kupo Ranch in Mogfield gives your moogles a '+'. Up here, where levels stop at 30, a couple of pluses is the difference between Gold and Platinum." })] });
  // ================================================================== after the Gold League: the Northern Crater
  // Crater 1: a spiral down into the bowl, ring by ring (rim, then three rings, then the floor), stairs on the west,
  // north, east and south; rockfalls keep it one way round (the cut-off arcs are dead ends with items). On the floor,
  // by the glowing heart: Ultimog (met once). A hole in the floor drops to the depths. Crater 2: a chamber, a hall
  // split by a river of light (a crystal bridge), a deeper hall split by another, and Omegamog on its dais (met once).
  KP.WILD.kp_crater = [['darkmog_knight', 14, 29, 30], ['embermog_archmage', 12, 29, 30], ['redpom_sage', 12, 29, 30], ['gearmog_artificer', 12, 29, 30],
    ['bluemog_blue_wizard', 10, 29, 30], ['lumimog_beacon', 10, 29, 30], ['wrapmog_tomb_guard', 8, 29, 30], ['spookmog_necromancer', 8, 29, 30],
    ['galimog_galian', 8, 29, 30], ['mathmog_arithmetician', 6, 29, 30]];
  const CR_LOOK = { sky: ['#04040c', '#1a1430'], fog: { color: [0.06, 0.05, 0.12], near: 10, far: 30 }, mako: '#a0ffd8', grass: ['#4a4a5a', '#444454'],
    floor: ['#4a4658', '#444052'], floor2: ['#5a5068', '#544a62'], ambient: [0.36, 0.36, 0.46], light: [0.62, 0.64, 0.84] };
  const CR1 = [
    "                                    ",
    "              ,,,,,,,,              ",
    "           |,,,,,,,,,,,,,           ",
    "         ,,,,,,,,,,,,,,,,,,         ",
    "       ,,,,,U::::::RR::,,,,,,       ",
    "      |,,,:::::::^^RR:::::,,,|      ",
    "     ,,,,::::::,,^^,,::::::,,,,     ",
    "    ,,,,::::,,,,,,,,,,,,::::,,,,    ",
    "   ,,,,::::,,,,,,,,,,,,,,::::,,,,   ",
    "   ,,,:::U,,,,::::::::,,,,U:::,,,   ",
    "  ,,,::::,,,::::::::::::,,,::::,,,  ",
    "  ,,,:::,,,::::::..::::::,,,:::,,,  ",
    " ,,,:::,,,::::........::::,,,:::,|, ",
    " ,,,:::,U,:::.........U:::,,,:::,,, ",
    " ,,,:::,,,:::...****...:::,,,:::,,, ",
    " ,,^^::,,:::...******...::^^,:::,,, ",
    " ,,^^::,,:::....****....::^^,:::,,, ",
    " ,,,:::,,,:::..........:::,RR:::,,, ",
    " ,,,:::,,,:::..........:::,RR:::,,, ",
    " ,,,:::,,,::::........::::,,,:::,,, ",
    "  ,,,:::,,,::::::^^::::::,,,:::,,,  ",
    "  ,,,::::,,,:::RR^^:::::,,,:U::,,,  ",
    "   ,,,:::,U,,,:RR:::::,,,U,:::,,,   ",
    "   ,,,,::::,,,,,,,,,,,,,,::::,,,,   ",
    "    ,,,,::::,,,,,,,,,,,,::::,,,,    ",
    "     ,,,,::::::,,,,,,::::::,,,,     ",
    "      ,,,,::::::::::::::::,,,,      ",
    "       ,,,,,,::::::::::,,,,,,       ",
    "         ,,,,,,,,,RR,,,,,,,         ",
    "           ,,,,,,,RR,,,,|           ",
    "              ,,,,RR,,              ",
    "                    ,,              ",
  ];
  const CR1T = [
    W.trainer({ id: 'cr_morrigan', cls: 'Elite', name: 'Morrigan', model: { base: 'woman5', top: '#2a2a3a', bottom: '#1a1a2a', jacket: '#5a2a6a', hairStyle: 'longstraight', extras: ['cape'] },
      at: [28, 12], dir: 'down', sight: [27, 13, 2, 2], bg: 'crater',
      line: "A Gold League champion, walking into the crater? Brave. Or lost. Let's find out which.",
      lose: 'Brave, then.', after: "The deeper you go, the older the moogles. Something down there remembers the world before moogles had jobs.",
      team: [['kupwick_magus', 30, { held: 'boost_blackmage' }], ['darkmog_knight', 30], ['redpom_sage', 30, { held: 'quick_gear' }], ['ghostmog_specter', 30], ['embermog_archmage', 30, { held: 'focus_pom' }]], money: 1500 }),
    W.trainer({ id: 'cr_castor', cls: 'Elite', name: 'Castor', model: { base: 'man3', top: '#3a3a4a', bottom: '#1a1a2a', jacket: '#2a4a6a', hairStyle: 'slick', extras: ['coat'] },
      at: [20, 22], dir: 'left', sight: [19, 21, 1, 2], bg: 'crater',
      line: "One more ring and you're on the crater floor. I'm the last ring. Well. I'm standing on it.",
      lose: "And down you go. Mind the glow.", after: "It's sitting by the light down there. It doesn't move much. It doesn't need to.",
      team: [['gearmog_artificer', 30, { held: 'leftover_nut' }], ['lancemog_highwind', 30], ['mogsquire_paladin', 30, { held: 'boost_knight' }], ['nutmog_ninja', 30], ['clockmog_chrono', 30]], money: 1500 }),
  ];
  FF7.defineMap('kp_crater_1', {
    name: 'Northern Crater', area: 'Northern Crater', theme: 'crater', music: 'northcave', kpWild: 'kp_crater', kpBg: 'crater', kpCave: true,
    look: CR_LOOK,
    grid: CR1,
    heights: [
      "000000000000000000000000000000000000",
      "000000000000008888888800000000000000",
      "000000000008888888888888800000000000",
      "000000000888888888888888888000000000",
      "000000088888866666666668888880000000",
      "000000888866666665566666668888000000",
      "000008888666666445544666666888800000",
      "000088886666444444444444666688880000",
      "000888866664444444444444466668888000",
      "000888666444442222222244444666888000",
      "008886666444222222222222444666688800",
      "008886664442222220022222244466688800",
      "088866644422220000000022224446668880",
      "088866644422200000000002224446668880",
      "088866644422200000000002224446668880",
      "088776644222000000000000223346668880",
      "088776644222000000000000223346668880",
      "088866644422200000000002224446668880",
      "088866644422200000000002224446668880",
      "088866644422220000000022224446668880",
      "008886664442222221122222244466688800",
      "008886666444222221122222444666688800",
      "000888666444442222222244444666888000",
      "000888866664444444444444466668888000",
      "000088886666444444444444666688880000",
      "000008888666666444444666666888800000",
      "000000888866666666666666668888000000",
      "000000088888866666666668888880000000",
      "000000000888888888888888888000000000",
      "000000000008888888888888800000000000",
      "000000000000008888888800000000000000",
      "000000000000000000008800000000000000",
    ],
    props: deco(CR1, { U: () => ({ prop: 'crystal', col: '#a0ffd8' }), '|': (x, y) => ({ prop: 'spire', h: 3.5 + rnd(x, y) * 2, r: 0.7, col: '#4a4658' }) })
      .concat([{ at: [14, 18], prop: 'hole', r: 0.8, col: '#80ffd0', col2: '#3a3a48' }]),
    lights: [[17.5, 15, '#a0ffd8', 8], [14, 18, '#80ffd0', 3]],
    entries: { from_coliseum: [20, 30, 'up'], from_depths: [15, 18, 'right'] },
    exits: [
      { at: [20, 31, 2, 1], to: 'kp_coliseum', entry: 'from_crater' },
      { at: [14, 18, 1, 1], to: 'kp_crater_2', entry: 'from_crater' },
    ],
    npcs: CR1T.map(t => t.npc).concat([
      W.legend('cr_ultimog', 'ultimog_ultima', { at: [17, 12], lv: 30, bg: 'crater', music: 'weaponraid',
        intro: 'By the glowing heart of the crater, something floats in perfect silence: Ultimog.\fIts eyes open. It has been waiting a very, very long time for someone worth looking at.' }),
      folk({ id: 'cr_scholar', name: 'Scholar', model: 'man15', at: [23, 29], dir: 'left',
        lines: "Fascinating! The crater spirals down like a shell. The rockfalls make you go all the way round each ring before the next stair.\fThe old texts say the first moogle job was born at the bottom. I'd go and look, but I'm a scholar. We mostly read about going places." }),
    ]),
    items: [W.item('cr_rim', [7, 26], 'max_oil', 3), W.item('cr_ringb', [24, 25], 'royal_nut', 3), W.item('cr_ringc', [25, 21], 'boost_knight'), W.item('cr_ringd', [13, 21], 'focus_pom')],
    triggers: CR1T.map(t => t.trig),
  });
  const CR2 = [
    "################################",
    "################################",
    "#######:::######################",
    "####:U:::::::#####....**..######",
    "###:::::::::U:##U.....**....####",
    "##::::::::::::........**....U.##",
    "##::::::::::::^^......KK......##",
    "##::::::::::::^^......KK.......#",
    "###:::::::::::........**......##",
    "####:::::::::#........**......##",
    "#######:::######......**....####",
    "##################....**....####",
    "#########################...####",
    "#########################...####",
    "##############.......####...####",
    "#########U..................####",
    "#######.....................####",
    "######**********KK*****......###",
    "######**********KK*****......###",
    "#######____..................###",
    "######______^^..............####",
    "######______^^......U.....######",
    "#######____###.......###########",
    "################################",
  ];
  const CR2T = [W.trainer({ id: 'cr_ulric', cls: 'Elite', name: 'Ulric', model: { base: 'man6', top: '#4a2a2a', bottom: '#1a1a1a', jacket: '#2a2a2a', hairStyle: 'longmessy', extras: ['beard', 'cape'] },
        at: [18, 15], dir: 'down', sight: [16, 16, 2, 1], bg: 'crater',
        line: "Nobody comes this deep. Nobody who isn't looking for HER. Prove you're worth her time.",
        lose: '...Go on, then. She is on the dais past the river.', after: "Omegamog. Built for something nobody remembers. She guards the deepest point of the world.",
        team: [['grumog_viking', 30, { held: 'focus_pom' }], ['wyrmog_rider', 30], ['tickmog_chronomancer', 30, { held: 'quick_gear' }], ['shellmog_guardian', 30, { held: 'leftover_nut' }], ['moglin_samurai', 30, { held: 'boost_warrior' }]], money: 1600 })];
  FF7.defineMap('kp_crater_2', {
    name: 'Northern Crater - Depths', area: 'Northern Crater', theme: 'crater', music: 'northcave', kpWild: 'kp_crater', kpBg: 'crater', kpCave: true,
    look: Object.assign({}, CR_LOOK, { floor3: ['#5a5470', '#544e6a'], wood: ['#6ad0b0', '#60c8a8'] }),
    grid: CR2,
    heights: [
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000002220000000000000000000000",
      "00002222222220000000000000000000",
      "00022222222222000000000000000000",
      "00222222222222000000000000000000",
      "00222222222222110000000000000000",
      "00222222222222110000000000000000",
      "00022222222222000000000000000000",
      "00002222222220000000000000000000",
      "00000002220000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000003333000000000000000000000",
      "00000033333322000000000000000000",
      "00000033333322000000000000000000",
      "00000003333000000000000000000000",
      "00000000000000000000000000000000",
    ],
    props: deco(CR2, { U: () => ({ prop: 'crystal', col: '#a0ffd8' }) }).concat([{ at: [8, 1], prop: 'ladder', face: 's', h: 2.6 }]),
    lights: [[22.5, 7, '#a0ffd8', 6], [14, 17.5, '#a0ffd8', 6], [8.5, 20.5, '#ffd0ff', 4]],
    entries: { from_crater: [8, 4, 'down'] },
    exits: [{ at: [7, 2, 3, 1], to: 'kp_crater_1', entry: 'from_depths' }],
    npcs: CR2T.map(t => t.npc).concat([
      W.legend('cr_omegamog', 'omegamog_omega', { at: [8, 20], lv: 30, bg: 'crater', music: 'weaponraid',
        intro: 'On the dais stands a machine moogle older than the leagues, older than the dojos: Omegamog.\fIts gears begin to turn. Slowly. Then very fast.' }),
    ]),
    items: [W.item('cr2_hall', [28, 9], 'leftover_nut'), W.item('cr2_deep', [27, 19], 'royal_nut', 5)],
    triggers: CR2T.map(t => t.trig),
  });

  // ================================================================== after the Gold League: Mognet Tower
  // The mail moogles' tower: the sorting hall (the Postmaster Mog), the dead letter office (a maze of mail sacks, wild
  // moogles nesting in the parcels, couriers who battle), and the rooftop with the great antenna, where Bahamog roosts.
  KP.WILD.kp_mognet = [['mogpost_cannoneer', 20, 29, 30], ['stampo_blackbelt', 16, 29, 30], ['kitemog_skydiver', 14, 29, 30], ['chatmog_orator', 12, 29, 30],
    ['mopluff_dancer', 10, 29, 30], ['tufty_mime', 10, 29, 30], ['pipkin_onion_knight', 10, 29, 30], ['juggler_jester', 8, 29, 30]];
  const MG_LOOK = { floor: ['#b8a078', '#b09870'], floor3: ['#8a5a3a', '#82523a'], wall: '#d8c8a8', trim: '#7a2a2a', wallH: 3.0 };
  const postmaster = function* (s) {
    yield s.say('Postmaster Mog', "Welcome to Mognet Tower, kupo! Every letter in the Kupo Isles passes through this hall. Even the ones addressed to 'that moogle with the nice hat'.");
    yield s.say('Postmaster Mog', "Upstairs is the Dead Letter Office. Parcels nobody claims, and the wild moogles that nest in them. Our couriers train up there.\fAnd the roof... kupo. Bahamog roosts on the great antenna. Has for a hundred years. We just deliver around it.");
    if (s.flag('kp_mg_gift')) return;
    s.set('kp_mg_gift'); KP.give('mognet_nut', 10); s.sfx('found');
    yield s.msg('Received 10 Mognet Nuts!');
    yield s.say('Postmaster Mog', "A thank-you for winning the Gold League! Everyone in the post office had a bet on. ...I won, kupo.");
  };
  const MG1 = [
    "##########################",
    "#kkkkkkkkkkkkkkkkkkkkk..k#",
    "#.....................^^.#",
    "#.....................^^.#",
    "#.....DDDDDD..DDDDDD.....#",
    "#........................#",
    "#........................#",
    "#........................#",
    "#...rrrr..........rrrr...#",
    "#...rrrr..........rrrr...#",
    "#........................#",
    "#.........DDDDDD.........#",
    "#BBB..................BBB#",
    "#BBB..................BBB#",
    "#.o....................o.#",
    "#........................#",
    "#........................#",
    "############++############",
  ];
  FF7.defineMap('kp_mognet_1', {
    name: 'Mognet Tower', area: 'Mognet Tower', theme: 'house', music: 'fiddle',
    look: MG_LOOK,
    grid: MG1,
    heights: [
      "00000000000000000000000000",
      "00000000000000000000002200",
      "00000000000000000000001100",
      "00000000000000000000001100",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
    ],
    props: [{ at: [12.5, 0], prop: 'banner', col: '#c84040', col2: '#f0e0b0', y: 2.7, h: 0.9, w: 5, text: 'MOGNET', textCol: '#f0e0b0', size: 0.3, rot: 0 }],
    labels: [{ at: [12.5, 11], face: 's', text: 'POST OFFICE', size: 0.12, col: '#7a2a2a', y: 1.0 }],
    entries: { from_coliseum: [12, 16, 'up'], from_up: [22, 4, 'down'] },
    exits: [
      { at: [12, 17, 2, 1], to: 'kp_coliseum', entry: 'from_mognet', sfx: 'door' },
      { at: [22, 1, 2, 1], to: 'kp_mognet_2', entry: 'from_down' },
    ],
    npcs: [
      { id: 'mg_postmaster', name: 'Postmaster Mog', model: { enemy: 'kp_stampo_blackbelt', scale: 0.95 }, at: [12, 10], dir: 'down', talk: postmaster },
      W.moogle('mg1_mog1', 'mogpost_ranger', [6, 7], { wander: 3, line: 'Mogpost: Kupo! Parcel for... no, not you. Sorry, kupo!' }),
      W.moogle('mg1_mog2', 'stampo_monk', [19, 6], { wander: 2, line: 'Stampo: KA-CHUNK! It stamps a letter. And the table. And the floor.' }),
      W.moogle('mg1_mog3', 'mogpost_cannoneer', [8, 14], { wander: 2, line: 'Mogpost: Express delivery, kupo! Stand well back.' }),
      W.moogle('mg1_mog4', 'tufty_freelancer', [17, 14], { wander: 2, line: "Tufty: Kupo? It's holding a letter upside down, very seriously." }),
      folk({ id: 'mg1_customer', name: 'Customer', model: 'oldwoman6', at: [14, 13], dir: 'up',
        lines: "I've been waiting to post this letter for an hour. The moogle at the counter keeps stamping it. It's covered in stamps now. I think it's going to the moon." }),
    ],
    triggers: [
      { at: [10, 11, 6, 1], on: 'talk', run: postmaster },
      { at: [5, 1], on: 'talk', run: function* (s) { yield s.msg("Pigeonholes, hundreds of them. One is labelled 'CAIT SITH c/o GOLD SAUCER'. It's stuffed with fan mail."); } },
    ],
  });
  const MG2 = [
    "##########################",
    "#........................#",
    "#.BBB..BBBB..ooo.BBB..B..#",
    "#.B.......B....o...B..B..#",
    "#.B.BBBB..B.BB.o.B.B..BB.#",
    "#...B...........B........#",
    "#BB.B.BBB.BBBB..B.BBBB.B.#",
    "#...B...B....B....B....B.#",
    "#.BBB.B.B.BB.BBBB.B.BB.B.#",
    "#.....B.......B.......B..#",
    "#.BBBBB.BBBBB.B.BBB.BBB..#",
    "#...........B...B........#",
    "#.BB.BBBBB..B.B.B.BBBBB.B#",
    "#....B.......B..........B#",
    "#.B..B.BBBB.BB.BBBB.BB...#",
    "#.B..........B.......B...#",
    "#.BBBB..BB.......BB......#",
    "############++############",
  ];
  const MG2T = [
    W.trainer({ id: 'mg_pip', cls: 'Courier', name: 'Pip', model: { base: 'kid3', top: '#c84040', bottom: '#2a2a3a', hairStyle: 'cap', extras: ['harness'] },
      at: [7, 11], dir: 'right', sight: [8, 11, 4, 1], bg: 'town',
      line: "Special delivery! One battle, addressed to you! Sign here... with your moogles!",
      lose: 'Return to sender...', after: 'The stairs to the roof are in the far corner. Through the sacks. Good luck finding the far corner.',
      team: [['mogpost_cannoneer', 30, { held: 'boost_ranger' }], ['kitemog_skydiver', 30], ['stampo_blackbelt', 30], ['chatmog_orator', 30]], money: 1500 }),
    W.trainer({ id: 'mg_dot', cls: 'Courier', name: 'Dot', model: { base: 'girl3', top: '#c84040', bottom: '#2a2a3a', hairStyle: 'cap', extras: ['harness'] },
      at: [5, 5], dir: 'right', sight: [6, 5, 5, 1], bg: 'town',
      line: "You've reached the dead letter office! That means you're lost. Lost people have to battle me. It's in the rules!",
      lose: "Delivered. To defeat.", after: "Bahamog sleeps on the antenna. If you wake it, please wake it gently. It's grumpy before breakfast.",
      team: [['mopluff_dancer', 30, { held: 'quick_gear' }], ['juggler_jester', 30], ['pipkin_onion_knight', 30], ['tufty_mime', 30], ['mogpost_cannoneer', 30]], money: 1500 }),
  ];
  FF7.defineMap('kp_mognet_2', {
    name: 'Mognet Tower - Dead Letter Office', area: 'Mognet Tower', theme: 'house', music: 'fiddle', kpWild: 'kp_mognet', kpBg: 'town', kpCave: true,
    look: Object.assign({}, MG_LOOK, { floor: ['#a89068', '#a08860'] }),
    grid: MG2,
    heights: [
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
    ],
    props: [{ at: [1, 0.55], prop: 'ladder', face: 's', h: 2.6 }].concat(deco(MG2, { B: (x, y) => ({ prop: rnd(x, y) < 0.5 ? 'crate' : 'scrap', col: rnd(x, y, 2) < 0.5 ? '#c8a878' : '#a08060', size: 0.7 }), o: () => ({ prop: 'barrel', col: '#8a6a40' }) })),
    entries: { from_down: [12, 16, 'up'], from_up: [2, 1, 'down'] },
    exits: [
      { at: [12, 17, 2, 1], to: 'kp_mognet_1', entry: 'from_up', sfx: 'door' },
      { at: [1, 1, 1, 1], to: 'kp_mognet_3', entry: 'from_down' },
    ],
    npcs: MG2T.map(t => t.npc).concat([W.moogle('mg2_mog', 'chatmog_orator', [20, 4], { wander: 2, line: "Chatmog: Kupo kupo kupo kupo! It's reading every unclaimed letter out loud." })]),
    items: [W.item('mg2_parcel', [23, 15], 'royal_nut', 3), W.item('mg2_sack', [14, 6], 'boost_bard')],
    triggers: MG2T.map(t => t.trig).concat([W.hidden('mg2_letter', [15, 2], 'fancy_nut', 2)]),
  });
  const MG3 = [
    "                      ",
    "        ======        ",
    "     ===______===     ",
    "   ==____________==   ",
    "  =__O_____________=  ",
    " =__________________= ",
    " =________bb________= ",
    " =________bb________= ",
    " =__________________= ",
    " =__________________= ",
    " =__________________= ",
    " =__B___________j___= ",
    "  =________________=  ",
    "   ==____________==   ",
    "     ===______===     ",
    "        ==__==        ",
  ];
  FF7.defineMap('kp_mognet_3', {
    name: 'Mognet Tower - Rooftop', area: 'Mognet Tower', theme: 'temple', music: 'dream', kpBg: 'sky',
    look: { sky: ['#2a5ab0', '#e8f2ff'], clouds: { col: '#ffffff', alpha: 0.85, n: 9, speed: 0.25 }, fog: { color: [0.8, 0.88, 0.98], near: 16, far: 40 },
      floor3: ['#b87a5a', '#b07252'], wall: '#d8c8a8', ambient: [0.58, 0.6, 0.64], light: [0.95, 0.94, 0.9] },
    grid: MG3,
    legend: { b: 'block' },
    props: deco(MG3, { '=': () => ({ prop: 'rail', col: '#7a2a2a' }) }).concat([
      { at: [10.5, 6.5], prop: 'pylon', h: 7.5, w: 1.8, top: 0.5, col: '#c84040', arms: 1.2, lamp: '#ff6040' },
      { at: [5, 4], prop: 'well', col: '#5a8ad0' },
    ]),
    entries: { from_down: [10, 14, 'up'] },
    exits: [{ at: [10, 15, 2, 1], to: 'kp_mognet_2', entry: 'from_up' }],
    npcs: [
      W.legend('mg_bahamog', 'bahamog_bahamut', { at: [10, 4], lv: 30, bg: 'sky', music: 'weaponraid', scale: 1.4,
        intro: 'Wrapped round the foot of the great antenna, wings folded, sleeps Bahamog, king of the sky moogles.\fOne eye opens. It looks at your Gold League medal... and decides you might be interesting.' }),
      W.moogle('mg3_mog', 'kitemog_flier', [15, 9], { wander: 2, line: "Kitemog: Kuuupo! It's tethered to the railing, so it doesn't blow away. It looks thrilled about it." }),
    ],
    items: [W.item('mg3_box', [16, 10], 'royal_nut', 2)],
    triggers: [{ at: [5, 4], on: 'talk', run: function* (s) { yield s.msg("A rainwater barrel. Someone has floated a paper boat in it. The boat is addressed to 'Bahamog, The Roof'."); } }],
  });

  // ================================================================== Costa del Kupo: the tournaments' island (post-game)
  // A resort isle off the Seabreeze Coast: the pier where the S.S. Moogle docks (south), a beach and a promenade, the
  // Mog Center, and the Battle Square (north), where the League Desk runs the five tournaments for Kupo League
  // Champions. Big Mog flies here once it's been visited.
  const CD = [
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    "T,,,,,,,,,,,,,,,,,,,,,,,,,,,,T",
    "T,,hhhhhhhhhhhh,,,,,,,,,,,,,,T",
    "T,,hhhhhhhhhhhh,,,,hhhhhh,,,,T",
    "T,,hhhhhhhhhhhh,,,,hhhhhh,,,,T",
    "T,,hhhhhhhhhhhh,,,,hhhhhh,,,,T",
    "T,,hhhhhh+hhhhh,,,,hhh+hh,,,,T",
    "T,,,,,,,::,,,,,,,,,,,::,,,,,,T",
    "T,,f,,,,::,,,,f,,,,,,::,,,f,,T",
    "T::::::::::::::::::::::::::::T",
    "TssssssssssssssssssssssssssssT",
    "TsssPssssssssssssssssssssPsssT",
    "TssssssssssssssssssssssssssssT",
    "TssssssssssssssssssssssssssssT",
    "~KK~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    "~KK~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    "~KK~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    "~KK~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    "~KK~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    "~KK~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    "~KK~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    "~KK~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    "~KK~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    "~KK~~~~~~~K~~~~~~~~~~~~~~~~~~~",
    "~KKKKKKbKKKKKKKKKKKKbKKKKKKBB~",
    "~KKKKKKKKKKKlKKKKKKKKKKKKKKBB~",
    "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  ];
  FF7.defineMap('kp_costa', {
    name: 'Costa del Kupo', area: 'Costa del Kupo', theme: 'beach', music: 'costadelsol', kpBg: 'beach',
    look: { sky: ['#4a9ae0', '#f0faff'], grass: ['#7aa850', '#72a04a'], water: '#2a8ab8', floor2: ['#e8dcc0', '#e0d4b8'], wood: ['#9a7a50', '#8a6a44'], floorTex: { floor2: 'tiles' } },
    grid: CD,
    legend: { b: 'bollard', l: 'quaylamp', B: 'quaycrate' },
    props: deco(CD, { P: palm }).concat([
      // the S.S. Moogle, moored port side to the quay with her bow at the pier, right in front of the town; her gangway
      // from the shell door (model z 2.2: x 12.7, the hull's side at row 23) down to its foot on the quay
      { at: [16.6, 20.5], vehicle: 'ocean_liner', rot: -90, y0: -0.67 },
      { at: [10, 23.02], prop: 'gangway', dx: 2.2, dz: -0.45, rise: 0.48 },
      { at: [7, 24], to: [6, 22.1], h: 0.24, h2: 1.0, col: '#e8dcc0', sag: 0.12 },
      { at: [20, 24], to: [21, 22.5], h: 0.24, h2: 0.95, col: '#e8dcc0', sag: 0.12 },
      { at: [9, 6], prop: 'banner', col: '#e8c040', col2: '#a02a2a', y: 3.4, h: 1.0, w: 4, text: 'BATTLE SQUARE', size: 0.2, textCol: '#a02a2a' }]),   // (on the front row, hung on the face: at 5.6 it was inside the building)
    buildings: [
      { at: [3, 2, 12, 5], h: 4.2, col: '#f4e8c8', roof: '#c8a040', top: 'hip', rise: 1.6, win: '#ffe8a0' },
      { at: [19, 3, 6, 4], h: 2.8, col: '#f4ece0', roof: '#e05a7a', top: 'hip', rise: 1.2 },
    ],
    labels: [{ at: [22, 6], face: 's', text: 'MOG CENTER', size: 0.15, col: '#e05a7a', y: 2.0 }],
    entries: { from_ship: [10, 24, 'down'], from_center: [22, 7, 'down'], from_arena: [9, 7, 'down'] },
    exits: [
      { at: [9, 6, 1, 1], to: 'kp_costa_arena', entry: 'from_town', sfx: 'door' },
      { at: [22, 6, 1, 1], to: 'kp_costa_center', entry: 'from_town', sfx: 'door' },
      // up the gangway: the port shell door on her Promenade Deck (the Captain sails her: docs/RUNNER.md "Travel links")
      { at: [10, 23, 1, 1], to: 'kp_ss_promenade', entry: 'from_costa', sfx: 'door', if: boardIf, blocked: ticketCheck },
    ],
    onLoad: s => { s.setVar('kp_ss_port', 'costa'); },   // (the S.S. Moogle lies here whenever you see her here)
    npcs: [
      { id: 'cd_steward', name: 'Gangway Steward', model: STEWARD, at: [11, 24], dir: 'left', talk: gangwayTalk('the Seabreeze Coast') },
      folk({ id: 'cd_harbourmaster', name: 'Harbourmaster', model: { base: 'oldman', top: '#2a3a5a', bottom: '#2a3a5a', hairStyle: 'cap', hair: '#2a3a5a', extras: ['beard'] }, at: [2, 14], dir: 'down',
        lines: "Mind the planks, Champion! The S.S. Moogle's berth is the longest quay on the isles. We had to build it twice: the first one was too short for her." }),
      folk({ id: 'cd_tourist', name: 'Tourist', model: SWIM('woman9', '#e05a8a'), at: [6, 11], dir: 'down', wander: 2,
        lines: "Sun, sand, and the best moogle battles in the world! I came for the beach. I stayed for the World Championship." }),
      folk({ id: 'cd_vendor', name: 'Vendor', model: 'man12', at: [24, 9], dir: 'left',
        lines: "Shaved ice! Kupo Nut flavour, Kupo Nut flavour, or... Kupo Nut flavour. We're a very focused business." }),
      folk({ id: 'cd_fan', name: 'Fan', model: 'kid6', at: [18, 8], dir: 'down', wander: 2,
        lines: s => s.flag('kp_league_5') ? "You're the WORLD CHAMPION?! Can I have your autograph? ...Can my moogle have your autograph?" : "The World Champion's been unbeaten for years! Nobody's even seen him battle. I heard he's a CAT." }),
      W.moogle('cd_mog1', 'seamog_captain', [10, 12], { wander: 3, line: 'Seamog: Kupo-ahoy! It is supervising the waves.' }),
      W.moogle('cd_mog2', 'mopluff_dancer', [21, 11], { wander: 2, line: 'Mopluff: Kupo~ It is dancing to the surf.' }),
    ],
    triggers: [quayCam([1, 14, 28, 12], true), quayCam([1, 12, 3, 2], false)],
  });
  center('kp_costa_center', { name: 'Costa del Kupo Mog Center', town: 'kp_costa', back: 'from_center', decor: 'cosy', area: 'Costa del Kupo',
    hello: 'Welcome to the Battle Square Mart, kupo! Champions get the best of everything.',
    npcs: [folk({ id: 'cdc_trainer', name: 'Ace Trainer', model: 'woman12', at: [7, 4], dir: 'down',
      lines: "The tournaments here are no joke: every trainer brings their best five, held items and all. Breeding a few '+' into your team at the Kupo Ranch helps." })] });
  // the Battle Square: the League Desk and its five tournaments (Champions only), and the Kupo King once there's a World
  // Champion (once: befriend him, or beat him and he leaves to come back later)
  FF7.defineMap('kp_costa_arena', {
    name: 'Costa del Kupo - Battle Square', area: 'Costa del Kupo', theme: 'temple', music: 'cinco_chocobo',
    look: { floor: ['#e8e2d4', '#e0dacc'], floor2: ['#c8b890', '#c0b088'], floor3: ['#a02a2a', '#982626'], wall: '#e0d8c4', trim: '#c8a040', wallH: 3.4,
      sky: ['#000000', '#000000'], ambient: [0.56, 0.54, 0.52], light: [0.92, 0.88, 0.8], pillar: '#f0ead8', indoor: true, floorTex: { floor: 'marble', floor3: 'carpet' } },
    grid: HALL.map((r, i) => i === 0 ? '#'.repeat(r.length) : r),
    props: [
      { at: [11.5, 0], prop: 'viewwindow', w: 8, h: 1.5, y: 1.2, col: ['#6ab8e8', '#e8d8a8'], col2: '#c8a040', bars: 5 },
      ...[['GOLD', '#d8b030', 3], ['PLATINUM', '#c8d0d8', 6], ['DIAMOND', '#a8e0f0', 17], ['MASTER', '#8a3ab0', 20]].map(([t, col, x]) => ({ at: [x, 0], prop: 'banner', col, col2: '#3a2a1a', y: 2.65, h: 1.6, w: 1.4, text: t, size: 0.13, textCol: '#3a2a1a' })),
      { at: [11.5, 1.6], prop: 'banner', col: '#e8e0f0', col2: '#c8a040', y: 3.2, h: 0.9, w: 5, text: 'WORLD CHAMPIONSHIP', size: 0.14, textCol: '#3a2a6a' },
    ],
    labels: [{ at: [11.5, 3], face: 's', text: 'LEAGUE DESK', size: 0.14, col: '#a02a2a', y: 1.1 }],
    lights: [[11.5, 4, '#fff0d0', 6], [11.5, 11, '#fff0d0', 6]],
    entries: { from_town: [11, 14, 'up'] },
    exits: [{ at: [11, 15, 2, 1], to: 'kp_costa', entry: 'from_arena', sfx: 'door' }],
    npcs: [
      W.legend('coh_kupoking', 'kupoking_king', { at: [11, 6], dir: 'down', lv: 30, bg: 'arena', music: 'weaponraid', scale: 1.2, show: s => s.flag('kp_league_5'),
        intro: 'A tiny crown bobs down the carpet, and every moogle in the Square bows. The Kupo King himself has come to see the new World Champion... and he wants to see what you can do!' }),
      { id: 'registrar', name: 'Registrar', model: { base: 'woman3', top: '#a02a2a', jacket: '#a02a2a', bottom: '#2a2a3a', extras: ['tie'] }, at: [11, 2], dir: 'down', talk: registrar },
      folk({ id: 'coh_official', name: 'League Official', model: { base: 'man4', top: '#2a2a3a', jacket: '#2a2a3a', extras: ['suit', 'tie'] }, at: [16, 6], dir: 'left',
        lines: "Tournament rules! Eight trainers, single elimination. Three wins takes the cup. Your moogles are repaired between rounds, and bag items stay in the bag: held items only.\fLose, and you're out. But you can enter again whenever you like. Persistence is a champion's job too." }),
      folk({ id: 'coh_rookie', name: 'Rookie', model: 'man13', at: [5, 9], dir: 'right',
        lines: "I only just became Champion and I already signed up for the Gold League. My hands won't stop shaking. Is that normal? Please say it's normal." }),
      folk({ id: 'coh_ace', name: 'Ace Trainer', model: 'woman12', at: [18, 13], dir: 'up', anim: 'sit', hover: 0.14,
        lines: "Here's a tip from a three-time Platinum loser: give your moogles held items. Leftover Nuts, Quick Gears, type boosters. Here they make all the difference." }),
    ],
    triggers: [
      { at: [9, 3, 6, 1], on: 'talk', run: registrar },
      { at: [2, 6], on: 'talk', run: function* (s) { yield s.msg('A trophy case. Gold, platinum, diamond... and at the very top, an empty space with a little card: "Reserved."'); } },
      { at: [21, 6], on: 'talk', run: function* (s) { yield s.msg('Photographs of past finals. In the newest, the champion is hidden behind a giant stuffed moogle. Deliberately, it seems.'); } },
    ],
  });
})();
