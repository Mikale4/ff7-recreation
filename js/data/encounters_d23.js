// FF7 encounter tables — Disc 2 / Disc 3 segment (Icicle Inn -> end, plus late optional areas).
// Weights are FF7's chances out of 64 (Terence Fergusson's Enemy Mechanics FAQ, section 3.2).
// Enemies are listed front row first. type: 'back' (Back Attack), 'side' (Side Attack), 'pincer' (Ambush).
// Tables without a suffix are unions of the more specific sub-area tables below them.
// Enemies not defined in enemies_d23.js (first met on Disc 1): vlakorados, trickplay, hungry, tonadu,
// attack_squad — see docs/enemies_d23.md.
(function () {
  'use strict';

  // ---- Icicle Area (northern continent world map) ----
  var icicleSnow = [
    { e: ['bandersnatch'], w: 13 },
    { e: ['bandersnatch', 'bandersnatch'], w: 13 },
    { e: ['bandersnatch', 'bandersnatch', 'bandersnatch'], w: 13 },
    { e: ['jumping'], w: 13 },
    { e: ['jumping', 'jumping'], w: 12 },
    { e: ['bandersnatch', 'bandersnatch'], w: 4, type: 'back' },
    { e: ['bandersnatch', 'bandersnatch'], w: 4, type: 'pincer' }
  ];
  var icicleGrass = [   // Disc 1 enemies (Bone Village side of the continent)
    { e: ['vlakorados'], w: 22 },
    { e: ['trickplay'], w: 21 },
    { e: ['trickplay', 'trickplay'], w: 21 },
    { e: ['trickplay', 'trickplay'], w: 4, type: 'back' },
    { e: ['vlakorados'], w: 4, type: 'back' }
  ];

  // ---- Great Glacier ----
  var glacierPass = [
    { e: ['shred', 'shred', 'shred'], w: 16 },
    { e: ['frozen_nail', 'frozen_nail'], w: 15 },
    { e: ['shred', 'shred', 'frozen_nail'], w: 14 },
    { e: ['bandersnatch', 'bandersnatch'], w: 12 },
    { e: ['frozen_nail', 'frozen_nail', 'frozen_nail'], w: 7 },
    { e: ['bandersnatch', 'bandersnatch'], w: 4, type: 'back' },
    { e: ['bandersnatch', 'bandersnatch', 'bandersnatch'], w: 4, type: 'pincer' }
  ];
  var glacierIceCave = [
    { e: ['lessaloploth'], w: 24 },
    { e: ['hungry', 'hungry', 'hungry'], w: 22 },
    { e: ['bandersnatch', 'bandersnatch', 'bandersnatch', 'bandersnatch'], w: 18 },
    { e: ['hungry', 'hungry', 'hungry'], w: 8, type: 'pincer' }
  ];
  var glacierCenter = [
    { e: ['bandersnatch', 'bandersnatch', 'bandersnatch'], w: 15 },
    { e: ['ice_golem'], w: 14 },
    { e: ['bandersnatch', 'bandersnatch'], w: 13 },
    { e: ['snow'], w: 12 },
    { e: ['ice_golem', 'ice_golem'], w: 10 },
    { e: ['bandersnatch', 'bandersnatch'], w: 4, type: 'back' },
    { e: ['bandersnatch', 'bandersnatch', 'snow'], w: 8, type: 'side' },
    { e: ['bandersnatch', 'bandersnatch', 'bandersnatch'], w: 4, type: 'pincer' }
  ];
  var glacierNorthwest = [
    { e: ['magnade'], w: 14 },
    { e: ['lessaloploth', 'lessaloploth'], w: 12 },
    { e: ['bandersnatch', 'bandersnatch', 'bandersnatch', 'bandersnatch'], w: 11 },
    { e: ['snow', 'lessaloploth'], w: 10 },
    { e: ['snow'], w: 9 },
    { e: ['magnade', 'magnade'], w: 8 },
    { e: ['magnade'], w: 4, type: 'back' },
    { e: ['bandersnatch', 'bandersnatch', 'bandersnatch'], w: 4, type: 'pincer' }
  ];
  var glacierSnowfield = [   // "Icicle Area - Snowstorm": the white-out snowfield before Gaea's Cliff
    { e: ['lessaloploth'], w: 22 },
    { e: ['ice_golem', 'ice_golem'], w: 21 },
    { e: ['jumping', 'jumping', 'jumping'], w: 21 },
    { e: ['jumping', 'jumping', 'jumping'], w: 10, type: 'side' }
  ];

  // ---- Gaea's Cliff ----
  var gaeaOutside = [
    { e: ['headbomber', 'headbomber', 'headbomber'], w: 18 },
    { e: ['malboro'], w: 17 },
    { e: ['zolokalter', 'zolokalter'], w: 15 },
    { e: ['headbomber', 'headbomber', 'zolokalter'], w: 14 },
    { e: ['headbomber', 'headbomber'], w: 8, type: 'back' }
  ];
  var gaeaInside = [
    { e: ['stilva'], w: 18 },
    { e: ['headbomber', 'headbomber', 'zolokalter'], w: 17 },
    { e: ['zolokalter', 'zolokalter', 'zolokalter', 'zolokalter'], w: 15 },
    { e: ['evilhead', 'evilhead'], w: 14 },
    { e: ['stilva'], w: 4, type: 'back' },
    { e: ['evilhead', 'evilhead'], w: 4, type: 'pincer' }
  ];
  var gaeaLair = [
    { e: ['evilhead', 'evilhead', 'evilhead'], w: 18 },
    { e: ['cuahl', 'cuahl'], w: 17 },
    { e: ['cuahl', 'headbomber', 'headbomber'], w: 15 },
    { e: ['blue_dragon'], w: 14 },
    { e: ['cuahl', 'cuahl'], w: 8, type: 'back' }
  ];

  // ---- Whirlwind Maze (Northern Crater, Disc 2) ----
  var crater = [
    { e: ['grenade'], w: 24 },
    { e: ['gigas'], w: 22 },
    { e: ['grenade', 'grenade'], w: 18 },
    { e: ['grenade'], w: 8, type: 'side' }
  ];
  var mazeRoad = [
    { e: ['gremlin', 'gremlin', 'gremlin'], w: 18 },
    { e: ['sculpture', 'sculpture'], w: 17 },
    { e: ['ironite'], w: 15 },
    { e: ['gremlin', 'gremlin', 'sculpture'], w: 14 },
    { e: ['gremlin', 'gremlin'], w: 8, type: 'back' }
  ];
  var mazePath = [
    { e: ['wind_wing', 'wind_wing'], w: 15 },
    { e: ['dragon_rider'], w: 14 },
    { e: ['ironite', 'wind_wing', 'wind_wing'], w: 13 },
    { e: ['ironite', 'ironite'], w: 12 },
    { e: ['killbin', 'killbin'], w: 10 },
    { e: ['wind_wing', 'wind_wing'], w: 4, type: 'back' },
    { e: ['wind_wing', 'wind_wing', 'wind_wing'], w: 4, type: 'pincer' }
  ];

  // ---- Junon (Disc 2) and the path to the Underwater Reactor ----
  var junonEscape = [
    { e: ['soldier_2nd'], w: 24 },
    { e: ['roulette_cannon'], w: 22 },
    { e: ['soldier_2nd', 'soldier_2nd'], w: 18 }
  ];
  var junonDock = [
    { e: ['roulette_cannon'], w: 24 },
    { e: ['soldier_2nd', 'soldier_2nd'], w: 22 },
    { e: ['soldier_2nd', 'soldier_2nd', 'roulette_cannon'], w: 18 },
    { e: ['soldier_2nd', 'soldier_2nd'], w: 4, type: 'pincer' }
  ];
  var GS = ['guard_system', 'quick_machine_gun', 'rocket_launcher_gs'];
  var junonPath1 = [
    { e: ['slalom', 'slalom'], w: 24 },
    { e: ['slalom', 'slalom', 'slalom'], w: 22 },
    { e: ['death_machine'], w: 18 },
    { e: ['slalom', 'slalom'], w: 8, type: 'back' },
    { e: ['death_machine'], w: 8, type: 'side' }
  ];
  var junonPath2 = [
    { e: ['death_machine', 'death_machine'], w: 18 },
    { e: GS.slice(), w: 17 },
    { e: ['slalom', 'slalom', 'soldier_2nd'], w: 15 },
    { e: GS.concat(GS), w: 14 },
    { e: ['soldier_2nd', 'soldier_2nd'], w: 2, type: 'back' },
    { e: ['slalom', 'slalom'], w: 2, type: 'back' },
    { e: ['soldier_2nd', 'soldier_2nd', 'soldier_2nd'], w: 4, type: 'pincer' }
  ];
  var underwaterPipe = [
    { e: ['diver_nest'], w: 24 },
    { e: ['ghost_ship'], w: 22 },
    { e: ['corvette', 'corvette'], w: 18 },
    { e: ['corvette', 'corvette'], w: 8, type: 'pincer' }
  ];
  var reactorWalkway = [
    { e: ['senior_grunt', 'gun_carrier'], w: 18 },
    { e: ['hard_attacker', 'hard_attacker'], w: 17 },
    { e: ['hard_attacker', 'senior_grunt', 'senior_grunt'], w: 15 },
    { e: ['guardian'], w: 14 },
    { e: ['gun_carrier', 'senior_grunt'], w: 8, type: 'back' }
  ];
  var reactorChamber = [
    { e: ['guardian'], w: 18 },
    { e: ['guardian', 'guardian'], w: 17 },
    { e: ['senior_grunt', 'gun_carrier'], w: 15 },
    { e: ['hard_attacker', 'hard_attacker'], w: 14 },
    { e: ['guardian'], w: 4, type: 'back' },
    { e: ['gun_carrier', 'senior_grunt'], w: 4, type: 'back' }
  ];

  // ---- Mideel Area (world map) ----
  var mideelGrass = [
    { e: ['hippogriff'], w: 16 },
    { e: ['spiral', 'spiral'], w: 16 },
    { e: ['head_hunter', 'head_hunter', 'head_hunter'], w: 32 }
  ];
  var mideelDirt = [
    { e: ['spiral', 'spiral', 'spiral'], w: 22 },
    { e: ['spiral', 'spiral'], w: 21 },
    { e: ['hippogriff'], w: 21 },
    { e: ['spiral', 'spiral'], w: 8, type: 'back' }
  ];
  var mideelJungle = [
    { e: ['crysales', 'crysales', 'crysales'], w: 22 },
    { e: ['head_hunter', 'head_hunter', 'head_hunter', 'head_hunter'], w: 21 },
    { e: ['head_hunter', 'head_hunter', 'head_hunter'], w: 21 }
  ];

  // ---- Ancient Forest ----
  var forestOutside = [
    { e: ['rilfsak', 'rilfsak', 'rilfsak'], w: 18 },
    { e: ['epiolnis', 'epiolnis'], w: 17 },
    { e: ['diablo', 'diablo'], w: 15 },
    { e: ['diablo', 'rilfsak', 'rilfsak'], w: 14 },
    { e: ['rilfsak', 'rilfsak'], w: 4, type: 'back' },
    { e: ['rilfsak', 'rilfsak', 'rilfsak'], w: 8, type: 'side' },
    { e: ['rilfsak', 'rilfsak', 'rilfsak'], w: 4, type: 'pincer' }
  ];
  var forestCave = [
    { e: ['diablo', 'diablo'], w: 24 },
    { e: ['rilfsak', 'rilfsak', 'epiolnis'], w: 22 },
    { e: ['diablo'], w: 18 },
    { e: ['diablo', 'diablo'], w: 8, type: 'back' }
  ];

  // ---- Sunken Gelnika ----
  var gelnikaNorth = [
    { e: ['unknown'], w: 24 },
    { e: ['unknown_3'], w: 22 },
    { e: ['unknown_2', 'unknown_2'], w: 18 },
    { e: ['unknown'], w: 8, type: 'back' }
  ];
  var gelnikaCorridor = [
    { e: ['poodler', 'poodler'], w: 24 },
    { e: ['poodler', 'bad_rap', 'bad_rap'], w: 22 },
    { e: ['bad_rap', 'bad_rap', 'bad_rap', 'bad_rap'], w: 18 },
    { e: ['bad_rap', 'bad_rap', 'poodler'], w: 8, type: 'pincer' }
  ];
  var gelnikaCargo = [
    { e: ['serpent'], w: 18 },
    { e: ['unknown'], w: 17 },
    { e: ['unknown_3'], w: 15 },
    { e: ['unknown_2', 'unknown_2'], w: 14 }
  ];

  // ---- Midgar raid ----
  var sector8 = [
    { e: ['cromwell', 'cromwell'], w: 7 },
    { e: ['cromwell', 'cromwell', 'cromwell'], w: 7 },
    { e: ['manhole', 'manhole', 'manhole'], w: 23 },
    { e: ['behemoth'], w: 10 },
    { e: ['crazy_saw', 'crazy_saw'], w: 9 },
    { e: ['crazy_saw', 'cromwell'], w: 8 },
    { e: ['cromwell'], w: 2, type: 'back' },
    { e: ['cromwell', 'cromwell'], w: 2, type: 'back' },
    { e: ['cromwell', 'cromwell'], w: 4, type: 'pincer' }
  ];
  var raidTunnel = [
    { e: ['crazy_saw'], w: 18 },
    { e: ['shadow_maker', 'shadow_maker'], w: 17 },
    { e: ['shadow_maker', 'shadow_maker', 'shadow_maker'], w: 15 },
    { e: ['shadow_maker', 'shadow_maker', 'crazy_saw'], w: 14 },
    { e: ['shadow_maker', 'shadow_maker'], w: 4, type: 'back' },
    { e: ['crazy_saw'], w: 4, type: 'back' }
  ];
  var raidStreets = [   // Sister Ray base: always a Grosspanzer (Mobile + Big + 2 Small)
    { e: ['grosspanzer_mobile', 'grosspanzer_big', 'grosspanzer_small', 'grosspanzer_small'], w: 64 }
  ];
  var sisterRay = [
    { e: ['soldier_1st', 'soldier_1st'], w: 15 },
    { e: ['xcannon'], w: 14 },
    { e: ['soldier_1st', 'soldier_1st', 'soldier_1st'], w: 13 },
    { e: ['maximum_kimaira'], w: 12 },
    { e: ['soldier_1st'], w: 10 },
    { e: ['soldier_1st', 'soldier_1st'], w: 4, type: 'back' },
    { e: ['soldier_1st', 'soldier_1st'], w: 4, type: 'pincer' }
  ];

  // ---- Northern Crater (final dungeon) ----
  var ncDescent1 = [
    { e: ['gargoyle'], w: 18 },
    { e: ['dark_dragon'], w: 17 },
    { e: ['parasite', 'parasite'], w: 15 },
    { e: ['gargoyle', 'gargoyle'], w: 14 }
  ];
  var ncDescent2 = [
    { e: ['scissors'], w: 18 },
    { e: ['dark_dragon'], w: 17 },
    { e: ['parasite', 'parasite'], w: 15 },
    { e: ['gargoyle', 'gargoyle'], w: 14 },
    { e: ['parasite', 'parasite'], w: 4, type: 'back' },
    { e: ['scissors'], w: 4, type: 'back' }
  ];
  var ncDescent3 = [
    { e: ['scissors'], w: 15 },
    { e: ['dark_dragon'], w: 14 },
    { e: ['parasite', 'parasite'], w: 13 },
    { e: ['parasite', 'parasite', 'parasite'], w: 12 },
    { e: ['scissors', 'scissors'], w: 10 },
    { e: ['parasite', 'parasite'], w: 4, type: 'back' },
    { e: ['scissors'], w: 4, type: 'back' }
  ];
  var ncDividing = [
    { e: ['scissors', 'scissors'], w: 14 },
    { e: ['dark_dragon'], w: 12 },
    { e: ['parasite', 'parasite'], w: 11 },
    { e: ['scissors'], w: 10 },
    { e: ['parasite', 'parasite', 'parasite'], w: 9 },
    { e: ['master_tonberry'], w: 8 },
    { e: ['parasite', 'parasite'], w: 4, type: 'back' },
    { e: ['scissors'], w: 4, type: 'back' }
  ];
  var ncGraveyard = [
    { e: ['pollensalta'], w: 14 },
    { e: ['death_dealer', 'death_dealer'], w: 12 },
    { e: ['pollensalta', 'parasite', 'parasite'], w: 11 },
    { e: ['parasite', 'parasite', 'parasite'], w: 10 },
    { e: ['malboro'], w: 9 },
    { e: ['dragon_zombie'], w: 8 },
    { e: ['death_dealer'], w: 4, type: 'back' },
    { e: ['death_dealer', 'death_dealer'], w: 4, type: 'pincer' }
  ];
  var ncGrassy = [   // Left Junction / Floating Platforms / Grassy Area
    { e: ['king_behemoth'], w: 18 },
    { e: ['allemagne'], w: 17 },
    { e: ['armored_golem'], w: 15 },
    { e: ['master_tonberry'], w: 14 },
    { e: ['allemagne'], w: 8, type: 'back' }
  ];
  var ncWater = [
    { e: ['christopher', 'gighee'], w: 15 },
    { e: ['magic_pot'], w: 13 },
    { e: ['magic_pot', 'magic_pot'], w: 12 },
    { e: ['allemagne'], w: 11 },
    { e: ['master_tonberry'], w: 9 },
    { e: ['mover', 'mover', 'mover'], w: 4 },
    { e: ['magic_pot', 'magic_pot'], w: 8, type: 'side' },
    { e: ['allemagne', 'allemagne'], w: 8, type: 'pincer' }
  ];
  var ncCore = [   // final descent: 76/256 chance per platform jump; enemy chances out of 256
    { e: ['allemagne'], w: 26 },
    { e: ['iron_man'], w: 128 },
    { e: ['dragon_zombie'], w: 102 }
  ];

  Object.assign(FF7.data.encounters, {
    // world map
    wm_icicle: icicleSnow,
    wm_north: icicleSnow.concat(icicleGrass),
    wm_mideel: mideelGrass.concat(mideelDirt),
    wm_mideel_grass: mideelGrass,
    wm_mideel_dirt: mideelDirt,
    wm_mideel_jungle: mideelJungle,
    wm_mideel_beach: [{ e: ['sea_worm'], w: 64 }],
    wm_goblin_island: [
      { e: ['goblin', 'goblin'], w: 22 },
      { e: ['goblin', 'goblin', 'goblin'], w: 21 },
      { e: ['goblin'], w: 21 },
      { e: ['goblin'], w: 4, type: 'back' },
      { e: ['goblin', 'goblin'], w: 10, type: 'side' },
      { e: ['goblin', 'goblin', 'goblin'], w: 4, type: 'pincer' }
    ],
    wm_cactus_island: [{ e: ['cactuer'], w: 64 }],
    wm_corel_desert_north: [
      { e: ['sea_worm'], w: 20 },
      { e: ['tonadu'], w: 20 },
      { e: ['cactuer'], w: 16 }
    ],
    wm_seafloor: [],   // FF7 has no random battles in the submarine; Emerald Weapon is a visible encounter

    // Great Glacier
    great_glacier: glacierPass.concat(glacierCenter, glacierNorthwest, glacierIceCave),
    glacier_pass: glacierPass,
    glacier_center: glacierCenter,
    glacier_northwest: glacierNorthwest,
    glacier_ice_cave: glacierIceCave,
    glacier_snowfield: glacierSnowfield,

    // Gaea's Cliff
    gaeas_cliff: gaeaOutside.concat(gaeaInside),
    gaeas_cliff_outside: gaeaOutside,
    gaeas_cliff_inside: gaeaInside,
    gaeas_cliff_lair: gaeaLair,
    gaeas_cliff_icicle: [{ e: ['evilhead', 'evilhead', 'evilhead', 'evilhead', 'icicle'], w: 1 }],   // "hanging icicle" event

    // Northern Crater, Disc 2
    crater_d2: crater,
    whirlwind_maze: mazeRoad.concat(mazePath),
    whirlwind_maze_road: mazeRoad,
    whirlwind_maze_path: mazePath,

    // Junon Disc 2 / Huge Materia: underwater reactor
    junon_d2: junonEscape,
    junon_dock: junonDock,
    junon_path: junonPath1.concat(junonPath2),
    junon_path_sub_dock: [{ e: ['soldier_2nd', 'soldier_2nd', 'soldier_2nd'], w: 64 }],
    underwater_pipe: underwaterPipe,
    underwater_reactor: reactorWalkway.concat(reactorChamber),
    underwater_reactor_walkway: reactorWalkway,
    underwater_reactor_chamber: reactorChamber,

    // Huge Materia: Corel train (forced battles, fought IN THIS ORDER on the cart-jumping screen)
    corel_train: [
      { e: ['gas_ducter'], w: 1 },
      { e: ['gas_ducter', 'gas_ducter'], w: 1 },
      { e: ['wolfmeister'], w: 1 },
      { e: ['eagle_gun'], w: 1 }
    ],

    // Ancient Forest
    ancient_forest: forestOutside.concat(forestCave),
    ancient_forest_outside: forestOutside,
    ancient_forest_cave: forestCave,

    // Sunken Gelnika
    gelnika: gelnikaNorth.concat(gelnikaCorridor, gelnikaCargo),
    gelnika_north: gelnikaNorth,
    gelnika_corridor: gelnikaCorridor,
    gelnika_cargo: gelnikaCargo,

    // Midgar raid
    sector8_underground: sector8,
    midgar_raid: raidTunnel.concat([{ e: raidStreets[0].e.slice(), w: 16 }]),
    midgar_raid_tunnel: raidTunnel,
    midgar_raid_streets: raidStreets,
    sister_ray: sisterRay,

    // Northern Crater (final dungeon)
    north_cave_upper: ncDescent1.concat(ncDescent2),
    north_cave_mid: ncDescent3.concat(ncDividing),
    north_cave_lower: ncGraveyard.concat(ncGrassy, ncWater),
    north_cave_graveyard: ncGraveyard,
    north_cave_grassy: ncGrassy,
    north_cave_water: ncWater,
    north_cave_core: ncCore
  });
})();
