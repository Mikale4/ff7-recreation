// The Kupomon route (docs/KUPOMON_WORLD.md; the runner: docs/RUNNER.md "Kupomon"): the Kupomon Demo plays this
// from a new game (Title > Demo on the MogBoy, or Esc inside Kupomon), and `node tools/run_runner.js --start kp
// --plan kp` plays it headless to prove the game can be beaten. Kupomon's own ops: js/kupomon/kp_runner.js.
// Each region's part follows its maps (js/maps/kupomon/kp_region<N>.js): story triggers are walked into, dojo puzzles
// are solved in the order their maps' comments give, and the team trains before every dojo master. Every battle that
// has to be won is a `win` block (['kp_win', steps, flag, { train }]): lost, the team is repaired, trains a level and
// the whole block is played again from wherever it woke up (its steps already done are passed over).
(function () {
  const R = FF7.runner;
  const KP = () => FF7.kupomon;
  const badge = (n) => 'kp_badge_' + n;
  const tr = (id) => 'kp_tr_' + id;                     // a trainer beaten (KP.W.trainer)
  // (no grinding stops: the whole team shares the experience, as in modern Pokémon, so it levels on the way, from
  // the route trainers and the wild moogles; a battle that has to be won and is lost trains for it then, as a player does)
  // inside the Kupo League now (its rooms, or a member of the Four beaten this run): the League Guard is behind
  const inLeague = () => /^kp_kl_/.test(FF7.runner.where() || '') || ['kp_e4_1', 'kp_e4_2', 'kp_e4_3', 'kp_e4_4'].some(f => FF7.state.flags[f]);
  // (levels written for the old cap of 30, on the cap of 50: Kupomon's KP.LV)
  const LV = (n) => n <= 1 ? n : Math.min(50, Math.round(n * 5 / 3));
  const win = (flag, train, ...steps) => ['kp_win', steps, flag, train && typeof train === 'object' ? train : { train }];   // (train: a map, or { train, center })
  // the player stands in a map's rect (a step done once a launch pad has thrown him there)
  const on = (map, x0, y0, x1, y1) => () => { const f = FF7.fieldScene, p = f && f.player; return !!p && f.map.id === map && p.tx >= x0 && p.tx <= x1 && p.ty >= y0 && p.ty <= y1; };

  // a headless start: an FF7 game with the MogBoy, then the cartridge
  R.starts.kp = { map: 'gs_cait_hideout', party: ['cloud'], names: { cloud: 'Cloud' }, flags: ['cait_joined'] };

  // ---- Region 1: Pomville, Route 1, Mogridge, Route 2, Whisperwood, Route 3, Kurotsuki (Dojo 1: Yuffie)
  const R1 = [
    ['chapter', 'kp', 'Kupomon'],
    ['kp_start'],
    ['obj', "Prof. Sith's lab: choose a partner"],
    ['kp_starter', 'kupwick_blackmage'],
    ['expect', 'kp_starter'],
    // the lab's secret, which the Demo knows from the start: EXP Plus in the hollow book on the left shelf
    ['use', 1, 1, { map: 'kp_lab', done: 'kph_lab_exp_plus' }],
    ['kp_equip'],
    ['kp_relearn'],
    ['walk', 6, 7, { done: 'kp_sent_off' }],          // (the door: Zack's test battle, then off you go)
    ['expect', 'kp_sent_off'],
    ['obj', 'Pomville: stock up, then Route 1'],
    ['kp_buy', { kupo_nut: 8, oil_can: 3 }, { center: 'kp_center' }],
    ['kp_heal', { center: 'kp_center' }],
    ['goto', 'kp_route1'],
    ['obj', 'Route 1: make some friends'],
    ['kp_train', LV(7)],
    win(tr('kp_tr_ollie'), 'kp_route1', ['goto', 'kp_route1'], ['talk', 'kp_tr_ollie', { done: tr('kp_tr_ollie') }]),
    win(tr('kp_tr_mabel'), 'kp_route1', ['goto', 'kp_route1'], ['talk', 'kp_tr_mabel', { done: tr('kp_tr_mabel') }]),
    ['ckpt', 'kp_route1'],
    ['goto', 'kp_route1n'],
    ['obj', 'North to Mogridge, the canal town'],
    ['goto', 'kp_mogridge'],
    ['kp_heal', { center: 'kp_mogridge_center' }],
    ['kp_buy', { kupo_nut: 10, golden_nut: 2, oil_can: 6 }, { center: 'kp_mogridge_center' }],
    ['kp_heal', { center: 'kp_mogridge_center' }],
    ['obj', 'Mogridge: Zack on the middle bridge'],
    win('kp_rival_zack_2', 'kp_route1n', ['goto', 'kp_mogridge'], ['walk', 18, 12, { done: 'kp_rival_zack_2' }]),
    ['obj', "Route 2: Team Hojo has Lily's Tufty at the lock"],
    ['goto', 'kp_route2'],
    win('kp_hojo1_done', 'kp_route2', ['goto', 'kp_route2'],
      ['talk', 'kp_r2_grunt1', { done: tr('kp_r2_grunt1') }], ['talk', 'kp_r2_grunt2', { done: 'kp_hojo1_done' }]),
    ['talk', 'kp_mg_lily', { map: 'kp_mogridge', done: 'kp_hojo1_reward' }],
    ['obj', 'Whisperwood, then Route 3'],
    ['goto', 'kp_whisperwood_deep'],
    ['goto', 'kp_route3'],
    ['kp_heal', { center: 'nearest' }],
    ['obj', 'Route 3: Sephiroth at the torii gate'],
    win('kp_rival_sephiroth_3', 'kp_route3', ['goto', 'kp_route3'], ['walk', 15, 4, { done: 'kp_rival_sephiroth_3' }]),
    ['goto', 'kp_kurotsuki'],
    ['kp_heal', { center: 'kp_kurotsuki_center' }],
    ['kp_buy', { kupo_nut: 10, golden_nut: 3, oil_can: 6, hi_oil: 2 }, { center: 'kp_kurotsuki_center' }],
    ['kp_heal', { center: 'kp_kurotsuki_center' }],
    ['ckpt', 'kp_dojo1'],
    ['obj', "Yuffie's Shuriken Arcade: false walls and trapdoors"],
    win(badge(1), 'kp_route3',
      ['goto', 'kp_kurotsuki_dojo'],
      ['talk', 'kp_dj_kaz', { done: tr('kp_dj_kaz') }],
      ['talk', 'kp_dj_rin', { done: tr('kp_dj_rin') }],
      ['goto', 'kp_kurotsuki_dojo_2'],
      ['talk', 'kp_dj_suzu', { done: tr('kp_dj_suzu') }],
      ['use', 11, 4, { done: 'kp_dj_panel' }],          // (the panel and its scrolls: it spins open)
      ['talk', 'kp_yuffie', { done: badge(1) }]),
    ['expect', badge(1)],
    ['kp_heal', { center: 'kp_kurotsuki_center' }],
    ['ckpt', 'kp_r1_end'],
  ];

  // ---- Region 2: Route 4, Fernwick, Route 5, Mt. Kupo, Cogsworth (Dojo 2: Barret), Route 6, Mogfield
  const R2 = [
    ['chapter', 'kp_r2', 'Kupomon: the Seaspray Cliffs to Mogfield'],
    ['expect', badge(1)],
    ['obj', 'North along the coast to Fernwick'],
    ['goto', 'kp_fernwick'],
    ['kp_heal', { center: 'kp_fernwick_center' }],
    ['kp_buy', { kupo_nut: 10, golden_nut: 3, oil_can: 6, hi_oil: 2 }, { center: 'kp_fernwick_center' }],
    ['kp_heal', { center: 'kp_fernwick_center' }],
    ['obj', 'Fernwick: Zack waits at the Long Bridge'],
    ['goto', 'kp_fernwick'],
    ['walk', 4, 9, { done: 'kp_r2_zack' }],           // (a friendly battle: done either way)
    ['expect', 'kp_r2_zack'],
    ['obj', 'Route 5 and the caves of Mt. Kupo'],
    ['goto', 'kp_route5'],
    ['goto', 'kp_mtkupo_2'],
    ['obj', 'Mt. Kupo: Team Hojo is digging at the far mouth'],
    win('kp_r2_scarlet', 'kp_mtkupo_2', ['goto', 'kp_mtkupo_2'], ['walk', 6, 20, { done: 'kp_r2_scarlet' }]),
    ['goto', 'kp_cogsworth'],
    ['kp_heal', { center: 'kp_cogsworth_center' }],
    ['kp_buy', { kupo_nut: 10, golden_nut: 3, glow_nut: 2, oil_can: 6, hi_oil: 3 }, { center: 'kp_cogsworth_center' }],
    ['obj', 'Cogsworth: Sephiroth, outside the dojo'],
    win('kp_r2_seph', 'kp_mtkupo_2', ['goto', 'kp_cogsworth'], ['walk', 12, 8, { done: 'kp_r2_seph' }]),
    ['kp_heal', { center: 'kp_cogsworth_center' }],
    ['ckpt', 'kp_dojo2'],
    ['obj', "Barret's Gun-Arm Arcade: yellow, red, blue"],
    win(badge(2), 'kp_mtkupo_2',
      ['goto', 'kp_cogsworth_dojo'],
      ['talk', 'kp_d2_gil', { done: tr('kp_d2_gil') }],
      ['use', 27, 11, { done: 'kp_d2_yellow' }],
      ['use', 11, 17, { done: 'kp_d2_red' }],
      ['talk', 'kp_d2_rosa', { done: tr('kp_d2_rosa') }],
      ['use', 2, 11, { done: 'kp_d2_blue' }],
      ['talk', 'kp_d2_rigg', { done: tr('kp_d2_rigg') }],
      ['talk', 'kp_d2_barret', { done: badge(2) }]),
    ['expect', badge(2)],
    ['obj', 'Route 6 to Mogfield'],
    ['goto', 'kp_mogfield'],
    ['kp_heal', { center: 'kp_mogfield_center' }],
    ['kp_buy', { kupo_nut: 10, golden_nut: 3, oil_can: 6, hi_oil: 4, battery: 1 }, { center: 'kp_mogfield_center' }],
    ['ckpt', 'kp_r2_end'],
  ];

  // ---- Region 3: Route 7, Nibel Peaks (Dojo 3: Tifa), Route 8, Sandsea, the Sunken Ruins, Route 9, Skyport (Team
  // Hojo HQ, Dojo 4: Cid)
  const R3 = [
    ['chapter', 'kp_r3', 'Kupomon: the mountains, the desert and Skyport'],
    ['expect', badge(2)],
    ['obj', 'Route 7: up into the snow'],
    ['goto', 'kp_route7'],
    ['goto', 'kp_nibelpeaks'],
    ['kp_heal', { center: 'kp_nibelpeaks_center' }],
    ['kp_buy', { kupo_nut: 10, golden_nut: 3, sleepy_nut: 2, hi_oil: 5, battery: 1 }, { center: 'kp_nibelpeaks_center' }],
    ['kp_heal', { center: 'kp_nibelpeaks_center' }],
    ['ckpt', 'kp_dojo3'],
    ['obj', "Tifa's Seventh Heaven Arcade: blossom, sun, leaf, snow"],
    win(badge(3), 'kp_route7',
      ['goto', 'kp_nibel_dojo'],
      ['use', 9, 7, { done: 'kp_nd_bag0', choose: 'Punch it!' }],
      ['talk', 'nd_aya', { done: tr('nd_aya') }],
      ['talk', 'nd_gorm', { done: tr('nd_gorm') }],
      ['use', 24, 11, { done: { any: ['kp_nd_spring', 'kp_nd_great'] } }],
      ['use', 12, 3, { done: { any: ['kp_nd_summer', 'kp_nd_great'] } }],
      ['use', 12, 11, { done: { any: ['kp_nd_autumn', 'kp_nd_great'] } }],
      ['use', 24, 3, { done: 'kp_nd_great' }],
      ['talk', 'nd_lin', { done: tr('nd_lin') }],          // (in the dais hall, past the Great Bag)
      ['talk', 'nd_tifa', { done: badge(3) }]),
    ['expect', badge(3)],
    ['obj', 'Route 8: down the canyon to the desert'],
    ['goto', 'kp_sandsea'],
    ['kp_heal', { center: 'kp_sandsea_center' }],
    ['kp_buy', { kupo_nut: 10, golden_nut: 3, hi_oil: 6, max_oil: 1, battery: 2 }, { center: 'kp_sandsea_center' }],
    ['kp_heal', { center: 'kp_sandsea_center' }],
    ['obj', 'Sandsea: Sephiroth at the oasis'],
    win('kp_rival_sephiroth_6', 'kp_route8', ['goto', 'kp_sandsea'], ['walk', 9, 12, { done: 'kp_rival_sephiroth_6' }]),
    ['obj', 'The Sunken Ruins: the stones I to IV'],
    win('kp_ruins_door', null,                           // (a stone out of turn raises them all: then again from I)
      ['goto', 'kp_ruins_1'],
      ['walk', 29, 4, { done: { any: ['kp_ru_plate0', 'kp_ruins_door'] } }],
      ['walk', 3, 17, { done: { any: ['kp_ru_plate1', 'kp_ruins_door'] } }],
      ['walk', 3, 4, { done: { any: ['kp_ru_plate2', 'kp_ruins_door'] } }],
      ['walk', 29, 17, { done: 'kp_ruins_door' }]),
    ['expect', 'kp_ruins_door'],
    win('kp_ruins_key', 'kp_route8', ['goto', 'kp_ruins_2'], ['walk', 14, 6, { done: 'kp_ruins_key' }]),
    ['use', 16, 2, { map: 'kp_ruins_1', done: 'kp_ruins_northdoor' }],
    ['expect', 'kp_ruins_northdoor'],
    // Zack waits on the road into Skyport (its first steps), so the team trains on Route 9 first, repaired at Sandsea
    ['obj', 'Route 9: the badlands to Skyport'],
    ['kp_heal', { center: 'kp_sandsea_center' }],
    ['obj', 'Skyport: Zack on the cliff road'],
    win('kp_rival_zack_7', { train: 'kp_route9', center: 'kp_sandsea_center' }, ['goto', 'kp_skyport'], ['walk', 9, 28, { done: 'kp_rival_zack_7' }]),
    ['kp_heal', { center: 'kp_skyport_center' }],
    ['kp_buy', { kupo_nut: 10, golden_nut: 3, royal_nut: 1, hi_oil: 6, max_oil: 2, battery: 2 }, { center: 'kp_skyport_center' }],
    ['obj', "Skyport: Team Hojo's tower"],
    ['ckpt', 'kp_hq'],
    win('kp_hq_done', 'kp_route9',
      ['goto', 'kp_hojo_hq_1'],
      ['use', 14, 6, { done: 'kp_hq1_open' }],
      ['goto', 'kp_hojo_hq_2'],
      ['talk', 'hq2_sci', { done: tr('hq2_sci') }],
      ['goto', 'kp_hojo_hq_3'],
      ['walk', 9, 6, { done: 'kp_hq_done' }]),
    ['expect', 'kp_hq_done'],
    ['kp_heal', { center: 'kp_skyport_center' }],
    ['ckpt', 'kp_dojo4'],
    ['kp_equip'],
    ['kp_relearn'],
    ['obj', "Cid's Highwind Arcade: west, north, east"],
    win(badge(4), 'kp_route9',
      ['goto', 'kp_skyport_dojo'],
      // the pads: S west -> A, A north -> D, D east -> Cid's deck F (a trainer's sight on A can stop a walk mid-flight)
      ['walk', 10, 17, { done: { any: [on('kp_skyport_dojo', 2, 12, 7, 16), on('kp_skyport_dojo', 2, 3, 7, 7), on('kp_skyport_dojo', 10, 1, 17, 5)] } }],
      ['walk', 4, 12, { done: { any: [on('kp_skyport_dojo', 2, 3, 7, 7), on('kp_skyport_dojo', 10, 1, 17, 5)] } }],
      ['walk', 7, 4, { done: on('kp_skyport_dojo', 10, 1, 17, 5) }],
      ['talk', 'sd_cid', { done: badge(4) }]),
    ['expect', badge(4)],
    ['ckpt', 'kp_r3_end'],
  ];

  // ---- Region 4: Route 10, Bloomhaven (Dojo 5: Aeris), Route 11, Ravenmoor, the Lifestream Tower (Hojo 2), Dojo 6
  // (Vincent), Summit Road, the Kupo Coliseum, the Leagues, the legendaries
  const R4 = [
    ['chapter', 'kp_r4', 'Kupomon: Bloomhaven to the Kupo Coliseum'],
    ['expect', badge(4)],
    ['obj', 'Route 10 along the coast to Bloomhaven'],
    ['goto', 'kp_bloomhaven'],
    ['kp_heal', { center: 'kp_bloomhaven_center' }],
    ['kp_buy', { kupo_nut: 10, golden_nut: 3, royal_nut: 1, hi_oil: 6, max_oil: 3, battery: 3 }, { center: 'kp_bloomhaven_center' }],
    ['kp_heal', { center: 'kp_bloomhaven_center' }],
    ['ckpt', 'kp_dojo5'],
    ['kp_equip'],
    ['kp_relearn'],
    ['obj', "Aeris's Flower Arcade: the valves water the beds"],
    win(badge(5), 'kp_route10',
      ['goto', 'kp_bloom_dojo'],
      ['talk', 'bd_lily', { done: tr('bd_lily') }],
      ['use', 2, 2, { done: 'kp_bd_gold' }],
      ['talk', 'bd_moss', { done: tr('bd_moss') }],
      ['use', 17, 11, { done: '!kp_bd_gold' }],
      ['talk', 'bd_aeris', { done: badge(5) }]),
    ['expect', badge(5)],
    ['use', 17, 11, { done: 'kp_bd_gold' }],             // (out again: the valves in reverse)
    ['use', 2, 2, { done: '!kp_bd_gold' }],
    ['obj', 'Route 11, the misty marsh, to Ravenmoor'],
    ['goto', 'kp_ravenmoor'],
    ['kp_heal', { center: 'kp_ravenmoor_center' }],
    ['kp_buy', { kupo_nut: 10, golden_nut: 3, royal_nut: 1, hi_oil: 8, max_oil: 4, battery: 3 }, { center: 'kp_ravenmoor_center' }],
    ['kp_heal', { center: 'kp_ravenmoor_center' }],
    ['obj', 'Ravenmoor: Sephiroth in the graveyard'],
    win('kp_rival_sephiroth_8', 'kp_route11', ['goto', 'kp_ravenmoor'], ['walk', 8, 18, { done: 'kp_rival_sephiroth_8' }]),
    ['obj', "The Lifestream Tower: Hojo's Project J"],
    ['kp_upgrade', { map: 'kp_route12', train: 'kp_route12', minLv: LV(26) }],   // (a strong catch from Route 12 for the weakest)
    ['kp_equip'],
    ['kp_relearn'],
    ['kp_heal', { center: 'kp_ravenmoor_center' }],
    win('kp_hojo_done', 'kp_route12', ['goto', 'kp_lifestream_2'], ['talk', 'ls_nurse', { choose: 'Yes' }], ['walk', 10, 9, { done: 'kp_hojo_done' }]),   // (the nurse by the stairs first)
    ['kp_heal', { center: 'kp_ravenmoor_center' }],
    ['ckpt', 'kp_dojo6'],
    ['kp_equip'],
    ['kp_relearn'],
    ['obj', "Vincent's Nightmare Arcade: set the clock to IX"],
    win(badge(6), 'kp_route12',
      ['goto', 'kp_raven_dojo'],
      ['use', 9, 12, { done: 'kp_rd_a' }],
      ['use', 13, 12, { done: 'kp_rd_b' }],
      ['goto', 'kp_raven_dojo_2'],
      ['use', 5, 5, { done: 'kp_rd2_a' }],
      ['use', 12, 9, { done: 'kp_rd2_b' }],
      ['talk', 'rd_vincent', { done: badge(6) }]),
    ['expect', badge(6)],
    // back out: room 2's iron lever again (III) opens gate 1 (gate 2 closes behind)
    ['use', 12, 9, { done: '!kp_rd2_b' }],
    // Region 5 (the user's dojos 7 and 8, 2026-10-02): east of Ravenmoor, Route 15 to Candlerock (Red XIII's Ember
    // Arcade), Route 16 to Glimmerfair (Dio's Showtime Arcade), Route 17 back to Route 13 at the Badge Gate. The region
    // files' own steps (KP.PLANS: js/maps/kupomon/kp_region5a.js, kp_region5b.js)
    ['ckpt', 'kp_region5'],
    ['obj', 'East of Ravenmoor: Candlerock and the Ember Arcade'],
    ['kp_plan', 'r5a', { done: badge(7) }],
    ['expect', badge(7)],
    ['obj', 'Glimmerfair and the Showtime Arcade'],
    ['kp_plan', 'r5b', { done: badge(8) }],
    ['expect', badge(8)],
    ['obj', 'The Badge Gate and the Summit Road'],
    win(tr('su_ox'), 'kp_summit_1', ['goto', 'kp_summit_1'], ['talk', 'su_ox', { done: tr('su_ox') }]),
    // the Summit Road is the gauntlet (five-moogle trainers on sight): lost, the team wakes in Ravenmoor and goes again,
    // and the ones it beat stay beaten
    win({ map: 'kp_coliseum' }, 'kp_summit_1', ['goto', 'kp_coliseum']),
    ['kp_heal', { center: 'kp_coliseum_center' }],
    ['kp_buy', { royal_nut: 6, max_oil: 4 }, { center: 'kp_coliseum_center' }],
    ['obj', 'The whole team to Lv 50'],
    ['kp_train', LV(30), { map: 'kp_summit_2', spread: 0 }],
    ['kp_heal', { center: 'kp_coliseum_center' }],
    ['obj', 'The Kupo Coliseum: Zack at the gate'],
    win('kp_rival_zack_9', 'kp_summit_2', ['goto', 'kp_coliseum'], ['walk', 19, 27, { done: 'kp_rival_zack_9' }]),
    ['ckpt', 'kp_kupoleague'],
    // the Kupo League (js/maps/kupomon/kp_kupoleague.js): the end of the story. The Elite Four one after another (only
    // the bag between them), then the Champion's Chamber: Zack and Sephiroth fight for the empty seat (watched), and the
    // winner is the last battle. Lost anywhere: back to the Mog Center, and from the first room again
    ['kp_upgrade', { map: 'kp_summit_2', train: 'kp_summit_2', minLv: LV(27) }],
    ['kp_upgrade', { map: 'kp_summit_2', train: 'kp_summit_2', minLv: LV(27) }],
    ['kp_heal', { center: 'kp_coliseum_center' }],
    ['kp_buy', { hi_oil: 4, battery: 1 }, { center: 'kp_coliseum_center' }],   // (a few for the walk: no bag items in the League's battles, and each of the Four repairs the team)
    ['kp_equip'],
    ['kp_relearn'],
    ['obj', 'The Kupo League: the Elite Four and the Champion'],
    // (each step passed over once it's behind the party: a Demo continued from a file saved inside the League picks
    // up in the room it's in, as its rooms only lead on)
    win('kp_champion', { train: 'kp_summit_2', center: 'kp_coliseum_center', clause: true },
      ['talk', 'kl_guard', { map: 'kp_coliseum_hall', choose: 'Yes', done: inLeague }],
      ['talk', 'kl_elena', { map: 'kp_kl_1', done: 'kp_e4_1' }],
      ['goto', 'kp_kl_2', { done: 'kp_e4_2' }],
      ['talk', 'kl_reno', { map: 'kp_kl_2', done: 'kp_e4_2' }],
      ['goto', 'kp_kl_3', { done: 'kp_e4_3' }],
      ['talk', 'kl_rude', { map: 'kp_kl_3', done: 'kp_e4_3' }],
      ['goto', 'kp_kl_4', { done: 'kp_e4_4' }],
      ['talk', 'kl_tseng', { map: 'kp_kl_4', done: 'kp_e4_4' }],
      ['goto', 'kp_kl_champ', { done: 'kp_champion' }]),   // (on arrival: the rivals' bout, then the Champion)
    ['js', function* () { for (let i = 0; i < 30000 && !FF7.state.flags.kp_hof_done; i++) yield; return FF7.state.flags.kp_hof_done ? true : 'the Hall of Fame did not happen'; }],
    ['ckpt', 'kp_champion_kl'],
    // (Hard Mode, the user's Nuzlocke: the run ends at the Hall of Fame; the post-game's 100% needs more befriends than
    // one an area allows)
    ['kp_hard_end'],
    // the post-game: the tournaments on Costa del Kupo (Prof. Sith's ticket: the S.S. Moogle from the pier on Route 10;
    // losing is fine: a player tries again)
    ['obj', 'Post-game: the S.S. Moogle to Costa del Kupo, the tournament isle'],
    ['goto', 'kp_costa'],
    ['ckpt', 'kp_leagues'],
    ['kp_heal', { center: 'kp_costa_center' }],
    ['kp_equip'],                                   // (held items: no bag in the arena)
    ['kp_relearn'],
    ['obj', 'The Gold League'],
    ['kp_league', 1, { train: 'kp_summit_2' }],
    ['obj', 'The Platinum League'],
    ['kp_league', 2, { train: 'kp_summit_2' }],
    // the late leagues' teams are bred ("+2" to "+5"): so is ours, at the Kupo Ranch, with partners of Lv 25+ from
    // the Summit Road, each child raised to Lv 30 there
    ['ckpt', 'kp_breed2'],
    ['obj', 'The Kupo Ranch: a "+2" team for the Diamond League'],
    ['kp_breedup', { plus: 2, train: 'kp_summit_2', catch: 'kp_summit_2' }],
    ['kp_equip'],
    ['kp_relearn'],
    // (a Champion from the days of six dojos, a Demo continued from such a file: the two new ones now; nothing to do
    // for a game that won them on the way)
    ['obj', 'The two new dojos, east of Ravenmoor'],
    ['kp_plan', 'r5a', { done: badge(7) }],
    ['kp_plan', 'r5b', { done: badge(8) }],
    ['obj', 'The Diamond League'],
    ['kp_league', 3, { train: 'kp_summit_2' }],
    ['ckpt', 'kp_breed4'],
    ['obj', 'The Kupo Ranch: a "+4" team for the Master League'],
    ['kp_breedup', { plus: 4, train: 'kp_summit_2', catch: 'kp_summit_2' }],
    ['kp_equip'],
    ['kp_relearn'],
    ['obj', 'The Master League'],
    ['kp_league', 4, { train: 'kp_summit_2' }],
    ['ckpt', 'kp_breed5'],
    ['obj', 'The Kupo Ranch: a "+5" team for the World Championship'],
    ['kp_breedup', { plus: 5, train: 'kp_summit_2', catch: 'kp_summit_2' }],
    ['kp_equip'],
    ['kp_relearn'],
    ['obj', 'The World Championship'],
    ['kp_league', 5, { train: 'kp_summit_2' }],
    ['expect', 'kp_league_5'],
    ['ckpt', 'kp_champion'],
    // the legendaries and mythicals: each one's sidequest (docs/KUPOMON_LEGENDS.md; KP.QUESTS, the quest files' own
    // steps), every one open now; the Crystal Kupo Nut goes to the first
    ['obj', 'The legends: their sidequests'],
    ['kp_quests'],
    ['ckpt', 'kp_legends'],
    // the 100% (js/kupomon/kp_runner.js): every item on the maps, the whole Kupodex, every Skill Chip in the Marts (the
    // coins won at World Championship rematches), then the professor's diploma
    // (every area: its items, its people's gifts, its trainers, its wild moogles; done as the Demo walks through each,
    // R.kpSweep; whatever an area kept back, now: the user, 2026-10-04)
    ['obj', '100%: every area (items, gifts, trainers, moogles)'],
    ['kp_sweep_all'],
    ['obj', '100%: every item on the maps'],
    ['kp_items'],
    ['ckpt', 'kp_items'],
    ['obj', '100%: the Kupodex'],
    ['kp_quests'],   // (any quest the hunting opened)
    ['kp_dex'],
    ['ckpt', 'kp_dex'],
    ['obj', '100%: every Skill Chip'],
    ['kp_chips'],
    ['obj', 'The Kupodex Diploma from Prof. Sith'],
    ['talk', 'prof', { map: 'kp_lab', done: 'kp_diploma' }],
    ['expect', 'kp_diploma'],
    // (the sidequests that open late: a +5 egg, a swap chain, every cup and a title defended, the Diploma itself)
    ['obj', 'The last of the legends'],
    ['kp_quests'],
    // (and any item a late quest's map opened: the 100% again)
    ['obj', '100%: the last of every area'],
    ['kp_sweep_all'],
    ['obj', '100%: the last items on the maps'],
    ['kp_items'],
    ['ckpt', 'kp_end'],
  ];

  R.plans.kp = [].concat(R1, R2, R3, R4);

  // test starts for the later regions (headless: --start kp_from2 --plan kp_from2): a Kupomon game as it would stand
  // there (a team of five at the region's level, the badges, the story flags), at the region's first map
  const kpAt = (o) => () => {
    const K = KP();
    const st = FF7.state; (st.keyItems = st.keyItems || []).push('mogboy'); st.vars.mogboy_carts = 127;
    K.play(); K.enter(null, null);
    const k = FF7.state, d = k.kp;
    k.vars.kp_starter = 'kupwick_blackmage'; k.vars.kp_seph_starter = 'moglin_warrior'; k.vars.kp_zack_starter = 'pomsprout_whitemage';
    (o.flags || []).forEach(f => { k.flags[f] = true; });
    d.badges = (o.badges || []).slice(); d.badges.forEach(n => { k.flags['kp_badge_' + n] = true; });
    d.party = []; o.team.forEach(([sp, lv]) => K.receive(K.make(sp, lv)));
    Object.assign(d.bag, o.bag || { kupo_nut: 8, oil_can: 6, hi_oil: 2 }); d.money = o.money || 6000;
    d.repair = [o.center, 'repair'];
    FF7.fieldScene.load(o.map, o.entry);
  };
  const BASE = ['kp_intro', 'kp_starter', 'kp_rival1', 'kp_sent_off'];
  // region 3's story, done (the ways it opened: the Ruins' doors, Team Hojo out of Skyport)
  const R3_DONE = ['kp_ruins_door', 'kp_ruins_key', 'kp_ruins_northdoor', 'kp_sk_zack_met', 'kp_rival_zack_7', 'kp_hq1_open', 'kp_hq_done'];
  R.starts.kp_from2 = Object.assign({}, R.starts.kp, { after: kpAt({ map: 'kp_route4', entry: 'from_kurotsuki', center: 'kp_kurotsuki_center', badges: [1], flags: BASE,
    team: [['kupwick_blackmage', LV(14)], ['nutmog_treasure_hunter', LV(13)], ['mogpost_ranger', LV(13)], ['kurogen_genin', LV(13)], ['mogsquire_squire', LV(13)]] }) });
  R.plans.kp_from2 = [].concat([['chapter', 'kp', 'Kupomon (from region 2)']], R2, R3, R4);
  R.starts.kp_from3 = Object.assign({}, R.starts.kp, { after: kpAt({ map: 'kp_route7', entry: 'from_mogfield', center: 'kp_mogfield_center', badges: [1, 2], flags: BASE,
    team: [['kupwick_blackwizard', LV(19)], ['nutmog_treasure_hunter', LV(18)], ['mogpost_cannoneer', LV(18)], ['kurogen_kunoichi', LV(18)], ['mogsquire_knight', LV(18)]], bag: { kupo_nut: 10, golden_nut: 4, oil_can: 6, hi_oil: 4 } }) });
  R.plans.kp_from3 = [].concat([['chapter', 'kp', 'Kupomon (from region 3)']], R3, R4);
  R.starts.kp_from4 = Object.assign({}, R.starts.kp, { after: kpAt({ map: 'kp_route10', entry: 'from_skyport', center: 'kp_skyport_center', badges: [1, 2, 3, 4], flags: BASE.concat(R3_DONE),
    team: [['kupwick_blackwizard', LV(24)], ['nutmog_treasure_hunter', LV(23)], ['mogpost_cannoneer', LV(23)], ['kurogen_kunoichi', LV(23)], ['mogsquire_knight', LV(23)]], bag: { kupo_nut: 10, golden_nut: 6, royal_nut: 2, hi_oil: 6, max_oil: 2 } }) });
  R.plans.kp_from4 = [].concat([['chapter', 'kp', 'Kupomon (from region 4)']], R4);
  // Region 5's two halves on their own (the region files' KP.PLANS): from Ravenmoor with six badges (r5a: Route 15,
  // Candlerock, Dojo 7), and from Glimmerfair with seven (r5b: Dojo 8, Route 17 to Route 13)
  const R4_DONE = ['kp_hojo_done', 'kp_rival_sephiroth_8', 'kp_rv_sci'];
  const TEAM5 = [['kupwick_magus', 47], ['nutmog_ninja', 46], ['mogpost_cannoneer', 46], ['kurogen_kunoichi', 46], ['mogsquire_paladin', 46]];
  const BAG5 = { kupo_nut: 10, golden_nut: 6, royal_nut: 4, hi_oil: 8, max_oil: 4, battery: 3 };
  R.starts.kp_from5a = Object.assign({}, R.starts.kp, { after: kpAt({ map: 'kp_ravenmoor', entry: 'from_center', center: 'kp_ravenmoor_center', badges: [1, 2, 3, 4, 5, 6],
    flags: BASE.concat(R3_DONE, R4_DONE), team: TEAM5, bag: BAG5, money: 12000 }) });
  R.plans.kp_from5a = [['chapter', 'kp', 'Kupomon (Region 5: Candlerock)'], ['kp_plan', 'r5a', { done: badge(7) }], ['expect', badge(7)]];
  R.starts.kp_from5b = Object.assign({}, R.starts.kp, { after: kpAt({ map: 'kp_glimmerfair', entry: 'from_route16', center: 'kp_glimmerfair_center', badges: [1, 2, 3, 4, 5, 6, 7],
    flags: BASE.concat(R3_DONE, R4_DONE), team: TEAM5.map(([sp, lv]) => [sp, lv + 1]), bag: BAG5, money: 14000 }) });
  R.plans.kp_from5b = [['chapter', 'kp', 'Kupomon (Region 5: Glimmerfair)'], ['kp_plan', 'r5b', { done: badge(8) }], ['expect', badge(8)], ['goto', 'kp_route13'], ['expect', { map: 'kp_route13' }]];
})();
