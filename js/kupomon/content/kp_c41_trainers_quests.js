// The legends' quest trainers (js/maps/kupomon/kp_lq_*.js), themed apart from every other trainer's team (the user's
// rule: trainers don't share moogles; a rematch with the same person may bring theirs back). Each clashing moogle
// swapped for an unused one of its type and stage (old-scale levels, as W.trainer reads them).
(function () {
  const KP = FF7.kupomon;
  KP.content('trainers_quests', {
    teams: {
      lq_jeno_hojo: [['rodeopom_cowboy', 28, {"held":"boost_beast"}], ['yukepom_magicite_sage', 28, {"held":"leftover_nut"}], ['mogmk_mk2', 29, {"held":"boost_machinist"}], ['verdikin_materia_master', 29, {"held":"boost_blackmage"}], ['ouijapom_shaman', 29, {"held":"boost_summoner"}]],
      lq_ulti_morrigan: [['kupwick_magus', 30, {"held":"boost_blackmage"}], ['palopom_twin_mage', 30, {"held":"lucky_pom"}], ['deepkupo_tsviet', 30, {"held":"leftover_nut"}], ['grimmog_shadow_lord', 30, {"held":"quick_gear"}], ['lucamog_lucavi', 30, {"held":"focus_pom"}]],
      lq_omega_ulric: [['grumog_viking', 30, {"held":"boost_warrior"}], ['kupkakupp_azure_dragoon', 30, {"held":"boost_dragoon"}], ['garmog_chaos', 30, {"held":"leftover_nut"}], ['honeykin_queensguard', 30, {"held":"quick_gear"}], ['moglin_samurai', 30, {"held":"lucky_pom"}]],
      lq_omega_keeper2: [['spykin_turk', 30, {"held":"boost_thief"}], ['cactumog_guard', 30, {"held":"leftover_nut"}], ['esperpom_esper_elder', 30, {"held":"boost_blackmage"}]],
      lq_omega_keeper3: [['puddlepom_hydromancer', 30, {"held":"leftover_nut"}], ['truffkin_morpher', 30, {"held":"boost_beast"}], ['eikomog_eikon', 30, {"held":"boost_summoner"}]],
      lq_omega_keeper4: [['palamog_dark_knight', 30, {"held":"leftover_nut"}], ['kupek_mine_warden', 30, {"held":"quick_gear"}], ['clavamog_clavat_hero', 30, {"held":"boost_knight"}]],
      lq_omega_keeper5: [['ryukupo_shinryu', 30, {"held":"boost_dragoon"}], ['halomog_bishop', 30, {"held":"leftover_nut"}], ['ragnamog_ragnarok', 30, {"held":"lucky_pom"}]],
      lq_pom_knight: [['woolpom_animist', 28.799999999999997, {"held":"leftover_nut"}], ['puddipom_gourmet', 28.799999999999997, {"held":"boost_freelancer"}], ['piperpom_wildspeaker', 29.4, {"held":"boost_beast"}]],
      lq_tempo_tick: [['babilkin_giant', 28.799999999999997, {"held":"boost_machinist"}], ['telekupo_crystal_bearer', 28.799999999999997, {"held":"leftover_nut"}], ['gizmog_gadgeteer', 28.799999999999997, {"held":"lucky_pom"}]],
      lq_tempo_tock: [['rhythmog_rhythm_virtuoso', 28.799999999999997, {"held":"leftover_nut"}], ['loremog_lore_elder', 28.799999999999997, {"held":"boost_timemage"}], ['gearmog_artificer', 29.4, {"held":"boost_machinist"}]],
      lq_lux_tifa: [['icemog_yeti', 30, {"held":"quick_gear"}], ['focumog_hero', 30, {"held":"boost_monk"}], ['kupochi_master', 30, {"held":"lucky_pom"}], ['knucklin_lanista', 30, {"held":"leftover_nut"}], ['kupozen_white_monk', 30, {"held":"focus_pom"}]],
      lq_rasla: [['bogmog_hag', 30, {"held":"leftover_nut"}], ['huntmog_trapper', 30, {"held":"lucky_pom"}], ['flintkin_flintlock', 30, {"held":"boost_ranger"}], ['pyremog_unsent', 30, {"held":"focus_pom"}], ['chicomog_sage', 30, {"held":"quick_gear"}]],
      lq_archivist: [['tomekin_scholar', 27.6, {"held":"leftover_nut"}], ['astropom_astronaut', 27.6, {"held":"quick_gear"}], ['relikin_archaeologist', 27.6, {"held":"focus_pom"}], ['kuru_high_roller', 28.2, {"held":"boost_timemage"}], ['redpom_sage', 28.2, {"held":"lucky_pom"}]],
    },
  });
})();
