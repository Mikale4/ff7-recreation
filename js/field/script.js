// Event script API. Field scripts are generator functions receiving `s` (an instance of this
// class). Every method that takes time returns a waitable — use it with `yield`:
//
//   talk: function* (s) {
//     yield s.say('barret', "Yo! Newcomer!");
//     const c = yield s.ask('cloud', 'Should I?', ['Yes', 'No']);
//     if (c === 0) yield s.give('potion', 2);
//   }
//
// See docs/SCRIPTING.md for the full reference.
(function () {
  const U = FF7.util, F = FF7.field;

  class ScriptAPI {
    constructor(field) { this.field = field; }
    get st() { return FF7.state; }

    // ---------------------------------------------------------------- dialogue
    // who: character id ('cloud'), actor id, literal name, or null for a message without name.
    say(who, text, opts = {}) {
      const name = this.nameOf(who);
      const pos = opts.pos || this.boxPos(who);
      return FF7.ui.textBox(name, text, Object.assign({ pos }, opts));
    }
    // Choice inside a dialog: returns selected index (yield it).
    ask(who, text, choices, opts = {}) {
      const name = this.nameOf(who);
      return FF7.ui.textBox(name, text, Object.assign({ pos: opts.pos || this.boxPos(who), choices }, opts));
    }
    // Message box without speaker name (FF7 system messages)
    msg(text, opts) { return this.say(null, text, opts); }
    // Large centered narration on black (flashbacks, FMV substitutes, captions)
    caption(text, opts = {}) { return FF7.ui.caption(text, opts); }
    nameOf(who) {
      if (who == null) return null;
      if (typeof who !== 'string') return String(who);
      const st = FF7.state;
      if (st.chars[who]) return st.chars[who].name;
      if (FF7.data.characters[who]) return FF7.data.characters[who].name;
      const a = this.field && this.field.actors[who];
      if (a && a.name) return a.name;
      if (a && a.def && a.def.name) return a.def.name;
      return who;
    }
    boxPos(who) {
      const a = who && this.field && (this.field.actors[who] || (FF7.state.party.includes(who) && this.field.player));
      if (!a || typeof a.headPos !== 'function') return 'top';
      const p = FF7.GL.project(a.headPos());
      return p.y > FF7.H * 0.5 ? 'top' : 'bottom';
    }

    // ---------------------------------------------------------------- timing / screen
    wait(frames) { return Math.max(1, frames | 0); }
    fadeOut(frames = 20, color = '#000') { return FF7.sceneMgr.fadeOut(frames, color); }
    fadeIn(frames = 20) { return FF7.sceneMgr.fadeIn(frames); }
    flash(color = '#fff', frames = 12, strength = 1) { FF7.sceneMgr.doFlash(color, frames, strength); return frames; }
    shake(mag = 5, frames = 30) { FF7.sceneMgr.doShake(mag, frames); return 1; }
    music(id, opts) { if (!id || id === 'none') FF7.audio.stop(opts && opts.fade != null ? opts.fade : 30); else FF7.audio.play(id, opts || {}); return 1; }
    stopMusic(fade = 30) { FF7.audio.stop(fade); return 1; }
    sfx(id, vol) { FF7.audio.sfx(id, vol); return 1; }

    // ---------------------------------------------------------------- actors
    actor(id) {
      const f = this.field;
      if (!f) return null;
      if (id === 'player' || id == null) return f.player;
      return f.actors[id] || null;
    }
    // Spawn a temporary actor: s.spawn('barret', 'barret', 10, 4, 'left')
    spawn(id, model, x, y, dir = 'down', opts = {}) {
      const f = this.field;
      const a = new F.Actor(id, model || id, x, y, dir, Object.assign({ name: opts.name }, opts));
      if (opts.talk) a.def = { id, talk: opts.talk };
      f.actors[id] = a;
      if (opts.anim) a.playAnim(opts.anim, { loop: F.animLoops(opts.anim, opts.loop) });
      return 1;
    }
    // Hovering set pieces: raise an actor h metres off the ground (over `frames` if given): yield s.hover('highwind', 1.5, 60)
    hover(id, h, frames) {
      const a = this.actor(id); if (!a) return 1;
      if (!frames) { a.hover = h || 0; a.hoverTo = null; return 1; }
      a.hoverTo = { from: a.hover || 0, to: h || 0, n: frames, t: 0 };
      return { get done() { return !a.hoverTo; } };
    }
    remove(id) { const f = this.field; if (f && f.actors[id] && f.actors[id] !== f.player) delete f.actors[id]; return 1; }
    hide(id) { const a = this.actor(id); if (a) a.visible = false; return 1; }
    show(id, x, y, dir) {
      const a = this.actor(id);
      if (!a) {
        const def = (this.field.map.npcs || []).find(n => n.id === id);
        if (def) { const na = this.field.spawnNpc(Object.assign({}, def, { show: null, flagHide: null, flagShow: null })); if (na && x != null) na.setTile(x, y); if (na && dir) na.face(dir); }
        return 1;
      }
      a.visible = true;
      if (x != null) a.setTile(x, y);
      if (dir) a.face(dir);
      return 1;
    }
    // Instantly place an actor
    place(id, x, y, dir) { const a = this.actor(id); if (a) { a.setTile(x, y); if (dir) a.face(dir); } return 1; }
    // Walk to tile (x,y) or through a list of points [[x,y],...]; opts: { run, speed, face, noWait, reverse (back along it) }
    move(id, x, y, opts = {}) {
      const a = this.actor(id);
      if (!a) return 1;
      const pts = Array.isArray(x) ? x : [[x, y]];
      if (typeof y === 'object' && y && !Array.isArray(y)) opts = y;
      const w = a.moveTo(pts, opts);
      return opts.noWait ? 1 : w;
    }
    walk(id, dx, dy, opts = {}) { const a = this.actor(id); if (!a) return 1; return this.move(id, a.x / F.TILE - 0.5 + dx, a.z / F.TILE - 0.5 + dy, opts); }
    run(id, x, y, opts = {}) { return this.move(id, x, y, Object.assign({ run: true }, opts)); }
    // Face a direction ('up','down','left','right') or another actor id
    face(id, dir) {
      const a = this.actor(id); if (!a) return 1;
      const other = typeof dir === 'string' && !F.DIRS.hasOwnProperty(dir) ? this.actor(dir) : null;
      a.turnTo(other || dir);
      return 8;
    }
    // Play a body animation ('nod','shake','wave','point','kneel','sit','lie','armscross','fistpump','jump','pray',...)
    anim(id, name, opts = {}) {
      const a = this.actor(id); if (!a) return 1;
      if (!name || name === 'none') { a.clearAnim(); return 1; }
      a.playAnim(name, { loop: F.animLoops(name, opts.loop), restart: true });
      if (opts.wait) { const m = a.model; return FF7.waitUntil(() => m.clipDone); }
      return 1;
    }
    stopAnim(id) { const a = this.actor(id); if (a) a.clearAnim(); return 1; }
    // Hop / jump to a tile (arc)
    jump(id, x, y, height = 0.6, frames = 24) {
      const a = this.actor(id); if (!a) return 1;
      a.jump = { t: 0, n: frames, fx: a.x, fz: a.z, tx: (x + 0.5) * F.TILE, tz: (y + 0.5) * F.TILE, h: height };
      a.turnTo(Math.atan2(a.jump.tx - a.x, a.jump.tz - a.z));
      FF7.audio.sfx('jump');
      return FF7.waitUntil(() => !a.jump);
    }
    // Emote balloon: '!', '?', '...', '♪', '!!', '?!', etc.
    emote(id, text = '!', frames = 50, color) { this.field.emotes.push({ id: id === 'player' ? 'player' : id, text, t: frames, color }); return Math.min(frames, 30); }
    // Change the player's model (e.g. Cloud in a dress) or the actor's model
    setModel(id, app) { const a = this.actor(id); if (a) { a.app = app; a.model = F.buildModel(app); } return 1; }
    // Allow / disallow player movement is implicit: while a script runs the player can't move.

    // ---------------------------------------------------------------- camera
    // Pan camera to tile (x, y) over frames; stays there until camFollow()
    cam(x, y, frames = 40, opts = {}) {
      const c = this.field.cam;
      c.pan = { fx: c.x, fy: c.y, fz: c.z, x: (x + 0.5) * F.TILE, z: (y + 0.5) * F.TILE, y: (opts.height != null ? opts.height : F.groundAt(this.field.P, (x + 0.5) * F.TILE, (y + 0.5) * F.TILE) + 0.5), t: 0, n: frames };
      if (opts.dist) c.dist = opts.dist;
      if (opts.pitch) c.pitch = opts.pitch;
      if (opts.yaw != null) c.yaw = opts.yaw;
      return FF7.waitUntil(() => c.pan && c.pan.t >= c.pan.n);
    }
    camFollow(frames = 30, opts = {}) {
      const c = this.field.cam, pl = this.field.player;
      if (!opts.keepZoom) { const mc = this.field.map.camera || {}; c.dist = mc.dist || 9.5; c.pitch = mc.pitch || 50; c.yaw = mc.yaw || 0; }
      if (!c.pan) return 1;
      c.pan = { fx: c.x, fy: c.y, fz: c.z, x: pl.x, z: pl.z, y: pl.y + 0.5, t: 0, n: frames, release: true };
      return frames;
    }
    camZoom(dist, pitch) { const c = this.field.cam; c.dist = dist; if (pitch) c.pitch = pitch; return 1; }

    // ---------------------------------------------------------------- flags & variables
    flag(name) { return !!FF7.state.flags[name]; }
    set(name, v = true) { FF7.state.flags[name] = v; return 1; }
    unset(name) { delete FF7.state.flags[name]; return 1; }
    get(name) { return FF7.state.vars[name] || 0; }
    setVar(name, v) { FF7.state.vars[name] = v; return 1; }
    inc(name, n = 1) { FF7.state.vars[name] = (FF7.state.vars[name] || 0) + n; return FF7.state.vars[name]; }

    // ---------------------------------------------------------------- items / gil / materia
    give(id, qty = 1, opts = {}) {
      if (!id) return 1;
      if (id.startsWith('materia:')) return this.giveMateria(id.slice(8), opts);
      const isKey = FF7.data.keyItems[id] && !U.findItem(id);
      if (isKey) FF7.sys.inv.addKey(id); else FF7.sys.inv.add(id, qty);
      if (opts.silent) return 1;
      FF7.audio.sfx('found');
      return this.msg(`Received "${U.itemName(id)}"${qty > 1 ? ' x' + qty : ''}!`);
    }
    take(id, qty = 1) { if (FF7.data.keyItems[id] && !U.findItem(id)) FF7.sys.inv.removeKey(id); else FF7.sys.inv.remove(id, qty); return 1; }
    has(id, qty = 1) { return FF7.sys.inv.has(id, qty); }
    count(id) { return FF7.sys.inv.count(id); }
    giveGil(n, opts = {}) { FF7.sys.inv.addGil(n); if (opts.silent) return 1; FF7.audio.sfx('found'); return this.msg(`Received ${U.fmtNum(n)} Gil!`); }
    takeGil(n) { return FF7.sys.inv.spendGil(n); }
    gil() { return FF7.state.gil; }
    // Gold Saucer points
    gp() { return FF7.state.gp || 0; }
    giveGp(n) { FF7.state.gp = U.clamp((FF7.state.gp || 0) + n, 0, 10000); return 1; }
    takeGp(n) { if ((FF7.state.gp || 0) < n) return false; FF7.state.gp -= n; return true; }
    bp() { return FF7.state.bp || 0; }
    giveBp(n) { FF7.state.bp = U.clamp((FF7.state.bp || 0) + n, 0, 65535); return 1; }
    takeBp(n) { if ((FF7.state.bp || 0) < n) return false; FF7.state.bp -= n; return true; }
    giveMateria(id, opts = {}) {
      const m = FF7.sys.materia.make(id, opts.ap || 0);
      // opts.equip: character id -> put it in the first free weapon (then armour) slot
      const c = opts.equip && FF7.state.chars[opts.equip];
      const slotArr = c && [c.weaponMateria, c.armorMateria].find(a => a.some(x => !x));
      if (slotArr) { slotArr[slotArr.findIndex(x => !x)] = m; FF7.sys.stats.recalc(c); }
      else FF7.sys.materia.toStock(m);
      if (opts.silent) return 1;
      FF7.audio.sfx('found');
      const d = FF7.data.materia[id];
      return this.msg(`Received "${d ? d.name : id}" Materia!`);
    }
    hasMateria(id) { return FF7.state.materia.some(m => m.id === id) || Object.values(FF7.state.chars).some(c => FF7.sys.materia.equippedList(c).some(m => m.id === id)); }

    // ---------------------------------------------------------------- party
    join(id, opts = {}) {
      FF7.sys.party.join(id, opts);
      if (opts.silent || !opts.msg) return 1;
      return this.msg(opts.msg);
    }
    leave(id) { FF7.sys.party.leave(id); this.refreshLeader(); return 1; }
    bench(id) { FF7.sys.party.bench(id); this.refreshLeader(); return 1; }
    party(ids) { FF7.sys.party.set(ids); this.refreshLeader(); return 1; }
    inParty(id) { return FF7.sys.party.inParty(id); }
    isMember(id) { return FF7.sys.party.isMember(id); }
    leader() { const l = FF7.sys.party.leader(); return l ? l.id : 'cloud'; }
    refreshLeader() {
      const f = this.field; if (!f || !f.player) return;
      const l = FF7.sys.party.leader(); if (!l) return;
      if (f.player.app !== l.id && !f.map.playerModel) {
        // drop the old leader's alias; never take over an NPC/spawned actor that uses the new leader's id
        for (const k in f.actors) if (k !== 'player' && f.actors[k] === f.player) delete f.actors[k];
        f.player.app = l.id; f.player.model = F.buildModel(l.id);
        if (!f.actors[l.id]) f.actors[l.id] = f.player;
      }
    }
    // Let the player pick the party with the PHS screen. required: ids that must be in the party
    choosePArty(required = [], opts = {}) { return FF7.ui.partySelect(required, opts); }
    phs(enabled = true) { FF7.state.phsEnabled = enabled; return 1; }
    menu(enabled = true) { FF7.state.menuEnabled = enabled; return 1; }
    heal() { FF7.sys.party.healAll(); return 1; }
    name(id) { return FF7.state.chars[id] ? FF7.state.chars[id].name : (FF7.data.characters[id] || {}).name; }
    // Naming screen for a character (sets FF7.state.chars[id].name)
    nameEntry(id, o) { return FF7.ui.nameEntry(id, o); }   // (o: { def, noPortrait })
    level(id) { const c = FF7.state.chars[id]; return c ? c.level : 0; }

    // ---------------------------------------------------------------- battles
    // s.battle({ enemies: ['guard_scorpion'], bg: 'reactor', music: 'boss', canLose: false, noEscape: true,
    //            preempt, back, formation })  -> yields 'win' | 'lose' | 'escape'
    battle(opts) { return FF7.battle.start(opts); }

    // ---------------------------------------------------------------- navigation
    goto(map, entry, opts = {}) {
      if (!FF7.maps[map]) { console.error('goto: unknown map', map); return 1; }
      return this.field.goto(map, entry, Object.assign({ skipEnter: false }, opts));
    }
    // Leave to the world map at a location id (FF7.data.world.locations) or {x, y}
    world(loc, opts = {}) {
      const w = { done: false };
      const S = FF7.sceneMgr;
      const f = this.field;
      f.parallel.push(new FF7.Coroutine((function* () {
        yield S.fadeOut(opts.fade || 20);
        const ws = FF7.world.enter(loc, opts);
        // this field scene stops updating now: the world scene runs the fade-in
        ws.parallel.push(new FF7.Coroutine((function* () { yield S.fadeIn(opts.fade || 20); w.done = true; })()));
      })()));
      return w;
    }
    mapId() { return this.field.map.id; }
    // name of the entry point the player arrived through (e.g. 'from_gate')
    entry() { return this.field.entryName; }
    // block / unblock a tile for walking
    block(x, y, on = true) { const f = this.field; f.blocked = f.blocked || {}; if (on) f.blocked[x + ',' + y] = true; else delete f.blocked[x + ',' + y]; return 1; }

    // ---------------------------------------------------------------- services
    shop(id) { return FF7.ui.openShop(id); }
    inn(price = 0, opts = {}) {
      const self = this;
      return FF7.co(function* () {
        const who = opts.who || null;
        const c = yield self.ask(who, opts.text || `Would you like to rest? It's ${price} Gil for one night.`, ['Stay', 'Leave']);
        if (c !== 0) return false;
        if (FF7.state.gil < price) { yield self.say(who, "Sorry, you don't have enough money."); return false; }
        FF7.sys.inv.spendGil(price);
        yield self.fadeOut(30);
        FF7.audio.push('goodnight', { loop: false });
        FF7.sys.party.healAll();
        yield 220;
        FF7.audio.pop(30);
        yield self.fadeIn(30);
        if (opts.after) yield opts.after;
        return true;
      });
    }
    save() { return FF7.ui.saveMenu({ mode: 'save' }); }
    minigame(id, opts = {}) {
      if (FF7.minigames && FF7.minigames.start) return FF7.minigames.start(id, opts);
      return { done: true, result: { won: true, score: 0, skipped: true } };
    }
    // Illustrated "movie" scene (FMV substitute): see js/gfx/cinema.js
    movie(id, opts = {}) {
      if (FF7.theater) FF7.theater.mark(id);   // (the title screen's Theater: the story has reached this scene)
      if (FF7.cinema && FF7.cinema.play) return FF7.cinema.play(id, opts);
      return opts.text ? this.caption(opts.text, { hold: 150, bg: '#000' }) : 1;
    }
    // opts.onExpire: function* (s) {...} runs as a field script at 0 (instead of Game Over); 'none' = just stop
    timer(seconds, label, opts = {}) {
      if (seconds == null) { FF7.state.timer = null; return 1; }
      const T = { t: seconds, label: label || '' };
      if (opts.onExpire) T.onExpire = () => {
        FF7.state.timer = null;
        const f = FF7.fieldScene;
        if (typeof opts.onExpire === 'function' && f) f.runScript(opts.onExpire, { name: 'timer-expire' });
      };
      FF7.state.timer = T; return 1;
    }
    // Hurt the active party (traps, falls): n HP each, or { pct: 0.25 } of max HP. Never kills unless opts.lethal.
    damage(n, opts = {}) {
      FF7.sys.party.active().forEach(c => {
        if (opts.who && opts.who !== c.id) return;
        const d = opts.pct ? Math.floor(c.maxHp * opts.pct) : n;
        c.hp = Math.max(opts.lethal ? 0 : Math.min(1, c.hp), c.hp - d);
      });
      FF7.audio.sfx('hit');
      FF7.sceneMgr.doFlash('#ff2020', 14, 0.5);
      return 1;
    }
    timeLeft() { return FF7.state.timer ? FF7.state.timer.t : 0; }
    gameOver() { FF7.scenes.gameOver(); return { done: false }; }
    // End of disc screen then continue
    discEnd(n) { return FF7.ui.discEnd(n); }
    ending() { FF7.scenes.ending(); return { done: false }; }
    // Run a sub-script in parallel (doesn't block)
    parallel(fn) { this.field.runScript(fn, { parallel: true }); return 1; }
    // Park a world-map vehicle somewhere (e.g. the Tiny Bronco on a beach): tile x, y
    parkVehicle(id, x, y) { const w = FF7.state.world; w.vehicles = w.vehicles || {}; w.vehicles[id] = x == null ? null : { x, y }; return 1; }
    // Run another story script: s.call(FF7.story.foo)
    call(fn, ...args) { return fn.call(null, this, ...args); }
    random(n) { return U.rand(n); }
    // Tutorials / help pages
    tutorial(id) { return FF7.ui.tutorial ? FF7.ui.tutorial(id) : 1; }
  }
  F.ScriptAPI = ScriptAPI;
})();
