// Kupomon's small UI pieces, drawn in code like the rest of the game's menus: the job-type badge (a shaded, glossy pill
// with the type's own icon on a medallion), the round type gem beside a move's name, and the status tag.
//   KP.typeBadge(type, x, y, w, h)   KP.typeGem(type, cx, cy, r)   KP.statusBadge(kind, x, y, w, h)
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {}, R = FF7.render, PI = Math.PI;

  // ------------------------------------------------------------------ colour helpers
  const rgb = (c) => { c = String(c).replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16)); };
  const mix = (c, to, k) => { const a = rgb(c), b = rgb(to); return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',') + ')'; };
  const lum = (c) => { const [r, g, b] = rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const pill = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };

  // ------------------------------------------------------------------ the type icons: drawn around (0, 0), s = their radius
  const poly = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); };
  const ICON = {
    freelancer(c, s) { const k = 0.28 * s; poly(c, [[0, -s], [k, -k], [s, 0], [k, k], [0, s], [-k, k], [-s, 0], [-k, -k]]); },   // a sparkle: anything goes
    warrior(c, s) {   // a broadsword
      c.rotate(PI / 4);
      poly(c, [[0, -s * 1.1], [s * 0.2, -s * 0.8], [s * 0.2, s * 0.35], [-s * 0.2, s * 0.35], [-s * 0.2, -s * 0.8]]);
      c.fillRect(-s * 0.6, s * 0.3, s * 1.2, s * 0.22); c.fillRect(-s * 0.1, s * 0.5, s * 0.2, s * 0.5);
    },
    knight(c, s) { c.beginPath(); c.moveTo(-s * 0.8, -s * 0.85); c.lineTo(s * 0.8, -s * 0.85); c.lineTo(s * 0.8, -s * 0.05); c.quadraticCurveTo(s * 0.72, s * 0.7, 0, s); c.quadraticCurveTo(-s * 0.72, s * 0.7, -s * 0.8, -s * 0.05); c.closePath(); c.fill(); },   // a shield
    monk(c, s, dark) {   // a fist
      pill(c, -s * 0.8, -s * 0.6, s * 1.6, s * 1.25, s * 0.35); c.fill();
      c.strokeStyle = dark; c.lineWidth = Math.max(1, s * 0.16);
      for (const fx of [-0.4, 0, 0.4]) { c.beginPath(); c.moveTo(s * fx, -s * 0.6); c.lineTo(s * fx, -s * 0.1); c.stroke(); }
    },
    thief(c, s) { c.rotate(-PI / 4); poly(c, [[0, -s], [s * 0.22, -s * 0.55], [s * 0.18, s * 0.2], [-s * 0.18, s * 0.2], [-s * 0.22, -s * 0.55]]); c.fillRect(-s * 0.5, s * 0.18, s, s * 0.2); c.fillRect(-s * 0.1, s * 0.38, s * 0.2, s * 0.55); },   // a dagger
    dragoon(c, s) { c.rotate(PI / 4); c.fillRect(-s * 0.09, -s * 0.5, s * 0.18, s * 1.6); poly(c, [[0, -s * 1.15], [s * 0.32, -s * 0.45], [-s * 0.32, -s * 0.45]]); },   // a lance
    ranger(c, s) {   // a bow and arrow
      c.lineWidth = Math.max(1.2, s * 0.22); c.beginPath(); c.arc(-s * 0.55, 0, s * 1.05, -PI / 3, PI / 3); c.stroke();
      c.lineWidth = Math.max(0.8, s * 0.1); c.beginPath(); c.moveTo(-s * 0.02, -s * 0.9); c.lineTo(-s * 0.02, s * 0.9); c.stroke();
      c.fillRect(-s * 0.7, -s * 0.07, s * 1.4, s * 0.14); poly(c, [[s * 0.95, 0], [s * 0.55, -s * 0.3], [s * 0.55, s * 0.3]]);
    },
    blackmage(c, s) { poly(c, [[s * 0.1, -s * 1.05], [s * 0.6, s * 0.4], [-s * 0.55, s * 0.4]]); c.beginPath(); c.ellipse(0, s * 0.45, s * 1.0, s * 0.26, 0, 0, PI * 2); c.fill(); },   // the pointed hat
    whitemage(c, s) { const k = s * 0.2; c.fillRect(-k, -s * 0.9, 2 * k, s * 1.8); c.fillRect(-s * 0.9, -k, s * 1.8, 2 * k); },   // the holy cross
    redmage(c, s, dark) {   // a feather
      c.rotate(PI / 5); c.beginPath(); c.moveTo(0, -s * 1.05); c.quadraticCurveTo(s * 0.7, -s * 0.2, 0, s * 0.75); c.quadraticCurveTo(-s * 0.7, -s * 0.2, 0, -s * 1.05); c.fill();
      c.strokeStyle = dark; c.lineWidth = Math.max(0.8, s * 0.1); c.beginPath(); c.moveTo(0, -s * 0.8); c.lineTo(0, s * 1.05); c.stroke();
    },
    summoner(c, s) { c.beginPath(); c.moveTo(-s * 0.55, s * 0.95); c.quadraticCurveTo(-s * 0.75, -s * 0.55, s * 0.75, -s * 0.95); c.quadraticCurveTo(-s * 0.05, -s * 0.35, s * 0.25, s * 0.95); c.closePath(); c.fill(); },   // a horn
    timemage(c, s) {   // an hourglass
      c.fillRect(-s * 0.7, -s * 1.0, s * 1.4, s * 0.2); c.fillRect(-s * 0.7, s * 0.8, s * 1.4, s * 0.2);
      poly(c, [[-s * 0.55, -s * 0.8], [s * 0.55, -s * 0.8], [0, 0]]); poly(c, [[0, 0], [s * 0.55, s * 0.8], [-s * 0.55, s * 0.8]]);
    },
    bard(c, s) {   // a note
      c.beginPath(); c.ellipse(-s * 0.3, s * 0.6, s * 0.38, s * 0.28, -0.4, 0, PI * 2); c.fill();
      c.fillRect(s * 0.0, -s * 0.95, s * 0.17, s * 1.55);
      c.beginPath(); c.moveTo(s * 0.17, -s * 0.95); c.quadraticCurveTo(s * 0.95, -s * 0.6, s * 0.6, -s * 0.05); c.quadraticCurveTo(s * 0.7, -s * 0.5, s * 0.17, -s * 0.5); c.closePath(); c.fill();
    },
    beast(c, s) {   // a paw
      c.beginPath(); c.ellipse(0, s * 0.38, s * 0.5, s * 0.42, 0, 0, PI * 2); c.fill();
      for (const [px, py] of [[-0.62, -0.18], [-0.22, -0.68], [0.22, -0.68], [0.62, -0.18]]) { c.beginPath(); c.arc(px * s, py * s, s * 0.22, 0, PI * 2); c.fill(); }
    },
    machinist(c, s, dark) {   // a gear
      for (let i = 0; i < 8; i++) { c.save(); c.rotate(i * PI / 4); c.fillRect(-s * 0.16, -s * 1.0, s * 0.32, s * 0.4); c.restore(); }
      c.beginPath(); c.arc(0, 0, s * 0.7, 0, PI * 2); c.fill();
      c.fillStyle = dark; c.beginPath(); c.arc(0, 0, s * 0.28, 0, PI * 2); c.fill();
    },
  };
  function icon(t, cx, cy, s, col, dark) {
    const c = R.ctx, f = ICON[t] || ICON.freelancer;
    c.save(); c.translate(cx, cy); c.fillStyle = c.strokeStyle = col; c.lineCap = 'round'; f(c, s, dark); c.restore();
  }
  KP.typeIcon = icon;

  // ------------------------------------------------------------------ the badge: a glossy pill, the icon on a medallion at
  // its left end, the type's name; light colours (White Mage) get dark lettering
  KP.typeBadge = function (t, x, y, w = 84, h = 17) {
    const c = R.ctx, col = KP.TYPE_COLORS[t] || '#888888', r = h / 2, light = lum(col) > 0.62, dark = mix(col, '#000000', 0.5);
    c.save();
    pill(c, x + 1, y + 2, w, h, r); c.fillStyle = 'rgba(0,0,20,0.45)'; c.fill();   // (its shadow)
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, mix(col, '#ffffff', 0.4)); g.addColorStop(0.5, col); g.addColorStop(1, mix(col, '#000000', 0.32));
    pill(c, x, y, w, h, r); c.fillStyle = g; c.fill();
    c.save(); pill(c, x, y, w, h, r); c.clip();   // the gloss, over the top half
    const gl = c.createLinearGradient(0, y, 0, y + h * 0.55); gl.addColorStop(0, 'rgba(255,255,255,0.5)'); gl.addColorStop(1, 'rgba(255,255,255,0.04)');
    c.fillStyle = gl; c.fillRect(x + r * 0.6, y + 1, w - r * 1.2, h * 0.48);
    c.restore();
    pill(c, x + 0.5, y + 0.5, w - 1, h - 1, r - 0.5); c.lineWidth = 1; c.strokeStyle = mix(col, '#000000', 0.6); c.stroke();
    // the medallion
    const mx = x + r, my = y + r, mr = r - 1.6;
    const mg = c.createRadialGradient(mx - mr * 0.3, my - mr * 0.35, mr * 0.1, mx, my, mr);
    mg.addColorStop(0, mix(col, '#000000', 0.25)); mg.addColorStop(1, mix(col, '#000000', 0.62));
    c.beginPath(); c.arc(mx, my, mr, 0, PI * 2); c.fillStyle = mg; c.fill();
    c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,0.6)'; c.stroke();
    icon(t, mx, my, mr * 0.66, '#ffffff', mix(col, '#000000', 0.62));
    // the name, as large as fits
    const name = KP.TYPE_NAMES[t] || '?', room = w - h - 7;
    let fs = Math.round(h * 0.68); while (fs > 8 && R.measure(name, fs, '800') > room) fs--;
    c.font = R.font(fs, '800'); c.textAlign = 'center'; c.textBaseline = 'middle';
    const tx = x + h + 2 + room / 2, ty = y + h / 2 + 0.5;
    c.fillStyle = light ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,10,0.65)'; c.fillText(name, tx + 1, ty + 1);
    c.fillStyle = light ? '#2a2834' : '#ffffff'; c.fillText(name, tx, ty);
    c.restore();
  };
  // a move's type: a round gem with the icon
  KP.typeGem = function (t, cx, cy, r = 8) {
    const c = R.ctx, col = KP.TYPE_COLORS[t] || '#888888';
    c.save();
    c.beginPath(); c.arc(cx + 1, cy + 1.5, r, 0, PI * 2); c.fillStyle = 'rgba(0,0,20,0.45)'; c.fill();
    const g = c.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, mix(col, '#ffffff', 0.45)); g.addColorStop(0.6, col); g.addColorStop(1, mix(col, '#000000', 0.45));
    c.beginPath(); c.arc(cx, cy, r, 0, PI * 2); c.fillStyle = g; c.fill();
    c.lineWidth = 1; c.strokeStyle = mix(col, '#000000', 0.6); c.stroke();
    const light = lum(col) > 0.62;
    icon(t || 'freelancer', cx, cy, r * 0.58, light ? '#3a3640' : '#ffffff', light ? col : mix(col, '#000000', 0.5));
    c.restore();
  };
  // Kupomon's mark, a moogle's red pom-pom on its stalk: beside a wild moogle's name when you've befriended its kind
  KP.pomIcon = function (cx, cy, r = 6) {
    const c = R.ctx;
    c.save();
    c.strokeStyle = '#2a2a34'; c.lineWidth = Math.max(1.5, r * 0.32); c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx, cy + r * 0.6); c.lineTo(cx, cy + r * 1.7); c.stroke();
    const g = c.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, '#ffa0b0'); g.addColorStop(0.5, '#e8304c'); g.addColorStop(1, '#8a1020');
    c.beginPath(); c.arc(cx, cy, r, 0, PI * 2); c.fillStyle = g; c.fill();
    c.lineWidth = 1; c.strokeStyle = '#ffffff'; c.stroke();
    c.restore();
  };
  // a tag (the battle boxes' stat stages and ailments, Showdown-style): a small pill in a colour; returns its width
  KP.tag = function (text, x, y, col, h = 15) {
    const c = R.ctx, fs = Math.round(h * 0.66), w = Math.ceil(R.measure(text, fs, '800')) + 12, r = h / 2;
    c.save();
    const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, mix(col, '#ffffff', 0.3)); g.addColorStop(1, mix(col, '#000000', 0.25));
    pill(c, x, y, w, h, r); c.fillStyle = g; c.fill();
    c.lineWidth = 1; c.strokeStyle = mix(col, '#000000', 0.55); c.stroke();
    c.font = R.font(fs, '800'); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(0,0,10,0.55)'; c.fillText(text, x + w / 2 + 1, y + h / 2 + 1.5);
    c.fillStyle = '#ffffff'; c.fillText(text, x + w / 2, y + h / 2 + 0.5);
    c.restore();
    return w;
  };
  // a dojo badge: a metal medallion with its emblem (shuriken, gear, fist, wing, flower, clock); grey if not won
  const EMBLEM = {
    1(c, r) { const k = r * 0.22; for (let i = 0; i < 4; i++) { c.save(); c.rotate(i * PI / 2); c.beginPath(); c.moveTo(0, -r); c.lineTo(k, -k); c.lineTo(-k, -k); c.closePath(); c.fill(); c.restore(); } c.beginPath(); c.arc(0, 0, r * 0.2, 0, PI * 2); c.fill(); },
    2(c, r, dark) { for (let i = 0; i < 8; i++) { c.save(); c.rotate(i * PI / 4); c.fillRect(-r * 0.15, -r, r * 0.3, r * 0.4); c.restore(); } c.beginPath(); c.arc(0, 0, r * 0.68, 0, PI * 2); c.fill(); c.fillStyle = dark; c.beginPath(); c.arc(0, 0, r * 0.26, 0, PI * 2); c.fill(); },
    3(c, r, dark) { pill(c, -r * 0.75, -r * 0.55, r * 1.5, r * 1.15, r * 0.3); c.fill(); c.strokeStyle = dark; c.lineWidth = Math.max(1, r * 0.1); for (const f of [-0.35, 0, 0.35]) { c.beginPath(); c.moveTo(r * f, -r * 0.55); c.lineTo(r * f, -r * 0.1); c.stroke(); } },
    4(c, r) { c.beginPath(); c.moveTo(-r * 0.8, r * 0.5); c.quadraticCurveTo(-r * 0.4, -r * 0.9, r * 0.9, -r * 0.7); c.quadraticCurveTo(r * 0.2, -r * 0.3, r * 0.6, -r * 0.1); c.quadraticCurveTo(0, 0, r * 0.3, r * 0.3); c.quadraticCurveTo(-r * 0.2, r * 0.25, -r * 0.8, r * 0.5); c.fill(); },
    5(c, r, dark) { for (let i = 0; i < 5; i++) { c.save(); c.rotate(i * PI * 2 / 5); c.beginPath(); c.ellipse(0, -r * 0.48, r * 0.3, r * 0.48, 0, 0, PI * 2); c.fill(); c.restore(); } c.fillStyle = dark; c.beginPath(); c.arc(0, 0, r * 0.24, 0, PI * 2); c.fill(); },
    6(c, r, dark) { c.beginPath(); c.arc(0, 0, r * 0.85, 0, PI * 2); c.fill(); c.strokeStyle = dark; c.lineWidth = Math.max(1.5, r * 0.12); c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -r * 0.6); c.moveTo(0, 0); c.lineTo(r * 0.42, r * 0.2); c.stroke(); },
    7(c, r, dark) {   // (a flame, its heart cut out)
      const flame = (k) => { c.beginPath(); c.moveTo(0, r * 0.85 * k); c.bezierCurveTo(-r * 0.75 * k, r * 0.7 * k, -r * 0.7 * k, -r * 0.1 * k, -r * 0.1 * k, -r * 0.95 * k); c.bezierCurveTo(-r * 0.05 * k, -r * 0.45 * k, r * 0.35 * k, -r * 0.35 * k, r * 0.3 * k, -r * 0.7 * k); c.bezierCurveTo(r * 0.8 * k, -r * 0.2 * k, r * 0.75 * k, r * 0.7 * k, 0, r * 0.85 * k); c.fill(); };
      flame(1); c.save(); c.translate(0, r * 0.28); c.fillStyle = dark; flame(0.42); c.restore();
    },
    8(c, r, dark) {   // (a showman's star, a spotlight in its middle)
      c.beginPath(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, k = i % 2 ? r * 0.42 : r; c.lineTo(Math.cos(a) * k, Math.sin(a) * k); } c.closePath(); c.fill();
      c.fillStyle = dark; c.beginPath(); c.arc(0, r * 0.04, r * 0.2, 0, PI * 2); c.fill();
    },
  };
  KP.badgeIcon = function (n, cx, cy, r, got) {
    const c = R.ctx, B = (KP.BADGES || [])[n], col = got && B ? B.col : '#4a4e5a';
    c.save();
    c.beginPath(); c.arc(cx + 1.5, cy + 2.5, r, 0, PI * 2); c.fillStyle = 'rgba(0,0,20,0.5)'; c.fill();
    const g = c.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, mix(col, '#ffffff', 0.5)); g.addColorStop(0.6, col); g.addColorStop(1, mix(col, '#000000', 0.45));
    c.beginPath(); c.arc(cx, cy, r, 0, PI * 2); c.fillStyle = g; c.fill();
    c.lineWidth = 2; c.strokeStyle = got ? '#f0e0a0' : '#6a6e7a'; c.stroke();
    c.translate(cx, cy); c.fillStyle = got ? '#ffffff' : '#7a7e8a';
    (EMBLEM[n] || EMBLEM[1])(c, r * 0.62, mix(col, '#000000', 0.5));
    c.restore();
  };
  // a league trophy: a cup on a stand, in the league's colour (grey until won)
  KP.trophyIcon = function (cx, cy, s, col, got) {
    const c = R.ctx, k = got ? col : '#4a4e5a', g = c.createLinearGradient(cx - s, 0, cx + s, 0);
    g.addColorStop(0, mix(k, '#000000', 0.35)); g.addColorStop(0.45, mix(k, '#ffffff', 0.45)); g.addColorStop(1, mix(k, '#000000', 0.4));
    c.save(); c.fillStyle = g; c.strokeStyle = mix(k, '#000000', 0.6); c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(cx - s * 0.7, cy - s); c.lineTo(cx + s * 0.7, cy - s); c.quadraticCurveTo(cx + s * 0.65, cy, cx, cy + s * 0.15); c.quadraticCurveTo(cx - s * 0.65, cy, cx - s * 0.7, cy - s); c.closePath(); c.fill(); c.stroke();
    c.lineWidth = s * 0.12; c.strokeStyle = g; [1, -1].forEach(d => { c.beginPath(); c.arc(cx + d * s * 0.72, cy - s * 0.6, s * 0.26, d > 0 ? -PI / 2 : PI / 2, d > 0 ? PI / 2 : PI * 1.5); c.stroke(); });
    c.fillRect(cx - s * 0.1, cy + s * 0.1, s * 0.2, s * 0.45); c.fillRect(cx - s * 0.45, cy + s * 0.52, s * 0.9, s * 0.18);
    c.restore();
  };
  // a status: a small pill in its colour
  KP.statusBadge = function (kind, x, y, w = 38, h = 15) {
    const st = KP.STATUS[kind]; if (!st) return;
    const c = R.ctx, col = st.col || '#806080', r = h / 2;
    c.save();
    const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, mix(col, '#ffffff', 0.35)); g.addColorStop(1, mix(col, '#000000', 0.3));
    pill(c, x, y, w, h, r); c.fillStyle = g; c.fill();
    c.lineWidth = 1; c.strokeStyle = mix(col, '#000000', 0.6); c.stroke();
    c.font = R.font(Math.round(h * 0.66), '800'); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(0,0,10,0.6)'; c.fillText(st.short, x + w / 2 + 1, y + h / 2 + 1.5);
    c.fillStyle = '#ffffff'; c.fillText(st.short, x + w / 2, y + h / 2 + 0.5);
    c.restore();
  };
})();
