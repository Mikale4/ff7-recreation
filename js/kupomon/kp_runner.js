// Kupomon in the runner (docs/RUNNER.md "Kupomon", docs/KUPOMON_WORLD.md): the Kupomon Demo (the Demo on the
// Kupomon title screen, and Esc inside Kupomon) and the headless check (tools/run_runner.js --plan kp) play Kupomon
// through the runner. Field moves, dialogue and questions go as in FF7; Kupomon's own screens are worked with the
// buttons like a player (R.sceneHook): the battle menus (a move picked by power, type and the foe; an Oil Can when
// low; after a wild win, the nut it likes best for a moogle not had yet), evolutions, the move picker, the Mart, the
// Kupomon menu (the lead moogle), the League bracket and a hatching egg.
// Plan ops: kp_start, kp_starter, kp_heal, kp_train, kp_buy, kp_lead, kp_league, kp_breed (see each).
(function () {
  const R = FF7.runner, KP = FF7.kupomon, U = FF7.util;
  if (!R || !KP) return;
  const D = () => FF7.state && FF7.state.kp;
  const inKP = () => !!(FF7.state && FF7.state.kupomon);
  const pace = () => R.fast ? 1 : 8;               // frames between button taps on Kupomon screens (a brisk player)
  const read = () => R.fast ? 4 : 40;               // a message's reading time before OK
  const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);

  // ------------------------------------------------------------------ the battle brain (also tools/kp_bot.js)
  const NUTS = () => Object.keys(KP.ITEMS).filter(k => KP.ITEMS[k].kind === 'nut');
  KP.brain = {
    // a move's worth against the foe: damage by power, type, STAB, accuracy and the stats; support moves when useful
    score(B, f, t, id) {
      const mv = KP.MOVES[id]; if (!mv || !B.usable(f, id)) return -1;
      const sp = KP.sp(f.mon), mag = KP.category(mv) === 'magic';
      const k = mv.power ? (mag ? f.stat('mag') / Math.max(1, t.stat('res')) : f.stat('atk') / Math.max(1, t.stat('def'))) : Math.max(f.stat('atk') / Math.max(1, t.stat('def')), f.stat('mag') / Math.max(1, t.stat('res')));
      if (mv.power) return mv.power * KP.effOn(mv.type, t.mon) * ((mv.type === sp.type || mv.type === sp.type2) ? 1.5 : 1) * ((mv.acc === true ? 100 : mv.acc || 100) / 100) * k;
      const base = 30 * k;
      if (mv.heal) return f.mon.hp < KP.maxHp(f.mon) * 0.4 ? 3 * base * (B.healFrac ? B.healFrac(f.mon, mv) / mv.heal : 1) : 0;
      if (mv.status) return t.mon.status || KP.effOn(mv.type, t.mon) === 0 ? 0 : (t.mon.hp > KP.maxHp(t.mon) * 0.5 ? 1.2 * base : 0.3 * base);
      if (mv.stat) return mv.stat[2] === 'self' ? (f.st[mv.stat[0]] < 1 && f.mon.hp > KP.maxHp(f.mon) * 0.6 ? base : 0) : (t.st[mv.stat[0]] > -1 ? 0.6 * base : 0);
      return 0;
    },
    // the move: the tactics engine (js/kupomon/kp_tactics.js), which also plays the dojo masters, rivals and leagues;
    // with a wild moogle it wants, it puts it to sleep before beating it (the befriend bonus)
    best(B, f, t) {
      if (KP.tactics) return KP.tactics.choose(B, f, t, { befriend: B.o.kind === 'wild' && KP.brain.wants(t.mon.sp, t.mon) });
      const ids = f.mon.moves.filter(id => B.usable(f, id)); return ids.sort((a, b) => KP.brain.score(B, f, t, b) - KP.brain.score(B, f, t, a))[0];
    },
    // the one to send in: hits the foe hardest
    sendIn(B, list) {
      return list.slice().sort((a, b) => KP.brain.matchup(B, b, B.foe.mon, { free: true }) - KP.brain.matchup(B, a, B.foe.mon, { free: true }))[0];
    },
    // (Hard Mode: one per area, so the first one met in an area not used yet: a Nuzlocke player's reserves)
    wants: (sp, mon) => KP.hard && KP.hard() && KP.hardRules() && KP.areaUsed(KP.areaOf(R.where())) ? false
      : R.kpWantAny ? !!(mon && R.kpWantAny(mon)) : KP.hard && KP.hard() ? true : !(D().dex.caught[sp]) && (!R.kpWant || R.kpWant(sp)),
    nut(B) {
      const bag = D().bag, have = NUTS().filter(k => bag[k] > 0 && KP.ITEMS[k].nut < 255);
      if (!B.foe || !KP.brain.wants(B.foe.mon.sp, B.foe.mon)) return null;
      // a Crystal Kupo Nut only for a legendary or a mythical (rate under 15)
      if (bag.crystal_nut && (KP.sp(B.foe.mon).rate || 120) < 15) return 'crystal_nut';
      if (!have.length) return null;
      const p = (k) => KP.nutChance(B, B.foe.mon, k), likeliest = () => have.sort((a, b) => p(b) - p(a) || KP.ITEMS[a].price - KP.ITEMS[b].price)[0];
      // a legendary or a mythical (ten tries, and a whole fight again if it wanders off): the likeliest nut every toss, the
      // coins no object. KP.nutChance counts each nut's bonus in this battle: a Royal Kupo Nut (x3), or past the seventh
      // turn a Slow-Roast Nut (up to x4; their fights run long), a Quick Nut for one beaten in a turn (the user, 2026-10-03)
      const tries = KP.befriendTries ? KP.befriendTries(B.foe.mon) : 3;
      if (tries > 3) return likeliest();
      // as a player minds the coins: of the nuts likely to win it over in its tries (4 times in 5: each at least
      // 1 - 0.2^(1/tries), 42% for three), the one that costs least per moogle won (a free one first); none that likely: the likeliest
      const good = have.filter(k => p(k) >= 1 - Math.pow(0.2, 1 / tries));
      if (good.length) return good.sort((a, b) => KP.ITEMS[a].price / p(a) - KP.ITEMS[b].price / p(b))[0];
      return likeliest();
    },
    // what to do at the command menu: 'fight' | 'bag' (with B._plan) | 'run'; trapped (a bind, a block, a trapping
    // ability), no switching or running: it fights
    command(B) {
      const c = KP.brain.command0(B);
      if ((c === 'run' || c === 'moogles') && B.canSwitch && !B.canSwitch(B.me) && !(c === 'run' && B.ab && (B.ab(B.me) || {}).runAway)) { B._sendIn = null; return 'fight'; }
      return c;
    },
    command0(B) {
      const me = B.me, d = D(), hp = me.mon.hp / KP.maxHp(me.mon);
      if (B.o.kind === 'wild' && R.kpFlee && (typeof R.kpFlee !== 'function' || R.kpFlee(B.foe.mon))) return 'run';   // (a function: which to run from)
      // a whole team at the level cap gains nothing from a wild battle: it runs, unless it's one to befriend (the
      // Kupodex, a hunt, a legend)
      if (B.o.kind === 'wild') {
        const legend = (KP.sp(B.foe.mon).rate || 120) <= 5;
        const canWin = KP.brain.wants(B.foe.mon.sp, B.foe.mon) && NUTS().some(k => d.bag[k] > 0 && KP.ITEMS[k].nut < 255);   // (wanted, and a nut to toss)
        if (d.party.every(m => m.lv >= (KP.levelCap ? KP.levelCap() : KP.MAX_LEVEL)) && !canWin) return 'run';
        if (R.kpHealing && !legend) return 'run';
      }
      // switch-training (as Pokémon players do): a lead well under the foe's level steps out at once for the strongest
      // healthy one; having taken part, it still shares the EXP
      if (!B._swapped && (me.mon.lv < B.foe.mon.lv - 1 || (R.kpTraining && B.o.kind === 'wild'))) {
        const strong = d.party.filter(m => m.hp > KP.maxHp(m) * 0.5 && m !== me.mon && m.lv >= Math.max(B.foe.mon.lv, me.mon.lv + 3)).sort((a, b) => b.lv - a.lv)[0];
        if (strong) { B._swapped = true; B._sendIn = strong; return 'moogles'; }
      }
      // a bad matchup (its moves do little to the foe, or the foe's hit it hard): a teammate who does better comes in
      // (once per foe moogle, so it never ping-pongs)
      const foe = B.foe;
      // a stalemate (a foe that heals as fast as it is hurt): no lower after 8 turns, the teammate who hits it hardest
      // comes in, however hurt (a fresh count after each switch, so it never ping-pongs either)
      const hist = B._foeHp || (B._foeHp = {}), h = hist[foe.mon.uid] || (hist[foe.mon.uid] = []);
      if (h.turn !== B.turn) { h.turn = B.turn; h.push(foe.mon.hp); }
      if (h.length > 8 && foe.mon.hp >= h[h.length - 9] - KP.maxHp(foe.mon) * 0.05 && !me.vol.berserk) {
        // (each one's best hit on it as the battle works it out: abilities, items, the field; kp_tactics.js)
        const hits = (m) => { if (KP.tactics && KP.tactics.best) { const g = KP.tactics.ghost(B, m, me.side); return KP.tactics.best(B, g, foe).sus; } return Math.max(0, ...m.moves.map(id => KP.MOVES[id]).filter(mv => mv && mv.power).map(mv => mv.power * KP.effOn(mv.type, foe.mon) * ((mv.type === KP.sp(m).type || mv.type === KP.sp(m).type2) ? 1.5 : 1))) * KP.stat(m, 'atk'); };
        const alt = d.party.filter(m => m !== me.mon && m.hp > 0).sort((x, y) => hits(y) - hits(x))[0];
        h.length = 0;
        if (alt && hits(alt) > hits(me.mon)) { B._switchFor = foe.mon.uid; B._sendIn = alt; return 'moogles'; }
        if (B.o.kind === 'wild') return 'run';         // (a wild one not worth the day)
      }
      // (a gauntlet's fight with more to come, B.o.gauntlet: a member under a third of its HP and losing its race steps out
      // for a healthier teammate that fares better, keeping what HP it has for the fights ahead; once per foe moogle)
      if (B.o.gauntlet > 1 && hp < 0.35 && B._saveFor !== foe.mon.uid && !me.vol.berserk && KP.tactics && KP.tactics.race) {
        let stay = 0; try { stay = KP.tactics.race(B, me, foe); } catch (e) { stay = 0; }
        if (stay < 0) {
          const alt = d.party.filter(m => m !== me.mon && m.hp > KP.maxHp(m) * 0.5).map(m => [m, KP.brain.matchup(B, m, foe.mon)]).sort((a, b) => b[1] - a[1])[0];
          if (alt && alt[1] >= 1) { B._saveFor = foe.mon.uid; B._sendIn = alt[0]; return 'moogles'; }
        }
      }
      if (B._switchFor !== foe.mon.uid && !me.vol.berserk && !(KP.tactics && KP.tactics.disablePlay(B, me, foe))) {   // (not when it can put a sweeper to sleep)
        const mine = KP.brain.matchup(B, me.mon, foe.mon);
        if (mine < 0.9) {
          const alt = d.party.filter(m => m !== me.mon && m.hp > KP.maxHp(m) * 0.45).map(m => [m, KP.brain.matchup(B, m, foe.mon)]).sort((a, b) => b[1] - a[1])[0];
          if (alt && alt[1] > mine * 1.6 && alt[1] >= 1) { B._switchFor = foe.mon.uid; B._sendIn = alt[0]; return 'moogles'; }
        }
      }
      // items (wild battles only: every trainer battle is noBag, the user's rule): an oil when low, one that brings back
      // most of what it lost (or a Max Oil when it's nearly down)
      if (!B.o.noBag && (B._oiled || 0) < 3 && hp < 0.3) {
        const lost = KP.maxHp(me.mon) - me.mon.hp;
        const oil = ['oil_can', 'hi_oil', 'max_oil'].find(k => d.bag[k] > 0 && KP.ITEMS[k].heal >= lost * 0.6) || (d.bag.max_oil > 0 ? 'max_oil' : null);
        if (oil) { B._plan = oil; B._planOn = me.mon; B._oiled = (B._oiled || 0) + 1; return 'bag'; }
      }
      return 'fight';
    },
    // how well a moogle stands against the foe: its best hit on the foe over the foe's best hit on it (types, STAB, stats)
    matchup(B, mon, foeMon, o) {
      if (KP.tactics && KP.tactics.matchup) return KP.tactics.matchup(mon, foeMon, B, o);   // (kp_tactics.js: the race, as the max AI's; outside a battle the plain measure)
      const sp = KP.sp(mon), fsp = KP.sp(foeMon);
      const hit = (a, t) => Math.max(1, ...a.moves.map(id => KP.MOVES[id]).filter(mv => mv && mv.power).map(mv => KP.hitWorth(a, t, mv)));
      const mine = hit(mon, foeMon), theirs = hit(foeMon, mon);
      return (mine / Math.max(1, theirs)) * (mon.hp / KP.maxHp(mon) + 0.25);
    },
  };

  // ------------------------------------------------------------------ driving the screens: move a cursor, then OK
  let waitT = 0;
  const later = (n) => { waitT = n; };
  // a list cursor (index cur -> want; cols: 2 for the 2x2 battle menus); true when it's there
  const steer = (cur, want, cols) => {
    if (cur === want) return true;
    if (cols === 2) { const dr = Math.floor(want / 2) - Math.floor(cur / 2), dc = (want % 2) - (cur % 2); R.tap(dr ? (dr > 0 ? 'down' : 'up') : (dc > 0 ? 'right' : 'left')); }
    else R.tap(want > cur ? 'down' : 'up');
    later(pace());
    return false;
  };
  const ok = (n) => { if (R.tap('ok')) later(n == null ? pace() : n); };

  function driveBattle(B) {
    const u = B.ui;
    if (B.text && !B.textHold) { if ((B.textT || 0) > Math.min(read(), (B.textAuto || 90) - 2)) ok(2); return; }
    if (!u) return;
    if (u.kind === 'command') {
      const want = ['fight', 'moogles', 'bag', 'run'].indexOf(u._want || (u._want = KP.brain.command(B)));
      if (steer(u.idx, want, 2)) ok();
    } else if (u.kind === 'moves') {
      const ms = B.me.mon.moves, id = u._want || (u._want = KP.brain.best(B, B.me, B.foe) || ms[0]);
      if (steer(u.idx, Math.max(0, ms.indexOf(id)), 2)) ok();
    } else if (u.kind === 'bag') {   // (the Repairs pocket: the plan's oil or Battery)
      if ((u.pocket || 0) !== 0) { if (R.tap('left')) later(pace()); return; }
      const L = KP.pocketItems(0, D().bag), want = B._plan ? L.indexOf(B._plan) : -1;
      if (want < 0) { if (R.tap('cancel')) later(pace()); return; }
      if (steer(u.idx, want, 1)) { B._plan = null; ok(); }
    } else if (u.kind === 'party') {
      const P = D().party;
      const target = u.item ? (B._planOn || B.me.mon) : u._want || (u._want = (!u.forced && B._sendIn) || KP.brain.sendIn(B, P.filter(m => m.hp > 0 && m !== B.me.mon)));
      if (!target) { if (R.tap('cancel')) later(pace()); return; }
      if (steer(u.idx, P.indexOf(target), 1)) ok();
    } else if (u.kind === 'preview') {   // (a tournament's team preview: its lead, as the AI picks one against their kinds: kp_preview.js)
      const want = u._want || (u._want = KP.previewLead ? KP.previewLead(u.list, B.foes) : u.list[0]);
      if (steer(u.idx, Math.max(0, u.list.indexOf(want)), 1)) ok();
    } else if (u.kind === 'nut') {
      const L = NUTS().filter(k => (D().bag[k] || 0) > 0).concat([null]);
      const want = u._want !== undefined ? u._want : (u._want = KP.brain.nut(B));
      if (steer(u.idx, Math.max(0, L.indexOf(want)), 1)) ok();
    }
  }
  function driveEvolve(E) {
    if (E.text) { ok(read()); return; }
    if (E.ask && !E.ask.done) { if (steer(E.ask.idx, 1, 1)) ok(); }   // (the new job's moves: "No, the new ones")
  }
  function drivePicker(P) {
    // the tactics engine's four (learning a move: whether it's worth one it knows); else the picker's own if it's a
    // full, valid four; else by power, one with no cooldown
    // (only moves on offer: the tactics engine's four can name one the moogle knows that the picker doesn't list)
    const free = (id) => !(KP.MOVES[id] || {}).cd, anyFree = P.pool.some(free);   // (the picker's own rule: kp_menu.js Picker)
    const valid = (sel) => sel.size === Math.min(4, P.pool.length) && [...sel].every(id => P.pool.includes(id)) && (!anyFree || [...sel].some(free));
    if (!P._want && KP.tactics && P.mon) { const four = R.kpWantFrom ? R.kpWantFrom(P.mon, P.pool) : KP.tactics.pickFour(P.mon, P.pool); if (valid(new Set(four))) P._want = new Set(four); }   // (its ideal four, of what's on offer)
    if (!P._want) {
      if (valid(P.sel)) P._want = new Set(P.sel);
      else {
        const by = P.pool.slice().sort((a, b) => ((KP.MOVES[b] || {}).power || 20) - ((KP.MOVES[a] || {}).power || 20));
        const pick = new Set(); const free = by.find(id => !(KP.MOVES[id] || {}).cd); if (free) pick.add(free);
        for (const id of by) { if (pick.size >= Math.min(4, P.pool.length)) break; pick.add(id); }
        P._want = pick;
      }
    }
    // untick what it doesn't want first (four ticked, the picker takes no more), then tick what it does, then Done
    const rm = P.pool.findIndex(id => P.sel.has(id) && !P._want.has(id)), add = P.pool.findIndex(id => !P.sel.has(id) && P._want.has(id));
    const target = rm >= 0 ? rm : add >= 0 ? add : P.pool.length;
    if (steer(P.idx, target, 1)) ok();
  }
  function driveShop(sh) {
    if (sh.msg) { ok(read()); return; }
    const plan = R.kpShopPlan || [];
    const d = D();
    const next = plan.find(([id, n]) => (d.bag[id] || 0) < n && sh.stock.includes(id) && sh.most(id) > 0);
    if (sh.qty != null) {
      const [id, n] = next || [sh.stock[sh.idx], 1];
      const want = Math.max(1, Math.min(sh.most(id), n - (d.bag[id] || 0)));
      if (sh.qty === want) { ok(); return; }
      R.tap(want - sh.qty >= 10 ? 'right' : sh.qty - want >= 10 ? 'left' : want > sh.qty ? 'up' : 'down'); later(R.fast ? 1 : 4);
      return;
    }
    // (the Mart's pockets, as the bag's: across to the one it's in, then down the pocket to it; nothing left, back out)
    if (!next) { if (R.tap('cancel')) later(pace()); return; }
    const pk = sh.lists.findIndex(L => L.includes(next[0]));
    if (sh.pocket !== pk) { R.tap(pk > sh.pocket ? 'right' : 'left'); later(pace()); return; }
    if (steer(sh.idx, sh.list().indexOf(next[0]), 1)) ok();
  }
  // the Town Map (Big Mog's Bell): down the list to R.kpFlyTarget, OK, and Yes; any other time, back out
  function driveTownMap(T) {
    const want = R.kpFlyTarget ? T.list.findIndex(t => t.town === R.kpFlyTarget) : -1;
    if (want < 0) { if (R.tap('cancel')) later(pace()); return; }
    if (T.confirm) { if (T.confirm.idx !== 0) { R.tap('up'); later(pace()); return; } ok(); return; }
    if (steer(T.idx, want, 1)) ok(read());
  }
  // the Mog Box screen: R.kpBoxPlan's moves, one at a time (lift the moogle, carry it, put it down), then close. 50
  // boxes of 30 (js/kupomon/kp_box.js), each boxed moogle at its own place (mon.bx): another box by L1 / R1 (A / S) the
  // shorter way round (Box 50 and Box 1 are joined), from any zone, as a player flips through them
  function steerBox(B, t) {
    if (t.zone === 'team') {
      if (B.zone === 'header') return 'down';
      if (B.zone === 'box') return 'left';
      return B.ti === t.i ? true : B.ti < t.i ? 'down' : 'up';
    }
    const n = KP.BOXES || 50;
    if (B.page !== t.page) { const f = (t.page - B.page + n) % n; return f <= n - f ? 'r1' : 'l1'; }
    if (B.zone === 'team') return 'right';
    if (B.zone === 'header') return 'down';
    const cols = 6, r = Math.floor(B.bi / cols), c = B.bi % cols, tr = Math.floor(t.k / cols), tc = t.k % cols;
    return r !== tr ? (r < tr ? 'down' : 'up') : c !== tc ? (c < tc ? 'right' : 'left') : true;
  }
  function driveBox(B) {
    const d = D(), plan = R.kpBoxPlan;
    if (B.msg) { ok(); return; }
    if (B.summary || B.sortMenu) { if (R.tap('cancel')) later(pace()); return; }
    while (plan && plan.length && plan[0].done()) plan.shift();
    if (!plan || !plan.length) { if (R.tap('cancel')) later(pace()); return; }   // (put back anything held, then close)
    if (B.pop) { if (B.pop.idx === 0) ok(); else { R.tap('up'); later(R.fast ? 1 : 4); } return; }
    const op = plan[0], per = KP.BOX_SIZE || 30, n = KP.BOXES || 50;
    const grid = KP.boxGrid(d);   // (every boxed moogle given its place: mon.bx)
    const posOf = (mon) => { const i = d.party.indexOf(mon); if (i >= 0) return { zone: 'team', i }; if (!d.box.includes(mon) || mon.bx == null) return null; return { zone: 'box', page: Math.floor(mon.bx / per), k: mon.bx % per }; };
    // (a team member put away: the free place nearest the box on screen, this one first, then one either side...)
    const freeNear = () => { for (let k = 0; k <= n / 2; k++) for (const q of [(B.page + k) % n, (B.page + n - k) % n]) for (let j = 0; j < per; j++) if (!grid[q * per + j]) return { zone: 'box', page: q, k: j }; return null; };
    const heldMon = B.held ? B.monAt(B.held) : null;
    if (heldMon && heldMon !== op.pick) { if (R.tap('cancel')) later(pace()); return; }
    const t = !heldMon ? posOf(op.pick)
      : op.onto === 'team-end' ? { zone: 'team', i: d.party.length }
      : op.onto === 'box-end' ? freeNear()
      : posOf(op.onto);
    if (!t) { plan.shift(); return; }
    const btn = steerBox(B, t);
    if (btn === true) ok(); else { R.tap(btn); later(R.fast ? 1 : 4); }
  }
  // the stall watch (R.watch): a battle is moving while its turns, HP or messages change (a long 5-on-5 is no stall)
  const busyKey0 = R.busyKey;
  R.busyKey = function () {
    const top = R.top();
    if (KP && top instanceof KP.Battle) return 'kb:' + (top.turn || 0) + ':' + top.d.party.concat(top.foes).map(m => m.hp).join() + ':' + String(top.text || '').slice(0, 24) + ':' + (top.ui ? top.ui.kind + ',' + top.ui.idx : '');
    if (KP && KP.Bracket && top instanceof KP.Bracket) return 'kbr:' + String(top.text || '').slice(0, 24) + ':' + (top.round || 0) + ':' + (top.match || 0);
    return busyKey0();
  };
  // the hook in R.handle: a Kupomon screen on top -> worked here (busy); null for anything else
  R.sceneHook = function (top) {
    if (!top || !KP) return null;
    if (waitT > 0) { waitT--; if (top instanceof KP.Battle || top instanceof KP.Shop || (KP.Evolve && top instanceof KP.Evolve) || (KP.Picker && top instanceof KP.Picker) || (KP.Bracket && top instanceof KP.Bracket) || (KP.Hatch && top instanceof KP.Hatch) || (KP.Trade && top instanceof KP.Trade) || (KP.BoxView && top instanceof KP.BoxView) || (KP.TownMap && top instanceof KP.TownMap)) return true; }
    if (top instanceof KP.Battle) { driveBattle(top); return true; }
    if (KP.Evolve && top instanceof KP.Evolve) { driveEvolve(top); return true; }
    if (KP.Picker && top instanceof KP.Picker) { drivePicker(top); return true; }
    if (top instanceof KP.Shop) { driveShop(top); return true; }
    if (KP.BoxView && top instanceof KP.BoxView) { driveBox(top); return true; }
    if (KP.Bracket && top instanceof KP.Bracket) {
      if (top.ask) { const want = top.ask.opts.indexOf('Leave'); if (top.ask.idx !== want) { if (R.tap('down')) later(pace()); } else ok(pace()); return true; }   // (knocked out: the Demo always leaves)
      if (top.text) ok(read()); return true;
    }
    if (KP.Hatch && top instanceof KP.Hatch) { if (top.text) ok(read()); return true; }
    if (KP.TownMap && top instanceof KP.TownMap) { driveTownMap(top); return true; }
    if (KP.HallOfFame && top instanceof KP.HallOfFame) { if (top.t >= 40) ok(read()); return true; }
    if (top instanceof KP.Menu) { if (R.kpMenuOwn) return false; if (R.tap('cancel')) later(pace()); return true; }   // ours (kp_lead), else a stray one: closed
    if (KP.Title && top instanceof KP.Title) return R.kpTitleOwn ? false : true;
    return null;
  };

  // ------------------------------------------------------------------ side tasks inside Kupomon: a team in a bad way
  // after a battle goes for repairs (the last Mog Repair used), then back to where it was
  const worn = () => {
    const P = D().party; if (!P.length) return false;
    const down = P.filter(m => m.hp <= 0).length, frac = P.reduce((a, m) => a + m.hp, 0) / P.reduce((a, m) => a + KP.maxHp(m), 0);
    return down >= Math.max(1, Math.ceil(P.length / 2)) || frac < 0.33 || (P.length === 1 && frac < 0.5);
  };
  // how many maps away the nearest Mog Center is (0: on it)
  R.kpCenterHops = function () {
    const dist = R.kpDist(R.where());
    return Math.min(99, ...Object.keys(FF7.maps).filter(k => /^kp_(.+_)?center$/.test(k)).map(c => dist[c] ?? 99));
  };
  // the bag can put the team right: a Battery for each downed moogle, and oils for the rest
  R.kpCanPatch = function () {
    const d = D(), down = d.party.filter(m => m.hp <= 0).length, oils = ['oil_can', 'hi_oil', 'max_oil'].reduce((a, k) => a + (d.bag[k] || 0), 0);
    return down <= (d.bag.battery || 0) && (oils >= 2 || d.party.every(m => m.hp <= 0 || m.hp >= KP.maxHp(m) * 0.6));
  };
  // a team in a bad way: as a player does, out of the bag when no Mog Center is close (more than a map away) and the bag
  // can do it, else the walk to one (and back)
  R.kpRecover = function* (back, center) {
    if (!center && R.kpCenterHops() >= 2 && R.kpCanPatch()) {
      R.say('kupomon: patching the team up from the bag (no Mog Center nearby)');
      R.kpLabel = 'Patching the team up from the bag';
      try { yield* O.kp_patch({ max: 12, below: 0.6, cure: true }); } finally { R.kpLabel = null; }
      R.stepStart = R.frames;
      if (!worn()) return true;
    }
    return yield* R.kpHealTrip(back, center);
  };
  let lastPatch = -1;
  R.kpSide = function () {
    // (never in the middle of a flight: the user saw the Demo land at Mogfield for the Move Relearner, get walked off to
    // the Recycler by the side tasks while the flight was still waiting to land, and give up on the relearner)
    if (R._flying) return;
    { const why = demoSaveDue(); if (why) { demoDue = null; demoSavedAt = Date.now(); R.side = R.kpVisibleSave(why); return; } }   // (the Demo file)
    if (R.side || R.kpNoHeal || R._kpHealFailPc === R.pc) return;   // (a trip that found no way out waits for the next step)
    if (KP.healLocked && KP.healLocked()) return;   // (Omega's gauntlet under way: no repairs, no oils, no walking out: kp_lq_1.js)
    if (R._kpLoss && !R._kpOwnLoss && R.fieldFree && R.field() && R.fieldFree(R.field())) {   // (a trainer lost to outside a fight that handles it)
      const L0 = R._kpLoss;
      // (the box looked over, then training for the rematch somewhere that doesn't walk past whoever won, then repairs:
      // the user saw it walk back into the same trainer again and again, its newcomers never trained)
      R.side = (function* () {
        yield* R.kpSmartTeam({ foes: L0.foes, avoid: L0.map ? [L0.map] : [] });
        yield* R.kpLossTrain(L0);
        yield* O.kp_heal({ center: 'nearest' }); R.stepStart = R.frames; return true;
      })();
      return;
    }
    if (R.plan && R.plan[R.pc] && R.plan[R.pc][0] === 'kp_heal') return;   // (the step is a repair trip itself: it would walk back)
    { const fsr = R.field(), best = R.kpBestRepel();   // (a Pom Spray: the whole team at the level cap, nothing to gain from wild moogles)
      if (best && R.kpWantRepel() && fsr && fsr.player && fsr.map && fsr.map.kpWild && R.fieldFree(fsr)) { R.side = (function* () { yield* R.kpUseRepel(best); R.stepStart = R.frames; return true; })(); return; } }
    if (worn()) { R.side = R.kpRecover(true); return; }
    // in a town or a Mog Center, a team not at full health is repaired at the counter (the user, 2026-10-02); once a visit
    { const fs0 = R.field(), here = R.where();
      if (fs0 && fs0.player && R.fieldFree(fs0) && R.kpInTown(here) && D().party.some(m => m.hp < KP.maxHp(m)) && R._kpTownHeal !== here + ':' + fs0.loadGen) {
        R._kpTownHeal = here + ':' + fs0.loadGen;
        R.side = (function* () { R.kpLabel = 'Repairs at the Mog Center'; try { yield* O.kp_heal({ center: R.kpNearestCenter(), noShop: true }); } finally { R.kpLabel = null; } R.stepStart = R.frames; return true; })();
        return;
      } }
    // after a battle, anyone left badly hurt gets an oil from the bag (two of each kept back for the battles)
    if (R.kpBattles !== lastPatch && R.fieldFree && R.field() && R.fieldFree(R.field())) {
      lastPatch = R.kpBattles;
      const d = D();
      if (d.party.some(m => m.hp > 0 && m.hp < KP.maxHp(m) * 0.35) && ['oil_can', 'hi_oil'].some(k => (d.bag[k] || 0) > 2)) {
        R.side = (function* () { yield* O.kp_patch({ max: 3, below: 0.35, keep: 2 }); R.stepStart = R.frames; return true; })();
        return;
      }
    }
    // the area sweep (R.kpSweep): the area it's in, or one saved for later it can now take on
    { const fsw = R.field(); if (fsw && fsw.player && R.fieldFree(fsw)) { const a = R.kpSweepNext && R.kpSweepNext(); if (a) { R.side = (function* () { yield* R.kpSweep(a); R.stepStart = R.frames; return true; })(); return; } } }
    // (the Shinra Recycler trip is a chore between steps now, R.preStep below: as a side task it could fire while a
    // step's errand was already under way, and the user saw the Demo stop, its Mart step left talking to a merchant in
    // the Mt. Kupo Caves)
    // every pick-up on the map the party is on (a Skill Chip, a nut, an oil; a hidden one too, the Demo plays with the
    // guide): over to it, as a player goes for a sparkle (the user, 2026-10-02: none walked past, near the way or not).
    // Nearest first; one the walk can't reach now (a gate, a ledge's far side) waits for a later visit, and one that
    // fails three times is left to the 100% sweep (kp_items)
    const fs = R.field(); if (!fs || !fs.player || !fs.P || !R.fieldFree(fs) || !/^kp_/.test(fs.map.id)) return;
    const visit = '@' + fs.map.id + ':' + fs.loadGen, p = fs.player;
    // (a map's first free moment is always looked over: the side tasks run at the walk's stops, and a 1-in-30 frame
    // gate missed most maps, so the Demo walked past items; after that, every 30 frames)
    if (R._kpScanned === visit && R.frames % 30 !== 0) return;
    R._kpScanned = visit;
    // (one out of reach now is looked at again every 30 frames, not written off for the visit: the user saw the Demo
    // leave Vincent's dojo items behind, unreachable at its first look, open once its own levers had moved)
    const cand = R.kpPickups(fs).filter(c => !R._kpTried.has(c.id + visit) && (R._kpFails[c.id] || 0) < 3)
      .sort((a, b) => Math.hypot(a.at[0] - p.tx, a.at[1] - p.ty) - Math.hypot(b.at[0] - p.tx, b.at[1] - p.ty));
    for (const c of cand) {
      const goals = [];
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx || dy) && fs.P.walkable(c.at[0] + dx, c.at[1] + dy)) goals.push([c.at[0] + dx, c.at[1] + dy]);
      if (goals.length && R.fieldPath(fs, goals)) { R._kpTried.add(c.id + visit); R.side = R.kpGrab(c); return; }
    }
    // (none in reach as the map stands: one behind a setting of its levers, flipped there and back; looked into once a
    // visit for each setting)
    if (cand.length) {
      const lk = visit + '|' + leverInfo(fs).flags.map(f => FF7.state.flags[f] ? 1 : 0).join('');
      if (R._kpLeverLooked !== lk) {
        R._kpLeverLooked = lk;
        const plan = R.kpItemLevers(fs, cand);
        if (plan) { R._kpTried.add(plan.item.id + visit); R.side = R.kpLeverGrab(plan); return; }
      }
    }
  };
  // ---- an item behind the map's levers (W.toggle: the dojos' puzzles). The route sets them only as its own way needs
  // (Vincent's clock: both, for the stair), and some items lie behind another setting (his study behind one lever, the
  // closet behind the other). Planned on the map as it stands: the levers to flip, in an order where each can be walked
  // to when its turn comes, to a setting with the item in reach; then from beside the item the flips back to how the
  // route left them (its lever steps are done by their flags). Breadth first over (setting, where the party stands)
  const leverInfo = (fs) => { const levers = (fs.objects || []).filter(o => o.toggleFlag && !o.toggleOnce && o.at); return { levers, flags: [...new Set(levers.map(o => o.toggleFlag))] }; };
  R.kpItemLevers = function (fs, items) {   // (R.kpLeverPlan, below, is the walks' own: pulls that open a way, not put back)
    const { levers, flags } = leverInfo(fs); if (!levers.length || flags.length > 4) return null;
    const fl = FF7.state.flags, pl = fs.player, px = pl.tx, py = pl.ty;
    const m0 = flags.reduce((m, f, i) => m | (fl[f] ? 1 << i : 0), 0);
    const setMask = (m) => { flags.forEach((f, i) => { fl[f] = !!(m & (1 << i)); }); fs.objects.forEach(o => { if (o.tick) o.tick(o); }); };
    const nextTo = (at) => [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dx, dy]) => [at[0] + dx, at[1] + dy]).filter(([x, y]) => fs.P.walkable(x, y));
    const around = (at) => { const g = []; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx || dy) && fs.P.walkable(at[0] + dx, at[1] + dy)) g.push([at[0] + dx, at[1] + dy]); return g; };
    // (where a walk from `from` to one of the goals ends, or null: the path finder planned from that spot)
    const reach = (from, goals) => { if (!goals.length) return null; pl.tx = from[0]; pl.ty = from[1]; const path = R.fieldPath(fs, goals); return path ? (path.length ? path[path.length - 1] : from) : null; };
    const key = (m, at) => m + '|' + at[0] + ',' + at[1];
    const search = (s0, done) => {
      const seen = new Set([key(s0.m, s0.at)]), q = [s0];
      while (q.length) {
        const st = q.shift(); setMask(st.m);
        const hit = done(st); if (hit) return hit;
        if (st.flips.length >= 4) continue;
        for (const o of levers) {
          const end = reach(st.at, nextTo(o.at)); if (!end) continue;
          const n = { m: st.m ^ (1 << flags.indexOf(o.toggleFlag)), at: end, flips: st.flips.concat([o]) }, k = key(n.m, n.at);
          if (!seen.has(k)) { seen.add(k); q.push(n); }
        }
      }
      return null;
    };
    try {
      const there = search({ m: m0, at: [px, py], flips: [] }, (st) => {
        if (st.m === m0) return null;
        for (const it of items) { const end = reach(st.at, around(it.at)); if (end) return { st, it, end }; }
        return null;
      });
      if (!there) return null;
      const back = search({ m: there.st.m, at: there.end, flips: [] }, (st) => st.m === m0 ? st : null);
      return back ? { item: there.it, there: there.st.flips, back: back.flips } : null;
    } finally { pl.tx = px; pl.ty = py; setMask(m0); }
  };
  R.kpLeverGrab = function* (plan) {
    const lab = R.kpLabel, it = plan.item, name = KP.ITEMS[it.kp] ? KP.ITEMS[it.kp].name : 'an item';
    R.say('kupomon: the levers for ' + name + ': ' + plan.there.map(o => o.toggleFlag).join(', ') + ', then back');
    R.kpLabel = 'Working the levers for ' + name;
    try {
      for (const o of plan.there) { const r = yield* O.use(o.at[0], o.at[1]); if (r !== true) { R.note('kp_levers: ' + r); return true; } yield* R.settle(3); }
      yield* R.kpGrab(it);
      for (const o of plan.back) { const r = yield* O.use(o.at[0], o.at[1]); if (r !== true) { R.note('kp_levers: on the way back: ' + r); break; } yield* R.settle(3); }
    } finally { R.kpLabel = lab; }
    R.stepStart = R.frames;
    return true;
  };
  R._kpTried = new Set(); R._kpFails = {};
  // ---- Pom Sprays (kp_repel.js, the user, 2026-10-02: "the demo should use them when their party is max level"): with
  // every member at the level cap (Hard Mode's too) wild moogles give nothing, so a spray stays on while it walks; never
  // while it trains or hunts in the grass (R.kpTraining: a hunt wants them). The longest it has first; restocked at the
  // Marts (R.kpRestock); the wear-off's "Use another?" answered the same way (R.pickChoice below)
  const atCapAll = () => { const d = D(), cap = KP.levelCap ? KP.levelCap() : KP.MAX_LEVEL; return d.party.length > 0 && d.party.every(m => m.lv >= cap); };
  R.kpWantRepel = () => inKP() && !!KP.REPELS && !(KP.repelOn && KP.repelOn()) && atCapAll() && !R.kpTraining;
  R.kpBestRepel = () => (KP.REPELS || []).slice().reverse().find(k => D().bag[k] > 0) || null;
  // through the menu, as a player does: MogBoy menu > Bag > Field Items > the spray, the message read, the menu closed
  R.kpUseRepel = function* (id) {
    const d = D(); if (!(d.bag[id] > 0)) return 'no ' + id + ' left';
    R.kpMenuOwn = true;
    try {
      yield* press('menu', R.fast ? 4 : 14);
      const M = R.top(); if (!(M instanceof KP.Menu)) return 'the menu did not open';
      for (let g = 0; g < 40 && M.idx !== 2; g++) { R.tap(M.idx < 2 ? 'down' : 'up'); yield; yield; }
      yield* press('ok');
      const pk = KP.pocketOf(id);
      for (let g = 0; g < 20 && M.pocket !== pk; g++) { R.tap('right'); yield; yield; yield; }
      const k = KP.pocketItems(pk).indexOf(id);
      for (let g = 0; g < 60 && M.sub !== k; g++) { R.tap(M.sub < k ? 'down' : 'up'); yield; yield; }
      yield* press('ok', R.fast ? 2 : 20);
      if (M.msg) yield* press('ok');
      for (let g = 0; g < 60 && R.top() instanceof KP.Menu; g++) { R.tap('cancel'); yield; yield; }
    } finally { R.kpMenuOwn = false; }
    if (KP.repelOn()) R.say('kupomon: ' + KP.ITEMS[id].name + ' on (the team at the level cap: weaker wild moogles keep away)');
    return true;
  };
  { const pick0 = R.pickChoice;
    R.pickChoice = function (w) {
      const text = w && w.pages ? w.pages.map(p => p.join(' ')).join(' ') : '';
      if (inKP() && /Use another\?/.test(text) && w.choices && w.choices.length > 1) {
        const no = w.choices.length - 1;
        if (!atCapAll() || R.kpTraining) return no;
        let best = -1; (KP.REPELS || []).forEach(k => { const i = w.choices.findIndex(c => c.startsWith(KP.ITEMS[k].name + ' x')); if (i >= 0) best = i; });
        return best >= 0 ? best : no;
      }
      return pick0.call(this, w);
    }; }
  // ---- chores between steps (runner.js R.main calls this before each step's op): the Shinra Recycler (kp_scrap.js, the
  // user's fix for a Demo always out of coins): in a town, short of coins with a fair pile of Scrap Metal, or with a big
  // pile whatever the coins, it takes the scrap to Mt. Kupo (Team Hojo gone). The step then starts from wherever that
  // left the team, as every step can
  const preStep0 = R.preStep;
  R.preStep = function* (step) {
    if (preStep0) yield* preStep0(step);
    if (!inKP() || !R.active) return;
    const d0 = D(), sc = (d0.bag && d0.bag.scrap_metal) || 0, fs0 = R.field(), here = R.where();
    if (FF7.state.flags.kp_r2_scarlet && fs0 && fs0.player && R.fieldFree(fs0) && R.kpInTown(here) && (sc >= 60 || (sc >= 20 && d0.money < 3000)) && R._kpScrapAt !== sc) {
      R._kpScrapAt = sc;
      yield* R.kpScrapRun(d0.money < 3000 ? 'coins running low' : 'a big pile of scrap');
      R.stepStart = R.frames;
    }
  };
  // the Shinra Recycler: every go the scrap allows ("Feed it all"), then any new Skill Chip taught
  R.kpScrapRun = function* (why) {
    const d = D(), have = d.bag.scrap_metal || 0;
    if (have < KP.SCRAP_PER_GO || !FF7.state.flags.kp_r2_scarlet || !FF7.maps.kp_mtkupo_2) return false;
    const m0 = d.money, ans = (choices) => { const i = choices.findIndex(c => /Feed it all/.test(c)); return i >= 0 ? i : choices.findIndex(c => /^Feed/.test(c)); };
    R.say(`kupomon: ${have} Scrap Metal to the Shinra Recycler${why ? ' (' + why + ')' : ''}`);
    R.choices.push({ a: ans, pc: R.pc });
    R.kpLabel = `The Shinra Recycler: ${have} Scrap Metal in, coins and prizes out`;
    let r; try { r = yield* O.talk('kp_mk_recycler', { map: 'kp_mtkupo_2' }); } finally { R.choices = R.choices.filter(c => c.a !== ans); R.kpLabel = null; }
    if (r !== true) { R.note('kp_scrap: ' + r); return false; }
    R.say(`kupomon: the Recycler gave ${(d.money - m0).toLocaleString()} coins (${d.bag.scrap_metal || 0} Scrap Metal left)`);
    if (R.kpChipUses && R.kpChipUses().length) yield* O.kp_teach();
    return true;
  };
  // a town (a place Big Mog lands) or a Mog Center's inside
  R.kpInTown = (id) => !!id && (/^kp_(.+_)?center$/.test(id) || !!(KP.flyTowns && KP.flyTowns().some(t => t.town === id)));
  // after a loss to a trainer outside a fight that trains for itself (a route trainer walked into): training to beat
  // them, a level over their best for each loss to them, somewhere that doesn't pass where it happened; the newcomers
  // and anyone left behind come up with the rest
  R.kpLossTrain = function* (L0) {
    const d = D(), foes = (L0 && L0.foes) || []; if (!foes.length || !d.party.length) return true;
    const n = (R._kpLossN = R._kpLossN || {})[L0.who] = ((R._kpLossN || {})[L0.who] || 0) + 1;
    const cap = KP.levelCap ? KP.levelCap() : KP.MAX_LEVEL, ace = Math.max(...foes.map(f => f.lv));
    const top = Math.max(...d.party.map(m => m.lv)), want = Math.min(cap, Math.max(ace + n, top));
    const low = () => d.party.filter(m => m.lv < want - 2);
    if (!low().length && Math.max(...d.party.map(m => m.lv)) >= want) return true;
    const ground = R.kpTrainGround(want, { avoid: L0.map ? [L0.map] : [] });
    if (!ground) { R.note('kp_losstrain: no training ground away from ' + L0.map); return true; }
    R.say(`kupomon: lost to ${L0.who} (${n}x): training on ${ground} to Lv ${want} before going back`);
    const t = yield* O.kp_train(want, { map: ground, spread: 2, max: 2000, avoid: L0.map,
      label: () => `Lost to ${L0.who}: training for the rematch (team Lv ${d.party.map(m => m.lv).join('/')} → ${want})` });
    if (t !== true) R.note('kp_losstrain: ' + t);
    yield* O.kp_equip();
    return true;
  };
  // the pick-ups on this field: the items lying about, and the hidden ones (a trigger with kpHidden: W.hidden)
  R.kpPickups = function (fs) {
    const fl = FF7.state.flags, out = [];
    (fs.objects || []).forEach(o => { if (o.kind === 'item' && o.id && !fl['got_' + o.id]) out.push({ id: o.id, at: o.at, kp: o.kp, flag: 'got_' + o.id }); });
    (fs.map.triggers || []).forEach(t => { if (t.kpHidden && !fl[t.kpHidden]) out.push({ id: t.kpHidden, at: t.at, kp: t.kp, flag: t.kpHidden, hidden: true }); });
    return out;
  };
  R.kpGrab = function* (o) {
    const r = yield* O.use(o.at[0], o.at[1]);
    yield* R.settle(3);
    const name = KP.ITEMS[o.kp] ? KP.ITEMS[o.kp].name + (o.hidden ? ' (hidden)' : '') : o.hidden ? 'a hidden item' : o.id;
    if (o.flag && FF7.state.flags[o.flag]) R.say('kupomon: picked up ' + name);
    else { R._kpFails[o.id] = (R._kpFails[o.id] || 0) + 1; R.note('kupomon: could not pick up ' + o.id + ': ' + r); }
    if (R.kpChipUses().length) yield* O.kp_teach();
    R.stepStart = R.frames;
    return true;
  };
  // the nearest Mog Center from here (fewest maps away), else the last one used
  R.kpNearestCenter = function () {
    const here = R.where(), d = D();
    let best = null, bn = Infinity;
    for (const id of Object.keys(FF7.maps).filter(k => /^kp_(.+_)?center$/.test(k))) {
      const r = id === here ? [] : R.route(here, id); if (!r) continue;
      if (r.length < bn) { bn = r.length; best = id; }
    }
    return best || (d.repair && d.repair[0]) || 'kp_lab';
  };
  R.kpHealTrip = function* (back, center) {
    const from = R.where(), fs = R.field(), at = fs && fs.player ? [fs.player.tx, fs.player.ty] : null;
    center = center || R.kpNearestCenter();
    R.say('kupomon: off for repairs at ' + center);
    R.kpHealing = true;   // (no wild battles on the way: the brain runs from them)
    const b0 = KP.blackouts;
    let r; try { r = yield* O.kp_heal({ center }); } finally { R.kpHealing = false; }
    if (r !== true) { R.note('kupomon: repairs failed: ' + r); R._kpHealFailPc = R.pc; return true; }
    if (KP.blackouts !== b0) { R.stepStart = R.frames; return true; }   // (blacked out on the way: no walk back towards whoever won; the loss is dealt with first, here by the Mog Box)
    const b1 = KP.blackouts;
    if (back && from && R.where() !== from) {
      const g = yield* R.gotoMap(from, { stop: () => KP.blackouts !== b1 });
      if ((g === true || g === 'mapchanged') && at && R.where() === from) yield* R.walkField([at], { near: 0.3 });
    }
    R.stepStart = R.frames;                          // (the repairs don't count against the step's time)
    return true;
  };

  // ------------------------------------------------------------------ ops
  const O = R.ops;
  R.avoidTiles = ['kp_trapmat'];                     // (Yuffie's trapdoor mats: never walked on)
  // start Kupomon: from an FF7 game, the MogBoy's cartridge (headless runs; the title's Demo is already in)
  O.kp_start = function* () {
    if (inKP()) return true;
    const st = FF7.state;
    if (FF7.sys.inv.addKey) FF7.sys.inv.addKey('mogboy'); else (st.keyItems = st.keyItems || []).push('mogboy');
    st.vars.mogboy_carts = (st.vars.mogboy_carts || 0) | 0x7f;
    KP.play(); KP.enter(null, null);
    yield* R.settle(6);
    return inKP() ? true : 'kupomon did not start';
  };
  // pick the starter on its pad (the lab)
  O.kp_starter = function* (id) {
    if (FF7.state.vars.kp_starter) return true;
    const fs = R.field(); if (!fs) return 'kp_starter: not on a field map';
    const o = fs.objects.find(q => q.id === 'starter_' + id); if (!o) return 'kp_starter: no pad for ' + id;
    R.choices.push({ a: 'Yes', pc: R.pc });
    const r = yield* O.use(o.at[0], o.at[1]);
    return r === true && FF7.state.vars.kp_starter === id ? true : 'kp_starter: ' + r;
  };
  // repairs at a Mog Center (o.center, else the last one used; the lab's professor at the start)
  O.kp_heal = function* (o = {}) {
    const d = D(), center = o.center === 'nearest' ? R.kpNearestCenter() : o.center || (d.repair && d.repair[0]) || 'kp_lab';
    // (a story event on the way or a rival's ambush can leave the party elsewhere: it sets off again. A blackout is
    // the repair itself: the team woke up healed in a Mog Center, and walking on would only meet whoever beat it again)
    const b0 = KP.blackouts;
    for (let t = 0; t < 4 && R.where() !== center; t++) {
      const g = yield* R.gotoMap(center, { stop: () => KP.blackouts !== b0 });
      if (KP.blackouts !== b0) return true;
      if (g !== true && g !== 'mapchanged') return 'kp_heal: ' + g; yield* R.settle(3);
    }
    if (R.where() !== center) return D().party.every(m => m.hp >= KP.maxHp(m) && !m.status) ? true : 'kp_heal: not at ' + center;   // (repaired on the way: a blackout's wake-up)
    R.choices.push({ a: 'Yes', pc: R.pc });
    const r = yield* O.talk(center === 'kp_lab' ? 'prof' : 'nurse');
    R.choices = R.choices.filter(c => c.pc !== R.pc);
    if (r === true && center !== 'kp_lab' && !o.noShop && ((FF7.maps[center] || {}).npcs || []).some(n => n.id === 'merchant')) yield* R.kpRestock();   // (while it's at a Mart anyway: a repair stand with no Mart, as the Proving Ground's, has nothing to buy)
    if (r === true && center !== 'kp_lab') yield* R.kpHardRefill();   // (Hard Mode: the fallen's places filled from the box)
    return r === true ? true : 'kp_heal: ' + r;
  };
  // Hard Mode: a team short of moogles (the fallen) takes the strongest from the Mog Box, as a Nuzlocke player brings
  // up the reserves; they train up to the cap before the next big fight (kp_win)
  R.kpHardRefill = function* () {
    const d = D(); if (!KP.hard || !KP.hard()) return true;
    const room = KP.PARTY_MAX - d.party.length; if (room <= 0 || !d.box.length) return true;
    const take = d.box.slice().sort((a, b) => b.lv - a.lv || R.kpLine(b.sp) - R.kpLine(a.sp)).slice(0, room);
    R.say('kupomon: Hard Mode: ' + take.map(m => KP.monLabel(m)).join(', ') + ' join the team from the box');
    const b = yield* O.kp_box({ take }); if (b !== true) R.note('kp_hardrefill: ' + b);
    return true;
  };
  // Hard Mode cleared: the Kupo League won (the 100% that follows can't be done one befriend an area)
  O.kp_hard_end = function* () {
    if (!KP.hard || !KP.hard()) return true;
    R.say('kupomon: Hard Mode cleared: the Kupo League is won (' + D().party.map(m => KP.monLabel(m)).join(', ') + '; fallen: ' + (D().fallen || []).length + ')');
    yield* R.settle(30);
    R.stop('Hard Mode cleared');
    if (R.demo && R.demo.finish) R.demo.finish('Hard Mode cleared! The Kupo League is won. You have control.');
    return true;
  };
  // a player tops up at the Mart counter while the moogles are repaired: Kupo Nuts when there are fewer than 5 to
  // toss (ten at once: the Mart's free Mognet Nut; Golden ones when the coins run to it), oils when there are fewer
  // than 3, always with coins kept back for what the route still has to buy
  R.kpRestock = function* () {
    const d = D(), m = d.money - (R.kpKeep ? R.kpKeep() : 0);   // (the coins being saved up kept back)
    const nuts = NUTS().filter(k => KP.ITEMS[k].nut < 255).reduce((a, k) => a + (d.bag[k] || 0), 0);
    const oils = ['oil_can', 'hi_oil', 'max_oil'].reduce((a, k) => a + (d.bag[k] || 0), 0);
    const want = {};
    if (nuts < 5) {
      if (m >= 15000) want.golden_nut = (d.bag.golden_nut || 0) + 10;
      else if (m >= 3000) want.kupo_nut = (d.bag.kupo_nut || 0) + 10;
      else if (m >= 1200) want.kupo_nut = (d.bag.kupo_nut || 0) + 5;
    }
    if (oils < 3 && m >= 2500) { if (m >= 10000) want.hi_oil = (d.bag.hi_oil || 0) + 4; else want.oil_can = (d.bag.oil_can || 0) + 5; }
    if (KP.abilityItemStock) for (const k of KP.abilityItemStock(R.where())) {   // (Kupo Capsules and Patches the ability plan wants, coins to spare)
      const n = (R._kpAbilityWant || {})[k] || 0; if (n > 0 && m - KP.ITEMS[k].price * n >= 10000) want[k] = (d.bag[k] || 0) + n;   // (10,000 kept back)
    }
    if (KP.REPELS && atCapAll() && m >= 8000 && KP.REPELS.reduce((a, k) => a + (d.bag[k] || 0), 0) < 3) {   // (Pom Sprays: the best this Mart sells)
      const sold = KP.repelStock(R.where()), best = sold[sold.length - 1]; if (best) want[best] = (d.bag[best] || 0) + 10;
    }
    if (!Object.keys(want).length) return true;
    R.say('kupomon: restocking at the Mart (' + Object.keys(want).map(k => KP.ITEMS[k].name).join(', ') + '; ' + nuts + ' nuts, ' + oils + ' oils left)');
    const r = yield* O.kp_buy(want);
    if (r !== true) R.note('kp_restock: ' + r);
    return true;
  };
  // buy at this town's Mart: { item: count wanted in the bag } (o.center: go there first)
  O.kp_buy = function* (want, o = {}) {
    if (o.center && R.where() !== o.center) { const g = yield* R.gotoMap(o.center); if (g !== true && g !== 'mapchanged') return 'kp_buy: ' + g; yield* R.settle(3); }
    const at = o.center || R.where();   // (the Mart it means, whatever walks the team off in the meantime: the talk goes back there)
    const d = D(), plan = Object.keys(want).map(id => [id, want[id]]).filter(([id, n]) => (d.bag[id] || 0) < n);
    if (!plan.length && !(KP.chipStock && KP.chipStock(at).length) && !R.kpMartHeld(at).length) return true;
    const first = (id) => ({ heal: 0, revive: 1, cure: 2 })[KP.ITEMS[id] && KP.ITEMS[id].kind] ?? 3;   // (the oils before the nuts, as the coins run out)
    plan.sort((a, b) => first(a[0]) - first(b[0]));
    const here = KP.chipStock ? KP.chipStock(at) : [], cost = plan.reduce((a, [id, n]) => a + (KP.ITEMS[id] ? KP.ITEMS[id].price * Math.max(0, n - (d.bag[id] || 0)) : 0), 0);
    let spare = d.money - cost - 2500 - (R.kpKeep ? R.kpKeep() : 0);   // (the coins being saved up kept back)
    for (const id of here) {
      const it = KP.ITEMS[id]; if (d.bag[id] || it.price > spare) continue;
      if (d.party.some(m => !m.moves.includes(it.move) && KP.chipFits(m, id) && KP.tactics && KP.tactics.pickFour(m, m.moves.concat([it.move])).includes(it.move))) { plan.push([id, 1]); spare -= it.price; }
    }
    if (spare > 0) for (const id of yield* R.kpHeldToBuy(at, spare)) { plan.push([id, 1]); spare -= KP.ITEMS[id].price; }   // (a held item a member would clearly gain from)
    if (!plan.length) return true;
    R.kpShopPlan = plan;
    const r = yield* O.talk('merchant', { map: at });
    R.kpShopPlan = null;
    if (R.kpChipUses().length) yield* O.kp_teach();   // (a chip just bought: taught at once)
    if (plan.some(([id]) => isHeld(id) && d.bag[id] > 0)) yield* O.kp_equip();   // (a held item just bought: on at once)
    return r === true ? true : 'kp_buy: ' + r;
  };
  // the lead moogle, through the Kupomon menu (Moogles > Swap): o.who: 'strongest' | 'weakest' | a moogle
  const press = function* (b, n) { for (let g = 0; g < 30 && !R.tap(b); g++) yield; yield; for (let i = 0; i < (n == null ? pace() : n); i++) yield; };
  R.kpSwapLead = function* (mon) {
    const d = D(), j = d.party.indexOf(mon);
    if (j <= 0) return true;
    R.kpMenuOwn = true;
    try {
      yield* press('menu', R.fast ? 4 : 14);
      const M = R.top(); if (!(M instanceof KP.Menu)) return 'the menu did not open';
      while (M.idx !== 0) { R.tap('up'); yield; yield; }
      yield* press('ok');
      while (M.sub !== 0) { R.tap('up'); yield; yield; }
      yield* press('ok');                              // the moogle at the top: Summary / Swap / ...
      if (M.ask) { while (M.ask && M.ask.idx !== 1) { R.tap('down'); yield; yield; } yield* press('ok'); }
      while (M.sub !== j) { R.tap('down'); yield; yield; }
      yield* press('ok', R.fast ? 2 : 16);             // swapped
      yield* press('cancel'); yield* press('cancel');
      for (let g = 0; g < 60 && R.top() instanceof KP.Menu; g++) { R.tap('cancel'); yield; yield; }
    } finally { R.kpMenuOwn = false; }
    return d.party[0] === mon ? true : 'the swap did not take';
  };
  // an item from the bag on one moogle, through the menu (Bag > the item > the moogle)
  R.kpUseItem = function* (id, mon) {
    const d = D();
    if (!(d.bag[id] > 0)) return 'no ' + id + ' left';
    R.kpMenuOwn = true;
    try {
      yield* press('menu', R.fast ? 4 : 14);
      const M = R.top(); if (!(M instanceof KP.Menu)) return 'the menu did not open';
      for (let g = 0; g < 40 && M.idx !== 2; g++) { R.tap(M.idx < 2 ? 'down' : 'up'); yield; yield; }
      yield* press('ok');
      const pk = KP.pocketOf(id);   // (its pocket first, left / right; then down the pocket to it)
      for (let g = 0; g < 20 && M.pocket !== pk; g++) { R.tap('right'); yield; yield; yield; }
      const k = KP.pocketItems(pk).indexOf(id);
      for (let g = 0; g < 200 && M.sub !== k; g++) { R.tap(M.sub < k ? 'down' : 'up'); yield; yield; }
      yield* press('ok');
      if (!M.ask) return 'the bag did not ask for a moogle';
      const j = d.party.indexOf(mon);
      for (let g = 0; g < 60 && M.ask && M.ask.idx !== j; g++) { R.tap(M.ask.idx < j ? 'down' : 'up'); yield; yield; }
      yield* press('ok', R.fast ? 2 : 20);
      for (let g = 0; g < 3000 && (M.chipCo || (KP.Picker && R.top() instanceof KP.Picker)); g++) yield;   // (a Skill Chip: the forget-a-move choice)
      if (M.msg) yield* press('ok');
      for (let g = 0; g < 60 && R.top() instanceof KP.Menu; g++) { R.tap('cancel'); yield; yield; }
    } finally { R.kpMenuOwn = false; }
    return true;
  };
  // a save the way a player makes one: MogBoy menu > Save > Demo File, the message read, the menu closed (a direct write,
  // with a notice on screen, if the menu wouldn't do it)
  R.kpVisibleSave = function* (why) {
    const n0 = R._kpDemoSaves || 0, label0 = R.kpLabel;
    R.kpLabel = 'Saving to the Demo file';
    R.kpMenuOwn = true;
    try {
      yield* press('menu', R.fast ? 4 : 14);
      const M = R.top();
      if (M instanceof KP.Menu) {
        for (let g = 0; g < 40 && M.idx !== 4; g++) { R.tap(M.idx < 4 ? 'down' : 'up'); yield; yield; }
        yield* press('ok');
        for (let g = 0; g < 20 && M.ask && M.ask.idx !== 0; g++) { R.tap('up'); yield; yield; }
        if (M.ask) yield* press('ok', read());          // ("Saved to the Demo file.", read)
        if (M.msg) yield* press('ok');
        for (let g = 0; g < 60 && R.top() instanceof KP.Menu; g++) { R.tap('cancel'); yield; yield; }
      }
    } finally { R.kpMenuOwn = false; R.kpLabel = label0; }
    if ((R._kpDemoSaves || 0) === n0 && KP.saveDemoNow() && FF7.ui && FF7.ui.notice) FF7.ui.notice('Saved to the Demo file', 90);
    R.say('kupomon: saved to the Demo file (' + why + ')');
    R.stepStart = R.frames;
    return true;
  };
  // ------------------------------------------------------------------ a moogle's ideal four: the tactics engine's pick of
  // everything it could know right now (what it knows, what the Memory Mog would restore, the bag's Skill Chips that fit
  // it). Every move decision aims at it (learning, evolving, breeding, chips, the relearner), so they never undo each other
  R.kpChipMoves = (m) => Object.keys(D().bag).filter(k => KP.ITEMS[k] && KP.ITEMS[k].kind === 'chip' && KP.chipFits && KP.chipFits(m, k)).map(k => KP.ITEMS[k].move);
  R.kpIdeal = (m) => R.kpFour(m, Array.from(new Set(m.moves.concat(KP.relearnable ? KP.relearnable(m) : [], R.kpChipMoves(m)))).filter(id => KP.MOVES[id]));
  // ---- staying power, for a gauntlet's battles with no repairs between (the user, 2026-10-02: "the only way to heal is
  // in-battle"): while one is planned or under way (R._kpSustain, kp_win's gauntlet), a moogle's four take a healing
  // move whenever its pool has one (in place of the least of the rest), the box review weighs it (R.kpScore), so do
  // the held items that mend (kp_equip), and the relearner and the Skill Chips give it before the run
  const selfHeal = (id) => { const mv = KP.MOVES[id]; return !!(mv && mv.heal && KP.category(mv) === 'status'); };
  R.kpFour = (m, pool) => {
    const four = KP.tactics.pickFour(m, pool);
    if (!R._kpSustain || four.some(selfHeal)) return four;
    const heals = pool.filter(selfHeal).sort((a, b) => (KP.MOVES[b].heal || 0) - (KP.MOVES[a].heal || 0));
    if (!heals.length) return four;
    return (four.length < 4 ? four : four.slice(0, 3)).concat([heals[0]]);
  };
  R.kpSustain = (m) => {
    const ab = (KP.abilityOf && KP.abilityOf(m)) || {}, mv = (m.moves || []).map(id => KP.MOVES[id]).filter(Boolean);
    let v = 0;
    if (mv.some(x => x.heal && KP.category(x) === 'status')) v += ab.healMul || 1;   // (its own healing move; Medicine's kind more)
    if (mv.some(x => x.drain && KP.category(x) !== 'status')) v += 0.4;            // (drain)
    if (ab.regen || ab.poisonHeal || ab.regenerator || ab.fieldHeal) v += 0.5;     // (an ability that mends it)
    return v;
  };
  // the four to pick from a pool (a picker's): the ideal ones there, then the pool's best for the rest
  R.kpWantFrom = (m, pool) => {
    const n = Math.min(4, new Set(pool).size), ideal = R.kpIdeal(m).filter(id => pool.includes(id));
    return ideal.concat(KP.tactics.pickFour(m, pool).filter(id => !ideal.includes(id))).slice(0, n);
  };
  // the Memory Mog (Mogfield's Mog Center): a team member whose ideal four has a move only he can give back goes to him
  // (flying, once there's the bell), and the picker takes its ideal four
  R.kpRelearnNeeds = () => D().party.filter(m => { const back = KP.relearnable ? KP.relearnable(m) : []; return back.length && R.kpIdeal(m).some(id => back.includes(id)); });
  O.kp_relearn = function* () {
    if (!KP.relearner || !FF7.maps.kp_mogfield_center || !(KP.visited && KP.visited('kp_mogfield'))) return true;   // (not reached yet)
    for (const m of R.kpRelearnNeeds().slice(0, 5)) {
      if (D().money < (KP.RELEARN_FEE || 0)) { R.note('kp_relearn: not the ' + KP.RELEARN_FEE + ' coins for the Memory Mog'); break; }   // (his tiny fee)
      const before = m.moves.slice();
      R.choices.push({ a: (ch) => { const i = D().party.indexOf(m); return i >= 0 && i < ch.length - 1 ? i : null; }, pc: R.pc });
      R.kpLabel = `The Memory Mog: ${KP.name(m)} remembers its best moves`;
      let r;
      try { r = yield* O.talk('kp_mfc_relearn', { map: 'kp_mogfield_center' }); } finally { R.choices = R.choices.filter(c => c.pc !== R.pc); R.kpLabel = null; }
      if (r !== true) { R.note('kp_relearn: ' + r); break; }
      if (m.moves.join() !== before.join()) R.say('kupomon: the Memory Mog: ' + KP.name(m) + ' now knows ' + m.moves.map(id => KP.MOVES[id].name).join(', '));
    }
    if (R.kpChipUses().length) yield* O.kp_teach();
    return true;
  };
  // Skill Chips: which of the bag's chips would make which moogle better (the tactics engine's pick of four takes the move)
  R.kpChipUses = function () {
    const d = D(), out = [];
    if (!KP.tactics || !KP.chipFits) return out;
    for (const id of Object.keys(d.bag).filter(k => KP.ITEMS[k] && KP.ITEMS[k].kind === 'chip')) {
      const mv = KP.ITEMS[id].move;
      for (const m of d.party) if (!m.moves.includes(mv) && KP.chipFits(m, id) && R.kpIdeal(m).includes(mv)) out.push([id, m]);   // (one of its ideal four: never a move the relearner would swap straight back)
    }
    return out;
  };
  O.kp_teach = function* () {
    for (let n = 0; n < 12; n++) {
      const use = R.kpChipUses()[0]; if (!use) break;
      const [id, m] = use, before = m.moves.slice();
      const r = yield* R.kpUseItem(id, m);
      if (r !== true || m.moves.join() === before.join()) { R.note('kp_teach: ' + id + ' on ' + KP.name(m) + ': ' + r); break; }
      R.say('kupomon: ' + KP.name(m) + ' learned ' + KP.MOVES[KP.ITEMS[id].move].name + ' from a Skill Chip');
    }
    return true;
  };
  // before a battle that matters: Batteries for the downed (the strongest first), then oils for the worst hurt
  // (o.max items at most)
  // o.below: who counts as hurt (0.7 of their HP); o.keep: oils kept back for the battles (the bag's count of each);
  // o.cure: Fix-It Kits for a lasting ailment too
  O.kp_patch = function* (o = {}) {
    if (KP.healLocked && KP.healLocked()) return true;   // (a gauntlet that counts no healing between its battles)
    const d = D(), below = o.below || 0.7, keep = o.keep || 0, spare = (k) => (d.bag[k] || 0) > keep;
    for (let n = 0; n < (o.max || 8); n++) {
      const P = d.party, bag = d.bag;
      const down = P.filter(m => m.hp <= 0).sort((a, b) => b.lv - a.lv)[0];
      let use = null;
      if (down && bag.battery > 0) use = ['battery', down];
      else if (o.cure && bag.fixit > 0 && P.some(m => m.hp > 0 && m.status)) use = ['fixit', P.find(m => m.hp > 0 && m.status)];
      else {
        const hurt = P.filter(m => m.hp > 0 && m.hp < KP.maxHp(m) * below).sort((a, b) => a.hp / KP.maxHp(a) - b.hp / KP.maxHp(b))[0];
        if (hurt) {
          const lost = KP.maxHp(hurt) - hurt.hp;
          const oil = (lost > 110 ? ['max_oil', 'hi_oil', 'oil_can'] : lost > 25 ? ['hi_oil', 'oil_can', 'max_oil'] : ['oil_can', 'hi_oil']).find(k => bag[k] > 0 && spare(k));   // (the cheap ones first: the Max Oils are for the battle)
          if (oil) use = [oil, hurt];
        }
      }
      if (!use) break;
      const before = P.map(m => m.hp).join();
      const r = yield* R.kpUseItem(use[0], use[1]);
      if (r !== true || P.map(m => m.hp).join() === before) { R.note('kp_patch: ' + use[0] + ': ' + r); break; }
      R.say('kupomon: ' + KP.ITEMS[use[0]].name + ' on ' + KP.name(use[1]));
    }
    return true;
  };
  // a held item from the bag for a moogle, through the menu (Moogles > the moogle > Give an item > the item)
  R.kpGive = function* (mon, id) {
    const d = D(), j = d.party.indexOf(mon);
    if (j < 0 || mon.held || !(d.bag[id] > 0)) return 'kp_give: nothing to do';
    R.kpMenuOwn = true;
    try {
      yield* press('menu', R.fast ? 4 : 14);
      const M = R.top(); if (!(M instanceof KP.Menu)) return 'the menu did not open';
      for (let g = 0; g < 40 && M.idx !== 0; g++) { R.tap('up'); yield; yield; }
      yield* press('ok');
      for (let g = 0; g < 40 && M.sub !== j; g++) { R.tap(M.sub < j ? 'down' : 'up'); yield; yield; }
      yield* press('ok');                              // Summary / Swap / Give an item / Cancel
      for (let g = 0; g < 20 && M.ask && M.ask.idx !== 2; g++) { R.tap('down'); yield; yield; }
      yield* press('ok');                              // Give X what?
      const k = KP.pocketItems(KP.BAG_POCKETS.findIndex(P => P.id === 'held')).indexOf(id);   // (the menu's list: the held pocket, in its order)
      // (the shorter way round: the list wraps, and a long one ran past the old 60 taps: the gives that "did not take")
      for (let g = 0; g < 400 && M.ask && M.ask.idx !== k; g++) { const n = M.ask.opts.length, dn = (k - M.ask.idx + n) % n, up = (M.ask.idx - k + n) % n; R.tap(dn <= up ? 'down' : 'up'); yield; yield; }
      yield* press('ok', R.fast ? 2 : 20);
      if (M.msg) yield* press('ok');
      for (let g = 0; g < 60 && R.top() instanceof KP.Menu; g++) { R.tap('cancel'); yield; yield; }
    } finally { R.kpMenuOwn = false; }
    return mon.held === id ? true : 'kp_give: it did not take';
  };
  // a held item back to the bag (Moogles > the moogle > Take ...)
  R.kpTake = function* (mon) {
    const d = D(), j = d.party.indexOf(mon);
    if (j < 0 || !mon.held) return true;
    R.kpMenuOwn = true;
    try {
      yield* press('menu', R.fast ? 4 : 14);
      const M = R.top(); if (!(M instanceof KP.Menu)) return 'the menu did not open';
      for (let g = 0; g < 40 && M.idx !== 0; g++) { R.tap('up'); yield; yield; }
      yield* press('ok');
      for (let g = 0; g < 40 && M.sub !== j; g++) { R.tap(M.sub < j ? 'down' : 'up'); yield; yield; }
      yield* press('ok');
      for (let g = 0; g < 20 && M.ask && M.ask.idx !== 2; g++) { R.tap('down'); yield; yield; }
      yield* press('ok', R.fast ? 2 : 20);
      if (M.msg) yield* press('ok');
      for (let g = 0; g < 60 && R.top() instanceof KP.Menu; g++) { R.tap('cancel'); yield; yield; }
    } finally { R.kpMenuOwn = false; }
    return mon.held ? 'kp_take: it did not come off' : true;
  };
  // ------------------------------------------------------------------ held items, chosen by playing them out (the user,
  // 2026-10-02: "put appropriate held items onto party members"). Every held item the Demo has (in the bag and on the
  // team) is tried on each member against a bench of foes, each try the battle AI's own look ahead (KP.tactics: the best
  // move's T.evaluate in an offline battle, so every item effect counts as the battle counts it). The bench: the fight
  // ahead when the Demo knows it (R.kpFoesFor: a dojo master's, a trainer's or a rival's team from their definitions, or
  // the teams this fight has shown), else the game's own trainers near the team's level, one of each job type in turn
  // (12 at most). A one-use item counts once a fight (a third, against three or more foes); what a duel can't show is
  // given a little by rule: a weather or terrain extender on a member that starts it, a terrain seed when the team
  // starts that terrain, Germina's Boots against hazard setters. Then the best pairs, greedy by gain, one item a member,
  // each keeping its own unless another is clearly better. The EXP Plus goes on a member 3+ levels behind the top (any
  // one behind, while training); the Gambler's Coin stays on while the Demo wins coins (R.kpEarn)
  const NO_BATTLE = (it) => !!(it && (it.expMul || it.coins));
  const isHeld = (id) => !!(KP.ITEMS[id] && KP.ITEMS[id].kind === 'held');
  R.kpBench = function (foes) {
    if (foes && foes.length) return foes;
    const d = D(), L = Math.round(d.party.reduce((a, m) => a + m.lv, 0) / Math.max(1, d.party.length));
    if (R._kpBenchAt && R._kpBenchAt.L === L) return R._kpBenchAt.mons;
    const near = new Map();
    for (const id in KP.TRAINER_DEFS) {
      const def = KP.TRAINER_DEFS[id]; let team;
      try { team = KP.W.team(KP.teamFor(id, def.team || [])); } catch (e) { continue; }
      for (const m of team) { if (m.lv < L - 6 || m.lv > L + 4) continue; const o = near.get(m.sp); if (!o || Math.abs(o.lv - L) > Math.abs(m.lv - L)) near.set(m.sp, m); }
    }
    const byType = {}; for (const m of near.values()) (byType[KP.sp(m).type] = byType[KP.sp(m).type] || []).push(m);
    const mons = [];
    for (let r = 0, more = true; more && mons.length < 12; r++) { more = false; for (const t in byType) if (byType[t][r] && mons.length < 12) { mons.push(byType[t][r]); more = true; } }
    R._kpBenchAt = { L, mons };
    return mons;
  };
  // the team a story fight will meet, when the Demo can know it: a dojo master's (kp_badge_N), a trainer's (kp_tr_ID), a
  // rival's (kp_rival_WHO_N, at the level they'll have), else the teams this fight has already shown (R.kpBlockFoes)
  R.kpFoesFor = function (flag) {
    const W = KP.W, mk = (team, scaled) => { try { return W.team(team, scaled); } catch (e) { return []; } };
    let m;
    if (typeof flag === 'string') {
      if ((m = /^kp_badge_(\d+)$/.exec(flag))) { const def = Object.values(KP.TRAINER_DEFS).find(t => t.kind === 'master' && t.badge === +m[1]); if (def) return mk(KP.teamFor(def.id, def.team)); }
      if ((m = /^kp_tr_(.+)$/.exec(flag)) && KP.TRAINER_DEFS[m[1]]) return mk(KP.teamFor(m[1], KP.TRAINER_DEFS[m[1]].team));
      if ((m = /^kp_rival_([a-z]+)_(\d+)$/.exec(flag)) && W.rivalAt && KP.RIVALS && KP.RIVALS[m[1]]) return mk(W.rivalAt(m[1], +m[2]), true);
    }
    const gt = Object.keys(KP.GAUNTLETS || {}).find(g => KP.GAUNTLETS[g].flag === flag);   // (a gauntlet: every battle's team)
    if (gt) return [].concat(...R.kpGauntletFoes(gt).map(t => t.foes));
    const met = R.kpBlockFoes && R.kpBlockFoes.size ? [].concat(...R.kpBlockFoes.values()) : [];
    return met.map(f => { const x = KP.make(f.sp, f.lv, { plus: f.plus, abil: f.abil, held: f.held }); x.moves = f.moves.slice(); return x; });
  };
  // ---- a gauntlet (KP.GAUNTLETS: Omega's five Keepers, Chalimog's three champions): battles back to back with no
  // healing between, so planned as a whole (the user, 2026-10-02: "the demo should have a genuine plan for this since
  // it's very difficult"). Before the first try (kp_win's o.gauntlet): the box looked over against every moogle of every
  // battle (R.kpSmartTeam), then repairs, and a reading of the team: which of their moogles no member beats (the battle
  // AI's duels, logged); kp_win's held items go against all of them. Between the battles (O.kp_gauntlet_next): that
  // battle's own held items, and in the lead the member that fares best against its team from where the team stands
  // now (HP as it is: no healing). After a loss, the box against all of them again
  R.kpGauntletFoes = (gid) => { const G = (KP.GAUNTLETS || {})[gid]; try { return G ? G.teams() : []; } catch (e) { return []; } };
  R.kpGauntletPlan = function* (gid, o = {}) {
    const G = (KP.GAUNTLETS || {})[gid]; if (!G) return true;
    const teams = R.kpGauntletFoes(gid), foes = [].concat(...teams.map(t => t.foes)); if (!foes.length) return true;
    R.say(`kupomon: planning ${G.name}: ${teams.length} battles back to back, no repairs between (${foes.length} moogles: ${teams.map(t => t.name).join(', ')})`);
    const lab = R.kpLabel; R.kpLabel = `Planning ${G.name}: ${teams.length} battles in a row`;
    try {
      const sw = yield* R.kpSmartTeam({ foes, train: o.train, center: o.center });   // (the box against all of them)
      if (sw) yield* O.kp_heal({ center: o.center || 'nearest' });
      yield* R.kpAbilities(foes, { force: true });   // (each member's best ability against these teams)
      // (the Capsules and Patches that takes, bought now at the nearest Mart that sells them, 10,000 coins kept back, and used)
      { const aw = R._kpAbilityWant || {}, need = Object.keys(aw).filter(k => aw[k] > 0), cost = need.reduce((a, k) => a + KP.ITEMS[k].price * aw[k], 0);
        const dist = R.kpDist(R.where()), mart = Object.keys(KP.CENTER_TIER || {}).filter(c => KP.abilityItemStock(c).length).sort((x, y) => (dist[x] ?? 99) - (dist[y] ?? 99))[0];
        if (need.length && mart && D().money - cost >= 10000) {
          const want = {}; need.forEach(k => { want[k] = (D().bag[k] || 0) + aw[k]; });
          const r = yield* O.kp_buy(want, { center: mart }); if (r !== true) R.note('kp_gauntlet: ability items: ' + r);
          yield* R.kpAbilities(foes, { force: true });
        } }
      // (healing moves for the run: the Memory Mog, then any Skill Chip that gives one)
      const before = D().party.map(m => R.kpSustain(m));
      if (R.kpRelearnNeeds().length) yield* O.kp_relearn();
      if (R.kpChipUses().length) yield* O.kp_teach();
      const heal = D().party.filter(m => m.moves.some(selfHeal)).map(m => KP.name(m) + ' (' + m.moves.filter(selfHeal).map(id => KP.MOVES[id].name).join(', ') + ')');
      R.say('kupomon: ' + G.name + ': ' + (heal.length ? 'can mend itself in battle: ' + heal.join(', ') : 'no one can mend itself in battle') + (D().party.some((m, k) => R.kpSustain(m) > (before[k] || 0)) ? ' (healing moves learned for the run)' : ''));
      const d = D(), open = [];
      for (const t of teams) for (const f of t.foes) {
        const best = Math.max(...d.party.map(m => duel(Object.assign({}, m, { hp: KP.maxHp(m), status: null }), Object.assign({}, f, { hp: KP.maxHp(f), status: null }))));
        if (best < 0) open.push(t.name + "'s " + KP.name(f));
        yield;
      }
      R.say('kupomon: ' + G.name + ': ' + (open.length ? 'no member beats ' + open.join(', ') + ' one on one yet' : 'every one of their moogles has a member that beats it'));
    } finally { R.kpLabel = lab; }
    return true;
  };
  O.kp_gauntlet_next = function* (gid, i) {
    const t = R.kpGauntletFoes(gid)[i], d = D(); if (!t) return true;
    const alive = d.party.filter(m => m.hp > 0); if (!alive.length) return true;
    yield* O.kp_equip({ foes: t.foes, gauntlet: true, noAbil: true });   // (its own held items: a swap between battles heals nothing)
    // (the lead: the best against its team as the team stands now, its opener weighing double)
    const score = (m) => t.foes.reduce((a, f, k) => a + (k === 0 ? 2 : 1) * duel(m, Object.assign({}, f, { hp: KP.maxHp(f), status: null })), 0);
    let best = null, bv = -Infinity;
    for (const m of alive) { const v = score(m); if (v > bv) { bv = v; best = m; } yield; }
    if (best && d.party[0] !== best) { const r = yield* R.kpSwapLead(best); if (r !== true) R.note('kp_gauntlet: lead: ' + r); }
    R.say(`kupomon: next, ${t.name}: ${best ? KP.name(best) : '?'} leads (the team: ${d.party.map(m => KP.name(m) + ' ' + Math.round(100 * m.hp / KP.maxHp(m)) + '%').join(', ')})`);
    return true;
  };
  // one duel, played out: the best of its moves (the battle AI's T.evaluate) in an offline battle, nothing on the field
  const duel = (mon, foe, first) => {
    const T = KP.tactics, clr = FF7.fx && FF7.fx.clear;
    let B;
    if (clr) FF7.fx.clear = () => {};   // (an offline battle: the real one's effects left alone)
    try { B = new KP.Battle({ kind: 'trainer', area: '-', foes: [foe], spectate: { mons: [mon], name: 'the Demo' }, noBag: true }, { done: false }); }
    finally { if (clr) FF7.fx.clear = clr; }
    B.turn = 0; const a = T.ghost(B, mon, 'me'), b = T.ghost(B, foe, 'foe'); B.me = a; B.foe = b; B.turn = 1;
    if (first) a.st.spd = 6;   // (moving first: a Quick Gear's turn, kpItemGains)
    const ids = mon.moves.filter(id => KP.MOVES[id] && B.usable(a, id));
    return ids.length ? Math.max(...ids.map(id => T.evaluate(B, a, b, id))) : -150;
  };
  // the weathers, terrains and walls a member starts (its ability, its moves)
  const starts = (m) => {
    const ab = (KP.abilityOf && KP.abilityOf(m)) || {}, out = new Set();
    if (ab.setWeather) out.add(ab.setWeather); if (ab.setTerrain) out.add(ab.setTerrain);
    for (const id of m.moves) { const mv = KP.MOVES[id]; if (!mv) continue; if (mv.weather) out.add(mv.weather); if (mv.terrain) out.add(mv.terrain); if (mv.side === 'wall' || mv.side === 'shell') out.add('walls'); }
    return out;
  };
  // each member's gain from each item (over holding nothing) against the bench: Map(member -> Map(item -> gain)).
  // A generator: a yield after each item tried, so the game keeps drawing
  R.kpItemGains = function* (members, pool, bench, o = {}) {
    const out = new Map(), team = D().party, n = Math.max(1, bench.length), onceK = 1 / Math.min(3, o.fight ? n : 3);
    const ruled = (m, it) => {
      // (by rule, small: what the duels show decides, these only tip a close call)
      if (it.extend) { const st = starts(m); return [...st].some(x => x === it.extend || (it.extend === 'weather' && KP.WEATHERS[x]) || (it.extend === 'terrain' && KP.TERRAINS[x])) ? 4 : 0; }
      if (it.terrainBoost) { const x = Object.keys(it.terrainBoost); return x.some(t => starts(m).has(t)) ? 2 : x.some(t => team.some(o => starts(o).has(t))) ? 1 : 0; }   // (its own terrain: up whenever it is; a teammate's, now and then)
      if (it.boots) return bench.some(f => f.moves.some(id => KP.MOVES[id] && KP.MOVES[id].hazard)) ? 2 : 0.3;
      if (it.shedShell) return 0.3;
      return null;   // (played out)
    };
    const fits = (m, it) => {   // (an item that can't touch this member: not tried)
      const dmg = new Set(m.moves.map(id => KP.MOVES[id]).filter(mv => mv && KP.category(mv) !== 'status').map(mv => mv.type));
      if (it.boost && !dmg.has(it.boost)) return false;
      if (it.gem && !dmg.has(it.gem)) return false;
      if (it.forSpecies && !it.forSpecies.includes(m.sp)) return false;
      if (it.resistBerry && !(KP.effOn(it.resistBerry, m) > 1)) return false;
      return true;
    };
    for (const m0 of members) {
      const m = Object.assign({}, m0, { hp: KP.maxHp(m0), status: null, statusT: 0, moves: m0.moves.slice() });   // (at full HP: a copy)
      const val = (id, first) => { m.held = id; let v = 0; for (const f of bench) { f.hp = KP.maxHp(f); f.status = null; v += duel(m, f, first); } return v / n; };
      const g = new Map(), base = val(null);
      let ahead = null;   // (its score moving first every time: a Quick Gear's chance of it)
      yield;
      for (const id of pool) {
        const it = KP.ITEMS[id]; if (!isHeld(id) || NO_BATTLE(it)) continue;
        const r = ruled(m, it); if (r != null) { g.set(id, r); continue; }
        if (!fits(m, it)) continue;
        if (it.quickChance) { if (ahead == null) ahead = val(null, true); g.set(id, it.quickChance / 100 * (ahead - base)); yield; continue; }   // (the turn order is fixed in the look ahead: the chance of going first, by what going first is worth)
        g.set(id, (val(id) - base) * (it.once ? onceK : 1));
        yield;
      }
      out.set(m0, g);
    }
    return out;
  };
  // (the gains, kept for the same team, items and bench: a fight's every try, the usual bench between)
  R._kpGainCache = new Map();
  const gainsFor = function* (members, pool, bench, o = {}) {
    const key = JSON.stringify([members.map(m => [m.uid, m.sp, Math.floor(m.lv / 2), m.moves, m.abil]), pool.slice().sort(), bench.map(f => f.sp + f.lv), !!o.fight]);
    if (R._kpGainCache.has(key)) return R._kpGainCache.get(key);
    const g = yield* R.kpItemGains(members, pool, bench, o);
    if (R._kpGainCache.size >= 6) R._kpGainCache.delete(R._kpGainCache.keys().next().value);
    R._kpGainCache.set(key, g);
    return g;
  };
  // the best item for each member out of what there is (have: Map(item -> how many)), greedy by gain: Map(member -> item)
  const assign = (members, gains, have, pins) => {
    const want = new Map(pins), left = new Map(have), pairs = [];
    for (const [m, g] of gains) for (const [id, v] of g) if (v > 0.5) pairs.push({ m, id, v: v + (m.held === id ? 2 : 0) });   // (+2: a member keeps its own unless another is clearly better)
    pairs.sort((a, b) => b.v - a.v);
    for (const p of pairs) { if (want.has(p.m) || !(left.get(p.id) > 0)) continue; want.set(p.m, p.id); left.set(p.id, left.get(p.id) - 1); }
    for (const m of members) if (!want.has(m) && m.held && left.get(m.held) > 0) { want.set(m, m.held); left.set(m.held, left.get(m.held) - 1); }   // (nothing better: its own, if no one took it)
    for (const m of members) {   // (still empty: the best of what's left that does it any good at all)
      if (want.has(m)) continue;
      const g = gains.get(m); if (!g) continue;
      const b = [...g].filter(([id, v]) => v > 0 && left.get(id) > 0).sort((a, b) => b[1] - a[1])[0];
      if (b) { want.set(m, b[0]); left.set(b[0], left.get(b[0]) - 1); }
    }
    return want;
  };
  // the held items there are: in the bag, and on the team (Map(item -> how many))
  const heldHave = () => { const d = D(), have = new Map(); for (const k in d.bag) if (d.bag[k] > 0 && isHeld(k)) have.set(k, d.bag[k]); for (const m of d.party) if (m.held) have.set(m.held, (have.get(m.held) || 0) + 1); return have; };
  O.kp_equip = function* (o = {}) {
    const d = D(); if (!d.party.length) return true;
    // the pins: the EXP Plus on the one furthest behind (while training, any one behind; else 3+ levels), the Gambler's
    // Coin on its holder while winning coins
    const pins = new Map(), cap = KP.levelCap ? KP.levelCap() : KP.MAX_LEVEL, top = Math.max(...d.party.map(m => m.lv));
    const have = heldHave(), ep = d.party.find(m => m.held === 'exp_plus');
    const behind = d.party.filter(m => m.lv < cap && m.lv < top).sort((a, b) => a.lv - b.lv)[0];
    if (have.get('exp_plus') > 0 && behind && (o.training || top - behind.lv >= 3)) pins.set(ep && ep.lv < cap && ep.lv <= behind.lv + 2 && (o.training || top - ep.lv >= 3) ? ep : behind, 'exp_plus');
    if (R._kpEarning) for (const m of d.party) if (m.held && KP.ITEMS[m.held] && KP.ITEMS[m.held].coins) pins.set(m, m.held);
    for (const [, id] of pins) have.set(id, have.get(id) - 1);
    const members = d.party.filter(m => !pins.has(m));
    let want;
    if (o.training) {   // (training: only the EXP Plus moved, the rest as they are)
      want = new Map(pins); const left = new Map(have);
      for (const m of members) if (m.held && left.get(m.held) > 0) { want.set(m, m.held); left.set(m.held, left.get(m.held) - 1); }
    } else {
      const usual = R.kpBench(), fight = !!(o.foes && o.foes.length), bench = fight ? o.foes : usual;
      if (!bench.length || !KP.tactics) return true;
      const key = JSON.stringify([members.map(m => [m.uid, m.sp, Math.floor(m.lv / 2), m.moves, m.abil]), [...have].sort(), bench.map(f => f.sp + f.lv), [...pins].map(([m, id]) => m.uid + id), !!o.gauntlet]);
      if (key === R._kpEquipKey) return true;   // (nothing new since last time: as it is)
      const lab = R.kpLabel; if (!lab) R.kpLabel = fight ? 'Choosing held items for the fight ahead' : 'Choosing held items';
      let gains;
      // (a known fight: its team's duels, and half the usual bench's: the trainers on the way, and a team that wins
      // or loses every duel by a mile still holds what serves it best)
      try {
        const pool = [...have.keys()].filter(id => have.get(id) > 0);
        gains = usual.length ? yield* gainsFor(members, pool, usual) : new Map();
        if (fight) {
          const gf = yield* gainsFor(members, pool, bench, { fight: true }), mix = new Map();
          for (const m of members) { const a = gf.get(m) || new Map(), b = gains.get(m) || new Map(), g = new Map(); for (const id of new Set([...a.keys(), ...b.keys()])) g.set(id, (a.get(id) || 0) + 0.5 * (b.get(id) || 0)); mix.set(m, g); }
          gains = mix;
        }
      }
      catch (e) { R.note('kp_equip: ' + (e && e.message)); return true; }
      finally { if (!lab) R.kpLabel = null; }
      if (o.gauntlet) for (const g of gains.values()) for (const [id, v] of g) { const it = KP.ITEMS[id] || {}; if (v > 0 && (it.leftovers || it.shellBell || it.pinchHeal)) g.set(id, v * 2); }   // (HP kept carries into the next battle)
      want = assign(members, gains, have, pins);
      R._kpEquipKey = key; R._kpEquipGains = gains;
      if (!o.noAbil && usual.length) yield* R.kpAbilities(o.gauntletFoes || usual);   // (abilities too, once Kupo Capsules are sold)
    }
    const change = d.party.filter(m => (want.get(m) || null) !== (m.held || null));
    if (!change.length) return true;
    for (const m of change) if (m.held) { const r = yield* R.kpTake(m); if (r !== true) R.note(r); }
    const said = [];
    for (const m of change) {
      const id = want.get(m); if (!id) continue;
      const r = yield* R.kpGive(m, id);
      if (r !== true) { R.note(r); continue; }
      const g = R._kpEquipGains && R._kpEquipGains.get(m), v = g && g.get(id);
      said.push(KP.name(m) + ': ' + KP.ITEMS[id].name + (v != null && !o.training ? ' (+' + v.toFixed(1) + ')' : ''));
    }
    if (said.length) R.say('kupomon: held items' + (o.foes && o.foes.length ? ' for the fight ahead' : '') + ': ' + said.join(', '));
    return true;
  };
  // ---- abilities (Kupo Capsules and Patches, kp_traits.js; the user, 2026-10-02: "these ability items should help the
  // demo choose the best abilities for its moogles"): once they're sold (the Kupo League won), every ability each member
  // could have (its kind's two usual ones and the hidden one) is tried in the battle AI's duels against the bench, as the
  // held items are; one clearly better (6+) than the one it has is switched to: the items it takes used from the Bag, or
  // wanted (R._kpAbilityWant) and bought at the next Mart restock that sells them. A gauntlet's plan does it against the
  // gauntlet's own teams (R.kpGauntletPlan)
  const abilPath = (cur, to) => cur === to ? [] : to === 2 ? ['kupo_patch'] : cur === 2 ? (to === 0 ? ['kupo_patch'] : ['kupo_patch', 'kupo_capsule']) : ['kupo_capsule'];
  R._kpAbilityWant = {};
  R.kpAbilities = function* (bench, o = {}) {
    const d = D(); if (!KP.ABILITY_ITEMS || !FF7.state.flags.kp_champion || !bench || !bench.length || !KP.tactics) return true;
    const key = JSON.stringify([d.party.map(m => [m.uid, m.sp, m.abil, Math.floor(m.lv / 2), m.moves]), bench.map(f => f.sp + f.lv), KP.ABILITY_ITEMS.map(k => d.bag[k] || 0)]);
    if (key === R._kpAbilKey && !o.force) return true;
    R._kpAbilKey = key;
    const want = {}, said = [];
    for (const m of d.party.slice()) {
      const L = KP.abilSlots(m); if (L.length < 2) continue;
      const cur = KP.abilSlot(m), cands = [0, 1, 2].filter(i => i < L.length && L[i] && KP.ABILITIES[L[i]] && !(i !== cur && L[i] === L[cur]));
      if (cands.length < 2) continue;
      const val = (i) => { const c = Object.assign({}, m, { abil: i, hp: KP.maxHp(m), status: null, moves: m.moves.slice() }); let v = 0; for (const f of bench) { f.hp = KP.maxHp(f); f.status = null; v += duel(c, f); } return v / bench.length; };
      const base = val(cur); let best = cur, bv = base; yield;
      for (const i of cands) if (i !== cur) { const v = val(i); if (v > bv) { bv = v; best = i; } yield; }
      if (best === cur || bv - base < 6) continue;
      const path = abilPath(cur, best), name = (i) => (KP.ABILITIES[L[i]] || {}).name || L[i];
      if (path.every(k => d.bag[k] > 0) || path.length && d.bag[path[0]] > 0) {
        for (const k of path) {
          if (!(d.bag[k] > 0)) { want[k] = (want[k] || 0) + 1; break; }
          const r = yield* R.kpUseItem(k, m); if (r !== true) { R.note('kp_abilities: ' + r); break; }
        }
        said.push(`${KP.name(m)}: ${name(cur)} -> ${(KP.abilityOf(m) || {}).name} (+${(bv - base).toFixed(1)})`);
      } else { for (const k of path) want[k] = (want[k] || 0) + 1; said.push(`${KP.name(m)} wants ${name(best)} over ${name(cur)} (+${(bv - base).toFixed(1)}): ${path.map(k => KP.ITEMS[k].name).join(' + ')} to buy`); }
    }
    R._kpAbilityWant = want;
    if (said.length) R.say('kupomon: abilities: ' + said.join('; '));
    return true;
  };
  // the held items a Mart sells (its shelf list, kp_world.js W.mogCenter's kpMart, and the expansion's: KP.heldStock)
  R.kpMartHeld = (center) => Array.from(new Set(((FF7.maps[center] || {}).kpMart || []).concat(KP.heldStock ? KP.heldStock(center) : [])))
    .filter(id => isHeld(id) && !NO_BATTLE(KP.ITEMS[id]) && KP.ITEMS[id].price > 0);
  // which of them to buy (budget: the coins to spare): one a member would clearly gain from (6+ over what it would hold
  // from what the Demo has), best first, two a visit at most
  R.kpHeldToBuy = function* (center, budget) {
    const d = D(), have = heldHave();
    const sold = R.kpMartHeld(center).filter(id => !have.get(id) && KP.ITEMS[id].price <= budget);
    if (!sold.length || !d.party.length || !KP.tactics) return [];
    const bench = R.kpBench(); if (!bench.length) return [];
    const lab = R.kpLabel; if (!lab) R.kpLabel = 'Looking over the Mart\'s held items';
    let gains;
    try { gains = yield* R.kpItemGains(d.party, [...have.keys()].concat(sold), bench); }
    catch (e) { R.note('kp_heldtobuy: ' + (e && e.message)); return []; }
    finally { if (!lab) R.kpLabel = null; }
    const now = assign(d.party, gains, have, new Map()), out = [];
    const rows = sold.map(id => ({ id, imp: Math.max(...d.party.map(m => (gains.get(m).get(id) || 0) - ((now.get(m) && gains.get(m).get(now.get(m))) || 0))) }))
      .filter(r => r.imp >= 6).sort((a, b) => b.imp - a.imp);
    for (const r of rows) { if (out.length >= 2 || KP.ITEMS[r.id].price > budget) continue; out.push(r.id); budget -= KP.ITEMS[r.id].price; }
    if (out.length) R.say('kupomon: worth buying here: ' + out.map(id => KP.ITEMS[id].name).join(', '));
    return out;
  };
  // the Mog Box (in every Mog Center): o.leave moogles of the team in it, then o.take moogles out (o.center: which)
  R.kpBoxAt = (center) => { const o = ((FF7.maps[center] || {}).objects || []).find(q => q.talk === KP.W.mogBox); return o && o.at; };
  O.kp_box = function* (o = {}) {
    const d = D(), center = o.center || R.kpNearestCenter();
    if (R.where() !== center) { const g = yield* R.gotoMap(center); if (g !== true && g !== 'mapchanged') return 'kp_box: ' + g; yield* R.settle(3); }
    const at = R.kpBoxAt(center); if (!at) return 'kp_box: no Mog Box in ' + center;
    // the moves on the box screen (js/kupomon/kp_box.js): a boxed one put down on a team member's slot (a swap), one
    // put on the team's end, one put in the free place nearest the box on screen (driveBox: any of the 50 boxes)
    const leave = (o.leave || []).filter(m => d.party.includes(m)), take = (o.take || []).filter(m => d.box.includes(m));
    if (!leave.length && !take.length) return true;
    const plan = [];
    while (leave.length && take.length) { const X = leave.shift(), F = take.shift(); plan.push({ pick: F, onto: X, done: () => d.party.includes(F) && d.box.includes(X) }); }
    take.forEach(F => plan.push({ pick: F, onto: 'team-end', done: () => d.party.includes(F) }));
    leave.forEach(X => plan.push({ pick: X, onto: 'box-end', done: () => d.box.includes(X) }));
    const checks = plan.map(p => p.done);
    R.kpBoxPlan = plan;
    let r;
    try { r = yield* O.use(at[0], at[1], { map: center }); } finally { R.kpBoxPlan = null; }
    yield* R.settle(3);
    return checks.every(f => f()) ? true : 'kp_box: the box was not sorted (' + r + ')';
  };
  // the team's weakest job line makes way for a clearly stronger one (o.gap more base stats at its last stage), from
  // the box or befriended for it on o.map (Lv o.minLv+), then trained to Lv 30 on o.train: as a player swaps in a
  // strong catch before a big fight
  O.kp_upgrade = function* (o = {}) {
    const d = D(), gap = o.gap || 40, worth = (m) => R.kpLine(m.sp) + 8 * (m.plus || 0);
    const pinned = R._kpPinned || new Set(), benched = R._kpBenched || new Set();   // (R.kpSmartTeam's choice after a loss stands)
    const W0 = d.party.filter(m => !pinned.has(m.uid)).sort((a, b) => worth(a) - worth(b))[0];
    if (!W0) return true;
    const fits = (m) => !benched.has(m.uid) && m.lv >= Math.max(o.minLv || 0, W0.lv - 3) && worth(m) >= worth(W0) + gap;
    let N = d.box.filter(fits).sort((a, b) => worth(b) - worth(a))[0];
    if (!N && o.map && !(KP.hard() && KP.areaUsed(KP.areaOf(o.map)))) {   // (Hard Mode: an area's one befriend, once)
      const before = new Set(d.party.concat(d.box));
      yield* O.kp_buy({ golden_nut: 5, royal_nut: 2 }, { center: R.kpNearestCenter() });
      R.kpWantAny = fits;
      try { yield* O.kp_train(0, { map: o.map, until: () => d.party.concat(d.box).some(m => !before.has(m) && fits(m)), max: o.max || 120, fast: true, label: 'Looking for a stronger moogle to befriend' }); }
      finally { R.kpWantAny = null; }
      N = d.party.concat(d.box).find(m => !before.has(m) && fits(m));
    }
    if (!N) { R.note('kp_upgrade: nothing better than ' + KP.monLabel(W0)); return true; }
    const b = yield* O.kp_box({ leave: [W0], take: d.party.includes(N) ? [] : [N] });
    if (b !== true) return b;
    R.say('kupomon: ' + KP.monLabel(N) + ' joins the team in place of ' + KP.monLabel(W0));
    if (o.train && N.lv < KP.MAX_LEVEL) yield* R.kpCoachUp([N]);   // (Coach Mog first, once he's at the ranch)
    if (o.train && N.lv < KP.MAX_LEVEL) { const t = yield* O.kp_train(KP.MAX_LEVEL, { map: o.train, until: () => N.lv >= KP.MAX_LEVEL, max: 300, label: () => `Training ${KP.name(N)}: Lv ${N.lv} → ${KP.MAX_LEVEL}` }); if (t !== true) R.note('kp_upgrade: ' + t); }
    return true;
  };
  // ------------------------------------------------------------------ lever puzzles (KP.W.toggle: valves, levers)
  // A walk that finds no way on a map with levers: the shortest set of lever pulls that opens one (a search over the
  // tiles and every state of the levers, as tools/kp_traps.js does), pulled in order, and the walk goes again. So a
  // dojo left half-solved by a lost battle is set right from wherever the party stands, as a player would.
  R.kpLeverPlan = function (fs, goals) {
    const levers = fs.objects.filter(o => o.toggleFlag && !(o.toggleOnce && FF7.state.flags[o.toggleFlag]));
    if (!levers.length) return null;
    const fl = FF7.state.flags, P = fs.P, key = (x, y) => x + ',' + y, goal = new Set(goals.map(g => key(g[0], g[1])));
    const flags = Array.from(new Set(levers.map(o => o.toggleFlag)));
    const keep = flags.map(f => fl[f]);
    const setMask = (m) => { flags.forEach((f, i) => { fl[f] = !!(m & (1 << i)); }); fs.objects.forEach(o => { if (o.tick) o.tick(o); }); };
    const mask0 = flags.reduce((m, f, i) => m | (fl[f] ? 1 << i : 0), 0);
    const exits = new Set(); (fs.map.exits || []).forEach(e => { for (let y = e.at[1]; y < e.at[1] + (e.at[3] || 1); y++) for (let x = e.at[0]; x < e.at[0] + (e.at[2] || 1); x++) exits.add(key(x, y)); });
    const start = [fs.player.tx, fs.player.ty], S = (m, x, y) => m + '|' + x + ',' + y;
    const prev = new Map([[S(mask0, start[0], start[1]), null]]), q = [[mask0, start[0], start[1]]];
    let found = null, cur = -1;
    try {
      while (q.length && !found) {
        const [m, x, y] = q.shift();
        if (goal.has(key(x, y))) { found = [m, x, y]; break; }
        if (exits.has(key(x, y)) && !(x === start[0] && y === start[1])) continue;
        if (m !== cur) { setMask(m); cur = m; }
        const next = [];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= P.w || ny >= P.h || !P.walkable(nx, ny)) continue;
          if (goal.has(key(nx, ny)) || R.edgeOK(fs, x, y, nx, ny)) next.push([m, nx, ny, null]);
        }
        levers.forEach(o => { if (Math.abs(o.at[0] - x) + Math.abs(o.at[1] - y) === 1) next.push([m ^ (1 << flags.indexOf(o.toggleFlag)), x, y, o]); });
        for (const [mm, nx, ny, lever] of next) { const k = S(mm, nx, ny); if (!prev.has(k)) { prev.set(k, [S(m, x, y), lever]); q.push([mm, nx, ny]); } }
      }
    } finally { flags.forEach((f, i) => { fl[f] = keep[i]; }); fs.objects.forEach(o => { if (o.tick) o.tick(o); }); }
    if (!found) return null;
    const pulls = [];
    for (let k = S(found[0], found[1], found[2]); prev.get(k); k = prev.get(k)[0]) if (prev.get(k)[1]) pulls.unshift(prev.get(k)[1]);
    return pulls;
  };
  const walkField0 = R.walkField;
  R.walkField = function* (goals, o = {}) {
    let r = yield* walkField0(goals, o);
    if (typeof r !== 'string' || !/^no path/.test(r) || R._kpLevers || !inKP()) return r;
    const fs = R.field(), plan = fs && R.kpLeverPlan(fs, goals);
    if (!plan || !plan.length) return r;
    R.say('kupomon: the way is shut: pulling ' + plan.map(q => q.id).join(', ') + ' first');
    R._kpLevers = true;
    try { for (const lever of plan) { const u = yield* R.ops.use(lever.at[0], lever.at[1]); if (u !== true) return r + ' (and the lever ' + lever.id + ': ' + u + ')'; yield* R.settle(3); } }
    finally { R._kpLevers = false; }
    return yield* walkField0(goals, o);
  };
  // how strong a job line ends up (its last stage's base stats)
  R.kpLine = (sp) => { let id = KP.baseOf(sp); for (let i = 0; i < 4; i++) { const e = (KP.SPECIES[id] || {}).evo; if (!e) break; id = e.to; } const b = (KP.SPECIES[id] || {}).base || {}; return (b.hp || 0) + (b.atk || 0) + (b.def || 0) + (b.spd || 0); };
  // the breeding program, as a player builds a team for the late leagues: the member with the fewest "+" breeds with
  // a partner of Lv 25+ (from the box, or befriended for it on o.catch), at the Kupo Ranch; the child (the parents'
  // best plus, and two more: both Lv 25+) takes the stronger job line and is trained to Lv 30 among the rest of the
  // team (switch-training on o.train); until every member has o.plus
  O.kp_breedup = function* (o = {}) {
    const d = D(), target = o.plus || 2, P = () => d.party;
    for (let round = 0; round < (o.max || 20); round++) {
      const X = P().filter(m => (m.plus || 0) < target && m.lv >= KP.LV(25)).sort((a, b) => (a.plus || 0) - (b.plus || 0) || R.kpLine(a.sp) - R.kpLine(b.sp))[0];
      if (!X) return P().every(m => (m.plus || 0) >= target) ? true : 'kp_breedup: a member under Lv 25 (' + P().map(m => KP.name(m) + ' ' + m.lv).join(', ') + ')';
      R.say('kupomon: breeding ' + KP.monLabel(X) + ' (round ' + (round + 1) + ')');
      // a partner of Lv 25+, and which goes first (the child takes after it): the strongest line whose child grows into
      // a kind the team won't already have (the species clause: the parents retire, the rest stay)
      const kindsBut = (ex) => new Set(P().filter(m => !ex.includes(m)).map(m => KP.finalOf(m.sp)));
      const newKind = (A, B) => !kindsBut([X, F0(A, B)]).has(KP.finalOf(KP.breedResult(A, B, { roll: () => 0.999999 }).sp));   // (the sure outcome)
      const F0 = (A, B) => A === X ? B : A;
      const orders = (c) => (R.kpLine(c.sp) > R.kpLine(X.sp) ? [[c, X], [X, c]] : [[X, c], [c, X]]);
      let F = null, chosen = null;
      for (const c of d.box.filter(m => m.lv >= KP.LV(25)).sort((a, b) => R.kpLine(b.sp) - R.kpLine(a.sp))) { const p = orders(c).find(([A, B]) => newKind(A, B)); if (p) { F = c; chosen = p; break; } }
      if (!F) {
        const before = new Set(d.party.concat(d.box));
        yield* O.kp_buy({ royal_nut: 6, golden_nut: 6 }, { center: R.kpNearestCenter() });
        R.kpWantAny = (mon) => mon.lv >= 25;
        let g;
        try { g = yield* O.kp_train(0, { map: o.catch || 'kp_summit_2', until: () => d.party.concat(d.box).some(m => !before.has(m) && m.lv >= KP.LV(25)), max: 300, fast: true, label: 'Breeding: looking for a partner of Lv 25+ to befriend' }); }
        finally { R.kpWantAny = null; }
        if (g !== true) return 'kp_breedup: no partner befriended: ' + g;
        F = d.party.concat(d.box).find(m => !before.has(m) && m.lv >= KP.LV(25));
      }
      { const pr = chosen || orders(F).find(([A, B]) => newKind(A, B)) || orders(F)[0]; const e = yield* R.kpLegendEggReady(pr[0], pr[1]); if (e !== true) return 'kp_breedup: ' + e; }   // (a legend's item and fee)
      // the pair on the team (the weakest other member waits in the box)
      const out = d.party.includes(F) || P().length < KP.PARTY_MAX ? null : P().filter(m => m !== X).sort((a, b) => (a.lv + (a.plus || 0) * 2) - (b.lv + (b.plus || 0) * 2) || R.kpLine(a.sp) - R.kpLine(b.sp))[0];
      if (out || !d.party.includes(F)) { const b = yield* O.kp_box({ leave: out ? [out] : [], take: d.party.includes(F) ? [] : [F] }); if (b !== true) return b; }
      const pair = chosen || orders(F).find(([A, B]) => newKind(A, B)) || orders(F)[0];   // (a fresh catch: the same rule; none new: the stronger line)
      const had = new Set(P());
      const r = yield* O.kp_breed({ pick: () => pair });
      const child = P().find(m => !had.has(m));
      if (r !== true || !child) return 'kp_breedup: the breeding did not happen: ' + r;
      R.say('kupomon: hatched ' + KP.monLabel(child));
      if (out) { const b = yield* O.kp_box({ take: [out] }); if (b !== true) return b; }
      // the child to the top level (Coach Mog, once he's at the ranch)
      yield* R.kpCoachUp([child]);
      const t = child.lv >= KP.MAX_LEVEL ? true : yield* O.kp_train(KP.MAX_LEVEL, { map: o.train || 'kp_summit_2', until: () => child.lv >= KP.MAX_LEVEL, max: 600, label: () => `Raising ${KP.name(child)} (+${child.plus || 0}): Lv ${child.lv} → ${KP.MAX_LEVEL}` });
      if (t !== true) return 'kp_breedup: training ' + KP.name(child) + ': ' + t;
      yield* O.kp_heal({ center: 'nearest' });
    }
    return P().every(m => (m.plus || 0) >= target) ? true : 'kp_breedup: not done after ' + (o.max || 20) + ' rounds';
  };
  O.kp_lead = function* (who = 'strongest') {
    const P = D().party.filter(m => m.hp > 0);
    const mon = who === 'weakest' ? P.slice().sort((a, b) => a.lv - b.lv)[0] : who === 'strongest' ? P.slice().sort((a, b) => b.lv - a.lv)[0] : who;
    if (!mon) return true;
    return yield* R.kpSwapLead(mon);
  };
  // training in the tall grass (o.map: there first; o.at: a grass tile; else the nearest patch): until the whole
  // team is within o.spread (3) levels of `level` and the lead at it; the weakest leads (a swap at the menu); o.max
  // battles. Plays at the Demo's training speed (32x).
  // (never an exit's or a step trigger's tile: a cave counts its whole floor, and a walk onto the way out leaves the map)
  const grassTiles = (fs) => {
    const skip = new Set(), mark = (at) => { for (let y = at[1]; y < at[1] + (at[3] || 1); y++) for (let x = at[0]; x < at[0] + (at[2] || 1); x++) skip.add(x + ',' + y); };
    (fs.map.exits || []).forEach(e => mark(e.at)); (fs.map.triggers || []).forEach(t => { if (!t.on) mark(t.at); });
    const out = [];
    for (let y = 0; y < fs.P.h; y++) for (let x = 0; x < fs.P.w; x++) { const t = fs.P.at(x, y); if (!skip.has(x + ',' + y) && (t.prop === 'tallgrass' || (fs.map.kpCave && t.walk && !t.stair && t.prop !== 'door'))) out.push([x, y]); }
    return out;
  };
  O.kp_train = function* (level, o = {}) {
    const d = D(), spread = o.spread == null ? 3 : o.spread;
    // (Hard Mode: no further than the level cap; a team all at the cap is as trained as it can be)
    const cap = () => KP.levelCap ? KP.levelCap() : KP.MAX_LEVEL, atCap = () => level > 0 && d.party.length && d.party.every(m => m.lv >= cap());
    if (level > 0) level = Math.min(level, cap());
    const done0 = o.until || (() => { const P = d.party; return P.length && P[0] && Math.max(...P.map(m => m.lv)) >= level && P.every(m => m.lv >= Math.min(KP.MAX_LEVEL, level - spread)); });
    const done = () => done0() || atCap();
    if (done()) return true;
    if (d.bag.exp_plus > 0 || d.party.some(m => m.held === 'exp_plus')) yield* O.kp_equip({ training: true });   // (the EXP Plus on the one behind)
    if (o.map && R.where() !== o.map) { const g = yield* R.gotoMap(o.map); if (g !== true && g !== 'mapchanged') return 'kp_train: ' + g; yield* R.settle(3); }
    const map = R.where();
    R.kpTraining = true; R.kpTrainInfo = { level, label: o.label, fast: o.fast === true || (o.fast !== false && level > 0) };   // (fast: grinding levels or a hunt in the grass, 32x)
    try {
    for (let n = 0; n < (o.max || 400) && !done(); n++) {
      if (R.where() !== map) { const g = yield* R.gotoMap(map); if (g !== true && g !== 'mapchanged') return 'kp_train: back to ' + map + ': ' + g; }
      if (worn()) { const h = yield* R.kpRecover(false, o.center); if (h !== true) return h; continue; }   // (o.center: not the nearest; else the bag when far)
      // the weakest healthy one leads (they share nothing they don't fight for)
      const P = d.party.filter(m => m.hp > 0), weak = P.slice().sort((a, b) => a.lv - b.lv)[0];
      if (weak && d.party[0] !== weak && weak.lv < level) { const sw = yield* R.kpSwapLead(weak); if (sw !== true) R.note('kp_train: lead swap: ' + sw); }
      const fs = R.field(); if (!fs) { yield; continue; }
      const tiles = o.at ? [o.at] : grassTiles(fs).filter(t => !o.zone || o.zone(fs, t[0], t[1]));   // (o.zone: a zone's own tiles, its own wild table: R.kpWildMaps)
      if (!tiles.length) return 'kp_train: no tall grass on ' + map;
      const p = fs.player, near = tiles.slice().sort((a, b) => Math.hypot(a[0] - p.tx, a[1] - p.ty) - Math.hypot(b[0] - p.tx, b[1] - p.ty));
      const a = near[0], b = near.find(t => Math.abs(t[0] - a[0]) + Math.abs(t[1] - a[1]) >= 2 && Math.abs(t[0] - a[0]) + Math.abs(t[1] - a[1]) <= 4) || near[1] || a;
      const n0 = R.kpBattles;
      for (let k = 0; k < 12 && R.kpBattles === n0 && R.where() === map; k++) {
        yield* R.walkField([k % 2 ? a : b], { near: 0.2, throughTriggers: false });
        yield* R.settle(2);
      }
    }
    } finally { R.kpTraining = false; }
    return done() ? true : 'kp_train: the team did not reach Lv ' + level + ' (' + d.party.map(m => KP.name(m) + ' ' + m.lv).join(', ') + ')';
  };
  // a battle that has to be won (a rival, a boss, a dojo master): the inner step, and if its flag isn't set after it
  // (lost: a blackout), repairs, a level more of training on o.train, and another go, like a player
  // inner: one step, or a list of steps played in order (a step whose { done } already holds is passed over: after a
  // blackout the block walks back, re-solves what a dojo needs and fights again)
  const runSteps = function* (steps, beforeLast) {
    let r = true;
    for (const st of steps) {
      const so = isObj(st[st.length - 1]) ? st[st.length - 1] : {};
      if (so.done !== undefined && R.cond(so.done)) continue;
      if (beforeLast && st === steps[steps.length - 1]) yield* beforeLast();   // (the battle's step: patched up first)
      const fn = R.ops[st[0]]; if (!fn) return 'no op ' + st[0];
      if (so.choose) [].concat(so.choose).forEach(a => R.choices.push({ a, pc: R.pc }));
      r = yield* fn.apply(R, st.slice(1));
      R.choices = R.choices.filter(c => c.pc !== R.pc);
      yield* R.settle(4);
      if (r !== true && r !== undefined && !(so.done !== undefined && R.cond(so.done))) return r;
    }
    return r;
  };
  // a team at the level cap that keeps losing gets stronger the way a player's does: a stronger catch for its weakest
  // line (o.train's moogles), from the second loss on a breeding round for the member with the fewest "+", held items
  R.kpBuildUp = function* (o, t) {
    if (!o.train) return;
    yield* O.kp_upgrade({ map: o.train, train: o.train, minLv: KP.LV(27) });
    const least = Math.min(...D().party.map(m => m.plus || 0));
    if (t >= 1 && least < 5) yield* O.kp_breedup({ plus: Math.min(5, least + 2), max: 1, train: o.train, catch: o.train });
    yield* O.kp_equip();
    yield* O.kp_relearn();
    yield* O.kp_heal({ center: 'nearest' });
  };
  // ------------------------------------------------------------------ after a loss: the box looked over, as a player does.
  // Every moogle (team and box) is scored as it would be at the top level (KP.levelCap): evolved as far as that goes, its best
  // four of the moves it would know (its own, its kind's by then, the bag's Skill Chips that fit), its ability and its
  // "+", against the team that just won (types, STAB, stats both ways: KP.brain.matchup), with a little for an ability
  // that blocks or resists the foes' attacks and for a sleep or Stop move. A boxed one clearly better (20%) than the
  // weakest member takes its place (every one that is: kpSmartTeam rates them at the top level), and the newcomers are
  // raised to the team before the rematch (Coach Mog, else training).
  // (its own IVs and appetite: a fresh roll each time rated the same moogle anywhere from 1.26 to 1.56; o.plus: rated at
  // that "+", the World Championship's +5 that every member is bred to: R.kpPlusUp)
  R.kpProject = function (mon, L, o = {}) {
    const d = D(), lv = Math.max(mon.lv, Math.min(KP.MAX_LEVEL, L));
    let sp = mon.sp; for (let i = 0; i < 4; i++) { const e = (KP.SPECIES[sp] || {}).evo; if (!e || lv < e.at || !KP.SPECIES[e.to]) break; sp = e.to; }
    const chips = Object.keys(d.bag).filter(k => KP.ITEMS[k] && KP.ITEMS[k].kind === 'chip' && KP.chipFits && KP.chipFits({ sp, moves: [] }, k)).map(k => KP.ITEMS[k].move);
    const pool = Array.from(new Set(mon.moves.concat(KP.movesAt ? KP.movesAt(sp, lv) : [], chips))).filter(id => KP.MOVES[id]);
    const moves = KP.tactics ? R.kpFour({ sp, abil: mon.abil }, pool) : mon.moves.slice();
    return KP.make(sp, lv, { plus: o.plus != null ? Math.max(mon.plus || 0, o.plus) : mon.plus, abil: mon.abil, moves, held: mon.held, iv: mon.iv, app: mon.app });
  };
  R.kpScore = function (m, foes) {
    if (!foes.length) { const b = KP.sp(m).base || {}; return ((b.hp || 0) + (b.atk || 0) + (b.def || 0) + (b.spd || 0)) * (1 + 0.04 * (m.plus || 0)) / 300; }
    const ab = KP.abilityOf ? KP.abilityOf(m) : null;
    let logs = 0;
    for (const f of foes) {
      let k = Math.max(0.03, KP.brain.matchup(null, m, f));
      const types = new Set(f.moves.map(id => KP.MOVES[id]).filter(mv => mv && mv.power).map(mv => mv.type));
      if (ab && ab.immune && ab.immune.some(t => types.has(t))) k *= 1.6;
      if (ab && ab.resist && Object.keys(ab.resist).some(t => types.has(t))) k *= 1.25;
      logs += Math.log(k);
    }
    let s = Math.exp(logs / foes.length);
    if (ab && (ab.statMul || ab.boost || ab.stab || ab.regen || ab.sturdy || ab.guts || ab.onEnter)) s *= 1.08;
    if (m.moves.some(id => { const mv = KP.MOVES[id]; return mv && mv.status && ['sleep', 'stop'].includes(mv.status[0]); })) s *= 1.1;
    if (R._kpSustain) s *= 1 + 0.25 * Math.min(2, R.kpSustain(m));   // (a gauntlet: one that can mend itself goes further)
    return s;
  };
  // a training ground for a team at level L: the reachable map whose wild moogles are the strongest it can handle (their
  // top level no more than 2 over L), the nearest of those; else the strongest in reach
  R.kpTrainGround = function (L, o = {}) {
    const here = R.where(), out = [], avoid = o.avoid || [];
    for (const id of Object.keys(FF7.maps)) {
      const m = FF7.maps[id], tab = m.kpWild && KP.WILD[m.kpWild]; if (!tab || !/^kp_/.test(id)) continue;
      if (avoid.includes(id)) continue;
      const r = id === here ? [] : R.route(here, id); if (!r) continue;
      if (r.some(s => avoid.includes(s.to) || avoid.includes(s.from))) continue;   // (not by way of where it lost)
      out.push({ id, top: Math.max(...tab.map(w => w[3])), far: r.length });
    }
    const ok = out.filter(g => g.top <= L + 2), pick = (ok.length ? ok : out).sort((a, b) => ok.length ? b.top - a.top || a.far - b.far : a.top - b.top || a.far - b.far)[0];
    return pick ? pick.id : null;
  };
  // the species clause (the Kupo League, the tournaments): a kind doubled up on the team (the weaker copy) goes in the
  // box, and the best boxed moogle of a kind not on the team comes out (scored against the teams this fight has met,
  // else by level and "+"), then is trained up to the team (o.train)
  // (o.legends: the tournaments' legend clause too, one legendary or mythical at most: the strongest stays, the rest to
  // the box, the user's rule, 2026-10-03; the Kupo League has the species clause only)
  R.kpClause = function* (o = {}) {
    const d = D(), seen = new Set(), dup = [];
    let legend = false;
    for (const m of d.party.slice().sort((a, b) => b.lv - a.lv || (b.plus || 0) - (a.plus || 0))) {
      if (seen.has(m.sp)) { dup.push(m); continue; }
      if (o.legends && KP.isLegend && KP.isLegend(m)) { if (legend) { dup.push(m); continue; } legend = true; }
      seen.add(m.sp);
    }
    if (!dup.length) return false;
    const met = R.kpBlockFoes && R.kpBlockFoes.size ? [].concat(...R.kpBlockFoes.values()) : (R.kpLastFoes || []);
    const foes = met.map(f => { const m = KP.make(f.sp, f.lv, { plus: f.plus, abil: f.abil, held: f.held }); m.moves = f.moves.slice(); return m; });
    const L = Math.max(...d.party.map(m => m.lv)), score = (m) => foes.length ? R.kpScore(R.kpProject(m, L), foes) : m.lv + (m.plus || 0) * 2;
    const keep = new Set(d.party.filter(m => !dup.includes(m)).map(m => m.sp)), take = [];
    const legendKept = o.legends && d.party.some(m => !dup.includes(m) && KP.isLegend && KP.isLegend(m));
    for (const c of d.box.filter(m => !keep.has(m.sp) && !(legendKept && KP.isLegend && KP.isLegend(m))).sort((a, b) => score(b) - score(a))) { if (take.length >= dup.length) break; if (!take.some(t => t.sp === c.sp)) take.push(c); }
    R.say('kupomon: the ' + (o.legends ? 'species and legend clauses' : 'species clause') + ': ' + dup.map(m => KP.monLabel(m)).join(', ') + ' to the box' + (take.length ? ', ' + take.map(m => KP.monLabel(m)).join(', ') + ' out of it' : ''));
    R.kpLabel = 'The species clause: one of each kind on the team';
    let b; try { b = yield* O.kp_box({ leave: dup, take }); } finally { R.kpLabel = null; }
    if (b !== true) { R.note('kp_clause: ' + b); return false; }
    yield* R.kpCatchUp(o);
    yield* O.kp_equip();
    yield* O.kp_relearn();
    return true;
  };
  R.kpSmartTeam = function* (o = {}) {
    const lost = R._kpLoss; R._kpLoss = null;   // (the loss it answers: looked into once)
    const met = o.foes || (R.kpBlockFoes && R.kpBlockFoes.size ? [].concat(...R.kpBlockFoes.values()) : (R.kpLastFoes || []));   // (every team this fight has met: a gauntlet's whole line-up)
    const d = D(), foes = met.map(f => { const m = KP.make(f.sp, f.lv, { plus: f.plus, abil: f.abil, held: f.held }); m.moves = f.moves.slice(); return m; });
    if (!d.party.length || !foes.length) return false;
    // (every boxed moogle, whatever its level (the user's rule), rated at the top level ("it should evaluate them on
    // max level", 2026-10-03): one behind the team is raised to it below)
    const L = Math.max(...d.party.map(m => m.lv)), top = KP.levelCap ? KP.levelCap() : KP.MAX_LEVEL;
    const rate = (m) => ({ m, s: R.kpScore(R.kpProject(m, top), foes), need: Math.max(0, L - m.lv) });
    const members = d.party.map(rate).sort((a, b) => a.s - b.s);
    const cands = d.box.map(rate).sort((a, b) => b.s - a.s);
    const take = [], out = [];
    for (const c of cands) {   // (as many as are clearly better: two at most a time before, when each had to be trained by hand; the user asked why only two)
      if (take.some(m => m.sp === c.m.sp) || d.party.some(m => m.sp === c.m.sp && !out.includes(m))) continue;   // (one of each kind: the species clause)
      if (d.party.length - out.length + take.length < KP.PARTY_MAX) { take.push(c.m); continue; }   // (room on the team)
      const w = members.find(x => !out.includes(x.m)); if (!w) break;
      if (c.s > w.s * 1.2) { take.push(c.m); out.push(w.m); }
    }
    if (!take.length) { R.say('kupomon: after the loss' + (lost ? ' to ' + lost.who : '') + ', the box looked over: no one better there'); return false; }
    R._kpPinned = new Set([...(R._kpPinned || []), ...take.map(m => m.uid)]); R._kpBenched = new Set([...(R._kpBenched || []), ...out.map(m => m.uid)]);
    R.say('kupomon: after the loss, from the box: ' + take.map(m => KP.monLabel(m)).join(', ') + (out.length ? ' in place of ' + out.map(m => KP.monLabel(m)).join(', ') : '') +
      ' (scored against ' + foes.map(f => KP.name(f)).join(', ') + ')');
    R.kpLabel = 'Rethinking the team: ' + take.map(m => KP.name(m)).join(', ') + ' from the Mog Box';
    let b; try { b = yield* O.kp_box({ leave: out, take }); } finally { R.kpLabel = null; }
    if (b !== true) { R.note('kp_smartteam: ' + b); return false; }
    const lv = Math.min(KP.MAX_LEVEL, L);
    if (lv >= KP.MAX_LEVEL && take.some(m => m.lv < lv - 1)) yield* R.kpCoachUp(take.filter(m => m.lv < lv - 1));   // (the coach first, when he can)
    if (take.some(m => m.lv < lv - 1)) {   // (trained up to the team: on the fight's own ground, else the best one in reach)
      const ground = o.train || R.kpTrainGround(lv, { avoid: o.avoid || [] });
      // (however far behind they are: the watchdog's clock restarts with each battle, the stall check still stands)
      const t = !ground ? 'no training ground in reach' : yield* O.kp_train(lv, { map: ground, center: o.center, until: () => { R.stepStart = R.frames; return take.every(m => m.lv >= lv - 1 || !d.party.includes(m)); }, max: 3000,
        label: () => `Training ${take.map(m => KP.name(m) + ' (Lv ' + m.lv + ')').join(', ')} up to the team for the rematch` });
      if (t !== true) R.note('kp_smartteam: ' + t);
      // (still far behind after it: the swap undone, the old hands back, rather than walk on with an untrained team)
      const behind = take.filter(m => d.party.includes(m) && m.lv < lv - 3);
      if (behind.length && out.length) {
        R.say('kupomon: ' + behind.map(m => KP.monLabel(m)).join(', ') + ' could not be trained up: ' + out.map(m => KP.monLabel(m)).join(', ') + ' back on the team');
        const back = yield* O.kp_box({ leave: behind, take: out.slice(0, behind.length) }); if (back !== true) R.note('kp_smartteam: undo: ' + back);
        R._kpPinned = new Set([...(R._kpPinned || [])].filter(u => !behind.some(m => m.uid === u))); R._kpBenched = new Set([...(R._kpBenched || [])].filter(u => !out.some(m => m.uid === u)));
      }
    }
    yield* O.kp_equip();
    yield* O.kp_relearn();   // (a newcomer's best moves)
    return true;
  };
  // before a fight that has its training ground: any member more than 3 levels behind the team's best (a newcomer
  // from the box, a fresh catch, a Demo continued from a file saved before its training was done) is trained up to
  // within a level of it there, as a proper training run (the Demo's 32x), then the team is repaired
  // Coach Mog (the post-game: free, to the top level; the user, 2026-10-02): every moogle given is raised by him rather
  // than trained by hand; the ones left (no coach yet) come back for training
  R.kpCoachUp = function* (mons) {
    const d = D();
    if (!FF7.state.flags.kp_champion || !KP.coach || !FF7.maps.kp_mogfield_ranch) return mons.slice();
    const left = [];
    for (const m of mons) {
      if (m.lv >= KP.MAX_LEVEL) continue;
      // (one in the box: onto the team for the coach, in place of the lowest)
      if (!d.party.includes(m)) {
        const out = d.party.length >= KP.PARTY_MAX ? d.party.filter(x => x !== m).sort((a, b) => a.lv - b.lv)[0] : null;
        const bx = yield* O.kp_box({ leave: out ? [out] : [], take: [m] }); if (bx !== true || !d.party.includes(m)) { left.push(m); continue; }
      }
      R.choices.push({ a: () => { const L = d.party.filter(x => x.lv < KP.MAX_LEVEL || KP.evoDue(x)), i = L.indexOf(m); return i >= 0 ? i : null; }, pc: R.pc }, { a: 'Deal!', pc: R.pc });   // (his list: a held-back job change too; "let it change?" left to its first answer, yes)
      R.kpLabel = `Coach Mog: ${KP.name(m)} to Lv ${KP.MAX_LEVEL}`;
      let r; try { r = yield* O.talk('kp_mfr_coach', { map: 'kp_mogfield_ranch' }); } finally { R.choices = R.choices.filter(c => c.pc !== R.pc); R.kpLabel = null; }
      if (r !== true || m.lv < KP.MAX_LEVEL) { R.note('kp_coach: ' + r); left.push(m); }
      else R.say('kupomon: Coach Mog raised ' + KP.name(m) + ' to Lv ' + KP.MAX_LEVEL);
    }
    return left;
  };
  R.kpCatchUp = function* (o = {}) {
    const d = D(); if (!o.train || !d.party.length) return true;
    const top = Math.min(KP.MAX_LEVEL, Math.max(...d.party.map(m => m.lv)));
    let behind = d.party.filter(m => m.lv < top - (o.behind || 5));
    if (!behind.length) return true;
    if (top >= KP.MAX_LEVEL) { behind = yield* R.kpCoachUp(behind); if (!behind.length) { yield* O.kp_equip(); return true; } }   // (the coach first, when he can)
    R.say('kupomon: ' + behind.map(m => KP.name(m) + ' (Lv ' + m.lv + ')').join(', ') + ' trained up to the team before the fight');
    const t = yield* O.kp_train(top, { map: o.train, center: o.center, max: 3000,
      until: () => { R.stepStart = R.frames; return behind.every(m => m.lv >= top - 1 || !d.party.includes(m)); },
      label: () => `Training ${behind.map(m => KP.name(m) + ' (Lv ' + m.lv + ')').join(', ')} up to the team (Lv ${top})` });
    if (t !== true) R.note('kp_catchup: ' + t);
    yield* O.kp_equip();
    yield* O.kp_heal({ center: o.center || 'nearest' });
    return true;
  };
  // before a tournament (a cup, or its coin rematches): the best six the player has, whatever their levels. Every
  // moogle, on the team and in the Mog Box, is rated as it would be at the top level (R.kpProject: evolved, the moves
  // it would know, its ability and "+") against the cup's teams (the ones met there so far, and a draw of its
  // entrants: KP.cupSample), the best six taken by the species and legend clauses (one of each job line, one legend
  // at most), the newcomers raised to the team (Coach Mog, else training: R.kpCatchUp). A member keeps its place
  // unless one rated 10% better wants it (no swapping back and forth on a close call). The user, 2026-10-03: "why did
  // the demo bring a level 32 moogle to the tournament" (a fresh catch had taken the sixth place, empty since teams
  // went from five to six), and "it should look at its box and determine the best moogles to use, no matter the
  // levels. it should evaluate them on max level"
  R._kpCupSample = {};
  R.kpTourneyTeam = function* (n, o = {}) {
    const d = D(); if (!d.party.length || R._kpHoldTeam) return true;   // (the coins for a team being built: that team as it is)
    const top = KP.levelCap ? KP.levelCap() : KP.MAX_LEVEL;
    const sample = R._kpCupSample[n] || (R._kpCupSample[n] = KP.cupSample ? KP.cupSample(n, 7919 * n) : []);   // (a fixed draw: the same yardstick every rematch and every session)
    const met = [].concat(...R.kpCupFoes(n).values()).map(f => { const m = KP.make(f.sp, f.lv, { plus: f.plus, abil: f.abil, held: f.held }); m.moves = f.moves.slice(); return m; });
    const foes = met.concat(sample);
    const legend = (m) => !!(KP.isLegend && KP.isLegend(m)), line = (m) => KP.baseOf ? KP.baseOf(m.sp) : m.sp;
    const plus = n === 5 ? 5 : null;   // (the World Championship: every member is bred to +5 before it, so all are rated at +5)
    const rated = d.party.concat(d.box).map(m => ({ m, s: R.kpScore(R.kpProject(m, top, { plus }), foes) * (d.party.includes(m) ? 1.1 : 1) })).sort((x, y) => y.s - x.s);
    const pick = [], lines = new Set(); let hasLegend = false;
    for (const c of rated) {
      if (pick.length >= KP.PARTY_MAX) break;
      if (lines.has(line(c.m)) || (legend(c.m) && hasLegend)) continue;
      pick.push(c.m); lines.add(line(c.m)); if (legend(c.m)) hasLegend = true;
    }
    const leave = d.party.filter(m => !pick.includes(m)), take = pick.filter(m => !d.party.includes(m));
    if (leave.length || take.length) {
      R.say('kupomon: the best six for the ' + KP.LEAGUES[n].name + ' (rated at Lv ' + top + ' against ' + foes.length + ' of its moogles): ' +
        (take.length ? take.map(m => KP.monLabel(m)).join(', ') + ' out of the box' : '') + (leave.length ? (take.length ? ', ' : '') + leave.map(m => KP.monLabel(m)).join(', ') + ' into it' : ''));
      R.kpLabel = 'The best six for the ' + KP.LEAGUES[n].name + ', from the Mog Box';
      let bx; try { bx = yield* O.kp_box({ leave, take }); } finally { R.kpLabel = null; }
      if (bx !== true) R.note('kp_tourneyteam: ' + bx);
      else {
        if (R.kpMain && R.kpMain.length) R.kpMain = d.party.map(m => m.uid);   // (the team from now on)
        R._kpPinned = new Set([...(R._kpPinned || []), ...take.map(m => m.uid)]);
      }
    }
    yield* R.kpCatchUp({ train: o.train || 'kp_summit_2', center: o.center, behind: 1 });   // (the newcomers raised to the team: Coach Mog, or training)
    let bred = false, ready = true;
    if (n === 5) { const r = yield* R.kpPlusUp({ train: o.train, catch: o.train }); if (r !== true) { R.note('kp_plusup: ' + r); ready = 'the team is not all +5: ' + r; } bred = true; }
    if (leave.length || take.length || bred) { yield* O.kp_equip(); yield* O.kp_relearn(); }
    return ready;
  };
  // the World Championship's rule for the Demo (the user, 2026-10-03: "anytime the demo is about to partake in the
  // world champ tourney, it should make sure all party members are +5"): each member under +5 is bred into a +5 of its
  // own kind. An egg takes after its first parent when no recipe or job pairing fits (KP.breedResult), with the higher
  // "+" of the two and two more (both Lv 25+; +5 at most), and a legend parent never retires: so the team's legend
  // goes first (bred with spare boxed moogles: it stays each time, and its child is the next one bred), and a +5 legend
  // is then the partner for the rest, a +5 of each in one egg. A pairing that could hatch any other kind is never
  // used; a boxed partner (it retires) is the least use to the team; each child is raised to the top level (Coach Mog,
  // else training) and takes its parent's place on the team
  R.kpPlusUp = function* (o = {}) {
    const d = D(), WANT = 5, L25 = KP.LV(25), team = () => d.party.slice();
    const legend = (m) => !!(KP.isLegend && KP.isLegend(m)), line = (sp) => KP.finalOf ? KP.finalOf(sp) : sp;
    // (every way the egg can go is X's kind: no recipe that fits makes another, and with none coming off (a roll over
    // any chance) the job pairing or the first parent's line is X's)
    const sure = (A, B, X) => {
      const want = line(X.sp);
      if (KP.breedMatches(A, B).some(x => x.ok && line(x.r.child) !== want)) return false;
      return line(KP.breedResult(A, B, { roll: () => 2 }).sp) === want;
    };
    const order = (X, P) => [[X, P], [P, X]].find(([A, B]) => sure(A, B, X)) || null;
    const gain = (X, P) => !KP.breedPlusOn() ? (X.plus || 0) : Math.min(WANT, Math.max(X.plus || 0, P.plus || 0) + 1 + (X.lv >= L25 && P.lv >= L25 ? 1 : 0));   // (breeding's stage two: the Championship)
    for (let round = 0; round < (o.max || 24); round++) {
      const six = team();
      const X = six.filter(m => (m.plus || 0) < WANT).sort((a, b) => legend(b) - legend(a) || (a.plus || 0) - (b.plus || 0))[0];   // (the legend first)
      if (!X) return true;
      if (X.lv < L25) { const c = yield* R.kpCoachUp([X]); if (c.length) return 'kp_plusup: ' + KP.name(X) + ' is under Lv 25'; }
      // the partner: one that keeps the egg X's kind, and the cheapest whole climb to +5 (in coins). A legend's egg takes
      // its item (15,000 to buy) and 5,000 a "+" (kp_legendbreed.js: the user, 2026-10-03, "not for free"), whichever
      // parent is the legend; each egg is a trip (the ranch, Coach Mog: 2,000's worth); a boxed partner that retires
      // with a "+" of its own is lost for good (6,000 a "+": the first test bred Bahamog with the +5 Shamog just left
      // off the team). So a member that isn't a legend climbs on spare +0 moogles (three free eggs), and a legend takes
      // the spare that saves the most of its dear eggs. Between equals the one of least use (the weakest line, the lowest level)
      const price = KP.LEGEND_ITEM_PRICE || 0, perPlus = KP.LEGEND_FEE_PER_PLUS || 0, TRIP = 2000;
      const eggCost = (xLeg, pLeg, g) => (xLeg ? price : 0) + (pLeg ? price : 0) + (xLeg || pLeg ? perPlus * g : 0) + TRIP;
      const climb = (g) => { let c = 0; for (let k = 0; g < WANT && k < 5; k++) { g = Math.min(WANT, g + 2); c += eggCost(legend(X), false, g); } return c; };   // (the rest on spare +0 moogles)
      const cands = d.box.concat(six.filter(m => m !== X && legend(m))).filter(m => m.lv >= KP.MIN_BREED_LV && m.hp > 0);
      let best = null;
      for (const P of cands) {
        const ord = order(X, P); if (!ord) continue;
        const g = gain(X, P); if (g <= (X.plus || 0)) continue;
        const v = -(eggCost(legend(X), legend(P), g) + (legend(P) ? 0 : (P.plus || 0) * 6000) + climb(g)) - R.kpLine(P.sp) / 100 - P.lv / 100;
        if (!best || v > best.v) best = { P, ord, v };
      }
      if (!best || gain(X, best.P) <= (X.plus || 0)) {   // (none in the box: one befriended for it, as kp_breedup does)
        const before = new Set(d.party.concat(d.box));
        yield* O.kp_buy({ royal_nut: 6, golden_nut: 6 }, { center: R.kpNearestCenter() });
        R.kpWantAny = (mon) => mon.lv >= 25;
        let g; try { g = yield* O.kp_train(0, { map: o.catch || 'kp_summit_2', until: () => d.party.concat(d.box).some(m => !before.has(m) && m.lv >= L25 && order(X, m)), max: 300, fast: true, label: 'Breeding ' + KP.name(X) + ' to +5: looking for a partner of Lv 25+' }); }
        finally { R.kpWantAny = null; }
        const P = d.party.concat(d.box).find(m => !before.has(m) && m.lv >= L25 && order(X, m));
        if (g !== true || !P) return 'kp_plusup: no partner for ' + KP.name(X) + ': ' + g;
        best = { P, ord: order(X, P) };
      }
      const { P, ord } = best;
      { R._kpHoldTeam = true; let e; try { e = yield* R.kpLegendEggReady(ord[0], ord[1]); } finally { R._kpHoldTeam = false; } if (e !== true) return e; }   // (a legend's item and fee, before the pair is arranged)
      R.say('kupomon: the World Championship: ' + KP.monLabel(X) + ' bred to +' + gain(X, P) + ' with ' + KP.monLabel(P) + (legend(P) ? ' (a legend: it stays)' : ''));
      R.kpLabel = 'Every member +5 for the World Championship: breeding ' + KP.name(X);
      try {
        // the pair on the team (a member that isn't breeding waits in the box)
        if (!d.party.includes(P)) {
          const out = d.party.length >= KP.PARTY_MAX ? d.party.filter(m => m !== X && !legend(m)).sort((a, b) => (b.plus || 0) - (a.plus || 0))[0] || d.party.find(m => m !== X) : null;
          const b = yield* O.kp_box({ leave: out ? [out] : [], take: [P] }); if (b !== true) return 'kp_plusup: ' + b;
        }
        const had = new Set(d.party.concat(d.box));
        const r = yield* O.kp_breed({ pick: () => ord });
        const child = d.party.concat(d.box).find(m => !had.has(m));
        if (r !== true || !child) return 'kp_plusup: the breeding did not happen: ' + r;
        R.say('kupomon: hatched ' + KP.monLabel(child));
        // the team as it was, the child in its parent's place (a legend parent, still here, to the box; the partner too)
        const want = six.map(m => m === X ? child : m), leave = d.party.filter(m => !want.includes(m)), take = want.filter(m => !d.party.includes(m));
        if (leave.length || take.length) { const b = yield* O.kp_box({ leave, take }); if (b !== true) return 'kp_plusup: ' + b; }
        if (R.kpMain && R.kpMain.length) R.kpMain = d.party.map(m => m.uid);
        yield* R.kpCoachUp([child]);
        const t = child.lv >= KP.MAX_LEVEL ? true : yield* O.kp_train(KP.MAX_LEVEL, { map: o.train || 'kp_summit_2', until: () => child.lv >= KP.MAX_LEVEL, max: 600, label: () => `Raising ${KP.name(child)} (+${child.plus || 0}): Lv ${child.lv} → ${KP.MAX_LEVEL}` });
        if (t !== true) return 'kp_plusup: raising ' + KP.name(child) + ': ' + t;
      } finally { R.kpLabel = null; }
      R.stepStart = R.frames;
    }
    return team().every(m => (m.plus || 0) >= WANT) ? true : 'kp_plusup: not done after ' + (o.max || 24) + ' rounds';
  };
  // a legend's egg made ready (kp_legendbreed.js): each legend parent's item in the bag, bought from its quest's seller
  // (KP.legendItemShop: up to three a talk) when it has none, and the coins for those and the ranch's fee (5,000 a "+")
  // in hand, won at the cups first when they aren't (o.earn false: only what the coins in hand allow; never the World
  // Championship for them, and the team as it is while they're won). Not a legend's egg: nothing to do
  R.kpLegendEggReady = function* (A, B, o = {}) {
    if (!KP.legendEggCost) return true;
    const d = D(), cost = KP.legendEggCost(A, B), ids = Object.keys(cost.items);
    if (!ids.length && d.money >= cost.fee) return true;   // (any other egg: its wee fee, 100 a "+")
    const short = (id) => Math.max(0, cost.items[id] - (d.bag[id] || 0));
    const free = (id) => FF7.state.flags['kp_lbi_' + KP.ITEMS[id].legendBreed] ? 0 : 1;   // (the first one, never had: the seller gives it)
    const need = cost.fee + ids.reduce((a, id) => a + Math.max(0, short(id) - free(id)) * KP.LEGEND_ITEM_PRICE, 0);
    if (d.money < need) {
      if (o.earn === false) return 'not enough coins for a legend egg (' + d.money + ' of ' + need + ')';
      const was = R._kpHoldTeam; R._kpHoldTeam = true;
      let e; try { e = yield* R.kpEarn(need + 3000, (ids.length ? 'A legend egg (' + ids.map(id => KP.ITEMS[id].name).join(', ') + ', ' : 'An egg (') + cost.fee.toLocaleString() + ' coins)', { no5: true }); } finally { R._kpHoldTeam = was; }
      if (e !== true) return 'kp_legend_egg: ' + e;
    }
    for (const id of ids) {
      for (let tries = 0; short(id) > 0 && tries < 4; tries++) {
        const sp = KP.ITEMS[id].legendBreed, S = (KP.LEGEND_BREED[sp] || {}).seller;
        if (!S) return 'no ' + KP.ITEMS[id].name + ' (no one sells it)';
        const n = Math.min(3, short(id)), had = d.bag[id] || 0;
        R.choices.push({ a: ['One', 'Two', 'Three'][n - 1], pc: R.pc });
        R.kpLabel = 'Buying ' + n + ' ' + KP.ITEMS[id].name + (n > 1 ? 's' : '') + ' for a legend egg';
        let r; try { r = yield* O.talk(S.npc, { map: S.map }); } finally { R.choices = R.choices.filter(c => c.pc !== R.pc); R.kpLabel = null; }
        if ((d.bag[id] || 0) <= had) return 'could not get a ' + KP.ITEMS[id].name + ': ' + r;
      }
      if (short(id) > 0) return 'still short of ' + KP.ITEMS[id].name;
    }
    return d.money >= cost.fee ? true : 'not enough coins for the fee (' + d.money + ' of ' + cost.fee + ')';
  };
  // ---- the nuts for a legendary or a mythical (an appetite of 3 to 5, ten tries: KP.befriendTries), stocked before
  // each try, the first too (it went in with none: the Royal Kupo Nuts were bought only after a try was lost, and at
  // the nearest Mart, which may not sell them), at the nearest Mart that sells them. Ten Royal Kupo Nuts (x3) and ten
  // Slow-Roast Nuts (x1, but up to x4 the longer the battle: past seven turns they beat a Royal, and a legend's fight
  // runs long), which is likelier is only known when it's beaten (KP.brain.nut picks then); a Royal for each Slow-Roast
  // as far as the coins go, 3,000 kept for the oils. The coins are won at the cups only when what they'd buy leaves it
  // under ten of the two (one for each try): ten Royal Nuts and no Slow-Roast is a fair go, not worth a cup grind
  R.kpLegendNuts = function* () {
    const d = D(), want = { royal_nut: 10, roast_nut: 10 }, ids = Object.keys(want);
    const short = (k) => Math.max(0, want[k] - (d.bag[k] || 0)), cost = () => ids.reduce((a, k) => a + KP.ITEMS[k].price * short(k), 0);
    const plan = () => {   // (one of each in turn, as far as the coins go)
      const buy = {}; let budget = d.money - 3000;
      for (let added = true; added;) {
        added = false;
        for (const k of ids) if ((buy[k] || 0) < short(k) && KP.ITEMS[k].price <= budget) { buy[k] = (buy[k] || 0) + 1; budget -= KP.ITEMS[k].price; added = true; }
      }
      return buy;
    };
    const good = (buy) => ids.reduce((a, k) => a + (d.bag[k] || 0) + (buy[k] || 0), 0);
    if (!cost()) return true;
    if (good(plan()) < 10 && FF7.state.flags.kp_league_1) { const e = yield* R.kpEarn(cost() + 6000, 'Royal and Slow-Roast Nuts for a legendary moogle'); if (e !== true) R.note('kp_legend_nuts: ' + e); }
    const dist = R.kpDist(R.where()), mart = Object.keys(FF7.maps).filter(c => /^kp_(.+_)?center$/.test(c) && ids.every(k => ((FF7.maps[c] || {}).kpMart || []).includes(k)))
      .sort((x, y) => (dist[x] ?? 99) - (dist[y] ?? 99))[0];
    if (!mart) return true;
    const buy = plan();
    if (!Object.keys(buy).length) return true;
    const to = {}; for (const k of Object.keys(buy)) to[k] = (d.bag[k] || 0) + buy[k];
    R.say('kupomon: nuts for a legendary moogle: ' + Object.keys(buy).map(k => buy[k] + ' ' + KP.ITEMS[k].name).join(', ') + ' at ' + mart);
    const r = yield* O.kp_buy(to, { center: mart }); if (r !== true) R.note('kp_legend_nuts: ' + r);
    return true;
  };
  O.kp_win = function* (inner, flag, o = {}) {
    const steps = Array.isArray(inner[0]) ? inner : [inner];
    const legend = typeof flag === 'string' && flag.startsWith('kp_legend_');   // (a legendary: beaten, it flees; befriended, done)
    R._kpPinned = null; R._kpBenched = null; R.kpBlockFoes = new Map();   // (this fight's own choices from the box, and the teams it meets)
    for (let t = 0; t < (o.tries || (legend ? 30 : 20)); t++) {   // (a player keeps at a story battle until it's won)   // (each lost try at the cap builds the team up: a catch, a breeding round)
      if (R.cond(flag)) return true;
      yield* R.settle(3);
      if (o.clause) yield* R.kpClause(o);   // (the Kupo League: one of each kind)
      yield* R.kpCatchUp(o);   // (a member well behind the rest trained up first, as a player would before a big fight)
      // (Hard Mode: every member up to the level cap first, as a Nuzlocke player grinds before a boss: a loss costs lives)
      if (KP.hard() && o.train && D().party.some(m => m.lv < KP.levelCap())) {
        const g = yield* O.kp_train(KP.levelCap(), { map: o.train, spread: 0, center: o.center, label: () => `Hard Mode: the team up to the level cap (Lv ${KP.levelCap()}) before the fight` });
        if (g !== true) R.note('kp_win: hard training: ' + g);
        yield* O.kp_heal({ center: o.center || 'nearest' });
      }
      // (a gauntlet, planned as a whole before its first try: not with a run under way, whose repairs would wipe it)
      if (o.gauntlet && t === 0 && !(KP.GAUNTLETS && KP.GAUNTLETS[o.gauntlet] && KP.GAUNTLETS[o.gauntlet].running())) yield* R.kpGauntletPlan(o.gauntlet, o);
      if (legend && !(o.gauntlet && KP.GAUNTLETS && KP.GAUNTLETS[o.gauntlet] && KP.GAUNTLETS[o.gauntlet].running())) yield* R.kpLegendNuts();   // (the nuts to befriend it, before every try)
      yield* O.kp_equip({ foes: R.kpFoesFor(flag), gauntlet: !!o.gauntlet });   // (held items for this fight: its team, when the Demo can know it)
      yield* O.kp_lead('strongest');
      const b0 = KP.blackouts, r = yield* runSteps(steps, o.patch === false ? null : () => O.kp_patch());
      yield* R.settle(6);
      if (R.cond(flag)) {   // (done; a battle lost on the way, a rival's, which never stops the story, still gets the box looked over)
        if (R._kpLoss) { const sw = yield* R.kpSmartTeam({ train: o.train, center: o.center }); if (sw) yield* O.kp_heal({ center: o.center || 'nearest' }); }
        return true;
      }
      if (KP.blackouts === b0 && r !== true && r !== 'mapchanged') return 'kp_win: ' + r;   // (not a lost battle: training won't help; a walk cut short by a repair trip or a scene just goes again)
      R.say('kupomon: ' + R.stepText(steps[steps.length - 1]) + ' did not win ' + JSON.stringify(flag) + ' (' + r + '); repairs and training (try ' + (t + 1) + ')');
      yield* O.kp_heal({ center: o.center || 'nearest' });
      const d = D();
      // (a legendary is a wild battle, where the bag works: oils and Batteries for it. A trainer's fight allows no bag
      // items, the blackout healed the team, and the repairs at the counter keep a few oils for between fights
      // (R.kpRestock): nothing more to buy)
      if (legend && d.money >= 700) yield* O.kp_buy(Object.assign({ hi_oil: 6, max_oil: 4, battery: 3 }, o.stock || {}), { center: R.kpNearestCenter() });
      if (KP.blackouts !== b0 || R._kpLoss) { const sw = yield* R.kpSmartTeam({ train: o.train, center: o.center, foes: o.gauntlet ? R.kpFoesFor(flag) : undefined }); if (sw) yield* O.kp_heal({ center: o.center || 'nearest' }); }   // (the box looked over: a gauntlet's against all its battles)
      if (o.train) {
        const lv = Math.min(KP.MAX_LEVEL, Math.max(...D().party.map(m => m.lv)) + 1);
        const avg = () => (D().party.reduce((a, m) => a + m.lv, 0) / Math.max(1, D().party.length)).toFixed(1);
        const g = yield* O.kp_train(lv, { map: o.train, spread: 2, center: o.center, label: () => `Lost; training for a rematch: team Lv ${avg()} → ${lv}` }); if (g !== true) R.note('kp_win: training: ' + g);
        if (D().party.every(m => m.lv >= KP.MAX_LEVEL)) yield* R.kpBuildUp(o, t);   // (at the cap, training does nothing)
        yield* O.kp_heal({ center: o.center || 'nearest' });
      }
      R.stepStart = R.frames;
    }
    return R.cond(flag) ? true : 'kp_win: ' + JSON.stringify(flag) + ' was never won';
  };
  // ---- the legendary and mythical sidequests (docs/KUPOMON_LEGENDS.md): each quest file registers itself in KP.QUESTS
  // { name, order, ready() (open yet), done (a flag: the legend befriended), plan: [steps in this plan's words] }; the
  // Demo plays every open one not done, in order (o.only: the ids)
  O.kp_quests = function* (o = {}) {
    const Q = Object.entries(KP.QUESTS || {}).filter(([id]) => !o.only || o.only.includes(id)).sort((a, b) => (a[1].order || 0) - (b[1].order || 0));
    // (passes over the list: a quest that failed this time (a walk cut short, a loss it couldn't train past yet) gets
    // another go after the rest, three passes at most; the ones still open after them are noted by name)
    const failed = {};
    for (let pass = 0; pass < 3; pass++) {
      let tried = 0;
      for (const [id, q] of Q) {
        if (q.done && R.cond(q.done)) continue;
        if (q.ready && !q.ready()) continue;
        if (pass > 0 && !failed[id]) continue;
        tried++;
        R.say('kupomon: the sidequest ' + (q.name || id) + (pass ? ' (again: ' + failed[id] + ')' : ''));
        R.kpLabel = 'Sidequest: ' + (q.name || id);
        let r; try { r = yield* runSteps(q.plan || []); } finally { R.kpLabel = null; }
        if (r !== true && !(q.done && R.cond(q.done))) { failed[id] = String(r).slice(0, 80); R.note('kp_quests: ' + id + ': ' + r); } else delete failed[id];
        yield* O.kp_heal({ center: 'nearest' });
      }
      if (!tried || !Object.keys(failed).length) break;
    }
    const open = Q.filter(([id, q]) => !(q.done && R.cond(q.done)) && (!q.ready || q.ready())).map(([id]) => id);
    if (open.length) R.note('kp_quests: still open after three passes: ' + open.join(', '));
    return true;
  };
  // ---- a region's own steps: a map file registers KP.PLANS[name] = { name, steps: [steps in this plan's words] } (Region
  // 5's two dojos: js/maps/kupomon/kp_region5a.js, kp_region5b.js); played through unless o.done holds already
  O.kp_plan = function* (name, o = {}) {
    if (o.done && R.cond(o.done)) return true;
    const P = (KP.PLANS || {})[name]; if (!P) return 'kp_plan: no plan ' + name;
    R.say('kupomon: ' + (P.name || name));
    const r = yield* runSteps(P.steps || []);
    if (o.done) return R.cond(o.done) ? true : 'kp_plan ' + name + ': ' + r;
    return r;
  };
  // enter a league and play it through (o.tries, with training to 30 in between)
  O.kp_league = function* (n, o = {}) {
    for (let t = 0; t < (o.tries || 20); t++) {   // (a player keeps entering until it's won)
      if (FF7.state.flags['kp_league_' + n]) return true;
      const L = KP.LEAGUES[n], map = o.map || 'kp_costa_arena';   // (the Battle Square, Costa del Kupo)
      R.kpBlockFoes = R.kpCupFoes(n);   // (the box is scored against every team met in this cup)
      const tt = yield* R.kpTourneyTeam(n, { train: o.train || 'kp_summit_2', center: o.center });   // (the clauses, six at the team's level, anyone left behind trained up: before the registrar)
      if (tt !== true) return 'kp_league: ' + tt;   // (the World Championship: every member +5 first, the user's rule)
      if (R.where() !== map) { const g = yield* R.gotoMap(map); if (g !== true && g !== 'mapchanged') return 'kp_league: ' + g; yield* R.settle(3); }   // (there first: see kp_breed)
      R.choices.push({ a: L.name, pc: R.pc }, { a: "Let's go!", pc: R.pc });
      const r = yield* O.talk(o.npc || 'registrar', { map: o.map || 'kp_costa_arena' });
      R.choices = R.choices.filter(c => c.pc !== R.pc);
      if (r !== true) return 'kp_league: ' + r;
      yield* R.settle(6);
      if (FF7.state.flags['kp_league_' + n]) return true;
      R.say('kupomon: lost in the ' + L.name + '; building the team up before another go');
      yield* R.kpSmartTeam({ train: o.train });
      if (o.train) {
        const low = yield* R.kpCoachUp(D().party.filter(m => m.lv < KP.MAX_LEVEL));   // (Coach Mog first, once he's at the ranch)
        const g = low.length ? yield* O.kp_train(KP.MAX_LEVEL, { map: o.train, spread: 0 }) : true; if (g !== true) return g;
        yield* R.kpBuildUp(o, n >= 3 ? t : 0);   // (a breeding round only for the bred leagues)
        R.stepStart = R.frames;
      }
    }
    return FF7.state.flags['kp_league_' + n] ? true : 'kp_league: could not win league ' + n;
  };
  // breeding at the ranch: the first two moogles of Lv 10+ that the pick function chooses (o.pick(party) -> [a, b])
  O.kp_breed = function* (o = {}) {
    // there first: answers queued for the whole walk would go to the nurses' questions on the way
    const map = o.map || 'kp_mogfield_ranch';
    {   // (a legend parent: its item and the fee first, kp_legendbreed.js; the coins were won before the pair was put
        // on the team, R.kpLegendEggReady with earn, since winning them could rearrange the team)
      const ok0 = D().party.filter(m => m.lv >= KP.MIN_BREED_LV), p0 = o.pick ? o.pick(ok0) : ok0.slice(-2);
      if (p0 && p0.length >= 2) { const e = yield* R.kpLegendEggReady(p0[0], p0[1], { earn: false }); if (e !== true) return 'kp_breed: ' + e; }
    }
    if (R.where() !== map) { const g = yield* R.gotoMap(map); if (g !== true && g !== 'mapchanged') return 'kp_breed: ' + g; yield* R.settle(3); }
    const d = D(), ok = d.party.filter(m => m.lv >= KP.MIN_BREED_LV);
    const pair = o.pick ? o.pick(ok) : ok.slice(-2);
    if (!pair || pair.length < 2) return 'kp_breed: no pair';
    const first = (ch) => { const i = d.party.filter(m => m.lv >= KP.MIN_BREED_LV).indexOf(pair[0]); return i >= 0 && i < ch.length - 1 ? i : null; };
    const second = (ch) => { const i = d.party.filter(m => m.lv >= KP.MIN_BREED_LV && m !== pair[0]).indexOf(pair[1]); return i >= 0 && i < ch.length - 1 ? i : null; };
    R.choices.push({ a: 'Yes', pc: R.pc }, { a: first, pc: R.pc }, { a: second, pc: R.pc }, { a: 'Yes', pc: R.pc });
    const r = yield* O.talk(o.npc || 'rancher', { map: o.map || 'kp_mogfield_ranch' });
    R.choices = R.choices.filter(c => c.pc !== R.pc);
    return r === true ? true : 'kp_breed: ' + r;
  };

  // ------------------------------------------------------------------ Big Mog's Bell (js/kupomon/kp_fly.js): flown to a town
  // as a player does, through the menu (Bag > Key Items > the bell), the Town Map and Yes
  R.kpFly = function* (town) {
    const d = D(), t = KP.flyTowns().find(x => x.town === town);
    if (!t || !(d.bag.big_bell > 0) || !KP.visited(town)) return 'kp_fly: cannot fly to ' + town;
    R.kpFlyTarget = town; R._flying = true;
    R.kpLabel = 'Flying to ' + t.name + ' on Big Mog';
    try {
      R.kpMenuOwn = true;
      try {
        yield* press('menu', R.fast ? 4 : 14);
        const M = R.top(); if (!(M instanceof KP.Menu)) return 'kp_fly: the menu did not open';
        for (let g = 0; g < 40 && M.idx !== 2; g++) { R.tap(M.idx < 2 ? 'down' : 'up'); yield; yield; }
        yield* press('ok');
        const pk = KP.pocketOf('big_bell');
        for (let g = 0; g < 20 && M.pocket !== pk; g++) { R.tap('right'); yield; yield; yield; }
        const k = KP.pocketItems(pk).indexOf('big_bell');
        for (let g = 0; g < 60 && M.sub !== k; g++) { R.tap(M.sub < k ? 'down' : 'up'); yield; yield; }
        yield* press('ok', R.fast ? 2 : 16);
        if (R.top() instanceof KP.Menu) { if (M.msg) yield* press('ok'); for (let g = 0; g < 60 && R.top() instanceof KP.Menu; g++) { R.tap('cancel'); yield; yield; } return 'kp_fly: the bell would not ring here'; }
      } finally { R.kpMenuOwn = false; }
      // the Town Map (driveTownMap), the flight and the landing
      for (let g = 0; g < 3000 && !(R.where() === town && R.field() && R.fieldFree(R.field()) && !R.field().actors.kp_bigmog); g++) yield;
      yield* R.settle(4);
    } finally { R.kpFlyTarget = null; R._flying = false; R.kpLabel = null; }
    R.stepStart = R.frames;
    return R.where() === town ? true : 'kp_fly: did not land at ' + town + ' (' + R.where() + ')';
  };
  // on the way somewhere (R.gotoMap, each hop): from outdoors, a flight to the visited town nearest the target when it
  // saves three maps' walk or more
  R.flyHook = function* (here, target) {
    if (!inKP() || R._flying || !(D().bag.big_bell > 0) || !/^kp_/.test(target || '') || !KP.flyFromOK(here)) return false;
    const d0 = R.kpDist(here)[target] ?? 999; if (d0 < 4) return false;   // (no way on foot at all: flying it is)
    let best = null, bd = d0;
    for (const t of KP.flyTowns()) { if (t.town === here || !KP.visited(t.town)) continue; const dt = R.kpDist(t.town)[target]; if (dt != null && dt < bd) { bd = dt; best = t; } }
    if (!best || d0 - bd < 3) return false;
    R.say('kupomon: flying to ' + best.name + ' with Big Mog (' + (d0 >= 999 ? 'no way' : d0 + ' maps') + ' on foot; ' + bd + ' from there)');
    const r = yield* R.kpFly(best.town);
    if (r !== true) { R.note(r); return false; }
    return true;
  };

  // ------------------------------------------------------------------ the 100% (docs/RUNNER.md "Kupomon: the 100%"):
  // after the legendaries, every item on the maps, the whole Kupodex and every Skill Chip in the Marts, then the
  // professor's diploma. The coins for it come as a player's do after the story: World Championship rematches.
  const mapName = (id) => (FF7.maps[id] && FF7.maps[id].name) || id;
  const LEFT = () => KP.DEX.filter(id => !D().dex.caught[id]);
  const dexLine = () => { const n = KP.dexCount(); return `Kupodex ${n.caught}/${n.of}`; };
  // maps away from here, for every Kupomon map (one search over the exits' links)
  R.kpDist = function (from) {
    const dist = { [from]: 0 }, q = [from];
    while (q.length) { const u = q.shift(); for (const e of R.mapEdges(u)) if (FF7.maps[e.to] && dist[e.to] == null && /^kp_/.test(e.to)) { dist[e.to] = dist[u] + 1; q.push(e.to); } }
    return dist;
  };
  // the team that won the leagues (kept by uid: the Kupodex work swaps members out, and they come back for coins)
  R.kpMain = null;
  const mainTeam = () => { const all = D().party.concat(D().box); return (R.kpMain || []).map(u => all.find(m => m.uid === u)).filter(Boolean); };
  R.kpRestoreTeam = function* () {
    const d = D(), main = mainTeam(); if (!main.length) return true;
    const out = d.party.filter(m => !main.includes(m)), back = main.filter(m => !d.party.includes(m));
    if (!out.length && !back.length) return true;
    return yield* O.kp_box({ leave: out, take: back });
  };
  O.kp_rematch = function* (o = {}) {
    const n = o.league || 5, L = KP.LEAGUES[n], map = 'kp_costa_arena';
    if (!FF7.state.flags['kp_league_' + n]) return 'kp_rematch: the ' + L.name + ' is not won yet';
    const tt = yield* R.kpTourneyTeam(n, { train: o.train || 'kp_summit_2' });   // (six at the team's level, whoever goes in)
    if (tt !== true) return 'kp_rematch: ' + tt;   // (the World Championship: every member +5 first, the user's rule)
    if (R.where() !== map) { const g = yield* R.gotoMap(map); if (g !== true && g !== 'mapchanged') return 'kp_rematch: ' + g; yield* R.settle(3); }
    R.choices.push({ a: L.name, pc: R.pc }, { a: "Let's go!", pc: R.pc });
    const r = yield* O.talk('registrar', { map });
    R.choices = R.choices.filter(c => c.pc !== R.pc);
    yield* R.settle(6);
    return r === true ? true : 'kp_rematch: ' + r;
  };
  // coins up to `need` (why: what for, on the Demo's line): tournament rematches with the league team. Which one: the
  // one that pays best for how often it's won (a rematch pays half its coins; each tournament's own record so far, so
  // a World Championship lost more often than not gives way to a Diamond League won most times), as a player grinds
  R._kpEarnStats = {};
  // (o.no5: never the World Championship, the coins for getting ready for it: R.kpPlusUp; one it can't enter, its team
  // not all +5, is left out for the rest of the run; R._kpHoldTeam: the team being built stays as it is)
  R.kpEarn = function* (need, why, o = {}) {
    const d = D();
    let no5 = !!o.no5;
    if (d.money >= need) return true;
    if ((d.bag.scrap_metal || 0) >= KP.SCRAP_PER_GO) { yield* R.kpScrapRun(why); if (d.money >= need) return true; }   // (the Recycler first: the scrap it carries)
    if (!FF7.state.flags.kp_league_1) return 'kp_earn: no tournament won yet to replay';
    const r0 = yield* R.kpRestoreTeam(); if (r0 !== true) return r0;
    if (yield* R.kpClause({ train: 'kp_summit_2', legends: true })) { if (R.kpMain) R.kpMain = d.party.map(m => m.uid); }   // (one of each kind, one legend at most: the cups' rules)
    yield* R.kpCoinOn();   // (the Gambler's Coin: bought once, held while the coins come in)
    const st = R._kpEarnStats, worth = (n) => { const k = st[n] || { w: 0, t: 0 }; return (k.w + 1) / (k.t + 2) * Math.floor(KP.LEAGUES[n].coins / 2); };
    for (let t = 0; t < 150 && d.money < need; t++) {
      const n = [1, 2, 3, 4, 5].filter(i => FF7.state.flags['kp_league_' + i] && !(i === 5 && no5)).sort((a, b) => worth(b) - worth(a))[0];
      if (!n) return 'kp_earn: no cup to replay';
      const m0 = d.money;
      R.kpLabel = () => `${why}: winning coins at the ${KP.LEAGUES[n].name} (${D().money} / ${need})`;
      let r;
      R.kpBlockFoes = R.kpCupFoes(n);
      try { r = yield* O.kp_rematch({ league: n }); } finally { R.kpLabel = null; }
      if (r !== true && n === 5 && /not all \+5/.test(r)) { R.note(r); no5 = true; continue; }   // (the World Championship out of reach for now: the other cups)
      if (r !== true) return r;
      const k = st[n] = st[n] || { w: 0, t: 0 }; k.t++; if (d.money > m0) k.w++;
      if (R._kpLoss && R._kpHoldTeam) R._kpLoss = null;
      if (R._kpLoss) {   // (knocked out: the box looked over against this cup's teams; a change is the team from now on)
        const sw = yield* R.kpSmartTeam({ train: 'kp_summit_2' });
        if (sw && R.kpMain) R.kpMain = d.party.map(m => m.uid);
      }
      if (d.money <= m0 && k.t % 4 === 0) yield* O.kp_equip();
      yield* O.kp_heal({ center: 'nearest' });
      R.stepStart = R.frames;
    }
    return d.money >= need ? true : 'kp_earn: ' + d.money + ' coins of ' + need;
  };

  // (while it wins coins, kp_equip leaves the Gambler's Coin where it is)
  const kpEarn0 = R.kpEarn;
  // (the coins being saved up are kept: a Mart visit on the way (the restock, a chip or a held item it would buy anyway)
  // spends only what's over them; R.kpKeep. The live Demo won 9,000 for Bahamog's egg and spent it on a Kupo Capsule)
  R.kpEarn = function* (need, why, o) {
    const was = R._kpEarning, saving = R._kpSaveFor || []; R._kpEarning = true; R._kpSaveFor = saving.concat([need]);
    try { return yield* kpEarn0(need, why, o); } finally { R._kpEarning = was; R._kpSaveFor = saving; }
  };
  R.kpKeep = () => Math.max(0, ...(R._kpSaveFor || []));
  // the Gambler's Coin for the coin rematches (Pokemon's Amulet Coin: every purse doubled): bought once there's money
  // to spare (a Mart that sells it: the later ones), given to the strongest member (its own held item back to the bag),
  // and left on: the team that wins the coins keeps it
  R.kpCoinOn = function* () {
    const d = D(), has = () => d.party.some(m => m.held === 'gamblers_coin');
    if (has()) return true;
    if (!(d.bag.gamblers_coin > 0) && d.money >= KP.ITEMS.gamblers_coin.price + 4000) {
      const r = yield* O.kp_buy({ gamblers_coin: 1 }, { center: R.kpNearestCenter() }); if (r !== true) R.note('kp_coin: ' + r);
    }
    if (!(d.bag.gamblers_coin > 0)) return true;
    const m = d.party.slice().sort((a, b) => b.lv - a.lv)[0]; if (!m) return true;
    if (m.held) yield* R.kpTake(m);
    const r = yield* R.kpGive(m, 'gamblers_coin');
    if (r === true) R.say('kupomon: ' + KP.name(m) + " holds the Gambler's Coin (every purse doubled)"); else R.note('kp_coin: ' + r);
    return true;
  };
  // ---- every item lying on (or hidden in) a Kupomon map: the nearest map with some first, its pick-ups nearest first
  R.kpItemsLeft = function () {
    const fl = FF7.state.flags, out = [];
    for (const id of Object.keys(FF7.maps)) {
      if (!/^kp_/.test(id)) continue; const m = FF7.maps[id];
      (m.items || []).forEach(it => { if (it.id && !fl['got_' + it.id]) out.push({ map: id, at: it.at, id: it.id, flag: 'got_' + it.id, name: KP.ITEMS[it.kp] ? KP.ITEMS[it.kp].name : 'coins' }); });
      (m.triggers || []).forEach(t => { if (t.kpHidden && !fl[t.kpHidden]) out.push({ map: id, at: t.at, id: t.kpHidden, flag: t.kpHidden, name: 'a hidden item', hidden: true }); });
    }
    return out;
  };
  O.kp_items = function* (o = {}) {
    const only = o.only || (() => true), left0 = () => R.kpItemsLeft().filter(only);   // (o.only: some maps only, the area sweep's)
    const tries = {}, total = left0().length, tried = { has: (f) => (tries[f] || 0) >= 3, add: (f) => { tries[f] = (tries[f] || 0) + 1; } };   // (three goes each: a repair trip can cut one short)
    const later = {};   // (an item whose spot was taken (someone standing there): its next go a while later, the others first)
    R.kpFlee = () => true;   // (an item hunt runs from the wild moogles: a cave's every floor tile is grass, and a team worn out on the way never gets there)
    try {
      const lossAt = {};   // (losses on the way to each map: a rematch, three at most)
      for (let n = 0; n < 300; n++) {
        const all = left0().filter(it => !tried.has(it.flag)); if (!all.length) break;
        const left = all.filter(it => !(later[it.flag] > R.frames));
        if (!left.length) { const t = Math.min(...all.map(it => later[it.flag])); while (R.frames < t) yield; continue; }   // (only those: a moment more)
        const dist = R.kpDist(R.where()), m = Array.from(new Set(left.map(it => it.map))).sort((a, b) => (dist[a] ?? 99) - (dist[b] ?? 99))[0];
        R.kpLabel = () => `${o.label || '100%: the items on the maps'} (${total - left0().length}/${total}), now ${mapName(m)}`;
        if (R.where() !== m) {
          const b0 = KP.blackouts, g = yield* R.gotoMap(m);
          // (lost to a trainer on the way, the walk stopped: not given up on. The loss is answered (the box, training,
          // repairs: R.kpSide), and the next round walks back past that trainer, a rematch, three losses at most a map;
          // the user saw the Demo lose to Elite Ulric and walk off to other maps)
          if (R.where() !== m && KP.blackouts !== b0 && ((lossAt[m] = (lossAt[m] || 0) + 1) < 3)) { R.say('kupomon: lost on the way to ' + mapName(m) + ': back for a rematch after the repairs'); yield* R.settle(6); continue; }
          if (R.where() !== m) { left.filter(it => it.map === m).forEach(it => { tried.add(it.flag); tried.add(it.flag); tried.add(it.flag); }); R.note('kp_items: could not reach ' + m + ': ' + g); continue; }
          yield* R.settle(3);
        }
        const fs = R.field(), p = fs && fs.player;
        const here = left.filter(it => it.map === m).sort((a, b) => p ? Math.hypot(a.at[0] - p.tx, a.at[1] - p.ty) - Math.hypot(b.at[0] - p.tx, b.at[1] - p.ty) : 0);
        for (const it of here) {
          if (R.where() !== m) break;                      // (a ledge or a door took the party off: the next round goes back)
          tried.add(it.flag);
          const r = yield* O.use(it.at[0], it.at[1], { map: m });
          yield* R.settle(3);
          if (FF7.state.flags[it.flag]) R.say('kupomon: 100%: ' + it.name + ' (' + it.id + ') on ' + m);
          else { R.note('kp_items: ' + it.id + ' on ' + m + ' at ' + it.at.slice(0, 2) + ': ' + r); later[it.flag] = R.frames + 900; }
        }
      }
    } finally { R.kpLabel = null; R.kpFlee = null; }
    if (R.kpChipUses().length) yield* O.kp_teach();
    const miss = left0();
    return miss.length ? 'kp_items: ' + miss.length + ' left (' + miss.map(it => it.id + '@' + it.map).join(', ') + ')' : true;
  };

  // ---- every Skill Chip a Mart sells (the ones lying about come with the items): the coins for all of them, then a
  // round of the Marts, nearest first
  R.kpChipsLeft = () => (KP.CHIP_PLACES || []).filter(p => p.mart && KP.ITEMS[p.chip] && !(D().bag[p.chip] > 0));
  O.kp_chips = function* () {
    const d = D(), all = (KP.CHIP_PLACES || []).filter(p => p.mart && KP.ITEMS[p.chip]);
    for (let n = 0; n < 30 && R.kpChipsLeft().length; n++) {
      const L = R.kpChipsLeft(), cost = L.reduce((a, p) => a + KP.ITEMS[p.chip].price, 0);
      if (d.money < cost) { const e = yield* R.kpEarn(cost, `100%: ${L.length} Skill Chips to buy (${cost} coins)`); if (e !== true) return e; }
      const dist = R.kpDist(R.where()), c = Array.from(new Set(L.map(p => p.mart))).sort((a, b) => (dist[a] ?? 99) - (dist[b] ?? 99))[0];
      const want = L.filter(p => p.mart === c).map(p => [p.chip, 1]);
      R.kpLabel = () => `100%: Skill Chips at ${mapName(c)} (${all.filter(p => D().bag[p.chip] > 0).length}/${all.length})`;
      try {
        if (R.where() !== c) { const g = yield* R.gotoMap(c); if (g !== true && g !== 'mapchanged') return 'kp_chips: ' + g; yield* R.settle(3); }
        R.kpShopPlan = want;
        const r = yield* O.talk('merchant', { map: c });
        if (r !== true) R.note('kp_chips: ' + c + ': ' + r);
      } finally { R.kpShopPlan = null; R.kpLabel = null; }
      if (want.some(([id]) => !(d.bag[id] > 0))) { R.note('kp_chips: not all bought at ' + c); break; }
    }
    if (R.kpChipUses().length) yield* O.kp_teach();
    const miss = R.kpChipsLeft();
    return miss.length ? 'kp_chips: ' + miss.length + ' not bought (' + miss.map(p => p.chip).join(', ') + ')' : true;
  };

  // ---- the Kupodex: (1) the wild kinds, map by map (the likeliest map first, running from kinds already had);
  // (2) the breeding-only kinds (KP.BREED: a parent of each job, Lv 10+, from the box or befriended for it);
  // (3) the kinds a moogle we have grows into: raised to the level (at the Demo's training speed: grinding levels);
  // over again until nothing is left or a whole pass brings nothing
  const PRE = () => { const o = {}; for (const k of Object.keys(KP.SPECIES)) { const e = KP.SPECIES[k].evo; if (e) o[e.to] = k; } return o; };
  const owned = () => D().party.concat(D().box);
  // the moogle we have that grows into sp soonest (an earlier stage of its line), and the level it must reach
  R.kpGrowsInto = function (sp, pre = PRE(), skip = new Set()) {
    const p1 = pre[sp]; if (!p1) return null;
    const lv = KP.SPECIES[p1].evo.at, line = [];
    for (let q = p1; q; q = pre[q]) line.push(q);
    const mon = owned().filter(m => line.includes(m.sp) && !skip.has(m) && m.lv <= lv).sort((a, b) => line.indexOf(a.sp) - line.indexOf(b.sp) || b.lv - a.lv)[0];
    return mon ? { mon, lv } : null;
  };
  // (each of a map's tables: a zone's (KP.wildTablesOf) comes with zone(fs, x, y), its tiles, for the hunt to keep to)
  R.kpWildMaps = function (want) {
    const out = [];
    for (const id of Object.keys(FF7.maps)) {
      if (!/^kp_/.test(id)) continue;
      const m = FF7.maps[id];
      for (const t of KP.wildTablesOf(m)) {
        const tab = KP.WILD[t], tot = tab.reduce((a, r) => a + r[1], 0), here = tab.filter(r => want.includes(r[0]));
        const zone = m.kpWildZones && m.kpWildZones[t] ? (fs, x, y) => KP.wildTableAt(fs.map, fs.P, x, y) === t : null;
        if (here.length) out.push({ map: id, table: t, zone, key: id + (zone ? '|' + t : ''), rows: here, sps: here.map(r => r[0]), odds: here.reduce((a, r) => a + r[1], 0) / tot, rare: Math.min(...here.map(r => r[1])) / tot, lv: Math.max(...here.map(r => r[3])) });
      }
    }
    return out;
  };
  // nuts for a hunt: plain and golden ones (the cheap way to win most over), Hefty Nuts where the team doubles the
  // wild moogles' levels, a few Royal ones for the shy kinds; the coins first if short
  R.kpNutsFor = function* (lv, why) {
    const d = D(), want = Object.assign({ kupo_nut: 12, golden_nut: 8 }, lv * 2 <= KP.MAX_LEVEL ? { hefty_nut: 6 } : { royal_nut: 4 });
    const cost = Object.keys(want).reduce((a, k) => a + KP.ITEMS[k].price * Math.max(0, want[k] - (d.bag[k] || 0)), 0);
    if (!cost) return true;
    if (d.money < cost) {
      const e = yield* R.kpEarn(cost + 15000, why);
      if (e !== true) {   // (no coins to be won yet: as many plain Kupo Nuts as the coins buy, 100 kept back; repairs are free)
        const n = Math.min(12, Math.floor((d.money - 100) / KP.ITEMS.kupo_nut.price));
        if (n <= 0) return e;
        return yield* O.kp_buy({ kupo_nut: (d.bag.kupo_nut || 0) + n }, { center: R.kpNearestCenter() });
      }
    }
    return yield* O.kp_buy(want, { center: R.kpNearestCenter() });
  };
  R.kpHunt = function* (h, label, pass = 0) {
    const want = h.sps.filter(sp => !D().dex.caught[sp]);
    if (!want.length) return true;
    const nb = yield* R.kpNutsFor(h.lv, 'Nuts for the Kupodex'); if (nb !== true) R.note('kp_dex: nuts: ' + nb);
    const r0 = yield* R.kpRestoreTeam(); if (r0 !== true) return r0;
    R.kpFlee = (mon) => !!D().dex.caught[mon.sp];
    const names = () => want.filter(sp => !D().dex.caught[sp]).map(sp => KP.SPECIES[sp].moogle + ' (' + KP.jobName({ sp }) + ')');
    R.say('kupomon: ' + dexLine() + ': hunting on ' + h.map + ' for ' + want.join(', '));
    let r;
    try {
      r = yield* O.kp_train(0, { map: h.map, zone: h.zone, until: () => want.every(sp => D().dex.caught[sp]), max: Math.min(160, Math.ceil(2.5 / h.rare) + 6) * (1 + pass), fast: true,   // (each pass hunts longer)
        label: label || (() => { const n = names(); return `${dexLine()}: looking for ${n.slice(0, 2).join(', ')}${n.length > 2 ? ' and ' + (n.length - 2) + ' more' : ''} on ${mapName(h.map)}`; }) });
    } finally { R.kpFlee = null; }
    const got = want.filter(sp => D().dex.caught[sp]);
    R.say('kupomon: ' + dexLine() + ': befriended ' + got.length + ' of ' + want.length + ' on ' + h.map + (got.length < want.length ? ' (still missing ' + want.filter(sp => !D().dex.caught[sp]).join(', ') + ')' : ''));
    return got.length ? true : 'none befriended (' + r + ')';
  };
  // a moogle of job `type` at Lv 10+ for the ranch: not one of the league team or a moogle set to be raised
  const parentOf = (type, keep) => owned().filter(m => KP.typeOf(m) === type && m.lv >= KP.MIN_BREED_LV && !keep.has(m)).sort((a, b) => a.lv - b.lv)[0];
  R.kpBreedFor = function* (pair, keep) {
    const d = D(), [ta, tb, sp] = pair, ps = [];
    for (const t of [ta, tb]) {
      let m = parentOf(t, new Set([...keep, ...ps]));
      if (!m) {   // befriended for it: a moogle of that job at Lv 10+, where they live
        const sps = KP.DEX.filter(s => (KP.SPECIES[s].type || 'freelancer') === t);
        const maps = R.kpWildMaps(sps).filter(h => h.rows.some(r => r[3] >= KP.MIN_BREED_LV)).sort((a, b) => b.odds - a.odds);
        if (!maps.length) return 'no ' + t + ' of Lv ' + KP.MIN_BREED_LV + '+ lives in the wild';
        const before = new Set(owned()), fits = (mon) => KP.typeOf(mon) === t && mon.lv >= KP.MIN_BREED_LV;
        yield* R.kpNutsFor(maps[0].lv, 'Nuts for the Kupodex');
        yield* R.kpRestoreTeam();
        R.kpWantAny = fits; R.kpFlee = (mon) => !fits(mon);
        try { yield* O.kp_train(0, { map: maps[0].map, zone: maps[0].zone, until: () => owned().some(x => !before.has(x) && fits(x)), max: 150, fast: true, label: `${dexLine()}: befriending a ${KP.TYPE_NAMES ? KP.TYPE_NAMES[t] : t} of Lv ${KP.MIN_BREED_LV}+ to breed a ${KP.SPECIES[sp].moogle}` }); }
        finally { R.kpWantAny = null; R.kpFlee = null; }
        m = owned().find(x => !before.has(x) && fits(x));
        if (!m) return 'no ' + t + ' befriended';
      }
      ps.push(m);
    }
    // the pair onto the team (the weakest of the league team wait in the box), bred
    const extra = ps.filter(m => !d.party.includes(m)).length, out = d.party.filter(m => !ps.includes(m)).sort((a, b) => a.lv - b.lv).slice(0, Math.max(0, d.party.length + extra - KP.PARTY_MAX));
    const b = yield* O.kp_box({ leave: out, take: ps.filter(m => !d.party.includes(m)) }); if (b !== true) return b;
    const had = new Set(d.party);
    R.kpLabel = `${dexLine()}: breeding a ${KP.SPECIES[sp].moogle} at the Kupo Ranch`;
    let r; try { r = yield* O.kp_breed({ pick: () => ps }); } finally { R.kpLabel = null; }
    const child = d.party.find(m => !had.has(m));
    if (r !== true || !child) return 'the breeding did not happen: ' + r;
    R.say('kupomon: bred ' + KP.monLabel(child) + ' for the Kupodex');
    return true;
  };
  // ---- a line's first stage from an egg (kp_dex (2c)): one of the line (the highest-level one, so it rarely needs raising; raised to
  // it, or befriended from the wild, when there is none) goes first at the ranch, with a partner the egg can't take
  // after: no recipe on the pair that never misses and no job pairing (KP.breedResult with no chance coming off makes
  // the line's first stage). The partner is a spare: not the league team, not one kept to grow into a missing kind,
  // not a legend, and of a line with nothing left to find (it retires to the ranch); the lowest "+" and level first
  R.kpBreedBase = function* (sp, keep) {
    const d = D(), base = KP.baseOf(sp), ofLine = (m) => KP.baseOf(m.sp) === base;
    const certain = (r) => r.chance == null || r.chance >= 1;
    const plain = (A, B) => !KP.breedMatches(A, B).some(x => x.ok && certain(x.r)) && KP.breedResult(A, B, { roll: () => 2 }).sp === base;
    const lineLeft = new Set(LEFT().map(q => KP.baseOf(q)));
    let A = owned().filter(m => ofLine(m) && !keep.has(m) && !mainTeam().includes(m)).sort((a, b) => b.lv - a.lv)[0];
    if (!A) {   // (none of the line: one befriended where its later stages live)
      const kinds = KP.DEX.filter(q => KP.SPECIES[q] && KP.baseOf(q) === base), hs = R.kpWildMaps(kinds).sort((a, b) => b.odds - a.odds);
      if (!hs.length) return 'none of the ' + base + ' line in the wild';
      const before = new Set(owned()), fits = (mon) => ofLine(mon);
      yield* R.kpNutsFor(hs[0].lv, 'Nuts for the Kupodex');
      yield* R.kpRestoreTeam();
      R.kpWantAny = fits; R.kpFlee = (mon) => !fits(mon) && !!D().dex.caught[mon.sp];
      try { yield* O.kp_train(0, { map: hs[0].map, zone: hs[0].zone, until: () => owned().some(x => !before.has(x) && fits(x)), max: Math.min(800, Math.ceil(3 / hs[0].rare) + 20), fast: true, label: `${dexLine()}: befriending a ${KP.SPECIES[kinds[kinds.length - 1]].moogle} to breed a ${KP.SPECIES[base].moogle}` }); }   // (a rare one: Rubimog, 1 in 150 on the Sunken Ruins)
      finally { R.kpWantAny = null; R.kpFlee = null; }
      A = owned().find(x => !before.has(x) && fits(x));
      if (!A) return 'none of the ' + base + ' line befriended';
    }
    if (A.lv < KP.MIN_BREED_LV) { const r = yield* R.kpRaise([{ mon: A, lv: KP.MIN_BREED_LV }]); if (r !== true) return 'raising a parent: ' + r; }
    const B = owned().filter(x => x !== A && !keep.has(x) && !mainTeam().includes(x) && x.lv >= KP.MIN_BREED_LV && !KP.isLegend(x) && !lineLeft.has(KP.baseOf(x.sp)) && plain(A, x))
      .sort((a, b) => (a.plus || 0) - (b.plus || 0) || a.lv - b.lv)[0];
    if (!B) return 'no partner the egg would not take after';
    const ps = [A, B], had = new Set(d.party.concat(d.box));
    const extra = ps.filter(x => !d.party.includes(x)).length, out = d.party.filter(x => !ps.includes(x)).sort((a, b) => a.lv - b.lv).slice(0, Math.max(0, d.party.length + extra - KP.PARTY_MAX));
    const bx = yield* O.kp_box({ leave: out, take: ps.filter(x => !d.party.includes(x)) }); if (bx !== true) return bx;
    R.kpLabel = `${dexLine()}: breeding ${KP.name(A)} for a ${KP.SPECIES[base].moogle} at the Kupo Ranch`;
    let r; try { r = yield* O.kp_breed({ pick: () => ps }); } finally { R.kpLabel = null; }
    const child = d.party.concat(d.box).find(x => !had.has(x));
    if (r !== true || !child) return 'the breeding did not happen: ' + r;
    R.say('kupomon: bred ' + KP.monLabel(child) + ' for the Kupodex' + (child.sp !== base ? ' (not the ' + KP.SPECIES[base].moogle + ' meant: a rare egg)' : ''));
    return true;
  };
  // ---- the expansion's breeding trees (KP.BREED_RECIPES, js/kupomon/kp_breed.js): a breeding-only kind is bred from
  // its recipe's two parents, each found among ours, befriended in the wild, or bred itself first (a rarer kind's
  // parent is often a rare kind); raised to the recipe's level, bred up to its "+" (each egg one "+" more than its
  // parents, two when both are Lv 42 or more), handed the item it asks for; a recipe that misses tries again (the
  // ranch's luck rises with each miss)
  const sideFits = (side, m) => !side ? false : side === m.sp ? true : side.startsWith('line:') ? KP.baseOf(side.slice(5)) === KP.baseOf(m.sp) : (KP.TYPES.includes(side) && [KP.SPECIES[m.sp].type, KP.SPECIES[m.sp].type2].includes(side));
  const recipeFor = (sp) => (KP.BREED_RECIPES || []).filter(r => r.child === sp).sort((a, b) => (b.chance == null ? 1 : b.chance) - (a.chance == null ? 1 : a.chance) || Object.keys(a.needs || {}).length - Object.keys(b.needs || {}).length)[0];
  // a wild way to a side: the kinds that fit it and live in the wild
  const wildFor = (side) => {
    const kinds = KP.DEX.filter(q => KP.SPECIES[q] && sideFits(side, { sp: q }));
    return R.kpWildMaps(kinds).sort((a, b) => b.odds - a.odds);
  };
  R.kpParent = function* (side, needs, keep, depth = 0) {
    const d = D(), lv = Math.max(KP.MIN_BREED_LV, needs.lv || 0), plus = needs.plus || 0;
    const good = (m) => sideFits(side, m) && m.lv >= lv && (m.plus || 0) >= plus && !keep.has(m);
    let m = owned().filter(good).sort((a, b) => (a.plus || 0) - (b.plus || 0) || a.lv - b.lv)[0];
    if (m) return m;
    // one of the side to work on: ours, or befriended, or (a breeding-only kind) bred first
    let c = owned().filter(x => sideFits(side, x) && !keep.has(x)).sort((a, b) => (b.plus || 0) - (a.plus || 0) || b.lv - a.lv)[0];
    if (!c) {
      const sp = !side.startsWith('line:') && KP.SPECIES[side] ? side : null;
      if (sp && recipeFor(sp) && !wildFor(side).length) {
        if (depth > 4) return 'too deep a tree for ' + sp;
        c = yield* R.kpBreedRecipe(sp, keep, depth + 1); if (typeof c === 'string') return c;
      } else {
        const hs = wildFor(sp ? 'line:' + sp : side); if (!hs.length) return 'none of ' + side + ' in the wild';
        const before = new Set(owned()), fits = (x) => sideFits(sp ? 'line:' + sp : side, x);
        yield* R.kpNutsFor(hs[0].lv, 'Nuts for the breeding'); yield* R.kpRestoreTeam();
        R.kpWantAny = fits; R.kpFlee = (x) => !fits(x);
        try { yield* O.kp_train(0, { map: hs[0].map, zone: hs[0].zone, until: () => owned().some(x => !before.has(x) && fits(x)), max: Math.min(800, Math.ceil(3 / hs[0].rare) + 20), fast: true, label: `${dexLine()}: befriending a parent for the Kupo Ranch (${side.replace('line:', '')})` }); }
        finally { R.kpWantAny = null; R.kpFlee = null; }
        c = owned().find(x => !before.has(x) && fits(x));
        if (!c) return 'no ' + side + ' befriended';
      }
    }
    keep = new Set([...keep, c]);
    // its "+": bred up a generation at a time with a partner of ours (the child is its line's first job)
    const exact = !side.startsWith('line:') && KP.SPECIES[side] && KP.SPECIES[side].evo ? KP.SPECIES[side].evo.at : null;   // (an exact stage: kept below its evolution)
    const plainEgg = (A, B) => !KP.breedMatches(A, B).some(y => y.ok) && KP.breedResult(A, B, { roll: () => 2 }).sp === KP.baseOf(A.sp);   // (no job pairing either: the egg takes after it)
    for (let g = 0; g < 6 && (c.plus || 0) < plus; g++) {
      if (c.lv < KP.MIN_BREED_LV) { const r = yield* R.kpRaise([{ mon: c, lv: KP.MIN_BREED_LV, below: exact }]); if (r !== true) return 'raising for the +: ' + r; }
      const partner = owned().filter(x => x !== c && !keep.has(x) && x.lv >= KP.MIN_BREED_LV && !mainTeam().includes(x) && plainEgg(c, x)).sort((a, b) => (b.plus || 0) - (a.plus || 0) || a.lv - b.lv)[0];
      if (!partner) return 'no partner to breed ' + KP.name(c) + ' up to +' + plus;
      const had = new Set(d.party), ps = [c, partner];
      const extra = ps.filter(x => !d.party.includes(x)).length, out = d.party.filter(x => !ps.includes(x)).sort((a, b) => a.lv - b.lv).slice(0, Math.max(0, d.party.length + extra - KP.PARTY_MAX));
      const bx = yield* O.kp_box({ leave: out, take: ps.filter(x => !d.party.includes(x)) }); if (bx !== true) return bx;
      R.kpLabel = `${dexLine()}: breeding ${KP.name(c)} up to a +${plus} at the Kupo Ranch`;
      let r; try { r = yield* O.kp_breed({ pick: () => ps }); } finally { R.kpLabel = null; }
      const child = d.party.find(x => !had.has(x)); if (r !== true || !child) return 'the breeding did not happen: ' + r;
      c = child; keep = new Set([...keep, c]);
    }
    // its level (and the stage the side asks for: a bred child is its line's first job)
    const lvTo = (from, to) => { let q = from, at = 0; for (let i = 0; i < 4 && q !== to; i++) { const e = KP.SPECIES[q].evo; if (!e) return 0; at = e.at; q = e.to; } return q === to ? at : 0; };
    const stageLv = !side.startsWith('line:') && KP.SPECIES[side] && c.sp !== side ? lvTo(c.sp, side) : 0;
    const want = Math.max(lv, stageLv);
    if (c.lv < want) { const r = yield* R.kpRaise([{ mon: c, lv: want, below: exact }]); if (r !== true) return 'raising: ' + r; }
    return good(c) || (sideFits(side, c) && c.lv >= lv && (c.plus || 0) >= plus) ? c : 'could not make a ' + side + ' parent';
  };
  R.kpBreedRecipe = function* (sp, keep, depth = 0) {
    const d = D(), r = recipeFor(sp); if (!r) return 'no recipe makes ' + sp;
    for (let tries = 0; tries < 6; tries++) {
      const A = yield* R.kpParent(r.a, r.needs || {}, keep, depth); if (typeof A === 'string') return A;
      const B = yield* R.kpParent(r.b, r.needs || {}, new Set([...keep, A]), depth); if (typeof B === 'string') return B;
      if (r.needs && r.needs.item && A.held !== r.needs.item) {
        if (!(d.bag[r.needs.item] > 0)) {
          const center = Object.keys(KP.CENTER_TIER || {}).find(c => KP.heldStock(c).includes(r.needs.item));
          if (center) { const e = yield* R.kpEarn(KP.ITEMS[r.needs.item].price + 5000, 'an item for the breeding'); if (e !== true) return e; yield* O.kp_buy({ [r.needs.item]: 1 }, { center }); }
        }
        if (!(d.bag[r.needs.item] > 0)) return 'no ' + r.needs.item + ' for the recipe';
        // (given through the menu, so on the team, and with nothing in its hands: "kp_give: nothing to do" stopped the
        // Alexamog, Phoenimog and Sirenkupo eggs, the parent in the box or holding something)
        if (!d.party.includes(A)) { const out = d.party.length >= KP.PARTY_MAX ? d.party.filter(x => x !== B).sort((a, b) => a.lv - b.lv)[0] : null; const bx = yield* O.kp_box({ leave: out ? [out] : [], take: [A] }); if (bx !== true) return bx; }
        if (A.held) { const t = yield* R.kpTake(A); if (t !== true) return t; }
        const g = yield* R.kpGive(A, r.needs.item); if (g !== true) return g;
      }
      const ps = [A, B], had = new Set(d.party);
      const extra = ps.filter(x => !d.party.includes(x)).length, out = d.party.filter(x => !ps.includes(x)).sort((a, b) => a.lv - b.lv).slice(0, Math.max(0, d.party.length + extra - KP.PARTY_MAX));
      const bx = yield* O.kp_box({ leave: out, take: ps.filter(x => !d.party.includes(x)) }); if (bx !== true) return bx;
      R.kpLabel = `${dexLine()}: breeding for a ${KP.SPECIES[sp].moogle} (${KP.BREED_TIER[r.tier] || 'breeding only'}) at the Kupo Ranch`;
      let res; try { res = yield* O.kp_breed({ pick: () => ps }); } finally { R.kpLabel = null; }
      const child = d.party.find(x => !had.has(x));
      if (res !== true || !child) return 'the breeding did not happen: ' + res;
      if (child.sp === sp) { R.say('kupomon: bred ' + KP.monLabel(child) + ' (' + (KP.BREED_TIER[r.tier] || 'breeding only') + ')'); return child; }
      R.say('kupomon: the egg was a ' + KP.SPECIES[child.sp].moogle + ', not a ' + KP.SPECIES[sp].moogle + ': again (the ranch\'s luck is up)');
    }
    return 'six eggs and no ' + sp;
  };
  // raising: up to three moogles at once beside the league team's strongest, on the Summit (switch-training: each
  // leads, steps out for a strong one, and shares the EXP), until each reaches its level
  R.kpRaise = function* (jobs) {
    const d = D(), batch = jobs.slice(0, 3), mons = batch.map(j => j.mon), keep = mainTeam().sort((a, b) => b.lv - a.lv).slice(0, KP.PARTY_MAX - batch.length);
    const b = yield* O.kp_box({ leave: d.party.filter(m => !keep.includes(m) && !mons.includes(m)), take: mons.concat(keep).filter(m => !d.party.includes(m)) });
    if (b !== true) return b;
    // (Coach Mog, once he's at the ranch: each to the top level, its jobs changed on the way and each one registered;
    // not one that must stay below its next evolution, j.below: a recipe that names that exact stage. The coach raised
    // a Saddlepom to Lv 50, it grew into a Fat Chocobo, and Kurokweh's recipe had no parent: the evolution can't be
    // stopped. That one trains on ground near its own level instead, to the level it needs and no further)
    const gentle = batch.some(j => j.below);
    if (FF7.state.flags.kp_champion && !gentle) { yield* R.kpCoachUp(mons); if (batch.every(j => j.mon.lv >= j.lv)) return true; }
    const top = Math.max(...batch.map(j => j.lv));
    return yield* O.kp_train(top, { map: gentle ? (R.kpTrainGround(top) || 'kp_summit_2') : 'kp_summit_2', until: () => batch.every(j => j.mon.lv >= j.lv || !d.party.includes(j.mon)), max: 500,
      label: () => `${dexLine()}: raising ${batch.map(j => KP.name(j.mon) + ' (Lv ' + j.mon.lv + ' → ' + j.lv + ')').join(', ')} to evolve` });
  };
  O.kp_dex = function* () {
    const d = D();
    if (!R.kpMain) R.kpMain = d.party.map(m => m.uid);
    const pre = PRE(), legend = (sp) => (KP.SPECIES[sp].rate || 120) <= 5, tried = {};
    for (let pass = 0; pass < 12 && LEFT().length; pass++) {
      const n0 = LEFT().length;
      // (1) the wild kinds (not those a moogle we have will grow into: raising is surer), the likeliest map first
      for (let k = 0; k < 120; k++) {
        const want = LEFT().filter(sp => !legend(sp) && !R.kpGrowsInto(sp, pre));
        const dist = R.kpDist(R.where()), worth = (h) => h.sps.length * h.odds / (1 + (dist[h.map] ?? 20) / 8);
        const hs = R.kpWildMaps(want).filter(h => (tried[h.key] || 0) <= pass).sort((a, b) => worth(b) - worth(a));
        if (!hs.length) break;
        tried[hs[0].key] = (tried[hs[0].key] || 0) + 1;   // (a map's zone counted apart from the rest of it)
        const r = yield* R.kpHunt(hs[0], null, pass); if (r !== true) R.note('kp_dex: ' + hs[0].map + ': ' + r);
      }
      // (1b) the kinds had only by growing up, with none of their line left to raise (a parent gone to the ranch): a
      // young one of the line befriended for it (raised in (3))
      const breedOnly = new Set(); KP.BREED.forEach(([, , sp]) => { for (let q = sp; q; q = (KP.SPECIES[q].evo || {}).to) breedOnly.add(q); });
      for (const sp of LEFT()) {
        if (legend(sp) || breedOnly.has(sp) || R.kpGrowsInto(sp, pre) || R.kpWildMaps([sp]).length || !pre[sp]) continue;
        const line = []; for (let q = pre[sp]; q; q = pre[q]) line.push(q);
        const lv = KP.SPECIES[pre[sp]].evo.at, fits = (mon) => line.includes(mon.sp) && mon.lv <= lv;
        const h = R.kpWildMaps(line).filter(x => x.rows.some(r => r[2] <= lv)).sort((x, y) => y.odds - x.odds)[0];
        if (!h) { R.note('kp_dex: no young ' + line.join(' / ') + ' in the wild to raise into ' + sp); continue; }
        const before = new Set(owned());
        yield* R.kpNutsFor(h.lv, 'Nuts for the Kupodex');
        yield* R.kpRestoreTeam();
        R.kpWantAny = (mon) => fits(mon) || !D().dex.caught[mon.sp]; R.kpFlee = (mon) => !R.kpWantAny(mon);
        try { yield* O.kp_train(0, { map: h.map, zone: h.zone, until: () => owned().some(m => !before.has(m) && fits(m)), max: 120, fast: true,
          label: `${dexLine()}: befriending a young ${KP.SPECIES[line[0]].moogle} to raise into a ${KP.SPECIES[sp].moogle} (${KP.jobName({ sp })})` }); }
        finally { R.kpWantAny = null; R.kpFlee = null; }
        if (!owned().some(m => !before.has(m) && fits(m))) R.note('kp_dex: no young ' + line[0] + ' befriended on ' + h.map);
      }
      // (2) the breeding-only kinds whose line we have none of
      for (const pair of KP.BREED) {
        const sp = pair[2], line = []; for (let q = sp; q; q = (KP.SPECIES[q].evo || {}).to) line.push(q);
        if (line.every(q => d.dex.caught[q]) || owned().some(m => line.includes(m.sp))) continue;
        const keep = new Set(mainTeam()); LEFT().forEach(q => { const g = R.kpGrowsInto(q, pre); if (g) keep.add(g.mon); });
        const r = yield* R.kpBreedFor(pair, keep); if (r !== true) R.note('kp_dex: breeding ' + sp + ': ' + r);
        yield* R.kpRestoreTeam();
      }
      // (2b) the expansion's breeding trees: each breeding-only kind still missing, from its recipe (R.kpBreedRecipe)
      const only = KP.breedOnly ? KP.breedOnly() : new Map();
      for (const sp of LEFT().filter(q => only.has(q) && recipeFor(q))) {
        if (owned().some(m => m.sp === sp)) continue;
        const keep = new Set(mainTeam()); LEFT().forEach(q => { const g = R.kpGrowsInto(q, pre); if (g) keep.add(g.mon); });
        const r = yield* R.kpBreedRecipe(sp, keep); if (typeof r === 'string') R.note('kp_dex: breeding ' + sp + ': ' + r);
        yield* R.kpRestoreTeam();
      }
      // (2c) a line's first stage that only an egg gives (the wild has its later ones only: Ratpom Ninja on Ravenmoor,
      // no Ratpom Thief anywhere): one of the line goes first at the ranch and the egg takes after it (R.kpBreedBase);
      // its later stages then come of raising it, in (3). tools/kp_dexcheck.js found 198 kinds had this way, and the
      // Demo stopped on 249 missing for want of it (2026-10-03)
      // (a later stage too, when none of its line is left to raise into it: Plushmog Fortune Teller, its Plushie gone
      // to the ranch as a parent; the first stage bred again, then raised)
      for (const sp of LEFT().filter(q => !legend(q) && !only.has(q) && !only.has(KP.baseOf(q)) && !R.kpWildMaps([q]).length && !R.kpGrowsInto(q, pre))) {
        if (owned().some(m => m.sp === sp)) continue;
        const keep = new Set(mainTeam()); LEFT().forEach(q => { const g = R.kpGrowsInto(q, pre); if (g) keep.add(g.mon); });
        const r = yield* R.kpBreedBase(sp, keep); if (r !== true) R.note('kp_dex: breeding ' + sp + ': ' + r);
        yield* R.kpRestoreTeam();
      }
      // (3) the evolutions, three moogles at a time
      for (let k = 0; k < 40; k++) {
        const jobs = [];   // (one moogle may grow into several missing kinds: raised to the furthest)
        for (const sp of LEFT()) { const g = R.kpGrowsInto(sp, pre); if (!g) continue; const j = jobs.find(x => x.mon === g.mon); if (j) j.lv = Math.max(j.lv, g.lv); else jobs.push(g); }
        if (!jobs.length) break;
        jobs.sort((a, b) => (a.lv - a.mon.lv) - (b.lv - b.mon.lv));
        const before = LEFT().length;
        const r = yield* R.kpRaise(jobs); if (r !== true) R.note('kp_dex: raising: ' + r);
        if (LEFT().length >= before) break;
      }
      yield* R.kpRestoreTeam();
      R.say('kupomon: ' + dexLine() + ' after pass ' + (pass + 1));
      if (LEFT().length >= n0 && pass >= 2) break;            // (nothing more came of a whole pass)
    }
    yield* R.kpRestoreTeam();
    const miss = LEFT().filter(sp => !legend(sp));
    return miss.length ? 'kp_dex: ' + miss.length + ' kinds missing (' + miss.join(', ') + ')' : true;
  };

  // ================================================================== the area sweep (the user, 2026-10-04: "it should
  // collect all of the items in an area, battle all trainers in the area and catch all moogle in the area before moving
  // on to the next area. If it is unable to do this for whatever reason, then it'll return back to the area after it is
  // able do so"; "If it fails to do some tasks then it will save them for later"). An area is a map's `area` (a town
  // with its houses and Mog Center, a route with its huts, a cave's floors, the S.S. Moogle's decks). The first free
  // moment in an area with something left to do, it does it all as a side task, in this order: every item lying or
  // hidden on its maps (the houses too) and every one-time gift from its people (some are nuts and coins), then every
  // trainer not yet beaten (repairs between, prize money), then every wild kind in its tall grass and zones not yet
  // befriended (none in Hard Mode: one an area). What it can't do (a loss, a door still shut, no nuts and no coins) is
  // saved: the area waits with what it had (R._kpAreaSig) and is gone back to when that changes (a badge, five levels,
  // the Championship, nuts or coins again), from wherever the Demo is. ['kp_sweep_all'] at the end of the route does
  // every area left. Dojo masters and the Elite Four are beaten by their own steps (their flags are the badges and the
  // League), never here
  const areaOf = (id) => (FF7.maps[id] || {}).area || id;
  const areaMaps = (a) => Object.keys(FF7.maps).filter(id => /^kp_/.test(id) && areaOf(id) === a);
  // the trainers of these maps not yet beaten (a W.trainer: kp_tr_<id>; Team Hojo's grunts too)
  R.kpTrainersLeft = (maps) => {
    const set = new Set(maps), fl = FF7.state.flags, out = [];
    for (const id of set) for (const n of FF7.maps[id].npcs || []) {
      const t = KP.TRAINER_DEFS && KP.TRAINER_DEFS[n.id];
      if (t && (t.kind === 'trainer' || t.kind === 'grunt') && !fl['kp_tr_' + n.id]) out.push({ map: id, id: n.id, name: (t.cls ? t.cls + ' ' : '') + t.name });
    }
    return out;
  };
  // the one-time gifts of these maps' people not had yet: a talk that gives an item and sets a flag, none of its flags
  // set (never one that sells: a seller's talk spends coins, KP.legendItemShop and the Marts)
  R.kpGiftsLeft = (maps) => {
    const fl = FF7.state.flags, out = [];
    for (const id of maps) for (const n of [].concat(FF7.maps[id].npcs || [], FF7.maps[id].objects || [])) {
      if (!n.talk || !n.id || (KP.TRAINER_DEFS && KP.TRAINER_DEFS[n.id])) continue;
      const src = String(n.talk);
      if (!/KP\.give\(|s\.give\(/.test(src) || /legendItemShop|money\s*-=|kp_buy|KP\.Shop|mognetSwap|ranchRelease/.test(src)) continue;
      const sets = [...src.matchAll(/s\.set\('([a-z0-9_]+)'\)/g)].map(x => x[1]);
      if (sets.length && sets.every(f => !fl[f])) out.push({ map: id, id: n.id, flags: sets });
    }
    return out;
  };
  // the wild kinds of these maps not yet befriended (each table: a zone's too), the legends aside
  R.kpWildLeft = (maps) => {
    const set = new Set(maps), d = D();
    const kinds = KP.DEX.filter(sp => KP.SPECIES[sp] && !d.dex.caught[sp] && (KP.SPECIES[sp].rate || 120) > 5);
    return R.kpWildMaps(kinds).filter(h => set.has(h.map));
  };
  R.kpAreaOpen = (a) => {
    const maps = areaMaps(a), mset = new Set(maps), hard = KP.hard && KP.hard();
    return { items: R.kpItemsLeft().filter(it => mset.has(it.map)).length, gifts: R.kpGiftsLeft(maps).length, trainers: R.kpTrainersLeft(maps).length, wild: hard ? 0 : R.kpWildLeft(maps).length };
  };
  const openCount = (o) => o.items + o.gifts + o.trainers + o.wild;
  // what the Demo has to go on: badges, its top level by fives, the Championship, nuts or coins to buy them
  R.kpSweepSig = () => {
    const d = D(), top = d.party.length ? Math.max(...d.party.map(m => m.lv)) : 0, nuts = NUTS().reduce((a, k) => a + (d.bag[k] || 0), 0);
    return [d.badges.length, Math.floor(top / 5), FF7.state.flags.kp_champion ? 1 : 0, nuts >= 5 || d.money >= 1000 ? 1 : 0].join('.');   // (1,000: five Kupo Nuts)
  };
  R._kpAreaSig = {}; R._kpAreaTries = {};
  const sweepOn = () => !!(R.opts && (R.opts.mode === 'demo' || R.opts.sweep) && inKP() && FF7.state.flags.kp_starter && D().party.length
    && !R._kpSweeping && !R._kpHoldTeam && !R._kpSustain && !R._flying && !R.kpNoSweep && !(KP.healLocked && KP.healLocked())
    && !(R.plan && R.plan[R.pc] && ['kp_start', 'kp_starter', 'kp_heal', 'kp_hard_end', 'kp_sweep_all'].includes(R.plan[R.pc][0])));
  // due: something left to do there, and not already tried with what the Demo has now (o.final: the end's sweep: any)
  R.kpSweepDue = (a, o = {}) => { if (!o.final && (R._kpAreaSig[a] === R.kpSweepSig() || (R._kpAreaTries[a] || 0) >= 8)) return false; return openCount(R.kpAreaOpen(a)) > 0; };
  const sweepWorn = () => D().party.some(m => m.hp <= 0) || D().party.reduce((s2, m) => s2 + m.hp / KP.maxHp(m), 0) / Math.max(1, D().party.length) < 0.6;
  R.kpSweep = function* (a, o = {}) {
    const maps = areaMaps(a), mset = new Set(maps), d = D();
    R._kpSweeping = true; R._kpAreaSig[a] = R.kpSweepSig(); R._kpAreaTries[a] = (R._kpAreaTries[a] || 0) + 1;
    const open0 = R.kpAreaOpen(a);
    R.say('kupomon: the area sweep: ' + a + ' (' + open0.items + ' items, ' + open0.gifts + ' gifts, ' + open0.trainers + ' trainers, ' + open0.wild + ' wild tables)');
    const tick = () => { R.stepStart = R.frames; };
    let lost = false;
    try {
      // 1. the items (the houses too) and the gifts
      if (open0.items) { tick(); const r = yield* O.kp_items({ only: it => mset.has(it.map), label: `${a}: the items` }); if (r !== true) R.note('kp_sweep ' + a + ': ' + r); }
      for (const g of R.kpGiftsLeft(maps)) {
        tick();
        if (R.where() !== g.map) { const w = yield* R.gotoMap(g.map); if (w !== true && w !== 'mapchanged') { R.note('kp_sweep ' + a + ': no way to ' + g.map + ': ' + w); continue; } yield* R.settle(3); }
        const fs = R.field(), act = fs && fs.actors[g.id]; if (!act || act.visible === false) continue;   // (not here now: later)
        R.kpLabel = `${a}: a word with someone`;
        try { yield* O.talk(g.id, { map: g.map }); } finally { R.kpLabel = null; }
        if (g.flags.some(f => FF7.state.flags[f])) R.say('kupomon: the area sweep: a gift from ' + g.id + ' (' + g.map + ')');
      }
      // 2. the trainers: repaired before each; a loss ends it here (the loss is looked into after: the box, training)
      for (const t of R.kpTrainersLeft(maps)) {
        tick();
        if (sweepWorn()) yield* O.kp_heal({ center: 'nearest' });
        if (R.where() !== t.map) { const w = yield* R.gotoMap(t.map); if (w !== true && w !== 'mapchanged') { R.note('kp_sweep ' + a + ': no way to ' + t.map + ': ' + w); continue; } yield* R.settle(3); }
        const fs = R.field(), act = fs && fs.actors[t.id]; if (!act || act.visible === false) continue;
        const b0 = KP.blackouts, n0 = R.kpBattles;
        R.kpLabel = `${a}: a battle with ${t.name}`;
        try { yield* O.talk(t.id, { map: t.map }); } finally { R.kpLabel = null; }
        yield* R.settle(6);
        if (FF7.state.flags['kp_tr_' + t.id]) R.say('kupomon: the area sweep: beat ' + t.name);
        if (KP.blackouts !== b0 || R._kpLoss) { lost = true; R.say('kupomon: the area sweep: lost to ' + t.name + ' (' + a + ' saved for later)'); break; }
        if (R.kpBattles === n0 && !FF7.state.flags['kp_tr_' + t.id]) R.note('kp_sweep ' + a + ': no battle with ' + t.id);
      }
      // 3. the wild moogles (none in Hard Mode): each table, likeliest first; no nuts and none to buy: saved for later
      if (!lost && !(KP.hard && KP.hard())) {
        for (const h of R.kpWildLeft(maps).sort((x, y) => y.odds - x.odds)) {
          tick();
          if (sweepWorn()) yield* O.kp_heal({ center: 'nearest' });
          yield* R.kpNutsFor(h.lv, `${a}: nuts for its moogles`);
          if (!NUTS().some(k => KP.ITEMS[k].nut < 255 && (d.bag[k] || 0) > 0)) { R.say('kupomon: the area sweep: no nuts and no coins for ' + a + "'s moogles (saved for later)"); break; }
          const r = yield* R.kpHunt(h, `${a}: befriending its moogles (${dexLine()})`, 0);
          if (r !== true) R.note('kp_sweep ' + a + ': ' + h.map + ': ' + r);
          if (KP.blackouts && R._kpLoss) break;
        }
      }
    } finally { R._kpSweeping = false; R.kpLabel = null; }
    const open1 = R.kpAreaOpen(a), left = openCount(open1);
    if (!left) { delete R._kpAreaSig[a]; R.say('kupomon: the area sweep: ' + a + ' done'); }
    else { R._kpAreaSig[a] = R.kpSweepSig(); R.say('kupomon: the area sweep: ' + a + ' saved for later (' + open1.items + ' items, ' + open1.gifts + ' gifts, ' + open1.trainers + ' trainers, ' + open1.wild + ' wild tables)'); }
    tick();
    return !left;
  };
  // the side task: the area it's in first; else one saved for later that the Demo can now take on (nearest first)
  R.kpSweepNext = function () {
    if (!sweepOn()) return null;
    const here = R.where(); if (!here || !/^kp_/.test(here)) return null;
    const a = areaOf(here);
    if (R.kpSweepDue(a)) return a;
    const sig = R.kpSweepSig(), dist = R.kpDist ? R.kpDist(here) : {};
    const back = Object.keys(R._kpAreaSig).filter(x => x !== a && R._kpAreaSig[x] !== sig && (R._kpAreaTries[x] || 0) < 8 && R.kpSweepDue(x))
      .map(x => ({ x, n: Math.min(...areaMaps(x).map(id => dist[id] ?? 99)) })).filter(e => e.n < 99).sort((p1, p2) => p1.n - p2.n)[0];
    return back ? back.x : null;
  };
  // the route's end: every area left, as often as a round still does something (whatever the Demo has)
  O.kp_sweep_all = function* () {
    for (let round = 0; round < 4; round++) {
      const here = R.where(), dist = R.kpDist ? R.kpDist(here) : {};
      const areas = [...new Set(Object.keys(FF7.maps).filter(id => /^kp_/.test(id)).map(areaOf))].filter(a => R.kpSweepDue(a, { final: true }))
        .sort((x, y) => Math.min(...areaMaps(x).map(id => dist[id] ?? 99)) - Math.min(...areaMaps(y).map(id => dist[id] ?? 99)));
      if (!areas.length) return true;
      const before = areas.reduce((n, a) => n + openCount(R.kpAreaOpen(a)), 0);
      for (const a of areas) { R.kpNoSweep = false; yield* R.kpSweep(a, { final: true }); if (R._kpLoss) { yield* R.kpSmartTeam({ foes: (R._kpLoss || {}).foes }); yield* O.kp_heal({ center: 'nearest' }); } }
      const after = areas.reduce((n, a) => n + openCount(R.kpAreaOpen(a)), 0);
      if (after >= before) break;
    }
    const left = [...new Set(Object.keys(FF7.maps).filter(id => /^kp_/.test(id)).map(areaOf))].filter(a => openCount(R.kpAreaOpen(a)) > 0);
    if (left.length) R.note('kp_sweep_all: left in ' + left.join(', '));
    return true;
  };

  // ------------------------------------------------------------------ the runner, inside Kupomon: no FF7 saves, menus or
  // Limit trips; the activity line and battle count are Kupomon's
  const sideTasks0 = R.sideTasks;
  R.sideTasks = function () { if (inKP()) return R.kpSide(); return sideTasks0.apply(this, arguments); };
  const autoSave0 = R.autoSave;
  R.autoSave = function () { if (inKP()) return; return autoSave0.apply(this, arguments); };
  // grinding plays at the Demo's 32x (the user's rule): levels, and (the user, 2026-10-02) a hunt in the grass for a
  // moogle to befriend; breeding, the coach and the rest play at the chosen speed, their line still shown
  R.fastForward = function () {
    if (!inKP()) return !!(R.activity && R.activity());
    const s = R.plan && R.plan[R.pc], op = s && (Array.isArray(s) ? s[0] : s);
    return R.kpTraining ? !!(R.kpTrainInfo && R.kpTrainInfo.fast) : op === 'kp_train';
  };
  const activity0 = R.activity;
  R.activity = function () {
    if (inKP()) {
      const s = R.plan && R.plan[R.pc], op = s && (Array.isArray(s) ? s[0] : s);
      // any training (a plan step, a boss retry, a bred child raised, a partner hunted): its line, and the Demo's 32x
      const T = R.kpTraining && R.kpTrainInfo;
      if (T || op === 'kp_train') {
        if (T && T.label) return typeof T.label === 'function' ? T.label() : T.label;
        const P = D().party, lv = (P.reduce((a, m) => a + m.lv, 0) / Math.max(1, P.length)).toFixed(1);
        return `Training: team Lv ${lv} → ${T ? T.level : s[1]}`;
      }
      if (R.kpLabel) return typeof R.kpLabel === 'function' ? R.kpLabel() : R.kpLabel;   // (the 100%'s errands: coins, items, chips)
      return '';
    }
    return activity0.apply(this, arguments);
  };
  // every trainer battle lost (not a watched bout) is followed by a look over the box (the user's rule: R.kpSmartTeam).
  // The ops that know the fight do it themselves with what they know (kp_win: the block's teams and its training
  // ground; kp_league and the coin rematches: the cup's teams); any other loss (a route trainer walked into) gets it as
  // a side task (R.kpSide), against that trainer's team
  R._kpLoss = null; R._kpOwnLoss = 0;
  const finish0 = KP.Battle.prototype.finish;
  KP.Battle.prototype.finish = function* (result) {
    if (R.active && result === 'lose' && this.o.kind === 'trainer' && !this.o.spectate) R._kpLoss = { who: (this.o.trainer && this.o.trainer.name) || 'a trainer', foes: R.kpLastFoes || [], map: R.where() };
    return yield* finish0.apply(this, arguments);
  };
  const ownsLosses = (f) => function* () {
    const prev = R.kpBlockFoes; R._kpOwnLoss++;
    try { return yield* f.apply(this, arguments); } finally { R._kpOwnLoss--; R.kpBlockFoes = prev; }
  };
  { const kpWin0 = O.kp_win;   // (a gauntlet's fight: staying power counts for all of it, R._kpSustain)
    O.kp_win = function* (inner, flag, o = {}) {
      if (!o || !o.gauntlet) return yield* kpWin0.call(this, inner, flag, o);
      const was = R._kpSustain; R._kpSustain = true;
      try { return yield* kpWin0.call(this, inner, flag, o); } finally { R._kpSustain = was; }
    }; }
  O.kp_win = ownsLosses(O.kp_win); O.kp_league = ownsLosses(O.kp_league); R.kpEarn = ownsLosses(R.kpEarn);
  // inside a fight that handles its losses (kp_win, the cups), a walk stops at a blackout: the route planner would
  // otherwise set off again from the Mog Center towards whoever just won, and the fight would never hear it lost
  // ('stopped': kp_win sees the blackout and does its repairs, the box, training and breeding)
  const gotoMap0 = R.gotoMap;
  R.gotoMap = function* (target, o = {}) {
    if (inKP() && !R.side) R._kpTripPc = R.pc;   // (the step has set off somewhere: R.kpSide holds the Recycler trip back)
    if (!inKP() || !R._kpOwnLoss) return yield* gotoMap0.call(this, target, o);
    const b0 = KP.blackouts, stop0 = o.stop;
    return yield* gotoMap0.call(this, target, Object.assign({}, o, { stop: () => KP.blackouts !== b0 || !!(stop0 && stop0()) }));
  };
  // an errand that a side trip broke into (a talk or a use with o.map: the repairs in a town walked the team into the Mog
  // Center on the way): back to the errand's map and again, twice at most
  for (const k of ['talk', 'use']) {
    const op0 = O[k];
    O[k] = function* (...args) {
      const o = args[args.length - 1];
      if (!inKP() || !o || typeof o !== 'object' || !o.map) return yield* op0.apply(this, args);
      let r;
      for (let n = 0; n < 3; n++) {
        const b0 = KP.blackouts;
        r = yield* op0.apply(this, args);
        if (r === true || R.where() === o.map) return r;
        // (a loss, the team carried off to a Mog Center: not a side trip. The caller answers it (kp_win: the box looked
        // over, training, then the rematch); going straight back skipped all that: the user saw the Demo lose to Elite
        // Ulric twice without ever looking in the box)
        if (KP.blackouts !== b0) return r;
        if (/too many hops|no way from|not back on the field/.test(String(r))) return r;   // (the walk there failed: not a side trip, nothing to go back for)
        R.say('kupomon: ' + k + ' ' + args[0] + ': a side trip took the team off ' + o.map + ' (' + R.where() + '): back there and again');
      }
      return r;
    };
  }
  // the teams met in each tournament (every try), for scoring the box after a loss there
  R._kpCupFoes = {};
  R.kpCupFoes = (n) => R._kpCupFoes[n] || (R._kpCupFoes[n] = new Map());
  R.kpBattles = 0;
  const battle0 = KP.battle;
  KP.battle = function (o) {
    if (R.active) {
      R.kpBattles++; R.say('kupomon battle: ' + (o.kind === 'wild' ? 'wild ' + (o.foes[0] && o.foes[0].sp) : (o.trainer && o.trainer.name)));
      const legend = o.kind === 'wild' && o.foes[0] && (KP.sp(o.foes[0]).rate || 120) <= 5;
      if ((o.kind === 'trainer' && !o.spectate) || legend) {
        R.kpLastFoes = (o.foes || []).map(m => ({ sp: m.sp, lv: m.lv, moves: m.moves.slice(), plus: m.plus, abil: m.abil, held: m.held }));
        if (R.kpBlockFoes) R.kpBlockFoes.set((o.trainer && o.trainer.name) || 'wild', R.kpLastFoes);   // (the whole gauntlet: kp_win)
      }
    }
    return battle0.apply(this, arguments);
  };

  // the Kupomon Demo: from the Kupomon title (a new game, not saved), or Esc inside Kupomon (it carries on from
  // where the game stands)
  KP.demo = function (f) {
    if (!R.demo) return false;
    demoSavedAt = Date.now(); demoDue = null;   // (the first save: the first checkpoint, or three minutes in)
    return R.demo.start({ resume: inKP(), runner: Object.assign({ chapters: ['kp'] }, f ? { at: f.at, atSteps: f.steps } : {}) });
  };
  // the Demo file (KP.saveDemo, js/kupomon/kp_core.js): a Demo started from the Kupomon title saves there the way a
  // player saves, on screen (MogBoy menu > Save > Demo File: R.kpVisibleSave), at each checkpoint and every three
  // minutes between them, with the field free (never mid-scene); the Demo's step goes with it.
  // (Esc in a player's own game turns the Demo on there, and that game is never written to the Demo file)
  const DEMO_EVERY = 180000;
  let demoSavedAt = Date.now(), demoDue = null;
  const demoOn = () => !!(KP._demoRun && R.active && R.opts && R.opts.mode === 'demo' && inKP() && KP.saveDemo);
  // the write itself (the menu's Demo File row calls it): the step too while the Demo plays (none once a player took
  // over: Continue Demo then finds its place on the route)
  KP.saveDemoNow = function () {
    const on = demoOn() && R.plan;
    if (!KP.saveDemo(on ? R.pc : null, on ? R.plan.length : null)) return false;
    demoSavedAt = Date.now(); demoDue = null; R._kpDemoSaves = (R._kpDemoSaves || 0) + 1;
    return true;
  };
  const checkpoint0 = R.checkpoint;
  R.checkpoint = function (label) { const r = checkpoint0.apply(this, arguments); if (demoOn()) demoDue = 'checkpoint ' + label; return r; };
  // the route's end (or any stop) saves the Demo file first: the last checkpoint is the last step, and the runner
  // stopped before its save came due (the 100% run ended at step 242 with the file still at step 238, no Kupofried)
  const finishKP = R.finish;
  R.finish = function (status) {
    if (demoOn() && (demoDue || status === 'done')) { try { KP.saveDemoNow(); } catch (e) { console.error('the Demo file', e); } }
    return finishKP.apply(this, arguments);
  };
  // a save due now? (the field free, nothing else going on, the menu allowed)
  const demoSaveDue = () => {
    if (R.side || !demoOn() || FF7.state.menuEnabled === false || !R.fieldFree || !R.field() || !R.fieldFree(R.field())) return null;
    return demoDue || (Date.now() - demoSavedAt >= DEMO_EVERY ? 'every three minutes' : null);
  };
})();
