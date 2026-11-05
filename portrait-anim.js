// Brings the flat portrait to life with a WebGL warp: hair sway, a small head tilt
// toward the cursor, irises that follow it, and blinking. The neck and body stay still.

// Measured on portrait.webp (1122 x 1402) with MediaPipe Face Landmarker
const EYES = {
  L: { outer: [467, 455], inner: [559, 487], top: [517, 442], bottom: [513, 485], iris: [503, 466] },
  R: { outer: [744, 523], inner: [660, 513], top: [717, 493], bottom: [702, 532], iris: [693, 514] },
};
const CHIN = [547, 781];          // retained for the existing bust transform
const FACE = [600, 560];          // rough face centre, used to find the outer hair flicks
// Calibrated against portrait.webp. The painted irises look to the side; zero
// movement must first bring them into the middle of their actual eye openings.
export const GAZE = {
  nose: [598, 588],
  irises: [[499.6, 467.5, 28.5], [683.7, 521.0, 27.5]],
  centers: [[512, 474], [701, 523]],
  travel: [[17, 12], [15, 11]],
  range: [235, 230],
  centerRadius: 18, // a small nose-sized neutral area, in source image pixels
};

// Lower eyelid contours from the same Beziers as createEyeMask. Precompute a
// one-pixel lookup so upward gaze can keep the iris's lower semicircle clear
// of the sloping lid, without changing its radius or adding frame smoothing.
const lowerLids = [
  [[455,473],[481,497],[535,512],[562,502]],
  [[651,532],[678,548],[720,563],[736,550]],
].map(points => {
  const curve = (t, axis) => (1-t)**3*points[0][axis] + 3*(1-t)**2*t*points[1][axis]
    + 3*(1-t)*t*t*points[2][axis] + t**3*points[3][axis];
  const start = points[0][0], end = points[3][0], ys = [];
  for (let x = start; x <= end; x++) {
    let lo = 0, hi = 1;
    for (let n = 0; n < 14; n++) { const t = (lo+hi)/2; if (curve(t,0) < x) lo=t; else hi=t; }
    ys.push(curve((lo+hi)/2,1));
  }
  return x => {
    const i = Math.max(0,Math.min(end-start-0.0001,x-start)), a = Math.floor(i);
    return ys[a] + (ys[a+1]-ys[a])*(i-a);
  };
});
const lowerArc = Array.from({length:25},(_,i) => [Math.cos(i*Math.PI/24),Math.sin(i*Math.PI/24)]);

function clearLowerLid(k, cx, cy, upward) {
  if (upward <= 0) return cy;
  const radius = GAZE.irises[k][2] + 1; // include the antialiased iris rim
  let maxY = Infinity;
  for (const [x,y] of lowerArc) maxY = Math.min(maxY,lowerLids[k](cx+radius*x)-radius*y-1);
  const t = Math.min(1,Math.max(0,upward/.35));
  return cy - Math.max(0,cy-maxY)*t*t*(3-2*t);
}

// Both pupils share a single direction relative to the nose. Hovering at the
// nose yields the calibrated neutral centers, rather than cross-eyed convergence.
export function gazeTargets(point, anchor = GAZE.nose) {
  const dx = point[0] - anchor[0], dy = point[1] - anchor[1];
  const distance = Math.hypot(dx, dy);
  const outside = distance > 0 ? Math.max(0, 1 - GAZE.centerRadius / distance) : 0;
  let x = dx * outside / GAZE.range[0];
  let y = dy * outside / GAZE.range[1];
  const length = Math.max(1, Math.hypot(x, y));
  x /= length; y /= length;
  return GAZE.irises.map((iris, k) => {
    const cx = GAZE.centers[k][0] + x * GAZE.travel[k][0];
    const cy = GAZE.centers[k][1] + y * GAZE.travel[k][1];
    return [cx-iris[0], clearLowerLid(k,cx,cy,-y)-iris[1]];
  });
}

