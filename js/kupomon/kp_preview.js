// Team preview (Pokémon Showdown's; the user, 2026-10-03: "team preview before the battle starts and choosing the first
// pokemon to send out ... it also goes into the metagame", "only applied in tournaments"). A tournament battle
// (KP.battle's o.preview: the Coliseum's brackets, kp_league.js) opens on the arena with both teams lined up in 3D, every
// moogle facing the stands: theirs at the back, yours at the front. You see their kinds and levels (not their moves,
// items or abilities, as on Showdown), and choose the one you send out first; the other trainer chooses theirs at the
// same moment (KP.previewLead: a designed lead when its team has one, the archetype opponents' setters and hazard leads;
// else the one that fares best against your whole team, the leads' jobs counted: hazards, screens, a field). In a bout
// you only watch, both leads are the AI's. The Demo chooses its lead the same way, steering the cursor
// (js/kupomon/kp_runner.js driveBattle 'preview').
(function () {
  const KP = FF7.kupomon, R = FF7.render, MG = FF7.minigames;
  const W = () => FF7.W, H = () => FF7.H;
  const sfx = (id) => FF7.audio && FF7.audio.sfx && FF7.audio.sfx(id);
  const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);

  // ------------------------------------------------------------------ the lead a trainer picks from the preview
  // (what the preview shows: their kinds; their moves guessed as the competitive four of each kind, KP.compMoves)
  const guess = new Map();
  const seenAs = (m) => {
    const k = m.sp + ':' + m.lv;
    if (!guess.has(k)) guess.set(k, KP.compMoves ? KP.compMoves(m.sp, m.lv) : m.moves.slice());
    return Object.assign({}, m, { moves: guess.get(k), held: null });
  };
  // the jobs a lead does: hazards, screens, a weather, terrain or zone, a Taunt, a sacrifice
  KP.leadJobs = function (m) {
    let v = 0;
    for (const id of m.moves || []) {
      const mv = KP.MOVES[id]; if (!mv) continue;
      if (mv.hazard) v += 1.2;
      if (mv.side === 'wall' || mv.side === 'shell' || mv.side === 'veil' || mv.side === 'tailwind') v += 1;
      if (mv.weather || mv.terrain || mv.room) v += 1;
      if (mv.vol && mv.vol.taunt) v += 0.3;
      if (mv.selfFaint || (mv.vol && mv.vol.destiny)) v += 0.4;
    }
    const ab = (KP.abilityOf && KP.abilityOf(m)) || {};
    if (ab.setWeather || ab.setTerrain || ab.setRoom) v += 1.5;
    return v;
  };
  KP.previewLead = function (team, vs, o = {}) {
    const L = team.filter(m => m.hp > 0); if (L.length < 2) return L[0] || null;
    if (o.fixed != null && L[o.fixed]) return L[o.fixed];
    const T = KP.tactics, them = (vs || []).filter(m => m.hp > 0).map(seenAs);
    if (!T || !T.matchup || !them.length) return L[0];
    const spd = (m) => KP.stat(m, 'spd');
    const score = (m) => {
      let s = 0;
      for (const f of them) { let r = 1; try { r = T.matchup(m, f); } catch (e) { r = 1; } s += Math.log(Math.max(0.05, r)) + (spd(m) > spd(f) ? 0.2 : 0); }
      return s / them.length + 0.5 * KP.leadJobs(m);
    };
    return L.map(m => [m, score(m)]).sort((a, b) => b[1] - a[1])[0][0];
  };

  // ------------------------------------------------------------------ the preview, as the battle's first phase
  const B = KP.Battle && KP.Battle.prototype; if (!B) return;
  B.teamPreview = function* () {
    const o = this.o, mine = this.d.party.filter(m => m.hp > 0), theirs = this.foes.filter(m => m.hp > 0);
    if (!mine.length || !theirs.length) return;
    theirs.forEach(m => KP.dexSee && KP.dexSee(m.sp));
    const P = this.previewing = { t0: this.t, mine, theirs, models: new Map(), picked: null };
    for (const m of mine.concat(theirs)) { try { const md = KP.moogleModel(m.sp); if (md.anims && md.anims.idle) md.play(md.anims.idle); P.models.set(m, md); } catch (e) { /* (no model: its label only) */ } }
    for (let i = 0; i <= 30; i++) { P.fade = i / 30; yield; }
    // their lead: the trainer's (a designed lead, else the AI's pick against your team), chosen as you choose yours
    const foeLead = KP.previewLead(theirs, mine, { fixed: o.foeLead });
    let myLead;
    if (o.spectate) {   // (a bout you only watch: both leads the AI's)
      myLead = KP.previewLead(mine, theirs, { fixed: o.meLead });
      yield* this.say(`Team preview! ${o.spectate.name} and ${o.trainer.name} look over each other's teams...`, 80);
    } else {
      this.text = `Team preview! ${o.trainer ? o.trainer.name + "'s" : 'Their'} team is on the far side. Choose the moogle you'll send out first.`; this.textHold = true;
      myLead = this.autoOn && this.autoOn() ? 'auto' : yield this.ask({ kind: 'preview', idx: 0, list: mine });
      this.textHold = false; this.text = null;
      if (myLead === 'auto') myLead = KP.previewLead(mine, theirs);   // (Auto: the AI's lead, as a tournament trainer picks)
      myLead = myLead || mine[0];
    }
    P.picked = { me: myLead, foe: foeLead, t: this.t };
    sfx('confirm');
    for (let i = 0; i < 40; i++) yield;   // (both leads step forward)
    for (let i = 30; i >= 0; i--) { P.fade = i / 30; yield; }
    this.previewing = null;
    this.leadMe = myLead; this.leadFoe = foeLead;
  };
  // the cursor: left / right (or up / down) over your team; OK chooses
  B.updatePreview = function (I, u) {
    const n = u.list.length;
    if (I.repeat('left') || I.repeat('up')) { u.idx = (u.idx + n - 1) % n; sfx('cursor'); }
    if (I.repeat('right') || I.repeat('down')) { u.idx = (u.idx + 1) % n; sfx('cursor'); }
    if (I.pressed('ok')) this.answer(u.list[u.idx]);
  };
  const up0 = B.updateUi;
  B.updateUi = function (I) { if (this.ui && this.ui.kind === 'preview') return this.updatePreview(I, this.ui); return up0.call(this, I); };
  const render0 = B.render;
  B.render = function () { if (this.previewing) return this.renderPreview(); return render0.call(this); };

  // the two rows in 3D: theirs at the back, yours at the front, all facing the stands; the chosen leads step forward
  // (the camera pulled back and up from the battle's, so both rows of five fit side by side)
  const ROW = { foe: { z: -2.5, dx: 1.42, s: 0.9 }, me: { z: 0.8, dx: 1.1, s: 0.84 } };   // (six a row)
  const slot = (side, i, n) => { const r = ROW[side]; return [(i - (n - 1) / 2) * r.dx, 0, r.z]; };
  B.renderPreview = function () {
    const P = this.previewing, bg = (KP.BATTLE_BG && KP.BATTLE_BG[this.o.bg]) || null;
    MG.sky(bg ? bg.sky[0] : '#1a2a5a', bg ? bg.sky[1] : '#6a8ad0');
    this.cam.set([0, 4.5, 7.8], [0, 0.2, -0.55], 40, 0.1, 60);
    FF7.GL.begin({ clear: [0, 0, 0, 0], light: { dir: [-0.35, -0.85, -0.4], color: [0.95, 0.92, 0.86], ambient: [0.5, 0.5, 0.55] } });
    this.cam.apply();
    if (this.drawArenaFloor) this.drawArenaFloor();
    const u = this.ui && this.ui.kind === 'preview' ? this.ui : null, hl = u ? u.list[u.idx] : null;
    const pos = new Map();
    for (const side of ['foe', 'me']) {
      const L = side === 'me' ? P.mine : P.theirs;
      L.forEach((m, i) => {
        const p = slot(side, i, L.length), lead = P.picked && P.picked[side] === m, sel = m === hl;
        const fwd = lead ? ease(Math.min(1, (this.t - P.picked.t) / 18)) * (side === 'me' ? 0.25 : 0.45) : 0;
        const bob = sel ? Math.abs(Math.sin(this.t * 0.12)) * 0.07 : 0;
        const at = [p[0], bob, p[2] + fwd];
        pos.set(m, at);
        const md = P.models.get(m); if (!md) return;
        md.update(1); md.scale = ROW[side].s * (sel || lead ? 1.12 : 1);
        MG.shadow(at[0], 0, at[2], 0.36 * md.scale, 0.3 * (P.fade || 0));
        const dim = P.picked && !lead ? { tint: [0.7, 0.7, 0.75, 1] } : sel ? { add: [0.12, 0.12, 0.08] } : null;
        MG.drawModel(md, at, 0, 0, 0, dim);
      });
    }
    FF7.GL.end();
    this.drawPreviewUi(P, pos, u, hl);
  };
  const typeChip = (t, x, y) => { if (KP.typeBadge) KP.typeBadge(t, x, y, 54, 13); };
  B.drawPreviewUi = function (P, pos, u, hl) {
    const c = R.ctx, w = W(), h = H(), a = P.fade == null ? 1 : P.fade;
    c.save(); c.globalAlpha = a;
    // the title, and the opponent's name (and its playstyle, when the trainer has one: the World Championship's archetypes)
    const tw = w - 24, tx = 12, st = this.o.trainer && this.o.trainer.style;
    R.window(tx, 6, tw, st ? 50 : 32);
    R.text('TEAM PREVIEW', tx + 14, 12, { size: 16, weight: '800', color: '#ffd27a' });
    R.textFit(`vs. ${this.o.trainer ? this.o.trainer.name : '?'}`, tx + 160, 13, tw - 174, { size: 14, minSize: 10, color: '#ffffff' });
    if (st) R.textFit(st, tx + 14, 32, tw - 28, { size: 12, minSize: 9, color: '#c8d0e0' });
    // under each moogle: its name and level, its types
    for (const side of ['foe', 'me']) {
      const L = side === 'me' ? P.mine : P.theirs;
      for (const m of L) {
        const at = pos.get(m); if (!at) continue;
        // (theirs labelled over their heads, yours under your feet: the two rows' labels apart)
        const q0 = this.cam.project(side === 'foe' ? [at[0], 1.32 * ROW.foe.s, at[2]] : [at[0], -0.05, at[2] + 0.2]); if (!q0.visible) continue;
        const q = side === 'foe' ? { x: q0.x, y: q0.y - 50 } : q0;
        const nm = side === 'me' ? KP.name(m) : (KP.SPECIES[m.sp] || {}).moogle || KP.name(m), sp = KP.sp(m);
        const sel = m === hl, lead = P.picked && P.picked[side] === m;
        R.textFit(`${nm}  ${m.lv}`, q.x, q.y + 2, 98, { size: sel || lead ? 13 : 12, minSize: 9, align: 'center', color: lead ? '#ffd27a' : sel ? '#ffffff' : '#d8dce8' });
        typeChip(sp.type, q.x - 27, q.y + 19); if (sp.type2) typeChip(sp.type2, q.x - 27, q.y + 34);   // (the two types stacked: the rows are close)
        if (lead) R.text(side === 'me' ? 'LEAD' : 'THEIR LEAD', q.x, side === 'me' ? q.y + 50 : q.y - 14, { size: 11, weight: '800', align: 'center', color: '#ffd27a' });
        if (sel) {   // (the cursor: a pointer over its head)
          const t = this.cam.project([at[0], 1.3 * ROW[side].s, at[2]]);
          if (t.visible) { const y0 = t.y - 6 - Math.abs(Math.sin(this.t * 0.12)) * 5; c.fillStyle = '#ffd27a'; c.beginPath(); c.moveTo(t.x - 8, y0 - 10); c.lineTo(t.x + 8, y0 - 10); c.lineTo(t.x, y0); c.closePath(); c.fill(); c.strokeStyle = '#3a2a10'; c.lineWidth = 1.5; c.stroke(); }
        }
      }
    }
    // the message window; beside it, the moogle under the cursor: what you know of your own (its moves, ability, item)
    R.window(0, h - 112, w, 112);
    const side = hl ? 300 : 0;
    if (this.text) R.para(this.text, 22, h - 96, w - 44 - side, { size: 16, minSize: 12, lines: 3 });
    const I = FF7.input; if (u) R.text(`Left / right: choose   ${I && I.label ? I.label('ok') : 'OK'}: send it out first`, 22, h - 26, { size: 12, color: '#a8b0c0' });
    if (hl) {
      const x = w - side, y = h - 112, ab = KP.abilityOf ? KP.abilityOf(hl) : null;
      R.window(x, y, side, 112);
      R.textFit(`${KP.name(hl)}  Lv ${hl.lv}${hl.plus ? ' +' + hl.plus : ''}`, x + 14, y + 10, side - 28, { size: 14, minSize: 10 });
      R.textFit(`${ab ? ab.name : 'No ability'}${hl.held && KP.ITEMS[hl.held] ? '   ◆ ' + KP.ITEMS[hl.held].name : ''}`, x + 14, y + 30, side - 28, { size: 11, minSize: 9, color: '#a0d8ff' });
      hl.moves.forEach((id, i) => { const mv = KP.MOVES[id]; if (!mv) return; const mx = x + 14 + (i % 2) * 140, my = y + 52 + Math.floor(i / 2) * 24; if (KP.typeGem) KP.typeGem(mv.type, mx + 5, my + 7, 5); R.textFit(mv.name, mx + 16, my, 120, { size: 12, minSize: 9 }); });
    }
    c.restore();
  };
})();
