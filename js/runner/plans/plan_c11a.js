// Runner plan, Chapter 11a: Holy, Diamond WEAPON and the Midgar raid - the end of Disc 2 (docs/RUNNER.md,
// "Chapter 11a notes").
// Starts on the Highwind's bridge after the escape pod (C10's handoff: huge_materia_done; Bugenhagen came aboard,
// c11a_started). Ends with the Disc 2 save screen, disc3 and the night on the Highwind (C11b's hw_night /
// hw_field / hw_dawn scenes play by themselves: the run stops under the Highwind at dawn).
// Route (the Walkthrough's {36}-{38}, in this game's maps):
//   Rocket Town (the old man's Venus Gospel, once No. 26 has flown) -> the Forgotten Capital (Holy, the organ's
//   lock) -> the submarine off Bone Village: the Key to the Ancients -> the organ (Aeris' prayer, Holy) -> Diamond
//   WEAPON on the coast (Rising Sun stolen if lucky) -> the Northern Crater's rim (Hojo has the Sister Ray) ->
//   the parachute into Sector 8 -> the underground (Elixir, Megalixir, Aegis Armlet, Starlight Phone, Elixir,
//   Max Ray; ???? from a Behemoth) -> the Turks (fought: Minerva Band / Tough Ring / Ziedrich steals, Elixirs)
//   -> the winding tunnels (Power, Guard, Magic and Mind Sources, W-Item) -> the deserted Shinra Building
//   (Behemoth Horn on the stairs, Pile Banger, Master Fist, Grow Lance, HP Shout, the vending machine's
//   Mind and Speed Sources) -> Proud Clod (Ragnarok) -> the cannon yard (Elixir, Mystile) -> the stairs
//   (Missing Score) -> Hojo.
(function () {
  const R = FF7.runner;

  // the state C10 ends in (its c10_end checkpoint, headless run from R.starts.c10): on the Highwind's bridge
  // after the escape pod, the Highwind parked by Rocket Town, the submarine off Junon; Cloud, Tifa and Cid
  R.starts.c11a = R.disc2Profile({
    members: ["barret","redxiii","yuffie","caitsith","vincent","cid","cloud","tifa"],
    party: ["cloud","tifa","cid"],
    names: {"cloud":"Cloud","barret":"Barret","tifa":"Tifa","redxiii":"Red XIII","yuffie":"Yuffie","caitsith":"Cait Sith","vincent":"Vincent","cid":"Cid"},
    levels: {"cloud":43,"barret":42,"tifa":41,"redxiii":40,"yuffie":39,"caitsith":38,"vincent":39,"cid":43},
    gil: 29170,
    gp: 0,
    disc: 2,
    phs: true,
    map: "highwind_bridge",
    entry: "start",
    worldPos: {"x":108,"y":141},
    vehicles: {"highwind":{"x":108,"y":140},"submarine":{"x":224,"y":184}},
    keyItems: ["huge_materia_corel","huge_materia_condor","leviathan_scales","huge_materia_underwater","huge_materia_rocket"],
    items: {"guide_book":1,"talisman":1,"earring":1,"protect_vest":1,"fury_ring":1,"potion":12,"hi_potion":21,"ether":12,"turbo_ether":4,"elixir":5,"megalixir":2,"phoenix_down":23,"remedy":10,"antidote":6,"soft":5,"maidens_kiss":5,"echo_screen":5,"eye_drop":5,"hyper":4,"tranquilizer":4,"tent":3,"curse_ring":1,"diamond_bangle":1,"rune_armlet":1,"gold_armlet":1,"s_mine":2,"grenade":2,"battle_trumpet":1,"shinra_beta":2,"scimitar":1,"dragon_claw":1},
    vars: {"c7_oldman_talks":3,"chocobo_pen":[],"c12b_on_choco":0,"mg_best_train_escape":869,"mg_best_fort_condor":0,"mg_best_submarine":6673},
    equip: {"cloud":{"weapon":"organics","armor":"diamond_bangle","accessory":"power_wrist"},"barret":{"weapon":"am_cannon","armor":"imperial_guard","accessory":"fairy_ring"},"tifa":{"weapon":"gods_hand","armor":"diamond_bangle","accessory":"ribbon"},"redxiii":{"weapon":"crystal_comb","armor":"warrior_bangle","accessory":"star_pendant"},"yuffie":{"weapon":"hawkeye","armor":"gold_armlet","accessory":"silver_glasses"},"caitsith":{"weapon":"red_m_phone","armor":"gold_armlet","accessory":"headband"},"vincent":{"weapon":"lariat","armor":"silver_armlet","accessory":"peace_ring"},"cid":{"weapon":"partisan","armor":"crystal_bangle","accessory":"ribbon"}},
    limits: {"cloud":["braver","cross_slash","blade_beam","climhazzard","meteorain","finishing_touch"],"barret":["big_shot","mindblow","grenade_bomb","hammerblow","satellite_beam","ungarmax","catastrophe"],"tifa":["beat_rush","somersault","waterkick","meteodrive","dolphin_blow","meteor_strike"],"redxiii":["sled_fang","lunatic_high","blood_fang","stardust_ray","howling_moon","earth_rave"],"yuffie":["greased_lightning","clear_tranquil","landscaper","bloodfest","gauntlet","doom_of_the_living"],"caitsith":["dice","slots"],"vincent":["galian_beast","death_gigas","hellmasker"],"cid":["boost_jump","dynamite","hyper_jump","dragon","dragon_dive","big_brawl"]},
    materia: {"cloud":[{"id":"lightning","ap":22945},{"id":"all","ap":8945},{"id":"restore","ap":28945},{"id":"all","ap":8970},{"id":"hp_plus","ap":23945},{"id":"revive","ap":48470},{"id":"mp_plus","ap":14470},{"id":"time","ap":11470},{"id":"counter_attack","ap":13945},{"id":"cover","ap":13945},{"id":"barrier","ap":18470}],"barret":[null,null,{"id":"fire","ap":19525},null,null,{"id":"long_range","ap":20525},null,null,{"id":"luck_plus","ap":17050},{"id":"speed_plus","ap":17050}],"tifa":[{"id":"elemental","ap":12945},{"id":"lightning","ap":4945},{"id":"heal","ap":14945},{"id":"neo_bahamut","ap":10995},{"id":"mp_plus","ap":13945},{"id":"enemy_skill","ap":0,"eskills":["frog_song","l4_suicide","magic_hammer","white_wind","big_guard","death_force","flame_thrower","laser","matra_magic","bad_breath","beta","aqualung","trine","magic_breath","death_sentence"]},{"id":"mega_all","ap":23945},{"id":"deathblow","ap":10945},{"id":"hp_plus","ap":24470}],"redxiii":[{"id":"restore","ap":18525},null,null,{"id":"enemy_skill","ap":0,"eskills":["frog_song","l4_suicide","magic_hammer","white_wind","big_guard","death_force","flame_thrower","laser","matra_magic","bad_breath","beta","aqualung","trine","magic_breath","death_sentence"]},null,{"id":"ice","ap":20525},{"id":"kujata","ap":23525},null,null,{"id":"seal","ap":11525}],"yuffie":[{"id":"steal","ap":18000},{"id":"throw","ap":12000},{"id":"poison","ap":6000},{"id":"mystify","ap":8000},{"id":"ifrit","ap":7000}],"caitsith":[{"id":"manipulate","ap":9000},{"id":"transform","ap":9000},{"id":"titan","ap":16000},{"id":"ramuh","ap":11000},{"id":"exit","ap":5000},{"id":"destruct","ap":7000}],"vincent":[{"id":"morph","ap":20000},{"id":"alexander","ap":26000},{"id":"choco_mog","ap":15000},{"id":"pre_emptive","ap":9000},{"id":"hp_absorb","ap":30000},{"id":"mp_absorb","ap":30000}],"cid":[{"id":"restore","ap":28470},{"id":"all","ap":9470},{"id":"lightning","ap":22470},{"id":"all","ap":9470},{"id":"bahamut","ap":25945},{"id":"steal","ap":44470},{"id":"phoenix","ap":1945},{"id":"magic_plus","ap":13470},{"id":"odin","ap":19995},{"id":"gravity","ap":13470},{"id":"ultima","ap":1945},{"id":"enemy_skill","ap":0,"eskills":["frog_song","l4_suicide","magic_hammer","white_wind","big_guard","death_force","flame_thrower","laser","matra_magic","bad_breath","beta","aqualung","trine","magic_breath","death_sentence"]}]},
    stock: [{"id":"ice","ap":20000},"enemy_away","enemy_lure",{"id":"chocobo_lure","ap":3000},"added_cut",{"id":"fire","ap":3000},{"id":"shiva","ap":16000},{"id":"earth","ap":2000},"chocobo_lure","contain",{"id":"sense","ap":12000},{"id":"fire","ap":20000},{"id":"added_effect","ap":3525},{"id":"long_range","ap":21385},{"id":"earth","ap":8385},"bahamut_zero"],
    flags: ["aeris_dead","black_materia","c10_backdoor","c10_bridge_taken","c10_briefing","c10_carry_beaten","c10_catastrophe","c10_choco_fed","c10_cloud_speech","c10_condor_done","c10_condor_funds","c10_condor_hatched","c10_condor_intro","c10_condor_won","c10_contain","c10_core_guard","c10_core_seen","c10_corel_boarded","c10_corel_done","c10_corel_intro","c10_corel_rested","c10_corel_stopped","c10_crazy_met","c10_curse_ring","c10_elixir","c10_found_cloud","c10_front_cleared","c10_grunt_fight","c10_hostages","c10_in_space","c10_key_broken","c10_launched","c10_lift_fight","c10_ls_hub","c10_ls_nibel","c10_ls_reactor","c10_ls_room","c10_ls_station","c10_ls_tower","c10_mideel_arrived","c10_mideel_quake","c10_old_key","c10_pad_seen","c10_path_fight","c10_rocket_hint","c10_rt_intro","c10_rude_beaten","c10_shera_warn","c10_squad_beaten","c10_subhall_fight","c10_train_first","c10_ultima","c10_uw_cannon","c10_uw_done","c10_uw_intro","c11a_bahamut_zero","c11a_started","c12b_ult_told","c1_barret_joined","c1_bomb_set","c1_bought_flower","c1_bridge_seen","c1_core_talk","c1_door_open","c1_elevator_talk","c1_escape","c1_flower_done","c1_gate_open","c1_intro_done","c1_jessie_free","c1_jessie_tip","c1_out_msg","c1_s8_intro","c1_train_talk","c2_air_buster_beaten","c2_alarm","c2_arrived","c2_bar_intro","c2_barret_stormed","c2_basement_talk","c2_biggs_talk","c2_debrief","c2_departed","c2_door_open","c2_drink","c2_fell","c2_hall_visit","c2_hipotion","c2_jessie_talk","c2_jumped","c2_kid_paid","c2_landed","c2_marlene_flower","c2_md5_bomb","c2_md5_hall","c2_md5_in","c2_md5_lift_talk","c2_md5_panel","c2_md5_vision","c2_morning","c2_pd_given","c2_pickpocketed","c2_pillar_seen","c2_plate_in","c2_promise","c2_scene_bar","c2_scene_morning","c2_scene_promise","c2_tifa_joined","c2_train_caught","c2_train_intro","c2_trap","c2_vent","c2_wedge_talk","c3_aeris_freed","c3_aeris_rejoined","c3_aps_beaten","c3_back_done","c3_back_scene","c3_barrels_on","c3_barret_joined","c3_barret_plan","c3_biggs_talk","c3_card_got","c3_church_escape","c3_church_intro","c3_cologne_got","c3_corneo_done","c3_coupon_got","c3_disguise_plan","c3_dress_asked","c3_dress_got","c3_dressed","c3_dressmaker_done","c3_elmyra_met","c3_elmyra_request","c3_elmyra_story","c3_garden_talk","c3_grief_done","c3_hb_room_used","c3_hb_seen","c3_hb_tip","c3_house_arrived","c3_jessie_talk","c3_kid_5gil_taken","c3_kid_drawer","c3_kid_turbo","c3_lackey_intro","c3_lackeys_beaten","c3_landed","c3_makeup_done","c3_park_scene","c3_pillar_arrive","c3_plate_fallen","c3_rafters_talk","c3_reno_beaten","c3_s6_talk","c3_saw_no2","c3_sewer_intro","c3_slept","c3_swing_talk","c3_tg_moved","c3_tg_roof","c3_tg_talk","c3_tg_train1","c3_tgn_talk","c3_tiara_got","c3_tiara_quest","c3_tifa_basement","c3_tifa_found","c3_to_wire","c3_town_talk","c3_tunnel_talk","c3_turtle_flyer1","c3_vend_done","c3_wedge_talk","c3_wig_got","c3_wig_quest","c3_wire_done","c3_wire_seen","c3_wire_start","c3_wm_arrived","c4_59f_fight","c4_60f_passed","c4_63_terminal","c4_arrived","c4_back_door","c4_bike","c4_box","c4_captured","c4_chase_done","c4_decided","c4_domino_done","c4_domino_met","c4_escape_started","c4_eskill","c4_flyer_turtle2","c4_gunner_done","c4_h0512_done","c4_jail_door","c4_jail_intro","c4_jail_night","c4_jail_out","c4_jail_tifa","c4_jenova_seen","c4_keycard62","c4_keycard68","c4_lobby_fight","c4_lobby_reunion","c4_meeting_done","c4_motorball_done","c4_president_found","c4_president_talk","c4_ride_done","c4_route_front","c4_rufus_arrived","c4_rufus_beaten","c4_stairs_done","c4_tank_empty","c4_trail_68","c4_trail_intro","c4_vending_bang","c5a_arrived","c5a_ether_a","c5a_ether_clock","c5a_ether_far","c5a_fb_arrived","c5a_fb_bridge","c5a_fb_chase","c5a_fb_days","c5a_fb_door","c5a_fb_end","c5a_fb_fall","c5a_fb_fire","c5a_fb_fire_seen","c5a_fb_fountain","c5a_fb_library1","c5a_fb_library2","c5a_fb_mansion_in","c5a_fb_mom","c5a_fb_morning","c5a_fb_night","c5a_fb_path","c5a_fb_piano","c5a_fb_reactor","c5a_fb_tifa","c5a_fb_truck","c5a_flashback_done","c5a_guard_source","c5a_mako_asked","c5a_megalixir","c5a_old_asked","c5a_piano_jammed","c5a_piano_tune","c5a_story_start","c5b_airport_arrived","c5b_arrived","c5b_bill_talked","c5b_billy_talked","c5b_bottomswell","c5b_chocomog","c5b_condor_fund","c5b_condor_gate","c5b_condor_joined","c5b_condor_w","c5b_dolphin_jump","c5b_engine_seen","c5b_farm_arrived","c5b_jenova_birth","c5b_junon_arrived","c5b_junon_slept","c5b_mine_entered","c5b_parade_done","c5b_phs_taken","c5b_priscilla_saved","c5b_sendoff_done","c5b_ship_aeris","c5b_ship_alarm","c5b_ship_boarded","c5b_ship_intro","c5b_ship_red","c5b_ship_tifa","c5b_shiva","c5b_tifa_talk","c5b_turks_mine","c5b_whistle","c5b_yuffie_tranq","c5b_zolom_seen","c6a_arrived","c6a_ball","c6a_barret_left","c6a_barret_rejoined","c6a_barret_story","c6a_bridge_down","c6a_coates_talked","c6a_costa_left","c6a_done","c6a_dyne_done","c6a_framed","c6a_gbike_prize","c6a_hojo_talked","c6a_jockey_intro","c6a_johnny_met","c6a_johnny_tifa","c6a_junk_seen","c6a_miner_talked","c6a_mog_cleared","c6a_mog_reward","c6a_ncorel_arrival","c6a_ncorel_ether","c6a_nest","c6a_oldman_talked","c6a_prison_arrival","c6a_race_explained","c6a_race_intro","c6a_race_started","c6a_reactor_barret","c6a_saw_saucer","c6a_turtle_flyer3","c6a_umbrella","c6a_villa_owned","c6a_waterside_seen","c6a_wizard_staff","c6b_buggy_repaired","c6b_candle_done","c6b_candle_intro","c6b_candle_start","c6b_cosmo_arrived","c6b_done","c6b_elixir","c6b_farewell","c6b_gi_asked","c6b_gi_intro","c6b_gi_nattak","c6b_gi_oil_seen","c6b_gi_open","c6b_gi_rock","c6b_gi_secret","c6b_gi_web","c6b_gongaga_arrived","c6b_magic_source","c6b_met_bugen","c6b_planetarium","c6b_reactor_scene","c6b_reactor_seen","c6b_seto","c6b_titan","c6b_turks_done","c6b_turtle_flyer4","c6b_turtle_flyer5","c6b_village_seen","c6b_wasteland_seen","c6b_zack_friends","c6b_zack_heard","c7_bronco_seen","c7_cid_met","c7_cloud_house","c7_clue1","c7_clue2","c7_clue3","c7_clue4","c7_coffin_unlocked","c7_dachao_fire_out","c7_dachao_seen","c7_fountain","c7_inn_talk","c7_keeper_dead","c7_mansion_in","c7_mansion_passage","c7_nibel_arrived","c7_nibel_base","c7_nibel_bridge","c7_nibel_ladder","c7_nibel_ledge_hint","c7_nibel_path","c7_palmer_done","c7_piano_gil","c7_piano_tune","c7_reactor_seen","c7_rocket_arrived","c7_safe_open","c7_seph_library","c7_shera_met","c7_tea","c7_tifa_room","c7_tower_talk","c7_turtle_flyer6","c7_turtle_prize","c7_turtle_sign","c7_vincent_1","c7_vincent_2","c7_wq_bell","c7_wq_godo","c7_wq_kidnap","c7_wq_mpabsorb","c7_wq_pot","c7_wq_pubturks","c7_wq_rapps","c7_wq_screen","c7_wq_shrine","c7_wq_stolen","c7_wq_town","c7_wq_trap","c7_wq_turks","c7_wutai_arrived","c7_wutai_done","c7_yoshiyuki","c8_altar_scene","c8_ancient_room","c8_bone_aeris","c8_bone_seen","c8_boulders_done","c8_boulders_seen","c8_bronco_boarded","c8_cait_spy","c8_capital_arrived","c8_capital_slept","c8_cave_seen","c8_center_seen","c8_chase2","c8_clock_seen","c8_crystal_seen","c8_date_done","c8_demons_gate","c8_dig_explained","c8_disc2_speech","c8_forest_awake","c8_forest_seen","c8_gate_solved","c8_gate_started","c8_gs_back","c8_keystone_bonus","c8_keystone_got","c8_kjata_seen","c8_maze_intro","c8_model_seen","c8_north_seen","c8_pool_vision","c8_red_dragon","c8_red_dragon_seen","c8_room1_battle","c8_room3_battle","c8_room_elixir","c8_ropeway_broken","c8_sephiroth_mural","c8_shell_seen","c8_temple_arrived","c8_temple_done","c8_trunk_seen","c8_tseng","c8_valley_out","c8_valley_seen","c8_woke","c8_ws_met","c8_ws_paid","c9_airship_seen","c9_arrived","c9_attack_squad","c9_barret_free","c9_base_seen","c9_boarded","c9_bolt_seen","c9_boulder","c9_bridge_seen","c9_cannon_seen","c9_cave1_seen","c9_cave_done","c9_center","c9_cliff1_seen","c9_climb_help","c9_clone","c9_cold_warned","c9_corridor_seen","c9_dock_guard","c9_elena","c9_escaped","c9_escort","c9_first_takeoff","c9_floe_fell","c9_floes_seen","c9_gas_stopped","c9_gas_strapped","c9_gast_seen","c9_gust_seen","c9_hall_seen","c9_holzoff_met","c9_hotspring","c9_hw_meeting","c9_icicle_warned","c9_icicles_down","c9_illusion","c9_jenova_death","c9_junon_woke","c9_key","c9_landed","c9_mapwall","c9_maze_seen","c9_press","c9_reporter","c9_rescued","c9_rim_seen","c9_rode","c9_scarlet","c9_schizo","c9_slap_done","c9_snow_beaten","c9_snow_met","c9_snowboard_tips","c9_snowfield_seen","c9_spring_seen","c9_tape","c9_tapes_talk","c9_walk_seen","c9_wall_blasted","c9_wind_seen","cait_joined","chocobo_lure","cid_joined","cloud_returned","disc2","got_condor2_phoenix","got_side_farm_lure2","got_uwreactor_dock_scales","got_uwreactor_dock_scimitar","got_uwreactor_dock_trumpet","has_bronco","has_buggy","has_highwind","has_phs","has_submarine","huge_materia_condor","huge_materia_corel","huge_materia_done","huge_materia_rocket","huge_materia_underwater","keystone","left_midgar","meteor","redxiii_joined","trig_corel2_train_hop1","trig_corel2_train_hop2","trig_corel2_train_hop3","trig_corel2_train_hop4","trig_lifestream_void_fall","trig_lifestream_void_voices","trig_mansion_basement_library","trig_mtnibel_pipes_keeper","trig_rocket_engine_meet_cid","trig_rocket_pad_c10_rude","trig_rocket_pad_c10_squad1","trig_rocket_pad_c10_squad2","trig_uwreactor_core_mps","trig_uwreactor_core_sneak","trig_uwreactor_dock_greydock","trig_uwreactor_dock_reno","trig_uwreactor_pipe_pipe_view","vincent_joined","yuffie_joined"],
  });

  const takeOff = R.c10TakeOff;
  const inPocket = (s, R) => { const f = R.field(); return !!f && f.map.id === 'midgar2_ug3' && f.player.ty <= 7 && f.player.tx >= 23; };
  const outOfPocket = (s, R) => { const f = R.field(); return !!f && f.map.id === 'midgar2_ug3' && f.player.ty >= 13; };

  R.plans.c11a = [
    ['chapter', 'c11a', 'Chapter 11a: Holy, Diamond WEAPON and the Midgar raid'],
    ['expect', 'huge_materia_done'],                                 // the handoff from C10 (the escape pod)
    ['expect', 'c11a_started'],                                      // Bugenhagen came aboard (his scene plays on arrival)

    // ---- Rocket Town, just below: now that No. 26 has flown, the old man's spear for Cid
    ['obj', "Rocket Town: the old rocket fan's gift"],
    takeOff({ done: 'c10_venus_gospel' }),
    ['world', 'rocket_town', { choose: 'Keep our distance', done: 'c10_venus_gospel' }],
    ['talk', 'oldman', { times: 3, done: 'c10_venus_gospel' }],     // Venus Gospel
    ['autoequip', { slots: ['weapon'] }],
    // the shops' chests that open once the Highwind flies (Item/Materia Locations FAQ): the Fourth Bracelet, a Guard
    // Source; and the weapon shop's kinds the party never had (the Earring, the Gold Armlet...)
    ['goto', 'rocket_weapons', { done: 'got_rocket_weapons_fourth' }],
    ['chest', 'rocket_weapons_fourth'],
    ['goto', 'rocket_items', { done: 'got_rocket_items_guard_source' }],
    ['chest', 'rocket_items_guard_source'],
    // (Tents for the Sector 8 underground: its save point is the training's only rest before the Turks)
    ['shop', 'shopkeeper', { choose: 'Items', buy: [['tent', 8]], lenient: true, done: (s) => FF7.sys.inv.count('tent') >= 8 }],
    ['collect', { kinds: ['materia', 'gear'], keepGil: 30000, shops: [['rocket_weapons', 'shopkeeper', 'rocket_town_weapons_d2'], ['rocket_items', 'shopkeeper', 'rocket_town_materia_d2', 'Materia']] }],

    // ---- the Forgotten Capital: Holy, and the key it needs
    ['obj', 'Take Bugenhagen to the Forgotten Capital'],
    ['world', 'forgotten_capital', { choose: 'Keep our distance', done: 'c11a_need_key' }],
    ['goto', 'holy_capital_hall', { done: 'c11a_need_key' }],       // the crystal chamber: Holy, the organ's lock
    ['expect', 'c11a_need_key'],
    ['ckpt', 'c11a_capital'],
    ['obj', 'Find the Key to the Ancients under the sea off Bone Village'],
    ['c11a_diveForKey', { done: { any: [{ key: 'key_to_ancients' }, 'holy'] } }],   // the Highwind to the submarine, the undersea tunnel
    ['expect', { any: [{ key: 'key_to_ancients' }, 'holy'] }],
    ['world', 'forgotten_capital', { choose: 'Keep our distance', done: 'holy' }],
    ['goto', 'holy_capital_hall', { done: 'holy' }],
    ['use', 13, 1, { done: 'holy' }],                                // the key in the organ: Aeris' last prayer
    ['expect', 'holy'],
    ['exit', [0, 7], { done: 'c11a_diamond_alert' }],               // Cait Sith: Diamond WEAPON is walking on Midgar
    ['expect', 'c11a_diamond_alert'],
    ['ckpt', 'c11a_holy'],

    // ---- Diamond WEAPON on the coast outside Midgar
    ['obj', 'Stop Diamond WEAPON on the coast outside Midgar'],
    ['goto', 'world', { done: 'c11a_diamond_done' }],
    ['useItem', 'tent', null, { done: 'c11a_diamond_done' }],       // a Tent on the world map: full HP / MP
    ['battle', { steal: ['rising_sun'] }],                           // Diamond WEAPON's Rising Sun (Yuffie's)
    // Cloud: Barrier + All (Barrier / MBarrier on everyone at once against its Diamond Flash) and Restore + All
    ['loadout', 'cloud', { weapon: [['barrier', 'all'], ['restore', 'all'], 'lightning', 'hp_plus'], armor: ['revive', 'mp_plus', 'time', 'counter_attack', 'cover'] }, { done: 'c11a_diamond_done' }],
    ['world', 'midgar', { choose: 'Keep our distance', done: 'c11a_diamond_done' }],
    ['ckpt', 'c11a_diamond'],
    ['walk', 20, 7, { done: 'c11a_diamond_beaten' }],               // toward it: the fight, the Sister Ray
    ['expect', 'c11a_diamond_done'],
    ['battle', {}],

    // ---- the Northern Crater: the barrier is gone; Hojo has the cannon
    ['obj', "See what the Sister Ray did to the crater's barrier"],
    ['world', 'northern_crater', { choose: 'Keep our distance', done: 'c11a_hojo_news' }],
    ['expect', 'c11a_hojo_news'],
    ['ckpt', 'c11a_news'],

    // ---- the Midgar raid
    ['obj', 'Parachute into Midgar and stop Hojo'],
    ['party', ['cloud', 'barret', 'tifa'], { select: true }],       // Barret: the Missing Score is on the cannon's stairs
    ['minigame', 'parachute', { win: true }],
    ['world', 'midgar', { choose: 'Keep our distance', done: 'c11a_landed' }],
    ['expect', 'c11a_landed'],
    // Cloud and Barret heal (Restore + All), Cloud opens with Barrier / MBarrier and Haste and steals from the
    // Turks, Barret summons, Tifa hits hardest. No Counter Attack in the underground (it would hit the Behemoth
    // the party is holding fire on, see c11a_underground)
    ['loadout', 'cloud', { weapon: [['lightning', 'all'], ['restore', 'all'], 'hp_plus', 'revive'], armor: ['barrier', 'mp_plus', 'time', 'steal', 'cover'] }],
    ['loadout', 'barret', { weapon: [['restore', 'all'], ['ice', 'all'], 'enemy_skill', null], armor: ['bahamut_zero', 'neo_bahamut', 'hp_plus', 'magic_plus', 'mp_plus', 'odin'] }],
    ['loadout', 'tifa', { weapon: [['elemental', 'lightning'], 'heal', 'enemy_skill'], armor: ['bahamut', 'mp_plus', 'mega_all', 'deathblow', 'phoenix'] }],
    ['c10_accessory', 'cloud', 'ribbon'],                           // the second Ribbon (Cid's) for Cloud: Hojo's sleep and poison
    ['battle', {}],
    ['exit', 'midgar2_ug1', { done: 'got_midgar2_ug1_megalixir' }],  // the manhole
    ['items'],                                                       // Elixir, Megalixir
    ['goto', 'midgar2_ug2'],
    ['item', 'midgar2_ug2_aegis'],                                  // Aegis Armlet (up the ladder, before the catwalk)
    ['c10_walkUntil', 31, 9, 'c11a_ug2_fell', { choose: 'Keep going' }],   // the rusted catwalk gives way
    ['goto', 'midgar2_ug3'],
    ['item', 'midgar2_ug3_starlight'],                              // Starlight Phone
    ['item', 'midgar2_ug3_elixir'],                                 // Elixir
    ['c10_walkUntil', 20, 15, inPocket, {}],                        // the narrow pipe into the pocket
    ['item', 'midgar2_ug3_maxray'],                                 // Max Ray
    ['c10_walkUntil', 24, 7, outOfPocket, {}],
    ['save', { done: 'c11a_turks_done' }],
    ['ckpt', 'c11a_ug3'],
    // ???? from a Behemoth (10/72 of the Sector 8 underground's fights), and levels for the Turks: they leave as
    // soon as one of them falls (Reno, 25,000 HP) but hit hard (Rude's Shoulder Attack, 3x base: ~2,500 through
    // Barrier). From a full run's checkpoint, 20 fights each (the Auto AI finishing Reno with a summon when it can):
    // Cloud 52 / Tifa 49 / Barret 43 lost 6, Barret 47: 3, Barret 48: 1, all 50+: none. `min`: nobody under it
    // (the average hid Barret at 43, knocked out first)
    ['obj', '???? from a Behemoth; levels for the Turks'],
    ['c11a_underground', { max: 40, level: 50, min: 48, levelMax: 90, done: 'c11a_turks_done', budget: 3000000 }],
    ['equip', 'barret', 'weapon', 'max_ray', { done: 'c11a_turks_done' }],
    ['equip', 'cloud', 'armor', 'aegis_armlet', { done: 'c11a_turks_done' }],   // Magic evasion 50% (Turk Light, Grand Spark)
    ['loadout', 'cloud', { armor: ['barrier', 'time', 'counter_attack', 'steal'] }, { done: 'c11a_turks_done' }],
    ['save', { done: 'c11a_turks_done' }],
    ['c11a_rest', { done: 'c11a_turks_done' }],
    ['ckpt', 'c11a_turks'],
    ['goto', 'midgar2_tunnel', { done: 'c11a_turks_done' }],
    // the Turks: fought ("Let's settle this."). Cloud steals Rude's Ziedrich in the first turns only (the fight is
    // short, and every turn spent stealing is one less toward the first Turk to fall) - not when Rocket Town's Rude
    // (C10) already gave one
    ['js', (s, R) => {
      R.battleOpts = { get steal() {
        const b = R.curBattle, rude = b && b.enemies.find(e => e.id === 'rude_4');
        return !rude || rude.stolen || !rude.targetable || (b.turnCount || 0) >= 6 || R.gear.owned('ziedrich') > 0 ? [] : ['ziedrich'];
      } };
      R.say('battle tactics: Cloud steals the Ziedrich (the first six turns)');
      return true;
    }, { done: 'c11a_turks_done' }],
    ['walk', 9, 4, { choose: "Let's settle this", done: 'c11a_turks_done' }],
    ['expect', 'c11a_turks_done'],
    ['battle', {}],
    ['goto', 'midgar2_winding1'],
    ['items'],                                                       // Power Source, Guard Source
    ['goto', 'midgar2_winding2'],
    ['items'],                                                       // Magic Source, Mind Source, W-Item Materia

    // ---- the deserted Shinra Building (the last visit)
    ['obj', 'Search the deserted Shinra Building'],
    ['goto', 'midgar2_hq_plaza'],
    ['exit', [33, 3], { done: 'got_midgar2_hq_behemoth' }],          // the emergency stairs: flight 1
    ['exit', [2, 1], { done: 'got_midgar2_hq_behemoth' }],           // 2
    ['exit', [2, 1], { done: 'got_midgar2_hq_behemoth' }],           // 3
    ['exit', [2, 1], { done: 'got_midgar2_hq_behemoth' }],           // 4
    ['exit', [2, 1], { done: 'got_midgar2_hq_behemoth' }],           // 5: the landing
    ['item', 'midgar2_hq_behemoth'],                                // Behemoth Horn
    ['c11a_downStairs'],                                             // five flights down to the plaza
    ['goto', 'midgar2_hq_2f'],
    ['items'],                                                       // Pile Banger, Master Fist
    ['goto', 'midgar2_hq_lobby'],
    ['exit', [13, 1], { choose: '63F', done: 'got_midgar2_hq_growlance' }],   // the elevator (emergency power)
    ['item', 'midgar2_hq_growlance'],                               // Grow Lance
    ['goto', 'midgar2_hq_64f'],
    ['use', 30, 2, { done: 'c11a_hq_hpshout' }],                    // the locker: HP Shout
    ['use', 21, 8, { choose: 'whack', done: 'c11a_hq_vending' }],   // the vending machine: Mind Source, Speed Source
    ['use', 2, 7, { choose: 'Stay' }],                               // a nap in the relaxation room
    ['save'],
    ['autoequip', { slots: ['weapon', 'armor'] }],
    ['exit', [15, 1], { choose: '1F', done: { map: 'midgar2_hq_lobby' } }],

    // ---- the Sister Ray: Proud Clod, then Hojo
    ['obj', 'Climb to the Sister Ray'],
    ['goto', 'midgar2_cannon_base', { done: 'c11a_clod_done' }],
    ['expect', 'c11a_base_seen'],                                    // (a resume point: at the Sister Ray's foot)
    ['ckpt', 'c11a_clod'],
    ['walk', 19, 8, { done: 'c11a_clod_done' }],                    // Proud Clod (Scarlet and Heidegger): Ragnarok
    ['expect', 'c11a_clod_done'],
    ['autoequip', { slots: ['weapon'] }],                            // Ragnarok for Cloud
    ['goto', 'midgar2_cannon_yard'],
    ['items'],                                                       // Elixir, Mystile
    ['save'],
    ['c11a_rest', { done: 'c11a_hojo_done' }],
    ['autoequip', { slots: ['weapon', 'armor'] }],
    // the stairs' soldiers are fought (running only held Defend while the escape kept failing: a Game Over in a
    // test run); Limit Breaks are kept for Hojo, and the party is patched up at the top. SOLDIER:1st carries a
    // Shinra Alpha (its last source: stolen when the Underwater MPs' steal missed)
    ['battle', { limit: 'hold' }],
    ['js', (s, R) => { if (!R.gear.owned('shinra_alpha')) R.battleOpts = { limit: 'hold', steal: ['shinra_alpha'] }; return true; }],
    ['goto', 'midgar2_cannon_stairs', { done: 'c11a_hojo_done' }],
    ['item', 'midgar2_stairs_missingscore'],                        // Missing Score (Barret in the party)
    ['goto', 'hojo_control', { done: 'c11a_hojo_done' }],
    ['heal', { below: 0.9, done: 'c11a_hojo_done' }],
    ['battle', {}],
    ['battle', { limit: 'use' }],
    ['ckpt', 'c11a_hojo'],
    ['walk', 14, 6, { done: 'c11a_hojo_done' }],                    // Hojo; the Sister Ray shut down; the end of Disc 2
    ['expect', 'c11a_hojo_done'],
    ['expect', 'disc3'],
    ['ckpt', 'c11a_end'],
  ];

  // ['c11a_downStairs']: down the Shinra Building's emergency stairs to the plaza, a flight at a time
  R.ops.c11a_downStairs = function* () {
    for (let g = 0; g < 10 && R.where() === 'midgar2_hq_stairs'; g++) {
      const r = yield* R.ops.exit([0, 9]); if (r !== true) return r;
      yield* R.settle(3);
    }
    return R.where() === 'midgar2_hq_plaza' ? true : 'down the stairs: ended on ' + R.where();
  };

  // ['c11a_rest']: full HP / MP before a boss, from the Item screen: a Tent (at a save point or on the world map),
  // else a Megalixir, else an Elixir on whoever is worn down (the underground's fights use up the Tents)
  R.ops.c11a_rest = function* () {
    const inv = (id) => FF7.sys.inv.count(id) > 0;
    const fs = R.field(), savePt = !fs || fs.objects.some(o => o.kind === 'save');
    if (inv('tent') && savePt) return yield* R.ops.useItem('tent', null);
    if (inv('megalixir')) return yield* R.ops.useItem('megalixir', null);
    for (const c of FF7.sys.party.active()) {
      if (c.hp >= c.maxHp * 0.9 && c.mp >= c.maxMp * 0.6) continue;
      if (!inv('elixir')) break;
      const r = yield* R.ops.useItem('elixir', c.id); if (r !== true) return r;
    }
    return yield* R.ops.heal({ below: 0.9 });
  };

  // ['c11a_underground', { pct, max, level, levelMax }]: random battles here until a Behemoth teaches ???? (Enemy-Skill
  // FAQ: it casts it more often the more hurt it is; damage = the HP it has lost), then on to an average `level`.
  // A Behemoth is only ever hit with plain attacks (it answers any magic with Flare, ~5000: the Auto AI's spells
  // wiped the party in a test run). While ???? is unknown it is hit down to `pct` of its HP (0.65: ???? then does
  // ~2500, a hit most can take; at half HP it would one-shot anyone at this level), counting the attacks already
  // queued; then the party holds fire, heals (a Cure or Hi-Potion on whoever is under 70%) and waits. All of it is
  // the engine's battle options (learn { enemyHpBelow, hold }, physicalOnly; docs/RUNNER.md).
  R.ops.c11a_underground = function* (o = {}) {
    const have = () => R.masterKnows('question');
    const keep = R.battleOpts;
    R.battleOpts = { learn: { skill: 'question', enemyHpBelow: o.pct || 0.65, hold: true }, learnTurns: 400, limit: 'hold', physicalOnly: ['behemoth'] };
    try {
      if (!have()) { const r = yield* R.ops.fightUntil(have, { max: o.max || 40 }); if (r !== true) return r; }
      R.battleOpts = { physicalOnly: ['behemoth'] };
      // (restDry: a Tent at the save point when the casters run dry too - a full run lost to two Cromwells fought on
      // empty MP)
      if (o.level) { const r = yield* R.ops.level(o.level, { max: o.levelMax || 40, min: o.min, restDry: true }); if (r !== true) return r; }
    } finally { R.battleOpts = keep; }
    return true;
  };

  // ['c11a_diveForKey']: the Highwind to the parked submarine (landing where it can be walked to), the
  // submarine to the waters off Bone Village, dive over the tunnel under the Forgotten Capital (the Key to the
  // Ancients: C11a's world step hook), surface and back to the Highwind (c10_boardAirship).
  const KEY_SEA = [196, 110], LANDABLE = 'gsdnwxpch';
  R.ops.c11a_diveForKey = function* () {
    const have = () => FF7.sys.inv.hasKey('key_to_ancients') || R.cond('holy');
    if (have()) return true;
    if (R.where() !== 'world') { const g = yield* R.gotoMap('world'); if (g !== true && g !== 'mapchanged') return g; yield* R.settle(3); }
    const D = R.worldD(), W = D.w, H = D.h, tile = (x, y) => D.rows[((y % H) + H) % H][((x % W) + W) % W];
    let ws = R.worldScene();
    if (!ws || ws.vehicle !== 'submarine') {
      const sub = FF7.state.world.vehicles.submarine; if (!sub) return 'diveForKey: no submarine parked';
      let r = yield* R.ops.c10_boardAirship(); if (r !== true) return r;
      ws = R.worldScene();
      const spots = R.boardSpots(ws, 'submarine', sub);
      // a landing tile near the submarine from which its boarding tiles can be walked to
      let land = null;
      for (let rad = 3; rad <= 9 && !land; rad++) for (let dy = -rad; dy <= rad && !land; dy++) for (let dx = -rad; dx <= rad && !land; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
        const x = sub.x + dx, y = sub.y + dy;
        if (!LANDABLE.includes(tile(x, y)) || R.entries()[(((x % W) + W) % W) + ',' + (((y % H) + H) % H)]) continue;
        const reach = spots.filter(q => Math.hypot(q[0] - x, q[1] - y) > 2.4);   // boarding tiles out of the Highwind's own reach
        if (reach.length && R.worldPath(ws, x, y, reach, null)) land = [x, y];
      }
      if (!land) return 'diveForKey: nowhere to land near the submarine';
      r = yield* R.fly(land[0], land[1]); if (r !== true) return 'diveForKey: ' + r;
      yield* R.pressWorld('ok');
      // aboard from a tile out of the parked Highwind's reach (OK would take the airship up again)
      ws = R.worldScene();
      const hw = FF7.state.world.vehicles.highwind;
      const far = spots.filter(q => !hw || Math.hypot(q[0] - hw.x, q[1] - hw.y) > 2.4);
      r = yield* R.walkWorld(far.length ? far : spots); if (r !== true) return 'diveForKey: ' + r;
      yield* R.pressWorld('ok');
      ws = R.worldScene();
      if (!ws || ws.vehicle !== 'submarine') return 'diveForKey: could not get aboard the submarine';
    }
    // deep water over the tunnel
    const deep = [];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const c = tile(KEY_SEA[0] + dx, KEY_SEA[1] + dy); if (c === 'O' || c === 'R') deep.push([KEY_SEA[0] + dx, KEY_SEA[1] + dy]); }
    if (deep.length < 2) return 'diveForKey: no deep water over the tunnel';
    if (ws.dived) yield* R.pressWorld('square');
    let r = yield* R.walkWorld(deep, { maxNodes: 400000 }); if (r !== true) return 'diveForKey: ' + r;
    yield* R.pressWorld('square');                                   // dive
    ws = R.worldScene();
    if (!ws || !ws.dived) return 'diveForKey: could not dive here';
    for (let tries = 0; tries < 6 && !have(); tries++) {
      const here = [Math.floor(ws.px), Math.floor(ws.pz)];
      const next = deep.filter(t => !(t[0] === here[0] && t[1] === here[1]) && Math.max(Math.abs(t[0] - here[0]), Math.abs(t[1] - here[1])) <= 1);
      r = yield* R.walkWorld(next.length ? next : deep.filter(t => t[0] !== here[0] || t[1] !== here[1]));
      yield* R.settle(10);
      ws = R.worldScene(); if (!ws) break;
    }
    if (!have()) return 'diveForKey: the tunnel gave nothing';
    ws = R.worldScene();
    if (ws && ws.dived) yield* R.pressWorld('square');               // surface
    return yield* R.ops.c10_boardAirship();
  };
})();
