/** Both the miniature and the opened page use the same responsive viewport. */
export function getProjectionViewport(width = innerWidth, height = innerHeight) {
  const mobile = width <= 600;
  const top = mobile ? 18 : Math.floor(height * .06);
  const outerWidth = Math.floor(mobile ? width - 24 : Math.min(width * .86, 1400));
  return { width: Math.max(1, outerWidth - 2), height: Math.max(1, height - top - 92),
    left: (width - outerWidth) / 2, top };
}
