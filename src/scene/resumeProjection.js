import * as THREE from 'three';

export const CV_SVG_URL = new URL(
  '../../Elemente/lebenslauf.svg',
  import.meta.url,
).href;

export const CV_PAGE_COUNT = 2;
export const CV_PAGE_ASPECT = 1241 / (3786 / CV_PAGE_COUNT);

export const CV_ANCHORS = Object.freeze({
  uebersicht: 0,
  bildungsweg: 0.185,
  faehigkeiten: 0.355,
  kontakt: 0.415,
  arbeitsleben: 0.525,
});

const DESKTOP_MAX_WIDTH = 1241;
const COMPACT_MAX_WIDTH = 820;
const MAX_PIXELS = 5_200_000;
const LINK_BOX_FALLBACK = Object.freeze({ start: 0.56, end: 0.71 });
// Die sichtbare blaue Abschlusskante der ersten Seite liegt in der
// Vorlage rund 10,6 % oberhalb des Seitenendes. Der Partikelrahmen bleibt
// unverändert; nur diese dekorative Rasterkante wird an seine bestehende
// Unterkante versetzt.
const FIRST_PAGE_BOTTOM_RULE_OFFSET = 0.106;
const FIRST_PAGE_BOTTOM_RULE_SEARCH = 0.028;
const FIRST_PAGE_BOTTOM_RULE_BAND = 0.0035;
const FIRST_PAGE_BOTTOM_RULE_EDGE_INSET = 0.0015;

function chooseRasterSize(width, height, maxTextureSize, compact) {
  const aspect = width / height;
  const limit = Math.max(512, maxTextureSize || 4096);
  const target = Math.min(
    compact ? COMPACT_MAX_WIDTH : DESKTOP_MAX_WIDTH,
    width,
    limit,
    Math.floor(limit * aspect),
    Math.floor(Math.sqrt(MAX_PIXELS * aspect)),
  );
  const nextWidth = Math.max(1, target);
  return {
    width: nextWidth,
    height: Math.max(1, Math.round(nextWidth / aspect)),
  };
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(
      new Error('Die Lebenslauf-Vorlage konnte nicht geladen werden.'),
    );
    image.src = url;
  });
}


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
 * Entfernt nur den eingebrannten Hintergrund von Seite eins.
 * RGB-Werte und Pixelpositionen aller Informationen bleiben unverändert;
 * ausschliesslich der Alphakanal wird aus dem lokalen Hintergrund abgeleitet.
 */
function makeFirstPageTransparent(context, width, pageHeight) {
  const image = context.getImageData(0, 0, width, pageHeight);
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

  context.putImageData(image, 0, 0);
  console.info('Webprojektion: Hintergrund von Seite eins entfernt.', {
    transparentRatio: transparent / expanded.length,
  });
}


function isBlueBottomRulePixel(r, g, b, a) {
  return a >= 24
    && b >= 42
    && b - r >= 8
    && g - r >= 2
    && b >= g * 0.82;
}

function longestBlueBottomRuleRun(pixels, width, y, xStart, xEnd) {
  let bestStart = -1;
  let bestEnd = -1;
  let runStart = -1;
  let runEnd = -1;
  let gap = 0;

  const finishRun = () => {
    if (runStart < 0 || runEnd < runStart) return;
    if (
      bestStart < 0
      || (runEnd - runStart) > (bestEnd - bestStart)
    ) {
      bestStart = runStart;
      bestEnd = runEnd;
    }
  };

  for (let x = xStart; x < xEnd; x += 1) {
    const index = (y * width + x) * 4;
    const blue = isBlueBottomRulePixel(
      pixels[index],
      pixels[index + 1],
      pixels[index + 2],
      pixels[index + 3],
    );

    if (blue) {
      if (runStart < 0) runStart = x;
      runEnd = x;
      gap = 0;
    } else if (runStart >= 0 && gap < 3) {
      gap += 1;
    } else if (runStart >= 0) {
      finishRun();
      runStart = -1;
      runEnd = -1;
      gap = 0;
    }
  }

  finishRun();

  return {
    start: bestStart,
    end: bestEnd,
    length: bestStart >= 0 ? bestEnd - bestStart + 1 : 0,
  };
}

