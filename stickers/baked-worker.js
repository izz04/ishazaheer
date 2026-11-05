// Decodes a baked sticker and reads its outline off the page's main thread (baked.js): the
// decoded artwork and the outline are handed back without copying.
onmessage = async ({ data: { id, url } }) => {
  try {
    const bitmap = await createImageBitmap(await (await fetch(url)).blob());
    const w = bitmap.width, h = bitmap.height;
    const context = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0);
    const rgba = context.getImageData(0, 0, w, h).data;
    const cut = new Float32Array(w * h);
    for (let i = 0; i < cut.length; i++) cut[i] = rgba[i * 4 + 3] / 255;
    postMessage({ id, bitmap, w, h, cut }, [bitmap, cut.buffer]);
  } catch (error) {
    postMessage({ id, error: String(error) });
  }
};
