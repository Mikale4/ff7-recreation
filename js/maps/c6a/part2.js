// Chapter 6a, part 2 — Mt. Corel: the mountain trail (the man in the black cape), the old
// Corel reactor, the coal-rail tracks with their rotten ties (Wizard Staff), the rollercoaster
// tracks and the treasure below them, the switch cabin and the Cokatolis nest, the miner's cave,
// and the huge old rail bridge that leads to North Corel.
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
(function () {
  const BG = 'mtcorel';
  function fallbackLink(loc, def) {
    FF7.world.link(loc, Object.assign({}, def, {
      c6aFallback: true,
      if: function (s) {
        const list = (FF7.world._links || {})[loc] || [];
        return !list.some(l => !l.c6aFallback && typeof l.if === 'function' && (function () { try { return l.if(s); } catch (e) { return false; } })());
      },
    }));
  }
  fallbackLink('mt_corel', { map: 'mtcorel_path1', entry: 'from_world' });

  // ------------------------------------------------------------------ mountain trail
  FF7.defineMap('mtcorel_path1', {
    name: 'Mt. Corel', area: 'Mt. Corel', theme: 'mountain', music: 'mining',
    battle: { table: 'mt_corel_path', bg: BG },
    grid: [
      "###:::##############################",
      "##,:::,R,,T,########################",
      "##,,::,,,,,,#,,,,R,,,,,,,,,,########",
      "##,,,:::::::^::::,,,,,,,,,,,########",
      "##,R,,,,,,::^,:::,,,,T,,,,,,########",
      "##,,,T,,,,,,^,,,::::,,,,,R,,########",
      "#############,,,,,,:::::,,,,########",
      "#############,,T,,,,,,:::,,,########",
      "########################^^^#########",
      "####################,,,,:::,,,,,,,,:",
      "####################,,R,,,::::::::::",
      "####################,T,,,,,,,,,,,,,:",
      "####################,,,,,%,,,,,R,,,#",
      "####################################",
    ],
    heights: [
      "666666000000000000000000000000000000",
      "666666666666000000000000000000000000",
      "666666666666333333333333333300000000",
      "666666666666533333333333333300000000",
      "666666666666533333333333333300000000",
      "666666666666533333333333333300000000",
      "000000000000033333333333333300000000",
      "000000000000033333333333333300000000",
      "000000000000000000000000222000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
    ],
    entries: { from_world: [33, 10, 'left'], from_reactor: [4, 1, 'down'] },
    exits: [
      { at: [35, 9, 1, 3], to: 'world', loc: 'mt_corel' },
      { at: [3, 0, 3, 1], to: 'mtcorel_reactor', entry: 'from_path' },
    ],
    npcs: [
      { id: 'oldman', name: 'Old Man', model: 'oldman3', at: [29, 11], dir: 'left',
        talk: function* (s) {
          if (!s.flag('c6a_oldman_talked')) {
            s.set('c6a_oldman_talked');
            yield s.say('Old Man', "You folks headin' up the mountain? Then you'll be followin' that fella in the black cape.\fWent staggerin' up the tracks not long ago. Pale as a ghost, mutterin' to himself... Gave me the shivers, I'll tell ya.");
            return;
          }
          yield s.say('Old Man', "These tracks used to carry coal down off the mountain. Ain't been a train on 'em in years. Mind your step up there.");
        } },
    ],
    onEnter: function* (s) {
      if (s.flag('c6a_costa_left')) return;
      s.set('c6a_costa_left');
      if (s.inParty('barret')) yield s.say('barret', "Mt. Corel... Never figured I'd be walkin' these tracks again.");
    },
  });

  // ------------------------------------------------------------------ the Corel reactor
  FF7.defineMap('mtcorel_reactor', {
    name: 'Corel Reactor', area: 'Mt. Corel', theme: 'mountain', music: 'mining',
    battle: { table: 'mt_corel_reactor', bg: BG },
    look: { wall: '#6a6a70', trim: '#3a3a44' },
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "#XXPPPPMMMMXXXXXXXXMMMMPPPPXX#####",
      "##..........B..o..........B.######",
      "##..........................######",
      "##..........Z...............######",
      "##..........................######",
      "##............rrrrrrrrrrrrrrrrrrrr",
      "##............rrrrrrrrrrrrrrrrrrrr",
      "##..........................######",
      "##...R......................######",
      "::..........................######",
      "::.....%....................######",
      "::..........................######",
      "##################################",
    ],
    entries: { from_path: [2, 11, 'right'], from_tracks: [31, 6, 'left'] },
    exits: [
      { at: [0, 10, 1, 3], to: 'mtcorel_path1', entry: 'from_reactor' },
      { at: [33, 6, 1, 2], to: 'mtcorel_tracks1', entry: 'from_reactor' },
    ],
    objects: [
      { at: [12, 4], talk: function* (s) {
        yield s.msg('"SHINRA ELECTRIC POWER CO. — COREL MAKO REACTOR"\nMost of the lights are dark. It looks like it barely runs anymore.');
        if (s.inParty('barret') && !s.flag('c6a_reactor_barret')) {
          s.set('c6a_reactor_barret');
          yield s.say('barret', "...The Corel reactor. They promised this thing would make us all rich.\fLook at it now. Look at what it cost.");
        }
      } },
    ],
  });

  // ------------------------------------------------------------------ rail tracks (rotten ties)
  const weakSpot = function* (s) {
    s.shake(3, 20); s.sfx('hit');
    yield s.msg(`The rotten ties give way under ${s.name('cloud')}'s feet!`);
    s.anim('player', 'hurt');
    const c = yield s.ask('cloud', "(Whoa...! I'm hanging from the rails!)", ['Climb back up', 'Swing over to the ledge below']);
    s.stopAnim('player');
    if (c === 1 && !s.flag('c6a_wizard_staff')) {
      yield s.msg(`${s.name('cloud')} swings down onto a narrow ledge beneath the tracks...\nSomething is lying there!`);
      s.set('c6a_wizard_staff');
      yield s.give('wizard_staff');
      yield s.msg(`${s.name('cloud')} climbs back up onto the tracks.`);
    } else if (c === 1) {
      yield s.msg(`There's nothing else on the ledge. ${s.name('cloud')} climbs back up.`);
    } else {
      yield s.msg(`${s.name('cloud')} hauls himself back up onto the tracks.`);
    }
  };
  FF7.defineMap('mtcorel_tracks1', {
    name: 'Mt. Corel Tracks', area: 'Mt. Corel', theme: 'mountain', music: 'mining',
    battle: { table: 'mt_corel_bridge_start', bg: BG },
    grid: [
      "####################################",
      "#,,,S,,,,,,,##         ##,,,,,,,,,,#",
      "rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
      "rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
      ",,,,,,,,,,,,,,         ,,,,,,,,,,,,,",
      "CCCCCCCCCCCCCC         CCCCCCCCCCCCC",
      "                                    ",
      "                                    ",
    ],
    entries: { from_reactor: [1, 3, 'right'], from_tracks2: [34, 3, 'left'] },
    exits: [
      { at: [0, 2, 1, 3], to: 'mtcorel_reactor', entry: 'from_tracks' },
      { at: [35, 2, 1, 3], to: 'mtcorel_tracks2', entry: 'from_tracks1' },
    ],
    triggers: [
      { id: 'weak1', at: [18, 2, 1, 2], once: false, if: s => !s.flag('c6a_wizard_staff'), run: weakSpot },
      { id: 'weak2', at: [29, 2, 1, 2], once: true,
        run: function* (s) {
          s.shake(2, 20); s.sfx('hit');
          yield s.msg(`The tracks crack beneath ${s.name('cloud')}... he leaps clear just before the ties crumble away!`);
          yield s.say('cloud', "(...These tracks are falling apart.)");
        } },
    ],
  });

  // ------------------------------------------------------------------ rollercoaster tracks
  FF7.defineMap('mtcorel_tracks2', {
    name: 'Mt. Corel Tracks', area: 'Mt. Corel', theme: 'mountain', music: 'mining',
    battle: { table: 'mt_corel_tracks', bg: BG },
    grid: [
      "######################################",
      "##,,,,######,,,,,,,,####,,,,,,,,,,,,##",
      "rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr,,#",
      "rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr,,#",
      "==========^^=========================#",
      "RR%RRRRRRR^^RRR%RRRRR%RRRRRRR%RRRRRRR#",
      "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,T,,,,,,,,,,,,,,,,,,,,R,,,,,,,,,,,,#",
      "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,%,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,:",
      "#,,,,,,,,,,,,,,,,,,,T,,,,,,,,,,,,,,,,:",
      "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,:",
      "#,,,,R,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "######################################",
    ],
    heights: [
      "66666666666666666666666666666666666666",
      "66666666666666666666666666666666666666",
      "66666666666666666666666666666666666666",
      "66666666666666666666666666666666666666",
      "66666666663366666666666666666666666666",
      "66666666663366666666666666666666666666",
      "00000000000000000000000000000000000000",
      "00000000000000000000000000000000000000",
      "00000000000000000000000000000000000000",
      "00000000000000000000000000000000000000",
      "00000000000000000000000000000000000000",
      "00000000000000000000000000000000000000",
      "00000000000000000000000000000000000000",
      "00000000000000000000000000000000000000",
      "00000000000000000000000000000000000000",
    ],
    entries: { from_tracks1: [1, 2, 'right'], from_cabin: [35, 11, 'left'] },
    exits: [
      { at: [0, 2, 1, 2], to: 'mtcorel_tracks1', entry: 'from_tracks2' },
      { at: [37, 10, 1, 3], to: 'mtcorel_cabin', entry: 'from_tracks2' },
    ],
    chests: [{ at: [36, 2], item: 'w_machine_gun', id: 'mtcorel_tracks2_wmg' }],
    items: [
      { at: [33, 8], item: 'star_pendant', id: 'mtcorel_tracks2_starpendant' },
      { at: [6, 9], item: 'turbo_ether', id: 'mtcorel_tracks2_turboether' },
      { at: [15, 12], materia: 'transform', id: 'mtcorel_tracks2_transform' },
    ],
    triggers: [
      { id: 'dead_end', at: [34, 2, 1, 2], once: true,
        run: function* (s) { yield s.say('cloud', "(The upper tracks end here... The way on must be down below.)"); } },
    ],
  });

  // ------------------------------------------------------------------ switch cabin & bird's nest
  FF7.defineMap('mtcorel_cabin', {
    name: 'Mt. Corel Cabin', area: 'Mt. Corel', theme: 'mountain', music: 'mining',
    battle: { table: 'mt_corel_waterside', bg: BG },
    grid: [
      "##################################",
      "#######################,,,,,######",
      "#######################,,,,,######",
      "#######################,,,,,######",
      "#######################,,,,,######",
      "#,,,,,,,,,,,,,,,,,,,,,#RRHRR######",
      "rrrrrrrrrrrrrrrrrrrrrrrrrrr,hhhhh#",
      "rrrrrrrrrrrrrrrrrrrrrrrrrrr,hwwwh#",
      ",,,,,,,,,,rrr,,,,,,,,,,,,,,,hh+hh#",
      "#,,,,,,,,,rrr,,,,,,,,,,,,,,,,,,,,#",
      "#,,T,,,,,,rrr,,,,,,,%,,,,,,,,,,,,#",
      "#,,,,,,,,,rrr,,,,,,,,,,,,,R,,,,,,#",
      "#,,,,,,,,,rrr,,,,,,,,,,,,,,,,,,,,#",
      "##########rrr#####################",
    ],
    heights: [
      "0000000000000000000000000000000000",
      "0000000000000000000000066666000000",
      "0000000000000000000000066666000000",
      "0000000000000000000000066666000000",
      "0000000000000000000000066666000000",
      "0000000000000000000000066066000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
    ],
    entries: { from_tracks2: [1, 7, 'right'], from_cabin_in: [30, 9, 'down'], from_waterside: [11, 12, 'up'] },
    exits: [
      { at: [0, 6, 1, 3], to: 'mtcorel_tracks2', entry: 'from_cabin' },
      { at: [30, 8, 1, 1], to: 'mtcorel_cabin_in', entry: 'from_out', sfx: 'door' },
      { at: [10, 13, 3, 1], to: 'mtcorel_waterside', entry: 'from_cabin', if: s => s.flag('c6a_bridge_down'),
        blocked: function* (s) { yield s.msg('The drawbridge ahead is raised. There must be a switch somewhere around here.'); yield s.walk('player', 0, -1); } },
    ],
    objects: [
      { at: [25, 2], if: s => !s.flag('c6a_nest'),
        talk: function* (s) {
          const c = yield s.ask(null, "A bird's nest. Three fluffy chicks are chirping away...\nand a pile of Phoenix Downs is tucked beneath them.", ['Take the Phoenix Downs', 'Leave them be']);
          if (c !== 0) { yield s.say('cloud', "(...Better leave them alone.)"); return; }
          s.set('c6a_nest');
          yield s.give('phoenix_down', 10);
          s.sfx('encounter');
          yield s.msg('A shrill cry! The mother bird swoops down on the thief!');
          yield s.battle({ table: 'event_corel_nest', bg: BG, music: 'battle', noEscape: true });
        } },
    ],
    triggers: [
      { id: 'birds', at: [24, 6, 4, 3], once: true, if: s => !s.flag('c6a_nest'),
        run: function* (s) { yield s.emote('player', '?'); yield s.say('cloud', "(...Chirping? Birds, somewhere up on that ledge.)"); } },
    ],
  });

  FF7.defineMap('mtcorel_cabin_in', {
    name: 'Switch Cabin', area: 'Mt. Corel', theme: 'house', music: 'mining',
    look: { wall: '#8a7458', trim: '#4a3a28', floor: ['#7a6040', '#72583a'] },
    grid: [
      "############",
      "#k..M...q..#",
      "#..........#",
      "#..t.......#",
      "#..........#",
      "#####+######",
    ],
    entries: { from_out: [5, 4, 'up'] },
    exits: [{ at: [5, 5, 1, 1], to: 'mtcorel_cabin', entry: 'from_cabin_in', sfx: 'door' }],
    objects: [
      { at: [4, 1], talk: function* (s) {
        if (s.flag('c6a_bridge_down')) { yield s.msg('The lever is pulled down. The drawbridge outside is lowered.'); return; }
        const c = yield s.ask(null, 'A big, rusty lever. A faded plate reads "DRAWBRIDGE".', ['Pull it', 'Leave it']);
        if (c !== 0) return;
        s.sfx('gate'); s.shake(3, 40);
        yield s.msg('Clank... ka-THUNK!\nOutside, a drawbridge groans as it lowers into place.');
        s.set('c6a_bridge_down');
      } },
      { at: [8, 1], talk: function* (s) { yield s.msg('An old work log. The last entry is from four years ago:\n"Coal shipments stopped. Reactor crew only from now on."'); } },
    ],
  });

  // ------------------------------------------------------------------ waterside tracks
  FF7.defineMap('mtcorel_waterside', {
    name: 'Mt. Corel Waterside', area: 'Mt. Corel', theme: 'mountain', music: 'mining',
    battle: { table: 'mt_corel_waterside', bg: BG },
    look: { water: '#3a6a8a' },
    grid: [
      "##########rrr#######################",
      "######,,,,rrr,,,,,,,########,,,,,,,#",
      "####,,,,,,rrr,,,,,,,,,,,,,,,,,,,,,,#",
      "###,,,,,,,rrrrrrrrrrrrrrrrrrrrrrrrrr",
      "##,,,,,,,rrrrrrrrrrrrrrrrrrrrrrrrrrr",
      "#,,,,,,,rr,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,rr,,,,,,,,,,,T,,,,,,,,,,,,,,#",
      "#,,,,,rr,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,rr,,,,,,,,,,,,,,,,,,,R,,,,,,,,#",
      "+rrrrr,,,sss~~~~~~~~~~~~~~~~~~~~~~~#",
      "#,,,,,,sssss~~~~~~~~~~~~~~~~~~~~~~~#",
      "#,,,,sssssss~~~~~~~~~~~~~~~~~~~~~~~#",
      "#RR,ssssssss~~~~~~~~~~~~~~~~~~~~~~~#",
      "############~~~~~~~~~~~~~~~~~~~~~~~#",
    ],
    entries: { from_cabin: [11, 1, 'down'], from_bridge: [33, 3, 'left'], from_cave: [2, 10, 'right'] },
    exits: [
      { at: [10, 0, 3, 1], to: 'mtcorel_cabin', entry: 'from_waterside' },
      { at: [35, 3, 1, 2], to: 'mtcorel_bridge', entry: 'from_waterside' },
      { at: [0, 9, 1, 1], to: 'mtcorel_cave', entry: 'from_waterside', sfx: 'door' },
    ],
    onEnter: function* (s) {
      if (s.flag('c6a_waterside_seen')) return;
      s.set('c6a_waterside_seen');
      yield s.say('cloud', "(The drawbridge is down... The main line runs east from here. That side track goes down toward the water.)");
    },
  });

  // ------------------------------------------------------------------ the miner's cave
  FF7.defineMap('mtcorel_cave', {
    name: "Miner's Cave", area: 'Mt. Corel', theme: 'cave', music: 'mining',
    grid: [
      "####################",
      "#RR....A.......o.R.#",
      "#.....t.c.........R#",
      "#..............B...#",
      "#R......l.........##",
      "+.................R#",
      "#......R.....x.....#",
      "####################",
    ],
    lights: [[8, 4, '#ffc070', 4]],
    entries: { from_waterside: [1, 5, 'right'] },
    exits: [{ at: [0, 5, 1, 1], to: 'mtcorel_waterside', entry: 'from_cave', sfx: 'door' }],
    items: [
      { at: [16, 6], item: 'tent', id: 'mtcorel_cave_tent' },
      { at: [3, 3], item: 'mind_source', id: 'mtcorel_cave_mindsource' },
    ],
    chests: [{ at: [17, 2], item: 'power_source', id: 'mtcorel_cave_powersource' }],
    npcs: [
      { id: 'miner', name: 'Miner', model: 'worker3', at: [10, 3], dir: 'left',
        talk: function* (s) {
          if (!s.flag('c6a_miner_talked')) {
            s.set('c6a_miner_talked');
            yield s.say('Miner', "Who's there?! ...Oh. Just travelers.\fDon't mind me. I used to dig coal outta this mountain, back when Corel was a coal town. Then Shinra and their Mako came along, and that was the end of that.\fNow I live down here. Help yourselves to whatever you find lyin' around. Ain't like I got a use for it.");
            return;
          }
          yield s.say('Miner', "The folks from Corel went north after the fire. North Corel, they call it now. Nothin' there but scrap and bitterness.");
        } },
    ],
  });

  // ------------------------------------------------------------------ the great rail bridge
  FF7.defineMap('mtcorel_bridge', {
    name: 'Mt. Corel Rail Bridge', area: 'Mt. Corel', theme: 'mountain', music: 'mining',
    battle: { table: 'mt_corel_rail_bridge', bg: BG },
    grid: [
      "#####                              #####",
      "#,,,,                              ,,,,#",
      "#,,,,==============================,,,,#",
      "rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
      "rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
      "#,,,,==============================,,,,#",
      "#,,,,                              ,,,,#",
      "#####                              #####",
    ],
    entries: { from_waterside: [1, 3, 'right'], from_ncorel: [38, 4, 'left'] },
    exits: [
      { at: [0, 3, 1, 2], to: 'mtcorel_waterside', entry: 'from_bridge' },
      { at: [39, 3, 1, 2], to: 'ncorel_town', entry: 'from_mtcorel' },
    ],
    triggers: [
      { id: 'creak', at: [18, 3, 1, 2], once: true,
        run: function* (s) {
          s.shake(3, 60); s.sfx('falling');
          yield s.say('cloud', "(...The bridge is shaking!)");
          s.shake(5, 110);
          yield s.msg('The old trestle groans. Rotten beams snap and tumble into the gorge far below!');
          yield s.run('player', 36, 3);
          s.shake(2, 30);
          yield 20;
          yield s.face('player', 'left');
          yield s.say('cloud', "(...Made it. That bridge won't hold up much longer.)");
          if (s.inParty('barret')) yield s.say('barret', "North Corel's just ahead. ...Hmph. Let's get this over with.");
        } },
    ],
  });
})();
