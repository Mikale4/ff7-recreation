// Kupomon expansion pack 'era10' (docs/KUPOMON_CONTENT.md): the moogles of the spin-offs, as homage in our own words.
// Crystal Chronicles (the caravans and their papaopamus, the chalice porters and their myrrh, Moogle Nests and Mog
// Stamps, the Clavat, Lilty, Yuke and Selkie tribes, the Miasma, the Crystal Bearers), the Chocobo series (Mystery
// Dungeon delvers, Shiroma and Croma, Chocobo Racing), Dissidia and Opera Omnia (Bravery, the Manikins, the crystal
// shards), Theatrhythm (rhythm, Rhythmia), World of Final Fantasy (stacked mirages, prisms), Mobius (cards and orbs),
// Brave Exvius (the town and trust moogles), Record Keeper (memory crystals), FF Explorers (monsterizing), Kingdom
// Hearts (the moogle synthesis shops), FF Fables (bedtime tales, pop-up duels), Pictlogica (picture puzzles), Airborne
// Brigade (airship fleets), Grandmasters, Stranger of Paradise (a pseudo-legendary that hunts Chaos) and the Trading
// Card Game (Backups and Forwards). 31 lines, 71 moogles; four signature moves and three signature abilities (e10_).
(function () {
  const KP = FF7.kupomon;
  const J = (name, type, look) => ({ name, type, look });
  const B = (hp, atk, def, mag, res, spd) => ({ hp, atk, def, mag, res, spd });
  KP.content('era10', {
    // ------------------------------------------------------------------ the jobs (one per stage)
    jobs: {
      // Crystal Chronicles: the caravans
      e10_caravanner: J('Caravanner', 'freelancer', { hat: 'kerchief', body: 'backpack', weapon: 'walkstaff', g1: '#b07a40', g2: '#e8d8b0' }),
      e10_caravan_chief: J('Caravan Chief', 'freelancer', { hat: 'stetson', body: 'poncho', weapon: 'whip', cape: '#6a3a1a', g1: '#8a4a2a', g2: '#f0c060' }),
      // the chalice porters and their myrrh
      e10_chalice_porter: J('Chalice Porter', 'whitemage', { hat: 'none', body: 'harness', weapon: 'lanternpole', g1: '#c8a040', g2: '#7ad0ff' }),
      e10_myrrh_gatherer: J('Myrrh Gatherer', 'whitemage', { hat: 'coif', body: 'tabard', weapon: 'lantern', shield: 'round', g1: '#d8b040', g2: '#60c8ff' }),
      e10_crystal_warden: J('Crystal Warden', 'whitemage', { hat: 'elemcirclet', body: 'mantle', weapon: 'orbstaff', shield: 'kite', cape: '#3a7ad8', g1: '#e8c860', g2: '#80e0ff' }),
      // Moogle Nests and Mog Stamps
      e10_nest_tender: J('Nest Tender', 'freelancer', { hat: 'woolhood', body: 'apron', weapon: 'broom', g1: '#c89060', g2: '#f0e0c0' }),
      e10_nest_elder: J('Nest Elder', 'freelancer', { hat: 'twigcrown', body: 'leafcloak', weapon: 'oakstaff', g1: '#8a6a3a', g2: '#d8f0a0' }),
      e10_stamp_collector: J('Stamp Collector', 'freelancer', { hat: 'newsboy', body: 'satchel', weapon: 'clipboard', g1: '#d04848', g2: '#f0e0c0' }),
      e10_stamp_master: J('Stamp Master', 'monk', { hat: 'topknot', body: 'hakama', weapon: 'cestus', g1: '#c03030', g2: '#f4e8d0' }),
      // the four tribes
      e10_tipa_guard: J('Tipa Guard', 'knight', { hat: 'band', body: 'plaid', weapon: 'shortsword', shield: 'round', g1: '#4a8a4a', g2: '#d8c090' }),
      e10_clavat_hero: J('Clavat Hero', 'knight', { hat: 'feathercap', body: 'doublet', weapon: 'broadsword', shield: 'kite', cape: '#2a5a2a', g1: '#3a7a3a', g2: '#e8d0a0' }),
      e10_lilty_page: J('Lilty Page', 'dragoon', { hat: 'pagecap', body: 'apron', weapon: 'spear', g1: '#c06030', g2: '#f0e0c0' }),
      e10_lilty_lancer: J('Lilty Lancer', 'dragoon', { hat: 'plumed', body: 'armor', weapon: 'lance', g1: '#b04020', g2: '#d8c070' }),
      e10_alfitaria_knight: J('Alfitaria Knight', 'dragoon', { hat: 'crest', body: 'plate', weapon: 'lance', shield: 'kite', cape: '#a02818', g1: '#d8b040', g2: '#b03020' }),
      e10_yuke_pupil: J('Yuke Pupil', 'blackmage', { hat: 'bascinet', body: 'robe', weapon: 'rod', g1: '#4a5aa0', g2: '#c8ccd8', shadowFace: true, eyes: '#ffe060' }),
      e10_shella_magus: J('Shella Magus', 'blackmage', { hat: 'sallet', body: 'robe', weapon: 'orbstaff', g1: '#3a4a8a', g2: '#e0c860', shadowFace: true, eyes: '#80e0ff', extra: ['featherwings'] }),
      e10_magicite_sage: J('Magicite Sage', 'blackmage', { hat: 'templar', body: 'mantle', weapon: 'elemstaff', cape: '#2a2a6a', g1: '#2a3a7a', g2: '#ffd860', shadowFace: true, eyes: '#ffe060', extra: ['featherwings'] }),
      e10_leuda_scamp: J('Leuda Scamp', 'thief', { hat: 'bandana', body: 'rashguard', weapon: 'boomerang', g1: '#30a0b0', g2: '#f0e0c0' }),
      e10_racketeer: J('Racketeer', 'thief', { hat: 'surfhair', body: 'sash', weapon: 'net', g1: '#208090', g2: '#f0c040' }),
      // the Miasma
      e10_miasma_wisp: J('Miasma Wisp', 'summoner', { hat: 'veil', body: 'shroud', weapon: 'none', g1: '#5a3a7a', g2: '#a0ff80', extra: ['wisps'] }),
      e10_miasma_stream: J('Miasma Stream', 'summoner', { hat: 'netherhood', body: 'tendrils', weapon: 'nethercore', g1: '#3a2050', g2: '#90ff70', shadowFace: true, eyes: '#c0ff60', extra: ['wisps'] }),
      // the Crystal Bearers
      e10_sky_courier: J('Sky Courier', 'timemage', { hat: 'earpiece', body: 'jacket', weapon: 'gauntlet', g1: '#c04020', g2: '#40c0ff' }),
      e10_crystal_bearer: J('Crystal Bearer', 'timemage', { hat: 'leonhart', body: 'trench', weapon: 'gauntlet', cape: '#2a2a3a', g1: '#a03018', g2: '#60e0ff' }),
      // the Chocobo series
      e10_trap_finder: J('Trap Finder', 'thief', { hat: 'headlamp', body: 'satchel', weapon: 'shovel', g1: '#7a6a4a', g2: '#e8c040' }),
      e10_delver: J('Dungeon Delver', 'thief', { hat: 'explorer', body: 'backpack', weapon: 'grapple', g1: '#6a5a3a', g2: '#d8b050' }),
      e10_floor_master: J('Floor Master', 'thief', { hat: 'gadgethelm', body: 'gadgetpack', weapon: 'springgun', cape: '#5a3a2a', g1: '#4a4a5a', g2: '#ffc030' }),
      e10_novice_healer: J('Novice Healer', 'whitemage', { hat: 'hood', body: 'robe', weapon: 'wand', g1: '#f8f0f0', g2: '#ff8ab0' }),
      e10_chocobo_medic: J('Chocobo Medic', 'whitemage', { hat: 'chococrest', body: 'smock', weapon: 'staff', g1: '#fff4f0', g2: '#ffd040' }),
      e10_spark_pupil: J('Spark Pupil', 'blackmage', { hat: 'witch', body: 'robe', weapon: 'wand', g1: '#2a2a4a', g2: '#e06030', shadowFace: true, eyes: '#ffd040' }),
      e10_mischief_mage: J('Mischief Mage', 'blackmage', { hat: 'crooked', body: 'cloak', weapon: 'firebrand', g1: '#1a1a2a', g2: '#ff6020', shadowFace: true, eyes: '#ff8030' }),
      e10_pit_crew: J('Pit Crew', 'machinist', { hat: 'workcap', body: 'overalls', weapon: 'wrench', g1: '#e04030', g2: '#f0f0f0' }),
      e10_kart_racer: J('Kart Racer', 'machinist', { hat: 'goggles', body: 'jacket', weapon: 'flag', g1: '#ffd020', g2: '#2a2a2a' }),
      e10_grand_prix_ace: J('Grand Prix Ace', 'machinist', { hat: 'rider', body: 'jersey', weapon: 'flag', g1: '#d02020', g2: '#ffe040', extra: ['jetpack'] }),
      // Dissidia and Opera Omnia
      e10_brave_duelist: J('Brave Duelist', 'warrior', { hat: 'domino', body: 'leather', weapon: 'sword', g1: '#3a5ac0', g2: '#c8ccd4' }),
      e10_cosmos_warrior: J('Cosmos Warrior', 'warrior', { hat: 'helm', body: 'armor', weapon: 'broadsword', shield: 'round', cape: '#e8d070', g1: '#2a4ab0', g2: '#e8e0c0' }),
      e10_cosmos_champion: J('Cosmos Champion', 'warrior', { hat: 'winghead', body: 'featherarmor', weapon: 'holysword', shield: 'kite', cape: '#f0e0a0', g1: '#3050c0', g2: '#f4e8b0', glow: '#a0e0ff', extra: ['halo'] }),
      e10_manikin: J('Manikin', 'redmage', { hat: 'halfmask', body: 'runeplate', weapon: 'mirror', g1: '#8a60c0', g2: '#d0b0ff', extra: ['crystalwings'] }),
      e10_shard_seeker: J('Shard Seeker', 'ranger', { hat: 'trapperhat', body: 'quiver', weapon: 'bow', g1: '#6a50c0', g2: '#f0d060' }),
      e10_omnia_guide: J('Omnia Guide', 'ranger', { hat: 'plume', body: 'tailcoat', weapon: 'longbow', cape: '#7a40c0', g1: '#2a1a4a', g2: '#ffd860' }),
      // Theatrhythm
      e10_beat_keeper: J('Beat Keeper', 'bard', { hat: 'shako', body: 'jacket', weapon: 'rattle', g1: '#d03050', g2: '#f0d060' }),
      e10_tempo_mage: J('Tempo Mage', 'bard', { hat: 'beret', body: 'streamers', weapon: 'flute', g1: '#7040c0', g2: '#f0d060' }),
      e10_rhythm_virtuoso: J('Rhythm Virtuoso', 'bard', { hat: 'tiara', body: 'starcoat', weapon: 'harp', cape: '#3a2a8a', g1: '#5a3ab0', g2: '#ffe070', extra: ['fairy'] }),
      // World of Final Fantasy
      e10_mirage_keeper: J('Mirage Keeper', 'beast', { hat: 'wolfears', body: 'patchfur', weapon: 'lasso', g1: '#4aa060', g2: '#f0d080' }),
      e10_mirage_tamer: J('Mirage Tamer', 'beast', { hat: 'shaman', body: 'furcollar', weapon: 'totem', g1: '#3a8a5a', g2: '#e8c050' }),
      e10_stack_master: J('Stack Master', 'beast', { hat: 'horncrown', body: 'mane', weapon: 'totem', cape: '#2a6a4a', g1: '#2a7a4a', g2: '#ffd860', extra: ['dragonpet'] }),
      e10_prism_seeker: J('Prism Seeker', 'summoner', { hat: 'earmuffs', body: 'puffer', weapon: 'orb', g1: '#60a0e0', g2: '#f0f8ff' }),
      e10_imprismer: J('Imprismer', 'summoner', { hat: 'wavecrown', body: 'magiccape', weapon: 'starglobe', g1: '#4a70c0', g2: '#c0f0ff' }),
      // Mobius
      e10_card_mage: J('Card Mage', 'redmage', { hat: 'cap', body: 'magiccape', weapon: 'cards', g1: '#c03050', g2: '#40c0e0' }),
      e10_mobius_hero: J('Mobius Hero', 'redmage', { hat: 'feather', body: 'longcoat', weapon: 'runesword', cape: '#c02040', g1: '#2a2a4a', g2: '#f0d060', glow: '#ff8040' }),
      // Brave Exvius
      e10_town_greeter: J('Town Greeter', 'freelancer', { hat: 'pagecap', body: 'bowtie', weapon: 'bell', g1: '#e8c040', g2: '#4a7ad0' }),
      e10_trust_keeper: J('Trust Keeper', 'freelancer', { hat: 'ribbon', body: 'sash', weapon: 'bouquet', g1: '#f0a0c0', g2: '#ffe080' }),
      // Record Keeper
      e10_archivist: J('Archivist', 'timemage', { hat: 'monocle', body: 'robe', weapon: 'book', g1: '#6a4a8a', g2: '#e8d8a0' }),
      e10_memory_keeper: J('Memory Keeper', 'timemage', { hat: 'quillcap', body: 'longcoat', weapon: 'grimoire', g1: '#4a3a7a', g2: '#d8b040' }),
      e10_soul_breaker: J('Soul Breaker', 'timemage', { hat: 'skyseer', body: 'starcoat', weapon: 'magicbrush', cape: '#3a2a6a', g1: '#2a1a5a', g2: '#ffe080', extra: ['wisps'] }),
      // FF Explorers
      e10_explorer: J('Explorer', 'ranger', { hat: 'pith', body: 'safari', weapon: 'crossbow', g1: '#8a7a4a', g2: '#e0d0a0' }),
      e10_monsterizer: J('Monsterizer', 'ranger', { hat: 'beastmask', body: 'furs', weapon: 'claw', g1: '#6a4a8a', g2: '#ff8040' }),
      // Kingdom Hearts
      e10_material_hunter: J('Material Hunter', 'machinist', { hat: 'beanie', body: 'satchel', weapon: 'magnifier', g1: '#e070a0', g2: '#d8d0c0' }),
      e10_synthesist: J('Synthesist', 'machinist', { hat: 'goggles', body: 'apron', weapon: 'flask', liquid: '#60f0c0', g1: '#c04880', g2: '#c8b070' }),
      e10_grand_synthesist: J('Grand Synthesist', 'machinist', { hat: 'lightbulb', body: 'keybelt', weapon: 'windkey', cape: '#e070a0', g1: '#c03070', g2: '#ffd860' }),
      // FF Fables
      e10_storyteller: J('Storyteller', 'bard', { hat: 'nightcap', body: 'gown', weapon: 'book', g1: '#5a6ab0', g2: '#f0e0b0' }),
      e10_popup_duelist: J('Pop-Up Duelist', 'bard', { hat: 'artberet', body: 'pictocoat', weapon: 'grimoire', g1: '#d04070', g2: '#f0d060' }),
      // Pictlogica
      e10_puzzle_sage: J('Puzzle Sage', 'timemage', { hat: 'pictohat', body: 'waistcoat', weapon: 'pointer', g1: '#3a6ab0', g2: '#f0f0f0' }),
      // Airborne Brigade
      e10_sky_deckhand: J('Sky Deckhand', 'dragoon', { hat: 'falconcap', body: 'jacket', weapon: 'spear', g1: '#4a7ab0', g2: '#f0e0c0' }),
      e10_brigadier: J('Brigadier', 'dragoon', { hat: 'flightcap', body: 'windcape', weapon: 'lance', g1: '#2a5a9a', g2: '#e8c040' }),
      e10_air_marshal: J('Air Marshal', 'dragoon', { hat: 'captain', body: 'redcoat', weapon: 'lance', cape: '#1a3a7a', g1: '#1a3a7a', g2: '#ffd040' }),
      // Grandmasters
      e10_grandmaster: J('Grandmaster', 'freelancer', { hat: 'whitemonk', body: 'monkrobe', weapon: 'quarterstaff', cape: '#a03020', g1: '#d8b040', g2: '#f4ece0' }),
      // Stranger of Paradise (the pseudo-legendary)
      e10_swordsman: J('Swordsman', 'warrior', { hat: 'none', body: 'hoodie', weapon: 'greatsword', g1: '#2a2a30', g2: '#8a8a96' }),
      e10_void_warrior: J('Void Warrior', 'warrior', { hat: 'darkhelm', body: 'darkplate', weapon: 'darksword', g1: '#2a1a3a', g2: '#6a3aa0', glow: '#a040ff' }),
      e10_tyrant: J('Tyrant', 'warrior', { hat: 'dkhorns', body: 'darkplate', weapon: 'buster', cape: '#3a0a1a', g1: '#1a0a14', g2: '#c02838', glow: '#ff3040', shadowFace: true, eyes: '#ff2020', extra: ['dragonwings'] }),
      // the Trading Card Game
      e10_backup: J('Backup', 'knight', { hat: 'ballcap', body: 'vest', weapon: 'cards', shield: 'round', g1: '#3a5ab0', g2: '#f0f0f0' }),
      e10_forward: J('Forward', 'warrior', { hat: 'crest', body: 'duelcoat', weapon: 'saber', cape: '#2a2a6a', g1: '#c03030', g2: '#f0d060' }),
    },

    // ------------------------------------------------------------------ signature moves (one line learns each)
    moves: {
      e10_brave_attack: { name: 'Brave Attack', type: 'warrior', power: 40, acc: 100, cd: 1, self: { atk: 1 }, flags: ['contact'],
        desc: "A Bravery hit: it steals a little of the foe's nerve. Attack up." },
      e10_soul_burst: { name: 'Soul Burst', type: 'warrior', power: 65, acc: 100, cd: 2, powerBy: 'targetHalf', drain: 0.5, flags: ['contact', 'slice'],
        desc: 'Finishes a broken foe: x2 at half HP or less; drinks half the damage.' },
      e10_feature_drive: { name: 'Feature Drive', type: 'bard', power: 75, acc: 100, cd: 2, terrain: 'rhythm', flags: ['sound'],
        desc: 'A perfect streak of notes, then a Rhythm Field takes the stage.' },
      e10_stack_attack: { name: 'Stack Attack', type: 'beast', power: 25, acc: 100, cd: 1, hits: 3, flags: ['contact'],
        desc: 'Every mirage in its stack piles on in turn: hits three times.' },
    },

    // ------------------------------------------------------------------ signature abilities
    abilities: {
      e10_chalice_ward: { name: 'Chalice Ward', desc: 'Its chalice glows: no weather chip, Poison or Venom on it.', overcoat: true, noStatus: ['poison', 'venom'] },
      e10_rhythmia: { name: 'Rhythmia', desc: "Sound and dance moves hit 1.2x; it can't be Confused.", flagBoost: { sound: 1.2, dance: 1.2 }, noStatus: ['confuse'] },
      e10_stacked: { name: 'Stacked', desc: 'A whole tower of mirages: Defense and Resistance 1.2x.', statMul: { def: 1.2, res: 1.2 } },
    },

    // ------------------------------------------------------------------ species
    species: {
      // ---- Caravamog: the Crystal Chronicles caravans (Caravanner > Caravan Chief)
      caravamog_caravanner: {
        moogle: 'Caravamog', job: 'e10_caravanner', base: B(65, 60, 60, 30, 50, 50),
        rate: 190, exp: 58, curve: 'medium', fur: '#f0e4cc', pom: '#e08a30', wing: '#b07a40',
        evo: { at: 20, to: 'caravamog_caravan_chief' },
        desc: 'Joins the caravan every year to fetch myrrh for the town crystal. It packs three snacks for every map.',
        abilities: ['endurance', 'hold_fast'],
        learn: '1 pom_bop, 1 pout, 4 kupo_toss, 8 accumulate, 12 pom_flurry, 16 whirlwind, 20 trailblaze, 24 pom_bop, 28 mognet_relay, 32 kupo_charge, 36 pom_flurry, 40 accumulate, 44 chocobo_rush',
        habitat: 'grass', rarity: 'common', class: 'normal',
      },
      caravamog_caravan_chief: {
        moogle: 'Caravamog', job: 'e10_caravan_chief', type2: 'beast', base: B(100, 100, 95, 45, 80, 65),
        rate: 70, exp: 215, curve: 'medium', fur: '#f0e4cc', pom: '#e08a30', wing: '#b07a40',
        desc: 'Drives the whole caravan from the wagon seat. The papaopamus only listen to it, and only after lunch.',
        abilities: ['endurance', 'hold_fast'],
        learn: '20 chocobo_rush, 24 pom_bop, 28 horn_ram, 32 mognet_relay, 35 pom_flurry, 38 accumulate, 42 mog_rush, 46 stampede, 50 pom_bop',
        habitat: 'grass', rarity: 'common', class: 'normal',
      },

      // ---- Myrrhpom: the caravan's chalice porters (Chalice Porter > Myrrh Gatherer > Crystal Warden)
      myrrhpom_chalice_porter: {
        moogle: 'Myrrhpom', job: 'e10_chalice_porter', base: B(60, 30, 55, 50, 60, 45),
        rate: 160, exp: 60, curve: 'medium', fur: '#f6f2ea', pom: '#60c8ff', wing: '#d8b040',
        evo: { at: 18, to: 'myrrhpom_myrrh_gatherer' },
        desc: 'Carries the caravan chalice on a pole. Step outside its glow and the Miasma gets you, as it reminds you loudly.',
        abilities: ['e10_chalice_ward', 'healing_pom', 'field_medic'],
        learn: '1 holy_glare, 1 cure, 4 regen_spell, 7 banish, 10 aegis_prayer, 13 dawn_prayer, 16 pearl_volley, 18 temperance, 22 banishga, 26 holy_glare, 30 asylum_fog, 34 liturgy_bell, 38 pearl_volley, 42 holy_ray',
        habitat: 'desert', rarity: 'uncommon', class: 'normal',
      },
      myrrhpom_myrrh_gatherer: {
        moogle: 'Myrrhpom', job: 'e10_myrrh_gatherer', type2: 'knight', base: B(80, 40, 80, 70, 85, 55),
        rate: 90, exp: 140, curve: 'medium', fur: '#f6f2ea', pom: '#60c8ff', wing: '#d8b040',
        evo: { at: 34, to: 'myrrhpom_crystal_warden' },
        desc: 'Waits all year under a myrrh tree for one shining drop. Its chalice glows a little brighter with each one.',
        abilities: ['e10_chalice_ward', 'healing_pom', 'field_medic'],
        learn: '18 aegis_slam, 21 shield_bash, 24 sheltron, 27 banishga, 30 holy_glare, 34 divine_veil, 38 pearl_volley, 42 holy_ray, 46 shield_bash',
        habitat: 'desert', rarity: 'uncommon', class: 'normal',
      },
      myrrhpom_crystal_warden: {
        moogle: 'Myrrhpom', job: 'e10_crystal_warden', type2: 'knight', base: B(100, 50, 100, 90, 110, 65),
        rate: 50, exp: 238, curve: 'medium', fur: '#f6f2ea', pom: '#60c8ff', wing: '#d8b040',
        desc: 'Guards the town crystal between journeys. Its ward is so steady that even the weather walks around it.',
        abilities: ['e10_chalice_ward', 'healing_pom', 'field_medic'],
        learn: '34 holy_ray, 37 pearl_volley, 40 shield_wall, 43 judgment, 46 aegis_slam',
        habitat: 'desert', rarity: 'uncommon', class: 'normal',
      },

      // ---- Nestlin: the Moogle Nests (Nest Tender > Nest Elder)
      nestlin_nest_tender: {
        moogle: 'Nestlin', job: 'e10_nest_tender', base: B(70, 40, 55, 55, 60, 40),
        rate: 190, exp: 56, curve: 'fast', fur: '#f2e8d8', pom: '#a0d070', wing: '#a07850',
        evo: { at: 22, to: 'nestlin_nest_elder' },
        desc: 'Keeps a Moogle Nest tidy for weary travelers. It fluffs every pillow twice and hums while it sweeps.',
        abilities: ['auto_potion', 'pom_fluff'],
        learn: '1 pom_bop, 1 pom_dust, 4 snack_break, 8 kupo_holler, 11 holy_glare, 14 mog_shield, 18 mog_mirror, 22 pom_bop, 26 kupo_holler, 30 mognet_relay, 34 holy_glare, 38 snack_break',
        habitat: 'forest', rarity: 'common', class: 'normal',
      },
      nestlin_nest_elder: {
        moogle: 'Nestlin', job: 'e10_nest_elder', type2: 'whitemage', base: B(105, 55, 85, 85, 95, 65),
        rate: 70, exp: 212, curve: 'fast', fur: '#f2e8d8', pom: '#a0d070', wing: '#a07850',
        desc: 'The oldest moogle of the nest. Guests leave rested, fed and stamped, whether they wanted a stamp or not.',
        abilities: ['auto_potion', 'pom_fluff'],
        learn: '22 cure, 25 regen_spell, 28 holy_glare, 31 kupo_holler, 34 liturgy_bell, 37 banishga, 40 holy_glare, 44 holy, 48 kupo_holler',
        habitat: 'forest', rarity: 'common', class: 'normal',
      },

      // ---- Inkupo: the Mog Stamps (Stamp Collector > Stamp Master)
      inkupo_stamp_collector: {
        moogle: 'Inkupo', job: 'e10_stamp_collector', base: B(55, 65, 50, 30, 45, 70),
        rate: 185, exp: 57, curve: 'fast', fur: '#f4ece4', pom: '#d03030', wing: '#3a3a6a',
        evo: { at: 20, to: 'inkupo_stamp_master' },
        desc: 'Visits every Moogle Nest for its Mog Stamp. Its card has no blank squares left, so it stamps its own face.',
        abilities: ['brawler_soul', 'kupo_luck'],
        learn: '1 pom_bop, 1 pout, 4 combo_chain, 8 steal, 12 quick_jab, 16 shiko, 20 kupo_toss, 24 pom_bop, 28 combo_chain, 32 accumulate, 36 kupo_charge, 40 steal',
        habitat: 'grass', rarity: 'common', class: 'normal',
      },
      inkupo_stamp_master: {
        moogle: 'Inkupo', job: 'e10_stamp_master', type2: 'freelancer', base: B(80, 110, 75, 40, 70, 120),
        rate: 65, exp: 214, curve: 'fast', fur: '#f4ece4', pom: '#d03030', wing: '#3a3a6a',
        desc: 'Has stamped so many cards that its paws are solid ink. One stamp, one stomp, one very flat foe.',
        abilities: ['brawler_soul', 'kupo_luck'],
        learn: '20 tsuppari, 23 one_inch_punch, 27 steal, 30 shiko, 33 mach_kick, 36 combo_chain, 40 burning_rave, 44 six_sided_star, 48 steal',
        habitat: 'grass', rarity: 'common', class: 'normal',
      },

      // ---- Clavamog: the Clavat (Tipa Guard > Clavat Hero)
      clavamog_tipa_guard: {
        moogle: 'Clavamog', job: 'e10_tipa_guard', base: B(60, 55, 60, 45, 55, 45),
        rate: 180, exp: 58, curve: 'medium', fur: '#f4ecdc', pom: '#5ab05a', wing: '#c08a50',
        evo: { at: 22, to: 'clavamog_clavat_hero' },
        desc: 'Guards the farm gate at Tipa with a short sword and a big smile. It is good at everything, a little.',
        abilities: ['auto_wall', 'last_bastion'],
        learn: '1 shield_bash, 1 cover, 4 keen_edge, 8 rend_armor, 12 sheltron, 16 onion_slash, 20 valiant, 24 shield_bash, 28 iron_wall, 32 rend_weapon, 36 keen_edge, 40 aegis_slam',
        habitat: 'beach', rarity: 'common', class: 'normal',
      },
      clavamog_clavat_hero: {
        moogle: 'Clavamog', job: 'e10_clavat_hero', base: B(90, 90, 95, 60, 85, 75),
        rate: 70, exp: 215, curve: 'medium', fur: '#f4ecdc', pom: '#5ab05a', wing: '#c08a50',
        desc: 'Never the strongest, never the fastest, never the first to give up. It fights for its village and its supper.',
        abilities: ['auto_wall', 'last_bastion'],
        learn: '22 job_strike, 25 aegis_slam, 28 onion_slash, 32 shield_wall, 35 rend_weapon, 38 shield_bash, 42 mog_rush, 46 entrench, 49 onion_slash',
        habitat: 'beach', rarity: 'common', class: 'normal',
      },

      // ---- Liltimog: the Lilty (Lilty Page > Lilty Lancer > Alfitaria Knight)
      liltimog_lilty_page: {
        moogle: 'Liltimog', job: 'e10_lilty_page', base: B(55, 70, 55, 30, 45, 50),
        rate: 160, exp: 60, curve: 'medium', fur: '#f2e2cc', pom: '#ff7a30', wing: '#c04020',
        evo: { at: 17, to: 'liltimog_lilty_lancer' },
        desc: 'Small, proud and always hungry. It carries its spear to dinner, just in case dinner fights back.',
        abilities: ['defiance', 'dragon_spirit', 'pom_power'],
        learn: '1 thrust, 1 pout, 4 pom_lance, 7 snack_break, 10 leg_sweep, 13 frying_pan, 17 wyrm_dance, 21 lancet, 25 thrust, 29 jump, 33 pom_lance, 37 dragon_fang',
        habitat: 'mountain', rarity: 'uncommon', class: 'normal',
      },
      liltimog_lilty_lancer: {
        moogle: 'Liltimog', job: 'e10_lilty_lancer', type2: 'warrior', base: B(75, 100, 75, 40, 60, 70),
        rate: 90, exp: 142, curve: 'medium', fur: '#f2e2cc', pom: '#ff7a30', wing: '#c04020',
        evo: { at: 35, to: 'liltimog_alfitaria_knight' },
        desc: 'Insists it is the tallest moogle in the room. Nobody argues with a Lilty holding a lance.',
        abilities: ['defiance', 'dragon_spirit', 'pom_power'],
        learn: '17 blade_beam, 20 slash, 23 soul_jump, 26 full_break, 29 pom_lance, 32 life_surge, 35 dragon_fang, 39 slash, 43 draconian_fury, 47 pom_lance',
        habitat: 'mountain', rarity: 'uncommon', class: 'normal',
      },
      liltimog_alfitaria_knight: {
        moogle: 'Liltimog', job: 'e10_alfitaria_knight', type2: 'knight', base: B(95, 130, 95, 45, 75, 85),
        rate: 45, exp: 240, curve: 'medium', fur: '#f2e2cc', pom: '#ff7a30', wing: '#c04020',
        desc: 'A knight of the Lilty kingdom. Its armor is polished, its lance is sharp and its stew is the stuff of legend.',
        abilities: ['defiance', 'dragon_spirit', 'pom_power'],
        learn: '35 aegis_slam, 38 thrust, 41 dragonfire_dive, 44 stardiver, 48 pom_lance',
        habitat: 'mountain', rarity: 'uncommon', class: 'normal',
      },

      // ---- Yukepom: the Yuke (Yuke Pupil > Shella Magus > Magicite Sage)
      yukepom_yuke_pupil: {
        moogle: 'Yukepom', job: 'e10_yuke_pupil', base: B(45, 30, 40, 75, 60, 50),
        rate: 155, exp: 62, curve: 'medium', fur: '#e8ecf8', pom: '#7a90ff', wing: '#5a6ab0',
        evo: { at: 19, to: 'yukepom_shella_magus' },
        desc: 'Nobody has seen its face under that helmet. It studies magicite all night and sneezes sparks.',
        abilities: ['spellcraft', 'echo_voice', 'swiftcast'],
        learn: '1 fire, 1 blizzard, 4 astral_fire, 8 thunder, 12 scathe, 15 gravity, 19 aspir, 23 fire, 27 triplecast, 31 blizzard, 35 fira, 39 scathe',
        habitat: 'snow', rarity: 'uncommon', class: 'normal',
      },
      yukepom_shella_magus: {
        moogle: 'Yukepom', job: 'e10_shella_magus', type2: 'redmage', base: B(60, 40, 55, 105, 85, 70),
        rate: 85, exp: 145, curve: 'medium', fur: '#e8ecf8', pom: '#7a90ff', wing: '#5a6ab0',
        evo: { at: 36, to: 'yukepom_magicite_sage' },
        desc: 'Fuses two spells into one when nobody is looking. Its little wings flap when it gets the recipe right.',
        abilities: ['spellcraft', 'echo_voice', 'swiftcast'],
        learn: '19 jolt, 22 dualcast, 25 element_orb, 28 scathe, 31 ley_lines, 34 triplecast, 36 verstone, 40 fira, 44 verflare, 48 jolt',
        habitat: 'snow', rarity: 'uncommon', class: 'normal',
      },
      yukepom_magicite_sage: {
        moogle: 'Yukepom', job: 'e10_magicite_sage', type2: 'redmage', base: B(75, 45, 65, 135, 110, 95),
        rate: 45, exp: 242, curve: 'medium', fur: '#e8ecf8', pom: '#7a90ff', wing: '#5a6ab0',
        desc: 'Knows every magicite blend there is, and three that blew up the library. Its helmet hums with power.',
        abilities: ['spellcraft', 'echo_voice', 'swiftcast'],
        learn: '36 magick_barrier, 39 fira, 42 scathe, 45 firaja, 48 verflare',
        habitat: 'snow', rarity: 'uncommon', class: 'normal',
      },

      // ---- Selkipom: the Selkie (Leuda Scamp > Racketeer)
      selkipom_leuda_scamp: {
        moogle: 'Selkipom', job: 'e10_leuda_scamp', base: B(50, 65, 45, 35, 40, 80),
        rate: 180, exp: 58, curve: 'fast', fur: '#eef4f4', pom: '#30c0d0', wing: '#208090',
        evo: { at: 21, to: 'selkipom_racketeer' },
        desc: 'Grew up on the docks of Leuda, swiping fish and hats. It always gives back the hats. Mostly.',
        abilities: ['sneak_attack', 'featherweight'],
        learn: '1 mug, 1 trip, 4 wave_ride, 8 steal, 12 trick_attack, 16 repelling_shot, 21 thievery, 25 mug, 29 viper_fang, 33 wave_ride, 37 coup_de_grace, 41 steal',
        habitat: 'sea', rarity: 'common', class: 'normal',
      },
      selkipom_racketeer: {
        moogle: 'Selkipom', job: 'e10_racketeer', type2: 'ranger', base: B(70, 110, 70, 45, 65, 125),
        rate: 65, exp: 214, curve: 'fast', fur: '#eef4f4', pom: '#30c0d0', wing: '#208090',
        desc: 'Swings a racket at anything that moves and pockets whatever drops. It calls this a fair trade.',
        abilities: ['sneak_attack', 'featherweight'],
        learn: '21 buckshot, 24 sleight_of_hand, 27 huton, 30 coup_de_grace, 34 wave_ride, 38 depth_charge, 42 grand_heist, 46 buckshot',
        habitat: 'sea', rarity: 'common', class: 'normal',
      },

      // ---- Miasmog: the Miasma (Miasma Wisp > Miasma Stream)
      miasmog_miasma_wisp: {
        moogle: 'Miasmog', job: 'e10_miasma_wisp', base: B(60, 30, 55, 70, 65, 40),
        rate: 155, exp: 62, curve: 'medium', fur: '#d8d0e0', pom: '#90ff70', wing: '#5a3a7a',
        evo: { at: 24, to: 'miasmog_miasma_stream' },
        desc: 'A puff of Miasma that drifted into a robot shell. It is scared of chalices and very fond of swamps.',
        abilities: ['venom_drinker', 'scorpion_tail', 'malboro_reek'],
        learn: '1 haunt, 1 miasma, 4 envenom, 8 dread_shade, 12 ectoplasm, 16 bio_mire, 20 haunt, 24 grave_breath, 28 bog_brew, 32 dread_shade, 36 voodoo_doll, 40 haunt',
        habitat: 'swamp', rarity: 'uncommon', class: 'normal',
      },
      miasmog_miasma_stream: {
        moogle: 'Miasmog', job: 'e10_miasma_stream', type2: 'blackmage', base: B(90, 45, 75, 110, 100, 70),
        rate: 60, exp: 220, curve: 'medium', fur: '#d8d0e0', pom: '#90ff70', wing: '#5a3a7a',
        desc: 'A slow purple river of fog in the shape of a moogle. Caravans wait for it to pass, sometimes for a week.',
        abilities: ['venom_drinker', 'scorpion_tail', 'malboro_reek'],
        learn: '24 bog_brew, 27 nightfall, 30 dread_shade, 33 runaway_train, 36 haunt, 40 dusk_requiem, 44 eternal_breath, 47 nether_blaze, 50 haunt',
        habitat: 'swamp', rarity: 'uncommon', class: 'normal',
      },

      // ---- Telekupo: the Crystal Bearers (Sky Courier > Crystal Bearer)
      telekupo_sky_courier: {
        moogle: 'Telekupo', job: 'e10_sky_courier', base: B(55, 65, 50, 50, 45, 50),
        rate: 160, exp: 60, curve: 'medium', fur: '#f0ece6', pom: '#60e0ff', wing: '#a03018',
        evo: { at: 24, to: 'telekupo_crystal_bearer' },
        desc: 'A courier with a crystal mark that lets it lift things with its mind. Mostly it lifts snacks.',
        abilities: ['gravitas', 'hand_to_hand'],
        learn: '1 second_hand, 1 slow, 4 grapple, 8 kupo_toss, 12 gravity, 16 grapple, 20 quick_spell, 24 weightless, 28 grapple, 32 demi_spell, 36 suplex, 40 second_hand',
        habitat: 'sky', rarity: 'uncommon', class: 'normal',
      },
      telekupo_crystal_bearer: {
        moogle: 'Telekupo', job: 'e10_crystal_bearer', type2: 'monk', base: B(80, 105, 75, 70, 65, 95),
        rate: 60, exp: 218, curve: 'medium', fur: '#f0ece6', pom: '#60e0ff', wing: '#a03018',
        desc: 'Can toss a foe across the sky with one flick of its paw. It is always very polite about it afterwards.',
        abilities: ['gravitas', 'hand_to_hand'],
        learn: '24 suplex, 27 grapple, 30 riddle_of_earth, 33 immobilize, 36 heel_drop, 40 second_hand, 44 graviga, 48 grapple',
        habitat: 'sky', rarity: 'uncommon', class: 'normal',
      },

      // ---- Delvemog: Chocobo's Mystery Dungeon (Trap Finder > Dungeon Delver > Floor Master)
      delvemog_trap_finder: {
        moogle: 'Delvemog', job: 'e10_trap_finder', base: B(50, 55, 45, 30, 40, 70),
        rate: 180, exp: 56, curve: 'medium', fur: '#ece2d0', pom: '#ffc030', wing: '#7a6a4a',
        evo: { at: 16, to: 'delvemog_delver' },
        desc: 'Finds every trap on the floor by stepping on it first. It calls this research.',
        abilities: ['libra', 'lie_in_wait'],
        learn: '1 pilfer, 1 trip, 4 makibishi, 8 steal, 12 underhand, 16 snap_shot, 20 venom_tacks, 24 pilfer, 28 coup_de_grace, 32 steal, 36 shadowbind, 40 pilfer',
        habitat: 'cave', rarity: 'common', class: 'normal',
      },
      delvemog_delver: {
        moogle: 'Delvemog', job: 'e10_delver', type2: 'ranger', base: B(65, 80, 60, 40, 55, 100),
        rate: 100, exp: 138, curve: 'medium', fur: '#ece2d0', pom: '#ffc030', wing: '#7a6a4a',
        evo: { at: 32, to: 'delvemog_floor_master' },
        desc: 'Has gone down a hundred floors and climbed back up for snacks every time. Its map redraws itself when it blinks.',
        abilities: ['libra', 'lie_in_wait'],
        learn: '16 web_snare, 19 buckshot, 22 shadowbind, 25 steal, 28 eagle_eye, 32 coup_de_grace, 36 apex_arrow, 40 steal, 44 throw',
        habitat: 'cave', rarity: 'common', class: 'normal',
      },
      delvemog_floor_master: {
        moogle: 'Delvemog', job: 'e10_floor_master', type2: 'machinist', base: B(80, 105, 80, 50, 70, 125),
        rate: 55, exp: 232, curve: 'medium', fur: '#ece2d0', pom: '#ffc030', wing: '#7a6a4a',
        desc: 'Every floor it walks has a new trap on it, and it set them all. Watch your step, and its grin.',
        abilities: ['libra', 'lie_in_wait'],
        learn: '32 mine_layer, 35 gizmo, 38 scattergun, 41 air_anchor, 44 steal, 47 kupo_missile',
        habitat: 'cave', rarity: 'common', class: 'normal',
      },

      // ---- Shiropom: Shiroma, the white mage (Novice Healer > Chocobo Medic)
      shiropom_novice_healer: {
        moogle: 'Shiropom', job: 'e10_novice_healer', base: B(60, 35, 50, 60, 65, 50),
        rate: 185, exp: 57, curve: 'fast', fur: '#fdf8f4', pom: '#ff9ac0', wing: '#ffd060',
        evo: { at: 22, to: 'shiropom_chocobo_medic' },
        desc: 'A cheerful little healer in white. It patches everyone up, then forgets where it left its own staff.',
        abilities: ['medicine', 'light_crystal'],
        learn: '1 aero, 1 cure, 4 banish, 8 flash, 12 holy_glare, 16 regen_spell, 20 dia, 24 aero, 28 esuna, 32 banishga, 36 holy_glare, 40 holy',
        habitat: 'forest', rarity: 'common', class: 'normal',
      },
      shiropom_chocobo_medic: {
        moogle: 'Shiropom', job: 'e10_chocobo_medic', type2: 'beast', base: B(95, 55, 75, 95, 100, 75),
        rate: 70, exp: 212, curve: 'fast', fur: '#fdf8f4', pom: '#ff9ac0', wing: '#ffd060',
        desc: 'Tends sick chocobos in every dungeon town. The birds follow it everywhere, one kweh at a time.',
        abilities: ['medicine', 'light_crystal'],
        learn: '22 geomancy, 25 choco_kick, 28 wellspring, 31 holy_glare, 34 whisker_blast, 37 esuna, 40 aero, 44 holy, 48 geomancy',
        habitat: 'forest', rarity: 'common', class: 'normal',
      },

      // ---- Kuropom: Croma, the black mage (Spark Pupil > Mischief Mage)
      kuropom_spark_pupil: {
        moogle: 'Kuropom', job: 'e10_spark_pupil', base: B(45, 40, 40, 75, 50, 65),
        rate: 180, exp: 58, curve: 'fast', fur: '#dcd8e4', pom: '#ff6020', wing: '#2a2a4a',
        evo: { at: 22, to: 'kuropom_mischief_mage' },
        desc: "A grumpy little black mage who sets things alight to make a point. The point is usually 'leave me alone'.",
        abilities: ['pom_prank', 'mana_surge'],
        learn: '1 hot_coal, 1 pout, 4 zap, 8 ember_ward, 12 fire, 16 flambe, 20 mini_spell, 24 hot_coal, 28 fire_whip, 32 zap, 36 fira, 40 hot_coal',
        habitat: 'night', rarity: 'common', class: 'normal',
      },
      kuropom_mischief_mage: {
        moogle: 'Kuropom', job: 'e10_mischief_mage', type2: 'thief', base: B(65, 60, 60, 115, 75, 115),
        rate: 65, exp: 214, curve: 'fast', fur: '#dcd8e4', pom: '#ff6020', wing: '#2a2a4a',
        desc: 'Swaps your potions for hot coals and snickers behind its hat. It is secretly very fond of you.',
        abilities: ['pom_prank', 'mana_surge'],
        learn: '22 sleight_of_hand, 25 steal, 28 fire_whip, 31 hot_coal, 34 trick_attack, 37 envenom, 40 fira, 43 zap, 46 firaja',
        habitat: 'night', rarity: 'common', class: 'normal',
      },

      // ---- Kartmog: Chocobo Racing (Pit Crew > Kart Racer > Grand Prix Ace)
      kartmog_pit_crew: {
        moogle: 'Kartmog', job: 'e10_pit_crew', base: B(45, 60, 50, 30, 35, 75),
        rate: 185, exp: 56, curve: 'fast', fur: '#f4f0ea', pom: '#ff3020', wing: '#e0b020',
        evo: { at: 18, to: 'kartmog_kart_racer' },
        desc: 'Tunes karts in the pit lane faster than they can race. Its wrench never gets a chance to cool down.',
        abilities: ['accelerate', 'daredevil'],
        learn: '1 wrench, 1 yell, 4 rivet_gun, 8 dash, 11 mach_kick, 14 wrench, 18 big_shot, 22 piston_punch, 25 rivet_gun, 29 hypercharge, 33 air_anchor, 37 wrench',
        habitat: 'factory', rarity: 'common', class: 'normal',
      },
      kartmog_kart_racer: {
        moogle: 'Kartmog', job: 'e10_kart_racer', type2: 'beast', base: B(60, 85, 65, 40, 50, 110),
        rate: 100, exp: 138, curve: 'fast', fur: '#f4f0ea', pom: '#ff3020', wing: '#e0b020',
        evo: { at: 34, to: 'kartmog_grand_prix_ace' },
        desc: 'Races a chocobo-drawn kart on every track it can find. It brakes for nothing, not even corners.',
        abilities: ['accelerate', 'daredevil'],
        learn: '18 choco_kick, 21 nimble_pounce, 24 rivet_gun, 27 chocobo_rush, 30 hypercharge, 34 choco_kick, 38 horn_ram, 42 rivet_gun, 46 choco_meteor',
        habitat: 'factory', rarity: 'common', class: 'normal',
      },
      kartmog_grand_prix_ace: {
        moogle: 'Kartmog', job: 'e10_grand_prix_ace', type2: 'beast', base: B(75, 110, 80, 50, 65, 140),
        rate: 50, exp: 230, curve: 'fast', fur: '#f4f0ea', pom: '#ff3020', wing: '#e0b020',
        desc: "Champion of a hundred races and owner of one rocket it isn't allowed to use. It uses it anyway.",
        abilities: ['accelerate', 'daredevil'],
        learn: '34 piston_punch, 37 horn_ram, 40 rivet_gun, 43 mach_kick, 46 kupo_missile, 49 choco_kick',
        habitat: 'factory', rarity: 'common', class: 'normal',
      },

      // ---- Bravelin: Dissidia's warriors of harmony (Brave Duelist > Cosmos Warrior > Cosmos Champion)
      bravelin_brave_duelist: {
        moogle: 'Bravelin', job: 'e10_brave_duelist', base: B(55, 65, 55, 35, 45, 45),
        rate: 160, exp: 60, curve: 'medium', fur: '#f2f0f8', pom: '#4a7aff', wing: '#d8c070',
        evo: { at: 20, to: 'bravelin_cosmos_warrior' },
        desc: 'Picks fights with its own reflection to build up its Bravery. It wins about half the time.',
        abilities: ['battle_ready', 'limit_break', 'last_stand'],
        learn: '1 slash, 1 warcry, 4 e10_brave_attack, 8 tomahawk, 12 blade_beam, 16 slash, 20 full_break, 24 bravery, 28 vengeance, 32 slash, 36 cross_slash, 40 tomahawk',
        habitat: 'ruins', rarity: 'uncommon', class: 'normal',
      },
      bravelin_cosmos_warrior: {
        moogle: 'Bravelin', job: 'e10_cosmos_warrior', type2: 'whitemage', base: B(70, 90, 75, 50, 60, 65),
        rate: 90, exp: 142, curve: 'medium', fur: '#f2f0f8', pom: '#4a7aff', wing: '#d8c070',
        evo: { at: 36, to: 'bravelin_cosmos_champion' },
        desc: 'Answered the call of a goddess of harmony. It still trades insults with its rival before every single fight.',
        abilities: ['battle_ready', 'limit_break', 'last_stand'],
        learn: '20 holy_mace, 23 retort, 26 tomahawk, 29 cross_slash, 32 dawn_prayer, 36 slash, 40 braver, 44 holy_mace, 48 climhazzard',
        habitat: 'ruins', rarity: 'uncommon', class: 'normal',
      },
      bravelin_cosmos_champion: {
        moogle: 'Bravelin', job: 'e10_cosmos_champion', type2: 'whitemage', base: B(90, 120, 95, 60, 80, 85),
        rate: 45, exp: 240, curve: 'medium', fur: '#f2f0f8', pom: '#4a7aff', wing: '#d8c070',
        desc: "Its Bravery spills over in a golden glow. Foes who steal its nerve find there's always a little more.",
        abilities: ['battle_ready', 'limit_break', 'last_stand'],
        learn: '36 e10_brave_attack, 39 holy_mace, 42 braver, 45 tomahawk, 48 fell_cleave',
        habitat: 'ruins', rarity: 'uncommon', class: 'normal',
      },

      // ---- Mimikin: Dissidia's Manikins (one stage)
      mimikin_manikin: {
        moogle: 'Mimikin', job: 'e10_manikin', type2: 'knight', base: B(80, 75, 95, 105, 90, 50),
        rate: 50, exp: 180, curve: 'slow', fur: '#e4dcf4', pom: '#c080ff', nose: '#a060e0', wing: '#8a60c0',
        desc: "A crystal copy of some other moogle. It mimics every move it sees and can't remember whose face it's wearing.",
        abilities: ['blue_learning', 'auto_reflect'],
        learn: '1 verstone, 1 copycat, 5 shield_bash, 9 mind_blast, 13 mog_mirror, 17 verstone, 21 judgment_blade, 25 contre_sixte, 29 jolt, 33 mana_balance, 37 resolution_spell, 41 riposte, 45 verflare, 49 copycat',
        habitat: 'crater', rarity: 'rare', class: 'normal',
      },

      // ---- Omnipom: Opera Omnia (Shard Seeker > Omnia Guide)
      omnipom_shard_seeker: {
        moogle: 'Omnipom', job: 'e10_shard_seeker', base: B(55, 65, 50, 50, 50, 50),
        rate: 160, exp: 60, curve: 'medium', fur: '#f4eef8', pom: '#b070ff', wing: '#7a40c0',
        evo: { at: 24, to: 'omnipom_omnia_guide' },
        desc: 'Hunts crystal shards in a world stitched together from old stories. It sorts them by colour, then by sparkle.',
        abilities: ['raging_strikes', 'hawkeye'],
        learn: '1 arrow, 1 hunters_mark, 4 snap_shot, 8 aim_wing, 12 eagle_eye, 16 arrow, 20 flaming_arrow, 24 sidewinder, 28 snap_shot, 32 barrage, 36 aim, 40 arrow',
        habitat: 'lifestream', rarity: 'uncommon', class: 'normal',
      },
      omnipom_omnia_guide: {
        moogle: 'Omnipom', job: 'e10_omnia_guide', type2: 'bard', base: B(80, 100, 75, 80, 75, 85),
        rate: 65, exp: 216, curve: 'medium', fur: '#f4eef8', pom: '#b070ff', wing: '#7a40c0',
        desc: 'Guides lost heroes through a strange world and narrates every step like an opera. It never misses a cue.',
        abilities: ['raging_strikes', 'hawkeye'],
        learn: '24 cymbal_crash, 27 crescendo, 30 wind_song, 33 sidewinder, 36 heros_rime, 40 snap_shot, 44 apex_arrow, 48 crescendo',
        habitat: 'lifestream', rarity: 'uncommon', class: 'normal',
      },

      // ---- Rhythmog: Theatrhythm (Beat Keeper > Tempo Mage > Rhythm Virtuoso)
      rhythmog_beat_keeper: {
        moogle: 'Rhythmog', job: 'e10_beat_keeper', base: B(50, 35, 40, 70, 45, 60),
        rate: 160, exp: 60, curve: 'medium', fur: '#f6eef4', pom: '#ff60a0', wing: '#7040c0',
        evo: { at: 17, to: 'rhythmog_tempo_mage' },
        desc: 'Taps out a beat on anything nearby. It once kept a whole battle in time and nobody noticed till the end.',
        abilities: ['e10_rhythmia', 'opening_act', 'kupo_punk'],
        learn: '1 crescendo, 1 nocturne, 4 tick_tock, 8 snowman_jazz, 12 sonic_chord, 15 drop_the_beat, 17 heckle_riff, 21 crescendo, 25 moonlit_waltz, 29 requiem, 33 sonic_chord, 37 symphony',
        habitat: 'lifestream', rarity: 'uncommon', class: 'normal',
      },
      rhythmog_tempo_mage: {
        moogle: 'Rhythmog', job: 'e10_tempo_mage', type2: 'timemage', base: B(65, 45, 55, 95, 65, 85),
        rate: 85, exp: 142, curve: 'medium', fur: '#f6eef4', pom: '#ff60a0', wing: '#7040c0',
        evo: { at: 33, to: 'rhythmog_rhythm_virtuoso' },
        desc: 'Every note it plays bends time a little. Its music gathers Rhythmia the way a jar gathers fireflies.',
        abilities: ['e10_rhythmia', 'opening_act', 'kupo_punk'],
        learn: '17 e10_feature_drive, 20 tick_tock, 23 celerity, 26 haste, 29 starshower, 33 moonlit_waltz, 37 comet, 41 sonic_chord, 45 aria',
        habitat: 'lifestream', rarity: 'uncommon', class: 'normal',
      },
      rhythmog_rhythm_virtuoso: {
        moogle: 'Rhythmog', job: 'e10_rhythm_virtuoso', type2: 'timemage', base: B(80, 55, 70, 125, 85, 110),
        rate: 45, exp: 240, curve: 'medium', fur: '#f6eef4', pom: '#ff60a0', wing: '#7040c0',
        desc: 'Plays the songs of every era from memory. The crystal of music glows each time it hits a perfect note.',
        abilities: ['e10_rhythmia', 'opening_act', 'kupo_punk'],
        learn: '33 time_warp, 36 crescendo, 39 comet, 43 aria, 47 starshower',
        habitat: 'lifestream', rarity: 'uncommon', class: 'normal',
      },

      // ---- Stackmog: World of Final Fantasy's stacked mirages (Mirage Keeper > Mirage Tamer > Stack Master)
      stackmog_mirage_keeper: {
        moogle: 'Stackmog', job: 'e10_mirage_keeper', base: B(60, 60, 60, 35, 45, 40),
        rate: 185, exp: 58, curve: 'medium', fur: '#eaf2e4', pom: '#60d080', wing: '#3a8a5a',
        evo: { at: 16, to: 'stackmog_mirage_tamer' },
        desc: 'Wears a tiny mirage on its head and stands on a bigger one. Nobody is quite sure who is carrying whom.',
        abilities: ['e10_stacked', 'counter_tackle'],
        learn: '1 bite, 1 roar, 4 wildcat_swipes, 8 e10_stack_attack, 12 paw_swat, 16 bite, 20 tanglevine, 24 wildcat_swipes, 28 horn_ram, 32 bite, 36 behemoth_roar, 40 stampede',
        habitat: 'forest', rarity: 'common', class: 'normal',
      },
      stackmog_mirage_tamer: {
        moogle: 'Stackmog', job: 'e10_mirage_tamer', type2: 'summoner', base: B(80, 85, 80, 45, 65, 55),
        rate: 100, exp: 140, curve: 'medium', fur: '#eaf2e4', pom: '#60d080', wing: '#3a8a5a',
        evo: { at: 32, to: 'stackmog_stack_master' },
        desc: 'Stacks its mirages three high before every fight. The tower wobbles a lot, but it has never once fallen.',
        abilities: ['e10_stacked', 'counter_tackle'],
        learn: '16 karma_knife, 19 earth_wall, 22 wildcat_swipes, 26 e10_stack_attack, 29 mist_dragon, 32 bite, 36 horn_ram, 40 wildcat_swipes, 44 feral_frenzy',
        habitat: 'forest', rarity: 'common', class: 'normal',
      },
      stackmog_stack_master: {
        moogle: 'Stackmog', job: 'e10_stack_master', type2: 'summoner', base: B(105, 110, 100, 55, 85, 65),
        rate: 50, exp: 236, curve: 'medium', fur: '#eaf2e4', pom: '#60d080', wing: '#3a8a5a',
        desc: 'Its mirage tower reaches the clouds. Each one lends a hand, a horn or a hug when it fights.',
        abilities: ['e10_stacked', 'counter_tackle'],
        learn: '32 behemoth_roar, 35 horn_ram, 38 e10_stack_attack, 41 wildcat_swipes, 44 stampede, 48 karma_knife',
        habitat: 'forest', rarity: 'common', class: 'normal',
      },

      // ---- Prismkin: World of Final Fantasy's prisms (Prism Seeker > Imprismer)
      prismkin_prism_seeker: {
        moogle: 'Prismkin', job: 'e10_prism_seeker', base: B(50, 35, 45, 75, 60, 55),
        rate: 160, exp: 60, curve: 'medium', fur: '#eef6fc', pom: '#a0e0ff', wing: '#60a0e0',
        evo: { at: 23, to: 'prismkin_imprismer' },
        desc: 'Carries an empty prism through the snow, hoping a mirage will hop in. So far it holds only snowflakes.',
        abilities: ['blink_image', 'prism_guard', 'shadow_snare'],
        learn: '1 drizzle, 1 pout, 4 jolt, 8 diamond_dust, 12 drizzle, 16 immobilize, 20 delta_attack, 24 leaf_gust, 28 searing_light, 32 mist_dragon, 36 drizzle, 40 judgment_bolt, 44 jolt',
        habitat: 'snow', rarity: 'uncommon', class: 'normal',
      },
      prismkin_imprismer: {
        moogle: 'Prismkin', job: 'e10_imprismer', type2: 'redmage', base: B(75, 50, 65, 115, 95, 90),
        rate: 65, exp: 216, curve: 'medium', fur: '#eef6fc', pom: '#a0e0ff', wing: '#60a0e0',
        desc: 'One flash of its prism and a foe is caught inside, safe and very cross. It lets them out again for tea.',
        abilities: ['blink_image', 'prism_guard', 'shadow_snare'],
        learn: '23 verstone, 26 element_orb, 29 dispel_spell, 32 diamond_dust, 35 verstone, 38 mind_blast, 42 drizzle, 46 tidal_wave, 49 dualcast',
        habitat: 'snow', rarity: 'uncommon', class: 'normal',
      },

      // ---- Loopmog: Mobius (Card Mage > Mobius Hero)
      loopmog_card_mage: {
        moogle: 'Loopmog', job: 'e10_card_mage', base: B(55, 55, 50, 65, 45, 50),
        rate: 175, exp: 58, curve: 'medium', fur: '#f4ecf0', pom: '#ff4060', wing: '#40c0e0',
        evo: { at: 24, to: 'loopmog_mobius_hero' },
        desc: 'Draws a card for every spell and never shuffles. It insists the cards remember who they belong to.',
        abilities: ['vermilion_fury', 'wild_card'],
        learn: '1 card_trick, 1 pout, 4 verstone, 8 element_orb, 12 card_trick, 16 mind_blast, 20 manafication, 24 meditation, 28 verstone, 32 dualcast, 36 card_trick, 40 verflare',
        habitat: 'grass', rarity: 'common', class: 'normal',
      },
      loopmog_mobius_hero: {
        moogle: 'Loopmog', job: 'e10_mobius_hero', type2: 'warrior', base: B(80, 90, 70, 100, 70, 80),
        rate: 65, exp: 216, curve: 'medium', fur: '#f4ecf0', pom: '#ff4060', wing: '#40c0e0',
        desc: 'Wakes in strange lands with no memory and a deck full of answers. It always plays the right card, eventually.',
        abilities: ['vermilion_fury', 'wild_card'],
        learn: '24 verstone, 27 blade_beam, 30 zwerchhau, 33 meditation, 36 card_trick, 40 resolution_spell, 44 verflare, 48 verstone',
        habitat: 'grass', rarity: 'common', class: 'normal',
      },

      // ---- Lapimog: Brave Exvius' town and trust moogles (Town Greeter > Trust Keeper)
      lapimog_town_greeter: {
        moogle: 'Lapimog', job: 'e10_town_greeter', base: B(65, 50, 50, 45, 55, 50),
        rate: 200, exp: 55, curve: 'fast', fur: '#fbf6ec', pom: '#ffd040', wing: '#e07a9a',
        evo: { at: 20, to: 'lapimog_trust_keeper' },
        desc: "Waves at every traveler who comes to town. It knows everyone's name, and the names of their pets.",
        abilities: ['fast_learner', 'coin_up'],
        learn: '1 errand_run, 1 pout, 4 pom_bop, 8 snack_break, 12 mog_guard, 16 errand_run, 20 mognet_relay, 24 pom_bop, 28 accumulate, 32 errand_run, 36 mog_rush, 40 pom_flurry, 44 holy_mace',
        habitat: 'town', rarity: 'common', class: 'normal',
      },
      lapimog_trust_keeper: {
        moogle: 'Lapimog', job: 'e10_trust_keeper', type2: 'whitemage', base: B(100, 75, 80, 70, 85, 75),
        rate: 70, exp: 210, curve: 'fast', fur: '#fbf6ec', pom: '#ffd040', wing: '#e07a9a',
        desc: "Hands out rewards to those it trusts. Earn its trust and you'll get a gift; lose it and you'll get a speech.",
        abilities: ['fast_learner', 'coin_up'],
        learn: '20 holy_mace, 23 cure, 26 pom_bop, 29 regen_spell, 32 liturgy_bell, 35 errand_run, 38 holy_mace, 42 accumulate, 46 kupo_rush, 49 pom_flurry',
        habitat: 'town', rarity: 'common', class: 'normal',
      },

      // ---- Memokin: Record Keeper's memory crystals (Archivist > Memory Keeper > Soul Breaker)
      memokin_archivist: {
        moogle: 'Memokin', job: 'e10_archivist', base: B(55, 30, 50, 70, 60, 35),
        rate: 155, exp: 62, curve: 'slow', fur: '#ece6f2', pom: '#ffe080', wing: '#6a4a8a',
        evo: { at: 18, to: 'memokin_memory_keeper' },
        desc: 'Files every battle it watches away as a memory crystal. Its shelves rattle with old fanfares.',
        abilities: ['wait_mode', 'time_crystal', 'avenger'],
        learn: '1 tick_tock, 1 slow, 4 dig_up, 8 gravity, 12 starlight, 15 old_spell, 18 tick_tock, 22 time_capsule, 26 comet, 30 dig_up, 34 demi_spell, 38 starlight',
        habitat: 'ruins', rarity: 'uncommon', class: 'normal',
      },
      memokin_memory_keeper: {
        moogle: 'Memokin', job: 'e10_memory_keeper', type2: 'summoner', base: B(75, 40, 65, 100, 85, 50),
        rate: 85, exp: 145, curve: 'slow', fur: '#ece6f2', pom: '#ffe080', wing: '#6a4a8a',
        evo: { at: 35, to: 'memokin_soul_breaker' },
        desc: 'Hops into old paintings to mend the stories inside. It always comes back with paint on its pom-pom.',
        abilities: ['wait_mode', 'time_crystal', 'avenger'],
        learn: '18 living_muse, 21 dread_shade, 24 rewind_time, 27 pom_muse, 30 starlight, 33 demi_spell, 35 dig_up, 39 comet, 43 earthen_fury, 47 starlight',
        habitat: 'ruins', rarity: 'uncommon', class: 'normal',
      },
      memokin_soul_breaker: {
        moogle: 'Memokin', job: 'e10_soul_breaker', type2: 'summoner', base: B(95, 50, 80, 130, 105, 65),
        rate: 45, exp: 244, curve: 'slow', fur: '#ece6f2', pom: '#ffe080', wing: '#6a4a8a',
        desc: 'Keeps a memory of every hero in its crystals. When it breaks one open, a legend steps out for a moment.',
        abilities: ['wait_mode', 'time_crystal', 'avenger'],
        learn: '35 old_spell, 38 comet, 41 dread_shade, 44 meteor, 48 teraflare',
        habitat: 'ruins', rarity: 'uncommon', class: 'normal',
      },

      // ---- Explorkin: FF Explorers (Explorer > Monsterizer)
      explorkin_explorer: {
        moogle: 'Explorkin', job: 'e10_explorer', base: B(60, 65, 55, 35, 45, 60),
        rate: 160, exp: 60, curve: 'medium', fur: '#efe8d6', pom: '#ff8040', wing: '#8a7a4a',
        evo: { at: 25, to: 'explorkin_monsterizer' },
        desc: 'Maps uncharted islands with a crossbow and a pencil. The pencil is for the maps, mostly.',
        abilities: ['apex_predator', 'primal_fury'],
        learn: '1 arrow, 1 hunters_mark, 4 snap_shot, 8 leg_shot, 12 arrow, 16 seed_cannon, 20 aim_wing, 25 snap_shot, 29 sidewinder, 33 arrow, 37 shadowbind, 41 headshot',
        habitat: 'cave', rarity: 'uncommon', class: 'normal',
      },
      explorkin_monsterizer: {
        moogle: 'Explorkin', job: 'e10_monsterizer', type2: 'beast', base: B(90, 110, 80, 45, 70, 100),
        rate: 60, exp: 218, curve: 'medium', fur: '#efe8d6', pom: '#ff8040', wing: '#8a7a4a',
        desc: 'Learned to turn into the monsters it studies. It turns back in time for dinner, except on Tuesdays.',
        abilities: ['apex_predator', 'primal_fury'],
        learn: '25 bite, 28 naga_fang, 31 wildcat_swipes, 34 sidewinder, 37 morph, 41 bite, 45 feral_frenzy, 49 snap_shot',
        habitat: 'cave', rarity: 'uncommon', class: 'normal',
      },

      // ---- Synthmog: Kingdom Hearts' moogle synthesis shops (Material Hunter > Synthesist > Grand Synthesist)
      synthmog_material_hunter: {
        moogle: 'Synthmog', job: 'e10_material_hunter', base: B(55, 40, 55, 65, 50, 35),
        rate: 160, exp: 60, curve: 'medium', fur: '#f8eef2', pom: '#ff70b0', wing: '#9050c0',
        evo: { at: 18, to: 'synthmog_synthesist' },
        desc: 'Gathers shards, stones and gems for the shop. It hums a happy little tune whenever it finds a shiny one.',
        abilities: ['scrap_eater', 'overheat'],
        learn: '1 tracer_beam, 1 potion, 4 jolt, 8 shrink_ray, 12 tracer_beam, 15 swap_parts, 18 arc_relay, 22 jolt, 26 automaton, 30 tracer_beam, 34 hi_potion, 38 shrink_ray',
        habitat: 'town', rarity: 'uncommon', class: 'normal',
      },
      synthmog_synthesist: {
        moogle: 'Synthmog', job: 'e10_synthesist', type2: 'redmage', base: B(75, 50, 75, 90, 70, 50),
        rate: 90, exp: 140, curve: 'medium', fur: '#f8eef2', pom: '#ff70b0', wing: '#9050c0',
        evo: { at: 34, to: 'synthmog_grand_synthesist' },
        desc: 'Runs a synthesis shop in a quiet town. Bring it six shards and a gem and it will make something wonderful.',
        abilities: ['scrap_eater', 'overheat'],
        learn: '18 verstone, 21 dualcast, 24 element_orb, 27 hi_potion, 30 tracer_beam, 34 mana_balance, 38 verstone, 42 rainbow_drip, 46 tracer_beam',
        habitat: 'town', rarity: 'uncommon', class: 'normal',
      },
      synthmog_grand_synthesist: {
        moogle: 'Synthmog', job: 'e10_grand_synthesist', type2: 'redmage', base: B(95, 60, 95, 120, 90, 60),
        rate: 45, exp: 236, curve: 'medium', fur: '#f8eef2', pom: '#ff70b0', wing: '#9050c0',
        desc: 'Has synthesized the finest gear of any world. Its recipe book is the size of a door, and kept locked.',
        abilities: ['scrap_eater', 'overheat'],
        learn: '34 emp_field, 37 verstone, 40 mind_blast, 43 hypercharge, 46 rainbow_drip, 49 tracer_beam',
        habitat: 'town', rarity: 'uncommon', class: 'normal',
      },

      // ---- Fablepom: FF Fables' bedtime tales and pop-up duels (Storyteller > Pop-Up Duelist)
      fablepom_storyteller: {
        moogle: 'Fablepom', job: 'e10_storyteller', base: B(55, 35, 45, 70, 55, 60),
        rate: 160, exp: 60, curve: 'medium', fur: '#f4f0e6', pom: '#ff6080', wing: '#5a6ab0',
        evo: { at: 23, to: 'fablepom_popup_duelist' },
        desc: 'Reads bedtime stories to sleepy moogles. The monsters in its books sometimes peek out to listen too.',
        abilities: ['hex', 'grand_finale'],
        learn: '1 hymn, 1 nocturne, 4 sonic_chord, 8 love_sonata, 12 hymn, 16 snowman_jazz, 20 lullaby, 24 sonic_chord, 28 dusk_requiem, 32 hymn, 36 moonlit_waltz, 40 symphony',
        habitat: 'night', rarity: 'uncommon', class: 'normal',
      },
      fablepom_popup_duelist: {
        moogle: 'Fablepom', job: 'e10_popup_duelist', type2: 'summoner', base: B(80, 50, 65, 105, 85, 105),
        rate: 65, exp: 216, curve: 'medium', fur: '#f4f0e6', pom: '#ff6080', wing: '#5a6ab0',
        desc: 'Opens its book and the pages leap up to fight. Every duel ends happily ever after, for it at least.',
        abilities: ['hex', 'grand_finale'],
        learn: '23 pom_muse, 26 hymn, 29 spook, 32 living_muse, 35 dusk_requiem, 38 sonic_chord, 42 moonlit_waltz, 46 aria, 49 living_muse',
        habitat: 'night', rarity: 'uncommon', class: 'normal',
      },

      // ---- Picrokin: Pictlogica's picture puzzles (one stage)
      picrokin_puzzle_sage: {
        moogle: 'Picrokin', job: 'e10_puzzle_sage', type2: 'machinist', base: B(75, 60, 80, 110, 85, 70),
        rate: 55, exp: 175, curve: 'slow', fur: '#eef0f4', pom: '#3a8aff', wing: '#3a6ab0',
        desc: 'Solves picture puzzles one square at a time. When the picture is finally finished, it hits you with it.',
        abilities: ['rapid_fire', 'quickcast'],
        learn: '1 starshower, 1 tracer_beam, 5 slow, 9 gravity, 13 starshower, 17 shrink_ray, 21 chronosphere, 25 dualcast, 29 tracer_beam, 33 comet, 37 starshower, 41 arc_relay, 45 graviga, 49 pearl_volley',
        habitat: 'factory', rarity: 'rare', class: 'normal',
      },

      // ---- Brigapom: Airborne Brigade's airship fleets (Sky Deckhand > Brigadier > Air Marshal)
      brigapom_sky_deckhand: {
        moogle: 'Brigapom', job: 'e10_sky_deckhand', base: B(50, 65, 45, 35, 40, 65),
        rate: 180, exp: 58, curve: 'medium', fur: '#eef2f8', pom: '#ffd040', wing: '#4a7ab0',
        evo: { at: 19, to: 'brigapom_brigadier' },
        desc: 'Swabs the airship deck and dreams of flying it. It ties itself to the mast on windy days, just in case.',
        abilities: ['wyvern_wings', 'pom_wings'],
        learn: '1 talon, 1 tailwind, 4 hurdle, 8 harpoon, 12 talon, 16 skyward, 19 soul_jump, 23 hurdle, 27 dive_bomb, 31 talon, 35 wyrmwind, 39 high_jump',
        habitat: 'sky', rarity: 'common', class: 'normal',
      },
      brigapom_brigadier: {
        moogle: 'Brigapom', job: 'e10_brigadier', type2: 'machinist', base: B(65, 90, 60, 45, 55, 95),
        rate: 100, exp: 140, curve: 'medium', fur: '#eef2f8', pom: '#ffd040', wing: '#4a7ab0',
        evo: { at: 36, to: 'brigapom_air_marshal' },
        desc: 'Leads a brigade of airships into the clouds. Its orders are loud, short and mostly about lunch.',
        abilities: ['wyvern_wings', 'pom_wings'],
        learn: '19 rivet_gun, 22 air_anchor, 25 wyrmwind, 28 talon, 32 big_shot, 36 rivet_gun, 40 dive_bomb, 44 talon, 48 satellite_beam',
        habitat: 'sky', rarity: 'common', class: 'normal',
      },
      brigapom_air_marshal: {
        moogle: 'Brigapom', job: 'e10_air_marshal', type2: 'machinist', base: B(80, 120, 80, 55, 70, 120),
        rate: 50, exp: 240, curve: 'medium', fur: '#eef2f8', pom: '#ffd040', wing: '#4a7ab0',
        desc: 'Commands a whole fleet from the bridge. When it raises its lance, the sky gets very crowded very fast.',
        abilities: ['wyvern_wings', 'pom_wings'],
        learn: '36 angel_wing, 39 huton, 42 talon, 45 stardiver, 48 kupo_missile',
        habitat: 'sky', rarity: 'common', class: 'normal',
      },

      // ---- Grandkupo: Grandmasters (one stage)
      grandkupo_grandmaster: {
        moogle: 'Grandkupo', job: 'e10_grandmaster', type2: 'monk', base: B(90, 105, 85, 50, 80, 90),
        rate: 50, exp: 185, curve: 'slow', fur: '#f6eedc', pom: '#ffb020', wing: '#a03020',
        desc: 'Mastered every job it ever tried, then retired to a mountain top to master napping. It is still learning.',
        abilities: ['zen_mind', 'job_mastery', 'brawler_soul'],
        learn: '1 palm_strike, 1 accumulate, 5 onion_slash, 9 one_inch_punch, 13 palm_strike, 17 blade_beam, 21 mantra, 25 onion_slash, 29 perfect_counter, 33 job_strike, 37 palm_strike, 41 earth_render, 45 final_heaven, 49 holy_mace',
        habitat: 'mountain', rarity: 'rare', class: 'normal',
      },

      // ---- Kaosmog: Stranger of Paradise, the pseudo-legendary (Swordsman > Void Warrior > Tyrant)
      kaosmog_swordsman: {
        moogle: 'Kaosmog', job: 'e10_swordsman', base: B(60, 70, 55, 40, 35, 40),
        rate: 45, exp: 62, curve: 'slow', fur: '#d4d0d8', pom: '#a020ff', nose: '#801828', wing: '#2a1a3a',
        evo: { at: 30, to: 'kaosmog_void_warrior' },
        desc: 'Wanders with a big sword and one thought: find Chaos and end it. It plays loud music to keep calm.',
        abilities: ['dark_crystal', 'defiance', 'spoils_of_war'],
        learn: '1 slash, 1 warcry, 5 bokken, 9 maim, 13 blade_beam, 17 slash, 21 full_break, 25 inner_beast, 28 bokken, 32 e10_soul_burst, 36 cross_slash, 40 slash, 44 onslaught',
        habitat: 'volcano', rarity: 'rare', class: 'pseudo',
      },
      kaosmog_void_warrior: {
        moogle: 'Kaosmog', job: 'e10_void_warrior', type2: 'summoner', base: B(80, 105, 80, 55, 50, 60),
        rate: 45, exp: 155, curve: 'slow', fur: '#d4d0d8', pom: '#a020ff', nose: '#801828', wing: '#2a1a3a',
        evo: { at: 45, to: 'kaosmog_tyrant' },
        desc: "The darker the crystals grow, the stronger it gets. It insists everything is fine. It isn't.",
        abilities: ['dark_crystal', 'defiance', 'spoils_of_war'],
        learn: '30 karma_knife, 32 e10_soul_burst, 35 nightfall, 38 bokken, 41 cross_slash, 44 darkside, 48 fell_cleave',
        habitat: 'volcano', rarity: 'rare', class: 'pseudo',
      },
      kaosmog_tyrant: {
        moogle: 'Kaosmog', job: 'e10_tyrant', type2: 'summoner', base: B(110, 145, 105, 75, 75, 90),
        rate: 45, exp: 260, curve: 'slow', fur: '#d4d0d8', pom: '#a020ff', nose: '#801828', wing: '#2a1a3a',
        desc: 'It hunted Chaos to the end of time and found it in the mirror. Nothing stands in its way twice.',
        abilities: ['shadowbringer', 'defiance', 'spoils_of_war'],
        learn: '45 inner_release, 46 bayonet, 48 fell_cleave, 50 e10_soul_burst',
        habitat: 'volcano', rarity: 'rare', class: 'pseudo',
      },

      // ---- Deckmog: the Trading Card Game (Backup > Forward)
      deckmog_backup: {
        moogle: 'Deckmog', job: 'e10_backup', base: B(60, 60, 65, 35, 55, 45),
        rate: 185, exp: 57, curve: 'fast', fur: '#f2f0ea', pom: '#ff4040', wing: '#3a5ab0',
        evo: { at: 22, to: 'deckmog_forward' },
        desc: 'Stays in the back row and keeps the crystal points coming. It shuffles its deck when nervous, so always.',
        abilities: ['iaijutsu', 'raw_power'],
        learn: '1 keen_edge, 1 cover, 4 shield_bash, 8 sheltron, 12 keen_edge, 16 rend_weapon, 20 retribution, 24 shield_bash, 28 shield_wall, 32 keen_edge, 36 judgment_blade, 40 aegis_slam',
        habitat: 'town', rarity: 'common', class: 'normal',
      },
      deckmog_forward: {
        moogle: 'Deckmog', job: 'e10_forward', base: B(85, 110, 85, 50, 70, 90),
        rate: 65, exp: 214, curve: 'fast', fur: '#f2f0ea', pom: '#ff4040', wing: '#3a5ab0',
        desc: 'Charged out of the back row once and never went back. Its EX Bursts arrive at the worst possible moment.',
        abilities: ['iaijutsu', 'raw_power'],
        learn: '22 slash, 25 cross_slash, 28 gil_toss, 31 keen_edge, 34 opening_gambit, 37 slash, 41 blade_beam, 45 fell_cleave, 49 jackpot',
        habitat: 'town', rarity: 'common', class: 'normal',
      },
    },

    // ------------------------------------------------------------------ the Kupodex order (line after line)
    dex: [
      'caravamog_caravanner', 'caravamog_caravan_chief',
      'myrrhpom_chalice_porter', 'myrrhpom_myrrh_gatherer', 'myrrhpom_crystal_warden',
      'nestlin_nest_tender', 'nestlin_nest_elder',
      'inkupo_stamp_collector', 'inkupo_stamp_master',
      'clavamog_tipa_guard', 'clavamog_clavat_hero',
      'liltimog_lilty_page', 'liltimog_lilty_lancer', 'liltimog_alfitaria_knight',
      'yukepom_yuke_pupil', 'yukepom_shella_magus', 'yukepom_magicite_sage',
      'selkipom_leuda_scamp', 'selkipom_racketeer',
      'miasmog_miasma_wisp', 'miasmog_miasma_stream',
      'telekupo_sky_courier', 'telekupo_crystal_bearer',
      'delvemog_trap_finder', 'delvemog_delver', 'delvemog_floor_master',
      'shiropom_novice_healer', 'shiropom_chocobo_medic',
      'kuropom_spark_pupil', 'kuropom_mischief_mage',
      'kartmog_pit_crew', 'kartmog_kart_racer', 'kartmog_grand_prix_ace',
      'bravelin_brave_duelist', 'bravelin_cosmos_warrior', 'bravelin_cosmos_champion',
      'mimikin_manikin',
      'omnipom_shard_seeker', 'omnipom_omnia_guide',
      'rhythmog_beat_keeper', 'rhythmog_tempo_mage', 'rhythmog_rhythm_virtuoso',
      'stackmog_mirage_keeper', 'stackmog_mirage_tamer', 'stackmog_stack_master',
      'prismkin_prism_seeker', 'prismkin_imprismer',
      'loopmog_card_mage', 'loopmog_mobius_hero',
      'lapimog_town_greeter', 'lapimog_trust_keeper',
      'memokin_archivist', 'memokin_memory_keeper', 'memokin_soul_breaker',
      'explorkin_explorer', 'explorkin_monsterizer',
      'synthmog_material_hunter', 'synthmog_synthesist', 'synthmog_grand_synthesist',
      'fablepom_storyteller', 'fablepom_popup_duelist',
      'picrokin_puzzle_sage',
      'brigapom_sky_deckhand', 'brigapom_brigadier', 'brigapom_air_marshal',
      'grandkupo_grandmaster',
      'kaosmog_swordsman', 'kaosmog_void_warrior', 'kaosmog_tyrant',
      'deckmog_backup', 'deckmog_forward',
    ],
  });
})();
