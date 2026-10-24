// Kupomon: breeding a legend (the user, 2026-10-03: "legend breeding cost both money and the breeder requires the
// player find a special breeding item in the world for the specific legendary/mythical. every legendary/mythical
// moogle has a special unique breeding item (consumable) that ties back to their completed sidequest"). Each of the
// fifteen has its own item, a Key Item used up by the egg: the first comes with its sidequest's reward
// (js/maps/kupomon/kp_lq_1.js ... kp_lq_5.js), more are sold afterwards by someone from that quest
// (KP.legendItemShop, KP.legendSeller). An egg with a legend parent takes that legend's item (two legends: both) and
// a fee of 5,000 coins for each "+" the egg will have (the user's choices: "Quest gives one, then buyable", "More for
// a higher +", "Yes, any legend parent"); the ranch: js/kupomon/kp_breed.js.
(function () {
  const KP = FF7.kupomon;
  KP.LEGEND_ITEM_PRICE = 15000;   // (each one bought after the first: about half a World Championship win)
  KP.LEGEND_FEE_PER_PLUS = 5000;
  KP.BREED_FEE_PER_PLUS = 100;   // (every other egg: a very tiny fee for each "+" it will have, the user, 2026-10-04)
  // [legend, item id, name, what it is] (each named for its quest: docs/KUPOMON_LEGENDS.md)
  const LIST = [
    ['jenomog_project_j', 'lb_lifestream_seed', 'Lifestream Seed', 'A bead of green light from the Wellspring under the tower.'],
    ['ultimog_ultima', 'lb_fifth_seal', 'Fifth Seal', 'A crystal shard cut in the shape of the seal stones.'],
    ['omegamog_omega', 'lb_tally_plate', 'Tally Plate', 'A plate of the Proving Ground, five marks cut in it.'],
    ['bahamog_bahamut', 'lb_dead_letter', 'Dead Letter', 'An old letter from the tower roof, sealed in red wax.'],
    ['kupoking_king', 'lb_royal_decree', 'Royal Decree', 'A scroll with the Kupo King\'s seal: "Let there be an egg."'],
    ['mogglemog_good_king', 'lb_court_lantern', 'Court Lantern', 'A paper lantern from the Pom Court, still warm.'],
    ['tempomog_time_hopper', 'lb_midnight_spring', 'Midnight Spring', 'A clock spring wound to midnight, eighty years ago.'],
    ['luxmog_light_warrior', 'lb_light_wick', 'Light Wick', 'A wick that caught the four lights. It glows by itself.'],
    ['montblanc_clan_leader', 'lb_clan_writ', 'Clan Writ', 'A Clan Kupo writ, signed by the clan leader.'],
    ['stiltzkin_globetrotter', 'lb_road_map', 'Road Map', 'A traveller\'s map with a road no one has walked yet.'],
    ['drmog_record_keeper', 'lb_record_key', 'Record Key', 'A brass key that opens one more page of the Record.'],
    ['fatepom_pom_of_destiny', 'lb_star_thread', 'Star Thread', 'A spool of red thread that shines like starlight.'],
    ['hurdygurdy_twin_minstrels', 'lb_duet_score', 'Duet Score', 'Sheet music written for two players at once.'],
    ['kupofried_dream_king', 'lb_dream_pillow', 'Dream Pillow', 'A pillow stuffed with the Dream King\'s clouds.'],
    ['chalimog_chalice_bearer', 'lb_chalice_drop', 'Chalice Drop', 'One drop from the Crystal Chalice, in a tiny vial.'],
  ];
  KP.LEGEND_BREED = {};
  for (const [sp, id, name, what] of LIST) {
    const moogle = (KP.SPECIES[sp] || {}).moogle || sp;
    KP.ITEMS[id] = { name, kind: 'key', price: 0, stack: true, legendBreed: sp,
      desc: `${what} The Kupo Ranch needs one to breed ${moogle}; the egg uses it up.` };
    KP.LEGEND_BREED[sp] = { item: id, seller: null };
  }
  KP.legendItem = (sp) => (KP.LEGEND_BREED[sp] || {}).item || null;
  // who sells a legend's item after its quest (a quest map calls it for its character): { map, npc }
  KP.legendSeller = (sp, map, npc) => { if (KP.LEGEND_BREED[sp]) KP.LEGEND_BREED[sp].seller = { map, npc }; };
  // what an egg of A and B costs: each legend parent's item, and the fee (a legend's egg 5,000 coins a "+", any other
  // 100 a "+"); KP.eggCost the same
  KP.legendEggCost = KP.eggCost = function (A, B) {
    const items = {};
    for (const m of [A, B]) if (KP.isLegend(m)) { const id = KP.legendItem(m.sp); if (id) items[id] = (items[id] || 0) + 1; }
    const fee = (Object.keys(items).length ? KP.LEGEND_FEE_PER_PLUS : KP.BREED_FEE_PER_PLUS) * Math.max(1, KP.breedPlus(A, B));   // (a plain egg: one "+"'s worth)
    return { items, fee };
  };
  // the quest's reward: the first one (and the flag that says it was had: the seller gives it free to a game that
  // finished the quest before the items existed)
  KP.giveLegendItem = function* (s, sp) {
    const id = KP.legendItem(sp); if (!id) return;
    KP.give(id, 1); s.set('kp_lbi_' + sp);
    s.sfx('ching');
    yield s.msg(`Received a ${KP.ITEMS[id].name}! (The Kupo Ranch needs one to breed ${(KP.SPECIES[sp] || {}).moogle || sp}.)`);
  };
  // the seller's talk, after the quest (o.who: the speaker's name; o.done: the quest's done flag). The first one free
  // if it never came (a quest finished before the items were added), then sold one to three at a time
  KP.legendItemShop = function* (s, sp, o = {}) {
    const id = KP.legendItem(sp), d = KP.data(), who = o.who || '';
    if (!id || (o.done && !s.flag(o.done))) return false;
    const name = KP.ITEMS[id].name, moogle = (KP.SPECIES[sp] || {}).moogle || sp, price = KP.LEGEND_ITEM_PRICE;
    if (!s.flag('kp_lbi_' + sp)) {
      yield s.say(who, `You'll want this, if you ever take ${moogle} to the Kupo Ranch.`);
      yield* KP.giveLegendItem(s, sp);
      return true;
    }
    const opts = ['One', 'Two', 'Three', 'No thanks'];
    const c = yield s.ask(who, `A ${name}? They don't come easy. ${price.toLocaleString()} coins each. How many? (You have ${d.money.toLocaleString()}.)`, opts);
    if (c >= 3) { yield s.say(who, 'Come back if you change your mind.'); return false; }
    const n = c + 1;
    if (d.money < price * n) { yield s.say(who, `That's ${(price * n).toLocaleString()} coins. You're short.`); return false; }
    d.money -= price * n; KP.give(id, n); s.sfx('purchase');
    yield s.msg(`Bought ${n} ${name}${n > 1 ? 's' : ''} for ${(price * n).toLocaleString()} coins.`);
    return true;
  };
})();
