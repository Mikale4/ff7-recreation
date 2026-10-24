// Kupomon expansion pack 'era7' (docs/KUPOMON_CONTENT.md): Ivalice. FF XII (an airship mechanic, the sky pirates of a
// desert city, the Empire's Judges and its laboratory, the License Board, the Zodiac espers, the long-eared folk of the
// Wood, the scaled folk, the greedy pig-folk, the masked plains-folk, the Mist and the hunt board), FF Tactics, Tactics
// Advance and A2 (the moogle jobs, a noble squire turned heretic, the Zodiac Braves and the Lucavi, the Arithmetician,
// the Mystic, the Orator, the Geomancer, Draw Out, a steel giant from a mining town) and Vagrant Story's Riskbreaker in
// a cursed city. 31 lines, 71 moogles; homage in our own words. The pseudo-legendary is Lucamog (Stonebearer > Fell
// Templar > Lucavi). Hurdy and Gurdy live on in Crankpom and Mapkin (the legends pack has the brothers themselves).
(function () {
  const KP = FF7.kupomon;
  const J = (name, type, look) => ({ name, type, look });
  const B = (hp, atk, def, mag, res, spd) => ({ hp, atk, def, mag, res, spd });

  // each line's shared fields (its name, colours, home, abilities); the stages add job, stats, evolution, text, moves
  const NONO = { moogle: 'Nono', fur: '#f4ece2', pom: '#ff5a3a', wing: '#c06a40', habitat: 'sky', rarity: 'uncommon', class: 'normal', curve: 'medium', abilities: ['overheat', 'featherweight', 'swiftcast'] };
  const LOWPOM = { moogle: 'Lowpom', fur: '#f0e4d0', pom: '#ffb020', wing: '#8a5a30', habitat: 'town', rarity: 'common', class: 'normal', curve: 'medium', abilities: ['sneak_attack', 'coin_up'] };
  const LAWKIN = { moogle: 'Lawkin', fur: '#e8e4e0', pom: '#d8b040', wing: '#3a3a44', habitat: 'sky', rarity: 'uncommon', class: 'normal', curve: 'medium', abilities: ['adamant_shell', 'last_bastion'] };
  const LUCAMOG = { moogle: 'Lucamog', fur: '#d8d0e0', pom: '#c02040', wing: '#3a1a2a', nose: '#8a1a3a', habitat: 'crater', rarity: 'rare', class: 'pseudo', curve: 'slow', rate: 45 };
  const KUPOULVE = { moogle: 'Kupoulve', fur: '#f6eedc', pom: '#ffd040', wing: '#3a6ac0', habitat: 'grass', rarity: 'common', class: 'normal', curve: 'medium', abilities: ['kupo_spirit', 'defiance'] };
  const ZODIPOM = { moogle: 'Zodipom', fur: '#e4ecf4', pom: '#60c0ff', wing: '#2a4a7a', habitat: 'lifestream', rarity: 'uncommon', class: 'normal', curve: 'medium', abilities: ['summon_bond', 'esper_eater'] };
  const DRAKLIN = { moogle: 'Draklin', fur: '#ece8e0', pom: '#40e0b0', wing: '#3a5a5a', habitat: 'factory', rarity: 'uncommon', class: 'normal', curve: 'medium', abilities: ['mana_surge', 'spellcraft', 'mana_tempest'] };
  const PIPERPOM = { moogle: 'Piperpom', fur: '#f4f0e0', pom: '#90d050', wing: '#6a8a3a', habitat: 'forest', rarity: 'common', class: 'normal', curve: 'fast', abilities: ['primal_fury', 'thick_wool'] };
  const RISKPOM = { moogle: 'Riskpom', fur: '#e8dcd0', pom: '#c02020', wing: '#4a2a2a', habitat: 'ruins', rarity: 'uncommon', class: 'normal', curve: 'medium', abilities: ['e7_risk_meter', 'last_stand', 'daredevil'] };
  const AJORAPOM = { moogle: 'Ajorapom', fur: '#fbfaf4', pom: '#ffe070', wing: '#d8c890', habitat: 'snow', rarity: 'uncommon', class: 'normal', curve: 'slow', abilities: ['devotion', 'hold_fast', 'lightbringer'] };
  const VIERKIN = { moogle: 'Vierkin', fur: '#f8f4f0', pom: '#c0e0ff', wing: '#5a8a5a', habitat: 'forest', rarity: 'uncommon', class: 'normal', curve: 'medium', abilities: ['hawkeye', 'raging_strikes', 'deadeye'] };
  const TALLYPOM = { moogle: 'Tallypom', fur: '#ece8f4', pom: '#e0c040', wing: '#4a3a7a', habitat: 'night', rarity: 'uncommon', class: 'normal', curve: 'medium', abilities: ['quickening', 'piercing_gaze'] };
  const CRANKPOM = { moogle: 'Crankpom', fur: '#f2ece0', pom: '#ff9030', wing: '#8a5a30', habitat: 'town', rarity: 'common', class: 'normal', curve: 'fast', abilities: ['kupo_punk', 'opening_act', 'song_crystal'] };
  const MAPKIN = { moogle: 'Mapkin', fur: '#f0e6d4', pom: '#40a0e0', wing: '#a07040', habitat: 'desert', rarity: 'common', class: 'normal', curve: 'medium', abilities: ['coin_up', 'expose'] };
  const POLKAPOM = { moogle: 'Polkapom', fur: '#fbf0ea', pom: '#ff6090', wing: '#e07040', habitat: 'beach', rarity: 'common', class: 'normal', curve: 'fast', abilities: ['sylph_dance', 'grand_finale'] };
  const OINKPOM = { moogle: 'Oinkpom', fur: '#f0dcd4', pom: '#a0602a', wing: '#7a4a3a', nose: '#e07080', habitat: 'swamp', rarity: 'common', class: 'normal', curve: 'medium', abilities: ['sleepless_fury', 'spoils_of_war', 'berserker_rage'] };
  const POMLANCE = { moogle: 'Pomlance', fur: '#f6f2ea', pom: '#ff3a5a', wing: '#c05050', habitat: 'mountain', rarity: 'common', class: 'normal', curve: 'medium', abilities: ['kupo_spirit', 'auto_wall'] };
  const BLUNDERPOM = { moogle: 'Blunderpom', fur: '#eef2f4', pom: '#3a7ae0', wing: '#2a4a6a', habitat: 'sea', rarity: 'common', class: 'normal', curve: 'medium', abilities: ['gun_mastery', 'raging_strikes'] };
  const TOSSPOM = { moogle: 'Tosspom', fur: '#f6ece0', pom: '#ff8020', wing: '#c04020', habitat: 'volcano', rarity: 'uncommon', class: 'normal', curve: 'fast', abilities: ['bomb_body', 'kupo_luck', 'pom_prank'] };
  const HATPOM = { moogle: 'Hatpom', fur: '#ece6dc', pom: '#8040e0', wing: '#3a2a6a', habitat: 'night', rarity: 'common', class: 'normal', curve: 'medium', abilities: ['mana_surge', 'quickcast'] };
  const KWEHPOM = { moogle: 'Kwehpom', fur: '#f8ecc0', pom: '#ffcc20', wing: '#e0a020', habitat: 'grass', rarity: 'common', class: 'normal', curve: 'fast', abilities: ['auto_haste', 'wyvern_wings'] };
  const SCALEPOM = { moogle: 'Scalepom', fur: '#e8eadc', pom: '#60b060', wing: '#5a7a4a', habitat: 'desert', rarity: 'common', class: 'normal', curve: 'medium', abilities: ['riddle_of_fire', 'brawler_soul'] };
  const TERRAPOM = { moogle: 'Terrapom', fur: '#ece4d4', pom: '#80c040', wing: '#6a5a3a', habitat: 'cave', rarity: 'uncommon', class: 'normal', curve: 'medium', abilities: ['mako_spring', 'vermilion_fury'] };
  const GRIDPOM = { moogle: 'Gridpom', fur: '#f2eee2', pom: '#40a0ff', wing: '#a0a0c0', habitat: 'town', rarity: 'common', class: 'normal', curve: 'fast', abilities: ['fast_learner', 'blue_learning', 'e7_gambit_logic'] };
  const YINPOM = { moogle: 'Yinpom', fur: '#e8e0ec', pom: '#202020', wing: '#6a4a6a', habitat: 'swamp', rarity: 'uncommon', class: 'normal', curve: 'medium', abilities: ['hex', 'shared_fate'] };
  const KATANPOM = { moogle: 'Katanpom', fur: '#f0ece4', pom: '#3a5aff', wing: '#3a3a5a', habitat: 'mountain', rarity: 'uncommon', class: 'normal', curve: 'medium', abilities: ['iaijutsu', 'last_stand'] };
  const DARAVPOM = { moogle: 'Daravpom', fur: '#f0eae0', pom: '#a040c0', wing: '#5a4a6a', habitat: 'night', rarity: 'uncommon', class: 'normal', curve: 'medium', abilities: ['charm', 'pom_prank'] };
  const GARIPOM = { moogle: 'Garipom', fur: '#ece0cc', pom: '#e05a2a', wing: '#8a5a3a', habitat: 'grass', rarity: 'uncommon', class: 'normal', curve: 'slow', abilities: ['auto_regen', 'menace'] };

  KP.content('era7', {
    // ------------------------------------------------------------------ jobs: one per stage, the outfit growing grander
    jobs: {
      // Nono: the airship mechanic
      e7_tinker: J('Mog Tinker', 'machinist', { hat: 'goggles', body: 'toolbelt', weapon: 'screwdriver', g1: '#b8742a', g2: '#4a5a6a' }),
      e7_airwright: J('Airwright', 'machinist', { hat: 'flightcap', body: 'gadgetpack', weapon: 'wrench', g1: '#8a5030', g2: '#c8ccd4' }),
      e7_chief_engineer: J('Chief Engineer', 'machinist', { hat: 'gearhelm', body: 'clockwork', weapon: 'gearstaff', g1: '#6a4020', g2: '#e8b040', cape: '#8a2a20', extra: ['jetpack'] }),
      // Lowpom: a desert city's street kid who takes to the sky
      e7_urchin: J('Urchin', 'thief', { hat: 'bandana', body: 'rags', weapon: 'dagger', g1: '#c8a070', g2: '#7a4a2a' }),
      e7_air_corsair: J('Air Corsair', 'thief', { hat: 'tricorne', body: 'vest', weapon: 'flintpistol', g1: '#3a5a7a', g2: '#d8b070' }),
      e7_sky_rogue: J('Sky Rogue', 'thief', { hat: 'plumed', body: 'duelcoat', weapon: 'revolver', g1: '#4a2a1a', g2: '#e8d8a0', cape: '#7a1a20' }),
      // Lawkin: the Empire's Judges
      e7_cadet: J('Imperial Cadet', 'knight', { hat: 'mailcoif', body: 'tabard', weapon: 'shortsword', shield: 'round', g1: '#6a6a72', g2: '#a03028' }),
      e7_judge: J('Judge', 'knight', { hat: 'bascinet', body: 'darkplate', weapon: 'broadsword', shield: 'kite', g1: '#3a3a44', g2: '#c8a040', cape: '#2a2a34' }),
      e7_magister: J('Judge Magister', 'knight', { hat: 'darkknight', body: 'runeplate', weapon: 'greatsword', shield: 'tower', g1: '#24242c', g2: '#d8b040', cape: '#5a1418' }),
      // Lucamog (the pseudo-legendary): a zodiac stone's bearer, fallen, and what the stone wanted all along
      e7_stonebearer: J('Stonebearer', 'summoner', { hat: 'hood', body: 'robe', weapon: 'orb', g1: '#4a3a5a', g2: '#c8a0ff' }),
      e7_fell_templar: J('Fell Templar', 'summoner', { hat: 'templar', body: 'darkplate', weapon: 'darksword', g1: '#3a1a2a', g2: '#c040a0', cape: '#2a0a1a' }),
      e7_lucavi: J('Lucavi', 'summoner', { hat: 'dkhorns', body: 'scale', weapon: 'nethercore', g1: '#2a0a1a', g2: '#ff3060', extra: ['dragonwings', 'wisps'], shadowFace: true, eyes: '#ff2040' }),
      // Kupoulve: a noble house's squire who ends up a heretic
      e7_squire: J('Noble Squire', 'freelancer', { hat: 'none', body: 'doublet', weapon: 'shortsword', g1: '#3a6ac0', g2: '#d8b060' }),
      e7_vanguard: J('Vanguard', 'freelancer', { hat: 'helm', body: 'jacket', weapon: 'broadsword', shield: 'round', g1: '#2a4a9a', g2: '#d8c070' }),
      e7_heretic: J('Heretic', 'freelancer', { hat: 'hachigane', body: 'armor', weapon: 'holysword', g1: '#2a3a6a', g2: '#e8e0c0', cape: '#c8a040', glow: '#a0d0ff' }),
      // Zodipom: the Zodiac espers and their binders
      e7_glyph_reader: J('Glyph Reader', 'summoner', { hat: 'loupe', body: 'scarf', weapon: 'scroll', g1: '#2a6a8a', g2: '#e8d8a0' }),
      e7_esper_binder: J('Esper Binder', 'summoner', { hat: 'runecirclet', body: 'magiccape', weapon: 'grimoire', g1: '#1a4a6a', g2: '#60e0ff' }),
      e7_zodiac_caller: J('Zodiac Caller', 'summoner', { hat: 'horncrown', body: 'starcoat', weapon: 'starglobe', g1: '#1a2a5a', g2: '#ffe080', extra: ['halo'] }),
      // Draklin: the Imperial laboratory and its magic-drinking stone
      e7_lab_chemist: J('Lab Chemist', 'blackmage', { hat: 'spectacles', body: 'coat', weapon: 'flask', g1: '#e8eef0', g2: '#3a8a6a', liquid: '#a0ff60' }),
      e7_nethicist: J('Nethicist', 'blackmage', { hat: 'monocle', body: 'apron', weapon: 'orb', g1: '#3a2a4a', g2: '#80ffd0' }),
      e7_lab_director: J('Lab Director', 'blackmage', { hat: 'gadgethelm', body: 'longcoat', weapon: 'nethercore', g1: '#2a2a30', g2: '#40ffc0', cape: '#4a1a2a' }),
      // Piperpom: the moogle Animist
      e7_herd_piper: J('Herd Piper', 'beast', { hat: 'feather', body: 'vest', weapon: 'flute', g1: '#4a8a6a', g2: '#e8c060' }),
      e7_mog_animist: J('Mog Animist', 'beast', { hat: 'pelt', body: 'fleece', weapon: 'crook', g1: '#7a5a30', g2: '#fff8e8' }),
      e7_wildspeaker: J('Wildspeaker', 'beast', { hat: 'beastmask', body: 'leafcloak', weapon: 'oakstaff', g1: '#3a6a3a', g2: '#d8a040', extra: ['falcon'] }),
      // Riskpom: the Riskbreaker in the cursed city
      e7_peacekeeper: J('Peacekeeper', 'warrior', { hat: 'band', body: 'leather', weapon: 'shortsword', g1: '#5a3a2a', g2: '#a8a8b0' }),
      e7_riskbreaker: J('Riskbreaker', 'warrior', { hat: 'none', body: 'harness', weapon: 'broadsword', g1: '#3a2a22', g2: '#c03030' }),
      e7_blood_sin: J('Blood-Sin', 'warrior', { hat: 'cowl', body: 'cloak', weapon: 'runesword', g1: '#2a1a1a', g2: '#ff3040', cape: '#5a0a14', glow: '#ff5050' }),
      // Ajorapom: the Zodiac Braves of the holy order
      e7_acolyte: J('Acolyte', 'whitemage', { hat: 'hood', body: 'surplice', weapon: 'candle', g1: '#f4f0e6', g2: '#5a8ad0' }),
      e7_holy_brave: J('Holy Brave', 'whitemage', { hat: 'crest', body: 'plate', weapon: 'holysword', shield: 'kite', g1: '#e8e8f0', g2: '#5a8ad0' }),
      e7_zodiac_brave: J('Zodiac Brave', 'whitemage', { hat: 'saintband', body: 'royal', weapon: 'excalibur', shield: 'tower', g1: '#f8f4ea', g2: '#e8c040', cape: '#f0e8d0', extra: ['halo'], glow: '#fff0a0' }),
      // Vierkin: the long-eared archers of the Wood
      e7_wood_warden: J('Wood Warden', 'ranger', { hat: 'wolfears', body: 'leafskirt', weapon: 'bow', g1: '#f4f0ea', g2: '#4a7a3a' }),
      e7_greenbow: J('Greenbow', 'ranger', { hat: 'wolfears', body: 'quiver', weapon: 'longbow', g1: '#ece8f4', g2: '#3a6a3a' }),
      e7_wood_seer: J('Wood Seer', 'ranger', { hat: 'wolfears', body: 'catsuit', weapon: 'longbow', g1: '#f8f4ff', g2: '#2a2a3a', cape: '#3a6a3a', extra: ['wisps'] }),
      // Tallypom: the Time Mage who became an Arithmetician
      e7_chronist: J('Chronist', 'timemage', { hat: 'cap', body: 'scarf', weapon: 'clockstaff', g1: '#5a4a8a', g2: '#d8c060' }),
      e7_calculator: J('Calculator', 'timemage', { hat: 'quillcap', body: 'waistcoat', weapon: 'abacus', g1: '#2a3a5a', g2: '#e8d070' }),
      e7_arithmancer: J('Arithmancer', 'timemage', { hat: 'observatory', body: 'mantle', weapon: 'astrolabe', g1: '#1a1a3a', g2: '#80e0ff', cape: '#3a2a6a' }),
      // Crankpom: a moogle engineer who builds instruments (Hurdy's homage)
      e7_tune_tinker: J('Tune Tinker', 'bard', { hat: 'beanie', body: 'apron', weapon: 'bell', g1: '#7a4a2a', g2: '#e0b040' }),
      e7_troubadour: J('Troubadour', 'bard', { hat: 'beret', body: 'gadgetpack', weapon: 'harp', g1: '#8a3a2a', g2: '#d8c070' }),
      // Mapkin: the wandering map-seller of the sands (Gurdy's homage)
      e7_mapseller: J('Mapseller', 'ranger', { hat: 'headwrap', body: 'backpack', weapon: 'scroll', g1: '#c8a060', g2: '#5a7a3a' }),
      e7_wayfinder: J('Wayfinder', 'ranger', { hat: 'turban', body: 'poncho', weapon: 'telescope', g1: '#a06030', g2: '#e8d8a0', cape: '#4a6a8a' }),
      // Polkapom: the Dancer
      e7_street_dancer: J('Street Dancer', 'bard', { hat: 'kerchief', body: 'streamers', weapon: 'baton', g1: '#e07040', g2: '#40b0c0' }),
      e7_nameless_dancer: J('Nameless Dancer', 'bard', { hat: 'veil', body: 'gown', weapon: 'fans', g1: '#6a2a8a', g2: '#ffd060', cape: '#a02060' }),
      // Oinkpom: the greedy pig-folk's brute
      e7_brute: J('Brute', 'warrior', { hat: 'plaster', body: 'tanktop', weapon: 'mace', g1: '#8a5a3a', g2: '#5a5a5a' }),
      e7_pit_boss: J('Pit Boss', 'warrior', { hat: 'mohawk', body: 'furcollar', weapon: 'flail', g1: '#6a2a2a', g2: '#c8a040' }),
      // Pomlance: the Mog Knight grown into a Moogle Knight
      e7_pom_lancer: J('Pom Lancer', 'freelancer', { hat: 'kettle', body: 'vest', weapon: 'lance', shield: 'round', g1: '#d04040', g2: '#e8e0c8' }),
      e7_moogle_knight: J('Moogle Knight', 'freelancer', { hat: 'mogknight', body: 'plate', weapon: 'lance', shield: 'kite', g1: '#3a5ab0', g2: '#f0d060', cape: '#c02838' }),
      // Blunderpom: the moogle Gunner, then Fusilier
      e7_mog_gunner: J('Mog Gunner', 'ranger', { hat: 'sailor', body: 'bandolier', weapon: 'musket', g1: '#2a4a7a', g2: '#d8b050' }),
      e7_mog_fusilier: J('Mog Fusilier', 'ranger', { hat: 'captain', body: 'bandolier', weapon: 'gatling', g1: '#1a2a4a', g2: '#c8a040', cape: '#2a3a5a' }),
      // Tosspom: the moogle Juggler
      e7_gil_juggler: J('Gil Juggler', 'thief', { hat: 'coinscarf', body: 'vest', weapon: 'balls', g1: '#e0a020', g2: '#5a3a8a' }),
      e7_bomb_juggler: J('Bomb Juggler', 'thief', { hat: 'domino', body: 'fringe', weapon: 'balls', g1: '#c03020', g2: '#2a2a2a', cape: '#e08020' }),
      // Hatpom: the moogle Black Mage, then Time Mage
      e7_mog_black_mage: J('Mog Black Mage', 'blackmage', { hat: 'witch', body: 'poncho', weapon: 'wand', g1: '#3a2a6a', g2: '#ffd040', shadowFace: true, eyes: '#ffe040' }),
      e7_mog_time_mage: J('Mog Time Mage', 'blackmage', { hat: 'nightcap', body: 'mantle', weapon: 'clockstaff', g1: '#5a3a8a', g2: '#e8d070', shadowFace: true, eyes: '#80e0ff' }),
      // Kwehpom: the moogle Chocobo Knight
      e7_choco_groom: J('Chocobo Groom', 'beast', { hat: 'straw', body: 'apron', weapon: 'feedpole', g1: '#e8c030', g2: '#6a8a3a' }),
      e7_choco_cavalier: J('Choco Cavalier', 'beast', { hat: 'chocohelm', body: 'featherarmor', weapon: 'lance', shield: 'kite', mount: { kind: 'chocobo' }, g1: '#e8b020', g2: '#3a5ab0', cape: '#3a5ab0' }),
      // Scalepom: the scaled folk's brawler and white monk
      e7_scale_brawler: J('Scale Brawler', 'monk', { hat: 'sweatband', body: 'wraps', weapon: 'handwraps', g1: '#6a8a4a', g2: '#d8b080' }),
      e7_holy_fist: J('Holy Fist', 'monk', { hat: 'lotus', body: 'whitegi', weapon: 'cestus', g1: '#f0ece0', g2: '#5a9a5a', cape: '#4a8a4a' }),
      // Terrapom: the Geomancer
      e7_dowser: J('Dowser', 'beast', { hat: 'explorer', body: 'overalls', weapon: 'sprig', g1: '#6a5a3a', g2: '#5aa04a' }),
      e7_terramancer: J('Terramancer', 'beast', { hat: 'leafcrown', body: 'robe', weapon: 'broadsword', shield: 'round', g1: '#4a6a2a', g2: '#c8a050', cape: '#6a4a2a' }),
      // Gridpom: the License Board (and its gambits)
      e7_licensee: J('Licensee', 'freelancer', { hat: 'none', body: 'satchel', weapon: 'clipboard', g1: '#c8b070', g2: '#3a5a8a' }),
      e7_license_master: J('License Master', 'freelancer', { hat: 'laurel', body: 'tailcoat', weapon: 'rapier', g1: '#2a3a7a', g2: '#e8c040', cape: '#c0a040' }),
      // Yinpom: the Mystic's yin-yang magic
      e7_mystic: J('Mystic', 'redmage', { hat: 'shawl', body: 'robe', weapon: 'ringstaff', g1: '#5a2a5a', g2: '#e0e0e0' }),
      e7_augur: J('Augur', 'redmage', { hat: 'halfmask', body: 'cloak', weapon: 'book', g1: '#1a1a1a', g2: '#f0f0f0', cape: '#7a2a7a' }),
      // Katanpom: the Samurai's Draw Out
      e7_iaido_pupil: J('Iaido Pupil', 'warrior', { hat: 'band', body: 'hakama', weapon: 'bokken', g1: '#3a4a7a', g2: '#e8e0d0' }),
      e7_kensei: J('Kensei', 'warrior', { hat: 'kabuto', body: 'hakama', weapon: 'katana', g1: '#5a1a2a', g2: '#d8b040', cape: '#2a2a4a', extra: ['wisps'], glow: '#a0f0ff' }),
      // Daravpom: the Orator (and its famous sleepy lecture)
      e7_lecturer: J('Lecturer', 'bard', { hat: 'mortarboard', body: 'bowtie', weapon: 'pointer', g1: '#3a3a5a', g2: '#c8a060' }),
      e7_silver_tongue: J('Silver Tongue', 'bard', { hat: 'tophat', body: 'suit', weapon: 'revolver', g1: '#2a2a3a', g2: '#d8d8e0', cape: '#5a2a4a' }),
      // Garipom: the masked folk of the windy plain
      e7_mask_bearer: J('Mask Bearer', 'beast', { hat: 'spiritmask', body: 'furs', weapon: 'quarterstaff', g1: '#7a4a2a', g2: '#d8a050' }),
      e7_garif_elder: J('Garif Elder', 'beast', { hat: 'shaman', body: 'mane', weapon: 'gnarled', g1: '#5a3a20', g2: '#40c0a0', cape: '#8a4a2a', extra: ['wisps'] }),
      // the one-stage kinds: the hunt board, a steel giant from a mining town, the Mist
      e7_mark_hunter: J('Mark Hunter', 'ranger', { hat: 'trapperhat', body: 'furs', weapon: 'crossbow', g1: '#6a4a2a', g2: '#c8a060', cape: '#5a3a2a' }),
      e7_steel_giant: J('Steel Giant', 'machinist', { hat: 'robohead', body: 'tekarmor', weapon: 'gauntlet', g1: '#7a6040', g2: '#d03020' }),
      e7_quickener: J('Quickener', 'whitemage', { hat: 'none', body: 'windcape', weapon: 'orbstaff', g1: '#80c0ff', g2: '#f0f0ff', extra: ['wisps'] }),
    },

    // ------------------------------------------------------------------ signature moves (the star moogles' own)
    moves: {
      e7_red_card: { name: 'Red Card', type: 'knight', power: 0, acc: 100, cd: 2, prio: -6, forceSwitch: true, sig: true, desc: "A Judge's red card: the foe is sent off for one of its teammates." },
      e7_break_art: { name: 'Break Art', type: 'warrior', power: 100, acc: 100, cd: 2, hpCost: 1 / 8, ignoreDefStages: true, flags: ['contact', 'slice'], sig: true, desc: 'Pays 1/8 of its HP for a sword art that ignores Defense boosts.' },
      e7_unholy_dark: { name: 'Unholy Darkness', type: 'blackmage', power: 120, acc: 90, cd: 3, status: ['zombie', 30], sig: true, desc: 'A Lucavi spell of black flame. May turn the foe into a Zombie.' },
      e7_draw_out: { name: 'Draw Out', type: 'summoner', power: 80, acc: 100, cd: 2, cat: 'physical', self: { spd: 1 }, flags: ['slice'], sig: true, desc: "Calls a famous blade's spirit for a ghostly cut. Its Speed rises." },
    },

    // ------------------------------------------------------------------ signature abilities
    abilities: {
      e7_lucavi_pact: { name: 'Lucavi Pact', desc: 'Its own-type moves hit 1.2x; Doom and Zombie never touch it.', boost: { types: ['own'], mul: 1.2 }, noStatus: ['doom', 'zombie'] },
      e7_risk_meter: { name: 'Risk Meter', desc: 'Crits likelier and they hit 1.5x, but its aim falls to 0.9x.', crit: 1, sniper: 1.5, accMul: 0.9 },
      e7_gambit_logic: { name: 'Gambit Logic', desc: '1.3x when it moves last; always crits a foe with an ailment.', analytic: true, merciless: true },
    },

    // ------------------------------------------------------------------ species, line by line
    species: {
      // ---- Nono: Mog Tinker > Airwright > Chief Engineer (Machinist, then Machinist / Dragoon): quick and handy
      nono_tinker: { ...NONO, job: 'e7_tinker', base: B(48, 62, 52, 30, 40, 68), rate: 190, exp: 60, evo: { at: 18, to: 'nono_airwright' },
        desc: 'Fixes airship engines by ear. It hums to the bolts while it works, and swears they tighten faster that way, kupo.',
        learn: '1 wrench, 1 pout, 4 rivet_gun, 7 blue_screw, 10 oil_change, 13 scattergun, 16 gizmo' },
      nono_airwright: { ...NONO, job: 'e7_airwright', type2: 'dragoon', base: B(65, 86, 70, 40, 55, 92), rate: 90, exp: 142, evo: { at: 34, to: 'nono_chief' },
        desc: 'Graduated from fixing airships to building them. Its best design flies sideways, which it insists is a feature.',
        learn: '18 hurdle, 21 air_anchor, 24 tailwind, 27 piston_punch, 30 thrust, 33 drill' },
      nono_chief: { ...NONO, job: 'e7_chief_engineer', type2: 'dragoon', base: B(80, 112, 85, 50, 68, 110), rate: 45, exp: 235,
        desc: 'Chief engineer of the fastest ship in the sky. In a storm it keeps both paws on the engine and never lets you see it worry.',
        learn: '34 skyward, 37 rocket_punch, 40 rivet_gun, 43 highwind, 46 eureka' },

      // ---- Lowpom: Urchin > Air Corsair > Sky Rogue (Thief, then Thief / Ranger): fast and frail
      lowpom_urchin: { ...LOWPOM, job: 'e7_urchin', base: B(42, 62, 38, 30, 35, 78), rate: 210, exp: 56, evo: { at: 17, to: 'lowpom_corsair' },
        desc: 'A back-street scamp that pinches fruit for the other strays. Between thefts it stares up at the airships and sighs.',
        learn: '1 steal, 1 trip, 4 quickhit, 8 sleight_of_hand, 11 thievery, 14 mug' },
      lowpom_corsair: { ...LOWPOM, job: 'e7_air_corsair', type2: 'ranger', base: B(58, 86, 52, 40, 48, 106), rate: 100, exp: 138, evo: { at: 33, to: 'lowpom_rogue' },
        desc: "Stowed away on a sky pirate's ship and simply refused to leave. Now it swings through the rigging and pockets clouds.",
        learn: '17 snap_shot, 20 coup_de_grace, 23 huton, 26 repelling_shot, 29 buckshot, 32 bunshin' },
      lowpom_rogue: { ...LOWPOM, job: 'e7_sky_rogue', type2: 'ranger', base: B(72, 115, 65, 50, 60, 133), rate: 50, exp: 228,
        desc: 'Calls itself the leading man of its own story. It flies the fastest ship in the sky and has never once paid for parts.',
        learn: '33 twin_shot, 36 turn_the_blade, 39 steal, 42 eagle_eye, 45 headshot' },

      // ---- Lawkin: Imperial Cadet > Judge > Judge Magister (Knight, then Knight / Warrior): slow, armoured, stern
      lawkin_cadet: { ...LAWKIN, job: 'e7_cadet', base: B(60, 62, 72, 25, 50, 36), rate: 160, exp: 64, evo: { at: 20, to: 'lawkin_judge' },
        desc: 'Drills in the Imperial yards with a sword taller than its pom-pom. It salutes everything, including the doors.',
        learn: '1 shield_bash, 1 warcry, 4 rend_armor, 8 sheltron, 11 bounce, 14 power_break, 17 rend_weapon' },
      lawkin_judge: { ...LAWKIN, job: 'e7_judge', type2: 'warrior', base: B(78, 88, 98, 35, 68, 48), rate: 75, exp: 150, evo: { at: 36, to: 'lawkin_magister' },
        desc: "Wears a Judge's dark plate and speaks only in verdicts. The verdict is usually 'guilty', followed by a small 'kupo'.",
        learn: '20 slash, 23 e7_red_card, 26 aegis_slam, 29 bounce, 32 hold_the_line, 35 full_break' },
      lawkin_magister: { ...LAWKIN, job: 'e7_magister', type2: 'warrior', base: B(95, 118, 125, 45, 85, 60), rate: 45, exp: 245,
        desc: 'A Judge Magister of the Empire. Its great helm hides its face, and also its pom-pom, which it finds undignified.',
        learn: '36 judgment_blade, 39 slash, 42 fell_cleave, 45 entrench, 48 e7_red_card' },

      // ---- Lucamog (pseudo-legendary): Stonebearer > Fell Templar > Lucavi (Summoner, then Summoner / Black Mage)
      lucamog_stonebearer: { ...LUCAMOG, job: 'e7_stonebearer', base: B(52, 45, 48, 65, 50, 40), exp: 65, evo: { at: 30, to: 'lucamog_templar' },
        abilities: ['dreadwyrm_trance', 'tonberry_grudge', 'dark_crystal'],
        desc: 'Found a glowing zodiac stone and has not let go of it since. At night the stone whispers, and it whispers back.',
        learn: '1 haunt, 1 spook, 4 scathe, 8 dread_shade, 12 ectoplasm, 16 drain, 20 grave_breath, 24 haunt, 28 nightfall' },
      lucamog_templar: { ...LUCAMOG, job: 'e7_fell_templar', type2: 'blackmage', base: B(72, 62, 68, 95, 72, 61), exp: 155, evo: { at: 45, to: 'lucamog_lucavi' },
        abilities: ['dreadwyrm_trance', 'tonberry_grudge', 'dark_crystal'],
        desc: 'Swore an oath to a church it no longer believes in. Its blade drinks the light, and its pom has gone the colour of wine.',
        learn: '30 darkness, 33 phantom_fade, 36 scathe, 39 voodoo_doll, 42 runaway_train' },
      lucamog_lucavi: { ...LUCAMOG, job: 'e7_lucavi', type2: 'blackmage', base: B(100, 90, 92, 135, 95, 88), exp: 260,
        abilities: ['e7_lucavi_pact', 'tonberry_grudge', 'dark_crystal'],
        desc: "A Lucavi that wears a moogle's shape out of habit. When it spreads its wings, even the stars look away.",
        learn: '45 e7_unholy_dark, 46 haunt, 48 nightfall, 50 calamity' },

      // ---- Kupoulve: Noble Squire > Vanguard > Heretic (Freelancer, then Freelancer / Warrior): grows into a hero
      kupoulve_squire: { ...KUPOULVE, job: 'e7_squire', base: B(52, 55, 50, 40, 45, 52), rate: 220, exp: 55, evo: { at: 15, to: 'kupoulve_vanguard' },
        desc: 'A squire from a noble moogle house. It throws stones, shouts encouragement and stores up courage, mostly in that order.',
        learn: '1 pom_bop, 1 accumulate, 4 slash, 7 kupo_toss, 10 dash, 13 yell' },
      kupoulve_vanguard: { ...KUPOULVE, job: 'e7_vanguard', base: B(70, 80, 70, 52, 62, 70), rate: 110, exp: 135, evo: { at: 32, to: 'kupoulve_heretic' },
        desc: 'Leads from the front, which it says is the only honest place to be. It has been told it is too kind for war.',
        learn: '15 bokken, 18 job_strike, 21 cross_slash, 24 accumulate, 27 slash, 30 ultima_charge' },
      kupoulve_heretic: { ...KUPOULVE, job: 'e7_heretic', type2: 'warrior', base: B(90, 108, 88, 70, 80, 92), rate: 45, exp: 235,
        desc: 'Branded a heretic for telling the truth. The histories forgot its name, but every moogle it saved still remembers.',
        learn: '32 mog_rush, 35 crescent, 38 pom_bop, 41 accumulate, 44 hallowed_bolt, 47 ultima_charge' },

      // ---- Zodipom: Glyph Reader > Esper Binder > Zodiac Caller (Summoner, then Summoner / Time Mage): a slow caster
      zodipom_reader: { ...ZODIPOM, job: 'e7_glyph_reader', base: B(50, 30, 45, 68, 60, 47), rate: 180, exp: 62, evo: { at: 18, to: 'zodipom_binder' },
        desc: 'Reads the star-glyphs carved in old shrines. Some of them are spells. Most of them are very, very old graffiti.',
        learn: '1 leaf_gust, 1 slow, 4 starlight, 8 searing_light, 12 diamond_dust, 15 sylph_breeze' },
      zodipom_binder: { ...ZODIPOM, job: 'e7_esper_binder', base: B(68, 40, 60, 95, 80, 62), rate: 85, exp: 145, evo: { at: 35, to: 'zodipom_caller' },
        desc: 'Binds an esper into each page of its book. It keeps the book shut at night, because the espers argue.',
        learn: '18 starshower, 21 hellfire, 24 judgment_bolt, 27 chronosphere, 30 starlight, 33 graviga' },
      zodipom_caller: { ...ZODIPOM, job: 'e7_zodiac_caller', type2: 'timemage', base: B(88, 50, 75, 125, 105, 80), rate: 45, exp: 240,
        desc: 'Has bound every sign of the zodiac. When it calls all twelve at once, the sky has to shuffle over and make room.',
        learn: '35 aerial_blast, 38 meteor, 41 leaf_gust, 44 haste, 47 eternal_breath' },

      // ---- Draklin: Lab Chemist > Nethicist > Lab Director (Black Mage, then Black Mage / Machinist): a glass cannon
      draklin_chemist: { ...DRAKLIN, job: 'e7_lab_chemist', base: B(45, 35, 40, 72, 50, 58), rate: 170, exp: 62, evo: { at: 19, to: 'draklin_nethicist' },
        desc: 'Assists in an Imperial laboratory, where it mostly sweeps up after explosions. It labels every scorch mark.',
        learn: '1 zap, 1 envenom, 4 fire, 8 thunder, 12 bio_mire, 16 aspir' },
      draklin_nethicist: { ...DRAKLIN, job: 'e7_nethicist', type2: 'machinist', base: B(60, 48, 55, 100, 65, 80), rate: 80, exp: 146, evo: { at: 36, to: 'draklin_director' },
        desc: 'Studies nethicite, a stone that drinks magic. It has since learned that the stone also drinks eyebrows.',
        learn: '19 tracer_beam, 22 shrink_ray, 25 triplecast, 28 automaton, 31 zap, 34 nether_blaze' },
      draklin_director: { ...DRAKLIN, job: 'e7_lab_director', type2: 'machinist', base: B(75, 60, 70, 135, 82, 98), rate: 45, exp: 238,
        desc: "Runs the lab's top floor and chats with a friend nobody else can see. Its experiments are brilliant and slightly on fire.",
        learn: '36 arc_relay, 39 hypercharge, 42 tracer_beam, 45 flare' },

      // ---- Piperpom: Herd Piper > Mog Animist > Wildspeaker (Beast, then Beast / Bard): sturdy and soothing
      piperpom_piper: { ...PIPERPOM, job: 'e7_herd_piper', base: B(60, 52, 55, 40, 50, 43), rate: 200, exp: 58, evo: { at: 16, to: 'piperpom_animist' },
        desc: 'Pipes a little tune and the sheep come running. So do the wolves, which is why it learned a second tune.',
        learn: '1 crook, 1 roar, 4 acorn, 7 tanglevine, 10 wool, 13 sheep_count' },
      piperpom_animist: { ...PIPERPOM, job: 'e7_mog_animist', type2: 'bard', base: B(82, 72, 72, 52, 68, 58), rate: 100, exp: 140, evo: { at: 33, to: 'piperpom_wildspeaker' },
        desc: 'Speaks to every beast in its own tongue. It once talked a Behemoth out of a bad mood and into a nap.',
        learn: '16 crescendo, 19 snowman_jazz, 22 chocobo_rush, 25 nocturne, 28 crook, 31 spider_silk' },
      piperpom_wildspeaker: { ...PIPERPOM, job: 'e7_wildspeaker', type2: 'bard', base: B(105, 95, 92, 65, 88, 72), rate: 50, exp: 232,
        desc: 'The whole forest answers its call. When it plays the last note, every creature in earshot charges the same way.',
        learn: '33 wellspring, 36 love_sonata, 39 acorn, 42 stampede, 45 sheep_count' },

      // ---- Riskpom: Peacekeeper > Riskbreaker > Blood-Sin (Warrior, then Warrior / Red Mage): hits hard, takes risks
      riskpom_agent: { ...RISKPOM, job: 'e7_peacekeeper', base: B(55, 70, 50, 45, 40, 50), rate: 160, exp: 64, evo: { at: 20, to: 'riskpom_riskbreaker' },
        desc: 'A peacekeeper sent alone into a cursed city. It files long reports that nobody reads, and that suits it fine.',
        learn: '1 slash, 1 warcry, 4 maim, 7 retort, 10 tomahawk, 13 inner_beast, 17 dispel_spell' },
      riskpom_riskbreaker: { ...RISKPOM, job: 'e7_riskbreaker', type2: 'redmage', base: B(72, 98, 66, 62, 54, 66), rate: 75, exp: 148, evo: { at: 36, to: 'riskpom_bloodsin' },
        desc: 'Breaks rules, curses and most swords. The deeper it goes into the ruined city, the bigger the risks it takes.',
        learn: '20 riposte, 23 e7_break_art, 26 zwerchhau, 29 embolden, 32 slash, 35 vengeance' },
      riskpom_bloodsin: { ...RISKPOM, job: 'e7_blood_sin', type2: 'redmage', base: B(90, 128, 80, 80, 68, 84), rate: 45, exp: 240,
        desc: 'A dark sigil burns on its back now. It could rule the cursed city, but it would rather walk out of it, kupo.',
        learn: '36 cross_slash, 39 inner_release, 42 tomahawk, 45 redoublement, 48 e7_break_art' },

      // ---- Ajorapom: Acolyte > Holy Brave > Zodiac Brave (White Mage, then White Mage / Knight): a holy wall
      ajorapom_acolyte: { ...AJORAPOM, job: 'e7_acolyte', base: B(58, 40, 55, 62, 60, 35), rate: 170, exp: 62, evo: { at: 18, to: 'ajorapom_brave' },
        desc: 'Climbs the snowy temple steps each dawn to ring the bell. It has never missed a morning, even with frozen ears.',
        learn: '1 banish, 1 regen_spell, 4 aero, 8 flash, 12 temperance, 15 holy_glare' },
      ajorapom_brave: { ...AJORAPOM, job: 'e7_holy_brave', type2: 'knight', base: B(75, 60, 78, 85, 80, 47), rate: 80, exp: 148, evo: { at: 34, to: 'ajorapom_zodiac' },
        desc: 'Sworn to a holy order, it carries a stone said to hold a star. It polishes the stone, and the star, every night.',
        learn: '18 holy_blade, 21 banishga, 24 dawn_prayer, 27 aero, 30 cure, 33 divine_veil' },
      ajorapom_zodiac: { ...AJORAPOM, job: 'e7_zodiac_brave', type2: 'knight', base: B(95, 80, 100, 110, 100, 55), rate: 45, exp: 242,
        desc: 'One of the twelve Braves of legend, or so it says. Its light drove back a demon once, and it still talks about it.',
        learn: '34 liturgy_bell, 37 holy_glare, 40 sentinel, 43 dawn_prayer, 46 holy_ray' },

      // ---- Vierkin: Wood Warden > Greenbow > Wood Seer (Ranger, then Ranger / White Mage): a swift archer
      vierkin_warden: { ...VIERKIN, job: 'e7_wood_warden', base: B(45, 65, 40, 45, 45, 70), rate: 180, exp: 60, evo: { at: 17, to: 'vierkin_greenbow' },
        desc: "Its long ears hear every whisper in the wood. It wears them up when it's listening and flat when it's sulking.",
        learn: '1 arrow, 1 hunters_mark, 4 snap_shot, 8 seed_cannon, 11 aim, 14 arrow, 16 leg_shot' },
      vierkin_greenbow: { ...VIERKIN, job: 'e7_greenbow', base: B(60, 90, 52, 58, 58, 95), rate: 85, exp: 142, evo: { at: 34, to: 'vierkin_seer' },
        desc: 'Left its forest home to see the world, which its elders say it will regret. So far it mostly regrets the food.',
        learn: '17 twin_arrow, 20 aim_wing, 23 snap_shot, 26 shadowbind, 29 web_snare, 32 arrow' },
      vierkin_seer: { ...VIERKIN, job: 'e7_wood_seer', type2: 'whitemage', base: B(75, 118, 65, 78, 75, 118), rate: 45, exp: 236,
        desc: 'Hears the voice of the Wood and answers it with arrows. It does not age, it says; it simply becomes more right.',
        learn: '34 regen_spell, 37 eagle_eye, 40 snap_shot, 43 holy_mace, 46 apex_arrow' },

      // ---- Tallypom: Chronist > Calculator > Arithmancer (Time Mage, then Time Mage / Red Mage): a fast caster
      tallypom_chronist: { ...TALLYPOM, job: 'e7_chronist', base: B(48, 30, 42, 68, 55, 62), rate: 170, exp: 60, evo: { at: 19, to: 'tallypom_calculator' },
        desc: 'Counts the seconds between ticks to make sure time is still working. So far, it reports, time is fine.',
        learn: '1 tick_tock, 1 slow, 4 starshower, 8 forecast, 12 prime_strike, 16 cold_front' },
      tallypom_calculator: { ...TALLYPOM, job: 'e7_calculator', base: B(62, 40, 55, 95, 72, 86), rate: 85, exp: 142, evo: { at: 36, to: 'tallypom_arithmancer' },
        desc: "Casts spells by arithmetic. If your level is a prime number, worry. It checks everyone's level, twice.",
        learn: '19 starlight, 22 demi_spell, 25 haste, 28 resolution_spell, 31 starshower, 34 comet' },
      tallypom_arithmancer: { ...TALLYPOM, job: 'e7_arithmancer', type2: 'redmage', base: B(78, 50, 68, 125, 92, 112), rate: 45, exp: 236,
        desc: "Has worked out the sum of the universe. It won't say what it is, only that it is smaller than you'd hope.",
        learn: '36 x_zone, 39 dualcast, 42 starlight, 45 meteor, 48 resolution_spell' },

      // ---- Crankpom: Tune Tinker > Troubadour (Bard, then Bard / Machinist): a musical engineer
      crankpom_tinker: { ...CRANKPOM, job: 'e7_tune_tinker', base: B(52, 40, 48, 68, 55, 62), rate: 190, exp: 58, evo: { at: 22, to: 'crankpom_troubadour' },
        desc: 'Builds its own instruments out of airship scrap. The first one exploded, and the crowd agreed it was the best part.',
        learn: '1 strum, 1 nocturne, 5 crescendo, 9 heckle_riff, 13 tracer_beam, 17 snowman_jazz, 20 strum' },
      crankpom_troubadour: { ...CRANKPOM, job: 'e7_troubadour', type2: 'machinist', base: B(75, 55, 70, 100, 80, 90), rate: 70, exp: 210,
        desc: 'Plays a hurdy-gurdy it built itself, with a crank, three bellows and a tiny engine. The engine sings the harmony.',
        learn: '22 shrink_ray, 25 drop_the_beat, 28 power_chord, 31 tracer_beam, 34 arc_relay, 38 symphony, 42 strum, 46 drop_the_beat' },

      // ---- Mapkin: Mapseller > Wayfinder (Ranger, then Ranger / Time Mage): steady and well-travelled
      mapkin_mapseller: { ...MAPKIN, job: 'e7_mapseller', base: B(55, 60, 50, 45, 45, 60), rate: 180, exp: 60, evo: { at: 24, to: 'mapkin_wayfinder' },
        desc: "Sells maps on every road in the desert. The maps are right, it insists; it's the desert that keeps moving.",
        learn: '1 arrow, 1 hunters_mark, 5 leg_shot, 9 buckshot, 13 web_snare, 17 sidewinder, 21 arrow' },
      mapkin_wayfinder: { ...MAPKIN, job: 'e7_wayfinder', type2: 'timemage', base: B(80, 92, 72, 65, 65, 91), rate: 70, exp: 215,
        desc: 'Knows a shortcut to anywhere, and a longer one to everywhere else. It has never been lost, only early.',
        learn: '24 slow, 27 dig_up, 30 twin_shot, 33 camouflage, 36 arrow, 39 quick_spell, 42 broadside, 45 old_spell' },

      // ---- Polkapom: Street Dancer > Nameless Dancer (Bard, then Bard / White Mage): quick, charming, dizzying
      polkapom_dancer: { ...POLKAPOM, job: 'e7_street_dancer', base: B(50, 45, 42, 62, 52, 74), rate: 190, exp: 58, evo: { at: 21, to: 'polkapom_nameless' },
        desc: 'Dances for coins by the shore. When the coins run out it keeps dancing, because the gulls are watching.',
        learn: '1 hymn, 1 love_sonata, 5 snowman_jazz, 9 nocturne, 12 crescendo, 16 dusk_requiem, 19 regen_spell' },
      polkapom_nameless: { ...POLKAPOM, job: 'e7_nameless_dancer', type2: 'whitemage', base: B(70, 65, 60, 90, 75, 110), rate: 70, exp: 212,
        desc: 'Dances steps no one taught it and no one can name. Foes forget to fight; one forgot its own name for a day.',
        learn: '21 holy_glare, 24 hymn, 27 wind_song, 31 banishga, 35 moonlit_waltz, 39 crescendo, 43 holy_glare, 46 aria' },

      // ---- Oinkpom: Brute > Pit Boss (Warrior, then Warrior / Monk): huge, hardy and slow
      oinkpom_brute: { ...OINKPOM, job: 'e7_brute', base: B(75, 72, 58, 25, 35, 30), rate: 200, exp: 60, evo: { at: 26, to: 'oinkpom_pitboss' },
        desc: 'Big, round and fond of shiny things, especially yours. It collects debts by sitting on people until they pay.',
        learn: '1 axe_chop, 1 warcry, 5 gil_toss, 9 tsuppari, 13 inner_beast, 17 grapple, 21 full_break' },
      oinkpom_pitboss: { ...OINKPOM, job: 'e7_pit_boss', type2: 'monk', base: B(120, 118, 92, 35, 58, 47), rate: 70, exp: 218,
        desc: 'Runs the fighting pits out in the bog and keeps the best seat for itself. It never takes a bet it might lose.',
        learn: '26 belly_bump, 29 shiko, 32 axe_chop, 35 onslaught, 38 combo_chain, 42 brute_force, 46 inner_beast' },

      // ---- Pomlance: Pom Lancer > Moogle Knight (Freelancer, then Freelancer / Knight): a sturdy little guard
      pomlance_lancer: { ...POMLANCE, job: 'e7_pom_lancer', base: B(55, 58, 62, 35, 50, 50), rate: 190, exp: 60, evo: { at: 22, to: 'pomlance_knight' },
        desc: "Practises lance drills with a broom handle. It peeks round its shield to check that you're impressed, kupo.",
        learn: '1 pom_bop, 1 mog_guard, 4 shield_bash, 8 peekaboo, 12 pom_flurry, 16 mog_shield, 20 bounce' },
      pomlance_knight: { ...POMLANCE, job: 'e7_moogle_knight', type2: 'knight', base: B(80, 88, 95, 45, 75, 67), rate: 70, exp: 210,
        desc: 'A true Moogle Knight, sworn to guard its clan. Its charge is a blur of pom-pom, steel and very small war cries.',
        learn: '22 mog_rush, 25 mog_mirror, 28 shield_wall, 31 shield_bash, 34 pom_bop, 37 pom_flurry, 40 aegis_slam, 43 accumulate, 46 ultima_charge' },

      // ---- Blunderpom: Mog Gunner > Mog Fusilier (Ranger, then Ranger / Machinist): trick shots, then broadsides
      blunderpom_gunner: { ...BLUNDERPOM, job: 'e7_mog_gunner', base: B(50, 68, 52, 40, 45, 55), rate: 180, exp: 60, evo: { at: 24, to: 'blunderpom_fusilier' },
        desc: "Fires trick shots that blind, hush or stop a foe. It can't hit a barn door, but it can hit the doorknob.",
        learn: '1 buckshot, 1 aim, 5 arm_shot, 9 snap_shot, 13 dark_shot, 17 leg_shot, 21 buckshot' },
      blunderpom_fusilier: { ...BLUNDERPOM, job: 'e7_mog_fusilier', type2: 'machinist', base: B(72, 108, 75, 55, 62, 83), rate: 70, exp: 212,
        desc: 'Sails as gunner on a merchant ship and keeps pirates honest at long range. It names every shot it fires.',
        learn: '24 scattergun, 27 rivet_gun, 31 musket, 35 mine_layer, 38 buckshot, 41 dark_shot, 44 big_shot, 47 powder_keg' },

      // ---- Tosspom: Gil Juggler > Bomb Juggler (Thief, then Thief / Bard): quick and full of tricks
      tosspom_juggler: { ...TOSSPOM, job: 'e7_gil_juggler', base: B(48, 62, 42, 50, 42, 76), rate: 180, exp: 60, evo: { at: 23, to: 'tosspom_bomber' },
        desc: "Juggles coins it found and coins it 'found'. It keeps nine in the air at once, and you'll be one short after.",
        learn: '1 juggle, 1 trip, 4 dice, 8 gil_toss, 12 knife_juggle, 16 pilfer, 20 makibishi' },
      tosspom_bomber: { ...TOSSPOM, job: 'e7_bomb_juggler', type2: 'bard', base: B(68, 95, 60, 75, 60, 112), rate: 70, exp: 212,
        desc: 'Juggles lit bombs for crowds at the foot of the fire mountain. The act has never gone wrong. Its eyebrows disagree.',
        learn: '23 flame_rod, 26 wildfire_oil, 29 dice, 32 cymbal_crash, 35 heckle_riff, 38 knife_juggle, 41 pilfer, 44 flame_rod, 47 throw' },

      // ---- Hatpom: Mog Black Mage > Mog Time Mage (Black Mage, then Black Mage / Time Mage): fast and fragile
      hatpom_blackmage: { ...HATPOM, job: 'e7_mog_black_mage', base: B(45, 30, 40, 75, 55, 70), rate: 190, exp: 60, evo: { at: 25, to: 'hatpom_timemage' },
        desc: 'A moogle under a hat three sizes too big. Its spells are bigger still, though some come out the wrong end.',
        learn: '1 fire, 1 slow, 4 blizzard, 8 thunder, 12 sleep_spell, 16 fira, 20 scathe, 23 blizzara' },
      hatpom_timemage: { ...HATPOM, job: 'e7_mog_time_mage', type2: 'timemage', base: B(65, 40, 55, 110, 80, 110), rate: 65, exp: 214,
        desc: 'Learned to bend time after one spell too many went off early. Now it casts Haste on itself just to be punctual.',
        learn: '25 haste, 28 celerity, 31 fire, 35 thundara, 39 demi_spell, 42 scathe, 45 haste, 48 firaga' },

      // ---- Kwehpom: Chocobo Groom > Choco Cavalier (Beast, then Beast / Dragoon): a fast rider
      kwehpom_groom: { ...KWEHPOM, job: 'e7_choco_groom', base: B(52, 64, 48, 35, 42, 74), rate: 200, exp: 58, evo: { at: 20, to: 'kwehpom_cavalier' },
        desc: "Brushes, feeds and sings to its clan's chocobos. They follow it everywhere, mostly because it carries the greens.",
        learn: '1 choco_kick, 1 roar, 4 hurdle, 8 nimble_pounce, 12 quicksand, 16 choco_kick' },
      kwehpom_cavalier: { ...KWEHPOM, job: 'e7_choco_cavalier', type2: 'dragoon', base: B(75, 100, 70, 45, 60, 112), rate: 70, exp: 210,
        desc: 'Rides into battle on a chocobo it raised by hand. The bird does the kicking; the moogle does the shouting.',
        learn: '20 leg_sweep, 23 spear_wall, 26 chocobo_rush, 29 thrust, 33 soul_jump, 37 wyrm_dance, 41 choco_kick, 45 choco_meteor' },

      // ---- Scalepom: Scale Brawler > Holy Fist (Monk, then Monk / White Mage): a sturdy brawler
      scalepom_brawler: { ...SCALEPOM, job: 'e7_scale_brawler', base: B(62, 68, 60, 35, 45, 45), rate: 180, exp: 60, evo: { at: 24, to: 'scalepom_holyfist' },
        desc: 'A scaly brawler from the back alleys of a desert city. It thinks moogles ought to have tails and is growing one.',
        learn: '1 palm_strike, 1 warcry, 4 holy_mace, 8 quick_jab, 12 whirlwind, 16 chakra, 20 aero' },
      scalepom_holyfist: { ...SCALEPOM, job: 'e7_holy_fist', type2: 'whitemage', base: B(92, 105, 85, 50, 68, 62), rate: 70, exp: 214,
        desc: 'Trained in a desert temple until its fists glowed white. It mends friends with one paw and flattens foes with the other.',
        learn: '24 earth_render, 27 holy_mace, 30 mantra, 33 palm_strike, 36 aero, 39 chakra, 42 holy_mace, 44 combo_chain, 47 six_sided_star' },

      // ---- Terrapom: Dowser > Terramancer (Beast, then Beast / Red Mage): reads the ground, casts with it
      terrapom_dowser: { ...TERRAPOM, job: 'e7_dowser', base: B(55, 45, 55, 65, 55, 45), rate: 180, exp: 60, evo: { at: 24, to: 'terrapom_terramancer' },
        desc: "Taps the ground with a twig and knows what lies beneath: water, gold, or someone's long-lost lunch.",
        learn: '1 verstone, 1 quicksand, 4 tanglevine, 8 jolt, 12 geomancy, 16 dust_devil, 20 verstone' },
      terrapom_terramancer: { ...TERRAPOM, job: 'e7_terramancer', type2: 'redmage', base: B(80, 62, 78, 98, 80, 62), rate: 70, exp: 212,
        desc: 'Fights with the land itself. It reads every patch of ground like a spellbook, and every pit like a punchline.',
        learn: '24 wellspring, 27 aqua_breath, 30 jolt, 34 whisker_blast, 38 verstone, 41 geomancy, 44 wellspring, 47 verflare' },

      // ---- Gridpom: Licensee > License Master (Freelancer, then Freelancer / Red Mage): good at a bit of everything
      gridpom_licensee: { ...GRIDPOM, job: 'e7_licensee', base: B(55, 55, 52, 50, 52, 56), rate: 230, exp: 56, evo: { at: 22, to: 'gridpom_master' },
        desc: "Carries a board of little squares, each a skill it hopes to earn. So far it has filled one square: 'Carry Board'.",
        learn: '1 pom_bop, 1 pout, 4 jolt, 8 accumulate, 12 dash, 16 riposte, 20 kupo_holler' },
      gridpom_master: { ...GRIDPOM, job: 'e7_license_master', type2: 'redmage', base: B(80, 82, 75, 78, 75, 80), rate: 70, exp: 208,
        desc: 'Has unlocked every license on its board and drawn new squares in the margins. It can do anything, a bit loudly.',
        learn: '22 manafication, 25 en_garde, 28 pom_bop, 31 dualcast, 34 spellstrike, 38 accumulate, 41 riposte, 44 manafication, 47 royal_decree' },

      // ---- Yinpom: Mystic > Augur (Red Mage, then Red Mage / Black Mage): spreads ailments, shrugs off magic
      yinpom_mystic: { ...YINPOM, job: 'e7_mystic', base: B(55, 30, 45, 65, 65, 50), rate: 170, exp: 62, evo: { at: 25, to: 'yinpom_augur' },
        desc: 'Reads fortunes in swamp water and is right about half the time. The other half, it makes them come true.',
        learn: '1 ruin, 1 flash, 4 miasma, 8 jolt, 12 mind_blast, 16 mirage, 20 ruin, 23 hush' },
      yinpom_augur: { ...YINPOM, job: 'e7_augur', type2: 'blackmage', base: B(82, 42, 65, 98, 95, 70), rate: 65, exp: 212,
        desc: 'Weaves black magic and white into one knot. Foes it glares at forget, freeze, fall asleep, or all three.',
        learn: '25 drain, 28 grave_breath, 31 jolt, 34 dispel_spell, 38 ruin, 41 triplecast, 44 sleep_spell, 47 verflare' },

      // ---- Katanpom: Iaido Pupil > Kensei (Warrior, then Warrior / Summoner): quick blades with spirits in them
      katanpom_pupil: { ...KATANPOM, job: 'e7_iaido_pupil', base: B(50, 68, 50, 50, 45, 62), rate: 170, exp: 62, evo: { at: 25, to: 'katanpom_kensei' },
        desc: 'Practises the quick-draw on falling leaves. So far it has cut nine hundred leaves and one very surprised bird.',
        learn: '1 bokken, 1 warcry, 5 karma_knife, 9 slash, 13 mighty_strikes, 17 crescent, 21 bokken' },
      katanpom_kensei: { ...KATANPOM, job: 'e7_kensei', type2: 'summoner', base: B(72, 105, 70, 75, 65, 88), rate: 60, exp: 216,
        desc: 'Calls the spirit sleeping in each famous blade, and the blade answers. It bows to its sword before every fight.',
        learn: '25 e7_draw_out, 28 earth_wall, 31 iai, 34 haunt, 37 slash, 40 e7_draw_out, 43 mighty_strikes, 46 zantetsu' },

      // ---- Daravpom: Lecturer > Silver Tongue (Bard, then Bard / Thief): talks foes into trouble
      daravpom_lecturer: { ...DARAVPOM, job: 'e7_lecturer', base: B(55, 40, 48, 62, 60, 50), rate: 170, exp: 60, evo: { at: 23, to: 'daravpom_silvertongue' },
        desc: 'Gives lectures on any subject at all, at great length. Its talk on the history of the pom-pom has ended three wars.',
        learn: '1 sonic_chord, 1 pout, 4 nocturne, 8 hymn, 12 heckle_riff, 16 insult, 20 sonic_chord' },
      daravpom_silvertongue: { ...DARAVPOM, job: 'e7_silver_tongue', type2: 'thief', base: B(80, 58, 68, 92, 88, 74), rate: 65, exp: 210,
        desc: 'Can talk a foe into anything: a nap, a rage, a change of heart. It once talked a bandit into returning a purse.',
        learn: '23 steal_heart, 26 trick_attack, 29 high_note, 32 pilfer, 35 nocturne, 38 hymn, 42 doom, 46 mic_drop' },

      // ---- Garipom: Mask Bearer > Garif Elder (Beast, then Beast / Summoner): a slow, wise heavyweight
      garipom_maskbearer: { ...GARIPOM, job: 'e7_mask_bearer', base: B(68, 62, 58, 48, 52, 32), rate: 170, exp: 62, evo: { at: 26, to: 'garipom_elder' },
        desc: "Wears a carved mask it never takes off, not even to eat. Nobody knows how it eats. It's very polite about it.",
        learn: '1 bite, 1 roar, 5 paw_swat, 9 haunt, 13 gaia_rage, 17 seance, 21 bite' },
      garipom_elder: { ...GARIPOM, job: 'e7_garif_elder', type2: 'summoner', base: B(100, 95, 85, 70, 78, 47), rate: 60, exp: 218,
        desc: 'Keeper of the old ways on the windy plain. It rarely speaks, and when it does, even the spirits hush to listen.',
        learn: '26 karma_knife, 29 earth_wall, 32 typhon_snort, 35 acorn, 38 seance, 41 karma_knife, 44 bite, 47 stampede' },

      // ---- the one-stage kinds
      markpom_hunter: { moogle: 'Markpom', job: 'e7_mark_hunter', type2: 'warrior', base: B(80, 112, 75, 45, 70, 98), rate: 55, exp: 180, curve: 'medium',
        fur: '#ece2d2', pom: '#c05020', wing: '#6a4a2a', abilities: ['lie_in_wait', 'apex_predator'],
        desc: 'Reads the hunt board every morning and takes the scariest bill. It has bagged a giant tomato and a very rude malboro.',
        learn: '1 arrow, 1 hunters_mark, 5 slash, 9 snare_line, 13 sidewinder, 17 arrow, 21 web_snare, 25 opening_gambit, 29 slash, 33 shadowbind, 38 arrow, 41 onslaught, 44 eagle_eye, 47 headshot',
        habitat: 'cave', rarity: 'uncommon', class: 'normal' },
      gougpom_giant: { moogle: 'Gougpom', job: 'e7_steel_giant', type2: 'knight', base: B(100, 115, 125, 30, 80, 40), rate: 50, exp: 180, curve: 'slow',
        fur: '#d8d0c4', pom: '#ff4020', wing: '#6a5a4a', abilities: ['hold_fast', 'heavy_armor'],
        desc: "A war machine dug out of an old mine and rebuilt by a moogle with a wrench and a dream. It says 'kupo' very slowly.",
        learn: '1 wrench, 1 iron_wall, 5 shield_bash, 9 piston_punch, 13 oil_change, 17 juggernaut, 21 wrench, 25 aegis_slam, 29 rocket_punch, 33 entrench, 36 shield_bash, 39 gyro_grinder, 42 aegis_slam, 45 wrench, 48 wave_cannon',
        habitat: 'factory', rarity: 'rare', class: 'normal' },
      quickpom_quickener: { moogle: 'Quickpom', job: 'e7_quickener', type2: 'freelancer', base: B(70, 55, 65, 105, 75, 100), rate: 55, exp: 175, curve: 'medium',
        fur: '#eef4fc', pom: '#80e0ff', wing: '#80a0d0', abilities: ['mistbringer', 'limit_break', 'mist_crystal'],
        desc: 'Breathes the Mist that hangs over old battlefields. At its peak it chains spell after spell until the sky flashes.',
        learn: '1 holy_glare, 1 regen_spell, 5 kupo_holler, 9 aero, 13 asylum_fog, 17 banishga, 21 holy_glare, 25 aerora, 29 reraise, 33 aero, 38 temperance, 41 holy_glare, 44 ultima_charge, 47 holy_ray',
        habitat: 'lifestream', rarity: 'rare', class: 'normal' },
    },

    // ------------------------------------------------------------------ the Kupodex: line by line
    dex: [
      'nono_tinker', 'nono_airwright', 'nono_chief', 'lowpom_urchin', 'lowpom_corsair', 'lowpom_rogue',
      'lawkin_cadet', 'lawkin_judge', 'lawkin_magister', 'lucamog_stonebearer', 'lucamog_templar', 'lucamog_lucavi',
      'kupoulve_squire', 'kupoulve_vanguard', 'kupoulve_heretic', 'zodipom_reader', 'zodipom_binder', 'zodipom_caller',
      'draklin_chemist', 'draklin_nethicist', 'draklin_director', 'piperpom_piper', 'piperpom_animist', 'piperpom_wildspeaker',
      'riskpom_agent', 'riskpom_riskbreaker', 'riskpom_bloodsin', 'ajorapom_acolyte', 'ajorapom_brave', 'ajorapom_zodiac',
      'vierkin_warden', 'vierkin_greenbow', 'vierkin_seer', 'tallypom_chronist', 'tallypom_calculator', 'tallypom_arithmancer',
      'crankpom_tinker', 'crankpom_troubadour', 'mapkin_mapseller', 'mapkin_wayfinder', 'polkapom_dancer', 'polkapom_nameless',
      'oinkpom_brute', 'oinkpom_pitboss', 'pomlance_lancer', 'pomlance_knight', 'blunderpom_gunner', 'blunderpom_fusilier',
      'tosspom_juggler', 'tosspom_bomber', 'hatpom_blackmage', 'hatpom_timemage', 'kwehpom_groom', 'kwehpom_cavalier',
      'scalepom_brawler', 'scalepom_holyfist', 'terrapom_dowser', 'terrapom_terramancer', 'gridpom_licensee', 'gridpom_master',
      'yinpom_mystic', 'yinpom_augur', 'katanpom_pupil', 'katanpom_kensei', 'daravpom_lecturer', 'daravpom_silvertongue',
      'garipom_maskbearer', 'garipom_elder', 'markpom_hunter', 'gougpom_giant', 'quickpom_quickener',
    ],
  });
})();
