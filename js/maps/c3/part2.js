// Chapter 3 (part 2) — Wall Market: the dress-up quest (dress, wig, cologne, tiara, Honey Bee Inn),
// every shop, the inn and its vending machine, the gym ("Men's Hall"), and Don Corneo's mansion
// (Tifa in the basement, the bride audition, the lackeys, the confession and the trapdoor).
// Corneo's choice follows references/text/Don_Corneo_Mechanics_Guide.txt (see C3.corneoPick).
(function () {
  const C3 = FF7.c3 = FF7.c3 || {};

  // ---------------------------------------------------------------- helpers
  C3.inDress = s => s.flag('c3_dressed') && !s.flag('c3_fell_sewer');
  C3.dressModel = function (s) {
    const dress = s.has('silk_dress') ? '#6a3aa0' : s.has('satin_dress') ? '#8a52b0' : '#9a86c4';
    const hair = s.has('blonde_wig') ? '#f2d24a' : s.has('dyed_wig') ? '#b0502a' : '#6a4a2a';
    return { base: 'cloud', top: dress, sleeve: dress, bottom: dress, skirt: 'long', hairStyle: 'braid', hair, female: true, boots: '#5a2a80', gloves: dress, extras: ['bow'] };
  };
  C3.applyDress = function (s) { if (C3.inDress(s)) s.setModel('player', C3.dressModel(s)); };
  // Who does the Don pick? (Don_Corneo_Mechanics_Guide.txt, section 2.2)
  // The guide's tables: a Cotton or Satin dress, or any wig but the Blonde Wig -> always Tifa.
  // With Silk Dress + Blonde Wig (5 + 5), the cologne (1/3/5), the tiara (1/3/5) and the one-time
  // Honey Bee make-up bonus (1/3/5, random) decide: 20+ -> Cloud, 13-19 -> Aeris, otherwise Tifa.
  // Underwear is glitched in FF7 and adds nothing.
  C3.corneoPick = function (s) {
    if (!s.has('silk_dress') || !s.has('blonde_wig')) return 1;
    const lvl = (a, b, c) => s.has(c) ? 5 : s.has(b) ? 3 : s.has(a) ? 1 : 0;
    const pts = 10 + lvl('cologne', 'flower_cologne', 'sexy_cologne') + lvl('glass_tiara', 'ruby_tiara', 'diamond_tiara') + s.get('c3_makeup_pts');
    return pts >= 20 ? 3 : pts >= 13 ? 2 : 1;     // 1 = Tifa, 2 = Aeris, 3 = Cloud
  };
  // The squats minigame result: 'win' | 'tie' | 'lose' (accepts booleans, numbers or result objects).
  // Minigames return { won, score, ... }; a tie is reported by tie/draw, or by score === the rival's score.
  C3.squatResult = function (r) {
    if (r && typeof r === 'object') {
      const rival = [r.opponent, r.opponentScore, r.rival, r.rivalScore, r.cpu].find(v => typeof v === 'number');
      if (r.tie || r.draw || (r.won === false && rival != null && r.score === rival)) return 'tie';
      if (r.won != null) r = r.won ? 'win' : 'lose';
      else if (r.result != null) r = r.result;
      else if (r.win != null) r = r.win ? 'win' : 'lose';
      else if (r.score != null && rival != null) r = r.score > rival ? 'win' : r.score === rival ? 'tie' : 'lose';
    }
    if (r === true || r === 'win' || r === 'won') return 'win';
    if (r === 'tie' || r === 'draw') return 'tie';
    if (typeof r === 'number') return r > 0 ? 'win' : r === 0 ? 'tie' : 'lose';
    return 'lose';
  };
  // The squat contest (s.minigame('squats')). If the minigame module isn't loaded, fall back to a roll.
  C3.squats = function* (s) {
    if (FF7.minigames && typeof FF7.minigames.start === 'function') return C3.squatResult(yield s.minigame('squats', { opponentName: 'Big Bro' }));
    yield s.msg('Hup! Hup! Hup! Hup!\nThe squat-off is a blur of sweat, grunting and counting......');
    const r = s.random(10);
    return r < 4 ? 'win' : r < 7 ? 'tie' : 'lose';
  };
  C3.aerisIn = function (s, x, y, dir) { s.spawn('aeris', 'aeris', x, y, dir || 'down', { name: s.name('aeris') }); };
  const KOTCH = { base: 'man', build: 'fat', top: '#7a3a2a', sleeve: 'skin', bottom: '#3a3030', hair: '#2a2020', hairStyle: 'buzz', extras: ['belt'] };
  const SCOTCH = { base: 'man', build: 'big', top: '#2a2a30', sleeve: '#2a2a30', bottom: '#2a2a30', hair: '#d0a040', hairStyle: 'slick', extras: ['shades', 'suit'] };
  const LACKEY = n => ({ base: 'man', top: ['#5a3a6a', '#3a5a3a', '#6a4a2a', '#3a3a6a'][n % 4], sleeve: 'skin', bottom: '#2a2a2a', hairStyle: ['buzz', 'slick', 'short', 'bald'][n % 4], extras: n % 2 ? ['shades'] : ['vest'] });
  const THUG = { base: 'man', build: 'big', top: '#303036', sleeve: '#303036', bottom: '#202024', hair: '#202020', hairStyle: 'slick', extras: ['shades', 'suit'] };

  // ================================================================== Wall Market: south street
  // Wall Market is a narrow north-south street (screenshots 01-midgar_077-087): lit shop fronts on both
  // sides, neon boards and lanterns along the kerbs, and Don Corneo's mansion closing the north end
  // (corneo_gate). Each shop door sits in the south face of its block, in a little alcove off the street,
  // so the doors face the camera looking north. The road in from Sector 6 enters at the south.
  // `props` dress it: real neon over every shop door and on the kerbside boards ('N'), lantern and bulb
  // strings across the street, paper lanterns on stands ('J'), the Honey Bee's pink sign with its green
  // and blue neon hearts, heart banners and bulbs (077), and a WALL MARKET banner over the way in.
  const WM_S = [
    "hhhhhhhh......hhhhhhhh",
    "hhhhhhhh,....,hhhhhhhh",
    "hhhhhhhhN.....hhhhhhhh",
    "hhwh+hwh.....Nhhhhhhhh",
    "hB......,....,hwh+hhwh",
    "h...................oh",
    "h======o,....l.......h",
    "Rxxxxxxx......l======h",
    "hhhhhhhh......xxxBBxxR",
    "hhhhhhhhN....,hhhhhhhh",
    "hhwh+hwh.....Nhhhhhhhh",
    "ho......,....,hhhhhhhh",
    "h.......l....Nhhhhhhhh",
    "h======o......hw++hhwh",
    "Boxxxxxx,....,.J..J..h",
    "hhhhhhhh.....J.......h",
    "hhhhhhhhN....,......jh",
    "hhwh+hwh.....lo======h",
    "hj............PxoRRxxP",
    "h.......,....,xxxxxhhh",
    "h======oN.....xBRxxhhh",
    "xxxoxxRx,....NBxRxRhhh",
    "hhhxBxRxl...S.Rxxxxhhh",
    "hhhxxPxx.....lxxBPohhh",
    "hhhxxRxxx....xxPxxxhhh",
    "hhhxBxxxx....xxxxxxhhh",
    "hhhBRPRxxx..xxoxxoRhhh",
  ];
  FF7.defineMap('wall_south', {
    name: 'Wall Market', area: 'Midgar', theme: 'wallmarket', music: 'oppressed',
    look: { floor: ['#4a4034', '#443a30'], bldg: '#4a3c34', lantern: '#ffc860', grass: ['#3a4e26', '#364a24'], light: [0.72, 0.64, 0.6], ambient: [0.36, 0.33, 0.34] },
    camera: { pitch: 58, dist: 10 },
    lights: [[4, 4, '#ffd090', 2.5], [4, 11, '#ffb070', 2.5], [4, 18, '#70ff90', 2.5], [17, 5, '#ffe060', 2.5], [16, 14, '#ff70c0', 3], [18, 15, '#ff90d0', 2], [10, 8, '#c070ff', 2], [11, 23, '#ffd090', 2]],
    grid: WM_S,
    buildings: [{ at: [14, 9, 8, 5], col: '#5a3446', win: '#ff9ad8' }],   // the Honey Bee Inn: plum walls, pink-lit windows
    props: [
      // neon over the shop doors (just proud of each facade)
      { at: [4, 3.62], prop: 'neon', text: 'INN', col: '#ffd060', y: 2.35, size: 0.24 },
      { at: [4, 10.62], prop: 'neon', text: 'DINER', col: '#ff8a40', y: 2.35, size: 0.2 },
      { at: [4, 17.62], prop: 'neon', text: 'CLOTHES', col: '#70ff80', y: 2.35, size: 0.17 },
      { at: [17, 4.62], prop: 'neon', text: 'ITEM', col: '#e0f4ff', col2: '#1c2630', y: 2.35, size: 0.24 },
      { at: [16.5, 13.62], prop: 'neon', text: 'HONEY BEE', col: '#ff6ac8', y: 2.4, size: 0.24, light: true },
      { at: [14.7, 13.66], to: [18.3, 13.66], bulbs: ['#ff4058', '#fff0e8'], h: 2.68, sag: 0.03, col: '#40202a' },
      // the Honey Bee's heart banners and the dress shop's pink streamers (01-midgar_077, 085)
      { at: [15, 13.62], prop: 'banner', col: '#d82850', col2: '#ffd0e0', w: 0.9, h: 1.1, y: 2.0, text: '♥', textCol: '#ffb8d8' },
      { at: [18, 13.62], prop: 'banner', col: '#d82850', col2: '#ffd0e0', w: 0.9, h: 1.1, y: 2.0, text: '♥', textCol: '#ffb8d8' },
      { at: [3, 17.62], prop: 'banner', col: '#e04888', col2: '#f8d8e8', w: 0.5, h: 1.5, y: 2.05 },
      { at: [5, 17.62], prop: 'banner', col: '#e04888', col2: '#f8d8e8', w: 0.5, h: 1.5, y: 2.05 },
      // kerbside neon boards
      { at: [8, 2], prop: 'neon', text: 'HOTEL', col: '#ffe070', size: 0.12, light: true },
      { at: [13, 3], prop: 'neon', text: 'OPEN', col: '#60f0ff', size: 0.14, light: true },
      { at: [8, 9], prop: 'neon', text: 'EAT', col: '#ff9040', size: 0.17, light: true },
      { at: [13, 10], prop: 'neon', text: '♥♥', col: ['#ff60c0', '#60ffb0'], size: 0.17, light: true },
      { at: [13, 12], prop: 'neon', text: 'VIP', col: '#d070ff', size: 0.17, light: true },
      { at: [8, 16], prop: 'neon', text: 'SALE', col: '#80ff70', size: 0.14, light: true },
      { at: [8, 20], prop: 'neon', text: 'SAKE', col: '#ff5a50', size: 0.14, light: true },
      { at: [13, 21], prop: 'neon', text: 'LUCKY', col: 'rainbow', size: 0.12, light: true },
      // lanterns and coloured bulbs strung across the street
      { at: [7.5, 1], to: [13.5, 1], lanterns: '#ff5a40', h: 2.7 },
      { at: [7.5, 10], to: [13.5, 10], bulbs: ['#ff5ab0', '#ffe060', '#60e0ff', '#80ff80'], h: 2.6, lit: true },
      { at: [7.5, 16], to: [14, 13.66], bulbs: ['#ffe060', '#ff70c0', '#70ff90'], h: 2.55, h2: 2.2, sag: 0.3 },
      { at: [7.5, 19], to: [13.5, 19.5], lanterns: '#ff7040', h: 2.6 },
      // the way in from Sector 6: a banner slung between two poles over the road
      { at: [7, 22], prop: 'pylon', h: 3.1, w: 0.26, top: 0.2, thick: 0.7, deck: false, col: '#4a3a30' },
      { at: [14, 22], prop: 'pylon', h: 3.1, w: 0.26, top: 0.2, thick: 0.7, deck: false, col: '#4a3a30' },
      { at: [10.5, 22.1], prop: 'banner', col: '#3a1830', col2: '#e0b040', w: 6.2, h: 0.55, y: 3.0, text: 'WALL MARKET', textCol: '#ffd040', fade: true },
    ],
    // the green and blue neon hearts over the Honey Bee's sign (01-midgar_077)
    labels: [
      { at: [16, 13.64], face: 's', text: '♥', col: '#60ff90', glow: true, size: 0.3, y: 2.84, w: 0.12 },
      { at: [17, 13.64], face: 's', text: '♥', col: '#60d0ff', glow: true, size: 0.3, y: 2.84, w: 0.12 },
    ],
    entries: { from_road: [10, 25, 'up'], from_north: [10, 1, 'down'], from_dress: [4, 18, 'down'], from_diner: [4, 11, 'down'], from_pharmacy: [17, 5, 'down'], from_honeybee: [16, 14, 'down'], from_inn: [4, 4, 'down'] },
    exits: [
      { at: [10, 26, 2, 1], to: 's6_road', entry: 'from_wm' },
      { at: [8, 0, 6, 1], to: 'wall_north', entry: 'from_south' },
      { at: [4, 17, 1, 1], to: 'wall_dress', entry: 'from_street', sfx: 'door' },
      { at: [4, 10, 1, 1], to: 'wall_diner', entry: 'from_street', sfx: 'door' },
      { at: [17, 4, 1, 1], to: 'wall_pharmacy', entry: 'from_street', sfx: 'door' },
      { at: [4, 3, 1, 1], to: 'wall_inn', entry: 'from_street', sfx: 'door' },
      { at: [16, 13, 2, 1], to: 'wall_honeybee', entry: 'from_street', sfx: 'door',
        if: s => s.has('members_card') && !s.flag('c3_corneo_done'),
        blocked: function* (s) { yield* FF7.story.c3_hbDoor(s); } },
    ],
    npcs: [
      { id: 'hbdoor', name: 'Honey Bee Doorman', model: { base: 'man', top: '#e0c020', sleeve: '#202020', bottom: '#202020', hair: '#202020', hairStyle: 'slick', extras: ['bowtie', 'vest'] },
        at: [19, 14], dir: 'down', talk: function* (s) { yield* FF7.story.c3_hbDoor(s); } },
      { id: 'cardman', name: 'Nervous Man', model: { base: 'man', build: 'fat', top: '#c08a40', sleeve: '#c08a40', bottom: '#4a3a2a', hairStyle: 'bald', extras: ['glasses'] },
        at: [11, 17], dir: 'left', wander: 1,
        talk: function* (s) {
          if (s.has('members_card') || s.flag('c3_card_got')) { yield s.say('Nervous Man', "I feel so much lighter now. Thank you. Really.\fDon't tell my wife I was ever here."); return; }
          yield s.say('Nervous Man', "Huh?! Oh! You startled me. I-I wasn't going into the Honey Bee Inn! Not at all!\f......Okay, I was. But I can't do it. I've been walking in circles out here for three hours.");
          yield s.say('Nervous Man', "Here. Take my member's card. Take it before I change my mind! It's for the best!");
          s.set('c3_card_got');
          yield s.give('members_card');
        } },
      { id: 'wmdrunk', name: 'Drunk', model: 'man3', at: [2, 19], dir: 'right', anim: 'sit',
        talk: function* (s) {
          if (C3.inDress(s)) { yield s.say('Drunk', "Hic... Whoa, lookit you, gorgeous... You've got shoulders like a... hic... like a SOLDIER..."); return; }
          if (C3.plate(s)) { yield s.say('Drunk', "Sector 7's gone, y'know... Hic... Gone. And the bars here are still open. That's Wall Market for ya."); return; }
          yield s.say('Drunk', "Hic! The Don's pickin' himself a bride again tonight... Every night's a wedding night for that guy. Hic!");
        } },
      { id: 'wmwoman', name: 'Woman', model: 'woman5', at: [6, 18], dir: 'left',
        talk: function* (s) {
          if (C3.inDress(s)) { yield s.say('Woman', "Ooh, what a lovely dress! ...You've got quite the jawline, dear. Very... striking."); return; }
          yield s.say('Woman', "That's the clothes shop right there. The owner's father makes every dress by hand... or he used to, before he took up drinking full time.");
        } },
      { id: 'wmold', name: 'Old Man', model: 'oldman3', at: [9, 11], dir: 'right',
        talk: function* (s) {
          if (C3.plate(s)) { yield s.say('Old Man', "They say the Don's gone into hiding. With him gone, maybe this town'll breathe a little easier."); return; }
          yield s.say('Old Man', "Wall Market never sleeps, son. The diner's always cooking, the pharmacy's always open, and the Honey Bee Inn is always... busy.");
        } },
      { id: 'wmtout', name: 'Tout', model: 'man11', at: [12, 14], dir: 'down', wander: 1,
        talk: function* (s) {
          if (s.flag('c3_corneo_done')) { yield s.say('Tout', "Honey Bee's shut 'til things calm down. Some wise guy busted up the Don's place and now everybody's jumpy."); return; }
          yield s.say('Tout', "The Honey Bee Inn! A slice of heaven, right here in the slums! ...Members only, though. Know anybody with a card?");
        } },
      { id: 'wmkid', name: 'Kid', model: 'kid7', at: [10, 20], dir: 'up',
        talk: function* (s) { yield s.say('Kid', "My mom says I'm not allowed to go past the Honey Bee Inn. So I just stand here and look at it."); } },
    ],
    onLoad: function (s) { C3.applyDress(s); },
    onEnter: function* (s) {
      if (!s.flag('c3_wm_arrived') && s.flag('c3_park_scene')) yield* FF7.story.c3_wmArrive(s);
    },
  });

  FF7.story.c3_wmArrive = function* (s) {
    s.set('c3_wm_arrived');
    C3.aerisIn(s, 11, 26, 'up');
    yield s.move('aeris', 11, 24);
    yield s.face('player', 'aeris');
    yield s.say('aeris', "Here we are. Wall Market! If you want something in the slums, you'll find it here... one way or another.");
    yield s.say('cloud', "......Tifa's somewhere around here.");
    yield s.say('aeris', "Then let's ask around. Somebody must have seen a chocobo wagon come through.\fStay close, okay? This place can swallow people whole.");
    s.remove('aeris');
  };

  FF7.story.c3_hbDoor = function* (s) {
    if (s.flag('c3_corneo_done')) { yield s.say('Honey Bee Doorman', "Sorry, pal. We're closed until further notice. After what happened at the Don's place, the boss wants to lie low."); return; }
    if (C3.inDress(s) && !s.has('members_card')) { yield s.say('Honey Bee Doorman', "Oh, a new girl? Auditions are around back, sweetheart! ...Wait, what do you mean you're not here for an audition?"); return; }
    if (s.has('members_card')) { yield s.say('Honey Bee Doorman', "Ooh, a member! Welcome, welcome! Go right on in!"); return; }
    yield s.say('Honey Bee Doorman', "The Honey Bee Inn: where dreams come true! Members only, pal. No card, no entry.");
    if (!s.flag('c3_hb_tip')) {
      s.set('c3_hb_tip');
      yield s.say('Honey Bee Doorman', "A girl on a chocobo wagon? Long dark hair? Yeah, I saw her. The wagon dropped her off at Don Corneo's mansion.\fThe Don's picking a bride tonight. She must be one of the candidates. Lucky girl... or unlucky, depending on how you look at it.");
    }
  };

  // ================================================================== Wall Market: north street
  // The gym and the bar on the west, the weapon shop (pink "GUN" neon under its big cloth sign, 083) and
  // the materia shop on the east, the tent stall in the middle of the street (082); lanterns on stands
  // at the bar door ('J'), neon boards on the kerbs, lantern and bulb strings overhead.
  const WM_N = [
    "hhhhhhhh......hhhhhhhh",
    "hhhhhhhhl.....hhhhhhhh",
    "hhhhhhhh.....Nhhhhhhhh",
    "hhhhhhhhN.....hhhhhhhh",
    "hhwh+hwh......hhhhhhhh",
    "h.............hwh+hhwh",
    "h..............M....oh",
    "h======o.......P.....h",
    "xBooxxox...........x.h",
    "hhhhhhhh.....Nl======h",
    "hhhhhhhhN.....xRxxoxxx",
    "hhwh+hwh.....lhhhhhhhh",
    "h.J...J.......hhhhhhhh",
    "h.............hwh+hhwh",
    "h======o.............h",
    "BxxRxxxR.....N.......h",
    "hhhhhhhh......o======h",
    "hhhhhhhhN.....RxxPxBPx",
    "hhwhhhwh...A..hhhhhhhh",
    "hB......l..B..hhhhhhhh",
    "h.o..........Nhhwhhwhh",
    "hhhhxxxR............jh",
    "hhhhxBxxN............h",
    "hhhhxBxR.....lxRxRhhhh",
    "hhhhRoRxx....xPxxPhhhh",
    "hhhhxRxxx....xxxBxhhhh",
    "hhhhoRxRx....xxoxPhhhh",
  ];
  FF7.defineMap('wall_north', {
    name: 'Wall Market', area: 'Midgar', theme: 'wallmarket', music: 'oppressed',
    look: { floor: ['#4a4034', '#443a30'], bldg: '#4a3c34', lantern: '#ffb850', grass: ['#3a4e26', '#364a24'], light: [0.72, 0.64, 0.6], ambient: [0.36, 0.33, 0.34] },
    camera: { pitch: 58, dist: 10 },
    lights: [[4, 5, '#ffd090', 2.5], [4, 12, '#ff9040', 2.5], [17, 6, '#ff70c0', 3], [17, 14, '#70a0ff', 2.5], [11, 20, '#ffd070', 2.5], [10, 3, '#ff7070', 2], [11, 24, '#80ff80', 2]],
    grid: WM_N,
    props: [
      // neon over the shop doors
      { at: [4, 4.62], prop: 'neon', text: 'GYM', col: '#ff6040', y: 2.35, size: 0.26 },
      { at: [4, 11.62], prop: 'neon', text: 'BAR', col: '#ffa840', y: 2.35, size: 0.26 },
      { at: [17, 5.62], prop: 'neon', text: 'GUN', col: '#ff6ad8', y: 2.3, size: 0.3, light: true },
      { at: [17, 5.62], prop: 'neon', text: 'MACHINE', col: '#ff9ae4', y: 2.7, size: 0.1, board: false },
      { at: [17, 13.62], prop: 'neon', text: 'MATERIA', col: '#70c0ff', y: 2.35, size: 0.18 },
      // cloth signs: the weapon shop's big banner (083) and the bargain store's
      { at: [15.2, 5.62], prop: 'banner', col: '#e6dcc4', col2: '#8a2a20', w: 1.6, h: 1.0, y: 3.0, text: 'WEAPONS', textCol: '#2a1a12' },   // (left of the GUN neon: at 20, by the map's edge, it ran off the screen)
      { at: [4.4, 18.62], prop: 'banner', col: '#e6dcc4', col2: '#3a5a8a', w: 4.2, h: 0.8, y: 2.8, text: 'BARGAINS', textCol: '#1a1410' },
      // kerbside neon boards
      { at: [13, 2], prop: 'neon', text: 'OPEN', col: '#60f0ff', size: 0.14, light: true },
      { at: [8, 3], prop: 'neon', text: '♥♥', col: ['#ff60c0', '#ffe060'], size: 0.17, light: true },
      { at: [13, 9], prop: 'neon', text: 'AMMO', col: '#ffa040', size: 0.14, light: true },
      { at: [8, 10], prop: 'neon', text: 'SAKE', col: '#ffe070', size: 0.14, light: true },
      { at: [13, 15], prop: 'neon', text: 'MAKO', col: '#60ff90', size: 0.14, light: true },
      { at: [8, 17], prop: 'neon', text: 'SALE', col: '#ff6a60', size: 0.14, light: true },
      { at: [13, 20], prop: 'neon', text: 'LUCKY', col: 'rainbow', size: 0.12, light: true },
      { at: [8, 22], prop: 'neon', text: 'HOT', col: '#ff5040', size: 0.17, light: true },
      // lanterns and coloured bulbs strung across the street
      { at: [7.5, 2], to: [13.5, 2], lanterns: '#ff5a40', h: 2.7 },
      { at: [7.5, 11], to: [13.5, 11], bulbs: ['#ffe060', '#ff5ab0', '#60e0ff', '#80ff80'], h: 2.6, lit: true },
      { at: [7.5, 17], to: [13.5, 18], lanterns: '#ffb040', h: 2.6 },
    ],
    entries: { from_south: [10, 25, 'up'], from_gate: [10, 1, 'down'], from_bar: [4, 12, 'down'], from_materia: [17, 14, 'down'], from_weapons: [17, 6, 'down'], from_gym: [4, 5, 'down'] },
    exits: [
      { at: [9, 26, 4, 1], to: 'wall_south', entry: 'from_north' },
      { at: [8, 0, 6, 1], to: 'corneo_gate', entry: 'from_street' },
      { at: [4, 11, 1, 1], to: 'wall_bar', entry: 'from_street', sfx: 'door' },
      { at: [17, 13, 1, 1], to: 'wall_materia', entry: 'from_street', sfx: 'door' },
      { at: [17, 5, 1, 1], to: 'wall_weapons', entry: 'from_street', sfx: 'door' },
      { at: [4, 4, 1, 1], to: 'wall_gym', entry: 'from_street', sfx: 'door' },
    ],
    npcs: [
      { id: 'wnman', name: 'Man', model: 'man12', at: [7, 12], dir: 'left',
        talk: function* (s) {
          if (C3.inDress(s)) { yield s.say('Man', "W-well, hello there, miss! Heading to the Don's? ......You look like you could bench-press me."); return; }
          if (C3.plate(s)) { yield s.say('Man', "Did you hear? Somebody climbed up that wire hanging off the plate. People are saying you can get all the way to the top that way."); return; }
          yield s.say('Man', "The bar's got the best booze in the slums. Well. The most booze, anyway.");
        } },
      { id: 'wnlady', name: 'Woman', model: 'woman9', at: [19, 15], dir: 'left',
        talk: function* (s) {
          if (C3.plate(s)) { yield s.say('Woman', "The materia shop finally opened back up. The owner's been in a great mood lately. Something about a tiara, I heard."); return; }
          yield s.say('Woman', "The materia shop's been shut for days. The owner just sits in there, sighing at the ceiling.");
        } },
      { id: 'wnworker', name: 'Worker', model: 'worker5', at: [7, 5], dir: 'left',
        talk: function* (s) {
          if (C3.plate(s)) { yield s.say('Worker', "The whole Sector 7 plate came down. Chunks of it landed right behind the Don's mansion. There's even a cable hanging down from up top."); return; }
          yield s.say('Worker', "The gym? Big Bro runs it. Calls it the Men's Hall. Loud music, lots of grunting. Don't go in unless you like squats.");
        } },
      { id: 'wnold', name: 'Old Woman', model: 'oldwoman2', at: [12, 2], dir: 'down',
        talk: function* (s) { yield s.say('Old Woman', "The Don's mansion is just past here. Keep your daughters indoors tonight, I always say. Hmph."); } },
    ],
    onLoad: function (s) { C3.applyDress(s); },
  });

  // ================================================================== Don Corneo's mansion: outside
  const GATE = [
    "XXXXXXXXXXXXXXXXXXXXXXXX",
    "hhhhhhhhhhhhhhhhhhhhhhhh",
    "hhhhhhhhhhhhhhhhhhhhhhhh",
    "hhhhhhhhhhhhhhhhhhhhhhhh",
    "hhhhhhhhhhhhhhhhhhhhhhhh",
    "hhhhhhhhhhhhhhhhhhhhhhhh",
    "hhhwhhwhhhh++hhhhwhhwhhh",
    "hhx..l...N|..|N...l...hh",
    "hhxu................u.hh",
    "hhR.....................",
    "hh..,.............,.....",
    "hh....,.........,.......",
    "hhxo......,..,......xRxx",
    "PxxBxRRxB......oxxPRoxoB",
    "PxxxxBxRx..,...xxxxxxBxx",
    "PRPxxBxPR......PxxRRxBxx",
    "xBRPxxxBR...,..xoxxoRxxo",
    "xxoxxxxxB......xoxoxRBRR",
  ];
  FF7.defineMap('corneo_gate', {
    name: "Don Corneo's Mansion", area: 'Midgar', theme: 'wallmarket', music: 'oppressed',
    // the north end of the market street: the Don's red-and-gold front with the striped gate pillars,
    // neon, lanterns and statues (01-midgar_087); the alley to the fallen plate's wire leads off east.
    // The whole block is Corneo's: red walls (look.bldg, the wings too), and the front under a dark hipped
    // roof with gold-lit windows; red-and-gold gate pillars, the Don's name in gold
    // neon over the doors, neon hearts on the kerb boards, red banners and strings of paper lanterns.
    look: { floor: ['#4a4034', '#443a30'], bldg: '#6a2a26', trim: '#c0a040', grass: ['#3a4e26', '#364a24'], light: [0.72, 0.64, 0.6], ambient: [0.36, 0.33, 0.34] },
    camera: { pitch: 55, dist: 10 },
    lights: [[11, 7, '#90ff90', 3.5], [5, 7, '#ffd080', 2.5], [18, 7, '#ffd080', 2.5], [9, 8, '#60ff90', 2], [14, 8, '#ff70c0', 2]],
    grid: GATE,
    buildings: [{ at: [0, 1, 24, 6], col: '#7a2a24', roof: '#42302e', top: 'hip', rise: 1.2, win: '#ffd070' }],
    props: [
      { at: [11.5, 6.62], prop: 'neon', text: '♥DON CORNEO♥', col: ['#ff5ab0', '#ffd850', '#ffd850', '#ffd850', '#ffd850', '#ffd850', '#ffd850', '#ffd850', '#ffd850', '#ffd850', '#ff5ab0'], col2: '#2a1210', y: 2.5, size: 0.22, light: true },
      { at: [9, 7], prop: 'neon', text: '♥', col: '#60ff90', size: 0.26 },
      { at: [14, 7], prop: 'neon', text: '♥', col: '#ff60c0', size: 0.26 },
      // the gate pillars, red with gold caps
      { at: [10, 7], prop: 'pillar', col: '#a82a22', col2: '#e0b040' },
      { at: [13, 7], prop: 'pillar', col: '#a82a22', col2: '#e0b040' },
      { at: [8, 6.62], prop: 'banner', col: '#b01c1c', col2: '#e0b040', w: 0.9, h: 1.5, y: 2.3 },
      { at: [15, 6.62], prop: 'banner', col: '#b01c1c', col2: '#e0b040', w: 0.9, h: 1.5, y: 2.3 },
      { at: [2.2, 6.7], to: [9.4, 6.7], lanterns: '#ff4a30', h: 2.85, sag: 0.3 },
      { at: [13.6, 6.7], to: [21.8, 6.7], lanterns: '#ff4a30', h: 2.85, sag: 0.3 },
    ],
    entries: { from_street: [11, 15, 'up'], from_mansion: [11, 7, 'down'], from_wire: [22, 10, 'left'] },
    exits: [
      { at: [9, 17, 6, 1], to: 'wall_north', entry: 'from_gate' },
      { at: [11, 6, 2, 1], to: 'corneo_hall', entry: 'from_gate', sfx: 'door',
        if: s => (C3.inDress(s) && !s.flag('c3_fell_sewer')) || C3.plate(s),
        blocked: function* (s) { yield* FF7.story.c3_gateGuard(s); } },
      { at: [23, 9, 1, 3], to: 'wire_base', entry: 'from_wm', if: s => s.flag('c3_to_wire'),
        blocked: function* (s) {
          if (C3.plate(s)) yield s.say('tifa', "The wire's back there... but Marlene first. If Aeris took her anywhere, it was to her house in Sector 5.");
          else yield s.say('cloud', "(A dead-end alley behind the mansion. Nothing but junk.)");
        } },
    ],
    npcs: [
      { id: 'cguard', name: "Corneo's Guard", model: THUG, at: [14, 8], dir: 'down', show: s => !C3.plate(s),
        talk: function* (s) { yield* FF7.story.c3_gateGuard(s); } },
    ],
    onLoad: function (s) { C3.applyDress(s); },
    onEnter: function* (s) {
      if (C3.plate(s) && !s.flag('c3_wire_seen') && s.flag('c3_to_wire')) {
        s.set('c3_wire_seen');
        yield s.say('tifa', "Look, over there, behind the mansion. That's the wire I saw.\fThe plate came down so hard it tore the cables loose. They hang all the way down to here.");
        yield s.say('barret', "Then we climb it. Shinra HQ, here we come!");
      }
    },
  });

  FF7.story.c3_gateGuard = function* (s) {
    if (C3.inDress(s)) { yield s.say("Corneo's Guard", "Well, well! Two more lovely ladies for the Don! Go on in, go on in!"); return; }
    if (!s.flag('c3_disguise_plan')) { yield* FF7.story.c3_needDisguise(s); return; }
    yield s.say("Corneo's Guard", "Told ya already. Tonight the Don's only seeing ladies. Beat it, pal.");
    yield s.say('aeris', "(Psst! The clothes shop, remember? Near the entrance of town!)");
  };

  FF7.story.c3_needDisguise = function* (s) {
    s.set('c3_disguise_plan');
    s.set('c3_hb_tip');
    C3.aerisIn(s, 12, 9, 'up');
    yield s.say("Corneo's Guard", "Hold it right there! The Don's auditioning brides tonight. No men allowed. Ladies only!");
    yield s.say("Corneo's Guard", "......The new girl from the chocobo wagon? Yeah, she's inside already. Real looker, that one. The Don's gonna be thrilled.");
    yield s.face('player', 'aeris');
    yield s.say('cloud', "......Tifa.");
    yield s.say('aeris', "Well, that settles it. I'll go in and bring her out!");
    yield s.say('cloud', "No.");
    yield s.say('aeris', "Why not? I'm a girl. I can get in.");
    yield s.say('cloud', "You don't know what's in there.");
    yield s.say('aeris', "......Then you come in with me.");
    yield s.say('cloud', "You heard him. Ladies only.");
    yield s.face('aeris', 'player');
    yield 30;
    yield s.emote('aeris', '♪');
    yield s.say('aeris', "Hee hee hee......");
    yield s.say('cloud', "......What?");
    yield s.say('aeris', "{CLOUD}. You're going to be a girl.");
    yield s.emote('player', '!!');
    yield s.say('cloud', "......!?");
    yield s.say('aeris', "There's a clothes shop by the entrance of town. Come on! This is going to be fun!");
    s.remove('aeris');
  };

  // ================================================================== the clothes shop
  const DRESS = [
    "###############+####",
    "#kk.kk.kk..........#",
    "#..................#",
    "#DDD...........k...#",
    "#..................#",
    "#....k.....k.......#",
    "#j................j#",
    "########++##########",
  ];
  const boutique = function* (s) {
    if (C3.plate(s)) { yield s.say('Clothes Shop', "Dad's been sewing day and night since you came by! He says he found his spark again. Thank you!"); return; }
    if (C3.inDress(s)) { yield s.say('Clothes Shop', "Oh, it fits you like a dream. Go knock 'em dead, sweetie!"); return; }
    if (!s.flag('c3_disguise_plan')) { yield s.say('Clothes Shop', "Welcome! Every dress here is one of a kind. My father sews them all by hand... well, he did, before he started drinking."); return; }
    if (!s.flag('c3_dress_asked')) { yield* FF7.story.c3_dressAsk(s); return; }
    if (!s.flag('c3_dressmaker_done')) { yield s.say('Clothes Shop', "Dad's at the bar on the north side of the market. If anybody can get him excited about a dress again, it's... well, him. The big guy."); return; }
    if (!s.flag('c3_dress_got')) { yield* FF7.story.c3_dressDelivered(s); return; }
    const hasWig = s.has('wig') || s.has('dyed_wig') || s.has('blonde_wig');
    if (!hasWig) { yield s.say('Clothes Shop', "A dress without the right hair is only half a disguise, hon. Big Bro at the gym has a closet full of wigs. Don't ask me why."); return; }
    yield* FF7.story.c3_changeClothes(s);
  };
  FF7.defineMap('wall_dress', {
    name: 'Clothes Shop', area: 'Midgar', theme: 'house', music: 'oppressed',
    look: { wall: '#b08090', trim: '#6a3a50' },
    grid: DRESS,
    entries: { from_street: [8, 6, 'up'] },
    exits: [{ at: [8, 7, 2, 1], to: 'wall_south', entry: 'from_dress', sfx: 'door' }],
    npcs: [
      { id: 'dressclerk', name: 'Clothes Shop', model: { base: 'woman', top: '#d06a9a', sleeve: '#d06a9a', bottom: '#d06a9a', hair: '#6a3a20', hairStyle: 'bun' }, at: [2, 2], dir: 'down', talk: boutique },
      { id: 'dressdad', name: 'Dressmaker', model: { base: 'oldman', top: '#6a5a80', sleeve: '#6a5a80', bottom: '#4a4050', extras: ['beard', 'glasses'] },
        at: [11, 2], dir: 'down', show: s => s.flag('c3_dressmaker_done'),
        talk: function* (s) {
          if (C3.plate(s)) { yield s.say('Dressmaker', "I'm working on a new line! Evening wear for broad-shouldered ladies. You inspired it!"); return; }
          if (!s.flag('c3_dress_got')) { yield* FF7.story.c3_dressDelivered(s); return; }
          yield s.say('Dressmaker', "Ahh, my masterpiece. Wear it with pride, young... lady.");
        } },
    ],
    triggers: [
      C3.counter(1, 3, 3, boutique),
      { at: [15, 0], run: function* (s) { yield s.msg('The fitting room. A velvet curtain hangs across the doorway.'); } },
    ],
    onLoad: function (s) { C3.applyDress(s); },
  });

  FF7.story.c3_dressAsk = function* (s) {
    s.set('c3_dress_asked');
    C3.aerisIn(s, 3, 4, 'up');
    yield s.say('aeris', "Excuse me! We'd like to buy a dress. Something really cute.");
    yield s.say('Clothes Shop', "Of course! Is it for you, dear? You'd look darling in—");
    yield s.say('aeris', "Oh, not for me. For him.");
    yield s.emote('dressclerk', '!');
    yield s.say('Clothes Shop', "......For HIM?\f......Oh, how fun! I love a challenge!");
    yield s.say('Clothes Shop', "But I'm afraid there's a problem. My father makes all our dresses, and he's lost interest. Says there's nothing left to inspire him.\fHe spends all day drinking at the bar up north. If you can talk him into it, he'll make you something special.");
    yield s.say('aeris', "Leave it to us! Right, {CLOUD}?");
    yield s.say('cloud', "......");
    s.remove('aeris');
  };

  FF7.story.c3_dressDelivered = function* (s) {
    s.set('c3_dress_got');
    const k = s.get('c3_dress_kind');
    const id = k >= 3 ? 'silk_dress' : k === 2 ? 'satin_dress' : 'cotton_dress';
    yield s.say('Dressmaker', "There you are! It's finished, and it's one of my best!\fFeel that fabric. Go on, feel it!");
    yield s.give(id);
    yield s.say('Clothes Shop', "Oh, Dad, it's beautiful! You haven't been this happy in years.");
    yield s.say('Clothes Shop', "Now, a dress alone won't fool anybody. You need hair. Lots of hair.\fGo see Big Bro at the gym, up on the north street. He keeps a whole closet full of wigs. Don't ask me why.");
    s.set('c3_wig_quest');
  };

  FF7.story.c3_changeClothes = function* (s) {
    yield s.say('Clothes Shop', "A dress AND a wig! Now we're talking. Let's get you changed. The fitting room's right through the curtain.");
    const c = yield s.ask(null, 'Get changed?', ['Change', 'Not yet']);
    if (c !== 0) return;
    C3.aerisIn(s, 12, 3, 'up');
    yield s.move('player', [[15, 2], [15, 1]]);
    yield s.fadeOut(30);
    s.sfx('equip');
    yield 40;
    yield s.say('aeris', "Sooo? How's it going in there?", { pos: 'middle' });
    yield s.say('cloud', "......This is a stupid idea.", { pos: 'middle' });
    yield s.say('aeris', "Come on out! Let's see!", { pos: 'middle' });
    s.set('c3_dressed');
    s.setModel('player', C3.dressModel(s));
    s.place('player', 15, 1, 'down');
    yield s.fadeIn(30);
    yield s.move('player', 14, 2);
    yield 20;
    yield s.emote('aeris', '!');
    yield s.say('aeris', "......Whoa.");
    yield s.say('Clothes Shop', "Oh my, oh my! Look at you!");
    yield s.say('aeris', "{CLOUD}... you're actually really pretty! I'm a little jealous, to be honest.");
    yield s.say('cloud', "......Let's just get this over with.");
    yield s.say('aeris', "Hee hee! Okay, 'sister'. Off to the Don's we go!");
    s.remove('aeris');
    yield s.msg('The more attractive {CLOUD} looks, the more the Don will like "her".\nCologne, jewelry, make-up... it all counts.');
  };

  // ================================================================== the bar
  const BAR = [
    "##################+## ",
    "#qqq................j ",
    "#DDDDDD.............. ",
    "#.c.c.c...t....t..... ",
    "#.........c....c..... ",
    "#.................... ",
    "#....t.........t..... ",
    "#....c.........c..... ",
    "#.................... ",
    "#########++########## ",
  ];
  const bartender = function* (s) {
    if (C3.inDress(s)) { yield s.say('Bartender', "Well, hello, beautiful. First drink's on the house... Huh. You've got a heck of a grip there, miss."); return; }
    if (C3.plate(s)) { yield s.say('Bartender', "Business is booming. Nothing like a disaster to make people drink. ......I hate this job sometimes."); return; }
    yield s.say('Bartender', "What'll it be? ...Just looking? Suit yourself.\fIf you're after the old dressmaker, he's the one hugging the bottle by the door.");
  };
  FF7.defineMap('wall_bar', {
    name: 'Wall Market Bar', area: 'Midgar', theme: 'bar', music: 'oppressed',
    camera: { yaw: 35, pitch: 52, dist: 10 },   // diagonal view like 01-midgar_084 (east side open)
    grid: BAR,
    lights: [[4, 2, '#ffb060', 3]],
    entries: { from_street: [9, 8, 'up'] },
    exits: [{ at: [9, 9, 2, 1], to: 'wall_north', entry: 'from_bar', sfx: 'door' }],
    npcs: [
      { id: 'barkeep', name: 'Bartender', model: 'bartender', at: [4, 1], dir: 'down', talk: bartender },
      { id: 'dressmaker', name: 'Old Man', model: { base: 'oldman', top: '#6a5a80', sleeve: '#6a5a80', bottom: '#4a4050', extras: ['beard', 'glasses'] },
        at: [5, 7], dir: 'right', anim: 'sit', show: s => !s.flag('c3_dressmaker_done'),
        talk: function* (s) {
          if (!s.flag('c3_dress_asked')) { yield s.say('Old Man', "Leave me be... Nothing in this town inspires me anymore. It's just me and my bottle now."); return; }
          yield* FF7.story.c3_dressmaker(s);
        } },
      { id: 'queueman', name: 'Man', model: 'man13', at: [16, 1], dir: 'right',
        talk: function* (s) { yield s.say('Man', "Some lady's been locked in the ladies' room for an hour. Moaning about her stomach. I've got to go too, but... not in there, obviously."); } },
      { id: 'barpatron', name: 'Patron', model: 'man14', at: [10, 4], dir: 'up', anim: 'sit',
        talk: function* (s) {
          if (C3.inDress(s)) { yield s.say('Patron', "H-hey there, pretty lady... Wanna sit with me? No? That's fine. That's totally fine."); return; }
          yield s.say('Patron', "The Don's men were in here earlier, asking about some guy with a gun for an arm. Heh. Can you imagine?");
        } },
      { id: 'barwoman', name: 'Woman', model: 'woman10', at: [15, 7], dir: 'up', anim: 'sit',
        talk: function* (s) { yield s.say('Woman', "I came here to forget my troubles. Now I just have new ones. Like that guy at the counter who keeps winking at me."); } },
    ],
    triggers: [
      C3.counter(1, 2, 6, bartender),
      { at: [18, 0], on: 'talk', run: function* (s) { yield* FF7.story.c3_ladiesRoom(s); } },
    ],
    onLoad: function (s) { C3.applyDress(s); },
  });

  FF7.story.c3_dressmaker = function* (s) {
    C3.aerisIn(s, 6, 8, 'up');
    yield s.say('Old Man', "Eh? What d'you want? Can't you see I'm busy... drinking?");
    yield s.say('aeris', "Excuse me, sir. Your daughter said you make the best dresses in Wall Market. We'd like you to make one.");
    yield s.say('Old Man', "Bah. For you, missy? Pretty girls in pretty dresses. I've seen it a thousand times. Where's the challenge in that?");
    yield s.say('aeris', "Oh, it's not for me. It's for him.");
    s.stopAnim('dressmaker');
    yield s.face('dressmaker', 'player');
    yield 30;
    yield s.emote('dressmaker', '!!');
    yield s.say('Old Man', "......For HIM?\f......Well, I'll be. Look at that face! That bone structure! Those eyes!");
    yield s.say('Old Man', "Yes... YES! This is it! This is the spark I've been waiting for! Tell me, what kind of dress do you want?");
    const a = yield C3.pick(s, ['Something that feels clean.', 'Something that feels soft.']);
    const b = yield C3.pick(s, ['Something shiny.', 'Something that shimmers.']);
    let kind = 1;
    if (a === 1) kind = b === 1 ? 3 : 2;
    s.setVar('c3_dress_kind', kind);
    s.set('c3_dressmaker_done');
    yield s.say('Old Man', ["", "Clean and simple! A classic cut. I can see it already!", "Soft and shiny... Ooh, satin. You've got taste!", "Soft, shimmering... Silk. Only the finest silk will do for a face like that!"][kind]);
    yield s.say('Old Man', "I'm off to the shop! Come by in a little while, it'll be ready before you know it!");
    yield s.run('dressmaker', 9, 9);
    s.remove('dressmaker');
    yield s.say('aeris', "He's so excited! This is going great, {CLOUD}.");
    yield s.say('cloud', "......For who?");
    s.remove('aeris');
  };

  FF7.story.c3_ladiesRoom = function* (s) {
    if (s.flag('c3_cologne_got')) { yield s.say('Voice', "(from inside) Thank you again, dear! I'm feeling so much better now."); return; }
    yield s.say('Voice', "(from inside) Ohhh... my stomach... Is someone out there?\f(from inside) Please... do you have any medicine? Anything at all?");
    const meds = ['digestive', 'deodorant', 'disinfectant'].filter(id => s.has(id));
    if (!meds.length) { yield s.say('cloud', "(Medicine... The pharmacy might have something.)"); return; }
    const names = { digestive: 'Digestive', deodorant: 'Deodorant', disinfectant: 'Disinfectant' };
    const c = yield s.ask(null, 'Slide something under the door?', meds.map(m => names[m]).concat(['Nothing']));
    if (c >= meds.length) return;
    const med = meds[c];
    s.take(med);
    s.set('c3_cologne_got');
    if (med === 'digestive') {
      yield s.say('Voice', "(from inside) A digestive! Oh, bless you... Ahhh, that's so much better already.\fHere, take this. It's my favorite perfume. You've earned it.");
      yield s.give('sexy_cologne');
    } else if (med === 'deodorant') {
      yield s.say('Voice', "(from inside) Deodorant? ......Well, it helps the room, if not my stomach. Thanks, I suppose.\fHere. Have this cologne.");
      yield s.give('flower_cologne');
    } else {
      yield s.say('Voice', "(from inside) Disinfectant?! What am I supposed to do, clean the floor?\f......Fine. Thank you anyway. Take this. It's cheap, but it smells all right.");
      yield s.give('cologne');
    }
  };

  // ================================================================== the diner
  const DINER = [
    "################# ",
    "#qqqF......k...j. ",
    "#DDDDDDD......... ",
    "#.c.c.c.c........ ",
    "#..........t..t.. ",
    "#..........c..c.. ",
    "#................ ",
    "######++######### ",
  ];
  const diner = function* (s) {
    yield s.say('Cook', "Welcome, welcome! Sit down, sit down! Everything on the menu is 70 gil!");
    const c = yield s.ask('Cook', "What'll it be?", ['Korean BBQ Plate', 'Sushi Plate', "Today's Special", 'Nothing, thanks']);
    if (c === 3) return;
    if (!s.takeGil(70)) { yield s.say('Cook', "Seventy gil, pal. No money, no food. Them's the rules."); return; }
    yield s.say('Cook', ["One Korean BBQ Plate, coming right up!", "One Sushi Plate! Fresh from... somewhere!", "Today's Special! Don't ask what's in it!"][c]);
    yield s.fadeOut(20);
    s.sfx('use');
    yield 50;
    yield s.fadeIn(20);
    const r = yield s.ask('Cook', "Soooo? How was it?", ['......', 'It was all right.', 'Tasted like dog food.']);
    if (r === 1) {
      if (s.has('pharmacy_coupon') || s.flag('c3_coupon_got')) { yield s.say('Cook', "Ha ha! All right, he says! Come back anytime, honest customer!"); return; }
      s.set('c3_coupon_got');
      yield s.say('Cook', "All right, huh? Ha ha ha! Everybody else lies and says it's great. An honest customer!\fHere, take this. A coupon for the pharmacy next door. Trade it for some medicine.");
      yield s.give('pharmacy_coupon');
    } else if (r === 2) {
      yield s.say('Cook', "D-dog food?! Get out of my diner! ......No wait, you already paid. Enjoy your stay!");
    } else {
      yield s.say('Cook', "......Not much of a talker, huh? That's okay. Your empty plate says it all.");
    }
  };
  FF7.defineMap('wall_diner', {
    name: 'Diner', area: 'Midgar', theme: 'bar', music: 'oppressed',
    camera: { yaw: 35, pitch: 52, dist: 10 },   // diagonal view like 01-midgar_081 (east side open)
    grid: DINER,
    entries: { from_street: [6, 6, 'up'] },
    exits: [{ at: [6, 7, 2, 1], to: 'wall_south', entry: 'from_diner', sfx: 'door' }],
    npcs: [
      { id: 'cook', name: 'Cook', model: { base: 'man', build: 'fat', top: '#f0f0f0', sleeve: '#f0f0f0', bottom: '#404040', hairStyle: 'bald', extras: ['apron', 'mustache'] }, at: [6, 1], dir: 'down', talk: diner },
      { id: 'diner1', name: 'Customer', model: 'man15', at: [11, 5], dir: 'up', anim: 'sit',
        talk: function* (s) { yield s.say('Customer', "The cook gets real touchy if you don't praise his food. Real touchy. I always say it's the best meal I've ever had. Every day."); } },
    ],
    triggers: [C3.counter(1, 2, 7, diner)],
    onLoad: function (s) { C3.applyDress(s); },
  });

  // ================================================================== the pharmacy (item shop)
  const PHARM = [
    "################",
    "#kkkk..j..kkkk.#",
    "#..............#",
    "#...DDDDDD.....#",
    "#..............#",
    "#.j..........j.#",
    "#..............#",
    "######++########",
  ];
  const pharmacy = function* (s) {
    if (s.has('pharmacy_coupon')) {
      yield s.say('Pharmacy', "Oh! A coupon from the diner. You can trade it for one of these. Take your pick.");
      const c = yield s.ask('Pharmacy', 'Which one would you like?', ['Disinfectant', 'Deodorant', 'Digestive']);
      const id = ['disinfectant', 'deodorant', 'digestive'][c];
      s.take('pharmacy_coupon');
      yield s.give(id);
      return;
    }
    yield s.say('Pharmacy', "Welcome! Medicine, potions, tents... we've got it all.");
    yield s.shop('wallmarket_items');
  };
  FF7.defineMap('wall_pharmacy', {
    name: 'Pharmacy', area: 'Midgar', theme: 'house', music: 'oppressed',
    look: { wall: '#90a8a0', trim: '#40584a' },
    grid: PHARM,
    entries: { from_street: [6, 6, 'up'] },
    exits: [{ at: [6, 7, 2, 1], to: 'wall_south', entry: 'from_pharmacy', sfx: 'door' }],
    npcs: [
      { id: 'pharmclerk', name: 'Pharmacy', model: { base: 'man', top: '#f0f0f0', sleeve: '#f0f0f0', bottom: '#50607a', extras: ['glasses'] }, at: [6, 2], dir: 'down', talk: pharmacy },
    ],
    triggers: [C3.counter(4, 3, 6, pharmacy)],
    onLoad: function (s) { C3.applyDress(s); },
  });

  // ================================================================== the materia shop (tiara request)
  const MSHOP = [
    "################",
    "#qqq..U...U.qqq#",
    "#..............#",
    "#...DDDDDDD....#",
    "#..............#",
    "#.j..........j.#",
    "#..............#",
    "######++########",
  ];
  const materiaShop = function* (s) {
    if (C3.plate(s)) {
      yield s.say('Materia Shop', "Back in business, thanks to you! Nothing like a little mystery solved to get a guy's spirits up.");
      yield s.shop('wallmarket_materia');
      return;
    }
    if (s.flag('c3_tiara_got')) { yield s.say('Materia Shop', "Heh heh... So that's what they sell in that machine. My curiosity is satisfied. The shop'll be back open soon."); return; }
    if (s.flag('c3_vend_done')) { yield* FF7.story.c3_tiaraTrade(s); return; }
    if (s.flag('c3_tiara_quest')) { yield s.say('Materia Shop', "Did you find out what's in the vending machine at the inn? It only sells at night, when you're a guest."); return; }
    yield s.say('Materia Shop', "Sorry, we're closed. I just can't focus on work right now.\f......There's something that's been bugging me for months. The vending machine at the inn. I've always wondered what it sells.");
    yield s.say('Materia Shop', "They only sell to guests, late at night. I can't very well stay at an inn in my own town, people would talk!\fHey, would you do it for me? Stay the night, buy whatever it sells, and bring it to me. I'll make it worth your while.");
    s.set('c3_tiara_quest');
  };
  FF7.defineMap('wall_materia', {
    name: 'Materia Shop', area: 'Midgar', theme: 'house', music: 'oppressed',
    look: { wall: '#7a88b0', trim: '#303a60' },
    grid: MSHOP,
    entries: { from_street: [6, 6, 'up'] },
    exits: [{ at: [6, 7, 2, 1], to: 'wall_north', entry: 'from_materia', sfx: 'door' }],
    npcs: [
      { id: 'matclerk', name: 'Materia Shop', model: 'man16', at: [7, 2], dir: 'down', talk: materiaShop },
    ],
    triggers: [C3.counter(4, 3, 7, materiaShop)],
    onLoad: function (s) { C3.applyDress(s); },
  });

  FF7.story.c3_tiaraTrade = function* (s) {
    const tier = s.get('c3_vend_tier');
    yield s.say('Materia Shop', "You got it?! Let me see, let me see!");
    yield s.msg('{CLOUD} hands over the little box from the vending machine.');
    yield s.say('Materia Shop', "......Ha! Ha ha ha! So THAT'S what they sell! Oh, that's too good.\fA deal's a deal. Here, take this. It's been sitting in my back room forever.");
    s.set('c3_tiara_got');
    yield s.give(tier >= 3 ? 'diamond_tiara' : tier === 2 ? 'ruby_tiara' : 'glass_tiara');
  };

  // ================================================================== the weapon shop (batteries after the plate falls)
  const WSHOP = [
    "##################",
    "#kkk..q....q..kkk#",
    "#................#",
    "#...DDDDDDDD.....#",
    "#................#",
    "#.o............o.#",
    "#................#",
    "#######++#########",
  ];
  const weaponShop = function* (s) {
    if (C3.inDress(s)) yield s.say('Weapon Shop', "Heh, a lady who likes weapons? My kind of customer!");
    else yield s.say('Weapon Shop', "Weapons, armor, the works. Wall Market's finest steel!");
    yield s.shop('wallmarket_weapons');
  };
  FF7.defineMap('wall_weapons', {
    name: 'Weapon Shop', area: 'Midgar', theme: 'house', music: 'oppressed',
    look: { wall: '#8a7060', trim: '#4a3020' },
    grid: WSHOP,
    entries: { from_street: [7, 6, 'up'] },
    exits: [{ at: [7, 7, 2, 1], to: 'wall_north', entry: 'from_weapons', sfx: 'door' }],
    npcs: [
      { id: 'wpnowner', name: 'Weapon Shop', model: { base: 'man', build: 'big', top: '#6a4a3a', sleeve: 'skin', bottom: '#3a3a3a', hairStyle: 'buzz', extras: ['apron', 'beard'] }, at: [8, 2], dir: 'down', talk: weaponShop },
      { id: 'wpnhelper', name: 'Tinkerer', model: 'worker6', at: [2, 4], dir: 'right',
        talk: function* (s) {
          if (!C3.plate(s)) { yield s.say('Tinkerer', "I'm fixing up some junk I pulled out of the scrap heap. Batteries, I think. Not that anybody needs batteries down here."); return; }
          const bought = s.get('c3_batteries');
          if (bought >= 3) { yield s.say('Tinkerer', "That's all of 'em. Good luck with whatever you're powering up there."); return; }
          yield s.say('Tinkerer', "You're climbing that wire up to the plate? Then you'll want these. Found 'em in the wreckage and fixed 'em up myself.\fThe old machinery up there's all dead. A battery'll get it moving again, for a little while anyway.");
          for (let i = bought; i < 3; i++) {
            const c = yield s.ask('Tinkerer', `Batteries are 100 gil apiece. I've got ${3 - i} left.`, ['Buy one', 'No thanks']);
            if (c !== 0) break;
            if (!s.takeGil(100)) { yield s.say('Tinkerer', "Sorry, pal. 100 gil, no discounts."); break; }
            s.inc('c3_batteries');
            yield s.give('battery');
          }
        } },
    ],
    triggers: [C3.counter(4, 3, 8, weaponShop)],
    onLoad: function (s) { C3.applyDress(s); },
  });

  // ================================================================== the inn (and its vending machine)
  const INN = [
    "################### ",
    "#b.b.b.#......v..k. ",
    "#......#........... ",
    "#.............DDD.. ",
    "#......#........... ",
    "#######............ ",
    "#..c.t............. ",
    "#.................j ",
    "#########++######## ",
  ];
  const innkeeper = function* (s) {
    const ok = yield s.inn(10, { who: 'Innkeeper', text: "Welcome to the inn! One night's 10 gil. Want a room?" });
    if (ok && s.flag('c3_tiara_quest') && !s.flag('c3_vend_done')) yield* FF7.story.c3_vending(s);
  };
  FF7.defineMap('wall_inn', {
    name: 'Wall Market Inn', area: 'Midgar', theme: 'house', music: 'oppressed',
    camera: { yaw: 35, pitch: 52, dist: 10 },   // diagonal view like 01-midgar_079 (east side open)
    grid: INN,
    entries: { from_street: [9, 7, 'up'] },
    exits: [{ at: [9, 8, 2, 1], to: 'wall_south', entry: 'from_inn', sfx: 'door' }],
    npcs: [
      { id: 'innkeep', name: 'Innkeeper', model: 'woman11', at: [15, 2], dir: 'down', talk: innkeeper },
      { id: 'innguest', name: 'Guest', model: 'man17', at: [4, 6], dir: 'right',
        talk: function* (s) { yield s.say('Guest', "The vending machine? Guests can only use it at night. Nobody knows what it sells. Me? I'm afraid to find out."); } },
    ],
    triggers: [
      C3.counter(14, 3, 3, innkeeper),
      { at: [14, 1], on: 'talk', run: function* (s) { yield s.msg("A vending machine. The labels are all scratched off.\nA little sign reads: \"FOR GUESTS ONLY. NIGHTTIME SERVICE.\""); } },
    ],
    onLoad: function (s) { C3.applyDress(s); },
  });

  FF7.story.c3_vending = function* (s) {
    yield s.fadeOut(20);
    s.music('none');
    s.place('player', 3, 2, 'down');
    yield 30;
    yield s.fadeIn(30);
    yield s.say('cloud', "(......Middle of the night. The vending machine should be running now.)");
    yield s.move('player', [[7, 3], [14, 2]]);
    yield s.face('player', 'up');
    s.sfx('beep');
    yield s.msg('The vending machine hums to life. There are three buttons: 50, 100 and 200 gil.');
    const c = yield s.ask(null, 'Which one?', ['50 gil', '100 gil', '200 gil', "Don't buy anything"]);
    if (c === 3) { yield s.say('cloud', "(......Maybe later.)"); s.music('oppressed'); return; }
    const price = [50, 100, 200][c];
    if (!s.takeGil(price)) { yield s.msg("Not enough gil."); s.music('oppressed'); return; }
    s.setVar('c3_vend_tier', c + 1);
    s.set('c3_vend_done');
    s.sfx('item');
    yield s.msg('Clunk! A little box with a cartoon bee on the lid drops out. Something inside rattles.');
    yield s.say('cloud', "(......I don't want to know. The materia shop guy can have it.)");
    s.music('oppressed');
  };

  // ================================================================== the gym, "Men's Hall" (the wig)
  const GYM = [
    "################### ",
    "#MM..MM...k..MM..q. ",
    "#.................. ",
    "#...____....____... ",
    "#...____....____... ",
    "#.................. ",
    "#M....M......M...M. ",
    "#.................. ",
    "#########++######## ",
  ];
  const bigBro = function* (s) {
    if (s.flag('c3_wig_got')) {
      const c = yield s.ask('Big Bro', "Back for another round, brother? Squats build character!", ['Squat!', 'Maybe later']);
      if (c !== 0) return;
      const r = yield* C3.squats(s);
      yield s.say('Big Bro', r === 'win' ? "You beat me AGAIN?! Magnificent!" : r === 'tie' ? "A tie! The bonds of brotherhood grow stronger!" : "Ha! Keep training, brother!");
      return;
    }
    if (!s.flag('c3_wig_quest')) {
      yield s.say('Big Bro', "Welcome to the Men's Hall! Where boys become MEN! Hup! Hup!\fWanna squat with the brothers? Come back when you've got a reason to sweat!");
      return;
    }
    yield s.say('Big Bro', "A wig, huh? Heh heh. Sure, I've got wigs. Plenty of 'em. Don't ask why.\fBut in the Men's Hall, you EARN what you get! Beat me in a squat contest!");
    yield s.say('Big Bro', "The rules are simple. Squat as many times as you can before the time runs out. Keep a steady rhythm! Get sloppy and you'll lose count.");
    const c = yield s.ask('Big Bro', 'Ready?', ['Bring it on.', 'Hold on a sec.']);
    if (c !== 0) return;
    const r = yield* C3.squats(s);
    s.set('c3_wig_got');
    if (r === 'win') {
      yield s.say('Big Bro', "Hff... hff... Unbelievable! You beat me fair and square!\fTake my finest. The blonde one! You've earned it, brother!");
      yield s.give('blonde_wig');
    } else if (r === 'tie') {
      yield s.say('Big Bro', "A tie?! Not bad! Not bad at all! Here, take this dyed wig. Nice color on it.");
      yield s.give('dyed_wig');
    } else {
      yield s.say('Big Bro', "Hah! Not even close! But you gave it your all, and that's what counts.\fHere, take this old wig anyway. Everybody deserves a wig.");
      yield s.give('wig');
    }
  };
  FF7.defineMap('wall_gym', {
    name: "Men's Hall", area: 'Midgar', theme: 'house', music: 'oppressed',
    camera: { yaw: 35, pitch: 52, dist: 10 },   // diagonal view like 01-midgar_088 (east side open)
    look: { wall: '#9a8a70', floor: ['#8a7050', '#826848'], floor3: ['#3a6a9a', '#346494'] },
    grid: GYM,
    entries: { from_street: [9, 7, 'up'] },
    exits: [{ at: [9, 8, 2, 1], to: 'wall_north', entry: 'from_gym', sfx: 'door' }],
    npcs: [
      { id: 'bigbro', name: 'Big Bro', model: { base: 'man', build: 'big', top: '#e0e0e0', sleeve: 'skin', bottom: '#2a4a8a', hairStyle: 'buzz', hair: '#302020', extras: ['headband', 'wristband'] }, at: [9, 3], dir: 'down', talk: bigBro },
      { id: 'gymbro1', name: 'Gym Brother', model: { base: 'man', build: 'big', top: 'skin', sleeve: 'skin', bottom: '#8a2a2a', hairStyle: 'bald' }, at: [5, 3], dir: 'down', anim: 'fistpump',
        talk: function* (s) {
          if (C3.inDress(s)) { yield s.say('Gym Brother', "Whoa... those are some serious calves, ma'am. You squat?"); return; }
          yield s.say('Gym Brother', "Hup! Hup! Big Bro is the greatest! His thighs are like tree trunks!");
        } },
      { id: 'gymbro2', name: 'Gym Brother', model: { base: 'man', build: 'big', top: '#2a2a2a', sleeve: 'skin', bottom: '#2a2a2a', hairStyle: 'short' }, at: [14, 4], dir: 'left', anim: 'fistpump',
        talk: function* (s) { yield s.say('Gym Brother', "My brother Mukki hangs out at the Honey Bee Inn. Says it's for the steam baths. Sure it is."); } },
    ],
    onLoad: function (s) { C3.applyDress(s); },
  });

  // ================================================================== the Honey Bee Inn
  const HB = [
    "###+####+######+####+###+#",
    "#........................#",
    "#........................#",
    "#........................#",
    "#==========^^^^==========#",
    "#.........=^^^^=.........#",
    "#........................#",
    "#...NN..............NN...#",
    "#.......__________.......#",
    "#.......__________.......#",
    "#........................#",
    "#........................#",
    "#........................#",
    "############++############",
  ];
  const HB_GIRL = { base: 'woman', top: '#f0d020', sleeve: 'skin', bottom: '#202020', skirt: 'short', legs: 'skin', hair: '#e0b040', hairStyle: 'ponytail', extras: ['bow'] };
  const backToHall = function* (s, x) { s.place('player', x, 1, 'down'); yield s.fadeIn(30); s.music('honeybee'); };
  const hbReception = function* (s) {
    if (s.flag('c3_hb_room_used')) { yield s.say('Honey Bee Girl', "Hope you enjoyed your stay, honey! Feel free to visit the dressing room upstairs before you go."); return; }
    yield s.say('Honey Bee Girl', "Welcome to the Honey Bee Inn, honey! Which room would you like tonight?");
    const c = yield s.ask('Honey Bee Girl', 'Pick a room!', ['The Group Room', 'The &$#% Room', "The Lover's Room", "The Queen's Room", 'Never mind']);
    if (c === 4) return;
    if (c === 2 || c === 3) { yield s.say('Honey Bee Girl', "Oh, I'm sorry! That room's occupied right now. You could always... peek. Just a little. Hee hee!"); return; }
    s.set('c3_hb_room_used');
    if (c === 0) yield* FF7.story.c3_groupRoom(s);
    else yield* FF7.story.c3_weirdRoom(s);
  };
  FF7.defineMap('wall_honeybee', {
    name: 'Honey Bee Inn', area: 'Midgar', theme: 'wallmarket', music: 'honeybee',
    look: { floor: ['#6a2a40', '#62243a'], floor3: ['#e0c020', '#d8b818'], wall: '#8a3a5a', trim: '#e0c020', indoor: true, sky: ['#000000', '#000000'], fog: null },
    lights: [[12, 8, '#ff70c0', 4], [4, 7, '#ffe040', 2.5], [21, 7, '#ffe040', 2.5]],
    grid: HB,
    heights: C3.hm(HB, [[0, 0, 26, 5, 4], [11, 4, 4, 1, 3], [11, 5, 4, 1, 1]]),
    entries: { from_street: [12, 12, 'up'] },
    exits: [{ at: [12, 13, 2, 1], to: 'wall_south', entry: 'from_honeybee', sfx: 'door' }],
    npcs: [
      { id: 'hbrecep', name: 'Honey Bee Girl', model: HB_GIRL, at: [5, 11], dir: 'right', talk: hbReception },
      { id: 'hbmgr', name: 'Manager', model: { base: 'man', top: '#202020', sleeve: '#202020', bottom: '#202020', hair: '#e0c020', hairStyle: 'slick', extras: ['bowtie', 'suit', 'mustache'] }, at: [20, 11], dir: 'left',
        talk: function* (s) { yield s.say('Manager', "The Honey Bee Inn is a place of dreams, my friend! Every room, a new fantasy. Ask the young lady by the door to choose your room."); } },
      { id: 'hbdance1', name: 'Honey Bee Girl', model: HB_GIRL, at: [10, 8], dir: 'down', anim: 'wave',
        talk: function* (s) { yield s.say('Honey Bee Girl', "Buzz buzz! We're the Honey Bees! Aren't we cute?"); } },
      { id: 'hbdance2', name: 'Honey Bee Girl', model: HB_GIRL, at: [15, 8], dir: 'down', anim: 'wave',
        talk: function* (s) { yield s.say('Honey Bee Girl', "The dressing room upstairs is where we do our makeup. The girl on the left is a genius with a brush!"); } },
      { id: 'hbguest', name: 'Guest', model: 'man18', at: [21, 5], dir: 'up',
        talk: function* (s) { yield s.say('Guest', "I come here every week. For the ambience. ......Stop looking at me like that."); } },
    ],
    triggers: [
      { at: [3, 0], run: function* (s) { yield s.msg('"The Group Room". The sound of splashing and hearty laughter drifts out.'); s.place('player', 3, 1, 'down'); } },
      { at: [8, 0], run: function* (s) { yield s.msg('"The &$#% Room". A strange pink glow seeps under the door.'); s.place('player', 8, 1, 'down'); } },
      { at: [15, 0], run: function* (s) { yield* FF7.story.c3_peekLover(s); } },
      { at: [20, 0], run: function* (s) { yield* FF7.story.c3_peekQueen(s); } },
      { at: [24, 0], run: function* (s) { yield* FF7.story.c3_makeup(s); } },
    ],
    onLoad: function (s) { C3.applyDress(s); },
    onEnter: function* (s) {
      if (s.flag('c3_hb_seen')) return;
      s.set('c3_hb_seen');
      yield s.say('cloud', "(......What have I gotten myself into.)");
    },
  });

  FF7.story.c3_groupRoom = function* (s) {
    yield s.say('Honey Bee Girl', "The Group Room! Great choice, honey. Right this way!");
    yield s.fadeOut(30);
    s.music('none');
    yield s.caption("The Group Room.\n\nClouds of steam. A huge wooden bathtub.\nAnd in it: a mountain of a man, surrounded by his grinning brothers.", { hold: 200, bg: '#000' });
    yield s.say('Mukki', "Welcome, brother! Welcome! I am Mukki, and these are my brothers! Into the bath with you!", { pos: 'middle' });
    yield s.say('cloud', "......Wait. I think there's been a—", { pos: 'middle' });
    yield s.say('Brothers', "Scrub! Scrub! Scrub-a-dub-dub!", { pos: 'middle' });
    yield s.caption("......\n\nThe brothers scrub {CLOUD} from head to toe\nwith terrifying, brotherly enthusiasm.\n\n......", { hold: 200, bg: '#000' });
    yield s.say('Mukki', "Hah hah hah! You've got the heart of a true man, brother! Take these as a symbol of our bond!", { pos: 'middle' });
    yield s.give('bikini_briefs');
    yield s.say('cloud', "(......I'm going to pretend none of that happened.)", { pos: 'middle' });
    yield* backToHall(s, 3);
  };

  FF7.story.c3_weirdRoom = function* (s) {
    yield s.say('Honey Bee Girl', "Ooh, the &$#% Room! Brave choice, honey. Right this way!");
    yield s.fadeOut(30);
    s.music('none');
    yield s.caption("The &$#% Room.\n\nA round bed. Pink lights. Soft music.\n{CLOUD} lies down... and his eyelids grow heavy......", { hold: 200, bg: '#1a0010' });
    yield s.caption("A giant honey bee buzzes in slow circles overhead.\nIt is wearing a tiny crown.\n\n\"Bzzz... Bzzz... Who are you...?\"", { hold: 200, bg: '#2a0020' });
    yield s.caption("\"......Who am I?\"\n\nThe bee's face slowly turns into Mukki's.\n\n\"WAKEY WAKEY, BROTHER!\"", { hold: 200, bg: '#300020' });
    yield s.say('cloud', "......!!", { pos: 'middle' });
    yield s.msg("{CLOUD} wakes with a start, clutching something frilly.");
    yield s.give('lingerie');
    yield s.say('cloud', "(......Where did this come from?)", { pos: 'middle' });
    yield* backToHall(s, 8);
  };

  FF7.story.c3_peekLover = function* (s) {
    yield s.msg('"The Lover\'s Room". Occupied.\nThere\'s a keyhole...');
    const c = yield s.ask(null, 'Peek through the keyhole?', ['Peek', "Don't"]);
    if (c === 0) {
      yield s.msg("Through the keyhole: a middle-aged couple in matching bathrobes, feeding each other strawberries and giggling like teenagers.");
      yield s.say('cloud', "(......Good for them.)");
    }
    s.place('player', 15, 1, 'down');
  };
  FF7.story.c3_peekQueen = function* (s) {
    yield s.msg('"The Queen\'s Room". Occupied.\nThere\'s a keyhole...');
    const c = yield s.ask(null, 'Peek through the keyhole?', ['Peek', "Don't"]);
    if (c === 0) {
      yield s.msg("Through the keyhole: a portly businessman in a paper crown sits on a throne of pillows, rehearsing a royal speech to an audience of stuffed chocobos.");
      yield s.say('cloud', "(......I didn't see anything.)");
    }
    s.place('player', 20, 1, 'down');
  };

  FF7.story.c3_makeup = function* (s) {
    yield s.msg('"Dressing Room".');
    if (s.flag('c3_makeup_done')) {
      yield s.say('Makeup Artist', "Still gorgeous, honey! I don't touch up perfection.");
      s.place('player', 24, 1, 'down');
      return;
    }
    yield s.say('Makeup Artist', "Ooh, who's this? What a face! Bone structure like that deserves a little color.\fSit down, sit down! Let me work my magic. No charge for a canvas this good!");
    const c = yield s.ask(null, 'Let her do your make-up?', ['Sure', 'No thanks']);
    if (c !== 0) { s.place('player', 24, 1, 'down'); return; }
    yield s.fadeOut(20);
    // one-time attraction bonus (97/256: +1, 96/256: +3, 63/256: +5); the sound gives it away (FF7)
    const r = s.random(256);
    const pts = r < 97 ? 1 : r < 193 ? 3 : 5;
    s.setVar('c3_makeup_pts', pts);
    s.set('c3_makeup_done');
    s.sfx(pts === 1 ? 'ching' : pts === 3 ? 'heal' : 'magic');
    yield 60;
    yield s.fadeIn(20);
    yield s.say('Makeup Artist', pts === 5 ? "Oh my... I've outdone myself. You're absolutely radiant!" : pts === 3 ? "There! Lovely. Just lovely." : "There we go. ...Well, it's an improvement.");
    s.place('player', 24, 1, 'down');
  };

  // ================================================================== Corneo's mansion: the hall
  const HALL = [
    "###+##########++###+##########",
    "#k.....#.............#......k#",
    "#......#.............#.......#",
    "#u.....#.............#......u#",
    "#......#.............#.......#",
    "#...........=^^^^=...........#",
    "#j..........=^^^^=..........j#",
    "#...........=^^^^=...........#",
    "#............................#",
    "#..u......................u..#",
    "#............................#",
    "#.____.................____..#",
    "#............................#",
    "#j..........................j#",
    "#############++###############",
  ];
  const bride = s => s.get('c3_bride');   // 1 Tifa, 2 Aeris, 3 Cloud
  FF7.defineMap('corneo_hall', {
    name: "Corneo's Mansion", area: 'Midgar', theme: 'mansion', music: 'corneo',
    grid: HALL,
    heights: C3.hm(HALL, [[8, 0, 13, 5, 6], [13, 5, 4, 1, 4], [13, 6, 4, 1, 3], [13, 7, 4, 1, 1]]),
    lights: [[14, 10, '#ffd080', 4]],
    entries: { from_gate: [13, 13, 'up'], from_basement: [3, 1, 'down'], from_office: [14, 1, 'down'], from_lackeys: [19, 1, 'down'] },
    exits: [
      { at: [13, 14, 2, 1], to: 'corneo_gate', entry: 'from_mansion', sfx: 'door',
        if: s => C3.plate(s) || !s.get('c3_bride'),
        blocked: function* (s) { yield s.say('cloud', "(Not without Tifa and {AERIS}.)"); } },
      { at: [3, 0, 1, 1], to: 'corneo_basement', entry: 'from_hall', sfx: 'door' },
      { at: [14, 0, 2, 1], to: 'corneo_office', entry: 'from_hall', sfx: 'door',
        if: s => C3.plate(s) || (s.flag('c3_lackeys_beaten') && (bride(s) === 2 ? s.flag('c3_tifa_found') : s.flag('c3_aeris_freed'))),
        blocked: function* (s) {
          if (!s.get('c3_bride')) { yield s.say("Corneo's Lackey", "Whoa there, sweetheart! The Don's getting ready for the audition. Wait downstairs 'til you're called, heh heh."); return; }
          yield s.say('cloud', "(......{AERIS}. Where did they take her? Downstairs, maybe.)");
        } },
      { at: [19, 0, 1, 1], to: 'corneo_lackeys', entry: 'from_hall', sfx: 'door',
        if: s => C3.plate(s) || s.flag('c3_lackeys_beaten'),
        blocked: function* (s) { yield s.say("Corneo's Lackey", "Heh heh... That's the boys' room, doll. You'll get a look inside soon enough."); } },
    ],
    npcs: [
      { id: 'hallguard', name: "Corneo's Lackey", model: LACKEY(1), at: [15, 2], dir: 'down', show: s => !s.get('c3_bride') && !C3.plate(s),
        talk: function* (s) { yield s.say("Corneo's Lackey", "Heh heh... The Don's gonna love you two. Make yourselves at home! Just not upstairs. Not yet."); } },
      { id: 'hallmaid', name: 'Maid', model: { base: 'woman', top: '#202020', sleeve: '#202020', bottom: '#202020', hairStyle: 'bun', extras: ['apron'] }, at: [24, 10], dir: 'left',
        talk: function* (s) {
          if (C3.plate(s)) { yield s.say('Maid', "The Don fled the city, they say. I'm still waiting for my wages. ......I'm starting to think I'll be waiting a long time."); return; }
          yield s.say('Maid', "Another bride night... There's a girl waiting downstairs. She came in on the wagon earlier. Poor thing.");
        } },
      { id: 'hallthug', name: "Corneo's Lackey", model: LACKEY(2), at: [5, 10], dir: 'right', show: s => C3.plate(s),
        talk: function* (s) { yield s.say("Corneo's Lackey", "The Don? Took off after some crazy ladies trashed his bedroom. Said something about laying low in the countryside for a while."); } },
    ],
    triggers: [
      { id: 'tifa_runs', at: [17, 1, 4, 2], if: s => bride(s) === 2 && s.flag('c3_lackeys_beaten') && !s.flag('c3_tifa_found'),
        run: function* (s) { yield* FF7.story.c3_tifaRuns(s); } },
    ],
    onLoad: function (s) { C3.applyDress(s); },
  });

  FF7.story.c3_tifaRuns = function* (s) {
    s.set('c3_tifa_found');
    s.spawn('tifa', C3.TIFA_DRESS, 14, 9, 'up', { name: 'Tifa' });
    yield s.say('tifa', "Cloud!!");
    yield s.run('tifa', [[14, 4], [17, 2]]);
    yield s.face('player', 'tifa');
    // FF7 date points (Aeris is the bride), the odd way round: asking after Tifa costs her 2, rushing
    // to Aeris' side wins her 3 (the Date Guide: "Yes, it *is* that way around")
    const DP = [{ tifa: -2 }, { tifa: 3 }];
    const c = yield C3.pick(s, ['Are you okay?', "We've got to help {AERIS}!"], null, { date: DP });
    FF7.story.datePts(s, DP[c]);
    if (c === 0) yield s.say('tifa', "Please. It'll take more than a few creeps to rattle me!");
    else yield s.say('tifa', "Wow, thanks for asking how I am, Cloud......\fHmph. Fine, let's go! Corneo's room is behind his office!");
    s.remove('tifa');
    s.join('tifa');
    yield s.msg('Tifa joined the party!');
  };

  // ================================================================== the basement (Tifa; the "torture room")
  const BASE = [
    "###+################# ",
    "#......|......|...... ",
    "#.................... ",
    "#......tttt.......... ",
    "#......tttt.....q.... ",
    "#.................... ",
    "#..|...........|..... ",
    "#.................... ",
    "#j...............B..j ",
    "#.................... ",
    "##################### ",
  ];
  FF7.defineMap('corneo_basement', {
    name: "Corneo's Mansion - Basement", area: 'Midgar', theme: 'mansion', music: 'corneo',
    camera: { yaw: 35, pitch: 55, dist: 10 },   // diagonal view like 01-midgar_091 (east side open)
    look: { floor: ['#5a5048', '#544a42'], wall: '#6a5a50' },
    grid: BASE,
    entries: { from_hall: [3, 1, 'down'] },
    exits: [{ at: [3, 0, 1, 1], to: 'corneo_hall', entry: 'from_basement', sfx: 'door' }],
    items: [{ at: [19, 2], item: 'ether', id: 'corneo_basement_ether' }],
    npcs: [
      { id: 'kotchdown', name: 'Kotch', model: KOTCH, at: [4, 5], dir: 'up', anim: 'lie', show: s => s.flag('c3_aeris_freed') && !C3.plate(s),
        talk: function* (s) { yield s.say('Kotch', "Just one dance... that's all I wanted... She was so cute......"); } },
      { id: 'kotchtied', name: 'Kotch', model: KOTCH, at: [11, 7], dir: 'up', anim: 'kneel', show: s => C3.plate(s),
        talk: function* (s) {
          yield s.say('Kotch', "Hey! Hey, you! Untie me! The Don ran off and left me tied up down here!\f......It was the lackeys. They were mad about not getting paid. Please?");
          yield s.say('Kotch', "......No? Ugh. Figures. The Don's gone to ground, if you're looking for him. Said the Turks'd be after him for spilling Shinra's secrets.");
        } },
    ],
    onLoad: function (s) { C3.applyDress(s); },
    onEnter: function* (s) {
      if (C3.plate(s)) return;
      if (!s.flag('c3_tifa_basement')) { yield* FF7.story.c3_tifaBasement(s); return; }
      if (bride(s) === 1 && s.flag('c3_lackeys_beaten') && !s.flag('c3_aeris_freed')) yield* FF7.story.c3_freeAeris(s);
    },
  });

  FF7.story.c3_tifaBasement = function* (s) {
    s.set('c3_tifa_basement');
    C3.aerisIn(s, 4, 1, 'down');
    s.spawn('tifa', C3.TIFA_DRESS, 12, 6, 'up', { name: 'Tifa' });
    yield s.move('player', 4, 3);
    yield s.move('aeris', 5, 2);
    yield s.emote('tifa', '?');
    yield s.face('tifa', 'player');
    yield s.say('tifa', "Who's there?\f......Cloud? Is that YOU?");
    yield s.move('tifa', 7, 5);
    yield s.say('tifa', "Cloud, what happened to you? Why are you dressed like...... Actually, you know what? It suits you.");
    yield s.say('cloud', "......Don't ask.");
    yield s.say('tifa', "I was so worried after you fell! And......");
    yield s.face('tifa', 'aeris');
    yield s.say('tifa', "......Who's she?");
    yield s.say('aeris', "Hi! I'm {AERIS}. Nice to meet you, Tifa!");
    yield s.say('tifa', "......Nice to meet you.");
    yield s.face('tifa', 'player');
    yield s.say('cloud', "What are you doing here, Tifa? Dressed like that?");
    yield s.say('tifa', "After the reactor mission, a creepy guy kept hanging around 7th Heaven. Barret shook him down, and he said he worked for Don Corneo.\fThe Don's been asking questions about AVALANCHE. About Barret. I need to know why.");
    yield s.say('tifa', "The Don picks a 'bride' every night. If he picks me, I can get him talking. It's the only way to get close to him.");
    yield s.say('cloud', "And if he doesn't pick you?");
    yield s.say('tifa', "......Well, there are three of us now. Whoever he picks, the other two come running. Right?");
    yield s.say('aeris', "Right! Leave it to us.");
    s.sfx('door');
    s.spawn('kotch', KOTCH, 3, 1, 'down', { name: 'Kotch' });
    yield s.say('kotch', "All right, ladies! The Don is ready to see you now! Up, up, up! Don't keep the Don waiting!");
    yield s.fadeOut(30);
    s.remove('kotch'); s.remove('tifa'); s.remove('aeris');
    yield s.goto('corneo_office', 'lineup');
  };

  FF7.story.c3_freeAeris = function* (s) {
    s.set('c3_aeris_freed');
    C3.aerisIn(s, 11, 3, 'left');
    s.spawn('kotch', KOTCH, 12, 5, 'up', { name: 'Kotch' });
    yield s.say('aeris', "Nooo! Stay away from me!");
    yield s.say('kotch', "Heh heh heh... Aw, c'mon, sweetie! Just one little dance!");
    yield C3.par([s.run('aeris', [[11, 2], [6, 2], [6, 5], [11, 5]]), s.run('kotch', [[12, 2], [7, 2], [6, 4]])]);
    yield C3.par([s.run('aeris', [[5, 3], [3, 2]]), s.run('kotch', [[6, 5], [4, 4]])]);
    yield s.face('aeris', 'kotch');
    yield s.say('aeris', "Sorry, sorry, SORRY!!");
    s.anim('aeris', 'punch');
    s.sfx('hit'); s.shake(2, 10);
    yield s.jump('kotch', 4, 5, 0.4, 20);
    s.anim('kotch', 'lie');
    yield s.say('kotch', "Ohhh... oh... hee hee......");
    s.stopAnim('aeris');
    yield s.face('player', 'aeris');
    yield s.face('aeris', 'player');
    // FF7 date points (Tifa is the bride): asking after Aeris +3, rushing on to Tifa Aeris -2
    const DP = [{ aeris: 3 }, { aeris: -2 }];
    const c = yield s.ask('cloud', "{AERIS}!", ['Are you okay?', "We've got to help Tifa!"], { date: DP });
    FF7.story.datePts(s, DP[c]);
    if (c === 0) yield s.say('aeris', "Me? I'm fine! Totally fine!\f......Okay, my hands are shaking a teeny bit.");
    else yield s.say('aeris', "Right! No time to lose! Corneo's room is behind his office!");
    s.remove('aeris');
    s.remove('kotch');
    s.show('kotchdown');
  };

  // ================================================================== Corneo's office (the audition)
  const OFFICE = [
    "##########++######### ",
    "#k..u............u..k ",
    "#.........DD......... ",
    "#.................... ",
    "#j..................j ",
    "#.................... ",
    "#......________...... ",
    "#......________...... ",
    "#.................... ",
    "##########++######### ",
  ];
  FF7.defineMap('corneo_office', {
    name: "Corneo's Office", area: 'Midgar', theme: 'mansion', music: 'corneo',
    camera: { yaw: 35, pitch: 52, dist: 10 },   // diagonal view like 01-midgar_092 (east side open)
    grid: OFFICE,
    lights: [[10, 3, '#ffd080', 3.5]],
    entries: { from_hall: [10, 8, 'up'], lineup: [10, 5, 'up'], from_bedroom: [10, 1, 'down'] },
    exits: [
      { at: [10, 9, 2, 1], to: 'corneo_hall', entry: 'from_office', sfx: 'door' },
      { at: [10, 0, 2, 1], sfx: 'door',
        run: function* (s) {
          if (C3.plate(s) || s.flag('c3_corneo_done')) { yield s.goto('corneo_bedroom', 'from_office'); return; }
          yield s.goto('corneo_bedroom', 'burst');
        } },
    ],
    onLoad: function (s) { C3.applyDress(s); },
    onEnter: function* (s) {
      if (s.entry() === 'lineup' && !s.get('c3_bride')) yield* FF7.story.c3_audition(s);
    },
  });

  FF7.story.c3_audition = function* (s) {
    C3.aerisIn(s, 8, 5, 'up');
    s.spawn('tifa', C3.TIFA_DRESS, 12, 5, 'up', { name: 'Tifa' });
    s.spawn('corneo', 'corneo', 11, 1, 'down', { name: 'Don Corneo' });
    s.spawn('kotch', KOTCH, 15, 6, 'left', { name: 'Kotch' });
    s.spawn('lk1', LACKEY(0), 4, 7, 'right', { name: "Corneo's Lackey" });
    s.spawn('lk2', LACKEY(3), 17, 7, 'left', { name: "Corneo's Lackey" });
    s.place('player', 10, 5, 'up');
    yield s.fadeIn(30);
    yield s.say('kotch', "Line up, ladies! Nice and straight, in front of the Don!");
    yield s.say('corneo', "Woo-hoo! Nice! Very nice! Excellent!");
    yield s.jump('corneo', 11, 3, 0.9, 26);
    yield s.say('corneo', "Now then... which of you lovely ladies will be the Don's bride tonight? Hmmm......");
    yield s.move('corneo', 8, 4);
    yield s.face('corneo', 'down');
    yield s.say('corneo', "Hmm-hmm-hmm......");
    yield s.move('corneo', 10, 4);
    yield s.face('corneo', 'down');
    yield s.say('corneo', "This one......?");
    yield s.move('corneo', 12, 4);
    yield s.face('corneo', 'down');
    yield s.say('corneo', "Or maybe this one......?");
    yield s.move('corneo', 10, 4);
    yield s.face('corneo', 'down');
    yield s.emote('corneo', '!');
    yield s.say('corneo', "Woo-hoo! That's it, I've decided! The lucky girl tonight is......");
    s.sfx('drumroll');
    yield 90;
    const pick = C3.corneoPick(s);
    s.setVar('c3_bride', pick);
    if (pick === 3) yield* FF7.story.c3_pickCloud(s);
    else if (pick === 2) yield* FF7.story.c3_pickAeris(s);
    else yield* FF7.story.c3_pickTifa(s);
  };

  FF7.story.c3_pickTifa = function* (s) {
    yield s.move('corneo', 12, 4);
    yield s.face('corneo', 'down');
    yield s.say('corneo', "......this lovely, slim young thing!");
    s.face('aeris', 'tifa');
    yield s.face('player', 'tifa');
    yield s.say('tifa', "Hee hee... I'm honored, Don.");
    yield s.say('corneo', "Boys! The other two are all yours!");
    yield s.say("Corneo's Lackey", "Woo-hoo! Thanks, boss!");
    yield C3.par([s.move('corneo', [[11, 3], [11, 1], [10, 0]]), s.move('tifa', [[12, 3], [10, 1], [10, 0]])]);
    s.remove('corneo'); s.remove('tifa');
    yield s.say('kotch', "And YOU, cutie, you're coming with me! Heh heh heh!");
    yield s.say('aeris', "Eh? W-wait a second!");
    yield C3.par([s.move('kotch', [[9, 6], [10, 9]]), s.move('aeris', [[9, 7], [11, 9]])]);
    s.remove('kotch'); s.remove('aeris');
    yield* C3.toLackeys(s);
  };
  FF7.story.c3_pickAeris = function* (s) {
    yield s.move('corneo', 8, 4);
    yield s.face('corneo', 'down');
    yield s.say('corneo', "......this sweet little flower!");
    s.face('tifa', 'aeris');
    yield s.face('player', 'aeris');
    yield s.say('aeris', "Oh my. You have a good eye, Don.");
    yield s.say('corneo', "Boys! The other two are all yours!");
    yield s.say("Corneo's Lackey", "Woo-hoo! Thanks, boss!");
    yield C3.par([s.move('corneo', [[9, 3], [11, 1], [10, 0]]), s.move('aeris', [[8, 3], [10, 1], [10, 0]])]);
    s.remove('corneo'); s.remove('aeris');
    yield s.say('kotch', "And you, gorgeous, you come along with me! Heh heh heh!");
    yield s.say('tifa', "......Hmph.");
    yield C3.par([s.move('kotch', [[13, 7], [10, 9]]), s.move('tifa', [[12, 7], [11, 9]])]);
    s.remove('kotch'); s.remove('tifa');
    yield* C3.toLackeys(s);
  };
  FF7.story.c3_pickCloud = function* (s) {
    yield s.say('corneo', "......this healthy, strapping young beauty!");
    s.face('aeris', 'player');
    yield s.face('tifa', 'player');
    yield s.emote('player', '!!');
    yield s.say('cloud', "H-hold on! I mean... um... could we maybe not?");
    yield s.say('corneo', "Woo-hoo! Playing hard to get! I love it when they're shy!");
    yield s.say('corneo', "Boys! The other two are all yours!");
    yield s.say("Corneo's Lackey", "Woo-hoo! Thanks, boss!");
    yield s.say('corneo', "Now then, my pretty... Let's go somewhere a little more private, hmm?");
    yield C3.par([s.move('corneo', [[11, 3], [11, 1], [10, 0]]), s.move('player', [[10, 3], [10, 1], [10, 0]])]);
    yield s.fadeOut(30);
    s.remove('corneo');
    yield s.goto('corneo_bedroom', 'with_don');
  };
  C3.toLackeys = function* (s) {
    yield s.say("Corneo's Lackey", "Heh heh heh... C'mon, sweetheart. The boys are waiting.");
    yield s.fadeOut(30);
    yield s.goto('corneo_lackeys', 'captive');
  };

  // ================================================================== the lackeys' room
  // T: under the mahjong table and its floor cushions (props below; the north side stays open floor, or the
  // south wall behind four rows of non-floor would no longer be cut away); m: the big jars; Z: the TV
  const LACK = [
    "########www#######",
    "#qDDD.......DDDq.#",
    "#................#",
    "#m.............Z.#",
    "#m....____.......#",
    "#.....TTTT.......#",
    "#.....TTTT.....t.#",
    "#.t..._TT_.......#",
    "#########+########",
  ];
  const lackeyUp = s => { const b = s.get('c3_bride'); return b > 0 && b < 3 && !s.flag('c3_lackeys_beaten') && !C3.plate(s); };
  const lackeyDown = s => s.flag('c3_lackeys_beaten') && !C3.plate(s);
  // 01-midgar_093: red lacquer walls and cabinets under a lattice window, the green mahjong table on
  // its mat with floor cushions round it, big jars, the TV, card tables strewn with bottles.
  FF7.defineMap('corneo_lackeys', {
    name: "Corneo's Mansion - East Wing", area: 'Midgar', theme: 'mansion', music: 'corneo',
    look: { floor: ['#5a4a3c', '#544436'], floor3: ['#7a7040', '#726838'], wall: '#8a2a24', trim: '#d8c8a0', wood: ['#7a2a20', '#6a4228'] },
    camera: { pitch: 58, dist: 9 },
    lights: [[8, 5, '#ffe0a0', 3.5], [15, 3, '#90b0ff', 2], [2, 7, '#ffc080', 2]],
    legend: { 'T': 'block' },
    props: [
      { at: [7.5, 5.5], prop: 'disc', sides: 4, rot: 45, r: 2.83, h: 0.012, col: '#6a6036', top: '#7a7040' },   // the mat
      { at: [7.5, 5.5], prop: 'mahjong', w: 1.7 },
      { at: [6, 5.5], prop: 'cushion', col: '#a88a5c', scale: 1.4 }, { at: [9, 5.5], prop: 'cushion', col: '#b89c6c', scale: 1.4, rot: 12 },
      { at: [7.5, 7], prop: 'cushion', col: '#8a5a38', scale: 1.4, rot: -8 },
      { at: [1, 3], prop: 'urn', col: '#6a3a24', col2: '#c89a40', size: 1.35 },
      { at: [1, 4], prop: 'urn', col: '#2a6a4e', col2: '#c8a040', size: 1.15 },
      { at: [15, 3], prop: 'tv', rot: -40 },
    ],
    grid: LACK,
    entries: { from_hall: [9, 7, 'up'], captive: [10, 4, 'up'] },
    exits: [
      { at: [9, 8, 1, 1], to: 'corneo_hall', entry: 'from_lackeys', sfx: 'door', if: s => !lackeyUp(s),
        blocked: function* (s) { yield s.say("Corneo's Lackey", "Hey, hey! The door's for leaving, and nobody's leaving yet, doll!"); } },
    ],
    items: [{ at: [15, 2], item: 'phoenix_down', id: 'corneo_lackeys_phoenix' }],
    npcs: [
      { id: 'scotch', name: 'Scotch', model: SCOTCH, at: [8, 2], dir: 'down', show: lackeyUp,
        talk: function* (s) { yield* FF7.story.c3_lackeyFight(s); } },
      { id: 'lka', name: "Corneo's Lackey", model: LACKEY(0), at: [5, 4], dir: 'right', show: lackeyUp, anim: 'wave',
        talk: function* (s) { yield s.say("Corneo's Lackey", "Wow, you've got some real arms on you, sweetheart... Like, REAL arms.\f......Do you lift?"); } },
      { id: 'lkb', name: "Corneo's Lackey", model: LACKEY(1), at: [11, 5], dir: 'left', show: lackeyUp,
        talk: function* (s) { yield s.say("Corneo's Lackey", "Whoa, your eyes are practically sparkling. Is that makeup? It's... hypnotic......"); } },
      { id: 'lkc', name: "Corneo's Lackey", model: LACKEY(2), at: [11, 3], dir: 'down', show: lackeyUp, anim: 'fistpump',
        talk: function* (s) { yield s.say("Corneo's Lackey", "Shall we dance, gorgeous? I've been practicing my moves all week for a night like this!"); } },
      { id: 'lkd', name: "Corneo's Lackey", model: LACKEY(3), at: [10, 7], dir: 'up', show: lackeyUp,
        talk: function* (s) { yield s.say("Corneo's Lackey", "Leavin' already? The party's just gettin' started, doll!"); } },
      { id: 'scotchdown', name: 'Scotch', model: SCOTCH, at: [8, 2], dir: 'down', anim: 'lie', show: lackeyDown,
        talk: function* (s) { yield s.say('Scotch', "Ugh... A man... I got beat by a man in a dress... My life is over......"); } },
      { id: 'lkdown', name: "Corneo's Lackey", model: LACKEY(0), at: [5, 4], dir: 'right', anim: 'lie', show: lackeyDown,
        talk: function* (s) { yield s.say("Corneo's Lackey", "Mommy......"); } },
      { id: 'lkidle', name: "Corneo's Lackey", model: LACKEY(1), at: [13, 4], dir: 'left', anim: 'sit', show: s => C3.plate(s),
        talk: function* (s) { yield s.say("Corneo's Lackey", "The Don skipped town. No boss, no pay, no bride nights. ......Honestly? Kind of a relief."); } },
    ],
    onLoad: function (s) { C3.applyDress(s); },
    onEnter: function* (s) {
      if (s.entry() === 'captive' && !s.flag('c3_lackey_intro')) {
        s.set('c3_lackey_intro');
        yield s.say('Scotch', "Listen up, boys! Company's here, courtesy of the one and only Don Corneo!");
        yield s.say("Corneo's Lackeys", "Long live the Don! Woooo!");
        yield s.say('Scotch', "Heh heh heh... So, ladies... ready to party?");
      }
    },
  });

  FF7.story.c3_lackeyFight = function* (s) {
    yield s.say('Scotch', "......Heh heh. What's the matter, sweetie? Want a little one-on-one time with ol' Scotch?");
    yield s.say('cloud', "......I'll pass. Thanks for the offer, though.\fYou see......");
    yield s.say("Corneo's Lackeys", "We see......?");
    s.anim('player', 'jump');
    yield s.jump('player', 9, 4, 0.8, 22);
    s.stopAnim('player');
    yield s.say('cloud', "I'd sooner kiss a Hedgehog Pie than any of you creeps!!");
    yield s.emote('scotch', '!!');
    yield s.say('Scotch', "Wha... That voice... You're a MAN?!\f......You made fools of us! Get him! Beat him to a pulp!!");
    yield s.battle({ table: 'event_corneo_lackeys', bg: 'wallmarket', music: 'battle', noEscape: true });
    ['lka', 'lkb', 'lkc', 'lkd'].forEach(id => s.anim(id, 'lie'));
    yield s.say('Scotch', "Grrr! Useless, the lot of you! Fine! If you want something done right, you do it yourself!!");
    yield s.battle({ table: 'event_scotch', bg: 'wallmarket', music: 'battle', noEscape: true });
    s.anim('scotch', 'lie');
    s.set('c3_lackeys_beaten');
    yield s.say('cloud', "(......Now to find the others.)");
  };

  // ================================================================== Corneo's bedroom
  // T: under the heart bed and the two giant paper lanterns (props below); m: vases
  const BED = [
    "####################",
    "#m...._TTTTTT_....m#",
    "#.TT.._TTTTTT_.TT..#",
    "#.TT..__TTTT__.TT..#",
    "#.......____.......#",
    "#..................#",
    "#................u.#",
    "#m................m#",
    "#########++#########",
  ];
  FF7.defineMap('corneo_bedroom', {
    name: "Corneo's Bedroom", area: 'Midgar', theme: 'mansion', music: 'corneo',
    // 01-midgar_095: the heart-shaped bed on a hot-pink dais, huge pink paper lanterns, vases, purple and
    // pink light with the glitter of a disco ball
    look: { floor: ['#5a1a36', '#54162e'], floor3: ['#e04a90', '#d84288'], wall: '#7a2040', trim: '#e0b040', wood: ['#e8508a', '#e8508a'], urn: '#2e7a5a',
      ambient: [0.46, 0.34, 0.44], light: [0.9, 0.6, 0.8] },
    camera: { pitch: 55, dist: 9 },
    grid: BED,
    legend: { 'T': 'block' },
    // the heart bed fills the dais (stretched east-west to the old footprint, its point toward the room),
    // two giant standing paper lanterns with hearts, and a "disco ball" over the headboard
    props: [
      { at: [9.5, 2.15], prop: 'heartbed', r: 1.45, scale: [1.7, 1.15, 1], col: '#f26aa8', col2: '#c02848', col3: '#e0b040' },
      { at: [2.5, 2.5], prop: 'lantern', pole: false, size: 3.4, scale: [1, 2.1, 1], lift: -0.16, col: '#ff5aa8', text: '♥', textCol: '#8a1030' },
      { at: [15.5, 2.5], prop: 'lantern', pole: false, size: 3.4, scale: [1, 2.1, 1], lift: -0.16, col: '#ff5aa8', text: '♥', textCol: '#8a1030' },
      { at: [11.5, 1.2], prop: 'lantern', hang: 2.35, size: 0.8, col: '#b8d8ff' },
      { at: [1, 1], prop: 'urn', size: 1.1 }, { at: [18, 1], prop: 'urn', size: 1.1 },
    ],
    lights: [[9, 2, '#ff80c0', 4], [3, 3, '#ff60a0', 2.5], [16, 2, '#ff60a0', 2.5], [2, 4, '#ff60a0', 2.5], [12, 5, '#a070ff', 3], [7, 6, '#80c0ff', 2]],
    entries: { from_office: [9, 7, 'up'], burst: [9, 7, 'up'], with_don: [14, 5, 'left'] },
    exits: [{ at: [9, 8, 2, 1], to: 'corneo_office', entry: 'from_bedroom', sfx: 'door', if: s => C3.plate(s) || s.flag('c3_corneo_done'),
      blocked: function* (s) { yield s.say('corneo', "Where are you going, kitten? Papa's right here!"); } }],
    items: [{ at: [17, 1], item: 'hyper', id: 'corneo_bedroom_hyper' }],
    npcs: [
      { id: 'donbed', name: 'Don Corneo', model: 'corneo', at: [9, 4], dir: 'down', anim: 'kneel',
        show: s => s.get('c3_bride') === 3 && !s.flag('c3_corneo_done'),
        talk: function* (s) { yield* FF7.story.c3_donDate(s); } },
    ],
    onLoad: function (s) { C3.applyDress(s); },
    onEnter: function* (s) {
      if (s.flag('c3_corneo_done') || C3.plate(s)) return;
      const b = s.get('c3_bride');
      if (s.entry() === 'with_don') { yield s.say('corneo', "Woo-hoo! Finally, some privacy! Don't be shy, sugar, the Don won't bite... much!"); return; }
      if (b === 1) yield* FF7.story.c3_burstTifa(s);
      else if (b === 2) yield* FF7.story.c3_burstAeris(s);
    },
  });

  FF7.story.c3_burstTifa = function* (s) {
    s.hide('player');
    s.spawn('corneo', 'corneo', 9, 4, 'right', { name: 'Don Corneo' });
    s.spawn('tifa', C3.TIFA_DRESS, 12, 4, 'left', { name: 'Tifa' });
    s.anim('corneo', 'kneel');
    yield s.say('corneo', "Woo-hoo! Just you and me now, my sweet! Scooch on over!");
    yield s.say('tifa', "Um, sure... But first, Don, there's something I've been dying to ask you.");
    yield s.say('corneo', "Ask me? Oh-ho, I know, I know! No, there's no Mrs. Corneo! I'm all yours!");
    yield s.say('tifa', "That is NOT what I was going to ask! Hey! Hands to yourself!!");
    yield s.say('corneo', "I can't hold back another second! Papa's comin'!!");
    s.stopAnim('corneo');
    yield C3.par([s.jump('corneo', 11, 4, 0.9, 24), s.jump('tifa', 13, 6, 0.6, 18)]);
    s.sfx('door');
    s.show('player', 9, 7, 'up');
    C3.aerisIn(s, 10, 7, 'up');
    yield s.say('tifa', "Cloud!!");
    yield s.say('corneo', "Wh-what?! Who dares barge into the Don's bedroom?!");
    yield s.say('tifa', "Surprise, Don. The show's over.");
    yield* FF7.story.c3_confess(s);
  };
  FF7.story.c3_burstAeris = function* (s) {
    s.hide('player');
    s.spawn('corneo', 'corneo', 9, 4, 'right', { name: 'Don Corneo' });
    C3.aerisIn(s, 12, 4, 'left');
    s.anim('corneo', 'kneel');
    yield s.say('corneo', "Woo-hoo! Just you and me now, my little flower! Scooch on over!");
    yield s.say('aeris', "Um, Mr. Don? I was hoping we could chat a little first. Just chat.");
    yield s.say('corneo', "Chat? Sure, sure! We can chat all night long... right after—");
    yield s.say('aeris', "Mr. Don! Personal space! PERSONAL SPACE!!");
    yield s.say('corneo', "I can't hold back another second! Papa's comin'!!");
    s.stopAnim('corneo');
    yield C3.par([s.jump('corneo', 11, 4, 0.9, 24), s.jump('aeris', 13, 6, 0.6, 18)]);
    s.sfx('door');
    s.show('player', 9, 7, 'up');
    s.spawn('tifa', C3.TIFA_DRESS, 10, 7, 'up', { name: 'Tifa' });
    yield s.say('aeris', "{CLOUD}!");
    yield s.say('corneo', "Wh-what?! Who dares barge into the Don's bedroom?!");
    yield s.say('aeris', "Sorry, Mr. Don. The party's over.");
    yield* FF7.story.c3_confess(s);
  };

  // Cloud was picked: the Don's "date" (player walks up to the bed and talks to him).
  FF7.story.c3_donDate = function* (s) {
    s.hide('donbed');
    s.spawn('corneo', 'corneo', 9, 4, 'down', { name: 'Don Corneo' });
    s.anim('corneo', 'kneel');
    yield s.face('corneo', 'player');
    yield s.say('corneo', "Look at you... what a catch! Those shoulders! That jaw!\fTell me, sugar... am I your type?");
    let state = 'like';
    for (let i = 0; i < 8 && state !== 'burst'; i++) {
      if (state === 'like') {
        const c = yield C3.pick(s, ['You bet!', 'Well......']);
        if (c === 0) { yield s.say('corneo', "Woo-hoo! Music to my ears!\fSo... what shall we do tonight, hmm? Anything you like!"); state = 'want'; }
        else { yield s.say('corneo', "Wh-what's that face? ......Don't tell me you've got another fella?!"); state = 'else'; }
      } else if (state === 'want') {
        const c = yield C3.pick(s, ['Surprise me, big boy.', "Doesn't matter......"]);
        if (c === 0) { yield s.say('corneo', "Hoo boy, you're driving me wild! Pucker up, sugar! Smooch time!"); state = 'kiss'; }
        else { yield s.say('corneo', "Doesn't matter?! What's that supposed to mean?\f......Don't tell me you've got another fella?!"); state = 'else'; }
      } else if (state === 'kiss') {
        const c = yield C3.pick(s, ['......Fine.', 'Not happening.']);
        if (c === 0) {
          yield s.move('player', 10, 5);
          yield s.face('player', 'corneo');
          yield s.msg('{CLOUD} leans in... slowly... closer......');
          yield 40;
          state = 'burst';
        } else { yield s.say('corneo', "Not happening?! Why, you......\f......It's another fella, isn't it?!"); state = 'else'; }
      } else if (state === 'else') {
        // FF7 date points: naming Barret as "the other fella", Barret +5 (nothing else here counts)
        const DP = [{}, { barret: 5 }];
        const c = yield C3.pick(s, ['Nobody but you.', "Actually... there's this guy. Barret......"], null, { date: DP });
        FF7.story.datePts(s, DP[c]);
        if (c === 0) { yield s.say('corneo', "Woo-hoo! That's more like it!\fSo... what shall we do tonight, hmm? Anything you like!"); state = 'want'; }
        else {
          yield s.say('corneo', "Another man?! ......Wait. Barret? Why do I know that name......?");
          yield s.move('player', 13, 3);
          yield s.face('player', 'corneo');
          yield s.say('cloud', "It should. He's the one you've had your men sniffing around Sector 7 for.");
          yield s.say('corneo', "Huh?!");
          state = 'burst';
        }
      }
    }
    s.sfx('door');
    C3.aerisIn(s, 9, 7, 'up');
    s.spawn('tifa', C3.TIFA_DRESS, 10, 7, 'up', { name: 'Tifa' });
    yield s.say('tifa', "Hold it right there!!");
    yield s.say('corneo', "Wh-what?! Who dares barge into the Don's bedroom?!");
    yield s.say('tifa', "Cloud?! Were you actually about to......?!");
    yield s.emote('player', '!!');
    s.anim('player', 'shake');
    yield 20;
    s.stopAnim('player');
    yield s.jump('player', 8, 6, 0.8, 22);
    yield s.say('corneo', "A... a MAN?! My beautiful bride is a MAN?! What in the world is going on here?!");
    yield* FF7.story.c3_confess(s);
  };

  // The Don spills Shinra's plan... then pulls his lever.
  FF7.story.c3_confess = function* (s) {
    s.set('c3_corneo_done');
    s.music('corneo');
    s.stopAnim('corneo');
    s.show('player');
    yield C3.par([s.move('player', 8, 6), s.move('tifa', 10, 6), s.move('aeris', 12, 6), s.move('corneo', 10, 4)]);
    s.face('player', 'up'); s.face('tifa', 'up'); s.face('aeris', 'up');
    yield s.face('corneo', 'down');
    yield s.say('tifa', "All right, Don. Talk. Why did you have your men sniffing around Sector 7? What do you want with Barret?");
    yield s.say('corneo', "B-Barret? Never heard of him! My memory's terrible, you know, just awful......");
    yield s.move('tifa', 10, 5);
    yield s.say('tifa', "Talk. Or I'll twist them right off.");
    yield s.say('aeris', "Ooh, can I help? We could each take one!");
    yield s.emote('corneo', '!!');
    yield s.say('corneo', "Eeeeek! N-not my precious family jewels! Okay, okay, I'll talk! I'll talk!");
    yield s.move('tifa', 10, 6);
    yield s.say('corneo', "I was told to find out where the guy with the gun for an arm was hiding. That Barret. The boss of AVALANCHE.");
    yield s.say('cloud', "Told by who?");
    yield s.say('corneo', "Heidegger! Shinra's head of Public Safety! I'm just a middleman, I swear!");
    yield s.say('tifa', "Shinra... What are they after?");
    yield s.say('corneo', "They're gonna crush AVALANCHE, hideout and all. Wipe it right off the map.\fThey're gonna break the pillar holding up Sector 7... and drop the whole plate on top of it!");
    yield s.emote('tifa', '!!');
    yield s.say('tifa', "Drop the plate?! There are thousands of people living under there!");
    yield s.say('aeris', "They wouldn't... Would they? Just to get to a few people?");
    yield s.say('cloud', "......It's Shinra. They would.");
    yield s.say('corneo', "It's goin' down tonight, ya know. Probably started already. Heh heh......");
    yield s.say('tifa', "Barret... Marlene... Everyone! Cloud, we have to go, NOW!");
    yield s.say('corneo', "Now, now, not so fast! One more thing.\fEver wonder why the bad guy always tells you his whole plan, huh?");
    const c = yield C3.pick(s, ['Because you think you already won?', 'Because you have nothing left to lose?', 'No idea.']);
    yield s.say('corneo', ["Ding ding! ...Close, but no.", "Ha! Wrong! I have LOTS to lose!", "Then let me tell ya!"][c] + "\fIt's because......");
    s.anim('corneo', 'point');
    yield 20;
    yield s.say('corneo', "......a guy always talks when he's got an ace up his sleeve! Buh-bye!!");
    s.sfx('gate'); s.shake(4, 30);
    yield s.emote('player', '!!');
    s.sfx('falling');
    ['player', 'tifa', 'aeris'].forEach(id => s.anim(id, 'hurt'));
    yield s.fadeOut(20);
    s.remove('tifa'); s.remove('aeris'); s.remove('corneo');
    s.set('c3_fell_sewer');
    if (!s.isMember('tifa')) s.join('tifa');
    s.party(['cloud', 'aeris', 'tifa']);
    yield 40;
    // FF7 cuts away to Shinra HQ while the three are out cold in the sewer (01-midgar_096)
    yield* FF7.story.c3_plateMeeting(s);
    yield s.goto('sewer_landing', 'from_corneo');
  };

  // ================================================================== Shinra HQ: the plate-drop meeting
  // The executive conference room: a round table around a glowing holographic model of Midgar, a ring
  // of pillars, windows over the city. President Shinra, Heidegger, Scarlet and Reeve (01-midgar_096).
  const MEET = [
    "######################",
    "#ww#ww#ww#ww#ww#ww#ww#",
    "#|..................|#",
    "#.....|........|.....#",
    "#.........cc.........#",
    "#.......cttttc.......#",
    "#......cttyyttc......#",
    "#......cttyyttc......#",
    "#.......cttttc.......#",
    "#.........cc.........#",
    "#.....|........|.....#",
    "#|..................|#",
    "#....................#",
    "##########++##########",
  ];
  FF7.defineMap('c3_meeting', {
    name: 'Shinra Bldg. — Conference Room', area: 'Midgar', theme: 'shinra', music: 'shinra',
    look: { floor: ['#b8b8c0', '#b0b0b8'], wall: '#9aa6b2', wood: ['#d0d4dc', '#c8ccd4'], mako: '#70ffc0',
      sky: ['#02040a', '#0a1020'], ambient: [0.5, 0.52, 0.56] },
    lights: [[10, 6, '#80ffc0', 4.5], [10, 1, '#fff0d0', 5], [3, 11, '#fff0d0', 3], [18, 11, '#fff0d0', 3]],
    hidePlayer: true,
    grid: MEET,
    entries: { cut: [10, 12, 'up'] },
    exits: [],
  });
  FF7.story.c3_plateMeeting = function* (s) {
    yield s.goto('c3_meeting', 'cut');
    s.music('shinra');
    s.spawn('president', 'president', 10, 10, 'up', { name: 'President Shinra' });
    s.spawn('heidegger', 'heidegger', 6, 6, 'right', { name: 'Heidegger' });
    s.spawn('scarlet', 'scarlet', 15, 6, 'left', { name: 'Scarlet' });
    s.spawn('reeve', 'reeve', 14, 9, 'left', { name: 'Reeve' });
    yield s.cam(10, 7, 1, { dist: 10, pitch: 34 });
    yield s.caption('Meanwhile...\nShinra Headquarters', { hold: 110, bg: '#000' });
    yield s.say('heidegger', "Gyahahaha! Everything's in place, Mr. President. The Turks moved out an hour ago.");
    yield s.say('president', "Good. Then there's nothing left to discuss.\fThe Sector 7 plate comes down tonight, and AVALANCHE along with it.");
    yield s.face('reeve', 'president');
    yield s.say('reeve', "Mr. President, with respect... Dropping an entire plate to catch one band of terrorists?\fThere are thousands of ordinary people living under Sector 7!");
    yield s.say('scarlet', "Kyahahaha! Ordinary people have such a knack for being in the way.");
    yield s.cam(10, 9, 60, { dist: 6.5, pitch: 22 });
    yield s.face('president', 'down');
    yield s.say('president', "It's a question of how the story is told, Reeve.\fAVALANCHE destroyed Sector 7. Shinra, Inc. arrived to lead the rescue. The heroes of the hour.");
    yield s.say('president', "The public will beg us for protection. And the next reactor they come for... they'll hand us themselves.");
    yield s.face('president', 'reeve');
    yield s.say('reeve', "......And rebuilding the plate? The cost alone would—");
    yield s.say('president', "Who said anything about rebuilding?\f......Is there anything else, Reeve?");
    yield 30;
    yield s.say('reeve', "......No, sir.");
    yield s.say('heidegger', "Gyahaha! Tseng's squad will set the emergency release at the top of the pillar. Nobody down there will know what hit them.");
    yield s.face('president', 'up');
    yield s.say('president', "Then this meeting is over.");
    yield 40;
    yield s.fadeOut(40);
    ['president', 'heidegger', 'scarlet', 'reeve'].forEach(id => s.remove(id));
    s.camFollow(1);
  };
})();
