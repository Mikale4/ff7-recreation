// Runner plan, Chapter 9 (docs/RUNNER.md): Icicle Inn, the Great Glacier, Gaea's Cliff, the Northern
// Crater, Junon and the Highwind.
// Icicle Inn: Elena (dodged), Professor Gast's three tapes (Turbo Ether downstairs), the inn's X-Potion,
// the snowman house (Glacier Map, Hero Drink, Vaccine), the weapon shop (for the reserve too), the boy's
// snowboard and the ride down (the bot takes Left, Right: the Ice Gate). The Great Glacier in two trips (the
// cold): Mind Source, Potion, the ice floes (Safety Bit), Elixir, All, then from Holzoff's cabin the hot
// spring, Added Cut, and Snow (Alexander; the Circlet is tried for). Gaea's Cliff: the three climbs (the
// crack that goes up; hands rubbed warm on the first ledge), the caves (Ribbon, Javelin, the ice boulder),
// the hall (Elixir; the icicles: Fire Armlet, Megalixir; Speed Source), the trail (Enhance Sword), the
// healing spring (Blue Dragons there: Dragon Armlets), Schizo (Dragon Fang).
// E.Skills: Magic Breath (Stilva, by the hall's save point), Bad Breath (Malboro). The crater: the rim, Neo Bahamut, the black-robed
// men (Hi-Potion, Ether), Kaiser Knuckle, MP Turbo, Jenova·DEATH (all fire: Fire Armlet, Fire Ring; Reflect
// Ring), Poison Ring, the Black Materia (to Red XIII), the illusions, WEAPON. Junon: the execution,
// Barret's escape, the "reporter", the airport, the key, Sapphire WEAPON, Scarlet's slap fight, the
// Highwind. With the Highwind: White Wind from a Manipulated Zemzelett outside Junon (the crater's Wind
// Wings cast it only when Confused, and nobody has Mystify). Wutai's Pagoda is done in C12b.
(function () {
  const R = FF7.runner;

  // Beta from the Midgar Zolom (Enemy-Skill FAQ: "come back for beta when you backtrack to pick up White wind";
  // the marsh by the Chocobo Farm, from the Highwind). Its counters (FF7's order): under 3/8 of its HP it breathes
  // Beta; under 1/2 it flings whoever hit it out of the fight (once); under 3/4 it rears up. So a Demi first (a
  // quarter of its HP: 4000 -> 3000, it only rears up), then a Laser (half: -> 1500, 3/8): Beta answers at once, on
  // everyone, and the master Enemy Skill materia (R.eskillMaster) learns it whoever carries it - gravity attacks, so
  // the damage a strong party does doesn't matter. Nobody else touches it until then; then it is beaten.
  // ['battle', { learn: ['beta'], turn: R.c9betaTurn }] (with the Gravity materia on someone)
  R.c9betaTurn = function (b, p, R2) {
    const z = b.enemies.find(e => e.targetable && e.id === 'midgar_zolom');
    if (!z || (b.learnedEskills || []).some(l => l.id === 'beta') || (b.turnCount || 0) > 60) return null;
    const m = R2.eskillMaster(); if (m && (m.eskills || []).includes('beta')) return null;
    if (m && !b.party.some(x => x.alive && !x.hidden && (x.eskillMateria || []).includes(m))) return null;   // (its holder was flung away)
    const q = b.queue.concat(b.current ? [b.current] : []);
    if (q.some(a => a && a.actor && a.actor.isParty && a.side === 'enemy')) return R2.holdHeal(b, p) || { actor: p, type: 'defend' };   // (one at a time)
    const f = z.hp / z.maxHp, silent = p.has && p.has('silence');
    const spell = (id) => !silent && ((p.abilities && p.abilities.spells) || []).some(x => x.id === id) && p.mp >= FF7.data.spells[id].mp;
    const laser = !silent && ((p.abilities && p.abilities.eskills) || []).includes('laser') && p.mp >= 16;
    if (f > 0.75 + 1e-6 && spell('demi')) return { actor: p, type: 'magic', id: 'demi', targets: [z], side: 'enemy' };
    if (f > 0.375 && f <= 0.75 + 1e-6 && laser) return { actor: p, type: 'eskill', id: 'laser', targets: [z], side: 'enemy' };
    // (no Demi in the party: a Laser from someone without the master copy, who gets flung, then another)
    const holder = (x) => m && (x.eskillMateria || []).includes(m);
    if (f > 0.75 + 1e-6 && !b.party.some(x => x.alive && ((x.abilities && x.abilities.spells) || []).some(s => s.id === 'demi'))) {
      if (laser && !holder(p)) return { actor: p, type: 'eskill', id: 'laser', targets: [z], side: 'enemy' };
      if (!b.party.some(x => x.alive && !holder(x) && ((x.abilities && x.abilities.eskills) || []).includes('laser'))) return null;
    }
    if (f > 0.5 && f <= 0.75 + 1e-6 && !b.party.some(x => x.alive && ((x.abilities && x.abilities.eskills) || []).includes('laser'))) return null;
    return R2.holdHeal(b, p) || { actor: p, type: 'defend' };
  };

  // ---------------------------------------------------------------- start profile
  // C8's real end state (its c8_end checkpoint, played from C6a's): Icicle Inn's gate, just in from the
  // Corral Valley cave (Disc 2); every flag C1-C8 set; the Enemy Skill materia with what they learned.
  const FLAGS_C9 = (
    'aeris_dead aeris_joined c12a_caught_chocobo c12a_ninja_met c12a_ninja_talk c1_bought_flower c1_train_talk c4_decided c4_eskill c5a_arrived c5a_ether_a ' +
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
    'c7_wq_stolen c7_wq_town c7_wq_trap c7_wq_turks c7_wutai_arrived c7_wutai_done c7_yoshiyuki c8_altar_scene c8_ancient_room c8_back_over c8_bone_aeris ' +
    'c8_boulders_done c8_boulders_seen c8_bronco_boarded c8_cait_spy c8_capital_arrived c8_capital_slept c8_cave_seen c8_center_seen c8_chase2 ' +
    'c8_clock_seen c8_crystal_seen c8_date_done c8_demons_gate c8_dig_explained c8_disc2_speech c8_door12 c8_dug_buntline c8_dug_harp c8_dug_megalixir ' +
    'c8_dug_mop c8_forest_awake c8_gate_solved c8_gate_started c8_gs_back c8_keystone_bonus c8_keystone_got c8_keystone_stolen c8_kjata_seen c8_left_saucer ' +
    'c8_maze_intro c8_model_seen c8_north_seen c8_pool_vision c8_red_dragon c8_red_dragon_seen c8_room1_battle c8_room3_battle c8_room_elixir ' +
    'c8_ropeway_broken c8_sephiroth_mural c8_shell_seen c8_temple_arrived c8_temple_done c8_trunk_seen c8_tseng c8_valley_out c8_valley_seen c8_woke ' +
    'c9_arrived cait_joined chocobo_lure cid_joined disc2 got_capital_house_e1_guard_source got_capital_house_e2_elixir got_capital_house_e2_enemy_skill ' +
    'got_capital_house_w_magic_source got_capital_north_comet got_capital_shell_aurora_armlet got_corral_cave_bolt_armlet got_corral_cave_end_power_source ' +
    'got_corral_cave_hypnocrown got_corral_cave_magic_plus got_corral_cave_megalixir got_corral_valley_viper_halberd got_costa_villa_firering ' +
    'got_costa_villa_motordrive got_costa_villa_powersource got_forest_kjata_2 got_forest_trunk_water_ring got_gi_caverns_added_effect ' +
    'got_gi_nattak_fairy_ring got_gi_nattak_turbo_ether got_gi_oil_black_mphone got_gi_oil_ether got_gi_web_xpotion got_gongaga_house_mphone ' +
    'got_gongaga_inn_xpotion got_gongaga_jungle2_deathblow got_gs_jockey_ramuh got_junon_apt_eskill got_junon_apt_guard got_junon_apt_luck ' +
    'got_junon_apt_mind got_junon_apt_power got_junon_apt_soldier got_junon_rooms_soldier got_junon_rooms_speed got_kalm_tower_peacemaker ' +
    'got_mansion_1fe_mphone got_mansion_1fn_viper got_mansion_2fe_msource got_mansion_2fw_launcher got_mine_cavern_mindsource got_mine_north_elixir ' +
    'got_mine_north_hipotion got_mine_steps_tent got_mine_vines_ether got_mine_vines_longrange got_mtcorel_cave_mindsource got_mtcorel_cave_powersource ' +
    'got_mtcorel_cave_tent got_mtcorel_tracks2_starpendant got_mtcorel_tracks2_transform got_mtcorel_tracks2_turboether got_mtcorel_tracks2_wmg ' +
    'got_mtnibel_all got_mtnibel_cave1_elixir got_mtnibel_cave2_sniper got_mtnibel_elemental got_mtnibel_plus_barrette got_mtnibel_powersoul ' +
    'got_mtnibel_rune_blade got_rocket_cid_drill_arm got_rocket_house_e_power got_ship_engine_ifrit got_ship_engine_windslash got_ship_hold_all ' +
    'got_ship_hold_ether got_temple_boulders_morph got_temple_gate_work_glove got_temple_maze_luck_plus got_temple_maze_mind_source ' +
    'got_temple_maze_rocket_punch got_temple_maze_trident got_temple_maze_turbo_ether got_temple_pit_nail_bat got_temple_room4_princess_guard ' +
    'got_temple_room5_ribbon got_temple_room7_trumpet_shell got_temple_room8_megalixir got_temple_room_silver_rifle got_wutai_cat_hpabsorb ' +
    'got_wutai_dachao_cave_dragoon_lance got_wutai_godo_hairpin got_wutai_godo_shuriken got_wutai_shrine_elixir got_wutai_shrine_swiftbolt ' +
    'got_wutai_yhouse_mpabsorb has_bronco has_buggy has_phs keystone left_midgar trig_fb_bridge_collapse trig_gi_nattak_boss trig_gongaga_jungle1_turks ' +
    'trig_gongaga_reactor_scarlet trig_gs2_chase_c8_chase1 trig_gs2_chase_c8_chase2 trig_gs_station_c8_ropeway trig_junon_airport_highwind ' +
    'trig_junon_lower_priscilla_gift trig_junon_street2_glimpse trig_mansion_basement_library trig_mansion_coffin_vincent_join ' +
    'trig_mansion_stairs_first_look trig_mine_exit_turks trig_mine_vines_vine_hint trig_mtcorel_bridge_creak trig_mtcorel_cabin_birds ' +
    'trig_mtcorel_tracks1_weak2 trig_mtcorel_tracks2_dead_end trig_mtnibel_bridge_midspan trig_mtnibel_pipes_keeper trig_mtnibel_pipes_see_keeper ' +
    'trig_mtnibel_reactor_reactor trig_nibel_tifa_house_tifa_room trig_prison_dyne_dyne trig_rocket_engine_meet_cid trig_ship_engine_birth ' +
    'trig_temple_exit_demons_gate trig_temple_hall_tseng trig_temple_mural_dragon trig_temple_mural_seph trig_wutai_outskirts_yuffie_heist ' +
    'trig_wutai_yuffie_house_lev_talk vincent_joined yuffie_joined ').trim().split(/\s+/);
  R.starts.c9 = {
    map: "icicle_gate", entry: "from_valley",
    members: ["cloud","tifa","redxiii","caitsith","barret","vincent","cid","yuffie"],
    party: ["cloud","cid","tifa"],
    levels: {"cloud":41,"tifa":37,"redxiii":35,"caitsith":33,"barret":34,"vincent":37,"cid":40,"yuffie":38},
    names: {"cloud":"Cloud","tifa":"Tifa","redxiii":"Red XIII","caitsith":"Cait Sith","barret":"Barret","vincent":"Vincent","cid":"Cid","yuffie":"Yuffie"},
    phs: true,
    flags: FLAGS_C9,
    vars: {"c12b_on_choco":0,"c5a_party":"barret,tifa","aff_barret":5,"c5a_cabinet":5,"aff_tifa":0,"chocobo_pen":[],"chocobo_color":"yellow","c12a_riding":0,"c5b_condor_funds":10000,"mg_best_fort_condor":620,"c5b_condor_prize":3,"mg_best_cpr":5,"mg_best_dolphin":100,"mg_best_parade":66,"aff_aeris":15,"mg_best_motorcycle_gbike":19975,"mg_best_shooting_speed_square":7720,"turtle_flyers":4,"mg_esther_try":0,"mg_best_chocobo_race":6,"c7_cl_cloak_inn":1,"c7_cl_cloak_fire":1,"c7_cl_cloak_kid1":1,"c7_cl_cloak_tifa1":1,"c7_cl_cloak_tifa2":1,"c7_oldman_talks":2,"c7_materia_backup":0,"aff_yuffie":10,"c8_date":0,"c8_date_partner":0,"c8_boulder":3,"c8_clock_room":12,"c8_gate_target":4,"c8_dig_state":0,"c8_dig_spot":4},
    items: {"phoenix_down":27,"ether":8,"elixir":9,"hyper":2,"tranquilizer":2,"grenade":2,"megalixir":4,"peacemaker":1,"lasan_nut":1,"mythril_clip":1,"bronze_bangle":1,"tent":7,"1_35_soldier":2,"buster_sword":1,"4_point_shuriken":1,"motor_drive":1,"w_machine_gun":1,"bolt_plume":3,"star_pendant":2,"mythril_rod":1,"t_s_bomb":2,"hi_potion":60,"wizard_staff":1,"fairy_tale":1,"white_m_phone":1,"wind_slash":1,"m_tentacles":5,"black_m_phone":1,"fairy_ring":1,"wizer_staff":1,"magic_comb":1,"mythril_armlet":4,"war_gong":1,"platinum_fist":1,"twin_viper":1,"mirror":4,"turbo_ether":4,"cosmo_memory":1,"plus_barrette":1,"powersoul":1,"fire_fang":1,"yoshiyuki":1,"silver_armlet":5,"drill_arm":1,"yellow_m_phone":1,"swift_bolt":1,"spear":1,"rune_blade":1,"headband":1,"fire_veil":1,"white_cape":1,"fire_ring":1,"potion":2,"umbrella":1,"peace_ring":1,"silver_m_phone":1,"gold_armlet":2,"buntline":1,"mop":1,"water_ring":1,"dazers":2,"choco_feather":1,"diamond_bangle":1,"viper_halberd":1,"hypnocrown":1},
    keyItems: ["phs","basement_key","lunar_harp"],
    gil: 111559,
    vehicles: {"buggy":{"x":115,"y":208},"bronco":{"x":198,"y":107}},
    equip: {
      cloud: {"weapon":"murasame","armor":"dragon_armlet","accessory":"power_wrist"},
      tifa: {"weapon":"tiger_fang","armor":"bolt_armlet","accessory":"power_wrist"},
      redxiii: {"weapon":"seraph_comb","armor":"gigas_armlet","accessory":"protect_vest"},
      caitsith: {"weapon":"trumpet_shell","armor":"diamond_bangle","accessory":"peace_ring"},
      barret: {"weapon":"enemy_launcher","armor":"aurora_armlet","accessory":"talisman"},
      vincent: {"weapon":"sniper_cr","armor":"gold_armlet","accessory":"protect_vest"},
      cid: {"weapon":"dragoon_lance","armor":"wizard_bracelet","accessory":"ribbon"},
      yuffie: {"weapon":"razor_ring","armor":"gold_armlet","accessory":"jem_ring"},
    },
    materia: {
      cloud: ["lightning","all","ramuh","elemental",{"id":"enemy_skill","eskills":["matra_magic","laser","aqualung","big_guard","frog_song","death_sentence","flame_thrower","magic_hammer"]},"steal","restore","gravity","titan","bahamut","luck_plus"],
      tifa: ["ice","counter_attack",{"id":"enemy_skill","eskills":["matra_magic","flame_thrower","laser","aqualung","big_guard","frog_song","death_sentence","question","magic_hammer","l4_suicide"]},"destruct","shiva","odin",null,"cover"],
      cid: [{"id":"enemy_skill","eskills":["l4_suicide"]},"time","transform","long_range","choco_mog","ifrit","kujata",null,"restore","all","poison","all","fire","mp_absorb","comet","hp_absorb"],
      yuffie: [null,null,null,null,null,null,null,"manipulate"],
    },
    stock: ["sense","chocobo_lure","throw","deathblow","added_effect","elemental","morph","magic_plus"],
  };

  // ---------------------------------------------------------------- helpers
  // the player's tile on this map
  const at = (map, fn) => (s, R) => { const f = R.field(); return !!f && f.map.id === map && fn(f.player.tx, f.player.ty); };
  // Gaea's Cliff: the cracks to take at each fork (every move costs 2°C; rub your hands on the first
  // ledge; 36°C at the start, 26°C is the limit)
  const PAST1 = (s, R) => s.flag('c9_jenova_death') || ['crater_maze2', 'crater_end', 'crater_maze3', 'crater_center'].includes(R.where());   // past the first maze
  const PAST2 = (s, R) => s.flag('c9_jenova_death') || ['crater_end', 'crater_maze3', 'crater_center'].includes(R.where());   // past the second
  // back on the near shore of the ice floes, the Safety Bit in the bag
  const BACK = s => s.flag('got_glacier_floes_safety_bit') && !at('glacier_floes', (x, y) => y < 15)(s, R);
  const CLIMB1 = ['Climb'];   // (then the climbing minigame: its bot plays it)
  const CLIMB2 = ['Climb'];   // (then the climbing minigame: its bot plays it)
  const CLIMB3 = ['Climb'];   // (then the climbing minigame: its bot plays it)

  // ---- the Whirlwind Maze: the gusts and the lightning come and go in cycles (a flag while they blow).
  // ['c9_dash', x, y, flag]: wait for the next lull (the flag goes on, then off), then run for it.
  R.ops.c9_dash = function* (x, y, flag, o = {}) {
    const here = () => { const f = R.field(); return f && f.player.tx === x && f.player.ty === y; };
    for (let tries = 0; tries < (o.tries || 8); tries++) {
      if (!R.field()) return 'c9_dash: not on a field map';
      if (here()) return true;
      let g = 0;
      while (!FF7.state.flags[flag] && g++ < 600) yield;       // the gust...
      g = 0;
      while (FF7.state.flags[flag] && g++ < 600) yield;        // ...dies down: go
      const r = yield* R.ops.walk(x, y);
      if (r === true && (here() || R.where() !== o.map)) return true;
      if (typeof r === 'string') R.note('c9_dash: ' + r);
      yield* R.settle(4);
    }
    return here() ? true : 'c9_dash: could not get past the ' + flag + ' to ' + x + ',' + y;
  };
  // Scarlet's slap fight: duck when she winds up, slap when she doesn't
  const SLAP = (ch, w) => {
    const t = ((w && w.pages) || []).map(p => p.join(' ')).join(' ');
    if (!/Scarlet/.test(t) || ch.length !== 2) return null;
    return /draws her hand way back/.test(t) ? 1 : 0;
  };
  SLAP.toString = () => 'SLAP';                                   // (short in the log's "unused answers" notes)
  // Stilva's Magic Breath (~1900 on everyone, more than most of the party's HP): while it is still to be learned,
  // Big Guard goes up before anything else (MBarrier halves it) - and again if it has worn off or someone died
  // before it was up. (['battle', { turn: GUARD }])
  const GUARD = (b, p) => {
    if (!b.enemies.some(e => e.alive && e.id === 'stilva')) return null;
    const up = b.party.filter(x => x.alive);
    if (up.every(x => x.has('mbarrier'))) return null;
    if (b.queue.concat(b.current ? [b.current] : []).some(q => q && q.type === 'eskill' && q.id === 'big_guard')) return null;
    if (p.has('silence') || !(p.abilities && (p.abilities.eskills || []).includes('big_guard')) || p.mp < 56) return null;
    return { actor: p, type: 'eskill', id: 'big_guard', targets: up, side: 'ally', all: true };
  };
  // ---- the healing spring below Schizo's lair: fight the Blue Dragons and Cuahls here, bathe after each
  // battle. ['c9_spring', { armlets, level, battles }]: until the party owns `armlets` Dragon Armlets (Blue
  // Dragon drops one every time: halves fire, ice and lightning, all of Schizo's breaths) and its average
  // level is `level`, at most `battles` fights.
  const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  R.ops.c9_spring = function* (o = {}) {
    const st = FF7.state, inv = FF7.sys.inv;
    const armlets = () => inv.count('dragon_armlet') + st.members.filter(id => st.chars[id] && st.chars[id].armor === 'dragon_armlet').length;
    const done = () => armlets() >= (o.armlets || 3) && R.avgLevel() >= (o.level || 0);
    const bathe = function* () { if (FF7.sys.party.active().some(c => c.hp < c.maxHp || c.mp < c.maxMp * 0.7)) yield* R.ops.use(7, 4); };
    let n = 0, b0 = R.stats.battles, lastB = R.frames, side = 0;
    while (!done() && n < (o.battles || 16)) {
      if (R.frames - lastB > 20000) { R.note('c9_spring: no battles here'); break; }
      if (R.stats.battles !== b0) { b0 = R.stats.battles; n++; lastB = R.frames; yield* bathe(); continue; }
      const fs = R.field(); if (!fs || fs.map.id !== 'gaea_spring') return 'c9_spring: not at the spring (' + R.where() + ')';
      const p = fs.player, pairs = DIRS4.map(([dx, dy]) => [p.tx + dx * 2, p.ty + dy * 2]).filter(([x, y]) => fs.P.walkable(x, y) && !R.exitAt(fs, x, y) && !(fs.map.triggers || []).some(t => fs.inRect(t.at, x, y)));
      if (!pairs.length) { const r = yield* R.ops.walk(12, 6); if (r !== true) return 'c9_spring: ' + r; continue; }
      const r = yield* R.walkField([pairs[side++ % pairs.length]], { anywhere: true });
      if (r !== true && r !== 'mapchanged') return 'c9_spring: ' + r;
    }
    yield* bathe();
    R.note('the spring: ' + n + ' battle(s), ' + armlets() + ' Dragon Armlet(s), ' + FF7.sys.party.active().map(c => c.name + ' ' + c.level).join(', '));
    return true;
  };

  // ---------------------------------------------------------------- the plan
  FF7.runner.plans.c9 = [
    ['chapter', 'c9', 'Chapter 9: Icicle Inn to the Northern Crater and Junon'],
    ['expect', 'c8_valley_out', { soft: true }],                    // C8's handoff: out of the Corral Valley cave
    ['goto', 'icicle_gate'],

    // ---- Icicle Inn
    ['obj', 'Look around Icicle Inn'],
    ['walk', 19, 4, { done: 'c9_elena', choose: 'Dodge' }],         // Elena of the Turks runs into Cloud
    ['expect', 'c9_elena'],
    ['goto', 'icicle_gast'],
    ['use', 7, 1, { done: 'c9_tape1', choose: 'Tape 1' }],          // Professor Gast's tapes: the Cetra, WEAPON, Aeris
    ['use', 7, 1, { done: 'c9_tape2', choose: 'Tape 2' }],
    ['use', 7, 1, { done: 'c9_tapes_talk', choose: 'Tape 3' }],
    ['expect', 'c9_tapes_talk'],
    ['goto', 'icicle_gast_b1'],
    ['item', 'icicle_gast_turbo_ether'],                            // Turbo Ether
    ['goto', 'icicle_inn_2f'],
    ['item', 'icicle_inn_x_potion'],                                // X-Potion
    ['goto', 'icicle_snowhouse'],
    ['items'],                                                      // Hero Drink, Vaccine
    ['use', 10, 0, { done: s => s.has('glacier_map'), choose: 'Take it' }],   // the Glacier Map off the wall
    ['goto', 'icicle_weapons'],
    ['gear', { shop: 'weapon_seller', reserve: true, keepGil: 30000 }],   // for the reserve too (Hawkeye for Yuffie)
    ['goto', 'icicle_kid'],
    ['talk', 'board_kid', { done: s => s.has('snowboard') }],       // the boy lends his snowboard
    ['autoMateria', { steal: true, eskill: ['cloud', 'tifa', 'cid'], independent: { long_range: 'cid' } }],
    ['goto', 'icicle_inn'],
    ['inn', 'innkeeper'],
    ['ckpt', 'c9_board'],

    // ---- down to the Great Glacier on the snowboard
    ['obj', 'Snowboard down to the Great Glacier'],
    ['goto', 'icicle_cliff'],
    ['talk', 'board_man', { done: 'c9_snowboard_tips', choose: 'Please' }],
    ['minigame', 'snowboard', {}],
    ['exit', [12, 1], { done: 'c9_landed', choose: 'Go!', budget: 60000 }],
    ['expect', 'c9_landed'],

    // ---- the Great Glacier, first trip: the west side and up to Gaea's Cliff before the cold wins
    ['obj', "Cross the Great Glacier to Gaea's Cliff"],
    ['battle', { steal: true }],
    ['goto', 'glacier_pines'],
    ['item', 'glacier_pines_mind_source'],                          // Mind Source
    ['goto', 'glacier_lake'],
    ['item', 'glacier_lake_potion'],                                // Potion
    ['goto', 'glacier_floes'],
    // the ice floes: only the snow-covered ones hold (shore -> 10,12 -> 10,9 -> 13,9 -> 13,6 -> far shore)
    ['use', 10, 14, { done: 'got_glacier_floes_safety_bit' }],
    ['use', 10, 11, { done: 'got_glacier_floes_safety_bit' }],
    ['use', 11, 9, { done: 'got_glacier_floes_safety_bit' }],
    ['use', 13, 8, { done: 'got_glacier_floes_safety_bit' }],
    ['use', 13, 5, { done: 'got_glacier_floes_safety_bit' }],
    ['chest', 'glacier_floes_safety_bit'],                          // Safety Bit
    ['use', 13, 4, { done: BACK }],
    ['use', 13, 7, { done: BACK }],
    ['use', 12, 9, { done: BACK }],
    ['use', 10, 10, { done: BACK }],
    ['use', 10, 13, { done: BACK }],
    ['goto', 'glacier_icefield'],
    ['item', 'glacier_icefield_elixir'],                            // Elixir
    ['goto', 'glacier_snowfield'],
    ['item', 'glacier_snowfield_all'],                              // All
    ['goto', 'gaea_base'],                                          // (the cold is gone at the cliff's foot)
    ['goto', 'gaea_cabin'],
    ['talk', 'holzoff', { done: 'c9_holzoff_met' }],                // Holzoff (unless he already carried us in)
    ['expect', 'c9_holzoff_met'],

    // ---- second trip: the hot spring, Added Cut, and Snow's cave (Alexander)
    ['obj', 'The hot spring and the ice cave'],
    ['goto', 'glacier_springs'],
    ['use', 18, 4, { done: 'c9_hotspring', choose: 'Touch it' }],   // Snow can smell the warmth on you now
    ['goto', 'glacier_slope'],
    ['item', 'glacier_slope_added_cut'],                            // Added Cut
    ['goto', 'glacier_snowcave'],
    ['c6b_mend', { below: 0.9 }],
    // (her Fascination confuses, and a confused thief steals nothing: the bag's Peace Ring on Cloud, who has the
    // Steal materia here; autoequip puts things back after)
    ['equip', 'cloud', 'accessory', 'peace_ring', { done: 'c9_snow_beaten' }],
    ['battle', { steal: ['circlet'], stealHold: 90 }],               // (Snow's Circlet: held until stolen)
    ['talk', 'snow_woman', { done: 'c9_snow_beaten' }],             // Snow: Alexander (Circlet stolen)
    ['expect', 'c9_snow_beaten'],
    ['battle', { steal: true }],
    ['goto', 'gaea_cabin'],
    ['talk', 'holzoff', { choose: 'Rest' }],
    ['autoequip', { reserve: true }],
    ['autoMateria', { steal: true, eskill: ['cloud', 'tifa', 'cid'], independent: { long_range: 'cid' } }],
    ['ckpt', 'c9_cliff'],

    // ---- Gaea's Cliff: the first climb, the ice caves
    ['obj', "Climb Gaea's Cliff"],
    ['goto', 'gaea_cliff1'],
    ['use', 11, 12, { choose: CLIMB1, done: s => s.flag('c9_cave1_seen') || at('gaea_cliff1', (x, y) => y <= 3)(s, R) }],
    ['exit', 'gaea_cave1'],
    ['battle', { steal: true }],
    ['goto', 'gaea_cave2'],
    ['exit', [0, 2]],                                               // up the stair, back into the first cave along the top
    ['chest', 'gaea_cave1_ribbon'],                                 // Ribbon (across the ice bridge)
    ['exit', 'gaea_cave3'],
    ['chest', 'gaea_cave3_javelin'],                                // Javelin
    ['talk', 'ice_boulder', { done: 'c9_boulder', choose: 'Kick it' }],   // the boulder clears the tunnel below
    ['expect', 'c9_boulder'],
    ['battle', { steal: true }],
    ['goto', 'gaea_cave1'],
    ['exit', [0, 2]],                                               // along the top, down the stair to the cleared tunnel
    ['goto', 'gaea_cliff2'],
    ['use', 6, 12, { choose: CLIMB2, done: at('gaea_cliff2', (x, y) => y <= 3) }],
    ['goto', 'gaea_hall'],
    ['save'],
    ['chest', 'gaea_hall_elixir'],                                  // Elixir
    // Stilva: Magic Breath (by the save point). It hits everyone for about 1900: the Fire Ring on Tifa (the
    // least HP), Big Guard first in its battles (MBarrier halves it)
    ['try', ['equip', 'tifa', 'accessory', 'fire_ring']],
    ['battle', { steal: true, turn: GUARD }],
    ['c6b_mend', { below: 0.95 }],
    ['c6b_learn', ['magic_breath'], { battles: 20, turns: 12, budget: 450000 }],   // (Stilva: about 1 battle in 3 here)
    ['battle', { steal: true }],
    ['c6b_mend', { below: 0.9 }],

    // ---- the icicle ledge: four icicles (Evilheads), Fire Armlet, Megalixir; the icicles bridge the hall
    ['obj', 'Bring down the icicles'],
    ['goto', 'gaea_ledge'],
    ['chest', 'gaea_ledge_fire_armlet'],                            // Fire Armlet
    ['walk', 2, 2, { done: 'c9_icicles_down', budget: 90000 }],     // under the four icicles, west
    ['expect', 'c9_icicles_down'],
    ['chest', 'gaea_ledge_megalixir'],                              // Megalixir
    // Malboro's Bad Breath: every Enemy Skill materia on Cloud (it's learned by whoever it hits), Ribbons on the
    // other two so they stay clear-headed to fight and heal
    ['try', ['equip', 'tifa', 'accessory', 'ribbon']],
    ['try', ['equip', 'cid', 'accessory', 'ribbon']],
    ['loadout', 'cloud', { armor: ['enemy_skill', 'enemy_skill', 'enemy_skill'] }],
    ['c6b_mend', { below: 0.95 }],
    ['c6b_learn', ['bad_breath'], { battles: 24, turns: 30, budget: 600000 }],   // Malboro: Bad Breath (a few Frozen Beams first)
    ['c6b_mend', { below: 0.8 }],
    ['autoequip', { reserve: true }],
    ['autoMateria', { steal: true, eskill: ['cloud', 'tifa', 'cid'], independent: { long_range: 'cid' } }],
    ['use', 20, 5, { choose: 'Jump', done: s => s.flag('got_gaea_hall_speed_source') }],   // jump down into the hall
    ['use', 3, 5, { done: 'got_gaea_hall_speed_source' }],          // across the icicle to the ledge
    ['chest', 'gaea_hall_speed_source'],                            // Speed Source
    ['use', 3, 4, { done: 'got_gaea_trail_enhance_sword' }],        // back across
    ['use', 13, 5, { done: 'got_gaea_trail_enhance_sword' }],       // over to the passage
    ['exit', 'gaea_trail'],
    ['chest', 'gaea_trail_enhance_sword'],                          // Enhance Sword
    ['expect', 'got_gaea_trail_enhance_sword'],
    ['obj', "Climb to the top of Gaea's Cliff"],
    ['goto', 'gaea_cliff3'],
    ['use', 10, 12, { choose: CLIMB3, done: at('gaea_cliff3', (x, y) => y <= 3) }],
    ['goto', 'gaea_spring'],
    ['expect', 'c9_spring_seen'],
    ['use', 7, 4],                                                  // the healing spring
    ['ckpt', 'c9_spring'],
    // (the spring gives the MP back after every fight; a fight gone wrong is run from, then bathed off)
    ['battle', { mp: 'free', fleeIf: (b) => { const up = b.party.filter(x => x.alive); return up.length <= 1 || up.reduce((a, x) => a + x.hp, 0) < 0.3 * b.party.reduce((a, x) => a + x.maxHp, 0); } }],
    ['c9_spring', { armlets: 3, level: 41, battles: 16, budget: 300000 }],   // Blue Dragons: Dragon Armlets
    ['battle', {}],
    ['autoequip', { reserve: true }],
    ['try', ['equip', 'cid', 'armor', 'dragon_armlet']],            // Schizo breathes fire, ice and lightning
    ['try', ['equip', 'tifa', 'armor', 'dragon_armlet']],
    ['autoMateria', { steal: true, eskill: ['cloud', 'tifa', 'cid'], independent: { long_range: 'cid' } }],
    ['c6b_sources', 'cloud'],
    ['ckpt', 'c9_schizo'],
    ['obj', 'Defeat Schizo'],
    // (one Steal on the right head: its Protect Ring - a steal always lands while there is something to take, the
    // user's rule; the Mover hunt in the Northern Cave is the fallback)
    ['battle', { steal: ['protect_ring'] }],
    ['goto', 'gaea_lair'],
    ['walk', 9, 5, { done: 'c9_schizo' }],                          // Schizo (Dragon Fang)
    ['expect', 'c9_schizo'],
    ['battle', { steal: true }],

    // ---- the Northern Crater: the rim, the descent (Neo Bahamut), Shinra's airship arrives
    ['obj', 'Into the Northern Crater'],
    ['equip', 'tifa', 'armor', 'fire_armlet'],                      // Jenova·DEATH is all fire: Fire Armlet absorbs,
    ['equip', 'cid', 'accessory', 'fire_ring'],                     // the Fire Ring nullifies (Cloud's Dragon Armlet halves)
    ['goto', 'crater_rim'],
    ['expect', 'c9_rim_seen'],
    ['goto', 'crater_descent'],
    ['item', 'crater_descent_neo_bahamut'],                         // Neo Bahamut
    ['walk', 16, 9, { done: 'c9_airship_seen' }],                   // Rufus's airship over the crater
    ['expect', 'c9_airship_seen'],
    ['expectMap', 'crater_descent', { done: 'c9_maze_seen' }],
    ['battle', { steal: true }],

    // ---- the Whirlwind Maze: the black-robed men, the gusts
    ['goto', 'crater_maze1'],
    ['expect', 'c9_maze_seen'],                                     // the black-robed men
    ['talk', 'robed1', { done: 'c9_clone1' }],                      // Hi-Potion
    ['c9_dash', 14, 9, 'c9_gust', { map: 'crater_maze1', budget: 60000, done: PAST1 }],
    ['talk', 'robed2', { done: 'c9_clone2' }],                      // Ether
    ['exit', 'crater_maze2', { done: PAST1 }],
    ['c9_dash', 14, 7, 'c9_gust', { map: 'crater_maze2', budget: 60000, done: PAST2 }],
    ['chest', 'crater_maze2_kaiser_knuckle'],                       // Kaiser Knuckle
    ['walk', 14, 7, { done: PAST2 }],
    ['c9_dash', 14, 12, 'c9_wave', { map: 'crater_maze2', budget: 60000, done: PAST2 }],
    ['exit', 'crater_end', { done: PAST2 }],
    ['item', 'crater_end_mp_turbo'],                                // MP Turbo
    ['c6b_mend', { below: 0.95 }],
    ['ckpt', 'c9_jenova'],
    ['obj', 'Jenova·DEATH'],
    ['battle', {}],
    ['walk', 14, 7, { done: 'c9_jenova_death', choose: 'Red XIII' }],   // Jenova·DEATH (Reflect Ring); Red XIII keeps the Black Materia
    ['expect', 'c9_jenova_death'],
    ['autoequip', { reserve: true }],
    ['autoMateria', { steal: true, eskill: ['cloud', 'tifa', 'cid'], independent: { long_range: 'cid' } }],
    ['c6b_mend', { below: 0.8 }],
    ['battle', { steal: true }],
    ['chest', 'crater_end_poison_ring'],                            // Poison Ring
    ['exit', 'crater_maze3'],
    ['c9_dash', 14, 5, 'c9_bolt', { map: 'crater_maze3', budget: 60000 }],   // the lightning, one strip at a time
    ['c9_dash', 14, 8, 'c9_bolt', { map: 'crater_maze3', budget: 60000 }],
    ['c9_dash', 14, 11, 'c9_bolt', { map: 'crater_maze3', budget: 60000 }],
    ['obj', 'The center of the crater'],
    ['goto', 'crater_center', { budget: 120000 }],                  // the illusions; the Black Materia; WEAPON; Meteor
    ['expectMap', 'junon2_cell'],
    ['expect', 'meteor'],
    ['expect', 'c9_junon_woke'],

    // ---- Junon: the execution
    ['obj', 'Junon: the execution'],
    ['goto', 'junon2_corridor'],
    ['save'],
    ['goto', 'junon2_press'],
    ['walk', 13, 6, { done: 'c9_attack_squad', budget: 90000 }],   // the press room; the gas chamber; Barret breaks loose
    ['expectMap', 'junon2_press'],
    ['expect', 'c9_attack_squad'],
    ['obj', 'To the airport'],
    ['goto', 'junon2_walk'],
    ['try', ['talk', 'reporter', { done: 'c9_reporter' }]],         // the "reporter" (Yuffie in disguise)
    ['goto', 'junon2_dock'],
    ['walk', 14, 4, { done: 'c9_dock_guard' }],                     // two SOLDIER:2nd at the gangway
    ['exit', [14, 2], { done: 'c9_key', choose: [0, 1, 1, 0, 1, 1], budget: 60000 }],   // the Highwind; Tifa and the key
    ['expect', 'c9_key'],
    ['use', 12, 5, { done: 'c9_wall_blasted' }],                    // the gas switch; Sapphire WEAPON blasts the wall
    ['use', 13, 3, { done: s => s.flag('c9_cannon_seen') }],        // out through the hole
    ['expectMap', 'junon2_cannon'],
    ['walk', 27, 4, { done: 'c9_slap_done', choose: [SLAP, SLAP, SLAP, SLAP, SLAP, SLAP, SLAP, SLAP, SLAP, SLAP, SLAP, SLAP] }],   // Scarlet
    ['expect', 'c9_slap_done'],
    ['walk', 37, 4, { done: 'c9_hw_meeting', budget: 60000 }],      // the Highwind's ladder
    ['expectMap', 'highwind_bridge'],
    ['expect', 'c9_hw_meeting'],                                    // Cid takes the helm

    // ---- the Highwind
    ['obj', 'The Highwind'],
    ['goto', 'highwind_cabin'],
    ['save'],
    ['goto', 'highwind_bridge'],
    ['talk', 'hw_pilot', { done: 'c9_first_takeoff', choose: 'Take off' }],
    ['expect', 'c9_first_takeoff'],                                 // airborne (has_highwind is set at the meeting)
    // White Wind: a Zemzelett in the grass round Junon, Manipulated into casting it on us (it only heals
    // its own side; the Wind Wings of the crater cast it only when Confused)
    ['obj', 'White Wind from a Zemzelett'],
    ['land', { done: (s, R) => !(R.worldScene() && R.worldScene().vehicle) }],
    // (the Zemzelett has 285 HP: no attack magic, no All, MP saved, so it lives to be Manipulated)
    ['loadout', 'tifa', { weapon: ['manipulate', 'enemy_skill'], armor: [], clear: true }],
    ['loadout', 'cid', { weapon: ['enemy_skill', 'restore'], armor: [], clear: true }],
    ['loadout', 'barret', { weapon: ['enemy_skill'], armor: [], clear: true }],
    ['battle', { manipulate: { enemy: 'zemzelett', use: 'White Wind' }, mp: 'save' }],
    ['c6b_learn', ['white_wind'], { battles: 16, budget: 400000 }],
    ['c6b_mend', { below: 0.8 }],
    // Beta: the Midgar Zolom in the marsh by the Chocobo Farm (the Enemy-Skill FAQ: back for it with White Wind):
    // two Lasers take it under 3/8 of its HP, where it breathes Beta (R.c9betaTurn); the master materia learns it
    ['obj', 'Beta from the Midgar Zolom'],
    // (MP for the Lasers: a Tent here on the world map when the White Wind fights spent it)
    ['useItem', 'tent', 'cid', { done: (s, R) => R.masterKnows('beta') || !FF7.sys.inv.has('tent') || FF7.sys.party.active().every(c => c.mp >= Math.min(60, c.maxMp * 0.5)) }],
    ['heal', { below: 0.8, mp: 0.5, done: (s, R) => R.masterKnows('beta') }],
    ['try', ['loadout', 'cid', { armor: ['gravity'] }], { done: (s, R) => R.masterKnows('beta') || !R.materiaCount('gravity') || FF7.sys.party.active().some(c => FF7.sys.materia.equippedList(c).some(m => m.id === 'gravity')) }],   // (Demi)
    ['battle', { learn: ['beta'], turn: R.c9betaTurn, mp: 'free' }],
    ['world', [291, 172], { done: (s, R) => R.masterKnows('beta') }],
    ['c6b_learn', ['beta'], { battles: 8, budget: 300000 }],
    ['c6b_mend', { below: 0.8 }],
    ['battle', { steal: true }],
    // (Wutai's Pagoda, Yuffie alone against the Five Mighty Gods, is done in C12b.)
    // (Steal on Cid: Tifa stays in Mideel with Cloud next, her materia with her, and C10's party - Cid, Barret, Red XIII -
    // steals Eagle Gun's Warrior Bangle)
    ['autoMateria', { steal: 'cid', eskill: ['cid', 'tifa', 'barret'] }],
    ['world', [233, 175], { vehicle: 'highwind' }],
    ['js', (s) => { s.set('c9_set_out'); return true; }],          // (the chapter's last step: a resume guard)
    ['expect', { any: ['c9_set_out', 'c10_mideel_arrived'] }],      // the handoff (the Highwind: has_highwind)
    ['ckpt', 'c9_end'],
  ];
})();
