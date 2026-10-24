// Pokémon's tools Kupomon lacked (the user, 2026-10-03: "create those missing tools for our game"; the list from
// docs/KUPOMON_METAGAME.md): Encore, Wish, Teleport (the modern one, Gen 8 on: a pivot that moves last), Memento, Perish
// Song, Rest, Court Change, Mortal Spin, Clear Smog, Parting Shot, Flip Turn and Belly Drum, in Kupomon's jobs and names.
// Their engine: js/kupomon/kp_battle.js (perish, wish, rest, courtChange, resetFoe; the Encore state, kp_mech.js), the
// battle AI's look ahead: js/kupomon/kp_tactics.js. Taught by Skill Chips 60-71, sold in the late Marts (no level-up
// entries: a moogle's last four by its level are its designed set, and the trainers' teams keep theirs)
(function () {
  const KP = FF7.kupomon;
  KP.content('tools', {
    moves: {
      // Teleport (Gen 8+): last to move (-6), then out, a teammate in: the slow pivot
      teleport: { name: 'Teleport', type: 'timemage', prio: -6, selfSwitch: true, cd: 1, desc: 'Moves last, then blinks away: switches out for a teammate.' },
      // Encore: the foe repeats the move it last used, three turns
      encore: { name: 'Encore', type: 'bard', vol: { encore: true }, flags: ['sound'], cd: 3, desc: 'The foe must repeat the move it used last for 3 turns.' },
      // Wish: half the wisher's max HP, at the end of the next turn, to whoever is out on its side then
      star_wish: { name: 'Star Wish', type: 'whitemage', wish: true, cd: 2, desc: "Next turn's end: whoever is out heals half the wisher's max HP." },
      // Memento: the user faints; the foe's Attack and Magic fall sharply
      fond_farewell: { name: 'Fond Farewell', type: 'summoner', foe: { atk: -2, mag: -2 }, selfFaint: true, cd: 0, desc: "The user faints; the foe's Attack and Magic sharply fall." },
      // Perish Song: everything that hears it faints at the end of the third turn after, unless it switches out
      last_refrain: { name: 'Last Refrain', type: 'bard', perish: true, flags: ['sound'], cd: 4, desc: 'All who hear it faint in 3 turns, unless they switch out.' },
      // Rest: all HP back and every ailment gone, then two turns asleep
      kupo_nap: { name: 'Kupo Nap', type: 'freelancer', rest: true, cd: 2, desc: 'Restores all HP and cures ailments, then sleeps for 2 turns.' },
      // Court Change: the two sides' conditions and hazards swap over
      turnabout: { name: 'Turnabout', type: 'thief', courtChange: true, cd: 2, desc: 'Swaps every condition and hazard between the two sides.' },
      // Mortal Spin: a weak spin that clears its own side's hazards and poisons
      viper_spin: { name: 'Viper Spin', type: 'thief', power: 30, clearHazards: 'own', status: ['poison', 100], flags: ['contact'], cd: 1, desc: 'A venomous spin: clears its own side of hazards, poisons the foe.' },
      // Clear Smog: a hit that wipes the target's stat changes
      null_haze: { name: 'Null Haze', type: 'blackmage', power: 50, resetFoe: true, cd: 1, desc: "A neutralizing haze: wipes away all of the target's stat changes." },
      // Parting Shot: the foe's Attack and Magic down, then out
      parting_barb: { name: 'Parting Barb', type: 'thief', foe: { atk: -1, mag: -1 }, selfSwitch: true, flags: ['sound'], cd: 1, desc: "Lowers the foe's Attack and Magic, then switches out." },
      // Flip Turn: a physical pivot of a third job (Repelling Shot is the Ranger's, Arc Relay the Machinist's)
      undertow: { name: 'Undertow', type: 'summoner', cat: 'physical', power: 60, selfSwitch: true, flags: ['contact'], cd: 1, desc: "Leviathan's riptide: hits, then rides it back and switches out." },
      // Belly Drum: half its HP for Attack at the top
      war_drum: { name: 'War Drum', type: 'warrior', hpCost: 0.5, self: { atk: 12 }, cd: 3, desc: 'Pays half its HP to max out its Attack.' },
    },
  });
  // ---- the Skill Chips: [number, move, price, jobs, also, the Mart that sells it]
  const ALL = ['freelancer', 'warrior', 'knight', 'monk', 'thief', 'dragoon', 'ranger', 'blackmage', 'whitemage', 'redmage', 'summoner', 'timemage', 'bard', 'beast', 'machinist'];
  const CHIPS = [
    [60, 'teleport', 8000, ['timemage', 'whitemage', 'redmage', 'summoner', 'bard'], [], 'kp_coliseum_center'],
    [61, 'encore', 8000, ['bard', 'thief', 'freelancer', 'redmage'], [], 'kp_coliseum_center'],
    [62, 'star_wish', 9000, ['whitemage', 'summoner', 'freelancer', 'bard'], [], 'kp_coliseum_center'],
    [63, 'kupo_nap', 6000, ALL, [], 'kp_coliseum_center'],
    [64, 'fond_farewell', 7000, ['summoner', 'thief', 'blackmage', 'freelancer'], [], 'kp_costa_center'],
    [65, 'last_refrain', 9000, ['bard', 'summoner', 'timemage'], [], 'kp_costa_center'],
    [66, 'turnabout', 8000, ['thief', 'monk', 'freelancer', 'timemage'], [], 'kp_costa_center'],
    [67, 'viper_spin', 7000, ['thief', 'beast', 'ranger', 'machinist'], [], 'kp_candlerock_center'],
    [68, 'null_haze', 7000, ['blackmage', 'redmage', 'machinist', 'beast'], [], 'kp_candlerock_center'],
    [69, 'parting_barb', 8000, ['thief', 'bard', 'summoner'], [], 'kp_candlerock_center'],
    [70, 'undertow', 8000, ['summoner', 'dragoon', 'monk', 'beast'], [], 'kp_glimmerfair_center'],
    [71, 'war_drum', 9000, ['warrior', 'monk', 'beast', 'freelancer'], [], 'kp_glimmerfair_center'],
    // (three moves no moogle could learn: Equilibrium is Pokémon's Haze, Demi Shock its Super Fang, Seal Evil its
    // Gastro Acid; content check warnings, the user, 2026-10-04)
    [72, 'equilibrium', 8000, ['warrior', 'whitemage', 'timemage', 'knight'], [], 'kp_glimmerfair_center'],
    [73, 'demi_shock', 8000, ['monk', 'timemage', 'blackmage', 'ranger'], [], 'kp_glimmerfair_center'],
    [74, 'seal_evil', 7000, ['ranger', 'whitemage', 'summoner', 'thief'], [], 'kp_candlerock_center'],
  ];
  for (const [n, move, price, types, also, mart] of CHIPS) {
    const id = 'chip_' + String(n).padStart(2, '0'), name = KP.MOVES[move].name;
    KP.ITEMS[id] = { name: `Skill Chip ${n}: ${name}`, kind: 'chip', move, price, types, also, desc: `Teaches ${name} to a compatible moogle. Reusable.` };
    KP.CHIP_PLACES.push({ chip: id, mart });
  }
})();