// The full shaded eye interior, including the rim under the upper lid. A color
// threshold misses that shadow and leaves pieces of the original iris behind.
export function createEyeMask(W, H) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.filter = 'blur(0.65px)';
  ctx.beginPath();
  ctx.moveTo(455, 473);
  ctx.bezierCurveTo(446, 444, 491, 424, 523, 442);
  ctx.bezierCurveTo(551, 452, 566, 484, 562, 502);
  ctx.bezierCurveTo(535, 512, 481, 497, 455, 473);
  ctx.closePath();
  ctx.moveTo(651, 532);
  ctx.bezierCurveTo(654, 510, 680, 481, 704, 489);
  ctx.bezierCurveTo(735, 491, 751, 519, 736, 550);
  ctx.bezierCurveTo(720, 563, 678, 548, 651, 532);
  ctx.closePath(); ctx.fill();
  return canvas;
}

function eyeShape(e) {
  const cx = (e.outer[0] + e.inner[0]) / 2, cy = (e.top[1] + e.bottom[1] + e.outer[1] + e.inner[1]) / 4;
  const flip = e.outer[0] > e.inner[0];
  const ang = Math.atan2(e.inner[1] - e.outer[1], e.inner[0] - e.outer[0]) + (flip ? Math.PI : 0);
  const rx = Math.hypot(e.inner[0] - e.outer[0], e.inner[1] - e.outer[1]) / 2;
  const ry = Math.hypot(e.bottom[0] - e.top[0], e.bottom[1] - e.top[1]) / 2;
  return { open: [cx, cy, rx * 0.98, ry * 1.02], lids: [cx, cy, rx * 1.15, ry * 1.35], ang };
}

