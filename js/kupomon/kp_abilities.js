// Kupomon abilities (Pokémon's, docs/KUPOMON_WORLD.md "Abilities"): KP.ABILITIES[id] = { name, desc, ...effects } and
// KP.SPECIES_ABIL[species] = [a, b?]. A moogle has one of its species' abilities, picked by the slot it was made with
// (mon.abil, kept through evolution, so a line keeps each slot's ability or a sensible upgrade of it). The engine is
// js/kupomon/kp_learn.js (KP.abilityOf) and kp_battle.js; it knows only these effect keys:
//   boost { types: ['own'] | [type...], mul, below }  stab  immune [types] + absorb  resist { type: mul }  noStatus
//   onEnter { foe | self: [stat, n] }  regen  onHit { status: [st, chance] } | { recoil }  crit  noCrit  noMiss  guts
//   sturdy  coins  healMul  drainMul  firstStrike  statMul { atk | def | spd }  statusChance  pinchSpd  expMul
// Most are modest; the legends have one strong ability of their own. No immunity goes to a moogle whose attacks are
// all of one type the same immunity could meet on the other side (tools/kp_learncheck.js checks the walls).
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {};
  KP.ABILITIES = KP.ABILITIES || {};
  KP.SPECIES_ABIL = KP.SPECIES_ABIL || {};

  Object.assign(KP.ABILITIES, {
    // ---- in a pinch (the starters' own, as Pokémon's Blaze; and one for anyone)
    last_stand: { name: 'Last Stand', desc: 'Warrior moves hit 1.5x at 1/3 HP or less.', boost: { types: ['warrior'], mul: 1.5, below: 0.34 } },
    mana_surge: { name: 'Mana Surge', desc: 'Black Mage moves hit 1.5x at 1/3 HP or less.', boost: { types: ['blackmage'], mul: 1.5, below: 0.34 } },
    devotion: { name: 'Devotion', desc: 'White Mage moves hit 1.5x at 1/3 HP or less.', boost: { types: ['whitemage'], mul: 1.5, below: 0.34 } },
    adrenaline: { name: 'Adrenaline', desc: 'Its own-type moves hit 1.5x at 1/3 HP or less.', boost: { types: ['own'], mul: 1.5, below: 0.34 } },
    // ---- coming out
    menace: { name: 'Menace', desc: "A glare as it comes out: the foe's Attack drops.", onEnter: { foe: ['atk', -1] } },
    time_lag: { name: 'Time Lag', desc: "Slows the foe as it comes out: the foe's Speed drops.", onEnter: { foe: ['spd', -1] } },
    expose: { name: 'Expose', desc: "Sizes the foe up as it comes out: its Defense drops.", onEnter: { foe: ['def', -1] } },
    battle_ready: { name: 'Battle Ready', desc: 'Comes out swinging: its Attack rises.', onEnter: { self: ['atk', 1] } },
    auto_protect: { name: 'Auto-Protect', desc: 'Comes out behind a barrier: its Defense rises.', onEnter: { self: ['def', 1] } },
    auto_haste: { name: 'Auto-Haste', desc: 'Comes out hasted: its Speed rises.', onEnter: { self: ['spd', 1] } },
    hawkeye: { name: 'Hawkeye', desc: 'Comes out taking aim: its crits get likelier.', onEnter: { self: ['crit', 1] } },
    // ---- healing
    auto_regen: { name: 'Auto-Regen', desc: 'Restores 1/16 of its max HP every turn.', regen: 1 / 16 },
    medicine: { name: 'Medicine', desc: 'Its healing moves heal 1.5x as much.', healMul: 1.5 },
    osmose: { name: 'Osmose', desc: 'Its draining moves drain twice as much.', drainMul: 2 },
    // ---- ailments it shrugs off
    wide_awake: { name: 'Wide Awake', desc: 'It never falls asleep.', noStatus: ['sleep'] },
    antitoxin: { name: 'Antitoxin', desc: 'Poison never takes hold of it.', noStatus: ['poison'] },
    night_vision: { name: 'Night Vision', desc: "It can't be Blinded.", noStatus: ['blind'] },
    echo_voice: { name: 'Echo Voice', desc: "It can't be Silenced.", noStatus: ['silence'] },
    unstoppable: { name: 'Unstoppable', desc: "It can't be Stopped.", noStatus: ['stop'] },
    clear_head: { name: 'Clear Head', desc: 'It never gets Confused or goes Berserk.', noStatus: ['confuse', 'berserk'] },
    charmed_life: { name: 'Charmed Life', desc: 'Doom never counts down on it.', noStatus: ['doom'] },
    ribbon: { name: 'Ribbon', desc: 'It shrugs off every ailment.', noStatus: 'all' },
    // ---- moves of a type it can't be hurt by
    float: { name: 'Float', desc: "Hovers out of reach: Monk moves can't touch it.", immune: ['monk'] },
    magic_eater: { name: 'Magic Eater', desc: 'Black magic heals it by 1/4 instead of hurting it.', immune: ['blackmage'], absorb: true },
    soundproof: { name: 'Soundproof', desc: 'Songs and dances have no effect on it.', immune: ['bard'] },
    holy_aura: { name: 'Holy Aura', desc: 'White magic heals it by 1/4 instead of hurting it.', immune: ['whitemage'], absorb: true },
    // ---- moves it takes less from
    thick_wool: { name: 'Thick Wool', desc: 'Halves damage from Black Mage and Beast moves.', resist: { blackmage: 0.5, beast: 0.5 } },
    shell: { name: 'Shell', desc: 'Halves damage from Black and White Mage moves.', resist: { blackmage: 0.5, whitemage: 0.5 } },
    heavy_armor: { name: 'Heavy Armor', desc: 'Halves damage from Warrior and Monk moves.', resist: { warrior: 0.5, monk: 0.5 } },
    blur: { name: 'Blur', desc: 'Halves damage from Ranger and Thief moves.', resist: { ranger: 0.5, thief: 0.5 } },
    stand_firm: { name: 'Stand Firm', desc: "At full HP, one hit can't knock it out.", sturdy: true },
    hard_shell: { name: 'Hard Shell', desc: "Its hard shell can't take critical hits.", noCrit: true },
    // ---- attacking
    lucky_star: { name: 'Lucky Star', desc: 'Its critical-hit stage is one higher.', crit: 1 },
    sure_hit: { name: 'Sure Hit', desc: 'Its moves never miss.', noMiss: true },
    grit: { name: 'Grit', desc: 'Attack 1.5x while it has a lasting ailment.', guts: 1.5 },
    first_strike: { name: 'First Strike', desc: 'It moves first on the turn it comes out.', firstStrike: true },
    strength_plus: { name: 'Strength+', desc: 'Its Attack is 20% higher.', statMul: { atk: 1.2 } },
    vitality_plus: { name: 'Vitality+', desc: 'Its Defense is 20% higher.', statMul: { def: 1.2 } },
    speed_plus: { name: 'Speed+', desc: 'Its Speed is 20% higher.', statMul: { spd: 1.2 } },
    job_mastery: { name: 'Job Mastery', desc: 'Same-type moves hit 1.8x instead of 1.5x.', stab: 1.8 },
    hex: { name: 'Hex', desc: "Its moves' added effects are twice as likely.", statusChance: 2 },
    second_wind: { name: 'Second Wind', desc: 'Its Speed is 1.5x at 1/3 HP or less.', pinchSpd: 1.5 },
    magic_up: { name: 'Magic Up', desc: 'Black, White and Red Mage moves hit 1.2x.', boost: { types: ['blackmage', 'whitemage', 'redmage'], mul: 1.2 } },
    marksman: { name: 'Marksman', desc: 'Ranger and Machinist moves hit 1.2x.', boost: { types: ['ranger', 'machinist'], mul: 1.2 } },
    iron_fist: { name: 'Iron Fist', desc: 'Monk moves hit 1.2x.', boost: { types: ['monk'], mul: 1.2 } },
    encore: { name: 'Encore', desc: 'Bard moves hit 1.2x.', boost: { types: ['bard'], mul: 1.2 } },
    summon_bond: { name: 'Summon Bond', desc: 'Summoner moves hit 1.2x.', boost: { types: ['summoner'], mul: 1.2 } },
    // ---- when it's hit
    counter: { name: 'Counter', desc: 'Hit and still standing, it strikes back (50, its best stat).', counterHit: 50 },   // (a blow of its own, power 50, no type, with its stronger of Attack or Magic)
    barbs: { name: 'Barbs', desc: 'Hitting it may Poison the attacker.', onHit: { status: ['poison', 30] } },
    static: { name: 'Static', desc: 'Hitting it may Stop the attacker.', onHit: { status: ['stop', 20] } },
    dazzle: { name: 'Dazzle', desc: 'Hitting it may Blind the attacker.', onHit: { status: ['blind', 30] } },
    charm: { name: 'Charm', desc: 'Hitting it may leave the attacker Confused.', onHit: { status: ['confuse', 30] } },
    spore_cloud: { name: 'Spore Cloud', desc: 'Hitting it may put the attacker to Sleep.', onHit: { status: ['sleep', 20] } },
    // ---- on your team
    coin_up: { name: 'Coin Up', desc: 'Prize coins x2 while it is on your team.', coins: 2 },
    fast_learner: { name: 'Fast Learner', desc: 'It earns 1.2x EXP.', expMul: 1.2 },
    // ---- the legends' own
    reunion: { name: 'Reunion', desc: 'Its cells knit back: it heals 1/16 of its HP every turn.', regen: 1 / 16 },   // (1/10 with Drain and a Moon Howl walled a capped team: 2026-10-01)
    ultima_aura: { name: 'Ultima Aura', desc: "Same-type moves hit 1.8x, and it can't be Silenced.", stab: 1.8, noStatus: ['silence'] },
    weapon_core: { name: 'Weapon Core', desc: "No critical hits, and one hit can't KO it at full HP.", sturdy: true, noCrit: true },
    dragon_king: { name: 'Dragon King', desc: 'Moves first as it arrives; its own types hit 1.2x.', firstStrike: true, boost: { types: ['own'], mul: 1.2 } },
    royal_presence: { name: 'Royal Presence', desc: "Awes the foe (Attack down), and prize coins x2.", onEnter: { foe: ['atk', -1] }, coins: 2 },
  });

  // ------------------------------------------------------------------ who has which: S('ids...', [slot 0, slot 1])
  const S = (ids, abil) => ids.split(' ').forEach(id => { KP.SPECIES_ABIL[id] = abil; });
  // the starters: their pinch move first, as Pokémon's
  S('moglin_warrior moglin_gladiator', ['last_stand', 'grit']);
  S('moglin_samurai', ['last_stand', 'lucky_star']);
  S('kupwick_blackmage kupwick_blackwizard kupwick_magus', ['mana_surge', 'echo_voice']);
  S('pomsprout_whitemage pomsprout_devout pomsprout_whitewizard', ['devotion', 'medicine']);
  // Route 1 and Route 1 North
  S('tufty_freelancer tufty_mime', ['fast_learner', 'second_wind']);
  S('nutmog_thief nutmog_treasure_hunter', ['coin_up', 'speed_plus']);
  S('nutmog_ninja', ['coin_up', 'first_strike']);
  S('trekpom_tourist trekpom_wayfarer', ['fast_learner', 'auto_haste']);
  S('mopluff_bard mopluff_dancer', ['charm', 'encore']);
  S('woolpom_shepherd woolpom_animist', ['thick_wool', 'wide_awake']);
  S('mogpost_ranger mogpost_cannoneer', ['hawkeye', 'sure_hit']);
  S('kupera_chorister kupera_soprano kupera_diva', ['encore', 'echo_voice']);
  S('stampo_monk stampo_blackbelt', ['iron_fist', 'grit']);
  S('mossmog_geomancer mossmog_beastmaster', ['auto_regen', 'menace']);
  S('pipkin_freelancer pipkin_onion_knight', ['adrenaline', 'fast_learner']);
  S('hedgepom_gardener hedgepom_topiarist', ['barbs', 'auto_regen']);
  S('mogcasso_painter mogcasso_pictomancer', ['hex', 'magic_up']);
  S('kupage_page kupage_mog_knight', ['clear_head', 'vitality_plus']);
  // Route 2
  S('angler_fisher angler_harpooner', ['sure_hit', 'second_wind']);
  S('chemmog_chemist chemmog_alchemist', ['medicine', 'antitoxin']);
  S('farmmog_farmer farmmog_harvester', ['grit', 'auto_regen']);
  S('rockupo_busker rockupo_rock_star', ['encore', 'battle_ready']);
  S('puddipom_cook puddipom_chef puddipom_gourmet', ['medicine', 'coin_up']);
  S('spykin_spy spykin_agent spykin_turk', ['first_strike', 'night_vision']);
  // Whisperwood
  S('fletchmog_archer fletchmog_sniper', ['sure_hit', 'marksman']);
  S('huntmog_hunter huntmog_trapper', ['expose', 'night_vision']);
  S('chopkin_woodcutter chopkin_ravager', ['grit', 'strength_plus']);
  S('truffkin_forager truffkin_druid truffkin_morpher', ['spore_cloud', 'auto_regen']);
  S('filchpom_pickpocket filchpom_cat_burglar', ['coin_up', 'blur']);
  S('fernwisp_dryad', ['auto_regen', 'summon_bond']);
  S('twinklin_stargazer twinklin_astrologist twinklin_skyseer', ['lucky_star', 'fast_learner']);
  S('juggler_juggler juggler_jester', ['charm', 'sure_hit']);
  // Route 3
  S('kurogen_genin kurogen_kunoichi', ['first_strike', 'speed_plus']);
  S('mogsquire_squire mogsquire_knight', ['auto_protect', 'vitality_plus']);
  S('mogsquire_paladin', ['auto_protect', 'holy_aura']);
  S('kenkupo_wanderer kenkupo_parivir kenkupo_sword_saint', ['lucky_star', 'counter']);
  S('chatmog_mediator chatmog_orator', ['charm', 'menace']);
  S('sumopom_sumo sumopom_yokozuna', ['heavy_armor', 'stand_firm']);
  S('bustermog_trooper bustermog_soldier', ['battle_ready', 'grit']);
  S('bustermog_first_class', ['battle_ready', 'job_mastery']);
  // Route 4
  S('seamog_sailor seamog_captain', ['wide_awake', 'sure_hit']);
  S('mogpirate_pirate mogpirate_sky_pirate', ['coin_up', 'expose']);
  S('buoypom_lifeguard buoypom_coastguard', ['medicine', 'wide_awake']);
  S('riposto_fencer riposto_spellsword riposto_rune_knight', ['counter', 'first_strike']);
  S('chocomog_rider chocomog_knight', ['auto_haste', 'battle_ready']);
  S('flintkin_fusilier flintkin_flintlock', ['hawkeye', 'marksman']);
  // Route 5, Mt. Kupo
  S('grumog_berserker grumog_viking', ['grit', 'menace']);
  S('kupozen_initiate kupozen_disciple kupozen_white_monk', ['iron_fist', 'clear_head']);
  S('knucklin_brawler knucklin_lanista', ['iron_fist', 'counter']);
  S('aegimog_shield_bearer aegimog_holy_knight', ['stand_firm', 'auto_protect']);
  S('lumimog_lamplighter lumimog_beacon', ['dazzle', 'night_vision']);
  S('minemog_miner minemog_foreman', ['night_vision', 'soundproof']);
  S('shellmog_guardian', ['hard_shell', 'stand_firm']);
  S('relikin_digger relikin_archaeologist', ['fast_learner', 'night_vision']);
  S('sootkin_stoker sootkin_pyromancer', ['adrenaline', 'night_vision']);
  // Route 6, Cogsworth
  S('gearmog_tinker gearmog_engineer gearmog_artificer', ['medicine', 'vitality_plus']);
  S('gunmog_gunner gunmog_gun_arm', ['marksman', 'hawkeye']);
  S('voltkin_electrician voltkin_stormcaller', ['static', 'magic_up']);
  S('gizmog_inventor gizmog_gadgeteer', ['hex', 'fast_learner']);
  S('dustbun_sweeper dustbun_custodian', ['antitoxin', 'speed_plus']);
  S('puppetmog_puppeteer', ['charm', 'hex']);
  S('bluemog_blue_mage bluemog_blue_wizard', ['hex', 'magic_eater']);
  S('redpom_red_mage redpom_red_wizard redpom_sage', ['magic_up', 'echo_voice']);
  S('breezlin_miller breezlin_aeromancer', ['float', 'auto_haste']);
  S('rodeopom_cowpoke rodeopom_cowboy', ['speed_plus', 'menace']);
  S('honeykin_beekeeper honeykin_queensguard', ['barbs', 'auto_protect']);
  // Route 7
  S('icemog_climber icemog_yeti', ['thick_wool', 'grit']);
  S('kupochi_pugilist kupochi_master', ['iron_fist', 'first_strike']);
  S('shredpom_sledder shredpom_snowboarder', ['auto_haste', 'second_wind']);
  S('lancemog_lancer lancemog_dragoon lancemog_highwind', ['strength_plus', 'float']);
  S('chillkin_ice_sculptor chillkin_elementalist', ['unstoppable', 'magic_up']);
  S('darkmog_squire darkmog_knight', ['osmose', 'menace']);
  S('wyverkin_wyvern_keeper wyverkin_dragonkin', ['float', 'menace']);
  S('tekkupo_magitek', ['heavy_armor', 'magic_up']);
  // Route 8, Sandsea, the Sunken Ruins
  S('dunemog_nomad dunemog_raider', ['blur', 'antitoxin']);
  S('cactumog_guard', ['barbs', 'auto_regen']);
  S('hawkin_falconer hawkin_raptor', ['hawkeye', 'float']);
  S('puddlepom_rainmaker puddlepom_hydromancer', ['auto_regen', 'summon_bond']);
  S('luchapom_wrestler luchapom_luchador', ['battle_ready', 'charm']);
  S('gilmog_gambler', ['coin_up', 'lucky_star']);
  S('embermog_sorcerer embermog_archmage', ['mana_surge', 'echo_voice']);
  S('prestopom_trickster prestopom_illusionist', ['blur', 'hex']);
  S('brawnpom_bouncer brawnpom_defender', ['heavy_armor', 'menace']);
  S('partypom_partygoer partypom_party_host', ['charm', 'coin_up']);
  S('bigtopo_ringmaster', ['encore', 'menace']);
  S('wrapmog_tomb_guard', ['antitoxin', 'charmed_life']);
  S('tickmog_time_mage tickmog_chronomancer', ['time_lag', 'auto_haste']);
  S('mathmog_arithmetician', ['sure_hit', 'fast_learner']);
  S('tomekin_arcanist tomekin_scholar', ['fast_learner', 'medicine']);
  // Route 9, Skyport
  S('orbmog_oracle orbmog_seer', ['time_lag', 'hex']);
  S('callmog_caller callmog_summoner callmog_evoker', ['summon_bond', 'echo_voice']);
  S('kitemog_flier kitemog_skydiver', ['float', 'auto_haste']);
  S('astropom_space_cadet astropom_astronaut astropom_lunarian', ['float', 'lucky_star']);
  S('nimbopom_forecaster nimbopom_meteorologist', ['hex', 'float']);
  S('vaultkin_hurdler vaultkin_pole_vaulter', ['speed_plus', 'second_wind']);
  S('wyrmog_rider', ['menace', 'battle_ready']);
  // Route 10 to Ravenmoor
  S('halomog_cleric halomog_bishop', ['medicine', 'echo_voice']);
  S('petalmog_florist petalmog_maiden', ['spore_cloud', 'auto_regen']);
  S('wavekin_bodyboarder wavekin_surfer', ['auto_haste', 'second_wind']);
  S('bubblin_snorkeler bubblin_deep_diver', ['shell', 'night_vision']);
  S('salvepom_salve_maker salvepom_green_mage', ['medicine', 'antitoxin']);
  S('bogmog_witch bogmog_hag', ['hex', 'antitoxin']);
  S('batmog_stalker batmog_vampire', ['osmose', 'night_vision']);
  S('ouijapom_medium ouijapom_shaman', ['charmed_life', 'hex']);
  S('ghostmog_phantom ghostmog_specter', ['blur', 'charmed_life']);
  S('clockmog_clockmaker clockmog_chrono', ['unstoppable', 'time_lag']);
  // Route 12 to the Northern Crater: the rares
  S('galimog_werebeast galimog_galian', ['grit', 'adrenaline']);
  S('spookmog_necromancer', ['osmose', 'charmed_life']);
  S('mogmk_mk1 mogmk_mk2', ['heavy_armor', 'stand_firm']);
  S('leomog_gunbreaker', ['stand_firm', 'counter']);
  S('seramog_seraph', ['holy_aura', 'ribbon']);
  S('nethermog_netherseer', ['magic_eater', 'osmose']);
  // breeding-only lines
  S('spellmog_spellblade', ['magic_up', 'strength_plus']);
  S('mysticmog_mystic_knight', ['shell', 'magic_up']);
  S('drakemog_dragon_knight', ['float', 'heavy_armor']);
  S('shamog_beastcaller', ['summon_bond', 'menace']);
  S('maestromog_maestro', ['encore', 'time_lag']);
  S('slingmog_gunslinger', ['first_strike', 'marksman']);
  S('templamog_templar', ['devotion', 'stand_firm']);
  // the legends: one of their own
  S('jenomog_project_j', ['reunion']);
  S('ultimog_ultima', ['ultima_aura']);
  S('omegamog_omega', ['weapon_core']);
  S('bahamog_bahamut', ['dragon_king']);
  S('kupoking_king', ['royal_presence']);
})();
