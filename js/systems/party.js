// Party membership: joining (with FF7 auto-levelling), leaving, active party, PHS.
(function () {
  const U = FF7.util;
  const P = FF7.sys.party = {};

  P.char = (id) => FF7.state.chars[id];
  P.active = () => FF7.state.party.filter(Boolean).map(id => FF7.state.chars[id]).filter(Boolean);
  P.leader = () => P.active()[0];
  P.inParty = (id) => FF7.state.party.includes(id);
  P.isMember = (id) => FF7.state.members.includes(id);

  // a guest (Sephiroth in the flashback; Jessie, Biggs and Wedge in the AVALANCHE scenes): no EXP, no Limit, gear
  // and materia fixed, never on the PHS
  P.isGuest = (id) => !!(FF7.data.characters[id] || {}).guest;
  FF7.isGuest = P.isGuest;
  // a guest joins at `level` (their own curves; once there, never lower) with full HP and MP
  P.joinGuest = function (id, level) {
    const c = P.join(id, { toParty: false });
    if (level) FF7.sys.stats.autoLevel(c, level);
    FF7.sys.stats.recalc(c); c.hp = c.maxHp; c.mp = c.maxMp; c.status = {};
    return c;
  };

  P.avgLevel = function () {
    const lv = FF7.state.members.filter(id => !P.isGuest(id)).map(id => FF7.state.chars[id]).filter(Boolean).map(c => c.level);
    return lv.length ? Math.floor(lv.reduce((a, b) => a + b, 0) / lv.length) : 6;
  };

  // Character joins the roster. opts: { toParty: true, level: n }
  P.join = function (id, opts = {}) {
    const st = FF7.state;
    let c = st.chars[id];
    if (!c) {
      c = st.chars[id] = FF7.makeChar(id);
      const def = FF7.data.characters[id];
      if (id !== 'cloud' && !def.guest) {
        let lvl = opts.level != null ? opts.level : P.avgLevel() + (def.joinOffset || 0);
        if (def.minJoinLevel) lvl = Math.max(lvl, def.minJoinLevel);
        FF7.sys.stats.autoLevel(c, lvl);
      }
    }
    if (!st.members.includes(id)) st.members.push(id);
    if (opts.toParty !== false && !st.party.includes(id)) {
      const slot = st.party.indexOf(null);
      if (slot >= 0) st.party[slot] = id;
    }
    return c;
  };

  // Leave the roster (keeps the character data for rejoining later).
  P.leave = function (id) {
    const st = FF7.state;
    // (a guest's materia, should any have been put on them, comes back to the list: nothing leaves with them)
    const g = P.isGuest(id) && st.chars[id];
    if (g) ['weaponMateria', 'armorMateria'].forEach(k => (g[k] || []).forEach((m, i) => { if (m && !(FF7.data.characters[id][k] || []).length) { st.materia.push(m); g[k][i] = null; } }));
    st.members = st.members.filter(m => m !== id);
    const i = st.party.indexOf(id);
    if (i >= 0) st.party[i] = null;
    P.compact();
  };
  // Away for now (Cait Sith off fixing his fortune machine, js/maps/extra/cait_hideout.js): still a member, so the
  // story's checks hold, but out of the party and off the PHS until P.back(id) brings them back into it
  P.isAway = (id) => (FF7.state.away || []).includes(id);
  P.away = function (id) { const st = FF7.state; st.away = st.away || []; if (!st.away.includes(id)) st.away.push(id); P.bench(id); };
  P.back = function (id) {
    const st = FF7.state; st.away = (st.away || []).filter(x => x !== id);
    if (!st.party.includes(id)) { const slot = st.party.indexOf(null); if (slot >= 0) st.party[slot] = id; }
  };
  // Remove from active party only (still in PHS roster)
  P.bench = function (id) { const i = FF7.state.party.indexOf(id); if (i >= 0) FF7.state.party[i] = null; P.compact(); };
  P.compact = function () {
    const p = FF7.state.party.filter(Boolean);
    while (p.length < 3) p.push(null);
    FF7.state.party = p;
  };
  // Force a party composition (ids must already be members; joins them otherwise)
  P.set = function (ids) {
    ids = ids.slice(0, 3);
    ids.forEach(id => { if (id && !P.isMember(id)) P.join(id, { toParty: false }); });
    while (ids.length < 3) ids.push(null);
    FF7.state.party = ids;
  };

  P.healAll = function (includeReserve = true) {
    const ids = includeReserve ? FF7.state.members : FF7.state.party.filter(Boolean);
    ids.forEach(id => { const c = FF7.state.chars[id]; if (!c) return; FF7.sys.stats.recalc(c); c.hp = c.maxHp; c.mp = c.maxMp; c.status = {}; });
  };

  P.allDead = function () { return P.active().every(c => c.hp <= 0); };

  // Give XP to the roster: party gets full, reserve gets half (FF7 rule).
  P.giveXp = function (xp) {
    const ups = [];
    FF7.state.members.forEach(id => {
      const c = FF7.state.chars[id]; if (!c || P.isGuest(id)) return;
      const inP = FF7.state.party.includes(id);
      if (inP && c.hp <= 0) return;
      const n = FF7.sys.stats.gainXp(c, inP ? xp : Math.floor(xp / 2));
      if (n > 0) ups.push({ id, levels: n });
    });
    return ups;
  };
})();
