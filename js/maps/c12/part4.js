// Chapter 12a (part 4) — Gold Saucer extras (patches of C6a's gs_* maps).
//  * Battle Square: the full 8-battle series (10 GP) with the handicap roulette (simplified: pick
//    one of three reel symbols, with a chance to slip onto the next; every handicap is applied and kept for
//    the rest of the series, see applyHandicap), the arena's stronger monsters, BP per round from the Gold
//    Saucer FAQ table, the enemy groups A/B of each period (buggy / Tiny Bronco / Highwind), the
//    prize exchange list of the current period (Omnislash, W-Summon, ...), Sprint Shoes for the
//    first full clear, and the Special Battle (Cloud alone; needs Omnislash learned, W-Summon and
//    the Ultima Weapon) with Final Attack as first-clear prize.
//  * Wonder Square: the ???? prizes of disc 2/3 (Gil Plus 1000 GP, EXP Plus 2000 GP, once each),
//    Snowboard (disc 2) and Torpedo Attack (after the submarine) machines with their prizes.
//  * Speed Square: disc 2/3 shooting coaster whose 5000+ grand prize is the Flayer.
//  * Station Square: the GP salesman (after the Highwind, ~15% of visits; 100 gil per GP, 100 max).
//  * Round Square: the gondola for 10 GP on disc 2/3.
// Flags: c12a_arena_clear, c12a_sprint_shoes, c12a_special_clear, c12a_gs_gilplus, c12a_gs_expplus,
//        c12a_snow_a/b/c, c12a_torpedo_0..4, c12a_flayer.
(function () {
  const L = FF7.story.c12aLib;
  const STAFF = { base: 'woman', top: '#e04090', sleeve: '#e04090', bottom: '#e04090', hair: '#f0d040', hairStyle: 'bun', skirt: 'short' };
  const HOST = { base: 'man', top: '#d0a020', sleeve: '#d0a020', bottom: '#202028', hair: '#202020', hairStyle: 'slick', extras: ['bowtie', 'suit'] };
  const score = (r, win, lose) => (typeof r === 'number' ? r : (r && typeof r === 'object' && typeof r.score === 'number' ? r.score : (r ? win : lose)));
  function* payGil(s, who, n) {
    if (s.takeGil(n)) return true;
    yield s.say(who, `Sorry, it's ${n} gil to play.`);
    return false;
  }
  function* gp(s, n) { if (n <= 0) return; s.giveGp(n); s.sfx('found'); yield s.msg(`Received ${n} GP!`); }

  // ================================================================== Battle Square
  // 'a*2,b' -> ['a','a','b']
  const F = (str) => str.split(',').reduce((out, t) => { const [id, n] = t.trim().split('*'); for (let i = 0; i < (+n || 1); i++) out.push(id); return out; }, []);
  const G = (...rounds) => rounds.map(r => r.map(F));
  // Gold Saucer FAQ {M1.3}: four possible groups per battle; the 8th battle is shared by A and B.
  const LAST_BUGGY = ['hell_rider_vr2', 'grangalan', 'bagnadrana*2', 'harpy'];
  const LAST_BRONCO = ['ghirofelgo', 'ying,yang', 'zuu', 'dragon'];
  const LAST_HIGHWIND = ['serpent', 'sea_worm', 'ho_chu', 'ghost_ship'];
  const ARENA = {
    buggy: {
      A: G(['mono_drive*2', 'grunt*2', 'grunt*3', 'guard_hound'], ['blugu*3', 'hedgehog_pie*2', 'whole_eater*2', 'sahagin*2,ceasar'],
        ['cripshay*2,deenglow', 'ghost*3', 'ghost*2,deenglow', 'eligor'], ['sword_dance*2', 'moth_slasher', 'brain_pod*2', 'vargid_police,zenene'],
        ['devil_ride', 'kalm_fang*3', 'levrikon*3', 'elfadunk*2'], ['madouge*2', 'castanets*3', 'crawler*3,ark_dragon', 'crawler*5'],
        ['nerosuferoth*2', 'zemzelett', 'capparwire*5', 'beach_plug*4'], LAST_BUGGY),
      B: G(['guard_hound*2', 'grashtrike', 'chuse_tank*2', 'grashtrike*3'], ['hedgehog_pie*3', 'whole_eater,hedgehog_pie*2', 'ceasar*3', 'sweeper'],
        ['deenglow*2', 'deenglow*3', 'aero_combatant*2', 'eligor'], ['sword_dance', 'sword_dance*3', 'moth_slasher*2', 'brain_pod'],
        ['custom_sweeper*2', 'levrikon,mu*2', 'levrikon,elfadunk*2', 'levrikon*2'], ['madouge*2,crawler*3', 'castanets*4', 'castanets*2,ark_dragon,crawler', 'scrutin_eye*4'],
        ['nerosuferoth*2,formula', 'formula*2', 'zemzelett', 'nerosuferoth,capparwire*2'], LAST_BUGGY),
    },
    bronco: {
      A: G(['bullmotor', 'bullmotor*2', 'spencer*2', 'flapbeat*4'], ['grand_horn', 'gagighandi*2', 'grand_horn*2', 'crown_lance'],
        ['kimara_bug', 'flower_prong', 'heavy_tank', 'gagighandi,touch_me*2'], ['bagrisk*3', 'griffin', 'golem', 'desert_sahagin*2'],
        ['skeeskee*3', 'heg*4', 'sneaky_step*3', 'gi_spector*2'], ['bahba_velamyu*2', 'battery_cap*6', 'nibel_wolf*3', 'nibel_wolf*2,velcher_task'],
        ['black_bat*4', 'sonic_speed,kyuvilduns*2', 'twin_brain*3', 'screamer*2,twin_brain'], LAST_BRONCO),
      B: G(['joker*2', 'flapbeat', 'flapbeat*2', 'spencer*3,flapbeat'], ['gagighandi*3', 'gagighandi*2', 'needle_kiss*3', 'needle_kiss,search_crown,bagnadrana'],
        ['touch_me', 'kimara_bug*2', 'flower_prong', 'heavy_tank'], ['griffin', 'desert_sahagin*2', 'skeeskee*2,griffin', 'crown_lance*2'],
        ['heg*2,sneaky_step', 'heg*5', 'sneaky_step,heg*3', 'gi_spector*3'], ['battery_cap*4,valron', 'velcher_task*2', 'valron*3', 'bahba_velamyu*2'],
        ['black_bat*3', 'kyuvilduns*3', 'sonic_speed*3', 'kyuvilduns*5'], LAST_BRONCO),
    },
    highwind: {
      A: G(['razor_weed*3', 'jayjujayme*2,bizarre_bug', 'foulander*2', 'foulander*3'], ['adamantaimai', 'under_lizard*2', 'tonadu', 'kelzmelzer*2'],
        ['doorbull', 'ancient_dragon*3', 'toxic_frog*3,jemnezmy', '8_eye*2'], ['vlakorados', 'trickplay*2', 'boundfat,malldancer*3', 'acrophies'],
        ['shred*3', 'lessaloploth*2', 'magnade', 'jumping*3'], ['stilva', 'cuahl,headbomber*2', 'gremlin*2,sculpture', 'ironite,wind_wing*2'],
        ['malboro', 'blue_dragon', 'gigas', 'dragon_rider'], LAST_HIGHWIND),
      B: G(['garuda*2', 'jayjujayme*2,garuda', 'garuda*3', 'dual_horn*2'], ['bizarre_bug*2,tail_vault', 'under_lizard', 'tonadu', 'slaps*5'],
        ['doorbull', 'ancient_dragon*2', 'toxic_frog*2,jemnezmy', '8_eye*2'], ['trickplay,boundfat*2', 'jumping*2', 'ice_golem*2', 'hippogriff'],
        ['frozen_nail*2', 'shred*2,frozen_nail', 'lessaloploth', 'snow,lessaloploth'], ['headbomber*3', 'headbomber*2,zolokalter', 'evilhead*3', 'cuahl*2'],
        ['gremlin*3', 'wind_wing*2', 'ironite*2', 'tonberry'], LAST_HIGHWIND),
    },
  };
  const SPECIAL = ['sea_worm', 'ho_chu', 'unknown_3', 'serpent', 'wolfmeister', 'behemoth', 'maximum_kimaira', 'proud_clod'].map(id => [id]);
  const PERIOD = (s) => s.flag('has_highwind') ? 'highwind' : s.flag('has_bronco') ? 'bronco' : 'buggy';
  // Prize exchange lists per period (Gold Saucer FAQ). 'm:' = materia.
  const EXCHANGE = {
    buggy: [['potion', 80], ['phoenix_down', 160], ['shrapnel', 320], ['ether', 640], ['mimett_greens', 1280], ['fury_ring', 2560], ['m:enemy_lure', 5120], ['m:pre_emptive', 10240], ['m:speed_plus', 20480], ['champion_belt', 40960]],
    bronco: [['phoenix_down', 100], ['remedy', 200], ['mimett_greens', 400], ['m:enemy_lure', 800], ['bird_wing', 1600], ['s_mine', 3200], ['m:pre_emptive', 6400], ['m:speed_plus', 12800], ['champion_belt', 25600], ['omnislash', 51200]],
    highwind: [['remedy', 100], ['m:enemy_lure', 250], ['right_arm', 500], ['m:pre_emptive', 1000], ['reagan_greens', 2000], ['m:speed_plus', 4000], ['stardust', 8000], ['champion_belt', 16000], ['omnislash', 32000], ['m:w_summon', 64000]],
  };
  // Handicaps: BP added when the handicap is drawn before battle 2..8 (Gold Saucer FAQ table,
  // gaps filled in between the known values).
  const HANDICAPS = [
    { id: 'down5', name: 'Level down (small)', bp: [5, 8, 13, 28, 64, 160, 520] },
    { id: 'down10', name: 'Level down (big)', bp: [9, 16, 28, 53, 118, 308, 968] },
    { id: 'half_hpmp', name: '1/2 HP & MP', bp: [16, 26, 43, 94, 244, 775, 3134] },
    { id: 'half_hp', name: '1/2 HP', bp: [13, 22, 40, 84, 204, 591, 2200] },
    { id: 'half_mp', name: '1/2 MP', bp: [12, 20, 36, 73, 173, 485, 1800] },
    { id: 'zero_mp', name: '0 MP', bp: [11, 18, 33, 70, 171, 502, 1855] },
    { id: 'lucky7', name: 'Lucky 7 (no handicap)', bp: [7, 7, 7, 7, 7, 7, 7] },
    { id: 'cure', name: 'Cure (full recovery)', bp: [1, 1, 1, 1, 1, 1, 1] },
    { id: 'frog', name: 'Frog', bp: [6, 10, 19, 44, 130, 520, 3069] },
    { id: 'mini', name: 'Mini', bp: [5, 8, 16, 36, 108, 453, 2940] },
    { id: 'no_item', name: 'Item command sealed', bp: [13, 23, 91, 118, 355, 1368, 7201] },
    { id: 'poison', name: 'Poison', bp: [4, 6, 10, 16, 33, 82, 250] },
    { id: 'time30', name: 'Time x30 damage', bp: [8, 15, 26, 54, 130, 379, 1401] },
    { id: 'half_speed', name: '1/2 Speed', bp: [5, 7, 12, 19, 45, 130, 450] },
    { id: 'no_weapon', name: 'Weapon broken', bp: [15, 27, 57, 140, 420, 1602, 8246] },
    { id: 'no_armor', name: 'Armor broken', bp: [9, 17, 33, 80, 220, 654, 2600] },
    { id: 'no_accessory', name: 'Accessory broken', bp: [10, 18, 35, 84, 248, 953, 3500] },
    { id: 'no_red', name: 'Summon materia broken', bp: [10, 18, 37, 90, 270, 1000, 4000] },
    { id: 'no_yellow', name: 'Command materia broken', bp: [5, 8, 17, 41, 120, 450, 1800] },
    { id: 'no_blue', name: 'Support materia broken', bp: [10, 18, 37, 91, 281, 1100, 4400] },
    { id: 'no_green', name: 'Magic materia broken', bp: [15, 28, 60, 145, 445, 1775, 9425] },
    { id: 'no_purple', name: 'Independent materia broken', bp: [11, 20, 45, 99, 311, 1196, 6645] },
    { id: 'no_materia', name: 'All materia broken', bp: [20, 35, 59, 190, 463, 1866, 10000] },
  ];
  const fighters = () => (FF7.state.party || []).filter(Boolean).map(id => FF7.state.chars[id]).filter(Boolean);
  // Handicaps (Battle Arena FAQ "What they do", Gold Saucer FAQ table): each one drawn stays in force for the
  // rest of the series, and they stack. Level down 5 / 10 (the level used in battle), 1/2 Max HP, 1/2 Max MP,
  // 1/2 both, 0 MP (current MP emptied), Cure (full recovery), Frog / Mini / Poison (cast at the next battle's
  // start: a Ribbon and the like shrug them off), Item command sealed, Time x30 (game hours x 30 damage),
  // 1/2 Speed (Slow: Haste undoes it), Weapon / Armor (with its elemental and status defence) / Accessory
  // broken, and Summon / Command / Support / Magic / Independent / All materia broken (as if unequipped).
  // Between rounds each fighter keeps HP, MP and the battle-long statuses (the FAQ: a Haste cast in round 1
  // fills the time meter faster "for all the upcoming battles as well").
  const MAT_BREAK = { no_red: 'summon', no_yellow: 'command', no_blue: 'support', no_green: 'magic', no_purple: 'independent' };
  const EQUIP_BREAK = { no_weapon: 'weapon', no_armor: 'armor', no_accessory: 'accessory' };
  const CARRY = ['haste', 'slow', 'poison', 'frog', 'small', 'silence', 'darkness', 'berserk', 'reflect'];
  const newHandicaps = () => ({ lvDown: 0, halfHp: false, halfMp: false, noItem: false, mat: new Set(), equip: new Set(), pending: [], carry: {}, drawn: [] });
  function applyHandicap(h, hc) {
    if (h.id === 'down5') hc.lvDown += 5;
    if (h.id === 'down10') hc.lvDown += 10;
    if (h.id === 'half_hp' || h.id === 'half_hpmp') hc.halfHp = true;
    if (h.id === 'half_mp' || h.id === 'half_hpmp') hc.halfMp = true;
    if (h.id === 'no_item') hc.noItem = true;
    if (MAT_BREAK[h.id]) hc.mat.add(MAT_BREAK[h.id]);
    if (h.id === 'no_materia') Object.values(MAT_BREAK).forEach(t => hc.mat.add(t));
    if (EQUIP_BREAK[h.id]) hc.equip.add(EQUIP_BREAK[h.id]);
    if (h.id === 'frog' || h.id === 'mini' || h.id === 'poison') hc.pending.push(h.id === 'mini' ? 'small' : h.id);
    if (h.id === 'half_speed') hc.pending.push('slow');
    fighters().forEach(c => {
      if (h.id === 'cure' && c.hp > 0) { c.hp = c.maxHp; c.mp = c.maxMp; hc.carry[c.id] = (hc.carry[c.id] || []).filter(x => x === 'haste'); }
      if (h.id === 'zero_mp') c.mp = 0;
      if (h.id === 'time30' && c.hp > 0) c.hp = Math.max(1, c.hp - Math.floor((FF7.state.time || 0) / 3600) * 30);
    });
  }
  // One round with the handicaps in force: the broken equipment and materia are left out while the fighters are
  // set up (the battle reads them once, when it starts), then everything is put back as it was
  function arenaBattle(s, e, hc) {
    const ST = FF7.sys.stats, D = FF7.data.materia;
    const orig = { weapon: ST.weapon, armor: ST.armor, accessory: ST.accessory };
    const off = [];
    if (hc.equip.has('weapon')) ST.weapon = (c) => { const d = orig.weapon(c); return d ? { name: d.name, slots: d.slots, links: d.links, growth: d.growth, hit: d.hit, longRange: d.longRange, atk: 0 } : d; };
    if (hc.equip.has('armor')) ST.armor = (c) => { const d = orig.armor(c); return d ? { name: d.name, slots: d.slots, links: d.links, growth: d.growth, def: 0, mdef: 0, defPct: 0, mdefPct: 0 } : d; };
    if (hc.equip.has('accessory')) ST.accessory = () => null;
    let w;
    try {
      if (hc.mat.size) fighters().forEach(c => ['weaponMateria', 'armorMateria'].forEach(k => (c[k] || []).forEach((m, i) => {
        const d = m && D[m.id]; if (d && hc.mat.has(d.type)) { off.push([c, k, i, m]); c[k][i] = null; }
      })));
      w = s.battle({ formation: { e }, bg: 'goldsaucer', music: 'hurryfaster', canLose: true, noRewards: true });
    } finally {
      Object.assign(ST, orig);
      off.forEach(([c, k, i, m]) => { c[k][i] = m; });
      fighters().forEach(c => ST.recalc(c));
    }
    const bs = FF7.sceneMgr.top();
    if (bs && bs.isBattle) {
      bs.party.forEach(p => {
        p.eskillMateria = [];                                 // (no Enemy Skills are learned in the arena)
        if (hc.lvDown) p.level = Math.max(1, p.level - hc.lvDown);
        if (hc.halfHp) { p.maxHp = Math.max(1, Math.floor(p.maxHp / 2)); p.hp = Math.min(p.hp, p.maxHp); }
        if (hc.halfMp) { p.maxMp = Math.floor(p.maxMp / 2); p.mp = Math.min(p.mp, p.maxMp); }
        if (hc.noItem && p.abilities) p.abilities.commands = p.abilities.commands.filter(x => x !== 'item' && x !== 'w_item');
        if (p.hp > 0) (hc.carry[p.id] || []).concat(hc.pending).forEach(st => p.addStatus(st));
      });
      hc.pending = [];
      // the arena's monsters: HP x2, Attack and Magic Attack x1.25 (Gold Saucer FAQ / Walkthrough {M1.3})
      bs.enemies.forEach(x => { x.maxHp = x.maxHp * 2; x.hp = x.maxHp; x.atk = Math.floor(x.atk * 1.25); x.mat = Math.floor(x.mat * 1.25); });
    }
    return { w, bs };
  }
  // the battle-long statuses each fighter ends a round with
  function carryOver(bs, hc) {
    if (!bs || !bs.party) return;
    bs.party.forEach(p => { hc.carry[p.id] = p.hp > 0 ? CARRY.filter(st => p.has(st)) : []; });
  }
  // ---------------------------------------------------------------- the handicap reel
  // FF7's slot machine: the round's three handicaps turn past the window; OK stops the reel one symbol past the one
  // showing, and holding Square holds it still (the Battle Arena FAQ's trick: hold it on the symbol before the one
  // you want, then press OK). The handicaps already in force are listed beside it. Each symbol is drawn (the FAQ's
  // icons: a poison bubble, a frog, a small figure, the broken materia's colour, five materia...).
  const MAT_COL = { no_red: '#e04a30', no_yellow: '#e8c830', no_green: '#40c050', no_blue: '#4a86e8', no_purple: '#a462d8' };
  function handicapIcon(c, id, x, y, r) {
    const R = FF7.render;
    const disc = (col, rr = r) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.fill(); };
    const orb = (ox, oy, rr, col) => { const g = c.createRadialGradient(ox - rr * 0.35, oy - rr * 0.35, rr * 0.1, ox, oy, rr); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, col); g.addColorStop(1, FF7.util.shade(col, -0.45)); c.fillStyle = g; c.beginPath(); c.arc(ox, oy, rr, 0, Math.PI * 2); c.fill(); };
    const slash = () => { c.strokeStyle = '#ff3030'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(x - r * 0.62, y + r * 0.62); c.lineTo(x + r * 0.62, y - r * 0.62); c.stroke(); };
    const crack = (ox, oy, rr) => { c.strokeStyle = '#1a1010'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(ox - rr * 0.1, oy - rr); c.lineTo(ox + rr * 0.15, oy - rr * 0.2); c.lineTo(ox - rr * 0.2, oy + rr * 0.25); c.lineTo(ox + rr * 0.1, oy + rr); c.stroke(); };
    const txt = (t, dy, size, col) => R.text(t, x, y + dy, { align: 'center', size: Math.max(6, Math.round(size * r / 24)), color: col || '#ffffff' });
    c.save();
    disc('#1a1e36', r + 2); c.strokeStyle = '#8890c0'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, r + 2, 0, Math.PI * 2); c.stroke();
    if (MAT_COL[id]) { orb(x, y, r * 0.62, MAT_COL[id]); crack(x, y, r * 0.62); }
    else if (id === 'no_materia') { Object.values(MAT_COL).forEach((col, i) => { const a = -Math.PI / 2 + i / 5 * Math.PI * 2; orb(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.28, col); }); slash(); }
    else if (id === 'poison') { [[-0.25, 0.15, 0.32], [0.22, -0.1, 0.26], [0.05, -0.42, 0.16]].forEach(([dx, dy, rr]) => orb(x + dx * r, y + dy * r, rr * r, '#7ad040')); }
    else if (id === 'frog') { disc('#4a9a38', r * 0.6); [-1, 1].forEach(e => { c.fillStyle = '#e8e040'; c.beginPath(); c.arc(x + e * r * 0.3, y - r * 0.4, r * 0.2, 0, Math.PI * 2); c.fill(); c.fillStyle = '#101010'; c.beginPath(); c.arc(x + e * r * 0.3, y - r * 0.4, r * 0.08, 0, Math.PI * 2); c.fill(); }); c.strokeStyle = '#1e3010'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, r * 0.3, 0.3, Math.PI - 0.3); c.stroke(); }
    else if (id === 'mini') { c.fillStyle = '#ffe070'; c.beginPath(); c.arc(x, y - r * 0.2, r * 0.14, 0, Math.PI * 2); c.fill(); c.fillRect(x - r * 0.1, y - r * 0.06, r * 0.2, r * 0.34); txt('▾', -r * 0.9, 12, '#ffe070'); }
    else if (id === 'down5' || id === 'down10') { txt('Lv', -r * 0.3, 15); txt(id === 'down5' ? '−5' : '−10', r * 0.32, 14, '#ff8080'); }
    else if (id === 'half_hp' || id === 'half_mp' || id === 'half_hpmp') { txt('½', -r * 0.22, 20); txt(id === 'half_hp' ? 'HP' : id === 'half_mp' ? 'MP' : 'HP·MP', r * 0.42, 10, '#a0d0ff'); }
    else if (id === 'zero_mp') { txt('0', -r * 0.2, 20); txt('MP', r * 0.45, 10, '#a0d0ff'); }
    else if (id === 'lucky7') txt('7', 0, 26, '#ffd040');
    else if (id === 'cure') { c.fillStyle = '#50e070'; c.fillRect(x - r * 0.14, y - r * 0.5, r * 0.28, r); c.fillRect(x - r * 0.5, y - r * 0.14, r, r * 0.28); }
    else if (id === 'no_item') { c.fillStyle = '#c8a870'; c.beginPath(); c.moveTo(x - r * 0.4, y + r * 0.45); c.lineTo(x + r * 0.4, y + r * 0.45); c.lineTo(x + r * 0.3, y - r * 0.2); c.lineTo(x - r * 0.3, y - r * 0.2); c.fill(); c.fillRect(x - r * 0.12, y - r * 0.4, r * 0.24, r * 0.22); slash(); }
    else if (id === 'time30') { c.strokeStyle = '#e8e8ff'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r * 0.55, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - r * 0.4); c.moveTo(x, y); c.lineTo(x + r * 0.3, y + r * 0.1); c.stroke(); txt('×30', r * 0.72, 10, '#ff9090'); }
    else if (id === 'half_speed') { c.fillStyle = '#e8d8a0'; c.beginPath(); c.moveTo(x - r * 0.4, y - r * 0.5); c.lineTo(x + r * 0.4, y - r * 0.5); c.lineTo(x, y); c.lineTo(x + r * 0.4, y + r * 0.5); c.lineTo(x - r * 0.4, y + r * 0.5); c.lineTo(x, y); c.fill(); }
    else if (id === 'no_weapon') { c.fillStyle = '#d0d8e0'; c.save(); c.translate(x, y); c.rotate(-0.8); c.fillRect(-r * 0.07, -r * 0.6, r * 0.14, r * 0.8); c.fillStyle = '#8a6a3a'; c.fillRect(-r * 0.25, r * 0.2, r * 0.5, r * 0.1); c.fillRect(-r * 0.05, r * 0.3, r * 0.1, r * 0.25); c.restore(); slash(); }
    else if (id === 'no_armor') { c.fillStyle = '#9aa4b0'; c.beginPath(); c.moveTo(x - r * 0.45, y - r * 0.45); c.lineTo(x + r * 0.45, y - r * 0.45); c.lineTo(x + r * 0.4, y + r * 0.1); c.lineTo(x, y + r * 0.55); c.lineTo(x - r * 0.4, y + r * 0.1); c.fill(); slash(); }
    else if (id === 'no_accessory') { c.strokeStyle = '#e8c860'; c.lineWidth = 3; c.beginPath(); c.arc(x, y + r * 0.08, r * 0.38, 0, Math.PI * 2); c.stroke(); orb(x, y - r * 0.36, r * 0.16, '#60c0ff'); slash(); }
    c.restore();
  }
  class HandicapReel {
    constructor(reel, round, inForce) {
      this.modal = true; this.done = false; this.reel = reel; this.round = round; this.inForce = inForce;
      this.choices = reel.map(h => h.name);                     // (the Demo runner reads these: js/runner/runner.js R.onHandicapReel)
      this.question = `Handicap roulette for battle ${round}! Stop the reel!`;
      this.pos = Math.floor(Math.random() * 3); this.t = 0; this.speed = 0.2; this.stopping = false; this.result = null; this.after = 0;
    }
    get shown() { return ((Math.round(this.pos) % 3) + 3) % 3; }   // the symbol in the window
    update(focus) {
      this.t++;
      if (this.result != null) { if (++this.after > 60) this.done = true; return; }
      if (this.stopping) {
        const d = this.target - this.pos;
        this.pos += Math.max(0.012, Math.min(this.speed, d * 0.16));
        if (this.pos >= this.target) { this.pos = this.target; this.result = this.shown; FF7.audio.sfx('ching'); }
        return;
      }
      const held = focus && FF7.input.held('square');
      if (!held) { const before = Math.round(this.pos); this.pos += this.speed; if (Math.round(this.pos) !== before) FF7.audio.sfx('cursor', 0.25); }
      if (focus && this.t > 24 && FF7.input.pressed('ok')) { this.stopping = true; this.target = Math.round(this.pos) + 1; FF7.audio.sfx('confirm'); }
    }
    render() {
      const R = FF7.render, c = R.ctx, cx = 250, cy = 250, CH = 74, bpOf = (h) => h.bp[Math.max(0, Math.min(6, this.round - 2))];
      R.fill('#000', 0.5);
      R.window(90, 64, 320, 62);
      R.text('HANDICAP', cx, 80, { align: 'center', size: 20, color: R.COL.yellow });
      R.text(`before battle ${this.round}`, cx, 104, { align: 'center', size: 13, color: R.COL.gray });
      R.window(90, 136, 320, 228);
      c.save(); c.beginPath(); c.rect(96, 142, 308, 216); c.clip();
      const base = Math.floor(this.pos);
      for (let k = base - 2; k <= base + 2; k++) {
        const y = cy + (k - this.pos) * CH, h = this.reel[((k % 3) + 3) % 3];
        handicapIcon(c, h.id, 142, y, 24);
        R.text(h.name, 180, y - 9, { size: 15 });
        R.text(`+${bpOf(h)} BP`, 180, y + 13, { size: 12, color: R.COL.cyan });
      }
      c.restore();
      // the window the reel stops in
      const lit = this.result != null ? 0.5 + 0.5 * Math.abs(Math.sin(this.after * 0.3)) : 0.9;
      c.save(); c.strokeStyle = `rgba(255,220,90,${lit})`; c.lineWidth = 3; c.strokeRect(100, cy - CH / 2 + 2, 300, CH - 4); c.restore();
      if (this.result == null) R.text(`${FF7.input.label('ok')}: stop the reel      Hold ${FF7.input.label('square')}: hold it`, cx, 384, { align: 'center', size: 13, color: R.COL.gray });
      // the handicaps in force for the rest of the series
      R.window(430, 136, 190, 228);
      R.text('In force', 525, 150, { align: 'center', size: 14, color: R.COL.cyan });
      if (!this.inForce.length) R.text('none yet', 525, 180, { align: 'center', size: 13, color: R.COL.gray });
      this.inForce.slice(-8).forEach((h, i) => { handicapIcon(c, h.id, 456, 184 + i * 22, 9); R.text(h.name, 472, 184 + i * 22 - 7, { size: 11 }); });
    }
  }
  FF7.ui.HandicapReel = HandicapReel;   // (tools / tests)
  FF7.ui.HANDICAPS = HANDICAPS;
  function* roulette(s, round, hc) {
    const pool = HANDICAPS.slice(), reel = [];
    while (reel.length < 3) reel.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    s.sfx('slots');
    const w = FF7.sceneMgr.addWidget(new HandicapReel(reel, round, hc.drawn.slice()));
    yield w;
    const h = reel[w && w.result != null ? w.result : 0];   // (no reel when headless tools stub the UI)
    yield s.msg(`Handicap: ${h.name}!`);
    applyHandicap(h, hc);
    hc.drawn.push(h);
    return h.bp[Math.max(0, Math.min(6, round - 2))];
  }
  const specialOk = (s) => {
    const c = FF7.state.chars.cloud;
    return !!c && (c.limitsKnown || []).includes('omnislash') && s.hasMateria('w_summon') && (c.weapon === 'ultima_weapon' || s.has('ultima_weapon'));
  };
  function* series(s, special) {
    if (!s.takeGp(10)) { yield s.say('c12a_host', 'Entry is 10 GP, champ. Earn some in Wonder Square and come back!'); return; }
    const snap = fighters().map(c => ({ c, hp: c.hp, mp: c.mp, lg: c.limitGauge }));
    let saved = null;
    if (special) { saved = (FF7.state.party || []).slice(); s.party(['cloud']); }
    const hc = newHandicaps();
    const period = PERIOD(s), group = L.chance(0.5) ? 'A' : 'B';
    let bp = 10, cleared = 0, lost = false;
    yield s.say('c12a_host', special ? "Ladies and gentlemen... the SPECIAL BATTLE! One warrior, eight monsters. Let's GO!" : "Ladies and gentlemen, a new challenger enters the arena! Eight battles stand between our hero and glory!");
    for (let round = 1; round <= 8; round++) {
      yield s.caption(`${special ? 'SPECIAL ' : ''}BATTLE ${round}`, { hold: 50, bg: 'rgba(0,0,0,0.7)' });
      const e = special ? SPECIAL[round - 1] : L.pick(ARENA[period][group][round - 1]);
      const fight = arenaBattle(s, e, hc);
      const r = yield fight.w;
      carryOver(fight.bs, hc);
      if (r === 'lose') { lost = true; break; }
      if (r === 'escape') break;          // FF7: escaping (Smoke Bomb, Exit) still pays the BP
      cleared = round;
      if (round === 8) break;
      const k = yield s.ask('Announcer', `Great! You have ${bp} BP.\nWill you keep going?`, ['Of course!', 'No way']);
      if (k !== 0) break;
      bp += yield* roulette(s, round + 1, hc);
    }
    snap.forEach(o => { o.c.hp = o.hp; o.c.mp = o.mp; o.c.limitGauge = o.lg; });
    if (saved) s.party(saved.filter(Boolean));
    if (lost) yield s.say('Announcer', 'Ohhh! The challenger goes down! But what a fight!');
    else if (cleared === 8) { s.music('success'); yield s.say('Announcer', 'All eight battles cleared! What a champion!'); }
    s.giveBp(bp);
    s.sfx('found');
    yield s.msg(`Received ${bp} BP!`);
    if (!special) yield s.give('tissue');
    else yield s.give(L.pick(['combat_diary', 'autograph']));
    if (cleared === 8 && !special) s.set('c12a_arena_clear');
    if (cleared === 8 && special && !s.flag('c12a_special_clear')) {
      s.set('c12a_special_clear');
      yield s.say('c12a_host', "Unbelievable! The first warrior ever to survive the Special Battle! Here's something the boss put aside for a day like this!");
      yield s.giveMateria('final_attack');
    }
    s.music('goldsaucer');
    yield s.say('c12a_host', "Don't forget to trade in your BP before you leave. Walk out that door and they're gone!");
  }
  function* hostTalk(s) {
    if (!s.flag('c12a_host_met')) {
      s.set('c12a_host_met');
      yield s.say('c12a_host', "Welcome to the Battle Arena! Eight battles in a row against the fiercest monsters money can buy!\fWin, and you earn Battle Points. Trade them for prizes at the counter. Keep fighting past each round and the roulette hands you a handicap... but the tougher it is, the more BP you'll earn!");
    }
    const opts = ['Enter the arena (10 GP)'];
    if (specialOk(s)) opts.push('Special Battle (10 GP)');
    opts.push('About handicaps', 'Nothing');
    const k = yield s.ask('c12a_host', `You have ${s.gp()} GP.`, opts);
    const o = opts[k];
    if (o === 'Enter the arena (10 GP)') yield* series(s, false);
    else if (o === 'Special Battle (10 GP)') yield* series(s, true);
    else if (o === 'About handicaps') yield s.say('c12a_host', "Handicaps range from poison and frogs to broken materia and halved HP. Get lucky and you might even draw a Lucky 7—no handicap at all!\fThe nastier the handicap, and the later the round, the more Battle Points it's worth. Round seven and eight are where the big points are!");
  }
  function* exchange(s) {
    const list = EXCHANGE[PERIOD(s)];
    const c = yield s.ask('c12a_bp_clerk', `Prize exchange! You have ${s.bp()} BP.\n(Battle Points vanish when you leave the Battle Square.)`, list.map(([id, bp]) => `${L.itemName(id)} (${bp} BP)`).concat(['Leave']));
    if (c >= list.length) return;
    const [id, cost] = list[c];
    if (!s.takeBp(cost)) { yield s.say('c12a_bp_clerk', "I'm sorry, you don't have enough BP for that one."); return; }
    s.sfx('purchase');
    yield* L.give(s, id);
  }
  function* shoesLady(s) {
    if (s.flag('c12a_sprint_shoes')) { yield s.say('c12a_shoes', 'Come back and fight anytime, champion!'); return; }
    if (!s.flag('c12a_arena_clear')) { yield s.say('c12a_shoes', "Win all eight battles in the arena, and I'll have something special for you!"); return; }
    s.set('c12a_sprint_shoes');
    yield s.say('c12a_shoes', "You beat all eight battles! That was amazing! Here, a little something from the Battle Square staff.");
    yield s.give('sprint_shoes');
  }
  FF7.patchMap('gs_battle', {
    npcs: [
      { id: 'c12a_host', name: 'Arena Host', model: HOST, at: [11, 3], dir: 'down', show: s => s.flag('has_buggy'), talk: hostTalk },
      { id: 'c12a_bp_clerk', name: 'Prize Clerk', model: STAFF, at: [18, 3], dir: 'down', show: s => s.flag('has_buggy'), talk: exchange },
      { id: 'c12a_shoes', name: 'Attendant', model: STAFF, at: [10, 7], dir: 'right', show: s => s.flag('has_buggy'), talk: shoesLady },
    ],
  });

  // ================================================================== Wonder Square
  function* specialPrizes(s) {
    const list = [['m:gil_plus', 1000, 'c12a_gs_gilplus'], ['m:exp_plus', 2000, 'c12a_gs_expplus']].filter(x => !s.flag(x[2]));
    if (!list.length) { yield s.say('c12a_prize2', 'All of our special prizes have found new homes. Thank you!'); return; }
    const c = yield s.ask('c12a_prize2', `Special prizes, one of each! You have ${s.gp()} GP.`, list.map(x => `???? (${x[1]} GP)`).concat(['Leave']));
    if (c >= list.length) return;
    const [id, cost, flag] = list[c];
    if (!s.takeGp(cost)) { yield s.say('c12a_prize2', "Oh dear, that's not enough GP!"); return; }
    s.set(flag);
    s.sfx('purchase');
    yield* L.give(s, id);
  }
  const SNOW = [['A', 'Beginner', 30, 'safety_bit', 'c12a_snow_a'], ['B', 'Expert', 100, 'm:all', 'c12a_snow_b'], ['C', 'Crazy', 300, 'crystal_bangle', 'c12a_snow_c']];
  function* snowboard(s) {
    const c = yield s.ask(null, 'SNOWBOARD — 200 gil. Pick a course!', SNOW.map(x => `Course ${x[0]} (${x[1]})`).concat(['No thanks']));
    if (c >= SNOW.length || !(yield* payGil(s, 'Attendant', 200))) return;
    const [course, , gpPrize, item, flag] = SNOW[c];
    const r = yield s.minigame('snowboard', { mode: 'gold_saucer', course });
    const pts = Math.max(0, Math.min(100, Math.round(score(r, 90, 40))));
    const rank = pts >= 100 ? 'COOL' : pts >= 70 ? 'GOOD' : pts >= 30 ? 'AWFUL' : 'BAD';
    yield s.msg(`Course ${course}: ${pts} points — ${rank}!`);
    if (pts >= 89 && !s.flag(flag)) {
      s.set(flag);
      yield* gp(s, gpPrize);
      yield* L.give(s, item);
    }
  }
  const TORPEDO = [['Undersea Reactor battle', 'ink'], ['Level 1', 't_s_bomb'], ['Level 2', 'dragon_fang'], ['Level 3', 'dragon_scales'], ['Level 4', 'cauldron']];
  function* torpedo(s) {
    const c = yield s.ask(null, 'TORPEDO ATTACK — 200 gil. Sink every enemy sub!', TORPEDO.map(x => x[0]).concat(['No thanks']));
    if (c >= TORPEDO.length || !(yield* payGil(s, 'Attendant', 200))) return;
    const r = yield s.minigame('submarine', { mode: 'torpedo_attack', level: c });
    const won = r === true || !!(r && typeof r === 'object' && (r.won || r.win));
    if (!won) { yield s.msg('Your sub was sunk... Try again!'); return; }
    yield s.msg('All enemy subs destroyed! Mission complete!');
    yield* gp(s, 20);
    if (!s.flag('c12a_torpedo_' + c)) { s.set('c12a_torpedo_' + c); yield s.give(TORPEDO[c][1]); }
  }
  FF7.patchMap('gs_wonder', {
    npcs: [{ id: 'c12a_prize2', name: 'Prize Clerk', model: STAFF, at: [26, 10], dir: 'left', show: s => s.flag('has_highwind'), talk: specialPrizes }],
    objects: [   // (Wonder Square's twin Snowboard and Torpedo Attack cabinets, js/maps/c6a/part3.js)
      { at: [5, 2], if: s => s.flag('disc2'), talk: snowboard }, { at: [6, 2], if: s => s.flag('disc2'), talk: snowboard },
      { at: [13, 2], if: s => s.flag('has_submarine'), talk: torpedo }, { at: [14, 2], if: s => s.flag('has_submarine'), talk: torpedo },
    ],
  });

  // ================================================================== Speed Square (disc 2/3)
  function* coaster(s) {
    const c = yield s.ask('c12a_coaster', `The Shooting Coaster! 10 GP a ride. (You have ${s.gp()} GP.)`, ['Ride', 'No thanks']);
    if (c !== 0) return;
    if (!s.takeGp(10)) { yield s.say('c12a_coaster', "Sorry, the coaster costs 10 GP. You can earn some in Wonder Square!"); return; }
    const r = yield s.minigame('shooting', { mode: 'speed_square' });
    const pts = score(r, 5000, 1000);
    yield s.msg(`Final score: ${pts} points!`);
    if (pts >= 5000 && !s.flag('c6a_umbrella')) { s.set('c6a_umbrella'); yield s.say('c12a_coaster', "A new record! Here's our grand prize!"); yield s.give('umbrella'); }
    else if (pts >= 5000 && !s.flag('c12a_flayer')) { s.set('c12a_flayer'); yield s.say('c12a_coaster', "Over five thousand! Our new grand prize is yours!"); yield s.give('flayer'); }
    else if (pts >= 3000) { yield s.say('c12a_coaster', 'Great shooting! Here\'s a prize!'); yield s.give(L.pick(['masamune_blade', 'masamune_blade', 'super_sweeper', '1_35_soldier'])); }
    else yield s.say('c12a_coaster', 'Nice try! Score over 3,000 for a prize!');
  }
  FF7.patchMap('gs_speed', {
    npcs: [{ id: 'c12a_coaster', name: 'Attendant', model: 'worker7', at: [13, 4], dir: 'down', show: s => s.flag('disc2'), talk: coaster }],
    onLoad: function (s) { if (s.flag('disc2')) s.hide('coaster_man'); },
  });

  // ================================================================== Station Square: GP salesman
  function* gpDude(s) {
    const k = yield s.ask('c12a_gpman', "Psst... hey, you. Need GP? I got GP. 100 gil a point, no questions asked.\fBut I only carry a hundred at a time.", ['10 GP (1,000 gil)', '50 GP (5,000 gil)', '100 GP (10,000 gil)', 'No thanks']);
    if (k > 2) { yield s.say('c12a_gpman', 'Suit yourself.'); return; }
    const n = [10, 50, 100][k];
    if (!s.takeGil(n * 100)) { yield s.say('c12a_gpman', "Come on, pal. No gil, no GP."); return; }
    s.giveGp(n);
    s.sfx('ching');
    yield s.msg(`Received ${n} GP!`);
    yield s.say('c12a_gpman', "Pleasure doin' business. You never saw me.");
    s.hide('c12a_gpman');
  }
  FF7.patchMap('gs_station', {
    npcs: [{ id: 'c12a_gpman', name: 'Shady Man', model: { base: 'man', top: '#3a3a30', sleeve: '#3a3a30', bottom: '#2a2a24', extras: ['coat', 'shades', 'cap'] }, at: [22, 13], dir: 'left',
      show: s => s.flag('has_highwind') && Math.random() < 0.15, talk: gpDude }],
  });

  // ================================================================== Round Square: gondola
  const RIDE_LINES = {
    tifa: "It's so pretty... Hey, Cloud. Do you remember the promise we made at the water tower?\f...Never mind. Just look at the lights.",
    barret: "Hmph. Fancy lights, fancy rides... Marlene'd love this, though. Maybe when this is all over...",
    redxiii: "The city of lights, from above. Humans are strange... but they do make beautiful things.",
    yuffie: "Ugh... it's swaying... why is it SWAYING?! ...Don't look at me!",
    caitsith: "Ah, lovely, ain't it? Makes you forget all your troubles... for a little while, anyway.",
    vincent: "......It has been a long time since I saw anything like this.",
    cid: "Tch. A gondola. Give me a real airship any day. ...Not bad, though. Not bad at all.",
    aeris: "Look, Cloud! The whole park is shining! Let's stay up here a little longer, okay?",
  };
  function* gondola(s) {
    const k = yield s.ask('c12a_gondola', `The gondola tours the whole park! 10 GP a ride. (You have ${s.gp()} GP.)`, ['Ride', 'No thanks']);
    if (k !== 0) return;
    const pals = ['tifa', 'barret', 'redxiii', 'yuffie', 'caitsith', 'vincent', 'cid', 'aeris'].filter(id => s.isMember(id) && !(id === 'aeris' && s.flag('aeris_dead')));
    if (!s.takeGp(10)) { yield s.say('c12a_gondola', "I'm sorry, a ride is 10 GP."); return; }
    let pal = null;
    if (pals.length) pal = pals[yield s.ask('cloud', '(Who should I ride with?)', pals.map(id => s.name(id)))] || pals[0];
    yield s.fadeOut(30);
    s.music('fireworks');
    yield s.caption('The gondola rises slowly over the Gold Saucer...\n\nSpeed Square\'s coaster races past below.\nThe great golden statue of Dio glitters in the searchlights.', { hold: 200, bg: '#080420' });
    yield s.fadeIn(30);
    if (pal) yield s.say(pal, RIDE_LINES[pal] || '......');
    yield s.say('cloud', '......');
    s.music('goldsaucer');
  }
  FF7.patchMap('gs_round', {
    npcs: [{ id: 'c12a_gondola', name: 'Attendant', model: STAFF, at: [15, 2], dir: 'down', show: s => s.flag('disc2'), talk: gondola }],
    onLoad: function (s) { if (s.flag('disc2')) s.hide('gondola_girl'); },
  });
})();
