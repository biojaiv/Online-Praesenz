// Shared by the CanvasTexture and its projected HTML hit areas.
export const GALLERY = Object.freeze({ x:48, y:280, width:704, height:270, gap:28, thumbX:18, thumbY:24, thumbWidth:342, thumbHeight:222 });
export const galleryY = (index,count=3) => GALLERY.y + Math.max(0,3-count)*(GALLERY.height+GALLERY.gap)/2 + index * (GALLERY.height + GALLERY.gap);

// Original hologram preview grade: linear luminance, muted blue, 58% intensity.
export const PREVIEW_TONE = Object.freeze([.46, .68, .86].map(channel => channel * .58));
export const PREVIEW_TONE_MATRIX = PREVIEW_TONE.flatMap(channel => [.2126, .7152, .0722].map(weight => channel * weight).concat(0, 0)).concat(0, 0, 0, 1, 0).join(' ');
