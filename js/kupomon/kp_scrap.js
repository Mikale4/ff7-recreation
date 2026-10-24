// Scrap Metal and the Shinra Recycler (the user's design, 2026-10-02: "the demo is always out of money").
//  * every wild moogle that powers down drops a few pieces of Scrap Metal (more for a bigger one, more again for the
//    metal-clad jobs: a Machinist, a Knight): kp_battle.js finish, KP.scrapDrop
//  * the Shinra Scrap Metal Recycling Machine stands in Team Hojo's dig site at the far mouth of the Mt. Kupo Caves
//    (kp_region2.js: Admin Scarlet means to feed the player's moogles to it; beaten, her two grunts can't lift it and
//    she makes them leave it behind). Fed 5 Scrap Metal a go, it rattles and coughs something out (KP.RECYCLE_ODDS):
//    coins (the most often, more with each badge), a Kupo Nut, a held item, a Skill Chip, and now and then (the rarest)
//    a Machinist or Knight moogle (the user: no legendaries or mythicals), at about the team's level
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {};
  const D = () => FF7.state.kp;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const weighted = (rows) => { const t = rows.reduce((a, r) => a + r[1], 0); let x = Math.random() * t; for (const r of rows) { x -= r[1]; if (x <= 0) return r[0]; } return rows[rows.length - 1][0]; };

  KP.ITEMS.scrap_metal = { name: 'Scrap Metal', kind: 'key', price: 0, stack: true,
    desc: 'Bent plates, bolts and gears that a wild moogle dropped. The Shinra Recycler in the Mt. Kupo Caves turns 5 of them into something useful.' };
  KP.SCRAP_PER_GO = 5;

  // how much scrap a wild moogle drops: 1-3, one more for every 15 levels, more for the armoured jobs
  KP.scrapDrop = function (mon) {
    if (!mon) return 0;
    const sp = KP.sp(mon), types = [sp.type, sp.type2];
    let n = 1 + Math.floor(Math.random() * 3) + Math.floor((mon.lv || 1) / 15);
    if (types.includes('machinist')) n += 2; else if (types.includes('knight')) n += 1;
    return n;
  };

  // what a go gives: weights out of 100 (coins the most often, a Machinist moogle the rarest)
  KP.RECYCLE_ODDS = [['coins', 52], ['nut', 22], ['held', 12], ['chip', 12], ['moogle', 2]];
  const NUTS = () => Object.keys(KP.ITEMS).filter(k => KP.ITEMS[k].kind === 'nut' && KP.ITEMS[k].price > 0);
  const HELD = () => Object.keys(KP.ITEMS).filter(k => KP.ITEMS[k].kind === 'held' && KP.ITEMS[k].price > 0 && !KP.ITEMS[k].forSpecies);
  const CHIPS = () => Object.keys(KP.ITEMS).filter(k => KP.ITEMS[k].kind === 'chip' && KP.MOVES[KP.ITEMS[k].move]);
  // the kinds it can build: the metal-clad jobs, Machinist and Knight (the user's rule, 2026-10-02), their first jobs (no
  // legendaries, no mythicals, no breed-only kinds), grown to the level
  KP.RECYCLE_TYPES = ['machinist', 'knight'];
  const ARMOURED = () => {
    const only = KP.breedOnly ? KP.breedOnly() : new Map(), pre = new Set();
    for (const s of Object.values(KP.SPECIES)) if (s.evo && s.evo.to) pre.add(s.evo.to);
    return Object.keys(KP.SPECIES).filter(id => { const s = KP.SPECIES[id];
      return (KP.RECYCLE_TYPES.includes(s.type) || KP.RECYCLE_TYPES.includes(s.type2)) && !pre.has(id) && (s.rate || 120) > 5 && s.class !== 'mythical' && s.class !== 'legend' && !only.has(id) && KP.DEX.includes(id); });
  };
  KP.recycleOnce = function () {
    const d = D(), badges = (d.badges || []).length;
    let kind = weighted(KP.RECYCLE_ODDS);
    if (kind === 'moogle' && KP.storageFull && KP.storageFull(d)) kind = 'coins';   // (the team and all 50 Mog Boxes full: no room for one)
    if (kind === 'coins') {
      const n = Math.round((120 + Math.random() * 380) * (1 + 0.35 * badges) / 10) * 10;
      d.money += n; return { kind, n, text: `${n.toLocaleString()} coins` };
    }
    if (kind === 'nut') {   // (the cheaper nuts more often)
      const id = weighted(NUTS().map(k => [k, 1 / Math.max(10, KP.ITEMS[k].price)]));
      const n = KP.ITEMS[id].price <= 100 ? 2 + Math.floor(Math.random() * 3) : 1;
      KP.give(id, n); return { kind, id, n, text: `${n > 1 ? n + ' ' : 'a '}${KP.ITEMS[id].name}${n > 1 && !/s$/.test(KP.ITEMS[id].name) ? 's' : ''}` };
    }
    if (kind === 'held') { const id = pick(HELD()); KP.give(id, 1); return { kind, id, n: 1, text: `a ${KP.ITEMS[id].name}` }; }
    if (kind === 'chip') {   // (one the player doesn't have yet, while there are any)
      const all = CHIPS(), fresh = all.filter(k => !(d.bag[k] > 0)), id = pick(fresh.length ? fresh : all);
      KP.give(id, 1); return { kind, id, n: 1, text: KP.ITEMS[id].name };
    }
    // a Machinist or Knight moogle, at a few levels under the team's best (a gift: Hard Mode's one-per-area doesn't count it)
    const top = Math.max(5, ...d.party.map(m => m.lv)), cap = KP.levelCap ? KP.levelCap() : KP.MAX_LEVEL;
    const lv = Math.max(5, Math.min(cap, top - 3)), grow = (b) => KP.W && KP.W.lineAt ? KP.W.lineAt(b, lv) : b;
    // (the stage it has grown to must still be a Machinist or a Knight, and no legend: a line that changes jobs away
    // from metal is passed over at this level)
    const ok = (id) => { const s = KP.SPECIES[id]; return (KP.RECYCLE_TYPES.includes(s.type) || KP.RECYCLE_TYPES.includes(s.type2)) && (s.rate || 120) > 5 && s.class !== 'mythical' && s.class !== 'legend'; };
    const fits = ARMOURED().map(grow).filter(ok), sp = fits.length ? pick(fits) : pick(ARMOURED());
    const mon = KP.make(sp, lv); const where = KP.receive(mon);
    return { kind, mon, where, text: `${KP.SPECIES[sp].moogle} the ${(KP.JOBS[KP.SPECIES[sp].job] || {}).name || 'Machinist'}` };   // (a Machinist or a Knight)
  };

  // a big feed's haul in the message box (the user, 2026-10-02): the repeats grouped ("Kupo Nut ×12"), the coins first, then
  // the bag's pocket order; whole entries to a page (the box shows 4 lines), a page more for as long as the list runs on
  KP.recycleHaul = function (n, results) {
    const count = new Map(); let coins = 0;
    for (const r of results) {
      if (r.kind === 'coins') coins += r.n;
      else if (r.id) count.set(r.id, (count.get(r.id) || 0) + (r.n || 1));
    }
    const order = Object.keys(KP.ITEMS), pk = (id) => KP.pocketOf ? KP.pocketOf(id) : 0;
    const ids = Array.from(count.keys()).sort((a, b) => pk(a) - pk(b) || order.indexOf(a) - order.indexOf(b));
    const parts = (coins ? [`${coins.toLocaleString()} coins`] : []).concat(ids.map(id => KP.ITEMS[id].name + (count.get(id) > 1 ? ' ×' + count.get(id) : '')));
    const head = `The Recycler rattles through ${n} goes and coughs up:`;
    if (!parts.length) return head + ' nothing at all.';
    const R = FF7.render, fits = (t) => !(R && R.wrap) || R.wrap(t, 500, 17).length <= 4;
    const pages = []; let cur = head, onPage = 0;
    parts.forEach((x, i) => {
      const piece = x + (i < parts.length - 1 ? ',' : '.');
      if (onPage && !fits(cur + ' ' + piece)) { pages.push(cur); cur = '...' + piece; onPage = 1; }
      else { cur += (onPage || cur === head ? ' ' : '') + piece; onPage++; }
    });
    pages.push(cur);
    return pages.join('\f');
  };

  // ------------------------------------------------------------------ the machine itself (the user, 2026-10-02: "a distinct
  // design instead of being a big box object like other things"): a Shinra plant in steel and Shinra red on a
  // hazard-striped plinth; a yellow hopper on top with scrap sticking out of it, FEED ME SCRAP stencilled on its slope; the
  // Shinra mark; a control panel with lamps and a big red button; a vent; the prize chute with a tray and coins in it; a
  // smokestack with a red band, and pipes. Its rig moves: two gears turning on its side (the big one slow, the small one
  // back the other way) and a warning beacon going round on top. A field prop ({ prop: 'recycler' }), facing south (+z)
  const F = FF7.field, shade = FF7.util.shade;
  const RED = '#d0262e', STEEL = '#6e7c8a', DARK = '#2e343c', YEL = '#e0a82a', BLACK = '#18191c', RUST = '#a0683a', TIN = '#8a9098';
  if (F && F.props) {
    F.props.recycler = function (mb, x, y, z, s) {
      const X = (k) => x + k * s, Y = (k) => y + k * s, Z = (k) => z + k * s;
      const tilted = (px, py, pz, rx, ry, rz, fn) => { mb.push(); mb.translate(X(px), Y(py), Z(pz)); mb.rotate(rx, ry, rz); fn(); mb.pop(); };
      // the plinth, hazard stripes along its front
      mb.box(X(0), Y(0.06), Z(0), s * 1.36, s * 0.12, s * 1.0, { side: DARK, top: shade(DARK, 0.1) });
      for (let i = 0; i < 13; i++) mb.box(X(-0.6 + i * 0.1), Y(0.06), Z(0.503), s * 0.1, s * 0.1, 0.004, i % 2 ? YEL : BLACK);
      // the body: steel, red plates on its sides, seams down its front
      mb.box(X(0), Y(0.67), Z(0), s * 1.2, s * 1.1, s * 0.86, { side: shade(STEEL, -0.12), front: STEEL, top: shade(STEEL, -0.2), back: shade(STEEL, -0.22) });
      [-1, 1].forEach(k => mb.box(X(k * 0.602), Y(0.67), Z(0.05), 0.004, s * 0.86, s * 0.6, shade(RED, -0.12)));
      [-0.56, 0.02, 0.56].forEach(k => mb.box(X(k), Y(0.67), Z(0.432), s * 0.025, s * 1.06, 0.006, shade(STEEL, -0.3)));
      // the Shinra mark: a red plate, a white diamond with a red one in it, SHINRA
      mb.box(X(-0.265), Y(0.98), Z(0.436), s * 0.58, s * 0.26, s * 0.012, RED);
      tilted(-0.46, 0.98, 0.446, 0, 0, Math.PI / 4, () => { mb.box(0, 0, 0, s * 0.13, s * 0.13, s * 0.006, '#f4f4f4'); mb.box(0, 0, s * 0.004, s * 0.07, s * 0.07, s * 0.006, RED); });
      F.text3d(mb, 'SHINRA', { pos: [X(-0.36), Y(0.955), Z(0.448)], u: [1, 0, 0], v: [0, 1, 0], size: s * 0.075, col: '#f4f4f4', align: 'left' });   // (clear of the plate's face: on it, it flickered)
      // the control panel: three lamps, a big red button
      mb.box(X(0.3), Y(0.94), Z(0.45), s * 0.42, s * 0.32, s * 0.04, DARK);
      [['#40e060', 0.16], ['#f0b020', 0.27], ['#ff3a30', 0.38]].forEach(([c, k]) => mb.box(X(k), Y(1.04), Z(0.474), s * 0.07, s * 0.05, 0.01, c));
      tilted(0.33, 0.86, 0.47, Math.PI / 2, 0, 0, () => { mb.prism(0, 0, 0, s * 0.07, s * 0.07, s * 0.03, 10, '#8a1010'); mb.prism(0, s * 0.03, 0, s * 0.06, s * 0.055, s * 0.03, 10, '#ff2a20'); });
      mb.box(X(0.17), Y(0.85), Z(0.474), s * 0.1, s * 0.06, 0.008, '#204a30');   // (a little readout)
      // a vent
      for (let i = 0; i < 4; i++) mb.box(X(-0.27), Y(0.3 + i * 0.08), Z(0.434), s * 0.42, s * 0.035, 0.012, shade(STEEL, -0.35));
      // the prize chute: its mouth, a tray with lips, coins in it
      mb.box(X(0.3), Y(0.38), Z(0.433), s * 0.34, s * 0.18, 0.01, '#0c0c0e');
      mb.box(X(0.3), Y(0.24), Z(0.57), s * 0.42, s * 0.04, s * 0.28, TIN);
      mb.box(X(0.3), Y(0.28), Z(0.71), s * 0.42, s * 0.08, s * 0.02, shade(TIN, -0.15));
      [-1, 1].forEach(k => mb.box(X(0.3 + k * 0.2), Y(0.28), Z(0.57), s * 0.02, s * 0.08, s * 0.28, shade(TIN, -0.15)));
      [[0.24, 0.6], [0.33, 0.65], [0.38, 0.56]].forEach(([a, b]) => mb.prism(X(a), Y(0.262), Z(b), s * 0.04, s * 0.04, s * 0.012, 8, '#f0c840'));
      // the hopper on top: yellow, its mouth dark, a rim; FEED ME SCRAP down its front slope
      mb.frustum(X(0), Y(1.22), Z(-0.04), s * 0.62, s * 0.5, s * 1.0, s * 0.8, s * 0.42, { top: '#121316', side: shade(YEL, -0.15), front: YEL, back: shade(YEL, -0.25) });
      mb.box(X(0), Y(1.65), Z(0.36), s * 1.02, s * 0.03, s * 0.03, shade(YEL, -0.35)); mb.box(X(0), Y(1.65), Z(-0.44), s * 1.02, s * 0.03, s * 0.03, shade(YEL, -0.35));
      [-1, 1].forEach(k => mb.box(X(k * 0.5), Y(1.65), Z(-0.04), s * 0.03, s * 0.03, s * 0.82, shade(YEL, -0.35)));
      const sl = V3n([0, 0.42, 0.15]);
      F.text3d(mb, 'FEED ME SCRAP', { pos: [X(0), Y(1.4), Z(0.293)], u: [1, 0, 0], v: sl, size: s * 0.085, col: BLACK, off: 0.004 });
      // scrap poking out of the hopper: bent plates, a rusty bar, a cog
      tilted(-0.2, 1.67, -0.12, 0.5, 0.3, 0.4, () => mb.box(0, 0, 0, s * 0.28, s * 0.03, s * 0.18, '#8a8f96'));
      tilted(0.18, 1.69, 0.02, -0.3, 1.0, 0.6, () => mb.box(0, 0, 0, s * 0.22, s * 0.025, s * 0.3, RUST));
      tilted(0.02, 1.7, -0.26, 1.1, 0, 0.3, () => { mb.prism(0, 0, 0, s * 0.09, s * 0.09, s * 0.025, 8, '#6a6e74'); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; mb.box(Math.cos(a) * s * 0.105, s * 0.012, Math.sin(a) * s * 0.105, s * 0.035, s * 0.025, s * 0.035, '#6a6e74'); } });
      F.beam(mb, [X(-0.34), Y(1.6), Z(0.12)], [X(-0.12), Y(1.78), Z(0.2)], s * 0.025, TIN, 6);
      // the smokestack (back left): a red band, a cap, soot
      mb.prism(X(-0.42), Y(1.22), Z(-0.3), s * 0.1, s * 0.09, s * 0.8, 8, '#3a3f46');
      mb.prism(X(-0.42), Y(1.74), Z(-0.3), s * 0.104, s * 0.1, s * 0.08, 8, RED);
      mb.prism(X(-0.42), Y(2.02), Z(-0.3), s * 0.12, s * 0.12, s * 0.03, 8, DARK);
      mb.prism(X(-0.42), Y(2.05), Z(-0.3), s * 0.07, s * 0.07, s * 0.004, 8, '#0a0a0a');
      // pipes down its right side into the top
      F.beam(mb, [X(0.65), Y(0.14), Z(-0.26)], [X(0.65), Y(1.16), Z(-0.26)], s * 0.05, '#7a8088', 6);
      F.beam(mb, [X(0.65), Y(1.16), Z(-0.26)], [X(0.46), Y(1.32), Z(-0.26)], s * 0.05, '#7a8088', 6);
      [0.4, 0.9].forEach(k => mb.box(X(0.65), Y(k), Z(-0.26), s * 0.12, s * 0.04, s * 0.12, shade('#7a8088', -0.2)));
      // the beacon's post, up past the hopper's rim so it shows (its light turns: the rig)
      F.beam(mb, [X(0.52), Y(1.22), Z(-0.38)], [X(0.52), Y(1.8), Z(-0.38)], s * 0.025, DARK, 6);
      mb.prism(X(0.52), Y(1.8), Z(-0.38), s * 0.08, s * 0.07, s * 0.04, 8, DARK);
    };
    const V3n = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    // its moving parts, as an actor (js/field/actors.js): the gears and the beacon on bones, one looping clip
    F.props.recycler.rig = function (m) {
      const s = F.TILE;
      const gear = (r, n, col) => {
        const mb = new FF7.MeshBuilder();
        mb.push(); mb.rotate(0, 0, Math.PI / 2);   // (its axle along x: a gear on the machine's side)
        mb.prism(0, -0.03 * s, 0, r, r, 0.06 * s, n * 2, col);
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; mb.box(Math.cos(a) * (r + 0.025 * s), 0, Math.sin(a) * (r + 0.025 * s), 0.06 * s, 0.05 * s, 0.06 * s, col); }
        mb.prism(0, -0.05 * s, 0, r * 0.3, r * 0.3, 0.1 * s, 6, YEL);
        mb.pop();
        return mb.build();
      };
      m.bone('gearA', 'root', [-0.66 * s, 0.74 * s, 0.1 * s]); m.attach('gearA', gear(0.24 * s, 10, '#7a6a50'));
      m.bone('gearB', 'root', [-0.66 * s, 0.38 * s, -0.24 * s]); m.attach('gearB', gear(0.15 * s, 7, '#8a7a5a'));
      const bm = new FF7.MeshBuilder();   // the beacon: an amber lamp with two bright faces, going round
      bm.prism(0, 0, 0, 0.065 * s, 0.06 * s, 0.12 * s, 8, '#d08a10');
      [-1, 1].forEach(k => bm.box(k * 0.062 * s, 0.06 * s, 0, 0.012 * s, 0.09 * s, 0.07 * s, '#fff2a0'));
      bm.prism(0, 0.12 * s, 0, 0.06 * s, 0.03 * s, 0.03 * s, 8, '#d08a10');
      m.bone('beacon', 'root', [0.52 * s, 1.84 * s, -0.38 * s]); m.attach('beacon', bm.build());
      m.clips.whirr = { dur: 600, fn(mm, p) { mm.b('gearA').rot[0] = p * Math.PI * 2; mm.b('gearB').rot[0] = -p * Math.PI * 2 * 1.6; mm.b('beacon').rot[1] = p * Math.PI * 2 * 5; } };
      m.anims = { idle: 'whirr', walk: 'whirr', run: 'whirr' };
    };
  }

  // the machine, talked to: how much to feed it, then each go's rattle and what falls out
  const NAME = 'Shinra Recycler';
  KP.recycler = function* (s) {
    const d = D(), have = d.bag.scrap_metal || 0, per = KP.SCRAP_PER_GO;
    if (have < per) {
      yield s.msg(`The Shinra Scrap Metal Recycling Machine. Its slot is stencilled FEED ME SCRAP METAL: ${per} PIECES A GO.\f` + (have ? `You have ${have} Scrap Metal. Not enough yet.` : 'You have no Scrap Metal. Wild moogles drop it when they power down.'));
      return;
    }
    const goes = Math.floor(have / per);
    const c = yield s.ask(NAME, `FEED ME SCRAP METAL: ${per} PIECES A GO. (You have ${have}.)`, [`Feed ${per}`].concat(goes > 1 ? [`Feed it all (${goes} goes)`] : []).concat(['Not now']));
    const n = c === 0 ? 1 : c === 1 && goes > 1 ? goes : 0;
    if (!n) return;
    const all = [], mons = [];
    for (let i = 0; i < n; i++) {
      KP.take('scrap_metal', per);
      // the machine shudders and grinds; out it comes
      s.sfx('cursor'); s.shake(2, 14); yield 10; s.sfx('hit'); yield n > 3 ? 4 : 12;
      const r = KP.recycleOnce();
      if (r.kind === 'moogle') mons.push(r); else all.push(r);
      if (n <= 3) {   // (a few goes: each one shown as it drops)
        s.sfx(r.kind === 'moogle' ? 'levelup' : r.kind === 'coins' ? 'purchase' : 'found');
        if (r.kind === 'moogle') { s.flash('#ffffff', 12, 0.7); yield s.msg(`CLANK! KA-CHUNK! Something big rattles out of the chute... ${r.text}! It joins you${r.where === 'box' ? ' (in the Mog Box)' : ''}.`); }
        else yield s.msg(`Ka-chunk! Out drops ${r.text}.`);
      }
    }
    if (n > 3) {   // (a big feed: the haul, all at once)
      for (const r of mons) { s.sfx('levelup'); s.flash('#ffffff', 12, 0.7); yield s.msg(`CLANK! KA-CHUNK! Something big rattles out of the chute... ${r.text}! It joins you${r.where === 'box' ? ' (in the Mog Box)' : ''}.`); }
      s.sfx('purchase');
      yield s.msg(KP.recycleHaul(n, all));
    }
    yield s.msg(`(${d.bag.scrap_metal || 0} Scrap Metal left.)`);
  };
})();
