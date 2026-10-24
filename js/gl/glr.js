// WebGL renderer. 3D scenes are drawn into an offscreen WebGL canvas which is then composited
// into the main 2D canvas (UI, text and battle effects are drawn in 2D on top).
//
//   GL.begin({ clear, fog, light })   GL.camera(eye, target, fovDeg)   GL.draw(mesh, matrix, opts)
//   GL.drawModel(model)   GL.project([x,y,z]) -> {x,y,depth,visible} in 640x480 space   GL.end()
(function () {
  const U = FF7.util, M4 = FF7.M4;
  const GL = FF7.GL = { ok: false };

  const VS = `
    attribute vec3 aPos; attribute vec3 aNrm; attribute vec4 aCol; attribute vec2 aUV;
    uniform mat4 uModel, uView, uProj;
    uniform vec3 uLightDir, uLightCol, uLight2Dir, uLight2Col, uAmbient;
    uniform float uUnlit, uCurve;
    uniform vec3 uCurveCenter;
    varying vec4 vCol; varying vec2 vUV; varying float vDepth;
    void main() {
      vec4 wp = uModel * vec4(aPos, 1.0);
      vec2 cd = wp.xz - uCurveCenter.xz;
      wp.y -= uCurve * dot(cd, cd);
      vec3 n = normalize((uModel * vec4(aNrm, 0.0)).xyz);
      vec3 lit = uAmbient + uLightCol * max(dot(n, -uLightDir), 0.0) + uLight2Col * max(dot(n, -uLight2Dir), 0.0);
      vCol = vec4(aCol.rgb * mix(lit, vec3(1.0), uUnlit), aCol.a);
      vUV = aUV;
      vec4 vp = uView * wp;
      vDepth = -vp.z;
      gl_Position = uProj * vp;
    }`;
  const FS = `
    precision mediump float;
    uniform sampler2D uTex; uniform float uUseTex; uniform float uAlphaTest;
    uniform vec4 uTint; uniform vec3 uAdd; uniform vec3 uFogCol; uniform vec2 uFog;
    varying vec4 vCol; varying vec2 vUV; varying float vDepth;
    void main() {
      vec4 c = vCol;
      if (uUseTex > 0.5) c *= texture2D(uTex, vUV);
      if (c.a < uAlphaTest) discard;
      c *= uTint;
      c.rgb += uAdd;
      float f = clamp((vDepth - uFog.x) / max(0.001, uFog.y - uFog.x), 0.0, 1.0);
      c.rgb = mix(c.rgb, uFogCol, f);
      gl_FragColor = c;
    }`;

  let gl, prog, loc = {}, white;
  const view = M4.create(), proj = M4.create(), vp = M4.create();
  const tmp = M4.create();
  GL.viewMat = view; GL.projMat = proj;

  GL.init = function () {
    GL.canvas = document.createElement('canvas');
    GL.canvas.width = FF7.W; GL.canvas.height = FF7.H;
    gl = GL.canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: true, alpha: true, premultipliedAlpha: false });
    if (!gl) { console.error('WebGL not available'); return false; }
    GL.gl = gl;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    ['aPos', 'aNrm', 'aCol', 'aUV'].forEach(n => loc[n] = gl.getAttribLocation(prog, n));
    ['uModel', 'uView', 'uProj', 'uCurve', 'uCurveCenter', 'uLightDir', 'uLightCol', 'uLight2Dir', 'uLight2Col', 'uAmbient', 'uUnlit', 'uTex', 'uUseTex', 'uAlphaTest', 'uTint', 'uAdd', 'uFogCol', 'uFog']
      .forEach(n => loc[n] = gl.getUniformLocation(prog, n));
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    white = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, white);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    GL.ok = true;
    return true;
  };

  // Internal render resolution (multiple of 640x480)
  GL.setScale = function (s) {
    const w = Math.round(FF7.W * s), h = Math.round(FF7.H * s);
    if (GL.canvas.width !== w || GL.canvas.height !== h) { GL.canvas.width = w; GL.canvas.height = h; }
  };

  GL.begin = function (o = {}) {
    if (!GL.ok) return;
    const q = FF7.state && FF7.state.config ? FF7.state.config.gfxScale : null;
    GL.setScale(q || Math.min(2, Math.max(1, FF7.render.scale || 1)));
    gl.viewport(0, 0, GL.canvas.width, GL.canvas.height);
    const cc = o.clear || [0, 0, 0, 1];
    gl.clearColor(cc[0], cc[1], cc[2], cc[3] == null ? 1 : cc[3]);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const L = o.light || {};
    const ld = FF7.V3.norm(L.dir || [-0.4, -0.8, -0.5]);
    const l2 = FF7.V3.norm(L.dir2 || [0.6, -0.2, 0.7]);
    gl.uniform3fv(loc.uLightDir, ld);
    gl.uniform3fv(loc.uLightCol, L.color || [0.75, 0.72, 0.68]);
    gl.uniform3fv(loc.uLight2Dir, l2);
    gl.uniform3fv(loc.uLight2Col, L.color2 || [0.18, 0.2, 0.28]);
    gl.uniform3fv(loc.uAmbient, L.ambient || [0.38, 0.38, 0.42]);
    const F = o.fog || { color: cc, near: 1e5, far: 1e6 };
    gl.uniform3fv(loc.uFogCol, F.color.slice(0, 3));
    gl.uniform2f(loc.uFog, F.near, F.far);
    gl.uniform1f(loc.uCurve, o.curve || 0);
    gl.uniform3fv(loc.uCurveCenter, o.curveCenter || [0, 0, 0]);
    GL.frameOpts = o;
  };

  GL.camera = function (eye, target, fovDeg = 45, near = 0.1, far = 500, up) {
    M4.lookAt(view, eye, target, up || [0, 1, 0]);
    M4.perspective(proj, fovDeg * Math.PI / 180, FF7.W / FF7.H, near, far);
    M4.mul(vp, proj, view);
    GL.eye = eye; GL.target = target;
    if (gl) { gl.uniformMatrix4fv(loc.uView, false, view); gl.uniformMatrix4fv(loc.uProj, false, proj); }
  };
  GL.orthoCamera = function (l, r, b, t, n, f) {
    M4.identity(view); M4.ortho(proj, l, r, b, t, n, f); M4.mul(vp, proj, view);
    if (gl) { gl.uniformMatrix4fv(loc.uView, false, view); gl.uniformMatrix4fv(loc.uProj, false, proj); }
  };

  // Project a world point to logical screen coords.
  GL.project = function (p) {
    const x = p[0], y = p[1], z = p[2];
    const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12];
    const cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13];
    const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
    if (cw <= 0.0001) return { x: -9999, y: -9999, visible: false, depth: cw };
    return { x: (cx / cw * 0.5 + 0.5) * FF7.W, y: (1 - (cy / cw * 0.5 + 0.5)) * FF7.H, visible: true, depth: cw };
  };

  // ---------- textures from canvases ----------
  const texCache = new WeakMap();
  GL.texture = function (canvas, opts = {}) {
    let t = texCache.get(canvas);
    if (t && !canvas._dirty) return t;
    if (!t) t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    if (canvas.isTex) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.w, canvas.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(canvas.data.buffer));
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    const filt = opts.nearest ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
    const wrap = opts.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    texCache.set(canvas, t);
    canvas._dirty = false;
    return t;
  };

  // ---------- mesh upload ----------
  function upload(mesh) {
    const mk = (arr) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); return b; };
    mesh.gl = { pos: mk(mesh.pos), nrm: mk(mesh.nrm), col: mk(mesh.col), uv: mk(mesh.uv) };
  }
  GL.release = function (mesh) {
    if (!mesh || !mesh.gl) return;
    for (const k in mesh.gl) gl.deleteBuffer(mesh.gl[k]);
    mesh.gl = null;
  };

  const ONE = [1, 1, 1, 1], ZERO = [0, 0, 0];
  // Draw a mesh. opts: { tint:[r,g,b,a], add:[r,g,b], tex: canvas, unlit, blend:'alpha'|'add', noDepthWrite, alphaTest, cull:false }
  GL.draw = function (mesh, model, opts = {}) {
    if (!GL.ok || !mesh || !mesh.count) return;
    if (!mesh.gl) upload(mesh);
    const g = mesh.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, g.pos); gl.enableVertexAttribArray(loc.aPos); gl.vertexAttribPointer(loc.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, g.nrm); gl.enableVertexAttribArray(loc.aNrm); gl.vertexAttribPointer(loc.aNrm, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, g.col); gl.enableVertexAttribArray(loc.aCol); gl.vertexAttribPointer(loc.aCol, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, g.uv); gl.enableVertexAttribArray(loc.aUV); gl.vertexAttribPointer(loc.aUV, 2, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(loc.uModel, false, model || GL.IDENT);
    const tex = opts.tex || mesh.tex;
    if (tex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, GL.texture(tex, mesh.texOpts || opts.texOpts || {})); gl.uniform1i(loc.uTex, 0); gl.uniform1f(loc.uUseTex, 1); }
    else { gl.bindTexture(gl.TEXTURE_2D, white); gl.uniform1f(loc.uUseTex, 0); }
    gl.uniform1f(loc.uAlphaTest, opts.alphaTest != null ? opts.alphaTest : (mesh.alphaTest != null ? mesh.alphaTest : (opts.blend ? 0.01 : 0.5)));
    gl.uniform1f(loc.uUnlit, opts.unlit || mesh.unlit ? 1 : 0);
    gl.uniform4fv(loc.uTint, opts.tint || ONE);
    gl.uniform3fv(loc.uAdd, opts.add || ZERO);
    const blend = opts.blend || mesh.blend;
    if (blend) {
      gl.enable(gl.BLEND);
      if (blend === 'add') gl.blendFunc(gl.SRC_ALPHA, gl.ONE); else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
    }
    if (opts.cull === false || mesh.cull === false) gl.disable(gl.CULL_FACE);
    if (opts.noDepth) gl.disable(gl.DEPTH_TEST);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    if (opts.noDepth) gl.enable(gl.DEPTH_TEST);
    if (opts.cull === false || mesh.cull === false) gl.enable(gl.CULL_FACE);
    if (blend) { gl.disable(gl.BLEND); gl.depthMask(true); }
  };
  GL.IDENT = M4.create();

  // Composite into the main 2D canvas.
  GL.end = function (alpha = 1) {
    if (!GL.ok) return;
    const c = FF7.render.ctx;
    c.save();
    c.imageSmoothingEnabled = true;
    c.globalAlpha = alpha;
    c.drawImage(GL.canvas, 0, 0, FF7.W, FF7.H);
    c.restore();
  };
  GL.clearDepth = function () { if (gl) gl.clear(gl.DEPTH_BUFFER_BIT); };
})();
