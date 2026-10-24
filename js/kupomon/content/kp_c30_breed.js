// Kupomon expansion, pack 'breed' (docs/KUPOMON_CONTENT.md "Breeding recipes"): the breeding-only kinds of the Kupo
// Ranch and the recipe trees that make them (KP.BREED_RECIPES, matched in js/kupomon/kp_breed.js). 24 kinds:
//   rare (8):   Uhlan, Foebreaker, Magic Knight, Shikari, Time Battlemage, Psychic, Choco/Mog (-> Fat Chocobo)
//               bred from two wild lines whose jobs fuse into a known FF job (FF12's zodiac jobs, FF9's sword magic,
//               FFX-2's Psychic, FF7's Choco/Mog)
//   super (9):  Divine Knight, Bushi, Assassin, Deadeye, Prima Donna, Heaven Knight, Hell Knight, Black Chick
//               (-> Black Chocobo): a rare kind and a wild line (or an old breeding-only kind, or two rares)
//   ultra (7):  Holy Dragoon, Shogun, Alexander, Phoenix Down (-> Phoenix), Siren, Gold Chocobo: a super rare kind
//               and another special parent, with a need ({ plus }, { lv } or a held item)
// The old type-pair kinds (KP.BREED: Spellmog, Mysticmog, Drakemog, Shamog, Maestromog, Slingmog, Templamog) join the
// trees: species-pair recipes make each of them (tier 'rare'), and they are parents of the rarer kinds and of a few of
// the era lines' rare forms. A breeding-only parent is always named by its own (first-stage) species, so the Demo's
// planner (kp_runner.js R.kpParent) can breed it first; a wild parent is a line: (any stage) or a line's final stage.
// The first recipe of each kind uses the original wild lines (the surest to find). Our own words throughout.
(function () {
  const KP = FF7.kupomon;
  const J = (name, type, look) => ({ name, type, look });
  const S = (hp, atk, def, mag, res, spd) => ({ hp, atk, def, mag, res, spd });
  const RANCH = 'Bred at the Kupo Ranch';
  KP.content('breed', {
    // ------------------------------------------------------------------ jobs (one per kind; the evolved forms grander)
    jobs: {
      br_uhlan: J('Uhlan', 'dragoon', { hat: 'plumed', body: 'scale', weapon: 'lance', shield: 'kite', g1: '#3a7a4a', g2: '#e0d070' }),
      br_foebreaker: J('Foebreaker', 'warrior', { hat: 'ravagerhelm', body: 'furs', weapon: 'greataxe', g1: '#6a4a2a', g2: '#c0c0c8' }),
      br_magic_knight: J('Magic Knight', 'knight', { hat: 'sallet', body: 'armor', weapon: 'runesword', shield: 'kite', glow: '#ff8040', g1: '#a0a8b8', g2: '#3a4ab0' }),
      br_shikari: J('Shikari', 'thief', { hat: 'wolfears', body: 'leather', weapon: 'tanto', g1: '#3a4a2a', g2: '#c09050' }),
      br_time_battlemage: J('Time Battlemage', 'ranger', { hat: 'clockhat', body: 'longcoat', weapon: 'crossbow', g1: '#4a3a8a', g2: '#e0c060' }),
      br_psychic: J('Psychic', 'timemage', { hat: 'seer', body: 'cloak', weapon: 'orb', extra: ['wisps'], g1: '#6a2a8a', g2: '#ff80e0' }),
      br_choco_mog: J('Choco/Mog', 'freelancer', { hat: 'chococrest', body: 'ranchvest', weapon: 'feedpole', mount: { kind: 'chocobo', size: 0.55, rider: 0.78 }, g1: '#ffd040', g2: '#a06030' }),
      br_fat_chocobo: J('Fat Chocobo', 'beast', { hat: 'chocohelm', body: 'puffer', weapon: 'none', extra: ['featherwings'], mount: { kind: 'chocobo', fat: true }, g1: '#ffd040', g2: '#f0a020' }),
      br_divine_knight: J('Divine Knight', 'knight', { hat: 'paladin', body: 'plate', weapon: 'holysword', shield: 'tower', cape: '#f0f0ff', extra: ['halo'], glow: '#fff0a0', g1: '#e8e8f4', g2: '#d8b040' }),
      br_bushi: J('Bushi', 'warrior', { hat: 'kasa', body: 'hakama', weapon: 'katana', glow: '#a040ff', g1: '#2a2a3a', g2: '#a040c0' }),
      br_assassin: J('Assassin', 'thief', { hat: 'cowl', body: 'catsuit', weapon: 'longbow', cape: '#1a1a22', g1: '#1a1a22', g2: '#c02838' }),
      br_deadeye: J('Deadeye', 'machinist', { hat: 'stetson', body: 'trench', weapon: 'rifle', g1: '#5a4a3a', g2: '#d0a040' }),
      br_prima_donna: J('Prima Donna', 'bard', { hat: 'tiara', body: 'gown', weapon: 'bouquet', cape: '#e8e0f8', g1: '#f0f0f8', g2: '#d04060' }),
      br_heaven_knight: J('Heaven Knight', 'whitemage', { hat: 'skyseer', body: 'mantle', weapon: 'wand', cape: '#80b0f0', extra: ['halo'], g1: '#80b0f0', g2: '#f0f0ff' }),
      br_hell_knight: J('Hell Knight', 'blackmage', { hat: 'netherhood', body: 'cloak', weapon: 'skullstaff', extra: ['wisps'], g1: '#3a1a2a', g2: '#ff4040', shadowFace: true, eyes: '#ff6060' }),
      br_black_chick: J('Black Chick', 'beast', { hat: 'chococrest', body: 'patchfur', weapon: 'none', mount: { kind: 'chocobo', col: 'black', size: 0.55, rider: 0.78 }, g1: '#2a2a32', g2: '#6a6a80' }),
      br_black_chocobo: J('Black Chocobo', 'beast', { hat: 'chocohelm', body: 'featherarmor', weapon: 'lance', cape: '#1a1a22', extra: ['featherwings'], mount: { kind: 'chocobo', col: 'black' }, g1: '#1a1a22', g2: '#7080a0' }),
      br_holy_dragoon: J('Holy Dragoon', 'dragoon', { hat: 'dragonhelm', body: 'scale', weapon: 'spear', cape: '#f0f0ff', extra: ['dragonwings', 'halo'], g1: '#e8ecf8', g2: '#4a7ad0' }),
      br_shogun: J('Shogun', 'warrior', { hat: 'kabuto', body: 'darkplate', weapon: 'nodachi', cape: '#8a1a1a', glow: '#ff6060', g1: '#2a1a1a', g2: '#d8b040' }),
      br_alexander: J('Alexander', 'machinist', { hat: 'gearcrown', body: 'clockwork', weapon: 'holysword', shield: 'tower', cape: '#e8e8f0', extra: ['halo'], g1: '#d8d0b0', g2: '#4a6ab0' }),
      br_phoenix_down: J('Phoenix Down', 'whitemage', { hat: 'flamehood', body: 'emberrobe', weapon: 'candle', weaponAt: 'pom', g1: '#ffa040', g2: '#ffe080' }),
      br_phoenix: J('Phoenix', 'summoner', { hat: 'flamecrown', body: 'featherarmor', weapon: 'firebrand', cape: '#ff6020', extra: ['featherwings'], g1: '#ff5020', g2: '#ffd040' }),
      br_siren: J('Siren', 'bard', { hat: 'wavecrown', body: 'gown', weapon: 'harp', extra: ['fairy'], g1: '#2a8ab0', g2: '#e0f0ff' }),
      br_gold_chocobo: J('Gold Chocobo', 'beast', { hat: 'chococrest', body: 'featherarmor', weapon: 'flag', cape: '#f0c030', extra: ['featherwings', 'halo'], mount: { kind: 'chocobo', col: 'gold' }, g1: '#f0c030', g2: '#fff0a0' }),
    },

    // ------------------------------------------------------------------ signature moves (8; sig: one kind learns each)
    moves: {
      br_guard_crush: { name: 'Guard Crusher', type: 'warrior', power: 75, acc: 100, cd: 2, breakWalls: true, foe: { def: -1 }, flags: ['contact'], sig: true,
        desc: "Smashes through walls and guards; the foe's Defense falls." },
      br_sword_magic: { name: 'Sword Magic', type: 'knight', cat: 'physical', power: 80, acc: 100, cd: 1, useStat: 'mag', flags: ['contact', 'slice'], sig: true,
        desc: 'A spell laid along the blade: hits with its Magic, against Defense.' },
      br_holy_jump: { name: 'Holy Jump', type: 'dragoon', power: 100, acc: 100, cd: 2, charge: { text: 'leapt up into the light!', invuln: 'air' }, drain: 0.5, flags: ['contact'], sig: true,
        desc: 'Leaps into the light, out of reach, then dives: heals half of it.' },
      br_kage_iai: { name: 'Shadow Iai', type: 'warrior', power: 80, acc: 100, cd: 2, prio: 1, crit: 1, flags: ['contact', 'slice'], sig: true,
        desc: 'Draws from the shadows: strikes first, and likely to crit.' },
      br_divine_ruling: { name: 'Divine Ruling', type: 'machinist', cat: 'magic', power: 140, acc: 100, cd: 3, charge: { text: 'is passing judgment!' }, flags: ['pulse'], sig: true,
        desc: 'Weighs the verdict for a turn, then a pillar of holy light falls.' },
      br_phoenix_flame: { name: 'Phoenix Flame', type: 'summoner', power: 85, acc: 100, cd: 2, status: ['burn', 20], cureTeam: true, sig: true,
        desc: 'Wings of fire sear the foe (may Burn); the glow cures its own team.' },
      br_siren_song: { name: 'Siren Song', type: 'bard', power: 85, acc: 100, cd: 2, status: ['silence', 30], flags: ['sound'], sig: true,
        desc: 'A haunting song from the deep. May leave the foe Silenced.' },
      br_golden_dash: { name: 'Golden Dash', type: 'beast', power: 80, acc: 100, cd: 2, prio: 1, flags: ['contact'], sig: true,
        desc: 'Crosses any ground in a golden blur: it strikes first.' },
    },

    // ------------------------------------------------------------------ signature abilities (5)
    abilities: {
      br_warlord: { name: 'Warlord', desc: "Comes out commanding: its crits likelier, the foe's Speed down.", onEnterBoosts: { self: { crit: 1 }, foe: { spd: -1 } } },
      br_holy_fortress: { name: 'Holy Fortress', desc: 'Never takes crits; Summoner and Black Mage hits are halved.', noCrit: true, resist: { summoner: 0.5, blackmage: 0.5 } },
      br_rebirth: { name: 'Rebirth', desc: 'Rises from ashes: hangs on from full HP; heals 1/3 on leaving.', sturdy: true, regenerator: 1 / 3 },
      br_siren_voice: { name: 'Siren Voice', desc: 'Its sound moves are 1.3x, and it can never be Silenced.', flagBoost: { sound: 1.3 }, noStatus: ['silence'] },
      br_gold_feathers: { name: 'Gold Feathers', desc: 'Glides over all: Monk moves miss it; never Slowed or Stopped.', float: true, immune: ['monk'], noStatus: ['slow', 'stop'] },
    },

    // ------------------------------------------------------------------ the species (class 'breed', rarity 'none')
    species: {
      // ==== rare (~460-520): two wild lines' jobs, fused
      uhlamog_uhlan: {
        moogle: 'Uhlamog', job: 'br_uhlan', type: 'dragoon', type2: 'redmage', base: S(80, 100, 75, 85, 75, 85),   // 500: a lancer with a few spells
        rate: 45, exp: 200, curve: 'medium', fur: '#eef4ea', pom: '#40c070', nose: '#d04a4a', wing: '#3a8a5a',
        desc: "A lancer that took lessons from a green mage. Its spear hums with odd little spells that sap the foe's strength.",
        abilities: ['hex', 'wyvern_wings', 'dragon_spirit'],
        learn: '1 thrust, 1 en_garde, 5 jolt, 9 lancet, 13 mind_blast, 17 harpoon, 21 thrust, 24 dualcast, 27 dragon_fang, 30 miasma, 33 verstone, 36 jump, 40 zwerchhau, 44 high_jump, 48 talon',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      breakpom_foebreaker: {
        moogle: 'Breakpom', job: 'br_foebreaker', type: 'warrior', type2: 'knight', base: S(95, 120, 100, 40, 70, 55),   // 480: slow, heavy, all swing
        rate: 45, exp: 200, curve: 'medium', fur: '#f0e8dc', pom: '#e07030', nose: '#c04030', wing: '#8a5a3a',
        desc: "Born of a woodcutter's swing and a bouncer's shove. It breaks shields, guards and the occasional barn door.",
        abilities: ['expose', 'heavy_armor', 'short_fuse'],
        learn: '1 axe_chop, 1 warcry, 5 shield_bash, 9 power_break, 13 rend_armor, 17 axe_chop, 21 br_guard_crush, 25 full_break, 29 keen_edge, 33 aegis_slam, 37 bravery, 41 slash, 45 fell_cleave, 49 timber',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      steinmog_magic_knight: {
        moogle: 'Steinmog', job: 'br_magic_knight', type: 'knight', type2: 'blackmage', base: S(85, 85, 95, 100, 80, 60),   // 505: armor that casts
        rate: 45, exp: 200, curve: 'medium', fur: '#eef0f6', pom: '#4060e0', nose: '#d04050', wing: '#5a6a9a',
        desc: 'A stubborn knight and a shy black mage in one suit of armor. The knight does the swinging; the mage lights the blade.',
        abilities: ['spellcraft', 'last_bastion', 'mana_surge'],
        learn: '1 shield_bash, 1 fire, 5 cover, 9 blizzard, 13 keen_edge, 17 thunder, 21 br_sword_magic, 25 iron_wall, 29 scathe, 33 stasis_sword, 37 fira, 41 shield_bash, 45 saint_cross, 49 firaga',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      shikapom_shikari: {
        moogle: 'Shikapom', job: 'br_shikari', type: 'thief', type2: 'beast', base: S(70, 105, 65, 50, 60, 120),   // 470: quick and frail
        rate: 45, exp: 200, curve: 'medium', fur: '#ece4d4', pom: '#a07030', nose: '#c04a3a', wing: '#5a4a2a',
        desc: 'A pickpocket raised by beast-tamers. It tracks big game for days, then pinches the bounty right off the board.',
        abilities: ['sneak_attack', 'apex_predator', 'light_armor'],
        learn: '1 kunai, 1 trip, 5 bite, 9 smoke, 13 paw_swat, 17 kunai, 21 coup_de_grace, 25 makibishi, 29 bite, 33 nimble_pounce, 37 shuriken, 41 prowl, 45 wildcat_swipes, 49 grand_heist',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      chronobow_time_battlemage: {
        moogle: 'Chronobow', job: 'br_time_battlemage', type: 'ranger', type2: 'timemage', base: S(75, 90, 70, 90, 75, 95),   // 495: bolts and clocks
        rate: 45, exp: 200, curve: 'medium', fur: '#f0ecf8', pom: '#8a60e0', nose: '#d04a6a', wing: '#5a4aa0',
        desc: "An archer that borrowed a time mage's pocket watch. Its bolts tend to land a moment before it fires them.",
        abilities: ['quickcast', 'marksman', 'time_lag'],
        learn: '1 arrow, 1 slow, 5 tick_tock, 9 hunters_mark, 13 snap_shot, 17 gravity, 21 twin_arrow, 25 haste, 29 arrow, 33 cold_front, 37 sharpshot, 41 second_hand, 45 comet, 49 apex_arrow',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      psykupo_psychic: {
        moogle: 'Psykupo', job: 'br_psychic', type: 'timemage', type2: 'summoner', base: S(70, 45, 70, 115, 100, 95),   // 495: all mind, no muscle
        rate: 45, exp: 200, curve: 'medium', fur: '#f6eef8', pom: '#ff60d0', nose: '#d04a8a', wing: '#8a3ab0',
        desc: 'Child of a seer and a spirit medium. It bends spoons, gravity and the odd battle line with a little frown.',
        abilities: ['libra', 'time_lag', 'mental_break'],
        learn: '1 tick_tock, 1 haunt, 5 slow, 9 gravity, 13 spook, 17 tick_tock, 21 demi_spell, 25 ectoplasm, 29 haunt, 33 premonition, 37 starlight, 41 rewind_time, 45 graviga, 49 meteor',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      // (a two-stage line: the bred Choco/Mog grows into a Fat Chocobo)
      saddlepom_choco_mog: {
        moogle: 'Saddlepom', job: 'br_choco_mog', type: 'freelancer', type2: 'beast', base: S(70, 70, 60, 40, 50, 75),   // 365
        rate: 45, exp: 70, curve: 'medium', fur: '#fff8ec', pom: '#ffd030', nose: '#e05a3a', wing: '#e0a020',
        evo: { at: 30, to: 'saddlepom_fat_chocobo' },
        desc: 'A moogle riding a chocobo chick, both grinning. Bred from a chocobo line and a freelancer, it hops in kweh-first.',
        abilities: ['kupo_luck', 'thick_wool', 'pom_fluff'],
        learn: '1 pom_bop, 1 choco_kick, 4 pout, 8 wing_flutter, 12 kupo_toss, 16 chocobo_rush, 20 snack_break, 24 choco_kick, 28 kupo_charge',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      saddlepom_fat_chocobo: {
        moogle: 'Saddlepom', job: 'br_fat_chocobo', type: 'beast', type2: 'monk', base: S(130, 105, 105, 45, 80, 40),   // 505: a feathered hill
        rate: 45, exp: 200, curve: 'medium', fur: '#fff8ec', pom: '#ffd030', nose: '#e05a3a', wing: '#e0a020',
        desc: 'The chick grew up, and up, and out. Its moogle now rides a feathered hill that ends most fights by sitting on them.',
        abilities: ['kupo_luck', 'thick_wool', 'pom_fluff'],
        learn: '30 belly_bump, 33 wool, 36 choco_kick, 40 shiko, 44 choco_meteor, 48 tsuppari',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },

      // ==== super rare (~520-560): a rare kind and a wild line, an old breeding-only kind, or a second rare
      divinkin_divine_knight: {
        moogle: 'Divinkin', job: 'br_divine_knight', type: 'knight', type2: 'whitemage', base: S(100, 115, 115, 70, 95, 45),   // 540: a holy wall
        rate: 30, exp: 225, curve: 'slow', fur: '#fbfaf6', pom: '#ffe070', nose: '#e06060', wing: '#d8d0f0',
        desc: 'A Foebreaker that took holy orders. Its blade blesses its friends and shatters the shields of everyone else.',
        abilities: ['devotion', 'stand_firm', 'sanctify'],
        learn: '1 shield_bash, 1 cure, 5 holy_mace, 9 cover, 13 keen_edge, 17 valiant, 21 sheltron, 25 shield_bash, 29 cleansing_strike, 33 sentinel, 37 keen_edge, 41 divine_veil, 45 saint_cross, 49 holy_mace',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      bushimog_bushi: {
        moogle: 'Bushimog', job: 'br_bushi', type: 'warrior', type2: 'blackmage', base: S(80, 120, 80, 100, 70, 90),   // 540: blade and spell
        rate: 30, exp: 225, curve: 'slow', fur: '#eee8ee', pom: '#a040e0', nose: '#c03a6a', wing: '#4a2a5a',
        desc: "A Magic Knight raised among samurai. It writes black spells along its katana's edge, then cuts with them.",
        abilities: ['iaijutsu', 'mana_surge', 'last_stand'],
        learn: '1 slash, 1 fire, 5 focus, 9 bokken, 13 blizzard, 17 iai, 21 thunder, 25 slash, 29 crescent, 33 darkness, 37 cross_slash, 41 scathe, 45 zantetsu, 49 flare',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      kagepom_assassin: {
        moogle: 'Kagepom', job: 'br_assassin', type: 'thief', type2: 'ranger', base: S(70, 125, 70, 55, 65, 140),   // 525: first and last
        rate: 30, exp: 225, curve: 'slow', fur: '#e4e0e8', pom: '#c02838', nose: '#a03040', wing: '#2a2a3a',
        desc: 'A Shikari that trained with ninja and battlemages. It strikes once, from very far away, and is gone by the echo.',
        abilities: ['sneak_attack', 'scorpion_tail', 'lie_in_wait'],
        learn: '1 kunai, 1 smoke, 5 arrow, 9 backstab, 13 quickhit, 17 shadowbind, 21 viper_fang, 25 kunai, 29 tranq_dart, 33 sharpshot, 37 snap_shot, 41 coup_de_grace, 45 headshot, 49 throw',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      triggermog_deadeye: {
        moogle: 'Triggermog', job: 'br_deadeye', type: 'machinist', type2: 'ranger', base: S(75, 125, 75, 80, 70, 105),   // 530: never misses
        rate: 30, exp: 225, curve: 'slow', fur: '#f0e8dc', pom: '#e0a030', nose: '#c04a3a', wing: '#6a5a3a',
        desc: 'A Time Battlemage gave it patience; a gunslinger gave it the gun. It has never once missed a can on a fence.',
        abilities: ['deadeye', 'gun_mastery', 'rapid_fire'],
        learn: '1 rivet_gun, 1 aim, 5 big_shot, 9 snap_shot, 13 leg_shot, 17 auto_crossbow, 21 eagle_eye, 25 rivet_gun, 29 twin_shot, 33 air_anchor, 37 snap_shot, 41 buckshot, 45 kupo_missile, 49 headshot',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      mariapom_prima_donna: {
        moogle: 'Mariapom', job: 'br_prima_donna', type: 'bard', type2: 'redmage', base: S(85, 60, 75, 120, 100, 95),   // 535: a voice like a spell
        rate: 30, exp: 225, curve: 'slow', fur: '#fff6fa', pom: '#ff5a8a', nose: '#e05070', wing: '#e0c0e0',
        desc: 'A Magic Knight who stood in for a diva on opening night and never went back to the barracks. Encore, encore!',
        abilities: ['encore', 'runic', 'kupo_punk'],
        learn: '1 sonic_chord, 1 en_garde, 5 jolt, 9 lullaby, 13 hymn, 17 high_note, 21 dualcast, 25 sonic_chord, 29 moonlit_waltz, 33 verthunder, 37 hymn, 41 aria, 45 verflare, 49 love_sonata',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      celestimog_heaven_knight: {
        moogle: 'Celestimog', job: 'br_heaven_knight', type: 'whitemage', type2: 'summoner', base: S(90, 60, 85, 120, 115, 75),   // 545: holy caster
        rate: 30, exp: 225, curve: 'slow', fur: '#f8fbff', pom: '#80c0ff', nose: '#e06080', wing: '#c0d8ff',
        desc: "A Psychic touched by a skyseer's light. It reads fates in the clouds, and calls the judgment down on them.",
        abilities: ['lightbringer', 'holy_aura', 'light_crystal'],
        learn: '1 banish, 1 cure, 5 leaf_gust, 9 flash, 13 holy_glare, 17 searing_light, 21 regen_spell, 25 banish, 29 judgment_bolt, 33 dawn_prayer, 37 holy_glare, 41 temperance, 45 holy, 49 judgment',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      hellkupo_hell_knight: {
        moogle: 'Hellkupo', job: 'br_hell_knight', type: 'blackmage', type2: 'summoner', base: S(85, 65, 75, 130, 85, 100),   // 540: curses, fast
        rate: 30, exp: 225, curve: 'slow', fur: '#ece4e8', pom: '#ff3a3a', nose: '#b02a3a', wing: '#5a1a2a',
        desc: "The Heaven Knight's twin, raised by a netherseer. It reads the very same fates, upside down, and curses them.",
        abilities: ['shadowbringer', 'hex', 'dark_crystal'],
        learn: '1 fire, 1 haunt, 5 bio, 9 spook, 13 scathe, 17 hellfire, 21 envenom, 25 haunt, 29 darkness, 33 nightfall, 37 scathe, 41 voodoo_doll, 45 calamity, 49 flare',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      // (a two-stage line: the bred Black Chick grows into a Black Chocobo)
      kurokweh_black_chick: {
        moogle: 'Kurokweh', job: 'br_black_chick', type: 'beast', type2: 'dragoon', base: S(65, 85, 55, 40, 50, 95),   // 390
        rate: 30, exp: 75, curve: 'slow', fur: '#e8e8f0', pom: '#3a3a4a', nose: '#c04a5a', wing: '#2a2a3a',
        evo: { at: 30, to: 'kurokweh_black_chocobo' },
        desc: 'Bred from a Choco/Mog and a chocobo of the skies. Its black down is still fluff, but it already wants to fly.',
        abilities: ['wyvern_wings', 'warding_fur', 'pom_wings'],
        learn: '1 choco_kick, 1 tailwind, 4 talon, 8 roar, 12 hurdle, 16 dive_bomb, 20 choco_kick, 24 wing_flutter, 28 chocobo_rush',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      kurokweh_black_chocobo: {
        moogle: 'Kurokweh', job: 'br_black_chocobo', type: 'beast', type2: 'dragoon', base: S(90, 125, 80, 55, 75, 125),   // 550: river, mountain, sky
        rate: 30, exp: 225, curve: 'slow', fur: '#e8e8f0', pom: '#3a3a4a', nose: '#c04a5a', wing: '#2a2a3a',
        desc: 'It took wing at last: a black chocobo with a moogle at the reins, crossing rivers, mountains and fences alike.',
        abilities: ['wyvern_wings', 'warding_fur', 'pom_wings'],
        learn: '30 soul_jump, 33 talon, 36 wyrm_dance, 40 stampede, 44 choco_kick, 48 stardiver',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },

      // ==== ultra rare (~560-600): a super rare kind and another special parent, with a need
      dawnlance_holy_dragoon: {
        moogle: 'Dawnlance', job: 'br_holy_dragoon', type: 'dragoon', type2: 'whitemage', base: S(95, 135, 95, 85, 95, 85),   // 590
        rate: 15, exp: 260, curve: 'slow', fur: '#f8f8ff', pom: '#60a0ff', nose: '#e05a6a', wing: '#e0e8ff',
        desc: 'A Divine Knight and a lancer of the old lines, joined. A dragoon that left its dark days behind and leaps into light.',
        abilities: ['wyvern_wings', 'devotion', 'dragonsong'],
        learn: '1 thrust, 1 cure, 5 talon, 9 lancet, 13 holy_mace, 17 jump, 21 thrust, 25 wyrm_dance, 29 dragon_fang, 33 talon, 37 br_holy_jump, 41 thrust, 45 holy_mace, 49 high_jump',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      shogunpom_shogun: {
        moogle: 'Shogunpom', job: 'br_shogun', type: 'warrior', type2: 'thief', base: S(90, 140, 85, 60, 80, 125),   // 580
        rate: 15, exp: 260, curve: 'slow', fur: '#f2ece8', pom: '#d02020', nose: '#b02a2a', wing: '#3a1a1a',
        desc: 'When a Bushi and an Assassin swear the same oath, a Shogun is born. It leads with the sword and from the shadows.',
        abilities: ['br_warlord', 'iaijutsu', 'duel_stance'],
        learn: '1 slash, 1 kunai, 5 bokken, 9 smoke, 13 iai, 17 quickhit, 21 slash, 25 bunshin, 29 crescent, 33 kunai, 37 br_kage_iai, 41 katon, 45 slash, 49 zantetsu',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      alexamog_alexander: {
        moogle: 'Alexamog', job: 'br_alexander', type: 'machinist', type2: 'whitemage', base: S(110, 70, 135, 125, 120, 30),   // 590: a slow fortress
        rate: 15, exp: 260, curve: 'slow', fur: '#f4f2ea', pom: '#e0c040', nose: '#d05050', wing: '#a0b0d0',
        desc: "A Deadeye's aim built into a holy fortress. Its great gears turn to pass judgment, slowly and very, very finally.",
        abilities: ['br_holy_fortress', 'auto_wall', 'lightbringer'],
        learn: '1 tracer_beam, 1 protect, 5 holy_glare, 9 oil_change, 13 shrink_ray, 17 dia, 21 tracer_beam, 25 temperance, 29 banishga, 33 holy_glare, 37 judgment, 41 br_divine_ruling, 45 tracer_beam, 49 holy',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      // (a two-stage line: the bred Phoenix Down bursts into flame and rises a Phoenix)
      phoenimog_phoenix_down: {
        moogle: 'Phoenimog', job: 'br_phoenix_down', type: 'whitemage', type2: 'summoner', base: S(60, 40, 55, 85, 75, 75),   // 390
        rate: 15, exp: 80, curve: 'slow', fur: '#fff4e8', pom: '#ff6020', nose: '#e04a2a', wing: '#ff9040',
        evo: { at: 32, to: 'phoenimog_phoenix' },
        desc: 'Heaven and Hell Knights met at the ranch, and this fluffy fledgling hatched. It is always warm to the touch.',
        abilities: ['br_rebirth', 'ifrits_blood', 'healing_pom'],
        learn: '1 holy_glare, 1 cure, 4 fire, 8 pearl_volley, 12 searing_light, 16 regen_spell, 20 holy_glare, 24 hellfire, 28 flambe',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      phoenimog_phoenix: {
        moogle: 'Phoenimog', job: 'br_phoenix', type: 'summoner', type2: 'whitemage', base: S(100, 70, 85, 130, 110, 100),   // 595
        rate: 15, exp: 260, curve: 'slow', fur: '#fff4e8', pom: '#ff6020', nose: '#e04a2a', wing: '#ff9040',
        desc: 'The fledgling burst into flame and rose again: a firebird moogle that lifts fallen friends back onto their feet.',
        abilities: ['br_rebirth', 'ifrits_blood', 'healing_pom'],
        learn: '32 br_phoenix_flame, 35 hot_coal, 38 sylph_breeze, 41 holy_glare, 45 megaflare, 49 judgment_bolt',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      sirenkupo_siren: {
        moogle: 'Sirenkupo', job: 'br_siren', type: 'bard', type2: 'summoner', base: S(90, 55, 80, 135, 105, 115),   // 580
        rate: 15, exp: 260, curve: 'slow', fur: '#eef8fc', pom: '#40c0e0', nose: '#d0607a', wing: '#60a0c0',
        desc: "A Prima Donna's voice with a Psychic's pull. Sailors and battle lines alike forget what they were doing.",
        abilities: ['br_siren_voice', 'summon_bond', 'charm'],
        learn: '1 sonic_chord, 1 lullaby, 5 drizzle, 9 nocturne, 13 hymn, 17 high_note, 21 drizzle, 25 tempt, 29 br_siren_song, 33 sonic_chord, 37 tidal_wave, 41 moonlit_waltz, 45 hymn, 49 aria',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
      goldkweh_gold_chocobo: {
        moogle: 'Goldkweh', job: 'br_gold_chocobo', type: 'beast', type2: 'freelancer', base: S(105, 120, 90, 60, 85, 130),   // 590
        rate: 15, exp: 260, curve: 'slow', fur: '#fffaf0', pom: '#ffc020', nose: '#e06a3a', wing: '#f0c030',
        desc: "Every rancher's dream: a gold chocobo, bred of a black one and a Choco/Mog. Nothing on the map can slow it down.",
        abilities: ['br_gold_feathers', 'auto_haste', 'kupo_luck'],
        learn: '1 choco_kick, 1 yell, 5 pom_bop, 9 roar, 13 chocobo_rush, 17 errand_run, 21 choco_kick, 25 br_golden_dash, 29 mog_rush, 33 pom_bop, 37 stampede, 41 choco_kick, 45 choco_meteor, 49 kupo_rush',
        habitat: 'town', rarity: 'none', class: 'breed', found: RANCH,
      },
    },

    // ------------------------------------------------------------------ the recipes (kp_breed.js KP.breedResult). A side
    // is a species id (4), line:<species> (any stage, 2) or a type (1); the most exact pair wins, the rarer first.
    // rare: sure (left out); super: 0.5; ultra: 0.25 (the ranch's luck doubles, triples... after each miss)
    breed: [
      // ==== RARE: two wild lines
      // Uhlan: a Dragoon line x a Red / Green Mage line (Lancemog, Hornpom, Liltimog x Salvepom, Redpom, Plumemog)
      { a: 'line:lancemog_lancer', b: 'line:salvepom_salve_maker', child: 'uhlamog_uhlan', tier: 'rare', hint: "A lancer and a green-fingered mage? There's a spear in that egg that knows a spell or two, kupo!" },
      { a: 'line:hornpom_ronso_cub', b: 'line:redpom_red_mage', child: 'uhlamog_uhlan', tier: 'rare', hint: "A Ronso lance and a red mage's flourish... I see a spear with spells on it, kupo!" },
      { a: 'line:liltimog_lilty_page', b: 'line:plumemog_red_mage', child: 'uhlamog_uhlan', tier: 'rare', hint: 'Spear and feathered cap! That one will lunge and cast at once, kupo.' },
      // Foebreaker: a Warrior line x a Knight line (Chopkin, Anvilmog, Mogwolf x Brawnpom, Shellmog, Riotmog)
      { a: 'line:chopkin_woodcutter', b: 'line:brawnpom_bouncer', child: 'breakpom_foebreaker', tier: 'rare', hint: "Axe and shove together... that egg's gonna break things, kupo. Mind the barn door!" },
      { a: 'line:anvilmog_blacksmith', b: 'line:shellmog_guardian', child: 'breakpom_foebreaker', tier: 'rare', hint: "A smith's hammer and a guardian's shell? Something that cracks armor, kupo!" },
      { a: 'line:mogwolf_marauder', b: 'line:riotmog_shinra_mp', child: 'breakpom_foebreaker', tier: 'rare', hint: 'A marauder and a riot guard... nobody keeps a shield up near that one, kupo.' },
      // Magic Knight: a Knight line x a Black Mage line (Mogsquire, Moodon, Clavamog x Embermog, Moorock, Yukepom)
      { a: 'line:mogsquire_squire', b: 'line:embermog_sorcerer', child: 'steinmog_magic_knight', tier: 'rare', hint: 'A knight and a black mage, side by side? Feels like a sword that casts, kupo!' },
      { a: 'line:moodon_recruit', b: 'line:moorock_doll', child: 'steinmog_magic_knight', tier: 'rare', hint: 'A Pluto knight and a little black mage... those two always did fight well together, kupo!' },
      { a: 'line:clavamog_tipa_guard', b: 'line:yukepom_yuke_pupil', child: 'steinmog_magic_knight', tier: 'rare', hint: 'A Clavat shield and a Yuke spell! Sword magic for certain, kupo.' },
      // Shikari: a Thief line x a Beast line (Nutmog, Fangmog, Kurogen x Mossmog, Leashpom, Enkimog)
      { a: 'line:nutmog_thief', b: 'line:mossmog_geomancer', child: 'shikapom_shikari', tier: 'rare', hint: "A thief and a beast-tamer... that young'un will hunt anything that moves, kupo!" },
      { a: 'line:fangmog_novice', b: 'line:leashpom_trainer', child: 'shikapom_shikari', tier: 'rare', hint: 'Twin fangs and a trainer\'s whistle! A hunter of big game, kupo.' },
      { a: 'line:kurogen_genin', b: 'line:enkimog_hound', child: 'shikapom_shikari', tier: 'rare', hint: 'A genin and a hound on the trail together... a fine little hunter, kupo!' },
      // Time Battlemage: a Ranger line x a Time Mage line (Fletchmog, Windikin, Flintkin x Tickmog, Tallypom, Nimbopom)
      { a: 'line:fletchmog_archer', b: 'line:tickmog_time_mage', child: 'chronobow_time_battlemage', tier: 'rare', hint: "Bow and clock, kupo! That one'll shoot yesterday's arrows today." },
      { a: 'line:windikin_scout', b: 'line:tallypom_chronist', child: 'chronobow_time_battlemage', tier: 'rare', hint: 'A scout and a chronist... it will know where you stand before you do, kupo!' },
      { a: 'line:flintkin_fusilier', b: 'line:nimbopom_forecaster', child: 'chronobow_time_battlemage', tier: 'rare', hint: 'A musket and a forecast! Bolts right on time, rain or shine, kupo.' },
      // Psychic: a Time Mage (seer) line x a Summoner (medium) line (Orbmog, Omenpom, Twinklin x Ouijapom, Bellboo, Ghostmog)
      { a: 'line:orbmog_oracle', b: 'line:ouijapom_medium', child: 'psykupo_psychic', tier: 'rare', hint: 'A seer and a medium! My spoons are bendin\' already, kupo...' },
      { a: 'line:omenpom_augur', b: 'line:bellboo_bellhop', child: 'psykupo_psychic', tier: 'rare', hint: 'An augur and a ghost-hotel bellhop? That egg knows what I\'m thinkin\', kupo!' },
      { a: 'line:twinklin_stargazer', b: 'line:ghostmog_phantom', child: 'psykupo_psychic', tier: 'rare', hint: 'Stars and spirits together... a little mind-reader for sure, kupo.' },
      // Choco/Mog: a chocobo line x a Freelancer (moogle) line (Chocomog, Kwehpom, Derbymog x Tufty, Pipkin, Mogki);
      // it grows into a Fat Chocobo at Lv 30 (breed it as a Choco/Mog)
      { a: 'line:chocomog_rider', b: 'line:tufty_freelancer', child: 'saddlepom_choco_mog', tier: 'rare', hint: 'A chocobo and a moogle? Kweh-kupo! I know just what\'s comin\'!' },
      { a: 'line:kwehpom_groom', b: 'line:pipkin_freelancer', child: 'saddlepom_choco_mog', tier: 'rare', hint: 'A groom and a freelancer... somebody\'s gettin\' a ride, kupo!' },
      { a: 'line:derbymog_jockey', b: 'line:mogki_carrier', child: 'saddlepom_choco_mog', tier: 'rare', hint: 'A jockey and a Mognet courier! Express delivery by chocobo, kupo.' },

      // ==== SUPER RARE: a rare kind and a second parent
      // Divine Knight: wild Chopkin x Brawnpom -> Foebreaker; Foebreaker x Halomog / Templamog / Elvamog line
      { a: 'breakpom_foebreaker', b: 'line:halomog_cleric', child: 'divinkin_divine_knight', chance: 0.5, tier: 'super', hint: "That breaker's got a holy streak with this partner, kupo... could be somethin' divine!" },
      { a: 'breakpom_foebreaker', b: 'templamog_templar', child: 'divinkin_divine_knight', chance: 0.5, tier: 'super', hint: 'A breaker and a templar... I hear church bells and cracking shields, kupo!' },
      { a: 'breakpom_foebreaker', b: 'line:elvamog_royal_page', child: 'divinkin_divine_knight', chance: 0.5, tier: 'super', hint: 'Royal blessings on a breaker\'s hammer? Somethin\' divine, mebbe, kupo!' },
      // Bushi: wild Mogsquire x Embermog -> Magic Knight; Magic Knight x Kenkupo line / Spellmog / Tsubamog line
      { a: 'steinmog_magic_knight', b: 'line:kenkupo_wanderer', child: 'bushimog_bushi', chance: 0.5, tier: 'super', hint: "Sword magic and a samurai's edge... I smell black spells on a katana, kupo!" },
      { a: 'steinmog_magic_knight', b: 'spellmog_spellblade', child: 'bushimog_bushi', chance: 0.5, tier: 'super', hint: 'Two spell-swords in one nest! One of these eggs might come out wearin\' a hakama, kupo.' },
      { a: 'steinmog_magic_knight', b: 'line:tsubamog_ronin', child: 'bushimog_bushi', chance: 0.5, tier: 'super', hint: 'A ronin\'s quiet and a knight\'s spells... a bushi could be in there, kupo!' },
      // Assassin: wild Nutmog x Mossmog -> Shikari (and Fletchmog x Tickmog -> Time Battlemage); Shikari x Kurogen line /
      // Time Battlemage / Mudrakin line
      { a: 'shikapom_shikari', b: 'line:kurogen_genin', child: 'kagepom_assassin', chance: 0.5, tier: 'super', hint: "Hush now... that pair's got a shadow in it. Somethin' that strikes from far off, kupo." },
      { a: 'shikapom_shikari', b: 'chronobow_time_battlemage', child: 'kagepom_assassin', chance: 0.5, tier: 'super', hint: 'A hunter and a bolt that lands early... that\'s a long, quiet shot, kupo.' },
      { a: 'shikapom_shikari', b: 'line:mudrakin_rogue', child: 'kagepom_assassin', chance: 0.5, tier: 'super', hint: 'A hunter and a Doman ninja... I didn\'t even see that egg get laid, kupo!' },
      // Deadeye: wild Fletchmog x Tickmog -> Time Battlemage; Time Battlemage x Gunmog line / Slingmog / Promptopom line
      { a: 'chronobow_time_battlemage', b: 'line:gunmog_gunner', child: 'triggermog_deadeye', chance: 0.5, tier: 'super', hint: "Steady hands, the both of 'em. Might be an egg that never misses, kupo!" },
      { a: 'chronobow_time_battlemage', b: 'slingmog_gunslinger', child: 'triggermog_deadeye', chance: 0.5, tier: 'super', hint: 'A battlemage\'s patience and a gunslinger\'s draw... bullseye, kupo!' },
      { a: 'chronobow_time_battlemage', b: 'line:promptopom_shutterbug', child: 'triggermog_deadeye', chance: 0.5, tier: 'super', hint: 'One times its shots, one frames them... a sharpshooter\'s egg, kupo!' },
      // Prima Donna: wild Mogsquire x Embermog -> Magic Knight; Magic Knight x Kupera line / Maestromog / Operapom line
      { a: 'steinmog_magic_knight', b: 'line:kupera_chorister', child: 'mariapom_prima_donna', chance: 0.5, tier: 'super', hint: 'Oh! Is that an aria I hear from the nest? A star of the opera, maybe, kupo!' },
      { a: 'steinmog_magic_knight', b: 'maestromog_maestro', child: 'mariapom_prima_donna', chance: 0.5, tier: 'super', hint: 'A knight and a maestro... somebody\'s gettin\' the lead role tonight, kupo!' },
      { a: 'steinmog_magic_knight', b: 'line:operapom_understudy', child: 'mariapom_prima_donna', chance: 0.5, tier: 'super', hint: 'The understudy and the knight... curtain up, kupo! The opera\'s on!' },
      // Heaven Knight: wild Orbmog x Ouijapom -> Psychic; Psychic x Twinklin line (Skyseer) / Lumimog line / Seramog
      { a: 'psykupo_psychic', b: 'line:twinklin_stargazer', child: 'celestimog_heaven_knight', chance: 0.5, tier: 'super', hint: "Clouds part over that pairing, kupo. Somethin' heavenly might hatch!" },
      { a: 'psykupo_psychic', b: 'line:lumimog_lamplighter', child: 'celestimog_heaven_knight', chance: 0.5, tier: 'super', hint: 'A mind-reader and a beacon... that egg\'s glowin\' from inside, kupo!' },
      { a: 'psykupo_psychic', b: 'seramog_seraph', child: 'celestimog_heaven_knight', chance: 0.5, tier: 'super', hint: 'A Psychic and a seraph? I see a halo forming over the straw, kupo!' },
      // Hell Knight: wild Orbmog x Ouijapom -> Psychic; Psychic x Nethermog / Sootkin line / Pyremog line
      { a: 'psykupo_psychic', b: 'nethermog_netherseer', child: 'hellkupo_hell_knight', chance: 0.5, tier: 'super', hint: "Brr... that pair gives me a chill, kupo. Somethin' from the nether, mebbe." },
      { a: 'psykupo_psychic', b: 'line:sootkin_stoker', child: 'hellkupo_hell_knight', chance: 0.5, tier: 'super', hint: 'A Psychic by a stoker\'s fire... that egg\'s hot and grumpy, kupo!' },
      { a: 'psykupo_psychic', b: 'line:pyremog_pyrefly', child: 'hellkupo_hell_knight', chance: 0.5, tier: 'super', hint: 'Pyreflies and a psychic... somethin\' from the far side wants to hatch, kupo.' },
      // Black Chick: wild Chocomog x Tufty -> Choco/Mog; Choco/Mog x Chocomog line / Kitemog line / Shamog (it grows
      // into a Black Chocobo at Lv 30)
      { a: 'saddlepom_choco_mog', b: 'line:chocomog_rider', child: 'kurokweh_black_chick', chance: 0.5, tier: 'super', hint: "Chocobo blood on both sides... I can almost hear black feathers, kupo!" },
      { a: 'saddlepom_choco_mog', b: 'line:kitemog_flier', child: 'kurokweh_black_chick', chance: 0.5, tier: 'super', hint: 'A Choco/Mog and a sky-diver? That chick might just fly, kupo!' },
      { a: 'saddlepom_choco_mog', b: 'shamog_beastcaller', child: 'kurokweh_black_chick', chance: 0.5, tier: 'super', hint: 'The beastcaller\'s whistling for a dark-feathered friend, kupo...' },

      // ==== ULTRA RARE: a super rare kind and another special parent, and a need
      // Holy Dragoon: Chopkin x Brawnpom -> Foebreaker -> (x Halomog) Divine Knight; Lancemog x Salvepom -> Uhlan (or
      // Wyverkin + Shellmog -> Drakemog); Divine Knight x Uhlan (both +2) / x Drakemog (holding a Sapphire)
      { a: 'divinkin_divine_knight', b: 'uhlamog_uhlan', child: 'dawnlance_holy_dragoon', chance: 0.25, tier: 'ultra', needs: { plus: 2 }, hint: "Light and the lance, kupo... if they're strong enough, a holy dragoon might rise!" },
      { a: 'divinkin_divine_knight', b: 'drakemog_dragon_knight', child: 'dawnlance_holy_dragoon', chance: 0.25, tier: 'ultra', needs: { item: 'sapphire' }, hint: 'A dragon knight kneels to a divine one... a dragon\'s gem would seal it, kupo!' },
      // Shogun: Mogsquire x Embermog -> Magic Knight -> (x Kenkupo) Bushi; Nutmog x Mossmog -> Shikari -> (x Kurogen)
      // Assassin; Bushi x Assassin (both Lv 40) / Assassin x Spellmog (holding a Mythril Whetstone)
      { a: 'bushimog_bushi', b: 'kagepom_assassin', child: 'shogunpom_shogun', chance: 0.25, tier: 'ultra', needs: { lv: 40 }, hint: 'A bushi and an assassin! Seasoned ones could raise a shogun, kupo!' },
      { a: 'kagepom_assassin', b: 'spellmog_spellblade', child: 'shogunpom_shogun', chance: 0.25, tier: 'ultra', needs: { item: 'mythril_whetstone' }, hint: 'Shadow and spellblade... a well-honed edge would make a lord of it, kupo!' },
      // Alexander: Fletchmog x Tickmog -> Time Battlemage -> (x Gunmog) Deadeye; Chopkin x Brawnpom -> Foebreaker ->
      // Divine Knight; Deadeye x Divine Knight (holding an Aegis Shield) / Deadeye x Templamog (both +3)
      { a: 'triggermog_deadeye', b: 'divinkin_divine_knight', child: 'alexamog_alexander', chance: 0.25, tier: 'ultra', needs: { item: 'aegis_shield' }, hint: "Gears and holy light... somethin' like a fortress is ticking in there, kupo!" },
      { a: 'triggermog_deadeye', b: 'templamog_templar', child: 'alexamog_alexander', chance: 0.25, tier: 'ultra', needs: { plus: 3 }, hint: 'A deadeye\'s aim in a templar\'s keeping... a holy machine, if they\'re strong, kupo!' },
      // Phoenix Down (-> Phoenix at Lv 32): Orbmog x Ouijapom -> Psychic -> Heaven Knight (x Twinklin) and Hell Knight
      // (x Nethermog); Heaven Knight x Hell Knight (holding a Phoenix Pinion) / Heaven Knight x Shamog (both +3)
      { a: 'celestimog_heaven_knight', b: 'hellkupo_hell_knight', child: 'phoenimog_phoenix_down', chance: 0.25, tier: 'ultra', needs: { item: 'phoenix_pinion' }, hint: "Heaven and hell, together? There's fire and life in that egg, kupo... careful now!" },
      { a: 'celestimog_heaven_knight', b: 'shamog_beastcaller', child: 'phoenimog_phoenix_down', chance: 0.25, tier: 'ultra', needs: { plus: 3 }, hint: 'The beastcaller\'s callin\' a firebird down from heaven, kupo!' },
      // Siren: Mogsquire x Embermog -> Magic Knight -> (x Kupera) Prima Donna; Orbmog x Ouijapom -> Psychic; Prima
      // Donna x Psychic (holding Siren's Drops) / Prima Donna x Maestromog (both +2)
      { a: 'mariapom_prima_donna', b: 'psykupo_psychic', child: 'sirenkupo_siren', chance: 0.25, tier: 'ultra', needs: { item: 'sirens_drops' }, hint: "That voice... and that pull... somethin' from the deep is singin' to me, kupo!" },
      { a: 'mariapom_prima_donna', b: 'maestromog_maestro', child: 'sirenkupo_siren', chance: 0.25, tier: 'ultra', needs: { plus: 2 }, hint: 'A diva and her maestro... the sea itself is listenin\', kupo!' },
      // Gold Chocobo: Chocomog x Tufty -> Choco/Mog -> (x Chocomog) Black Chick; Black Chick x Choco/Mog (holding a Choco
      // Feather) / Black Chick x Shamog (both +3)
      { a: 'kurokweh_black_chick', b: 'saddlepom_choco_mog', child: 'goldkweh_gold_chocobo', chance: 0.25, tier: 'ultra', needs: { item: 'choco_feather' }, hint: "Black feathers and a moogle's grin... is that GOLD I see in the straw, kupo?!" },
      { a: 'kurokweh_black_chick', b: 'shamog_beastcaller', child: 'goldkweh_gold_chocobo', chance: 0.25, tier: 'ultra', needs: { plus: 3 }, hint: 'The beastcaller and a black chick... strong ones might call up gold, kupo!' },

      // ==== the old breeding-only kinds, by species pairs (each a final job of the original wild lines)
      { a: 'bustermog_first_class', b: 'voltkin_stormcaller', child: 'spellmog_spellblade', tier: 'rare', hint: 'A First Class and a stormcaller? Spells on a sword, kupo! A Spellblade for sure.' },
      { a: 'aegimog_holy_knight', b: 'prestopom_illusionist', child: 'mysticmog_mystic_knight', tier: 'rare', hint: "A holy shield and an illusionist's tricks... that's a Mystic Knight brewin', kupo!" },
      { a: 'wyverkin_dragonkin', b: 'shellmog_guardian', child: 'drakemog_dragon_knight', tier: 'rare', hint: "A wyvern's kin and a guardian, eh? A dragon knight's in that egg, kupo!" },
      { a: 'callmog_evoker', b: 'mossmog_beastmaster', child: 'shamog_beastcaller', tier: 'rare', hint: "An evoker and a beastmaster! The wee one'll talk to beasts and spirits both, kupo." },
      { a: 'kupera_diva', b: 'tickmog_chronomancer', child: 'maestromog_maestro', tier: 'rare', hint: 'Perfect pitch and perfect timing, kupo... that\'s a Maestro if I ever heard one!' },
      { a: 'gunmog_gun_arm', b: 'filchpom_cat_burglar', child: 'slingmog_gunslinger', tier: 'rare', hint: 'A gun-arm and a cat burglar... quick hands, quicker trigger, kupo!' },
      { a: 'halomog_bishop', b: 'kenkupo_sword_saint', child: 'templamog_templar', tier: 'rare', hint: "A bishop and a sword saint! That's a Templar, sure as sunrise, kupo." },

      // ==== the era lines' rare forms, from the old kinds (and one from two old lines): each hatches the line's first job
      // (Mysticmog, Drakemog, Spellmog, Maestromog, Templamog and Shamog as made above)
      { a: 'mysticmog_mystic_knight', b: 'tickmog_chronomancer', child: 'garmog_guard', tier: 'rare', hint: 'A mystic knight and a chronomancer... a knight stuck in a loop, kupo. Odd egg!' },
      { a: 'drakemog_dragon_knight', b: 'twinklin_skyseer', child: 'ryukupo_hatchling', tier: 'rare', hint: "A dragon knight and a skyseer... somethin' ancient's stirrin' in the straw, kupo!" },
      { a: 'tekkupo_magitek', b: 'callmog_evoker', child: 'tinamog_tek_rider', tier: 'rare', hint: "Magitek and an evoker... that young'un's half machine, half magic, kupo!" },
      { a: 'spellmog_spellblade', b: 'bustermog_first_class', child: 'deepkupo_deep_cadet', tier: 'rare', hint: "A Spellblade and a First Class? That's a soldier from way down deep, kupo..." },
      { a: 'maestromog_maestro', b: 'juggler_jester', child: 'kefkupo_court_jester', tier: 'rare', hint: "A maestro and a jester... oh dear. That one's gonna laugh at everything, kupo." },
      { a: 'templamog_templar', b: 'breezlin_aeromancer', child: 'wingmog_white_wing', tier: 'rare', hint: 'A templar and a wind-mage... I see white wings on that egg, kupo!' },
      { a: 'shamog_beastcaller', b: 'petalmog_maiden', child: 'eidomog_pet', tier: 'rare', hint: "A beastcaller and a flower maiden... somethin' small and summoned, kupo. Adorable!" },
      { a: 'tufty_mime', b: 'bluemog_blue_wizard', child: 'mimikupo_mimic', tier: 'rare', hint: "A mime and a blue wizard? It'll copy you before it can walk, kupo!" },
    ],

    // ------------------------------------------------------------------ the Kupodex: rare, super rare, ultra rare
    dex: [
      'uhlamog_uhlan', 'breakpom_foebreaker', 'steinmog_magic_knight', 'shikapom_shikari', 'chronobow_time_battlemage', 'psykupo_psychic',
      'saddlepom_choco_mog', 'saddlepom_fat_chocobo',
      'divinkin_divine_knight', 'bushimog_bushi', 'kagepom_assassin', 'triggermog_deadeye', 'mariapom_prima_donna', 'celestimog_heaven_knight',
      'hellkupo_hell_knight', 'kurokweh_black_chick', 'kurokweh_black_chocobo',
      'dawnlance_holy_dragoon', 'shogunpom_shogun', 'alexamog_alexander', 'phoenimog_phoenix_down', 'phoenimog_phoenix', 'sirenkupo_siren',
      'goldkweh_gold_chocobo',
    ],
  });
})();
