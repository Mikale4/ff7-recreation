// Chapter 5a (part 1) — Kalm: the town gate, the square, houses, shops, the inn where the party
// regroups, the start of Cloud's story (the flashback itself is in part2/part3), the aftermath
// and the PHS. (Dialogue paraphrased; see docs/SCRIPTING.md.)
//
// Flags: c5a_arrived (party went ahead to the inn), c5a_story_start (flashback begun),
// c5a_fb_end (flashback finished, set in part3), c5a_flashback_done (aftermath done, PHS given),
// shared: has_phs. Vars: c5a_party (party before the flashback, "id,id"), aff_<char> (FF7 date affection, read by FF7.story.affection).
(function () {
  const MEMBERS = ['barret', 'tifa', 'aeris', 'redxiii'];

  FF7.world.link('kalm', { map: 'kalm_gate', entry: 'from_world' });

  // party members walking with Cloud (besides Cloud himself)
  const companions = (s) => MEMBERS.filter(id => s.inParty(id));
  // FF7's hidden affection points (used by the Gold Saucer date)
  const date = (s, id, n) => { s.inc('aff_' + id, n); };
  // the two Mako questions in the house by the inn: points for whoever is in the party, sign +1 for the
  // anti-Mako answer (Barret 2, Aeris 1, Tifa 1, Yuffie -1), -1 for the pro-Mako one
  const makoPts = (s, sign) => {
    const d = {};
    [['barret', 2], ['aeris', 1], ['tifa', 1], ['yuffie', -1]].forEach(([id, n]) => { if (s.inParty(id)) d[id] = n * sign; });
    return d;
  };
  // Disc 2+ town chatter
  const late = (s) => s.flag('meteor');
  // show the gathered party in the inn room only between arrival and the end of the story
  const gathered = (id) => (s) => s.flag('c5a_arrived') && !s.flag('c5a_flashback_done') && s.isMember(id);

  // ------------------------------------------------------------------ town gate
  // Kalm, as in FF7: a stone town of tall half-timbered houses (white plaster, dark timber, blue
  // slate roofs) round a blue-grey cobbled plaza. No trees, lawns or hedges.
  const KALM_LOOK = {
    floor: ['#5a6480', '#545e78'], floor2: ['#7c8090', '#747888'], floor3: ['#dcd4c2', '#d4ccba'],
    wall: '#8a8c98', wallTop: '#34405e', roof: '#3a4868', trim: '#3a2a1a', wallH: 2.6,
    metal: ['#5a4034', '#4e382e'], wood: ['#6a4a2a', '#62422a'],
    sky: ['#3a5078', '#9ab0c8'], fog: { color: [0.36, 0.44, 0.58], near: 14, far: 34 },
  };
  // high camera from the south-east, looking north-west over the plaza (02-flashblack01)
  const KALM_CAM = { yaw: 25, pitch: 58, dist: 11.5 };

  // ------------------------------------------------------------------ town gate (the inn plaza)
  // The inn stands on the west side with its sign; the boiler with its lattice tower sits on a
  // round stone dais right of centre; a stone stair climbs east to a terrace stacked with crates.
  FF7.defineMap('kalm_gate', {
    name: 'Kalm', area: 'Kalm', theme: 'town', music: 'ahead', look: KALM_LOOK, camera: KALM_CAM,
    legend: { 'T': 'block' },
    grid: [
      "hhhhhhhhhhhhhh::::hhhhhhhhhhhhhh",
      "hhhhhhhhhhhhhh::::hhhhhhhhhhhhhh",
      "hhhhhhhhhhhhhh::::hhhhhhwhhw+hwh",
      "hhhhhhhhhwhhwh::::hwhwhBB.....oB",
      "hhhhhhhh..l............B........",
      "hhhhhhhh...............o.......B",
      "hhhhhhhh...............B........",
      "hhhhhhhh.........TTTo......^^^oB",
      "hwhwh+wh........oTTTP......^^^..",
      "h......!.........TTTo......^^^..",
      "h.................oP...........=",
      "h..............................=",
      "ho......................l......=",
      "hoo.........!..................=",
      "#############......#############",
    ],
    heights: [
      "00000000000000000000000555555555",
      "00000000000000000000000555555555",
      "00000000000000000000000555555555",
      "00000000000000000000000555555555",
      "00000000000000000000000555555555",
      "00000000000000000000000555555555",
      "00000000000000000000000555555555",
      "00000000000000000000000000044400",
      "00000000000000000000000000022200",
      "00000000000000000000000000011100",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
    ],
    // steep slate roofs over the half-timbered blocks; the boiler (an iron tank with pipes and a valve)
    // on its round stone dais, its lattice tower rising above the plaza with a lamp at the top
    buildings: [
      { at: [0, 0, 14, 4], top: 'gable', ridge: 'x', rise: 1.1 },
      { at: [0, 4, 8, 5], top: 'gable', ridge: 'x', rise: 1.0 },
      { at: [18, 0, 5, 4], top: 'gable', ridge: 'z', rise: 0.9 },
      { at: [23, 0, 9, 3], top: 'gable', ridge: 'x', rise: 0.8 },
    ],
    props: [
      { at: [18, 8], prop: 'disc', r: 1.75, h: 0.3, sides: 16, col: '#7c808c', top: '#8a8e98', rim: '#6a6e78', rimW: 0.2 },
      { at: [18, 8], prop: 'barrel', col: '#4e4640', scale: [2.7, 2.1, 2.7], lift: 0.3 },
      { at: [18, 8], prop: 'pylon', h: 3.4, w: 0.9, top: 0.36, col: '#4a4038', lamp: '#ffc070', lift: 1.2 },
      { at: [17, 9], prop: 'pipes', col: '#5a4034', lift: 0.3, scale: 0.8 },
      { at: [19, 9], prop: 'valve', col: '#a03020', lift: 0.3, rot: -40, h: 0.5 },
      { at: [19, 7], prop: 'pipes', col: '#5a4034', lift: 0.3, rot: 90, scale: 0.8 },
    ],
    lights: [[18, 10, '#ffa050', 1.6], [7, 9, '#ffe0a0', 2], [10, 5, '#ffe8b0', 2], [24, 12, '#ffe8b0', 2]],
    entries: {
      from_world: [16, 13, 'up'], from_square: [15, 1, 'down'],
      from_inn: [5, 9, 'down'], from_house_a: [28, 3, 'down'],
    },
    exits: [
      { at: [13, 14, 6, 1], to: 'world', loc: 'kalm', if: s => s.flag('c5a_flashback_done'),
        blocked: function* (s) {
          yield s.say('cloud', "(Everyone's waiting at the inn. I should hear them out first.)");
        } },
      { at: [14, 0, 4, 1], to: 'kalm_square', entry: 'from_gate' },
      { at: [5, 8, 1, 1], to: 'kalm_inn', entry: 'from_town', sfx: 'door' },
      { at: [28, 2, 1, 1], to: 'kalm_house_a', entry: 'from_town', sfx: 'door' },
    ],
    npcs: [
      { id: 'gate_man', name: 'Man', model: 'man2', at: [11, 9], dir: 'down',
        talk: function* (s) {
          if (late(s)) { yield s.say('Man', "Every night I look up and that... thing is a little bigger. Meteor, they're calling it. What are we supposed to do, hide under the table?"); return; }
          yield s.say('Man', "Welcome to Kalm. It's a quiet little town, but we like it that way.\fMidgar's power lines reach all the way out here, so we've got Mako lights and hot water. Can't complain.");
        } },
      { id: 'gate_granny', name: 'Old Woman', model: 'oldwoman', at: [4, 10], dir: 'down',
        talk: function* (s) {
          if (!s.flag('c5a_flashback_done')) { yield s.say('Old Woman', "Oh, are you with the group that went into the inn? They looked like they had a lot on their minds, dear."); return; }
          yield s.say('Old Woman', "The inn's right behind me. A soft bed does wonders after a long walk across the plains.");
        } },
      { id: 'gate_kid', name: 'Boy', model: 'kid2', at: [23, 11], dir: 'left', wander: 2,
        talk: function* (s) {
          if (late(s)) { yield s.say('Boy', "My mom says we're safe as long as we stay indoors. ...Is that true, mister?"); return; }
          yield s.say('Boy', "Did you come from Midgar? My dad says the sky over there glows green at night.\fI heard a reactor blew up! Boom!");
          if (s.inParty('barret')) { yield s.say('barret', "......"); }
        } },
      { id: 'gate_dog', name: 'Dog', model: 'dog', at: [3, 12], dir: 'right', wander: 2,
        talk: function* (s) { yield s.msg('Woof!'); } },
    ],
    objects: [
      { at: [12, 13], talk: function* (s) { yield s.msg('"KALM"\nA restful town on the road east of Midgar.'); } },
      { at: [7, 9], talk: function* (s) { yield s.msg('"INN"'); } },
      { at: [18, 8], talk: function* (s) { yield s.msg('The town boiler rumbles away on its stone dais, fed by Mako power from Midgar.'); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c5a_arrived')) return;
      s.set('c5a_arrived');
      const comp = companions(s);
      const lines = {
        barret: "The rest of 'em already went on to the inn. C'mon! You got a whole lotta explainin' to do.",
        tifa: "The others went on ahead to the inn, Cloud. ...Let's go. They're waiting.",
        aeris: "Everybody's waiting at the inn! Come on, don't keep them waiting too long.",
        redxiii: "The others have gone ahead to the inn. I will join them. Do not dawdle.",
      };
      comp.forEach((id, i) => s.spawn(id, id, 14 + i * 2, 13, 'up'));
      if (comp.length) {
        yield comp.map((id, i) => s.move(id, 14 + i * 2, 11));
        yield s.face(comp[0], 'player');
        yield s.say(comp[0], lines[comp[0]]);
        yield comp.map((id, i) => s.run(id, [[14 + i, 10], [5, 10], [5, 9], [5, 8]]));
        comp.forEach(id => s.remove(id));
      }
      yield s.say('cloud', "(Everyone's gathered at the inn...)");
    },
  });

  // ------------------------------------------------------------------ town square
  FF7.defineMap('kalm_square', {
    name: 'Kalm', area: 'Kalm', theme: 'town', music: 'ahead', look: KALM_LOOK, camera: KALM_CAM,
    // paved like the inn plaza: shops along the north, a house on each side with its door facing
    // the square, stone roads (':') on the blue cobbles, and the old well in the middle
    grid: [
      "hhXXhhhhhhhhhhhhhhhhhhhhXXhhhhhhhhhh",
      "hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh",
      "hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh",
      "hhhhhhhwh+hwhh+hwhh+hwhwh+hwhhhhhhhh",
      "hhhhhhh..:....:....:.....:...hhhhhhh",
      "hhXhhhh.l..................l.hhhhhhh",
      "hhhhhhh......................hhhhhhh",
      "hhhhhhh.oo..................Bhhhhhhh",
      "hhhhhhh......................hhhhhhh",
      "hwhh+wh.........OO...........hw+hwhh",
      "h...............OO.................h",
      "h..................................h",
      "h.......l.................l........h",
      "h::::::::::::::::::::::::::::::::::h",
      "h..............::::::..............h",
      "ho.............::::::............B.h",
      "hoo............::::::...........BB.h",
      "ho.............::::::.............Bh",
      "###############......###############",
    ],
    lights: [[8, 5, '#ffe8b0', 2], [27, 5, '#ffe8b0', 2], [8, 12, '#ffe8b0', 2], [26, 12, '#ffe8b0', 2]],
    entries: {
      from_gate: [17, 17, 'up'], from_item: [9, 4, 'down'], from_weapon: [14, 4, 'down'],
      from_materia: [19, 4, 'down'], from_clock: [25, 4, 'down'], from_tower: [4, 10, 'down'],
      from_far: [31, 10, 'down'],
    },
    exits: [
      { at: [15, 18, 6, 1], to: 'kalm_gate', entry: 'from_square' },
      { at: [9, 3, 1, 1], to: 'kalm_item', entry: 'from_town', sfx: 'door' },
      { at: [14, 3, 1, 1], to: 'kalm_weapon', entry: 'from_town', sfx: 'door' },
      { at: [19, 3, 1, 1], to: 'kalm_materia', entry: 'from_town', sfx: 'door' },
      { at: [25, 3, 1, 1], to: 'kalm_house_clock', entry: 'from_town', sfx: 'door' },
      { at: [4, 9, 1, 1], to: 'kalm_house_tower', entry: 'from_town', sfx: 'door' },
      { at: [31, 9, 1, 1], to: 'kalm_house_far', entry: 'from_town', sfx: 'door' },
    ],
    objects: [
      { at: [16, 9], talk: function* (s) { yield s.msg("The town well. The water is cold and clear."); } },
      { at: [17, 10], talk: function* (s) { yield s.msg("The town well. The water is cold and clear."); } },
    ],
    npcs: [
      { id: 'sq_man', name: 'Man', model: 'man6', at: [12, 13], dir: 'down',
        talk: function* (s) {
          if (late(s)) { yield s.say('Man', "Shinra says they've got a plan for the Meteor. Shinra ALWAYS says they've got a plan."); return; }
          yield s.say('Man', "Word is some terrorists blew up a Mako reactor in Midgar. AVALANCHE, or something like that.\fGlad I live way out here.");
          if (s.inParty('barret')) yield s.say('barret', "(Hmph... If he only knew.)");
        } },
      { id: 'sq_woman', name: 'Woman', model: 'woman4', at: [24, 12], dir: 'down',
        talk: function* (s) {
          if (late(s)) { yield s.say('Woman', "My husband wants to move to Junon. Says the big cannon there will protect us. I don't know what to believe anymore."); return; }
          yield s.say('Woman', "A few days ago a man in a long black cape shuffled through town, mumbling to himself.\fHe didn't look well at all... Gave me the chills.");
          yield s.say('cloud', "(A man in a black cape...?)");
        } },
      { id: 'sq_kid', name: 'Girl', model: 'girl3', at: [9, 15], dir: 'right', wander: 3,
        talk: function* (s) { yield s.say('Girl', "Tag! You're it! ...Hey, you're supposed to chase me!"); } },
      { id: 'sq_old', name: 'Old Man', model: 'oldman2', at: [26, 15], dir: 'left',
        talk: function* (s) {
          yield s.say('Old Man', "The shops are along the north side. Item shop on the left, weapons in the middle, and materia on the right.\fThe materia fellow gets stock you won't find in Midgar, I hear.");
        } },
    ],
  });

  // ------------------------------------------------------------------ inn, ground floor
  FF7.defineMap('kalm_inn', {
    camera: { yaw: 30, pitch: 56, dist: 9.5 },   // high diagonal view (02-flashblack02)
    name: 'Kalm Inn', area: 'Kalm', theme: 'house', music: 'ahead',
    grid: [
      "####################",
      "#kqk#wwwwwwwww#::#w#",
      "#...#.........#^^###",
      "#DDD#.........#^^###",
      "#..................#",
      "#.......c.c........#",
      "#......ctctc.......#",
      "#.......c.c........#",
      "#.o..............%.#",
      "#..................#",
      "#########++#########",
    ],
    heights: [
      "00000000000000000000",
      "00000000000000044000",
      "00000000000000022000",
      "00000000000000022000",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
    ],
    entries: { from_town: [9, 9, 'up'], from_2f: [15, 4, 'down'] },
    exits: [
      { at: [9, 10, 2, 1], to: 'kalm_gate', entry: 'from_inn', sfx: 'door' },
      { at: [15, 1, 2, 1], to: 'kalm_inn_2f', entry: 'from_1f' },
    ],
    npcs: [
      { id: 'innkeeper', name: 'Innkeeper', model: 'man5', at: [2, 2], dir: 'down',
        talk: function* (s) { yield* innTalk(s); } },
      { id: 'inn_guest', name: 'Traveler', model: 'man8', at: [7, 6], dir: 'right', anim: 'sit',
        talk: function* (s) {
          if (late(s)) { yield s.say('Traveler', "I was headed for Junon, but with that rock in the sky... I think I'll just stay put and drink."); return; }
          yield s.say('Traveler', "Going east? Watch yourselves out on the marshes past the Chocobo Farm.\fSomething huge lives in there. Folks say it swallows travelers whole.");
        } },
      { id: 'inn_woman', name: 'Woman', model: 'woman6', at: [13, 8], dir: 'left',
        talk: function* (s) { yield s.say('Woman', "The rooms upstairs are nice and quiet. My husband snores, though, so not MY room."); } },
    ],
    triggers: [
      { at: [1, 3, 3, 1], on: 'talk', run: function* (s) { yield* innTalk(s); } },
    ],
  });

  function* innTalk(s) {
    if (!s.flag('c5a_flashback_done')) {
      yield s.say('Innkeeper', "Welcome! Oh, you must be with the group that just checked in. They're waiting for you upstairs.");
      return;
    }
    yield s.inn(20, { who: 'Innkeeper', text: "Welcome to the Kalm Inn! It's 20 Gil for the night. Will you be staying?" });
  }

  // ------------------------------------------------------------------ inn, upstairs room
  FF7.defineMap('kalm_inn_2f', {
    name: 'Kalm Inn', area: 'Kalm', theme: 'house',
    music: s => (s.flag('c5a_arrived') && !s.flag('c5a_story_start')) || (s.flag('c5a_fb_end') && !s.flag('c5a_flashback_done')) ? 'anxious' : 'ahead',
    grid: [
      "####################",
      "#b..wwww.b..wwww.b.#",
      "#b.......b.......b.#",
      "#..................#",
      "#.......t..........#",
      "#......c.c.........#",
      "#..................#",
      "#j.................#",
      "#............q.....#",
      "##############^^####",
    ],
    entries: { from_1f: [14, 7, 'up'], after_flashback: [10, 6, 'up'] },
    exits: [{ at: [14, 9, 2, 1], to: 'kalm_inn', entry: 'from_2f' }],
    npcs: [
      { id: 'barret', model: 'barret', at: [11, 3], dir: 'down', show: gathered('barret'),
        talk: function* (s) { yield s.say('barret', "C'mon, spit it out already."); } },
      { id: 'tifa', model: 'tifa', at: [9, 2], dir: 'down', anim: 'sit', show: gathered('tifa'),
        talk: function* (s) { yield s.say('tifa', "......"); } },
      { id: 'aeris', model: 'aeris', at: [6, 4], dir: 'right', show: gathered('aeris'),
        talk: function* (s) { yield s.say('aeris', "Go on. We're all listening."); } },
      { id: 'redxiii', model: 'redxiii', at: [15, 5], dir: 'left', show: gathered('redxiii'),
        talk: function* (s) { yield s.say('redxiii', "I would hear this story as well."); } },
    ],
    objects: [
      // FF7: examine the cabinet left of the stairs five times for a Megalixir
      { at: [13, 8], talk: function* (s) {
        if (!s.flag('c5a_flashback_done') || s.flag('c5a_megalixir')) { yield s.msg('An old wooden cabinet.'); return; }
        const n = s.inc('c5a_cabinet');
        const pages = ['An old wooden cabinet. Nothing in the top drawer.', "The bottom drawer seems stuck...", 'Something rattles inside.', "The drawer is almost loose..."];
        if (n < 5) { yield s.msg(pages[Math.min(n, 4) - 1]); return; }
        s.set('c5a_megalixir');
        yield s.msg('The drawer finally slides open!');
        yield s.give('megalixir');
      } },
      { at: [8, 4], talk: function* (s) { yield s.msg('A small table. Someone left a cup of tea to go cold.'); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c5a_arrived') && !s.flag('c5a_story_start')) { yield* FF7.story.c5a_meeting(s); return; }
      if (s.flag('c5a_fb_end') && !s.flag('c5a_flashback_done')) { yield* FF7.story.c5a_aftermath(s); }
    },
  });

  // ---- the party asks Cloud about Sephiroth
  FF7.story.c5a_meeting = function* (s) {
    s.set('c5a_story_start');
    s.music('anxious');
    yield s.move('player', [[14, 6], [10, 6]]);
    yield s.face('player', 'up');
    const here = (id) => s.isMember(id);
    if (here('barret')) {
      yield s.face('barret', 'player');
      yield s.say('barret', "About time. Pull up a chair and start talkin'.\fThis Sephiroth guy. Who the hell is he, and what's he got to do with you?");
    }
    yield s.say('cloud', "......");
    if (here('aeris')) yield s.say('aeris', "You knew him, didn't you? From back when you were in SOLDIER.");
    yield s.say('cloud', "...Sephiroth was a SOLDIER. The best there ever was. Back then, every kid in the world knew his name.\fHe's the reason I joined SOLDIER. I wanted to be strong... like him.");
    if (here('redxiii')) yield s.say('redxiii', "A hero, then. Yet this hero left a trail of blood through the Shinra building.");
    if (here('barret')) yield s.say('barret', "Heroes don't go 'round skewerin' presidents.");
    yield s.say('cloud', "...Something changed him. Five years ago, Sephiroth disappeared. The papers said he died.");
    if (here('tifa')) { yield s.emote('tifa', '...'); yield s.say('tifa', "......"); }
    yield s.say('cloud', "I'll tell you what I know. It happened in my hometown... Nibelheim.");
    if (here('barret') && here('tifa')) {
      yield s.say('barret', "Nibelheim? Ain't that where you and Tifa grew up?");
      yield s.say('tifa', "......Yeah.");
    }
    s.music('fiveyears');
    yield s.say('cloud', "It was my first big mission after I made First Class. They sent me with Sephiroth...");
    // remember the current party, then Cloud tells the story: Sephiroth joins as a guest
    s.setVar('c5a_party', companions(s).join(','));
    yield s.fadeOut(60);
    s.party(['cloud', 'sephiroth']);
    yield s.caption('Five years ago...', { hold: 180, bg: '#000' });
    yield s.goto('fb_truck', 'start');
  };

  function restoreParty(s) {
    const saved = s.get('c5a_party');
    const comp = typeof saved === 'string' && saved ? saved.split(',').filter(id => MEMBERS.includes(id)) : [];
    s.leave('sephiroth');
    s.party(['cloud'].concat(comp));
  }

  // ---- back in Kalm: reactions, Barret, the PHS
  FF7.story.c5a_aftermath = function* (s) {
    restoreParty(s);
    s.music('anxious');
    const here = (id) => s.isMember(id);
    yield s.wait(40);
    yield s.say('cloud', "......That's it.");
    if (here('barret')) {
      yield s.say('barret', "Whaddya mean, 'that's it'?! What happened next? Did you take Sephiroth down or not!?");
      yield s.say('cloud', "......I don't remember.");
      yield s.say('barret', "You don't REMEMBER!?");
    }
    yield s.say('cloud', "It's like there's a hole where the rest should be.\fBut when I think about how strong he really was... there's no way I could have beaten him.");
    if (here('aeris')) {
      yield s.say('aeris', "But the news said Sephiroth died. Right?");
      yield s.say('cloud', "That was Shinra's official story. I wanted to know what really happened, too.");
    }
    if (here('redxiii')) yield s.say('redxiii', "And now he walks again. He took Jenova's body from the Shinra building... What could he want with it?");
    if (here('barret')) {
      yield s.say('barret', "Jenova, Cetra, the Promised Land... This stuff's makin' my head spin.\fBut I know one thing. If Sephiroth and Shinra are both after the same thing, it ain't gonna be good for the planet.");
    }
    if (here('tifa')) {
      yield s.face('player', 'tifa');
      yield s.say('cloud', "...Tifa. You were there. Did I get anything wrong?");
      yield s.emote('tifa', '!');
      yield s.say('tifa', "......No. It's... just like you said.");
      yield s.face('tifa', 'down');
      yield s.emote('tifa', '...');
      if (here('aeris')) {
        yield s.say('aeris', "Tifa? Are you okay?");
        yield s.say('tifa', "I'm fine. Really. It's just... hard to hear it all again.");
      }
      yield s.face('player', 'up');
    }
    if (here('redxiii')) yield s.say('redxiii', "Sephiroth will not stop. Neither, I think, should we.");
    if (here('barret')) yield s.say('barret', "Then it's settled! We're goin' after Sephiroth. Let's move out!");
    // everyone heads downstairs except Barret
    const leavers = ['tifa', 'aeris', 'redxiii'].filter(here);
    for (const id of leavers) {
      s.move(id, [[13, 7], [14, 8], [14, 9]], { noWait: true });
      yield s.wait(28);
    }
    if (leavers.length) {
      yield s.wait(50);
      leavers.forEach(id => s.hide(id));
    }
    if (here('barret')) {
      yield s.move('barret', 12, 5);
      yield s.face('barret', 'player');
      const c = yield s.ask('barret', "What're you standin' around for? Let's get goin'!", ['Wait a sec', 'Right'], { date: [{}, { barret: 1 }] });
      if (c === 0) {
        yield s.say('barret', "Huh? What is it?");
        yield s.say('cloud', "...Why are you doing this? Shinra's the one you're after.");
        yield s.say('barret', "You gotta ask? This planet's dyin', and Shinra's bleedin' it dry. Now Sephiroth's out there too, and if he gets what he wants, there won't BE a planet left.\fI'm gonna save it. For Marlene, and for everybody who's gonna live on it after us. That's the long and short of it!");
        const c2 = yield s.ask('cloud', '', ['Beautiful, just beautiful!', 'Is that all?'], { date: [{ barret: 3 }, { barret: -1 }] });
        if (c2 === 0) {
          date(s, 'barret', 3);
          yield s.say('barret', "Heh... When you say it back to me like that, it sounds kinda corny.\f...But I mean every word.");
        } else {
          date(s, 'barret', -1);
          yield s.say('barret', "'Is that all'!? Whaddya mean, is that all!? ...Hmph! Forget I said anything!");
        }
      } else {
        date(s, 'barret', 1);
        yield s.say('barret', "Good.");
      }
      yield s.say('barret', "Oh, and before I forget. Here, take this.");
    } else {
      yield s.say('cloud', "(...Someone left this on the table for me.)");
    }
    s.sfx('phs');
    yield s.give('phs');
    s.phs(true);
    s.set('has_phs');
    if (here('barret')) {
      yield s.say('barret', "It's a PHS. Walkin' around in one big mob is just askin' for Shinra to spot us, so we split up into teams.\fYou're callin' the shots. Pick who goes with you, and if you need somebody else, just give 'em a ring on that thing.");
    }
    yield s.msg('With the PHS you can change party members at save points and on the world map.');
    yield s.choosePArty(['cloud']);
    if (here('barret')) {
      yield s.move('barret', [[14, 7], [14, 9]]);
      s.hide('barret');
    }
    s.set('c5a_flashback_done');
    s.music('ahead');
  };

  // ------------------------------------------------------------------ house next to the inn
  // (the woman who likes Mako, the girl upstairs, an Ether behind the little door under the stairs)
  FF7.defineMap('kalm_house_a', {
    name: 'Kalm', area: 'Kalm', theme: 'house', music: 'ahead',
    grid: [
      "######################",
      "#kk......^^.......b.b#",
      "#........^^.......b.b#",
      "#..t.....qq....q.....#",
      "#.ctc....qq..........#",
      "#..........==========#",
      "#....................#",
      "#..f............t....#",
      "#..............ctc...#",
      "#....................#",
      "#j.................o.#",
      "##########++##########",
    ],
    heights: [
      "0000000000044444444444",
      "0000000002244444444444",
      "0000000002244444444444",
      "0000000000044444444444",
      "0000000000044444444444",
      "0000000000044444444444",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
    ],
    entries: { from_town: [10, 10, 'up'] },
    exits: [{ at: [10, 11, 2, 1], to: 'kalm_gate', entry: 'from_house_a', sfx: 'door' }],
    npcs: [
      { id: 'mako_woman', name: 'Woman', model: 'woman2', at: [5, 7], dir: 'down',
        talk: function* (s) {
          if (s.flag('c5a_mako_asked')) { yield s.say('Woman', "Say what you like, I'm not giving up my hot baths."); return; }
          const DP = [makoPts(s, -1), makoPts(s, 1)];   // agreeing with her is the pro-Mako answer
          const c = yield s.ask('Woman', "Mako energy sure makes life easy, doesn't it? Lights at the flip of a switch, warm water whenever you like.\fIt's the best thing that ever happened to us. Don't you think?", ['Yeah, maybe', "You're full of it"], { date: DP });
          s.set('c5a_mako_asked');
          FF7.story.datePts(s, DP[c]);
          if (c === 0) {
            yield s.say('Woman', "See? I knew you'd understand. Life's too short to worry about where the light comes from.");
          } else {
            yield s.say('Woman', "Hmph! Well, excuse me! I suppose you'd rather live by candlelight.");
          }
        } },
      { id: 'loft_girl', name: 'Girl', model: 'girl', at: [16, 2], dir: 'down',
        talk: function* (s) {
          if (s.flag('c5a_old_asked')) { yield s.say('Girl', "Grandpa's stories about the old days are the best."); return; }
          const DP = [makoPts(s, 1), makoPts(s, -1)];   // agreeing with her grandpa is the anti-Mako answer
          const c = yield s.ask('Girl', "My grandpa says life was better before Mako. People worked hard, and the stars were brighter.\fDo you think the old life was better?", ['Yeah, maybe', 'No way'], { date: DP });
          s.set('c5a_old_asked');
          FF7.story.datePts(s, DP[c]);
          if (c === 0) {
            yield s.say('Girl', "Really? I'll tell Grandpa! He'll be so happy somebody agrees with him.");
          } else {
            yield s.say('Girl', "Yeah... I'd miss the lights, too. Don't tell Grandpa I said that.");
          }
        } },
    ],
    objects: [
      { at: [9, 4], talk: function* (s) {
        if (s.flag('c5a_ether_a')) { yield s.msg('A little storage door under the stairs. Just brooms and dust now.'); return; }
        s.set('c5a_ether_a');
        yield s.msg('There\'s a little door under the stairs...\nSomething is tucked away inside.');
        yield s.give('ether');
      } },
      { at: [15, 3], talk: function* (s) { yield s.msg('A dresser full of neatly folded clothes.'); } },
    ],
  });

  // ------------------------------------------------------------------ middle house (clock tower)
  FF7.defineMap('kalm_house_clock', {
    name: 'Kalm', area: 'Kalm', theme: 'house', music: 'ahead',
    grid: [
      "######################",
      "#b.b..q...^^......kq.#",
      "#b.b......^^.........#",
      "#.........qq..B......#",
      "#.........qq.........#",
      "#=========....ctc....#",
      "#....................#",
      "#..f.............%...#",
      "#j..................o#",
      "#....................#",
      "##########++##########",
    ],
    heights: [
      "0000000000000000000000",
      "0444444444220000000000",
      "0444444444220000000000",
      "0444444444000000000000",
      "0444444444000000000000",
      "0444444444000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
    ],
    entries: { from_town: [10, 9, 'up'] },
    exits: [{ at: [10, 10, 2, 1], to: 'kalm_square', entry: 'from_clock', sfx: 'door' }],
    npcs: [
      { id: 'clock_oldman', name: 'Old Man', model: 'oldman', at: [14, 5], dir: 'right', anim: 'sit',
        talk: function* (s) {
          if (late(s)) { yield s.say('Old Man', "At my age, a falling star doesn't scare me much. I only wish I could see my family one more time."); return; }
          yield s.say('Old Man', "That chest over there? It's locked, and I lost the key long ago.\fMy wife and daughter went off to Midgar to find work. I kept all their letters in there... Haven't had one in years.");
        } },
      { id: 'clock_woman', name: 'Woman', model: 'woman5', at: [17, 8], dir: 'up',
        talk: function* (s) { yield s.say('Woman', "The clock up in the tower hasn't lost a minute in fifty years. It's the pride of Kalm, you know."); } },
      { id: 'clock_cat', name: 'Cat', model: 'cat', at: [5, 7], dir: 'right', wander: 2,
        talk: function* (s) { yield s.msg('Mew.'); } },
    ],
    objects: [
      { at: [14, 3], talk: function* (s) { yield s.msg("A sturdy old chest with an iron lock.\nIt won't budge."); } },
      { at: [19, 1], talk: function* (s) { yield s.msg('A tall pendulum clock.\nTick... tock... tick... tock...'); } },
      { at: [6, 1], talk: function* (s) {
        if (s.flag('c5a_ether_clock')) { yield s.msg('An empty cabinet.'); return; }
        s.set('c5a_ether_clock');
        yield s.msg('Something is at the back of the cabinet.');
        yield s.give('ether');
      } },
    ],
  });

  // ------------------------------------------------------------------ the house with the tower
  // (spiral stairs up to the lookout: Peacemaker; the loft: Guard Source)
  FF7.defineMap('kalm_house_tower', {
    name: 'Kalm', area: 'Kalm', theme: 'house', music: 'ahead',
    grid: [
      "##w#####################",
      "#....#.......^^..q....b#",
      "#....#.......^^........#",
      "#....#.......qq........#",
      "####.#.......qq........#",
      "####^=.........========#",
      "####^=.................#",
      "####.=.................#",
      "####^=.................#",
      "####^=.................#",
      "#......................#",
      "###########++###########",
    ],
    heights: [
      "000000000000000000000000",
      "088880000000022444444440",
      "088880000000022444444440",
      "088880000000000444444440",
      "000080000000000444444440",
      "000066000000000444444440",
      "000066000000000000000000",
      "000044000000000000000000",
      "000022000000000000000000",
      "000022000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
    ],
    entries: { from_town: [11, 10, 'up'] },
    exits: [{ at: [11, 11, 2, 1], to: 'kalm_square', entry: 'from_tower', sfx: 'door' }],
    chests: [{ at: [1, 1], item: 'peacemaker', id: 'kalm_tower_peacemaker' }],
    npcs: [
      { id: 'tower_man', name: 'Man', model: 'man3', at: [9, 7], dir: 'down',
        talk: function* (s) { yield s.say('Man', "That tower's the oldest part of Kalm. On a clear day you can see all the way to Midgar from the top.\fNot that there's much to see. Just a big iron pizza, belching smoke."); } },
      { id: 'tower_girl', name: 'Girl', model: 'girl2', at: [19, 2], dir: 'down',
        talk: function* (s) {
          if (late(s)) { yield s.say('Girl', "I keep the curtains closed now. I don't want to see it."); return; }
          yield s.say('Girl', "This is my room! Don't touch anything. ...Especially not my cabinet.");
        } },
      { id: 'tower_kid', name: 'Boy', model: 'kid', at: [15, 8], dir: 'left', wander: 2,
        talk: function* (s) { yield s.say('Boy', "I climbed all the way up the tower stairs by myself! My sister says I'm not allowed. Don't tell her."); } },
    ],
    objects: [
      { at: [17, 1], talk: function* (s) {
        if (s.flag('c5a_guard_source')) { yield s.msg("The girl's cabinet. Nothing else of interest."); return; }
        s.set('c5a_guard_source');
        yield s.give('guard_source');
      } },
    ],
    triggers: [
      { at: [2, 0], on: 'talk', run: function* (s) { yield s.msg('You peek through the little window.\nThe plains roll away toward the dark smudge of Midgar.'); } },
    ],
  });

  // ------------------------------------------------------------------ the house on the right
  // (Ether behind the door under the stairs; the traveler upstairs)
  FF7.defineMap('kalm_house_far', {
    name: 'Kalm', area: 'Kalm', theme: 'house', music: 'ahead',
    grid: [
      "######################",
      "#kk..b...^^.........q#",
      "#...ct...^^..........#",
      "#........qq..........#",
      "#........qq..........#",
      "#========............#",
      "#..............ctc...#",
      "#.o..................#",
      "#f.................%.#",
      "#....................#",
      "##########++##########",
    ],
    heights: [
      "0000000000000000000000",
      "0444444442200000000000",
      "0444444442200000000000",
      "0444444440000000000000",
      "0444444440000000000000",
      "0444444440000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
    ],
    entries: { from_town: [10, 9, 'up'] },
    exits: [{ at: [10, 10, 2, 1], to: 'kalm_square', entry: 'from_far', sfx: 'door' }],
    npcs: [
      { id: 'traveler', name: 'Traveler', model: { base: 'man', top: '#6a5a3a', sleeve: '#6a5a3a', bottom: '#4a4038', hair: '#8a7050', extras: ['beard', 'glasses', 'coat'] },
        at: [4, 2], dir: 'down', anim: 'sit', talk: function* (s) { yield* traveler(s); } },
      { id: 'far_man', name: 'Man', model: 'man7', at: [14, 8], dir: 'up',
        talk: function* (s) {
          yield s.say('Man', "The fellow upstairs has been everywhere. Wutai, the Northern Continent, even the bottom of the sea, if you believe him.\fNow he just sits there, grumbling about the treasures he never found.");
        } },
    ],
    objects: [
      { at: [9, 4], talk: function* (s) {
        if (s.flag('c5a_ether_far')) { yield s.msg('A small door under the stairs. Nothing more inside.'); return; }
        s.set('c5a_ether_far');
        yield s.msg('Behind the little door under the stairs...');
        yield s.give('ether');
      } },
    ],
  });

  // The Kalm Traveller: trades rare items for rewards (FF7 optional quest)
  function* traveler(s) {
    let traded = false;
    if (s.has('guide_book') && !s.flag('c5a_trav_guide')) {
      yield s.say('Traveler', "That book... the Guide Book from the sunken ship! May I have it? I'll give you this in return.");
      s.take('guide_book'); s.set('c5a_trav_guide'); traded = true;
      yield s.giveMateria('underwater');
      yield s.say('Traveler', "Underwater Materia. They say whoever carries it can hold their breath as long as they like, even in the deepest sea.");
    }
    if (s.has('earth_harp') && !s.flag('c5a_trav_harp')) {
      yield s.say('Traveler', "The Earth Harp! Listen to that sound... It's even more beautiful than the stories said. Please, take these!");
      s.take('earth_harp'); s.set('c5a_trav_harp'); traded = true;
      yield s.giveMateria('master_command');
      yield s.giveMateria('master_magic');
      yield s.giveMateria('master_summon');
    }
    if (s.has('desert_rose') && !s.flag('c5a_trav_rose')) {
      yield s.say('Traveler', "A Desert Rose... a flower that blooms once in a lifetime, in sand where nothing grows. Thank you, truly.\fI have something special for you. I'll send it to the Chocobo Farm, it'll be waiting in the stables.");
      s.take('desert_rose'); s.set('c5a_trav_rose'); s.set('c5a_gold_chocobo'); traded = true;
      yield s.msg('A Gold Chocobo will be delivered to the Chocobo Farm stables!');
    }
    if (traded) return;
    if (s.flag('c5a_trav_guide') && s.flag('c5a_trav_harp') && s.flag('c5a_trav_rose')) {
      yield s.say('Traveler', "Thanks to you, my collection is complete. I can finally rest these old legs.");
      return;
    }
    yield s.say('Traveler', "I've walked this world from end to end, but three treasures always slipped through my fingers.\fA Guide Book, lost with a ship that sank beneath the waves. The Earth Harp. And the Desert Rose.\fIf you ever come across any of them, bring them to me. I'll make it worth your while.");
  }

  // ------------------------------------------------------------------ shops
  const shopRoom = (name, deco1, deco2) => [
    "#####wwwwww#####",
    "#" + deco1 + ".......jj" + deco2 + "#",
    "#..............#",
    "#....DDDDDD....#",
    "#..............#",
    "#.o..........B.#",
    "#..............#",
    "#######++#######",
  ];
  const shopMap = (id, name, shop, keeperModel, lines, deco1, deco2, exitEntry) => {
    const run = function* (s) {
      yield s.say('Shopkeeper', late(s) && lines.late ? lines.late : lines.hi);
      yield s.shop(shop);
    };
    FF7.defineMap(id, {
      name: 'Kalm', area: 'Kalm', theme: 'house', music: 'ahead',
      grid: shopRoom(name, deco1, deco2),
      entries: { from_town: [7, 6, 'up'] },
      exits: [{ at: [7, 7, 2, 1], to: 'kalm_square', entry: exitEntry, sfx: 'door' }],
      npcs: [{ id: 'keeper', name: 'Shopkeeper', model: keeperModel, at: [7, 2], dir: 'down', talk: run }],
      triggers: [{ at: [5, 3, 6, 1], on: 'talk', run }],
      objects: [{ at: [2, 1], talk: function* (s) { yield s.msg(lines.shelf); } }],
    });
  };
  shopMap('kalm_item', 'Item Shop', 'kalm_items', 'woman3',
    { hi: "Welcome! Heading out onto the plains? Better stock up. The monsters out there have gotten nasty lately.",
      late: "We're still open! Can't hide from the sky forever, and folks still need Potions.",
      shelf: 'Shelves stacked with Potions and Tents.' }, 'kkk', 'kk', 'from_item');
  shopMap('kalm_weapon', 'Weapon Shop', 'kalm_weapons', 'man4',
    { hi: "Weapons, eh? I've got mythril gear fresh from the mines. Good, honest steel for good, honest people.",
      shelf: 'A rack of polished swords and gauntlets.' }, 'BBB', 'BB', 'from_weapon');
  shopMap('kalm_materia', 'Materia Shop', 'kalm_materia', 'oldman3',
    { hi: "Ah, a materia user. Take a look... Earth, Poison, Heal. You won't find these in Midgar's shops.",
      shelf: 'Glass cases of softly glowing materia.' }, 'qqq', 'qq', 'from_materia');
})();
