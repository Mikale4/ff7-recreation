// Hierarchical (skeletal) models with procedural animation clips.
//   const m = new FF7.Model();
//   m.bone('hips', null, [0, 0.4, 0]); m.bone('torso', 'hips', [0, 0.05, 0]); m.attach('torso', mesh);
//   m.play('walk'); m.update(); m.draw();
(function () {
  const M4 = FF7.M4;

  class Bone {
    constructor(name, parent, offset) {
      this.name = name; this.parent = parent; this.offset = offset || [0, 0, 0];
      this.rot = [0, 0, 0]; this.pos = [0, 0, 0]; this.scl = [1, 1, 1];
      this.rest = [0, 0, 0];      // rest rotation
      this.meshes = []; this.children = [];
      this.local = M4.create(); this.world = M4.create();
      this.visible = true;
    }
  }

  class Model {
    constructor() {
      this.bones = {}; this.order = []; this.root = null;
      this.position = [0, 0, 0]; this.rotY = 0; this.rotX = 0; this.rotZ = 0; this.scale = 1;
      this.clip = null; this.clipName = null; this.t = 0; this.speed = 1; this.clipDone = false;
      this.visible = true; this.tint = null; this.add = null; this.alpha = 1;
      this.worldM = M4.create();
      this.height = 1;
      this.anchors = {};
    }
    bone(name, parent, offset, rest) {
      const b = new Bone(name, parent ? this.bones[parent] : null, offset);
      if (rest) { b.rest = rest.slice(); b.rot = rest.slice(); }
      this.bones[name] = b; this.order.push(b);
      if (b.parent) b.parent.children.push(b); else this.root = b;
      return b;
    }
    b(name) { return this.bones[name] || DUMMY; }
    attach(boneName, mesh, localMatrix, opts) {
      const b = this.bones[boneName];
      if (!b || !mesh) return;
      b.meshes.push({ mesh, m: localMatrix || null, opts: opts || null });
    }
    resetPose() { for (const b of this.order) { b.rot[0] = b.rest[0]; b.rot[1] = b.rest[1]; b.rot[2] = b.rest[2]; b.pos[0] = b.pos[1] = b.pos[2] = 0; b.scl[0] = b.scl[1] = b.scl[2] = 1; } }

    // Play an animation clip by name (from FF7.anims or this.clips). opts: { loop, speed, restart }
    play(name, opts = {}) {
      if (this.clipName === name && !opts.restart) { if (opts.speed) this.speed = opts.speed; return this; }
      const clip = (this.clips && this.clips[name]) || FF7.anims[name];
      this.clip = clip || null; this.clipName = name; this.t = 0; this.clipDone = false;
      this.speed = opts.speed || 1;
      this.loop = opts.loop != null ? opts.loop : (clip ? clip.loop !== false : true);
      return this;
    }
    update(dt = 1) {
      this.resetPose();
      if (this.clip) {
        this.t += dt * this.speed;
        const dur = this.clip.dur || 60;
        let t = this.t;
        if (this.loop) t = t % dur; else if (t >= dur) { t = dur; this.clipDone = true; }
        this.clip.fn(this, t / dur, t);
      }
      if (this.onPose) this.onPose(this);
    }
    computeWorld() {
      const k = this.scale * (this.growth || 1);   // (growth: the model's own size, whatever the scene's scale; Kupomon's stages)
      M4.trs(this.worldM, this.position, [this.rotX, this.rotY, this.rotZ], [k, k, k]);
      for (const b of this.order) {
        M4.trs(b.local, [b.offset[0] + b.pos[0], b.offset[1] + b.pos[1], b.offset[2] + b.pos[2]], b.rot, b.scl);
        M4.mul(b.world, b.parent ? b.parent.world : this.worldM, b.local);
      }
    }
    draw(opts = {}) {
      if (!this.visible) return;
      this.computeWorld();
      const tmp = Model._tmp;
      const o = Object.assign({}, opts);
      if (this.tint && !o.tint) o.tint = this.tint;
      if (this.add && !o.add) o.add = this.add;
      if (this.alpha < 1) { o.tint = (o.tint || [1, 1, 1, 1]).slice(); o.tint[3] *= this.alpha; o.blend = o.blend || 'alpha'; }
      for (const b of this.order) {
        if (!b.visible) continue;
        for (const a of b.meshes) {
          const mat = a.m ? M4.mul(tmp, b.world, a.m) : b.world;
          FF7.GL.draw(a.mesh, mat, a.opts ? Object.assign({}, o, a.opts) : o);
        }
      }
    }
    // World position of a point in a bone's space
    worldPoint(boneName, p = [0, 0, 0]) {
      const b = this.bones[boneName];
      if (!b) return this.position.slice();
      return M4.transformPoint(b.world, p).slice(0, 3);
    }
  }
  Model._tmp = M4.create();
  const DUMMY = new Bone('dummy', null, [0, 0, 0]);
  FF7.Model = Model;

  // ---------------- animation clip library ----------------
  // Each clip: { dur: frames, loop: bool, fn(model, phase 0..1, frame) }
  const S = Math.sin, C = Math.cos, PI = Math.PI;
  const A = FF7.anims = {};
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  A.idle = { dur: 90, fn(m, p) {
    const br = S(p * PI * 2);
    m.b('torso').rot[0] += br * 0.015;
    m.b('armL').rot[2] += 0.22 + br * 0.02; m.b('armR').rot[2] -= 0.22 + br * 0.02;
    m.b('foreL').rot[0] -= 0.12; m.b('foreR').rot[0] -= 0.12; m.b('foreL').rot[2] -= 0.08; m.b('foreR').rot[2] += 0.08;
    m.b('hips').pos[1] += br * 0.004;
  } };
  A.walk = { dur: 32, fn(m, p) {
    const s = S(p * PI * 2), c = C(p * PI * 2);
    m.b('thighL').rot[0] = -s * 0.55; m.b('thighR').rot[0] = s * 0.55;
    m.b('shinL').rot[0] = Math.max(0, c) * 0.7; m.b('shinR').rot[0] = Math.max(0, -c) * 0.7;
    m.b('armL').rot[0] = s * 0.45; m.b('armR').rot[0] = -s * 0.45;
    m.b('armL').rot[2] += 0.1; m.b('armR').rot[2] -= 0.1;
    m.b('foreL').rot[0] = -0.3; m.b('foreR').rot[0] = -0.3;
    m.b('hips').pos[1] = Math.abs(c) * 0.018;
    m.b('torso').rot[1] = s * 0.06;
  } };
  A.run = { dur: 20, fn(m, p) {
    const s = S(p * PI * 2), c = C(p * PI * 2);
    m.b('thighL').rot[0] = -s * 0.85 - 0.1; m.b('thighR').rot[0] = s * 0.85 - 0.1;
    m.b('shinL').rot[0] = Math.max(0, c) * 1.2 + 0.2; m.b('shinR').rot[0] = Math.max(0, -c) * 1.2 + 0.2;
    m.b('armL').rot[0] = s * 0.8; m.b('armR').rot[0] = -s * 0.8;
    m.b('armL').rot[2] += 0.2; m.b('armR').rot[2] -= 0.2;
    m.b('foreL').rot[0] = -1.1; m.b('foreR').rot[0] = -1.1;
    m.b('torso').rot[0] = 0.18;
    m.b('hips').pos[1] = Math.abs(c) * 0.035;
  } };
  // Battle stance: knees bent, weapon ready
  A.battle = { dur: 70, fn(m, p) {
    const br = S(p * PI * 2);
    m.b('hips').pos[1] = -0.03 + br * 0.006;
    m.b('thighL').rot[0] = -0.35; m.b('shinL').rot[0] = 0.55; m.b('footL').rot[0] = -0.2;
    m.b('thighR').rot[0] = 0.15; m.b('shinR').rot[0] = 0.45; m.b('footR').rot[0] = -0.2;
    m.b('thighL').rot[2] = 0.08; m.b('thighR').rot[2] = -0.08;
    m.b('torso').rot[0] = 0.12 + br * 0.02;
    m.b('armR').rot[0] = -0.7; m.b('foreR').rot[0] = -0.9; m.b('armR').rot[2] = -0.2;
    m.b('armL').rot[0] = -0.5; m.b('foreL').rot[0] = -1.0; m.b('armL').rot[2] = 0.25;
    m.b('head').rot[0] = -0.05;
    if (m.battleArm) { const q = m.battleArm; m.b('armR').rot[0] = q[0]; m.b('foreR').rot[0] = q[1]; if (q[2] != null) m.b('armR').rot[2] = q[2]; }   // per-weapon stance (e.g. handguns held low)
  } };
  A.weak = { dur: 80, fn(m, p) {  // low HP / kneeling
    m.b('hips').pos[1] = -0.12;
    m.b('thighL').rot[0] = -1.2; m.b('shinL').rot[0] = 1.3;
    m.b('thighR').rot[0] = 0.3; m.b('shinR').rot[0] = 1.5;
    m.b('torso').rot[0] = 0.35 + S(p * PI * 2) * 0.03;
    m.b('armR').rot[0] = -0.4; m.b('armL').rot[0] = 0.2; m.b('head').rot[0] = 0.3;
  } };
  A.slash = { dur: 26, loop: false, fn(m, p) {  // big overhead swing
    A.battle.fn(m, 0);
    const wind = Math.min(1, p / 0.35), swing = p < 0.35 ? 0 : ease(Math.min(1, (p - 0.35) / 0.3));
    m.b('armR').rot[0] = lerp(lerp(-0.7, -2.6, wind), 0.2, swing);
    m.b('foreR').rot[0] = lerp(-0.9, -0.2, swing);
    m.b('armL').rot[0] = lerp(lerp(-0.5, -2.4, wind), 0.1, swing);
    m.b('torso').rot[0] = lerp(lerp(0.12, -0.2, wind), 0.45, swing);
    m.b('torso').rot[1] = lerp(0, -0.3, swing);
  } };
  A.punch = { dur: 18, loop: false, fn(m, p) {
    A.battle.fn(m, 0);
    const k = S(Math.min(1, p) * PI);
    m.b('armR').rot[0] = lerp(-0.7, -1.55, k); m.b('foreR').rot[0] = lerp(-0.9, 0, k);
    m.b('torso').rot[1] = lerp(0, -0.4, k); m.b('torso').rot[0] = 0.25;
  } };
  A.kick = { dur: 22, loop: false, fn(m, p) {
    A.battle.fn(m, 0);
    const k = S(Math.min(1, p) * PI);
    m.b('thighR').rot[0] = lerp(0.15, -1.5, k); m.b('shinR').rot[0] = lerp(0.45, 0, k);
    m.b('torso').rot[0] = lerp(0.12, -0.3, k);
  } };
  A.shoot = { dur: 30, loop: false, fn(m, p) {
    A.battle.fn(m, 0);
    const rec = p > 0.3 && p < 0.9 ? S((p - 0.3) * 40) * 0.05 : 0;
    m.b('armR').rot[0] = -1.5 + rec; m.b('foreR').rot[0] = 0; m.b('armR').rot[2] = 0.05;
    m.b('armL').rot[0] = -1.3; m.b('foreL').rot[0] = -0.4; m.b('armL').rot[2] = -0.3;
  } };
  A.thrust = { dur: 22, loop: false, fn(m, p) {
    A.battle.fn(m, 0);
    const k = S(Math.min(1, p) * PI);
    m.b('armR').rot[0] = lerp(-0.7, -1.6, k); m.b('foreR').rot[0] = lerp(-0.9, -0.1, k);
    m.b('armL').rot[0] = lerp(-0.5, -1.5, k); m.b('foreL').rot[0] = lerp(-1.0, -0.2, k);
    m.b('torso').rot[0] = lerp(0.12, 0.4, k);
  } };
  A.cast = { dur: 40, loop: false, fn(m, p) {
    A.battle.fn(m, 0);
    const k = ease(Math.min(1, p / 0.5));
    m.b('armR').rot[0] = lerp(-0.7, -2.7, k); m.b('foreR').rot[0] = lerp(-0.9, -0.1, k); m.b('armR').rot[2] = lerp(-0.2, -0.35, k);
    m.b('armL').rot[0] = lerp(-0.5, -2.7, k); m.b('foreL').rot[0] = lerp(-1.0, -0.1, k); m.b('armL').rot[2] = lerp(0.25, 0.35, k);
    m.b('head').rot[0] = lerp(-0.05, -0.3, k);
    m.b('torso').rot[0] = lerp(0.12, -0.1, k);
  } };
  A.item = { dur: 30, loop: false, fn(m, p) {
    A.battle.fn(m, 0);
    const k = S(Math.min(1, p) * PI);
    m.b('armR').rot[0] = lerp(-0.7, -2.0, k); m.b('foreR').rot[0] = lerp(-0.9, -0.3, k);
  } };
  A.hurt = { dur: 18, loop: false, fn(m, p) {
    A.battle.fn(m, 0);
    const k = S(Math.min(1, p) * PI);
    m.b('torso').rot[0] = lerp(0.12, -0.45, k); m.b('head').rot[0] = lerp(0, -0.4, k);
    m.b('armL').rot[0] += k * 0.6; m.b('armR').rot[0] += k * 0.6;
    m.b('hips').pos[2] = -k * 0.05;
  } };
  A.dead = { dur: 30, loop: false, fn(m, p) {
    const k = ease(Math.min(1, p));
    m.b('hips').pos[1] = lerp(0, -0.36, k);
    m.b('hips').rot[0] = lerp(0, -1.45, k);
    m.b('thighL').rot[0] = lerp(0, 0.2, k); m.b('thighR').rot[0] = lerp(0, 0.1, k);
    m.b('armL').rot[2] = lerp(0, 0.9, k); m.b('armR').rot[2] = lerp(0, -0.9, k);
    m.b('head').rot[1] = lerp(0, 0.5, k);
  } };
  A.defend = { dur: 60, fn(m, p) {
    A.battle.fn(m, p);
    m.b('armL').rot[0] = -1.5; m.b('foreL').rot[0] = -1.4; m.b('armR').rot[0] = -1.3; m.b('foreR').rot[0] = -1.5;
    m.b('torso').rot[0] = 0.3;
  } };
  A.victory = { dur: 60, fn(m, p) {
    m.b('armR').rot[0] = -0.3 - S(Math.min(1, p * 2) * PI / 2) * 2.3; m.b('foreR').rot[0] = -0.4;
    m.b('armL').rot[2] = 0.3; m.b('head').rot[0] = -0.15;
  } };
  A.jump = { dur: 24, loop: false, fn(m, p) {
    const k = S(Math.min(1, p) * PI);
    m.b('thighL').rot[0] = -0.9 * k; m.b('shinL').rot[0] = 1.2 * k; m.b('thighR').rot[0] = -0.5 * k; m.b('shinR').rot[0] = 1.0 * k;
    m.b('armL').rot[0] = -1.2 * k; m.b('armR').rot[0] = -1.2 * k;
  } };
  A.nod = { dur: 24, loop: false, fn(m, p) { m.b('head').rot[0] = S(Math.min(1, p) * PI) * 0.35; } };
  A.shake = { dur: 30, loop: false, fn(m, p) { m.b('head').rot[1] = S(p * PI * 4) * 0.35 * (1 - p); } };
  A.lookup = { dur: 30, fn(m, p) { m.b('head').rot[0] = -0.45; } };
  A.lookdown = { dur: 30, fn(m, p) { m.b('head').rot[0] = 0.45; m.b('torso').rot[0] = 0.1; } };
  A.armscross = { dur: 90, fn(m, p) { m.b('armL').rot[0] = -0.9; m.b('armL').rot[1] = -0.9; m.b('foreL').rot[1] = -1.4; m.b('armR').rot[0] = -0.9; m.b('armR').rot[1] = 0.9; m.b('foreR').rot[1] = 1.4; } };
  // holding something overhead in both hands (the Ancient Forest's insects, frogs and beehives): arms up, elbows in;
  // the field picks carry / carry_walk / carry_run while an actor has `carry`
  const carryArms = (m) => {
    m.b('armL').rot[0] = -0.35; m.b('armR').rot[0] = -0.35; m.b('armL').rot[2] = 2.5; m.b('armR').rot[2] = -2.5;
    m.b('foreL').rot[0] = -0.2; m.b('foreR').rot[0] = -0.2; m.b('foreL').rot[2] = 0.75; m.b('foreR').rot[2] = -0.75;
  };
  A.carry = { dur: 90, fn(m, p) { A.idle.fn(m, p); carryArms(m); } };
  A.carry_walk = { dur: 32, fn(m, p) { A.walk.fn(m, p); carryArms(m); m.b('torso').rot[1] *= 0.4; } };
  A.carry_run = { dur: 20, fn(m, p) { A.run.fn(m, p); carryArms(m); m.b('torso').rot[0] = 0.08; } };
  A.wave = { dur: 30, fn(m, p) { m.b('armR').rot[2] = -2.4; m.b('foreR').rot[2] = -0.4 + S(p * PI * 2) * 0.5; } };
  A.point = { dur: 60, fn(m, p) { m.b('armR').rot[0] = -1.5; m.b('foreR').rot[0] = 0; } };
  A.fistpump = { dur: 30, fn(m, p) { m.b('armR').rot[0] = -2.8 + S(p * PI * 2) * 0.25; m.b('foreR').rot[0] = -0.6; } };
  A.sit = { dur: 60, fn(m) { m.b('hips').pos[1] = -0.17; m.b('thighL').rot[0] = -1.5; m.b('thighR').rot[0] = -1.5; m.b('shinL').rot[0] = 1.5; m.b('shinR').rot[0] = 1.5; } };
  A.kneel = { dur: 60, fn(m) { m.b('hips').pos[1] = -0.13; m.b('thighL').rot[0] = -1.4; m.b('shinL').rot[0] = 1.4; m.b('thighR').rot[0] = 0.2; m.b('shinR').rot[0] = 1.6; m.b('torso').rot[0] = 0.25; m.b('head').rot[0] = 0.3; } };
  A.pray = { dur: 90, fn(m, p) { A.kneel.fn(m); m.b('armL').rot[0] = -1.0; m.b('armL').rot[1] = -0.6; m.b('foreL').rot[1] = -1.3; m.b('armR').rot[0] = -1.0; m.b('armR').rot[1] = 0.6; m.b('foreR').rot[1] = 1.3; m.b('head').rot[0] = 0.4; } };
  A.lie = { dur: 60, fn(m) { A.dead.fn(m, 1); } };
  A.climb = { dur: 30, fn(m, p) {
    const s = S(p * PI * 2);
    m.b('armL').rot[0] = -2.6 + s * 0.3; m.b('armR').rot[0] = -2.6 - s * 0.3;
    m.b('thighL').rot[0] = -0.6 - s * 0.4; m.b('thighR').rot[0] = -0.6 + s * 0.4; m.b('shinL').rot[0] = 0.8; m.b('shinR').rot[0] = 0.8;
  } };
  // Quadruped gaits (bones: legFL legFR legBL legBR, body, head, tail)
  A.q_idle = { dur: 90, fn(m, p) { m.b('tail').rot[0] = 0.3 + S(p * PI * 2) * 0.15; m.b('head').rot[0] = S(p * PI * 2) * 0.03; } };
  A.q_walk = { dur: 30, fn(m, p) {
    const s = S(p * PI * 2);
    m.b('legFL').rot[0] = s * 0.5; m.b('legBR').rot[0] = s * 0.5; m.b('legFR').rot[0] = -s * 0.5; m.b('legBL').rot[0] = -s * 0.5;
    m.b('tail').rot[0] = 0.3 + s * 0.2; m.b('body').pos[1] = Math.abs(C(p * PI * 2)) * 0.01;
  } };
  A.q_run = { dur: 18, fn(m, p) {
    const s = S(p * PI * 2);
    m.b('legFL').rot[0] = s * 0.9; m.b('legFR').rot[0] = s * 0.7; m.b('legBL').rot[0] = -s * 0.9; m.b('legBR').rot[0] = -s * 0.7;
    m.b('body').rot[0] = s * 0.08; m.b('tail').rot[0] = 0.6;
  } };
  A.q_battle = { dur: 60, fn(m, p) { m.b('body').pos[1] = -0.02 + S(p * PI * 2) * 0.006; m.b('head').rot[0] = 0.15; m.b('tail').rot[0] = 0.7 + S(p * PI * 2) * 0.1; m.b('legFL').rot[0] = -0.2; m.b('legFR').rot[0] = 0.2; } };
  A.q_attack = { dur: 22, loop: false, fn(m, p) { const k = S(Math.min(1, p) * PI); m.b('body').rot[0] = -k * 0.4; m.b('legFL').rot[0] = -k * 1.2; m.b('legFR').rot[0] = -k * 1.0; m.b('head').rot[0] = -k * 0.3; } };
  A.q_hurt = { dur: 18, loop: false, fn(m, p) { const k = S(Math.min(1, p) * PI); m.b('body').rot[0] = k * 0.3; m.b('head').rot[0] = -k * 0.4; } };
  A.q_dead = { dur: 30, loop: false, fn(m, p) { const k = ease(Math.min(1, p)); m.b('body').rot[2] = k * 1.4; m.b('body').pos[1] = -k * 0.08; } };
  A.q_cast = { dur: 40, loop: false, fn(m, p) { const k = S(Math.min(1, p) * PI); m.b('head').rot[0] = -k * 0.8; m.b('body').rot[0] = -k * 0.3; } };
  A.q_victory = { dur: 60, fn(m, p) { m.b('head').rot[0] = -0.7; m.b('tail').rot[0] = 1.0 + S(p * PI * 4) * 0.2; } };
})();
