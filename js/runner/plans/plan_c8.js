// Runner plan, Chapter 8 (docs/RUNNER.md): the Keystone, the Temple of the Ancients, Bone Village, the
// Sleeping Forest and the Forgotten Capital (the end of Disc 1), then the Corral Valley cave.
// From Wutai by Tiny Bronco to Costa del Sol's shore, over Mt. Corel to North Corel and up the ropeway (a
// 1-day pass). Cait Sith's Hideout, our extra, on this visit (the booth broken with ten fortunes, the workshop, his
// four parts round North Corel and by the Weapon Seller, MOG Mk.II, the cold stare). Dio's showroom (the Keystone; Dio's eight-battle show, Cloud alone: a perfect run adds the
// Protect Vest and the Choco Feather), the broken ropeway, the Ghost Hotel, the date (Aeris: the most
// affection; the play: "I've come to save the princess", Fight, Princess Rosa; the gondola), Cait Sith
// stealing the Keystone and his confession (the wardrobe Elixir), back down and over Mt. Corel to the Bronco.
// The Temple (Cloud, Aeris, Cid; Cid in the back row with Long Range): Tseng, the maze (Mind Source, Turbo
// Ether, Luck Plus, Trident, Rocket Punch; the Ancient's room: Silver Rifle, Hi-Potions and Tents, save), the
// boulders (Morph), the clock (IIII Princess Guard, V Ribbon, VII Trumpet Shell, VIII Megalixir; I: Toxic
// Frogs, Impaler stolen; III: two 8 Eyes, Morph tried for Magic Sources; the second hand's pit on purpose:
// Nail Bat), the gate of doorway VI (Work Glove), the murals, Red Dragon (Bahamut, Dragon Armlet), the model
// (Cait Sith stays), Demons Gate (Gigas Armlet), the Black Materia. Gongaga, then Bone Village (the four
// treasure-map digs, no diggers hired: Lunar Harp, Buntline, Megalixir, Mop; Diamond Bangle / Rune Armlet),
// the Sleeping Forest (Kjata, Water Ring), the Forgotten Capital (Magic Source, Guard Source, Enemy Skill,
// Elixir, Comet, Aurora Armlet; L4 Suicide from a Trickplay; the night's rest), Aeris and Jenova·LIFE (Wizard
// Bracelet), Disc 2, Corral Valley (Viper Halberd) and its cave (Magic Plus, Bolt Armlet, Hypnocrown,
// Megalixir, Power Source), out toward Icicle Inn.
// First, Aeris's Great Gospel: Mythril from the Sleeping Man (the battle count steered to 11/33/55/77/99), the
// Weapon Seller's small box. Not done: Aqualung and Big Guard are already known from
// C6a (Jenova·LIFE's Aqualung would teach it otherwise); Death Force (Adamantaimai, Wutai's far south beach)
// is left for later; the Bone Village "normal treasure" spots (random Elixir / Ether) aren't dug.
(function () {
  const R = FF7.runner;

  // ---------------------------------------------------------------- start profile
  // C7's real end state (its c7_end checkpoint, played from C6a's): the world map outside Wutai, the Tiny
  // Bronco on the shore; every flag C1-C7 set; the Enemy Skill materia with what they learned.
  const FLAGS_C8 = (
    'aeris_joined c12a_caught_chocobo c12a_ninja_met c12a_ninja_talk c1_bought_flower c1_train_talk c4_decided c4_eskill c5a_arrived c5a_ether_a ' +
    'c5a_ether_clock c5a_ether_far c5a_fb_arrived c5a_fb_bridge c5a_fb_chase c5a_fb_days c5a_fb_door c5a_fb_end c5a_fb_fall c5a_fb_fire c5a_fb_fire_seen ' +
    'c5a_fb_fountain c5a_fb_library1 c5a_fb_library2 c5a_fb_mansion_in c5a_fb_mom c5a_fb_morning c5a_fb_night c5a_fb_path c5a_fb_piano c5a_fb_reactor ' +
    'c5a_fb_tifa c5a_fb_truck c5a_flashback_done c5a_geared c5a_guard_source c5a_mako_asked c5a_materia c5a_megalixir c5a_old_asked c5a_piano_jammed ' +
    'c5a_piano_tune c5a_potions c5a_story_start c5b_airport_arrived c5b_arrived c5b_bill_talked c5b_billy_talked c5b_bottomswell c5b_chocomog ' +
    'c5b_condor_fund c5b_condor_gate c5b_condor_joined c5b_condor_shop c5b_condor_w1 c5b_condor_w2 c5b_condor_w3 c5b_disguised c5b_dolphin_jump ' +
    'c5b_engine_seen c5b_farm_arrived c5b_gear_junon c5b_in_water c5b_jenova_birth c5b_junon_arrived c5b_junon_slept c5b_mine_entered c5b_parade_done ' +
    'c5b_phs_taken c5b_priscilla_saved c5b_sendoff_done c5b_setup1 c5b_setup2 c5b_setup3 c5b_ship_aeris c5b_ship_alarm c5b_ship_boarded c5b_ship_intro ' +
    'c5b_ship_red c5b_ship_tifa c5b_shiva c5b_solo c5b_tifa_talk c5b_turks_mine c5b_undisguised c5b_whistle c5b_zolom_seen c6a_arrived c6a_ball ' +
    'c6a_barret_left c6a_barret_rejoined c6a_barret_story c6a_bridge_down c6a_buggy_setup c6a_costa_left c6a_done c6a_dyne_done c6a_framed c6a_gbike_prize ' +
    'c6a_gear_costa c6a_gear_ncorel c6a_hojo_talked c6a_jockey_intro c6a_johnny_tifa c6a_junk_seen c6a_miner_talked c6a_mog_cleared c6a_mog_reward ' +
    'c6a_ncorel_arrival c6a_ncorel_ether c6a_nest c6a_oldman_talked c6a_prison_arrival c6a_prison_setup c6a_prison_shop c6a_race_explained c6a_race_intro ' +
    'c6a_race_started c6a_saw_saucer c6a_turtle_flyer3 c6a_umbrella c6a_waterside_seen c6a_wizard_staff c6b_buggy_repaired c6b_candle_done c6b_candle_intro ' +
    'c6b_candle_start c6b_cosmo_arrived c6b_done c6b_elixir c6b_farewell c6b_gi_asked c6b_gi_intro c6b_gi_nattak c6b_gi_oil_seen c6b_gi_open c6b_gi_rock3 ' +
    'c6b_gi_secret c6b_gi_web c6b_gongaga_arrived c6b_met_bugen c6b_planetarium c6b_reactor_scene c6b_reactor_seen c6b_rested c6b_seto c6b_shopped ' +
    'c6b_titan c6b_turks_done c6b_turtle_flyer4 c6b_turtle_flyer5 c6b_village_seen c6b_wasteland_seen c6b_zack_friends c6b_zack_heard c7_bronco_seen ' +
    'c7_cid_met c7_clgift_cloak_fire c7_clgift_cloak_inn c7_clgift_cloak_kid1 c7_clgift_cloak_tifa1 c7_clgift_cloak_tifa2 c7_cltat_cloak_fire ' +
    'c7_cltat_cloak_inn c7_cltat_cloak_kid1 c7_cltat_cloak_tifa1 c7_cltat_cloak_tifa2 c7_coffin_unlocked c7_dachao_seen c7_keeper_dead c7_mansion_in ' +
    'c7_mansion_passage c7_nibel_arrived c7_nibel_base c7_nibel_bridge c7_nibel_ladder c7_nibel_ledge_hint c7_nibel_path c7_palmer_done c7_piano_gil ' +
    'c7_piano_tune c7_reactor_seen c7_rocket_arrived c7_safe_open c7_seph_library c7_set_out c7_shera_met c7_tea c7_tifa_room c7_turtle_flyer6 ' +
    'c7_turtle_sign c7_vincent_1 c7_vincent_2 c7_wq_bell c7_wq_kidnap c7_wq_mpabsorb c7_wq_pot c7_wq_pubturks c7_wq_rapps c7_wq_screen c7_wq_shrine ' +
    'c7_wq_stolen c7_wq_town c7_wq_trap c7_wq_turks c7_wutai_arrived c7_wutai_done c7_yoshiyuki cait_joined chocobo_lure cid_joined ' +
    'got_costa_villa_firering got_costa_villa_motordrive got_costa_villa_powersource got_gi_caverns_added_effect got_gi_nattak_fairy_ring ' +
    'got_gi_nattak_turbo_ether got_gi_oil_black_mphone got_gi_oil_ether got_gi_web_xpotion got_gongaga_house_mphone got_gongaga_inn_xpotion ' +
    'got_gongaga_jungle2_deathblow got_gs_jockey_ramuh got_junon_apt_eskill got_junon_apt_guard got_junon_apt_luck got_junon_apt_mind got_junon_apt_power ' +
    'got_junon_apt_soldier got_junon_rooms_soldier got_junon_rooms_speed got_kalm_tower_peacemaker got_mansion_1fe_mphone got_mansion_1fn_viper ' +
    'got_mansion_2fe_msource got_mansion_2fw_launcher got_mine_cavern_mindsource got_mine_north_elixir got_mine_north_hipotion got_mine_steps_tent ' +
    'got_mine_vines_ether got_mine_vines_longrange got_mtcorel_cave_mindsource got_mtcorel_cave_powersource got_mtcorel_cave_tent ' +
    'got_mtcorel_tracks2_starpendant got_mtcorel_tracks2_transform got_mtcorel_tracks2_turboether got_mtcorel_tracks2_wmg got_mtnibel_all ' +
    'got_mtnibel_cave1_elixir got_mtnibel_cave2_sniper got_mtnibel_elemental got_mtnibel_plus_barrette got_mtnibel_powersoul got_mtnibel_rune_blade ' +
    'got_rocket_cid_drill_arm got_rocket_house_e_power got_ship_engine_ifrit got_ship_engine_windslash got_ship_hold_all got_ship_hold_ether ' +
    'got_wutai_cat_hpabsorb got_wutai_dachao_cave_dragoon_lance got_wutai_godo_hairpin got_wutai_godo_shuriken got_wutai_shrine_elixir ' +
    'got_wutai_shrine_swiftbolt got_wutai_yhouse_mpabsorb has_bronco has_buggy has_phs left_midgar trig_fb_bridge_collapse trig_gi_nattak_boss ' +
    'trig_gongaga_jungle1_turks trig_gongaga_reactor_scarlet trig_junon_airport_highwind trig_junon_lower_priscilla_gift trig_junon_street2_glimpse ' +
    'trig_mansion_basement_library trig_mansion_coffin_vincent_join trig_mansion_stairs_first_look trig_mine_exit_turks trig_mine_vines_vine_hint ' +
    'trig_mtcorel_bridge_creak trig_mtcorel_cabin_birds trig_mtcorel_tracks1_weak2 trig_mtcorel_tracks2_dead_end trig_mtnibel_bridge_midspan ' +
    'trig_mtnibel_pipes_keeper trig_mtnibel_pipes_see_keeper trig_mtnibel_reactor_reactor trig_nibel_tifa_house_tifa_room trig_prison_dyne_dyne ' +
    'trig_rocket_engine_meet_cid trig_ship_engine_birth trig_wutai_outskirts_yuffie_heist trig_wutai_yuffie_house_lev_talk vincent_joined yuffie_joined ').trim().split(/\s+/);
  R.starts.c8 = {
    world: {"x":43,"y":106},
    members: ["cloud","tifa","aeris","redxiii","caitsith","barret","vincent","cid","yuffie"],
    party: ["cloud","yuffie","cid"],
    levels: {"cloud":38,"tifa":35,"aeris":31,"redxiii":33,"caitsith":31,"barret":32,"vincent":35,"cid":37,"yuffie":36},
    names: {"cloud":"Cloud","tifa":"Tifa","aeris":"Aeris","redxiii":"Red XIII","caitsith":"Cait Sith","barret":"Barret","vincent":"Vincent","cid":"Cid","yuffie":"Yuffie"},
    phs: true,
    flags: FLAGS_C8,
    vars: {"c12b_on_choco":0,"c5a_party":"barret,tifa","aff_barret":5,"c5a_cabinet":5,"aff_tifa":0,"chocobo_pen":[],"chocobo_color":"yellow","c12a_riding":0,"c5b_condor_funds":10000,"mg_best_fort_condor":620,"c5b_condor_prize":3,"mg_best_cpr":5,"mg_best_dolphin":100,"mg_best_parade":66,"aff_aeris":15,"mg_best_motorcycle_gbike":19975,"mg_best_shooting_speed_square":7720,"turtle_flyers":4,"mg_esther_try":0,"mg_best_chocobo_race":6,"c7_cl_cloak_inn":1,"c7_cl_cloak_fire":1,"c7_cl_cloak_kid1":1,"c7_cl_cloak_tifa1":1,"c7_cl_cloak_tifa2":1,"c7_oldman_talks":2,"c7_materia_backup":0,"aff_yuffie":10},
    items: {"phoenix_down":31,"ether":8,"elixir":7,"hyper":2,"tranquilizer":2,"grenade":2,"megalixir":1,"peacemaker":1,"lasan_nut":1,"mythril_clip":1,"bronze_bangle":1,"tent":5,"1_35_soldier":2,"buster_sword":1,"4_point_shuriken":1,"motor_drive":1,"w_machine_gun":1,"bolt_plume":3,"star_pendant":2,"mythril_rod":1,"t_s_bomb":2,"hi_potion":51,"wizard_staff":1,"fairy_tale":1,"white_m_phone":1,"wind_slash":1,"m_tentacles":5,"black_m_phone":1,"fairy_ring":1,"wizer_staff":1,"magic_comb":1,"mythril_armlet":4,"war_gong":1,"platinum_fist":1,"twin_viper":1,"mirror":4,"turbo_ether":1,"cosmo_memory":1,"plus_barrette":1,"powersoul":1,"fire_fang":1,"yoshiyuki":1,"silver_armlet":1,"drill_arm":1,"yellow_m_phone":1,"swift_bolt":1,"spear":1,"x_potion":1,"rune_blade":1,"headband":1},
    keyItems: ["phs","basement_key"],
    gil: 86588,
    vehicles: {"buggy":{"x":115,"y":208},"bronco":{"x":43,"y":109}},
    equip: {
      cloud: {"weapon":"murasame","armor":"gold_armlet","accessory":"power_wrist"},
      tifa: {"weapon":"tiger_fang","armor":"gold_armlet","accessory":"power_wrist"},
      aeris: {"weapon":"umbrella","armor":"edincoat","accessory":"peace_ring"},
      redxiii: {"weapon":"seraph_comb","armor":"silver_armlet","accessory":"white_cape"},
      caitsith: {"weapon":"silver_m_phone","armor":"silver_armlet","accessory":"peace_ring"},
      barret: {"weapon":"enemy_launcher","armor":"silver_armlet","accessory":"talisman"},
      vincent: {"weapon":"sniper_cr","armor":"silver_armlet","accessory":"fire_ring"},
      cid: {"weapon":"dragoon_lance","armor":"gold_armlet","accessory":"protect_vest"},
      yuffie: {"weapon":"razor_ring","armor":"gold_armlet","accessory":"jem_ring"},
    },
    materia: {
      cloud: ["restore","all","poison","transform",{"id":"enemy_skill","eskills":["matra_magic","laser","aqualung","big_guard","frog_song","death_sentence","flame_thrower","magic_hammer"]},"choco_mog","shiva","time","ice"],
      barret: [null,null,null,"long_range"],
      cid: ["odin",null,"destruct","ifrit",null,null,null,null,"fire","all","cover","counter_attack"],
      yuffie: ["lightning","all","steal",{"id":"enemy_skill","eskills":["matra_magic","flame_thrower","laser","aqualung","big_guard","frog_song","death_sentence","question","magic_hammer"]},"restore","ramuh","titan","manipulate","gravity"],
    },
    stock: ["sense","chocobo_lure","elemental","throw","deathblow","added_effect","elemental","mp_absorb","hp_absorb"],
  };

  // ---------------------------------------------------------------- helpers
  // down from the Gold Saucer after the confession (the marker, or anywhere off the Saucer's maps)
  const LEFT = (s, R) => s.flag('c8_left_saucer') || (s.flag('c8_cait_spy') && !/^gs/.test(R.where()));
  // Mt. Corel, map by map from Costa del Sol's side to the ropeway: a resume on one of these maps skips the
  // gotos already behind it (going: toward North Corel; coming back: toward the Bronco)
  const CORE = ['mtcorel_path1', 'mtcorel_reactor', 'mtcorel_tracks1', 'mtcorel_tracks2', 'mtcorel_cabin', 'mtcorel_waterside', 'mtcorel_bridge', 'ncorel_town', 'ncorel_ropeway'];
  const GOING = (m) => (s, R) => s.flag('c8_gs_back') || s.flag('c8_keystone_got') || CORE.indexOf(R.where()) >= CORE.indexOf(m);
  const BACK = (m) => (s, R) => s.flag('c8_back_over') || (LEFT(s, R) && CORE.indexOf(R.where()) >= 0 && CORE.indexOf(R.where()) <= CORE.indexOf(m));
  // the boulders: the question box names the side of the hollow
  const HOLLOW = (ch, w) => {
    const t = ((w && w.pages) || []).map(p => p.join(' ')).join(' ');
    const m = /on the (left|middle|right)!/i.exec(t);
    return m ? ['left', 'middle', 'right'].indexOf(m[1].toLowerCase()) : null;
  };
  HOLLOW.toString = () => 'HOLLOW';

  // ---- Cait Sith's Hideout (our extra, js/maps/extra/cait_hideout.js; skipped when Config > Extras has it off)
  const CAIT_OFF = () => !!(FF7.state && FF7.state.config && FF7.state.config.caitHideout === false);
  const CAIT = (flag) => (s) => CAIT_OFF() || s.flag('cait_quest_done') || s.flag(flag);
  const HILL_PARTS = ['cait_mainspring', 'cait_stinger', 'cait_eye'];
  const HILLS_DONE = (s) => CAIT('cait_parts_all')(s) || s.flag('cait_mog_beaten') || HILL_PARTS.every(k => FF7.sys.inv.hasKey(k));
  // (down the ropeway for the parts: off the Saucer's maps, or past that)
  const CAIT_DOWN = (s, R) => CAIT('cait_mog_beaten')(s) || !/^gs/.test(R.where());
  // (back up for the cold stare: on the Saucer's maps with the robot beaten)
  const CAIT_UP = (s, R) => CAIT_OFF() || s.flag('cait_quest_done') || (s.flag('cait_mog_beaten') && /^gs/.test(R.where()));
  const CAIT_FIXED = (s) => CAIT_OFF() || s.flag('cait_booth_fixed');
  // the world map region the party stands in (null off the world map)
  const WORLD_REGION = () => {
    const ws = R.worldScene(), G = FF7.data.world.regions; if (!ws || !G) return null;
    const row = G.rows[Math.floor(ws.pz)]; return row ? G.legend[row[Math.floor(ws.px)]] || null : null;
  };
  // a question's answers for a step that doesn't take its own (use)
  let caitSeq = 0;
  function* useWith(x, y, answers, o = {}) {
    const tag = 'c8cait#' + (++caitSeq);
    [].concat(answers).forEach(a => R.choices.push({ a, pc: tag }));
    try { return yield* R.ops.use(x, y, o); } finally { R.choices = R.choices.filter(c => c.pc !== tag); }
  }
  // ---- part two: the arcade model, every Wonder Square game once, the MogBoy and the Arcade Library
  const ARC = (flag) => (s) => CAIT_OFF() || s.flag(flag);
  // ['c8_caitSwitch']: the hidden switch on the booth's left side (Wonder Square), then in through the door
  R.ops.c8_caitSwitch = function* () {
    if (R.where() !== 'gs_wonder') { const g = yield* R.ops.goto('gs_wonder'); if (g !== true) return 'switch: ' + g; }
    if (!FF7.state.vars.cait_door_open) { const r = yield* useWith(21, 2, ['Press it'], { from: [20, 2] }); if (r !== true) return 'switch: ' + r; }
    const r = yield* R.ops.exit('gs_cait_hideout');
    return r === true || r === 'mapchanged' || R.where() === 'gs_cait_hideout' ? true : 'switch: ' + r;
  };
  // ['c8_arcadeRound']: one go on every game in Wonder Square he hasn't heard about yet (the minigames play themselves:
  // the runner's minigame bot), whatever the result
  const ARCADE = { dunk: [2, 2, ['Play']], gbike: [9, 2, ['Play']], catcher: [10, 8, ['Play']], mog: [24, 2, ['Play']],
    battler: [17, 2, ['Play']], condor: [4, 8, [0, 0]], snow: [5, 2, [0]], torpedo: [13, 2, [0]] };
  R.ops.c8_arcadeRound = function* () {
    const CA = FF7.story.caitArcade;
    for (let n = 0; n < 12 && CA && CA.left().length; n++) {
      if (R.where() !== 'gs_wonder') { const g = yield* R.ops.goto('gs_wonder'); if (g !== true) return 'arcade: ' + g; }
      const key = CA.left()[0];
      let r;
      if (key === 'arm') {
        const tag = 'c8arm#' + (++caitSeq); R.choices.push({ a: 'Sumo Wrestler', pc: tag });
        try { r = yield* R.ops.talk('wrestler'); } finally { R.choices = R.choices.filter(c => c.pc !== tag); }
      } else if (ARCADE[key]) r = yield* useWith(ARCADE[key][0], ARCADE[key][1], ARCADE[key][2]);
      else return 'arcade: no machine for ' + key;
      if (r !== true && r !== 'mapchanged') return 'arcade: ' + key + ': ' + r;
      yield* R.settle(6);
    }
    return CA && CA.left().length ? 'arcade: still to play: ' + CA.left().join(', ') : true;
  };
  // ['c8_buyCarts']: at the Arcade Library (MOG Mk.II's bay), every cartridge that's out and the GP covers
  R.ops.c8_buyCarts = function* () {
    const CA = FF7.story.caitArcade; if (!CA) return true;
    let gp = FF7.state.gp || 0;
    const open = CA.carts().filter(c => c.open && !c.owned && c.shop !== false);
    const want = open.filter(c => { if (c.gp > gp) return false; gp -= c.gp; return true; });
    const skipped = open.filter(c => !want.includes(c));
    if (skipped.length) R.note('Arcade Library: not enough GP for ' + skipped.map(c => c.title).join(', '));
    if (!want.length) return true;
    const r = yield* useWith(6, 2, want.map(c => c.title).concat(['Leave']));
    return r === true || r === 'mapchanged' ? true : 'library: ' + r;
  };

  // the Demo's status line while hunting the parts: what's still missing and which monster has it
  const PART_FROM = { cait_mainspring: 'Grangalan', cait_stinger: 'Needle Kiss', cait_eye: 'Cokatolis', cait_card: 'Joker' };
  const PARTS_LEFT = (ids) => "Hunting Cait Sith's parts: " + ids.filter(k => !FF7.sys.inv.hasKey(k)).map(k => (FF7.data.keyItems[k] || {}).name + ' (' + PART_FROM[k] + ')').join(', ');
  // ['c8_mogAmbush']: a step on the world map with all four parts, and MOG Mk.II's scene and boss fight play (a world
  // step hook, js/maps/extra/cait_hideout.js); then back on the world map. Not training (no R.activity text), so the
  // Demo plays it at the chosen speed, not 32x
  R.ops.c8_mogAmbush = function* () {
    for (let n = 0; n < 8 && !FF7.state.flags.cait_mog_beaten; n++) {
      const ws = R.worldScene();
      if (!ws) { yield* R.settle(10); continue; }
      const x = Math.floor(ws.px), y = Math.floor(ws.pz), E = R.entries(), D = R.worldD();
      const to = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy])
        .find(([a, b]) => R.worldCan(ws, ws.vehicle, a, b) && !E[((a % D.w) + D.w) % D.w + ',' + b]);
      if (!to) return 'MOG Mk.II: no room for a step here';
      yield* R.walkWorld([to], { anywhere: true });
      yield* R.settle(10);
    }
    return FF7.state.flags.cait_mog_beaten ? true : 'MOG Mk.II never turned up';
  };
  // ['c8_fortunes']: the Crystal Fortune (50 gil a go), reading after reading on one visit, until it breaks (the
  // tenth in a row) and Cait Sith pushes it aside
  R.ops.c8_fortunes = function* () {
    for (let n = 0; n < 12 && !FF7.state.flags.cait_hideout_found; n++) {
      const r = yield* useWith(21, 2, ['Tell my fortune'], { from: [21, 3] });
      if (r !== true) return 'fortunes: ' + r;
    }
    return FF7.state.flags.cait_hideout_found ? true : 'fortunes: the booth never broke';
  };
  // ['c8_caitIn']: through the door behind the booth until he lets the party stay (he shoos it out twice)
  R.ops.c8_caitIn = function* () {
    for (let n = 0; n < 5 && !FF7.state.flags.cait_hideout_welcome; n++) {
      if (R.where() !== 'gs_wonder') { const g = yield* R.ops.goto('gs_wonder'); if (g !== true) return 'hideout: ' + g; }
      yield* R.ops.exit('gs_cait_hideout');
      yield* R.settle(8);
    }
    return FF7.state.flags.cait_hideout_welcome ? true : 'hideout: he never let the party in';
  };
  // ['c8_caitLook']: everything in the workshop looked at (the tenth starts the quest); tiles of each thing's talk spot
  const CAIT_THINGS = [['spares', 1, 1], ['bay', 6, 2], ['toys', 11, 1], ['radio', 12, 3], ['midgar', 6, 4], ['bench', 1, 4],
    ['plans', 0, 7], ['crates', 11, 7], ['bed', 1, 8], ['cabinet', 12, 4]];
  // (a thing takes several tiles, each its own talk object with the same script: any of them will do)
  function* lookAt(x, y) {
    const fs = R.field(); if (!fs) return 'not on a field map';
    const ob = fs.objects.find(q => q.kind === 'object' && q.talk && q.at[0] === x && q.at[1] === y);
    if (!ob) return 'nothing to look at at ' + x + ',' + y;
    const r = yield* R.interact('look at ' + x + ',' + y, sel => sel.kind === 'object' && sel.o.talk === ob.talk, () => [x, y]);
    if (r === true) yield* R.settle(4);
    return r;
  }
  R.ops.c8_caitLook = function* () {
    for (let k = 0; k < CAIT_THINGS.length && !FF7.state.flags.cait_quest_started; k++) {
      if ((FF7.state.vars.cait_seen || 0) & (1 << k)) continue;
      const [what, x, y] = CAIT_THINGS[k];
      const r = yield* lookAt(x, y);
      if (r !== true) return 'workshop: ' + what + ': ' + r;
    }
    return FF7.state.flags.cait_quest_started ? true : 'workshop: the quest did not start';
  };

  // ---- the clock room: ['c8_clock', n] moves the long hand to doorway n (1-11) and takes what the
  // chamber holds (a chest, or its monsters); 'pit' is the pit under the clock (the Nail Bat). The second
  // hand comes round at random: until the Nail Bat is in the bag the runner keeps walking ("Keep going")
  // and lets it knock him into the pit, then climbs back through the maze and the boulder corridor.
  const ROOM_DONE = {
    1: s => s.flag('c8_room1_battle'), 3: s => s.flag('c8_room3_battle'),
    4: s => s.flag('got_temple_room4_princess_guard'), 5: s => s.flag('got_temple_room5_ribbon'),
    7: s => s.flag('got_temple_room7_trumpet_shell'), 8: s => s.flag('got_temple_room8_megalixir'),
    2: () => false, 9: () => false, 11: () => false,
    pit: s => s.flag('got_temple_pit_nail_bat'),
  };
  R.ops.c8_clock = function* (n, o = {}) {
    const s = R.api(), done = () => ROOM_DONE[n](s), st = FF7.state;
    const pc = R.pc;
    for (let g = 0; g < 12; g++) {
      const where = R.where();
      if (where === 'temple_alcove') {
        const fs = R.field(), ch = fs.objects.find(q => q.kind === 'chest' && !q.open);
        if (ch) { const r = yield* R.ops.item(ch.id); if (r !== true) return r; }
        const r = yield* R.ops.exit(0);                            // back out onto the clock face
        if (r !== true) return r;
        if (done() || n === 2) return true;
        continue;
      }
      if (where === 'temple_pit') {
        let r = yield* R.ops.item('temple_pit_nail_bat'); if (r !== true) return r;
        r = yield* R.ops.exit(0); if (r !== true) return r;
        yield* R.settle(10);
        continue;
      }
      if (where === 'temple_maze' || where === 'temple_boulders') {
        const r = yield* R.gotoMap('temple_clock'); if (r !== true && r !== 'mapchanged') return 'c8_clock: ' + r;
        continue;
      }
      if (where !== 'temple_clock') return 'c8_clock: not in the clock room (' + where + ')';
      if (done()) return true;
      // the gear: the doorway (its numeral's index), then walk on or wait for the second hand
      const fall = !st.flags.got_temple_pit_nail_bat;
      R.choices.push({ a: (n === 'pit' ? 2 : n) - 1, pc }, { a: fall ? 'Keep going' : 'Stop and wait', pc });
      const r = yield* R.ops.use(16, 11);
      R.choices = R.choices.filter(c => c.pc !== pc);
      if (r !== true && r !== 'mapchanged') return 'c8_clock: ' + r;
      yield* R.settle(6);
    }
    return done() ? true : 'c8_clock: doorway ' + n + ' not done';
  };

  // ---- Bone Village: the treasure map's spots (x, y of each 2x2 digging rect). Walking to one may cross
  // another spot's rect first: "Dig here" only on the one we're after.
  const SPOT = { 1: [9, 4], 2: [34, 2], 3: [14, 16], 4: [22, 15] };
  const DIG = (n) => () => {
    const f = R.field(); if (!f || f.map.id !== 'bone_village') return null;
    const [x, y] = SPOT[n], p = f.player;
    return p.tx >= x && p.tx <= x + 1 && p.ty >= y && p.ty <= y + 1 ? 0 : 1;
  };
  const DIGN = (n) => { const f = DIG(n); f.toString = () => 'DIG' + n; return f; };
  const digSteps = (n, what, flag) => [
    ['talk', 'boss', { done: flag, choose: [what, 'None'] }],     // no diggers: we know the spot
    ['walk', SPOT[n][0], SPOT[n][1], { done: flag, choose: [DIGN(n), DIGN(n), DIGN(n), DIGN(n)] }],
    ['use', 23, 22, { done: flag }],                                // the treasure box by the entrance
    ['expect', flag],
  ];
  // ---- Aeris leaves after the Temple with her weapon and armour (her materia and accessory come back): the
  // plainest armour in the bag goes on her first, so a Dragon Armlet doesn't go with her
  R.ops.c8_aeris_armor = function* () {
    const st = FF7.state, c = st.chars.aeris, G = R.gear;
    if (!c || !st.members.includes('aeris') || st.flags.aeris_dead) return true;
    const val = (id) => id ? G.score(c, 'armor', id) : -1;
    const bag = st.items.map(e => e.id).filter(id => { const f = FF7.util.findItem(id); return f && f.kind === 'armor' && FF7.ui.canEquip(c, 'armor', id); });
    const plain = bag.sort((a, b) => val(a) - val(b))[0];
    if (!plain || val(plain) >= val(c.armor)) return true;
    const r = yield* R.ops.equip('aeris', 'armor', plain);
    R.note('Aeris: ' + FF7.util.itemName(plain) + ' on before she leaves (' + (r === true ? 'ok' : r) + ')');
    return yield* R.ops.autoequip({ members: st.members.filter(id => id !== 'aeris') });   // her old armour to whoever it suits
  };
  // ---- L4 Suicide (Trickplay) only hits a level that divides by 4: the master Enemy Skill materia goes to a
  // party member whose level does (nobody in the party is: a reserve member whose level is swaps in through the
  // PHS), then the usual E.Skill learning. Levels go up as the party fights, so the holder is chosen again
  // before every battle (a full run lost it when Cloud went from 40 to 41 and Tifa from 36 to 37)
  R.ops.c8_l4 = function* (o = {}) {
    if (R.masterKnows('l4_suicide')) return true;
    const st = FF7.state, lv = () => FF7.sys.party.active().map(c => c.name + ' ' + c.level).join(', ');
    const toNext = (c) => FF7.sys.stats.xpToNext(c);
    let before = null, setUp = false;
    for (let b = 0; b < (o.battles || 20) && !R.masterKnows('l4_suicide'); b++) {
      let act = FF7.sys.party.active().filter(c => c.level % 4 === 0);
      if (!act.length) {
        const sub = st.members.filter(id => !st.party.includes(id) && id !== 'aeris' && id !== 'sephiroth' && st.chars[id] && st.chars[id].level % 4 === 0)
          .sort((a, b2) => st.chars[b2].level - st.chars[a].level)[0];
        if (!sub) {
          // nobody at a multiple of 4, in the party or the reserve: train whoever needs the least EXP to reach the next
          // one (Tifa 35 -> 36), as a player would, then carry on with them
          const ST = FF7.sys.stats, need = (c) => { const t = Math.ceil((c.level + 1) / 4) * 4; return t > 99 ? Infinity : ST.xpFor(c.id, t) - c.xp; };
          const who = FF7.sys.party.active().filter(c => isFinite(need(c))).sort((x, y) => need(x) - need(y))[0];
          if (!who || o.noTrain) { R.note('L4 Suicide: no one is at a level that divides by 4 (' + lv() + ')'); break; }
          const to = Math.ceil((who.level + 1) / 4) * 4;
          R.note('L4 Suicide: training ' + who.name + ' from ' + who.level + ' to ' + to + ' (' + lv() + ')');
          R.l4Training = 'Training ' + who.name + ' to level ' + to + ' (L4 Suicide only hits levels that divide by 4)';
          const g = yield* R.grind(() => FF7.sys.party.active().some(c => c.level % 4 === 0), { soft: true, max: o.trainMax || 60 }, 'L4 Suicide level');
          R.l4Training = null;
          if (g !== true || R.grindDry) { R.note('L4 Suicide: ' + (g === true ? 'out of healing' : g)); break; }
          continue;   // (a battle that jumps two levels just picks the next target)
        }
        before = before || st.party.slice();
        const out = st.party.filter(id => id && id !== 'cloud' && st.chars[id].level % 4 !== 0).sort((a, b2) => st.chars[a].level - st.chars[b2].level)[0];
        const r = yield* R.ops.party(st.party.map(id => id === out ? sub : id).filter(Boolean));
        if (r !== true) { R.note('L4 Suicide: ' + r); break; }
        act = [st.chars[sub]];
      }
      const holder = act.sort((a, b2) => toNext(b2) - toNext(a))[0];
      if (!setUp) { setUp = true; yield* R.ops.autoMateria(Object.assign({}, o.materia || {}, { eskill: act.map(c => c.id) })); }
      yield* R.ops.c6b_learn(['l4_suicide'], { battles: 1, holder: holder.id, learnEach: 'master', quiet: true });
    }
    R.note('E.Skill l4_suicide ' + (R.masterKnows('l4_suicide') ? 'learned' : 'not learned') + ' (' + lv() + ')');
    if (before) yield* R.ops.party(before.filter(Boolean));
    return true;
  };

  // (Aeris's Great Gospel: the Mythril, then the box)
  const GG_BOX = (s) => s.flag('c8_ws_small') || s.flag('c8_ws_big');
  const GG_MYTHRIL = (s) => s.has('mythril') || s.flag('c8_ws_paid') || GG_BOX(s);

  // ---------------------------------------------------------------- the plan
  FF7.runner.plans.c8 = [
    ['chapter', 'c8', 'Chapter 8: The Temple of the Ancients and the Forgotten Capital'],
    ['expect', 'has_bronco', { soft: true }],                       // C7's handoff: the Tiny Bronco (soft: it's set mid-C7)

    // ---- Aeris's Great Gospel (the Character Setup Guide: before she leaves; the Walkthrough's "Optional things with
    // the Tiny Bronco"): Mythril from the Sleeping Man west of the Mythril Mine (his lucky numbers: the battle count
    // ending in 11, 33, 55, 77 or 99), for the Weapon Seller's small box upstairs. She knows every Level 3 limit by
    // now (C7's mansion), so the manual is read at once (limits.js)
    ['battle', {}],
    ['obj', "Aeris's Great Gospel: Mythril from the Sleeping Man", { done: GG_MYTHRIL }],
    ['world', 'fort_condor', { done: GG_MYTHRIL }],                // (by Tiny Bronco; on foot from the fort)
    ['goto', 'world', { done: GG_MYTHRIL }],
    ['world', [263, 189], { done: GG_MYTHRIL }],
    ['c12b_count', [11, 33, 55, 77, 99], { budget: 150000, done: GG_MYTHRIL }],
    ['c12b_tile', 263, 187, { choose: 'Go inside', done: GG_MYTHRIL }],
    ['talk', 'sleeper', { map: 'side_sleeping_man', done: GG_MYTHRIL }],
    ['exit', [8, 9], { map: 'side_sleeping_man', done: (s, R2) => R2.where() !== 'side_sleeping_man' }],
    ['obj', "Aeris's Great Gospel: the Weapon Seller's small box", { done: GG_BOX }],
    ['world', 'weapon_seller', { done: GG_BOX }],
    ['talk', 'seller', { choose: 'Give him the Mythril', done: GG_BOX }],
    ['use', 9, 1, { choose: 'Open it', done: GG_BOX }],             // the small box: Great Gospel (the big one: a Gold Armlet)

    // ---- by Tiny Bronco to Costa del Sol's shore, over Mt. Corel and up the ropeway
    ['obj', 'Sail to Costa del Sol and cross Mt. Corel to the Gold Saucer'],
    ['world', 'mt_corel', { done: GOING('mtcorel_path1') }],
    ['expectMap', 'mtcorel_path1', { done: GOING('mtcorel_path1') }],
    ['goto', 'mtcorel_reactor', { done: GOING('mtcorel_reactor') }],                                    // the old way over the mountain, map by map
    ['goto', 'mtcorel_tracks1', { done: GOING('mtcorel_tracks1') }],
    ['goto', 'mtcorel_tracks2', { done: GOING('mtcorel_tracks2') }],
    ['goto', 'mtcorel_cabin', { done: GOING('mtcorel_cabin') }],
    ['goto', 'mtcorel_waterside', { done: GOING('mtcorel_waterside') }],
    ['goto', 'mtcorel_bridge', { done: GOING('mtcorel_bridge') }],
    ['goto', 'ncorel_town', { done: GOING('ncorel_town') }],
    ['goto', 'ncorel_ropeway', { done: GOING('ncorel_ropeway') }],
    ['talk', 'attendant', { done: s => s.flag('c8_gs_back') || s.flag('c8_keystone_got'), choose: 'Ride up' }],
    ['expectMap', 'gs_entrance', { done: 'c8_gs_back' }],
    ['expect', 'c8_gs_back'],                                       // up at the Gold Saucer
    // (the Gold Ticket, 30000 gil, when the gil allows it: free entry from now on, and FF7's key item)
    ['talk', 'ticket_girl', { done: s => s.flag('c6a_gs_pass') || s.has('gold_ticket') || s.flag('c8_keystone_got'), choose: (choices) => R.c12aTicket(choices) }],

    // ---- Cait Sith's Hideout (not in the PS1 game: our extra, on by default; js/maps/extra/cait_hideout.js). On this
    // visit: Cait Sith is with the party and the ropeway still runs, and it's all over before the Keystone's theft
    // needs him. Ten fortunes in a row break Wonder Square's booth; into his workshop (shooed out twice), everything
    // looked at; his four parts: a Grangalan's, a Needle Kiss's and a Cokatolis's in the hills round North Corel, a
    // Joker's on the grassland by the Weapon Seller (back over Mt. Corel to the Bronco); MOG Mk.II's ambush (its
    // Disc 1 strength; Yuffie's Lightning-All and Ramuh for its weak spot); back over the mountain and up the
    // ropeway for the cold stare, and he mends the booth
    ['obj', "Cait Sith's Hideout: the Crystal Fortune, ten times over", { done: CAIT('cait_hideout_found') }],
    ['party', ['cloud', 'caitsith', 'yuffie'], { done: CAIT('cait_hideout_found') }],   // (it only breaks with him along)
    ['goto', 'gs_wonder', { done: CAIT('cait_hideout_found') }],
    ['ckpt', 'c8_cait'],                                            // (the booth still whole: the sidequest's Demo start)
    ['c8_fortunes', { done: CAIT('cait_hideout_found') }],
    ['expect', CAIT('cait_hideout_found')],
    ['obj', "Cait Sith's Hideout: no peeking!", { done: CAIT('cait_quest_started') }],
    ['c8_caitIn', { done: CAIT('cait_hideout_welcome') }],
    ['expect', CAIT('cait_hideout_welcome')],
    ['c8_caitLook', { done: CAIT('cait_quest_started') }],
    ['expect', CAIT('cait_quest_started')],
    ['party', ['cloud', 'yuffie', 'cid'], { done: CAIT('cait_mog_beaten') }],        // (he's away till it's done)
    ['obj', "Cait's parts: a Grangalan, a Needle Kiss and a Cokatolis, round North Corel", { done: HILLS_DONE }],
    ['goto', 'gs_entrance', { done: CAIT_DOWN }],
    ['talk', 'ropeway_man', { choose: 'Ride down', done: CAIT_DOWN }],
    ['expectMap', 'ncorel_ropeway', { done: CAIT_DOWN }],
    ['fightUntil', HILL_PARTS.map(key => ({ key })), { at: [138, 160], max: 80, done: HILLS_DONE, activity: () => PARTS_LEFT(HILL_PARTS) }],
    ['expect', HILLS_DONE],
    ['obj', "Cait's parts: a Joker's card, on the grass by the Weapon Seller", { done: CAIT('cait_parts_all') }],
    ['goto', 'mtcorel_path1', { done: (s, R2) => CAIT('cait_parts_all')(s) || (R2.where() === 'world' && WORLD_REGION() !== 'corel_area') }],
    ['world', 'weapon_seller', { done: (s, R2) => CAIT('cait_parts_all')(s) || WORLD_REGION() === 'desert_edge' }],   // (by Bronco)
    ['goto', 'world', { done: (s, R2) => CAIT('cait_parts_all')(s) || WORLD_REGION() === 'desert_edge' }],
    ['fightUntil', { key: 'cait_card' }, { at: [155, 222], max: 80, done: CAIT('cait_parts_all'), activity: () => PARTS_LEFT(['cait_card']) }],
    ['expect', CAIT('cait_parts_all')],
    ['obj', 'Something big is stomping about out here...', { done: CAIT('cait_mog_beaten') }],
    ['heal', { below: 0.95, mp: 0.8 }],
    ['ckpt', 'c8_cait_mog'],
    ['c8_mogAmbush', { done: CAIT('cait_mog_beaten') }],          // (the next encounter: MOG Mk.II, at story speed)
    ['expect', CAIT('cait_mog_beaten')],
    ['obj', "Back to Cait Sith's workshop", { done: CAIT('cait_quest_done') }],
    ['world', 'mt_corel', { done: (s, R2) => CAIT_UP(s, R2) || CORE.includes(R2.where()) }],
    ['goto', 'ncorel_ropeway', { done: CAIT_UP }],
    ['talk', 'attendant', { choose: 'Ride up', done: CAIT_UP }],
    ['expectMap', 'gs_entrance', { done: CAIT_UP }],
    ['talk', 'ticket_girl', { done: s => CAIT('cait_quest_done')(s) || s.flag('c6a_gs_pass') || s.has('gold_ticket'), choose: (choices) => R.c12aTicket(choices) }],
    ['goto', 'gs_cait_hideout', { done: CAIT('cait_quest_done') }],     // (the cold stare; he rejoins)
    ['expect', CAIT('cait_quest_done')],
    ['goto', 'gs_wonder', { done: CAIT_FIXED }],                          // (out: he mends the booth and puts it back)
    ['expect', CAIT_FIXED],
    ['ckpt', 'c8_cait_fixed'],                                       // (the booth mended: part two's start)
    // part two: back in by his switch - MOG Mk.II is an arcade model, he stays to mend it - every game in Wonder Square
    // once ("market research"), back for the MogBoy (he rejoins), and the Arcade Library's cartridges for the GP
    ['obj', "Cait Sith's workshop, by the booth's hidden switch", { done: ARC('cait_arcade_started') }],
    ['c8_caitSwitch', { done: ARC('cait_arcade_started') }],
    ['expect', ARC('cait_arcade_started')],
    ['obj', 'Market research: every game in Wonder Square, once', { done: ARC('cait_arcade_done') }],
    ['c8_arcadeRound', { done: (s) => ARC('cait_arcade_done')(s) || !(FF7.story.caitArcade && FF7.story.caitArcade.left().length) }],
    ['c8_caitSwitch', { done: ARC('cait_arcade_done') }],                // (back with every game played: the MogBoy)
    ['expect', ARC('cait_arcade_done')],
    ['c8_buyCarts', { done: (s) => CAIT_OFF() || !(FF7.story.caitArcade && FF7.story.caitArcade.carts().some(c => c.open && !c.owned && c.shop !== false && c.gp <= (FF7.state.gp || 0))) }],
    ['ckpt', 'c8_cait_carts'],                                       // (the MogBoy and the cartridges the GP covered)

    // ---- Dio's showroom: the Keystone, and the show in the Battle Square (Cloud alone, eight battles)
    ['obj', "The Keystone: Dio's showroom, beside the Battle Square"],
    ['goto', 'gs_battle'],
    ['exit', 'gs2_showroom'],
    ['ckpt', 'c8_dio'],
    ['use', 12, 2, { done: 'c8_keystone_got', budget: 200000,
      choose: ['Take it', "I'll fight", 'Next battle', 'Next battle', 'Next battle', 'Next battle', 'Next battle', 'Next battle', 'Next battle'] }],
    ['expect', 'c8_keystone_got'],
    ['expect', 'c8_keystone_bonus', { soft: true }],               // eight straight wins: Protect Vest, Choco Feather

    // ---- the ropeway breaks down: the Ghost Hotel, the date (Aeris), the theft
    ['obj', 'Back to the ropeway'],
    ['goto', 'gs_station'],
    ['walk', 14, 20, { done: 'c8_ropeway_broken', choose: ['A date', 'save the princess', 'Fight', 'Princess Rosa'], budget: 60000 }],
    ['expectMap', 'gs2_night'],
    ['expect', 'c8_date_done'],
    ['obj', 'After Cait Sith!'],
    ['exit', 'gs2_chase'],
    ['walk', 10, 5],
    ['exit', 'gs2_chocobo_night', { done: 'c8_cait_spy' }],
    ['expectMap', 'gs2_room'],
    ['expect', 'c8_cait_spy'],                                      // Cait Sith's confession; the next morning
    ['use', 11, 1, { done: 'c8_room_elixir' }],                     // the wardrobe: Elixir

    // ---- down the ropeway, back through Mt. Corel to the Bronco
    ['obj', 'The Temple of the Ancients: east, past Gongaga'],
    ['goto', 'gs_entrance'],
    ['talk', 'ropeway_man', { choose: 'Ride down', done: LEFT }],
    ['expectMap', 'ncorel_ropeway', { done: LEFT }],
    ['js', (s) => { s.set('c8_left_saucer'); return true; }],      // (a resume guard: down from the Gold Saucer)
    ['expect', LEFT],
    ['goto', 'ncorel_town', { done: BACK('ncorel_town') }],
    ['goto', 'mtcorel_bridge', { done: BACK('mtcorel_bridge') }],                                     // back over Mt. Corel: the Bronco waits by Costa del Sol
    ['goto', 'mtcorel_waterside', { done: BACK('mtcorel_waterside') }],
    ['goto', 'mtcorel_cabin', { done: BACK('mtcorel_cabin') }],
    ['goto', 'mtcorel_tracks2', { done: BACK('mtcorel_tracks2') }],
    ['goto', 'mtcorel_tracks1', { done: BACK('mtcorel_tracks1') }],
    ['goto', 'mtcorel_reactor', { done: BACK('mtcorel_reactor') }],
    ['goto', 'mtcorel_path1', { done: BACK('mtcorel_path1') }],
    ['js', (s) => { s.set('c8_back_over'); return true; }],        // (a resume guard: back at the foot of Mt. Corel)
    ['expect', 'c8_back_over'],
    ['ckpt', 'c8_keystone'],

    // ---- the Temple of the Ancients (Aeris must come; Cid for his punch)
    ['obj', 'The Temple of the Ancients, on an island east of Gongaga'],
    ['party', ['cloud', 'aeris', 'cid']],
    ['row', 'cid', 'back'],                                         // Cid in the back row with Long Range: full damage, half taken
    ['autoequip', { reserve: true }],
    ['autoMateria', { steal: true, eskill: ['cloud', 'aeris'], healer: 'aeris', independent: { long_range: 'cid' } }],
    ['battle', {}],
    ['goto', 'world'],
    ['board', 'bronco'],                                            // the island has no beach the Bronco can reach:
    ['world', [226, 218]],                                          // land it on the shallows north of the Temple
    ['land'],
    ['world', 'temple_of_ancients'],
    ['expectMap', 'temple_exterior'],
    ['expect', 'c8_temple_arrived'],                                // Aeris hears the Ancients; a man in black
    ['goto', 'temple_hall'],
    ['expect', 'c8_tseng'],                                         // Tseng, wounded: the Keystone
    ['use', 11, 3, { done: 'c8_maze_intro', choose: 'Place it' }],  // the altar sinks into the Temple
    ['expectMap', 'temple_maze'],
    ['expect', 'c8_maze_intro'],
    ['obj', 'Follow the Ancient through the Temple'],
    ['c6b_learn', ['frog_song'], { battles: 12, budget: 300000 }],   // (the master copy missed it at Gongaga: the Temple's Toxic Frogs)
    ['battle', { steal: true }],
    ['items'],                                                      // Mind Source, Turbo Ether, Luck Plus, Trident, Rocket Punch
    ['goto', 'temple_ancient_room'],
    ['chest', 'temple_room_silver_rifle'],                          // Silver Rifle (Vincent)
    ['shop', 'ancient', { choose: 'Buy items', buy: [['hi_potion', 10], ['tent', 2]], lenient: true }],
    ['talk', 'ancient', { choose: 'Save' }],
    ['goto', 'temple_boulders'],
    ['item', 'temple_boulders_morph'],                              // Morph
    ['walk', 8, 4, { done: 'c8_boulders_done', choose: [HOLLOW, HOLLOW, HOLLOW] }],   // crouch where the hollow is
    ['expect', 'c8_boulders_done'],

    // ---- the clock: the chambers, the pit, doorway VI
    ['obj', 'The clock room: search its doorways'],
    ['goto', 'temple_clock'],
    ['autoequip', { reserve: true }],
    ['autoMateria', { steal: true, morph: 'cid', eskill: ['cloud', 'aeris'], healer: 'aeris', independent: { long_range: 'cid' } }],
    ['battle', { steal: ['impaler'], morph: true, learn: ['frog_song'] }],   // Toxic Frogs: Impaler; 8 Eyes: Magic Sources
    ['c8_clock', 4, { budget: 150000 }],                            // Princess Guard (the second hand may drop us in the pit first)
    ['c8_clock', 5, { budget: 150000 }],                            // Ribbon
    ['c8_clock', 7, { budget: 150000 }],                            // Trumpet Shell
    ['c8_clock', 8, { budget: 150000 }],                            // Megalixir
    ['c6b_mend', { below: 0.95 }],                                 // (full HP for the chamber's monsters)
    ['c8_clock', 1, { budget: 150000 }],                            // two Toxic Frogs and a Jemnezmy
    ['c6b_mend', { below: 0.95 }],                                 // (full HP for the chamber's monsters)
    ['c8_clock', 3, { budget: 150000 }],                            // two 8 Eyes
    ['c8_clock', 'pit', { budget: 200000 }],                        // Nail Bat (if the second hand hasn't obliged yet)
    ['battle', { steal: true }],
    ['autoequip', { reserve: true }],                               // Princess Guard for Aeris
    ['autoMateria', { steal: true, eskill: ['cloud', 'aeris'], healer: 'aeris', independent: { long_range: 'cid' } }],
    ['use', 16, 11, { done: 'c8_gate_started', choose: [5, 'Stop and wait'] }],   // doorway VI
    ['expectMap', 'temple_gate_room'],
    ['expect', 'c8_gate_started'],                                  // the Ancient runs into cave 1: he comes out of 4
    ['use', 4, 4, { choose: 'Jump', done: 'c8_gate_solved' }],      // down to the middle ledge
    ['try', ['exit', [18, 6], { done: 'c8_gate_solved' }]],         // cave 4: caught him; the great door opens (he leads us out)
    ['expect', 'c8_gate_solved'],
    ['use', 4, 4, { choose: 'Jump', done: 'got_temple_gate_work_glove' }],
    ['use', 4, 9, { choose: 'Jump', done: 'got_temple_gate_work_glove' }],
    ['chest', 'temple_gate_work_glove'],                            // Work Glove
    ['try', ['exit', [25, 11], { done: s => s.flag('c8_pool_vision') }]],   // cave 9 leads up to the top ledge
    ['expect', (s, R) => R.where() !== 'temple_gate_room' || R.field().player.ty < 4, { soft: true }],   // (on the top ledge)
    ['talk', 'ancient', { choose: 'Rest', map: 'temple_gate_room' }],
    ['talk', 'ancient', { choose: 'Save', map: 'temple_gate_room' }],

    // ---- the murals: the pool of wisdom, Sephiroth, Red Dragon, the model
    ['obj', 'Deeper into the Temple'],
    ['goto', 'temple_mural'],
    ['expect', 'c8_pool_vision'],                                   // the pool: Sephiroth and Tseng
    ['walk', 16, 6, { done: 'c8_sephiroth_mural' }],                // Sephiroth: Meteor
    ['expect', 'c8_sephiroth_mural'],
    ['c6b_level', 37, { budget: 600000 }],                          // the Ancient Dragons here pay well (Aeris most of all)
    ['goto', 'temple_gate_room'],
    ['talk', 'ancient', { choose: 'Rest', done: s => s.flag('c8_red_dragon') }],
    ['goto', 'temple_mural'],
    ['ckpt', 'c8_dragon'],
    ['obj', 'Defeat Red Dragon'],
    ['walk', 27, 6, { done: 'c8_red_dragon' }],                     // Red Dragon (Bahamut, Dragon Armlet)
    ['expect', 'c8_red_dragon'],
    ['use', 31, 4, { done: 'c8_model_seen' }],                      // the model: the Temple is the Black Materia; Cait Sith stays
    ['expect', 'c8_model_seen'],
    ['autoequip', { reserve: true }],                               // the Dragon Armlet
    ['talk', 'ancient', { choose: 'Rest', map: 'temple_mural' }],
    ['talk', 'ancient', { choose: 'Save', map: 'temple_mural' }],
    ['ckpt', 'c8_demons_gate'],

    // ---- doorway XII: Demons Gate; the Temple shrinks; the Black Materia; Aeris leaves
    ['obj', 'Out through doorway XII'],
    ['goto', 'temple_gate_room'],
    ['goto', 'temple_clock'],
    ['use', 16, 11, { done: s => s.flag('c8_demons_gate') || s.flag('c8_door12'), choose: 'Cross' }],
    ['expectMap', 'temple_exit', { done: 'c8_door12' }],
    ['js', (s) => { s.set('c8_door12'); return true; }],           // (a resume guard: through doorway XII, no way back)
    ['expect', 'c8_door12'],
    ['obj', 'Defeat Demons Gate'],
    ['walk', 8, 4, { done: 'c8_demons_gate' }],                     // Demons Gate (Gigas Armlet)
    ['expect', 'c8_demons_gate'],
    ['party', ['cloud', 'cid', 'tifa'], { select: true }],          // for the party screen in Gongaga
    ['c8_aeris_armor'],                                             // (her armour leaves with her)
    ['exit', [8, 1], { done: 'c8_woke', choose: ['To the Tiny Bronco'], budget: 60000 }],
    ['expect', 'c8_temple_done'],                                   // Sephiroth takes the Black Materia
    ['expect', 'c8_woke'],                                          // Cloud wakes in Gongaga; Aeris is gone

    // ---- Gongaga: Cloud wakes; after Aeris. North by Tiny Bronco.
    ['obj', 'After Aeris: north to Bone Village'],
    ['autoequip', { reserve: true }],                               // (Aeris's materia and accessory are back in the bag)
    ['autoMateria', { steal: true, eskill: ['cloud', 'tifa', 'cid'], independent: { long_range: 'cid' } }],
    ['world', [198, 107]],                                          // the Bronco can't get close: land on the shallows east of the village
    ['land'],
    ['world', 'bone_village'],
    ['expectMap', 'bone_village'],
    ['gear', { shop: 'foreman', slots: ['armor'], keepGil: 20000 }],   // Diamond Bangle, Rune Armlet

    // ---- Bone Village: the digs (the treasure map's spots, no diggers hired)
    ['obj', 'Dig for the Lunar Harp'],
  ].concat(
    digSteps(1, 'The Lunar Harp', 'c8_dug_harp'),                   // Lunar Harp
    digSteps(2, 'Good treasure', 'c8_dug_buntline'),                // Buntline
    digSteps(3, 'Good treasure', 'c8_dug_megalixir'),               // Megalixir
    digSteps(4, 'Good treasure', 'c8_dug_mop'),                     // Mop
  ).concat([

    // ---- the Sleeping Forest, awake with the Lunar Harp
    ['obj', 'Through the Sleeping Forest'],
    ['world', 'sleeping_forest'],
    ['expectMap', 'forest_south'],
    ['expect', 'c8_forest_awake'],
    ['goto', 'forest_heart'],
    ['items'],                                                      // Kjata (it shows at one edge per visit)
    ['goto', 'forest_trunk'],
    ['chest', 'forest_trunk_water_ring'],                           // Water Ring

    // ---- the Forgotten Capital
    ['obj', 'Find Aeris in the Forgotten Capital'],
    ['world', 'forgotten_capital'],
    ['expectMap', 'capital_path'],
    ['expect', 'c8_capital_arrived'],
    ['goto', 'capital_center'],
    ['goto', 'capital_house_w'],
    ['chest', 'capital_house_w_magic_source'],                      // Magic Source
    ['goto', 'capital_house_e1'],
    ['chest', 'capital_house_e1_guard_source'],                     // Guard Source
    ['goto', 'capital_house_e2'],
    ['item', 'capital_house_e2_enemy_skill'],                       // a third Enemy Skill materia
    ['chest', 'capital_house_e2_elixir'],                           // Elixir
    ['goto', 'capital_north'],
    ['item', 'capital_north_comet'],                                // Comet
    ['goto', 'capital_shell'],
    ['chest', 'capital_shell_aurora_armlet'],                       // Aurora Armlet
    ['c8_l4', { battles: 20, budget: 400000, materia: { steal: true, independent: { long_range: 'cid' } } }],   // L4 Suicide (Trickplay)
    ['autoequip', { reserve: true }],
    ['autoMateria', { steal: true, eskill: ['cloud', 'tifa', 'cid'], independent: { long_range: 'cid' } }],
    ['goto', 'capital_house_e2'],
    ['use', 16, 4, { done: 'c8_capital_slept', choose: 'Rest' }],   // the beds: the night, Cloud's nightmare
    ['expect', 'c8_capital_slept'],
    ['ckpt', 'c8_altar'],

    // ---- the altar: Aeris; Jenova·LIFE; the lake. End of Disc 1.
    ['obj', 'The altar in the heart of the city'],
    ['goto', 'capital_north'],
    ['goto', 'capital_crystal'],
    ['party', ['cloud', 'cid', 'tifa'], { select: true }],          // Disc 2's party screen, by the lake
    ['try', ['equip', 'tifa', 'accessory', 'water_ring']],          // Jenova·LIFE's Aqualung: the Water Ring absorbs it
    // Aqualung (the Enemy-Skill FAQ: the third materia's first skill, from Jenova·LIFE): the master Enemy Skill
    // materia on the party, and Jenova·LIFE spared until its Aqualung has hit (it comes every few turns)
    ['eskillMaster'],
    ['battle', { learn: ['aqualung'], learnTurns: 90 }],   // (she casts it on a random cycle: 40 turns once passed without it)
    ['goto', 'capital_altar', { budget: 90000 }],                   // Aeris... Jenova·LIFE (Wizard Bracelet)
    ['battle', {}],
    ['expectMap', 'capital_lake'],
    ['expect', 'aeris_dead'],
    ['expect', 'disc2'],

    // ---- Disc 2: Corral Valley and its cave, north toward Icicle Inn
    ['obj', 'North through Corral Valley'],
    ['autoequip', { reserve: true }],
    ['autoMateria', { steal: true, eskill: ['cloud', 'tifa', 'cid'], independent: { long_range: 'cid' } }],
    ['c6b_sources', 'cloud'],                                       // Mind, Magic, Guard Sources
    ['goto', 'corral_valley'],
    ['chest', 'corral_valley_viper_halberd'],                       // Viper Halberd (Cid)
    ['walk', 7, 3, { choose: 'Hop across', done: (s, R) => R.where() !== 'corral_valley' || R.field().player.tx >= 12 }],   // the stepping stones up the great shell
    ['exit', 'corral_cave'],
    ['items'],                                                      // Magic Plus, Bolt Armlet, Hypnocrown, Megalixir
    ['goto', 'corral_cave_end'],
    ['chest', 'corral_cave_end_power_source'],                      // Power Source
    ['c6b_sources', 'cloud'],
    ['autoequip', { reserve: true }],
    ['exit', [11, 0], { done: 'c8_valley_out' }],                   // out into the snow
    ['expect', 'c8_valley_out'],
    ['ckpt', 'c8_end'],
  ]);
})();