const VERT = `
attribute vec2 aPos; varying vec2 vUv;
void main() { vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform sampler2D uTex, uHair, uEye, uGeometry, uDecals;
uniform vec4 uDecalRect;
uniform vec2 uSize, uChin, uFace, uLook, uAng;
uniform vec4 uOpenL, uOpenR, uLidsL, uLidsR;
uniform vec3 uIrisL, uIrisR;
uniform vec2 uGazeL, uGazeR;      // how far each iris slides, in image pixels
uniform float uT, uBlink, uMotion;
varying vec2 vUv;

vec2 rot(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
vec4 tex(vec2 p) { return texture2D(uTex, p / uSize); }

vec4 skinDecals(vec4 color, vec2 p) {
  vec2 uv=(p-uDecalRect.xy)/uDecalRect.zw;
  if(uv.x<0.0 || uv.y<0.0 || uv.x>1.0 || uv.y>1.0) return color;
  vec4 ink=texture2D(uDecals,uv);
  if(ink.a<0.001) return color;
  // Inherit the portrait's soft facial lighting, with a small amount of its
  // warm skin tone. Sample the unpainted source, so artwork never lights itself.
  vec3 skin=(tex(p+vec2(-9.0,-9.0)).rgb+tex(p+vec2(9.0,-9.0)).rgb
    +tex(p+vec2(-9.0,9.0)).rgb+tex(p+vec2(9.0,9.0)).rgb)*0.25;
  float luminance=dot(skin,vec3(0.299,0.587,0.114));
  float shade=mix(1.0,clamp(luminance/0.65,0.72,1.08),0.8);
  // The bridge's side planes turn away from the light at the nose folds.
  // Match the decal mesh profile, keeping this relief local to the nose.
  vec2 noseP=vec2(dot(p-vec2(600.0,560.0),vec2(.968,.251)),dot(p-vec2(600.0,560.0),vec2(-.251,.968)));
  float side=smoothstep(14.0,29.0,abs(noseP.x))*(1.0-smoothstep(35.0,59.0,abs(noseP.x)));
  float bridge=1.0-smoothstep(28.0,52.0,abs(noseP.y));
  shade*=1.0-side*bridge*(noseP.x<0.0?.20:.14);
  // A short, soft material crease where the decal turns over the bridge edge.
  float crease=exp(-pow((abs(noseP.x)-21.0)/2.8,2.0));
  shade*=1.0-crease*bridge*.10;
  vec3 tint=mix(vec3(1.0),skin/max(luminance,0.1),0.045);
  // ink is premultiplied, like the original portrait; no floating drop shadow.
  return vec4(color.rgb*(1.0-ink.a)+ink.rgb*shade*tint,color.a);
}

vec2 eyeBounds(float x) {
  vec2 bounds = texture2D(uGeometry, vec2((x - 438.0) / 340.0, 0.5)).rg * 160.0 + 414.0;
  bounds.y = max(bounds.y, bounds.x + 0.1);
  return bounds;
}

vec4 gaze(vec2 p, vec3 iris, vec2 off) {
  vec4 base = tex(p);
  float inEye = texture2D(uEye, p / uSize).a;
  if (inEye <= 0.0) return base;
  vec2 horizontal = iris.x < 600.0 ? vec2(453.0, 564.0) : vec2(650.0, 744.0);
  vec2 targetY = eyeBounds(p.x);
  float u = clamp((p.x - horizontal.x) / (horizontal.y - horizontal.x), 0.0, 1.0);
  float whiteX = mix(iris.x + iris.z + 6.0, horizontal.y - 5.0, u);
  vec2 whiteY = eyeBounds(whiteX);
  float v = clamp((p.y - targetY.x) / max(1.0, targetY.y - targetY.x), 0.0, 1.0);
  // Sample the portrait's real eye-white texture and shading. The reconstructed
  // fill image is absent; every displayed color comes from the original photo.
  vec4 nativeWhite = tex(vec2(whiteX, mix(whiteY.x + 1.5, whiteY.y - 1.5, v)));
  vec2 center = iris.xy + off;
  vec2 local = p - center;
  // The iris stays the same circle wherever it looks; the lids just cover its edges. (It used to
  // stretch its upper half up to the lashes, which turned it into an oval looking down.)
  float radial = length(local);
  float disc = 1.0 - smoothstep(iris.z - 1.0, iris.z + .5, radial);
  // The painted iris is partly hidden by the lids; its nominal circular crop
  // contains a thin fringe of eye-white above and skin below. Sample the real
  // outer iris just inside that fringe, leaving the pupil and highlights intact.
  float rim = smoothstep(iris.z * .65, iris.z * .98, radial);
  float margin = mix(2.2, 4.2, smoothstep(.1, .7, local.y / max(radial, .1)));
  vec2 irisPoint = iris.xy + local * (1.0 - rim * margin / iris.z);
  vec2 originalOpening = eyeBounds(irisPoint.x);
  if (irisPoint.y < originalOpening.x + 1.0) irisPoint.y = 2.0 * iris.y - irisPoint.y;
  irisPoint.y = clamp(irisPoint.y, originalOpening.x + 1.0, originalOpening.y - 1.0);
  vec4 nativeIris = tex(irisPoint);
  nativeIris.rgb *= mix(1.0, .70, smoothstep(iris.z * .93, iris.z, radial));
  return mix(base, mix(nativeWhite, nativeIris, disc), inEye);
}

// Blink: the real upper lashes and eyeshadow slide down over the eye; the brow stays put.
vec2 blink(vec2 p, vec4 e, float ang) {
  vec2 q = rot(p - e.xy, -ang) / e.zw;
  float lidQ = 1.0 / 1.35;
  float gx = 1.0 - smoothstep(0.8, 1.05, abs(q.x));
  if (gx <= 0.0 || q.y < -2.4 || q.y > 1.0) return p;
  float f = q.y < -lidQ ? smoothstep(-2.2, -lidQ, q.y) : q.y <= lidQ ? 1.0 : 1.0 - smoothstep(lidQ, lidQ + 0.12, q.y);
  return p - rot(vec2(0.0, uBlink * 2.0 * lidQ * e.w * f * gx), ang);
}

void main() {
  vec2 p = vUv * uSize;

  // The whole bust turns toward the cursor as one piece, like a 3D model: a rough depth map
  // (face nearest, chest next, hair behind) decides how far each part swings, so nothing stretches.
  float hairHere = texture2D(uHair, p / uSize).r;
  float face = 1.0 - smoothstep(0.0, 1.0, distance(p, uFace) / 330.0);
  float chest = 1.0 - smoothstep(0.0, 1.0, distance(p, vec2(580.0, 1250.0)) / 560.0);
  float depth = max(face, chest * 0.55);
  depth = mix(depth, 0.15, hairHere * (1.0 - face));
  vec2 turn = uLook * vec2(16.0, 9.0) * depth + uLook * vec2(4.0, 2.0);
  float sway = sin(uT * 0.6) * 0.004 * uMotion;          // a slow idle sway of the whole bust
  p = vec2(uSize.x * 0.5, uSize.y) + rot(p - vec2(uSize.x * 0.5, uSize.y), -sway) - turn;

  // hair: the long ends sway, the flicks around the top move a little
  float hair = texture2D(uHair, p / uSize).r * uMotion;
  float fall = smoothstep(450.0, 1150.0, p.y);
  float flick = smoothstep(250.0, 380.0, distance(p, uFace)) * (1.0 - smoothstep(350.0, 650.0, p.y));
  p.x -= hair * (fall * (sin(uT * 1.2 + p.y * 0.007) * 6.0 + sin(uT * 2.1 + p.y * 0.019) * 2.0)
               + flick * sin(uT * 1.5 + p.x * 0.012) * 3.0);
  p.y -= hair * (fall * sin(uT * 0.9 + p.x * 0.01) * 1.5 + flick * sin(uT * 1.1 + p.x * 0.01) * 2.0);

  bool left = distance(p, uOpenL.xy) < distance(p, uOpenR.xy);
  // Keep tracking active through the blink, so opening/closing does not briefly
  // snap the pupils back to the direction painted into the original image.
  vec2 eyeP = uBlink > 0.001 ? (left ? blink(p, uLidsL, uAng.x) : blink(p, uLidsR, uAng.y)) : p;
  vec4 color = left ? gaze(eyeP, uIrisL, uGazeL) : gaze(eyeP, uIrisR, uGazeR);
  gl_FragColor = skinDecals(color,p);
}`;

