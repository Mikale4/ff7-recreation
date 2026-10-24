// Encounter tables — Disc 1, part A (opening bombing mission until the cargo ship leaves Junon).
// Source: Terence Fergusson's Enemy Mechanics FAQ v1.11 (section 3.2) and DynamixDJ's Enemy
// Encounter FAQ. Weights reproduce FF7's real odds: "special" formations (back attack / side
// attack / pincer) take their x/64 share first, normal battles share the rest.
// See docs/enemies_d1a.md for which map/area uses which table.
//
// Optional per-formation fields (safe to ignore):
//   rows:   FF7 row (1 = front) of each enemy in `e`; an enemy only leaves the back row once every
//           enemy in the rows before it is gone.
//   groups: for type 'pincer', which side (1 or 2) each enemy in `e` stands on (default: the first half
//           on side 1).
//   type:   'back' (Back Attack), 'side' (Side Attack), 'pincer' (Ambush), 'preempt'; layouts, facings and
//           their rules in js/battle/battle.js (formations section).
//   forced: FF7 forced formation, member ids by formation slot (Air Buster: ['barret', 'cloud', 'tifa']).
//   hidden: 'preempt' (the enemies' backs are turned, shown facing the party) or 'ambush' (the party's
//           backs, ambush time bars, no message): FF7's unannounced formations (Pagoda duels, Ruby WEAPON).
//   run:    FF7 run difficulty when above 1 (harder to escape).
//   noEscape: true for scripted fights that cannot be escaped.
// Tables whose ids start with `boss_` / `event_` are scripted fights (start them from the field
// script, not as random encounters).

