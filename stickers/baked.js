// The original makeSticker pipeline is run once in tools/bake.html. Opening
// screen visitors decode the finished artwork, preserving the approved designs.
// Change this whenever a sticker is baked again, so browsers fetch the new artwork.
const BAKED = 'cities-1';
const url = index => new URL('../assets/sticker-' + String(index).padStart(2, '0') + '.webp?v=' + BAKED, import.meta.url).href;

// Decoding and reading back a thousand-pixel sticker took the page's main thread ~60 ms each, so
// a few workers share them (baked-worker.js) and quit once there's nothing left to do.
const WORKERS = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
const pool = [];
let jobs = 0, pending = 0;
export function loadBakedSticker(index) {
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return loadHere(index);
  const id = jobs++, slot = id % WORKERS;
  const worker = pool[slot] ??= new Worker(new URL('./baked-worker.js?v=' + BAKED, import.meta.url));
  pending++;
  return new Promise((resolve, reject) => {
    const finish = () => {
      worker.removeEventListener('message', done); worker.removeEventListener('error', failed);
      if (--pending === 0) { for (const w of pool) w?.terminate(); pool.length = 0; }
    };
    const done = ({ data }) => {
      if (data.id !== id) return;
      finish();
      if (data.error) reject(new Error(data.error));
      else resolve({ canvas: data.bitmap, w: data.w, h: data.h, cut: data.cut });
    };
    // a worker that can't start: decode this one here instead
    const failed = () => { finish(); loadHere(index).then(resolve, reject); };
    worker.addEventListener('message', done); worker.addEventListener('error', failed);
    worker.postMessage({ id, url: url(index) });
  });
}

// browsers without OffscreenCanvas decode on the page itself, as before
async function loadHere(index) {
  const image = new Image();
  image.src = url(index);
  await image.decode();
  const canvas = document.createElement('canvas');
  const w = image.naturalWidth, h = image.naturalHeight;
  canvas.width = w; canvas.height = h;
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  const rgba = context.getImageData(0, 0, w, h).data;
  const cut = new Float32Array(w * h);
  for (let i = 0; i < cut.length; i++) cut[i] = rgba[i * 4 + 3] / 255;
  return { canvas, w, h, cut };
}