/**
 * Versetzt ausschließlich die bereits vorhandene blaue horizontale
 * Abschlusskante der ersten Seite. Dokumentinhalt, Dokumentgeometrie und
 * Partikelrahmen bleiben an ihren Positionen.
 */
function alignFirstPageBottomRule(context, width, pageHeight) {
  const image = context.getImageData(0, 0, width, pageHeight);
  const pixels = image.data;
  const expectedY = Math.round(
    pageHeight * (1 - FIRST_PAGE_BOTTOM_RULE_OFFSET),
  );
  const searchRadius = Math.max(
    4,
    Math.round(pageHeight * FIRST_PAGE_BOTTOM_RULE_SEARCH),
  );
  const yStart = Math.max(0, expectedY - searchRadius);
  const yEnd = Math.min(pageHeight - 1, expectedY + searchRadius);
  const xStart = Math.floor(width * 0.08);
  const xEnd = Math.ceil(width * 0.92);
  const minimumRun = width * 0.24;

  let best = null;

  for (let y = yStart; y <= yEnd; y += 1) {
    const run = longestBlueBottomRuleRun(
      pixels,
      width,
      y,
      xStart,
      xEnd,
    );
    if (!best || run.length > best.length) {
      best = { ...run, y };
    }
  }

  if (!best || best.length < minimumRun) {
    console.warn(
      'Webprojektion: blaue Abschlusskante nicht sicher erkannt; '
      + 'Position bleibt unverändert.',
      {
        expectedY: expectedY / pageHeight,
        bestRun: best?.length ?? 0,
        minimumRun,
      },
    );
    return false;
  }

  const bandRadius = Math.max(
    2,
    Math.round(pageHeight * FIRST_PAGE_BOTTOM_RULE_BAND),
  );
  const sourceY = Math.max(0, best.y - bandRadius);
  const sourceBottom = Math.min(pageHeight, best.y + bandRadius + 1);
  const bandHeight = sourceBottom - sourceY;
  const horizontalMargin = Math.max(2, Math.round(width * 0.008));
  const sourceX = Math.max(0, best.start - horizontalMargin);
  const sourceRight = Math.min(width, best.end + horizontalMargin + 1);
  const stripWidth = sourceRight - sourceX;
  const edgeInset = Math.max(
    1,
    Math.round(pageHeight * FIRST_PAGE_BOTTOM_RULE_EDGE_INSET),
  );
  const targetY = pageHeight - edgeInset - bandHeight;

  if (targetY <= sourceBottom || stripWidth <= 0 || bandHeight <= 0) {
    console.warn(
      'Webprojektion: blaue Abschlusskante konnte nicht sicher versetzt werden.',
    );
    return false;
  }

  const strip = context.getImageData(
    sourceX,
    sourceY,
    stripWidth,
    bandHeight,
  );

  // Nur der erkannte horizontale Streifen wird versetzt. Die seitlichen
  // Dekore und alle übrigen Dokumentpixel bleiben exakt an ihrem Ort.
  context.clearRect(sourceX, sourceY, stripWidth, bandHeight);
  context.putImageData(strip, sourceX, targetY);

  console.info(
    'Webprojektion: blaue Abschlusskante an Partikelrahmen ausgerichtet.',
    {
      from: best.y / pageHeight,
      to: (targetY + bandHeight * 0.5) / pageHeight,
    },
  );

  return true;
}

