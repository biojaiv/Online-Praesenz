const DESKTOP_MAX_WIDTH = 1241;
const COMPACT_MAX_WIDTH = 820;
const MAX_PIXELS = 5_200_000;

export function chooseRasterSize(width, height, maxTextureSize, compact) {
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

