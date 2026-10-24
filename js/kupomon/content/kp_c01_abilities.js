// Kupomon expansion: abilities (docs/KUPOMON_MECHANICS.md "Abilities"). Pinch boosts for the twelve types the starters
// don't cover, the weather and terrain makers, the field crystals (Protosynthesis' kind), the four Ruins, the flag and
// contact kinds, the "when hit" rules, and eight for the legends and mythicals (legend: true; Trace can't copy those).
(function () {
  const KP = FF7.kupomon;
  KP.content('abilities', {
    abilities: {
      // ---- in a pinch (Blaze's kind), for the twelve types without one yet
      kupo_spirit: { name: 'Kupo Spirit', desc: 'Freelancer moves hit 1.5x at 1/3 HP or less.', boost: { types: ['freelancer'], mul: 1.5, below: 0.34 } },
      last_bastion: { name: 'Last Bastion', desc: 'Knight moves hit 1.5x at 1/3 HP or less.', boost: { types: ['knight'], mul: 1.5, below: 0.34 } },
      riddle_of_fire: { name: 'Riddle of Fire', desc: 'Monk moves hit 1.5x at 1/3 HP or less.', boost: { types: ['monk'], mul: 1.5, below: 0.34 } },
      desperado: { name: 'Desperado', desc: 'Thief moves hit 1.5x at 1/3 HP or less.', boost: { types: ['thief'], mul: 1.5, below: 0.34 } },
      dragon_spirit: { name: 'Dragon Spirit', desc: 'Dragoon moves hit 1.5x at 1/3 HP or less.', boost: { types: ['dragoon'], mul: 1.5, below: 0.34 } },
      raging_strikes: { name: 'Raging Strikes', desc: 'Ranger moves hit 1.5x at 1/3 HP or less.', boost: { types: ['ranger'], mul: 1.5, below: 0.34 } },
      vermilion_fury: { name: 'Vermilion Fury', desc: 'Red Mage moves hit 1.5x at 1/3 HP or less.', boost: { types: ['redmage'], mul: 1.5, below: 0.34 } },
      dreadwyrm_trance: { name: 'Dreadwyrm Trance', desc: 'Summoner moves hit 1.5x at 1/3 HP or less.', boost: { types: ['summoner'], mul: 1.5, below: 0.34 } },
      quickening: { name: 'Quickening', desc: 'Time Mage moves hit 1.5x at 1/3 HP or less.', boost: { types: ['timemage'], mul: 1.5, below: 0.34 } },
      grand_finale: { name: 'Grand Finale', desc: 'Bard moves hit 1.5x at 1/3 HP or less.', boost: { types: ['bard'], mul: 1.5, below: 0.34 } },
      primal_fury: { name: 'Primal Fury', desc: 'Beast moves hit 1.5x at 1/3 HP or less.', boost: { types: ['beast'], mul: 1.5, below: 0.34 } },
      overheat: { name: 'Overheat', desc: 'Machinist moves hit 1.5x at 1/3 HP or less.', boost: { types: ['machinist'], mul: 1.5, below: 0.34 } },

      // ---- coming out
      mental_break: { name: 'Mental Break', desc: "Foe's Magic drops as it comes out; its touch may Silence (20%).", onEnter: { foe: ['mag', -1] }, onContactStatus: ['silence', 20] },
      auto_wall: { name: 'Auto-Wall', desc: 'Comes out behind a wall: its Defense and Resistance rise.', onEnterBoosts: { self: { def: 1, res: 1 } } },
      blue_learning: { name: 'Learning', desc: "Copies the foe's ability as it comes out; earns 1.2x EXP.", trace: true, expMul: 1.2 },
      libra: { name: 'Libra', desc: "Shows the foe's item; Atk +1 if its Def is lower, else Mag +1.", frisk: true, download: true },
      eye_of_storm: { name: 'Eye of the Storm', desc: 'While it is out, the weather has no effect.', cloudNine: true },

      // ---- the weather and terrain makers (each quicker in its own)
      lightbringer: { name: 'Lightbringer', desc: 'Brings Radiance as it comes out; Speed 1.5x in Radiance.', setWeather: 'radiance', fieldSpd: { radiance: 1.5 } },
      shadowbringer: { name: 'Shadowbringer', desc: 'Brings Gloom as it comes out; Speed 1.5x in Gloom.', setWeather: 'gloom', fieldSpd: { gloom: 1.5 } },
      dune_caller: { name: 'Dune Caller', desc: 'Brings a Sandstorm; Speed 1.5x in it, and no weather chip.', setWeather: 'sandstorm', fieldSpd: { sandstorm: 1.5 }, overcoat: true },
      mana_tempest: { name: 'Mana Tempest', desc: 'Brings a Manastorm as it comes out; Speed 1.5x in one.', setWeather: 'manastorm', fieldSpd: { manastorm: 1.5 } },
      opening_act: { name: 'Opening Act', desc: 'Starts a Rhythm Field as it comes out; Speed 1.5x on one.', setTerrain: 'rhythm', fieldSpd: { rhythm: 1.5 } },
      mako_spring: { name: 'Mako Spring', desc: 'Raises the Lifestream as it comes out; Speed 1.5x on it.', setTerrain: 'lifestream', fieldSpd: { lifestream: 1.5 } },
      mistbringer: { name: 'Mistbringer', desc: 'Spreads Fog as it comes out; Speed 1.5x in Fog.', setTerrain: 'fog', fieldSpd: { fog: 1.5 } },
      time_compression: { name: 'Time Compression', desc: 'Starts a Time Field as it comes out; Speed 1.5x on one.', setTerrain: 'chrono', fieldSpd: { chrono: 1.5 } },
      desert_fury: { name: 'Desert Fury', desc: 'Attack and Magic 1.3x in a Sandstorm.', fieldStat: { sandstorm: { atk: 1.3, mag: 1.3 } } },
      // the crystals: its highest stat x1.3 (Speed x1.5) while that field is up
      light_crystal: { name: 'Light Crystal', desc: 'Its highest stat is 1.3x in Radiance (Speed: 1.5x).', boostHighest: 'radiance' },
      dark_crystal: { name: 'Dark Crystal', desc: 'Its highest stat is 1.3x in Gloom (Speed: 1.5x).', boostHighest: 'gloom' },
      earth_crystal: { name: 'Earth Crystal', desc: 'Its highest stat is 1.3x in a Sandstorm (Speed: 1.5x).', boostHighest: 'sandstorm' },
      mana_crystal: { name: 'Mana Crystal', desc: 'Its highest stat is 1.3x in a Manastorm (Speed: 1.5x).', boostHighest: 'manastorm' },
      song_crystal: { name: 'Song Crystal', desc: 'Its highest stat is 1.3x on a Rhythm Field (Speed: 1.5x).', boostHighest: 'rhythm' },
      life_crystal: { name: 'Life Crystal', desc: 'Its highest stat is 1.3x on the Lifestream (Speed: 1.5x).', boostHighest: 'lifestream' },
      mist_crystal: { name: 'Mist Crystal', desc: 'Its highest stat is 1.3x in Fog (Speed: 1.5x).', boostHighest: 'fog' },
      time_crystal: { name: 'Time Crystal', desc: 'Its highest stat is 1.3x on a Time Field (Speed: 1.5x).', boostHighest: 'chrono' },
      // zones
      time_twister: { name: 'Time Twister', desc: 'Starts Time Warp as it comes out, or ends one already up.', setRoom: 'timewarp' },
      gravitas: { name: 'Gravitas', desc: 'Starts Gravity as it comes out, or ends one already up.', setRoom: 'gravity' },

      // ---- the four Ruins (the Four Fiends): one of the foe's stats lowered while it's out
      lich_ruin: { name: "Lich's Ruin", desc: "The foe's Attack is 0.75x while it is out.", foeStatMul: { atk: 0.75 } },
      marilith_ruin: { name: "Marilith's Ruin", desc: "The foe's Magic is 0.75x while it is out.", foeStatMul: { mag: 0.75 } },
      kraken_ruin: { name: "Kraken's Ruin", desc: "The foe's Defense is 0.75x while it is out.", foeStatMul: { def: 0.75 } },
      tiamat_ruin: { name: "Tiamat's Ruin", desc: "The foe's Resistance is 0.75x while it is out.", foeStatMul: { res: 0.75 } },

      // ---- Freelancer moves turned into another type (Pixilate's kind)
      dragonsong: { name: 'Dragonsong', desc: 'Freelancer moves become Dragoon moves and hit 1.2x.', ateType: { from: 'freelancer', to: 'dragoon', mul: 1.2 } },
      sanctify: { name: 'Sanctify', desc: 'Freelancer moves become White Mage moves and hit 1.2x.', ateType: { from: 'freelancer', to: 'whitemage', mul: 1.2 } },
      magitek_infusion: { name: 'Magitek Infusion', desc: 'Freelancer moves become Machinist moves and hit 1.2x.', ateType: { from: 'freelancer', to: 'machinist', mul: 1.2 } },

      // ---- moves of a kind (their flags)
      brawler_soul: { name: 'Brawler', desc: 'Punches hit 1.2x; its Freelancer and Monk moves reach Summoners.', flagBoost: { punch: 1.2 }, scrappy: true },
      ghoul_fang: { name: 'Ghoul Fang', desc: 'Bites hit 1.3x; its contact moves may make a Zombie (20%).', flagBoost: { bite: 1.3 }, onContactStatus: ['zombie', 20] },
      iaijutsu: { name: 'Iaijutsu', desc: 'Moves first the turn it comes out; slicing moves hit 1.3x.', firstStrike: true, flagBoost: { slice: 1.3 } },
      gun_mastery: { name: 'Gun Mastery', desc: 'Ball, bullet and pulse moves hit 1.3x.', flagBoost: { bullet: 1.3, pulse: 1.3 } },
      hand_to_hand: { name: 'Hand to Hand', desc: 'Contact moves hit 1.3x.', flagBoost: { contact: 1.3 } },
      kupo_punk: { name: 'Kupo Punk', desc: 'Sound moves hit 1.3x, and sound moves hit it for half.', flagBoost: { sound: 1.3 }, flagResist: { sound: 0.5 } },
      sylph_dance: { name: 'Sylph Dance', desc: 'Wind and dance moves hit 1.3x.', flagBoost: { wind: 1.3, dance: 1.3 } },
      funguar_spores: { name: 'Funguar Spores', desc: 'Hits on it may Poison, Sleep or Slow (30%); powder moves 1.3x.', onHit: { status: [['poison', 'sleep', 'slow'], 30] }, flagBoost: { powder: 1.3 } },
      daredevil: { name: 'Daredevil', desc: 'Moves with recoil hit 1.2x, and it takes no recoil.', flagBoost: { recoil: 1.2 }, rockHead: true },

      // ---- its touch (contact moves) gives an ailment
      scorpion_tail: { name: 'Scorpion Tail', desc: 'Its touch may Venom (20%); always crits a foe with an ailment.', onContactStatus: ['venom', 20], merciless: true },
      flametongue: { name: 'Flametongue', desc: 'Its contact moves may Burn the target (30%).', onContactStatus: ['burn', 30] },
      mini_hammer: { name: 'Mini Hammer', desc: 'Its contact moves may shrink the target to Mini (20%).', onContactStatus: ['mini', 20] },

      // ---- attacking
      finesse: { name: 'Finesse', desc: 'Moves of 60 power or less hit 1.5x.', technician: true },
      spellcraft: { name: 'Spellcraft', desc: 'Its magic moves hit 1.2x.', catBoost: { magic: 1.2 } },
      piercing_gaze: { name: 'Piercing Gaze', desc: 'Its not-very-effective hits do double damage.', tintedLens: true },
      deadeye: { name: 'Deadeye', desc: 'Its moves never miss, and its critical hits do 1.5x more.', noMiss: true, sniper: 1.5 },
      wait_mode: { name: 'Wait Mode', desc: 'Moves last for its priority; hits 1.3x after its target moves.', moveLast: true, analytic: true },
      lie_in_wait: { name: 'Lie in Wait', desc: 'Hits 2x on a foe that came in this turn.', stakeout: true },
      avenger: { name: 'Avenger', desc: 'Its moves hit 10% harder for each fainted teammate (max 5).', fallenBoost: 0.1 },
      raw_power: { name: 'Raw Power', desc: 'Moves with added effects hit 1.3x but lose those effects.', sheerForce: true },
      ifrits_blood: { name: "Ifrit's Blood", desc: "No Burns; Black Mage moves can't hurt it and power its own 1.5x.", immune: ['blackmage'], flashFire: true, noStatus: ['burn'] },
      pom_power: { name: 'Pom Power', desc: 'Attack 1.5x, but its physical moves are 0.8x as accurate.', hustle: true },
      rapid_fire: { name: 'Rapid Fire', desc: 'Multi-hit moves always hit the most times; accuracy 1.2x.', skillLink: true, accMul: 1.2 },
      duel_stance: { name: 'Duel Stance', desc: 'Every move it uses, and every move aimed at it, lands.', noGuard: true },
      berserker_rage: { name: 'Berserker', desc: 'Attack 1.5x, locked into its first move (no cooldown on it).', gorillaTactics: true },

      // ---- stats
      titans_might: { name: "Titan's Might", desc: 'Its Attack is doubled.', statMul: { atk: 2, mag: 1 } },
      light_armor: { name: 'Light Armor', desc: 'Speed 1.3x, but Defense and Resistance 0.8x.', statMul: { spd: 1.3, def: 0.8 } },
      battle_scars: { name: 'Battle Scars', desc: 'Defense 1.5x while it has a lasting ailment.', statusStat: { def: 1.5 } },
      fight_or_flight: { name: 'Fight or Flight', desc: 'Speed 1.5x with a lasting ailment, and 1.5x at 1/3 HP or less.', statusStat: { spd: 1.5 }, pinchSpd: 1.5 },
      sleepless_fury: { name: 'Sleepless Fury', desc: 'Attacks 1.5x with an ailment; it never sleeps or gets Drowsy.', guts: 1.5, noStatus: ['sleep', 'yawn'] },
      chicken_heart: { name: 'Chicken Heart', desc: 'Attack and Magic halve at 1/2 HP; it can always run away.', defeatist: true, runAway: true },
      zen_mind: { name: 'Zen Mind', desc: "Ignores foes' stat stages; it never flinches, and glares fail.", unaware: true, innerFocus: true },
      featherweight: { name: 'Featherweight', desc: "Speed 2x once its held item is gone; it can't be Slowed.", unburden: true, noStatus: ['slow'] },

      // ---- what it can't be hurt by, or takes less from
      esper_eater: { name: 'Esper Eater', desc: 'Summoner moves raise its Magic instead of hurting it.', immune: ['summoner'], absorbBoost: { mag: 1 } },
      scrap_eater: { name: 'Scrap Eater', desc: 'Machinist moves heal it by 1/4 instead of hurting it.', immune: ['machinist'], absorb: true },
      arrow_guard: { name: 'Arrow Guard', desc: "Ball and bullet moves can't touch it; Ranger hits do half.", flagImmune: ['bullet'], resist: { ranger: 0.5 } },
      gas_mask: { name: 'Gas Mask', desc: "Powder moves fail on it; Poison and Venom can't take hold.", flagImmune: ['powder'], noStatus: ['poison', 'venom'] },
      runic: { name: 'Runic', desc: 'Magic hits on it do half damage.', catResist: { magic: 0.5 } },
      pom_fluff: { name: 'Pom Fluff', desc: 'Contact hits on it do half, but Black Mage hits do double.', flagResist: { contact: 0.5 }, resist: { blackmage: 2 } },
      prism_guard: { name: 'Prism Guard', desc: 'Super-effective hits on it do 0.75x damage.', filter: 0.75 },
      mythril_scales: { name: 'Mythril Scales', desc: 'At full HP, hits on it do half damage.', multiscale: 0.5 },
      hold_fast: { name: 'Hold Fast', desc: "At full HP a hit can't KO it; it can't be forced out or shrunk.", sturdy: true, anchor: true, noStatus: ['mini'] },
      adamant_shell: { name: 'Adamant Shell', desc: "No critical hits on it, and foes can't lower its stats.", noCrit: true, noStatDrop: true },
      pom_wings: { name: 'Pom Wings', desc: "It flies: Monk moves, hazards and terrain can't reach it.", float: true, immune: ['monk'] },
      gilded_body: { name: 'Gilded Body', desc: "Foes' status moves have no effect on it.", goodAsGold: true },
      auto_reflect: { name: 'Auto-Reflect', desc: "Foes' status moves and stat drops bounce back at them.", magicBounce: true, mirrorStats: true },
      royal_bearing: { name: 'Royal Bearing', desc: "Priority moves can't touch it; it can't be Taunted or Confused.", noPriorityAgainst: true, noStatus: ['taunt', 'confuse'] },
      warding_fur: { name: 'Warding Fur', desc: "Attacks' added effects never touch it, and Doom can't either.", shieldDust: true, noStatus: ['doom'] },
      mana_shield: { name: 'Mana Shield', desc: 'Only attacks can hurt it: no chip from ailments or weather.', magicGuard: true },
      blink_image: { name: 'Blink', desc: 'First hit only pops its image (1/8 HP); status moves 50% max.', disguise: true, statusEvade: true },
      healing_pom: { name: 'Healing Pom', desc: "Heals 1/16 a turn; can't be Seeded, Cursed or made a Zombie.", regen: 1 / 16, noStatus: ['leech', 'curse', 'zombie'] },

      // ---- when it's hit
      endurance: { name: 'Endurance', desc: 'Any hit on it raises its Defense.', whenHit: [{ boosts: { def: 1 } }] },
      armor_shed: { name: 'Armor Shed', desc: 'Physical hits lower its Defense but sharply raise its Speed.', whenHit: [{ cat: 'physical', boosts: { def: -1, spd: 2 } }] },
      righteous_ire: { name: 'Righteous Ire', desc: 'A Thief move hitting it raises its Attack.', whenHit: [{ type: 'thief', boosts: { atk: 1 } }] },
      flan_body: { name: 'Flan Body', desc: "Touching it lowers the foe's Speed; its touch may Slow (20%).", whenHit: [{ contact: true, foe: { spd: -1 } }], onContactStatus: ['slow', 20] },
      antlion_pit: { name: 'Antlion Pit', desc: "Grounded foes can't escape; a hit on it whips up a Sandstorm.", trapFoes: 'grounded', whenHit: [{ weather: 'sandstorm' }] },
      mako_geyser: { name: 'Mako Geyser', desc: 'Hits on it raise the Lifestream; on it, its ailments are cured.', whenHit: [{ terrain: 'lifestream' }], fieldCure: 'lifestream' },
      venom_shards: { name: 'Venom Shards', desc: "Physical hits on it scatter Venom Spikes on the foe's side.", whenHit: [{ cat: 'physical', hazard: 'venom_spikes' }] },
      kupo_panic: { name: 'Kupo Panic', desc: 'Thief, Summoner and Beast hits on it raise its Speed.', whenHit: [{ type: 'thief', boosts: { spd: 1 } }, { type: 'summoner', boosts: { spd: 1 } }, { type: 'beast', boosts: { spd: 1 } }] },
      leviathan_hide: { name: 'Leviathan Hide', desc: 'A Summoner move hitting it sharply raises its Defense.', whenHit: [{ type: 'summoner', boosts: { def: 2 } }] },
      limit_break: { name: 'Limit Break', desc: 'A super-effective hit: Atk, Mag, Speed +1; Def and Res -1.', whenHit: [{ superEff: true, boosts: { atk: 1, mag: 1, spd: 1, def: -1, res: -1 } }] },
      bomb_body: { name: 'Bomb Body', desc: 'Touching it may Burn (30%); a contact KO blasts the foe 1/4.', whenHit: [{ contact: true, status: ['burn', 30] }], aftermath: 1 / 4 },
      counter_tackle: { name: 'Counter Tackle', desc: 'Contact attackers lose 1/8 of their max HP.', roughSkin: 1 / 8 },
      tonberry_grudge: { name: 'Tonberry Grudge', desc: "Hits on it may put the attacker's move on a 3-turn cooldown.", cursedBody: 30 },
      short_fuse: { name: 'Short Fuse', desc: 'A critical hit on it maxes out its Attack.', angerPoint: true },
      shared_fate: { name: 'Shared Fate', desc: 'A foe that Poisons, Venoms, Burns or Slows it gets the same.', synchronize: true },
      defiance: { name: 'Defiance', desc: 'A stat drop from a foe: Attack +2. Flinching: Speed +1.', defiant: 'atk', steadfast: true },
      wounded_pride: { name: 'Wounded Pride', desc: 'Each stat a foe lowers sharply raises its Magic.', defiant: 'mag' },

      // ---- its own moves
      malboro_reek: { name: 'Malboro Reek', desc: 'Its hits may flinch the foe (10%); its touch may Blind (20%).', stench: 10, onContactStatus: ['blind', 20] },
      kupo_luck: { name: 'Kupo Luck', desc: "Crits likelier; its moves' added effects 1.5x as likely.", crit: 1, statusChance: 1.5 },
      vampirism: { name: 'Vampirism', desc: 'Its draining moves drain 1.5x; it heals 1/16 a turn in Gloom.', drainMul: 1.5, fieldHeal: { gloom: 1 / 16 } },
      field_medic: { name: 'Field Medic', desc: 'Healing and draining moves get +3 priority; heals 1.3x.', triage: true, healMul: 1.3 },
      pom_prank: { name: 'Pom Prank', desc: 'Its status moves get +1 priority.', prankster: true },
      wyvern_wings: { name: 'Wyvern Wings', desc: 'At full HP, its Dragoon moves get +1 priority.', prioType: { type: 'dragoon', fullHp: true } },
      sneak_attack: { name: 'Sneak Attack', desc: 'At full HP, its Thief moves get +1 priority.', prioType: { type: 'thief', fullHp: true } },
      quickcast: { name: 'Quickcast', desc: 'At full HP, its Time Mage moves get +1 priority.', prioType: { type: 'timemage', fullHp: true } },
      piercing: { name: 'Piercing', desc: "Its moves ignore the target's ability, walls and Decoy.", moldBreaker: true, infiltrator: true },
      reverse_polarity: { name: 'Reverse Polarity', desc: 'Its stat changes are turned round: rises fall, drops rise.', contrary: true },
      amplifier: { name: 'Amplifier', desc: 'Its stat changes are doubled.', simple: true },
      swiftcast: { name: 'Swiftcast', desc: "Its moves' cooldowns are a turn shorter.", cdLess: 1 },

      // ---- each turn, leaving, knocking out
      accelerate: { name: 'Accelerate', desc: 'Its Speed rises at the end of every turn.', onResidualBoost: { spd: 1 } },
      wild_card: { name: 'Wild Card', desc: 'Each turn one stat sharply rises and another falls.', moody: true },
      auto_esuna: { name: 'Auto-Esuna', desc: 'A 1 in 3 chance a turn to shed its ailment; cured on leaving.', shedSkin: 33, naturalCure: true },
      venom_drinker: { name: 'Venom Drinker', desc: 'Poison heals it 1/8 a turn; its touch may Poison (30%).', poisonHeal: true, onContactStatus: ['poison', 30] },
      auto_potion: { name: 'Auto-Potion', desc: 'Heals 1/3 of its max HP when it switches out.', regenerator: 1 / 3 },
      idle_giant: { name: 'Idle Giant', desc: 'It can act only every other turn.', truant: true },
      spoils_of_war: { name: 'Spoils of War', desc: 'Each KO raises its Attack; prize coins x2 on your team.', onKOBoost: { atk: 1 }, coins: 2 },
      apex_predator: { name: 'Apex Predator', desc: 'Each KO raises its highest stat.', beastBoost: true },
      shadow_snare: { name: 'Shadow Snare', desc: "Foes can't switch out or flee while it's out.", trapFoes: 'all' },

      // ---- the legends' and mythicals' own
      eternal_dawn: { name: 'Eternal Dawn', desc: 'Endless Radiance while it stays in; heals 1/16 a turn in it.', setWeather: 'radiance', extreme: true, fieldHeal: { radiance: 1 / 16 }, legend: true },
      eternal_night: { name: 'Eternal Night', desc: 'Endless Gloom while it stays in; Speed 1.5x in it.', setWeather: 'gloom', extreme: true, fieldSpd: { gloom: 1.5 }, legend: true },
      mana_maelstrom: { name: 'Mana Maelstrom', desc: 'Endless Manastorm while it stays in; magic hits it for 0.75x.', setWeather: 'manastorm', extreme: true, catResist: { magic: 0.75 }, legend: true },
      chrono_engine: { name: 'Chrono Engine', desc: 'Starts a Time Field as it comes out; Magic 1.33x on one.', setTerrain: 'chrono', fieldStat: { chrono: { mag: 1.33 } }, legend: true },
      dual_wield: { name: 'Dual Wield', desc: 'Its single-hit attacks strike twice; the second hits 0.25x.', parentalBond: true, legend: true },
      invincible: { name: 'Invincible', desc: 'Only super-effective attacks can damage it.', wonderGuard: true, legend: true },
      crystal_aegis: { name: 'Crystal Aegis', desc: "At full HP hits on it do half; foes can't lower its stats.", multiscale: 0.5, noStatDrop: true, legend: true },
      zodiac_brave: { name: 'Zodiac Brave', desc: "Foes' cooldowns run a turn longer; each KO raises its best stat.", announce: 'is wreathed in a zodiac aura!', pressure: 1, beastBoost: true, legend: true },
    },
  });
})();
