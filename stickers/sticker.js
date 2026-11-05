// Die-cut fabric stickers that peel.
//
// makeSticker(src)  turns an image on a flat background into a sticker: the artwork is cut
//                   out, a white border follows its outline (filling small gaps), and both
//                   get a woven fabric-tape texture.
// mountPeel(canvas) draws a sticker that peels up from its lower-right extreme on hover: the part past
//                   a fold line is flipped over the front and shows the pale adhesive back.

const BORDER = 0.045;      // white border width, as a share of the artwork size
// draw small images at up to twice their size so they stay sharp, but cap big photos at
// about 1000 px so the cut-out stays quick
const scaleFor = (w, h) => Math.min(2, 1000 / Math.max(w, h));

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), n = 2 * r + 1;
  for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x < w; x++) { if (x + r < w) s += src[y * w + x + r]; if (x - r - 1 >= 0) s -= src[y * w + x - r - 1]; if (x >= 0) tmp[y * w + x] = s / n; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y < h; y++) { if (y + r < h) s += tmp[(y + r) * w + x]; if (y - r - 1 >= 0) s -= tmp[(y - r - 1) * w + x]; if (y >= 0) out[y * w + x] = s / n; } }
  return out;
}

// woven threads: a tiny tile of light weft and dark warp lines
function weave(ctx) {
  const t = document.createElement('canvas'); t.width = t.height = 8;
  const g = t.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(0, 2, 8, 1.6); g.fillRect(0, 6, 8, 1.6);
  g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(2, 0, 1.6, 8); g.fillRect(6, 0, 1.6, 8);
  return ctx.createPattern(t, 'repeat');
}