Object.assign(FF7.data.encounters, {

  // ===========================================================================================
  // No. 1 Reactor (bombing mission)
  // ===========================================================================================
  // Sector 1 station / bridge outside the reactor (encounter value 128).
  reactor1_outside: [
    { e: ['mp', 'mp'], w: 168 },
    { e: ['guard_hound'], w: 154 },
    { e: ['mp', 'guard_hound'], w: 126 },
    { e: ['guard_hound'], w: 64, type: 'back', run: 2 },
  ],
  // Walkway connecting the plate to the reactor (48).
  reactor1_walkway: [
    { e: ['mono_drive', 'mono_drive'], w: 18 },
    { e: ['mp', 'mp', 'mono_drive'], w: 17, rows: [1, 1, 2] },
    { e: ['mp', 'mp'], w: 29 },
  ],
  // Reactor entrance / lobby (48).
  reactor1_entrance: [
    { e: ['grunt', 'grunt'], w: 18 },
    { e: ['1st_ray', 'grunt', '1st_ray'], w: 17, rows: [1, 1, 2] },
    { e: ['1st_ray', '1st_ray', '1st_ray'], w: 15 },
    { e: ['grunt', 'grunt', 'grunt'], w: 14, rows: [1, 2, 2] },
  ],
  // Main staircase down into the reactor (128) - the general Reactor 1 table.
  reactor1: [
    { e: ['mono_drive', 'mono_drive', '1st_ray'], w: 98, rows: [1, 1, 2] },
    { e: ['1st_ray', '1st_ray'], w: 84 },
    { e: ['grunt', 'grunt'], w: 77 },
    { e: ['1st_ray', 'grunt', '1st_ray'], w: 70, rows: [1, 1, 2] },
    { e: ['1st_ray', '1st_ray', '1st_ray'], w: 63 },
    { e: ['grunt', 'grunt', 'grunt'], w: 56, rows: [1, 2, 2] },
    { e: ['mono_drive', 'mono_drive'], w: 32, type: 'back', run: 2 },
    { e: ['grunt', 'grunt', 'grunt'], w: 32, type: 'back', run: 2, rows: [1, 2, 2] },
  ],
  // Upper piping (72).
  reactor1_upper_pipes: [
    { e: ['grunt', 'grunt', 'mono_drive', 'mono_drive'], w: 168, rows: [1, 1, 2, 2] },
    { e: ['grunt', 'grunt', 'mono_drive', 'mono_drive', 'mono_drive'], w: 154, rows: [1, 1, 2, 2, 2] },
    { e: ['grunt', 'grunt', 'grunt'], w: 126, rows: [1, 1, 2] },
    { e: ['grunt', 'grunt', 'mono_drive'], w: 64, type: 'back', run: 2, rows: [1, 1, 2] },
  ],
  // Lower piping near the core (72).
  reactor1_lower_pipes: [
    { e: ['sweeper'], w: 168 },
    { e: ['sweeper', 'grunt', 'grunt'], w: 154, rows: [1, 2, 2] },
    { e: ['grunt', 'grunt', 'sweeper'], w: 126, rows: [1, 1, 2] },
    { e: ['grunt', 'grunt'], w: 64, type: 'back', run: 2 },
  ],

  // ===========================================================================================
  // Sector 8 escape (scripted: the MPs chasing Cloud through the back alleys, in this order)
  // ===========================================================================================
  sector8: [
    { e: ['mp', 'mp'], w: 1, noEscape: true },
    { e: ['mp', 'mp', 'mp'], w: 1, noEscape: true, rows: [1, 1, 2] },
    { e: ['mp', 'mp', 'mp'], w: 1, noEscape: true, type: 'pincer', groups: [1, 1, 2] },
  ],

  // ===========================================================================================
  // Sector 7 slums surroundings: station yard / Train Graveyard before Aps (192 / 128)
  // ===========================================================================================
  sector7_station: [
    { e: ['mono_drive', 'mono_drive', 'mono_drive'], w: 18 },
    { e: ['guard_hound', 'guard_hound'], w: 17 },
    { e: ['mono_drive', 'mono_drive', 'mono_drive'], w: 15, rows: [1, 1, 2] },
    { e: ['sweeper'], w: 14 },
  ],

  // ===========================================================================================
  // Sector 4: train tunnel and the lower plate
  // ===========================================================================================
  // Sector 4 train tunnel (72).
  train_tunnel: [
    { e: ['rocket_launcher', 'rocket_launcher', 'rocket_launcher', 'rocket_launcher'], w: 168, run: 2, rows: [1, 1, 2, 2] },
    { e: ['grashtrike', 'grashtrike', 'grashtrike'], w: 154, run: 2, rows: [1, 1, 2] },
    { e: ['grashtrike', 'grashtrike', 'grashtrike', 'grashtrike'], w: 126, run: 2, rows: [1, 1, 2, 2] },
    { e: ['grashtrike', 'grashtrike', 'grashtrike', 'grashtrike'], w: 64, type: 'back', run: 3 },
  ],
  // Lower Sector 4 plate - corridors (72).
  sector4_plate: [
    { e: ['grashtrike', 'grashtrike', 'chuse_tank', 'chuse_tank'], w: 168, rows: [1, 1, 2, 2] },
    { e: ['chuse_tank', 'chuse_tank', 'chuse_tank'], w: 154, rows: [1, 2, 2] },
    { e: ['chuse_tank', 'chuse_tank', 'chuse_tank', 'grashtrike', 'grashtrike'], w: 126, rows: [1, 1, 1, 2, 2] },
    { e: ['grashtrike', 'grashtrike', 'grashtrike', 'grashtrike'], w: 64, type: 'pincer', groups: [1, 1, 2, 2] },
  ],
  // Lower Sector 4 plate - lattice walkways (72).
  sector4_walkways: [
    { e: ['rocket_launcher', 'rocket_launcher', 'rocket_launcher'], w: 168, rows: [1, 2, 2] },
    { e: ['rocket_launcher', 'rocket_launcher', 'blugu', 'blugu'], w: 154, rows: [1, 1, 2, 2] },
    { e: ['rocket_launcher', 'blugu', 'blugu'], w: 126, rows: [1, 2, 2] },
    { e: ['chuse_tank', 'blugu', 'blugu', 'blugu'], w: 64, type: 'back', run: 2, rows: [1, 2, 2, 2] },
  ],

  // ===========================================================================================
  // No. 5 Reactor
  // ===========================================================================================
  // Main staircase and upper piping (128 / 72) - the general Reactor 5 table.
  reactor5: [
    { e: ['special_combatant', 'smogger', 'smogger'], w: 18, rows: [1, 2, 2] },
    { e: ['smogger', 'smogger', 'proto_machinegun'], w: 17, rows: [1, 1, 2] },
    { e: ['special_combatant', 'special_combatant', 'special_combatant', 'special_combatant'], w: 15, rows: [1, 1, 2, 2] },
    { e: ['smogger', 'smogger'], w: 14 },
  ],
  // Lower piping and the reactor valve (72).
  reactor5_pipes: [
    { e: ['proto_machinegun', 'proto_machinegun', 'proto_machinegun', 'proto_machinegun', 'proto_machinegun'], w: 168, rows: [1, 1, 2, 2, 2] },
    { e: ['smogger', 'smogger', 'blood_taste'], w: 154, rows: [1, 1, 2] },
    { e: ['smogger', 'blood_taste', 'blood_taste'], w: 126 },
    { e: ['blood_taste', 'blood_taste', 'blood_taste'], w: 64, type: 'back', run: 2, rows: [1, 1, 2] },
  ],
  // Reactor 5 entrance area (72).
  reactor5_entrance: [
    { e: ['special_combatant', 'special_combatant', 'special_combatant'], w: 105, rows: [1, 1, 2] },
    { e: ['proto_machinegun', 'proto_machinegun', 'proto_machinegun'], w: 98, rows: [1, 1, 2] },
    { e: ['proto_machinegun', 'proto_machinegun', 'special_combatant', 'special_combatant'], w: 91, rows: [1, 1, 3, 3] },
    { e: ['blood_taste', 'blood_taste', 'special_combatant', 'special_combatant'], w: 84, rows: [1, 1, 2, 2] },
    { e: ['blood_taste', 'blood_taste', 'blood_taste', 'blood_taste'], w: 70, rows: [1, 1, 2, 2] },
    { e: ['special_combatant', 'special_combatant', 'proto_machinegun'], w: 16, type: 'back', run: 2, rows: [1, 1, 2] },
    { e: ['blood_taste', 'blood_taste', 'blood_taste'], w: 16, type: 'back', run: 2 },
    { e: ['blood_taste', 'blood_taste', 'blood_taste'], w: 32, type: 'pincer', groups: [1, 2, 2] },
  ],

  // ===========================================================================================
  // Sector 5: church and slums
  // ===========================================================================================
  // Back of the church / church rafters (128). FF7 plays "Hurry!" in these fights once Cloud and
  // Aeris are split up.
  church: [
    { e: ['hedgehog_pie', 'hedgehog_pie', 'hedgehog_pie'], w: 584, rows: [1, 2, 2] },
    { e: ['hedgehog_pie', 'hedgehog_pie'], w: 229 },
    { e: ['hedgehog_pie', 'hedgehog_pie'], w: 94, type: 'back', run: 2 },
    { e: ['hedgehog_pie', 'hedgehog_pie', 'hedgehog_pie'], w: 94, type: 'pincer', groups: [1, 2, 2] },
  ],
  // Sector 5 slums: save point screen (from the church) and the "Y" split (128).
  sector5_slums: [
    { e: ['whole_eater', 'whole_eater'], w: 328, rows: [1, 2] },
    { e: ['whole_eater', 'hedgehog_pie', 'hedgehog_pie'], w: 301, rows: [1, 1, 2] },
    { e: ['vice', 'vice'], w: 246 },
    { e: ['vice'], w: 125, type: 'back', run: 2 },
  ],

  // ===========================================================================================
  // Sector 6 ruins / road to Wall Market
  // ===========================================================================================
  sector6: [
    { e: ['hell_house'], w: 492 },
    { e: ['whole_eater', 'whole_eater', 'whole_eater', 'whole_eater'], w: 258, rows: [1, 1, 2, 2] },
    { e: ['hell_house'], w: 125, type: 'side' },
    { e: ['whole_eater', 'whole_eater', 'whole_eater'], w: 125, type: 'pincer', groups: [1, 1, 2] },
  ],
  // Same field data as sector6 (FF7 uses one table for the destroyed road leading to Wall Market).
  wallmarket_outskirts: [
    { e: ['hell_house'], w: 492 },
    { e: ['whole_eater', 'whole_eater', 'whole_eater', 'whole_eater'], w: 258, rows: [1, 1, 2, 2] },
    { e: ['hell_house'], w: 125, type: 'side' },
    { e: ['whole_eater', 'whole_eater', 'whole_eater'], w: 125, type: 'pincer', groups: [1, 1, 2] },
  ],

  // ===========================================================================================
  // Sewers and Train Graveyard (after Aps)
  // ===========================================================================================
  sewer: [
    { e: ['ceasar', 'ceasar', 'ceasar'], w: 18, rows: [1, 2, 2] },
    { e: ['sahagin', 'sahagin', 'ceasar'], w: 17, rows: [1, 1, 2] },
    { e: ['sahagin', 'sahagin'], w: 15, rows: [1, 2] },
    { e: ['sahagin', 'sahagin', 'sahagin'], w: 14, rows: [1, 1, 2] },
  ],
  // Train Graveyard, northern half (128) - the general Train Graveyard table (has Eligor).
  train_graveyard: [
    { e: ['eligor'], w: 15 },
    { e: ['deenglow', 'deenglow', 'deenglow'], w: 14, rows: [1, 1, 2] },
    { e: ['deenglow', 'deenglow'], w: 13 },
    { e: ['ghost', 'ghost', 'ghost'], w: 12, rows: [1, 2, 2] },
    { e: ['ghost', 'deenglow', 'ghost'], w: 10, rows: [1, 1, 2] },
  ],
  // Train Graveyard, southern half (192).
  train_graveyard_south: [
    { e: ['cripshay', 'cripshay', 'deenglow'], w: 15 },
    { e: ['deenglow', 'deenglow'], w: 27 },
    { e: ['ghost', 'ghost', 'ghost'], w: 12, rows: [1, 2, 2] },
    { e: ['ghost', 'deenglow', 'ghost'], w: 10, rows: [1, 1, 2] },
  ],

  // ===========================================================================================
  // Sector 7 support pillar
  // ===========================================================================================
  // Lower half of the pillar stairs (72).
  sector7_pillar: [
    { e: ['aero_combatant', 'aero_combatant'], w: 322, rows: [1, 2] },
    { e: ['aero_combatant'], w: 126 },
    { e: ['aero_combatant', 'aero_combatant'], w: 64, type: 'back', run: 2 },
  ],
  // Upper half of the pillar stairs (72).
  sector7_pillar_upper: [
    { e: ['aero_combatant', 'aero_combatant'], w: 299, rows: [1, 2] },
    { e: ['aero_combatant'], w: 117 },
    { e: ['aero_combatant', 'aero_combatant'], w: 48, type: 'back', run: 2 },
    { e: ['aero_combatant', 'aero_combatant'], w: 48, type: 'pincer', groups: [1, 2] },
  ],

  // ===========================================================================================
  // Shinra HQ
  // ===========================================================================================
  // FF7 has no random battles in the stairwell itself (set the encounter rate to 0 there). This
  // table covers the front-assault route (lobby and floors 1-3, where the stairs start; average
  // of shinra_1f/2f/3f). FF7: "Can't Escape" and the Bombing Mission theme until floor 60.
  shinra_stairs: [
    { e: ['grenade_combatant', 'grenade_combatant'], w: 398, noEscape: true },
    { e: ['grenade_combatant', 'grenade_combatant', 'grenade_combatant'], w: 315, noEscape: true, rows: [1, 1, 2] },
    { e: ['mighty_grunt'], w: 203, noEscape: true },
    { e: ['grenade_combatant', 'grenade_combatant'], w: 83, noEscape: true, type: 'pincer', groups: [1, 2] },
  ],
  // Plaza in front of the main doors (192).
  shinra_entrance: [
    { e: ['grenade_combatant', 'grenade_combatant'], w: 656 },
    { e: ['grenade_combatant', 'grenade_combatant', 'grenade_combatant'], w: 344, rows: [1, 1, 2] },
  ],
  // Ground floor lobby (192).
  shinra_1f: [
    { e: ['grenade_combatant', 'grenade_combatant'], w: 574, noEscape: true },
    { e: ['grenade_combatant', 'grenade_combatant', 'grenade_combatant'], w: 301, noEscape: true, rows: [1, 1, 2] },
    { e: ['grenade_combatant', 'grenade_combatant'], w: 125, noEscape: true, type: 'pincer', groups: [1, 2] },
  ],
  // 2nd floor (192).
  shinra_2f: [
    { e: ['grenade_combatant', 'grenade_combatant'], w: 375, noEscape: true },
    { e: ['grenade_combatant', 'grenade_combatant', 'grenade_combatant'], w: 344, noEscape: true, rows: [1, 1, 2] },
    { e: ['mighty_grunt'], w: 281, noEscape: true },
  ],
  // 3rd floor (192).
  shinra_3f: [
    { e: ['mighty_grunt'], w: 328, noEscape: true },
    { e: ['grenade_combatant', 'grenade_combatant', 'grenade_combatant'], w: 301, noEscape: true, rows: [1, 1, 2] },
    { e: ['grenade_combatant', 'grenade_combatant'], w: 246, noEscape: true },
    { e: ['grenade_combatant', 'grenade_combatant'], w: 125, noEscape: true, type: 'pincer', groups: [1, 2] },
  ],
  // Central elevator ride, stops between floors 13 and 28 (each stop = one battle, weighted by
  // how many floors hold that formation: GC x2 on 13/17/23/26, GC x3 on 14/18/21/27,
  // Mighty Grunt on 15/19/25/28, 2 Mighty Grunts on 16/20/22/24).
  shinra_elevator_low: [
    { e: ['grenade_combatant', 'grenade_combatant'], w: 4, noEscape: true },
    { e: ['grenade_combatant', 'grenade_combatant', 'grenade_combatant'], w: 4, noEscape: true, rows: [1, 1, 2] },
    { e: ['mighty_grunt'], w: 4, noEscape: true },
    { e: ['mighty_grunt', 'mighty_grunt'], w: 4, noEscape: true },
  ],
  // Elevator stops between floors 30 and 58 (Hammer Blaster on 30/34/39/44/50/53/57, Sword Dance
  // on 31/35/42/43/49/51, 2 Sword Dances on 32/36/40/46/54/55, Moth Slasher on
  // 33/37/41/45/48/52/58; floors 29/38/47/56 are the harmless employee "Hito").
  shinra_elevator_high: [
    { e: ['hammer_blaster'], w: 7, noEscape: true, rows: [2] },
    { e: ['sword_dance'], w: 6, noEscape: true },
    { e: ['sword_dance', 'sword_dance'], w: 6, noEscape: true },
    { e: ['moth_slasher'], w: 7, noEscape: true },
  ],
  // 59th floor, where the stairs and the elevator arrive (192).
  shinra_59f: [
    { e: ['mighty_grunt'], w: 375, noEscape: true },
    { e: ['mighty_grunt', 'mighty_grunt'], w: 344, noEscape: true },
    { e: ['mighty_grunt', 'mighty_grunt', 'mighty_grunt'], w: 281, noEscape: true, rows: [1, 1, 2] },
  ],
  // 63rd floor (192).
  shinra_63f: [
    { e: ['hammer_blaster'], w: 18, rows: [2] },
    { e: ['sword_dance'], w: 17 },
    { e: ['hammer_blaster', 'hammer_blaster'], w: 15, rows: [1, 2] },
    { e: ['sword_dance', 'sword_dance'], w: 14 },
  ],
  // The "60s floors" (floors 61-66; FF7 data of the 65th floor, 240).
  shinra_hq: [
    { e: ['hammer_blaster'], w: 205, rows: [2] },
    { e: ['sword_dance'], w: 191 },
    { e: ['hammer_blaster', 'hammer_blaster'], w: 178, rows: [1, 2] },
    { e: ['sword_dance', 'sword_dance'], w: 164 },
    { e: ['sword_dance', 'sword_dance', 'sword_dance'], w: 137 },
    { e: ['hammer_blaster', 'hammer_blaster'], w: 125, type: 'pincer', groups: [1, 2] },
  ],
  // Hojo's lab, 67th floor (before the capture) (192).
  shinra_lab: [
    { e: ['warning_board', 'machine_gun', 'laser_cannon'], w: 246 },
    { e: ['moth_slasher'], w: 232 },
    { e: ['soldier_3rd', 'soldier_3rd'], w: 205, rows: [1, 2] },
    { e: ['moth_slasher', 'moth_slasher'], w: 191, rows: [1, 2] },
    { e: ['moth_slasher'], w: 125, type: 'back', run: 2 },
  ],
  // Hojo's lab, 68th floor upper laboratories (before the capture) (192).
  shinra_lab_68f: [
    { e: ['warning_board', 'machine_gun', 'laser_cannon', 'warning_board', 'machine_gun', 'laser_cannon'], w: 246, rows: [1, 1, 1, 2, 2, 2] },
    { e: ['soldier_3rd', 'soldier_3rd', 'soldier_3rd'], w: 232, rows: [1, 1, 2] },
    { e: ['moth_slasher', 'moth_slasher', 'moth_slasher'], w: 205, rows: [1, 2, 3] },
    { e: ['moth_slasher', 'soldier_3rd', 'soldier_3rd'], w: 191, rows: [1, 2, 2] },
    { e: ['soldier_3rd', 'soldier_3rd'], w: 125, type: 'back', run: 2 },
  ],
  // Escape: 67th floor after breaking out of the cells (192).
  shinra_escape: [
    { e: ['brain_pod', 'brain_pod'], w: 168, rows: [1, 2] },
    { e: ['brain_pod'], w: 154 },
    { e: ['vargid_police', 'vargid_police', 'vargid_police'], w: 126 },
    { e: ['brain_pod', 'vargid_police', 'vargid_police'], w: 64, type: 'back', run: 2 },
  ],
  // Escape: 68th floor (128).
  shinra_escape_68f: [
    { e: ['zenene', 'zenene'], w: 24, rows: [1, 2] },
    { e: ['vargid_police', 'zenene'], w: 22, rows: [1, 2] },
    { e: ['brain_pod', 'brain_pod', 'zenene'], w: 18, rows: [1, 1, 2] },
  ],
  // Escape: 69th floor (192).
  shinra_escape_69f: [
    { e: ['zenene'], w: 126 },
    { e: ['vargid_police', 'vargid_police'], w: 119 },
    { e: ['vargid_police', 'zenene'], w: 105, rows: [1, 2] },
    { e: ['brain_pod', 'brain_pod', 'zenene'], w: 98, rows: [1, 1, 2] },
    { e: ['zenene', 'zenene'], w: 32, type: 'back', run: 2 },
    { e: ['vargid_police', 'vargid_police', 'vargid_police'], w: 32, type: 'pincer', groups: [1, 1, 2] },
  ],

  // ===========================================================================================
  // Midgar expressway: no random battles in FF7 - only the scripted Motor Ball back attack.
  // ===========================================================================================
  highway: [
    { e: ['motor_ball'], w: 1, type: 'back', noEscape: true },
  ],

  // ===========================================================================================
  // World map - Midgar Area
  // ===========================================================================================
  // Wasteland ("dirt") around Midgar (encounter value 20).
  wm_midgar: [
    { e: ['devil_ride'], w: 188 },
    { e: ['custom_sweeper', 'custom_sweeper'], w: 188, rows: [1, 2] },
    { e: ['kalm_fang', 'kalm_fang', 'devil_ride'], w: 188, rows: [1, 1, 2] },
    { e: ['kalm_fang', 'prowler', 'prowler'], w: 188, rows: [1, 1, 2] },
    { e: ['devil_ride', 'devil_ride'], w: 117, type: 'back', run: 2 },
    { e: ['custom_sweeper', 'custom_sweeper'], w: 129, type: 'side' },
  ],
  // Grasslands around Kalm ("grass", 32).
  wm_kalm: [
    { e: ['kalm_fang', 'kalm_fang', 'kalm_fang'], w: 222, rows: [1, 2, 3] },
    { e: ['kalm_fang', 'kalm_fang', 'prowler'], w: 222 },
    { e: ['devil_ride', 'devil_ride'], w: 222 },
    { e: ['kalm_fang', 'kalm_fang', 'kalm_fang'], w: 222, rows: [1, 2, 2] },
    { e: ['kalm_fang', 'prowler', 'prowler'], w: 59, type: 'back', run: 2, rows: [1, 1, 2] },
    { e: ['prowler', 'kalm_fang', 'kalm_fang'], w: 55, type: 'pincer', groups: [1, 2, 2] },
  ],
  // Midgar Area beaches (64).
  wm_midgar_beach: [
    { e: ['kalm_fang', 'kalm_fang', 'kalm_fang'], w: 304, rows: [1, 1, 2] },
    { e: ['kalm_fang', 'kalm_fang'], w: 290 },
    { e: ['kalm_fang', 'prowler', 'kalm_fang'], w: 290, rows: [1, 2, 2] },
    { e: ['prowler', 'prowler', 'kalm_fang'], w: 117, type: 'pincer', groups: [1, 1, 2] },
  ],

  // ===========================================================================================
  // World map - Grasslands Area (Chocobo Farm) and the marsh
  // ===========================================================================================
  // Grassland around the Chocobo Farm (32). FF7 bug: two back attacks sit in the normal slots,
  // so back attacks are unusually common here.
  wm_chocobo_farm: [
    { e: ['levrikon', 'mu', 'mu'], w: 180, rows: [1, 2, 2] },
    { e: ['levrikon', 'levrikon', 'levrikon'], w: 180, rows: [1, 2, 2] },
    { e: ['elfadunk', 'elfadunk'], w: 29, rows: [1, 2] },
    { e: ['levrikon', 'elfadunk', 'elfadunk'], w: 29, rows: [1, 2, 2] },
    { e: ['mandragora', 'mandragora', 'mandragora', 'mandragora'], w: 166 },
    { e: ['levrikon', 'mandragora', 'mandragora', 'elfadunk'], w: 55, rows: [1, 1, 1, 2] },
    { e: ['levrikon', 'levrikon'], w: 180, type: 'back', run: 2 },
    { e: ['levrikon', 'levrikon', 'levrikon'], w: 180, type: 'back', run: 2 },
  ],
  // Grasslands Area beaches (64).
  wm_grasslands_beach: [
    { e: ['levrikon'], w: 25 },
    { e: ['levrikon', 'levrikon'], w: 25, rows: [1, 2] },
    { e: ['elfadunk'], w: 25 },
    { e: ['elfadunk', 'elfadunk'], w: 25 },
  ],
  // The marsh south of the Chocobo Farm. In FF7 the Zolom is visible on the map and attacks when it
  // catches you on foot (run difficulty 3).
  wm_marsh: [
    { e: ['midgar_zolom'], w: 1, run: 3 },
  ],
  // Chocobo Lure battles on the Grasslands chocobo tracks.
  chocobo_grasslands: [
    { e: ['chocobo', 'mandragora', 'mandragora'], w: 25, rows: [1, 2, 2] },
    { e: ['mandragora', 'chocobo', 'levrikon'], w: 25, rows: [1, 1, 2] },
    { e: ['chocobo_b', 'levrikon', 'levrikon'], w: 25, rows: [1, 2, 3] },
    { e: ['elfadunk', 'chocobo_b', 'elfadunk'], w: 25, rows: [1, 2, 3] },
  ],

  // ===========================================================================================
  // Mythril Mine
  // ===========================================================================================
  // Swamp-side and Fort Condor-side caverns (48).
  mythril_mine: [
    { e: ['madouge', 'madouge'], w: 168 },
    { e: ['madouge', 'crawler', 'crawler', 'madouge', 'crawler'], w: 154, rows: [1, 1, 1, 2, 2] },
    { e: ['castanets', 'castanets', 'castanets'], w: 126, rows: [1, 1, 2] },
    { e: ['crawler', 'crawler', 'crawler', 'crawler'], w: 64, type: 'back', run: 2, rows: [1, 1, 2, 2] },
  ],
  // Eastern tunnel (to the Turks cut-scene exit) (40).
  mythril_mine_east: [
    { e: ['crawler', 'crawler', 'crawler', 'ark_dragon'], w: 168, run: 2, rows: [1, 1, 1, 2] },
    { e: ['castanets', 'castanets', 'castanets', 'castanets'], w: 154, run: 2, rows: [1, 1, 2, 2] },
    { e: ['castanets', 'castanets', 'ark_dragon', 'crawler'], w: 126, run: 2, rows: [1, 1, 2, 2] },
    { e: ['ark_dragon', 'ark_dragon'], w: 64, type: 'pincer', run: 3, groups: [1, 2] },
  ],
  // Northern tunnel (40).
  mythril_mine_north: [
    { e: ['crawler', 'crawler', 'crawler', 'ark_dragon'], w: 18, run: 2, rows: [1, 1, 1, 2] },
    { e: ['castanets', 'castanets', 'castanets', 'castanets'], w: 17, run: 2, rows: [1, 1, 2, 2] },
    { e: ['castanets', 'castanets', 'ark_dragon', 'crawler'], w: 15, run: 2, rows: [1, 1, 2, 2] },
    { e: ['crawler', 'crawler', 'crawler', 'crawler', 'crawler'], w: 14, run: 2 },
  ],

  // ===========================================================================================
  // World map - Junon Area (incl. Fort Condor region)
  // ===========================================================================================
  // Grassland between the Mythril Mine, Fort Condor and Junon (32).
  wm_junon: [
    { e: ['nerosuferoth', 'nerosuferoth'], w: 221 },
    { e: ['nerosuferoth', 'nerosuferoth', 'formula'], w: 221, rows: [1, 1, 2] },
    { e: ['zemzelett'], w: 221 },
    { e: ['zemzelett', 'nerosuferoth', 'nerosuferoth'], w: 221 },
    { e: ['nerosuferoth', 'nerosuferoth'], w: 59, type: 'back', run: 2, rows: [2, 2] },
    { e: ['nerosuferoth', 'nerosuferoth', 'nerosuferoth'], w: 59, type: 'back', run: 2, rows: [1, 2, 2] },
  ],
  // Rocky/dirt terrain around Fort Condor and the road to Junon (20).
  wm_condor: [
    { e: ['hell_rider_vr2'], w: 304 },
    { e: ['formula', 'formula'], w: 290, rows: [1, 2] },
    { e: ['zemzelett'], w: 290 },
    { e: ['zemzelett'], w: 117, type: 'back', run: 2 },
  ],
  // Junon Area forests (12). Before Yuffie joins, FF7 first rolls 32/256 for a Mystery Ninja
  // battle (table `ninja`) in these forests.
  wm_junon_forest: [
    { e: ['formula', 'formula', 'formula'], w: 441, rows: [1, 1, 2] },
    { e: ['capparwire', 'capparwire', 'capparwire', 'capparwire', 'capparwire'], w: 441, rows: [1, 1, 2, 2, 2] },
    { e: ['capparwire', 'capparwire'], w: 117, type: 'back', run: 2 },
  ],
  // Beach near Junon and Fort Condor (64).
  wm_junon_beach: [
    { e: ['capparwire', 'capparwire'], w: 344, rows: [1, 2] },
    { e: ['nerosuferoth', 'nerosuferoth'], w: 328 },
    { e: ['nerosuferoth', 'capparwire', 'capparwire'], w: 328, rows: [1, 2, 2] },
  ],
  // Chocobo Lure battles on the Junon Area chocobo tracks.
  chocobo_junon: [
    { e: ['capparwire', 'capparwire', 'capparwire', 'chocobo_c'], w: 25, rows: [1, 1, 1, 2] },
    { e: ['chocobo_c', 'capparwire', 'capparwire'], w: 25, rows: [1, 2, 2] },
    { e: ['nerosuferoth', 'nerosuferoth', 'chocobo_c'], w: 25, rows: [1, 1, 2] },
    { e: ['capparwire', 'capparwire', 'chocobo_c'], w: 25 },
  ],
  // Mystery Ninja (Yuffie) - forests, only while Yuffie has not joined.
  ninja: [
    { e: ['mystery_ninja'], w: 1 },
  ],

  // ===========================================================================================
  // Junon (no random battles in Lower/Upper Junon) and the cargo ship
  // ===========================================================================================
  junon: [
    { e: ['bottomswell'], w: 1, noEscape: true },
  ],
  cargo_ship: [
    { e: ['scrutin_eye', 'scrutin_eye', 'scrutin_eye', 'scrutin_eye'], w: 168, rows: [1, 1, 2, 2] },
    { e: ['marine', 'marine'], w: 154 },
    { e: ['marine', 'marine', 'marine'], w: 126, rows: [1, 2, 2] },
    { e: ['scrutin_eye', 'scrutin_eye', 'scrutin_eye', 'scrutin_eye'], w: 64, type: 'back', run: 2, rows: [1, 1, 2, 2] },
  ],

  // ===========================================================================================
  // Scripted fights (bosses and forced battles)
  // ===========================================================================================
  boss_guard_scorpion: [{ e: ['guard_scorpion'], w: 1, noEscape: true }],
  // FF7 (Enemy Mechanics FAQ): "Automatic Side Attack Battle, Forced Formation: 1.Barret, 2.Cloud, 3.Tifa" -
  // Cloud alone on one side of it (slot 2 stands behind a side attack's enemies), Barret and Tifa on the other.
  boss_air_buster: [{ e: ['air_buster'], w: 1, type: 'side', forced: ['barret', 'cloud', 'tifa'], noEscape: true }],
  boss_aps: [{ e: ['aps'], w: 1, noEscape: true }],
  boss_turks_reno: [{ e: ['turks_reno'], w: 1, noEscape: true }],
  boss_sample_h0512: [
    { e: ['sample_h0512_opt', 'sample_h0512_opt', 'sample_h0512_opt', 'sample_h0512'], w: 1, noEscape: true, rows: [1, 1, 1, 2] },
  ],
  // Two-part fight: when the Hundred Gunner falls, start boss_heli_gunner immediately (FF7 only
  // awards the Heli Gunner's EXP/AP/Gil/item).
  boss_hundred_gunner: [{ e: ['hundred_gunner'], w: 1, noEscape: true }],
  boss_heli_gunner: [{ e: ['heli_gunner'], w: 1, noEscape: true }],
  boss_rufus: [{ e: ['rufus', 'dark_nation'], w: 1, noEscape: true }],
  boss_motor_ball: [{ e: ['motor_ball'], w: 1, type: 'back', noEscape: true }],
  boss_bottomswell: [{ e: ['bottomswell'], w: 1, noEscape: true }],
  boss_jenova_birth: [{ e: ['jenova_birth'], w: 1, noEscape: true }],
  // Fort Condor: fought only when the Shinra forces break through (Lv19 first, Lv25 later).
  boss_cmdgrand_horn: [{ e: ['cmdgrand_horn'], w: 1, noEscape: true }],
  boss_cmdgrand_horn_b: [{ e: ['cmdgrand_horn_b'], w: 1, noEscape: true }],

  // Back of the Sector 5 church: soldiers sent by Reno (forced, in this order).
  event_church_soldiers: [
    { e: ['mp'], w: 1, noEscape: true },
    { e: ['guard_hound', 'guard_hound'], w: 1, noEscape: true },
    { e: ['guard_hound', 'mp'], w: 1 },
  ],
  // Don Corneo's mansion, 2nd floor: the lackeys, then Scotch with two lackeys.
  event_corneo_lackeys: [{ e: ['corneos_lackey', 'corneos_lackey', 'corneos_lackey'], w: 1, noEscape: true, rows: [1, 2, 2] }],
  event_scotch: [{ e: ['corneos_lackey', 'corneos_lackey', 'scotch'], w: 1, noEscape: true }],
  // Shinra HQ: forced fights (lobby guards, 59th floor ambush, 60th floor if the guards spot you).
  event_shinra_lobby: [{ e: ['grenade_combatant', 'grenade_combatant'], w: 1, noEscape: true }],
  event_shinra_59f: [{ e: ['mighty_grunt', 'mighty_grunt', 'mighty_grunt'], w: 1, noEscape: true, rows: [1, 2, 2] }],
  event_shinra_60f: [{ e: ['mighty_grunt', 'mighty_grunt'], w: 1, type: 'pincer', noEscape: true, groups: [1, 2] }],
});
