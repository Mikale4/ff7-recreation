// Runner plan, Chapter 6a (docs/RUNNER.md): Costa del Sol, Mt. Corel, North Corel, the Gold Saucer (Cait
// Sith; Wonder, Speed and Ghost Squares), the Battle Square massacre, Corel Prison (Barret's past, Dyne),
// the chocobo race for freedom and Dio's buggy. Handoff: has_buggy / c6a_done (the party drives out of
// the desert on the world map).
//
// Items (Walkthrough {12}-{14}, Item/Materia Locations): Fire Ring, Motor Drive, Power Source (the villa's
// basement), Wizard Staff (under the rotten ties: "Swing over to the ledge below"), W Machine Gun, Star
// Pendant, Turbo Ether, Transform (the tracks), Phoenix Down x10 (the Cokatolis nest: the mother bird is
// fought), Tent, Mind Source, Power Source (the miner's cave), Ether (North Corel, the pot in the house on
// the right), Manipulate (Cait Sith), Speed Source (G-Bike, 10000+), 30 GP (Mog's House + the fan),
// Umbrella (the Speed Square coaster, 5000+), Turtle's Paradise flyer No. 3 (Ghost Hotel), Silver Armlet
// (Dyne), Ramuh (the jockey room: missable).
// Steals: Platinum Bangle (Death Claw). Enemy Skills: Laser (Death Claw) and Matra Magic (Bullmotor, for the
// second Enemy Skill materia) around Corel Prison; after the buggy, Big Guard (Beach Plug, manipulated by
// Cait Sith). Aqualung (Harpy) is left for later (see the last section).
// Choices: the ball is kicked at Red XIII (off duty); Aeris goes along at the Gold Saucer and to see Dyne
// (date points, as in the Date Guide); the 1-day pass (the Gold Ticket is 30000); Mog's House (a visual novel) to its best ending.
(function () {
  const R = FF7.runner, O = R.ops, C5 = R.c5 = R.c5 || {};
  const full = () => FF7.sys.party.active().every(c => c.hp >= c.maxHp && c.mp >= c.maxMp);

  // The state C5b ends in (its c5b_end checkpoint): docked at Costa del Sol, the arrival scene played.
  R.starts.c6a = {
    map: 'costa_port', entry: 'from_ship',
    members: ['cloud', 'barret', 'tifa', 'aeris', 'redxiii', 'yuffie'], party: ['cloud', 'barret', 'tifa'],
    levels: { cloud: 20, barret: 19, tifa: 19, aeris: 17, redxiii: 17, yuffie: 18 },
    names: { cloud: 'Cloud', barret: 'Barret', tifa: 'Tifa', aeris: 'Aeris', redxiii: 'Red XIII', yuffie: 'Yuffie' },
    flags: ['left_midgar', 'c4_eskill', 'c5a_flashback_done', 'c5a_piano_jammed', 'has_phs', 'chocobo_lure', 'c5b_chocomog', 'c5b_zolom_seen',
      'c5b_turks_mine', 'yuffie_joined', 'c5b_condor_gate', 'c5b_condor_joined', 'c5b_condor_fund', 'c5b_condor_w1', 'c5b_condor_w2',
      'c5b_condor_w3', 'c5b_bottomswell', 'c5b_priscilla_saved', 'c5b_junon_slept', 'c5b_tifa_talk', 'c5b_shiva', 'c5b_whistle',
      'c5b_in_water', 'c5b_dolphin_jump', 'c5b_disguised', 'c5b_parade_done', 'c5b_sendoff_done', 'c5b_ship_boarded', 'c5b_ship_aeris',
      'c5b_ship_tifa', 'c5b_ship_red', 'c5b_undisguised', 'c5b_ship_alarm', 'c5b_jenova_birth', 'c5b_arrived', 'c6a_arrived',
      'got_junon_apt_eskill', 'got_ship_hold_all', 'got_ship_engine_windslash', 'got_ship_engine_ifrit'],
    vars: { aff_barret: 5, aff_tifa: 3, aff_aeris: 2, c5b_condor_funds: 10000, c5b_condor_prize: 3 },
    items: { phoenix_down: 9, ether: 11, elixir: 3, tent: 4, antidote: 3, hyper: 2, tranquilizer: 1, grenade: 2, turbo_ether: 1, megalixir: 1,
      peacemaker: 1, gysahl_greens: 1, hi_potion: 8, potion: 12, '1_35_soldier': 2, buster_sword: 1, eye_drop: 2, star_pendant: 1, headband: 1,
      '4_point_shuriken': 1, white_cape: 1, mythril_clip: 1, bronze_bangle: 1 },
    keyItems: ['phs'], gil: 2940, phs: true,
    equip: {
      cloud: { weapon: 'force_stealer', armor: 'mythril_armlet', accessory: 'power_wrist' },
      barret: { weapon: 'assault_gun', armor: 'mythril_armlet', accessory: 'talisman' },
      tifa: { weapon: 'mythril_claw', armor: 'mythril_armlet', accessory: 'protect_vest' },
      aeris: { weapon: 'mythril_rod', armor: 'iron_bangle', accessory: 'peace_ring' },
      redxiii: { weapon: 'magic_comb', armor: 'mythril_armlet' },
      yuffie: { weapon: 'wind_slash', armor: 'titan_bangle' },
    },
    materia: {
      cloud: ['lightning', 'restore', 'poison', 'all', 'choco_mog'],
      barret: ['fire', 'all', 'enemy_skill', 'cover'],
      tifa: ['ice', 'shiva', 'enemy_skill', 'steal', 'restore'],
      yuffie: ['throw'],
    },
    stock: ['sense', 'chocobo_lure', 'long_range', 'ifrit', 'elemental'],
  };

  R.plans.c6a = [
    ['chapter', 'c6a', 'Chapter 6a: Costa del Sol to the Gold Saucer and Corel Prison'],
    ['expect', 'c5b_arrived'],                                      // the handoff from C5b
    ['battle', { limit: 'use' }],                                   // Limit Breaks as they come (new ones are learned by using them)

    // ---- Costa del Sol (the party was picked on the pier: Cloud, Tifa, Barret)
    ['obj', 'Look around Costa del Sol'],
    ['goto', 'costa_town'],
    ['talk', 'kid', { done: 'c6a_ball', choose: 'Kick it' }],       // the ball bounces off Red XIII's head
    ['goto', 'costa_villa'],
    ['goto', 'costa_villa_b1'],
    ['chest', 'costa_villa_firering'],                              // Fire Ring
    ['chest', 'costa_villa_motordrive'],                            // Motor Drive
    ['chest', 'costa_villa_powersource'],                           // Power Source
    ['c5a_use', 'power_source', 'cloud'],
    ['goto', 'costa_johnny'],
    ['talk', 'johnny', { done: { any: ['c6a_johnny_tifa', 'c6a_johnny_met'] } }],
    ['goto', 'costa_beach'],
    ['talk', 'hojo', { done: 'c6a_hojo_talked' }],                  // Hojo on holiday: "a Reunion"
    ['goto', 'costa_bar'],
    ['gear', { shop: 'dealer', keepGil: 2000, slots: ['armor'], done: 'c6a_gear_costa' }],   // Carbon / Platinum Bangles
    ['js', (s) => { s.set('c6a_gear_costa'); return true; }],
    // Revive (Life) at the materia counter, when the gil left over allows it (the pass and North Corel's gear
    // come first; else upper Junon sells it in C10)
    ['goto', 'costa_shop', { done: (s) => R.gear.owned('revive') > 0 || FF7.state.gil < 8500 }],
    ['buyNew', { shop: [17, 3], kinds: [], want: { revive: 1 }, keepGil: 5500, done: (s) => R.gear.owned('revive') > 0 || FF7.state.gil < 8500 }],
    ['goto', 'costa_inn'],
    ['inn', 'innkeeper', { done: full }],

    // ---- Mt. Corel
    ['obj', 'Cross Mt. Corel to the west'],
    ['world', 'mt_corel'],
    ['expectMap', 'mtcorel_path1'],
    ['talk', 'oldman', { done: 'c6a_oldman_talked' }],              // the man in the black cape
    ['goto', 'mtcorel_reactor'],
    ['goto', 'mtcorel_tracks1'],
    ['save'],
    // the rotten ties: let go and swing down to the ledge below (the Wizard Staff)
    ['c5a_walkTo', 18, 3, 'c6a_wizard_staff', { choose: 'Swing over to the ledge below' }],
    ['goto', 'mtcorel_tracks2'],
    ['chest', 'mtcorel_tracks2_wmg'],                               // W Machine Gun (end of the upper tracks)
    ['item', 'mtcorel_tracks2_starpendant'],                        // Star Pendant
    ['item', 'mtcorel_tracks2_turboether'],                         // Turbo Ether
    ['item', 'mtcorel_tracks2_transform'],                          // Transform
    ['goto', 'mtcorel_cabin'],
    ['goto', 'mtcorel_cabin_in'],
    ['use', 4, 1, { done: 'c6a_bridge_down', choose: 'Pull it' }],   // the drawbridge lever
    ['goto', 'mtcorel_cabin'],
    ['save'],
    ['use', 25, 2, { done: 'c6a_nest', choose: 'Take the Phoenix Downs' }],   // Phoenix Down x10; the mother bird
    ['heal', { below: 0.6 }],
    ['goto', 'mtcorel_waterside'],
    ['goto', 'mtcorel_cave'],
    ['items'],                                                      // Tent, Mind Source, Power Source
    ['talk', 'miner', { done: 'c6a_miner_talked' }],
    ['c5a_use', 'mind_source', 'cloud'], ['c5a_use', 'power_source', 'cloud'],
    ['autoequip', { reserve: true }],                               // W Machine Gun, Wizard Staff, Star Pendant
    ['goto', 'mtcorel_waterside'],
    ['goto', 'mtcorel_bridge'],
    ['goto', 'ncorel_town'],
    ['expect', 'c6a_ncorel_arrival'],
    ['ckpt', 'c6a_ncorel'],

    // ---- North Corel: the Ether in the pot, the weapon shop, Barret's story at the ropeway
    ['obj', 'Take the ropeway to the Gold Saucer'],
    ['goto', 'ncorel_house'],
    ['use', 16, 1, { done: 'c6a_ncorel_ether' }],                   // Ether (the pot in the corner)
    ['goto', 'ncorel_town'],
    ['gear', { shop: 'weaponseller', keepGil: 3400, done: 'c6a_gear_ncorel' }],
    ['js', (s) => { s.set('c6a_gear_ncorel'); return true; }],
    // the Gold Saucer: 3000 gil for the pass, a few hundred for the games
    ['goto', 'world', { done: { any: ['c6a_saw_saucer', { gil: 3400 }] } }],
    ['c5a_grind', { gil: 3400 }, { world: [138, 160], maxBattles: 20, soft: true, budget: 400000, done: 'c6a_saw_saucer' }],
    ['goto', 'ncorel_ropeway'],
    ['expect', 'c6a_barret_story'],
    ['talk', 'attendant', { done: 'c6a_saw_saucer', choose: 'Ride up' }],
    ['expectMap', 'gs_entrance'],

    // ---- the Gold Saucer
    ['obj', 'Enter the Gold Saucer'],
    ['talk', 'ticket_girl', { done: (s) => s.flag('c6a_gs_pass') || s.has('gold_ticket'), choose: '1-day pass' }],
    ['choose', 'Aeris'],                                            // who Cloud goes around with (date points)
    ['goto', 'gs_station'],
    ['expect', 'c6a_barret_left'],
    ['obj', 'Wonder Square: games and a fortune teller'],
    ['name', 'caitsith', 'Cait Sith'],
    ['goto', 'gs_wonder'],                                          // Cait Sith joins (Manipulate)
    ['expect', 'cait_joined'],
    ['use', 24, 2, { done: 'c6a_mog_cleared', choose: ['Play'] }],   // Mog's House (the visual novel: its bot plays the week that ends best)
    ['talk', 'mogfan', { done: 'c6a_mog_reward' }],                 // 30 GP
    ['minigame', 'motorcycle', { win: true }],
    ['use', 9, 2, { done: 'c6a_gbike_prize', choose: 'Play' }],     // G-Bike: 10000+ for the Speed Source
    ['minigame', 'motorcycle', { win: true }],
    ['use', 9, 2, { done: 'c6a_gbike_prize', choose: 'Play' }],     // (again, if the score fell short)
    ['c5a_use', 'speed_source', 'cloud'],
    ['goto', 'gs_speed'],
    ['minigame', 'shooting', { win: true }],
    ['talk', 'coaster_man', { done: 'c6a_umbrella', choose: 'Ride' }],   // 5000+: the Umbrella
    ['goto', 'gs_ghost'],
    ['use', 5, 1, { done: 'c6a_turtle_flyer3' }],                   // Turtle's Paradise flyer No. 3
    ['use', 18, 3, { choose: 'Stay', done: full }],                  // the Ghost Hotel's free beds
    ['goto', 'gs_station'],
    ['ckpt', 'c6a_saucer'],

    // ---- the Battle Square massacre; Corel Prison
    ['obj', 'Something is wrong at the Battle Square'],
    ['exit', 'gs_battle', { done: 'c6a_framed' }],
    ['expectMap', 'prison_yard'],
    ['expect', 'c6a_prison_arrival'],
    ['obj', 'Find Barret in Corel Prison'],
    ['goto', 'prison_barret_house'],
    ['party', ['cloud', 'barret', 'aeris'], { select: true }],      // Barret goes; Aeris along (date points)
    ['talk', 'barret', { done: 'c6a_barret_rejoined' }],
    ['expect', 'c6a_barret_rejoined'],
    ['autoMateria', { steal: 'cloud', eskill: ['barret'], all: false, done: 'c6a_prison_setup' }],
    ['loadout', 'aeris', { weapon: ['enemy_skill'], done: 'c6a_prison_setup' }],   // the other E.Skill materia (from Tifa)
    ['js', (s) => { s.set('c6a_prison_setup'); return true; }],
    ['goto', 'prison_pub'],
    ['shop', 'barkeep', { buy: [['potion', 10]], lenient: true, done: 'c6a_prison_shop' }],
    ['js', (s) => { s.set('c6a_prison_shop'); return true; }],
    // the outskirts and the junkyard: Laser (Death Claw) and Matra Magic (Bullmotor) for both Enemy Skill
    // materia, a Platinum Bangle from a Death Claw
    ['obj', 'Head through the junkyard to find Dyne'],
    ['goto', 'prison_outskirts'],
    ['battle', { steal: ['platinum_bangle'], limit: 'use' }],
    ['c5a_learn', 'laser', { all: true, spare: ['death_claw'], spareTurns: 30, maxBattles: 16, heal: 0.8, budget: 400000 }],
    ['heal', { below: 0.9 }],
    ['c5a_learn', 'matra_magic', { all: true, spare: ['bullmotor'], spareTurns: 3, maxBattles: 12, heal: 0.8, budget: 300000 }],
    ['battle', { limit: 'use' }],
    ['goto', 'prison_junkyard'],
    ['heal', { below: 0.9 }],
    // Dyne: Barret alone. Restore on him, then save
    ['loadout', 'barret', { weapon: [['restore', 'all']], done: 'c6a_dyne_done' }],
    ['goto', 'prison_dyne'],
    ['save'],
    ['ckpt', 'c6a_dyne'],
    ['obj', 'Dyne'],
    ['walk', 14, 5, { done: 'c6a_dyne_done' }],                     // the cliff: the flashback, then Barret vs Dyne
    ['expectMap', 'gs_jockey'],
    ['expect', 'c6a_race_intro'],

    // ---- the jockey room: the Ramuh materia (missable), then the race
    ['obj', 'Win the chocobo race'],
    ['item', 'gs_jockey_ramuh'],                                    // Ramuh
    ['minigame', 'chocobo_race', { win: true }],
    ['talk', 'ester', { done: 'c6a_done', choose: ["Let's race", "I'll manage"] }],   // the race; Dio's letter; the buggy
    ['expect', 'has_buggy'],
    ['expect', 'c6a_done'],
    ['ckpt', 'c6a_buggy'],

    // ---- the buggy's first drive (Walkthrough {15}): Big Guard from a Beach Plug manipulated by Cait Sith (this
    // game's desert edge has no beach or sand tiles: its forest / wasteland tiles use the mixed table with the
    // Beach Plugs and Harpies)
    ['obj', 'Enemy Skill by the desert: Big Guard'],
    ['party', ['cloud', 'barret', 'caitsith']],
    ['autoMateria', { steal: false, eskill: ['cloud'], manipulate: 'caitsith', all: false, done: 'c6a_buggy_setup' }],
    ['loadout', 'barret', { weapon: ['enemy_skill'], done: 'c6a_buggy_setup' }],   // both E.Skill materia on the party
    ['js', (s) => { s.set('c6a_buggy_setup'); return true; }],
    // (Aqualung is left for later: kept alive to cast it, a Harpy's Aqualung (~560 to everyone at Lv21, every
    // third turn) wiped the party in a test, and the Auto AI never casts Big Guard first)
    ['c5a_learn', 'big_guard', { all: true, world: [140, 214], terrain: 'fw', region: 'desert_edge', maxBattles: 14, heal: 0.8, budget: 400000 }],
    ['battle', { limit: 'use' }],
    ['expect', 'has_buggy'],
    ['ckpt', 'c6a_end'],
  ];
})();