// ink: recolour the artwork, for logos that are white on a dark backdrop and would
//      otherwise vanish against the white border
// holes: also clear backdrop colour enclosed by the artwork (letter counters like the inside
//        of B, A, R); leave off when enclosed areas are part of the design (the bee's bands)
// border: the fabric colour of the die-cut edge (white by default, 'key' = the logo's background,
//         'none' = no extra edge, cut along the artwork's own outline)
// crop:   [x, y, w, h] in image pixels, to use only part of a logo
// tolerance: how far from the backdrop colour still counts as backdrop (raise it to drop a
//            soft drop shadow baked into the image)
export async function makeSticker(src, { ink, holes = false, border = '#fdfaf3', crop, tolerance = 60 } = {}) {
  const im = new Image(); im.src = src; await im.decode();
  const [sx, sy, sw, sh] = crop ?? [0, 0, im.width, im.height];
  const S = scaleFor(sw, sh), iw = Math.round(sw * S), ih = Math.round(sh * S);
  const pad = Math.round(Math.max(iw, ih) * (BORDER + 0.02));
  const w = iw + pad * 2, h = ih + pad * 2;

  // 1. the artwork, cut out of its background; the background colour is read from the
  //    image's top-left corner, so white, red or any flat backdrop works
  //    (images with a transparent background are flattened onto white first)
  const flat = document.createElement('canvas'); flat.width = iw; flat.height = ih;
  const fg = flat.getContext('2d');
  fg.fillStyle = '#fff'; fg.fillRect(0, 0, iw, ih); fg.drawImage(im, sx, sy, sw, sh, 0, 0, iw, ih);
  const key = fg.getImageData(2, 2, 1, 1).data;
  const art = document.createElement('canvas'); art.width = w; art.height = h;
  const ag = art.getContext('2d');
  ag.fillStyle = `rgb(${key[0]},${key[1]},${key[2]})`; ag.fillRect(0, 0, w, h);
  ag.drawImage(flat, pad, pad);
  const px = ag.getImageData(0, 0, w, h), d = px.data, alpha = new Float32Array(w * h);
  const dist = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) dist[i] = Math.hypot(d[i * 4] - key[0], d[i * 4 + 1] - key[1], d[i * 4 + 2] - key[2]);
  // Only backdrop connected to the outside edge is removed, so the same colour enclosed inside
  // the artwork (like the bands inside the bee) stays.
  const outside = new Uint8Array(w * h), queue = [];
  const seed = i => { if (!outside[i] && dist[i] < tolerance) { outside[i] = 1; queue.push(i); } };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  if (holes) for (let i = 0; i < w * h; i++) seed(i);
  while (queue.length) {
    const i = queue.pop(), x = i % w;
    if (x > 0) seed(i - 1); if (x < w - 1) seed(i + 1);
    if (i >= w) seed(i - w); if (i < w * (h - 1)) seed(i + w);
  }
  for (let i = 0; i < w * h; i++) {
    const x = i % w, edge = outside[i] || (x > 0 && outside[i - 1]) || (x < w - 1 && outside[i + 1]) || outside[i - w] || outside[i + w];
    alpha[i] = outside[i] ? 0 : edge ? Math.max(0, Math.min(1, (dist[i] - tolerance * 0.47) / (tolerance * 0.75))) : 1;   // soft only at the outer edge
    d[i * 4 + 3] = alpha[i] * 255;
  }
  if (ink) {
    const c = [1, 3, 5].map(k => parseInt(ink.slice(k, k + 2), 16));
    for (let i = 0; i < w * h; i++) { d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; }
  }
  ag.putImageData(px, 0, 0);

  // 2. the border: grow the outline by BORDER and round it off
  //    (border 'none': the artwork already has its own outline, so cut right along it)
  const cut = new Float32Array(w * h);
  if (border === 'none') cut.set(alpha);
  else {
    const r = Math.round(Math.max(iw, ih) * BORDER / 2);
    const grown = boxBlur(boxBlur(alpha, w, h, r), w, h, r);
    for (let i = 0; i < w * h; i++) cut[i] = Math.max(0, Math.min(1, (grown[i] - 0.015) * 40));
  }
  // a die-cut has no see-through holes: anything the outline encloses becomes white fabric
  const open = new Uint8Array(w * h), stack = [];
  const reach = i => { if (!open[i] && cut[i] < 0.5) { open[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { reach(x); reach((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { reach(y * w); reach(y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop(), x = i % w;
    if (x > 0) reach(i - 1); if (x < w - 1) reach(i + 1);
    if (i >= w) reach(i - w); if (i < w * (h - 1)) reach(i + w);
  }
  for (let i = 0; i < w * h; i++) if (!open[i]) cut[i] = Math.max(cut[i], 1);

  // 3. compose: white fabric, then the artwork with a little of the weave showing through
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const g = out.getContext('2d');
  const base = g.createImageData(w, h), b = base.data, noise = rng(9);
  // border 'key' keeps the logo's own background colour as the fabric
  const fab = border === 'key' ? [key[0], key[1], key[2]] : border === 'none' ? [253, 250, 243]
    : [1, 3, 5].map(k => parseInt(border.slice(k, k + 2), 16));
  for (let i = 0; i < w * h; i++) {
    const n = (noise() - 0.5) * 14;                              // uneven fibres
    b[i * 4] = fab[0] + n; b[i * 4 + 1] = fab[1] + n; b[i * 4 + 2] = fab[2] + n; b[i * 4 + 3] = cut[i] * 255;
  }
  g.putImageData(base, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = weave(g); g.fillRect(0, 0, w, h);
  g.drawImage(art, 0, 0);
  g.globalAlpha = 0.55; g.fillStyle = weave(g); g.fillRect(0, 0, w, h);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';

  return { canvas: out, w, h, cut };
}

// Reflect across the fold line through P with unit normal n (pointing to the peeled side)
function reflect(ctx, P, n) {
  const a = 1 - 2 * n[0] * n[0], bc = -2 * n[0] * n[1], d = 1 - 2 * n[1] * n[1];
  ctx.transform(a, bc, bc, d, P[0] - (a * P[0] + bc * P[1]), P[1] - (bc * P[0] + d * P[1]));
}

function halfPlane(ctx, P, n, w, h, side) {
  // a big polygon covering everything on one side of the fold line
  const u = [-n[1], n[0]], L = (w + h) * 2, s = side * L;
  ctx.beginPath();
  ctx.moveTo(P[0] + u[0] * L, P[1] + u[1] * L);
  ctx.lineTo(P[0] - u[0] * L, P[1] - u[1] * L);
  ctx.lineTo(P[0] - u[0] * L + n[0] * s, P[1] - u[1] * L + n[1] * s);
  ctx.lineTo(P[0] + u[0] * L + n[0] * s, P[1] + u[1] * L + n[1] * s);
  ctx.closePath(); ctx.clip();
}

// still: a decorative sticker that never peels (no hover, no click)
export function mountPeel(canvas, s, { max = 0.13, tilt = 0.45, still = false, onDraw = () => {} } = {}) {
  canvas.width = s.w; canvas.height = s.h;
  const ctx = canvas.getContext('2d');
  if (still) { ctx.drawImage(s.canvas, 0, 0); onDraw(); canvas.style.cursor = 'default'; return { peelTo() {} }; }
  const n = [Math.sin(tilt), Math.cos(tilt)];                  // peel direction: down, leaning right
  // the peel starts at the sticker's outermost point in that direction (the handle tip of a
  // torch, the lower-right corner of a wide logo), so only that corner ever lifts
  let E = [s.w / 2, s.h], best = -Infinity;
  for (let y = 0; y < s.h; y += 2) for (let x = 0; x < s.w; x += 2)
    if (s.cut[y * s.w + x] > 0.5 && x * n[0] + y * n[1] > best) { best = x * n[0] + y * n[1]; E = [x, y]; }
  const span = Math.min(s.w, s.h);
  const back = document.createElement('canvas'); back.width = s.w; back.height = s.h;
  const flap = document.createElement('canvas'); flap.width = s.w; flap.height = s.h;
  let peel = 0, target = 0, forced = null;     // forced: the page is driving the peel (scroll)
  canvas.addEventListener('pointerenter', () => { if (forced === null) { target = max; tick(); } });
  canvas.addEventListener('pointerleave', () => { if (forced === null) { target = 0; tick(); } });

  function draw() {
    ctx.clearRect(0, 0, s.w, s.h);
    const dist = peel * span;
    if (dist < 1) { ctx.drawImage(s.canvas, 0, 0); onDraw(); return; }
    const P = [E[0] - n[0] * dist, E[1] - n[1] * dist];

    // front: everything above the fold
    ctx.save(); halfPlane(ctx, P, n, s.w, s.h, -1); ctx.drawImage(s.canvas, 0, 0); ctx.restore();

    // back of the flap: the sticker's shape in a pale adhesive colour, darker toward the fold
    const bg = flap.getContext('2d');
    bg.clearRect(0, 0, s.w, s.h);
    bg.drawImage(s.canvas, 0, 0);
    bg.globalCompositeOperation = 'source-in';
    const grad = bg.createLinearGradient(P[0], P[1], P[0] + n[0] * dist, P[1] + n[1] * dist);
    grad.addColorStop(0, '#b9ae9c'); grad.addColorStop(0.35, '#ddd4c5'); grad.addColorStop(1, '#fbf7ef');
    bg.fillStyle = grad; bg.fillRect(0, 0, s.w, s.h);
    bg.globalCompositeOperation = 'source-over';

    // flip the part below the fold up over the front, with a soft shadow under it
    ctx.save();
    reflect(ctx, P, n);
    halfPlane(ctx, P, n, s.w, s.h, 1);
    ctx.shadowColor = 'rgba(20, 10, 40, .35)'; ctx.shadowBlur = Math.max(8, span * 0.03); ctx.shadowOffsetY = -4;
    ctx.drawImage(flap, 0, 0);
    ctx.restore();
    onDraw();
  }

  let raf = 0;
  function tick() {
    cancelAnimationFrame(raf);
    const step = () => {
      peel += (target - peel) * 0.16;
      if (Math.abs(target - peel) < 0.001) peel = target;
      draw();
      if (peel !== target) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  draw();

  // peelTo(v): peel to v (share of the sticker's short side) under the page's control;
  // peelTo(null) hands control back to hover
  return {
    peelTo(v) {
      if (v === forced) return;
      forced = v; target = v ?? (canvas.matches(':hover') ? max : 0); tick();
    },
  };
}
