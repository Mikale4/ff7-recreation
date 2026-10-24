// Cait Sith's Hideout (not in the PS1 game: Config > Extras > Cait Sith's Hideout, on by default).
//  * Kupomon (js/kupomon): with the MogBoy, Cait Sith gives Cloud his "greatest creation yet" free, to beta test it
//    (kupomonGift); and once Cloud's the Champion of its Kupo League, he hops out to hear the verdict (caitReview), and
//    again once he has the Kupodex Diploma, the whole post-game behind him (caitReview2).
//  * The breakdown: Wonder Square's Crystal Fortune booth (js/maps/c6a/part3.js) wears out. With Cait Sith recruited
//    and in the party, ten readings in a row on one visit break it (a rattle at the sixth, smoke at the eighth, a wild
//    spin at the ninth). Cait Sith jumps out of the party, scolds Cloud and shoves the booth one tile east: behind it,
//    the door to his hideout, where he keeps his tools, gadgets and toys. In he goes for his toolbox (no peeking!) -
//    and he's away: off the party and the PHS (js/systems/party.js P.away) until the quest is done.
//  * No peeking: walk in and he shoos you out, crosser each time; the third time he gives up and lets you stay.
//  * The parts: look at everything in the workshop and he loses his temper with the machine - it needs four parts, off
//    four monsters round North Corel and the Gold Saucer (FF7.questDrops, key items): a Grangalan's mainspring, a
//    Needle Kiss stinger, a Cokatolis eye and a Joker's lucky card.
//  * The ambush: with all four, the party's first steps out on the world map cut to a (silly) scene: MOG Mk.II - the
//    giant robot moogle from his charging bay, which stands empty now - stomps up, demands the parts, swears no cat
//    sent it, and fights (a boss). Beaten, it reboots and waddles home, into a rock first.
//  * The cold stare: back at the workshop Cloud hands the parts over without a word. Cait Sith reads his face, swears it
//    wasn't him (Shinra, surely!), changes the subject, turns the parts into spare parts, gloats, and rejoins the party.
//  * Out in Wonder Square he mends the booth, pushes it back over the door, and tells you about the hidden switch on
//    its left side: press it and the booth slides aside (like the reactor doors); it slides back when you come out.
//  * The workshop (gs_cait_hideout) is built on what the games say of him: a robot cat Reeve of Shinra's Urban
//    Development runs from far away (the Ultimania's "Inspire", bringing things to life), riding a robot moogle his
//    department built, replaceable (a new body after the Temple), a fortune teller at the Gold Saucer.
// Flags: cait_hideout_found, cait_hideout_welcome, cait_quest_started, cait_parts_all, cait_mog_beaten, cait_quest_done,
// cait_booth_fixed. Vars: cait_peek, cait_seen, cait_door_open, cait_fortune_run(_gen), cait_talk_n.
// Dialogue in our own words (docs/SCRIPTING.md).
(function () {
  const on = () => !(FF7.state && FF7.state.config && FF7.state.config.caitHideout === false);
  const obj = (s, id) => (s.field && s.field.objects || []).find(o => o.id === id);
  const FL = () => FF7.state.flags, V = () => FF7.state.vars;
  const party = () => FF7.sys && FF7.sys.party;
  const hasKey = (id) => !!(FF7.sys && FF7.sys.inv && FF7.sys.inv.hasKey(id));

  // ------------------------------------------------------------------ the parts (key items), from the monsters round here
  const PARTS = [
    { id: 'cait_mainspring', from: 'grangalan', name: 'Grangalan Mainspring', desc: "A Grangalan's mainspring, wound tighter than a banker's purse" },
    { id: 'cait_stinger', from: 'needle_kiss', name: 'Needle Kiss Stinger', desc: 'A Needle Kiss stinger. It still crackles with static' },
    { id: 'cait_eye', from: 'cokatolis', name: 'Cokatolis Eye', desc: "A Cokatolis eye, clear as glass. Best not to stare into it" },
    { id: 'cait_card', from: 'joker', name: 'Lucky Joker Card', desc: "A Joker's lucky card: the ace of hearts... this time" },
  ];
  Object.assign(FF7.data.keyItems, {
    cait_list: { name: "Cait's Parts List", desc: 'Grangalan Mainspring, Needle Kiss Stinger, Cokatolis Eye, Lucky Joker Card' },
  });
  PARTS.forEach(p => { FF7.data.keyItems[p.id] = { name: p.name, desc: p.desc }; });
  // one of each, while the quest is on, from the first of that monster beaten
  FF7.questDrops = FF7.questDrops || [];
  FF7.questDrops.push(function (e, got) {
    const f = FF7.state.flags;
    if (!f.cait_quest_started || f.cait_parts_all) return null;
    const p = PARTS.find(q => q.from === e.id);
    if (!p || hasKey(p.id) || got.includes(p.id)) return null;
    if (PARTS.every(q => q === p || hasKey(q.id) || got.includes(q.id))) f.cait_parts_all = true;
    return p.id;
  });

  // ------------------------------------------------------------------ MOG Mk.II, the giant robot moogle
  FF7.creatures.MODELS = FF7.creatures.MODELS || {};
  FF7.creatures.MODELS.mog_mk2 = function () {
    const m = FF7.chars3d.build({ rig: 'moogle', c1: '#cfd3dc', c2: '#ff3a2a', wing: '#5a5e6a' }, { style: 'battle' });
    m.enemyHuman = true; m.scale = 3.6;
    if (m.anims && m.anims.idle) m.play(m.anims.idle);
    return m;
  };
  // One fight, three strengths: it's pitched at the party near the end of the disc it's fought on (a notch under that
  // disc's last story bosses in js/data: Jenova-LIFE / Lost Number, Carry Armor, Jenova-SYNTHESIS), so it's a real
  // fight whenever it comes - and a stiff one on Disc 1 straight after Cait Sith joins.
  const MOG_TIERS = {
    1: { level: 38, hp: 8000, exp: 3000, ap: 300, gil: 3000, atk: 95, def: 110, defPct: 6, mat: 45, mdf: 200, dex: 70, lck: 8, drop: 'elixir', steal: 'hi_potion' },
    2: { level: 48, hp: 22000, exp: 8000, ap: 800, gil: 8000, atk: 120, def: 180, defPct: 8, mat: 80, mdf: 280, dex: 90, lck: 10, drop: 'megalixir', steal: 'elixir' },
    3: { level: 60, hp: 45000, exp: 20000, ap: 2000, gil: 15000, atk: 145, def: 200, defPct: 10, mat: 115, mdf: 300, dex: 110, lck: 12, drop: 'megalixir', steal: 'megalixir' },
  };
  const mogId = () => { const d = Math.max(1, Math.min(3, (FF7.state && FF7.state.disc) || 1)); return d === 1 ? 'mog_mk2' : 'mog_mk2_d' + d; };
  const MOG_BASE = {
    name: 'MOG Mk.II', mp: 400,
    elem: { lightning: 2, gravity: 0 },   // (a robot: electricity shorts it out)
    immune: ['death', 'sleep', 'poison', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence',
      'manipulate', 'berserk', 'paralysis'],
    morph: null,
    boss: true, flying: false, row: 'front',
    look: { type: 'machine', c1: '#cfd3dc', c2: '#5a5e6a', c3: '#ff3a2a', size: 2.4 },
    attacks: {
      mog_punch: { name: 'Mog Punch', kind: 'phys', power: 34, element: 'hit', target: 'enemy' },
      kupo_stomp: { name: 'Kupo Stomp', kind: 'phys', power: 24, element: 'hit', target: 'allEnemies' },
      nose_laser: { name: 'Nose Laser', kind: 'mag', power: 14, target: 'allEnemies' },
      big_hug: { name: 'Big Hug', kind: 'status', add: ['slow'], hit: 75, target: 'enemy' },
      kupo_dance: { name: 'Kupo Dance', kind: 'heal', power: 60, element: 'restorative', target: 'self' },
    },
    ai: {
      moves: [['mog_punch', 40], ['nose_laser', 25], ['kupo_stomp', 20], ['big_hug', 15]],
      // punch, punch-laser, stomp, hug; below half it dances itself back up (twice at most); below a quarter it
      // overcharges and fires the laser twice running
      custom: function (e, b) {
        const v = e.vars;
        v.n = (v.n || 0) + 1;
        if (v.laser2) { v.laser2 = false; return { move: 'nose_laser', target: 'all' }; }
        if (e.hpPct < 50 && (v.danced || 0) < 2 && v.n % 4 === 0) { v.danced = (v.danced || 0) + 1; return { move: 'kupo_dance', target: 'self' }; }
        if (e.hpPct < 25 && v.n % 3 === 0) { v.laser2 = true; return { move: 'nose_laser', target: 'all' }; }
        const r = b.rnd(100);
        if (r < 40) return { move: 'mog_punch', target: 'random' };
        if (r < 65) return { move: 'nose_laser', target: 'all' };
        if (r < 85) return { move: 'kupo_stomp', target: 'all' };
        return { move: 'big_hug', target: 'random' };
      },
    },
    desc: 'A giant robot moogle, built for power and "fluffiness". A little plate on the back of its head says MOG Mk.II.',
  };
  [1, 2, 3].forEach(d => {
    const t = MOG_TIERS[d], id = d === 1 ? 'mog_mk2' : 'mog_mk2_d' + d;
    FF7.data.enemies[id] = Object.assign({}, MOG_BASE, {
      level: t.level, hp: t.hp, exp: t.exp, ap: t.ap, gil: t.gil, atk: t.atk, def: t.def, defPct: t.defPct,
      mat: t.mat, mdf: t.mdf, dex: t.dex, lck: t.lck,
      drops: [{ item: t.drop, chance: 100 }], steal: [{ item: t.steal, chance: 50 }],
    });
    FF7.creatures.MODELS[id] = FF7.creatures.MODELS.mog_mk2;
  });
  // ------------------------------------------------------------------ the ambush: a (silly) scene, then the boss
  // With all four parts, the party's first steps out on the world map (on foot or on a chocobo) cut to a clearing
  // like the ground it stood on - the hills round North Corel or the grassland - where MOG Mk.II stomps up, makes
  // its demands, very nearly gives its maker away, and fights. Beaten, it reboots, walks into a rock and waddles
  // off home towards the Gold Saucer (the "OUT FOR A WALK" card in its empty bay). Then back out where they were.
  if (FF7.world) {
    if (!Array.isArray(FF7.world.stepHooks)) FF7.world.stepHooks = [];
    FF7.world.stepHooks.push(function caitMog(ctx) {
      const f = FF7.state.flags;
      if (!on() || !f.cait_parts_all || f.cait_mog_beaten || !ctx || ctx.x == null) return null;
      if (ctx.vehicle && ctx.vehicle !== 'chocobo') return null;
      const map = ctx.region === 'corel_area' ? 'cait_mog_hills' : 'cait_mog_grass';
      return function* (s) {
        s.setVar('cait_mog_ret', [ctx.x, ctx.y, ctx.vehicle || null]);
        yield s.goto(map, 'start');
      };
    });
  }
  // what the party says (the leader's two companions, whoever they are)
  const PAL = {
    thud: { barret: "Whoa! Earthquake?!", tifa: "Cloud... did you feel that?", aeris: "Um... was that your stomach?",
      redxiii: "Something heavy approaches. Something... very heavy.", yuffie: "That wasn't me! ...That wasn't me, right?",
      cid: "What in the blazes...?", vincent: "......Something's coming." },
    see: { barret: "The hell?! Somebody's been feedin' that moogle WAY too much!", tifa: "That's... a moogle. A really, really BIG moogle.",
      aeris: "Aww, it's so cute! ...And it's glaring at us. Less cute.", redxiii: "In all my years, I have never seen a moogle with a siren for a nose.",
      yuffie: "Ooh! Can I keep it?! ...Hey, why's its nose doing that?!", cid: "Well, I'll be. Some lunatic went and built a moogle TANK!",
      vincent: "...It's a machine. And it's staring at me." },
    cat: { barret: "I heard 'cat'. Y'all heard 'cat'.", tifa: "...I'm pretty sure it did.", aeris: "Mm-hm. Definitely 'cat'.",
      redxiii: "It did. Quite clearly.", yuffie: "It TOTALLY said 'cat'!", cid: "Clear as day, kid.", vincent: "...It did." },
    after: { barret: "...It's walkin' off toward the Gold Saucer. Ain't that somethin'.", tifa: "...Isn't that the way to the Gold Saucer?",
      aeris: "Bye-bye, big moogle! ...It's going toward the Gold Saucer, isn't it?", redxiii: "It is heading for the Gold Saucer. How curious.",
      yuffie: "It's going to the Gold Saucer! I KNEW it! ...Wait. What did I know?", cid: "Gold Saucer's that way. Funny, that.",
      vincent: "...The Gold Saucer." },
  };
  function* mogScene(s, bg) {
    const P = party(), lead = (P && P.leader() && P.leader().id) || 'cloud';
    const pals = (FF7.state.party || []).filter(id => id && id !== lead).slice(0, 2), pal = pals[0];
    const palSay = function* (k) { if (pal && PAL[k][pal]) yield s.say(pal, PAL[k][pal]); };
    [[8, 8], [12, 8]].forEach(([x, y], i) => { if (pals[i]) s.spawn(pals[i], pals[i], x, y, 'down', { name: s.name(pals[i]) }); });
    s.music('none');
    yield 30;
    yield s.say(lead, "That's all four parts. Let's get them back to Cait Sith.");
    // ...thud. ...Thud. ...THUD.
    yield 20;
    s.sfx('hit'); s.shake(1, 12);
    yield 36;
    s.emote('player', '?'); pals.forEach(id => s.emote(id, '?'));
    yield 24;
    s.sfx('hit'); s.shake(2, 14);
    yield 30;
    s.sfx('hit'); s.shake(3, 20);
    yield* palSay('thud');
    // it stomps in from the north, a hop at a time
    s.spawn('mog', { enemy: mogId(), scale: 2.6 }, 10, 0, 'down', { name: 'MOG Mk.II' });
    yield s.face('player', 'up'); pals.forEach(id => s.face(id, 'up'));
    for (let y = 1; y <= 4; y++) {
      yield s.jump('mog', 10, y, 0.35, 14);
      s.sfx('hit'); s.shake(2, 10);
      yield 10;
    }
    s.emote('player', '!!'); pals.forEach(id => s.emote(id, '!!'));
    // its nose, going off like a siren
    for (let i = 0; i < 3; i++) { s.sfx('beep'); s.flash('#ff2020', 6, 0.35); yield 14; }
    yield s.say('MOG Mk.II', "BEEP. BOOP. KUPO.");
    yield s.say('MOG Mk.II', "INTRUDERS DETECTED. YOU ARE CARRYING: ONE MAINSPRING. ONE STINGER. ONE EYE.\fONE VERY LUCKY CARD.\fHAND THEM OVER. KUPO.");
    yield* palSay('see');
    yield s.say('MOG Mk.II', "THIS REQUEST DOES NOT COME FROM A CAT. NO CAT SENT ME. I HAVE NEVER MET A CAT. KUPO.");
    yield 24;
    yield s.say(lead, "......Did it just say 'cat'?");
    yield* palSay('cat');
    s.emote('mog', '!!'); s.sfx('error');
    yield s.say('MOG Mk.II', "ERROR. ERROR. DELETE PREVIOUS SENTENCE. KUPO.");
    yield 20;
    yield s.say('MOG Mk.II', "...SENTENCE DELETED.");
    yield s.say(lead, '......');
    yield s.say('MOG Mk.II', "VERY WELL. COMMENCING FLUFFY ANNIHILATION.");
    // the Kupo Dance (a spin on the spot), then the charge
    for (let k = 0; k < 2; k++) for (const d of ['left', 'up', 'right', 'down']) { yield s.face('mog', d); yield 4; }
    yield s.say('MOG Mk.II', "KUPOOOOOOOOOO!!");
    s.sfx('bolt'); s.flash('#ff3020', 12, 0.8);
    const r = yield s.battle({ enemies: [mogId()], bg, music: 'boss', noEscape: true });   // (this disc's strength)
    if (r !== 'win') return;
    s.set('cait_mog_beaten');
    // it powers down... and back up, and goes home (into a rock first)
    s.sfx('bolt'); s.flash('#ffffff', 6, 0.5); s.shake(2, 14);
    yield 16;
    s.sfx('error');
    yield s.say('MOG Mk.II', "kupo... kuuupo... battery... loww...");
    yield 40;
    s.sfx('beep'); yield 18; s.sfx('beep');
    yield s.say('MOG Mk.II', "...REBOOTING. KUPO.\fMISSION STATUS: ...EMBARRASSING.\fRETURNING TO BASE.");
    yield s.face('mog', 'right');
    yield s.move('mog', 13, 4);
    s.sfx('hit'); s.shake(1, 10); s.emote('mog', '!!');
    yield 24;
    yield s.say('MOG Mk.II', "...ROCK. KUPO.");
    yield s.face('mog', 'up');
    yield s.move('mog', 13, 1);
    yield s.move('mog', 10, 1);
    yield s.move('mog', 10, 0);
    s.remove('mog');
    yield 20;
    yield* palSay('after');
    yield s.face('player', 'down');
    yield s.say(lead, "......I think Cait Sith has some explaining to do.");
    // back out where the party was
    const ret = s.get('cait_mog_ret') || [];
    yield s.world(ret[0] != null ? { x: ret[0], y: ret[1], vehicle: ret[2] || undefined } : 'north_corel');
  }
  // the clearing: grassland (by the Weapon Seller) or the stony hills round North Corel; the gap at the top is where
  // MOG Mk.II comes in, the rock at (14,4) is the one it walks into; only low things along the front (south) edge,
  // between the camera and the party
  const clearing = (id, name, theme, rows, bg) => FF7.defineMap(id, {
    name, area: 'World', theme, music: 'none', camera: { pitch: 38, dist: 11.5 },
    grid: rows, entries: { start: [10, 7, 'down'] },
    onEnter: function* (s) { if (!FL().cait_mog_beaten) yield* mogScene(s, bg); },
  });
  clearing('cait_mog_grass', 'Grassland', 'grass', [
    "TT%TTTTT%...%TTTT%TT",
    "T%GG,,,,,,,,,,,,,G%T",
    "%G,,,,,,,,,,,,,,,,G%",
    "T,,,f,,,,,,,,,,,,,,T",
    "%,,,,,,,,,,,,,R,,,,%",
    "T,,R,,,,,,,,,,,,,f,T",
    "%,,,,,,,,,,,,,,,,,,%",
    "T,,,,,,,,,,,,,,,,,,T",
    "%G,,,,,,,,,,,,,,,,G%",
    "%%,G,,,,,,,,,,,,G,%%",
    "%%%%f%%%%%%%%%%f%%%%",
  ], 'grass');
  clearing('cait_mog_hills', 'Hills', 'canyon', [
    "RRRRRRRRR...RRRRRRRR",
    "RRx..............xRR",
    "Rx................xR",
    "R.....x............R",
    "R.............R....R",
    "R..R...............R",
    "R..................R",
    "R.....x............R",
    "Rx................xR",
    "xx................xx",
    "xxxxxxxxxxxxxxxxxxxx",
  ], 'corel');

  // ------------------------------------------------------------------ the fortune booth's hooks (c6a/part3.js fortune)
  const C = FF7.story.caitBooth = {};
  // (the booth can break: the extra is on, Cait Sith has joined and walks with the party, and it hasn't happened yet)
  C.ready = (s) => on() && s.flag('cait_joined') && s.inParty('caitsith') && !s.flag('cait_hideout_found');
  C.outOfOrder = (s) => s.flag('cait_hideout_found') && !s.flag('cait_booth_fixed');
  // readings in a row this visit (a new visit starts the count again)
  C.bump = function (s) {
    const gen = s.field ? s.field.loadGen : 0;
    const n = (s.get('cait_fortune_run_gen') === gen ? s.get('cait_fortune_run') || 0 : 0) + 1;
    s.setVar('cait_fortune_run', n); s.setVar('cait_fortune_run_gen', gen);
    return n;
  };
  C.warn = function* (s) {
    const n = s.get('cait_fortune_run') || 0;
    if (n === 6) { s.sfx('error'); yield s.msg('The machine gives a worrying rattle... and smells faintly of burnt toast.'); }
    else if (n === 8) { s.shake(1, 16); yield s.msg('A thin curl of smoke drifts out of the coin slot.'); }
    else if (n === 9) { s.shake(2, 20); s.sfx('error'); yield s.msg("The crystal ball is spinning much, much too fast. The whole cabinet hums like a kettle..."); }
  };
  // the booth sliding along the back wall (x from -> to, in tiles), and the door behind it
  function* slideBooth(s, from, to, n = 30) {
    const b = obj(s, 'fortune_booth'); if (!b) return;
    for (let t = 1; t <= n; t++) { const k = t / n; b.at = [from + (to - from) * k * k * (3 - 2 * k), 2]; yield 1; }
    b.at = [to, 2];
  }
  const setDoor = (s, shown) => { const d = obj(s, 'cait_door'); if (d) { d.shown = shown; d.stateKey = shown ? 'shown' : 'hidden'; } };

  // ------------------------------------------------------------------ it breaks
  C.breakDown = function* (s) {
    const booth = obj(s, 'fortune_booth');
    yield s.move('player', 21, 3);
    yield s.face('player', 'up');
    yield s.msg('The crystal ball spins faster... and faster... and FASTER...');
    s.sfx('bolt'); s.shake(3, 30); s.flash('#e08aff', 14, 0.7);
    if (booth) { booth.broken = true; booth.stateKey = 'broken'; }
    yield 24;
    s.sfx('error');
    yield s.msg('KA-CHUNK!\fSmoke puffs out of the coin slot, and a fortune slip flutters to the floor. It reads:\f"You broke it."');
    // Cait Sith jumps out of the party
    s.spawn('caitsith', 'caitsith', 20, 4, 'up', { name: s.name('caitsith') });
    yield s.jump('caitsith', 20, 3, 0.6, 18);
    s.emote('caitsith', '!!');
    yield s.say('caitsith', "Oi! OI! What've ye done to my machine?!");
    yield s.face('player', 'caitsith');
    yield s.say('cloud', "...I wanted my fortune.");
    s.anim('caitsith', 'shake');
    yield s.say('caitsith', "TEN times?! One after the other?! It's a crystal ball, not a slot machine!\fThe poor thing's been seein' the future so fast, it's gone and seen right through to next Tuesday!");
    s.stopAnim('caitsith');
    yield s.say('caitsith', "And don't go askin' for yer fifty gil back, either.");
    // he shoves the booth one tile east
    yield s.move('caitsith', 20, 2);
    yield s.face('caitsith', 'right');
    s.anim('caitsith', 'punch');
    yield 10;
    s.sfx('hit');
    setDoor(s, true);
    yield* slideBooth(s, 21, 22);
    s.stopAnim('caitsith');
    s.set('cait_hideout_found');
    yield 20;
    s.emote('player', '?');
    yield s.face('caitsith', 'player');
    yield s.say('caitsith', "...Right. Ye never saw that.");
    yield s.say('cloud', "...There's a door.");
    s.anim('caitsith', 'armscross');
    yield s.say('caitsith', "Och, FINE. Aye, it's a door. That's my hideout, that is.\fIt's where I keep all my tools, my gadgets... and my toys.\f...Not TOYS. Equipment. Very important equipment.");
    s.stopAnim('caitsith');
    yield s.say('caitsith', "I'll need my toolbox to fix this mess. You wait right here.\fAnd NO PEEKIN'!");
    yield s.run('caitsith', [[21, 2], [21, 1.6]]);
    s.sfx('door');
    s.remove('caitsith');
    if (party()) party().away('caitsith');
    yield s.face('player', 'up');
    yield s.msg(`${s.name('caitsith')} left the party.`);
  };

  // ------------------------------------------------------------------ Wonder Square: the door, the switch, the way in
  const doorOpen = () => { const f = FL(); return !!(f.cait_hideout_found && (!f.cait_booth_fixed || V().cait_door_open)); };
  // the hidden switch on the booth's left side: the booth talked to from the tile west of it, facing east
  C.atSwitch = function (s) {
    const p = s.field && s.field.player;
    if (!on() || !s.flag('cait_booth_fixed') || s.get('cait_door_open') || !p) return false;
    const da = Math.abs((((p.angle - Math.PI / 2) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
    return p.tx === 20 && p.ty === 2 && da < 0.6;
  };
  C.useSwitch = useSwitch;
  function* useSwitch(s) {
    yield s.msg("There's a tiny button hidden under the trim on the side of the machine.");
    const k = yield s.ask(null, 'Press it?', ['Press it', 'Leave it']);
    if (k !== 0) return;
    s.sfx('beep');
    yield 12;
    s.sfx('door_shinra');
    setDoor(s, true);
    yield* slideBooth(s, 21, 22, 32);
    s.setVar('cait_door_open', 1);
  }
  // coming back out: after the quest, Cait Sith mends the booth and puts it back; afterwards it closes behind you
  function* fixUp(s) {
    const booth = obj(s, 'fortune_booth');
    yield 10;
    s.spawn('caitsith', 'caitsith', 21, 2, 'down', { name: s.name('caitsith') });
    yield s.jump('caitsith', 22, 3, 0.5, 18);
    yield s.say('caitsith', "Right! Stand back! Genius at work!");
    yield s.face('caitsith', 'up');
    s.anim('caitsith', 'kneel');
    for (let i = 0; i < 3; i++) { yield 12; s.sfx('hit'); }
    yield 8;
    s.sfx('bolt'); s.flash('#e08aff', 10, 0.6);
    if (booth) { booth.broken = false; booth.stateKey = 'ok'; }
    s.sfx('ching');
    s.stopAnim('caitsith');
    yield 20;
    yield s.face('caitsith', 'player');
    yield s.say('caitsith', "Good as new! Better, even. Now for the finishin' touch...");
    yield s.run('caitsith', 23, 2);
    yield s.face('caitsith', 'left');
    s.anim('caitsith', 'punch');
    yield 10;
    s.sfx('hit');
    yield* slideBooth(s, 22, 21);
    setDoor(s, false);
    s.stopAnim('caitsith');
    s.set('cait_booth_fixed');
    s.setVar('cait_door_open', 0);
    yield s.say('caitsith', "There! Nobody'd ever know there was a door there.");
    yield s.run('caitsith', 22, 3);
    yield s.face('caitsith', 'player');
    yield s.say('caitsith', "Oh! And if ye ever fancy a visit, there's a wee switch hidden on the LEFT side of the machine.\fGive it a press and... well, ye'll see.\fIt's a SECRET, mind! Don't go tellin' just anybody.");
    s.remove('caitsith');
  }
  function* closeBehind(s) {
    yield 16;
    s.sfx('door_shinra');
    yield* slideBooth(s, 22, 21, 32);
    setDoor(s, false);
    s.setVar('cait_door_open', 0);
  }
  FF7.patchMap('gs_wonder', {
    objects: [
      { id: 'cait_door', at: [21, 2], prop: 'caitdoor', get shown() { return doorOpen(); }, get stateKey() { return this.shown ? 'shown' : 'hidden'; } },
    ],
    exits: [{ at: [21, 2, 1, 1], to: 'gs_cait_hideout', entry: 'from_wonder', sfx: 'door', if: () => doorOpen() }],
    onEnter: function* (s) {
      if (s.entry() !== 'from_hideout') return;
      const f = FL();
      if (f.cait_quest_done && !f.cait_booth_fixed) yield* fixUp(s);
      else if (f.cait_booth_fixed && V().cait_door_open) yield* closeBehind(s);
    },
  });
  if (FF7.maps.gs_wonder) FF7.maps.gs_wonder.entries.from_hideout = [21, 3, 'down'];

  // ------------------------------------------------------------------ the workshop
  const withCait = (s) => s.flag('cait_hideout_welcome') && !s.flag('cait_quest_done');
  const beaten = () => !!FL().cait_mog_beaten;
  const ITEMS = ['spares', 'bay', 'toys', 'radio', 'midgar', 'bench', 'plans', 'crates', 'bed', 'cabinet'];
  // look at a thing (text, and his quip if he's home); once everything's been looked at, the quest begins
  const look = (key, text, quip) => function* (s) {
    const t = typeof text === 'function' ? text(s) : text, q = typeof quip === 'function' ? quip(s) : quip;
    yield s.msg(t);
    if (q && withCait(s)) yield s.say('caitsith', q);
    if (!s.flag('cait_hideout_welcome')) return;
    const seen = (s.get('cait_seen') || 0) | (1 << ITEMS.indexOf(key));
    s.setVar('cait_seen', seen);
    if (!s.flag('cait_quest_started') && ITEMS.every((k, i) => seen & (1 << i))) yield* questStart(s);
  };
  const SPARES = look('spares', "Three more Cait Siths stand in a row, perfectly still. Their eyes are dark.\f...Spares?",
    "M-mannequins! For... displayin' costumes. Aye. Costumes. Move along!");
  const MOGBAY = look('bay',
    s => !beaten() ? "A giant moogle stands in the charging bay, cables plugged into its back. A tag hangs from one wing:\f\"MOG Mk.II - DO NOT RIDE UNTIL FULLY CHARGED.\""
      : !s.flag('cait_quest_done') ? "The charging bay is empty. A hand-written card dangles from the cables:\f\"OUT FOR A WALK. BACK SOON.\""
      : arcadeOn() ? "MOG Mk.II's tummy panel hangs open, wires everywhere. Every time a bolt is tightened, something inside goes \"kupo\"."
      : "MOG Mk.II is back in its bay, a big sticking plaster across its forehead. It won't look you in the eye.",
    s => !beaten() ? "That's my spare ride. Faster, fluffier, fully waterproof. ...Mostly waterproof." : "It's, er... bein' serviced.");
  const BAY = function* (s) { if (FL().cait_arcade_done) { yield* library(s); return; } yield* MOGBAY(s); };
  const TOYS = look('toys', 'Shelf after shelf of little moogle figures, from all over the world. Each one has a tiny name tag.\fSome of the tags are still blank, waiting for a name.',
    "Every one of 'em's got a story. I'll tell ye some day... if ye're good.");
  const RADIO = look('radio', "A radio set with a very long antenna, humming softly. A stamp on its side reads:\f\"SHINRA ELECTRIC POWER CO. - URBAN DEVELOPMENT DEPT.\"",
    "Borrowed! It's... borrowed. For callin' home. Don't touch the dials.");
  const MIDGAR = look('midgar', "A model of Midgar, built with loving care: every plate, every pillar, every slum street.\fTiny paper flags are pinned all over it. They say \"fix\", \"rebuild\" and \"someday\".",
    "...Somebody's got big plans for that city. Someday.");
  const BENCH = look('bench', "A cluttered workbench: springs, bells, spare whiskers, a soldering iron that's still warm...\f...and a half-built moogle paw that twitches whenever you look away.",
    "Don't mind the paw. It does that.");
  const PLANS = look('plans', "Blueprints, drawn over and over: a giant moogle, a smaller moogle, a moogle with wheels.\fScrawled along the bottom: \"Why do moogles float?? FIND OUT.\"",
    "Science waits for no cat.");
  const CRATES = look('crates', 'Crates of spare parts. One is labelled "EXTRA WHISKERS". Another just says "DON\'T".');
  const CATBED = look('bed', "A plush little cat bed, spotless. It looks like nobody has ever slept in it.",
    "...Aye, well. I'm a busy cat.");
  const CABINET = look('cabinet', 'A second Crystal Fortune cabinet, in pieces, its crystal ball missing. Wires spill out of the coin slot.',
    "My first attempt. It told fortunes backwards. Ye'd find out what happened yesterday.");
  const CAIT_LINES = [
    "Every gadget in here was made by these very paws. Well... mostly by these paws.",
    "Somebody once told me a moogle's the best friend a fella can have. Never forgot it.",
    "Go on, have a look round. Just don't press the big red button. ...There isn't a big red button. Forget I said that.",
    "I like it in here. Nobody asks what I'm for.",
  ];
  // what he says about the things you haven't looked at yet (a nudge towards the one that's left)
  const HINTS = {
    spares: "Don't mind my... mannequins, over there. Actually, do mind them. No, don't. Oh, just look.",
    bay: "Have ye seen my MOG Mk.II in the charging bay? Isn't she a beauty?",
    toys: "Have ye seen my moogle collection? On the shelves under the sign.",
    radio: "Don't touch the radio in the corner. Seriously. ...Ye want to touch it now, don't ye.",
    midgar: "Have ye had a look at the model on the table? Took me months, that did.",
    bench: "Mind the workbench. The paw bites. ...Only a wee bit.",
    plans: "Have ye seen my blueprints? Up on the wall, just past the end of my workbench. Genius, pure genius.",
    crates: "The crates by the door are spare parts. Mostly.",
    bed: "That's my bed in the corner. Don't ask.",
    cabinet: "The old cabinet by the radio was my first go at a fortune machine.",
  };
  function* caitTalk(s) {
    if (!withCait(s)) return;
    if (!s.flag('cait_quest_started')) {   // (still looking round: point at something not yet seen)
      const seen = s.get('cait_seen') || 0, next = ITEMS.find((k, i) => !(seen & (1 << i)));
      if (next) { yield s.face('caitsith', 'player'); yield s.say('caitsith', HINTS[next]); yield s.face('caitsith', 'left'); return; }
    }
    yield s.face('caitsith', 'player');
    if (s.flag('cait_quest_started') && !beaten()) {
      const left = PARTS.filter(p => !hasKey(p.id)).map(p => p.name);
      if (left.length) yield s.say('caitsith', `Still need: ${left.join(', ')}.\fGrangalans, Needle Kisses and Cokatolis in the hills round North Corel; Jokers on the grassland south o' the desert, round the Weapon Seller's.`);
      else yield s.say('caitsith', "Ye've got the lot?! Brilliant! Before ye hand them over... do us a favour and check the coast's clear outside.I heard somethin' big stompin' about out there. Probably nothin'. Definitely nothin'.");
    } else {
      const k = s.get('cait_talk_n') || 0;
      s.setVar('cait_talk_n', k + 1);
      yield s.say('caitsith', CAIT_LINES[k % CAIT_LINES.length]);
    }
    yield s.face('caitsith', 'left');
  }
  // everything looked at: he tries the machine's parts and loses his temper
  function* questStart(s) {
    s.set('cait_quest_started');
    yield s.face('caitsith', 'left');
    s.anim('caitsith', 'kneel');
    for (let i = 0; i < 3; i++) { yield 14; s.sfx('hit'); }
    yield 10;
    s.sfx('error');
    s.stopAnim('caitsith');
    s.anim('caitsith', 'shake');
    yield s.say('caitsith', "ARGH! No, no, NO!");
    s.stopAnim('caitsith');
    yield s.face('caitsith', 'player');
    yield s.say('caitsith', "Ye've had a good look round, then? Good. Because I've had a good look at that machine, and it's a DISASTER.\fThe mainspring's snapped, the wiring's fried, the crystal's cracked, and the lucky card's gone up in smoke!");
    yield s.say('caitsith', "I cannae fix it without proper parts. And I cannae go and get them. I'm... busy. Very busy.\fSo YOU'RE goin'.");
    yield s.say('caitsith', "Four things, and the monsters round here have got the lot:\f- A Grangalan's mainspring. Those dolls are wound tighter than a banker's purse.\f- A Needle Kiss stinger, still buzzin'. For the wiring.\f- A Cokatolis eye. Clearest glass in the world. For the crystal.\f- And a lucky card off a Joker. Every fortune machine needs a bit of luck in its heart.");
    yield s.say('caitsith', "Grangalans, Needle Kisses and Cokatolis live in the hills round North Corel. Jokers hang about on the grassland south o' the desert, round the Weapon Seller's place. Ye'll not get there on foot from North Corel, mind. Ye'll need wheels.\fOff ye go! And... er... watch yer backs out there. Ye never know what's lurkin' about.");
    yield s.give('cait_list');
    yield s.face('caitsith', 'left');
  }
  // back with the parts, after MOG Mk.II: the cold stare
  function* questReturn(s) {
    yield s.move('player', 4, 5);
    yield s.face('player', 'left');
    yield s.face('caitsith', 'player');
    yield s.say('caitsith', "Ye're back! Well? Did ye get my parts?");
    s.anim('player', 'armscross');
    yield 30;
    yield s.msg(`${s.name('cloud')} hands over the parts... without taking his eyes off ${s.name('caitsith')} for a second.`);
    PARTS.concat([{ id: 'cait_list' }]).forEach(p => { if (FF7.sys && FF7.sys.inv) FF7.sys.inv.removeKey(p.id); });
    yield s.say('cloud', '......');
    yield 30;
    yield s.say('caitsith', "......What? What's that face for?");
    yield s.say('cloud', '............');
    s.emote('caitsith', '!!');
    yield s.say('caitsith', "Now hold on! I never sent any giant moogle after ye!\f...Er. Not that there WAS a giant moogle. Was there a giant moogle?\fWell, if there was, it wisnae mine! It was... SHINRA! Aye! Shinra's always buildin' daft robots. Big ones. Fluffy ones. Terrible people!");
    s.emote('player', '...');
    yield 20;
    yield s.msg(`${s.name('cloud')} glances at the empty charging bay.`);
    yield s.say('caitsith', "...ANYWAY! The machine! The poor wee broken machine! Let's see what ye brought me!");
    s.stopAnim('player');
    // the workbench: spare parts out of monster bits
    yield s.face('caitsith', 'left');
    s.anim('caitsith', 'kneel');
    s.sfx('hit'); yield 12; s.sfx('bolt'); s.flash('#ffffff', 8, 0.5); yield 12; s.sfx('hit'); yield 12; s.sfx('ching'); yield 20;
    s.stopAnim('caitsith');
    yield s.msg('Cait Sith gets to work. Sparks fly. Something goes "boing". Something else goes "kupo".');
    yield s.face('caitsith', 'player');
    s.anim('caitsith', 'fistpump');
    yield s.say('caitsith', "TA-DA! A brand-new mainspring, fresh wiring, a crystal clearer than a Mideel mornin', and the luckiest card in the whole world!\fAm I good, or am I GOOD? Don't answer that. I'm GOOD.");
    s.stopAnim('caitsith');
    yield s.say('caitsith', "Right! Let's go put the old girl back together. And I'm comin' with ye, too. Somebody's got to keep an eye on ye.");
    if (party()) party().back('caitsith');
    s.set('cait_quest_done');
    s.hide('caitsith');
    yield s.msg(`${s.name('caitsith')} rejoined the party.`);
  }
  // out you go: he chases the player back to the door, which walks backwards out of it
  function* shoo(s) {
    yield s.run('caitsith', 6, 7);
    s.anim('caitsith', 'punch');
    s.sfx('jump');
    yield s.move('player', 6, 9, { reverse: true, run: true });
    s.sfx('door');
    yield s.goto('gs_wonder', 'from_hideout');
  }

  // ------------------------------------------------------------------ part two: the arcade model and the MogBoy
  // With the booth mended, the next visit to the workshop: Cait Sith hops out of the party to look over MOG Mk.II ("an
  // ARCADE model, no' a combat model!", muttering about who dented it), and stays to mend it - away again - while the
  // party plays every game in Wonder Square once ("market research"). Back with every game played: the MogBoy (a
  // handheld; key item, used from the Item menu anywhere) and, free, the Kupomon cartridge (Cloud's to beta test), he
  // rejoins, and MOG Mk.II is now the Arcade Library: a GP shop of the other cartridges. Flags: cait_arcade_started, cait_arcade_done. Vars: cait_arcade_played (bits of
  // WS_GAMES, plays since he asked), mogboy_carts (bits of CARTS).
  const WS_GAMES = [
    { key: 'dunk', title: 'Super Dunk', is: (id, o) => id === 'darts' && o.variant === 'super_dunk' },
    { key: 'gbike', title: 'G-Bike', is: (id, o) => id === 'motorcycle' && o.mode === 'gbike' },
    { key: 'catcher', title: 'Wonder Catcher', is: (id) => id === 'catcher' },
    { key: 'mog', title: "Mog's House", is: (id) => id === 'mog_house' },
    { key: 'battler', title: '3-D Battler', is: (id) => id === 'battler' },
    { key: 'arm', title: 'Arm Wrestling', is: (id) => id === 'arm_wrestle' },
    { key: 'condor', title: 'Condor Command', is: (id) => id === 'condor_command' },
    // (these two cabinets only run once their games are out: js/maps/c12/part4.js)
    { key: 'snow', title: 'Snowboard', is: (id, o) => id === 'snowboard' && o.mode === 'gold_saucer', open: () => !!FL().disc2 },
    { key: 'torpedo', title: 'Torpedo Attack', is: (id, o) => id === 'submarine' && o.mode === 'torpedo_attack', open: () => !!FL().has_submarine },
  ];
  const wsOpen = () => WS_GAMES.filter(g => !g.open || g.open());
  const wsLeft = () => { const b = V().cait_arcade_played || 0; return wsOpen().filter(g => !(b & (1 << WS_GAMES.indexOf(g)))); };
  const arcadeOn = () => { const f = FL(); return !!(f.cait_arcade_started && !f.cait_arcade_done); };
  // a game started in Wonder Square while he's waiting counts (not the MogBoy's: opts.mogboy)
  if (FF7.minigames && FF7.minigames.start) {
    const start0 = FF7.minigames.start;
    FF7.minigames.start = function (id, opts) {
      const o = opts || {}, fs = FF7.fieldScene;
      if (on() && arcadeOn() && !o.mogboy && fs && fs.map && fs.map.id === 'gs_wonder') {
        const k = WS_GAMES.findIndex(g => g.is(id, o));
        if (k >= 0) V().cait_arcade_played = (V().cait_arcade_played || 0) | (1 << k);
      }
      return start0.apply(this, arguments);
    };
  }
  // (for the runner's plan: the games still to play, the cartridges)
  FF7.story.caitArcade = { left: () => wsLeft().map(g => g.key), on: () => arcadeOn(),
    carts: () => CARTS.map(c => ({ key: c.key, title: c.title, gp: c.gp, open: !c.open || c.open(), owned: owns(c), shop: !c.free })) };
  FF7.data.keyItems.mogboy = { name: 'MogBoy', desc: "Cait Sith's handheld game machine. Select it to play your cartridges.", use: mogboy };

  // he looks MOG Mk.II over, and stays to mend it
  function* arcadeStart(s) {
    s.set('cait_arcade_started');
    s.setVar('cait_arcade_played', 0);
    // (he stays: this is the Cait Sith at the bay, talked to while he works, until the MogBoy's done)
    s.spawn('cait_bay', 'caitsith', 7, 8, 'up', { name: s.name('caitsith'), talk: arcadeTalk });
    yield s.jump('cait_bay', 7, 7, 0.5, 14);
    yield s.say('caitsith', "Right! Machine's fixed, the coast's clear... time to have a wee look at my poor MOG.");
    yield s.run('cait_bay', [[8, 6], [8, 3], [6, 3]]);   // (round the model table)
    yield s.face('cait_bay', 'up');
    s.anim('cait_bay', 'kneel');
    for (let i = 0; i < 2; i++) { yield 14; s.sfx('hit'); }
    yield 12;
    s.stopAnim('cait_bay');
    s.anim('cait_bay', 'shake');
    yield s.say('caitsith', "Och, ye poor thing. Dents everywhere. Scorch marks. Is that a SWORD mark?!");
    s.stopAnim('cait_bay');
    yield s.move('player', [[5, 7], [5, 3]]);
    yield s.face('player', 'right');
    yield s.face('cait_bay', 'player');
    yield s.say('caitsith', "Ye know, MOG Mk.II was never built for fightin'. She's no' a COMBAT model! She's an ARCADE model!\fLook! There's a coin slot in her tummy!");
    yield s.say('cloud', "...It attacked us.");
    yield s.say('caitsith', "She was... confused. Aye. Very confused. Nothin' to do wi' me.");
    yield s.face('cait_bay', 'up');
    s.anim('cait_bay', 'kneel');
    yield 20;
    yield s.say('caitsith', "(...great big lump... whackin' my poor girl wi' that great big sword... could've just HANDED the parts over... spiky-headed so-and-so... mutter mutter...)");
    s.stopAnim('cait_bay');
    yield s.say('cloud', "......What was that?");
    s.emote('cait_bay', '!!');
    yield s.jump('cait_bay', 6, 3, 0.4, 10);
    yield s.face('cait_bay', 'player');
    yield s.say('caitsith', "Nothin'! I said nothin'! ...Right. Fixin' her up's gonna take a while, and I'll need peace and quiet.");
    yield s.say('caitsith', "So do us a favour while I work. Go and play every game in Wonder Square. Every single one, at least once.\fI need to know what folk like. Market research!");
    yield s.say('cloud', "...You want me to play arcade games.");
    s.anim('cait_bay', 'fistpump');
    yield s.say('caitsith', "For SCIENCE! Now off ye go. Shoo!");
    s.stopAnim('cait_bay');
    yield s.face('cait_bay', 'up');
    s.anim('cait_bay', 'kneel');
    if (party()) party().away('caitsith');
    yield s.msg(`${s.name('caitsith')} left the party.`);
  }
  // at the bay while he works: what's still to play
  function* arcadeTalk(s) {
    const left = wsLeft();
    yield s.face('cait_bay', 'player');
    if (!left.length) { yield* mogboyReveal(s); return; }
    yield s.say('caitsith', `Still workin'! Have ye played everything yet?\fYe've still to try: ${left.map(g => g.title).join(', ')}.`);
    yield s.face('cait_bay', 'up');
  }
  // every game played: the MogBoy
  function* mogboyReveal(s) {
    s.set('cait_arcade_done');
    yield s.face('cait_bay', 'player');
    yield s.jump('cait_bay', 6, 3, 0.6, 16);
    s.anim('cait_bay', 'fistpump');
    yield s.say('caitsith', "Ye're back! And ye've played the LOT? Perfect timin'!");
    s.stopAnim('cait_bay');
    yield s.move('player', [[5, 7], [5, 3]]);
    yield s.face('player', 'right');
    yield s.say('caitsith', "All that market research gave me an idea. Feast yer eyes on my greatest invention yet...");
    s.sfx('levelup'); s.flash('#c8ffb0', 10, 0.6);
    yield s.say('caitsith', "...the MOGBOY!");
    yield s.msg("Cait Sith holds up a little grey handheld machine: a tiny green screen, a cross-shaped pad and two red buttons.");
    yield s.say('caitsith', "A whole arcade, right in yer pocket! Here. It's yours.");
    s.emote('player', '...');
    yield 20;
    yield s.say('cloud', "......Is it going to explode?");
    s.anim('cait_bay', 'shake');
    yield s.say('caitsith', "It's no' a BOMB! And it's no' a trick, either! Honest!\fIt plays games. That's it. That's all it does.");
    s.stopAnim('cait_bay');
    yield s.say('caitsith', "...Mind you, the game cartridges cost extra. A cat's got to eat.");
    yield s.give('mogboy');
    yield* kupomonGift(s, 'cait_bay');   // (...except one)
    if (party()) party().back('caitsith');
    yield s.msg(`${s.name('caitsith')} rejoined the party.`);
    yield s.say('caitsith', "Oh! And while I was in there, I made a few wee modifications to MOG Mk.II. Say hello to...");
    yield s.face('cait_bay', 'up');
    s.sfx('beep'); s.flash('#ff2020', 6, 0.3); yield 12; s.sfx('beep');
    yield s.say('MOG Mk.II', "BEEP. BOOP. WELCOME TO THE MOG Mk.II ARCADE LIBRARY. KUPO.\fI NOW SELL GAMES. I NO LONGER ATTACK CUSTOMERS. KUPO.");
    yield s.face('cait_bay', 'player');
    yield s.say('caitsith', "Every game in Wonder Square, on its own wee cartridge. Bring yer GP!\fThen pick the MogBoy from yer Key Items, wherever ye are, and play away.");
    yield s.say('caitsith', "Right! Back to work... I mean, back to adventurin'. Let's go!");
    s.hide('cait_bay');
  }

  // the Arcade Library (MOG Mk.II, after all that): cartridges for GP. Snowboard and Torpedo Attack once their cabinets run
  const CARTS = [
    { key: 'gbike', title: 'G-Bike', gp: 50, mg: 'motorcycle', opts: { mode: 'gbike' } },
    { key: 'battler', title: '3-D Battler', gp: 50, mg: 'battler' },
    { key: 'mog', title: "Mog's House", gp: 80, mg: 'mog_house' },
    { key: 'condor', title: 'Condor Command', gp: 100, mg: 'condor_command', pick: 'stage' },
    { key: 'snow', title: 'Snowboard', gp: 100, mg: 'snowboard', pick: 'course', open: () => !!FL().disc2 },
    { key: 'torpedo', title: 'Torpedo Attack', gp: 100, mg: 'submarine', pick: 'level', open: () => !!FL().has_submarine },
    // Kupomon (docs/KUPOMON.md): Cait Sith's greatest creation yet, a whole moogle-collecting RPG. Not in the Library:
    // he gives it to Cloud, his beta tester (kupomonGift)
    { key: 'kupomon', title: 'Kupomon', gp: 0, free: true, run: () => FF7.kupomon.play() },
  ];
  const owns = (c) => !!((V().mogboy_carts || 0) & (1 << CARTS.indexOf(c)));
  const SHOP = CARTS.filter(c => !c.free), KUPOMON = CARTS.find(c => c.key === 'kupomon');
  // Kupomon, free: at the MogBoy's reveal (who: Cait Sith at the bay), or, for a game that had the MogBoy from before
  // (when the Library sold it), the next time it's switched on (who: null, his voice from the party)
  function* kupomonGift(s, who) {
    const act = (a) => { if (who) s.anim(who, a); }, stop = () => { if (who) s.stopAnim(who); };
    if (who) { yield s.say('caitsith', '...Except for ONE.'); s.emote(who, '♪'); }
    else yield s.say('caitsith', "Oh! Before ye switch that on: remember how I said the cartridges cost extra?\f...There's ONE that doesn't.");
    act('fistpump');
    yield s.say('caitsith', "This one's my GREATEST creation yet. The best thing I've ever made. Bar none!");
    stop();
    s.sfx('levelup'); s.flash('#fff0a0', 10, 0.6);
    yield s.msg('Cait Sith holds up a little red cartridge. On its label, a moogle in a tiny cap waves a tiny flag.');
    yield s.say('caitsith', "KUPOMON! My masterpiece! My magnum opus! The crowning glory of a long and glittering career!");
    yield s.say('caitsith', "What's it about? Och, I'm no' tellin' ye THAT. Ye'll find out when ye play it!");
    yield s.say('cloud', who ? "(...Didn't he call the MogBoy his greatest creation? A minute ago?)" : '(...He said the same about the MogBoy.)');
    yield s.say('cloud', '(Everything he makes is his greatest creation yet.)');
    yield s.say('caitsith', "Now, it's no' in the shops. No' yet. Before the public gets their paws on it, I need someone to play it all the way through and tell me what's what.\fA BETA TESTER.");
    if (who) yield s.face(who, 'player');
    yield s.say('cloud', '...Me.');
    act('fistpump');
    yield s.say('caitsith', "You! Free of charge! Play it right through to the end, then come and tell me what ye think.\fHonestly, mind. ...But nicely.");
    stop();
    s.setVar('mogboy_carts', (V().mogboy_carts || 0) | (1 << CARTS.indexOf(KUPOMON)));
    s.sfx('found');
    yield s.msg('Got the Kupomon cartridge!');
  }
  function* library(s) {
    s.sfx('beep');
    for (;;) {
      const gp = s.gp(), list = SHOP.map(c => !c.open || c.open() ? (owns(c) ? `${c.title} (owned)` : `${c.title} (${c.gp} GP)`) : `${c.title} (coming soon)`);
      const k = yield s.ask('MOG Mk.II', `ARCADE LIBRARY. CARTRIDGES FOR THE MOGBOY. KUPO.\fYOU HAVE ${gp} GP.`, list.concat(['Leave']));
      if (k >= SHOP.length) { yield s.say('MOG Mk.II', 'THANK YOU. COME AGAIN. KUPO.'); return; }
      const c = SHOP[k];
      if (c.open && !c.open()) { yield s.say('MOG Mk.II', 'THAT GAME IS NOT OUT YET. KUPO.'); continue; }
      if (owns(c)) { yield s.say('MOG Mk.II', 'YOU ALREADY HAVE THAT ONE. KUPO.'); continue; }
      if (!s.takeGp(c.gp)) { yield s.say('MOG Mk.II', 'NOT ENOUGH GP. KUPO. TRY SUPER DUNK. KUPO.'); continue; }
      s.setVar('mogboy_carts', (V().mogboy_carts || 0) | (1 << CARTS.indexOf(c)));
      s.sfx('purchase');
      yield s.msg(`Got the ${c.title} cartridge!`);
    }
  }

  // the MogBoy (Item > Key Items, anywhere off the battlefield): its start-up screen, a cartridge, a game - for fun
  // (no gil, GP or prizes: those stay with the cabinets in Wonder Square)
  class MogBoyBoot {
    constructor(w) { this.w = w; this.t = 0; this.isMovie = false; }
    update() {
      this.t++;
      if (this.t === 46) FF7.audio.sfx('ching');
      if (this.t >= 110 || (this.t > 30 && FF7.input.pressed('ok'))) { FF7.sceneMgr.pop(); this.w.done = true; }
    }
    render() {
      const R = FF7.render, c = R.ctx, W = FF7.W, H = FF7.H;
      R.clear();
      // the handheld: a grey body, the dark bezel, the pale green screen, the pad and buttons below
      const bw = 300, bh = 420, bx = (W - bw) / 2, by = (H - bh) / 2;
      c.fillStyle = '#c4c4c8'; c.fillRect(bx, by, bw, bh);
      c.fillStyle = '#56565e'; c.fillRect(bx + 24, by + 24, bw - 48, 200);
      const sx = bx + 52, sy = by + 44, sw = bw - 104, sh = 160;
      c.fillStyle = '#9bbc0f'; c.fillRect(sx, sy, sw, sh);
      const k = Math.min(1, this.t / 46), ty = sy - 20 + (sh / 2 + 6) * k;
      c.save(); c.beginPath(); c.rect(sx, sy, sw, sh); c.clip();
      c.fillStyle = '#0f380f'; c.font = R.font(30, '800'); c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('MOGBOY', sx + sw / 2, ty);
      if (this.t > 50) { c.font = R.font(11, '700'); c.fillText('by CAIT SITH', sx + sw / 2, ty + 26); }
      c.restore();
      c.fillStyle = '#3a3a42'; c.fillRect(bx + 50, by + 290, 24, 72); c.fillRect(bx + 26, by + 314, 72, 24);
      c.fillStyle = '#a02040';
      c.beginPath(); c.arc(bx + 210, by + 336, 16, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(bx + 252, by + 314, 16, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#56565e'; c.font = R.font(13, '700'); c.textAlign = 'left'; c.fillText('MOGBOY  MB-01', bx + 30, by + 244);
    }
  }
  function* mogboy(s) {
    const w = { done: false }; FF7.sceneMgr.push(new MogBoyBoot(w)); yield w;
    const P = party();
    if (FL().cait_arcade_done && !owns(KUPOMON) && (!P || (P.isMember('caitsith') && !P.isAway('caitsith')))) yield* kupomonGift(s, null);
    const carts = CARTS.filter(owns);
    if (!carts.length) { yield s.msg('The MogBoy\'s screen says: "INSERT CARTRIDGE."\f(MOG Mk.II\'s Arcade Library, in Cait Sith\'s workshop, sells them for GP.)'); return; }
    for (;;) {
      const k = yield s.ask('MogBoy', 'Which game?', carts.map(c => c.title).concat(['Switch off']));
      if (k >= carts.length) return;
      const c = carts[k], o = Object.assign({ mogboy: true }, c.opts || {});
      if (c.run) { yield c.run(); continue; }   // (Kupomon: its own game, js/kupomon)
      if (c.pick === 'stage') {   // (Condor Command: any stage up to the arcade's next one; Endless once all are cleared)
        const ST = (FF7.minigames && FF7.minigames.condorStages) || [], n = Math.min(ST.length, (V().cc_cleared || 0) + 1);
        const opts = ST.slice(0, n).map((x, i) => `Stage ${i + 1}: ${x.name}`).concat((V().cc_cleared || 0) >= ST.length ? ['Endless'] : [], ['Back']);
        const j = yield s.ask('MogBoy', 'Which stage?', opts);
        if (j >= opts.length - 1) continue;
        if (j >= n) o.endless = true; else o.stage = j + 1;
      } else if (c.pick === 'course') {
        const j = yield s.ask('MogBoy', 'Which course?', ['Course A (Beginner)', 'Course B (Expert)', 'Course C (Crazy)', 'Back']);
        if (j > 2) continue;
        o.mode = 'gold_saucer'; o.course = 'ABC'[j];
      } else if (c.pick === 'level') {
        const lv = ['Undersea Reactor battle', 'Level 1', 'Level 2', 'Level 3', 'Level 4'];
        const j = yield s.ask('MogBoy', 'Which mission?', lv.concat(['Back']));
        if (j >= lv.length) continue;
        o.mode = 'torpedo_attack'; o.level = j;
      }
      yield s.minigame(c.mg, o);
    }
  }

  // ------------------------------------------------------------------ the review: Kupomon beaten
  // Cloud the Champion of the Kupo League in his own Kupomon game (KP.championIn: never the title's Demo), the next
  // time the party's free in a field (not the world map) Cait Sith hops out of the party: did ye beat it? Cloud nods.
  // The two talk it over with no words at all, only hands (to his theme); then Cait goes through every critique he
  // heard, one by one, takes them about as well as he takes anything, and announces Kupomon 2. Once:
  // flag cait_kupomon_review.
  const reviewDue = () => {
    const f = FL(), P = party(), K = FF7.kupomon;
    return on() && !FF7.state.kupomon && !!f.cait_arcade_done && !f.cait_kupomon_review && !!(K && K.championIn && K.championIn(FF7.state))
      && !!P && P.isMember('caitsith') && !P.isAway('caitsith') && FF7.state.menuEnabled !== false;
  };
  // where he lands: two tiles off the player (open floor between: a talking distance), to the side first; else beside him
  const besidePlayer = (fs) => {
    const p = fs.player; if (!p || !fs.P) return null;
    const taken = (x, y) => Object.values(fs.actors || {}).some(a => a !== p && a.visible !== false && a.tx === x && a.ty === y);
    const free = (x, y) => fs.P.walkable(x, y) && !taken(x, y);
    const side = { up: [[1, 0], [-1, 0]], down: [[-1, 0], [1, 0]], left: [[0, -1], [0, 1]], right: [[0, 1], [0, -1]] }[p.dir] || [];
    const dirs = side.concat([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    for (const [dx, dy] of dirs) if (free(p.tx + dx, p.ty + dy) && free(p.tx + 2 * dx, p.ty + 2 * dy)) return [p.tx + 2 * dx, p.ty + 2 * dy];
    for (const [dx, dy] of dirs) if (free(p.tx + dx, p.ty + dy)) return [p.tx + dx, p.ty + dy];
    return null;
  };
  function* caitReview(s) {
    const fs = s.field, p = fs.player, at = besidePlayer(fs);
    if (!at || !reviewDue()) return;
    s.set('cait_kupomon_review');
    const C = 'cait_review', song = FF7.audio.currentId || null, home = [p.tx, p.ty];
    // a gesture: held a moment, then a pause before the next (a conversation's pace, not a flurry)
    const beat = function* (who, anim, mark, t, gap = 34) { if (anim) s.anim(who, anim); if (mark) s.emote(who, mark, t); yield t; if (anim) s.stopAnim(who); yield gap; };
    // a hop on the spot (s.jump turns towards its target tile: on the spot that's nowhere in particular)
    const hop = (id, h, n) => { const a = s.actor(id); if (!a) return 1; a.jump = { t: 0, n, fx: a.x, fz: a.z, tx: a.x, tz: a.z, h }; s.sfx('jump'); return FF7.waitUntil(() => !a.jump); };
    const faceOff = function* () { yield s.face(C, 'player'); yield s.face('player', C); };
    // out of the party he hops
    s.spawn(C, 'caitsith', home[0], home[1], p.dir, { name: s.name('caitsith') });
    yield s.jump(C, at[0], at[1], 0.8, 22);
    yield* faceOff();
    s.emote(C, '!');
    yield s.say('caitsith', `Psst! ${s.name('cloud')}! Ye've had yer nose in that MogBoy for days, and now ye've got a look about ye...`);
    s.anim(C, 'point');
    yield s.say('caitsith', 'Well? Out with it! Did ye beat it? The Kupo League? Are ye... the CHAMPION?');
    s.stopAnim(C);
    yield 16;
    yield* beat('player', 'nod', null, 44, 20);
    s.sfx('levelup'); s.emote(C, '!!');
    yield hop(C, 0.9, 18);
    s.anim(C, 'fistpump');
    yield s.say('caitsith', "Ye DID?! My very first beta tester, Champion of the Kupo League! Ha!\fRight. RIGHT! Tell me everything. Leave nothin' out!");
    s.stopAnim(C);
    // the talk: no words, only hands
    s.music('caitsith');
    yield* faceOff();
    yield 40;
    yield* beat('player', 'point', '...', 60);      // (it starts well)
    yield* beat(C, 'nod', '♪', 50);
    yield* beat('player', 'nod', null, 44);
    yield* beat(C, 'fistpump', '♪', 56, 44);
    yield* beat('player', 'armscross', null, 50);   // (but...)
    yield* beat('player', 'shake', '...', 56);
    yield* beat(C, null, '!', 36);
    yield* beat('player', 'point', null, 50, 20);
    yield* beat('player', 'wave', null, 50);
    yield* beat(C, 'shake', '?!', 56, 44);
    yield* beat('player', 'lookup', '?', 64);       // (and another thing)
    yield* beat('player', 'point', '!', 50);
    yield* beat(C, 'kneel', '...', 76, 44);         // (crushed)
    yield* beat('player', 'armscross', '...', 56);
    yield* beat(C, 'weak', null, 56, 44);
    yield* beat('player', 'nod', '♪', 56);          // (...but it was good)
    yield hop(C, 0.7, 16);
    yield* beat(C, 'fistpump', '♪', 56, 30);
    // every word of it, taken to heart (more or less)
    s.anim(C, 'lookdown');
    yield s.say('caitsith', 'Right. RIGHT. Let me just get all that down...');
    s.stopAnim(C);
    yield s.say('caitsith', 'One. "Too many wild moogles in the tall grass."\f...That\'s called CONTENT. But fine. Fewer moogles. In the grass. Noted.');
    yield s.say('caitsith', 'Two. "Prof. Sith goes on a bit."\f...Prof. Sith is a dashing, brilliant and frankly very handsome genius, and he says EXACTLY as much as he needs to.\f......Noted.');
    s.anim(C, 'shake');
    yield s.say('caitsith', 'Three. "No bag items in trainer battles is harsh."\fThat\'s no\' harsh, that\'s STRATEGY! It builds character!\f...I\'ll think about an Easy mode.');
    s.stopAnim(C);
    yield s.say('caitsith', 'Four. "Sephiroth\'s a bit much, for a rival."\fHe\'s MEANT to be a bit much! That\'s what rivals are FOR!');
    s.emote('player', '...', 40);
    yield 40;
    yield s.say('caitsith', "...Ah. Aye. Ye'd know. Movin' on.");
    yield s.say('caitsith', 'Five. "Ye can\'t pet the moogles."');
    s.anim(C, 'kneel');
    yield s.say('caitsith', "......That one hurts. Because it's TRUE. Noted. Underlined. Twice.");
    s.stopAnim(C);
    yield s.say('caitsith', 'Six. "The moogles all look a wee bit like a certain cat, ridin\' a certain moogle."\f...Total coincidence. Moogles are a very popular shape these days.');
    s.emote('player', '...', 40);
    yield 40;
    s.anim(C, 'point');
    yield s.say('caitsith', 'And seven. "It kept me up past my bedtime for a fortnight, and I loved every minute of it."\fDon\'t deny it! I saw ye nod!');
    s.stopAnim(C);
    // and so: the sequel
    yield 10;
    s.sfx('levelup'); s.flash('#fff0a0', 10, 0.5);
    s.anim(C, 'fistpump');
    yield s.say('caitsith', "That settles it. I'm makin' KUPOMON 2!\fA brand-new region! Twice the moogles! New dojos, new badges, a meaner Elite Four...\f...and ye CAN pet them.");
    s.stopAnim(C);
    yield s.say('caitsith', "It'll need a beta tester, mind. Someone honest. Someone brutal. Someone who nods.\f...Ye know where to find me!");
    s.emote('player', '...', 30);
    yield 30;
    yield s.say('caitsith', "Now come on! The planet's no' gonna save itself. Let's go!");
    // and back into the party
    yield s.jump(C, home[0], home[1], 0.6, 16);
    s.remove(C);
    s.music(song || 'none');
  }
  // ------------------------------------------------------------------ the second review: Kupomon finished, all of it
  // (the user, 2026-10-04: the first review comes at the Kupo League, before the post-game; "write the follow-up
  // scene"). Once Cloud has Prof. Sith's Kupodex Diploma in his own game (KP.diplomaIn: never the title's Demo) and the
  // first review is behind him, the next free field moment Cait Sith hops out again: the tournaments, the World
  // Championship, the legends, the S.S. Moogle, every last moogle? The same talk with hands only, a new list of
  // critiques (the post-game's), one called back from the first (the Auto mode for the "harsh" bag rule), and a
  // bigger Kupomon 2. Once: flag cait_kupomon_review2.
  const review2Due = () => {
    const f = FL(), P = party(), K = FF7.kupomon;
    return on() && !FF7.state.kupomon && !!f.cait_kupomon_review && !f.cait_kupomon_review2 && !!(K && K.diplomaIn && K.diplomaIn(FF7.state))
      && !!P && P.isMember('caitsith') && !P.isAway('caitsith') && FF7.state.menuEnabled !== false;
  };
  function* caitReview2(s) {
    const fs = s.field, p = fs.player, at = besidePlayer(fs);
    if (!at || !review2Due()) return;
    s.set('cait_kupomon_review2');
    const C = 'cait_review', song = FF7.audio.currentId || null, home = [p.tx, p.ty];
    const beat = function* (who, anim, mark, t, gap = 34) { if (anim) s.anim(who, anim); if (mark) s.emote(who, mark, t); yield t; if (anim) s.stopAnim(who); yield gap; };
    const hop = (id, h, n) => { const a = s.actor(id); if (!a) return 1; a.jump = { t: 0, n, fx: a.x, fz: a.z, tx: a.x, tz: a.z, h }; s.sfx('jump'); return FF7.waitUntil(() => !a.jump); };
    const faceOff = function* () { yield s.face(C, 'player'); yield s.face('player', C); };
    // out he hops again
    s.spawn(C, 'caitsith', home[0], home[1], p.dir, { name: s.name('caitsith') });
    yield s.jump(C, at[0], at[1], 0.8, 22);
    yield* faceOff();
    s.emote(C, '!');
    yield s.say('caitsith', `Hold on. HOLD ON. ${s.name('cloud')}... is that a Kupodex Diploma? Wi' Prof. Sith's own seal on it?!`);
    s.anim(C, 'point');
    yield s.say('caitsith', 'Ye finished it? ALL of it? The tournaments? The World Championship? The legends? Every last moogle?');
    s.stopAnim(C);
    yield 16;
    yield* beat('player', 'nod', null, 44, 20);
    s.sfx('levelup'); s.emote(C, '!!');
    yield hop(C, 1.0, 20);
    yield s.say('caitsith', "Nine hundred an' eighty moogles... I put them in there, and I didnae think anyone would EVER...\f...Right. Ye know how this works. Tell me everything.");
    // the talk: hands only, as before (a longer one: there's more to tell)
    s.music('caitsith');
    yield* faceOff();
    yield 40;
    yield* beat('player', 'point', '...', 60);      // (the tournaments)
    yield* beat(C, 'fistpump', '♪', 50);
    yield* beat('player', 'shake', '...', 56);      // (the World Championship: brutal)
    yield* beat(C, 'nod', '♪', 50, 44);
    yield* beat('player', 'armscross', null, 50);   // (the legends' eggs: dear)
    yield* beat(C, 'lookup', '?', 50);
    yield* beat('player', 'wave', null, 50);        // (the ship: big)
    yield* beat('player', 'lookup', '...', 56);
    yield* beat(C, null, '!', 36, 44);
    yield* beat('player', 'point', '!', 50);        // (and the moogles: still no petting)
    yield* beat(C, 'kneel', '...', 76, 44);
    yield* beat('player', 'nod', '♪', 56);          // (...and it was better still)
    yield hop(C, 0.7, 16);
    yield* beat(C, 'fistpump', '♪', 56, 30);
    // the list, taken to heart (more or less)
    s.anim(C, 'lookdown');
    yield s.say('caitsith', 'Right. RIGHT. Same as last time. Let me get all that down...');
    s.stopAnim(C);
    yield s.say('caitsith', 'One. "The World Championship lot read a strategy guide."\f...Ye NOTICED! I studied every way there is to build a team for those trainers! Weather, walls, hazards, the lot!\fToo good. Noted. Proudly.');
    yield s.say('caitsith', 'Two. "Breedin\' a legend costs a fortune."\fLegends are no\' CHEAP, laddie! The egg, the fee, the wee item from its own quest...\f...Fine. Beta testers get a discount. In Kupomon 2.');
    s.anim(C, 'shake');
    yield s.say('caitsith', 'Three. "The S.S. Moogle is grand, but ye have to find the captain to sail."\fShe\'s a LUXURY LINER! Ye\'re meant to take yer time! Have a wee lie down in a cabin! Ride the lift!\f...I\'ll put up a sign.');
    s.stopAnim(C);
    yield s.say('caitsith', 'Four. Ye said no bag items in trainer battles was harsh. So I gave ye an Auto mode!');
    yield* beat('player', 'point', '...', 50, 20);
    yield* beat('player', 'nod', null, 44, 20);
    s.emote(C, '?!', 40);
    yield 40;
    yield s.say('caitsith', "......It plays better than ye do?\f...That's no' a complaint. That's a COMPLIMENT. To me.");
    yield s.say('caitsith', 'Five. "The Mog Box filled up."\fI gave ye FIFTY boxes! Fifteen hundred moogles! And ye FILLED them?\f...Who ARE ye?');
    s.emote('player', '...', 40);
    yield 40;
    yield s.say('caitsith', 'Six. "Ye STILL can\'t pet the moogles."');
    s.anim(C, 'kneel');
    yield s.say('caitsith', "...I know. I KNOW. It's in Kupomon 2. In bold. Underlined. Three times now.");
    s.stopAnim(C);
    s.anim(C, 'point');
    yield s.say('caitsith', 'And seven. "It was even better the second time round."\fDon\'t deny it! Ye nodded AGAIN!');
    s.stopAnim(C);
    // and so: a bigger sequel
    yield 10;
    s.sfx('levelup'); s.flash('#fff0a0', 10, 0.5);
    s.anim(C, 'fistpump');
    yield s.say('caitsith', "That settles it. Kupomon 2 is gettin' BIGGER.\fTwice the moogles, so... nineteen hundred an' sixty. Give or take.\fA ship that FLIES. A World Championship on the MOON. Two Elite Fours. At once.");
    s.stopAnim(C);
    yield s.say('caitsith', '...And ye can pet them. All nineteen hundred an\' sixty of them.');
    s.emote('player', '...', 30);
    yield 30;
    yield s.say('caitsith', "Now come on! Ye've a planet to save, and I've a sequel to write. Let's go!");
    yield s.jump(C, home[0], home[1], 0.6, 16);
    s.remove(C);
    s.music(song || 'none');
  }
  // the trigger: a free field (the player's to move, nothing running), checked a few times a second
  if (FF7.field && FF7.field.FieldScene) {
    const update0 = FF7.field.FieldScene.prototype.update;
    FF7.field.FieldScene.prototype.update = function (canInput) {
      if (canInput && this.t % 15 === 0 && !this.busy && !this.transitioning && FF7.fieldScene === this && FF7.sceneMgr.top() === this && besidePlayer(this)) {
        if (reviewDue()) this.runScript(caitReview, { name: 'cait_review' });
        else if (review2Due()) this.runScript(caitReview2, { name: 'cait_review2' });   // (the post-game's, after the Diploma)
      }
      return update0.apply(this, arguments);
    };
  }

  FF7.defineMap('gs_cait_hideout', {
    name: "Cait's Workshop", area: 'Gold Saucer', theme: 'bar', music: 'caitsith',
    look: { floor: ['#4e3c2a', '#48372a'], wall: '#3e2c52', wallTop: '#140c1c', trim: '#b88a30', wood: ['#6a4a2a', '#5e4226'],
      wallTex: 'boards', ambient: [0.38, 0.34, 0.42], light: [0.7, 0.62, 0.66] },
    legend: { q: 'block', k: 'block', b: 'block' },
    lights: [[6.5, 5, '#ffd8a0', 3.2], [11, 2, '#c890ff', 2.5], [12, 3, '#80ffb0', 2], [2, 3, '#ffe0a0', 2.4]],
    grid: [
      "##############",
      "#qqq.qqqq.kkk#",
      "#....qqqq....#",
      "#D..........Z#",
      "#D....qq....M#",
      "#D....qq.....#",
      "#D...........#",
      "#..........BB#",
      "#b..........B#",
      "######+#######",
    ],
    props: [
      { at: [0, 4], prop: 'pegboard', rot: 90 },
      { at: [1, 7.3], prop: 'whiteboard', wall: true, rot: 90, w: 1.6, col: '#dce4f0', lift: 0.3 },   // (the blueprints: on the west wall past the bench's end)
      { at: [11, 0], prop: 'neon', text: "CAIT'S", col: '#c890ff', y: 1.95, size: 0.16 },
      { at: [10, 1], prop: 'toyshelf' }, { at: [11, 1], prop: 'toyshelf' }, { at: [12, 1], prop: 'toyshelf' },
      { at: [6.5, 1.5], prop: 'moogbay' },
      { at: [6.5, 4.5], prop: 'table', style: 'planks', scale: [2.1, 1, 2.1] },
      { at: [6.5, 4.5], prop: 'citymodel', r: 0.72, h: 0.16, y0: 0.35 },
      { at: [12, 4], prop: 'arcade', game: 'fortune', broken: true, rot: -90 },
      { at: [1, 8], prop: 'cushion', col: '#7a4aa0' },
    ],
    objects: [
      { id: 'spare1', at: [1, 1], model: 'caitsith', dir: 'down', talk: SPARES },
      { id: 'spare2', at: [2, 1], model: 'caitsith', dir: 'down', talk: SPARES },
      { id: 'spare3', at: [3, 1], model: 'caitsith', dir: 'down', talk: SPARES },
      // MOG Mk.II (the robot it is in battle): gone from its bay after the ambush (a card in its place), back with a
      // plaster once it's all over; the Arcade Library once the MogBoy is out
      { id: 'mogmk2', at: [6.5, 1.3], model: { enemy: 'mog_mk2', scale: 2.1 }, dir: 'down', talk: BAY,
        get hidden() { const f = FL(); return !!(f.cait_mog_beaten && !f.cait_quest_done); } },
      { id: 'bay_card', at: [6.5, 1.8], prop: 'sign', text: 'OUT FOR A WALK', get hidden() { const f = FL(); return !(f.cait_mog_beaten && !f.cait_quest_done); } },
      ...[5, 6, 7, 8].map(x => ({ at: [x, 2], talk: BAY })),   // (the bay's front edge)
      ...[10, 11, 12].map(x => ({ at: [x, 1], talk: function* (s) { yield* TOYS(s); const k = FF7.kupomon && FF7.kupomon.shelfLine && FF7.kupomon.shelfLine(); if (k) yield s.msg(k); } })),
      ...(FF7.kupomon && FF7.kupomon.shelfObjects ? FF7.kupomon.shelfObjects() : []),   // (Kupomon's trophies and badges, once won: js/kupomon/kp_world.js)
      { at: [12, 3], talk: RADIO },
      ...[[6, 4], [7, 4], [6, 5], [7, 5]].map(a => ({ at: a, talk: MIDGAR })),
      ...[3, 4, 5, 6].map(y => ({ at: [1, y], talk: BENCH })),
      ...[[1, 7], [0, 7]].map(a => ({ at: a, talk: PLANS })),   // (from in front of the board, or right under it)
      ...[[11, 7], [12, 7], [12, 8]].map(a => ({ at: a, talk: CRATES })),
      { at: [1, 8], talk: CATBED },
      { at: [12, 4], talk: CABINET },
    ],
    npcs: [
      { id: 'caitsith', name: 'Cait Sith', model: 'caitsith', at: [2, 5], dir: 'left', talk: caitTalk, show: s => !s.flag('cait_quest_done') },
      // (part two: at the bay, mending MOG Mk.II, while the party plays Wonder Square's games)
      { id: 'cait_bay', name: 'Cait Sith', model: 'caitsith', at: [6, 3], dir: 'up', talk: arcadeTalk, show: () => arcadeOn() },
    ],
    entries: { from_wonder: [6, 8, 'up'] },
    exits: [{ at: [6, 9, 1, 1], to: 'gs_wonder', entry: 'from_hideout', sfx: 'door' }],
    onEnter: function* (s) {
      if (s.flag('cait_hideout_welcome')) {
        if (beaten() && !s.flag('cait_quest_done')) yield* questReturn(s);
        // part two: the next visit after the booth's mended, and back with every game played
        else if (on() && s.flag('cait_booth_fixed') && !s.flag('cait_arcade_started')) yield* arcadeStart(s);
        else if (arcadeOn() && !wsLeft().length) yield* mogboyReveal(s);
        return;
      }
      // no peeking: he shoos you out twice, then gives up
      const n = (s.get('cait_peek') || 0) + 1;
      s.setVar('cait_peek', n);
      s.anim('caitsith', 'kneel');
      yield 36;
      s.sfx('hit');
      yield 14;
      s.stopAnim('caitsith');
      s.emote('caitsith', '!');
      yield s.face('caitsith', 'player');
      if (n === 1) {
        yield s.say('caitsith', "OI! What did I JUST say?! No peekin'!");
        yield s.say('caitsith', "Out! Out ye go! Shoo!");
        yield* shoo(s);
      } else if (n === 2) {
        yield s.say('caitsith', "Ye're back. Of course ye're back.\fWhich part of \"no peekin'\" was the tricky bit? The NO? Or the PEEKIN'?");
        s.anim('caitsith', 'shake');
        yield s.say('caitsith', "Out! And this time, STAY out!");
        s.stopAnim('caitsith');
        yield* shoo(s);
      } else {
        s.anim('caitsith', 'lookdown');
        yield s.say('caitsith', '......');
        yield s.say('caitsith', "...Och, FINE. Come in, then. I give up.\fBut don't touch anything! And if ye DO touch anything, put it back EXACTLY where ye found it!");
        s.stopAnim('caitsith');
        yield s.say('caitsith', "Welcome to Cait's Workshop, I suppose. Have a good look round while I find my spanner.");
        s.set('cait_hideout_welcome');
        yield s.face('caitsith', 'left');
      }
    },
  });
})();
