// 3D battle arenas (FF7's battle backgrounds), generated per `bg` id and cached.
//   FF7.arena.get(bgId) -> { mesh, backdrop, glow, pieces, layers, sky:[top,bottom], fog, fogNear, fogFar, light, indoor }
//   FF7.arena.draw(ar, { cam, subjects, t }) in the 3D pass after GL.camera(); FF7.arena.drawLate(ar) after
//   the combatants (pieces that are fading in or out, blended over them, then the additive glows: halos,
//   light pools and shafts, caustics, motes).
// Every arena has a tiled procedural floor (one 256x256 atlas per arena: floor tile, wall tile, a decal
// tile and small prop materials), a sky/horizon backdrop, and open ground or room / cave walls.
// Walls and props are "pieces". A wall is drawn only while the camera is on its inner side, so rooms are
// cut away toward the camera like FF7's battle rooms. Props are placed outside the battle cameras' views
// (FF7.arena.views, supplied by battle.js), and any piece that still ends up in front of the fighters
// (attack, limit and summon cameras; a wall seen edge-on beside the camera) fades out.
(function () {
  const U = FF7.util, MB = FF7.MeshBuilder;
  const A = FF7.arena = {};
  const sh = U.shade, TAU = Math.PI * 2;

  // ground: two average floor colours (summons build matching ground chunks from them)
  // floor / wall / deco: [texture kind, palette...]; fs: floor tile size (world units)
  // room {h, tw, th, deco} | cave {r, n, h, deco} | fence {kind, h, col}: walls around the fight
  // dec: floor decals; back: backdrop silhouettes; set: props; cast / lum: light colour and strength
  // tunnel {hw, h, len} | cut {hw, h, speed} | road {cz, r0, r1, a}: tunnel walls, a scrolling rock cutting,
  // a curved expressway deck; fx: animated layers (caustics, light shafts, motes...); br: backdrop radius;
  // deck / deckZ: the floor only spans |x| < deck, deckZ[0] < z < deckZ[1]; ext: floor radius
  const BG = {
    reactor: { ground: ['#6e6a50', '#5e5a44'], sky: ['#0a0a06', '#201e12'], floor: ['plates', '#6e6a50', '#2e2c1e', '#7a5a38'], fs: 3.2, wall: ['machine', '#5e5c40', '#222014', '#f0e0a0'], room: { h: 9, tw: 5, th: 9, deco: ['pipes', 'pilasters'], pc: '#5a5638' }, dec: ['rails'], set: ['pipes'], fog: [0.1, 0.095, 0.05], cast: '#f8e8b0' },
    train: { ground: ['#8c9c8e', '#7a887c'], sky: ['#060806', '#161c18'], floor: ['tiles', '#8c9c8e', '#4c5a50'], fs: 2.6, wall: ['girders', '#5e6c60', '#101410', '#1e2620'], room: { h: 9, tw: 4.5, th: 4.5, deco: ['pilasters', 'lamps'], pc: '#7a827a', every: 9 }, deco: ['hazard', '#d8b020', '#202020'], dec: ['platform'], fog: [0.08, 0.1, 0.09], cast: '#e4f4e8' },
    // Sector 4 train tunnel: steel track bed with two tracks running along the fight, tunnel walls (service
    // ledge with a hazard edge, girder frames, pipe runs, red signal lamps, a lit doorway); the ends fade out
    tunnel: { ground: ['#56585a', '#4a4c4e'], sky: ['#000000', '#030405'], floor: ['plates', '#5a5c5a', '#222422', '#5e4c36'], fs: 3, wall: ['lining', '#5c6062', '#1c1e1e', '#8a2a20'], tunnel: { hw: 9.5, h: 7.5, len: 24 }, deco: ['hazard', '#d8b020', '#1a1a18'], dec: ['railsz'], railsAt: [-3.3, 2.1], railLen: 24, deck: 10, ext: 26, br: 28, fog: [0.015, 0.016, 0.02], fogN: 10, fogF: 34, cast: '#e4e8f4' },
    // Corel's runaway train: the roof of a freight car between the next cars, with the track bed and a rock
    // cutting rushing past below and beside it under the night sky
    train_roof: { ground: ['#8e8676', '#7c7466'], sky: ['#03050c', '#101828'], floor: ['planks', '#948a78', '#3e382e'], fs: 2.5, deck: 5, deckZ: [-10, 7.5], wall: ['rock', '#b8b8a6', '#5a5c50', '#848e74'], cut: { hw: 11.5, h: 12, speed: 0.28 }, dec: ['cars'], back: ['stars', 'moon'], ldir: [0.45, -0.8, -0.3], fog: [0.04, 0.05, 0.08], fogN: 13, fogF: 40, cast: '#dce4f4', lum: 0.95 },
    midgar: { ground: ['#a2a4a6', '#8e9094'], sky: ['#05070c', '#262c3a'], floor: ['concrete', '#a2a4a6', '#6c6e72'], fs: 4.5, fence: { kind: 'railing', h: 1.4, col: '#8a8e94' }, back: ['plate', 'skyline'], fog: [0.13, 0.15, 0.2], cast: '#e8eef8', lum: 1.1 },
    slums: { ground: ['#6e5c46', '#5e4e3c'], sky: ['#0c0a08', '#2e281e'], floor: ['dirt', '#6e5c46', '#3a2e22', '#8a7658'], fs: 3.5, back: ['junk'], set: ['shacks', 'junk'], fog: [0.14, 0.12, 0.09], cast: '#f4e4cc' },
    church: { ground: ['#4c3c2c', '#3e3024'], sky: ['#080604', '#1a140e'], floor: ['planks', '#4c3c2c', '#1c140e'], fs: 3, wall: ['stonewall', '#6a6056', '#2a241e', '#5a4a38'], room: { h: 11, tw: 4, th: 5.5, deco: ['pilasters', 'window', 'tapestry'], pc: '#5a5048', pr: 'rock', every: 5 }, dec: ['flowers'], set: ['pews', 'beam'], fog: [0.07, 0.055, 0.04], cast: '#ffe8c8', lum: 0.95 },
    wallmarket: { ground: ['#6e4a32', '#5e3e2a'], sky: ['#0e0404', '#260a08'], floor: ['planks', '#6e4a32', '#2e1c12'], fs: 3, wall: ['lacquer', '#a82418', '#3a0c08', '#141010'], room: { h: 7.5, tw: 3.6, th: 7.5, deco: ['posts'] }, fog: [0.08, 0.03, 0.025], cast: '#ffe4d4' },
    sewer: { ground: ['#4e5846', '#424a3a'], sky: ['#020402', '#0c140c'], floor: ['stone', '#4e5846', '#1e2418'], fs: 2.8, wall: ['brick', '#4c5a46', '#1c241a'], room: { h: 8, tw: 3, th: 3, deco: ['arches', 'pipes', 'grates'] }, dec: ['channel'], set: ['barrels'], fog: [0.04, 0.06, 0.035], fogN: 11, fogF: 32, cast: '#d4ecc8', lum: 0.9 },
    graveyard: { ground: ['#4e4844', '#423c38'], sky: ['#0a0a10', '#2a2c36'], floor: ['dirt', '#4e4844', '#26221e', '#6a625a'], fs: 3, back: ['wrecks'], set: ['trains', 'junk'], fog: [0.15, 0.16, 0.19], fogN: 14, fogF: 40, cast: '#d4dcec', lum: 0.9 },
    shinra: { ground: ['#bcbcb8', '#a8a8a6'], sky: ['#101218', '#262a32'], floor: ['tiles', '#bcbcb8', '#76767a'], fs: 4, wall: ['office', '#dcd4bc', '#6a6660', '#4a4a50'], room: { h: 8, tw: 4, th: 8, deco: ['pilasters', 'doors'], pc: '#d0c8b0', every: 7 }, dec: ['stripes'], fog: [0.14, 0.15, 0.17], fogN: 13, fogF: 36, cast: '#fff8f0', lum: 1.1 },
    // Rufus on the Shinra HQ roof at night: a concrete helipad with its markings, railings, the lift housing
    // and its beacon, the dark teal sky over the city far below
    shinra_roof: { ground: ['#8e9294', '#7c8082'], sky: ['#051218', '#163440'], floor: ['concrete', '#8e9294', '#50565a'], fs: 4, wall: ['steel', '#a0a6a8', '#4a5054', '#6a6660'], deck: 10.5, deckZ: [-9.5, 10.5], ledge: 2.5, fence: { kind: 'railing', h: 1.2, col: '#7a8084' }, dec: ['helipad', 'ledge'], back: ['city'], cityTop: -3, br: 40, void: '#04080c', voidY: -30, set: ['housing'], fog: [0.05, 0.12, 0.15], fogN: 24, fogF: 90, cast: '#cce4ec', lum: 0.95 },
    // Hundred Gunner and Heli Gunner: the glass elevator climbing the outside of the Shinra building - two
    // octagonal platforms over the drop, the building's facade sliding down past them, the city far below
    shinra_elevator: { ground: ['#6a6a66', '#5c5c58'], sky: ['#060a10', '#1a2430'], floor: ['plates', '#76766e', '#2e2e2c', '#6a5a4a'], fs: 3, noFloor: true, dec: ['octagons'], wall: ['facade', '#cec6ae', '#6a6a66', '#dce8ff'], facade: { x: 10.5, speed: -0.05, span: 8 }, back: ['city'], cityTop: 4, br: 40, void: '#04060a', voidY: -30, fog: [0.05, 0.06, 0.08], fogN: 22, fogF: 80, cast: '#f0f0f4' },
    lab: { ground: ['#5c626a', '#50565e'], sky: ['#04080a', '#0c1c20'], floor: ['plates', '#5c626a', '#262a30'], fs: 3, wall: ['steel', '#80868e', '#30343a'], room: { h: 9, tw: 4, th: 4.5, deco: ['tank', 'pipes'] }, deco: ['grating', '#c8a830', '#2a2410'], dec: ['walkway'], set: ['pods'], fog: [0.05, 0.1, 0.11], cast: '#e4f4f4' },
    // Motor Ball: the elevated expressway at night - a curved deck with lanes, crash barriers and lamp posts,
    // towers inside the curve, the city far below, Midgar's plate and reactors on the horizon, searchlights
    highway: { ground: ['#3e3e42', '#343438'], sky: ['#03040c', '#141c34'], floor: ['asphalt', '#46464a', '#26262a'], fs: 4, road: { cz: -30, r0: 21, r1: 41, a: 1.25 }, wall: ['windows', '#1c2028', '#0a0c12', '#f0d890'], back: ['city', 'midgarfar'], br: 46, void: '#04060c', voidY: -34, fx: ['searchlights'], fog: [0.035, 0.045, 0.09], fogN: 30, fogF: 105, cast: '#c8d4ff', lum: 0.9 },
    grass: { ground: ['#507632', '#44662c'], sky: ['#6c8aa8', '#bccad4'], floor: ['grass', '#507632', '#304a1c', '#78984a'], fs: 3.5, back: ['hills'], fog: [0.68, 0.74, 0.78], fogN: 18, fogF: 48, cast: '#f4f4ec', lum: 1.05 },
    marsh: { ground: ['#5c6236', '#4e5430'], sky: ['#48525e', '#8c9494'], floor: ['dirt', '#5c6236', '#2e321c', '#3a4a3a'], fs: 3.5, back: ['clouds'], cloud: '#4a525c', set: ['reeds', 'deadtree'], fog: [0.5, 0.54, 0.54], cast: '#e4e8e4', lum: 0.95 },
    mine: { ground: ['#4c4c4a', '#40403e'], sky: ['#010203', '#06090c'], floor: ['rock', '#4c4c4a', '#242422', '#5a5e66'], fs: 3, wall: ['rockwall', '#5c5a56', '#221f1c', '#3a4a5a'], cave: { r: 11.5, n: 12, h: 10, deco: ['crystals'] }, fog: [0.02, 0.035, 0.045], fogN: 11, fogF: 30, cast: '#d4e4f4' },
    condor: { ground: ['#8a7a5c', '#7a6c50'], sky: ['#4a88c8', '#c8d8e8'], floor: ['dirt', '#8a7a5c', '#5a4a36', '#a89a7a'], fs: 3.5, back: ['mountains'], set: ['rocks'], cast: '#fff6e8' },
    junon: { ground: ['#6c4c38', '#5c4030'], sky: ['#1c1a1a', '#4c4642'], floor: ['plates', '#6c4c38', '#2a1c14', '#8c5430'], fs: 3, fence: { kind: 'railing', h: 1.3, col: '#4a3a30' }, back: ['towers'], set: ['lattice'], fog: [0.22, 0.2, 0.19], cast: '#ecdccc', lum: 0.9 },
    ship: { ground: ['#565c62', '#4a5056'], sky: ['#040506', '#101416'], floor: ['plates', '#565c62', '#24272a', '#6a5a48'], fs: 3, wall: ['steel', '#6e7478', '#262a2e', '#6a5a4a'], room: { h: 9, tw: 4, th: 4.5, deco: ['ribs', 'pipes'] }, set: ['crates', 'barrels'], fog: [0.06, 0.07, 0.08], cast: '#e4ecf4', lum: 0.95 },
    beach: { ground: ['#e2ca92', '#d0b882'], sky: ['#2a80d8', '#b8e0f8'], floor: ['sand', '#e2ca92', '#bca272', '#f2dcaa'], fs: 4, deco: ['water', '#2a78b8', '#8ac8f0'], dec: ['sea'], set: ['palms'], cast: '#fffaf0', lum: 1.1 },
    beach_sunset: { ground: ['#8c6c52', '#7a5e48'], sky: ['#4a3050', '#f09a5a'], floor: ['sand', '#8c6c52', '#54402e', '#a8866a'], fs: 4, deco: ['water', '#4a3448', '#e0905a'], dec: ['sea'], back: ['sunset', 'pylon'], fog: [0.78, 0.52, 0.38], fogN: 16, cast: '#ffb888' },
    mtcorel: { ground: ['#8a6a48', '#765a3c'], sky: ['#3a2016', '#e8904c'], floor: ['planks', '#8a6a48', '#3a2818'], fs: 2.5, deck: 7.5, void: '#140a06', dec: ['railsz', 'deckedge'], back: ['lattice'], fog: [0.55, 0.34, 0.2], cast: '#ffbc80' },
    corel: { ground: ['#8c7c62', '#7a6c54'], sky: ['#6a98d0', '#e0d8c0'], floor: ['dirt', '#8c7c62', '#5a4a3a', '#aa9a7a'], fs: 3.5, back: ['mountains'], mtn: '#8a7a6a', set: ['shacks', 'junk', 'rocks'], shack: '#7a6a58', cast: '#fff4e0' },
    desert: { ground: ['#d2b27a', '#c0a06c'], sky: ['#6a98d0', '#f0e0b0'], floor: ['sand', '#d2b27a', '#a88a5a', '#eacc9a'], fs: 4, back: ['dunes'], set: ['cactus', 'rocks'], fog: [0.9, 0.82, 0.64], cast: '#fff0d4', lum: 1.1 },
    prison: { ground: ['#7c6248', '#6a543e'], sky: ['#625a70', '#c8aa9a'], floor: ['dirt', '#7c6248', '#463628', '#9a8262'], fs: 3.5, fence: { kind: 'scrap', h: 1.8 }, back: ['mountains'], mtn: '#6a5a6a', set: ['shacks', 'junk'], shack: '#6a5038', shackTex: 'wood', fog: [0.64, 0.56, 0.54], cast: '#f2dcd0', lum: 0.95 },
    goldsaucer: { ground: ['#4c3c38', '#3e302c'], sky: ['#040202', '#100808'], floor: ['stone', '#4c3c38', '#1c1412'], fs: 2.6, wall: ['stonewall', '#4c423e', '#1c1614', '#3a2e2a'], room: { h: 10, tw: 4, th: 5, deco: ['portcullis', 'chains', 'pilasters'], pc: '#40362f', pr: 'rock', every: 7 }, deco: ['runes', '#8a2418', '#2a0a06', '#f08030'], dec: ['ring'], fog: [0.05, 0.03, 0.025], cast: '#ffd8c0', lum: 0.95 },
    jungle: { ground: ['#7c5c3c', '#6a4e34'], sky: ['#162a0e', '#5a7a3a'], floor: ['dirt', '#7c5c3c', '#463222', '#9a7a52'], fs: 3.5, rimTint: [0.8, 1.15, 0.62], back: ['treeline'], trees: '#1e3a16', set: ['broadleaf', 'bushes'], fog: [0.2, 0.28, 0.14], fogN: 16, fogF: 42, cast: '#e8f4d4' },
    canyon: { ground: ['#b27248', '#a0663e'], sky: ['#d07040', '#f0c890'], floor: ['rock', '#b27248', '#7a4830', '#c8906a'], fs: 3.5, back: ['mesas'], mtn: '#a0603a', set: ['mesas', 'rocks'], fog: [0.84, 0.6, 0.42], cast: '#ffe4c8', lum: 1.05 },
    cave: { ground: ['#4c4238', '#40382e'], sky: ['#020202', '#080806'], floor: ['rock', '#4c4238', '#221c16', '#5a6a4a'], fs: 3, wall: ['rockwall', '#5c5c4a', '#1e1e14', '#4a6a3a'], cave: { r: 11.5, n: 12, h: 10, deco: ['stalag'] }, set: ['rocks'], fog: [0.03, 0.035, 0.025], fogN: 11, fogF: 30, cast: '#dcecd4' },
    nibelheim: { ground: ['#7a7058', '#6a624c'], sky: ['#4a6a98', '#a8b8c8'], floor: ['dirt', '#7a7058', '#4a4434', '#6a7a4a'], fs: 3.5, back: ['mountains', 'hills'], set: ['houses', 'watertower'], cast: '#f4f4f0' },
    mansion: { ground: ['#7c7068', '#6a605a'], sky: ['#060404', '#140e0c'], floor: ['stone', '#7c7068', '#34302c'], fs: 3, wall: ['panel', '#5a4232', '#241810', '#7a5c44'], room: { h: 9, tw: 3.6, th: 9, deco: ['pilasters', 'balustrade'], pc: '#4a3426', pr: 'wood', every: 7.2 }, fog: [0.07, 0.055, 0.05], cast: '#f4e4d4', lum: 0.95 },
    mtnibel: { ground: ['#6c6652', '#5c5846'], sky: ['#5a7aa8', '#b8c0c8'], floor: ['rock', '#6c6652', '#403c30', '#8a8468'], fs: 3.5, back: ['mountains'], snowy: true, set: ['rocks'], cast: '#f0f0f0' },
    rocket: { ground: ['#7c6648', '#6a563c'], sky: ['#6a98d0', '#d8e0e8'], floor: ['dirt', '#7c6648', '#4a3a28', '#6a7a44'], fs: 3.5, back: ['rocket', 'hills'], set: ['house', 'bronco', 'picket'], cast: '#fff4e4' },
    wutai: { ground: ['#8c8474', '#7a7264'], sky: ['#6a98d0', '#e0e8f0'], floor: ['cobble', '#8c8474', '#4a443a'], fs: 3, back: ['mountains', 'pagodas'], mtn: '#4a6a5a', set: ['pagoda', 'torii', 'lanterns'], cast: '#fff8ec' },
    temple: { ground: ['#8e8c82', '#7c7a70'], sky: ['#0e100a', '#26281e'], floor: ['stone', '#8e8c82', '#4a4a44'], fs: 3.5, wall: ['stonewall', '#8a887e', '#46443e', '#5a6a4a'], room: { h: 11, tw: 4, th: 5.5, deco: ['vines', 'pilasters'], pc: '#7a786e', pr: 'rock', every: 6 }, fog: [0.18, 0.19, 0.15], fogN: 13, fogF: 38, cast: '#f4f4e4' },
    bone: { ground: ['#b2a282', '#a09274'], sky: ['#6a88b0', '#d0d0c8'], floor: ['sand', '#b2a282', '#7a6a50', '#c8b898'], fs: 3.5, back: ['mountains', 'bones'], set: ['bones', 'tents', 'lamps'], cast: '#fff4e4' },
    forest: { ground: ['#3e4e2a', '#344424'], sky: ['#0e1a0e', '#34482c'], floor: ['grass', '#3e4e2a', '#1e2814', '#5a5a34'], fs: 3, back: ['treeline'], trees: '#16261a', set: ['trunks', 'bushes'], fog: [0.16, 0.22, 0.15], fogN: 14, fogF: 38, cast: '#d8f0cc', lum: 0.9 },
    // Jenova LIFE at the Forgotten Capital's altar: a pale stone terrace over still water, a stone
    // balustrade, round pillars standing in the water, pale-blue falls of light behind
    capital_altar: { ground: ['#a4b0ba', '#909ca8'], sky: ['#0a2a48', '#2a6a96'], floor: ['stone', '#aab6c0', '#5e6a76'], fs: 3.5, deck: 10.5, deckZ: [-9.5, 10.5], deco: ['water', '#1a4a78', '#8ac8f0'], dec: ['pool', 'ledge'], fence: { kind: 'balusters', h: 1.1, col: '#b8c4cc' }, back: ['falls', 'shells'], set: ['columns'], fog: [0.12, 0.28, 0.42], fogN: 16, fogF: 46, cast: '#d4e6ff', lum: 1.05 },
    city_ancients: { ground: ['#a2b2c2', '#90a0b2'], sky: ['#203050', '#6a88b0'], floor: ['ice', '#a2b2c2', '#6a7a90', '#d2dcea'], fs: 4, back: ['shells'], set: ['shells', 'crystals'], fog: [0.32, 0.42, 0.56], cast: '#dce8ff' },
    snow: { ground: ['#eef2f8', '#dce2ec'], sky: ['#8aa0c0', '#e0e8f0'], floor: ['snow', '#eef2f8', '#aebccc'], fs: 4, back: ['mountains'], snowy: true, mtn: '#7a8aa0', set: ['pines', 'hills'], fog: [0.86, 0.89, 0.94], fogN: 18, fogF: 48, cast: '#f4f8ff', lum: 1.05 },
    glacier: { ground: ['#bcd2ea', '#a8c0da'], sky: ['#406088', '#b0c8e0'], floor: ['ice', '#bcd2ea', '#7c9aba', '#eaf2fc'], fs: 4, back: ['mountains'], snowy: true, mtn: '#5a7090', set: ['ice', 'hills'], cast: '#e8f0ff' },
    cliff: { ground: ['#2c4c8c', '#243e74'], sky: ['#02040c', '#081230'], floor: ['ice', '#2c4c8c', '#0e1c44', '#6a9ad8'], fs: 3.5, wall: ['icewall', '#3a6ab4', '#0a1840', '#a8d8ff'], cave: { r: 11.5, n: 12, h: 11, deco: ['icicles'] }, fog: [0.03, 0.06, 0.16], fogN: 12, fogF: 32, cast: '#a8c4ff' },
    crater: { ground: ['#4c4c52', '#404046'], sky: ['#04040a', '#141820'], floor: ['rock', '#4c4c52', '#242428', '#4a5a54'], fs: 3, wall: ['rockwall', '#4c5652', '#161c1a', '#5a6a60'], cave: { r: 12, n: 12, h: 11, deco: ['stalag'] }, set: ['rocks'], fog: [0.06, 0.07, 0.08], cast: '#dce8e8', lum: 0.95 },
    crater_core: { ground: ['#3a4a48', '#303e3c'], sky: ['#020a08', '#0a2a20'], floor: ['rock', '#3a4a48', '#18221f', '#4a8a70'], fs: 3, wall: ['rockwall', '#2c3c38', '#0a1412', '#3a8a60'], cave: { r: 12, n: 12, h: 11, deco: ['crystals'] }, set: ['crystals'], crystal: '#50f0a0', fog: [0.03, 0.11, 0.08], cast: '#b8ffdc', lum: 0.9 },
    // Jenova SYNTHESIS at the bottom of the Northern Crater: an organic cavern of sinewy rock and jagged
    // spires, veins, pods and ribbons glowing with the Lifestream's purple-green light
    synthesis: { ground: ['#6a5a70', '#42344a'], sky: ['#10061a', '#220e30'], floor: ['veins', '#54445a', '#1c1224', '#7affc0'], fs: 3.5, wall: ['sinew', '#5e4666', '#180e1c', '#5ae0a0'], cave: { r: 12.5, n: 12, h: 11, deco: ['spires', 'pods', 'wisps'] }, deco: ['veinfx', '#000000', '#90ffc8'], back: ['aurora'], fx: ['veinglow', 'motes'], mote: '#b8ffe0', crystal: '#c878ff', fog: [0.11, 0.05, 0.14], fogN: 11, fogF: 34, cast: '#e8d0ff', lum: 0.95 },
    underwater: { ground: ['#5c6a7a', '#4e5a68'], sky: ['#020810', '#0a1a28'], floor: ['stripes', '#5c6a7a', '#28323e'], fs: 3, wall: ['steel', '#5a6878', '#1e2630', '#6a5a4a'], room: { h: 9, tw: 4, th: 4.5, deco: ['hazard', 'machines', 'pipes'] }, deco: ['hazard', '#e0b820', '#1a1a1a'], fog: [0.03, 0.07, 0.11], cast: '#ccdcff', lum: 0.95 },
    // Emerald WEAPON: the deep sea floor - rippled sand under a drifting caustic net, rocks and coral, kelp,
    // shafts of light from the surface, drifting motes and a blue-green haze
    seafloor: { ground: ['#5e8a82', '#527a74'], sky: ['#1a6a88', '#08344c'], floor: ['caustic', '#6a9288', '#284a4e', '#c8fff0'], fs: 4, deco: ['causticfx', '#000000', '#a8f4ff'], back: ['reef', 'rays'], set: ['reefrocks', 'coral', 'kelp'], fx: ['caustics', 'shafts', 'motes'], mote: '#c8f8ff', fog: [0.04, 0.2, 0.26], fogN: 8, fogF: 36, cast: '#a8e8ff', lum: 1.05 },
    space: { ground: ['#1a0e2c', '#140a22'], sky: ['#000000', '#12081e'], floor: ['nebula', '#0c0618', '#4a2a7a'], fs: 7, rim: 0.5, back: ['nebula', 'stars'], fog: [0.02, 0.01, 0.05], fogN: 20, fogF: 60, cast: '#e4dcff' },
    lifestream: { ground: ['#2ab870', '#26a464'], sky: ['#e8fff4', '#40d890'], floor: ['swirl', '#2ab870', '#e8fff0'], fs: 5, back: ['streams'], fog: [0.5, 0.9, 0.66], cast: '#d8ffe8', lum: 1.1 },
    mideel: { ground: ['#3e4e26', '#344222'], sky: ['#22401c', '#6a8a48'], floor: ['grass', '#3e4e26', '#1e2812', '#5a6a34'], fs: 3, back: ['treeline'], trees: '#1a3414', set: ['broadleaf', 'bushes', 'palms'], fog: [0.26, 0.36, 0.2], fogN: 15, fogF: 40, cast: '#e4f4d0' },
    sisterray: { ground: ['#4c484a', '#403c3e'], sky: ['#060404', '#161010'], floor: ['plates', '#4c484a', '#1e1c1e', '#5c4638'], fs: 3, wall: ['girders', '#6e4c34', '#0e0a08', '#1e1814'], room: { h: 12, tw: 5, th: 5, deco: ['lamps'] }, fog: [0.07, 0.055, 0.05], cast: '#f4dcc8', lum: 0.95 },
    ocean: { ground: ['#1a4a78', '#18446e'], sky: ['#3a78c0', '#a8c8e8'], floor: ['water', '#1a4a78', '#3a7aa8'], fs: 5, fog: [0.5, 0.65, 0.82] },
    sky: { ground: ['#7c7c82', '#6c6c72'], sky: ['#2a60b0', '#c0d8f0'], floor: ['plates', '#7c7c82', '#3a3a40', '#6a6a70'], fs: 3, fence: { kind: 'railing', h: 1.2, col: '#6a6a72' }, back: ['clouds'], cloud: '#f4f8fc', fog: [0.72, 0.82, 0.92], cast: '#f8fbff' },
  };
  A.BG = BG;
  // formation-specific looks for shared ids (Bottomswell is fought on Junon's beach at sunset)
  const VARIANTS = { beach: { bottomswell: 'beach_sunset' } };
  A.variant = function (id, enemies) {
    const v = VARIANTS[id];
    if (v && enemies) for (const e of enemies) if (v[e]) return v[e];
    return id;
  };
  const LIGHT = A.LIGHT = { dir: [-0.4, -0.85, -0.35], color: [0.72, 0.7, 0.66], ambient: [0.46, 0.46, 0.5] };
  function lightOf(d) {
    const c = FF7.glColor(d.cast || '#ffffff'), k = d.lum || 1;
    return { dir: d.ldir || LIGHT.dir, color: LIGHT.color.map((v, i) => v * c[i] * k), ambient: LIGHT.ambient.map((v, i) => v * c[i] * k), color2: [0.18 * c[0], 0.2 * c[1], 0.28 * c[2]] };
  }

  // ------------------------------------------------------------------ textures
  // 64px cells: (0,0) white (untextured faces use uv 0,0), then a decal and six neutral prop materials
  // (tinted by vertex colour); the arena's floor and wall tiles are 128px.
  const AT = 256;
  const REG = { white: [0, 0, 64], deco: [64, 0, 64], metal: [0, 64, 64], wood: [64, 64, 64], rock: [0, 128, 64], brick: [64, 128, 64], bark: [0, 192, 64], leaf: [64, 192, 64], floor: [128, 0, 128], wall: [128, 128, 128] };
  // seamless tile painter for one atlas region
  function painter(t, reg, pal, seed) {
    const [ox, oy, S] = reg, d = t.data, R = U.rng(seed);
    const P = pal.map(c => U.hexToRgb(c)), lat = new Map();
    const idx = (x, y) => ((oy + (((Math.floor(y) % S) + S) % S)) * AT + ox + (((Math.floor(x) % S) + S) % S)) * 4;
    const c = {
      S, P, R, seed,
      each(fn) { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const q = fn(x, y), i = idx(x, y); d[i] = q[0]; d[i + 1] = q[1]; d[i + 2] = q[2]; d[i + 3] = 255; } },
      put(x, y, q, a = 1) { const i = idx(x, y); for (let k = 0; k < 3; k++) d[i + k] = d[i + k] * (1 - a) + q[k] * a; },
      get(x, y) { const i = idx(x, y); return [d[i], d[i + 1], d[i + 2]]; },
      // periodic value noise, n lattice cells across the tile
      vn(x, y, n, k) {      // x, y within the tile
        const key = n * 1000 + k; let L = lat.get(key);
        if (!L) { L = new Float32Array(n * n); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) L[j * n + i] = U.hash(i, j, seed + k); lat.set(key, L); }
        const fx = x * n / S, fy = y * n / S, xi = Math.floor(fx), yi = Math.floor(fy), tx = fx - xi, ty = fy - yi;
        const x1 = xi + 1 < n ? xi + 1 : 0, y0 = yi * n, y1 = (yi + 1 < n ? yi + 1 : 0) * n;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        return (L[y0 + xi] * (1 - sx) + L[y0 + x1] * sx) * (1 - sy) + (L[y1 + xi] * (1 - sx) + L[y1 + x1] * sx) * sy;
      },
      fbm(x, y, n, oct, k) { let s = 0, a = 0.5, w = 0; for (let o = 0; o < oct; o++) { s += c.vn(x, y, n << o, k + o * 17) * a; w += a; a *= 0.5; } return s / w; },
      mix(a, b, f) { f = U.clamp(f, 0, 1); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; },
      mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; },
      blob(cx, cy, r, q, a = 1) { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const ex = x + 0.5 - cx, ey = y + 0.5 - cy, e = Math.sqrt(ex * ex + ey * ey) / r; if (e <= 1) c.put(x, y, q, a * Math.min(1, (1 - e) * 3)); } },
      line(xa, ya, xb, yb, q, a = 1) { const n = Math.ceil(Math.hypot(xb - xa, yb - ya)) || 1; for (let i = 0; i <= n; i++) c.put(xa + (xb - xa) * i / n, ya + (yb - ya) * i / n, q, a); },
    };
    return c;
  }
  const clampRGB = (q) => [U.clamp(q[0], 0, 255), U.clamp(q[1], 0, 255), U.clamp(q[2], 0, 255)];
  // periodic cell network over the tile (n x n jittered cells): 1 on the cell borders, 0 inside
  // (caustic nets, veins); w: border width as a share of a cell
  function cnet(c, n, k, w = 0.35) {
    const R = U.rng(c.seed + k * 7919), cs = c.S / n, pts = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) pts.push([(i + 0.15 + R() * 0.7) * cs, (j + 0.15 + R() * 0.7) * cs]);
    return (x, y) => {
      x = ((x % c.S) + c.S) % c.S; y = ((y % c.S) + c.S) % c.S;
      const ci = Math.floor(x / cs), cj = Math.floor(y / cs);
      let d1 = 1e9, d2 = 1e9;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const p = pts[((cj + dj + n) % n) * n + (ci + di + n) % n];
        let dx = Math.abs(x - p[0]), dy = Math.abs(y - p[1]); dx = Math.min(dx, c.S - dx); dy = Math.min(dy, c.S - dy);
        const dd = Math.sqrt(dx * dx + dy * dy);
        if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd;
      }
      return U.clamp(1 - (d2 - d1) / (cs * w), 0, 1);
    };
  }
  const PAINT = {
    white(c) { c.each(() => [255, 255, 255]); },
    // metal deck: 2x2 plates, dark seams with a lit bevel, corner rivets, grime and rust (P[2])
    plates(c) {
      const h = c.S / 2;
      c.each((x, y) => {
        const px = x % h, py = y % h;
        if (px < 2 || py < 2) return c.P[1];
        let k = 0.86 + c.fbm(x, y, 4, 3, 1) * 0.24 + (c.R() - 0.5) * 0.05;
        if (px < 4 || py < 4) k += 0.14; else if (px > h - 3 || py > h - 3) k -= 0.12;
        if ([6, h - 6].some(a => [6, h - 6].some(b => (px - a) * (px - a) + (py - b) * (py - b) < 4))) k += 0.28;
        const rust = c.P[2] ? (c.fbm(x, y, 4, 4, 9) - 0.55) * 2.4 : 0;
        return clampRGB(c.mul(c.mix(c.P[0], c.P[2] || c.P[0], rust), k));
      });
    },
    // grating: square bars over dark holes
    grating(c) { const g = c.S / 8; c.each((x, y) => { const px = x % g, py = y % g; return px < g * 0.35 || py < g * 0.35 ? clampRGB(c.mul(c.P[0], 0.9 + c.R() * 0.15 + (px < 1 || py < 1 ? 0.15 : 0))) : c.P[1]; }); },
    // square tiles with grout lines and a per-tile shade
    tiles(c) {
      const s = c.S / 4;
      c.each((x, y) => {
        const tx = Math.floor(x / s), ty = Math.floor(y / s), px = x % s, py = y % s;
        if (px < 2 || py < 2) return c.P[1];
        let k = 0.88 + U.hash(tx, ty, c.seed) * 0.12 + (c.R() - 0.5) * 0.04 + (c.fbm(x, y, 4, 2, 3) - 0.5) * 0.1;
        if (px < 3 || py < 3) k += 0.07;
        return clampRGB(c.mul(c.P[0], k));
      });
    },
    // floorboards: rows of planks, staggered joints, grain
    planks(c) {
      const n = 6, s = c.S / n, off = [];
      for (let i = 0; i < n; i++) off.push([Math.floor(c.R() * c.S), c.R()]);
      c.each((x, y) => {
        const row = Math.floor(y / s), py = y % s, jx = ((x - off[row][0]) % c.S + c.S) % c.S;
        if (py < 1.5 || jx < 1.5 || (off[row][1] > 0.5 && Math.abs(jx - c.S / 2) < 0.8)) return c.P[1];
        const grain = Math.sin(TAU * (y / c.S) * 18 + c.fbm(x, y, 4, 3, row) * 7) * 0.05;
        const k = 0.9 + (U.hash(row, jx < c.S / 2 ? 0 : 1, c.seed) - 0.5) * 0.18 + grain + (py < 3 ? 0.05 : 0) - (py > s - 2.5 ? 0.08 : 0);
        return clampRGB(c.mul(c.P[0], k));
      });
    },
    // earth: blotches between P[1] and P[0], P[2] patches, grit and pebbles
    dirt(c) {
      c.each((x, y) => {
        let q = c.mix(c.P[1], c.P[0], (c.fbm(x, y, 4, 4, 1) - 0.25) * 1.9);
        if (c.P[2]) q = c.mix(q, c.P[2], (c.fbm(x, y, 3, 3, 5) - 0.58) * 2.2);
        const r = c.R();
        return clampRGB(c.mul(q, r < 0.07 ? 0.78 : r > 0.95 ? 1.12 : 0.95 + c.R() * 0.08));
      });
      for (let i = 0; i < 46; i++) c.blob(c.R() * c.S, c.R() * c.S, 0.8 + c.R() * 1.6, c.R() < 0.5 ? clampRGB(c.mul(c.P[0], 1.25)) : c.mul(c.P[1], 0.8), 0.8);
    },
    // grass: mottled green with short blade strokes
    grass(c) {
      c.each((x, y) => clampRGB(c.mul(c.mix(c.P[1], c.P[0], (c.fbm(x, y, 4, 4, 2) - 0.2) * 1.6), 0.94 + c.R() * 0.1)));
      for (let i = 0; i < 700; i++) { const x = c.R() * c.S, y = c.R() * c.S, l = 1 + c.R() * 3; c.line(x, y, x + (c.R() - 0.5) * 1.5, y - l, c.R() < 0.5 ? c.mul(c.P[1], 0.8) : (c.P[2] || clampRGB(c.mul(c.P[0], 1.25))), 0.7); }
    },
    // sand: fine grain and wind ripples
    sand(c) {
      c.each((x, y) => {
        const rip = Math.sin(TAU * (y / c.S * 5 + x / c.S + c.fbm(x, y, 4, 2, 4) * 1.4));
        let q = c.mix(c.P[0], rip > 0 ? (c.P[2] || c.P[0]) : c.P[1], Math.abs(rip) * 0.28);
        q = c.mix(q, c.P[1], (c.fbm(x, y, 3, 3, 8) - 0.55) * 1.2);
        return clampRGB(c.mul(q, 0.95 + c.R() * 0.08));
      });
    },
    snow(c) { c.each((x, y) => (c.R() < 0.012 ? [255, 255, 255] : clampRGB(c.mul(c.mix(c.P[1], c.P[0], 0.55 + (c.fbm(x, y, 3, 4, 3) - 0.5) * 1.6), 0.97 + c.R() * 0.04)))); },
    // ice / polished shell: flowing streaks with bright highlights
    ice(c) {
      c.each((x, y) => {
        const w = Math.sin(TAU * (x / c.S * 2 + y / c.S + c.fbm(x, y, 3, 4, 6) * 1.8));
        let q = c.mix(c.P[1], c.P[0], 0.5 + w * 0.5);
        if (c.P[2]) q = c.mix(q, c.P[2], (w - 0.75) * 3);
        return clampRGB(c.mul(q, 0.96 + c.R() * 0.06));
      });
    },
    // flagstones: running courses of irregular stones with mortar joints
    stone(c) {
      const rows = 4, s = c.S / rows, cuts = [];
      for (let r = 0; r < rows; r++) { const n = 2 + Math.floor(c.R() * 2), o = c.R() * c.S, cc = []; for (let i = 0; i < n; i++) cc.push((o + (i + c.R() * 0.4) * c.S / n) % c.S); cuts.push(cc.sort((a, b) => a - b)); }
      c.each((x, y) => {
        const r = Math.floor(y / s), py = y % s, cc = cuts[r];
        let k = 0, dx = 1e9;
        for (let i = 0; i < cc.length; i++) { const e = Math.abs(x - cc[i]), dd = Math.min(e, c.S - e); if (dd < dx) dx = dd; if (x >= cc[i]) k = i + 1; }
        if (py < 2 || dx < 1.5) return c.P[1];
        let v = 0.86 + U.hash(r, k % cc.length, c.seed) * 0.2 + (c.fbm(x, y, 4, 3, 2) - 0.5) * 0.18 + (c.R() - 0.5) * 0.05;
        if (py < 3.5 || dx < 3) v += 0.06;
        if (py > s - 2) v -= 0.08;
        return clampRGB(c.mul(c.P[0], v));
      });
    },
    // cobbles: jittered cells, rounded stones, dark joints
    cobble(c) {
      const n = 6, cs = c.S / n, pts = [];
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) pts.push([(i + 0.2 + c.R() * 0.6) * cs, (j + 0.2 + c.R() * 0.6) * cs, c.R()]);
      c.each((x, y) => {
        let d1 = 1e9, d2 = 1e9, id = 0;
        const ci = Math.floor(x / cs), cj = Math.floor(y / cs);
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const p = pts[((cj + dj + n) % n) * n + (ci + di + n) % n];
          let dx = Math.abs(x - p[0]), dy = Math.abs(y - p[1]); dx = Math.min(dx, c.S - dx); dy = Math.min(dy, c.S - dy);
          const dd = Math.sqrt(dx * dx + dy * dy);
          if (dd < d1) { d2 = d1; d1 = dd; id = p[2]; } else if (dd < d2) d2 = dd;
        }
        if (d2 - d1 < 2) return c.P[1];
        return clampRGB(c.mul(c.P[0], 0.84 + id * 0.24 - d1 / (c.S / n) * 0.2 + (c.R() - 0.5) * 0.05));
      });
    },
    // natural rock: strata, blotches, cracks
    rock(c) {
      c.each((x, y) => {
        const st = Math.sin(TAU * (y / c.S * 3 + c.fbm(x, y, 2, 3, 4) * 1.2)) * 0.5 + 0.5;
        let q = c.mix(c.P[1], c.P[0], c.fbm(x, y, 4, 4, 1) * 0.9 + st * 0.3 - 0.1);
        if (c.P[2]) q = c.mix(q, c.P[2], (c.fbm(x, y, 3, 3, 9) - 0.6) * 2);
        return clampRGB(c.mul(q, 0.94 + c.R() * 0.1));
      });
      for (let k = 0; k < 10; k++) { let x = c.R() * c.S, y = c.R() * c.S; const n = 10 + c.R() * 24; for (let i = 0; i < n; i++) { x += c.R() - 0.35; y += c.R() - 0.5; c.put(x, y, c.mul(c.get(x, y), 0.8)); } }
    },
    asphalt(c) { c.each((x, y) => clampRGB(c.mul(c.mix(c.P[0], c.P[1], (c.fbm(x, y, 3, 3, 2) - 0.45) * 1.4), 0.9 + c.R() * 0.16))); },
    // concrete deck: one slab per tile, seams, stains
    concrete(c) { c.each((x, y) => (x < 1.5 || y < 1.5 ? c.P[1] : clampRGB(c.mul(c.mix(c.P[0], c.P[1], (c.fbm(x, y, 3, 4, 7) - 0.6) * 1.5), 0.93 + c.fbm(x, y, 8, 2, 1) * 0.1 + (c.R() - 0.5) * 0.05)))); },
    water(c) { c.each((x, y) => { const w = Math.sin(TAU * (y / c.S * 4 + c.fbm(x, y, 3, 3, 2) * 1.5)); return c.mix(c.P[0], c.P[1], Math.max(0, w) * 0.45 + (c.R() < 0.01 ? 0.5 : 0)); }); },
    // Lifestream: bright swirling currents
    swirl(c) { c.each((x, y) => { const w = Math.sin(TAU * (c.fbm(x, y, 2, 4, 3) * 3 + (x + y) / c.S)); return c.mix(c.P[0], c.P[1], Math.pow(w * 0.5 + 0.5, 2.2)); }); },
    nebula(c) { c.each((x, y) => (c.R() < 0.006 ? [255, 255, 255] : c.mix(c.P[0], c.P[1], Math.pow(c.fbm(x, y, 3, 4, 5), 2.5) * 1.4))); },
    // metal floor in bands (underwater reactor)
    stripes(c) { const s = c.S / 4; c.each((x, y) => { const b = Math.floor(x / s) % 2, px = x % s; return px < 1.5 ? c.P[1] : clampRGB(c.mul(b ? c.P[0] : c.mix(c.P[0], c.P[1], 0.35), 0.92 + c.fbm(x, y, 4, 2, 3) * 0.12 + (c.R() - 0.5) * 0.04)); }); },
    // sea floor: rippled sand, dark silt patches and a faint net of caustic light (P[2]), shell grit
    caustic(c) {
      const net = cnet(c, 4, 3, 0.3);
      c.each((x, y) => {
        const rip = Math.sin(TAU * (y / c.S * 3 + x / c.S + c.fbm(x, y, 3, 2, 4) * 1.3));
        let q = c.mix(c.P[1], c.P[0], 0.6 + rip * 0.12 + (c.fbm(x, y, 4, 3, 1) - 0.5) * 0.9);
        q = c.mix(q, c.P[2], Math.pow(net(x + (c.fbm(x, y, 3, 2, 6) - 0.5) * 24, y + (c.fbm(x, y, 3, 2, 8) - 0.5) * 24), 2) * 0.28);
        return clampRGB(c.mul(q, 0.94 + c.R() * 0.1));
      });
      for (let i = 0; i < 34; i++) c.blob(c.R() * c.S, c.R() * c.S, 0.7 + c.R() * 1.5, c.R() < 0.6 ? clampRGB(c.mul(c.P[0], 1.2)) : c.mul(c.P[1], 0.8), 0.8);
    },
    // Jenova SYNTHESIS: mottled organic rock, purple bruising and meandering veins that glow (P[2])
    veins(c) {
      c.each((x, y) => {
        const v1 = Math.pow(1 - Math.abs(c.fbm(x, y, 3, 4, 2) * 2 - 1), 12), v2 = Math.pow(1 - Math.abs(c.fbm(x, y, 5, 3, 7) * 2 - 1), 22);
        let q = c.mix(c.P[1], c.P[0], c.fbm(x, y, 4, 4, 1) * 1.15 - 0.05);
        q = c.mix(q, [118, 64, 138], (c.fbm(x, y, 3, 3, 9) - 0.55) * 1.6);
        q = c.mix(q, c.mul(c.P[1], 0.7), Math.min(1, (v1 + v2) * 2.2));
        q = c.mix(q, c.P[2], v1 * 0.6 + v2 * 0.35);
        return clampRGB(c.mul(q, 0.93 + c.R() * 0.1));
      });
    },
    // ---- walls
    brick(c) {
      const bh = c.S / 10, bw = c.S / 4;
      c.each((x, y) => {
        const r = Math.floor(y / bh), py = y % bh, xx = x + (r % 2) * bw / 2, px = xx % bw;
        if (py < 1.5 || px < 1.5) return c.P[1];
        return clampRGB(c.mul(c.P[0], 0.84 + U.hash(r, Math.floor(xx / bw) % 4, c.seed) * 0.22 + (c.fbm(x, y, 8, 2, 2) - 0.5) * 0.12 - (py > bh - 2.5 ? 0.08 : 0)));
      });
    },
    // big dressed stone blocks
    stonewall(c) {
      const bh = c.S / 4, bw = c.S / 2;
      c.each((x, y) => {
        const r = Math.floor(y / bh), py = y % bh, xx = x + (r % 2) * bw / 2, px = xx % bw;
        if (py < 2 || px < 2) return c.P[1];
        let k = 0.82 + U.hash(r, Math.floor(xx / bw) % 2, c.seed) * 0.2 + (c.fbm(x, y, 4, 3, 3) - 0.5) * 0.22 + (c.R() - 0.5) * 0.05;
        if (py < 4 || px < 4) k += 0.07;
        if (py > bh - 3 || px > bw - 3) k -= 0.08;
        return clampRGB(c.mul(c.mix(c.P[0], c.P[2] || c.P[0], (c.fbm(x, y, 3, 3, 8) - 0.55) * 2), k));
      });
    },
    // wood panelling: framed panels, a rail and skirting (the tile spans the whole wall height)
    panel(c) {
      const pw = c.S / 2;
      c.each((x, y) => {
        const px = x % pw;
        if (y > c.S * 0.88) return c.mul(c.P[1], 0.9);
        if (Math.abs(y - c.S * 0.6) < 2.5) return c.P[2];
        const fr = px < 7 || px > pw - 7 || y < 7 || Math.abs(y - c.S * 0.6) < 9;
        const grain = Math.sin(TAU * (x / c.S * 10 + c.fbm(x, y, 4, 3, 1) * 3)) * 0.05;
        let k = (fr ? 1.08 : 0.88) + grain;
        if (!fr && (px === 7 || y === 7)) k = 0.66;
        return clampRGB(c.mul(c.P[0], k));
      });
    },
    // red lacquer hall (Corneo's): posts, a latticed window, a dark lower panel with a round motif
    lacquer(c) {
      const S = c.S;
      c.each((x, y) => {
        if (x < 10 || x > S - 10) return clampRGB(c.mul(c.P[0], x < 3 || x > S - 3 ? 0.8 : 1.05));
        if (y > S * 0.62) { const e = Math.hypot(x - S / 2, (y - S * 0.8) * 1.3); return c.mul(c.P[0], e < 12 && e > 8 ? 1.25 : 0.6); }
        if (y > S * 0.56 || y < 14 || x < 16 || x > S - 16) return c.mul(c.P[0], y > S * 0.56 ? 0.8 : 0.95);
        const lx = (x - 16) % 16, ly = (y - 14) % 16;
        return lx < 3 || ly < 3 ? c.mul(c.P[0], 0.85) : c.mix(c.P[2], c.P[1], 0.4 + c.fbm(x, y, 4, 2, 2) * 0.3);
      });
    },
    // Shinra office wall: cream plaster, a dark band, skirting
    office(c) { c.each((x, y) => (y > c.S * 0.9 ? c.P[2] : y > c.S * 0.62 && y < c.S * 0.7 ? c.P[1] : clampRGB(c.mul(c.P[0], x < 1.5 ? 0.8 : 0.95 + c.fbm(x, y, 4, 2, 1) * 0.06)))); },
    // steel hold / lab: vertical panels, ribs, rivets, some rust (P[2])
    steel(c) {
      const pw = c.S / 4, rh = c.S / 3;
      c.each((x, y) => {
        const px = x % pw, py = y % rh;
        if (px < 1.5) return c.P[1];
        let k = 0.88 + c.fbm(x, y, 4, 3, 4) * 0.16 + (c.R() - 0.5) * 0.04;
        if (py < 4) k += 0.16; else if (py < 7) k -= 0.18;
        if ((px === 4 || px === pw - 4) && py % 8 === 4) k += 0.3;
        return clampRGB(c.mul(c.mix(c.P[0], c.P[2] || c.P[0], (c.fbm(x, y, 3, 3, 9) - 0.6) * 2), k));
      });
    },
    // reactor machinery: olive panels, pipes, lit gauge panels (P[2])
    machine(c) {
      const S = c.S, h = S / 2, pipes = [[S * 0.2, 5], [S * 0.28, 3], [S * 0.72, 6]];
      c.each((x, y) => {
        const px = x % h, py = y % h, pipe = pipes.find(([cx, r]) => Math.abs(x - cx) < r);
        if (pipe) { const t = (x - pipe[0]) / pipe[1]; return clampRGB(c.mul(c.P[0], 1.25 - t * t * 0.6 - (t > 0 ? 0.25 * t : 0))); }
        if (px < 2 || py < 2) return c.P[1];
        if (py > h * 0.25 && py < h * 0.45 && px > 20 && px < 44) return (Math.floor(px / 4) + Math.floor(py / 4)) % 3 ? c.P[2] : c.mul(c.P[2], 0.6);
        return clampRGB(c.mul(c.P[0], 0.86 + c.fbm(x, y, 4, 3, 1) * 0.2));
      });
    },
    // steel lattice: X-braced girders over a dark void (station wall, hangar)
    girders(c) {
      const g = c.S / 2, bw = 5;
      c.each((x, y) => {
        const px = x % g, py = y % g, d1 = Math.abs(px - py), d2 = Math.abs(px + py - g);
        if (px < bw || py < bw * 0.8) return clampRGB(c.mul(c.P[0], 0.9 + (px < 2 || py < 2 ? 0.2 : 0) + (c.R() - 0.5) * 0.06));
        if (d1 < bw * 0.6 || d2 < bw * 0.6) return clampRGB(c.mul(c.P[0], 0.72 + (c.R() - 0.5) * 0.06));
        return c.mix(c.P[1], c.P[2] || c.P[1], c.fbm(x, y, 3, 2, 1));
      });
    },
    // cave rock: vertical strata and patches of tint P[2]
    rockwall(c) {
      c.each((x, y) => {
        const st = Math.sin(TAU * (x / c.S * 4 + c.fbm(x, y, 2, 3, 2) * 1.5)) * 0.5 + 0.5;
        let q = c.mix(c.P[1], c.P[0], c.fbm(x, y, 4, 4, 3) * 0.9 + st * 0.35 - 0.12);
        if (c.P[2]) q = c.mix(q, c.P[2], (c.fbm(x, y, 3, 3, 6) - 0.55) * 2.4);
        return clampRGB(c.mul(q, 0.93 + c.R() * 0.1));
      });
    },
    // ice cave: vertical crystal shards with bright cores
    icewall(c) {
      const cols = [];
      for (let i = 0; i < 12; i++) cols.push([c.R() * c.S, 3 + c.R() * 8, c.R()]);
      c.each((x, y) => {
        let q = c.mix(c.P[1], c.P[0], c.fbm(x, y, 4, 3, 1) * 0.8 + 0.1);
        for (const [cx, w, b] of cols) { const e = Math.abs(x - cx), dx = Math.min(e, c.S - e), ww = w * (0.6 + 0.4 * (1 - y / c.S)); if (dx < ww) q = c.mix(q, c.P[2] || c.P[0], (1 - dx / ww) * (0.4 + b * 0.5)); }
        return clampRGB(c.mul(q, 0.95 + c.R() * 0.08));
      });
    },
    // tunnel lining: concrete panels, joints, bolt rows, soot rising up the wall, a red cable run (P[2])
    lining(c) {
      const pw = c.S / 2, ph = c.S / 2;
      c.each((x, y) => {
        const px = x % pw, py = y % ph;
        if (c.P[2] && Math.abs(y - c.S * 0.7) < 1.6) return clampRGB(c.mul(c.P[2], 0.85 + c.R() * 0.25));
        if (px < 2 || py < 2) return c.P[1];
        let k = 0.78 + c.fbm(x, y, 4, 3, 2) * 0.3 + (y / c.S) * 0.12 + (c.R() - 0.5) * 0.05;
        if (px < 4 || py < 4) k += 0.1;
        if ((px === 8 || px === pw - 8) && py % 12 === 6) k += 0.3;
        return clampRGB(c.mul(c.P[0], k));
      });
    },
    // Jenova SYNTHESIS: sinewy rock in vertical ribs with glowing seams (P[2])
    sinew(c) {
      c.each((x, y) => {
        const rib = Math.sin(TAU * (x / c.S * 6 + c.fbm(x, y, 2, 3, 3) * 1.6));
        const seam = 1 - Math.abs(Math.sin(TAU * (x / c.S * 3 + y / c.S * 0.5 + c.fbm(x, y, 3, 3, 5))));
        let q = c.mix(c.P[1], c.P[0], 0.45 + rib * 0.3 + (c.fbm(x, y, 4, 3, 1) - 0.5) * 0.6);
        q = c.mix(q, c.P[2], Math.pow(seam, 16) * 0.85);
        return clampRGB(c.mul(q, 0.93 + c.R() * 0.1));
      });
    },
    // night facades: dark panels and rows of windows, some of them lit (P[2])
    windows(c) {
      const cw = c.S / 8, ch = c.S / 10;
      c.each((x, y) => {
        const i = Math.floor(x / cw), j = Math.floor(y / ch), px = x % cw, py = y % ch;
        if (!(px > cw * 0.22 && px < cw * 0.78 && py > ch * 0.25 && py < ch * 0.78)) return clampRGB(c.mul(c.P[0], 0.9 + c.fbm(x, y, 4, 2, 1) * 0.25));
        return U.hash(i, j, c.seed) > 0.6 ? clampRGB(c.mul(c.P[2], 0.7 + U.hash(j, i, c.seed + 3) * 0.35)) : c.P[1];
      });
    },
    // Shinra building facade: cream panels, dark window strips, lit fixtures (P[2]) (one tile = one storey)
    facade(c) {
      const pw = c.S / 4;
      c.each((x, y) => {
        const px = x % pw;
        if (y < 3 || (y > c.S * 0.5 && y < c.S * 0.5 + 2)) return c.mul(c.P[1], 0.8);
        if (px > pw * 0.3 && px < pw * 0.7 && y > c.S * 0.12 && y < c.S * 0.9) return (px > pw * 0.44 && px < pw * 0.56 && y > c.S * 0.3 && y < c.S * 0.42) ? c.P[2] : clampRGB(c.mul(c.P[1], 0.55 + c.fbm(x, y, 4, 2, 3) * 0.2));
        return clampRGB(c.mul(c.P[0], 0.86 + c.fbm(x, y, 4, 3, 1) * 0.18 - (px < 2 ? 0.2 : 0)));
      });
    },
    // leaf clumps
    foliage(c) { c.each((x, y) => c.mix(c.P[1], c.P[0], c.fbm(x, y, 4, 3, 1))); for (let i = 0; i < 200; i++) { const l = c.R(); c.blob(c.R() * c.S, c.R() * c.S, 2 + c.R() * 4, l < 0.4 ? c.mul(c.P[1], 0.7) : c.mix(c.P[0], c.P[2] || c.P[0], l), 0.9); } },
    bark(c) { c.each((x, y) => clampRGB(c.mul(c.P[0], 0.72 + Math.sin(TAU * (x / c.S * 6 + c.fbm(x, y, 2, 3, 1))) * 0.14 + c.R() * 0.12))); },
    // ---- decals
    hazard(c) { c.each((x, y) => (((x + y) % (c.S / 2)) < c.S / 4 ? c.P[0] : c.P[1])); },
    // Battle Square ring: a red band edged in black with orange glyphs
    runes(c) {
      c.each((x, y) => (y < 5 || y > c.S - 6 ? c.P[1] : clampRGB(c.mul(c.P[0], 0.8 + c.fbm(x, y, 4, 2, 1) * 0.3))));
      for (let i = 0; i < 4; i++) {
        const x0 = i * c.S / 4 + 4, w = c.S / 4 - 8;
        for (let k = 0; k < 3; k++) { const ya = 14 + c.R() * 30, yb = ya + 6 + c.R() * 14, xa = x0 + c.R() * w; c.line(xa, ya, xa + (c.R() - 0.5) * w, yb, c.P[2], 1); }
        c.line(x0, 12, x0 + w, 12, c.P[2], 0.9);
      }
    },
    // additive overlays (black adds nothing): the caustic net that drifts over the sea floor, glowing veins
    causticfx(c) { const net = cnet(c, 3, 11, 0.28); c.each((x, y) => c.mix(c.P[0], c.P[1], Math.pow(net(x + (c.fbm(x, y, 2, 2, 4) - 0.5) * 16, y + (c.fbm(x, y, 2, 2, 6) - 0.5) * 16), 2.2))); },
    veinfx(c) { c.each((x, y) => c.mix(c.P[0], c.P[1], Math.pow(1 - Math.abs(c.fbm(x, y, 2, 4, 3) * 2 - 1), 14) * 1.2)); },
  };
  // one atlas per arena; the shared prop materials are painted once and copied in
  const paintInto = (t, reg, spec, seed) => { const [kind, ...pal] = spec; (PAINT[kind] || PAINT.white)(painter(t, reg, pal.length ? pal : ['#ffffff', '#808080'], seed)); };
  let BASE = null;
  function atlas(id, d) {
    if (!BASE) {
      BASE = FF7.tex.create(AT, AT);
      paintInto(BASE, REG.white, ['white'], 1);
      paintInto(BASE, REG.metal, ['plates', '#e4e4e6', '#78787c'], 2);
      paintInto(BASE, REG.wood, ['planks', '#ece2d6', '#7a6452'], 3);
      paintInto(BASE, REG.rock, ['rock', '#e6e4e0', '#8a8884'], 4);
      paintInto(BASE, REG.brick, ['brick', '#ece4dc', '#8c8680'], 5);
      paintInto(BASE, REG.bark, ['bark', '#e0d4c8'], 6);
      paintInto(BASE, REG.leaf, ['foliage', '#f0f4ec', '#6a746a', '#ffffff'], 7);
    }
    const t = FF7.tex.create(AT, AT), seed = U.strSeed(id);
    t.data.set(BASE.data);
    const paint = (reg, spec, k) => paintInto(t, reg, spec, seed + k * 101);
    paint(REG.floor, d.floor, 7);
    paint(REG.wall, d.wall || d.floor, 8);
    paint(REG.deco, d.deco || ['white'], 9);
    return t;
  }

  // ------------------------------------------------------------------ geometry helpers
  const ruv = (rg, u, v) => [(rg[0] + 0.5 + (rg[2] - 1) * u) / AT, (rg[1] + 0.5 + (rg[2] - 1) * v) / AT];
  const col4 = (c) => (Array.isArray(c) ? (c.length === 4 ? c : [c[0], c[1], c[2], 1]) : FF7.glColor(c));
  const L3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const FULL = (rg) => [ruv(rg, 0, 1), ruv(rg, 1, 1), ruv(rg, 1, 0), ruv(rg, 0, 0)];
  // quad with per-vertex colours, a b c d counter-clockwise from the front
  function vquad(mb, a, b, c, d, cs, uvs) {
    const q = cs.map(col4);
    mb.tri(a, b, c, [q[0], q[1], q[2]], uvs ? [uvs[0], uvs[1], uvs[2]] : null);
    mb.tri(a, c, d, [q[0], q[2], q[3]], uvs ? [uvs[0], uvs[2], uvs[3]] : null);
  }
  // textured quad (a = bottom-left); the region repeats every ts (along ab) / tv (along ad) world units
  function tquad(mb, a, b, c, d, col, rg, ts = 2, tv) {
    const nu = Math.max(1, Math.round(dist3(a, b) / ts)), nv = Math.max(1, Math.round(dist3(a, d) / (tv || ts))), uv = FULL(rg);
    const P = (u, v) => L3(L3(a, b, u), L3(d, c, u), v);
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) mb.quad(P(i / nu, j / nv), P((i + 1) / nu, j / nv), P((i + 1) / nu, (j + 1) / nv), P(i / nu, (j + 1) / nv), col, uv);
  }
  // textured box standing on y0 (four sides and the top)
  function tbox(mb, x, y0, z, w, h, d, col, rg, ts = 1.5) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, y1 = y0 + h;
    tquad(mb, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col, rg, ts);
    tquad(mb, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], sh(col, -0.1), rg, ts);
    tquad(mb, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], sh(col, -0.05), rg, ts);
    tquad(mb, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], sh(col, -0.05), rg, ts);
    tquad(mb, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], sh(col, 0.06), rg, ts);
  }
  // textured cylinder / cone sides (region repeated `reps` times around) with a plain top cap
  function tcyl(mb, x, y, z, r0, r1, h, n, col, rg, reps = 1) {
    const p = (a, r, yy) => [x + Math.cos(a) * r, yy, z + Math.sin(a) * r], per = Math.max(1, Math.round(n / reps));
    for (let i = 0; i < n; i++) {
      const a0 = i / n * TAU, a1 = (i + 1) / n * TAU, u0 = (i % per) / per, u1 = (i % per + 1) / per;
      mb.quad(p(a1, r0, y), p(a0, r0, y), p(a0, r1, y + h), p(a1, r1, y + h), sh(col, Math.cos(a0 + 0.8) * 0.06), [ruv(rg, u1, 1), ruv(rg, u0, 1), ruv(rg, u0, 0), ruv(rg, u1, 0)]);
    }
    if (r1 > 0) for (let i = 1; i < n - 1; i++) mb.tri(p(0, r1, y + h), p((i + 1) / n * TAU, r1, y + h), p(i / n * TAU, r1, y + h), col);
  }
  // smooth value noise over world xz (lattice every sc units)
  function wnoise(x, z, sc, k) {
    const fx = x / sc, fz = z / sc, xi = Math.floor(fx), zi = Math.floor(fz), tx = fx - xi, tz = fz - zi, sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
    const h = (a, b) => U.hash(a, b, k);
    return U.lerp(U.lerp(h(xi, zi), h(xi + 1, zi), sx), U.lerp(h(xi, zi + 1), h(xi + 1, zi + 1), sx), sz);
  }
  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const flips = (a, b, c, out) => { const n = cross3(sub3(b, a), sub3(c, a)); return n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0; };
  // textured quad (a = bottom-left) that faces `out` whichever way round its corners are given
  function tface(mb, a, b, c, d, out, col, rg, ts, tv) { if (flips(a, b, c, out)) tquad(mb, b, a, d, c, col, rg, ts, tv); else tquad(mb, a, b, c, d, col, rg, ts, tv); }
  function vface(mb, a, b, c, d, out, cs, uvs) { if (flips(a, b, c, out)) vquad(mb, b, a, d, c, [cs[1], cs[0], cs[3], cs[2]], uvs && [uvs[1], uvs[0], uvs[3], uvs[2]]); else vquad(mb, a, b, c, d, cs, uvs); }
  // tube from a to b (pipes, poles, arms), textured lengthwise every ts units
  function tube(mb, a, b, r, n, col, rg = REG.metal, ts = 3, caps) {
    const f = unit3(sub3(b, a)), s = unit3(cross3(f, Math.abs(f[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), u = cross3(s, f), L = dist3(a, b), nv = Math.max(1, Math.round(L / ts));
    const P = (t, v) => { const q = L3(a, b, v); return [q[0] + (s[0] * Math.cos(t) + u[0] * Math.sin(t)) * r, q[1] + (s[1] * Math.cos(t) + u[1] * Math.sin(t)) * r, q[2] + (s[2] * Math.cos(t) + u[2] * Math.sin(t)) * r]; };
    for (let i = 0; i < n; i++) {
      const t0 = i / n * TAU, t1 = (i + 1) / n * TAU, out = [s[0] * Math.cos((t0 + t1) / 2) + u[0] * Math.sin((t0 + t1) / 2), s[1] * Math.cos((t0 + t1) / 2) + u[1] * Math.sin((t0 + t1) / 2), s[2] * Math.cos((t0 + t1) / 2) + u[2] * Math.sin((t0 + t1) / 2)];
      for (let k = 0; k < nv; k++) tface(mb, P(t0, k / nv), P(t1, k / nv), P(t1, (k + 1) / nv), P(t0, (k + 1) / nv), out, sh(col, Math.cos(t0 + 0.8) * 0.07), rg, 99);
      if (caps) for (const [v, o] of [[0, -1], [1, 1]]) { const q = [P(t0, v), P(t1, v), L3(a, b, v)]; if (flips(q[0], q[1], q[2], f.map(x => x * o))) mb.tri(q[1], q[0], q[2], sh(col, -0.15)); else mb.tri(q[0], q[1], q[2], sh(col, -0.15)); }
    }
  }
  // soft additive glow (alpha a at p, 0 at radius r) in the plane of e1, e2 (built with cull:false)
  function halo(mb, p, e1, e2, r, col, a, n = 8) {
    const q = col4(col), c0 = [q[0], q[1], q[2], a], c1 = [q[0], q[1], q[2], 0];
    const P = (t) => [p[0] + (e1[0] * Math.cos(t) + e2[0] * Math.sin(t)) * r, p[1] + (e1[1] * Math.cos(t) + e2[1] * Math.sin(t)) * r, p[2] + (e1[2] * Math.cos(t) + e2[2] * Math.sin(t)) * r];
    for (let i = 0; i < n; i++) mb.tri(p, P(i / n * TAU), P((i + 1) / n * TAU), [c0, c1, c1]);
  }
  // halo seen from any side: two crossed vertical discs and a flat one
  const glowBall = (mb, p, r, col, a) => { halo(mb, p, [1, 0, 0], [0, 1, 0], r, col, a, 6); halo(mb, p, [0, 0, 1], [0, 1, 0], r, col, a, 6); };
  // low-poly textured boulder: a lumpy dome (seed k)
  function boulder(mb, x, y, z, rx, ry, rz, col, k, rg = REG.rock) {
    const seg = 7, rings = 3, jit = (i, j) => (j ? 0.78 + U.hash(i % seg, j, k) * 0.44 : 1);
    const pt = (i, j) => { const th = j / rings * Math.PI * 0.56, ph = i / seg * TAU + (j % 2) * 0.4, m = jit(i, j); return [x + Math.sin(th) * Math.cos(ph) * rx * m, y + Math.cos(th) * ry * (0.85 + m * 0.15) - (j === rings ? ry * 0.2 : 0), z + Math.sin(th) * Math.sin(ph) * rz * m]; };
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1), mid = L3(a, c, 0.5), out = [mid[0] - x, mid[1] - y + ry * 0.3, mid[2] - z];
      const cc = sh(col, (U.hash(i, j, k + 5) - 0.5) * 0.18 + (j ? -0.04 * j : 0.05));
      if (j === 0) { if (flips(a, c, d, out)) mb.tri(a, d, c, cc, [ruv(rg, 0.5, 0), ruv(rg, 0, 1), ruv(rg, 1, 1)]); else mb.tri(a, c, d, cc, [ruv(rg, 0.5, 0), ruv(rg, 1, 1), ruv(rg, 0, 1)]); }
      else tface(mb, d, c, b, a, out, cc, rg, 99);
    }
  }

  // ------------------------------------------------------------------ floor
  // one texture tile per fs x fs cell; vertex colours add soft light pools and dim the rim
  function buildFloor(mb, d) {
    const S = d.fs || 3.5, ext = d.ext || 21, n = Math.ceil(ext / S), inside = !!(d.room || d.cave || d.tunnel);
    const rim = d.rim != null ? d.rim : inside ? 0.55 : 1, tint = d.rimTint, deck = d.deck || 99, dz = d.deckZ || [-99, 99], uv = FULL(REG.floor);
    const vc = (x, z) => {
      const r = Math.hypot(x, z);
      let k = (1 + (wnoise(x, z, 5, 3) - 0.5) * 0.16) * U.lerp(1, rim, U.clamp((r - 8) / 9, 0, 1));
      if (inside) k *= 1 + 0.1 * (1 - U.clamp(r / 9, 0, 1));
      if (!tint) return [k, k, k, 1];
      const t = U.clamp((r - 6.5) / 5, 0, 1) * (0.7 + wnoise(x, z, 3, 8) * 0.3);
      return [k * U.lerp(1, tint[0], t), k * U.lerp(1, tint[1], t), k * U.lerp(1, tint[2], t), 1];
    };
    for (let i = -n; i < n; i++) for (let j = -n; j < n; j++) {
      const x0 = i * S, x1 = x0 + S, z0 = j * S, z1 = z0 + S;
      if (Math.hypot(x0 + S / 2, z0 + S / 2) > ext + S * 0.7 || Math.abs(x0 + S / 2) > deck || z0 + S / 2 < dz[0] || z0 + S / 2 > dz[1]) continue;
      vquad(mb, [x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], [vc(x0, z1), vc(x1, z1), vc(x1, z0), vc(x0, z0)], uv);
    }
  }
  // flat decal quad on the floor at height y
  const flat = (mb, x0, z0, x1, z1, y, col, rg, ts) => tquad(mb, [x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], col, rg || REG.white, ts || 99);
  // floor decals (all at floor level, below the 0.3 height the view checks care about)
  const DEC = {
    // railway along x: sleepers and two rails (Reactor 1's tracks)
    rails(mb, gl, d) { for (const zc of d.railsAt || [0.7]) { for (let x = -19.8; x < 20; x += 0.9) flat(mb, x - 0.16, zc - 1.05, x + 0.16, zc + 1.05, 0.02, '#5a4632', REG.wood); for (const s of [-0.72, 0.72]) tbox(mb, 0, 0.02, zc + s, 40, 0.1, 0.1, '#a0a0a8', REG.metal, 4); } },
    // railway along z (Mt Corel's trestle)
    railsz(mb, gl, d) { const L = d.railLen || 20; for (const xc of d.railsAt || [-3.2, 1.3]) { for (let z = 0.2 - L; z < L; z += 0.9) flat(mb, xc - 1.05, z - 0.16, xc + 1.05, z + 0.16, 0.02, '#3a2818', REG.wood); for (const s of [-0.72, 0.72]) tbox(mb, xc + s, 0.02, 0, 0.1, 0.1, L * 2, '#8a8a90', REG.metal, 4); } },
    // trestle deck edges over the void
    deckedge(mb, gl, d) { for (const s of [-1, 1]) { const x = s * d.deck; tquad(mb, s > 0 ? [x, -0.5, -20] : [x, -0.5, 20], s > 0 ? [x, -0.5, 20] : [x, -0.5, -20], s > 0 ? [x, 0, 20] : [x, 0, -20], s > 0 ? [x, 0, -20] : [x, 0, 20], '#6a4a30', REG.wood, 2, 0.5); } },
    // station platform: hazard stripe at the edge, the track pit beyond
    platform(mb, gl, d) {
      flat(mb, -21, -7.5, 21, -6.9, 0.012, '#ffffff', REG.deco, 0.6);
      flat(mb, -21, -21, 21, -7.5, 0.008, '#2a2e2a');
      for (const zc of [-9.6]) { for (let x = -19.8; x < 20; x += 0.9) flat(mb, x - 0.16, zc - 1.05, x + 0.16, zc + 1.05, 0.02, '#3a3028', REG.wood); for (const s of [-0.72, 0.72]) tbox(mb, 0, 0.02, zc + s, 40, 0.1, 0.1, '#8a8a90', REG.metal, 4); }
    },
    // lab: yellow grating walkway along x
    walkway(mb) { flat(mb, -21, -0.5, 21, 1.9, 0.015, '#ffffff', REG.deco, 1.2); for (const z of [-0.5, 1.9]) flat(mb, -21, z - 0.08, 21, z + 0.08, 0.02, '#8a7420'); },
    // Battle Square: the ring of red runes around the fight
    ring(mb) {
      const cx = -0.2, cz = 0.7, n = 40, uv = FULL(REG.deco);
      for (const [r0, r1] of [[4.9, 6.3], [3.6, 3.8]]) for (let i = 0; i < n; i++) {
        const a0 = i / n * TAU, a1 = (i + 1) / n * TAU, p = (a, r) => [cx + Math.cos(a) * r, 0.015, cz + Math.sin(a) * r];
        if (r1 - r0 > 1) mb.quad(p(a0, r0), p(a1, r0), p(a1, r1), p(a0, r1), '#ffffff', [uv[3], uv[2], uv[1], uv[0]]);
        else mb.quad(p(a0, r0), p(a1, r0), p(a1, r1), p(a0, r1), '#8a2418');
      }
    },
    // Shinra HQ: dark floor bands
    stripes(mb) { for (const z of [-3.4, 5.6]) flat(mb, -21, z - 0.35, 21, z + 0.35, 0.012, '#4a4a52'); },
    // sewer: a water channel with stone kerbs behind the enemies
    channel(mb, gl) { flat(gl, -21, -8.8, 21, -7.2, 0.01, '#1a3428'); for (const z of [-7.2, -8.8]) tbox(mb, 0, 0, z, 42, 0.18, 0.3, '#5a6450', REG.rock, 1.5); },
    // beach: the sea behind the enemies, and a line of foam
    sea(mb) { flat(mb, -21, -21, 21, -9.5, 0.02, '#ffffff', REG.deco, 4); flat(mb, -21, -9.7, 21, -9.3, 0.025, '#f4f4f0'); },
    // Corel's runaway train: the car under the fight (its roof is the floor), the cars beyond the couplings
    // (their roofs a step lower), plank sides and ends, edge beams, bogies and couplers
    cars(mb, gl, d) {
      const hw = d.deck, z0 = d.deckZ[0], z1 = d.deckZ[1], H = 3.2, body = '#6a5440', lip = '#5a4432';
      const car = (za, zb, y) => {
        for (const s of [-1, 1]) tface(mb, [s * hw, y - H, zb], [s * hw, y - H, za], [s * hw, y, za], [s * hw, y, zb], [s, 0, 0], sh(body, s > 0 ? -0.06 : 0), REG.wood, 3.2);
        for (const [z, o] of [[za, -1], [zb, 1]]) tface(mb, [-hw, y - H, z], [hw, y - H, z], [hw, y, z], [-hw, y, z], [0, 0, o], sh(body, -0.1), REG.wood, 3.2);
        if (y < 0) tface(mb, [-hw, y, zb], [hw, y, zb], [hw, y, za], [-hw, y, za], [0, 1, 0], '#d8d0c0', REG.floor, 2.5);
        for (const s of [-1, 1]) tbox(mb, s * (hw - 0.1), y, (za + zb) / 2, 0.2, 0.14, zb - za, lip, REG.wood, 6);
        for (const z of [za + 0.1, zb - 0.1]) tbox(mb, 0, y, z, hw * 2, 0.14, 0.2, lip, REG.wood, 5);
        for (const z of [za + 2.4, zb - 2.4]) tbox(mb, 0, y - H - 0.7, z, hw * 1.2, 0.7, 2.6, '#1e1e20', REG.metal, 3);
      };
      car(z0, z1, 0); car(z1 + 1.2, z1 + 19, -0.45); car(z0 - 19, z0 - 1.2, -0.45);
      for (const z of [z1 + 0.6, z0 - 0.6]) tbox(mb, 0, -H + 0.5, z, 0.5, 0.4, 1.4, '#2a2a2c', REG.metal, 1);
    },
    // Shinra HQ roof: the helipad's yellow ring and white H under the enemies
    helipad(mb) {
      const cx = -1, cz = -2.4, n = 32, Y = ['#d8b030', '#d8b030', '#d8b030', '#d8b030'];
      for (let i = 0; i < n; i++) { const a0 = i / n * TAU, a1 = (i + 1) / n * TAU, p = (a, r) => [cx + Math.cos(a) * r, 0.014, cz + Math.sin(a) * r]; vface(mb, p(a0, 4.6), p(a1, 4.6), p(a1, 5.05), p(a0, 5.05), [0, 1, 0], Y); }
      for (const dx of [-1.1, 1.1]) flat(mb, cx + dx - 0.25, cz - 1.8, cx + dx + 0.25, cz + 1.8, 0.016, '#e4e4dc');
      flat(mb, cx - 0.9, cz - 0.22, cx + 0.9, cz + 0.22, 0.016, '#e4e4dc');
    },
    // the glass elevator: two octagonal platforms (plated tops, a thick rim with pink lights) over the drop
    octagons(mb, gl) {
      for (const [cx, cz, ap] of [[1.2, 3.8, 2.9], [-1, -3.1, 3]]) {
        const r8 = ap / Math.cos(Math.PI / 8), ang = (i) => (i + 0.5) / 8 * TAU, P = (i, r, y) => [cx + Math.cos(ang(i)) * r, y, cz + Math.sin(ang(i)) * r];
        const C = [cx, 0, cz], uc = ruv(REG.floor, 0.5, 0.5), uv = (i) => ruv(REG.floor, 0.5 + Math.cos(ang(i)) * 0.5, 0.5 + Math.sin(ang(i)) * 0.5);
        const B = [cx, -0.8, cz], low = (q) => [q[0], -0.8, q[2]];
        for (let i = 0; i < 8; i++) {
          const a = P(i, r8, 0), b = P(i + 1, r8, 0);
          if (flips(C, a, b, [0, 1, 0])) mb.tri(C, b, a, '#ffffff', [uc, uv(i + 1), uv(i)]); else mb.tri(C, a, b, '#ffffff', [uc, uv(i), uv(i + 1)]);
          const out = [Math.cos((ang(i) + ang(i + 1)) / 2), 0, Math.sin((ang(i) + ang(i + 1)) / 2)];
          tface(mb, low(a), low(b), b, a, out, '#4a4a4e', REG.metal, 3, 0.8);
          const m0 = L3(P(i, r8 + 0.02, -0.55), P(i + 1, r8 + 0.02, -0.55), 0.35), m1 = L3(P(i, r8 + 0.02, -0.55), P(i + 1, r8 + 0.02, -0.55), 0.65);
          vface(gl, m0, m1, [m1[0], -0.3, m1[2]], [m0[0], -0.3, m0[2]], out, ['#f0a0d8', '#f0a0d8', '#f0a0d8', '#f0a0d8']);
          if (flips(B, low(a), low(b), [0, -1, 0])) mb.tri(B, low(b), low(a), '#2a2a2e'); else mb.tri(B, low(a), low(b), '#2a2a2e');
        }
        for (const [gx, gz] of [[-0.8, -0.6], [0.8, 0.9], [0.2, -1.4]]) flat(mb, cx + gx - 0.45, cz + gz - 0.25, cx + gx + 0.45, cz + gz + 0.25, 0.012, '#26262a');
      }
    },
    // the Forgotten Capital's altar: still water round the terrace
    pool(mb) { tface(mb, [-22, -0.6, 22], [22, -0.6, 22], [22, -0.6, -22], [-22, -0.6, -22], [0, 1, 0], '#ffffff', REG.deco, 5.5); },
    // the sides of a square deck (a terrace, a rooftop) dropping d.ledge units
    ledge(mb, gl, d) {
      const x0 = -d.deck, x1 = d.deck, z0 = d.deckZ[0], z1 = d.deckZ[1], h = d.ledge || 0.6;
      for (const [a, b, o] of [[[x0, z0], [x1, z0], [0, 0, -1]], [[x1, z0], [x1, z1], [1, 0, 0]], [[x1, z1], [x0, z1], [0, 0, 1]], [[x0, z1], [x0, z0], [-1, 0, 0]]]) tface(mb, [a[0], -h, a[1]], [b[0], -h, b[1]], [b[0], 0, b[1]], [a[0], 0, a[1]], o, sh(d.ground[1], -0.1), REG.rock, 3, h);
    },
    // church: Aeris's flower bed at the back of the nave
    flowers(mb, gl, d, R) {
      flat(mb, -3.2, -9.2, 1.4, -7.4, 0.012, '#2a2016');
      for (let i = 0; i < 140; i++) { const x = -3 + R() * 4.2, z = -9 + R() * 1.4; mb.box(x, 0.05, z, 0.14, 0.1, 0.14, i % 4 === 0 ? '#3a6a28' : ['#f0e040', '#f4f4f4', '#f080a0'][i % 3]); }
    },
  };

  // ------------------------------------------------------------------ backdrop (unlit)
  // BR / BH: backdrop radius and height, set per arena while its backdrop is built (d.br: the expressway's is
  // wider so its deck can curve away into the distance)
  let BR = 16.5, BH = 16;
  const YH = 2.5;
  // periodic noise around the horizon (n lattice points on the circle)
  function anoise(a, n, k) { const f = (((a / TAU) % 1) + 1) % 1 * n, i = Math.floor(f), t = f - i, s = t * t * (3 - 2 * t); return U.lerp(U.hash(i % n, 7, k), U.hash((i + 1) % n, 7, k), s); }
  const cyl = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
  // silhouette band around the horizon: height hf(a); top colour ct (a colour or fn(height))
  function ridge(mb, r, n, hf, cb, ct, y0 = -2) {
    for (let i = 0; i < n; i++) {
      const a0 = i / n * TAU, a1 = (i + 1) / n * TAU, h0 = hf(a0), h1 = hf(a1), c0 = typeof ct === 'function' ? ct(h0) : ct, c1 = typeof ct === 'function' ? ct(h1) : ct;
      vquad(mb, cyl(a0, r, y0), cyl(a1, r, y0), cyl(a1, r, h1), cyl(a0, r, h0), [cb, cb, c1, c0]);
    }
  }
  // thick line on the sky cylinder from (arc s0, y0) to (s1, y1), width w
  function beamS(mb, r, s0, y0, s1, y1, w, c) {
    const dx = s1 - s0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2, P = (s, y) => cyl(s / r, r, y);
    vquad(mb, P(s0 - nx, y0 - ny), P(s1 - nx, y1 - ny), P(s1 + nx, y1 + ny), P(s0 + nx, y0 + ny), [c, c, c, c]);
  }
  // filled ellipse on the sky cylinder (clouds, domes, glows); half: upper half only
  function blotch(mb, r, a, y, w, h, cIn, cOut, half) {
    const n = 14, c = cyl(a, r, y), pts = [];
    for (let i = 0; i <= n; i++) { const t = half ? i / n * Math.PI : i / n * TAU; pts.push(cyl(a + Math.cos(t) * w / r, r, y + Math.sin(t) * h)); }
    for (let i = 0; i < n; i++) mb.tri(c, pts[i], pts[i + 1], [col4(cIn), col4(cOut), col4(cOut)]);
  }
  // steel / timber lattice tower on the sky cylinder centred at arc s
  function towerS(mb, r, s, h, w, c) {
    const L = (k) => s - w + w * 0.6 * k, Rr = (k) => s + w - w * 0.6 * k;
    beamS(mb, r, L(0), -2, L(1), h, 0.28, c); beamS(mb, r, Rr(0), -2, Rr(1), h, 0.28, c);
    for (let k = 0; k < 6; k++) { const y0 = -1 + k * (h + 1) / 6, y1 = y0 + (h + 1) / 6, k0 = (y0 + 2) / (h + 2), k1 = (y1 + 2) / (h + 2); beamS(mb, r, L(k0), y0, Rr(k0), y0, 0.18, c); beamS(mb, r, L(k0), y0, Rr(k1), y1, 0.12, c); beamS(mb, r, Rr(k0), y0, L(k1), y1, 0.12, c); }
    beamS(mb, r, L(1) - 0.3, h, Rr(1) + 0.3, h, 0.35, c);
  }
  const BACK = {
    hills(mb, d, R, P) {
      ridge(mb, BR - 0.3, 72, (a) => 0.7 + anoise(a, 9, 1) * 2.2 + anoise(a, 23, 2) * 0.6, P.far, sh(P.far, 0.06));
      ridge(mb, BR - 0.6, 72, (a) => 0.2 + anoise(a, 13, 3) * 1.3, P.near, sh(P.near, 0.06));
    },
    mountains(mb, d, R, P) {
      const snow = d.snowy ? '#e8eef4' : null, c = P.mtn;
      ridge(mb, BR - 0.2, 96, (a) => 1 + Math.pow(anoise(a, 8, 5), 1.5) * 5.5 + anoise(a, 29, 6) * 0.9, sh(c, -0.1), (h) => (snow && h > 4.2 ? snow : sh(c, 0.12)));
    },
    mesas(mb, d, R, P) { ridge(mb, BR - 0.2, 120, (a) => { const v = anoise(a, 10, 7); return v > 0.55 ? 3.5 + anoise(a, 5, 8) * 2.5 : 0.6 + v * 0.8; }, sh(P.mtn, -0.15), sh(P.mtn, 0.12)); },
    dunes(mb, d, R, P) {
      ridge(mb, BR - 0.3, 72, (a) => 0.5 + anoise(a, 7, 9) * 2.4, P.far, sh(P.far, 0.08));
      ridge(mb, BR - 0.6, 72, (a) => 0.2 + anoise(a, 11, 10) * 1.2, P.near, sh(P.near, 0.1));
    },
    // dense jungle / forest edge: canopy band and trunks
    treeline(mb, d, R, P) {
      const c = d.trees || '#1e3218';
      ridge(mb, BR - 0.3, 120, (a) => 3.4 + anoise(a, 31, 11) * 2.8 + anoise(a, 77, 12) * 1.2, sh(c, -0.35), sh(c, 0.12));
      for (let i = 0; i < 44; i++) { const s = R() * TAU * (BR - 0.6); beamS(mb, BR - 0.6, s, -2, s + (R() - 0.5) * 0.4, 3 + R() * 2.5, 0.35 + R() * 0.5, sh(c, -0.45)); }
    },
    // night city: blocks with lit windows
    skyline(mb, d, R) {
      for (let i = 0; i < 46; i++) {
        const r = BR - 0.4 - R() * 0.4, s = R() * TAU * r, w = 0.8 + R() * 1.8, h = 2 + R() * 6, c = sh('#141820', R() * 0.2);
        vquad(mb, cyl((s - w) / r, r, -2), cyl((s + w) / r, r, -2), cyl((s + w) / r, r, h), cyl((s - w) / r, r, h), [c, c, c, c]);
        for (let k = 0; k < 7; k++) if (R() < 0.7) { const wy = R() * (h - 0.6), ws = s - w + 0.3 + R() * (2 * w - 0.6), wc = R() < 0.7 ? '#f0d890' : '#80e0f0'; vquad(mb, cyl((ws - 0.16) / r, r - 0.05, wy), cyl((ws + 0.16) / r, r - 0.05, wy), cyl((ws + 0.16) / r, r - 0.05, wy + 0.25), cyl((ws - 0.16) / r, r - 0.05, wy + 0.25), [wc, wc, wc, wc]); }
      }
    },
    // Midgar: the plate's underside overhead with rows of lights and support pillars
    plate(mb, d, R) {
      for (let i = 0; i < 48; i++) { const a0 = i / 48 * TAU, a1 = (i + 1) / 48 * TAU; vquad(mb, cyl(a0, BR - 0.2, 8), cyl(a1, BR - 0.2, 8), cyl(a1, BR - 0.2, BH), cyl(a0, BR - 0.2, BH), ['#46443e', '#46443e', '#16161a', '#16161a']); }
      for (let i = 0; i < 90; i++) blotch(mb, BR - 0.3, R() * TAU, 8.3 + R() * 2.4, 0.14, 0.09, '#ffe8b0', '#806a40');
      for (let i = 0; i < 8; i++) { const s = R() * TAU * (BR - 0.35); beamS(mb, BR - 0.35, s, -2, s, 8.5, 1.2 + R(), '#26262a'); }
    },
    clouds(mb, d, R, P) {
      const c1 = d.cloud || sh(P.top, 0.3), c2 = sh(c1, -0.18);
      for (let i = 0; i < 26; i++) { const y = 2 + R() * 7; blotch(mb, BR - 0.4 - R() * 0.3, R() * TAU, y, 2 + R() * 4, 0.5 + R() * 1.2, R() < 0.5 ? c1 : c2, P.sky(y)); }
    },
    // Mt Corel: timber trestle frames against the dusk
    lattice(mb, d, R) {
      const c = '#2a1a10', r = BR - 0.5, n = 30, step = TAU * r / n;
      for (let i = 0; i < n; i++) {
        const s0 = i * step, s1 = s0 + step;
        beamS(mb, r, s0, -9, s0, 11, 0.32, c);
        for (const y of [-6, -2.5, 1, 4.5, 8]) { beamS(mb, r, s0, y, s1, y, 0.24, c); beamS(mb, r, s0, y, s1, y + 3.5, 0.16, c); beamS(mb, r, s1, y, s0, y + 3.5, 0.16, c); }
      }
    },
    // Junon: steel lattice towers
    towers(mb, d, R) { for (let i = 0; i < 7; i++) towerS(mb, BR - 0.4, R() * TAU * (BR - 0.4), 6 + R() * 5, 1.4 + R() * 0.7, '#1e1a18'); },
    // Bottomswell's beach: the lattice pylon behind the enemies
    pylon(mb) { const r = BR - 0.4; towerS(mb, r, Math.atan2(-0.3, 0.95) * r, 13, 2.4, '#2a1c20'); },
    // sunset: low sun and cloud streaks
    sunset(mb, d, R, P) {
      blotch(mb, BR - 0.1, Math.atan2(-0.9, 0.5), 1.4, 2.2, 2.2, '#fff4c8', '#f0b070');
      for (let i = 0; i < 18; i++) { const y = 1.5 + R() * 6; blotch(mb, BR - 0.3 - R() * 0.2, R() * TAU, y, 3 + R() * 5, 0.18 + R() * 0.3, R() < 0.5 ? '#6a3a4a' : '#c86a50', P.sky(y)); }
    },
    // Rocket Town: the grounded Shinra No. 26 and its gantry
    rocket(mb) {
      const r = BR - 0.5, s = Math.atan2(-0.4, 0.92) * r, c = '#d8d4cc';
      vquad(mb, cyl((s - 0.9) / r, r, -2), cyl((s + 0.9) / r, r, -2), cyl((s + 2.1) / r, r, 10), cyl((s + 0.3) / r, r, 10), [sh(c, -0.3), sh(c, -0.3), c, c]);
      mb.tri(cyl((s + 0.3) / r, r, 10), cyl((s + 2.1) / r, r, 10), cyl((s + 1.9) / r, r, 12.5), '#b03020');
      towerS(mb, r - 0.1, s - 2.2, 9, 0.9, '#3a3a40');
    },
    nebula(mb, d, R, P) {
      blotch(mb, BR - 0.2, Math.atan2(-1, -0.2), 5, 9, 7, '#3a1a6a', P.sky(5));
      for (let i = 0; i < 12; i++) { const y = 1 + R() * 10; blotch(mb, BR - 0.35 - R() * 0.2, R() * TAU, y, 3 + R() * 5, 2 + R() * 3, R() < 0.5 ? '#5a2a8a' : '#2a3a8a', P.sky(y)); }
    },
    stars(mb, d, R) {
      for (let i = 0; i < 260; i++) { const a = R() * TAU, y = -1 + R() * (BH - 1), s = 0.04 + R() * 0.06, c = R() < 0.8 ? '#ffffff' : '#c0d0ff', r = BR - 0.45; vquad(mb, cyl(a - s / r, r, y), cyl(a + s / r, r, y), cyl(a + s / r, r, y + 2 * s), cyl(a - s / r, r, y + 2 * s), [c, c, c, c]); }
    },
    // Lifestream: bright ribbons of current
    streams(mb, d, R) {
      for (let k = 0; k < 7; k++) {
        const ph = R() * TAU, y0 = 1 + R() * 8, amp = 1 + R() * 2.5, f = 1 + Math.floor(R() * 3), w = 0.3 + R() * 0.6, c = R() < 0.5 ? '#f0fff8' : '#80ffc0', r = BR - 0.4 - k * 0.05;
        for (let i = 0; i < 64; i++) { const a0 = i / 64 * TAU, a1 = (i + 1) / 64 * TAU; beamS(mb, r, a0 * r, y0 + Math.sin(a0 * f + ph) * amp, a1 * r, y0 + Math.sin(a1 * f + ph) * amp, w, c); }
      }
    },
    // Train Graveyard: stacked derelict cars
    wrecks(mb, d, R) {
      for (let i = 0; i < 30; i++) {
        const r = BR - 0.4 - R() * 0.4, s = R() * TAU * r, w = 2.2 + R() * 1.5, y = Math.floor(R() * 3) * 2.2 - 1.5, c = sh('#2e3428', R() * 0.15 - 0.05);
        vquad(mb, cyl((s - w) / r, r, y), cyl((s + w) / r, r, y), cyl((s + w) / r, r, y + 2.1), cyl((s - w) / r, r, y + 2.1), [sh(c, -0.2), sh(c, -0.2), c, c]);
        for (let k = 0; k < 5; k++) { const ws = s - w + 0.5 + k * (2 * w - 1) / 5; vquad(mb, cyl((ws - 0.2) / r, r - 0.05, y + 1), cyl((ws + 0.2) / r, r - 0.05, y + 1), cyl((ws + 0.2) / r, r - 0.05, y + 1.6), cyl((ws - 0.2) / r, r - 0.05, y + 1.6), ['#101410', '#101410', '#1c201a', '#1c201a']); }
      }
    },
    // slums: heaps of scrap with bent girders
    junk(mb, d, R) {
      ridge(mb, BR - 0.3, 96, (a) => 1 + anoise(a, 17, 13) * 3.5 + (anoise(a, 61, 14) > 0.7 ? 1.2 : 0), '#16120e', '#3a3026');
      for (let i = 0; i < 18; i++) { const s = R() * TAU * (BR - 0.5); beamS(mb, BR - 0.5, s, 1 + R() * 2, s + (R() - 0.5) * 2.5, 3 + R() * 3, 0.15 + R() * 0.2, '#241e18'); }
    },
    // Wutai: pagoda silhouettes
    pagodas(mb, d, R) {
      const r = BR - 0.4;
      for (let i = 0; i < 2; i++) {
        const s = R() * TAU * r;
        for (let k = 0; k < 5; k++) { const w = 1.6 - k * 0.22, y = k * 1.5 - 1; vquad(mb, cyl((s - w * 0.7) / r, r, y), cyl((s + w * 0.7) / r, r, y), cyl((s + w * 0.7) / r, r, y + 1.2), cyl((s - w * 0.7) / r, r, y + 1.2), ['#6a2018', '#6a2018', '#8a2a20', '#8a2a20']); vquad(mb, cyl((s - w * 1.2) / r, r - 0.05, y + 1.1), cyl((s + w * 1.2) / r, r - 0.05, y + 1.1), cyl((s + w * 0.6) / r, r - 0.05, y + 1.55), cyl((s - w * 0.6) / r, r - 0.05, y + 1.55), ['#26262a', '#26262a', '#34343a', '#34343a']); }
        beamS(mb, r - 0.05, s, 6.5, s, 8.5, 0.12, '#26262a');
      }
    },
    // Bone Village: giant ribs arching out of the sand
    bones(mb, d, R) {
      const r = BR - 0.4;
      for (let i = 0; i < 4; i++) { const s = R() * TAU * r; for (let k = 0; k < 4; k++) { const b = s + k * 1.4; let px = b, py = -1; for (let j = 1; j <= 6; j++) { const t = j / 6, nx = b + Math.sin(t * 1.6) * 2.2, ny = -1 + Math.sin(t * 2.2) * 6; beamS(mb, r, px, py, nx, ny, 0.45 - t * 0.2, '#d8d0b8'); px = nx; py = ny; } } }
    },
    // Forgotten Capital: shell houses on the horizon
    shells(mb, d, R) { for (let i = 0; i < 9; i++) blotch(mb, BR - 0.4 - R() * 0.3, R() * TAU, -0.5, 1.5 + R() * 2, 2 + R() * 3, '#c8d4e0', '#6a7a98', true); },
    // sea floor: far ridges and pinnacles of rock in the haze, a nearer rim of reef
    reef(mb, d, R, P) {
      const far = U.mix(P.bot, '#0c2230', 0.3), near = U.mix(P.bot, '#06141c', 0.55), r = BR - 0.45;
      ridge(mb, BR - 0.3, 96, (a) => 0.6 + Math.pow(anoise(a, 7, 21), 1.5) * 6.5 + anoise(a, 29, 22) * 1.1, far, sh(far, 0.1));
      for (let i = 0; i < 7; i++) { const s = R() * TAU * r, w = 0.5 + R() * 0.8, h = 5 + R() * 5; vquad(mb, cyl((s - w) / r, r, -2), cyl((s + w) / r, r, -2), cyl((s + w * 0.3) / r, r, h), cyl((s - w * 0.4) / r, r, h), [far, far, sh(far, 0.12), sh(far, 0.12)]); }
      ridge(mb, BR - 0.6, 96, (a) => 0.1 + anoise(a, 11, 23) * 2.4 + (anoise(a, 41, 24) > 0.7 ? 0.8 : 0), near, sh(near, 0.08));
    },
    // light from the surface: pale wedges fanning down through the water
    rays(mb, d, R, P) {
      const r = BR - 0.15, c = U.mix(P.top, '#c8f8ff', 0.3);
      for (let i = 0; i < 16; i++) { const s = R() * TAU * r, w = 0.4 + R() * 1.2, lean = (R() - 0.5) * 5, yb = 1 + R() * 3; vquad(mb, cyl((s + lean - w * 0.4) / r, r, yb), cyl((s + lean + w * 0.4) / r, r, yb), cyl((s + w) / r, r, BH), cyl((s - w) / r, r, BH), [P.sky(yb), P.sky(yb), c, c]); }
    },
    // Jenova SYNTHESIS: the Lifestream's light above the cavern - green and violet glows and ribbons
    aurora(mb, d, R, P) {
      for (let i = 0; i < 12; i++) { const y = 10 + R() * 6; blotch(mb, BR - 0.2 - R() * 0.1, R() * TAU, y, 2.5 + R() * 4, 1 + R() * 1.8, R() < 0.55 ? '#46c888' : '#8a48c8', P.sky(y)); }
      for (let k = 0; k < 5; k++) {
        const ph = R() * TAU, y0 = 12 + R() * 3, amp = 0.8 + R() * 1.5, f = 1 + Math.floor(R() * 3), w = 0.2 + R() * 0.4, c = k % 2 ? '#c8ffe4' : '#c890ff', r = BR - 0.35 - k * 0.04;
        for (let i = 0; i < 48; i++) { const a0 = i / 48 * TAU, a1 = (i + 1) / 48 * TAU; beamS(mb, r, a0 * r, y0 + Math.sin(a0 * f + ph) * amp, a1 * r, y0 + Math.sin(a1 * f + ph) * amp, w, c); }
      }
    },
    // the Forgotten Capital's altar: pale-blue falls of light pouring down behind the water
    falls(mb, d, R, P) {
      const r = BR - 0.35;
      for (let k = 0; k < 14; k++) {
        const s = R() * TAU * r, w = 0.25 + R() * 0.6, ph = R() * TAU, c = R() < 0.5 ? '#bfe4ff' : '#e6f6ff', top = BH - R() * 4;
        for (let i = 0; i < 8; i++) { const y0 = top - i * (top + 1) / 8, y1 = top - (i + 1) * (top + 1) / 8; beamS(mb, r, s + Math.sin(ph + i * 0.9) * 0.3, y0, s + Math.sin(ph + (i + 1) * 0.9) * 0.3, y1, w * (0.6 + i / 12), c); }
      }
    },
    // the moon over the train, with a faint halo
    moon(mb, d, R, P) { const a = -1.95; blotch(mb, BR - 0.2, a, 8, 2.6, 2.6, '#26344e', P.sky(8)); blotch(mb, BR - 0.25, a, 8, 0.9, 0.9, '#f4f0dc', '#c8c8b4'); },
    // night city far below and around the expressway: blocks with lit windows, rows of street lights
    // (kept low where Midgar stands on the horizon)
    city(mb, d, R) {
      const r = BR - 0.6, yb = d.voidY || -12, mid = (a) => { const q = ((a % TAU) + TAU) % TAU; return q > TAU - 1.6 || q < 0.3; };
      for (let i = 0; i < 46; i++) {
        const s = R() * TAU * r, w = 1 + R() * 2.6, tall = R() < 0.25, c = sh('#10141c', R() * 0.25);
        const h = Math.min(mid(s / r) ? -4 : d.cityTop != null ? d.cityTop : 99, yb + 10 + R() * 26 + (tall ? 12 : 0));
        vquad(mb, cyl((s - w) / r, r, yb), cyl((s + w) / r, r, yb), cyl((s + w) / r, r, h), cyl((s - w) / r, r, h), [sh(c, -0.4), sh(c, -0.4), c, c]);
        for (let k = 0; k < 3; k++) if (R() < 0.8) { const wy = yb + 4 + R() * (h - yb - 5), ws = s - w + 0.3 + R() * (2 * w - 0.6), wc = R() < 0.75 ? '#f0d890' : '#90d8f0'; vquad(mb, cyl((ws - 0.18) / r, r - 0.05, wy), cyl((ws + 0.18) / r, r - 0.05, wy), cyl((ws + 0.18) / r, r - 0.05, wy + 0.4), cyl((ws - 0.18) / r, r - 0.05, wy + 0.4), [wc, wc, wc, wc]); }
      }
      for (let i = 0; i < 4; i++) { const y = yb + 2 + R() * 8, s0 = R() * TAU * r; for (let k = 0; k < 16; k++) { const s = s0 + k * 1.3, c = '#ffc070'; vquad(mb, cyl((s - 0.12) / r, r - 0.1, y), cyl((s + 0.12) / r, r - 0.1, y), cyl((s + 0.12) / r, r - 0.1, y + 0.24), cyl((s - 0.12) / r, r - 0.1, y + 0.24), [c, c, c, c]); } }
    },
    // Midgar on the horizon: the plate on its pillars with a rim of lights, the upper city, the Shinra
    // building and the reactors venting green light
    midgarfar(mb, d, R, P) {
      const r = BR - 0.9, s0 = -1.6 * r, s1 = 0.3 * r, yb = d.voidY || -12, pc = '#3a404e', dk = '#141820';
      const block = (s, w, y0, y1, c, rr = r) => vquad(mb, cyl((s - w) / rr, rr, y0), cyl((s + w) / rr, rr, y0), cyl((s + w) / rr, rr, y1), cyl((s - w) / rr, rr, y1), [sh(c, -0.25), sh(c, -0.25), c, c]);
      const dot = (s, y, wd, c, rr = r - 0.05) => vquad(mb, cyl((s - wd) / rr, rr, y), cyl((s + wd) / rr, rr, y), cyl((s + wd) / rr, rr, y + wd * 1.4), cyl((s - wd) / rr, rr, y + wd * 1.4), [c, c, c, c]);
      blotch(mb, r + 0.3, (s0 + s1) / 2 / r, 6, (s1 - s0) * 0.55, 7, '#1e2a36', P.sky(6));        // the city's glow
      for (let s = s0; s < s1; s += 3) vquad(mb, cyl(s / r, r, -3), cyl((s + 3) / r, r, -3), cyl((s + 3) / r, r, 4), cyl(s / r, r, 4), [dk, dk, pc, pc]);
      for (let s = s0 + 2; s < s1; s += 6 + R() * 3) beamS(mb, r + 0.05, s, yb, s, -2.8, 1.3, '#16181e');
      for (let s = s0 + 0.4; s < s1; s += 1.2) { dot(s, 3.2, 0.18, '#ffe2a0'); if (R() < 0.45) dot(s + 0.3, -2.2 + R() * 4.6, 0.14, '#f0c070'); }
      for (let i = 0; i < 20; i++) { const s = s0 + R() * (s1 - s0), w = 0.5 + R() * 1.4, h = 5 + R() * 5; block(s, w, 4, h, sh('#1c2028', R() * 0.2)); for (let k = 0; k < 3; k++) if (R() < 0.7) dot(s - w + 0.25 + R() * (2 * w - 0.5), 4.5 + R() * (h - 5.2), 0.12, R() < 0.7 ? '#f0d890' : '#90d8f0'); }
      const hq = -0.62 * r;
      block(hq, 1.3, 4, 20, '#2c3038'); block(hq, 0.8, 20, 23, '#262a30'); dot(hq, 23.3, 0.3, '#ff6040');
      for (let y = 5; y < 19.5; y += 1.1) for (let k = -2; k <= 2; k++) if (R() < 0.5) dot(hq + k * 0.45, y, 0.12, '#f4e0a0');
      for (const a of [-1.42, -1.05, -0.2, 0.14]) {
        const s = a * r;
        vquad(mb, cyl((s - 1.8) / r, r - 0.1, 4), cyl((s + 1.8) / r, r - 0.1, 4), cyl((s + 1.2) / r, r - 0.1, 11), cyl((s - 1.2) / r, r - 0.1, 11), ['#1a1e24', '#1a1e24', '#30343c', '#30343c']);
        for (const k of [-0.6, 0.6]) beamS(mb, r - 0.15, s + k, 10, s + k, 17 + R() * 2, 0.45, '#262a30');
        blotch(mb, r - 0.2, s / r, 11.5, 2.6, 1.6, '#6aff9a', P.sky(11.5)); dot(s, 6.5, 0.35, '#8affb0', r - 0.2);
      }
    },
  };
  function backdrop(d, R) {
    BR = d.br || 16.5; BH = BR * 0.97;
    const mb = new MB(), top = d.sky[0], bot = d.sky[1], low = d.void || bot, y0 = d.voidY || (d.void ? -12 : -2), n = 40;
    for (let s = 0; s < n; s++) {
      const a0 = s / n * TAU, a1 = (s + 1) / n * TAU;
      vquad(mb, cyl(a0, BR, y0), cyl(a1, BR, y0), cyl(a1, BR, YH), cyl(a0, BR, YH), [low, low, bot, bot]);
      vquad(mb, cyl(a0, BR, YH), cyl(a1, BR, YH), cyl(a1, BR, BH), cyl(a0, BR, BH), [bot, bot, top, top]);
    }
    const P = { top, bot, sky: (y) => U.mix(bot, top, U.clamp((y - YH) / (BH - YH), 0, 1)), far: U.mix(bot, d.ground[0], 0.35), near: U.mix(bot, d.ground[0], 0.6), mtn: d.mtn || U.mix(bot, '#4a5262', 0.6) };
    for (const k of d.back || []) BACK[k](mb, d, R, P);
    const out = mb.build({ unlit: true });
    BR = 16.5; BH = 16;
    return out;
  }

  // ------------------------------------------------------------------ keeping the view clear
  function viewOf(cam) {
    const e = cam.eye, t = cam.target, f0 = [t[0] - e[0], t[1] - e[1], t[2] - e[2]], fl = Math.hypot(f0[0], f0[1], f0[2]) || 1, f = f0.map(v => v / fl);
    const hl = Math.hypot(f[0], f[2]) || 1, r = [-f[2] / hl, 0, f[0] / hl];
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    return { e, f, r, u, t: Math.tan((cam.fov || 40) * Math.PI / 360), a: FF7.W / FF7.H };
  }
  const depthOf = (V, p) => (p[0] - V.e[0]) * V.f[0] + (p[1] - V.e[1]) * V.f[1] + (p[2] - V.e[2]) * V.f[2];
  // depth of the nearest fighter (the audit's occlusion measure uses the same rule)
  function nearest(V, subj, cam) {
    let d = 1e9;
    for (const s of subj || []) { const z = depthOf(V, s); if (z > 0.3 && z < d) d = z; }
    return d < 1e9 ? d : depthOf(V, cam.target);
  }
  // does a box cover part of the 3D view (above the command windows) in front of the nearest fighter?
  // Only the part of the box nearer than the fighter counts: the box is cut at that depth.
  const EDGES = []; for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) if (!(i & bit)) EDGES.push([i, i | bit]);
  function blocksView(bb, V, dmin) {
    const cut = dmin - 0.5, P = [], Z = [];
    for (let i = 0; i < 8; i++) {
      const q = [(i & 1 ? bb[3] : bb[0]) - V.e[0], (i & 2 ? bb[4] : bb[1]) - V.e[1], (i & 4 ? bb[5] : bb[2]) - V.e[2]];
      P.push(q); Z.push(q[0] * V.f[0] + q[1] * V.f[1] + q[2] * V.f[2]);
    }
    if (Math.min(...Z) >= cut || Math.max(...Z) < 0.15) return false;
    const near = [];
    for (let i = 0; i < 8; i++) if (Z[i] < cut) near.push(P[i]);
    for (const [a, b] of EDGES) if ((Z[a] < cut) !== (Z[b] < cut)) { const t = (cut - Z[a]) / (Z[b] - Z[a]); near.push([P[a][0] + (P[b][0] - P[a][0]) * t, P[a][1] + (P[b][1] - P[a][1]) * t, P[a][2] + (P[b][2] - P[a][2]) * t]); }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const q of near) {
      const z = Math.max(0.15, q[0] * V.f[0] + q[1] * V.f[1] + q[2] * V.f[2]);
      const sx = (q[0] * V.r[0] + q[2] * V.r[2]) / (z * V.t * V.a), sy = (q[0] * V.u[0] + q[1] * V.u[1] + q[2] * V.u[2]) / (z * V.t);
      if (sx < x0) x0 = sx; if (sx > x1) x1 = sx; if (sy < y0) y0 = sy; if (sy > y1) y1 = sy;
    }
    return x1 > -1.02 && x0 < 1.02 && y1 > -0.5 && y0 < 1.02;
  }
  let VIEWS = null;
  function views() {
    if (!VIEWS) VIEWS = (A.views ? A.views() : []).map(c => { const V = viewOf(c); V.dmin = nearest(V, c.subj, c); return V; });
    return VIEWS;
  }

  // ------------------------------------------------------------------ pieces
  function bboxOf(mbs) {
    const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (const m of mbs) if (m) for (let i = 0; i < m.P.length; i += 3) for (let k = 0; k < 3; k++) { if (m.P[i + k] < b[k]) b[k] = m.P[i + k]; if (m.P[i + k] > b[k + 3]) b[k + 3] = m.P[i + k]; }
    return b;
  }
  // o.add: MeshBuilder of soft additive glows (halos, light pools) drawn after the fighters with the piece;
  // o.scroll: { v, span, axis } - the piece slides along z (or axis) and wraps (scenery rushing past a
  // moving train, a facade sliding down past the elevator)
  const addMesh = (ad) => (ad && ad.vertexCount ? ad.build({ unlit: true, blend: 'add', cull: false }) : null);
  function piece(mb, gl, tex, o) {
    const bb = bboxOf([mb, gl]);
    return Object.assign({ mesh: mb.build({ tex }), glow: gl && gl.vertexCount ? gl.build({ unlit: true, tex }) : null, bb, cx: (bb[0] + bb[3]) / 2, cz: (bb[2] + bb[5]) / 2, cr: Math.hypot(bb[3] - bb[0], bb[5] - bb[2]) / 2, fade: null }, o, { add: addMesh(o && o.add) });
  }
  const overlaps = (bb, x0, x1, z0, z1) => bb[3] > x0 && bb[0] < x1 && bb[5] > z0 && bb[2] < z1;
  // a prop may stand here: out of the fight, inside the room, apart from the others, out of every view
  function clearSpot(c, bb, sep) {
    const tall = bb[4] > 0.3;
    if (tall ? overlaps(bb, -7.6, 6.6, -7.2, 7.2) : overlaps(bb, -6, 5, -5.4, 5.2)) return false;
    const rm = c.rm;
    if (rm && !(bb[0] > rm.x0 + 0.3 && bb[3] < rm.x1 - 0.3 && bb[2] > rm.z0 + 0.3 && bb[5] < rm.z1 - 0.3)) return false;
    if (c.cv && Math.max(Math.hypot(bb[0], bb[2]), Math.hypot(bb[3], bb[2]), Math.hypot(bb[0], bb[5]), Math.hypot(bb[3], bb[5])) > c.cv.r * 0.84) return false;
    if (c.d.deck && (bb[0] < -c.d.deck || bb[3] > c.d.deck)) return false;
    const cx = (bb[0] + bb[3]) / 2, cz = (bb[2] + bb[5]) / 2, cr = Math.hypot(bb[3] - bb[0], bb[5] - bb[2]) / 2;
    for (const q of c.pcs) if (!q.wall && Math.hypot(cx - q.cx, cz - q.cz) < (cr + q.cr) * 0.7 + sep) return false;
    if (tall) for (const V of views()) if (blocksView(bb, V, V.dmin)) return false;
    return true;
  }
  // try to add one prop built by fn(mb, gl) - returns false if its spot is not clear
  function place(c, sep, fn) {
    const mb = new MB(), gl = new MB(), ad = new MB();
    fn(mb, gl, ad);
    if (!mb.vertexCount && !gl.vertexCount) return false;
    const bb = bboxOf([mb, gl]);
    if (!clearSpot(c, bb, sep)) return false;
    c.pcs.push(piece(mb, gl, c.tex, { add: ad }));
    return true;
  }
  // up to n props at random spots r0..r1 from the centre; est [radius, height] pre-checks a spot
  // before the prop is built
  function scatter(c, n, r0, r1, sep, fn, est) {
    for (let i = 0; i < n; i++) for (let k = 0; k < 10; k++) {
      const a = c.R() * TAU, r = r0 + c.R() * (r1 - r0), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (est && !clearSpot(c, [x - est[0], 0, z - est[0], x + est[0], est[1], z + est[0]], sep)) continue;
      if (place(c, sep, (mb, gl, ad) => fn(mb, gl, x, z, c.R, ad))) break;
    }
  }
  const face = (mb, x, z, yaw) => { mb.push(); mb.translate(x, 0, z); mb.rotate(0, yaw, 0); };
  // ---- props
  const PROP = {
    pipes: (c) => scatter(c, 7, 8.5, 14.5, 0.6, (mb, gl, x, z, R) => {
      const h = 8 + R() * 5, col = sh('#6e6a50', R() * 0.2 - 0.1);
      tcyl(mb, x, 0, z, 0.5, 0.5, h, 8, col, REG.metal, 2); tcyl(mb, x, 0, z, 0.66, 0.66, 0.6, 8, sh(col, -0.25), REG.metal, 1);
      if (R() < 0.6) tcyl(mb, x + 0.95, 0, z + 0.3, 0.28, 0.28, h * 0.8, 6, sh(col, -0.1), REG.metal, 2);
      if (R() < 0.5) gl.box(x, 1.6 + R() * 2, z, 1.08, 0.16, 1.08, '#ffd060');
    }, [1.2, 12]),
    junk: (c) => scatter(c, 16, 7, 13.5, 0.1, (mb, gl, x, z, R) => {
      face(mb, x, z, R() * TAU); mb.rotate(R() * 0.4 - 0.2, 0, R() * 0.4 - 0.2);
      const wood = R() < 0.5; tbox(mb, 0, -0.1, 0, 0.6 + R() * 1.1, 0.35 + R() * 0.8, 0.6 + R() * 0.9, sh(wood ? '#7a6048' : '#6a6e70', R() * 0.24 - 0.12), wood ? REG.wood : REG.metal, 1);
      mb.pop();
    }, [0.8, 1]),
    // corrugated or plank shacks facing the fight
    shacks: (c) => scatter(c, 6, 10, 14.5, 1, (mb, gl, x, z, R) => {
      const w = 2.4 + R() * 1.6, h = 2 + R() * 1.4, dp = 2 + R() * 1.2, col = sh(c.d.shack || '#6a5a4a', R() * 0.2 - 0.1), rg = REG[c.d.shackTex || 'metal'];
      face(mb, x, z, Math.atan2(-x, -z) + (R() - 0.5) * 0.5);
      tbox(mb, 0, 0, 0, w, h, dp, col, rg, 1.2);
      mb.push(); mb.translate(0, h + 0.2, 0); mb.rotate(-0.2, 0, 0); tbox(mb, 0, -0.06, 0, w + 0.5, 0.12, dp + 0.7, sh(col, -0.3), REG.metal, 1.4); mb.pop();
      mb.quad([-0.4, 0, dp / 2 + 0.01], [0.4, 0, dp / 2 + 0.01], [0.4, 1.6, dp / 2 + 0.01], [-0.4, 1.6, dp / 2 + 0.01], '#1a1410');
      mb.pop();
    }, [2.2, 3.2]),
    // church pews in rows behind the enemies
    pews: (c) => { for (let row = 0; row < 2; row++) for (const x of [-5.2, 4.2]) place(c, 0, (mb) => { const z = -8.2 + row * 1.1; tbox(mb, x, 0, z, 3.4, 0.5, 0.45, '#5a3e24', REG.wood, 1.2); tbox(mb, x, 0.5, z - 0.2, 3.4, 0.55, 0.08, '#4a321c', REG.wood, 1.2); }); },
    // church: the fallen roof beam
    beam: (c) => { for (const [f, t] of [[[9.2, 0, -2], [9.6, 8, -7]], [[9.2, 0, -3], [9.6, 8, -8]], [[8.8, 0, -8.5], [9.6, 8, -4]]]) if (place(c, 0.5, (mb) => tube(mb, f, t, 0.6, 4, '#6e5a42', REG.wood, 2, true))) break; },
    // Train Graveyard: derelict cars
    trains: (c) => scatter(c, 5, 10, 14.5, 1.2, (mb, gl, x, z, R) => {
      face(mb, x, z, R() * TAU); mb.rotate(0, 0, (R() - 0.5) * 0.2);
      const col = sh(R() < 0.5 ? '#5a4a3a' : '#4a5a4a', R() * 0.1);
      tbox(mb, 0, 0, 0, 5.2, 2.4, 2.2, col, REG.metal, 1.5);
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const a = -2 + k * 1.2, b = a + 0.6, q = [[a, 1.2], [b, 1.2], [b, 1.9], [a, 1.9]].map(([x, y]) => [x * s, y, s * 1.11]); mb.quad(q[0], q[1], q[2], q[3], '#161a14'); }
      mb.pop();
    }, [2.8, 2.5]),
    // specimen pods: glowing tanks
    pods: (c) => scatter(c, 8, 7.8, 10.2, 0.5, (mb, gl, x, z, R) => { tcyl(mb, x, 0, z, 0.85, 0.85, 0.4, 10, '#505860', REG.metal, 2); tcyl(gl, x, 0.4, z, 0.7, 0.7, 2.4, 10, R() < 0.5 ? '#40d0a0' : '#50e0c0', REG.white); tcyl(mb, x, 2.8, z, 0.85, 0.6, 0.4, 10, '#505860', REG.metal, 2); }, [0.9, 3.2]),
    barrels: (c) => scatter(c, 8, 7.8, 12.5, 0.25, (mb, gl, x, z, R) => { const col = R() < 0.5 ? '#7a4a2a' : '#3a5a7a'; tcyl(mb, x, 0, z, 0.42, 0.42, 1.15, 8, col, REG.metal, 2); tcyl(mb, x, 0.35, z, 0.44, 0.44, 0.08, 8, sh(col, -0.3), REG.metal, 2); tcyl(mb, x, 0.8, z, 0.44, 0.44, 0.08, 8, sh(col, -0.3), REG.metal, 2); }, [0.45, 1.2]),
    crates: (c) => scatter(c, 10, 7.8, 12.5, 0.2, (mb, gl, x, z, R) => { const s = 0.9 + R() * 0.5; face(mb, x, z, R() * 0.5); tbox(mb, 0, 0, 0, s, s, s, '#8a6a40', REG.wood, s); if (R() < 0.4) tbox(mb, 0.1, s, 0.05, s * 0.8, s * 0.8, s * 0.8, '#7a5c36', REG.wood, s); mb.pop(); }, [0.7, 1.4]),
    rocks: (c) => scatter(c, 10, 8, 14.5, 0.4, (mb, gl, x, z, R) => { const g = c.d.ground[0], s = 0.6 + R() * 1.4; mb.sphere(x, s * 0.2, z, s * (1 + R() * 0.5), s * (0.5 + R() * 0.5), s * (1 + R() * 0.5), sh(g, -0.25 + R() * 0.15), 7, 4, false, (i, j) => sh(g, -0.3 + U.hash(i, j, 3) * 0.2)); }, [1.5, 1]),
    palms: (c) => scatter(c, 6, 9, 14.5, 1, (mb, gl, x, z, R) => {
      const lean = (R() - 0.5) * 0.5, h = 4.2 + R() * 1.5;
      face(mb, x, z, R() * TAU); mb.rotate(lean, 0, 0.12);
      tcyl(mb, 0, 0, 0, 0.2, 0.13, h, 6, '#8a6a3a', REG.bark, 1);
      for (let k = 0; k < 7; k++) mb.spike([0, h, 0], [Math.cos(k * 0.9), -0.35, Math.sin(k * 0.9)], 2 + R() * 0.4, 0.26, 3, sh('#3a7a2a', R() * 0.15));
      mb.pop();
    }, [2.2, 5]),
    pines: (c) => scatter(c, 12, 10, 14.5, 0.8, (mb, gl, x, z, R) => { const h = 3.5 + R() * 3; tcyl(mb, x, 0, z, 0.22, 0.16, h * 0.4, 6, '#5a3a20', REG.bark, 1); for (let k = 0; k < 3; k++) mb.prism(x, h * (0.3 + k * 0.2), z, 1.5 - k * 0.38, 0, h * 0.45, 7, sh('#2a5040', R() * 0.1 - k * 0.04)); }, [1.5, 6]),
    // broadleaf jungle trees: thick trunk, clumps of canopy
    broadleaf: (c) => scatter(c, 8, 10, 14.5, 1, (mb, gl, x, z, R) => {
      const h = 5 + R() * 3, t = c.d.trees || '#2a4a1e';
      tcyl(mb, x, 0, z, 0.7, 0.45, h, 8, '#5a4632', REG.bark, 2);
      for (let k = 0; k < 4; k++) mb.spike([x, 0, z], [Math.cos(k * 1.6) , 0.4, Math.sin(k * 1.6)], 1.2, 0.3, 4, '#4a3a28');
      for (let k = 0; k < 3; k++) { const a = R() * TAU; mb.sphere(x + Math.cos(a) * 1.2, h + R() * 1.2, z + Math.sin(a) * 1.2, 2 + R() * 0.8, 1.3 + R() * 0.5, 2 + R() * 0.8, sh(t, 0.1 + R() * 0.15), 8, 5, true); }
    }, [2.8, 8]),
    bushes: (c) => scatter(c, 14, 8.5, 13.5, 0.3, (mb, gl, x, z, R) => { const t = c.d.trees || '#2e5a22'; for (let k = 0; k < 3; k++) mb.sphere(x + (R() - 0.5) * 1.2, 0.5, z + (R() - 0.5) * 1.2, 0.9 + R() * 0.5, 0.7 + R() * 0.4, 0.9 + R() * 0.5, sh(t, 0.15 + R() * 0.2), 7, 4, true); }, [1.4, 1.1]),
    // Ancient Forest: huge trunks rising out of view
    trunks: (c) => scatter(c, 8, 10, 14.5, 1.5, (mb, gl, x, z, R) => { const r = 1 + R() * 0.8; tcyl(mb, x, 0, z, r, r * 0.8, 16, 9, '#4a3c2c', REG.bark, 3); for (let k = 0; k < 5; k++) mb.spike([x, 0.1, z], [Math.cos(k * 1.3 + R()), 0.25, Math.sin(k * 1.3 + R())], r * 1.6, r * 0.4, 4, '#3e3226'); }, [2.2, 16]),
    deadtree: (c) => scatter(c, 2, 10, 14, 2, (mb, gl, x, z, R) => { tcyl(mb, x, 0, z, 0.35, 0.18, 5, 6, '#3a3430', REG.bark, 1); for (let k = 0; k < 5; k++) mb.spike([x, 2.5 + k * 0.5, z], [Math.cos(k * 2.1), 0.8, Math.sin(k * 2.1)], 1.5 + R(), 0.1, 3, '#3a3430'); }, [2, 5.5]),
    reeds: (c) => scatter(c, 22, 7, 13.5, 0.2, (mb, gl, x, z, R) => { for (let k = 0; k < 6; k++) mb.spike([x + (R() - 0.5) * 0.8, 0, z + (R() - 0.5) * 0.8], [R() - 0.5, 3, R() - 0.5], 0.8 + R() * 0.6, 0.05, 3, sh('#6a7a40', R() * 0.2 - 0.1)); }, [0.5, 1.3]),
    crystals: (c) => scatter(c, 8, 8.5, 13, 0.5, (mb, gl, x, z, R) => { const col = c.d.crystal || '#60c0f0'; for (let k = 0; k < 4; k++) gl.spike([x + (R() - 0.5), 0, z + (R() - 0.5)], [R() - 0.5, 1.6, R() - 0.5], 1.2 + R() * 2.2, 0.28, 5, sh(col, R() * 0.2 - 0.1)); mb.sphere(x, 0, z, 1, 0.4, 1, sh(c.d.ground[0], -0.2), 6, 3, false); }, [1.2, 3]),
    mesas: (c) => scatter(c, 5, 11, 14.5, 2, (mb, gl, x, z, R) => { const h = 3 + R() * 4; tcyl(mb, x, 0, z, 2 + R() * 1.5, 1.6 + R(), h, 7, sh('#a0603a', R() * 0.15 - 0.07), REG.rock, 2); }, [3, 6]),
    cactus: (c) => scatter(c, 6, 8.5, 13.5, 1, (mb, gl, x, z, R) => { const h = 2 + R() * 1.4, g = '#4a7a3a'; tcyl(mb, x, 0, z, 0.24, 0.2, h, 7, g, REG.bark, 2); for (const s of [-1, 1]) if (R() < 0.8) { const y = 0.8 + R() * 0.6; mb.prism(x + s * 0.2, y, z, 0.14, 0.14, 0.12, 6, g); mb.push(); mb.translate(x + s * 0.4, y, z); mb.rotate(0, 0, -s * Math.PI / 2); mb.prism(0, -0.2, 0, 0.15, 0.15, 0.4, 6, g); mb.pop(); mb.prism(x + s * 0.55, y, z, 0.15, 0.12, 0.8 + R() * 0.6, 6, g); } }, [0.7, 3]),
    houses: (c) => scatter(c, 5, 10.5, 14.5, 1.5, (mb, gl, x, z, R) => { face(mb, x, z, Math.atan2(-x, -z)); tbox(mb, 0, 0, 0, 3, 2.4, 3, '#b0a080', REG.brick, 1.2); mb.frustum(0, 2.4, 0, 3.4, 3.4, 0.2, 3.4, 1.3, '#7a3020'); mb.quad([-0.4, 0, 1.51], [0.4, 0, 1.51], [0.4, 1.5, 1.51], [-0.4, 1.5, 1.51], '#2a1c14'); mb.pop(); }, [2.2, 3.7]),
    // Nibelheim's water tower
    watertower: (c) => { for (const [x, z] of [[12, -3], [-9.5, -10], [9.5, -9.5]]) if (place(c, 1, (mb) => { for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) tbox(mb, x + dx, 0, z + dz, 0.25, 5, 0.25, '#5a4632', REG.wood, 1); tcyl(mb, x, 5, z, 1.6, 1.6, 2.2, 10, '#6a5438', REG.wood, 3); mb.prism(x, 7.2, z, 1.8, 0, 1.2, 10, '#4a3a30'); })) break; },
    // Rocket Town: Cid's green house behind the enemies
    house: (c) => { for (const [x, z, yaw] of [[12, -1.5, -Math.PI / 2], [-3, -10.5, 0], [3, -10.5, 0]]) if (place(c, 1, (mb) => { face(mb, x, z, yaw); tbox(mb, 0, 0, 0, 5, 3.2, 3.2, '#5a7a4a', REG.wood, 1.2); mb.frustum(0, 3.2, 0, 5.6, 3.8, 0.2, 3.8, 1.6, '#6a3a2a'); for (const wx of [-1.4, 1.4]) mb.quad([wx - 0.5, 1.2, 1.61], [wx + 0.5, 1.2, 1.61], [wx + 0.5, 2.3, 1.61], [wx - 0.5, 2.3, 1.61], '#e8e8e0'); mb.pop(); })) break; },
    // the Tiny Bronco
    bronco: (c) => { for (const [x, z, yaw] of [[10.5, -6, -2], [-7.5, -8.5, 0.4], [7.8, -8.6, 0.4]]) if (place(c, 1, (mb) => { face(mb, x, z, yaw); const r = '#c85048', w = '#e8e4dc'; mb.push(); mb.rotate(0.12, 0, 0); tbox(mb, 0, 0.9, 0, 0.9, 0.9, 4.2, r, REG.metal, 1.5); mb.pop(); tbox(mb, 0, 1.3, 0.6, 6, 0.12, 1.1, w, REG.metal, 2); tbox(mb, 0, 1.2, -1.9, 2.2, 0.1, 0.6, w, REG.metal, 2); tbox(mb, 0, 1.3, -1.9, 0.1, 1, 0.6, r, REG.metal, 1); mb.box(0, 1.35, 2.2, 1.8, 0.12, 0.12, '#303030'); for (const s of [-1, 1]) mb.prism(s * 0.9, 0, 0.9, 0.18, 0.18, 1.2, 6, '#303030'); mb.pop(); })) break; },
    // Rocket Town: a white picket fence behind the enemies
    picket: (c) => { place(c, 0, (mb) => { const x = 9.4; for (let z = -8; z <= 0.5; z += 0.4) mb.box(x, 0.55, z, 0.05, 1.1, 0.12, '#e8e8e0'); for (const y of [0.35, 0.85]) mb.box(x + 0.06, y, -3.75, 0.04, 0.08, 8.7, '#d8d8d0'); }); place(c, 0, (mb) => { const z = -9.2; for (let x = -10; x <= 8; x += 0.4) mb.box(x, 0.55, z, 0.12, 1.1, 0.05, '#e8e8e0'); for (const y of [0.35, 0.85]) mb.box(-1, y, z - 0.06, 18.2, 0.08, 0.04, '#d8d8d0'); }); },
    pagoda: (c) => scatter(c, 2, 11.5, 14.5, 3, (mb, gl, x, z, R) => { for (let k = 0; k < 4; k++) { const s = 3 - k * 0.55; tbox(mb, x, k * 2, z, s, 1.8, s, '#b04030', REG.wood, 1.2); mb.frustum(x, 1.8 + k * 2, z, s + 1.2, s + 1.2, 0.3, 0.3, 0.7, '#2c2c30'); } mb.prism(x, 8.5, z, 0.08, 0.08, 1.4, 5, '#2c2c30'); }, [2.4, 9]),
    torii: (c) => scatter(c, 2, 9.5, 13.5, 2, (mb, gl, x, z, R) => { face(mb, x, z, Math.atan2(-x, -z)); for (const s of [-1.3, 1.3]) tcyl(mb, s, 0, 0, 0.2, 0.18, 3.6, 8, '#c03020', REG.wood, 1); tbox(mb, 0, 3.6, 0, 4, 0.3, 0.4, '#2a2a2a', REG.wood, 1); tbox(mb, 0, 2.9, 0, 3.2, 0.2, 0.25, '#c03020', REG.wood, 1); mb.pop(); }, [2, 3.9]),
    lanterns: (c) => scatter(c, 6, 8, 12.5, 0.4, (mb, gl, x, z, R) => { tbox(mb, x, 0, z, 0.6, 0.3, 0.6, '#8a8a80', REG.rock, 1); tbox(mb, x, 0.3, z, 0.2, 0.8, 0.2, '#8a8a80', REG.rock, 1); gl.box(x, 1.3, z, 0.4, 0.4, 0.4, '#ffd080'); mb.frustum(x, 1.5, z, 0.8, 0.8, 0.1, 0.1, 0.35, '#6a6a62'); }, [0.4, 1.8]),
    // Bone Village: giant ribs
    bones: (c) => scatter(c, 6, 9, 14.5, 1, (mb, gl, x, z, R) => { const yaw = R() * TAU; for (let k = 0; k < 3; k++) { face(mb, x + Math.cos(yaw) * k * 0.9, z + Math.sin(yaw) * k * 0.9, yaw); for (let j = 0; j < 5; j++) { mb.push(); mb.translate(Math.sin(j * 0.35) * 1.4, j * 0.75, 0); mb.rotate(0, 0, -0.35 * j); mb.prism(0, 0, 0, 0.16 - j * 0.02, 0.14 - j * 0.02, 0.85, 6, '#e0d8c0'); mb.pop(); } mb.pop(); } }, [1.8, 3.5]),
    tents: (c) => scatter(c, 4, 9, 13.5, 1.5, (mb, gl, x, z, R) => { mb.prism(x, 0, z, 1.6 + R() * 0.6, 0, 2 + R() * 0.6, 4, sh('#c8b890', R() * 0.1)); }, [2, 2.4]),
    lamps: (c) => scatter(c, 5, 8, 12.5, 0.5, (mb, gl, x, z, R) => { mb.prism(x, 0, z, 0.06, 0.06, 3, 6, '#303038'); gl.box(x, 3.05, z, 0.3, 0.25, 0.3, '#fff0b0'); }, [0.2, 3.2]),
    shells: (c) => scatter(c, 6, 10, 14.5, 1.5, (mb, gl, x, z, R) => { const r = 1.6 + R() * 1.2; mb.sphere(x, 0, z, r, r * 1.5, r, sh('#c0c8d0', R() * 0.1), 10, 6, true, null, 3); tcyl(mb, x, 0, z, r * 1.02, r * 0.3, r * 1.6, 10, '#d8dee6', REG.rock, 2); }, [2.4, 4.5]),
    ice: (c) => scatter(c, 10, 9, 14.5, 0.5, (mb, gl, x, z, R) => { for (let k = 0; k < 3; k++) mb.spike([x + (R() - 0.5), 0, z + (R() - 0.5)], [R() - 0.5, 1.5, R() - 0.5], 1.5 + R() * 2.5, 0.5, 5, sh('#b8d8f0', R() * 0.2)); }, [1.2, 3.5]),
    hills: (c) => scatter(c, 8, 12, 15, 2, (mb, gl, x, z, R) => { mb.sphere(x, 0, z, 3 + R() * 3, 1.2 + R() * 2, 3 + R() * 3, sh(c.d.ground[0], -0.08 + R() * 0.1), 9, 4, true, null, 3); }, [4.5, 2.5]),
    // sea floor: lumpy rocks crusted with coral and sponges
    reefrocks: (c) => scatter(c, 12, 8, 15, 0.4, (mb, gl, x, z, R) => {
      const s = 0.7 + R() * 1.6, k = Math.floor(R() * 1e4);
      boulder(mb, x, -0.15, z, s * (1 + R() * 0.5), s * (0.55 + R() * 0.5), s * (1 + R() * 0.5), sh('#4a6a6a', R() * 0.14 - 0.07), k);
      if (R() < 0.6) for (let i = 0; i < 3; i++) mb.spike([x + (R() - 0.5) * s, s * 0.6, z + (R() - 0.5) * s], [R() - 0.5, 1.2, R() - 0.5], 0.4 + R() * 0.6, 0.1, 4, ['#e0704a', '#e878a8', '#9a68d0'][i]);
    }, [2, 1.8]),
    // coral clusters: branching coral, sea fans, brain coral, tube sponges
    coral: (c) => scatter(c, 14, 7.8, 14, 0.3, (mb, gl, x, z, R) => {
      const kind = Math.floor(R() * 4), col = ['#e0704a', '#e070a0', '#9a68d0', '#d8b050', '#60b0a0'][Math.floor(R() * 5)];
      if (kind === 0) for (let i = 0; i < 6; i++) { const b = [x + (R() - 0.5) * 0.6, 0, z + (R() - 0.5) * 0.6], dir = [R() - 0.5, 1.4, R() - 0.5], l = 0.8 + R() * 0.9; mb.spike(b, dir, l, 0.1, 4, sh(col, R() * 0.2 - 0.1)); const t = L3(b, [b[0] + dir[0], b[1] + dir[1] * l * 0.5, b[2] + dir[2]], 0.6); mb.spike(t, [dir[0] * 2 + R() - 0.5, 1, dir[2] * 2 + R() - 0.5], l * 0.5, 0.06, 4, sh(col, 0.1)); }
      else if (kind === 1) { face(mb, x, z, R() * TAU); mb.sphere(0, 0.75, 0, 0.55 + R() * 0.3, 0.6 + R() * 0.25, 0.08, sh(col, -0.05), 7, 4, false); mb.prism(0, 0, 0, 0.08, 0.06, 0.4, 4, sh(col, -0.3)); mb.pop(); }
      else if (kind === 2) mb.sphere(x, 0, z, 0.7 + R() * 0.4, 0.5 + R() * 0.3, 0.7 + R() * 0.4, sh('#c8c070', R() * 0.15), 8, 4, true, (i, j) => sh('#c8c070', (U.hash(i, j, 7) - 0.5) * 0.25), 3);
      else for (let i = 0; i < 4; i++) { const px = x + (R() - 0.5) * 0.9, pz = z + (R() - 0.5) * 0.9, h = 0.6 + R() * 1.1; tcyl(mb, px, 0, pz, 0.2, 0.26, h, 6, sh(col, R() * 0.15), REG.rock, 1); tcyl(gl, px, h - 0.02, pz, 0.18, 0.18, 0.03, 6, sh(col, -0.6), REG.white); }
    }, [1, 2.1]),
    // kelp: tall swaying strands at the back
    kelp: (c) => scatter(c, 9, 10, 15, 0.6, (mb, gl, x, z, R) => {
      for (let k = 0; k < 3; k++) {
        let px = x + (R() - 0.5) * 1.2, pz = z + (R() - 0.5) * 1.2, y = 0; const n = 6 + Math.floor(R() * 4), yaw = R() * TAU, col = sh('#4a6a2a', R() * 0.2 - 0.1);
        for (let i = 0; i < n; i++) { const dx = Math.sin(i * 0.9 + k) * 0.25, h = 0.8 + R() * 0.2; face(mb, px + dx, pz, yaw); mb.rotate(0, 0, dx * 0.4); tbox(mb, 0, y, 0, 0.34 - i * 0.015, h, 0.05, sh(col, i * 0.03), REG.leaf, 1); mb.pop(); y += h * 0.96; }
      }
    }, [1.2, 9]),
    // Shinra HQ roof: the lift tower rising at the far edge behind the party (FF7's pale wall at the right
    // of the side-on shot) - a wall piece, cut away while the camera is beyond it
    housing: (c) => {
      const mb = new MB(), gl = new MB(), ad = new MB(), n = [-1, 0], p0 = [10.4, 1.2], W = wallFrame(p0, [n[1], -n[0]], n);
      wbox(mb, W, 0, 9, 0, 13, 0, 1, '#ffffff', REG.wall, 2.6);
      wbox(mb, W, 5.2, 7.2, 0, 2.6, 1, 1.15, '#2a3034', REG.metal, 2);
      for (let y = 4; y < 12.5; y += 2.2) wpanel(gl, W, 0.8, 8.2, y, y + 0.28, 1.02, '#9ad8e8');
      wbox(gl, W, 1.2, 1.6, 13, 13.4, 0.3, 0.7, '#ff3020');
      glowBall(ad, W(1.4, 13.2, 0.5), 1, '#ff3020', 0.45);
      c.pcs.push(piece(mb, gl, c.tex, { wall: true, n, p: p0, add: ad }));
    },
    // the Forgotten Capital's altar: round stone pillars standing in the water
    columns: (c) => scatter(c, 6, 12, 15, 1.5, (mb, gl, x, z, R) => { const h = 7 + R() * 5, col = sh('#b4c0ca', R() * 0.1 - 0.05); tcyl(mb, x, -0.6, z, 0.95, 0.95, 0.6, 10, sh(col, -0.1), REG.rock, 3); tcyl(mb, x, 0, z, 0.7, 0.62, h, 10, col, REG.rock, 3); tcyl(mb, x, h, z, 0.85, 0.85, 0.5, 10, sh(col, 0.05), REG.rock, 3); }, [1, 12]),
    // Junon: steel lattice towers
    lattice: (c) => scatter(c, 3, 11, 14.5, 2, (mb, gl, x, z, R) => { const h = 7 + R() * 4; for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]]) tbox(mb, x + dx, 0, z + dz, 0.18, h, 0.18, '#3a302a', REG.metal, 1.5); for (let y = 1; y < h; y += 1.6) { tbox(mb, x, y, z - 0.8, 1.7, 0.12, 0.12, '#3a302a', REG.metal, 2); tbox(mb, x, y, z + 0.8, 1.7, 0.12, 0.12, '#3a302a', REG.metal, 2); tbox(mb, x - 0.8, y, z, 0.12, 0.12, 1.7, '#3a302a', REG.metal, 2); tbox(mb, x + 0.8, y, z, 0.12, 0.12, 1.7, '#3a302a', REG.metal, 2); } }, [0.9, 10]),
  };

  // ---- room walls, fences, cave walls: one piece per side, drawn while the camera is inside it
  // wall-local frame: u along the wall (left to right seen from inside), y up, v into the room
  const wallFrame = (p0, rt, n) => (u, y, v) => [p0[0] + rt[0] * u + n[0] * v, y, p0[1] + rt[1] * u + n[1] * v];
  // box against a wall: u0..u1 along it, y0..y1, v0..v1 out from it (front, top, sides)
  function wbox(mb, W, u0, u1, y0, y1, v0, v1, col, rg = REG.white, ts = 1.5, bottom) {
    tquad(mb, W(u0, y0, v1), W(u1, y0, v1), W(u1, y1, v1), W(u0, y1, v1), col, rg, ts);
    tquad(mb, W(u0, y1, v1), W(u1, y1, v1), W(u1, y1, v0), W(u0, y1, v0), sh(col, 0.08), rg, ts);
    tquad(mb, W(u1, y0, v1), W(u1, y0, v0), W(u1, y1, v0), W(u1, y1, v1), sh(col, -0.1), rg, ts);
    tquad(mb, W(u0, y0, v0), W(u0, y0, v1), W(u0, y1, v1), W(u0, y1, v0), sh(col, -0.1), rg, ts);
    if (bottom) tquad(mb, W(u0, y0, v0), W(u1, y0, v0), W(u1, y0, v1), W(u0, y0, v1), sh(col, -0.2), rg, ts);
  }
  // flat panel lying on the wall (windows, openings, banners)
  // col: one colour or four (bottom-left, bottom-right, top-right, top-left)
  const wpanel = (mb, W, u0, u1, y0, y1, v, col, uvs) => (Array.isArray(col) ? vquad(mb, W(u0, y0, v), W(u1, y0, v), W(u1, y1, v), W(u0, y1, v), col, uvs) : mb.quad(W(u0, y0, v), W(u1, y0, v), W(u1, y1, v), W(u0, y1, v), col, uvs));
  const RDECO = {
    pilasters(w) { const e = w.rm.every || 4.5, col = w.rm.pc || '#8a8a8a', rg = REG[w.rm.pr || 'white']; for (let u = e; u < w.len - 1; u += e) wbox(w.mb, w.W, u - 0.45, u + 0.45, 0, w.h, 0, 0.45, col, rg, 1.2); },
    // vertical pipes and a horizontal duct
    pipes(w) {
      const R = w.R;
      for (let u = 1 + R() * 2; u < w.len - 1; u += 2.5 + R() * 3) { const r = 0.2 + R() * 0.22, p = w.W(u, 0, r + 0.05); tcyl(w.mb, p[0], 0, p[2], r, r, w.h, 6, sh('#6a6a62', R() * 0.2 - 0.1), REG.metal, 2); }
      const y = 2.5 + R() * 3; wbox(w.mb, w.W, 0, w.len, y, y + 0.45, 0, 0.5, '#5a5a54', REG.metal, 2, true);
    },
    // wall lamps
    lamps(w) { for (let u = 2.5; u < w.len - 1; u += 5) { wbox(w.mb, w.W, u - 0.15, u + 0.15, 3.6, 4.4, 0, 0.3, '#303030'); wbox(w.gl, w.W, u - 0.25, u + 0.25, 4.4, 4.7, 0.05, 0.4, '#ffe0a0'); } },
    // Shinra HQ: metal doors with a red light
    doors(w) { if (w.side > 1) return; const u = w.len / 2; wbox(w.mb, w.W, u - 1.3, u + 1.3, 0, 3.4, 0, 0.25, '#8a8a90', REG.metal, 1.2); wpanel(w.mb, w.W, u - 1.0, u + 1.0, 0, 3.1, 0.27, '#6a6c74', FULL(REG.metal)); wbox(w.gl, w.W, u - 0.5, u + 0.5, 3.5, 3.75, 0, 0.2, '#ff3020'); },
    // church: stained-glass windows high on the back and far walls
    window(w) {
      if (w.side > 1) return;
      const u0 = w.len / 2 - 1.6, cols = ['#f0c040', '#e09030', '#80c050', '#f0e080', '#c07030'];
      for (let i = 0; i < 6; i++) for (let j = 0; j < 7; j++) { const c = cols[(i * 3 + j * 7) % cols.length]; wpanel(w.gl, w.W, u0 + i * 0.54 + 0.05, u0 + (i + 1) * 0.54 - 0.05, 4 + j * 0.64 + 0.05, 4 + (j + 1) * 0.64 - 0.05, 0.03, c); }
      wbox(w.mb, w.W, u0 - 0.3, u0 + 3.54, 3.7, 4, 0, 0.3, '#3a3028'); wbox(w.mb, w.W, u0 - 0.3, u0 + 3.54, 8.5, 8.8, 0, 0.3, '#3a3028');
    },
    tapestry(w) { if (w.side === 0) return; for (let u = 2.5; u < w.len - 2; u += 5) { wpanel(w.mb, w.W, u - 0.8, u + 0.8, 3, 7.5, 0.05, ['#4a2a18', '#4a2a18', '#7a2418', '#7a2418']); wbox(w.mb, w.W, u - 1, u + 1, 7.5, 7.7, 0, 0.12, '#6a5a30'); } },
    // sewer: tunnel arches with grates, square vents
    arches(w) {
      if (w.side === 2) return;
      const u = w.len / 2, r = 1.8, n = 10, dark = '#040604';
      wpanel(w.mb, w.W, u - r, u + r, 0, 2.2, 0.02, dark);
      for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI, a1 = (i + 1) / n * Math.PI; w.mb.tri(w.W(u, 2.2, 0.02), w.W(u + Math.cos(a0) * r, 2.2 + Math.sin(a0) * r, 0.02), w.W(u + Math.cos(a1) * r, 2.2 + Math.sin(a1) * r, 0.02), dark); }
      for (let k = -3; k <= 3; k++) wbox(w.mb, w.W, u + k * 0.5 - 0.05, u + k * 0.5 + 0.05, 0, 2.2 + Math.sqrt(Math.max(0, r * r - k * k * 0.25)) - 0.1, 0.02, 0.12, '#2a2a26');
      for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI, a1 = (i + 1) / n * Math.PI; wbox(w.mb, w.W, u + Math.cos(a1) * (r + 0.3), u + Math.cos(a0) * (r + 0.3), 2.2 + Math.sin(a0) * (r + 0.05), 2.2 + Math.sin(a0) * (r + 0.4), 0, 0.2, '#3a4234', REG.brick); }
    },
    grates(w) { for (let u = 3; u < w.len - 2; u += 6) { if (Math.abs(u - w.len / 2) < 2.6 && w.side !== 2) continue; wpanel(w.mb, w.W, u - 0.5, u + 0.5, 3.4, 4.2, 0.02, '#0a0c08'); for (let k = 0; k < 4; k++) wbox(w.mb, w.W, u - 0.5, u + 0.5, 3.45 + k * 0.2, 3.52 + k * 0.2, 0.02, 0.08, '#3a3a34'); } },
    // temple: vines hanging from the top of the walls
    vines(w) { const R = w.R; for (let u = 0.5; u < w.len - 0.5; u += 0.5 + R() * 1.6) { if (R() < 0.35) continue; const l = 2 + R() * 5; wbox(w.mb, w.W, u, u + 0.25 + R() * 0.5, w.h - l, w.h, 0.02, 0.1 + R() * 0.08, sh('#3a5a2a', R() * 0.2 - 0.1), REG.leaf, 1); } },
    // Battle Square: the portcullis behind the enemies (and on the far wall of the side-on shots)
    portcullis(w) {
      if (w.side > 1) return;
      const u = w.len / 2, r = 2.2;
      wpanel(w.mb, w.W, u - r, u + r, 0, 3.6, 0.02, '#050303');
      for (let i = 0; i < 10; i++) { const a0 = i / 10 * Math.PI, a1 = (i + 1) / 10 * Math.PI; w.mb.tri(w.W(u, 3.6, 0.02), w.W(u + Math.cos(a0) * r, 3.6 + Math.sin(a0) * r, 0.02), w.W(u + Math.cos(a1) * r, 3.6 + Math.sin(a1) * r, 0.02), '#050303'); }
      for (let k = -4; k <= 4; k++) wbox(w.mb, w.W, u + k * 0.45 - 0.06, u + k * 0.45 + 0.06, 0, 3.6 + Math.sqrt(Math.max(0, r * r - k * k * 0.2)) - 0.15, 0.04, 0.16, '#2a2622');
      for (let y = 0.6; y < 5.4; y += 0.9) wbox(w.mb, w.W, u - r + 0.1, u + r - 0.1, y, y + 0.1, 0.1, 0.2, '#2a2622');
      wbox(w.mb, w.W, u - r - 0.5, u + r + 0.5, 5.9, 6.4, 0, 0.35, '#3a302a', REG.rock);
    },
    // Battle Square: chains hanging from the dark above
    chains(w) {
      const R = w.R;
      for (let u = 2 + R() * 2; u < w.len - 1.5; u += 4 + R() * 3) {
        const p = w.W(u, 0, 1 + R() * 0.8), low = 3 + R() * 3;
        for (let y = w.h, k = 0; y > low; y -= 0.42, k++) w.mb.box(p[0], y, p[2], k % 2 ? 0.08 : 0.3, 0.46, k % 2 ? 0.3 : 0.08, '#6a5e54');
      }
    },
    // underwater reactor: yellow-black hazard columns
    hazard(w) { for (let u = 3; u < w.len - 1; u += 6) wbox(w.mb, w.W, u - 0.5, u + 0.5, 0, w.h, 0, 0.8, '#ffffff', REG.deco, 1); },
    // underwater reactor: orange machinery against the walls
    machines(w) { const R = w.R; for (let u = 1.5 + R() * 2; u < w.len - 2; u += 5 + R() * 3) { const hh = 2.5 + R() * 2; wbox(w.mb, w.W, u - 1.2, u + 1.2, 0, hh, 0, 1.3, '#d06a20', REG.metal, 1.2); wbox(w.mb, w.W, u - 0.9, u + 0.9, hh, hh + 0.4, 0.2, 1.1, '#7a7a80', REG.metal, 1); } },
    // lab: the big specimen tank on the back wall
    tank(w) {
      if (w.side !== 0) return;
      const p = w.W(w.len / 2, 0, 2.4);
      tcyl(w.mb, p[0], 0, p[2], 2.2, 2.2, 0.8, 12, '#4a5058', REG.metal, 3); tcyl(w.gl, p[0], 0.8, p[2], 1.9, 1.9, 4.2, 12, '#50a0a8', REG.white); tcyl(w.mb, p[0], 5, p[2], 2.2, 1.6, 0.9, 12, '#4a5058', REG.metal, 3);
    },
    // ship hold: frames and a ledge
    ribs(w) { for (let u = 2; u < w.len - 1; u += 3) wbox(w.mb, w.W, u - 0.18, u + 0.18, 0, w.h, 0, 0.5, '#4a5054', REG.metal, 1.5); wbox(w.mb, w.W, 0, w.len, 5.4, 5.8, 0, 0.9, '#40464a', REG.metal, 2, true); },
    // mansion: a gallery balustrade across the back wall
    balustrade(w) {
      if (w.side !== 0) return;
      wbox(w.mb, w.W, 0, w.len, 3.1, 3.4, 0, 1.6, '#4a3426', REG.wood, 2, true);
      for (let u = 0.3; u < w.len; u += 0.45) wbox(w.mb, w.W, u - 0.07, u + 0.07, 3.4, 4.3, 1.45, 1.58, '#6a5040', REG.wood, 1);
      wbox(w.mb, w.W, 0, w.len, 4.3, 4.45, 1.4, 1.62, '#5a4232', REG.wood, 2);
    },
    // Corneo's hall: lacquered posts and a top beam
    posts(w) { for (let u = 0; u <= w.len + 0.01; u += w.rm.tw) wbox(w.mb, w.W, Math.max(0, u - 0.3), Math.min(w.len, u + 0.3), 0, w.h, 0, 0.35, '#b02a1c'); wbox(w.mb, w.W, 0, w.len, w.h - 0.6, w.h, 0, 0.45, '#8a1c12'); },
    // caves: stalactites and stalagmites along the wall
    stalag(w) { const R = w.R, g = w.d.ground[0]; for (let u = 0.8; u < w.len - 0.5; u += 1 + R() * 1.6) { w.mb.spike(w.W(u, w.h, 0.8 + R() * 0.6), [0, -1, 0], 2 + R() * 3, 0.35 + R() * 0.25, 5, sh(g, -0.15)); if (R() < 0.5) w.mb.spike(w.W(u + 0.4, 0, 0.6 + R() * 0.5), [R() - 0.5, 3, R() - 0.5], 1 + R() * 1.8, 0.3 + R() * 0.2, 5, sh(g, -0.05)); } },
    // glowing crystal clusters at the foot of the wall
    crystals(w) { const R = w.R, col = w.d.crystal || '#60c0f0'; for (let u = 1; u < w.len - 0.5; u += 1.5 + R() * 2) for (let k = 0; k < 3; k++) w.gl.spike(w.W(u + (R() - 0.5), 0, 0.5 + R() * 0.6), [R() - 0.5, 1.5, 0.3 + R() * 0.3], 1 + R() * 2.4, 0.22 + R() * 0.12, 5, sh(col, R() * 0.25 - 0.1)); },
    // Jenova SYNTHESIS: jagged spires along the foot of the wall and hanging from above, glowing shards among them
    spires(w) {
      const R = w.R, g = w.d.ground[0], cr = w.d.crystal || '#c070ff';
      for (let u = 0.6; u < w.len - 0.4; u += 1 + R() * 1.5) {
        w.mb.spike(w.W(u, -0.2, 0.9 + R() * 0.8), [R() - 0.5, 3, 0.4 + R() * 0.5], 2.5 + R() * 4.5, 0.4 + R() * 0.35, 5, sh(g, -0.08 + R() * 0.16));
        if (R() < 0.55) w.mb.spike(w.W(u + 0.5, w.h + 0.6, 1.4 + R() * 0.8), [R() - 0.5, -3, 0.5], 2 + R() * 3.5, 0.35 + R() * 0.2, 5, sh(g, -0.2));
        if (R() < 0.4) w.gl.spike(w.W(u + 0.3, 0, 1.6 + R() * 0.6), [R() - 0.5, 2, 0.6], 0.8 + R() * 1.4, 0.16, 4, sh(R() < 0.5 ? cr : '#70ffb0', R() * 0.2 - 0.1));
      }
    },
    // Jenova SYNTHESIS: glowing egg sacs clustered at the foot of the wall
    pods(w) {
      const R = w.R, cr = w.d.crystal || '#c070ff';
      for (let u = 2 + R() * 3; u < w.len - 1.5; u += 5 + R() * 4) for (let i = 0; i < 3; i++) {
        const p = w.W(u + (R() - 0.5) * 1.6, 0, 1.8 + R() * 0.7), r = 0.35 + R() * 0.35;
        w.gl.sphere(p[0], r * 0.4, p[2], r, r * 1.2, r, sh(cr, R() * 0.2 - 0.1), 6, 4, true);
        if (w.ad && i === 0) glowBall(w.ad, [p[0], r * 0.8, p[2]], 1.6, cr, 0.3);
      }
    },
    // Jenova SYNTHESIS: ribbons of Lifestream rising in front of the rock (w.wm: an additive layer that
    // drifts upward and wraps, drawn with the wall)
    wisps(w) {
      const R = w.R;
      for (let u = 1.5 + R() * 3; u < w.len - 1; u += 4 + R() * 4) {
        const ph = R() * TAU, wd = 0.25 + R() * 0.3, v = 2.6 + R() * 1.2, col = R() < 0.6 ? '#90ffc8' : '#c898ff';
        const at = (k, o) => w.W(u + Math.sin(ph + k * 0.8) * 0.6 + o, k * 1.4, v);
        for (let k = 0; k < 8; k++) { const a0 = Math.sin(k / 8 * Math.PI) * 0.45, a1 = Math.sin((k + 1) / 8 * Math.PI) * 0.45; vquad(w.wm, at(k, -wd), at(k, wd), at(k + 1, wd), at(k + 1, -wd), [tinted(col, a0), tinted(col, a0), tinted(col, a1), tinted(col, a1)]); }
      }
    },
    // Gaea's Cliff: great ice crystals from the floor and the roof
    icicles(w) { const R = w.R; for (let u = 0.8; u < w.len - 0.5; u += 1.2 + R() * 1.5) { w.gl.spike(w.W(u, 0, 0.6 + R() * 0.8), [R() - 0.5, 2, 0.4 + R() * 0.4], 2 + R() * 4, 0.4 + R() * 0.3, 5, sh('#6aa8f0', R() * 0.3 - 0.1)); w.gl.spike(w.W(u + 0.5, w.h, 0.8 + R() * 0.6), [0, -1, 0.15], 1.5 + R() * 3, 0.35, 5, sh('#8ac0ff', R() * 0.2)); } },
  };
  const FENCE = {
    // steel railing: posts and two rails
    railing(w) { for (let u = 0; u <= w.len + 0.01; u += 2) wbox(w.mb, w.W, u - 0.06, u + 0.06, 0, w.h, 0, 0.12, w.col, REG.metal, 1); for (const y of [w.h, w.h * 0.5]) wbox(w.mb, w.W, 0, w.len, y - 0.06, y + 0.04, 0, 0.12, w.col, REG.metal, 3, true); },
    // stone balustrade: square posts, balusters, a top rail and a plinth
    balusters(w) {
      wbox(w.mb, w.W, 0, w.len, 0, 0.16, 0, 0.42, sh(w.col, -0.1), REG.rock, 4);
      wbox(w.mb, w.W, 0, w.len, w.h - 0.16, w.h, 0, 0.4, w.col, REG.rock, 4);
      for (let u = 0.35; u < w.len; u += 0.55) wbox(w.mb, w.W, u - 0.07, u + 0.07, 0.16, w.h - 0.16, 0.13, 0.27, sh(w.col, -0.05));
      for (let u = 0; u <= w.len + 0.01; u += 3.5) wbox(w.mb, w.W, Math.max(0, u - 0.26), Math.min(w.len, u + 0.26), 0, w.h + 0.14, 0, 0.44, sh(w.col, 0.04), REG.rock, 2);
    },
    // Corel Prison: scrap panels and planks of uneven height
    scrap(w) { const R = w.R; for (let u = 0; u < w.len;) { const s = 1.2 + R() * 1.4, hh = w.h * (0.6 + R() * 0.5), wood = R() < 0.45; wbox(w.mb, w.W, u, Math.min(w.len, u + s), 0, hh, R() * 0.1, 0.1 + R() * 0.12, sh(wood ? '#6a5038' : '#6a5a50', R() * 0.2 - 0.1), wood ? REG.wood : REG.metal, 1); u += s; } for (let u = 0; u <= w.len; u += 3.5) wbox(w.mb, w.W, u - 0.08, u + 0.08, 0, w.h * 1.1, 0.2, 0.36, '#4a3a2a', REG.wood, 1); },
  };
  const SIDES = (b) => [
    { p0: [b.x0, b.z0], rt: [1, 0], n: [0, 1], len: b.x1 - b.x0 },     // behind the enemies
    { p0: [b.x1, b.z0], rt: [0, 1], n: [-1, 0], len: b.z1 - b.z0 },    // +x
    { p0: [b.x1, b.z1], rt: [-1, 0], n: [0, -1], len: b.x1 - b.x0 },   // behind the party
    { p0: [b.x0, b.z1], rt: [0, -1], n: [1, 0], len: b.z1 - b.z0 },    // -x
  ];
  function room(c) {
    const rm = c.rm = Object.assign({ x0: -10.5, x1: 10.5, z0: -9.5, z1: 10.5, h: 9, tw: 4.5, th: 4.5 }, c.d.room);
    SIDES(rm).forEach((s, i) => {
      const mb = new MB(), gl = new MB(), ad = new MB(), W = wallFrame(s.p0, s.rt, s.n);
      tquad(mb, W(0, 0, 0), W(s.len, 0, 0), W(s.len, rm.h, 0), W(0, rm.h, 0), '#ffffff', REG.wall, rm.tw, rm.th);
      for (const k of rm.deco || []) RDECO[k]({ mb, gl, ad, W, len: s.len, h: rm.h, side: i, d: c.d, R: c.R, rm });
      c.pcs.push(piece(mb, gl, c.tex, { wall: true, n: s.n, p: s.p0, add: ad }));
    });
  }
  function fence(c) {
    const f = Object.assign({ x0: -10.5, x1: 10.5, z0: -9.5, z1: 10.5, h: 1.4, col: '#8a8a8a' }, c.d.fence);
    SIDES(f).forEach((s, i) => {
      if (f.sides && !f.sides.includes(i)) return;
      const mb = new MB(), gl = new MB();
      FENCE[f.kind]({ mb, gl, W: wallFrame(s.p0, s.rt, s.n), len: s.len, h: f.h, col: f.col, R: c.R });
      c.pcs.push(piece(mb, gl, c.tex, { wall: true, n: s.n, p: s.p0 }));
    });
  }
  // cave: a ring of rough rock faces bulging inward, with jagged tops
  function cave(c) {
    const cv = c.cv = Object.assign({ r: 11.5, n: 12, h: 10 }, c.d.cave), n = cv.n, R = c.R, cols = 3, lv = [0, 0.28, 0.6, 1];
    const ang = [], rad = [];
    for (let i = 0; i < n; i++) { ang.push((i + (R() - 0.5) * 0.3) / n * TAU); rad.push(cv.r * (0.94 + R() * 0.12)); }
    const bulge = (g, k) => (k === 0 ? 0.7 : k === 3 ? 1.2 : 0.2) + U.hash(g % (n * cols), k, 41) * (k === 3 ? 1.6 : 0.9);
    const lift = (g, k) => (k === 3 ? (U.hash(g % (n * cols), 5, 43) - 0.5) * 3 : k ? (U.hash(g % (n * cols), k, 47) - 0.5) * 0.8 : 0);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, p0 = [Math.cos(ang[i]) * rad[i], Math.sin(ang[i]) * rad[i]], p1 = [Math.cos(ang[j]) * rad[j], Math.sin(ang[j]) * rad[j]];
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), rt = [(p1[0] - p0[0]) / len, (p1[1] - p0[1]) / len], nn = [-rt[1], rt[0]];
      const W = wallFrame(p0, rt, nn), mb = new MB(), gl = new MB(), ad = new MB(), wm = new MB();
      const V = (ci, k) => { const g = i * cols + ci; return W(ci / cols * len, lv[k] * cv.h + lift(g, k), bulge(g, k)); };
      for (let ci = 0; ci < cols; ci++) for (let k = 0; k < 3; k++) {
        const s = k === 0 ? -0.18 : k === 2 ? -0.1 : 0;
        mb.quad(V(ci, k), V(ci + 1, k), V(ci + 1, k + 1), V(ci, k + 1), sh('#ffffff', s + (U.hash(i * cols + ci, k, 51) - 0.5) * 0.12), FULL(REG.wall));
      }
      for (const k of cv.deco || []) RDECO[k]({ mb, gl, ad, wm, W, len, h: cv.h, side: i, d: c.d, R, rm: cv });
      c.pcs.push(piece(mb, gl, c.tex, { wall: true, n: nn, p: p0, add: ad, rise: wm.vertexCount ? { mesh: addMesh(wm), drift: [0, 0.02, 0], span: 11.2 } : null }));
    }
  }

  // train tunnel: two long side walls (x = ±hw) in segments, each drawn while the camera is inside it - the
  // lining, the roof's haunch, a service ledge with its hazard edge, girder frames and X-braces, pipe runs,
  // a cable tray, red / yellow signal lamps and ceiling lamps with soft halos; the +x wall has a lit doorway
  function tunnel(c) {
    const t = Object.assign({ hw: 9.5, h: 7.5, len: 24, seg: 16 }, c.d.tunnel), R = c.R, hz = c.d.deco ? REG.deco : REG.white;
    c.rm = { x0: -t.hw, x1: t.hw, z0: -t.len, z1: t.len };
    for (const s of [1, -1]) for (let z = -t.len; z < t.len - 0.01; z += t.seg) {
      const n = [-s, 0], rt = [n[1], -n[0]], p0 = s > 0 ? [t.hw, z] : [-t.hw, z + t.seg], W = wallFrame(p0, rt, n), L = t.seg, h = t.h;
      const mb = new MB(), gl = new MB(), ad = new MB(), along = [rt[0], 0, rt[1]], inw = [n[0], 0, n[1]];
      tquad(mb, W(0, 0, 0), W(L, 0, 0), W(L, h, 0), W(0, h, 0), '#ffffff', REG.wall, 4, h / 2);
      tquad(mb, W(0, h, 0), W(L, h, 0), W(L, h + 2.4, 3), W(0, h + 2.4, 3), '#b4b4b4', REG.wall, 4, 3);
      wbox(mb, W, 0, L, 0, 0.42, 0, 1.3, '#6e706a', REG.rock, 4);
      tquad(mb, W(0, 0.06, 1.31), W(L, 0.06, 1.31), W(L, 0.36, 1.31), W(0, 0.36, 1.31), '#ffffff', hz, 1.2, 0.3);
      for (let u = 2; u < L; u += 4) {
        wbox(mb, W, u - 0.2, u + 0.2, 0.42, h, 0.02, 0.45, '#3c3e3c', REG.metal, 4);
        if (Math.round(u / 4) % 2 === 0 && u + 4 < L) for (const [ya, yb] of [[0.6, h - 0.8], [h - 0.8, 0.6]]) { const a = W(u + 0.2, ya, 0.3), b = W(u + 3.8, yb, 0.3); vface(mb, [a[0], a[1] - 0.18, a[2]], [b[0], b[1] - 0.18, b[2]], [b[0], b[1] + 0.18, b[2]], [a[0], a[1] + 0.18, a[2]], inw, ['#34363a', '#34363a', '#40424a', '#40424a']); }
        tube(mb, W(u, h - 0.2, 0.3), W(u, h + 2.1, 2.8), 0.14, 4, '#34363a');
      }
      wbox(mb, W, 0, L, h - 0.55, h - 0.1, 0, 0.6, '#2e302e', REG.metal, 8, true);
      for (const [y, v, r, col] of [[5.1, 0.75, 0.3, '#5a5c58'], [5.75, 0.62, 0.18, '#6a4a34'], [6.3, 0.8, 0.24, '#4e5256']]) tube(mb, W(0, y, v), W(L, y, v), r, 6, col, REG.metal, 99);
      wbox(mb, W, 0, L, 3.85, 3.95, 0, 0.55, '#1c1c1c', REG.metal, 8, true);
      tube(mb, W(0, 4.08, 0.3), W(L, 4.08, 0.3), 0.12, 4, '#141414', REG.metal, 99);
      for (let u = s > 0 ? 3 : 6; u < L - 0.5; u += 6) {
        wbox(mb, W, u - 0.3, u + 0.3, 2.2, 3.2, 0, 0.32, '#101010');
        wpanel(gl, W, u - 0.18, u + 0.18, 2.5, 2.95, 0.33, '#ff3420');
        halo(ad, W(u, 2.72, 0.36), along, [0, 1, 0], 1.1, '#ff3a20', 0.45);
        const y2 = (u % 12 < 6) ? '#ffc830' : '#40ff90', uy = u + 3;
        if (uy < L - 0.3) { wbox(mb, W, uy - 0.15, uy + 0.15, 1.05, 1.45, 0, 0.2, '#101010'); wpanel(gl, W, uy - 0.09, uy + 0.09, 1.15, 1.35, 0.21, y2); halo(ad, W(uy, 1.25, 0.24), along, [0, 1, 0], 0.5, y2, 0.4); }
        const lamp = W(u + 1.5, h + 1.2, 1.55);
        gl.box(lamp[0], lamp[1], lamp[2], 0.5, 0.18, 0.5, '#fff4d8');
        halo(ad, [lamp[0], lamp[1] - 0.12, lamp[2]], along, inw, 1.6, '#fff0c8', 0.35);
      }
      if (s > 0 && z < 0 && z + t.seg > 0) {        // the lit doorway (FF7's orange-lit opening in the far wall)
        const u = 5 - z;
        wbox(mb, W, u - 1.9, u - 1.5, 0.42, 3.9, 0, 0.5, '#2a2c2a', REG.metal, 4); wbox(mb, W, u + 1.5, u + 1.9, 0.42, 3.9, 0, 0.5, '#2a2c2a', REG.metal, 4); wbox(mb, W, u - 1.9, u + 1.9, 3.9, 4.3, 0, 0.5, '#2a2c2a', REG.metal, 4);
        wpanel(gl, W, u - 1.5, u + 1.5, 0.42, 3.9, 0.02, ['#ff9040', '#ff9040', '#8a2a18', '#8a2a18']);
        tquad(mb, W(u - 1.9, 3.95, 0.51), W(u + 1.9, 3.95, 0.51), W(u + 1.9, 4.25, 0.51), W(u - 1.9, 4.25, 0.51), '#ffffff', hz, 1.2, 0.3);
        halo(ad, W(u, 2, 0.6), along, [0, 1, 0], 3.2, '#ff8040', 0.3);
      }
      c.pcs.push(piece(mb, gl, c.tex, { wall: true, n, p: p0, add: ad }));
    }
  }

  // Corel's runaway train: a rock cutting (one wall piece per side) and the track bed below the cars, both
  // scrolling past along z at the train's speed (one tile = `span` units, so they wrap seamlessly); signal
  // posts beside the far track
  function cut(c) {
    const k = Object.assign({ hw: 9.5, h: 12, speed: 0.28, span: 12, len: 44, y0: -3.9 }, c.d.cut), R = c.R, cols = 4, lv = [0, 0.32, 0.68, 1];
    const nc = Math.round(k.len * 2 / k.span) * cols, cw = k.span / cols;
    for (const s of [1, -1]) {
      const n = [-s, 0], rt = [n[1], -n[0]], p0 = s > 0 ? [k.hw, -k.len] : [-k.hw, k.len], W = wallFrame(p0, rt, n);
      const bulge = (g, j) => (j === 0 ? 0.6 : j === 3 ? 0.9 : 0.2) + U.hash(g % cols, j, 61 + s) * (j === 3 ? 1.2 : 1);
      const lift = (g, j) => (j === 3 ? (U.hash(g % cols, 5, 63 + s) - 0.5) * 3.5 : j ? (U.hash(g % cols, j, 67 + s) - 0.5) * 0.9 : 0);
      const V = (ci, j) => W(ci * cw, k.y0 + lv[j] * (k.h - k.y0) + lift(ci, j), bulge(ci, j));
      // one piece per span, so only the stretch right beside the camera fades; its box covers the whole
      // stretch it slides through
      for (let c0 = 0; c0 < nc; c0 += cols) {
        const mb = new MB(), gl = new MB();
        for (let ci = c0; ci < c0 + cols; ci++) for (let j = 0; j < 3; j++) mb.quad(V(ci, j), V(ci + 1, j), V(ci + 1, j + 1), V(ci, j + 1), sh('#ffffff', (j === 0 ? -0.2 : j === 2 ? -0.08 : 0) + (U.hash(ci % cols, j, 71 + s) - 0.5) * 0.14), FULL(REG.wall));
        const pc = piece(mb, gl, c.tex, { wall: true, n, p: p0, scroll: { v: k.speed, span: k.span } });
        pc.bb[5] += k.span;
        c.pcs.push(pc);
      }
    }
    // the track bed: ballast, the train's own rails, a second track with sleepers, signal posts
    const mb = new MB(), gl = new MB(), ad = new MB(), y = k.y0, L = k.len;
    tface(mb, [-k.hw - 1, y, L], [k.hw + 1, y, L], [k.hw + 1, y, -L], [-k.hw - 1, y, -L], [0, 1, 0], '#6a665e', REG.rock, 5.25, 4);
    for (const x of [-0.72, 0.72]) tbox(mb, x, y, 0, 0.1, 0.14, L * 2, '#8a8a90', REG.metal, 22);
    for (let z = -L + 0.5; z < L; z += 1) flat(mb, -8.2, z - 0.15, -5.8, z + 0.15, y + 0.03, '#3a2c1e', REG.wood);
    for (const x of [-7.72, -6.28]) tbox(mb, x, y + 0.03, 0, 0.1, 0.14, L * 2, '#8a8a90', REG.metal, 22);
    for (let z = -L + 6; z < L; z += k.span) {
      tbox(mb, 7.4, y, z, 0.16, 4.6, 0.16, '#303236', REG.metal, 1); tbox(mb, 7.4, y + 3.8, z, 0.5, 0.9, 0.3, '#121212', REG.metal, 1);
      for (const [yy, col] of [[y + 4.45, '#ff3020'], [y + 4.0, '#30ff80']]) { gl.box(7.4, yy, z + 0.16, 0.24, 0.24, 0.04, col); halo(ad, [7.4, yy, z + 0.2], [1, 0, 0], [0, 1, 0], 0.7, col, 0.4); }
    }
    const L0 = { drift: [0, 0, k.speed], span: k.span, once: true };
    c.layers.push(Object.assign({ mesh: mb.build({ tex: c.tex }) }, L0), Object.assign({ mesh: gl.build({ unlit: true }), unlit: true }, L0), Object.assign({ mesh: addMesh(ad), add: true }, L0));
  }

  // the glass elevator: the Shinra building's facade beside the platforms (one wall piece at x = f.x, facing
  // the fight, drawn while the camera is on its inner side), with guide rails, sliding down every frame
  // as the elevator climbs; its tiles are one storey (span) tall so the slide wraps seamlessly
  function facade(c) {
    const f = Object.assign({ x: 10.5, speed: -0.05, span: 8, z: 22, y0: -32, y1: 40 }, c.d.facade), mb = new MB(), gl = new MB();
    const n = [-1, 0], W = wallFrame([f.x, -f.z], [n[1], -n[0]], n), L = f.z * 2;
    tquad(mb, W(0, f.y0, 0), W(L, f.y0, 0), W(L, f.y1, 0), W(0, f.y1, 0), '#ffffff', REG.wall, f.span, f.span);
    for (const u of [f.z - 6.5, f.z + 6.5]) wbox(mb, W, u - 0.3, u + 0.3, f.y0, f.y1, 0, 0.5, '#4a4e54', REG.metal, 8);
    for (let u = 4; u < L; u += 8) for (let y = f.y0 + 5; y < f.y1; y += f.span) wpanel(gl, W, u - 0.9, u + 0.9, y, y + 0.35, 0.03, '#e8f2ff');
    const pc = piece(mb, gl, c.tex, { wall: true, n, p: [f.x, -f.z], scroll: { v: f.speed, span: f.span, axis: 1 } });
    pc.bb[4] += f.span;
    c.pcs.push(pc);
  }

  // the expressway: a deck curving round (0, cz) between radii r0 and r1 over angles ±a, with its edges and
  // piers, lane markings, crash barriers along both edges (pieces, cut away when the camera is outside
  // them), lamp posts, and dark towers inside the curve and beyond the edges
  function road(c, mb, gl) {
    const d = c.d, rd = d.road, S = d.fs || 4, lim = (d.br || 16.5) - 1.2, R = c.R;
    const P = (a, r, y = 0) => [Math.sin(a) * r, y, rd.cz + Math.cos(a) * r];
    const inR = (p) => Math.hypot(p[0], p[2]) < lim;
    const na = Math.ceil(rd.a * (rd.r0 + rd.r1) / S), da = rd.a * 2 / na, nr = Math.round((rd.r1 - rd.r0) / S), dr = (rd.r1 - rd.r0) / nr, uv = FULL(REG.floor);
    const vc = (p) => { const k = (1 + (wnoise(p[0], p[2], 5, 3) - 0.5) * 0.16) * U.lerp(1, 0.55, U.clamp((Math.hypot(p[0], p[2]) - 12) / 26, 0, 1)); return [k, k, k, 1]; };
    const on = (a0, a1) => inR(P(a0, rd.r0)) || inR(P(a1, rd.r0)) || inR(P(a0, rd.r1)) || inR(P(a1, rd.r1));
    for (let i = 0; i < na; i++) {
      const a0 = -rd.a + i * da, a1 = a0 + da;
      if (!on(a0, a1)) continue;
      for (let j = 0; j < nr; j++) { const r0 = rd.r0 + j * dr, r1 = r0 + dr, q = [P(a0, r1), P(a1, r1), P(a1, r0), P(a0, r0)]; vface(mb, q[0], q[1], q[2], q[3], [0, 1, 0], q.map(vc), uv); }
      for (const [r, o] of [[rd.r0, -1], [rd.r1, 1]]) { const am = (a0 + a1) / 2; tface(mb, P(a0, r, -1.6), P(a1, r, -1.6), P(a1, r, 0), P(a0, r, 0), [Math.sin(am) * o, 0, Math.cos(am) * o], '#4a4c52', REG.rock, 8, 1.6); }
      // lane markings: solid edge lines, dashed lane lines
      for (const r of [rd.r0 + 1.1, rd.r1 - 1.1]) vface(mb, P(a0, r - 0.1, 0.012), P(a1, r - 0.1, 0.012), P(a1, r + 0.1, 0.012), P(a0, r + 0.1, 0.012), [0, 1, 0], ['#c8c8bc', '#c8c8bc', '#c8c8bc', '#c8c8bc']);
    }
    for (const r of [rd.r0 + 5.6, (rd.r0 + rd.r1) / 2, rd.r1 - 5.6]) for (let sa = -rd.a * r; sa < rd.a * r - 2.4; sa += 5) {
      const a0 = sa / r, a1 = (sa + 2.4) / r;
      if (inR(P(a0, r))) vface(mb, P(a0, r - 0.09, 0.014), P(a1, r - 0.09, 0.014), P(a1, r + 0.09, 0.014), P(a0, r + 0.09, 0.014), [0, 1, 0], ['#d8d8cc', '#d8d8cc', '#d8d8cc', '#d8d8cc']);
    }
    for (let a = -rd.a + 0.12; a < rd.a; a += 0.3) { const p = P(a, (rd.r0 + rd.r1) / 2); if (inR(p)) tbox(mb, p[0], d.voidY || -30, p[2], 4, -1.6 - (d.voidY || -30), 4, '#3a3c42', REG.rock, 16); }
    // crash barriers: concrete with a slimmer upper part and amber reflectors, 3 chords of the arc per piece
    for (const [r, inward] of [[rd.r0, 1], [rd.r1, -1]]) {
      const n = Math.ceil(rd.a * 2 * r / 3.5), step = rd.a * 2 / n;
      for (let i = 0; i < n; i += 3) {
        const pmb = new MB(), pgl = new MB(); let first = null, mid = null;
        for (let j = i; j < Math.min(n, i + 3); j++) {
          const a0 = -rd.a + j * step, a1 = a0 + step, pa = P(a0, r), pb = P(a1, r);
          if (!inR(pa) && !inR(pb)) continue;
          const am = (a0 + a1) / 2, nn = [Math.sin(am) * inward, Math.cos(am) * inward], rt = [nn[1], -nn[0]];
          const dot = (pb[0] - pa[0]) * rt[0] + (pb[2] - pa[2]) * rt[1], p0 = dot > 0 ? [pa[0], pa[2]] : [pb[0], pb[2]], len = dist3(pa, pb) + 0.05, W = wallFrame(p0, rt, nn);
          wbox(pmb, W, 0, len, 0, 0.75, 0, 0.55, '#7a7a78', REG.rock, 4); wbox(pmb, W, 0, len, 0.75, 1.15, 0.12, 0.4, '#86867e', REG.rock, 4);
          wpanel(pmb, W, 0, len, 0.52, 0.62, 0.56, '#2a2a2c');
          for (let u = 1; u < len; u += 3.5) wpanel(pgl, W, u - 0.14, u + 0.14, 0.43, 0.59, 0.57, '#ffb030');
          if (!first) first = p0; if (j === i + 1 || !mid) mid = nn;
        }
        if (first) c.pcs.push(piece(pmb, pgl, c.tex, { wall: true, n: mid, p: first }));
      }
    }
    // lamp posts just outside the barriers, arms over the road: a lamp, its halo, a faint light cone and a
    // pool of light on the asphalt
    for (const [r, inward] of [[rd.r0 - 0.35, 1], [rd.r1 + 0.35, -1]]) for (let sa = -rd.a * r + 4; sa < rd.a * r; sa += 11) {
      const a = sa / r, p = P(a, r), dir = [Math.sin(a) * inward, 0, Math.cos(a) * inward];
      if (!inR(p)) continue;
      place(c, 0.5, (lm, lg, ad) => {
        const top = [p[0], 7.2, p[2]], tip = [p[0] + dir[0] * 2.3, 7.5, p[2] + dir[2] * 2.3];
        tcyl(lm, p[0], 0, p[2], 0.16, 0.1, 7.3, 6, '#5a5e66', REG.metal, 2); tube(lm, top, tip, 0.07, 4, '#5a5e66');
        lg.box(tip[0], 7.36, tip[2], 0.8, 0.14, 0.8, '#eef4ff');
        glowBall(ad, [tip[0], 7.3, tip[2]], 1.3, '#dce8ff', 0.4);
        halo(ad, [tip[0], 0.03, tip[2]], [1, 0, 0], [0, 0, 1], 3.4, '#c8d8ff', 0.2);
        for (let k = 0; k < 6; k++) { const t0 = k / 6 * TAU, t1 = (k + 1) / 6 * TAU, q = [0.9, 0.95, 1, 0.07], z = [0.9, 0.95, 1, 0]; ad.tri([tip[0], 7.25, tip[2]], [tip[0] + Math.cos(t0) * 3, 0.05, tip[2] + Math.sin(t0) * 3], [tip[0] + Math.cos(t1) * 3, 0.05, tip[2] + Math.sin(t1) * 3], [q, z, z]); }
      });
    }
    // dark towers inside the curve and beyond the edges, windows lit (unlit facades), teal crowns
    for (let i = 0; i < 40 && c.pcs.filter(q => q.tower).length < 9; i++) {
      const ang = R() * TAU, rr = 17 + R() * (lim - 21), x = Math.cos(ang) * rr, z = Math.sin(ang) * rr, dc = Math.hypot(x, z - rd.cz);
      if (dc > rd.r0 - 5 && dc < rd.r1 + 5) continue;
      const w = 4 + R() * 5, dp = 4 + R() * 5, h = 14 + R() * 22;
      if (!clearSpot(c, [x - w / 2, d.voidY || -30, z - dp / 2, x + w / 2, h, z + dp / 2], 2)) continue;
      const tm = new MB(), tg = new MB();
      tbox(tg, x, d.voidY || -30, z, w, h - (d.voidY || -30), dp, sh('#c0c8d8', R() * 0.15 - 0.1), REG.wall, 12);
      tbox(tg, x, h, z, w + 0.3, 0.6, dp + 0.3, '#3a9aa0', REG.white, 99); tbox(tm, x, h + 0.6, z, w * 0.7, 1.4, dp * 0.7, '#2a2e36', REG.metal, 2);
      c.pcs.push(piece(tm, tg, c.tex, { tower: true }));
    }
  }

  // ------------------------------------------------------------------ animated layers
  // { mesh, add: additive (drawn after the fighters) | unlit, pos, tilt [rx, ry, rz], drift [x, y, z] per frame
  // wrapped every `span` (drawn twice, one span apart, unless `once`; `center` wraps around 0), swing
  // [ax, az, freq, phase] (a slow sway about pos), pulse [depth, freq] (additive brightness) }
  const tinted = (a, k) => { const q = col4(a); return [q[0], q[1], q[2], k]; };
  // transparent layers keep well away from every battle camera (a light shaft or ribbon right in front of
  // the lens would wash the fight out); pts: points along the layer piece
  const farFromEyes = (pts, r) => !views().some(V => pts.some(p => Math.hypot(p[0] - V.e[0], p[1] - V.e[1], p[2] - V.e[2]) < r));
  const FXL = {
    // the caustic net drifting over the sea floor
    caustics(c) {
      const mb = new MB(), T = 6, uv = FULL(REG.deco), col = (x, z) => [1, 1, 1, 0.55 * (1 - U.clamp((Math.hypot(x, z) - 10) / 8, 0, 1))];
      for (let x = -21; x < 21; x += T) for (let z = -21; z < 21; z += T) if (Math.hypot(x + T / 2, z + T / 2) < 21) vquad(mb, [x, 0.03, z + T], [x + T, 0.03, z + T], [x + T, 0.03, z], [x, 0.03, z], [col(x, z + T), col(x + T, z + T), col(x + T, z), col(x, z)], uv);
      c.layers.push({ mesh: mb.build({ tex: c.tex, unlit: true, blend: 'add' }), add: true, drift: [0.011, 0, 0.007], span: T, once: true, center: true, pulse: [0.25, 0.021] });
    },
    // shafts of light slanting down from the surface
    shafts(c) {
      const mb = new MB(), R = c.R, H = 24;
      for (let i = 0, n = 0; i < 40 && n < 8; i++) {
        const a = -R() * Math.PI, r = 4 + R() * 11, x = Math.cos(a) * r, z = Math.sin(a) * r, w = 0.7 + R() * 1.5, top = [x + (0.3 + R() * 0.15) * H, H, z + (R() - 0.5) * 0.3 * H];
        const cb = [0.75, 0.95, 1, 0], ct = [0.75, 0.95, 1, 0.13 + R() * 0.08];
        if (!farFromEyes([0, 0.15, 0.3, 0.45].map(k => L3([x, 0, z], top, k)), 6)) continue;
        n++;
        for (const [ex, ez] of [[w, 0], [0, w]]) vquad(mb, [x - ex, 0, z - ez], [x + ex, 0, z + ez], [top[0] + ex * 1.4, H, top[2] + ez * 1.4], [top[0] - ex * 1.4, H, top[2] - ez * 1.4], [cb, cb, ct, ct]);
      }
      c.layers.push({ mesh: mb.build({ unlit: true, blend: 'add', cull: false }), add: true, pulse: [0.35, 0.013] });
    },
    // drifting motes (sea snow, Lifestream sparks): small crossed quads rising slowly, wrapping, swaying
    motes(c) {
      const mb = new MB(), R = c.R, q = c.d.mote || '#ffffff';
      for (let i = 0; i < 80; i++) {
        const a = R() * TAU, r = 1.5 + Math.sqrt(R()) * 13, x = Math.cos(a) * r, z = Math.sin(a) * r, y = R() * 14 - 2, s = 0.025 + R() * 0.04, cc = tinted(q, 0.3 + R() * 0.4);
        if (!farFromEyes([[x, y, z]], 3.5)) continue;
        mb.quad([x - s, y, z], [x + s, y, z], [x + s, y + s * 2, z], [x - s, y + s * 2, z], cc);
        mb.quad([x, y, z - s], [x, y, z + s], [x, y + s * 2, z + s], [x, y + s * 2, z - s], cc);
      }
      c.layers.push({ mesh: mb.build({ unlit: true, blend: 'add', cull: false }), add: true, drift: [0, 0.012, 0], span: 14, swing: [0.02, 0.02, 0.01, 0] });
    },
    // Jenova SYNTHESIS: glowing veins across the floor, pulsing
    veinglow(c) {
      const mb = new MB(), T = 7, uv = FULL(REG.deco), col = (x, z) => [1, 1, 1, 0.7 * (1 - U.clamp((Math.hypot(x, z) - 8) / 5, 0, 1))];
      for (let x = -14; x < 14; x += T) for (let z = -14; z < 14; z += T) if (Math.hypot(x + T / 2, z + T / 2) < 14) vquad(mb, [x, 0.02, z + T], [x + T, 0.02, z + T], [x + T, 0.02, z], [x, 0.02, z], [col(x, z + T), col(x + T, z + T), col(x + T, z), col(x, z)], uv);
      c.layers.push({ mesh: mb.build({ tex: c.tex, unlit: true, blend: 'add' }), add: true, pulse: [0.5, 0.035] });
    },
    // Motor Ball: searchlight beams from the city sweeping the night sky
    searchlights(c) {
      const R = c.R, c0 = [0.85, 0.9, 1, 0.2], c1 = [0.85, 0.9, 1, 0];
      for (let i = 0; i < 4; i++) {
        const mb = new MB(), a = -1.45 + i * 0.5 + R() * 0.2, r = 30 + R() * 8, L = 70, w0 = 0.5, w1 = 3.2;
        for (const [ex, ez] of [[1, 0], [0, 1]]) vquad(mb, [-ex * w0, 0, -ez * w0], [ex * w0, 0, ez * w0], [ex * w1, L, ez * w1], [-ex * w1, L, -ez * w1], [c0, c0, c1, c1]);
        c.layers.push({ mesh: mb.build({ unlit: true, blend: 'add', cull: false }), add: true, pos: [Math.cos(a) * r, -10, Math.sin(a) * r], tilt: [0.3 * Math.sin(a), 0, -0.3 * Math.cos(a)], swing: [0.3, 0.3, 0.006 + R() * 0.004, R() * TAU] });
      }
    },
  };
  // a layer's model matrices at frame t (arena scale k): one, or two a span apart for wrapped drifts
  function layerMats(L, t, k) {
    const p = L.pos ? L.pos.slice() : [0, 0, 0], r = L.tilt ? L.tilt.slice() : [0, 0, 0], two = L.drift && !L.once, out = [];
    let dir = null, o = 0;
    if (L.drift) { for (let i = 0; i < 3; i++) if (L.drift[i]) { o = (((t * L.drift[i]) % L.span) + L.span) % L.span - (L.center ? L.span / 2 : 0); p[i] += o; dir = dir || i; } }
    if (L.swing) { const [ax, az, f, ph] = L.swing; r[0] += ax * Math.sin(t * f + ph); r[2] += az * Math.sin(t * f * 0.7 + ph + 1); }
    out.push(FF7.M4.trs(L._m0 = L._m0 || FF7.M4.create(), p.map(v => v * k), r, [k, k, k]));
    if (two) { p[dir] -= L.span; out.push(FF7.M4.trs(L._m1 = L._m1 || FF7.M4.create(), p.map(v => v * k), r, [k, k, k])); }
    return out;
  }

  // ------------------------------------------------------------------ build
  const cache = {};
  A.get = function (id) {
    if (cache[id]) return cache[id];
    const d = BG[id] || BG.grass;
    const R = U.rng(U.strSeed(id));
    const tex = atlas(id, d);
    const mb = new MB(), gl = new MB();
    const c = { d, R, tex, pcs: [], rm: null, cv: null, layers: [] };
    if (d.road) road(c, mb, gl); else if (!d.noFloor) buildFloor(mb, d);
    for (const k of d.dec || []) DEC[k](mb, gl, d, R);
    if (d.room) room(c); else if (d.cave) cave(c); else if (d.tunnel) tunnel(c);
    if (d.cut) cut(c);
    if (d.facade) facade(c);
    if (d.fence) fence(c);
    for (const k of d.set || []) PROP[k](c);
    for (const k of d.fx || []) FXL[k](c);
    const indoor = !!(d.room || d.cave || d.tunnel);
    const out = {
      id, mesh: mb.build({ tex }), backdrop: backdrop(d, R), glow: gl.vertexCount ? gl.build({ unlit: true }) : null, pieces: c.pcs, layers: c.layers,
      sky: d.sky, fog: d.fog || FF7.glColor(d.sky[1]).slice(0, 3), fogNear: d.fogN || (indoor ? 12 : 17), fogFar: d.fogF || (indoor ? 34 : 46),
      light: lightOf(d), indoor, tint: d.tint,
    };
    cache[id] = out;
    return out;
  };
  // the floor and its decals alone (summon shots that hide the set)
  A.groundOnly = (id) => A.get(id).mesh;

  // ------------------------------------------------------------------ draw
  const WM = FF7.M4.create(), PULSE = [0, 0, 0];
  const scaleBB = (b, k) => b.map(v => v * k);
  A.draw = function (ar, o = {}) {
    const GL = FF7.GL, t = o.t || 0;
    GL.draw(ar.backdrop, null, { unlit: true });
    GL.draw(ar.mesh, null);
    if (ar.glow) { PULSE[0] = PULSE[1] = PULSE[2] = 0.05 * Math.sin(t * 0.05); GL.draw(ar.glow, null, { add: PULSE }); }
    ar._late = null; ar._adds = null;
    if (ar.summonEnv) return;
    const k = ar.widened || 1, M = k === 1 ? null : FF7.M4.trs(WM, [0, 0, 0], [0, 0, 0], [k, k, k]), adds = [];
    // animated layers: opaque ones now, additive ones after the fighters
    for (const L of ar.layers || []) {
      if (!L.mesh) continue;
      const a = L.pulse ? 1 - L.pulse[0] * (0.5 + 0.5 * Math.sin(t * L.pulse[1])) : 1;
      for (const Mx of layerMats(L, t, k)) { if (L.add) adds.push([L.mesh, Mx, [1, 1, 1, a]]); else GL.draw(L.mesh, Mx, L.unlit ? { unlit: true } : undefined); }
    }
    const ps = ar.pieces;
    if (ps && ps.length) {
      const cam = o.cam || { eye: GL.eye, target: GL.target, fov: 40 }, e = cam.eye;
      const V = viewOf(cam), dmin = nearest(V, o.subjects, cam);
      // a camera cut snaps the fades; a moving camera fades pieces in and out
      const cut = !ar._eye || Math.hypot(e[0] - ar._eye[0], e[1] - ar._eye[1], e[2] - ar._eye[2]) > 2.5;
      ar._eye = e.slice();
      let late = null;
      for (const p of ps) {
        const want = (!p.wall || (e[0] - p.p[0] * k) * p.n[0] + (e[2] - p.p[1] * k) * p.n[1] > 0.25) && !blocksView(k === 1 ? p.bb : scaleBB(p.bb, k), V, dmin);
        p.fade = cut || p.fade == null ? (want ? 1 : 0) : U.clamp(p.fade + (want ? 0.1 : -0.16), 0, 1);
        if (p.fade <= 0.01) continue;
        // scrolling scenery slides along z and wraps every span
        let Mp = M;
        if (p.scroll) { const tr = [0, 0, 0]; tr[p.scroll.axis || 2] = ((((t * p.scroll.v) % p.scroll.span) + p.scroll.span) % p.scroll.span) * k; Mp = FF7.M4.trs(p._M = p._M || FF7.M4.create(), tr, [0, 0, 0], [k, k, k]); }
        if (p.fade >= 0.999) { GL.draw(p.mesh, Mp); if (p.glow) GL.draw(p.glow, Mp, { unlit: true }); if (p.add) adds.push([p.add, Mp, [1, 1, 1, 1]]); if (p.rise) for (const Mx of layerMats(p.rise, t, k)) adds.push([p.rise.mesh, Mx, [1, 1, 1, 1]]); }
        else (late = late || []).push([p, Mp]);
      }
      if (late) ar._late = late;
    }
    if (adds.length) ar._adds = adds;
  };
  // pieces in mid-fade, blended over the combatants; then the additive glows (halos, light shafts, motes)
  A.drawLate = function (ar) {
    if (!ar) return;
    const GL = FF7.GL;
    for (const [p, M] of ar._late || []) { const tint = [1, 1, 1, p.fade]; GL.draw(p.mesh, M, { blend: 'alpha', tint }); if (p.glow) GL.draw(p.glow, M, { unlit: true, blend: 'alpha', tint }); if (p.add) GL.draw(p.add, M, { unlit: true, blend: 'add', tint }); }
    for (const [m, M, a] of ar._adds || []) GL.draw(m, M, { unlit: true, blend: 'add', tint: a });
  };
})();
