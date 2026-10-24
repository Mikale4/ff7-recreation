// Extra (not in the PS1 game; Config > Turks Join): Reno, Rude and Elena join the group in Disc 3 - only if the party
// beat them in the Sector 8 underground ("Let's settle this" and a win: c11a_turks_fought; skipping them closes it).
//   1. After that fight they leave without a threat: orders come from nobody now (js/maps/c11a/part2.js).
//   2. Disc 3, Wutai's Turtle's Paradise: the three are back at their table. A Shinra medevac went down on Da-chao the
//      night the Temple fell, with a wounded Turk aboard; holdouts guard the wreck. Cloud agrees to help.
//   3. Da-chao: holdout SOLDIERs on the way up (the base, the ledge); on the summit the Holdout Panzer. The wreck: an
//      empty stretcher, Tseng's ID, a transfer order signed "R." (Tseng stays unresolved), Tseng's case: a weapon each.
//   4. The Highwind: Barret confronts Reno over Sector 7. Reno owns it; Barret agrees for the Planet, not for him.
//      Reno, Rude and Elena join the group (the PHS; they level with the party). Afterwards they stand on the bridge
//      when not in the party, and Wutai's weapon seller keeps their weapons (shop wutai_turks_weapons).
// Flags: tk_bar (the quest taken), tk_dc1, tk_dc2 (the ambushes), tk_boss (the Panzer), tk_case (the wreck searched),
// tk_joined. (Dialogue original; see docs/SCRIPTING.md.)
(function () {
  const ON = () => FF7.state.config.turksJoin !== false;
  const OPEN = (s) => ON() && s.flag('c11a_turks_fought') && s.flag('disc3') && !s.flag('tk_joined');
  const QUEST = (s) => OPEN(s) && s.flag('tk_bar');
  FF7.story.tk_open = OPEN;
  function* chime(s, lines) {   // the first of these who is in the party says their line
    for (const [id, text] of lines) if (id === 'cloud' || s.inParty(id)) { yield s.say(id, text); return id; }
    return null;
  }

  // ------------------------------------------------------------------ 2. the Turtle's Paradise
  FF7.story.tk_bar = function* (s) {
    if (s.flag('tk_bar')) {
      yield s.say('reno', s.flag('tk_boss') ? "Hey. Figure out that order yet? ...Yeah, me neither." : "The wreck's at the top of Da-chao, north of town. We'll meet you up there, yo.");
      return;
    }
    yield s.say('reno', "Well, well. Look who it is. Relax, Spiky. Nobody's payin' us to fight you anymore.");
    yield s.say('elena', "Cloud... Can we ask you something?\fThe night the Temple of the Ancients fell, a Shinra medevac went down on Da-chao, north of here. The flight log said they were carrying a wounded Turk.");
    yield s.say('rude', "......Tseng.");
    yield s.say('elena', "Maybe! It has to be! But Shinra holdouts are still guarding the wreck. SOLDIERs, and some kind of tank.");
    yield s.say('reno', "Three of us against a squad of SOLDIERs? Even I can do that math.\f...So. You in or not?");
    const c = yield s.ask('cloud', '', ["We'll help.", 'Not now.']);
    if (c !== 0) { yield s.say('reno', "Figured. Offer stands. We ain't goin' anywhere."); return; }
    s.set('tk_bar');
    yield s.say('reno', "Heh. Knew you were a softie. We'll head up first and keep 'em busy at the top.");
    yield s.say('elena', "Thank you. Really.");
    yield* chime(s, [['barret', "......Workin' with the Turks. Again. This better be worth it."], ['tifa', "......All right. For Tseng's sake, if he's alive."], ['cid', "Tch. Fine. Let's make it quick."]]);
  };
  FF7.patchMap('wutai_turtle', {
    npcs: [
      { id: 'tk_reno', name: 'Reno', model: 'reno', at: [14, 4], dir: 'down', anim: 'sit', show: s => OPEN(s) && !s.flag('tk_bar'), talk: function* (s) { yield* FF7.story.tk_bar(s); } },
      { id: 'tk_rude', name: 'Rude', model: 'rude', at: [16, 4], dir: 'down', anim: 'sit', show: s => OPEN(s) && !s.flag('tk_bar'), talk: function* (s) { yield* FF7.story.tk_bar(s); } },
      { id: 'tk_elena', name: 'Elena', model: 'elena', at: [15, 5], dir: 'down', show: s => OPEN(s) && !s.flag('tk_bar'), talk: function* (s) { yield* FF7.story.tk_bar(s); } },
    ],
  });

  // ------------------------------------------------------------------ 3. Da-chao
  function* ambush(s, flag, spots, enemies, line) {
    s.set(flag);
    s.sfx('shot2');
    spots.forEach(([x, y], i) => s.spawn('tk_grunt' + i, 'soldier', x, y, 'down', { name: 'SOLDIER' }));
    yield s.say('SOLDIER', line);
    yield s.battle({ enemies, bg: 'wutai', noEscape: true });
    spots.forEach((_, i) => s.remove('tk_grunt' + i));
  }
  FF7.patchMap('wutai_dachao_base', {
    onEnter: function* (s) {
      if (!QUEST(s) || s.flag('tk_dc1')) return;
      yield* ambush(s, 'tk_dc1', [[15, 11], [17, 11]], ['soldier_1st', 'soldier_1st'], "Halt! This mountain is a Shinra restricted zone! ......Hey, that's the ex-SOLDIER on the wanted posters!");
    },
  });
  FF7.patchMap('wutai_dachao_ledge', {
    onEnter: function* (s) {
      if (!QUEST(s) || s.flag('tk_dc2') || !s.flag('tk_dc1')) return;
      yield* ambush(s, 'tk_dc2', [[16, 7], [18, 7]], ['gun_carrier', 'soldier_1st', 'soldier_1st'], "They got past the lower post! Bring up the Carrier!");
    },
  });
  FF7.patchMap('wutai_dachao_top', {
    onEnter: function* (s) {
      if (!QUEST(s) || s.flag('tk_boss')) return;
      yield* FF7.story.tk_summit(s);
    },
  });
  FF7.story.tk_summit = function* (s) {
    s.music('turks');
    s.spawn('tk_reno', 'reno', 12, 5, 'right', { name: 'Reno' });
    s.spawn('tk_rude', 'rude', 17, 5, 'left', { name: 'Rude' });
    s.spawn('tk_elena', 'elena', 14, 6, 'up', { name: 'Elena' });
    s.spawn('tk_g1', 'soldier', 13, 3, 'down', { name: 'SOLDIER' });
    s.spawn('tk_g2', 'soldier', 16, 3, 'down', { name: 'SOLDIER' });
    s.sfx('shot3'); s.shake(2, 20);
    yield s.move('player', 14, 8);
    yield s.say('reno', "About time! These guys don't know when to quit!");
    s.anim('tk_rude', 'attack'); s.sfx('hit');
    yield 16;
    s.remove('tk_g1');
    yield s.say('rude', "......One down.");
    s.sfx('fire2'); s.shake(4, 40);
    yield s.say('elena', "Behind the wreck! They've still got the tank running!");
    s.remove('tk_g2');
    yield s.say('reno', "We'll keep the stragglers off you. Spiky, the big one's all yours!");
    yield s.battle({ enemies: ['holdout_panzer', 'soldier_1st'], bg: 'wutai', music: 'boss', noEscape: true });
    s.set('tk_boss');
    s.music('wutai');
    // the wreck
    yield s.say('elena', "The medevac...! Tseng! TSENG!");
    yield s.move('tk_elena', 14, 3);
    yield 30;
    yield s.msg('Inside the wreck: an empty stretcher, straps cut. A Turk ID badge, scorched at the edges.');
    yield s.say('elena', "......It's his. Tseng's ID. But he's not here...!");
    yield s.say('rude', "......There's a transfer order. 'Patient moved to a secure location. Authorized: R.'");
    yield s.say('reno', "'R'...? ......Heh. No way. No way.");
    yield s.say('elena', "Then he's alive! Somebody got him out!");
    yield s.say('rude', "......And there's this. His case.");
    yield s.msg("Tseng's case holds three weapons, each tagged with a name.");
    yield s.give('neo_turk_rod');
    yield s.give('silent_fist');
    yield s.give('rookies_pride');
    s.set('tk_case');
    yield s.say('reno', "......Tseng, you sly dog. Bringin' us presents from beyond the grave.");
    yield s.say('reno', "Look, Spiky. Our boss is out there somewhere, and so's the end of the world. Can't do much about either sittin' in a bar.\fMind if we tag along? Just till that rock's dealt with.");
    yield s.say('cloud', "......Not my call alone. Come to the Highwind.");
    yield s.fadeOut(40);
    s.remove('tk_reno'); s.remove('tk_rude'); s.remove('tk_elena');
    yield s.goto('highwind_bridge', 'start');
  };

  // ------------------------------------------------------------------ 4. the Highwind: Barret and Reno
  FF7.story.tk_join = function* (s) {
    ['hw_tifa', 'hw_barret', 'hw_cid', 'hw_redxiii'].forEach(id => s.hide(id));
    s.spawn('tk_reno', 'reno', 9, 4, 'right', { name: 'Reno' });
    s.spawn('tk_rude', 'rude', 8, 3, 'right', { name: 'Rude' });
    s.spawn('tk_elena', 'elena', 7, 4, 'right', { name: 'Elena' });
    s.spawn('tk_barret', 'barret', 17, 4, 'left', { name: 'Barret' });
    s.spawn('tk_tifa', 'tifa', 18, 3, 'left', { name: 'Tifa' });
    s.spawn('tk_cid', 'cid', 14, 2, 'down', { name: 'Cid' });
    yield s.say('barret', "Hold up. HOLD UP. You're bringin' HIM on this ship?!");
    yield s.move('tk_barret', 12, 4);
    yield s.say('barret', "Sector 7, Reno! You set that bomb! Biggs... Wedge... Jessie... a whole damn sector!\fMy daughter was down there!");
    yield s.say('reno', "......Yeah. I did.");
    yield s.say('reno', "Orders came down, and I carried 'em out. I'm not gonna stand here and tell you it was somebody else's hand on that switch.\fI know what it cost. I don't get to forget it, either.");
    yield s.say('tifa', "......Then why are you here?");
    yield s.say('reno', "'Cause that rock in the sky doesn't care who's a Turk and who's AVALANCHE.\fAnd 'cause I figure I owe the Planet some overtime.");
    yield s.say('rude', "......We follow Cloud's lead. No tricks.");
    yield s.say('elena', "Please. We just want to see this through... and find Tseng, after.");
    yield 40;
    yield s.say('barret', "............");
    yield s.say('barret', "......Fine. For the Planet. Not for you.\fYou step outta line even once, Turk—");
    yield s.say('reno', "Yeah, yeah. You'll shoot me. Got it.");
    yield s.say('cid', "Heh. Welcome aboard the Highwind. Touch my controls and I'll throw ya off myself.");
    for (const id of ['reno', 'rude', 'elena']) s.join(id, { toParty: false });
    s.set('tk_joined');
    yield s.msg('Reno, Rude and Elena joined the group!');
    ['tk_reno', 'tk_rude', 'tk_elena', 'tk_barret', 'tk_tifa', 'tk_cid'].forEach(id => s.remove(id));
    ['hw_tifa', 'hw_barret', 'hw_cid', 'hw_redxiii'].forEach(id => { if (s.actor && s.actor(id)) s.show(id); });
    yield s.msg('Change the party with the PHS at any save point, or ask a crewman on the bridge.');
  };
  const onBridge = (id) => (s) => s.flag('tk_joined') && s.isMember(id) && !s.inParty(id);
  FF7.patchMap('highwind_bridge', {
    npcs: [
      { id: 'hw_reno', name: 'Reno', model: 'reno', at: [19, 6], dir: 'left', show: onBridge('reno'),
        talk: function* (s) { yield s.say('reno', "Nice ship. Loud captain, though. ......Don't tell him I said that, yo."); } },
      { id: 'hw_rude', name: 'Rude', model: 'rude', at: [8, 7], dir: 'right', show: onBridge('rude'),
        talk: function* (s) { yield s.say('rude', s.isMember('tifa') ? "......Tell Tifa... never mind." : "......"); } },
      { id: 'hw_elena', name: 'Elena', model: 'elena', at: [17, 9], dir: 'up', show: onBridge('elena'),
        talk: function* (s) { yield s.say('elena', "'Authorized: R.' ......Tseng's alive. I know it. When this is over, I'm finding him."); } },
    ],
    onEnter: function* (s) {
      if (s.flag('tk_case') && !s.flag('tk_joined') && ON()) yield* FF7.story.tk_join(s);
    },
  });

  // ------------------------------------------------------------------ Wutai's weapon seller: the Turks' weapons
  FF7.patchMap('wutai_weapons', {
    npcs: [
      { id: 'tk_smith', name: 'Old Smith', model: 'man14', at: [14, 3], dir: 'down', show: s => s.flag('tk_joined'),
        talk: function* (s) {
          yield s.say('Old Smith', "Travelin' with Turks now, are ya? Heh. Wutai hasn't forgotten the war...\fBut gil's gil. I keep a few Shinra-grade pieces in the back.");
          yield s.shop('wutai_turks_weapons');
        } },
    ],
  });
})();
