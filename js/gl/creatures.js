// Low-poly 3D enemy models generated from an enemy's `look` spec:
//   { type, c1, c2, c3, size, variant, id }  (see docs/DATA_SCHEMA.md)
//   FF7.creatures.build(look, seedName) -> FF7.Model (faces +z, feet at y=0, ~1.5*size tall)
(function () {
  const U = FF7.util, MB = FF7.MeshBuilder;
  const CR = FF7.creatures = {};
  const meshOf = (fn) => { const mb = new MB(); fn(mb); return mb.build(); };
  const sh = U.shade;

  // Generic enemy animation (works on any enemy model via optional bones)
  const S = Math.sin, PI = Math.PI;
  FF7.anims.e_idle = { dur: 80, fn(m, p, f) {
    const s = S(p * PI * 2);
    m.b('root').pos[1] += (m.floats ? 0.06 + s * 0.05 : s * 0.01);
    m.b('body').rot[0] += s * 0.03;
    m.b('head').rot[0] += S(p * PI * 2 + 1) * 0.05;
    m.b('wingL').rot[2] += s * 0.5; m.b('wingR').rot[2] -= s * 0.5;
    m.b('tail').rot[1] += s * 0.25;
    m.b('armL').rot[0] += s * 0.1; m.b('armR').rot[0] -= s * 0.1;
    m.b('legFL').rot[0] += s * 0.05; m.b('legBR').rot[0] += s * 0.05;
    for (let i = 0; i < 8; i++) { const b = m.bones['t' + i]; if (b) b.rot[0] += S(p * PI * 2 + i) * 0.3; }
    for (let i = 0; i < 6; i++) { const b = m.bones['seg' + i]; if (b) b.rot[1] += S(p * PI * 2 + i * 0.8) * 0.15; }
  } };
  FF7.anims.e_attack = { dur: 26, loop: false, fn(m, p) {
    FF7.anims.e_idle.fn(m, 0);
    const k = S(Math.min(1, p) * PI);
    m.b('root').pos[2] += k * 0.35 * (m.lungeScale || 1);
    m.b('body').rot[0] += k * 0.3;
    m.b('head').rot[0] -= k * 0.4;
    m.b('armL').rot[0] -= k * 1.4; m.b('armR').rot[0] -= k * 1.2;
    m.b('jaw').rot[0] += k * 0.6;
    m.b('wingL').rot[2] += k * 0.8; m.b('wingR').rot[2] -= k * 0.8;
    m.b('tail').rot[0] -= k * 0.8;
  } };
  FF7.anims.e_cast = { dur: 36, loop: false, fn(m, p) {
    FF7.anims.e_idle.fn(m, 0);
    const k = S(Math.min(1, p) * PI);
    m.b('body').rot[0] -= k * 0.25; m.b('head').rot[0] -= k * 0.4;
    m.b('armL').rot[0] -= k * 2.2; m.b('armR').rot[0] -= k * 2.2;
    m.b('wingL').rot[2] += k * 1.0; m.b('wingR').rot[2] -= k * 1.0;
  } };
  FF7.anims.e_hurt = { dur: 16, loop: false, fn(m, p) {
    FF7.anims.e_idle.fn(m, 0);
    const k = S(Math.min(1, p) * PI);
    m.b('root').pos[2] -= k * 0.12; m.b('body').rot[0] -= k * 0.2;
  } };

  function base(m, a) {
    m.bone('root', null, [0, 0, 0]);
    m.anims = { idle: 'e_idle', attack: 'e_attack', cast: 'e_cast', hurt: 'e_hurt', dead: 'e_idle', battle: 'e_idle' };
    m.showWeapon = () => {};
    return m;
  }

  // ---------------------------------------------------------------- archetypes
  const T = {};

  // Shinra soldiers & humanoid enemies reuse the character builder
  T.soldier = (a) => {
    const m = FF7.chars3d.build({ base: 'soldier', top: a.c1 || '#3a5a8a', sleeve: a.c1 || '#3a5a8a', bottom: a.c1 || '#3a5a8a', hair: a.c2 || a.c1 || '#3a5a8a', boots: '#2a2a30', weapon: a.variant === 1 ? 'rod' : 'rifle' }, { style: 'battle' });
    m.showWeapon(true); m.enemyHuman = true; m.play('battle');
    m.scale = 1.55; return m;
  };
  T.humanoid = (a) => {
    const v = a.variant || 0;
    const m = FF7.chars3d.build({ base: 'man', skin: a.c3 && v === 2 ? a.c3 : (v === 1 ? a.c1 : '#e0b090'), hair: a.c2 || '#202020', hairStyle: ['short', 'bald', 'spikyback', 'long'][v % 4], top: a.c1, sleeve: a.c1, bottom: a.c2 || sh(a.c1, -0.3), boots: sh(a.c2 || a.c1, -0.4), weapon: v === 3 ? 'rod' : 'buster' }, { style: 'battle' });
    m.showWeapon(true); m.enemyHuman = true; m.play('battle'); m.scale = 1.6; return m;
  };
  T.giant = (a) => {
    const m = FF7.chars3d.build({ base: 'man', build: 'big', skin: a.c1, hair: a.c2 || '#303030', hairStyle: 'bald', top: a.c1, sleeve: 'skin', bottom: a.c2 || sh(a.c1, -0.3), boots: sh(a.c1, -0.4), extras: ['beard'] }, { style: 'battle' });
    m.enemyHuman = true; m.play('battle'); m.scale = 2.4; return m;
  };
  T.skeleton = (a) => {
    const m = FF7.chars3d.build({ base: 'man', build: 'slim', skin: a.c1 || '#e0dcc8', hair: a.c1 || '#e0dcc8', hairStyle: 'bald', top: a.c1 || '#e0dcc8', sleeve: a.c1 || '#e0dcc8', bottom: a.c1 || '#e0dcc8', boots: a.c1 || '#e0dcc8', eyes: '#f02020', weapon: 'buster' }, { style: 'battle' });
    m.showWeapon(true); m.enemyHuman = true; m.play('battle'); m.scale = 1.6; return m;
  };

  T.beast = (a, R) => { // dogs, wolves, cats — quadruped with jaw and tail
    const m = base(new FF7.Model(), a);
    const C1 = a.c1 || '#707060', C2 = a.c2 || sh(C1, -0.25), C3 = a.c3 || '#f0e040';
    const v = a.variant || 0;
    const legH = 0.38, bodyL = 0.7 + v * 0.05;
    m.bone('body', 'root', [0, legH + 0.12, 0]);
    m.bone('head', 'body', [0, 0.12, bodyL * 0.55]);
    m.bone('jaw', 'head', [0, -0.04, 0.08]);
    m.bone('tail', 'body', [0, 0.08, -bodyL * 0.5], [0.5, 0, 0]);
    ['FL', 'FR', 'BL', 'BR'].forEach((k, i) => m.bone('leg' + k, 'body', [(i % 2 ? -1 : 1) * 0.13, -0.02, (i < 2 ? 1 : -1) * bodyL * 0.36]));
    m.attach('body', meshOf(mb => {
      mb.sphere(0, 0, 0, 0.2, 0.17, bodyL * 0.55, C1, 8, 5, true, (i, j) => j < 2 ? sh(C1, 0.08) : j > 3 ? C2 : C1);
      if (v === 1 || v === 3) for (let i = 0; i < 5; i++) mb.spike([0, 0.15, bodyL * (0.3 - i * 0.15)], [0, 1, -0.4], 0.16, 0.05, 4, C2);   // spines
      if (v === 2) mb.sphere(0, 0.1, bodyL * 0.3, 0.26, 0.2, 0.22, C2, 8, 4, false);   // mane
    }));
    m.attach('head', meshOf(mb => {
      mb.sphere(0, 0.03, 0.05, 0.14, 0.13, 0.15, C1, 8, 5, true);
      mb.frustum(0, -0.02, 0.18, 0.13, 0.1, 0.09, 0.08, 0.08, C1);
      mb.spike([0.08, 0.12, 0], [0.4, 1, -0.3], 0.13, 0.04, 4, C2); mb.spike([-0.08, 0.12, 0], [-0.4, 1, -0.3], 0.13, 0.04, 4, C2);
      mb.box(0.07, 0.06, 0.15, 0.04, 0.025, 0.02, C3); mb.box(-0.07, 0.06, 0.15, 0.04, 0.025, 0.02, C3);
      if (v === 3) { mb.spike([0.05, 0.12, 0.1], [0.3, 0.8, 0.8], 0.2, 0.03, 4, '#e8e0c8'); mb.spike([-0.05, 0.12, 0.1], [-0.3, 0.8, 0.8], 0.2, 0.03, 4, '#e8e0c8'); }
    }));
    m.attach('jaw', meshOf(mb => { mb.box(0, -0.02, 0.12, 0.1, 0.03, 0.14, sh(C1, -0.2)); mb.spike([0.03, 0, 0.18], [0, 1, 0], 0.03, 0.01, 3, '#f0f0f0'); mb.spike([-0.03, 0, 0.18], [0, 1, 0], 0.03, 0.01, 3, '#f0f0f0'); }));
    m.attach('tail', meshOf(mb => { mb.push(); mb.rotate(-1.3, 0, 0); mb.prism(0, 0, 0, 0.04, 0.015, 0.4, 5, C2); mb.pop(); }));
    const leg = meshOf(mb => { mb.limb(0.08, 0.09, 0.05, 0.06, legH, C1); mb.box(0, -legH, 0.03, 0.08, 0.04, 0.11, C2); });
    ['FL', 'FR', 'BL', 'BR'].forEach(k => m.attach('leg' + k, leg));
    m.height = legH + 0.4; return m;
  };

  T.reptile = (a) => { const m = T.beast(Object.assign({}, a, { variant: 1 })); m.b('tail').rest = [0.1, 0, 0]; m.attach('tail', meshOf(mb => { mb.push(); mb.rotate(-1.5, 0, 0); mb.prism(0, 0.35, 0, 0.03, 0.005, 0.35, 5, a.c2 || '#406030'); mb.pop(); })); return m; };

  T.dragon = (a) => {
    const m = base(new FF7.Model(), a);
    const C1 = a.c1 || '#a02020', C2 = a.c2 || sh(C1, -0.3), C3 = a.c3 || '#f0e040';
    m.bone('body', 'root', [0, 0.75, 0]);
    m.bone('neck', 'body', [0, 0.2, 0.35], [-0.6, 0, 0]);
    m.bone('head', 'neck', [0, 0.45, 0], [0.9, 0, 0]);
    m.bone('jaw', 'head', [0, -0.05, 0.1]);
    m.bone('tail', 'body', [0, 0, -0.45], [0.3, 0, 0]);
    m.bone('wingL', 'body', [0.2, 0.25, 0.05]); m.bone('wingR', 'body', [-0.2, 0.25, 0.05]);
    ['FL', 'FR', 'BL', 'BR'].forEach((k, i) => m.bone('leg' + k, 'body', [(i % 2 ? -1 : 1) * 0.22, -0.1, (i < 2 ? 1 : -1) * 0.3]));
    m.attach('body', meshOf(mb => { mb.sphere(0, 0, 0, 0.32, 0.3, 0.55, C1, 8, 6, true, (i, j) => j > 3 ? C3 : C1); for (let i = 0; i < 5; i++) mb.spike([0, 0.28, 0.3 - i * 0.18], [0, 1, -0.5], 0.18, 0.05, 4, C2); }));
    m.attach('neck', meshOf(mb => mb.prism(0, 0, 0, 0.14, 0.1, 0.5, 6, C1, true)));
    m.attach('head', meshOf(mb => {
      mb.sphere(0, 0.05, 0.05, 0.16, 0.14, 0.2, C1, 8, 5, true);
      mb.frustum(0, 0, 0.2, 0.18, 0.2, 0.1, 0.06, 0.1, C1);
      mb.spike([0.1, 0.12, -0.05], [0.4, 0.6, -1], 0.35, 0.05, 4, '#e8e0c8'); mb.spike([-0.1, 0.12, -0.05], [-0.4, 0.6, -1], 0.35, 0.05, 4, '#e8e0c8');
      mb.box(0.1, 0.1, 0.18, 0.05, 0.03, 0.03, C3); mb.box(-0.1, 0.1, 0.18, 0.05, 0.03, 0.03, C3);
    }));
    m.attach('jaw', meshOf(mb => mb.frustum(0, -0.05, 0.12, 0.14, 0.2, 0.08, 0.05, 0.05, C2)));
    m.attach('tail', meshOf(mb => { mb.push(); mb.rotate(-1.4, 0, 0); mb.prism(0, 0, 0, 0.14, 0.02, 1.0, 6, C1); mb.pop(); }));
    const wing = (sgn) => meshOf(mb => {
      mb.quad([0, 0, 0], [sgn * 0.9, 0.35, -0.2], [sgn * 1.1, -0.1, -0.5], [sgn * 0.2, -0.05, -0.35], C2);
      mb.quad([sgn * 0.2, -0.05, -0.35], [sgn * 1.1, -0.1, -0.5], [sgn * 0.9, 0.35, -0.2], [0, 0, 0], sh(C2, -0.2));
      mb.prism(0, 0, 0, 0.03, 0.02, 0.1, 4, C1);
    });
    if (a.variant !== 2) { m.attach('wingL', wing(1)); m.attach('wingR', wing(-1)); }
    const leg = meshOf(mb => { mb.limb(0.12, 0.14, 0.08, 0.09, 0.6, C1); for (let i = -1; i <= 1; i++) mb.spike([i * 0.04, -0.6, 0.04], [i * 0.3, -0.3, 1], 0.1, 0.02, 3, '#f0f0e0'); });
    ['FL', 'FR', 'BL', 'BR'].forEach(k => m.attach('leg' + k, leg));
    m.height = 1.5; m.lungeScale = 1.3; return m;
  };

  T.bird = (a) => {
    const m = base(new FF7.Model(), a);
    const C1 = a.c1 || '#a08060', C2 = a.c2 || sh(C1, -0.25), C3 = a.c3 || '#f0c020';
    m.floats = true;
    m.bone('body', 'root', [0, 0.9, 0]);
    m.bone('head', 'body', [0, 0.2, 0.28]);
    m.bone('wingL', 'body', [0.15, 0.1, 0]); m.bone('wingR', 'body', [-0.15, 0.1, 0]);
    m.bone('tail', 'body', [0, 0, -0.3]);
    m.attach('body', meshOf(mb => { mb.sphere(0, 0, 0, 0.2, 0.2, 0.32, C1, 8, 5, true, (i, j) => j > 3 ? sh(C1, 0.2) : C1); mb.prism(0.08, -0.45, 0, 0.02, 0.02, 0.3, 4, C3); mb.prism(-0.08, -0.45, 0, 0.02, 0.02, 0.3, 4, C3); }));
    m.attach('head', meshOf(mb => { mb.sphere(0, 0.05, 0.03, 0.13, 0.12, 0.14, C1, 8, 5, true); mb.push(); mb.translate(0, 0.03, 0.14); mb.rotate(Math.PI / 2, 0, 0); mb.prism(0, 0, 0, 0.05, 0, 0.16, 4, C3); mb.pop(); mb.box(0.08, 0.08, 0.09, 0.03, 0.03, 0.03, '#101010'); mb.box(-0.08, 0.08, 0.09, 0.03, 0.03, 0.03, '#101010'); if (a.variant === 1) mb.spike([0, 0.14, 0], [0, 1, -0.5], 0.2, 0.04, 4, C3); }));
    const wing = (s) => meshOf(mb => { mb.quad([0, 0, 0.15], [s * 0.85, 0.15, 0.05], [s * 0.95, 0.05, -0.25], [0, 0, -0.2], C2); mb.quad([0, 0, -0.2], [s * 0.95, 0.05, -0.25], [s * 0.85, 0.15, 0.05], [0, 0, 0.15], sh(C2, -0.15)); });
    m.attach('wingL', wing(1)); m.attach('wingR', wing(-1));
    m.attach('tail', meshOf(mb => { mb.quad([-0.12, 0, 0], [0.12, 0, 0], [0.18, 0.05, -0.35], [-0.18, 0.05, -0.35], C2); mb.quad([-0.18, 0.05, -0.35], [0.18, 0.05, -0.35], [0.12, 0, 0], [-0.12, 0, 0], C2); }));
    m.height = 1.3; return m;
  };
  T.bat = (a) => { const m = T.bird(Object.assign({ c1: '#403040', c2: '#6a3050', c3: '#f02020' }, a)); m.scale = 0.8; return m; };

  T.insect = (a) => {
    const m = base(new FF7.Model(), a);
    const C1 = a.c1 || '#406020', C2 = a.c2 || sh(C1, -0.3), C3 = a.c3 || '#f02020';
    const v = a.variant || 0;
    m.bone('body', 'root', [0, 0.4, 0]); m.bone('head', 'body', [0, 0.05, 0.35]);
    m.bone('armL', 'head', [0.1, 0, 0.1]); m.bone('armR', 'head', [-0.1, 0, 0.1]);
    m.bone('wingL', 'body', [0.08, 0.15, 0]); m.bone('wingR', 'body', [-0.08, 0.15, 0]);
    m.attach('body', meshOf(mb => {
      mb.sphere(0, 0, -0.2, 0.2, 0.16, 0.3, C1, 8, 5, true, (i, j) => (j % 2) ? C2 : C1);
      mb.sphere(0, 0.02, 0.15, 0.13, 0.12, 0.15, C1, 6, 4, true);
      for (let i = 0; i < 3; i++) for (const s of [1, -1]) { mb.push(); mb.translate(s * 0.1, 0, 0.18 - i * 0.14); mb.rotate(0, 0, s * 1.9); mb.prism(0, 0, 0, 0.02, 0.012, 0.35, 4, C2); mb.pop(); }
    }));
    m.attach('head', meshOf(mb => { mb.sphere(0, 0, 0.06, 0.12, 0.1, 0.12, C1, 6, 4, true); mb.sphere(0.07, 0.04, 0.12, 0.05, 0.05, 0.05, C3, 6, 3); mb.sphere(-0.07, 0.04, 0.12, 0.05, 0.05, 0.05, C3, 6, 3); mb.spike([0.04, 0.08, 0.1], [0.3, 1, 0.6], 0.25, 0.01, 3, C2); mb.spike([-0.04, 0.08, 0.1], [-0.3, 1, 0.6], 0.25, 0.01, 3, C2); }));
    const claw = meshOf(mb => { mb.push(); mb.rotate(-1.2, 0, 0); mb.prism(0, 0, 0, 0.03, 0.01, v === 1 ? 0.45 : 0.25, 4, C2); mb.pop(); });
    m.attach('armL', claw); m.attach('armR', claw);
    if (v !== 2) { const w = (s) => meshOf(mb => { mb.quad([0, 0, 0], [s * 0.5, 0.2, -0.1], [s * 0.45, 0.05, -0.45], [0, 0, -0.3], 'rgba(200,230,255,0.6)'); mb.quad([0, 0, -0.3], [s * 0.45, 0.05, -0.45], [s * 0.5, 0.2, -0.1], [0, 0, 0], 'rgba(200,230,255,0.6)'); }); m.attach('wingL', w(1), null, { blend: 'alpha', cull: false }); m.attach('wingR', w(-1), null, { blend: 'alpha', cull: false }); }
    m.height = 0.8; return m;
  };
  T.crab = (a) => { const m = T.insect(Object.assign({}, a, { variant: 2 })); m.scale = 1.3; return m; };

  T.blob = (a) => {
    const m = base(new FF7.Model(), a);
    const C1 = a.c1 || '#60a040', C2 = a.c2 || sh(C1, -0.3), C3 = a.c3 || '#f0f0f0';
    m.bone('body', 'root', [0, 0, 0]); m.bone('head', 'body', [0, 0.5, 0.3]);
    m.attach('body', meshOf(mb => { mb.sphere(0, 0.32, 0, 0.42, 0.34, 0.4, C1, 8, 6, true, (i, j) => j > 3 ? C2 : C1); if (a.variant === 1) for (let i = 0; i < 8; i++) { const an = i / 8 * PI * 2; mb.spike([S(an) * 0.3, 0.45, Math.cos(an) * 0.3], [S(an), 0.8, Math.cos(an)], 0.25, 0.05, 4, C2); } }));
    m.attach('head', meshOf(mb => { mb.sphere(0.12, 0, 0.05, 0.08, 0.1, 0.05, C3, 6, 4); mb.sphere(-0.12, 0, 0.05, 0.08, 0.1, 0.05, C3, 6, 4); mb.box(0.12, 0, 0.09, 0.04, 0.05, 0.02, '#101010'); mb.box(-0.12, 0, 0.09, 0.04, 0.05, 0.02, '#101010'); mb.box(0, -0.16, 0.08, 0.2, 0.04, 0.03, sh(C2, -0.4)); }));
    m.height = 0.7; return m;
  };
  T.bomb = (a) => { const m = T.blob(Object.assign({ c1: '#e05020', c2: '#f0a020', c3: '#f0f040' }, a)); m.floats = true; m.attach('body', meshOf(mb => { for (let i = 0; i < 6; i++) mb.spike([S(i) * 0.3, 0.6 + Math.cos(i) * 0.1, Math.cos(i * 2) * 0.3], [S(i), 1, Math.cos(i * 2)], 0.2, 0.06, 4, '#f0d040'); })); return m; };
  T.frog = (a) => { const m = T.blob(Object.assign({ c1: '#40a040', c2: '#206020', c3: '#f0f040' }, a)); m.scale = 0.7; return m; };
  T.eye = (a) => {
    const m = base(new FF7.Model(), a); m.floats = true;
    const C1 = a.c1 || '#e0d0d0', C2 = a.c2 || '#c02020', C3 = a.c3 || '#101010';
    m.bone('body', 'root', [0, 0.8, 0]); m.bone('head', 'body', [0, 0, 0]);
    m.attach('body', meshOf(mb => { mb.sphere(0, 0, 0, 0.35, 0.35, 0.35, C1, 10, 7, true, (i, j) => j > 4 ? sh(C1, -0.3) : C1); mb.sphere(0, 0, 0.3, 0.16, 0.16, 0.08, C2, 8, 5); mb.sphere(0, 0, 0.36, 0.07, 0.07, 0.04, C3, 6, 4); for (let i = 0; i < 6; i++) { const an = i / 6 * PI * 2; mb.push(); mb.translate(S(an) * 0.2, -0.25, Math.cos(an) * 0.2); mb.rotate(PI, 0, 0); mb.prism(0, 0, 0, 0.03, 0.005, 0.45, 4, sh(C1, -0.2)); mb.pop(); } }));
    m.height = 1.2; return m;
  };
  T.ghost = (a) => {
    const m = base(new FF7.Model(), a); m.floats = true;
    const C1 = a.c1 || '#c0d8f0', C2 = a.c2 || '#6070a0', C3 = a.c3 || '#f0f040';
    m.bone('body', 'root', [0, 0.6, 0]); m.bone('head', 'body', [0, 0.45, 0]); m.bone('armL', 'body', [0.3, 0.3, 0]); m.bone('armR', 'body', [-0.3, 0.3, 0]);
    m.attach('body', meshOf(mb => { mb.prism(0, -0.5, 0, 0.05, 0.32, 0.8, 7, C1, true); mb.prism(0, 0.3, 0, 0.32, 0.25, 0.1, 7, C2); }), null, { blend: 'alpha', tint: [1, 1, 1, 0.8] });
    m.attach('head', meshOf(mb => { mb.sphere(0, 0.05, 0, 0.2, 0.2, 0.2, C1, 8, 5, true); mb.box(0.07, 0.07, 0.17, 0.05, 0.07, 0.03, C3); mb.box(-0.07, 0.07, 0.17, 0.05, 0.07, 0.03, C3); mb.spike([0, 0.18, -0.05], [0, 1, -0.4], 0.25, 0.1, 5, C2); }), null, { blend: 'alpha', tint: [1, 1, 1, 0.85] });
    const arm = meshOf(mb => { mb.limb(0.06, 0.06, 0.04, 0.04, 0.35, C1); mb.spike([0, -0.35, 0], [0, -1, 0.3], 0.12, 0.03, 3, C3); });
    m.attach('armL', arm, null, { blend: 'alpha', tint: [1, 1, 1, 0.8] }); m.attach('armR', arm, null, { blend: 'alpha', tint: [1, 1, 1, 0.8] });
    m.height = 1.4; return m;
  };
  T.plant = (a) => {
    const m = base(new FF7.Model(), a);
    const C1 = a.c1 || '#40a040', C2 = a.c2 || '#c04060', C3 = a.c3 || '#f0e040';
    m.bone('body', 'root', [0, 0, 0]); m.bone('head', 'body', [0, 0.7, 0]); m.bone('jaw', 'head', [0, 0, 0.05]);
    m.bone('armL', 'body', [0.15, 0.45, 0], [0, 0, 0.8]); m.bone('armR', 'body', [-0.15, 0.45, 0], [0, 0, -0.8]);
    m.attach('body', meshOf(mb => { mb.prism(0, 0, 0, 0.12, 0.08, 0.7, 6, C1, true); for (let i = 0; i < 5; i++) { const an = i / 5 * PI * 2; mb.push(); mb.rotate(0, an, 0); mb.frustum(0, 0, 0.25, 0.14, 0.4, 0.02, 0.02, 0.18, sh(C1, -0.15)); mb.pop(); } }));
    m.attach('head', meshOf(mb => { for (let i = 0; i < 6; i++) { const an = i / 6 * PI * 2; mb.push(); mb.rotate(0, an, 0); mb.rotate(-0.5, 0, 0); mb.frustum(0, 0, 0.12, 0.16, 0.05, 0.02, 0.02, 0.3, C2); mb.pop(); } mb.sphere(0, 0.05, 0, 0.12, 0.1, 0.12, C3, 6, 4); }));
    const vine = meshOf(mb => { mb.limb(0.05, 0.05, 0.02, 0.02, 0.45, C1); mb.sphere(0, -0.45, 0, 0.06, 0.06, 0.06, sh(C1, 0.2), 5, 3); });
    m.attach('armL', vine); m.attach('armR', vine);
    m.height = 1.0; return m;
  };
  T.tentacle = (a) => {
    const m = base(new FF7.Model(), a); m.floats = true;
    const C1 = a.c1 || '#c080c0', C2 = a.c2 || sh(C1, -0.3), C3 = a.c3 || '#f0f040';
    m.bone('body', 'root', [0, 1.0, 0]); m.bone('head', 'body', [0, 0, 0]);
    m.attach('body', meshOf(mb => { mb.sphere(0, 0.1, 0, 0.3, 0.28, 0.3, C1, 8, 5, true, (i, j) => j < 3 ? C1 : C2, 4); mb.box(0.1, 0.1, 0.26, 0.06, 0.06, 0.03, C3); mb.box(-0.1, 0.1, 0.26, 0.06, 0.06, 0.03, C3); }));
    for (let i = 0; i < 6; i++) { const an = i / 6 * PI * 2; m.bone('t' + i, 'body', [S(an) * 0.2, -0.05, Math.cos(an) * 0.2], [0.3 * Math.cos(an), 0, -0.3 * S(an)]); m.attach('t' + i, meshOf(mb => mb.limb(0.06, 0.06, 0.01, 0.01, 0.7, C2))); }
    m.height = 1.4; return m;
  };
  T.serpent = (a) => {
    const m = base(new FF7.Model(), a);
    const C1 = a.c1 || '#406080', C2 = a.c2 || sh(C1, -0.3), C3 = a.c3 || '#f0f040';
    const segs = 6;
    let parent = 'root';
    for (let i = 0; i < segs; i++) { m.bone('seg' + i, parent, i === 0 ? [0, 0.15, -0.6] : [0, 0.16, 0.12], i === 0 ? [0, 0, 0] : [-0.25, 0, 0]); parent = 'seg' + i; m.attach('seg' + i, meshOf(mb => mb.sphere(0, 0, 0, 0.18 - i * 0.012, 0.16 - i * 0.01, 0.2, (i % 2) ? C1 : C2, 8, 4, true))); }
    m.bone('head', parent, [0, 0.18, 0.1], [0.6, 0, 0]); m.bone('jaw', 'head', [0, -0.05, 0.1]);
    m.attach('head', meshOf(mb => { mb.sphere(0, 0.03, 0.08, 0.16, 0.12, 0.22, C1, 8, 5, true); mb.box(0.09, 0.08, 0.2, 0.04, 0.03, 0.03, C3); mb.box(-0.09, 0.08, 0.2, 0.04, 0.03, 0.03, C3); if (a.variant === 1) for (let i = 0; i < 3; i++) mb.spike([0, 0.12, -0.05 * i], [0, 1, -0.5], 0.25, 0.04, 4, C3); }));
    m.attach('jaw', meshOf(mb => { mb.box(0, -0.03, 0.12, 0.14, 0.04, 0.2, C2); mb.spike([0.05, 0, 0.2], [0, 1, 0], 0.06, 0.015, 3, '#f0f0f0'); mb.spike([-0.05, 0, 0.2], [0, 1, 0], 0.06, 0.015, 3, '#f0f0f0'); }));
    m.attach('root', meshOf(mb => { for (let i = 0; i < 4; i++) mb.sphere(0.15 * S(i * 2), 0.12, -0.7 - i * 0.2, 0.17, 0.12, 0.2, (i % 2) ? C1 : C2, 8, 4, true); }));
    m.height = 1.3; return m;
  };
  T.worm = (a) => { const m = T.serpent(Object.assign({ c1: '#c0a070', c2: '#a08050', c3: '#f04040' }, a)); m.scale = 1.2; return m; };
  T.fish = (a) => {
    const m = base(new FF7.Model(), a); m.floats = true;
    const C1 = a.c1 || '#4080a0', C2 = a.c2 || sh(C1, -0.3), C3 = a.c3 || '#f0f040';
    m.bone('body', 'root', [0, 0.7, 0]); m.bone('head', 'body', [0, 0, 0.35]); m.bone('jaw', 'head', [0, -0.08, 0.1]); m.bone('tail', 'body', [0, 0, -0.45]);
    m.bone('wingL', 'body', [0.2, 0, 0.1]); m.bone('wingR', 'body', [-0.2, 0, 0.1]);
    m.attach('body', meshOf(mb => { mb.sphere(0, 0, 0, 0.25, 0.3, 0.5, C1, 8, 5, true, (i, j) => j > 3 ? sh(C1, 0.3) : C1); mb.frustum(0, 0.2, -0.05, 0.02, 0.3, 0.02, 0.1, 0.25, C2); }));
    m.attach('head', meshOf(mb => { mb.box(0.15, 0.08, 0.08, 0.06, 0.06, 0.04, C3); mb.box(-0.15, 0.08, 0.08, 0.06, 0.06, 0.04, C3); }));
    m.attach('jaw', meshOf(mb => mb.box(0, 0, 0.05, 0.2, 0.05, 0.15, C2)));
    m.attach('tail', meshOf(mb => { mb.quad([0, 0, 0], [0, 0.3, -0.35], [0, -0.3, -0.35], [0, -0.02, 0], C2); }), null, { cull: false });
    const fin = (s) => meshOf(mb => mb.quad([0, 0, 0], [s * 0.3, -0.1, -0.1], [s * 0.3, -0.2, -0.3], [0, -0.05, -0.2], C2));
    m.attach('wingL', fin(1), null, { cull: false }); m.attach('wingR', fin(-1), null, { cull: false });
    m.height = 1.1; return m;
  };
  T.turtle = (a) => {
    const m = T.beast(Object.assign({}, a, { variant: 0 }));
    m.attach('body', meshOf(mb => { mb.sphere(0, 0.08, 0, 0.34, 0.26, 0.5, a.c2 || '#806040', 8, 4, false, null, 3); mb.frustum(0, -0.06, 0, 0.62, 0.9, 0.66, 0.96, 0.08, sh(a.c2 || '#806040', -0.2)); }));
    m.scale = 1.4; return m;
  };
  T.rock = (a) => {
    const m = base(new FF7.Model(), a);
    const C1 = a.c1 || '#807060', C2 = a.c2 || sh(C1, -0.25), C3 = a.c3 || '#f04020';
    m.bone('body', 'root', [0, 0.55, 0]); m.bone('head', 'body', [0, 0.45, 0.05]);
    m.bone('armL', 'body', [0.42, 0.3, 0]); m.bone('armR', 'body', [-0.42, 0.3, 0]);
    m.bone('thighL', 'body', [0.18, -0.2, 0]); m.bone('thighR', 'body', [-0.18, -0.2, 0]);
    m.attach('body', meshOf(mb => { mb.sphere(0, 0.15, 0, 0.42, 0.42, 0.34, C1, 6, 4, false, (i, j) => (i + j) % 3 === 0 ? C2 : C1); }));
    m.attach('head', meshOf(mb => { mb.sphere(0, 0.05, 0.05, 0.18, 0.16, 0.16, C2, 6, 4, false); mb.box(0.07, 0.07, 0.19, 0.05, 0.03, 0.02, C3); mb.box(-0.07, 0.07, 0.19, 0.05, 0.03, 0.02, C3); }));
    const arm = meshOf(mb => { mb.limb(0.18, 0.18, 0.2, 0.2, 0.55, C1); mb.sphere(0, -0.6, 0, 0.16, 0.14, 0.16, C2, 6, 4, false); });
    m.attach('armL', arm); m.attach('armR', arm);
    const leg = meshOf(mb => mb.limb(0.18, 0.18, 0.2, 0.22, 0.38, C2));
    m.attach('thighL', leg); m.attach('thighR', leg);
    m.height = 1.3; return m;
  };
  T.demon = (a) => {
    const m = FF7.chars3d.build({ base: 'man', build: 'big', skin: a.c1 || '#804080', hair: a.c2 || '#402040', hairStyle: 'bald', top: a.c1 || '#804080', sleeve: 'skin', bottom: a.c2 || '#402040', boots: a.c2 || '#402040', eyes: a.c3 || '#f0f040' }, { style: 'battle' });
    const C2 = a.c2 || '#402040';
    m.bone('wingL', 'torso', [0.08, 0.2, -0.08]); m.bone('wingR', 'torso', [-0.08, 0.2, -0.08]);
    const w = (s) => meshOf(mb => { mb.quad([0, 0, 0], [s * 0.6, 0.35, -0.1], [s * 0.7, -0.15, -0.2], [s * 0.1, -0.2, -0.05], C2); mb.quad([s * 0.1, -0.2, -0.05], [s * 0.7, -0.15, -0.2], [s * 0.6, 0.35, -0.1], [0, 0, 0], C2); });
    m.attach('wingL', w(1)); m.attach('wingR', w(-1));
    m.attach('head', meshOf(mb => { mb.spike([0.05, 0.14, 0], [0.4, 1, 0], 0.12, 0.025, 4, '#e8e0c8'); mb.spike([-0.05, 0.14, 0], [-0.4, 1, 0], 0.12, 0.025, 4, '#e8e0c8'); }));
    m.enemyHuman = true; m.play('battle'); m.scale = 1.9; return m;
  };

  // --- machines
  T.machine = (a) => {
    const m = base(new FF7.Model(), a);
    const C1 = a.c1 || '#8a9098', C2 = a.c2 || sh(C1, -0.3), C3 = a.c3 || '#f03020';
    const v = a.variant || 0;
    m.bone('body', 'root', [0, v === 2 ? 0.7 : 0.45, 0]); m.bone('head', 'body', [0, 0.35, 0.05]);
    m.bone('armL', 'body', [0.35, 0.15, 0.1]); m.bone('armR', 'body', [-0.35, 0.15, 0.1]);
    if (v === 2) m.floats = true;
    m.attach('body', meshOf(mb => {
      mb.frustum(0, -0.2, 0, 0.55, 0.45, 0.5, 0.4, 0.45, { side: C1, top: sh(C1, 0.15), front: C1, bottom: C2 });
      mb.box(0, 0.05, 0.22, 0.3, 0.15, 0.03, C2);
      mb.box(0.1, 0.05, 0.24, 0.06, 0.06, 0.02, C3);
      if (v === 0) { mb.prism(0.2, -0.45, 0, 0.1, 0.1, 0.25, 8, C2); mb.prism(-0.2, -0.45, 0, 0.1, 0.1, 0.25, 8, C2); mb.box(0, -0.45, 0, 0.5, 0.08, 0.4, sh(C2, -0.3)); }
      if (v === 1) for (let i = 0; i < 4; i++) { mb.push(); mb.translate((i % 2 ? 1 : -1) * 0.25, -0.2, (i < 2 ? 1 : -1) * 0.2); mb.rotate(0, 0, (i % 2 ? 1 : -1) * 0.5); mb.limb(0.06, 0.06, 0.04, 0.04, 0.35, C2); mb.pop(); }
      if (v === 2) mb.prism(0, -0.35, 0, 0.18, 0.02, 0.15, 6, '#f0a040');
    }));
    m.attach('head', meshOf(mb => { mb.box(0, 0.08, 0, 0.3, 0.16, 0.26, C1); mb.box(0, 0.08, 0.14, 0.2, 0.05, 0.02, C3); mb.prism(0.1, 0.16, -0.05, 0.01, 0.01, 0.2, 4, C2); }));
    const arm = meshOf(mb => { mb.limb(0.08, 0.08, 0.07, 0.07, 0.3, C2); mb.box(0, -0.35, 0.05, 0.1, 0.1, 0.18, C1); mb.prism(0, -0.33, 0.12, 0.03, 0.03, 0.15, 6, '#303030'); });
    m.attach('armL', arm); m.attach('armR', arm);
    m.height = 1.1; return m;
  };
  T.tank = (a) => {
    const m = base(new FF7.Model(), a);
    const C1 = a.c1 || '#607050', C2 = a.c2 || sh(C1, -0.3), C3 = a.c3 || '#f0c020';
    m.bone('body', 'root', [0, 0.3, 0]); m.bone('head', 'body', [0, 0.3, 0]);
    m.attach('body', meshOf(mb => { mb.box(0, 0, 0, 0.9, 0.3, 1.1, C1); mb.box(0.5, -0.12, 0, 0.18, 0.28, 1.2, '#303030'); mb.box(-0.5, -0.12, 0, 0.18, 0.28, 1.2, '#303030'); for (let i = 0; i < 5; i++) { mb.prism(0.5, -0.22 + 0.0, -0.45 + i * 0.22, 0.09, 0.09, 0.01, 6, '#505050'); } }));
    m.attach('head', meshOf(mb => { mb.frustum(0, 0, 0, 0.6, 0.6, 0.45, 0.45, 0.25, C1); mb.push(); mb.translate(0, 0.12, 0.2); mb.rotate(PI / 2, 0, 0); mb.prism(0, 0, 0, 0.05, 0.05, 0.7, 6, C2); mb.pop(); mb.box(0, 0.25, -0.15, 0.08, 0.08, 0.08, C3); }));
    m.height = 0.9; m.lungeScale = 0.4; return m;
  };
  T.flyer = (a) => {
    const m = base(new FF7.Model(), a); m.floats = true;
    const C1 = a.c1 || '#505a68', C2 = a.c2 || sh(C1, -0.3), C3 = a.c3 || '#f03020';
    m.bone('body', 'root', [0, 1.1, 0]); m.bone('head', 'body', [0, 0.25, 0]); m.bone('wingL', 'head', [0, 0.05, 0]); m.bone('tail', 'body', [0, 0, -0.5]);
    m.attach('body', meshOf(mb => { mb.sphere(0, 0, 0.1, 0.3, 0.25, 0.45, C1, 8, 5, true); mb.box(0, 0.02, 0.45, 0.3, 0.12, 0.05, 'rgba(120,200,240,1)'); mb.box(0.25, -0.2, 0, 0.05, 0.05, 0.6, C2); mb.box(-0.25, -0.2, 0, 0.05, 0.05, 0.6, C2); mb.box(0.3, -0.05, 0.2, 0.12, 0.08, 0.3, C2); mb.prism(0.3, -0.05, 0.35, 0.03, 0.03, 0.2, 6, '#202020'); }));
    m.attach('tail', meshOf(mb => { mb.push(); mb.rotate(-PI / 2, 0, 0); mb.prism(0, 0, 0, 0.08, 0.04, 0.6, 5, C1); mb.pop(); mb.box(0, 0.1, -0.55, 0.02, 0.2, 0.12, C3); }));
    m.attach('wingL', meshOf(mb => { mb.box(0, 0, 0, 1.6, 0.015, 0.06, '#303030'); mb.box(0, 0, 0, 0.06, 0.015, 1.6, '#303030'); }));
    m.onPose = (mm) => { mm.b('wingL').rot[1] = (FF7.frame || 0) * 0.6; };
    m.height = 1.4; return m;
  };
  T.mech = (a) => {
    const m = base(new FF7.Model(), a);
    const C1 = a.c1 || '#707880', C2 = a.c2 || sh(C1, -0.3), C3 = a.c3 || '#f0c020';
    m.bone('body', 'root', [0, 1.1, 0]); m.bone('head', 'body', [0, 0.45, 0.1]);
    m.bone('armL', 'body', [0.55, 0.25, 0]); m.bone('armR', 'body', [-0.55, 0.25, 0]);
    ['FL', 'FR', 'BL', 'BR'].forEach((k, i) => m.bone('leg' + k, 'body', [(i % 2 ? -1 : 1) * 0.4, -0.25, (i < 2 ? 1 : -1) * 0.35]));
    m.attach('body', meshOf(mb => { mb.frustum(0, -0.3, 0, 0.9, 0.8, 0.8, 0.7, 0.7, { side: C1, top: sh(C1, 0.15), front: C1 }); mb.box(0, 0.1, 0.4, 0.5, 0.2, 0.05, C2); mb.box(0, 0.1, 0.43, 0.2, 0.08, 0.02, C3); }));
    m.attach('head', meshOf(mb => { mb.box(0, 0.1, 0, 0.4, 0.22, 0.35, C1); mb.box(0, 0.12, 0.18, 0.25, 0.06, 0.02, C3); }));
    const arm = meshOf(mb => { mb.limb(0.18, 0.18, 0.15, 0.15, 0.5, C2); mb.push(); mb.translate(0, -0.55, 0.1); mb.rotate(PI / 2, 0, 0); mb.prism(0, 0, 0, 0.1, 0.1, 0.5, 8, C1); mb.prism(0, 0.5, 0, 0.05, 0.05, 0.05, 6, '#202020'); mb.pop(); });
    m.attach('armL', arm); m.attach('armR', arm);
    const leg = meshOf(mb => { mb.push(); mb.rotate(0, 0, 0); mb.limb(0.14, 0.14, 0.1, 0.1, 0.85, C2); mb.box(0, -0.85, 0.05, 0.25, 0.08, 0.35, C1); mb.pop(); });
    ['FL', 'FR', 'BL', 'BR'].forEach(k => m.attach('leg' + k, leg));
    m.height = 1.9; m.lungeScale = 0.5; return m;
  };
  T.house = (a) => {
    const m = base(new FF7.Model(), a);
    const C1 = a.c1 || '#c0a080', C2 = a.c2 || '#803020', C3 = a.c3 || '#f0e060';
    m.bone('body', 'root', [0, 0, 0]); m.bone('head', 'body', [0, 1.0, 0]);
    m.attach('body', meshOf(mb => { mb.box(0, 0.5, 0, 1.0, 1.0, 0.9, C1); mb.box(0, 0.35, 0.46, 0.25, 0.45, 0.02, '#503020'); mb.box(0.3, 0.7, 0.46, 0.22, 0.2, 0.02, C3); mb.box(-0.3, 0.7, 0.46, 0.22, 0.2, 0.02, C3); }));
    m.attach('head', meshOf(mb => { mb.frustum(0, 0, 0, 1.15, 1.05, 0.05, 1.05, 0.5, C2); mb.box(0.3, 0.35, -0.2, 0.15, 0.4, 0.15, '#806050'); }));
    m.height = 1.5; return m;
  };

  // ---------------------------------------------------------------- bosses (custom)
  const CUSTOM = {};
  CUSTOM.guard_scorpion = (a) => {
    const m = base(new FF7.Model(), a);
    const C1 = a.c1 || '#9aa0a8', C2 = a.c2 || '#c03020', C3 = a.c3 || '#ffd000';
    m.bone('body', 'root', [0, 0.7, 0]); m.bone('head', 'body', [0, 0.1, 0.55]);
    m.bone('tail', 'body', [0, 0.25, -0.5], [-0.4, 0, 0]);
    m.bone('armL', 'body', [0.45, 0, 0.45]); m.bone('armR', 'body', [-0.45, 0, 0.45]);
    ['FL', 'FR', 'BL', 'BR'].forEach((k, i) => m.bone('leg' + k, 'body', [(i % 2 ? -1 : 1) * 0.5, -0.1, (i < 2 ? 1 : -1) * 0.35]));
    m.attach('body', meshOf(mb => { mb.frustum(0, -0.2, 0, 1.0, 1.3, 0.8, 1.1, 0.45, { side: C1, top: sh(C1, 0.2), front: C1 }); mb.box(0, 0.28, 0, 0.5, 0.12, 0.6, C2); mb.box(0, -0.25, 0, 0.8, 0.1, 1.0, sh(C1, -0.4)); }));
    m.attach('head', meshOf(mb => { mb.box(0, 0, 0.05, 0.5, 0.3, 0.35, C1); mb.box(0, 0.05, 0.24, 0.35, 0.08, 0.02, C3); mb.prism(0.15, -0.1, 0.2, 0.04, 0.04, 0.35, 6, '#303030'); }));
    const seg = meshOf(mb => { mb.push(); mb.rotate(-0.4, 0, 0); for (let i = 0; i < 5; i++) mb.box(0, 0.16 + i * 0.22, -i * 0.04, 0.22 - i * 0.02, 0.2, 0.22 - i * 0.02, i % 2 ? C1 : sh(C1, -0.2)); mb.push(); mb.translate(0, 1.2, 0); mb.rotate(1.8, 0, 0); mb.prism(0, 0, 0, 0.1, 0.02, 0.4, 5, C2); mb.prism(0, 0.2, 0, 0.12, 0.12, 0.08, 6, C3); mb.pop(); mb.pop(); });
    m.attach('tail', seg);
    const claw = meshOf(mb => { mb.push(); mb.rotate(-1.3, 0, 0); mb.limb(0.12, 0.12, 0.1, 0.1, 0.4, C1); mb.box(0.05, -0.5, 0, 0.06, 0.2, 0.08, C2); mb.box(-0.05, -0.5, 0, 0.06, 0.2, 0.08, C2); mb.pop(); });
    m.attach('armL', claw); m.attach('armR', claw);
    const leg = meshOf(mb => { mb.push(); mb.rotate(0, 0, 0.4); mb.limb(0.1, 0.1, 0.06, 0.06, 0.75, C1); mb.pop(); });
    ['FL', 'BL'].forEach(k => m.attach('leg' + k, leg));
    const legR = meshOf(mb => { mb.push(); mb.rotate(0, 0, -0.4); mb.limb(0.1, 0.1, 0.06, 0.06, 0.75, C1); mb.pop(); });
    ['FR', 'BR'].forEach(k => m.attach('leg' + k, legR));
    m.onPose = (mm) => { if (mm.tailUp) mm.b('tail').rot[0] = -1.2; };
    m.height = 1.6; m.lungeScale = 0.5; return m;
  };
  CUSTOM.air_buster = (a) => {
    const m = T.mech(Object.assign({ c1: '#8a8a70', c2: '#505048', c3: '#f04020' }, a));
    m.attach('body', meshOf(mb => { mb.prism(0.35, 0.35, -0.3, 0.1, 0.1, 0.5, 8, '#404040'); mb.prism(-0.35, 0.35, -0.3, 0.1, 0.1, 0.5, 8, '#404040'); }));
    return m;
  };
  const sephLike = (a, wings) => {
    const m = FF7.chars3d.build('sephiroth', { style: 'battle' });
    m.showWeapon(true); m.enemyHuman = true; m.play('battle'); m.scale = 1.7;
    if (wings) {
      m.bone('wingL', 'torso', [0.1, 0.22, -0.08]);
      m.attach('wingL', meshOf(mb => { for (let i = 0; i < 6; i++) mb.spike([0, 0, 0], [0.9, 0.6 - i * 0.25, -0.4], 0.8 - i * 0.05, 0.09, 4, i % 2 ? '#303040' : '#202028'); }));
    }
    return m;
  };
  CUSTOM.sephiroth = (a) => sephLike(a, false);
  CUSTOM.bizarro_sephiroth = (a) => {
    const m = base(new FF7.Model(), a);
    m.bone('body', 'root', [0, 0.2, 0]); m.bone('head', 'body', [0, 1.8, 0]);
    m.attach('body', meshOf(mb => { mb.prism(0, 0, 0, 0.9, 0.25, 1.8, 8, '#a0a8b8', true); for (let i = 0; i < 8; i++) { const an = i / 8 * PI * 2; mb.spike([S(an) * 0.6, 0.6, Math.cos(an) * 0.6], [S(an), 0.4, Math.cos(an)], 0.9, 0.12, 4, i % 2 ? '#808898' : '#c8ccd8'); } }));
    const sm = sephLike(a, false);
    m.attach('head', meshOf(mb => mb.sphere(0, 0.1, 0, 0.18, 0.2, 0.18, '#f0dcc8', 8, 5, true)));
    m.attach('head', meshOf(mb => mb.frustum(0, -0.9, -0.1, 0.1, 0.1, 0.4, 0.25, 1.0, '#e4e4ec')));
    m.height = 2.6; m.lungeScale = 0.2; return m;
  };
  CUSTOM.safer_sephiroth = (a) => {
    const m = base(new FF7.Model(), a); m.floats = true;
    m.bone('body', 'root', [0, 1.4, 0]); m.bone('head', 'body', [0, 0.9, 0]);
    m.bone('wingL', 'body', [0.25, 0.7, -0.15]); m.bone('wingR', 'body', [-0.25, 0.7, -0.15]);
    m.attach('body', meshOf(mb => { mb.frustum(0, -1.2, 0, 0.3, 0.25, 0.45, 0.28, 1.2, '#d0ccd8'); mb.frustum(0, 0, 0, 0.45, 0.28, 0.6, 0.32, 0.8, '#e8e4f0'); mb.sphere(0, -0.3, 0.15, 0.08, 0.08, 0.05, '#c02020', 6, 4); }));
    m.attach('head', meshOf(mb => { mb.sphere(0, 0.12, 0, 0.14, 0.17, 0.14, '#f0dcc8', 8, 5, true); mb.frustum(0, -0.5, -0.1, 0.25, 0.12, 0.32, 0.2, 0.75, '#e4e4ec'); mb.box(0.05, 0.15, 0.13, 0.04, 0.02, 0.01, '#40d090'); mb.box(-0.05, 0.15, 0.13, 0.04, 0.02, 0.01, '#40d090'); }));
    const wing = (s, col) => meshOf(mb => { for (let i = 0; i < 7; i++) mb.spike([0, 0, 0], [s * 1, 0.9 - i * 0.28, -0.3], 1.6 - i * 0.12, 0.14, 4, i % 2 ? sh(col, -0.15) : col); });
    m.attach('wingL', wing(1, '#f0f0f8')); m.attach('wingR', wing(-1, '#202028'));
    m.height = 3.0; m.lungeScale = 0.2; return m;
  };
  const jenovaBase = (a, variant) => {
    const m = base(new FF7.Model(), a);
    const C1 = a.c1 || '#b8a0c8', C2 = a.c2 || '#806090', C3 = a.c3 || '#f0e060';
    m.floats = variant === 'life';
    m.bone('body', 'root', [0, variant === 'birth' ? 0.3 : 0.8, 0]); m.bone('head', 'body', [0, 1.2, 0.1]);
    m.attach('body', meshOf(mb => {
      if (variant === 'birth') { mb.sphere(0, 0.5, 0, 0.8, 0.6, 0.7, C1, 10, 6, true, (i, j) => j > 3 ? C2 : C1); mb.sphere(0, 0.95, 0.45, 0.2, 0.18, 0.15, C3, 8, 4); }
      else if (variant === 'life') { mb.frustum(0, -0.8, 0, 1.2, 0.8, 0.2, 0.2, 1.9, C1); mb.sphere(0, 1.2, 0, 0.2, 0.25, 0.2, C2, 8, 5, true); }
      else if (variant === 'death') { mb.sphere(0, 0.5, 0, 0.7, 0.8, 0.6, '#c03020', 10, 6, true, (i, j) => j > 3 ? '#801810' : '#c03020'); mb.sphere(0, 1.3, 0.3, 0.15, 0.18, 0.12, C3, 8, 4); }
      else { mb.sphere(0, 0.8, 0, 0.9, 1.0, 0.8, '#7070a0', 10, 7, true, (i, j) => j % 2 ? '#8080b8' : '#6060a0'); mb.sphere(0, 1.9, 0.2, 0.25, 0.3, 0.2, '#e0c0d0', 8, 5, true); }
    }));
    const tents = variant === 'synthesis' ? 8 : variant === 'birth' ? 6 : 4;
    for (let i = 0; i < tents; i++) { const an = i / tents * PI * 2; m.bone('t' + i, 'body', [S(an) * 0.5, 0.4, Math.cos(an) * 0.5], [0.6 * Math.cos(an), 0, -0.6 * S(an)]); m.attach('t' + i, meshOf(mb => { mb.limb(0.12, 0.12, 0.02, 0.02, 1.1, C2); })); }
    m.height = variant === 'synthesis' ? 2.8 : 2.2; m.lungeScale = 0.2; return m;
  };
  CUSTOM.jenova_birth = (a) => jenovaBase(a, 'birth');
  CUSTOM.jenova_life = (a) => jenovaBase(a, 'life');
  CUSTOM.jenova_death = (a) => jenovaBase(a, 'death');
  CUSTOM.jenova_synthesis = (a) => jenovaBase(a, 'synthesis');
  const weapon = (a, col, scale) => {
    const m = T.dragon(Object.assign({ c1: col, c2: sh(col, -0.3), c3: '#f0f0f0', variant: 2 }, a));
    m.attach('body', meshOf(mb => { mb.box(0, 0.35, -0.1, 0.5, 0.2, 0.9, sh(col, 0.2)); mb.sphere(0, 0.1, 0.5, 0.12, 0.12, 0.06, '#f0f060', 6, 4); }));
    m.scale = scale; return m;
  };
  CUSTOM.diamond_weapon = (a) => weapon(a, '#c0c8d8', 2.2);
  CUSTOM.ruby_weapon = (a) => weapon(a, '#b02030', 2.2);
  CUSTOM.emerald_weapon = (a) => weapon(a, '#20a060', 2.2);
  CUSTOM.ultimate_weapon = (a) => { const m = weapon(a, '#e8e0d0', 1.6); m.floats = true; return m; };
  CUSTOM.sapphire_weapon = (a) => weapon(a, '#3050c0', 2.2);
  CUSTOM.proud_clod = (a) => { const m = T.mech(Object.assign({ c1: '#8a9098', c2: '#505860', c3: '#f02020' }, a)); m.scale = 1.8; return m; };

  // ---------------------------------------------------------------- public
  // Dedicated per-enemy models (js/gl/enemy_models_*.js): FF7.creatures.MODELS[enemyId] = (look) => Model
  CR.MODELS = CR.MODELS || {};
  CR.build = function (look, name) {
    look = look || { type: 'blob' };
    let m;
    const a = Object.assign({}, look);
    if (name && CR.MODELS[name]) { m = CR.MODELS[name](a); m.scale = m.scale || 1; m.isEnemy = true; if (!m.enemyHuman && m.play) m.play(m.anims && m.anims.idle || 'e_idle'); m.enemyId = name; return m; }
    if (a.type === 'custom' && CUSTOM[a.id]) m = CUSTOM[a.id](a);
    else if (T[a.type]) m = T[a.type](a);
    else m = T.blob(a);
    const size = a.size || 1;
    m.scale = (m.scale || 1) * size * (m.enemyHuman ? 1 : 1.25);
    if (!m.enemyHuman) m.play('e_idle');
    m.isEnemy = true;
    return m;
  };
  // Multi-part bosses: CR.anchor(m, '<main enemy id>', [x, y, z]) mounts this part on that enemy of the
  // formation. battle.js layoutEnemies() places the part at the main part's home + (x, z) (metres, in the
  // main part's facing frame) instead of giving it a slot in the row, so arms / heads / turrets assemble
  // into one creature while each part keeps its own cursor, damage numbers and HP. y (metres) lifts the
  // whole part every frame (its root bone) and raises its cursor / hit point with it. Call it last in the
  // builder (it chains m.onPose). A part with no meshes and m.visible = false is an invisible target.
  // offset may be a list [[x, y, z], [x2, y, z2], ...] for a part id that appears several times in one
  // formation (e.g. two side guns): the n-th instance takes the n-th entry (all entries share one y).
  CR.anchor = function (m, to, offset) {
    const o = offset || [0, 0, 0], y = Array.isArray(o[0]) ? o[0][1] : o[1], prev = m.onPose;
    m.anchor = { to, offset: o };
    if (y) m.onPose = (mm) => { if (prev) prev(mm); mm.root.pos[1] += y / (mm.scale || 1); };
    return m;
  };
  CR.TYPES = Object.keys(T).concat(['custom']);
  CR.T = T; CR.CUSTOM = CUSTOM; CR.base = base;
})();