/**
 * Erzeugt für Seite zwei eine unsichtbare Verlängerung zwischen dem nach oben
 * gerückten Inhalt und der unveränderten unteren Partikelkante.
 *
 * Beim Entfernen des Linkkastens wird der untere Seiteninhalt um cutHeight
 * nach oben versetzt. Die blaue Abschlusskante darf diese Bewegung nicht
 * mitmachen: Ihre blauen und cyanfarbenen Pixel werden aus dem ursprünglichen
 * unteren Seitenband gelöst, am verschobenen Ort entfernt und direkt an der
 * physischen Seitenunterkante wieder eingesetzt. Der Raum dazwischen bleibt
 * vollständig transparent und bildet die unsichtbare "Prothese".
 */
function blueProsthesisSignal(r, g, b, a) {
  if (a < 8) return 0;

  const peak = Math.max(g, b);
  const blueLead = b - r;
  const cyanLead = g - r;

  if (peak < 22 || blueLead < 2 || cyanLead < -6) return 0;

  const blueBias = smoothUnit(2, 28, blueLead);
  const cyanBias = smoothUnit(-6, 22, cyanLead);
  const brightness = smoothUnit(18, 100, peak);

  return clampUnit(Math.max(
    blueBias * cyanBias,
    blueBias * brightness * 0.82,
  ));
}

