// Chapter 12b, part 1 — the WEAPONs and Lucrecia's cave.
//  * Ultimate WEAPON chase (Disc 2+, after Cloud is back): it hovers at a fixed spot of the world map;
//    flying the Highwind into it starts a battle (ground `ultimate_weapon_b` / air `_c`), after which it
//    flees to the next spot. Once it is worn down (shared HP, see persistHp) it flies to Cosmo Canyon for
//    the last fight (`ultimate_weapon_d`, drops the Ultima Weapon) and crashes, opening the Ancient Forest.
//  * Ruby WEAPON (Corel Desert, after Ultimate WEAPON + one more battle) and Emerald WEAPON (roams the sea
//    floor west of Junon; submarine). Both are world "visible encounters" via FF7.world.stepHooks.
//  * Lucrecia's cave behind the waterfall (Vincent's past; Chaos + Death Penalty on a later visit).
// Flags: c12b_ult_told, c12b_ultimate_dead, c12b_ruby_dead, c12b_emerald_dead, c12b_luc_seen,
// c12b_luc_gifts. Vars: c12b_ult_stage, c12b_ult_fights, c12b_ult_battles, c12b_luc_battles.
// (Dialogue paraphrased in our own words; see docs/SCRIPTING.md.)
(function () {
  const WM = FF7.world;
  WM.stepHooks = WM.stepHooks || [];
  WM.encounterHooks = WM.encounterHooks || [];

  // ------------------------------------------------------------------ small state helpers
  const ST = () => FF7.state || { flags: {}, vars: {}, world: {} };
  const F = (n) => !!(ST().flags || {})[n];
  const V = (n) => ((ST().vars || {})[n]) || 0;
  const battlesFought = () => ST().battles || 0;
  function wrapDist(ax, ay, bx, by) {
    const W = FF7.data.world || { w: 384, h: 272 };
    let dx = Math.abs(ax - bx), dy = Math.abs(ay - by);
    dx = Math.min(dx, W.w - dx); dy = Math.min(dy, W.h - dy);
    return Math.max(dx, dy);
  }
  const speaker = (s) => (s.isMember('cid') ? 'cid' : 'Highwind Crew');
  const TOP = { pos: 'top' };   // world-map scripts: the world scene has no field actors to place boxes by

  // Chocobo / vehicle gates for the optional places (FF7: only the right chocobo reaches them).
  // FF7.state.vars.chocobo_color is the colour of the chocobo being ridden; a vehicle id such as
  // 'chocobo_gold' is accepted as well.
  function ridingChocobo(colors) {
    const st = ST(), col = (st.vars || {}).chocobo_color, veh = String((st.world || {}).vehicle || '');
    return colors.includes(col) || colors.some(c => veh.includes(c));
  }
  FF7.story.c12b_canReach = ridingChocobo;   // shared with parts 3/4
  // The world scene drops the chocobo when a location is entered; remember it so that leaving puts the
  // player back in the saddle (these places sit on plateaus/islands you cannot walk away from).
  function noteArrival() { const st = ST(); if (st.vars) st.vars.c12b_on_choco = (st.world || {}).vehicle === 'chocobo' ? 1 : 0; }
  FF7.story.c12b_noteArrival = noteArrival;
  FF7.story.c12b_linkIf = function (test) { return function (s) { const ok = !!test(s); if (ok) noteArrival(); return ok; }; };
  FF7.story.c12b_leave = function* (s) {
    yield s.world(s.get('c12b_on_choco') ? { resume: true, vehicle: 'chocobo' } : { resume: true });
  };

  // ================================================================== ULTIMATE WEAPON
  // FF7 fight spots (Kao Megura's table in the walkthrough): air battles near Junon, Mideel, Mt. Nibel
  // and North Corel; ground battles near Gongaga, Fort Condor, Midgar and the Northern Crater; the last
  // battle over Cosmo Canyon.
  const ULT_SPOTS = [
    { x: 236, y: 171, kind: 'air', bg: 'sky', area: 'the lakes near Junon' },
    { x: 136, y: 229, kind: 'ground', bg: 'jungle', area: 'Gongaga' },
    { x: 279, y: 241, kind: 'air', bg: 'sky', area: 'Mideel' },
    { x: 258, y: 205, kind: 'ground', bg: 'grass', area: 'Fort Condor' },
    { x: 108, y: 158, kind: 'air', bg: 'sky', area: 'Mt. Nibel' },
    { x: 253, y: 150, kind: 'ground', bg: 'grass', area: 'Midgar' },
    { x: 142, y: 152, kind: 'air', bg: 'sky', area: 'North Corel' },
    { x: 176, y: 44, kind: 'ground', bg: 'snow', area: 'the Northern Crater' },
  ];
  const ULT_FINAL = { x: 112, y: 203, kind: 'air', bg: 'sky', area: 'Cosmo Canyon' };
  const ultSpot = () => (V('c12b_ult_stage') >= ULT_SPOTS.length ? ULT_FINAL : ULT_SPOTS[V('c12b_ult_stage')]);
  // HP carried between the Ultimate WEAPON battles (enemy field persistHp: 'ultimate_weapon').
  // null when the engine does not expose it; then the chase goes to Cosmo Canyon after 4 fights.
  function ultHp() {
    const st = ST(), cands = [st.persistHp && st.persistHp.ultimate_weapon, (st.vars || {}).persistHp_ultimate_weapon, (st.vars || {}).hp_ultimate_weapon];
    for (const v of cands) if (typeof v === 'number') return v;
    return null;
  }
  const ultActive = () => F('cloud_returned') && F('has_highwind') && !F('c12b_ultimate_dead');

  FF7.story.c12b_ultimateNews = function* (s) {
    s.set('c12b_ult_told');
    yield s.say(speaker(s), "Hey, listen up! The radio's buzzin'. That monster that trashed Mideel, Ultimate WEAPON...\fIt's been spotted hangin' in the sky over the lakes near Junon. Fly into that thing and it'll have to fight us.", TOP);
    yield s.msg('Ultimate WEAPON roams the skies. Ram it with the Highwind to do battle.');
  };

  FF7.story.c12b_ultimateClash = function* (s) {
    const stage = s.get('c12b_ult_stage');
    const final = stage >= ULT_SPOTS.length;
    const p = final ? ULT_FINAL : ULT_SPOTS[stage];
    s.shake(2, 30);
    if (final) yield s.say(speaker(s), "There it is, draggin' itself over Cosmo Canyon! It's got nowhere left to run!", TOP);
    else yield s.say(speaker(s), "Dead ahead! Ultimate WEAPON!", TOP);
    const c = yield s.ask(null, 'Ultimate WEAPON is right in front of the Highwind.', ['Ram it!', 'Keep our distance']);
    if (c !== 0) return;
    if (!final) {
      const r = yield s.battle({ enemies: [p.kind === 'air' ? 'ultimate_weapon_c' : 'ultimate_weapon_b'], bg: p.bg, music: 'boss', noEscape: true });
      if (r === 'lose') return;
      s.inc('c12b_ult_fights');
      const hp = ultHp(), fights = s.get('c12b_ult_fights');
      let next = stage + 1;
      if ((hp != null && hp <= 20000) || (hp == null && fights >= 4)) next = ULT_SPOTS.length;
      s.setVar('c12b_ult_stage', next);
      if (next >= ULT_SPOTS.length) {
        yield s.msg('Ultimate WEAPON reels away, trailing smoke... toward Cosmo Canyon!');
        yield s.say(speaker(s), "It's hurt bad! Look at it wobble! It's headed for Cosmo Canyon... after it!", TOP);
      } else {
        yield s.msg(`Ultimate WEAPON broke away and flew off toward ${ULT_SPOTS[next].area}!`);
      }
      return;
    }
    const r = yield s.battle({ enemies: ['ultimate_weapon_d'], bg: 'sky', music: 'boss', noEscape: true });
    if (r !== 'win') return;
    s.set('c12b_ultimate_dead');
    s.setVar('c12b_ult_battles', FF7.state ? FF7.state.battles || 0 : 0);
    yield s.caption("Ultimate WEAPON's armor splits apart.\nThe giant beast falls from the sky...\n...and slams into the canyon lands west of Cosmo Canyon.", { hold: 200, bg: '#000' });
    s.shake(6, 50);
    yield s.msg('The impact tore a vast crater into the canyon walls.\nThe Highwind can now set down beside the Ancient Forest, west of Cosmo Canyon.');
    yield s.say(speaker(s), "Whew... Now THAT'S what I call a landing. Somebody go grab whatever fell outta that thing!", TOP);
  };

  // ================================================================== RUBY WEAPON (Corel Desert)
  const RUBY = { x: 158, y: 184 };
  FF7.story.c12b_rubyWeapon = function* (s) {
    s.shake(3, 40);
    yield s.msg('The sand boils and heaves...\nA huge crimson claw rises out of the desert!');
    const c = yield s.ask(null, 'Ruby WEAPON has surfaced.', ['Fight it', 'Get away']);
    if (c !== 0) return;
    const r = yield s.battle({ enemies: ['ruby_weapon'], bg: 'desert', music: 'boss', noEscape: true });
    if (r !== 'win') return;
    s.set('c12b_ruby_dead');
    yield s.msg('Ruby WEAPON sinks beneath the dunes and does not rise again.');
  };

  // ================================================================== EMERALD WEAPON (sea floor)
  // It glides along a loop through the deep water west of Junon (passing the sunken Gelnika).
  const EM_WAYS = [[205, 178], [199, 188], [196, 199], [204, 207], [212, 196], [212, 184]];
  const EM_PATH = (function () {
    const out = [];
    for (let i = 0; i < EM_WAYS.length; i++) {
      const [ax, ay] = EM_WAYS[i], [bx, by] = EM_WAYS[(i + 1) % EM_WAYS.length];
      const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
      for (let k = 0; k < n; k++) out.push([Math.round(ax + (bx - ax) * k / n), Math.round(ay + (by - ay) * k / n)]);
    }
    return out;
  })();
  const emeraldPos = () => EM_PATH[Math.floor((ST().time || 0) / 3) % EM_PATH.length];
  function underwaterEquipped() {
    try { return FF7.sys.party.active().some(c => FF7.sys.materia.equippedList(c).some(m => m && m.id === 'underwater')); }
    catch (e) { return false; }
  }
  FF7.story.c12b_emeraldWeapon = function* (s) {
    yield s.msg('A colossal green shape glides out of the gloom...\nEmerald WEAPON!');
    const c = yield s.ask(null, 'Emerald WEAPON is bearing down on the submarine.', ['Fight it', 'Steer clear']);
    if (c !== 0) return;
    // FF7: the fight is under water, so the party only has 20 minutes... unless someone carries the
    // Underwater Materia.
    const timed = !underwaterEquipped();
    if (timed) {
      yield s.msg("Underwater, the air won't last long.\nDefeat Emerald WEAPON within 20 minutes!");
      s.timer(20 * 60, 'AIR');
    }
    const r = yield s.battle({ enemies: ['emerald_weapon'], bg: 'seafloor', music: 'boss', noEscape: true });
    s.timer(null);
    if (r !== 'win') return;
    s.set('c12b_emerald_dead');
    yield s.msg('Emerald WEAPON sinks slowly into the black depths...');
  };

  // Current positions of the visible WEAPONs, for the world scene to draw them (optional).
  FF7.story.c12b_weaponMarkers = function () {
    const out = [];
    if (ultActive() && F('c12b_ult_told')) { const p = ultSpot(); out.push({ id: 'ultimate_weapon', x: p.x, y: p.y, air: true }); }
    if (F('c12b_ultimate_dead') && !F('c12b_ruby_dead') && battlesFought() > V('c12b_ult_battles')) out.push({ id: 'ruby_weapon', x: RUBY.x, y: RUBY.y });
    if (F('has_submarine') && !F('c12b_emerald_dead')) { const p = emeraldPos(); out.push({ id: 'emerald_weapon', x: p[0], y: p[1], underwater: true }); }
    return out;
  };

  // ------------------------------------------------------------------ the step hook
  // A WEAPON only asks once per approach; leaving its surroundings re-arms it.
  const declined = { ult: false, ruby: false, emerald: false };
  function near(key, ctx, x, y, r) {
    const d = wrapDist(ctx.x, ctx.y, x, y);
    if (d > r + 3) declined[key] = false;
    if (d > r || declined[key]) return false;
    declined[key] = true;
    return true;
  }
  WM.stepHooks.push(function c12bWeapons(ctx) {
    try {
      if (!ctx || ctx.x == null) return null;
      const veh = ctx.vehicle || null;
      // Ultimate WEAPON: only the Highwind can catch it
      if (ultActive() && veh === 'highwind') {
        if (!F('c12b_ult_told')) return FF7.story.c12b_ultimateNews;
        const p = ultSpot();
        if (near('ult', ctx, p.x, p.y, 2)) return FF7.story.c12b_ultimateClash;
      }
      // Ruby WEAPON: after Ultimate WEAPON and one more battle; bumped by the Highwind or a chocobo
      if (F('c12b_ultimate_dead') && !F('c12b_ruby_dead') && battlesFought() > V('c12b_ult_battles') && veh !== 'submarine') {
        if (near('ruby', ctx, RUBY.x, RUBY.y, 1)) return FF7.story.c12b_rubyWeapon;
      }
      // Emerald WEAPON: sea floor, submerged submarine only
      if (F('has_submarine') && !F('c12b_emerald_dead') && veh === 'submarine' && ctx.dived !== false) {
        const p = emeraldPos();
        if (near('emerald', ctx, p[0], p[1], 1)) return FF7.story.c12b_emeraldWeapon;
      }
    } catch (e) { console.error('c12b step hook', e); }
    return null;
  });

  // ================================================================== LUCRECIA'S CAVE
  // Reached through the underwater tunnel (submarine) or by a blue/green/black/gold chocobo.
  const lucReach = () => F('has_submarine') || ridingChocobo(['blue', 'green', 'black', 'gold']);
  WM.link('lucrecia_cave', { map: 'side_lucrecia_falls', entry: 'from_world', if: FF7.story.c12b_linkIf(lucReach), priority: 1 });
  WM.link('lucrecia_cave', { run: function* (s) { yield s.msg('A waterfall pours into a quiet mountain lake.\nThere seems to be a cave behind it, but the water is too deep to cross here.'); } });

  const LUCRECIA_GLOW = '#a8e0ff';
  FF7.defineMap('side_lucrecia_falls', {
    name: 'Waterfall Lake', area: 'Nibel Region', theme: 'mountain', music: 'lurking',
    look: { water: '#3a78a8', sky: ['#4a6a98', '#a8c0d8'] },
    grid: [
      "########################",
      "####WWWWWW++WWWWWW######",
      "###~WWWWWW..WWWWWW~~####",
      "##~~~~~~~R,,,R~~~~~~~###",
      "#~~~~~~~,,,,,,,,~~~~~~~#",
      "#~~~~~~,,,,%,,,,,~~~~~~#",
      "#~~~~~,,f,,,,,,,,,~~~~~#",
      "#~~~~~~,,,,,,,R,,~~~~~~#",
      "#~~~~~~~,,,,,,,,~~~~~~~#",
      "#~~~~~~~~,,,,,,~~~~~~~~#",
      "#~~~~~~~~~,,,,~~~~~~~~~#",
      "#~~~~~~~~~~,,~~~~~~~~~~#",
    ],
    entries: { from_world: [11, 10, 'up'], from_cave: [10, 2, 'down'] },
    exits: [
      { at: [10, 1, 2, 1], to: 'side_lucrecia', entry: 'from_falls', sfx: 'door2' },
      { at: [11, 11, 2, 1], run: function* (s) { yield* FF7.story.c12b_leave(s); } },
    ],
    triggers: [
      { at: [9, 3], on: 'talk', run: function* (s) { yield s.msg('Behind the curtain of falling water, the rock opens into a dark cave.'); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c12b_luc_falls_seen')) return;
      s.set('c12b_luc_falls_seen');
      yield s.msg('The roar of the falls fills the little valley.\nSomething behind the water seems to glow faintly.');
    },
  });

  // helpers for the cave scenes
  function popVincent(s, x, y, dir) {
    if (s.leader() === 'vincent') { s.place('player', x, y, dir); return 'player'; }
    s.spawn('vinc', 'vincent', x, y, dir, { name: s.name('vincent') });
    return 'vinc';
  }
  function popLeader(s, x, y, dir) { s.place('player', x, y, dir); return 'player'; }

  function* lucreciaFirst(s) {
    s.music('none');
    const lead = s.leader();
    popLeader(s, lead === 'vincent' ? 11 : 13, 8, 'up');
    const v = popVincent(s, 11, 8, 'up');
    yield s.cam(11, 4, 50);
    yield s.wait(40);
    yield s.say('Voice', '......Vincent.', { pos: 'top' });
    yield s.emote(v, '!');
    yield s.say('vincent', "That voice... No. It can't be.");
    yield s.move(v, 11, 6);
    s.sfx('magic');
    yield s.flash(LUCRECIA_GLOW, 30);
    s.spawn('lucrecia', 'lucrecia', 11, 2, 'down', { name: 'Lucrecia', anim: 'kneel' });
    yield s.wait(30);
    s.music('anxious');
    yield s.say('vincent', 'Lucrecia...?');
    yield s.say('lucrecia', '......Vincent?');
    yield s.say('vincent', 'Lucrecia!');
    yield s.move(v, 11, 4, { run: true });
    yield s.say('lucrecia', "No! Don't... don't come any closer!");
    // Vincent's memories (FF7 shows them without words)
    yield s.fadeOut(40);
    yield s.caption('Thirty years ago. Nibelheim.', { hold: 120, bg: '#000' });
    yield s.caption('Three Shinra scientists come to the mansion on the hill:\nProfessor Gast, Hojo... and Lucrecia.\nA young Turk named Vincent Valentine is sent to guard them.', { hold: 200, bg: '#000' });
    yield s.caption('Vincent and Lucrecia walk the village square together, side by side.', { hold: 150, bg: '#000' });
    yield s.caption('At the mansion gate he offers her a small box.\nShe shakes her head, and runs from him in tears.', { hold: 170, bg: '#000' });
    yield s.caption('Later he sees her at the gate again... in Hojo\'s arms.\nHe turns away before they notice him.', { hold: 170, bg: '#000' });
    yield s.say('vincent', "(If she's happy... then that's all that matters.)", { pos: 'middle' });
    yield s.caption('The basement laboratory.\nHojo and Lucrecia stand on one side. Vincent stands alone on the other.', { hold: 170, bg: '#000' });
    yield s.say('vincent', "This is wrong! Experimenting on a living person... on your own child!", { pos: 'middle' });
    yield s.say('Hojo', "She and I are scientists. Both of us. This is none of your concern.", { pos: 'middle' });
    yield s.caption('A child was born to Lucrecia.\nThe child\'s name...\n...was Sephiroth.', { hold: 200, bg: '#000' });
    yield s.caption('When Vincent would not back down, Hojo shot him.\nHe woke on an operating table... remade into something else.', { hold: 200, bg: '#000' });
    yield s.say('vincent', "(This body is my punishment. I couldn't stop Gast, or Hojo... I couldn't stop her.\fAll I did was stand there and watch. That is my sin.)", { pos: 'middle' });
    yield s.fadeIn(40);
    yield s.say('vincent', "Lucrecia... You're alive.");
    yield s.say('lucrecia', "I wanted to vanish. I couldn't bear to be near anyone... I wanted to die.\fBut the Jenova inside me won't let me.");
    yield s.say('lucrecia', "I dream of him so often now. Sephiroth... my child.\fFrom the day he was born, I never once held him. Not once.\fI have no right to call myself his mother. That is my sin.");
    yield s.walk(v, 0, -1);
    yield s.say('lucrecia', 'Stay back!');
    yield s.say('lucrecia', "Vincent... please. Tell me just one thing.\fIs Sephiroth alive? They said he died five years ago... but I see him in my dreams.\fA body like his, like mine... it doesn't die so easily. Please... tell me.");
    if (v !== 'player') {
      yield s.move('player', 12, 6);
      s.anim(v, 'point');
      yield s.wait(20);
      s.stopAnim(v);
      yield s.say(lead, '......');
    }
    yield s.wait(30);
    yield s.say('vincent', '......Lucrecia. Sephiroth is dead.');
    yield s.wait(40);
    yield s.fadeOut(60, '#ffffff');
    s.remove('lucrecia');
    yield s.fadeIn(60);
    yield s.wait(30);
    yield s.say('vincent', "......It's better this way.\fLet's go. I've kept you all waiting long enough.");
    if (v !== 'player') s.remove(v);
    yield s.camFollow(30);
    s.music('lurking');
    s.set('c12b_luc_seen');
    s.setVar('c12b_luc_battles', FF7.state ? FF7.state.battles || 0 : 0);
  }

  function* lucreciaGifts(s) {
    const lead = s.leader();
    popLeader(s, lead === 'vincent' ? 11 : 13, 7, 'up');
    const v = popVincent(s, 11, 7, 'up');
    yield s.move(v, 11, 4);
    yield s.wait(30);
    yield s.say('vincent', "......She's gone.");
    yield s.msg('The glow inside the crystal has faded.\nAt its foot lies a long-barreled gun... and beside it, a tiny light that pulses like a heartbeat.');
    s.anim(v, 'kneel');
    yield s.wait(40);
    s.stopAnim(v);
    s.set('c12b_luc_gifts');
    yield s.give('death_penalty');
    yield s.give('chaos');
    yield s.say('vincent', "Lucrecia... Rest now. I'll carry the rest of it.");
    if (v !== 'player') s.remove(v);
    yield s.camFollow(20);
  }

  FF7.defineMap('side_lucrecia', {
    name: "Lucrecia's Cave", area: 'Nibel Region', theme: 'cave', music: 'lurking',
    look: { water: '#2a5a88', floor: ['#4a4a50', '#44444a'], wall: '#4a4a5a' },
    grid: [
      "########################",
      "#####RRUUUUUUUUUURR#####",
      "####RRUU........UURR####",
      "###RR~UU........UU~RR###",
      "##RR~~~R^^^^^^^^R~~~RR##",
      "##R~~~~R........R~~~~R##",
      "##R~~~~RR......RR~~~~R##",
      "##RR~~~~R......R~~~~RR##",
      "###RR~~~R......R~~~RR###",
      "####RRRRR......RRRRR####",
      "#########......#########",
      "#########......#########",
      "##########....##########",
    ],
    heights: [
      "000000000000000000000000",
      "000000000000000000000000",
      "000000002222222200000000",
      "000000002222222200000000",
      "000000001111111100000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
    ],
    lights: [[11.5, 1.5, LUCRECIA_GLOW, 5], [4, 5, '#4080c0', 3], [19, 5, '#4080c0', 3]],
    entries: { from_falls: [11, 11, 'up'] },
    exits: [{ at: [10, 12, 4, 1], to: 'side_lucrecia_falls', entry: 'from_cave', sfx: 'door2' }],
    triggers: [
      { id: 'luc_first', at: [9, 7, 6, 2], if: s => s.flag('disc2') && s.inParty('vincent') && !s.flag('c12b_luc_seen'), run: lucreciaFirst },
      { at: [9, 7, 6, 2], once: false, if: s => s.inParty('vincent') && s.flag('c12b_luc_seen') && !s.flag('c12b_luc_gifts') && (FF7.state ? FF7.state.battles || 0 : 0) >= s.get('c12b_luc_battles') + 10, run: lucreciaGifts },
      { at: [8, 1, 8, 1], on: 'talk', run: function* (s) {
        if (s.flag('c12b_luc_gifts')) { yield s.msg('Dull, lifeless crystal. Whatever light lived here is gone.'); return; }
        if (s.flag('c12b_luc_seen')) {
          if (s.inParty('vincent')) yield s.say('vincent', "......She's resting. Leave her be.");
          else yield s.msg('The crystal glows faintly, like a candle behind frosted glass.');
          return;
        }
        yield s.msg('Great crystals rise from the cavern floor, glowing a soft blue.\nFor a moment it feels as though someone inside is watching you.');
      } },
    ],
  });
})();
