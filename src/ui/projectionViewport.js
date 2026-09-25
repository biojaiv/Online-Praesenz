/** Both the miniature and the opened page use the same responsive viewport. */
export function getProjectionViewport(width = innerWidth, height = innerHeight) {
  const mobile = width <= 600;
  const top = mobile ? 8 : 12;
  const outerWidth = Math.floor(width - top * 2);
  return { width: Math.max(1, outerWidth - 2), height: Math.max(1, height - top - 68),
    left: (width - outerWidth) / 2, top };
}
