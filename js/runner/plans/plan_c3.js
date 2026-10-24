// Runner plan, Chapter 3: Aeris, Wall Market and the Sector 7 pillar (docs/RUNNER.md).
// Starts at s5_church / from_fall (C2's end: Cloud falls into the church; with the route, C2's end
// checkpoint already stands at the back of the church, the barrels question answered). Ends on the plate
// after the wire climb: s.goto('shinra_plaza', 'from_wire'), where C4's opening question (front door or
// the stairs) comes up at once, so its answer is queued here.
// Items (the guides' checklists, this game's ids): Titan Bangle (C2's Air Buster, equipped now), Ether and
// Cover materia (Aeris' garden), Potion + Phoenix Down (her house), Turtle's Paradise flyer No.1 (the
// sleeping boy's house; his 5 gil left alone -> Turbo Ether after the plate falls), Member's Card, the best
// dress items (Silk Dress, Blonde Wig, Sexy Cologne via the Digestive, Diamond Tiara), Bikini Briefs
// (Group Room), Hyper (Corneo's bedroom), Potion (sewer), Aps' Phoenix Down, Steal materia (sewer),
// Potion x3 + Hi-Potion x3 + Echo Screen + Ether (the Train Graveyard, barrels and the car roof included),
// Ghost Hand (stolen from a Ghost: the only chance in the game), Reno's Ether, Sense materia (the ruined
// playground), Turbo Ether, Ether (basement) + Phoenix Down (lackeys' room, open once Cloud is the bride),
// Batteries x3 (the third opens the wire's Ether hatch).
// Choices: "Stay put" and the three right barrels; Silk (soft, shimmers), 200-gil vending box, Digestive,
// the squats won, Group Room, make-up -> the Don picks Cloud (best items; the Walkthrough's Perfect Game
// pick); "there's this guy, Barret"; "Take her home" is not offered here.
(function () {
  const R = FF7.runner;

  // C2's end state (its c2_end checkpoint: at the back of the church, the barrels question answered "Stay
  // put"), for 'node tools/run_runner.js --start c3'. Barret and Tifa exist (their gear, materia) but are
  // away from the group, as after the church scene.
  R.starts.c3 = {
    map: 's5_church_back', entry: 'from_church',
    members: ['cloud', 'aeris'], away: ['barret', 'tifa'], party: ['cloud', 'aeris'],
    levels: { cloud: 8, aeris: 5, barret: 7, tifa: 6 }, names: { cloud: 'Cloud', aeris: 'Aeris', barret: 'Barret', tifa: 'Tifa' },
    flags: ['c1_intro_done', 'c1_barret_joined', 'c1_bought_flower', 'c1_flower_done', 'c1_train_talk', 'c2_arrived', 'c2_debrief',
      'c2_bar_intro', 'c2_marlene_flower', 'c2_barret_stormed', 'c2_drink', 'c2_basement_talk', 'c2_promise', 'c2_tifa_joined', 'c2_morning',
      'c2_hall_visit', 'got_s7_hall_all', 'got_s7_hall_ether', 'c2_departed', 'c2_train_intro', 'c2_alarm', 'c2_pd_given', 'c2_car2', 'c2_hipotion',
      'c2_car3', 'trig_train2_car3_bump', 'c2_pickpocketed', 'c2_car4', 'c2_jumped', 'c2_landed', 'c2_vent', 'c2_plate_in', 'got_s4_underground_ether',
      'got_s4_jessie_potion', 'got_s4_catwalk_tent', 'c2_md5_in', 'c2_md5_vision', 'c2_md5_bomb', 'c2_md5_lift_talk', 'c2_md5_panel',
      'got_md5_entrance_ether', 'c2_door_open', 'c2_md5_hall', 'c2_trap', 'c2_air_buster_beaten', 'c2_fell',
      'c3_church_intro', 'c3_church_escape', 'c3_back_scene', 'c3_barrels_on'],
    vars: { c1_guard_potions: 2, c2_stolen: 0, c3_barrel_step: 0 },
    items: { potion: 9, phoenix_down: 2, ether: 3, tent: 1, grenade: 2, titan_bangle: 1, gatling_gun: 1, bronze_bangle: 3 }, gil: 813,
    equip: { cloud: { armor: 'iron_bangle' }, barret: { weapon: 'assault_gun', armor: 'iron_bangle' }, tifa: { armor: 'iron_bangle' } },
    materia: { cloud: ['restore', 'all', 'lightning'], barret: ['lightning', null, null], tifa: ['ice', null] },
  };

  // past the swinging bar on the upper wreckage (the east side)
  const PAST_BAR = () => FF7.state.flags.c3_wire_done || (R.where() === 'wire_upper' && R.field() && R.field().player.tx >= 14);

  R.plans.c3 = [
    ['chapter', 'c3', 'Chapter 3: Aeris, Wall Market and the Sector 7 pillar'],
    ['choose', "We've met", 'Stay put', { done: 'c3_church_intro' }],   // (only when this chapter starts in the church)
    ['expect', 'c2_fell'],
    ['battle', { limit: 'use', steal: ['speed_drink', 'ether', 'ghost_hand', 'striking_staff', 'hyper'] }],

    // ---- the church: Aeris, Reno; the barrels at the back
    ['expect', 'c3_back_scene'],
    ['obj', "Drop the barrels on Reno's men"],
    ['use', 6, 4, { done: 'c3_barrel_0', map: 's5_church_back' }],       // FF7 order: leftmost, upper, rightmost
    ['use', 14, 3, { done: 'c3_barrel_1', map: 's5_church_back' }],
    ['use', 20, 4, { done: 'c3_barrel_2', map: 's5_church_back' }],
    ['expect', 'c3_back_done'],
    ['obj', 'Get Aeris home over the rooftops'],
    ['goto', 's5_path'],                                                  // the rafters, the roofs, the drop into Sector 5
    ['expect', 'c3_landed'],
    // gear: the Titan Bangle (Air Buster's) on Cloud up front, his Iron Bangle to Aeris
    ['autoequip', { members: ['cloud'], done: { equipped: ['cloud', 'titan_bangle'] } }],
    ['autoequip', { done: { equipped: ['aeris', 'iron_bangle'] } }],
    ['row', 'aeris', 'back'],

    // ---- Sector 5: the flyer, the garden, Aeris' house
    ['obj', "Walk Aeris home"],
    ['goto', 's5_kidhouse'],
    ['use', 7, 0, { done: 'c3_turtle_flyer1' }],                         // Turtle's Paradise flyer No.1 (the boy's 5 gil stay put)
    // (Fire is 600 gil: a game resumed here with less - the Demo replaying C2's fights - earns it on the path first)
    ['obj', 'Gil for the Fire materia (600)', { done: { any: [{ materia: 'fire' }, { gil: 600 }] } }],
    ['fightUntil', { gil: 600 }, { max: 8, at: 's5_path', done: { any: [{ materia: 'fire' }, { gil: 600 }] } }],
    ['goto', 's5_shops'],
    ['shop', 'm5clerk', { buy: [['fire', 1]], done: { materia: 'fire' } }],
    ['loadout', 'aeris', { weapon: ['fire'], armor: [null] }],
    ['loadout', 'cloud', { weapon: [['restore', 'all']], armor: ['lightning', null] }],
    ['goto', 's5_garden'],
    ['item', 's5_garden_ether'],                                          // Ether
    ['item', 's5_garden_cover'],                                          // Cover materia
    ['goto', 's5_house'],                                                 // Elmyra
    ['expect', 'c3_elmyra_met'],
    ['walk', 10, 4, { done: 'c3_elmyra_request' }],                       // upstairs: Elmyra's request
    ['expect', 'c3_elmyra_request'],
    ['item', 's5_house_potion'],                                          // Potion
    ['item', 's5_house_phoenix'],                                         // Phoenix Down
    ['use', 20, 1, { done: 'c3_slept', choose: 'Sleep' }],                // the night
    ['expect', 'c3_slept'],
    ['obj', 'Slip out quietly (walk past her room)'],
    ['exit', 's5_garden', { run: false, done: 'c3_snuck_out' }],          // running past her door wakes her up
    ['expect', 'c3_snuck_out'],
    ['goto', 's5_path'],
    ['walk', 3, 12, { done: 'c3_aeris_rejoined' }],                       // she was waiting at the way to Sector 6
    ['expect', 'c3_aeris_rejoined'],

    // ---- Sector 6: the playground, Tifa on the chocobo wagon
    ['obj', 'Head through Sector 6 toward Sector 7'],
    ['goto', 's6_park', { done: 'c3_park_scene' }],                        // (the ruins' exit script picks the park)
    ['expect', 'c3_park_scene'],
    ['goto', 's6_road'],
    ['fightUntil', { gil: 400 }, { max: 6, done: { any: [{ gil: 400 }, 'c3_wm_arrived'] } }],   // the dress quest costs 280 gil
    ['goto', 'wall_south'],
    ['expect', 'c3_wm_arrived'],

    // ---- Wall Market: the dress-up quest, every best item
    ['obj', 'Find out where the wagon took Tifa'],
    ['talk', 'cardman', { done: 'c3_card_got' }],                         // Member's Card
    ['goto', 'corneo_gate'],
    ['talk', 'cguard', { done: 'c3_disguise_plan' }],                     // ladies only: a disguise
    ['expect', 'c3_disguise_plan'],
    ['obj', 'Put together a disguise'],
    ['goto', 'wall_dress'],
    ['talk', 'dressclerk', { done: 'c3_dress_asked' }],
    ['goto', 'wall_bar'],
    ['talk', 'dressmaker', { done: 'c3_dressmaker_done', choose: ['soft', 'shimmers'] }],   // Silk Dress
    ['goto', 'wall_diner'],
    ['talk', 'cook', { done: 'c3_coupon_got', choose: ['Korean', 'It was all right'] }],    // honest: the Pharmacy Coupon
    ['goto', 'wall_pharmacy'],
    ['talk', 'pharmclerk', { done: { any: [{ key: 'digestive' }, { item: 'digestive' }, 'c3_cologne_got'] }, choose: 'Digestive' }],
    ['goto', 'wall_bar'],
    ['use', 18, 0, { done: 'c3_cologne_got', choose: 'Digestive' }],     // the ladies' room: Sexy Cologne
    ['goto', 'wall_materia'],
    ['talk', 'matclerk', { done: 'c3_tiara_quest' }],                     // what does the inn's machine sell?
    ['goto', 'wall_inn'],
    ['talk', 'innkeep', { done: 'c3_vend_done', choose: ['Stay', '200 gil'] }],   // a night's stay, the 200-gil box
    ['goto', 'wall_materia'],
    ['talk', 'matclerk', { done: 'c3_tiara_got' }],                       // Diamond Tiara
    ['goto', 'wall_dress'],
    ['talk', 'dressclerk', { done: 'c3_dress_got' }],                     // the Silk Dress; a wig is needed
    ['goto', 'wall_gym'],
    ['minigame', 'squats', { win: true }],
    ['talk', 'bigbro', { done: 'c3_wig_got', choose: 'Bring it on' }],   // win the squats: Blonde Wig
    ['expect', { any: [{ key: 'blonde_wig' }, { item: 'blonde_wig' }] }, { soft: true }],
    ['goto', 'wall_honeybee'],
    ['talk', 'hbrecep', { done: 'c3_hb_room_used', choose: 'Group Room' }],   // Bikini Briefs
    ['walk', 24, 0, { done: 'c3_makeup_done', choose: 'Sure' }],   // the dressing room: make-up
    ['goto', 'wall_dress'],
    ['talk', 'dressclerk', { done: 'c3_dressed', choose: 'Change' }],
    ['expect', 'c3_dressed'],

    // ---- Don Corneo's mansion
    ['obj', "Get into Don Corneo's mansion"],
    ['goto', 'corneo_hall'],
    ['exit', 'corneo_basement', { done: 'c3_tifa_basement' }],             // Tifa; the line-up; the Don's pick
    ['expect', 'c3_tifa_basement'],
    ['expect', (s) => FF7.state.vars.c3_bride > 0],
    ['expect', (s) => FF7.state.vars.c3_bride === 3, { soft: true }],     // Cloud is the bride
    ['item', 'corneo_bedroom_hyper', { done: { any: ['got_corneo_bedroom_hyper', (s) => FF7.state.vars.c3_bride !== 3] } }],
    ['talk', 'donbed', { done: 'c3_corneo_done', choose: ['Well', 'Barret', 'No idea'] }],
    ['expect', 'c3_corneo_done'],
    ['expect', 'c3_fell_sewer'],

    // ---- the sewers: Aps
    ['expectMap', 'sewer_landing'],
    ['obj', 'Get out of the sewers'],
    ['item', 'sewer_landing_potion'],                                     // Potion
    ['autoequip', { done: 'c3_aps_beaten' }],                             // Tifa's Metal Knuckle
    ['loadout', 'tifa', { weapon: ['fire', null], done: 'c3_aps_beaten' }],   // Aps is weak to Fire
    ['loadout', 'aeris', { weapon: ['ice'], done: 'c3_aps_beaten' }],
    ['talk', 'sewtifa', { done: 'c3_aps_beaten' }],                       // wake them: Aps
    ['expect', 'c3_aps_beaten'],
    ['goto', 'sewer_tunnel'],
    ['item', 'sewer_tunnel_steal'],                                       // Steal materia
    ['loadout', 'tifa', { weapon: ['fire'], armor: ['steal'] }],          // Steal on Tifa (the fastest)
    ['exit', 'sewer_outlet', { choose: 'Jump', done: 'c3_tg_talk' }],     // (done once the graveyard is reached: a resume there needn't come back)

    // ---- the Train Graveyard
    ['obj', 'Cross the Train Graveyard to Sector 7'],
    ['goto', 'tg_south'],
    ['walk', 21, 10, { done: 'c3_tg_roof', choose: 'Climb' }],   // over the car by its ladder: a Hi-Potion on the roof
    ['use', 9, 5, { done: 'c3_tg_barrel1', map: 'tg_south' }],            // Hi-Potion (barrel)
    ['use', 2, 2, { done: 'c3_tg_barrel2', map: 'tg_south' }],            // Echo Screen (barrel)
    ['fightUntil', { item: 'ghost_hand' }, { max: 8, done: { item: 'ghost_hand' } }],   // steal a Ghost Hand (only here)
    ['goto', 'tg_car'],                                                   // through the old car to the east side
    ['item', 'tg_car_potion'],                                            // Potion
    ['exit', 1, { map: 'tg_car', done: 'got_tg_south_potion' }],                   // the car's south door
    ['item', 'tg_south_potion'],                                          // Potion
    ['exit', 3, { map: 'tg_south', done: { any: [{ map: 'tg_north' }, { map: 'tg_north2' }, 'c3_pillar_arrive'] } }],   // (its script picks the map)
    ['item', 'tg_north_potion'],                                          // Potion
    ['use', 8, 1, { done: 'c3_tg_barrel3' }],                             // Ether (barrel)
    ['use', 25, 5, { done: 'c3_tg_train1', choose: 'Throw it' }],    // the brown engine backs off east...
    ['use', 11, 5, { done: 'c3_tg_moved', choose: 'Throw it' }],     // ...then the old engine hauls its car out of the gap
    ['expect', 'c3_tg_moved'],
    ['item', 'tg_north_hipotion', { map: 'tg_north2' }],                  // Hi-Potion (past the cars that blocked the west side)

    // ---- the Sector 7 pillar
    ['obj', 'Get up the pillar to Barret'],
    ['goto', 'pillar_base'],                                              // Aeris goes for Marlene
    ['expect', 'c3_pillar_arrive'],
    ['shop', 'pmerchant', { buy: [['potion', 5], ['phoenix_down', 1]], done: 'c3_wedge_talk', lenient: true }],
    ['save'],
    ['ckpt', 'c3_pillar'],
    ['walk', 16, 6, { done: 'c3_wedge_talk' }],                           // Wedge
    ['goto', 'pillar_top'],                                               // Biggs, Jessie; Barret joins at the top
    ['expect', 'c3_barret_joined'],
    ['loadout', 'barret', { weapon: ['lightning', null] }],
    ['heal', { below: 0.9 }],
    ['walk', 12, 7, { done: 'c3_reno_beaten' }],                          // Reno
    ['expect', 'c3_reno_beaten'],
    ['expect', 'c3_plate_fallen'],

    // ---- after the plate: the playground, Aeris' house, Marlene
    ['expectMap', 's6_park_ruin'],
    ['obj', "Find Marlene at Aeris' house"],
    ['item', 's6_park_sense'],                                            // Sense materia
    ['goto', 's5_house'],                                                 // Elmyra's story
    ['expect', 'c3_elmyra_story'],
    ['walk', 15, 3, { done: 'c3_barret_plan' }],                          // upstairs: Barret and Marlene, the plan
    ['expect', 'c3_to_wire'],
    ['talk', 'elmyra', { choose: 'Rest', done: { any: ['c3_wire_start', (s) => FF7.sys.party.active().every(c => c.hp === c.maxHp && c.mp === c.maxMp)] } }],   // a night's rest
    ['goto', 's5_kidhouse'],
    ['walk', 12, 8, { done: { any: ['c3_kid_turbo', 'c3_kid_5gil_taken'] } }],   // the foot of the stairs (the walker cuts across the railing otherwise)
    ['talk', 'wakekid', { done: { any: ['c3_kid_turbo', 'c3_kid_5gil_taken'] } }],   // Turbo Ether (the 5 gil were left alone)

    // ---- back to Wall Market: batteries, gear, the Don's empty mansion, the wire
    ['obj', 'Climb the wire behind the Don\'s mansion'],
    ['goto', 's6_ruins', { done: 'c3_wire_done' }],
    ['exit', 0, { map: 's6_ruins', done: 'c3_wire_done' }],              // to the ruined playground (its script picks the map)
    ['goto', 'wall_weapons'],
    ['talk', 'wpnhelper', { done: (s) => (FF7.state.vars.c3_batteries || 0) >= 3, choose: ['Buy one', 'Buy one', 'Buy one'] }],   // Battery x3
    ['shop', 'wpnowner', { buy: [['metal_knuckle', 1]], done: { any: [{ item: 'metal_knuckle' }, { equipped: ['tifa', 'metal_knuckle'] }, 'c3_wire_done'] }, lenient: true }],   // Tifa
    ['gear', { shop: 'wpnowner', keepGil: 900, done: 'c3_wire_done' }],   // Mythril Armlets / Rod as the gil allows
    ['goto', 'wall_materia'],
    ['shop', 'matclerk', { buy: [['restore', 1]], done: { materia: 'restore', qty: 2 }, lenient: true }],
    ['goto', 'corneo_basement'],
    ['item', 'corneo_basement_ether'],                                    // Ether
    ['goto', 'corneo_lackeys'],
    ['item', 'corneo_lackeys_phoenix'],                                   // Phoenix Down
    ['goto', 'corneo_office', { done: 'got_corneo_bedroom_hyper' }],
    ['exit', 'corneo_bedroom', { done: 'got_corneo_bedroom_hyper' }],
    ['item', 'corneo_bedroom_hyper'],                                     // Hyper (if not taken on the Don's "date")
    ['goto', 'wire_base'],
    ['use', 12, 3, { done: 'c3_socket1', choose: 'Use a Battery' }],     // the propeller bridge
    ['goto', 'wire_upper'],
    ['use', 12, 11, { done: 'c3_socket2', choose: 'Use a Battery' }],    // the barricade bridge
    ['use', 3, 1, { done: 'c3_socket3', choose: 'Use a Battery' }],      // the hatch: Ether
    ['walk', 9, 7, { done: { any: [PAST_BAR, 'c3_wire_done'] }, choose: 'Jump' }],   // the swinging bar
    // C4 opens on the plate with a question: the covert way in (the emergency stairs: an Elixir)
    ['choose', 'covert', { done: 'c3_wire_done' }],
    ['exit', 1, { done: 'c3_wire_done', map: 'wire_upper' }],             // the top: the Shinra Building
    ['expect', 'c3_wire_done'],
    ['ckpt', 'c3_end'],
  ];
})();
