// Kupomon: the legends' sidequests 12, 13 and 14 (docs/KUPOMON_LEGENDS.md):
//   12 Fatepom, "A Pom of Destiny": a +5 hatch at the Kupo Ranch, the star on the barn, Granny Pom's tale, the Red Thread
//      (Route 6, Mogfield's pond), Rancher Mog's own stock, the three cards. New map: the Hayloft (kp_lq_fate_loft).
//   13 Hurdygurdy, "The Twin Act": seven MogNet Swaps in a chain jam the tubes, Hurdy, the Dead Letter Office's sacks,
//      the rehearsal, the Pop Duo, the encore. New map: the Bandstand (kp_lq_twins_stage), off Costa del Kupo.
//   14 Kupofried, "The Dream King": the Kupodex Diploma, a nap at the Champions' Rest, the Woolpoms, the dream rivals,
//      the Dream Ring, the second sleep. New map: the Dreaming Lab (kp_lq_dream_lab).
// The existing maps are changed from here as this file loads (FF7.patchMap, wrappers round their NPCs' talk, an entry
// and a prop or two), never in their own files; every new tile is checked against the map's lists first (the other
// quest files load before this one). Each quest registers itself for the Demo in KP.QUESTS (js/kupomon/kp_runner.js
// O.kp_quests). Dialogue in our own words.
//
// THE ANSWERS (the Demo's plans below follow them):
//   Fatepom:    the thread is snagged on the scarecrow at the bottom of Route 6's wheat field (kp_r6_crow3), on the
//               windmill's hub (examine the windmill from the plateau in front of it) and round the neck of the duck on
//               the pond's north-east bank in Mogfield (kp_mf_duck1: "Ask nicely"; "Grab it" only gets you pecked).
//               Rancher Mog's battle unlocks the loft ladder. In the Hayloft the right card is The Star (Granny Pom's
//               words); a wrong one turns the fan of cards round by one.
//   Hurdygurdy: seven MogNet Swaps in one chain, each time sending down the moogle that came back the time before. In
//               the Dead Letter Office the first two sacks opened hold nesting wild moogles (Lv 47) and the third is
//               Gurdy, whichever order. The rehearsal: Gurdy answers Hurdy's phrase backwards, three rounds:
//               "Mi, re, do", "Fa, so, mi, do", "Do, so, la, fa, re". Then the Pop Duo (Lyra, then Belle).
//   Kupofried:  the Woolpoms over the fence: 2 (three over, one back), then 3 (over, over, back, over, over, back,
//               over), then 5 (over x3, back, over x3, back, over). Then Zack and Sephiroth; sleep again with the ring.
// Flags: kp_lq_fate_open (the ranch sets it) _star _granny _t1 _t2 _t3 _rancher _card _done; kp_lq_twins_open _seven
// _hurdy _sack_a _sack_b _sack_c _gurdy _song _lyra _duo _done (var kp_lq_twins_chain: the ranch counts it);
// kp_lq_dream_open _sheep _zack _rivals _ring _king _done; the legends' own kp_legend_lq_fatepom, kp_legend_lq_hurdygurdy,
// kp_legend_lq_kupofried. Key items: lq_red_thread, lq_half_coat, lq_dream_ring (all three keepsakes).
(function () {
  const KP = FF7.kupomon, W = KP && KP.W;
  if (!KP || !W || KP._lq5) return;   // (once: a tool that loads it a second time changes nothing)
  KP._lq5 = true;

  const FATE = 'fatepom_pom_of_destiny', TWINS = 'hurdygurdy_twin_minstrels', DREAM = 'kupofried_dream_king';
  const LOFT = 'kp_lq_fate_loft', STAGE = 'kp_lq_twins_stage', DLAB = 'kp_lq_dream_lab';
  const RM = 'Rancher Mog';
  const flagOn = (f) => !!(FF7.state && FF7.state.flags && FF7.state.flags[f]);
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const mon = (sp, fb, scale) => ({ enemy: 'kp_' + (KP.SPECIES[sp] ? sp : fb), scale });

  // ------------------------------------------------------------------ shared pieces
  // the tiles a map's lists already use (exits, triggers and their rects, NPCs, objects, items, chests, entries), and
  // the first of a list of wanted tiles that's still free
  const taken = (id) => {
    const m = FF7.maps[id] || {}, T = new Set();
    const mark = (at) => { if (!at) return; const [x0, y0, w = 1, h = 1] = at; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) T.add(x + ',' + y); };
    ['exits', 'triggers'].forEach(k => (m[k] || []).forEach(o => o && mark(o.at)));
    ['npcs', 'objects', 'items', 'chests'].forEach(k => (m[k] || []).forEach(o => o && o.at && mark([Math.round(o.at[0]), Math.round(o.at[1])])));
    Object.values(m.entries || {}).forEach(e => e && mark([e[0], e[1]]));
    return T;
  };
  const pick = (id, prefs, n = 1) => { const T = taken(id), out = prefs.filter(([x, y]) => !T.has(x + ',' + y)).slice(0, n); if (out.length < n) console.warn('kp_lq_5: not enough free tiles on ' + id); return out; };
  // wrap an existing NPC's talk (and any talk-trigger that runs the same script, a counter): make(old) -> the new talk
  const wrapTalk = (map, id, make) => {
    const m = FF7.maps[map], n = m && (m.npcs || []).find(x => x && x.id === id);
    if (!n) { console.warn('kp_lq_5: no NPC ' + id + ' on ' + map); return false; }
    const old = n.talk || function* () {}, fn = make(old);
    n.talk = fn;
    (m.triggers || []).forEach(t => { if (t && t.run === old) t.run = fn; });
    return true;
  };
  // a scripted trainer battle (the quests' trainers: held items, the smart AI, levels on the cap of 50 already)
  const duel = function* (s, o) {
    const foes = W.team(KP.leagueHeld ? KP.leagueHeld(o.team) : o.team, true);
    return yield* KP.fight(s, { kind: 'trainer', foes, ai: 'smart', bg: o.bg || (s.field && s.field.map && s.field.map.kpBg) || 'grass', music: o.music, canLose: o.canLose,
      trainer: { name: o.name, lose: o.lose, win: o.win, money: o.money || 2400, model: o.model } });
  };
  // tile paths for the cutscenes: actors walk tile to tile round the crates, never through them
  const pathTo = (s, from, to) => {
    const P = s.field && s.field.P;
    if (!P || typeof P.walkable !== 'function' || !from || from[0] == null) return [to];
    const key = (x, y) => x + ',' + y, prev = new Map([[key(from[0], from[1]), null]]), q = [[from[0], from[1]]];
    while (q.length) {
      const [x, y] = q.shift(); if (x === to[0] && y === to[1]) break;
      for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy, k = key(nx, ny); if (prev.has(k) || !(P.walkable(nx, ny) || (nx === to[0] && ny === to[1]))) continue; prev.set(k, [x, y]); q.push([nx, ny]); }
    }
    if (!prev.has(key(to[0], to[1]))) return [to];
    const out = []; for (let p = to; p && !(p[0] === from[0] && p[1] === from[1]); p = prev.get(key(p[0], p[1]))) out.unshift(p);
    return out.length ? out : [to];
  };
  // a free walkable tile `d` steps' walk from `from` (nobody standing on it, not one of `avoid`); null if none
  const nearFree = (s, from, d, avoid = []) => {
    const f = s.field, P = f && f.P;
    if (!P || typeof P.walkable !== 'function' || !from || from[0] == null) return null;
    const key = (x, y) => x + ',' + y, busy = new Set(avoid.map(a => key(a[0], a[1])));
    Object.values(f.actors || {}).forEach(a => { if (a && a.visible && a.tx != null) busy.add(key(a.tx, a.ty)); });
    const dist = new Map([[key(from[0], from[1]), 0]]), q = [[from[0], from[1]]];
    let best = null;
    while (q.length) {
      const [x, y] = q.shift(), dd = dist.get(key(x, y));
      if (dd >= 1 && !busy.has(key(x, y)) && (!best || Math.abs(dd - d) < Math.abs(best[2] - d))) best = [x, y, dd];
      if (dd >= d + 2) continue;
      for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy, k = key(nx, ny); if (dist.has(k) || !P.walkable(nx, ny)) continue; dist.set(k, dd + 1); q.push([nx, ny]); }
    }
    return best ? [best[0], best[1]] : null;
  };
  const tileOf = (s, id) => { const a = s.actor(id); return a && a.tx != null ? [a.tx, a.ty] : null; };
  // a night sky for a scene on an outdoor map: the loaded map's sky and light swapped (they're read every frame), and
  // put back afterwards (the map's geometry is kept between visits, so it always is)
  const NIGHT = { sky: ['#03040e', '#141a3a'], ambient: [0.22, 0.24, 0.38], light: [0.42, 0.46, 0.72], fog: { color: [0.03, 0.04, 0.1], near: 14, far: 34 } };
  let nightTh = null;
  const nightOn = (s) => {
    const th = s && s.field && s.field.geo && s.field.geo.th; if (!th || th._lqDay) return;
    th._lqDay = {}; for (const k in NIGHT) { th._lqDay[k] = th[k]; th[k] = NIGHT[k]; }
    nightTh = th;
  };
  const nightOff = () => { const th = nightTh; nightTh = null; if (!th || !th._lqDay) return; for (const k in th._lqDay) th[k] = th._lqDay[k]; delete th._lqDay; };
  // the Demo's words (js/runner/plans/plan_kp.js): a battle that has to be won, and "that legend isn't standing here"
  const win = (flag, train, ...steps) => ['kp_win', steps, flag, train && typeof train === 'object' ? train : { train }];
  const absent = (map, id) => () => { const f = FF7.fieldScene, a = f && f.actors && f.actors[id]; return !!f && !!f.map && f.map.id === map && !(a && a.visible); };

  // ------------------------------------------------------------------ the key items (keepsakes, all three)
  KP.ITEMS.lq_red_thread = { name: 'Red Thread', kind: 'key', price: 0,
    get desc() { const n = ['t1', 't2', 't3'].filter(k => flagOn('kp_lq_fate_' + k)).length;
      return flagOn('kp_lq_fate_done') ? 'A red thread, still warm. It led you to a pom of destiny. A keepsake.'
        : n >= 3 ? 'Red Thread: 3 of 3 lengths. It tugs gently, toward the Kupo Ranch.' : `Red Thread: ${n} of 3 lengths. It's warm, and the rest is snagged somewhere.`; } };
  KP.ITEMS.lq_half_coat = { name: 'Half a Coat', kind: 'key', price: 0,
    get desc() { return flagOn('kp_lq_twins_done') ? 'Half a coat, sewn up neat as a pin by the twins. A keepsake of the Twin Act.'
      : "Hurdy's half of a coat: one sleeve, three buttons. Show it to his brother."; } };
  KP.ITEMS.lq_dream_ring = { name: 'Dream Ring', kind: 'key', price: 0,
    get desc() { return flagOn('kp_lq_dream_done') ? 'A ring from a dream. It smells faintly of moonlight. A keepsake.'
      : 'It slipped onto your finger in a dream. Sleep at the Champions\' Rest wearing it.'; } };

  // =================================================================== 12. FATEPOM: A POM OF DESTINY
  const threads = () => ['t1', 't2', 't3'].filter(k => flagOn('kp_lq_fate_' + k)).length;
  const fateOn = (s) => s.flag('kp_lq_fate_granny') && !s.flag('kp_lq_fate_done');
  // a length of the Red Thread wound in (k: t1 the scarecrow, t2 the duck, t3 the windmill)
  const windThread = function* (s, k) {
    s.set('kp_lq_fate_' + k);
    const n = threads();
    if (n === 1) { KP.give('lq_red_thread', 1); s.sfx('found'); yield s.msg('You wind the thread in. It\'s warm. ' + KP.got('lq_red_thread')); }
    else { s.sfx('found'); yield s.msg('You wind the thread in. It\'s warm.'); }
    yield s.msg(n >= 3 ? 'That\'s the whole Red Thread. It tugs gently at your hand... toward the Kupo Ranch.' : `(The Red Thread: ${n} of 3 lengths.)`);
  };

  // ---- cutscene A: a falling star (the ranch yard, the night of the +5 hatch)
  const RANCHER = { enemy: 'kp_farmmog_harvester', scale: 0.9 }, STAR = { prop: 'bush', col: '#fff4c8', scale: 0.5 };
  const starFalls = function* (s) {
    s.set('kp_lq_fate_star');
    yield s.say(RM, 'Kupo? Is it dark out already? ...Come quick! Something\'s glowin\' over the yard!');
    yield s.fadeOut(30);
    KP._lqNight = 'kp_mogfield';
    yield s.goto('kp_mogfield', 'from_ranch');
    s.spawn('lq_rm', RANCHER, 8, 6, 'up', { name: RM, solid: false });
    yield s.face('player', 'up');
    yield 20;
    s.emote('lq_rm', '!'); s.anim('lq_rm', 'point');
    yield s.say(RM, 'Kupo! Look!');
    yield s.cam(7, 3, 50, { dist: 13, pitch: 28 });
    s.spawn('lq_star', STAR, 28, 1, 'down', { solid: false, hover: 6.5 });
    s.flash('#fffbe0', 10, 0.4); s.sfx('ching');
    yield [s.move('lq_star', 7, 3, { speed: 0.16 }), s.hover('lq_star', 4.1, 66)];
    s.remove('lq_star'); s.shake(2, 20); s.sfx('hop');
    s.flash('#ffb0e0', 40, 0.45);
    yield 30;
    yield s.msg('A soft pink glow pulses on the barn roof... then something small and round rolls down the far side. Bonk.');
    s.camFollow(30); s.stopAnim('lq_rm');
    yield s.face('lq_rm', 'player');
    s.emote('lq_rm', '...'); yield 30;
    yield s.say(RM, 'Well. That\'s never happened before.\f...Except the once.');
    yield s.say(RM, 'Ask Granny Pom in Pomville, kupo. She remembers everything. Especially what ye\'d rather she didn\'t.');
    yield s.fadeOut(40);
    nightOff();
    yield s.caption('The next morning...', { hold: 90, bg: '#000', aboveFade: true });
    yield s.goto('kp_mogfield_ranch', 'from_town');   // (back in the barn, where the scene began)
  };

  // ---- cutscene B: Granny Pom's tale (Pomville)
  wrapTalk('kp_town_house', 'kp_granny', old => function* (s) {
    if (s.flag('kp_lq_fate_done') && !s.flag('kp_lq_fate_told')) { s.set('kp_lq_fate_told'); yield s.say('Granny Pom', 'A pom of destiny on your team, is it? Told you, dearie. Stars.'); }
    if (!s.flag('kp_lq_fate_open') || s.flag('kp_lq_fate_granny')) {
      yield* old(s);
      if (fateOn(s) && !s.flag('kp_lq_fate_rancher')) yield s.say('Granny Pom', threads() < 3 ? 'Still winding that thread? Scarecrows, windmills, ducks... a pom gets everywhere, dearie.'
        : 'All wound in? Then it\'s hiding somewhere warm and high up. Poms adore a hayloft.');
      if (!s.flag('kp_lq_fate_done')) return;
      // (after: the star thread from her sewing basket, for the Kupo Ranch; js/kupomon/kp_legendbreed.js)
      yield s.say('Granny Pom', 'That red thread keeps turning up in my sewing basket, dearie. It shines like starlight. I spin it onto spools. Fate isn\'t free, mind.');
      yield* KP.legendItemShop(s, FATE, { who: 'Granny Pom', done: 'kp_lq_fate_done' });
      return;
    }
    s.set('kp_lq_fate_granny');
    yield s.face('kp_granny', 'player');
    yield s.say('Granny Pom', 'You look like you\'ve seen a shooting star, dearie. Sit down, sit down.');
    s.sfx('use'); s.emote('kp_granny', '♪'); yield 30;
    yield s.msg('Granny Pom pours two cups of tea and settles into her chair.');
    yield s.say('Granny Pom', 'A perfect egg, was it? And then a pom fell out of the sky. Oh, they do that.');
    yield s.say('Granny Pom', 'It rolls about and leaves its red thread snagged on things. Wind the thread back in, and it\'ll show you three cards.');
    yield s.say('Granny Pom', 'The star card is always yours, dearie. Don\'t ask me why. Fate is terribly fond of stars.');
    yield s.say('Granny Pom', 'Where to look? Scarecrows, windmills and ducks. Route 6, and Mogfield\'s pond, I\'d say.');
    KP.healAll(); s.sfx('heal');
    yield s.msg('(Your moogles warmed their gears by the stove. All rested!)');
  });
  KP.legendSeller(FATE, 'kp_town_house', 'kp_granny');

  // ---- the thread: the scarecrow (Route 6's wheat field), the windmill's hub, the duck (Mogfield's pond)
  wrapTalk('kp_route6', 'kp_r6_crow3', old => function* (s) {
    if (!fateOn(s) || s.flag('kp_lq_fate_t1')) { yield* old(s); return; }
    yield s.msg('A red thread is snagged on the scarecrow\'s straw hat, fluttering in the breeze.');
    yield* windThread(s, 't1');
  });
  const WIND = pick('kp_route6', [[8, 4], [9, 4]])[0] || [8, 4];   // (the windmill's south wall, seen from the plateau)
  FF7.patchMap('kp_route6', { triggers: [{ id: 'lq_windmill', at: [WIND[0], WIND[1], 1, 1], on: 'talk', run: function* (s) {
    if (!fateOn(s) || s.flag('kp_lq_fate_t3')) { yield s.msg('The windmill creaks round. Its sails go whoosh... whoosh... whoosh.'); return; }
    yield s.msg('High on the windmill\'s hub, a red thread goes round and round with the sails.');
    yield s.msg('You wait for it to come by... wait... and catch it!');
    yield* windThread(s, 't3');
  } }] });
  wrapTalk('kp_mogfield', 'kp_mf_duck1', old => function* (s) {
    if (!fateOn(s) || s.flag('kp_lq_fate_t2')) { yield* old(s); return; }
    yield s.msg('This duck is wearing a red thread round its neck, like a very small scarf.');
    const c = yield s.ask(null, 'What do you do?', ['Ask nicely', 'Grab it']);
    if (c !== 0) {
      s.shake(2, 12); s.sfx('hit');
      yield s.msg('PECK! PECK PECK! The duck keeps the thread. It has also kept its dignity. You have not.');
      return;
    }
    yield s.msg('"Excuse me. I think that\'s my thread." The duck considers this for a long moment... then shakes it loose. Quack.');
    yield* windThread(s, 't2');
  });

  // ---- the ranch: the star (after the hatch, or on the next visit for an older save), Rancher Mog's battle, the ladder
  const FATE_TEAM = [['shamog_beastcaller', 46], ['maestromog_maestro', 46], ['templamog_templar', 46], ['drakemog_dragon_knight', 47], ['slingmog_gunslinger', 47]];
  const rancherBattle = function* (s) {
    yield s.say(RM, 'My own breeding stock, kupo. Every one o\' them hatched in this barn. Don\'t hold back. They won\'t!');
    const r = yield* duel(s, { name: RM, model: RANCHER, team: FATE_TEAM, bg: 'grass', money: 2800, lose: 'Well I\'ll be. Ye\'ve a fine hand with moogles, kupo.' });
    if (r !== 'win') return;
    s.set('kp_lq_fate_rancher'); s.sfx('set');
    yield s.say(RM, 'Fit as a fiddle, the lot of ye! The loft ladder\'s unlocked. Up ye go.');
    yield s.say(RM, 'Mind: only a blow it\'s afraid of can touch it. Bring the right one, kupo.');
  };
  wrapTalk('kp_mogfield_ranch', 'rancher', old => function* (s) {
    if (s.flag('kp_lq_fate_done') && !s.flag('kp_lq_fate_thanks')) { s.set('kp_lq_fate_thanks'); yield s.say(RM, 'So that\'s what fell on my barn! Look after it, kupo. Fate doesn\'t hand out seconds.'); }
    if (fateOn(s) && threads() >= 3 && !s.flag('kp_lq_fate_rancher')) {
      const c = yield s.ask(RM, 'Ye\'ve wound in the whole thread? Then it\'s MY loft that pom\'s hiding in! Before ye climb that ladder, I need to know ye\'re fit to keep a pom of destiny.',
        ['Bring it on!', 'Just breeding today']);
      if (c === 0) { yield* rancherBattle(s); return; }
    }
    yield* old(s);
    if (s.flag('kp_lq_fate_open') && !s.flag('kp_lq_fate_star')) yield* starFalls(s);   // (a +5 egg just hatched)
  });
  // the loft ladder: against the north wall in the stall by the door (or the east wall, if that's taken)
  const LADDER = pick('kp_mogfield_ranch', [[2, 1], [16, 6]])[0] || [2, 1];
  const LADDER_UP = LADDER[0] === 2 ? 'n' : 'e', LADDER_FOOT = LADDER[0] === 2 ? [LADDER[0], LADDER[1] + 1] : [LADDER[0], LADDER[1] - 1];
  {
    const m = FF7.maps.kp_mogfield_ranch;
    m.entries.from_loft = [LADDER_FOOT[0], LADDER_FOOT[1], 'down'];
    (m.props = m.props || []).push({ at: [LADDER[0], LADDER[1]], prop: 'ladder', face: LADDER_UP, h: 2.7 });
  }
  FF7.patchMap('kp_mogfield_ranch', {
    exits: [{ at: [LADDER[0], LADDER[1], 1, 1], to: LOFT, entry: 'from_ranch', if: s => s.flag('kp_lq_fate_rancher'),
      blocked: function* (s) { yield s.msg(s.flag('kp_lq_fate_open') ? 'Rancher Mog: "Oi! Not up my loft till I\'ve seen what ye\'re made of, kupo!"'
        : 'The ladder to the hay loft. A sign hangs on it: "HAY RESTING. DO NOT DISTURB."'); } }],
    onEnter: function* (s) { if (s.flag('kp_lq_fate_open') && !s.flag('kp_lq_fate_star')) yield* starFalls(s); },
  });
  // Mogfield at night for the star (and its sky put back on every other visit)
  FF7.patchMap('kp_mogfield', { onLoad: s => { if (KP._lqNight === 'kp_mogfield') { KP._lqNight = null; nightOn(s); } else nightOff(); } });

  // ---- the Hayloft (12 x 8): up the barn's loft ladder. Hay bales stacked in steps, a round window full of stars, a
  // pulley on a post and a hanging lantern, a straw nest in the middle where something glows. The hatch down is the
  // gap in the south wall.
  const HAY = '#d8b45a', HAY2 = '#c8a24a', NEST = [5, 3];
  const bale = (x, y, n) => Array.from({ length: n }, (_, i) => ({ at: [x + i * 0.001, y], prop: 'crate', col: i % 2 ? HAY2 : HAY, flat: true, lift: i * 0.4 }));
  const fateNpc = W.legend('lq_fatepom', FATE, { at: NEST, dir: 'down', scaled: true, lv: 45, abil: 0, bg: 'night', scale: 1.0,
    show: s => s.flag('kp_lq_fate_card'),
    intro: 'Fatepom hovers over the nest, its three cards turning slowly round it.',
    opening: 'Fatepom shuffles its cards. Only one of them has your name on it.',
    after: 'Fatepom rolls away into the straw. Fate, it seems, has a rematch written in.',
    done: 'kp_lq_fate_done',
    then: function* (s) {
      KP.give('luck_plus', 1); s.sfx('found');
      yield s.msg('In the straw where it hovered: ' + KP.got('luck_plus'));
      yield* KP.giveLegendItem(s, FATE);   // (the first Star Thread: js/kupomon/kp_legendbreed.js)
      yield s.msg('The Red Thread is still tied in its little bow. You decide to keep it.');
    } });
  fateNpc.model = mon(FATE, 'mopluff_bard', 1.0); fateNpc.hover = 0.8;
  const fateFight = fateNpc.talk;
  fateNpc.talk = function* (s) {
    if (!KP.SPECIES[FATE]) { yield s.msg('Something glows in the nest... but it isn\'t ready to be met yet.'); return; }
    yield* fateFight(s);
  };
  // the three cards (the riddle), then cutscene C and the encounter
  const cards = function* (s) {
    if (!s.flag('kp_lq_fate_rancher') || s.flag('kp_lq_fate_card')) return;
    if (!KP.SPECIES[FATE]) { yield s.msg('Something glows in the nest... but it isn\'t ready to be met yet.'); return; }
    yield s.msg('Something glows in the straw nest. As you lean closer, three cards rise out of it and fan open in the air.');
    let fan = ['The Sun', 'The Moon', 'The Star'], right = false;
    for (let k = 0; k < 6 && !right; k++) {
      const c = yield s.ask(null, 'Three cards turn slowly in the glow. Which one do you take?', fan);
      if (fan[c] === 'The Star') { right = true; break; }
      s.sfx('error');
      yield s.msg(`${fan[c] || 'The card'}... It goes cold in your hand, and all three cards shuffle themselves round.`);
      fan = fan.slice(1).concat(fan.slice(0, 1));
    }
    if (!right) { yield s.msg('The cards sink back into the straw. What was it Granny Pom said?'); return; }
    s.set('kp_lq_fate_card');
    s.sfx('ching');
    yield s.msg('The Star. It\'s warm, like the thread.');
    yield s.cam(NEST[0], NEST[1], 40, { dist: 6.5, pitch: 34 });
    s.sfx('magic');
    yield s.msg('The loose end of the Red Thread slips out of your bag and winds itself into the nest... and back out again, tied in a tiny bow.');
    s.flash('#ffb0e0', 24, 0.7);
    s.show('lq_fatepom', NEST[0], NEST[1], 'down'); s.hover('lq_fatepom', 0);
    yield s.hover('lq_fatepom', 0.8, 80);
    s.sfx('ching');
    yield s.msg('A golden pom rises out of the straw and unfolds into a moogle.');
    s.emote('lq_fatepom', '...'); yield 30;
    yield s.msg('The three cards circle it once, twice... It stops them with a look.');
    yield s.msg('It looks at you, and you get the odd feeling it already knows how this ends. It only wants to see if you do.');
    s.camFollow(30);
    yield* fateFight(s);
  };
  FF7.defineMap(LOFT, {
    name: 'Kupo Ranch - Hayloft', area: 'Mogfield', theme: 'house', music: 'dream', kpBg: 'night',
    look: { floor: ['#9a7c48', '#927442'], floorTex: 'planks', wall: '#5a3e28', trim: '#3a2818', wallH: 2.4, wallTex: 'siding',
      sky: ['#000000', '#000000'], ambient: [0.26, 0.26, 0.38], light: [0.46, 0.44, 0.64] },
    grid: [
      "############",
      "#BB.....BBB#",
      "#B........B#",
      "#....N.....#",
      "#..........#",
      "#B.........#",
      "#BB.......B#",
      "#####.######",
    ],
    legend: { N: 'block' },
    props: [
      ...bale(1, 1, 3), ...bale(2, 1, 2), ...bale(1, 2, 2), ...bale(9, 1, 2), ...bale(10, 1, 3), ...bale(10, 2, 2),
      ...bale(1, 5, 1), ...bale(1, 6, 2), ...bale(2, 6, 1), ...bale(10, 6, 2),
      // the nest: a ring of straw and the glow in it
      { at: [NEST[0], NEST[1]], prop: 'disc', r: 0.85, h: 0.18, col: '#a8823a', top: '#d8b45a', rim: '#b8913e', ring: '#c8a048' },
      { at: [NEST[0] + 0.001, NEST[1]], prop: 'hole', r: 0.32, col: '#ffb0e0', col2: '#d8b45a', lift: 0.19 },
      // the round window full of stars, the pulley's wheel on its post (a rope down to a bale), the lantern on a beam
      { at: [5, 0], prop: 'porthole', r: 0.55, y: 1.55, col: '#0a0c2a', col2: '#5a3e24' },
      { at: [8, 1], prop: 'helm', r: 0.2, h: 2.0, col: '#5a4a30', col2: '#3a2a1a' },
      { at: [8.25, 1], to: [8.3, 1.3], h: 2.0, h2: 0.55, sag: 0, col: '#9a7a4a', r: 0.012, count: 1 },
      { at: [8.3, 1.3], prop: 'crate', col: HAY, flat: true, scale: 0.6, lift: 0.1 },
      { at: [3, 4.5], prop: 'lantern', col: '#ffc860', hang: 1.9 },
    ],
    lights: [[5, 3, '#ff9ad8', 3.4], [5, 1, '#7080ff', 2.0]],
    entries: { from_ranch: [5, 6, 'up'] },
    exits: [{ at: [5, 7, 1, 1], to: 'kp_mogfield_ranch', entry: 'from_loft' }],
    npcs: [fateNpc],
    triggers: [{ id: 'lq_nest', at: [NEST[0], NEST[1], 1, 1], on: 'talk', if: s => !s.flag('kp_lq_fate_card'), run: cards }],
  });

  // =================================================================== 13. HURDYGURDY: THE TWIN ACT
  const HURDY = { enemy: 'kp_rockupo_busker', scale: 0.8 }, GURDY = { enemy: 'kp_chatmog_orator', scale: 0.8 }, TWINS_M = mon(TWINS, 'mopluff_dancer', 1.1);
  const PARCEL = { prop: 'crate', col: '#c8a878', flat: true, scale: 0.9 };
  const HURDY_AT = pick('kp_mogfield_ranch', [[11, 3], [12, 3], [10, 3], [12, 4]])[0] || [11, 3];
  // ---- cutscene A: a jam in the tubes (the ranch, the seventh swap in a chain)
  const jam = function* (s, late) {
    const M = 'kp_mfr_mognet', H = 'lq_hurdy';
    s.set('kp_lq_twins_open');
    yield s.say('MogNet Mog', late ? 'The tubes have been rattlin\' ever since that seventh parcel, kupo. One more crank, for luck...' : 'Seven in a chain, kupo! One more crank of the handle, for luck...');
    s.sfx('set'); s.anim(M, 'jump'); yield 24; s.stopAnim(M);
    s.shake(2, 40); s.sfx('hit'); yield 40;
    s.shake(5, 50); s.sfx('beep'); yield 20; s.sfx('hit'); yield 30;
    yield 40;
    s.emote(M, '?'); yield 30;
    s.sfx('hop');
    s.spawn('lq_parcel', PARCEL, 16, 2, 'down', { solid: false, hover: 0.9 });
    yield s.jump('lq_parcel', HURDY_AT[0], HURDY_AT[1], 1.3, 30);
    s.remove('lq_parcel'); s.flash('#fff4d8', 12, 0.8); s.shake(2, 10);
    s.show(H, HURDY_AT[0], HURDY_AT[1], 'down');
    s.emote(H, '?!'); yield 30;
    yield s.msg('POP! The parcel bursts, and out rolls a small moogle wearing exactly half a coat.');
    yield s.face(M, H);
    yield s.say('MogNet Mog', 'Kupo! That\'s not a moogle, that\'s HALF a moogle.');
    yield s.say('MogNet Mog', '...No. It\'s a whole one in half a coat.');
  };
  wrapTalk('kp_mogfield_ranch', 'kp_mfr_mognet', old => function* (s) {
    if (!s.flag('kp_lq_twins_open') && s.flag('kp_lq_twins_seven') && s.flag('kp_league_1')) { yield* jam(s, true); return; }
    yield* old(s);
    if (s.flag('kp_lq_twins_open')) return;
    if (s.get('kp_lq_twins_chain') >= 7) s.set('kp_lq_twins_seven');
    if (!s.flag('kp_lq_twins_seven')) return;
    if (s.flag('kp_league_1')) yield* jam(s, false);
    else yield s.say('MogNet Mog', 'Seven in a chain! The tubes are making a funny noise, kupo... Probably nothing.');
  });
  // ---- Hurdy (the ranch): Half a Coat
  FF7.patchMap('kp_mogfield_ranch', { npcs: [{ id: 'lq_hurdy', name: 'Hurdy', model: HURDY, at: HURDY_AT, dir: 'down',
    show: s => s.flag('kp_lq_twins_open') && !s.flag('kp_lq_twins_hurdy'),
    talk: function* (s) {
      yield s.say('Hurdy', 'Where\'s my BROTHER? We went down the tubes together! He had the other sleeve!');
      yield s.say('MogNet Mog', 'Half a parcel came back, kupo? Then the other half\'s been returned to sender. That\'s Mognet Tower: the Dead Letter Office.');
      yield s.say('Hurdy', 'Dead letters? That\'s Gurdy all over. He\'d get lost in a sock drawer.');
      yield s.say('Hurdy', 'Here: take my half of the coat. Show it to him, so he knows it\'s really me sending you. I\'ll be right behind you, kupo!');
      KP.give('lq_half_coat', 1); s.sfx('found');
      yield s.msg(KP.got('lq_half_coat'));
      s.set('kp_lq_twins_hurdy');
      const at = tileOf(s, 'lq_hurdy');
      yield s.move('lq_hurdy', pathTo(s, at, [8, 7]), { run: true });
      s.remove('lq_hurdy');
    } }] });

  // ---- the Dead Letter Office (Mognet Tower 2F): three wriggling sacks on dead ends of the sack maze; the first two
  // opened hold nesting moogles, the third Gurdy
  const SACKS = pick('kp_mognet_2', [[1, 16], [16, 4], [21, 9], [22, 8], [12, 13], [13, 12]], 3);
  const SACK_MONS = ['dustbun_custodian', 'puddipom_gourmet'], SACK_FLAG = (i) => 'kp_lq_twins_sack_' + 'abc'[i];
  const sacksOut = (s) => s.flag('kp_lq_twins_hurdy') && !s.flag('kp_lq_twins_gurdy');
  // ---- cutscene B: the reunion
  const reunion = function* (s, at) {
    const pl = tileOf(s, 'player') || [at[0], at[1] - 1];
    s.sfx('hop'); s.flash('#fff6e0', 12, 0.6); s.shake(2, 12);
    s.spawn('lq_gurdy', GURDY, at[0], at[1], 'down', { name: 'Gurdy', solid: false });
    const spot = nearFree(s, pl, 2, [at]) || pl;
    yield s.jump('lq_gurdy', spot[0], spot[1], 0.9, 26);
    yield s.face('lq_gurdy', 'player'); yield s.face('player', 'lq_gurdy');
    s.emote('lq_gurdy', '!!'); yield 30;
    yield s.msg('Maps! Maps everywhere! A small moogle bursts out of the sack in a blizzard of them.');
    yield s.say('Gurdy', 'Map, sir? Only 100 coins. Lovely maps. Some of them are even of here.');
    yield s.say('Gurdy', '...Wait. That\'s my SLEEVE.');
    s.spawn('lq_hurdy2', HURDY, 12, 16, 'up', { name: 'Hurdy', solid: false });
    yield s.say('Hurdy', 'GURDYYY!');
    const by = nearFree(s, spot, 1, [pl, at]) || spot;
    yield s.move('lq_hurdy2', pathTo(s, [12, 16], by), { run: true });
    yield s.face('lq_hurdy2', 'lq_gurdy'); yield s.face('lq_gurdy', 'lq_hurdy2');
    s.emote('lq_hurdy2', '♪'); s.emote('lq_gurdy', '♪'); s.sfx('ching');
    yield 40;
    yield s.say('Hurdy', 'You had the MAP!');
    yield s.say('Gurdy', 'You had the COAT!');
    yield s.msg('With a great deal of grumbling, the twins button themselves into one coat.');
    yield s.move('lq_hurdy2', spot[0], spot[1]);
    s.remove('lq_hurdy2'); s.flash('#ffffff', 14, 0.7); s.sfx('set');
    s.setModel('lq_gurdy', TWINS_M);
    yield 24;
    yield s.msg('They look complete. They do not look happy about it.');
    yield s.say('Hurdy', 'We\'ve a gig at the Bandstand on Costa del Kupo! The far end of the promenade.');
    yield s.say('Gurdy', 'And no rehearsal. Again. Come and listen, kupo! You can help.');
    s.set('kp_lq_twins_gurdy');
    yield s.move('lq_gurdy', pathTo(s, spot, [12, 16]), { run: true });
    s.remove('lq_gurdy');
  };
  const sack = (i) => function* (s) {
    const f = SACK_FLAG(i);
    if (!sacksOut(s) || s.flag(f)) return;
    const opened = [0, 1, 2].filter(k => s.flag(SACK_FLAG(k))).length;
    if (opened >= 2) { s.set(f); yield* reunion(s, SACKS[i]); return; }
    yield s.msg(opened ? 'Another sack. This one smells of old envelopes, and it\'s grumbling. You untie it...' : 'A mail sack stamped RETURN TO SENDER. It wriggles. It grumbles. You untie it...');
    s.sfx('found');
    const r = yield* KP.fight(s, { kind: 'wild', foes: [KP.make(SACK_MONS[opened], 47)], bg: 'town' });
    if (r === 'lose' || r === 'run') return;
    s.set(f);
    yield s.msg(opened ? 'Just a nest of shredded envelopes. ...The last sack is grumbling louder than ever.' : 'Just a nest of chewed-up letters. Somewhere else in the office, another sack grumbles.');
  };
  FF7.patchMap('kp_mognet_2', { objects: SACKS.map((at, i) => ({ id: 'lq_sack_' + 'abc'[i], at, prop: 'bush', col: i % 2 ? '#b09060' : '#c0a070', solid: true, hidden: true,
    tick(o, f) {
      const s = (f && f.api) || (FF7.fieldScene && FF7.fieldScene.api), out = !!s && sacksOut(s) && !s.flag(SACK_FLAG(i));
      o.hidden = !out; o.solid = out;
      const w = Math.sin((o.t || 0) * 0.35 + i) * (Math.sin((o.t || 0) * 0.04 + i * 2) > 0.2 ? 1 : 0);
      o.scl = [1 + w * 0.08, 1 - w * 0.07, 1 + w * 0.05];
    },
    talk: sack(i) })) });

  // ---- the Bandstand (16 x 12): at the east end of Costa del Kupo's promenade. A round bandstand under a red-and-white
  // striped canopy on four posts, two blocks of deck chairs facing it across the boardwalk, palms, the sea behind the
  // rail. The twins on the stage's front edge; the Pop Duo come in from the promenade.
  const SONG = [   // (piano1..6: do re mi fa so la)
    { notes: [1, 2, 3], play: 'Do, re, mi.', opts: ['Do, re, mi', 'Mi, re, do', 'Re, do, mi'], ans: 1 },
    { notes: [1, 3, 5, 4], play: 'Do, mi, so, fa.', opts: ['Fa, so, mi, do', 'Do, mi, so, fa', 'So, fa, do, mi'], ans: 0 },
    { notes: [2, 4, 6, 5, 1], play: 'Re, fa, la, so, do.', opts: ['Do, la, so, fa, re', 'Re, fa, la, so, do', 'Do, so, la, fa, re'], ans: 2 },
  ];
  const TW = 'lq_hurdygurdy', LYRA = 'lq_lyra', BELLE = 'lq_belle';
  const LYRA_M = { base: 'woman', top: '#e05a9a', sleeve: '#e05a9a', bottom: '#2a2a3a', skirt: 'short', hair: '#f0d050', hairStyle: 'ponytail', extras: ['bow', 'bangles'] };
  const BELLE_M = { base: 'woman', top: '#4ab8e0', sleeve: '#4ab8e0', bottom: '#f0f0f8', skirt: 'short', hair: '#3a2a6a', hairStyle: 'bob', extras: ['headband'] };
  const LYRA_TEAM = [['kupera_diva', 47], ['partypom_party_host', 47], ['rockupo_rock_star', 47]];
  const BELLE_TEAM = [['mopluff_dancer', 47], ['luchapom_luchador', 47], ['juggler_jester', 48]];
  const owns = (sp) => { const d = KP.data(); return !!d && (d.party || []).concat(d.box || []).some(m => m && m.sp === sp); };
  const twinsNpc = W.legend(TW, TWINS, { at: [7, 5], dir: 'down', scaled: true, lv: 46, abil: 0, bg: 'beach', scale: 1.1,
    show: s => s.flag('kp_lq_twins_gurdy'),
    intro: 'Hurdygurdy tunes up, both halves arguing about the key.',
    opening: '"One, two..." "No, I count!" "ONE, TWO, THREE, FOUR!" Hurdygurdy strikes up the band.',
    after: 'The twins bow, argue about who bowed first, and wander off to rehearse. They\'ll be back on the bandstand tomorrow.',
    done: 'kp_lq_twins_done',
    then: function* (s) {
      KP.give('dream_harp', 1); s.sfx('found');
      yield s.msg('Left on the bandstand, with a note: "For the act. Don\'t lose it. -H & G": ' + KP.got('dream_harp'));
      yield* KP.giveLegendItem(s, TWINS);   // (the first Duet Score: js/kupomon/kp_legendbreed.js)
      yield s.msg('The Half a Coat has been sewn up, neat as a pin. You decide to keep it.');
      if (owns('montblanc_clan_leader')) { yield s.say('Hurdy', 'Wait. Is that... big brother on your team?!'); yield s.say('Gurdy', 'Don\'t tell him we skipped practice, kupo!'); }
    } });
  twinsNpc.model = TWINS_M; twinsNpc.hover = 0.62;
  const twinsFight = twinsNpc.talk;
  const twinsBattle = function* (s) {
    if (!KP.SPECIES[TWINS]) { yield s.say('Hurdy', 'Battle? Not today, kupo. Gurdy\'s lost the sheet music.'); return; }
    yield* twinsFight(s);
  };
  // step 4: call and response (Gurdy answers backwards); a wrong answer starts the song again from the top
  const rehearse = function* (s) {
    yield s.say('Hurdy', 'Rehearsal! I play a phrase, Gurdy answers it. Back to front. That\'s the act.');
    yield s.say('Gurdy', 'I never remember which front is the back. You pick, Champion. I\'ll sing it.');
    for (let tries = 0; tries < 3; tries++) {
      let r = 0;
      for (; r < SONG.length; r++) {
        const R = SONG[r];
        s.emote(TW, '♪');
        for (const n of R.notes) { s.sfx('piano' + n); yield 16; }
        yield s.say('Hurdy', '♪ ' + R.play);
        const c = yield s.ask('Gurdy', 'How does Gurdy answer?', R.opts);
        if (c !== R.ans) break;
        for (const n of R.notes.slice().reverse()) { s.sfx('piano' + n); yield 16; }
        yield s.say('Gurdy', '♪ ' + R.opts[R.ans] + '.');
        if (r < SONG.length - 1) yield s.say('Hurdy', r === 0 ? 'Not bad! The next one\'s longer.' : 'Ooh. Now the big one.');
      }
      if (r === SONG.length) {
        s.set('kp_lq_twins_song'); s.sfx('levelup');
        yield s.say('Hurdy', 'That\'s the act! Now all we need is a crowd that\'s warmed up.');
        yield* popDuoArrive(s);
        return;
      }
      s.sfx('error');
      yield s.say('Hurdy', 'That\'s not backwards, that\'s SIDEWAYS!');
      yield s.say('Gurdy', 'You played it wrong!');
      yield s.say('Hurdy', 'Did NOT! ...From the top, kupo.');
    }
    yield s.msg('The twins stomp off to opposite ends of the coat to sulk. (Talk to them to try again.)');
  };
  const popDuoArrive = function* (s) {
    s.show(LYRA, 1, 6, 'right'); s.show(BELLE, 1, 6, 'right');
    yield s.say('Lyra', 'Hold it!');
    yield [s.move(LYRA, [[4, 6], [4, 5]]), s.move(BELLE, [[3, 6], [3, 5]])];
    yield s.face(LYRA, 'player'); yield s.face(BELLE, 'player');
    yield s.say('Lyra', 'A crowd this size needs an opening act. And the opening act is US.');
    yield s.say('Belle', 'The Pop Duo! Lyra and Belle! ...You\'ve heard of us. Everybody\'s heard of us.');
    yield s.say('Hurdy', 'Never heard of them.');
    yield s.say('Gurdy', 'Never.');
    yield s.say('Lyra', 'Beat us, and the stage is theirs. Lose, and they can carry our speakers. Talk to us when you\'re ready, Champion!');
  };
  // step 5: the Pop Duo, one after the other; then cutscene C (the encore) and the encounter
  const popDuo = (who) => function* (s) {
    if (s.flag('kp_lq_twins_duo')) {
      if (who === LYRA) yield s.say('Lyra', s.flag('kp_lq_twins_done') ? 'The twins went off with YOU? Fine. More stage for us.' : 'We\'re the warm-up act now. It\'s fine. We\'re FINE.');
      else yield s.say('Belle', s.flag('kp_lq_twins_done') ? 'Don\'t get used to it. We\'ll be back next week. With a key change.' : 'Next time, WE\'RE the encore.');
      if (who !== LYRA || !s.flag('kp_lq_twins_done')) return;
      // (Lyra, after: copies of the twins' sheet music, for the Kupo Ranch; js/kupomon/kp_legendbreed.js)
      yield s.say('Lyra', 'They left their sheet music behind. Written for two players at once. We copy it out and sell it. We are NOT sentimental.');
      yield* KP.legendItemShop(s, TWINS, { who: 'Lyra', done: 'kp_lq_twins_done' });
      return;
    }
    if (!s.flag('kp_lq_twins_lyra')) {
      yield s.face(LYRA, 'player');
      yield s.say('Lyra', 'Ready to be upstaged? Hit it!');
      const r = yield* duel(s, { name: 'Pop Star Lyra', model: LYRA_M, team: LYRA_TEAM, bg: 'beach', money: 2600, lose: 'Off-key... I went OFF-KEY!' });
      if (r !== 'win') return;
      s.set('kp_lq_twins_lyra');
    }
    yield s.face(BELLE, 'player');
    yield s.say('Belle', 'My turn! Try and keep up with the choreography!');
    const r2 = yield* duel(s, { name: 'Pop Star Belle', model: BELLE_M, team: BELLE_TEAM, bg: 'beach', money: 2600, lose: 'I tripped over my own big finish...' });
    if (r2 !== 'win') return;
    s.set('kp_lq_twins_duo');
    yield s.say('Lyra', 'Fine. FINE. The stage is theirs.');
    yield* encore(s);
  };
  const encore = function* (s) {
    const CROWD = ['lq_bs_fan1', 'lq_bs_fan2', 'lq_bs_man', 'lq_bs_kid'];
    s.music('cinco_chocobo');
    yield s.cam(7, 4, 40, { dist: 8, pitch: 38 });
    for (let i = 0; i < 3; i++) { s.emote(TW, '♪'); s.sfx('piano' + [1, 3, 5][i]); yield 26; }
    yield s.msg('The twins play their piece: a jig, then a waltz, then the jig again, because they couldn\'t agree.');
    CROWD.forEach((id, i) => s.emote(id, i % 2 ? '♪' : '!'));
    s.sfx('ching'); yield 30;
    yield s.say('Crowd', 'Encore! ENCORE!');
    yield s.say('Hurdy', 'Encore?');
    yield s.say('Gurdy', 'No: ENCORE BATTLE!');
    const pl = tileOf(s, 'player') || [7, 6], to = nearFree(s, pl, 1, []) || [7, 6];
    yield [s.jump(TW, to[0], to[1], 0.7, 24), s.hover(TW, 0, 24)];
    yield s.face(TW, 'player'); yield s.face('player', TW);
    s.camFollow(30);
    yield* twinsBattle(s);
    if (s.mapId() === STAGE) s.music('costadelsol');
  };
  twinsNpc.talk = function* (s) {
    if (!s.flag('kp_lq_twins_song')) { yield* rehearse(s); return; }
    if (!s.flag('kp_lq_twins_duo')) { yield s.say('Hurdy', 'The crowd wants the Pop Duo first. Go on, show \'em how it\'s done!'); yield s.say('Gurdy', 'We\'ll tune up. Again. He\'s always flat.'); return; }
    yield* twinsBattle(s);
  };
  const folk = (id, name, model, at, dir, lines, o = {}) => Object.assign({ id, name, model, at, dir, talk: function* (s) { yield s.say(name, typeof lines === 'function' ? lines(s) : lines); } }, o);
  const CHAIRS = ['#e05a5a', '#5a9ae0', '#f0c040'];
  const BS = [
    "P%P%P%P%P%P%P~~~",
    "%sPsssSSSSssP=~~",
    "%ssssSSSSSSss=~~",
    "%ssssSSSSSSss=~~",
    "%ssssSSSSSSss=~~",
    "%sPsssSSSSssP=~~",
    "::::::::::sss=~~",
    "%scccss::sccc=~~",
    "%ssssss::ssss=~~",
    "%scccss::sccc=~~",
    "%ssssss::ssss=~~",
    "%%%%%%%%%%%%%~~~",
  ];
  const deco = (grid, ch, f) => { const out = []; grid.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === ch) out.push(Object.assign({ at: [x, y] }, f(x, y))); }); return out; };
  const palm = (x, y) => ({ prop: 'canopy', r: 0.95 + ((x * 7 + y * 3) % 4) * 0.1, h: 2.3 + ((x + y) % 3) * 0.3, col: '#3e8a3a', col2: '#8a6a44' });
  // the striped canopy: rings of red and white, each smaller and higher (seen from the camera, stripes)
  const RED = '#d83a4a', WHITE = '#f4f0e8';
  const canopy = [[2.9, 3.2, WHITE, RED], [2.1, 3.36, RED, WHITE], [1.3, 3.5, WHITE, RED], [0.55, 3.62, RED, RED]]
    .map(([r, lift, top, rim]) => ({ at: [7.5, 3], prop: 'disc', r, h: 0.12, lift, col: rim, top, rim, rimW: 0.3, fade: true }));
  FF7.defineMap(STAGE, {
    name: 'Costa del Kupo - Bandstand', area: 'Costa del Kupo', theme: 'beach', music: 'costadelsol', kpBg: 'beach',
    look: { sky: ['#4a9ae0', '#f0faff'], grass: ['#7aa850', '#72a04a'], water: '#2a8ab8', floor2: ['#e8dcc0', '#e0d4b8'], wood: ['#9a7a50', '#8a6a44'], floorTex: { floor2: 'tiles' }, pillar: WHITE },
    grid: BS,
    legend: { S: 'block', P: 'block' },
    props: deco(BS, 'P', palm).concat(deco(BS, 'c', (x, y) => ({ prop: 'chair', col: CHAIRS[(x + y) % 3], rot: 180 })), [
      { at: [7.5, 3], prop: 'disc', r: 2.4, h: 0.6, col: '#f4efe4', top: '#b88a58', rim: '#e8e0cc', rimW: 0.12 },
      ...[[6.02, 1.52], [8.98, 1.52], [6.02, 4.48], [8.98, 4.48]].map(at => ({ at, prop: 'pillar', h: 2.6, col: WHITE, col2: '#d8b848', lift: 0.6, fade: true })),
      ...canopy,
      { at: [7.5, 4.6], prop: 'banner', col: '#2a5aa0', col2: '#f0d060', w: 2.4, h: 0.45, y: 2.9, text: 'LIVE MUSIC', textCol: '#f8f0d0', size: 0.13 },   // (between the front pillars: at the back the canopy hid it, above the screen)
      { at: [0, 5], prop: 'sign', text: 'BANDSTAND' },
    ]),
    lights: [[7.5, 3, '#fff0c0', 4]],
    entries: { from_costa: [1, 6, 'right'] },
    exits: [{ at: [0, 6, 1, 1], to: 'kp_costa', entry: 'from_bandstand' }],
    npcs: [
      twinsNpc,
      { id: LYRA, name: 'Lyra', model: LYRA_M, at: [4, 5], dir: 'down', show: s => s.flag('kp_lq_twins_song'), talk: popDuo(LYRA) },
      { id: BELLE, name: 'Belle', model: BELLE_M, at: [3, 5], dir: 'down', show: s => s.flag('kp_lq_twins_song'), talk: popDuo(BELLE) },
      folk('lq_bs_fan1', 'Sunbather', 'beach_woman', [3, 7], 'up', s => s.flag('kp_lq_twins_done') ? 'The twins left with YOU? ...Well. The deck chairs are still very nice.'
        : s.flag('kp_lq_twins_gurdy') ? 'Twins! In one coat! I\'ve never been so excited and so confused at the same time.' : 'The band\'s late. The band is ALWAYS late. I\'ve been in this chair since Tuesday.', { anim: 'sit', hover: 0.14 }),
      folk('lq_bs_fan2', 'Tourist', 'beach_man', [11, 9], 'up', 'I come for the sea breeze. The music\'s a bonus. Sometimes it\'s a penalty.', { anim: 'sit', hover: 0.14 }),
      folk('lq_bs_man', 'Old Salt', 'oldman3', [9, 8], 'up', 'Back in my day the bandstand had a brass band. Forty moogles, one tuba. Nobody ever found out who had the tuba.'),
      folk('lq_bs_kid', 'Kid', 'kid4', [5, 10], 'up', 'When I grow up I\'m going to play the bandstand! Or be a moogle. Whichever\'s easier.', { wander: 1 }),
      W.moogle('lq_bs_mog', 'kupera_chorister', [3, 3], { wander: 1, line: 'Kupera: La la laaa! It is warming up its voice for the show. Loudly.' }),
    ],
    triggers: [W.sign([0, 5], 'THE BANDSTAND\fLive music most evenings. The band is usually late.')],
  });
  KP.legendSeller(TWINS, STAGE, LYRA);
  // Costa del Kupo: the promenade runs on east through a gap in the trees to the Bandstand (the gap opened here)
  {
    const C = FF7.maps.kp_costa, T = taken('kp_costa'), edge = !T.has('29,9');
    if (edge && C.grid[9][29] === 'T') { C.grid = C.grid.slice(); C.grid[9] = C.grid[9].slice(0, 29) + ':' + C.grid[9].slice(30); delete C._parsed; }
    const EX = edge ? [29, 9] : [28, 9];
    C.entries.from_bandstand = [EX[0] - 1, EX[1], 'left'];
    (C.props = C.props || []).push({ at: [29, 8], prop: 'sign', text: 'BANDSTAND' });
    FF7.patchMap('kp_costa', { exits: [{ at: [EX[0], EX[1], 1, 1], to: STAGE, entry: 'from_costa' }],
      triggers: T.has('29,8') ? [] : [W.sign([29, 8], 'EAST: THE BANDSTAND\fLive music most evenings. (The band is usually late.)')] });
  }

  // =================================================================== 14. KUPOFRIED: THE DREAM KING
  const SHEEP = { enemy: 'kp_woolpom_shepherd', scale: 0.7 }, NUT = { prop: 'bush', col: '#b07a3a', scale: 0.35 };
  const ZACK_V = { base: 'zack', skin: '#d8c4f0', hair: '#3a2a7a', top: '#6a4ac0', bottom: '#5a3aa8', boots: '#4a3a7a' };
  const SEPH_V = { base: 'sephiroth', skin: '#e0d4f8', hair: '#c4b4f4', top: '#3a2a70', sleeve: '#3a2a70', bottom: '#3a2a70', boots: '#3a2a70', gloves: '#3a2a70', coatColor: '#3a2a70' };
  const ZACK_TEAM = [['chocomog_knight', 48], ['mopluff_dancer', 48], ['grumog_viking', 48]];
  const SEPH_TEAM = [['ghostmog_specter', 48], ['darkmog_knight', 48], ['lancemog_highwind', 48]];
  const ROUNDS = [   // (+1: one hops over to this side; -1: one hops back)
    { seq: [1, 1, 1, -1], opts: ['One', 'Two', 'Three'], ans: 1 },
    { seq: [1, 1, -1, 1, 1, -1, 1], opts: ['Two', 'Three', 'Four'], ans: 1 },
    { seq: [1, 1, 1, -1, 1, 1, 1, -1, 1], opts: ['Four', 'Five', 'Six'], ans: 1 },
  ];
  const VOICE = (t) => '“' + t + '”';
  const WAKE_AT = [5, 9, 'left'];   // (beside the bed in the Champions' Rest)
  const wake = function* (s, line) {
    yield s.fadeOut(40);
    KP._lqWake = true;
    yield s.goto('kp_coliseum_hotel', WAKE_AT);
    yield 30;
    s.stopAnim('player');
    if (line) yield s.msg(line);
  };
  FF7.patchMap('kp_coliseum_hotel', { onLoad: s => { if (KP._lqWake) { KP._lqWake = false; s.anim('player', 'kneel'); } } });
  // step 3: counting Woolpoms over the fence (three rounds; a wrong count starts again; three tries a night)
  const countSheep = function* (s) {
    yield s.cam(6, 6, 30);
    for (let tries = 0; tries < 3; tries++) {
      let ok = true;
      for (let r = 0; r < ROUNDS.length && ok; r++) {
        const R = ROUNDS[r], south = [], ids = [];
        yield s.say(null, VOICE(r === 0 ? 'Count them for me, kupo. Only the ones on your side.' : r === 1 ? 'More now. Keep counting...' : 'Last ones. Don\'t you dare nod off.'));
        let n = 0;
        for (const st of R.seq) {
          if (st > 0) {
            const id = 'lq_sheep' + n, x = 3 + (n * 3) % 7; n++;
            s.spawn(id, SHEEP, x, 3, 'down', { name: 'Woolpom', solid: false });
            ids.push(id);
            yield s.move(id, x, 5, { speed: 0.06 });
            yield s.jump(id, x, 7, 0.9, 22);
            south.push([id, x]);
          } else {
            const [id, x] = south.pop();
            yield s.face(id, 'up');
            yield s.jump(id, x, 5, 0.9, 22);
            yield s.move(id, x, 3, { speed: 0.06 });
          }
          yield 4;
        }
        const c = yield s.ask(null, VOICE('How many are on this side?'), R.opts);
        ids.forEach(id => s.remove(id));
        if (c === R.ans) { s.sfx('confirm'); continue; }
        ok = false; s.sfx('error');
        yield s.say(null, VOICE('You fell asleep! In a dream! Start again.'));
      }
      if (ok) { s.camFollow(30); return true; }
    }
    s.camFollow(30);
    return false;
  };
  // a dream rival lost: no blackout, you only wake up (the team rested)
  const dreamLost = function* (s) {
    KP.healAll(); s.sfx('heal');
    yield* wake(s, 'You wake up with a start in the Champions\' Rest. Your moogles are curled up on the pillow, safe and sound.');
  };
  // cutscene B and step 4: the dream rivals; then the Dream Ring and waking up
  const dreamRivals = function* (s) {
    s.flash('#9070ff', 30, 0.7); s.sfx('magic');
    if (!s.flag('kp_lq_dream_zack')) s.spawn('lq_dzack', ZACK_V, 4, 8, 'right', { name: 'Zack', solid: false });
    s.spawn('lq_dseph', SEPH_V, 9, 8, 'left', { name: 'Sephiroth', solid: false, anim: 'armscross' });
    yield s.msg(s.flag('kp_lq_dream_zack') ? 'A tall shape gathers out of the mist again, arms folded.' : 'Two shapes gather out of the mist.');
    if (!s.flag('kp_lq_dream_zack')) {
      s.anim('lq_dzack', 'wave');
      yield s.say('Zack', 'Cloud! Buddy! Is this a dream? It\'s a dream. I can tell, because Seph\'s smiling.');
      yield s.say('Sephiroth', 'I am not.');
      s.stopAnim('lq_dzack');
      yield s.say('Zack', '...See? Dream. C\'mon, Cloud. For old times\' sake!');
      const r = yield* duel(s, { name: 'Zack', model: ZACK_V, team: ZACK_TEAM, bg: 'night', music: (KP.RIVALS.zack || {}).music, canLose: true, money: 2400,
        lose: 'Ha! You got me. Even in my sleep!', win: 'Gotcha! ...Hey, you\'re waking up!' });
      if (r !== 'win') { yield* dreamLost(s); return; }
      s.set('kp_lq_dream_zack');
      s.flash('#c0b0ff', 20, 0.6); s.sfx('ching'); s.remove('lq_dzack');
      yield s.msg('Zack laughs, waves, and comes apart into stars.');
    }
    yield s.face('lq_dseph', 'player');
    yield s.say('Sephiroth', 'A dream. Then nobody will remember who lost.');
    const r2 = yield* duel(s, { name: 'Sephiroth', model: SEPH_V, team: SEPH_TEAM, bg: 'night', music: (KP.RIVALS.sephiroth || {}).music, canLose: true, money: 2400,
      lose: '...I will remember.', win: 'Wake up, Cloud.' });
    if (r2 !== 'win') { yield* dreamLost(s); return; }
    s.set('kp_lq_dream_rivals');
    s.flash('#c0b0ff', 20, 0.6); s.sfx('ching'); s.remove('lq_dseph');
    yield s.msg('Sephiroth doesn\'t laugh. He comes apart into stars anyway.');
    yield s.say(null, VOICE('Two old friends. Lovely. Now wake up, before you get comfortable. Come back wearing that.'));
    yield s.msg('Something small and cool slips onto your finger...');
    yield* wake(s);
    s.set('kp_lq_dream_ring'); KP.give('lq_dream_ring', 1); s.sfx('found');
    yield s.msg('You wake up wearing a ring you have never seen before. ' + KP.got('lq_dream_ring'));
    yield s.say('Dio', 'Nice ring. Did you have that last night?');
  };
  // the first sleep: cutscene A, the Woolpoms, the rivals
  const dreamFirst = function* (s) {
    s.spawn('lq_nut1', NUT, 1, 4, 'right', { solid: false, hover: 1.6 }); s.move('lq_nut1', 12, 5, { speed: 0.008, noWait: true });
    s.spawn('lq_nut2', NUT, 12, 8, 'left', { solid: false, hover: 1.3 }); s.move('lq_nut2', 1, 7, { speed: 0.006, noWait: true });
    yield 50;
    s.stopAnim('player');
    yield s.msg('You are lying on a floor of stars. Kupo Nuts drift by overhead, taking their time.');
    if (!s.flag('kp_lq_dream_sheep')) {
      yield s.say(null, VOICE('Ah. You came. Everybody does, in the end.'));
      const ok = yield* countSheep(s);
      if (!ok) { yield* wake(s, 'You wake up with a start. Counting sheep is harder than it looks.'); return; }
      s.set('kp_lq_dream_sheep');
      yield s.say(null, VOICE('Very good. You stayed awake. Hardly anybody does. ...Now, who else is in here?'));
    }
    yield* dreamRivals(s);
  };
  // the Dream King himself (on the throne): the legend, made here so its talk can follow cutscene C
  const kingNpc = W.legend('lq_kupofried', DREAM, { at: [7, 1], dir: 'down', scaled: true, lv: 48, abil: 0, bg: 'night', scale: 1.15,
    show: () => false,   // (he only comes down in the second sleep: cutscene C)
    intro: 'Kupofried floats on its crescent, yawning.',
    opening: 'Kupofried yawns, and the whole dream yawns with it. "Let\'s see if you can stay awake for this, kupo."',
    after: 'Kupofried yawns an enormous yawn and melts into the moonlight.',
    done: 'kp_lq_dream_done',
    then: function* (s) {
      yield* wake(s);
      KP.give('shadow_fragment', 1); KP.give('sleepy_nut', 5); s.sfx('found');
      yield s.msg('On the pillow beside you: a Shadow Fragment and 5 Sleepy Nuts.');
      yield* KP.giveLegendItem(s, DREAM);   // (and the pillow itself, the first Dream Pillow: js/kupomon/kp_legendbreed.js)
      yield s.msg('The Dream Ring is still on your finger. You decide to keep it.');
      yield s.say('Dio', 'Sweet dreams? You were counting in your sleep. You got very high. Then you started over.');
    } });
  kingNpc.model = mon(DREAM, 'woolpom_animist', 1.15); kingNpc.hover = 0.5;
  const kingFight = kingNpc.talk;
  kingNpc.talk = function* (s) { if (KP.SPECIES[DREAM]) yield* kingFight(s); };
  // the second sleep: cutscene C and the encounter
  const dreamKing = function* (s) {
    const K = 'lq_kupofried';
    yield 20;
    if (!KP.SPECIES[DREAM]) { yield s.msg('The moon in the window flickers... but nobody comes down tonight.'); yield* wake(s); return; }
    const seen = s.flag('kp_lq_dream_king');
    s.stopMusic(30);
    yield s.cam(7, 1, 60, { dist: 5.5, pitch: 22 });
    s.sfx('magic'); s.flash('#fff2c8', 30, 0.5);
    yield s.msg(seen ? 'The moon swells in the window again...' : 'The moon in the window swells... and swells... until silver light fills the whole room.');
    s.show(K, 7, 1, 'down'); s.hover(K, 3);
    s.music('dream');
    yield s.hover(K, 0.5, 90);
    s.emote(K, '...'); yield 40;
    if (!seen) {
      yield s.msg('A small moogle comes down on a crescent of moonlight: a nightcap over a tiny crown, a royal robe, and a yawn bigger than the rest of it.');
      yield s.say('Kupofried', 'The one who met them all! Come in, come in. Tell me about every single one...');
      yield s.say('Kupofried', '...Actually, show me. Talking makes me sleepy.');
      s.set('kp_lq_dream_king');
    } else yield s.say('Kupofried', 'Back again? Good. I was just dreaming about you.');
    s.camFollow(30);
    yield s.move('player', 7, 2);
    yield s.face('player', 'up');
    yield* kingFight(s);
    if (s.mapId() === DLAB && !s.flag('kp_legend_lq_kupofried')) yield* wake(s, 'You wake up in the Champions\' Rest. The pillow smells faintly of moonlight.');
  };
  // falling asleep (Dio's beds): the first sleep, or straight to the throne with the ring on
  const sleep = function* (s) {
    const ring = s.flag('kp_lq_dream_ring');
    yield s.fadeOut(40);
    KP.healAll(); s.sfx('heal');
    yield 40;
    s.sfx('ching');
    yield s.caption('...zzz...', { hold: 100, bg: '#000', aboveFade: true });
    KP._lqDreamLie = !ring;
    yield s.goto(DLAB, ring ? 'throne' : 'start');
    if (ring) yield* dreamKing(s); else yield* dreamFirst(s);
  };
  // ---- step 1: Prof. Sith, after the Diploma
  wrapTalk('kp_lab', 'prof', old => function* (s) {
    yield* old(s);
    if (!s.flag('kp_diploma')) return;
    if (!s.flag('kp_lq_dream_open')) {
      s.set('kp_lq_dream_open');
      yield s.say('Prof. Sith', 'Och, and one more thing, laddie. They say a trainer who\'s met every moogle gets a visit from the Dream King.');
      yield s.say('Prof. Sith', 'Get some sleep, Champion. Dio\'s beds at the Coliseum are dreadful. That helps, kupo.');
      return;
    }
    if (s.flag('kp_lq_dream_done') && !s.flag('kp_lq_dream_prof')) { s.set('kp_lq_dream_prof'); yield s.say('Prof. Sith', 'The Dream King! In MY lab! ...Well, in a dream of my lab. I\'m still puttin\' it in the paper.'); }
    else if (!s.flag('kp_lq_dream_done')) yield s.say('Prof. Sith', 'Slept yet? The Champions\' Rest, laddie. Dio\'s beds. Dreadful. That\'s the point.');
  });
  // ---- step 2: Dio's beds (the Champions' Rest)
  wrapTalk('kp_coliseum_hotel', 'cht_dio', old => function* (s) {
    // (after the Dream King: his pillows first, sold for the Kupo Ranch, js/kupomon/kp_legendbreed.js; then the nap,
    // as ever)
    if (s.flag('kp_lq_dream_done')) {
      yield s.say('Dio', 'The Dream King left his pillows behind! Stuffed with his very own clouds. Champions deserve nothing less, and pay accordingly!');
      yield* KP.legendItemShop(s, DREAM, { who: 'Dio', done: 'kp_lq_dream_done' });
      yield* old(s); return;
    }
    if (!s.flag('kp_lq_dream_open')) { yield* old(s); return; }
    const ring = s.flag('kp_lq_dream_ring');
    const c = yield s.ask('Dio', ring ? 'Back for another nap? Splendid! That ring of yours goes beautifully with the pillows.'
      : 'Rest? Splendid! The Champions\' Rest never closes. Its guests\' eyes do, eventually!', ['Rest', 'Not now']);
    if (c !== 0) { yield s.say('Dio', 'Come back any time! The pillows are stuffed with moogle fluff. Shed naturally! Mostly.'); return; }
    yield* sleep(s);
  });
  KP.legendSeller(DREAM, 'kp_coliseum_hotel', 'cht_dio');

  // ---- the Dreaming Lab (14 x 12): Prof. Sith's lab as a dream. A floor of stars, the bookshelves floating up by
  // the ceiling, Kupo Nuts drifting past, a huge moon in the window, a low fence across the middle (a stile at the east
  // end), the pods glowing violet, and a crescent-moon throne where the professor would stand. The lab's door wakes
  // you up.
  const DL = [
    "##############",
    "#......T.....#",
    "#............#",
    "#.y.......y..#",
    "#............#",
    "#............#",
    "#=========...#",
    "#............#",
    "#............#",
    "#.y.......y..#",
    "#............#",
    "######+#######",
  ];
  const STARS = [];
  for (let i = 0, r = 11; i < 48; i++) {   // (a fixed scatter: the same sky every night)
    r = (r * 9301 + 49297) % 233280; const x = 0.7 + (r % 1260) / 100;
    r = (r * 9301 + 49297) % 233280; const y = 0.7 + (r % 1040) / 100;
    STARS.push({ at: [Math.round(x * 10) / 10, Math.round(y * 10) / 10], text: '*', size: 0.08 + (i % 4) * 0.025, col: ['#f4f0ff', '#c8d8ff', '#fff0c0', '#e0c8ff'][i % 4], glow: true, y: 0.012, rot: (i * 37) % 90 });
  }
  FF7.defineMap(DLAB, {
    name: 'The Dreaming Lab', area: 'Kupo Coliseum', theme: 'lab', music: 'dream', kpBg: 'night',
    look: { floor: ['#16143c', '#121036'], floor2: ['#1c1846', '#18143e'], floorTex: false, wall: '#2a2458', trim: '#8a6ad8', wallH: 2.8, mako: '#c090ff',
      sky: ['#05041a', '#1a1040'], ambient: [0.32, 0.3, 0.48], light: [0.56, 0.5, 0.84], fog: { color: [0.06, 0.04, 0.16], near: 10, far: 28 } },
    grid: DL,
    legend: { T: 'block' },
    props: [
      // the moon in the window, two small round windows of stars either side
      { at: [7, 0], prop: 'porthole', r: 1.0, y: 1.6, col: '#100c3a', col2: '#c8b070' },
      { at: [3, 0], prop: 'porthole', r: 0.35, y: 1.8, col: '#0c0a2e', col2: '#8a6ad8' }, { at: [11, 0], prop: 'porthole', r: 0.35, y: 1.8, col: '#0c0a2e', col2: '#8a6ad8' },
      // the crescent-moon throne: a dais, a golden crescent standing on its back (the seat in its hollow), a cushion
      { at: [7, 1], prop: 'disc', r: 0.75, h: 0.3, col: '#3a2a6a', top: '#5a4a9a', rim: '#e8d070', rimW: 0.12 },
      ...Array.from({ length: 13 }, (_, i) => {
        const a = (160 + i * 220 / 12) * Math.PI / 180, k = Math.sin(i / 12 * Math.PI), sc = 0.26 + 0.44 * k * k, h = 0.95 + 0.5 * Math.sin(a);
        return { at: [7 + Math.cos(a) + 0.0001 * i, 0.8], prop: 'bush', col: i % 2 ? '#f8c838' : '#ffd84a', scale: sc, lift: h - 0.175 * sc };
      }),
      { at: [7.001, 1], prop: 'cushion', col: '#8a5ad0', lift: 0.3 },
      // the moon itself, swelling out of the round window
      { at: [7, 0.75], prop: 'bush', col: '#ffffff', scale: 1.5, lift: 1.4 },
      // the bookshelves, floating up by the ceiling where the lab keeps them on the floor
      ...[1, 2, 3].map(x => ({ at: [x, 1], prop: 'bookshelf', col: '#4a3a6a', lift: 1.9, fade: true })),
      { at: [12, 4], prop: 'bookshelf', col: '#4a3a6a', lift: 2.1, rot: -90, fade: true },
      // Kupo Nuts adrift
      ...[[3.3, 2.4, 1.6], [9.6, 4.2, 1.2], [4.7, 8.3, 1.8], [11.2, 7.6, 1.4], [2.6, 10.2, 1.1], [8.4, 9.6, 2.0], [5.5, 4.6, 2.2]]
        .map(([x, y, l]) => ({ at: [x, y], prop: 'bush', col: '#b07a3a', scale: 0.3, lift: l })),
    ],
    labels: STARS,
    lights: [[7, 1, '#fff0c0', 3.6], [7, 1, '#fff8e0', 1.6], [6, 9, '#a090ff', 2.4]],
    entries: { start: [6, 9, 'up'], throne: [7, 3, 'up'] },
    exits: [{ at: [6, 11, 1, 1], sfx: 'door', run: function* (s) { yield s.msg('You open the lab door onto nothing at all... and wake up.'); yield* wake(s); } }],
    npcs: [kingNpc],
    onLoad: s => { if (KP._lqDreamLie) { KP._lqDreamLie = false; s.anim('player', 'lie'); } },
  });

  // =================================================================== the Demo's plans (KP.QUESTS: kp_runner.js O.kp_quests)
  // the MogNet Swap chain: the moogle that came back last time, else the spare brought from the Mog Box for it, else
  // the team's weakest that isn't a legend (the swap won't take those)
  const swappable = (m) => !!m && ((KP.SPECIES[m.sp] || {}).rate || 120) > 5;
  const pickSwap = (ch) => {
    if (!ch || ch[ch.length - 1] !== 'Cancel') return null;
    const d = KP.data(), P = (d && d.party) || [];
    let i = P.findIndex(m => m && m.uid && m.uid === d.swapLast);
    if (i < 0) i = P.findIndex(m => m && m.uid && m.uid === d.lqSpare);
    if (i < 0) P.forEach((m, k) => { if (!swappable(m)) return; if (i < 0 || m.lv < P[i].lv || (m.lv === P[i].lv && (m.plus || 0) <= (P[i].plus || 0))) i = k; });
    return i >= 0 && i < ch.length - 1 ? i : null;
  };
  // as a player would, the chain is passed with a spare from the Mog Box (the team's weakest waits in the box till it's
  // over), and the moogle the seventh parcel brought goes to the box after; with nothing in the box, a team member goes
  const spareIn = ['js', function* (api, R) {
    const d = KP.data(), spare = (d.box || []).filter(swappable).sort((a, b) => a.lv - b.lv)[0];
    if (!spare) return true;
    const out = d.party.length >= KP.PARTY_MAX ? d.party.filter(swappable).sort((a, b) => a.lv - b.lv)[0] : null;
    if (d.party.length >= KP.PARTY_MAX && !out) return true;
    const r = yield* R.ops.kp_box(out ? { leave: [out], take: [spare] } : { take: [spare] });
    if (r === true) { d.lqSpare = spare.uid; d.lqSpareOut = out ? out.uid : null; } else if (R.note) R.note('twins: ' + r);
    return true;
  }, { done: { any: ['kp_lq_twins_open', { var: 'kp_lq_twins_chain', atLeast: 1 }] } }];
  const spareOut = ['js', function* (api, R) {
    const d = KP.data(), last = d.party.find(m => m.uid === d.swapLast), back = (d.box || []).find(m => m.uid === d.lqSpareOut);
    if (!d.lqSpare || !last) return true;
    const r = yield* R.ops.kp_box(back ? { leave: [last], take: [back] } : { leave: [last] });
    if (r !== true && R.note) R.note('twins: ' + r);
    delete d.lqSpare; delete d.lqSpareOut;
    return true;
  }, { done: 'kp_lq_twins_gurdy' }];
  const RANCH = 'kp_mogfield_ranch', HOTEL = 'kp_coliseum_hotel';
  KP.QUESTS = KP.QUESTS || {};
  KP.QUESTS.fate = {
    name: 'Fatepom: A Pom of Destiny', order: 12, done: 'kp_lq_fate_done',
    ready: () => flagOn('kp_lq_fate_open') && !!KP.SPECIES[FATE],
    plan: [
      ['goto', RANCH, { done: 'kp_lq_fate_star' }],   // (the star: when the +5 hatch didn't show it already)
      ['talk', 'kp_granny', { map: 'kp_town_house', done: 'kp_lq_fate_granny' }],
      ['talk', 'kp_r6_crow3', { map: 'kp_route6', done: 'kp_lq_fate_t1' }],
      ['use', WIND[0], WIND[1], { map: 'kp_route6', done: 'kp_lq_fate_t3' }],
      ['talk', 'kp_mf_duck1', { map: 'kp_mogfield', choose: 'Ask nicely', done: 'kp_lq_fate_t2' }],
      win('kp_lq_fate_rancher', 'kp_summit_2', ['talk', 'rancher', { map: RANCH, choose: 'Bring it on', done: 'kp_lq_fate_rancher' }]),
      win('kp_legend_lq_fatepom', null, ['goto', LOFT],
        ['use', NEST[0], NEST[1], { choose: 'Star', done: 'kp_lq_fate_card' }],
        ['talk', 'lq_fatepom', { done: { any: ['kp_legend_lq_fatepom', absent(LOFT, 'lq_fatepom')] } }]),
    ],
  };
  KP.QUESTS.twins = {
    name: 'Hurdygurdy: The Twin Act', order: 13, done: 'kp_lq_twins_done',
    ready: () => flagOn('kp_league_1') && !!KP.SPECIES[TWINS],
    plan: [
      spareIn,
      ...[1, 2, 3, 4, 5, 6, 7].map(n => ['talk', 'kp_mfr_mognet', { map: RANCH, choose: ['Yes', pickSwap, 'Yes'],
        done: { any: ['kp_lq_twins_open', { var: 'kp_lq_twins_chain', atLeast: n }] } }]),
      ['talk', 'lq_hurdy', { map: RANCH, done: 'kp_lq_twins_hurdy' }],
      spareOut,
      win('kp_lq_twins_gurdy', 'kp_summit_2', ['goto', 'kp_mognet_2'],
        ...SACKS.map((at, i) => ['use', at[0], at[1], { done: i < 2 ? { any: [SACK_FLAG(i), 'kp_lq_twins_gurdy'] } : 'kp_lq_twins_gurdy' }])),
      ['talk', TW, { map: STAGE, choose: SONG.map(R => R.opts[R.ans]), done: 'kp_lq_twins_song' }],
      win('kp_lq_twins_duo', 'kp_summit_2', ['talk', LYRA, { map: STAGE, done: 'kp_lq_twins_duo' }]),
      win('kp_legend_lq_hurdygurdy', null, ['goto', STAGE], ['talk', TW, { done: { any: ['kp_legend_lq_hurdygurdy', absent(STAGE, TW)] } }]),
    ],
  };
  KP.QUESTS.dream = {
    name: 'Kupofried: The Dream King', order: 14, done: 'kp_lq_dream_done',
    ready: () => flagOn('kp_diploma') && !!KP.SPECIES[DREAM],
    plan: [
      ['talk', 'prof', { map: 'kp_lab', done: 'kp_lq_dream_open' }],
      win('kp_lq_dream_ring', 'kp_summit_2', ['talk', 'cht_dio', { map: HOTEL, choose: ['Rest'].concat(ROUNDS.map(R => R.opts[R.ans])), done: 'kp_lq_dream_ring' }]),
      win('kp_legend_lq_kupofried', null, ['talk', 'cht_dio', { map: HOTEL, choose: 'Rest', done: 'kp_legend_lq_kupofried' }]),
    ],
  };
})();
