// Existing approved skyline geometry, palette and drift. Shared by worker and fallback.
export function createSkyline(canvas, settings, triangulate) {
const Delaunay = { triangulate };
// Layered NYC silhouette in greens: three depths of generated towers on a pale lime sky, with
// simplified landmark outlines drawn by hand here. Coordinates are fractions of width and height.
const SKY = ['#e6f4c6', '#c8e9b8', '#a3dab0'];                     // top to bottom
const GREENS = { back: '#78c9a0', mid: '#52b394', landmark: '#3f9f88', front: '#2e8574' };
// Under the pointer the facets take on the pinks of Isha's top (sampled from the dress in the
// portrait: its shade, its body, its light trim): deepest at the pointer, fading out through the
// paler blush into the skyline's own colours.
const PINKS = ['#e8a590', '#f5b8a8', '#f9c7b7'];
const GLOW = 260;

const LANDMARKS = [
  // art-deco setback tower with a pyramid crown and a short mast
  [[0.165, 1], [0.165, 0.40], [0.172, 0.40], [0.172, 0.33], [0.178, 0.33], [0.178, 0.27],
   [0.19, 0.21], [0.1888, 0.21], [0.1888, 0.16], [0.1912, 0.16], [0.1912, 0.21], [0.19, 0.21],
   [0.202, 0.27], [0.202, 0.33], [0.208, 0.33], [0.208, 0.40], [0.215, 0.40], [0.215, 1]],
  // stepped tower with spire
  [[0.555, 1], [0.555, 0.42], [0.565, 0.42], [0.565, 0.36], [0.572, 0.36], [0.572, 0.3], [0.5785, 0.22], [0.5785, 0.1],
   [0.5815, 0.1], [0.5815, 0.22], [0.588, 0.3], [0.588, 0.36], [0.595, 0.36], [0.595, 0.42], [0.605, 0.42], [0.605, 1]],
  // tapered tower with antenna
  [[0.655, 1], [0.655, 0.28], [0.67, 0.18], [0.678, 0.18], [0.678, 0.05], [0.682, 0.05], [0.682, 0.18], [0.69, 0.18],
   [0.705, 0.28], [0.705, 1]],
  // crowned spire
  [[0.855, 1], [0.855, 0.42], [0.86, 0.38], [0.864, 0.38], [0.867, 0.33], [0.87, 0.2], [0.873, 0.33], [0.876, 0.38],
   [0.88, 0.38], [0.885, 0.42], [0.885, 1]],
];

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function silhouetteLayers(rand) {
  const row = (lo, hi, wMin, wMax) => {
    const out = [];
    for (let x = -0.02; x < 1.02;) { const w = wMin + rand() * (wMax - wMin); out.push([x, x + w, lo + rand() * (hi - lo)]); x += w * (0.7 + rand() * 0.4); }
    return out;
  };
  return { back: row(0.32, 0.55, 0.03, 0.07), mid: row(0.48, 0.68, 0.025, 0.06), front: row(0.66, 0.86, 0.03, 0.08) };
}

// Landmarks are drawn for a 16:9 screen; on narrower screens widen them about their centres
// so they keep their proportions instead of turning into slivers.
function fitLandmarks() {
  const k = Math.max(1, Math.min(2.2, (16 / 9) * (H / W)));
  return LANDMARKS.map(p => {
    const xs = p.map(q => q[0]), c = (Math.min(...xs) + Math.max(...xs)) / 2;
    return p.map(([x, y]) => [c + (x - c) * k, y]);
  });
}

// Extra triangle corners along every outline, so triangle edges follow the silhouettes
function outlinePoints(layers, landmarks, step) {
  const pts = [];
  const line = (x0, y0, x1, y1) => {
    const n = Math.max(1, Math.ceil(Math.hypot((x1 - x0) * W, (y1 - y0) * H) / step));
    for (let i = 0; i <= n; i++) pts.push([(x0 + (x1 - x0) * i / n) * W, (y0 + (y1 - y0) * i / n) * H]);
  };
  for (const list of [layers.back, layers.mid, layers.front])
    for (const [x0, x1, top] of list) { line(x0, top, x1, top); line(x0, top, x0, Math.min(1, top + 0.2)); line(x1, top, x1, Math.min(1, top + 0.2)); }
  for (const p of landmarks) for (let i = 0; i < p.length - 1; i++) line(...p[i], ...p[i + 1]);
  return pts.filter(([x, y]) => x > -1 && x < W + 1 && y > -1 && y < H + 1);
}

function silhouetteColor(fx, fy, layers, r, landmarks) {
  const hit = list => list.some(([x0, x1, top]) => fx >= x0 && fx < x1 && fy > top);
  const tone = c => mix(hex(c), [255, 255, 255], r * 0.05);
  if (hit(layers.front)) return tone(GREENS.front);
  if (landmarks.some(p => inPoly(fx, fy, p))) return tone(GREENS.landmark);
  if (hit(layers.mid)) return tone(GREENS.mid);
  if (hit(layers.back)) return tone(GREENS.back);
  return gradient(SKY, fy);
}

const painter = trianglePainter(canvas);
const reduceMotion = settings.reduceMotion;
let W, H, verts, tris, light = null, t0 = performance.now();

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
function gradient(stops, k) {
  k = Math.max(0, Math.min(1, k)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(k));
  return mix(hex(stops[i]), hex(stops[i + 1]), k - i);
}

// Jittered grid, triangulated once; vertices only wobble around home so triangles never flip
function build() {
  const dpr = settings.dpr;
  W = settings.width; H = settings.height;
  canvas.width = W * dpr; canvas.height = H * dpr; painter.resize(W, H, dpr);
  const size = settings.density;
  const rand = rng(7);
  verts = [];
  for (let y = -size; y <= H + size; y += size) for (let x = -size; x <= W + size; x += size) {
    const edge = x <= 0 || y <= 0 || x >= W || y >= H;
    verts.push({ hx: x + (edge ? 0 : (rand() - .5) * size * .8), hy: y + (edge ? 0 : (rand() - .5) * size * .8),
                 amp: edge ? 0 : size * .18, ph: rand() * Math.PI * 2, sp: .3 + rand() * .5 });
  }
  const layers = silhouetteLayers(rng(5)), landmarks = fitLandmarks();
  // outline corners stay put so the silhouette edges stay crisp; grid corners near them are dropped
  const outline = outlinePoints(layers, landmarks, size * 0.6);
  const near = new Set(outline.map(([x, y]) => `${Math.round(x / (size * 0.45))},${Math.round(y / (size * 0.45))}`));
  verts = verts.filter(v => v.amp === 0 || !near.has(`${Math.round(v.hx / (size * 0.45))},${Math.round(v.hy / (size * 0.45))}`));
  for (const [x, y] of outline) verts.push({ hx: x, hy: y, amp: 0, ph: 0, sp: 0 });
  const idx = Delaunay.triangulate(verts.map(v => [v.hx, v.hy]));
  tris = [];
  for (let k = 0; k < idx.length; k += 3) {
    const v = [verts[idx[k]], verts[idx[k + 1]], verts[idx[k + 2]]];
    // colour is fixed per triangle from its home position, so drifting never makes it flicker
    const cx = (v[0].hx + v[1].hx + v[2].hx) / 3, cy = (v[0].hy + v[1].hy + v[2].hy) / 3;
    tris.push({ v, shade: (rand() - .5) * .1, color: silhouetteColor(cx / W, cy / H, layers, rand(), landmarks) });
  }
}

let lastDraw = -Infinity, raf;
function frame(now) {
  raf = requestAnimationFrame(frame);
  if (now - lastDraw < 1000 / 30) return;
  lastDraw = now;
  const speed = reduceMotion ? 0 : settings.speed;
  const t = (now - t0) / 1000 * speed;
  for (const v of verts) { v.x = v.hx + Math.cos(t * v.sp + v.ph) * v.amp; v.y = v.hy + Math.sin(t * v.sp * 1.3 + v.ph) * v.amp; }
  painter.begin(tris.length);
  for (const tr of tris) {
    const [a, b, c] = tr.v;
    const cx = (a.x + b.x + c.x) / 3, cy = (a.y + b.y + c.y) / 3;
    let col = tr.color;
    if (light) {
      const d = Math.hypot(cx - light.x, cy - light.y);
      if (d < GLOW) { const u = 1 - d / GLOW; col = mix(col, gradient(PINKS, 1 - u), u * u * (3 - 2 * u) * .9); }
    }
    // facet shading: each triangle a little lighter or darker, like a folded surface
    const k = tr.shade + Math.sin(t * .6 + cx * .004 + cy * .003) * .05;
    col = k > 0 ? mix(col, [255, 244, 232], k) : mix(col, [0, 0, 10], -k);
    painter.triangle(a, b, c, col);
  }
  painter.end();
}

// Submit the skyline as one mesh rather than thousands of individual 2D paths.
// Geometry, per-triangle colors, hover lighting and time-based drift are shared.
function trianglePainter(canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (!gl) {
    const ctx = canvas.getContext('2d');
    return {
      resize(w, h, dpr) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); },
      begin() {}, end() {},
      triangle(a, b, c, col) {
        ctx.fillStyle = ctx.strokeStyle = `rgb(${col[0]|0},${col[1]|0},${col[2]|0})`;
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.lineTo(c.x,c.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      },
    };
  }
  const shader = (type, source) => {
    const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, 'attribute vec2 aPosition; attribute vec3 aColor; varying vec3 vColor; void main(){vColor=aColor;gl_Position=vec4(aPosition,0.,1.);}'));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, 'precision mediump float; varying vec3 vColor; void main(){gl_FragColor=vec4(vColor,1.);}'));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  const position = gl.getAttribLocation(program, 'aPosition'), color = gl.getAttribLocation(program, 'aColor');
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 20, 0);
  gl.enableVertexAttribArray(color); gl.vertexAttribPointer(color, 3, gl.FLOAT, false, 20, 8);
  let data = new Float32Array(0), count = 0, width, height;
  return {
    resize(w, h) { width=w; height=h; gl.viewport(0,0,canvas.width,canvas.height); },
    begin(triangles) { if(data.length!==triangles*15)data=new Float32Array(triangles*15);count=0; },
    triangle(a, b, c, col) {
      const r=(col[0]|0)/255,g=(col[1]|0)/255,bv=(col[2]|0)/255;
      for (const p of [a,b,c]) { data[count++]=p.x/width*2-1;data[count++]=1-p.y/height*2;
        data[count++]=r;data[count++]=g;data[count++]=bv; }
    },
    end() { gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,count/5); },
  };
}

build();
raf = requestAnimationFrame(frame);
return {
  resize(next) { Object.assign(settings, next); build(); },
  speed(value) { settings.speed = value; },
  light(value) { light = value; },
  destroy() { cancelAnimationFrame(raf); },
};
}
