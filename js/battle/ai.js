// Enemy AI (data-driven, see docs/DATA_SCHEMA.md) + automatic actions for uncontrollable party
// members (Berserk, Confusion, Vincent's transformations).
(function () {
  const U = FF7.util, B = FF7.battle;
  const AI = B.ai = {};

  // The `b` helper object handed to custom AI functions
  AI.api = function (battle) {
    return {
      party: () => battle.party.filter(p => p.targetable && !p.has('imprisoned')),
      enemies: () => battle.enemies.filter(e => e.targetable),
      allParty: () => battle.party,
      rnd: (n) => U.rand(n),
      pick: (arr) => arr && arr.length ? U.pick(arr) : null,
      lowestHp: (list) => (list || []).slice().sort((x, y) => x.hp - y.hp)[0] || null,
      has: (t, s) => !!(t && t.has && t.has(s)),
      turnCount: battle.turnCount,
      battle,
      find: (id) => battle.enemies.find(e => e.id === id && e.targetable) || null,
    };
  };

  // Turn a move + target spec into an action
  AI.makeAction = function (battle, e, move, target) {
    const atk = e.attacks[move] || (move === 'attack' ? e.attacks.attack : null);
    if (!atk) return null;
    const act = { actor: e, type: 'enemy', id: move };
    const t = target != null ? target : (atk.target || 'enemy');
    const party = battle.party.filter(p => p.targetable);
    const foes = e.has('manipulate') ? battle.enemies.filter(x => x.targetable && x !== e) : party;
    const allies = battle.enemies.filter(x => x.targetable);
    if (t && typeof t === 'object' && !Array.isArray(t)) { act.targets = [t]; act.side = t.isParty === e.isParty ? 'ally' : 'enemy'; }
    else if (Array.isArray(t)) { act.targets = t; act.side = t[0] && t[0].isParty === e.isParty ? 'ally' : 'enemy'; }
    else switch (t) {
      case 'all': case 'allEnemies': act.all = true; act.side = 'enemy'; act.targets = foes; break;
      case 'self': act.targets = [e]; act.side = 'ally'; break;
      case 'ally': act.targets = [U.pick(allies)]; act.side = 'ally'; break;
      case 'allies': case 'allAllies': act.all = true; act.side = 'ally'; act.targets = allies; break;
      case 'lowest': act.targets = [foes.slice().sort((a, b) => a.hp - b.hp)[0]]; act.side = 'enemy'; break;
      case 'marked': act.targets = [e.vars.marked && e.vars.marked.targetable ? e.vars.marked : U.pick(foes)]; act.side = 'enemy'; break;
      default: act.targets = [U.pick(foes)]; act.side = 'enemy';
    }
    act.targets = (act.targets || []).filter(Boolean);
    return act;
  };

  AI.choose = function (battle, e) {
    const def = e.def0 || {};
    const ai = def.ai || {};
    const api = AI.api(battle);
    let choice = null;
    if (ai.custom) {
      try { choice = ai.custom(e, api); } catch (err) { console.error('AI error', e.id, err); }
    }
    if (!choice) {
      let moves = ai.moves;
      let cycle = ai.cycle;
      if (ai.phases) for (const ph of ai.phases) { if (e.hpPct <= (ph.hpBelow != null ? ph.hpBelow : 100)) { if (ph.moves) moves = ph.moves; if (ph.cycle) cycle = ph.cycle; } }
      let move;
      if (ai.first && e.actions === 0) move = ai.first;
      else if (cycle && cycle.length) { const i = (e.vars._cyc || 0) % cycle.length; e.vars._cyc = i + 1; move = cycle[i]; }
      else if (moves && moves.length) move = U.weighted(moves);
      else move = 'attack';
      // skip moves that can't be paid for
      const atk = e.attacks[move];
      if (atk && atk.mp && e.maxMp > 0 && e.mp < atk.mp) move = 'attack';
      choice = { move };
    }
    if (!choice.move) choice.move = 'attack';
    if (!e.attacks[choice.move] && choice.move !== 'attack') choice.move = 'attack';
    // manipOnly moves are never chosen by the AI; oncePerGame moves only once per save
    const bad = (m) => { const at = e.attacks[m]; return at && (at.manipOnly || (at.oncePerGame && FF7.state.flags['once_' + e.id + '_' + m])); };
    if (bad(choice.move)) {
      const pool = (ai.moves || []).map(x => Array.isArray(x) ? x[0] : x).filter(m => !bad(m) && e.attacks[m]);
      choice.move = pool.length ? U.pick(pool) : 'attack';
    }
    // Silence (Battle Mechanics FAQ 4.1: "cannot use Magic/Enemy Skills/Summons"): a silenced enemy's spells
    // (AI.isSpellMove: Fire2, Cure3, Demi3...) give way to its Attack
    if (e.has('silence') && AI.isSpellMove(e.attacks[choice.move])) choice.move = 'attack';
    { const at = e.attacks[choice.move]; if (at && at.oncePerGame) FF7.state.flags['once_' + e.id + '_' + choice.move] = true; }
    return AI.makeAction(battle, e, choice.move, choice.target);
  };

  // Manipulate (FF7): the attacks a manipulated enemy offers in its command menu (bmenu 'manip'): the
  // enemy's own `manip` list, else FF7's Manip. table (js/data/enemy_manip.js), else every attack that
  // isn't a hidden animation. manipOnly attacks are offered; oncePerGame ones drop out once used.
  B.manipList = function (e) {
    const d = e.def0 || {}, at = e.attacks || {}, tab = FF7.data.enemyManip || {};
    const ids = Array.isArray(d.manip) ? d.manip : Array.isArray(tab[e.id]) ? tab[e.id]
      : Object.keys(at).filter(k => { const a = at[k]; return a && !a.noManip && !(a.kind === 'special' && (!a.special || a.special === 'nothing')) && !(k === 'attack' && d.attacks && !d.attacks.attack); });
    return ids.filter(k => at[k] && !(at[k].oncePerGame && FF7.state.flags['once_' + e.id + '_' + k]));
  };
  // Auto for a manipulated enemy (Auto battle): its strongest affordable manipulatable attack on the
  // other enemies; nothing (the turn passes) when it has none or is the last one standing
  AI.manipAuto = function (battle, e) {
    const others = battle.enemies.filter(x => x.targetable && x !== e);
    if (!others.length) return null;
    const offensive = (a) => a && a.kind !== 'heal' && a.kind !== 'buff' && !/ally|allies|self/i.test(a.target || '') && (a.power || a.kind === 'phys' || a.kind === 'pct' || a.fixed);
    const list = B.manipList(e).map(k => [k, e.attacks[k]]).filter(([, a]) => offensive(a) && !(a.mp && e.maxMp > 0 && e.mp < a.mp));
    if (!list.length) return null;
    const [k, a] = list.sort((x, y) => (y[1].power || 16) - (x[1].power || 16))[0];
    const all = /^all[A-Z]/.test(a.target || '');
    return { actor: e, type: 'enemy', id: k, manip: true, all, side: 'ally', targets: all ? others : [U.pick(others)] };
  };

  // Counter-attack reaction; kind: 'phys' | 'mag' | 'item' | 'death'
  AI.counter = function (battle, e, src, kind, act) {
    const ai = (e.def0 && e.def0.ai) || {};
    const c = ai.counter;
    if (!c || !e.alive) return null;
    let move = null;
    if (c.custom) { try { const r = c.custom(e, AI.api(battle), src, kind, act); if (r) move = typeof r === 'string' ? { move: r, target: src } : r; } catch (err) { console.error(err); } }
    else {
      const m = kind === 'phys' ? c.phys : kind === 'mag' ? (c.mag || c.magic) : null;
      if (m && U.chance(c.chance != null ? c.chance : 100)) move = { move: m, target: c.target || src };
      if (!move && c.byElement && act && act.ab && act.ab.elements) for (const el of act.ab.elements) if (c.byElement[el]) { move = { move: c.byElement[el], target: src }; break; }
    }
    if (!move) return null;
    if (e.has('silence') && AI.isSpellMove(e.attacks[move.move])) return null;   // (a silenced enemy's spell counter)
    const a2 = AI.makeAction(battle, e, move.move, move.target);
    if (a2) a2.counter = true;
    return a2;
  };
  AI.onDeath = function (battle, e) {
    const ai = (e.def0 && e.def0.ai) || {};
    if (!ai.onDeath) return null;
    try {
      // data form: onDeath: 'move' (+ onDeathChance %), or a function (e, api) -> { move, target }
      if (typeof ai.onDeath === 'string') {
        if (ai.onDeathChance != null && !U.chance(ai.onDeathChance)) return null;
        const atk = e.attacks[ai.onDeath];
        // (short of the MP it would fizzle - doAbility - and a once-per-game move would be spent for nothing)
        if (atk && atk.mp && e.maxMp > 0 && e.mp < atk.mp) return null;
        if (atk && atk.oncePerGame) { const k = 'once_' + e.id + '_' + ai.onDeath; if (FF7.state.flags[k]) return null; FF7.state.flags[k] = true; }
        // (onDeathTarget: 'killer' - aimed at the one whose blow finished it, when still standing: Ultimate WEAPON's
        // Shadow Flare, the Enemy-Skill FAQ: "it will only target the member who killed him")
        const killer = ai.onDeathTarget === 'killer' && e.killer && e.killer.targetable ? e.killer : null;
        const a0 = AI.makeAction(battle, e, ai.onDeath, killer);
        if (a0) { a0.forced = true; a0.counter = true; }
        return a0;
      }
      const r = ai.onDeath(e, AI.api(battle));
      if (!r) return null;
      const a = AI.makeAction(battle, e, r.move || r, r.target);
      if (a) { a.forced = true; a.counter = true; }
      return a;
    } catch (err) { console.error(err); return null; }
  };

  // Auto-battle ("Auto" command): an aware party AI. Each turn it reads the whole battle:
  //   1. revive KO'd allies (Life2 > Life > Phoenix Down)
  //   2. heal: Cure-All when several allies are hurt, the strongest affordable Cure on the most hurt
  //      ally, else X-/Hi-/Potion; keeps enough MP in reserve to heal
  //   3. cure dangerous statuses (Slow-numb/Petrify, Silence on a caster, Frog/Small, Confusion...)
  //   4. boss fights: open with Barrier / MBarrier / Haste / Regen on the party (once each)
  //   5. Limit Breaks: saved for bosses or tough fights, not wasted on a nearly-dead weakling
  //   6. offence: estimates damage with FF7's formulas for Attack, every damage spell (single / All)
  //      and summons (bosses only), per enemy: elemental weakness / resistance / immunity /
  //      absorption, physical immunity, invulnerability, Reflect, flying, rows. Prefers kills,
  //      charges MP a price outside boss fights.
  //   6b. battle items on the foes (AI.itemOffence): damage, gravity and status items when one clearly beats
  //      the best of the above, rare ones kept for bosses and dangerous fights
  // Which Limit Break now (FF7: only the set level's limits can be used): a healing one when the party is
  // hurt (two under half HP, one under 30%, someone down), else the attack that does the most to the foes
  // there, else a support one (Lunatic High, Planet Protector) for a boss or a status cure when needed.
  // null = keep the gauge. o: { foes (targets to use), any: true (always one: a plan counting uses) }
  // A foe whose fall ends the fight: the last one, or one that takes every other foe with it (onDeathRemove:
  // the Turks at the Midgar raid, where all three leave as soon as any one falls)
  AI.endsFight = function (t, foes) {
    if (foes.length === 1) return foes[0] === t;
    const r = t && t.def0 && t.def0.onDeathRemove;
    return r === true || (Array.isArray(r) && foes.every(f => f === t || r.includes(f.id)));
  };
  // the known limits (of `ids`) whose uses teach c a limit it doesn't know yet ('uses:<id>:N')
  AI.limitTeachers = function (c, ids) {
    const D = FF7.data.limits;
    return ids.filter(id => Object.keys(D).some(k => D[k].char === c.id && !c.limitsKnown.includes(k) && String(D[k].learn || '').startsWith('uses:' + id + ':')));
  };
  AI.pickLimit = function (battle, p, o = {}) {
    const D = FF7.data;
    if (!p.char || !p.char.limitsKnown || !p.char.limitsKnown.length || p.transformed) return null;
    const lv = p.char.limitLevel || 1;
    const ids = p.char.limitsKnown.filter(id => D.limits[id] && D.limits[id].level === lv);
    if (!ids.length) return null;
    const foes = o.foes || battle.enemies.filter(x => x.targetable && !(x.def0 && x.def0.chocobo));
    const allies = battle.party.filter(x => !x.hidden), alive = allies.filter(x => x.alive);
    const boss = foes.some(f => f.boss);
    const hurt = alive.filter(x => x.hp < x.maxHp * 0.5).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
    const needHeal = hurt.length >= 2 || alive.some(x => x.hp < x.maxHp * 0.3) || allies.some(x => !x.alive);
    const kindOf = (L) => L.kind === 'heal' ? 'heal' : L.kind === 'buff' ? 'buff' : (L.kind === 'phys' || L.kind === 'mag' || L.power || L.form || L.chain || L.moves || L.special === 'dice' || L.special === 'slots') ? 'damage' : 'other';
    // an elemental limit (Landscaper: earth, Beast Flare: fire...) on the foes it would hit: the average multiplier
    // (weak 2, resist 1/2, void 0, earth on a flyer 0), -1 when any of them absorbs it (it would heal them)
    const elMult = (L) => {
      const els = AI.elsOf(L).filter(e => e !== 'restorative');
      if (!els.length || !foes.length) return 1;
      const ts = /^all[A-Z]/.test(L.target || 'enemy') ? foes : [foes.slice().sort((a, b) => (b.boss - a.boss) || b.hp - a.hp)[0]];
      let m = 0;
      for (const t of ts) { if (t.flying && els.includes('earth')) continue; const ei = B.calc.elemInfo(t, els); if (ei.absorb) return -1; m += ei.immune ? 0 : (ei.mult || 1); }
      return m / ts.length;
    };
    const dmgOf = (L) => {
      const t = L.target || 'enemy', n = Math.max(1, foes.length), all = /^all[A-Z]/.test(t) && !L.random;
      let v = (L.power || 16) * (L.hits || 1);
      if (all) v *= L.split && n > 1 ? n * 2 / 3 : n;
      return v * elMult(L);
    };
    const act = (lid) => {
      const L = D.limits[lid], t = L.target || 'enemy';
      // (foes who all leave when any one falls, the Turks: the one closest to falling)
      const strongest = foes.length > 1 && foes.every(f => AI.endsFight(f, foes)) ? foes.slice().sort((a, b) => a.hp - b.hp)[0] : foes.slice().sort((a, b) => (b.boss - a.boss) || b.hp - a.hp)[0];
      if (/^all[A-Z]/.test(t)) return { actor: p, type: 'limit', id: lid, all: true, side: t === 'allEnemies' ? 'enemy' : 'ally', targets: t === 'allEnemies' ? foes : alive };
      if (t === 'self') return { actor: p, type: 'limit', id: lid, targets: [p], side: 'ally' };
      if (/ally/.test(t)) return { actor: p, type: 'limit', id: lid, targets: [allies.find(x => !x.alive) || hurt[0] || p], side: 'ally' };
      return strongest ? { actor: p, type: 'limit', id: lid, targets: [strongest], side: 'enemy' } : null;
    };
    const L = (id) => D.limits[id];
    const by = (k) => ids.filter(id => kindOf(L(id)) === k);
    const pick = (id, type) => { const a = id && act(id); return a ? { id, type, act: a } : null; };
    const heals = by('heal').sort((a, b) => (L(b).pct || 0) - (L(a).pct || 0));
    if (needHeal && heals.length) return pick(heals[0], 'heal');
    // learning (FF7: a level's second limit comes from using its first): a limit whose uses still teach an
    // unknown one is used whenever nothing more urgent is (Braver -> Cross-slash, Healing Wind -> Seal Evil)
    if (!o.noLearn) for (const id of AI.limitTeachers(p.char, ids)) { const k = kindOf(L(id)); if (k === 'damage' && (!foes.length || elMult(L(id)) < 0)) continue; const a = pick(id, k); if (a) return a; }
    const dmg = foes.length ? by('damage').filter(id => dmgOf(L(id)) > 0).sort((a, b) => dmgOf(L(b)) - dmgOf(L(a))) : [];
    if (dmg.length) return pick(dmg[0], 'damage');
    const buffs = by('buff');
    if (boss && buffs.length) return pick(buffs[buffs.length - 1], 'buff');
    const other = by('other');
    const cure = other.find(id => (L(id).remove || []).length && alive.some(x => (L(id).remove || []).some(s => x.has(s))));
    if (cure) return pick(cure, 'other');
    const fury = other.find(id => L(id).special === 'fury_brand');
    if (fury && boss && alive.filter(x => x !== p && x.limitGauge < 128).length >= 1) return pick(fury, 'other');
    if (!o.any) return null;
    const any = heals.concat(buffs, other)[0];
    return any ? pick(any, kindOf(L(any))) : null;
  };

  // ---- enemy spells (Silence stops them) -----------------------------------------------------------------
  // an enemy attack that is one of FF7's Magic or Summon spells (by name: Fire2, Bolt3, Cure3, Demi3, Quake2...);
  // its own moves (Matra Magic, Flamethrower...) are not
  let spellNames = null;
  const normName = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  AI.isSpellMove = function (a) {
    if (!a || !a.name || a.kind === 'phys') return false;
    if (!spellNames) {
      spellNames = new Set();
      [FF7.data.spells, FF7.data.summons].forEach(tab => Object.values(tab || {}).forEach(s => { if (s && s.name) spellNames.add(normName(s.name)); }));
      spellNames.delete('escape');                                    // (an enemy running off isn't sealed)
    }
    return spellNames.has(normName(a.name));
  };

  // ---- battle items on the foes (the Item command in Auto battle) -----------------------------------------
  // FF7's battle items that hit the opponents (Party Mechanics Guide, its Item list; Terence's Battle Mechanics FAQ):
  //  - damage items use the Item formula (FAQ 3.4.4): Damage = [Power x (512 - Def) / 512], Def for the
  //    physical ones (Grenade, Shrapnel, Right Arm, Molotov, S-mine, 8inch Cannon), MDf for the rest; "a fixed
  //    strength that your stats can't touch", Random Variation only, Barrier / MBarrier ignored (FAQ 1.2.3,
  //    "Item"); the All ones are "All Tar (NS)": full strength on every foe, no split (FAQ 1.2.4); Stardust is
  //    "4 Tar", four random foes; then the element: weak x2, resist half, void 0, absorb heals (never thrown)
  //  - Graviball / T/S Bomb: the HP% formula, [HP x Power / 32] of the foe's current HP (FAQ 3.4.5), Gravity
  //    element: nothing on a foe that voids Gravity (nearly every boss: "Void: Gravity", Enemy Mechanics FAQ)
  //  - status items (Hourglass [80] Stop, Dazers Paralysed, Ink Darkness, Mute Mask [80] Silence, Dream Powder
  //    [80] Sleep, Loco weed [80] Confusion, Impaler Frog, Shrivel Small, Cauldron six at once, Kiss of Death
  //    [68] Death) and Holy Torch (DeSpell on every foe); the FAQ's status effects (4.1) give their worth
  // The plans' consumables (the runner's WEAPON tactic, Limit training, Emerald WEAPON's Sadness...) and the
  // healing ones stay with the rest of the AI: never thrown here. Spider Web (Slow) is the WEAPON tactic's.
  AI.KEEP_ITEMS = ['hyper', 'tranquilizer', 'spider_web', 'elixir', 'megalixir', 'ether', 'turbo_ether', 'x_potion', 'phoenix_down', 'smoke_bomb'];
  // 'cheap': sold for 500 gil or less (Grenade, Molotov, Impaler, Shrivel) or weak (Power 640 or less: Bolt
  // Plume, Shrapnel, Earth Drum, Deadly Waste, Vampire Fang); 'rare': never sold, or strong
  AI.itemTier = function (id) {
    const d = FF7.data.items[id]; if (!d) return 'rare';
    const dm = d.effect && d.effect.damage;
    if (d.price > 0 && d.price <= 500) return 'cheap';
    return dm && dm.kind !== 'gravity' && (dm.fixed || 0) <= 640 ? 'cheap' : 'rare';
  };
  // the units of each kind kept back, by fight: a boss or a dangerous fight may have them all; a long one all but
  // the last rare one; an easy fight the cheap ones above the last two, and no rare one ("don't waste rare items
  // on trash": the player keeps them for the bosses)
  AI.ITEM_RESERVE = { boss: { cheap: 0, rare: 0 }, danger: { cheap: 0, rare: 0 }, long: { cheap: 0, rare: 1 }, easy: { cheap: 2, rare: Infinity } };
  // the HP damage item `id` does to t when a throws it (the average; max: the top of the Random Variation), as
  // the engine deals it (A.doItem); 0: nothing (void, a miss, an MP item), -1: t absorbs it (a heal)
  // every element an ability / item carries: `elements`, else `element` (one, or a list: Kjata's fire, ice and
  // lightning), as the engine reads them (actions.js norm) - one absorbed element makes the whole hit a heal
  AI.elsOf = (d) => d ? [].concat(Array.isArray(d.elements) && d.elements.length ? d.elements : d.element || []).filter(Boolean) : [];
  AI.itemDamage = function (a, id, t, max) {
    const d = FF7.data.items[id], dm = d && d.effect && d.effect.damage;
    if (!dm || dm.mp || !t || !t.targetable) return 0;
    if ((t.invulnerable && !(t.vars && t.vars.vulnerable)) || t.has('petrify') || t.has('peerless')) return 0;
    const els = AI.elsOf(dm);
    if (t.flying && !t.isParty && els.includes('earth')) return 0;
    const ei = B.calc.elemInfo(t, els);
    if (ei.absorb) return -1;
    if (ei.immune) return 0;
    let v;
    if (dm.kind === 'gravity') {
      if (t.immuneTo('gravity') || (t.boss && t.immune && t.immune.includes('gravity'))) return 0;
      v = Math.floor(t.hp * (dm.pct || 25) / 100);
    } else v = Math.floor((dm.fixed || 0) * (512 - Math.min(511, dm.kind === 'phys' ? t.stat('def') : t.stat('mdf'))) / 512) * (max ? 1 : 3968.5 / 4096);
    return Math.min(9999, v * (ei.mult || 1));
  };
  // the expected damage of a (queued) party command on foe t: the Auto AI's own estimates
  AI.estDamage = function (x, act, t) {
    const C = B.calc, D = FF7.data;
    const mult = (els) => { const ei = C.elemInfo(t, [].concat(els || [])); return ei.absorb || ei.immune ? 0 : (ei.mult || 1); };
    const ph = () => (t.physImmune && !(t.vars && t.vars.vulnerable) ? 0 : 1) * C.physBase(x.stat('atk'), x.level) * (512 - Math.min(511, t.stat('def'))) / 512 * (!x.longRange && (x.row === 'back' || t.row === 'back') ? 0.5 : 1) * mult(x.weaponElem);
    const mg = (d) => (d.power || 8) * (512 - Math.min(511, t.stat('mdf'))) * C.magBase(x.stat('mat'), x.level) / (16 * 512) * mult(d.elements || d.element);
    switch (act.type) {
      case 'attack': case 'mug': return ph();
      case 'magic': { const d = D.spells[act.id]; return d && d.kind === 'damage' ? mg(d) * (act.all && (act.targets || []).length > 1 ? 2 / 3 : 1) : 0; }
      case 'eskill': { const d = D.eskills[act.id]; return !d ? 0 : d.kind === 'damage' ? mg(d) : d.kind === 'gravity' ? t.hp * (d.pct || 50) / 100 : 0; }
      case 'summon': { const d = D.summons[act.id]; return d && d.kind === 'damage' ? mg(d) * (d.hits || 1) : 0; }
      case 'limit': { const L = D.limits[act.id]; return !L ? 0 : L.kind === 'phys' ? ph() * (L.power || 16) / 16 * (L.hits || 1) : L.kind === 'mag' || L.kind === 'damage' ? mg(L) * (L.hits || 1) : 0; }
      case 'item': { const dm = ((D.items[act.item] || {}).effect || {}).damage; const v = AI.itemDamage(x, act.item, t); return v > 0 ? v * (dm && dm.random && dm.hits ? dm.hits / Math.max(1, (act.targets || []).length) : 1) : 0; }
      default: return 0;
    }
  };
  // what foe t does to the party in one of its turns: its strongest move on the party's average Def / MDf (an
  // All one counted on everyone): { phys, mag, spell, hit } (spell: its strongest Magic, the part Silence stops;
  // hit: its strongest blow on one member)
  AI.foeThreat = function (t, party) {
    const C = B.calc, n = Math.max(1, party.length);
    const def = party.reduce((s, x) => s + Math.min(511, x.stat('def')), 0) / n, mdf = party.reduce((s, x) => s + Math.min(511, x.stat('mdf')), 0) / n;
    const hp = party.reduce((s, x) => s + x.hp, 0) / n;
    const ai = (t.def0 && t.def0.ai) || {}, ids = [];
    const add = (l) => (l || []).forEach(m => ids.push(Array.isArray(m) ? m[0] : m));
    add(ai.moves); add(ai.cycle); (ai.phases || []).forEach(ph => { add(ph.moves); add(ph.cycle); }); if (ai.first) ids.push(ai.first);
    const keys = ai.custom || !ids.length ? Object.keys(t.attacks || {}) : ids;
    const out = { phys: 0, mag: 0, spell: 0, hit: 0 };
    for (const k of keys) {
      const a = t.attacks && t.attacks[k]; if (!a || a.manipOnly || (a.mp && t.maxMp > 0 && t.mp < a.mp)) continue;
      const tg = /^all[A-Z]/.test(a.target || '') ? n : 1, hits = a.hits || 1;
      let d = 0;
      if (a.kind === 'phys') d = C.physBase(t.stat('atk'), t.level || 1) * (a.power || 16) / 16 * (512 - def) / 512;
      else if (['mag', 'damage', 'drain'].includes(a.kind) && (a.power || a.fixed)) d = a.fixed || a.power * (512 - mdf) * C.magBase(t.stat('mat'), t.level || 1) / (16 * 512);
      else if (a.kind === 'pct' || a.kind === 'gravity') d = hp * (a.pct || 25) / 100;
      d *= hits; out.hit = Math.max(out.hit, d); d *= tg;
      if (a.kind === 'phys') out.phys = Math.max(out.phys, d);
      else { out.mag = Math.max(out.mag, d); if (AI.isSpellMove(a)) out.spell = Math.max(out.spell, d); }
    }
    return out;
  };
  // The Item command on the foes, for AI.autoBattle: the best battle item for this turn, or null. c: the Auto
  // AI's view of the turn { battle, p, foes, aim, alive, allies, boss, mem, wild, canItem, bestOther (its best
  // other option), value, focus, counterFactor, wouldCounter, counterHarm }. An expert's rules:
  //  - the fight: a boss; a dangerous one (the party in trouble, a foe 5+ levels above the party or whose blow
  //    takes 30% of a member's HP); a long one (over 5 rounds of the party's attacks, the runner's MP price at 1.5
  //    or less); else an easy one (no status items there)
  //  - the bag: other members' queued items come off first; the plans' (AI.KEEP_ITEMS, the battle option
  //    keepItems) are never thrown; the reserve (AI.ITEM_RESERVE) stays back; mem.itemPolicy.off (the runner's
  //    battle { items: false }, its WEAPON tactic) turns this off
  //  - damage: the item's damage on each foe (AI.itemDamage) against what the foe still has once the queued
  //    commands land; kills count extra (the AI's value); a foe that absorbs its element rules it out; an item
  //    whose counter would be deadly (counterHarm, kind 'item') is not thrown
  //  - status: the party's HP it saves (AI.foeThreat x the foe's turns it takes away: Stop 3, Paralysed 1.5,
  //    Sleep 2 with others to hit instead; Darkness halves its physical hits, Small / Frog nearly end them, Silence
  //    its spells, over the foe's remaining turns up to 8), in the foes' HP (x their HP / the party's max HP);
  //    never a status the foe is immune to, already has, is getting from a queued item, or dodged twice; no
  //    Petrify (a petrified foe never leaves the fight here), no Berserk, no Slow (Spider Web is kept)
  //  - it is thrown when it clearly beats the member's best other option (the attack, spells within the MP
  //    price, E.Skills, summons): x1.1 on a boss, x1.2 in a dangerous fight, x1.3 in a long one, x1.6 in an easy
  //    one; x0.9 when
  //    that option is a spell and the member's MP is low (the MP is kept for the heals); a rare item must also
  //    gain 5% of the foes' HP over it
  //  - fairness: the item's damage counts up to what the foe keeps once the queued commands land, and a kill's
  //    extra only when the item alone kills (as for the options it is weighed against); a foe the queue already
  //    finishes is worth nothing
  //  - All items only when every targetable foe is in view (the runner hides the ones it spares: E.Skills to
  //    learn, Morph, steals); a single one only at the foes in view
  AI.itemOffence = function (c) {
    const { battle, p, foes, aim, alive, allies, boss, mem } = c;
    const pol = mem.itemPolicy || {};
    if (pol.off || !c.canItem || c.wild || !p.isParty || !aim.length) return null;
    if (allies.some(x => x.guest && x.alive)) return null;          // (the Kalm flashback: Sephiroth wins those by himself)
    const D = FF7.data, C = B.calc, inv = FF7.sys.inv;
    const bag = (FF7.state.items || []).filter(e => {
      const d = D.items[e.id], f = d && d.effect; if (!f || !d.battle || e.qty <= 0 || f.greens) return false;
      return /^(enemy|allEnemies)$/.test(d.target || '') && ((f.damage && !f.damage.mp) || f.enemyStatus || (f.cure && d.target === 'allEnemies'));
    });
    if (!bag.length) return null;
    const lv = alive.reduce((s, x) => s + (x.level || 1), 0) / Math.max(1, alive.length);
    const avgHp = alive.reduce((s, x) => s + x.maxHp, 0) / Math.max(1, alive.length);
    const thC = new Map(), threat = (t) => { if (!thC.has(t)) thC.set(t, AI.foeThreat(t, alive)); return thC.get(t); };
    // (dangerous: the party in trouble - someone down, two under 40% HP, or alone under half - or a foe 5+ levels
    // above the party or whose blow takes 30% of a member's HP; long: over 5 rounds of the party's attacks, the
    // runner's MP price at 1.5 or less, or someone under 40% HP)
    const crisis = allies.some(x => !x.alive) || alive.filter(x => x.hp < x.maxHp * 0.4).length >= 2 || (alive.length === 1 && alive[0].hp < alive[0].maxHp * 0.5);
    const danger = crisis || foes.some(t => (t.level || 1) >= lv + 5 || threat(t).hit > avgHp * 0.3);
    const long = !!mem.long || (mem.mpFactor != null && mem.mpFactor <= 1.5) || alive.some(x => x.hp < x.maxHp * 0.4);
    const cls = boss ? 'boss' : danger ? 'danger' : long ? 'long' : 'easy';
    // the bag: other members' queued commands take theirs first; the kept ones and the reserve stay
    const q = battle.queue.concat(battle.current ? [battle.current] : []).filter(a => a && a.actor && a.actor.isParty && a.actor !== p);
    const keep = new Map(); AI.KEEP_ITEMS.forEach(id => keep.set(id, Infinity));
    if (Array.isArray(pol.keep)) pol.keep.forEach(id => keep.set(id, Infinity));
    else if (pol.keep && typeof pol.keep === 'object') for (const id in pol.keep) keep.set(id, Math.max(keep.get(id) || 0, +pol.keep[id] || 0));
    const spareOf = (id) => inv.count(id) - q.filter(a => a.type === 'item' && a.item === id && !a.preTaken).length - Math.max(keep.get(id) || 0, AI.ITEM_RESERVE[cls][AI.itemTier(id)]);
    // the damage already on its way to each foe (the other members' queued commands)
    const qd = new Map();
    for (const a of q) if (a.side === 'enemy') for (const t of foes) if (a.all || (a.targets || []).includes(t)) {
      let d = 0; try { d = AI.estDamage(a.actor, a, t); } catch (e) { d = 0; }
      qd.set(t, (qd.get(t) || 0) + (isFinite(d) ? Math.max(0, d) : t.hp));
    }
    const left = (t) => t.hp - (qd.get(t) || 0);
    // (the AI's value: the damage - no more than the foe keeps once the queue lands - and a kill's extra only when the
    // item alone kills, as for the other options it is weighed against)
    const val = (d, t) => { const hl = left(t); if (hl <= 0 || d <= 0) return 0; return Math.min(d, hl) * c.focus(t) + (d >= t.hp ? 400 + (t.boss ? 0 : 150) : 0); };
    // (an All item hits the foes the caller left out too: the runner's spared ones)
    const real = (((p.battle && p.battle.enemies) || battle.enemies) || []).filter(e => e.targetable && !(e.def0 && e.def0.chocobo));
    const ours = (t) => t.has('manipulate') && t.manipulator && t.manipulator.isParty;   // (a foe under our Manipulate)
    const hidden = real.some(e => !foes.includes(e) || ours(e));
    // a round of the party's attacks on t, the foe's turns left (at most 8 counted), the HP exchange rate
    const bo = c.bestOther, other = bo && bo.score > 0 && !bo.deadly ? bo.score : 0;
    const round = (t) => Math.max(1, other, alive.reduce((s, x) => s + (t.physImmune ? 0 : C.physBase(x.stat('atk'), x.level) * (512 - Math.min(511, t.stat('def'))) / 512 * (!x.longRange && (x.row === 'back' || t.row === 'back') ? 0.5 : 1)), 0));
    const turns = (t) => Math.max(0, Math.min(8, left(t) / round(t)));
    const ex = foes.reduce((s, t) => s + Math.max(0, left(t)), 0) / Math.max(1, allies.reduce((s, x) => s + x.maxHp, 0));
    const tried = mem.itemTries = mem.itemTries || {};
    const onWay = (t, s) => q.some(a => { const d = a.type === 'item' && D.items[a.item]; return d && ((d.effect || {}).enemyStatus || []).includes(s) && (a.all || /^all[A-Z]/.test(d.target || '') || (a.targets || []).includes(t)); });
    const odds = (id, t, s) => {
      if (['petrify', 'berserk', 'slow'].includes(s) || t.immuneTo(s) || t.has(s) || (tried[t.uid + ':' + s] || 0) >= 2 || onWay(t, s)) return 0;
      if (s === 'death' && t.boss) return 0;
      return (D.items[id].effect.chance || 100) / 100;
    };
    // the party HP a status on t saves (FAQ 4.1: Stop / Paralysed / Sleep - can't act; Darkness - its hits land
    // half as often; Frog - 1/4 physical damage; Small - physical damage 0; Silence - no Magic)
    const saves = (t, s) => {
      const th = threat(t), all = Math.max(th.phys, th.mag), T = turns(t);
      const locked = t.has('stop') || t.has('sleep') || t.has('paralysis');
      switch (s) {
        case 'stop': return locked ? 0 : all * Math.min(3, T);
        case 'paralysis': return locked ? 0 : all * Math.min(1.5, T);
        case 'sleep': return locked ? 0 : all * Math.min(foes.length > 1 ? 2 : 0.5, T);   // (a physical hit wakes it)
        case 'confusion': return foes.length > 1 ? all * Math.min(1, T) * 0.5 : 0;
        case 'darkness': return th.phys * 0.5 * T;
        case 'frog': return th.phys * 0.75 * T;
        case 'small': return th.phys * 0.9 * T;
        case 'silence': return th.spell * T;
        default: return 0;
      }
    };
    // Holy Torch (DeSpell): Haste, Reflect, Barrier / MBarrier off the foes (not while one is Stopped or Slowed)
    const stopped = real.some(t => t.has('stop') || t.has('slow'));
    const despell = (t) => stopped ? 0 : (t.has('haste') ? Math.max(threat(t).phys, threat(t).mag) * 0.5 * Math.min(4, turns(t)) * ex : 0)
      + (t.has('reflect') || t.has('barrier') || t.has('mbarrier') ? round(t) * 0.5 * Math.min(3, turns(t)) : 0);
    const cands = [];
    for (const e of bag) {
      const id = e.id, d = D.items[id], f = d.effect;
      if (spareOf(id) <= 0) continue;
      const allT = d.target === 'allEnemies';
      if (allT && hidden) continue;
      const dm = f.damage && !f.damage.mp ? f.damage : null;
      if (!dm && cls === 'easy') continue;                          // (status items: bosses and dangerous fights)
      const els = AI.elsOf(dm);
      const evalOn = (ts) => {
        let score = 0, countered = false; const marks = [];
        const hitsEach = dm && dm.random && dm.hits ? dm.hits / Math.max(1, ts.length) : 1;
        for (const t of ts) {
          if (left(t) <= 0) continue;
          let dmg = 0, kill = 0, prev = 0, dot = 0;
          if (dm) { const v = AI.itemDamage(p, id, t); if (v < 0) return null; dmg = v * hitsEach; }
          for (const s of f.enemyStatus || []) {
            const o = odds(id, t, s); if (!o) continue;
            if (s === 'death') kill = Math.max(kill, o * val(t.hp, t));
            else if (s === 'poison') dot += o * Math.min(left(t), t.maxHp / 32 * turns(t));
            else { const v = saves(t, s); if (v > 0) { prev += o * v; marks.push(t.uid + ':' + s); } }
          }
          let sc = val(dmg, t) + kill + dot + prev * ex + (f.cure && allT ? despell(t) : 0);
          if (sc <= 0) continue;
          if (dmg < left(t) * 1.05) {                                // (it stands: its counter, if any)
            const r = c.counterHarm(t, 'item', els); if (r.deadly) return null;
            sc *= c.counterFactor(t, 'item'); if (c.wouldCounter(t, 'item')) countered = true;
          }
          score += sc;
        }
        return score > 0 ? { score, countered, marks } : null;
      };
      if (allT) { const r = evalOn(foes); if (r) cands.push(Object.assign(r, { id, targets: foes.slice(), all: true })); }
      else for (const t of aim) { if (ours(t)) continue; const r = evalOn([t]); if (r) cands.push(Object.assign(r, { id, targets: [t], all: false })); }
    }
    if (!cands.length) return null;
    const mpOpt = bo && (bo.all || bo.summon || (bo.act && ['magic', 'eskill', 'summon'].includes(bo.act.type)));
    let M = { boss: 1.1, danger: 1.2, long: 1.3, easy: 1.6 }[cls];
    if (mpOpt && cls !== 'easy' && p.maxMp > 0 && p.mp < p.maxMp * 0.3) M = 0.9;   // (the last MP kept for the heals)
    // (a rare item must also gain something worth it over that option: 5% of the foes' HP left, 30 at least - not a
    // Graviball's 75 on a minion where an attack does 57)
    const floor = Math.max(30, foes.reduce((s, t) => s + Math.max(0, left(t)), 0) * 0.05);
    const top = cands.filter(x => x.score > other * M && (AI.itemTier(x.id) === 'cheap' || x.score - other >= floor)).sort((a, b) => b.score - a.score)[0];
    if (!top) return null;
    const act = { actor: p, type: 'item', item: top.id, targets: top.targets, side: 'enemy' };
    if (top.all) act.all = true;
    return { score: top.score, countered: top.countered, item: top.id, cls, act, onUse: () => { top.marks.forEach(k => { tried[k] = (tried[k] || 0) + 1; }); } };
  };
  AI.autoBattle = function (battle, p) {
    if (!p.isParty) return AI.manipAuto(battle, p);        // a manipulated enemy's turn
    const D = FF7.data, C = FF7.battle.calc;
    const foes = battle.enemies.filter(x => x.targetable && !(x.def0 && x.def0.chocobo));
    // a wild chocobo (Chocobo Lure battle) runs off when anything hits it: no All spells, summons or Limit Breaks
    // while it is there, and single hits only on a foe no other party command is queued on (a queued attack whose
    // target has died turns on a random enemy, the chocobo too); with every foe taken, the turn waits (Defend)
    const wild = battle.enemies.some(x => x.targetable && x.def0 && x.def0.chocobo);
    // battle.noAll (the runner's view while it spares a foe to learn its Enemy Skill): single targets only - an All
    // spell, summon, All Enemy Skill, Limit Break or item would hit the spared one too (the engine aims All at every foe)
    const noAll = wild || !!battle.noAll;
    const queuedOn = new Set(wild ? battle.queue.concat(battle.current ? [battle.current] : []).filter(q => q && q.actor && q.actor.isParty && q.actor !== p).reduce((a, q) => a.concat(q.targets || []), []) : []);
    const aim = wild ? foes.filter(t => !queuedOn.has(t)) : foes;
    const allies = battle.party.filter(x => !x.hidden);
    const alive = allies.filter(x => x.alive);
    const boss = foes.some(f => f.boss);
    const mem = battle._auto = battle._auto || { buffs: {} };
    // (the Item command can be sealed: a Battle Square handicap)
    const canItem = !p.abilities || !p.abilities.commands || p.abilities.commands.some(c => c === 'item' || c === 'w_item');
    const inv = (id) => canItem && FF7.sys.inv.count(id) > 0;
    const silenced = p.has('silence');
    // (the MP a spell or summon really costs: a paired MP Turbo raises it by itself, stacking to +50%)
    const turboMp = (s, mp) => { const tl = Math.min(5, (s.supports || []).filter(x => x.id === 'mp_turbo').reduce((n, x) => n + (x.level || 1), 0)); return tl ? Math.min(255, Math.floor(mp * (10 + tl) / 10) + 1) : mp; };
    const spellList = silenced ? [] : (p.abilities && p.abilities.spells || []).map(s => {
      const d = D.spells[s.id]; if (!d) return null;
      const all = s.supports.find(x => x.id === 'all');
      return { id: s.id, d, mp: turboMp(s, d.mp), allLeft: all && d.canAll !== false ? Math.max(0, all.level - (p.allUses[s.id] || 0)) : 0 };
    }).filter(x => x && p.mp >= x.mp);
    // Enemy Skills (the E.Skill command): damage ones join the offence, White Wind / Angel Whisper the
    // healing, Big Guard the boss openers (All e-skills never split)
    const eskList = silenced ? [] : (p.abilities && p.abilities.eskills || []).map(id => { const d = D.eskills[id]; return d && p.mp >= (d.mp || 0) ? { id, d: Object.assign({}, d, { elements: AI.elsOf(d) }), mp: d.mp || 0 } : null; }).filter(Boolean);
    const esk = (e, targets, side, all) => ({ actor: p, type: 'eskill', id: e.id, targets, side, all: !!all });
    const cheapestCure = (p.abilities && p.abilities.spells || []).map(s => D.spells[s.id]).filter(d => d && d.kind === 'heal').reduce((m, d) => Math.min(m, d.mp), Infinity);
    const reserve = isFinite(cheapestCure) ? cheapestCure * 2 : 0;       // MP kept for emergency healing
    const cast = (sp, targets, side, extra = {}) => {
      if (extra.all) { p.allUses[sp.id] = (p.allUses[sp.id] || 0) + 1; }
      return Object.assign({ actor: p, type: 'magic', id: sp.id, targets, side, useAll: !!extra.all, all: !!extra.all }, extra);
    };
    const item = (id, t) => ({ actor: p, type: 'item', item: id, targets: [t], side: 'ally' });

    // ---- 0. the blow that ends the fight (the last foe, or any one of foes who all leave when one falls: the
    // Turks) goes before reviving and healing
    if (!p.has('darkness') && !wild) {
      const fin = foes.filter(t => {
        if (!AI.endsFight(t, foes)) return false;
        if (t.invulnerable || t.physImmune || (t.cantReach && !p.longRange)) return false;
        const ei = C.elemInfo(t, p.weaponElem || []); if (ei.immune || ei.absorb) return false;
        const d = C.physBase(p.stat('atk'), p.level) * (512 - Math.min(511, t.stat('def'))) / 512 * (ei.mult || 1);
        return t.hp <= d * (!p.longRange && (p.row === 'back' || t.row === 'back') ? 0.5 : 1) * 0.9;
      }).sort((a, b) => a.hp - b.hp)[0];
      if (fin) return { actor: p, type: 'attack', targets: [fin], side: 'enemy' };
    }
    // ... or a spell, summon or Enemy Skill that finishes it (its expected damage, 90%, over its HP; the cheapest in
    // MP): Reno at 2,534 HP, one Bahamut ZERO from the end of the fight, while Barret revived someone and the party
    // fell (a full run's Turks). An All one only when nothing is being spared (battle.noAll)
    if (!wild && foes.length) {
      const finT = foes.filter(t => AI.endsFight(t, foes) && !(t.invulnerable && !(t.vars && t.vars.vulnerable)) && !t.has('reflect')).sort((a, b) => a.hp - b.hp)[0];
      if (finT) {
        const est = (d) => {
          const els = AI.elsOf(d); if (finT.flying && els.includes('earth')) return 0;
          const ei = C.elemInfo(finT, els); if (ei.immune || ei.absorb) return 0;
          const mdf = d.pierce ? 0 : Math.min(511, finT.stat('mdf'));
          return (d.power || 8) * (512 - mdf) * C.magBase(p.stat('mat'), p.level) / (16 * 512) * (ei.mult || 1) * (d.hits || 1) * 0.9;
        };
        const isAll = (d) => /^all[A-Z]/.test(d.target || '');
        const cands = [];
        for (const sp of spellList) if (sp.d.kind === 'damage' && est(sp.d) >= finT.hp) cands.push([sp.mp, cast(sp, [finT], 'enemy')]);
        for (const e of eskList) if (e.d.kind === 'damage' && (!noAll || !isAll(e.d)) && est(e.d) >= finT.hp) cands.push([e.mp, esk(e, isAll(e.d) ? foes : [finT], 'enemy', isAll(e.d))]);
        if (!silenced && !noAll) for (const s of (p.abilities.summons || [])) {
          const d = D.summons[s.id]; const mp = d && turboMp(s, d.mp);
          if (d && d.kind === 'damage' && p.mp >= mp && (p.summonUses[s.id] || 0) < s.uses && est(d) >= finT.hp) cands.push([mp, { actor: p, type: 'summon', id: s.id, all: true, side: 'enemy', targets: foes, _sum: s.id }]);
        }
        const best = cands.sort((x, y) => x[0] - y[0])[0];
        if (best) { if (best[1]._sum) { p.summonUses[best[1]._sum] = (p.summonUses[best[1]._sum] || 0) + 1; delete best[1]._sum; } return best[1]; }
      }
    }
    // ---- 1. revive (not someone another member's queued command already brings back)
    const pending = battle.queue.concat(battle.current ? [battle.current] : []).filter(q => q && q.actor && q.actor.isParty && q.actor !== p && q.side === 'ally');
    const kos = allies.filter(x => x.dead && !pending.some(q => (q.targets || []).includes(x)));
    if (kos.length) {
      const rev = spellList.filter(x => x.d.kind === 'revive').sort((a, b) => (b.d.pct || 0) - (a.d.pct || 0))[0];
      if (rev) return cast(rev, [kos[0]], 'ally');
      const aw = eskList.find(e => e.id === 'angel_whisper');
      if (aw) return esk(aw, [kos[0]], 'ally');
      if (inv('phoenix_down')) return item('phoenix_down', kos[0]);
    }
    // ---- 2. healing
    // heals already on their way from other members' queued commands count as landed, so a wounded fighter gets
    // one Cure, not one from everybody whose turn comes up before the first lands
    const incoming = new Map();
    for (const q of battle.queue.concat(battle.current ? [battle.current] : [])) {
      if (!q || !q.actor || !q.actor.isParty || q.actor === p || q.side !== 'ally') continue;
      const ts = (q.targets || []).filter(Boolean);
      let v = 0;
      if (q.type === 'magic' && D.spells[q.id] && D.spells[q.id].kind === 'heal') v = Math.floor((D.spells[q.id].power || 5) * 22 * C.magBase(q.actor.stat('mat'), q.actor.level) / 16 / 10) * (q.all && ts.length > 1 ? 2 / 3 : 1);
      else if (q.type === 'item' && D.items[q.item]) { const e = D.items[q.item].effect || {}; v = e.healHpPct ? 1e6 : (e.healHp || 0); }
      else if (q.type === 'eskill' && q.id === 'white_wind') v = q.actor.hp;
      else if (q.type === 'limit' && D.limits[q.id] && D.limits[q.id].kind === 'heal') v = 1e6;
      if (v > 0) ts.forEach(x => incoming.set(x, (incoming.get(x) || 0) + v));
    }
    const hpOf = (x) => Math.min(x.maxHp, x.hp + (incoming.get(x) || 0));
    const hurtFrac = (x) => hpOf(x) / x.maxHp;
    const hurt = alive.filter(x => hurtFrac(x) < 0.5).sort((a, b) => hurtFrac(a) - hurtFrac(b));
    const cures = spellList.filter(x => x.d.kind === 'heal' && !/regen/.test(x.id)).sort((a, b) => (b.d.power || 0) - (a.d.power || 0));
    // a healing Limit Break first (it costs nothing)
    if (!wild && p.limitGauge >= 255 && (hurt.length >= 2 || kos.length || alive.some(x => hurtFrac(x) < 0.3))) {
      const lk = AI.pickLimit(battle, p);
      if (lk && lk.type === 'heal') { p.limitGauge = 0; return lk.act; }
    }
    // White Wind heals everyone by the caster's own HP: better than Cure-All when the caster is healthy
    const ww = eskList.find(e => e.id === 'white_wind');
    if (hurt.length >= 2 && ww && p.hp >= Math.max(...hurt.map(x => x.maxHp - hpOf(x))) * 0.5) return esk(ww, alive, 'ally', true);
    if (hurt.length >= 2 && cures.length) {
      const allCure = cures.find(x => x.allLeft > 0);
      if (allCure) return cast(allCure, alive, 'ally', { all: true });
    }
    const critical = hurt.find(x => hurtFrac(x) < (alive.length === 1 ? 0.5 : 0.35));   // alone: no one else to catch a bad turn
    if (critical) {
      // smallest cure that heals most of the missing HP, else the strongest affordable
      const missing = critical.maxHp - hpOf(critical);
      const healOf = (sp) => { const b = C.magBase(p.stat('mat'), p.level); return Math.floor((sp.d.power || 5) * 22 * b / 16 / 10); };
      const fit = cures.slice().reverse().find(sp => healOf(sp) >= missing * 0.7) || cures[0];
      if (fit) return cast(fit, [critical], 'ally');
      const pot = missing > 800 && inv('x_potion') ? 'x_potion' : ['hi_potion', 'potion', 'x_potion'].find(inv);
      if (pot) return item(pot, critical);
    }
    // (nothing to fight - every foe is being spared, e.g. to learn its Enemy Skill: revive and heal above, else Defend)
    if (!foes.length) return { actor: p, type: 'defend' };
    // ---- 2b. a foe that one plain attack finishes goes down first: a status cure can wait a turn (a Gas Ducter
    // left at 30 HP out-lasted three fighters who kept curing the statuses its Smog Alert kept re-applying)
    const oneHit = p.has('darkness') ? null : aim.find(t => {
      if (t.invulnerable || t.physImmune || (t.cantReach && !p.longRange)) return false;
      const ei = C.elemInfo(t, p.weaponElem || []); if (ei.immune || ei.absorb) return false;
      const d = C.physBase(p.stat('atk'), p.level) * (512 - Math.min(511, t.stat('def'))) / 512 * (ei.mult || 1);
      return t.hp <= d * (!p.longRange && (p.row === 'back' || t.row === 'back') ? 0.5 : 1) * 0.9;
    });
    if (oneHit) return { actor: p, type: 'attack', targets: [oneHit], side: 'enemy' };
    // ---- 3. dangerous statuses
    const esuna = spellList.find(x => x.id === 'esuna');
    const statusFix = [
      ['slow_numb', ['soft', 'remedy']], ['petrify', ['soft', 'remedy']], ['frog', ['maidens_kiss', 'remedy']], ['small', ['cornucopia', 'remedy']],
      ['confusion', ['remedy']], ['silence', ['echo_screen', 'remedy']], ['darkness', ['eye_drop', 'remedy']], ['poison', ['antidote', 'remedy']],
    ];
    for (const [st, items] of statusFix) {
      const who = alive.find(x => x.has(st) && x !== p && !(st === 'silence' && !(x.abilities && x.abilities.spells && x.abilities.spells.length)) && !(st === 'poison' && hurtFrac(x) > 0.6) && !(st === 'darkness' && x.longRange === false && false));
      const self = !who && p.has(st) && st !== 'silence' && st !== 'confusion' ? p : null;
      const t = who || self;
      if (!t) continue;
      if (esuna && !['petrify'].includes(st)) return cast(esuna, [t], 'ally');
      const it = items.find(inv); if (it) return item(it, t);
    }
    // ---- 4. boss-fight opener buffs (each once per battle): Big Guard first (Barrier + MBarrier + Haste on all)
    const bg = eskList.find(e => e.id === 'big_guard');
    if (boss && bg && !mem.buffs.big_guard && alive.filter(x => !x.has('barrier') || !x.has('haste')).length > 1) { mem.buffs.big_guard = mem.buffs.barrier = mem.buffs.mbarrier = mem.buffs.haste = true; return esk(bg, alive, 'ally', true); }
    // a long fight (the foes' HP is over 5 rounds of the party's attacks) or a dangerous one (the runner's MP
    // price at 1.5 or less): Haste at the start too
    if (mem.long == null && foes.length) {
      const avgDef = foes.reduce((a, t) => a + Math.min(511, t.stat('def')), 0) / foes.length;
      const round = alive.reduce((a, x) => a + C.physBase(x.stat('atk'), x.level) * (512 - avgDef) / 512, 0) || 1;
      mem.long = foes.reduce((a, t) => a + t.hp, 0) / round > 5;
    }
    const buffList = boss ? [['barrier', 'barrier', true], ['mbarrier', 'mbarrier', true], ['haste', 'haste', true], ['regen', 'regen', false]]
      : (mem.long || (mem.mpFactor != null && mem.mpFactor <= 1.5)) && !wild ? [['haste', 'haste', true]] : [];
    if (buffList.length && p.mp > reserve) {
      for (const [id, st, allFirst] of buffList) {
        const sp = spellList.find(x => x.id === id);
        if (!sp || mem.buffs[id]) continue;
        const need = alive.filter(x => !x.has(st));
        if (!need.length) continue;
        mem.buffs[id] = true;
        if (allFirst && sp.allLeft > 0 && need.length > 1) return cast(sp, alive, 'ally', { all: true });
        return cast(sp, [need[0]], 'ally');
      }
    }
    // ---- 6. offence: expected damage of each option
    const phys = (t) => {
      if (t.invulnerable && !(t.vars && t.vars.vulnerable)) return 0;
      if (t.physImmune && !(t.vars && t.vars.vulnerable)) return 0;
      if (t.cantReach && !p.longRange) return 0;
      const ei = C.elemInfo(t, p.weaponElem || []);
      if (ei.immune || ei.absorb) return 0;
      let d = C.physBase(p.stat('atk'), p.level) * (512 - Math.min(511, t.stat('def'))) / 512;
      if (!p.longRange && (p.row === 'back' || t.row === 'back')) d /= 2;
      if (p.has('darkness')) d *= 0.5;
      return d * (ei.mult || 1) * 0.95;
    };
    const mag = (d, t, split) => {
      if (t.invulnerable && !(t.vars && t.vars.vulnerable)) return 0;
      if (t.has('reflect')) return -1;                          // would bounce back on us
      const els = AI.elsOf(d);
      if (t.flying && els.includes('earth')) return 0;
      const ei = C.elemInfo(t, els);
      if (ei.immune) return 0; if (ei.absorb) return -1;
      let dmg = (d.power || 8) * (512 - Math.min(511, t.stat('mdf'))) * C.magBase(p.stat('mat'), p.level) / (16 * 512);
      if (split) dmg = dmg * 2 / 3;
      return dmg * (ei.mult || 1);
    };
    // a fight that ends when any one of them falls (the Turks: onDeathRemove): the one closest to falling is the
    // target; damage to the others counts in proportion
    // (every blow on the others is wasted unless it becomes the one that falls: they count a tenth - a softer weight,
    // HP over HP, let Cloud's hits go to Elena, whose Defense is lower, while Reno was the one to bring down, and a
    // full run lost the party to them)
    const endsOnOne = foes.length > 1 && foes.every(f => AI.endsFight(f, foes));
    const lowHp = endsOnOne ? Math.min(...foes.map(f => f.hp)) : 0;
    const focus = (t) => endsOnOne && t.hp > 0 ? (t.hp <= lowHp ? 1 : 0.1) : 1;
    const value = (dmg, t) => dmg <= 0 ? dmg : Math.min(dmg, t.hp) * focus(t) + (dmg >= t.hp ? 400 + (t.boss ? 0 : 150) : 0);   // kills are worth extra
    // counter awareness: ask the enemy's own counter logic (dry run, vars copied) whether this kind of
    // action would be answered right now, e.g. Guard Scorpion with its tail up
    const counterCache = {};
    const wouldCounter = (t, kind) => {
      const k = t.uid + ':' + kind; if (k in counterCache) return counterCache[k];
      const ai = t.def0 && t.def0.ai; let r = false;
      if (ai && ai.counter && ai.counter.custom) {
        const saved = t.vars, f0 = t.facing, h0 = t.homeFacing, r0 = t.row; t.vars = Object.assign({}, saved);   // (a counter may turn it: Air Buster; or move it: Elena)
        try { const c = ai.counter.custom(t, AI.api(battle), p, kind, null); r = !!(c && (typeof c === 'string' || c.move)); if (r) { const at = t.attacks && t.attacks[typeof c === 'string' ? c : c.move]; if (at && at.kind === 'special' && (!at.special || at.special === 'nothing')) r = false; if (r && at && at.kind === 'heal') healCounter[t.uid] = true; } } catch (e) { r = false; }   // (a harmless counter, e.g. a row change, is no reason to hold back)
        t.vars = saved; t.facing = f0; t.homeFacing = h0; t.row = r0;
      } else if (ai && ai.counter && (ai.counter.phys || ai.counter.mag)) r = kind === 'phys' ? !!ai.counter.phys : !!(ai.counter.mag || ai.counter.magic);
      return (counterCache[k] = r);
    };
    const healCounter = {};   // foes that answer hits by healing themselves (Godo's Cure2 at 40% HP): waiting never stops that
    const counterFactor = (t, kind) => wouldCounter(t, kind) ? (t.vars && Object.keys(t.vars).length && t.boss ? 0.15 : 0.6) : 1;
    // Deadly counters (a Behemoth answers any magic with Flare, ~5000): the attack an enemy would answer this
    // kind of action with (its counter data: mag / phys / item, byElement, or a dry run of its custom counter)
    // and what that does to whoever it hits (the one who hit it; everyone for an All attack). An action whose
    // counter would take over 40% of someone's max HP, or kill them, is `deadly`: scored down by the harm, and
    // any safe action that hurts wins (the other kind of attack)
    const moveCache = {};
    const counterMove = (t, kind, els) => {
      const k = t.uid + ':' + kind + ':' + (els || []).join(','); if (k in moveCache) return moveCache[k];
      const c = t.def0 && t.def0.ai && t.def0.ai.counter; let m = null;
      if (c && c.custom) {
        const saved = t.vars, f0 = t.facing, h0 = t.homeFacing, r0 = t.row; t.vars = Object.assign({}, saved);
        try { const r = c.custom(t, AI.api(battle), p, kind, null); m = r ? (typeof r === 'string' ? r : r.move || null) : null; } catch (e) { m = null; }
        t.vars = saved; t.facing = f0; t.homeFacing = h0; t.row = r0;
      } else if (c) {
        m = kind === 'phys' ? c.phys || null : kind === 'mag' ? (c.mag || c.magic || null) : kind === 'item' ? c.item || null : null;
        if (!m && c.byElement && els) for (const el of els) if (c.byElement[el]) { m = c.byElement[el]; break; }
      }
      return (moveCache[k] = m);
    };
    const counterHarm = (t, kind, els) => {
      const m = counterMove(t, kind, els), a = m && t.attacks && t.attacks[m];
      if (!a || (a.kind !== 'phys' && a.kind !== 'mag')) return { harm: 0, deadly: false };
      const cc = (t.def0.ai && t.def0.ai.counter) || {}, chance = cc.custom ? 100 : cc.chance != null ? cc.chance : 100;
      const victims = /^all[A-Z]/.test(a.target || '') ? alive : [p];
      let harm = 0, deadly = false;
      for (const v of victims) {
        let d = a.kind === 'phys' ? C.physBase(t.stat('atk'), t.level || 1) * (a.power || 16) / 16 * (512 - Math.min(511, v.stat('def'))) / 512
          : (a.power || 8) * (512 - Math.min(511, v.stat('mdf'))) * C.magBase(t.stat('mat'), t.level || 1) / (16 * 512);
        const ei = C.elemInfo(v, [].concat(a.element || [])); if (ei.immune || ei.absorb) continue;
        d *= (ei.mult || 1) * (a.hits || 1);
        if (v.has(a.kind === 'mag' ? 'mbarrier' : 'barrier')) d /= 2;
        harm += d * chance / 100;
        if (chance >= 34 && (d >= v.hp || d > v.maxHp * 0.4)) deadly = true;
      }
      return { harm, deadly };
    };
    // MP's price in HP of damage: the runner sets it per battle (R.mpFactor: cheap near a rest point or
    // against a dangerous enemy, dear on a long dungeon walk); on its own, cheap for bosses only
    const mpPrice = (mp) => mp * (mem.mpFactor != null ? mem.mpFactor : boss ? 1.5 : 6);
    const opts = [];
    for (const t of aim) { const v = value(phys(t), t); opts.push({ score: v > 0 ? v * counterFactor(t, 'phys') : v, countered: wouldCounter(t, 'phys'), act: { actor: p, type: 'attack', targets: [t], side: 'enemy' } }); }
    const spare = p.mp - reserve;
    for (const sp of spellList) {
      if (sp.d.kind !== 'damage' || sp.mp > spare) continue;
      for (const t of aim) { const d = mag(sp.d, t, false); if (d > 0) opts.push({ score: value(d, t) * counterFactor(t, 'mag') - mpPrice(sp.mp), countered: wouldCounter(t, 'mag'), act: { actor: p, type: 'magic', id: sp.id, targets: [t], side: 'enemy' } }); }
      if (sp.allLeft > 0 && foes.length > 1 && !noAll) {
        let sum = 0, bad = false; for (const t of foes) { const d = mag(sp.d, t, true); if (d < 0) bad = true; sum += value(Math.max(0, d), t); }
        if (!bad) opts.push({ score: sum - mpPrice(sp.mp), all: sp, act: null });
      }
    }
    // Enemy Skills: damage (Flame Thrower, Matra Magic, Beta, Aqualung, Trine, Magic Breath...), Laser
    // (half the target's HP; not on what gravity can't touch), L5 Death on the foes whose level is a multiple of 5
    for (const e of wild ? [] : eskList) {
      if (e.mp > spare && !boss) continue;
      const d = e.d;
      if (d.kind === 'damage') {
        if (/^all[A-Z]/.test(d.target)) { if (noAll) continue; let sum = 0, bad = false; for (const t of foes) { const v = mag(d, t, false); if (v < 0) bad = true; sum += value(Math.max(0, v), t); } if (!bad && sum > 0) opts.push({ score: sum - mpPrice(e.mp), act: esk(e, foes, 'enemy', true) }); }
        else for (const t of aim) { const v = mag(d, t, false); if (v > 0) opts.push({ score: value(v, t) * counterFactor(t, 'mag') - mpPrice(e.mp), countered: wouldCounter(t, 'mag'), act: esk(e, [t], 'enemy') }); }
      } else if (d.kind === 'gravity') {
        for (const t of aim) { const ei = C.elemInfo(t, ['gravity']); if (ei.immune || t.invulnerable || t.immuneTo && t.immuneTo('gravity')) continue; const v = Math.floor(t.hp * (d.pct || 50) / 100); if (v > 0) opts.push({ score: value(v, t) * counterFactor(t, 'mag') - mpPrice(e.mp), countered: wouldCounter(t, 'mag'), act: esk(e, [t], 'enemy') }); }
      } else if (e.id === 'l5_death' && !noAll) {
        const hit = foes.filter(t => !t.boss && (t.level || 1) % 5 === 0 && !(t.immuneTo && t.immuneTo('death')));
        if (hit.length) opts.push({ score: hit.reduce((a, t) => a + t.hp + 400, 0) - mpPrice(e.mp), act: esk(e, foes, 'enemy', true) });
      }
    }
    if (!silenced && !noAll) for (const s of (p.abilities.summons || [])) {
      const d = D.summons[s.id]; if (!d || d.kind !== 'damage' || p.mp - reserve < turboMp(s, d.mp) || (p.summonUses[s.id] || 0) >= s.uses) continue;
      let sum = 0, bad = false; for (const t of foes) { const v = mag(d, t, false); if (v < 0) bad = true; sum += value(Math.max(0, v) * (d.hits || 1), t); }
      if (!bad) opts.push({ score: sum - mpPrice(d.mp), summon: s.id });
    }
    // (the deadly counters: every foe hit that would still stand answers; see counterHarm)
    for (const o of opts) {
      let kind = 'mag', tg = null, d = null, split = false;
      if (o.all) { tg = foes; d = o.all.d; split = true; }
      else if (o.summon) { tg = foes; d = D.summons[o.summon]; }
      else if (o.act && o.act.side === 'enemy') { tg = o.act.targets || []; if (o.act.type === 'attack') kind = 'phys'; else d = o.act.type === 'magic' ? D.spells[o.act.id] : o.act.type === 'eskill' ? D.eskills[o.act.id] : null; if (d && d.phys) kind = 'phys'; }
      if (!tg || !tg.length) continue;
      const els = kind === 'phys' && !d ? (p.weaponElem || []) : [].concat(d && (d.elements || d.element) || []);
      let harm = 0, deadly = false;
      for (const t of tg) {
        if (!t || !t.alive) continue;
        const dmg = kind === 'phys' && !d ? phys(t) : d && d.kind === 'gravity' ? t.hp * (d.pct || 50) / 100 : d ? mag(Object.assign({}, d, { elements: [].concat(d.elements || d.element || []) }), t, split) * (d.hits || 1) : 0;
        if (dmg >= t.hp * 1.05) continue;                   // (it falls: no answer)
        const r = counterHarm(t, kind, els); harm += r.harm; if (r.deadly) deadly = true;
      }
      if (deadly) { o.deadly = true; o.score -= harm; }
    }
    opts.sort((a, b) => ((b.score > 0 && !b.deadly) - (a.score > 0 && !a.deadly)) || b.score - a.score);
    // ---- 6b. the Item command on the foes (AI.itemOffence): a battle item when it clearly beats the best above
    { let io = null; try { io = AI.itemOffence({ battle, p, foes, aim, alive, allies, boss, mem, wild: noAll, canItem, bestOther: opts[0], value, focus, counterFactor, wouldCounter, counterHarm }); } catch (e) { console.error('item offence', e); } if (io) opts.unshift(io); }
    const best = opts[0];
    // ---- 5. Limit Break: use it when it matters (bosses, or the fight isn't about to end anyway)
    if (!noAll && p.limitGauge >= 255 && p.char && p.char.limitsKnown && p.char.limitsKnown.length && !p.transformed) {
      const totalHp = foes.reduce((a, f) => a + f.hp, 0);
      const learning = AI.limitTeachers(p.char, p.char.limitsKnown.filter(id => D.limits[id] && D.limits[id].level === (p.char.limitLevel || 1))).length > 0;
      const worth = boss || learning || totalHp > (best ? Math.max(1, best.score) : 1) * 2.5;
      const lk = worth ? AI.pickLimit(battle, p) : null;
      if (lk) { p.limitGauge = 0; return lk.act; }
    }
    // every way to hurt a boss is being countered right now (a guard stance): wait it out -
    // top everyone up, or Defend, like a player would while Guard Scorpion's tail is raised
    // Only a counter that depends on the enemy's stance is waited out (Guard Scorpion's tail, the side Air
    // Buster faces: FF7 players hit it from the front), and never more than two turns in a row: an enemy
    // that counters everything always is fought anyway
    mem.waits = mem.waits || {};
    const bt = best && best.act && best.act.targets && best.act.targets[0];
    const stance = !!(bt && bt.vars && Object.keys(bt.vars).length) && !healCounter[bt.uid];
    if (boss && best && best.countered && stance && (mem.waits[p.uid] || 0) < 2 && opts.every(o => o.countered || o.score <= 0)) {
      mem.waits[p.uid] = (mem.waits[p.uid] || 0) + 1;
      const low = alive.filter(x => hurtFrac(x) < 0.85).sort((a, b) => hurtFrac(a) - hurtFrac(b))[0];
      if (low && cures[0] && p.mp > cures[cures.length - 1].mp) return cast(cures[cures.length - 1], [low], 'ally');
      if (low && hurtFrac(low) < 0.6 && inv('potion')) return item('potion', low);
      return { actor: p, type: 'defend' };
    }
    mem.waits[p.uid] = 0;
    if (best && best.score > 0) {
      if (best.all) { p.allUses[best.all.id] = (p.allUses[best.all.id] || 0) + 1; return { actor: p, type: 'magic', id: best.all.id, all: true, useAll: true, targets: foes, side: 'enemy' }; }
      if (best.summon) { p.summonUses[best.summon] = (p.summonUses[best.summon] || 0) + 1; return { actor: p, type: 'summon', id: best.summon, all: true, side: 'enemy', targets: foes }; }
      if (best.onUse) best.onUse();
      return best.act;
    }
    // nothing can hurt them: heal whoever is below full, else Defend
    const low = alive.filter(x => hurtFrac(x) < 0.8).sort((a, b) => hurtFrac(a) - hurtFrac(b))[0];
    if (low && cures[0]) return cast(cures[cures.length - 1], [low], 'ally');
    return { actor: p, type: 'defend' };
  };

  // Automatic actions for party members who can't be controlled
  AI.partyAuto = function (battle, p) {
    if (p.transformed) {
      const form = p.transformed;
      const list = form.attacks || [];
      const pickA = list.length ? U.pick(list) : { name: 'Attack', kind: 'phys', power: 16, target: 'enemy' };
      const ab = Object.assign({ src: 'limit', id: 'form', kind: pickA.kind || 'phys', power: pickA.power || 24, target: pickA.target || 'enemy' }, pickA);
      const foes = battle.enemies.filter(x => x.targetable);
      return { actor: p, type: 'enemy', ab, id: 'form', all: ab.target === 'allEnemies', targets: ab.target === 'allEnemies' ? foes : [U.pick(foes)], side: 'enemy' };
    }
    if (p.has('berserk')) { const foes = battle.enemies.filter(x => x.targetable); return { actor: p, type: 'attack', targets: [U.pick(foes)], side: 'enemy' }; }
    if (p.has('confusion')) {
      const all = battle.party.concat(battle.enemies).filter(x => x.targetable && x !== p);
      const t = U.pick(all);
      return { actor: p, type: 'attack', targets: [t], side: t && t.isParty ? 'ally' : 'enemy' };
    }
    return null;
  };
})();
