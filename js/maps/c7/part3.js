// Chapter 7 (part 3) — Wutai, reached with the Tiny Bronco. If Yuffie is in the group, she steals all
// the party's materia on the way into town (Attack Squad ambush), and the chase begins: the town, the
// Turtle's Paradise and the vacationing Turks, Godo's house (secret passages: Magic Shuriken, Hairpin),
// the MP Absorb chest in Yuffie's house, the folding screen, the wiggling pot, the lever trap, Don
// Corneo kidnapping Yuffie and Elena, the bell and the hidden door (Attack Squad; Swift Bolt, Elixir),
// and the Turks' truce at the Turtle's Paradise. The finale at Da-chao and the Pagoda are in part 4.
// Also: the cat house (HP Absorb once the quest is over), the shops, the Turtle's Paradise flyer
// contest (flyer No. 6 and the contest sign are here; the prize needs all six flyers).
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
//
// Flags: c7_wq_stolen (quest running), c7_wq_town, c7_wq_pubturks, c7_wq_godo, c7_wq_mpabsorb,
// c7_wq_screen, c7_wq_pot, c7_wq_trap, c7_wq_kidnap, c7_wq_bell, c7_wq_shrine, c7_wq_turks,
// c7_wq_rapps, c7_wutai_done, c7_turtle_flyer6, c7_turtle_sign, c7_turtle_prize, c7_wutai_arrived.
// Vars: c7_materia_backup (JSON copy of all materia while Yuffie has it), c7_godo_talks, turtle_flyers.
// Story hooks (used by part 4): FF7.story.c7_takeAllMateria / c7_returnAllMateria (plain functions).
(function () {
  const TEAM = ['barret', 'tifa', 'aeris', 'redxiii', 'caitsith', 'yuffie', 'vincent', 'cid'];
  const mates = (s) => TEAM.filter(id => s.inParty(id));
  const counter = (at, run) => ({ at, on: 'talk', run });
  function* chime(s, lines) {
    for (const [id, text] of lines) if (id === 'cloud' || s.inParty(id)) { yield s.say(id, text); return id; }
    return null;
  }
  function popOut(s, spots, skip) {
    const ids = mates(s).filter(id => id !== skip).slice(0, spots.length);
    ids.forEach((id, i) => s.spawn(id, id, spots[i][0], spots[i][1], spots[i][2] || 'down', { name: s.name(id) }));
    return ids;
  }
  const tuckIn = (s, ids) => ids.forEach(id => s.remove(id));
  const questOn = (s) => s.flag('c7_wq_stolen') && !s.flag('c7_wutai_done');
  const canStart = (s) => s.flag('yuffie_joined') && s.isMember('yuffie') && !s.flag('c7_wq_stolen') && !s.flag('c7_wutai_done') && !s.flag('disc3');
  const yuf = (s) => s.name('yuffie') || 'Yuffie';
  const THUG = { enemy: 'attack_squad' };

  // ------------------------------------------------------------------ materia backup (JSON-safe)
  const clone = (o) => JSON.parse(JSON.stringify(o == null ? null : o));
  FF7.story.c7_takeAllMateria = function (s) {
    const st = FF7.state;
    if (s.get('c7_materia_backup')) return;
    const b = { stock: clone(st.materia || []), chars: {} };
    Object.keys(st.chars || {}).forEach(id => {
      if (id === 'sephiroth' || id === 'young_cloud') return;
      const c = st.chars[id];
      b.chars[id] = { w: clone(c.weaponMateria || []), a: clone(c.armorMateria || []) };
      c.weaponMateria = (c.weaponMateria || []).map(() => null);
      c.armorMateria = (c.armorMateria || []).map(() => null);
      if (FF7.sys && FF7.sys.stats) FF7.sys.stats.recalc(c);
    });
    st.materia = [];
    s.setVar('c7_materia_backup', b);
  };
  FF7.story.c7_returnAllMateria = function (s) {
    const st = FF7.state, b = s.get('c7_materia_backup');
    if (!b || typeof b !== 'object') return false;
    const extra = [];
    Object.keys(b.chars || {}).forEach(id => {
      const c = st.chars[id], saved = b.chars[id] || {};
      if (!c) { (saved.w || []).concat(saved.a || []).forEach(m => { if (m) extra.push(m); }); return; }
      const put = (key, list) => {
        const arr = c[key] || [];
        (list || []).forEach((m, i) => { if (!m) return; if (i < arr.length && !arr[i]) arr[i] = m; else extra.push(m); });
        c[key] = arr;
      };
      put('weaponMateria', saved.w);
      put('armorMateria', saved.a);
      if (FF7.sys && FF7.sys.stats) FF7.sys.stats.recalc(c);
    });
    st.materia = (b.stock || []).concat(extra, st.materia || []);
    s.setVar('c7_materia_backup', 0);
    return true;
  };

  // ------------------------------------------------------------------ world links (Wutai: Tiny Bronco only)
  FF7.world.link('wutai', { map: 'wutai_outskirts', entry: 'from_world', if: s => s.flag('has_bronco') });
  FF7.world.link('wutai', { run: function* (s) { yield s.msg('Wutai lies across the western sea.\nThere is no way to get there without a boat or a plane.'); } });
  FF7.world.link('da_chao', { map: 'wutai_dachao_base', entry: 'from_wutai', if: s => s.flag('has_bronco') });
  FF7.world.link('da_chao', { run: function* (s) { yield s.msg('The great stone faces of Da-chao gaze out over the sea.\nThey can only be reached from across the water.'); } });

  // ================================================================== OUTSKIRTS (the bridges)
  FF7.defineMap('wutai_outskirts', {
    name: 'Wutai Area', area: 'Wutai', theme: 'wutai', music: s => questOn(s) ? 'stolen' : 'wutai',
    look: { floor: ['#5a7a38', '#547232'], grass: ['#5a7a38', '#547232'] },
    grid: [
      "TTTTTTTTTTTTTTT::::TTTTTTTTTTTTTTTTT",
      "T,,,,,,,,,,,,,,::::,,,,,,,,,,,,,,,,T",
      "T,,T,,,,R,,,,,,::::,,,,,,,,,T,,,,,,T",
      "T,,,,,,,,,,,,,,::::,,,,,,,,,,,,,,,,T",
      "~~~~~~~~~~~~~~~KKKK~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~KKKK~~~~~~~~~~~~~~~~~",
      "T,,,,,,,,,,,,,,::::,,,,,,,,,,,,,,,,T",
      "T,,R,,,,,,,,,,,::::,,,,,,,,,R,,,,,,T",
      "T,,,,,,,,,,,,,,::::,,,,,,,,,,,,,,,,T",
      "T,,,,,,T,,,,,,,::::,,,,,,,,,,,,,,,,T",
      "T,,,,,,,,,,,,,,::::,,,,,,,,,,,T,,,,T",
      "~~~~~~~~~~~~~~~KKKK~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~KKKK~~~~~~~~~~~~~~~~~",
      "T,,,,,,,,,,,,,,::::,,,,,,,,,,,,,,,,T",
      "T,,,,R,,,,,,,,,::::,,,,,,,,,,,,,R,,T",
      "TTTTTTTTTTTTTTT::::TTTTTTTTTTTTTTTTT",
      "               ::::                 ",
    ],
    entries: { from_world: [16, 14, 'up'], from_town: [16, 1, 'down'] },
    exits: [
      { at: [15, 16, 4, 1], to: 'world', loc: 'wutai', if: s => !questOn(s),
        blocked: function* (s) { yield s.say('cloud', "(We're not leaving without our materia. Yuffie ran into Wutai.)"); } },
      { at: [15, 0, 4, 1], to: 'wutai_town', entry: 'from_outskirts' },
    ],
    objects: [{ at: [8, 2], talk: function* (s) { yield s.msg('A moss-covered stone lantern. "WUTAI — straight ahead."'); } }],
    triggers: [
      { id: 'yuffie_heist', at: [15, 7, 4, 3], once: true, if: canStart, run: function* (s) { yield* FF7.story.c7_yuffieHeist(s); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c7_wutai_arrived')) return;
      s.set('c7_wutai_arrived');
      yield s.wait(20);
      yield chime(s, [['cid', "Wutai, huh? Used to be a real military power, before the war with Shinra."],
        ['barret', "So this is Wutai. Heard they fought Shinra for years."],
        ['redxiii', "Wutai. They fought Shinra long and hard, and lost. I wonder what remains."]]);
    },
  });

  FF7.story.c7_yuffieHeist = function* (s) {
    const ids = popOut(s, [[15, 12, 'up'], [18, 12, 'up']], 'yuffie');
    s.spawn('yuffie_h', 'yuffie', 17, 12, 'up', { name: yuf(s) });
    yield [s.move('yuffie_h', 17, 9), s.move('player', 16, 9)].concat(ids.map((id, i) => s.move(id, 15 + i * 3, 10)));
    yield s.face('yuffie_h', 'player');
    yield s.say('yuffie', "Uh... heeey, so. Wutai, huh? Wutai's super boring, y'know.\fNothing there but grumpy old men and souvenir stands. Let's go somewhere else! Anywhere else!");
    yield s.say('cloud', "......");
    yield s.say('yuffie', "Ooh! Ow, ow... my stomach! It's, uh, really acting up. I'm gonna run ahead and... find a bathroom! Yeah! Be right back!");
    s.sfx('run');
    yield s.msg(`${yuf(s)} squeezes past everyone in turn, patting shoulders and pockets as she goes...`);
    yield s.run('yuffie_h', [[17, 3], [17, 0]]);
    s.remove('yuffie_h');
    FF7.story.c7_takeAllMateria(s);
    s.leave('yuffie');
    yield s.wait(30);
    s.spawn('squad1', THUG, 15, 4, 'down', { name: 'Attack Squad' });
    s.spawn('squad2', THUG, 18, 4, 'down', { name: 'Attack Squad' });
    yield [s.run('squad1', 15, 7), s.run('squad2', 18, 7)];
    yield s.say('Attack Squad', "Well, well! Tourists! Wutai's got a toll on this bridge, pal. Hand over everything you've got!");
    yield s.say('cloud', "(Hmph. Let's make this quick.)");
    yield s.battle({ table: 'event_attack_squad', bg: 'wutai', music: 'battle', noEscape: true });
    s.remove('squad1'); s.remove('squad2');
    s.music('stolen');
    yield s.say('cloud', "......Something's wrong. My materia... It's gone!");
    yield chime(s, [['barret', "Mine too! Every last one! What the hell!?"], ['tifa', "Mine are gone too! All of them!"], ['redxiii', "My materia... It is gone. All of it."]]);
    yield chime(s, [['aeris', "And... where's Yuffie?"], ['caitsith', "Hang on... where'd that little ninja get to?"], ['cid', "...Where's the brat?"]]);
    yield s.say('cloud', "......Yuffie.");
    yield chime(s, [['barret', "That little thief! She was playin' us the whole damn time!"], ['cid', "Why that little...! She cleaned us out!"], ['tifa', "She took them all... Every single one."]]);
    yield s.say('cloud', "She ran toward Wutai. After her!");
    tuckIn(s, ids);
    s.set('c7_wq_stolen');
  };

  // ================================================================== WUTAI (first area)
  FF7.defineMap('wutai_town', {
    name: 'Wutai', area: 'Wutai', theme: 'wutai', music: s => questOn(s) ? 'stolen' : 'wutai',
    // refs 09-rockettown25, 29: grey stone streets, water channels with wooden bridges, red lacquered
    // houses under dark tiled roofs; seen diagonally from above
    look: { grass: ['#5a7a38', '#547232'], floor: ['#72706a', '#6c6a64'], floor2: ['#8e8a80', '#88847a'], floor3: ['#a8342a', '#a02e26'], wallTop: '#3a3e4a', roof: '#3a3e4a', water: '#2a6aa8', trim: '#8a2a20', window: '#e8dcc0' },
    camera: { yaw: 30, pitch: 56, dist: 12 },
    lights: [[35, 7, '#ffc070', 3]],
    legend: { '/': 'doorway' },   // the shops and the pub stand open; the homes keep their doors (+)
    // red-lacquered and dark wooden houses under deep, dark tiled gables with paper (shoji) windows in red
    // frames; the cat house turns its gable end to the street, the Turtle's Paradise stands tallest
    buildings: [
      { at: [6, 2, 9, 3], h: 2.2, col: '#6a4630', roof: '#3a3e4a', top: 'gable', ridge: 'x', rise: 0.9, over: 0.25, win: false },
      { at: [16, 2, 7, 3], h: 2.0, col: '#b03a2c', roof: '#3a3e4a', top: 'gable', ridge: 'z', rise: 1.0, over: 0.25, win: false },
      { at: [4, 14, 8, 3], h: 2.0, col: '#8a3426', roof: '#3a3e4a', top: 'gable', ridge: 'x', rise: 0.85, over: 0.25, win: false },
      { at: [24, 14, 10, 3], h: 2.6, col: '#b0382a', roof: '#363a46', top: 'gable', ridge: 'x', rise: 1.0, over: 0.3, win: false },
      { at: [5, 21, 8, 3], h: 2.0, col: '#c8b89a', roof: '#3a3e4a', top: 'gable', ridge: 'x', rise: 0.85, over: 0.25, win: false },
    ],
    labels: [{ at: [28, 16], face: 's', text: "TURTLE'S PARADISE", size: 0.15, col: '#f0d060', back: '#3a1a10', y: 1.8 }],
    grid: [
      "TT::::%TTTTTR%%TTTTTR%%TTTTTR%::::TTR%%T",
      "TR::::........................::::..T.TT",
      "%T.:..hhhhhhhhh.hhhhhhh........::.....R%",
      "TT.:..whhhhhhhw.whhhhhw........::..T..TT",
      "R%.:..hhwhhhwhh.hwhhhwh........::.....TT",
      "TT.:......+........+...........::.....%%",
      "TT.::::::::::::::::::::::::::::::.....TT",
      "%%..........S......::..............l..TR",
      "TT..T..............::.................%T",
      "TR.................::.................TT",
      "%T.................::.................R%",
      "~~~~~~~~KK~~~~~~~~~KK~~~~~~~KK~~~~~~~~~~",
      "~~~~~~~~KK~~~~~~~~~KK~~~~~~~KK~~~~~~~~~~",
      "TT......::.........::.......::........%%",
      "TT..hhhhhhhh.......::...hhhhhhhhhh....TT",
      "%%..whhhhhhw.......::...whhhhhhhhw....TR",
      "TT..hwhhhhwh.......::...hwwhhhwwhh....%T",
      "TR....../..........::......./.....j...TT",
      "%T......:..........::.....!.:.........R%",
      "TT..::::::::::::::::::::::::::........TT",
      "R%.................::.................TT",
      "TT...hhhhhhhh......::..........T......%%",
      "TT...whhhhhhw......::.................TT",
      "%%...hwhhhhwh......::.................TR",
      "TT......./.........::.................%T",
      "TR.......::::::::::::.................TT",
      "%TTTTTR%%%%%%TR%%TT::TR%%TTTTTR%%TTTTTR%",
      "                   ::                   ",
    ],
    entries: {
      from_outskirts: [19, 25, 'up'], from_town2: [3, 2, 'down'], from_dachao: [31, 2, 'down'],
      from_yuffie: [10, 6, 'down'], from_cat: [19, 6, 'down'], from_weapons: [8, 18, 'down'],
      from_turtle: [28, 18, 'down'], from_items: [9, 25, 'down'],
    },
    exits: [
      { at: [19, 27, 2, 1], to: 'wutai_outskirts', entry: 'from_town' },
      { at: [2, 0, 4, 1], to: 'wutai_town2', entry: 'from_town' },
      { at: [30, 0, 4, 1], to: 'wutai_dachao_base', entry: 'from_wutai' },
      { at: [10, 5, 1, 1], to: 'wutai_yuffie_house', entry: 'from_town', sfx: 'door' },
      { at: [19, 5, 1, 1], to: 'wutai_cat_house', entry: 'from_town', sfx: 'door' },
      { at: [8, 17, 1, 1], to: 'wutai_weapons', entry: 'from_town', sfx: 'door' },
      { at: [28, 17, 1, 1], to: 'wutai_turtle', entry: 'from_town', sfx: 'door' },
      { at: [9, 24, 1, 1], to: 'wutai_items', entry: 'from_town', sfx: 'door' },
    ],
    npcs: [
      { id: 'wt_man', name: 'Man', model: 'man10', at: [15, 8], dir: 'down',
        talk: function* (s) {
          if (questOn(s) && !s.flag('c7_wq_kidnap')) { yield s.say('Man', "A ninja girl? Nope. Haven't seen one. Not today. Not ever.\f...Why are you looking at me like that?"); return; }
          yield s.say('Man', "Welcome to Wutai! If you're thirsty, the Turtle's Paradise across the river pours the best drinks in town.");
        } },
      { id: 'wt_woman', name: 'Woman', model: 'woman9', at: [24, 20], dir: 'left',
        talk: function* (s) { yield s.say('Woman', "Wutai was a proud nation once. We fought Shinra for years.\fNow? Now we sell paper lanterns and little wooden swords to tourists. Lord Godo says it's better than burying our sons."); } },
      { id: 'wt_old', name: 'Old Man', model: 'oldman3', at: [6, 20], dir: 'right',
        talk: function* (s) { yield s.say('Old Man', "The great statues of Da-chao are north of town, carved into the mountain long ago.\fPeople climb up to pray. Mind the wind at the top. It's taken more than one careless tourist."); } },
      { id: 'wt_kid', name: 'Boy', model: 'kid5', at: [23, 9], dir: 'down', wander: 2,
        talk: function* (s) { yield s.say('Boy', "Have you seen the Pagoda? Lord Godo trains at the very top! You have to beat the Five Mighty Gods to get up there!"); } },
      { id: 'wt_ninja', name: 'Ninja', model: 'ninja', at: [35, 13], dir: 'left',
        talk: function* (s) { yield s.say('Ninja', "......A ninja does not chat with tourists.\f......Okay, fine. The pub has a flyer contest going. That's all I'll say."); } },
      { id: 'wt_tourist', name: 'Tourist', model: 'man11', at: [14, 24], dir: 'up',
        talk: function* (s) { yield s.say('Tourist', "I came all the way from Junon for the souvenirs! Look — a genuine Wutai throwing star. Made in Midgar, it says on the back..."); } },
    ],
    objects: [
      { at: [34, 17], talk: function* (s) { yield* FF7.story.c7_pot(s); } },
      { at: [26, 18], talk: function* (s) {
        s.set('c7_turtle_sign');
        yield s.msg('"TURTLE\'S PARADISE — FLYER CONTEST!"\n"Six of our flyers are hidden around the world.\nRead them all, then come see us for a very special prize!"');
      } },
    ],
    onEnter: function* (s) {
      if (questOn(s) && !s.flag('c7_wq_town') && s.entry() === 'from_outskirts') { yield* FF7.story.c7_yuffieSpotted(s); return; }
      if (questOn(s) && s.flag('c7_wq_trap') && !s.flag('c7_wq_kidnap') && s.entry() === 'from_yuffie') yield* FF7.story.c7_kidnap(s);
    },
  });

  FF7.story.c7_yuffieSpotted = function* (s) {
    s.set('c7_wq_town');
    s.spawn('yuffie_c', 'yuffie', 19, 16, 'down', { name: yuf(s) });
    yield s.move('player', 19, 21);
    yield s.emote('yuffie_c', '!');
    yield s.say('yuffie', "Eep! Already!?");
    yield s.say('cloud', "Yuffie! Give back our materia!");
    yield s.say('yuffie', "Nyah! Come and get it, slowpokes!");
    yield s.run('yuffie_c', [[19, 13], [19, 7], [3, 6], [3, 1]]);
    s.remove('yuffie_c');
    yield chime(s, [['barret', "Get back here, you little brat!"], ['cid', "Why, that snot-nosed little...!"], ['tifa', "She went toward the back of town!"]]);
  };

  // the wiggling pot outside the Turtle's Paradise
  FF7.story.c7_pot = function* (s) {
    if (questOn(s) && s.flag('c7_wq_screen') && !s.flag('c7_wq_pot')) {
      yield s.msg('The big pot is... wobbling. Back and forth. All by itself.');
      yield s.say('cloud', "......");
      s.sfx('hit');
      s.shake(2, 10);
      s.spawn('yuffie_p', 'yuffie', 34, 18, 'up', { name: yuf(s) });
      yield s.say('yuffie', "Oww! Hey, quit knocking! ...Okay, okay! You got me! Jeez!");
      yield s.face('yuffie_p', 'player');
      yield s.say('yuffie', "Fine, I'll give it back! All of it! It's hidden at my house. C'mon, follow me!");
      yield chime(s, [['barret', "You'd better not be pullin' another fast one!"], ['tifa', "No more tricks, Yuffie."]]);
      yield s.say('yuffie', "Who, me? Hee hee...");
      yield s.run('yuffie_p', [[34, 19], [20, 19], [20, 7], [10, 7], [10, 6]]);
      s.remove('yuffie_p');
      s.set('c7_wq_pot');
      return;
    }
    yield s.msg("A big clay pot outside the pub. It smells faintly of rice wine.");
  };

  // Corneo's men carry off Yuffie and Elena (after the lever trap)
  FF7.story.c7_kidnap = function* (s) {
    s.set('c7_wq_kidnap');
    s.music('corneo');
    s.spawn('corneo', 'corneo', 24, 9, 'left', { name: 'Don Corneo' });
    s.spawn('thug1', THUG, 25, 8, 'left', { name: 'Corneo\'s Man' });
    s.spawn('thug2', THUG, 25, 10, 'left', { name: 'Corneo\'s Man' });
    s.spawn('yuffie_k', 'yuffie', 26, 8, 'left', { name: yuf(s) });
    s.spawn('elena_k', 'elena', 26, 10, 'left', { name: 'Elena' });
    yield s.cam(20, 8, 30);
    yield s.say('Don Corneo', "Hoo-hoo-hooo! What a lucky day! A spunky little ninja AND a pretty lady Turk!\fWhich one will be my bride tonight? Maybe... both! Hoo-hoo!");
    yield s.say('yuffie', "Let GO of me, you creep! Heeelp!");
    yield s.say('Elena', "Unhand me! Do you have any idea who I work for!?");
    yield [s.run('corneo', [[20, 9], [3, 6], [3, 1]]), s.run('thug1', [[21, 8], [4, 6], [3, 1]]), s.run('thug2', [[21, 10], [4, 7], [3, 1]]),
      s.run('yuffie_k', [[22, 8], [5, 6], [3, 1]]), s.run('elena_k', [[22, 10], [5, 7], [3, 1]])];
    ['corneo', 'thug1', 'thug2', 'yuffie_k', 'elena_k'].forEach(id => s.remove(id));
    s.camFollow();
    yield s.say('cloud', "That was... Don Corneo!?");
    yield chime(s, [['tifa', "Corneo! From Wall Market! What's he doing all the way out here!?"],
      ['aeris', "That awful man from Wall Market... and he's got Yuffie!"],
      ['barret', "That sleazeball from Wall Market!? And he's got Yuffie — and she's got our materia!"]]);
    yield s.say('cloud', "They went toward the back of town. Let's go.");
    s.music('stolen');
  };

  // ------------------------------------------------------------------ Wutai (second area: the Pagoda)
  // The Pagoda of the Five Mighty Gods (ref 09-rockettown25): five red tiers of wall tiles stepping in a
  // tile a side around an axis on the map's north edge (x 18), each ring (west, east and south strips)
  // its own height; over every tier a dark tiled roof (a flat square pyramid) flares out past the walls,
  // and a ringed bronze finial crowns the top. The gate (x 17-18) is cut into the bottom tier.
  function pagoda() {
    const H = [1.8, 2.9, 4.0, 5.1, 6.2], ROOF = '#34384a', BRONZE = '#8a7042', buildings = [], props = [];
    H.forEach((h, k) => {
      const x0 = 13 + k, x1 = 22 - k, y1 = 4 - k, w = x1 - x0 + 1;
      const add = (x, y, bw, bh) => buildings.push({ at: [x, y, bw, bh], h, col: '#a8302a', roof: ROOF, win: false });
      if (y1 > 0) { add(x0, 0, 1, y1); add(x1, 0, 1, y1); }
      if (k === 0) { add(x0, y1, 4, 1); add(19, y1, 4, 1); } else add(x0, y1, w, 1);
      // tent = a square pyramid (0.7 tile corner radius, 1.4 tiles tall), turned 45 degrees to face the axes
      const half = w / 2 + 0.7, rise = k === 4 ? 0.8 : half * 0.2;
      props.push({ at: [17.5, -0.5], prop: 'tent', col: ROOF, rot: 45, y0: h + 0.01, scale: [half * Math.SQRT2 / 0.7, rise / 0.7, half * Math.SQRT2 / 0.7] });
    });
    const top = H[4] + 0.8;
    props.push({ at: [17.5, -0.5], prop: 'tent', col: BRONZE, y0: top - 0.15, scale: [0.35, 1.6, 0.35] });
    [0.25, 0.45, 0.65, 0.85, 1.05].forEach(d => props.push({ at: [17.5, -0.5], prop: 'disc', r: 0.36 - d * 0.12, h: 0.04, sides: 8, col: BRONZE, top: BRONZE, y0: top + d }));
    return { buildings, props };
  }
  const PAGODA = pagoda();
  FF7.defineMap('wutai_town2', {
    name: 'Wutai', area: 'Wutai', theme: 'wutai', music: s => questOn(s) ? 'stolen' : 'wutai',
    // the Pagoda of the Five Mighty Gods (ref 09-rockettown25): red tiers under dark roofs stepping up
    // to a spire, the gate at its foot
    look: { grass: ['#5a7a38', '#547232'], floor: ['#72706a', '#6c6a64'], floor2: ['#8e8a80', '#88847a'], floor3: ['#a8342a', '#a02e26'], wallTop: '#3a3e4a', roof: '#3a3e4a', water: '#2a6aa8', trim: '#8a2a20', window: '#e8dcc0' },
    camera: { pitch: 38, dist: 12 },   // ref 09-rockettown25: low, looking up the street at the pagoda
    lights: [[17, 13, '#ffc070', 3], [17, 17, '#ffc070', 3]],
    // the pagoda (see pagoda() above); Lord Godo's big red house and the dark wooden shrine storehouse
    // under deep tiled gables; paper (shoji) windows in red frames
    buildings: PAGODA.buildings.concat([
      { at: [25, 5, 9, 4], h: 2.3, col: '#9a3a2a', roof: '#3a3e4a', top: 'gable', ridge: 'x', rise: 0.95, over: 0.3, win: false },
      { at: [3, 5, 7, 4], h: 2.0, col: '#6a4a34', roof: '#3a3e4a', top: 'gable', ridge: 'x', rise: 0.85, over: 0.25, win: false },
    ]),
    props: PAGODA.props,
    grid: [
      "TTTTR%%TTTTT%hhhhhhhhhh%TTTTR%%TTTTT",
      "TR...........hhhhhhhhhh...........%%",
      "%T..T........hhhhhhhhhh.......T...TT",
      "TT..........JhhhhhhhhhhJ..........TR",
      "R%...........hwhh++hhwh...........%T",
      "TT.hhhhhhh......::::.....hhhhhhhhhTT",
      "TT.hhhhhhh......::::.....hhhhhhhhhR%",
      "%%.whhhhhw......::::.....whhhhhhhhTT",
      "TT.hwhhhwh......::::.....hhwhhhwhhTT",
      "TR....+.....u...::::.........+....%%",
      "%T....:.........::::.........:....TT",
      "TT....::::::::::::::::::::::::::::TR",
      "R%...........................::::.%T",
      "TT..............l............::::.TT",
      "TT....~~~~~~.........T.......::::.R%",
      "%%...~~~~~~~~................::::.TT",
      "TT...~~~~~~~~................::::.TT",
      "TR....~~~~~~.....l.......T...::::.%%",
      "%T...........................::::.TT",
      "TT..T........................::::.TR",
      "R%...........................::::.%T",
      "TT...........................::::.TT",
      "TT...........................::::.R%",
      "%%TTTTTR%%TTTTTR%%TTTTTR%%TTT::::%TT",
    ],
    entries: { from_town: [30, 22, 'up'], from_pagoda: [17, 5, 'down'], from_shrine: [6, 10, 'down'], from_godo: [29, 10, 'down'] },
    exits: [
      { at: [29, 23, 4, 1], to: 'wutai_town', entry: 'from_town2' },
      { at: [29, 9, 1, 1], to: 'wutai_godo_house', entry: 'from_town', sfx: 'door' },
      { at: [6, 9, 1, 1], to: 'wutai_shrine', entry: 'from_town', sfx: 'door2', if: s => s.flag('c7_wq_bell'),
        blocked: function* (s) {
          if (questOn(s) && s.flag('c7_wq_kidnap')) { yield s.msg('The door is barred from the inside. Muffled voices... and a girl yelling.'); return; }
          yield s.msg('A shrine storehouse. The door is shut tight.');
        } },
      { at: [17, 4, 2, 1], run: function* (s) { yield* FF7.story.c7_pagodaGate(s); } },
    ],
    npcs: [
      { id: 'gate_ninja', name: 'Ninja', model: 'ninja2', at: [20, 5], dir: 'down',
        talk: function* (s) { yield s.say('Ninja', "The Pagoda of the Five Mighty Gods. Only one who would inherit Wutai may climb it, and face Lord Godo at the top."); } },
      { id: 'wt2_old', name: 'Old Woman', model: 'oldwoman3', at: [15, 16], dir: 'left',
        talk: function* (s) { yield s.say('Old Woman', "Lord Godo's daughter ran off years ago, saying she'd bring back materia to make Wutai strong again.\fSuch a willful child. Stubborn as her father, that one."); } },
      { id: 'wt2_kid', name: 'Girl', model: 'girl3', at: [22, 19], dir: 'up', wander: 2,
        talk: function* (s) { yield s.say('Girl', "If you ring the big bell, the gods hear your wish! ...That's what Grandma says, anyway."); } },
    ],
    objects: [
      { at: [12, 9], talk: function* (s) { yield* FF7.story.c7_bell(s); } },
      { at: [12, 3], talk: function* (s) { yield s.msg('The five-tiered Pagoda of the Five Mighty Gods towers over the town.'); } },
    ],
  });

  FF7.story.c7_bell = function* (s) {
    const c = yield s.ask(null, 'A great bronze bell hangs in a wooden frame.', ['Ring it', 'Leave it']);
    if (c !== 0) return;
    s.sfx('ching2');
    s.shake(2, 30);
    yield s.msg('GONNNG......');
    if (questOn(s) && s.flag('c7_wq_kidnap') && !s.flag('c7_wq_bell')) {
      s.set('c7_wq_bell');
      s.sfx('door2');
      yield s.msg('As the tone fades, there is a heavy clunk from the storehouse next to the bell. Its door slides open!');
      yield s.say('cloud', "(A hidden latch... Corneo's in there.)");
    }
  };

  // ------------------------------------------------------------------ Turtle's Paradise
  const FLYERS = [['c3_turtle_flyer1'], ['c4_flyer_turtle2', 'c11a_flyer_turtle2', 'c11a_turtle_flyer2'], ['c6a_turtle_flyer3'],
    ['c6b_turtle_flyer4'], ['c6b_turtle_flyer5'], ['c7_turtle_flyer6']];
  const flyerCount = (s) => FLYERS.filter(list => list.some(f => s.flag(f))).length;
  const bartender = function* (s) {
    if (!s.flag('c7_turtle_prize') && s.flag('c7_turtle_sign') && flyerCount(s) >= 6) {
      yield s.say('Bartender', "Wait... you've read ALL six of our flyers? Every single one? And the sign outside?\fWell I'll be! You're the first! Here's your prize, with our thanks!");
      s.set('c7_turtle_prize');
      for (const id of ['power_source', 'guard_source', 'speed_source', 'magic_source', 'mind_source', 'luck_source', 'megalixir']) yield s.give(id);
      return;
    }
    if (s.flag('c7_turtle_sign') && !s.flag('c7_turtle_prize')) {
      yield s.say('Bartender', `Taking part in our flyer contest? You've found ${flyerCount(s)} of the six so far. Keep looking!`);
      return;
    }
    yield s.say('Bartender', "Welcome to the Turtle's Paradise, the finest bar in Wutai! ...Also the only bar in Wutai. Enjoy!");
  };
  const elenaAround = (s) => !s.flag('c7_wq_kidnap');
  FF7.defineMap('wutai_turtle', {
    name: "Turtle's Paradise", area: 'Wutai', theme: 'bar',
    // ref 09-rockettown28: a red-walled pub on dark floorboards, low tables, seen diagonally from above
    look: { floor: ['#5a3a22', '#54341e'], wall: '#9a3028', trim: '#d0a040', wallTop: '#2a1410', ambient: [0.5, 0.4, 0.36], light: [0.9, 0.72, 0.56] },
    camera: { yaw: 35, pitch: 58, dist: 10 },
    music: s => questOn(s) && !s.flag('c7_wq_turks') ? 'turks' : 'wutai',
    grid: [
      "########################",
      "#kkk..q.......oo.......#",
      "#......................#",
      "#..DDDDDDDD............#",
      "#.............ctc...ctc#",
      "#..c.c.c.c.............#",
      "#.............ctc...ctc#",
      "#.....................j#",
      "#u....................u#",
      "###########++###########",
    ],
    entries: { from_town: [11, 8, 'up'] },
    exits: [{ at: [11, 9, 2, 1], to: 'wutai_town', entry: 'from_turtle', sfx: 'door' }],
    npcs: [
      { id: 'bartender', name: 'Bartender', model: 'bartender', at: [6, 2], dir: 'down', talk: bartender },
      { id: 'patron', name: 'Drunk', model: 'man12', at: [20, 6], dir: 'up', anim: 'sit',
        talk: function* (s) { yield s.say('Drunk', "Hic! Turtle's Paradise... hic... is paradise! Wanna know a secret? I've read... five flyers! FIVE! Hic!"); } },
      { id: 'reno', name: 'Reno', model: 'reno', at: [14, 4], dir: 'down', anim: 'sit', show: s => questOn(s) && !s.flag('c7_wq_turks'),
        talk: function* (s) { yield* FF7.story.c7_turksPub(s); } },
      { id: 'rude', name: 'Rude', model: 'rude', at: [16, 4], dir: 'down', anim: 'sit', show: s => questOn(s) && !s.flag('c7_wq_turks'),
        talk: function* (s) { yield* FF7.story.c7_turksPub(s); } },
      { id: 'elena', name: 'Elena', model: 'elena', at: [15, 5], dir: 'down', show: s => questOn(s) && elenaAround(s),
        talk: function* (s) { yield s.say('Elena', "Reno, they're RIGHT THERE! We could—\f...Fine. Vacation. I know. Ugh."); } },
    ],
    triggers: [counter([3, 3, 8, 1], bartender)],
    objects: [{ at: [15, 1], talk: function* (s) { yield s.msg('Barrels of Wutai rice wine, stacked to the ceiling.'); } }],
    onEnter: function* (s) {
      if (!questOn(s) || s.flag('c7_wq_pubturks') || s.flag('c7_wq_kidnap')) return;
      s.set('c7_wq_pubturks');
      yield s.wait(20);
      yield s.emote('elena', '!');
      yield s.say('Elena', "Reno! Rude! It's them — Cloud and his gang!");
      yield s.say('Reno', "......Yeah, yeah. I see 'em.");
      yield s.say('cloud', "The Turks...!");
      yield s.say('Reno', "Relax. We're on vacation. No work today.\fWe didn't come all the way to Wutai to fight. We came to drink. So don't ruin it, yo.");
      yield s.say('Elena', "But Reno, our orders—");
      yield s.say('Rude', "......Sit down, Elena.");
      yield s.say('Elena', "......Hmph.");
    },
  });

  FF7.story.c7_turksPub = function* (s) {
    if (s.flag('c7_wq_shrine') && !s.flag('c7_wq_turks')) {
      s.set('c7_wq_turks');
      yield s.say('Reno', "...Figured you'd show up. That slimeball Corneo grabbed our rookie. Elena.");
      yield s.say('Rude', "......");
      yield s.say('Reno', "Here's the thing. We've got orders to take Corneo out anyway. So for today, you and us aren't enemies.\fYou want your ninja back, we want our partner back and the Don in a body bag. Works for everybody.");
      yield s.say('cloud', "......Where did he go?");
      yield s.say('Reno', "Da-chao. The big stone faces up on the mountain, north of town. He's up top with the girls.\fWe'll be around. Try not to get in our way, yo.");
      yield chime(s, [['barret', "Workin' with the Turks... Man, I need a drink."], ['tifa', "I can't believe we're doing this... but all right."], ['cid', "The Turks, huh? Heh. Whatever gets the job done."]]);
      return;
    }
    if (s.flag('c7_wq_turks')) { yield s.say('Reno', "Da-chao, north of town. Go on. We've got your back... this once."); return; }
    if (s.flag('c7_wq_kidnap')) { yield s.say('Reno', "...Elena went out for some air and didn't come back. If that's your Don's doing, he's a dead man."); return; }
    yield s.say('Reno', "Off duty, remember? Go bother somebody else.");
  };

  // ------------------------------------------------------------------ item shop (the house near the entrance; the folding screen)
  const itemShop = function* (s) {
    if (questOn(s) && s.flag('c7_wq_mpabsorb') && !s.flag('c7_wq_screen')) {
      yield s.say('Shopkeeper', "W-welcome! Nothing unusual here! Nope! Buy something... please?");
      yield s.msg('The shopkeeper keeps glancing nervously at the folding screen on the left.');
    } else yield s.say('Shopkeeper', "Welcome! Everything for the traveler, and a few things for the ninja.");
    yield s.shop('wutai_items');
  };
  FF7.defineMap('wutai_items', {
    name: 'Wutai Item Shop', area: 'Wutai', theme: 'house', music: s => questOn(s) ? 'stolen' : 'wutai',
    look: { floor: ['#b0a468', '#a89c60'], floor2: ['#6a4a2a', '#624426'], wall: '#d0c4a0', trim: '#8a2a20', wallTop: '#3a2418' },   // ref 09-rockettown31
    camera: { yaw: 35, pitch: 58, dist: 10 },
    legend: { Q: 'cabinet' },
    grid: [
      "####################",
      "#q....kk.........b.#",
      "#..................#",
      "#..QQ.......DDDD...#",
      "#..................#",
      "#.....ctc..........#",
      "#j...............o.#",
      "#########++#########",
    ],
    entries: { from_town: [9, 6, 'up'] },
    exits: [{ at: [9, 7, 2, 1], to: 'wutai_town', entry: 'from_items', sfx: 'door' }],
    npcs: [
      { id: 'shopkeeper', name: 'Shopkeeper', model: 'man13', at: [13, 2], dir: 'down', talk: itemShop },
      { id: 'customer', name: 'Woman', model: 'woman10', at: [8, 4], dir: 'left',
        talk: function* (s) {
          if (questOn(s) && s.flag('c7_wq_mpabsorb') && !s.flag('c7_wq_screen')) { yield s.say('Woman', "Ninja? What ninja? There's no ninja behind that screen. ...I mean, there's no screen. I mean... hello!"); return; }
          yield s.say('Woman', "I'm shopping for a present for Lord Godo. What do you get a man who has a whole pagoda?");
        } },
    ],
    triggers: [counter([12, 3, 4, 1], itemShop)],
    objects: [
      { at: [3, 3], talk: function* (s) { yield* FF7.story.c7_screen(s); } },
      { at: [4, 3], talk: function* (s) { yield* FF7.story.c7_screen(s); } },
    ],
  });
  FF7.story.c7_screen = function* (s) {
    if (!(questOn(s) && s.flag('c7_wq_mpabsorb') && !s.flag('c7_wq_screen'))) {
      yield s.msg('A painted folding screen. Cranes flying over mountains.');
      return;
    }
    yield s.msg('A painted folding screen... A pair of sandals is poking out from underneath.');
    s.spawn('yuffie_s', 'yuffie', 3, 2, 'down', { name: yuf(s) });
    yield s.emote('yuffie_s', '!!');
    yield s.say('yuffie', "Waaah! How'd you find me!? ...Later, losers!");
    yield s.run('yuffie_s', [[6, 2], [6, 5], [9, 6], [9, 7]]);
    s.remove('yuffie_s');
    s.set('c7_wq_screen');
    yield chime(s, [['barret', "She went outside! Don't let her get away!"], ['tifa', "Outside! Quick!"]]);
    yield s.say('cloud', "(She can't have gone far. Where would she hide around here...?)");
  };

  // ------------------------------------------------------------------ weapon shop (won't sell during the chase)
  const weaponShop = function* (s) {
    if (questOn(s)) {
      yield s.say('Shopkeeper', "S-sorry! We're, uh, closed today. Inventory. Yes. Very busy inventory.\f(He keeps looking at the door, as if expecting someone to come in and tell him it's all right.)");
      return;
    }
    yield s.say('Shopkeeper', "Welcome! Fine Wutai steel, sharpened by hand. Take a look.");
    yield s.shop('wutai_weapons');
  };
  FF7.defineMap('wutai_weapons', {
    name: 'Wutai Weapon Shop', area: 'Wutai', theme: 'house', music: s => questOn(s) ? 'stolen' : 'wutai',
    look: { floor: ['#b0a468', '#a89c60'], floor2: ['#6a4a2a', '#624426'], wall: '#d0c4a0', trim: '#8a2a20', wallTop: '#3a2418' },   // ref 09-rockettown30
    camera: { yaw: 35, pitch: 58, dist: 10 },
    grid: [
      "####################",
      "#kk.B......q...oo..#",
      "#..................#",
      "#.....DDDDD........#",
      "#..................#",
      "#B..............o..#",
      "#..................#",
      "#########++#########",
    ],
    entries: { from_town: [9, 6, 'up'] },
    exits: [{ at: [9, 7, 2, 1], to: 'wutai_town', entry: 'from_weapons', sfx: 'door' }],
    npcs: [{ id: 'shopkeeper', name: 'Shopkeeper', model: 'man14', at: [8, 2], dir: 'down', talk: weaponShop }],
    triggers: [counter([6, 3, 5, 1], weaponShop)],
    objects: [{ at: [4, 1], talk: function* (s) { yield s.msg('A crate of practice swords. "SOUVENIR — NOT FOR COMBAT"'); } }],
  });

  // ------------------------------------------------------------------ Yuffie's house (MP Absorb, the levers, flyer No. 6)
  FF7.defineMap('wutai_yuffie_house', {
    name: "Yuffie's House", area: 'Wutai', theme: 'house', music: s => questOn(s) ? 'stolen' : 'wutai',
    // ref 09-rockettown23: red-framed rooms, a patterned rug, seen diagonally from above
    look: { floor: ['#b0a468', '#a89c60'], floor2: ['#6a4a2a', '#624426'], wall: '#d0c4a0', trim: '#8a2a20', wallTop: '#3a2418', carpet: ['#6a3a6a', '#643464'] },
    camera: { yaw: 35, pitch: 58, dist: 10 },
    grid: [
      "########################",
      "#..........#...........#",
      "#..Z....Z..#...........#",
      "#..........+...........#",
      "#..........#...........#",
      "#####^^#################",
      "#.....................q#",
      "#..ctc.................#",
      "#.............B........#",
      "#j....................j#",
      "##########++############",
    ],
    heights: [
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "444442244444444444444444",
      "444444444444444444444444",
      "444444444444444444444444",
      "444444444444444444444444",
      "444444444444444444444444",
      "444444444444444444444444",
    ],
    entries: { from_town: [10, 9, 'up'] },
    exits: [{ at: [10, 10, 2, 1], to: 'wutai_town', entry: 'from_yuffie', sfx: 'door' }],
    chests: [{ at: [19, 7], materia: 'mp_absorb', id: 'wutai_yhouse_mpabsorb', if: s => questOn(s) && !s.flag('c7_wq_mpabsorb') }],
    npcs: [
      { id: 'yuffie_lev', name: 'Yuffie', model: 'yuffie', at: [5, 3], dir: 'down', show: s => questOn(s) && s.flag('c7_wq_pot') && !s.flag('c7_wq_trap'),
        talk: function* (s) { yield s.say('yuffie', "The materia's behind this wall! Pull one of those levers and the wall opens. Go on, pull it!"); } },
    ],
    objects: [
      { at: [3, 2], talk: function* (s) { yield* FF7.story.c7_lever(s); } },
      { at: [8, 2], talk: function* (s) { yield* FF7.story.c7_lever(s); } },
      { at: [22, 6], talk: function* (s) { yield s.msg('A cabinet full of shuriken, all neatly polished. And one very old teddy bear.'); } },
    ],
    triggers: [
      { at: [8, 9, 6, 1], if: s => s.flag('got_wutai_yhouse_mpabsorb') && !s.flag('c7_wq_mpabsorb'), run: function* (s) { yield* FF7.story.c7_mpAbsorbTheft(s); } },
      { at: [4, 6, 4, 1], if: s => s.flag('got_wutai_yhouse_mpabsorb') && !s.flag('c7_wq_mpabsorb'), run: function* (s) { yield* FF7.story.c7_mpAbsorbTheft(s); } },
      { at: [15, 0, 5, 1], on: 'talk', run: function* (s) {
        yield s.msg('A flyer is pasted to the wall of the hallway:\n"TURTLE\'S PARADISE — No. 6\nWe\'re in Wutai, where the drinks are strong and the ninjas are stronger!\nFind all six flyers for a special prize!"');
        if (!s.flag('c7_turtle_flyer6')) { s.set('c7_turtle_flyer6'); s.inc('turtle_flyers'); }
      } },
      { id: 'lev_talk', at: [3, 3, 6, 2], once: true, if: s => questOn(s) && s.flag('c7_wq_pot') && !s.flag('c7_wq_trap'),
        run: function* (s) {
          yield s.face('yuffie_lev', 'player');
          yield s.say('yuffie', "Ta-daa! Welcome to my secret room! Your materia's all stashed behind this wall.\fJust pull one of the two levers and the wall opens right up. Promise!");
          yield chime(s, [['barret', "...This better not be a trick."], ['tifa', "...Why do I have a bad feeling about this?"]]);
        } },
    ],
  });

  FF7.story.c7_mpAbsorbTheft = function* (s) {
    s.set('c7_wq_mpabsorb');
    const st = FF7.state;
    const i = (st.materia || []).findIndex(m => m && m.id === 'mp_absorb');
    if (i >= 0) st.materia.splice(i, 1);
    s.spawn('yuffie_m', 'yuffie', 10, 9, 'up', { name: yuf(s) });
    yield s.say('yuffie', "Thaaanks! I'll be taking THAT!");
    s.sfx('run');
    yield s.msg(`${yuf(s)} snatches the MP Absorb materia and bolts out the door!`);
    yield s.run('yuffie_m', 10, 10);
    s.remove('yuffie_m');
    yield chime(s, [['barret', "ARGH! That little...!"], ['cid', "Son of a...! She's quick, I'll give her that."], ['tifa', "Again!? She's fast!"]]);
    yield s.say('cloud', "(She keeps running around town... Somebody must be hiding her.)");
  };

  FF7.story.c7_lever = function* (s) {
    if (!(questOn(s) && s.flag('c7_wq_pot') && !s.flag('c7_wq_trap'))) {
      yield s.msg('An iron lever set into the wall. It won\'t move.');
      return;
    }
    const c = yield s.ask(null, 'Pull the lever?', ['Pull it', 'Leave it']);
    if (c !== 0) return;
    s.sfx('gate');
    yield s.wait(20);
    s.shake(6, 30);
    s.sfx('hit');
    yield s.flash('#ffffff', 8);
    yield s.msg('CLANG! A heavy iron cage drops from the ceiling!');
    yield s.say('yuffie', "Nyah ha ha! Gotcha! You guys are sooo easy!\fThat's what you get for trusting a ninja! Bye-bye!");
    s.set('c7_wq_trap');
    s.hide('yuffie_lev');
    yield s.say('cloud', "......");
    yield chime(s, [['barret', "I KNEW it! Get back here, you little...!"], ['cid', "#$%&! That little #$%&!"], ['redxiii', "...We walked straight into that."]]);
    yield s.wait(60);
    yield s.say('Voice', "Hey! Let go of me! Put me down, you creep! Heeelp!");
    yield s.say('cloud', "That was Yuffie!");
    s.sfx('hit');
    s.shake(4, 20);
    yield s.msg('The old cage bars are rusted through. With a few hard kicks, they bend apart.');
    yield chime(s, [['barret', "Heh. Cheap-ass cage. Let's move!"], ['tifa', "It sounded like it came from outside. Hurry!"]]);
  };

  // ------------------------------------------------------------------ the cat house (HP Absorb upstairs)
  FF7.defineMap('wutai_cat_house', {
    name: 'Wutai', area: 'Wutai', theme: 'house', music: s => questOn(s) ? 'stolen' : 'wutai',
    look: { floor: ['#b0a468', '#a89c60'], floor2: ['#6a4a2a', '#624426'], wall: '#d0c4a0', trim: '#8a2a20', wallTop: '#3a2418' },
    camera: { yaw: 35, pitch: 58, dist: 10 },
    grid: [
      "####################",
      "#b.b.....^^...kk.q.#",
      "#........^^........#",
      "#........##........#",
      "#========##........#",
      "#..................#",
      "#..t..........o....#",
      "#.ctc..............#",
      "#j.................#",
      "#########++#########",
    ],
    heights: [
      "44444444400000000000",
      "44444444422000000000",
      "44444444422000000000",
      "44444444400000000000",
      "44444444400000000000",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
    ],
    entries: { from_town: [9, 8, 'up'] },
    exits: [{ at: [9, 9, 2, 1], to: 'wutai_town', entry: 'from_cat', sfx: 'door' }],
    chests: [{ at: [2, 2], materia: 'hp_absorb', id: 'wutai_cat_hpabsorb' }],
    npcs: [
      { id: 'cat1', name: 'Cat', model: 'cat', at: [11, 1], dir: 'down', show: s => !s.flag('c7_wutai_done'),
        talk: function* (s) { yield s.msg('Mrrrow. The cat is sprawled across the bottom of the stairs and has no intention of moving.'); } },
      { id: 'cat2', name: 'Cat', model: 'cat', at: [11, 2], dir: 'left', show: s => !s.flag('c7_wutai_done'),
        talk: function* (s) { yield s.msg('Prrr... This cat is guarding the stairs very seriously.'); } },
      { id: 'cat3', name: 'Cat', model: 'cat', at: [15, 6], dir: 'left', wander: 2,
        talk: function* (s) { yield s.msg('Meow.'); } },
      { id: 'cat4', name: 'Cat', model: 'cat', at: [5, 6], dir: 'right', show: s => s.flag('c7_wutai_done'),
        talk: function* (s) { yield s.msg('The cat has finally moved off the stairs. It looks very pleased with itself.'); } },
      { id: 'catlady', name: 'Old Woman', model: 'oldwoman4', at: [15, 3], dir: 'down',
        talk: function* (s) {
          if (s.flag('c7_wutai_done')) { yield s.say('Old Woman', "Oh! My kitties are letting people upstairs again. They must like you.\fGo on up. There's something up there my late husband left. Take it, if it's any use to you."); return; }
          yield s.say('Old Woman', "My kitties won't let anyone up the stairs lately. They're upset about something.\fWhen things in town settle down, maybe they'll calm down too.");
        } },
    ],
  });

  // ------------------------------------------------------------------ Godo's house (secret passages)
  function* godoTalk(s) {
    if (s.flag('c7_pagoda_done')) { yield s.say('Godo', "Hm. So you are the ones my daughter travels with. Keep her safe... and keep her from stealing too much."); return; }
    if (!questOn(s)) {
      yield s.say('Godo', "I am Godo, lord of Wutai. Wutai is a quiet place now. Rest here, if you like; the bedroom is open to travelers.");
      if (s.isMember('yuffie')) yield s.say('Godo', "...And you have brought my foolish daughter back with you, I see. If she has the nerve, the Pagoda is waiting for her.");
      return;
    }
    const n = s.inc('c7_godo_talks');
    if (n === 1) { yield s.say('Godo', "Welcome, travelers. I am Godo, lord of Wutai. Wutai is a peaceful place now. Enjoy your stay."); return; }
    if (n === 2) {
      yield s.say('Godo', "Wutai was once a great nation. We fought Shinra for years... and we lost.\fI chose to surrender rather than watch every young man in this village die. Now we sell trinkets to tourists.\fSome call that shameful. I call it survival.");
      return;
    }
    if (s.flag('c7_wq_godo')) { yield s.say('Godo', "Yuffie... Once that girl sets her mind on something, not even I can stop her."); return; }
    s.set('c7_wq_godo');
    yield s.say('Godo', "A girl who steals materia? A little thief with a big mouth and a bigger head?\f......That would be my daughter. Yuffie.");
    yield chime(s, [['barret', "Your DAUGHTER!?"], ['tifa', "Yuffie is... your daughter?"], ['cid', "Well, that explains a hell of a lot."]]);
    yield s.say('Godo', "She ran away from home, swearing she'd gather enough materia to make Wutai strong again.\fShe never forgave me for surrendering to Shinra.");
    s.spawn('yuffie_g', 'yuffie', 17, 11, 'up', { name: yuf(s) });
    yield s.emote('yuffie_g', '!');
    yield s.say('yuffie', "......!");
    yield s.face('player', 'yuffie_g');
    yield s.say('Godo', "Yuffie!");
    yield s.say('yuffie', "Tch! Don't you 'Yuffie' me, old man!");
    yield s.run('yuffie_g', 17, 12);
    s.remove('yuffie_g');
    yield s.say('Godo', "......That girl. Chasing her will only tire you. She knows every hiding place in this town.");
  }
  // a revolving wall panel: `t` = where the player comes out, `inside` = leaving the hidden nook
  function* secretPanel(s, t, inside) {
    yield s.msg(inside ? 'The wall panel turns again...' : 'This wall panel sounds hollow. You push on it...');
    s.sfx('door2');
    yield s.fadeOut(12);
    s.place('player', t[0], t[1], t[2]);
    yield s.fadeIn(12);
    if (!inside) yield s.msg('The panel spun around! A hidden nook lies behind it.');
  }
  FF7.defineMap('wutai_godo_house', {
    name: "Godo's House", area: 'Wutai', theme: 'house', music: 'shinobi',
    // ref 09-rockettown24: tatami rooms behind red frames, bookshelves, a calligraphy scroll
    look: { floor: ['#b0a468', '#a89c60'], floor2: ['#6a4a2a', '#624426'], wall: '#d0c4a0', trim: '#8a2a20', wallTop: '#3a2418' },
    camera: { yaw: 35, pitch: 58, dist: 10 },
    grid: [
      "##################################",
      "#...#b.b....q#............#......#",
      "#...#b.b.....#..u......u..#......#",
      "#####........#............########",
      "#####........+.....tt.....########",
      "#####........#............+......#",
      "#####..t.....#............#......#",
      "##############............#......#",
      "##############............#......#",
      "##############............#......#",
      "##############............########",
      "##############j..........j########",
      "#################++###############",
    ],
    entries: { from_town: [17, 11, 'up'] },
    exits: [{ at: [17, 12, 2, 1], to: 'wutai_town2', entry: 'from_godo', sfx: 'door' }],
    chests: [
      { at: [1, 1], item: 'magic_shuriken', id: 'wutai_godo_shuriken' },
      { at: [32, 1], item: 'hairpin', id: 'wutai_godo_hairpin' },
    ],
    npcs: [
      { id: 'godo', name: 'Godo', model: 'godo', at: [19, 2], dir: 'down', anim: 'sit', talk: godoTalk },
      { id: 'servant', name: 'Ninja', model: 'ninja3', at: [24, 8], dir: 'left',
        talk: function* (s) { yield s.say('Ninja', "This house is full of old ninja tricks. Walls that turn, floors that drop... Lord Godo likes his privacy.\fDon't go poking at the walls. ...Really."); } },
    ],
    objects: [
      { at: [5, 1], talk: function* (s) { yield s.inn(0, { text: 'A soft futon, freshly aired. Lord Godo lets travelers rest here. Take a nap?' }); } },
      { at: [7, 1], talk: function* (s) { yield s.inn(0, { text: 'A soft futon, freshly aired. Lord Godo lets travelers rest here. Take a nap?' }); } },
      { at: [16, 2], talk: function* (s) { yield s.msg('A statue of one of the Five Mighty Gods.'); } },
      { at: [23, 2], talk: function* (s) { yield s.msg('A statue of the water god Leviathan, coiled around a pillar.'); } },
    ],
    triggers: [
      { at: [4, 3, 1, 1], on: 'talk', run: function* (s) { yield* secretPanel(s, [2, 2, 'up'], false); } },
      { at: [4, 1, 1, 2], on: 'talk', run: function* (s) { yield* secretPanel(s, [6, 3, 'right'], true); } },
      { at: [27, 4, 6, 1], on: 'talk', run: function* (s) { yield* secretPanel(s, [30, 2, 'right'], false); } },
      { at: [33, 1, 1, 2], on: 'talk', run: function* (s) { yield* secretPanel(s, [30, 5, 'down'], true); } },
    ],
  });

  // ------------------------------------------------------------------ the storehouse behind the bell: Corneo's hideout
  FF7.defineMap('wutai_shrine', {
    name: 'Wutai Storehouse', area: 'Wutai', theme: 'house', music: s => questOn(s) && !s.flag('c7_wq_shrine') ? 'corneo' : 'wutai',
    look: { wall: '#6a5040', trim: '#3a2418', floor: ['#5a4a38', '#544432'] },
    grid: [
      "##########++##########",
      "#u..................u#",
      "#....................#",
      "#..B.............B...#",
      "#....................#",
      "#....................#",
      "#..o..............o..#",
      "#....................#",
      "#|..................|#",
      "##########++##########",
    ],
    entries: { from_town: [10, 8, 'up'] },
    exits: [
      { at: [10, 9, 2, 1], to: 'wutai_town2', entry: 'from_shrine', sfx: 'door2' },
      { at: [10, 0, 2, 1], run: function* (s) { yield s.msg('A back door, barred from the outside.'); } },
    ],
    chests: [
      { at: [2, 7], item: 'swift_bolt', id: 'wutai_shrine_swiftbolt' },
      { at: [19, 7], item: 'elixir', id: 'wutai_shrine_elixir' },
    ],
    onEnter: function* (s) {
      if (!questOn(s) || s.flag('c7_wq_shrine') || !s.flag('c7_wq_bell')) return;
      yield* FF7.story.c7_shrine(s);
    },
  });

  FF7.story.c7_shrine = function* (s) {
    s.set('c7_wq_shrine');
    s.spawn('corneo', 'corneo', 10, 2, 'down', { name: 'Don Corneo' });
    s.spawn('yuffie_t', 'yuffie', 8, 2, 'down', { name: yuf(s), anim: 'kneel' });
    s.spawn('elena_t', 'elena', 12, 2, 'down', { name: 'Elena', anim: 'kneel' });
    s.spawn('thug1', THUG, 8, 5, 'down', { name: "Corneo's Man" });
    s.spawn('thug2', THUG, 12, 5, 'down', { name: "Corneo's Man" });
    s.spawn('thug3', THUG, 10, 4, 'down', { name: "Corneo's Man" });
    yield s.wait(20);
    yield s.say('Don Corneo', "Hoo-hoo! Well, if it isn't the gang from Wall Market! You just don't give up, do you?");
    yield s.say('cloud', "Corneo. Let them go.");
    yield s.say('yuffie', "Mmmph! Cloud! Get me outta here!");
    yield s.say('Don Corneo', "Sorry, no time to chat! My brides and I have an appointment! Boys — show 'em some Corneo hospitality!");
    yield [s.run('corneo', 10, 0), s.run('yuffie_t', 10, 0), s.run('elena_t', 11, 0)];
    ['corneo', 'yuffie_t', 'elena_t'].forEach(id => s.remove(id));
    s.sfx('door2');
    yield s.move('thug3', 10, 6);
    yield s.battle({ table: 'event_attack_squad_shrine', bg: 'wutai', music: 'battle', noEscape: true });
    ['thug1', 'thug2', 'thug3'].forEach(id => s.remove(id));
    yield s.say('cloud', "(He got away through the back... Where would he take them?)");
    yield chime(s, [['tifa', "The Turks! Corneo took Elena too — maybe they know something."], ['barret', "Those Turks at the bar... Corneo grabbed one of theirs too. Let's shake 'em down."]]);
  };

  // ------------------------------------------------------------------ the Pagoda gate (part 4 has the floors)
  FF7.story.c7_pagodaGate = function* (s) {
    if (!s.flag('yuffie_joined') || !s.isMember('yuffie')) {
      yield s.msg('The great doors of the Pagoda are shut.\nA plaque reads: "Only one who would inherit Wutai may climb to the gods."');
      return;
    }
    if (!s.flag('c7_wutai_done') && !s.flag('disc3')) {
      yield s.msg('The great doors of the Pagoda are shut.');
      return;
    }
    if (!s.inParty('yuffie')) {
      yield s.say('cloud', "(The Pagoda... This is Yuffie's fight. I should bring her along.)");
      return;
    }
    yield s.goto('wutai_pagoda1', 'from_town');
  };
})();
