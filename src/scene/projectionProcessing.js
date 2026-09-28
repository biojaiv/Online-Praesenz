// Pixel work runs away from input/rendering. Original files and raster sizes stay unchanged.
let worker = null;
let nextId = 0;
let idleTimer = 0;
let workerFailed = false;
const pending = new Map();

function stopWorker(error) {
  clearTimeout(idleTimer);
  worker?.terminate(); worker = null;
  for (const job of pending.values()) job.reject(error);
  pending.clear();
}

function getWorker() {
  clearTimeout(idleTimer);
  if (worker) return worker;
  worker = new Worker(new URL('./projectionRaster.worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    const job = pending.get(data.id);
    if (!job) return;
    pending.delete(data.id);
    if (data.error) job.reject(new Error(data.error));
    else job.resolve(data);
    // Retain it for concurrent CV/IHK loads, then release its heap.
    if (!pending.size) idleTimer = setTimeout(() => stopWorker(), 1500);
  };
  worker.onerror = event => {
    event.preventDefault(); workerFailed = true;
    stopWorker(new Error(event.message || 'Document worker unavailable'));
  };
  return worker;
}

export async function processProjection(image, size, source, documentKey) {
  if (!workerFailed && typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined'
    && typeof createImageBitmap === 'function') {
    let bitmap;
    try {
      // HTMLImageElement and ImageBitmap use different resize paths in Chromium.
      // Keep the original high-quality resize here; move only the expensive pixel loops.
      const input = document.createElement('canvas');
      input.width = size.width; input.height = size.height;
      const context = input.getContext('2d', { willReadFrequently: true });
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, size.width, size.height);
      bitmap = await createImageBitmap(input);
      const activeWorker = getWorker();
      const id = ++nextId;
      const data = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          workerFailed = true;
          stopWorker(new Error('Document processing timed out'));
        }, 30000);
        pending.set(id, {
          resolve(value) { clearTimeout(timeout); resolve(value); },
          reject(error) { clearTimeout(timeout); reject(error); },
        });
        try { activeWorker.postMessage({ id, bitmap, size, source, documentKey }, [bitmap]); }
        catch (error) { clearTimeout(timeout); pending.delete(id); reject(error); }
      });
      const canvas = document.createElement('canvas');
      canvas.width = size.width; canvas.height = size.height;
      canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data.pixels), size.width, size.height), 0, 0);
      return canvas;
    } catch {
      bitmap?.close();
      // Older browsers still use the exact original processing path.
    }
  }
  const { prepareProjection } = await import('./projectionRaster.js');
  return prepareProjection(image, size, source, documentKey);
}

if (import.meta.hot) import.meta.hot.dispose(() => stopWorker(new Error('Module disposed')));
