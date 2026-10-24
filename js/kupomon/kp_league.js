// The Kupo Leagues at the Kupo Coliseum (docs/KUPOMON_WORLD.md "The Kupo Leagues"): five in order, Gold, Platinum,
// Diamond, Master and the World Championship. Each is an 8-trainer single-elimination bracket: the bracket is shown,
// the other matches are played out alongside yours (team strength and a little luck), your team is healed between
// rounds, bag items are off, three wins take first place. First place opens the next league and puts a trophy on
// the shelf (d.trophies; the shelf in Cait Sith's workshop shows them in FF7).
//   yield* KP.league(s)   (the registrar's talk)
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {}, R = FF7.render, U = FF7.util;
  const W = FF7.W, H = FF7.H;
  const S = () => FF7.sceneMgr, sfx = (id) => { try { FF7.audio.sfx(id); } catch (e) { } };
  const D = () => FF7.state.kp;
  const REG = 'Registrar Mog';

  // ------------------------------------------------------------------ the leagues and their entrants
  // an entrant: { name, model, team: [[sp, lv, { plus, held }]], lose, win } (or rival: [who, stage], plus); the
  // bracket is drawn at random each time (Bracket)
  const P = (n, held) => ({ plus: n, held });
  KP.LEAGUES = [
    null,
    { n: 1, name: 'Gold League', col: '#e8c040', prize: [['royal_nut', 3]], coins: 5000, music: 'judgement', ai: 'max',
      entrants: [
        { name: 'Red XIII', model: 'redxiii', team: [['mossmog_beastmaster', 30], ['chocomog_knight', 30], ['icemog_yeti', 30], ['galimog_galian', 30], ['ouijapom_shaman', 30]], lose: 'Grrr... a fine hunt, nonetheless.', win: 'The pack wins today.' },
        { name: 'Reno', model: 'reno', team: [['nutmog_ninja', 30], ['batmog_vampire', 30], ['mogpirate_sky_pirate', 30], ['kurogen_kunoichi', 30], ['spykin_turk', 30]], lose: "Tch. Didn't see that coming, yo.", win: 'Too slow, yo!' },
        { name: 'Rude', model: 'rude', team: [['stampo_blackbelt', 30], ['kupochi_master', 30], ['icemog_yeti', 30], ['grumog_viking', 30], ['knucklin_lanista', 30]], lose: '......Good fight.', win: '......' },
        { name: 'Elena', model: 'elena', team: [['fletchmog_sniper', 30], ['mogpost_cannoneer', 30], ['huntmog_trapper', 30], ['seamog_captain', 30], ['flintkin_flintlock', 30]], lose: "Ugh! Tseng's going to hear about this...", win: 'Bullseye!' },
        { name: 'Dio', model: 'dio', team: [['tufty_mime', 30], ['juggler_jester', 30], ['pipkin_onion_knight', 30], ['chatmog_orator', 30], ['bigtopo_ringmaster', 30]], lose: 'Magnificent! What a show!', win: 'The crowd loves me!' },
        { name: 'Don Corneo', model: 'corneo', team: [['mopluff_dancer', 30], ['gilmog_gambler', 30], ['chatmog_orator', 30], ['dunemog_raider', 30], ['partypom_party_host', 30]], lose: "Bwah?! But I bribed the referee!", win: 'Bwa-ha-ha! The Don always wins!' },
        { name: 'Zack', model: 'zack', rival: ['zack', 9], lose: "Whoa! You're the real deal, Cloud!", win: "Ha! Got you this time, buddy!" },
      ] },
    { n: 2, name: 'Platinum League', col: '#c8d8e8', prize: [['royal_nut', 5], ['max_oil', 3]], coins: 8000, music: 'judgement', ai: 'max',
      entrants: [
        { name: 'Yuffie', model: 'yuffie', team: [['kurogen_kunoichi', 30, P(1)], ['nutmog_ninja', 30, P(1)], ['mogpirate_sky_pirate', 30, P(1)], ['dunemog_raider', 30, P(1)], ['batmog_vampire', 30, P(1)]], lose: 'No fair! Rematch! ...Later.', win: 'The great ninja Yuffie strikes again!' },
        { name: 'Barret', model: 'barret', team: [['gunmog_gun_arm', 30, P(1)], ['gearmog_artificer', 30, P(1)], ['minemog_foreman', 30, P(1)], ['puppetmog_puppeteer', 30, P(1)], ['clockmog_chrono', 30, P(1)]], lose: "Damn! ...Not bad, spiky.", win: "Ha! That's how we do it!" },
        { name: 'Tifa', model: 'tifa', team: [['kupochi_master', 30, P(1)], ['stampo_blackbelt', 30, P(1)], ['icemog_yeti', 30, P(1)], ['grumog_viking', 30, P(1)], ['templamog_templar', 30, P(1)]], lose: "You've gotten really strong, Cloud.", win: "Don't give up, okay?" },
        { name: 'Cid', model: 'cid', team: [['lancemog_highwind', 30, P(1)], ['kitemog_skydiver', 30, P(1)], ['wyrmog_rider', 30, P(1)], ['angler_harpooner', 30, P(1)], ['mogpirate_sky_pirate', 30, P(1)]], lose: 'Well, I\'ll be... Grounded!', win: 'Highwind, takin\' off!' },
        { name: 'Scarlet', model: 'scarlet', team: [['darkmog_knight', 30, P(1)], ['embermog_archmage', 30, P(1)], ['shellmog_guardian', 30, P(1)], ['bogmog_hag', 30, P(1)], ['cactumog_guard', 30, P(1)]], lose: 'Kya... you brat!', win: 'Kyahahaha!' },
        { name: 'Heidegger', model: 'heidegger', team: [['grumog_viking', 30, P(1)], ['gunmog_gun_arm', 30, P(1)], ['darkmog_knight', 30, P(1)], ['minemog_foreman', 30, P(1)], ['seamog_captain', 30, P(1)]], lose: 'Gyaa! Impossible!', win: 'Gya-ha-ha-ha!' },
        { name: 'Reeve', model: 'reeve', team: [['clockmog_chrono', 30, P(1)], ['gearmog_artificer', 30, P(1)], ['callmog_evoker', 30, P(1)], ['orbmog_seer', 30, P(1)], ['tufty_mime', 30, P(1)]], lose: 'Well played! Cait would be proud.', win: 'Careful planning pays off.' },
      ] },
    { n: 3, name: 'Diamond League', col: '#a0e8ff', prize: [['royal_nut', 8], ['battery', 3], ['leftover_nut', 1]], coins: 12000, music: 'judgement', ai: 'max',
      entrants: [
        { name: 'Aeris', model: 'aeris', team: [['callmog_evoker', 30, P(2)], ['petalmog_maiden', 30, P(2)], ['fernwisp_dryad', 30, P(2)], ['lumimog_beacon', 30, P(2)], ['halomog_bishop', 30, P(2)]], lose: 'Ehehe. You win! Fair and square.', win: 'Sorry! The flowers were on my side.' },
        { name: 'Vincent', model: 'vincent', team: [['tickmog_chronomancer', 30, P(2)], ['galimog_galian', 30, P(2)], ['orbmog_seer', 30, P(2)], ['clockmog_chrono', 30, P(2)], ['ghostmog_specter', 30, P(2)]], lose: '...So time moves on after all.', win: '...Asleep again.' },
        { name: 'Rufus', model: 'rufus', team: [['darkmog_knight', 30, P(2, 'focus_pom')], ['mogsquire_paladin', 30, P(2)], ['drakemog_dragon_knight', 30, P(2)], ['gunmog_gun_arm', 30, P(2)], ['mysticmog_mystic_knight', 30, P(2)]], lose: 'Hmph. I\'ll remember this.', win: 'Fear makes a fine general.' },
        { name: 'Bugenhagen', model: 'bugenhagen', team: [['orbmog_seer', 30, P(2)], ['callmog_evoker', 30, P(2)], ['mathmog_arithmetician', 30, P(2)], ['maestromog_maestro', 30, P(2)], ['wrapmog_tomb_guard', 30, P(2)]], lose: 'Ho ho houm! The Planet smiles on you.', win: 'Ho ho houm! Patience, young one.' },
        { name: 'Dyne', model: 'dyne', team: [['gunmog_gun_arm', 30, P(2)], ['slingmog_gunslinger', 30, P(2)], ['minemog_foreman', 30, P(2)], ['dunemog_raider', 30, P(2)], ['cactumog_guard', 30, P(2)]], lose: '......Go on. You earned it.', win: '...Nothing personal.' },
        { name: 'Tseng', model: 'tseng', team: [['nutmog_ninja', 30, P(2)], ['spellmog_spellblade', 30, P(2)], ['ghostmog_specter', 30, P(2)], ['kurogen_kunoichi', 30, P(2)], ['darkmog_knight', 30, P(2)]], lose: 'Impressive. The Turks will take note.', win: 'Mission complete.' },
        { name: 'Palmer', model: 'palmer', team: [['embermog_archmage', 30, P(2)], ['kupwick_magus', 30, P(2)], ['bogmog_hag', 30, P(2)], ['spookmog_necromancer', 30, P(2)], ['redpom_sage', 30, P(2)]], lose: 'Uhuhu... my lard... I mean, my moogles!', win: 'Uhuhuhu! Space Program, go!' },
      ] },
    { n: 4, name: 'Master League', col: '#d060ff', prize: [['royal_nut', 10], ['max_oil', 5], ['lucky_pom', 1]], coins: 18000, music: 'jenova_absolute', ai: 'max',
      entrants: [
        { name: 'Zack', model: 'zack', rival: ['zack', 9], plus: 3, lose: 'You did it, Cloud! You really are a hero!', win: 'Heroes never quit, right? ...Right?' },
        { name: 'Tifa', model: 'tifa', team: [['kupochi_master', 30, P(3, 'focus_pom')], ['templamog_templar', 30, P(3)], ['icemog_yeti', 30, P(3)], ['stampo_blackbelt', 30, P(3, 'quick_gear')], ['shamog_beastcaller', 30, P(3)]], lose: 'Next time, I\'m not holding back!', win: 'Promise me you\'ll keep training.' },
        { name: 'Vincent', model: 'vincent', team: [['tickmog_chronomancer', 30, P(3, 'quick_gear')], ['galimog_galian', 30, P(3)], ['maestromog_maestro', 30, P(3)], ['clockmog_chrono', 30, P(3)], ['ultimog_ultima', 30, P(2)]], lose: '......', win: 'Sleep...' },
        { name: 'Hojo', model: 'hojo', team: [['jenomog_project_j', 30, P(3)], ['spookmog_necromancer', 30, P(3)], ['bogmog_hag', 30, P(3)], ['batmog_vampire', 30, P(3)], ['galimog_galian', 30, P(3)]], lose: 'Kuhuhu... purely academic, of course.', win: 'Kuhuhu! Excellent data!' },
        { name: 'Red XIII', model: 'redxiii', team: [['galimog_galian', 30, P(3)], ['shamog_beastcaller', 30, P(3)], ['grumog_viking', 30, P(3)], ['chocomog_knight', 30, P(3)], ['mossmog_beastmaster', 30, P(3, 'leftover_nut')]], lose: 'My grandfather would have enjoyed that.', win: 'The flame on my tail burns bright.' },
        { name: 'Rufus', model: 'rufus', team: [['omegamog_omega', 30, P(2)], ['darkmog_knight', 30, P(3)], ['drakemog_dragon_knight', 30, P(3)], ['mysticmog_mystic_knight', 30, P(3)], ['gunmog_gun_arm', 30, P(3)]], lose: 'This changes nothing.', win: 'Kneel.' },
        { name: 'Sephiroth', model: 'sephiroth', rival: ['sephiroth', 'league'], lose: '...You. Remember this feeling, Cloud. I will.', win: 'Did you really think you could win?' },
      ] },
    { n: 5, name: 'World Championship', col: '#ff6060', prize: [['crystal_nut', 1], ['royal_nut', 10]], coins: 30000, music: 'onewinged', ai: 'max',
      entrants: [
        { name: 'Sephiroth', model: 'sephiroth', rival: ['sephiroth', 'league'], plus: 5, lose: '...Then go. Take the crown. For now.', win: 'You were never anything more than a puppet.' },
        { name: 'Zack', model: 'zack', rival: ['zack', 9], plus: 5, lose: 'Go get him, Cloud!', win: 'Sorry, buddy! Dreams of a hero, right?' },
        { name: 'Aeris', model: 'aeris', team: [['bahamog_bahamut', 30, P(4)], ['petalmog_maiden', 30, P(5)], ['callmog_evoker', 30, P(5, 'quick_gear')], ['fernwisp_dryad', 30, P(5, 'leftover_nut')], ['halomog_bishop', 30, P(5)]], lose: 'I knew you could do it.', win: 'Hee hee! Gotcha.' },
        { name: 'Barret', model: 'barret', team: [['omegamog_omega', 30, P(4)], ['gunmog_gun_arm', 30, P(5, 'quick_gear')], ['slingmog_gunslinger', 30, P(5)], ['gearmog_artificer', 30, P(5)], ['minemog_foreman', 30, P(5)]], lose: 'Aight, aight! You the man!', win: 'Hell yeah!' },
        { name: 'Red XIII', model: 'redxiii', team: [['galimog_galian', 30, P(5)], ['shamog_beastcaller', 30, P(5, 'focus_pom')], ['grumog_viking', 30, P(5)], ['chocomog_knight', 30, P(5)], ['ultimog_ultima', 30, P(4)]], lose: 'Well fought, friend.', win: 'Forgive me. I am a warrior.' },
        { name: 'Vincent', model: 'vincent', team: [['tickmog_chronomancer', 30, P(5, 'quick_gear')], ['galimog_galian', 30, P(5)], ['maestromog_maestro', 30, P(5)], ['spookmog_necromancer', 30, P(5)], ['ghostmog_specter', 30, P(5)]], lose: '...It is done.', win: '...My sin is to win, then.' },
        { name: 'Prof. Sith', model: 'caitsith', team: [['mogmk_mk2', 30, P(5, 'leftover_nut')], ['kupoking_king', 30, P(5)], ['moglin_samurai', 30, P(5, 'focus_pom')], ['kupwick_magus', 30, P(5, 'quick_gear')], ['pomsprout_whitewizard', 30, P(5, 'lucky_pom')]], lose: "Och! Ye beat me fair and square, ye wee rascal! Ye're the World Champion now!", win: "Ha ha! The old professor's still got it!" },
      ] },
  ];

  // an entrant's team as moogle specs (a rival's from KP.RIVALS, at their league strength): five moogles at the level
  // cap, every one fully evolved, with perfect IVs, holding an item and knowing a competitive moveset
  // every tournament fight (yours, and the bouts watched) plays a battle theme at random (the user's rule), never the one
  // the fight before it played
  const TOURNEY_MUSIC = ['battle', 'boss', 'jenova', 'fullscale', 'weaponraid', 'attackweapon', 'judgement', 'jenova_absolute', 'birthofgod', 'onewinged'];
  let lastTune = null;
  KP.tourneyMusic = function () {
    const L = TOURNEY_MUSIC.filter(m => m !== lastTune);
    return (lastTune = L[Math.floor(Math.random() * L.length)]);
  };

  // ------------------------------------------------------------------ the trainer pool (the user's rule): every
  // tournament draws its seven opponents at random from all of these, every time a bracket is drawn. The pool is the
  // main game's important people: everyone from the old fixed line-ups (a trainer who stood in several brings one of
  // those teams at random) and the rest. Which tournament it is decides only the "+" (PLUS below) and the purse
  KP.TRAINER_POOL = (() => {
    const pool = {};
    KP.LEAGUES.forEach(L => L && L.entrants.forEach(e => { (pool[e.name] = pool[e.name] || { name: e.name, model: e.model, teams: [] }).teams.push(e); }));
    const add = (name, model, team, lose, win) => { pool[name] = { name, model, teams: [{ name, model, team: team.map(sp => [sp, 30]), lose, win }] }; };
    add('Biggs', 'biggs', ['knucklin_brawler', 'grumog_berserker', 'gunmog_gunner', 'brawnpom_bouncer', 'stampo_monk'], "Heh... you'd make a fine member of AVALANCHE.", "That one's for Sector 7!");
    add('Wedge', 'wedge', ['puddipom_cook', 'partypom_partygoer', 'farmmog_farmer', 'chocomog_rider', 'sumopom_sumo'], "Aww... I was getting hungry anyway.", 'Wedge wins! Celebration snacks for everyone!');
    add('Jessie', 'jessie', ['gizmog_inventor', 'clockmog_clockmaker', 'juggler_juggler', 'puppetmog_puppeteer', 'voltkin_electrician'], 'Ugh! I had this all planned out!', 'Right on schedule!');
    add('President Shinra', 'president', ['gilmog_gambler', 'mogmk_mk1', 'leomog_gunbreaker', 'tekkupo_magitek', 'spykin_spy'], 'Hmph. Everything has a price. Yours was victory.', 'Money talks. Your moogles walk.');
    add('Shera', 'shera', ['astropom_space_cadet', 'kitemog_flier', 'gearmog_tinker', 'twinklin_stargazer', 'halomog_cleric'], '...I should have run the numbers again.', 'Calculated. Down to the decimal.');
    add('Godo', 'godo', ['kenkupo_wanderer', 'kurogen_genin', 'kupozen_initiate', 'wyverkin_wyvern_keeper', 'ghostmog_phantom'], 'Ho! A worthy challenger. Wutai respects strength.', 'The Five Gods smile on me today.');
    add('Elmyra', 'elmyra', ['petalmog_florist', 'hedgepom_gardener', 'fernwisp_dryad', 'seramog_seraph', 'breezlin_miller'], "Oh my. You've raised them with such care.", "Don't be sad, dear. Come in for some tea.");
    return Object.values(pool);
  })();
  // a bracket's seven: shuffled out of the whole pool, each with one of its teams. The World Championship (L.n 5) is a
  // bracket of sixteen (the user, 2026-10-03): the main game's seven as in the others, and eight archetype opponents
  // beside them (KP.WC_ARCHETYPES, tools/kp_archetypes.js: every Showdown OU playstyle in Kupomon terms; "new extra
  // opponents for champion tournament only", added, never replacing anyone)
  const shuffle = (P) => { for (let i = P.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [P[i], P[j]] = [P[j], P[i]]; } return P; };
  KP.drawEntrants = function (L) {
    const P = shuffle(KP.TRAINER_POOL.slice()), arch = L && L.n === 5 && KP.WC_ARCHETYPES && KP.WC_ARCHETYPES.length ? shuffle(KP.WC_ARCHETYPES.slice()).slice(0, 8) : [];
    // (a pack's themed team for the trainer, KP.POOL_OVERRIDES by name: docs/KUPOMON_CONTENT.md "Trainers")
    const mains = P.slice(0, 7).map(t => { const tm = t.teams[Math.floor(Math.random() * t.teams.length)], ov = KP.POOL_OVERRIDES && KP.POOL_OVERRIDES[t.name]; return ov ? Object.assign({}, tm, { team: ov.map(x => Array.isArray(x) ? x : [x, 30]), rival: null }) : tm; });
    return shuffle(mains.concat(arch.map(a => Object.assign({}, a, { arch: true }))));
  };

  // each tournament's "+" (the user's tiers): Gold +0 to +1, Platinum +1 to +2, Diamond +2 to +3, Master +3 to +4, the
  // World Championship +5. The range is variance: each moogle rolls its own "+" within it whenever a bracket is drawn
  const PLUS = { 1: [0, 1], 2: [1, 2], 3: [2, 3], 4: [3, 4], 5: [5, 5] };
  // a tournament team of six (Pokémon's: the metagame's team size, the user, 2026-10-03): a trainer whose team was
  // written with five gets a sixth, the same every time for that trainer: a fully evolved kind (no legend, none it has)
  // sharing a job with the team, that resists the jobs most of the team is weak to, about as strong as the rest of it
  // (its total base stats near the team's: a sixth that fits, not the game's strongest), its name deciding between equals
  const hash = (str) => { let h = 2166136261; for (const ch of String(str)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  let FINALS = null;
  // (o.type: only kinds of that job, a themed trainer's: the Elite Four; o.noLegend: never a legend, a story battle)
  KP.sixthFor = function (team, name, o = {}) {
    if (!FINALS) FINALS = Object.keys(KP.SPECIES).filter(sp => KP.finalOf(sp) === sp && (KP.SPECIES[sp].base));
    const hasLegend = team.some(([sp]) => KP.isLegend && KP.isLegend({ sp: KP.finalOf(sp) }));   // (the legend clause: one at most)
    const have = new Set(team.map(([sp]) => KP.finalOf(sp))), tys = (sp) => { const s = KP.SPECIES[sp]; return [s.type, s.type2].filter(Boolean); };
    const jobs = new Set(team.flatMap(([sp]) => tys(KP.finalOf(sp)))), weak = (sp, t) => tys(sp).reduce((m, ty) => m * KP.eff(t, ty), 1);
    const holes = Object.keys(KP.CHART).filter(t => team.filter(([sp]) => weak(KP.finalOf(sp), t) > 1).length >= 2);
    const avg = team.reduce((a, [sp]) => a + KP.bst(KP.finalOf(sp)), 0) / Math.max(1, team.length);
    let best = null, bv = -Infinity;
    for (const sp of FINALS) {
      if (have.has(sp) || !tys(sp).some(t => jobs.has(t)) || ((hasLegend || o.noLegend) && KP.isLegend({ sp })) || (o.type && !tys(sp).includes(o.type))) continue;
      const v = holes.filter(t => weak(sp, t) < 1).length * 60 - Math.abs(KP.bst(sp) - avg) * 0.8 + (hash(name + sp) % 40);
      if (v > bv) { bv = v; best = sp; }
    }
    return best;
  };
  const teamOf = (e, L) => {
    let t = e.rival ? KP.W.rivalTeam(e.rival[0], e.rival[1]).map(([sp, lv, o]) => [sp, KP.MAX_LEVEL, Object.assign({}, o, { plus: Math.max((o || {}).plus || 0, e.plus || 0) })]) : e.team;
    t = t.slice(); while (t.length < KP.PARTY_MAX) { const sp = KP.sixthFor(t, e.name); if (!sp) break; t.push([sp, KP.MAX_LEVEL, {}]); }   // (six a team)
    const tier = L && PLUS[L.n];
    const tiered = tier ? t.map(([sp, lv, o]) => [sp, lv, Object.assign({}, o, { plus: tier[0] + Math.floor(Math.random() * (tier[1] - tier[0] + 1)) })]) : t;
    // (every tournament moogle has perfect IVs, 31 in every stat: the user's rule, 2026-10-02)
    const perfect = Object.fromEntries(KP.STATS.map(k => [k, 31]));
    const team = tiered.map(([sp, lv, o]) => { const f = KP.finalOf(sp), x = Object.assign({}, o, { iv: perfect }); return [f, KP.MAX_LEVEL, x.moves ? x : Object.assign(x, { moves: KP.compMoves(f, KP.MAX_LEVEL) })]; });
    return L && L.n === 5 ? KP.wcSets(team) : KP.leagueHeld(team);
  };
  // a draw of a cup's entrants as moogles (their teams as the bracket makes them): the yardstick the Demo rates its box
  // against before a tournament (R.kpTourneyTeam, js/kupomon/kp_runner.js)
  KP.tourneyTeamOf = (e, L) => teamOf(e, L);   // (an entrant's team as a bracket makes it: tools/kp_wcrank.js)
  // (seed: a fixed draw, the same teams every time, so a team rated today rates the same after a reload; two draws'
  // worth of entrants, the bracket's own rolls made with the seed)
  KP.cupSample = function (n, seed) {
    const L = KP.LEAGUES[n]; if (!L) return [];
    const rnd = Math.random;
    if (seed != null) { let x = seed >>> 0 || 1; Math.random = () => { x = (Math.imul(x, 1103515245) + 12345) >>> 0; return x / 4294967296; }; }
    try { return [].concat(...KP.drawEntrants(L).concat(KP.drawEntrants(L)).map(e => KP.W.team(teamOf(e, L), true))); }
    finally { Math.random = rnd; }
  };
  // the World Championship's moogles: each its kind's competitive set (the user, 2026-10-03: optimal abilities, held
  // items and natures, "for world championship only"): the ability slot and appetite the battle AI's duels found best
  // (KP.WC_SETS, written by tools/kp_wcsets.js), and the held items by their gains, the biggest first across the team,
  // never two alike (the item clause: a member whose best is taken gets its next best). A kind the table hasn't got (a
  // new one) keeps the usual way (KP.leagueHeld, a random ability and appetite)
  KP.wcSets = function (team) {
    const S = KP.WC_SETS || {}, out = team.map(([sp, lv, o]) => {
      const s = S[sp]; if (!s || (o && o.fixed)) return [sp, lv, o];   // (an archetype opponent's set is its own: KP.WC_ARCHETYPES)
      return [sp, lv, Object.assign({}, o, { abil: s.abil, app: s.app, held: null })];
    });
    const pairs = [];
    out.forEach(([sp, lv, o], i) => { const s = S[sp]; if (s && !(o && o.fixed)) for (const [k, v] of s.held) if (KP.ITEMS[k]) pairs.push({ i, k, v }); });
    pairs.sort((a, b) => b.v - a.v);
    const used = new Set(out.filter(([, , o]) => o && o.fixed && o.held).map(([, , o]) => o.held)), got = new Set(out.map(([, , o], i) => o && o.fixed ? i : -1).filter(i => i >= 0));
    for (const p of pairs) { if (got.has(p.i) || used.has(p.k)) continue; out[p.i][2].held = p.k; got.add(p.i); used.add(p.k); }
    // (none of its own left, or not in the table: the usual way, around the items already taken)
    const rest = out.map(([sp, lv, o], i) => got.has(i) ? [sp, lv, Object.assign({}, o, { held: o.held })] : [sp, lv, Object.assign({}, o, S[sp] ? { held: undefined } : {})]);
    return KP.leagueHeld(rest);
  };
  // a competitive moveset (league moogles): four out of everything it could know by then (its whole line's level-up
  // moves, and every Skill Chip that fits it), picked by the tactics engine: a dependable strong attack, its own type's
  // (STAB), a different type for coverage, and its best utility move (sleep, a setup, a heal) when it has a good one
  KP.compMoves = function (sp, lv, o = {}) {
    const pool = new Set(), pre = {};
    for (const k of Object.keys(KP.SPECIES)) { const e = KP.SPECIES[k].evo; if (e) pre[e.to] = k; }
    for (let q = sp; q; q = pre[q]) for (const [l, m] of (KP.LEARN && KP.LEARN[q]) || []) if (l <= lv && KP.MOVES[m]) pool.add(m);
    if (!pool.size) ((KP.SPECIES[sp] || {}).moves || []).forEach(m => pool.add(m));
    // (the chips: o.chips false none, an array only those (a rival's: the ones sold where the story has reached), else all)
    const chips = o.chips === false ? [] : Array.isArray(o.chips) ? o.chips : Object.keys(KP.ITEMS);
    if (KP.chipFits) for (const id of chips) if (KP.ITEMS[id] && KP.ITEMS[id].kind === 'chip' && KP.MOVES[KP.ITEMS[id].move] && KP.chipFits({ sp, moves: [] }, id)) pool.add(KP.ITEMS[id].move);
    return KP.tactics ? KP.tactics.pickFour({ sp }, [...pool]) : KP.movesAt(sp, lv);
  };
  // a job line's last stage (league moogles are all fully evolved; one-stage kinds stay as they are)
  KP.finalOf = function (sp) {
    let id = sp;
    for (let i = 0; i < 4; i++) { const e = (KP.SPECIES[id] || {}).evo; if (!e || !KP.SPECIES[e.to]) break; id = e.to; }
    return id;
  };
  // held items for a league team: those its data names, and for the rest what suits each moogle (a bulky one a Leftover
  // Nut, a slow one a Quick Gear, a frail one a Focus Pom, a fast hitter its job's booster or a Lucky Pom), never two
  // of the same item on one team (the battle facilities' item clause)
  KP.leagueHeld = function (team) {
    const used = new Set(team.map(([, , o]) => o && o.held).filter(Boolean));
    return team.map(([sp, lv, o]) => {
      if (o && o.held) return [sp, lv, o];
      const S = KP.SPECIES[sp] || {}, b = S.base || {}, boost = 'boost_' + (S.type || 'freelancer'), fits = [];
      if ((b.atk || 0) >= (b.def || 0) + 15 && (b.spd || 0) >= 70) fits.push(boost, 'lucky_pom');
      if ((b.hp || 0) + (b.def || 0) >= 2 * (b.atk || 0)) fits.push('leftover_nut');
      if ((b.spd || 0) < 60) fits.push('quick_gear');
      if ((b.hp || 0) + (b.def || 0) < 130) fits.push('focus_pom');
      fits.push(boost, 'leftover_nut', 'lucky_pom', 'quick_gear', 'focus_pom', 'mini_oil', 'cure_nut');
      const held = fits.find(k => KP.ITEMS[k] && !used.has(k)) || boost;
      used.add(held);
      return [sp, lv, Object.assign({}, o, { held })];
    });
  };

  // ------------------------------------------------------------------ the species clause (the user's rule, Pokémon's):
  // the Kupo League and the tournaments take one of each kind of moogle (a Kupodex entry) on a team. The kinds a team
  // doubles up on (none: it may enter), and how to name them
  KP.clauseDups = (party) => { const seen = {}, dup = []; (party || D().party).forEach(m => { if (seen[m.sp] && !dup.includes(m.sp)) dup.push(m.sp); seen[m.sp] = 1; }); return dup; };
  KP.clauseNames = (dup) => dup.map(sp => KP.SPECIES[sp].moogle + ' the ' + KP.JOBS[KP.SPECIES[sp].job].name).join(' and ');
  // the legend clause (the user, 2026-10-03, for every tournament, the player's team too): one legendary OR one mythical
  // moogle on a team at most, never two of them, never one of each. The legends a team has (more than one: it may not enter)
  KP.legendsOn = (party) => (party || D().party).filter(m => KP.isLegend && KP.isLegend(m));

  // ------------------------------------------------------------------ the registrar
  KP.league = function* (s) {
    if (!s.flag('kp_champion')) { yield s.say(REG, "Welcome to the Kupo Coliseum, kupo! The tournaments here are for Kupo League Champions only.\fThe Kupo League's through the north door, over there: the Elite Four, then the Champion. Come back with the title!"); return; }
    if (!s.flag('kp_league_met')) {
      s.set('kp_league_met');
      yield s.say(REG, 'A Champion! Welcome, challenger, to the Kupo Leagues, kupo!');
      yield s.say(REG, 'Two rules before anything else. The species clause: one of each kind of moogle on your team, kupo. No doubling up!\fAnd the legend clause: one legendary or mythical moogle on a team at most. One, kupo. Not one of each!');
      yield s.say(REG, 'There are five: Gold, Platinum, Diamond, Master... and the World Championship. Win one and the next one opens.\fEach is a knockout bracket of eight trainers: win three matches in a row and first place is yours! The World Championship has sixteen: four wins.\fYour team is fully repaired between matches, and no bag items in the arena. Held items are fine, kupo.');
    }
    const open = KP.LEAGUES.filter(L => L && (L.n === 1 || s.flag('kp_league_' + (L.n - 1))));
    const c = yield s.ask(REG, 'Which league will you enter?', open.map(L => L.name + (s.flag('kp_league_' + L.n) ? ' (won)' : '')).concat(['Not now']));
    if (c >= open.length) { yield s.say(REG, 'Come back any time, kupo!'); return; }
    const L = open[c];
    if (!D().party.some(m => m.hp > 0)) { yield s.say(REG, 'Your moogles need repairs first, kupo!'); return; }
    const dup = KP.clauseDups();
    if (dup.length) { yield s.say(REG, `Hold on, kupo! The tournaments have a species clause: one of each kind of moogle on your team.\fYou've got more than one ${KP.clauseNames(dup)}. Swap the extra out at a Mog Box and come back!`); return; }
    const leg = KP.legendsOn();
    if (leg.length > 1) { yield s.say(REG, `Hold on, kupo! The legend clause: one legendary or mythical moogle on a team at most.\fYou've got ${leg.length}: ${leg.map(m => KP.name(m)).join(', ')}. Leave all but one at a Mog Box and come back!`); return; }
    const ok = yield s.ask(REG, `The ${L.name}! Ready to go in?`, ["Let's go!", 'Not yet']);
    if (ok !== 0) return;
    KP.healAll();
    const r = yield KP.bracket(L);
    KP.healAll();
    if (!r.won) { yield s.say(REG, r.round === (r.final || 3) ? 'So close! Second place is nothing to sneeze at. Come back stronger, kupo!' : r.left ? "Leaving early? No shame in it, kupo. Train up and try again!" : 'Better luck next time, kupo! Train up and try again.'); return; }
    const first = !s.flag('kp_league_' + L.n);
    s.set('kp_league_' + L.n);
    if (L.n === 5) s.inc('kp_lq_chal_wc');   // (the World Championship's wins: a title defended opens Chalimog's quest)
    const d = D(); d.trophies = d.trophies || []; if (!d.trophies.includes(L.n)) d.trophies.push(L.n);
    s.sfx('levelup');
    yield s.say(REG, `Congratulations! You won the ${L.name}, kupo!`);
    if (first) {
      const c = L.coins * KP.coinMul(d); d.money += c;   // (the purse: doubled by a coin ability or the Gambler's Coin)
      yield s.msg(`Received the ${L.name} Trophy and ${c} coins!`);
      for (const [it, n] of L.prize) { KP.give(it, n); yield s.msg(KP.got(it, n)); }
      if (L.n === 1) yield s.say(REG, 'Oh, and champions may go beyond the Coliseum now: they say there are legendary moogles up north, kupo...');
      if (L.n === 5) yield s.say(REG, 'The new World Champion! Your name goes up on the wall of champions, kupo!');
    } else {   // a rematch pays half the first win's coins (Pokemon's rematches: the late game's purse)
      const c = Math.floor(L.coins / 2) * KP.coinMul(d); d.money += c;
      yield s.msg(`(The trophy's already on your shelf.) Received ${c} coins for the win!`);
    }
  };

  // ------------------------------------------------------------------ the bracket: the whole tournament as a scene
  KP.bracket = function (L) { const w = { done: false, result: null }; S().push(new Bracket(L, w)); return w; };
  class Bracket {
    constructor(L, w) {
      this.L = L; this.w = w; this.t = 0; this.text = null; this.transparent = false;
      const me = { name: FF7.state.chars.cloud ? FF7.state.chars.cloud.name : 'Cloud', me: true, model: 'cloud' };
      const ent = KP.drawEntrants(L).map(e => Object.assign({}, e, { team: teamOf(e, L) }));   // (seven from the whole pool, every time)
      // the draw: all eight at random, every time (no fixed seeds)
      const all = [me].concat(ent), slots = [];
      while (all.length) slots.push(all.splice(Math.floor(Math.random() * all.length), 1)[0]);
      this.rounds = [slots];       // rounds[r] = who's in round r (8, 4, 2, 1)
      this.co = new FF7.Coroutine(this.flow());
    }
    enter() { FF7.audio.push('goldsaucer'); this.pushed = true; }
    *say(t, n) { this.text = t; let k = 0; while (this.text) { k++; if ((k > 12 && FF7.input.pressed('ok')) || k > (n || 150)) this.text = null; yield; } }
    // a question in the text box: up / down, OK (the choice's index)
    *choose(q, opts) {
      this.text = null; this.ask = { q, opts, idx: 0 }; let k = 0;
      for (;;) {
        k++; const I = FF7.input, a = this.ask;
        if (I.repeat('up') || I.repeat('down')) { a.idx = (a.idx + 1) % a.opts.length; sfx('cursor'); }
        if (k > 12 && I.pressed('ok')) { sfx('confirm'); this.ask = null; return a.idx; }
        yield;
      }
    }
    *flow() {
      const L = this.L, nR = Math.round(Math.log2(this.rounds[0].length)), names = ['Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'].slice(-nR);
      yield* this.say(`The ${L.name} begins! ${nR === 4 ? 'Sixteen' : 'Eight'} trainers, one champion!`, 120);
      let out = false;
      for (let r = 0; r < nR; r++) {
        const cur = this.rounds[r], next = new Array(cur.length / 2).fill(null);
        this.rounds.push(next);   // (its slots fill as the bouts end: each winner moves up, KP.Bracket advance)
        this.round = r;
        for (let i = 0; i < cur.length; i += 2) {
          const a = cur[i], b = cur[i + 1];
          if (a.me || b.me) {
            if (out) { yield* this.advance(r, i, a.me ? b : a); continue; }   // (already knocked out: the slot goes to the other)
            const o = a.me ? b : a;
            this.vs = o; this.pair = [a, b];   // (the two about to fight: lit up on the bracket)
            yield* this.say(`${names[r]}! ${a.me ? a.name : b.name} vs. ${o.name}!`, 120);
            const foes = KP.W.team(o.team, true);
            const res = !foes.length ? 'win' : yield KP.battle({ kind: 'trainer', foes, noBag: true, canLose: true, bg: 'arena', music: KP.tourneyMusic(), ai: L.ai,
              preview: true, foeLead: o.lead,   // (team preview: kp_preview.js; o.lead, a team's designed lead)
              trainer: { name: o.name, model: o.model, lose: o.lose, win: o.win, money: 0, style: o.style } });   // (no team: a walkover)
            this.vs = null; this.pair = null;
            KP.healAll();
            if (res === 'win') yield* this.advance(r, i, a.me ? a : b);
            else { out = true; this.outRound = r; yield* this.advance(r, i, o); }
          } else {
            // the others' bout: fought out on screen, both trainers played by the tactics AI (the Demo watches too)
            this.vs = b; this.vsA = a; this.pair = [a, b];
            yield* this.say(`${names[r]}! ${a.name} vs. ${b.name}!`, 100);
            const ma = KP.W.team(a.team, true), mb = KP.W.team(b.team, true);
            const res = !ma.length ? 'lose' : !mb.length ? 'win' : yield KP.battle({ kind: 'trainer', spectate: { name: a.name, model: a.model, mons: ma }, foes: mb, noBag: true, canLose: true, bg: 'arena', music: KP.tourneyMusic(), ai: 'max',
              preview: true, meLead: a.lead, foeLead: b.lead,
              trainer: { name: b.name, model: b.model, money: 0, style: b.style } });
            this.vs = null; this.vsA = null; this.pair = null;
            yield* this.advance(r, i, res === 'win' ? a : b);
          }
        }
        if (out && this.outRound === r) {
          yield* this.say(`${this.rounds[r].find(x => x.me).name} is out of the ${L.name}...`, 120);
          // (the user's rule: leave now, or stay in the stands and watch it to the end)
          if (r < nR - 1) {
            const c = yield* this.choose('Leave the tournament, or stay and watch the rest?', ['Leave', 'Stay and watch']);
            if (c === 0) {
              if (this.pushed) FF7.audio.pop(30);
              S().pop();
              this.w.result = { won: false, round: this.outRound + 1, final: nR, left: true }; this.w.done = true;
              return;
            }
          }
        }
        else if (!out) yield* this.say(r < nR - 1 ? `Through to the ${names[r + 1]}! Your moogles have been repaired.` : '', r < nR - 1 ? 120 : 1);
      }
      const champ = this.rounds[nR][0];
      if (champ.me) { sfx('levelup'); yield* this.say(`The winner of the ${L.name}... ${champ.name}!`, 200); }
      else yield* this.say(`${champ.name} wins the ${L.name}.`, 160);
      if (this.pushed) FF7.audio.pop(30);
      S().pop();
      this.w.result = { won: !!champ.me, round: out ? this.outRound + 1 : nR, final: nR }; this.w.done = true;
    }
    // a bout's winner moves up the bracket (the user, 2026-10-03: "why doesnt it animate them moving onto the next
    // stage"): its box slides along the line from its slot to the next round's, lands with a chime and a glow
    *advance(r, i, w) {
      this.adv = { p: w, r, src: this.rounds[r].indexOf(w), dst: Math.floor(i / 2), t0: this.t, n: 30 };
      for (let k = 0; k < 30; k++) yield;
      this.rounds[r + 1][Math.floor(i / 2)] = w; this.landed = { p: w, t0: this.t }; this.adv = null; sfx('ching');
      for (let k = 0; k < 14; k++) yield;
    }
    update() { this.t++; this.co.update(); }
    render() {
      const c = R.ctx, L = this.L;
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#101830'); g.addColorStop(1, '#2a3a6a'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      R.text(L.name.toUpperCase(), W / 2, 14, { size: 22, align: 'center', weight: '800', color: L.col });
      // the bracket, mirrored as the big tournaments draw theirs: half the field down the left, half down the right, each
      // round a column further in, the two finalists face to face in the middle and the champion above them. Every
      // box a portrait (their own model, KP.personIcon: the user, 2026-10-03) and a name
      // (the first round's boxes show a portrait and a name; the rounds further in, portrait tiles with the name under
      // them, so the columns sit apart and the lines between them show plainly: the user, 2026-10-03, "theyre too
      // squished"; the finalists and the champion in the middle are full boxes again)
      const n0 = this.rounds[0].length, nR = Math.round(Math.log2(n0)), big = nR === 4;
      const bw = big ? 96 : 116, bh = 36, ps = 34, T = 36, G = big ? 26 : 34, gap = big ? 44 : 88, top = big ? 46 : 52;
      const tile = (r) => r >= 1 && r < nR - 1;   // (a side round further in: a tile)
      const wOf = (r) => tile(r) ? T : bw;
      const offL = (r) => { let x = 4; for (let k = 0; k < r; k++) x += wOf(k) + G; return x; };
      const cx = (W - bw) / 2, yc = top + ((n0 / 2 - 1) / 2) * gap + bh / 2;   // (the middle line of each half)
      const pos = (r, i) => {
        if (r === nR) return { x: cx, y: yc - bh / 2 - 84, w: bw, side: 'C' };                                                   // the champion, above
        if (r === nR - 1) return { x: i === 0 ? W / 2 - T - 12 : W / 2 + 12, y: yc - bh / 2, w: T, side: 'C', tile: true, fin: i };  // the two finalists, side by side
        const half = n0 / Math.pow(2, r) / 2, side = i < half ? 'L' : 'R', j = i % half, span = Math.pow(2, r), w = wOf(r);
        return { x: side === 'L' ? offL(r) : W - offL(r) - w, y: top + (j * span + (span - 1) / 2) * gap, w, side, tile: tile(r) };
      };
      let made = 0;
      const pair = this.pair || [], fighting = (p) => pair.includes(p), pulse = 0.5 + 0.5 * Math.sin(this.t * 0.15);
      const line = (a, b, lit, hot) => {
        c.strokeStyle = hot ? `rgba(96,255,144,${0.55 + 0.45 * pulse})` : lit ? L.col : 'rgba(190,200,230,0.7)'; c.lineWidth = lit || hot ? 3 : 2; c.beginPath();   // (plain to see; gold the way a winner went; the pair about to fight, pulsing green: gold is the player's own box and no league colour is green)
        if (a.side === 'C') { const my = (a.y + b.y + bh) / 2; c.moveTo(a.x + a.w / 2, a.y); c.lineTo(a.x + a.w / 2, my); c.lineTo(b.x + b.w / 2, my); c.lineTo(b.x + b.w / 2, b.y + bh); }   // (a finalist up to the champion)
        else {
          const ax = a.side === 'L' ? a.x + a.w : a.x, bx = a.side === 'L' ? b.x : b.x + b.w, mx = (ax + bx) / 2;
          c.moveTo(ax, a.y + bh / 2); c.lineTo(mx, a.y + bh / 2); c.lineTo(mx, b.y + bh / 2); c.lineTo(bx, b.y + bh / 2);
        }
        c.stroke();
      };
      // every slot to the final from the start, the empty ones too, so the whole tree shows (the user: "i dont even
      // see a bracket line")
      const at = (r, i) => (this.rounds[r] || [])[i] || null, each = (fn) => { for (let r = 0; r <= nR; r++) for (let i = 0; i < n0 >> r; i++) fn(at(r, i), r, i); };
      each((p, r, i) => {
        if (r >= nR) return;
        const slot = at(r + 1, Math.floor(i / 2));
        line(pos(r, i), pos(r + 1, Math.floor(i / 2)), !!p && slot === p, !!p && fighting(p) && !slot);
      });
      if (this.rounds[nR] && this.rounds[nR][0]) R.text('★ CHAMPION ★', cx + bw / 2, pos(nR, 0).y - 18, { size: 13, align: 'center', color: L.col, weight: '800' });
      else R.text('CHAMPION', cx + bw / 2, pos(nR, 0).y - 16, { size: 11, align: 'center', color: 'rgba(200,210,240,0.6)', weight: '800' });
      R.text('FINAL', W / 2, yc + bh / 2 + 18, { size: 11, align: 'center', color: 'rgba(200,210,240,0.6)', weight: '800' });
      R.text('vs', W / 2, yc - 7, { size: 11, align: 'center', color: 'rgba(200,210,240,0.5)', weight: '800' });
      const icon = (p, x, y, size, alpha) => {
        if (!KP.drawPersonIcon) return;
        if (!KP.personIcon(p.model) && made < 2) { KP.personIcon(p.model, true); made++; }
        KP.drawPersonIcon(p.model, x, y, size, { alpha, ring: 'rgba(0,0,0,0)' });
      };
      const box = (p, q, gone, glow) => {
        const hot = fighting(p), w = q.w || bw, h = bh;
        c.save();
        if (hot || glow > 0) { c.shadowColor = hot ? '#60ff90' : L.col; c.shadowBlur = hot ? 10 + 12 * pulse : 16 * glow; }
        c.fillStyle = p.me ? 'rgba(80,60,10,0.92)' : hot ? 'rgba(14,52,30,0.95)' : 'rgba(10,16,40,0.9)'; c.fillRect(q.x, q.y, w, h);
        c.restore();
        c.strokeStyle = hot ? `rgba(96,255,144,${0.7 + 0.3 * pulse})` : p.me ? '#ffd860' : 'rgba(200,210,240,0.6)'; c.lineWidth = hot ? 2.5 : 1.5; c.strokeRect(q.x + 0.5, q.y + 0.5, w - 1, h - 1);
        if (q.tile) {   // (a tile: the portrait, the name under it)
          icon(p, q.x + 1, q.y + 1, ps, gone ? 0.4 : 1);
          R.textFit(p.name, q.x + w / 2, q.y + h + 2, T + G - 4, { size: big ? 9 : 11, minSize: 7, align: 'center', color: gone ? '#7a8098' : p.me ? '#ffe080' : '#e8ecf6' });
          return;
        }
        const px = q.side === 'R' ? q.x + w - ps - 1 : q.x + 1;
        icon(p, px, q.y + 1, ps, gone ? 0.4 : 1);
        const tx = q.side === 'R' ? q.x + 4 : q.x + ps + 5, tw = w - ps - 9;
        R.textFit(p.name, q.side === 'R' ? tx + tw : tx, q.y + 11, tw, { size: big ? 11 : 13, minSize: 8, align: q.side === 'R' ? 'right' : 'left', color: gone ? '#7a8098' : p.me ? '#ffe080' : '#ffffff' });
      };
      each((p, r, i) => {
        if (p) return;
        const q = pos(r, i);   // (a slot still to be won: an empty frame)
        c.fillStyle = 'rgba(10,16,40,0.55)'; c.fillRect(q.x, q.y, q.w, bh);
        c.save(); c.setLineDash([4, 3]); c.strokeStyle = 'rgba(190,200,230,0.45)'; c.lineWidth = 1.5; c.strokeRect(q.x + 0.5, q.y + 0.5, q.w - 1, bh - 1); c.restore();
      });
      each((p, r, i) => {
        if (!p) return;
        const nx = this.rounds[r + 1], slot = nx ? nx[Math.floor(i / 2)] : null, gone = !!slot && slot !== p;
        const lg = this.landed && this.landed.p === p && this.rounds[r + 1] && !this.rounds[r + 1].includes(p) ? Math.max(0, 1 - (this.t - this.landed.t0) / 40) : 0;   // (just arrived: a fading glow)
        box(p, pos(r, i), gone, lg);
      });
      if (this.adv) {   // (the one moving up: along its line, eased, over the rest, a tile on the way)
        const A = this.adv, a = pos(A.r, A.src), b = pos(A.r + 1, A.dst), k = Math.min(1, (this.t - A.t0) / A.n), e = 1 - Math.pow(1 - k, 3);
        const ax = a.side === 'R' && !a.tile ? a.x + a.w - T : a.x, bx = b.tile ? b.x : b.x + (b.w - T) / 2;   // (from its portrait to the slot, or the champion box's middle)
        box(A.p, { x: ax + (bx - ax) * e, y: a.y + (b.y - a.y) * e - Math.sin(k * Math.PI) * 10, w: T, tile: true, side: a.side }, false, 0.8);
      }
      R.window(0, H - 80, W, 80);
      const vsB = this.vs, vsA = this.vsA || (this.vs ? this.rounds[0].find(p => p.me) : null);
      if (vsB && vsA && KP.drawPersonIcon) {   // (the match on: the two of them, face to face)
        KP.drawPersonIcon(vsA.model, W - 160, H - 74, 64, { ring: vsA.me ? '#ffd860' : 'rgba(200,210,240,0.8)' });
        KP.drawPersonIcon(vsB.model, W - 74, H - 74, 64, { ring: '#ff8080' });
        R.text('VS', W - 86, H - 50, { size: 14, weight: '800', align: 'center', color: L.col });
      }
      if (this.text) R.para(this.text, 22, H - 66, W - 44 - (vsB ? 150 : 0), { size: 17, lines: 2 });
      if (this.ask) {   // (the question, its options beside it)
        R.para(this.ask.q, 22, H - 66, W - 230, { size: 16, lines: 2 });
        this.ask.opts.forEach((o, i) => R.text(o, W - 180, H - 66 + i * 26, { size: 16, color: i === this.ask.idx ? '#ffffff' : '#a0a8c0' }));
        R.cursor(W - 196, H - 55 + this.ask.idx * 26);
      }
    }
  }
  KP.Bracket = Bracket;
})();
