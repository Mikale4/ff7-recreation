// Chapter 8, part 3 — Bone Village and the Sleeping Forest. The excavation site (the digging boss,
// diggers for hints, marking a spot, the treasure box by the entrance; the Lunar Harp and the other
// finds from the treasure map), the foreman's shop, rumours of a girl in pink walking into the
// forest; the Sleeping Forest (asleep without the Lunar Harp; the Kjata orb flickering at the edges
// of the clearing), the fallen trunk (Water Ring) and the way north.
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
(function () {
  FF7.world.link('bone_village', { map: 'bone_village', entry: 'from_world' });
  FF7.world.link('sleeping_forest', { map: 'forest_south', entry: 'from_world' });
  FF7.world.link('sleeping_forest_n', { map: 'forest_trunk', entry: 'from_north' });

  // ================================================================== Bone Village: the excavation
  // Spots from the Bone Village treasure map (AbsoluteSteve): 1 Lunar Harp; 2 Buntline; 3 Megalixir;
  // 4 Mop; 5 Elixir (14%); 6 Turbo Ether (8%) or Ether; 7 Ether (30%); 8 Potion (50%). After Cloud
  // is back from Mideel, 5-7 hold the Key to Sector 5; on Disc 3, 2-4 hold Phoenix / Bahamut ZERO /
  // W-Item if they were missed earlier.
  const SPOTS = {
    1: [9, 4], 2: [34, 2], 3: [14, 16], 4: [22, 15], 5: [13, 21], 6: [17, 5], 7: [9, 7], 8: [3, 20],
  };
  const HINT = {
    1: "up on the top terrace, on the left... just to the right of where the smoke from the hut's chimney drifts up",
    2: 'way up in the far right corner of the top terrace',
    3: 'down here on the dig floor, a little left of the middle',
    4: "down here, right in front of the nose of that old wrecked plane",
    5: 'down near the entrance, left of the path',
    6: 'on the top terrace, in the middle, just past that big skull',
    7: 'on the top terrace, right at the edge above the hut',
    8: 'down in the bottom-left corner, by the tent',
  };
  const SEARCH = [
    { name: 'the Lunar Harp', odds: [[1, 100]] },
    { name: 'good treasure', odds: [[2, 31.25], [3, 31.25], [4, 37.5]] },
    { name: 'normal treasure', odds: [[5, 23.4375], [6, 23.4375], [7, 23.4375], [8, 29.6875]] },
  ];
  const pickSpot = (odds) => { let r = Math.random() * 100; for (const [n, p] of odds) { if ((r -= p) < 0) return n; } return odds[odds.length - 1][0]; };

  // what the diggers turn up at spot n (returns ['item'|'materia'|'none', id])
  function digResult(s, n) {
    const d3 = s.flag('disc3'), back = s.flag('cloud_returned') && !s.has('key_to_sector_5') && !s.flag('c8_dug_key5');
    const r = Math.random() * 100;
    switch (n) {
      case 1: return s.flag('c8_dug_harp') ? ['none'] : ['item', 'lunar_harp', 'c8_dug_harp'];
      case 2: if (!s.flag('c8_dug_buntline')) return ['item', 'buntline', 'c8_dug_buntline'];
        return d3 && !s.hasMateria('phoenix') ? ['materia', 'phoenix'] : ['none'];
      case 3: if (!s.flag('c8_dug_megalixir')) return ['item', 'megalixir', 'c8_dug_megalixir'];
        return d3 && !s.hasMateria('bahamut_zero') && r < 3.90625 ? ['materia', 'bahamut_zero'] : ['none'];
      case 4: if (!s.flag('c8_dug_mop')) return ['item', 'mop', 'c8_dug_mop'];
        return d3 && !s.hasMateria('w_item') ? ['materia', 'w_item'] : ['none'];
      case 5: if (back) return ['item', 'key_to_sector_5', 'c8_dug_key5'];
        return r < 14.06 ? ['item', 'elixir'] : ['none'];
      case 6: if (back) return ['item', 'key_to_sector_5', 'c8_dug_key5'];
        return r < 7.81 ? ['item', 'turbo_ether'] : ['item', 'ether'];
      case 7: if (back) return ['item', 'key_to_sector_5', 'c8_dug_key5'];
        return r < 29.69 ? ['item', 'ether'] : ['none'];
      case 8: return r < 50 ? ['item', 'potion'] : ['none'];
    }
    return ['none'];
  }

  const bossTalk = function* (s) {
    const state = s.get('c8_dig_state');
    if (!s.flag('c8_temple_done')) {
      yield s.say('Digging Boss', "Treasure huntin'? Heh, sorry, pal. The boys are booked solid on a job for a big-shot collector.\fCome back another time and we'll talk business.");
      return;
    }
    if (state === 1) { yield s.say('Digging Boss', "Go on, walk over to the spot you want dug up. Stand right on it, and we'll mark it."); return; }
    if (state === 3) { yield s.say('Digging Boss', "The boys dug all night! Whatever they found is in the treasure box by the entrance."); return; }
    if (!s.flag('c8_dig_explained')) {
      s.set('c8_dig_explained');
      yield s.say('Digging Boss', "Welcome to Bone Village, the finest excavation site in the world! Heh heh.\fHere's how it works. Tell me what you're after, and you can hire some of my diggers. 100 gil a head.\fThe boys'll listen to the ground and turn to face where the goods are. Then you pick a spot, and we dig overnight.");
    }
    const c = yield s.ask('Digging Boss', "So, what're you lookin' for?", ['The Lunar Harp', 'Good treasure', 'Normal treasure', 'Nothing right now']);
    if (c > 2) return;
    const k = yield s.ask('Digging Boss', "How many diggers do you want? 100 gil each.", ["None. I know where to dig.", '1 digger (100 gil)', '3 diggers (300 gil)', '5 diggers (500 gil)']);
    const hired = [0, 1, 3, 5][k];
    if (hired && !s.takeGil(hired * 100)) { yield s.say('Digging Boss', "Hey, you're short on gil! No money, no diggers."); return; }
    if (hired) {
      const n = pickSpot(SEARCH[c].odds);
      s.sfx('search');
      yield s.msg(`The diggers press their ears to the ground... then light their little bombs. BOOM!\nWhen the dust clears, they're all staring at the same place.`);
      yield s.say('Digging Boss', `Looks like the boys smell ${SEARCH[c].name}... ${HINT[n]}.`);
    } else {
      yield s.say('Digging Boss', "No diggers, huh? Confident! Alright, you're on your own.");
    }
    yield s.say('Digging Boss', "Now walk over to the spot you want dug up and stand on it. We'll mark it for you.");
    s.setVar('c8_dig_state', 1);
  };
  const markSpot = (n) => function* (s) {
    if (s.get('c8_dig_state') !== 1) return;
    const c = yield s.ask(null, 'Mark this spot for digging?', ['Dig here', 'Not here']);
    if (c !== 0) return;
    s.setVar('c8_dig_spot', n);
    s.setVar('c8_dig_state', 2);
    yield s.say('Digging Boss', "Right here? You got it! The boys'll work through the night. Get some rest!");
    yield s.fadeOut(40);
    s.music('goodnight');
    yield s.caption('The diggers work by lantern light all through the night...', { hold: 150, bg: '#000' });
    s.music('parochial');
    s.setVar('c8_dig_state', 3);
    yield s.fadeIn(40);
    yield s.say('Digging Boss', "Mornin'! The boys found somethin' down there. It's in the treasure box by the entrance!");
  };
  const treasureBox = function* (s) {
    if (s.get('c8_dig_state') !== 3) { yield s.msg('A big wooden treasure box. The diggers leave their finds in here.'); return; }
    s.setVar('c8_dig_state', 0);
    const [kind, id, flag] = digResult(s, s.get('c8_dig_spot'));
    s.sfx('chest');
    if (kind === 'none') { yield s.msg('The box is full of dirt, rocks... and nothing else. Better luck next time.'); return; }
    if (flag) s.set(flag);
    if (kind === 'materia') yield s.giveMateria(id); else yield s.give(id);
    if (id === 'lunar_harp') yield s.say('cloud', "(The Lunar Harp... With this, we can wake the Sleeping Forest.)");
  };
  const shopTalk = function* (s) {
    yield s.say('Foreman', "Diggin's hard work. You'll need supplies. And if you're headin' north... you'll need armor, too.");
    yield s.shop('bone_village_items');
  };

  FF7.defineMap('bone_village', {
    name: 'Bone Village', area: 'Bone Village', theme: 'canyon', music: 'parochial',
    look: { floor: ['#b09a74', '#a8926c'], dirt: ['#a08a64', '#98825c'], wall: '#8a7458', trim: '#4a3a28', sky: ['#7898c0', '#d8d0c0'] },
    grid: [
      "########################################",
      "#Rddddddd|d|d|ddddddddddRdddddddd|d|ddR#",
      "#ddAddddd|ddd|dddddddddddddddAddddddddd#",
      "#dddddddddddddddddddddddddddddddddddddd#",
      "#dddRdddddddddduddddddddddddddddRdddddd#",
      "#dddddddddddddddddddddddddAdddddddddddd#",
      "#dddddddddddddddddddddddddddddddddddAdd#",
      "#dddddddddddddddddddddddddRdddddddddddd#",
      "#dddddddddddddddddddddddddddddddddddddd#",
      "#===================^^=================#",
      "#ddddddddddddddddddd^^ddddddddddddddddd#",
      "#dhhhhhhddddddddddddddddddddddddddddxdd#",
      "#dhhhhhhdddAdddddodddddddddddd==ddddddd#",
      "#dhhhhhhdddddddddddddddddddddd==ddddddd#",
      "#ddddddddddddddddddxddddddddMMMMMMMMMdd#",
      "#dddddddddddddddddd:dddddddMMMMMMMMMMdd#",
      "#dddddddddddddddddd:dddddddMMMMMMMMMMdd#",
      "#dxdddddddddddddddd:ddddddddMMMMMMMMMdd#",
      "#dddddddddddxxddddd:dddddddddd==ddddddd#",
      "#dddddddddddxdddddd:dddddddddd==ddddddd#",
      "#dddddddAdddddddddd:ddddxdddddddddddddd#",
      "#dddddddddddddddddd:ddddddddddddddAdddd#",
      "#oddddddddddddddddd:dddBdddddddddddddod#",
      "#dddddddddxdddddddd:ddddddddddddddddddd#",
      "##################::::##################",
    ],
    heights: [
      "0000000000000000000000000000000000000000",
      "0444444444444444444444444444444444444440",
      "0444444444444444444444444444444444444440",
      "0444444444444444444444444444444444444440",
      "0444444444444444444444444444444444444440",
      "0444444444444444444444444444444444444440",
      "0444444444444444444444444444444444444440",
      "0444444444444444444444444444444444444440",
      "0444444444444444444444444444444444444440",
      "0444444444444444444433444444444444444440",
      "0000000000000000000011000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
    ],
    lights: [[7, 11, '#ffb060', 2], [23, 22, '#ffe0a0', 2]],
    entries: { from_world: [19, 23, 'up'] },
    exits: [{ at: [18, 24, 4, 1], to: 'world', loc: 'bone_village' }],
    npcs: [
      { id: 'boss', name: 'Digging Boss', model: { base: 'man', build: 'big', top: '#8a6a3a', sleeve: 'skin', bottom: '#4a4030', hair: '#2a2018', extras: ['beard', 'cap'] },
        at: [5, 14], dir: 'down', anim: 'sit', talk: bossTalk },
      { id: 'foreman', name: 'Foreman', model: { base: 'oldman', top: '#6a7a4a', sleeve: '#6a7a4a', bottom: '#4a4030', extras: ['cap'] }, at: [11, 14], dir: 'down', anim: 'sit', talk: shopTalk },
      { id: 'gate_digger', name: 'Digger', model: 'worker8', at: [21, 21], dir: 'left',
        talk: function* (s) {
          if (s.flag('c8_temple_done') && !s.flag('c8_forest_awake')) {
            yield s.say('Digger', "A girl in a pink dress? Yeah, she came through here, all by herself.\fWalked right on into the Sleeping Forest, north of the village. And the funny thing is... the forest let her through!");
            yield s.say('Digger', "For anybody else, that forest just goes round in circles. You need the Lunar Harp to wake it up.\fThey say the harp's buried somewhere around here. Talk to the boss if you want to dig for it.");
            return;
          }
          yield s.say('Digger', "Welcome to Bone Village! Everybody here's a digger. The ground's full of old bones and older treasure.\fNorth of here is the Sleeping Forest. Nobody gets through it without the Lunar Harp. The forest just... puts you back where you started.");
        } },
      { id: 'digger1', name: 'Digger', model: 'worker9', at: [15, 12], dir: 'down', wander: 3,
        talk: function* (s) { yield s.say('Digger', "Ever wonder what these giant bones came from? Me neither. I just dig 'em up."); } },
      { id: 'digger2', name: 'Digger', model: 'worker10', at: [25, 19], dir: 'up', wander: 2,
        talk: function* (s) { yield s.say('Digger', "That wrecked plane's been here longer than anybody can remember. Pretty sure it's Shinra junk from before my time."); } },
      { id: 'digger3', name: 'Digger', model: 'worker11', at: [30, 5], dir: 'left', wander: 3,
        talk: function* (s) { yield s.say('Digger', "Tip for you: the boys' little bombs don't find treasure by themselves. They just point. It's up to you to pick the right spot!"); } },
      { id: 'scholar', name: 'Researcher', model: { base: 'man', top: '#e0dcd0', sleeve: '#e0dcd0', bottom: '#5a5040', extras: ['glasses'] }, at: [22, 3], dir: 'down',
        talk: function* (s) { yield s.say('Researcher', "North of the forest there's supposed to be a city built by the Ancients. The Forgotten Capital.\fI'd give anything to excavate there. But the forest won't let me through."); } },
    ],
    objects: [
      { at: [23, 22], talk: treasureBox },
      { at: [4, 13], talk: function* (s) { yield s.msg('A little stone hut. Smoke curls up from its chimney, drifting up past the upper terrace.'); } },
      { at: [15, 4], talk: function* (s) { yield s.msg('An enormous skull, half dug out of the earth. Whatever it belonged to, it was bigger than a house.'); } },
      { at: [27, 15], talk: function* (s) { yield s.msg('The nose of an old crashed aircraft, half buried in the dirt. The paint has long since peeled away.'); } },
    ],
    triggers: Object.keys(SPOTS).map(n => ({ at: [SPOTS[n][0], SPOTS[n][1], 2, 2], if: s => s.get('c8_dig_state') === 1, run: markSpot(+n) })),
    onEnter: function* (s) {
      if (s.flag('c8_temple_done') && !s.flag('c8_bone_aeris')) {
        s.set('c8_bone_aeris');
        yield s.say('cloud', "(Aeris... Did she come this way?)");
      } else if (!s.flag('c8_bone_seen')) {
        s.set('c8_bone_seen');
        yield s.msg('Bone Village. Tents and dig pits sprawl among giant bones jutting from the earth.');
      }
    },
  });

  // ================================================================== the Sleeping Forest
  // ref 10-forgottencity26: a dim blue-green forest in mist, pale light between the trunks
  const FOREST = { floor: ['#3e6a52', '#3a644c'], grass: ['#2e5a48', '#2a5444'], dirt: ['#5a6048', '#545a42'], ambient: [0.36, 0.46, 0.48], light: [0.6, 0.76, 0.8],
    sky: ['#12302a', '#6a9a90'], fog: { color: [0.36, 0.52, 0.5], near: 6, far: 20 } };
  FF7.defineMap('forest_south', {
    name: 'Sleeping Forest', area: 'Sleeping Forest', theme: 'forest', music: 'blackcape', look: FOREST,
    grid: [
      "TTTTTTTTTTTTT,,dd,TTTTTTTTTTTT",
      "TTTTTTTTTTTT,,,dd,,TTTTTTTTTTT",
      "TTTTTTTTTTTT,,,dd,,TTTTTTTTTTT",
      "TTTTTTTTTTTT,,,dd,,TTTTTTTTTTT",
      "TTTTTTTTTTTTf,,dd,,TTTTTTTTTTT",
      "TTTTTTTTTTTTT,,dd,TT,,,,,,YTTT",
      "TTTTTTTTTTTT,,,dd,,T,,G,,,,TTT",
      "TTTTTTTTTTT,,,dd,,,,,,,,,,,TTT",
      "TTTTTTTTTTT,,,dd,,TT,,,ff,,TTT",
      "TTT,,,,%,,T,,,dd,,TT,,,,,G,TTT",
      "TTT,G,,,,,TTT,,dd,TT,%,,,,,TTT",
      "TTT,,,,,,,TTT,,,dd,,TTTTTTTTTT",
      "TTT,,ff,,,,,,,,,dd,GTTTTTTTTTT",
      "TTT,,,,,G,TTT,,,dd,,TTTTTTTTTT",
      "TTTY,,,,,,TT,,,dd,,TTTTTTTTTTT",
      "TTTTTTTTTTTG,,dd,TTTTTTTTTTTTT",
      "TTTTTTTTTT,,,dd,,TTTTTTTTTTTTT",
      "TTTTTTTTTT,,,dd,,TTTTTTTTTTTTT",
      "TTTTTTTTTT,,,dd,,%TTTTTTTTTTTT",
      "TTTTTTTTTTT,,,dd,,TTTTTTTTTTTT",
      "TTTTTTTTTTTT,,dd,TTTTTTTTTTTTT",
      "TTTTTTTTTTT,,,dd,,TTTTTTTTTTTT",
    ],
    lights: [[6, 12, '#c0f0d0', 3], [23, 7, '#c0f0d0', 3]],
    entries: { from_world: [14, 20, 'up'], from_heart: [15, 1, 'down'] },
    exits: [
      { at: [11, 21, 7, 1], to: 'world', loc: 'sleeping_forest' },
      { at: [13, 0, 5, 1], to: 'forest_heart', entry: 'from_south' },
    ],
    objects: [
      { at: [3, 14], talk: function* (s) { yield s.msg('An old stump, soft with moss. The whole forest smells of rain and sleep.'); } },
    ],
    onEnter: function* (s) {
      if (s.has('lunar_harp') && !s.flag('c8_forest_awake')) {
        s.set('c8_forest_awake');
        s.music('none');
        yield s.msg('The Lunar Harp begins to hum... and then, all on its own, to play.\nA soft, clear melody drifts out between the trees.');
        s.flash('#e0fff0', 40, 0.4);
        s.music('cry');
        yield s.caption('The forest stirs.\nThe heavy haze between the trees lifts,\nand somewhere to the north, a path opens.', { hold: 160, bg: 'rgba(0,20,10,0.6)' });
        yield s.say('cloud', "(Aeris came through here. I can feel it.)");
        return;
      }
      if (!s.flag('c8_forest_seen')) {
        s.set('c8_forest_seen');
        yield s.msg('A deep, silent forest. The air is thick and heavy... every step feels drowsy, like walking through a dream.');
      }
    },
  });

  // the top-view clearing: the Kjata materia flickers in and out at the edges of the forest
  const KJATA = [[4, 11], [29, 6], [28, 17]];
  const kjataGone = s => KJATA.some((p, i) => s.flag('got_forest_kjata_' + i));
  FF7.defineMap('forest_heart', {
    name: 'Sleeping Forest', area: 'Sleeping Forest', theme: 'forest', music: 'blackcape', look: FOREST,
    camera: { dist: 12, pitch: 68 },
    grid: [
      "TTTTTTTTTTTTTTT,,d,,TTTTTTTTTTTTTT",
      "TTTTTTTTTTTTTTT,,d,,TTTTTTTTTTTTTT",
      "TTTTTTTTTTTTTTT,,d,,TTTTTTTTTTTTTT",
      "TTTTTTTTTTTTTTT,,d,,TTTTTTTTTTTTTT",
      "TTTTTTTTTTTTTTT,,d,,TTTT,,,,,f,,TT",
      "TTTTTTTTTTTTTT,,d,,,,,,,,,,G,,,,TT",
      "TTTTTTTTTTTTT,,d,,T,,,,,,,,,,,,,TT",
      "TTTTTTTTTTTTT,,d,,TTTTTT,,%,,,G,TT",
      "TTTTTTTTTTTTTT,,d,,TTTTTTTTTTTTTTT",
      "TT,,,,,,%,TTTTTT,,d,,TTTTTTTTTTTTT",
      "TT,,G,,,,,,,,,,,,,,d,,TTTTTTTTTTTT",
      "TT,,,,,,,,,,,,,,,,,d,,TTTTTTTTTTTT",
      "TT,f,,,G,,TTTTTT,,d,,TTTTTTTTTTTTT",
      "TTTTTTTTTTTTTT,,d,,TTTTTTTTTTTTTTT",
      "TTTTTTTTTTTT,,d,,TTTTTTTTTTTTTTTTT",
      "TTTTTTTTTTT,,d,,TTTTTTT,,,,,G,,TTT",
      "TTTTTTTTTTT,,d,,T,,,,,,,,,,,,,,TTT",
      "TTTTTTTTTTTT,,d,,,,,,,,,,G,,,,,TTT",
      "TTTTTTTTTTTTT,,d,,TTTTT,f,,,,,,TTT",
      "TTTTTTTTTTTTTT,,d,,TTTTTTTTTTTTTTT",
      "TTTTTTTTTTTTTT,,d,,TTTTTTTTTTTTTTT",
      "TTTTTTTTTTTTTT,,d,,TTTTTTTTTTTTTTT",
    ],
    lights: [[4, 11, '#ffb0a0', 2], [29, 6, '#ffb0a0', 2], [28, 17, '#ffb0a0', 2]],
    entries: { from_south: [16, 20, 'up'], from_trunk: [17, 1, 'down'] },
    exits: [
      { at: [14, 21, 5, 1], to: 'forest_south', entry: 'from_heart' },
      { at: [15, 0, 5, 1], run: function* (s) {
          if (s.flag('c8_forest_awake')) { yield s.goto('forest_trunk', 'from_heart'); return; }
          yield s.msg('The trees seem to shift and close in... No matter which way you walk, the path winds back on itself.');
          yield s.goto('forest_south', 'from_world');
        } },
    ],
    // the red orb shows up at a different edge of the forest on each visit
    items: KJATA.map((p, i) => ({ at: p, materia: 'kujata', id: 'forest_kjata_' + i, if: s => !kjataGone(s) && (FF7.state.steps % KJATA.length) === i })),
    onEnter: function* (s) {
      if (kjataGone(s) || s.flag('c8_kjata_seen')) return;
      s.set('c8_kjata_seen');
      yield s.msg('Something red glints between the trees at the edge of the clearing... then it is gone again.');
    },
  });

  FF7.defineMap('forest_trunk', {
    name: 'Sleeping Forest', area: 'Sleeping Forest', theme: 'forest', music: 'blackcape',
    look: Object.assign({ wallH: 1.4, floor3: ['#6a4a2a', '#624428'] }, FOREST),
    battle: { table: 'corral_valley', bg: 'forest', rate: 0.8 },
    grid: [
      "TTTTTTTTTTTTTTddddTTTTTTTTTTTTTTTT",
      "TTT,,,,,,,,,,,,dd,,,,,,,,,,,,Y,TTT",
      "TTT,Y,,,,,,,,,,dd,,,,G,,,,,,,,,TTT",
      "TTT,,,,G,,,,,,,dd,,,,,,,,,,,,,,TTT",
      "TTT,,,,,,,,,,,,dd,,,,,,,,,,,,,,TTT",
      "TTT,,,,,,,,R,,,dd,,,,,,,,,G,,,,TTT",
      "TTT,,,,,,f,,,,,dd,,,,,,,,,,,,,,TTT",
      "TTT,,,,,,,,,,,,dd,,,,,,,,,,,,,,TTT",
      "Thhhhhhhhhhhhhhh::hhhhhhhhhhhhhhhT",
      "Thhddddhhhhhhhhh::hhhhhhhhhhhhhhhT",
      "Thhddddhhhhhhhhh::hhhhhhhhhhhhhhhT",
      "TT,,,,,,,,,,,,,dddd,,,,,,,,,,,,YTT",
      "TT,,,,,,,,R,,,,dddd,,,,,,G,,,,,,TT",
      "TT,,,G,,,,,,,,,dddd,,,,,,,,,,,,,TT",
      "TT,,,,,,,,,,,,,dddd,ff,,,,,,,,,,TT",
      "TT,,,,,,,,,,,,,dddd,,,,,R,,,,,,,TT",
      "TT,,,,,,,G,,,,,dddd,,,,,,,,,,,,,TT",
      "TT,,,,,,,,,,,,,dddd,,,,,,,,,,G,,TT",
      "TTY,,,,,,,,,,,,dddd,,,,,,,,,,,,,TT",
      "TTTTTTTTTTTTTTTddddTTTTTTTTTTTTTTT",
    ],
    entries: { from_heart: [16, 18, 'up'], from_north: [15, 1, 'down'] },
    exits: [
      { at: [15, 19, 4, 1], to: 'forest_heart', entry: 'from_trunk' },
      { at: [14, 0, 4, 1], to: 'world', loc: 'sleeping_forest_n' },
    ],
    chests: [{ at: [4, 9], item: 'water_ring', id: 'forest_trunk_water_ring' }],
    objects: [{ at: [10, 10], talk: function* (s) { yield s.msg('A colossal tree has fallen across the valley. Its trunk is hollow, wide enough to walk through.'); } }],
    onEnter: function* (s) {
      if (s.flag('c8_trunk_seen')) return;
      s.set('c8_trunk_seen');
      yield s.say('cloud', "(A tree this big... The path goes right through it. And beyond it... north.)");
    },
  });
})();
