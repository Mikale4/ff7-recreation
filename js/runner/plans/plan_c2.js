// Runner plan, Chapter 2: the Sector 7 slums and the Reactor No.5 raid (docs/RUNNER.md).
// Starts at s7_station / from_train (the C1 handoff); ends when Cloud falls from the bridge after Air
// Buster: s.goto('s5_church', 'from_fall'). C3's opening scenes (the church, the barrels) play at once and
// ask two questions, so their answers are queued here, before the bridge.
// Items (the guides' checklist, this game's ids): 1500 gil (Barret), All materia + Ether (Beginner's Hall),
// Phoenix Down (train car 1), Hi-Potion (car 2, answer "Yeah"), the pickpocket's Potion (car 3, asked back),
// Ether (plate interior), Potion (Jessie), Tent (Biggs' catwalk), Ether (reactor entrance chest), Titan
// Bangle (Air Buster). Bought: Iron Bangle x3 (the only shop in the game that sells them: a missable),
// a second Lightning materia. The flower from C1 goes to Marlene (this game offers no "give it to Tifa").
// Choices: Tifa's drink "Something strong", no Materia lesson (no effect, fewer lines), "Wait for it" then
// "Push" at the three-button door. The train is run to the front car (not caught).
(function () {
  const R = FF7.runner;

  R.starts.c2 = {
    map: 's7_station', entry: 'from_train',
    members: ['cloud', 'barret'], party: ['cloud', 'barret'],
    levels: { cloud: 7, barret: 6 }, names: { cloud: 'Cloud', barret: 'Barret' },
    flags: ['c1_intro_done', 'trig_md1_platform_mp_ambush', 'trig_md1_gate_meet_team', 'c1_gate_open', 'c1_bridge_seen', 'c1_barret_joined',
      'got_md1_entrance_box', 'c1_door_open', 'c1_elevator_talk', 'trig_md1_shaft_jessie_tip', 'c1_jessie_tip', 'got_md1_shaft_potion',
      'got_md1_core_restore', 'c1_core_talk', 'c1_bomb_set', 'c1_escape', 'c1_jessie_free', 'c1_out_msg', 'c1_s8_intro', 'c1_bought_flower',
      'c1_flower_done', 'got_md8_street_potion', 'trig_md8_street_mps1', 'trig_md8_overpass_cornered', 'c1_train_talk'],
    vars: { c1_guard_potions: 2 },
    items: { potion: 7, phoenix_down: 1, gatling_gun: 1 }, gil: 169,
    equip: { barret: { weapon: 'assault_gun' } },
    materia: { cloud: ['lightning', 'ice'], barret: ['restore'] },
  };

  R.plans.c2 = [
    ['chapter', 'c2', 'Chapter 2: Sector 7 slums, the Reactor No.5 raid'],
    ['expect', 'c1_train_talk'],
    ['battle', { limit: 'use' }],                                  // Limit Breaks whenever ready (Braver x8 teaches Cross-slash)

    // ---- the station: Barret's debriefing
    ['obj', 'Report to Barret'],
    ['goto', 's7_station'],
    ['talk', 'barret', { done: 'c2_debrief' }],
    ['expect', 'c2_debrief'],

    // ---- 7th Heaven: Tifa, Marlene, Barret, the drink, the hideout, the night, the morning
    ['obj', 'Head for 7th Heaven'],
    ['goto', 's7_bar'],                                            // Tifa's welcome (her name)
    ['expect', 'c2_bar_intro'],
    ['talk', 'marlene', { done: 'c2_marlene_flower' }],            // the flower from Sector 8
    ['walk', 11, 14, { done: 'c2_barret_stormed' }],                // heading out: Barret storms in (the walk stops there)
    ['expect', 'c2_barret_stormed'],
    ['talk', 'tifa', { done: 'c2_drink', choose: 'Something strong' }],
    ['expect', 'c2_drink'],
    ['obj', 'Take the pinball lift down to the hideout'],
    ['use', 8, 1, { done: 'c2_morning', choose: "You'll figure it out" }],   // the meeting, the promise, the night, Tifa joins
    ['expect', 'c2_promise'],
    ['expect', 'c2_tifa_joined'],
    ['expect', 'c2_morning'],

    // ---- the morning: gear up (Iron Bangles are sold only here), the Beginner's Hall
    ['obj', 'Gear up: weapon shop, Beginner\'s Hall, item shop'],
    ['goto', 's7_weapons'],
    ['gear', { shop: 'owner', keepGil: 1150, done: { equipped: ['tifa', 'iron_bangle'] } }],   // Iron Bangle x3, the Bronze Bangles sold
    ['goto', 's7_hall'],
    ['items'],                                                     // All materia, Ether (the chest that drops in)
    ['goto', 's7_itemshop'],
    ['shop', 'owner', { choose: 'Materia', buy: [['lightning', 1]], done: { materia: 'lightning', qty: 2 } }],
    ['shop', 'owner', { choose: 'Items', buy: [['potion', 5]], done: 'c2_departed', lenient: true }],
    // materia: Lightning on Cloud and Barret (Air Buster and the reactor machines), Restore + All on Cloud
    // (Cure-All; he keeps it for Chapter 3 alone), Ice on Tifa
    ['loadout', 'cloud', { weapon: [['restore', 'all']], armor: ['lightning'] }],
    ['loadout', 'barret', { weapon: ['lightning', null] }],
    ['loadout', 'tifa', { weapon: ['ice'] }],
    ['row', 'barret', 'back'],

    // ---- the midnight train
    ['obj', 'Meet Jessie at the station'],
    ['goto', 's7_station'],
    ['talk', 'jessie', { done: 'c2_departed', choose: "Let's go" }],
    ['expect', 'c2_departed'],
    ['expectMap', 'train2_car1'],
    ['obj', 'Keep a low profile on the midnight train'],
    ['talk', 'tifa', { done: 'c2_alarm' }],                        // the ID scan: every car seals in 15 s
    ['expect', 'c2_alarm'],
    ['obj', 'Run for the front car before the doors seal'],
    ['talk', 'pdman', { done: { any: ['c2_pd_given', 'c2_jumped'] } }],          // Phoenix Down
    ['exit', 1, { done: { any: ['c2_car2', 'c2_jumped'] } }],
    ['talk', 'hpman', { done: { any: ['c2_hipotion', 'c2_jumped'] }, choose: 'Yeah', map: 'train2_car2' }],   // Hi-Potion
    ['exit', 1, { done: { any: ['c2_car3', 'c2_jumped'] }, map: 'train2_car2' }],
    ['walk', 10, 3, { done: { any: ['c2_pickpocketed', 'c2_jumped'] }, map: 'train2_car3' }],   // the pickpocket bumps into Cloud...
    ['talk', 'pickpocket', { done: { any: [(s) => s.flag('c2_pickpocketed') && !FF7.state.vars.c2_stolen, 'c2_jumped'] }, choose: 'Hand it over', map: 'train2_car3' }],
    ['exit', 1, { done: { any: ['c2_car4', 'c2_jumped'] }, map: 'train2_car3' }],   // the front car: the jump into the tunnel
    ['expect', 'c2_jumped'],
    ['expect', 'c2_landed'],
    ['expect', 'c2_car4', { soft: true }],                         // made it to the front car (not caught)

    // ---- Sector 4: the tunnel, the vent, the plate interior
    ['obj', 'Follow the tunnel north to Reactor No.5'],
    ['goto', 's4_lasers'],
    ['exit', 's4_underground', { choose: 'Crawl in', done: 'c2_vent' }],
    ['expect', 'c2_vent'],
    ['expectMap', 's4_underground', { done: 'got_s4_underground_ether' }],   // (resumed further on: past it)
    ['item', 's4_underground_ether'],                              // Ether
    ['goto', 's4_jessie'],
    ['item', 's4_jessie_potion'],                                  // Potion (Jessie's supplies)
    ['goto', 's4_catwalk'],
    ['item', 's4_catwalk_tent'],                                   // Tent
    ['save'],
    ['ckpt', 'c2_plate'],

    // ---- Mako Reactor No.5
    ['obj', 'Plant the bomb in Reactor No.5'],
    ['goto', 'md5_core'],
    ['use', 14, 1, { done: 'c2_md5_bomb', choose: 'Set it' }],
    ['expect', 'c2_md5_bomb'],
    ['obj', 'Ride the elevator up to the exit'],
    ['goto', 'md5_entrance'],
    ['expect', 'c2_md5_panel'],
    ['chest', 'md5_entrance_ether'],                               // Ether
    ['use', 6, 1, { done: 'c2_door_open', choose: ['Wait for it', 'Push'] }],   // push on "THREE!"
    ['expect', 'c2_door_open'],
    ['goto', 'md5_hall'],
    ['heal', { below: 0.95 }],
    ['save'],
    ['ckpt', 'c2_airbuster'],
    ['obj', 'Get out of the reactor'],
    // C3 opens the moment Cloud lands: "Haven't we met?" and the barrels (Cloud stays up top and drops them)
    ['choose', "We've met", 'Stay put'],
    ['exit', 'md5_bridge', { done: 'c2_trap' }],                   // President Shinra's trap, Air Buster, the fall
    ['expect', 'c2_air_buster_beaten'],
    ['expect', 'c2_fell'],
    ['ckpt', 'c2_end'],
  ];
})();
