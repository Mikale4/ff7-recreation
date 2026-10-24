// Battle command menus: command window, ability lists, targeting (FF7 layout).
(function () {
  const U = FF7.util, R = FF7.render, I = FF7.input, B = FF7.battle, D = FF7.data;
  // Mega All (Walkthrough): every-target uses per battle, one per level, for Attack, Steal, Mug, Sense, Morph, D.blow
  // and magic; MP Turbo stacks to +50%; Quadra Magic doesn't work with Exit's spells or Knights of Round
  const megaLeft = (a) => !!a && (a.megaAll || 0) > (a.megaUses || 0);
  const turboOf = (s) => Math.min(5, (s.supports || []).filter(x => x.id === 'mp_turbo').reduce((n, x) => n + (x.level || 1), 0));
  const NO_QUADRA = ['escape', 'remove', 'knights_of_round'];
  const quadN = (s) => (s.supports || []).filter(x => x.id === 'quadra_magic').length;   // (each extra Quadra Magic: one more cast)
  const CMD_NAMES = { attack: 'Attack', limit: 'Limit', magic: 'Magic', summon: 'Summon', item: 'Item', steal: 'Steal', mug: 'Mug', sense: 'Sense',
    throw: 'Throw', coin: 'Coin', morph: 'Morph', deathblow: 'D.blow', manipulate: 'Manip.', mime: 'Mime', enemy_skill: 'E.Skill', w_magic: 'W-Magic',
    w_summon: 'W-Summon', w_item: 'W-Item', slash_all: 'Slash-All', flash: 'Flash', double_cut: '2x-Cut', '4x_cut': '4x-Cut', auto: 'Auto' };

  class BattleMenu {
    constructor(battle) {
      this.b = battle;
      this.actor = null;
      this.state = 'none';
      this.cmdIdx = 0; this.listIdx = 0; this.listTop = 0;
      this.memory = {};       // per-actor cursor memory
      this.pending = null;    // partially built action (w-magic etc.)
    }
    get open() { return this.state !== 'none'; }
    get inSubmenu() { return ['magic', 'summon', 'item', 'eskill', 'limit', 'throw', 'manip', 'target'].includes(this.state); }

    // Open the command window for a ready party member
    start(actor) {
      this.actor = actor;
      // a manipulated enemy (FF7 Manipulate): its turn opens the list of its manipulatable attacks
      if (!actor.isParty) {
        this.pending = null; this.openList('manip', 1);
        if (this.state !== 'manip') { this.b.readyDone(actor, false); this.close(); return; }
        FF7.audio.sfx('cursor', 0.5);
        return;
      }
      this.state = 'command';
      const mem = FF7.state.config.cursor === 'memory' ? this.memory[actor.uid] : null;
      this.cmdIdx = mem ? mem.cmd : 0;
      this.pending = null;
      FF7.audio.sfx('cursor', 0.5);
    }
    close() { this.state = 'none'; this.actor = null; this.pending = null; }

    commands() {
      const a = this.actor;
      const cmds = a.abilities.commands.slice();
      if (a.limitGauge >= 255 && a.char && a.char.limitsKnown.length && !a.transformed) {
        const i = cmds.findIndex(c => ['attack', 'slash_all', 'flash', 'double_cut', '4x_cut'].includes(c));
        if (i >= 0) cmds[i] = 'limit';
      }
      return cmds;
    }
    // FF7 layout: column 0 has fixed slots Attack / Magic / Summon / Item (blank when missing);
    // any other commands (Steal, Sense, E.Skill, ...) fill a second column. cells[col][row] = id | null
    layout() {
      const cmds = this.commands();
      const slot = (list) => cmds.find(c => list.includes(c)) || null;
      const col0 = [slot(['limit', 'attack', 'slash_all', 'flash', 'double_cut', '4x_cut']), slot(['magic', 'w_magic']), slot(['summon', 'w_summon']), slot(['item', 'w_item'])];
      const rest = cmds.filter(c => !col0.includes(c));
      rest.push('auto');     // the Auto command (AI plays the party) always sits at the end
      const cells = [col0];
      for (let i = 0; i < rest.length; i += 4) cells.push(rest.slice(i, i + 4).concat([null, null, null, null]).slice(0, 4));
      return { cells, cols: cells.length };
    }

    update() {
      const a = this.actor;
      if (!a) return;
      if (!a.alive || !a.canAct() || (!a.isParty && !a.has('manipulate'))) { this.b.readyDone(a, false); this.close(); return; }
      switch (this.state) {
        case 'command': return this.updateCommand();
        case 'target': return this.updateTarget();
        default: return this.updateList();
      }
    }

    updateCommand() {
      const L = this.layout();
      // cursor packed as cmdIdx = col*4 + row; always sits on a non-blank cell
      let col = Math.floor(this.cmdIdx / 4), row = this.cmdIdx % 4;
      if (col >= L.cols) col = 0;
      const ok = (c, r) => !!(L.cells[c] && L.cells[c][r]);
      const settle = () => { if (!ok(col, row)) for (let r = 0; r < 4; r++) if (ok(col, r)) { row = r; break; } };
      settle();
      const moveV = (d) => { for (let k = 1; k <= 4; k++) { const r = (row + d * k + 8) % 4; if (ok(col, r)) { row = r; return true; } } return false; };
      if (I.repeat('up') && moveV(-1)) FF7.audio.sfx('cursor');
      if (I.repeat('down') && moveV(1)) FF7.audio.sfx('cursor');
      if (I.pressed('left')) {
        if (col === 0) { FF7.audio.sfx('confirm'); this.submit({ type: 'change' }); return; }      // FF7: left = change row
        col--; settle(); FF7.audio.sfx('cursor');
      }
      if (I.pressed('right')) {
        if (col === L.cols - 1) { FF7.audio.sfx('confirm'); this.submit({ type: 'defend' }); return; }  // right = defend
        col++; settle(); FF7.audio.sfx('cursor');
      }
      this.cmdIdx = col * 4 + row;
      if (I.pressed('menu')) { this.b.nextReady(this.actor); return; }
      if (!I.pressed('ok')) return;
      const cmd = L.cells[col][row];
      if (!cmd) return;
      this.memory[this.actor.uid] = { cmd: this.cmdIdx };
      FF7.audio.sfx('confirm');
      switch (cmd) {
        case 'attack': this.beginTarget({ type: 'attack' }, { side: 'enemy', canAll: megaLeft(this.actor), mega: true }); break;
        case 'slash_all': this.submit({ type: 'slash_all', all: true, side: 'enemy' }); break;
        case 'flash': this.submit({ type: 'flash', all: true, side: 'enemy' }); break;
        case 'double_cut': case '4x_cut': this.beginTarget({ type: cmd }, { side: 'enemy' }); break;
        case 'steal': case 'mug': case 'sense': case 'morph': case 'deathblow': this.beginTarget({ type: cmd }, { side: 'enemy', canAll: megaLeft(this.actor), mega: true }); break;
        case 'manipulate': this.beginTarget({ type: cmd }, { side: 'enemy' }); break;
        case 'coin': this.beginTarget({ type: 'coin' }, { side: 'enemy' }); break;
        case 'mime': this.submit({ type: 'mime' }); break;
        case 'auto': {   // hand the whole party to the AI (Select / Cancel takes control back)
          FF7.state.config.autoBattle = true;
          let act = null; try { act = B.ai.autoBattle(this.b, this.actor); } catch (e) { console.error(e); }
          if (act) this.submit(act); else this.close();
          break;
        }
        case 'magic': case 'w_magic': this.openList('magic', cmd === 'w_magic' ? 2 : 1); break;
        case 'summon': case 'w_summon': this.openList('summon', cmd === 'w_summon' ? 2 : 1); break;
        case 'item': case 'w_item': this.openList('item', cmd === 'w_item' ? 2 : 1); break;
        case 'throw': this.openList('throw', 1); break;
        case 'enemy_skill': this.openList('eskill', 1); break;
        case 'limit': this.openList('limit', 1); break;
        default: this.beginTarget({ type: 'attack' }, { side: 'enemy' });
      }
    }

    // ---- lists
    openList(kind, count) {
      this.state = kind; this.listIdx = 0; this.listTop = 0; this.multi = count; this.multiDone = [];
      this.items = this.buildList(kind);
      if (!this.items.length) { FF7.audio.sfx('error'); this.state = 'command'; }
    }
    buildList(kind) {
      const a = this.actor;
      switch (kind) {
        case 'magic': return a.abilities.spells.map(s => {
          const d = D.spells[s.id]; if (!d) return null;
          const all = s.supports.find(x => x.id === 'all'), quad = s.supports.find(x => x.id === 'quadra_magic'), turbo = turboOf(s);
          const mp = turbo ? Math.min(255, Math.floor(d.mp * (10 + turbo) / 10) + 1) : d.mp;
          return { id: s.id, name: d.name, mp, def: d, all: all && d.canAll !== false ? all.level : 0, mega: d.canAll !== false, quadra: quad && !NO_QUADRA.includes(s.id) ? quad.level : 0, quadraN: quadN(s), turbo, ok: a.mp >= mp };
        }).filter(Boolean);
        case 'summon': return a.abilities.summons.map(s => {
          const d = D.summons[s.id]; if (!d) return null;
          const used = a.summonUses[s.id] || 0;
          const turbo = turboOf(s);
          const mp = turbo ? Math.min(255, Math.floor(d.mp * (10 + turbo) / 10) + 1) : d.mp;
          return { id: s.id, name: d.name, mp, def: d, usesLeft: s.uses - used, quadra: NO_QUADRA.includes(s.id) ? 0 : (s.supports.find(x => x.id === 'quadra_magic') || {}).level || 0, quadraN: quadN(s), turbo, ok: a.mp >= mp && used < s.uses };
        }).filter(Boolean);
        case 'eskill': return a.abilities.eskills.map(id => { const d = D.eskills[id]; return d ? { id, name: d.name, mp: d.mp || 0, def: d, ok: a.mp >= (d.mp || 0) } : null; }).filter(Boolean);
        case 'item': return FF7.state.items.filter(e => D.items[e.id] && D.items[e.id].battle).map(e => ({ id: e.id, name: D.items[e.id].name, qty: e.qty, def: D.items[e.id], ok: e.qty > 0 }));
        case 'throw': return FF7.state.items.filter(e => { const f = U.findItem(e.id); return f && (f.def.throwable || (f.kind === 'weapon' && f.def.throwable !== false && f.def.char === 'yuffie')); }).map(e => ({ id: e.id, name: U.itemName(e.id), qty: e.qty, ok: true }));
        case 'manip': return B.manipList(a).map(k => { const d = a.attacks[k]; return { id: k, name: d.name || k, mp: d.mp || 0, def: d, ok: !(d.mp && a.maxMp > 0 && a.mp < d.mp) }; });
        case 'limit': {
          const c = a.char;
          return c.limitsKnown.map(id => D.limits[id]).filter(l => l && l.level === c.limitLevel).map(l => ({ id: Object.keys(D.limits).find(k => D.limits[k] === l), name: l.name, def: l, ok: true }));
        }
      }
      return [];
    }
    updateList() {
      const n = this.items.length;
      const cols = this.state === 'item' || this.state === 'throw' || this.state === 'manip' ? 1 : 3;
      if (I.repeat('up')) { this.listIdx = (this.listIdx - cols + n) % n; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.listIdx = (this.listIdx + cols) % n; FF7.audio.sfx('cursor'); }
      if (cols > 1 && I.repeat('left')) { this.listIdx = (this.listIdx + n - 1) % n; FF7.audio.sfx('cursor'); }
      if (cols > 1 && I.repeat('right')) { this.listIdx = (this.listIdx + 1) % n; FF7.audio.sfx('cursor'); }
      { const row = Math.floor(this.listIdx / cols); if (row < this.listTop) this.listTop = row; if (row >= this.listTop + 3) this.listTop = row - 2; }
      if (I.back()) {
        if (this.state === 'manip') return;
        FF7.audio.sfx('cancel');
        (this.multiDone || []).forEach(x => { if (x.preTaken) this.unhold(x.item); });
        this.multiDone = []; this.state = 'command'; this.pending = null; return;
      }
      if (!I.pressed('ok')) return;
      const it = this.items[this.listIdx];
      if (!it.ok) { FF7.audio.sfx('error'); return; }
      FF7.audio.sfx('confirm');
      const kind = this.state;
      const def = it.def || {};
      if (kind === 'magic' || kind === 'eskill') {
        const t = def.target || 'enemy';
        this.beginTarget({ type: kind, id: it.id, mpTurbo: it.turbo, quadraAvail: it.quadra, quadraN: it.quadraN }, { side: /ally|self/.test(t) || t === 'allAllies' ? 'ally' : 'enemy', canAll: kind === 'magic' ? ((it.all > 0 && (a => (a.allUses[it.id] || 0) < it.all)(this.actor)) || (it.mega && megaLeft(this.actor))) : false, forceAll: /^all[A-Z]/.test(t), self: t === 'self', any: t === 'any', listItem: it, mega: kind === 'magic' });
      } else if (kind === 'summon') {
        this.pendingOrSubmit({ type: 'summon', id: it.id, all: true, side: 'enemy', mpTurbo: it.turbo, quadra: it.quadra && (this.actor.quadraUses[it.id] || 0) < it.quadra, quadraN: it.quadraN });
      } else if (kind === 'item') {
        const t = def.target || 'ally';
        if (!this.hold(it.id)) { FF7.audio.sfx('error'); return; }
        this.beginTarget({ type: 'item', item: it.id, preTaken: true }, { side: /enemy|Enemies/.test(t) ? 'enemy' : 'ally', forceAll: /^all[A-Z]/.test(t), deadOk: !!(def.effect && def.effect.revive), any: t === 'any' });
        if (this.state === 'item') { this.unhold(it.id); this.items = this.buildList('item'); }   // (nobody to use it on)
      } else if (kind === 'throw') {
        this.beginTarget({ type: 'throw', item: it.id }, { side: 'enemy' });
      } else if (kind === 'manip') {
        // targeted from the manipulator's side, like the party's own commands: the monster's opponents
        // are the other enemies and its allies the party (FF7), and the cursor may cross over (to be hit
        // by an Enemy Skill, say)
        // (an attack the enemy uses on itself is "1 Al" in FF7: under Manipulate it goes to one of the party)
        const t = def.target || 'enemy';
        this.beginTarget({ type: 'enemy', id: it.id, manip: true }, { side: /ally|allies|allAllies|self/i.test(t) ? 'ally' : 'enemy', forceAll: /^all[A-Z]/.test(t), canSwitch: true });
      } else if (kind === 'limit') {
        const t = def.target || 'enemy';
        const needsTarget = !/^all[A-Z]/.test(t) && t !== 'self' && !(def.special && FF7.battle.specials[def.special] && FF7.battle.specials[def.special].replace && t !== 'enemy');
        if (/^all[A-Z]/.test(t) || t === 'self') this.submit({ type: 'limit', id: it.id, all: /^all[A-Z]/.test(t), side: /ally|All/.test(t) && t !== 'allEnemies' ? 'ally' : 'enemy', targets: t === 'self' ? [this.actor] : null });
        else this.beginTarget({ type: 'limit', id: it.id }, { side: /ally/.test(t) ? 'ally' : 'enemy' });
      }
    }

    // ---- targeting
    beginTarget(action, opts) {
      this.pendingAction = action;
      this.topts = opts;
      this.prevState = this.state;
      const side = opts.side || 'enemy';
      this.tSide = side;
      this.tAll = !!opts.forceAll;
      const list = this.targetList(side);
      if (opts.self) { this.submit(Object.assign(action, { targets: [this.actor], side: 'ally' })); return; }
      if (!list.length) { FF7.audio.sfx('error'); return; }
      this.tIdx = side === 'ally' ? Math.max(0, list.indexOf(this.actor)) : 0;
      if (side === 'enemy') { const mem = this.memory[this.actor.uid]; if (mem && mem.target && list.includes(mem.target)) this.tIdx = list.indexOf(mem.target); }
      this.state = 'target';
    }
    targetList(side) {
      const b = this.b;
      const dead = this.topts && this.topts.deadOk;
      const ok = (x) => !x.hidden && (dead || x.targetable);
      // enemies go left to right as they appear on screen (side-on camera shots turn world x into depth)
      const sx = (x) => { try { const G = FF7.GL, p = G && G.ok && G.project && b.cursorPos ? G.project(b.cursorPos(x)) : null; return p && isFinite(p.x) ? p.x : x.pos[0] * 100; } catch (e) { return x.pos[0] * 100; } };
      return (side === 'ally' ? b.party : b.enemies).filter(ok).sort((p, q) => side === 'enemy' ? (sx(p) - sx(q)) || (p.pos[2] - q.pos[2]) : 0);
    }
    updateTarget() {
      let list = this.targetList(this.tSide);
      if (!list.length) { this.state = this.prevState; return; }
      if (this.tIdx >= list.length) this.tIdx = 0;
      const o = this.topts;
      const canSwitch = o.canSwitch === true || (!o.forceAll && (o.any || o.canSwitch !== false));
      if (!this.tAll) {
        if (I.repeat('left')) { this.tIdx = (this.tIdx + list.length - 1) % list.length; FF7.audio.sfx('cursor'); }
        if (I.repeat('right')) { this.tIdx = (this.tIdx + 1) % list.length; FF7.audio.sfx('cursor'); }
      }
      if ((I.pressed('up') || I.pressed('down')) && canSwitch) {
        const other = this.tSide === 'enemy' ? 'ally' : 'enemy';
        if (this.targetList(other).length) { this.tSide = other; this.tIdx = 0; FF7.audio.sfx('cursor'); }
      }
      if ((I.pressed('r1') || I.pressed('square')) && o.canAll && !o.forceAll) { this.tAll = !this.tAll; FF7.audio.sfx('cursor'); }
      if (I.back()) {
        FF7.audio.sfx('cancel');
        const pa = this.pendingAction;
        if (pa && pa.preTaken) {
          this.unhold(pa.item);
          // FF7's W-Item slip: cancelling the second pick also returns the first to the bag, though it stays
          // picked (and is used) - each "pick another item, cancel" is one more of the first item
          if (this.multi > 1) this.multiDone.forEach(x => { if (x.preTaken) this.unhold(x.item); });
          this.items = this.buildList('item');
        }
        this.state = this.prevState === 'target' ? (this.actor && !this.actor.isParty ? 'manip' : 'command') : (this.prevState || 'command'); return;
      }
      if (I.pressed('ok')) {
        FF7.audio.sfx('confirm');
        list = this.targetList(this.tSide);
        const act = Object.assign({}, this.pendingAction, { side: this.tSide });
        if (this.tAll) {
          act.all = true; act.targets = list;
          // (an All materia's use first, then Mega All's; an ability that is all-target by itself uses neither)
          if (!o.forceAll) {
            const it = o.listItem;
            if (act.type === 'magic' && it && it.all > 0 && (this.actor.allUses[it.id] || 0) < it.all) act.useAll = true;
            else if (o.mega) act.useMega = true;
          }
        }
        else { act.targets = [list[this.tIdx]]; if (this.tSide === 'enemy') this.memory[this.actor.uid] = Object.assign(this.memory[this.actor.uid] || {}, { target: list[this.tIdx] }); }
        if (act.type === 'magic' && act.quadraAvail && !act.all && (this.actor.quadraUses[act.id] || 0) < act.quadraAvail) act.quadra = true;
        this.pendingOrSubmit(act);
      }
    }
    // FF7 takes an item out of the bag the moment it's picked (the list counts one fewer; an item down to 0 keeps its
    // line until the battle ends) and puts it back when the pick is cancelled; a picked item is used without taking
    // another (A.doItem), and one never used goes back when the battle ends (Battle.finish)
    hold(id) { const e = FF7.state.items.find(x => x.id === id); if (!e || e.qty <= 0) return false; e.qty--; return true; }
    unhold(id) { const e = FF7.state.items.find(x => x.id === id); if (e) e.qty = Math.min(99, e.qty + 1); else FF7.state.items.push({ id, qty: 1 }); }
    pendingOrSubmit(act) {
      if (this.multi > 1) {
        this.multiDone.push(act);
        if (this.multiDone.length < this.multi) { this.state = act.type === 'item' ? 'item' : act.type === 'summon' ? 'summon' : 'magic'; this.items = this.buildList(this.state); return; }
        this.submit({ type: 'multi', list: this.multiDone });
        return;
      }
      this.submit(act);
    }
    submit(act) {
      const a = this.actor;
      act.actor = a;
      if (act.manip) {   // the side as the enemy sees it (A.resolveTargets): the party are its opponents
        act.side = act.targets && act.targets[0] && act.targets[0].isParty ? 'enemy' : 'ally';
        const at = a.attacks && a.attacks[act.id];
        if (at && at.oncePerGame) FF7.state.flags['once_' + a.id + '_' + act.id] = true;
      }
      if (act.type === 'multi') act.list.forEach(x => x.actor = a);
      // per-battle use counters
      const count = (x) => {
        if (x.type === 'summon') a.summonUses[x.id] = (a.summonUses[x.id] || 0) + 1;
        if (x.useAll) a.allUses[x.id] = (a.allUses[x.id] || 0) + 1;
        if (x.useMega) a.megaUses = (a.megaUses || 0) + 1;
        if (x.quadra) a.quadraUses[x.id] = (a.quadraUses[x.id] || 0) + 1;
        if (x.type === 'limit') a.limitGauge = 0;
      };
      if (act.type === 'multi') act.list.forEach(count); else count(act);
      this.b.readyDone(a, true, act);
      this.close();
    }

    // ---------------------------------------------------------------- render
    render() {
      if (!this.actor) return;
      const a = this.actor;
      const listOpen = ['magic', 'summon', 'eskill', 'item', 'throw', 'limit', 'manip'].includes(this.state);
      // yellow bobbing marker over the acting party member (FF7)
      if (a.model && this.state !== 'target') {
        const cp = this.b.cursorPos(a);
        const p = FF7.GL.project([cp[0] + 0.4, cp[1] + 1.0, cp[2]]);
        if (p.visible) {
          const c = R.ctx, bob = Math.sin(FF7.frame * 0.18) * 3, x = p.x, y = p.y + bob;
          c.save(); c.fillStyle = '#f0c800'; c.strokeStyle = '#6a5000'; c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(x - 11, y - 8); c.lineTo(x + 11, y - 8); c.lineTo(x, y + 8); c.closePath(); c.fill(); c.stroke(); c.restore();
        }
      }
      if (!listOpen && a.isParty) {
        // FF7's command window: a narrow column ending at the names window's right edge (over the Barrier bars),
        // so every HP/MP stays visible; real extra columns (Steal, Sense...) extend it to the right as in FF7.
        // The Auto column stays tucked away behind a ▸ until the cursor moves right onto it.
        const L = this.layout(), colW = 86;
        const autoOnly = L.cols > 1 && L.cells[L.cols - 1][0] === 'auto' && !L.cells[L.cols - 1][1];
        const curCol = Math.floor(this.cmdIdx / 4), tucked = autoOnly && curCol < L.cols - 1;
        const vis = tucked ? L.cols - 1 : L.cols;
        const w = 30 + colW * vis + 8, h = 4 * 26 + 18;
        const x = 204 - (30 + colW + 8), y = FF7.H - h - 6;
        R.window(x, y, w, h);
        if (tucked) R.text('▸', x + w - 13, y + h / 2 - 9, { size: 14, color: '#c8d0e8' });
        L.cells.forEach((colCells, ci) => colCells.forEach((c, ri) => {
          if (!c || ci >= vis) return;
          const cx = x + 26 + ci * colW, cy = y + 10 + ri * 26;
          const disabled = (c === 'magic' || c === 'summon' || c === 'w_magic' || c === 'w_summon' || c === 'enemy_skill') && a.has('silence');
          R.text(CMD_NAMES[c] || c, cx, cy, { color: disabled ? R.COL.gray : (c === 'limit' ? '#ffe070' : R.COL.white) });
          if (this.state === 'command' && ci * 4 + ri === this.cmdIdx) R.cursor(cx - 4, cy + 10);
        }));
      }
      if (listOpen) this.renderList();
      if (this.state === 'target') this.renderTarget();
    }
    renderList() {
      const cols = this.state === 'item' || this.state === 'throw' || this.state === 'manip' ? 1 : 3;
      const rows = 3, perPage = cols * rows;
      const infoW = 150, h = 122, y = FF7.H - h;
      const x = 0, w = FF7.W - infoW;
      R.window(x, y, w, h);
      const top = this.listTop || 0, start = top * cols;
      const colW = cols === 1 ? w - 40 : (w - 60) / 3;
      this.items.slice(start, start + perPage).forEach((it, k) => {
        const i = start + k;
        const cx = x + 36 + (k % cols) * colW, cy = y + 16 + Math.floor(k / cols) * 32;
        R.text(it.name, cx, cy, { color: it.ok ? R.COL.white : R.COL.gray, size: 17 });
        if (cols === 1 && it.qty != null) R.text(':' + U.pad(it.qty, 3), x + w - 90, cy, { size: 17 });
        if (it.all) {   // red arrow: this spell can be cast on All
          const nw = R.measure(it.name, 17), c = R.ctx;
          c.save(); c.fillStyle = '#e02020'; c.beginPath(); c.moveTo(cx + nw + 10, cy + 3); c.lineTo(cx + nw + 10, cy + 15); c.lineTo(cx + nw + 18, cy + 9); c.closePath(); c.fill(); c.restore();
        }
        if (i === this.listIdx) R.cursor(cx - 4, cy + 10);
      });
      // scrollbar
      const totalRows = Math.max(1, Math.ceil(this.items.length / cols));
      const sbx = x + w - 24, sby = y + 12, sbh = h - 24, c = R.ctx;
      c.fillStyle = '#1c1c50'; c.fillRect(sbx, sby, 12, sbh);
      const th = Math.max(14, sbh * Math.min(1, rows / totalRows)), ty = sby + (sbh - th) * (totalRows > rows ? top / (totalRows - rows) : 0);
      c.fillStyle = '#c8c8d8'; c.fillRect(sbx + 1, ty, 10, th);
      // info window (MP needed / All uses) beside the list, bottom right
      const it = this.items[this.listIdx];
      R.window(FF7.W - infoW, y, infoW, h);
      if (it && this.state !== 'item' && this.state !== 'throw' && this.state !== 'limit') {
        R.text('MP needed', FF7.W - infoW + 14, y + 12, { size: 15 });
        R.text(`${it.mp}/${this.actor.mp}`, FF7.W - 14, y + 38, { align: 'right', size: 18 });
        if (it.all) R.text('All: ' + Math.max(0, it.all - (this.actor.allUses[it.id] || 0)) + '\u00d7', FF7.W - infoW + 14, y + 80, { size: 16 });
        else if (it.usesLeft != null) R.text('Uses: ' + it.usesLeft, FF7.W - infoW + 14, y + 80, { size: 16 });
      }
      if (it && it.def && it.def.desc) { R.window(0, 0, FF7.W, 38); R.text(it.def.desc, 16, 10, { size: 16 }); }
    }
    renderTarget() {
      const list = this.targetList(this.tSide);
      const t = FF7.frame;
      const ts = this.tAll ? list : [list[this.tIdx]];
      ts.forEach(c => {
        if (!c) return;
        const p = FF7.GL.project(this.b.cursorPos(c));
        if (!p.visible) return;
        R.cursor(p.x - 10, p.y, { alpha: this.tAll ? (t % 20 < 12 ? 1 : 0.5) : 1 });
      });
      const c0 = list[this.tIdx];
      if (c0) {
        R.window(0, 0, FF7.W, 38);
        R.text(this.tAll ? (this.tSide === 'enemy' ? 'All enemies' : 'All party') : (c0.isParty ? c0.name : c0.name), 16, 10, { size: 16 });
      }
    }
  }
  B.BattleMenu = BattleMenu;
  B.CMD_NAMES = CMD_NAMES;
})();
