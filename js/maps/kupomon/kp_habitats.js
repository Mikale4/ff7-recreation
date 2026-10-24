// Where the second Kupodex's moogles live (js/kupomon/kp_dex2.js, docs/KUPOMON_WORLD.md "The Kupodex"): adds them to
// the region files' wild tables (KP.WILD, [species, weight, min Lv, max Lv]) inside each place's own level range, by
// theme: beach families on the coast roads, snow on Route 7, sand on Route 8 and in Sandsea, ghosts in the marsh and
// Ravenmoor, gadgets in Cogsworth. A base form is always met below the level it changes job at, an evolved form never
// below the level it's reached at. Commons weigh 10-14, uncommons 5-10, the rares and the rarely seen evolved forms 3-4.
// Loaded after the region files (js/maps/_maps.js).
(function () {
  const KP = FF7.kupomon;
  const add = (id, rows) => { const t = KP.WILD[id]; if (!t) return; rows.forEach(r => { if (!t.some(q => q[0] === r[0])) t.push(r); }); };

  // ---- Region 1: Pom Meadow to Kurotsuki (Lv 2-11)
  add('kp_route1', [['trekpom_tourist', 14, 2, 4], ['woolpom_shepherd', 12, 2, 5], ['kupera_chorister', 10, 3, 5]]);
  add('kp_route1_north', [['hedgepom_gardener', 14, 3, 6], ['mogcasso_painter', 12, 3, 6], ['kupage_page', 12, 4, 6], ['woolpom_shepherd', 6, 4, 6], ['trekpom_tourist', 6, 3, 5]]);
  add('kp_route2', [['rockupo_busker', 14, 5, 8], ['puddipom_cook', 14, 5, 8], ['spykin_spy', 10, 6, 8], ['kupera_chorister', 6, 5, 7], ['trekpom_tourist', 6, 5, 7]]);
  add('kp_whisperwood', [['chopkin_woodcutter', 14, 6, 9], ['truffkin_forager', 14, 6, 10], ['filchpom_pickpocket', 12, 7, 10]]);
  add('kp_whisperwood_glade', [['twinklin_stargazer', 8, 8, 10], ['truffkin_forager', 12, 7, 10], ['hedgepom_gardener', 8, 7, 10]]);
  add('kp_route3', [['kenkupo_wanderer', 14, 8, 11], ['bustermog_trooper', 12, 8, 11], ['sumopom_sumo', 10, 9, 11], ['filchpom_pickpocket', 6, 8, 10], ['twinklin_stargazer', 5, 9, 11]]);

  // ---- Region 2: the coast, Mt. Kupo, Cogsworth and the farms (Lv 10-17)
  add('kp_route4', [['buoypom_lifeguard', 14, 10, 13], ['riposto_fencer', 12, 10, 13], ['flintkin_fusilier', 10, 11, 13], ['kupage_page', 5, 10, 12]]);
  add('kp_route5', [['kupozen_initiate', 12, 12, 15], ['knucklin_brawler', 12, 12, 15], ['aegimog_shield_bearer', 10, 13, 15], ['chopkin_woodcutter', 6, 12, 14], ['sumopom_sumo', 5, 13, 15]]);
  add('kp_mtkupo_1', [['relikin_digger', 12, 13, 16], ['sootkin_stoker', 10, 13, 15]]);
  add('kp_mtkupo_2', [['relikin_digger', 10, 14, 16], ['sootkin_stoker', 10, 14, 16]]);
  add('kp_mtkupo_glow', [['relikin_digger', 10, 14, 16]]);
  add('kp_cogsworth', [['voltkin_electrician', 14, 14, 16], ['dustbun_sweeper', 14, 14, 16], ['gizmog_inventor', 12, 14, 16]]);
  add('kp_route6', [['breezlin_miller', 12, 14, 17], ['rodeopom_cowpoke', 12, 14, 17], ['honeykin_beekeeper', 10, 15, 17], ['woolpom_shepherd', 6, 14, 15],
    ['hedgepom_gardener', 5, 14, 16], ['woolpom_animist', 4, 16, 17], ['puddipom_chef', 4, 16, 17]]);

  // ---- Region 3: the peaks, the desert and the ruins (Lv 16-23)
  add('kp_route7', [['shredpom_sledder', 12, 16, 19], ['chillkin_ice_sculptor', 12, 16, 19], ['wyverkin_wyvern_keeper', 10, 17, 19], ['kupozen_disciple', 5, 17, 19],
    ['tekkupo_magitek', 3, 17, 19]]);
  add('kp_route8', [['hawkin_falconer', 12, 18, 21], ['puddlepom_rainmaker', 12, 18, 21], ['luchapom_wrestler', 10, 19, 21], ['rodeopom_cowboy', 4, 21, 21]]);
  add('kp_sandsea', [['prestopom_trickster', 14, 19, 22], ['brawnpom_bouncer', 12, 20, 22], ['partypom_partygoer', 12, 19, 22], ['bigtopo_ringmaster', 4, 20, 22]]);
  add('kp_ruins', [['tomekin_arcanist', 12, 20, 23], ['relikin_archaeologist', 8, 21, 23], ['spykin_agent', 5, 20, 23]]);
  add('kp_route9', [['astropom_space_cadet', 12, 20, 23], ['nimbopom_forecaster', 12, 20, 23], ['vaultkin_hurdler', 10, 20, 23], ['hawkin_falconer', 5, 20, 22]]);

  // ---- Region 4: the coast road to the Coliseum (Lv 22-30)
  add('kp_route10', [['wavekin_bodyboarder', 14, 22, 25], ['bubblin_snorkeler', 12, 22, 25], ['salvepom_salve_maker', 12, 22, 25], ['buoypom_coastguard', 6, 22, 25],
    ['flintkin_flintlock', 4, 22, 25], ['hedgepom_topiarist', 4, 22, 25]]);
  add('kp_route11', [['ouijapom_medium', 10, 24, 27], ['puddlepom_hydromancer', 6, 24, 27], ['truffkin_druid', 6, 24, 26], ['honeykin_queensguard', 4, 24, 27]]);
  add('kp_ravenmoor', [['ouijapom_medium', 10, 25, 27], ['filchpom_cat_burglar', 6, 25, 27], ['prestopom_illusionist', 4, 25, 27]]);
  add('kp_route12', [['wyverkin_dragonkin', 6, 26, 28], ['hawkin_raptor', 6, 26, 28], ['kenkupo_parivir', 6, 26, 26], ['chopkin_ravager', 6, 26, 28],
    ['astropom_astronaut', 5, 26, 27], ['voltkin_stormcaller', 5, 26, 28]]);
  add('kp_lifestream', [['twinklin_skyseer', 4, 27, 29], ['mogcasso_pictomancer', 5, 26, 28], ['ouijapom_shaman', 6, 28, 29], ['astropom_lunarian', 3, 28, 29],
    ['tomekin_scholar', 4, 27, 29]]);
  add('kp_route13', [['sumopom_yokozuna', 6, 27, 29], ['luchapom_luchador', 6, 27, 29], ['kupozen_white_monk', 5, 27, 29], ['bustermog_first_class', 4, 27, 29],
    ['kenkupo_sword_saint', 4, 27, 29], ['knucklin_lanista', 6, 27, 29], ['shredpom_snowboarder', 5, 27, 29]]);
  add('kp_summit', [['brawnpom_defender', 6, 27, 30], ['truffkin_morpher', 4, 28, 30], ['chillkin_elementalist', 6, 27, 29], ['relikin_archaeologist', 5, 27, 29],
    ['leomog_gunbreaker', 3, 28, 30]]);
  add('kp_route14', [['aegimog_holy_knight', 8, 28, 30], ['kupage_mog_knight', 8, 28, 30], ['vaultkin_pole_vaulter', 6, 28, 30], ['hawkin_raptor', 5, 28, 30],
    ['breezlin_aeromancer', 6, 28, 30], ['seramog_seraph', 3, 29, 30]]);

  // ---- after the Gold League
  add('kp_crater', [['riposto_rune_knight', 5, 29, 30], ['astropom_lunarian', 4, 29, 30], ['sootkin_pyromancer', 6, 29, 30], ['nimbopom_meteorologist', 5, 29, 30],
    ['nethermog_netherseer', 4, 29, 30]]);
  add('kp_mognet', [['kupera_diva', 6, 29, 30], ['puddipom_gourmet', 6, 29, 30], ['dustbun_custodian', 8, 29, 30], ['gizmog_gadgeteer', 6, 29, 30],
    ['spykin_turk', 5, 29, 30], ['trekpom_wayfarer', 5, 29, 30], ['rockupo_rock_star', 5, 29, 30], ['partypom_party_host', 5, 29, 30]]);
})();
