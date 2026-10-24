// FF7 weapons for all 9 playable characters + Sephiroth's guest Masamune (PS1 US names).
//
// Source: references/text/Party_Mechanics_Guide.txt (kernel data: Att, At%, Mag, extra stats,
// slots/links, growth, physical element type, crit bonus, long range, throwability); buy prices
// from Item_Materia_Locations_FAQ shop guide. price 0 = not sold for gil.
//
// Field notes:
//   mag        magic bonus (top-level, as in DATA_SCHEMA's example); `stats` holds OTHER bonuses
//              (vit/spr/dex...) and never repeats mag.
//   element    FF7's hidden physical attack element of the weapon (cut/hit/punch/shoot). Enemies
//              may halve/nullify these; materia elements (Elemental) are added on top.
//   crit       bonus added to the critical-hit rate (Masamune 255 = always critical).
//   throwable  extra field: may be thrown with the Throw command (FF7 flags Tifa's and
//              Red XIII's weapons, the starting Buster Sword/Gatling Gun and Masamune as
//              "can't be thrown").
//
// special hooks (FF7 formulas; Power in 16-units, 16 = normal attack):
//   ultima_weapon, hp_shout   Power = floor(3 * Power * HP / MaxHP) + 1
//   limited_moon, venus_gospel Power = floor(3 * Power * MP / MaxMP) + 1
//   missing_score             Power = floor(Power * floor(totalAP / 10000) / 16) + 1
//                             (totalAP = AP of materia slotted in the weapon; mastered materia
//                             count their master AP; Master*/Enemy Skill/Underwater excluded)
//   premium_heart             Power = floor(Power * floor(limitLevel * limitBar / 16) / 16) + 1
//                             (limitBar 0..255 = current gauge fill)
//   death_penalty             Power = floor(Power * floor(kills / 128) / 16) + 10
//   conformer                 Power = average level of the enemies targeted (replaces Power)
//   powersoul                 damage x2 in near-death (HP < 1/4), x4 with Death Sentence (stack)
//   master_fist               damage x(1 + 1 each for near-death, poison, sadness, silence, slow,
//                             darkness + 2 each for death_sentence, slow_numb)
//   yoshiyuki, princess_guard damage x(1 + number of KO'd allies)

