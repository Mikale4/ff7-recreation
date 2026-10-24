// The persistent game state (everything that is saved), plus helpers to create it.
(function () {
  const U = FF7.util;

  FF7.defaultConfig = () => ({
    atb: 'recommended',
    autoBattle: false,         // Auto battle command: AI plays the party until turned off (W in battle)
    alwaysRun: false,          // Config > Run: Always (then holding C walks)
    battleSpeed: 0.5,          // 0 (slow) .. 1 (fast)
    battleMsgSpeed: 0.5,
    fieldMsgSpeed: 0.6,
    windowColors: ['#0058b0', '#000080', '#000050', '#002040'],
    musicVol: 0.7,
    sfxVol: 0.8,
    cursor: 'initial',         // 'initial' | 'memory'
    exitMarkers: true,         // show red exit triangles in fields
    encounters: 'normal',      // 'normal' | 'half' | 'off' (debug/accessibility)
    // quality-of-life options (js/ui/qol.js; not in the PS1 game)
    fastForward: true,         // the ` key: 1x / 2x / 4x / 8x
    autosave: true,            // an Autosave file of its own, written on each new map
    hints: true,               // the main menu's next objective and the treasure left on this map
    limitProgress: true,       // the Limit screen: how close each unlearned limit is
    senseDetails: true,        // Sense also shows the enemy's weaknesses, absorptions and immunities
    chocoboDetails: false,     // the stall cards show each chocobo's hidden limits and what it needs next (off: FF7's own cards)
    avalancheScenes: true,     // Jessie in the party through Reactor 1; the Sector 7 pillar's last stand (Biggs, Wedge, Jessie)
    turksJoin: true,           // Disc 3: Reno, Rude and Elena can join (only if the party beat them in the Sector 8 underground)
    flashbacks: true,          // playable flashbacks: Corel burning (young Barret and Dyne), Zack's last stand
    caitHideout: true,         // Cait Sith's hideout behind Wonder Square's fortune booth (js/maps/extra/cait_hideout.js)
  });

  // Settings are shared by every file (Config on the title screen or in the menu): kept per browser (localStorage
  // ff7js_config). New games start with them and loading a file applies them. The Demo's own settings are never
  // kept (js/runner: R.applyConfig), and Auto battle stays with each file.
  const PREFS = 'ff7js_config';
  FF7.prefs = {
    get() { try { return JSON.parse(localStorage.getItem(PREFS) || 'null'); } catch (e) { return null; } },
    save(c) {
      if (!c || (FF7.runner && FF7.runner.active)) return;
      const o = Object.assign({}, c); delete o.autoBattle;
      try { localStorage.setItem(PREFS, JSON.stringify(o)); } catch (e) { /* this session keeps them anyway */ }
    },
    apply(c) { const p = FF7.prefs.get(); if (p && c) for (const k in p) if (k in c && k !== 'autoBattle') c[k] = p[k]; return c; },
  };

  FF7.newState = function () {
    const st = {
      version: FF7.VERSION,
      chars: {},
      party: ['cloud', null, null],
      members: ['cloud'],
      locked: ['cloud'],
      items: [],
      keyItems: [],
      away: [],            // members away for now: still members, but off the party and the PHS (js/systems/party.js P.away)
      materia: [],               // unequipped materia stock
      gil: 0,
      flags: {},
      vars: {},
      loc: { mode: 'field', map: null, x: 0, y: 0, dir: 'down' },
      world: { x: 0, y: 0, vehicle: null, vehicles: {} },
      time: 0,
      steps: 0,
      battles: 0,
      escapes: 0,
      disc: 1,
      config: FF7.prefs.apply(FF7.defaultConfig()),
      phsEnabled: false,
      menuEnabled: true,
      timer: null,               // story countdown { t, label }
      gp: 0, bp: 0,              // Gold Saucer points
      mapVisits: {},
    };
    return st;
  };

  // Create a character instance at its base level (L1 / L6 for Cloud).
  FF7.makeChar = function (id) {
    const def = FF7.data.characters[id];
    if (!def) throw new Error('Unknown character ' + id);
    const b = def.base;
    const c = {
      id, name: def.name,
      level: b.level, xp: b.xp,
      hp: b.hp, mp: b.mp, maxHpBase: b.hp, maxMpBase: b.mp,
      stats: { str: b.str, vit: b.vit, mag: b.mag, spr: b.spr, dex: b.dex, lck: b.lck },
      bonus: { str: 0, vit: 0, mag: 0, spr: 0, dex: 0, lck: 0 },   // from sources
      weapon: def.weapon, armor: def.armor, accessory: def.accessory,
      weaponMateria: [], armorMateria: [],
      limitLevel: 1,
      limitsKnown: def.limit ? [def.limit] : [],
      limitUses: {},
      kills: 0,
      limitGauge: 0,
      row: def.defaultRow || 'front',
      status: {},                // persistent statuses (fury/sadness)
    };
    FF7.sys.stats.fitMateriaSlots(c);
    (def.weaponMateria || []).forEach((m, i) => { if (m && i < c.weaponMateria.length) c.weaponMateria[i] = FF7.sys.materia.make(m, id === 'sephiroth' ? 20000 : 0); });
    (def.armorMateria || []).forEach((m, i) => { if (m && i < c.armorMateria.length) c.armorMateria[i] = FF7.sys.materia.make(m); });
    FF7.sys.stats.recalc(c);
    c.hp = c.maxHp; c.mp = c.maxMp;
    return c;
  };
})();

// Hidden "date" affection (Gold Saucer date in C8). Chapters record it in vars
// aff_<id> / date_<id> / affection_<id>; this sums them on top of FF7's starting values
// (Aeris 50, Tifa 30, Yuffie 10, Barret 0: Terence's Date Guide). Every event: docs/DATE_POINTS.md.
FF7.story = FF7.story || {};
FF7.story.affection = function (id) {
  const v = FF7.state.vars, base = { aeris: 50, tifa: 30, yuffie: 10, barret: 0 };
  return (base[id] || 0) + (v['aff_' + id] || 0) + (v['date_' + id] || 0) + (v['affection_' + id] || 0);
};
// Apply one answer's date points: FF7.story.datePts(s, { aeris: 3, tifa: -3 }) -> vars aff_<id>.
// A question passes the same table to s.ask as { date: [pointsOfAnswer0, pointsOfAnswer1, ...] } so the
// runner can answer it for its date target (js/runner/runner.js R.pickChoice), e.g.
//   const DP = [{ tifa: 5 }, { barret: 5 }];
//   const c = yield s.ask('cloud', '', ["Here. It's for you.", "It's for Marlene."], { date: DP });
//   FF7.story.datePts(s, DP[c]);
FF7.story.datePts = function (s, d) {
  if (d) for (const id in d) if (d[id]) s.inc('aff_' + id, d[id]);
};
// Who asks Cloud out: highest affection (FF7 tie-break order Aeris > Tifa > Yuffie > Barret);
// Aeris/Yuffie only if they are in the group, Aeris never after her death.
FF7.story.dateWith = function () {
  const st = FF7.state, ok = id => st.members.includes(id) && !(id === 'aeris' && st.flags.aeris_dead);
  return ['aeris', 'tifa', 'yuffie', 'barret'].filter(ok).sort((a, b) => FF7.story.affection(b) - FF7.story.affection(a))[0] || 'barret';
};
