// Keep triangulation and the continuously drifting skyline off the mouse/eye thread.
importScripts('./delaunay.js');
let renderer, pending = [];
onmessage = async ({ data }) => {
  if (data.type === 'init') {
    // the same version tag the page gave this worker
    const { createSkyline } = await import('./skyline-scene.js' + location.search);
    renderer = createSkyline(data.canvas, data.settings, Delaunay.triangulate);
    for (const next of pending) apply(next);
    pending = [];
    postMessage({ type: 'ready' });
  } else if (!renderer) pending.push(data);
  else apply(data);
};
function apply(data) {
  if (data.type === 'resize') renderer.resize(data.settings);
  else if (data.type === 'speed') renderer.speed(data.value);
  else if (data.type === 'light') renderer.light(data.value);
}