Object.assign(FF7.data.weapons, {
  // ----------------------------------------------- Cloud: swords
  buster_sword: {
    name: 'Buster Sword', char: 'cloud', atk: 18, hit: 96, mag: 2, stats: {},
    slots: 2, links: 1, growth: 1, element: 'cut', status: null, crit: 0,
    longRange: false, throwable: false, special: null,
    price: 0, desc: 'Initial equipment',
  },
  mythril_saber: {
    name: 'Mythril Saber', char: 'cloud', atk: 23, hit: 98, mag: 4, stats: {},
    slots: 3, links: 1, growth: 1, element: 'cut', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 1000, desc: 'A sword forged of mythril',
  },
  hardedge: {
    name: 'Hardedge', char: 'cloud', atk: 32, hit: 98, mag: 6, stats: {},
    slots: 4, links: 1, growth: 1, element: 'cut', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 1500, desc: 'A sword with a hardened edge',
  },
  butterfly_edge: {
    name: 'Butterfly Edge', char: 'cloud', atk: 39, hit: 100, mag: 8, stats: {},
    slots: 4, links: 2, growth: 1, element: 'cut', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 2800, desc: 'A blade shaped like a wing',
  },
  enhance_sword: {
    name: 'Enhance Sword', char: 'cloud', atk: 43, hit: 107, mag: 16, stats: {},
    slots: 8, links: 4, growth: 1, element: 'cut', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 12000, desc: 'A sword made to hold materia',
  },
  organics: {
    name: 'Organics', char: 'cloud', atk: 62, hit: 103, mag: 15, stats: {},
    slots: 6, links: 2, growth: 1, element: 'cut', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 12000, desc: 'A sword of organic metal',
  },
  crystal_sword: {
    name: 'Crystal Sword', char: 'cloud', atk: 76, hit: 105, mag: 19, stats: {},
    slots: 6, links: 3, growth: 1, element: 'cut', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 18000, desc: 'A sword of pure crystal',
  },
  force_stealer: {
    name: 'Force Stealer', char: 'cloud', atk: 36, hit: 100, mag: 7, stats: {},
    slots: 3, links: 0, growth: 2, element: 'cut', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 2200, desc: 'Double materia growth',
  },
  rune_blade: {
    name: 'Rune Blade', char: 'cloud', atk: 40, hit: 108, mag: 9, stats: {},
    slots: 4, links: 0, growth: 2, element: 'cut', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 3800, desc: 'Double materia growth',
  },
  murasame: {
    name: 'Murasame', char: 'cloud', atk: 51, hit: 100, mag: 12, stats: {},
    slots: 5, links: 2, growth: 1, element: 'cut', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 6500, desc: 'A famous katana from Wutai',
  },
  nail_bat: {
    name: 'Nail Bat', char: 'cloud', atk: 70, hit: 100, mag: 0, stats: {},
    slots: 0, links: 0, growth: 0, element: 'cut', status: null, crit: 4,
    longRange: false, throwable: true, special: null,
    price: 2800, desc: 'A bat studded with nails',
  },
  yoshiyuki: {
    name: 'Yoshiyuki', char: 'cloud', atk: 56, hit: 100, mag: 9, stats: {},
    slots: 2, links: 0, growth: 1, element: 'cut', status: null, crit: 0,
    longRange: false, throwable: true, special: 'yoshiyuki',
    price: 0, desc: 'Stronger as allies fall',
  },
  apocalypse: {
    name: 'Apocalypse', char: 'cloud', atk: 88, hit: 110, mag: 43, stats: { spr: 16 },
    slots: 3, links: 0, growth: 3, element: 'cut', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 0, desc: 'Triple materia growth',
  },
  heavens_cloud: {
    name: 'Heaven\'s Cloud', char: 'cloud', atk: 93, hit: 100, mag: 31, stats: {},
    slots: 6, links: 0, growth: 1, element: 'cut', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 0, desc: 'A blade that cleaves the sky',
  },
  ragnarok: {
    name: 'Ragnarok', char: 'cloud', atk: 97, hit: 105, mag: 43, stats: { spr: 35 },
    slots: 6, links: 3, growth: 1, element: 'cut', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 0, desc: 'A legendary sword',
  },
  ultima_weapon: {
    name: 'Ultima Weapon', char: 'cloud', atk: 100, hit: 110, mag: 51, stats: { spr: 24 },
    slots: 8, links: 4, growth: 0, element: 'cut', status: null, crit: 0,
    longRange: false, throwable: true, special: 'ultima_weapon',
    price: 0, desc: 'Stronger the more HP Cloud has',
  },
  // -------------------------------------------- Barret: gun-arms
  gatling_gun: {
    name: 'Gatling Gun', char: 'barret', atk: 14, hit: 97, mag: 0, stats: {},
    slots: 1, links: 0, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: false, special: null,
    price: 0, desc: 'Initial equipment',
  },
  assault_gun: {
    name: 'Assault Gun', char: 'barret', atk: 17, hit: 98, mag: 1, stats: {},
    slots: 2, links: 1, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 350, desc: 'A rapid-fire gun-arm',
  },
  cannon_ball: {
    name: 'Cannon Ball', char: 'barret', atk: 23, hit: 98, mag: 2, stats: {},
    slots: 3, links: 1, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 950, desc: 'A gun-arm that fires balls',
  },
  atomic_scissors: {
    name: 'Atomic Scissors', char: 'barret', atk: 32, hit: 99, mag: 4, stats: {},
    slots: 4, links: 1, growth: 1, element: 'punch', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 1400, desc: 'Scissor-blade gun-arm',
  },
  heavy_vulcan: {
    name: 'Heavy Vulcan', char: 'barret', atk: 39, hit: 100, mag: 8, stats: {},
    slots: 4, links: 2, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 2700, desc: 'A heavy rotary gun-arm',
  },
  chainsaw: {
    name: 'Chainsaw', char: 'barret', atk: 52, hit: 100, mag: 10, stats: {},
    slots: 5, links: 2, growth: 1, element: 'cut', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 6300, desc: 'A chainsaw gun-arm',
  },
  microlaser: {
    name: 'Microlaser', char: 'barret', atk: 63, hit: 101, mag: 13, stats: {},
    slots: 6, links: 2, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 12000, desc: 'A laser-firing gun-arm',
  },
  am_cannon: {
    name: 'A·M Cannon', char: 'barret', atk: 77, hit: 103, mag: 16, stats: {},
    slots: 6, links: 3, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 18000, desc: 'An anti-matter cannon',
  },
  w_machine_gun: {
    name: 'W Machine Gun', char: 'barret', atk: 30, hit: 100, mag: 3, stats: {},
    slots: 3, links: 0, growth: 2, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 2000, desc: 'Double materia growth',
  },
  drill_arm: {
    name: 'Drill Arm', char: 'barret', atk: 37, hit: 97, mag: 0, stats: {},
    slots: 4, links: 0, growth: 2, element: 'punch', status: null, crit: 3,
    longRange: false, throwable: true, special: null,
    price: 3300, desc: 'Double materia growth',
  },
  solid_bazooka: {
    name: 'Solid Bazooka', char: 'barret', atk: 61, hit: 100, mag: 15, stats: {},
    slots: 8, links: 4, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 16000, desc: 'A bazooka made to hold materia',
  },
  rocket_punch: {
    name: 'Rocket Punch', char: 'barret', atk: 62, hit: 110, mag: 0, stats: {},
    slots: 0, links: 0, growth: 0, element: 'hit', status: null, crit: 4,
    longRange: false, throwable: true, special: null,
    price: 3200, desc: 'A rocket-powered fist',
  },
  enemy_launcher: {
    name: 'Enemy Launcher', char: 'barret', atk: 35, hit: 100, mag: 7, stats: {},
    slots: 5, links: 1, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 3300, desc: 'A missile-launching gun-arm',
  },
  pile_banger: {
    name: 'Pile Banger', char: 'barret', atk: 90, hit: 80, mag: 0, stats: {},
    slots: 6, links: 3, growth: 0, element: 'punch', status: null, crit: 3,
    longRange: false, throwable: true, special: null,
    price: 0, desc: 'A pile-driving gun-arm',
  },
  max_ray: {
    name: 'Max Ray', char: 'barret', atk: 97, hit: 98, mag: 30, stats: {},
    slots: 6, links: 3, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 0, desc: 'A powerful laser gun-arm',
  },
  missing_score: {
    name: 'Missing Score', char: 'barret', atk: 98, hit: 108, mag: 49, stats: {},
    slots: 8, links: 4, growth: 0, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: 'missing_score',
    price: 0, desc: 'Stronger with more materia AP',
  },
  // ------------------------------------------------ Tifa: gloves
  leather_glove: {
    name: 'Leather Glove', char: 'tifa', atk: 13, hit: 99, mag: 0, stats: {},
    slots: 1, links: 0, growth: 1, element: 'hit', status: null, crit: 2,
    longRange: false, throwable: false, special: null,
    price: 0, desc: 'Initial equipment',
  },
  metal_knuckle: {
    name: 'Metal Knuckle', char: 'tifa', atk: 18, hit: 102, mag: 1, stats: {},
    slots: 2, links: 1, growth: 1, element: 'hit', status: null, crit: 2,
    longRange: false, throwable: false, special: null,
    price: 320, desc: 'Metal knuckle guards',
  },
  mythril_claw: {
    name: 'Mythril Claw', char: 'tifa', atk: 24, hit: 106, mag: 3, stats: {},
    slots: 3, links: 1, growth: 1, element: 'hit', status: null, crit: 2,
    longRange: false, throwable: false, special: null,
    price: 750, desc: 'Claws made of mythril',
  },
  grand_glove: {
    name: 'Grand Glove', char: 'tifa', atk: 31, hit: 110, mag: 6, stats: {},
    slots: 4, links: 1, growth: 1, element: 'hit', status: null, crit: 2,
    longRange: false, throwable: false, special: null,
    price: 1200, desc: 'A sturdy fighting glove',
  },
  tiger_fang: {
    name: 'Tiger Fang', char: 'tifa', atk: 38, hit: 110, mag: 8, stats: {},
    slots: 4, links: 2, growth: 1, element: 'punch', status: null, crit: 2,
    longRange: false, throwable: false, special: null,
    price: 2500, desc: 'A glove with tiger fangs',
  },
  diamond_knuckle: {
    name: 'Diamond Knuckle', char: 'tifa', atk: 51, hit: 112, mag: 10, stats: {},
    slots: 5, links: 2, growth: 1, element: 'hit', status: null, crit: 2,
    longRange: false, throwable: false, special: null,
    price: 5800, desc: 'Diamond-studded knuckles',
  },
  dragon_claw: {
    name: 'Dragon Claw', char: 'tifa', atk: 62, hit: 114, mag: 13, stats: {},
    slots: 6, links: 2, growth: 1, element: 'punch', status: null, crit: 2,
    longRange: false, throwable: false, special: null,
    price: 10000, desc: 'Claws of a dragon',
  },
  crystal_glove: {
    name: 'Crystal Glove', char: 'tifa', atk: 75, hit: 115, mag: 16, stats: {},
    slots: 6, links: 3, growth: 1, element: 'hit', status: null, crit: 2,
    longRange: false, throwable: false, special: null,
    price: 16000, desc: 'A glove of pure crystal',
  },
  motor_drive: {
    name: 'Motor Drive', char: 'tifa', atk: 27, hit: 106, mag: 6, stats: {},
    slots: 3, links: 0, growth: 2, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: null,
    price: 0, desc: 'Double materia growth',
  },
  platinum_fist: {
    name: 'Platinum Fist', char: 'tifa', atk: 30, hit: 108, mag: 7, stats: {},
    slots: 4, links: 0, growth: 2, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: null,
    price: 2700, desc: 'Double materia growth',
  },
  kaiser_knuckle: {
    name: 'Kaiser Knuckle', char: 'tifa', atk: 44, hit: 110, mag: 13, stats: {},
    slots: 8, links: 1, growth: 1, element: 'hit', status: null, crit: 1,
    longRange: false, throwable: false, special: null,
    price: 15000, desc: 'A glove made to hold materia',
  },
  work_glove: {
    name: 'Work Glove', char: 'tifa', atk: 68, hit: 114, mag: 0, stats: {},
    slots: 0, links: 0, growth: 0, element: 'hit', status: null, crit: 4,
    longRange: false, throwable: false, special: null,
    price: 2200, desc: 'A worn-out work glove',
  },
  powersoul: {
    name: 'Powersoul', char: 'tifa', atk: 28, hit: 106, mag: 7, stats: {},
    slots: 4, links: 0, growth: 2, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: 'powersoul',
    price: 4200, desc: 'Stronger when near death',
  },
  master_fist: {
    name: 'Master Fist', char: 'tifa', atk: 38, hit: 108, mag: 0, stats: {},
    slots: 6, links: 0, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: 'master_fist',
    price: 0, desc: 'Stronger with bad status',
  },
  gods_hand: {
    name: 'God\'s Hand', char: 'tifa', atk: 86, hit: 255, mag: 34, stats: {},
    slots: 4, links: 2, growth: 1, element: 'hit', status: null, crit: 2,
    longRange: false, throwable: false, special: null,
    price: 0, desc: 'Never misses',
  },
  premium_heart: {
    name: 'Premium Heart', char: 'tifa', atk: 99, hit: 112, mag: 32, stats: {},
    slots: 8, links: 4, growth: 0, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: 'premium_heart',
    price: 0, desc: 'Stronger as the Limit gauge fills',
  },
  // ----------------------------------------------- Aeris: staves
  guard_stick: {
    name: 'Guard Stick', char: 'aeris', atk: 12, hit: 99, mag: 2, stats: { vit: 1, spr: 4 },
    slots: 1, links: 0, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 0, desc: 'Initial equipment',
  },
  mythril_rod: {
    name: 'Mythril Rod', char: 'aeris', atk: 16, hit: 100, mag: 3, stats: {},
    slots: 2, links: 1, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 370, desc: 'A rod made of mythril',
  },
  full_metal_staff: {
    name: 'Full Metal Staff', char: 'aeris', atk: 22, hit: 100, mag: 4, stats: {},
    slots: 3, links: 1, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 800, desc: 'A staff made all of metal',
  },
  striking_staff: {
    name: 'Striking Staff', char: 'aeris', atk: 32, hit: 100, mag: 7, stats: {},
    slots: 4, links: 1, growth: 1, element: 'hit', status: null, crit: 2,
    longRange: false, throwable: true, special: null,
    price: 1300, desc: 'A staff made for striking',
  },
  prism_staff: {
    name: 'Prism Staff', char: 'aeris', atk: 40, hit: 105, mag: 10, stats: {},
    slots: 4, links: 2, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 2600, desc: 'A staff set with a prism',
  },
  aurora_rod: {
    name: 'Aurora Rod', char: 'aeris', atk: 51, hit: 110, mag: 14, stats: {},
    slots: 5, links: 2, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 5800, desc: 'A rod aglow like an aurora',
  },
  wizard_staff: {
    name: 'Wizard Staff', char: 'aeris', atk: 28, hit: 100, mag: 6, stats: {},
    slots: 3, links: 0, growth: 2, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 1800, desc: 'Double materia growth',
  },
  wizer_staff: {
    name: 'Wizer Staff', char: 'aeris', atk: 33, hit: 100, mag: 7, stats: {},
    slots: 4, links: 0, growth: 2, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 3200, desc: 'Double materia growth',
  },
  fairy_tale: {
    name: 'Fairy Tale', char: 'aeris', atk: 37, hit: 103, mag: 8, stats: {},
    slots: 7, links: 0, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 2500, desc: 'A staff out of a fairy tale',
  },
  umbrella: {
    name: 'Umbrella', char: 'aeris', atk: 58, hit: 118, mag: 10, stats: { vit: 20 },
    slots: 0, links: 0, growth: 0, element: 'hit', status: null, crit: 5,
    longRange: false, throwable: true, special: null,
    price: 0, desc: 'A sturdy umbrella',
  },
  princess_guard: {
    name: 'Princess Guard', char: 'aeris', atk: 52, hit: 111, mag: 22, stats: { vit: 12, spr: 20 },
    slots: 7, links: 3, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: 'princess_guard',
    price: 0, desc: 'Stronger as allies fall',
  },
  // ------------------------------------ Red XIII: hair ornaments
  mythril_clip: {
    name: 'Mythril Clip', char: 'redxiii', atk: 24, hit: 100, mag: 6, stats: {},
    slots: 3, links: 1, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: null,
    price: 800, desc: 'Initial equipment',
  },
  diamond_pin: {
    name: 'Diamond Pin', char: 'redxiii', atk: 33, hit: 102, mag: 8, stats: {},
    slots: 4, links: 1, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: null,
    price: 1300, desc: 'A hair pin set with diamonds',
  },
  silver_barrette: {
    name: 'Silver Barrette', char: 'redxiii', atk: 40, hit: 110, mag: 10, stats: {},
    slots: 4, links: 2, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: null,
    price: 2500, desc: 'A barrette of silver',
  },
  gold_barrette: {
    name: 'Gold Barrette', char: 'redxiii', atk: 50, hit: 104, mag: 13, stats: {},
    slots: 5, links: 2, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: null,
    price: 6000, desc: 'A barrette of gold',
  },
  adaman_clip: {
    name: 'Adaman Clip', char: 'redxiii', atk: 60, hit: 106, mag: 15, stats: {},
    slots: 6, links: 2, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: null,
    price: 11000, desc: 'A clip of adamantite',
  },
  crystal_comb: {
    name: 'Crystal Comb', char: 'redxiii', atk: 76, hit: 108, mag: 20, stats: {},
    slots: 6, links: 3, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: null,
    price: 17000, desc: 'A comb of pure crystal',
  },
  magic_comb: {
    name: 'Magic Comb', char: 'redxiii', atk: 37, hit: 100, mag: 4, stats: {},
    slots: 3, links: 0, growth: 2, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: null,
    price: 2000, desc: 'Double materia growth',
  },
  plus_barrette: {
    name: 'Plus Barrette', char: 'redxiii', atk: 39, hit: 104, mag: 12, stats: {},
    slots: 4, links: 0, growth: 2, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: null,
    price: 3500, desc: 'Double materia growth',
  },
  centclip: {
    name: 'Centclip', char: 'redxiii', atk: 58, hit: 108, mag: 22, stats: {},
    slots: 8, links: 0, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: null,
    price: 14000, desc: 'A clip made to hold materia',
  },
  hairpin: {
    name: 'Hairpin', char: 'redxiii', atk: 57, hit: 120, mag: 15, stats: {},
    slots: 0, links: 0, growth: 0, element: 'shoot', status: null, crit: 5,
    longRange: true, throwable: false, special: null,
    price: 6000, desc: 'A hairpin; attacks from afar',
  },
  seraph_comb: {
    name: 'Seraph Comb', char: 'redxiii', atk: 68, hit: 110, mag: 14, stats: {},
    slots: 4, links: 0, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: null,
    price: 0, desc: 'A memento of his father',
  },
  behemoth_horn: {
    name: 'Behemoth Horn', char: 'redxiii', atk: 91, hit: 75, mag: 26, stats: { vit: 35, spr: 18 },
    slots: 6, links: 0, growth: 1, element: 'cut', status: null, crit: 0,
    longRange: false, throwable: false, special: null,
    price: 0, desc: 'The horn of a Behemoth',
  },
  spring_gun_clip: {
    name: 'Spring Gun Clip', char: 'redxiii', atk: 87, hit: 100, mag: 55, stats: {},
    slots: 6, links: 3, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: null,
    price: 0, desc: 'A clip with a spring gun',
  },
  limited_moon: {
    name: 'Limited Moon', char: 'redxiii', atk: 93, hit: 114, mag: 31, stats: {},
    slots: 8, links: 4, growth: 0, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: 'limited_moon',
    price: 0, desc: 'Stronger the more MP Red has',
  },
  // ------------------------------- Yuffie: shuriken (long range)
  '4_point_shuriken': {
    name: '4-point Shuriken', char: 'yuffie', atk: 23, hit: 100, mag: 6, stats: {},
    slots: 3, links: 1, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 0, desc: 'Initial equipment',
  },
  boomerang: {
    name: 'Boomerang', char: 'yuffie', atk: 30, hit: 101, mag: 7, stats: {},
    slots: 4, links: 1, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 1400, desc: 'A bladed boomerang',
  },
  pinwheel: {
    name: 'Pinwheel', char: 'yuffie', atk: 37, hit: 104, mag: 9, stats: {},
    slots: 4, links: 2, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 2600, desc: 'A spinning throwing star',
  },
  razor_ring: {
    name: 'Razor Ring', char: 'yuffie', atk: 49, hit: 105, mag: 12, stats: {},
    slots: 5, links: 2, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 6000, desc: 'A razor-edged ring',
  },
  hawkeye: {
    name: 'Hawkeye', char: 'yuffie', atk: 61, hit: 107, mag: 14, stats: {},
    slots: 6, links: 2, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 12000, desc: 'A keen-eyed throwing star',
  },
  crystal_cross: {
    name: 'Crystal Cross', char: 'yuffie', atk: 74, hit: 110, mag: 18, stats: {},
    slots: 6, links: 3, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 18000, desc: 'A cross of pure crystal',
  },
  wind_slash: {
    name: 'Wind Slash', char: 'yuffie', atk: 30, hit: 103, mag: 7, stats: {},
    slots: 3, links: 0, growth: 2, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 2000, desc: 'Double materia growth',
  },
  twin_viper: {
    name: 'Twin Viper', char: 'yuffie', atk: 36, hit: 108, mag: 8, stats: {},
    slots: 4, links: 0, growth: 2, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 3200, desc: 'Double materia growth',
  },
  spiral_shuriken: {
    name: 'Spiral Shuriken', char: 'yuffie', atk: 68, hit: 110, mag: 18, stats: {},
    slots: 8, links: 1, growth: 1, element: 'shoot', status: null, crit: 2,
    longRange: true, throwable: true, special: null,
    price: 14000, desc: 'A shuriken made for materia',
  },
  superball: {
    name: 'Superball', char: 'yuffie', atk: 68, hit: 120, mag: 10, stats: {},
    slots: 0, links: 0, growth: 0, element: 'shoot', status: null, crit: 4,
    longRange: true, throwable: true, special: null,
    price: 3000, desc: 'A super bouncy ball',
  },
  magic_shuriken: {
    name: 'Magic Shuriken', char: 'yuffie', atk: 64, hit: 113, mag: 0, stats: { dex: 10 },
    slots: 3, links: 0, growth: 1, element: 'shoot', status: null, crit: 2,
    longRange: true, throwable: true, special: null,
    price: 6000, desc: 'A shuriken of magic metal',
  },
  rising_sun: {
    name: 'Rising Sun', char: 'yuffie', atk: 68, hit: 108, mag: 16, stats: {},
    slots: 4, links: 2, growth: 2, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 0, desc: 'Double materia growth',
  },
  oritsuru: {
    name: 'Oritsuru', char: 'yuffie', atk: 90, hit: 116, mag: 38, stats: {},
    slots: 8, links: 2, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 0, desc: 'A paper-crane throwing star',
  },
  conformer: {
    name: 'Conformer', char: 'yuffie', atk: 96, hit: 112, mag: 42, stats: {},
    slots: 8, links: 4, growth: 0, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: 'conformer',
    price: 0, desc: 'Stronger vs high-level foes',
  },
  // --------------------------------------- Cait Sith: megaphones
  yellow_m_phone: {
    name: 'Yellow M-phone', char: 'caitsith', atk: 36, hit: 100, mag: 8, stats: {},
    slots: 4, links: 1, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 500, desc: 'Initial equipment',
  },
  green_m_phone: {
    name: 'Green M-phone', char: 'caitsith', atk: 41, hit: 100, mag: 9, stats: {},
    slots: 4, links: 2, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 2400, desc: 'A green megaphone',
  },
  blue_m_phone: {
    name: 'Blue M-phone', char: 'caitsith', atk: 48, hit: 100, mag: 10, stats: {},
    slots: 5, links: 2, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 5500, desc: 'A blue megaphone',
  },
  red_m_phone: {
    name: 'Red M-phone', char: 'caitsith', atk: 60, hit: 100, mag: 15, stats: {},
    slots: 6, links: 2, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 11000, desc: 'A red megaphone',
  },
  crystal_m_phone: {
    name: 'Crystal M-phone', char: 'caitsith', atk: 74, hit: 100, mag: 20, stats: {},
    slots: 6, links: 3, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 18000, desc: 'A megaphone of pure crystal',
  },
  white_m_phone: {
    name: 'White M-phone', char: 'caitsith', atk: 35, hit: 102, mag: 8, stats: {},
    slots: 3, links: 0, growth: 2, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 2300, desc: 'Double materia growth',
  },
  black_m_phone: {
    name: 'Black M-phone', char: 'caitsith', atk: 31, hit: 104, mag: 10, stats: {},
    slots: 4, links: 0, growth: 2, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 2800, desc: 'Double materia growth',
  },
  silver_m_phone: {
    name: 'Silver M-phone', char: 'caitsith', atk: 28, hit: 106, mag: 14, stats: {},
    slots: 8, links: 0, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 3300, desc: 'A megaphone made for materia',
  },
  trumpet_shell: {
    name: 'Trumpet Shell', char: 'caitsith', atk: 68, hit: 118, mag: 2, stats: {},
    slots: 0, links: 0, growth: 0, element: 'hit', status: null, crit: 4,
    longRange: false, throwable: true, special: null,
    price: 3000, desc: 'A conch-shell trumpet',
  },
  gold_m_phone: {
    name: 'Gold M-phone', char: 'caitsith', atk: 58, hit: 103, mag: 28, stats: {},
    slots: 8, links: 4, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 15000, desc: 'A golden megaphone',
  },
  battle_trumpet: {
    name: 'Battle Trumpet', char: 'caitsith', atk: 95, hit: 95, mag: 0, stats: {},
    slots: 6, links: 3, growth: 0, element: 'hit', status: null, crit: 2,
    longRange: false, throwable: true, special: null,
    price: 0, desc: 'A trumpet that sounds the charge',
  },
  starlight_phone: {
    name: 'Starlight Phone', char: 'caitsith', atk: 88, hit: 102, mag: 31, stats: { vit: 30 },
    slots: 8, links: 4, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 0, desc: 'A megaphone bright as stars',
  },
  hp_shout: {
    name: 'HP Shout', char: 'caitsith', atk: 95, hit: 110, mag: 44, stats: {},
    slots: 8, links: 4, growth: 0, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: true, special: 'hp_shout',
    price: 0, desc: 'Stronger the more HP Cait has',
  },
  // ---------------------------------- Vincent: guns (long range)
  quicksilver: {
    name: 'Quicksilver', char: 'vincent', atk: 38, hit: 110, mag: 10, stats: {},
    slots: 4, links: 1, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 1000, desc: 'Initial equipment',
  },
  shotgun: {
    name: 'Shotgun', char: 'vincent', atk: 48, hit: 112, mag: 12, stats: {},
    slots: 4, links: 2, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 3100, desc: 'A scattershot gun',
  },
  shortbarrel: {
    name: 'Shortbarrel', char: 'vincent', atk: 51, hit: 118, mag: 14, stats: {},
    slots: 5, links: 2, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 6400, desc: 'A short-barreled gun',
  },
  lariat: {
    name: 'Lariat', char: 'vincent', atk: 64, hit: 120, mag: 16, stats: {},
    slots: 6, links: 2, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 12000, desc: 'A lever-action rifle',
  },
  winchester: {
    name: 'Winchester', char: 'vincent', atk: 73, hit: 120, mag: 18, stats: {},
    slots: 6, links: 3, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 18000, desc: 'A famous rifle',
  },
  peacemaker: {
    name: 'Peacemaker', char: 'vincent', atk: 38, hit: 118, mag: 8, stats: {},
    slots: 3, links: 1, growth: 2, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 3500, desc: 'Double materia growth',
  },
  buntline: {
    name: 'Buntline', char: 'vincent', atk: 48, hit: 124, mag: 18, stats: {},
    slots: 4, links: 2, growth: 2, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 6800, desc: 'Double materia growth',
  },
  long_barrel_r: {
    name: 'Long Barrel R', char: 'vincent', atk: 66, hit: 255, mag: 14, stats: {},
    slots: 8, links: 4, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 13000, desc: 'Never misses',
  },
  silver_rifle: {
    name: 'Silver Rifle', char: 'vincent', atk: 62, hit: 120, mag: 0, stats: {},
    slots: 0, links: 0, growth: 0, element: 'shoot', status: null, crit: 4,
    longRange: true, throwable: true, special: null,
    price: 3000, desc: 'A silver-plated rifle',
  },
  sniper_cr: {
    name: 'Sniper CR', char: 'vincent', atk: 42, hit: 255, mag: 7, stats: {},
    slots: 4, links: 2, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 3300, desc: 'Never misses',
  },
  supershot_st: {
    name: 'Supershot ST', char: 'vincent', atk: 97, hit: 120, mag: 52, stats: {},
    slots: 6, links: 3, growth: 0, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 0, desc: 'A powerful shotgun',
  },
  outsider: {
    name: 'Outsider', char: 'vincent', atk: 80, hit: 120, mag: 48, stats: {},
    slots: 8, links: 2, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: null,
    price: 0, desc: 'A gun for an outsider',
  },
  death_penalty: {
    name: 'Death Penalty', char: 'vincent', atk: 99, hit: 115, mag: 34, stats: {},
    slots: 8, links: 4, growth: 0, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: true, special: 'death_penalty',
    price: 0, desc: 'Stronger the more foes killed',
  },
  // ------------------------------------------------- Cid: spears
  spear: {
    name: 'Spear', char: 'cid', atk: 44, hit: 97, mag: 8, stats: {},
    slots: 4, links: 2, growth: 1, element: 'punch', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 1200, desc: 'Initial equipment',
  },
  slash_lance: {
    name: 'Slash Lance', char: 'cid', atk: 56, hit: 98, mag: 10, stats: {},
    slots: 5, links: 2, growth: 1, element: 'punch', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 6500, desc: 'A lance with a slashing edge',
  },
  trident: {
    name: 'Trident', char: 'cid', atk: 60, hit: 105, mag: 12, stats: {},
    slots: 6, links: 0, growth: 1, element: 'punch', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 7500, desc: 'A three-pronged spear',
  },
  mast_ax: {
    name: 'Mast Ax', char: 'cid', atk: 64, hit: 99, mag: 15, stats: {},
    slots: 6, links: 2, growth: 1, element: 'punch', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 13000, desc: 'A pole-axe',
  },
  partisan: {
    name: 'Partisan', char: 'cid', atk: 78, hit: 100, mag: 17, stats: {},
    slots: 6, links: 3, growth: 1, element: 'punch', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 19000, desc: 'A broad-bladed spear',
  },
  viper_halberd: {
    name: 'Viper Halberd', char: 'cid', atk: 58, hit: 102, mag: 13, stats: {},
    slots: 4, links: 0, growth: 2, element: 'punch', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 7000, desc: 'Double materia growth',
  },
  javelin: {
    name: 'Javelin', char: 'cid', atk: 62, hit: 104, mag: 12, stats: {},
    slots: 5, links: 2, growth: 2, element: 'punch', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 0, desc: 'Double materia growth',
  },
  grow_lance: {
    name: 'Grow Lance', char: 'cid', atk: 78, hit: 102, mag: 31, stats: {},
    slots: 6, links: 3, growth: 1, element: 'punch', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 0, desc: 'A lance that seems alive',
  },
  mop: {
    name: 'Mop', char: 'cid', atk: 68, hit: 118, mag: 3, stats: {},
    slots: 0, links: 0, growth: 0, element: 'hit', status: null, crit: 5,
    longRange: false, throwable: true, special: null,
    price: 3200, desc: 'A trusty mop',
  },
  dragoon_lance: {
    name: 'Dragoon Lance', char: 'cid', atk: 66, hit: 100, mag: 7, stats: {},
    slots: 8, links: 0, growth: 1, element: 'punch', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 6200, desc: 'A lance made for materia',
  },
  scimitar: {
    name: 'Scimitar', char: 'cid', atk: 86, hit: 102, mag: 20, stats: {},
    slots: 2, links: 1, growth: 3, element: 'cut', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 0, desc: 'Triple materia growth',
  },
  flayer: {
    name: 'Flayer', char: 'cid', atk: 100, hit: 100, mag: 20, stats: {},
    slots: 6, links: 0, growth: 1, element: 'punch', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 0, desc: 'A brutal spear',
  },
  spirit_lance: {
    name: 'Spirit Lance', char: 'cid', atk: 92, hit: 112, mag: 43, stats: { spr: 20 },
    slots: 4, links: 2, growth: 1, element: 'punch', status: null, crit: 0,
    longRange: false, throwable: true, special: null,
    price: 0, desc: 'A lance with a spirit within',
  },
  venus_gospel: {
    name: 'Venus Gospel', char: 'cid', atk: 97, hit: 103, mag: 42, stats: {},
    slots: 8, links: 4, growth: 0, element: 'punch', status: null, crit: 0,
    longRange: false, throwable: true, special: 'venus_gospel',
    price: 0, desc: 'Stronger the more MP Cid has',
  },
  // --------------------------- Sephiroth (guest, Kalm flashback)
  // ---- the Turks (Config > Turks Join; `extra`: outside FF7's 100%). Reno: rods (melee), Rude: gloves, Elena: guns
  em_rod: {
    name: 'EM Rod', char: 'reno', atk: 62, hit: 104, mag: 6, stats: {},
    slots: 4, links: 2, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: null, extra: true,
    price: 0, desc: "Reno's electro-mag rod",
  },
  stun_baton: {
    name: 'Stun Baton', char: 'reno', atk: 72, hit: 106, mag: 8, stats: {},
    slots: 6, links: 2, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: null, extra: true,
    price: 11000, desc: 'A heavier rod; the charge stings',
  },
  tesla_rod: {
    name: 'Tesla Rod', char: 'reno', atk: 80, hit: 108, mag: 12, stats: {},
    slots: 6, links: 3, growth: 1, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: null, extra: true,
    price: 17000, desc: 'Coils crackle along its length',
  },
  neo_turk_rod: {
    name: 'Neo Turk Rod', char: 'reno', atk: 96, hit: 112, mag: 20, stats: { dex: 20 },
    slots: 8, links: 4, growth: 0, element: 'hit', status: null, crit: 0,
    longRange: false, throwable: false, special: null, extra: true,
    price: 0, desc: "From Tseng's case: made for Reno",
  },
  black_gloves: {
    name: 'Black Gloves', char: 'rude', atk: 64, hit: 102, mag: 0, stats: {},
    slots: 4, links: 2, growth: 1, element: 'punch', status: null, crit: 0,
    longRange: false, throwable: false, special: null, extra: true,
    price: 0, desc: "Rude's gloves",
  },
  iron_knuckles: {
    name: 'Iron Knuckles', char: 'rude', atk: 74, hit: 104, mag: 0, stats: {},
    slots: 6, links: 2, growth: 1, element: 'punch', status: null, crit: 0,
    longRange: false, throwable: false, special: null, extra: true,
    price: 11500, desc: 'Plain and heavy',
  },
  titan_fists: {
    name: 'Titan Fists', char: 'rude', atk: 82, hit: 106, mag: 4, stats: {},
    slots: 6, links: 3, growth: 1, element: 'punch', status: null, crit: 0,
    longRange: false, throwable: false, special: null, extra: true,
    price: 17500, desc: 'Plated knuckles',
  },
  silent_fist: {
    name: 'Silent Fist', char: 'rude', atk: 98, hit: 110, mag: 0, stats: { vit: 20 },
    slots: 8, links: 4, growth: 0, element: 'punch', status: null, crit: 0,
    longRange: false, throwable: false, special: null, extra: true,
    price: 0, desc: "From Tseng's case: made for Rude",
  },
  service_pistol: {
    name: 'Service Pistol', char: 'elena', atk: 58, hit: 110, mag: 10, stats: {},
    slots: 4, links: 2, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: false, special: null, extra: true,
    price: 0, desc: "Elena's sidearm",
  },
  turk_revolver: {
    name: 'Turk Revolver', char: 'elena', atk: 68, hit: 112, mag: 12, stats: {},
    slots: 6, links: 2, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: false, special: null, extra: true,
    price: 11000, desc: 'Standard issue for field agents',
  },
  marksman: {
    name: 'Marksman', char: 'elena', atk: 76, hit: 116, mag: 16, stats: {},
    slots: 6, links: 3, growth: 1, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: false, special: null, extra: true,
    price: 16500, desc: 'A long-barrel pistol',
  },
  rookies_pride: {
    name: "Rookie's Pride", char: 'elena', atk: 92, hit: 120, mag: 24, stats: { mag: 20 },
    slots: 8, links: 4, growth: 0, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: false, special: null, extra: true,
    price: 0, desc: "From Tseng's case: made for Elena",
  },
  // the playable flashbacks' guests (Config > Playable Flashbacks): Zack's Buster Sword, the Corel miners' rifles
  zack_buster: {
    name: 'Buster Sword', char: 'zack', atk: 64, hit: 100, mag: 0, stats: {},
    slots: 0, links: 0, growth: 0, element: 'cut', status: null, crit: 0,
    longRange: false, throwable: false, special: null, guest: true,
    price: 0, desc: "Zack's sword, before it was Cloud's",
  },
  corel_rifle_b: {
    name: 'Hunting Rifle', char: 'young_barret', atk: 16, hit: 100, mag: 0, stats: {},
    slots: 0, links: 0, growth: 0, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: false, special: null, guest: true,
    price: 0, desc: "A Corel miner's rifle",
  },
  corel_rifle_d: {
    name: 'Hunting Rifle', char: 'young_dyne', atk: 16, hit: 100, mag: 0, stats: {},
    slots: 0, links: 0, growth: 0, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: false, special: null, guest: true,
    price: 0, desc: "A Corel miner's rifle",
  },
  // the AVALANCHE guests' own (js/data/characters.js jessie / biggs / wedge): no slots, not sold, not counted
  guest_handgun: {
    name: 'Handgun', char: 'jessie', atk: 14, hit: 100, mag: 4, stats: {},
    slots: 0, links: 0, growth: 0, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: false, special: null, guest: true,
    price: 0, desc: "Jessie's sidearm",
  },
  guest_carbine: {
    name: 'Carbine', char: 'biggs', atk: 20, hit: 100, mag: 0, stats: {},
    slots: 0, links: 0, growth: 0, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: false, special: null, guest: true,
    price: 0, desc: "Biggs' rifle",
  },
  guest_smg: {
    name: 'Submachine Gun', char: 'wedge', atk: 16, hit: 95, mag: 0, stats: {},
    slots: 0, links: 0, growth: 0, element: 'shoot', status: null, crit: 0,
    longRange: true, throwable: false, special: null, guest: true,
    price: 0, desc: "Wedge's SMG",
  },
  masamune: {
    name: 'Masamune', char: 'sephiroth', atk: 99, hit: 255, mag: 0, stats: {},
    slots: 6, links: 3, growth: 0, element: 'cut', status: null, crit: 255,
    longRange: false, throwable: false, special: null,
    price: 0, desc: 'Sephiroth\'s long katana',
  },
});
