// Runner plan, Chapter 1 (docs/RUNNER.md): a new game, the Reactor No.1 bombing mission, the escape,
// Sector 8 (the flower girl) and the train to Sector 7 (handoff: s7_station / from_train).
// Every item of the chapter (the guides' checklist): Potion x2 (the knocked-out guards), Phoenix Down
// (entrance, west room), Potion (the shaft), Restore materia (the core), Assault Gun (Guard Scorpion's
// drop), Potion (Sector 8 streets). The guides list two Potions in Sector 8; this game has one.
(function () {
  FF7.runner.plans.c1 = [
    ['chapter', 'c1', 'Chapter 1: The Reactor No.1 bombing mission'],
    ['new'],                                                        // NEW GAME; the opening movie plays
    ['expectMap', 'md1_platform'],
    ['expect', 'c1_intro_done'],

    // ---- Sector 1 station
    ['obj', 'Search the knocked-out guards'],
    ['talk', 'guard1', { done: { var: 'c1_guard_potions', atLeast: 1 } }],   // Potion
    ['talk', 'guard2', { done: { var: 'c1_guard_potions', atLeast: 2 } }],   // Potion (two in all, as in FF7)
    ['obj', 'Follow Barret to the reactor'],
    ['walk', 4, 5, { done: 'trig_md1_platform_mp_ambush' }],        // two Shinra MPs
    ['expect', 'trig_md1_platform_mp_ambush'],
    ['goto', 'md1_gate'],

    // ---- the reactor gate: naming Cloud, the gate opens
    ['obj', 'Meet the team at the reactor gate'],
    ['name', 'cloud', 'Cloud'],                                     // the default names
    ['walk', 10, 4, { done: 'c1_gate_open' }],
    ['expect', 'c1_gate_open'],
    ['obj', 'Get into Mako Reactor No.1'],
    ['goto', 'md1_entrance'],

    // ---- the entrance: Barret joins, the west room's box, Jessie opens the door
    ['name', 'barret', 'Barret'],
    ['talk', 'barret', { done: 'c1_barret_joined' }],               // Barret joins (back row: his default)
    ['expect', 'c1_barret_joined'],
    ['obj', 'Search the west room'],
    ['chest', 'md1_entrance_box'],                                  // Phoenix Down
    ['obj', 'Have Jessie open the door'],
    ['talk', 'jessie', { done: 'c1_door_open' }],
    ['expect', 'c1_door_open'],

    // ---- down to the core
    ['obj', 'Take the elevator down to the core'],
    ['goto', 'md1_shaft'],                                          // the elevator ride
    ['item', 'md1_shaft_potion'],                                   // Potion
    ['goto', 'md1_core'],
    ['item', 'md1_core_restore'],                                   // Restore materia
    ['materia', 'barret', 'restore'],                               // the Gatling Gun's slot (Cloud's two hold Lightning and Ice)
    ['save'],                                                       // the save point before the boss
    ['ckpt', 'c1_core'],
    ['obj', 'Plant the bomb on the reactor core'],
    ['walk', 5, 2, { done: 'c1_bomb_set', choose: 'Set it' }],      // the bomb, then Guard Scorpion
    ['expect', 'c1_escape'],
    ['equip', 'barret', 'weapon', 'assault_gun'],                   // Guard Scorpion's drop

    // ---- the escape (10 minutes)
    ['obj', 'Get out before the reactor blows'],
    ['goto', 'md1_shaft'],
    ['obj', "Free Jessie's foot from the grating"],
    ['talk', 'jessie_stuck', { done: 'c1_jessie_free' }],
    ['expect', 'c1_jessie_free'],
    ['obj', 'Get out before the reactor blows'],
    ['goto', 'md1_entrance'],
    ['ckpt', 'c1_escaped'],
    // the flower girl after the blast: any answer first, then buy the flower (it can go to Tifa or
    // Marlene in Sector 7; the Walkthrough recommends buying it)
    ['goto', 'md8_plaza', { choose: ["Don't worry about it", "I'll buy one"] }],   // the blast, Sector 8, the flower girl
    ['expect', 'c1_flower_done'],
    ['expect', 'c1_bought_flower', { soft: true }],

    // ---- Sector 8 to the train
    ['obj', 'Head for the Sector 8 station'],
    ['goto', 'md8_street'],
    ['item', 'md8_street_potion'],                                  // Potion
    ['walk', 22, 4, { done: 'trig_md8_street_mps1', choose: 'Fight' }],   // Shinra MPs: fight them (EXP)
    ['expect', 'trig_md8_street_mps1'],
    ['goto', 'md8_overpass'],
    ['obj', 'Jump onto the passing train'],
    ['walk', 14, 3, { done: 'trig_md8_overpass_cornered' }],        // cornered; the jump onto the train
    ['expectMap', 's7_station'],
    ['expect', 'c1_train_talk'],
    ['ckpt', 'c1_end'],
  ];
})();
