// Kupomon breeding at the Kupo Ranch in Mogfield (docs/KUPOMON_WORLD.md "Breeding"), Dragon Warrior Monsters style:
// two moogles of Lv 10 or more retire to the ranch and leave a Kupo Egg. The child takes the first parent's job line
// (its first job) unless the pair's types are a special pairing (KP.BREED: breeding-only lines); it gets a "+"
// (+4% stats each, up to +5) and you pick its 4 moves from its parents' 8. It hatches at Lv 1.
//   yield* KP.breed(s)   (the rancher's talk)
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {}, R = FF7.render, MG = FF7.minigames, GL = FF7.GL;
  const W = FF7.W, H = FF7.H, PI = Math.PI;
  const S = () => FF7.sceneMgr, sfx = (id) => { try { FF7.audio.sfx(id); } catch (e) { } };
  const D = () => FF7.state.kp;
  const RANCHER = 'Rancher Mog';

  // the special pairings (either order): types -> the breeding-only species
  KP.BREED = [
    ['warrior', 'blackmage', 'spellmog_spellblade'],
    ['knight', 'redmage', 'mysticmog_mystic_knight'],
    ['dragoon', 'knight', 'drakemog_dragon_knight'],
    ['summoner', 'beast', 'shamog_beastcaller'],
    ['bard', 'timemage', 'maestromog_maestro'],
    ['machinist', 'thief', 'slingmog_gunslinger'],
    ['whitemage', 'warrior', 'templamog_templar'],
    // the starters' lines (the rivals keep theirs): a Freelancer, the blank-slate job, taught by a job's specialist
    ['freelancer', 'warrior', 'moglin_warrior'],
    ['freelancer', 'blackmage', 'kupwick_blackmage'],
    ['freelancer', 'whitemage', 'pomsprout_whitemage'],
  ];
  KP.MIN_BREED_LV = KP.LV ? KP.LV(10) : 17;   // (Lv 17 on the cap of 50)
  // a job line's first stage (walking back up the evolutions)
  // (a map of each kind's earlier stage, built once for the species there are: the Kupodex is long now)
  let PRE_N = -1, PRE_OF = {};
  const preOf = () => { const n = Object.keys(KP.SPECIES).length; if (n !== PRE_N) { PRE_N = n; PRE_OF = {}; for (const k of Object.keys(KP.SPECIES)) { const e = KP.SPECIES[k].evo; if (e && e.to) PRE_OF[e.to] = k; } } return PRE_OF; };
  KP.baseOf = function (sp) {
    const P = preOf(); let id = sp;
    for (let i = 0; i < 4 && P[id]; i++) id = P[id];
    return id;
  };
  // ------------------------------------------------------------------ the expansion's recipes (docs/KUPOMON_CONTENT.md
  // "Breeding recipes": KP.BREED_RECIPES from the content packs). A side is a species id (that kind), line:<species>
  // (any stage of that line) or a type (any moogle of it); the most exact pairing wins (species 4, line 2, type 1 a
  // side), the rarer first among equals; a recipe with a chance may not come off, and then the next one is tried
  const lineSet = (sp) => { const L = new Set(); let q = KP.baseOf(sp); for (let i = 0; q && i < 5; i++) { L.add(q); q = (KP.SPECIES[q].evo || {}).to; } return L; };
  const typesOf = (m) => { const s = KP.SPECIES[m.sp] || {}; return [s.type, s.type2].filter(Boolean); };
  const sideScore = (x, m) => !x ? 0 : x === m.sp ? 4 : x.startsWith('line:') ? (lineSet(x.slice(5)).has(m.sp) ? 2 : 0) : typesOf(m).includes(x) ? 1 : 0;
  const pairScore = (r, A, B) => { const ab = sideScore(r.a, A) && sideScore(r.b, B) ? sideScore(r.a, A) + sideScore(r.b, B) : 0, ba = sideScore(r.a, B) && sideScore(r.b, A) ? sideScore(r.a, B) + sideScore(r.b, A) : 0; return Math.max(ab, ba); };
  const needsMet = (r, A, B) => { const n = r.needs || {}; return (!n.plus || ((A.plus || 0) >= n.plus && (B.plus || 0) >= n.plus)) && (!n.lv || (A.lv >= n.lv && B.lv >= n.lv)) && (!n.item || A.held === n.item); };
  KP.BREED_TIER = { rare: 'Rare', super: 'Super Rare', ultra: 'Ultra Rare' };
  // every recipe that fits the pair, the most exact and rarest first: [{ r, score, ok (its needs met) }]
  KP.breedMatches = function (A, B) {
    return (KP.BREED_RECIPES || []).filter(r => KP.SPECIES[r.child]).map(r => ({ r, score: pairScore(r, A, B), ok: needsMet(r, A, B) }))
      .filter(x => x.score > 0).sort((x, y) => y.score - x.score || (x.r.chance == null ? 1 : x.r.chance) - (y.r.chance == null ? 1 : y.r.chance));
  };
  // a recipe's chance now: its own, raised by each egg that missed it (the ranch's luck: x2 after one miss, x3 after
  // two...), so even an ultra rare one comes in the end
  const rkey = (r) => r.child + '<' + r.a + '+' + r.b;
  KP.breedChance = (r) => { const base = r.chance == null ? 1 : r.chance, d = FF7.state && FF7.state.kp, n = d && d.breedMiss ? d.breedMiss[rkey(r)] || 0 : 0; return Math.min(1, base * (1 + n)); };
  // what the pair makes: o.roll (a function for the chances; the Demo's planning passes () => 0.999999 for the sure
  // outcome); o.real: the egg itself (a missed recipe counts towards its luck)
  KP.breedResult = function (a, b, o = {}) {
    const roll = o.roll || Math.random, d = FF7.state && FF7.state.kp;
    for (const x of KP.breedMatches(a, b)) {
      if (!x.ok) continue;
      if (roll() < KP.breedChance(x.r)) { if (o.real && d && d.breedMiss) delete d.breedMiss[rkey(x.r)]; return { sp: x.r.child, plus: KP.breedPlus(a, b), special: true, tier: x.r.tier || null, recipe: x.r }; }
      if (o.real && d) { d.breedMiss = d.breedMiss || {}; d.breedMiss[rkey(x.r)] = (d.breedMiss[rkey(x.r)] || 0) + 1; }
    }
    const ta = KP.typeOf(a), tb = KP.typeOf(b);
    const pair = KP.BREED.find(([x, y, sp]) => KP.SPECIES[sp] && ((x === ta && y === tb) || (x === tb && y === ta)));
    const sp = pair ? pair[2] : KP.baseOf(a.sp);
    return { sp, plus: KP.breedPlus(a, b), special: !!pair, tier: null };
  };
  // breeding in two stages (the user, 2026-10-04, "for balance sake"): before the Kupo League's Championship an egg
  // hatches plain (no "+"); from then on (the Rancher's new diet plan and Prof. Sith's new medicine: he tells of them on
  // the first talk after) the "+" as before: the parents' best and one more, two when both are Lv 25+ on the old cap
  KP.breedPlusOn = () => !!(FF7.state && FF7.state.flags && FF7.state.flags.kp_champion);
  KP.breedPlus = (a, b) => !KP.breedPlusOn() ? 0 : Math.min(5, Math.max(a.plus || 0, b.plus || 0) + 1 + (a.lv >= KP.LV(25) && b.lv >= KP.LV(25) ? 1 : 0));
  // what the rancher can tell before the egg: the sure outcome, and whether something rarer might come of it
  KP.breedPreview = function (a, b) {
    const ms = KP.breedMatches(a, b), sure = KP.breedResult(a, b, { roll: () => 0.999999 });
    const rare = ms.filter(x => x.r.chance != null && x.r.chance < 1 && x.score >= (ms.find(y => y.r.chance == null || y.r.chance >= 1) || { score: 0 }).score);
    return { sure, chance: rare.filter(x => x.ok), blocked: rare.filter(x => !x.ok) };
  };
  // the kinds only breeding makes (the Kupodex says so; the MogNet Swap and the wild never give them)
  KP.breedOnly = function () {
    const out = new Map();
    for (const [, , sp] of KP.BREED) if (KP.SPECIES[sp] && !KP.STARTERS.includes(sp)) out.set(sp, null);
    for (const r of KP.BREED_RECIPES || []) if (KP.SPECIES[r.child] && (KP.SPECIES[r.child].class === 'breed' || KP.SPECIES[r.child].rarity === 'none')) out.set(r.child, r.tier || out.get(r.child) || null);
    return out;
  };

  // a legendary or a mythical: it may breed, but it never retires to the ranch; it comes back to the team after (the
  // user, 2026-10-03: "Legends can continue breeding, but they do not go away after breeding is done")
  KP.isLegend = (m) => { const sp = KP.SPECIES[m && m.sp] || {}; return sp.class === 'legend' || sp.class === 'mythical' || (sp.rate || 120) <= 5; };
  KP.breed = function* (s) {
    const d = D();
    if (!s.flag('kp_ranch_met')) {
      s.set('kp_ranch_met');
      yield s.say(RANCHER, "Howdy, kupo! Welcome to the Kupo Ranch! Folks bring their moogles here when they're ready to settle down.");
      yield s.say(RANCHER, `Pick two moogles of Lv ${KP.MIN_BREED_LV} or more. They'll retire here and leave ye a Kupo Egg. The little one takes after the first one's job...\fBut some pairs of jobs make something new entirely! Try mixin' things up, kupo.`);
      yield s.say(RANCHER, KP.breedPlusOn() ? "The young'un's born at Lv 1, but stronger than its parents' kind (a \"+\"), and you choose its four moves from what its folks knew."
        : "The young'un's born at Lv 1, and you choose its four moves from what its folks knew.");
    }
    // stage two: the diet plan and the medicine (the "+" from now on), told once, the first talk after the Championship
    if (KP.breedPlusOn() && !s.flag('kp_breed_diet')) {
      s.set('kp_breed_diet');
      yield s.say(RANCHER, "Champion! Ye're just in time, kupo. I've news from the ranch.\fI've put the whole herd on a new diet plan: fresh Gysahl greens, mako-fed oats, a pinch o' Kupo Nut in every trough.");
      yield s.say(RANCHER, "And Prof. Sith sent over a new medicine from his lab. A tonic, for the parents. Smells awful. Works wonders.");
      s.sfx('levelup');
      yield s.say(RANCHER, "So: eggs from my well-fed parents hatch STRONGER now, kupo. A \"+\" on the wee one: one more than the better parent's, two more if both parents are strong ones, up to +5.\fBreed the strong with the strong, and ye'll see what I mean!");
    }
    // the starters' lines come from here too (KP.BREED): told once a trainer has a badge or two to their name
    if (!s.flag('kp_ranch_tip') && KP.badgeCount && KP.badgeCount() >= 2) {
      s.set('kp_ranch_tip');
      yield s.say(RANCHER, "Here's one fer ye, kupo. A Freelancer's a blank page, see? Pair one with a Warrior, a Black Mage or a White Mage, and the egg hatches one of the Professor's own starter kinds!He started 'em that way himself, years back. Don't tell him I told ye.");
    }
    const ok = () => d.party.filter(m => m.lv >= KP.MIN_BREED_LV);
    // Hard Mode: the parents stay with ye, but every egg takes a breeding permit (badge 1 gives 1, badge 7 gives 7...)
    const hard = KP.hard();
    if (hard && !s.flag('kp_ranch_hard')) { s.set('kp_ranch_hard'); yield s.say(RANCHER, "Hard times, eh? Here's how it goes, then: yer moogles go home with ye after, but every egg takes a breedin' permit.\fEach dojo badge earns ye some: the first badge one, the second two, and so on. Thirty-six with all eight, kupo."); }
    if (hard && KP.breedPermits() <= 0) { yield s.say(RANCHER, d.badges.length ? "Ye've no breedin' permits left, kupo. Win another badge and come back!" : "No badge, no permit, kupo. Come back once a dojo master's given ye one!"); return; }
    if (ok().length < 2) { yield s.say(RANCHER, `Come back with two moogles of Lv ${KP.MIN_BREED_LV} or more on yer team, kupo!`); return; }
    const c0 = yield s.ask(RANCHER, hard ? `Want to breed two moogles? (${KP.breedPermits()} permit${KP.breedPermits() === 1 ? '' : 's'} left)` : 'Want to leave two moogles with me?', ['Yes', 'No thanks']);
    if (c0 !== 0) { yield s.say(RANCHER, 'Any time, kupo!'); return; }
    const label = (m) => `${KP.name(m)} - ${KP.jobName(m)} Lv${m.lv}${m.plus ? ' +' + m.plus : ''}`;
    let L = ok();
    const ia = yield s.ask(RANCHER, 'Which one first? (The child takes after this one.)', L.map(label).concat(['Cancel']));
    if (ia >= L.length) return;
    const A = L[ia];
    L = ok().filter(m => m !== A);
    const ib = yield s.ask(RANCHER, `And ${KP.name(A)}'s partner?`, L.map(label).concat(['Cancel']));
    if (ib >= L.length) return;
    const B = L[ib];
    const pv = KP.breedPreview(A, B), sp0 = KP.SPECIES[pv.sure.sp], job0 = KP.JOBS[sp0.job].name;
    yield s.say(RANCHER, pv.sure.special ? `Ooh! A ${KP.jobName(A)} and a ${KP.jobName(B)}... That'll make something special: a ${job0}, kupo!` : `Those two would have a little ${sp0.moogle}, the ${job0}, kupo!`);
    // a rarer recipe this pair fits: a hint (and what it still needs)
    if (pv.chance.length) yield s.say(RANCHER, pv.chance[0].r.hint || "Mind you... I've a feeling there's something rarer in that pairing. Could be your lucky egg, kupo!");
    else if (pv.blocked.length) { const n = pv.blocked[0].r.needs || {}; yield s.say(RANCHER, `There's something rare in that pairing, I can feel it... but ${n.plus ? `they'd both need a +${n.plus} at least` : n.lv ? `they'd both need to be Lv ${n.lv} or more` : n.item ? `the first one would need to hold a ${KP.ITEMS[n.item] ? KP.ITEMS[n.item].name : 'special something'}` : 'not like this'}, kupo.`); }
    // a legend parent: its own item from its sidequest, used up, and 5,000 coins for each "+" the egg will have
    // (js/kupomon/kp_legendbreed.js; the user, 2026-10-03)
    const cost = KP.legendEggCost ? KP.legendEggCost(A, B) : { items: {}, fee: 0 }, need = Object.keys(cost.items);
    if (need.length) {
      const nm = (id) => KP.ITEMS[id].name, of = (id) => (KP.SPECIES[KP.ITEMS[id].legendBreed] || {}).moogle || '';
      const short = need.filter(id => (d.bag[id] || 0) < cost.items[id]);
      yield s.say(RANCHER, `A legend's egg, kupo! That takes ${need.map(id => `a ${nm(id)} for ${of(id)}`).join(' and ')}, and ${cost.fee.toLocaleString()} coins fer the trouble (${KP.LEGEND_FEE_PER_PLUS.toLocaleString()} a "+").`);
      if (short.length) { yield s.say(RANCHER, `Ye've no ${short.map(nm).join(' or ')}, kupo. Whoever was with ye at the end of ${short.map(of).join(' and ')}'s story might have one.`); return; }
      if (d.money < cost.fee) { yield s.say(RANCHER, `That's ${cost.fee.toLocaleString()} coins, and ye've ${d.money.toLocaleString()}. Come back when ye've the coins, kupo.`); return; }
    } else if (cost.fee) {   // (any other egg: a wee fee, 100 coins a "+")
      yield s.say(RANCHER, `That'll be ${cost.fee.toLocaleString()} coins fer the egg (${KP.BREED_FEE_PER_PLUS} a "+"), kupo.`);
      if (d.money < cost.fee) { yield s.say(RANCHER, `Ye've only ${d.money.toLocaleString()} coins. Come back when ye've the fee, kupo.`); return; }
    }
    const stays = [A, B].filter(KP.isLegend), goes = [A, B].filter(p => !KP.isLegend(p));
    // (the child needs a place: the team has room once its parents retire, or a Mog Box does; Hard Mode's parents and
    // a legend stay, so a full team and 50 full boxes leave it nowhere)
    if (KP.boxFull && KP.boxFull() && d.party.length - (hard ? 0 : goes.length) >= KP.PARTY_MAX) { yield s.say(RANCHER, "Yer team's full and so's every Mog Box, kupo. Make some room first, or the wee one'll have nowhere to go!"); return; }
    const retireText = !goes.length ? `${KP.name(A)} and ${KP.name(B)} are legends, kupo. They'll leave an egg and come right back to ye. All right?`
      : stays.length ? `${KP.name(goes[0])} will retire to the ranch for good. ${KP.name(stays[0])}'s a legend: it'll come back to ye after. All right?`
      : `${KP.name(A)} and ${KP.name(B)} will retire to the ranch for good. All right?`;
    const c1 = yield s.ask(RANCHER, hard ? `${KP.name(A)} and ${KP.name(B)} it is: that's one permit. All right?` : retireText, ['Yes', 'No']);
    if (c1 !== 0) { yield s.say(RANCHER, "No rush. Think it over, kupo."); return; }
    for (const id of need) KP.take(id, cost.items[id]);   // (a legend's item)
    if (cost.fee) { d.money -= cost.fee; s.sfx('purchase'); }   // (the fee)
    const res = KP.breedResult(A, B, { real: true }), sp = KP.SPECIES[res.sp], job = KP.JOBS[sp.job].name;
    if (res.recipe && res.recipe.needs && res.recipe.needs.item && A.held === res.recipe.needs.item) { A.held = null; }   // (the item the recipe asked for: used up)
    // the child, and its moves from the parents' eight
    // (Pokémon's rule: three of its IVs from its parents, each from one of them at random; the rest its own; its
    // appetite its own)
    const iv = {}, ks = KP.STATS ? KP.STATS.slice() : [];
    for (let n = 0; n < 3 && ks.length; n++) { const k = ks.splice(Math.floor(Math.random() * ks.length), 1)[0], from = Math.random() < 0.5 ? A : B; if (from.iv) iv[k] = from.iv[k]; }
    const child = KP.make(res.sp, 1, { plus: res.plus, iv, hidden: 0.2 });   // (a bred one: its kind's hidden ability 1 in 5)
    const pool = Array.from(new Set(A.moves.concat(B.moves))).filter(id => KP.MOVES[id]);
    const moves = yield KP.pickMoves(child, pool, `The child's moves (from ${KP.name(A)} and ${KP.name(B)})`);
    if (moves && moves.length) child.moves = moves.slice(0, 4);
    // the parents retire (their held items back to the bag); a legend comes back (KP.isLegend); in Hard Mode they both
    // stay, and a permit is used
    if (hard) d.bred = (d.bred || 0) + 1;
    else for (const p of goes) { if (p.held) KP.give(p.held); p.held = null; d.party.splice(d.party.indexOf(p), 1); (d.ranch = d.ranch || []).push({ sp: p.sp, lv: p.lv, plus: p.plus || 0 }); }
    yield s.say(RANCHER, 'Here ye go, kupo! A Kupo Egg, still warm. Oh! Look! It\'s hatching already!');
    yield KP.hatchScene(child);
    KP.receive(child);
    s.sfx('levelup');
    if (res.tier) { s.sfx('ching'); yield s.msg(`A ${KP.BREED_TIER[res.tier]} egg! Something extraordinary is hatching...`); }
    yield s.msg(`${sp.moogle} the ${job} hatched${res.plus ? ` (+${res.plus})` : ''}! It joined your team.`);
    if (res.plus >= 5 && !s.flag('kp_lq_fate_open')) s.set('kp_lq_fate_open');   // (a +5 egg: that night a star falls on the barn, Fatepom's quest)
    yield s.say(RANCHER, hard ? `Take good care of the wee one, kupo. ${KP.breedPermits()} permit${KP.breedPermits() === 1 ? '' : 's'} left.`
      : !goes.length ? `Take good care of the wee one. ${KP.name(A)} and ${KP.name(B)} are back with ye, kupo: legends don't settle down.`
      : stays.length ? `Take good care of the wee one. ${KP.name(stays[0])}'s back with ye, kupo, and ${KP.name(goes[0])}'ll be happy here.`
      : `Take good care of the wee one. And ${KP.name(A)} and ${KP.name(B)}? They'll be happy here, kupo.`);
  };

  // ------------------------------------------------------------------ the ranch's other two jobs (the user's design)
  // * Back to the wild: the Ranch Hand walks a moogle out to the Kupo Vale and lets it go; the Professor pays the
  //   ranch for every moogle it gives back to the wild herds, and the fee goes to the trainer (more for a higher level,
  //   a rarer kind and a "+"). Legendary moogles stay (the wild's no place for them now). The Kupodex keeps it.
  // * The MogNet Swap (Pokemon's Wonder Trade): a moogle goes down the MogNet and one comes back from a trainer
  //   somewhere: any kind but the legends, about the same level (evolved to fit), sometimes with a "+" or a held item.
  const label = (m) => `${KP.name(m)} - ${KP.jobName(m)} Lv${m.lv}${m.plus ? ' +' + m.plus : ''}`;
  const legend = (m) => (KP.SPECIES[m.sp].rate || 120) <= 5;
  KP.releaseCoins = function (m) {
    const r = KP.SPECIES[m.sp].rate || 120, rare = r >= 120 ? 1 : r >= 60 ? 1.5 : r >= 25 ? 2 : 3;
    return Math.round((60 + m.lv * 20) * rare * (1 + 0.25 * (m.plus || 0)) / 10) * 10;
  };
  const HAND = 'Ranch Hand';
  KP.ranchRelease = function* (s) {
    const d = D();
    if (!s.flag('kp_release_met')) {
      s.set('kp_release_met');
      yield s.say(HAND, "Some moogles would rather roam free. Bring me one and I'll walk it out to the Kupo Vale and let it go with the wild herd.");
      yield s.say(HAND, "The Professor pays the ranch for every moogle it gives back to the wild. Keeps the herds healthy, he says.\fYou get the fee. More for a strong one, a rare one, or one with a bit of breeding in it.");
    }
    if (d.party.length < 2) { yield s.say(HAND, "You'd have no moogles left at all! Bring a spare on your team first."); return; }
    const c0 = yield s.ask(HAND, 'Got a moogle that wants to go home to the wild?', ['Yes', 'No thanks']);
    if (c0 !== 0) { yield s.say(HAND, "Come by any time."); return; }
    const L = d.party.slice();
    const i = yield s.ask(HAND, 'Which one? (The fee is next to its name.)', L.map(m => label(m) + (legend(m) ? '' : ` (${KP.releaseCoins(m)})`)).concat(['Cancel']));
    if (i >= L.length) return;
    const m = L[i];
    if (legend(m)) { yield s.say(HAND, `${KP.name(m)}? That's a legend, that is. The wild's no place for it now... it chose you. Keep it close.`); return; }
    const coins = KP.releaseCoins(m);
    const c1 = yield s.ask(HAND, `Let ${KP.name(m)} go? It won't be coming back.`, ['Yes', 'No']);
    if (c1 !== 0) { yield s.say(HAND, "No shame in that. Some of 'em are family."); return; }
    if (m.held) { KP.give(m.held); yield s.msg(`(You took back the ${KP.ITEMS[m.held].name} it was holding.)`); m.held = null; }
    d.party.splice(d.party.indexOf(m), 1);
    (d.released = d.released || []).push({ sp: m.sp, lv: m.lv });
    yield s.say(HAND, `Off you go then, ${KP.name(m)}. The Kupo Vale's that way.`);
    s.sfx('jump');
    yield s.msg(`${KP.name(m)} looked back once... then trotted off towards the Kupo Vale.\fBye-bye, ${KP.name(m)}!`);
    d.money += coins; s.sfx('purchase');
    yield s.msg(`Received ${coins} coins from the ranch.`);
  };
  // the MogNet Swap: who sends one back, and what
  const SWAP_NAMES = ['Tomo', 'Rika', 'Ansel', 'Nell', 'Brann', 'Lio', 'Mags', 'Peri', 'Juno', 'Hart', 'Isa', 'Coby', 'Tess', 'Wren', 'Dov', 'Kit', 'Oda', 'Fenn'];
  const SWAP_FROM = ['Pomville', 'Mogridge', 'Kurotsuki', 'Fernwick', 'Cogsworth', 'Mogfield', 'Nibel Peaks', 'Sandsea', 'Skyport', 'Bloomhaven', 'Ravenmoor', 'Costa del Kupo'];
  const SWAP_HELD = ['leftover_nut', 'lucky_pom', 'quick_gear', 'focus_pom', 'cure_nut', 'mini_oil'];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  KP.swapMon = function (m) {
    const only = KP.breedOnly ? KP.breedOnly() : new Map();
    const kinds = (KP.DEX || Object.keys(KP.SPECIES)).filter(id => KP.SPECIES[id] && (KP.SPECIES[id].rate || 120) > 5 && !only.has(KP.baseOf(id)) && !only.has(id) && KP.SPECIES[id].class !== 'mythical');
    const lv = Math.max(1, Math.min(KP.MAX_LEVEL, m.lv + Math.floor(Math.random() * 5) - 2));
    const sp = KP.W && KP.W.lineAt ? KP.W.lineAt(KP.baseOf(pick(kinds)), lv) : pick(kinds);   // (grown into the job it would be by then)
    const plus = KP.breedPlusOn() && Math.random() < 0.3 ? 1 + Math.floor(Math.random() * 2) : 0;   // (a "+" only from breeding's stage two on)
    const mon = KP.make(sp, lv, { plus });
    if (Math.random() < 0.25) mon.held = pick(SWAP_HELD);
    mon.ot = `${pick(SWAP_NAMES)} of ${pick(SWAP_FROM)}`;
    return mon;
  };
  const MOGNET = 'MogNet Mog';
  KP.mognetSwap = function* (s) {
    const d = D();
    if (!s.flag('kp_swap_met')) {
      s.set('kp_swap_met');
      yield s.say(MOGNET, "Kupo! This is the MogNet Swap! Send one of your moogles down the MogNet, and a trainer somewhere out there sends one back, kupo!");
      yield s.say(MOGNET, "You never know what you'll get! Could be anything. Well... anything but a legend. Those don't fit down the tubes, kupo.");
    }
    if (!d.party.length) { yield s.say(MOGNET, 'Come back with a moogle to send, kupo!'); return; }
    const c0 = yield s.ask(MOGNET, 'Send a moogle down the MogNet?', ['Yes', 'No thanks']);
    if (c0 !== 0) { yield s.say(MOGNET, 'The tubes are always open, kupo!'); return; }
    const L = d.party.slice();
    const i = yield s.ask(MOGNET, 'Which one goes down the tubes?', L.map(label).concat(['Cancel']));
    if (i >= L.length) return;
    const m = L[i];
    if (legend(m)) { yield s.say(MOGNET, `${KP.name(m)}?! Kupo, no! A legend won't fit down the tubes! Try another one.`); return; }
    const c1 = yield s.ask(MOGNET, `Send ${KP.name(m)} away? You won't get it back, kupo.`, ['Yes', 'No']);
    if (c1 !== 0) return;
    if (m.held) { KP.give(m.held); yield s.msg(`(You took back the ${KP.ITEMS[m.held].name} it was holding.)`); m.held = null; }
    // (a chain: sending down the moogle that came back last time, "pass the parcel"; any other starts it again:
    // Hurdygurdy's quest counts it, kp_lq_twins_chain)
    const chain = m.uid && m.uid === d.swapLast ? (s.get('kp_lq_twins_chain') || 0) + 1 : 1;
    const got = KP.swapMon(m), at = d.party.indexOf(m);
    d.swapLast = got.uid; s.setVar('kp_lq_twins_chain', chain);
    if (KP.tradeInRoom) yield* KP.tradeInRoom(s, m, got);   // (out of Cloud, onto the pad, the trade, back into Cloud: js/kupomon/kp_trade.js)
    d.party.splice(at, 1, got); KP.dexCatch(got.sp);
    const sp = KP.SPECIES[got.sp];
    yield s.msg(`${got.ot} sent ${sp.moogle} the ${KP.jobName(got)} (Lv ${got.lv}${got.plus ? ' +' + got.plus : ''})${got.held ? `, holding a ${KP.ITEMS[got.held].name}` : ''}!`);
    yield s.say(MOGNET, `Take good care of it, kupo! Somewhere out there, ${got.ot.split(' of ')[0]} is saying hello to ${KP.name(m)}!`);
    if (chain >= 2) yield s.say(MOGNET, `That's ${chain} in a chain, kupo! Pass the parcel!`);
  };

  // ------------------------------------------------------------------ Coach Mog (after the Kupo League, the user's design):
  // a team moogle raised to the top level (KP.MAX_LEVEL), free (the user, 2026-10-02: a fee per level before). It changes
  // jobs on the way (the evolution scenes) and is offered the moves its kind learns by then (the move picker: the four
  // to keep). He arrives the first time the Champion comes to the ranch (KP.coachIntro, flag kp_coach_intro), then
  // stands by the barn wall
  KP.COACH_PER_LEVEL = 0;
  KP.coachPrice = () => 0;
  const COACH = 'Coach Mog';
  KP.coachIntro = function* (s) {
    if (!s.flag('kp_champion') || s.flag('kp_coach_intro')) return;
    s.set('kp_coach_intro');
    const C = 'kp_mfr_coach', hop = function* (n) { for (let i = 0; i < n; i++) { s.anim(C, 'jump'); s.sfx('jump'); yield 18; s.stopAnim(C); yield 6; } };
    yield 20;
    s.sfx('beep'); s.emote('player', '!');
    yield s.say('???', 'Hup! Hup! Hup! Kupo!');
    // in through the door behind the Champion, and over its head
    s.show(C, 8, 7, 'up');
    yield s.face('player', 'down');
    yield s.jump(C, 8, 4, 1.1, 26);
    yield s.face(C, 'player');
    yield s.face('player', C);
    s.anim(C, 'fistpump');
    yield s.say(COACH, "There you are! The new Champion of the Kupo League, kupo! I came the second I heard!");
    s.stopAnim(C);
    yield s.face('rancher', C);
    s.emote('rancher', '!');
    yield s.say(RANCHER, "Well, I'll be! Coach Mog! Ain't seen ye since the Coliseum was built, kupo!");
    yield s.say(COACH, "A Champion needs a team at its peak, Rancher. And peaks are my business!");
    // a little show of what training with him looks like
    yield* hop(2);
    s.anim(C, 'punch'); s.sfx('hit'); yield 16; s.stopAnim(C); yield 8;
    s.anim(C, 'kick'); s.sfx('hit'); yield 16; s.stopAnim(C);
    yield 10;
    yield s.say(COACH, "I'm Coach Mog! Bring me any moogle on your team, and I'll put it through the toughest training on the isles.\fIt comes out at Lv " + KP.MAX_LEVEL + ", the very top. New jobs, new moves, the works, kupo!");
    yield s.say(COACH, "And for the Champion? Not a single coin. Consider it my honour, kupo!");
    yield s.say(RANCHER, "He's the real deal, kupo. Trained half the moogles in this valley. Loudly.");
    s.anim(C, 'fistpump');
    yield s.say(COACH, "I'll set up right over here. Come and see me any time!");
    s.stopAnim(C);
    yield s.run(C, [[7, 4], [7, 3]]);
    yield s.face(C, 'down');
    yield s.face('rancher', 'down');
  };
  // (a moogle whose job change was stopped, kp_menu.js Evolve: he offers it again, at the top level or not; and before a
  // raise that would pass a job change he asks whether to let it, the user, 2026-10-04: the old job kept if not)
  KP.coach = function* (s) {
    const d = D();
    const L = d.party.filter(m => m.lv < KP.MAX_LEVEL || KP.evoDue(m));
    if (!L.length) { yield s.say(COACH, "Your whole team's at the top already, kupo! Come back when you've got a youngster to train."); return; }
    const i = yield s.ask(COACH, "Who's training today?", L.map(m => label(m) + (m.lv >= KP.MAX_LEVEL ? ' (job change)' : '')).concat(['Never mind']));
    if (i >= L.length) { yield s.say(COACH, 'Any time, kupo! Stay limber!'); return; }
    const m = L[i];
    if (m.lv >= KP.MAX_LEVEL) {   // (only the job change it held back from)
      const c = yield s.ask(COACH, `${KP.name(m)}'s been holding back a job change. Let it change now?`, ['Yes', 'Not yet']);
      if (c !== 0) { yield s.say(COACH, "Your call, Champion. Some like the classics, kupo!"); return; }
      for (let k = 0; k < 4 && KP.evoDue(m); k++) { const w = KP.evolveScene(m); while (!w.done) yield; if (!w.result) break; }
      KP.healMon(m);
      yield s.say(COACH, `Looking sharp, ${KP.name(m)}! Go get 'em, Champion!`);
      return;
    }
    const c = yield s.ask(COACH, `Raise ${KP.name(m)} from Lv ${m.lv} to Lv ${KP.MAX_LEVEL}? On the house, Champion!`, ['Deal!', 'No thanks']);
    if (c !== 0) { yield s.say(COACH, "Think it over! Muscles don't build themselves, kupo."); return; }
    // (a job change on the way: let it, or keep the job it has)
    let evolve = true;
    { let sp = m.sp, passes = false; for (let k = 0; k < 4; k++) { const e = (KP.SPECIES[sp] || {}).evo; if (!e || e.at > KP.MAX_LEVEL || !KP.SPECIES[e.to]) break; passes = true; sp = e.to; }
      if (passes) evolve = (yield s.ask(COACH, `On the way up ${KP.name(m)} would change jobs. Let it?`, ['Yes, let it change', `No, keep it a ${KP.jobName(m)}`])) === 0; }
    yield s.say(COACH, `Right! ${KP.name(m)}, with me! Hup, two, three, four!`);
    s.flash('#ffffff', 14, 0.8); s.sfx('levelup');
    const lv0 = m.lv; m.lv = KP.MAX_LEVEL; m.exp = KP.expAt(m, KP.MAX_LEVEL); KP.healMon(m);
    yield s.msg(`${KP.name(m)} trained hard and grew from Lv ${lv0} to Lv ${KP.MAX_LEVEL}!`);
    // the job changes it would have made on the way (each one can still be stopped in the scene)
    if (evolve) for (let k = 0; k < 4 && KP.evoDue(m); k++) { const w = KP.evolveScene(m); while (!w.done) yield; if (!w.result) break; }
    // what its kind learns by now: the four it keeps
    const more = KP.relearnable ? KP.relearnable(m) : [];
    if (more.length) {
      const before = m.moves.slice(), w = KP.pickMoves(m, before.concat(more), `${KP.name(m)} learned a lot: choose four`, before);
      while (!w.done) yield;
      if (w.result && w.result.length) m.moves = w.result;
    }
    KP.healMon(m);
    yield s.say(COACH, `${KP.name(m)} is at the top of its game! Go get 'em, Champion!`);
  };

  // ------------------------------------------------------------------ the hatching: a Kupo Egg wobbles, cracks, light,
  // and the moogle stands there blinking
  KP.hatchScene = function (mon) { const w = { done: false }; S().push(new Hatch(mon, w)); return w; };
  let EGG = null;
  const egg = () => EGG || (EGG = {
    shell: MG.mesh(mb => { mb.sphere(0, 0.3, 0, 0.24, 0.32, 0.24, '#f4ead4', 12, 10, true); for (let i = 0; i < 6; i++) { const a = i * 1.05, y = 0.18 + (i % 3) * 0.12; mb.sphere(Math.cos(a) * 0.22, y, Math.sin(a) * 0.22, 0.05, 0.05, 0.03, i % 2 ? '#e05a7a' : '#5a9ad0', 6, 4, true); } }),
    pom: MG.mesh(mb => { mb.box(0, 0.62, 0, 0.01, 0.08, 0.01, '#8a8e96'); mb.sphere(0, 0.7, 0, 0.04, 0.04, 0.04, '#ff4a6a', 8, 6, true); }),
  });
  class Hatch {
    constructor(mon, w) {
      this.mon = mon; this.w = w; this.t = 0; this.cam = new MG.Cam(); this.text = null;
      this.m = KP.moogleModel(mon.sp); this.m.scale = 1.1; if (this.m.anims && this.m.anims.idle) this.m.play(this.m.anims.idle);
      this.co = new FF7.Coroutine(this.flow());
    }
    *flow() {
      for (let i = 0; i < 4; i++) { sfx('cursor'); for (let k = 0; k < 20; k++) { this.wob = Math.sin(k / 20 * PI * 2) * (0.12 + i * 0.05); yield; } this.wob = 0; yield 14 - i * 3; }
      sfx('ching'); this.flash = 1;
      for (let k = 0; k < 24; k++) { this.flash = 1 - k / 24; this.hatched = k > 4; yield; }
      this.text = `${KP.SPECIES[this.mon.sp].moogle} hatched!`;
      let k = 0; while (this.text) { k++; if ((k > 20 && FF7.input.pressed('ok')) || k > 140) this.text = null; yield; }
      S().pop(); this.w.done = true;
    }
    update() { this.t++; this.co.update(); if (this.m) this.m.update(1); }
    render() {
      MG.sky('#2a3a5a', '#a8c0e0');
      this.cam.set([0, 0.9, 3.0], [0, 0.45, 0], 40, 0.1, 50);
      GL.begin({ clear: [0, 0, 0, 0], light: { dir: [-0.3, -0.8, -0.5], color: [0.95, 0.93, 0.9], ambient: [0.5, 0.5, 0.58] } });
      this.cam.apply();
      MG.shadow(0, 0, 0, 0.45, 0.35);
      if (!this.hatched) { const E = egg(); MG.put(E.shell, [0, 0, 0], [0, 0, this.wob || 0], 1); MG.put(E.pom, [0, 0, 0], [0, 0, this.wob || 0], 1); }
      else MG.drawModel(this.m, [0, 0, 0], this.t * 0.02, 0, 0, null);
      GL.end();
      if (this.flash > 0) R.fill('#ffffff', this.flash);
      R.window(0, H - 80, W, 80);
      R.para(this.text || 'Hm? The Kupo Egg is moving...', 22, H - 64, W - 44, { size: 17, lines: 2 });
    }
  }
  KP.Hatch = Hatch;
})();
