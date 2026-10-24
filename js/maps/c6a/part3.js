// Chapter 6a, part 3 — North Corel (Barret's cold welcome, the scrap-town shops, the ropeway and
// Barret's story of Corel), then the Gold Saucer: entrance & passes, Station Square (Barret walks
// off), Wonder Square (Cait Sith's fortune; arcade), Round, Chocobo, Speed, Ghost and Event Squares.
// The Battle Square massacre, Corel Prison and the chocobo race are in part 4.
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
(function () {
  const counter = (at, run) => ({ at, on: 'talk', run });
  // Gold Saucer points live in FF7.state.gp (the script API has no GP helpers).
  const GP = {
    get: () => (FF7.state && FF7.state.gp) || 0,
    add: (n) => { if (FF7.state) FF7.state.gp = Math.min(99999, Math.max(0, (FF7.state.gp || 0) + n)); },
    spend: (n) => { if (!FF7.state || (FF7.state.gp || 0) < n) return false; FF7.state.gp -= n; return true; },
  };
  function* giveGP(s, n) { if (n <= 0) return; GP.add(n); s.sfx('found'); yield s.msg(`Received ${n} GP!`); }
  // Minigame results: a number is a score; true/false is a win/loss.
  const score = (r, win, lose) => (typeof r === 'number' ? r : (r && typeof r === 'object' && typeof r.score === 'number' ? r.score : (r ? win : lose)));
  const payGil = function* (s, who, n) {
    if (s.takeGil(n)) return true;
    yield s.say(who, `Sorry, it's ${n} gil to play.`);
    return false;
  };
  function fallbackLink(loc, def) {
    FF7.world.link(loc, Object.assign({}, def, {
      c6aFallback: true,
      if: function (s) {
        const list = (FF7.world._links || {})[loc] || [];
        return !list.some(l => !l.c6aFallback && typeof l.if === 'function' && (function () { try { return l.if(s); } catch (e) { return false; } })());
      },
    }));
  }
  fallbackLink('north_corel', { map: 'ncorel_town', entry: 'from_world' });
  FF7.world.link('gold_saucer', { run: function* (s) { yield s.msg('The Gold Saucer towers above the desert on its great pillar.\nThe only way up is the ropeway from North Corel.'); } });

  // ------------------------------------------------------------------ North Corel
  const TOWN_LOOK = { floor: ['#8a7458', '#826c50'], floor2: ['#6a5a48', '#625242'], wall: '#7a6a58', trim: '#4a3a28', sky: ['#7a98c0', '#d8c8a8'] };
  const generalStore = function* (s) {
    const c = yield s.ask('Shopkeeper', "General store. Whatever you need to survive out here... if you can pay for it.", ['Items', 'Materia', 'Leave']);
    if (c === 0) yield s.shop('north_corel_general');
    else if (c === 1) yield s.shop('north_corel_materia');
  };
  const toolShop = function* (s) { yield s.say('Tool Seller', "Potions, Phoenix Downs, Tents. Buy somethin', or move along."); yield s.shop('north_corel_items'); };
  const weaponShop = function* (s) { yield s.say('Weapon Seller', "Scrap metal, mostly. But some of it still cuts. Take a look."); yield s.shop('north_corel_weapons'); };

  FF7.defineMap('ncorel_town', {
    name: 'North Corel', area: 'Corel', theme: 'town', music: 'mining', look: TOWN_LOOK,
    grid: [
      "XXXXXXXXXXXXXXXXXXXXrrXXXXXXXXXXXXXXXX",
      "hhwhhwhhhwhhhwhhhhhhrrhhhhwhhhhhh+hhhh",
      "h...x........o......rr......B.......xh",
      "h...................rr...............h",
      "h..AAA.......AAA.............AAA.....h",
      "h....................................h",
      "h..DDD.......DDD.............DDD.....h",
      "h...................x................h",
      "h.....o.......................B......h",
      "h......................x.............h",
      "h..x........................A........h",
      "h....................................h",
      "h....................................:",
      "h..........%.........................:",
      "h....................................:",
      "h...o................x...............h",
      "h....................................h",
      "hh::::hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh",
    ],
    entries: { from_mtcorel: [20, 2, 'down'], from_house: [33, 2, 'down'], from_world: [35, 13, 'left'], from_ropeway: [3, 16, 'up'] },
    exits: [
      { at: [20, 0, 2, 1], to: 'mtcorel_bridge', entry: 'from_ncorel' },
      { at: [33, 1, 1, 1], to: 'ncorel_house', entry: 'from_town', sfx: 'door' },
      { at: [37, 12, 1, 3], to: 'world', loc: 'north_corel' },
      { at: [2, 17, 4, 1], to: 'ncorel_ropeway', entry: 'from_town' },
    ],
    npcs: [
      { id: 'toolseller', name: 'Tool Seller', model: 'man7', at: [4, 5], dir: 'down', talk: toolShop },
      { id: 'storekeeper', name: 'Shopkeeper', model: 'woman9', at: [14, 5], dir: 'down', talk: generalStore },
      { id: 'weaponseller', name: 'Weapon Seller', model: 'worker4', at: [30, 5], dir: 'down', talk: weaponShop },
      { id: 'puncher', name: 'Man', model: 'man11', at: [24, 9], dir: 'left', show: s => s.flag('c6a_ncorel_arrival'),
        talk: function* (s) { yield s.say('Man', "What're you lookin' at? Your pal Barret's the reason we're livin' in this junkyard."); } },
      { id: 'bitter_woman', name: 'Woman', model: 'woman10', at: [16, 9], dir: 'down',
        talk: function* (s) { yield s.say('Woman', "Four years ago we had homes. Now look at us... selling scrap to rich folks on their way up to the Gold Saucer."); } },
      { id: 'elder', name: 'Old Man', model: 'oldman4', at: [8, 11], dir: 'right',
        talk: function* (s) { yield s.say('Old Man', "Corel was a coal town. Hard work, but we got by. Then Shinra came, sweet-talkin' about Mako... and some fool talked the whole town into it."); } },
      { id: 'witness', name: 'Man', model: 'man12', at: [27, 13], dir: 'left',
        talk: function* (s) { yield s.say('Man', "A fella in a black cape came through yesterday, draggin' his feet like a zombie.\fHad a tattoo on his arm, too. A number, I think. Gave me the creeps."); } },
      { id: 'kid', name: 'Boy', model: 'kid5', at: [12, 14], dir: 'up', wander: 2,
        talk: function* (s) { yield s.say('Boy', "You goin' to the Gold Saucer? Only rich people go there. We just watch the ropeway cars go by."); } },
    ],
    triggers: [counter([3, 6, 3, 1], toolShop), counter([13, 6, 3, 1], generalStore), counter([29, 6, 3, 1], weaponShop)],
    onEnter: function* (s) {
      if (s.flag('c6a_ncorel_arrival')) return;
      s.set('c6a_ncorel_arrival');
      // --- Barret's homecoming. A townsman punches him; he doesn't lift a finger.
      s.spawn('barret_ev', 'barret', 21, 2, 'down', { name: s.name('barret') });
      yield [s.move('player', 20, 5), s.move('barret_ev', 22, 5)];
      s.spawn('puncher_ev', 'man11', 25, 10, 'up', { name: 'Man' });
      yield s.move('puncher_ev', 23, 6);
      yield s.face('puncher_ev', 'barret_ev');
      yield s.face('barret_ev', 'puncher_ev');
      yield s.say('Man', "Well, well... look who came crawlin' back.");
      s.anim('puncher_ev', 'punch'); s.sfx('hit'); s.shake(3, 12);
      s.anim('barret_ev', 'hurt');
      yield 30;
      s.stopAnim('barret_ev');
      yield s.say('barret', "......");
      yield s.say('Man', "You got some nerve showin' your face here, Barret. After what you did to Corel.");
      yield s.move('puncher_ev', 25, 10);
      s.remove('puncher_ev');
      yield s.say('Woman', "Leave it. He ain't worth bruisin' your knuckles over.");
      if (s.inParty('tifa')) {
        yield s.say('tifa', "Barret! Why didn't you do anything?");
        yield s.say('barret', "...'Cause they got every right.");
      } else {
        yield s.face('player', 'barret_ev');
        yield s.say('cloud', "...Barret?");
      }
      yield s.say('barret', "Don't. ...I'll tell ya about it later. The ropeway to the Gold Saucer's at the bottom of town. Let's go.");
      yield s.move('barret_ev', [[22, 12], [4, 16]]);
      s.remove('barret_ev');
    },
  });

  FF7.defineMap('ncorel_house', {
    name: 'North Corel', area: 'Corel', theme: 'house', music: 'mining',
    look: { wall: '#8a7458', trim: '#4a3a28', floor: ['#6a5a48', '#625242'] },
    grid: [
      "##################",
      "#bb..k......q..jj#",
      "#................#",
      "#...t.c..........#",
      "#...t............#",
      "#................#",
      "########+#########",
    ],
    entries: { from_town: [8, 5, 'up'] },
    exits: [{ at: [8, 6, 1, 1], to: 'ncorel_town', entry: 'from_house', sfx: 'door' }],
    npcs: [
      { id: 'housewife', name: 'Woman', model: 'woman11', at: [14, 2], dir: 'left', wander: 1,
        talk: function* (s) { yield s.say('Woman', "Don't mind the mess. Everything we own, we dug out of the ashes."); } },
      { id: 'husband', name: 'Man', model: 'man13', at: [7, 4], dir: 'left',
        talk: function* (s) { yield s.say('Man', "I was a miner, same as my father. Now I patch up junk and sell it. Some life."); } },
    ],
    objects: [
      { at: [16, 1], if: s => !s.flag('c6a_ncorel_ether'),
        talk: function* (s) { s.set('c6a_ncorel_ether'); yield s.msg("There's something at the bottom of the pot!"); yield s.give('ether'); } },
    ],
  });

  // ------------------------------------------------------------------ the ropeway car
  // As in FF7 (06-goldsaucer01 and the opening of the Gold Saucer movie): the blue car hangs out past the platform's
  // railing over the drop, its wheels on two thick track ropes that run off into the distance, a steel gantry holding
  // them at the station's end. To ride, the party steps aboard at the gap in the railing and the car pulls out along
  // the ropes, propellers turning. c: { at (the car, tiles), dir (its nose: 'right' along x, 'down' along y; the door
  // is on its right flank), y0 (its base, m), from/to (the ropes' ends along its line), door (the gap in the railing),
  // board (the way into the car from there), leave (+1 / -1 along its line), gantry: { at, toward } }
  const ROPE_H = (2.92 + 0.16) * 0.72 + 0.022, ROPE_X = 0.2 * 0.72 / 0.5;   // over the car's base (m); either side of its line (tiles)
  const ropeway = (c) => {
    const alongX = c.dir === 'right' || c.dir === 'left', [ax, ay] = c.at, id = c.id || 'ropeway_car';
    const rope = (k) => Object.assign({ y0: c.y0, h: ROPE_H, sag: 0, r: 0.022, col: '#232326', count: 1, far: true },
      alongX ? { at: [c.from, ay + k * ROPE_X], to: [c.to, ay + k * ROPE_X] } : { at: [ax + k * ROPE_X, c.from], to: [ax + k * ROPE_X, c.to] });
    const g = c.gantry, reach = (alongX ? Math.abs(g.at[1] - ay) : Math.abs(g.at[0] - ax)) * 0.5;
    const props = [rope(-1), rope(1), { at: g.at, prop: 'ropegantry', toward: g.toward, reach, gap: ROPE_X, h: c.y0 + ROPE_H + 0.03 }];
    const car = { id, at: c.at, y0: c.y0, dir: c.dir, model: { vehicle: 'gondola', scale: 0.72 }, u: 0, v: 0,
      tick(o) {
        if (!o._model) return;
        if (!o.v) { o._model.play('idle'); return; }
        o.u += o.v; o.at = alongX ? [ax + o.u, ay] : [ax, ay + o.u]; o._model.play('move');
      } };
    // aboard and away: into the car at the gap in the railing, then it pulls out, gathering speed, until the fade
    const depart = function* (s) {
      const f = s.field, o = f && f.objects && f.objects.find(q => q.id === id);
      yield s.move('player', c.door[0], c.door[1]);
      yield s.face('player', c.board);
      s.sfx('door');
      yield 12;
      s.hide('player');
      yield 36;
      s.sfx('elevator');
      if (!o) { yield 60; return; }
      for (let i = 0; i < 150; i++) { o.v = c.leave * Math.min(0.13, 0.0012 * i); yield 1; }
    };
    // coming in: the car glides in along the ropes (from the way it leaves), easing to a stop at the dock, and the party
    // steps off through the gap in the railing onto the platform (c.land)
    const arrive = function* (s) {
      const f = s.field, o = f && f.objects && f.objects.find(q => q.id === id);
      if (!o) return;
      const D = 22, T = 200;
      s.hide('player');
      o.u = c.leave * D; o.at = alongX ? [ax + o.u, ay] : [ax, ay + o.u];
      s.sfx('elevator');
      for (let t = 0; t < T; t++) { const k0 = 1 - t / T, k1 = 1 - (t + 1) / T; o.v = c.leave * D * (k1 * k1 - k0 * k0); yield 1; }
      o.v = 0; o.u = 0; o.at = c.at;
      yield 24;
      s.sfx('door');
      s.show('player', c.door[0], c.door[1], c.out);
      yield 8;
      yield s.move('player', c.land[0], c.land[1]);
    };
    return { props, car, depart, arrive };
  };
  // North Corel: the car at the north edge of the station, nose east, the ropes running from the terminal house
  // out over the desert
  const NC_CAR = ropeway({ at: [9.45, 0.15], dir: 'right', y0: -0.15, from: 1.5, to: 70, door: [9, 2], board: 'up', out: 'down', land: [9, 3],
    leave: 1, gantry: { at: [5, 1.7], toward: 'n' } });
  // the Gold Saucer: at the east edge of the entrance, nose south, the ropes coming up out of the night
  const GS_CAR = ropeway({ at: [31.85, 7.45], dir: 'down', y0: -0.15, from: 1, to: 70, door: [30, 7], board: 'right', out: 'left', land: [29, 7],
    leave: 1, gantry: { at: [30.3, 3.2], toward: 'e' } });

  // ------------------------------------------------------------------ ropeway station
  FF7.story.c6a_rideUp = function* (s) {
    const c = yield s.ask('Attendant', "The ropeway to the Gold Saucer. All aboard?", ['Ride up', 'Not now']);
    if (c !== 0) return;
    if (s.field && s.field.map && s.field.map.id === 'ncorel_ropeway') yield* NC_CAR.depart(s);
    yield s.fadeOut(30);
    if (!s.flag('c6a_saw_saucer')) {
      s.set('c6a_saw_saucer');
      s.music('goldsaucer');
      yield s.movie('gold_saucer', { text: 'The ropeway car sways out over the Corel Desert.\nAhead, lit up like a festival in the night, rises the Gold Saucer —\nthe world\'s greatest amusement park, built on a giant pillar above the sands.' });
    } else {
      yield s.caption('The ropeway climbs out over the desert toward the Gold Saucer...', { hold: 100, bg: '#000' });
    }
    // Later chapters (e.g. the Keystone revisit) may reroute the ropeway: return [mapId, entry].
    const alt = typeof FF7.story.c6a_ropewayOverride === 'function' ? FF7.story.c6a_ropewayOverride(s) : null;
    if (alt && alt[0]) { yield s.goto(alt[0], alt[1]); return; }
    yield s.goto('gs_entrance', 'from_ropeway');
  };
  FF7.defineMap('ncorel_ropeway', {
    name: 'North Corel Ropeway', area: 'Corel', theme: 'town', music: 'mining',
    // ref 06-goldsaucer01: the station platform on the clifftop, open to the drop at the back; the blue car hangs out
    // past its railing on the ropes (NC_CAR), the sand of the desert far below
    look: TOWN_LOOK,
    props: NC_CAR.props.concat([{ at: [3, 1.7], prop: 'lamp' }, { at: [16, 1.7], prop: 'lamp' },
      { at: [12, -3.5], prop: 'farground', y0: -7, w: 90, d: 60 }]),
    objects: [NC_CAR.car],
    grid: [
      "hhh                     ",
      "hhh                     ",
      "hhh======.=============h",
      "hgggggggggggggg....B.o.h",
      "h......................h",
      "h...x........l.....x...h",
      "h......................h",
      "hhhhhhhhhh::::hhhhhhhhhh",
    ],
    entries: { from_town: [11, 6, 'up'], from_gs: [9, 3, 'down'] },
    exits: [{ at: [10, 7, 4, 1], to: 'ncorel_town', entry: 'from_ropeway' }],
    npcs: [
      { id: 'attendant', name: 'Attendant', model: 'worker5', at: [16, 3], dir: 'left', talk: FF7.story.c6a_rideUp },
    ],
    triggers: [counter([8, 1, 3, 1], FF7.story.c6a_rideUp)],
    onEnter: function* (s) {
      if (s.entry() === 'from_gs') yield* NC_CAR.arrive(s);   // (down from the Gold Saucer: the car comes in)
      if (s.flag('c6a_barret_story')) return;
      s.set('c6a_barret_story');
      // --- Barret's story of Corel.
      s.spawn('barret_ev', 'barret', 12, 3, 'up', { name: s.name('barret') });
      yield s.move('player', 11, 5);
      s.music('traitor');
      yield 30;
      yield s.say('barret', "...See the desert out past those mountains? That's where Corel used to be. My hometown.");
      yield s.face('barret_ev', 'player');
      yield s.say('barret', "Coal town. Dirty, hard work, but it was honest, and it fed us.\fThen Shinra shows up. Wants to build a Mako reactor up on the mountain. Says it'll make us all rich.");
      yield s.say('barret', "Some folks didn't trust 'em. Me? I figured coal was on its way out anyhow. I went around town talkin' everybody into sayin' yes.");
      yield s.say('barret', "...Then one day there's an explosion at the reactor. Shinra says it was sabotage. Says Corel did it.\fThey sent in soldiers. Burned the whole town to the ground. Everybody I ever knew...");
      yield s.say('barret', "The ones who made it out came up here and built what they could outta scrap.\fThey hate me, and they're right to. I sold 'em out for Shinra's pretty promises.");
      if (s.isMember('tifa')) yield s.say('tifa', "Barret... is that why you started AVALANCHE?");
      yield s.say('barret', "Heh. Don't go makin' me out to be some kinda hero.\f...C'mon. That ropeway's the only way up to the Gold Saucer. Sephiroth's trail leads there too, from what folks say.");
      yield s.say('cloud', "......");
      yield s.run('barret_ev', 12, 7);
      s.remove('barret_ev');
      s.music('mining');
    },
  });

  // ------------------------------------------------------------------ Gold Saucer: entrance
  const hasPass = s => s.flag('c6a_gs_pass') || s.has('gold_ticket');
  const ticketDesk = function* (s) {
    if (hasPass(s)) { yield s.say('Attendant', s.has('gold_ticket') ? "A Gold Ticket holder! Welcome back to the Gold Saucer, VIP!" : "Enjoy your day at the Gold Saucer!"); return; }
    const c = yield s.ask('Attendant', "Welcome to the Gold Saucer! You'll need a pass to enter.\fA 1-day pass is 3,000 gil. Or become a lifetime guest with a Gold Ticket for 30,000 gil!", ['1-day pass (3,000 gil)', 'Gold Ticket (30,000 gil)', 'No thanks']);
    if (c === 0) {
      if (!s.takeGil(3000)) { yield s.say('Attendant', "I'm sorry, you don't have enough gil. Please come again!"); return; }
      s.set('c6a_gs_pass');
      s.sfx('purchase');
      yield s.say('Attendant', "Here's your pass. Have a golden time!");
    } else if (c === 1) {
      if (!s.takeGil(30000)) { yield s.say('Attendant', "I'm sorry, you don't have enough gil. Please come again!"); return; }
      yield s.give('gold_ticket');
      yield s.say('Attendant', "Congratulations! From now on you can enter the Gold Saucer free of charge, forever!");
    }
  };
  FF7.defineMap('gs_entrance', {
    name: 'Gold Saucer Entrance', area: 'Gold Saucer', theme: 'goldsaucer', music: 'goldsaucer',
    // the save point just outside the gate costs 5 GP to use (Walkthrough {14}), paid at the point, per visit
    saveGp: 5,
    // the ropeway station and ticket gate; the same dark red and gold as the hub beyond the gate
    look: { floor: ['#6a1a2a', '#621828'], floor3: ['#4a2a62', '#44265a'], wall: '#4a2a5a', roof: '#2a1838' },
    camera: { pitch: 58, dist: 11 },
    // the ropeway car in from North Corel waits at the landing on the east side, hanging out past the railing over the
    // night on its ropes (GS_CAR; the same rig as at ncorel_ropeway), the ropes running into the terminal house behind.
    // (The open air east of it is map too, so the camera, kept inside the map, can follow the player out to the car.)
    props: GS_CAR.props,
    objects: [GS_CAR.car],
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX       ",
      "hhhNhhhhhhhhh++++hhhhhhhhNhhhhhhhh       ",
      "h.|........................|..=          ",
      "h.........................gggg=          ",
      "h.S................DDD....gggg=          ",
      "h.........................gggg=          ",
      "h.|.......................g|gg=          ",
      "h.........................gggg.          ",
      "h.........................gggg=          ",
      "h.........................gggg=          ",
      "hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh          ",
    ],
    lights: [[14, 2, '#ffe060', 5], [20, 4, '#ff80e0', 3], [29, 7, '#ffe0a0', 3]],
    entries: { from_ropeway: [29, 7, 'left'], from_station: [14, 2, 'down'] },
    exits: [
      { at: [13, 1, 4, 1], to: 'gs_station', entry: 'from_entrance', if: hasPass,
        blocked: function* (s) { yield s.say('Attendant', "Excuse me! You'll need a pass to enter. Please stop by the ticket counter!"); yield s.walk('player', 0, 1); } },
    ],
    npcs: [
      { id: 'ticket_girl', name: 'Attendant', model: { base: 'woman', top: '#e04090', sleeve: '#e04090', bottom: '#e04090', hair: '#f0d040', hairStyle: 'bun', skirt: 'short' }, at: [20, 3], dir: 'down', talk: ticketDesk },
      { id: 'ropeway_man', name: 'Attendant', model: 'worker6', at: [29, 4], dir: 'down',
        talk: function* (s) {
          const c = yield s.ask('Attendant', "The ropeway back down to North Corel. Leaving already?", ['Ride down', 'Stay']);
          if (c !== 0) return;
          s.unset('c6a_gs_pass');
          yield* GS_CAR.depart(s);
          yield s.fadeOut(30);
          yield s.caption('The ropeway glides back down toward North Corel...', { hold: 90, bg: '#000' });
          yield s.goto('ncorel_ropeway', 'from_gs');
        } },
      { id: 'mascot', name: 'Mascot', model: 'moogle', at: [7, 5], dir: 'down', wander: 2,
        talk: function* (s) { yield s.say('Mascot', "Kupo! Welcome to the Gold Saucer! Fun for everybody, kupo!"); } },
    ],
    triggers: [counter([19, 4, 3, 1], ticketDesk)],
    onEnter: function* (s) {
      if (s.entry() === 'from_ropeway') yield* GS_CAR.arrive(s);   // (up from North Corel: the car comes in)
    },
  });

  // ------------------------------------------------------------------ Station Square (hub)
  // As in FF7 (06-goldsaucer11): a round dark-red platform floating in the dark, with seven glowing
  // tube holes set in an arc along its north rim, each labelled on the floor in rainbow letters that run
  // from the hub out to the hole. Stepping into a hole drops you down the tube to that square; the
  // walkway south goes back to the ticket gate (gs_entrance). Holes (2x2 'e', glowing, walkable):
  // Chocobo [6,10], Event [7,6], Round [10,3], Speed [14,2], Battle [18,3], Ghost [21,6], Wonder [22,10].
  const tube = (to, entry) => ({ to, entry, sfx: 'jump' });
  FF7.defineMap('gs_station', {
    name: 'Station Square', area: 'Gold Saucer', theme: 'goldsaucer', music: 'goldsaucer',
    look: { floor: ['#5a1622', '#521420'], floor2: ['#3a3040', '#342a3a'], wall: '#3a2440', trim: '#e0c040', glow: '#ffc8e6' },
    camera: { pitch: 60, dist: 13 },
    grid: [
      "                              ",
      "           ::::::::           ",
      "         ::...ee...::         ",
      "        ::ee..ee..ee::        ",
      "       :..ee......ee..:       ",
      "      ::..............::      ",
      "      :ee............ee:      ",
      "     :.ee............ee.:     ",
      "     :..................:     ",
      "     :..................:     ",
      "     :ee..............ee:     ",
      "     :ee......uu......ee:     ",
      "     :..................:     ",
      "     :..................:     ",
      "     :..................:     ",
      "      :................:      ",
      "      ::..............::      ",
      "       :..............:       ",
      "        ::l........l::        ",
      "         ::........::         ",
      "           ::....::           ",
      "            =....=            ",
      "            =....=            ",
    ],
    lights: [[15, 11, '#ffe060', 3]],
    // the platform itself is one round disc (its skirt hides the tile edges below); the holes get
    // silver rims; the floor lettering is 3D geometry
    props: [
      { at: [14.5, 10.8], prop: 'disc', r: 10.9, h: 0.006, sides: 40, col: '#3a2440', top: '#56161f', rim: '#c8a040', rimW: 0.3, ring: '#4a121a', skirt: 2.4 },
      { at: [6.5, 10.5], prop: 'hole', r: 0.98 },
      { at: [7.5, 6.5], prop: 'hole', r: 0.98 },
      { at: [10.5, 3.5], prop: 'hole', r: 0.98 },
      { at: [14.5, 2.5], prop: 'hole', r: 0.98 },
      { at: [18.5, 3.5], prop: 'hole', r: 0.98 },
      { at: [21.5, 6.5], prop: 'hole', r: 0.98 },
      { at: [22.5, 10.5], prop: 'hole', r: 0.98 },
    ],
    labels: [
      { at: [9.33, 10.50], text: 'CHOCOBO', col: 'rainbow', shift: 0, glow: true, size: 0.26, rot: 0 },
      { at: [9.55, 7.67], text: 'EVENT', col: 'rainbow', shift: 1, glow: true, size: 0.26, rot: -30 },
      { at: [11.67, 5.55], text: 'ROUND', col: 'rainbow', shift: 2, glow: true, size: 0.26, rot: -60 },
      { at: [14.50, 4.86], text: 'SPEED', col: 'rainbow', shift: 3, glow: true, size: 0.26, rot: 90 },
      { at: [17.21, 5.75], text: 'BATTLE', col: 'rainbow', shift: 4, glow: true, size: 0.26, rot: 60 },
      { at: [19.45, 7.67], text: 'GHOST', col: 'rainbow', shift: 5, glow: true, size: 0.26, rot: 30 },
      { at: [19.91, 10.50], text: 'WONDER', col: 'rainbow', shift: 6, glow: true, size: 0.26, rot: 0 },
    ],
    entries: {
      from_chocobo: [9, 10, 'right'], from_event: [9, 8, 'down'], from_round: [12, 5, 'down'], from_speed: [14, 5, 'down'],
      from_battle: [17, 5, 'down'], from_ghost: [20, 8, 'down'], from_wonder: [20, 10, 'left'], from_entrance: [14, 21, 'up'],
    },
    exits: [
      Object.assign({ at: [6, 10, 3, 2] }, tube('gs_chocobo', 'from_station')),
      Object.assign({ at: [7, 6, 3, 2] }, tube('gs_event', 'from_station')),
      Object.assign({ at: [7, 6, 2, 3] }, tube('gs_event', 'from_station')),
      Object.assign({ at: [10, 3, 2, 3] }, tube('gs_round', 'from_station')),
      Object.assign({ at: [10, 3, 3, 2] }, tube('gs_round', 'from_station')),
      Object.assign({ at: [14, 2, 2, 3] }, tube('gs_speed', 'from_station')),
      { at: [18, 3, 2, 3], run: function* (s) {
          if (!s.flag('cait_joined')) yield* FF7.story.c6a_caitSith(s, 15, 6);
          s.sfx('jump');
          yield s.goto('gs_battle', 'from_station');
        } },
      { at: [17, 3, 3, 2], run: function* (s) {
          if (!s.flag('cait_joined')) yield* FF7.story.c6a_caitSith(s, 15, 6);
          s.sfx('jump');
          yield s.goto('gs_battle', 'from_station');
        } },
      Object.assign({ at: [20, 6, 3, 2] }, tube('gs_ghost', 'from_station')),
      Object.assign({ at: [21, 6, 2, 3] }, tube('gs_ghost', 'from_station')),
      Object.assign({ at: [21, 10, 3, 2] }, tube('gs_wonder', 'from_station')),
      { at: [13, 22, 4, 1], to: 'gs_entrance', entry: 'from_station' },
    ],
    npcs: [
      { id: 'guide', name: 'Guide', model: { base: 'woman', top: '#e04090', sleeve: '#e04090', bottom: '#e04090', hair: '#f0d040', hairStyle: 'bun', skirt: 'short' }, at: [17, 13], dir: 'down',
        talk: function* (s) {
          yield s.say('Guide', "Welcome to Station Square! From here the tubes take you anywhere in the park:\fWonder Square for games, the Battle Square for fighting, Speed Square's shooting coaster, the Chocobo Square races, the Ghost Hotel, Round Square's gondola, and Event Square's shows!");
        } },
      { id: 'couple_m', name: 'Man', model: 'man14', at: [10, 13], dir: 'right',
        talk: function* (s) { yield s.say('Man', "Some creepy guy in a black cape came through here earlier. The staff chased him out. Can't they keep the weirdos away from the rides?"); } },
      { id: 'couple_w', name: 'Woman', model: 'woman12', at: [11, 13], dir: 'left',
        talk: function* (s) { yield s.say('Woman', "We're going on the gondola tonight! Round Square has the best view of the fireworks."); } },
    ],
    objects: [
      { at: [14, 11], talk: function* (s) { yield s.msg('A towering golden statue of Dio, owner of the Gold Saucer, striking a heroic pose.'); } },
      { at: [15, 11], talk: function* (s) { yield s.msg('A towering golden statue of Dio, owner of the Gold Saucer, striking a heroic pose.'); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c6a_barret_left')) return;
      s.set('c6a_barret_left');
      // --- Barret can't stand the noise and walks off on his own.
      s.spawn('barret_ev', 'barret', 15, 20, 'up', { name: s.name('barret') });
      yield s.move('player', 14, 17);
      yield s.face('player', 'barret_ev');
      yield s.say('barret', "...Lights, music, everybody laughin' like nothin's wrong in the world.\fI ain't in the mood for this. Y'all go on and have your fun.");
      yield s.run('barret_ev', [[15, 16], [18, 6], [18, 5]]);
      s.remove('barret_ev');
      s.leave('barret');
      yield s.say('cloud', "Barret...!");
      if (s.isMember('tifa')) yield s.say('tifa', "Let him go, Cloud. After North Corel... he needs some time alone.");
      // FF7: the others split up to look around; Cloud asks one of them along. Date points: only the first
      // answer to Aeris, Tifa or Yuffie counts: going together +3, turning her down -2. Red XIII scores
      // nothing either way (turning him down leaves the others open; taking him ends it). If Cloud turns
      // everyone down, the one with the highest affection comes anyway (Red XIII if that is Barret).
      const pals = ['tifa', 'aeris', 'redxiii', 'yuffie'].filter(id => s.isMember(id));
      if (!pals.length) return;
      const ASK = { aeris: "Hey, {CLOUD}! Want to go around together?", tifa: "{CLOUD}... do you want to look around together?",
        yuffie: "Yo! You wanna hang out with me? C'mon, it'll be fun!", redxiii: "...Shall I accompany you?" };
      const YES = { aeris: "Yay! Let's ride everything! Every. Single. Thing!", tifa: "...Okay. It's been a long time since we just had fun, hasn't it?",
        yuffie: "Heh, good choice! Stick with me and I'll show you where the good prizes are!", redxiii: "...Very well. I confess I am curious about what humans call 'fun'." };
      const NO = { aeris: "Aww... Okay. Maybe later, then.", tifa: "...Oh. Okay. Never mind.", yuffie: "Hmph! Your loss!", redxiii: "As you wish." };
      const scores = id => id !== 'redxiii';
      const left = pals.slice();
      let pal = null, counted = false;
      while (!pal && left.length) {
        const DPA = left.map(id => (!counted && scores(id)) ? { [id]: 3 } : {});
        const i = yield s.ask('cloud', "(Everyone's splitting up to look around... Who should I ask along?)", left.map(id => s.name(id)), { date: DPA });
        const who = left[i] || left[0];
        const DP = (!counted && scores(who)) ? [{ [who]: 3 }, { [who]: -2 }] : [{}, {}];
        const ok = yield s.ask(who, ASK[who], ["Let's go together.", 'Maybe not.'], { date: DP });
        FF7.story.datePts(s, DP[ok]);
        if (scores(who)) counted = true;
        if (ok === 0) pal = who; else { yield s.say(who, NO[who]); left.splice(left.indexOf(who), 1); }
      }
      if (pal) yield s.say(pal, YES[pal]);
      else {
        const top = ['aeris', 'tifa', 'yuffie', 'barret'].filter(id => id === 'barret' || pals.includes(id))
          .sort((a, b) => FF7.story.affection(b) - FF7.story.affection(a))[0];
        pal = pals.includes(top) ? top : (pals.includes('redxiii') ? 'redxiii' : pals[0]);
        yield s.say(pal, "...Looks like it's you and me, then. Come on.");
      }
      s.party(['cloud', pal]);
    },
  });

  // ------------------------------------------------------------------ Cait Sith
  FF7.story.c6a_caitSith = function* (s, x = 16, y = 5) {
    s.set('cait_joined');
    s.music('caitsith');
    s.spawn('caitsith_ev', 'caitsith', x + 4, y + 1, 'left', { name: 'Cait Sith' });
    yield s.move('caitsith_ev', x + 1, y + 1);
    yield s.face('player', 'caitsith_ev');
    yield s.say('Cait Sith', "Hold it right there, you with the spiky hair! Aye, you!\fThe name's Cait Sith. Fortune tellin's my game! How about I tell yours, eh? No charge!");
    yield s.say('cloud', "...Go ahead.");
    s.anim('caitsith_ev', 'cast');
    yield 50;
    yield s.msg('Cait Sith dances around... A strip of paper pops out!');
    yield s.say('Cait Sith', "Let's see, let's see... 'What you seek, you shall find. But to reach it, you will lose something dear to you.'");
    yield s.say('cloud', "...What's that supposed to mean?");
    yield s.say('Cait Sith', "Hmm, that's no good. Hang on, lemme try that again!");
    s.anim('caitsith_ev', 'cast');
    yield 50;
    yield s.say('Cait Sith', "...Same thing again?! Well, I never. In all my years, I've never had a reading like this.\fThat settles it! I've gotta see how this turns out. I'm comin' with you!");
    yield s.say('cloud', "...Don't.");
    yield s.say('Cait Sith', "Too late! My mind's made up. You won't be sorry!");
    s.remove('caitsith_ev');
    yield s.nameEntry('caitsith');
    s.join('caitsith');
    yield s.msg(`${s.name('caitsith')} joined the party.`);
    yield s.giveMateria('manipulate');
    s.music('goldsaucer');
  };

  // ------------------------------------------------------------------ Wonder Square
  const superDunk = function* (s) {
    const c = yield s.ask(null, 'SUPER DUNK — 200 gil. Sink shots for 1 GP each!', ['Play', 'No']);
    if (c !== 0 || !(yield* payGil(s, 'Attendant', 200))) return;
    const r = yield s.minigame('darts', { variant: 'super_dunk', title: 'Super Dunk' });
    const hits = Math.min(300, Math.max(0, Math.round(score(r, 10, 0))));
    if (hits <= 0) { yield s.msg('No baskets... Better luck next time!'); return; }
    yield* giveGP(s, hits);
  };
  const gBike = function* (s) {
    const c = yield s.ask(null, "G-BIKE — 200 gil. Protect the car from the bikers!", ['Play', 'No']);
    if (c !== 0 || !(yield* payGil(s, 'Attendant', 200))) return;
    const r = yield s.minigame('motorcycle', { mode: 'gbike' });
    const pts = score(r, 10000, 0);
    yield s.msg(`Score: ${pts} points.`);
    yield* giveGP(s, pts >= 10000 ? 10 : 2);
    if (pts >= 10000 && !s.flag('c6a_gbike_prize')) { s.set('c6a_gbike_prize'); yield s.give('speed_source'); }
  };
  // Wonder Catcher (js/minigames/wonder_games.js 'catcher'): steer the claw over a plush and drop it. Each plush is a
  // prize: Moogle a Potion, Cactuar 1 GP, Chocobo 3 GP, Cait Sith a Phoenix Down, Tonberry a Megalixir, the Gold
  // Chocobo 80 GP (the heavier the plush, the surer the grip has to be)
  const CATCHER_PRIZES = { moogle: ['item', 'potion'], cactuar: ['gp', 1], chocobo: ['gp', 3], cait: ['item', 'phoenix_down'], tonberry: ['item', 'megalixir'], gold: ['gp', 80] };
  const catcher = function* (s) {
    const c = yield s.ask(null, 'WONDER CATCHER — 100 gil. Grab a plush!', ['Play', 'No']);
    if (c !== 0 || !(yield* payGil(s, 'Attendant', 100))) return;
    const r = yield s.minigame('catcher', {});
    const got = r && r.won && CATCHER_PRIZES[r.prize];
    if (!got) { yield s.msg('The claw comes up empty... Better luck next time!'); return; }
    yield s.msg(`A ${r.name} plush drops into the chute!`);
    if (got[0] === 'gp') yield* giveGP(s, got[1]); else yield s.give(got[1]);
  };
  // Mog's House (js/minigames/mog_house.js 'mog_house'): a visual novel - Mog's week before the Festival of Stars,
  // five endings. Wings of Love or Kupo Forever wins (the fan's 30 GP: c6a_mog_cleared). Var mog_endings: the endings
  // seen (bits), shown on the machine
  const mogHouse = function* (s) {
    const seen = s.get('mog_endings') || 0, n = [0, 1, 2, 3, 4].filter(i => seen & (1 << i)).length;
    const c = yield s.ask(null, "MOG'S HOUSE — 100 gil. A moogle love story." + (n ? ` (Endings found: ${n} / 5)` : ''), ['Play', 'No']);
    if (c !== 0 || !(yield* payGil(s, 'Attendant', 100))) return;
    const r = yield s.minigame('mog_house', {});
    if (!r || typeof r !== 'object') return;
    if (r.endings) s.setVar('mog_endings', seen | r.endings);
    if (r.won && !s.flag('c6a_mog_cleared')) { s.set('c6a_mog_cleared'); yield s.msg('What a story... Somewhere nearby, someone is sniffling.'); }
  };
  // 3-D Battler (js/minigames/wonder_games.js 'battler'): five fighters, one round each; GP by how many fall
  // (3, 30, 100, and 300 for all five)
  const battler = function* (s) {
    const c = yield s.ask(null, '3-D BATTLER — 200 gil. Five fighters. Read the height, guard, and hit back!', ['Play', 'No']);
    if (c !== 0 || !(yield* payGil(s, 'Attendant', 200))) return;
    const r = yield s.minigame('battler', {});
    const beaten = (r && r.beaten) || 0;
    yield s.msg(beaten >= 5 ? 'All five fighters down! CHAMPION!' : `${beaten} fighter${beaten === 1 ? '' : 's'} down.`);
    yield* giveGP(s, (r && r.gp) || 0);
  };
  // The Crystal Fortune booth (50 gil), a reading worth the coin: the ball's glow is the fortune's rank (a Great Blessing
  // or a Blessing leaves a gift in the tray), a reading that doesn't repeat until the deck runs out (var fortune_seen,
  // a bit per reading), and a vision of something real: treasure still lying on a map you've been to (state.mapsSeen),
  // the road ahead (the Hints objective) or a Gold Saucer secret (var fortune_tips).
  const FORTUNE_RANKS = [
    { name: 'Great Blessing', glow: 'gold', w: 10, gift: ['ether', 'phoenix_down', 'hi_potion'] },
    { name: 'Blessing', glow: 'rose', w: 30, gift: ['potion'] },
    { name: 'Small Blessing', glow: 'silver', w: 40 },
    { name: 'Uncertain', glow: 'cloudy grey', w: 20 },
  ];
  const FORTUNES = [   // [rank, reading]
    [0, 'The stars line up for you tonight. Whatever you try, try it now.'], [0, 'An old debt will be paid back twice over.'],
    [0, 'Someone you have not met yet will change everything. Be kind to strangers.'], [0, 'Your luck is overflowing. Spend some of it at the chocobo races.'],
    [0, 'The one you are thinking of is thinking of you, too.'], [0, 'You will stand where few have stood, and walk away smiling.'],
    [1, 'A small risk brings a big reward. Take the long way round.'], [1, 'Good news travels by air. Look up now and then.'],
    [1, 'Your friends are stronger than they look. Lean on them.'], [1, 'Patience wins the jackpot. The claw will grab it... eventually.'],
    [1, 'A lost thing returns to you in an unexpected place.'], [1, 'Laughter is your shield this week. Use it often.'],
    [1, 'The road is rough, but the company is good.'], [1, 'Say what you mean. The right person is listening.'],
    [2, 'Mind your wallet. Every door in the Gold Saucer wants a coin.'], [2, 'Rest before the big fight. Inns are cheaper than Phoenix Downs.'],
    [2, 'A quiet day is still a good day.'], [2, 'Someone close is hiding a kind secret. Let them tell it in their own time.'],
    [2, 'Check behind you. Treasure is shy.'], [2, 'Eat something green today. Even chocobos do.'],
    [2, 'Your next chocobo race: bet on the one that looks bored.'], [2, 'Good things come to those who read every sign.'],
    [3, 'The crystal is foggy. Ask again after a good night\'s sleep.'], [3, 'Beware of men in dark suits with nice manners.'],
    [3, 'A storm is gathering. Carry an umbrella... and an Ether.'], [3, 'Not every door should be opened. Some should be kicked.'],
    [3, 'The past is louder than the present. Try to listen to both.'], [3, 'Something is watching from very far away. Don\'t stare back.'],
  ];
  const FORTUNE_TIPS = [   // Gold Saucer secrets (all true of this Gold Saucer)
    'Super Dunk: let go when the ball is at the very top of its arc. Not before, not after.',
    'The Wonder Catcher: the Gold Chocobo at the back pays 80 GP, but it only holds on if the claw comes down almost dead centre.',
    "Mog's House has five endings. Mog-Mog loves a Moogle who can fly, and a full belly is no help in the air.",
    'The 3-D Battler: guard HIGH, MID or LOW as the attack winds up, then strike back. Beat all five for 300 GP.',
    'Arm wrestling: the faster you alternate the two buttons, the harder you push. The big fellow surges, so keep going.',
    'Condor Command: clear all ten stages and Endless opens. The cabinet remembers your best round.',
    'The prize counter\'s mystery item, the "????", is a nut chocobo breeders dream of.',
    "Stealing never fails, but which of a foe's treasures you take is luck of the draw.",
    'A Gold Ticket lets you in and out of the Gold Saucer forever. The prize counter has one for 300 GP.',
  ];
  // the areas you can still get back to: the maps reached from the world map's entrances through exits and scripted
  // doors (the ropeway), each widened to its whole area (the Gold Saucer's tubes, Junon's elevators). Places left for
  // good - Disc 1 Midgar, the cargo ship, the Temple of the Ancients, the flashbacks - never qualify.
  function reachableAreas(s) {
    if (!FF7.world || !FF7.world.linkFor || !FF7.data.world) return null;
    const ok = (o) => { if (!o.if) return true; try { return !!o.if(s); } catch (e) { return false; } };
    const gotos = (fn) => typeof fn === 'function' ? [...fn.toString().matchAll(/goto\(\s*'([a-z0-9_]+)'/g)].map(m => m[1]).filter(id => FF7.maps[id]) : [];
    const q = [];
    for (const L of FF7.data.world.locations) { const l = FF7.world.linkFor(L.id, s); if (l && l.map && FF7.maps[l.map]) q.push(l.map); }
    const seen = new Set(q);
    while (q.length) {
      const m = FF7.maps[q.shift()], next = [];
      (m.exits || []).forEach(e => { if (e.to && !e.blocked && FF7.maps[e.to] && ok(e)) next.push(e.to); });
      [...(m.triggers || []), ...(m.objects || []), ...(m.npcs || [])].forEach(t => { if (ok(t)) next.push(...gotos(t.run || t.talk)); });
      next.forEach(id => { if (!seen.has(id)) { seen.add(id); q.push(id); } });
    }
    return new Set([...seen].map(id => FF7.maps[id].area).filter(Boolean));
  }
  function fortuneTreasure(s) {   // the things still lying on maps you have been to and can get back to
    const st = FF7.state, seen = st.mapsSeen || {}, out = [], areas = reachableAreas(s);
    if (!areas) return out;
    for (const id of Object.keys(seen)) {
      const m = FF7.maps[id]; if (!m || !m.name || !areas.has(m.area)) continue;
      [...(m.items || []), ...(m.chests || [])].forEach(o => {
        if (!o.id || o.if || st.flags['got_' + o.id]) return;
        const what = o.materia ? ((FF7.data.materia[o.materia] || {}).name || o.materia) + ' Materia' : o.item ? FF7.util.itemName(o.item) : o.gil ? o.gil + ' gil' : null;
        if (what) out.push({ id: o.id, map: m.name, what, chest: !!(m.chests || []).includes(o) });
      });
    }
    return out;
  }
  const fortune = function* (s) {
    const CB = FF7.story.caitBooth;   // (Cait Sith's hideout: js/maps/extra/cait_hideout.js)
    if (CB && CB.atSwitch && CB.atSwitch(s)) { yield* CB.useSwitch(s); return; }   // (its hidden switch, from the left)
    if (CB && CB.outOfOrder(s)) { yield s.msg('The Crystal Fortune is dark, and still smoking a little. A note is taped to the glass:"OUT OF ORDER. BACK SOON. NO PEEKING. -C.S."'); return; }
    const c = yield s.ask(null, 'CRYSTAL FORTUNE — 50 gil. "Your fortune, your luck, and a glimpse of something true."', ['Tell my fortune', 'No']);
    if (c !== 0 || !(yield* payGil(s, 'Attendant', 50))) return;
    s.sfx('ching');
    if (CB && CB.ready(s) && CB.bump(s) >= 10) { yield* CB.breakDown(s); return; }
    // the rank, and a reading of that rank not yet seen
    let roll = Math.random() * 100, r = 0;
    while (r < FORTUNE_RANKS.length - 1 && (roll -= FORTUNE_RANKS[r].w) >= 0) r++;
    const rank = FORTUNE_RANKS[r];
    let seen = s.get('fortune_seen') || 0;
    let pool = FORTUNES.map((f, i) => i).filter(i => FORTUNES[i][0] === r && !(seen & (1 << i)));
    if (!pool.length) { FORTUNES.forEach((f, i) => { if (f[0] === r) seen &= ~(1 << i); }); pool = FORTUNES.map((f, i) => i).filter(i => FORTUNES[i][0] === r); }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    s.setVar('fortune_seen', seen | (1 << pick));
    yield s.msg(`The crystal ball swirls... and glows ${rank.glow}.\f${rank.name}!\f"${FORTUNES[pick][1]}"`);
    // the vision: treasure left behind, the road ahead, or a secret
    const loot = fortuneTreasure(s), road = FF7.qol && FF7.qol.objective ? FF7.qol.objective() : null;
    const kinds = [loot.length && 'loot', road && 'road', 'tip'].filter(Boolean);
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    if (kind === 'loot') {
      const fresh = loot.filter(t => t.id !== s.get('fortune_loot')), from = fresh.length ? fresh : loot;   // (not the last one shown)
      const t = from[Math.floor(Math.random() * from.length)];
      s.setVar('fortune_loot', t.id);
      yield s.msg(`A vision forms in the glass...\f${t.chest ? 'A chest nobody has opened' : 'Something nobody has picked up'}, in ${t.map}.\fIt holds ${t.what}.`);
    } else if (kind === 'road') {
      yield s.msg(`A vision forms in the glass... the road ahead.\f"${road}"`);
    } else {
      let tips = s.get('fortune_tips') || 0;
      if (FORTUNE_TIPS.every((t, i) => tips & (1 << i))) tips = 0;
      const left = FORTUNE_TIPS.map((t, i) => i).filter(i => !(tips & (1 << i))), k = left[Math.floor(Math.random() * left.length)];
      s.setVar('fortune_tips', tips | (1 << k));
      yield s.msg(`A vision forms in the glass... a secret of the Gold Saucer.\f"${FORTUNE_TIPS[k]}"`);
    }
    if (rank.gift) {
      const id = rank.gift[Math.floor(Math.random() * rank.gift.length)];
      yield s.msg('Something rattles down into the tray...');
      yield s.give(id);
    }
    if (CB && CB.ready(s)) yield* CB.warn(s);
  };
  // Arm wrestling (js/minigames/wonder_games.js 'arm_wrestle'): a match at the Wrestler's table, the Sumo Wrestler
  // (easy) or the Wrestler himself (medium): alternate two buttons to force the fist down
  const armWrestle = function* (s) {
    const c = yield s.ask('Wrestler', "Arm wrestling! 100 gil a match. Who ya wanna take on?", ['Sumo Wrestler (easy)', 'Wrestler (medium)', 'No thanks']);
    if (c > 1 || !(yield* payGil(s, 'Wrestler', 100))) return;
    const r = yield s.minigame('arm_wrestle', { foe: c === 0 ? 'sumo' : 'wrestler', player: s.leader ? s.leader() : 'cloud' });
    if (r && r.won) { yield s.say('Wrestler', c === 0 ? "Whoa, you put him down! Not bad!" : "...Ugh. You got me. You're stronger than you look!"); yield* giveGP(s, c === 0 ? 1 : 2); }
    else yield s.say('Wrestler', "Slam! Ha! Come back when you've been eatin' your greens.");
  };
  const prizeCounter = function* (s) {
    const list = [['potion', 1], ['ether', 20], ['x_potion', 80], ['turbo_ether', 100], ['gold_ticket', 300], ['carob_nut', 500]];
    const label = ([id, gp]) => `${id === 'carob_nut' ? '????' : FF7.util && FF7.util.itemName ? FF7.util.itemName(id) : id} (${gp} GP)`;
    const c = yield s.ask('Prize Clerk', `Exchange your GP for prizes! You have ${GP.get()} GP.`, list.map(label).concat(['Leave']));
    if (c >= list.length) return;
    const [id, cost] = list[c];
    if (id === 'gold_ticket' && s.has('gold_ticket')) { yield s.say('Prize Clerk', "You already have a Gold Ticket, silly!"); return; }
    if (!GP.spend(cost)) { yield s.say('Prize Clerk', "Oops, not enough GP! Try Super Dunk, it's great for GP!"); return; }
    yield s.give(id);
  };
  // Condor Command (not in the PS1 game): Fort Condor's battles as an arcade game (js/minigames/fort_condor.js,
  // 'condor_command'). 200 gil a play. Ten stages in order, each with its own troop budget (the player's Gil is never
  // spent on troops), then Endless. GP for every clear (replays: half); prizes the first time stages 5 and 10 fall.
  // Vars: cc_cleared (stages cleared, in order), cc_best (Endless: most rounds held)
  const CC_PRIZES = { 5: ['turbo_ether', 2], 10: ['megalixir', 1] };
  const condorCommand = function* (s) {
    const ST = FF7.minigames.condorStages || [], N = ST.length;
    const cleared = s.get('cc_cleared') || 0, best = s.get('cc_best') || 0;
    const next = Math.min(cleared + 1, N);
    const head = `CONDOR COMMAND — 200 gil. Hold the fort! Stages cleared: ${cleared}/${N}.` + (cleared >= N ? ` Endless best: ${best} round${best === 1 ? '' : 's'}.` : '');
    const opts = [], acts = [];
    if (cleared < N) { opts.push(`Stage ${next}: ${ST[next - 1].name}`); acts.push(['stage', next]); }
    if (cleared > 0) { opts.push('Replay a stage'); acts.push(['replay']); }
    if (cleared >= N) { opts.push('Endless'); acts.push(['endless']); }
    opts.push('No'); acts.push(['no']);
    let act = acts[yield s.ask(null, head, opts)] || ['no'];
    if (act[0] === 'replay') {   // (the cleared stages, five to a page)
      let page = 0;
      for (;;) {
        const from = page * 5 + 1, to = Math.min(cleared, from + 4), list = [];
        for (let k = from; k <= to; k++) list.push(k);
        const more = cleared > to, c = yield s.ask(null, 'Which stage?', list.map(k => `Stage ${k}: ${ST[k - 1].name}`).concat(more ? ['More...'] : [], ['Back']));
        if (c < list.length) { act = ['stage', list[c]]; break; }
        if (more && c === list.length) { page++; continue; }
        return;
      }
    }
    if (act[0] === 'no') return;
    if (!(yield* payGil(s, 'Attendant', 200))) return;
    const r = yield s.minigame('condor_command', act[0] === 'endless' ? { endless: true } : { stage: act[1] });
    if (!r || typeof r !== 'object') return;
    if (act[0] === 'endless') {
      if (r.rounds > best) { s.setVar('cc_best', r.rounds); yield s.msg(`A new record: ${r.rounds} round${r.rounds === 1 ? '' : 's'} held!`); }
      yield* giveGP(s, r.gp || 0);
      return;
    }
    const n = act[1];
    if (!r.won) { yield s.msg('The fort fell... Try again!'); return; }
    const first = n > cleared;
    if (first) s.setVar('cc_cleared', n);
    yield* giveGP(s, first ? r.gp : Math.floor(r.gp / 2));
    if (first && CC_PRIZES[n]) yield s.give(CC_PRIZES[n][0], CC_PRIZES[n][1]);
    if (first && n === N) yield s.msg('Every stage cleared! Endless mode is open on the cabinet.');
  };
  // Wonder Square: a real arcade hall. The arcade floor (paired cabinets along the north wall, back-to-back islands,
  // arm wrestling, the prize counter), the Wonder Cafe in the south-west (a counter, tables with meals, diners), and
  // Wonder Lanes, a four-lane bowling alley in the east where the bowlers really bowl (the ball rolls, the pins fall,
  // bowlingLoop). People play, watch, walk, eat and bowl. Every cabinet has a twin: one for the player, one taken.
  // Mog's House is the back wall's last pair (24-25, 2); Condor Command fills the island by the cafe (4-5, 7-8).
  // Snowboard (5-6, 2) opens on Disc 2 and Torpedo Attack (13-14, 2) with the submarine (js/maps/c12/part4.js)
  const LANES = [{ x: 30, bowler: 'bowl1', col: '#2a40c0' }, { x: 33, bowler: 'bowl2', col: '#c02828' }, { x: 36, bowler: 'bowl3', col: '#28a048' }, { x: 39, bowler: 'bowl4', col: '#8a28c0' }];
  function* bowlingLoop(s) {
    const f = s.field; if (!f || !f.objects) return;
    const obj = (id) => f.objects.find(o => o.id === id);
    const st = LANES.map((L, i) => ({ L, t: 0, wait: 60 + i * 120, phase: 'wait' }));
    for (;;) {
      for (const k of st) {
        const L = k.L, ball = obj('ball' + L.x), pins = obj('pins' + L.x);
        if (!ball || !pins) continue;
        k.t++;
        if (k.phase === 'wait' && k.t >= k.wait) {   // the throw: the bowler's release, the ball on its way
          k.phase = 'roll'; k.t = 0; k.curve = (Math.random() - 0.5) * 0.5;
          s.anim(L.bowler, 'kneel'); ball.prop = 'bowlball'; ball.col = L.col; delete ball._mesh;
        } else if (k.phase === 'roll') {
          const u = Math.min(1, k.t / 110);
          ball.at = [L.x + 0.5 + Math.sin(u * Math.PI) * k.curve, 15.4 - u * 12.9];
          if (k.t === 26) s.stopAnim(L.bowler);
          if (u >= 1) {   // the pins go down; a strike, or not
            ball.prop = null; delete ball._mesh; pins.down = true; delete pins._mesh;
            k.phase = 'react'; k.t = 0; s.anim(L.bowler, Math.random() < 0.45 ? 'fistpump' : 'lookdown');
          }
        } else if (k.phase === 'react' && k.t >= 120) {
          pins.down = false; delete pins._mesh; s.stopAnim(L.bowler);
          k.phase = 'wait'; k.t = 0; k.wait = 180 + Math.floor(Math.random() * 320);
        }
      }
      yield 1;
    }
  }
  // the Wonder Cafe's cooks: a sample of the day's special (on the house, for Gold Saucer guests)
  const cafe = function* (s) {
    const c = yield s.ask('Cook', "Welcome to the Wonder Cafe! Samples are on the house today. What'll it be?", ['Chocobo Burger', 'Moogle Parfait', 'Kupo Shake', 'Nothing, thanks']);
    if (c > 2) { yield s.say('Cook', "Come back when you're hungry!"); return; }
    s.sfx('item');
    yield s.say('Cook', ["One Chocobo Burger! Don't worry, it's made of greens. Mostly.", 'One Moogle Parfait, extra pom-pom on top!', 'One Kupo Shake! Kupo Nut flavour, the only flavour.'][c]);
    yield s.msg(['Crunchy, sweet and a little bit green. Not bad at all.', 'It wobbles. It tastes like a cloud.', 'Nutty, cold, and gone in three sips.'][c]);
  };
  const line = (who, text) => function* (s) { yield s.say(who, text); };
  const ARCADE_LOOK = { floor: ['#9a3a8a', '#923484'], floor2: ['#e8c860', '#e0c058'], floor3: ['#2a3a8a', '#263482'] };
  FF7.defineMap('gs_wonder', {
    name: 'Wonder Square', area: 'Gold Saucer', theme: 'goldsaucer', music: 'goldsaucer',
    look: ARCADE_LOOK,
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "hhhNhhhhhNhhhhhNhhhhhhhhhhhNhhhhhNhhhhhNhhhhhh",
      "h.MM.MM..MM..MM..MM.....MM..=QLLQLLQLLQLLQ...h",
      "h........KK.................=QLLQLLQLLQLLQ...h",
      "h...........................=QLLQLLQLLQLLQ.%.h",
      "h...........................=QLLQLLQLLQLLQ...h",
      "h...........................=QLLQLLQLLQLLQ...h",
      "h...MM....MMM...............=QLLQLLQLLQLLQ...h",
      "h...MM....MMM.....t.........=QLLQLLQLLQLLQ.%.h",
      "h...........................=QLLQLLQLLQLLQ...h",
      "h......................DDD..=QLLQLLQLLQLLQ...h",
      "h...........................=QLLQLLQLLQLLQ...h",
      "h...........................=QLLQLLQLLQLLQWWWh",
      "h...........................=QLLQLLQLLQLLQ...h",
      "h....%..%..%................=QLLQLLQLLQLLQ...h",
      "h::F::::::::VV...............QLLQLLQLLQLLQ%.%h",
      "h::F:CTC:CTC::...............___B__B__B______h",
      "h::F::::::::::...............________________h",
      "h::F::::::::::...............________________h",
      "h::F:CTC:CTC::..............._bb_bb_bb_bb____h",
      "h:::::::::::::...............________________h",
      "h::::::CTC::::...............________________h",
      "h:::::::::::::...............________________h",
      "hhhhhhhhhhhhhh++hhhhhhhhhhhhhhhhhhhhhhhhhhhhhh",
    ],
    legend: { K: 'block', L: 'lane', Q: 'lanecap', B: 'ballreturn', F: 'cafecounter', T: 'cafetable', C: 'cafechair', V: 'cafevending', b: 'bowlchair', W: 'bowldesk' },
    lights: [[6, 5, '#40e0ff', 3], [16, 5, '#ff60c0', 3], [24, 9, '#ffe060', 3], [25, 4, '#ffb0e0', 2.5], [7, 18, '#ffd090', 3.5], [35, 9, '#80c0ff', 4], [35, 18, '#ffb0ff', 3.5], [43, 11, '#ff80c0', 2]],
    props: [
      { at: [2, 2], prop: 'arcade', game: 'super_dunk' },
      { at: [3, 2], prop: 'arcade', game: 'super_dunk' },
      { at: [5, 2], prop: 'arcade', game: 'snowboard' },
      { at: [6, 2], prop: 'arcade', game: 'snowboard' },
      { at: [9, 2], prop: 'arcade', game: 'g_bike' },
      { at: [10, 2], prop: 'arcade', game: 'g_bike' },
      { at: [13, 2], prop: 'arcade', game: 'torpedo' },
      { at: [14, 2], prop: 'arcade', game: 'torpedo' },
      { at: [17, 2], prop: 'arcade', game: 'battler' },
      { at: [18, 2], prop: 'arcade', game: 'battler' },
      { at: [24, 2], prop: 'arcade', game: 'mog_house' },
      { at: [25, 2], prop: 'arcade', game: 'mog_house' },
      { at: [4, 7], prop: 'arcade', game: 'condor', rot: 180 },
      { at: [5, 7], prop: 'arcade', game: 'condor', rot: 180 },
      { at: [4, 8], prop: 'arcade', game: 'condor' },
      { at: [5, 8], prop: 'arcade', game: 'condor' },
      { at: [10, 7], prop: 'arcade', game: 'catcher', rot: 180 },
      { at: [11, 7], prop: 'arcade', game: 'catcher', rot: 180 },
      { at: [12, 7], prop: 'arcade', game: 'catcher', rot: 180 },
      { at: [10, 8], prop: 'arcade', game: 'catcher' },
      { at: [11, 8], prop: 'arcade', game: 'catcher' },
      { at: [12, 8], prop: 'arcade', game: 'catcher' },
      { at: [3, 15], prop: 'foodcounter', rot: 90 },
      { at: [3, 16], prop: 'foodcounter', rot: 90 },
      { at: [3, 17], prop: 'foodcounter', rot: 90 },
      { at: [3, 18], prop: 'foodcounter', rot: 90 },
      { at: [3, 19], prop: 'foodcounter', rot: 90 },
      { at: [6, 16], prop: 'foodtable' },
      { at: [10, 16], prop: 'foodtable' },
      { at: [6, 19], prop: 'foodtable' },
      { at: [10, 19], prop: 'foodtable' },
      { at: [8, 21], prop: 'foodtable' },
      { at: [5, 16], prop: 'chair', rot: 90 },
      { at: [7, 16], prop: 'chair', rot: -90 },
      { at: [9, 16], prop: 'chair', rot: 90 },
      { at: [11, 16], prop: 'chair', rot: -90 },
      { at: [5, 19], prop: 'chair', rot: 90 },
      { at: [7, 19], prop: 'chair', rot: -90 },
      { at: [9, 19], prop: 'chair', rot: 90 },
      { at: [11, 19], prop: 'chair', rot: -90 },
      { at: [7, 21], prop: 'chair', rot: 90 },
      { at: [9, 21], prop: 'chair', rot: -90 },
      { at: [30, 19], prop: 'chair', rot: 180 },
      { at: [31, 19], prop: 'chair', rot: 180 },
      { at: [33, 19], prop: 'chair', rot: 180 },
      { at: [34, 19], prop: 'chair', rot: 180 },
      { at: [36, 19], prop: 'chair', rot: 180 },
      { at: [37, 19], prop: 'chair', rot: 180 },
      { at: [39, 19], prop: 'chair', rot: 180 },
      { at: [40, 19], prop: 'chair', rot: 180 },
      { at: [30, 16], prop: 'scoreboard', lane: 1, score: 156, frames: ['9/', 'X', 'X', 'X'] },
      { at: [33, 16], prop: 'scoreboard', lane: 2, score: 98, frames: ['8-', '7-', '9-', '6-'] },
      { at: [36, 16], prop: 'scoreboard', lane: 3, score: 212, frames: ['X', '9/', 'X', 'X'] },
      { at: [39, 16], prop: 'scoreboard', lane: 4, score: 131, frames: ['7/', '8-', '--', 'X'] },
      { at: [3.2, 14.55], prop: 'neon', text: 'WONDER CAFE', col: '#ffe070', y: 1.9, size: 0.22 },   // (over the counter's end, facing the tables)
      { at: [35, 1.62], prop: 'neon', text: 'WONDER LANES', col: '#40e0ff', y: 1.95, size: 0.3 },   // (on the back wall, over the pinsetters)
      { at: [43, 11], prop: 'neon', text: 'SHOES', col: '#ff80c0', y: 2.0, size: 0.2 },
      { at: [24, 9], prop: 'neon', text: 'PRIZES', col: '#ffd040', y: 2.1, size: 0.22 },
      { at: [18, 6], prop: 'neon', text: 'ARM WRESTLING', col: '#ff6050', y: 2.2, size: 0.18 },
    ],
    entries: { from_station: [14, 22, 'up'] },
    exits: [{ at: [14, 23, 2, 1], to: 'gs_station', entry: 'from_wonder', sfx: 'door' }],
    npcs: [
      // ---- the games' own people
      { id: 'wrestler', name: 'Wrestler', model: { base: 'man', build: 'big', top: '#f0c8a0', sleeve: 'skin', bottom: '#c03030', hairStyle: 'buzz' }, at: [18, 7], dir: 'down', talk: armWrestle },
      { id: 'clerk', name: 'Prize Clerk', model: { base: 'woman', top: '#e04090', sleeve: '#e04090', bottom: '#e04090', hair: '#f0d040', hairStyle: 'bun', skirt: 'short' }, at: [24, 9], dir: 'down', talk: prizeCounter },
      { id: 'mogfan', name: 'Man', model: 'man15', at: [26, 3], dir: 'left',
        talk: function* (s) {
          if (s.flag('c6a_mog_cleared') && !s.flag('c6a_mog_reward')) {
            s.set('c6a_mog_reward');
            yield s.say('Man', "*sniff* You got Mog and Mog-Mog together... That was beautiful, man. Here, you earned this.");
            yield* giveGP(s, 30);
            return;
          }
          yield s.say('Man', s.flag('c6a_mog_reward') ? "I still tear up thinking about Mog's big flight." : "Mog's House is a love story, you know. I've played it a hundred times. Nobody ever gets the ending right...");
        } },
      { id: 'gamer', name: 'Kid', model: 'kid6', at: [1, 4], dir: 'up', wander: 1,
        talk: line('Kid', "Super Dunk's the best way to earn GP. Hold the button and let go right when the ball's at the top!") },
      // ---- people at the machines (each pair's second cabinet is taken)
      { id: 'sd_p', name: 'Man', model: 'man5', at: [3, 3], dir: 'up', faceOnTalk: false, talk: line('Man', "Swish! Nothing but net... okay, mostly rim. Don't watch, you're jinxing me.") },
      { id: 'snow_p', name: 'Girl', model: 'girl2', at: [6, 3], dir: 'up', show: s => s.flag('disc2'), faceOnTalk: false, talk: line('Girl', "Course C is CRAZY. I've wiped out eleven times. Twelve's the charm!") },
      { id: 'snow_wait', name: 'Kid', model: 'kid3', at: [6, 3], dir: 'up', show: s => !s.flag('disc2'), faceOnTalk: false, talk: line('Kid', "'Under maintenance.' It's been under maintenance FOREVER. I just want to snowboard...") },
      { id: 'bike_p', name: 'Biker', model: 'man8', at: [10, 3], dir: 'up', anim: 'sit', hover: 0.24, faceOnTalk: false, talk: line('Biker', "Can't talk. Protecting the car. Those bikers are relentless!") },
      { id: 'bike_watch', name: 'Kid', model: 'kid2', at: [11, 4], dir: 'up', faceOnTalk: false, talk: line('Kid', "He's gonna beat the high score! ...Oh. He crashed.") },
      { id: 'torp_p', name: 'Sailor', model: 'man10', at: [14, 3], dir: 'up', show: s => s.flag('has_submarine'), faceOnTalk: false, talk: line('Sailor', "Periscope up... fire! Heh. Takes me back to my navy days.") },
      { id: 'torp_wait', name: 'Old Man', model: 'oldman2', at: [14, 3], dir: 'up', show: s => !s.flag('has_submarine'), faceOnTalk: false, talk: line('Old Man', "Torpedo Attack, coming soon, it says. I'll believe it when I see it.") },
      { id: 'batt_p', name: 'Gamer', model: 'man9', at: [18, 3], dir: 'up', faceOnTalk: false, talk: line('Gamer', "The Invisible One is a myth. Nobody's ever beaten him. NOBODY.") },
      { id: 'batt_watch', name: 'Girl', model: 'girl3', at: [19, 4], dir: 'up', faceOnTalk: false, talk: line('Girl', "My boyfriend's been on this machine for two hours. I've had four parfaits.") },
      { id: 'mh_p', name: 'Woman', model: 'woman7', at: [25, 3], dir: 'up', faceOnTalk: false, talk: line('Woman', "Shh! Mog's about to fly... Oh, I can't look!") },
      { id: 'cc_p2', name: 'Woman', model: 'woman11', at: [5, 6], dir: 'down', faceOnTalk: false, talk: line('Woman', "Twin Horns. TWO commanders at once? Who designed this stage?!") },
      { id: 'cc_p', name: 'Man', model: 'man11', at: [5, 9], dir: 'up', faceOnTalk: false, talk: line('Man', "Stage nine, Veterans. Those barbarians hit like trucks. More Defenders!") },
      { id: 'claw_p1', name: 'Kid', model: 'kid5', at: [11, 6], dir: 'down', faceOnTalk: false, talk: line('Kid', "I've been trying for the Tonberry all day. The claw hates me.") },
      { id: 'claw_p2', name: 'Woman', model: 'woman4', at: [12, 9], dir: 'up', faceOnTalk: false, talk: line('Woman', "Just one more try. I say that every time.") },
      { id: 'aw_fan1', name: 'Man', model: 'man3', at: [16, 8], dir: 'right', anim: 'fistpump', faceOnTalk: false, talk: line('Man', "Nobody beats the big guy! NOBODY!") },
      { id: 'aw_fan2', name: 'Woman', model: 'woman3', at: [20, 8], dir: 'left', anim: 'wave', faceOnTalk: false, talk: line('Woman', "Go on, have a go! He only looks scary. Mostly.") },
      // ---- people walking about
      { id: 'walk1', name: 'Man', model: 'man7', at: [8, 11], dir: 'down', wander: 3, talk: line('Man', "I came for the chocobo races. I've been in here six hours.") },
      { id: 'walk2', name: 'Woman', model: 'woman5', at: [20, 12], dir: 'left', wander: 3, talk: line('Woman', "Have you tried the parfait at the cafe? Life-changing.") },
      { id: 'walk3', name: 'Kid', model: 'kid4', at: [15, 5], dir: 'down', wander: 2, talk: line('Kid', "I'm gonna win the whole prize counter! ...I have three GP.") },
      { id: 'walk4', name: 'Old Man', model: 'oldman3', at: [23, 6], dir: 'left', wander: 2, talk: line('Old Man', "In my day, arcades had two games and a broken pinball machine. Look at this place!") },
      // ---- the Wonder Cafe
      { id: 'cook1', name: 'Cook', model: 'chef', at: [2, 16], dir: 'right', faceOnTalk: false, talk: cafe },
      { id: 'cook2', name: 'Cook', model: 'chef', at: [2, 18], dir: 'right', faceOnTalk: false, talk: cafe },
      { id: 'queue1', name: 'Man', model: 'man7', at: [4, 16], dir: 'left', talk: line('Man', "A Chocobo Burger, no pickles... Hey, no cutting!") },
      { id: 'queue2', name: 'Woman', model: 'woman2', at: [4, 18], dir: 'left', talk: line('Woman', "Two Kupo Shakes, please. They're both for me.") },
      { id: 'eat1', name: 'Woman', model: 'woman6', at: [5, 16], dir: 'right', anim: 'sit', hover: 0.1, faceOnTalk: false, talk: line('Woman', "Mmm! You have to try the fries.") },
      { id: 'eat2', name: 'Man', model: 'man4', at: [7, 16], dir: 'left', anim: 'sit', hover: 0.1, faceOnTalk: false, talk: line('Man', "Refueling. Then back to the G-Bike.") },
      { id: 'eat3', name: 'Kid', model: 'kid3', at: [9, 19], dir: 'right', anim: 'sit', hover: 0.1, faceOnTalk: false, talk: line('Kid', "I got the Moogle Parfait! It's got a pom-pom on top!") },
      { id: 'eat4', name: 'Woman', model: 'woman8', at: [11, 19], dir: 'left', anim: 'sit', hover: 0.1, faceOnTalk: false, talk: line('Woman', "Don't tell my trainer about the burger.") },
      { id: 'eat5', name: 'Old Woman', model: 'oldwoman', at: [7, 21], dir: 'right', anim: 'sit', hover: 0.1, faceOnTalk: false, talk: line('Old Woman', "Such a lively place. It reminds me of Midgar, before the plate.") },
      { id: 'eat6', name: 'Old Man', model: 'oldman', at: [9, 21], dir: 'left', anim: 'sit', hover: 0.1, faceOnTalk: false, talk: line('Old Man', "Fifty years married, and she still steals my fries.") },
      // ---- Wonder Lanes
      { id: 'bowl1', name: 'Bowler', model: 'woman2', at: [30, 17], dir: 'up', faceOnTalk: false, talk: line('Bowler', "Three strikes in a row! That's a turkey, pal!") },
      { id: 'bowl2', name: 'Bowler', model: 'woman9', at: [33, 17], dir: 'up', faceOnTalk: false, talk: line('Bowler', "Spare me the advice. And I mean that literally, I need a spare.") },
      { id: 'bowl3', name: 'Bowler', model: 'worker2', at: [36, 17], dir: 'up', faceOnTalk: false, talk: line('Bowler', "Company league night. My boss is on lane four. I'm supposed to be letting her win... Oops.") },
      { id: 'bowl4', name: 'Bowler', model: 'woman10', at: [39, 17], dir: 'up', faceOnTalk: false, talk: line('Bowler', "Gutter ball... Gutter ball... Strike! See? It's all about rhythm.") },
      { id: 'bspec1', name: 'Man', model: 'man2', at: [31, 19], dir: 'up', anim: 'sit', hover: 0.1, faceOnTalk: false, talk: line('Man', "My wife's winning. Again. I'm just here for moral support.") },
      { id: 'bspec2', name: 'Woman', model: 'woman5', at: [34, 19], dir: 'up', anim: 'sit', hover: 0.1, faceOnTalk: false, talk: line('Woman', "Come on, lane two! You can do it!") },
      { id: 'bspec3', name: 'Kid', model: 'kid5', at: [37, 19], dir: 'up', anim: 'sit', hover: 0.1, faceOnTalk: false, talk: line('Kid', "When I'm tall enough, I'm gonna bowl a perfect game.") },
      { id: 'shoes', name: 'Attendant', model: 'worker3', at: [43, 11], dir: 'down', talk: line('Attendant', "Welcome to Wonder Lanes! All four lanes are booked tonight, sorry. League night!") },
      { id: 'walk5', name: 'Man', model: 'man9', at: [42, 18], dir: 'left', wander: 2, talk: line('Man', "These rental shoes are two sizes too small. I'm bowling anyway.") },
    ],
    objects: [
      { at: [2, 2], talk: superDunk }, { at: [3, 2], talk: superDunk },
      { at: [5, 2], if: s => !s.flag('disc2'), talk: function* (s) { yield s.msg('SNOWBOARD — "Under maintenance. Coming soon!"'); } },
      { at: [6, 2], if: s => !s.flag('disc2'), talk: function* (s) { yield s.msg('SNOWBOARD — "Under maintenance. Coming soon!"'); } },
      { at: [9, 2], talk: gBike }, { at: [10, 2], talk: gBike }, { at: [9, 3], talk: gBike },   // (the cabinets, and the free bike)
      { at: [13, 2], if: s => !s.flag('has_submarine'), talk: function* (s) { yield s.msg('TORPEDO ATTACK — "Now in development. Coming soon!"'); } },
      { at: [14, 2], if: s => !s.flag('has_submarine'), talk: function* (s) { yield s.msg('TORPEDO ATTACK — "Now in development. Coming soon!"'); } },
      { at: [17, 2], talk: battler }, { at: [18, 2], talk: battler },
      // the Crystal Fortune booth: an object, as it can move (js/maps/extra/cait_hideout.js: shoved one tile east to show
      // the door behind it, out of order until Cait Sith mends it)
      { id: 'fortune_booth', prop: 'arcade', game: 'fortune', solid: true, talk: fortune,
        // (east of the door while it's open: after the breakdown until Cait Sith mends it, and whenever his hidden
        // switch has slid it aside)
        get at() { const f = FF7.state.flags; return f.cait_hideout_found && (!f.cait_booth_fixed || FF7.state.vars.cait_door_open) ? [22, 2] : [21, 2]; },
        get broken() { const f = FF7.state.flags; return !!(f.cait_hideout_found && !f.cait_booth_fixed); },
        get stateKey() { return this.broken ? 'broken' : 'ok'; } },
      { at: [24, 2], talk: mogHouse }, { at: [25, 2], talk: mogHouse },
      { at: [4, 7], talk: condorCommand }, { at: [5, 7], talk: condorCommand },
      { at: [4, 8], talk: condorCommand }, { at: [5, 8], talk: condorCommand },
      { at: [10, 7], talk: catcher }, { at: [11, 7], talk: catcher }, { at: [12, 7], talk: catcher },
      { at: [10, 8], talk: catcher }, { at: [11, 8], talk: catcher }, { at: [12, 8], talk: catcher },
      // the bowling: each lane's pins and its ball (moving objects, bowlingLoop)
      { id: 'pins30', at: [30.5, 2.3], prop: 'pins' }, { id: 'ball30', at: [30.5, 15.4], prop: null },
      { id: 'pins33', at: [33.5, 2.3], prop: 'pins' }, { id: 'ball33', at: [33.5, 15.4], prop: null },
      { id: 'pins36', at: [36.5, 2.3], prop: 'pins' }, { id: 'ball36', at: [36.5, 15.4], prop: null },
      { id: 'pins39', at: [39.5, 2.3], prop: 'pins' }, { id: 'ball39', at: [39.5, 15.4], prop: null },
    ],
    triggers: [counter([18, 8, 1, 1], armWrestle), counter([23, 10, 3, 1], prizeCounter), counter([3, 15, 1, 5], cafe),
      counter([42, 12, 3, 1], line('Attendant', "Welcome to Wonder Lanes! All four lanes are booked tonight, sorry. League night!"))],
    onEnter: function* (s) {
      s.parallel(bowlingLoop);
      if (s.flag('cait_joined')) return;
      yield* FF7.story.c6a_caitSith(s, 15, 20);
    },
  });

  // ------------------------------------------------------------------ Round Square
  FF7.defineMap('gs_round', {
    name: 'Round Square', area: 'Gold Saucer', theme: 'goldsaucer', music: 'goldsaucer',
    // the gondola at its boarding gate, hanging from its cable, the line running out into the night behind it
    legend: { '&': 'block' },
    props: [
      { at: [11.5, 0.7], vehicle: 'gondola', rot: 90, scale: 0.5 },
      // its two track ropes, over the tops of its wheels (see ropeway())
      ...[-0.2, 0.2].map(k => ({ at: [-4, 0.7 + k], to: [40, 0.7 + k], h: (2.92 + 0.16) * 0.5 + 0.016, sag: 0, r: 0.016, col: '#232326', count: 1, far: true })),
    ],
    grid: [
      "XXXXXXXXX      XXXXXXXXX",
      "hhhhhhhhh&&&&&&hhhhhhhhh",
      "h.|.......gggg.......|.h",
      "h..........gg..........h",
      "h......................h",
      "h...u..............u...h",
      "h......................h",
      "h......................h",
      "hhhhhhhhhhh++hhhhhhhhhhh",
    ],
    entries: { from_station: [11, 7, 'up'] },
    exits: [{ at: [11, 8, 2, 1], to: 'gs_station', entry: 'from_round', sfx: 'door' }],
    npcs: [
      { id: 'gondola_girl', name: 'Attendant', model: { base: 'woman', top: '#e04090', sleeve: '#e04090', bottom: '#e04090', hair: '#f0d040', hairStyle: 'bun', skirt: 'short' }, at: [15, 2], dir: 'down',
        talk: function* (s) { yield s.say('Attendant', "The gondola tours the whole park — the view of the fireworks is simply magical! I'm sorry, but we're only running evening rides for couples right now. Please come back another time!"); } },
    ],
  });

  // ------------------------------------------------------------------ Chocobo Square
  const RACERS = ['Swift Wind', 'Buster', 'Snow Crown', 'Teioh Jr.', 'Lucky Feather', 'Sandstorm'];
  const betCounter = function* (s) {
    const c = yield s.ask('Clerk', `Chocobo racing! Place your bets. One ticket is 10 GP. (You have ${GP.get()} GP.)`, ['C Class race', 'B Class race', 'No thanks']);
    if (c > 1) return;
    if (!GP.spend(10)) { yield s.say('Clerk', "Sorry, you need 10 GP for a ticket. Try the games in Wonder Square!"); return; }
    const pick = yield s.ask('Clerk', 'Which chocobo will win?', RACERS);
    s.music('racing');
    yield s.caption("And they're off!", { hold: 90, bg: 'rgba(0,0,0,0.6)' });
    const win = Math.floor(Math.random() * RACERS.length);
    yield s.msg(`The winner is... No.${win + 1}, ${RACERS[win]}!`);
    s.music('fiddle');
    if (win !== pick) { yield s.say('Clerk', "Oh, too bad! Better luck next race."); return; }
    const pool = c === 0 ? ['potion', 'phoenix_down', 'hyper', 'tranquilizer', 'hi_potion', 'antarctic_wind', 'bolt_plume', 'fire_fang', 'ether']
      : ['phoenix_down', 'hyper', 'tranquilizer', 'hi_potion', 'hero_drink', 'bolt_plume', 'antarctic_wind', 'fire_fang', 'ether', 'ice_crystal', 'turbo_ether', 'elixir'];
    const item = pool[Math.floor(Math.random() * pool.length)];
    yield s.say('Clerk', "Congratulations! Here's your prize!");
    yield s.give(item);
  };
  FF7.defineMap('gs_chocobo', {
    name: 'Chocobo Square', area: 'Gold Saucer', theme: 'goldsaucer', music: 'fiddle',
    // FF7 (06-goldsaucer09, ff7art20): you arrive by tube at the foot of a grand staircase that climbs
    // to the CHOCOBO RACING hall (the betting gallery, raised at the top); the ends of the transport
    // tubes step down on both sides of the stair over the dark, each with its glowing sign
    look: { metal: ['#c8ccd8', '#b8bcc8'], floor2: ['#8a8ab0', '#8282a8'], roof: '#2a1838' },
    camera: { pitch: 44, dist: 11 },
    lights: [[13, 9, '#ff80c0', 3], [13, 17, '#80c0ff', 3], [11, 12, '#ffe060', 1.5], [16, 12, '#ffe060', 1.5], [11, 16, '#ffe060', 1.5], [16, 16, '#ffe060', 1.5]],
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "hhhhNhhhhhZZZZZZZZhhhhNhhhhh",
      "h..........................h",
      "h.cccc....cccc....cccc.....h",
      "h..........................h",
      "h.cccc....cccc....cccc.....h",
      "h..........................h",
      "h.DDD......................h",
      "h..........................h",
      "h..........................h",
      "hhhhhhhhhhhh^^^^hhhhhhhhhhhh",
      "h           ^^^^           h",
      "h    PPPPPPN^^^^NPPPPPP    h",
      "h           ^^^^           h",
      "h   PPPPPPPN^^^^NPPPPPPP   h",
      "h           ^^^^           h",
      "h  PPPPPPPPN^^^^NPPPPPPPP  h",
      "..........S................h",
      "...........................h",
      "hhhhhhhhhhhhhhhhhhhhhhhhhhhh",
    ],
    heights: [
      "6666666666666666666666666666",
      "6666666666666666666666666666",
      "6666666666666666666666666666",
      "6666666666666666666666666666",
      "6666666666666666666666666666",
      "6666666666666666666666666666",
      "6666666666666666666666666666",
      "6666666666666666666666666666",
      "6666666666666666666666666666",
      "6666666666666666666666666666",
      "6666666666666666666666666666",
      "0000000000005555000000000000",
      "0000055555554444555555500000",
      "0000000000003333000000000000",
      "0000333333332222333333330000",
      "0000000000001111000000000000",
      "0001111111111111111111111000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
    ],
    entries: { from_station: [2, 17, 'right'] },
    exits: [{ at: [0, 17, 1, 2], to: 'gs_station', entry: 'from_chocobo', sfx: 'jump' }],
    npcs: [
      { id: 'bet_clerk', name: 'Clerk', model: { base: 'woman', top: '#e04090', sleeve: '#e04090', bottom: '#e04090', hair: '#f0d040', hairStyle: 'bun', skirt: 'short' }, at: [3, 6], dir: 'down', talk: betCounter },
      { id: 'gambler', name: 'Gambler', model: 'man16', at: [12, 4], dir: 'up',
        talk: function* (s) { yield s.say('Gambler', "No.4's a sure thing, I'm tellin' ya! ...That's what I said last race. And the one before that."); } },
      { id: 'ester_gs', name: 'Ester', model: { base: 'woman', top: '#f0a030', sleeve: '#f0a030', bottom: '#503020', hair: '#c03020', hairStyle: 'ponytail', skirt: 'short' }, at: [22, 8], dir: 'left', show: s => s.flag('has_buggy'),
        talk: function* (s) { yield s.say('Ester', `${s.name('cloud')}! My star jockey! When you've raised a chocobo of your own, come race with me again. I'll be waiting!`); } },
    ],
    objects: [
      { at: [13, 1], talk: function* (s) { yield s.msg('Giant screens show chocobos thundering around the track.'); } },
    ],
    triggers: [counter([2, 7, 3, 1], betCounter)],
  });

  // ------------------------------------------------------------------ Speed Square
  const coaster = function* (s) {
    const c = yield s.ask('Attendant', `The Shooting Coaster! Blast the targets and aim for a high score. 10 GP a ride. (You have ${GP.get()} GP.)`, ['Ride', 'No thanks']);
    if (c !== 0) return;
    if (!GP.spend(10)) { yield s.say('Attendant', "Sorry, the coaster costs 10 GP. You can earn some in Wonder Square!"); return; }
    const r = yield s.minigame('shooting', { mode: 'speed_square' });
    const pts = score(r, 5000, 1000);
    yield s.msg(`Final score: ${pts} points!`);
    if (pts >= 5000 && !s.flag('c6a_umbrella')) { s.set('c6a_umbrella'); yield s.say('Attendant', "A new record! Here's our grand prize!"); yield s.give('umbrella'); }
    else if (pts >= 3000) { const junk = ['masamune_blade', 'masamune_blade', 'super_sweeper', '1_35_soldier'][Math.floor(Math.random() * 4)]; yield s.say('Attendant', "Great shooting! Here's a prize!"); yield s.give(junk); }
    else yield s.say('Attendant', "Nice try! Score over 3,000 for a prize!");
  };
  FF7.defineMap('gs_speed', {
    name: 'Speed Square', area: 'Gold Saucer', theme: 'goldsaucer', music: 'goldsaucer',
    // the shooting coaster's car at the platform, on its rails, the line running out into the night behind it
    legend: { '&': 'block' },
    props: [
      { at: [7, 0.7], prop: 'track', len: 10, gauge: 0.6, col: '#8a8a94', col2: '#2a2a30' },
      { at: [11.5, 0.7], vehicle: 'mono_coaster', rot: 90 },
    ],
    grid: [
      "XXXXXXX          XXXXXXX",
      "hhhhhhh&&&&&&&&&&hhhhhhh",
      "hggggggggggggggggggggggh",
      "h=========....=========h",
      "h......................h",
      "h..D...............l...h",
      "h......................h",
      "h......................h",
      "hhhhhhhhhhh++hhhhhhhhhhh",
    ],
    entries: { from_station: [11, 7, 'up'] },
    exits: [{ at: [11, 8, 2, 1], to: 'gs_station', entry: 'from_speed', sfx: 'door' }],
    npcs: [
      { id: 'coaster_man', name: 'Attendant', model: 'worker7', at: [13, 4], dir: 'down', talk: coaster },
      { id: 'thrill', name: 'Girl', model: 'girl4', at: [6, 6], dir: 'up',
        talk: function* (s) { yield s.say('Girl', "The big UFO near the end is worth a thousand points! If you can hit it..."); } },
    ],
  });

  // ------------------------------------------------------------------ Ghost Square (hotel)
  const hotelDesk = function* (s) { yield s.inn(0, { who: 'Clerk', text: "Welcome to the Ghost Hotel... heh heh heh. Rest is free for Gold Saucer guests. Care to stay the night?" }); };
  const hotelShop = function* (s) { yield s.say('Shopkeeper', "Welcome... to our little shop of horrors. Just kidding. Mostly."); yield s.shop('gold_saucer_items'); };
  FF7.defineMap('gs_ghost', {
    name: 'Ghost Hotel', area: 'Gold Saucer', theme: 'mansion', music: 'goldsaucer',
    look: { ambient: [0.3, 0.26, 0.36], light: [0.6, 0.5, 0.75], floor: ['#4a2a4a', '#442444'], wall: '#5a4a6a', trim: '#2a1a3a' },
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXX",
      "hkk..q....F......q...kkh",
      "h......................h",
      "h.DDD............DDD...h",
      "h......................h",
      "h..j......|....|.....j.h",
      "h......................h",
      "h..........u...........h",
      "h......................h",
      "hhhhhhhhhh++++hhhhhhhhhh",
    ],
    lights: [[10, 1, '#ff8040', 3], [11, 7, '#8060ff', 3]],
    entries: { from_station: [11, 8, 'up'] },
    exits: [{ at: [10, 9, 4, 1], to: 'gs_station', entry: 'from_ghost', sfx: 'door' }],
    npcs: [
      { id: 'hotel_shop', name: 'Shopkeeper', model: 'ghost', at: [3, 2], dir: 'down', talk: hotelShop },
      { id: 'hotel_clerk', name: 'Clerk', model: 'ghost', at: [18, 2], dir: 'down', talk: hotelDesk },
      { id: 'spook', name: 'Ghost', model: 'ghost', at: [7, 6], dir: 'down', wander: 3,
        talk: function* (s) { yield s.say('Ghost', "Boooo... Did I scare you? ...No? Hmph. Tough crowd."); } },
    ],
    objects: [
      { at: [5, 1], talk: function* (s) {
        yield s.msg('A flyer is pinned to the board:\n"TURTLE\'S PARADISE — No.3\nWe\'re the #1 bar in Wutai! Our special drink is out of this world!"');
        if (!s.flag('c6a_turtle_flyer3')) { s.set('c6a_turtle_flyer3'); s.inc('turtle_flyers'); }
      } },
      { at: [11, 7], talk: function* (s) { yield s.msg('A statue of a grinning ghost. Its eyes seem to follow you.'); } },
    ],
    triggers: [counter([2, 3, 3, 1], hotelShop), counter([17, 3, 3, 1], hotelDesk)],
  });

  // ------------------------------------------------------------------ Event Square
  FF7.defineMap('gs_event', {
    name: 'Event Square', area: 'Gold Saucer', theme: 'goldsaucer', music: 'goldsaucer',
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXX",
      "hhhhNhhhhhhhhhhhhhhNhhhh",
      "h..__________________..h",
      "h..__________________..h",
      "h..........^^..........h",
      "h..cccccc......cccccc..h",
      "h......................h",
      "h..cccccc......cccccc..h",
      "hhhhhhhhhhh++hhhhhhhhhhh",
    ],
    heights: [
      "000000000000000000000000",
      "000000000000000000000000",
      "000222222222222222222000",
      "000222222222222222222000",
      "000000000001100000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
    ],
    entries: { from_station: [11, 7, 'up'] },
    exits: [{ at: [11, 8, 2, 1], to: 'gs_station', entry: 'from_event', sfx: 'door' }],
    npcs: [
      { id: 'stage_mgr', name: 'Stage Manager', model: 'man17', at: [11, 2], dir: 'down',
        talk: function* (s) { yield s.say('Stage Manager', "No shows scheduled right now, I'm afraid. But every night we pick a lucky visitor to star in our play! Maybe it'll be you someday!"); } },
    ],
  });
})();
