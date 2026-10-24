// Kupomon's map helpers (docs/KUPOMON_WORLD.md): the pieces every town, route and dojo is built from, so the maps
// stay short and behave the same everywhere.
//   KP.W.trainer(def) -> { npc, trig }   a trainer who spots you (sight rect) and battles once
//   KP.W.grunt(def)                      a Team Hojo grunt (a trainer in a lab coat)
//   KP.W.master(def) -> npc              a dojo master: the badge battle (bag items off), the badge and the reward
//   KP.W.rival(s, who, meet, o)          (generator) a rival battle: KP.RIVALS' team for that meeting
//   KP.W.mogCenter(id, def)              defines a Mog Center (Mog Repair, Mart, Mog Box) map
//   KP.W.house(id, def)                  defines a small house interior
//   KP.W.item(id, at, kp, qty)           an item lying on the ground (a map `items` entry)
//   KP.W.hidden(id, at, kp, qty)         a hidden item (a talk trigger: examine the spot)
//   KP.W.gate(n, who)                    an exit's { if, blocked }: needs n badges
//   KP.W.barrier(id, at, open, model)    a solid object (a gate, a boulder) gone once open(s) holds
//   KP.W.toggle(id, at, flag, o)         a switch object that flips a flag (dojo puzzles)
//   KP.W.moogle(id, sp, at, o)           a wild moogle wandering in a town (an NPC; it chirps)
//   KP.W.sign(at, text)                  a sign to read (a talk trigger)
// Map options read by the engine: kpWild (a KP.WILD table id), kpBg (the battle background), kpCave (every floor
// tile can turn up a wild moogle, not just tall grass).
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {};
  const W = KP.W = {};
  const D = () => FF7.state.kp;
  const V = () => FF7.state.vars;

  KP.got = (id, n = 1) => `Received "${(KP.ITEMS[id] || {}).name || id}"${n > 1 ? ' x' + n : ''}!`;

  // ------------------------------------------------------------------ badges
  KP.BADGES = [
    null,
    { name: 'Shuriken Badge', master: 'Yuffie', town: 'Kurotsuki', col: '#5a8ad0' },
    { name: 'Gear Badge', master: 'Barret', town: 'Cogsworth', col: '#a0a0a8' },
    { name: 'Fist Badge', master: 'Tifa', town: 'Nibel Peaks', col: '#d06a40' },
    { name: 'Wind Badge', master: 'Cid', town: 'Skyport', col: '#60c0e0' },
    { name: 'Bloom Badge', master: 'Aeris', town: 'Bloomhaven', col: '#e080b0' },
    { name: 'Chaos Badge', master: 'Vincent', town: 'Ravenmoor', col: '#a03040' },
    // (Region 5, the user's two more dojos, 2026-10-02: east of Ravenmoor, js/maps/kupomon/kp_region5a.js, kp_region5b.js)
    { name: 'Flame Badge', master: 'Red XIII', town: 'Candlerock', col: '#e0702a' },
    { name: 'Encore Badge', master: 'Dio', town: 'Glimmerfair', col: '#f0c040' },
  ];
  KP.badgeCount = () => (D() && D().badges || []).length;
  KP.hasBadge = (n) => (D() && D().badges || []).includes(n);
  // the Kupo League's door (the Badge Gate on Route 13, the League Guard): every badge; a Champion from the days of six
  // dojos keeps the way in
  KP.LEAGUE_BADGES = KP.BADGES.length - 1;
  KP.leagueReady = () => KP.badgeCount() >= KP.LEAGUE_BADGES || !!(FF7.state && FF7.state.flags.kp_champion);

  // ------------------------------------------------------------------ teams
  // [[species, level, { held, moves, plus }]] -> moogles
  // (levels written for the old cap of 30, as the maps' trainers are, read through KP.LV; scaled: they're on the new
  // scale already (the leagues, the rivals at Cloud's level, the Elite Four))
  W.team = (team, scaled) => team.filter(([sp]) => KP.SPECIES[sp] || (console.warn('Kupomon: no species', sp), false))
    .map(([sp, lv, o]) => { o = o || {}; const m = KP.make(sp, scaled ? lv : KP.LV(lv), { held: o.held, plus: o.plus, iv: o.iv, app: o.app, abil: o.abil }); if (o.moves) m.moves = o.moves.filter(id => KP.MOVES[id]).slice(0, 4); return m; });
  // the job line's stage for a level: a base species evolved as far as the level goes (a rival's starter grows up)
  W.lineAt = function (sp, lv) {
    let id = sp;
    for (let i = 0; i < 4; i++) { const e = (KP.SPECIES[id] || {}).evo; if (!e || lv < e.at || !KP.SPECIES[e.to]) break; id = e.to; }
    return id;
  };

  // ------------------------------------------------------------------ trainers
  // def: { id, name, cls (shown before the name: 'Youngster', 'Ninja'...), model, at, dir, sight: [x, y, w, h], line,
  //   lose (their line when beaten), after (when talked to later), team, money, bg, music, walkTo: [x, y], reward:
  //   [[item, n]] (given on the win), noBag, show }
  // a trainer's team: the expansion's themed one if a pack gives it (KP.TEAM_OVERRIDES, docs/KUPOMON_CONTENT.md
  // "Trainers"), else the map's own; every trainer listed (KP.TRAINER_DEFS: tools/kp_trainers.js)
  KP.TEAM_OVERRIDES = KP.TEAM_OVERRIDES || {};
  KP.TRAINER_DEFS = KP.TRAINER_DEFS || {};
  KP.teamFor = (id, team) => KP.TEAM_OVERRIDES[id] || team;
  // ------------------------------------------------------------------ trainers on the move (the user, 2026-10-02): one who
  // spots you walks up to you before the battle (Pokémon's), and a beaten one never stands in anybody's way: if where it
  // stands cuts anything off (Dusty on Route 15 stood in the only way to its Warrior Belt), it stands aside, when the
  // battle ends and whenever the map loads (a save from before this as well)
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], tk = (x, y) => x + ',' + y;
  const stepOK = (fs, x, y, nx, ny) => nx >= 0 && ny >= 0 && nx < fs.P.w && ny < fs.P.h && fs.P.walkable(nx, ny) && (!FF7.runner || !FF7.runner.edgeOK || FF7.runner.edgeOK(fs, x, y, nx, ny));
  // the tiles people who stay put stand on (self aside), the exits' tiles, and the tiles a pick-up or a thing lies on
  const solidOf = (fs, self) => { const out = new Set(); for (const a of Object.values(fs.actors || {})) if (a && a !== self && a !== fs.player && a.visible && a.solid && !a.wander) out.add(tk(a.tx, a.ty)); return out; };
  const exitsOf = (fs) => { const out = new Set(); (fs.map.exits || []).forEach(e => { for (let y = e.at[1]; y < e.at[1] + (e.at[3] || 1); y++) for (let x = e.at[0]; x < e.at[0] + (e.at[2] || 1); x++) out.add(tk(x, y)); }); return out; };
  const thingsOf = (fs) => new Set((fs.objects || []).filter(o => o.at).map(o => tk(o.at[0], o.at[1])));
  const flood = (fs, starts, solid, exits) => {
    const seen = new Set(), q = [];
    for (const [x, y] of starts) { const k = tk(x, y); if (!solid.has(k) && !seen.has(k)) { seen.add(k); q.push([x, y]); } }
    while (q.length) {
      const [x, y] = q.shift(); if (exits.has(tk(x, y))) continue;   // (an exit leaves the map)
      for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy, k = tk(nx, ny); if (seen.has(k) || solid.has(k) || !stepOK(fs, x, y, nx, ny)) continue; seen.add(k); q.push([nx, ny]); }
    }
    return seen;
  };
  // would someone standing at (x, y) cut anything off: a tile reachable (from the map's ways in and the party) without
  // them, out of reach with them there
  W.blocksWay = function (fs, self, x, y) {
    if (!fs || !fs.P) return false;
    const solid = solidOf(fs, self), exits = exitsOf(fs), here = tk(x, y);
    const starts = Object.values(fs.map.entries || {}).map(e => [e[0], e[1]]).concat(fs.player ? [[fs.player.tx, fs.player.ty]] : []);
    const free = flood(fs, starts, solid, exits);
    solid.add(here);
    const held = flood(fs, starts, solid, exits);
    for (const k of free) if (k !== here && !held.has(k)) return true;
    return false;
  };
  // the nearest spot (six steps at most) a person can walk to from where it stands that cuts nothing off: not an exit,
  // not a pick-up's tile, not the party's; null if where it stands is fine (or nowhere better)
  W.standAside = function (fs, a) {
    if (!fs || !a || !W.blocksWay(fs, a, a.tx, a.ty)) return null;
    const solid = solidOf(fs, a), exits = exitsOf(fs), things = thingsOf(fs), pl = fs.player ? tk(fs.player.tx, fs.player.ty) : '';
    const seen = new Set([tk(a.tx, a.ty)]), q = [[a.tx, a.ty, 0]];
    while (q.length) {
      const [x, y, d] = q.shift(), k = tk(x, y);
      if (d > 0 && !exits.has(k) && !things.has(k) && k !== pl && !W.blocksWay(fs, a, x, y)) return [x, y];
      if (d >= 6) continue;
      for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy, nk = tk(nx, ny); if (seen.has(nk) || solid.has(nk) || nk === pl || !stepOK(fs, x, y, nx, ny)) continue; seen.add(nk); q.push([nx, ny, d + 1]); }
    }
    return null;
  };
  // a walk for a person over the tiles (people and the party in the way), as the corners to pass: s.move's points
  W.pathFor = function (fs, a, goal) {
    const solid = solidOf(fs, a), pl = fs.player ? tk(fs.player.tx, fs.player.ty) : '', want = typeof goal === 'function' ? goal : (x, y) => x === goal[0] && y === goal[1];
    const prev = new Map([[tk(a.tx, a.ty), null]]), q = [[a.tx, a.ty]];
    let end = null;
    while (q.length && !end) {
      const [x, y] = q.shift();
      if (want(x, y) && !(x === a.tx && y === a.ty)) { end = [x, y]; break; }
      for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy, k = tk(nx, ny); if (prev.has(k) || solid.has(k) || k === pl || !stepOK(fs, x, y, nx, ny)) continue; prev.set(k, [x, y]); q.push([nx, ny]); }
    }
    if (!end) return null;
    const tiles = []; for (let c = end; c && !(c[0] === a.tx && c[1] === a.ty); c = prev.get(tk(c[0], c[1]))) tiles.unshift(c);
    return tiles.filter((t, i) => { const p0 = i ? tiles[i - 1] : [a.tx, a.ty], n = tiles[i + 1]; return !n || (n[0] - t[0]) !== (t[0] - p0[0]) || (n[1] - t[1]) !== (t[1] - p0[1]); });   // (the corners)
  };
  // a trainer who has spotted the party walks up beside it
  W.walkUp = function* (s, id) {
    const fs = s.field, a = fs && fs.actors && fs.actors[id], p = fs && fs.player; if (!a || !p) return;
    if (Math.abs(a.tx - p.tx) + Math.abs(a.ty - p.ty) <= 1) return;
    const pts = W.pathFor(fs, a, (x, y) => Math.abs(x - p.tx) + Math.abs(y - p.ty) === 1);
    if (pts && pts.length) yield s.move(id, pts);
  };
  // a beaten trainer stepping out of the way, on the map (after its battle)
  W.makeWay = function* (s, id) {
    const fs = s.field, a = fs && fs.actors && fs.actors[id]; if (!a) return;
    const spot = W.standAside(fs, a); if (!spot) return;
    const pts = W.pathFor(fs, a, spot);
    if (pts && pts.length) { yield s.move(id, pts); yield s.face(id, 'player'); }
  };
  W.trainer = function (def) {
    const flag = 'kp_tr_' + def.id, full = def.cls ? def.cls + ' ' + def.name : def.name;
    KP.TRAINER_DEFS[def.id] = { id: def.id, kind: def.cls === 'Team Hojo' ? 'grunt' : 'trainer', cls: def.cls, name: def.name, team: def.team, bg: def.bg };
    const fight = function* (s, seen) {
      if (s.flag(flag)) { yield s.say(full, def.after || def.lose); return; }
      s.emote(def.id, '!'); s.sfx('found');
      yield 24;
      if (def.walkTo) yield s.move(def.id, def.walkTo[0], def.walkTo[1]);
      else if (seen) yield* W.walkUp(s, def.id);   // (spotted from its sight line: it walks up to the party)
      yield s.face(def.id, 'player'); yield s.face('player', def.id);
      yield s.say(full, def.line);
      const r = yield* KP.fight(s, { kind: 'trainer', foes: W.team(KP.teamFor(def.id, def.team)), trainer: { name: full, lose: def.lose, money: def.money, model: def.model }, bg: def.bg || (s.field && s.field.map.kpBg) || 'grass', music: def.music, noBag: def.noBag, ai: def.ai });
      if (r === 'win') {
        s.set(flag);
        for (const [it, n] of def.reward || []) { KP.give(it, n); s.sfx('found'); yield s.msg(KP.got(it, n)); }
        yield* W.makeWay(s, def.id);   // (standing in the way: it steps aside)
      }
    };
    return {
      npc: { id: def.id, name: full, model: def.model || 'man', at: def.at, dir: def.dir || 'down', talk: fight, show: def.show,
        place: (fs, a) => { if (!FF7.state.flags[flag]) return; const spot = W.standAside(fs, a); if (spot) a.setTile(spot[0], spot[1]); } },   // (beaten: never where it cuts anything off, field.js load)
      trig: def.sight ? { id: 'see_' + def.id, at: def.sight, once: false, if: s => !s.flag(flag) && (!def.show || def.show(s)), run: function* (s) { yield* fight(s, true); } } : null,
    };
  };
  W.beaten = (id) => !!FF7.state.flags['kp_tr_' + id];
  // a Team Hojo grunt: lab coat, the gang's music and manners
  W.grunt = (def) => W.trainer(Object.assign({ model: 'scientist', cls: 'Team Hojo', music: 'attackweapon',   // (Team Hojo's own battle theme)
    line: 'Halt! This area is closed for... research. Your moogles look like excellent specimens!',
    lose: 'Ngh... The Professor will hear about this.' }, def));

  // ------------------------------------------------------------------ dojo masters
  // def: { id, name, model, at, dir, badge (1-8), team, intro, lose, after, reward: [[item, n]], money, music, bg, ready(s) }
  W.master = function (def) {
    const flag = 'kp_badge_' + def.badge, B = KP.BADGES[def.badge];
    KP.TRAINER_DEFS[def.id] = { id: def.id, kind: 'master', cls: 'Dojo Master', name: def.name, team: def.team, badge: def.badge, bg: def.bg || 'dojo' };
    return { id: def.id, name: def.name, model: def.model, at: def.at, dir: def.dir || 'down', show: def.show,
      talk: function* (s) {
        if (s.flag(flag)) { yield s.say(def.name, def.after); return; }
        if (def.ready && !def.ready(s)) { yield s.say(def.name, def.notReady || 'Not now. Come back later.'); return; }
        yield s.say(def.name, def.intro);
        const r = yield* KP.fight(s, { kind: 'trainer', foes: W.team(KP.teamFor(def.id, def.team)), noBag: true, bg: def.bg || 'dojo', music: def.music || 'birthofgod', ai: 'smart',   // (a dojo master's own theme, apart from the trainers')
         
          trainer: { name: 'Dojo Master ' + def.name, lose: def.lose, money: def.money || 1500, model: def.model } });
        if (r !== 'win') return;
        s.set(flag);
        const d = D(); if (!d.badges.includes(def.badge)) d.badges.push(def.badge);
        s.sfx('levelup');
        yield s.msg(`${s.name('cloud')} received the ${B.name}!`);
        for (const [it, n] of def.reward || []) { KP.give(it, n); yield s.msg(KP.got(it, n)); }
        yield s.say(def.name, def.after);
      } };
  };

  // ------------------------------------------------------------------ rivals: their teams by meeting ('STARTER' is
  // their starter's line, grown to that level)
  KP.RIVALS = {
    zack: {
      name: 'Zack', model: 'zack', music: 'jenova',   // (the rivals share one theme: J-E-N-O-V-A, apart from the trainers')
      1: [['STARTER', 5]],
      2: [['STARTER', 9], ['tufty_freelancer', 8]],
      4: [['STARTER', 15], ['mopluff_bard', 14], ['chocomog_rider', 14]],
      7: [['STARTER', 23], ['chocomog_knight', 22], ['mopluff_dancer', 22], ['grumog_berserker', 21]],
      9: [['STARTER', 29], ['chocomog_knight', 28], ['mopluff_dancer', 28], ['grumog_viking', 28], ['tufty_mime', 27]],
      champion: [['chocomog_knight', 30], ['mopluff_dancer', 30], ['grumog_viking', 30], ['tufty_mime', 30], ['STARTER', 30]],   // (the Kupo League's Champion's Chamber)
    },
    sephiroth: {
      name: 'Sephiroth', model: 'sephiroth', music: 'jenova',
      3: [['nutmog_thief', 11], ['STARTER', 12]],
      5: [['darkmog_squire', 16], ['lancemog_lancer', 16], ['STARTER', 17]],
      6: [['orbmog_oracle', 20], ['darkmog_knight', 21], ['lancemog_dragoon', 21], ['STARTER', 22]],
      8: [['ghostmog_specter', 26], ['orbmog_seer', 26], ['darkmog_knight', 27], ['lancemog_highwind', 27], ['STARTER', 28]],
      champion: [['ghostmog_specter', 30], ['orbmog_seer', 30], ['darkmog_knight', 30], ['lancemog_highwind', 30], ['STARTER', 30]],
      league: [['ghostmog_specter', 30, { plus: 3 }], ['orbmog_seer', 30, { plus: 3 }], ['darkmog_knight', 30, { plus: 3, held: 'focus_pom' }], ['lancemog_highwind', 30, { plus: 3, held: 'quick_gear' }], ['STARTER', 30, { plus: 3, held: 'leftover_nut' }]],
    },
  };
  W.rivalTeam = function (who, meet) {
    const R = KP.RIVALS[who], base = who === 'zack' ? V().kp_zack_starter : V().kp_seph_starter;
    return (R[meet] || []).map(([sp, lv, o]) => {
      const id = sp === 'STARTER' ? W.lineAt(base || KP.STARTERS[0], lv) : KP.SPECIES[sp] ? sp : W.lineAt(sp, lv);
      return [id, lv, o];
    });
  };
  // a rival's team for a battle (the user's rule): every moogle at the level of Cloud's highest on his team, each at the
  // stage its line has reached by that level (evolved once past its level; the line's earlier stage below it)
  W.rivalLevel = () => { const P = ((KP.data && KP.data()) || {}).party || [], top = P.length ? Math.max(...P.map(m => m.lv)) : 1; return Math.max(1, Math.min(KP.MAX_LEVEL, top)); };
  W.rivalAt = (who, meet, L = W.rivalLevel()) => W.rivalTeam(who, meet).map(([sp, lv, o]) => [W.lineAt(KP.baseOf ? KP.baseOf(sp) : sp, L), L, o]);
  // the battle itself (the map's script says the lines around it); o: { lose, win, canLose, bg }. Returns the result
  // A rival battle never stops the story: won or lost, it's over (and a team that lost is patched up by the rival, as
  // Pokémon's first rival does); so the rivals always play at their very best: the max AI (switching, the best answer
  // after a faint), the best four moves their moogles know by then, and a held item each
  W.rival = function* (s, who, meet, o = {}) {
    const R = KP.RIVALS[who];
    // (its moves: what its line has learned by its level, and the Skill Chips sold in the Marts of the towns Cloud has
    // reached: the rival bought them on the same road; nothing from further on)
    const sold = KP.flyTowns ? [].concat(...KP.flyTowns().filter(t => KP.visited(t.town)).map(t => KP.chipStock ? KP.chipStock(t.center) : [])) : [];
    const best = W.rivalAt(who, meet).map(([sp, lv, o2]) => [sp, lv, Object.assign({ moves: KP.compMoves ? KP.compMoves(sp, lv, { chips: sold }) : undefined }, o2)]);
    const r = yield* KP.fight(s, { kind: 'trainer', foes: W.team(KP.leagueHeld ? KP.leagueHeld(best) : best, true), bg: o.bg || (s.field && s.field.map.kpBg) || 'grass', music: R.music, canLose: true, ai: 'max',
      trainer: { name: R.name, lose: o.lose, win: o.win, money: o.money || 300 * meet, model: R.model } });
    s.set(`kp_rival_${who}_${meet}`);
    if (r !== 'win') {
      KP.healAll(); s.sfx('heal');
      if (o.patched) return r;   // (the scene says it)
      yield s.msg(who === 'zack' ? `Zack tosses ${s.name('cloud')} a handful of Oil Cans. "Here, buddy. Patch 'em up. Next time it's your turn!"`
        : `Sephiroth drops a Repair Kit at ${s.name('cloud')}'s feet without a word.(Your moogles were repaired.)`);
    }
    return r;
  };

  // ------------------------------------------------------------------ Mog Centers
  // def: { name, town (the town map), back (its entry outside the door), mart: [item ids], theme, look, music,
  //   npcs: [...more], decor: 'cosy' | 'rustic' | 'stone' | 'tent' | 'metal' | 'gothic' (the room's dressing) }
  // Entries: from_town (inside the door), repair (at the counter; where you wake after a blackout).
  const NURSE = { enemy: 'kp_pomsprout_devout', scale: 0.85 }, CLERK = { enemy: 'kp_nutmog_treasure_hunter', scale: 0.85 };
  W.repair = (centerId) => function* (s) {
    const c = yield s.ask('Nurse Mog', 'Welcome to the Mog Repair, kupo! Shall I fix up your moogles?', ['Yes, please', 'No thanks']);
    if (c !== 0) { yield s.say('Nurse Mog', 'Come back any time, kupo!'); return; }
    if (!D().party.length) { yield s.say('Nurse Mog', "Kupo? You don't have any moogles yet!"); return; }
    s.sfx('heal'); s.flash('#ffd0e0', 10, 0.5);
    KP.healAll(); D().repair = [centerId, 'repair'];
    yield 30;
    yield s.say('Nurse Mog', 'All done! Your moogles are good as new. Take care out there, kupo!');
  };
  W.mart = (stock, name) => function* (s) {
    yield s.say(name || 'Mart Mog', 'Welcome to the Mart, kupo! Take a look!');
    const chips = KP.chipStock ? KP.chipStock(s.field && s.field.map && s.field.map.id) : [];   // (its Skill Chips: js/kupomon/kp_learn.js)
    const held = KP.heldStock ? KP.heldStock(s.field && s.field.map && s.field.map.id) : [];   // (the expansion's held items: kp_content.js)
    yield KP.shop(stock.concat(held.filter(c => !stock.includes(c)), chips.filter(c => !stock.includes(c))), { name: name || 'Mart Mog' });
    yield s.say(name || 'Mart Mog', 'Thanks for stopping by, kupo!');
  };
  // a moogle in a choice list: "Kupwick - Magus Lv30 +2"
  KP.monLabel = (m) => `${KP.name(m)} - ${KP.jobName(m)} Lv${m.lv}${m.plus ? ' +' + m.plus : ''}`;
  W.mogBox = function* (s) {
    s.sfx('confirm');
    yield KP.boxView();   // (js/kupomon/kp_box.js)
  };
  const DECOR = {
    cosy: { theme: 'house', look: {} },
    rustic: { theme: 'house', look: { floorTex: 'planks' } },
    stone: { theme: 'nibelheim', look: {} },
    tent: { theme: 'desert', look: {} },
    metal: { theme: 'shinra', look: {} },
    gothic: { theme: 'mansion', look: {} },
    wutai: { theme: 'wutai', look: {} },
  };
  W.mogCenter = function (id, def) {
    const dec = DECOR[def.decor] || DECOR.cosy;
    const stock = def.mart || ['kupo_nut', 'oil_can', 'fixit'];
    FF7.defineMap(id, {
      kpMart: stock,   // (what its Mart sells before the held items and chips: the Demo reads it, js/kupomon/kp_runner.js R.kpMartHeld)
      name: def.name, area: def.area || def.name.replace(/ Mog Center$/, ''), theme: def.theme || dec.theme, music: def.music || 'ahead',
      look: Object.assign({}, dec.look, def.look || {}),
      grid: [
        "################",
        "#..............#",
        "#.DDD.....DDDD.#",
        "#..............#",
        "#.KKK.......Z..#",
        "#..............#",
        "#.j..........j.#",
        "#######+########",
      ],
      legend: { K: 'block' },
      props: [{ at: [2, 4], prop: 'chair', rot: 90 }, { at: [3, 4], prop: 'table' }, { at: [4, 4], prop: 'chair', rot: -90 }]
        .concat(def.props || []),
      labels: [{ at: [3, 1], face: 's', text: 'MOG REPAIR', size: 0.22, col: '#e05a7a', y: 2.1 }, { at: [11.5, 1], face: 's', text: 'MART', size: 0.22, col: '#4a8ad0', y: 2.1 }],
      entries: { from_town: [7, 6, 'up'], repair: [3, 3, 'up'] },
      exits: [{ at: [7, 7, 1, 1], to: def.town, entry: def.back || 'from_center', sfx: 'door' }],
      npcs: [
        { id: 'nurse', name: 'Nurse Mog', model: NURSE, at: [3, 1], dir: 'down', talk: W.repair(id) },
        { id: 'merchant', name: 'Mart Mog', model: CLERK, at: [11, 1], dir: 'down', talk: W.mart(stock) },
      ].concat(def.npcs || []),
      triggers: [{ at: [2, 2, 3, 1], on: 'talk', run: W.repair(id) }, { at: [10, 2, 4, 1], on: 'talk', run: W.mart(stock) }],
      objects: [{ at: [12, 4], talk: W.mogBox }],
      items: def.items, onEnter: def.onEnter,
    });
  };

  // ------------------------------------------------------------------ houses
  // def: { name, town, back, npcs, theme, look, grid (else a small room), entries, objects, props, buildings, items,
  //   decor: 'cosy' | 'rustic' | 'stone' | 'tent' | 'metal' | 'gothic' | 'wutai' }
  W.house = function (id, def) {
    const dec = DECOR[def.decor] || DECOR.cosy;
    const grid = def.grid || [
      "############",
      "#k...b..q..#",
      "#..........#",
      "#.t........#",
      "#.........j#",
      "#####+######",
    ];
    const door = def.door || [5, grid.length - 1];
    FF7.defineMap(id, Object.assign({
      name: def.name, area: def.area, theme: def.theme || dec.theme, music: def.music, look: Object.assign({}, dec.look, def.look || {}),
      grid,
      entries: Object.assign({ from_town: [door[0], door[1] - 1, 'up'] }, def.entries || {}),
      exits: [{ at: [door[0], door[1], 1, 1], to: def.town, entry: def.back, sfx: 'door' }],
    }, def.extra || {}, { npcs: def.npcs || [], objects: def.objects, props: def.props, items: def.items, triggers: def.triggers, onEnter: def.onEnter, legend: def.legend }));
  };

  // ------------------------------------------------------------------ items
  W.item = (id, at, kp, qty = 1) => ({ at, kp, qty, id: 'kpi_' + id });
  W.coins = (id, at, coins) => ({ at, coins, id: 'kpi_' + id });
  W.hidden = (id, at, kp, qty = 1) => ({ at, on: 'talk', kpHidden: 'kph_' + id, run: function* (s) {   // (kpHidden: its flag, for the Demo's 100%)
    if (s.flag('kph_' + id)) return;
    s.set('kph_' + id); KP.give(kp, qty); s.sfx('found');
    yield s.msg('Something was hidden here! ' + KP.got(kp, qty));
  } });
  // the field's pick-ups and chests with { kp, qty } or { coins } (js/field/field.js pickItem / openChest)
  KP.pickup = function* (s, o) {
    if (o.coins) { D().money += o.coins; yield s.say(null, `Found ${o.coins} coins!`); return; }
    const it = KP.ITEMS[o.kp], n = o.qty || 1;
    KP.give(o.kp, n);
    yield s.say(null, KP.got(o.kp, n));
  };

  // ------------------------------------------------------------------ gates, barriers, switches, signs, town moogles
  W.gate = (n, who, line) => ({
    if: () => KP.badgeCount() >= n,
    blocked: function* (s) { yield s.say(who || 'Guard', line || `Sorry, only trainers with ${n === 1 ? 'a dojo badge' : n + ' dojo badges'} may go on from here.`); },
  });
  // open(s) -> true once it should be gone; model: a field prop ({ prop: 'rock' }), a character or { enemy }
  W.barrier = (id, at, open, model, o = {}) => Object.assign({ id, at, model: model || { prop: 'rock' }, solid: true, hidden: false,
    tick(ob) { const g = !!open(FF7.fieldScene ? FF7.fieldScene.api : null); ob.hidden = g; ob.solid = !g; } }, o);
  W.toggle = (id, at, flag, o = {}) => ({ id, at, model: o.model || null, solid: o.solid !== false, toggleFlag: flag, toggleOnce: !!o.once,   // (toggleFlag: tools/kp_traps.js tries every lever state)
    talk: function* (s) {
      if (o.once && s.flag(flag)) { if (o.done) yield s.msg(o.done); return; }
      if (s.flag(flag) && !o.once) s.unset(flag); else s.set(flag);
      s.sfx(o.sfx || 'set');
      if (o.msg) yield s.msg(typeof o.msg === 'function' ? o.msg(s) : o.msg);
    } });
  // a one-off wild moogle standing in the world (legendaries): talk to it and it battles; beaten or befriended, it's
  // gone (run away and it waits). def: { at, dir, lv, intro, bg, music, scale, show }
  // (the expansion's quests, docs/KUPOMON_LEGENDS.md: def.scaled, its level on the cap of 50 already; def.abil, its
  // ability slot (0: its signature one); def.opening, a line before the battle; def.after, the line when it's beaten;
  // def.done, a flag set too when it's befriended (kp_lq_<quest>_done); def.then(s), what follows a befriending)
  W.legend = (id, sp, def) => ({ id, name: KP.SPECIES[sp] ? KP.SPECIES[sp].moogle : sp, model: { enemy: 'kp_' + sp, scale: def.scale || 1.2 }, at: def.at, dir: def.dir || 'down',
    show: s => !s.flag('kp_legend_' + id) && (!def.show || def.show(s)),
    talk: function* (s) {
      yield s.msg(def.intro || `${KP.SPECIES[sp].moogle} is watching you...`);
      if (def.opening) yield s.msg(def.opening);
      s.sfx('found');
      const lv = def.scaled ? (def.lv || KP.MAX_LEVEL) : KP.LV(def.lv || 30), mon = KP.make(sp, lv, def.abil != null ? { abil: def.abil } : {});
      if (def.done || def.bond) mon.bond = def.bond || 4;   // (met at the end of its own sidequest: it knows you now, and nuts taste 4x as good to it)
      const r = yield* KP.fight(s, { kind: 'wild', foes: [mon], bg: def.bg || (s.field && s.field.map.kpBg) || 'grass', music: def.music || 'weaponraid' });   // (the legendaries: Weapon Raid)
      // befriended: it's yours for good. Beaten: it flees, and comes back next time (as modern Pokemon's do), so a
      // Kupodex can always be finished
      if (r === 'caught') { s.set('kp_legend_' + id); if (def.done) s.set(def.done); s.remove(id); if (def.then) yield* def.then(s); }
      else if (r === 'win') { s.remove(id); yield s.msg(def.after || `${KP.SPECIES[sp].moogle} staggers away and vanishes... You get the feeling it will be back.`); }
    } });
  // the date and the time (Stiltzkin's days and his sunset; the system clock, as Pokémon's weekday events; the Demo
  // sets KP._clock): { day 0-6 (Sunday 0), hour 0-23, date 'YYYY-MM-DD' }
  KP.clock = function () {
    if (KP._clock) return Object.assign({}, KP._clock);
    const d = new Date(), pad = (n) => String(n).padStart(2, '0');
    return { day: d.getDay(), hour: d.getHours(), date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` };
  };
  // Pokémon's one-way ledges: walk off the edge row facing the drop and Cloud hops down `drop` tiles (onto the lower
  // ground past the cliff row); there's no climbing back. at: [x, y, w] (the top row's tiles), dir 'down' | 'left' |
  // 'right' (for 'left'/'right', at is [x, y, h], a column). Never the only way down: keep a slope or stairs too.
  W.ledge = (at, dir = 'down', drop = 2) => {
    const [x, y, n] = at, d = { down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    return { at: dir === 'down' ? [x, y, n, 1] : [x, y, 1, n], once: false, ledgeTrig: true, if: s => s.field && s.field.player && s.field.player.dir === dir,
      run: function* (s) { const p = s.field.player; yield s.jump('player', p.tx + d[0] * drop, p.ty + d[1] * drop, 0.5, 20); } };
  };
  W.sign = (at, text) => ({ at, on: 'talk', run: function* (s) { yield s.msg(text); } });
  W.moogle = (id, sp, at, o = {}) => ({ id, name: KP.SPECIES[sp] ? KP.SPECIES[sp].moogle : 'Moogle', model: { enemy: 'kp_' + sp, scale: o.scale || 0.8 }, at, dir: o.dir || 'down', wander: o.wander == null ? 2 : o.wander, show: o.show,
    talk: function* (s) { yield s.msg(o.line || `${KP.SPECIES[sp] ? KP.SPECIES[sp].moogle : 'The moogle'}: Kupo kupo!`); } });
})();

// ------------------------------------------------------------------ the shelf in Cait Sith's workshop (FF7's
// gs_cait_hideout): the Kupomon league trophies on top of the toy shelves and the dojo badges along the pegboard,
// from the furthest Kupomon file of this FF7 save (shown once won)
(function () {
  const KP = FF7.kupomon, F = FF7.field, sh = (c, k) => FF7.util.shade(c, k);
  KP.progressOf = function (st) {
    const slots = ((st && st.vars && st.vars.kupomon && st.vars.kupomon.slots) || []).filter(Boolean);
    let best = { badges: [], trophies: [], dex: 0 }, diploma = false, champion = false, chalice = false;
    for (const f of slots) {
      const d = f.state && f.state.kp; if (!d) continue;
      const p = { badges: d.badges || [], trophies: d.trophies || [], dex: Object.keys((d.dex && d.dex.caught) || {}).length };
      if (f.state.flags && f.state.flags.kp_diploma) diploma = true;   // (the Kupodex Diploma: any file's)
      if (f.state.flags && f.state.flags.kp_champion) champion = true;   // (the Kupo League's Champion: any file's)
      if (f.state.flags && f.state.flags.kp_lq_chal_done) chalice = true;   // (the Crystal Chalice: any file's)
      if (p.trophies.length * 10 + p.badges.length > best.trophies.length * 10 + best.badges.length) best = p;
    }
    best = Object.assign({}, best, { diploma, champion, chalice });
    return best;
  };
  const prog = () => KP.progressOf(KP.real ? KP.real.state : FF7.state);
  // a league cup on a little plinth, and a badge medallion (facing south at rot 0)
  F.props.kptrophy = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#e8c040';
    mb.box(x, y + s * 0.04, z, s * 0.22, s * 0.08, s * 0.16, '#3a2a1a');
    mb.box(x, y + s * 0.13, z, s * 0.05, s * 0.1, s * 0.05, c);
    mb.loft([{ y: y + s * 0.18, rx: s * 0.03, rz: s * 0.03 }, { y: y + s * 0.26, rx: s * 0.1, rz: s * 0.1 }, { y: y + s * 0.38, rx: s * 0.13, rz: s * 0.13 }], { sides: 10, color: c, smooth: true, x, z });
    [1, -1].forEach(d => mb.box(x + d * s * 0.15, y + s * 0.3, z, s * 0.03, s * 0.1, s * 0.03, sh(c, -0.1)));
  };
  F.props.kpbadge = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#c0c0c8';
    mb.prism(x, y, z, s * 0.13, s * 0.13, s * 0.03, 12, '#e8d8a0', false);
    mb.prism(x, y + s * 0.005, z + s * 0.012, s * 0.1, s * 0.1, s * 0.025, 12, c, false);
  };
  KP.shelfObjects = function () {
    const out = [];
    [10, 10.5, 11, 11.5, 12].forEach((x, i) => {
      const n = i + 1;
      out.push({ id: 'kp_trophy_' + n, at: [x, 0.72], model: { prop: 'kptrophy', col: (KP.LEAGUES && KP.LEAGUES[n] || {}).col || '#e8c040', scale: 1 }, hover: 1.1, dir: 'down', solid: false, hidden: true,
        tick(o) { o.hidden = !prog().trophies.includes(n); } });
    });
    // (the sixth: the Crystal Chalice, won back from Chalimog's quest: docs/KUPOMON_LEGENDS.md)
    out.push({ id: 'kp_trophy_chalice', at: [12.5, 0.72], model: { prop: 'kptrophy', col: '#80d8ff', scale: 1.1 }, hover: 1.1, dir: 'down', solid: false, hidden: true,
      tick(o) { o.hidden = !prog().chalice; } });
    for (let n = 1; n < KP.BADGES.length; n++) {   // (eight on the pegboard, in the span the six had)
      out.push({ id: 'kp_badge_' + n, at: [1.04, 4.045 + (n - 4.5) * 0.2], model: { prop: 'kpbadge', col: (KP.BADGES[n] || {}).col, scale: 1 }, hover: 1.28, dir: 'right', solid: false, hidden: true,
        tick(o) { o.hidden = !prog().badges.includes(n); } });
    }
    return out;
  };
  KP.shelfLine = function () {
    const p = prog();
    if (!p.badges.length && !p.trophies.length) return null;
    const L = p.trophies.map(n => (KP.LEAGUES[n] || {}).name).filter(Boolean);
    return `On top of the shelf: ${L.length ? 'Kupomon trophies (' + L.join(', ') + ')' : 'room for Kupomon trophies'}. On the pegboard: ${p.badges.length} of the eight dojo badges.` +
      (p.trophies.includes(5) ? '\fA little card in Cait Sith\'s handwriting: "To the World Champion. Ye beat me fair and square."' : '');
  };
})();
