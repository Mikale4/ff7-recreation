// FF7-style character models: contoured low-poly bodies built with lofts, sculpted heads with
// painted face textures, painted (cylindrically mapped) torso textures, per-character hair and
// costume details (js/gl/cast_models.js, cast_rigs.js, cast_npcs.js).
//   FF7.chars3d.build(appearance, { style: 'field' | 'battle' }) -> FF7.Model
// Model faces +z, feet at y = 0. Field models are ~1.0 tall (chibi proportions like the PS1
// field models: big head, big hands and boots), battle models ~1.0 tall with realistic proportions
// (scaled in the scene).
(function () {
  const U = FF7.util, MB = FF7.MeshBuilder, T = FF7.tex, V = FF7.V3;
  const C3 = FF7.chars3d = FF7.chars3d || {};
  const sh = U.shade;
  C3.PRESETS = C3.PRESETS || {};
  C3.HAIR = C3.HAIR || {};        // hair builders by style id: fn(mb, H, spec, style)
  C3.EXTRA = C3.EXTRA || {};      // costume extras: fn(model, H, spec, style)
  C3.WEAPON = C3.WEAPON || {};    // weapon meshes: fn(mb, scale)
  C3.GRIP = C3.GRIP || {};        // how each weapon sits in the fist (see the weapon section of buildHuman)
  C3.RIGS = C3.RIGS || {};        // non-human rigs: fn(spec, style) -> Model
  const meshOf = (fn, o) => { const mb = new MB(); fn(mb); return mb.build(o); };
  C3.meshOf = meshOf;

  // ------------------------------------------------------------------ proportions
  // All values are fractions of total height (≈1). Measured from the PS1 field models (Model
  // Reference.png) and battle models (Character Reference.png).
  const PROPS = {
    field: { foot: 0.08, shin: 0.165, thigh: 0.19, pelvis: 0.05, torso: 0.21, neck: 0.02, headH: 0.215, headW: 0.19, headD: 0.19,
      shoulderX: 0.14, upper: 0.13, fore: 0.11, hand: 0.115, armR: 0.037, foreR: 0.045, legX: 0.054, thighR: 0.058, shinR: 0.046,
      chestRX: 0.11, chestRZ: 0.072, waistRX: 0.078, waistRZ: 0.058, hipRX: 0.09, footL: 0.2, footW: 0.095 },
    battle: { foot: 0.05, shin: 0.228, thigh: 0.235, pelvis: 0.055, torso: 0.25, neck: 0.03, headH: 0.155, headW: 0.132, headD: 0.145,
      shoulderX: 0.125, upper: 0.165, fore: 0.145, hand: 0.068, armR: 0.03, foreR: 0.03, legX: 0.055, thighR: 0.052, shinR: 0.037,
      chestRX: 0.11, chestRZ: 0.068, waistRX: 0.08, waistRZ: 0.056, hipRX: 0.09, footL: 0.13, footW: 0.058 },
  };
  C3.PROPS = PROPS;

  // ------------------------------------------------------------------ face texture (PS1 style)
  // Drawn in a 64-unit coordinate space onto a 128px texture. The texture spans the face from ear to
  // ear (x) and from the chin (y=64) to the top of the forehead (y=0). face options (64 units):
  //   eyeY, eyeGap (centre offset), eyeW/eyeH (half sizes), lid (upper lid thickness), slant (inner
  //   corner drop), brow (tilt: + = angry V), browGap, browW, mouth ('line'|'smile'|'frown'|'open'|'grin'),
  //   mouthY, mouthW, eyes ('open'|'closed'|'narrow'|'none'), lashes, nose (false), blush, lips (colour)
  const faceCache = {};
  C3.faceTexture = function (spec, style) {
    const f = spec.face || {};
    const ex = spec.extras || [];
    const key = JSON.stringify([spec.skin, spec.eyes, spec.female, spec.height, f, ex.filter(e => /shades|glasses|visor|mask|beard|goatee|mustache|scar|tattoo|stubble|facepaint|xscar|cigar|renoMarks|bindi|freckles/.test(e)), spec.hair, spec.browColor, spec.beardColor, spec.maskColor, spec.glassColor, spec.glassRim, spec.lensTint, spec.mustacheColor, spec.headBackColor, spec.facePaint ? String(spec.facePaint) : 0]);
    if (faceCache[key]) return faceCache[key];
    const skin = spec.skin || '#f0c8a0';
    const S = 2;
    const t = T.create(64 * S, 64 * S, skin);
    const E = (cx, cy, rx, ry, c, rot) => T.fillEllipse(t, cx * S, cy * S, rx * S, ry * S, c, rot || 0);
    const L = (x0, y0, x1, y1, w, c) => T.line(t, x0 * S, y0 * S, x1 * S, y1 * S, w * S, c);
    const Pg = (pts, c) => T.fillPoly(t, pts.map(p => [p[0] * S, p[1] * S]), c);
    const R = (x, y, w, h, c) => T.fillRect(t, x * S, y * S, w * S, h * S, c);
    const Cv = (pts, w, c) => { for (let i = 0; i < pts.length - 1; i++) L(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w, c); };
    const dk = sh(skin, -0.3);
    const female = !!spec.female, kid = spec.height === 'kid';
    // soft side shading (cheeks/temples)
    E(3, 38, 6, 22, sh(skin, -0.06)); E(61, 38, 6, 22, sh(skin, -0.06));
    const eyeCol = spec.eyes || '#40302a';
    const ey = f.eyeY || 31;
    const ew = f.eyeW || (female ? 7.4 : kid ? 7.2 : 6.8);
    const eh = f.eyeH || (female ? 5.6 : kid ? 5.8 : 4.3);
    const gap = f.eyeGap || (female ? 12 : 11.5);
    const lid = f.lid || (female ? 2.3 : 2.1);
    const lash = f.lashes != null ? f.lashes : female;
    const lidC = f.lidColor || '#1a1012';
    const mode = f.eyes || 'open';
    const drawEye = (cx, side) => {    // side: -1 = texture-left eye (model's right), +1 = texture-right
      const inward = -side;           // direction toward the nose
      const ix = cx + inward * ew, ox = cx - inward * ew;
      const sl = f.slant != null ? f.slant : (female ? -0.4 : 0.9);  // + = inner corner lower (stern look)
      const iy = ey - eh * 0.55 + sl, oy = ey - eh * 0.55 - sl * 0.4;
      if (mode === 'none') return;
      if (mode === 'closed') { Cv([[ox, ey - 0.5], [cx, ey + 1.2], [ix, ey]], 1.4, lidC); if (lash) L(ox, ey - 0.5, ox - inward * -1 * 0 - side * 2, ey - 2, 1.2, lidC); }
      else {
        const h = mode === 'narrow' ? eh * 0.55 : eh;
        // almond: upper edge (outer -> inner), lower edge (inner -> outer)
        const top = [[ox, oy + 0.6], [cx - inward * ew * 0.45, ey - h * 0.95], [cx + inward * ew * 0.45, ey - h * 0.92], [ix, iy + 0.7]];
        const bot = [[ix, iy + 1.2], [cx + inward * ew * 0.4, ey + h * 0.85], [cx - inward * ew * 0.45, ey + h * 0.9], [ox, oy + 1.6]];
        Pg(top.concat(bot), '#f4f4f0');
        // iris + pupil + highlight
        const icx = cx + inward * ew * 0.08, icy = ey + h * 0.08;
        const irx = ew * (female || kid ? 0.56 : 0.5), iry = Math.min(h * 1.0, eh * 1.0);
        E(icx, icy, irx, iry, eyeCol);
        E(icx, icy - iry * 0.2, irx * 0.72, iry * 0.55, sh(eyeCol, -0.25));
        E(icx, icy + iry * 0.05, irx * 0.36, iry * 0.42, '#08080c');
        E(icx - side * irx * 0.1 - irx * 0.25, icy - iry * 0.4, Math.max(0.9, irx * 0.24), Math.max(0.8, iry * 0.2), '#ffffff');
        if (female || kid) E(icx + irx * 0.3, icy + iry * 0.45, 0.6, 0.5, sh(eyeCol, 0.45));
        // mask the almond outline again (keep iris inside the eye opening)
        Pg([[ox - 1.5, oy - 3], [ix + inward * 1.5, iy - 3], [ix + inward * 0.2, iy + 0.7], [cx + inward * ew * 0.45, ey - h * 0.92], [cx - inward * ew * 0.45, ey - h * 0.95], [ox, oy + 0.6]], skin);
        Pg([[ix + inward * 0.5, iy + 1.2], [cx + inward * ew * 0.4, ey + h * 0.85], [cx - inward * ew * 0.45, ey + h * 0.9], [ox - 0.5, oy + 1.6], [ox - 0.5, ey + h + 3], [ix + inward * 0.5, ey + h + 3]], skin);
        // upper lid: thick dark line, outer end heavier
        Cv([[ox - inward * -0.2, oy + 0.9], [cx - inward * ew * 0.45, ey - h * 0.92], [cx + inward * ew * 0.45, ey - h * 0.88], [ix, iy + 0.9]], lid, lidC);
        L(ox, oy + 0.9, ox + inward * 2.2, ey - h * 0.85, lid * 1.2, lidC);
        if (lash) { L(ox, oy + 0.8, ox - inward * 2.4, oy - 1.4, 1.3, lidC); L(ox + inward * 0.6, oy + 0.4, ox - inward * 1.2, oy - 2.2, 1.1, lidC); }
        // lower lid (outer half)
        Cv([[ox + inward * 0.3, oy + 1.8], [cx - inward * ew * 0.35, ey + h * 0.95], [cx + inward * ew * 0.2, ey + h * 1.0]], female ? 0.9 : 0.8, sh(skin, -0.42));
      }
      // brow
      if (f.brow !== false) {
        const bc = spec.browColor || sh(spec.hair && spec.hair !== skin ? spec.hair : '#402010', -0.35);
        const tilt = f.brow != null ? f.brow : (female ? -0.8 : 1.6);   // + = inner end lower
        const by = ey - eh - (f.browGap != null ? f.browGap : (female ? 4.2 : 3.2));
        const bw = f.browW || (female ? 1.1 : 1.7);
        const bo = [ox - inward * 0.2, by + (female ? 1.2 : 0.4)], bm = [cx, by - (female ? 1.2 : 0.5) - tilt * 0.2], bi = [ix + inward * 0.6, by + tilt];
        Cv([bo, bm, bi], bw, bc);
        if (!female && (f.browW || 1.7) > 1.5) L(bm[0], bm[1], bi[0], bi[1], bw * 1.15, bc);
      }
    };
    if (!ex.includes('shades') && !ex.includes('visor')) { drawEye(32 - gap, -1); drawEye(32 + gap, 1); }
    // nose
    if (f.nose !== false) { L(31.2, ey + 5, 30.4, ey + 10.5, 0.9, sh(skin, -0.2)); L(30.2, ey + 11, 32.6, ey + 11.4, 1.0, sh(skin, -0.24)); }
    if (f.blush) { E(32 - gap - 1, ey + 9, 4, 1.6, sh(f.blush === true ? '#f08080' : f.blush, 0), 0); E(32 + gap + 1, ey + 9, 4, 1.6, f.blush === true ? '#f08080' : f.blush, 0); }
    // mouth
    const my = f.mouthY || (ey + 18);
    const mw = f.mouthW || (female ? 3.2 : 3.8);
    const mc = f.lips || (female ? '#b05a5a' : sh(skin, -0.48));
    const mth = f.mouth || 'line';
    if (mth === 'smile') Cv([[32 - mw - 0.8, my - 0.8], [32 - mw * 0.4, my + 0.7], [32 + mw * 0.4, my + 0.7], [32 + mw + 0.8, my - 0.8]], 1.1, mc);
    else if (mth === 'grin') { Pg([[32 - mw - 1, my - 0.8], [32 + mw + 1, my - 0.8], [32 + mw * 0.5, my + 2], [32 - mw * 0.5, my + 2]], '#5a1a1a'); L(32 - mw, my - 0.3, 32 + mw, my - 0.3, 0.9, '#f0f0f0'); }
    else if (mth === 'open') E(32, my + 0.5, mw * 0.65, 2.1, '#5a1c1c');
    else if (mth === 'frown') Cv([[32 - mw - 0.5, my + 0.8], [32, my - 0.4], [32 + mw + 0.5, my + 0.8]], 1.1, mc);
    else if (mth !== 'none') L(32 - mw, my, 32 + mw, my, 1.1, mc);
    // --- facial hair / marks
    const hairC = spec.beardColor || (spec.hair && spec.hair !== skin ? spec.hair : '#1c1612');
    if (ex.includes('stubble')) for (let i = 0; i < 90; i++) R(14 + U.hash(i, 1) * 36, ey + 12 + U.hash(i, 2) * 21, 0.7, 0.7, sh(skin, -0.32));
    if (ex.includes('beard')) {  // full beard from the sideburns round the jaw (Barret, Heidegger)
      Pg([[3, ey - 2], [9, ey - 2], [11, ey + 9], [18, my - 4], [26, my - 3], [38, my - 3], [46, my - 4], [53, ey + 9], [55, ey - 2], [61, ey - 2], [62, 64], [2, 64]], hairC);
      E(32, my + 0.2, mw + 2.5, 2.4, skin); L(32 - mw, my, 32 + mw, my, 1.1, sh(skin, -0.5));
    }
    if (ex.includes('goatee')) { Pg([[28, my + 2.5], [36, my + 2.5], [34.5, 62], [29.5, 62]], hairC); Pg([[26, my - 2.2], [32, my - 3.2], [38, my - 2.2], [37, my - 1], [32, my - 2], [27, my - 1]], hairC); }
    if (ex.includes('mustache')) Pg([[32 - mw - 4.5, my - 0.5], [32 - 1, my - 4], [32 + 1, my - 4], [32 + mw + 4.5, my - 0.5], [32 + mw + 2, my - 1.2], [32, my - 2.2], [32 - mw - 2, my - 1.2]], spec.mustacheColor || hairC);
    if (ex.includes('shades')) { const gc = spec.glassColor || '#0c0c12'; Pg([[12, ey - 5], [29, ey - 4.5], [28, ey + 3.5], [14, ey + 3]], gc); Pg([[35, ey - 4.5], [52, ey - 5], [50, ey + 3], [36, ey + 3.5]], gc); L(28, ey - 3.5, 36, ey - 3.5, 1.6, gc); L(15, ey - 3.6, 22, ey - 3.4, 0.8, '#6a6a80'); L(38, ey - 3.4, 45, ey - 3.6, 0.8, '#6a6a80'); }
    if (ex.includes('visor')) { Pg([[9, ey - 5.5], [55, ey - 5.5], [53, ey + 3.5], [11, ey + 3.5]], spec.glassColor || '#50d0e8'); L(12, ey - 3.5, 30, ey - 3.5, 1, '#e0ffff'); }
    if (ex.includes('glasses')) {   // round/oval rims (Hojo, Shera, scientists)
      // dark rims ~2 px wide so they still read at field scale (glassRim overrides the width)
      const gc = spec.glassColor || '#34343c', rx = ew + 1.6, ry = eh + 2.2, gw = spec.glassRim || 1.8;
      if (spec.lensTint) [32 - gap, 32 + gap].forEach(cx => E(cx, ey + 0.5, rx - 0.5, ry - 0.5, spec.lensTint));
      [32 - gap, 32 + gap].forEach(cx => { const pts = []; for (let k = 0; k <= 16; k++) { const q = k / 16 * Math.PI * 2; pts.push([cx + Math.cos(q) * rx, ey + 0.5 + Math.sin(q) * ry]); } Cv(pts, gw, gc); });
      L(32 - gap + rx, ey - 0.5, 32 + gap - rx, ey - 0.5, gw, gc);
    }
    if (ex.includes('scar')) L(24, ey - 12, 27, ey + 10, 1, sh(skin, -0.4));
    if (ex.includes('xscar')) { L(34, ey - 7, 46, ey + 6, 1.4, sh(skin, -0.45)); L(46, ey - 7, 34, ey + 6, 1.4, sh(skin, -0.45)); }
    if (ex.includes('tattoo')) Pg([[46, ey + 7], [56, ey + 3], [58, ey + 7], [48, ey + 11]], '#c02020');
    if (ex.includes('facepaint')) { Pg([[8, ey + 5], [20, ey + 4], [20, ey + 7], [8, ey + 8]], spec.paintColor || '#c02020'); Pg([[44, ey + 4], [56, ey + 5], [56, ey + 8], [44, ey + 7]], spec.paintColor || '#c02020'); }
    if (ex.includes('mask')) { R(0, ey - 10, 64, 64, spec.maskColor || '#20283a'); }
    if (ex.includes('renoMarks')) [32 - gap, 32 + gap].forEach(cx => { Pg([[cx - 3, ey + 6.5], [cx + 3, ey + 6.5], [cx, ey + 9.5]], '#c02020'); });
    if (ex.includes('bindi')) E(32, ey - 12, 1.3, 1.3, '#c02020');
    if (ex.includes('freckles')) for (let i = 0; i < 10; i++) E(32 + (i % 2 ? 1 : -1) * (10 + U.hash(i, 3) * 8), ey + 7 + U.hash(i, 4) * 4, 0.5, 0.5, sh(skin, -0.25));
    if (ex.includes('cigar')) { L(34, my + 0.5, 44, my - 3, 2.2, '#6a3a1a'); }
    if (spec.facePaint) spec.facePaint({ E, L, Pg, R, Cv, skin, ey, gap, ew, eh, my, mw, spec });
    // plain texel sampled by the back/sides of the head (uvElse in the head loft)
    T.fillRect(t, 0, 0, 4, 4, ex.includes('mask') ? (spec.maskColor || '#20283a') : (spec.headBackColor || skin));
    faceCache[key] = t;
    return t;
  };

  // ------------------------------------------------------------------ cloth painter (cylindrical textures)
  // Coordinates: x in -1..1 across the FRONT as seen from the front (-1 = viewer's left = model's right side),
  // or across the BACK as seen from behind (back: true); y 0..1 from the bottom to the top of the part.
  // Widths/radii given in the same x units (1 = half the circumference quarter... i.e. a side).
  C3.Painter = function (t) {
    const W = t.w, H = t.h;
    const ux = (x, back) => { const a = Math.asin(U.clamp(x, -1, 1)) / (Math.PI * 2); return (back ? a : 0.5 + a) * W; };
    const vy = (y) => (1 - y) * H;
    const twice = (back, fn) => { fn(0); if (back) fn(W); };
    const P = {
      t, W, H,
      fill(c) { T.fillRect(t, 0, 0, W, H, c); return P; },
      band(y0, y1, c) { T.fillRect(t, 0, vy(y1), W, vy(y0) - vy(y1), c); return P; },
      rect(x0, y0, x1, y1, c, back) { twice(back, o => T.fillRect(t, ux(Math.min(x0, x1), back) + o, vy(Math.max(y0, y1)), ux(Math.max(x0, x1), back) - ux(Math.min(x0, x1), back), Math.abs(vy(y0) - vy(y1)), c)); return P; },
      poly(pts, c, back) { twice(back, o => T.fillPoly(t, pts.map(p => [ux(p[0], back) + o, vy(p[1])]), c)); return P; },
      line(x0, y0, x1, y1, w, c, back) { twice(back, o => T.line(t, ux(x0, back) + o, vy(y0), ux(x1, back) + o, vy(y1), w, c)); return P; },
      dot(x, y, r, c, back) { twice(back, o => T.fillEllipse(t, ux(x, back) + o, vy(y), r * W / 8, r * H / 4, c)); return P; },
      // side strip at x = ±1 (both front and back edges) — for side seams / stripes
      side(sd, y0, y1, w, c) { P.rect(sd * (1 - w), y0, sd * 1, y1, c); P.rect(-sd * (1 - w), y0, -sd * 1, y1, c, true); return P; },
    };
    return P;
  };
  const torsoTexCache = new WeakMap();
  // Standard torso texture: top colour + declarative features + optional custom painter a.torso(P, a)
  C3.torsoTexture = function (a) {
    if (torsoTexCache.has(a)) return torsoTexCache.get(a);
    const t = T.create(128, 64, a.top || '#6a7a9a');
    const P = C3.Painter(t);
    const S = a.skin || '#f0c8a0';
    if (a.backColor) P.rect(-1, 0, 1, 1, a.backColor, true);
    if (a.midriff) P.band(0, typeof a.midriff === 'number' ? a.midriff : 0.3, S);
    if (a.open) { const o = a.open; const w = o.w != null ? o.w : 0.3, wb = o.wb != null ? o.wb : w; P.poly([[-wb, o.y0 || 0], [wb, o.y0 || 0], [w, 1.01], [-w, 1.01]], o.c || S); }
    if (a.vneck) { const v = a.vneck; const w = v.w || 0.35, d = v.depth != null ? v.depth : 0.35; P.poly([[-w, 1.01], [w, 1.01], [0, 1 - d]], v.c || S); }
    const ex = a.extras || [];
    // suit: white shirt V between the lapels (+ tie), lapel edges
    if (ex.includes('suitShirt') || a.shirt) {
      const sc = a.shirt || '#f0f0f0', d = a.shirtDepth != null ? a.shirtDepth : 0.5, w = a.shirtW || 0.32;
      P.poly([[-w, 1.01], [w, 1.01], [0.02, 1 - d], [-0.02, 1 - d]], sc);
      if (a.lapels !== false) { P.line(-w, 1.0, -0.02, 1 - d, 1.4, sh(a.top || '#333333', -0.35)); P.line(w, 1.0, 0.02, 1 - d, 1.4, sh(a.top || '#333333', -0.35)); }
    }
    if (a.tie || ex.includes('tie')) { const tc = a.tie || a.tieColor || '#7a1818'; P.poly([[-0.045, 0.93], [0.045, 0.93], [0.07, 0.5], [0, 0.44], [-0.07, 0.5]], tc); }
    if (a.zipper) P.line(0, 0.02, 0, 0.96, 1.2, a.zipper);
    const strapC = a.straps || (ex.includes('straps') ? (a.strapColor || '#6a2818') : null);
    if (strapC) { const c = strapC, w = a.strapW || 0.16; [-1, 1].forEach(s => { P.poly([[s * 0.36, 1.01], [s * (0.36 + w), 1.01], [s * (0.3 + w), 0], [s * 0.3, 0]], c); P.poly([[s * 0.28, 1.01], [s * (0.28 + w), 1.01], [s * (0.22 + w), 0], [s * 0.22, 0]], c, true); }); }
    if (a.buttons) { const n = a.buttonN || 3; for (let i = 0; i < n; i++) P.dot(a.buttonX || 0, 0.25 + i * (0.5 / Math.max(1, n - 1)), 0.06, a.buttons); }
    if (a.collarColor) P.band(0.9, 1, a.collarColor);
    if (a.torso) a.torso(P, a, S);
    if (a.beltPaint) { P.band(0, 0.1, a.beltPaint); if (a.buckle) P.rect(-0.1, 0.005, 0.1, 0.095, a.buckle); }
    torsoTexCache.set(a, t);
    return t;
  };

  // ------------------------------------------------------------------ presets
  const OUTFIT_TOPS = ['#6a7a9a', '#9a5a4a', '#5a8a5a', '#8a7a4a', '#7a5a8a', '#4a6a8a', '#a08050', '#607060', '#b07060', '#c0b090', '#d0d0c8', '#3a5a7a', '#8a3a3a', '#6a6a50'];
  C3.variant = function (base, seed) {
    const b = C3.PRESETS[base] || C3.PRESETS.man;
    const r = U.rng(U.strSeed(base + ':' + seed));
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    if (b.rig) return Object.assign({}, b);
    if (C3.variantHook) { const v = C3.variantHook(base, b, r, pick); if (v) return v; }
    const o = Object.assign({}, b);
    o.hair = pick(['#201810', '#503018', '#7a4a20', '#a07040', '#d0b060', '#303030', '#8a3018']);
    o.top = pick(OUTFIT_TOPS);
    o.bottom = pick(['#4a4a5a', '#3a3a3a', '#5a4a38', '#2a3a5a', '#6a5a48']);
    o.sleeve = b.sleeve === 'skin' ? 'skin' : (r() > 0.5 ? o.top : sh(o.top, -0.15));
    if (b.skirt === 'long') o.bottom = sh(o.top, r() * 0.2 - 0.1);
    o.boots = pick(['#302018', '#4a3020', '#202020', '#5a4a3a']);
    o.skin = pick(['#f0c8a0', '#f4d0b0', '#e0b088', '#c89070', '#8a5a38', '#f0c8a0']);
    return o;
  };
  const variantMemo = {};
  C3.resolve = function resolve(app) {
    const P = C3.PRESETS;
    if (!app) return P.man || {};
    if (typeof app === 'string') {
      if (P[app]) return P[app];
      const m = app.match(/^([a-z_]+?)_?(\d+)$/);
      if (m && P[m[1]]) { const k = m[1] + ':' + m[2]; return variantMemo[k] || (variantMemo[k] = C3.variant(m[1], m[2])); }
      return P.man || {};
    }
    const base = app.base ? resolve(app.base) : (P.man || {});
    return Object.assign({}, base, app);
  };

  // ------------------------------------------------------------------ humanoid builder
  function buildHuman(a, style) {
    const battle = style === 'battle';
    const pr = Object.assign({}, PROPS[battle ? 'battle' : 'field'], (a.props && a.props[battle ? 'battle' : 'field']) || {});
    const ex = a.extras || [];
    const m = new FF7.Model();
    m.app = a; m.style = style; m.rig = 'human';
    let bw = 1, bd = 1, hs = a.headScale || 1, ls = 1, as = 1, al = 1, hsc = 1, ts = 1;
    switch (a.build) {
      case 'big': bw = 1.5; bd = 1.36; as = 1.5; hsc = 1.28; ts = 1.08; break;
      case 'muscle': bw = 1.28; bd = 1.15; as = 1.35; hsc = 1.12; break;
      case 'fat': bw = 1.45; bd = 1.6; as = 1.2; hsc = 1.05; ls = 0.92; break;
      case 'slim': bw = 0.88; bd = 0.9; as = 0.88; break;
      case 'tall': ls = 1.1; ts = 1.04; break;
      case 'stocky': bw = 1.15; bd = 1.12; ls = 0.9; as = 1.1; break;
    }
    if (a.female) { bw *= 0.88; as *= 0.82; hsc *= 0.84; }
    const kid = a.height === 'kid';
    if (kid) { ls = 0.6; hs *= 1.08; bw *= 0.78; bd *= 0.85; as *= 0.8; al = 0.66; hsc *= 0.78; ts = 0.72; }
    if (a.height === 'short') { ls *= 0.86; ts *= 0.92; al *= 0.92; }
    if (a.height === 'tall') { ls *= 1.08; ts *= 1.03; }
    // field NPC frame: the PS1 field townsfolk have big heads (28-30% of the height with the hair), big fists
    // and shoes and short legs (Model Reference). On for every adult field preset except the hand-tuned ones
    // (fieldChibi: false, or an explicit headScale / legScale).
    const chibi = !battle && !kid && a.fieldChibi !== false && a.headScale == null && a.legScale == null;
    let fsc = 1;
    if (chibi) { hs *= 1.22; ls *= 0.87; hsc *= 1.2; fsc = 1.15; }
    if (a.legScale) ls *= a.legScale;
    if (a.armScale) as *= a.armScale;
    if (a.handScale) hsc *= a.handScale;
    if (a.shoulderScale) bw *= 1;  // (applied to shoulders only below)
    const S = a.skin || '#f0c8a0', TOP = a.top || '#6a7a9a', BOT = a.bottom || '#4a4a5a', BO = a.boots || '#302018';
    const SLV = a.sleeve === 'skin' ? S : (a.sleeve || TOP);
    const FORE = a.forearm === 'skin' ? S : (a.forearm || (a.sleeve === 'skin' || a.shortSleeves ? S : SLV));
    const GL = a.gloves || S;
    const LEG = a.legs === 'skin' ? S : (a.legs || BOT);

    // shoes (and heels) are flatter than boots: the ankle sits lower (the shin takes up the difference) so the sole
    // still lands on the ground
    const foot = pr.foot * (a.shoes ? 0.8 : 1) * (a.heels ? 0.9 : 1), shin = pr.shin * ls + (pr.foot - foot), thigh = pr.thigh * ls;
    const hipsY = foot + shin + thigh;
    const TT = pr.torso * ts, pel = pr.pelvis * (kid ? 0.8 : 1);
    const shX = pr.shoulderX * bw * (a.shoulderScale || 1);
    m.bone('hips', null, [0, hipsY, 0]);
    m.bone('torso', 'hips', [0, pel, 0]);
    m.bone('head', 'torso', [0, TT + pr.neck, 0]);
    const shY = TT * 0.9;
    const up = pr.upper * al, fo = pr.fore * al;
    m.bone('armL', 'torso', [shX, shY, -0.004]);
    m.bone('foreL', 'armL', [0, -up, 0]);
    m.bone('handL', 'foreL', [0, -fo, 0]);
    m.bone('armR', 'torso', [-shX, shY, -0.004]);
    m.bone('foreR', 'armR', [0, -up, 0]);
    m.bone('handR', 'foreR', [0, -fo, 0]);
    const lx = pr.legX * Math.min(bw, 1.3) * (a.female ? 1.02 : 1);
    m.bone('thighL', 'hips', [lx, 0, 0]);
    m.bone('shinL', 'thighL', [0, -thigh, 0]);
    m.bone('footL', 'shinL', [0, -shin, 0]);
    m.bone('thighR', 'hips', [-lx, 0, 0]);
    m.bone('shinR', 'thighR', [0, -thigh, 0]);
    m.bone('footR', 'shinR', [0, -shin, 0]);
    const handSz = pr.hand * hsc;
    m.bone('weapon', 'handR', [0, -handSz * 0.5, 0.004]);
    m.bone('back', 'torso', [0, TT * 0.6, -pr.chestRZ * bd]);

    const fem = a.female ? 1 : 0;
    const fat = a.build === 'fat';
    // ---- pelvis
    const hipW = pr.hipRX * bw * (fem ? 1.08 : 1) * (a.pants === 'baggy' ? 1.1 : 1);
    m.attach('hips', meshOf(mb => mb.loft([
      { y: -0.04 * (battle ? 1 : 1.1), rx: hipW * 0.78, rz: pr.waistRZ * 0.95 * bd },
      { y: -0.005, rx: hipW, rz: pr.waistRZ * 1.12 * bd * (fat ? 1.15 : 1) },
      { y: pel + 0.004, rx: pr.waistRX * bw * (fat ? 1.2 : 1), rz: pr.waistRZ * bd * (fat ? 1.25 : 1) },
    ], { sides: 10, color: a.skirt ? (a.skirtUnder || BOT) : (a.pelvisColor || BOT) })));
    // ---- torso (cylindrically painted)
    const torsoRings = [
      { y: 0, rx: pr.waistRX * bw * (fat ? 1.2 : 1), rz: pr.waistRZ * bd * (fat ? 1.25 : 1) },
      { y: TT * 0.3, rx: pr.waistRX * 1.04 * bw * (fat ? 1.35 : 1), rz: pr.waistRZ * 1.06 * bd * (fat ? 1.45 : 1), z: fat ? 0.012 : 0 },
      { y: TT * 0.58, rx: pr.chestRX * bw * (fat ? 1.18 : 1), rz: pr.chestRZ * bd * (fat ? 1.2 : 1), z: 0.003, rzf: pr.chestRZ * bd * (1 + fem * 0.4) * (fat ? 1.25 : 1) },
      { y: TT * 0.8, rx: pr.chestRX * 1.08 * bw, rz: pr.chestRZ * 0.98 * bd, rzf: pr.chestRZ * bd * (1 + fem * 0.25) },
      { y: TT * 0.94, rx: Math.max(pr.chestRX * 1.02 * bw, shX * 0.98), rz: pr.chestRZ * 0.78 * bd },
      { y: TT * 1.01, rx: pr.chestRX * 0.5 * bw, rz: pr.chestRZ * 0.52 * bd },
    ];
    const tmesh = meshOf(mb => mb.loft(torsoRings, { sides: 16, color: '#ffffff', uv: 'cyl', phase: 0 }));
    tmesh.tex = C3.torsoTexture(a);
    m.attach('torso', tmesh);
    // neck
    const nr = (battle ? 0.027 : 0.034) * hs * (a.build === 'big' ? 1.3 : 1);
    m.attach('torso', meshOf(mb => mb.loft([{ y: TT * 0.9, rx: nr * 1.1, rz: nr }, { y: TT + pr.neck + 0.02, rx: nr, rz: nr * 0.95 }], { sides: 8, color: a.neckColor || S })));
    // ---- head
    const hh = pr.headH * hs, hw = pr.headW * hs * (a.headWide || 1), hd = pr.headD * hs;
    const jaw = a.jaw || (a.female || kid ? 0.72 : 0.84);
    const chin = a.chin != null ? a.chin : (a.female ? 0.16 : 0.2);
    const headRings = [
      { y: 0.0, rx: hw * chin, rz: hd * 0.2, z: hd * 0.06 },
      { y: hh * 0.07, rx: hw * 0.3 * jaw, rz: hd * 0.3, z: hd * 0.1 },
      { y: hh * 0.22, rx: hw * 0.44 * jaw, rz: hd * 0.42, z: hd * 0.05 },
      { y: hh * 0.45, rx: hw * 0.5, rz: hd * 0.49, z: hd * 0.02 },
      { y: hh * 0.68, rx: hw * 0.515, rz: hd * 0.5 },
      { y: hh * 0.88, rx: hw * 0.43, rz: hd * 0.43, z: -hd * 0.02 },
      { y: hh, rx: hw * 0.2, rz: hd * 0.2, z: -hd * 0.03 },
    ];
    const headMesh = meshOf(mb => mb.loft(headRings, { sides: 12, color: '#ffffff', sq: a.headSq || 2.4, uv: 'front', uvBox: [-hw * 0.48, hw * 0.48, -hh * 0.02, hh * 0.86], uvMinSin: 0.2, uvElse: [0.012, 0.012] }));
    headMesh.tex = C3.faceTexture(a, style); headMesh.alphaTest = 0.01;
    m.attach('head', headMesh);
    if (!a.noEars) m.attach('head', meshOf(mb => [1, -1].forEach(s => mb.loft([{ y: hh * 0.32, rx: 0.01 * hs, rz: hd * 0.07, x: s * hw * 0.5, z: -hd * 0.02 }, { y: hh * 0.46, rx: 0.016 * hs, rz: hd * 0.1, x: s * hw * 0.53, z: -hd * 0.03 }, { y: hh * 0.58, rx: 0.012 * hs, rz: hd * 0.08, x: s * hw * 0.52, z: -hd * 0.04 }], { sides: 6, color: sh(S, -0.08) }))));
    const H = { hw, hh, hd, rings: headRings, sq: a.headSq || 2.4, style, battle, pr, bw, bd, as, al, hs, hipsY, TT, thigh, shin, foot, up, fo, handSz, shX, pel, hipW, fem, kid };
    m.H = H;
    const hairFn = typeof a.hairStyle === 'function' ? a.hairStyle : (C3.HAIR[a.hairStyle] || C3.HAIR.short);
    if (hairFn && a.hairStyle !== 'none') { const hm = meshOf(mb => hairFn(mb, H, a, style)); if (hm.count) m.attach('head', hm); }
    // ---- arms
    const r0 = pr.armR * as;
    const armMesh = meshOf(mb => {
      mb.sphere(0, 0, 0, r0 * 1.3, r0 * 1.25, r0 * 1.25, SLV, 8, 5, true);
      mb.loft([{ y: 0.01, rx: r0 * 1.18, rz: r0 * 1.15 }, { y: -up * 0.4, rx: r0 * 1.08, rz: r0 }, { y: -up, rx: r0 * 0.92, rz: r0 * 0.9 }], { sides: 8, color: a.shortSleeves && a.sleeve !== 'skin' ? S : SLV });
      if (a.shortSleeves && a.sleeve !== 'skin') mb.loft([{ y: 0.015, rx: r0 * 1.32, rz: r0 * 1.3 }, { y: -up * 0.45, rx: r0 * 1.28, rz: r0 * 1.22 }], { sides: 8, color: SLV });
      if (a.sleeveCuff) mb.loft([{ y: -up * 0.4, rx: r0 * 1.3, rz: r0 * 1.25 }, { y: -up * 0.62, rx: r0 * 1.26, rz: r0 * 1.2 }], { sides: 8, color: a.sleeveCuff });
    });
    const foreMesh = (side) => meshOf(mb => {
      if (ex.includes('gunarm' + side) && C3.EXTRA.gunarmMesh) { C3.EXTRA.gunarmMesh(mb, H, a, side); return; }
      const r = pr.foreR * as * (battle ? 1 : 0.95);
      const flare = battle ? 1 : 1.12;
      const gl = a.longGloves ? GL : FORE;
      mb.loft([{ y: 0.01, rx: r * 0.8, rz: r * 0.78, color: FORE }, { y: -fo * 0.35, rx: r * 0.95, rz: r * 0.88, color: a.longGloves ? GL : FORE }, { y: -fo * 0.75, rx: r * 0.95 * flare, rz: r * 0.88 * flare, color: gl }, { y: -fo, rx: r * 0.86 * flare, rz: r * 0.8 * flare, color: gl }], { sides: 8 });
      if (a.bracer) mb.loft([{ y: -fo * 0.42, rx: r * 1.12 * flare, rz: r * 1.05 * flare }, { y: -fo * 1.02, rx: r * 1.02 * flare, rz: r * 0.96 * flare }], { sides: 8, color: a.bracer });
      if (a.wristband) mb.loft([{ y: -fo * 0.8, rx: r * 1.1 * flare, rz: r * 1.05 * flare }, { y: -fo * 1.01, rx: r * 1.05 * flare, rz: r * 1.0 * flare }], { sides: 8, color: a.wristband });
    });
    const handMesh = (side) => meshOf(mb => {
      if (ex.includes('gunarm' + side)) return;
      const hz = handSz;
      const claw = side === 'L' && ex.includes('clawL');
      const hc = claw ? (a.clawColor || '#c8a030') : GL;
      // mitten fist: palm block + finger roll + thumb. a.fist = [width, length, depth] factors (the PS1 field models
      // have wide, blocky fists: Barret's are as wide as his forearm cuff)
      const fk = a.fist || [1, 1, 1];
      mb.push(); mb.scale(fk[0], fk[1], fk[2]);
      mb.rbox(0, -hz * 0.48, 0.002, hz * 0.6, hz * 0.9, hz * 0.66, hc, 0.3);
      mb.rbox(0, -hz * 0.78, hz * 0.06, hz * 0.58, hz * 0.3, hz * 0.6, sh(hc, -0.07), 0.45);
      mb.rbox(side === 'L' ? -hz * 0.06 : hz * 0.06, -hz * 0.42, hz * 0.3, hz * 0.24, hz * 0.4, hz * 0.18, sh(hc, -0.04), 0.35);
      mb.pop();
      if (claw) for (let i = 0; i < 4; i++) mb.blade([(i - 1.5) * hz * 0.15, -hz * 0.85, hz * 0.05], [0, -1, 0.35], hz * 0.55, hz * 0.1, hz * 0.07, a.clawColor || '#d8b040');
    });
    m.attach('armL', armMesh); m.attach('armR', armMesh);
    m.attach('foreL', foreMesh('L')); m.attach('foreR', foreMesh('R'));
    m.attach('handL', handMesh('L')); m.attach('handR', handMesh('R'));
    // ---- legs
    const baggy = a.pants === 'baggy' ? (battle ? 1.35 : 1.45) : a.pants === 'tight' ? 0.86 : 1;
    const big = a.build === 'big' || a.build === 'fat' || a.build === 'muscle';
    const tr = pr.thighR * (big ? 1.25 : 1) * (a.female ? 0.95 : 1) * (kid ? 0.9 : 1);
    const srr = pr.shinR * (big ? 1.22 : 1) * (a.female ? 0.88 : 1) * (kid ? 0.9 : 1);
    const shorts = a.pants === 'shorts' || a.pants === 'knee';
    const bareLegs = a.legs === 'skin';
    const bootTop = a.bootTop != null ? a.bootTop : a.bootsTall ? 0.85 : a.shoes ? 0.06 : (battle ? 0.42 : 0.55);
    const thighMesh = meshOf(mb => {
      const legC = bareLegs ? S : LEG;
      if (shorts) {
        const k = a.pants === 'knee' ? 0.95 : 0.45;
        mb.loft([{ y: 0.025, rx: tr * 1.18, rz: tr * 1.12 }, { y: -thigh * k, rx: tr * (a.pants === 'knee' ? 1.2 : 1.16), rz: tr * 1.1 }], { sides: 8, color: BOT });
        if (k < 0.9) mb.loft([{ y: -thigh * (k - 0.05), rx: tr * 0.96, rz: tr * 0.92 }, { y: -thigh, rx: srr * 1.08, rz: srr * 1.04 }], { sides: 8, color: legC });
        else mb.loft([{ y: -thigh * 0.8, rx: tr * 0.9, rz: tr * 0.88 }, { y: -thigh - 0.005, rx: srr * 1.06, rz: srr * 1.02 }], { sides: 8, color: legC });
      } else {
        const c = a.skirt && !a.pants ? legC : BOT;
        if (baggy > 1.01) mb.loft([{ y: 0.025, rx: tr * 1.08, rz: tr * 1.04 }, { y: -thigh * 0.45, rx: tr * 1.08 * baggy, rz: tr * 1.02 * baggy }, { y: -thigh * 0.85, rx: tr * 1.02 * baggy, rz: tr * 0.98 * baggy }, { y: -thigh - 0.004, rx: tr * 0.9 * baggy, rz: tr * 0.88 * baggy }], { sides: 8, color: c });
        else mb.loft([{ y: 0.025, rx: tr * 1.06, rz: tr }, { y: -thigh * 0.5, rx: tr * 1.1 * baggy, rz: tr * 1.04 * baggy }, { y: -thigh, rx: srr * 1.12, rz: srr * 1.06 }], { sides: 8, color: c });
      }
    });
    const shinMesh = meshOf(mb => {
      const c = (a.pants && !shorts) ? BOT : (bareLegs ? S : LEG);
      const bag = baggy > 1 && !shorts ? (battle ? 1.25 : 1.2) : 1;
      if (bag > 1) mb.loft([{ y: 0.006, rx: tr * 0.92 * baggy, rz: tr * 0.9 * baggy }, { y: -shin * 0.3, rx: srr * 1.2 * bag, rz: srr * 1.16 * bag }, { y: -shin * (1 - bootTop) - 0.01, rx: srr * 0.95, rz: srr * 0.94 }, { y: -shin, rx: srr * 0.8, rz: srr * 0.8 }], { sides: 8, color: c });
      else mb.loft([{ y: 0.004, rx: srr * 1.1, rz: srr * 1.05 }, { y: -shin * 0.4, rx: srr * 1.1, rz: srr * 1.08 }, { y: -shin * (1 - bootTop) - 0.01, rx: srr * 0.92, rz: srr * 0.92 }, { y: -shin, rx: srr * 0.8, rz: srr * 0.8 }], { sides: 8, color: c });
      if (bootTop > 0.1) {
        const bk = (battle ? 1 : 1.3) * (a.bootScale || 1);
        mb.loft([{ y: -shin * (1 - bootTop), rx: srr * 1.14 * bk, rz: srr * 1.12 * bk }, { y: -shin * (1 - bootTop * 0.45), rx: srr * 1.06 * bk, rz: srr * 1.04 * bk }, { y: -shin - 0.004, rx: srr * 1.06 * bk, rz: srr * 1.08 * bk }], { sides: 8, color: a.bootShaft || BO });
        if (a.bootCuff) mb.loft([{ y: -shin * (1 - bootTop) + 0.004, rx: srr * 1.24 * bk, rz: srr * 1.22 * bk }, { y: -shin * (1 - bootTop * 0.8), rx: srr * 1.2 * bk, rz: srr * 1.18 * bk }], { sides: 8, color: a.bootCuff });
      }
      if (a.socks) mb.loft([{ y: -shin * 0.55, rx: srr * 1.18, rz: srr * 1.16 }, { y: -shin - 0.004, rx: srr * 1.1, rz: srr * 1.1 }], { sides: 8, color: a.socks });
    });
    const footMesh = meshOf(mb => {
      const bigF = (big ? 1.12 : 1) * (a.female ? 0.85 : 1) * (kid ? 0.8 : 1) * (a.shoes ? 0.88 : 1) * (a.footScale || 1) * fsc;
      const fl = pr.footL * bigF, fw = pr.footW * bigF;
      const fh = foot;
      const C = a.shoeColor || BO;
      mb.push(); mb.translate(0, -fh * 0.5 - 0.002, fl * 0.2); mb.rotate(Math.PI / 2, 0, 0);
      mb.loft([{ y: -fl * 0.52, rx: fw * 0.42, rz: fh * 0.48 }, { y: -fl * 0.32, rx: fw * 0.5, rz: fh * 0.52 }, { y: fl * 0.2, rx: fw * 0.52, rz: fh * 0.5, z: fh * 0.02 }, { y: fl * 0.46, rx: fw * 0.4, rz: fh * 0.32, z: fh * 0.16 }, { y: fl * 0.5, rx: fw * 0.28, rz: fh * 0.22, z: fh * 0.2 }], { sides: 8, color: C, sq: 3.2 });
      mb.pop();
      if (a.sole) mb.rbox(0, -fh + fh * 0.1, fl * 0.2, fw * 0.98, fh * 0.2, fl * 0.98, a.sole, 0.2);
      if (a.toePoint) { mb.push(); mb.translate(0, -fh * 0.56, fl * 0.5); mb.rotate(Math.PI / 2, 0, 0); mb.loft([{ y: -fl * 0.12, rx: fw * 0.56, rz: fh * 0.5 }, { y: fl * 0.14, rx: fw * 0.44, rz: fh * 0.34, z: fh * 0.06 }, { y: fl * a.toePoint, rx: fw * 0.05, rz: fh * 0.05, z: -fh * 0.04 }], { sides: 6, color: a.toeColor || C }); mb.pop(); }   // long pointed toe cap (Vincent)
      else if (a.toeColor) { mb.push(); mb.translate(0, -fh * 0.55, fl * 0.55); mb.rotate(Math.PI / 2, 0, 0); mb.loft([{ y: -fl * 0.08, rx: fw * 0.5, rz: fh * 0.5 }, { y: fl * 0.12, rx: fw * 0.36, rz: fh * 0.34, z: fh * 0.1 }, { y: fl * 0.2, rx: fw * 0.1, rz: fh * 0.1, z: fh * 0.2 }], { sides: 8, color: a.toeColor, sq: 3 }); mb.pop(); }
    });
    ['L', 'R'].forEach(sd => { m.attach('thigh' + sd, thighMesh); m.attach('shin' + sd, shinMesh); m.attach('foot' + sd, footMesh); });
    // ---- skirts / dresses
    if (a.skirt) {
      const long = a.skirt === 'long';
      const len = long ? thigh + shin * (a.skirtLen || 0.92) : thigh * (a.skirtLen || 0.5);
      const flare = a.skirtFlare || (long ? 1.6 : 1.3);
      const sc = a.skirtColor || BOT;
      const sw = Math.max(hipW * 1.12, (lx + tr * 1.12)) / hipW;   // skirt must clear the thighs
      m.attach('hips', meshOf(mb => mb.loft([
        { y: pel + 0.006, rx: pr.waistRX * 1.04 * bw, rz: pr.waistRZ * 1.08 * bd },
        { y: 0.035, rx: hipW * sw * 0.98, rz: Math.max(pr.waistRZ * 1.25 * bd, tr * 1.12) },
        { y: -0.01, rx: hipW * sw, rz: Math.max(pr.waistRZ * 1.3 * bd, tr * 1.15) },
        { y: -len * 0.45, rx: hipW * sw * (1 + (flare - 1) * 0.55), rz: Math.max(pr.waistRZ * 1.35 * bd, tr * 1.2) * (1 + (flare - 1) * 0.55) },
        { y: -len, rx: hipW * sw * flare * 0.95, rz: Math.max(pr.waistRZ * 1.3 * bd, tr * 1.2) * flare },
      ], { sides: 14, color: sc, capBottom: false, capTop: false }), null, { cull: false }));
    }
    for (const e of ex) if (C3.EXTRA[e]) C3.EXTRA[e](m, H, a, style);
    if (a.custom) a.custom(m, H, a, style);
    // weapon (battle). The meshes are built along -y from the grip (along the forearm); the grip (C3.GRIP[weapon],
    // or a.weaponGrip) turns the weapon in the fist: dir = where its -y end points in the battle stance
    // (x = model's left, y = up, z = forward), roll = turn about its own length, arm = [armR, foreR] stance override
    m.weaponMesh = null;
    const grip = a.weaponGrip || C3.GRIP[a.weapon];
    if (a.weapon && C3.WEAPON[a.weapon]) m.weaponMesh = meshOf(mb => {
      if (grip && grip.dir) { const d = V.norm(grip.dir); mb.rotate(Math.atan2(-d[1], d[2]), 0, Math.asin(d[0])); if (grip.roll) mb.rotate(0, grip.roll, 0); }
      C3.WEAPON[a.weapon](mb, battle ? 1 : 0.7);
    });
    m.battleArm = (grip && grip.arm) || null;
    m.showWeapon = function (on) {
      const b = m.bones.weapon;
      b.meshes = on && m.weaponMesh ? [{ mesh: m.weaponMesh, m: null, opts: { cull: false } }] : [];
      if (m.bones.back && m.weaponOnBack) m.bones.back.visible = !on;
    };
    m.height = hipsY + pel + TT + pr.neck + hh;
    m.anims = { idle: 'idle', walk: 'walk', run: 'run', battle: 'battle', attack: C3.attackAnim(a), hurt: 'hurt', dead: 'dead', cast: 'cast', item: 'item', victory: 'victory', weak: 'weak', defend: 'defend' };
    return m;
  }
  C3.buildHuman = buildHuman;
  C3.attackAnim = (a) => a.attackAnim || ({ buster: 'slash', masamune: 'slash', fist: 'punch', staff: 'slash', spear: 'thrust', gunarm: 'shoot', gun: 'shoot', rifle: 'shoot', smg: 'shoot', shuriken: 'slash', shotgun: 'shoot', rod: 'slash', sword: 'slash', megaphone: 'punch', katana: 'slash', whip: 'slash' }[a.weapon] || 'punch');

  // ------------------------------------------------------------------ public
  const meshCache = new Map();
  // per-style overrides: preset.styleOver = { battle: {...}, field: {...} } (cached so painted textures are reused)
  C3.forStyle = function (a, style) {
    if (!a || !a.styleOver || !a.styleOver[style]) return a;
    if (!Object.prototype.hasOwnProperty.call(a, '_so')) Object.defineProperty(a, '_so', { value: {}, enumerable: false });
    return a._so[style] || (a._so[style] = Object.assign({}, a, a.styleOver[style]));
  };
  // a statue (app.stone: the colour of its stone): every vertex colour turned to that stone, a shade lighter or darker
  // by how light it was, so a coat or a ribbon still reads as a carved part. The colours a rig keeps for itself, which
  // no app key reaches (Aeris's ribbon, Vincent's cape), go too: Kupomon's Route 14 statues were stone with a pink
  // ribbon and a red cape (the user, 2026-10-03)
  function petrify(m, hex) {
    const st = FF7.glColor(hex), done = new Map();
    const fix = (me) => {
      if (!me || !me.col) return me;
      if (done.has(me)) return done.get(me);
      const c = new Float32Array(me.col);
      for (let i = 0; i < me.count; i++) {
        const l = 0.3 * c[i * 4] + 0.59 * c[i * 4 + 1] + 0.11 * c[i * 4 + 2], k = 0.8 + 0.35 * l;
        c[i * 4] = Math.min(1, st[0] * k); c[i * 4 + 1] = Math.min(1, st[1] * k); c[i * 4 + 2] = Math.min(1, st[2] * k);
      }
      const m2 = Object.assign({}, me, { col: c, gl: null });
      done.set(me, m2); return m2;
    };
    for (const b of m.order) for (const a of b.meshes) a.mesh = fix(a.mesh);
    if (m.weaponMesh) m.weaponMesh = fix(m.weaponMesh);
  }
  C3.build = function (app, opts = {}) {
    const style = opts.style || 'field';
    const a = C3.forStyle(C3.resolve(app), style);
    const key = (typeof app === 'string' ? app : JSON.stringify(app)) + '|' + style;
    const special = a.rig && C3.RIGS[a.rig];
    const m = special ? special(a, style) : buildHuman(a, style);
    // a.fieldScale: overall size of the field model next to the rest of the cast (heights measured from the FF7 field
    // models relative to Cloud). Applied through baseScale, which the field and world map multiply into the draw scale.
    if (style === 'field' && a.fieldScale) { m.baseScale = (m.baseScale || 1) * a.fieldScale; m.height *= a.fieldScale; }
    const tpl = meshCache.get(key);
    if (tpl) {
      m.order.forEach((b, i) => { const tb = tpl.order[i]; if (tb && tb.name === b.name && tb.meshes.length === b.meshes.length) b.meshes.forEach((mm, k) => { mm.mesh = tb.meshes[k].mesh; }); });
      if (tpl.weaponMesh) m.weaponMesh = tpl.weaponMesh;
    } else { if (a.stone) petrify(m, a.stone); meshCache.set(key, m); }   // (the cached copy is the stone one)
    m.appKey = key;
    if (m.anims) m.play(m.anims.idle);
    return m;
  };
})();