function attachSecondPageBottomProsthesis(
  sourceContext,
  outputContext,
  width,
  pageHeight,
  pageTwoTop,
  cut,
) {
  const cutHeight = Math.max(0, cut.end - cut.start);
  const minimumCut = Math.max(2, Math.round(pageHeight * 0.01));

  if (cutHeight < minimumCut) {
    console.warn(
      'Webprojektion: Randprothese übersprungen; Linkkastenausschnitt ist zu klein.',
    );
    return false;
  }

  const sourcePage = sourceContext.getImageData(
    0,
    pageTwoTop,
    width,
    pageHeight,
  );
  const outputPage = outputContext.getImageData(
    0,
    pageTwoTop,
    width,
    pageHeight,
  );
  const sourcePixels = sourcePage.data;
  const outputPixels = outputPage.data;

  // Gesucht wird nur im unteren Originalbereich, der durch das Hochrücken
  // des Inhalts seine Abschlusskante nach oben verlieren würde.
  const searchPadding = Math.max(10, Math.round(pageHeight * 0.16));
  const searchTop = Math.max(
    cut.end,
    pageHeight - cutHeight - searchPadding,
  );
  const searchBottom = Math.max(
    searchTop + 1,
    pageHeight - Math.max(2, Math.round(pageHeight * 0.002)),
  );
  const xStart = Math.floor(width * 0.08);
  const xEnd = Math.ceil(width * 0.92);

  let bestY = -1;
  let bestHits = 0;
  let bestScore = 0;

  for (let y = searchTop; y < searchBottom; y += 1) {
    let hits = 0;
    let score = 0;

    for (let x = xStart; x < xEnd; x += 1) {
      const index = (y * width + x) * 4;
      const signal = blueProsthesisSignal(
        sourcePixels[index],
        sourcePixels[index + 1],
        sourcePixels[index + 2],
        sourcePixels[index + 3],
      );

      score += signal;
      if (signal >= 0.12) hits += 1;
    }

    if (
      hits > bestHits
      || (hits === bestHits && score > bestScore)
    ) {
      bestY = y;
      bestHits = hits;
      bestScore = score;
    }
  }

  const minimumHits = Math.max(24, Math.round(width * 0.055));
  if (bestY < 0 || bestHits < minimumHits) {
    console.warn(
      'Webprojektion: blaue Abschlusskante der zweiten Seite '
      + 'nicht sicher erkannt; Randprothese bleibt inaktiv.',
      { bestHits, minimumHits },
    );
    return false;
  }

  const bandRadius = Math.max(5, Math.round(pageHeight * 0.009));
  const bandTop = Math.max(searchTop, bestY - bandRadius);
  const bandBottom = Math.min(pageHeight, bestY + bandRadius + 1);
  const bandHeight = bandBottom - bandTop;
  const baseMask = new Uint8Array(width * bandHeight);
  const expandedMask = new Uint8Array(baseMask.length);

  for (let localY = 0; localY < bandHeight; localY += 1) {
    const sourceY = bandTop + localY;

    for (let x = 0; x < width; x += 1) {
      const index = (sourceY * width + x) * 4;
      const signal = blueProsthesisSignal(
        sourcePixels[index],
        sourcePixels[index + 1],
        sourcePixels[index + 2],
        sourcePixels[index + 3],
      );
      baseMask[localY * width + x] = Math.round(signal * 255);
    }
  }

  // Zwei Pixel weiche Ausdehnung nehmen den hellen Saum der Kante mit,
  // ohne den dunklen Seitenhintergrund in die Prothese zu kopieren.
  for (let localY = 0; localY < bandHeight; localY += 1) {
    for (let x = 0; x < width; x += 1) {
      let strongest = baseMask[localY * width + x];

      for (let dy = -2; dy <= 2; dy += 1) {
        const sampleY = localY + dy;
        if (sampleY < 0 || sampleY >= bandHeight) continue;

        for (let dx = -2; dx <= 2; dx += 1) {
          const sampleX = x + dx;
          if (sampleX < 0 || sampleX >= width) continue;

          const distance = Math.max(Math.abs(dx), Math.abs(dy));
          const weight = distance === 0 ? 1 : distance === 1 ? 0.82 : 0.58;
          const value = Math.round(
            baseMask[sampleY * width + sampleX] * weight,
          );
          if (value > strongest) strongest = value;
        }
      }

      expandedMask[localY * width + x] = strongest;
    }
  }

  const edgeInset = Math.max(1, Math.round(pageHeight * 0.001));
  const targetTop = pageHeight - edgeInset - bandHeight;
  const shiftedTop = bandTop - cutHeight;

  if (
    targetTop < 0
    || shiftedTop < 0
    || targetTop <= shiftedTop
  ) {
    console.warn(
      'Webprojektion: Geometrie der Randprothese ist nicht plausibel.',
      { bandTop, shiftedTop, targetTop, bandHeight, cutHeight },
    );
    return false;
  }

  // Die eigentliche Prothese ist vollkommen transparent.
  for (let y = targetTop; y < targetTop + bandHeight; y += 1) {
    for (let x = 0; x < width; x += 1) {
      outputPixels[(y * width + x) * 4 + 3] = 0;
    }
  }

  let movedPixels = 0;

  for (let localY = 0; localY < bandHeight; localY += 1) {
    const sourceY = bandTop + localY;
    const shiftedY = shiftedTop + localY;
    const targetY = targetTop + localY;

    for (let x = 0; x < width; x += 1) {
      const mask = expandedMask[localY * width + x] / 255;
      if (mask <= 0.025) continue;

      const sourceIndex = (sourceY * width + x) * 4;
      const shiftedIndex = (shiftedY * width + x) * 4;
      const targetIndex = (targetY * width + x) * 4;

      // Die mit dem Seiteninhalt hochgerückte Kopie wird ausschließlich an
      // den erkannten Randpixeln entfernt. Text und übrige Inhalte bleiben.
      outputPixels[shiftedIndex + 3] = Math.round(
        outputPixels[shiftedIndex + 3] * (1 - mask),
      );

      outputPixels[targetIndex] = sourcePixels[sourceIndex];
      outputPixels[targetIndex + 1] = sourcePixels[sourceIndex + 1];
      outputPixels[targetIndex + 2] = sourcePixels[sourceIndex + 2];
      outputPixels[targetIndex + 3] = Math.round(
        sourcePixels[sourceIndex + 3] * mask,
      );
      movedPixels += 1;
    }
  }

  outputContext.putImageData(outputPage, 0, pageTwoTop);

  console.info(
    'Webprojektion: transparente Randprothese der zweiten Seite eingesetzt.',
    {
      source: bestY / pageHeight,
      formerPosition: (bestY - cutHeight) / pageHeight,
      target: (targetTop + bandHeight * 0.5) / pageHeight,
      movedPixels,
    },
  );

  return true;
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
 * Auf Seite 1 wird ausschliesslich der eingebrannte Hintergrund transparent;
 * Seite 2 verliert den Linkkasten und der darunterliegende Inhalt rückt hoch.
 * PDF, RGB-Inhalte und Pixelpositionen der ersten Seite bleiben unangetastet.
 */
function createWebProjectionCanvas(image, size) {
  const source = document.createElement('canvas');
  source.width = size.width;
  source.height = size.height;
  const sourceContext = source.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) {
    throw new Error('Der Canvas-2D-Kontext ist nicht verfügbar.');
  }

  sourceContext.imageSmoothingEnabled = true;
  sourceContext.imageSmoothingQuality = 'high';
  sourceContext.drawImage(image, 0, 0, size.width, size.height);

  const cut = detectLinkBoxCut(sourceContext, size.width, size.height);
  const output = document.createElement('canvas');
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
  makeFirstPageTransparent(context, size.width, pageHeight);
  alignFirstPageBottomRule(context, size.width, pageHeight);

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

  attachSecondPageBottomProsthesis(
    sourceContext,
    context,
    size.width,
    pageHeight,
    pageTwoTop,
    cut,
  );

  console.info(
    `Webprojektion: Linkkasten ${cut.detected ? 'erkannt' : 'per Ersatzbereich'} entfernt.`,
    { start: cut.start / pageHeight, end: cut.end / pageHeight },
  );

  return output;
}

