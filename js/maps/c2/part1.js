// Chapter 2 — Part 1: Sector 7 slums. Station (arrival from Chapter 1), the train yard, the pillar,
// the town, 7th Heaven and the AVALANCHE hideout (Tifa, Marlene, Barret's pay, the promise at the
// water tower, the night, the Materia lesson and Tifa joining), the weapon shop building (Beginner's
// Hall, the kid's "inn"), the item/materia shop and Johnny's house.
// Dialogue is paraphrased (see docs/SCRIPTING.md).
(function () {
  const night = s => !s.flag('c2_morning');

  // ================================================================== story scripts
  // Barret's debriefing on the platform (talk to him, or try to leave the station).
  FF7.story.c2_debrief = function* (s) {
    if (s.flag('c2_debrief')) return;
    yield s.face('barret', 'player');
    yield s.say('barret', "Oi, newcomer! Debriefin' first.\fOne: the hideout's a bar down in the slums. 7th Heaven. Can't miss it.\fTwo: nobody says a word about tonight. Not to nobody. Got it?");
    yield s.say('cloud', "......And my money?");
    yield s.say('barret', "Money, money, money... We'll settle up at the hideout!\fAn' one more thing. East of here's the old train yard. Monsters crawl outta them wrecks at night.\fGo pokin' around if ya want. Just don't come cryin' to me.");
    s.set('c2_debrief');
    yield s.run('barret', 3, 6);
    s.hide('barret');
  };

  // Boarding the midnight train (next day).
  FF7.story.c2_boardTrain = function* (s) {
    yield s.say('jessie', "Remember: once we're aboard, we don't know each other. Just a few tired folks catching the last train.");
    yield s.say('biggs', "IDs and tickets, courtesy of our resident genius.");
    yield s.say('jessie', "Handmade with love! Okay, everybody on!");
    s.set('c2_departed');
    yield s.fadeOut(30);
    s.music('none');
    s.sfx('train_horn');
    yield s.movie('midgar_train', { text: 'Midnight.\nThe last train pulls out of Sector 7 Station\nand climbs toward the plate of Sector 4...' });
    yield s.goto('train2_car1', 'start');
  };

  // 7th Heaven: Barret storms in (when Cloud first tries to leave the bar).
  FF7.story.c2_barretStorms = function* (s) {
    s.set('c2_barret_stormed');
    yield s.move('player', 13, 11);
    s.sfx('door');
    s.spawn('barret', 'barret', 11, 13, 'up', { name: 'Barret' });
    yield s.run('barret', 11, 11);
    yield s.say('barret', "Awright! Bar's closed! Everybody OUT!");
    s.emote('johnny', '!!');
    yield s.say('johnny', "Y-yessir! Leavin'! Already gone!");
    yield s.run('johnny', [[6, 6], [10, 8], [10, 12], [12, 13], [12, 14]]);
    s.remove('johnny');
    yield s.say('marlene', "Papa!");
    yield s.run('marlene', [[11, 3], [11, 10]]);
    yield s.face('barret', 'marlene');
    s.anim('barret', 'fistpump');
    yield s.say('barret', "Marlene! Heh heh... Ya been good for Tifa while your old man was out?");
    yield s.say('marlene', "Uh-huh! I helped wipe the tables!");
    s.stopAnim('barret');
    s.spawn('biggs', 'biggs', 11, 13, 'up', { name: 'Biggs' });
    s.spawn('wedge', 'wedge', 12, 13, 'up', { name: 'Wedge' });
    s.spawn('jessie', 'jessie', 12, 14, 'up', { name: 'Jessie' });
    yield s.say('barret', "Everybody downstairs. Meetin'. Now!");
    // one at a time onto the pinball lift, which sinks through the floor and comes back up empty
    yield [s.run('biggs', [[10, 12], [10, 3], [8, 3], [8, 2]]), s.run('wedge', [[12, 12], [10, 9], [9, 3]])];
    yield s.face('biggs', 'up');
    yield* FF7.story.c2_pinballLift(s, ['biggs']);
    yield s.run('wedge', [[8, 3], [8, 2]]);
    yield s.face('wedge', 'up');
    yield* FF7.story.c2_pinballLift(s, ['wedge']);
    yield s.run('jessie', [[11, 12], [10, 3], [8, 3], [8, 2]]);
    yield s.face('jessie', 'up');
    yield* FF7.story.c2_pinballLift(s, ['jessie']);
    yield s.face('barret', 'player');
    yield s.say('barret', "You too, hotshot. Soon as Tifa's done fussin' over ya.");
    yield s.move('barret', [[10, 11], [10, 3], [8, 3], [8, 2]]);
    yield s.face('barret', 'up');
    yield* FF7.story.c2_pinballLift(s, ['barret']);
    s.remove('barret');
    s.remove('biggs'); s.remove('wedge'); s.remove('jessie');
    yield s.move('marlene', 9, 6);
  };

  // 7th Heaven's pinball lift: the machine and the floor in front of it sink down the shaft with the
  // riders, then (unless stayDown) rise back up empty.
  FF7.story.c2_pinballLift = function* (s, riders = [], opts = {}) {
    const o = (s.field.objects || []).find(x => x.id === 'pinlift'), D = 2.6, N = 50;
    const ease = (k) => k * k * (3 - 2 * k);
    s.sfx('elevator');
    for (let i = 1; i <= N; i++) { const h = -D * ease(i / N); if (o) o.hover = h; riders.forEach(r => s.hover(r, h)); yield 1; }
    riders.forEach(r => { if (r !== 'player') s.hide(r); });
    if (opts.stayDown) return;
    riders.forEach(r => s.hover(r, 0));
    yield 24;
    s.sfx('elevator');
    for (let i = 1; i <= N; i++) { if (o) o.hover = -D * (1 - ease(i / N)); yield 1; }
    if (o) o.hover = 0;
  };

  // The basement argument, the promise, the offer, the night and the morning.
  FF7.story.c2_hideoutNight = function* (s) {
    s.set('c2_basement_talk');
    s.music('barret');
    yield s.move('player', [[11, 4], [10, 4]]);
    yield s.face('barret', 'player');
    yield s.say('barret', "Awright, listen up! Reactor No.1? Gone! Ya see the news? The whole damn city's talkin' about AVALANCHE!");
    yield s.say('jessie', "They called us 'a terrorist group of unknown size.' I kinda like how that sounds.");
    yield s.say('wedge', "Unknown size... That's us. All five of us.");
    yield s.say('biggs', "Six, if you count the hired help.");
    s.sfx('elevator');
    s.spawn('tifa', 'tifa', 13, 2, 'left', { name: 'Tifa' });
    yield s.move('tifa', [[12, 4], [11, 5]]);
    yield s.say('barret', "......Speakin' of the hired help.\fHey, ex-SOLDIER. Back there ya didn't even blink. Guess the Planet dyin' don't keep SOLDIER boys up at night, huh?");
    yield s.face('player', 'barret');
    yield s.say('cloud', "I told you already. The Planet, your cause... none of it is my problem.\fI did the job. Now pay me.");
    yield s.say('barret', "Why, you little...!");
    yield s.say('tifa', "Barret. Please.");
    yield s.say('barret', "......Tch! Fine!");
    yield s.move('barret', 9, 5);
    yield s.giveGil(1500);
    yield s.say('barret', "Fifteen hundred. Happy now?");
    yield s.say('cloud', "......Then we're done. I'm out of here.");
    yield s.move('player', [[11, 3], [12, 3]]);
    yield s.say('tifa', "{CLOUD}, wait...!");
    yield s.say('barret', "Let 'im walk, Tifa! Go on! Go crawlin' back to Shinra where ya belong!");
    yield s.face('player', 'barret');
    yield s.say('cloud', "......Watch your mouth.\fI walked out on SOLDIER. And on Shinra. Don't ever lump me in with them again.");
    yield s.say('barret', "......");
    yield s.face('player', 'up');
    s.sfx('elevator');
    yield s.fadeOut(20);
    // ---- upstairs: Tifa follows him
    s.set('c2_scene_bar');
    yield s.goto('s7_bar', 'promise');
    s.unset('c2_scene_bar');
    s.music('tifa');
    s.sfx('elevator');
    s.show('tifa', 8, 2, 'down');
    yield s.run('tifa', [[9, 3], [11, 6]]);
    yield s.say('tifa', "{CLOUD}! Wait!");
    yield s.face('player', 'tifa');
    yield s.say('tifa', "You're really leaving? Just like that?");
    yield s.say('cloud', "I got paid. Nothing's keeping me here.");
    yield s.say('tifa', "Then stay because we need you!\fThe Planet is dying, {CLOUD}. A little more every day, one reactor at a time. Somebody has to stand up to Shinra.");
    yield s.say('cloud', "So let Barret and his friends do it. It has nothing to do with me.");
    yield s.say('tifa', "......Nothing? Not even me?\fYou'd just walk out on your childhood friend, like it's nothing?");
    // FF7 date points: protesting wins Tifa +5; an apology, nothing
    const DPF = [{ tifa: 5 }, {}];
    const cf = yield s.ask('cloud', '', ["Don't put it like that!", '......Sorry.'], { noQuotes: true, date: DPF });
    FF7.story.datePts(s, DPF[cf]);
    yield s.say('tifa', cf === 0 ? "Then don't go.\fAnd what about your promise? Did you forget that, too?" : "'Sorry'? That's all?\fSo you'll turn your back on the Planet... and on your promise, too?");
    yield s.say('cloud', "...Promise?");
    yield s.say('tifa', "You don't remember? That night... at the water tower. Seven years ago.");
    yield s.fadeOut(50);
    yield* FF7.story.c2_promiseMemory(s);
    // ---- back in the bar
    yield s.say('tifa', "...You remember now?");
    yield s.say('cloud', "......I'm no hero. I never made the papers. I can't keep a promise like that.");
    yield s.say('tifa', "But you did it, didn't you? You made it into SOLDIER, just like you said you would. So maybe...");
    s.sfx('elevator');
    s.spawn('barret', 'barret', 8, 2, 'down', { name: 'Barret' });
    yield s.move('barret', 9, 4);
    yield s.say('barret', "Hold it!");
    yield s.face('player', 'barret');
    yield s.say('barret', "......Ahem. Look. Next job. Three thousand gil. Whaddaya say?");
    yield s.say('tifa', "Barret! That's the money for Marlene's school!");
    yield s.say('barret', "Wha— I— ...Dammit!\fT-two thousand! Two thousand gil, an' not one gil more!");
    yield s.say('cloud', "......Two thousand.\fFine. I'm in.");
    yield s.say('barret', "Hmph! Mercenary.");
    yield s.say('tifa', "Thank you, {CLOUD}. Really.");
    yield s.say('barret', "Next target's Mako Reactor No.5, over in Sector 5. We move out tomorrow night.\fNow hit the sack, all o' ya. That's an order!");
    s.set('c2_promise');
    yield s.fadeOut(40);
    s.music('none');
    yield s.caption('That night, in the hideout below 7th Heaven...', { hold: 120, bg: '#000' });
    s.heal();
    // ---- the next morning
    s.set('c2_scene_morning');
    yield s.goto('s7_basement', 'morning');
    s.unset('c2_scene_morning');
    s.music('tifa');
    yield 40;
    s.stopAnim('player');
    yield s.move('player', 12, 7);
    yield s.face('player', 'tifa');
    yield s.say('tifa', "Morning, sleepyhead. Did you get any rest down here?");
    // FF7 date points: blame Barret's snoring (Barret +5) or flirt with Tifa (Tifa +5)
    const DPM = [{ barret: 5 }, { tifa: 5 }];
    const cm = yield s.ask('cloud', '', ["Not with Barret snoring all night...", 'With you close by? Like a baby.'], { noQuotes: true, date: DPM });
    FF7.story.datePts(s, DPM[cm]);
    if (cm === 0) yield s.say('barret', "Snorin'!? I don't snore! ......Do I?");
    else { yield s.emote('tifa', '!'); yield s.say('tifa', "...! W-well... good. I'm glad."); }
    yield s.face('barret', 'player');
    yield s.say('barret', "'Bout time ya woke up. Biggs, Wedge an' Jessie already went on ahead to get things ready at the station.\f......Hey. Cloud. Before we head out...");
    yield s.say('barret', "This Materia business. I know all about it, a'course! Know it real good.\fBut, uh... Tifa might wanna hear it from a pro. Y'know. For her sake.");
    yield s.say('tifa', "Oh? For MY sake?");
    const c = yield s.ask('cloud', '', ['Explain Materia.', "You'll figure it out."]);
    if (c === 0) yield* FF7.story.c2_materiaLesson(s);
    else {
      yield s.say('cloud', "You'll figure it out.");
      yield s.say('barret', "Hmph! See if I ever ask YOU for nothin' again!");
    }
    yield s.say('tifa', "Barret... I've made up my mind. I'm coming with you this time.");
    yield s.say('barret', "Tifa? But the bar... an' Marlene...");
    yield s.say('tifa', "Marlene will be fine for one night. And somebody has to keep you two from each other's throats.\fBesides... I have my own reasons to fight.");
    yield s.say('barret', "......Awright. Can't argue with that face.");
    s.join('tifa');
    s.set('c2_tifa_joined');
    yield s.msg(`${s.name('tifa')} joined the party.`);
    yield s.say('barret', "Here's the plan. We catch the midnight train outta Sector 7 station. Jessie's got the IDs.\fGet your gear sorted before then. Weapon shop, item shop, whatever ya need.");
    yield s.say('tifa', "The weapon shop's in the building on the right side of town. There's a Beginner's Hall upstairs, too, if you want a refresher.");
    s.set('c2_morning');
    yield [s.move('barret', [[11, 8], [12, 4], [13, 2]]), s.move('tifa', [[12, 6], [12, 3], [14, 2]])];
    s.sfx('elevator');
    s.remove('barret'); s.remove('tifa');
    s.music('slums');
  };

  // Seven years ago: the promise at the water tower in Nibelheim.
  FF7.story.c2_promiseMemory = function* (s) {
    yield s.caption('Nibelheim.\nSeven years ago...', { hold: 150, bg: '#000' });
    yield s.goto('s7_memory', 'start');
    yield s.cam(10, 4, 1, { dist: 6.5, pitch: 28 });
    yield 40;
    yield s.say('tifa', "So? You asked me to climb all the way up here. What is it?");
    yield s.say('cloud', "Come spring, I'm leaving this town. I'm going to Midgar.");
    yield s.say('tifa', "......You too? All the boys run off to the city sooner or later.");
    yield s.say('cloud', "It's not the same. I'm going to join SOLDIER.\fI'll be the best there is. Just like Sephiroth.");
    yield s.say('tifa', "Sephiroth...\fIsn't SOLDIER supposed to be really hard to get into?");
    yield s.say('cloud', "......I probably won't be able to come home for a long time.");
    yield s.say('tifa', "Will you be in the newspaper, then? Once you're famous?");
    yield s.say('cloud', "......I'll try.");
    yield s.say('tifa', "Then let's make a promise.\fWhen you're a big hero... if I'm ever in trouble, you'll come and save me. Okay?");
    yield s.say('cloud', "Huh?");
    yield s.say('tifa', "You know! The girl's in a jam, and her hero comes rushing in to rescue her.\fJust once, I want that to happen to me.");
    yield s.say('cloud', "......What are you talking about?");
    yield s.say('tifa', "Come on! Promise me!");
    yield s.say('cloud', "......All right. I promise.");
    yield 60;
    yield s.cam(10, 2, 120, { dist: 9, pitch: 18 });
    yield s.caption('The stars were very bright that night.', { hold: 110, bg: 'rgba(0,0,20,0.55)' });
    yield s.fadeOut(50);
    s.camZoom(9.5, 50);
    s.set('c2_scene_promise');
    yield s.goto('s7_bar', 'promise');
    s.unset('c2_scene_promise');
  };

  // Cloud explains Materia (morning, optional).
  FF7.story.c2_materiaLesson = function* (s) {
    yield s.say('cloud', "Materia is Mako, condensed into crystal. The knowledge of the Ancients, locked inside a stone.\fSet it in a slot on your weapon or armor, and its power is yours. Fire materia lets you cast Fire, and so on.");
    yield s.say('cloud', "Some slots are joined in pairs. That's a link.\fPut a support materia like All next to a magic materia, and they work together. Fire would hit every enemy at once.");
    yield s.say('cloud', "Materia grows with the AP you earn in battle. The higher its level, the stronger the magic.\fMaster one completely, and it gives birth to a brand-new materia.");
    yield s.say('cloud', "Color tells you the type. Green is magic. Red, summons. Yellow, commands. Purple works on its own, and blue supports whatever it's linked to.\fOne catch: materia changes your body. Magic materia makes you a little frailer, but your spells hit harder.");
    yield s.say('barret', "......Heh. Yeah. That's what I figured.");
    yield s.say('tifa', "Mm-hm. Of course you did, Barret.");
  };

  // ================================================================== Sector 7 Station
  FF7.defineMap('s7_station', {
    name: 'Sector 7 Station', area: 'Midgar', theme: 'station', music: 'slums',
    lights: [[2, 5, '#ffe0a0', 3], [18, 5, '#ffe0a0', 3], [31, 5, '#ffe0a0', 3]],
    // the train at the platform: the Midgar train model (js/gl/vehicles.js, as at Sector 1 and on the overpass) on
    // its track, the track bed (q) out of bounds
    legend: { q: 'block' },
    props: [{ at: [0, 2.5], prop: 'track', len: 34 }],
    objects: [{ id: 's7_train', at: [16.5, 2.5], model: { vehicle: 'train', opts: { cars: 2 } }, dir: 'left' }],
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "hhhhwhhhhhwhhhhhhhwhhhhhhhwhhhhhhh",
      "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq",
      "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq",
      "..................................",
      "..l......cc.......l.......v....l..",
      "....................B.o...........",
      "..................................",
      "##################################",
    ],
    entries: { from_train: [10, 4, 'down'], from_pillar: [1, 6, 'right'], from_yard: [32, 6, 'left'] },
    exits: [
      { at: [0, 4, 1, 4], to: 's7_pillar', entry: 'from_station', if: s => s.flag('c2_debrief'),
        blocked: function* (s) { yield* FF7.story.c2_debrief(s); } },
      { at: [33, 4, 1, 4], to: 's7_trainyard', entry: 'from_station', if: s => s.flag('c2_debrief'),
        blocked: function* (s) { yield* FF7.story.c2_debrief(s); } },
    ],
    npcs: [
      { id: 'barret', name: 'Barret', model: 'barret', at: [12, 5], dir: 'down', show: s => !s.flag('c2_debrief'),
        talk: function* (s) { yield* FF7.story.c2_debrief(s); } },
      { id: 'attendant', name: 'Station Attendant', model: 'worker2', at: [16, 4], dir: 'down',
        talk: function* (s) {
          if (night(s)) yield s.say('Station Attendant', "That was the last train in from Sector 8. Nothing moves on this line till tomorrow.\fYou want the town, head west. East is the old train yard... I wouldn't, if I were you.");
          else yield s.say('Station Attendant', "Tonight's midnight train is running on schedule. Next stop Sector 4, then on to Sector 5.\fFunny, the ID checkpoints got a big upgrade today. Shinra's jumpy after that reactor business.");
        } },
      { id: 'sleeper', name: 'Old Man', model: 'oldman2', at: [9, 5], dir: 'down', anim: 'sit', faceOnTalk: false,
        talk: function* (s) { yield s.say('Old Man', "Zzz... Hm? Is it morning already?\f...Bah. Morning, night. Looks the same under the plate either way."); } },
      { id: 'waiting', name: 'Woman', model: 'woman4', at: [28, 6], dir: 'left',
        talk: function* (s) {
          if (night(s)) yield s.say('Woman', "My husband works up on the plate. He said he'd be on this train...\fThey say a reactor blew up tonight. I'm sure he's fine. He has to be.");
          else yield s.say('Woman', "He came home late last night, safe and sound. Said the plate was in an uproar.\fI'm just glad the slums are quiet.");
        } },
      { id: 'jessie', name: 'Jessie', model: 'jessie', at: [11, 4], dir: 'down', show: s => s.flag('c2_tifa_joined') && !s.flag('c2_departed'),
        talk: function* (s) {
          yield s.say('jessie', "There you are! The midnight train's ready to board. Got everything you need?");
          const c = yield s.ask('cloud', '', ["Let's go.", 'Give me a minute.']);
          if (c !== 0) { yield s.say('jessie', "Okay, but don't dawdle! The train won't wait for us."); return; }
          yield* FF7.story.c2_boardTrain(s);
        } },
      { id: 'biggs', name: 'Biggs', model: 'biggs', at: [13, 5], dir: 'left', show: s => s.flag('c2_tifa_joined') && !s.flag('c2_departed'),
        talk: function* (s) { yield s.say('biggs', "Reactor No.5 tonight. Shinra's gonna be twice as ready this time, so let's be twice as sharp.\fWhen you're good to go, tell Jessie."); } },
      { id: 'wedge', name: 'Wedge', model: 'wedge', at: [8, 5], dir: 'right', show: s => s.flag('c2_tifa_joined') && !s.flag('c2_departed'),
        talk: function* (s) { yield s.say('wedge', "I packed us all snacks for the trip! ...Well, I packed ME snacks. But I'll share. Probably."); } },
    ],
    triggers: [
      { at: [4, 2, 20, 1], on: 'talk', run: function* (s) {
          if (s.flag('c2_tifa_joined') && !s.flag('c2_departed')) { yield s.msg("The midnight train. Jessie's waiting by the doors."); return; }
          yield s.msg('The train sits dark and silent at the platform. Its run is done for the night.');
        } },
    ],
    onLoad: function (s) {
      if (s.flag('c2_arrived')) return;
      s.place('barret', 11, 3, 'down');
      s.spawn('jessieA', 'jessie', 12, 3, 'down', { name: 'Jessie' });
      s.spawn('biggsA', 'biggs', 13, 3, 'down', { name: 'Biggs' });
      s.spawn('wedgeA', 'wedge', 9, 3, 'down', { name: 'Wedge' });
    },
    onEnter: function* (s) {
      if (s.flag('c2_arrived')) return;
      s.set('c2_arrived');
      s.sfx('train');
      yield 20;
      yield [s.move('barret', 12, 5), s.move('jessieA', 13, 4), s.move('biggsA', 14, 5), s.move('wedgeA', 8, 5)];
      yield s.face('player', 'barret');
      s.anim('barret', 'fistpump');
      yield s.say('barret', "Awright! Home sweet home! Reactor No.1's a pile of scrap, an' every last one of us made it back!");
      s.stopAnim('barret');
      yield s.say('wedge', "We really pulled it off... Man, I'm starving.");
      yield s.say('jessie', "You're always starving, Wedge.");
      yield s.say('barret', "Quit yappin'! Back to the hideout, all of ya. Split up. Don't draw attention.");
      yield s.say('biggs', "You got it, boss. See you there, Cloud.");
      yield [s.run('jessieA', [[13, 6], [0, 6]]), s.run('biggsA', [[14, 7], [0, 7]]), s.run('wedgeA', [[8, 4], [0, 4]])];
      s.remove('jessieA'); s.remove('biggsA'); s.remove('wedgeA');
      yield s.face('barret', 'player');
    },
  });

  // ================================================================== Train yard (Train Graveyard outskirts)
  FF7.defineMap('s7_trainyard', {
    name: 'Train Graveyard', area: 'Midgar', theme: 'graveyard', music: 'lurking',
    battle: { table: 'sector7_station', bg: 'graveyard', rate: 0.7 },
    lights: [[10, 8, '#c0d0ff', 3], [22, 5, '#c0d0ff', 3]],
    // the dead trains are the Midgar train model (js/gl/vehicles.js), rusted, on real track: two along the back on a
    // bed of their own (q, a gap from the buildings behind), two old locomotives left on sidings in the yard
    legend: { q: 'block' },
    props: [
      { at: [0, 2], prop: 'track', len: 29, col: '#5e5650', col2: '#2e2620' },
      { at: [0, 5.5], prop: 'track', len: 20, col: '#5e5650', col2: '#2e2620' },
      { at: [16, 7.5], prop: 'track', len: 13, col: '#5e5650', col2: '#2e2620' },
      { at: [18, 4], prop: 'track', len: 7, col: '#5e5650', col2: '#2e2620' },
      { at: [0, 9], prop: 'track', len: 10, col: '#5e5650', col2: '#2e2620' },
    ],
    objects: [
      { id: 'yard_train1', at: [8.7, 2], model: { vehicle: 'train', opts: { cars: 1, wreck: '#5a524a' } }, dir: 'right' },
      { id: 'yard_train2', at: [23, 2], model: { vehicle: 'train', opts: { cars: 0, wreck: '#8a4a1e' } }, dir: 'left' },
      { id: 'yard_loco1', at: [5.1, 5.5], model: { vehicle: 'train', opts: { cars: 0, wreck: '#6a5a48' } }, dir: 'left' },
      { id: 'yard_loco2', at: [23.3, 7.5], model: { vehicle: 'train', opts: { cars: 0, wreck: '#5a524a' } }, dir: 'right' },
    ],
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqX",
      "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqX",
      "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqX",
      "..........x..................X",
      "..qqqqqqqq.....x......l......X",
      "..qqqqqqqq...................X",
      "..........B...o.....qqqqqqqq.X",
      "...x....l.....x.....qqqqqqqq!X",
      ".............................X",
      ".............................X",
      "##############################",
    ],
    entries: { from_station: [1, 6, 'right'] },
    exits: [{ at: [0, 4, 1, 7], to: 's7_station', entry: 'from_yard' }],
    triggers: [
      { at: [28, 8], on: 'talk', run: function* (s) {
          yield s.msg("A rusted sign: \"SECTOR 7 TRAIN GRAVEYARD. NO MAINTENANCE BEYOND THIS POINT.\"\fDeeper in, a mountain of wrecked cars blocks the way.");
        } },
      { id: 'yard_first', at: [2, 4, 2, 7], once: true, run: function* (s) {
          yield s.say('cloud', "(Rows of dead trains... Something's moving between the wrecks.)");
        } },
    ],
  });

  // ================================================================== The pillar
  FF7.defineMap('s7_pillar', {
    name: 'Sector 7 Slums', area: 'Midgar', theme: 'slums', music: 'slums',
    lights: [[2, 4, '#ffd890', 3], [28, 4, '#ffd890', 3]],
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "hhhwhhhhhhXXXXXXXXXXXXXhhhhwhhhhhh",
      "hhhhhhxx..|XXXXXXXXXXX|..xxhhhwhhh",
      "..........|XXXXXXXXXXX|...........",
      "..l.......=============.....l.....",
      "..................................",
      "....x.o...........................",
      "..................................",
      "..........B.........x..o......l...",
      "..................................",
      "##################################",
    ],
    entries: { from_station: [32, 6, 'left'], from_town: [1, 6, 'right'] },
    exits: [
      { at: [33, 3, 1, 7], to: 's7_station', entry: 'from_pillar' },
      { at: [0, 3, 1, 7], to: 's7_town', entry: 'from_pillar' },
    ],
    npcs: [
      { id: 'pillarman', name: 'Man', model: 'man3', at: [3, 3], dir: 'up',
        talk: function* (s) {
          yield s.say('Man', "See that? That's the pillar. It holds up the whole Sector 7 plate, right over our heads.");
          yield s.cam(16, 2, 70, { dist: 13, pitch: 20 });
          yield 50;
          yield s.say('Man', "Solid as anything Shinra's ever built. As long as that thing's standing, we sleep sound down here.\f......Still. Every now and then I catch myself wondering what'd happen if it ever came down.");
          s.camZoom(9.5, 50);
          yield s.camFollow(40);
          s.set('c2_pillar_seen');
        } },
      { id: 'pwoman', name: 'Woman', model: 'woman2', at: [20, 7], dir: 'down',
        talk: function* (s) {
          if (night(s)) yield s.say('Woman', "Everyone's whispering about an explosion topside. The lights up on the plate went dark for a whole minute!");
          else yield s.say('Woman', "The news keeps saying 'terrorists' this, 'AVALANCHE' that...\fAll I know is my electric bill's going to go up again.");
        } },
      { id: 'pworker', name: 'Worker', model: 'worker4', at: [27, 8], dir: 'left',
        talk: function* (s) { yield s.say('Worker', "Station's back east. Town's to the west. Don't wander under the plate supports at night—the junk shifts."); } },
      { id: 'pkid', name: 'Boy', model: 'kid2', at: [12, 6], dir: 'up', wander: 2,
        talk: function* (s) { yield s.say('Boy', "I'm gonna climb that pillar someday! All the way up to the plate!\f...My mom says I'm not allowed."); } },
    ],
  });

  // ================================================================== Sector 7 town
  // An irregular clearing ringed by scrap mountains (backgrounds/ff7art28.jpg, screenshots 01-midgar_032,
  // 034): 7th Heaven stands at the north-west on a raised wooden porch (railing, steps down to the east,
  // green neon by the door); Johnny's house and a shack line the north; the weapon shop is a free-standing
  // two-storey tower in the east, its door up on a steel landing reached by outside stairs; the item shop
  // and a couple of loose shacks sit in the clearing; green lamp posts everywhere. The way to the pillar
  // and the station leaves from the north-east corner.
  FF7.defineMap('s7_town', {
    name: 'Sector 7 Slums', area: 'Midgar', theme: 'slums', music: 'slums',
    look: { floor: ['#5e5040', '#58493a'], floor3: ['#4e4238', '#483c32'], lamp: '#7dff9a', lampPost: '#2a302c', bldgWin: '#f0c860' },
    camera: { yaw: -25, pitch: 55, dist: 12 },
    lights: [[7, 6, '#ffe070', 3], [4, 6, '#60ffc0', 2.5], [33, 14, '#ffd890', 2.5], [18, 4, '#ffd890', 2], [5, 21, '#ffd890', 2], [6, 3, '#ffe070', 2.5]],
    legend: { 'Z': 'scrap' },
    grid: [
      "xZxxRxZxxxZxRxxZxxxZxxRxZxxxZxRxxZxxRxZx",
      "xxhhhhhhhhhhxxxxhhhhhhxxxxxxxxxxxxxxxxxx",
      "xxhhhhhhhhhh...ohhhhhhB..hhh...hhhh.xxRx",
      "xZhhhhhhhhhh....hw+hwho..hhhP..hhhh.xRxx",
      "Rxhhhhhhhhhh............Phhho.ohwhhB....",
      "xxhhwhh++hwhBZ..........................",
      "xxKKNKKKKKKK^^.........l................",
      "xxKKKKKKKKKK^^..........................",
      "xx============................hhhhhhh.xx",
      "Rx............l..............lhhhhhhhxZx",
      "xx......................o.....hhhhhhhxRx",
      "Zx................!B..........hhhhhhhxxx",
      "xxx...........................hhhhhhhxxx",
      "xxRx.......................MPPhwh+hwhZxx",
      "xxx.......BZ..........l....^^ggggggggxRx",
      "Rx...l.....................^^ggggggggxxx",
      "xx.........................==========xxx",
      "xZ...........................o.B....xxRx",
      "xx.hhhhhhB....o.......................Zx",
      "xx.hhhhhho.....BxR........l..........xxx",
      "xx.hh+hwh........Z...................xRx",
      "Rxx.............................l...xxxx",
      "xxRx.......l...........Bo..........xZRxx",
      "xxZ.....................Z..........xxRxx",
      "xxxR............l.................xRxxxx",
      "xxxxZ........B.............xx....oxxxxxx",
      "xxRxxxo.....xZ..........xxRx..xZRxxxxxxx",
      "########################################",
    ],
    heights: [
      "5555555555555555555555555555555555555555",
      "3300000000003333000000333333333333333333",
      "3200000000000000000000000000000000000000",
      "3200000000000000000000000000000000000000",
      "3200000000000000000000000000000000000000",
      "3200000220000000000000000000000000000000",
      "3222222222221100000000000000000000000000",
      "3222222222221100000000000000000000000000",
      "3222222222220000000000000000000000000033",
      "3200000000000000000000000000000000000233",
      "3200000000000000000000000000000000000233",
      "3200000000000000000000000000000000000233",
      "3200000000000000000000000000000000000233",
      "3200000000000000000000000000000003000233",
      "3200000000000000000000000001233333333233",
      "3200000000000000000000000001233333333233",
      "3200000000000000000000000000033333333233",
      "3200000000000000000000000000000000000233",
      "3200000000000000000000000000000000000033",
      "3200000000000000000000000000000000000233",
      "3200000000000000000000000000000000000233",
      "3200000000000000000000000000000000000233",
      "3200000000000000000000000000000000000233",
      "3200000000000000000000000000000000000233",
      "3200000000000000000000000000000000000233",
      "3200000000000000000000000000000000000233",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
    ],
    // low shacks of corrugated tin with shed roofs, 7th Heaven's two wooden storeys under a gable, the
    // steel weapon shop; the sign boards and the cables strung between the roofs
    buildings: [
      { at: [2, 1, 10, 5], h: 2.7, col: '#5a4636', roof: '#5a4a3c', top: 'gable', ridge: 'x', rise: 0.55, win: '#ffcf70', tex: 'siding' },
      { at: [16, 1, 6, 3], h: 1.9, col: '#56646a', roof: '#7a4a2c', top: 'shed', tin: true },
      { at: [25, 2, 3, 3], h: 1.6, col: '#6e5a44', roof: '#5a6a70', top: 'shed', tin: true },
      { at: [31, 2, 4, 3], h: 1.9, col: '#4e5c50', roof: '#8a5a34', top: 'shed', tin: '#8a4a2a' },
      { at: [30, 8, 7, 6], h: 3.2, col: '#6a6c70', roof: '#4a4a4e', tin: true },
      { at: [3, 18, 6, 3], h: 1.8, col: '#76604a', roof: '#8a5a36', top: 'shed', tin: true },
    ],
    props: [
      { at: [6.5, 4.9], prop: 'neon', text: '7th HEAVEN', col: '#ffe060', col2: '#3a2a1c', y: 3.05, size: 0.3 },
      { at: [4, 6], prop: 'neon', text: '7th HEAVEN', col: '#70ff90', y: 1.3, size: 0.08, italic: true },
      { at: [18, 11], prop: 'sign', text: 'STATION', col: '#a08050' },
      { at: [11.5, 3], to: [16, 2], h: 2.9, h2: 2.0, bulbs: ['#ffe070', '#ff9040'] },
      { at: [21.5, 2], to: [25, 2.5], h: 2.0, h2: 1.7, count: 1 },
      { at: [29, 9], to: [23, 6], h: 1.5, h2: 1.5, bulbs: ['#7dff9a'], sag: 0.25 },
      { at: [14, 9], to: [22, 14], h: 1.5, h2: 1.5, bulbs: ['#7dff9a', '#ffe070'], sag: 0.3 },
      { at: [32, 4.5], to: [32, 8], h: 2.0, h2: 3.3, count: 1 },
      { at: [8, 18], to: [11, 22], h: 1.9, h2: 1.5, count: 1 },
    ],
    entries: {
      from_pillar: [38, 5, 'left'], from_bar: [7, 6, 'down'], from_johnny: [18, 4, 'down'],
      from_items: [5, 21, 'down'], from_weapons: [33, 14, 'down'],
    },
    exits: [
      { at: [39, 4, 1, 4], to: 's7_pillar', entry: 'from_town' },
      { at: [7, 5, 2, 1], to: 's7_bar', entry: 'from_town', sfx: 'door' },
      { at: [18, 3], to: 's7_johnny', entry: 'from_town', sfx: 'door' },
      { at: [5, 20], to: 's7_itemshop', entry: 'from_town', sfx: 'door' },
      { at: [33, 13], to: 's7_weapons', entry: 'from_town', sfx: 'door' },
    ],
    npcs: [
      { id: 'barret', name: 'Barret', model: 'barret', at: [9, 6], dir: 'down', show: s => s.flag('c2_debrief') && !s.flag('c2_bar_intro'),
        talk: function* (s) { yield s.say('barret', "This here's our hideout. 7th Heaven.\fWell? What're ya standin' around for? Get inside!"); } },
      { id: 'oldman', name: 'Old Man', model: 'oldman3', at: [15, 12], dir: 'right',
        talk: function* (s) {
          if (night(s)) yield s.say('Old Man', "You can't see a single star from down here. Just the plate, the plate's lights, and the plate's shadow.");
          else yield s.say('Old Man', "Heard the Sector 1 reactor went up like a bonfire. Good riddance, I say.\f...Then again, nobody ever asks what I say.");
        } },
      { id: 'kid1', name: 'Boy', model: 'kid3', at: [16, 15], dir: 'down', wander: 2,
        talk: function* (s) {
          if (night(s)) yield s.say('Boy', "Tag! You're it! ...Aw, you're no fun, mister.");
          else yield s.say('Boy', "When I grow up I'm gonna join SOLDIER! And beat up monsters with a sword THIS big!");
        } },
      { id: 'kid2', name: 'Girl', model: 'girl2', at: [20, 16], dir: 'up', wander: 2,
        talk: function* (s) {
          if (night(s)) yield s.say('Girl', "Mama says to stay away from the big man with the gun arm.\fBut he gives Marlene piggyback rides. So he can't be that bad, right?");
          else yield s.say('Girl', "Marlene's my best friend! Her papa's scary... but he's nice. Mostly.");
        } },
      { id: 'twoman', name: 'Woman', model: 'woman6', at: [7, 21], dir: 'down',
        talk: function* (s) {
          if (night(s)) yield s.say('Woman', "The item shop is right behind me. Potions, antidotes, even materia.\fIf you ever go poking around the train yard, you'll want all three.");
          else yield s.say('Woman', "Heading out of town? Stock up before you go. Out past the slums, nobody's going to sell you a Potion.");
        } },
      { id: 'tworker', name: 'Worker', model: 'worker2', at: [24, 17], dir: 'left',
        talk: function* (s) {
          if (night(s)) yield s.say('Worker', "Power flickered down here when that reactor blew. When the plate sneezes, the slums catch a cold.");
          else yield s.say('Worker', "Another shift, same as always. Weld, hammer, weld.\fAt least the pay's... nope. Pay's awful too.");
        } },
      { id: 'tman', name: 'Man', model: 'man5', at: [25, 15], dir: 'right',
        talk: function* (s) { yield s.say('Man', "The weapon shop in this building sells Iron Bangles. Way sturdier than those bronze things everybody wears.\fIf you've got the gil, get one for every fighter you've got."); } },
      { id: 'tman2', name: 'Man', model: 'man8', at: [15, 8], dir: 'up',
        talk: function* (s) {
          if (night(s)) yield s.say('Man', "Been inside 7th Heaven yet? Tifa's cooking is the only thing keeping half this street alive.");
          else yield s.say('Man', "Word is Tifa's closing the bar tonight. First time in months.\fHuh. Wonder what's so important.");
        } },
    ],
    triggers: [
      { at: [4, 6], on: 'talk', run: function* (s) { yield s.msg('"7th Heaven" — the neon over the porch buzzes and flickers green.'); } },
      { at: [18, 11], on: 'talk', run: function* (s) { yield s.msg('A hand-painted signpost: "7th HEAVEN" points up the steps, "WEAPONS" to the tower, "STATION" off to the north-east.'); } },
    ],
  });

  // ================================================================== 7th Heaven
  // Layout after the pre-rendered background (references/fantasyanime/backgrounds/ff7art26.jpg), seen
  // diagonally from the south-east: the bar counter with 4 green stools runs down the WEST side with
  // Tifa's aisle and the back bar (bottle shelves, TV) behind it; the kitchen, the pinball machine (the
  // lift to the hideout), the jukebox and the "TEXAS" neon line the NORTH wall; a square table with
  // round stools at the front, a bench table on the right, the door in the right half of the south
  // wall. The east side is left open (void) like FF7's cut-away rooms, so the diagonal camera sees in.
  //   q fridge · F stove · D kitchen/back bar/counter · k bottle shelf · Z TV · M pinball · v jukebox
  //   N "TEXAS" neon · I green bar stool · Y round wooden stool · T table (one prop per table, `props`)
  const tifaBarTalk = function* (s) {
    if (!s.flag('c2_barret_stormed')) {
      yield s.say('tifa', "Sit down, take a breather. You look like you could sleep for a week.\fHow've you been, {CLOUD}? It's been... what, years?");
      return;
    }
    if (!s.flag('c2_drink')) {
      yield s.say('tifa', "Barret, honestly. He stomps in here like a storm every single time.\fWant something before you go down? It's on the house.");
      // FF7 date points: only the hard drink counts (Tifa +5)
      const DP = [{ tifa: 5 }, {}, {}];
      const c = yield s.ask('cloud', '', ['Something strong.', 'Something light.', "I'm fine."], { date: DP });
      FF7.story.datePts(s, DP[c]);
      if (c === 0) {
        yield s.say('tifa', "Something strong, coming right up.");
        s.sfx('item');
        yield s.say('tifa', "......There. Don't make that face.\fYou used to hate anything bitter, remember? Guess some things change.");
      } else if (c === 1) {
        yield s.say('tifa', "Something light it is.");
        s.sfx('item');
        yield s.say('tifa', "...Here. You look like you needed it more than you'd admit.");
      } else {
        yield s.say('tifa', "Suit yourself. Offer stands, though.");
      }
      s.set('c2_drink');
      yield s.say('tifa', "Barret's waiting downstairs. The pinball machine in the corner... just give it a push.");
      return;
    }
    if (!s.flag('c2_basement_talk')) { yield s.say('tifa', "Go on down. I'll close up and be right behind you."); return; }
    yield s.say('tifa', "Get some rest, {CLOUD}. Tomorrow's a big day.");
  };
  FF7.defineMap('s7_bar', {
    name: '7th Heaven', area: 'Midgar', theme: 'bar', music: 'tifa',
    // ff7art26 / 01-midgar_036-037: weathered vertical boards, one long plank counter (the counter tiles draw as a
    // single run), rough plank tables
    look: { floor: ['#4c4232', '#463c2c'], wall: '#4e3e2e', wallTop: '#140e0a', trim: '#241810', wood: ['#5e3e24', '#553820'], stool: '#2f9a50',
      wallTex: 'boards', ambient: [0.34, 0.32, 0.29], light: [0.66, 0.6, 0.5] },
    camera: { yaw: 40, pitch: 52, dist: 11 },
    legend: { 'T': 'block', 'Q': 'liftblock', 'L': 'liftpad' },
    lights: [[4, 8, '#ffd8a0', 3], [8, 11, '#ffd8a0', 3], [4, 2, '#ffc890', 2.5], [11, 2, '#ff70c0', 2.5], [2, 9, '#90c0ff', 2], [12, 8, '#ffd8a0', 2.5]],
    grid: [
      "############### ",
      "#q.FDkP.Q.vN... ",
      "#k......L...... ",
      "#k............. ",
      "#k............. ",
      "#D..DI......... ",
      "#D..D.......... ",
      "#D..DI......YY. ",
      "#D..D.......TT. ",
      "#Z..DI......... ",
      "#q..D.Y.TT..... ",
      "#...DI.YTT..... ",
      "#.......Y...... ",
      "#.............. ",
      "###########++## ",
    ],
    // the fittings themselves (ff7art26): bottle shelves and the TV on the west wall face the counter,
    // the pinball machine, jukebox and the purple "TEXAS" neon at the back, round wooden stools
    props: [
      { at: [1, 2], prop: 'shelf', rot: 90 }, { at: [1, 3], prop: 'shelf', rot: 90 }, { at: [1, 4], prop: 'shelf', rot: 90 },
      { at: [5, 1], prop: 'shelf' }, { at: [1, 9], prop: 'tv', rot: 90 },
      { at: [10, 1], prop: 'jukebox', col: '#5a2e1c', col2: '#ffb040' },
      { at: [11, 1], prop: 'neon', text: 'TEXAS', col: '#b068ff', y: 1.45, size: 0.14 },
      { at: [8.5, 10.5], prop: 'table', style: 'planks', scale: [1.9, 1.05, 1.9] }, { at: [12.5, 8], prop: 'table', style: 'planks', scale: [1.9, 1, 1.15] },
      { at: [1, 10], prop: 'cabinet', rot: 90, col: '#d4d4c8' },   // the fridge beside the TV
      { at: [12, 7], prop: 'stool', style: 'wood' }, { at: [13, 7], prop: 'stool', style: 'wood' },
      { at: [6, 10], prop: 'stool', style: 'wood' }, { at: [7, 11], prop: 'stool', style: 'wood' }, { at: [8, 12], prop: 'stool', style: 'wood' },
    ],
    entries: { from_town: [11, 13, 'up'], from_basement: [8, 2, 'down'], promise: [10, 7, 'right'] },
    // the pinball machine is the lift to the hideout: it sinks through the floor with whoever stands in front of it
    objects: [{ id: 'pinlift', at: [8, 1], prop: 'pinball', col: '#6a2440', col2: '#e8a030', col3: '#ff6a40', pad: [[0, 0], [0, 1]] }],
    exits: [
      { at: [11, 14, 2, 1], to: 's7_town', entry: 'from_bar', sfx: 'door', if: s => s.flag('c2_barret_stormed'),
        blocked: function* (s) { yield* FF7.story.c2_barretStorms(s); } },
    ],
    npcs: [
      { id: 'tifa', name: 'Tifa', model: 'tifa', at: [3, 7], dir: 'right', show: s => !s.flag('c2_tifa_joined'),
        talk: function* (s) { yield* tifaBarTalk(s); } },
      { id: 'marlene', name: 'Marlene', model: 'marlene', at: [9, 6], dir: 'down',
        talk: function* (s) {
          if (s.flag('c2_morning')) {
            yield s.say('marlene', "Papa said you're all going on a job tonight...\fYou'll look after Papa and Tifa, right? Promise?");
            yield s.say('cloud', "......");
            yield s.say('marlene', "Hee hee. That means yes!");
            return;
          }
          if (s.flag('c1_bought_flower') && !s.flag('c2_marlene_flower')) {
            // (games saved before the bar intro offered the flower: giving it to Marlene, Barret +5)
            s.set('c2_marlene_flower');
            FF7.story.datePts(s, { barret: 5 });
            yield s.say('marlene', "......Is that... a flower? A real one?");
            yield s.say('cloud', "......You can have it.");
            s.emote('marlene', '♪');
            yield s.say('marlene', "Really?! Thank you!\fTifa, look! A flower! It smells so sweet!");
            yield s.say('tifa', "Wow... you almost never see flowers down here. Where did you find it, {CLOUD}?");
            yield s.say('cloud', "......A girl was selling them. In Sector 8.");
            yield s.say('tifa', "Hmm. A girl, huh?");
            return;
          }
          if (!s.flag('c2_barret_stormed')) { s.emote('marlene', '...'); yield s.say('marlene', "......"); return; }
          yield s.say('marlene', "Papa always comes home. Always! He promised.");
        } },
      { id: 'johnny', name: 'Johnny', model: 'johnny', at: [5, 6], dir: 'left', show: s => !s.flag('c2_barret_stormed'),
        talk: function* (s) {
          yield s.say('johnny', "Huh? Who're you?\f...Hold on. You waltzed in here all chummy with Tifa. You ain't her boyfriend, are ya?");
          yield s.say('cloud', "......Childhood friend.");
          yield s.say('johnny', "Childhood friend?! Man... I been comin' here every night for a year and she still thinks my name is 'Jimmy.'");
        } },
    ],
    triggers: [
      { at: [7, 1, 3, 1], on: 'talk', run: function* (s) {
          if (!s.flag('c2_barret_stormed')) { yield s.msg('A battered pinball machine. The flippers are worn down to bare metal.'); return; }
          if (!s.flag('c2_drink')) { yield s.say('tifa', "Hey, don't run off so fast. At least let me get you a drink first."); return; }
          yield s.move('player', 8, 2);
          yield s.face('player', 'up');
          yield* FF7.story.c2_pinballLift(s, ['player'], { stayDown: true });
          yield s.goto('s7_basement', 'from_bar');
        } },
      { at: [4, 5, 1, 7], on: 'talk', run: function* (s) {
          // Tifa serves from behind the counter: talking across it reaches her
          const t = s.actor('tifa');
          if (t && t.visible && !s.flag('c2_tifa_joined')) { yield s.face('tifa', 'player'); yield* tifaBarTalk(s); return; }
          yield s.msg("Tifa keeps the counter spotless. The glasses behind it gleam.");
        } },
      { at: [10, 1, 1, 1], on: 'talk', run: function* (s) { yield s.msg('An old jukebox. Somebody taped a note to it: "OUT OF ORDER. DO NOT KICK."'); } },
    ],
    onLoad: function (s) {
      if (s.flag('c2_scene_bar')) { s.hide('tifa'); s.hide('marlene'); }
      if (s.flag('c2_scene_promise')) { s.hide('marlene'); s.place('tifa', 11, 6, 'left'); s.place('player', 10, 7, 'right'); }
    },
    onEnter: function* (s) {
      if (s.entry() === 'from_basement') {   // riding the pinball lift back up from the hideout
        const o = (s.field.objects || []).find(x => x.id === 'pinlift'), D = 2.6, N = 50;
        s.face('player', 'down');
        if (o) o.hover = -D; s.hover('player', -D);
        s.sfx('elevator');
        for (let i = 1; i <= N; i++) { const k = i / N, h = -D * (1 - k * k * (3 - 2 * k)); if (o) o.hover = h; s.hover('player', h); yield 1; }
        if (o) o.hover = 0; s.hover('player', 0);
        return;
      }
      if (s.flag('c2_bar_intro')) return;
      s.set('c2_bar_intro');
      yield s.move('player', [[11, 8], [6, 8]]);
      yield s.face('tifa', 'player');
      yield s.say('tifa', "Welcome to 7th Heav— Oh! You're back!");
      yield s.nameEntry('tifa');
      yield s.say('tifa', "Everyone's been gone for hours. I was so worried...\fWas it bad out there?");
      yield s.say('cloud', "Nothing I couldn't handle.");
      yield s.say('tifa', "Same old {CLOUD}.\fMarlene, come say hi! This is {CLOUD}. The friend I told you about, from my hometown.");
      yield s.face('marlene', 'player');
      s.emote('marlene', '!');
      yield s.say('marlene', "......");
      yield s.run('marlene', [[9, 3], [12, 2]]);
      yield s.say('tifa', "She's shy around new faces. She'll warm up to you.\fNo Barret? He probably stopped somewhere to brag. Make yourself at home.");
      if (s.flag('c1_bought_flower') && !s.flag('c2_marlene_flower')) {
        // FF7: coming in with the flower from Sector 8. Date points: Tifa +5 (to her) or Barret +5 (to Marlene)
        s.set('c2_marlene_flower');
        yield s.say('tifa', "......Hm? Is that a flower? A real one? You almost never see those down here.");
        const DP = [{ tifa: 5 }, { barret: 5 }];
        const c = yield s.ask('cloud', '', ['Here. It\'s for you.', "It's for Marlene."], { noQuotes: true, date: DP });
        FF7.story.datePts(s, DP[c]);
        if (c === 0) {
          s.set('c2_flower_tifa');
          yield s.say('tifa', "For me? ......Thank you, {CLOUD}. I'll keep it in a glass behind the bar.");
        } else {
          yield s.say('tifa', "Marlene! Come see what {CLOUD} brought you!");
          yield s.move('marlene', [[9, 3], [9, 7], [7, 8]]);
          yield s.face('marlene', 'player');
          yield s.say('marlene', "......Is that... a flower? For me?");
          s.emote('marlene', '♪');
          yield s.say('marlene', "Thank you! It smells so sweet!\fI'm gonna show Papa when he gets home!");
          yield s.run('marlene', [[9, 7], [9, 6]]);
        }
        yield s.say('tifa', "Where did you even find a flower, {CLOUD}?");
        yield s.say('cloud', "......A girl was selling them. In Sector 8.");
        yield s.say('tifa', "Hmm. A girl, huh?");
      }
    },
  });

  // ================================================================== The hideout (basement)
  // After backgrounds/ff7art27.jpg and 01-midgar_038, seen diagonally like 7th Heaven above it: a grated
  // floor inside a yellow-and-black hazard-striped border, the table of plans in the middle, the big TV
  // on crates and the PC desk on the north wall, the lift up to the bar in the north-east corner, the
  // whiteboard, oxygen tank, crates and Barret's weights along the west wall, the punching bag east.
  //   - hazard stripes · g grating · Z PC · T block under the TV, the whiteboard and the table of plans
  //   o oxygen tank · M weights · u punching bag (the big fittings are `props`)
  FF7.defineMap('s7_basement', {
    name: 'AVALANCHE Hideout', area: 'Midgar', theme: 'bar', music: 'tifa',
    look: { wall: '#4e4a48', wallTop: '#101010', floor: ['#3e3a36', '#38342f'], metal: ['#3a3e44', '#34383e'], hazard: ['#c89a1c', '#161616'],
      ambient: [0.34, 0.33, 0.34], light: [0.62, 0.6, 0.58] },
    camera: { yaw: 40, pitch: 52, dist: 10 },
    legend: { 'T': 'block' },
    lights: [[5, 2, '#80c0ff', 3], [9, 2, '#80ffc0', 2], [7, 6, '#ffd8a0', 3.5], [13, 2, '#ffe0a0', 2], [12, 8, '#ffd8a0', 2]],
    grid: [
      "############### ",
      "#q.BTTB.DZj.PEE ",
      "#.----------.EE ",
      "#T-gggggggg-... ",
      "#T-gggggggg-... ",
      "#.-gggTTggg-... ",
      "#o-gggTTggg-... ",
      "#B-gggggggg-... ",
      "#M-gggggggg-... ",
      "#.-gggggggg-.u. ",
      "#j----------... ",
      "#..BB.......... ",
      "############### ",
    ],
    props: [
      { at: [4.5, 1], prop: 'tv', scale: [2, 1.7, 1.3], col: '#58d8e8' },
      { at: [1, 3.5], prop: 'whiteboard', rot: 90, w: 1.7 },
      { at: [6.5, 5.5], prop: 'table', scale: [2, 1, 2], col: '#3a3634' },
      { at: [6.5, 5.5], prop: 'cushion', col: '#e8e4d8', scale: [1.9, 0.25, 1.4], rot: 15, lift: 0.33 },
      { at: [1, 6], prop: 'barrel', col: '#7a3624', scale: [0.75, 1.7, 0.75] },
      { at: [13, 9], prop: 'punchbag', col: '#7a2a1c', rot: -90 },
      { at: [6.5, 0.55], prop: 'banner', col: '#a81c1c', col2: '#2a1a14', text: 'AVALANCHE', textCol: '#f0e0c8', w: 2.2, h: 1.2, y: 2.3 },
    ],
    labels: [{ at: [10.5, 2], text: 'DANGER', col: '#e8e0d0', back: '#b02418', size: 0.09, w: 0.18 }],
    entries: { from_bar: [12, 3, 'down'], morning: [13, 7, 'down'] },
    exits: [
      { at: [13, 1, 2, 2], run: function* (s) {
          if (s.flag('c2_basement_talk') && !s.flag('c2_morning')) { yield s.say('barret', "Where d'ya think you're goin'? Sleep!"); yield s.walk('player', -1, 1); return; }
          s.sfx('elevator');
          yield s.goto('s7_bar', 'from_basement');
        } },
    ],
    npcs: [
      { id: 'barret', name: 'Barret', model: 'barret', at: [8, 6], dir: 'left', show: s => s.flag('c2_barret_stormed') && !s.flag('c2_morning'),
        talk: function* (s) { yield s.say('barret', "Whaddaya want? Go to sleep already."); } },
      { id: 'jessie', name: 'Jessie', model: 'jessie', at: [5, 2], dir: 'up', show: s => s.flag('c2_barret_stormed') && !s.flag('c2_promise'),
        talk: function* (s) { yield s.say('jessie', "Shh, I'm watching the news feed. They're still trying to figure out how we got past the gate.\fAmateurs. I made that ID card in, like, twenty minutes."); } },
      { id: 'biggs', name: 'Biggs', model: 'biggs', at: [4, 7], dir: 'right', show: s => s.flag('c2_barret_stormed') && !s.flag('c2_promise'),
        talk: function* (s) { yield s.say('biggs', "Don't let Barret get under your skin. He talks tough, but he'd take a bullet for any one of us."); } },
      { id: 'wedge', name: 'Wedge', model: 'wedge', at: [10, 9], dir: 'up', show: s => s.flag('c2_barret_stormed') && !s.flag('c2_promise'),
        talk: function* (s) { yield s.say('wedge', "Tifa made extra food tonight. Think anybody'll notice if I have thirds?"); } },
    ],
    objects: [
      { at: [4, 1], talk: function* (s) { yield s.msg('A cracked monitor flickers with a news broadcast:\f"...Shinra officials confirm the destruction of Mako Reactor No.1. The terrorist group AVALANCHE has claimed responsibility..."'); } },
      { at: [5, 1], talk: function* (s) { yield s.msg('The news drones on about "the terrorist group AVALANCHE." Somebody has drawn a moustache on the anchorman.'); } },
      { at: [1, 8], talk: function* (s) { yield s.msg("Barret's weights. The bar is bent in the middle."); } },
      { at: [1, 3], talk: function* (s) { yield s.msg("Barret's whiteboard: arrows, circles, a map of the reactor... and a stick figure with a gun-arm blowing it all sky-high."); } },
      { at: [1, 4], talk: function* (s) { yield s.msg("Barret's whiteboard: arrows, circles, a map of the reactor... and a stick figure with a gun-arm blowing it all sky-high."); } },
      { at: [13, 9], talk: function* (s) { yield s.msg("A battered punching bag. Judging by the dents, Tifa's been practicing."); } },
      { at: [9, 1], talk: function* (s) { yield s.msg("Jessie's computer. The screen is full of ID-card templates and train timetables."); } },
    ],
    onLoad: function (s) {
      if (s.flag('c2_scene_morning')) {
        s.spawn('tifa', 'tifa', 11, 7, 'right', { name: 'Tifa' });
        s.place('barret', 9, 8, 'right');
        s.place('player', 13, 7, 'down');
        s.anim('player', 'lie');
      }
    },
    onEnter: function* (s) {
      if (s.flag('c2_drink') && !s.flag('c2_basement_talk')) yield* FF7.story.c2_hideoutNight(s);
    },
  });

  // ================================================================== Memory: the water tower (7 years ago)
  FF7.defineMap('s7_memory', {
    name: 'Nibelheim', area: 'Nibelheim', theme: 'nibelheim', hidePlayer: true, music: 'othermountain',
    look: { sky: ['#01020a', '#0a1236'], fog: { color: [0.02, 0.03, 0.09], near: 8, far: 24 }, ambient: [0.22, 0.24, 0.36], light: [0.42, 0.46, 0.66] },
    lights: [[4, 2, '#ffd890', 2], [17, 2, '#ffd890', 2]],
    grid: [
      "RRRTTTRRRTTTTRRRTTTRRR",
      "hhwhhh,,,,XX,,,,,hhwhh",
      "hhhhhh,,,,XX,,,,,hhhhh",
      ",,,,,,,,,zzzz,,,,,,,,,",
      ",,T,,,,,,zzzz,,,,,,T,,",
      ",,,,,,,,,zzzz,,,,,,,,,",
      ",,,,,,,,,,H,,,,,,,,,,,",
      ",,,,f,,,,,,,,,,,,,f,,,",
      ",,,,,,,,,,,,,,,,,,,,,,",
      "======================",
    ],
    heights: [
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000007777000000000",
      "0000000007777000000000",
      "0000000007777000000000",
      "0000000000400000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
    ],
    entries: { start: [10, 7, 'up'] },
    npcs: [
      { id: 'ycloud', name: 'Cloud', model: 'young_cloud', at: [10, 4], dir: 'down', anim: 'sit', faceOnTalk: false },
      { id: 'ytifa', name: 'Tifa', model: { base: 'tifa', height: 'kid' }, at: [11, 4], dir: 'down', anim: 'sit', faceOnTalk: false },
    ],
  });

  // ================================================================== Weapon shop (1F)
  const weaponShop = function* (s) {
    yield s.say('Weapon Shop', "Welcome! Weapons, armor, a grenade or two. Take a look.");
    yield s.shop('sector7_weapons');
  };
  FF7.defineMap('s7_weapons', {
    name: 'Sector 7 Weapon Shop', area: 'Midgar', theme: 'house', music: 'slums',
    look: { wall: '#8a7a68', floor: ['#6a5a48', '#625242'] },
    grid: [
      "##################",
      "#kkkkkk#qq#####^^#",
      "#......#.........#",
      "#DDDDDDD.........#",
      "#................#",
      "#..B.o......t.c..#",
      "#................#",
      "########++########",
    ],
    heights: [
      "000000000000000000",
      "000000000000000330",
      "000000000000000000",
      "000000000000000000",
      "000000000000000000",
      "000000000000000000",
      "000000000000000000",
      "000000000000000000",
    ],
    entries: { from_town: [8, 6, 'up'], from_hall: [15, 2, 'down'] },
    exits: [
      { at: [8, 7, 2, 1], to: 's7_town', entry: 'from_weapons', sfx: 'door' },
      { at: [15, 1, 2, 1], to: 's7_hall', entry: 'from_1f' },
    ],
    npcs: [
      { id: 'owner', name: 'Weapon Shop', model: 'man8', at: [3, 2], dir: 'down', talk: weaponShop },
      { id: 'boy', name: 'Boy', model: 'kid4', at: [12, 4], dir: 'down',
        talk: function* (s) {
          if (s.flag('c2_kid_paid')) { yield s.say('Boy', "Room's all yours, mister! Third floor, all the way up. Don't touch my robots."); return; }
          yield s.say('Boy', "Hey, mister, you look beat. My room's on the third floor, and my folks are never home.\fYou can nap in my bed... for a price! How much ya gonna pay me?");
          const c = yield s.ask('Boy', 'How much will you give him?', ['10 Gil', '50 Gil', '100 Gil', 'Nothing']);
          const amt = [10, 50, 100, 0][c];
          if (!amt) { yield s.say('Boy', "Cheapskate! Forget it, then!"); return; }
          if (s.gil() < amt || !s.takeGil(amt)) { yield s.say('Boy', "You don't even have that much? Jeez..."); return; }
          s.set('c2_kid_paid');
          if (amt === 10) yield s.say('Boy', "Ten gil? ...Fine. A deal's a deal. Go on up.");
          else if (amt === 50) yield s.say('Boy', "Fifty! Alright! Bed's upstairs, go nuts.");
          else yield s.say('Boy', "A HUNDRED?! Whoa! Thanks, mister! Sleep as long as you want!");
        } },
      { id: 'customer', name: 'Customer', model: 'man2', at: [10, 5], dir: 'up',
        talk: function* (s) { yield s.say('Customer', "Iron Bangles, my friend. Iron. Bangles.\fBronze'll crack the first time a guard dog bites you. Iron holds."); } },
    ],
    objects: [{ at: [3, 3], talk: weaponShop }, { at: [4, 3], talk: weaponShop }],
    triggers: [{ at: [8, 1, 2, 1], on: 'talk', run: function* (s) { yield s.msg('Racks of dented swords and old rifles. Most of them look like they were pulled out of the train yard.'); } }],
  });

  // ================================================================== Beginner's Hall (2F)
  const LESSONS = [
    "Whenever you're free to walk around, you can open the Menu.\fFrom there you use items, cast magic, set materia, change equipment and check everyone's status.\fNot sure what something does? The help line at the top of the menu screen will tell you.",
    "Materia is crystallized Mako. Set it into the slots on your weapons and armor to use magic, summons and special skills.\fSlots joined together are 'linked', and linked materia can work as a pair. And materia grows stronger with the AP you earn in battle!",
    "In battle, every fighter has a Time gauge. When it fills up, that fighter can act.\fIn Active mode the enemy won't wait while you think! If that's too hectic, try Wait mode in the Config menu.",
    "Take enough damage and your Limit gauge fills up. When it's full, the Attack command becomes Limit, a powerful special technique.\fUse your Limit Breaks often enough and you'll learn new ones.",
    "Every monster has weak points. Machines hate Lightning, and plenty of beasts can't stand Fire.\fIf your damage suddenly jumps, you've found a weakness. Remember it!",
  ];
  FF7.defineMap('s7_hall', {
    name: "Beginner's Hall", area: 'Midgar', theme: 'house', music: 'slums',
    look: { wall: '#a09070', floor: ['#7a6448', '#725c42'] },
    grid: [
      "######################",
      "#Z.....kkkkkk.....^^##",
      "#....................#",
      "#..B..B.......S......#",
      "#....................#",
      "#....................#",
      "#....................#",
      "#^^..................#",
      "######################",
    ],
    heights: [
      "3333333333333333333333",
      "3333333333333333336633",
      "3333333333333333333333",
      "3333333333333333333333",
      "3333333333333333333333",
      "3333333333333333333333",
      "3333333333333333333333",
      "3003333333333333333333",
      "3333333333333333333333",
    ],
    entries: { from_1f: [3, 7, 'right'], from_3f: [18, 2, 'down'] },
    exits: [
      { at: [1, 7, 2, 1], to: 's7_weapons', entry: 'from_hall' },
      { at: [18, 1, 2, 1], to: 's7_kidroom', entry: 'from_hall' },
    ],
    items: [{ at: [19, 6], materia: 'all', id: 's7_hall_all' }],
    chests: [{ at: [20, 4], item: 'ether', id: 's7_hall_ether' }],
    npcs: [
      { id: 'teacher', name: 'Instructor', model: 'man6', at: [3, 2], dir: 'down',
        talk: function* (s) {
          yield s.say('Instructor', "Welcome, welcome, to the Beginner's Hall! Knowledge is the sharpest weapon, I always say.\fWhat would you like to learn about?");
          for (let i = 0; i < 8; i++) {
            const c = yield s.ask('Instructor', 'Pick a topic.', ['The Menu', 'Materia', 'Battle and the ATB', 'Limit Breaks', 'Enemy weaknesses', "That's enough"]);
            if (c === 5) break;
            yield s.say('Instructor', LESSONS[c]);
          }
          yield s.say('Instructor', "Come back anytime. Class is always in session!");
        } },
      { id: 'dog', name: 'Dog', model: 'dog', at: [9, 4], dir: 'down', faceOnTalk: true,
        talk: function* (s) {
          yield s.say('Dog', 'Woof! Woof!');
          yield s.msg("There's a tag on its collar:\f\"THE HALL'S MASCOT. KNOWS EVERYTHING.\n  - Talk to everyone. People know things.\n  - Examine anything that looks odd.\n  - Glowing things on the ground can be picked up.\n  - Treasure chests never hurt to open.\"");
        } },
      { id: 'student1', name: 'Student', model: 'man4', at: [4, 4], dir: 'up',
        talk: function* (s) { yield s.say('Student', "Rows! Put your fragile friends in the back row. They take less damage from physical attacks...\f...but they hit weaker, too. Unless they're using something long-range, like a gun!"); } },
      { id: 'student2', name: 'Student', model: 'worker5', at: [7, 4], dir: 'up',
        talk: function* (s) { yield s.say('Student', "Fight going south? Hold L1 and R1 together and your party runs for it.\fDoesn't work on bosses, though. Learned that one the hard way."); } },
      { id: 'savegirl', name: 'Woman', model: 'woman2', at: [15, 4], dir: 'left',
        talk: function* (s) { yield s.say('Woman', "That shimmering light is a Save Point. Record your progress there as often as you like.\fAnd if you have a Tent, you can use it at a Save Point to let everyone rest."); } },
      { id: 'materiaman', name: 'Man', model: 'man9', at: [18, 5], dir: 'right',
        talk: function* (s) {
          if (!s.flag('got_s7_hall_all')) yield s.say('Man', "See that blue materia? That's All. Link it to a magic materia, and the spell hits every enemy at once!\fGo on, take it. The Hall gives one to every new student.");
          else yield s.say('Man', "Pair All with Lightning and those Shinra machines won't know what hit 'em.");
        } },
      { id: 'hallkid', name: 'Kid', model: 'kid1', at: [11, 6], dir: 'up', wander: 1,
        talk: function* (s) { yield s.say('Kid', "My big brother says the first lesson is: never skip the Beginner's Hall.\fThe second lesson is: never lend him gil."); } },
    ],
    triggers: [{ at: [1, 1], on: 'talk', run: function* (s) { yield s.msg('A chalkboard covered in diagrams: little circles in little slots, arrows, and the words "LINK THEM!!" underlined three times.'); } }],
    onEnter: function* (s) {
      if (s.flag('c2_hall_visit')) return;
      s.set('c2_hall_visit');
      s.shake(2, 14);
      s.sfx('hit');
      yield s.msg('Clunk! A treasure chest drops down from the rafters on the right.');
    },
  });

  // ================================================================== The boy's room (3F)
  FF7.defineMap('s7_kidroom', {
    name: "Boy's Room", area: 'Midgar', theme: 'house', music: 'slums',
    camera: { yaw: 35, pitch: 52, dist: 9 },   // diagonal view like 01-midgar_035 (east side open)
    grid: [
      "############### ",
      "#kk#bb#jj#wq.kk ",
      "#.............. ",
      "#..t.c......... ",
      "#.............. ",
      "#.........x.... ",
      "#^^............ ",
      "############### ",
    ],
    heights: [
      "6666666666666666",
      "6666666666666666",
      "6666666666666666",
      "6666666666666666",
      "6666666666666666",
      "6666666666666666",
      "6336666666666666",
      "6666666666666666",
    ],
    entries: { from_hall: [3, 6, 'right'] },
    exits: [{ at: [1, 6, 2, 1], to: 's7_hall', entry: 'from_3f' }],
    npcs: [{ id: 'cat', name: 'Cat', model: 'cat', at: [9, 3], dir: 'left', wander: 2, talk: function* (s) { yield s.say('Cat', 'Mrrow.'); } }],
    triggers: [
      { at: [4, 1, 2, 1], on: 'talk', run: function* (s) {
          if (!s.flag('c2_kid_paid')) { yield s.msg("A kid's bed, covered in toy robots. Better ask the owner before lying down."); return; }
          const ok = yield s.inn(0, { text: "Take a nap in the boy's bed?" });
          if (ok) { s.unset('c2_kid_paid'); yield s.msg('Everyone feels refreshed!'); }
        } },
      { at: [7, 1, 2, 1], on: 'talk', run: function* (s) { yield s.msg('A toy box. A tin SOLDIER figure with a very, very long sword sits on top.'); } },
    ],
  });

  // ================================================================== Item / materia shop
  const itemShop = function* (s) {
    const c = yield s.ask('Item Shop', "Welcome! Items or materia today?", ['Items', 'Materia', 'Nothing']);
    if (c === 0) yield s.shop('sector7_items');
    else if (c === 1) yield s.shop('sector7_materia');
    else yield s.say('Item Shop', "Come again!");
  };
  FF7.defineMap('s7_itemshop', {
    name: 'Sector 7 Item Shop', area: 'Midgar', theme: 'house', music: 'slums',
    grid: [
      "################",
      "#kkkkkk#kkkq.jj#",
      "#......#.......#",
      "#DDDDDDD.......#",
      "#..............#",
      "#.o......t.c...#",
      "#..............#",
      "#######++#######",
    ],
    entries: { from_town: [7, 6, 'up'] },
    exits: [{ at: [7, 7, 2, 1], to: 's7_town', entry: 'from_items', sfx: 'door' }],
    npcs: [
      { id: 'owner', name: 'Item Shop', model: 'woman5', at: [3, 2], dir: 'down', talk: itemShop },
      { id: 'icustomer', name: 'Customer', model: 'man7', at: [10, 4], dir: 'left',
        talk: function* (s) { yield s.say('Customer', "Fire materia's the best buy in here, trust me. Anything with fur runs screaming.\fThe rest of the magic stuff you've probably got already, right?"); } },
    ],
    objects: [{ at: [3, 3], talk: itemShop }, { at: [4, 3], talk: itemShop }],
  });

  // ================================================================== Johnny's house
  FF7.defineMap('s7_johnny', {
    name: "Johnny's House", area: 'Midgar', theme: 'house', music: 'slums',
    camera: { yaw: 35, pitch: 52, dist: 9.5 },   // diagonal view like 01-midgar_040 (east side open)
    grid: [
      "############### ",
      "#kkq...bb..bb.F ",
      "#.............. ",
      "#....t......... ",
      "#...ctc........ ",
      "#o............. ",
      "#.............. ",
      "######++####### ",
    ],
    entries: { from_town: [6, 6, 'up'] },
    exits: [{ at: [6, 7, 2, 1], to: 's7_town', entry: 'from_johnny', sfx: 'door' }],
    npcs: [
      { id: 'johnny', name: 'Johnny', model: 'johnny', at: [10, 3], dir: 'down', show: s => s.flag('c2_barret_stormed'),
        talk: function* (s) {
          if (night(s)) {
            yield s.say('johnny', "Aw, man... That big guy with the gun for an arm threw me outta 7th Heaven.\fI was THIS close to finally talkin' to Tifa, too!");
            yield s.say('johnny', "...Wait. You're that guy! Tifa's 'childhood friend'!\fHmph. Just so ya know, I've been a regular there for a whole year. So don't go gettin' any ideas.");
          } else {
            yield s.say('johnny', "Word on the street is you're headin' off somewhere with Tifa.\f......Take good care of her, got it? Or you'll have to answer to me! Johnny of Sector 7!");
          }
        } },
      { id: 'mom', name: "Johnny's Mom", model: 'woman8', at: [3, 2], dir: 'right',
        talk: function* (s) {
          if (s.flag('c2_barret_stormed')) yield s.say("Johnny's Mom", "Johnny! Stop moping and eat your dinner!\f...Don't mind him, dear. He's harmless. He's just... Johnny.");
          else yield s.say("Johnny's Mom", "Johnny's out again. At that bar, I'd bet. Every single night.");
        } },
      { id: 'dad', name: "Johnny's Dad", model: 'man1', at: [12, 5], dir: 'left',
        talk: function* (s) { yield s.say("Johnny's Dad", "Radio says a reactor blew sky-high up on the plate. Terrorists, they're calling 'em.\fCrazy times. Still... the air's a little cleaner tonight, isn't it?"); } },
    ],
    triggers: [{ at: [14, 1], on: 'talk', run: function* (s) { yield s.msg('A little stove. Something is simmering in a dented pot.'); } }],
  });
})();
