// Runner plan, Chapter 11b: The Northern Cave and the ending (docs/RUNNER.md, "Chapter 11b notes").
// The night before the final battle (played here when no optional chapter played it first), the Northern
// Cave with every chest on both paths (the others go down the left path and hand over what they find),
// the Save Crystal at the bottom, the crater's Enemy Skills (Dragon Force, Laser, L5 Death, Magic Breath,
// Angel Whisper, Roulette, Bad Breath, Shadow Flare, Pandora's Box), the hovering rocks, Jenova-SYNTHESIS,
// Bizarro- and Safer-Sephiroth, the one-on-one, the ending.
// Starts at: Disc 3 on the world map in the Highwind (after C12b; or hw_night / start when the optional
// chapters are skipped). Ends with: s.ending() (the staff roll).
// Helpers from plan_c12b.js: ['c12b_hop', x, y] (ride a one-way jump), ['c12b_get', id] (a chest / item
// without stepping on the jumps), ['c12b_learn', [eskills], { max }], and the battle option `weapon`.
(function () {
  const R = FF7.runner;
  // the party that walks the cave: the three strongest (Cloud 68, Tifa 64, Cid 63 at C12b's end; the others,
  // at 55-59, don't live through the graveyard's Death Dealers and Malboros while their Enemy Skills are
  // waited for), who are also the final party; the other five go left and bring a Guard Source, a Mind
  // Source, an Elixir and two Megalixirs (C11b's split table, js/maps/c11b/part2.js GIFTS; Tifa's Mystile and
  // Cid's Speed Source are the finds the walkers don't make). Anyone can carry Manipulate and Morph.
  const WALK = ['cloud', 'tifa', 'cid'], FINAL = ['cloud', 'tifa', 'cid'];
  const LEFT = 'The left path';
  // the crater's Enemy Skills: Dark Dragon (Dragon Force; Laser under Manipulate), Parasite (L5 Death,
  // Magic Breath under Manipulate), Pollensalta (Angel Whisper), Death Dealer (Roulette), Malboro (Bad
  // Breath), Dragon Zombie (Shadow Flare; Pandora's Box is its final attack, once per game: everyone
  // carries Enemy Skill materia so whoever it hits learns it)
  const ESK_UPPER = ['dragon_force', 'laser', 'l5_death', 'magic_breath'];
  const ESK_LOWER = ['angel_whisper', 'roulette', 'bad_breath', 'shadow_flare'];
  // (Dragon Force and Angel Whisper are cast on the enemy's own side, Laser, L5 Death and Magic Breath only
  // come out under Manipulate, and Death Dealer keeps Roulette for when it is nearly dead: Tifa (with the
  // Manipulate materia) manipulates Dark Dragons, Parasites, Pollensaltas and Death Dealers, as the
  // Enemy-Skill FAQ advises). learnEach: 'master': the master Enemy Skill materia (R.eskillMaster, FF7's 100%: one
  // copy with all 24) is the one that must learn a skill, so an enemy isn't kept alive until its skill has hit
  // all three; and the first Dragon Zombie is beaten at once (l5Gate, plan_c12b.js): a long fight drains its MP,
  // and Pandora's Box (110 MP, once per game) then fizzles for good. Later ones are spared for Shadow Flare.
  const CRATER = { learn: ESK_UPPER.concat(ESK_LOWER), manipulate: { enemy: ['dark_dragon', 'parasite', 'pollensalta', 'death_dealer'], learn: ESK_UPPER.concat(ESK_LOWER) },
    learnEach: 'master', l5gate: true, morph: true, steal: ['cauldron'], weapon: { pots: true, keepElixirs: 3, keepAlive: true, big: ['master_tonberry'], bigGuardAll: 50 },
    // (a Magic Pot takes no damage until it gets an Elixir: with none to spare, the party runs from it)
    fleeIf: (b) => b.enemies.some(e => e.targetable && e.def0 && e.def0.elixirUnlock && !(e.vars && e.vars.vulnerable)) && FF7.sys.inv.count('elixir') <= 3 };

  // C12b's end as the chained route leaves it (its c12b_end checkpoint from C12a's real end): Cloud 68, Tifa 64,
  // Cid 63, the others 55-59; the ultimate weapons, KOTR, Mime, W-Summon, the Master materia; Cloud still in
  // Sadness (Emerald WEAPON); the Highwind over the plains near Midgar
  R.starts.c11b = R.c12bProfile({
    exact: true, party: ['cloud', 'tifa', 'cid'], world: { x: 257, y: 129, vehicle: 'highwind' },
    levels: { cloud: 68, barret: 59, redxiii: 57, yuffie: 56, caitsith: 55, vincent: 56, cid: 63, tifa: 64 },
    equip: {
      cloud: { weapon: 'ultima_weapon', armor: 'mystile', accessory: 'sprint_shoes' },
      barret: { weapon: 'missing_score', armor: 'imperial_guard', accessory: 'earring' },
      redxiii: { weapon: 'limited_moon', armor: 'escort_guard', accessory: 'tough_ring' },
      yuffie: { weapon: 'conformer', armor: 'warrior_bangle', accessory: 'curse_ring' },
      caitsith: { weapon: 'hp_shout', armor: 'diamond_bangle', accessory: 'power_wrist' },
      vincent: { weapon: 'death_penalty', armor: 'aegis_armlet', accessory: 'ribbon' },
      cid: { weapon: 'venus_gospel', armor: 'crystal_bangle', accessory: 'talisman' },
      tifa: { weapon: 'premium_heart', armor: 'minerva_band', accessory: 'ribbon' },
    },
    materia: {
      cloud: [['knights_of_round', 3500], ['hp_absorb', 30670], ['mime', 3500], ['hp_plus', 42548], ['hp_plus', 28000], ['magic_plus', 32924], ['time', 42077]],
      barret: [['restore', 29182], null, ['ice', 30657], ['all', 20127], null, null, null, null, null, null, null, null, ['mp_plus', 28657], ['odin', 34182]],
      redxiii: [null, null, null, null, null, ['ice', 20525], null, null, ['kujata', 23525], null, null, ['seal', 11525]],
      yuffie: [null, ['throw', 12000], ['poison', 6000], ['mystify', 8000], ['leviathan', 19000], ['ifrit', 7000]],
      caitsith: [['manipulate', 9000], ['transform', 9000], ['titan', 16000], ['ramuh', 11000], ['exit', 5000], ['destruct', 7000]],
      vincent: [null, ['alexander', 26670], ['choco_mog', 15670], ['pre_emptive', 9670], null, ['mp_absorb', 30670], null, null, ['enemy_skill', 0, ['frog_song', 'l4_suicide', 'magic_hammer', 'white_wind', 'big_guard', 'death_force', 'flame_thrower', 'laser', 'matra_magic', 'bad_breath', 'beta', 'aqualung', 'trine', 'magic_breath', 'death_sentence']]],
      cid: [],
      tifa: [['enemy_skill', 0, ['frog_song', 'l4_suicide', 'magic_hammer', 'white_wind', 'big_guard', 'death_force', 'flame_thrower', 'laser', 'matra_magic', 'bad_breath', 'beta', 'aqualung', 'trine', 'magic_breath', 'death_sentence', 'shadow_flare']]],
    },
    stock: [
      ['fire', 19525], ['enemy_away', 0], ['bahamut', 59462], ['added_cut', 0], ['fire', 3000],
      ['shiva', 16000], ['earth', 2000], ['contain', 0], ['sense', 12000], ['fire', 20000],
      ['added_effect', 3525], ['long_range', 21385], ['earth', 8385], ['long_range', 20525],
      ['luck_plus', 17050], ['speed_plus', 17050], ['w_item', 0], ['revive', 0], ['chocobo_lure', 7357],
      ['restore', 0], ['lightning', 0], ['all', 35027], ['lightning', 35018], ['barrier', 45157],
      ['hp_mp', 0], ['quadra_magic', 0], ['slash_all', 0], ['typhoon', 0], ['gravity', 17000],
      ['ultima', 5475], ['all', 0], ['all', 0], ['cover', 0], ['barrier', 0], ['deathblow', 0],
      ['lightning', 0], ['time', 0], ['lightning', 22470], ['enemy_lure', 22190], ['hades', 0],
      ['counter_attack', 50992], ['cover', 40002], ['lightning', 35132], ['elemental', 49992],
      ['steal', 44470], ['chocobo_lure', 0], ['double_cut', 0], ['restore', 40057], ['full_cure', 0],
      ['all', 35002], ['w_summon', 3500], ['enemy_skill', 0, ['goblin_punch', 'question', 'aqualung']],
      ['steal', 33073], ['revive', 55360], ['mp_plus', 50082], ['mega_all', 66309], ['deathblow', 40152],
      ['phoenix', 44309], ['heal', 57309], ['chocobo_lure', 30717], ['restore', 28470], ['all', 20127],
      ['enemy_skill', 0, ['frog_song', 'l4_suicide', 'magic_hammer', 'white_wind', 'big_guard', 'death_force', 'flame_thrower', 'laser', 'matra_magic', 'bad_breath', 'beta', 'aqualung', 'trine', 'magic_breath', 'death_sentence', 'question']],
      ['morph', 20670], ['bahamut_zero', 10657], ['neo_bahamut', 25182], ['mp_plus', 0],
      ['master_command', 0], ['master_magic', 0], ['master_summon', 0]],
    items: {
      protect_vest: 1, fury_ring: 1, potion: 19, hi_potion: 26, ether: 19, turbo_ether: 4, elixir: 11,
      megalixir: 3, phoenix_down: 14, remedy: 8, antidote: 6, soft: 5, maidens_kiss: 5, echo_screen: 4,
      hyper: 4, tranquilizer: 2, diamond_bangle: 2, rune_armlet: 1, gold_armlet: 3, s_mine: 2, grenade: 2,
      battle_trumpet: 1, shinra_beta: 2, scimitar: 1, dragon_claw: 1, partisan: 1, rising_sun: 1,
      starlight_phone: 1, behemoth_horn: 1, pile_banger: 1, master_fist: 1, grow_lance: 1, am_cannon: 1,
      organics: 1, curiel_greens: 13, lasan_nut: 5, tissue: 17, zeio_nut: 1, mimett_greens: 2, flayer: 1,
      supershot_st: 1, spring_gun_clip: 1, x_potion: 24, apocalypse: 1, tent: 9, ragnarok: 1,
      heavens_cloud: 1, outsider: 1, water_ring: 1, spirit_lance: 1, sneak_glove: 1, gods_hand: 1,
      crystal_comb: 1, mirror: 1, bolt_ring: 1, great_gospel: 1, autograph: 2, combat_diary: 1, lariat: 1,
      silver_armlet: 1, peace_ring: 1, star_pendant: 1, hawkeye: 1, max_ray: 1, silver_glasses: 1,
      fairy_ring: 1, red_m_phone: 1, headband: 1 },
    keyItems: ['huge_materia_corel', 'huge_materia_condor', 'leviathan_scales', 'huge_materia_underwater', 'huge_materia_rocket', 'key_to_sector_5'],
    gil: 338430, gp: 690, battles: 384,
    limits: {
      cloud: ['braver', 'cross_slash', 'blade_beam', 'climhazzard', 'meteorain', 'finishing_touch', 'omnislash'],
      barret: ['big_shot', 'mindblow', 'grenade_bomb', 'hammerblow', 'satellite_beam', 'ungarmax', 'catastrophe'],
      redxiii: ['sled_fang', 'lunatic_high', 'blood_fang', 'stardust_ray', 'howling_moon', 'earth_rave'],
      yuffie: ['greased_lightning', 'clear_tranquil', 'landscaper', 'bloodfest', 'gauntlet', 'doom_of_the_living'],
      caitsith: ['dice', 'slots'],
      vincent: ['galian_beast', 'death_gigas', 'hellmasker', 'chaos'],
      cid: ['boost_jump', 'dynamite', 'hyper_jump', 'dragon', 'dragon_dive', 'big_brawl', 'highwind'],
      tifa: ['beat_rush', 'somersault', 'waterkick', 'meteodrive', 'dolphin_blow', 'meteor_strike', 'final_heaven'],
    },
    vehicles: { highwind: { x: 257, y: 129 }, submarine: { x: 216, y: 198 } },
    vars: {chocobo_pen: [], c12b_on_choco: 0, chocobos: [{id: 8, name: 'Pecker', sex: 'male', rating: 'great', color: 'black', maxSpeed: 111.4, speed: 95.6, stamina: 405.8, accel: 65, intel: 56, coop: 6, races: 6, run: 6, class: 'A', born: 98, readyAt: 216}, {id: 10, name: 'Mocha', sex: 'female', rating: 'wonderful', color: 'yellow', maxSpeed: 106, speed: 91.7, stamina: 469.5, accel: 70, intel: 59, coop: 28, races: 6, run: 6, class: 'A', born: 113, readyAt: 216}, {id: 12, name: 'Rosa', sex: 'female', rating: 'great', color: 'gold', maxSpeed: 127.9, speed: 110.2, stamina: 514.8, accel: 68, intel: 58, coop: 0, races: 0, run: 0, class: 'C', born: 209, readyAt: 218}], c12a_stables: 5, c12a_sage_next: 103, c12a_choco_seq: 12, c12a_sage_stage: 1, chocobo_color: 'gold', c12a_riding: 12, c12b_luc_battles: 213, c12b_ult_fights: 1, c12b_ult_stage: 8, c12b_ult_battles: 339},
    flags: [
      'c10_venus_gospel', 'c11b_dawn_done', 'c11b_field_done', 'c11b_night_done', 'c12b_ult_told',
      'c2_kid_paid', 'c2_scene_bar', 'c2_scene_morning', 'c2_scene_promise', 'c3_barrels_on', 'c4_box',
      'c5b_condor_w', 'c6b_gi_rock', 'c7_pagoda_on', 'c7_pg', 'c9_clone', 'c9_cold_warned', 'c9_tape',
      'got_condor2_phoenix', 'got_midgar2_hq_behemoth', 'got_midgar2_hq_growlance',
      'got_midgar2_hq_masterfist', 'got_midgar2_hq_pilebanger', 'got_midgar2_stairs_missingscore',
      'got_midgar2_ug1_elixir', 'got_midgar2_ug1_megalixir', 'got_midgar2_ug2_aegis',
      'got_midgar2_ug3_elixir', 'got_midgar2_ug3_maxray', 'got_midgar2_ug3_starlight',
      'got_midgar2_wind1_guard', 'got_midgar2_wind1_power', 'got_midgar2_wind2_magic',
      'got_midgar2_wind2_mind', 'got_midgar2_wind2_witem', 'got_midgar2_yard_elixir',
      'got_midgar2_yard_mystile', 'got_side_farm_lure2', 'got_uwreactor_dock_scales',
      'got_uwreactor_dock_scimitar', 'got_uwreactor_dock_trumpet', 'yuffie_joined', 'c11b_morning_done',
      'c12a_bill_d2', 'c12a_sage_named', 'c12a_sage_eskill', 'c12a_caught_chocobo', 'c12a_ester_d2',
      'c12a_bred_green', 'c12a_bred_blue', 'c12a_host_met', 'c12a_arena_clear', 'c12a_sprint_shoes',
      'c12a_bred_black', 'c12a_flayer', 'c12a_bred_gold', 'c12b_kotr_seen', 'got_side_cave_kotr_materia',
      'side_cave_mime_seen', 'got_side_cave_mime_materia', 'side_cave_hpmp_seen',
      'got_side_cave_hpmp_materia', 'side_cave_quadra_seen', 'got_side_cave_quadra_materia',
      'c12b_goblin_seen', 'c12b_af_intro', 'got_c12b_af_supershot', 'got_c12b_af_springgun',
      'got_c12b_af_slashall', 'got_c12b_af_typhoon', 'got_c12b_af_minerva', 'c12b_af_cave',
      'got_c12b_af_apocalypse', 'got_c12b_af_elixir', 'c12b_luc_falls_seen', 'trig_side_lucrecia_luc_first',
      'c12b_luc_seen', 'c12b_ultimate_dead', 'c12b_gel_intro', 'got_c12b_gel_heavens_cloud',
      'got_c12b_gel_megalixir1', 'got_c12b_gel_escort_guard', 'c12b_gel_conformer', 'c12b_gel_doublecut',
      'trig_side_gelnika_corridor_turks', 'c12b_gel_turks', 'got_c12b_gel_outsider', 'got_c12b_gel_highwind',
      'got_c12b_gel_hades', 'got_c12b_gel_spirit_lance', 'got_c12b_gel_megalixir2', 'c8_dug_key5',
      'c12b_gate_man', 'c12b_midgar_open', 'c12b_church', 'c12b_premium_heart', 'c12b_sneak_glove',
      'c12b_cosmo_stash', 'c12b_limited_moon', 'c12b_final_heaven', 'trig_mansion_basement_c12b_memory',
      'c12b_sleeper_seen', 'c12b_sleeper_ring', 'c8_ws_small', 'c12b_luc_gifts', 'c12b_ruby_dead',
      'c5a_trav_rose', 'c5a_gold_chocobo', 'c12b_emerald_dead', 'c5a_trav_harp'],
    noFlags: ['c10_corel_crash', 'c10_dog_gone', 'c11a_hq_stairs_top', 'c11a_key_dug', 'c11a_turks_fought', 'c3_barrel_0', 'c3_fell_sewer', 'c3_snuck_out', 'c4_route_stairs', 'c5b_disguised', 'c5b_in_water', 'c5b_undisguised', 'c8_keystone_stolen', 'c9_elena_dodged'],
    after: (st) => { st.chars.cloud.status = {'sadness': true}; },
  });
  // a start at the night before the battle (the optional chapters skipped): --plan c11b --start c11b_night
  R.starts.c11b_night = R.c12bProfile({ level: 70, map: 'hw_night', entry: 'start' });

  R.plans.c11b = [
    ['chapter', 'c11b', 'Chapter 11b: The Northern Cave and the ending'],
    // (soft guards: C12b's saves hold them too, and a game resumed there must carry on in C12b)
    ['expect', 'disc3', { soft: true }],
    // ---- the night before the final battle: the scenes play by themselves from hw_night (C11a's end);
    // at dawn, up the gangway, and everyone comes back. Done already when an optional chapter came first.
    ['obj', 'The night before the final battle'],
    ['exit', 'hw_bridge', { map: 'hw_dawn', done: 'c11b_morning_done' }],   // up the gangway at dawn: the morning scene
    ['expect', 'c11b_morning_done', { soft: true }],

    // ---- ready for the crater: the party that walks it, Enemy Skill materia on all three
    ['obj', 'Get ready for the Northern Cave'],
    ['party', WALK],
    ['loadout', 'cloud', { weapon: ['knights_of_round', 'w_summon', 'mime', 'enemy_skill', 'hp_plus', 'magic_plus', ['restore', 'all']] }],
    ['loadout', 'tifa', { weapon: ['enemy_skill', 'manipulate', 'steal', 'revive', 'hp_plus', ['restore', 'all']] }],
    ['loadout', 'cid', { weapon: ['enemy_skill', 'morph', 'heal', ['mega_all', 'restore'], 'bahamut_zero', 'neo_bahamut'] }],
    ['autoequip', { members: WALK, slots: ['accessory'] }],   // Safety Bit, Star Pendant... (Gargoyles petrify, Scissors kill)
    // (L5 Death kills whoever's level is a multiple of 5 and is only learned when it lands: `l5gate` keeps it
    // on the list while an Enemy Skill holder has such a level and someone else doesn't, all through the crater)
    ['battle', CRATER],

    // ---- the crater floor and the descent
    ['obj', 'Fly to the Northern Crater'],
    ['world', 'northern_crater'],
    ['expectMap', 'cave_entrance'],
    ['expect', 'final_dungeon'],
    ['obj', 'Down into the Northern Cave'],
    ['walk', 5, 8, { choose: 'Go down', done: 'c11b_descent_seen' }],
    ['expectMap', 'cave_descent'],
    ['expect', 'c11b_descent_seen'],
    ['chest', 'cave_descent_save_crystal'],                  // the Save Crystal
    ['chest', 'cave_descent_guard_source'],
    ['goto', 'cave_cliffs'],
    ['chest', 'cave_cliffs_guard_source'],
    ['chest', 'cave_cliffs_power_source'],
    ['item', 'cave_cliffs_hp_absorb'],
    ['chest', 'cave_cliffs_elixir'],
    ['chest', 'cave_cliffs_magic_source'],
    ['chest', 'cave_cliffs_mind_source'],
    ['obj', 'Dark Dragons and Parasites: Dragon Force, Laser, L5 Death, Magic Breath'],
    ['c12b_learn', ['dragon_force', 'laser', 'magic_breath'], { max: 14, budget: 200000 }],
    ['c12b_l5prep'],                                                          // no Safety Bit on the one it can kill
    ['c12b_learn', ['l5_death'], { max: 10, while: () => R.c12bL5ok(), budget: 80000 }],   // while someone's level allows it
    ['ckpt', 'c11b_cliffs'],

    // ---- the maze: ledges joined by one-way jumps
    ['obj', 'Through the maze'],
    ['goto', 'cave_maze'],
    ['c12b_hop', 18, 2, { done: 'got_cave_maze_power_source' }],        // top ledge -> middle
    ['c12b_get', 'cave_maze_power_source'],
    ['c12b_hop', 29, 6, { done: 'got_cave_maze_mind_source' }],         // middle -> right ledge
    ['c12b_get', 'cave_maze_mind_source'],
    ['c12b_hop', 31, 8, { done: 'got_cave_maze_megalixir' }],           // right ledge -> the little cave
    ['c12b_get', 'cave_maze_megalixir'],
    ['c12b_hop', 32, 5, { done: 'got_cave_maze_hero_drink' }],          // ...and down again
    ['c12b_hop', 24, 10, { done: 'got_cave_maze_hero_drink' }],         // right ledge -> lower level
    ['c12b_get', 'cave_maze_hero_drink'],
    ['c12b_get', 'cave_maze_guard_source'],
    ['c12b_get', 'cave_maze_power_source2'],
    // (the Save Crystal waits for the bottom of the crater, as the Walkthrough advises)

    // ---- the Dividing Point: everyone else takes the left path (deterministic finds)
    ['obj', 'The Dividing Point'],
    ['goto', 'cave_divide', { choose: [LEFT, LEFT, LEFT, LEFT, LEFT] }],   // the five who are not walking
    ['expect', 'c11b_split'],
    ['ckpt', 'c11b_split'],

    // ---- the left path (the graveyard): Pollensalta, Death Dealer, Malboro, Dragon Zombie
    ['obj', 'The left path: the graveyard'],
    ['goto', 'cave_graveyard'],
    ['chest', 'cave_graveyard_mystile'],
    ['item', 'cave_graveyard_elixir'],
    ['obj', 'Angel Whisper, Roulette, Bad Breath, Shadow Flare, Pandora\'s Box'],
    ['c12b_rouletteprep'],                                                         // (Roulette kills whoever it lands on: no Death ward on the master's holder)
    ['c12b_learn', ESK_LOWER.concat(['pandoras_box']), { max: 32, budget: 250000 }],   // (Pandora's Box: the first Dragon Zombie killed)
    ['c12b_l5', { rounds: 4, budget: 400000 }],                                    // L5 Death still missing: rounds until it lands
    ['goto', 'cave_bones'],
    ['chest', 'cave_bones_tetra_elemental'],
    ['chest', 'cave_bones_speed_source'],
    ['chest', 'cave_bones_megalixir'],
    ['chest', 'cave_bones_megalixir2'],
    ['obj', 'Meet up at the bottom of the crater'],
    ['goto', 'cave_bottom'],
    ['expect', 'c11b_regroup'],                              // the others hand over their finds
    ['chest', 'cave_bottom_luck_source'],
    ['ckpt', 'c11b_bottom'],

    // ---- back up the right path for its treasures: the Counter room, the swamp, the second fork, the
    // grassy slope, then down the floating rocks (Mega-All in mid-jump) to the bottom again
    ['obj', 'Up the right path for its treasures'],
    ['goto', 'cave_counter'],
    ['item', 'cave_counter_w_magic'],
    ['item', 'cave_counter_counter'],
    // the Protect Ring when C9's steal from Schizo's right neck didn't give it (the Item_Materia Locations FAQ: that, or
    // a Mover's Morph): their packs of three wade in these waters. Cloud Morphs (his blows take a quarter of a Mover's
    // 3000 HP; Cid's barely scratch one: the others can only Defend meanwhile), and the party runs from the other
    // fights here (Magic Pots want Elixirs, a Master Tonberry wiped a drained party)
    ['obj', "The Protect Ring: a Mover's Morph in the Counter room's waters", { done: (s, R) => R.gear.owned('protect_ring') > 0 }],
    ['loadout', 'cloud', { weapon: ['knights_of_round', 'w_summon', 'morph', 'enemy_skill', 'hp_plus', 'magic_plus', ['restore', 'all']] }, { done: (s, R) => R.gear.owned('protect_ring') > 0 }],
    ['battle', Object.assign({}, CRATER, { morph: ['protect_ring'], fleeIf: (b) => !b.enemies.some(e => e.id === 'mover' && e.targetable) })],
    ['fightUntil', (s, R) => R.gear.owned('protect_ring') > 0, { max: 60, at: 'cave_counter' }],
    ['battle', CRATER],
    ['goto', 'cave_swamp'],
    ['c12b_get', 'cave_swamp_hero_drink'],
    ['c12b_get', 'cave_swamp_imperial_guard'],
    ['c12b_hop', 18, 12, { done: 'got_cave_swamp_remedy' }],           // wade north
    ['c12b_get', 'cave_swamp_remedy'],
    ['c12b_get', 'cave_swamp_shield'],
    ['c12b_hop', 15, 2, { done: 'got_cave_swamp_vaccine' }],            // wade west
    ['c12b_get', 'cave_swamp_vaccine'],
    ['c12b_get', 'cave_swamp_magic_source'],
    ['goto', 'cave_fork'],
    ['c12b_get', 'cave_fork_vaccine'],
    ['c12b_get', 'cave_fork_turbo_ether'],
    ['c12b_get', 'cave_fork_magic_counter'],
    ['goto', 'cave_grass'],
    ['chest', 'cave_grass_x_potion'],
    ['chest', 'cave_grass_elixir'],
    ['chest', 'cave_grass_remedy'],
    ['goto', 'cave_fork'],
    ['goto', 'cave_float'],
    ['c12b_hop', 17, 3, { done: 'c11b_megaall' }],                     // down onto the middle rocks
    ['c12b_get', 'cave_float_x_potion'],
    ['c12b_get', 'cave_float_turbo_ether'],
    ['c12b_hop', 8, 11, { choose: 'Grab it', done: 'c11b_megaall' }],  // the double jump: Mega-All in mid-air
    ['expect', 'c11b_megaall', { soft: true }],
    ['c12b_get', 'cave_float_speed_source'],
    ['goto', 'cave_bottom'],
    ['expect', 'got_cave_float_speed_source'],                 // (a resume point: the right path is behind the party)
    ['ckpt', 'c11b_all_items'],

    // ---- the Save Crystal, the final party, the setups
    ['obj', 'The Save Crystal'],
    ['use', 4, 4, { choose: 'Create it here', done: 'c11b_crystal_used' }],
    ['expect', 'c11b_crystal_used', { soft: true }],
    ['obj', 'Choose the party for the final battle'],
    ['party', FINAL],                                        // (PHS: the walkers' materia is taken first below)
    ['c12b_sources', {}],                                    // the crater's sources, all on Cloud
    ['autoequip', { members: FINAL }],                       // the second Mystile, the Ribbons Master Tonberry gave...
    ['loadout', 'cloud', { weapon: ['knights_of_round', 'w_summon', 'mime', 'enemy_skill', 'hp_plus', 'magic_plus', ['restore', 'all']] }],
    ['loadout', 'tifa', { weapon: ['enemy_skill', 'hades', 'typhoon', 'hp_plus', 'revive', 'heal', 'time', 'w_magic'], clear: true }],
    ['loadout', 'cid', { weapon: ['enemy_skill', 'bahamut_zero', 'neo_bahamut', 'hp_plus', ['restore', 'all'], 'mp_plus', 'shield'] }],
    ['c12b_eskill', 'tifa', ['big_guard', 'white_wind', 'shadow_flare']],   // Tifa: the copy that knows Big Guard
    ['use', 4, 4],                                          // saved at the crystal, set up (the last save point)
    ['party', FINAL, { select: true }],                      // the answer for the party screen below
    // (Dragon Zombies on the rocks: Pandora's Box is their final attack, so they are simply beaten; all
    // three carry Enemy Skill materia and whoever it hits learns it)
    ['battle', { weapon: { mime: true, bigGuard: true } }],
    ['use', 16, 11, { choose: "Let's go.", done: 'c11b_descended' }],   // the edge of the hole down to the core
    ['expectMap', 'final_platforms'],
    ['expect', 'c11b_descended'],
    ['ckpt', 'c11b_core'],

    // ---- the hovering rocks (a battle on about one jump in three)
    ['obj', "Down the hovering rocks to the Planet's core"],
    ['c12b_hop', 6, 3], ['c12b_hop', 14, 5], ['c12b_hop', 22, 8], ['c12b_hop', 28, 10], ['c12b_hop', 19, 13],
    ['goto', 'final_platforms2'],
    ['c12b_hop', 5, 2], ['c12b_hop', 12, 3], ['c12b_hop', 19, 4], ['c12b_hop', 26, 5],
    ['c12b_hop', 32, 7], ['c12b_hop', 27, 11], ['c12b_hop', 20, 13], ['c12b_hop', 12, 13],
    ['goto', 'final_core'],

    // ---- Jenova-SYNTHESIS
    ['obj', 'Jenova-SYNTHESIS'],
    ['heal', { below: 0.9 }],                                // (no save point past the crater's bottom)
    ['battle', { weapon: { mime: true, bigGuard: true } }],
    ['walk', 16, 9, { done: 'c11b_jenova_done' }],
    ['expectMap', 'final_abyss'],
    ['expect', 'c11b_jenova_done'],
    ['ckpt', 'c11b_jenova'],

    // ---- Bizarro-Sephiroth, Safer-Sephiroth, the one-on-one and the ending (the scenes run through)
    ['obj', 'Sephiroth'],
    ['heal', { below: 0.95 }],
    ['walk', 16, 6, { done: 'c11b_safer_done', budget: 200000 }],   // Bizarro, Safer, the duel, the ending scenes
    ['expect', 'game_cleared'],
    ['ckpt', 'c11b_end'],
  ];
})();