export function createResumeProjection({
  renderer,
  compact = false,
  reduced = false,
  idleOpacity = 0,
  onReady,
  onError,
} = {}) {
  const uniforms = {
    uMap: { value: null },
    uWindow: { value: 1 },
    uOffset: { value: 0 },
    uOpacity: { value: 0 },
    uFade: { value: new THREE.Vector2(0.085, 0.055) },
    uGlow: { value: 1.5 },
    uBias: { value: -0.65 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform float uWindow, uOffset, uOpacity, uGlow, uBias;
      uniform vec2 uFade;
      varying vec2 vUv;

      void main() {
        float v = 1.0 - uOffset - (1.0 - vUv.y) * uWindow;
        vec4 texel = texture2D(uMap, vec2(vUv.x, v), uBias);
        float topFade = smoothstep(0.0, uFade.x, 1.0 - vUv.y);
        float bottomFade = smoothstep(0.0, uFade.y, vUv.y);
        // Die an die Unterkante versetzte blaue Abschlusslinie soll mit dem
        // Partikelrahmen sichtbar überlappen, ohne den normalen Inhaltsfade
        // am unteren Fensterrand aufzuheben.
        float blueRule = smoothstep(0.035, 0.16, texel.b - texel.r)
          * smoothstep(-0.015, 0.10, texel.g - texel.r);
        float edgeRule = blueRule
          * (1.0 - smoothstep(0.003, 0.022, vUv.y));
        float fade = topFade * max(bottomFade, edgeRule);
        float alpha = texel.a * fade * uOpacity;
        if (alpha < 0.004) discard;

        vec3 lifted = pow(clamp(texel.rgb, 0.0, 1.0), vec3(0.78));
        gl_FragColor = vec4(lifted * uGlow, alpha);
      }
    `,
  });

  const geometry = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'resumeProjection';
  mesh.visible = false;
  mesh.frustumCulled = false;

  let texture = null;
  let aspect = null;
  let ready = false;
  let disposed = false;
  let open = false;
  let loadError = null;
  let loading = null;
  let scrollTarget = 0;
  let scroll = 0;
  let baseFraction = 1;
  const idle = THREE.MathUtils.clamp(idleOpacity, 0, 1);
  let opacityTarget = idle;
  let fadeBase = 0.02;
  let hidden = false;

  function applyScroll(value) {
    const range = Math.max(0, 1 - uniforms.uWindow.value);
    uniforms.uOffset.value = value * range;
  }

  function applyOpacityTarget() {
    opacityTarget = hidden ? 0 : (open ? 1 : idle);
    if (ready && opacityTarget > 0) mesh.visible = true;

    if (reduced) {
      uniforms.uOpacity.value = opacityTarget;
      mesh.visible = ready && opacityTarget > 0;
    }
  }

  function applyWindow() {
    uniforms.uWindow.value = THREE.MathUtils.clamp(baseFraction, 0.015, 1);
    applyScroll(scroll);
  }

  async function load() {
    if (loading) return loading;

    loading = (async () => {
      try {
        const image = await loadImage(CV_SVG_URL);
        await image.decode?.().catch(() => {});
        if (disposed) return false;

        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        if (!width || !height) {
          throw new Error('Die Lebenslauf-Vorlage hat keine nutzbaren Abmessungen.');
        }

        const size = chooseRasterSize(
          width,
          height,
          renderer?.capabilities?.maxTextureSize,
          compact,
        );
        const source = createWebProjectionCanvas(image, size);
        if (disposed) return false;

        texture = new THREE.Texture(source);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.anisotropy =
          renderer?.capabilities?.getMaxAnisotropy?.() || 1;
        texture.needsUpdate = true;
        uniforms.uMap.value = texture;

        aspect = width / height;
        ready = true;
        mesh.visible = !hidden && (open || idle > 0);
        onReady?.({ aspect, texture });
        return true;
      } catch (error) {
        loadError = error;
        if (!disposed) onError?.(error);
        return false;
      }
    })();

    return loading;
  }

  load();

  return {
    mesh,
    get ready() { return ready; },
    get aspect() { return aspect; },
    get pageAspect() { return aspect ? aspect * CV_PAGE_COUNT : null; },
    get error() { return loadError; },
    get scroll() { return scrollTarget; },

    setWindow(windowWidth, windowHeight) {
      if (!aspect || !(windowWidth > 0)) return;
      baseFraction = THREE.MathUtils.clamp(
        (windowHeight / windowWidth) * aspect,
        0.02,
        1,
      );
      applyWindow();
    },

    setScroll(value, immediate = false) {
      scrollTarget = THREE.MathUtils.clamp(value, 0, 1);
      if (immediate || reduced) {
        scroll = scrollTarget;
        applyScroll(scroll);
      }
    },

    scrollToFraction(fraction, immediate = false) {
      const range = Math.max(0, 1 - uniforms.uWindow.value);
      this.setScroll(range > 0 ? fraction / range : 0, immediate);
    },

    scrollByPages(pages) {
      const range = Math.max(0, 1 - uniforms.uWindow.value);
      if (range <= 0) return 0;
      this.setScroll(
        scrollTarget + (pages * uniforms.uWindow.value) / range,
      );
      return scrollTarget;
    },

    get scrollRange() {
      return Math.max(0, 1 - uniforms.uWindow.value);
    },

    setOpen(value) {
      open = Boolean(value);
      applyOpacityTarget();
    },

    setHidden(value) {
      hidden = Boolean(value);
      fadeBase = hidden ? 0.25 : 0.12;
      applyOpacityTarget();
    },

    update(delta) {
      if (!ready) return;

      const step = 1 - Math.pow(0.0025, Math.min(delta, 0.1));
      if (scroll !== scrollTarget) {
        scroll += (scrollTarget - scroll) * step;
        if (Math.abs(scrollTarget - scroll) < 0.0004) scroll = scrollTarget;
        applyScroll(scroll);
      }

      const fade = 1 - Math.pow(fadeBase, Math.min(delta, 0.1));
      uniforms.uOpacity.value +=
        (opacityTarget - uniforms.uOpacity.value) * fade;
      if (opacityTarget <= 0 && uniforms.uOpacity.value < 0.01) {
        mesh.visible = false;
      }
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      geometry.dispose();
      material.dispose();
      texture?.dispose();
      texture = null;
      uniforms.uMap.value = null;
    },
  };
}
