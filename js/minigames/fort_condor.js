// Fort Condor: hire troops with your own Gil, place them on the upper half of the slope and stop the
// Shinra army before any of it reaches the shack at the top (Fort Condor FAQ unit tables).
//   D-pad cursor, ○ hire / give orders, □ start the battle, L1/R1 game speed.
//   Surviving troops refund half their cost on a win. The minigame never takes Gil itself: it
//   reports `spent` (net of refunds) and the story script charges it.
//   opts: { battle: n (1-20, harder later), gil (available funds), final (Huge Materia defence) }
//   Result { won, score, spent, refund, kills, lost }
// Condor Command ('condor_command'; not in the PS1 game): the same battles as a Gold Saucer arcade game (Wonder
// Square, js/maps/c6a/part3.js). Ten stages, each with its own troop budget (never the player's Gil) and a twist
// (STAGES below), then Endless: rounds that keep coming until one breaks through.
//   opts: { stage: 1-10 } | { endless: true }. Result { won, stage, rounds, gp, kills, lost, standing }
(function () {
  const U = FF7.util, R = FF7.render, GL = FF7.GL, M4 = FF7.M4, MG = FF7.minigames, ui = MG.ui;
  const W = FF7.W, H = FF7.H;
  const COLS = 9, ROWS = 14, CELL = 2.2, PLACE_MIN = 1, PLACE_MAX = 7, MAX_UNITS = 20, TICK = 90;
  const ET = ['beast', 'barbarian', 'wyvern', 'commander'];
  // damage dealt to [beast, barbarian, wyvern, commander] / damage taken from them (Fort Condor FAQ)
  const ALLY = {
    fighter: { name: 'Fighter', hp: 200, cost: 400, range: 1, dmg: [30, 30, 27, 15], taken: [25, 15, 20, 50], move: 45, col: '#4a70c0' },
    attacker: { name: 'Attacker', hp: 180, cost: 420, range: 1, dmg: [40, 17, 20, 12], taken: [12, 22, 22, 50], move: 30, col: '#c04a4a' },
    defender: { name: 'Defender', hp: 220, cost: 440, range: 1, dmg: [35, 52, 24, 17], taken: [25, 7, 30, 50], move: 70, col: '#8a8a9a' },
    shooter: { name: 'Shooter', hp: 160, cost: 520, range: 3, dmg: [10, 16, 30, 6], taken: [37, 15, 10, 50], move: 45, col: '#4aa04a' },
    repairer: { name: 'Repairer', hp: 160, cost: 480, range: 1, dmg: [10, 10, 9, 5], taken: [25, 15, 20, 50], move: 45, col: '#e0e0e0', heal: 25 },
    worker: { name: 'Worker', hp: 160, cost: 400, range: 1, dmg: [15, 15, 13, 7], taken: [25, 15, 20, 50], move: 45, col: '#d0a040', bomb: [60, 60, 0, 30] },   // (bomb: the blast, to everything on and beside its square)
    stoner: { name: 'Stoner', hp: 100, cost: 480, range: 4, dmg: [20, 16, 6, 10], taken: [25, 15, 20, 50], fixed: true, reload: 300, col: '#8a6a4a' },
    catapult: { name: 'Catapult', hp: 100, cost: 480, range: 5, dmg: [18, 14, 14, 9], taken: [25, 15, 20, 50], fixed: true, reload: 300, col: '#6a4a2a' },
    fcatapult: { name: 'Fire Catapult', hp: 120, cost: 600, range: 6, dmg: [25, 20, 20, 12], taken: [25, 15, 20, 50], fixed: true, reload: 300, col: '#b04020', from: 5 },
    tristoner: { name: 'Tri-Stoner', hp: 150, cost: 1000, range: 5, dmg: [30, 24, 9, 15], taken: [25, 15, 20, 50], fixed: true, reload: 280, col: '#7a5a3a', from: 8 },
  };
  const ROLE = {   // (the hire menu's line for each troop)
    fighter: 'An all-rounder. Holds its own against anything.',
    attacker: 'Quick on its feet. Best against Beasts.',
    defender: 'Slow and tough. Best against Barbarians.',
    shooter: 'Shoots 3 squares away. Best against Wyverns.',
    repairer: 'Heals the troops beside it and repairs catapults. Only fights when nobody needs help.',
    worker: 'Plants a bomb on the square in front of it. The first foe to step on it blows up (Wyverns fly over).',
    stoner: 'Stays put. Hurls rocks 4 squares: best on Beasts and Barbarians, barely scratches Wyverns.',
    catapult: 'Stays put. Lobs rocks 5 squares, and hits Wyverns more than twice as hard as a Stoner.',
    fcatapult: 'Stays put. Burning shots, 6 squares.',
    tristoner: 'Stays put. Three rocks at once, 5 squares.',
  };
  const ENEMY = {
    beast: { name: 'Beast', hp: 180, range: 1, move: 36, col: '#8a5a30' },
    barbarian: { name: 'Barbarian', hp: 130, range: 3, move: 55, col: '#b03030' },
    wyvern: { name: 'Wyvern', hp: 140, range: 1, move: 40, col: '#6a8a40', fly: true },
    commander: { name: 'CMD. Grand Horn', hp: 230, range: 1, move: 65, col: '#704080' },
  };
  const PATHS = [1, 4, 7];

  // ------------------------------------------------------------------ Condor Command (the arcade version)
  // budget: the stage's troop money; waves: how many enemies; mix: [beast, barbarian, wyvern] weights; pace: gaps
  // between them (x); hp / fast: tougher / quicker enemies (x); cmd: commanders at the end; max: troop cap;
  // only: the troops for hire; gp: the first clear's GP (replays pay half)
  const STAGES = [
    { name: 'Recruits', budget: 4000, waves: 8, cmd: 1, gp: 10, twist: 'A small raid to learn the ropes.' },
    { name: 'Stampede', budget: 4400, waves: 11, mix: [7, 1, 1], cmd: 1, gp: 15, twist: 'Mostly Beasts: Attackers make short work of them.' },
    { name: 'Shield Wall', budget: 4800, waves: 12, mix: [1, 7, 1], cmd: 1, gp: 20, twist: 'Mostly Barbarians: bring Defenders.' },
    { name: 'Wyvern Skies', budget: 5200, waves: 13, mix: [1, 1, 7], cmd: 1, gp: 25, twist: 'Mostly Wyverns: they fly over the line, so Shooters and catapults.' },
    { name: 'Skeleton Crew', budget: 6000, waves: 12, max: 7, cmd: 1, gp: 30, twist: 'Only seven troops on the field at once. Fire Catapults for hire from here on.' },
    { name: 'Artillery', budget: 6500, waves: 14, only: ['stoner', 'catapult', 'fcatapult', 'defender', 'repairer'], cmd: 1, gp: 35, twist: 'Stoners, catapults and a few Defenders to hold the line.' },
    { name: 'Rush', budget: 7000, waves: 15, pace: 0.7, fast: 0.75, cmd: 1, gp: 40, twist: 'Faster enemies, closer together. Tri-Stoners for hire from here on.' },
    { name: 'Twin Horns', budget: 7500, waves: 15, cmd: 2, gp: 45, twist: 'Two commanders at the end.' },
    { name: 'Veterans', budget: 8500, waves: 16, hp: 1.5, cmd: 1, gp: 50, twist: 'Every enemy is tougher.' },
    { name: 'Grand Horn', budget: 10500, waves: 21, hp: 1.25, pace: 0.85, cmd: 3, gp: 60, twist: 'The whole army, and three commanders.' },
  ];
  const ARCADE_FROM = { fcatapult: 5, tristoner: 7 };     // the stage a troop type is first for hire
  MG.condorStages = STAGES;

  // ------------------------------------------------------------------ meshes
  let MESH = null;
  const hillY = (r) => (ROWS - r) * 0.55;
  const SLOPE = Math.atan2(0.55, CELL);
  // the ravine walls: how far out of the field a column (a float, in cells) is, and how high the rock stands there
  const wallD = (u) => Math.max(0, -0.5 - u, u - (COLS - 0.5));
  const wallRise = (d) => d * 1.3 + d * d * 0.45;   // (the hill's tilt: flat things on it lean with it, or their uphill side sinks in)
  const cellPos = (c, r) => [(c - (COLS - 1) / 2) * CELL, hillY(r), (r - ROWS / 2) * CELL];
  function meshes() {
    if (MESH) return MESH;
    MESH = {};
    const rnd = MG.rng('fort-condor');
    MESH.hill = MG.mesh(mb => {
      // the slope, and the ravine's rock walls rising out of both edges of it: one surface on a grid of shared
      // corners (corner k, j: between columns k-1 and k, rows j-1 and j), so the walls meet the field and each
      // other with no gaps; the rock gets a little roughness away from the field's edge
      const C0 = -6, C1 = COLS + 6, R0 = -7, R1 = ROWS + 3, rough = {};
      for (let k = C0; k <= C1; k++) for (let j = R0; j <= R1; j++) rough[k + ',' + j] = (rnd() - 0.5) * 1.4;
      const cornerY = (k, j) => { const d = wallD(k - 0.5); return hillY(j - 0.5) + wallRise(d) + (d > 0 ? rough[k + ',' + j] * Math.min(1, d) : 0); };
      const cornerX = (k) => (k - (COLS - 1) / 2 - 0.5) * CELL, cornerZ = (j) => (j - ROWS / 2 - 0.5) * CELL;
      for (let c = C0; c < C1; c++) for (let r = R0; r < R1; r++) {
        const x0 = cornerX(c), x1 = cornerX(c + 1), z0 = cornerZ(r), z1 = cornerZ(r + 1);
        const out = c < 0 || c >= COLS;
        const place = !out && r >= PLACE_MIN && r <= PLACE_MAX;
        const d = wallD(c);
        const col = out ? U.mix(d > 2.5 ? '#7a5c40' : '#8a6a48', '#5e4632', rnd() * 0.7) : place ? ((c + r) % 2 ? '#7a9a4a' : '#72924a') : ((c + r) % 2 ? '#9a8a5a' : '#928252');
        mb.quad([x0, cornerY(c, r + 1), z1], [x1, cornerY(c + 1, r + 1), z1], [x1, cornerY(c + 1, r), z0], [x0, cornerY(c, r), z0], col);
      }
      // boulders on the walls, sunk into the rock
      for (let i = 0; i < 40; i++) {
        const sd = rnd() < 0.5 ? -1 : 1, r = rnd() * ROWS, u = sd < 0 ? -1.5 - rnd() * 2.5 : COLS + 0.5 + rnd() * 2.5;
        const p = cellPos(u, r), ry = 1 + rnd() * 2;
        mb.sphere(p[0], hillY(r) + wallRise(wallD(u)) + ry * 0.35, p[2], 1 + rnd() * 1.5, ry, 1 + rnd() * 1.5, U.mix('#7a6048', '#a08060', rnd()), 6, 4, false);
      }
      // the fort at the top: shack, the old reactor tower and the condor's nest
      const t = cellPos(4, -1.2);
      mb.box(t[0], t[1] + 1.2, t[2], 6, 2.4, 3, '#8a7050'); mb.frustum(t[0], t[1] + 2.4, t[2], 6.4, 3.4, 4, 1.2, 1.2, '#6a4a30');
      mb.prism(t[0] + 6, t[1], t[2] - 3, 3, 2.4, 16, 10, '#7a7a80'); mb.prism(t[0] + 6, t[1] + 16, t[2] - 3, 3.6, 3.6, 1, 10, '#5a5a60');
      // condor on top of the tower
      const cz = [t[0] + 6, t[1] + 17.2, t[2] - 3];
      mb.sphere(cz[0], cz[1] + 1.2, cz[2], 1.4, 1.2, 2, '#6a4a3a', 8, 6, true); mb.sphere(cz[0], cz[1] + 2.4, cz[2] + 1.6, 0.6, 0.6, 0.7, '#e8e0d0', 8, 6, true);
      mb.spike([cz[0], cz[1] + 2.3, cz[2] + 2.2], [0, -0.5, 1], 0.7, 0.2, 5, '#e0b020');
      [1, -1].forEach(sd => mb.blade([cz[0] + sd * 1.2, cz[1] + 1.8, cz[2]], [sd, 0.25, -0.2], 5, 1.6, 0.12, '#5a3a2a'));
      // path markers where the enemy comes up
      PATHS.forEach(c => { const p = cellPos(c, ROWS + 1); mb.box(p[0], p[1] + 0.05, p[2], 1.6, 0.1, 1.6, '#6a5a3a'); });
    });
    MESH.cursor = MG.mesh(mb => { const h = CELL / 2 - 0.08; [[-h, 0, h, 0.14], [h, 0, h, 0.14]].forEach(() => {}); mb.box(0, 0, -h, CELL - 0.1, 0.08, 0.14, '#ffffff'); mb.box(0, 0, h, CELL - 0.1, 0.08, 0.14, '#ffffff'); mb.box(-h, 0, 0, 0.14, 0.08, CELL - 0.1, '#ffffff'); mb.box(h, 0, 0, 0.14, 0.08, CELL - 0.1, '#ffffff'); }, { unlit: true });
    // a wheel on its axle (across x); a square beam from a to b (the box's +y turned onto b - a)
    const wheel = (mb, x, z, r, col) => { mb.push(); mb.translate(x, r, z); mb.rotate(0, 0, Math.PI / 2); mb.prism(0, -0.06, 0, r, r, 0.12, 10, col || '#3a2a1a'); mb.prism(0, 0.061, 0, r * 0.3, r * 0.3, 0.02, 6, '#8a8e98'); mb.pop(); };
    const beam = (mb, a, b, w, col) => { const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz); mb.push(); mb.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); mb.rotate(Math.atan2(dz, dy), 0, -Math.atan2(dx, Math.hypot(dy, dz))); mb.box(0, 0, 0, w, L, w, col); mb.pop(); };
    // ---- the troops: every kind its own silhouette, colour and gear, readable from the camera up the hill (front: +z)
    // a person: boots, legs, a torso (tunic / robe / armour), a head; each arm hangs down, reaches forward or is raised
    const person = (o) => MG.mesh(mb => {
      const cloth = o.cloth, skin = o.skin || '#e8c098', legs = o.legs || '#2a2a34', boots = o.boots || '#3a2a1e';
      if (o.robe) mb.frustum(0, 0.04, 0, 0.5, 0.36, 0.38, 0.26, 0.96, cloth);                           // (a robe to the ground)
      else {
        [-1, 1].forEach(k => { mb.box(k * 0.1, 0.3, 0, 0.13, 0.5, 0.15, legs); mb.box(k * 0.1, 0.06, 0.03, 0.15, 0.12, 0.22, boots); });
        mb.frustum(0, 0.52, 0, o.wide ? 0.5 : 0.38, 0.26, o.wide ? 0.58 : 0.44, 0.28, 0.48, cloth);
      }
      if (o.belt) mb.box(0, 0.56, 0, o.wide ? 0.52 : 0.4, 0.06, 0.28, o.belt);
      mb.sphere(0, 1.14, 0, 0.16, 0.17, 0.16, skin, 8, 6, true);
      const arm = (k, pose, col) => {
        const c = col || (o.bareArms ? skin : cloth);
        if (pose === 'fwd') mb.box(k * 0.26, 0.86, 0.18, 0.1, 0.1, 0.4, c);
        else if (pose === 'up') { mb.push(); mb.translate(k * 0.3, 1.02, 0.04); mb.rotate(0, 0, -k * 0.5); mb.box(0, 0.12, 0, 0.1, 0.42, 0.1, c); mb.pop(); }
        else if (pose !== 'none') mb.box(k * 0.29, 0.72, 0.02, 0.1, 0.42, 0.11, c);   // ('none': the extra draws the arms)
      };
      arm(-1, o.arms ? o.arms[0] : 'down'); arm(1, o.arms ? o.arms[1] : 'down');
      if (o.shoulders) [-1, 1].forEach(k => mb.sphere(k * 0.28, 0.96, 0, 0.13, 0.09, 0.14, o.shoulders, 7, 4, true));
      if (o.extra) o.extra(mb);
    });
    MESH.ally = {
      // Fighter: the all-rounder - round steel helmet, a sword raised, a round shield
      fighter: person({ cloth: '#3a64c0', belt: '#6a4a2a', arms: ['fwd', 'up'], extra: mb => {
        mb.sphere(0, 1.2, 0, 0.18, 0.13, 0.18, '#b8bcc8', 8, 4, true, null, 3); mb.box(0, 1.12, 0.15, 0.2, 0.04, 0.04, '#b8bcc8');
        mb.push(); mb.translate(0.42, 1.35, 0.06); mb.rotate(0, 0, -0.5); mb.box(0, 0.25, 0, 0.06, 0.55, 0.02, '#e0e4ec'); mb.box(0, -0.04, 0, 0.2, 0.04, 0.04, '#a08030'); mb.pop();
        mb.push(); mb.translate(-0.28, 0.86, 0.4); mb.rotate(Math.PI / 2, 0, 0); mb.prism(0, -0.03, 0, 0.24, 0.24, 0.05, 10, '#8a5a30', true); mb.prism(0, 0.02, 0, 0.07, 0.05, 0.04, 8, '#3a64c0', true); mb.pop();
      } }),
      // Attacker: the beast-slayer - bare arms, a headband, a huge double axe gripped in both hands across the body
      // (the haft slanting from the right hip up past the left shoulder, the double blade beside the head)
      attacker: person({ cloth: '#b83030', bareArms: true, belt: '#3a2a1a', arms: ['none', 'none'], extra: mb => {
        const skin = '#e8c098';
        mb.box(0, 1.2, 0, 0.34, 0.06, 0.34, '#e0e0e0'); mb.box(-0.02, 1.2, -0.2, 0.06, 0.05, 0.14, '#e0e0e0');
        const th = 0.62, C = [-0.04, 0.92, 0.3], at = (y) => [C[0] - Math.sin(th) * y, C[1] + Math.cos(th) * y, C[2]];   // (a point up the haft)
        beam(mb, [0.27, 0.98, 0.02], at(-0.36), 0.1, skin); beam(mb, [-0.27, 0.98, 0.02], at(0.08), 0.1, skin);        // both arms to the haft
        [at(-0.36), at(0.08)].forEach(p => mb.sphere(p[0], p[1], p[2], 0.065, 0.065, 0.065, skin, 6, 4, true));        // (the fists)
        mb.push(); mb.translate(C[0], C[1], C[2]); mb.rotate(0, 0, th);
        mb.box(0, -0.02, 0, 0.06, 1.34, 0.06, '#6a4a2a'); mb.box(0, -0.66, 0, 0.08, 0.06, 0.08, '#3a2a1a');           // the haft, its pommel
        [-1, 1].forEach(k => { mb.box(k * 0.19, 0.5, 0, 0.3, 0.34, 0.04, '#c8ccd4'); mb.box(k * 0.33, 0.5, 0, 0.04, 0.42, 0.05, '#e8ecf4'); });   // the double blade
        mb.box(0, 0.5, 0, 0.1, 0.16, 0.08, '#8a8e98'); mb.pop();                                                         // (its socket)
      } }),
      // Defender: the knight - a visored helm with a plume, pauldrons, a tower shield in front, a spear
      defender: person({ cloth: '#8a8f9e', legs: '#5a5e6a', boots: '#40444e', shoulders: '#a0a6b4', wide: true, arms: ['fwd', 'down'], extra: mb => {
        mb.sphere(0, 1.16, 0, 0.19, 0.2, 0.19, '#a8aebc', 8, 6, true); mb.box(0, 1.16, 0.17, 0.2, 0.03, 0.04, '#20222a');
        mb.spike([0, 1.34, -0.02], [0, 0.6, -1], 0.35, 0.06, 5, '#d03030');
        mb.box(-0.22, 0.75, 0.42, 0.44, 0.95, 0.07, { front: '#5a6072', side: '#40465a', top: '#40465a' }); mb.box(-0.22, 0.85, 0.46, 0.12, 0.3, 0.02, '#d0a030');
        mb.box(0.3, 1.0, 0.05, 0.04, 1.9, 0.04, '#6a4a2a'); mb.spike([0.3, 1.95, 0.05], [0, 1, 0], 0.22, 0.05, 4, '#d0d4dc');
      } }),
      // Shooter: the archer - a pointed hood and cloak, a drawn longbow, a quiver of arrows
      shooter: person({ cloth: '#3f8f3f', legs: '#3a4a2a', arms: ['fwd', 'fwd'], extra: mb => {
        mb.spike([0, 1.1, -0.02], [0, 1, -0.35], 0.4, 0.19, 6, '#2e6e2e'); mb.box(0, 0.75, -0.16, 0.42, 0.62, 0.05, '#2e6e2e');
        for (let i = 0; i < 6; i++) {   // the bow: an arc bending away from the archer, the string straight
          const a0 = -0.95 + i * 0.38, a1 = a0 + 0.38, r = 0.5;
          beam(mb, [-0.28, 0.9 + Math.sin(a0) * r, 0.4 + Math.cos(a0) * 0.14], [-0.28, 0.9 + Math.sin(a1) * r, 0.4 + Math.cos(a1) * 0.14], 0.045, '#7a5028');
        }
        mb.box(-0.28, 0.9, 0.36, 0.01, 0.9, 0.01, '#e8e8e0');
        mb.push(); mb.translate(0.14, 0.95, -0.2); mb.rotate(0.3, 0, 0); mb.prism(0, -0.25, 0, 0.07, 0.07, 0.5, 8, '#6a4a2a', true); mb.pop();
        [-0.03, 0.03].forEach(x => mb.box(0.14 + x, 1.25, -0.28, 0.02, 0.12, 0.02, '#e8e0c8'));
      } }),
      // Repairer: the medic - a long white robe, a red cross, a staff with a glowing green orb
      repairer: person({ cloth: '#f2f2f2', robe: true, arms: ['down', 'up'], extra: mb => {
        mb.box(0, 0.78, 0.16, 0.06, 0.24, 0.02, '#e02828'); mb.box(0, 0.8, 0.16, 0.2, 0.06, 0.02, '#e02828');
        mb.sphere(0, 1.22, -0.02, 0.17, 0.1, 0.17, '#f2f2f2', 8, 4, true, null, 3);
        beam(mb, [0.4, 0.05, 0.05], [0.5, 1.85, 0.05], 0.045, '#8a6a40'); mb.sphere(0.5, 1.9, 0.05, 0.1, 0.1, 0.1, '#60f090', 8, 6, true);   // (the staff, through the raised hand)
        mb.sphere(0.47, 1.31, 0.05, 0.06, 0.06, 0.06, '#e8c098', 6, 4, true);
        mb.box(-0.3, 0.45, 0.08, 0.2, 0.16, 0.1, '#8a5a30');
      } }),
      // Worker: the sapper - a yellow hard hat, orange overalls, a pickaxe on the shoulder, a sack of bombs
      // (the pickaxe rests on the right shoulder, gripped in front of the chest, its head behind; a bomb in the left hand)
      worker: person({ cloth: '#d8862a', legs: '#c07020', belt: '#5a3a1a', arms: ['down', 'none'], extra: mb => {
        mb.sphere(0, 1.2, 0, 0.18, 0.12, 0.18, '#f0d020', 8, 4, true, null, 3); mb.prism(0, 1.2, 0, 0.25, 0.25, 0.025, 10, '#f0d020', true);
        const hand = [0.22, 0.78, 0.3], top = [0.3, 1.32, -0.28], d = [top[0] - hand[0], top[1] - hand[1], top[2] - hand[2]];
        beam(mb, [0.27, 0.98, 0.02], hand, 0.1, '#d8862a'); mb.sphere(hand[0], hand[1], hand[2], 0.065, 0.065, 0.065, '#e8c098', 6, 4, true);
        beam(mb, [hand[0] - d[0] * 0.15, hand[1] - d[1] * 0.15, hand[2] - d[2] * 0.15], top, 0.05, '#6a4a2a');
        mb.box(top[0], top[1], top[2], 0.09, 0.09, 0.09, '#6a6e78');                                                       // the head: a T across
        mb.spike(top, [1, -0.3, 0], 0.32, 0.045, 4, '#8a8e98'); mb.spike(top, [-1, -0.3, 0], 0.28, 0.045, 4, '#8a8e98');   // the haft's top
        mb.sphere(0, 0.85, -0.25, 0.2, 0.22, 0.14, '#5a4a3a', 7, 5, true);                                                // the sack of bombs
        mb.sphere(-0.3, 0.44, 0.06, 0.1, 0.1, 0.1, '#1a1a1a', 7, 5, true); mb.box(-0.3, 0.57, 0.06, 0.02, 0.08, 0.02, '#d0a040');   // one in hand
      } }),
    };
    // ---- the machines: a stone-thrower, a trebuchet, a fire cauldron, a triple launcher (front: +z, toward the enemy)
    MESH.ally.stoner = MG.mesh(mb => {   // an onager: low frame, the twisted rope skein, one arm cocked back with a boulder in the cup
      mb.box(0, 0.3, 0, 0.8, 0.14, 1.2, '#8a6a4a'); [[0.42, 0.45], [-0.42, 0.45], [0.42, -0.45], [-0.42, -0.45]].forEach(([x, z]) => wheel(mb, x, z, 0.2));
      mb.push(); mb.translate(0, 0.46, 0.2); mb.rotate(0, 0, Math.PI / 2); mb.prism(0, -0.36, 0, 0.12, 0.12, 0.72, 8, '#c8b080', true); mb.pop();
      beam(mb, [0, 0.46, 0.2], [0, 1.25, -0.35], 0.1, '#5a3a20');
      mb.sphere(0, 1.3, -0.42, 0.14, 0.07, 0.14, '#4a2a10', 8, 4, true); mb.sphere(0, 1.4, -0.42, 0.14, 0.14, 0.14, '#8a8a88', 6, 4, false);
      mb.box(0, 0.9, 0.42, 0.6, 0.5, 0.08, '#7a5a3a');   // (the stop beam)
    });
    MESH.ally.catapult = MG.mesh(mb => {   // a trebuchet: a tall A-frame, the long beam, a counterweight box, the sling
      mb.box(0, 0.22, 0, 0.9, 0.12, 1.3, '#6a4a2a'); [[0.46, 0.5], [-0.46, 0.5], [0.46, -0.5], [-0.46, -0.5]].forEach(([x, z]) => wheel(mb, x, z, 0.2));
      [-1, 1].forEach(k => { beam(mb, [k * 0.38, 0.25, 0.5], [k * 0.3, 1.7, 0], 0.08, '#5a3a20'); beam(mb, [k * 0.38, 0.25, -0.5], [k * 0.3, 1.7, 0], 0.08, '#5a3a20'); });
      mb.box(0, 1.7, 0, 0.7, 0.07, 0.07, '#4a2a10');
      beam(mb, [0, 1.25, 0.55], [0, 2.3, -0.75], 0.09, '#5a3a20');
      mb.box(0, 1.0, 0.62, 0.34, 0.34, 0.34, { side: '#5a5a58', top: '#6a6a68' });                 // counterweight
      mb.box(0, 2.1, -0.95, 0.02, 0.4, 0.02, '#c8b080'); mb.sphere(0, 1.88, -0.95, 0.12, 0.12, 0.12, '#8a8a88', 6, 4, false);
    });
    MESH.ally.fcatapult = MG.mesh(mb => {   // the fire catapult: a red iron frame, a cauldron of fire on its arm
      mb.box(0, 0.3, 0, 0.9, 0.16, 1.2, '#8a2a1a'); [[0.46, 0.45], [-0.46, 0.45], [0.46, -0.45], [-0.46, -0.45]].forEach(([x, z]) => wheel(mb, x, z, 0.21, '#2a2a2e'));
      [-1, 1].forEach(k => mb.box(k * 0.36, 0.75, 0.1, 0.1, 0.8, 0.1, '#6a2014'));
      beam(mb, [0, 0.8, 0.35], [0, 1.4, -0.45], 0.1, '#3a3a40');
      mb.prism(0, 1.32, -0.55, 0.14, 0.2, 0.18, 10, '#2a2a30', true);
      mb.sphere(0, 1.54, -0.55, 0.16, 0.12, 0.16, '#ff7a20', 8, 5, true);
      [[0, 0], [0.08, 0.5], [-0.08, -0.4]].forEach(([x, t]) => mb.spike([x, 1.55, -0.55], [t * 0.3, 1, 0], 0.3, 0.07, 5, '#ffc030'));
      mb.box(0.36, 1.35, 0.1, 0.02, 0.35, 0.2, '#d0a030');   // (a pennant)
    });
    MESH.ally.tristoner = MG.mesh(mb => {   // three arms on one wide cart, six wheels, iron bands
      mb.box(0, 0.3, 0, 1.5, 0.16, 1.3, '#7a5a3a'); [-0.62, 0, 0.62].forEach(z => [-0.8, 0.8].forEach(x => wheel(mb, x, z, 0.2)));
      [-0.5, 0.5].forEach(x => mb.box(x, 0.39, 0, 0.08, 0.02, 1.3, '#4a4a50'));
      [-0.45, 0, 0.45].forEach(x => { beam(mb, [x, 0.42, 0.3], [x, 1.2, -0.3], 0.08, '#5a3a20'); mb.sphere(x, 1.26, -0.34, 0.12, 0.06, 0.12, '#4a2a10', 7, 4, true); mb.sphere(x, 1.34, -0.34, 0.12, 0.12, 0.12, '#8a8a88', 6, 4, false); });
      mb.box(0, 0.8, 0.5, 1.3, 0.14, 0.08, '#5a3a20');
    });
    // ---- Shinra's army: a guard hound, a brute with a club, a wyvern, their horned commander (front: +z)
    MESH.enemy = {
      beast: MG.mesh(mb => {
        mb.sphere(0, 0.55, 0, 0.26, 0.24, 0.5, '#4a5a78', 8, 6, true);
        [[0.16, 0.3], [-0.16, 0.3], [0.16, -0.32], [-0.16, -0.32]].forEach(([x, z]) => { mb.box(x, 0.25, z, 0.1, 0.5, 0.12, '#3a4862'); mb.box(x, 0.03, z + 0.04, 0.12, 0.06, 0.16, '#2a3448'); });
        mb.sphere(0, 0.8, 0.55, 0.19, 0.18, 0.2, '#4a5a78', 8, 6, true); mb.box(0, 0.74, 0.76, 0.14, 0.12, 0.2, '#3a4862');
        [-1, 1].forEach(k => { mb.spike([k * 0.1, 0.94, 0.52], [k * 0.3, 1, -0.2], 0.2, 0.06, 4, '#3a4862'); mb.sphere(k * 0.09, 0.86, 0.72, 0.035, 0.035, 0.03, '#ff3020', 5, 3, true); });
        mb.spike([0, 0.6, -0.48], [0, 0.6, -1], 0.6, 0.07, 5, '#3a4862');                                // the whip tail
        mb.box(0, 0.8, 0, 0.06, 0.1, 0.6, '#8aa0c8');                                                        // (a crest down the back)
      }),
      barbarian: person({ cloth: '#6a4a2a', skin: '#d8a078', bareArms: true, legs: '#4a3020', wide: true, belt: '#3a2a1a', arms: ['down', 'up'], extra: mb => {
        mb.sphere(0, 1.2, 0, 0.19, 0.12, 0.19, '#6a6e78', 8, 4, true, null, 3);
        [-1, 1].forEach(k => mb.spike([k * 0.15, 1.24, 0], [k, 0.7, 0], 0.3, 0.06, 5, '#e8e0c8'));
        mb.push(); mb.translate(0.4, 1.35, 0.1); mb.rotate(0, 0, -0.35); mb.prism(0, 0, 0, 0.05, 0.12, 0.7, 7, '#5a3a20', true);
        for (let i = 0; i < 5; i++) { const a = i * 1.26; mb.spike([Math.cos(a) * 0.1, 0.55, Math.sin(a) * 0.1], [Math.cos(a), 0.3, Math.sin(a)], 0.14, 0.03, 4, '#c8ccd4'); }
        mb.pop();
      } }),
      wyvern: MG.mesh(mb => {
        mb.sphere(0, 0.1, 0, 0.26, 0.22, 0.45, '#5a7a38', 8, 6, true);
        beam(mb, [0, 0.2, 0.35], [0, 0.55, 0.75], 0.12, '#5a7a38');
        mb.sphere(0, 0.6, 0.85, 0.15, 0.13, 0.22, '#4a6a30', 8, 5, true); mb.box(0, 0.54, 1.05, 0.12, 0.06, 0.18, '#3a5a24');
        [-1, 1].forEach(k => { mb.spike([k * 0.07, 0.7, 0.78], [k * 0.3, 0.6, -1], 0.24, 0.04, 4, '#e8e0c0'); mb.sphere(k * 0.08, 0.64, 1.0, 0.03, 0.03, 0.02, '#ffe040', 5, 3, true); });
        mb.spike([0, 0.1, -0.4], [0, -0.1, -1], 0.8, 0.12, 5, '#5a7a38');
        [-1, 1].forEach(k => mb.box(k * 0.14, -0.14, 0.1, 0.07, 0.2, 0.07, '#3a5a24'));
        mb.box(0, 0.33, 0, 0.05, 0.08, 0.5, '#8aa850');
      }),
      commander: person({ cloth: '#4a2460', legs: '#2a1a38', boots: '#1a1020', shoulders: '#6a3a88', wide: true, arms: ['down', 'up'], extra: mb => {
        mb.sphere(0, 1.18, 0, 0.19, 0.18, 0.19, '#3a3a44', 8, 6, true); mb.box(0, 1.16, 0.17, 0.18, 0.04, 0.04, '#ff4030');
        [-1, 1].forEach(k => { mb.spike([k * 0.15, 1.3, 0], [k, 0.9, 0], 0.32, 0.07, 5, '#e8dcc0'); mb.spike([k * 0.42, 1.52, 0], [k * 0.2, 1, 0.3], 0.34, 0.05, 5, '#e8dcc0'); });   // the great horns
        mb.box(0, 0.7, -0.2, 0.6, 0.9, 0.05, '#8a1a2a');                                                                                                  // cape
        mb.push(); mb.translate(0.44, 1.5, 0.08); mb.rotate(0, 0, -0.3); mb.box(0, 0.35, 0, 0.1, 0.9, 0.03, '#c8ccd8'); mb.box(0, -0.12, 0, 0.3, 0.06, 0.06, '#d0a030'); mb.pop();
      } }),
    };
    MESH.wing = MG.mesh(mb => { mb.tri([0, 0, 0.3], [1.1, 0.1, -0.2], [0, 0, -0.4], '#7a9a48'); }, { cull: false });
    MESH.bomb = MG.mesh(mb => { mb.sphere(0, 0.25, 0, 0.25, 0.25, 0.25, '#202020', 8, 5, true); mb.box(0, 0.55, 0, 0.04, 0.15, 0.04, '#d0a040'); });
    MESH.rock = MG.mesh(mb => mb.sphere(0, 0, 0, 0.22, 0.22, 0.22, '#808080', 6, 4, false));
    MESH.arrow = MG.mesh(mb => mb.box(0, 0, 0, 0.04, 0.04, 0.6, '#d0c0a0'));
    return MESH;
  }

  // ------------------------------------------------------------------ the game
  class CondorGame {
    constructor(opts, scene) {
      this.opts = opts; this.scene = scene;
      this.battle = U.clamp(opts.battle || 1, 1, 21);
      this.final = !!opts.final;
      this.gil = opts.gil != null ? opts.gil : (FF7.state ? FF7.state.gil || 0 : 6000);
      this.maxUnits = MAX_UNITS; this.hpMul = 1; this.moveMul = 1;
      // Condor Command: the stage's budget and rules (Endless: rounds, the budget topped up after each)
      this.arcade = opts.arcade || null;
      if (this.arcade) {
        this.endless = !!this.arcade.endless;
        this.stageNo = this.endless ? STAGES.length + 1 : U.clamp(this.arcade.stage || 1, 1, STAGES.length);
        this.st = this.endless ? { name: 'Endless', budget: 6000, waves: 6, cmd: 0 } : STAGES[this.stageNo - 1];
        this.gil = this.st.budget; this.maxUnits = this.st.max || MAX_UNITS;
        this.hpMul = this.st.hp || 1; this.moveMul = this.st.fast || 1;
        this.round = 1;
      }
      this.startGil = this.gil;
      this.t = 0; this.done = false; this.cam = new MG.Cam(); this.fx = new MG.Particles();
      this.phase = 'setup';            // setup -> battle -> end
      this.cur = [4, 5]; this.menu = null; this.moveUnit = null;
      this.allies = []; this.enemies = []; this.bombs = []; this.shots = []; this.pops = [];
      this.speed = 1; this.clock = 0; this.kills = 0; this.lost = 0; this.hired = 0; this.msg = null;
      this.waves = this.makeWaves();
      this.spawned = 0;
    }
    // the arcade's waves: the stage's count, mix and pace; commanders last (Endless: round r, from the clock t0)
    arcadeWaves(st, t0, r) {
      const rnd = MG.rng('condor-cc-' + this.stageNo + '-' + (r || 0) + '-' + Math.floor(Math.random() * 3));
      const mix = st.mix || [1, 1, 1], total = mix[0] + mix[1] + mix[2];
      const pick = () => { let k = rnd() * total; for (let i = 0; i < 3; i++) { if ((k -= mix[i]) < 0) return ['beast', 'barbarian', 'wyvern'][i]; } return 'wyvern'; };
      const list = [];
      let t = t0;
      for (let i = 0; i < st.waves; i++) {
        list.push({ t, type: pick(), col: PATHS[Math.floor(rnd() * 3)] });
        t += Math.round((150 + Math.floor(rnd() * 120)) * (st.pace || 1));
        if (rnd() < 0.25) list.push({ t: t - 40, type: pick(), col: PATHS[Math.floor(rnd() * 3)] });
      }
      for (let k = 0; k < (st.cmd || 0); k++) list.push({ t: t + 200 + k * 90, type: 'commander', col: k === 0 ? 4 : PATHS[Math.floor(rnd() * 3)] });
      return list;
    }
    makeWaves() {
      if (this.arcade) return this.arcadeWaves(this.st, 120, 1);
      const n = this.final ? 30 : Math.min(24, 7 + Math.round(this.battle * 1.0));
      const rnd = MG.rng('condor-' + (this.final ? 'final' : this.battle) + '-' + Math.floor(Math.random() * 3));
      const list = [];
      let t = 120;
      for (let i = 0; i < n; i++) {
        const type = ['beast', 'barbarian', 'wyvern'][Math.floor(rnd() * 3)];
        list.push({ t, type, col: PATHS[Math.floor(rnd() * 3)] });
        t += (this.final ? 110 : 150) + Math.floor(rnd() * 120);
        if (rnd() < 0.25) { list.push({ t: t - 40, type: ['beast', 'barbarian', 'wyvern'][Math.floor(rnd() * 3)], col: PATHS[Math.floor(rnd() * 3)] }); }
      }
      list.push({ t: t + 200, type: 'commander', col: 4 });
      if (this.final) list.push({ t: t + 260, type: 'commander', col: PATHS[Math.floor(rnd() * 3)] });
      return list;
    }
    available(k) {
      const d = ALLY[k];
      if (this.arcade) return (!this.st.only || this.st.only.includes(k)) && (this.endless || !ARCADE_FROM[k] || this.stageNo >= ARCADE_FROM[k]);
      return !d.from || this.final || this.battle >= d.from;
    }
    allyAt(c, r) { return this.allies.find(a => a.hp > 0 && a.c === c && a.r === r); }
    enemiesAt(c, r) { return this.enemies.filter(e => e.hp > 0 && e.c === c && e.r === r); }
    placeable(c, r) { return c >= 0 && c < COLS && r >= PLACE_MIN && r <= PLACE_MAX && !this.allyAt(c, r); }
    hire(kind, c, r) {
      const d = ALLY[kind];
      if (this.gil < d.cost || this.allies.filter(a => a.hp > 0).length >= this.maxUnits || !this.placeable(c, r) || !this.available(kind)) { MG.sfx('error'); return false; }
      this.gil -= d.cost; this.hired += d.cost;
      const p = cellPos(c, r);
      this.allies.push({ kind, d, c, r, home: [c, r], hp: d.hp, cd: 30 + U.rand(30), mv: 0, vis: p.slice(), face: 0, bomb: null, anim: 0 });   // (facing down the slope, at the enemy)
      MG.sfx('purchase', 0.6);
      return true;
    }
    dismiss(a, refund) { a.hp = 0; a.gone = true; if (refund) { this.gil += a.d.cost; this.hired -= a.d.cost; } MG.sfx('cancel'); }

    // ---------------------------------------------------------------- input
    update(I) {
      this.t++;
      this.fx.update();
      if (this.msg && --this.msg.t <= 0) this.msg = null;
      if (this.phase === 'end') { if (++this.endT > 120) this.complete(); return; }
      this.input(I);
      if (this.phase === 'battle') for (let k = 0; k < this.speed; k++) this.sim();
    }
    input(I) {
      const cur = this.cur;
      if (this.menu) return this.menuInput(I);
      if (I.repeat('left')) cur[0] = Math.max(0, cur[0] - 1);
      if (I.repeat('right')) cur[0] = Math.min(COLS - 1, cur[0] + 1);
      if (I.repeat('up')) cur[1] = Math.max(0, cur[1] - 1);
      if (I.repeat('down')) cur[1] = Math.min(ROWS - 1, cur[1] + 1);
      if (I.pressed('l1')) { this.speed = Math.max(1, this.speed - 1); MG.sfx('cursor'); }
      if (I.pressed('r1')) { this.speed = Math.min(3, this.speed + 1); MG.sfx('cursor'); }
      if (this.moveUnit) {
        if (I.pressed('ok')) { const a = this.moveUnit; if (!this.allyAt(cur[0], cur[1])) { a.order = [cur[0], cur[1]]; a.home = [cur[0], cur[1]]; MG.sfx('confirm'); } else MG.sfx('error'); this.moveUnit = null; }
        else if (I.pressed('cancel')) { this.moveUnit = null; MG.sfx('cancel'); }
        return;
      }
      if (I.pressed('ok')) {
        const a = this.allyAt(cur[0], cur[1]);
        if (a) { this.menu = { kind: 'unit', unit: a, idx: 0, items: this.unitMenu(a) }; MG.sfx('confirm'); }
        else if (this.placeable(cur[0], cur[1])) { this.menu = { kind: 'hire', idx: 0, items: Object.keys(ALLY).filter(k => this.available(k)) }; MG.sfx('confirm'); }
        else MG.sfx('error');
      }
      if (this.phase === 'setup' && I.pressed('square')) {
        // with no troops the first press only warns (a second press starts anyway, so it can't soft-lock)
        if (!this.allies.some(a => a.hp > 0) && !this.warned) { this.warned = true; this.msg = { text: 'No troops! Press ' + MG.btn('square') + ' again to fight anyway.', t: 120 }; MG.sfx('error'); }
        else { this.phase = 'battle'; this.msg = { text: 'Here they come!', t: 90 }; MG.sfx('alarm_short', 0.6); }
      }
    }
    unitMenu(a) {
      const items = [];
      if (!a.d.fixed) items.push('Move');
      if (a.kind === 'worker') items.push('Lay bomb');
      items.push(this.phase === 'setup' ? 'Dismiss' : a.d.fixed ? 'Dismantle' : 'Retreat');
      items.push('Cancel');
      return items;
    }
    menuInput(I) {
      const m = this.menu;
      if (I.repeat('up')) { m.idx = (m.idx + m.items.length - 1) % m.items.length; MG.sfx('cursor'); }
      if (I.repeat('down')) { m.idx = (m.idx + 1) % m.items.length; MG.sfx('cursor'); }
      if (I.pressed('cancel')) { this.menu = m.back || null; MG.sfx('cancel'); return; }
      if (!I.pressed('ok')) return;
      const it = m.items[m.idx];
      // the hire list opens the troop's card (what it does, its numbers); the card places it, or goes back
      if (m.kind === 'hire') { this.menu = { kind: 'confirm', unit: it, idx: 0, items: ['Place it here', 'Back'], back: m }; MG.sfx('confirm'); return; }
      if (m.kind === 'confirm') {
        if (m.idx === 1) { this.menu = m.back; MG.sfx('cancel'); return; }
        if (this.hire(m.unit, this.cur[0], this.cur[1])) this.menu = null;
        return;
      }
      const a = m.unit;
      if (it === 'Move') { this.moveUnit = a; MG.sfx('confirm'); }
      else if (it === 'Lay bomb') { this.layBomb(a); }
      else if (it === 'Dismiss' || it === 'Dismantle' || it === 'Retreat') this.dismiss(a, this.phase === 'setup');
      else MG.sfx('cancel');
      this.menu = null;
    }
    layBomb(a) {
      if (a.bomb && !a.bomb.used) { MG.sfx('error'); return; }
      const r = Math.min(ROWS - 1, a.r + 1);
      a.bomb = { c: a.c, r, used: false };
      this.bombs.push(a.bomb);
      MG.sfx('set');
    }

    // ---------------------------------------------------------------- simulation (one tick)
    sim() {
      this.clock++;
      // spawns
      while (this.spawned < this.waves.length && this.waves[this.spawned].t <= this.clock) {
        const w = this.waves[this.spawned++], d = ENEMY[w.type];
        const hp = Math.round((w.type === 'commander' && this.final ? Math.round(d.hp * 1.5) : d.hp + (this.final ? 20 : 0)) * this.hpMul * (w.hpMul || 1));
        this.enemies.push({ kind: w.type, d, ti: ET.indexOf(w.type), c: w.col, r: ROWS - 1, hp, maxHp: hp, cd: 40, mv: 0, move: Math.round(d.move * this.moveMul), vis: cellPos(w.col, ROWS + 0.5), face: 0, anim: 0 });
        if (w.type === 'commander') this.msg = { text: 'Their commander is coming!', t: 100 };
      }
      const live = this.enemies.filter(e => e.hp > 0), mine = this.allies.filter(a => a.hp > 0);
      const dist = (a, b) => Math.max(Math.abs(a.c - b.c), Math.abs(a.r - b.r));
      // ---- enemies
      for (const e of live) {
        if (e.hp <= 0) continue;   // (a bomb got it this tick)
        e.cd--; e.mv++;
        // ranged enemies (Barbarians, 1~3) shoot while they advance; everyone stops when engaged in melee
        const targets = mine.filter(a => dist(a, e) <= e.d.range);
        if (targets.length) {
          if (e.cd <= 0) {
            const a = targets.sort((x, y) => dist(x, e) - dist(y, e) || x.hp - y.hp)[0];
            const dmg = a.d.taken[e.ti];
            a.hp -= dmg; e.anim = 16; a.hit = 10; e.face = Math.atan2(a.c - e.c, a.r - e.r);
            if (e.d.range > 1 && dist(a, e) > 1) this.shots.push({ from: this.visPos(e, 1.2), to: this.visPos(a, 0.8), t: 0, n: 20, mesh: 'arrow' });
            if (a.hp <= 0) { this.lost++; this.fx.burst(this.visPos(a, 0.5), 10, '#ffffff', 0.08, 20, 0.2, 0.004, 'alpha'); }
            e.cd = TICK + U.rand(20);
          }
          if (targets.some(a => dist(a, e) <= 1)) continue;
        }
        if (e.mv >= (e.move || e.d.move)) {
          e.mv = 0;
          let nc = e.c;
          if (e.r <= 4) nc += Math.sign(4 - e.c);         // converge on the shack
          const nr = e.r - 1;
          const blocked = !e.d.fly && this.allyAt(nc, nr);
          if (!blocked) {
            e.c = nc; e.r = nr;
            // worker bombs
            for (const b of this.bombs) if (!b.used && !e.d.fly && b.c === e.c && b.r === e.r) {   // (Wyverns fly over)
              b.used = true;
              for (const o of this.enemies) if (o.hp > 0 && !o.d.fly && dist(o, b) <= 1) {
                const n = ALLY.worker.bomb[o.ti]; o.hp -= n; o.hit = 10;
                this.pops.push({ u: o, h: 2.2, text: '-' + n, t: 0, col: '255,170,80' });
                if (o.hp <= 0) this.kills++;
              }
              const p = cellPos(b.c, b.r);
              this.fx.burst([p[0], p[1] + 0.3, p[2]], 34, '#ffb040', 0.24, 28, 0.45, 0.006, 'add'); this.fx.burst([p[0], p[1] + 0.3, p[2]], 16, '#505050', 0.1, 50, 0.6, -0.002);
              MG.sfx('fire2', 0.8);
            }
            if (e.r <= 0) { this.lose(e); return; }
          }
        }
      }
      // ---- allies
      for (const a of mine) {
        a.cd--; a.mv++;
        if (a.hit > 0) a.hit--;
        // the Repairer, a medic: it patches up the most hurt troop or machine beside it (the front line too) and
        // only fights back when nobody needs it
        const hurt = (o) => o.hp < (o.maxHp || o.d.hp);
        if (a.d.heal && !a.order) {
          const pt = mine.filter(o => o !== a && dist(o, a) <= 1 && hurt(o)).sort((x, y) => x.hp / (x.maxHp || x.d.hp) - y.hp / (y.maxHp || y.d.hp))[0];
          if (pt) { if (a.cd <= 0) this.heal(a, pt); continue; }
        }
        const inRange = live.filter(e => e.hp > 0 && dist(e, a) <= a.d.range);
        if (inRange.length) {
          if (a.cd <= 0) {
            const e = inRange.sort((x, y) => dist(x, a) - dist(y, a) || x.hp - y.hp)[0];
            const dmg = a.d.dmg[e.ti];
            a.face = Math.atan2(e.c - a.c, e.r - a.r); a.anim = 16;
            if (a.d.fixed || a.d.range > 1) this.shots.push({ from: this.visPos(a, 1.2), to: this.visPos(e, 0.6), t: 0, n: a.d.fixed ? 40 : 18, mesh: a.d.fixed ? 'rock' : 'arrow', arc: a.d.fixed ? 3 : 0.4, fire: a.kind === 'fcatapult' });
            e.hp -= dmg; e.hit = 10;
            if (e.hp <= 0) { this.kills++; this.fx.burst(this.visPos(e, 0.6), 12, '#ffe0a0', 0.1, 22, 0.2, 0.006); MG.sfx('death', 0.5); }
            a.cd = a.d.fixed ? a.d.reload : 72 + U.rand(16);
          }
          continue;
        }
        if (a.kind === 'worker' && (!a.bomb || a.bomb.used) && a.cd <= -60) { this.layBomb(a); a.cd = 0; }
        if (a.d.fixed) continue;
        // move: ordered destination, chase an enemy within 2 cells, or return home
        if (a.mv < a.d.move) continue;
        a.mv = 0;
        let goal = a.order || null;
        if (!goal && a.d.heal) {   // (the Repairer goes to the most hurt troop near its post, not to the fight)
          const home = { c: a.home[0], r: a.home[1] }, pt = mine.filter(o => o !== a && hurt(o) && dist(o, home) <= 4).sort((x, y) => x.hp / (x.maxHp || x.d.hp) - y.hp / (y.maxHp || y.d.hp))[0];
          goal = pt ? [pt.c, pt.r] : a.home;
        }
        if (!goal && a.kind === 'worker') goal = a.home;   // (a sapper keeps behind its bomb: it lets the foe come to it)
        if (!goal) { const near = live.filter(e => dist(e, { c: a.home[0], r: a.home[1] }) <= 3).sort((x, y) => dist(x, a) - dist(y, a))[0]; goal = near ? [near.c, near.r] : a.home; }
        if (goal[0] === a.c && goal[1] === a.r) { if (a.order) a.order = null; continue; }
        const nc = a.c + Math.sign(goal[0] - a.c), nr = a.r + Math.sign(goal[1] - a.r);
        if (!this.allyAt(nc, nr) && !this.enemiesAt(nc, nr).length) { a.c = nc; a.r = nr; }
        else if (nc !== a.c && !this.allyAt(nc, a.r) && !this.enemiesAt(nc, a.r).length) a.c = nc;
        else if (nr !== a.r && !this.allyAt(a.c, nr) && !this.enemiesAt(a.c, nr).length) a.r = nr;
        if (a.order && a.c === a.order[0] && a.r === a.order[1]) a.order = null;
      }
      this.allies = this.allies.filter(a => a.hp > 0 || (a.fade = (a.fade || 0) + 1) < 40);
      this.enemies = this.enemies.filter(e => e.hp > 0 || (e.fade = (e.fade || 0) + 1) < 40);
      for (const s of this.shots) s.t++;
      this.pops = this.pops.filter(p => ++p.t < 50);
      this.shots = this.shots.filter(s => s.t < s.n);
      // win? (Endless: the next round, a little bigger and tougher, and more budget)
      if (this.spawned >= this.waves.length && !this.enemies.some(e => e.hp > 0)) {
        if (!this.endless) { this.win(); return; }
        const r = ++this.round, bonus = 1500 + r * 150;
        this.gil += bonus;
        const st = { waves: 5 + r, mix: [1, 1, 1], pace: Math.max(0.6, 1 - r * 0.03), cmd: r % 3 === 0 ? 1 + Math.floor(r / 9) : 0 };
        this.waves = this.waves.concat(this.arcadeWaves(st, this.clock + 300, r).map(w => Object.assign(w, { hpMul: 1 + (r - 1) * 0.07 })));
        this.msg = { text: `Round ${r}!  +${U.fmtNum(bonus)} budget`, t: 150 };
        MG.sfx('levelup', 0.6);
      }
    }
    visPos(u, h) { return [u.vis[0], u.vis[1] + (h || 0), u.vis[2]]; }
    // a Repairer's heal: a green stream from its staff, sparkles rising round the patient, the HP it got back
    heal(a, o) {
      const n = Math.min(a.d.heal, (o.maxHp || o.d.hp) - o.hp);
      o.hp += n; a.cd = TICK + U.rand(10); a.anim = 16; a.face = Math.atan2(o.c - a.c, o.r - a.r);
      const from = this.visPos(a, 1.5), to = this.visPos(o, 1.0);
      for (let i = 0; i < 8; i++) { const k = i / 8; this.fx.add([U.lerp(from[0], to[0], k), U.lerp(from[1], to[1], k), U.lerp(from[2], to[2], k)], [0, 0.01, 0], 14 + i * 2, '#70ff90', 0.16, 0, 'add'); }
      this.fx.burst(this.visPos(o, 0.6), 12, '#90ffa0', 0.04, 34, 0.14, -0.0015, 'add');
      this.pops.push({ u: o, h: 2.4, text: '+' + n, t: 0 });
      MG.sfx('heal', 0.3);
    }
    win() { this.phase = 'end'; this.endT = 0; this.won = true; this.msg = { text: 'The Shinra army retreats!', t: 120 }; MG.sfx('levelup'); }
    lose(e) { this.phase = 'end'; this.endT = 0; this.won = false; this.msg = { text: `${e.d.name} reached the shack!`, t: 120 }; MG.sfx('alarm'); }
    complete() {
      if (this.done) return;
      const survivors = this.allies.filter(a => a.hp > 0 && !a.gone);
      if (this.arcade) {   // (nothing to charge: the budget was the stage's). GP: the clear, a bonus per troop standing
        const rounds = this.endless ? this.round - 1 : 0;
        const gp = this.endless ? rounds * 3 : this.won ? this.st.gp + survivors.length : 0;
        this.result = { won: !!this.won, stage: this.stageNo, endless: this.endless, rounds, gp, score: this.endless ? rounds : gp, kills: this.kills, lost: this.lost, standing: survivors.length, spent: 0 };
        this.done = true;
        return;
      }
      const refund = this.won ? survivors.reduce((s, a) => s + Math.floor(a.d.cost / 2), 0) : 0;
      const spent = Math.max(0, this.hired - refund);
      const score = this.kills * 10 + (this.won ? 100 + survivors.length * 20 : 0);
      this.result = { won: !!this.won, score, spent, refund, kills: this.kills, lost: this.lost, hired: this.hired };
      this.done = true;
    }
    idle() { this.fx.update(); }

    // ---------------------------------------------------------------- bot: hire a sensible line-up, then start
    bot() {
      if (this.phase !== 'setup' && this.phase !== 'battle') return [];
      if (!this.botPlan) {
        const plan = [['defender', 1, 6], ['defender', 4, 6], ['defender', 7, 6], ['shooter', 2, 5], ['shooter', 6, 5], ['fighter', 4, 5], ['stoner', 4, 3], ['attacker', 1, 5], ['attacker', 7, 5], ['defender', 3, 6], ['defender', 5, 6], ['shooter', 4, 4], ['repairer', 2, 4], ['repairer', 6, 4], ['catapult', 2, 2], ['catapult', 6, 2], ['defender', 0, 6], ['defender', 8, 6], ['fighter', 3, 5], ['fighter', 5, 5]];
        this.botPlan = plan.filter(p => this.available(p[0]));
        this.botStep = 0;
      }
      if (this.t % 4) return [];
      // during battle: occasionally replace fallen troops
      if (this.menu) {
        if (this.menu.kind === 'confirm') return [this.menu.idx === 0 ? 'ok' : 'up'];
        if (this.menu.kind === 'hire') { const want = this.botWant; const idx = this.menu.items.indexOf(want); if (idx < 0) return ['cancel']; if (this.menu.idx !== idx) return [idx > this.menu.idx ? 'down' : 'up']; return ['ok']; }
        return ['cancel'];
      }
      const next = this.botPlan.find(p => !this.allyAt(p[1], p[2]) && ALLY[p[0]].cost <= this.gil - (this.phase === 'setup' ? 0 : 300));
      if (next && this.allies.filter(a => a.hp > 0).length < this.maxUnits && (this.phase === 'setup' || this.t % 240 < 8)) {
        this.botWant = next[0];
        if (this.cur[0] < next[1]) return ['right']; if (this.cur[0] > next[1]) return ['left'];
        if (this.cur[1] < next[2]) return ['down']; if (this.cur[1] > next[2]) return ['up'];
        return ['ok'];
      }
      if (this.phase === 'setup') return ['square'];
      if (this.speed < 3) return ['r1'];
      return [];
    }
    debugLog() { return `phase=${this.phase} clock=${this.clock} gil=${this.gil} allies=${this.allies.filter(a => a.hp > 0).length} enemies=${this.enemies.filter(e => e.hp > 0).length} spawned=${this.spawned}/${this.waves.length} kills=${this.kills}`; }

    // ---------------------------------------------------------------- render
    render() {
      const M = meshes();
      MG.sky('#6a98d0', '#e8d8b8');
      this.cam.set([0, 25, 23], [0, 3.5, -6.5], 44, 0.5, 300);
      GL.begin({ clear: [0, 0, 0, 0], fog: { color: [0.88, 0.86, 0.8], near: 60, far: 160 }, light: { dir: [-0.4, -0.8, -0.3], color: [0.72, 0.68, 0.6], ambient: [0.5, 0.5, 0.52] } });
      this.cam.apply();
      GL.draw(M.hill, null);
      // placement zone highlight during setup
      const cp = cellPos(this.cur[0], this.cur[1]);
      MG.put(M.cursor, [cp[0], cp[1] + 0.12, cp[2]], [SLOPE, 0, 0], 1, { tint: this.moveUnit ? [0.4, 1, 0.4, 1] : [1, 0.95, 0.4, 1] });
      for (const b of this.bombs) if (!b.used) { const p = cellPos(b.c, b.r); MG.put(M.bomb, p); }
      // (units glide to their square, keeping pace with the game speed and never more than half a square behind it,
      // so a blow, a heal or a bomb happens where the unit is seen)
      const ease = 1 - Math.pow(0.92, this.speed);
      const lerpVis = (u) => {
        const g = cellPos(u.c, u.r); for (let k = 0; k < 3; k++) u.vis[k] = U.lerp(u.vis[k], g[k], ease);
        const d = Math.hypot(u.vis[0] - g[0], u.vis[2] - g[2]), max = CELL * 0.45;
        if (d > max) { u.vis[0] = g[0] + (u.vis[0] - g[0]) * max / d; u.vis[2] = g[2] + (u.vis[2] - g[2]) * max / d; }
      };
      for (const a of this.allies) {
        lerpVis(a);
        const k = a.hp > 0 ? 1 : Math.max(0, 1 - a.fade / 40);
        if (k <= 0) continue;
        const bob = a.anim > 0 ? Math.sin(a.anim-- / 16 * Math.PI) * 0.25 : 0;
        MG.shadow(a.vis[0], a.vis[1], a.vis[2], 0.5, 0.3 * k);
        MG.put(M.ally[a.kind], [a.vis[0], a.vis[1], a.vis[2]], [bob * 0.6, a.face, a.hp > 0 ? 0 : 1.4], 1.3, a.hit > 0 ? { add: [0.5, 0.1, 0.1] } : (k < 1 ? { blend: 'alpha', tint: [1, 1, 1, k] } : null));
      }
      for (const e of this.enemies) {
        lerpVis(e);
        const k = e.hp > 0 ? 1 : Math.max(0, 1 - e.fade / 40);
        if (k <= 0) continue;
        const fly = e.d.fly ? 1.4 + Math.sin(this.t * 0.1 + e.c) * 0.2 : 0;
        const sc = e.kind === 'commander' ? 1.75 : 1.3;
        MG.shadow(e.vis[0], e.vis[1], e.vis[2], 0.5 * sc, 0.3 * k);
        const opt = e.hit > 0 ? { add: [0.6, 0.5, 0.2] } : (k < 1 ? { blend: 'alpha', tint: [1, 1, 1, k] } : null);
        if (e.hit > 0) e.hit--;
        const yaw = e.anim > 0 ? e.face : Math.PI;
        if (e.anim > 0) e.anim--;
        MG.put(M.enemy[e.kind], [e.vis[0], e.vis[1] + fly, e.vis[2]], [0, yaw, e.hp > 0 ? 0 : 1.4], sc, opt);
        if (e.d.fly) { const fl = Math.sin(this.t * 0.3 + e.c) * 0.6; MG.put(M.wing, [e.vis[0], e.vis[1] + fly + 0.1, e.vis[2]], [0, yaw, fl], 1); MG.put(M.wing, [e.vis[0], e.vis[1] + fly + 0.1, e.vis[2]], [0, yaw + Math.PI, fl], [1, 1, -1]); }
      }
      for (const s of this.shots) {
        const k = s.t / s.n, p = [U.lerp(s.from[0], s.to[0], k), U.lerp(s.from[1], s.to[1], k) + Math.sin(k * Math.PI) * (s.arc || 0), U.lerp(s.from[2], s.to[2], k)];
        MG.put(M[s.mesh], p, [0, Math.atan2(s.to[0] - s.from[0], s.to[2] - s.from[2]), 0], 1, s.fire ? { add: [0.8, 0.3, 0] } : null);
      }
      this.fx.draw();
      GL.end();
      this.renderHUD();
    }
    renderHUD() {
      // HP bars
      for (const u of this.allies.concat(this.enemies)) {
        if (u.hp <= 0) continue;
        const q = this.cam.project([u.vis[0], u.vis[1] + (u.d.fly ? 3.2 : 1.8), u.vis[2]]);
        if (!q.visible) continue;
        const max = u.maxHp || u.d.hp, bw = 28;
        // (a hit: the lost chunk flashes white and drains away, so a sword, a rock or a bomb reads at a glance)
        u.lag = u.lag == null || u.lag < u.hp ? u.hp : Math.max(u.hp, u.lag - max * 0.006);
        R.bar(q.x - bw / 2, q.y, bw, 4, u.hp / max, this.allies.includes(u) ? '#3070e0' : '#e04040', this.allies.includes(u) ? '#80e0ff' : '#ffa060');
        if (u.lag > u.hp) { R.ctx.fillStyle = '#ffffff'; R.ctx.fillRect(q.x - bw / 2 + Math.round(bw * u.hp / max), q.y, Math.max(1, Math.round(bw * (u.lag - u.hp) / max)), 4); }
      }
      for (const p of this.pops) {   // (a Repairer's heals, a bomb's damage)
        const b = p.u ? this.visPos(p.u, p.h) : p.at, q = this.cam.project([b[0], b[1] + p.t * 0.02, b[2]]);   // (over its unit)
        if (q.visible) R.text(p.text, q.x, q.y - 6, { size: p.col ? 17 : 13, align: 'center', color: `rgba(${p.col || '120,255,140'},${Math.min(1, (50 - p.t) / 15)})` });
      }
      // top bar
      R.window(10, 8, 250, 40);
      R.text(this.arcade ? 'BUDGET' : 'GIL', 22, 18, { size: 12, color: R.COL.cyan }); R.text(U.fmtNum(this.gil), 140, 16, { size: 16, align: 'right' });
      R.text('TROOPS', 152, 18, { size: 12, color: R.COL.cyan }); R.text(`${this.allies.filter(a => a.hp > 0).length}/${this.maxUnits}`, 248, 16, { size: 16, align: 'right' });
      R.window(W - 250, 8, 240, 40);
      if (this.phase === 'setup') { R.text('Start the battle', W - 236 + ui.keys(['square'], W - 236, 28, 16) + 4, 18, { size: 14 }); }
      else { R.text(this.endless ? `ROUND ${this.round}` : `ENEMY ${this.enemies.filter(e => e.hp > 0).length + this.waves.length - this.spawned}`, W - 238, 18, { size: 14, color: '#ff9090' }); R.text(`SPEED x${this.speed}`, W - 22, 18, { size: 14, align: 'right' }); }
      // cursor info
      const a = this.allyAt(this.cur[0], this.cur[1]), es = this.enemiesAt(this.cur[0], this.cur[1]);
      const card = this.menu && this.menu.kind === 'confirm';   // (the troop card takes this corner's place)
      if (!card) R.window(10, H - 64, 300, 54);
      if (card) { /* (renderCard) */ } else if (this.moveUnit) R.text('Move where?  ' + MG.btn('ok') + ': OK   ' + MG.btn('cancel') + ': Cancel', 22, H - 56, { size: 14, color: '#80ff80' });
      else if (this.menu && this.menu.kind === 'hire') {   // (what the highlighted troop does)
        const k = this.menu.items[this.menu.idx];
        R.text(ALLY[k].name, 22, H - 58, { size: 15 });
        R.wrap(ROLE[k] || '', 276, 12).slice(0, 2).forEach((l, i) => R.text(l, 22, H - 38 + i * 13, { size: 12, color: R.COL.cyan }));
      }
      else if (a) { R.text(a.d.name, 22, H - 58, { size: 15 }); R.text(`HP ${Math.max(0, a.hp)}/${a.d.hp}`, 296, H - 58, { size: 14, align: 'right' }); R.text(a.d.fixed ? `Range ${a.d.range}  ${a.cd > 0 ? 'Reloading' : 'Ready'}` : a.d.heal ? `Heals ${a.d.heal} HP to the troops beside it${a.order ? '  Moving' : ''}` : a.kind === 'worker' ? `Bomb ${a.bomb && !a.bomb.used ? 'set in front' : 'being made'}${a.order ? '  Moving' : ''}` : `Range ${a.d.range}${a.order ? '  Moving' : ''}`, 22, H - 36, { size: 12, color: R.COL.cyan }); }
      else if (es.length) { const e = es[0]; R.text(e.d.name, 22, H - 58, { size: 15, color: '#ff9090' }); R.text(`HP ${e.hp}/${e.maxHp}`, 296, H - 58, { size: 14, align: 'right' }); }
      else if (this.placeable(this.cur[0], this.cur[1])) { R.text('Hire troops here', 30 + ui.keys(['ok'], 30, H - 37, 16) + 4, H - 46, { size: 14 }); }
      else R.text(this.cur[1] < PLACE_MIN ? 'Fort Condor' : 'Troops can’t be placed here', 22, H - 46, { size: 14, color: R.COL.gray });
      // menus
      if (this.menu && this.menu.kind === 'confirm') { this.renderCard(this.menu); }
      else if (this.menu) {
        const m = this.menu, w = m.kind === 'hire' ? 270 : 170, h = 16 + m.items.length * 22, x = W - w - 14, y = H - h - 70;
        R.window(x, y, w, h);
        m.items.forEach((it, i) => {
          const yy = y + 9 + i * 22;
          if (m.kind === 'hire') { const d = ALLY[it], ok = this.gil >= d.cost; R.text(d.name, x + 34, yy, { size: 14, color: ok ? R.COL.white : R.COL.gray }); R.text(String(d.cost), x + w - 14, yy, { size: 14, align: 'right', color: ok ? R.COL.white : R.COL.gray }); }
          else R.text(it, x + 34, yy, { size: 14 });
          if (i === m.idx) R.cursor(x + 28, yy + 9);
        });
      }
      if (this.msg) ui.big(this.msg.text, 90, this.phase === 'end' && !this.won ? '#ff8080' : '#ffe060', 26, Math.min(1, this.msg.t / 20));
    }
    // a troop's card before it's hired: what it does, its numbers, and Place it here / Back
    renderCard(m) {
      const d = ALLY[m.unit], w = 440, x = Math.round((W - w) / 2), afford = this.gil >= d.cost, full = this.allies.filter(a => a.hp > 0).length >= this.maxUnits;
      const role = R.wrap(ROLE[m.unit] || '', w - 36, 14);
      const dmg = d.heal ? `Heals ${d.heal} HP to each troop beside it, again and again` : m.unit === 'worker' ? `Bomb: Beast ${d.bomb[0]}, Barbarian ${d.bomb[1]}, Commander ${d.bomb[3]}` : `Damage: Beast ${d.dmg[0]}, Barbarian ${d.dmg[1]}, Wyvern ${d.dmg[2]}, Commander ${d.dmg[3]}`;
      const h = 150 + role.length * 18, y = H - h - 10;   // (at the bottom, clear of the square it goes on)
      R.window(x, y, w, h);
      R.text(d.name, x + 18, y + 12, { size: 20 });
      R.text((this.arcade ? 'Budget ' : 'Gil ') + d.cost, x + w - 18, y + 14, { size: 15, align: 'right', color: afford ? R.COL.white : '#ff8080' });
      role.forEach((l, i) => R.text(l, x + 18, y + 44 + i * 18, { size: 14 }));
      let yy = y + 50 + role.length * 18;
      R.text(`HP ${d.hp}   Range ${d.range}   ${d.fixed ? 'Stays where it is placed' : 'Moves (you can order it about)'}`, x + 18, yy, { size: 13, color: R.COL.cyan });
      R.text(dmg, x + 18, yy + 18, { size: 13, color: R.COL.cyan });
      yy += 46;
      const why = !afford ? 'Not enough ' + (this.arcade ? 'budget' : 'Gil') : full ? 'No room for more troops' : '';
      m.items.forEach((it, i) => {
        const off = i === 0 && why;
        R.text(off ? `${it}  (${why})` : it, x + 44, yy + i * 22, { size: 15, color: off ? R.COL.gray : R.COL.white });
        if (i === m.idx) R.cursor(x + 38, yy + i * 22 + 9);
      });
    }
    resultTitle(r) {
      if (this.arcade) return r.endless ? `${r.rounds} ROUND${r.rounds === 1 ? '' : 'S'} HELD!` : r.won ? 'STAGE CLEAR!' : 'THEY BROKE THROUGH!';
      return r.won ? 'VICTORY!' : 'THEY BROKE THROUGH!';
    }
    resultRows(r) {
      if (this.arcade) return (r.endless ? [['Rounds held', r.rounds]] : [['Stage', `${r.stage}: ${this.st.name}`]])
        .concat([['Enemies defeated', r.kills], ['Troops lost', r.lost], ['Troops standing', r.standing], ['GP', r.gp, '#ffe060']]);
      return [['Enemies defeated', r.kills], ['Troops lost', r.lost], ['Gil spent', U.fmtNum(r.hired)], ['Refund (half of survivors)', U.fmtNum(r.refund)], ['Net cost', U.fmtNum(r.spent), '#ffe060']];
    }
  }

  MG.register('fort_condor', {
    title: 'Fort Condor',
    music: () => 'condor',
    help: (o) => ({
      title: o.final ? 'FORT CONDOR  -  THE HUGE MATERIA' : 'FORT CONDOR',
      lines: ['Hire troops with your Gil and place them on the upper half of the slope. Don’t let a single enemy reach the shack at the top!',
        'Attackers beat Beasts, Defenders beat Barbarians, Shooters beat Wyverns. Surviving troops refund half their cost if you win.'],
      controls: [[['up', 'down', 'left', 'right'], 'Move cursor'], [['ok'], 'Hire troops / give orders'], [['square'], 'Start the battle'], [['l1', '/', 'r1'], 'Game speed']],
    }),
    create: (opts, scene) => new CondorGame(opts, scene),
  });

  // Condor Command: the arcade version (the Gold Saucer's Wonder Square). opts: { stage } | { endless: true }
  MG.register('condor_command', {
    title: 'Condor Command',
    music: () => 'condor',
    help: (o) => {
      const st = o.endless ? null : STAGES[U.clamp(o.stage || 1, 1, STAGES.length) - 1];
      return {
        title: o.endless ? 'CONDOR COMMAND  -  ENDLESS' : `CONDOR COMMAND  -  STAGE ${U.clamp(o.stage || 1, 1, STAGES.length)}: ${st.name.toUpperCase()}`,
        lines: [o.endless ? 'Round after round, each bigger than the last, with more budget between them. How long can you hold?' : `${st.twist}  Budget: ${U.fmtNum(st.budget)}.`,
          'Hire troops with the budget and hold the slope. Attackers beat Beasts, Defenders beat Barbarians, Shooters beat Wyverns.'],
        controls: [[['up', 'down', 'left', 'right'], 'Move cursor'], [['ok'], 'Hire troops / give orders'], [['square'], 'Start the battle'], [['l1', '/', 'r1'], 'Game speed']],
      };
    },
    create: (opts, scene) => new CondorGame({ arcade: opts }, scene),
  });
})();
