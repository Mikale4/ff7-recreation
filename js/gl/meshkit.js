// MeshBuilder: builds low-poly vertex-coloured meshes (FF7 style) from primitives.
//   const mb = new FF7.MeshBuilder();
//   mb.push(); mb.translate(0,1,0); mb.box(0,0,0, 1,1,1, '#c04040'); mb.pop();
//   const mesh = mb.build();
(function () {
  const U = FF7.util, M4 = FF7.M4;

  function col(c) {
    if (!c) return [1, 1, 1, 1];
    if (Array.isArray(c)) return c.length === 4 ? c : [c[0], c[1], c[2], 1];
    if (c.startsWith('rgba')) { const m = c.match(/[\d.]+/g).map(Number); return [m[0] / 255, m[1] / 255, m[2] / 255, m[3]]; }
    const [r, g, b] = U.hexToRgb(c);
    return [r / 255, g / 255, b / 255, 1];
  }
  FF7.glColor = col;

  class MeshBuilder {
    constructor() {
      this.P = []; this.N = []; this.C = []; this.T = [];
      this.stack = []; this.m = M4.create();
    }
    // ---- transform stack ----
    push() { this.stack.push(new Float32Array(this.m)); return this; }
    pop() { this.m = this.stack.pop(); return this; }
    apply(mat) { M4.mul(this.m, this.m, mat); return this; }
    translate(x, y, z) { return this.apply(M4.trs(M4.create(), [x, y, z], [0, 0, 0], [1, 1, 1])); }
    rotate(rx, ry, rz) { return this.apply(M4.trs(M4.create(), [0, 0, 0], [rx, ry, rz], [1, 1, 1])); }
    scale(x, y, z) { return this.apply(M4.trs(M4.create(), [0, 0, 0], [0, 0, 0], [x, y == null ? x : y, z == null ? x : z])); }
    xf(p) { const m = this.m; return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; }
    xn(n) { const m = this.m; return FF7.V3.norm([m[0] * n[0] + m[4] * n[1] + m[8] * n[2], m[1] * n[0] + m[5] * n[1] + m[9] * n[2], m[2] * n[0] + m[6] * n[1] + m[10] * n[2]]); }

    // ---- raw triangles (local coords, CCW = front) ----
    tri(a, b, c, color, uvs, normals) {
      const A = this.xf(a), B = this.xf(b), C = this.xf(c);
      let n;
      if (!normals) {
        n = FF7.V3.norm(FF7.V3.cross(FF7.V3.sub(B, A), FF7.V3.sub(C, A)));
      }
      const cc = Array.isArray(color) && Array.isArray(color[0]) ? color : [col(color), col(color), col(color)];
      const ca = cc.map(x => Array.isArray(x) && x.length >= 3 ? (x.length === 4 ? x : [x[0], x[1], x[2], 1]) : col(x));
      [A, B, C].forEach((p, i) => {
        this.P.push(p[0], p[1], p[2]);
        const nn = normals ? this.xn(normals[i]) : n;
        this.N.push(nn[0], nn[1], nn[2]);
        this.C.push(ca[i][0], ca[i][1], ca[i][2], ca[i][3]);
        const uv = uvs ? uvs[i] : [0, 0];
        this.T.push(uv[0], uv[1]);
      });
      return this;
    }
    quad(a, b, c, d, color, uvs, normals) {
      // a b c d counter-clockwise
      this.tri(a, b, c, color, uvs ? [uvs[0], uvs[1], uvs[2]] : null, normals ? [normals[0], normals[1], normals[2]] : null);
      this.tri(a, c, d, color, uvs ? [uvs[0], uvs[2], uvs[3]] : null, normals ? [normals[0], normals[2], normals[3]] : null);
      return this;
    }

    // ---- primitives ----
    // Axis-aligned box centred at (x,y,z). color: one colour or {top,bottom,front,back,left,right}
    box(x, y, z, w, h, d, color) {
      const hw = w / 2, hh = h / 2, hd = d / 2;
      return this.frustum(x, y - hh, z, w, d, w, d, h, color);
    }
    // Tapered box from base (x,y,z) upward by h: bottom size (w0,d0), top size (w1,d1).
    // offTop: [dx,dz] shifts the top face (for slanted shapes).
    frustum(x, y, z, w0, d0, w1, d1, h, color, offTop) {
      const c = (k) => (color && typeof color === 'object' && !Array.isArray(color)) ? (color[k] || color.side || '#ffffff') : color;
      const ox = offTop ? offTop[0] : 0, oz = offTop ? offTop[1] : 0;
      const b = [[x - w0 / 2, y, z - d0 / 2], [x + w0 / 2, y, z - d0 / 2], [x + w0 / 2, y, z + d0 / 2], [x - w0 / 2, y, z + d0 / 2]];
      const t = [[x - w1 / 2 + ox, y + h, z - d1 / 2 + oz], [x + w1 / 2 + ox, y + h, z - d1 / 2 + oz], [x + w1 / 2 + ox, y + h, z + d1 / 2 + oz], [x - w1 / 2 + ox, y + h, z + d1 / 2 + oz]];
      this.quad(t[3], t[2], t[1], t[0], c('top'));          // top (+y)
      this.quad(b[0], b[1], b[2], b[3], c('bottom'));       // bottom (-y)
      this.quad(b[3], b[2], t[2], t[3], c('front'));        // front (+z)
      this.quad(b[1], b[0], t[0], t[1], c('back'));         // back (-z)
      this.quad(b[2], b[1], t[1], t[2], c('right'));        // right (+x)
      this.quad(b[0], b[3], t[3], t[0], c('left'));         // left (-x)
      return this;
    }
    // Limb hanging down from the origin: top (w0,d0) at y=0, bottom (w1,d1) at y=-len
    limb(w0, d0, w1, d1, len, color, off) {
      return this.frustum(0, -len, 0, w1, d1, w0, d0, len, color, off ? [-off[0], -off[1]] : null);
    }
    // n-sided prism / cone along +y. r1=0 makes a cone.
    prism(x, y, z, r0, r1, h, n, color, smooth, capTop = true, capBottom = true) {
      const pts0 = [], pts1 = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        pts0.push([x + Math.cos(a) * r0, y, z + Math.sin(a) * r0]);
        pts1.push([x + Math.cos(a) * r1, y + h, z + Math.sin(a) * r1]);
      }
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        if (smooth) {
          const a0 = (i / n) * Math.PI * 2, a1 = (j / n) * Math.PI * 2;
          const slope = (r0 - r1) / (h || 1);
          const n0 = FF7.V3.norm([Math.cos(a0), slope, Math.sin(a0)]), n1 = FF7.V3.norm([Math.cos(a1), slope, Math.sin(a1)]);
          if (r1 > 0) this.quad(pts0[j], pts0[i], pts1[i], pts1[j], color, null, [n1, n0, n0, n1]);
          else this.tri(pts0[j], pts0[i], pts1[i], color, null, [n1, n0, [0, 1, 0]]);
        } else {
          if (r1 > 0) this.quad(pts0[j], pts0[i], pts1[i], pts1[j], color);
          else this.tri(pts0[j], pts0[i], pts1[i], color);
        }
      }
      if (capBottom && r0 > 0) for (let i = 1; i < n - 1; i++) this.tri(pts0[0], pts0[i], pts0[i + 1], color);
      if (capTop && r1 > 0) for (let i = 1; i < n - 1; i++) this.tri(pts1[0], pts1[i + 1], pts1[i], color);
      return this;
    }
    // Cone pointing along a direction from base point (for spikes/horns/hair spikes)
    spike(base, dir, len, r, n, color) {
      this.push();
      const d = FF7.V3.norm(dir);
      // rotation taking +y to d
      const ry = Math.atan2(d[0], d[2]);
      const rx = Math.acos(U.clamp(d[1], -1, 1));
      this.translate(base[0], base[1], base[2]);
      this.rotate(0, ry, 0);
      this.rotate(rx, 0, 0);
      this.prism(0, 0, 0, r, 0, len, n || 4, color);
      this.pop();
      return this;
    }
    // Low-poly ellipsoid centred at (x,y,z) with radii (rx,ry,rz)
    // ringLimit < rings draws only the top part (a dome); frontCut skips front faces below ring frontCut
    sphere(x, y, z, rx, ry, rz, color, seg = 8, rings = 6, smooth = true, colorFn, ringLimit, frontCut) {
      const pt = (i, j) => {
        const th = (j / rings) * Math.PI, ph = (i / seg) * Math.PI * 2;
        const nx = Math.sin(th) * Math.cos(ph), ny = Math.cos(th), nz = Math.sin(th) * Math.sin(ph);
        return { p: [x + nx * rx, y + ny * ry, z + nz * rz], n: FF7.V3.norm([nx / rx, ny / ry, nz / rz]) };
      };
      const lim = ringLimit || rings;
      for (let j = 0; j < lim; j++) {
        if (frontCut != null && j >= frontCut) {
          // back half only for the lower rings (hair covering the back of the head)
          for (let i = 0; i < seg; i++) {
            const ph = ((i + 0.5) / seg) * Math.PI * 2;
            if (Math.sin(ph) > 0.35) continue;
            const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1);
            const cc = colorFn ? colorFn(i, j, a.p) : color;
            if (j === rings - 1) this.tri(a.p, b.p, d.p, cc, null, smooth ? [a.n, b.n, d.n] : null);
            else this.quad(a.p, b.p, c.p, d.p, cc, null, smooth ? [a.n, b.n, c.n, d.n] : null);
          }
          continue;
        }
        for (let i = 0; i < seg; i++) {
          const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1);
          const cc = colorFn ? colorFn(i, j, a.p) : color;
          if (j === 0) this.tri(a.p, c.p, d.p, cc, null, smooth ? [a.n, c.n, d.n] : null);
          else if (j === rings - 1) this.tri(a.p, b.p, d.p, cc, null, smooth ? [a.n, b.n, d.n] : null);
          else this.quad(a.p, b.p, c.p, d.p, cc, null, smooth ? [a.n, b.n, c.n, d.n] : null);
        }
      }
      return this;
    }
    // Flat textured quad facing +z (for faces/decals/billboards). uv rect [u0,v0,u1,v1]
    plane(x, y, z, w, h, color, uv = [0, 0, 1, 1]) {
      const a = [x - w / 2, y - h / 2, z], b = [x + w / 2, y - h / 2, z], c = [x + w / 2, y + h / 2, z], d = [x - w / 2, y + h / 2, z];
      return this.quad(a, b, c, d, color, [[uv[0], uv[3]], [uv[2], uv[3]], [uv[2], uv[1]], [uv[0], uv[1]]]);
    }
    // Horizontal quad (floor) at height y, facing up
    floor(x0, z0, x1, z1, y, color, uv) {
      return this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], color, uv ? [[uv[0], uv[3]], [uv[2], uv[3]], [uv[2], uv[1]], [uv[0], uv[1]]] : null);
    }
    // Extrude a 2D polygon (x,z points, CCW seen from above) upward from y0 to y1
    extrude(pts, y0, y1, color, topColor) {
      const n = pts.length;
      for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        this.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], color);
      }
      for (let i = 1; i < n - 1; i++) this.tri([pts[0][0], y1, pts[0][1]], [pts[i][0], y1, pts[i][1]], [pts[i + 1][0], y1, pts[i + 1][1]], topColor || color);
      return this;
    }

    // Darken/lighten all vertex colours by a function of position (fake AO / baked light)
    bake(fn) {
      for (let i = 0; i < this.P.length / 3; i++) {
        const k = fn(this.P[i * 3], this.P[i * 3 + 1], this.P[i * 3 + 2], this.N[i * 3], this.N[i * 3 + 1], this.N[i * 3 + 2]);
        this.C[i * 4] *= k; this.C[i * 4 + 1] *= k; this.C[i * 4 + 2] *= k;
      }
      return this;
    }
    get vertexCount() { return this.P.length / 3; }
    build(opts = {}) {
      const mesh = {
        pos: new Float32Array(this.P), nrm: new Float32Array(this.N), col: new Float32Array(this.C), uv: new Float32Array(this.T),
        count: this.P.length / 3, gl: null,
      };
      Object.assign(mesh, opts);
      // bounding box
      let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (let i = 0; i < this.P.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], this.P[i + k]); mx[k] = Math.max(mx[k], this.P[i + k]); }
      mesh.min = mn; mesh.max = mx;
      return mesh;
    }
  }
  FF7.MeshBuilder = MeshBuilder;
})();
