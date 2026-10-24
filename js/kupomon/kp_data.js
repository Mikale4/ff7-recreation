// Kupomon data (docs/KUPOMON.md): the 15 job types and their chart, jobs, moves (with cooldowns), statuses, held and
// bag items, species, level curves and wild tables. Stage 1: the starters' lines and the first route's moogles.
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {};

  // ------------------------------------------------------------------ types
  KP.TYPES = ['freelancer', 'warrior', 'knight', 'monk', 'thief', 'dragoon', 'ranger', 'blackmage', 'whitemage', 'redmage',
    'summoner', 'timemage', 'bard', 'beast', 'machinist'];
  KP.TYPE_NAMES = { freelancer: 'Freelancer', warrior: 'Warrior', knight: 'Knight', monk: 'Monk', thief: 'Thief', dragoon: 'Dragoon',
    ranger: 'Ranger', blackmage: 'Black Mage', whitemage: 'White Mage', redmage: 'Red Mage', summoner: 'Summoner', timemage: 'Time Mage',
    bard: 'Bard', beast: 'Beast', machinist: 'Machinist' };
  KP.TYPE_COLORS = { freelancer: '#a8a8a0', warrior: '#c04030', knight: '#7890b0', monk: '#c88a40', thief: '#5a5a7a', dragoon: '#3a6ac8',
    ranger: '#5a9a3a', blackmage: '#6a4aa0', whitemage: '#e8e0d0', redmage: '#d03050', summoner: '#30a8a0', timemage: '#c8a830',
    bard: '#d070b0', beast: '#7a6a3a', machinist: '#8a8a90' };
  // the magic jobs (Silence stops their moves)
  KP.MAGIC = { blackmage: 1, whitemage: 1, redmage: 1, summoner: 1, timemage: 1, bard: 1 };
  // attack type -> [2x, 0.5x, 0x]. Not evenly balanced on purpose (like Pokémon's): Knight is the armoured wall (resists
  // six, as Steel does many), Summoner the spirit two kinds of attack can't touch (as Ghost)
  const CHART = {
    freelancer: [[], ['knight'], ['summoner']],
    warrior: [['blackmage', 'thief', 'machinist'], ['knight', 'whitemage', 'dragoon']],
    knight: [['thief', 'beast', 'bard'], ['knight', 'monk', 'machinist']],
    monk: [['knight', 'machinist', 'freelancer'], ['bard', 'dragoon', 'timemage'], ['summoner']],
    thief: [['summoner', 'timemage', 'blackmage'], ['thief', 'ranger', 'beast', 'knight']],
    dragoon: [['monk', 'timemage', 'warrior'], ['ranger', 'machinist', 'dragoon']],
    ranger: [['dragoon', 'beast', 'thief'], ['ranger', 'whitemage', 'redmage', 'knight']],
    blackmage: [['whitemage', 'knight', 'machinist'], ['blackmage', 'redmage', 'summoner']],
    whitemage: [['warrior', 'summoner', 'freelancer'], ['whitemage', 'redmage', 'monk']],
    redmage: [['ranger', 'monk', 'bard'], ['redmage', 'timemage', 'whitemage']],
    summoner: [['knight', 'timemage', 'monk'], ['summoner', 'whitemage', 'thief'], ['freelancer']],
    timemage: [['thief', 'ranger', 'dragoon'], ['timemage', 'summoner', 'bard']],
    bard: [['beast', 'warrior', 'redmage'], ['bard', 'machinist', 'thief']],
    beast: [['freelancer', 'whitemage', 'redmage'], ['knight', 'beast', 'dragoon']],
    machinist: [['knight', 'dragoon', 'bard'], ['machinist', 'beast', 'monk']],
  };
  KP.CHART = CHART;
  KP.eff = (atk, def) => { const c = CHART[atk]; if (!c) return 1; return c[0].includes(def) ? 2 : c[1].includes(def) ? 0.5 : (c[2] || []).includes(def) ? 0 : 1; };

  // ------------------------------------------------------------------ jobs: the type, and the look (js/kupomon/kp_models.js)
  // look: hat, robe / armor, weapon, the fur tint and the gear colours
  KP.JOBS = {
    freelancer: { name: 'Freelancer', type: 'freelancer', look: { hat: 'none', body: 'scarf', weapon: 'none', g1: '#d8b060' } },
    mime: { name: 'Mime', type: 'freelancer', look: { hat: 'beret', body: 'stripes', weapon: 'none', g1: '#f0f0f0', g2: '#2a2a2a' } },
    warrior: { name: 'Warrior', type: 'warrior', look: { hat: 'helm', body: 'armor', weapon: 'sword', g1: '#b03028', g2: '#a8a8b0' } },
    gladiator: { name: 'Gladiator', type: 'warrior', look: { hat: 'crest', body: 'armor', weapon: 'greatsword', g1: '#c8902a', g2: '#b8b8c0' } },
    samurai: { name: 'Samurai', type: 'warrior', look: { hat: 'kabuto', body: 'armor', weapon: 'katana', g1: '#7a1a20', g2: '#d8c070' } },
    monk: { name: 'Monk', type: 'monk', look: { hat: 'band', body: 'gi', weapon: 'claw', g1: '#d88a30', g2: '#e8e0c8' } },
    blackbelt: { name: 'Black Belt', type: 'monk', look: { hat: 'band', body: 'gi', weapon: 'claw', g1: '#2a2a2a', g2: '#f0ece0' } },
    thief: { name: 'Thief', type: 'thief', look: { hat: 'bandana', body: 'scarf', weapon: 'dagger', g1: '#3a6a3a', g2: '#6a4a2a' } },
    treasure_hunter: { name: 'Treasure Hunter', type: 'thief', look: { hat: 'bandana', body: 'vest', weapon: 'dagger', g1: '#3a5aa0', g2: '#a07040' } },
    ninja: { name: 'Ninja', type: 'thief', look: { hat: 'mask', body: 'scarf', weapon: 'shuriken', g1: '#2a2a3a', g2: '#a02020' } },
    ranger: { name: 'Ranger', type: 'ranger', look: { hat: 'feather', body: 'vest', weapon: 'bow', g1: '#3a7a3a', g2: '#7a5a30' } },
    cannoneer: { name: 'Cannoneer', type: 'ranger', look: { hat: 'tricorne', body: 'vest', weapon: 'cannon', g1: '#2a3a6a', g2: '#c8a040' } },
    blackmage: { name: 'Black Mage', type: 'blackmage', look: { hat: 'witch', body: 'robe', weapon: 'rod', g1: '#2a4a8a', g2: '#d8c070', shadowFace: true } },
    blackwizard: { name: 'Black Wizard', type: 'blackmage', look: { hat: 'witch', body: 'robe', weapon: 'staff', g1: '#4a2a7a', g2: '#e8c040', shadowFace: true } },
    magus: { name: 'Magus', type: 'blackmage', look: { hat: 'horned', body: 'robe', weapon: 'staff', g1: '#5a1a2a', g2: '#e8d070', shadowFace: true } },
    whitemage: { name: 'White Mage', type: 'whitemage', look: { hat: 'hood', body: 'robe', weapon: 'staff', g1: '#f2f0ea', g2: '#c02838' } },
    devout: { name: 'Devout', type: 'whitemage', look: { hat: 'hood', body: 'robe', weapon: 'staff', g1: '#f0ece0', g2: '#3a6ac8' } },
    whitewizard: { name: 'White Wizard', type: 'whitemage', look: { hat: 'mitre', body: 'robe', weapon: 'staff', g1: '#fff8ea', g2: '#d8b040' } },
    geomancer: { name: 'Geomancer', type: 'beast', look: { hat: 'leafhat', body: 'robe', weapon: 'bell', g1: '#4a7a3a', g2: '#c8a050' } },
    beastmaster: { name: 'Beastmaster', type: 'beast', look: { hat: 'pelt', body: 'vest', weapon: 'whip', g1: '#7a5a30', g2: '#a03020' } },
    bard: { name: 'Bard', type: 'bard', look: { hat: 'cap', body: 'vest', weapon: 'harp', g1: '#a03070', g2: '#e8c040' } },
    dancer: { name: 'Dancer', type: 'bard', look: { hat: 'ribbon', body: 'skirt', weapon: 'fans', g1: '#e050a0', g2: '#f0d060' } },
  };

  // ------------------------------------------------------------------ statuses
  // lasting (one at a time, until cured): poison sleep stop blind silence; battle-only (cleared by switching): confuse
  // berserk doom
  KP.STATUS = {
    poison: { name: 'Poison', short: 'PSN', col: '#a050c0', lasting: true },
    sleep: { name: 'Sleep', short: 'SLP', col: '#7a8aa0', lasting: true },
    stop: { name: 'Stop', short: 'STP', col: '#d0b040', lasting: true },
    blind: { name: 'Blind', short: 'BLD', col: '#505050', lasting: true },
    silence: { name: 'Silence', short: 'SIL', col: '#5aa0c0', lasting: true },
    confuse: { name: 'Confusion', short: 'CNF' },
    berserk: { name: 'Berserk', short: 'BSK' },
    doom: { name: 'Doom', short: 'DOM' },
  };

  // ------------------------------------------------------------------ moves: type, power, accuracy, cooldown (turns), and
  // effects: stat [stat, stages, 'self' | 'foe', chance%], status [kind, chance%], heal (fraction of max HP), drain
  // (fraction of the damage), prio, crit (extra crit stages)
  const mv = (name, type, power, acc, cd, o = {}) => Object.assign({ name, type, power, acc, cd }, o);
  KP.MOVES = {
    // Freelancer
    pom_bop: mv('Pom Bop', 'freelancer', 40, 100, 0, { desc: 'A bonk with the pom-pom.' }),
    wing_flutter: mv('Wing Flutter', 'freelancer', 40, 100, 0, { prio: 1, desc: 'A quick flurry of tiny wings. Strikes first.' }),
    kupo_charge: mv('Kupo Charge', 'freelancer', 75, 90, 2, { desc: 'A full-body tackle, kupo!' }),
    pout: mv('Pout', 'freelancer', 0, 100, 1, { stat: ['atk', -1, 'foe'], desc: "A pout so sad the foe's Attack drops." }),
    copycat: mv('Copycat', 'freelancer', 70, 100, 1, { desc: "Mimics the foe's pose and strikes." }),
    // Warrior
    slash: mv('Slash', 'warrior', 50, 100, 0, { desc: 'A clean sword cut.' }),
    cleave: mv('Cleave', 'warrior', 80, 95, 2, { desc: 'A heavy two-handed chop.' }),
    bravery: mv('Bravery', 'warrior', 0, 100, 3, { stat: ['atk', 2, 'self'], desc: 'Steels itself: Attack sharply up.' }),
    warcry: mv('War Cry', 'warrior', 0, 100, 1, { stat: ['def', -1, 'foe'], desc: "A shout that rattles the foe's guard." }),
    iai: mv('Iai Strike', 'warrior', 85, 90, 2, { crit: 1, desc: 'A lightning draw. Likely to crit.' }),
    zantetsu: mv('Zantetsuken', 'warrior', 120, 80, 3, { desc: 'The iron-cutting blade.' }),
    // Black Mage
    fire: mv('Fire', 'blackmage', 45, 100, 0, { desc: 'A puff of flame.' }),
    blizzard: mv('Blizzard', 'blackmage', 45, 100, 0, { status: ['stop', 10], desc: 'A chill. May Stop.' }),
    thunder: mv('Thunder', 'blackmage', 60, 95, 1, { desc: 'A crack of lightning.' }),
    fira: mv('Fira', 'blackmage', 80, 95, 2, { desc: 'A burst of flame.' }),
    firaga: mv('Firaga', 'blackmage', 110, 90, 3, { desc: 'An inferno.' }),
    bio: mv('Bio', 'blackmage', 35, 95, 2, { status: ['poison', 60], desc: 'A toxic cloud. Often Poisons.' }),
    focus: mv('Focus', 'blackmage', 0, 100, 2, { stat: ['atk', 1, 'self'], desc: 'Gathers its magic: Attack up.' }),
    // White Mage
    banish: mv('Banish', 'whitemage', 40, 100, 0, { desc: 'A flash of holy light.' }),
    dia: mv('Dia', 'whitemage', 60, 100, 1, { desc: 'Purifying light.' }),
    holy: mv('Holy', 'whitemage', 100, 90, 3, { desc: 'Blinding holy power.' }),
    cure: mv('Cure', 'whitemage', 0, 100, 2, { heal: 0.5, desc: 'Restores 50% of its HP.' }),
    protect: mv('Protect', 'whitemage', 0, 100, 3, { stat: ['def', 2, 'self'], desc: 'A barrier: Defense sharply up.' }),
    hush: mv('Hush', 'whitemage', 0, 80, 3, { status: ['silence', 100], desc: 'Silences the foe: no magic-job moves.' }),
    // Thief
    mug: mv('Mug', 'thief', 45, 100, 0, { desc: 'A sneaky swipe.' }),
    quickhit: mv('Quick Hit', 'thief', 40, 100, 0, { prio: 1, desc: 'Strikes first.' }),
    trip: mv('Trip', 'thief', 0, 100, 1, { stat: ['spd', -1, 'foe'], desc: "Trips the foe: Speed down." }),
    backstab: mv('Backstab', 'thief', 70, 100, 2, { crit: 1, desc: 'From behind. Likely to crit.' }),
    poison_dart: mv('Poison Dart', 'thief', 20, 100, 2, { status: ['poison', 80], desc: 'A tipped dart. Usually Poisons.' }),
    smoke: mv('Smoke Bomb', 'thief', 0, 85, 2, { status: ['blind', 100], desc: 'Blinds the foe.' }),
    shuriken: mv('Shuriken', 'thief', 90, 95, 2, { desc: 'A spinning star.' }),
    // Ranger
    arrow: mv('Arrow', 'ranger', 50, 100, 0, { desc: 'A well-aimed shot.' }),
    aim: mv('Aim', 'ranger', 0, 100, 2, { stat: ['crit', 2, 'self'], desc: 'Takes aim: crits much likelier.' }),
    barrage: mv('Barrage', 'ranger', 75, 90, 2, { desc: 'A volley of arrows.' }),
    hunters_mark: mv("Hunter's Mark", 'ranger', 0, 100, 1, { stat: ['def', -1, 'foe'], desc: "Marks the foe: Defense down." }),
    sharpshot: mv('Sharpshot', 'ranger', 85, 90, 2, { crit: 1, desc: 'A precise shot. Likely to crit.' }),
    cannon: mv('Cannon', 'ranger', 110, 85, 3, { desc: 'BOOM.' }),
    // Beast (geomancy and beast-taming)
    bite: mv('Bite', 'beast', 55, 100, 0, { desc: 'Chomp.' }),
    roar: mv('Roar', 'beast', 0, 100, 1, { stat: ['atk', -1, 'foe'], desc: "A roar: the foe's Attack drops." }),
    quicksand: mv('Quicksand', 'beast', 40, 100, 1, { stat: ['spd', -1, 'foe', 100], desc: 'Sucks the foe down: Speed down.' }),
    gaia_rage: mv('Gaia Rage', 'beast', 80, 90, 2, { desc: 'The earth itself strikes.' }),
    wild_rush: mv('Wild Rush', 'beast', 95, 90, 3, { desc: 'A stampede of one.' }),
    // Bard (songs and dances)
    sonic_chord: mv('Sonic Chord', 'bard', 50, 100, 0, { desc: 'A sharp chord.' }),
    lullaby: mv('Lullaby', 'bard', 0, 75, 3, { status: ['sleep', 100], desc: 'Sends the foe to Sleep.' }),
    battle_song: mv('Battle Song', 'bard', 0, 100, 2, { stat: ['atk', 1, 'self'], desc: 'A rousing song: Attack up.' }),
    requiem: mv('Requiem', 'bard', 85, 90, 2, { desc: 'A mournful, crushing verse.' }),
    sword_dance: mv('Sword Dance', 'bard', 0, 100, 3, { stat: ['atk', 2, 'self'], desc: 'A blade dance: Attack sharply up.' }),
    tempt: mv('Tempt', 'bard', 0, 75, 3, { status: ['confuse', 100], desc: 'A dizzying dance: Confuses.' }),
    // Monk
    kick: mv('Kick', 'monk', 50, 100, 0, { desc: 'A spinning kick.' }),
    aura_bolt: mv('Aura Bolt', 'monk', 80, 95, 2, { desc: 'A blast of ki.' }),
    chakra: mv('Chakra', 'monk', 0, 100, 3, { heal: 0.5, cures: ['poison', 'blind'], desc: 'Heals 50% and cures Poison and Blind.' }),
    pummel: mv('Pummel', 'monk', 100, 85, 3, { desc: 'A flurry of fists.' }),
  };

  // ------------------------------------------------------------------ items: bag (field and battle) and held
  KP.ITEMS = {
    // the nuts, to befriend a wild moogle you've beaten (Kupomon's Poké Balls: docs/KUPOMON.md "Befriending"). nut: how
    // tasty (the chance x it); bonus: when it's tastier still (kp_battle.js NUT_BONUS); after: what it does on joining
    kupo_nut: { name: 'Kupo Nut', kind: 'nut', nut: 1, price: 200, desc: 'Toss it to a wild moogle you\'ve beaten. If it likes the taste, it may want to join you.' },
    golden_nut: { name: 'Golden Kupo Nut', kind: 'nut', nut: 2, price: 600, desc: 'A golden Kupo Nut, twice as tasty. Few moogles can resist one.' },
    royal_nut: { name: 'Royal Kupo Nut', kind: 'nut', nut: 3, price: 1200, desc: 'Fit for a Moogle King: three times as tasty as a plain Kupo Nut.' },
    sprout_nut: { name: 'Sprout Nut', kind: 'nut', nut: 1, bonus: 'young', price: 600, desc: 'A soft young nut. The lower the moogle\'s level, the more it likes it.' },
    quick_nut: { name: 'Quick Nut', kind: 'nut', nut: 1, bonus: 'quick', price: 1000, desc: 'Four times as tasty to a moogle you beat in a single turn.' },
    roast_nut: { name: 'Slow-Roast Nut', kind: 'nut', nut: 1, bonus: 'slow', price: 1000, desc: 'The longer the battle went on, the hungrier it is for this one (up to four times).' },
    familiar_nut: { name: 'Familiar Nut', kind: 'nut', nut: 1, bonus: 'repeat', price: 1000, desc: 'Three times as tasty to a moogle whose kind you\'ve befriended before.' },
    sleepy_nut: { name: 'Sleepy Nut', kind: 'nut', nut: 1, bonus: 'dream', price: 1000, desc: 'Four times as tasty to a moogle that went down asleep.' },
    glow_nut: { name: 'Glow Nut', kind: 'nut', nut: 1, bonus: 'dark', price: 1000, desc: 'It glows in the dark: three and a half times as tasty in caves and dark places.' },
    spell_nut: { name: 'Spellbound Nut', kind: 'nut', nut: 1, bonus: 'magic', price: 1000, desc: 'Three times as tasty to the magic jobs: Black, White and Red Mages, Summoners, Time Mages and Bards.' },
    tough_nut: { name: 'Tough Nut', kind: 'nut', nut: 1, bonus: 'fighter', price: 1000, desc: 'Hard to crack. Three times as tasty to Warriors, Knights, Monks and Dragoons.' },
    wild_nut: { name: 'Wild Nut', kind: 'nut', nut: 1, bonus: 'rover', price: 1000, desc: 'Three times as tasty to the roving jobs: Thieves, Rangers, Beastmasters, Machinists and Freelancers.' },
    hefty_nut: { name: 'Hefty Nut', kind: 'nut', nut: 1, bonus: 'level', price: 1000, desc: 'The more your moogle out-levels it, the tastier (twice, or four times at double its level).' },
    oil_nut: { name: 'Oil-Glazed Nut', kind: 'nut', nut: 1, after: 'heal', price: 300, desc: 'A plain nut with an oily glaze: a moogle that joins over one comes fully repaired.' },
    fancy_nut: { name: 'Fancy Nut', kind: 'nut', nut: 1, after: 'plus', price: 3000, desc: 'A gourmet treat. A moogle that joins over one is so pleased it gets a + (a little stronger).' },
    mognet_nut: { name: 'Mognet Nut', kind: 'nut', nut: 1, price: 0, desc: 'A free gift from the Mart for buying ten nuts at once. Just as tasty as a Kupo Nut.' },
    crystal_nut: { name: 'Crystal Kupo Nut', kind: 'nut', nut: 255, price: 0, desc: 'A legendary nut. No moogle has ever said no to one.' },
    oil_can: { name: 'Oil Can', kind: 'heal', heal: 20, price: 300, desc: 'Restores 20 HP.' },
    hi_oil: { name: 'Hi-Oil', kind: 'heal', heal: 60, price: 700, desc: 'Restores 60 HP.' },
    max_oil: { name: 'Max Oil', kind: 'heal', heal: 9999, price: 2500, desc: 'Restores all HP.' },
    battery: { name: 'Spare Battery', kind: 'revive', heal: 0.5, price: 1500, desc: 'Powers a downed moogle back up with half its HP.' },
    fixit: { name: 'Fix-It Kit', kind: 'cure', price: 250, desc: 'Cures any lasting status.' },
    // held (passive)
    leftover_nut: { name: 'Leftover Nut', kind: 'held', leftovers: true, price: 2000, desc: 'Held: restores 1/16 of max HP every turn.' },
    lucky_pom: { name: 'Lucky Pom', kind: 'held', crit: 1, price: 1500, desc: 'Held: crits likelier.' },
    quick_gear: { name: 'Quick Gear', kind: 'held', quickChance: 20, price: 1500, desc: 'Held: sometimes moves first.' },
    focus_pom: { name: 'Focus Pom', kind: 'held', focusChance: 10, price: 1800, desc: 'Held: may hang on with 1 HP.' },
    cure_nut: { name: 'Cure Nut', kind: 'held', once: true, cureStatus: 'lasting', price: 300, desc: 'Held, used up: cures its first lasting status.' },
    mini_oil: { name: 'Mini Oil', kind: 'held', once: true, price: 400, desc: 'Held, used up: restores a quarter of its HP below half.' },
    // Kupomon's Lucky Egg, after FF7's EXP Plus materia: one in the whole game, a secret in Prof. Sith's lab (the left
    // bookshelf), hinted at in Pomville, on Route 1 and in Mogridge
    exp_plus: { name: 'EXP Plus', kind: 'held', expMul: 1.5, price: 10000, desc: 'Held: earns half as much EXP again (×1.5).' },
    // Kupomon's Amulet Coin: the Charm Mog's own lucky piece (Sandsea's Grand Bazaar; the later Marts)
    gamblers_coin: { name: "Gambler's Coin", kind: 'held', coins: 2, price: 8000, desc: 'Held by a team member: prize coins ×2 (trainer battles and tournament purses).' },
  };
  // a type booster for each type (held: +20% to that type's moves)
  const BOOST = { freelancer: 'Silk Pom', warrior: 'Warrior Belt', knight: 'Knight Crest', monk: 'Prayer Beads', thief: 'Thief Gloves',
    dragoon: 'Dragon Scale', ranger: 'Ranger Quiver', blackmage: 'Black Tome', whitemage: 'White Tome', redmage: 'Red Feather',
    summoner: 'Summon Horn', timemage: 'Hourglass', bard: 'Silver Lyre', beast: 'Beast Fang', machinist: 'Gear Oil' };
  for (const t in BOOST) KP.ITEMS['boost_' + t] = { name: BOOST[t], kind: 'held', boost: t, price: 1000, desc: `Held: ${KP.TYPE_NAMES[t]} moves +20%.` };

  // ------------------------------------------------------------------ species
  // id: the moogle and its job. base { hp, atk, def, spd }; moves (4, at least one with no cooldown); evo { at, to };
  // rate: catch rate (3-255); exp: base yield; curve: 'fast' | 'medium' | 'slow'; fur / nose: the robot's colours
  const sp = (moogle, job, base, moves, o = {}) => Object.assign({ moogle, job, type: KP.JOBS[job].type, base, moves, rate: 120, exp: 60, curve: 'medium' }, o);
  KP.SPECIES = {
    // the starters (rate 45), the starter triangle: Warrior > Black Mage > White Mage > Warrior
    moglin_warrior: sp('Moglin', 'warrior', { hp: 55, atk: 65, def: 55, spd: 50 }, ['slash', 'warcry', 'bravery', 'kupo_charge'], { evo: { at: 14, to: 'moglin_gladiator' }, rate: 45, exp: 64, fur: '#f2ece0',
      desc: "A robot of Moglin, the moogle who stood in for a samurai. Swings a sword twice its size and loves it." }),
    moglin_gladiator: sp('Moglin', 'gladiator', { hp: 70, atk: 85, def: 70, spd: 65 }, ['slash', 'cleave', 'bravery', 'warcry'], { evo: { at: 24, to: 'moglin_samurai' }, rate: 45, exp: 142, fur: '#f2ece0',
      desc: 'Fights for the crowd. The louder they cheer, the harder it hits.' }),
    moglin_samurai: sp('Moglin', 'samurai', { hp: 85, atk: 115, def: 85, spd: 90 }, ['slash', 'iai', 'zantetsu', 'bravery'], { rate: 45, exp: 236, fur: '#f2ece0',
      desc: 'Calm as still water. Its blade is out and back in its sheath before you hear it.' }),
    kupwick_blackmage: sp('Kupwick', 'blackmage', { hp: 45, atk: 70, def: 40, spd: 65 }, ['fire', 'blizzard', 'thunder', 'focus'], { evo: { at: 14, to: 'kupwick_blackwizard' }, rate: 45, exp: 62, fur: '#e8e4d8',
      desc: "Named for the candle wick it lit as a spark. Nobody's ever seen its face under the hat." }),
    kupwick_blackwizard: sp('Kupwick', 'blackwizard', { hp: 60, atk: 95, def: 55, spd: 85 }, ['fire', 'fira', 'blizzard', 'bio'], { evo: { at: 24, to: 'kupwick_magus' }, rate: 45, exp: 142, fur: '#e8e4d8',
      desc: 'Its eyes glow brighter as its spells grow. It keeps singeing its own pom-pom.' }),
    kupwick_magus: sp('Kupwick', 'magus', { hp: 75, atk: 125, def: 70, spd: 110 }, ['fire', 'firaga', 'thunder', 'focus'], { look: { extra: ['wisps'] }, rate: 45, exp: 238, fur: '#e8e4d8',
      desc: 'A master of the black arts. Its horned hat crackles with old, angry magic.' }),
    pomsprout_whitemage: sp('Pomsprout', 'whitemage', { hp: 60, atk: 50, def: 60, spd: 45 }, ['banish', 'cure', 'protect', 'pout'], { evo: { at: 14, to: 'pomsprout_devout' }, rate: 45, exp: 63, fur: '#f8f4ea',
      desc: "Sprouted in the Moogle Village garden. It patches up anyone who trips, whether they want it or not." }),
    pomsprout_devout: sp('Pomsprout', 'devout', { hp: 80, atk: 70, def: 85, spd: 60 }, ['banish', 'dia', 'cure', 'protect'], { evo: { at: 24, to: 'pomsprout_whitewizard' }, rate: 45, exp: 142, fur: '#f8f4ea',
      desc: 'Its prayers are said to keep whole villages safe. Its hood is always spotless.' }),
    pomsprout_whitewizard: sp('Pomsprout', 'whitewizard', { hp: 105, atk: 90, def: 110, spd: 75 }, ['banish', 'holy', 'cure', 'hush'], { look: { extra: ['halo'] }, rate: 45, exp: 239, fur: '#f8f4ea',
      desc: 'Light gathers around it. Even the angriest moogles calm down in its presence.' }),
    // route 1 and the meadows round Pomville
    tufty_freelancer: sp('Tufty', 'freelancer', { hp: 45, atk: 45, def: 40, spd: 50 }, ['pom_bop', 'mug', 'pout', 'kupo_charge'], { evo: { at: 12, to: 'tufty_mime' }, rate: 255, exp: 50, curve: 'fast', fur: '#f0e8d8',
      desc: 'The most common robot moogle. It wants a job, any job, and hasn\'t decided yet.' }),
    tufty_mime: sp('Tufty', 'mime', { hp: 70, atk: 70, def: 65, spd: 80 }, ['pom_bop', 'copycat', 'kupo_charge', 'juggle'], { rate: 120, exp: 130, curve: 'fast', fur: '#f0e8d8',
      desc: 'Copies whatever it sees. Two Tufty Mimes meeting can stare at each other for days.' }),
    nutmog_thief: sp('Nutmog', 'thief', { hp: 40, atk: 50, def: 35, spd: 70 }, ['mug', 'quickhit', 'trip', 'smoke'], { evo: { at: 15, to: 'nutmog_treasure_hunter' }, rate: 200, exp: 55, fur: '#e8dcc8',
      desc: 'Hides the Kupo Nuts it pinches in its pom-pom. It always has more than you think.' }),
    nutmog_treasure_hunter: sp('Nutmog', 'treasure_hunter', { hp: 60, atk: 75, def: 55, spd: 100 }, ['mug', 'backstab', 'trip', 'poison_dart'], { evo: { at: 25, to: 'nutmog_ninja' }, rate: 90, exp: 140, fur: '#e8dcc8',
      desc: "Calls itself a treasure hunter. Please don't call it a thief." }),
    nutmog_ninja: sp('Nutmog', 'ninja', { hp: 75, atk: 105, def: 70, spd: 125 }, ['quickhit', 'shuriken', 'backstab', 'smoke'], { rate: 45, exp: 230, fur: '#e8dcc8',
      desc: 'Moves without a sound. You only know it was there because your nuts are gone.' }),
    mogpost_ranger: sp('Mogpost', 'ranger', { hp: 45, atk: 55, def: 40, spd: 60 }, ['arrow', 'aim', 'hunters_mark', 'barrage'], { evo: { at: 16, to: 'mogpost_cannoneer' }, rate: 170, exp: 58, fur: '#f4ecdc',
      desc: 'Once a Mognet courier. It still delivers, only now by arrow.' }),
    mogpost_cannoneer: sp('Mogpost', 'cannoneer', { hp: 70, atk: 90, def: 65, spd: 80 }, ['arrow', 'cannon', 'sharpshot', 'aim'], { rate: 75, exp: 150, fur: '#f4ecdc',
      desc: 'Delivers express. Very express. Stand well back from the parcel.' }),
    mossmog_geomancer: sp('Mossmog', 'geomancer', { hp: 55, atk: 50, def: 55, spd: 45 }, ['bite', 'quicksand', 'gaia_rage', 'roar'], { evo: { at: 17, to: 'mossmog_beastmaster' }, rate: 150, exp: 60, fur: '#dce8c8',
      desc: 'Grew up in Moore Forest. Moss grows on its back if it stands still too long.' }),
    mossmog_beastmaster: sp('Mossmog', 'beastmaster', { hp: 80, atk: 80, def: 80, spd: 70 }, ['bite', 'wild_rush', 'roar', 'gaia_rage'], { rate: 70, exp: 152, fur: '#dce8c8',
      desc: 'Wild moogles follow it in a line. It pretends not to notice.' }),
    mopluff_bard: sp('Mopluff', 'bard', { hp: 50, atk: 40, def: 45, spd: 55 }, ['sonic_chord', 'lullaby', 'battle_song', 'pout'], { evo: { at: 16, to: 'mopluff_dancer' }, rate: 180, exp: 56, fur: '#f6eee4',
      desc: 'Hums all day. Its lullaby has put whole routes to sleep, trainers and all.' }),
    mopluff_dancer: sp('Mopluff', 'dancer', { hp: 70, atk: 70, def: 65, spd: 95 }, ['sonic_chord', 'requiem', 'sword_dance', 'tempt'], { rate: 80, exp: 148, fur: '#f6eee4',
      desc: 'Never stops dancing, not even in battle. Especially not in battle.' }),
    stampo_monk: sp('Stampo', 'monk', { hp: 55, atk: 70, def: 50, spd: 55 }, ['kick', 'aura_bolt', 'chakra', 'pout'], { evo: { at: 18, to: 'stampo_blackbelt' }, rate: 60, exp: 70, curve: 'slow', fur: '#f0e4d0',
      desc: 'A Mognet stamp moogle who took up martial arts. Stamps letters with one punch.' }),
    stampo_blackbelt: sp('Stampo', 'blackbelt', { hp: 75, atk: 100, def: 70, spd: 80 }, ['kick', 'pummel', 'aura_bolt', 'chakra'], { rate: 30, exp: 160, curve: 'slow', fur: '#f0e4d0',
      desc: 'Breaks boulders for breakfast. Prefers Kupo Nuts, really.' }),
  };
  // the Kupodex order (the dex numbers)
  KP.DEX = Object.keys(KP.SPECIES);
  KP.STARTERS = ['moglin_warrior', 'kupwick_blackmage', 'pomsprout_whitemage'];
  // Sephiroth takes the starter that beats yours (Zack, the last one)
  KP.RIVAL_PICK = { moglin_warrior: 'pomsprout_whitemage', kupwick_blackmage: 'moglin_warrior', pomsprout_whitemage: 'kupwick_blackmage' };

  // ------------------------------------------------------------------ level curves (exp for level n), max level 30
  KP.MAX_LEVEL = 30;
  KP.CURVES = { fast: (n) => Math.floor(0.8 * n * n * n), medium: (n) => n * n * n, slow: (n) => Math.floor(1.25 * n * n * n) };

  // ------------------------------------------------------------------ wild tables: [species, weight, minLv, maxLv]
  KP.WILD = {
    kp_route1: [['tufty_freelancer', 35, 2, 4], ['nutmog_thief', 25, 2, 4], ['mopluff_bard', 18, 2, 4], ['mogpost_ranger', 14, 3, 4], ['stampo_monk', 5, 3, 5], ['mossmog_geomancer', 3, 3, 5]],
    kp_route1_north: [['tufty_freelancer', 25, 3, 5], ['mossmog_geomancer', 25, 3, 6], ['mogpost_ranger', 20, 3, 5], ['nutmog_thief', 18, 4, 5], ['stampo_monk', 12, 4, 6]],
  };
})();
