// Kupomon, the legends' sidequests, part 2 (docs/KUPOMON_LEGENDS.md): 4. Bahamog, "Return to Sender" (Mognet Tower and
// five deliveries round the isles), 5. the Kupo King, "The Royal Parade" (the Battle Square and the Royal Box), and
// 15. Chalimog, "Reserved" (three trees, three champions, the Chalice Vault under the Battle Square).
// New maps: kp_lq_king_box (the Royal Box), kp_lq_chal_vault (the Chalice Vault). The existing maps are added to at load
// time, from here: kp_mognet_1 / 2 / 3, kp_town, kp_route4, kp_kurotsuki_dojo_2, kp_ravenmoor_clock, kp_costa_arena,
// kp_coliseum_hall, kp_bloomhaven, kp_whisperwood_deep, kp_crater_1 (and Big Mog's Bell, KP.useKeyItem, is wrapped once
// for the letter to the sky). Each quest registers itself for the Demo in KP.QUESTS. Dialogue in our own words.
// Each reward also gives the legend's first breeding item, and someone from the quest sells more afterwards
// (js/kupomon/kp_legendbreed.js): the Postmaster (Dead Letter), the Royal Herald (Royal Decree), the League Official
// (Chalice Drop).
//
// THE ANSWERS (for the Demo, as the dojos keep theirs):
//   Bahamog: the Royal Airmail is addressed to "Bahamog, The Roof" (the paper boat in the roof's rain barrel says so).
//     The fifth letter goes to Big Mog: ring Big Mog's Bell anywhere outdoors while the Dead Letters are in the bag.
//   Kupo King: the Royal Steward's three questions: Fist Badge -> Tifa; where Sephiroth first stopped you -> Kurotsuki's
//     gate (Route 3's torii); Hojo's tank -> Project J. All three right to pass.
//   Chalimog: the pedestals, left to right, take the cups in league order: Gold (x2), Platinum (x4), Diamond (x7),
//     Master (x10), World Championship (x12). Then the myrrh (three drops) on the plinth in the middle (x7, y8).
(function () {
  const KP = FF7.kupomon, W = KP.W;
  if (KP._lq2Loaded) return;   // (once: a second load would wrap the same NPCs twice)
  KP._lq2Loaded = true;
  const FL = () => FF7.state.flags, VR = () => FF7.state.vars;
  const bag = () => (KP.data() && KP.data().bag) || {};
  const hasKey = (id) => (bag()[id] || 0) > 0;
  const owned = () => { const d = KP.data(); return d ? (d.party || []).concat(d.box || []) : []; };
  const owns = (sp) => owned().some(m => m && m.sp === sp);
  const sfx = (id) => { try { FF7.audio.sfx(id); } catch (e) { } };
  const M = (id) => FF7.maps[id];
  const npcOf = (map, id) => (M(map) && (M(map).npcs || []).find(n => n && n.id === id)) || null;
  // props for every tile of the given characters (as the region files do)
  const deco = (grid, spec) => {
    const out = [];
    grid.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const f = spec[row[x]]; if (f) out.push(Object.assign({ at: [x, y] }, f(x, y))); } });
    return out;
  };
  // where the player stands (a script's mock has no tiles: a fallback)
  const here = (s, fx = 0, fy = 0) => { const p = s.field && s.field.player; return p && p.tx != null ? [p.tx, p.ty] : [fx, fy]; };
  // the first free floor tile at one of the offsets from (x, y)
  const spotNear = (s, x, y, offs) => {
    const P = s.field && s.field.P, bl = (s.field && s.field.blocked) || {};
    for (const [dx, dy] of offs) { const nx = x + dx, ny = y + dy; if (!P || (P.walkable(nx, ny) && !bl[nx + ',' + ny])) return [nx, ny]; }
    return [x + offs[0][0], y + offs[0][1]];
  };
  // an existing NPC's talk, wrapped: pre(s) runs first and returns true when it has handled the talk
  const wrapTalk = (map, id, pre) => {
    const n = npcOf(map, id); if (!n) { console.warn('kp_lq_2: no npc ' + id + ' on ' + map); return null; }
    const t0 = n.talk;
    n.talk = function* (s) { if (yield* pre(s)) return; if (t0) yield* t0(s); };
    return n;
  };
  // before adding to another file's map: the tile is still free of exits, NPCs, triggers and items (other quest files
  // write to the same maps)
  const freeTile = (map, x, y, what) => {
    const m = M(map); if (!m) { console.warn('kp_lq_2: no map ' + map); return false; }
    const inR = (at) => at && x >= at[0] && x < at[0] + (at[2] || 1) && y >= at[1] && y < at[1] + (at[3] || 1);
    const taken = (m.exits || []).some(e => inR(e.at)) || (m.npcs || []).some(n => n && n.at && n.at[0] === x && n.at[1] === y) ||
      (m.items || []).some(i => i.at && i.at[0] === x && i.at[1] === y) || (m.triggers || []).some(t => t && t.on === 'talk' && inR(t.at)) ||
      (m.objects || []).some(o => o && o.at && o.at[0] === x && o.at[1] === y);
    if (taken) console.warn(`kp_lq_2: ${map} ${x},${y} (${what}) is already taken`);
    return !taken;
  };
  const add = (map, key, entry) => { const m = M(map); if (m) (m[key] = m[key] || []).push(entry); };
  // a legend's encounter, W.legend's way on the cap of 50 with its signature ability: befriended, gone for good (the
  // legend flag and the quest's done flag); beaten, it flees and is back the next time its map loads
  const legendFight = function* (s, o) {
    if (!KP.SPECIES[o.sp]) { yield s.msg('...It blinks, and is gone. (Its Kupodex pack is not loaded.)'); return null; }
    if (o.opening) yield s.msg(o.opening);
    s.sfx('found');
    const mon = KP.make(o.sp, o.lv || KP.MAX_LEVEL, { abil: 0 });
    mon.bond = 4;   // (met at the end of its quest: nuts taste 4x as good to it, as W.legend's)
    const r = yield* KP.fight(s, { kind: 'wild', foes: [mon], bg: o.bg, music: 'weaponraid' });
    if (r === 'caught') { s.set(o.flag); s.set(o.done); s.remove(o.id); if (o.then) yield* o.then(s); }
    else if (r === 'win') { s.remove(o.id); yield s.msg(o.after); }
    return r;
  };
  // a quest trainer's battle: the team written on the old scale (Lv 30 = 50: W.team), held items as the leagues hold
  // them, the smart AI, no bag
  const duel = function* (s, o) {
    const team = o.team.map(([sp, lv, x]) => [sp, lv, Object.assign({}, o.plus ? { plus: o.plus } : {}, x || {})]);
    return yield* KP.fight(s, { kind: 'trainer', foes: W.team(KP.leagueHeld ? KP.leagueHeld(team) : team), noBag: true, ai: 'smart', bg: o.bg || 'arena', music: o.music, gauntlet: o.gauntlet,
      trainer: { name: o.name, lose: o.lose, money: o.money || 3000, model: o.model } });
  };
  // the Demo's helpers (plan steps: docs/KUPOMON_LEGENDS.md "The Demo")
  const win = (flag, train, ...steps) => ['kp_win', steps, flag, train && typeof train === 'object' ? train : { train }];
  const lv30 = (sps, o) => sps.map(sp => [sp, 30, o]);   // (Lv 50 on the cap: W.team's KP.LV)

  // ======================================================================== 4. Bahamog: Return to Sender
  // Opens with the Gold League won and the Postmaster's gift (kp_mg_gift). Five dead letters to deliver (any order), the
  // couriers Pip and Dot at the stair, the Royal Airmail's address, then the rain barrel on the roof.
  const ADDR = { 1: 'The moogle with the nice hat, Pomville', 2: 'Grandpa, top of the light', 3: 'Yuffie (the ninja one)',
    4: 'Whoever keeps the clock at midnight', 5: 'Big Mog, c/o the sky' };
  const lettersDone = () => [1, 2, 3, 4, 5].filter(n => FL()['kp_lq_baha_l' + n]);
  KP.ITEMS.lq_dead_letters = { name: 'Dead Letters', kind: 'key', price: 0,
    get desc() { return `Letters nobody could deliver, from under Bahamog. ${5 - lettersDone().length} of 5 left to deliver.`; } };
  KP.ITEMS.lq_airmail = { name: 'Royal Airmail', kind: 'key', price: 0,
    desc: "One last letter with a gold Royal Airmail stamp, for 'Bahamog, The Roof'. Post it from the rain barrel up top." };
  const bahaGone = () => !!(FL().kp_lq_baha_done || FL().kp_legend_mg_bahamog);
  const letterDue = (n) => !!FL().kp_lq_baha_open && !FL()['kp_lq_baha_l' + n] && hasKey('lq_dead_letters');
  const bahaAwake = () => !!FL().kp_lq_baha_airmail && !hasKey('lq_airmail') && !bahaGone();
  const deliver = function* (s, n) {   // a letter handed over: ticked, counted, the bundle one lighter
    s.set('kp_lq_baha_l' + n); KP.take('lq_dead_letters', 1); s.sfx('set');
    const k = lettersDone().length; s.setVar('kp_lq_baha_letters', k);
    yield s.msg(k < 5 ? `Letter delivered! (${k} of 5)` : 'Letter delivered! That was the last dead letter. The Postmaster at Mognet Tower will want to hear.');
  };
  const PM = 'Postmaster Mog';
  const postmaster0 = (npcOf('kp_mognet_1', 'mg_postmaster') || {}).talk;
  // A. the pile (1F): the Postmaster points up at the roof
  const pileScene = function* (s) {
    yield s.say(PM, "Ah, the champion again! Say, could you help an old postmaster with a tiny problem? A dragon-sized problem.");
    s.emote('mg_postmaster', '!');
    yield s.jump('mg_postmaster', 12, 10, 0.3, 16);
    yield s.say(PM, "Every letter nobody can deliver ends up in one place, kupo. Up there. It sits on them.");
    yield s.cam(12, 7, 50, { height: 3.0, pitch: 14, dist: 7 });
    s.shake(2, 50); s.sfx('falling');
    yield s.msg('Far above, something snores. Dust sifts down from the rafters.');
    yield s.camFollow(30);
    yield s.say(PM, "Bahamog. Asleep on a hundred years of dead letters. Won't wake till the pile's gone. Very tidy, for a dragon.\fDeliver them, and it'll have nothing left to sit on. Then we'll see, kupo.");
    KP.give('lq_dead_letters', 5); s.sfx('found');
    yield s.msg(KP.got('lq_dead_letters', 5));
    yield s.say(PM, "Five addresses, all very... creative. Read them in your Bag. And when you get to the sky one: just ring that bell of yours outdoors.");
    s.set('kp_lq_baha_open');
  };
  const RIDDLE = ['The Postmaster, Desk 1', 'Bahamog, The Roof', 'Prof. Sith, Pomville'];
  const postmasterQ = function* (s) {
    if (!s.flag('kp_league_1')) return false;
    if (bahaGone()) {
      if (!s.flag('kp_lq_baha_done')) return false;
      yield s.say(PM, "Bahamog answers ALL our mail now. Fan letters, bills, a recipe for pudding... It replies to everything. In claw-writing. Big claw-writing.");
      // (then the old dead letters it slept on, for the Kupo Ranch: js/kupomon/kp_legendbreed.js)
      yield s.say(PM, "The old dead letters it slept on, though? Still sealed in red wax. The Kupo Ranch swears by them, kupo. Don't ask me why.");
      yield* KP.legendItemShop(s, 'bahamog_bahamut', { who: PM, done: 'kp_lq_baha_done' });
      return true;
    }
    if (!s.flag('kp_lq_baha_open')) {
      if (!s.flag('kp_mg_gift') && postmaster0) yield* postmaster0(s);   // (the Gold League gift first, as before)
      yield* pileScene(s);
      return true;
    }
    if (lettersDone().length < 5) {
      const left = [1, 2, 3, 4, 5].filter(n => !s.flag('kp_lq_baha_l' + n)).map(n => '"' + ADDR[n] + '"');
      yield s.say(PM, `Still to go: ${left.join(', ')}. Every letter deserves a doorstep, kupo!`);
      return true;
    }
    if (!s.flag('kp_lq_baha_couriers')) {
      yield s.say(PM, "All five delivered? Kupo! ...Oh dear. Pip and Dot heard. They're at the stairs, fuming. Couriers get very touchy about their routes.");
      return true;
    }
    if (!s.flag('kp_lq_baha_airmail')) {
      yield s.say(PM, "The pile's gone. One letter left to post, and it gets the Royal Airmail stamp. Very fancy. Very gold.");
      for (let t = 0; t < 3; t++) {
        const c = yield s.ask(PM, "Now. Addressed to...?", RIDDLE);
        if (c === 1) break;
        s.sfx('error');
        yield s.say(PM, t < 2 ? "Kupo? No, no. Think about who needs waking. Somebody on the roof already wrote it on a little boat." : "Have a look on the roof, kupo, then come back. I'll keep the stamp warm.");
        if (t === 2) return true;
      }
      s.set('kp_lq_baha_airmail'); KP.give('lq_airmail', 1); s.sfx('found');
      yield s.msg(KP.got('lq_airmail'));
      yield s.say(PM, "Bahamog, The Roof! We can't climb that antenna, mind. But the rain barrel up there catches every updraft. Pop it in, kupo.");
      return true;
    }
    if (hasKey('lq_airmail')) { yield s.say(PM, "The rain barrel on the roof, champion! Gently, now. It's Royal Airmail."); return true; }
    yield s.say(PM, "It's AWAKE! I can hear it from here. The whole tower can. Every pigeonhole is rattling, kupo!");
    return true;
  };
  {
    const n = wrapTalk('kp_mognet_1', 'mg_postmaster', postmasterQ), m = M('kp_mognet_1');
    if (n && m) (m.triggers || []).forEach(t => { if (t.run === postmaster0) t.run = n.talk; });   // (the counter in front of him too)
    if (n) KP.legendSeller('bahamog_bahamut', 'kp_mognet_1', 'mg_postmaster');
  }
  // the couriers Pip and Dot: down from the Dead Letter Office, by the stair once every letter is delivered
  const PIP = 'Courier Pip', DOT = 'Courier Dot';
  const PIP_M = { base: 'kid3', top: '#c84040', bottom: '#2a2a3a', hairStyle: 'cap', extras: ['harness'] };
  const DOT_M = { base: 'girl3', top: '#c84040', bottom: '#2a2a3a', hairStyle: 'cap', extras: ['harness'] };
  const couriersOut = () => lettersDone().length >= 5;
  const courierScene = function* (s) {
    if (s.flag('kp_lq_baha_done')) { yield s.say(PIP, 'Champion on deck!'); yield s.say(DOT, "*salutes* ...Pip, you're saluting with the wrong hand."); return; }
    if (s.flag('kp_lq_baha_couriers')) { yield s.say(DOT, "Fine, you're a courier too. An honorary one. Don't let it go to your head."); return; }
    s.emote('lq_baha_pip', '!'); s.emote('lq_baha_dot', '!'); s.sfx('found');
    yield 20;
    yield s.face('player', 'lq_baha_pip');
    yield s.say(PIP, "Five deliveries in OUR isles, and not one of them by us? Nobody delivers on OUR route!");
    yield s.say(DOT, "One after the other. Like a proper relay. Pip first!");
    if (!s.flag('kp_lq_baha_pip')) {
      const r = yield* duel(s, { name: PIP, model: PIP_M, bg: 'town', money: 2500, lose: 'Return to sender... again...',
        team: lv30(['mogpost_cannoneer', 'kitemog_skydiver', 'stampo_blackbelt', 'chatmog_orator']) });
      if (r !== 'win') return;
      s.set('kp_lq_baha_pip');
      yield s.say(PIP, "Ugh! Dot! Take over!");
    }
    yield s.face('player', 'lq_baha_dot');
    yield s.say(DOT, "My turn. Signed, sealed, and about to be delivered. To defeat!");
    const r2 = yield* duel(s, { name: DOT, model: DOT_M, bg: 'town', money: 2500, lose: 'Delivered. To me. Ugh.',
      team: lv30(['mopluff_dancer', 'juggler_jester', 'pipkin_onion_knight', 'tufty_mime', 'mogpost_cannoneer']) });
    if (r2 !== 'win') return;
    s.set('kp_lq_baha_dot'); s.set('kp_lq_baha_couriers');
    yield s.say(DOT, "...Okay. That was a good route. The Postmaster's got one more letter for you. A royal one.");
    yield s.say(PIP, "The stair's yours. We'll be over here. Sulking. Professionally.");
  };
  if (freeTile('kp_mognet_1', 21, 3, 'Pip') && freeTile('kp_mognet_1', 24, 3, 'Dot')) {
    add('kp_mognet_1', 'npcs', { id: 'lq_baha_pip', name: PIP, model: PIP_M, at: [21, 3], dir: 'right', show: couriersOut, talk: courierScene });
    add('kp_mognet_1', 'npcs', { id: 'lq_baha_dot', name: DOT, model: DOT_M, at: [24, 3], dir: 'left', show: couriersOut, talk: courierScene });
    // they block the stair: walking up it brings them in
    add('kp_mognet_1', 'triggers', { at: [22, 2, 2, 2], if: s => couriersOut() && !s.flag('kp_lq_baha_couriers'), run: courierScene });
  }
  // (the same two couriers upstairs, once beaten there, are down here now)
  [['mg_pip', 'kp_tr_mg_pip'], ['mg_dot', 'kp_tr_mg_dot']].forEach(([id, f]) => { const n = npcOf('kp_mognet_2', id); if (n) { const sh0 = n.show; n.show = s => !(couriersOut() && s.flag(f)) && (!sh0 || sh0(s)); } });
  // the Dead Letter Office, after: fresh letters to read
  if (freeTile('kp_mognet_2', 2, 2, 'fresh letters')) add('kp_mognet_2', 'triggers', { at: [2, 2], on: 'talk', if: s => s.flag('kp_lq_baha_done'), run: function* (s) {
    yield s.msg('A sack of fresh letters, all opened and answered. One reads: "Dear Bahamog, please stop replying to my bills. - A Customer"\fThe reply, in very large claw-writing: "NO."');
  } });

  // ---- the deliveries
  // 1. Pomville: a Tufty in a little beret by the duck pond
  const TUFTY_M = { enemy: 'kp_tufty_mime', scale: 0.8 };
  if (freeTile('kp_town', 7, 12, 'the hat Tufty')) add('kp_town', 'npcs', { id: 'lq_baha_tufty', name: 'Tufty', model: TUFTY_M, at: [7, 12], dir: 'left', talk: function* (s) {
    if (letterDue(1)) {
      yield s.msg(`"The moogle with the nice hat, Pomville." ...That beret IS very nice.`);
      s.emote('lq_baha_tufty', '!');
      yield s.say('Tufty', 'Kupo?!');
      yield s.msg('Tufty reads the letter upside down. Then the right way up. Then upside down again, just in case.');
      for (const d of ['up', 'right', 'down', 'left', 'up', 'right', 'down']) yield s.face('lq_baha_tufty', d);
      s.emote('lq_baha_tufty', '♪', 60);
      yield s.say('Tufty', 'Kupo kupo KUPO!');
      yield* deliver(s, 1);
      return;
    }
    if (s.flag('kp_lq_baha_l1')) yield s.msg("Tufty has the letter tucked into its beret. It has never been prouder of a hat.");
    else yield s.msg('A Tufty in a little beret, watching the ducks. It tips the beret at you. Very stylish, kupo.');
  } });
  // 2. Route 4: the old keeper, out on the point by his lighthouse
  const GALE = 'Grandpa Gale', GALE_M = { base: 'oldman', top: '#6a5a3a', bottom: '#3a3a40', hair: '#e8e8e8', extras: ['beard', 'coat'] };
  if (freeTile('kp_route4', 31, 13, 'Grandpa Gale')) {
    add('kp_route4', 'npcs', { id: 'lq_baha_grandpa', name: GALE, model: GALE_M, at: [31, 13], dir: 'right', show: s => !s.flag('kp_lq_baha_l2'), talk: function* (s) {
      if (!letterDue(2)) { yield s.say(GALE, "Forty years I kept that light, before young Morrow took it on. I still come out to the point to watch the boats go by."); return; }
      yield s.say(GALE, "Eh? A letter? For me? Nobody's written to me since I handed over the lamp.");
      yield s.msg('"Grandpa, top of the light." He opens it. His hands start to shake.');
      yield s.say(GALE, "It's from my grandson. He's a sailor now. He says he steers by our light every night...\fHe says he waves at it.");
      s.anim('lq_baha_grandpa', 'sit');
      yield s.msg('Grandpa Gale has to sit down.');
      yield s.say(GALE, "...I'll wave back. Every night. Thank you, youngster.");
      yield* deliver(s, 2);
    } });
    add('kp_route4', 'npcs', { id: 'lq_baha_grandpa2', name: GALE, model: GALE_M, at: [31, 13], dir: 'right', anim: 'sit', show: s => s.flag('kp_lq_baha_l2'),
      talk: function* (s) { yield s.say(GALE, "Every evening I wave at the sea. Somewhere out there, somebody waves back. ...Don't tell Morrow I cried."); } });
  }
  // 3. Yuffie, in her chamber at the top of the Shuriken Arcade
  wrapTalk('kp_kurotsuki_dojo_2', 'kp_yuffie', function* (s) {
    if (!letterDue(3)) return false;
    yield s.say('Yuffie', "Huh? Mail? For ME? ...Is it a bill? It's a bill, isn't it.");
    yield s.msg('"Yuffie (the ninja one)." She tears it open with a shuriken.');
    yield s.say('Yuffie', '"Dear Great Ninja Yuffie. Your Shuriken Arcade is the coolest dojo in the isles. The trapdoors are genius."');
    s.emote('kp_yuffie', '!!'); s.anim('kp_yuffie', 'fistpump');
    yield s.say('Yuffie', "FINALLY. Someone gets it!\fI'm framing this. I'm framing it RIGHT NOW. ...Where do ninjas keep frames?");
    s.stopAnim('kp_yuffie');
    yield* deliver(s, 3);
    return true;
  });
  // 4. the Clockmaker, in Ravenmoor's clock tower (stuck at midnight these eighty years)
  wrapTalk('kp_ravenmoor_clock', 'rvt_clockmaker', function* (s) {
    if (!letterDue(4)) return false;
    yield s.msg('"Whoever keeps the clock at midnight." That has to be him.');
    yield s.say('Clockmaker', "A letter? For me? Give it here, then...\f...\f\"Please fix the clock.\"");
    yield s.say('Clockmaker', "Eighty years of letters, and they all say 'please fix the clock'. This one has a drawing. The clock is crying.\fI'm TRYING. Tell whoever sent it: the clock will move when it's good and ready.");
    yield* deliver(s, 4);
    return true;
  });
  // 5. Big Mog, c/o the sky: the Bell, rung outdoors, brings him down (B)
  const bigMogLetter = function* (s) {
    const [x, y] = here(s);
    s.sfx('ching2'); yield 12; s.sfx('ching');
    yield s.msg(`${s.name('cloud')} rang Big Mog's Bell!`);
    s.spawn('lq_bigmog', 'moogle', x + 1, y, 'left', { name: 'Big Mog', scale: 2.4, solid: false, hover: 9 });
    s.sfx('chocobo_tune');
    yield s.hover('lq_bigmog', 0.2, 80);
    yield s.face('player', 'right');
    yield s.msg(`Before Big Mog can scoop him up, ${s.name('cloud')} holds out a letter: "Big Mog, c/o the sky".`);
    s.emote('lq_bigmog', '?');
    yield 30;
    yield s.msg('Big Mog takes it in one enormous paw and reads it. Then reads it again. His eyes go very, very wide.');
    s.emote('lq_bigmog', '♪', 70);
    yield s.say('Big Mog', 'Kuuuuupo...!');
    yield s.msg("It's from Prof. Sith, years old. It just says THANK YOU, in very big letters.\fBig Mog hugs it.");
    yield* deliver(s, 5);
    yield s.msg("Just this once, Big Mog floats off without giving anyone a lift. He has some reading to do.");
    yield s.hover('lq_bigmog', 10, 70);
    s.remove('lq_bigmog');
  };
  // the bag's key items: the bell (the letter for the sky comes first, once), the letters, the invitation, the card
  const useKey0 = KP.useKeyItem;
  KP.useKeyItem = function (menu, id) {
    const fs = FF7.fieldScene, mapId = fs && fs.map && fs.map.id, R = FF7.runner;
    if (id === 'big_bell' && letterDue(5) && fs && KP.flyFromOK && KP.flyFromOK(mapId) && !(R && R.kpFlyTarget)) {   // (the Demo's own flights skip it)
      sfx('confirm'); FF7.sceneMgr.pop(); fs.runScript(bigMogLetter, { name: 'kp-lq-baha-sky' }); return;
    }
    if (id === 'lq_dead_letters') { sfx('confirm'); menu.msg = { text: 'To: ' + [1, 2, 3, 4, 5].filter(n => !FL()['kp_lq_baha_l' + n]).map(n => ADDR[n]).join(' / ') }; return; }
    if (id === 'lq_royal_invite') { sfx('confirm'); menu.msg = { text: 'Wanted: ' + PERFORMERS.map(([sp, lab], i) => lab + (FL()['kp_lq_king_a' + (i + 1)] ? ' (shown)' : '')).join(', ') }; return; }
    if (id === 'lq_reserved_card') { sfx('confirm'); menu.msg = { text: 'It says "Reserved". It hums near the trees where champions rested.' }; return; }
    return useKey0 ? useKey0.apply(this, arguments) : undefined;
  };

  // ---- the roof: Bahamog asleep round the antenna; the rain barrel (C)
  const bahaFight = (s) => legendFight(s, { id: 'mg_bahamog', sp: 'bahamog_bahamut', bg: 'sky', flag: 'kp_legend_mg_bahamog', done: 'kp_lq_baha_done',
    opening: 'Bahamog roars, and every letter in the tower rattles in its pigeonhole.',
    after: "Bahamog coils back round the antenna, grumbling. It'll be awake when you come back up.",
    then: function* (s) {
      yield s.msg("A letter flutters down off the antenna, addressed to you in very large claw-writing.\fInside: a Mognet Policy and 3 Royal Kupo Nuts. And one word: KUPO.");
      KP.give('mognet_policy', 1); KP.give('royal_nut', 3); s.sfx('found');
      yield s.msg(KP.got('mognet_policy') + '\f' + KP.got('royal_nut', 3));
      yield* KP.giveLegendItem(s, 'bahamog_bahamut');   // (the first Dead Letter: js/kupomon/kp_legendbreed.js)
    } });
  {
    const b = npcOf('kp_mognet_3', 'mg_bahamog');
    if (b) b.talk = function* (s) {
      if (bahaAwake()) { yield s.msg('Bahamog is wide awake, and it has been waiting for you.'); yield* bahaFight(s); return; }
      yield s.msg('Wrapped round the foot of the great antenna, Bahamog is fast asleep.\fBahamog snores. Every snore ruffles a hundred letters.');
      if (!s.flag('kp_lq_baha_open')) yield s.msg("It would take more than a poke to wake it. The Postmaster downstairs might know what would.");
      else if (hasKey('lq_airmail')) yield s.msg('The Royal Airmail rustles in your bag. The rain barrel by the railing catches every updraft...');
      else yield s.msg('Under its tail: a drift of letters nobody could deliver. Fewer than there were, maybe.');
    };
  }
  const barrelScene = function* (s) {
    if (!hasKey('lq_airmail')) {   // (awake already: posted earlier)
      if (!s.actor('mg_bahamog')) { yield s.msg('The rain barrel. The paper boat is long gone. Bahamog will be back on its antenna soon.'); return; }
      yield s.msg("The barrel's empty. Up on the antenna, Bahamog is wide awake, and looking right at you.");
      yield* bahaFight(s); return;
    }
    const [px, py] = here(s, 6, 4);
    yield s.msg(`${s.name('cloud')} folds the Royal Airmail into a paper boat and sets it on the water, beside the other one.`);
    KP.take('lq_airmail', 1);
    s.spawn('lq_boat', { prop: 'tent', col: '#f4f0e4', scale: 0.32 }, 5, 4, 'down', { solid: false, hover: 0.95 });
    yield 30;
    s.sfx('run');
    yield s.msg('A gust comes over the railing...');
    for (const d of ['right', 'down', 'left', 'up']) yield s.face('lq_boat', d);   // (it sails round once)
    yield [s.hover('lq_boat', 7.0, 120), s.move('lq_boat', 10, 6), s.cam(10, 6, 120, { height: 6.4, pitch: 18, dist: 7.5 })];
    s.remove('lq_boat');
    s.emote('mg_bahamog', '!'); s.sfx('found');
    yield s.msg('At the top of the antenna, an eye opens.');
    yield s.hover('mg_bahamog', 2.6, 50);
    s.flash('#a0d0ff', 18); s.sfx('summon');
    yield s.msg('Bahamog unwinds from the antenna and spreads its wings.');
    const L = spotNear(s, px, py, [[2, 0], [0, 2], [-2, 0], [0, -2], [1, 1], [-1, 1]]);
    yield [s.move('mg_bahamog', L[0], L[1]), s.cam(L[0], L[1], 50)];
    yield s.hover('mg_bahamog', 0, 14);
    s.shake(6, 30); s.sfx('hit');
    yield s.face('mg_bahamog', 'player'); yield s.face('player', 'mg_bahamog');
    yield s.camFollow(30);
    yield s.msg('Bahamog reads its letter, very slowly, twice. Then it decides to reply in person.');
    yield* bahaFight(s);
  };
  {
    const m = M('kp_mognet_3');
    if (m) (m.triggers = m.triggers || []).unshift({ at: [5, 4], on: 'talk', if: s => (hasKey('lq_airmail') || bahaAwake()) && !bahaGone(), run: barrelScene });   // (before the barrel's own line)
  }

  // ======================================================================== 5. Kupo King: The Royal Parade
  // Opens with the World Championship won (kp_league_5): the King comes down the carpet (A), then up to his Royal Box.
  // There: the Herald's five performers (on the team or in the Mog Box), the Steward's three questions, Sir Pompon's
  // battle, the parade (B), and the King himself (C).
  const PERFORMERS = [['mopluff_dancer', 'a Mopluff (Dancer)'], ['kupera_diva', 'a Kupera (Diva)'], ['chatmog_orator', 'a Chatmog (Orator)'],
    ['partypom_party_host', 'a Partypom (Party Host)'], ['bigtopo_ringmaster', 'a Bigtopo (Ringmaster)']];
  const acts = () => PERFORMERS.filter((p, i) => FL()['kp_lq_king_a' + (i + 1)]).length;
  KP.ITEMS.lq_royal_invite = { name: 'Royal Invitation', kind: 'key', price: 0,
    get desc() { return `His Majesty requests a Royal Parade! Five performers: ${PERFORMERS.map(p => p[1]).join(', ')}. Shown: ${acts()} of 5.`; } };
  const kingGone = () => !!(FL().kp_lq_king_done || FL().kp_legend_coh_kupoking);
  const KING = 'Kupo King', HERALD = 'Royal Herald', STEWARD = 'Royal Steward', GUARD = 'Sir Pompon';
  const KING_M = { enemy: 'kp_kupoking_king', scale: 1.2 }, HERALD_M = { enemy: 'kp_mopluff_bard', scale: 0.85 }, STEWARD_M = { enemy: 'kp_tomekin_scholar', scale: 0.85 },
    GUARD_M = { enemy: 'kp_kupage_mog_knight', scale: 0.95 };
  const SQ_FOLK = ['coh_official', 'coh_rookie', 'registrar'];
  // A. the decree (the Battle Square): talked to, or walked up to on the carpet
  const decree = function* (s, talked) {
    if (s.flag('kp_lq_king_open') || kingGone()) return;
    const [px, py] = here(s, 11, 9);
    s.sfx('found');
    yield s.msg('A tiny crown comes bobbing down the carpet, and every moogle in the Square bows.');
    SQ_FOLK.forEach(id => s.anim(id, 'kneel'));
    if (!talked && px >= 10 && px <= 13 && py > 6) yield s.move('coh_kupoking', px, py - 1);
    yield s.face('coh_kupoking', 'player'); yield s.face('player', 'coh_kupoking');
    const k = s.actor('coh_kupoking'), kx = k && k.tx != null ? k.tx : 11, ky = k && k.ty != null ? k.ty : 6;
    yield s.cam(kx, ky, 30, { dist: 3.2, pitch: 10 });   // (looking up, and up)
    s.emote('coh_kupoking', '!');
    yield s.say(KING, "Kupo! The new Champion! We are delighted.\fWe are also bored.\fA King requires a PARADE.");
    yield s.camFollow(30);
    s.spawn('lq_sq_herald', HERALD_M, 16, 2, 'down', { name: HERALD });
    yield s.move('lq_sq_herald', [[16, 4], [kx + 1, 4]]);
    s.sfx('levelup'); s.emote('lq_sq_herald', '♪', 60);
    yield s.say(HERALD, "Ta-ta-taaa! Hear ye! His Majesty retires to the Royal Box, up the stair by the League Desk!\fPerformers, petitions and parades: that way, kupo!");
    yield s.move('coh_kupoking', [[kx, 4], [16, 4], [16, 1]]);
    s.remove('coh_kupoking');
    yield s.move('lq_sq_herald', [[kx + 1, 4], [16, 4], [16, 1]]);
    s.remove('lq_sq_herald');
    SQ_FOLK.forEach(id => s.stopAnim(id));
    yield s.msg('(A narrow red stair beside the League Desk now leads up to the Royal Box.)');
    s.set('kp_lq_king_open');
  };
  {
    const k = npcOf('kp_costa_arena', 'coh_kupoking');
    if (k) { const sh0 = k.show; k.show = s => (!sh0 || sh0(s)) && !s.flag('kp_lq_king_open'); k.talk = function* (s) { yield* decree(s, true); }; }
    add('kp_costa_arena', 'triggers', { at: [10, 8, 4, 6], if: s => s.flag('kp_league_5') && !s.flag('kp_lq_king_open') && !kingGone(), run: function* (s) { yield* decree(s, false); } });
    const m = M('kp_costa_arena');
    if (m && freeTile('kp_costa_arena', 16, 1, 'the Royal Box stair')) {
      m.entries.from_box = [16, 2, 'down'];
      add('kp_costa_arena', 'exits', { at: [16, 1, 1, 1], to: 'kp_lq_king_box', entry: 'from_square', sfx: 'door', if: s => s.flag('kp_lq_king_open'),
        blocked: function* (s) { yield s.msg('A narrow red stair, roped off with a velvet cord. A little sign: "ROYAL BOX. Members of the court only."'); } });
      add('kp_costa_arena', 'props', { at: [16, 1.1], prop: 'disc', sides: 4, rot: 45, r: 0.62, h: 0.02, col: '#a02a2a', top: '#a02a2a', rim: '#e8c040' });   // (a red runner to the stair)
      add('kp_costa_arena', 'labels', { at: [16, 0], face: 's', text: 'ROYAL BOX', size: 0.1, col: '#a02a2a', y: 1.2 });
    }
    // the Square's fans, after
    wrapTalk('kp_costa_arena', 'coh_rookie', function* (s) {
      if (!s.flag('kp_lq_king_done')) return false;
      yield s.say('Rookie', "It's the ROYAL Champion! The King's own! Can I touch your sleeve? ...I touched your sleeve. I'm never washing my hand.");
      return true;
    });
  }
  // the Herald: the invitation, and the performers ticked off as they're shown
  const heraldTalk = function* (s) {
    if (kingGone()) {
      yield s.say(HERALD, "Hear ye! The Royal Champion approaches! ...Sorry. I just like saying it.");
      if (!s.flag('kp_lq_king_done')) return;
      // (then His Majesty's decrees for the Kupo Ranch, sold: js/kupomon/kp_legendbreed.js)
      yield s.say(HERALD, "His Majesty signs decrees for the Royal Champion's ranch now. Let there be an egg, kupo! The royal treasury asks a small fee. A royal one.");
      yield* KP.legendItemShop(s, 'kupoking_king', { who: HERALD, done: 'kp_lq_king_done' });
      return;
    }
    if (!hasKey('lq_royal_invite')) {
      yield s.say(HERALD, "Hear ye, hear ye! His Majesty will have a ROYAL PARADE, kupo! Five performers, the finest in the isles!");
      yield s.say(HERALD, "A Mopluff who dances. A Kupera who sings like a diva. A Chatmog who orates. A Partypom who hosts. And a Bigtopo with a ringmaster's whip!");
      KP.give('lq_royal_invite', 1); s.sfx('found');
      yield s.msg(KP.got('lq_royal_invite') + '\f(Bring the five on your team, or have them in your Mog Box.)');
      yield s.say(HERALD, "Show me each one as you find it. I'll tick them off! Ticking things off is my favourite part of the job.");
    }
    let n = 0;
    for (let i = 0; i < PERFORMERS.length; i++) {
      if (s.flag('kp_lq_king_a' + (i + 1)) || !owns(PERFORMERS[i][0])) continue;
      s.set('kp_lq_king_a' + (i + 1)); n++; s.sfx('set');
      yield s.say(HERALD, `${PERFORMERS[i][1].replace(/^a /, 'A ')}! Splendid, splendid. *tick*`);
    }
    s.setVar('kp_lq_king_acts', acts());
    if (acts() >= 5) {
      yield s.say(HERALD, n ? 'And that makes five! The Royal Parade is READY, kupo!' : 'The performers are standing by, kupo!');
      if (!s.flag('kp_lq_king_quiz')) yield s.say(HERALD, 'Only, the Royal Steward will want a word first. He always wants a word.');
      else if (!s.flag('kp_lq_king_guard')) yield s.say(HERALD, 'Only, Sir Pompon is guarding the throne. He takes it VERY seriously.');
      else yield s.say(HERALD, 'Go on, then! Approach His Majesty!');
      return;
    }
    const left = PERFORMERS.filter((p, i) => !s.flag('kp_lq_king_a' + (i + 1))).map(p => p[1]);
    if (!n) yield s.say(HERALD, `Still wanted for the parade: ${left.join(', ')}. On your team or in your Mog Box, kupo!`);
  };
  // the Steward: three questions about Cloud's own journey (all three right)
  const QUIZ = [
    ['Who gave you the Fist Badge?', ['Yuffie', 'Barret', 'Tifa'], 2],
    ['Where did Sephiroth first stop you?', ["Kurotsuki's gate", "Mogridge's bridge", 'The oasis'], 0],
    ['What did Hojo keep in his tank?', ['His lunch', 'Project J', 'A Nurse Mog'], 1],
  ];
  const stewardTalk = function* (s) {
    if (kingGone() || s.flag('kp_lq_king_quiz')) { yield s.say(STEWARD, "You are most certainly you. I have it in writing now. In triplicate."); return; }
    if (!hasKey('lq_royal_invite')) { yield s.say(STEWARD, "The Herald first, if you please. Invitations before interrogations."); return; }
    yield s.say(STEWARD, "Before anyone comes near His Majesty, I ask three little questions about their own journey. Impostors never remember the details.");
    let right = 0;
    for (const [q, ch, k] of QUIZ) { const c = yield s.ask(STEWARD, q, ch); if (c === k) right++; }
    if (right < 3) { s.sfx('error'); yield s.say(STEWARD, `${right} of three. Hmm. Even His Majesty gets two out of three, and HE is allowed to be wrong.\fCome back when it comes back to you.`); return; }
    s.set('kp_lq_king_quiz'); s.sfx('levelup');
    yield s.say(STEWARD, "Three for three! You are who you say you are. Sir Pompon will let you pass... after a fair battle. He insists. He always insists.");
  };
  // Sir Pompon, the Royal Guard, in front of the throne
  const guardTalk = function* (s) {
    if (s.flag('kp_lq_king_guard')) { yield s.say(GUARD, kingGone() ? 'All hail the Royal Champion! *clank*' : 'His Majesty will see you. Mind the cape. He trips on it.'); return; }
    if (!s.flag('kp_lq_king_quiz')) { yield s.say(GUARD, "None shall pass! ...The Steward hasn't vouched for you. Rules are rules."); return; }
    yield s.say(GUARD, "None shall pass!\f...Except after a fair battle. Those are the rules.");
    const r = yield* duel(s, { name: 'Royal Guard ' + GUARD, model: GUARD_M, bg: 'arena', money: 3000, lose: 'A fair battle, fairly lost. The rules are satisfied. *clank*',
      team: lv30(['mogsquire_paladin', 'kupage_mog_knight', 'aegimog_holy_knight', 'chocomog_knight', 'honeykin_queensguard']) });
    if (r !== 'win') return;
    s.set('kp_lq_king_guard');
    yield s.say(GUARD, 'You may approach His Majesty. Bow a little. He likes that.');
    yield s.move('lq_king_guard', 11, 3); yield s.face('lq_king_guard', 'left');
  };
  // B. the parade, watched from the box: the five march across the sand below, each with its turn
  const parade = function* (s) {
    yield s.say(KING, "At last! Herald! Let the Royal Parade... BEGIN!");
    s.sfx('levelup');
    yield s.cam(9, 11, 70, { dist: 11, pitch: 56 });
    const P5 = PERFORMERS.map(([sp], i) => ({ id: 'lq_parade_' + i, sp, x: 5 + i * 2 }));
    for (const p of P5) { s.spawn(p.id, { enemy: 'kp_' + p.sp, scale: 0.9 }, 1, 11, 'right', { solid: false }); s.move(p.id, p.x, 11, { noWait: true }); yield 20; }
    yield 80;
    for (const p of P5) s.face(p.id, 'up');
    yield 20;
    for (const d of ['right', 'down', 'left', 'up', 'right', 'down', 'left', 'up']) yield s.face(P5[0].id, d);   // the Dancer spins
    s.emote(P5[1].id, '♪', 80); s.sfx('ching2'); yield 70;                                                       // the Diva holds a note
    yield s.jump(P5[2].id, P5[2].x, 12, 0.15, 14); s.emote(P5[2].id, '...'); yield s.jump(P5[2].id, P5[2].x, 11, 0.15, 14);   // the Orator bows
    s.flash('#ffd0f0', 14); s.sfx('ching'); s.emote(P5[3].id, '♪'); yield 40;                                   // the Party Host's streamers
    s.sfx('hit'); s.shake(2, 12); s.emote(P5[4].id, '!!'); yield 40;                                            // the Ringmaster's whip
    s.sfx('ching');
    yield s.msg('The crowd in the stands roars!');
    yield s.camFollow(40);
    s.emote('lq_king_king', '♪', 60);
    yield s.say(KING, "Splendid! SPLENDID! We haven't laughed like that since the Great Pudding Incident of last Tuesday!");
    for (const p of P5) s.move(p.id, 18, 11, { noWait: true });
    yield 70;
    for (const p of P5) s.remove(p.id);
    s.set('kp_lq_king_parade');
    yield s.hover('lq_king_king', 0.8, 20);   // (he stands up on his throne)
    yield s.say(KING, 'Now then. A King must see for himself.');
  };
  // the King on his throne: the parade first, then (C) in session
  const kingTalk = function* (s) {
    if (!s.flag('kp_lq_king_parade')) {
      if (acts() < 5) { yield s.say(KING, "Where is our parade? Our Herald has the list. We are waiting. Royally."); return; }
      yield* parade(s);
    } else yield s.say(KING, 'Back for more? We decree a rematch! We are generous like that.');
    const [px, py] = here(s, 9, 2);
    const L = spotNear(s, px, py, [[0, 1], [1, 0], [-1, 0]]);
    yield s.jump('lq_king_king', L[0], L[1], 0.9, 26);   // (he hops down, right over Cloud's head)
    s.hover('lq_king_king', 0);
    yield s.face('lq_king_king', 'player'); yield s.face('player', 'lq_king_king');
    yield s.msg('The Kupo King flings off his cape (it lands on the gold rail, very nearly) and points his scepter straight at you.');
    s.emote('lq_king_king', '!');
    yield s.say(KING, 'By royal decree, this battle is now in session, kupo!');
    yield* legendFight(s, { id: 'lq_king_king', sp: 'kupoking_king', bg: 'arena', flag: 'kp_legend_coh_kupoking', done: 'kp_lq_king_done',
      after: "The Kupo King straightens his crown. 'We shall allow a rematch. We are generous.'",
      then: function* (s) {
        yield s.say(HERALD, 'Hear ye, hear ye! His Majesty has joined the Royal Champion\'s team! Ta-ta-TAAA!');
        KP.give('moogle_charm', 1); KP.give('fancy_nut', 5); s.sfx('found');
        yield s.msg(KP.got('moogle_charm') + '\f' + KP.got('fancy_nut', 5));
        yield* KP.giveLegendItem(s, 'kupoking_king');   // (the first Royal Decree: js/kupomon/kp_legendbreed.js)
      } });
  };
  // ---- the Royal Box (16+4 x 16): a balcony over the arena: red carpet, gold rails, the throne under its canopy, two
  // royal banners; the sand below, where the parade marches. Up a stair beside the Battle Square's League Desk.
  const BOX = [
    "##wwww###a###wwww###",
    "#u......mZm.......u#",
    "#.......|_|........#",
    "+_________.........#",
    "#..................#",
    "#..................#",
    "#..................#",
    "#==================#",
    "#ssssssssssssssssss#",
    "#ssssssssssssssssss#",
    "#ssssssssssssssssss#",
    "#ssssssssssssssssss#",
    "#ssssssssssssssssss#",
    "#ssssssssssssssssss#",
    "#ssssssssssssssssss#",
    "####################",
  ];
  FF7.defineMap('kp_lq_king_box', {
    name: 'Costa del Kupo - Royal Box', area: 'Costa del Kupo', theme: 'temple', music: 'goldsaucer', kpBg: 'arena',
    look: { sky: ['#4a9ae0', '#f0faff'], clouds: { col: '#ffffff', alpha: 0.8, n: 6, speed: 0.15 }, fog: { color: [0.82, 0.9, 0.98], near: 18, far: 40 },
      floor: ['#f0ead8', '#e8e2d0'], floor3: ['#a02a2a', '#982626'], wall: '#e8e0d0', wallTop: '#c8c0b0', trim: '#c8a040', wallH: 3.2,
      sand: ['#e8d8a8', '#e0d0a0'], urn: '#c8a040', pillar: '#f0ead8', ambient: [0.6, 0.6, 0.6], light: [0.95, 0.93, 0.88], window: '#9ac8f0',
      floorTex: { floor: 'marble', floor3: 'carpet' } },
    camera: { pitch: 54, dist: 10 },
    grid: BOX,
    heights: BOX.map((r, y) => (y <= 7 ? '6' : '0').repeat(r.length)),
    legend: { Z: 'block' },
    props: deco(BOX, { '=': () => ({ prop: 'rail', col: '#d8b040' }), u: () => ({ prop: 'statue', col: '#e8c860', col2: '#d8d0c0' }) }).concat([
      { at: [9, 1], prop: 'chair', col: '#c8a040', scale: 1.6 },   // (the throne)
      { at: [9.01, 1.15], prop: 'canopy', trunk: false, r: 1.2, h: 2.7, col: '#a02a2a' },
      ...[6, 12].map(x => ({ at: [x, 0], prop: 'banner', col: '#a02a2a', col2: '#e8c040', y: 2.7, h: 1.7, w: 1.1, text: 'K', size: 0.32, textCol: '#f0d870' })),
      { at: [9.5, 11], prop: 'disc', r: 3.4, h: 0.02, col: '#c8b890', top: '#e8d8a8', ring: '#a02a2a' },
    ]),
    labels: [{ at: [9.5, 13.6], text: 'KUPO!', size: 0.45, col: '#a02a2a', y: 0.02 }],
    lights: [[9, 2, '#fff0d0', 5], [3, 4, '#fff0d0', 4], [15, 4, '#fff0d0', 4], [9.5, 11, '#fff4d8', 7]],
    entries: { from_square: [1, 3, 'right'] },
    exits: [{ at: [0, 3, 1, 1], to: 'kp_costa_arena', entry: 'from_box', sfx: 'door' }],
    npcs: [
      { id: 'lq_king_king', name: KING, model: KING_M, at: [9, 1], dir: 'down', hover: 0.32, show: s => s.flag('kp_lq_king_open') && !kingGone(), talk: kingTalk },
      { id: 'lq_king_herald', name: HERALD, model: HERALD_M, at: [3, 2], dir: 'down', talk: heraldTalk },
      { id: 'lq_king_steward', name: STEWARD, model: STEWARD_M, at: [14, 2], dir: 'down', talk: stewardTalk },
      { id: 'lq_king_guard', name: GUARD, model: GUARD_M, at: [9, 3], dir: 'down', show: s => !s.flag('kp_lq_king_guard'), talk: guardTalk },
      { id: 'lq_king_guard2', name: GUARD, model: GUARD_M, at: [11, 3], dir: 'left', show: s => s.flag('kp_lq_king_guard'), talk: guardTalk },
      W.moogle('lq_king_mog', 'mopluff_dancer', [15, 5], { wander: 2, line: 'Mopluff: Kupo~! It is practising its royal curtsy. It falls over. It tries again.' }),
    ],
    triggers: [
      W.sign([1, 1], 'A golden moogle statue. The plaque: "HIS MAJESTY, AGED 7, IN HIS FIRST CROWN." The crown is bigger than the moogle.'),
      W.sign([4, 7], 'The gold rail. Far below, the sand of the Battle Square\'s own arena. A little sign: "NO PUDDING BEYOND THIS POINT."'),
    ],
  });
  KP.legendSeller('kupoking_king', 'kp_lq_king_box', 'lq_king_herald');

  // ======================================================================== 15. Chalimog: Reserved
  // Opens with every cup won and the World Championship won twice (KP.league counts it: kp_lq_chal_wc). The card marked
  // "Reserved" flips (A), the League Official tells the story; three drops of myrrh from three trees; the three champions
  // in the Grand Hall (B), three battles back to back; the Chalice Vault: five cups, then the myrrh (C).
  const CUPS = ['Gold trophy', 'Platinum trophy', 'Diamond trophy', 'Master trophy', 'World Championship trophy'];
  const CUP_COL = ['#e8c040', '#c8d8e8', '#a0e8ff', '#d060ff', '#ff6060'];
  const chalGone = () => !!(FL().kp_lq_chal_done || FL().kp_legend_lq_chalimog);
  const chalReady = () => [1, 2, 3, 4, 5].every(n => FL()['kp_league_' + n]) && (VR().kp_lq_chal_wc || 0) >= 2 && !chalGone();
  KP.ITEMS.lq_reserved_card = { name: 'Reserved Card', kind: 'key', price: 0,
    desc: 'The little card from the top of the trophy case. It says "Reserved". It hums near the trees where champions rested.' };
  KP.ITEMS.lq_myrrh = { name: 'Myrrh Drops', kind: 'key', price: 0,
    get desc() { return `Myrrh Drops: ${bag().lq_myrrh || 0} of 3. Sweet, golden, and meant for the plinth in the Chalice Vault.`; } };
  const OFF = 'League Official';
  // A. the card turns (the Battle Square), and the story
  const cardFlip = function* (s, talked) {
    yield s.cam(2, 6, 40, { dist: 5, pitch: 30 });
    s.flash('#a0d8ff', 16); s.sfx('ching');
    yield s.msg('At the top of the trophy case, the little card marked "Reserved" flips over. All by itself.');
    yield s.camFollow(30);
    s.emote('coh_official', '!'); s.sfx('hit');
    yield s.msg('The League Official drops his clipboard.');
    if (!talked) { const [px, py] = here(s, 12, 9); const L = spotNear(s, px, py, [[1, 0], [-1, 0], [0, -1]]); yield s.move('coh_official', L[0], L[1]); }
    yield s.face('coh_official', 'player'); yield s.face('player', 'coh_official');
    yield s.say(OFF, "It's never done that. Not in forty years.\fChampion... did you do that?");
    s.anim('player', 'shake'); yield 40; s.stopAnim('player');
    yield s.say(OFF, '...Of course you did.');
    yield s.say(OFF, "Here's the story. The very first champions drank from a crystal chalice. Then one year it went missing, kupo. We've kept its space on the shelf ever since.\fThat card was for whoever brings it back. It seems to think that's you.");
    KP.give('lq_reserved_card', 1); s.sfx('found');
    yield s.msg(KP.got('lq_reserved_card') + '\fIt hums. Faintly. Like it knows a tune.');
    yield s.say(OFF, "The old champions rested under three trees, the stories say. A silver tree by Bloomhaven's glasshouse. The Great Hollow Tree in Whisperwood. A crystal tree on the Northern Crater's rim.\fEach kept a drop of myrrh for the chalice. Follow the hum.");
    yield s.say(OFF, "And the three champions on the statues outside the Coliseum? They'll want a word in the Grand Hall. Champions always want a word.");
    s.set('kp_lq_chal_open');
  };
  {
    const off = wrapTalk('kp_costa_arena', 'coh_official', function* (s) {
      if (s.flag('kp_lq_chal_done')) {
        yield s.say(OFF, "Forty years with that card. I'll need a new one now. It'll say 'Taken'.");
        // (then the drops the chalice weeps in its case, bottled for the Kupo Ranch: js/kupomon/kp_legendbreed.js)
        yield s.say(OFF, "And the chalice weeps a drop now and then, up in the case. We bottle them. The League has a fee for everything, champion.");
        yield* KP.legendItemShop(s, 'chalimog_chalice_bearer', { who: OFF, done: 'kp_lq_chal_done' });
        return true;
      }
      if (chalReady() && !s.flag('kp_lq_chal_open')) { yield* cardFlip(s, true); return true; }
      if (!s.flag('kp_lq_chal_open') || chalGone()) return false;
      const n = [1, 2, 3].filter(i => s.flag('kp_lq_chal_m' + i)).length;
      if (n < 3) yield s.say(OFF, `Three trees: silver in Bloomhaven, hollow in Whisperwood, crystal on the Crater's rim. Myrrh so far: ${n} of 3. Follow the hum, champion.`);
      else if (!s.flag('kp_lq_chal_dyne')) yield s.say(OFF, 'Three drops! Now the three champions. The Grand Hall at the Coliseum, kupo. Bring your best five.');
      else yield s.say(OFF, "The stair behind the trophy case is open. Forty years, and I never knew it was there. I'm not going down. I've seen enough surprises this week.");
      return true;
    });
    if (off) KP.legendSeller('chalimog_chalice_bearer', 'kp_costa_arena', 'coh_official');
    add('kp_costa_arena', 'triggers', { at: [10, 8, 4, 6], if: s => chalReady() && !s.flag('kp_lq_chal_open') && (s.flag('kp_lq_king_open') || kingGone()), run: function* (s) { yield* cardFlip(s, false); } });
    // the trophy cases (here and in the Coliseum's Grand Hall): the card glowing, then the Crystal Chalice in its place
    const caseLine = function* (s) {
      if (s.flag('kp_lq_chal_done')) { yield s.msg('A trophy case. Gold, platinum, diamond... and at the very top, the Crystal Chalice, shining in the space once marked "Reserved".'); return; }
      yield s.msg('A trophy case. Gold, platinum, diamond... and at the very top, the little card that says "Reserved". It is glowing.');
    };
    ['kp_costa_arena', 'kp_coliseum_hall'].forEach(id => {
      const m = M(id); if (!m) return;
      (m.triggers = m.triggers || []).unshift({ at: [2, 6], on: 'talk', if: s => s.flag('kp_lq_chal_done') || (chalReady() && !s.flag('kp_lq_chal_open')), run: caseLine });
      (m.objects = m.objects || []).push({ id: 'lq_chalice_case', at: [2, 6], model: { prop: 'kptrophy', col: '#80d8ff', scale: 2.2 }, hover: 0.72, dir: 'right', solid: false, hidden: true,
        tick(o) { o.hidden = !FL().kp_lq_chal_done; } });
    });
    // the stair down to the Vault, behind the trophy case (open after the three champions)
    const m = M('kp_costa_arena');
    if (m && freeTile('kp_costa_arena', 1, 6, 'the Vault stair')) {
      m.entries.from_vault = [1, 7, 'down'];
      add('kp_costa_arena', 'exits', { at: [1, 6, 1, 1], to: 'kp_lq_chal_vault', entry: 'from_square', if: s => s.flag('kp_lq_chal_dyne'),
        blocked: function* (s) { yield s.msg('Behind the trophy case, the floor tiles are laid in a perfect circle. They do not budge.'); } });
      add('kp_costa_arena', 'objects', { id: 'lq_vault_stair', at: [1, 6], model: { prop: 'hole', r: 0.42, col: '#80d8ff', col2: '#c8a040' }, solid: false, hidden: true,
        tick(o) { o.hidden = !FL().kp_lq_chal_dyne; } });
    }
  }
  // ---- the myrrh: three trees where champions rested
  const myrrh = (n, plain, find, after) => function* (s) {
    if (!s.flag('kp_lq_chal_open') || !hasKey('lq_reserved_card')) { yield s.msg(plain); return; }
    if (s.flag('kp_lq_chal_m' + n)) { yield s.msg(after); return; }
    s.sfx('ching2');
    yield s.msg('The Reserved Card hums in your bag, louder and louder...');
    yield s.msg(find);
    s.set('kp_lq_chal_m' + n); KP.give('lq_myrrh', 1); s.sfx('found');
    yield s.msg(`${KP.got('lq_myrrh')} (${[1, 2, 3].filter(i => s.flag('kp_lq_chal_m' + i)).length} of 3)`);
  };
  // 1. Bloomhaven: a silver tree in the flower bed beside the glasshouse (the Flower Arcade)
  if (freeTile('kp_bloomhaven', 27, 20, 'the silver tree')) add('kp_bloomhaven', 'objects', { id: 'lq_silver_tree', at: [27, 20], model: { prop: 'coraltree', h: 2.3, col: '#d8dce4', col2: '#ffffff' }, solid: true,
    talk: myrrh(1, 'A little silver tree in the flower bed by the glasshouse. Its leaves chime when the wind blows.',
      'On the lowest silver leaf hangs a single golden drop. It smells of honey and old victories.',
      'The silver tree chimes softly. Its leaves are dry now.') });
  // 2. Whisperwood Deep: the Great Hollow Tree, its east side (the drop falls from the very top)
  if (freeTile('kp_whisperwood_deep', 18, 8, 'the Great Hollow Tree')) add('kp_whisperwood_deep', 'triggers', { at: [18, 8], on: 'talk', if: s => s.flag('kp_lq_chal_open') && !s.flag('kp_lq_chal_m2'),
    run: myrrh(2, '', 'You look up. From the very top of the Great Hollow Tree, a golden drop slides down the bark... right into your hand.', '') });
  // 3. the Northern Crater: a crystal tree on the north rim
  if (freeTile('kp_crater_1', 14, 1, 'the crystal tree')) add('kp_crater_1', 'objects', { id: 'lq_crystal_tree', at: [14, 1], model: { prop: 'coraltree', h: 2.4, col: '#7ac8f0', col2: '#e0f8ff' }, solid: true,
    talk: myrrh(3, 'A tree made of crystal, growing out of the crater rim. It rings like a glass when you tap it.',
      'In a crystal knot, a golden drop has gathered, warm despite the cold.',
      'The crystal tree rings softly. Its knot is empty.') });
  // ---- B. three champions (the Coliseum's Grand Hall): Dio, Bugenhagen, Dyne, off their statues outside
  const CHAMPS = [
    { id: 'lq_chal_dio', name: 'Dio', model: 'dio', flag: 'kp_lq_chal_dio', at: [10, 7], dir: 'down',
      team: lv30(['gilmog_gambler', 'bigtopo_ringmaster', 'partypom_party_host', 'luchapom_luchador', 'chocomog_knight']),
      line: "The 3rd Kupo League's champion, at your service! Place your bets!", lose: 'The house... lost? Somebody check the dice!', after: "Ha! Marvellous! Bugenhagen, you're up!" },
    { id: 'lq_chal_bugen', name: 'Bugenhagen', model: 'bugenhagen', hover: 0.3, flag: 'kp_lq_chal_bugen', at: [12, 7], dir: 'down',
      team: lv30(['twinklin_skyseer', 'seramog_seraph', 'astropom_lunarian', 'orbmog_seer', 'kupozen_white_monk']),
      line: 'Ho ho hoo. The 9th champion. My moogles have been reading the stars about you.', lose: 'Ho ho hoo! The stars were right.', after: 'Dyne. Your turn, old friend.' },
    { id: 'lq_chal_dyne', name: 'Dyne', model: 'dyne', flag: 'kp_lq_chal_dyne', at: [11, 6], dir: 'down',
      team: lv30(['gunmog_gun_arm', 'flintkin_flintlock', 'slingmog_gunslinger', 'grumog_viking', 'leomog_gunbreaker']),
      line: "...The 15th. I don't talk much.", lose: '...Good.', after: '...You earned it.' },
  ];
  KP.GAUNTLETS = KP.GAUNTLETS || {};
  KP.GAUNTLETS.chal = { name: 'the three champions', flag: 'kp_lq_chal_dyne', running: () => false,   // (back to back in one script: no gap to plan in)
    teams: () => CHAMPS.map(C => { const team = C.team.map(([sp, lv, x]) => [sp, lv, Object.assign({ plus: 2 }, x || {})]); return { name: 'Champion ' + C.name, done: C.flag, foes: W.team(KP.leagueHeld ? KP.leagueHeld(team) : team) }; }) };
  const champsHere = (s) => s.flag('kp_lq_chal_arrived') && !s.flag('kp_lq_chal_dyne');
  const arrival = function* (s) {
    yield s.face('player', 'down');
    s.sfx('door');
    s.show('lq_chal_dio', 9, 14, 'up');
    yield s.say('Dio', 'Make way, make way! Champions coming through!');
    yield s.move('lq_chal_dio', [[9, 7], [10, 7]], { run: true });
    s.show('lq_chal_bugen', 14, 14, 'up'); s.hover('lq_chal_bugen', 0.3);
    yield s.move('lq_chal_bugen', [[14, 7], [12, 7]]);
    s.show('lq_chal_dyne', 14, 14, 'up');
    yield s.move('lq_chal_dyne', [[14, 6], [11, 6]], { speed: 0.022 });
    for (const C of CHAMPS) s.face(C.id, 'down');
    yield s.face('player', 'up');
    yield s.say('Dio', 'Three champions! One challenger! The house always wins... usually!');
    yield s.say('Bugenhagen', "Ho ho hoo. The chalice remembers who drank from it. Let's see if it remembers you.");
    yield s.say('Dyne', '...Let\'s go.');
    yield s.say('Dio', "Three battles, back to back, and no repairs in between! Talk to me when you're ready, challenger!");
    s.set('kp_lq_chal_arrived');
  };
  const gauntlet = function* (s) {
    if (s.flag('kp_lq_chal_dyne')) { yield s.say('Dio', 'The Vault is open! Go on, go on!'); return; }
    const c = yield s.ask('Dio', 'Dio, Bugenhagen, Dyne: back to back, no repairs between. Ready?', ['Bring it on', 'Not yet']);
    if (c !== 0) { yield s.say('Dio', 'Take your time! The house can wait. The house is very patient.'); return; }
    for (const C of CHAMPS) {
      if (s.flag(C.flag)) continue;
      yield s.face(C.id, 'player'); yield s.face('player', C.id);
      yield s.say(C.name, C.line);
      const r = yield* duel(s, { name: 'Champion ' + C.name, model: C.model, team: C.team, plus: 2, lose: C.lose, money: 4000, bg: 'arena', music: 'judgement', gauntlet: CHAMPS.length - CHAMPS.indexOf(C) });
      if (r !== 'win') { CHAMPS.forEach(D => s.unset(D.flag)); return; }   // (lose one, and it starts again from Dio)
      s.set(C.flag);
      yield s.say(C.name, C.after);
    }
    s.sfx('gate'); s.shake(2, 40);
    yield s.msg('Far away, under the Battle Square, something heavy grinds aside...');
    yield s.say('Bugenhagen', 'Ho ho hoo. The Vault is open. Behind the trophy case in the Battle Square, a stair goes down. Take your cups, and the myrrh.');
    yield s.say('Dio', "And bring the chalice up here sometime! I'll put it in the gift shop. ...Kidding! Mostly!");
    yield s.msg('The three champions head back out to their statues.');
    for (const C of CHAMPS) s.remove(C.id);
  };
  {
    const m = M('kp_coliseum_hall');
    if (m) {
      CHAMPS.forEach(C => add('kp_coliseum_hall', 'npcs', { id: C.id, name: C.name, model: C.model, at: C.at, dir: C.dir, hover: C.hover, show: champsHere, talk: gauntlet }));
      add('kp_coliseum_hall', 'triggers', { at: [10, 9, 4, 3], if: s => s.flag('kp_lq_chal_open') && !s.flag('kp_lq_chal_arrived') && !chalGone(), run: arrival });
    }
  }
  // ---- the Chalice Vault (15 x 15): a round vault of blue crystal under the Battle Square; five pedestals in an arc
  // (left to right: Gold, Platinum, Diamond, Master, World Championship), the crystal plinth in the middle, the names of
  // every champion round the walls. The stair back up at the south.
  const PED = [[2, 7], [4, 4], [7, 3], [10, 4], [12, 7]];
  const pedestal = (i) => function* (s) {
    const f = 'kp_lq_chal_p' + (i + 1);
    if (s.flag(f)) { yield s.msg(`The ${CUPS[i]} stands here, glowing softly.`); return; }
    const c = yield s.ask(null, 'An empty pedestal of blue crystal. Set a trophy on it?', CUPS.concat(['Leave it']));
    if (c < 0 || c >= CUPS.length) return;
    if (s.flag('kp_lq_chal_p' + (c + 1))) { yield s.msg(`The ${CUPS[c]} is already on another pedestal.`); return; }
    if (c !== i) { s.sfx('error'); yield s.msg(`${s.name('cloud')} sets down the ${CUPS[c]}. It wobbles... and rolls right off. Out of place, it seems.`); return; }
    s.set(f); s.sfx('set');
    yield s.msg(`${s.name('cloud')} sets the ${CUPS[c]} on the pedestal. It clicks into place and starts to glow.`);
    if ([1, 2, 3, 4, 5].every(n => s.flag('kp_lq_chal_p' + n))) {
      s.set('kp_lq_chal_cups'); s.sfx('levelup');
      yield s.msg('All five cups glow together. In the middle of the vault, the crystal plinth begins to hum.');
    }
  };
  const chalFight = (s) => legendFight(s, { id: 'lq_chal_chalimog', sp: 'chalimog_chalice_bearer', bg: 'ruins', flag: 'kp_legend_lq_chalimog', done: 'kp_lq_chal_done',
    opening: 'Chalimog sets the chalice down very carefully. Then it raises its shield.',
    after: "Chalimog takes up the chalice and steps back into the crystal. The card still says 'Reserved'.",
    then: function* (s) {
      yield s.msg('Chalimog hands you the chalice. Very, very carefully.\fIt will look splendid in that empty space on the shelf.');
      KP.give('royal_nut', 5); s.sfx('found');
      yield s.msg(KP.got('royal_nut', 5));
      yield* KP.giveLegendItem(s, 'chalimog_chalice_bearer');   // (the first Chalice Drop: js/kupomon/kp_legendbreed.js)
      yield s.msg(`On the vault wall, after every champion's name, new letters carve themselves in light: ${String(s.name('cloud') || 'Cloud').toUpperCase()}.`);
    } });
  const plinth = function* (s) {
    if (chalGone()) { yield s.msg('The crystal plinth. A small, very careful scratch shows where a chalice once stood.'); return; }
    if (s.flag('kp_lq_chal_poured')) { yield s.msg('The plinth glows. Deep in the crystal, something with a very large shield is waiting for you to come back.'); return; }
    if (!s.flag('kp_lq_chal_cups')) { yield s.msg('An empty crystal plinth. Five pedestals stand round it in an arc, waiting for something.'); return; }
    const n = bag().lq_myrrh || 0;
    if (n < 3) { yield s.msg(`The plinth hums. It wants something poured on it. (Myrrh Drops: ${n} of 3)`); return; }
    // C. the chalice
    yield s.msg(`${s.name('cloud')} pours the three drops of myrrh onto the plinth.`);
    KP.take('lq_myrrh', 3); s.set('kp_lq_chal_poured');
    s.stopMusic(40);
    yield s.cam(7, 6, 50, { dist: 7, pitch: 36 });
    for (let k = 0; k < 5; k++) { s.flash(CUP_COL[k], 12, 0.5); s.sfx('ching2'); yield 26; }
    s.sfx('magic');
    yield s.msg('The myrrh sinks into the crystal. Light gathers... and a chalice grows up out of the plinth.');
    s.spawn('lq_chalice', { prop: 'kptrophy', col: '#80d8ff', scale: 1.3 }, 7, 8, 'down', { solid: false, hover: 0.6 });
    s.flash('#c0f0ff', 20);
    yield 40;
    s.show('lq_chal_chalimog', 7, 8, 'down'); s.hover('lq_chal_chalimog', -1.0);
    yield s.hover('lq_chal_chalimog', 0.6, 80);
    s.remove('lq_chalice');
    yield s.msg('A small knight with tiny wings and a very large shield stands up out of the light, the chalice in its paws.');
    yield s.say('Chalimog', 'Reserved... for you? We will see, kupo.');
    yield s.camFollow(30);
    yield* chalFight(s);
  };
  const VAULT = [
    "###############",
    "#####.....#####",
    "###U.......U###",
    "##.....P.....##",
    "##..P.....P..##",
    "#U...........U#",
    "#.............#",
    "#.P.........P.#",
    "#......X......#",
    "#.............#",
    "#U...........U#",
    "##...........##",
    "###U.......U###",
    "######...######",
    "######^^^######",
  ];
  const CHALIMOG_M = { enemy: KP.SPECIES.chalimog_chalice_bearer ? 'kp_chalimog_chalice_bearer' : 'kp_aegimog_holy_knight', scale: 1.1 };
  FF7.defineMap('kp_lq_chal_vault', {
    name: 'Costa del Kupo - Chalice Vault', area: 'Costa del Kupo', theme: 'temple', music: 'church', kpBg: 'ruins',
    look: { floor: ['#a8c4dc', '#a0bcd4'], floor2: ['#8ab0d0', '#84aaca'], wall: '#4a6a98', wallTop: '#2a3a58', trim: '#c8e8ff', wallH: 3.6,
      sky: ['#000000', '#000000'], indoor: true, ambient: [0.42, 0.48, 0.6], light: [0.7, 0.8, 0.95], glow: '#a0e8ff',
      fog: { color: [0.05, 0.08, 0.14], near: 9, far: 24 }, floorTex: { floor: 'marble' } },
    camera: { pitch: 58, dist: 10 },
    grid: VAULT,
    heights: VAULT.map((r, y) => (y === 14 ? '000000111000000' : '0'.repeat(r.length))),
    legend: { P: 'block', X: 'block' },
    props: deco(VAULT, { U: (x, y) => ({ prop: 'crystal', col: (x + y) % 2 ? '#80d0ff' : '#a8e8ff' }), P: () => ({ prop: 'disc', r: 0.4, h: 0.6, sides: 8, col: '#4a7ab0', top: '#d0ecff', rim: '#c8a040' }) })
      .concat([{ at: [7, 8], prop: 'disc', r: 0.55, h: 0.55, sides: 6, col: '#7ac8f0', top: '#e8f8ff', rim: '#a0e0ff' }]),
    labels: [
      { at: [7, 0], face: 's', text: 'DIO - BUGENHAGEN - DYNE', size: 0.1, col: '#d8f0ff', y: 1.65, glow: true },
      { at: [7, 0], face: 's', text: 'MOGWYN - PUCKA - KUPEPPO', size: 0.075, col: '#b8d8f0', y: 1.38 },
      { at: [7, 0], face: 's', text: 'ROSALINE - NELL - SIR KUPPA', size: 0.075, col: '#b8d8f0', y: 1.14 },
    ],
    lights: [[7, 8, '#a0e8ff', 6], [7, 3, '#c0f0ff', 5], [2, 7, '#a0d8ff', 3], [12, 7, '#a0d8ff', 3]],
    entries: { from_square: [7, 13, 'up'] },
    exits: [{ at: [6, 14, 3, 1], to: 'kp_costa_arena', entry: 'from_vault' }],
    npcs: [
      { id: 'lq_chal_chalimog', name: 'Chalimog', model: CHALIMOG_M, at: [7, 8], dir: 'down', hover: 0.6, show: s => s.flag('kp_lq_chal_poured') && !chalGone(),
        talk: function* (s) { yield s.msg('Chalimog stands on the plinth, the chalice at its feet. It bows. Politely. Then it raises its shield.'); yield* chalFight(s); } },
    ],
    objects: PED.map(([x, y], i) => ({ id: 'lq_cup_' + (i + 1), at: [x, y], model: { prop: 'kptrophy', col: CUP_COL[i], scale: 2.4 }, hover: 0.6, dir: 'down', solid: false, hidden: true,
      tick(o) { o.hidden = !FL()['kp_lq_chal_p' + (i + 1)]; } })),
    triggers: PED.map(([x, y], i) => ({ at: [x, y], on: 'talk', run: pedestal(i) })).concat([
      { at: [7, 8], on: 'talk', run: plinth },
      { at: [5, 0, 5, 1], on: 'talk', run: function* (s) {
        yield s.msg("Names carved round the vault: every champion the Kupo League ever had. DIO, the 3rd. BUGENHAGEN, the 9th. DYNE, the 15th. Dozens more, worn smooth by time.");
        if (s.flag('kp_lq_chal_done')) yield s.msg(`And the last one, still sharp: ${String(s.name('cloud') || 'Cloud').toUpperCase()}.`);
        else yield s.msg('At the very end, a blank space, polished smooth. Waiting.');
      } },
    ]),
  });

  // ======================================================================== the Demo (js/kupomon/kp_runner.js O.kp_quests)
  // ring Big Mog's Bell from the Bag as a player does (Menu > Bag > Key Items > the bell), outdoors; the letter scene
  // takes the place of the Town Map this once
  const ringBell = function* (api, R) {
    const done = () => !!FF7.state.flags.kp_lq_baha_l5;
    if (done()) return true;
    if (!(bag().big_bell > 0)) return "no Big Mog's Bell";
    const press = function* (b, n) { for (let g = 0; g < 30 && !R.tap(b); g++) yield; yield; for (let i = 0; i < (n == null ? (R.fast ? 1 : 8) : n); i++) yield; };
    R.kpMenuOwn = true;
    try {
      yield* press('menu', R.fast ? 4 : 14);
      const Mn = R.top();
      if (KP.Menu && Mn instanceof KP.Menu) {
        for (let g = 0; g < 40 && Mn.idx !== 2; g++) { R.tap(Mn.idx < 2 ? 'down' : 'up'); yield; yield; }
        yield* press('ok');
        const pk = KP.pocketOf('big_bell');
        for (let g = 0; g < 20 && Mn.pocket !== pk; g++) { R.tap('right'); yield; yield; yield; }
        const k = KP.pocketItems(pk).indexOf('big_bell');
        for (let g = 0; g < 60 && Mn.sub !== k; g++) { R.tap(Mn.sub < k ? 'down' : 'up'); yield; yield; }
        yield* press('ok', R.fast ? 2 : 16);
        for (let g = 0; g < 60 && R.top() instanceof KP.Menu; g++) { R.tap('cancel'); yield; yield; }
      }
    } finally { R.kpMenuOwn = false; }
    for (let g = 0; g < 600 && !done() && !(R.field() && !R.fieldFree(R.field())); g++) yield;
    if (!done() && R.field() && R.fieldFree(R.field()) && letterDue(5)) FF7.fieldScene.runScript(bigMogLetter, { name: 'kp-lq-baha-sky' });   // (the menu missed: the bell rung all the same)
    for (let g = 0; g < 6000 && !done(); g++) yield;
    yield* R.settle(4);
    return done() ? true : 'Big Mog never came for his letter';
  };
  // the five performers on the team or in the Mog Box: befriended where their lines live, raised to the job if need be
  const performers = function* (api, R) {
    const O = R.ops, pre = {};
    for (const k of Object.keys(KP.SPECIES)) { const e = KP.SPECIES[k].evo; if (e) pre[e.to] = k; }
    if (!R.kpMain) R.kpMain = KP.data().party.map(m => m.uid);
    const ok = (i) => FF7.state.flags['kp_lq_king_a' + (i + 1)] || owns(PERFORMERS[i][0]);
    for (let i = 0; i < PERFORMERS.length; i++) {
      if (ok(i)) continue;
      const sp = PERFORMERS[i][0], line = []; for (let q = sp; q; q = pre[q]) line.push(q);
      let g = R.kpGrowsInto ? R.kpGrowsInto(sp, pre) : null;
      if (!g) {
        const hs = R.kpWildMaps(line).sort((a, b) => (b.sps.includes(sp) ? 1 : 0) - (a.sps.includes(sp) ? 1 : 0) || b.odds - a.odds);
        if (!hs.length) { R.note('kp_lq king: no ' + line.join(' / ') + ' in the wild'); continue; }
        const h = hs[0], before = new Set(owned()), fits = (m) => line.includes(m.sp);
        yield* R.kpNutsFor(h.lv, 'Nuts for the Royal Parade');
        yield* R.kpRestoreTeam();
        R.kpWantAny = fits; R.kpFlee = (m) => !fits(m);
        try {
          yield* O.kp_train(0, { map: h.map, until: () => owned().some(m => !before.has(m) && fits(m)), max: 200, fast: true,
            label: `The Royal Parade: looking for ${PERFORMERS[i][1]} on ${(M(h.map) || {}).name || h.map}` });
        } finally { R.kpWantAny = null; R.kpFlee = null; }
        if (ok(i)) continue;
        g = R.kpGrowsInto ? R.kpGrowsInto(sp, pre) : null;
      }
      if (g) { const r = yield* R.kpRaise([g]); if (r !== true) R.note('kp_lq king: raising ' + sp + ': ' + r); }
      yield* R.kpRestoreTeam();
      R.stepStart = R.frames;
    }
    yield* R.kpRestoreTeam();
    return PERFORMERS.every((p, i) => ok(i)) ? true : 'the Royal Parade is still missing performers';
  };
  // the World Championship won a second time (the title defended), for Chalimog
  const defendTitle = function* (api, R) {
    const n = () => VR().kp_lq_chal_wc || 0;
    for (let t = 0; t < 10 && n() < 2; t++) {
      yield* R.kpRestoreTeam();
      if (R.kpClause) yield* R.kpClause({ train: 'kp_summit_2' });
      const r = yield* R.ops.kp_rematch({ league: 5 });
      if (r !== true) R.note('kp_lq chal: ' + r);
      R.stepStart = R.frames;   // (a whole tournament each time: the watchdog's clock restarts)
      yield* R.ops.kp_heal({ center: 'nearest' });
    }
    return n() >= 2 ? true : 'the World Championship title was not defended';
  };
  const heal = ['kp_heal', { center: 'nearest' }];
  // (every step of a quest's plan runs inside the one kp_quests step: each gets a plan step's time from the watchdog)
  const tick = ['js', function (api, R) { R.stepStart = R.frames; return true; }];
  const paced = (steps) => [].concat(...steps.map(st => [st, tick]));
  const twice = (st) => [st, st];
  KP.QUESTS = KP.QUESTS || {};
  KP.QUESTS.baha = { name: 'Bahamog: Return to Sender', order: 4,
    ready: () => !!FL().kp_league_1 && !FL().kp_legend_mg_bahamog,   // (the Postmaster's gift comes with the first talk)
    done: 'kp_lq_baha_done',
    plan: paced([
      ['talk', 'mg_postmaster', { map: 'kp_mognet_1', done: 'kp_lq_baha_open' }],
      ['goto', 'kp_coliseum', { done: 'kp_lq_baha_l5' }],                     // (outdoors: the bell)
      ['js', ringBell, { done: 'kp_lq_baha_l5' }],
      ['talk', 'lq_baha_tufty', { map: 'kp_town', done: 'kp_lq_baha_l1' }],
      ['talk', 'lq_baha_grandpa', { map: 'kp_route4', done: 'kp_lq_baha_l2' }],
      // (Yuffie and the Clockmaker have other quests' errands too: another quest's scene may come first, then the letter)
      ...twice(['talk', 'kp_yuffie', { map: 'kp_kurotsuki_dojo_2', done: 'kp_lq_baha_l3' }]),
      ...twice(['talk', 'rvt_clockmaker', { map: 'kp_ravenmoor_clock', done: 'kp_lq_baha_l4' }]),
      heal,
      win('kp_lq_baha_couriers', 'kp_summit_2', ['goto', 'kp_mognet_1'], ['talk', 'lq_baha_pip', { done: 'kp_lq_baha_couriers' }]),
      heal,
      ['talk', 'mg_postmaster', { map: 'kp_mognet_1', choose: 'Bahamog', done: 'kp_lq_baha_airmail' }],
      heal,
      win('kp_legend_mg_bahamog', null, ['goto', 'kp_mognet_3'], ['use', 5, 4, { done: 'kp_legend_mg_bahamog' }]),
    ]) };
  KP.QUESTS.king = { name: 'Kupo King: The Royal Parade', order: 5,
    ready: () => !!FL().kp_league_5 && !FL().kp_legend_coh_kupoking,
    done: 'kp_lq_king_done',
    plan: paced([
      ['talk', 'coh_kupoking', { map: 'kp_costa_arena', done: 'kp_lq_king_open' }],
      ['talk', 'lq_king_herald', { map: 'kp_lq_king_box', done: () => hasKey('lq_royal_invite') }],
      ['js', performers, { done: () => acts() >= 5 }],
      ['talk', 'lq_king_herald', { map: 'kp_lq_king_box', done: () => acts() >= 5 }],
      ['talk', 'lq_king_steward', { map: 'kp_lq_king_box', choose: ['Tifa', 'Kurotsuki', 'Project J'], done: 'kp_lq_king_quiz' }],
      heal,
      win('kp_lq_king_guard', 'kp_summit_2', ['goto', 'kp_lq_king_box'], ['talk', 'lq_king_guard', { done: 'kp_lq_king_guard' }]),
      heal,
      win('kp_legend_coh_kupoking', null, ['goto', 'kp_lq_king_box'], ['talk', 'lq_king_king', { done: 'kp_legend_coh_kupoking' }]),
    ]) };
  KP.QUESTS.chal = { name: 'Chalimog: Reserved', order: 15,
    // (every cup won; the title defended is the plan's first step, as a player wins it again to open the quest)
    ready: () => [1, 2, 3, 4, 5].every(n => FL()['kp_league_' + n]) && !FL().kp_legend_lq_chalimog,
    done: 'kp_lq_chal_done',
    plan: paced([
      ['js', defendTitle, { done: () => (VR().kp_lq_chal_wc || 0) >= 2 }],
      ['talk', 'coh_official', { map: 'kp_costa_arena', done: 'kp_lq_chal_open' }],
      ['use', 27, 20, { map: 'kp_bloomhaven', done: 'kp_lq_chal_m1' }],
      ['use', 18, 8, { map: 'kp_whisperwood_deep', done: 'kp_lq_chal_m2' }],
      ['use', 14, 1, { map: 'kp_crater_1', done: 'kp_lq_chal_m3' }],
      heal,
      win('kp_lq_chal_dyne', { train: 'kp_summit_2', gauntlet: 'chal' }, ['goto', 'kp_coliseum_hall'], ['walk', 11, 10, { done: 'kp_lq_chal_arrived' }], ['talk', 'lq_chal_dio', { done: 'kp_lq_chal_dyne' }]),
      heal,
      ...PED.map(([x, y], i) => ['use', x, y, { map: 'kp_lq_chal_vault', choose: CUPS[i].split(' ')[0], done: 'kp_lq_chal_p' + (i + 1) }]),
      win('kp_legend_lq_chalimog', null, ['goto', 'kp_lq_chal_vault'],
        ['talk', 'lq_chal_chalimog', { done: { any: ['kp_legend_lq_chalimog', '!kp_lq_chal_poured'] } }],   // (a rematch: it's back on the plinth)
        ['use', 7, 8, { done: { any: ['kp_legend_lq_chalimog', 'kp_lq_chal_poured'] } }]),
    ]) };
})();
