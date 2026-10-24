// Chapter 10 (part 1) — Mideel and the Highwind.
// Tifa finds Cloud at the Mideel clinic (acute Mako poisoning) and stays with him; Cid (captain of the
// Highwind since chapter 9) keeps the lead.
// On the Highwind, Cait Sith taps a Shinra meeting: they are gathering Huge Materia for a rocket.
// Mideel itself: the shops (the eccentric shopper who buys everything), the white chocobo (Contain),
// the old key and the weapon shop's back door (Curse Ring), the old man's white cat (Elixir), the inn.
// Once Corel and Fort Condor are dealt with, Ultimate WEAPON attacks Mideel, the Lifestream erupts and
// Cloud and Tifa fall into it (the Lifestream maps are in part 3). Afterwards: Mideel in ruins, Cloud
// back on his feet, and his talk with everyone on the Highwind.
// Dialogue is paraphrased in our own words (see docs/SCRIPTING.md).
(function () {
  // ------------------------------------------------------------------ helpers
  const PARTY = ['cloud', 'barret', 'tifa', 'redxiii', 'yuffie', 'caitsith', 'vincent', 'cid'];
  const counter = (at, run) => ({ at, on: 'talk', run });
  // Force `lead` to the front of the active party, keeping the others that are in it.
  function ledBy(s, lead) {
    const rest = PARTY.filter(id => id !== lead && s.inParty(id));
    s.party([lead].concat(rest).slice(0, 3));
  }
  // Party members other than the leader (spawned as actors in cutscenes).
  const mates = (s) => PARTY.filter(id => id !== s.leader() && s.inParty(id));
  function* anyone(s, lines) {
    for (const [id, text] of lines) if (s.inParty(id) || s.isMember(id)) { yield s.say(id, text); return id; }
    return null;
  }
  // Spawn cutscene copies of characters (the player is hidden). Returns the ids spawned.
  function cast(s, list) {
    list.forEach(([id, x, y, dir]) => s.spawn(id, id, x, y, dir || 'down', { name: s.name(id) }));
    return list.map(l => l[0]);
  }
  const clear = (s, ids) => ids.forEach(id => s.remove(id));
  const quakeDone = (s) => s.flag('c10_mideel_quake');
  const hmReady = (s) => s.flag('c10_corel_done') && s.flag('c10_condor_done');
  const hasHighwindMap = () => !!FF7.maps.highwind_bridge;

  const WHITE_CAT = { base: 'cat', c1: '#f4f2ee', c2: '#ffffff' };
  const WHITE_CHOCOBO = { base: 'chocobo', c1: '#f4f4f0', c2: '#dcdcd8', c3: '#f0a040' };
  const CRAZY = { base: 'woman', top: '#d04090', sleeve: '#d04090', bottom: '#f0c020', hair: '#f08020', hairStyle: 'bun', skirt: 'long', extras: ['bangles', 'earrings'] };
  const DOCTOR = { base: 'oldman', top: '#f0f0f0', sleeve: '#f0f0f0', bottom: '#5a5a60', extras: ['labcoat', 'glasses'] };
  const NURSE = { base: 'woman', top: '#f4f4f8', sleeve: '#f4f4f8', bottom: '#f4f4f8', skirt: 'long', hair: '#6a3a20', hairStyle: 'bun' };

  // ------------------------------------------------------------------ world links
  FF7.world.link('mideel', { map: 'mideel_town', entry: 'from_world', priority: 10, if: s => !s.flag('c10_mideel_quake') });
  FF7.world.link('mideel', { map: 'mideel_ruins', entry: 'from_world', priority: 10, if: s => s.flag('c10_mideel_quake') });

  // ================================================================== shared scenes
  // On the Highwind: Cait Sith's line into the Shinra meeting; Cid leads the Huge Materia hunt.
  function* briefing(s) {
    s.set('c10_briefing');
    s.music('none');
    yield s.say('caitsith', "Everyone, hush a wee minute! There's a meeting startin' up at Shinra headquarters right now.\fI've still got my ears in that building, remember? Listen in...");
    s.music('shinra');
    yield s.caption('Shinra Headquarters — the executive meeting room', { hold: 110, bg: 'rgba(0,8,20,0.92)' });
    yield s.say('Rufus', "Meteor keeps getting closer while this company sits on its hands. I want a real answer. Scarlet?");
    yield s.say('Scarlet', "Kya ha ha! The Huge Materia, Mr. President!\fEvery reactor grows a massive crystal of condensed Mako at its heart. We pull them all out, pack them into the Shinra No. 26 rocket in Rocket Town...");
    yield s.say('Scarlet', "...and fire it straight into Meteor! One big boom, and no more big rock!");
    yield s.say('Heidegger', "Gya ha ha! We've already taken Nibelheim's. My troops move on the Corel reactor and Fort Condor next.");
    yield s.say('Rufus', "Then stop talking and go get them.");
    s.music('highwind');
    yield s.say('barret', "Huge Materia...? If they go blowin' those up, that's a whole lotta the Planet's life gone for good!");
    yield* anyone(s, [['redxiii', "Materia holds the knowledge of the Ancients. To hurl it into space and shatter it... No. We cannot allow it."]]);
    yield s.say('caitsith', "The Corel reactor and Fort Condor. That's where they're headin' first.");
    yield s.say('barret', "Then we get there first! ...Tifa's lookin' after Cloud. It's on the rest of us now.");
    yield* anyone(s, [['redxiii', "Captain. The ship, and the decision, are yours."], ['yuffie', "So, uh... who's in charge? Grumpy pilot guy?"]]);
    yield s.say('cid', "Damn right I'm in charge! This is my ship, and while Cloud's laid up, I'm callin' the shots!\fShinra wants that Huge Materia at Corel and Fort Condor. We're gonna swipe it right out from under their noses!");
    yield s.say('cid', "Pick who's comin' along. Then let's move!");
    if (s.isMember('cid')) yield s.choosePArty(['cid']);
    ledBy(s, 'cid');
    yield s.msg('New objective: reach the Huge Materia at North Corel and Fort Condor before Shinra does.');
  }

  // On the Highwind, after the Lifestream: Cloud tells everyone who he really is.
  function* cloudTalk(s) {
    s.set('c10_cloud_speech');
    s.music('none');
    yield s.say('cloud', "......Everyone. I need to tell you something. About me.");
    s.music('openheart');
    yield s.say('cloud', "I was never in SOLDIER. I left Nibelheim to join, and I didn't make it. I ended up a regular Shinra grunt.\fI was so ashamed of being weak... that when Hojo's experiments scrambled my head, I filled the holes with somebody else.");
    yield s.say('cloud', "My friend Zack. He was SOLDIER, First Class. I took his stories, mixed them with what I wished I'd been... and lived inside that picture as if it were real.");
    yield s.say('cloud', "The Jenova cells, Sephiroth's voice, my own weakness... that's what made the 'Cloud' you knew.\fBut I'm done pretending. From here on, I'm just going to be me.");
    yield s.say('tifa', "......You really are a mess, Cloud.\fWelcome back.");
    yield s.say('barret', "Heh. So the real Cloud's a bigger dork than the fake one. ...I'll take him.");
    yield* anyone(s, [['redxiii', "It changes nothing. You fought beside us. That was real."]]);
    yield* anyone(s, [['yuffie', "So you're NOT a super soldier? ...Eh, you still swing that sword pretty good."], ['vincent', "......Everyone carries a past. What matters is what you do now."]]);
    yield s.say('cid', "Alright, enough sappy crap. Leader's job was givin' me an ulcer anyway. It's all yours again, Cloud.");
    yield s.say('caitsith', "About the Huge Materia... Shinra's loadin' the next batch at the Underwater Reactor below Junon.\fThey'll ship it by submarine to Rocket Town for the launch.");
    yield s.say('cloud', "Then that's where we're headed. Let's go.");
    if (s.isMember('cloud')) yield s.choosePArty(['cloud']);
    ledBy(s, 'cloud');
    yield s.msg('New objective: stop Shinra at the Underwater Reactor below Junon.');
  }

  // After the submarine: the last Huge Materia is going to Rocket Town.
  function* rocketHint(s) {
    s.set('c10_rocket_hint');
    yield s.say('caitsith', s.flag('huge_materia_underwater')
      ? "Word from inside: Shinra's still got one Huge Materia, the one they took out of Nibelheim. It's already sittin' in the rocket at Rocket Town."
      : "Bad news. That red sub's Huge Materia's been flown to Rocket Town. They're loadin' it into the rocket along with the one from Nibelheim.");
    yield s.say('cid', "My rocket... They're really gonna use MY rocket for this. ...Damn it all.\fSet a course for Rocket Town!");
  }

  // Highwind hub scenes (the bridge map belongs to chapter 9).
  FF7.patchMap('highwind_bridge', {
    onEnter: function* (s) {
      if (s.flag('c10_found_cloud') && !s.flag('c10_briefing')) { yield* briefing(s); return; }
      if (s.flag('cloud_returned') && !s.flag('c10_cloud_speech')) { yield* cloudTalk(s); return; }
      if (s.flag('c10_uw_done') && !s.flag('c10_rocket_hint') && !s.flag('huge_materia_rocket')) { yield* rocketHint(s); return; }
    },
  });

  // ================================================================== MIDEEL (before the quake)
  // refs 15-cloud06, 37, 38: weathered timber houses with tin roofs, plank walkways between them, lush
  // jungle; seen diagonally from above
  const MIDEEL_LOOK = { sky: ['#4a90d8', '#c8e8f4'], floor2: ['#8a6a44', '#82623e'], floor3: ['#8a7050', '#826848'], roof: '#8e8c84',
    grass: ['#4a8a34', '#44822e'], wood: ['#8a6a44', '#7e6040'] };
  const MIDEEL_CAM = { yaw: 30, pitch: 55, dist: 12 };
  const MIDEEL_IN = { yaw: 35, pitch: 58, dist: 10 };
  FF7.defineMap('mideel_town', {
    name: 'Mideel', area: 'Mideel', theme: 'mideel', music: 'parochial', look: MIDEEL_LOOK, camera: MIDEEL_CAM,
    grid: [
      "%TT%TT%TT%TT%TT%TT%TT%TT%TT%TT%TT%TT",
      "%hhhhhhhT%Thhhhhhhhhhhhh%TThhhhhhhTT",
      "%hhh+hhhT,Thhhhh+hhhhhhh%,Thhh+hhhTT",
      "%...K.....,....K..........,...K....T",
      "%...K..........K..............K..%.T",
      "%%..KKKKKKKKKKKKKKKKKKKKKKKKKKKK...T",
      "%.......K..f.........l......K.....,T",
      ",,......K....................K.o...T",
      "~~,.....K..hhhhhhhhhhhh......K.....T",
      "KKK.....K..hhhhhhhhhhhh......K..%..T",
      "KKKKKKKKK..hhhh+hhhhhhh..KKKKKKKKKKK",
      "~~,......K.....K.........K.........K",
      "~~,,.....K.....K....O....K.........K",
      ",~~,.....KKKKKKKKKKKKKKKKKK....,...K",
      ",,~~,..........................,...T",
      "%,~~,....%.......B.......TT........T",
      "%T,~~,,..................T.........T",
      "%TT~~,,,,.........,,,,.............T",
      "%TT%~~,,,,,,,,,,,,,TT%,,,,,,,,,,,,TT",
      "%TT%T~~TT%TT%TT%TT%TT%TT%TT%TT%TT%TT",
    ],
    lights: [[21, 6, '#fff0c0', 3]],
    entries: {
      from_world: [34, 11, 'left'], from_house: [4, 3, 'down'], from_clinic: [16, 3, 'down'], from_inn: [30, 3, 'down'],
      from_shop: [15, 11, 'down'], from_west: [3, 10, 'right'], quake: [16, 5, 'down'],
    },
    exits: [
      { at: [35, 10, 1, 4], to: 'world', loc: 'mideel' },
      { at: [0, 9, 1, 2], to: 'mideel_west', entry: 'from_town' },
      { at: [4, 2, 1, 1], to: 'mideel_house', entry: 'from_town', sfx: 'door' },
      { at: [16, 2, 1, 1], to: 'mideel_clinic', entry: 'from_town', sfx: 'door' },
      { at: [30, 2, 1, 1], to: 'mideel_inn', entry: 'from_town', sfx: 'door' },
      { at: [15, 10, 1, 1], to: 'mideel_shop', entry: 'from_town', sfx: 'door' },
    ],
    battle: null,
    npcs: [
      { id: 'gossip1', name: 'Man', model: 'man6', at: [6, 4], dir: 'right',
        talk: function* (s) {
          if (!s.flag('c10_found_cloud')) { yield s.say('Man', "You heard? A young fella washed up on the beach about a week back. Blond, spiky hair, eyes like he wasn't home.\fThe doctor's keepin' him at the clinic."); return; }
          yield s.say('Man', "That poor boy in the clinic... and that girl never leaves his side. Makes an old man's heart ache.");
        } },
      { id: 'gossip2', name: 'Man', model: 'man9', at: [7, 4], dir: 'left',
        talk: function* (s) { yield s.say('Man', "They say Mideel sits right on top of a Lifestream spring. That's why the water's warm... and why all sorts of strange things float ashore."); } },
      { id: 'fisher', name: 'Fisherman', model: 'man3', at: [3, 12], dir: 'left',
        talk: function* (s) { yield s.say('Fisherman', "Fish've been jumpy lately. The water's got a green shimmer to it some nights. Somethin's stirrin' down under the island."); } },
      { id: 'oldlady', name: 'Old Woman', model: 'oldwoman2', at: [28, 7], dir: 'down',
        talk: function* (s) { yield s.say('Old Woman', "Mideel's a sleepy town, dear. The most exciting thing that happens here is a new crate of greens for the chocobos."); } },
      { id: 'kid', name: 'Boy', model: 'kid3', at: [12, 14], dir: 'down', wander: 2,
        talk: function* (s) { yield s.say('Boy', "The doctor's dog found that man on the beach! He barked and barked till the grown-ups came. He's a hero dog!"); } },
      { id: 'greeter', name: 'Woman', model: 'woman6', at: [31, 12], dir: 'left',
        talk: function* (s) { yield s.say('Woman', "Welcome to Mideel. We haven't got much, but the air's sweet and the people are kind. Mostly."); } },
      { id: 'twoboys', name: 'Girl', model: 'girl2', at: [23, 15], dir: 'up', wander: 1,
        talk: function* (s) { yield s.say('Girl', "There's a crazy lady buying up everything in the shops! My mom says she thinks the world's ending.\f...It isn't, is it?"); } },
    ],
    objects: [
      { at: [20, 12], talk: function* (s) { yield s.msg("A stone well. The water down there is warm, and it glimmers faintly green."); } },
    ],
    onEnter: function* (s) {
      if (s.entry() === 'quake' || s.flag('c10_mideel_arrived')) return;
      s.set('c10_mideel_arrived');
      yield s.move('player', 30, 11);
      const ids = mates(s);
      ids.forEach((id, i) => s.spawn(id, id, 32 + (i % 2), 10 + i, 'left', { name: s.name(id) }));
      yield* anyone(s, [['tifa', "Red XIII said the Lifestream wells up near islands like this one...\fIf Cloud was swept away in it... he could be here. He has to be."]]);
      yield* anyone(s, [['barret', "Easy, Tifa. We'll look everywhere. Every last hut."]]);
      s.spawn('villager', 'man4', 24, 13, 'right', { name: 'Villager' });
      yield s.move('villager', 28, 12);
      yield s.say('Villager', "Lookin' for somebody? If it's a blond young fella... one washed up on our beach a week ago.\fDoc's got him at the clinic, up at the top of town. He's in bad shape, though.");
      yield* anyone(s, [['tifa', "......Cloud!"]]);
      yield s.move('villager', 24, 13);
      s.remove('villager');
      clear(s, ids);
    },
  });

  // ------------------------------------------------------------------ the clinic
  FF7.defineMap('mideel_clinic', {
    name: 'Mideel Clinic', area: 'Mideel', theme: 'house', music: 'parochial',
    look: { wall: '#d8d4c8', trim: '#8a7a60', floor: ['#b8b0a0', '#b0a898'] },
    camera: MIDEEL_IN,
    grid: [
      "#####w#####w#####w##",
      "#qqk.........b.b.b.#",
      "#......c...........#",
      "#DD................#",
      "#.D.........t......#",
      "#...........c......#",
      "#..j............f..#",
      "#########+##########",
    ],
    lights: [[8, 3, '#fff4e0', 3]],
    entries: { from_town: [9, 6, 'up'] },
    exits: [{ at: [9, 7, 1, 1], to: 'mideel_town', entry: 'from_clinic', sfx: 'door' }],
    npcs: [
      { id: 'cloud_chair', name: 'Cloud', model: 'cloud', at: [7, 2], dir: 'down', anim: 'sit', faceOnTalk: false,
        show: s => !s.flag('c10_mideel_quake'),
        talk: function* (s) {
          const lines = ["......uhh......", "...Ma... ko...... ahh......", "......Hn......... ...the... Promised......", "...Ughh... ...I... ...ahh......"];
          yield s.say('cloud', lines[s.random(lines.length)]);
          if (s.flag('c10_found_cloud')) yield s.msg("He stares at nothing. His hands tremble on the armrests of the wheelchair.");
        } },
      { id: 'tifa_nurse', name: 'Tifa', model: 'tifa', at: [8, 2], dir: 'left',
        show: s => s.flag('c10_found_cloud') && !s.flag('c10_mideel_quake'),
        talk: function* (s) { yield* tifaAtClinic(s); } },
      { id: 'doctor', name: 'Doctor', model: DOCTOR, at: [4, 3], dir: 'down',
        talk: function* (s) {
          if (!s.flag('c10_found_cloud')) { yield s.say('Doctor', "Visitors? The boy in the chair is my patient. Please keep your voices down."); return; }
          yield s.say('Doctor', "Acute Mako poisoning. He's been soaked in the stuff far past what any body should endure.\fThere's no medicine for it. Time... and that young lady's company. That's all I can prescribe.");
        } },
      { id: 'nurse', name: 'Nurse', model: NURSE, at: [15, 3], dir: 'down', wander: 1,
        talk: function* (s) { yield s.say('Nurse', s.flag('c10_found_cloud') ? "Tifa barely sleeps. She talks to him for hours... I hope he can hear her." : "Shh. The patient needs quiet."); } },
      { id: 'clinic_dog', name: 'Dog', model: 'dog', at: [5, 5], dir: 'right',
        talk: function* (s) {
          yield s.say('Dog', "Woof! Woof!");
          yield s.msg("The doctor's dog trots over to the wheelchair and rests its chin on the patient's knee.");
        } },
    ],
    objects: [
      { at: [1, 1], talk: function* (s) { yield s.msg("A medicine cabinet. Bottles of ointment, bandages... nothing for Mako."); } },
      { at: [3, 1], talk: function* (s) { yield s.msg("Medical books, dog-eared. 'Mako Exposure: Symptoms and Prognosis.' The prognosis chapter is short."); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c10_found_cloud')) return;
      yield* findCloud(s);
    },
  });

  // Tifa finds Cloud. Tifa stays; Cid leads from here.
  function* findCloud(s) {
    s.hide('player');
    s.music('none');
    const ids = cast(s, [['tifa', 9, 6, 'up'], ['barret', 8, 6, 'up'], ['cid', 10, 6, 'up']]);
    yield s.fadeIn(10);
    yield s.run('tifa', 8, 3);
    yield s.face('tifa', 'left');
    s.music('despair');
    yield s.say('tifa', "Cloud!! ...Cloud, it's me! It's Tifa!");
    yield s.say('cloud', "......uhh...... ...ahh......");
    yield s.say('tifa', "Cloud...? Look at me. Please... say something...");
    yield s.say('cloud', "...Mako... ...ughh......");
    s.anim('tifa', 'kneel');
    yield 40;
    yield s.say('tifa', "......No...... Cloud......");
    yield [s.move('barret', 7, 5), s.move('cid', 9, 5)];
    yield s.face('doctor', 'barret');
    yield s.say('Doctor', "You know this young man? ...Then I'm sorry you have to see him like this.\fHe's suffering from acute Mako poisoning. He's been saturated with it — more than a human mind can hold.");
    yield s.say('Doctor', "Mako is full of knowledge. Too much of it all at once, and a person drowns in it. He can't tell who he is anymore, or where he is.\fI can't promise he'll ever come back.");
    yield s.say('cid', "......Damn.");
    yield s.say('barret', "Tifa... Listen. You sure that's really Cloud? Not... one of Sephiroth's copies or somethin'?");
    s.stopAnim('tifa');
    yield s.face('tifa', 'barret');
    yield s.say('tifa', "......It's him. It's Cloud. I know it is.");
    yield s.say('tifa', "I'm staying here, Barret. I'll look after him.\fI'm sorry... I know Meteor's still up there. But right now, I just can't leave him.");
    yield s.say('barret', "......Yeah. I figured.");
    yield s.say('cid', "Then it's settled. Leave the flyin' to me, Tifa. You take care of 'im.");
    yield s.say('tifa', "Thank you... all of you.");
    yield s.face('tifa', 'left');
    s.anim('tifa', 'kneel');
    yield [s.move('barret', 9, 6), s.move('cid', 9, 6)];
    s.leave('tifa');
    ledBy(s, 'cid');
    s.set('c10_found_cloud');
    clear(s, ids);
    s.music('highwind');
    yield s.caption("Tifa stayed behind in Mideel with Cloud.\nThe others returned to the Highwind.", { hold: 150, bg: '#000' });
    if (hasHighwindMap()) { yield s.goto('highwind_bridge', 'from_world'); return; }
    // (chapter 9's Highwind isn't available: hold the meeting right here)
    s.show('player', 9, 6, 'up');
    yield* briefing(s);
  }

  function* tifaAtClinic(s) {
    if (!s.flag('c10_briefing')) { yield s.say('tifa', "Go on, everyone. I'll be fine here with Cloud."); return; }
    if (!hmReady(s)) {
      yield s.say('tifa', "No change. The doctor says not to expect much... but I keep talking to him anyway.\fSometimes his eyes move when I mention Nibelheim. I think some part of him is listening.");
      if (s.flag('c10_corel_done') || s.flag('c10_condor_done')) yield s.say('tifa', "You got to the Huge Materia? ...Good. Please be careful out there.");
      return;
    }
    yield* ultimateAttack(s);
  }

  // ------------------------------------------------------------------ Ultimate WEAPON attacks Mideel
  function* ultimateAttack(s) {
    yield s.say('tifa', "You're back... Cloud's still the same.\fI've been telling him all about Nibelheim. The mountains, the water tower... He just stares. But I won't give up.");
    s.music('none');
    s.shake(3, 90);
    s.sfx('alarm_long');
    yield 40;
    yield s.say('Nurse', "W-what's happening!? The floor's shaking!");
    yield s.say('Doctor', "Earthquake! Everyone out of the building, now!");
    yield s.say('tifa', "I've got Cloud! Go!");
    s.set('c10_mideel_quake');
    yield s.goto('mideel_town', 'quake');
    s.hide('player');
    const lead = s.leader();
    const crew = [lead].concat(mates(s)).slice(0, 3);
    crew.forEach((id, i) => s.spawn(id, id, 15 + i, 4, 'down', { name: s.name(id) }));
    s.spawn('villagerA', 'man6', 10, 6, 'right', { name: 'Villager' });
    s.spawn('villagerB', 'woman6', 24, 6, 'left', { name: 'Villager' });
    yield [s.run('villagerA', 2, 11, { noWait: true }), s.run('villagerB', 34, 11, { noWait: true }), s.move(crew[0], 15, 6), s.move(crew[1] || crew[0], 17, 6)];
    s.music('weaponraid');
    yield s.movie('ultimate_weapon', { text: 'A shriek tears across the sky.\nSomething vast and white drops out of the clouds over Mideel,\nwings spread wide... Ultimate WEAPON.' });
    s.remove('villagerA'); s.remove('villagerB');
    s.spawn('uweapon', { enemy: 'ultimate_weapon', scale: 0.7 }, 16, 12, 'up', { name: 'Ultimate WEAPON' });
    s.shake(5, 40);
    yield s.say('cid', "What the hell is THAT!?");
    yield* anyone(s, [['barret', "One of them WEAPONs! Here!?"], ['redxiii', "A WEAPON... The Planet's own guardian... Why here!?"]]);
    yield s.say('cid', "Don't matter why! It's gonna flatten the whole town! Let's take it on!");
    const r = yield s.battle({ enemies: ['ultimate_weapon'], bg: 'mideel', music: 'weaponraid', noEscape: true });
    s.shake(4, 60);
    yield s.msg("Ultimate WEAPON beats its wings and climbs into the sky, trailing a scream that shakes the palm trees.");
    s.remove('uweapon');
    yield s.say('cid', "It's runnin'!? ...No. Somethin's wrong. The ground's still shakin'!");
    s.shake(6, 150);
    s.flash('#80ffb0', 30, 0.7);
    yield s.say('Villager', "The Lifestream! It's bursting out of the ground! RUN!");
    // Tifa pushes Cloud out of the clinic
    s.spawn('tifa', 'tifa', 16, 3, 'down', { name: s.name('tifa') });
    s.spawn('cloudw', 'cloud', 17, 3, 'down', { name: s.name('cloud'), anim: 'sit' });
    yield s.say('tifa', "Cloud, hang on! We have to get out of here...!");
    s.flash('#a0ffc0', 40, 0.9);
    s.shake(8, 60);
    yield s.say(crew[0] === 'cid' ? 'cid' : crew[0], "TIFA!!");
    yield s.say('tifa', "Aaahh!!");
    yield s.fadeOut(20, '#40ff90');
    s.remove('tifa'); s.remove('cloudw');
    crew.forEach(id => s.remove(id));
    s.music('none');
    yield s.movie('lifestream_fall', { text: 'The earth splits wide open beneath the clinic.\nA torrent of glowing green rushes up...\nand Tifa and Cloud vanish into the Lifestream.' });
    yield s.goto('lifestream_void', 'start');
  }

  // ------------------------------------------------------------------ the old man's house (white cat, Elixir)
  FF7.defineMap('mideel_house', {
    name: 'Mideel', area: 'Mideel', theme: 'house', music: 'parochial',
    look: { wall: '#b09878', trim: '#6a5030', floor: ['#8a6a44', '#82623e'] },
    camera: MIDEEL_IN,
    grid: [
      "################",
      "#kk..F....q.bb.#",
      "#..............#",
      "#..t.c.........#",
      "#..t........jj.#",
      "#..............#",
      "#o.............#",
      "#######+########",
    ],
    lights: [[5, 2, '#ffb060', 3]],
    entries: { from_town: [7, 6, 'up'] },
    exits: [{ at: [7, 7, 1, 1], to: 'mideel_town', entry: 'from_house', sfx: 'door' }],
    npcs: [
      { id: 'oldman', name: 'Old Man', model: 'oldman2', at: [7, 3], dir: 'left',
        talk: function* (s) {
          if (s.flag('c10_elixir')) { yield s.say('Old Man', "Heh heh. Snowball's forgiven you. She's napping on my slipper now instead."); return; }
          yield s.say('Old Man', "That's Snowball, my cat. She drags all sorts of shiny things home and sleeps on them like a dragon on its treasure.\fDon't let the white fur fool you. She bites.");
        } },
      { id: 'snowball', name: 'White Cat', model: WHITE_CAT, at: [6, 2], dir: 'down', faceOnTalk: false,
        talk: function* (s) {
          if (s.flag('c10_elixir')) { yield s.say('White Cat', "Mrrr...♪"); return; }
          yield s.msg("A fluffy white cat is curled up in front of the fireplace. Something glints underneath her.");
          const c = yield s.ask(null, "What do you do?", ['Scratch her chin', 'Slide the thing out from under her', 'Leave her be']);
          if (c === 2) return;
          if (c === 0) {
            yield s.say('White Cat', "Purrrr......♪");
            yield s.msg("The cat stretches luxuriously, rolls over... and the shiny thing rolls right out from under her.");
            s.set('c10_elixir');
            yield s.give('elixir');
            yield s.say('Old Man', "Well, I'll be. She never lets anyone touch her. You've got a gift, stranger. Keep it — she'd only sleep on it.");
          } else {
            yield s.say('White Cat', "FSSSHHH!!");
            s.sfx('hit'); s.shake(1, 10);
            yield s.msg("The cat swats your hand, then stalks off in a huff... leaving her treasure behind.");
            s.set('c10_elixir');
            yield s.give('elixir');
            yield s.say('Old Man', "Ha ha! Told you she bites. Go on, take it. You've paid for it in blood.");
          }
          s.face('snowball', 'right');
        } },
    ],
    objects: [
      { at: [5, 1], talk: function* (s) { yield s.msg("A small fireplace. The coals are warm and smell faintly of sweet wood."); } },
      { at: [1, 1], talk: function* (s) { yield s.msg("Old fishing almanacs and a book titled 'Cats: Why They Hate You'."); } },
    ],
  });

  // ------------------------------------------------------------------ the inn
  FF7.defineMap('mideel_inn', {
    name: 'Mideel Inn', area: 'Mideel', theme: 'house', music: 'parochial',
    look: { wall: '#c0a880', trim: '#6a5030' },
    camera: MIDEEL_IN,
    grid: [
      "####w######w####",
      "#b.b.b...kk..q.#",
      "#..............#",
      "#.........DD...#",
      "#..t.c........j#",
      "#..............#",
      "#b.b..........q#",
      "######+#########",
    ],
    lights: [[10, 2, '#ffe0a0', 3]],
    entries: { from_town: [6, 6, 'up'] },
    exits: [{ at: [6, 7, 1, 1], to: 'mideel_town', entry: 'from_inn', sfx: 'door' }],
    npcs: [
      { id: 'innkeep', name: 'Innkeeper', model: 'woman8', at: [11, 2], dir: 'down' },
      { id: 'inn_guest', name: 'Traveler', model: 'man10', at: [4, 4], dir: 'right', anim: 'sit',
        talk: function* (s) { yield s.say('Traveler', "I came here to get away from the news. Meteor this, WEAPON that. Mideel doesn't even get a newspaper. Bliss."); } },
    ],
    triggers: [
      counter([10, 3, 2, 1], function* (s) {
        yield s.inn(100, { who: 'Innkeeper', text: "Welcome! A soft bed and the sound of the sea, 100 Gil a night. Will you stay?" });
      }),
    ],
  });

  // ------------------------------------------------------------------ the shops (items, materia, weapons)
  function* crazyShopper(s) {
    if (!s.flag('c10_crazy_met')) {
      s.set('c10_crazy_met');
      yield s.say('Eccentric Woman', "Out of my way, out of my way! I'm buying one of everything! No — TWO of everything!\fMeteor's coming, don't you know? When the stores are all gone, who'll have the goods? ME, that's who!");
      yield s.say('Eccentric Woman', "Potions from the item counter, swords from the weapon counter, materia from the materia counter... Oh, and greens for my baby!");
      yield s.say('Eccentric Woman', "If the world doesn't end, maybe I'll sell it all back to you. At a markup! Hoo hoo hoo!");
      return;
    }
    yield s.say('Eccentric Woman', "Have you seen my baby? White, fluffy, never sits still? Don't you DARE scare him!");
  }
  function* whiteChocobo(s) {
    if (s.flag('c10_contain')) { yield s.say('White Chocobo', "Wark! ♪"); yield s.msg("The white chocobo nuzzles you happily."); return; }
    yield s.msg("A small white chocobo, darting restlessly around the room.");
    const c = yield s.ask(null, "", ['Feed it', 'Scratch behind its ears', 'Leave it alone']);
    if (c === 2) return;
    if (c === 0) {
      if (s.flag('c10_choco_fed')) { yield s.msg("It's already munching happily. It looks at you expectantly... maybe it wants a scratch?"); return; }
      if (!s.has('mimett_greens')) { yield s.say('White Chocobo', "Wark...?"); yield s.msg("It sniffs your hands, finds nothing it likes, and dashes off. It seems to want some kind of greens."); return; }
      s.take('mimett_greens');
      s.set('c10_choco_fed');
      yield s.msg("You hold out a bunch of Mimett Greens. The chocobo stops dead... and gobbles them up in three bites.");
      yield s.say('White Chocobo', "Wark wark! ♪");
      return;
    }
    if (!s.flag('c10_choco_fed')) { yield s.msg("It skitters out of reach before you can touch it."); return; }
    yield s.msg("You scratch gently behind its ear. The chocobo closes its eyes and trills with delight...");
    yield s.say('White Chocobo', "Kweeeh~ ♪");
    yield s.msg("...and something drops out of its feathers onto the floor!");
    s.set('c10_contain');
    yield s.giveMateria('contain');
  }
  function* backDoor(s) {
    if (s.flag('c10_curse_ring')) { yield s.msg("The back door hangs open. Inside: a dusty storeroom of old junk. Nothing else of value."); return; }
    if (!s.flag('c10_key_broken')) {
      if (!s.flag('c10_old_key')) { s.set('c10_backdoor'); yield s.msg("A heavy door at the back of the weapon shop. It's locked tight."); return; }
      const c = yield s.ask(null, "A locked door. Try the beat-up old key you found?", ['Try the key', 'Leave it']);
      if (c !== 0) return;
      s.sfx('error');
      s.set('c10_key_broken');
      yield s.msg("*Snap!*\nThe key breaks off in the lock!");
    }
    s.spawn('wkeep_run', 'man8', 15, 1, 'right', { name: 'Weapon Seller' });
    s.hide('wkeep');
    yield s.move('wkeep_run', 20, 1);
    yield s.face('wkeep_run', 'player');
    yield s.say('Weapon Seller', "Hey! What are you doing back there with my door!?");
    const c2 = yield s.ask(null, "", ['Tell the truth', 'Play dumb']);
    if (c2 !== 0) {
      yield s.say(s.leader(), "...Door? What door?");
      yield s.say('Weapon Seller', "Hmph. Something's jammed in my lock, and you're standing right next to it. Think about that.");
    } else {
      yield s.say(s.leader(), "I found an old key out on the walkway and tried it in the lock. It snapped. ...Sorry.");
      yield s.say('Weapon Seller', "......Ha! Ha ha ha! That old key? I lost that years ago and figured the sea had it.\fAnd you came right out and told me. Honest folks are rare these days.");
      yield s.say('Weapon Seller', "Tell you what. There's a ring in that storeroom I never managed to sell. Nobody wanted it — they say it's cursed.\fBut it's a powerful thing. Take it, for your honesty.");
      s.set('c10_curse_ring');
      yield s.give('curse_ring');
      yield s.say('Weapon Seller', "Just... don't wear it too long in a fight, if you catch my meaning.");
    }
    yield s.move('wkeep_run', 15, 1);
    s.remove('wkeep_run');
    s.show('wkeep');
  }

  FF7.defineMap('mideel_shop', {
    name: 'Mideel Shops', area: 'Mideel', theme: 'house', music: 'parochial',
    look: { wall: '#b8a07a', trim: '#6a4a2a', floor: ['#8a6a44', '#82623e'] },
    camera: MIDEEL_IN,
    grid: [
      "#####################+####",
      "#q.j.k#k.j.q#k..j...:...q#",
      "#DDDDD#DDDDD#DDDDD..:....#",
      "#...................:....#",
      "#..t.c.......c.t....:....#",
      "#....................B...#",
      "#..jj................o...#",
      "############+#############",
    ],
    lights: [[9, 3, '#ffe0a0', 3], [20, 3, '#ffe0a0', 2]],
    entries: { from_town: [12, 6, 'up'] },
    exits: [{ at: [12, 7, 1, 1], to: 'mideel_town', entry: 'from_shop', sfx: 'door' }],
    npcs: [
      { id: 'ikeep', name: 'Item Seller', model: 'woman4', at: [2, 1], dir: 'down' },
      { id: 'mkeep', name: 'Materia Seller', model: 'man5', at: [8, 1], dir: 'down' },
      { id: 'wkeep', name: 'Weapon Seller', model: 'man8', at: [15, 1], dir: 'down' },
      { id: 'crazy', name: 'Eccentric Woman', model: CRAZY, at: [18, 4], dir: 'left', talk: crazyShopper },
      { id: 'wchoco', name: 'White Chocobo', model: WHITE_CHOCOBO, at: [9, 5], dir: 'down', wander: 3, talk: whiteChocobo },
    ],
    triggers: [
      counter([1, 2, 5, 1], function* (s) { yield s.say('ikeep', "Welcome! Potions, remedies, tents... everything for the road."); yield s.shop('mideel_items'); }),
      counter([7, 2, 5, 1], function* (s) { yield s.say('mkeep', "Materia, fresh from the mainland. Mind the lady in the hat — she's been trying to buy my whole stock."); yield s.shop('mideel_materia'); }),
      counter([13, 2, 5, 1], function* (s) { yield s.say('wkeep', "Crystal weapons! Finest edge you'll find on any island. Have a look."); yield s.shop('mideel_weapons'); }),
      { at: [21, 0], on: 'talk', run: backDoor },
    ],
    onLoad: function (s) { s.block(21, 0); },
  });

  // ------------------------------------------------------------------ the west walkway: accessory stall and the old key
  function* accessoryStall(s) {
    yield s.say('akeep', "Rings, capes, charms! Protect yourselves out there — the world's gone mad.");
    yield s.shop('mideel_accessories');
  }
  FF7.defineMap('mideel_west', {
    name: 'Mideel', area: 'Mideel', theme: 'mideel', music: 'parochial', look: MIDEEL_LOOK, camera: MIDEEL_CAM,
    grid: [
      "%TT%TT%TT%TT%TT%TT%TT%TT%TT%",
      "%T~~~hhhhhhh~~~%TT%TT%TT%TT%",
      "%~~~~hhhhhhh~~~~,,,,,,,,,TT%",
      "%~~KKKKKKKKKKK~~,,,%,,,,,,T%",
      "%~~K~~~~~~~~~K~~,,,,,,,,,,,%",
      "%~~K~~~~~~~~~KKKK,,,,,,,,,,,",
      "%~~K~~~~~~~~~K~~,,,,,f,,,,,,",
      "%~~KKKKKKKKKKK~~,,,,,,,,,,,%",
      "%~~~~~~~~~~~~~~~,,,T,,,,,,T%",
      "%T~~~~~~~~~~~~~,,,,,,,,,,,T%",
      "%TT%TT%TT%TT%TT%TT%TT%TT%TT%",
    ],
    entries: { from_town: [25, 5, 'left'] },
    exits: [
      // (the destination is picked before the call: the runner's route finder reads the map ids quoted in s.goto(...))
      { at: [27, 5, 1, 2], run: function* (s) { const ruins = quakeDone(s); yield s.goto(ruins ? 'mideel_ruins' : 'mideel_town', 'from_west'); } },
    ],
    npcs: [
      { id: 'akeep', name: 'Accessory Seller', model: 'woman7', at: [6, 3], dir: 'down', talk: accessoryStall },
      // on the shore at the end of the lower walkway (sitting on the one-tile walkway, he cut off the squeaky plank)
      { id: 'angler', name: 'Old Fisherman', model: 'oldman3', at: [16, 7], dir: 'left', anim: 'sit',
        talk: function* (s) {
          if (quakeDone(s)) { yield s.say('Old Fisherman', "The whole middle of town just... fell into the green. And here I sit, still fishing. What else is an old man to do?"); return; }
          yield s.say('Old Fisherman', "Careful on these planks. Some of 'em squeak like a mouse when you step on 'em.\fI dropped something through the boards years ago. Never did find it.");
        } },
    ],
    triggers: [
      { at: [9, 7], run: function* (s) {
          if (s.flag('c10_old_key')) return;
          s.sfx('error');
          yield s.msg("*Creeeak...*\nThe plank squeaks loudly underfoot.");
          if (!s.flag('c10_backdoor')) return;
          const c = yield s.ask(null, "One of the boards is loose. Look underneath?", ['Look', 'Leave it']);
          if (c !== 0) return;
          s.set('c10_old_key');
          s.sfx('found');
          yield s.msg("Wedged between the planks: a rusty, beat-up old key. It looks about ready to fall apart.\n(Received \"Beat-up Old Key\")");
        } },
    ],
  });

  // ================================================================== MIDEEL (after the quake)
  function* crazySeller(s) {
    const opts = [];
    if (s.flag('c10_crazy_met')) opts.push(['Items', 'mideel_items'], ['Weapons', 'mideel_weapons'], ['Materia', 'mideel_materia']);
    if (!opts.length) {
      yield s.say('Eccentric Woman', "Everything's gone, everything! Good thing I stocked up. ...Not that I'd sell to strangers I've never even met. Hmph!");
      return;
    }
    yield s.say('Eccentric Woman', "See? SEE!? The shops are swallowed up, and who has the goods? Me! Hoo hoo hoo!\fYou were nice to me before, so I'll sell. Same price the shops charged. I'm generous like that.");
    const c = yield s.ask('Eccentric Woman', "What'll it be?", opts.map(o => o[0]).concat(['Nothing']));
    if (c < opts.length) yield s.shop(opts[c][1]);
  }
  FF7.defineMap('mideel_ruins', {
    name: 'Mideel', area: 'Mideel', theme: 'mideel', music: 'parochial',
    look: { sky: ['#5a88b8', '#c0d8e0'], mako: '#70ffb0' },
    grid: [
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
      "ThxhhxhhTT*************TTThhxhhhhTTT",
      "Tx.x..xhT***************ThhhxhxhhhTT",
      "T..x....,***************,x...x....TT",
      "T.......,,*************,,....x....%T",
      "T%..:.....x***********x.........:..T",
      "T...:......xx*******xx.....DD...:..T",
      ",,..:...........***.............:..T",
      "~~,.:...x..................x....:..T",
      "KKK.:.......................DD..:..T",
      "KKK::::::::..x..........::::::::::::",
      "~~,......:......x..........x.......:",
      "~~,,.....:.............x...........:",
      ",~~,.....::::::::::::::::::....,...:",
      ",,~~,.............x...........,....T",
      "T,~~,....%.......x.......TT........T",
      "TT,~~,,..................T.........T",
      "TTT~~,,,,.........,,,,.............T",
      "TTTT~~,,,,,,,,,,,,,TTT,,,,,,,,,,,,TT",
      "TTTTT~~TTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    ],
    lights: [[16, 4, '#80ffb0', 6]],
    entries: { from_world: [34, 11, 'left'], from_west: [3, 10, 'right'], washed: [17, 9, 'down'] },
    exits: [
      { at: [35, 10, 1, 4], to: 'world', loc: 'mideel' },
      { at: [0, 9, 1, 2], to: 'mideel_west', entry: 'from_town' },
    ],
    npcs: [
      { id: 'r_crazy', name: 'Eccentric Woman', model: CRAZY, at: [5, 6], dir: 'right', talk: crazySeller },
      { id: 'r_wchoco', name: 'White Chocobo', model: WHITE_CHOCOBO, at: [6, 9], dir: 'down', wander: 2, talk: whiteChocobo },
      { id: 'r_ikeep', name: 'Item Seller', model: 'woman4', at: [27, 5], dir: 'down' },
      { id: 'r_mkeep', name: 'Materia Seller', model: 'man5', at: [29, 8], dir: 'down' },
      { id: 'r_doctor', name: 'Doctor', model: DOCTOR, at: [21, 12], dir: 'up',
        talk: function* (s) { yield s.say('Doctor', "My clinic, my instruments... all of it, gone into the Lifestream. But everyone got out. Everyone but those two... and they came back.\fI've never seen anything like it. That boy walked out of the green on his own two feet."); } },
      { id: 'r_nurse', name: 'Nurse', model: NURSE, at: [23, 13], dir: 'left',
        talk: function* (s) { yield s.say('Nurse', "We'll rebuild. The people of Mideel are stubborn. ...The dog's already dug himself a new bed."); } },
      { id: 'r_dog', name: 'Dog', model: 'dog', at: [22, 14], dir: 'up', talk: function* (s) { yield s.say('Dog', "Woof!"); } },
      { id: 'r_oldman', name: 'Old Man', model: 'oldman2', at: [6, 13], dir: 'right',
        talk: function* (s) { yield s.say('Old Man', "My house went down with the rest. But look who I found sitting on the rubble, fussing with her fur like nothing happened."); } },
      { id: 'r_cat', name: 'White Cat', model: WHITE_CAT, at: [7, 14], dir: 'left', talk: function* (s) { yield s.say('White Cat', "Mrrrow."); } },
      { id: 'r_villager', name: 'Villager', model: 'man6', at: [30, 12], dir: 'left',
        talk: function* (s) { yield s.say('Villager', "That WEAPON thing shook the ground so hard the Lifestream came pouring up. Half the town's just... gone.\fStill, we're alive. That counts for something."); } },
      { id: 'r_fisher', name: 'Fisherman', model: 'man3', at: [3, 12], dir: 'left',
        talk: function* (s) { yield s.say('Fisherman', "Don't go near that green pool. It hums. You can almost hear voices in it."); } },
    ],
    triggers: [
      counter([27, 6, 2, 1], function* (s) { yield s.say('r_ikeep', "We saved what we could carry. It isn't much."); yield s.shop('mideel_items_after'); }),
      counter([28, 9, 2, 1], function* (s) { yield s.say('r_mkeep', "Only the basics left, I'm afraid. The rest is somewhere down in that glowing hole."); yield s.shop('mideel_materia_after'); }),
      { at: [16, 7, 3, 1], on: 'talk', run: function* (s) { yield s.msg("A pool of raw Lifestream fills the crater where the clinic stood. It glows and murmurs softly."); } },
    ],
    onEnter: function* (s) {
      if (s.entry() !== 'washed' || s.flag('cloud_returned')) return;
      yield* cloudReturns(s);
    },
  });

  // Cloud and Tifa surface in the ruins. Cloud is himself again.
  function* cloudReturns(s) {
    s.hide('player');
    s.music('none');
    s.spawn('cloud', 'cloud', 16, 9, 'down', { name: s.name('cloud'), anim: 'lie' });
    s.spawn('tifa', 'tifa', 18, 9, 'down', { name: s.name('tifa'), anim: 'lie' });
    yield s.fadeIn(40);
    yield 60;
    const helpers = PARTY.filter(id => id !== 'cloud' && id !== 'tifa' && s.inParty(id));
    helpers.forEach((id, i) => s.spawn(id, id, 30 + i, 11 + i, 'left', { name: s.name(id) }));
    yield* anyone(s, [['cid', "Over here! By the edge of the green! ...It's them!"]]);
    yield helpers.map((id, i) => s.run(id, 15 + i * 2, 11));
    s.stopAnim('tifa');
    s.anim('tifa', 'kneel');
    yield 30;
    yield s.say('tifa', "......Ngh...... Cloud...?");
    s.stopAnim('cloud');
    yield s.face('cloud', 'tifa');
    yield s.say('cloud', "......Tifa. ...I'm back.");
    s.music('openheart');
    yield s.say('cloud', "I'm sorry I made you wait. ...Thanks for coming to get me.");
    s.stopAnim('tifa');
    yield s.face('tifa', 'cloud');
    yield s.say('tifa', "......Cloud!");
    yield* anyone(s, [['barret', "Cloud!? Hell... He's talkin' like a normal person! You're really back, man!"]]);
    yield* anyone(s, [['cid', "Well, I'll be damned. Took yer sweet time, didn't ya?"]]);
    yield s.say('cloud', "Everyone... there's something I have to tell you. All of you.\fLet's go back to the ship.");
    s.join('cloud');
    s.join('tifa');
    s.set('cloud_returned');
    s.unset('cloud_missing');
    ledBy(s, 'cloud');
    clear(s, helpers);
    s.remove('cloud'); s.remove('tifa');
    s.menu(true);
    s.phs(true);
    if (hasHighwindMap()) { yield s.goto('highwind_bridge', 'from_world'); return; }
    s.show('player', 17, 9, 'down');
    yield* cloudTalk(s);
  }
})();
