// Chapter 10 (part 3) — The Lifestream: inside Cloud's mind.
// Tifa, lost in the Lifestream, finds the scattered pieces of Cloud's consciousness and walks him
// through his memories: the station in Midgar where she found him, Nibelheim five years ago (the
// SOLDIER with black hair — Zack — and the trooper who never took off his helmet), the water tower
// and the real reason for the promise, the sealed-up secret by the fireplace of Tifa's house, and
// finally the Nibelheim reactor, where a Shinra trooper named Cloud stopped Sephiroth.
// Cloud comes back as himself. (Mideel's ruins and the return are in part 1.)
// Abstract green 'lifestream' theme; the player controls Tifa. Dialogue paraphrased (docs/SCRIPTING.md).
(function () {
  // ------------------------------------------------------------------ models & helpers
  const KID_CLOUD = { base: 'cloud', height: 'kid', weapon: null, extras: [], top: '#6a7a9a', sleeve: '#6a7a9a', bottom: '#4a4a5a', boots: '#4a3020' };
  const KID_TIFA = { base: 'tifa', height: 'kid', top: '#e8d8a8', sleeve: '#e8d8a8', bottom: '#6a4a8a', skirt: 'short', longGloves: false, gloves: null, boots: '#6a3a20' };
  const TIFA15 = { base: 'tifa', top: '#f0ece0', sleeve: '#f0ece0', bottom: '#6a4a30', skirt: 'short', extras: ['vest'], boots: '#6a3a20', longGloves: false, gloves: '#6a3a20' };
  const LS_LOOK = { sky: ['#01120c', '#06402a'], fog: { color: [0.03, 0.2, 0.13], near: 6, far: 20 } };
  const LS = { theme: 'lifestream', leader: 'tifa', area: 'The Lifestream', look: LS_LOOK };
  const voice = (s, text) => s.caption(text, { hold: 70, bg: 'rgba(0,30,18,0.55)', color: '#a0ffd0' });
  const def = (id, o) => FF7.defineMap(id, Object.assign({}, LS, o));

  // ------------------------------------------------------------------ the void
  def('lifestream_void', {
    name: 'The Lifestream', music: 'lifestream',
    grid: [
      "######################",
      "#*****    ..    *****#",
      "#**       ..       **#",
      "#*       ....       *#",
      "#       ..  ..       #",
      "#      ..    ..      #",
      "#       ..  ..       #",
      "#*       ....       *#",
      "#**       ..       **#",
      "#****     ..     ****#",
      "#******   ..   ******#",
      "######################",
    ],
    lights: [[10, 5, '#60ffa0', 5]],
    entries: { start: [10, 10, 'up'] },
    triggers: [
      { id: 'voices', at: [7, 4, 8, 3], run: function* (s) {
          yield voice(s, "...Are you lost...?");
          yield voice(s, "...Where are you going...?");
          yield s.say('tifa', "Who's there!? ...Cloud? Is that you?");
        } },
      { id: 'fall', at: [10, 1, 2, 1], run: function* (s) {
          yield s.say('tifa', "Cloud......! Where are you? I can't... find the way...");
          yield s.say('tifa', "......Cloud... help me......");
          s.anim('player', 'kneel');
          s.flash('#c0ffe0', 40, 0.8);
          yield s.fadeOut(60, '#80ffc0');
          yield s.goto('lifestream_hub', 'start');
        } },
    ],
    onEnter: function* (s) {
      if (s.flag('c10_ls_hub')) return;
      s.menu(false);
      s.phs(false);
      s.anim('player', 'lie');
      yield s.fadeIn(60);
      yield voice(s, "...the Planet...");
      yield voice(s, "......home......");
      s.stopAnim('player');
      yield s.say('tifa', "......Where... am I?\fEverything's green... and so many voices. Is this... the Lifestream?");
      yield s.say('tifa', "Cloud! Cloud, where are you!?");
    },
  });

  // ------------------------------------------------------------------ the hub: Cloud's subconscious
  const nextStop = (s) => !s.flag('c10_ls_station') ? 'station' : !s.flag('c10_ls_nibel') ? 'nibel' : !s.flag('c10_ls_tower') ? 'tower' : !s.flag('c10_ls_room') ? 'room' : 'reactor';
  const HINT = {
    station: "Let's start where we found each other again. The station in Midgar. (South)",
    nibel: "Nibelheim... five years ago. The day Sephiroth came. (North)",
    tower: "Somewhere only the two of us know. The water tower. (West)",
    room: "Your house... There's something there I never let anyone see. (East)",
    reactor: "The reactor. I have to see what really happened. (North)",
  };
  def('lifestream_hub', {
    name: "Cloud's Subconscious", music: 'lifestream',
    grid: [
      "##############..##############",
      "#*****       |..|       *****#",
      "#***          ..          ***#",
      "#*            ..            *#",
      "#             ..             #",
      "#       ..............       #",
      "#      ................      #",
      "#X     ................     h#",
      "#X............**............+#",
      "#X     .......**.......     h#",
      "#      ................      #",
      "#       ..............       #",
      "#             ..             #",
      "#*            ..            *#",
      "#**           ..           **#",
      "#***          rr          ***#",
      "#****      &&&rr&&&      ****#",
      "##############################",
    ],
    lights: [[14, 8, '#60ffa0', 5], [2, 8, '#a0ffc0', 2], [27, 8, '#ffc080', 2]],
    entries: {
      start: [14, 11, 'up'], from_station: [14, 13, 'up'], from_nibel: [14, 3, 'down'],
      from_tower: [4, 8, 'right'], from_room: [26, 8, 'left'],
    },
    exits: [
      { at: [14, 16, 2, 1], run: function* (s) {
          if (s.flag('c10_ls_station')) { yield s.say('ls_cloud', "(The station... We've been there already.)"); return; }
          yield s.goto('lifestream_station', 'start');
        } },
      { at: [14, 0, 2, 1], run: function* (s) {
          const n = nextStop(s);
          if (n === 'nibel') { yield s.goto('lifestream_nibel', 'start'); return; }
          if (n === 'reactor') { yield s.goto('lifestream_reactor', 'start'); return; }
          yield s.say('ls_cloud', n === 'station' ? "(Not Nibelheim. Not yet... I'm scared of what's there.)" : "(Nibelheim... I can't. Not like this. Not yet.)");
        } },
      { at: [2, 8, 1, 1], run: function* (s) {
          if (nextStop(s) === 'tower') { yield s.goto('lifestream_tower', 'start'); return; }
          yield s.say('ls_cloud', s.flag('c10_ls_tower') ? "(The water tower... I remember it now. Every star.)" : "(The water tower... It's fuzzy. Like looking through smoke.)");
        } },
      { at: [28, 8, 1, 1], run: function* (s) {
          if (nextStop(s) === 'room') { yield s.goto('lifestream_room', 'start'); return; }
          yield s.say('ls_cloud', s.flag('c10_ls_room') ? "(That door's open now. There's nothing left to hide in there.)" : "(That door's locked. ...I locked it. A long time ago.)");
        } },
    ],
    npcs: [
      { id: 'ls_cloud', name: 'Cloud', model: 'cloud', at: [14, 6], dir: 'down',
        talk: function* (s) {
          const n = nextStop(s);
          yield s.say('ls_cloud', HINT[n]);
        } },
      { id: 'kid_s', name: 'Young Cloud', model: KID_CLOUD, at: [13, 11], dir: 'down', anim: 'sit', show: s => !s.flag('c10_ls_station'),
        talk: function* (s) { yield s.say('kid_s', "...You found me at the station, didn't you? I was so tired. I didn't even know where I was."); } },
      { id: 'kid_n', name: 'Young Cloud', model: KID_CLOUD, at: [16, 5], dir: 'up', anim: 'sit', show: s => !s.flag('c10_ls_nibel'),
        talk: function* (s) { yield s.say('kid_n', "Nibelheim... Everybody's there. Sephiroth. The SOLDIER. ...But where am I?"); } },
      { id: 'kid_w', name: 'Young Cloud', model: KID_CLOUD, at: [8, 9], dir: 'left', anim: 'sit', show: s => !s.flag('c10_ls_tower'),
        talk: function* (s) { yield s.say('kid_w', "The stars were so bright that night. I called you out there because... because...\f...I don't remember. I don't want to remember."); } },
      { id: 'kid_e', name: 'Young Cloud', model: KID_CLOUD, at: [21, 9], dir: 'right', anim: 'sit', show: s => !s.flag('c10_ls_room'),
        talk: function* (s) { yield s.say('kid_e', "...There's a room in here nobody's allowed in. Not even me."); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c10_ls_hub')) return;
      s.set('c10_ls_hub');
      s.anim('player', 'lie');
      yield s.fadeIn(60);
      yield 30;
      s.stopAnim('player');
      yield s.say('tifa', "......Ngh. This place... Where...?");
      yield s.cam(14, 6, 50);
      yield s.emote('player', '!');
      yield s.say('tifa', "Cloud!!");
      yield s.move('player', [[12, 10], [12, 7], [13, 7]]);
      yield s.say('ls_cloud', "......Tifa? What are you doing in a place like this?");
      yield s.say('tifa', "I could ask you the same thing! Cloud... where are we?");
      yield s.say('ls_cloud', "......Inside me, I think. My head's been falling apart for a long time. This is what's left.\fAll these pieces... all these Clouds. I don't know which one is me anymore.");
      yield s.say('tifa', "Then let's find out. Together. We'll put you back together one piece at a time.");
      yield s.say('ls_cloud', "......Where do we even start?");
      yield s.say('tifa', "From the day we found each other again. The station in Midgar. Let's go there first.");
      yield s.camFollow();
      yield s.msg("Tifa can travel into Cloud's memories along the glowing paths.\n(South: the station.)");
    },
  });

  // Returns to the hub with Cloud's reaction to what they just saw.
  function* backToHub(s, entry, lines) {
    yield s.fadeOut(40, '#80ffc0');
    yield s.goto('lifestream_hub', entry);
    for (const l of lines) yield s.say(l[0], l[1]);
  }

  // ------------------------------------------------------------------ memory: the station in Midgar
  def('lifestream_station', {
    name: 'Memory — Sector 7 Station', music: 'lifestream',
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXX",
      "hhhhwhhhhhhhhhhwhhhhhhhhhh",
      "&&&&&&&&&&&&&&&&&&&&&&&&&&",
      "rrrrrrrrrrrrrrrrrrrrrrrrrr",
      "..........................",
      "..l.......!.........l.....",
      "....B.................o...",
      "==========================",
      "  **  **  **  **  **  **  ",
    ],
    look: Object.assign({}, LS_LOOK, { floor: ['#3a5a50', '#36544a'], wall: '#2a4a40' }),
    entries: { start: [24, 5, 'left'] },
    exits: [{ at: [25, 4, 1, 3], run: function* (s) {
        if (!s.flag('c10_ls_station')) return;
        yield* backToHub(s, 'from_station', []);
      } }],
    onEnter: function* (s) {
      if (s.flag('c10_ls_station')) return;
      s.spawn('ls_cloud_now', 'cloud', 24, 4, 'left', { name: s.name('cloud') });
      s.spawn('mem_cloud', 'cloud', 9, 5, 'down', { name: s.name('cloud'), anim: 'kneel' });
      yield s.fadeIn(40);
      yield s.say('tifa', "Sector 7 Station... This is where I found you, Cloud. Five years after Nibelheim burned.");
      yield s.move('player', 13, 5);
      yield s.say('tifa', "You were slumped over right there, next to the platform. Just... staring at nothing.");
      s.spawn('mem_tifa', 'tifa', 0, 4, 'right', { name: s.name('tifa') });
      yield s.move('mem_tifa', 8, 4);
      yield s.face('mem_tifa', 'mem_cloud');
      yield s.say('mem_tifa', "Cloud? ...It's you, isn't it? Cloud! What's wrong? Are you hurt?");
      s.stopAnim('mem_cloud');
      yield s.face('mem_cloud', 'mem_tifa');
      yield s.say('mem_cloud', "......Tifa...? ...Yeah. I'm fine. I was in SOLDIER, remember?\fI just finished a job. ...Heading wherever the work is, I guess.");
      yield s.face('player', 'ls_cloud_now');
      yield s.say('tifa', "You talked about things I knew had happened... but you had them all wrong. And you'd forgotten things you should have known.\fI didn't know what to believe. So I asked you to join AVALANCHE — just so I could keep you close. Keep an eye on you.");
      yield s.say('ls_cloud_now', "......So that's why. You were watching me the whole time.");
      yield s.say('tifa', "I'm sorry. I should have said something. But I was afraid.\fAfraid that if I told you what I remembered... you'd stop being you. That you'd break.");
      yield s.say('ls_cloud_now', "......Then I guess this is where it all started going wrong. The 'Cloud' you met here...\fTifa. I want to see Nibelheim. Five years ago. I have to know.");
      s.remove('mem_tifa'); s.remove('mem_cloud');
      s.set('c10_ls_station');
      yield* backToHub(s, 'from_station', [['ls_cloud', "Nibelheim. The day Sephiroth came. ...Let's go. (North)"]]);
    },
  });

  // ------------------------------------------------------------------ memory: Nibelheim, five years ago
  def('lifestream_nibel', {
    name: 'Memory — Nibelheim', music: 'fiveyears',
    look: Object.assign({}, LS_LOOK, { floor: ['#4a6a5a', '#446454'], floor2: ['#3a5a48', '#365444'], wall: '#5a7a6a', trim: '#2a4a3a' }),
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "hhhwhh+hhhhhhhhhhhhhh+hhwhhh",
      "h..........................h",
      "h..l.......................h",
      "h..........::::::..........h",
      "h.........:::XX:::.........h",
      "h.........:::XX:::.........h",
      "h..........::::::.......l..h",
      "h..........................h",
      "hhhhhhhhhhh......hhhhhhhhhhh",
      "  ***     |......|     ***  ",
      "  ****     ......     ****  ",
    ],
    entries: { start: [13, 10, 'up'] },
    exits: [{ at: [11, 11, 6, 1], run: function* (s) {
        if (!s.flag('c10_ls_nibel')) return;
        yield* backToHub(s, 'from_nibel', []);
      } }],
    objects: [
      { at: [13, 5], talk: function* (s) { yield s.msg("Nibelheim's old wooden water tower. In the memory, it stands tall and unburned."); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c10_ls_nibel')) return;
      s.spawn('ls_cloud_now', 'cloud', 14, 10, 'up', { name: s.name('cloud') });
      s.place('player', 12, 10, 'up');
      yield s.fadeIn(40);
      yield s.say('tifa', "Nibelheim... just the way it was. Before the fire.");
      yield s.say('ls_cloud_now', "This is the day Sephiroth came to inspect the reactor. I came with him.\fThat's what I remember, anyway.");
      yield [s.move('player', 9, 8), s.move('ls_cloud_now', 18, 8)];
      yield s.face('player', 'down'); yield s.face('ls_cloud_now', 'down');
      // the memory walks in through the gate
      s.spawn('mem_seph', 'sephiroth', 13, 11, 'up', { name: 'Sephiroth' });
      s.spawn('mem_zack', 'zack', 14, 11, 'up', { name: 'SOLDIER' });
      s.spawn('mem_trooper1', 'young_cloud', 12, 11, 'up', { name: 'Shinra Trooper' });
      s.spawn('mem_trooper2', 'soldier', 15, 11, 'up', { name: 'Shinra Trooper' });
      yield [s.move('mem_seph', 13, 7), s.move('mem_zack', 14, 7), s.move('mem_trooper1', 12, 8), s.move('mem_trooper2', 15, 8)];
      yield s.say('mem_zack', "So this is Nibelheim! Pretty quiet place. Hey, Sephiroth — is it true you've never had a hometown?");
      yield s.say('mem_seph', "......Let's get to the inn. We leave for the reactor in the morning.");
      yield s.face('mem_trooper1', 'down');
      yield s.say('ls_cloud_now', "......That's... me? No.\fThat SOLDIER's hair is black. That's not me. Who... is he?");
      yield s.say('tifa', "......I remember him now. He was the SOLDIER who came with Sephiroth. He was friendly. He laughed a lot.");
      s.spawn('mem_tifa', TIFA15, 5, 2, 'down', { name: 'Tifa' });
      s.spawn('mem_photog', 'man7', 7, 4, 'up', { name: 'Photographer' });
      yield s.move('mem_tifa', 11, 6);
      yield s.say('mem_photog', "Hey, the young lady's gonna be your guide up the mountain? Let me get a picture! Everyone together now!");
      yield [s.move('mem_tifa', 11, 7), s.face('mem_seph', 'down'), s.face('mem_zack', 'down'), s.face('mem_photog', 'right')];
      s.flash('#ffffff', 10, 0.8);
      s.sfx('scan');
      yield 20;
      yield s.say('tifa', "The photo... There were three of us in it. Me, Sephiroth... and that SOLDIER.\fAnd there was a trooper... one who never took his helmet off. He hung back the whole time.");
      yield s.say('ls_cloud_now', "Then where am I!? I was there — I was SOLDIER, First Class — I stood right there in that picture!\fTifa... was I even there at all?");
      ['mem_seph', 'mem_zack', 'mem_trooper1', 'mem_trooper2', 'mem_tifa', 'mem_photog'].forEach(id => s.remove(id));
      s.flash('#80ffc0', 30, 0.7);
      yield voice(s, "(...You see? There was no 'Cloud' in Nibelheim.)");
      yield voice(s, "(You're just a puppet. A copy Hojo stitched together...)");
      s.anim('ls_cloud_now', 'kneel');
      yield s.say('ls_cloud_now', "Aaagh...! ...Stop... Tifa... I'm... I'm not......");
      yield s.run('player', 17, 8);
      yield s.say('tifa', "Cloud, don't listen! Hold on to me!\fThere's somewhere else — somewhere only the two of us know. The water tower. Let's go there!");
      s.stopAnim('ls_cloud_now');
      s.set('c10_ls_nibel');
      yield* backToHub(s, 'from_nibel', [['ls_cloud', "......The water tower. Seven years ago. ...Alright. (West)"]]);
    },
  });

  // ------------------------------------------------------------------ memory: the water tower (the promise)
  def('lifestream_tower', {
    name: 'Memory — The Water Tower', music: 'othermountain',
    look: Object.assign({}, LS_LOOK, { sky: ['#02061a', '#0a2a3a'] }),
    grid: [
      "######################",
      "#**                **#",
      "#*                  *#",
      "#      =KKKKKK=      #",
      "#      KKKKKKKK      #",
      "#      =KKKKKK=      #",
      "#        |HH|        #",
      "#        ....        #",
      "#    ............    #",
      "#   ..............   #",
      "#*   ............   *#",
      "#**      ....      **#",
      "######################",
    ],
    heights: [
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000666666660000000",
      "0000000666666660000000",
      "0000000666666660000000",
      "0000000003333000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
    ],
    lights: [[10, 4, '#c0e0ff', 4]],
    entries: { start: [10, 10, 'up'] },
    exits: [{ at: [9, 11, 4, 1], run: function* (s) {
        if (!s.flag('c10_ls_tower')) return;
        yield* backToHub(s, 'from_tower', []);
      } }],
    onEnter: function* (s) {
      if (s.flag('c10_ls_tower')) return;
      s.spawn('ls_cloud_now', 'cloud', 12, 10, 'up', { name: s.name('cloud') });
      s.spawn('mem_kcloud', KID_CLOUD, 10, 4, 'down', { name: 'Young Cloud', anim: 'sit' });
      s.spawn('mem_ktifa', KID_TIFA, 11, 4, 'down', { name: 'Young Tifa', anim: 'sit' });
      yield s.fadeIn(40);
      yield s.say('tifa', "The water tower... and the stars. Just like that night.");
      yield s.move('player', 10, 8);
      yield s.say('mem_kcloud', "......I'm leaving, Tifa. Leaving Nibelheim. I'm going to Midgar.\fI'm going to join SOLDIER. I'll be the best there is. Like Sephiroth.");
      yield s.say('mem_ktifa', "Everyone's leaving... Then, promise me something.\fWhen you're famous... if I'm ever in trouble, come and save me. Okay?");
      yield s.say('mem_kcloud', "......Okay. I promise.");
      yield s.face('player', 'ls_cloud_now');
      yield s.say('tifa', "I remember every word. But Cloud... why did you call me out here that night? We'd hardly ever talked before.");
      yield s.say('ls_cloud_now', "......Because of your mother.\fWhen she died, you went up Mt. Nibel alone. You said you'd find her over the mountains. I followed you.");
      yield s.say('ls_cloud_now', "The old bridge gave way. We both fell. I wasn't hurt... but you didn't wake up for a week.\fYour father blamed me. The whole town did. And I thought... it was my fault. I wasn't strong enough to protect you.");
      yield s.say('ls_cloud_now', "That's why I wanted to be strong. So you'd notice me. So I'd be somebody worth noticing.\fSOLDIER was never about being a hero. It was about you.");
      yield s.say('tifa', "......Cloud...");
      yield s.say('tifa', "But you did keep your promise. Every time I was in trouble, you came. In Midgar... at the pillar... every time.");
      yield s.say('ls_cloud_now', "......But I never made SOLDIER, Tifa. That part was a lie.");
      yield s.say('tifa', "Then there's one more memory we have to look at. ...Your secret. The one you locked away.");
      s.remove('mem_kcloud'); s.remove('mem_ktifa');
      s.set('c10_ls_tower');
      yield* backToHub(s, 'from_tower', [['ls_cloud', "......Your house. ...That door I keep locked. (East)"]]);
    },
  });

  // ------------------------------------------------------------------ memory: Tifa's house, by the fireplace
  def('lifestream_room', {
    name: "Memory — Tifa's House", music: 'lifestream',
    look: Object.assign({}, LS_LOOK, { floor: ['#5a5a40', '#54543a'], wall: '#5a6a48', trim: '#2a3a28' }),
    grid: [
      "####################",
      "#kk..F.....q..bb.j.#",
      "#..................#",
      "#...t.c......c.t...#",
      "#..................#",
      "#*................*#",
      "#**..............**#",
      "########....########",
    ],
    lights: [[5, 2, '#ffa040', 4]],
    entries: { start: [9, 5, 'up'] },
    exits: [{ at: [8, 7, 4, 1], run: function* (s) {
        if (!s.flag('c10_ls_room')) return;
        yield* backToHub(s, 'from_room', []);
      } }],
    objects: [{ at: [5, 1], talk: function* (s) { yield s.msg("The fireplace in Tifa's house. The fire burns warm, even here."); } }],
    onEnter: function* (s) {
      if (s.flag('c10_ls_room')) return;
      s.spawn('ls_cloud_now', 'cloud', 11, 5, 'up', { name: s.name('cloud') });
      s.spawn('mem_kcloud', KID_CLOUD, 5, 2, 'down', { name: 'Young Cloud', anim: 'sit' });
      yield s.fadeIn(40);
      yield s.say('tifa', "My house... The fireplace, the table... everything's exactly how it was.");
      yield s.move('player', 7, 2);
      yield s.say('mem_kcloud', "......This is where I keep it. The thing nobody gets to see.\fA secret, locked up tight. A wish. Warm memories... that no one can ever know about.");
      yield s.say('tifa', "Cloud... what is this?");
      yield s.face('player', 'ls_cloud_now');
      yield s.say('ls_cloud_now', "......Winter nights, when we were kids. I used to stand outside in the snow and watch the light in your window.\fI never once knocked. I didn't think I had the right.");
      yield s.say('ls_cloud_now', "Every time I pretended to be something I wasn't, it was for that window. For you to look outside and see me.");
      yield s.say('tifa', "......You didn't have to be anybody else. You never did.\fThe boy standing in the snow... I wish he'd knocked.");
      s.stopAnim('mem_kcloud');
      yield s.face('mem_kcloud', 'player');
      yield s.say('mem_kcloud', "......Heh.");
      s.remove('mem_kcloud');
      s.flash('#ffe0a0', 20, 0.5);
      yield s.say('ls_cloud_now', "......Thanks, Tifa. I think I can look at the rest of it now.\fTake me back to Nibelheim. To the reactor. I need to see what really happened.");
      s.set('c10_ls_room');
      yield* backToHub(s, 'from_room', [['ls_cloud', "The reactor. The truth. ...I'm ready. (North)"]]);
    },
  });

  // ------------------------------------------------------------------ memory: the Nibelheim reactor (the truth)
  def('lifestream_reactor', {
    name: 'Memory — Nibelheim Reactor', music: 'whoami',
    look: Object.assign({}, LS_LOOK, { floor: ['#3a5058', '#344a52'], wall: '#4a6070', trim: '#203038', mako: '#60ffa0' }),
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXX",
      "XPPPPPPhhhh++hhhhPPPPPPX",
      "Xy....................yX",
      "X......................X",
      "Xy.....***....***.....yX",
      "X......***....***......X",
      "Xy....................yX",
      "X......................X",
      "XPPPP..............PPPPX",
      "XXXXXXXXXX....XXXXXXXXXX",
    ],
    lights: [[7, 4, '#60ffa0', 3], [16, 4, '#60ffa0', 3], [11, 1, '#80ffc0', 3]],
    entries: { start: [12, 8, 'up'] },
    onEnter: function* (s) {
      if (s.flag('c10_ls_reactor')) return;
      s.spawn('ls_cloud_now', 'cloud', 13, 8, 'up', { name: s.name('cloud') });
      s.spawn('mem_seph', 'sephiroth', 11, 2, 'up', { name: 'Sephiroth' });
      s.spawn('mem_zack', 'zack', 8, 3, 'down', { name: 'Zack', anim: 'lie' });
      s.spawn('mem_tifa', TIFA15, 16, 3, 'down', { name: 'Tifa', anim: 'lie' });
      yield s.fadeIn(40);
      yield s.say('tifa', "The reactor... I came in after Sephiroth burned the town. I picked up my father's sword...\fAnd he threw me down those stairs like I was nothing.");
      yield s.say('mem_seph', "......Mother. They're coming again. The ones who stole this Planet from you.\fBut I'm here now. Let's take it back — together.");
      s.spawn('mem_trooper', 'young_cloud', 12, 9, 'up', { name: 'Shinra Trooper' });
      yield s.run('mem_trooper', 12, 6);
      yield s.face('mem_trooper', 'mem_tifa');
      yield s.say('mem_trooper', "......Tifa!");
      yield s.run('mem_trooper', 9, 3);
      s.anim('mem_trooper', 'kneel');
      yield 40;
      s.stopAnim('mem_trooper');
      yield s.say('mem_zack', "......Hey... you're... that kid from... Take it... Stop him...");
      yield s.msg("The trooper takes the SOLDIER's great sword in both hands. It's far too heavy for him.");
      s.setModel('mem_trooper', { base: 'young_cloud', weapon: 'buster' });
      yield s.say('mem_trooper', "......Sephiroth... My mother... my town... Tifa...\fYou... I TRUSTED you!");
      yield s.run('mem_trooper', 11, 3);
      s.anim('mem_trooper', 'slash');
      s.sfx('crit');
      s.flash('#ffffff', 16, 1);
      s.anim('mem_seph', 'hurt');
      yield 30;
      yield s.say('mem_seph', "......Who... do you think you are......?");
      yield s.face('player', 'ls_cloud_now');
      yield s.say('tifa', "That trooper... the one who saved me... Take off your helmet. Please.");
      s.setModel('mem_trooper', { base: 'cloud', top: '#3a5a9a', sleeve: '#3a5a9a', bottom: '#3a5a9a', extras: ['belt'], weapon: 'buster' });
      yield s.face('mem_trooper', 'down');
      s.flash('#c0ffe0', 30, 0.6);
      yield s.say('ls_cloud_now', "......It's me.");
      s.music('openheart');
      yield s.say('ls_cloud_now', "I was there. I was a Shinra trooper, not SOLDIER. I didn't want anyone in Nibelheim to see me — not my mother, not you. So I kept my helmet on.\fBut I was there. And when it mattered, I was the one who stopped him.");
      yield s.say('tifa', "Cloud...!");
      ['mem_seph', 'mem_zack', 'mem_tifa', 'mem_trooper'].forEach(id => s.remove(id));
      yield s.say('ls_cloud_now', "......And Zack. My friend Zack. SOLDIER, First Class.\fAfter the reactor, Hojo locked us both up in the mansion basement for years. Zack broke us out. He carried me halfway across the world, all the way to the edge of Midgar...");
      yield s.say('ls_cloud_now', "......and Shinra caught up with us there. He never made it. I did.\fEverything I told you about SOLDIER, about being First Class... they were Zack's stories. I wore them because mine hurt too much.");
      yield s.say('tifa', "......But the man who kept his promise to me — that was always you. Only you.");
      yield s.say('ls_cloud_now', "......Yeah. I'm Cloud. Just Cloud.\fThanks for finding me, Tifa.");
      yield s.say('tifa', "Let's go home. Everyone's waiting.");
      s.set('c10_ls_reactor');
      s.remove('ls_cloud_now');
      yield s.fadeOut(80, '#c0ffe0');
      yield s.caption("The Lifestream carries them upward, through the voices of the Planet,\nback toward the light...", { hold: 180, bg: '#000', aboveFade: true });
      s.menu(true);
      s.phs(true);
      yield s.goto('mideel_ruins', 'washed');
    },
  });
})();
