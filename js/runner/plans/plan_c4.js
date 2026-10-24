// Runner plan, Chapter 4: Shinra HQ and the escape from Midgar (docs/RUNNER.md).
// Starts at shinra_plaza / from_wire (C3's end: the "front door or stairs" question already answered: the
// stairs); ends on the world map outside Midgar after the party splits up for Kalm: s.set('left_midgar');
// s.world('midgar'), then Matra Magic is learned from the Custom Sweepers of the Midgar area.
// Route choice: the emergency stairs (the Walkthrough's pick: the Elixir on the fifth flight and no
// random battles); with Keycard 60 the elevator then takes the party down to the lobby for the Turtle's
// Paradise flyer No.2 (one of two chances in the game) and back up.
// Items (the guides' checklist, this game's ids): Elixir (stairs), Keycard 60/62/65/66/68, the Mayor's
// Elemental materia (the password on the first try: the library's four stray files spell it), Coupons
// A/B/C (the three-door puzzle) exchanged for Star Pendant, Four Slots and All, Phoenix Down + Ether
// (64F lockers), Midgar Parts x5, Poison materia (67F), Enemy Skill materia (68F, after Sample:H0512),
// Potion x4 (68F), boss drops: Talisman, Mythril Armlet (Heli Gunner), Protect Vest + Guard Source
// (Rufus / Dark Nation), Star Pendant (Motor Ball). Enemy Skill: Matra Magic (Custom Sweeper, outside).
// Choices: Aeris' date points ("I'm your bodyguard, remember?" +1 Aeris; Tifa's "It won't be easy..."
// leaves Tifa's as they are): this route dates Aeris, FF7's default (Aeris starts at 50, Tifa at 30).
(function () {
  const R = FF7.runner;

  // C3's end state (its c3_end checkpoint), for 'node tools/run_runner.js --start c4'. Aeris exists (her
  // gear, materia) but is away from the group (Shinra has her).
  R.starts.c4 = {
    map: 'shinra_plaza', entry: 'from_wire',
    members: ['cloud', 'barret', 'tifa'], away: ['aeris'], party: ['cloud', 'barret', 'tifa'],
    levels: { cloud: 10, barret: 8, tifa: 8, aeris: 7 }, names: { cloud: 'Cloud', barret: 'Barret', tifa: 'Tifa', aeris: 'Aeris' },
    flags: ['c1_bought_flower', 'c1_train_talk', 'c2_morning', 'c2_tifa_joined', 'c2_car4', 'c2_air_buster_beaten', 'c2_fell',
      'got_s7_hall_all', 'got_s7_hall_ether', 'c3_church_intro', 'c3_back_done', 'c3_landed', 'c3_turtle_flyer1', 'got_s5_garden_ether',
      'got_s5_garden_cover', 'c3_elmyra_met', 'c3_slept', 'c3_snuck_out', 'c3_aeris_rejoined', 'c3_park_scene', 'c3_wm_arrived',
      'c3_card_got', 'c3_disguise_plan', 'c3_dress_asked', 'c3_dressmaker_done', 'c3_coupon_got', 'c3_cologne_got', 'c3_tiara_quest',
      'c3_vend_done', 'c3_tiara_got', 'c3_dress_got', 'c3_wig_quest', 'c3_wig_got', 'c3_hb_room_used', 'c3_makeup_done', 'c3_dressed',
      'c3_tifa_basement', 'c3_corneo_done', 'c3_fell_sewer', 'c3_aps_beaten', 'got_sewer_tunnel_steal', 'c3_tg_moved', 'c3_pillar_arrive',
      'c3_wedge_talk', 'c3_biggs_talk', 'c3_jessie_talk', 'c3_barret_joined', 'c3_reno_beaten', 'c3_plate_fallen', 'c3_grief_done',
      'got_s6_park_sense', 'c3_elmyra_story', 'c3_barret_plan', 'c3_to_wire', 'c3_kid_turbo', 'c3_wire_start', 'c3_socket1',
      'c3_socket2', 'c3_socket3', 'c3_wire_done', 'c4_arrived', 'c4_route_stairs'],
    vars: { c3_bride: 3, c3_batteries: 3, c3_makeup_pts: 3, c3_dress_kind: 3, c3_vend_tier: 3 },
    items: { potion: 17, phoenix_down: 6, ether: 11, tent: 1, grenade: 2, hyper: 1, echo_screen: 1, graviball: 1, ghost_hand: 3, turbo_ether: 1 },
    keyItems: ['members_card', 'sexy_cologne', 'diamond_tiara', 'silk_dress', 'blonde_wig', 'bikini_briefs'],
    gil: 472,
    equip: { cloud: { armor: 'titan_bangle' }, barret: { weapon: 'assault_gun', armor: 'iron_bangle' },
      tifa: { weapon: 'metal_knuckle', armor: 'iron_bangle' }, aeris: { armor: 'iron_bangle' } },
    materia: { cloud: ['restore', 'all', 'lightning', null], barret: ['lightning', null, null], tifa: ['fire', 'steal'], aeris: ['ice', null] },
    stock: ['cover', 'sense'],
  };

  // 62F: the password the four stray library files spell (read on the shelves first, like a player)
  const PASSWORD = (ch) => ch.indexOf(['BEST', 'KING', 'BOMB', 'MAKO'][((FF7.state.vars.c4_pw || 1) - 1) % 4]);
  PASSWORD.toString = () => 'the-password';
  // out of healing: fewer than 3 Potions and someone below half HP (or KO'd)
  const LOW = () => FF7.sys.inv.count('potion') + FF7.sys.inv.count('hi_potion') < 3 && FF7.sys.party.active().some(c => c.hp < c.maxHp * 0.5);
  LOW.toString = () => 'out of Potions';
  const noCoupons = (s) => s.flag('got_c4_coupon_c') && !s.has('coupon_a') && !s.has('coupon_b') && !s.has('coupon_c');

  R.plans.c4 = [
    ['chapter', 'c4', 'Chapter 4: Shinra HQ and the escape from Midgar'],
    ['choose', 'covert', { done: 'c4_arrived' }],                         // (only when this chapter starts at the wire)
    ['expect', 'c3_wire_done'],
    ['battle', { limit: 'use', steal: ['carbon_bangle', 'hardedge', 'atomic_scissors', 'hyper', 'ether'] }],
    ['expect', 'c4_arrived'],
    ['expect', 'c4_route_stairs'],

    // ---- the emergency stairs: 59 floors on foot, the Elixir on the fifth flight
    ['obj', 'Sneak up the emergency stairs'],
    ['goto', 'shinra_back'],
    ['exit', [10, 1], { done: { any: [(s) => (FF7.state.vars.c4_flight || 0) >= 1, 'c4_stairs_done'] } }],
    ['walk', 2, 1, { map: 'shinra_stairs', done: { any: [{ var: 'c4_flight', atLeast: 2 }, 'c4_stairs_done'] } }],
    ['walk', 2, 1, { map: 'shinra_stairs', done: { any: [{ var: 'c4_flight', atLeast: 3 }, 'c4_stairs_done'] } }],
    ['walk', 2, 1, { map: 'shinra_stairs', done: { any: [{ var: 'c4_flight', atLeast: 4 }, 'c4_stairs_done'] } }],
    ['walk', 2, 1, { map: 'shinra_stairs', done: { any: [{ var: 'c4_flight', atLeast: 5 }, 'c4_stairs_done'] } }],
    ['item', 'c4_stairs_elixir'],                                         // Elixir
    ['goto', 'shinra_59f'],                                               // three more flights; the 59F guards: Keycard 60
    ['expect', 'c4_59f_fight'],
    ['expect', { key: 'keycard_60' }],
    ['ckpt', 'c4_59f'],

    // ---- down to the lobby for the Turtle's Paradise flyer, then up to 60F
    ['obj', "Read the lobby's bulletin board"],
    ['exit', [11, 1], { map: 'shinra_59f', choose: '1F', done: 'c4_flyer_turtle2' }],
    ['use', 30, 4, { map: 'shinra_lobby', done: 'c4_flyer_turtle2' }],   // Turtle's Paradise flyer No.2
    ['goto', 'shinra_2f', { done: 'c4_60f_passed' }],
    ['shop', 'clerk', { choose: 'Buy', buy: [['potion', 10]], lenient: true, done: 'c4_60f_passed' }],   // the company store
    ['goto', 'shinra_lobby', { done: 'c4_60f_passed' }],
    ['obj', 'Get past the 60F security floor'],
    ['exit', [13, 1], { map: 'shinra_lobby', choose: '60F', done: { any: [{ map: 'shinra_60f' }, 'c4_60f_passed'] } }],
    ['walk', 7, 5, { map: 'shinra_60f', done: 'c4_60f_passed' }],   // statue to statue (the Shinra HQ 60F minigame: its bot)
    ['expect', 'c4_60f_passed'],

    // ---- 61F: Keycard 62; 62F: the Mayor's password (Keycard 65, Elemental)
    ['goto', 'shinra_61f'],
    ['talk', 'gardener', { done: { key: 'keycard_62' }, choose: 0 }],    // "....." : Keycard 62
    ['goto', 'shinra_62f'],
    ['obj', "Work out the Mayor's password in the library"],
    ['use', 3, 14, { done: 'c4_domino_done' }],                           // the four libraries: one stray file each
    ['use', 27, 14, { done: 'c4_domino_done' }],
    ['use', 3, 3, { done: 'c4_domino_done' }],
    ['use', 27, 3, { done: 'c4_domino_done' }],
    ['talk', 'domino', { done: { key: 'keycard_65' }, choose: PASSWORD }],   // right on the first try: Elemental materia
    ['expect', { key: 'keycard_65' }],

    // ---- 63F: three door releases for the three coupons
    ['obj', 'Open the right doors on 63F'],
    ['goto', 'shinra_63f'],
    ['use', 30, 12, { done: 'c4_63_terminal' }],                          // the terminal: three releases
    ['walk', 26, 2, { done: 'c4_63_d1', choose: 'Release it' }],          // 1: the north corridor
    ['walk', 9, 5, { done: 'c4_63_da', choose: 'Release it' }],           // 2: room A
    ['item', 'c4_coupon_a'],                                              // Coupon A
    ['use', 3, 4, { done: 'got_c4_coupon_b', choose: 'Crawl in' }],      // its air duct drops into room B
    ['item', 'c4_coupon_b'],                                              // Coupon B
    ['walk', 16, 7, { done: 'c4_63_dc', choose: 'Release it' }],          // 3: out of room B, room C from the south hall
    ['item', 'c4_coupon_c'],                                              // Coupon C
    ['use', 27, 4, { done: (s) => noCoupons(s) || (R.where() === 'shinra_63f' && R.field() && R.field().player.tx >= 30), choose: 'Crawl in' }],   // B's duct: the terminal room
    ['use', 30, 12, { done: noCoupons, choose: ['Exchange coupons', 'Exchange', 'Exchange', 'Exchange'] }],   // Star Pendant, Four Slots, All
    ['autoequip', { members: 'all' }],                                    // the Four Slots and the Star Pendant

    // ---- 64F: the lockers, a free nap
    ['goto', 'shinra_64f'],
    ['use', 23, 2, { from: [23, 3], done: 'c4_locker_pd' }],             // Phoenix Down (which locker opens depends on where Cloud stands)
    ['use', 28, 2, { from: [28, 3], done: 'c4_locker_ether' }],          // Ether
    ['save'],

    // ---- 65F: the Midgar model, Keycard 66
    ['obj', 'Complete the Midgar model on 65F'],
    ['goto', 'shinra_65f'],
    ['use', 1, 6, { done: 'c4_box0' }],
    ['use', 16, 4, { done: { var: 'c4_parts_placed', atLeast: 1 }, choose: 0 }],
    ['use', 1, 12, { done: 'c4_box1' }],
    ['use', 16, 4, { done: { var: 'c4_parts_placed', atLeast: 2 }, choose: 0 }],
    ['use', 1, 2, { done: 'c4_box2' }],
    ['use', 16, 4, { done: { var: 'c4_parts_placed', atLeast: 3 }, choose: 0 }],
    ['use', 1, 8, { done: 'c4_box3' }],
    ['use', 16, 4, { done: { var: 'c4_parts_placed', atLeast: 4 }, choose: 0 }],
    ['use', 31, 3, { done: 'c4_box4' }],
    ['use', 16, 4, { done: { var: 'c4_parts_placed', atLeast: 5 }, choose: 0 }],
    ['use', 22, 2, { done: { key: 'keycard_66' } }],                      // Keycard 66
    ['expect', { key: 'keycard_66' }],
    // the party is a few levels short of the fights ahead (Sample:H0512, Rufus alone, Motor Ball): train on
    // 65F and sleep it off in the 64F nap room (free), a few battles at a time
    ['obj', 'Train on 65F (the 64F nap room is free)'],
    ['level', 11, { at: 'shinra_65f', rest: ['shinra_64f', 3, 7], per: 4, max: 48, budget: 400000, done: { any: ['c4_meeting_done', (s, R) => R.avgLevel() >= 11] } }],
    ['ckpt', 'c4_trained'],

    // ---- 66F: the executives' meeting through the restroom vent
    ['goto', 'shinra_66f'],
    ['use', 3, 2, { done: 'c4_meeting_done', choose: ['Flush', 'Climb in'] }],
    ['expect', 'c4_meeting_done'],

    // ---- 67F / 68F: Hojo's lab, Sample:H0512, Red XIII
    ['obj', "Follow Hojo up to his lab"],
    ['goto', 'shinra_67f'],
    ['chest', 'c4_67f_poison'],                                           // Poison materia (Jenova's tank on the way)
    ['save'],
    ['ckpt', 'c4_lab'],
    ['party', ['cloud', 'redxiii', 'tifa'], { select: true, done: 'c4_h0512_done' }],   // for the Sample:H0512 fight
    ['goto', 'shinra_68f'],                                               // Hojo, Aeris, Red XIII, Sample:H0512
    ['expect', 'c4_h0512_done'],
    ['use', 11, 2, { done: 'c4_eskill' }],                                // Enemy Skill materia (the broken tank)
    ['talk', 'coward', { done: { key: 'keycard_68' } }],                  // Keycard 68
    ['items'],                                                            // Potion x4
    ['autoequip', { members: 'all' }],
    ['loadout', 'redxiii', { weapon: [['restore', 'all'], 'fire'], armor: [['lightning', 'elemental']] }],
    ['loadout', 'cloud', { weapon: [['lightning', 'all']], armor: ['enemy_skill', null] }],
    ['loadout', 'tifa', { weapon: ['ice', null], armor: ['steal'] }],
    ['heal', { below: 0.7 }],

    // ---- caught: the President, the cells
    ['goto', 'shinra_67f'],
    ['exit', 'shinra_66f', { done: 'c4_captured' }],                      // the Turks at the elevator
    ['expect', 'c4_captured'],
    ['expect', 'c4_president_talk'],
    ['expectMap', 'shinra_jail'],
    ['obj', 'Get some rest in the cell'],
    ['talk', 'tifa', { done: 'c4_jail_tifa', choose: "It won't be easy" }],
    ['use', 15, 5, { done: 'c4_jail_door', choose: "bodyguard" }],        // Aeris through the wall: +1 Aeris
    ['expect', 'c4_jail_night'],
    ['walk', 16, 6, { done: 'c4_jail_out' }],                             // the door is open; the guard is dead
    ['expect', 'c4_jail_out'],

    // ---- the trail of blood: 67F -> 70F
    ['obj', 'Follow the trail of blood'],
    ['goto', 'shinra_69f'],
    ['save'],
    ['ckpt', 'c4_69f'],
    // the rooftop splits the party: Barret, Red XIII and Aeris in the elevator (Hundred / Heli Gunner, weak to
    // Lightning), Cloud alone against Rufus; then Motor Ball (weak to Lightning) with Cloud, Red XIII and Tifa.
    // Cloud keeps Restore for his duel (Cure heals most of his HP); the elevator trio fights on Lightning
    // and Potions (the AI's items)
    ['loadout', 'cloud', { weapon: [['restore', 'all']], armor: ['enemy_skill', null] }],
    ['loadout', 'barret', { weapon: [['lightning', 'all']] }],
    ['loadout', 'aeris', { weapon: ['lightning'], armor: ['ice'] }],
    ['loadout', 'redxiii', { weapon: [['fire', 'elemental'], 'poison'], armor: [null, null] }],
    ['heal', { members: ['cloud', 'barret', 'redxiii', 'aeris'], below: 0.9, to: 0.9, mp: 0.6, done: 'c4_rufus_arrived' }],   // HP, and Ethers for the casters' MP (the reserve too)
    ['battle', { limit: 'use', last: ['rufus'] }],                        // Rufus: Dark Nation first (its Barriers)
    ['goto', 'shinra_70f'],                                               // the President is dead
    ['expect', 'c4_president_found'],
    ['party', ['cloud', 'tifa', 'redxiii'], { select: true, done: 'c4_bike' }],   // the escape party (after Rufus)
    ['minigame', 'motorcycle', { win: true }],
    ['exit', 'shinra_roof', { map: 'shinra_70f', done: 'c4_rufus_arrived' }],   // Rufus; the elevator fight; Rufus
    ['expect', 'c4_gunner_done'],
    ['expect', 'c4_rufus_beaten'],
    ['battle', { limit: 'use' }],
    ['autoequip', { members: 'all' }],                                    // Protect Vest, Heli Gunner's Mythril Armlet
    ['useItem', 'guard_source', 'cloud'],                                 // Dark Nation's Guard Source (Vitality)
    // Motor Ball (weak to Lightning) next, with Cloud, Red XIII and Tifa: both Lightnings on them, HP and MP topped up
    ['loadout', 'redxiii', { weapon: [['lightning', 'all'], 'fire'], armor: [null, null], done: 'c4_motorball_done' }],
    ['loadout', 'tifa', { weapon: ['lightning', 'ice'], armor: ['steal'], done: 'c4_motorball_done' }],
    ['heal', { members: ['cloud', 'redxiii', 'tifa'], below: 0.9, to: 0.9, mp: 0.6, done: 'c4_motorball_done' }],
    ['obj', 'Get out of the building'],
    ['goto', 'shinra_69f'],
    ['exit', [10, 1], { map: 'shinra_69f', done: 'c4_lobby_reunion' }],   // the elevator down: the lobby, the showroom, the bike
    ['expect', 'c4_bike'],
    ['expect', 'c4_chase_done'],
    ['expect', 'c4_motorball_done'],

    // ---- the end of the highway: leaving Midgar
    ['obj', 'Head for the end of the expressway'],
    ['autoequip', { members: 'all' }],
    ['goto', 'hwy_end'],
    ['party', ['cloud', 'tifa', 'redxiii'], { select: true, done: 'left_midgar' }],   // who walks to Kalm with Cloud
    ['walk', 21, 4, { done: 'left_midgar' }],
    ['expect', 'left_midgar'],
    ['expectMap', 'world'],

    // ---- outside Midgar: Matra Magic from the Custom Sweepers (the E.Skill FAQ's first skill)
    ['obj', 'Learn Matra Magic from the Custom Sweepers'],
    // a Tent on the world map first (Motor Ball leaves the party worn down); Kalm is a short walk, so the
    // hunt stops when the Potions run out (C5a learns it on its way otherwise)
    ['useItem', 'tent', 'cloud', { done: (s) => !FF7.sys.inv.has('tent') || FF7.sys.party.active().every(c => c.hp >= c.maxHp * 0.8) }],
    ['battle', { limit: 'use', learn: ['matra_magic'], steal: ['atomic_scissors'] }],
    ['fightUntil', (s, R) => R.masterKnows('matra_magic'), { max: 12, stopIf: LOW, done: (s, R) => R.masterKnows('matra_magic') }],
    ['battle', { limit: 'use' }],
    ['autoequip', { members: 'all' }],                                    // e.g. a stolen Atomic Scissors for Barret
    ['autoMateria', { members: ['cloud', 'tifa', 'redxiii'], steal: 'tifa', eskill: ['cloud'] }],
    ['ckpt', 'c4_end'],
  ];
})();
