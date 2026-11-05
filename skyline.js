// the background's look, chosen by Isha: 40 px triangles drifting at full speed
const TRIANGLE_SIZE = 40, DRIFT_SPEED = 2;
// change when skyline-worker.js or skyline-scene.js changes, so browsers fetch the new files
const VERSION = '?v=pink-1';

export async function startSkyline(canvas) {
  const settings = () => ({ width: canvas.clientWidth, height: canvas.clientHeight,
    dpr: Math.min(2, devicePixelRatio || 1), density: TRIANGLE_SIZE, speed: DRIFT_SPEED,
    reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches });
  let send;
  if (canvas.transferControlToOffscreen && typeof Worker !== 'undefined') {
    const worker = new Worker(new URL('./skyline-worker.js' + VERSION, import.meta.url));
    const offscreen = canvas.transferControlToOffscreen();
    worker.postMessage({ type: 'init', canvas: offscreen, settings: settings() }, [offscreen]);
    send = data => worker.postMessage(data);
    worker.onmessage = ({ data }) => { if (data.type === 'ready') canvas.dataset.renderer = 'worker'; };
    worker.onerror = event => console.error('Skyline worker:', event.message);
  } else {
    const { createSkyline } = await import('./skyline-scene.js' + VERSION);
    const renderer = createSkyline(canvas, settings(), window.Delaunay.triangulate);
    send = data => { if (data.type === 'resize') renderer.resize(data.settings);
      else if (data.type === 'speed') renderer.speed(data.value); else renderer.light(data.value); };
    canvas.dataset.renderer = 'main-thread-fallback';
  }
  addEventListener('resize', () => send({ type: 'resize', settings: settings() }));
  const stage = document.getElementById('stage');
  stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect(); send({ type: 'light', value: { x: e.clientX - r.left, y: e.clientY - r.top } });
  }, { passive: true });
  stage.addEventListener('pointerleave', () => send({ type: 'light', value: null }));
}
