// Runner plan, Chapter 10: Mideel and the Huge Materia (docs/RUNNER.md).
// Starts in the Highwind on the world map (C9's handoff: has_highwind; Cid leads, Cloud is missing) and ends
// in the escape pod: s.set('huge_materia_done'); s.goto('highwind_bridge', 'start') (C11a's opening runs there).
// Route (the Walkthrough's {30}-{36}, in this game's maps):
//   Chocobo Farm (the second Chocobo Lure, Mimett Greens for Mideel's white chocobo) -> Mideel before the quake
//   (the eccentric shopper, Elixir from the white cat, Contain from the white chocobo, the old key and the
//   Curse Ring, the shops) -> the clinic, Tifa stays -> the Highwind briefing (Cid picks the party)
//   -> North Corel: the Attack Squad, the lever chase, the wagons (Warrior Bangle stolen from Eagle Gun), the
//   train stopped (Huge Materia + Ultima), the night in town, Catastrophe from the woman in the green hat
//   -> Fort Condor: the enemy is let through to the shack on purpose (the Walkthrough's advice) for CMD. Grand
//   Horn and his Imperial Guard, then the hatching, the Phoenix Materia and the Huge Materia
//   -> Mideel: Tifa, Ultimate WEAPON (Curse Ring stolen), the Lifestream (Tifa puts Cloud's memories back)
//   -> Cloud's talk on the Highwind -> Junon: the Underwater Reactor (Shinra Alpha stolen from the MPs), Carry
//   Armor (God's Hand), the Battle Trumpet / Scimitar / Leviathan Scales chests, the grey submarine (the crew
//   taken hostage), the chase won (Huge Materia + the submarine) -> Rocket Town: the pad, Rude (Ziedrich
//   stolen if lucky), Palmer, the launch, Cid's code, tank No. 8 and the escape pod.
(function () {
  const R = FF7.runner;

  // ------------------------------------------------------------------ start profile (C9's end, estimated)
  // Every story / pick-up flag C1-C9 set (the whole of Disc 1 and the Northern Crater done), minus the
  // branches not taken and the temporary ones; Yuffie and Vincent recruited; Cloud missing. Levels ~40 (the
  // Walkthrough's pace with the optional Disc 1 content done); Disc 1 equipment (the Icicle Inn shop's
  // weapons, Bone Village armour) and the materia found on Disc 1. Cid leads, Tifa and Barret (C9's meeting).
  const DISC1_FLAGS = ('aeris_dead black_materia c1_barret_joined c1_bomb_set c1_bought_flower c1_bridge_seen c1_core_talk c1_door_open ' +
    'c1_elevator_talk c1_escape c1_flower_done c1_gate_open c1_intro_done c1_jessie_free c1_jessie_tip c1_out_msg c1_s8_intro c1_train_talk ' +
    'c2_air_buster_beaten c2_alarm c2_arrived c2_bar_intro c2_barret_stormed c2_basement_talk c2_biggs_talk c2_debrief c2_departed ' +
    'c2_door_open c2_drink c2_fell c2_hall_visit c2_hipotion c2_jessie_talk c2_jumped c2_kid_paid c2_landed c2_marlene_flower c2_md5_bomb ' +
    'c2_md5_hall c2_md5_in c2_md5_lift_talk c2_md5_panel c2_md5_vision c2_morning c2_pd_given c2_pickpocketed c2_pillar_seen c2_plate_in ' +
    'c2_promise c2_scene_bar c2_scene_morning c2_scene_promise c2_tifa_joined c2_train_caught c2_train_intro c2_trap c2_vent c2_wedge_talk ' +
    'c3_aeris_freed c3_aeris_rejoined c3_aps_beaten c3_back_done c3_back_scene c3_barrels_on c3_barret_joined c3_barret_plan c3_biggs_talk ' +
    'c3_card_got c3_church_escape c3_church_intro c3_cologne_got c3_corneo_done c3_coupon_got c3_disguise_plan c3_dress_asked c3_dress_got ' +
    'c3_dressed c3_dressmaker_done c3_elmyra_met c3_elmyra_request c3_elmyra_story c3_garden_talk c3_grief_done c3_hb_room_used c3_hb_seen ' +
    'c3_hb_tip c3_house_arrived c3_jessie_talk c3_kid_5gil_taken c3_kid_drawer c3_kid_turbo c3_lackey_intro c3_lackeys_beaten c3_landed ' +
    'c3_makeup_done c3_park_scene c3_pillar_arrive c3_plate_fallen c3_rafters_talk c3_reno_beaten c3_s6_talk c3_saw_no2 c3_sewer_intro ' +
    'c3_slept c3_swing_talk c3_tg_moved c3_tg_roof c3_tg_talk c3_tg_train1 c3_tgn_talk c3_tiara_got c3_tiara_quest c3_tifa_basement ' +
    'c3_tifa_found c3_to_wire c3_town_talk c3_tunnel_talk c3_turtle_flyer1 c3_vend_done c3_wedge_talk c3_wig_got c3_wig_quest c3_wire_done ' +
    'c3_wire_seen c3_wire_start c3_wm_arrived c4_59f_fight c4_60f_passed c4_63_terminal c4_arrived c4_back_door c4_bike c4_box c4_captured ' +
    'c4_chase_done c4_decided c4_domino_done c4_domino_met c4_escape_started c4_eskill c4_flyer_turtle2 c4_gunner_done c4_h0512_done ' +
    'c4_jail_door c4_jail_intro c4_jail_night c4_jail_out c4_jail_tifa c4_jenova_seen c4_keycard62 c4_keycard68 c4_lobby_fight ' +
    'c4_lobby_reunion c4_meeting_done c4_motorball_done c4_president_found c4_president_talk c4_ride_done c4_route_front c4_rufus_arrived ' +
    'c4_rufus_beaten c4_stairs_done c4_tank_empty c4_trail_68 c4_trail_intro c4_vending_bang c5a_arrived c5a_ether_a c5a_ether_clock ' +
    'c5a_ether_far c5a_fb_arrived c5a_fb_bridge c5a_fb_chase c5a_fb_days c5a_fb_door c5a_fb_end c5a_fb_fall c5a_fb_fire c5a_fb_fire_seen ' +
    'c5a_fb_fountain c5a_fb_library1 c5a_fb_library2 c5a_fb_mansion_in c5a_fb_mom c5a_fb_morning c5a_fb_night c5a_fb_path c5a_fb_piano ' +
    'c5a_fb_reactor c5a_fb_tifa c5a_fb_truck c5a_flashback_done c5a_guard_source c5a_mako_asked c5a_megalixir c5a_old_asked ' +
    'c5a_piano_jammed c5a_piano_tune c5a_story_start c5b_airport_arrived c5b_arrived c5b_bill_talked c5b_billy_talked c5b_bottomswell ' +
    'c5b_chocomog c5b_condor_fund c5b_condor_gate c5b_condor_joined c5b_condor_w c5b_dolphin_jump c5b_engine_seen c5b_farm_arrived ' +
    'c5b_jenova_birth c5b_junon_arrived c5b_junon_slept c5b_mine_entered c5b_parade_done c5b_phs_taken c5b_priscilla_saved ' +
    'c5b_sendoff_done c5b_ship_aeris c5b_ship_alarm c5b_ship_boarded c5b_ship_intro c5b_ship_red c5b_ship_tifa c5b_shiva c5b_tifa_talk ' +
    'c5b_turks_mine c5b_whistle c5b_yuffie_tranq c5b_zolom_seen c6a_arrived c6a_ball c6a_barret_left c6a_barret_rejoined c6a_barret_story c6a_bridge_down ' +
    'c6a_coates_talked c6a_costa_left c6a_done c6a_dyne_done c6a_framed c6a_gbike_prize c6a_hojo_talked c6a_jockey_intro ' +
    'c6a_johnny_met c6a_johnny_tifa c6a_junk_seen c6a_miner_talked c6a_mog_cleared c6a_mog_reward c6a_ncorel_arrival c6a_ncorel_ether ' +
    'c6a_nest c6a_oldman_talked c6a_prison_arrival c6a_race_explained c6a_race_intro c6a_race_started c6a_reactor_barret c6a_saw_saucer ' +
    'c6a_turtle_flyer3 c6a_umbrella c6a_villa_owned c6a_waterside_seen c6a_wizard_staff c6b_buggy_repaired c6b_candle_done ' +
    'c6b_candle_intro c6b_candle_start c6b_cosmo_arrived c6b_done c6b_elixir c6b_farewell c6b_gi_asked c6b_gi_intro c6b_gi_nattak ' +
    'c6b_gi_oil_seen c6b_gi_open c6b_gi_rock c6b_gi_secret c6b_gi_web c6b_gongaga_arrived c6b_magic_source c6b_met_bugen c6b_planetarium ' +
    'c6b_reactor_scene c6b_reactor_seen c6b_seto c6b_titan c6b_turks_done c6b_turtle_flyer4 c6b_turtle_flyer5 c6b_village_seen ' +
    'c6b_wasteland_seen c6b_zack_friends c6b_zack_heard c7_bronco_seen c7_cid_met c7_cloud_house c7_clue1 c7_clue2 c7_clue3 c7_clue4 ' +
    'c7_coffin_unlocked c7_dachao_fire_out c7_dachao_seen c7_fountain c7_inn_talk c7_keeper_dead c7_mansion_in c7_mansion_passage ' +
    'c7_nibel_arrived c7_nibel_base c7_nibel_bridge c7_nibel_ladder c7_nibel_ledge_hint c7_nibel_path ' +
    'c7_palmer_done c7_piano_gil c7_piano_tune c7_reactor_seen c7_rocket_arrived c7_safe_open c7_seph_library c7_shera_met c7_tea ' +
    'c7_tifa_room c7_tower_talk c7_turtle_flyer6 c7_turtle_prize c7_turtle_sign c7_vincent_1 c7_vincent_2 c7_wq_bell c7_wq_godo ' +
    'c7_wq_kidnap c7_wq_mpabsorb c7_wq_pot c7_wq_pubturks c7_wq_rapps c7_wq_screen c7_wq_shrine c7_wq_stolen c7_wq_town c7_wq_trap ' +
    'c7_wq_turks c7_wutai_arrived c7_wutai_done c7_yoshiyuki c8_altar_scene c8_ancient_room c8_bone_aeris c8_bone_seen c8_boulders_done ' +
    'c8_boulders_seen c8_bronco_boarded c8_cait_spy c8_capital_arrived c8_capital_slept c8_cave_seen c8_center_seen c8_chase2 ' +
    'c8_clock_seen c8_crystal_seen c8_date_done c8_demons_gate c8_dig_explained c8_disc2_speech c8_forest_awake c8_forest_seen ' +
    'c8_gate_solved c8_gate_started c8_gs_back c8_keystone_bonus c8_keystone_got c8_kjata_seen c8_maze_intro c8_model_seen c8_north_seen ' +
    'c8_pool_vision c8_red_dragon c8_red_dragon_seen c8_room1_battle c8_room3_battle c8_room_elixir c8_ropeway_broken c8_sephiroth_mural ' +
    'c8_shell_seen c8_temple_arrived c8_temple_done c8_trunk_seen c8_tseng c8_valley_out c8_valley_seen c8_woke c8_ws_met c8_ws_paid ' +
    'c9_airship_seen c9_arrived c9_attack_squad c9_barret_free c9_base_seen c9_boarded c9_bolt_seen c9_boulder c9_bridge_seen ' +
    'c9_cannon_seen c9_cave1_seen c9_cave_done c9_center c9_cliff1_seen c9_climb_help c9_clone c9_cold_warned c9_corridor_seen ' +
    'c9_dock_guard c9_elena c9_escaped c9_escort c9_first_takeoff c9_floe_fell c9_floes_seen c9_gas_stopped c9_gas_strapped c9_gast_seen ' +
    'c9_gust_seen c9_hall_seen c9_holzoff_met c9_hotspring c9_hw_meeting c9_icicle_warned c9_icicles_down c9_illusion c9_jenova_death ' +
    'c9_junon_woke c9_key c9_landed c9_mapwall c9_maze_seen c9_press c9_reporter c9_rescued c9_rim_seen c9_rode c9_scarlet c9_schizo ' +
    'c9_slap_done c9_snow_beaten c9_snow_met c9_snowboard_tips c9_snowfield_seen c9_spring_seen c9_tape c9_tapes_talk c9_walk_seen ' +
    'c9_wall_blasted c9_wind_seen cait_joined chocobo_lure cid_joined cloud_missing disc2 has_bronco has_buggy has_highwind has_phs keystone ' +
    'left_midgar meteor redxiii_joined trig_mansion_basement_library trig_mtnibel_pipes_keeper trig_rocket_engine_meet_cid vincent_joined ' +
    'yuffie_joined').split(/\s+/).filter(Boolean);
  R.DISC1_FLAGS = DISC1_FLAGS;

  const ITEMS = { talisman: 1, earring: 1, protect_vest: 1, fury_ring: 1, potion: 12, hi_potion: 25, x_potion: 6, ether: 12, turbo_ether: 4, elixir: 4, megalixir: 2, phoenix_down: 20,
    remedy: 6, antidote: 6, soft: 5, maidens_kiss: 5, echo_screen: 5, eye_drop: 5, hyper: 4, tranquilizer: 4, tent: 4 };
  // the Enemy Skills Disc 1 teaches (Enemy-Skill FAQ: everything but the Northern Cave's, Goblin Punch, Chocobuckle
  // and ????, which C11a's Behemoths teach)
  const DISC1_ESKILLS = ['frog_song', 'l4_suicide', 'magic_hammer', 'white_wind', 'big_guard', 'death_force', 'flame_thrower', 'laser',
    'matra_magic', 'bad_breath', 'beta', 'aqualung', 'trine', 'magic_breath', 'death_sentence'];
  R.DISC1_ESKILLS = DISC1_ESKILLS;
  const m = (id, ap) => ({ id, ap });
  R.starts.c10 = {
    vehicles: { highwind: { x: 233, y: 175 } },
    members: ['barret', 'tifa', 'redxiii', 'yuffie', 'caitsith', 'vincent', 'cid'],
    party: ['cid', 'tifa', 'barret'],
    levels: { cloud: 41, tifa: 40, barret: 40, cid: 40, redxiii: 38, yuffie: 38, caitsith: 37, vincent: 38 },
    // Cloud stays in the character table (he rejoins in the Lifestream) but is not a member while he is missing:
    // a new game has him in the roster, so the profile takes him out when the names are applied
    names: { get cloud() { FF7.sys.party.leave('cloud'); return 'Cloud'; } },
    flags: DISC1_FLAGS,
    vars: { c7_oldman_talks: 3 },
    items: ITEMS, gil: 42000, disc: 2, phs: true,
    equip: {
      // (the Ribbons from the Temple of the Ancients and Gaea's Cliff, the Fairy Ring from the Cave of the Gi,
      // Fort Condor's Peace Ring, Mt. Corel's Star Pendant)
      cloud: { weapon: 'organics', armor: 'diamond_bangle', accessory: 'power_wrist' },
      tifa: { weapon: 'dragon_claw', armor: 'diamond_bangle', accessory: 'ribbon' },
      barret: { weapon: 'microlaser', armor: 'rune_armlet', accessory: 'fairy_ring' },
      cid: { weapon: 'mast_ax', armor: 'diamond_bangle', accessory: 'ribbon' },
      redxiii: { weapon: 'adaman_clip', armor: 'gold_armlet', accessory: 'star_pendant' },
      yuffie: { weapon: 'hawkeye', armor: 'gold_armlet', accessory: 'silver_glasses' },
      caitsith: { weapon: 'red_m_phone', armor: 'gold_armlet', accessory: 'headband' },
      vincent: { weapon: 'lariat', armor: 'silver_armlet', accessory: 'peace_ring' },
    },
    // weapon slots first, then armour slots (linked in pairs); the AP a Disc 1 run leaves on them (Cure3,
    // MBarrier, Haste, Life2, the level-2/3 attack spells, HP Plus Lv3)
    materia: {
      cloud: [m('lightning', 21000), m('all', 7000), m('bahamut', 24000), m('hp_plus', 22000), m('fire', 20000), m('counter_attack', 12000), m('restore', 27000), m('cover', 12000)],
      cid: [m('restore', 26000), m('all', 7000), m('ice', 20000), m('added_effect', 3000), m('steal', 42000), m('hp_plus', 22000), m('revive', 46000), m('time', 9000), m('barrier', 16000)],
      tifa: [m('heal', 13000), m('mp_plus', 12000), m('earth', 7000), m('mega_all', 22000), m('deathblow', 9000), m('enemy_skill', 0), m('shiva', 16000), m('long_range', 20000)],
      barret: [m('lightning', 20000), m('elemental', 11000), m('fire', 19000), m('all', 7000), m('odin', 17000), m('long_range', 20000), m('enemy_skill', 0), m('mp_plus', 12000)],
      redxiii: [m('ice', 20000), m('all', 6500), m('gravity', 11000), m('kujata', 23000), m('sense', 12000), m('enemy_skill', 0), m('restore', 18000), m('seal', 11000)],
      yuffie: [m('steal', 18000), m('throw', 12000), m('poison', 6000), m('mystify', 8000), m('ifrit', 7000)],
      caitsith: [m('manipulate', 9000), m('transform', 9000), m('titan', 16000), m('ramuh', 11000), m('exit', 5000), m('destruct', 7000)],
      vincent: [m('morph', 20000), m('alexander', 26000), m('choco_mog', 15000), m('pre_emptive', 9000), m('hp_absorb', 30000), m('mp_absorb', 30000)],
    },
    stock: [m('neo_bahamut', 8000), m('luck_plus', 16000), m('speed_plus', 16000), m('magic_plus', 11000), 'enemy_away', 'enemy_lure', m('chocobo_lure', 3000),
      'added_cut', m('fire', 3000), m('lightning', 3000), m('earth', 2000)],
  };
  // (the profile's `world` is read last, when every materia is in place: the E.Skill materia learn Disc 1's skills then)
  Object.defineProperty(R.starts.c10, 'world', { enumerable: true, get() {
    const st = FF7.state;
    if (st) st.materia.concat(...Object.values(st.chars).map(c => FF7.sys.materia.equippedList(c)))
      .filter(x => x && x.id === 'enemy_skill' && !(x.eskills && x.eskills.length)).forEach(x => { x.eskills = DISC1_ESKILLS.slice(); });
    // Limit Breaks: levels 1-3 learned (a route that uses its Limits gets them by Disc 2)
    if (st) Object.values(st.chars).forEach(c => { for (const id in FF7.data.limits) { const L = FF7.data.limits[id]; if (L.char === c.id && L.level <= 3 && !c.limitsKnown.includes(id)) c.limitsKnown.push(id); } });
    return { x: 233, y: 175, vehicle: 'highwind' };
  } });

  // A start profile made from a checkpoint's state (the previous chapter's `_end`; C11a and C12a use it):
  // { members, party, levels, flags, vars, items, keyItems, gil, gp, equip, materia (per character: weapon slots
  // then armour slots, { id, ap, eskills }), stock, limits, vehicles, worldPos, map, entry, disc, phs }.
  // What applyStart has no field for (learned Enemy Skills, Limit Breaks, GP, the world position the Highwind's
  // "take off" returns to) is put in place when the profile's `world` is read, the last thing it does.
  R.disc2Profile = function (d) {
    const p = { members: d.members, party: d.party, levels: d.levels, names: d.names, flags: d.flags, vars: d.vars, items: d.items, keyItems: d.keyItems,
      gil: d.gil, equip: d.equip, materia: d.materia, stock: d.stock, vehicles: d.vehicles, disc: d.disc, phs: d.phs, map: d.map, entry: d.entry };
    Object.defineProperty(p, 'world', { enumerable: true, get() {
      const st = FF7.state; if (!st) return d.world;
      for (const id in d.materia) {
        const c = st.chars[id]; if (!c) continue;
        const slots = c.weaponMateria.concat(c.armorMateria);
        d.materia[id].forEach((m, i) => { if (m && m.eskills && slots[i] && slots[i].id === 'enemy_skill') slots[i].eskills = m.eskills.slice(); });
      }
      (d.stock || []).forEach((m, i) => { const x = st.materia[i]; if (m && m.eskills && x && x.id === 'enemy_skill') x.eskills = m.eskills.slice(); });
      for (const id in d.limits || {}) if (st.chars[id]) st.chars[id].limitsKnown = d.limits[id].slice();
      st.gp = d.gp || 0;
      if (d.worldPos) Object.assign(st.world, { x: d.worldPos.x, y: d.worldPos.y, vehicle: null });
      return d.world;
    } });
    return p;
  };

  const takeOff = (o) => ['talk', 'hw_pilot', Object.assign({ choose: 'Take off', done: { map: 'world' } }, o || {})];
  R.c10TakeOff = takeOff;

  R.plans.c10 = [
    ['chapter', 'c10', 'Chapter 10: Mideel and the Huge Materia'],
    ['expect', 'has_highwind', { soft: true }],                      // the handoff from C9 (the Highwind is ours); soft: it holds from C9's end, so it can't mark a resume point

    // ---- the Chocobo Farm on the way (Walkthrough {30}): the second Chocobo Lure, Mimett Greens for Mideel
    ['obj', 'Stop at the Chocobo Farm'],
    ['world', 'chocobo_farm', { done: { any: ['c10_contain', { got: 'side_farm_lure2' }] } }],
    ['item', 'side_farm_lure2'],                                     // Chocobo Lure (in front of the pens, Disc 2)
    ['goto', 'farm_stable', { done: { any: ['c10_contain', { item: 'mimett_greens' }] } }],
    ['shop', 'billy', { choose: 'Buy greens', buy: [['mimett_greens', 1]], done: { any: ['c10_contain', { item: 'mimett_greens' }] } }],

    // ---- Mideel, before the quake
    ['obj', 'Search Mideel for Cloud'],
    ['world', 'mideel', { done: 'c10_mideel_arrived' }],
    ['expectMap', 'mideel_town'],
    ['expect', 'c10_mideel_arrived'],
    ['goto', 'mideel_shop'],
    ['talk', 'crazy', { done: 'c10_crazy_met' }],                   // she'll sell the shops' goods after the quake
    ['talk', 'wchoco', { choose: 'Feed it', done: { any: ['c10_choco_fed', 'c10_contain'] } }],
    ['talk', 'wchoco', { choose: 'Scratch', done: 'c10_contain' }], // Contain Materia
    ['use', 21, 0, { done: { any: ['c10_backdoor', 'c10_old_key', 'c10_curse_ring'] } }],   // the locked back door
    ['goto', 'mideel_west'],
    ['walk', 9, 7, { choose: 'Look', done: { any: ['c10_old_key', 'c10_curse_ring'] } }],   // the squeaky plank: the old key
    ['goto', 'mideel_shop'],
    ['use', 21, 0, { choose: ['Try the key', 'Tell the truth'], done: 'c10_curse_ring' }],   // Curse Ring
    ['goto', 'mideel_house'],
    ['talk', 'snowball', { choose: 'Scratch her chin', done: 'c10_elixir' }],   // Elixir
    ['obj', 'Visit the Mideel clinic'],
    ['party', ['cid', 'barret', 'redxiii'], { select: true }],     // the briefing's party screen (Cid must lead)
    ['goto', 'mideel_town', { done: 'c10_found_cloud' }],
    ['exit', 'mideel_clinic', { done: 'c10_found_cloud' }],         // Tifa finds Cloud; back to the Highwind, the briefing
    ['expect', 'c10_found_cloud'],
    ['expectMap', 'highwind_bridge'],
    ['expect', 'c10_briefing'],
    // Cid, Barret and Red XIII: two healers (Restore + All), Cid steals and opens boss fights with Barrier /
    // MBarrier and Haste, Barret carries the attack magic and the big summons
    ['loadout', 'cid', { weapon: [['restore', 'all'], 'steal', 'hp_plus', 'barrier', 'time'], armor: ['bahamut', 'enemy_skill', 'magic_plus', 'mp_plus'] }],
    ['loadout', 'barret', { weapon: [['lightning', 'all'], ['fire', 'all'], 'enemy_skill', 'counter_attack'], armor: ['neo_bahamut', 'odin', 'luck_plus', 'speed_plus'] }],
    ['loadout', 'redxiii', { weapon: [['restore', 'all'], 'revive', 'ice', 'heal', 'enemy_skill'], armor: ['kujata', 'mp_plus', 'gravity', 'seal'] }],
    ['ckpt', 'c10_briefing'],

    // ---- North Corel: the runaway train
    ['obj', 'Get to the Huge Materia at North Corel'],
    takeOff({ done: 'c10_corel_done' }),
    ['world', 'north_corel', { done: 'c10_corel_done' }],
    ['battle', { steal: ['warrior_bangle'], stealHold: 40 }],         // Eagle Gun's Warrior Bangle (its only source: held until stolen)
    ['walk', 20, 1, { choose: 'Go', done: { any: ['c10_squad_beaten', 'c10_corel_done'] } }],   // up the tracks; the Attack Squad
    ['expectMap', 'corel2_reactor'],
    ['expect', 'c10_squad_beaten'],
    // the old engine: pump the two levers in turn to catch the train, then jump across
    ['use', 3, 9, { choose: ['Go!', 'left', 'right', 'left', 'right', 'left', 'right', 'left', 'right', 'left', 'right'], done: { any: ['c10_corel_boarded', 'c10_corel_done'] } }],
    ['expect', 'c10_corel_boarded'],
    ['expectMap', 'corel2_train'],
    ['minigame', 'train_escape', { win: true }],
    // wagon to wagon: each hop is a jump across the gap and a fight (Gas Ducter, Gas Ducter x2, Wolfmeister,
    // Eagle Gun), then the Attack Squad at the engine and the brakes
    ['heal'],
    ['c10_walkUntil', 6, 3, { any: ['trig_corel2_train_hop1', 'c10_corel_done'] }],
    ['heal'],
    ['c10_walkUntil', 14, 3, { any: ['trig_corel2_train_hop2', 'c10_corel_done'] }],
    ['heal'],
    ['c10_walkUntil', 22, 3, { any: ['trig_corel2_train_hop3', 'c10_corel_done'] }],
    ['heal'],
    ['c10_walkUntil', 30, 3, 'c10_corel_done'],
    ['expect', 'c10_corel_stopped'],
    ['expect', 'huge_materia_corel'],                                // + the Ultima Materia; a night in North Corel
    ['battle', {}],
    ['goto', 'ncorel_house'],
    ['talk', 'c10_greenhat', { done: 'c10_catastrophe' }],           // Catastrophe (Barret's Level 4 Limit)
    ['try', ['useItem', 'catastrophe', 'barret', { done: (s) => s.st.chars.barret.limitsKnown.includes('catastrophe') }]],   // once his other Limits are learned
    ['ckpt', 'c10_corel'],

    // ---- Fort Condor: the last battle
    ['obj', 'Defend the Huge Materia at Fort Condor'],
    ['world', 'fort_condor', { done: 'c10_condor_done' }],
    ['goto', 'condor_hall', { done: 'c10_condor_done' }],
    ['talk', 'c10_elder', { done: 'c10_condor_done' }],
    ['heal'],
    ['ckpt', 'c10_condor_fight'],
    ['c10_condorLetThrough'],                                        // CMD. Grand Horn for the Imperial Guard
    ['talk', 'c10_cmdr', { choose: "I'm ready", done: 'c10_condor_done' }],
    ['expect', 'c10_condor_won'],
    ['expectMap', 'condor_roof'],
    ['item', 'condor2_phoenix'],                                    // Phoenix Materia
    ['goto', 'condor_hall'],
    ['talk', 'c10_elder', { done: 'huge_materia_condor' }],         // the Huge Materia
    ['expect', 'huge_materia_condor'],
    ['ckpt', 'c10_condor'],

    // ---- back to Mideel: the shops, a night at the inn, then Tifa, Ultimate WEAPON and the Lifestream
    ['obj', 'Check on Cloud and Tifa in Mideel'],
    ['world', 'mideel', { done: 'c10_mideel_quake' }],
    ['goto', 'mideel_shop', { done: 'c10_mideel_quake' }],
    // the Crystal weapons and armour (defence weighed over magic defence: the fights ahead are physical)
    ['gear', { shop: [15, 2], slots: ['weapon', 'armor'], weights: { mdef: 0.6 }, keepGil: 6000, done: 'c10_mideel_quake' }],
    ['c10_shopAt', 3, 2, { buy: [['hi_potion', 10], ['phoenix_down', 5], ['remedy', 4]], lenient: true, done: 'c10_mideel_quake' }],
    // one of each accessory here the party never had (FF7's 100% owns them all: the accessory shop closes for good with
    // the quake), a second HP Plus (the WEAPON setups ahead), then the weapons the gil still allows (the rest later from
    // the eccentric woman in the ruins, who sells the weapon and materia counters' goods after the quake: C12b)
    ['collect', { kinds: 'gear', want: { hp_plus: 2 }, keepGil: 8000, shops: [['mideel_west', 'akeep', 'mideel_accessories'],
      ['mideel_shop', [9, 2], 'mideel_materia'], ['mideel_shop', [15, 2], 'mideel_weapons']], done: 'c10_mideel_quake' }],
    ['goto', 'mideel_inn', { done: 'c10_mideel_quake' }],
    ['use', 10, 3, { choose: 'Stay', done: 'c10_mideel_quake' }],   // 100 Gil: full HP / MP for Ultimate WEAPON
    ['battle', { steal: ['curse_ring'] }],                           // the second Curse Ring, from Ultimate WEAPON
    ['goto', 'mideel_clinic', { done: 'c10_mideel_quake' }],
    ['ckpt', 'c10_ultimate'],
    ['talk', 'tifa_nurse', { done: 'c10_mideel_quake' }],           // the quake, Ultimate WEAPON, the Lifestream
    ['expect', 'c10_mideel_quake'],
    ['battle', {}],

    // ---- the Lifestream: Tifa leads Cloud through his memories
    ['obj', "Find the pieces of Cloud's memory"],
    ['expectMap', 'lifestream_void'],
    ['walk', 10, 1, { done: 'c10_ls_hub' }],                         // the voices; Tifa sinks deeper
    ['expectMap', 'lifestream_hub'],
    ['exit', [14, 16], { done: 'c10_ls_station' }],                 // south: Sector 7 station
    ['expect', 'c10_ls_station'],
    ['exit', [14, 0], { done: 'c10_ls_nibel' }],                    // north: Nibelheim, five years ago
    ['expect', 'c10_ls_nibel'],
    ['exit', [2, 8], { done: 'c10_ls_tower' }],                     // west: the water tower
    ['expect', 'c10_ls_tower'],
    ['exit', [28, 8], { done: 'c10_ls_room' }],                     // east: Tifa's house
    ['expect', 'c10_ls_room'],
    ['party', ['cloud', 'tifa', 'cid'], { select: true }],        // the party screen after Cloud's talk
    ['exit', [14, 0], { done: 'cloud_returned' }],                  // north: the reactor; back to Mideel, the Highwind
    ['expect', 'cloud_returned'],
    ['expectMap', 'highwind_bridge'],
    ['expect', 'c10_cloud_speech'],
    // Cloud, Tifa and Cid: Cloud and Cid heal (Restore + All) and cast Bolt3 on all (Carry Armor is weak to
    // lightning), Cloud opens boss fights with Barrier / MBarrier and Haste, Tifa's punches carry Lightning
    // (Elemental), Cid steals and summons (simulated from this point: 10 wins in 10 against Carry Armor)
    ['loadout', 'cloud', { weapon: [['lightning', 'all'], ['restore', 'all'], 'hp_plus', 'revive'], armor: ['barrier', 'mp_plus', 'time', 'counter_attack', 'cover'] }],
    ['loadout', 'tifa', { weapon: [['elemental', 'lightning'], 'heal', 'hp_plus', 'enemy_skill', 'mega_all'], armor: ['neo_bahamut', 'mp_plus', 'long_range', 'deathblow', 'earth'] }],
    ['loadout', 'cid', { weapon: [['restore', 'all'], ['lightning', 'all'], 'bahamut', 'steal'], armor: ['phoenix', 'magic_plus', 'odin', 'gravity', 'ultima', 'enemy_skill'] }],
    ['ckpt', 'c10_cloud'],

    // ---- Junon: the Underwater Reactor
    ['obj', 'Stop Shinra at the Underwater Reactor below Junon'],
    takeOff({ done: 'c10_uw_done' }),
    ['world', 'junon', { choose: 'Keep our distance', done: 'c10_uw_done' }],   // (Ultimate WEAPON circles near Junon: C12b)
    // upper Junon's shops on the way (on Disc 2 they sell every character's weapons; the materia counter Seal and
    // Revive): one of each kind the party never had
    // (a second Restore: the only one was Cid's, and Cloud's Cure-All was missing - a full run lost to Carry Armor's Lapis
    // Laser with Cid the one healer; Cloud's setup again after it)
    ['collect', { kinds: [], want: { restore: 2 }, keepGil: 500, shops: [['junon_street1', [7, 3], 'junon_upper_materia']], done: 'c10_uw_done' }],   // (Restore first: 750 gil)
    ['collect', { kinds: ['materia', 'gear'], want: { revive: 2, restore: 2 }, keepGil: 5000, shops: [['junon_street1', [7, 3], 'junon_upper_materia'],
      ['junon_street1', [19, 2], 'junon_upper_weapons_d2'], ['junon_street1', [13, 3], 'junon_upper_items_d2'], ['junon_street2', [28, 3], 'junon_upper_weapons2_d2'],
      ['junon_inn', [8, 6], 'junon_upper_materia2_d2'], ['junon_inn', [10, 2], 'junon_upper_accessories_d2']], done: 'c10_uw_done' }],
    ['loadout', 'cloud', { weapon: [['lightning', 'all'], ['restore', 'all'], 'hp_plus', 'revive'], armor: ['barrier', 'mp_plus', 'time', 'counter_attack', 'cover'] }, { done: 'c10_uw_done' }],
    ['goto', 'junon_street1', { done: 'c10_uw_done' }],             // the lower town's elevator (10 Gil)
    ['use', 35, 3, { choose: 'Go through', done: 'c10_uw_done' }],  // the grey service door
    ['expectMap', 'uwreactor_gate'],
    ['walk', 20, 3, { choose: 'Go down', done: { any: ['c10_lift_fight', 'c10_uw_done'] } }],   // the lift; Submarine Crew
    ['expectMap', 'uwreactor_path'],
    ['expect', 'c10_lift_fight'],                                   // (down in the reactor: a game saved inside resumes here)
    // the undersea pipe: a Ghost Ship (22/72 of its fights) Morphed into the Guide Book (missable: the pipe's
    // battles end with this chapter; the Kalm Traveller trades it for the Underwater materia, C12a). The member with
    // the least HP Morphs (the Ghost Ship's Goannai throws out whoever has the most HP: the Morph user must not be
    // the one); the engine's morph tactics hold the others' finishing blows (the queued damage counted) and take
    // the counter materia off them meanwhile (back on with the next tactics)
    ['goto', 'uwreactor_pipe', { done: { any: [{ item: 'guide_book' }, 'c10_carry_beaten'] } }],
    ['c10_morph', ['cid', 'tifa', 'cloud'], { done: { any: [{ item: 'guide_book' }, 'c10_carry_beaten'] } }],
    ['battle', { morph: ['ghost_ship'] }],
    // (the Guide Book is missable: FF7's Ghost Ships are met only here - fought in up to three rounds, patched up in
    // between, Elixirs for the casters' MP: a full run stopped "out of healing" after 3 fights and later lost Emerald
    // WEAPON without the Underwater materia the book buys)
    ['fightUntil', { item: 'guide_book' }, { max: 20, mp: 0.4, elixir: true, done: { any: [{ item: 'guide_book' }, 'c10_carry_beaten'] }, budget: 500000 }],
    ['heal', { below: 0.8, mp: 0.5, elixir: true, done: { any: [{ item: 'guide_book' }, 'c10_carry_beaten'] } }],
    ['fightUntil', { item: 'guide_book' }, { max: 20, mp: 0.4, elixir: true, done: { any: [{ item: 'guide_book' }, 'c10_carry_beaten'] }, budget: 500000 }],
    ['heal', { below: 0.8, mp: 0.5, elixir: true, done: { any: [{ item: 'guide_book' }, 'c10_carry_beaten'] } }],
    ['fightUntil', { item: 'guide_book' }, { max: 20, mp: 0.4, elixir: true, done: { any: [{ item: 'guide_book' }, 'c10_carry_beaten'] }, budget: 500000 }],
    ['c10_counterBack', ['cloud', 'tifa', 'cid'], { done: 'c10_carry_beaten' }],
    ['battle', { steal: ['shinra_alpha'], stealHold: 30 }],          // the Underwater MPs' Shinra Alpha (held until stolen)
    ['goto', 'uwreactor_walkway', { done: 'c10_carry_beaten' }],
    ['save', { done: 'c10_carry_beaten' }],
    ['useItem', 'tent', null, { done: 'c10_carry_beaten' }],        // a Tent at the save point: full HP / MP
    ['goto', 'uwreactor_dock', { done: 'c10_carry_beaten' }],      // the guards in the core, the Underwater MPs
    ['chest', 'uwreactor_dock_trumpet'],                            // Battle Trumpet
    ['heal', { below: 0.95, mp: 0.5, elixir: true, done: 'c10_carry_beaten' }],   // (full for Carry Armor: its opening Lapis Laser)
    ['ckpt', 'c10_carry'],
    // (the arms first: they hold whoever they grab; everyone kept above 70%: Lapis Laser hits the free ones for ~1,400,
    // and a member lost to it with both others held was a defeat - 1 seed in 8)
    ['battle', { last: ['carry_armor'], healAt: 0.7 }],
    ['walk', 7, 3, { done: 'c10_carry_beaten' }],                   // Reno; Carry Armor (God's Hand)
    ['expect', 'c10_carry_beaten'],
    ['battle', { steal: ['shinra_alpha'] }],
    ['heal'],
    ['chest', 'uwreactor_dock_scimitar'],                           // Scimitar (missable)
    ['chest', 'uwreactor_dock_scales'],                             // Leviathan Scales (missable)
    ['autoequip', { slots: ['weapon', 'armor'] }],                   // God's Hand for Tifa (four slots: her setup again)
    ['loadout', 'tifa', { weapon: [['elemental', 'lightning'], 'hp_plus', 'heal'], armor: ['neo_bahamut', 'mp_plus', 'enemy_skill', 'mega_all', 'deathblow'] }],
    ['goto', 'sub_hall', { done: 'c10_bridge_taken' }],             // the crew at the grey sub; the marines inside
    ['minigame', 'submarine', { mustWin: true }],
    ['exit', 'sub_bridge', { choose: 'hostage', done: 'c10_uw_done' }],   // the crew taken hostage; the chase
    ['expect', 'huge_materia_underwater'],
    ['expect', 'has_submarine'],
    ['battle', {}],
    ['ckpt', 'c10_submarine'],

    // ---- Rocket Town: the launch
    ['obj', 'Get to Rocket Town before the rocket launches'],
    ['c10_boardAirship', { done: 'c10_rocket_hint' }],              // the submarine to the coast, back aboard the Highwind
    ['interior', { done: 'c10_rocket_hint' }],                       // Cait Sith: the last Huge Materia is in the rocket
    ['expect', 'c10_rocket_hint'],
    takeOff({ done: 'c10_launched' }),
    ['world', 'rocket_town', { choose: 'Keep our distance', done: 'c10_launched' }],
    // (the submarine's fights leave the party hurt and the bag short: Tents and Hi-Potions at the item shop, then
    // patched up at the save point before Rude)
    ['goto', 'rocket_items', { done: (s) => s.flag('c10_launched') || FF7.sys.inv.count('tent') >= 3 }],
    ['shop', 'shopkeeper', { choose: 'Items', buy: [['tent', 4], ['hi_potion', 10]], lenient: true, done: (s) => s.flag('c10_launched') || FF7.sys.inv.count('tent') >= 3 }],
    ['goto', 'rocket_town', { done: 'c10_launched' }],
    ['save', { done: 'c10_launched' }],
    ['heal', { below: 0.9, mp: 0.5, done: 'c10_launched' }],
    ['goto', 'rocket_cid_house', { done: { any: ['c10_shera_warn', 'c10_launched'] } }],   // Shera's warning about tank No. 8
    ['goto', 'rocket_pad', { done: 'c10_launched' }],               // (Cid joins at the top of the road if he's out)
    ['battle', { steal: ['ziedrich'] }],                             // Rude's Ziedrich
    // up the gantry's stairs (the Attack Squads at the foot of the pad and on the stairs), Rude on the walkway
    ['walk', 22, 10, { done: { any: ['c10_rude_beaten', 'c10_launched'] } }],
    ['walk', 22, 8, { done: { any: ['c10_rude_beaten', 'c10_launched'] } }],
    ['walk', 21, 6, { done: { any: ['c10_rude_beaten', 'c10_launched'] } }],
    ['c10_walkUntil', 17, 5, { any: ['c10_rude_beaten', 'c10_launched'] }],
    ['battle', {}],
    ['heal', { done: 'c10_launched' }],
    ['exit', 'rocket_engine', { done: 'c10_launched' }],            // the Senior Grunt, Palmer, the launch
    ['expect', 'c10_launched'],
    ['expectMap', 'rocket2_cockpit'],
    ['exit', 'rocket2_hold', { done: 'huge_materia_rocket' }],
    ['use', 8, 3, { choose: ['Circle', 'Square', 'Cross', 'Cross'], done: 'huge_materia_rocket' }],   // Cid's code
    ['expect', 'huge_materia_rocket'],
    ['goto', 'rocket2_interior', { done: 'huge_materia_done' }],
    ['exit', [5, 9], { done: 'huge_materia_done' }],                // tank No. 8, the escape pod; the Highwind (C11a's opening)
    ['expect', 'huge_materia_done'],
    ['expectMap', 'highwind_bridge'],
    ['ckpt', 'c10_end'],
  ];

  // ['c10_walkUntil', x, y, cond]: walk toward a tile and stop as soon as cond holds (a step trigger on the way
  // fired: the train's hops jump the party across the gap, so the tile itself is never reached)
  R.ops.c10_walkUntil = function* (x, y, cond) {
    if (R.cond(cond)) return true;
    const g = R.walkField([[x, y]], { near: 0.12 });
    for (;;) {
      if (R.cond(cond)) { R.holds = {}; yield* R.settle(3); return true; }
      const r = g.next();
      if (r.done) { yield* R.settle(3); return R.cond(cond) ? true : r.value === true || r.value === 'mapchanged' ? 'at ' + x + ',' + y + ' but ' + R.stepText([cond]) + ' does not hold' : r.value; }
      yield;
    }
  };

  // ['c10_shopAt', x, y, { buy, sell, choose, lenient }]: the shop op at a shop counter's tile (a talk-trigger
  // with its own script: the counter NPC has none of its own to talk to)
  R.ops.c10_shopAt = function* (x, y, spec = {}) {
    const listOf = (l) => (l || []).map(e => Array.isArray(e) ? { id: e[0], qty: e[1] == null ? 1 : e[1] } : { id: e, qty: 1 });
    R.shopTask = { buy: listOf(spec.buy), sell: listOf(spec.sell), closed: false };
    const r = yield* R.ops.use(x, y, spec);
    const t = R.shopTask; R.shopTask = null;
    if (r !== true) return r;
    const failed = t.buy.concat(t.sell).filter(e => e.failed || !e.done);
    return failed.length && !spec.lenient ? 'shop: could not ' + failed.map(e => e.id).join(', ') : true;
  };

  // ['c10_accessory', charId, itemId]: that accessory on that character, from the bag or taken off whoever else
  // wears it outside the active party (the Equip screen)
  R.ops.c10_accessory = function* (ch, id) {
    const st = FF7.state, c = st.chars[ch];
    if (!c || !st.members.includes(ch)) return true;
    if (c.accessory === id) return true;
    if (!FF7.sys.inv.has(id)) {
      const from = st.members.map(m => st.chars[m]).find(x => x && x !== c && x.accessory === id && !st.party.includes(x.id)) ||
        st.members.map(m => st.chars[m]).find(x => x && x !== c && x.accessory === id);
      if (!from) { R.note('accessory: no ' + id + ' for ' + ch); return true; }
      const r = yield* R.ops.equip(from.id, 'accessory', null); if (r !== true) return r;
    }
    return yield* R.ops.equip(ch, 'accessory', id);
  };

  // ['c10_boardAirship']: back aboard the parked Highwind from the world map. On foot it walks there; in a
  // boat (the submarine) it sails to a shore from which the Highwind can be reached on foot, gets off and boards.
  R.ops.c10_boardAirship = function* () {
    if (R.where() !== 'world') { const g = yield* R.gotoMap('world'); if (g !== true && g !== 'mapchanged') return g; yield* R.settle(3); }
    for (let tries = 0; tries < 3; tries++) {
      const ws = R.worldScene(); if (!ws) { yield; continue; }
      if (ws.vehicle === 'highwind') return true;
      const hw = FF7.state.world.vehicles.highwind; if (!hw) return 'c10_boardAirship: the Highwind is not parked anywhere';
      if (!ws.vehicle) return yield* R.boardVehicle('highwind');
      if (ws.vehicle === 'submarine' && ws.dived) { yield* R.pressWorld('square'); continue; }
      // the land the Highwind stands on (on foot), and the water tiles along its shore this boat can reach
      const D = R.worldD(), W = D.w, H = D.h, key = (x, y) => (((x % W) + W) % W) + ',' + (((y % H) + H) % H);
      const land = new Set(), q = R.boardSpots(ws, 'highwind', hw).slice();
      q.forEach(p => land.add(key(p[0], p[1])));
      for (let n = 0; q.length && n < 40000; n++) {
        const [x, y] = q.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = key(x + dx, y + dy); if (!land.has(k) && R.worldCan(ws, null, x + dx, y + dy) && !R.entries()[k]) { land.add(k); q.push([x + dx, y + dy]); } }
      }
      const goals = [];
      land.forEach(k => { const [x, y] = k.split(',').map(Number); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const wx = x + dx, wy = y + dy; if (R.worldCan(ws, ws.vehicle, wx, wy) && !land.has(key(wx, wy))) goals.push([wx, wy]); } });
      if (!goals.length) return "c10_boardAirship: no shore of the Highwind's land for the " + ws.vehicle;
      const r = yield* R.walkWorld(goals, { maxNodes: 400000 });
      if (r !== true) return 'c10_boardAirship: ' + r;
      yield* R.pressWorld('ok');                                     // get off onto the shore
    }
    const w2 = R.worldScene();
    return w2 && w2.vehicle === 'highwind' ? true : 'c10_boardAirship: could not get aboard';
  };

  // ['c10_morph', [who...]]: the Morph materia on the one of them with the least max HP that can take it (the Ghost
  // Ship's Goannai removes whoever has the most): a free slot, else over the least useful materia they carry for
  // the fight ahead (Materia screen; from the list, or by Exchange from a reserve member). The counter materia
  // come off the others with the ['battle', { morph }] step (the engine; c10_counterBack is a leftover check).
  const SPARE = ['earth', 'deathblow', 'odin', 'long_range', 'mega_all', 'gravity', 'poison', 'seal', 'mystify', 'transform',
    'choco_mog', 'titan', 'ramuh', 'ifrit', 'shiva', 'fire', 'ice', 'counter_attack', 'cover'];
  R.ops.c10_morph = function* (who) {
    const st = FF7.state, M = FF7.sys.materia;
    const on = () => st.party.filter(Boolean).some(id => M.equippedList(st.chars[id]).some(m => m && m.id === 'morph'));
    const holder = st.members.map(id => st.chars[id]).find(c => c && !st.party.includes(c.id) && M.equippedList(c).some(m => m && m.id === 'morph'));
    if (!on() && !holder && !st.materia.some(m => m && m.id === 'morph')) { R.note('morph: no Morph materia'); return true; }
    for (const id of on() ? [] : [].concat(who).filter(id => st.party.includes(id)).sort((a, b) => st.chars[a].maxHp - st.chars[b].maxHp)) {
      const c = st.chars[id];
      let where = null;
      for (const k of ['armorMateria', 'weaponMateria']) { const i = c[k].findIndex(m => !m); if (i >= 0) { where = { slot: k === 'armorMateria' ? 'armor' : 'weapon', index: i }; break; } }
      if (!where) for (const sp of SPARE) {
        for (const k of ['armorMateria', 'weaponMateria']) { const i = c[k].findIndex(m => m && m.id === sp); if (i >= 0) { where = { slot: k === 'armorMateria' ? 'armor' : 'weapon', index: i }; break; } }
        if (where) break;
      }
      if (!where) continue;
      const r = holder ? yield* R.ops.moveMateria(holder.id, c.id, 'morph', where) : yield* R.ops.materia(c.id, 'morph', where);
      if (r !== true) return 'morph: ' + r;
      if (R.menus) yield* R.menus.finish();
      if (on()) { R.say('morph: on ' + c.id); break; }
    }
    if (!on()) return 'morph: no room for Morph on ' + [].concat(who).join(', ');
    return true;
  };
  // ['c10_counterBack', who]: Counter Attack back on (the first of them with a free slot), when it's in the list
  R.ops.c10_counterBack = function* (who) {
    const st = FF7.state, M = FF7.sys.materia;
    if (!st.materia.some(m => m && m.id === 'counter_attack')) return true;
    if (st.party.filter(Boolean).some(id => M.equippedList(st.chars[id]).some(m => m && m.id === 'counter_attack'))) return true;
    for (const id of [].concat(who).filter(id => st.party.includes(id))) {
      const c = st.chars[id];
      for (const k of ['armorMateria', 'weaponMateria']) {
        const i = c[k].findIndex(m => !m);
        if (i >= 0) { const r = yield* R.ops.materia(id, 'counter_attack', { slot: k === 'armorMateria' ? 'armor' : 'weapon', index: i }); if (R.menus) yield* R.menus.finish(); return r === true ? true : 'counterBack: ' + r; }
      }
    }
    return true;
  };

  // Fort Condor, the Walkthrough's way: place no troops and let the army reach the shack, then beat CMD. Grand
  // Horn (he drops the Imperial Guard). The minigame is played by hand here: straight to the battle, full speed.
  R.ops.c10_condorLetThrough = function* () {
    const MG = FF7.minigames, def = MG.defs && MG.defs.fort_condor;
    if (!def || def._c10) return true;
    const create = def.create;
    def._c10 = true;
    def.create = function (opts, scene) {
      const g = create.call(this, opts, scene);
      if (opts && opts.final) {
        const bot = g.bot;
        g.bot = function () {
          if (this.phase === 'setup') return this.t % 8 === 0 ? ['square'] : [];
          if (this.phase === 'battle') return this.speed < 3 && this.t % 8 === 0 ? ['r1'] : [];
          return bot.call(this);
        };
        def.create = create; def._c10 = false;
      }
      return g;
    };
    return true;
  };
})();
