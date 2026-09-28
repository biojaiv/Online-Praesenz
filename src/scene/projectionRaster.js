function createCanvas() {
  return typeof document === 'undefined' ? new OffscreenCanvas(1, 1) : document.createElement('canvas');
}
import { chooseRasterSize } from './projectionSize.js';
export { chooseRasterSize };
// Identical pixel treatment in the worker and the older-browser fallback.
import cvProjection from '../data/cvProjection.json';
const CV_PAGE_COUNT = cvProjection.de.pageCount;

const LINK_BOX_FALLBACK = Object.freeze({ start: 0.56, end: 0.71 });
// Randstreifen jeder Seite, in denen die Vorlagen ihren eigenen Seitenrahmen
// tragen (Anteile von Breite bzw. Seitenhöhe). Den Abschluss liefert allein
// der gemeinsame Partikelrahmen.
const PAGE_FRAME_BANDS = Object.freeze({
  lebenslauf: { left: 0.043, right: 0.0403, top: 0.018, bottom: 0.008, soft: 0.001, zone: 0.06, zoneBottom: 0.1, dimLuma: 80 },
  abschluss: { left: 0.012, right: 0.012, top: 0.005, bottom: 0.005, soft: 0.002 },
});



function clampUnit(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothUnit(edge0, edge1, value) {
  const t = clampUnit((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function buildBackgroundGrid(pixels, width, height) {
  const columns = 8;
  const rows = 12;
  const grid = new Array(columns * rows);

  for (let row = 0; row < rows; row += 1) {
    const yStart = Math.floor(row * height / rows);
    const yEnd = Math.ceil((row + 1) * height / rows);
    for (let column = 0; column < columns; column += 1) {
      const xStart = Math.floor(column * width / columns);
      const xEnd = Math.ceil((column + 1) * width / columns);
      const step = Math.max(3, Math.floor(Math.min(
        xEnd - xStart,
        yEnd - yStart,
      ) / 18));
      const histogram = new Uint32Array(64);

      for (let y = yStart; y < yEnd; y += step) {
        for (let x = xStart; x < xEnd; x += step) {
          const offset = (y * width + x) * 4;
          if (pixels[offset + 3] < 24) continue;
          const red = pixels[offset];
          const green = pixels[offset + 1];
          const blue = pixels[offset + 2];
          const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
          const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;
          if (luma <= 128 && chroma <= 82) {
            histogram[Math.min(63, Math.floor(luma / 2))] += 1;
          }
        }
      }

      let mode = 0;
      for (let index = 1; index < histogram.length; index += 1) {
        if (histogram[index] > histogram[mode]) mode = index;
      }
      const targetLuma = mode * 2 + 1;
      let redTotal = 0;
      let greenTotal = 0;
      let blueTotal = 0;
      let samples = 0;

      for (let y = yStart; y < yEnd; y += step) {
        for (let x = xStart; x < xEnd; x += step) {
          const offset = (y * width + x) * 4;
          if (pixels[offset + 3] < 24) continue;
          const red = pixels[offset];
          const green = pixels[offset + 1];
          const blue = pixels[offset + 2];
          const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;
          const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
          if (Math.abs(luma - targetLuma) <= 10 && chroma <= 82) {
            redTotal += red;
            greenTotal += green;
            blueTotal += blue;
            samples += 1;
          }
        }
      }

      grid[row * columns + column] = samples > 0
        ? { r: redTotal / samples, g: greenTotal / samples, b: blueTotal / samples }
        : { r: 6, g: 12, b: 20 };
    }
  }

  return { columns, rows, grid };
}

function sampleBackground(model, x, y, width, height, output) {
  const gx = width > 1 ? x / (width - 1) * (model.columns - 1) : 0;
  const gy = height > 1 ? y / (height - 1) * (model.rows - 1) : 0;
  const left = Math.floor(gx);
  const top = Math.floor(gy);
  const right = Math.min(model.columns - 1, left + 1);
  const bottom = Math.min(model.rows - 1, top + 1);
  const tx = gx - left;
  const ty = gy - top;
  const a = model.grid[top * model.columns + left];
  const b = model.grid[top * model.columns + right];
  const c = model.grid[bottom * model.columns + left];
  const d = model.grid[bottom * model.columns + right];
  const mix = (p, q, r, s) => {
    const upper = p + (q - p) * tx;
    const lower = r + (s - r) * tx;
    return upper + (lower - upper) * ty;
  };
  output[0] = mix(a.r, b.r, c.r, d.r);
  output[1] = mix(a.g, b.g, c.g, d.g);
  output[2] = mix(a.b, b.b, c.b, d.b);
  return output;
}

/**
 * Entfernt den eingebrannten Hintergrund einer einzelnen Projektionsseite.
 * RGB-Werte und Pixelpositionen aller Informationen bleiben unverändert;
 * ausschliesslich der Alphakanal wird aus dem lokalen Hintergrund abgeleitet.
 */
function makePageTransparent(context, width, pageHeight, pageTop = 0) {
  const image = context.getImageData(0, pageTop, width, pageHeight);
  const pixels = image.data;
  const background = buildBackgroundGrid(pixels, width, pageHeight);
  const mask = new Uint8Array(width * pageHeight);
  const expanded = new Uint8Array(mask.length);
  const base = new Float32Array(3);

  const lumaAt = (x, y) => {
    const safeX = Math.min(width - 1, Math.max(0, x));
    const safeY = Math.min(pageHeight - 1, Math.max(0, y));
    const offset = (safeY * width + safeX) * 4;
    return pixels[offset] * 0.2126
      + pixels[offset + 1] * 0.7152
      + pixels[offset + 2] * 0.0722;
  };

  for (let y = 0; y < pageHeight; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      const offset = pixelIndex * 4;
      if (pixels[offset + 3] === 0) continue;
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      sampleBackground(background, x, y, width, pageHeight, base);
      const distance = Math.hypot(red - base[0], green - base[1], blue - base[2]);
      const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      const baseLuma = base[0] * 0.2126 + base[1] * 0.7152 + base[2] * 0.0722;
      const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
      const baseChroma = Math.max(base[0], base[1], base[2]) - Math.min(base[0], base[1], base[2]);
      const edge = Math.max(
        Math.abs(lumaAt(x + 1, y) - lumaAt(x - 1, y)),
        Math.abs(lumaAt(x, y + 1) - lumaAt(x, y - 1)),
      );
      let signal = Math.max(
        smoothUnit(4, 34, distance),
        smoothUnit(2, 28, luma - baseLuma),
        smoothUnit(7, 45, chroma - baseChroma),
        smoothUnit(5, 30, edge),
      );
      if (luma >= 96 || chroma >= 76) signal = Math.max(signal, 0.97);
      mask[pixelIndex] = Math.round(Math.pow(clampUnit(signal), 0.58) * 255);
    }
  }

  for (let y = 0; y < pageHeight; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      let strongest = mask[pixelIndex];
      for (let dy = -1; dy <= 1; dy += 1) {
        const sy = y + dy;
        if (sy < 0 || sy >= pageHeight) continue;
        for (let dx = -1; dx <= 1; dx += 1) {
          const sx = x + dx;
          if (sx < 0 || sx >= width) continue;
          const neighbour = mask[sy * width + sx];
          const weighted = dx === 0 && dy === 0
            ? neighbour
            : Math.round(neighbour * 0.82);
          if (weighted > strongest) strongest = weighted;
        }
      }
      expanded[pixelIndex] = strongest;
    }
  }

  let transparent = 0;
  for (let pixelIndex = 0; pixelIndex < expanded.length; pixelIndex += 1) {
    const alphaOffset = pixelIndex * 4 + 3;
    pixels[alphaOffset] = Math.round(
      pixels[alphaOffset] * expanded[pixelIndex] / 255,
    );
    if (pixels[alphaOffset] <= 2) transparent += 1;
  }

  context.putImageData(image, 0, pageTop);
  console.info('Webprojektion: Seitenhintergrund entfernt.', {
    pageTop,
    transparentRatio: transparent / expanded.length,
  });
}


/**
 * Blendet den eingebrannten Seitenrahmen der Vorlage aus, damit jedes
 * Hologramm nur vom gemeinsamen Partikelrahmen begrenzt wird. Innerhalb der
 * Randzone verschwinden nur dunkle Pixel (Rahmenschein, Dekor); Text und
 * Symbole sind deutlich heller und bleiben erhalten.
 */
function clearPageFrame(context, width, height, pageCount, bands) {
  const image = context.getImageData(0, 0, width, height);
  const pixels = image.data;
  const soft = Math.max(1, bands.soft * width);
  const left = bands.left * width;
  const right = width - bands.right * width;
  const sideZone = Math.max(1, (bands.zone ?? 0) * width);
  const hardColumn = new Float32Array(width);
  const zoneColumn = new Float32Array(width);
  for (let x = 0; x < width; x += 1) {
    hardColumn[x] = smoothUnit(left, left + soft, x) * (1 - smoothUnit(right - soft, right, x));
    zoneColumn[x] = bands.zone
      ? smoothUnit(left, left + sideZone, x) * (1 - smoothUnit(right - sideZone, right, x))
      : 1;
  }

  for (let page = 0; page < pageCount; page += 1) {
    const top = Math.floor(page * height / pageCount);
    const bottom = Math.floor((page + 1) * height / pageCount);
    const pageHeight = bottom - top;
    const bandTop = bands.top * pageHeight;
    const bandBottom = pageHeight - bands.bottom * pageHeight;
    const rowZone = Math.max(1, (bands.zone ?? 0) * pageHeight);
    const bottomZone = Math.max(1, (bands.zoneBottom ?? bands.zone ?? 0) * pageHeight);
    for (let y = top; y < bottom; y += 1) {
      const local = y - top;
      const hardRow = smoothUnit(bandTop, bandTop + soft, local)
        * (1 - smoothUnit(bandBottom - soft, bandBottom, local));
      const zoneRow = bands.zone
        ? smoothUnit(bandTop, bandTop + rowZone, local)
          * (1 - smoothUnit(bandBottom - bottomZone, bandBottom, local))
        : 1;
      for (let x = 0; x < width; x += 1) {
        const hard = hardRow * hardColumn[x];
        const zone = zoneRow * zoneColumn[x];
        if (hard >= 1 && zone >= 1) continue;
        const offset = (y * width + x) * 4;
        const luma = pixels[offset] * 0.2126
          + pixels[offset + 1] * 0.7152
          + pixels[offset + 2] * 0.0722;
        const dim = 1 - smoothUnit(bands.dimLuma ?? 0, (bands.dimLuma ?? 0) + 40, luma);
        const keep = hard * (1 - dim * (1 - zone));
        pixels[offset + 3] = Math.round(pixels[offset + 3] * keep);
      }
    }
  }

  context.putImageData(image, 0, 0);
}


function isAmberPixel(r, g, b, a) {
  return a >= 42
    && r >= 70
    && g >= 42
    && r - b > 18
    && r - g > 4
    && g - b > 2
    && r > b * 1.05;
}

function longestAmberRun(pixels, width, y, xStart, xEnd) {
  let run = 0;
  let gap = 0;
  let longest = 0;

  for (let x = xStart; x < xEnd; x += 1) {
    const index = (y * width + x) * 4;
    const amber = isAmberPixel(
      pixels[index],
      pixels[index + 1],
      pixels[index + 2],
      pixels[index + 3],
    );

    if (amber) {
      run += gap + 1;
      gap = 0;
      longest = Math.max(longest, run);
    } else if (run > 0 && gap < 3) {
      gap += 1;
    } else {
      run = 0;
      gap = 0;
    }
  }

  return longest;
}

/**
 * Erkennt die zwei langen horizontalen Rahmenlinien des Linkkastens.
 * Bei abweichender Farbwiedergabe greift ein konservativer Ersatzbereich.
 */
function detectLinkBoxCut(context, width, height) {
  const pageHeight = Math.floor(height / CV_PAGE_COUNT);
  const fallback = {
    start: Math.round(pageHeight * LINK_BOX_FALLBACK.start),
    end: Math.round(pageHeight * LINK_BOX_FALLBACK.end),
    detected: false,
  };

  try {
    const pixels = context.getImageData(
      0,
      pageHeight,
      width,
      pageHeight,
    ).data;
    const xStart = Math.floor(width * 0.055);
    const xEnd = Math.ceil(width * 0.945);
    const yStart = Math.floor(pageHeight * 0.44);
    const yEnd = Math.ceil(pageHeight * 0.82);
    const minimumRun = width * 0.42;
    const groups = [];
    let group = null;

    for (let y = yStart; y < yEnd; y += 1) {
      const score = longestAmberRun(pixels, width, y, xStart, xEnd);

      if (score >= minimumRun) {
        if (!group) {
          group = { start: y, end: y, peakY: y, peak: score };
        } else {
          group.end = y;
          if (score > group.peak) {
            group.peak = score;
            group.peakY = y;
          }
        }
      } else if (group) {
        groups.push(group);
        group = null;
      }
    }
    if (group) groups.push(group);

    let best = null;
    for (let first = 0; first < groups.length; first += 1) {
      for (let second = first + 1; second < groups.length; second += 1) {
        const top = groups[first];
        const bottom = groups[second];
        const gap = bottom.peakY - top.peakY;
        if (gap < pageHeight * 0.035 || gap > pageHeight * 0.16) continue;

        const middle = (top.peakY + bottom.peakY) * 0.5 / pageHeight;
        const score = top.peak + bottom.peak
          - Math.abs(middle - 0.635) * width;

        if (!best || score > best.score) {
          best = { top, bottom, score };
        }
      }
    }

    if (!best) return fallback;

    const start = Math.max(
      0,
      best.top.start - Math.round(pageHeight * 0.012),
    );
    const end = Math.min(
      pageHeight,
      best.bottom.end + Math.round(pageHeight * 0.018),
    );
    const cutHeight = end - start;

    if (cutHeight < pageHeight * 0.055 || cutHeight > pageHeight * 0.2) {
      return fallback;
    }

    return { start, end, detected: true };
  } catch (error) {
    console.warn(
      'Linkkasten-Erkennung fehlgeschlagen; verwende Sicherheitsausschnitt.',
      error,
    );
    return fallback;
  }
}

/**
 * Nur die WebGL-Textur wird geändert:
 * Auf beiden Seiten wird ausschliesslich der eingebrannte Hintergrund transparent;
 * Seite 2 verliert den Linkkasten und der darunterliegende Inhalt rückt hoch.
 * PDF, RGB-Inhalte und Pixelpositionen der ersten Seite bleiben unangetastet.
 */
function createWebProjectionCanvas(image, size) {
  const source = createCanvas();
  source.width = size.width;
  source.height = size.height;
  const sourceContext = source.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) {
    throw new Error('Der Canvas-2D-Kontext ist nicht verfügbar.');
  }

  sourceContext.imageSmoothingEnabled = true;
  sourceContext.imageSmoothingQuality = 'high';
  sourceContext.drawImage(image, 0, 0, size.width, size.height);
  // Vor dem Verschieben von Seite 2, damit die Rahmenunterkante nicht mitwandert.
  clearPageFrame(sourceContext, size.width, size.height, CV_PAGE_COUNT, PAGE_FRAME_BANDS.lebenslauf);

  const cut = detectLinkBoxCut(sourceContext, size.width, size.height);
  const output = createCanvas();
  output.width = size.width;
  output.height = size.height;
  const context = output.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Der Canvas-2D-Kontext ist nicht verfügbar.');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const pageHeight = Math.floor(size.height / CV_PAGE_COUNT);
  const pageTwoTop = pageHeight;

  context.drawImage(
    source,
    0, 0, size.width, pageHeight,
    0, 0, size.width, pageHeight,
  );
  makePageTransparent(context, size.width, pageHeight);

  context.drawImage(
    source,
    0, pageTwoTop, size.width, cut.start,
    0, pageTwoTop, size.width, cut.start,
  );

  const lowerHeight = Math.max(0, pageHeight - cut.end);
  if (lowerHeight > 0) {
    context.drawImage(
      source,
      0, pageTwoTop + cut.end, size.width, lowerHeight,
      0, pageTwoTop + cut.start, size.width, lowerHeight,
    );
  }

  // The page frame moved up with the content; the vacated strip stays empty so
  // the hologram ends with its own frame, like the first page.
  context.clearRect(0, pageTwoTop + cut.start + lowerHeight, size.width, pageHeight - cut.start - lowerHeight);

  makePageTransparent(context, size.width, pageHeight, pageTwoTop);

  console.info(
    `Webprojektion: Linkkasten ${cut.detected ? 'erkannt' : 'per Ersatzbereich'} entfernt.`,
    { start: cut.start / pageHeight, end: cut.end / pageHeight },
  );

  return output;
}


// PROJECTION_LUMINANCE_CONTROL_V4_2
// The English reading-version PNG is a normal white-page render. For the 3D
// hologram only, remove neutral near-white paper pixels while retaining dark
// text, cyan/blue rules and coloured accents. PDF/DOCX bytes remain untouched.
function suppressLightPaper(context, width, height) {
  const image = context.getImageData(0, 0, width, height);
  const pixels = image.data;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    const alpha = pixels[offset + 3];
    if (alpha <= 0) continue;

    const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
    const paper = smoothUnit(218, 250, luma)
      * (1 - smoothUnit(10, 42, chroma));
    pixels[offset + 3] = Math.round(alpha * (1 - paper * 0.995));
  }
  context.putImageData(image, 0, 0);
}

function createDirectProjectionCanvas(image, size) {
  const output = createCanvas();
  output.width = size.width;
  output.height = size.height;
  const context = output.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('The CV projection canvas is not available.');
  }
  context.clearRect(0, 0, size.width, size.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, size.width, size.height);
  return output;
}


export function prepareProjection(image, size, source, documentKey) {
  const canvas = source.webTransform
    ? createWebProjectionCanvas(image, size)
    : createDirectProjectionCanvas(image, size);
  if (documentKey === 'lebenslauf' && !source.webTransform) {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    for (let page = 0; page < source.pageCount; page += 1) {
      const top = Math.floor(page * size.height / source.pageCount);
      const bottom = Math.floor((page + 1) * size.height / source.pageCount);
      makePageTransparent(context, size.width, bottom - top, top);
    }
  }
  const bands = PAGE_FRAME_BANDS[documentKey];
  if (bands && !source.webTransform) {
    clearPageFrame(canvas.getContext('2d', { willReadFrequently: true }),
      size.width, size.height, source.pageCount, bands);
  }
  return canvas;
}
