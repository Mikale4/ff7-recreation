// Field actors: the player and NPCs, each with a 3D model, position (world units), facing
// and movement queue. Tile coords (tx,ty) map to world x = (tx+0.5)*TILE, z = (ty+0.5)*TILE.
(function () {
  const U = FF7.util, F = FF7.field;
  const DIRS = { down: 0, up: Math.PI, right: Math.PI / 2, left: -Math.PI / 2 };
  F.DIRS = DIRS;
  F.dirAngle = (d) => typeof d === 'number' ? d : (DIRS[d] != null ? DIRS[d] : 0);
  F.angleDir = (a) => {
    a = ((a % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    if (Math.abs(a) < Math.PI / 4) return 'down';
    if (Math.abs(a) > Math.PI * 3 / 4) return 'up';
    return a > 0 ? 'right' : 'left';
  };

  class Actor {
    constructor(id, app, tx, ty, dir, opts = {}) {
      this.id = id;
      this.app = app;
      this.model = F.buildModel(app);
      this.x = (tx + 0.5) * F.TILE; this.z = (ty + 0.5) * F.TILE; this.y = 0;
      this.angle = F.dirAngle(dir || 'down'); this.targetAngle = this.angle;
      this.visible = opts.visible !== false;
      this.solid = opts.solid !== false;
      this.radius = opts.radius || 0.17;
      this.speed = 0.035;          // world units per frame (walk)
      this.path = [];
      this.moving = false;
      this.running = false;
      this.animOverride = null;
      this.name = opts.name || null;
      this.def = opts.def || null;
      this.scale = opts.scale || 1;
      this.lift = 0;                 // vertical offset (jumps, floating)
      this.hover = opts.hover || (app && typeof app === 'object' && app.hover) || 0;   // resting height above the ground (hovering set pieces)
      this.hoverTo = null;
      this.jump = null;
      this.onArrive = null;
    }
    get tx() { return Math.floor(this.x / F.TILE); }
    get ty() { return Math.floor(this.z / F.TILE); }
    get dir() { return F.angleDir(this.angle); }
    setTile(tx, ty) { this.x = (tx + 0.5) * F.TILE; this.z = (ty + 0.5) * F.TILE; this.path = []; this.moving = false; }
    face(d) {
      if (d && typeof d === 'object' && d.x != null) d = Math.atan2(d.x - this.x, d.z - this.z);
      this.targetAngle = F.dirAngle(d); this.angle = this.targetAngle;
    }
    turnTo(d) { if (d && typeof d === 'object' && d.x != null) d = Math.atan2(d.x - this.x, d.z - this.z); this.targetAngle = F.dirAngle(d); }
    // Queue movement to tile coords (fractional allowed). Returns a waitable.
    moveTo(points, opts = {}) {
      if (!Array.isArray(points[0])) points = [points];
      for (const p of points) this.path.push({ x: (p[0] + 0.5) * F.TILE, z: (p[1] + 0.5) * F.TILE });
      this.running = !!opts.run;
      this.moveSpeed = opts.speed || (opts.run ? 0.075 : 0.035);
      this.reversing = !!opts.reverse;   // backs along the path, facing away from it (a truck reversing)
      this.faceWhenDone = opts.face || null;
      const self = this;
      return { get done() { return self.path.length === 0 && !self.moving; } };
    }
    playAnim(name, opts) { this.animOverride = name; this.model.play(this.model.anims[name] || name, opts); }
    clearAnim() { this.animOverride = null; }
    update(field) {
      // path following
      if (this.path.length) {
        const p = this.path[0];
        const dx = p.x - this.x, dz = p.z - this.z;
        const d = Math.hypot(dx, dz);
        const sp = this.moveSpeed || this.speed;
        if (d <= sp) { this.x = p.x; this.z = p.z; this.path.shift(); if (!this.path.length) { this.moving = false; if (this.faceWhenDone) this.face(this.faceWhenDone); } }
        else { this.x += dx / d * sp; this.z += dz / d * sp; this.moving = true; this.targetAngle = Math.atan2(dx, dz) + (this.reversing ? Math.PI : 0); }
      }
      // smooth turning
      let da = this.targetAngle - this.angle;
      da = ((da + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      this.angle += Math.abs(da) < 0.25 ? da : Math.sign(da) * 0.25;
      // ground height
      if (field && field.P) this.y = F.groundAt(field.P, this.x, this.z);
      if (this.hoverTo) { const h = this.hoverTo; h.t++; const k = Math.min(1, h.t / h.n), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; this.hover = U.lerp(h.from, h.to, e); if (k >= 1) this.hoverTo = null; }
      if (this.jump) {
        this.jump.t++;
        const k = this.jump.t / this.jump.n;
        this.x = U.lerp(this.jump.fx, this.jump.tx, k); this.z = U.lerp(this.jump.fz, this.jump.tz, k);
        this.lift = Math.sin(k * Math.PI) * this.jump.h;
        if (k >= 1) { this.lift = 0; this.jump = null; }
      }
      // animation state
      const m = this.model;
      if (!this.animOverride) {
        let want = this.moving || this.walkingInput ? (this.running ? 'run' : 'walk') : 'idle';
        if (this.carry && m.bones && m.bones.handL) want = want === 'idle' ? 'carry' : 'carry_' + want;   // holding something overhead
        m.play(m.anims[want] || want);
      }
      m.update(1);
    }
    draw() {
      if (!this.visible) return;
      const m = this.model;
      m.position = [this.x, this.y + this.lift + this.hover, this.z];
      m.rotY = this.angle;
      m.scale = F.CHAR_SCALE * this.scale * (m.baseScale || 1);
      m.draw();
      if (this.carry) this.drawCarry(m);
    }
    // what the actor holds overhead (actor.carry: a model appearance, as for NPCs; carryScale): on its hands
    drawCarry(m) {
      if (!this._carry || this._carry.app !== this.carry) this._carry = { app: this.carry, model: F.buildModel(this.carry) };
      const c = this._carry.model, hands = m.bones && m.bones.handL && m.bones.handR;
      let p;
      if (hands) { const l = m.bones.handL.world, r = m.bones.handR.world; p = [(l[12] + r[12]) / 2, (l[13] + r[13]) / 2, (l[14] + r[14]) / 2]; }
      else p = this.headPos();
      c.position = [p[0], p[1] + (this.carryLift != null ? this.carryLift : 0.01), p[2]]; c.rotY = this.angle;
      c.scale = F.CHAR_SCALE * (this.carryScale || 1) * (c.baseScale || 1);
      c.update(1); c.draw();
    }
    headPos() { return [this.x, this.y + this.lift + this.hover + (this.model.height || 1) * F.CHAR_SCALE * this.scale + 0.05, this.z]; }
  }
  F.Actor = Actor;
  // Does an actor's pose loop? One-shot moves (a fall, a flinch, a nod...) play once and hold their last frame -
  // a body lying on the floor stays down instead of falling over and over; `loop` given explicitly wins.
  const ONE_SHOT = ['nod', 'shake', 'jump', 'hurt', 'dead', 'slash', 'punch', 'kick', 'cast', 'item'];
  F.animLoops = (name, loop) => loop != null ? !!loop : !ONE_SHOT.includes(name) && ((FF7.anims && FF7.anims[name]) || {}).loop !== false;
  F.CHAR_SCALE = 0.95;

  const modelCache = {};
  // app: preset id / appearance object, or { enemy: 'guard_scorpion' } to show an enemy model in a field
  F.buildModel = function (app) {
    if (app && typeof app === 'object' && app.vehicle) {
      // vehicles / big props as field actors: { vehicle: 'buggy' | 'truck' | 'shinra_helicopter' ..., opts: build options
      // ({ cars: 1, wreck: true } for a rusted train) }
      let m = null;
      if (FF7.vehicles3d && FF7.vehicles3d.has && FF7.vehicles3d.has(app.vehicle)) { try { m = FF7.vehicles3d.build(app.vehicle, Object.assign({ style: 'field' }, app.opts)); } catch (e) { console.error(e); } }
      if (!m) m = FF7.creatures.build({ type: 'machine' }, app.vehicle);
      m.baseScale = (app.scale || 1) / F.CHAR_SCALE;
      m.anims = m.anims || {}; ['idle', 'walk', 'run'].forEach(k => { if (!m.anims[k]) m.anims[k] = m.anims.move || m.anims.idle || 'e_idle'; });
      return m;
    }
    if (app && typeof app === 'object' && app.creature) {
      // a creature model as a field actor (the Ancient Forest's insects): { creature: { type: 'insect', c1, c2, c3 }, scale }
      const m = FF7.creatures.build(app.creature, 'npc');
      m.baseScale = (app.scale || 1) / F.CHAR_SCALE;
      m.anims = m.anims || {}; ['idle', 'walk', 'run'].forEach(k => { if (!m.anims[k]) m.anims[k] = 'e_idle'; });
      return m;
    }
    if (app && typeof app === 'object' && app.prop && F.props && F.props[app.prop]) {
      // a field prop as an actor, to talk to, pick up or carry (the Ancient Forest's frogs and beehives): { prop, scale,
      // height, ...the prop's options }. It doesn't animate.
      const m = new FF7.Model(); m.bone('root', null, [0, 0, 0]);
      const mb = new FF7.MeshBuilder(); F.props[app.prop](mb, 0, 0, 0, F.TILE, {}, {}, app);
      m.attach('root', mb.build());
      m.baseScale = (app.scale || 1) / F.CHAR_SCALE;
      m.clips = { still: { dur: 60, fn() {} } }; m.anims = { idle: 'still', walk: 'still', run: 'still' };
      if (F.props[app.prop].rig) F.props[app.prop].rig(m, app);   // (a prop with moving parts: its own bones and idle clip, the Shinra Recycler's)
      m.height = app.height || 0.5;
      return m;
    }
    if (app && typeof app === 'object' && app.enemy) {
      const e = FF7.data.enemies[app.enemy];
      const m = FF7.creatures.build(e ? e.look : { type: 'blob' }, app.enemy);
      m.baseScale = (app.scale || 0.6) / F.CHAR_SCALE;
      m.anims = m.anims || {}; ['idle', 'walk', 'run'].forEach(k => { if (!m.anims[k]) m.anims[k] = 'e_idle'; });
      return m;
    }
    return FF7.chars3d.build(app || 'man', { style: 'field' });
  };
})();
