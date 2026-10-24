// Kupomon's Fly (docs/KUPOMON.md "Big Mog's Bell"): a key item, Big Mog's Bell. Rung outdoors, Prof. Sith's Big Mog
// (Cait Sith's own mount: the big FF7 moogle) floats down and carries Cloud to any town he's been to, setting him
// down at its Mog Center's door, as Pokémon's Fly does. Big Mog brings the bell himself, with a letter from the
// professor, the first time Cloud walks into a town with two badges.
//   KP.flyTowns()        the towns Big Mog flies to (one per Mog Center), in the order the story reaches them
//   KP.visited(town)     been there (KP data .visited; an older save's filled in from its progress)
//   KP.flyFromOK(mapId)  outdoors: a town, a route, the woods, the Summit Road (not caves, towers or buildings)
//   KP.townMap({ fly })  the Town Map: the isles, the towns, where Cloud is; with fly, choose a town and go
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {}, R = FF7.render, F = FF7.field;
  const W = FF7.W, H = FF7.H;
  const S = () => FF7.sceneMgr, sfx = (id) => { try { FF7.audio.sfx(id); } catch (e) { } };
  const D = () => FF7.state && FF7.state.kupomon && FF7.state.kp;
  const BIG_MOG = 'moogle', BIG = 2.4;

  KP.ITEMS.big_bell = { name: "Big Mog's Bell", kind: 'key', price: 0,
    desc: "Ring it outdoors: Prof. Sith's Big Mog floats down and flies you to any town you've been to, right to its Mog Center's door." };

  // ------------------------------------------------------------------ the towns, and the Town Map's layout
  // (x, y on the map: the isles as a snake, south to north, each region a row)
  const ORDER = ['kp_town', 'kp_mogridge', 'kp_kurotsuki', 'kp_fernwick', 'kp_cogsworth', 'kp_mogfield', 'kp_nibelpeaks', 'kp_sandsea', 'kp_skyport', 'kp_bloomhaven', 'kp_ravenmoor', 'kp_candlerock', 'kp_glimmerfair', 'kp_coliseum', 'kp_costa'];
  const AT = { kp_town: [0.88, 0.88], kp_mogridge: [0.58, 0.88], kp_kurotsuki: [0.14, 0.88], kp_fernwick: [0.14, 0.65], kp_cogsworth: [0.52, 0.65],
    kp_mogfield: [0.86, 0.65], kp_nibelpeaks: [0.86, 0.42], kp_sandsea: [0.58, 0.42], kp_skyport: [0.14, 0.42], kp_bloomhaven: [0.14, 0.2],
    kp_ravenmoor: [0.46, 0.2], kp_coliseum: [0.8, 0.06], kp_costa: [0.34, 0.31],
    // (Region 5: a loop off Ravenmoor that comes back to Route 13 at the Badge Gate)
    kp_candlerock: [0.2, 0.08], kp_glimmerfair: [0.4, 0.05] };
  // landmarks along the way (not towns: no Mog Center to land at), their names below (or to the left: 'l')
  const MARKS = [['Whisperwood', 0.36, 0.88], ['Mt. Kupo', 0.33, 0.65], ['Sunken Ruins', 0.36, 0.42], ['Lifestream Tower', 0.72, 0.24], ['Summit Road', 0.6, 0.06],
    ['Badge Gate', 0.53, 0.13, 'l'],
    ['Northern Crater', 0.97, 0.15, 'l'], ['Mognet Tower', 0.97, 0.29, 'l']];
  // the roads between them (pairs of map points: towns by id, landmarks by name)
  const ROADS = [['kp_town', 'kp_mogridge'], ['kp_mogridge', 'Whisperwood'], ['Whisperwood', 'kp_kurotsuki'], ['kp_kurotsuki', 'kp_fernwick'], ['kp_fernwick', 'Mt. Kupo'],
    ['Mt. Kupo', 'kp_cogsworth'], ['kp_cogsworth', 'kp_mogfield'], ['kp_mogfield', 'kp_nibelpeaks'], ['kp_nibelpeaks', 'kp_sandsea'], ['kp_sandsea', 'Sunken Ruins'],
    ['Sunken Ruins', 'kp_skyport'], ['kp_skyport', 'kp_bloomhaven'], ['kp_bloomhaven', 'kp_ravenmoor'], ['kp_ravenmoor', 'Lifestream Tower'], ['kp_ravenmoor', 'Badge Gate'], ['Badge Gate', 'Summit Road'],
    ['kp_ravenmoor', 'kp_candlerock'], ['kp_candlerock', 'kp_glimmerfair'], ['kp_glimmerfair', 'Badge Gate'],
    ['Summit Road', 'kp_coliseum'], ['kp_coliseum', 'Northern Crater'], ['Northern Crater', 'Mognet Tower']];
  // where a map is on the Town Map: a town or landmark by its area, a route between the two it joins
  const ROUTE_AT = { kp_route1: ['kp_town', 'kp_mogridge'], kp_route1n: ['kp_town', 'kp_mogridge'], kp_route2: ['kp_mogridge', 'Whisperwood'], kp_route3: ['Whisperwood', 'kp_kurotsuki'],
    kp_route4: ['kp_kurotsuki', 'kp_fernwick'], kp_route5: ['kp_fernwick', 'Mt. Kupo'], kp_route6: ['kp_cogsworth', 'kp_mogfield'], kp_route7: ['kp_mogfield', 'kp_nibelpeaks'],
    kp_route8: ['kp_nibelpeaks', 'kp_sandsea'], kp_route9: ['Sunken Ruins', 'kp_skyport'], kp_route10: ['kp_skyport', 'kp_bloomhaven'], kp_route11: ['kp_bloomhaven', 'kp_ravenmoor'],
    kp_route12: ['kp_ravenmoor', 'Lifestream Tower'], kp_route13: ['kp_ravenmoor', 'Summit Road'], kp_route14: ['Summit Road', 'kp_coliseum'],
    kp_route15: ['kp_ravenmoor', 'kp_candlerock'], kp_route16: ['kp_candlerock', 'kp_glimmerfair'], kp_route17: ['kp_glimmerfair', 'Badge Gate'] };

  let towns = null;
  KP.flyTowns = function () {
    if (towns) return towns;
    towns = [];
    for (const c of Object.keys(FF7.maps).filter(k => /^kp_(.+_)?center$/.test(k))) {
      const e = (FF7.maps[c].exits || []).find(x => FF7.maps[x.to]);
      if (e && AT[e.to]) towns.push({ town: e.to, entry: e.entry, center: c, name: FF7.maps[e.to].name || e.to });
    }
    towns.sort((a, b) => ORDER.indexOf(a.town) - ORDER.indexOf(b.town));
    return towns;
  };
  const isTown = (id) => KP.flyTowns().some(t => t.town === id);
  // been there: marked on arrival; an older save (from before the bell) is filled in from how far it has come (the
  // dojo towns of its badges, the last Mog Center used, the Coliseum once the leagues were entered)
  KP.visited = function (town) {
    const d = D(); if (!d) return false;
    if (!d.visited) {
      d.visited = { kp_town: 1 };
      const fl = FF7.state.flags, DOJO = { 1: 'kp_kurotsuki', 2: 'kp_cogsworth', 3: 'kp_nibelpeaks', 4: 'kp_skyport', 5: 'kp_bloomhaven', 6: 'kp_ravenmoor', 7: 'kp_candlerock', 8: 'kp_glimmerfair' };
      let far = 0;
      (d.badges || []).forEach(n => { far = Math.max(far, ORDER.indexOf(DOJO[n])); });
      const rep = d.repair && FF7.maps[d.repair[0]] && (FF7.maps[d.repair[0]].exits || []).find(x => AT[x.to]);
      if (rep) far = Math.max(far, ORDER.indexOf(rep.to));
      if (fl.kp_league_met) far = ORDER.indexOf('kp_coliseum');
      // (Region 5's towns, a side loop: only with their own badges)
      ORDER.slice(0, far + 1).forEach(t => { if (t === 'kp_candlerock' && !(d.badges || []).includes(7) || t === 'kp_glimmerfair' && !(d.badges || []).includes(8)) return; d.visited[t] = 1; });
    }
    return !!d.visited[town];
  };
  // outdoors: Big Mog can come down (a town, a route, the woods, the Summit Road; never a cave, tower or building)
  KP.flyFromOK = function (mapId) {
    const m = FF7.maps[mapId]; if (!m || !/^kp_/.test(mapId)) return false;
    if (isTown(mapId)) return true;
    return !!m.kpWild && (!m.kpCave || /^kp_summit/.test(mapId));
  };

  // ------------------------------------------------------------------ the field: towns marked as visited; Big Mog brings
  // the bell; and lands at the end of a flight
  const load0 = F && F.FieldScene && F.FieldScene.prototype.load;
  if (load0) F.FieldScene.prototype.load = function (mapId) {
    const r = load0.apply(this, arguments);
    const d = D();
    if (d && typeof mapId === 'string' && isTown(mapId)) {
      KP.visited(mapId); d.visited[mapId] = 1;
      if (KP._flyArrive === mapId) landing(this);
      else if ((d.badges || []).length >= 2 && !FF7.state.flags.kp_big_bell) this.queue.push({ fn: bellDelivery, name: 'kp-big-bell' });
    }
    if (KP._flyArrive && KP._flyArrive !== mapId) { KP._flyArrive = null; if (this.player) this.player.hover = 0; }   // (a flight cut short: back on the ground)
    return r;
  };
  const bigMog = (fs, x, y, hover, dir) => { const a = new F.Actor('kp_bigmog', BIG_MOG, x, y, dir || 'down', { scale: BIG, solid: false, hover, name: 'Big Mog' }); fs.actors.kp_bigmog = a; return a; };
  // the first town with two badges: Big Mog floats down with the professor's letter and the bell
  const bellDelivery = function* (s) {
    if (FF7.state.flags.kp_big_bell) return;
    const p = s.field.player, x = p.tx, y = p.ty;
    bigMog(s.field, x + 1, y, 9, 'left');
    s.sfx('chocobo_tune');
    yield s.hover('kp_bigmog', 0.2, 80);
    s.face('player', 'right'); s.emote('player', '!');
    yield 20;
    yield s.msg('A giant moogle drifts down out of the sky, a letter clutched in its paw...');
    yield s.say('Big Mog', 'Kuuupo!');
    yield s.msg(`"Two badges already, laddie! Here's a wee present. This big fella is Big Mog, my old ride.\fRing this bell anywhere outdoors, and he'll fly ye to any town ye've been to, right to the Mog Center's door.\fJust don't tell him he's heavy. - Prof. Sith"`);
    KP.give('big_bell', 1); s.set('kp_big_bell'); s.sfx('found');
    yield s.msg(`${s.name('cloud')} received Big Mog's Bell!\f(It's in the Bag's Key Items pocket.)`);
    s.emote('kp_bigmog', '♪', 40);
    yield 30;
    yield s.hover('kp_bigmog', 10, 60);
    s.remove('kp_bigmog');
  };
  // a flight's end: Big Mog sets Cloud down by the Mog Center's door, then floats off
  function landing(fs) {
    KP._flyArrive = null;
    const p = fs.player; p.hover = 7;
    bigMog(fs, p.tx, p.ty, 7 + 1.15, 'down');
    fs.queue.push({ name: 'kp-fly-land', fn: function* (s) {
      s.hover('kp_bigmog', 1.15, 70); yield s.hover('player', 0, 70);
      s.sfx('hop');
      yield 16;
      s.emote('kp_bigmog', '♪', 40);
      yield 34;
      yield s.hover('kp_bigmog', 10, 60);
      s.remove('kp_bigmog');
    } });
  }
  // the flight: the bell rings, Big Mog comes down over Cloud, takes him up, and away
  KP.flyTo = function (t) {
    const fs = FF7.fieldScene; if (!fs) return;
    fs.runScript(function* (s) {
      const p = s.field.player;
      s.sfx('ching2'); yield 12; s.sfx('ching');
      yield s.msg(`${s.name('cloud')} rang Big Mog's Bell!`);
      bigMog(s.field, p.tx, p.ty, 9, 'down');
      yield s.hover('kp_bigmog', 1.15, 60);
      s.emote('kp_bigmog', '♪', 30);
      yield 24;
      s.sfx('jump');
      s.hover('kp_bigmog', 9 + 1.15, 54); yield s.hover('player', 9, 54);
      KP._flyArrive = t.town;   // (both stay up there through the fade: the landing takes over on arrival)
      yield s.goto(t.town, t.entry, { fade: 18 });
    }, { name: 'kp-fly' });
  };

  // ------------------------------------------------------------------ the Town Map (and, with the bell, where to fly)
  KP.townMap = function (o = {}) { const w = { done: false, town: null }; S().push(new TownMap(o, w)); return w; };
  class TownMap {
    constructor(o, w) {
      this.o = o; this.w = w; this.t = 0; this.transparent = false; this.confirm = null;
      this.list = KP.flyTowns().filter(t => KP.visited(t.town));
      const here = FF7.fieldScene && FF7.fieldScene.map && FF7.fieldScene.map.id;
      this.idx = Math.max(0, this.list.findIndex(t => t.town === here));
      this.here = here;
    }
    update() {
      const I = FF7.input; this.t++;
      if (this.confirm) {
        if (I.repeat('up') || I.repeat('down')) { this.confirm.idx = 1 - this.confirm.idx; sfx('cursor'); }
        if (I.back()) { sfx('cancel'); this.confirm = null; return; }
        if (I.pressed('ok')) {
          if (this.confirm.idx === 1) { sfx('cancel'); this.confirm = null; return; }
          sfx('confirm'); const t = this.list[this.idx]; S().pop(); this.w.town = t.town; this.w.done = true; KP.flyTo(t);
        }
        return;
      }
      const n = this.list.length;
      if (n && (I.repeat('up') || I.repeat('left'))) { this.idx = (this.idx + n - 1) % n; sfx('cursor'); }
      if (n && (I.repeat('down') || I.repeat('right'))) { this.idx = (this.idx + 1) % n; sfx('cursor'); }
      if (I.back()) { sfx('cancel'); S().pop(); this.w.done = true; return; }
      if (I.pressed('ok') && this.o.fly && n) {
        if (this.list[this.idx].town === this.here) { sfx('error'); return; }   // (already here)
        sfx('confirm'); this.confirm = { idx: 0 };
      }
    }
    // a point on the map: a town id or a landmark's name
    pt(k, box) {
      const a = AT[k] || (MARKS.find(m => m[0] === k) || []).slice(1);
      return [box.x + 18 + a[0] * (box.w - 36), box.y + 26 + a[1] * (box.h - 46)];
    }
    render() {
      const c = R.ctx, box = { x: 12, y: 12, w: 412, h: H - 24 };
      R.fill('#000', 1);
      // the sea, the isles (a broad band of land under every road), the roads
      const g = c.createLinearGradient(0, box.y, 0, box.y + box.h); g.addColorStop(0, '#16305e'); g.addColorStop(1, '#1f4a7a');
      c.fillStyle = g; c.fillRect(box.x, box.y, box.w, box.h);
      c.lineCap = 'round'; c.lineJoin = 'round';
      const roads = (width, col) => { c.strokeStyle = col; c.lineWidth = width; ROADS.forEach(([a, b]) => { const p = this.pt(a, box), q = this.pt(b, box); c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); }); };
      roads(34, '#c8b27a'); roads(28, '#5f9a4e'); roads(3, 'rgba(240,226,180,0.85)');
      // the island over the sea (Costa del Kupo): the ferry's dotted line from the coast road
      { const [ix, iy] = this.pt('kp_costa', box), fx = this.pt('kp_skyport', box)[0], fy = (this.pt('kp_skyport', box)[1] + this.pt('kp_bloomhaven', box)[1]) / 2;
        c.setLineDash([4, 5]); c.strokeStyle = 'rgba(240,240,255,0.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(fx + 12, fy); c.lineTo(ix - 16, iy); c.stroke(); c.setLineDash([]);
        c.fillStyle = '#c8b27a'; c.beginPath(); c.arc(ix, iy, 19, 0, Math.PI * 2); c.fill(); c.fillStyle = '#5f9a4e'; c.beginPath(); c.arc(ix, iy, 15, 0, Math.PI * 2); c.fill(); }
      // landmarks
      MARKS.forEach(([name, , , side]) => {
        const [x, y] = this.pt(name, box); c.fillStyle = '#e8dcb0'; c.beginPath(); c.moveTo(x, y - 5); c.lineTo(x + 5, y); c.lineTo(x, y + 5); c.lineTo(x - 5, y); c.fill();
        if (side === 'l') R.text(name, x - 10, y - 6, { size: 9, align: 'right', color: '#e8e0c8' }); else R.text(name, x, y + 8, { size: 9, align: 'center', color: '#e8e0c8' });
      });
      // towns: visited ones bright, the rest grey
      const sel = this.list[this.idx];
      KP.flyTowns().forEach(t => {
        const [x, y] = this.pt(t.town, box), seen = KP.visited(t.town), on = sel && sel.town === t.town;
        c.fillStyle = seen ? (on ? '#ffd860' : '#e86040') : '#7a7f88'; c.fillRect(x - 6, y - 6, 12, 12);
        c.strokeStyle = '#1a1a1a'; c.lineWidth = 2; c.strokeRect(x - 6, y - 6, 12, 12);
        R.text(seen ? t.name : '???', x, y - 22, { size: 11, align: 'center', color: seen ? R.COL.white : '#a0a4ac' });
        if (on) { const r = 11 + Math.sin(this.t / 8) * 2; c.strokeStyle = '#ffd860'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); }
      });
      // where Cloud is: a blinking marker (a route: halfway along it)
      const hereAt = this.whereAt(box);
      if (hereAt && Math.floor(this.t / 20) % 2 === 0) { c.fillStyle = '#60e0ff'; c.beginPath(); c.arc(hereAt[0], hereAt[1] + 11, 4, 0, Math.PI * 2); c.fill(); }
      R.text('TOWN MAP', box.x + 10, box.y + 6, { size: 13, color: R.COL.cyan });
      // the list of towns to fly to
      const lx = box.x + box.w + 8, lw = W - lx - 12;
      R.window(lx, 12, lw, H - 24);
      R.text(this.o.fly ? 'FLY TO' : 'TOWNS VISITED', lx + 14, 22, { size: 13, color: R.COL.cyan });
      const rows = 12, top = KP.listTop ? KP.listTop(this.idx, this.list.length, rows) : 0;
      this.list.slice(top, top + rows).forEach((t, j) => R.textFit(t.name + (t.town === this.here ? '  (here)' : ''), lx + 36, 48 + j * 26, lw - 48, { size: 14, minSize: 10, color: t.town === this.here ? R.COL.gray : R.COL.white }));
      if (this.list.length) R.cursor(lx + 18, 59 + (this.idx - top) * 26);
      if (KP.drawScroll) KP.drawScroll(lx + lw - 10, 48, rows * 26, top, rows, this.list.length);
      R.para(this.o.fly ? 'Up / down: a town.  OK: fly there.' : 'Up / down: a town.', lx + 14, H - 64, lw - 28, { size: 11, color: R.COL.gray, lines: 2 });
      if (this.confirm) {
        const t = this.list[this.idx];
        R.window(60, H - 110, 340, 92);
        R.textFit(`Fly to ${t.name}?`, 80, H - 98, 300, { size: 15 });
        ['Yes', 'No'].forEach((o, i) => R.text(o, 110, H - 70 + i * 24, { size: 15 }));
        R.cursor(94, H - 59 + this.confirm.idx * 24);
      }
    }
    whereAt(box) {
      const id = this.here, m = FF7.maps[id] || {}; if (!id) return null;
      if (AT[id]) return this.pt(id, box);
      if (ROUTE_AT[id]) { const [a, b] = ROUTE_AT[id], p = this.pt(a, box), q = this.pt(b, box); return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; }
      const t = KP.flyTowns().find(t => FF7.maps[t.town].area && FF7.maps[t.town].area === m.area);
      if (t) return this.pt(t.town, box);
      const mk = MARKS.find(k => m.area && (m.area === k[0] || m.name && m.name.startsWith(k[0])));
      return mk ? this.pt(mk[0], box) : null;
    }
  }
  KP.TownMap = TownMap;

  // ------------------------------------------------------------------ the bag's key items (the Menu's Bag calls this)
  KP.useKeyItem = function (menu, id) {
    if (id === 'ss_ticket') { sfx('error'); menu.msg = { text: 'Show it to the Gangway Steward on the liner quay, down the pier on Route 10, to board the S.S. Moogle.' }; return; }
    if (id !== 'big_bell') { sfx('error'); menu.msg = { text: "There's no use for that here." }; return; }
    const fs = FF7.fieldScene, mapId = fs && fs.map && fs.map.id;
    if (!KP.flyFromOK(mapId)) { sfx('error'); menu.msg = { text: "Big Mog can't fit in here, kupo! Ring the bell outdoors." }; return; }
    if (KP.flyTowns().filter(t => KP.visited(t.town)).length < 2) { sfx('error'); menu.msg = { text: 'Big Mog only flies to towns you have been to. Go and see a few first!' }; return; }
    sfx('confirm'); S().pop(); KP.townMap({ fly: true });
  };
})();
