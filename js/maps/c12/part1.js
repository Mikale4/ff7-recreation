// Chapter 12a (part 1) — optional content A: shared chocobo library, world-map hooks and the
// Mystery Ninja (Yuffie) recruitment.
//
//  * FF7.story.c12aLib — helpers shared by parts 2-4 (chocobo records, greens, breeding, prizes).
//    Chocobo records live in FF7.state.vars.chocobos (stables, max 6) and FF7.state.vars.chocobo_pen
//    (caught birds waiting in the fence, max 4). A record is a plain object:
//      { id, name, sex, rating, color, dash, mdash, runSp, mRun, stam, accel, intel, coop, personality, rtCount,
//        races (= races won), run (= races run), class ('C'|'B'|'A'|'S'), readyAt, born }
//    plus speed / maxSpeed / stamina, FF7's on-screen values (Dash/34, Stamina/10), kept in step (L.sync).
//  * World hooks (docs/SCRIPTING.md): FF7.world.encounterHooks — Mystery Ninja in forests
//    (left_midgar, !yuffie_joined), wild chocobos on chocobo tracks with Chocobo Lure equipped.
//  * side_ninja_clearing — the forest clearing after the ninja fight (save point trap, menu trap,
//    the answer tree, name entry, Throw materia).
// Vars: chocobos, chocobo_pen, chocobo_color (ridden colour for the world engine), c12a_riding,
//       c12a_stables, c12a_choco_seq. Flags: c12a_ninja_active / _talk / _gone, c12a_ninja_fled.
// Dialogue paraphrased in our own words (docs/SCRIPTING.md).
(function () {
  const L = FF7.story.c12aLib = FF7.story.c12aLib || {};
  const V = () => FF7.state.vars;

  // ================================================================== small utils
  L.rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  L.frnd = (a, b) => a + Math.random() * (b - a);
  L.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  L.chance = (p) => Math.random() < p;
  L.weighted = function (list, key) {
    const k = key || 'w';
    const tot = list.reduce((a, o) => a + (o[k] || 1), 0);
    let r = Math.random() * tot;
    for (const o of list) { r -= (o[k] || 1); if (r < 0) return o; }
    return list[list.length - 1];
  };
  L.battles = () => (FF7.state && FF7.state.battles) || 0;
  L.itemName = (id) => {
    if (id.startsWith('m:')) { const d = FF7.data.materia[id.slice(2)]; return (d ? d.name : id.slice(2)) + ' Materia'; }
    return FF7.util && FF7.util.itemName ? FF7.util.itemName(id) : id;
  };
  // give an item id or 'm:<materia>'
  L.give = function* (s, id, qty) {
    if (id.startsWith('m:')) yield s.giveMateria(id.slice(2));
    else yield s.give(id, qty || 1);
  };
  // Gold Saucer "late" state: the park is open again after the Highwind (disc 2/3)
  L.late = (s) => s.flag('has_highwind');

  // ================================================================== chocobo records
  L.chocobos = () => { const v = V(); if (!Array.isArray(v.chocobos)) v.chocobos = []; v.chocobos.forEach(c => L.norm(c)); return v.chocobos; };
  L.pen = () => { const v = V(); if (!Array.isArray(v.chocobo_pen)) v.chocobo_pen = []; return v.chocobo_pen; };
  L.stables = () => V().c12a_stables || 0;
  L.freeStables = () => Math.max(0, L.stables() - L.chocobos().length);
  L.nextId = () => { const v = V(); v.c12a_choco_seq = (v.c12a_choco_seq || 0) + 1; return v.c12a_choco_seq; };

  // FF7 ratings (world_map.md naming), worst -> best
  L.RATINGS = ['weak', 'poor', 'fair', 'average', 'so-so', 'good', 'great', 'wonderful'];
  L.rank = (r) => Math.max(0, L.RATINGS.indexOf(r));
  L.RATING_NAME = { weak: 'Weak', poor: 'Poor', fair: 'Fair', average: 'Average', 'so-so': 'So-so', good: 'Good', great: 'Great', wonderful: 'Wonderful' };
  // Choco Billy's verdict when he first looks a bird over
  L.RATING_LINE = {
    wonderful: "Whoa... this one's a WONDERFUL chocobo!",
    great: "Now that's a great chocobo!",
    good: "Mmm, this looks like a good chocobo.",
    'so-so': "This one's so-so, I'd say.",
    average: "A pretty average chocobo.",
    fair: "Hmm... not bad, this one.",
    poor: "This one doesn't look too good...",
    weak: "I really wouldn't recommend this one...",
  };
  // ---- stats (Terence / Absolute Steve, references/text/Chocobo_Breeding_Guide.txt [e02]-[e04], [f04]).
  // The raw values are the truth: dash / mdash (1..6000; the Speed shown is dash/34 km/h), runSp / mRun (cruising
  // speed and its cap, hidden), stam (1..9999; shown /10), accel, intel, coop (0..100), personality (0 normal, 1 / 2
  // restless; Pahsana Greens settle it) and rtCount (Pahsana fed). speed / maxSpeed / stamina are the on-screen
  // values, kept in step by L.sync. (`run` stays the count of races run.)
  L.sync = function (c) {
    c.speed = c.dash / 34; c.maxSpeed = c.mdash / 34; c.stamina = c.stam / 10;
    return c;
  };
  // a record from an old save or a Demo profile (on-screen values only): the raw values rebuilt from them
  L.norm = function (c) {
    if (!c || c.dash != null) return c;
    c.mdash = Math.round((c.maxSpeed || 60) * 34); c.dash = Math.min(c.mdash, Math.round((c.speed || 30) * 34));
    c.stam = Math.round((c.stamina || 200) * 10);
    c.mRun = Math.max(300, c.mdash - 300); c.runSp = Math.max(300, Math.min(c.mRun - 1, c.dash - 300));
    c.personality = c.personality || 0; c.rtCount = c.rtCount || 0;
    return L.sync(c);
  };
  // Starting stats per rating when a caught bird moves into a stable: one of eight MDash / Stamina pairs, each
  // then moved Rnd(0..127) up or down; Dash a share of MDash; Run / MRun that far below Dash / MDash; Accel and
  // Intel in steps of 10; Personality; the sex (Terrible birds lean male, Wonderful ones female).
  const PAIRS = {
    wonderful: [[3500, 4500], [3600, 4300], [3700, 4200], [3800, 4000], [3800, 4000], [3900, 4000], [4000, 3800], [4000, 3500]],
    great: [[3000, 3800], [3000, 3600], [3100, 3500], [3200, 3400], [3300, 3300], [3400, 3200], [3500, 3200], [3600, 3000]],
    good: [[2800, 3500], [2800, 3300], [3000, 3200], [3000, 3100], [3100, 3000], [3100, 2900], [3200, 2800], [3300, 2600]],
    'so-so': [[2400, 3300], [2500, 3100], [2600, 3000], [2700, 3000], [2800, 2800], [3000, 2700], [3000, 2600], [3000, 3000]],
    average: [[2000, 2500], [2200, 2300], [2300, 2200], [2400, 2100], [2600, 1900], [2800, 1800], [2500, 2000], [2500, 2000]],
    fair: [[1800, 2000], [1900, 1700], [2100, 1500], [2200, 1300], [2300, 1000], [2000, 1600], [2000, 1600], [2000, 1600]],   // (FF7 "Poor")
    poor: [[1500, 1300], [1600, 1200], [1700, 1100], [1900, 900], [2000, 800], [1800, 1000], [1800, 1000], [1800, 1000]],       // (FF7 "Bad")
    weak: [[1300, 1000], [1400, 900], [1600, 700], [1700, 600], [1800, 500], [1500, 800], [1500, 800], [1500, 800]],             // (FF7 "Terrible")
  };
  const ACC_INT = { wonderful: [[6, 7], [5, 6]], great: [[6, 7], [5, 6]], good: [[5, 6], [3, 4]], 'so-so': [[5, 6], [3, 4]],
    average: [[3, 5], [0, 2]], fair: [[3, 5], [0, 2]], poor: [[2, 5], [0, 2]], weak: [[2, 5], [0, 2]] };
  const P0 = { wonderful: 7 / 8, great: 7 / 8, good: 3 / 4, 'so-so': 3 / 4 };
  const upDown = (v, n) => (L.chance(0.5) ? v + n : v - n);
  L.personality = (rating) => (L.chance(P0[rating] || 1 / 2) ? 0 : L.chance(0.5) ? 1 : 2);
  L.COLORS = ['yellow', 'blue', 'green', 'black', 'gold'];
  L.COLOR_NAME = { yellow: 'Yellow', blue: 'Blue (River)', green: 'Green (Mountain)', black: 'Black (River & Mountain)', gold: 'Gold (Ocean)' };
  L.model = (color) => ({
    yellow: 'chocobo',
    blue: { base: 'chocobo', c1: '#5a9ae8', c2: '#3a6ac0', c3: '#f0a040' },
    green: { base: 'chocobo', c1: '#6ac050', c2: '#3a8a30', c3: '#f0a040' },
    black: 'chocobo_black',
    gold: 'chocobo_gold',
  }[color] || 'chocobo');
  L.classOf = (wins) => (wins >= 9 ? 'S' : wins >= 6 ? 'A' : wins >= 3 ? 'B' : 'C');

  // A freshly moved chocobo. opts: { color, sex }
  L.make = function (rating, opts) {
    const o = opts || {}, pairs = PAIRS[rating] || PAIRS.average, good = L.rank(rating) >= L.rank('so-so');
    const [md, st] = L.pick(pairs);
    const mdash = Math.max(1, Math.min(6000, upDown(md, L.rnd(0, 127)))), stam = Math.max(1, Math.min(9999, upDown(st, L.rnd(0, 127))));
    const dash = Math.floor(mdash / 10) * (good ? L.rnd(5, 8) : Math.floor(L.rnd(0, 255) / 50) + 3);
    const x = 100 * (good ? L.rnd(2, 4) : L.rnd(2, 5));
    const [ac, it] = ACC_INT[rating] || ACC_INT.average;
    const maleOdds = rating === 'weak' ? 134 / 256 : rating === 'wonderful' ? 122 / 256 : 0.5;
    const c = {
      id: L.nextId(), name: '', sex: o.sex || (L.chance(maleOdds) ? 'male' : 'female'), rating, color: o.color || 'yellow',
      mdash, dash: Math.min(dash, mdash), mRun: Math.max(1, mdash - x), runSp: Math.max(1, Math.min(dash, mdash) - x), stam,
      accel: 10 * L.rnd(ac[0], ac[1]), intel: 10 * L.rnd(it[0], it[1]), coop: 0, personality: L.personality(rating), rtCount: 0,
      races: 0, run: 0, class: 'C', born: L.battles(), readyAt: L.battles(),
    };
    return L.sync(c);
  };
  // The Kalm Traveller's gift (Desert Rose): always a Great-rated Gold chocobo, weak on arrival (the guide's stats).
  L.makeKalmGold = function () {
    const c = L.make('great', { color: 'gold' });
    Object.assign(c, { dash: 1000, mdash: 3000, runSp: 500, mRun: 2500, stam: 1000, accel: 60, intel: 30, coop: 0, personality: 0 });
    return L.sync(c);
  };
  L.label = (c) => `${c.name || '???'} ${c.sex === 'male' ? '(M)' : '(F)'} ${c.color === 'yellow' ? '' : c.color + ' '}${c.class}-class, ${c.races} win${c.races === 1 ? '' : 's'}`;
  // what the stall's card shows (FF7 shows Speed and Stamina; the maximums and the rest stay hidden)
  L.stats = (c) => `${c.name}  —  ${L.COLOR_NAME[c.color] || c.color} chocobo, ${c.sex}\n` +
    `Rating: ${L.RATING_NAME[c.rating] || c.rating}    Class: ${c.class}    Wins: ${c.races} / ${c.run || 0} races\n` +
    `Speed ${Math.floor(c.speed)} km/h    Stamina ${Math.floor(c.stamina)}` + (L.detailsOn() ? '\f' + L.details(c) : '');
  L.ready = (c) => L.battles() >= (c.readyAt || 0);
  // Config > Chocobo Details (off by default): what FF7 keeps hidden and the guides spell out - the top speed greens
  // can't pass, a restless streak and the Pahsana Greens that settle it, when it can mate again, the wins to the next
  // class, and the next colour it can lead to (the nut, the partner, the wins that make it certain)
  L.detailsOn = () => !!(FF7.state && FF7.state.config && FF7.state.config.chocoboDetails);
  L.details = function (c) {
    L.norm(c);
    const top = Math.floor(c.maxSpeed), room = Math.max(0, top - Math.floor(c.speed));
    const lines = [`Top speed ${top} km/h: ${room ? room + ' km/h left to gain from greens' : 'reached'}.`];
    lines.push(c.personality ? `Restless: ${SETTLE - (c.rtCount || 0)} more Pahsana Greens will settle it.` : 'Temperament: calm.');
    const wait = (c.readyAt || 0) - L.battles();
    lines.push(wait > 0 ? `Resting: ready to mate after ${wait} more battle${wait === 1 ? '' : 's'}.` : 'Ready to mate.');
    const need = Math.max(1, ({ C: 3, B: 6, A: 9 }[c.class] || 3) - (c.races || 0));
    lines.push(c.class === 'S' ? 'Class S: the top class.' : `Class ${c.class}: ${need} more win${need === 1 ? '' : 's'} to move up.`);
    const w = c.races || 0, gg = c.rating === 'good' || c.rating === 'great';
    const next = {
      yellow: gg ? `Next colour: Blue or Green. Mate it with another Good or Great bird, using a Carob Nut. Certain with 4+ race wins between the two (it has ${w}).`
        : c.rating === 'wonderful' ? `A Wonderful bird is what a Black needs to make a Gold: a Zeio Nut, with the Black picked FIRST. Certain with 12+ race wins between the two (it has ${w}).`
        : 'Only a Good or Great bird can lead to a Blue or Green one.',
      blue: `Next colour: Black. Mate it with a Green, using a Carob Nut. Certain with 9+ race wins between the two (it has ${w}).`,
      green: `Next colour: Black. Mate it with a Blue, using a Carob Nut. Certain with 9+ race wins between the two (it has ${w}).`,
      black: `Next colour: Gold. Mate it with a Wonderful bird, using a Zeio Nut, and pick this Black FIRST. Certain with 12+ race wins between the two (it has ${w}).`,
      gold: 'Gold: it crosses the ocean. There is no colour beyond it.',
    }[c.color];
    return lines.join('\n') + (next ? '\f' + next : '');
  };

  const NAMES = {
    male: ['Wark', 'Kweh', 'Bolt', 'Gale', 'Rex', 'Pecker', 'Talon', 'Dash', 'Blaze', 'Rocky', 'Flint', 'Ace'],
    female: ['Choco', 'Mimi', 'Belle', 'Luna', 'Pippi', 'Fluff', 'Dahlia', 'Sunny', 'Petal', 'Rosa', 'Mocha', 'Ivy'],
  };
  // FF7 lets you name each bird (6 letters). The script API only has a naming screen for party
  // members, so the name is picked from a list.
  L.nameIt = function* (s, who, c) {
    const used = new Set(L.chocobos().map(x => x.name));
    const pool = NAMES[c.sex].filter(n => !used.has(n));
    const opts = [];
    while (opts.length < 4 && pool.length) opts.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    if (!opts.length) opts.push(c.sex === 'male' ? 'Wark' + c.id : 'Choco' + c.id);
    const k = yield s.ask(who, `What should we call this ${c.sex} chocobo?`, opts);
    c.name = opts[k] || opts[0];
    return c.name;
  };

  // ================================================================== greens (stable feeding)
  // FF7's amounts (Absolute Steve, the Breeding guide [e04]), in raw points: 34 Dash make 1 km/h of Speed, 10
  // Stamina make 1 on the card. Dash never passes MDash, Run never MRun. Reagan and Sylkis give a share of what the
  // bird has (Dash/20, /10...) plus or minus up to 10. Pahsana Greens settle a restless bird after a few (rtCount).
  L.GREENS = ['gysahl_greens', 'krakka_greens', 'tantal_greens', 'pahsana_greens', 'curiel_greens', 'mimett_greens', 'reagan_greens', 'sylkis_greens'];
  const SETTLE = 4;   // Pahsana Greens it takes to settle a restless bird's personality
  L.feed = function (c, g) {
    L.norm(c);
    const before = { speed: Math.floor(c.speed), stamina: Math.floor(c.stamina), intel: c.intel, accel: c.accel, personality: c.personality };
    const up = (k, n, cap) => { c[k] = Math.min(cap, c[k] + Math.max(0, Math.floor(n))); };
    const share = (v, d) => { const x = Math.floor(v / d), y = L.rnd(0, 10); return L.chance(0.5) ? x + y : Math.max(0, x - y); };
    const dash = (n) => up('dash', n, c.mdash), run = (n) => up('runSp', n, c.mRun), stam = (n) => up('stam', n, 9999);
    const intel = (n) => up('intel', n, 100), coop = (n) => up('coop', n, 100);
    switch (g) {
      case 'gysahl_greens': dash(L.rnd(0, 3)); run(L.rnd(0, 2)); stam(L.rnd(0, 3)); coop(1); break;
      case 'krakka_greens': intel(L.rnd(1, 2)); coop(1); break;
      case 'tantal_greens': dash(L.rnd(1, 4)); run(L.rnd(1, 4)); stam(L.rnd(1, 2)); intel(1); coop(1); break;
      case 'pahsana_greens':
        intel(L.rnd(1, 8)); coop(L.chance(0.75) ? 2 : 1);
        if (c.personality) { c.rtCount = (c.rtCount || 0) + 1; if (c.rtCount >= SETTLE) { c.personality = 0; c.rtCount = 0; } }
        break;
      case 'curiel_greens': dash(L.rnd(0, 3)); run(L.rnd(0, 3)); stam(L.rnd(3, 10)); coop(2); break;
      case 'mimett_greens': dash(L.rnd(1, 16)); run(L.rnd(0, 3)); stam(L.rnd(3, 10)); if (L.chance(0.25)) up('accel', 1, 100); coop(2); break;
      case 'reagan_greens': dash(share(c.dash, 20)); run(share(c.runSp, 20)); stam(share(c.stam, 100)); coop(3); break;
      case 'sylkis_greens': dash(share(c.dash, 10)); run(share(c.runSp, 10)); stam(share(c.stam, 50)); intel(L.rnd(1, 4)); coop(4); break;
      default: coop(1);
    }
    L.sync(c);
    const out = [];
    if (Math.floor(c.speed) > before.speed) out.push('speed');
    if (Math.floor(c.stamina) > before.stamina) out.push('stamina');
    if (c.intel > before.intel) out.push('smarts');
    if (c.accel > before.accel) out.push('acceleration');
    if (before.personality && !c.personality) out.push('personality');
    return out;
  };

  // ================================================================== breeding
  L.NUTS = ['pepio_nut', 'luchile_nut', 'saraha_nut', 'lasan_nut', 'pram_nut', 'porov_nut', 'carob_nut', 'zeio_nut'];
  // Mate a (picked FIRST) with b using a nut: FF7's rules per nut (Terence, the Breeding guide [f04]).
  //  * Stats: most nuts average the parents' values; Saraha, Lasan, Pram and Porov may instead scale the first
  //    parent's MDash / MRun / Stamina up or down; Carob and Zeio may take the better parent's up by a tenth; Pepio
  //    and Luchile shave some off (Pepio: a rare MDash bonus). A Black from a Carob Nut gets MDash 4000-4800 when the
  //    parents average under 4000; a Gold from a Zeio Nut MDash 5000-5950 (and MRun +1000 under 4000).
  //  * Colour: Carob - Blue x Green: Black for sure with 9+ wins between them (else 10/256 Black, 128 Blue, 118
  //    Green; rated Great or Good); two Great / Good birds: Blue or Green for sure with 4+ wins (else 46/256 Blue,
  //    44 Green; rated Great if the parents' ratings match, else Great or Good); only the FIRST Great / Good: a
  //    quarter of the time as if both were (rated as the first). Zeio - the Black picked FIRST with a Wonderful: a Gold
  //    (rated Great) with 12+ wins, else 1 in 32 (picked the other way round: never; FF7's own slip). Other nuts: Blue
  //    x Green make a Black 1 time in 4 (Pepio, Luchile, Porov) or 2 (Saraha, Lasan, Pram). Otherwise the colour and
  //    rating are one parent's or the other's.
  L.breed = function (a, b, nut) {
    L.norm(a); L.norm(b);
    const wins = (a.races || 0) + (b.races || 0);
    const gg = (c) => c.rating === 'good' || c.rating === 'great';
    const blueGreen = (a.color === 'blue' && b.color === 'green') || (a.color === 'green' && b.color === 'blue');
    const either = (k) => (L.chance(0.5) ? a[k] : b[k]);
    const avg = (k) => Math.floor((a[k] + b[k]) / 2), hi = (k) => Math.max(a[k], b[k]);
    const R = () => L.rnd(0, 255);
    // ---- colour and rating
    let color = null, rating = null;
    if (nut === 'carob_nut') {
      const bothRule = () => {
        if (wins >= 4) color = L.chance(0.5) ? 'blue' : 'green';
        else { const r = R(); color = r < 46 ? 'blue' : r < 90 ? 'green' : 'yellow'; }
      };
      if (blueGreen) {
        if (wins >= 9) color = 'black';
        else { const r = R(); color = r < 10 ? 'black' : r < 138 ? 'blue' : 'green'; }
        rating = L.chance(0.5) ? 'great' : 'good';
      } else if (gg(a) && gg(b)) {
        bothRule(); rating = a.rating === b.rating ? 'great' : L.chance(0.5) ? 'great' : 'good';
      } else if (gg(a) && L.chance(0.25)) {
        bothRule(); rating = a.rating;
      } else { color = 'yellow'; rating = either('rating'); }
    } else if (nut === 'zeio_nut') {
      if (a.color === 'black' && b.rating === 'wonderful' && (wins >= 12 || L.chance(1 / 32))) { color = 'gold'; rating = 'great'; }
    } else if (blueGreen && L.chance(['saraha_nut', 'lasan_nut', 'pram_nut'].includes(nut) ? 0.5 : 0.25)) color = 'black';
    if (!color) color = either('color');
    if (!rating) rating = either('rating');
    // ---- stats
    const baby = L.make(rating, { color });
    let mdash = avg('mdash'), dash = avg('dash'), mRun = avg('mRun'), runSp = avg('runSp'), stam = avg('stam'), mRunUp = false;
    const firstScaled = (k, table, cap, min) => {   // [[chance/256, factor], ...] on the first parent, else the average
      let r = R();
      for (const [n, f] of table) { if (r < n) return Math.max(min, Math.min(cap, Math.floor(a[k] * f))); r -= n; }
      return avg(k);
    };
    const fix = () => {
      while (dash >= mdash && dash > 100) dash -= 100;
      while (mRun >= mdash && mRun > 100) mRun -= 100;
      while ((runSp >= dash || runSp >= mRun) && runSp > 100) runSp -= 100;
    };
    switch (nut) {
      case 'pepio_nut':
        mdash = Math.max(300, avg('mdash') - 100 * L.rnd(1, 2)); dash = Math.max(300, avg('dash') - 100 * L.rnd(1, 2));
        mRun = Math.max(300, avg('mRun') - 100 * L.rnd(1, 4)); runSp = Math.max(300, avg('runSp') - 100 * L.rnd(1, 2));
        stam = Math.max(1, avg('stam') - R());
        fix();
        if (mdash < 4000 && L.rnd(0, 511) === 0) {
          const r = L.rnd(0, 127), set = r < 1 ? 4000 : r < 2 ? 4100 : r < 4 ? 4200 : r < 7 ? 4300 : r < 8 ? 4500 : 0;
          if (set) { mdash = set; dash = mdash; for (let i = 0; i < 6; i++) dash -= R(); }
        }
        break;
      case 'luchile_nut':
        mdash = Math.max(300, avg('mdash') - (L.chance(0.5) ? R() : 0)); dash = Math.max(300, avg('dash') - (L.chance(0.5) ? R() : 0));
        mRun = Math.max(300, avg('mRun') - (L.chance(0.5) ? 2 * R() : 0)); runSp = Math.max(300, avg('runSp') - (L.chance(0.5) ? 2 * R() : 0));
        fix();
        break;
      case 'saraha_nut': {
        const T = [[24, 1 + 1 / 33], [24, 1 - 1 / 33]];
        mdash = firstScaled('mdash', T, 6000, 1); stam = firstScaled('stam', T, 9999, 100);
        const m0 = avg('mRun'); mRun = firstScaled('mRun', T, 6000, 1); mRunUp = mRun > m0;
        break;
      }
      case 'lasan_nut': case 'pram_nut': case 'porov_nut': {
        const T = {
          lasan_nut: { mdash: [[50, 1.05], [25, 0.95]], mRun: [[50, 1.05], [25, 0.95]], stam: [[50, 1.05], [25, 0.95]] },
          pram_nut: { mdash: [[50, 1 + 1 / 18], [25, 1 - 1 / 33]], mRun: [[50, 1 + 1 / 18]], stam: [[50, 1 + 1 / 18], [35, 0.9]] },
          porov_nut: { mdash: [[70, 1 + 1 / 15]], mRun: [[50, 1 + 1 / 15], [25, 0.95]], stam: [[50, 1.05]] },
        }[nut];
        mdash = firstScaled('mdash', T.mdash, 6000, 1); stam = firstScaled('stam', T.stam, 9999, 100);
        const m0 = avg('mRun'); mRun = firstScaled('mRun', T.mRun, 6000, 1); mRunUp = mRun > m0;
        break;
      }
      case 'carob_nut': {
        let r = R(); mRun = r < 30 ? Math.min(6000, Math.floor(hi('mRun') * 1.1)) : r < 85 ? Math.max(1, Math.floor(hi('mRun') * 0.95)) : avg('mRun');
        stam = R() < 50 ? Math.min(9999, Math.floor(hi('stam') * 1.05)) : avg('stam');
        if (color === 'black' && avg('mdash') < 4000) {
          r = L.rnd(0, 15); mdash = r < 7 ? 4000 : r < 11 ? 4200 : r < 12 ? 4300 : r < 13 ? 4400 : r < 15 ? 4500 : 4800;
          mdash = upDown(mdash, Math.floor(R() / 5));
        } else mdash = R() < 60 ? Math.min(6000, Math.floor(hi('mdash') * 1.1)) : avg('mdash');
        mRunUp = true;
        break;
      }
      case 'zeio_nut': {
        let r = R(); mRun = r < 80 ? Math.min(6000, Math.floor(hi('mRun') * 1.125)) : r < 95 ? Math.max(1, Math.floor(hi('mRun') * 0.95)) : avg('mRun');
        stam = R() < 175 ? Math.min(9999, Math.floor(hi('stam') * 1.05)) : avg('stam');
        if (color === 'gold' && avg('mdash') < 5000) {
          r = L.rnd(0, 15); mdash = r < 7 ? 5000 : r < 9 ? 5100 : r < 11 ? 5200 : r < 12 ? 5300 : r < 13 ? 5400 : r < 15 ? 5500 : 5950;
          mdash = upDown(mdash, Math.floor(R() / 10));
        } else mdash = R() < 55 ? Math.min(6000, Math.floor(hi('mdash') * 1.1)) : avg('mdash');
        while (mRun >= mdash && mRun > 100) mRun -= 100;
        if (color === 'gold' && mRun < 4000) mRun += 1000;
        while (runSp >= mRun && runSp > 100) runSp -= 100;
        break;
      }
    }
    if (['saraha_nut', 'lasan_nut', 'pram_nut', 'porov_nut', 'carob_nut'].includes(nut)) {
      if (mRunUp) while (mRun >= mdash && mRun > 100) mRun -= 100;
      while (runSp >= mRun && runSp > 100) runSp -= 100;
    }
    mdash = Math.max(1, Math.min(6000, mdash));
    Object.assign(baby, {
      mdash, dash: Math.max(1, Math.min(dash, mdash)), mRun: Math.max(1, Math.min(6000, mRun)), runSp: Math.max(1, runSp), stam: Math.max(1, Math.min(9999, stam)),
      accel: avg('accel'), intel: avg('intel'), coop: 0, personality: either('personality') || 0, rtCount: 0,
      sex: L.chance(0.5) ? 'male' : 'female', races: 0, run: 0, class: 'C',
    });
    baby.readyAt = L.battles() + L.rnd(3, 18);      // newborns need time before they can mate
    return L.sync(baby);
  };

  // ================================================================== chocobo racing prizes
  // Gold Saucer FAQ / Breeding guide [e06]: [id, GP value]; items worth 200+ GP are "rare".
  L.RACE_PRIZES = {
    C: [['potion', 5], ['phoenix_down', 10], ['hyper', 10], ['tranquilizer', 10], ['hi_potion', 15], ['antarctic_wind', 20], ['bolt_plume', 20], ['fire_fang', 20], ['ether', 30]],
    B: [['phoenix_down', 10], ['hyper', 10], ['tranquilizer', 10], ['hi_potion', 15], ['hero_drink', 15], ['bolt_plume', 20], ['antarctic_wind', 20], ['fire_fang', 20], ['ether', 30], ['ice_crystal', 50], ['turbo_ether', 150], ['elixir', 200]],
    A: [['phoenix_down', 10], ['hi_potion', 15], ['hero_drink', 15], ['bolt_plume', 20], ['antarctic_wind', 20], ['fire_fang', 20], ['ether', 30], ['ice_crystal', 50], ['fire_veil', 50], ['swift_bolt', 50], ['elixir', 200], ['m:counter_attack', 300], ['m:sneak_attack', 300], ['m:enemy_away', 300], ['cats_bell', 500]],
    S: [['phoenix_down', 10], ['hero_drink', 15], ['bolt_plume', 20], ['ice_crystal', 50], ['fire_veil', 50], ['swift_bolt', 50], ['turbo_ether', 150], ['elixir', 200], ['megalixir', 300], ['precious_watch', 300], ['m:counter_attack', 300], ['m:sneak_attack', 300], ['m:enemy_away', 300], ['chocobracelet', 400], ['cats_bell', 500], ['sprint_shoes', 500]],
  };
  const RARE_CHANCE = { C: 0, B: 1 / 2, A: 3 / 4, S: 7 / 8 };
  // Three different prizes: common (7/15 squares), uncommon (5/15), rare (3/15).
  L.raceBoard = function (cls) {
    const list = L.RACE_PRIZES[cls] || L.RACE_PRIZES.C;
    const normal = list.filter(p => p[1] < 200), rare = list.filter(p => p[1] >= 200);
    const half = Math.ceil(normal.length / 2);
    const lo = normal.slice(0, half), hi = normal.slice(half);
    const a = L.pick(lo);
    const b = L.pick(hi.filter(p => p !== a).length ? hi : lo.filter(p => p !== a));
    let c = rare.length && L.chance(RARE_CHANCE[cls] || 0) ? L.pick(rare) : null;
    if (!c) c = normal.filter(p => p !== a && p !== b).slice(-1)[0] || b;
    return [{ id: a[0], gp: a[1], w: 7 }, { id: b[0], gp: b[1], w: 5 }, { id: c[0], gp: c[1], w: 3 }];
  };
  L.raceWon = (r) => r === true || r === 'win' || !!(r && typeof r === 'object' && (r.won || r.win || r.place === 1));
  L.racePlace = (r) => (r && typeof r === 'object' && typeof r.place === 'number') ? r.place : (L.raceWon(r) ? 1 : L.rnd(2, 6));

  // ================================================================== riding
  // Mount a stabled chocobo outside the farm; the world engine reads vars.chocobo_color.
  L.ride = function* (s, c) {
    const v = V();
    v.chocobo_color = c.color;
    v.c12a_riding = c.id;
    s.sfx('chocobo');
    yield s.world({ x: 299, y: 168, vehicle: 'chocobo' });
  };

  // ================================================================== world: chocobo tracks
  const W = () => FF7.data.world;
  const wrap = (n, m) => ((n % m) + m) % m;
  L.regionAt = function (x, y) {
    const w = W(); if (!w || !w.regions || x == null) return null;
    const row = w.regions.rows[wrap(y, w.h)];
    return row ? (w.regions.legend[row[wrap(x, w.w)]] || null) : null;
  };
  L.terrainAt = function (x, y) {
    const w = W(); if (!w || x == null) return null;
    const row = w.rows[wrap(y, w.h)];
    return row ? (w.legend[row[wrap(x, w.w)]] || null) : null;
  };
  L.trackAt = function (x, y) {
    const w = W(); if (!w || !w.chocoboTracks || x == null) return null;
    for (const t of w.chocoboTracks) {
      let dx = Math.abs(x - t.x), dy = Math.abs(y - t.y);
      dx = Math.min(dx, w.w - dx); dy = Math.min(dy, w.h - dy);
      if (dx <= 3 && dy <= 3) return t;
    }
    return null;
  };
  // Areas with chocobo tracks: FF7 formation tables (docs/enemies_d1a.md, d1b.md). The Icicle and
  // Mideel formations have no table in the data files, so they are listed here (Raising guide).
  const f = (...e) => ({ e, w: 1 });
  L.CHOCO_AREAS = {
    chocobo_farm_area: { table: 'chocobo_grasslands', bg: 'grass', zone: 'ranch' },
    junon_area: { table: 'chocobo_junon', bg: 'grass', zone: 'junon' },
    desert_edge: { table: 'chocobo_desert_edge', bg: 'grass' },
    rocket_area: { table: 'chocobo_rocket', bg: 'grass' },
    wutai_area: { table: 'chocobo_wutai', bg: 'grass' },
    // (the birds' levels: Enemy Mechanics FAQ 3.2.1 - Icicle L33, Mideel L36)
    icicle_area: { list: [f('chocobo_l33', 'bandersnatch', 'bandersnatch'), f('bandersnatch', 'chocobo_l33', 'jumping'), f('jumping', 'chocobo_l33'), f('jumping', 'jumping', 'chocobo_l33')], bg: 'snow' },
    mideel_area: { list: [f('head_hunter', 'head_hunter', 'head_hunter', 'chocobo_l36'), f('head_hunter', 'head_hunter', 'chocobo_l36'), f('spiral', 'chocobo_l36'), f('spiral', 'spiral', 'chocobo_l36')], bg: 'grass' },
  };
  L.chocoArea = function (ctx) {
    if (!ctx) return null;
    const t = L.trackAt(ctx.x, ctx.y);
    const onTracks = ctx.terrain === 'tracks' || !!t;
    if (!onTracks) return null;
    const region = (t && t.region) || ctx.region || L.regionAt(ctx.x, ctx.y);
    return L.CHOCO_AREAS[region] ? Object.assign({ region }, L.CHOCO_AREAS[region]) : null;
  };
  L.chocoFormation = function (area) {
    const list = area.list || FF7.data.encounters[area.table] || L.CHOCO_AREAS.icicle_area.list;
    const pickd = L.weighted(list, 'w');
    return Object.assign({}, pickd, { e: pickd.e.slice() });
  };
  // The quality is known from the monsters that come with the bird (Raising guide, section 1).
  L.ratingOf = function (ids) {
    const n = (id) => ids.filter(x => x === id).length;
    if (n('jumping') && !n('bandersnatch')) return 'wonderful';
    if (n('bandersnatch')) return 'weak';
    if (n('spiral')) return 'great';
    if (n('head_hunter')) return 'fair';
    if (n('velcher_task')) return 'so-so';
    if (n('valron') || n('kyuvilduns')) return 'great';
    if (n('spencer')) return 'good';
    if (n('flapbeat') || n('harpy')) return 'average';
    if (n('razor_weed')) return 'fair';
    if (n('tail_vault')) return n('tail_vault') === 2 && /^chocobo/.test(ids[0]) ? 'fair' : 'average';
    if (n('capparwire') >= 3) return 'fair';
    if (n('capparwire') === 2) return ids[0] === 'capparwire' ? 'fair' : 'poor';
    if (n('nerosuferoth') || n('mandragora')) return 'poor';
    if (n('levrikon') || n('elfadunk')) return 'weak';
    return 'average';
  };
  // Chocobo Lure Rating (Enemy Mechanics FAQ 3.1 / the Walkthrough's materia list): L1 8, L2 12, L3+ 16, the lures
  // stacking additively up to 32
  L.lureRating = function () {
    try {
      const M = FF7.sys && FF7.sys.materia;
      if (!M || !M.indepLevels) return 0;
      return Math.min(32, FF7.sys.party.active().reduce((sum, c) => sum + M.indepLevels(c, 'chocobo_lure').reduce((a, lv) => a + (lv >= 3 ? 16 : lv === 2 ? 12 : 8), 0), 0));
    } catch (e) { return 0; }
  };
  L.lureChance = function (area, rating) {
    if (rating <= 0) return 0;
    if (area.zone === 'ranch') return rating >= 16 ? 1 : 0.75;
    if (area.zone === 'junon') return rating >= 16 ? 1 : 0.5;
    return rating >= 32 ? 1 : rating >= 16 ? 0.5 : 0.25;
  };
  L.greensCount = () => L.GREENS.map(g => (FF7.sys && FF7.sys.inv && FF7.sys.inv.count ? FF7.sys.inv.count(g) : 0));
  // catch odds after the fight, raised by the best green thrown to the bird
  const GREEN_CATCH = { gysahl_greens: 30, krakka_greens: 35, tantal_greens: 40, pahsana_greens: 45, curiel_greens: 55, mimett_greens: 20, reagan_greens: 60, sylkis_greens: 25 };
  L.catchOdds = function (before) {
    const after = L.greensCount();
    let best = 0;
    L.GREENS.forEach((g, i) => { if ((before[i] || 0) > (after[i] || 0)) best = Math.max(best, GREEN_CATCH[g]); });
    return Math.min(95, 35 + best);
  };
  // caught birds wait in the farm's fence (max 4; a 5th sends the oldest back to the wild)
  L.toPen = function (rating) {
    const pen = L.pen();
    let lost = null;
    if (pen.length >= 4) lost = pen.shift();
    pen.push({ rating, caughtAt: L.battles() });
    return lost;
  };

  // ================================================================== world hooks
  const WM = FF7.world;
  if (!Array.isArray(WM.encounterHooks)) WM.encounterHooks = [];
  let lastCtx = null;
  const isForest = (t) => t === 'forest' || t === 'f' || t === 'jungle' || t === 'j';
  // FF7 Mystery Ninja odds per area (walkthrough "Meeting Yuffie", out of 256)
  const NINJA_RATE = { junon_area: 32, mythril_area: 32, condor_area: 32, gongaga_area: 64, nibel_area: 64, cosmo_area: 64, rocket_area: 255,
    bone_area: 128, forest_north: 128, capital_area: 128, mideel_area: 128, goblin_area: 128, round_area: 128 };
  WM.encounterHooks.push(function (ctx) {
    try {
      const fl = FF7.state.flags;
      if (!ctx || ctx.vehicle || !fl.left_midgar || fl.yuffie_joined) return null;
      const terrain = ctx.terrain || L.terrainAt(ctx.x, ctx.y);
      if (!isForest(terrain)) return null;
      const region = ctx.region || L.regionAt(ctx.x, ctx.y);
      if (Math.random() * 256 >= (NINJA_RATE[region] || 32)) return null;
      lastCtx = Object.assign({}, ctx, { terrain, region });
      return FF7.story.c12a_ninjaBattle;
    } catch (e) { console.error(e); return null; }
  });
  WM.encounterHooks.push(function (ctx) {
    try {
      if (!ctx || ctx.vehicle) return null;
      const area = L.chocoArea(ctx);
      if (!area) return null;
      if (!L.chance(L.lureChance(area, L.lureRating()))) return null;
      lastCtx = ctx;
      return FF7.story.c12a_chocoboBattle;
    } catch (e) { console.error(e); return null; }
  });

  // ------------------------------------------------------------------ Mystery Ninja fight
  FF7.story.c12a_ninjaBattle = function* (s) {
    const ctx = lastCtx || {}; lastCtx = null;
    const r = yield s.battle({ table: 'ninja', bg: (ctx.terrain === 'jungle' || ctx.terrain === 'j') ? 'jungle' : 'forest', music: 'battle', random: true });
    if (r !== 'win') return;
    s.set('c12a_ninja_active');
    s.unset('c12a_ninja_talk'); s.unset('c12a_ninja_gone');
    yield s.goto('side_ninja_clearing', 'from_world');
  };

  // ------------------------------------------------------------------ wild chocobo fight
  FF7.story.c12a_chocoboBattle = function* (s) {
    const ctx = lastCtx || { x: 306, y: 160, region: 'chocobo_farm_area' }; lastCtx = null;
    const area = L.chocoArea(ctx) || Object.assign({ region: 'chocobo_farm_area' }, L.CHOCO_AREAS.chocobo_farm_area);
    const form = L.chocoFormation(area);
    const rating = L.ratingOf(form.e);
    const greens = L.greensCount();
    const w = s.battle({ formation: form, bg: area.bg, music: 'battle', random: true });
    let bird = null;
    try { const t = FF7.sceneMgr.top(); if (t && t.isBattle) bird = (t.enemies || []).find(e => e.def0 && e.def0.chocobo) || null; } catch (e) { bird = null; }
    const r = yield w;
    if (r !== 'win') return;
    // The battle engine hook for Chocobo Lure fights may flag the bird as caught; otherwise the
    // odds depend on the greens it was fed. A bird that was knocked out is never caught.
    let caught;
    if (bird && bird.caught) caught = true;
    else if (bird && bird.fled) caught = false;                     // (it ran off: FF7 has it gone)
    else if (bird && bird.hp != null && bird.hp <= 0) caught = false;
    else caught = Math.random() * 100 < L.catchOdds(greens);
    // (Config > Chocobo Details: what the monsters with it gave away, and the odds the greens it ate made)
    if (L.detailsOn() && !(bird && (bird.fled || (bird.hp != null && bird.hp <= 0)))) {
      yield s.msg(`(The monsters with it mark it as a ${L.RATING_NAME[rating] || rating} chocobo.\nWith the greens it ate, the odds of catching it were ${bird && bird.caught ? 100 : L.catchOdds(greens)}%.)`);
    }
    if (!caught) { yield s.msg('The chocobo ran off into the distance...'); return; }
    s.sfx('chocobo');
    s.set('c12a_caught_chocobo');
    yield s.msg('You caught a chocobo!');
    const opts = ['Ride it'];
    if (L.stables() > 0) opts.push('Send it to the Chocobo Farm');
    opts.push('Let it go');
    const k = yield s.ask(null, 'What will you do with the chocobo?', opts);
    const pickd = opts[k] || opts[0];
    if (pickd === 'Ride it') {
      V().chocobo_color = 'yellow';
      V().c12a_riding = 0;          // a wild bird: it runs off when you get down
      yield s.world({ resume: true, vehicle: 'chocobo' });
    } else if (pickd === 'Send it to the Chocobo Farm') {
      const lost = L.toPen(rating);
      yield s.msg('The chocobo trotted off toward the Chocobo Farm.\nIt will wait in the fence until Choco Billy moves it to a stable.');
      if (lost) yield s.msg('The fence was full, so the chocobo that was caught first was set free.');
    } else {
      yield s.msg('The chocobo scampered happily away. Kweh!');
    }
  };

  // ================================================================== the forest clearing
  function* steal(s) {
    const g = s.gil();
    if (g <= 0) return 0;
    const n = Math.min(g, Math.max(10, Math.min(5000, Math.floor(g * L.frnd(0.05, 0.1)))));
    if (!s.takeGil(n)) return 0;
    return n;
  }
  // Yuffie bolts: wrong answer, menu opened, or the save point used before the talk is over.
  function* bolt(s, taunt) {
    s.set('c12a_ninja_gone');
    s.unset('c12a_ninja_active');
    s.set('c12a_ninja_fled');
    if (taunt) {
      yield s.say('ninja_yuffie', taunt);
      s.anim('ninja_yuffie', 'jump');
      yield s.run('ninja_yuffie', 13, 13);
    }
    s.hide('ninja_yuffie');
    const n = yield* steal(s);
    s.sfx('run');
    yield s.msg(n > 0 ? `The ninja is gone... and so are ${n} Gil!` : 'The ninja is gone without a trace...');
  }
  // FF7: opening the menu (or saving) while she lies there makes her vanish. Every frame while
  // the field runs the play clock advances 1/60 s; a bigger jump means another screen was on top.
  function* menuTrap(s) {
    let last = FF7.state.time || 0, idle = 0;
    for (let i = 0; i < 216000; i++) {
      if (s.flag('c12a_ninja_talk') || !s.flag('c12a_ninja_active')) return;
      const now = FF7.state.time || 0;
      if (now - last > 0.3) { yield* bolt(s, null); return; }
      idle = now === last ? idle + 1 : 0;
      if (idle > 240) return;            // clock not running (headless tools)
      last = now;
      yield 1;
    }
  }
  // FF7 date points: each right answer Yuffie +2 while her affection is still below 30 (they come again
  // every time she is met, until she joins)
  const yufDP = () => [FF7.story.affection('yuffie') < 30 ? { yuffie: 2 } : {}, {}];
  // (dateSoft: a wrong answer loses her, so the runner only weighs the points against the closest rival)
  const Q = (s, text, choices) => s.ask('ninja_yuffie', text, choices, { date: yufDP(), dateSoft: true });
  function* recruit(s) {
    if (!s.flag('c12a_ninja_active') || FF7.state.flags.yuffie_joined) return;
    s.set('c12a_ninja_talk');
    s.stopAnim('ninja_yuffie');
    yield s.face('ninja_yuffie', 'player');
    yield s.emote('ninja_yuffie', '!');
    let k = yield Q(s, "Ugh... you just got lucky, that's all!\fC'mon, one more round! This time I'm going all out!", ['Not interested', 'Bring it on']);
    if (k !== 0) { yield* bolt(s, "Hah! Sucker! Like I'd fight you again for free!"); return; }
    FF7.story.datePts(s, yufDP()[0]);
    k = yield Q(s, "Wh-what?! You're backing down?\fOh, I get it. You're scared of me! You're totally petrified, aren't you?", ['......petrified', "......Scared? Of you?"]);
    if (k !== 0) { yield* bolt(s, "Hmph! Whatever. I've got better things to do than hang around with you!"); return; }
    FF7.story.datePts(s, yufDP()[0]);
    k = yield Q(s, "Hee hee! Knew it. The great ninja strikes fear into every heart!\fWell, I'm outta here. Try not to cry, 'kay? Bye-bye!", ['Wait a second!', 'Take care']);
    if (k !== 0) { yield* bolt(s, "Later, loser!"); return; }
    FF7.story.datePts(s, yufDP()[0]);
    k = yield Q(s, "...What? What is it?\fOh-ho... You want me to come with you. That's it, isn't it?", ["......That's right", '......Not really']);
    if (k !== 0) { yield* bolt(s, "Then quit wasting my time! Hmph!"); return; }
    FF7.story.datePts(s, yufDP()[0]);
    yield s.say('ninja_yuffie', "Hmmm... Well... if you're gonna BEG like that, I guess I could tag along for a little while.\f(Heh heh... this bunch is loaded with materia...)");
    k = yield s.ask('cloud', "(Did she just say something about materia...?)", ["......Let's hurry on", '......What was that about materia?'], { date: yufDP(), dateSoft: true });
    if (k !== 0) { yield* bolt(s, "M-materia? Who said anything about materia?! Gotta go!"); return; }
    FF7.story.datePts(s, yufDP()[0]);
    s.music('shinobi');
    yield s.say('ninja_yuffie', "Right! Then let me introduce myself...\fThe one and only great ninja of Wutai! Yuffie Kisaragi, that's me!");
    yield s.nameEntry('yuffie');
    s.join('yuffie');
    s.set('yuffie_joined');
    s.unset('c12a_ninja_active');
    s.hide('ninja_yuffie');
    s.sfx('learn');
    yield s.msg(`${s.name('yuffie')} joined the party!`);
    yield s.giveMateria('throw', { equip: 'yuffie' });
    yield s.say('yuffie', "Stick with me and you guys'll be fine. Let's move it, move it!");
  }
  function* leave(s) {
    if (s.flag('c12a_ninja_active') && !s.flag('yuffie_joined')) {
      s.unset('c12a_ninja_active');
      s.set('c12a_ninja_gone');
    }
    yield s.world({ resume: true });
  }

  FF7.defineMap('side_ninja_clearing', {
    name: 'Forest', area: 'World', theme: 'forest', music: 'shinobi',
    grid: [
      "TTTTTTTTTTTTTTTTTTTTTTTTTT",
      "TTTTTTTTTTTTTTTTTTTTTTTTTT",
      "TTT%TTTT,,,,,,,,,TTTT%TTTT",
      "TT%,,,,,,GG,,,,,,,,,,,%TTT",
      "T%,,,,,,,,,,,,,,,,,,,,,,TT",
      "T,,,Y,,,,,,,,,,,,,,,G,,,,T",
      ",,,,,,,,,,,,,,,,,,,,,,,,,,",
      ",,,,,,,,,,,,,,,,,,,,,,,,,,",
      "T,,G,,,,,,,,,,,,,,,,,,f,,T",
      "T%,,,,,,,,,,,,,,,,,,,,,,%T",
      "TT,,,,,,,S,,,,,,,,,,,,,TTT",
      "TTT%,,,,,,,,,,,,,,,,,%TTTT",
      "TTTTT,,,,,,,,,,,,,,TTTTTTT",
      "TTTTTTT,,,,,,,,,TTTTTTTTTT",
    ],
    entries: { from_world: [13, 8, 'up'] },
    exits: [
      // (leave itself as the exit script: tools reading it - the runner's router - see that it goes to the world map)
      { at: [0, 6, 1, 2], run: leave },
      { at: [25, 6, 1, 2], run: leave },
      { at: [7, 13, 9, 1], run: leave },
    ],
    npcs: [
      { id: 'ninja_yuffie', name: '???', model: 'yuffie', at: [13, 5], dir: 'down', anim: 'kneel',
        show: s => s.flag('c12a_ninja_active') && !s.flag('yuffie_joined') && !s.flag('c12a_ninja_gone'),
        talk: recruit },
    ],
    objects: [
      { at: [4, 5], talk: function* (s) { yield s.msg('An old stump, hollowed out. Someone has been storing shuriken in it.'); } },
    ],
    onEnter: function* (s) {
      if (!s.flag('c12a_ninja_active') || FF7.state.flags.yuffie_joined) return;
      s.parallel(menuTrap);
      if (s.flag('c12a_ninja_met')) return;
      s.set('c12a_ninja_met');
      yield s.emote('ninja_yuffie', '...');
      yield s.msg('The mysterious ninja is down on one knee, catching her breath.');
    },
  });
})();
