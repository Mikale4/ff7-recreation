// Pixel-buffer textures (RGBA arrays) drawn with simple vector primitives. They work both in the
// browser (uploaded to WebGL) and in node (tools/render_model.js software renderer), so models look
// identical in both.
(function () {
  const U = FF7.util;
  const T = FF7.tex = {};
  const rgba = (c) => {
    if (Array.isArray(c)) return c.length === 4 ? c : [c[0], c[1], c[2], 255];
    const [r, g, b] = U.hexToRgb(c);
    return [r, g, b, 255];
  };
  T.create = function (w, h, bg) {
    const t = { isTex: true, w, h, data: new Uint8ClampedArray(w * h * 4), id: T._n = (T._n || 0) + 1 };
    if (bg) T.fillRect(t, 0, 0, w, h, bg);
    return t;
  };
  function blend(t, x, y, c, a) {
    if (x < 0 || y < 0 || x >= t.w || y >= t.h) return;
    const i = (y * t.w + x) * 4, d = t.data;
    const al = (c[3] / 255) * a;
    if (al >= 0.999) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; return; }
    const da = d[i + 3] / 255;
    const oa = al + da * (1 - al);
    if (oa <= 0) return;
    d[i] = (c[0] * al + d[i] * da * (1 - al)) / oa;
    d[i + 1] = (c[1] * al + d[i + 1] * da * (1 - al)) / oa;
    d[i + 2] = (c[2] * al + d[i + 2] * da * (1 - al)) / oa;
    d[i + 3] = oa * 255;
  }
  // coverage-sampled shapes (4x4 supersampling for smooth edges)
  function shape(t, x0, y0, x1, y1, inside, col) {
    const c = rgba(col);
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(t.h - 1, Math.ceil(y1)); y++) {
      for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(t.w - 1, Math.ceil(x1)); x++) {
        let n = 0;
        for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) if (inside(x + (sx + 0.5) / 4, y + (sy + 0.5) / 4)) n++;
        if (n) blend(t, x, y, c, n / 16);
      }
    }
    return t;
  }
  T.fillRect = (t, x, y, w, h, col) => shape(t, x, y, x + w, y + h, (px, py) => px >= x && px < x + w && py >= y && py < y + h, col);
  T.fillEllipse = (t, cx, cy, rx, ry, col, rot = 0) => {
    const c = Math.cos(rot), s = Math.sin(rot), R = Math.max(rx, ry);
    return shape(t, cx - R, cy - R, cx + R, cy + R, (px, py) => { const dx = px - cx, dy = py - cy; const u = dx * c + dy * s, v = -dx * s + dy * c; return (u * u) / (rx * rx) + (v * v) / (ry * ry) <= 1; }, col);
  };
  T.fillPoly = (t, pts, col) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    const inside = (px, py) => { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) ins = !ins; } return ins; };
    return shape(t, x0, y0, x1, y1, inside, col);
  };
  T.line = (t, xa, ya, xb, yb, wdt, col) => {
    const dx = xb - xa, dy = yb - ya, L = Math.hypot(dx, dy) || 1;
    const hw = wdt / 2;
    return shape(t, Math.min(xa, xb) - hw, Math.min(ya, yb) - hw, Math.max(xa, xb) + hw, Math.max(ya, yb) + hw, (px, py) => {
      const u = ((px - xa) * dx + (py - ya) * dy) / (L * L);
      const k = U.clamp(u, 0, 1);
      const qx = xa + dx * k, qy = ya + dy * k;
      return Math.hypot(px - qx, py - qy) <= hw;
    }, col);
  };
  // quadratic curve stroke
  T.curve = (t, pts, wdt, col) => { for (let i = 0; i < pts.length - 1; i++) T.line(t, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], wdt, col); return t; };
  T.gradientV = (t, x, y, w, h, c1, c2) => { const a = rgba(c1), b = rgba(c2); for (let yy = 0; yy < h; yy++) { const k = h > 1 ? yy / (h - 1) : 0; T.fillRect(t, x, y + yy, w, 1, [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k]); } return t; };
  T.sample = (t, u, v) => {
    const x = U.clamp(Math.floor(u * t.w), 0, t.w - 1), y = U.clamp(Math.floor(v * t.h), 0, t.h - 1);
    const i = (y * t.w + x) * 4;
    return [t.data[i], t.data[i + 1], t.data[i + 2], t.data[i + 3]];
  };
})();
