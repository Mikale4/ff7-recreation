// Runner plan, Chapter 6b (docs/RUNNER.md): Gongaga and Cosmo Canyon.
// From the buggy south of the Corel Desert (C6a's handoff) to Gongaga: the Turks in the jungle (Reno and
// Rude), the ruined reactor (Scarlet and Tseng, the Titan materia), the village (inn, shops, Zack's
// parents), then west to Cosmo Canyon: Bugenhagen and the planetarium, the Cosmo Candle, the Cave of the Gi
// (the secret rock, the golden ooze, the Stinger, Gi Nattak) and Seto. Ends at the canyon gate after
// Nanaki's farewell (c6b_done); C7 walks north to Nibelheim from there.
//
// Items (the guides' checklist, all taken): Fairy Tale + X-Potion (Reno / Rude drops), Titan, Deathblow,
// X-Potion (inn), White M-phone (house), Elixir (inn 2F, behind the bed), Turtle's Paradise flyers No.4 and
// No.5, Added Effect (the ledge), Black M-phone, Ether, X-Potion (behind the Stinger), Fairy Ring, Turbo
// Ether, Wizer Staff (Gi Nattak's drop), Gravity, Seraph Comb (Bugenhagen). E.Skills tried here: Frog Song
// (Touch Me, the Gongaga jungle) and Death Sentence (Gi Spector / Sneaky Step, the Cave of the Gi).
// Shared helper ops used by C7-C9 are defined here (plan files load in route order).
(function () {
  const R = FF7.runner;
  const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // ---------------------------------------------------------------- shared helpers (C6b-C9)
  // ['c6b_learn', [eskillIds], { battles, turns, holder, learnEach, quiet, terrain, also }]: fight the random battles here (pacing
  // two tiles apart, like ['level']) until the master E.Skill materia knows those skills (put on `holder` or the
  // party first), or after `battles` fights. The enemies are left alone while they still know one of them
  // ({ learn }; `learnEach` passed on), so they cast it on the party.
  R.ops.c6b_learn = function* (want, o = {}) {
    want = [].concat(want);
    // (FF7's 100%: the master Enemy Skill materia - the copy that knows the most - learns them all; it goes onto
    // the party first, R.mat.ensureMaster)
    const known = () => R.masterKnows(want) && (o.also == null || R.cond(o.also));   // (o.also: and that condition, e.g. a steal)
    if (known()) return true;
    const st = FF7.state;
    yield* R.mat.ensureMaster(o.holder);
    if (!st.party.filter(Boolean).some(id => FF7.sys.materia.equippedList(st.chars[id]).some(m => m.id === 'enemy_skill'))) { R.note('c6b_learn: nobody in the party carries Enemy Skill'); return true; }
    const prev = R.battleOpts;
    R.battleOpts = Object.assign({}, prev, { learn: want, learnTurns: o.turns || 70, flee: false }, o.learnEach != null ? { learnEach: o.learnEach } : {});
    const max = o.battles || 8;
    const start = R.stats.battles;
    let b0 = R.stats.battles, n = 0, lastB = R.frames, side = 0;
    while (!known() && n < max) {
      if (R.frames - lastB > 20000) { R.note('c6b_learn: no battles here (' + R.where() + ')'); break; }
      if (R.stats.battles !== b0) { b0 = R.stats.battles; n++; lastB = R.frames; yield* R.ops.c6b_mend({ below: 0.6 }); continue; }
      const fs = R.field(), ws = R.worldScene();
      if (fs) {
        const p = fs.player, pairs = DIRS4.map(([dx, dy]) => [p.tx + dx * 2, p.ty + dy * 2]).filter(([x, y]) => fs.P.walkable(x, y) && !R.exitAt(fs, x, y) && !(fs.map.triggers || []).some(t => t.on !== 'talk' && fs.inRect(t.at, x, y)));
        if (!pairs.length) { R.note('c6b_learn: no room to pace'); break; }
        const r = yield* R.walkField([pairs[side++ % pairs.length]], { anywhere: true });
        if (r !== true && r !== 'mapchanged') { R.note('c6b_learn: ' + r); break; }
      } else if (ws) {
        const x = Math.floor(ws.px), y = Math.floor(ws.pz), E = R.entries(), D = R.worldD();
        // (o.terrain: only tiles of those world terrain codes, e.g. 's' for a beach table's fights)
        const ter = (a, b) => { const W = FF7.data.world, row = W.rows[((b % W.h) + W.h) % W.h]; return row ? row[((a % W.w) + W.w) % W.w] : ''; };
        const pairs = DIRS4.map(([dx, dy]) => [x + dx * 2, y + dy * 2]).filter(([a, b]) => R.worldCan(ws, ws.vehicle, a, b) && !E[((a % D.w) + D.w) % D.w + ',' + ((b % D.h) + D.h) % D.h] && (!o.terrain || o.terrain.includes(ter(a, b))));
        if (!pairs.length) break;
        const r = yield* R.walkWorld([pairs[side++ % pairs.length]], { anywhere: true });
        if (r !== true) { R.note('c6b_learn: ' + r); break; }
      } else yield;
    }
    R.battleOpts = prev;
    if (!o.quiet || known()) R.note('E.Skill ' + want.map(e => e + (R.masterKnows(e) ? ' learned' : ' not learned')).join(', ') + ' (' + (R.stats.battles - start) + ' battle(s) on ' + R.where() + ')');
    return true;
  };
  // ---- field healing: the party's Cure spells, cast from the Magic screen like a player (Menu > Magic, the
  // caster, the spell, the target or everyone with All), then Potions for what magic can't cover.
  // ['c6b_mend', { below, ethers }]: everyone in the active party back above `below` (0.75) of their HP
  // (Cures first; when the MP runs out, up to `ethers` (2) Ethers for the best healer; then Potions).
  const healSpells = (c) => FF7.sys.materia.abilities(c).spells
    .map(s => Object.assign({ def: FF7.data.spells[s.id] }, s)).filter(s => s.def && s.def.kind === 'heal');
  const healAmt = (c, d, n) => { const h = 6 * (c.d.mag + c.level) + 22 * (d.power || 0); return n > 1 ? Math.floor(h * 2 / 3) : h; };
  // the Magic screen for character ch (the menu's own command list: the Magic screen has no op of its own)
  function* openMagic(ch) {
    const MN = R.menus, CMDS = 11;
    let r = yield* MN.open(); if (r !== true) return r;
    r = yield* MN.root(); if (r !== true) return r;
    const m = MN.main();
    if (!(yield* MN.seek(() => MN.main() && !MN.main().panels.length ? MN.main().cursor : null, 1, CMDS, 'up', 'down', true))) return 'the cursor did not reach Magic';
    yield* MN.wait(MN.p('confirm'));
    yield* MN.tap('ok', MN.p('step'));
    if (m.charSel) {
      const party = m.party(), idx = party.findIndex(c => c.id === ch);
      if (idx < 0) { yield* MN.tap('cancel'); return ch + ' is not in the active party'; }
      if (!(yield* MN.seek(() => m.charSel ? m.charSel.idx : null, idx, party.length, 'up', 'down', true))) return 'the character cursor got lost';
      yield* MN.wait(MN.p('confirm'));
      yield* MN.tap('ok', MN.p('open'));
    }
    return MN.panel() instanceof FF7.ui.MagicPanel ? true : 'the Magic screen did not open';
  }
  // one cast: spell (from healSpells) by caster on target (a character) or on everyone (all)
  function* castHeal(caster, spell, target, all) {
    const MN = R.menus, mp0 = caster.mp;
    const r = yield* openMagic(caster.id); if (r !== true) return r;
    const p = MN.panel();
    for (let g = 0; g < 3 && p.tab !== 0; g++) yield* MN.tap('r1', MN.p('step'));
    const L = p.lists()[0], si = L.findIndex(x => x.id === spell.id);
    if (si < 0) return spell.id + ' is not in the list';
    if (!(yield* MN.seek(() => MN.panel() === p && p.mode === 'list' ? p.idx : null, si, L.length, 'left', 'right', true))) return 'the spell cursor got lost';
    yield* MN.wait(MN.p('confirm'));
    yield* MN.tap('ok', MN.p('step'));
    if (p.mode !== 'target') return spell.id + ' could not be cast';
    if (all && p.allToggle && !p.useAll) yield* MN.tap('r1', MN.p('step'));
    if (!all) {
      if (p.useAll && p.allToggle) yield* MN.tap('r1', MN.p('step'));
      const party = MN.main().party(), ti = party.indexOf(target);
      if (ti < 0) return 'no target';
      if (!(yield* MN.seek(() => MN.panel() === p && p.mode === 'target' ? p.tIdx : null, ti, party.length, 'up', 'down', true))) return 'the target cursor got lost';
    }
    yield* MN.wait(MN.p('confirm'));
    yield* MN.tap('ok', MN.p('look'));
    yield* MN.tap('cancel', MN.p('step'));                        // back to the spell list
    return caster.mp < mp0 ? true : 'the spell did nothing';
  }
  R.ops.c6b_mend = function* (o = {}) {
    const below = o.below || 0.75;
    const act = () => FF7.sys.party.active();
    const hurt = () => act().filter(c => c.hp > 0 && c.hp < c.maxHp * below);
    let casts = 0, ethers = 0;
    for (let round = 0; round < 16 && hurt().length; round++) {
      const H = hurt(), low = H.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      // the best cast: All (linked All or an all-target spell) when two or more are hurt, else the
      // spell that covers the most hurt member's gap for the least MP
      let pick = null;
      for (const c of act()) {
        if (c.hp <= 0) continue;
        for (const s of healSpells(c)) {
          if (c.mp < s.def.mp) continue;
          const all = s.def.target === 'allAllies' || (s.supports || []).some(x => x.id === 'all');
          const useAll = all && (H.length >= 2 || s.def.target === 'allAllies');
          const gap = low.maxHp - low.hp, amt = healAmt(c, s.def, useAll ? act().length : 1);
          const score = (useAll ? H.length : 1) * Math.min(gap, amt) - s.def.mp * 3;
          if (!pick || score > pick.score) pick = { c, s, useAll, score };
        }
      }
      if (!pick) {                                                 // no MP left for it: an Ether for the best healer
        const healer = act().filter(c => c.hp > 0 && healSpells(c).length).sort((a, b) => b.d.mag - a.d.mag)[0];
        if (!healer || ethers >= (o.ethers == null ? 2 : o.ethers) || !FF7.sys.inv.has('ether')) break;
        const e = yield* R.ops.useItem('ether', healer.id, { keep: true });
        if (e !== true) { R.note('c6b_mend: ' + e); break; }
        ethers++;
        continue;
      }
      const r = yield* castHeal(pick.c, pick.s, low, pick.useAll);
      if (r !== true) { R.note('c6b_mend: ' + r); break; }
      casts++;
    }
    if (R.menus) yield* R.menus.finish();
    if (casts) R.say('mend: ' + casts + ' Cure spell(s) cast from the Magic screen' + (ethers ? ', ' + ethers + ' Ether(s)' : ''));
    if (hurt().length) yield* R.ops.heal({ below });                // what magic couldn't cover: Potions
    return true;
  };
  // ['c6b_level', n, { all, below }]: ['level'] with the field healing above between battles (Cure first,
  // Potions after) instead of Potions only
  R.ops.c6b_level = function* (n, o = {}) {
    if (R.avgLevel(o.all) >= n) return true;
    let b0 = R.stats.battles, lastB = R.frames, side = 0;
    while (R.avgLevel(o.all) < n) {
      if (R.frames - lastB > 20000) return 'c6b_level: no battles here (' + R.where() + ')';
      if (R.stats.battles !== b0) {
        b0 = R.stats.battles; lastB = R.frames;
        yield* R.ops.c6b_mend({ below: o.below || 0.6 });
        // out of Cures, Ethers and Potions: stop here rather than risk the party
        if (FF7.sys.party.active().some(c => c.hp < c.maxHp * 0.45)) { R.note('c6b_level: out of healing at ' + FF7.sys.party.active().map(c => c.name + ' ' + c.level).join(', ')); return true; }
        continue;
      }
      const fs = R.field(), ws = R.worldScene();
      if (fs) {
        const p = fs.player, free = ([x, y]) => fs.P.walkable(x, y) && !R.exitAt(fs, x, y) && !(fs.map.triggers || []).some(t => t.on !== 'talk' && fs.inRect(t.at, x, y));
        let pairs = DIRS4.map(([dx, dy]) => [p.tx + dx * 2, p.ty + dy * 2]).filter(free);
        if (!pairs.length) pairs = DIRS4.map(([dx, dy]) => [p.tx + dx, p.ty + dy]).filter(free);   // (a narrow spot: one tile at a time)
        if (!pairs.length) return 'c6b_level: no room to pace here';
        const r = yield* R.walkField([pairs[side++ % pairs.length]], { anywhere: true });
        if (r !== true && r !== 'mapchanged') return 'c6b_level: ' + r;
      } else if (ws) {
        const x = Math.floor(ws.px), y = Math.floor(ws.pz), E = R.entries(), D = R.worldD();
        const pairs = DIRS4.map(([dx, dy]) => [x + dx * 2, y + dy * 2]).filter(([a, b]) => R.worldCan(ws, ws.vehicle, a, b) && !E[((a % D.w) + D.w) % D.w + ',' + ((b % D.h) + D.h) % D.h]);
        if (!pairs.length) return 'c6b_level: no room to pace here';
        const r = yield* R.walkWorld([pairs[side++ % pairs.length]], { anywhere: true });
        if (r !== true) return 'c6b_level: ' + r;
      } else yield;
    }
    R.note('levels: ' + FF7.sys.party.active().map(c => c.name + ' ' + c.level).join(', ') + ' (' + R.where() + ')');
    return true;
  };

  // ['c6b_sources', charId]: every Source in the bag, used on that character (the Item screen)
  R.ops.c6b_sources = function* (who) {
    const ids = ['power_source', 'guard_source', 'magic_source', 'mind_source', 'speed_source', 'luck_source'];
    let n = 0;
    for (const id of ids) for (let g = 0; g < 99 && FF7.sys.inv.has(id); g++) {
      const r = yield* R.ops.useItem(id, who, { keep: true });
      if (r !== true) { R.note('c6b_sources: ' + r); break; }
      n++;
    }
    if (R.menus) yield* R.menus.finish();
    if (n) R.say('sources: ' + n + ' used on ' + who);
    return true;
  };

  // ---------------------------------------------------------------- start profile
  // C6a's real end state (its c6a_end checkpoint): the buggy just south of the Corel Desert walls with the
  // party in it; seven members; every flag C1-C6a set; the two Enemy Skill materia with what they learned.
  const FLAGS_C6B = (
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
    'c6a_race_started c6a_saw_saucer c6a_turtle_flyer3 c6a_umbrella c6a_waterside_seen c6a_wizard_staff cait_joined chocobo_lure got_costa_villa_firering ' +
    'got_costa_villa_motordrive got_costa_villa_powersource got_gs_jockey_ramuh got_junon_apt_eskill got_junon_apt_guard got_junon_apt_luck ' +
    'got_junon_apt_mind got_junon_apt_power got_junon_apt_soldier got_junon_rooms_soldier got_junon_rooms_speed got_kalm_tower_peacemaker ' +
    'got_mine_cavern_mindsource got_mine_north_elixir got_mine_north_hipotion got_mine_steps_tent got_mine_vines_ether got_mine_vines_longrange ' +
    'got_mtcorel_cave_mindsource got_mtcorel_cave_powersource got_mtcorel_cave_tent got_mtcorel_tracks2_starpendant got_mtcorel_tracks2_transform ' +
    'got_mtcorel_tracks2_turboether got_mtcorel_tracks2_wmg got_ship_engine_ifrit got_ship_engine_windslash got_ship_hold_all got_ship_hold_ether has_buggy ' +
    'has_phs left_midgar trig_fb_bridge_collapse trig_junon_airport_highwind trig_junon_lower_priscilla_gift trig_junon_street2_glimpse ' +
    'trig_mine_exit_turks trig_mine_vines_vine_hint trig_mtcorel_bridge_creak trig_mtcorel_cabin_birds trig_mtcorel_tracks1_weak2 ' +
    'trig_mtcorel_tracks2_dead_end trig_prison_dyne_dyne trig_ship_engine_birth yuffie_joined ').trim().split(/\s+/);
  R.starts.c6b = {
    world: {"x":135,"y":205,"vehicle":"buggy"},
    members: ["cloud","tifa","aeris","redxiii","yuffie","caitsith","barret"],
    party: ["cloud","barret","caitsith"],
    levels: {"cloud":23,"tifa":21,"aeris":20,"redxiii":19,"yuffie":19,"caitsith":20,"barret":22},
    names: {"cloud":"Cloud","tifa":"Tifa","aeris":"Aeris","redxiii":"Red XIII","yuffie":"Yuffie","caitsith":"Cait Sith","barret":"Barret"},
    phs: true,
    flags: FLAGS_C6B,
    vars: {"c12b_on_choco":0,"c5a_party":"barret,tifa","aff_barret":5,"c5a_cabinet":5,"aff_tifa":3,"chocobo_pen":[],"chocobo_color":"yellow","c12a_riding":0,"c5b_condor_funds":10000,"mg_best_fort_condor":620,"c5b_condor_prize":3,"mg_best_cpr":5,"mg_best_dolphin":100,"mg_best_parade":66,"aff_aeris":15,"mg_best_motorcycle_gbike":19975,"mg_best_shooting_speed_square":7720,"turtle_flyers":1,"mg_esther_try":0,"mg_best_chocobo_race":6},
    items: {"phoenix_down":15,"ether":15,"elixir":3,"antidote":3,"hyper":2,"tranquilizer":1,"grenade":2,"turbo_ether":2,"megalixir":1,"peacemaker":1,"lasan_nut":1,"mythril_clip":1,"bronze_bangle":1,"tent":4,"1_35_soldier":2,"buster_sword":1,"headband":1,"4_point_shuriken":1,"motor_drive":1,"w_machine_gun":1,"bolt_plume":3,"star_pendant":2,"mythril_rod":1,"umbrella":1,"silver_armlet":1,"t_s_bomb":2,"hi_potion":1},
    keyItems: ["phs"],
    gil: 9761,
    vehicles: {"buggy":{"x":150,"y":215}},
    equip: {
      cloud: {"weapon":"force_stealer","armor":"mythril_armlet","accessory":"power_wrist"},
      tifa: {"weapon":"grand_glove","armor":"mythril_armlet","accessory":"protect_vest"},
      aeris: {"weapon":"wizard_staff","armor":"iron_bangle","accessory":"peace_ring"},
      redxiii: {"weapon":"magic_comb","armor":"mythril_armlet","accessory":"fire_ring"},
      yuffie: {"weapon":"wind_slash","armor":"titan_bangle","accessory":"white_cape"},
      caitsith: {"weapon":"yellow_m_phone","armor":"silver_armlet"},
      barret: {"weapon":"atomic_scissors","armor":"mythril_armlet","accessory":"talisman"},
    },
    materia: {
      cloud: ["restore","transform","choco_mog","poison",{"id":"enemy_skill","eskills":["matra_magic","laser","aqualung","big_guard"]}],
      tifa: ["ice",null,"steal",null,null,"shiva"],
      aeris: [null,"ifrit"],
      yuffie: ["throw"],
      caitsith: ["fire","all","manipulate","restore",null,null,"ramuh"],
      barret: [{"id":"enemy_skill","eskills":["matra_magic","flame_thrower","laser","aqualung","big_guard"]},"all","cover","long_range"],
    },
    stock: ["sense","chocobo_lure","elemental","lightning"],
  };

  // ---------------------------------------------------------------- the plan
  FF7.runner.plans.c6b = [
    ['chapter', 'c6b', 'Chapter 6b: Gongaga and Cosmo Canyon'],
    ['expect', 'has_buggy', { soft: true }],                         // C6a's handoff: the buggy (soft: it's set before C6a's end)

    // ---- Gongaga: the Turks in the jungle
    ['obj', 'Drive south to the jungle village of Gongaga'],
    ['party', ['cloud', 'tifa', 'yuffie']],                         // PHS: Tifa (Gongaga, Nibelheim), Yuffie (Steal, Wutai)
    ['autoequip', { reserve: true }],
    ['autoMateria', { steal: 'yuffie', eskill: ['cloud', 'yuffie'], healer: 'tifa' }],
    ['save', { map: 'world' }],                                     // world map, before the Turks
    ['battle', {}],
    ['world', 'gongaga'],
    ['expectMap', 'gongaga_jungle1'],
    ['obj', 'Get past the Turks'],
    ['walk', 14, 6, { done: 'c6b_turks_done' }],                    // Reno and Rude (Fairy Tale, X-Potion)
    ['expect', 'c6b_turks_done'],
    ['obj', 'Learn Frog Song from the Touch Me frogs'],
    ['c6b_learn', ['frog_song'], { battles: 20, budget: 600000 }],                  // Touch Me (gongaga_jungle_1; it casts at random, and only some battles have one)

    // ---- the ruined reactor: Scarlet and Tseng, the Titan materia
    ['obj', 'Explore the ruined reactor'],
    ['goto', 'gongaga_reactor'],
    ['walk', 14, 4, { done: 'c6b_reactor_scene' }],                 // Scarlet, Tseng and Elena
    ['expect', 'c6b_reactor_scene'],
    ['use', 14, 2, { done: 'c6b_titan' }],                          // Titan, where Scarlet was kneeling
    ['expect', 'c6b_titan'],

    // ---- the jungle crossroads and the village
    ['obj', 'Head for Gongaga village'],
    ['goto', 'gongaga_jungle2'],
    ['item', 'gongaga_jungle2_deathblow'],                          // Deathblow
    ['goto', 'gongaga_village'],
    ['save'],
    ['goto', 'gongaga_inn'],
    ['chest', 'gongaga_inn_xpotion'],                               // X-Potion
    ['goto', 'gongaga_house'],
    ['chest', 'gongaga_house_mphone'],                              // White M-phone (Cait Sith)
    ['goto', 'gongaga_zack'],                                       // Zack's parents (Tifa is along: her scene)
    ['talk', 'zack_mother', { done: 'c6b_zack_heard' }],
    ['expect', 'c6b_zack_heard'],
    ['obj', 'Shop in Gongaga'],
    ['goto', 'gongaga_weapon'],                                     // up the ladder
    ['gear', { shop: 'clerk' }],
    ['goto', 'gongaga_acc'],
    // the materia counter: Time (Haste) and Heal (the new kinds worth their gil now; Mystify waits for Cosmo Canyon)
    ['buyNew', { shop: 'clerk', choose: 'Materia', kinds: [], want: { time: 1, heal: 1 }, keepGil: 3000 }],
    ['goto', 'gongaga_items'],
    ['shop', 'clerk', { buy: [['hi_potion', 10], ['tent', 2]], lenient: true }],   // for the Cave of the Gi
    ['autoMateria', { steal: 'yuffie', eskill: ['cloud', 'yuffie'], healer: 'tifa' }],

    // ---- Cosmo Canyon
    ['obj', 'Drive west to Cosmo Canyon'],
    ['choose', 'Not really'],                                       // "Do you know where you are?" (the honest answer)
    ['world', 'cosmo_canyon'],
    ['expectMap', 'cosmo_gate'],
    ['expect', 'c6b_cosmo_arrived'],
    ['obj', 'Look around Cosmo Canyon'],
    ['goto', 'cosmo_inn2'],
    ['use', 1, 6, { done: 'c6b_elixir' }],                          // Elixir, behind the bed frame
    ['use', 7, 1, { done: 'c6b_turtle_flyer5' }],                   // Turtle's Paradise flyer No.5
    ['goto', 'cosmo_hall'],
    ['use', 6, 1, { done: 'c6b_turtle_flyer4' }],                   // Turtle's Paradise flyer No.4
    ['goto', 'cosmo_itemshop'],
    ['shop', 'clerk', { buy: [['hi_potion', 10]], lenient: true }],
    ['goto', 'cosmo_hall'],
    ['gear', { shop: 'tigerlily', members: ['cloud', 'yuffie', 'redxiii'], keepGil: 1000 }],   // Tiger Lily's: for the party of the Cave of the Gi
    ['obj', "Meet Red XIII's grandfather at the observatory"],
    ['goto', 'cosmo_observatory'],
    ['expect', 'c6b_met_bugen'],
    ['talk', 'bugen', { done: 'c6b_planetarium', choose: "Let's go" }],   // the planetarium: the Lifestream
    ['expectMap', 'cosmo_plaza'],
    ['expect', 'c6b_candle_start'],

    // ---- the Cosmo Candle, the sealed door
    ['obj', 'Talk to Red XIII at the Cosmo Candle'],
    ['party', ['cloud', 'redxiii', 'yuffie'], { select: true }],    // the party screen at the sealed door
    ['choose', "Let's go", 'Open the door'],
    ['talk', 'redxiii', { done: 'c6b_candle_done' }],               // Seto... Bugenhagen opens the Cave of the Gi
    ['expect', 'c6b_candle_done'],
    ['talk', 'bugen', { done: 'c6b_gi_open', map: 'cosmo_gihall', choose: 'Open the door' }],   // (if we said "Give us a minute")
    ['expect', 'c6b_gi_open'],

    // ---- the Cave of the Gi
    ['obj', 'Follow Bugenhagen through the Cave of the Gi'],
    ['expectMap', 'gi_descent', { done: (s, R) => /^gi_/.test(R.where()) }],   // (resumed deeper in the cave: go on)
    ['autoMateria', { steal: 'yuffie', manipulate: 'cloud', eskill: ['cloud', 'yuffie'] }],   // Red XIII is back: his slots too
    ['equip', 'yuffie', 'accessory', 'fire_ring'],                  // the Fire Ring (off whoever wears it): Gi Nattak's Soul Fires cast Fire2
    // the training here doubles as Red XIII's Limit training (the Limit Break Mechanics guide): the killing blows
    // are his (Blood Fang at 72 kills, Howling Moon at 144: the others chip the Hegs down and let him finish them);
    // the uses come as his gauge fills (the limit policy sets the level that teaches)
    ['battle', { limitTrain: { learners: ['redxiii'], upTo: 3, uses: false } }],
    ['goto', 'gi_caverns'],
    ['c6b_level', 26, { budget: 600000 }],                                            // the Heg packs pay well here; Gi Nattak is level 29
    ['battle', {}],
    ['talk', 'gi_rock3', { done: 'c6b_gi_secret', choose: 'Break it' }],   // the third rock: the secret passage
    ['goto', 'gi_oil'],
    ['walk', 2, 11, { run: false }],                                // walk (never run) across the golden ooze
    ['exit', [2, 15]],                                              // down the far side to the ledge
    ['item', 'gi_caverns_added_effect'],                            // Added Effect
    ['exit', [24, 0]],
    ['walk', 5, 5, { run: false }],                                 // up the stairs, clear of the ooze
    ['chest', 'gi_oil_ether'],                                      // Ether
    ['chest', 'gi_oil_black_mphone'],                               // Black M-phone
    ['c6b_learn', ['death_sentence'], { battles: 6, budget: 300000 }],              // Sneaky Step, Manipulated into casting it
    ['goto', 'gi_web'],
    ['talk', 'stinger', { done: 'c6b_gi_web', choose: 'Cut it down' }],   // the Stinger
    ['expect', 'c6b_gi_web'],
    ['chest', 'gi_web_xpotion'],                                    // X-Potion
    ['goto', 'gi_nattak'],
    ['chest', 'gi_nattak_fairy_ring'],                              // Fairy Ring
    ['chest', 'gi_nattak_turbo_ether'],                             // Turbo Ether
    ['heal', { below: 0.95 }],
    ['save'],
    ['ckpt', 'c6b_nattak'],
    ['obj', 'Defeat Gi Nattak'],
    ['walk', 15, 4, { done: 'c6b_gi_nattak' }],                     // Gi Nattak and two Soul Fires (Wizer Staff, Gravity)
    ['expect', 'c6b_gi_nattak'],
    ['obj', 'See what lies beyond'],
    ['exit', 'gi_seto', { done: 'c6b_seto' }],                      // Seto; Nanaki's howl; the Seraph Comb
    ['expectMap', 'cosmo_gate'],
    ['expect', 'c6b_done'],
    ['expect', 'c6b_farewell'],

    // ---- setting out again: the party for Nibelheim, shopping, a night at the inn
    ['obj', 'Get ready to head north'],
    ['autoequip', { reserve: true }],                               // Seraph Comb, Wizer Staff, Fairy Tale, the M-phones
    ['party', ['cloud', 'tifa', 'yuffie']],                         // Tifa for Nibelheim; Yuffie for Wutai
    ['goto', 'cosmo_hall'],
    ['gear', { shop: 'tigerlily', keepGil: 6000 }],                 // Tiger Lily's, for the new party
    // the materia shop upstairs: HP Plus (MP Plus and Mystify wait for Disc 3, when gil is plentiful: Mideel's shops
    // close for good in C10 and want it first)
    ['goto', 'cosmo_hall2'],
    ['buyNew', { shop: 'materia_clerk', kinds: [], want: { hp_plus: 1 }, keepGil: 4000 }],
    ['goto', 'cosmo_itemshop'],
    ['shop', 'clerk', { buy: [['hi_potion', 10], ['phoenix_down', 5], ['ether', 2]], lenient: true, done: 'c6b_shopped' }],
    ['js', (s) => { s.set('c6b_shopped'); return true; }],
    ['autoMateria', { steal: 'yuffie', manipulate: 'yuffie', eskill: ['cloud', 'yuffie'], healer: 'tifa' }],
    ['goto', 'cosmo_inn'],
    ['inn', 'innkeeper', { done: 'c6b_rested' }],
    ['js', (s) => { s.set('c6b_rested'); return true; }],          // (the chapter's last step: a resume guard)
    ['expect', { any: ['c6b_rested', 'c7_nibel_arrived'] }],        // the handoff (Seto: c6b_done)
    ['ckpt', 'c6b_end'],
  ];
})();
