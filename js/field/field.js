// Field scene: walk around a 3D field map, talk to NPCs, run event scripts, random encounters.
(function () {
  const U = FF7.util, R = FF7.render, GL = FF7.GL, F = FF7.field, M4 = FF7.M4;
  const TILE = () => F.TILE;

  class FieldScene {
    constructor() {
      this.map = null; this.geo = null; this.P = null;
      this.actors = {}; this.player = null;
      this.objects = [];              // items, chests, save points, props with talk
      this.script = null;             // main event coroutine
      this.parallel = [];             // parallel coroutines
      this.queue = [];                // pending scripts
      this.cam = { x: 0, y: 0, z: 0, pitch: 50, dist: 9.5, yaw: 0, fov: 36, follow: true, tx: 0, tz: 0, pan: null, shake: 0 };
      this.danger = 0; this.dangerLimit = 24;
      this.t = 0;
      this.exitGrace = true;
      this.showMarkers = false;
      this.api = new F.ScriptAPI(this);
      this.emotes = [];
      this.transitioning = false;
      this.hud = [];
    }

    // ---------------------------------------------------------------- loading
    load(mapId, entry, opts = {}) {
      const map = FF7.maps[mapId];
      if (!map) { console.error('Unknown map', mapId); FF7.debugMsg && FF7.debugMsg('Missing map: ' + mapId); return false; }
      const prevMap = this.map;
      this.map = map;
      this.P = F.parseMap(map);
      this.geo = F.geometry(map);
      this.actors = {};
      this.objects = [];
      this.emotes = [];
      this.parallel = [];
      this.loadGen = (this.loadGen || 0) + 1;
      this.danger = 0; this.dangerLimit = 16 + Math.random() * 20;
      this.blocked = {};             // s.block() tiles are per map visit
      (map.triggers || []).forEach(t => { t._inside = false; });
      (map.exits || []).forEach(e => { e._inside = false; });
      const st = FF7.state;
      st.locName = map.name || st.locName;
      st.mapVisits[mapId] = (st.mapVisits[mapId] || 0) + 1;
      // camera setup
      const c = map.camera || {};
      Object.assign(this.cam, { pitch: c.pitch || 50, dist: c.dist || 9.5, yaw: c.yaw || 0, fov: c.fov || 36, follow: !c.fixed, fixed: c.fixed || null, pan: null, bounds: c.bounds !== false });
      // player
      const leader = FF7.sys.party.leader();
      const lid = map.leader || (leader ? leader.id : 'cloud');
      let pos = this.resolveEntry(entry, map);
      this.entryName = typeof entry === 'string' ? entry : null;
      this.player = new F.Actor('player', opts.playerModel || map.playerModel || lid, pos[0], pos[1], pos[2]);
      this.player.isPlayer = true;
      this.player.visible = !map.hidePlayer;
      this.actors.player = this.player;
      this.actors[lid] = this.player;
      // NPCs
      (map.npcs || []).forEach(n => this.spawnNpc(n));
      // items / chests / save points / objects
      const shown = (o) => !(o.if && !safe(() => o.if(this.api)));
      (map.items || []).forEach(it => { if ((!it.id || !st.flags['got_' + it.id]) && shown(it)) this.objects.push(Object.assign({ kind: 'item', t: Math.random() * 100 }, it)); });
      (map.chests || []).forEach(ch => { if (shown(ch)) this.objects.push(Object.assign({ kind: 'chest', open: !!(ch.id && st.flags['got_' + ch.id]) }, ch)); });
      const saves = map.save ? (Array.isArray(map.save[0]) ? map.save : [map.save]) : [];
      for (let y = 0; y < this.P.h; y++) for (let x = 0; x < this.P.w; x++) if (this.P.at(x, y).save) saves.push([x, y]);
      saves.forEach(s => this.objects.push({ kind: 'save', at: s, t: 0, gp: map.saveGp || 0, paid: false }));   // saveGp: a pay-per-visit save point (the Gold Saucer's, 5 GP)
      (map.objects || []).forEach(o => this.objects.push(Object.assign({ kind: 'object' }, o)));
      // (a person who places itself once the map is up: a beaten Kupomon trainer standing aside from the way, kp_world.js)
      (map.npcs || []).forEach(n => { if (n.place && this.actors[n.id]) { try { n.place(this, this.actors[n.id]); } catch (e) { console.error('place', n.id, e); } } });
      // state location
      st.loc = { mode: 'field', map: mapId, x: pos[0], y: pos[1], dir: pos[2] || 'down' };
      (st.mapsSeen || (st.mapsSeen = {}))[mapId] = 1;   // (the maps been to: the Wonder Square fortune's treasure visions)
      // music
      if (map.music !== undefined && !opts.keepMusic) {
        const mus = typeof map.music === 'function' ? map.music(this.api) : map.music;
        if (mus === 'none' || mus === null) FF7.audio.stop(30);
        else if (mus) FF7.audio.play(mus);
      }
      this.exitGrace = true;
      this.arrivalTile = this.player.tx + ',' + this.player.ty;
      this.safePos = { x: this.player.x, z: this.player.z };
      this.updateCamera(true);
      if (map.onLoad) try { map.onLoad(this.api); } catch (e) { console.error('onLoad error', mapId, e); }
      if (map.onEnter && !opts.skipEnter) this.queue.push({ fn: map.onEnter, name: mapId + '.onEnter' });
      FF7.saveNearby = false;
      return true;
    }

    resolveEntry(entry, map) {
      map = map || this.map;
      if (Array.isArray(entry)) return [entry[0], entry[1], entry[2] || 'down'];
      const e = (map.entries || {})[entry || 'default'] || (map.entries || {}).default || (map.entries ? Object.values(map.entries)[0] : null);
      if (e) return [e[0], e[1], e[2] || 'down'];
      // fallback: first walkable tile
      for (let y = 0; y < this.P.h; y++) for (let x = 0; x < this.P.w; x++) if (this.P.walkable(x, y)) return [x, y, 'down'];
      return [1, 1, 'down'];
    }

    spawnNpc(n) {
      if (n.show && !safe(() => n.show(this.api))) return null;
      if (n.flagHide && FF7.state.flags[n.flagHide]) return null;
      if (n.flagShow && !FF7.state.flags[n.flagShow]) return null;
      const a = new F.Actor(n.id, n.model || n.id, n.at[0], n.at[1], n.dir || 'down', { name: n.name, def: n, solid: n.solid !== false, scale: n.scale, hover: n.hover });
      if (n.anim) a.playAnim(n.anim, { loop: F.animLoops(n.anim, n.animLoop) });
      if (n.wander) { a.wander = { r: n.wander, home: [n.at[0], n.at[1]], wait: 60 + U.rand(120) }; }
      this.actors[n.id] = a;
      return a;
    }

    // ---------------------------------------------------------------- scripts
    runScript(fn, opts = {}) {
      const co = new FF7.Coroutine(fn(this.api), { name: opts.name || 'script' });
      if (opts.parallel) { this.parallel.push(co); return co; }
      if (this.script && !this.script.done) { this.queue.push({ fn, name: opts.name }); return null; }
      this.script = co;
      return co;
    }
    get busy() { return !!(this.script && !this.script.done) || this.transitioning; }

    // ---------------------------------------------------------------- scene hooks
    enter() {}
    resume() { this.updateCamera(true); }

    update(canInput) {
      this.t++;
      const I = FF7.input;
      // scripts
      if (!this.script || this.script.done) {
        this.script = null;
        if (this.queue.length && !this.transitioning) { const q = this.queue.shift(); this.runScript(q.fn, { name: q.name }); }
      }
      if (this.script) this.script.update();
      // background scripts: a map load during this frame drops the previous map's loops, but keeps
      // transitions (keepOnLoad) and anything started during the load
      const gen = this.loadGen, list = this.parallel; this.parallel = [];
      const keep = list.filter(co => co.update());
      this.parallel = (this.loadGen !== gen ? keep.filter(co => co.keepOnLoad) : keep).concat(this.parallel);
      const busy = this.busy;
      // a scene's alarm (FF7.audio.SCENE_SFX) ends with the scene: cut once the player has had control back for half a
      // second (the grace lets one event run into the next: a goto, then the new map's opening)
      const A = FF7.audio;
      if (busy || !canInput) this.sceneIdle = 0;
      else if (A.scenePlaying && (this.sceneIdle = (this.sceneIdle || 0) + 1) >= 30) { A.stopSceneSfx(); this.sceneIdle = 0; }
      // player control
      const pl = this.player;
      pl.walkingInput = false;
      if (!busy && canInput && !this.transitioning && pl.jump == null) {
        if (I.pressed('menu') && FF7.state.menuEnabled !== false) { FF7.audio.sfx('confirm'); if (FF7.state.kupomon && FF7.kupomon) FF7.kupomon.openMenu(); else FF7.ui.openMainMenu(); return; }   // (in Kupomon, its own menu)
        if (I.pressed('select')) this.showMarkers = !this.showMarkers;
        if (I.pressed('ok')) { if (this.interact()) return; }
        this.movePlayer(I);
      }
      // actors
      for (const id in this.actors) {
        const a = this.actors[id];
        if (a.wander && !busy) this.wander(a);
        a.update(this);
      }
      this.objects.forEach(o => { o.t = (o.t || 0) + 1; if (o.tick) o.tick(o, this); });   // (tick: an object's own motion, every frame)
      // save point proximity
      FF7.saveNearby = this.objects.some(o => o.kind === 'save' && (!o.gp || o.paid) && Math.hypot((o.at[0] + 0.5) * F.TILE - pl.x, (o.at[1] + 0.5) * F.TILE - pl.z) < 1.1);
      // triggers & exits (only when free)
      if (!busy && !this.transitioning) {
        const key = pl.tx + ',' + pl.ty;
        if (key !== this.arrivalTile) this.exitGrace = false;
        this.checkTriggers();
        if (!this.busy) this.checkExits();
      }
      this.emotes = this.emotes.filter(e => --e.t > 0);
      if (FF7.state.loc.mode === 'field') { FF7.state.loc.x = pl.tx; FF7.state.loc.y = pl.ty; FF7.state.loc.dir = pl.dir; }
      this.updateCamera(false);
    }

    movePlayer(I) {
      const pl = this.player;
      const d = I.dir();
      if (!d.x && !d.y) { pl.moving = false; return; }
      const run = !!I.held('run') !== !!FF7.state.config.alwaysRun;   // hold C to run (to walk, when Config > Run is Always)
      pl.running = run;
      // camera-relative movement
      const yaw = (this.cam.yaw || 0) * Math.PI / 180;
      let mx = d.x, mz = d.y;
      const l = Math.hypot(mx, mz); mx /= l; mz /= l;
      // camera sits at +[sin yaw, cos yaw] from the target: screen-up = (-sin, -cos), screen-right = (cos, -sin)
      const rx = mx * Math.cos(yaw) + mz * Math.sin(yaw), rz = -mx * Math.sin(yaw) + mz * Math.cos(yaw);
      const sp = run ? 0.072 : 0.036;
      pl.targetAngle = Math.atan2(rx, rz);
      pl.walkingInput = true;
      const moved = this.tryMove(pl, rx * sp, rz * sp);
      if (moved > 0) {
        FF7.state.steps++;
        this.stepEncounter(moved);
        if (FF7.sys.party.active().some(c => c.accessory === 'cats_bell') && FF7.state.steps % 30 === 0) FF7.sys.party.active().forEach(c => { if (c.hp > 0) c.hp = Math.min(c.maxHp, c.hp + 2); });
      }
    }

    // Move an actor with collision; returns distance moved.
    tryMove(a, dx, dz) {
      const x0 = a.x, z0 = a.z;
      if (this.canStand(a, a.x + dx, a.z)) a.x += dx;
      if (this.canStand(a, a.x, a.z + dz)) a.z += dz;
      return Math.hypot(a.x - x0, a.z - z0);
    }
    canStand(a, x, z) {
      const r = a.radius, P = this.P;
      const cur = F.groundAt(P, a.x, a.z);
      const pts = [[x - r, z - r * 0.6], [x + r, z - r * 0.6], [x - r, z + r * 0.6], [x + r, z + r * 0.6]];
      for (const [px, pz] of pts) {
        const tx = Math.floor(px / F.TILE), ty = Math.floor(pz / F.TILE);
        const t = P.at(tx, ty);
        if (!t.walk) return false;
        if (this.blocked && this.blocked[tx + ',' + ty]) return false;
        const g = F.groundAt(P, px, pz);
        const cx = Math.floor(a.x / F.TILE), cy = Math.floor(a.z / F.TILE), ct = P.at(cx, cy);
        if (Math.abs(g - cur) > 0.2 && !t.stair) {
          if (!ct.stair) {
            // a body already hanging over a higher/lower tile (it came off a stair at an angle) may slide along or
            // back out of it, never further in: else it is wedged there for good
            const ox = px - x + a.x, oz = pz - z + a.z;
            const was = Math.floor(ox / F.TILE) === tx && Math.floor(oz / F.TILE) === ty;
            if (!(was && (tx === cx || (tx < cx ? px >= ox : px <= ox)) && (ty === cy || (ty < cy ? pz >= oz : pz <= oz)))) return false;
            continue;
          }
          // stepping off a stair: onto the landings at the ends of its flight, never sideways off its edge
          if (ct.steps) { if (Math.abs(g - cur) > 0.45) return false; }
          else {
            const si = F.stairInfo(P, cx, cy);
            if (si.axis === 'z' ? tx !== cx : si.axis === 'x' ? ty !== cy : Math.abs(g - cur) > 0.45) {
              // a body that came onto the stair at an angle already hangs over its side tile: it may move
              // back or along the flight, never further out (else it is wedged there for good)
              const ox = px - x + a.x, oz = pz - z + a.z;
              const back = si.axis === 'z' ? Math.floor(ox / F.TILE) === tx && (tx < cx ? px >= ox : px <= ox)
                : si.axis === 'x' ? Math.floor(oz / F.TILE) === ty && (ty < cy ? pz >= oz : pz <= oz) : false;
              if (!back) return false;
            }
          }
        }
        if (t.steps && Math.abs(g - cur) > 0.45) return false;       // free-form steps: no jumping between turns of a spiral
      }
      for (const id in this.actors) {
        const b = this.actors[id];
        if (b === a || !b.visible || !b.solid) continue;
        const dd = Math.hypot(b.x - x, b.z - z);
        if (dd < a.radius + b.radius && dd < Math.hypot(b.x - a.x, b.z - a.z)) return false;
      }
      for (const o of this.objects) {
        if (o.kind === 'chest' || (o.kind === 'object' && o.solid)) {
          const ox = (o.at[0] + 0.5) * F.TILE, oz = (o.at[1] + 0.5) * F.TILE;
          const dd = Math.hypot(ox - x, oz - z);
          if (dd < a.radius + 0.18 && dd < Math.hypot(ox - a.x, oz - a.z)) return false;
        }
      }
      return true;
    }

    wander(a) {
      const w = a.wander;
      if (a.path.length) return;
      if (--w.wait > 0) return;
      w.wait = 90 + U.rand(180);
      const tx = w.home[0] + U.randRange(-w.r, w.r), ty = w.home[1] + U.randRange(-w.r, w.r);
      if (this.P.walkable(tx, ty) && Math.hypot(tx - this.player.tx, ty - this.player.ty) > 1.5) a.moveTo([tx, ty]);
    }

    // What's in front of the player?
    interact() {
      const pl = this.player;
      const fx = pl.x + Math.sin(pl.angle) * 0.42, fz = pl.z + Math.cos(pl.angle) * 0.42;
      // NPCs
      let best = null, bd = 0.5;
      for (const id in this.actors) {
        const a = this.actors[id];
        if (a === pl || !a.visible || !a.def) continue;
        const d = Math.hypot(a.x - fx, a.z - fz);
        if (d < bd && (a.def.talk || a.def.onTalk)) { best = a; bd = d; }
      }
      if (best) {
        const def = best.def;
        const talk = def.talk || def.onTalk;
        if (def.faceOnTalk !== false) best.face(pl);
        this.runScript(talk, { name: def.id + '.talk' });
        return true;
      }
      // objects, the nearest first: two side by side (a row of arcade machines) can both be within reach of the point in
      // front of the player, and the one faced is the closer (a stable sort: on one tile, the list's order still holds)
      const near = this.objects.map(o => ({ o, d: Math.hypot((o.at[0] + 0.5) * F.TILE - fx, (o.at[1] + 0.5) * F.TILE - fz) })).sort((a, b) => a.d - b.d);
      for (const { o, d } of near) {
        const ox = (o.at[0] + 0.5) * F.TILE, oz = (o.at[1] + 0.5) * F.TILE;
        if (d > 0.5 && !(o.kind === 'item' && Math.hypot(ox - pl.x, oz - pl.z) < 0.4)) continue;
        if (o.kind === 'item') { this.pickItem(o); return true; }
        if (o.kind === 'chest' && !o.open) { this.openChest(o); return true; }
        if (o.kind === 'save' && o.gp && !o.paid) {
          this.runScript(function* (s) {
            const k = yield s.ask(null, `This save point costs ${o.gp} GP to use. (You have ${s.gp()} GP.)`, ['Use it', 'No thanks']);
            if (k !== 0) return;
            if (!s.takeGp(o.gp)) { yield s.msg("You don't have enough GP."); return; }
            o.paid = true;
            s.sfx('purchase');
            yield s.msg('The save point lights up. You can save here now.');
          }, { name: 'save point' });
          return true;
        }
        if (o.kind === 'object' && o.talk) { if (o.hidden || (o.if && !safe(() => o.if(this.api)))) continue; this.runScript(o.talk, { name: 'object' }); return true; }
      }
      // tile-based talk triggers
      for (const tr of this.map.triggers || []) {
        if (tr.on !== 'talk') continue;
        if (!this.inRect(tr.at, Math.floor(fx / F.TILE), Math.floor(fz / F.TILE))) continue;
        if (tr.if && !safe(() => tr.if(this.api))) continue;
        this.runScript(tr.run, { name: 'trigger' });
        return true;
      }
      return false;
    }

    pickItem(o) {
      const self = this;
      this.objects.splice(this.objects.indexOf(o), 1);
      if (o.id) FF7.state.flags['got_' + o.id] = true;
      this.runScript(function* (s) {
        FF7.audio.sfx('found');
        if (FF7.kupomon && FF7.kupomon.pickup && (o.kp || o.coins)) { yield* FF7.kupomon.pickup(s, o); return; }   // (Kupomon: its own bag and coins)
        if (o.gil) { FF7.sys.inv.addGil(o.gil); yield s.say(null, `Received ${U.fmtNum(o.gil)} Gil!`); return; }
        if (o.materia) { FF7.sys.materia.toStock(FF7.sys.materia.make(o.materia)); yield s.say(null, `Received "${FF7.data.materia[o.materia] ? FF7.data.materia[o.materia].name : o.materia}" Materia!`); return; }
        FF7.sys.inv.add(o.item, o.qty || 1);
        yield s.say(null, `Received "${U.itemName(o.item)}"${(o.qty || 1) > 1 ? ' x' + o.qty : ''}!`);
      }, { name: 'pickup' });
    }
    openChest(o) {
      o.open = true;
      if (o.id) FF7.state.flags['got_' + o.id] = true;
      this.runScript(function* (s) {
        FF7.audio.sfx('chest');
        yield 10;
        if (FF7.kupomon && FF7.kupomon.pickup && (o.kp || o.coins)) { yield* FF7.kupomon.pickup(s, o); return; }
        if (o.gil) { FF7.sys.inv.addGil(o.gil); yield s.say(null, `Received ${U.fmtNum(o.gil)} Gil!`); return; }
        if (o.materia) { FF7.sys.materia.toStock(FF7.sys.materia.make(o.materia)); yield s.say(null, `Received "${FF7.data.materia[o.materia] ? FF7.data.materia[o.materia].name : o.materia}" Materia!`); return; }
        FF7.sys.inv.add(o.item, o.qty || 1);
        yield s.say(null, `Received "${U.itemName(o.item)}"${(o.qty || 1) > 1 ? ' x' + o.qty : ''}!`);
      }, { name: 'chest' });
    }

    inRect(at, tx, ty) {
      const w = at[2] || 1, h = at[3] || 1;
      return tx >= at[0] && tx < at[0] + w && ty >= at[1] && ty < at[1] + h;
    }

    checkTriggers() {
      const pl = this.player;
      for (const tr of this.map.triggers || []) {
        if (tr.on === 'talk') continue;
        const flag = tr.id ? 'trig_' + this.map.id + '_' + tr.id : null;
        if (tr.once !== false && flag && FF7.state.flags[flag]) continue;
        if (!this.inRect(tr.at, pl.tx, pl.ty)) { tr._inside = false; continue; }
        if (tr._inside) continue;
        tr._inside = true;
        if (tr.if && !safe(() => tr.if(this.api))) continue;
        if (flag && tr.once !== false) FF7.state.flags[flag] = true;
        pl.moving = false;
        this.runScript(tr.run, { name: 'trigger ' + (tr.id || '') });
        return;
      }
    }

    checkExits() {
      const pl = this.player;
      let inAny = false;
      for (const ex of this.map.exits || []) {
        if (!this.inRect(ex.at, pl.tx, pl.ty)) { ex._inside = false; continue; }
        inAny = true;
        if (this.exitGrace || ex._inside) continue;     // fire once per entry into the rect
        ex._inside = true;
        if (ex.if && !safe(() => ex.if(this.api))) {
          const self = this;
          if (ex.blocked) this.runScript(function* (s) { yield* runSub(ex.blocked, s); self.bump(); }, { name: 'exit-blocked' });
          else this.bump();
          return;
        }
        if (ex.run) {
          const self = this;
          // if the run script doesn't leave the map (e.g. "not yet" / "No"), put the player back
          const mapBefore = this.map;
          this.runScript(function* (s) { yield* runSub(ex.run, s); if (self.map === mapBefore && !self.transitioning && self.inRect(ex.at, self.player.tx, self.player.ty)) self.bump(); }, { name: 'exit' });
          return;
        }
        this.exitTo(ex);
        return;
      }
      if (!inAny) this.safePos = { x: pl.x, z: pl.z };
    }
    bump() {
      // put the player back where they stood before stepping onto the exit
      const pl = this.player;
      if (this.safePos) { pl.x = this.safePos.x; pl.z = this.safePos.z; pl.y = F.groundAt(this.P, pl.x, pl.z); }
      else { pl.x -= Math.sin(pl.angle) * 0.25; pl.z -= Math.cos(pl.angle) * 0.25; }
      pl.moving = false;
      (this.map.exits || []).forEach(e => { if (!this.inRect(e.at, pl.tx, pl.ty)) e._inside = false; });
    }
    exitTo(ex) {
      if (ex.to === 'world') { this.transitionWorld(ex.loc || ex.to, ex); return; }
      this.goto(ex.to, ex.entry, { sfx: ex.sfx });
    }

    // Fade out → load → fade in. Returns a waitable.
    goto(mapId, entry, opts = {}) {
      const self = this;
      const w = { done: false };
      this.transitioning = true;
      const S = FF7.sceneMgr;
      if (opts.sfx) FF7.audio.sfx(opts.sfx);
      const co = new FF7.Coroutine((function* () {
        yield S.fadeOut(opts.fade != null ? opts.fade : 14);
        self.load(mapId, entry, opts);
        yield 2;
        self.transitioning = false;
        yield S.fadeIn(opts.fade != null ? opts.fade : 14);
        w.done = true;
      })());
      co.keepOnLoad = true;
      this.parallel.push(co);
      return w;
    }
    transitionWorld(loc, ex) {
      const self = this;
      this.transitioning = true;
      if (FF7.audio.stopSceneSfx) FF7.audio.stopSceneSfx(16);
      const S = FF7.sceneMgr;
      this.parallel.push(new FF7.Coroutine((function* () {
        yield S.fadeOut(16);
        self.transitioning = false;
        const ws = FF7.world.enter(ex && ex.wx != null ? { x: ex.wx, y: ex.wy } : (ex && ex.loc ? ex.loc : self.map.worldLoc || null));
        ws.parallel.push(new FF7.Coroutine((function* () { yield S.fadeIn(16); })()));
      })()));
    }

    // ---------------------------------------------------------------- encounters
    stepEncounter(dist) {
      if (FF7.state.kupomon && FF7.kupomon && FF7.kupomon.repelStep) FF7.kupomon.repelStep(this, dist);   // (a Pom Spray wearing down, every step: kp_repel.js)
      if (this.map.kpWild && FF7.kupomon) { if (this.kpLimit == null) this.kpLimit = 3 + Math.random() * 3; FF7.kupomon.step(this, dist); return; }   // (Kupomon's tall grass)
      const b = this.map.battle;
      if (!b || !b.table) return;
      if (b.if && !safe(() => b.if(this.api))) return;
      if (FF7.state.flags.noEncounters) return;
      const cfg = FF7.state.config.encounters;
      if (cfg === 'off') return;
      let mult = (b.rate || 1) * (cfg === 'half' ? 0.5 : 1);
      mult *= FF7.sys.materia.encounterFactor(false);        // Enemy Lure / Enemy Away (FF7's Enemy Lure Value)
      this.danger += dist * mult;
      if (this.danger >= this.dangerLimit) {
        this.danger = 0; this.dangerLimit = 16 + Math.random() * 22;
        const table = FF7.data.encounters[b.table];
        if (!table || !table.length) return;
        const f = U.weighted(table, 'w');
        this.player.moving = false;
        this.runScript(function* (s) { yield s.battle({ formation: f, bg: b.bg, music: b.music, random: true }); }, { name: 'encounter' });
      }
    }

    // ---------------------------------------------------------------- camera
    updateCamera(snap) {
      const c = this.cam, pl = this.player;
      let tx, ty, tz;
      if (c.pan) {
        c.pan.t++;
        const k = c.pan.n ? Math.min(1, c.pan.t / c.pan.n) : 1;
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        tx = U.lerp(c.pan.fx, c.pan.x, e); tz = U.lerp(c.pan.fz, c.pan.z, e); ty = U.lerp(c.pan.fy, c.pan.y, e);
        if (k >= 1 && c.pan.release) c.pan = null;
      } else if (c.follow && pl) {
        tx = pl.x; tz = pl.z; ty = pl.y + 0.5;
      } else { tx = c.tx; tz = c.tz; ty = c.ty || 0.5; }
      // keep inside the map
      if (c.bounds && !c.pan && this.geo) {
        const W = this.geo.width, D = this.geo.depth;
        const mx = Math.min(W / 2, 3.6 * (c.dist / 7.2));
        tx = U.clamp(tx, mx, Math.max(mx, W - mx));
        tz = U.clamp(tz, Math.min(D / 2, 1.6 * (c.dist / 7.2)), Math.max(Math.min(D / 2, 1.6 * (c.dist / 7.2)), D - Math.min(D / 2, 2.2 * (c.dist / 7.2))));
      }
      if (snap || !isFinite(c.x)) { c.x = tx; c.y = ty; c.z = tz; }
      else { c.x += (tx - c.x) * 0.2; c.y += (ty - c.y) * 0.2; c.z += (tz - c.z) * 0.2; }
    }
    cameraEye() {
      const c = this.cam;
      if (c.fixed) return { eye: c.fixed.slice(0, 3), target: c.fixed.slice(3, 6) };
      const p = c.pitch * Math.PI / 180, yaw = c.yaw * Math.PI / 180;
      const off = [Math.sin(yaw) * Math.cos(p) * c.dist, Math.sin(p) * c.dist, Math.cos(yaw) * Math.cos(p) * c.dist];
      let sx = 0, sy = 0;
      if (FF7.sceneMgr.shake.frames > 0) { sx = (Math.random() - 0.5) * 0.05; sy = (Math.random() - 0.5) * 0.05; }
      return { eye: [c.x + off[0] + sx, c.y + off[1] + sy, c.z + off[2]], target: [c.x + sx, c.y + sy, c.z] };
    }

    // ---------------------------------------------------------------- render
    render() {
      const c = R.ctx, th = this.geo.th;
      // sky / background gradient
      const g = c.createLinearGradient(0, 0, 0, FF7.H);
      g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
      c.fillStyle = g; c.fillRect(0, 0, FF7.W, FF7.H);
      if (th.clouds) drawClouds(c, th.clouds, this.t);
      if (th.skyline) drawSkyline(c, th.skyline, this.t);
      const fog = th.fog;
      GL.begin({ clear: [0, 0, 0, 0], fog: fog ? { color: fog.color, near: fog.near * (this.cam.dist / 7.2), far: fog.far * (this.cam.dist / 7.2) } : null, light: { dir: th.lightDir, color: th.light, ambient: th.ambient } });
      const { eye, target } = this.cameraEye();
      GL.camera(eye, target, this.cam.fov, 0.1, 120);
      GL.draw(this.geo.mesh, null);
      (this.geo.floors || []).forEach(f => GL.draw(f.mesh, null));
      (this.geo.walls || []).forEach(f => GL.draw(f.mesh, null));
      const occl = this.geo.occluders || [];
      this.updateOccluders(eye);
      occl.forEach(o => { if (o.alpha > 0.98) (o.meshes || [o.mesh]).forEach(m => GL.draw(m, null)); });
      if (this.geo.glow) GL.draw(this.geo.glow, null, { add: [0.08 * Math.sin(this.t * 0.05), 0.08 * Math.sin(this.t * 0.05), 0.06 * Math.sin(this.t * 0.05)] });
      drawFires(this);
      // dynamic objects
      this.objects.forEach(o => drawObject(o, this));
      // shadows + actors
      for (const id in this.actors) { const a = this.actors[id]; if (id !== 'player' && a === this.player) continue; if (a.visible) drawShadow(a); }
      for (const id in this.actors) { const a = this.actors[id]; if (id !== 'player' && a === this.player) continue; a.draw(); }
      if (this.geo.water) GL.draw(this.geo.water, null, { blend: 'alpha', add: [0.03 * Math.sin(this.t * 0.04), 0.03 * Math.sin(this.t * 0.04), 0.05 * Math.sin(this.t * 0.03)] });
      occl.forEach(o => { if (o.alpha <= 0.98) (o.meshes || [o.mesh]).forEach(m => GL.draw(m, null, { blend: 'alpha', tint: [1, 1, 1, o.alpha] })); });
      GL.end();
      if (th.rain) drawRain(c, th.rain, this.t);
      // 2D overlays
      if (this.showMarkers || FF7.state.config.exitMarkers) this.drawMarkers();
      this.drawEmotes();
      if (FF7.state.timer) drawTimer();
      if (this.onRender2D) this.onRender2D(c);
    }
    // Free-standing blocks between the camera and the player (or the camera's focus) fade out.
    updateOccluders(eye) {
      const occl = this.geo.occluders; if (!occl || !occl.length) return;
      const pts = [];
      const pl = this.player;
      if (pl && pl.visible !== false) pts.push([pl.x, pl.y + 0.25, pl.z], [pl.x, pl.y + 1.3, pl.z]);
      if (this.cam && isFinite(this.cam.x) && (!pl || Math.hypot(this.cam.x - pl.x, this.cam.z - pl.z) > 1)) pts.push([this.cam.x, this.cam.y, this.cam.z]);
      const hides = (o, q) => {   // does the segment eye -> q pass through the block's box below its top?
        let t0 = 0, t1 = 1;
        const d = [q[0] - eye[0], q[1] - eye[1], q[2] - eye[2]];
        const lo = [o.box[0] - 0.05, -1e9, o.box[1] - 0.05], hi = [o.box[2] + 0.05, o.top, o.box[3] + 0.05];
        for (const k of [0, 1, 2]) {
          if (Math.abs(d[k]) < 1e-6) { if (eye[k] < lo[k] || eye[k] > hi[k]) return false; continue; }
          let a = (lo[k] - eye[k]) / d[k], b = (hi[k] - eye[k]) / d[k]; if (a > b) [a, b] = [b, a];
          t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return false;
        }
        return t1 > 0 && t0 < 0.97;
      };
      occl.forEach(o => {
        const want = pts.some(q => hides(o, q)) ? 0.18 : 1;
        o.alpha += (want - o.alpha) * 0.18; if (Math.abs(want - o.alpha) < 0.01) o.alpha = want;
      });
    }
    drawMarkers() {
      const c = R.ctx;
      const pulse = 0.6 + Math.sin(this.t * 0.12) * 0.25;
      (this.map.exits || []).forEach(ex => {
        if (ex.hidden) return;
        if (ex.if && !ex.blocked && !safe(() => ex.if(this.api))) return;   // (a way that isn't there yet; a locked door with a message keeps its marker)
        const cx = ex.at[0] + (ex.at[2] || 1) / 2, cy = ex.at[1] + (ex.at[3] || 1) / 2;
        const p = GL.project([cx * F.TILE, F.groundAt(this.P, cx * F.TILE, cy * F.TILE) + 0.05, cy * F.TILE]);
        if (!p.visible) return;
        c.save(); c.globalAlpha = pulse; c.fillStyle = '#ff3030'; c.strokeStyle = '#400000';
        c.beginPath(); c.moveTo(p.x, p.y + 6); c.lineTo(p.x - 8, p.y - 6); c.lineTo(p.x + 8, p.y - 6); c.closePath(); c.fill(); c.stroke(); c.restore();
      });
      if (this.showMarkers) {
        const hp = GL.project(this.player.headPos());
        c.save(); c.fillStyle = '#ffffff'; c.globalAlpha = 0.9;
        c.beginPath(); c.moveTo(hp.x, hp.y - 4); c.lineTo(hp.x - 7, hp.y - 16); c.lineTo(hp.x + 7, hp.y - 16); c.closePath(); c.fill(); c.restore();
        this.objects.forEach(o => { if (o.kind !== 'item' || !o.at) return; });
      }
    }
    drawEmotes() {
      const c = R.ctx;
      this.emotes.forEach(e => {
        const a = this.actors[e.id]; if (!a) return;
        const p = GL.project(a.headPos());
        const y = p.y - 26 - Math.min(8, (60 - e.t) * 1.5);
        c.save();
        c.fillStyle = '#ffffff'; c.strokeStyle = '#202030'; c.lineWidth = 2;
        R.roundRect(c, p.x - 16, y - 16, 32, 26, 8); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(p.x - 4, y + 10); c.lineTo(p.x, y + 16); c.lineTo(p.x + 4, y + 10); c.fill();
        c.fillStyle = e.color || '#d02020'; c.font = 'bold 20px ' + R.FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(e.text, p.x, y - 3);
        c.restore();
      });
    }
  }
  // run a script function inside another coroutine (generator fn, or plain fn returning a waitable)
  function* runSub(fn, s) { const r = fn(s); if (r && typeof r.next === 'function') yield* r; else if (r) yield r; }
  function safe(fn) { try { return fn(); } catch (e) { console.error(e); return false; } }

  // ---- dynamic object meshes
  const objMeshes = {};
  function objMesh(key, build) { return objMeshes[key] || (objMeshes[key] = (() => { const mb = new FF7.MeshBuilder(); build(mb); return mb.build(); })()); }
  const M = FF7.M4.create();
  function drawObject(o, field) {
    if (o.hidden) return;
    // (o.y0: a fixed height instead of the ground under it: the ropeway car hanging out over the drop)
    const x = (o.at[0] + 0.5) * F.TILE, z = (o.at[1] + 0.5) * F.TILE, y = o.y0 != null ? o.y0 : F.groundAt(field.P, x, z);
    if (o.kind === 'save') {
      // FF7 save point: floating, spinning, colour-cycling crystal
      const hue = (field.t * 2) % 360;
      const col = hslToRgb(hue / 360, 0.8, 0.6);
      const mesh = objMesh('save', mb => { mb.spike([0, 0, 0], [0, 1, 0], 0.32, 0.14, 4, '#ffffff'); mb.spike([0, 0, 0], [0, -1, 0], 0.22, 0.14, 4, '#ffffff'); });
      FF7.M4.trs(M, [x, y + 0.75 + Math.sin(field.t * 0.05) * 0.06, z], [0, field.t * 0.05, 0], [1, 1, 1]);
      GL.draw(mesh, M, { unlit: true, tint: [col[0], col[1], col[2], 1] });
      const ring = objMesh('savering', mb => mb.prism(0, 0, 0, 0.3, 0.3, 0.01, 12, '#ffffff'));
      FF7.M4.trs(M, [x, y + 0.02, z], [0, 0, 0], [1, 1, 1]);
      GL.draw(ring, M, { unlit: true, blend: 'add', tint: [col[0], col[1], col[2], 0.35] });
    } else if (o.kind === 'item') {
      const isM = !!o.materia;
      const c = isM ? FF7.glColor(FF7.sys.materia.color(o.materia)) : [0.75, 0.85, 1, 1];
      const mesh = objMesh('orb', mb => mb.sphere(0, 0, 0, 0.07, 0.07, 0.07, '#ffffff', 8, 6, true));
      const b = 0.2 + Math.sin(o.t * 0.08) * 0.04;
      FF7.M4.trs(M, [x, y + b, z], [0, 0, 0], [1, 1, 1]);
      GL.draw(mesh, M, { tint: c, add: [0.25, 0.25, 0.25] });
      const glow = objMesh('glow', mb => mb.sphere(0, 0, 0, 0.14, 0.14, 0.14, '#ffffff', 8, 6, true));
      GL.draw(glow, M, { unlit: true, blend: 'add', tint: [c[0], c[1], c[2], 0.25 + Math.sin(o.t * 0.15) * 0.1] });
    } else if (o.kind === 'chest') {
      const mesh = objMesh('chest', mb => { mb.box(0, 0.12, 0, 0.36, 0.24, 0.26, { side: '#8a5a2a', top: '#a06a30', front: '#8a5a2a' }); mb.box(0, 0.12, 0.131, 0.06, 0.08, 0.01, '#e0c040'); });
      const lid = objMesh('lid', mb => { mb.box(0, 0.04, 0.13, 0.38, 0.08, 0.28, { side: '#9a6a30', top: '#b07a38' }); });
      FF7.M4.trs(M, [x, y, z], [0, o.rot || 0, 0], [1, 1, 1]);
      GL.draw(mesh, M);
      const lm = FF7.M4.create();
      FF7.M4.trs(lm, [0, 0.24, -0.13], [o.open ? -1.6 : 0, 0, 0], [1, 1, 1]);
      FF7.M4.mul(lm, M, lm);
      GL.draw(lid, lm);
    } else if (o.kind === 'object' && o.prop && F.props[o.prop]) {
      // a prop that can move (the 7th Heaven pinball lift): drawn over `pad` floor slabs ([dx, dy] tiles
      // from `at`), lifted or sunk by `hover` (m); the tiles under it are liftpad / liftblock (no floor).
      // A prop that changes shape (the Ancient Forest's plants) names its current shape in `stateKey`: each
      // shape is built once. `scl` [x, y, z] squashes it (a springing flower).
      const key = o.stateKey || '', cache = o._meshes || (o._meshes = {});
      if (!cache[key]) {
        const mb = new FF7.MeshBuilder(), T = F.TILE, th = field.geo.th, fc = o.padCol || (Array.isArray(th.floor) ? th.floor[0] : th.floor);
        (o.pad || []).forEach(([dx, dy]) => mb.box(dx * T, -0.06, dy * T, T, 0.12, T, { top: fc, side: FF7.util.shade(fc, -0.35) }));
        F.props[o.prop](mb, 0, 0, 0, T, th, {}, o);
        cache[key] = mb.build();
      }
      FF7.M4.trs(M, [x, y + (o.hover || 0), z], [0, (o.rot || 0) * Math.PI / 180, 0], o.scl || [1, 1, 1]);
      GL.draw(cache[key], M);
    } else if (o.kind === 'object' && o.model) {
      // a character, enemy ({ enemy }) or vehicle ({ vehicle }) model; `hover` lifts it off the ground (m)
      if (!o._model) { o._model = F.buildModel(o.model); }
      o._model.position = [x, y + (o.hover || 0), z]; o._model.rotY = F.dirAngle(o.dir || 'down'); o._model.scale = F.CHAR_SCALE * (o.scale || 1) * (o._model.baseScale || 1); o._model.update(1); o._model.draw();
    }
  }
  // look.skyline: a far silhouette on the sky backdrop, behind the 3D scene. 'midgar' (or { y, col, glow }): the plate on
  // its pillars, the Shinra building rising from the middle, the eight reactors' stacks with their green glow
  // (Zack's last stand, js/maps/extra/flashbacks.js)
  function drawSkyline(c, o, t) {
    const opt = typeof o === 'object' ? o : {}, W = FF7.W, y0 = (opt.y || 0.2) * FF7.H;
    const col = opt.col || '#20222a', glow = rgbOf(opt.glow || '80,255,160'), cx = W * (opt.x || 0.5), rw = W * 0.34;
    c.save();
    // the reactors' glow under the plate
    const gr = c.createRadialGradient(cx, y0, 4, cx, y0, rw * 1.2);
    gr.addColorStop(0, 'rgba(' + glow + ',0.22)'); gr.addColorStop(1, 'rgba(' + glow + ',0)');
    c.fillStyle = gr; c.fillRect(cx - rw * 1.3, y0 - rw * 0.5, rw * 2.6, rw);
    c.fillStyle = col;
    // pillars and the plate
    for (let i = -6; i <= 6; i++) c.fillRect(cx + i * rw / 6.5 - 2, y0 - 4, 4, 18);
    c.beginPath(); c.ellipse(cx, y0 - 6, rw, 7, 0, 0, Math.PI * 2); c.fill();
    // the city on the plate, the Shinra tower in the middle
    for (let i = -9; i <= 9; i++) { const h = 6 + FF7.util.hash(i, 3, 17) * 12; c.fillRect(cx + i * rw / 10 - 5, y0 - 8 - h, 10, h); }
    c.beginPath(); c.moveTo(cx - 12, y0 - 10); c.lineTo(cx - 8, y0 - 58); c.lineTo(cx + 8, y0 - 58); c.lineTo(cx + 12, y0 - 10); c.fill();
    c.fillRect(cx - 4, y0 - 66, 8, 10);
    // the reactor stacks, their lights
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2, x = cx + Math.cos(a) * rw * 0.85, yy = y0 - 6 + Math.sin(a) * 5;
      c.fillStyle = col; c.fillRect(x - 3, yy - 22, 6, 18);
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.05 + k);
      c.fillStyle = 'rgba(' + glow + ',' + (0.35 + pulse * 0.4) + ')'; c.fillRect(x - 2, yy - 24, 4, 3);
    }
    c.restore();
  }
  // look.rain: thin slanting streaks over the whole scene (true, or { n, alpha, col })
  function drawRain(c, o, t) {
    const opt = o === true ? {} : o, n = opt.n || 90, al = opt.alpha != null ? opt.alpha : 0.28, col = rgbOf(opt.col || '190,200,220');
    c.save(); c.strokeStyle = 'rgba(' + col + ',' + al + ')'; c.lineWidth = 1; c.beginPath();
    for (let i = 0; i < n; i++) {
      const h = (k) => FF7.util.hash(i, k, 53);
      const x = (h(1) * (FF7.W + 80) - t * 2.2 * (0.8 + h(3) * 0.4)) % (FF7.W + 80), y = (h(2) * FF7.H + t * 14 * (0.8 + h(4) * 0.5)) % FF7.H;
      const xx = x < 0 ? x + FF7.W + 80 : x;
      c.moveTo(xx, y); c.lineTo(xx - 5, y + 16);
    }
    c.stroke(); c.restore();
  }
  // look.clouds: soft cloud banks drifting across the sky backdrop (seen through the Highwind's window).
  // true, or { col, alpha, n, speed } (col: 'r,g,b' or '#rrggbb')
  const rgbOf = (col) => {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(col).trim());
    return m ? [1, 2, 3].map(i => parseInt(m[i], 16)).join(',') : String(col);
  };
  function drawClouds(c, o, t) {
    const opt = o === true ? {} : o, n = opt.n || 16, col = rgbOf(opt.col || '255,255,255'), al = opt.alpha != null ? opt.alpha : 0.34, sp = opt.speed != null ? opt.speed : 0.12;
    c.save();
    for (let i = 0; i < n; i++) {
      const h = (k) => FF7.util.hash(i, k, 91);
      const w = 120 + h(1) * 220, hgt = w * (0.18 + h(2) * 0.12), y = 20 + h(3) * FF7.H * 0.7;
      const x = ((h(4) * (FF7.W + 500) + t * sp * (0.6 + h(5))) % (FF7.W + 500)) - 250;
      for (let k = 0; k < 4; k++) {
        const cx = x + (k - 1.5) * w * 0.26, cy = y + (k % 2) * hgt * 0.25, r = w * (0.22 + 0.08 * ((k + i) % 3));
        const gr = c.createRadialGradient(cx, cy, 0, cx, cy, r);
        gr.addColorStop(0, 'rgba(' + col + ',' + (al * (0.7 + h(6 + k) * 0.3)) + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
        c.fillStyle = gr; c.beginPath(); c.ellipse(cx, cy, r, r * hgt / w * 1.6, 0, 0, Math.PI * 2); c.fill();
      }
    }
    c.restore();
  }
  // campfire flames (fieldgeo geo.fires): the shared flame mesh, flickering in size and brightness
  const FM = FF7.M4.create();
  function drawFires(field) {
    const fires = field.geo.fires; if (!fires || !fires.length) return;
    const mesh = F.flameMesh();
    fires.forEach((f, i) => {
      const t = field.t + i * 37, k = f.size || 1;
      const fl = 1 + 0.16 * Math.sin(t * 0.43) * Math.sin(t * 0.17 + i) + 0.06 * Math.sin(t * 1.3);
      FF7.M4.trs(FM, f.pos, [0, t * 0.03, 0], [k * (1 + 0.05 * Math.sin(t * 0.31)), k * fl, k * (1 + 0.05 * Math.cos(t * 0.27))]);
      GL.draw(mesh, FM, { unlit: true });
      FF7.M4.trs(FM, f.pos, [0, -t * 0.02, 0], [k * 1.3, k * fl * 1.2, k * 1.3]);
      GL.draw(mesh, FM, { unlit: true, blend: 'add', tint: [1, 1, 1, 0.3 + 0.1 * Math.sin(t * 0.5)] });
    });
  }
  function hslToRgb(h, s, l) {
    const f = (n) => { const k = (n + h * 12) % 12; const a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return [f(0), f(8), f(4)];
  }
  F.hslToRgb = hslToRgb;
  const shadowMesh = (() => { const mb = new FF7.MeshBuilder(); mb.prism(0, 0, 0, 0.2, 0.2, 0.001, 10, '#000000', false, true, false); return mb.build(); })();
  function drawShadow(a) {
    FF7.M4.trs(M, [a.x, a.y + 0.012, a.z], [0, 0, 0], [a.scale || 1, 1, (a.scale || 1) * 0.8]);
    GL.draw(shadowMesh, M, { blend: 'alpha', tint: [1, 1, 1, 0.35], unlit: true });
  }
  function drawTimer() { R.drawTimer(); }

  F.FieldScene = FieldScene;
  // Global accessor
  FF7.fieldScene = null;
  F.start = function (mapId, entry) {
    const fs = FF7.fieldScene = new FieldScene();
    FF7.sceneMgr.set(fs);
    fs.load(mapId, entry);
    return fs;
  };
})();
