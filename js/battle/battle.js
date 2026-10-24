// The battle scene: 3D arena, ATB timers (Terence's FAQ), action queue, HUD, camera.
//   FF7.battle.start({ enemies:[ids] | formation | table, bg, music, noEscape, canLose, preempt, back,
//     type: 'normal'|'preempt'|'back'|'side'|'pincer', hidden, shot }) -> waitable   (formations: placeParty)
(function () {
  const U = FF7.util, R = FF7.render, I = FF7.input, B = FF7.battle, GL = FF7.GL, M4 = FF7.M4;
  const A = B.actions;
  const TPF = 1.6;             // battle timer ticks per frame
  const PARTY_SCALE = 1.7;     // battle-style character models are 1.0 tall
  const SPLIT_X = 0.1;         // side / pincer formations: everyone lined up on this x (see placeParty)
  const SPLIT_GAP = 4.0;       // side / pincer formations: party to the nearest enemy row

  // ---------------------------------------------------------------- camera shots (see the camera section)
  // FF7 opens a battle on one of several angles. About two-thirds are side-on (enemies left, party right,
  // slot 1 farthest from the camera); the rest look over the party's shoulders. az: azimuth of the eye
  // from +z toward +x (degrees), el: elevation. Side-on shots mirror the party's slot order (placeParty).
  const SHOTS = [
    { id: 'side', az: -78, el: 12, fov: 38, dMin: 8.5, mirror: true, w: 1.5 },
    { id: 'side_high', az: -58, el: 20, fov: 38, dMin: 9, mirror: true, w: 1 },
    { id: 'diag', az: 36, el: 21, fov: 38, dMin: 9, w: 0.9 },
    { id: 'behind', az: 8, el: 21, fov: 38, dMin: 9.5, w: 0.6 },
  ];
  // side / pincer formations: the party stands in a line across the battle, so a more diagonal side view
  // shows each member clear of the others (as FF7 frames them) with both sides of the fight in frame
  const SPLIT_SHOTS = [
    { id: 'split', az: -52, el: 20, fov: 38, dMin: 9, mirror: true, w: 1.5 },
    { id: 'split_high', az: -42, el: 27, fov: 38, dMin: 9.5, mirror: true, w: 1 },
  ];
  const D2R = Math.PI / 180;
  // screen box (NDC) the fighters must fit: 29..611 px across, 53..336 px down (above the command windows)
  const FIT_BOX = { x0: -0.91, x1: 0.91, y0: -0.4, y1: 0.78 }, VICTORY_BOX = { x0: -0.6, x1: 0.6, y0: -0.5, y1: 0.55 };
  // Aim a shot at a set of points and move it in or out until they all fit the box. The eye stays within
  // maxR of the centre (inside the arena's walls and backdrop); past that the lens widens instead.
  function fitCam(shot, pts, box = FIT_BOX) {
    const az = shot.az * D2R, el = shot.el * D2R;
    const dir = [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
    const f = [-dir[0], -dir[1], -dir[2]], hl = Math.hypot(f[0], f[2]), r = [-f[2] / hl, 0, f[0] / hl];
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    const asp = FF7.W / FF7.H, maxR = shot.maxR || 14.6, dMin = shot.dMin || 7.5;
    let fov = shot.fov, tn = Math.tan(fov * D2R / 2), D = 11;
    const T = [0, 1, 0];
    pts.forEach(p => { T[0] += p[0] / pts.length; T[2] += p[2] / pts.length; });
    const eyeAt = () => [T[0] + dir[0] * D, T[1] + dir[1] * D, T[2] + dir[2] * D];
    for (let it = 0; it < 48; it++) {
      const E = eyeAt();
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of pts) {
        const q0 = p[0] - E[0], q1 = p[1] - E[1], q2 = p[2] - E[2], z = Math.max(0.5, q0 * f[0] + q1 * f[1] + q2 * f[2]);
        const sx = (q0 * r[0] + q2 * r[2]) / (z * tn * asp), sy = (q0 * u[0] + q1 * u[1] + q2 * u[2]) / (z * tn);
        if (sx < x0) x0 = sx; if (sx > x1) x1 = sx; if (sy < y0) y0 = sy; if (sy > y1) y1 = sy;
      }
      const need = Math.max((x1 - x0) / (box.x1 - box.x0), (y1 - y0) / (box.y1 - box.y0));
      const cx = (x0 + x1 - box.x0 - box.x1) / 2, cy = (y0 + y1 - box.y0 - box.y1) / 2, k = D * tn * 0.6;
      for (let i = 0; i < 3; i++) T[i] += (r[i] * cx * asp + u[i] * cy) * k;
      T[1] = U.clamp(T[1], 0.2, 3.2);
      D = Math.max(dMin, D * (1 + (need - 1) * 0.6));
      const a2 = dir[0] * dir[0] + dir[2] * dir[2], b = T[0] * dir[0] + T[2] * dir[2], c = T[0] * T[0] + T[2] * T[2] - maxR * maxR;
      const dFar = c < 0 ? (-b + Math.sqrt(b * b - a2 * c)) / a2 : dMin;
      if (D > dFar) { D = Math.max(dMin, dFar); if (need > 1.01 && fov < 60) { fov = Math.min(60, fov + 1.5); tn = Math.tan(fov * D2R / 2); } }
    }
    return { eye: eyeAt(), target: T, fov };
  }
  // points to keep in frame for fighters { x, z, h, w }: feet, head and both sides at mid-height
  function framePts(list) {
    const out = [];
    for (const s of list) { out.push([s.x, 0, s.z], [s.x, s.h, s.z]); for (const [dx, dz] of [[s.w, 0], [-s.w, 0], [0, s.w], [0, -s.w]]) out.push([s.x + dx, s.h * 0.5, s.z + dz]); }
    return out;
  }
  const introShot = (s) => Object.assign({}, s, { az: s.az + (s.mirror ? -40 : 40), el: s.el + 12, fov: s.fov + 4, dMin: 12 });
  const victoryShot = (s) => ({ az: s.mirror ? -150 : 150, el: 12, fov: 38, dMin: 6 });
  // side / pincer formations (the party on both sides of the enemies, or between them) are filmed side-on
  // only (the mirror shots); a side attack's party wins side-on, turned to the camera where it fought
  const SIDE_VICTORY = { az: -96, el: 12, fov: 38, dMin: 6 };
  // attack / spell camera: side-on battles stay on the -x side so enemies remain left, party right. It looks
  // from the attacker's side of an opponent (d), which is the party's side (+z) except in side / pincer formations.
  function attackCamFor(s, ap, tp, party, foe) {
    const mid = [(ap[0] + tp[0]) / 2, 1.0, (ap[2] + tp[2]) / 2];
    const d = foe && Math.abs(ap[2] - tp[2]) > 0.5 ? Math.sign(ap[2] - tp[2]) : (party ? 1 : -1);
    const eye = s && s.mirror ? [mid[0] - 8, 3.2, mid[2] + 3 * d] : [mid[0] + 7.5 * d, 3.4, mid[2] + 4.5];
    const rr = Math.hypot(eye[0], eye[2]);
    if (rr > 14.6) { eye[0] *= 14.6 / rr; eye[2] *= 14.6 / rr; }
    return { eye, target: mid, fov: 42 };
  }
  const summonCamFor = (s) => (s && s.mirror ? { eye: [-14, 6.5, 1.5], target: [0, 2.5, -1], fov: 50 } : { eye: [0, 7, 14.5], target: [0, 2.5, -2], fov: 50 });
  // Cameras the arenas keep their props out of when they are built: every opening shot on a few typical
  // formations, plus the intro, victory, attack and summon cameras derived from them (FF7.arena.get).
  FF7.arena.views = function () {
    const out = [];
    const forms = [
      [[[1.2, 3]], [[-1, -1.6, 1.8, 0.8]]],
      [[[-0.8, 3], [1.2, 3], [3.2, 3]], [[-3.2, -1.6, 1.8, 0.8], [-1, -1.6, 1.8, 0.8], [1.2, -1.6, 1.8, 0.8]]],
      [[[-0.8, 4], [1.2, 3], [3.2, 4]], [[-4.3, -1.6, 1.8, 0.8], [-2.1, -1.6, 1.8, 0.8], [0.1, -1.6, 1.8, 0.8], [2.3, -1.6, 1.8, 0.8], [-1, -3.8, 2.4, 1]]],
      [[[0.1, 3], [2.3, 3]], [[-1, -2.1, 5.5, 2]]],
    ];
    // (side / pincer formations are left to the arena's fading: their extra views here would re-shuffle the
    // props every arena places for ordinary battles)
    for (const s of SHOTS) for (const [P, E] of forms) {
      const ps = P.map(([x, z]) => ({ x: s.mirror ? 2.4 - x : x, z, h: 2.45, w: 0.7 })), es = E.map(([x, z, h, w]) => ({ x, z, h, w }));
      const all = ps.concat(es), subj = all.map(q => [q.x, 1, q.z]), add = (cam, sub) => out.push(Object.assign({ subj: sub || subj }, cam));
      add(fitCam(s, framePts(all)));
      if (es.length < 5 && es[0].h < 3) add(fitCam(introShot(s), framePts(all)));     // (big-boss intro sweeps rely on the arena's prop fading)
      add(fitCam(victoryShot(s), framePts(ps), VICTORY_BOX), ps.map(q => [q.x, 1, q.z]));
      for (const p of ps) for (const e of es) { add(attackCamFor(s, [p.x, 0, p.z], [e.x, 0, e.z], true, true)); add(attackCamFor(s, [e.x, 0, e.z], [p.x, 0, p.z], false, true)); }
      add(summonCamFor(s));
    }
    return out;
  };

  class BattleScene {
    constructor(opts, waiter) {
      this.isBattle = true;
      this.fxCos = [];                // background coroutines (phase changes, flee-offs)
      this.opts = opts || {};
      this.waiter = waiter;
      this.party = []; this.enemies = [];
      this.queue = []; this.readyQueue = []; this.heldItems = [];   // heldItems: item picks taken from the bag (bmenu hold)
      this.co = null; this.current = null;
      this.phase = 'intro'; this.t = 0;
      this.menu = new B.BattleMenu(this);
      this.banners = [];
      this.morphed = []; this.droppedItems = []; this.stolen = [];
      this.turnCount = 0;
      this.paused = false;
      this.pointer = null;
      this.cam = { eye: [9, 5, 11], target: [0, 1, -1], fov: 40 };
      this.camGoal = null;
      this.kills = {};
      this.escaped = false;
      this.runHold = 0; this.runDifficulty = 1;
      this.learnedEskills = [];
      this.limitUsed = {};
    }

    // ---------------------------------------------------------------- setup
    enter() {
      const o = this.opts;
      const st = FF7.state;
      FF7.fx.clear();
      // formation
      let form = o.formation;
      if (!form && o.table) { const t = FF7.data.encounters[o.table]; form = t && t.length ? U.weighted(t, 'w') : null; }
      if (!form) form = { e: o.enemies || ['mp'] };
      // an enemy may carry its FF7 formation (Ruby WEAPON's hidden ambush); the table's own fields win
      const eForm = (form.e || []).map(id => (FF7.data.enemies[id] || {}).formation).find(Boolean);
      if (eForm) form = Object.assign({}, eForm, form);
      this.form = form;
      const type = o.back ? 'back' : o.preempt ? 'preempt' : (o.type || form.type || 'normal');
      this.type = type;
      this.hidden = o.hidden || form.hidden || null;     // 'preempt' | 'ambush': see the formations section
      this.noEscape = !!(o.noEscape || form.noEscape || (form.e || []).some(id => (FF7.data.enemies[id] || {}).boss));
      // FF7 Run Difficulty is per encounter (form.run); Back Attacks "tend to" add 1 (Battle Mechanics FAQ):
      // tables that give no value get it here (the d1a tables already list their back attacks' 2)
      this.runDifficulty = form.run || (type === 'back' ? 2 : 1);
      this.bgId = o.bg || form.bg || 'grass';
      this.arena = FF7.arena.get(FF7.arena.variant(this.bgId, form.e));     // e.g. Bottomswell's beach at sunset
      // party (opts.parties: a split-party battle, Bizarro·Sephiroth's: the first party fights, the others wait
      // their turn - nextParty)
      if (o.parties && o.parties.length > 1) { this.reserve = o.parties.slice(1).map(p => p.filter(Boolean)).filter(p => p.length); this.partyNo = 1; }
      this.buildParty();
      // random random pre-emptive (FF7: ~16/256 base; Pre-Emptive materia raises)
      if (type === 'normal' && o.random && !this.hidden) {
        // (Pre-Emptive materia: +16 / 22 / 28 / 34 / 48 per 256 by level, stacking, 85/256 at most - the Walkthrough)
        const pre = Math.min(85, 16 + this.party.reduce((s, p) => s + (p.preemptiveLv || []).reduce((n, lv) => n + [16, 22, 28, 34, 48][Math.min(4, lv - 1)], 0), 0));
        if (U.rand(256) < pre) this.type = 'preempt';
      }
      // enemies (a pincer without group data splits them: the first half on the left, the rest on the right)
      const ne = (form.e || []).length;
      const groupOf = (i) => form.groups ? form.groups[i] || 1 : this.type === 'pincer' ? (i < Math.ceil(ne / 2) ? 1 : 2) : 1;
      (form.e || []).forEach((id, i) => this.addEnemy(id, { row: form.rows ? form.rows[i] : null, group: groupOf(i), silent: true }));
      this.layoutEnemies();
      this.placeParty(false);
      // ATB start values (FAQ 2.5)
      const all = this.party.concat(this.enemies);
      all.forEach(c => c.turn = U.rand(32768));
      if (this.type === 'preempt' || this.type === 'side') { this.enemies.forEach(e => e.turn = Math.floor(e.turn / 8)); this.party.forEach(p => p.turn = 65534); }
      else {
        // Back Attacks and Ambushes (pincer; Ruby WEAPON's unannounced one too): enemies up to 93.75%, party empty
        const amb = this.type === 'back' || this.type === 'pincer' || this.hidden === 'ambush';
        const top = amb ? 61440 : 57344;
        const mx = Math.max(...all.map(c => c.turn));
        all.forEach(c => c.turn = Math.min(65535, c.turn + (top - mx)));
        if (amb) this.party.forEach(p => p.turn = 0);
      }
      // FF7's last duel: Cloud acts first with his Limit gauge already full (any Limit finishes it)
      if (o.finalDuel) { this.party.forEach(p => { p.turn = 65534; p.limitGauge = 255; }); this.enemies.forEach(e => e.turn = 0); }
      // speed value from config (0 slow .. 1 fast)
      const bs = Math.round(255 * (1 - U.clamp(st.config.battleSpeed != null ? st.config.battleSpeed : 0.5, 0, 1)));
      this.SV = Math.floor(32768 / (120 + Math.floor(bs * 15 / 8)));
      const baseDex = this.party.length ? Math.ceil(this.party.reduce((s, p) => s + (p.baseDex || 0), 0) / this.party.length) : 30;
      this.normalSpeed = baseDex + 50;
      // music
      const boss = this.enemies.some(e => e.boss);
      const mus = o.music || form.music || (boss ? 'boss' : 'battle');
      this.musicPushed = false;
      if (mus !== FF7.audio.currentId && mus !== 'keep') { FF7.audio.push(mus); this.musicPushed = true; }
      // intro camera sweep onto the opening shot (picked in placeParty)
      this.cam = this.introCam();
      this.camTo(this.defaultCam(), 50);
      if (this.type === 'preempt') this.banner1('Pre-emptive strike!');
      else if (this.type === 'back') this.banner1('Back attack!');
      else if (this.type === 'pincer') this.banner1('Pincer attack!');
      else if (this.type === 'side') this.banner1('Side attack!');
      // sneak attacks happen at battle start (Sneak Attack materia: 20 / 35 / 50 / 65 / 80% by level)
      this.party.forEach(p => (p.sneakFx || p.abilities.sneak || []).forEach(s => { if (p.alive && U.chance([20, 35, 50, 65, 80][Math.min(4, s.level - 1)])) this.sneakFor(p, s.materia); }));
    }

    banner1(text) { this.banners.push({ text, t: 70 }); }
    // the party's fighters from FF7.state.party, with their models
    buildParty() {
      const st = FF7.state, form = this.form;
      this.party = [];
      st.party.forEach((id, slot) => {
        if (!id) return;
        const c = st.chars[id]; if (!c) return;
        FF7.sys.stats.recalc(c);
        const cb = B.fromChar(c);
        cb.slot = slot;
        cb.battle = this;
        if (this.type === 'back') cb.row = cb.row === 'front' ? 'back' : 'front';
        cb.model = FF7.chars3d.build(FF7.chars3d.withWeapon(id, c.weapon), { style: 'battle' });   // holds the equipped weapon (weapons_cloud.js)
        cb.model.scale = PARTY_SCALE;
        if (cb.model.showWeapon) cb.model.showWeapon(true);
        this.party.push(cb);
      });
      // formation slots (1..3 in FF7, 0..2 here): a forced formation lists members by slot (Air Buster:
      // 1.Barret 2.Cloud 3.Tifa); everyone else takes the free slots in party order
      const forced = form.forced || [], taken = new Set();
      this.party.forEach(p => { const k = forced.indexOf(p.id); if (k >= 0) { p.fslot = k; taken.add(k); } });
      this.party.forEach(p => { if (p.fslot == null) { let k = 0; while (taken.has(k)) k++; p.fslot = k; taken.add(k); } });
    }
    // A split-party battle: the party on the field has fallen, the next one takes over. The enemies keep their
    // wounds; the fallen stay as they are (KO'd, in the save too). Only the last party's fall loses the battle,
    // and the party standing at the end is the one that carries on (FF7.state.party).
    nextParty() {
      this.party.forEach(p => B.toChar(p));
      const ids = this.reserve.shift();
      this.partyNo = (this.partyNo || 1) + 1;
      FF7.state.party = ids.concat([null, null, null]).slice(0, 3);
      this.menu.close();
      this.readyQueue = [];
      this.queue = this.queue.filter(q => !(q.actor && q.actor.isParty));
      this.buildParty();
      this.shot = null; this.placeParty(false);
      this.party.forEach(p => { p.turn = 32768 + U.rand(24576); });
      this.banner1('Party ' + this.partyNo + ' takes over!');
      FF7.audio.sfx('summon', 0.5);
      this.camTo(this.defaultCam(), 40);
    }

    // ---------------------------------------------------------------- formations
    // FF7's battle formations (Enemy Mechanics FAQ 3.1; DynamixDJ's Enemy Encounter FAQ, "Encounter types"):
    //   normal / preempt: the party (z 3, back row z 4) faces the enemies (rows from z -1.6 back). In a
    //     pre-emptive strike the enemies stand with their backs to the party.
    //   back: the party stands where it always does, its rows swapped for the battle, shown with its back to
    //     the enemies. Only shown: FF7 deals them no back damage (their real facing, homeFacing, is on the
    //     enemies) and each member turns round once they act.
    //   side: the enemies in the middle, the party on both sides of them: formation slots 1 and 3 on the near
    //     side (+z), which the enemies face, slot 2 behind them (-z).
    //   pincer (Ambush): the party in the middle, enemy group 1 on the left (-z), group 2 on the right (+z);
    //     the outside members (slots 1 and 3) face group 1, the middle one group 2.
    //   hidden 'preempt' (Yuffie's Pagoda duels): the enemy is shown facing Yuffie but has its back to her;
    //   hidden 'ambush' (Ruby WEAPON): the party is shown facing it but has its back to it.
    // `facing` is what's drawn, `homeFacing` the real facing (FF7.battle.calc.isBack). A fighter keeps facing the
    // side it last attacked, and turns round when a physical attack hits it from behind (faceSide).
    get split() { return this.type === 'side' || this.type === 'pincer'; }
    placeParty(anim) {
      if (!this.shot) this.pickShot();
      const T = this.type, mir = this.shot.mirror, H = this.hidden;
      const spread = (n) => n === 1 ? [0] : n === 2 ? [-1.1, 1.1] : [-2.0, 0, 2.0];
      const X = (cx, off) => mir ? cx - off : cx + off;       // side-on shots (camera at -x): slot 1 stands farthest
      const back = (p) => p.row === 'back' ? 1.0 : 0;
      const put = (p, home, real, shown) => {
        p.home = home;
        if (!anim || !p.pos) p.pos = home.slice();
        if (!anim) { p.homeFacing = real; p.facing = shown != null ? shown : real; }    // (a row change keeps them turned)
      };
      const ps = this.party.slice().sort((p, q) => p.fslot - q.fslot);
      if (T === 'side') {
        const g = this.sideGeo || (this.sideGeo = this.sideGeometry());
        const far = (p) => p.fslot === 1 && ps.length > 1;
        const A = ps.filter(p => !far(p)), Bs = ps.filter(far);
        A.forEach((p, i) => { p.flank = 1; put(p, [X(SPLIT_X, spread(A.length)[i]), 0, g.z1 + g.gap + back(p)], Math.PI); });
        Bs.forEach((p, i) => { p.flank = 2; put(p, [X(SPLIT_X, spread(Bs.length)[i]), 0, g.z0 - g.gap - back(p)], 0); });
      } else if (T === 'pincer') {
        const xs = spread(ps.length);
        ps.forEach((p, i) => { p.flank = 0; put(p, [X(SPLIT_X, xs[i]), 0, 0], p.fslot === 1 ? 0 : Math.PI); });
      } else {
        const xs = spread(ps.length);
        ps.forEach((p, i) => {
          const x = xs[i] + 1.2;
          p.flank = 1;
          put(p, [mir ? 2.4 - x : x, 0, p.row === 'back' ? 4.0 : 3.0], H === 'ambush' ? 0 : Math.PI, T === 'back' ? 0 : H === 'ambush' ? Math.PI : null);
        });
      }
    }
    // side attack: the enemy block's z range and the party's distance from it (a big enemy gets a wider berth)
    sideGeometry() {
      const es = this.enemies.filter(e => e.home && !this.mainOf(e)), zs = es.map(e => e.home[2]);
      const w = Math.max(1.6, ...es.map(e => e.width || 1.6));
      return { z0: zs.length ? Math.min(...zs) : 0, z1: zs.length ? Math.max(...zs) : 0, gap: Math.max(SPLIT_GAP, w * 0.5 + 2.2) };
    }
    // multi-part bosses: a part whose model carries anchor { to: '<main enemy id>', offset: [x, y, z] }
    // (FF7.creatures.anchor) is placed relative to that enemy instead of taking a slot in the row
    mainOf(e) { const an = e && e.model && e.model.anchor; return an ? this.enemies.find(x => x !== e && x.id === an.to && !(x.model && x.model.anchor)) : null; }
    layoutEnemies() {
      const T = this.type, pincer = T === 'pincer', split = this.split;
      const groups = {};
      this.enemies.forEach(e => {
        if (this.mainOf(e)) return;
        const g = pincer && e.group === 2 ? 2 : 1, r = e.rowN || (e.row === 'back' ? 2 : 1), G = groups[g] = groups[g] || {};
        (G[r] = G[r] || []).push(e);
      });
      // rows (FF7 numbers them 1, 2, 3...; only the ones present count) stand one behind the other, away from
      // the party; the split formations pack them closer
      const depth = (lv) => (split ? [0, 1.6, 3.0] : [0, 2.2, 4.0])[Math.min(2, lv)];
      for (const g in groups) {
        const rs = Object.keys(groups[g]).map(Number).sort((a, b) => a - b);
        const gap = Math.max(SPLIT_GAP, ...groups[g][rs[0]].map(e => (e.width || 1.6) * 0.5 + 2.2));
        rs.forEach((r, lv) => {
          const list = groups[g][r];
          const widths = list.map(e => Math.max(1.4, (e.width || 1.6)));
          const total = widths.reduce((a, b) => a + b, 0) + (list.length - 1) * 0.6;
          let x = -total / 2 + (split ? SPLIT_X : -1.0);
          list.forEach((e, i) => {
            x += widths[i] / 2;
            let z, face;
            if (pincer) { const s = +g === 2 ? 1 : -1; z = s * (gap + depth(lv) + (e.depth || 0) * 0.3); face = s > 0 ? Math.PI : 0; }
            else if (split) { z = depth(rs.length - 1) / 2 - depth(lv); face = 0; }          // side: the block centred on z 0
            else { z = -1.6 - depth(lv) - (e.depth || 0) * 0.5; face = !this.laidOut && (T === 'preempt' || this.hidden === 'preempt') ? Math.PI : 0; }   // (backs turned from the start only)
            e.home = [x, 0, z];
            if (!e.pos || !e.placed) {                 // (fighters already placed keep their spot and facing)
              e.pos = e.home.slice(); e.placed = true;
              e.homeFacing = face; e.facing = !this.laidOut && this.hidden === 'preempt' && T !== 'preempt' ? 0 : face;
            }
            x += widths[i] / 2 + 0.6;
          });
        });
      }
      this.placeParts(false);
      this.laidOut = true;
    }
    // parts: offset x/z in metres in the main part's facing frame; y lifts the part (and its cursor).
    // offset may also be a list [[x, y, z], ...]: the n-th instance of that part id takes the n-th entry.
    // move: put them there now (their main just turned round)
    placeParts(move) {
      const nth = {};
      this.enemies.forEach(e => {
        const m = this.mainOf(e); if (!m) return;
        const an = e.model.anchor, n = nth[e.id] = (nth[e.id] || 0) + 1, f = m.facing || 0;
        const o = Array.isArray((an.offset || [])[0]) ? an.offset[(n - 1) % an.offset.length] : (an.offset || [0, 0, 0]);
        e.home = [m.home[0] + Math.cos(f) * o[0] + Math.sin(f) * o[2], o[1] || 0, m.home[2] - Math.sin(f) * o[0] + Math.cos(f) * o[2]];
        if (move || !e.pos || !e.placed) { e.pos = e.home.slice(); e.placed = true; }
        e.facing = f; e.homeFacing = m.homeFacing != null ? m.homeFacing : f;
      });
    }
    // Turn a fighter for good toward the side `toward` stands on (FF7: after attacking it, or when it hits them
    // from behind). A multi-part enemy turns as one; an enemy with its own facing rules (def.backFrom: Air
    // Buster) only turns through its AI.
    faceSide(c, toward) {
      if (!c || !toward || !c.alive) return;
      const u = c.isParty ? c : (this.mainOf(c) || c);
      if ((u.def0 && u.def0.backFrom) || !u.home || !toward.home) return;
      const dz = toward.home[2] - u.home[2];
      if (Math.abs(dz) < 1) return;                  // on the same line: no side to face
      const ang = dz > 0 ? 0 : Math.PI;
      if (u.homeFacing === ang) return;
      u.homeFacing = ang;
      if (!u.acting && !(u.isParty && this.runHold)) u.facing = ang;
      if (!u.isParty) this.placeParts(true);
    }
    // running away: each member heads away from the enemies still standing (both ways in a side attack)
    fleeDir(p) {
      const es = this.enemies.filter(e => e.targetable && e.home);
      const ez = es.length ? es.reduce((s, e) => s + e.home[2], 0) / es.length : -1.6;
      return Math.sign((p.home || p.pos)[2] - ez) || 1;
    }
    // FF7: no running from an Ambush (pincer) until every enemy on one side is gone (Escape / Smoke Bomb still work)
    canRun() {
      if (this.type !== 'pincer') return true;
      const on = (g) => this.enemies.some(e => (e.group === 2 ? 2 : 1) === g && e.targetable && !e.dying);
      return !(on(1) && on(2));
    }
    addEnemy(id, opts = {}) {
      const e = B.fromEnemy(id, this.enemies.length);
      if (!e) return null;
      e.battle = this;
      e.rowN = opts.row || (e.row === 'back' ? 2 : 1);
      e.group = opts.group || 1;
      e.model = FF7.creatures.build(e.def0.look, id);
      // persistHp: HP shared by every battle with the same key (Ultimate WEAPON's chase)
      const pk = e.def0.persistHp;
      if (pk) { const st = FF7.state; st.persistHp = st.persistHp || {}; if (st.persistHp[pk] > 0) e.hp = Math.min(e.maxHp, st.persistHp[pk]); }
      const h = e.model.height ? e.model.height * (e.model.scale || 1) : 1.5;
      e.width = Math.max(1.2, Math.min(6, h * 0.9));
      e.depth = h > 3 ? 1 : 0;
      e.turn = opts.silent ? 0 : U.rand(20000);
      this.enemies.push(e);
      if (!opts.silent) { this.layoutEnemies(); if (opts.near && !(e.model && e.model.anchor)) { e.pos = opts.near.pos.slice(); e.pos[0] += 1.5; } e.model.alpha = 0; e.fadeIn = 20; }
      return e;
    }
    transformEnemy(e, into) {
      const n = B.fromEnemy(into, e.index);
      if (!n) return;
      const keep = { pos: e.pos, home: e.home, group: e.group, rowN: e.rowN, battle: this, placed: e.placed, facing: e.facing, homeFacing: e.homeFacing };
      Object.keys(e).forEach(k => delete e[k]);
      Object.setPrototypeOf(e, Object.getPrototypeOf(n));
      Object.assign(e, n, keep);
      e.model = FF7.creatures.build(e.def0.look, into);
    }
    swapModel(c, model) { c.model = model; model.scale = model.scale || 1.2; }

    // ---------------------------------------------------------------- camera
    // The opening shot (SHOTS) is picked once per battle, before the party is placed. defaultCam() frames
    // it on whoever is present, so after every action the camera returns to a fitted home view with every
    // fighter, feet to head, between the top banner and the command windows.
    // (side / pincer formations: side-on shots only, with the two sides left and right of the screen)
    pickShot() {
      const ok = this.split ? SPLIT_SHOTS : SHOTS;
      const want = this.opts.shot, pool = ok.filter(s => !want || s.id === want);
      this.shot = U.weighted(pool.length ? pool : ok, 'w');
    }
    // fighters to frame: { x, z, h, w } (party heights include the active-member marker)
    shotSubjects(list) {
      const out = [];
      for (const c of list) {
        if (!c || !c.model || (c.hidden && !c.dying)) continue;
        const m = c.model, h = m.height ? m.height * (m.scale || 1) : 1.5, p = c.home || c.pos;
        out.push(c.isParty ? { x: p[0], z: p[2], h: h + 0.75, w: 0.7 } : { x: p[0], z: p[2], h: Math.min(6.5, h), w: Math.min(2.5, (c.width || 1.6) * 0.5) });
      }
      return out;
    }
    defaultCam() {
      const s = this.shot || SHOTS[0], subj = this.shotSubjects(this.party.concat(this.enemies));
      return subj.length ? fitCam(s, framePts(subj)) : { eye: [8.5, 5.2, 10.5], target: [-0.2, 1.1, -0.6], fov: 40 };
    }
    // the intro sweep starts wider, higher and swung round from the opening shot
    introCam() { const subj = this.shotSubjects(this.party.concat(this.enemies)); return subj.length ? fitCam(introShot(this.shot || SHOTS[0]), framePts(subj)) : this.defaultCam(); }
    // victory: in front of the party (they face the enemies' side)
    victoryCam() { const subj = this.shotSubjects(this.party); return subj.length ? fitCam(this.type === 'side' ? SIDE_VICTORY : victoryShot(this.shot || SHOTS[0]), framePts(subj), VICTORY_BOX) : this.defaultCam(); }
    attackCam(a, t) { return attackCamFor(this.shot, a.pos, t.pos, a.isParty, !!a.isParty !== !!t.isParty); }
    summonCam() { return summonCamFor(this.shot); }
    // centres of the fighters on screen (the arena fades out props that come between them and the camera)
    viewSubjects() { const out = []; for (const c of this.party.concat(this.enemies)) if ((!c.hidden || c.dying) && c.model && c.model.visible !== false) out.push([c.pos[0], 1, c.pos[2]]); return out; }
    camTo(goal, frames = 30) { this.camGoal = { from: JSON.parse(JSON.stringify(this.cam)), to: goal, t: 0, n: Math.max(1, frames) }; }
    *cameraOn(a, t) {
      if (!a || !t) return;
      this.camTo(this.attackCam(a, t), 20);
      yield 8;
    }
    *cameraHome() { this.camTo(this.defaultCam(), 24); yield 1; }
    updateCamera() {
      if (this.camGoal) {
        const g = this.camGoal; g.t++;
        const k = g.t / g.n, e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        for (let i = 0; i < 3; i++) { this.cam.eye[i] = U.lerp(g.from.eye[i], g.to.eye[i], e); this.cam.target[i] = U.lerp(g.from.target[i], g.to.target[i], e); }
        this.cam.fov = U.lerp(g.from.fov, g.to.fov, e);
        if (g.t >= g.n) this.camGoal = null;
      }
    }

    // ---------------------------------------------------------------- positions for UI/effects
    hitPos(c) { const h = (c.model && c.model.height ? c.model.height * (c.model.scale || 1) : 1.5); return [c.pos[0], c.pos[1] + Math.min(h * 0.55, 3), c.pos[2]]; }
    cursorPos(c) { const h = (c.model && c.model.height ? c.model.height * (c.model.scale || 1) : 1.5); return [c.pos[0] - (c.isParty ? 0.4 : Math.min(1.2, h * 0.3)) , c.pos[1] + Math.min(h * 0.6, 3.2), c.pos[2]]; }
    number(c, v, opts = {}) { FF7.fx.number(this.hitPos(c), v, opts); }

    // ---------------------------------------------------------------- animation helpers (generators)
    *banner(text, frames = 50, opts = {}) {
      const b = { text, t: frames || 9999, persist: !frames, limit: !!opts.limit };
      this.banners.push(b);
      if (frames) yield Math.min(frames, 40);
      else { this.currentBanner = b; yield 12; }
    }
    clearBanner() { if (this.currentBanner) { this.currentBanner.t = 0; this.currentBanner = null; } }
    // a party member speaking mid-battle (FF7's message window at the top, the speaker's name over the line): the
    // action waits on it until OK, or a few seconds
    *speech(who, text, frames = 210) {
      const ch = FF7.state.chars && FF7.state.chars[who];
      const box = this.speechBox = { name: ch ? ch.name : who, text, t: 0 };
      while (box.t < frames && !(box.t > 20 && I.pressed('ok'))) { box.t++; yield 1; }
      this.speechBox = null;
    }
    playAnim(c, name) {
      const m = c.model; if (!m) return;
      const clip = (m.anims && m.anims[name]) || name;
      m.play(clip, { loop: false, restart: true });
    }
    idle(c) {
      this.clearBanner();
      const m = c.model; if (!m) return;
      if (c.dead) return m.play((m.anims && m.anims.dead) || 'dead', { loop: false });
      const weak = c.isParty && c.hp < c.maxHp / 4;
      m.play((m.anims && (weak ? m.anims.weak : m.anims.battle)) || 'battle', { loop: true, restart: false });
      c.pos = c.pos || c.home.slice();
    }
    hurt(t) {
      if (!t.model) return;
      t.flash = 8;
      if (t.dead) return;
      this.playAnim(t, 'hurt');
      t._resumeIdle = 20;
    }
    *approach(a, t) {
      const from = a.pos.slice();
      const dir = Math.sign(a.pos[2] - t.pos[2]) || (a.isParty ? 1 : -1);   // come at the target from our side of it
      const tr = (t.width || 1.2) * 0.45 + 0.7;
      const to = [t.pos[0] + (a.pos[0] > t.pos[0] ? 1 : -1) * 0.2, 0, t.pos[2] + dir * tr];
      a.facing = Math.atan2(t.pos[0] - to[0], t.pos[2] - to[2]);
      this.playAnim(a, 'run');
      a.model && a.model.play && a.model.play((a.model.anims && a.model.anims.run) || 'run', { loop: true });
      FF7.audio.sfx('run', 0.4);
      for (let i = 1; i <= 12; i++) { const k = i / 12; a.pos = [U.lerp(from[0], to[0], k), 0, U.lerp(from[2], to[2], k)]; yield 1; }
    }
    *retreat(a) {
      const from = a.pos.slice();
      a.model && a.model.play && a.model.play((a.model.anims && a.model.anims.run) || 'run', { loop: true });
      for (let i = 1; i <= 12; i++) { const k = i / 12; a.pos = [U.lerp(from[0], a.home[0], k), 0, U.lerp(from[2], a.home[2], k)]; yield 1; }
      a.pos = a.home.slice();
      a.facing = a.homeFacing != null ? a.homeFacing : (a.isParty ? Math.PI : 0);
    }
    pointAt(t) { this.pointer = t; }
    *summonIntro(a, ab) {
      this.playAnim(a, 'cast');
      FF7.audio.sfx('summon');
      FF7.fx.screenTint('#000010', 0.55, 90);
      yield* this.banner(ab.name, 0);
      this.camTo(this.summonCam(), 30);
      // summon model appears (if available)
      const mk = FF7.summons3d && FF7.summons3d[ab.id];
      if (mk) { try { this.summonModel = mk(); this.summonModel.position = [0, 0, -1]; this.summonModel.rotY = 0; this.summonT = 0; } catch (e) { console.error(e); } }
      yield 36;
      if (ab.attackName) { this.clearBanner(); yield* this.banner(ab.attackName, 0); }
      yield 12;
    }
    *limitIntro(a, ab) {
      FF7.audio.sfx(a.id === 'aeris' ? 'aeris_limit' : 'limit');
      FF7.sceneMgr.doFlash('#ffffff', 10, 0.5);
      yield* this.banner(ab.name, 0, { limit: true });
      this.camTo({ eye: [a.pos[0] + 4, 2.5, a.pos[2] + 3.5], target: [a.pos[0], 1.2, a.pos[2]], fov: 40 }, 16);
      yield 18;
    }
    reel(symbols, opts = {}) {
      const w = { done: false, result: null, symbols, idx: U.rand(symbols.length), t: 0, speed: opts.speed || 6, label: opts.label || '' };
      this.reelW = w;
      return w;
    }

    // ---------------------------------------------------------------- results
    showResult(res, ab) {
      const t = res.target;
      if (!t) return;
      if (res.miss) { this.number(t, res.text || 'Miss', { color: '#ffffff' }); return; }
      if (res.text != null && !res.dmg && !res.heal) { if (res.text) this.number(t, res.text, { color: '#e0e0ff' }); }
      else if (res.dmg > 0 || res.heal) this.number(t, res.dmg, { heal: res.heal, mp: res.mp, crit: res.crit });
      if (res.revive) this.revived(t);
      if (res.killed || (t.dead && !res.heal)) this.onDeath(t);
      if (res.add.length || res.remove.length) this.statusFx(t, res);
    }
    statusFx(t, res) { if (res.add.includes('death')) return; if (FF7.fx.statusApplied) FF7.fx.statusApplied(this, t, res); }
    // Per-frame status visuals (FF7.fx.statusTick): frog / mini models, animation speed (Haste x2,
    // Slow x0.5, Stop / Petrify / Paralysis frozen), kneeling, the sleep nod, the confusion spin
    statusAnim(c) {
      const fx = FF7.fx, k = fx.statusTick ? fx.statusTick(this, c) : 1;
      if (c.model) c.model.update(k);
      if (fx.statusPose) fx.statusPose(this, c);
    }
    // Limit start (FF7): pink banner and flash, then a close-up of the character in the golden aura
    *limitAura(a, ab) {
      FF7.audio.sfx(a.id === 'aeris' ? 'aeris_limit' : 'limit');
      FF7.sceneMgr.doFlash('#ffffff', 10, 0.5);
      const aura = FF7.fx.limitAura ? FF7.fx.limitAura(this, a) : null;
      const m = a.model, H = m && m.height ? m.height * (m.scale || 1) : 1.7, k = H / 1.7, f = a.facing || 0, ty = H > 2.2 || (m && m.bones && m.bones.catArmR) ? 0.84 : 0.64;   // Cait Sith on the moogle / tall rigs: frame the rider
      this.camTo({ eye: [a.pos[0] + Math.sin(f) * 2.3 * k + (a.isParty ? 0.7 : -0.7) * k, (ty - 0.02) * H, a.pos[2] + Math.cos(f) * 2.3 * k], target: [a.pos[0], ty * H, a.pos[2]], fov: 40 }, 1);
      yield* this.banner(ab.name, 0, { limit: true });
      yield 34;
      if (aura) aura.stop();
    }
    // ...then the camera follows the attack to its target(s) (camera tween, see camTo)
    limitFollow(a, targets, melee) {
      const ts = (targets || []).filter(t => t && t.pos); if (!ts.length) return;
      const n = ts.length, cx = ts.reduce((s, t) => s + t.pos[0], 0) / n, cz = ts.reduce((s, t) => s + t.pos[2], 0) / n;
      const foe = a && a.pos && !ts[0].isParty && Math.abs(a.pos[2] - cz) > 0.5, zs = foe ? Math.sign(a.pos[2] - cz) : ts[0].isParty ? -1 : 1;   // from the caster's side
      const h = Math.min(3, Math.max(...ts.map(t => (t.model && t.model.height ? t.model.height * (t.model.scale || 1) : 1.5))));
      const spread = Math.max(0, ...ts.map(t => Math.abs(t.pos[0] - cx)));
      if (n === 1 && melee) this.camTo({ eye: [cx + 3.3, 1.3 + h * 0.45, cz + 4.2 * zs], target: [cx + 0.15, h * 0.55, cz + 0.8 * zs], fov: 44 }, 16);
      else this.camTo({ eye: [cx + 3.8 + spread, 2.2 + h * 0.4, cz + (5.2 + spread) * zs], target: [cx, h * 0.5, cz], fov: 46 }, 16);
    }
    revived(t) { if (t.model) t.model.play((t.model.anims && t.model.anims.battle) || 'battle', { loop: true, restart: true }); t.turn = 0; }
    onDeath(t) {
      if (t.isParty) { this.playAnim(t, 'dead'); t.ready = false; this.readyQueue = this.readyQueue.filter(x => x !== t); if (this.menu.actor === t) this.menu.close(); t.limitGauge = t.limitGauge; this.enemies.forEach(e => { if (e.manipulator === t) this.releaseManip(e); }); return; }
      this.enemyDied(t);
    }
    enemyDied(e, opts = {}) {
      if (e.dying) return;
      const d = e.def0 || {};
      // noDeath (Ultimate WEAPON chase): at 0 HP it flies off instead of dying; its stored HP resets
      if (d.noDeath) {
        e.hp = 1; e.noDeathFled = true;
        if (d.persistHp) { FF7.state.persistHp = FF7.state.persistHp || {}; FF7.state.persistHp[d.persistHp] = 20000; }
        this.releasePrisoner(e);
        this.fxCos.push(new FF7.Coroutine(this.fleeEnemy(e)));
        return;
      }
      e.dying = 36;
      FF7.audio.sfx(e.boss ? 'bosskill' : 'death');
      this.releasePrisoner(e);
      // queue a final attack if the AI has one
      const fin = B.ai.onDeath(this, e);
      if (fin) this.queue.unshift(fin);
      // onDeathRemove: [ids] (or true = everyone) leave with it, no rewards
      if (d.onDeathRemove) {
        const ids = Array.isArray(d.onDeathRemove) ? d.onDeathRemove : null;
        this.enemies.forEach(x => { if (x !== e && x.targetable && (!ids || ids.includes(x.id))) { this.releasePrisoner(x); x.hidden = true; x.fled = true; x.removed = 'onDeath'; } });
      }
      // phaseNext: the fight continues with a new formation (Hojo -> Helletic Hojo -> Lifeform-Hojo N)
      if (d.phaseNext && d.phaseNext.length) {
        this.enemies.forEach(x => { if (x !== e && x.targetable) { x.hidden = true; x.fled = true; x.removed = 'phase'; } });
        const next = d.phaseNext.slice();
        const self = this;
        this.fxCos.push(new FF7.Coroutine((function* () {
          yield 40;
          next.forEach(id => { const n = self.addEnemy(id, {}); if (n) n.turn = U.rand(30000); });
          self.layoutEnemies();
        })()));
      }
    }
    // Manipulate ends (the manipulator is KO'd, manipulates another enemy...): the enemy is its own again
    releaseManip(e) {
      e.removeStatus('manipulate'); e.manipulator = null;
      if (this.menu.actor === e) this.menu.close();
      this.readyQueue = this.readyQueue.filter(x => x !== e); e.ready = false;
    }
    releasePrisoner(x) {
      const pr = x.vars && x.vars.prisoner;
      if (pr) { pr.removeStatus('imprisoned'); x.vars.prisoner = null; }
      if (x.prisoner) { x.prisoner.removeStatus('imprisoned'); x.prisoner = null; }
    }
    removeFromBattle(t, why) { t.hidden = true; t.removed = why; if (t.isParty) { this.readyQueue = this.readyQueue.filter(x => x !== t); if (this.menu.actor === t) this.menu.close(); } }
    *fleeEnemy(e) {
      // away from the party (a side attack's enemies, with the party on both sides, leave sideways)
      const pz = this.party.length ? this.party.reduce((s, p) => s + (p.home || p.pos)[2], 0) / this.party.length : 3;
      const dx = this.type === 'side' ? 0.3 : 0, dz = this.type === 'side' ? 0 : 0.3 * (Math.sign((e.home || e.pos)[2] - pz) || -1);
      for (let i = 0; i < 20; i++) { e.pos[0] += dx; e.pos[2] += dz; if (e.model) e.model.alpha = 1 - i / 20; yield 1; }
      e.hidden = true; e.fled = true;
    }
    // Cover (Materia FAQ, via the Walkthrough): only a physical attack with power that hits ONE target (nTargets),
    // isn't flagged Can't Cover and doesn't cure / inflict / toggle Frog; the coverer must be free of Death,
    // Sleep, Confusion, Stop, Frog, Small, Petrify, Berserk, Paralysis, Darkness and Imprisoned; of those whose
    // Cover check passes, a random one takes the hit
    coverFor(t, a, ab, nTargets) {
      if (!t.isParty || a.isParty || (ab && ab.kind !== 'phys' && ab.src !== 'attack')) return null;
      if ((nTargets || 1) > 1 || (ab && (ab.noCover || ab.power === 0 || (ab.add && ab.add.includes('frog')) || (ab.remove && ab.remove.includes('frog'))))) return null;
      const BAR = ['sleep', 'confusion', 'stop', 'frog', 'small', 'petrify', 'berserk', 'paralysis', 'darkness', 'imprisoned'];
      const coverers = this.party.filter(p => p !== t && p.alive && !p.hidden && p.cover > 0 && !BAR.some(s => p.has(s)) && U.chance(p.cover));
      if (!coverers.length) return null;
      const p = U.pick(coverers);
      this.number(p, 'Cover', { color: '#ffffa0' });
      return p;
    }
    // Limit gauge: units = [[300*HPlost/MaxHP]*256*status/LNum]
    limitGain(t, hpLost) {
      if (!t.char || t.transformed) return;
      const LN = { cloud: [140, 324, 435, 506], barret: [129, 240, 374, 450], tifa: [120, 334, 509, 566], aeris: [200, 284, 322, 436], redxiii: [195, 300, 389, 486], yuffie: [200, 300, 400, 480], caitsith: [160, 180, 9590, 12760], vincent: [202, 244, 319, 426], cid: [200, 280, 380, 480] }[t.id] || (FF7.data.characters[t.id] || {}).limitDiv;   // (limitDiv: the Turks' own)
      if (!LN) return;
      const f = t.has('fury') ? 2 : t.has('sadness') ? 0.5 : 1;
      const units = Math.floor(Math.floor(300 * hpLost / t.maxHp) * 256 * f / LN[(t.char.limitLevel || 1) - 1]);
      t.limitGauge = Math.min(255, t.limitGauge + units);
    }
    // After-hit bookkeeping: counters, kill counts, e.skill learning, steal-as-well, HP/MP absorb
    afterHit(a, t, res, ab, act, opts = {}) {
      if (!t || res.miss) return;
      if (res.killed && a.isParty && !t.isParty && !opts.noKillCredit) { if (a.char) a.char.kills = (a.char.kills || 0) + 1; this.kills[a.id] = (this.kills[a.id] || 0) + 1; }
      // hit from behind (FF7: "you will take double damage and then turn to face your last attacker"); a
      // fighter that can't move (asleep, stopped...) stays as it is
      if (res.back && a && t.canAct()) this.faceSide(t, a);
      // the kind of the party's last hit on an enemy, for AI scripts that read it (Lost Number splits into its
      // psychic half after a magic hit, its physical half after a physical one: e.vars.lastHit)
      if (a && a.isParty && !t.isParty && ab && ab.src !== 'item') (t.vars || (t.vars = {})).lastHit = ab.kind === 'phys' || ab.phys === true || ab.src === 'attack' ? 'phys' : 'mag';
      // enemy skill learning (Enemy-Skill FAQ): an enemy's skill that hits a character with E.Skill materia
      // (a manipulated enemy's too); usable for the rest of the battle, kept only when the battle is won
      if (ab && ab.eskill && !a.isParty && t.isParty && t.eskillMateria && t.eskillMateria.length) t.eskillMateria.forEach(m => {
        m.eskills = m.eskills || [];
        if (m.eskills.includes(ab.eskill)) return;
        m.eskills.push(ab.eskill); this.learnedEskills.push({ who: t.name, id: ab.eskill, materia: m });
        if (t.abilities && t.abilities.eskills && !t.abilities.eskills.includes(ab.eskill)) t.abilities.eskills.push(ab.eskill);
      });
      // HP/MP absorb support pairing: [damage / 10] HP, [damage / 100] MP; an ability that healed its target hurts
      // the user instead (Walkthrough: HP Absorb / MP Absorb)
      if (a.isParty && a.alive && act && act.supports) act.supports.forEach(s => {
        const hp = Math.floor(res.dmg / 10), mp = Math.floor(res.dmg / 100);
        if (s.id === 'hp_absorb') { if (res.heal) a.hp = Math.max(1, a.hp - hp); else a.heal(hp); }
        if (s.id === 'mp_absorb') a.mp = res.heal ? Math.max(0, a.mp - mp) : Math.min(a.maxMp, a.mp + mp);
      });
      // Steal as well: the standard Steal on every enemy the paired ability hits
      if (a.isParty && !t.isParty && act && act.supports && act.supports.some(s => s.id === 'steal_as_well') && t.steals && t.steals.length && !t.stolen) {
        const msg = B.actions.tryStealFrom(this, a, t);
        if (/^Stole/.test(msg)) this.number(t, msg, { color: '#a0ffa0' });
      }
      // enemy counters (only against party-initiated actions)
      // (once per action and enemy, as in FF7: a 13-hit Knights of Round draws one counter, not 13)
      if (a.isParty && !t.isParty && t.alive && !(act && act.counter) && !(act && act._countered && act._countered.includes(t))) {
        if (act) (act._countered = act._countered || []).push(t);
        const kind = ab && (ab.kind === 'phys' || ab.src === 'attack') ? 'phys' : ab && ab.src === 'item' ? 'item' : 'mag';
        const c = B.ai.counter(this, t, a, kind, act);
        if (c) this.queue.unshift(c);
      }
      // the party's counter effects (Walkthrough / Party Mechanics Guide): Counter (the linked Command), Magic Counter
      // (the linked Magic / Summon) and Counter Attack (Attack) each roll on their own, 30 / 40 / 60 / 80 / 100% by
      // level, when an enemy's attack harms the character (once per enemy action; not against counters); the
      // character must be able to act. Attacks go back at the attacker, supportive abilities on the character.
      if (!a.isParty && t.isParty && !res.heal && !(act && act.counter) && !(act && act._pcountered && act._pcountered.includes(t))) {
        if (act) (act._pcountered = act._pcountered || []).push(t);
        if (t.alive && t.canAct() && !t.has('confusion') && !t.has('berserk') && (t.counterFx || []).length) {
          const out = [];
          for (const f of t.counterFx) {
            if (f.kind !== 'magic' && !(res.dmg > 0 || res.killed)) continue;      // (Counter / Counter Attack: "when damage is incurred")
            if (!U.chance([30, 40, 60, 80, 100][Math.min(4, Math.max(1, f.level) - 1)])) continue;
            const c = f.kind === 'attack' ? { actor: t, type: 'attack', targets: [a], side: 'enemy' } : B.actions.materiaAct(this, t, f.materia, a);
            if (c && B.actions.canPay(t, c)) { c.counter = true; out.push(c); }
          }
          for (let i = out.length - 1; i >= 0; i--) this.queue.unshift(out[i]);
        }
      }
      // Final Attack: the attack that KOs the character is answered with the paired materia's ability (Phoenix:
      // everyone back with the fire; Revive: Life / Life2 on the character), as many times per battle as the Final
      // Attack's level; it needs the MP like any spell
      if (!a.isParty && t.isParty && res.killed && t.dead && (t.finalFx || []).length) {
        for (const f of t.finalFx) {
          if (f.used >= Math.max(1, f.level)) continue;
          const c = B.actions.materiaAct(this, t, f.materia, a);
          if (!c || !B.actions.canPay(t, c)) continue;
          f.used++;
          Object.assign(c, { counter: true, forced: true, finalAttack: true });
          this.queue.unshift(c);
          break;
        }
      }
      // imprisonment summons (Reno's Pyramid, Bottomswell's Waterpolo)
      if (ab && ab.summon && !a.isParty && t.isParty && !t.dead && ab.kind !== 'special') {
        const p = this.addEnemy(ab.summon, { near: t });
        if (p) { p.prisoner = t; t.addStatus('imprisoned', { force: true }); p.pos = [t.pos[0], 0, t.pos[2] - 0.4]; }
      }
      // Arm Grab (Carry Armor): the arm holds its victim until the arm or Carry Armor dies
      if (ab && ab.grab && !a.isParty && t.isParty && !t.dead && a.def0 && a.def0.holdsPrisoner && !(a.vars && a.vars.prisoner)) {
        a.vars = a.vars || {}; a.vars.prisoner = t; t.addStatus('imprisoned', { force: true });
      }
      // deathElem (Sculpture: Holy): instant death from that element
      if (!t.isParty && t.alive && t.def0 && t.def0.deathElem && ab) {
        const els = ab.elements || (ab.element ? [ab.element] : []);
        if (els.some(el => t.def0.deathElem.includes(el))) { t.hp = 0; t.kill && t.kill(); this.onDeath(t); }
      }
      if (res.killed && !t.isParty) this.enemies.forEach(p => { if (p === t && p.prisoner) { p.prisoner.removeStatus('imprisoned'); p.prisoner = null; } });
    }
    // a Sneak Attack: the linked materia's ability, on random targets of its default kind, MP paid as usual
    sneakFor(p, materia) {
      const c = B.actions.materiaAct(this, p, materia, null);
      if (c && B.actions.canPay(p, c)) { c.counter = true; c.sneak = true; this.queue.push(c); }
    }

    // ---------------------------------------------------------------- ready handling
    readyDone(a, ok, act) {
      this.readyQueue = this.readyQueue.filter(x => x !== a);
      a.ready = false; a.turn = 0; a.defending = act && act.type === 'defend';
      a.actions++;
      if (ok && act) {
        if (act.type === 'multi') act.list.forEach(x => this.queue.push(x));
        else this.queue.push(act);
        (act.type === 'multi' ? act.list : [act]).forEach(x => { if (x.preTaken) this.heldItems.push(x); });
      }
    }
    nextReady(a) {
      if (this.readyQueue.length < 2) return;
      const i = this.readyQueue.indexOf(a);
      this.readyQueue.push(this.readyQueue.splice(i, 1)[0]);
      this.menu.close();
      FF7.audio.sfx('cursor');
    }
    escape(instant) {
      if (this.noEscape && !instant) { this.banner1("Can't escape!"); return false; }
      this.escaped = true;
      this.phase = 'escape';
      FF7.state.escapes = (FF7.state.escapes || 0) + 1;
      return true;
    }

    // ---------------------------------------------------------------- per-frame
    atbPaused() {
      if (this.phase !== 'fight') return true;
      if (this.paused) return true;
      if (this.co && this.current && this.current.type === 'summon') return true;
      const mode = FF7.state.config.atb;
      if (mode === 'wait' && this.menu.inSubmenu) return true;
      if (mode === 'recommended' && this.menu.inSubmenu && this.menu.state !== 'target') return true;
      return false;
    }
    tickTimers() {
      const vBase = 2 * this.SV * TPF;
      const cBase = 136 * TPF;
      const all = this.party.concat(this.enemies);
      for (const c of all) {
        if (!c.alive || c.hidden) continue;
        let f = c.has('stop') ? 0 : c.has('haste') ? 2 : c.has('slow') ? 0.5 : 1;
        const vInc = vBase * f;
        // turn timer
        // (as in FF7, the gauge stays full while the combatant's own command waits in the action queue:
        // otherwise fast enemies stacked up turn after turn behind the running animations)
        if (f > 0 && !c.has('sleep') && !c.has('paralysis') && !c.has('petrify') && !c.has('imprisoned') && !c.ready && !this.queue.some(q => q.actor === c && !q.counter && !q.free)) {
          const inc = c.isParty ? Math.floor((c.stat('dex') + 50) * vInc / this.normalSpeed) : Math.floor(c.stat('dex') * vInc / this.normalSpeed);
          c.turn = Math.min(65535, c.turn + Math.max(1, inc));
        }
        // V-timer units: status durations, poison, regen
        c.vAcc += vInc;
        while (c.vAcc >= 8192) {
          c.vAcc -= 8192;
          for (const s in c.timers) { const tm = c.timers[s]; if (tm.kind === 'v') { tm.units--; if (tm.units <= 0) c.removeStatus(s); } }
          if (c.has('poison')) { c.poisonAcc = (c.poisonAcc || 0) + 1; if (c.poisonAcc >= 10) { c.poisonAcc = 0; const d = Math.max(1, Math.floor(c.maxHp / 32)); c.hp = Math.max(0, c.hp - d); this.number(c, d, { color: '#c080ff' }); if (c.hp <= 0) { c.kill(); this.onDeath(c); } } }
        }
        if (c.has('regen')) { c.regenAcc = (c.regenAcc || 0) + vInc * (c.maxHp / 32) / (4 * 8192); if (c.regenAcc >= 1) { const h = Math.floor(c.regenAcc); c.regenAcc -= h; c.heal(h); } }
        // C-timer: death sentence, slow-numb
        c.cAcc += cBase * f;
        while (c.cAcc >= 8192) {
          c.cAcc -= 8192;
          for (const s of ['death_sentence', 'slow_numb']) { const tm = c.timers[s]; if (!tm) continue; tm.units--; if (tm.units <= 0) { c.removeStatus(s); if (s === 'death_sentence') { if (!c.deathForce) { c.kill(); this.onDeath(c); } } else { c.addStatus('petrify', { force: true }); } } }
        }
        // global timer: stop
        if (c.timers.stop) { c.timers.stop.acc = (c.timers.stop.acc || 0) + this.SV * TPF; while (c.timers.stop && c.timers.stop.acc >= 8192) { c.timers.stop.acc -= 8192; c.timers.stop.units--; if (c.timers.stop.units <= 0) c.removeStatus('stop'); } }
        if (c.has('petrify') && c.isParty) { c.turn = 0; }
        // ready
        if (c.turn >= 65535 && !c.ready && c.alive) {
          c.ready = true;
          if (c.isParty) {
            c.defending = false;
            const auto = B.ai.partyAuto(this, c);
            if (auto) { this.queue.push(auto); c.ready = false; c.turn = 0; }
            else if (!this.readyQueue.includes(c)) this.readyQueue.push(c);
          } else {
            // Manipulate (FF7): control ends when the manipulator is down; until then the enemy's turn
            // waits in the ready queue for its manipulator's command menu (bmenu 'manip')
            if (c.has('manipulate') && !(c.manipulator && c.manipulator.alive && !c.manipulator.hidden)) this.releaseManip(c);
            if (c.has('manipulate')) { if (!this.readyQueue.includes(c)) this.readyQueue.push(c); }
            else {
              const act = B.ai.choose(this, c);
              c.ready = false; c.turn = 0; c.actions++;
              if (act) this.queue.push(act);
            }
          }
        }
      }
    }

    update(canInput) {
      this.t++;
      FF7.fx.update();
      this.fxCos = this.fxCos.filter(co => co.update());
      this.updateCamera();
      this.banners = this.banners.filter(b => (b.persist ? true : --b.t > 0) && b.t > 0);
      // model animation + death fades
      const all = this.party.concat(this.enemies);
      for (const c of all) {
        const m = c.model; if (!m) continue;
        if (c._resumeIdle && --c._resumeIdle <= 0) { c._resumeIdle = 0; if (!c.acting) this.idle(c); }
        if (c.fadeIn) { c.fadeIn--; m.alpha = 1 - c.fadeIn / 20; }
        if (c.dying) {
          c.dying--;
          const k = 1 - c.dying / 36;
          m.tint = [1, 1 - k * 0.8, 1 - k * 0.3, 1];
          m.add = [k * 0.5, 0, k * 0.4];
          m.alpha = 1 - k;
          if (c.dying <= 0) { c.hidden = true; m.visible = false; }
        } else if (c.flash > 0) { c.flash--; m.add = c.flash % 4 < 2 ? [0.5, 0.5, 0.5] : null; } else if (!c.dying) m.add = null;
        this.statusAnim(c);
      }
      if (this.summonModel) { this.summonT++; this.summonModel.update(1); if (!this.current || this.current.type !== 'summon') { this.summonModel = null; } }
      if (this.reelW && !this.reelW.done) {
        const w = this.reelW; w.t++;
        if (w.t % Math.max(1, Math.round(12 - w.speed)) === 0) { w.idx = (w.idx + 1) % w.symbols.length; FF7.audio.sfx('cursor', 0.3); }
        if ((canInput && I.pressed('ok')) || w.t > 240) { w.done = true; w.result = w.symbols[w.idx]; FF7.audio.sfx('confirm'); setTimeout(() => { if (this.reelW === w) this.reelW = null; }, 400); }
      }
      switch (this.phase) {
        case 'intro':
          if (this.t > 40) { this.phase = 'fight'; this.party.concat(this.enemies).forEach(c => this.idle(c)); }
          return;
        case 'fight': break;
        case 'victory': if (this.victory) this.victory.update(canInput); return;
        case 'end': this.endUpdate(); return;
        case 'defeat':
          if (this.t - this.phaseT > 120) this.finish('lose');
          return;
        case 'escape':
          this.party.forEach(p => { if (p.alive) { const d = this.fleeDir(p); p.pos[2] += 0.1 * d; p.facing = d > 0 ? 0 : Math.PI; if (p.model) p.model.play((p.model.anims && p.model.anims.run) || 'run', { loop: true }); } });
          if (!this.escapeT) { this.escapeT = 1; FF7.audio.sfx('run'); FF7.sceneMgr.fadeOut(40); }
          if (++this.escapeT > 45) this.finish('escape');
          return;
      }
      // pause
      if (canInput && I.pressed('start')) this.paused = !this.paused;
      if (this.paused) return;
      if (!this.atbPaused()) this.tickTimers();
      // running away (hold L1 + R1)
      // (the party turns to run - for show: their real facing stays; an Ambush can't be run from while both
      // sides still stand)
      if (canInput && ((I.held('l1') && I.held('r1')) || I.held('flee')) && !this.noEscape && this.canRun()) {   // hold Q (or L1+R1) to run away
        this.runHold += this.SV * TPF;
        this.party.forEach(p => { if (p.alive && !p.acting) { p.facing = this.fleeDir(p) > 0 ? 0 : Math.PI; } });
        if (this.runHold >= 8192) {
          this.runHold -= 8192;
          if (this.type === 'preempt' || this.type === 'side' || U.chance(25)) this.runDifficulty--;
          if (this.runDifficulty <= 0) { this.escape(false); return; }
        }
      } else if (this.runHold) { this.runHold = 0; this.party.forEach(p => { if (!p.acting) p.facing = p.homeFacing != null ? p.homeFacing : Math.PI; }); }
      // action execution
      if (this.co) { if (!this.co.update()) { this.co = null; this.current = null; } }
      // (checkEnd can bring on a split-party battle's next party, which drops the fallen party's queued actions)
      if (!this.co && this.queue.length && !this.checkEnd() && this.queue.length) {
        const act = this.queue.shift();
        this.turnCount++;
        this.co = new FF7.Coroutine(A.exec(this, act), { name: 'action' });
        this.co.update();
      }
      if (!this.co) { if (this.checkEnd()) return; }
      // command input for ready party members
      if (!this.menu.open) {
        // a ready member who can't act yet (asleep, stopped) or whose last action is still queued keeps
        // their place: dropping them here left them 'ready' for good, and they never got a turn again
        // (an enemy freed from Manipulate leaves the queue and acts on its own again)
        this.readyQueue = this.readyQueue.filter(p => { if (!p.alive) return false; if (!p.isParty && !p.has('manipulate')) { p.ready = false; return false; } return true; });
        const p = this.readyQueue.find(q => q.canAct() && !this.queue.some(a => a.actor === q) && !(q.autoWait > this.t));
        if (p) {
          if (FF7.state.config.autoBattle && !this.opts.noAuto) {
            // Auto: the AI plays this character's turn; { type: 'wait' } leaves the character ready and
            // unused for a moment (FF7: a full ATB bar can be left waiting, e.g. to keep a Mime chain going)
            let act = null; try { act = B.ai.autoBattle(this, p); } catch (e) { console.error('auto-battle', e); }
            if (act && act.type === 'wait' && p.isParty) p.autoWait = this.t + (act.frames || 20);
            else if (act) { act.actor = p; this.readyDone(p, true, act); } else if (!p.isParty) this.readyDone(p, false); else this.menu.start(p);
          } else this.menu.start(p);
        }
      }
      // W (Select) toggles Auto at any time, even mid-animation or while a banner is up; turning it on takes over
      // the character whose command menu is open. Cancel/Menu turns it off (hand control back).
      if (I.pressed('auto') || (canInput && I.pressed('select'))) {
        FF7.state.config.autoBattle = !FF7.state.config.autoBattle; FF7.audio.sfx(FF7.state.config.autoBattle ? 'confirm' : 'cancel');
        if (FF7.state.config.autoBattle && this.menu.open && !this.opts.noAuto) this.menu.close();
      }
      else if (canInput && FF7.state.config.autoBattle && !this.menu.open && (I.pressed('cancel') || I.pressed('menu'))) { FF7.state.config.autoBattle = false; FF7.audio.sfx('cancel'); }
      if (this.menu.open && canInput) this.menu.update();
    }

    checkEnd() {
      if (this.phase !== 'fight') return true;
      if (this.co || this.fxCos.length) return false;     // an action, phase change or flee-off is still running
      if (this.forceEnd) { this.forceEnd = false; this.enemies.forEach(e => { if (e.targetable) { e.hidden = true; e.fled = true; e.removed = 'end'; } }); this.opts.noRewards = true; this.startVictory(); return true; }
      // FF7: an enemy turned to stone is out of the fight like a defeated one (its rewards count); it used to
      // stay 'standing', so a battle with only stone enemies left never ended
      for (const e of this.enemies) if (e.has('petrify') && !e.dead && !e.dying && !e.hidden) { e.hp = 0; e.kill(); this.enemyDied(e); }
      // Chocobo Lure battles: the wild chocobo isn't an opponent; beating everything else catches it
      const hostile = this.enemies.filter(e => !(e.def0 && e.def0.chocobo));
      const birds = this.enemies.filter(e => e.def0 && e.def0.chocobo);
      const pool = birds.length && hostile.length ? hostile : this.enemies;
      const enemiesLeft = pool.some(e => e.targetable && !e.dying);
      // (an enemy's final attack still waiting in the queue - Ultimate WEAPON's Shadow Flare after a long summon
      // outlasted its death fade - goes off before the battle ends)
      const dyingLeft = this.enemies.some(e => e.dying) || this.queue.some(q => q.forced && q.actor && !q.actor.isParty);
      if (!enemiesLeft && !dyingLeft) {
        if (pool === hostile) birds.forEach(e => { if (e.alive && !e.fled && !e.hidden) e.caught = true; });
        this.startVictory(); return true;
      }
      // (FF7: party members held by Carry Armor's arms don't count; with nobody else standing it's over - the
      // battle used to wait forever on the last, imprisoned member)
      const partyAlive = this.party.some(p => p.alive && !p.hidden && !p.has('imprisoned'));
      // (a Final Attack still waiting in the queue - Phoenix bringing everyone back - goes off first)
      if (!partyAlive && this.queue.some(q => q.finalAttack)) return false;
      if (!partyAlive && this.reserve && this.reserve.length) { this.nextParty(); return false; }   // (a split-party battle)
      if (!partyAlive) { this.phase = 'defeat'; this.phaseT = this.t; this.menu.close(); FF7.audio.stop(60); return true; }
      return false;
    }
    startVictory() {
      this.phase = 'victory';
      this.menu.close();
      FF7.fx.clear();
      if (this.opts.noRewards || this.form.noRewards) { this.finish('win'); return; }
      this.party.forEach(p => { if (p.alive && p.model) p.model.play((p.model.anims && p.model.anims.victory) || 'victory', { loop: true, restart: true }); });
      // the winners face the camera: the enemies' side (-z: a Back Attack's unturned members turn round, a
      // pincer's middle member too), or a side attack's side-on victory camera
      const vc = this.victoryCam();
      this.party.forEach(p => { if (p.alive && p.pos) p.facing = this.type === 'side' ? Math.atan2(vc.eye[0] - p.pos[0], vc.eye[2] - p.pos[2]) : Math.PI; });
      this.camTo(vc, 40);
      this.victory = new B.Victory(this);
    }
    finish(result) {
      if (this.finished) return;
      this.finished = true;
      // persistHp: remember the damage done for the next battle with the same key
      this.enemies.forEach(e => { const pk = e.def0 && e.def0.persistHp; if (pk && !e.noDeathFled) { FF7.state.persistHp = FF7.state.persistHp || {}; FF7.state.persistHp[pk] = e.hp > 0 ? e.hp : 0; } });
      this.party.forEach(p => B.toChar(p));
      FF7.fx.clear();
      // items picked but never used go back in the bag; lines emptied by picks go
      this.heldItems.forEach(x => { if (!x.used) { const e = FF7.state.items.find(i => i.id === x.item); if (e) e.qty = Math.min(99, e.qty + 1); else FF7.state.items.push({ id: x.item, qty: 1 }); } });
      { const L = FF7.state.items; for (let i = L.length - 1; i >= 0; i--) if (L[i].qty <= 0) L.splice(i, 1); }
      // Enemy Skills learned in a battle that was run from (or lost) are not kept (Enemy-Skill FAQ)
      if (result !== 'win') this.learnedEskills.forEach(l => { const k = l.materia && l.materia.eskills ? l.materia.eskills.indexOf(l.id) : -1; if (k >= 0) l.materia.eskills.splice(k, 1); });
      if (result === 'lose' && !this.opts.canLose && !this.form.noGameOver) {
        if (this.musicPushed) FF7.audio.stack.pop();
        FF7.sceneMgr.pop();
        FF7.scenes.gameOver();
        this.waiter.result = 'lose'; this.waiter.done = true;
        return;
      }
      if (result === 'lose') this.party.forEach(p => { if (p.char && p.char.hp <= 0) p.char.hp = 1; });
      FF7.state.battles++;
      this.endResult = result;
      this.phase = 'end';
      this.endFade = FF7.sceneMgr.fadeOut(18);
    }
    endUpdate() {
      if (!this.endFade || !this.endFade.done || this.popped) return;
      this.popped = true;
      if (this.musicPushed) FF7.audio.pop(30);
      FF7.sceneMgr.pop();
      FF7.sceneMgr.fadeIn(20);
      this.waiter.result = this.endResult; this.waiter.done = true;
    }

    // ---------------------------------------------------------------- render
    render() {
      const c = R.ctx;
      const ar = this.arena;
      c.fillStyle = ar.sky[0]; c.fillRect(0, 0, FF7.W, FF7.H);
      const fog = ar.fog ? { color: ar.fog, near: ar.fogNear || 14, far: ar.fogFar || 34 } : null;
      GL.begin({ clear: [0, 0, 0, 0], fog, light: ar.light || FF7.arena.LIGHT });      // per-arena light colour
      GL.camera(this.cam.eye, this.cam.target, this.cam.fov, 0.1, 200);
      FF7.arena.draw(ar, { t: this.t, cam: this.cam, subjects: this.viewSubjects() });
      const all = this.party.concat(this.enemies);
      for (const cb of all) {
        if (cb.hidden && !cb.dying) continue;
        const m = cb.model; if (!m) continue;
        m.position = [cb.pos[0], (m.floats ? 0 : 0) + (cb.lift || 0), cb.pos[2]];     // lift: limit leaps (visual only)
        m.rotY = cb.facing + (cb.vis ? cb.vis.spin : 0);                                // spin: Confusion
        if (!m.visible) continue;
        // blob shadow
        const s = Math.max(0.5, (m.height || 1) * (m.scale || 1) * 0.35);
        FF7.M4.trs(TMP, [cb.pos[0], 0.02, cb.pos[2]], [0, 0, 0], [s, 1, s * 0.8]);
        GL.draw(SHADOW, TMP, { blend: 'alpha', tint: [1, 1, 1, 0.35], unlit: true });
        m.draw(FF7.fx.statusOpts ? FF7.fx.statusOpts(cb, m) : undefined);               // status flash / tint (FF7 colours)
      }
      FF7.arena.drawLate(ar);               // arena props / walls in mid-fade, over the fighters
      FF7.fx.draw3d(this.cam, this);        // spell / limit effects and status overlays, depth-tested
      if (this.summonModel) { this.summonModel.draw(); }
      GL.end();
      FF7.fx.render();
      this.renderHUD();
    }
    renderHUD() {
      const c = R.ctx;
      // top banners (ability names)
      const b = this.banners[this.banners.length - 1];
      if (b) {   // FF7: a fixed wide bar across the top; Limit Break names get a pink bar
        const size = R.measure(b.text) + 40 > FF7.W - 8 ? 14 : 17;   // (a long line - Sense's elements - in a smaller font)
        const w = Math.min(FF7.W - 8, Math.max(FF7.W * 0.7, R.measure(b.text, size) + 40));
        R.window((FF7.W - w) / 2, 8, w, 38, b.limit ? { colors: ['#b0306a', '#80204e', '#601040', '#401030'] } : undefined);
        R.text(b.text, FF7.W / 2, size === 17 ? 17 : 19, { align: 'center', size });
      }
      if (this.speechBox) {
        const sb = this.speechBox, lines = R.wrap('“' + sb.text + '”', FF7.W - 64);
        R.window(8, 8, FF7.W - 16, 40 + lines.length * 24);
        R.text(sb.name, 24, 18);
        lines.forEach((l, i) => R.text(l, 30, 42 + i * 24));
      }
      if (this.phase === 'victory') { if (this.victory) this.victory.render(); return; }
      // bottom windows
      const y0 = FF7.H - 122;
      R.window(0, y0, 204, 122);
      R.window(208, y0, FF7.W - 208, 122);
      // column headers in small caps on the windows' top edge (FF7)
      const hdr = { size: 13, weight: '800', color: '#c8c8cc' };
      const timeLabel = this.atbPaused() ? 'WAIT' : 'TIME';      // FF7 shows WAIT while the ATB is paused
      R.text('NAME', 20, y0 + 3, hdr); R.text('BARRIER', 118, y0 + 3, hdr);
      R.text('HP', 236, y0 + 3, hdr); R.text('MP', 356, y0 + 3, hdr);
      R.text('LIMIT', 436, y0 + 3, hdr); R.text(timeLabel, 540, y0 + 3, hdr);
      this.party.forEach((p, i) => {
        const y = y0 + 28 + i * 30;
        const low = p.hp > 0 && p.hp < p.maxHp / 4;
        const queued = !p.dead && (this.queue.some(q => q.actor === p) || (this.co && this.curActor === p));
        const nameCol = p.hidden || queued ? R.COL.gray : p.dead ? R.COL.red : low ? R.COL.yellow : (this.menu.actor === p ? '#ffffff' : R.COL.white);
        R.text(p.name, 20, y, { color: nameCol });
        if (p.ready && this.menu.actor !== p && !p.dead) R.text('▶', 8, y + 1, { size: 12, color: R.COL.yellow });
        // barrier gauges
        R.bar(118, y + 6, 70, 4, p.has('barrier') && p.timers.barrier ? p.timers.barrier.units / 127 : 0, '#c0a020', '#fff080');
        R.bar(118, y + 13, 70, 4, p.has('mbarrier') && p.timers.mbarrier ? p.timers.mbarrier.units / 127 : 0, '#a040c0', '#f080ff');
        R.text(`${p.hp}/${p.maxHp}`, 330, y, { align: 'right', color: p.dead ? R.COL.red : low ? R.COL.yellow : R.COL.white });
        R.bar(236, y + 20, 94, 3, p.hp / p.maxHp, '#3070e0', '#80e0ff', '#5a1818');
        R.text(String(p.mp), 400, y, { align: 'right' });
        R.bar(356, y + 20, 48, 3, p.maxMp ? p.mp / p.maxMp : 0, '#40a040', '#a0ff90', '#5a1818');
        // LIMIT gauge (flashes when full, as in FF7)
        const full = p.limitGauge >= 255;
        let lt = p.has('fury') ? R.GAUGE.fury : p.has('sadness') ? R.GAUGE.sadness : R.GAUGE.limit;
        if (full) { const hue = (FF7.frame * 9) % 360; lt = { edge: `hsl(${hue},70%,40%)`, hi: '#ffffff', body: `hsl(${(hue + 40) % 360},90%,72%)` }; }
        R.gauge(436, y + 5, 92, 10, full ? 1 : p.limitGauge / 255, lt);
        // TIME / WAIT gauge
        const tf = p.turn / 65535;
        const ready = p.ready || tf >= 1;
        const acting = this.menu.actor === p;
        const tt = acting ? R.GAUGE.time : ready ? R.GAUGE.full : (FF7.state.config.atb === 'wait' ? R.GAUGE.wait : R.GAUGE.fill);
        R.gauge(540, y + 5, 88, 10, acting || ready ? 1 : tf, tt);
        if (p.has('stop') || p.has('sleep') || p.has('paralysis')) R.text(p.has('stop') ? 'Stop' : p.has('sleep') ? 'Sleep' : 'Paralyzed', 584, y + 1, { size: 11, align: 'center', color: '#ffffff' });
      });
      if (FF7.state.timer && R.drawTimer) R.drawTimer();
      if (FF7.state.config.autoBattle) {   // Auto indicator (top-right; blinks)
        R.window(FF7.W - 96, 8, 88, 30);
        R.textMid('AUTO', FF7.W - 52, 23, { align: 'center', size: 16, color: FF7.frame % 60 < 40 ? '#ffe060' : '#a09040' });
      }
      // pointer (roulette etc.)
      if (this.pointer && this.pointer.model) { const p = GL.project(this.cursorPos(this.pointer)); if (p.visible) R.cursor(p.x - 8, p.y); }
      this.menu.render();
      // reels
      if (this.reelW && FF7.fx.drawReel) FF7.fx.drawReel(this.reelW);      // picture reels (Slots, Tifa)
      else if (this.reelW) {
        const w = this.reelW;
        R.window(FF7.W / 2 - 110, 150, 220, 90);
        R.text(w.label, FF7.W / 2, 160, { align: 'center', size: 14, color: R.COL.cyan });
        R.text(w.done ? w.result : w.symbols[w.idx], FF7.W / 2, 188, { align: 'center', size: 28, color: w.done ? '#ffe060' : '#ffffff' });
      }
      if (this.paused) { R.fill('#000', 0.4); R.text('PAUSED', FF7.W / 2, 200, { align: 'center', size: 30 }); }
      if (this.phase === 'defeat') { R.fill('#000', Math.min(0.8, (this.t - this.phaseT) / 90)); }
    }
  }
  const TMP = M4.create();
  const SHADOW = (() => { const mb = new FF7.MeshBuilder(); mb.prism(0, 0, 0, 1, 1, 0.001, 12, '#000000', false, true, false); return mb.build(); })();
  B.BattleScene = BattleScene;

  // Start a battle from anywhere; returns a waitable { done, result }
  B.start = function (opts = {}) {
    const w = { done: false, result: null };
    const S = FF7.sceneMgr;
    if (FF7.audio.stopAllSfx) FF7.audio.stopAllSfx();   // the field's sounds (an alarm...) stop as the battle starts
    FF7.audio.sfx('encounter');
    S.swirl(opts.quick ? 20 : 48);
    const bs = new BattleScene(opts, w);
    S.push(bs);
    return w;
  };
})();
