// The Kupo League (docs/KUPOMON_WORLD.md "The Kupo League"): the end of Kupomon's story, Pokémon's League. Through the
// north door of the Coliseum's Grand Hall: the Elite Four (the Turks, each a job's specialist: Elena the Ranger, Reno the
// Black Mage, Rude the Warrior, Tseng the Knight: a final gauntlet's ramp, Lv 27 to 30, the max AI), one after another,
// each repairing the challenger's team once beaten (no bag items in battle: none in any trainer battle); then
// the Champion's Chamber, where both rivals got through at the same moment and fight each other for the empty Champion's
// seat while Cloud watches (a real battle, both sides played by the tactics AI: either can win), and the winner is the
// last battle. Lose anywhere and it's back to the Mog Center and the first room. Then the Hall of Fame, and Prof. Sith
// (on Big Mog) with news of the Coliseum's tournaments: the post-game.
//   flags: kp_e4_1..4 (this run's wins), kp_champ_rival ('zack' | 'sephiroth': who won the bout), kp_champion, kp_hof_done
(function () {
  const KP = FF7.kupomon, W = KP.W;
  const E4 = ['kp_e4_1', 'kp_e4_2', 'kp_e4_3', 'kp_e4_4'];
  KP.ITEMS.ss_ticket = { name: 'S.S. Moogle Ticket', kind: 'key', price: 0,
    desc: "Prof. Sith's gift to the new Champion: passage on the S.S. Moogle, from the pier on Route 10 to Costa del Kupo, the tournament isle." };
  const reset = (s) => { E4.concat(['kp_champ_rival']).forEach(f => s.unset(f)); };
  // a team at the League's strength: fully evolved, held items, competitive moves (what each knows by its level, and
  // any Skill Chip). lv: one level for all, or a list; a moogle is never below the level its kind is reached at
  const PRE = () => { const o = {}; for (const k of Object.keys(KP.SPECIES)) { const e = KP.SPECIES[k].evo; if (e) o[e.to] = e.at; } return o; };
  const team = (list, plus, lv = KP.MAX_LEVEL) => { const pre = PRE(); return W.team(KP.leagueHeld(list.map((sp, i) => {
    const f = KP.finalOf(sp), l = Math.min(KP.MAX_LEVEL, Math.max(KP.LV(Array.isArray(lv) ? lv[i] : lv), pre[f] || 1));   // (the Four's levels written for 30)
    return [f, l, { plus, moves: KP.compMoves(f, l) }];
  })), true); };
  // six a team (the user, 2026-10-03: teams of six, the Elite Four and the Champion too): a team written with fewer takes
  // the rest, the same every time, at its top level: kinds of the trainer's own job for the Four (o.type), never a legend
  const JOB = { Ranger: 'ranger', 'Black Mage': 'blackmage', Warrior: 'warrior', Knight: 'knight' };
  const sixOf = (list, lvs, name, type) => {
    const t = list.map((sp, i) => [sp, Array.isArray(lvs) ? lvs[i] : lvs]);
    while (t.length < (KP.PARTY_MAX || 6) && KP.sixthFor) { const x = KP.sixthFor(t, name, { type, noLegend: true }) || KP.sixthFor(t, name, { noLegend: true }); if (!x) break; t.push([x, Math.max(...t.map(e => e[1]))]); }
    return t;
  };
  // a lost battle in the League: this run's wins are gone, then the blackout (back to the last Mog Center)
  const lost = function* (s) { reset(s); yield* KP.blackout(s); };

  // ------------------------------------------------------------------ the Elite Four
  const ELITE = [
    { n: 1, id: 'kl_elena', name: 'Elena', model: 'elena', type: 'Ranger', map: 'kp_kl_1', next: 'kp_kl_2',
      team: ['angler_harpooner', 'flintkin_flintlock', 'huntmog_trapper', 'fletchmog_sniper'], lv: [27, 27, 27, 28],
      intro: "Welcome to the Kupo League! I'm Elena of the Turks, first of the Elite Four.\fThe others think I'm the easy one. Rookie this, rookie that. I've been practising my aim, you know! Every. Single. Day.\fFire!",
      lose: "Ugh! Missed by THAT much. ...Go on. Reno's next. Don't let him talk you to death.",
      after: "Reno's through that door. Try not to let him get under your skin. He's good at that." },
    { n: 2, id: 'kl_reno', name: 'Reno', model: 'reno', type: 'Black Mage', map: 'kp_kl_2', next: 'kp_kl_3',
      team: ['chillkin_elementalist', 'spookmog_necromancer', 'embermog_archmage', 'voltkin_stormcaller'], lv: [28, 28, 28, 28],
      intro: "Yo. Reno, of the Turks. Second of the Elite Four, and the best-looking, yo.\fMy moogles do lightning, fire, ice... all the fun stuff. Hope you brought a lightning rod.",
      lose: "...Tch. Fine, fine. You're the real deal, yo. Rude's up next. He won't say much. He doesn't need to.",
      after: "Rude's in the next room. Say hi for me. He won't say it back." },
    { n: 3, id: 'kl_rude', name: 'Rude', model: 'rude', type: 'Warrior', map: 'kp_kl_3', next: 'kp_kl_4',
      team: ['seamog_captain', 'chopkin_ravager', 'spellmog_spellblade', 'kenkupo_sword_saint', 'bustermog_first_class'], lv: [28, 28, 28, 29, 29],
      intro: '......\f......Rude. Third of the Elite Four.\f......Let\'s go.',
      lose: '......Good fight.\f......Tseng is waiting.',
      after: '......' },
    { n: 4, id: 'kl_tseng', name: 'Tseng', model: 'tseng', type: 'Knight', map: 'kp_kl_4', next: 'kp_kl_champ',
      team: ['shellmog_guardian', 'mogsquire_paladin', 'mysticmog_mystic_knight', 'aegimog_holy_knight', 'leomog_gunbreaker'], lv: [29, 29, 29, 30, 30],
      intro: "I am Tseng, leader of the Turks and the last of the Elite Four.\fThree of my best could not stop you. I will not make their mistakes. My knights hold the line.\fShow me what got you this far.",
      lose: "...Impressive. The Champion's Chamber lies beyond.\fYou should know: two other challengers reached it before you. Both at once. They're deciding which of them sits in the Champion's seat.",
      after: 'The Champion\'s Chamber is through that door. Go. Something is about to be decided in there.' },
  ];
  // (each of the Four's six: its pack's themed team or its own, topped up to six; the Demo's planner reads it too)
  const eliteSix = (e) => { const ov = KP.TEAM_OVERRIDES && KP.TEAM_OVERRIDES[e.id]; return sixOf(ov ? ov.map(x => x[0]) : e.team, ov ? ov.map(x => x[1]) : e.lv, 'elite ' + e.name, JOB[e.type]); };
  if (KP.TRAINER_DEFS) ELITE.forEach(e => { KP.TRAINER_DEFS[e.id] = { id: e.id, kind: 'elite', cls: 'Elite Four', name: e.name, get team() { return eliteSix(e); }, bg: 'arena' }; });
  const eliteTalk = (e) => function* (s) {
    const flag = E4[e.n - 1];
    if (s.flag(flag)) { yield s.say(e.name, e.after); return; }
    yield s.say(e.name, e.intro);
    const six = eliteSix(e);   // (a pack's themed team, [[species, level]]: docs/KUPOMON_CONTENT.md "Trainers"; six of them)
    const r = yield* KP.fight(s, { kind: 'trainer', foes: team(six.map(x => x[0]), 0, six.map(x => x[1])), canLose: true, ai: 'max', bg: 'arena', music: 'birthofgod',
      trainer: { name: 'Elite Four ' + e.name, lose: e.lose, money: 4000 + 1000 * e.n, model: e.model } });
    if (r !== 'win') { yield* lost(s); return; }
    s.set(flag);
    yield s.say(e.name, e.lose);
    // (each of the Four repairs the challenger's team after the battle: every room a fair fight)
    KP.healAll(); s.sfx('heal');
    yield s.msg(`${e.name} has ${s.name('cloud')}'s moogles fully repaired.`);
    s.sfx('gate');
    yield s.msg('Somewhere behind ' + e.name + ', a great door unbolts.');
  };
  // a room of the Four: the challenger comes in at the bottom (no way back); the door at the top opens on a win
  const room = (e, look, grid, extra = {}) => FF7.defineMap(e.map, Object.assign({
    name: 'Kupo League - ' + e.name + "'s Room", area: 'Kupo Coliseum', theme: 'temple', music: 'othermountain', kpBg: 'arena',
    look: Object.assign({ wallH: 3.6, sky: ['#000000', '#000000'], indoor: true }, look),
    grid,
    entries: { from_prev: [7, 11, 'up'] },
    exits: [{ at: [7, 0, 2, 1], to: e.next, entry: 'from_prev', sfx: 'door', if: s => s.flag(E4[e.n - 1]),
      blocked: function* (s) { yield s.msg(`The door is sealed. ${e.name} of the Elite Four stands before it.`); } }],
    npcs: [{ id: e.id, name: e.name, model: e.model, at: [7, 4], dir: 'down', talk: eliteTalk(e) }],
    lights: [[7.5, 4, look.lamp || '#fff0d0', 6], [7.5, 9, '#fff0d0', 4]],
  }, extra));
  // Elena: a firing range (targets along the walls)
  room(ELITE[0], { floor: ['#8a8070', '#827868'], floor3: ['#a02a2a', '#982626'], wall: '#6a6a72', trim: '#c8a040', lamp: '#ffe8c0', floorTex: { floor3: 'carpet' } }, [
    "#######++#######",
    "#..............#",
    "#.B..........B.#",
    "#......__......#",
    "#......__......#",
    "#.o....__....o.#",
    "#......__......#",
    "#......__......#",
    "#.B....__....B.#",
    "#......__......#",
    "#......__......#",
    "#......__......#",
    "################",
  ], { props: [[1, 3], [14, 3], [1, 7], [14, 7]].map(([x, y]) => ({ at: [x, y], prop: 'banner', col: '#e8e0d0', col2: '#a02a2a', y: 1.6, h: 1.0, w: 0.9, text: '◎', size: 0.5, textCol: '#a02a2a' })) });
  // Reno: a crackling machine room (blue light, pipes)
  room(ELITE[1], { floor: ['#3a4250', '#343c4a'], floor3: ['#2a5aa0', '#265498'], wall: '#2a2e38', trim: '#60c0ff', lamp: '#80d0ff', floorTex: { floor3: 'carpet' } }, [
    "#######++#######",
    "#PP..........PP#",
    "#M............M#",
    "#......__......#",
    "#......__......#",
    "#M.....__.....M#",
    "#......__......#",
    "#......__......#",
    "#P.....__.....P#",
    "#......__......#",
    "#......__......#",
    "#......__......#",
    "################",
  ]);
  // Rude: a training hall (sandbags, mats)
  room(ELITE[2], { floor: ['#a88a5a', '#a08252'], floor3: ['#3a3a3a', '#343434'], wall: '#5a4030', trim: '#c8a040', lamp: '#ffd890', floorTex: { floor: 'wood', floor3: 'carpet' } }, [
    "#######++#######",
    "#..............#",
    "#.o..........o.#",
    "#......__......#",
    "#......__......#",
    "#.o....__....o.#",
    "#......__......#",
    "#......__......#",
    "#.o....__....o.#",
    "#......__......#",
    "#......__......#",
    "#......__......#",
    "################",
  ]);
  // Tseng: an office at the top of a tower (desks, shelves, a long window)
  room(ELITE[3], { floor: ['#5a5868', '#545262'], floor3: ['#6a1a2a', '#641826'], wall: '#3a3848', trim: '#c8c8d8', lamp: '#e8f0ff', floorTex: { floor3: 'carpet' } }, [
    "#######++#######",
    "#kk..........kk#",
    "#..............#",
    "#..D...__...D..#",
    "#......__......#",
    "#......__......#",
    "#|.....__.....|#",
    "#......__......#",
    "#......__......#",
    "#|.....__.....|#",
    "#......__......#",
    "#......__......#",
    "################",
  ]);

  // ------------------------------------------------------------------ the Champion's Chamber
  const CH = [
    "#########++#########",
    "#|................|#",
    "#.....uDDDDDDu.....#",
    "#..................#",
    "#|.......__.......|#",
    "#........__........#",
    "#........__........#",
    "#|.......__.......|#",
    "#........__........#",
    "#........__........#",
    "#|.......__.......|#",
    "#........__........#",
    "#........__........#",
    "####################",
  ];
  // (the Champion's battle: one theme whoever won the seat, as the rivals share theirs)
  const RIVAL = { zack: { name: 'Zack', model: 'zack', music: 'onewinged' }, sephiroth: { name: 'Sephiroth', model: 'sephiroth', music: 'onewinged' } };
  // (the rivals here: at Cloud's highest level, each at its line's stage for it; every Skill Chip by now)
  const rivalTeam = (who) => { const base = W.rivalAt(who, 'champion'), six = sixOf(base.map(x => x[0]), base.map(x => x[1]), 'champion ' + who);   // (six: the sixth the same every time)
    return W.team(KP.leagueHeld(six.map(([sp, lv]) => { const f = KP.finalOf(sp); return [f, lv, { moves: KP.compMoves(f, lv) }]; })), true); };
  const championScene = function* (s) {
    if (s.flag('kp_champion')) return;
    yield s.face('player', 'up');
    yield 20;
    yield s.say('zack', "Cloud! You made it through the Elite Four too?! Of COURSE you did.");
    yield s.say('sephiroth', '...Late, as always.');
    yield s.say('zack', "So here's the thing. The Champion's seat's been empty since the old Champion stepped down.\fSeph and I walked out of Tseng's room at the exact same second. We've been arguing about who goes first ever since.");
    yield s.say('sephiroth', "There is nothing to argue about. We settle it here. Whoever is left standing faces you, Cloud.\fWatch closely. You'll want to know what you're up against.");
    yield s.say('zack', "Ha! You heard him, buddy. Grab a seat. This one's for the title!");
    // the bout: Zack and Sephiroth, both played by the tactics AI; nothing decides it but the battle itself
    yield s.face('kl_zack', 'right'); yield s.face('kl_seph', 'left');
    const res = yield KP.battle({ kind: 'trainer', spectate: { name: 'Zack', model: 'zack', mons: rivalTeam('zack') }, foes: rivalTeam('sephiroth'), noBag: true, canLose: true,
      bg: 'arena', music: 'judgement', ai: 'max', trainer: { name: 'Sephiroth', model: 'sephiroth', money: 0 } });
    const win = res === 'win' ? 'zack' : 'sephiroth', loser = win === 'zack' ? 'sephiroth' : 'zack';
    s.set('kp_champ_rival', win);
    if (win === 'zack') {
      yield s.say('sephiroth', '......\f...So. That is how it ends. For now.');
      yield s.say('zack', "Whoa... I actually did it! Seph, that was the best battle of my LIFE.");
    } else {
      yield s.say('zack', "Aw, man...! So close! Seph, you're a monster. In the nicest possible way.");
      yield s.say('sephiroth', '......You fought well, Zack. Now step aside.');
    }
    yield s.move(loser === 'zack' ? 'kl_zack' : 'kl_seph', loser === 'zack' ? [[4, 6], [3, 3]] : [[15, 6], [16, 3]]);
    yield s.face(loser === 'zack' ? 'kl_zack' : 'kl_seph', 'down');
    const W8 = win === 'zack' ? 'kl_zack' : 'kl_seph';
    yield s.move(W8, 9, 4); yield s.face(W8, 'down');
    yield s.say(win, win === 'zack' ? "Okay, Cloud. Just you and me now. Same as it ever was.\fGive me everything you've got, buddy. I'm not going easy on the Champion's first challenger!"
      : 'Cloud.\fFrom the very first day in that lab, I knew it would come to this. You and I, and nothing in between.\fShow me. Everything.');
    const R = RIVAL[win];
    const r = yield* KP.fight(s, { kind: 'trainer', foes: rivalTeam(win), canLose: true, ai: 'max', bg: 'arena', music: R.music,
      trainer: { name: 'Champion ' + R.name, model: R.model, money: 20000, lose: win === 'zack' ? "That's... it? I lost? ...Ha! HA! Cloud, you're the Champion!" : '...So this is your answer. Then wear it well, Champion.' } });
    if (r !== 'win') { yield* lost(s); return; }
    s.set('kp_champion'); s.sfx('levelup');
    if (KP.real && KP.real.state && !KP._demoRun) KP.real.state.flags.kupomon_champion = true;   // (the FF7 game's record: Cait Sith will want to hear, KP.championIn)
    yield s.say(win, win === 'zack' ? "Look at you! The Champion of the Kupo League! I'm so proud I could cry. I'm not crying. Shut up."
      : "...The Champion's seat is yours, Cloud. Keep it warm. I'll be back for it.");
    yield s.say(loser, loser === 'zack' ? "Cloud!! You beat him!! I KNEW it! Champion Cloud! Has a ring to it!" : '...Hmph. Well done, Cloud.');
    yield s.msg('A door swings open behind the Champion\'s seat. A warm light spills out.');
    yield s.goto('kp_kl_fame', 'from_champ');
  };
  FF7.defineMap('kp_kl_champ', {
    name: "Kupo League - Champion's Chamber", area: 'Kupo Coliseum', theme: 'temple', music: 'reunion', kpBg: 'arena',
    look: { floor: ['#e8e2d4', '#e0dacc'], floor3: ['#a02a2a', '#982626'], wall: '#e0d8c4', trim: '#c8a040', wallH: 4.4, pillar: '#f0ead8', sky: ['#000000', '#000000'], indoor: true,
      floorTex: { floor: 'marble', floor3: 'carpet' } },
    grid: CH,
    props: [{ at: [9.5, 0], prop: 'viewwindow', w: 6, h: 2.2, y: 1.2, col: ['#5a8ad0', '#f0f6ff'], col2: '#c8a040', bars: 4 },
      { at: [9.5, 1.6], prop: 'banner', col: '#e8c040', col2: '#a02a2a', y: 3.0, h: 0.8, w: 4, text: 'CHAMPION', size: 0.2, textCol: '#a02a2a' }],   // (3.0: at 3.6 it hung above the screen)
    lights: [[9.5, 3, '#fff0d0', 7], [9.5, 9, '#fff0d0', 6]],
    entries: { from_prev: [9, 12, 'up'] },
    exits: [{ at: [9, 0, 2, 1], to: 'kp_kl_fame', entry: 'from_champ', sfx: 'door', if: s => s.flag('kp_champion'),
      blocked: function* (s) { yield s.msg("The Hall of Fame's door. Only the Champion may pass."); } }],
    npcs: [
      { id: 'kl_zack', name: 'Zack', model: 'zack', at: [7, 6], dir: 'right', show: s => !s.flag('kp_champion'), talk: function* (s) { yield s.say('zack', 'Watch this, buddy!'); } },
      { id: 'kl_seph', name: 'Sephiroth', model: 'sephiroth', at: [12, 6], dir: 'left', show: s => !s.flag('kp_champion'), talk: function* (s) { yield s.say('sephiroth', '...'); } },
    ],
    onEnter: championScene,
  });

  // ------------------------------------------------------------------ the Hall of Fame, and Prof. Sith with the news
  KP.hallOfFame = function () { const w = { done: false }; FF7.sceneMgr.push(new HallOfFame(w)); return w; };
  class HallOfFame {
    constructor(w) { this.w = w; this.t = 0; this.i = 0; this.team = KP.data().party.slice(); this.transparent = false; }
    update() {
      const I = FF7.input; this.t++;
      if (this.t < 40) return;
      if (I.pressed('ok') || I.back()) {
        FF7.audio.sfx('confirm'); this.t = 0;
        if (++this.i > this.team.length) { FF7.sceneMgr.pop(); this.w.done = true; }
      }
    }
    render() {
      const R = FF7.render, c = R.ctx, W_ = FF7.W, H_ = FF7.H;
      const g = c.createLinearGradient(0, 0, 0, H_); g.addColorStop(0, '#1a0e3a'); g.addColorStop(1, '#5a2a6a'); c.fillStyle = g; c.fillRect(0, 0, W_, H_);
      for (let k = 0; k < 40; k++) { const x = (k * 97 + this.t * 0.6) % W_, y = (k * 53) % H_; c.fillStyle = 'rgba(255,240,200,' + (0.25 + 0.25 * Math.sin(this.t / 15 + k)) + ')'; c.fillRect(x, y, 2, 2); }
      R.text('HALL OF FAME', W_ / 2, 26, { size: 22, align: 'center', color: '#ffd860' });
      if (this.i < this.team.length) {
        const m = this.team[this.i], k = Math.min(1, this.t / 30);
        KP.drawMoogleIcon(m, W_ / 2 - 110, 70, 220, { alpha: k });
        R.text(KP.name(m), W_ / 2, 304, { size: 20, align: 'center' });
        R.text(`${KP.jobName(m)}   Lv ${m.lv}${m.plus ? '   +' + m.plus : ''}`, W_ / 2, 334, { size: 14, align: 'center', color: '#e8d8ff' });
        R.text(`${this.i + 1} / ${this.team.length}`, W_ / 2, 364, { size: 12, align: 'center', color: '#b8a8d8' });
      } else {
        this.team.forEach((m, j) => KP.drawMoogleIcon(m, W_ / 2 - this.team.length * 56 + j * 112, 110, 108));
        R.text(`Welcome to the Hall of Fame, Champion ${FF7.state.chars.cloud ? FF7.state.chars.cloud.name : 'Cloud'}!`, W_ / 2, 270, { size: 18, align: 'center', color: '#ffd860' });
        R.text('Your team and its names are written here forever.', W_ / 2, 300, { size: 13, align: 'center', color: '#e8d8ff' });
      }
      R.text('OK: next', W_ - 20, H_ - 24, { size: 11, align: 'right', color: '#b8a8d8' });
    }
  }
  KP.HallOfFame = HallOfFame;
  const fameScene = function* (s) {
    if (!s.flag('kp_champion') || s.flag('kp_hof_done')) return;
    yield s.face('player', 'up');
    yield 30;
    yield s.msg('A pedestal glows at the top of the room. Cloud lays his moogles\' capsules on it, one by one...');
    s.music('fanfare' in (FF7.AUDIO_MAP && FF7.AUDIO_MAP.music || {}) ? 'fanfare' : 'fiveyears');
    const d = KP.data(); (d.hallOfFame = d.hallOfFame || []).push({ time: FF7.state.time || 0, team: d.party.map(m => ({ sp: m.sp, lv: m.lv, plus: m.plus || 0, name: KP.name(m) })) });
    yield KP.hallOfFame();
    s.set('kp_hof_done');
    // Prof. Sith comes down on Big Mog (his own mount: the cat on the big moogle) with the news
    const p = s.field.player;
    s.spawn('kl_sith', 'caitsith', p.tx + 1, p.ty - 2, 'down', { solid: false, hover: 8, name: 'Prof. Sith' });
    s.sfx('chocobo_tune');
    yield s.hover('kl_sith', 0, 80);
    s.emote('kl_sith', '♪', 40);
    yield s.say('Prof. Sith', "Och, would ye look at that! The Champion o' the Kupo League! I came as fast as Big Mog would carry me, laddie!");
    yield s.say('Prof. Sith', "From a wee starter in my lab to the Champion's seat. I'm prouder than a moogle with a brand-new pom-pom, so I am.");
    yield s.say('Prof. Sith', "Now, listen here. Out past the Seabreeze Coast there's an island: Costa del Kupo. Sun, sand... and the Battle Square, where the tournaments are held.\fGold, Platinum, Diamond, Master... and at the very top, the World Championship. Every great trainer on the isles goes there, and only Champions may enter. Which means you, now!");
    yield s.say('Prof. Sith', "So here's a wee gift from an old professor: a ticket for the S.S. Moogle. She sails from the pier on Route 10.");
    KP.give('ss_ticket', 1); s.set('kp_ss_ticket'); s.sfx('found');
    yield s.msg(`${s.name('cloud')} received the S.S. Moogle Ticket!`);
    yield s.say('Prof. Sith', "And between you an' me... the reigning World Champion's been waitin' a long time for someone worth his while. Heh heh.\fCongratulations again, Champion. Ye've made this old cat very proud.");
    s.emote('kl_sith', '♪', 40);
    yield s.hover('kl_sith', 9, 60);
    s.remove('kl_sith');
  };
  FF7.defineMap('kp_kl_fame', {
    name: 'Kupo League - Hall of Fame', area: 'Kupo Coliseum', theme: 'temple', music: 'ahead', kpBg: 'arena',
    look: { floor: ['#f0ead8', '#e8e2d0'], floor3: ['#c8a040', '#c09838'], wall: '#f4eee0', trim: '#c8a040', wallH: 4, pillar: '#fff8e8', sky: ['#000000', '#000000'], indoor: true,
      floorTex: { floor: 'marble' } },
    grid: [
      "##############",
      "#|....Z.....|#",
      "#......_.....#",
      "#|.....__...|#",
      "#......__....#",
      "#|.....__...|#",
      "#......__....#",
      "#......__....#",
      "######++######",
    ],
    lights: [[6.5, 1.5, '#fff4c0', 6]],
    entries: { from_champ: [6, 7, 'up'], from_hall: [6, 7, 'up'] },
    exits: [{ at: [6, 8, 2, 1], to: 'kp_coliseum_hall', entry: 'from_league', sfx: 'door' }],
    triggers: [{ at: [6, 1], on: 'talk', run: function* (s) {
      const hof = (KP.data().hallOfFame || []);
      if (!hof.length) { yield s.msg('The Hall of Fame. Its pages are blank.'); return; }
      const last = hof[hof.length - 1];
      yield s.msg(`The Hall of Fame: ${hof.length} ${hof.length > 1 ? 'entries' : 'entry'}. The latest: ${last.team.map(m => `${m.name} (Lv ${m.lv})`).join(', ')}.`);
    } }],
    onEnter: fameScene,
  });

  // ------------------------------------------------------------------ the way in: the Grand Hall's north door and its guard
  KP.klGuard = function* (s) {
    if (s.flag('kp_champion')) { yield s.say('League Guard', "Champion! The Hall of Fame is through here whenever you like. And the Elite Four always want a rematch."); }
    if (!KP.leagueReady()) { yield s.say('League Guard', `This is the Kupo League, kupo: the Elite Four, then the Champion. You need all eight dojo badges to go in. You have ${KP.badgeCount()}.`); return; }
    if (!s.flag('kp_kl_met')) {
      s.set('kp_kl_met');
      yield s.say('League Guard', "Eight badges! You may challenge the Kupo League, kupo.\fFour of the Elite, one after another, then the Champion's Chamber. Each one you beat repairs your team for the next. And no bag items in battle, same as any trainer.\fOh, and the species clause: one of each kind of moogle on your team. No doubling up.\fLose, and it's back to square one. Win, and your name goes in the Hall of Fame.");
    }
    const dup = KP.clauseDups ? KP.clauseDups() : [];
    if (dup.length) { yield s.say('League Guard', `Not so fast, kupo. The Kupo League has a species clause: one of each kind of moogle on your team.\fYou've got more than one ${KP.clauseNames(dup)}. Swap the extra out at the Mog Box and come back.`); return; }
    const c = yield s.ask('League Guard', 'Once you go through, there is no turning back until you win or lose. Ready?', ['Yes', 'Not yet']);
    if (c !== 0) { yield s.say('League Guard', 'Take your time. Get some rest at the Mog Center, and stock up!'); return; }
    reset(s);
    yield s.goto(s.flag('kp_champion') ? 'kp_kl_1' : 'kp_kl_1', 'from_prev');
  };
})();
