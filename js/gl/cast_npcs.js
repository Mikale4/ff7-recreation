// Named NPC presets + FF7-style townsfolk outfit generator (numbered variants 'man3', 'woman7', 'kid2',
// 'oldman4', 'worker5', 'cosmo_elder2'...). Loaded after cast_rigs.js. Full id list: docs/MODELS_CAST.md.
(function () {
  const U = FF7.util;
  const C3 = FF7.chars3d;
  const sh = U.shade;
  const P = C3.PRESETS, EXTRA = C3.EXTRA, HAIR = C3.HAIR;
  const { cap, headPt, ringAt, fringe } = C3.hairKit;
  const deg = (d) => d * Math.PI / 180;
  const set = (id, o) => { P[id] = o; return o; };
  const suit = C3.suit;

  // ================================================================== townsfolk outfit generator
  const SKINS = ['#f0c49c', '#f4d0b0', '#e8b890', '#d8a078', '#c08060', '#8a5a38', '#f0c8a8', '#f2c8a0'];
  const HAIRS = ['#2a1a12', '#4a2a16', '#6a3a1a', '#8a5024', '#a8703a', '#d0b060', '#1a1a1e', '#7a2a14', '#5a4a3a'];
  const GREYS = ['#d8d8d8', '#e8e8e8', '#b8b8b8', '#a0a0a0', '#f0f0f0'];
  // strong, contrasting cloth colours like the PS1 field townsfolk (Model Reference: red jackets, green shirts,
  // purple trousers...), a few earthy ones for variety
  const CLOTH = ['#3a62b8', '#c0402e', '#3e9a4a', '#c89a2a', '#8a44a8', '#2a78a8', '#d0802a', '#5a8a3a', '#d0584a', '#d8c070', '#2a4a8a', '#a82a2a', '#7a7a2a', '#2a8a78', '#c0602a', '#6a8ad0', '#a8804a', '#6a3a8a'];
  const LIGHT = ['#f0ece0', '#f4f4f4', '#e8dca8', '#c8e0f0', '#f0d0b0', '#d0ecc0', '#f8e890', '#f0d0e0'];
  const PANTS = ['#4a4a6a', '#2e2e34', '#6a4a2a', '#2a3a7a', '#7a5a38', '#3a5a2a', '#5a3a6a', '#1e2a4a', '#6a6a78'];
  const SHOES = ['#302018', '#4a3020', '#202020', '#5a4a3a', '#6a3a1a'];

  const man = (r, pick, b) => {
    const top = pick(CLOTH), shirt = pick(LIGHT), pants = pick(PANTS);
    const o = { skin: pick(SKINS), hair: pick(HAIRS), eyes: pick(['#3a2a20', '#2a3a5a', '#3a4a2a', '#4a3020']), boots: pick(SHOES), shoes: true, face: { brow: 1 + r() * 2 } };
    const kind = Math.floor(r() * 9);
    if (kind === 0) Object.assign(o, { top: shirt, sleeve: shirt, shortSleeves: r() > 0.5, bottom: top, pants: 'baggy', straps: top, extras: ['belt'], belt: sh(top, -0.3) });                    // overalls
    else if (kind === 1) Object.assign(o, { top: shirt, sleeve: top, jacket: top, bottom: pants, extras: ['jacket'] });                                                                           // open jacket
    else if (kind === 2) Object.assign(o, { top: shirt, sleeve: shirt, bottom: pants, vestColor: top, extras: ['vest', 'belt'], belt: '#3a2818' });                                                 // vest
    else if (kind === 3) Object.assign(o, { top: top, sleeve: 'skin', bottom: pants, pants: 'baggy', boots: pick(SHOES), shoes: false, extras: ['belt'], belt: '#2a2018' });                          // tank top labourer
    else if (kind === 4) Object.assign(o, { top: top, sleeve: top, bottom: top, pants: 'tight', extras: ['suitShirt', 'tie'], tieColor: pick(['#8a1a1a', '#1a2a6a', '#2a2a2a', '#6a5a1a']), boots: '#141418' });   // suit
    else if (kind === 5) Object.assign(o, { top: top, sleeve: top, bottom: pants, extras: ['belt'], belt: '#4a3020', vneck: { c: shirt, w: 0.3, depth: 0.35 } });                                    // tunic
    else if (kind === 6) Object.assign(o, { top: shirt, sleeve: shirt, bottom: pants, apronColor: pick(['#f0ece0', '#e0d8c0', '#8a6a4a']), apronLen: 1.3, apronBib: true, extras: ['apron'] });         // shopkeeper apron
    else if (kind === 7) Object.assign(o, { top: top, sleeve: top, bottom: pants, collarColor: shirt, buttons: sh(top, -0.35), buttonN: 3 });                                                        // buttoned shirt
    else Object.assign(o, { top: top, sleeve: top, shortSleeves: true, bottom: pants, pants: r() > 0.5 ? 'baggy' : null });                                                                         // t-shirt
    // headwear / hair
    const h = r();
    if (h < 0.14) Object.assign(o, { hairStyle: 'cap', capColor: pick(CLOTH), hairUnder: true });
    else if (h < 0.22) Object.assign(o, { hairStyle: 'hat', hatColor: pick(['#8a6a3a', '#6a5a3a', '#c8b078', '#3a3a3a']), hatBand: r() > 0.5 ? '#3a2818' : null });
    else if (h < 0.28) Object.assign(o, { hairStyle: 'bandana', capColor: pick(['#c02020', '#2a4a8a', '#e8e8e8', '#3a6a3a']) });
    else o.hairStyle = pick(['short', 'short', 'messy', 'spiky', 'slick', 'parted', 'buzz', 'bald', 'spikyback']);
    if (o.hairStyle === 'bald') o.fringeTop = 0.6;
    if (r() > 0.72) o.extras = (o.extras || []).concat(pick([['beard'], ['mustache'], ['glasses'], ['stubble'], ['goatee'], ['mustache', 'goatee']]));
    const bl = r(); if (bl < 0.14) o.build = 'fat'; else if (bl < 0.26) o.build = 'stocky'; else if (bl < 0.34) o.build = 'slim'; else if (bl < 0.4) o.build = 'muscle';
    return o;
  };
  const woman = (r, pick) => {
    const c = pick(CLOTH), l = pick(LIGHT);
    const o = { female: true, skin: pick(SKINS), hair: pick(HAIRS), eyes: pick(['#3a2a20', '#2a4a8a', '#3a6a3a', '#6a3a2a']), boots: pick(SHOES), shoes: true, face: { mouth: r() > 0.6 ? 'smile' : 'line' } };
    const kind = Math.floor(r() * 7);
    if (kind === 0) Object.assign(o, { top: c, sleeve: c, bottom: c, skirt: 'long', skirtColor: c, apronColor: l, apronBib: true, apronLen: 1.5, extras: ['apron'] });                           // dress + apron
    else if (kind === 1) Object.assign(o, { top: l, sleeve: l, shortSleeves: r() > 0.5, bottom: c, skirt: 'long', skirtColor: c, extras: ['belt'], belt: sh(c, -0.3), beltH: 0.1 });            // blouse + long skirt
    else if (kind === 2) Object.assign(o, { top: c, sleeve: 'skin', bottom: c, skirt: 'short', skirtLen: 0.75, skirtColor: c, legs: 'skin', vneck: { w: 0.35, depth: 0.3 } });                  // short dress
    else if (kind === 3) Object.assign(o, { top: l, sleeve: l, bottom: c, pants: 'tight' });                                                                                                       // blouse + trousers
    else if (kind === 4) Object.assign(o, { top: c, sleeve: c, bottom: sh(c, -0.25), skirt: 'long', skirtColor: sh(c, -0.25), jacket: sh(c, 0.2), extras: ['jacket'], jacketSleeves: false }); // dress + bolero
    else if (kind === 5) Object.assign(o, { top: c, sleeve: c, bottom: c, skirt: 'long', skirtColor: c, collarColor: l, buttons: l });                                                            // buttoned dress
    else Object.assign(o, { top: l, sleeve: c, bottom: c, skirt: 'short', skirtLen: 0.9, skirtColor: c, legs: pick(['skin', '#3a3a48', '#e8e0d0']) });                                            // skirt + cardigan
    o.hairStyle = pick(['long', 'bob', 'ponytail', 'bun', 'long', 'twinbuns', 'bob', 'ponytail']);
    if (r() > 0.85) Object.assign(o, { hairStyle: 'bandana', capColor: pick(['#c02020', '#e8e8e8', '#6a4a8a']) });
    if (r() > 0.7) o.extras = (o.extras || []).concat(pick([['earrings'], ['necklace'], ['hairband'], ['flower']]));
    if (r() > 0.85) o.build = 'fat';
    return o;
  };
  const kid = (r, pick) => {
    const c = pick(CLOTH.concat(['#d06a3a', '#3a8ad0', '#e0c040', '#c03a3a'])), l = pick(LIGHT);
    const o = { height: 'kid', skin: pick(SKINS), hair: pick(HAIRS), boots: pick(SHOES), shoes: true, face: { eyeW: 7.6, eyeH: 6.2, mouth: pick(['smile', 'line', 'open']) } };
    const kind = Math.floor(r() * 4);
    if (kind === 0) Object.assign(o, { top: l, sleeve: l, shortSleeves: true, bottom: c, pants: 'shorts', legs: 'skin', collarColor: c });
    else if (kind === 1) Object.assign(o, { top: c, sleeve: c, shortSleeves: true, bottom: pick(PANTS), pants: 'shorts', legs: 'skin' });
    else if (kind === 2) Object.assign(o, { top: l, sleeve: l, bottom: c, pants: 'baggy', straps: c });
    else Object.assign(o, { top: c, sleeve: c, bottom: pick(PANTS), socks: '#f0f0f0' });
    o.hairStyle = pick(['spiky', 'short', 'messy', 'cap', 'spiky']);
    if (o.hairStyle === 'cap') o.capColor = pick(['#c03a3a', '#3a5aa0', '#e0a020', '#3a8a3a']);
    return o;
  };
  const girl = (r, pick) => {
    const c = pick(['#d82a2a', '#f070c8', '#3a8ad0', '#e0a040', '#8a5ac0', '#40a060', '#f0a0b0', '#a0c0e0']);
    const o = { female: true, height: 'kid', skin: pick(SKINS), hair: pick(HAIRS), boots: pick(SHOES), shoes: true, face: { eyeW: 7.6, eyeH: 6.4, mouth: pick(['smile', 'line']) } };
    const kind = Math.floor(r() * 3);
    if (kind === 0) Object.assign(o, { top: '#f0f0f0', sleeve: '#f0f0f0', shortSleeves: true, bottom: c, skirt: 'short', skirtLen: 0.8, skirtColor: c, legs: 'skin', socks: '#f0f0f0' });
    else if (kind === 1) Object.assign(o, { top: c, sleeve: c, bottom: c, skirt: 'short', skirtLen: 0.9, skirtColor: c, legs: 'skin', collarColor: '#f0f0f0' });
    else Object.assign(o, { top: c, sleeve: 'skin', bottom: pick(PANTS), pants: 'shorts', legs: 'skin' });
    o.hairStyle = pick(['pigtails', 'bob', 'ponytail', 'twinbuns', 'marlene']);
    if (r() > 0.6) o.extras = [pick(['bow', 'hairband'])], o.bowColor = pick(['#f04080', '#f0d020', '#40a0f0']), o.hairbandColor = o.bowColor;
    return o;
  };
  const oldman = (r, pick) => {
    const c = pick(['#7a6a5a', '#5a6a5a', '#6a5a4a', '#4a4a5a', '#8a7a5a', '#d8d4c0']), l = pick(LIGHT);
    const o = { skin: pick(['#e8c0a0', '#e0b890', '#d0a080', '#b08060', '#f0c8a8']), hair: pick(GREYS), eyes: '#3a2a20', boots: pick(SHOES), shoes: true, face: { brow: 0.5, eyes: pick(['open', 'narrow', 'narrow']) }, height: r() > 0.6 ? 'short' : null };
    const kind = Math.floor(r() * 4);
    if (kind === 0) Object.assign(o, { top: l, sleeve: l, bottom: c, pants: 'baggy', vestColor: c, extras: ['vest'] });
    else if (kind === 1) Object.assign(o, { top: l, sleeve: l, bottom: c, straps: c, extras: ['tie'], tieColor: pick(['#3a5a9a', '#8a1a1a', '#2a2a2a']) });
    else if (kind === 2) Object.assign(o, { top: c, sleeve: c, bottom: c, robeColor: c, extras: ['robe'] });
    else Object.assign(o, { top: c, sleeve: c, bottom: pick(PANTS), jacket: sh(c, -0.15), extras: ['jacket'], jacketHem: 0.4 });
    o.hairStyle = pick(['bald', 'bald', 'short', 'hat', 'cap']);
    if (o.hairStyle === 'bald') o.fringeTop = 0.62;
    if (o.hairStyle === 'hat') o.hatColor = pick(['#6a5a3a', '#3a3a3a', '#8a6a3a']);
    if (o.hairStyle === 'cap') o.capColor = pick(['#3a3a4a', '#6a5a3a']);
    o.extras = (o.extras || []).concat(pick([['mustache'], ['beard'], ['beard', 'mustache'], ['glasses'], ['mustache', 'glasses'], []]));
    o.beardColor = o.hair; o.mustacheColor = o.hair;
    return o;
  };
  const oldwoman = (r, pick) => {
    const c = pick(['#6a5a7a', '#5a6a7a', '#7a5a5a', '#5a5a4a', '#6a4a6a', '#4a5a6a', '#8a6a5a']);
    const o = { female: true, skin: pick(['#e8c0a0', '#e0b890', '#d0a080', '#b08060']), hair: pick(GREYS), eyes: '#3a2a20', boots: pick(SHOES), shoes: true, top: c, sleeve: c, bottom: c, skirt: 'long', skirtColor: c, face: { eyes: pick(['open', 'narrow']) }, height: r() > 0.5 ? 'short' : null };
    if (r() > 0.5) Object.assign(o, { apronColor: pick(['#e8e0d0', '#f0f0f0', '#d8c8a8']), apronBib: r() > 0.5, apronLen: 1.4, extras: ['apron'] });
    else Object.assign(o, { furColor: pick(['#a09080', '#8a6a8a', '#e8e0d0']), extras: ['furcollar'] });
    o.hairStyle = pick(['bun', 'bun', 'bob', 'hood']);
    if (o.hairStyle === 'hood') o.hoodColor = sh(c, -0.15);
    return o;
  };
  const worker = (r, pick) => {
    const c = pick(['#4a5a30', '#5a5a6a', '#6a5030', '#3a4a6a', '#7a6a4a']);
    const o = { skin: pick(SKINS), hair: pick(HAIRS), eyes: '#3a2a20', boots: '#3a2818', top: pick(['#e8e8e0', '#d8d0b0', '#8a7040', '#c8c0a0']), sleeve: 'skin', bottom: c, pants: 'baggy', straps: c, extras: ['belt'], belt: '#3a2818', face: { brow: 2 } };
    if (r() > 0.5) Object.assign(o, { top: c, sleeve: c, straps: null, zipper: sh(c, -0.3) });   // coveralls
    const h = r();
    if (h < 0.55) Object.assign(o, { hairStyle: 'helmet', helmetColor: pick(['#e0a020', '#e8e8e0', '#d04020', '#e0c040']) });
    else if (h < 0.8) Object.assign(o, { hairStyle: 'bandana', capColor: pick(['#c02020', '#e8e8e8', '#2a4a8a']) });
    else o.hairStyle = pick(['short', 'buzz', 'messy']);
    if (r() > 0.6) o.extras = o.extras.concat(pick([['stubble'], ['mustache'], ['beard']]));
    if (r() > 0.6) o.build = pick(['stocky', 'muscle', 'fat']);
    return o;
  };
  const GEN = { man, woman, kid, girl, oldman, oldwoman, worker };
  C3.townsfolk = GEN;
  C3.variantHook = function (base, b, r, pick) {
    if (GEN[base]) return Object.assign({}, GEN[base](r, pick));
    // costume presets (soldier3, sailor2, ninja4, cosmo_elder2...): same outfit, vary skin/hair a little
    const o = Object.assign({}, b);
    if (!/soldier|mp|young_cloud/.test(base)) o.skin = pick(SKINS.slice(0, 6));
    if (base === 'cosmo_elder' || base === 'cosmo_villager') { o.skin = pick(['#d8905a', '#c88050', '#e0a070']); o.top = pick(['#8a5a30', '#a06a3a', '#6a4a2a', '#9a7a4a']); o.sleeve = o.top; }
    if (/villager|citizen|digger|crew|sailor|ninja|diner/.test(base) && b.hairStyle && !/cap|hat|helmet|hood|bandana/.test(b.hairStyle)) o.hair = pick(HAIRS);
    return o;
  };

  // ================================================================== named NPCs
  // --- Midgar / Wall Market
  // Domino (r4c14): grey hair spiking up like a crown, grey moustache, magenta-red vest and red bow tie over a white
  // shirt with puffed short sleeves, black baggy trousers, dark red shoes
  set('domino', { skin: '#f0c8a0', hair: '#9a9aa0', hairStyle: 'spiky', eyes: '#3a2a20', height: 'short', build: 'stocky', face: { brow: 1.5, browW: 1.8 }, top: '#f0f0f0', sleeve: '#f0f0f0', shortSleeves: true, bottom: '#1a1a1a', pants: 'baggy', boots: '#5a1a14', shoes: true,
    extras: ['mustache', 'bowtie', 'vest'], vestColor: '#9a1a44', vestOpen: 14, bowColor: '#d02020', mustacheColor: '#8a8a90' });
  set('hart', suit({ hair: '#a02818', hairStyle: 'rufus', eyes: '#3a2a20', top: '#1a1a22', sleeve: '#1a1a22', bottom: '#1a1a22', tieColor: '#2a5ad0', face: { brow: 1.6 } }));
  set('mukki', { skin: '#e8b890', hair: '#c8a050', hairStyle: 'short', eyes: '#3a2a20', build: 'muscle', face: { brow: 2 }, top: '#c02828', midriff: 0.1, sleeve: 'skin', bottom: '#c02828', pants: 'knee', legs: 'skin', boots: '#e8b890', shoes: true, straps: '#c02828', strapW: 0.14, extras: ['beard'], beardColor: '#c8a050', torso: (Pt, a, S) => { Pt.poly([[-0.3, 1.01], [0.3, 1.01], [0.25, 0.3], [-0.25, 0.3]], S); } });
  set('kotch', { skin: '#7a4a2a', hair: '#1a1a1a', hairStyle: 'buzz', eyes: '#2a1a10', build: 'muscle', face: { brow: 2 }, top: '#f0f0f0', sleeve: 'skin', bottom: '#f0f0f0', pants: 'shorts', legs: 'skin', boots: '#7a4a2a', shoes: true, extras: ['mustache'], vneck: { c: '#7a4a2a', w: 0.3, depth: 0.2 } });
  // Big Bro (r4c7): dark red-brown hair, a big red-brown handlebar moustache, bare muscular chest, orange waistband
  // over purple shorts, barefoot
  set('big_bro', { skin: '#e0a878', hair: '#5a1e14', hairStyle: 'parted', eyes: '#2a1a10', build: 'muscle', top: '#e0a878', sleeve: 'skin', bottom: '#4a2a88', pants: 'shorts', legs: 'skin', boots: '#e0a878', bootTop: 0, face: { brow: 3, browW: 2.4 },
    extras: ['mustache', 'belt'], moustache: 'handlebar', moustacheScale: 1.3, mustacheColor: '#6a2016', belt: '#e07018', buckle: false, beltH: 0.1 });
  // Corneo's henchman (r5c4): dark brown skin, a thin gold mohawk, open red checked vest, gold chain, dark gloves,
  // blue trousers, dark boots with gold toes
  set('henchman', { skin: '#8a5634', hair: '#8a5634', hairStyle: 'tuft', tuftColor: '#e0c040', eyes: '#2a1a10', face: { brow: 2.5, slant: 1.5 }, top: '#b82020', sleeve: 'skin', bottom: '#2a3a8a', pants: 'baggy', boots: '#3a2018', toeColor: '#d8b030',
    gloves: '#3a2416', longGloves: true, vneck: { c: '#8a5634', w: 0.34, depth: 0.95 }, extras: ['necklace', 'belt'], pendant: '#e0c040', belt: '#2a2a2a',
    torso: (Pt) => { const d = '#6a1010'; [0.25, 0.5, 0.75].forEach(y => Pt.band(y - 0.03, y + 0.03, d)); [-0.7, -0.45, 0.45, 0.7].forEach(x => { Pt.rect(x - 0.04, 0, x + 0.04, 1, d); Pt.rect(x - 0.04, 0, x + 0.04, 1, d, true); }); } });
  set('honeybee', { skin: '#f4d0b0', hair: '#6a2a18', hairStyle: 'twinbuns', eyes: '#3a6ab0', female: true, face: { mouth: 'smile' }, top: '#f0d020', midriff: 0.5, sleeve: 'skin', bottom: '#1a1a1a', pants: 'shorts', legs: 'skin', boots: '#1a1a1a', shoes: true, extras: ['beeWings'] });
  EXTRA.beeWings = (m, H) => C3.att(m, 'torso', mb => [1, -1].forEach(s => mb.blade([s * 0.02, H.TT * 0.75, -H.pr.chestRZ * H.bd], [s, 0.3, -0.4], H.TT * 0.9, H.TT * 0.5, 0.005, '#a0d8f0', [0, 1, 0])), { cull: false });
  set('cloud_dress', { fieldChibi: false, skin: '#f6caa2', hair: '#f2c23a', hairStyle: 'cloud', eyes: '#3c88d8', face: { brow: 1.5, lips: '#c05060', mouth: 'line' }, female: true, top: '#7a64a8', sleeve: '#7a64a8', bottom: '#7a64a8', skirt: 'long', skirtColor: '#7a64a8', boots: '#4a3a2a', shoes: true, extras: ['sash'], sashColor: '#d02030' });
  set('aeris_dress', { fieldChibi: false, skin: '#f8d8c0', hair: '#8a5228', hairStyle: 'aeris', eyes: '#3c9a6a', female: true, face: { brow: -1.0, mouth: 'smile' }, top: '#b0182a', sleeve: 'skin', bottom: '#b0182a', skirt: 'long', skirtColor: '#b0182a', skirtFlare: 1.2, boots: '#b0182a', shoes: true, heels: true, vneck: { c: '#f8d8c0', w: 0.35, depth: 0.3 }, ribbon: '#b0182a' });
  set('tifa_dress', { fieldChibi: false, skin: '#f8d8c0', hair: '#2a1a14', hairStyle: 'tifa', eyes: '#943428', female: true, face: { brow: -0.8 }, top: '#40b0b8', sleeve: 'skin', bottom: '#40b0b8', skirt: 'short', skirtLen: 0.8, skirtColor: '#40b0b8', legs: 'skin', boots: '#40b0b8', shoes: true, heels: true, vneck: { c: '#f8d8c0', w: 0.3, depth: 0.2 } });
  set('secretary', { skin: '#f8d8c0', hair: '#4a2a18', hairStyle: 'bun', female: true, eyes: '#3a2a20', top: '#5a5a6a', sleeve: '#5a5a6a', bottom: '#5a5a6a', skirt: 'short', skirtLen: 0.75, skirtColor: '#5a5a6a', legs: '#e8c8b0', boots: '#1a1a1a', shoes: true, heels: true, extras: ['suitShirt', 'glasses'], shirtDepth: 0.35 });
  // Shinra station/company manager (r1c12): bald, dark moustache, stocky, a buttoned tan trench coat
  set('shinra_manager', { skin: '#f0c49c', hair: '#3a2a1a', hairStyle: 'bald', eyes: '#3a2a20', build: 'stocky', face: { brow: 2 }, top: '#c8a878', sleeve: '#c8a878', bottom: '#4a3020', pants: 'tight', boots: '#2a1a10', shoes: true,
    coatColor: '#c8a878', coatLen: 0.35, coatOpen: 4, extras: ['coat', 'belt', 'mustache', 'collarUp'], collarUp: '#b89868', belt: '#8a6a40', buckle: '#3a2a1a', mustacheColor: '#2a1a10',
    torso: (Pt) => { [-0.3, 0.3].forEach(x => [0.3, 0.55, 0.8].forEach(y => Pt.dot(x, y, 0.05, '#3a2a1a'))); } });
  set('guard', { skin: '#f0c49c', hair: '#1a1a1a', hairStyle: 'cap', capColor: '#2a3a6a', top: '#2a3a6a', sleeve: '#2a3a6a', bottom: '#2a3a6a', pants: 'baggy', boots: '#1a1a1a', bootsTall: true, gloves: '#1a1a1a', belt: '#1a1a1a', extras: ['belt'], face: { brow: 2.5 }, weapon: 'nightstick' });
  set('soldier_olive', Object.assign({}, P.soldier, { helmetColor: '#5a6a3a', top: '#5a6a3a', sleeve: '#5a6a3a', bottom: '#5a6a3a', pauldron: '#b8b8b0', mouthGuard: '#e8e8e0' }));   // white mouth guard (Nibelheim flashback)
  // SOLDIER in the field (flashback, scarf and bare head); in battle the Bestiary SOLDIER:3rd / 1st wear a visored helmet
  // and carry a sword
  const soldierHelm = (c, uni) => ({ hairStyle: 'mpHelmet', helmetColor: c, facePaint: C3.faces.mp, guardColor: sh(c, -0.05), headBackColor: sh(c, -0.05), noEars: true, face: { eyes: 'none', nose: false, mouth: 'none', brow: false }, top: uni, sleeve: uni, bottom: uni, weapon: 'sword' });
  set('soldier3rd', Object.assign({}, P.young_cloud, { hairStyle: 'short', hair: '#4a3020', facePaint: null, headBackColor: null, noEars: false, face: {}, extras: ['belt', 'pauldronL', 'pauldronR', 'scarf'], scarfColor: '#d8a020', scarfTails: false,
    styleOver: { battle: Object.assign(soldierHelm('#a0a0b0', '#2a38a0'), { extras: ['belt', 'pauldronL', 'pauldronR'], pauldron: '#a8a8b8' }) } }));
  P.soldier1st.styleOver = { battle: Object.assign(soldierHelm('#6a5a9a', '#4a3a7a'), { pauldron: '#8a8a98' }) };
  set('young_vincent', suit({ skin: '#f0dccc', hair: '#141418', hairStyle: 'tseng', eyes: '#6a3a20', top: '#1a1a22', sleeve: '#1a1a22', bottom: '#1a1a22', tieColor: '#141418', face: { brow: 1.4, slant: 1 } }));
  // --- Kalm / Nibelheim flashback
  set('young_tifa', { skin: '#f8d8c0', hair: '#2a1a14', hairStyle: 'hat', hatColor: '#8a5a2a', brim: 1.7, eyes: '#943428', female: true, face: { brow: -0.8 }, top: '#f0f0ee', sleeve: 'skin', bottom: '#6a4020', skirt: 'short', skirtLen: 0.55, skirtColor: '#6a4020', legs: 'skin', boots: '#4a2a18', bootTop: 0.7, vestColor: '#6a4020', extras: ['vest'], vestOpen: 30 });
  set('kid_cloud', { skin: '#f6caa2', hair: '#f2c23a', hairStyle: 'cloud', eyes: '#3c88d8', height: 'kid', face: { brow: 1.5, eyeW: 7.6, eyeH: 6 }, top: '#f0f0f0', sleeve: '#f0f0f0', shortSleeves: true, bottom: '#2a3a7a', pants: 'shorts', legs: 'skin', boots: '#6a4a24' });
  set('kid_tifa', { skin: '#f8d8c0', hair: '#2a1a14', hairStyle: 'long', hairLen: 0.8, eyes: '#943428', female: true, height: 'kid', face: { eyeW: 7.6, eyeH: 6.4 }, top: '#f0f0f0', sleeve: '#f0f0f0', shortSleeves: true, bottom: '#d02a2a', skirt: 'short', skirtLen: 0.8, skirtColor: '#d02a2a', legs: 'skin', socks: '#f0f0f0', boots: '#8a2a1a', shoes: true, vestColor: '#e08020', extras: ['vest'] });
  set('young_aeris', { skin: '#f8d8c0', hair: '#8a5228', hairStyle: 'ponytail', eyes: '#3c9a6a', female: true, height: 'kid', face: { eyeW: 7.6, eyeH: 6.4, mouth: 'smile' }, top: '#b0682a', sleeve: '#b0682a', bottom: '#b0682a', skirt: 'short', skirtLen: 0.9, skirtColor: '#b0682a', legs: 'skin', boots: '#4a2a18', shoes: true, extras: ['bow'], bowColor: '#f07aa8' });
  // --- Chocobo Farm
  // Choco Bill (r6c14): grey tufts sticking out at the sides of a bald head, glasses, grey beard, brown vest over a
  // pale shirt, dark gloves, brown trousers
  set('choco_bill', { skin: '#e8b890', hair: '#a8a8a8', hairStyle: 'palmer', eyes: '#3a2a20', height: 'short', face: { eyes: 'narrow', brow: 0.5 }, top: '#ecdcd8', sleeve: '#ecdcd8', bottom: '#5a4430', pants: 'baggy', boots: '#3a2416', gloves: '#3a2a20',
    extras: ['mustache', 'beard', 'glasses', 'vest'], vestColor: '#8a6a3a', vestOpen: 18, mustacheColor: '#a8a8a8', beardColor: '#a8a8a8', beardLen: 0.22, lensTint: [230, 220, 120, 170] });
  set('chocobo_billy', { skin: '#f0c49c', hair: '#6a3a18', hairStyle: 'hat', hatColor: '#a0602a', hatBand: '#e0c040', eyes: '#3a2a20', face: { mouth: 'smile' }, top: '#c0e8c8', sleeve: '#c0e8c8', shortSleeves: true, bottom: '#2a6a3a', pants: 'shorts', legs: 'skin', boots: '#5a3a1a', gloves: '#3a2a1a', extras: ['hatFeather'] });
  EXTRA.hatFeather = (m, H) => C3.att(m, 'head', mb => mb.blade(headPt(H, deg(20), 0.95, 1.2), [0.4, 1, -0.4], H.hh * 0.6, H.hw * 0.12, H.hd * 0.03, '#f0e040'));
  // Chloe (r6c16): long dark red hair, a red dress with a white collar and cuffs, white socks
  set('chloe', { skin: '#f4d0b0', hair: '#7a2418', hairStyle: 'long', hairLen: 0.8, eyes: '#3a2a20', female: true, height: 'kid', face: { eyeW: 7.6, eyeH: 6.4, mouth: 'smile' }, top: '#a81e28', sleeve: '#a81e28', sleeveCuff: '#f0f0f0', bottom: '#a81e28', skirt: 'short', skirtLen: 0.9, skirtColor: '#a81e28', legs: 'skin', socks: '#f0f0f0', boots: '#3a1a14', shoes: true, collarColor: '#f0f0f0' });
  // Chocobo Sage (r8c12): bald with white side hair, round glasses, a long white beard, green jacket, blue tie, khaki trousers
  set('chocobo_sage', { skin: '#e8b890', hair: '#e8e8e8', hairStyle: 'bald', eyes: '#3a2a20', height: 'short', face: { eyes: 'narrow' }, top: '#e8e8e0', sleeve: '#2a7a3a', bottom: '#c8c08a', pants: 'baggy', boots: '#4a3020', shoes: true,
    jacket: '#2a7a3a', jacketOpen: 24, extras: ['jacket', 'suitShirt', 'tie', 'beard', 'mustache', 'glasses'], tieColor: '#2a4a9a', beardColor: '#f0f0f0', beardLen: 0.55, mustacheColor: '#f0f0f0', lensTint: [200, 240, 240, 180], glassColor: '#5a5a64' });
  // --- Gold Saucer / Battle Square / Chocobo Square
  set('ester', { skin: '#f4d0b0', hair: '#e08030', hairStyle: 'bob', eyes: '#3a6ab0', female: true, face: { mouth: 'smile' }, top: '#8a3aa8', sleeve: '#8a3aa8', shortSleeves: true, bottom: '#8a3aa8', skirt: 'short', skirtLen: 0.8, skirtColor: '#8a3aa8', legs: 'skin', boots: '#3aa03a', shoes: true, bandColor: '#e0a020', extras: ['headband', 'belt'], belt: '#6a3a1a', beltH: 0.1 });
  set('mr_coates', suit({ skin: '#f0c8a0', hair: '#4a3a2a', hairStyle: 'tophat', hatColor: '#1a1a1a', hatBand: '#e8e8e8', eyes: '#3a2a20', top: '#2a2a2e', sleeve: '#2a2a2e', bottom: '#2a2a2e', face: { brow: 1.5 }, extras: ['suitShirt', 'tie', 'mustache', 'goatee', 'scarf'], tieColor: '#a01818', scarfColor: '#f0f0f0', scarfTailLen: 0.95 }));
  set('joe', { skin: '#8a5434', hair: '#1a1a1a', hairStyle: 'hat', hatColor: '#1a1a1a', brim: 1.5, eyes: '#2a1a10', face: { brow: 1.5 }, top: '#d02a2a', sleeve: '#d02a2a', bottom: '#f0f0f0', pants: 'baggy', boots: '#1a1a1a', bootTop: 0.6, vneck: { c: '#f0f0f0', w: 0.3, depth: 0.3 } });
  set('jockey', { skin: '#f0c49c', hair: '#4a3020', hairStyle: 'cap', capColor: '#2a4ad0', eyes: '#3a2a20', top: '#a0d0f0', sleeve: '#a0d0f0', bottom: '#f0f0f0', pants: 'baggy', boots: '#1a1a1a', bootTop: 0.6, torso: (Pt) => { for (let i = -2; i <= 2; i++) Pt.poly([[i * 0.2, 0.8], [i * 0.2 + 0.1, 0.65], [i * 0.2, 0.5], [i * 0.2 - 0.1, 0.65]], '#2a4ad0'); } });
  set('gold_saucer_staff', { skin: '#f0c49c', hair: '#3a2a1a', hairStyle: 'cap', capColor: '#d02020', capBand: '#f0d020', top: '#d02020', sleeve: '#d02020', bottom: '#1a1a3a', pants: 'tight', boots: '#1a1a1a', shoes: true, extras: ['bowtie'], bowColor: '#f0d020', buttons: '#f0d020' });
  // --- Junon / Shinra ships
  set('sailor_chief', Object.assign({}, P.sailor, { build: 'fat', skin: '#6a3e26', hair: '#1a1a1a', extras: ['sailorCollar', 'beard'], beardColor: '#1a1a1a' }));
  set('junon_officer', { skin: '#f0c49c', hair: '#3a2a1a', hairStyle: 'cap', capColor: '#2a3a6a', capBand: '#e0c040', top: '#2a3a6a', sleeve: '#2a3a6a', bottom: '#2a3a6a', pants: 'baggy', boots: '#141418', bootsTall: true, gloves: '#f0f0f0', belt: '#141418', buckle: '#e0c040', extras: ['belt'], face: { brow: 2.2 } });
  // --- Costa del Sol
  set('beach_man', { skin: '#c88a5a', hair: '#1a1a1a', hairStyle: 'short', eyes: '#2a1a10', top: '#c88a5a', sleeve: 'skin', bottom: '#d02020', pants: 'shorts', legs: 'skin', boots: '#c88a5a', shoes: true, extras: ['shades'] });
  set('beach_woman', { skin: '#c88a5a', hair: '#1a1a1a', hairStyle: 'long', eyes: '#2a1a10', female: true, top: '#f0f0f0', midriff: 0.55, sleeve: 'skin', bottom: '#d02020', pants: 'shorts', legs: 'skin', boots: '#c88a5a', shoes: true, extras: ['bangles'] });
  // --- Corel / Gongaga / Cosmo Canyon / Nibelheim / Rocket Town
  set('corel_miner', { skin: '#a06a40', hair: '#2a1a12', hairStyle: 'helmet', helmetColor: '#8a7a5a', top: '#8a7a5a', sleeve: 'skin', bottom: '#4a4038', pants: 'baggy', boots: '#3a2818', straps: '#4a4038', extras: ['belt', 'stubble'] });
  set('gongaga_villager', { skin: '#c08050', hair: '#3a2012', hairStyle: 'bandana', capColor: '#e8e8e0', eyes: '#3a2a20', top: '#8a8a7a', sleeve: '#8a8a7a', bottom: '#5a5a50', pants: 'baggy', boots: '#3a2818', extras: ['belt'], belt: '#3a2818' });
  set('gongaga_woman', { skin: '#c08050', hair: '#5a2a12', hairStyle: 'ponytail', eyes: '#3a2a20', female: true, top: '#d8c0a0', sleeve: '#d8c0a0', bottom: '#8a5a3a', skirt: 'long', skirtColor: '#8a5a3a', boots: '#3a2818', shoes: true, vestColor: '#6a4a2a', extras: ['vest'] });
  set('cosmo_villager', { skin: '#d8905a', hair: '#3a2012', hairStyle: 'bandana', capColor: '#e8e0d0', eyes: '#3a2a20', top: '#e8e0d0', sleeve: '#e8e0d0', bottom: '#6a3a1a', pants: 'baggy', boots: '#4a2a18', vestColor: '#6a3a1a', extras: ['vest', 'belt'], belt: '#8a2020' });
  // Cosmo Canyon woman (r10c3): pale head scarf, brown tunic with light tan sleeves, khaki knee trousers
  set('cosmo_woman', { skin: '#d8905a', hair: '#4a2a14', hairStyle: 'bandana', capColor: '#ece4d4', eyes: '#3a2a20', female: true, top: '#7a4422', sleeve: '#d8c08a', bottom: '#b8a070', pants: 'knee', legs: 'skin', boots: '#4a2a18', shoes: true, extras: ['belt', 'earrings'], belt: '#5a3018', earringColor: '#d04020' });
  // Nibelheim villager (r6c10): black flat cap, moustache, white shirt with a big puffed silver-white collar, black
  // braces and baggy trousers, black wrist bands
  set('nibelheim_villager', { skin: '#f0c49c', hair: '#2a1a10', hairStyle: 'cap', capColor: '#1e1e22', visorColor: '#141416', eyes: '#3a2a20', top: '#f0f0f4', sleeve: '#f0f0f4', shortSleeves: true, wristband: '#1a1a1a', bottom: '#1e1e22', pants: 'baggy', boots: '#6a3a1a', shoes: true, socks: '#4a8a3a',
    straps: '#1e1e22', capeColor: '#d8dce8', extras: ['mustache', 'shoulderCape'], mustacheColor: '#2a1a10' });
  set('rocket_town_mechanic', { skin: '#f0c49c', hair: '#4a3a2a', hairStyle: 'cap', capColor: '#2a4a8a', eyes: '#3a2a20', top: '#2a4a8a', sleeve: '#2a4a8a', bottom: '#2a4a8a', pants: 'baggy', boots: '#1a1a1a', zipper: '#1a2a4a', gloves: '#e07030', extras: ['belt', 'goggles'], belt: '#1a1a1a' });
  set('highwind_crew', { skin: '#f0c49c', hair: '#3a2a1a', hairStyle: 'cap', capColor: '#f0f0f0', visorColor: '#2a3a6a', eyes: '#3a2a20', top: '#2a5a7a', sleeve: '#2a5a7a', bottom: '#1a2a3a', pants: 'baggy', boots: '#3a2818', vestColor: '#d87a20', extras: ['vest'] });
  // --- Wutai
  // Wutai villager (r11c3): white head wrap, a blue robe open over a light one with a crossed collar
  set('wutai_villager', { skin: '#f0c8a0', hair: '#1a1a1a', hairStyle: 'turban', capColor: '#e0e0d8', eyes: '#2a1a10', top: '#e4e4dc', sleeve: '#c8c8c0', bottom: '#d8d8d0', pants: 'baggy', boots: '#3a2018', shoes: true,
    jacket: '#2a5a82', jacketOpen: 20, jacketHem: 1.2, jacketSleeves: false, vneck: { c: '#3a8a5a', w: 0.22, depth: 0.32 }, extras: ['jacket', 'sash'], sashColor: '#2a5a82' });
  set('wutai_woman', { skin: '#f4d0b0', hair: '#1a1a1a', hairStyle: 'twinbuns', eyes: '#2a1a10', female: true, top: '#8a9a3a', sleeve: '#8a9a3a', bottom: '#8a2a2a', pants: 'baggy', boots: '#3a2018', shoes: true, vneck: { c: '#e8d8a0', w: 0.4, depth: 0.5 }, extras: ['sash'], sashColor: '#6a2a1a' });
  set('wutai_kid', { skin: '#f4d0b0', hair: '#2a1a12', hairStyle: 'twinbuns', eyes: '#2a1a10', female: true, height: 'kid', face: { eyeW: 7.6, eyeH: 6.4 }, top: '#e8a020', sleeve: '#e8a020', bottom: '#e8a020', skirt: 'short', skirtLen: 0.9, skirtColor: '#e8a020', legs: 'skin', boots: '#8a2a1a', shoes: true, extras: ['sash'], sashColor: '#c02020' });
  // Wutai elder (r11c5): grey hair swept back, drooping grey moustache and beard, a long dark green robe over a light green one
  set('wutai_elder', { skin: '#e8c0a0', hair: '#9a9a9a', hairStyle: 'slick', eyes: '#2a1a10', top: '#a8c0a0', sleeve: '#a8c0a0', bottom: '#a8c0a0', robeColor: '#a8c0a0', boots: '#3a2018', shoes: true,
    jacket: '#2a5a3a', jacketOpen: 22, jacketHem: 1.6, vneck: { c: '#6a3a8a', w: 0.22, depth: 0.36 }, extras: ['robe', 'jacket', 'mustache', 'beard'], moustache: 'droop', mustacheColor: '#b0b0b0', beardColor: '#b0b0b0', beardLen: 0.3, face: { eyes: 'narrow' } });
  EXTRA.haori = EXTRA.haori || (() => {});
  // --- Icicle Inn / Bone Village / Mideel
  set('icicle_villager', { skin: '#f0c49c', hair: '#3a2a1a', hairStyle: 'hood', hoodColor: '#2a3a8a', eyes: '#3a2a20', top: '#1a1a3a', sleeve: '#1a1a3a', bottom: '#1a1a3a', pants: 'baggy', boots: '#1a1a1a', gloves: '#3a4aa0', build: 'stocky', extras: ['belt'], belt: '#a08a4a', beltH: 0.1 });
  set('icicle_kid', { skin: '#f4d0b0', hair: '#3a2a1a', hairStyle: 'hood', hoodColor: '#f0f0f0', eyes: '#3a2a20', female: true, height: 'kid', top: '#c83a6a', sleeve: '#c83a6a', bottom: '#8a1a2a', pants: 'baggy', boots: '#8a1a2a', gloves: '#c0c060', extras: ['scarf'], scarfColor: '#d02020' });
  set('bone_digger', { skin: '#e8b890', hair: '#4a3020', hairStyle: 'hat', hatColor: '#c8b890', brim: 1.35, hatCrown: true, eyes: '#3a2a20', top: '#3a7a3a', sleeve: '#3a7a3a', bottom: '#3a7a3a', pants: 'baggy', boots: '#4a2a18', bootTop: 0.6, extras: ['belt', 'backpack'], belt: '#4a3a1a', packColor: '#6a5a3a' });
  set('bone_digger_woman', { skin: '#f0c49c', hair: '#8a3a18', hairStyle: 'hat', hatColor: '#c8b890', brim: 1.35, hatCrown: true, eyes: '#3a2a20', female: true, top: '#7a5aa8', sleeve: '#7a5aa8', bottom: '#7a5aa8', pants: 'shorts', legs: 'skin', boots: '#3a2018', bootTop: 0.7, extras: ['belt'], belt: '#4a2a18' });
  set('mideel_villager', { skin: '#e8b890', hair: '#2a1a12', hairStyle: 'short', eyes: '#3a2a20', top: '#e8e8d0', sleeve: '#e8e8d0', shortSleeves: true, bottom: '#6a8a5a', pants: 'baggy', boots: '#5a3a1a', shoes: true, extras: ['sash'], sashColor: '#3a6a8a' });
  set('mideel_woman', { skin: '#e8b890', hair: '#3a1a10', hairStyle: 'bun', eyes: '#3a2a20', female: true, top: '#e0f0e0', sleeve: '#e0f0e0', shortSleeves: true, bottom: '#4a8aa0', skirt: 'long', skirtColor: '#4a8aa0', boots: '#5a3a1a', shoes: true, extras: ['flower'], flowerColor: '#f070a0' });
  set('mideel_doctor', { skin: '#f0c49c', hair: '#6a4a2a', hairStyle: 'parted', eyes: '#3a2a20', top: '#f0f0f0', sleeve: '#f0f0f0', bottom: '#8a6a4a', pants: 'tight', boots: '#4a2a18', shoes: true, coatColor: '#f0f0f0', coatLen: 0.5, extras: ['labcoat', 'suitShirt', 'tie', 'glasses', 'mustache'], shirt: '#e0e0f0', tieColor: '#2a3a6a', lensTint: [40, 46, 60, 230], glassColor: '#1e1e24', mustacheColor: '#4a3020' });
  set('nurse', { skin: '#f8d8c0', hair: '#1a1a1a', hairStyle: 'bob', eyes: '#3a2a20', female: true, face: { mouth: 'smile' }, top: '#f4f4f4', sleeve: '#f4f4f4', shortSleeves: true, bottom: '#f4f4f4', skirt: 'short', skirtLen: 0.9, skirtColor: '#f4f4f4', legs: '#f0e0d0', boots: '#f0f0f0', shoes: true });
  // --- generic jobs
  set('shopkeeper', { skin: '#f0c49c', hair: '#4a3020', hairStyle: 'parted', eyes: '#3a2a20', top: '#d8d0b0', sleeve: '#d8d0b0', bottom: '#4a4a5a', boots: '#302018', shoes: true, apronColor: '#3a6a3a', apronBib: true, apronLen: 1.3, extras: ['apron', 'mustache'], build: 'stocky' });
  set('innkeeper', { skin: '#f4d0b0', hair: '#6a3a1a', hairStyle: 'bun', eyes: '#3a2a20', female: true, face: { mouth: 'smile' }, top: '#8a4a6a', sleeve: '#8a4a6a', bottom: '#8a4a6a', skirt: 'long', skirtColor: '#8a4a6a', boots: '#302018', shoes: true, apronColor: '#f0f0f0', apronBib: true, apronLen: 1.5, extras: ['apron'] });
  set('chef', { skin: '#f0c49c', hair: '#f0f0f0', hairStyle: 'chefhat', eyes: '#3a2a20', top: '#f0f0f0', sleeve: '#f0f0f0', bottom: '#3a3a3a', pants: 'baggy', boots: '#1a1a1a', shoes: true, build: 'fat', extras: ['scarf', 'mustache'], scarfColor: '#d02020', mustacheColor: '#3a2a1a' });
  HAIR.chefhat = (mb, H, a) => { cap(mb, H, '#3a2a1a', { front: 0.74, sides: 0.4, back: 0.18 }); const r = ringAt(H, H.hh * 0.8); mb.loft([{ y: H.hh * 0.7, rx: r.rx * 1.16, rz: r.rz * 1.16, z: r.z }, { y: H.hh * 1.2, rx: r.rx * 1.1, rz: r.rz * 1.1, z: r.z }, { y: H.hh * 1.45, rx: r.rx * 1.35, rz: r.rz * 1.35, z: r.z }, { y: H.hh * 1.55, rx: r.rx * 0.9, rz: r.rz * 0.9, z: r.z }], { sides: 12, color: '#f4f4f4' }); };
  set('farmer', { skin: '#e0a878', hair: '#5a3a1a', hairStyle: 'hat', hatColor: '#d0b878', eyes: '#3a2a20', top: '#c83a2a', sleeve: '#c83a2a', bottom: '#3a4a7a', pants: 'baggy', straps: '#3a4a7a', boots: '#4a2a18', extras: ['stubble'] });
  set('fisherman', { skin: '#c88a5a', hair: '#3a2a1a', hairStyle: 'beanie', capColor: '#3a4a6a', eyes: '#3a2a20', top: '#e8e0c8', sleeve: '#e8e0c8', bottom: '#3a4a6a', pants: 'baggy', boots: '#e0c040', bootsTall: true, extras: ['beard'], build: 'stocky' });
  // priest / old sage (r6c1): bald old man with a pointed white beard, brown tunic with a red sash, grey-green trousers
  set('priest', { skin: '#e8c0a0', hair: '#c8c8c8', hairStyle: 'bald', eyes: '#3a2a20', top: '#7a5030', sleeve: '#6a5a40', bottom: '#8a8a6a', pants: 'baggy', boots: '#4a2a18', shoes: true, gloves: '#6a4a2a',
    extras: ['beard', 'mustache', 'belt'], beardColor: '#f0f0f0', beardLen: 0.4, beardW: 0.42, mustacheColor: '#f0f0f0', belt: '#8a1a1a', buckle: false, face: { eyes: 'narrow' } });
  set('drunk', { skin: '#f0b890', hair: '#4a3a2a', hairStyle: 'messy', eyes: '#3a2a20', face: { eyes: 'narrow', mouth: 'open', blush: '#e06060' }, top: '#8a7a5a', sleeve: '#8a7a5a', bottom: '#4a4a3a', pants: 'baggy', boots: '#3a2818', extras: ['stubble'], build: 'fat' });

  // ================================================================== Rufus' dog Dark Nation (a 'dog' variant)
  // Dark Nation (Bestiary, 01-midgar_175): a low black-teal panther with two tentacle whips and glowing red eyes
  set('dark_nation', { rig: 'cat', c1: '#1c2a34', c2: '#26363e', c3: '#2c4450', eyes: '#ff3020', tentacles: true, stripes: false, scale: 1.7 });
  set('dog_brown', { rig: 'dog', c1: '#5e3a1c', c2: '#c8a878' });
  set('dog_white', { rig: 'dog', c1: '#e8e8e0', c2: '#f8f8f0' });

  // ================================================================== refinements of existing cast presets
  Object.assign(P.lucrecia, { top: '#f0f0f4', sleeve: '#f0f0f4', bottom: '#3a3a48', skirt: 'short', skirtLen: 0.6, skirtColor: '#3a3a48', legs: '#3a3a48', coatColor: '#f0f0f4', coatLen: 0.5, extras: ['earrings', 'suitShirt', 'tie', 'labcoat'] });
  // Ifalna in the Gast video (11-gaeacliff14): long dark red dress, a big purple sash round the hips, gold cuffs
  Object.assign(P.ifalna, { top: '#8a1c26', sleeve: '#8a1c26', bottom: '#8a1c26', skirtColor: '#8a1c26', sashColor: '#6a3a9a', bangleColor: '#d8b030', extras: ['sash', 'bangles'] });
})();