// The GPU context and the shader, started while the images are still downloading (index.html):
// both take a few hundred milliseconds to set up. With KHR_parallel_shader_compile the browser
// compiles in the background, and nothing waits on it until the first useProgram.
const prepared = new WeakMap();
export function preparePortrait(canvas) {
  if (prepared.has(canvas)) return prepared.get(canvas);
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true });
  gl.getExtension('KHR_parallel_shader_compile');
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const shaders = [sh(gl.VERTEX_SHADER, VERT), sh(gl.FRAGMENT_SHADER, FRAG)];
  const prog = gl.createProgram();
  for (const s of shaders) gl.attachShader(prog, s);
  gl.linkProgram(prog);
  const ready = { gl, prog, shaders };
  prepared.set(canvas, ready);
  return ready;
}

export function animatePortrait(canvas, cutout, hairMask, bakedEyeMask, geometry) {
  const W = cutout.width, H = cutout.height;
  canvas.width = W; canvas.height = H;
  const L = eyeShape(EYES.L), R = eyeShape(EYES.R);
  const [irisL, irisR] = GAZE.irises;

  const { gl, prog, shaders } = preparePortrait(canvas);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw shaders.map(s => gl.getShaderInfoLog(s)).find(Boolean) ?? gl.getProgramInfoLog(prog);
  }
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const texture = (unit, upload) => {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    upload();
    return t;
  };
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  texture(0, () => gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cutout));
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  texture(1, () => ArrayBuffer.isView(hairMask)
    ? gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, W, H, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, hairMask)
    : gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, hairMask));
  const eyes = bakedEyeMask ?? createEyeMask(W, H);
  // The PNG is transparent outside the calibrated contours, so use its alpha.
  texture(2, () => gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, eyes));
  texture(3, () => gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, geometry));
  const decals=texture(4,()=>gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4)));

  const locations = new Map();
  const U = n => { if (!locations.has(n)) locations.set(n, gl.getUniformLocation(prog, n)); return locations.get(n); };
  gl.uniform1i(U('uTex'), 0); gl.uniform1i(U('uHair'), 1); gl.uniform1i(U('uEye'), 2);
  gl.uniform1i(U('uGeometry'), 3);
  gl.uniform1i(U('uDecals'), 4);gl.uniform4f(U('uDecalRect'),340,290,460,530);
  function setDecals(image,rect) {
    gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,decals);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    gl.uniform4f(U('uDecalRect'),...rect);
  }
  gl.uniform2f(U('uSize'), W, H); gl.uniform2f(U('uChin'), ...CHIN); gl.uniform2f(U('uFace'), ...FACE);
  gl.uniform4f(U('uOpenL'), ...L.open); gl.uniform4f(U('uOpenR'), ...R.open);
  gl.uniform4f(U('uLidsL'), ...L.lids); gl.uniform4f(U('uLidsR'), ...R.lids);
  gl.uniform3f(U('uIrisL'), ...irisL); gl.uniform3f(U('uIrisR'), ...irisR);
  gl.uniform2f(U('uAng'), L.ang, R.ang);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  gl.uniform1f(U('uMotion'), reduce ? 0 : 1);

  // Body motion is eased separately; the pupils always use the latest cursor.
  const look = { x: 0, y: 0, tx: 0, ty: 0, active: false, cx: 0, cy: 0 };
  addEventListener('pointermove', e => {
    look.cx = e.clientX; look.cy = e.clientY;
    look.active = true;
  }, { passive: true });

  // Account for object-fit letterboxing, CSS zoom during scroll and window size.
  function imageRect() {
    const r = canvas.getBoundingClientRect();
    const scale = Math.min(r.width / W, r.height / H);
    return { left: r.left + (r.width - W * scale) / 2,
      top: r.top + r.height - H * scale, scale };
  }
  // Forward-map the nose using the same bust transform as the shader. Tracking
  // remains centered on the visible nose while the bust moves or the hero zooms.
  function sourcePosition(point, lx, ly, t) {
    const sway = Math.sin(t * .6) * .004 * (reduce ? 0 : 1);
    const c = Math.cos(sway), sn = Math.sin(sway);
    let p = [...point];
    for (let i = 0; i < 3; i++) {
      const smooth = v => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
      const face = 1 - smooth(Math.hypot(p[0] - FACE[0], p[1] - FACE[1]) / 330);
      const chest = 1 - smooth(Math.hypot(p[0] - 580, p[1] - 1250) / 560);
      const depth = Math.max(face, chest * .55);
      const x = point[0] + lx * (16 * depth + 4) - W / 2;
      const y = point[1] + ly * (9 * depth + 2) - H;
      p = [W / 2 + c * x - sn * y, H + sn * x + c * y];
    }
    return p;
  }
  let gazes = gazeTargets(GAZE.nose);
  const release = () => { look.active = false; look.tx = look.ty = 0; };
  document.addEventListener('pointerleave', release);
  addEventListener('blur', release);

  let nextBlink = 1.2, blinkAt = -1;
  const hold = {};
  const t0 = performance.now();
  let previous = t0, wanted = 0, settled = 0;
  const state = { gaze: gazes, neutralCenters: GAZE.centers, nose: GAZE.nose, frameMs: 0 };
  let pose = { x: 0, y: 0, t: 0, rect: null };
  // Face decorations share the exact bust pose and displayed image rectangle
  // from the last draw, including CSS scroll zoom and narrow-screen letterboxing.
  function projectPoints(points) {
    const r = pose.rect ?? imageRect();
    return points.map(point => {
      const p = sourcePosition(point,pose.x,pose.y,pose.t);
      return [r.left+p[0]*r.scale,r.top+p[1]*r.scale,r.scale];
    });
  }
  // The same points moved with the bust, still in source pixels: for layers that share the
  // canvas's own transform (the camera), where screen rectangles don't apply.
  function bustPoints(points) {
    return points.map(point => sourcePosition(point, pose.x, pose.y, pose.t));
  }
  function frame(now) {
    const t = (now - t0) / 1000;
    const dt = Math.min(.1, (now - previous) / 1000); previous = now;
    const r = imageRect();
    // Render at the displayed size instead of shading all 1.57 million source
    // pixels on every frame. Texture/eye coordinates stay in original pixels.
    const pixelScale = Math.min(1, r.scale * Math.min(1.5, devicePixelRatio || 1));
    const want = Math.max(1, Math.round(W * pixelScale));
    settled = Math.abs(want - wanted) <= 1 ? settled + 1 : 0; wanted = want;
    // Resizing the buffer stalls that frame, and the camera zooming in or out would resize it on
    // every frame of the move: grow straight to full size, shrink only once the size settles.
    const bufferWidth = want > canvas.width + 1 ? W : want < canvas.width - 1 && settled > 10 ? want : canvas.width;
    if (bufferWidth !== canvas.width) {
      canvas.width = bufferWidth; canvas.height = Math.max(1, Math.round(bufferWidth * H / W));
    }
    const pointer = hold.cursor ?? (look.active ? [look.cx, look.cy] : null);
    if (pointer && r.scale > 0) {
      look.tx = Math.max(-1, Math.min(1, ((pointer[0] - r.left) / r.scale - GAZE.nose[0]) / (innerWidth * .4 / r.scale)));
      look.ty = Math.max(-1, Math.min(1, ((pointer[1] - r.top) / r.scale - GAZE.nose[1]) / (innerHeight * .4 / r.scale)));
    } else { look.tx = look.ty = 0; }
    const ease = 1 - Math.exp(-dt / .08);
    look.x += (look.tx - look.x) * ease; look.y += (look.ty - look.y) * ease;
    const lx = hold.lookX ?? look.x, ly = hold.lookY ?? look.y;
    if (t > nextBlink) { blinkAt = t; nextBlink = t + 2.5 + Math.random() * 3.5; }
    const b = hold.blink ?? (blinkAt >= 0 && t - blinkAt < 0.18 ? Math.sin((t - blinkAt) / 0.18 * Math.PI) : 0);
    gl.uniform1f(U('uT'), t); gl.uniform1f(U('uBlink'), b);
    gl.uniform2f(U('uLook'), lx, ly);
    pose = { x: lx, y: ly, t, rect: r };
    const nose = sourcePosition(GAZE.nose, lx, ly, t);
    gazes = pointer && r.scale > 0
      ? gazeTargets([(pointer[0] - r.left) / r.scale, (pointer[1] - r.top) / r.scale], nose)
      : gazeTargets(GAZE.nose);
    state.gaze = gazes; state.nose = nose; state.frameMs = dt * 1000;
    gl.uniform2f(U('uGazeL'), ...gazes[0]); gl.uniform2f(U('uGazeR'), ...gazes[1]);
    gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!canvas.dataset.ready) {
      canvas.dataset.ready = 'true';
      canvas.style.backgroundImage = 'none';
      performance.mark('portrait-ready');
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // exposed for tuning: portrait.hold.blink = 1 holds the eyes shut, portrait.hold.lookX = 1 holds the gaze right
  return { hold, iris: { L: irisL, R: irisR }, state, projectPoints, bustPoints, setDecals };
}
