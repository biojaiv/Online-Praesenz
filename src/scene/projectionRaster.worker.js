import { prepareProjection } from './projectionRaster.js';

self.onmessage = ({ data: { id, bitmap, size, source, documentKey } }) => {
  try {
    const canvas = prepareProjection(bitmap, size, source, documentKey);
    const pixels = canvas.getContext('2d').getImageData(0, 0, size.width, size.height).data.buffer;
    self.postMessage({ id, pixels }, [pixels]);
  } catch (error) {
    self.postMessage({ id, error: error.message });
  } finally { bitmap.close(); }
};
