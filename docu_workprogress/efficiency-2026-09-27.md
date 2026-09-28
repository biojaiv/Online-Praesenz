# Efficiency and discoverability — 27 September 2026

Implemented locally; not published.

## Changes

- Preserve the original document image URLs, resolution, cropping, alpha processing and shader colours. Resize through the existing HTML canvas path; move the expensive per-pixel transformations into one shared worker. Transfer the pixel buffer back, release the idle worker and retain a dynamically imported compatibility fallback. Failed or timed-out workers fall back to the original processing.
- Host the same Google Fonts Barlow WOFF2 subsets locally, including their existing licenses. Preload the two primary Latin faces. The example's original TTF is delivered as WOFF2 without changing its glyphs.
- Convert project preview JPEGs to WebP at quality 92, retaining their dimensions and composition. Original JPEGs are retained. Changes to these source assets are detected by a hash manifest during the build.
- Deliver sounds as lossless FLAC where supported, with the original WAVs as fallback. Do not fetch audio during blocked autoplay; unlock/load it on the first pointer or keyboard gesture.
- Add static titles, descriptions, canonical URLs, Open Graph/Twitter metadata and JSON-LD to the three public HTML pages through a shared Vite plugin. Keep runtime metadata consistent with the selected language. Use one canonical per page rather than claim separately prerendered language URLs.
- Add a real H1 with unchanged appearance, meaningful canvas fallback links and no-JavaScript document links. Add robots.txt and a sitemap; existing Knallblau concept pages retain noindex.
- Configure immutable caching only for content-hashed Vite assets. Revalidate stable document/media URLs. Hosting headers will only apply after deployment.

## Measured asset sizes

Decimal bytes, source file versus delivery file:

| Asset | Before | After |
| --- | ---: | ---: |
| Tiefgang desktop preview, EN | 155,272 | 91,544 |
| Tiefgang desktop preview, DE | 158,872 | 93,472 |
| Tiefgang mobile preview, EN | 58,192 | 37,472 |
| Tiefgang mobile preview, DE | 59,405 | 37,196 |
| Recovery preview, EN | 252,846 | 174,720 |
| Recovery preview, DE | 237,016 | 169,560 |

The four original WAV files total 357,058 bytes. These start-up requests are now deferred until the first user gesture. After activation, supporting browsers use approximately 253 KB of lossless FLAC. The example font drops from approximately 107 KiB to 39 KiB. No changes were made to the Blender geometry or animation design.

Do not interpret the two local servers' raw transfer totals as a valid overall percentage: the baseline Python server and Vite preview apply different HTTP compression, and external font resource sizes are not fully exposed in Resource Timing. No real-device speed guarantee or production Core Web Vitals claim is made.

## Verification

- Production build and git whitespace check passed.
- Worker output versus original canvas pipeline: identical RGBA pixels for CV and qualification project, DE/EN. The unsupported-worker fallback was also exercised.
- All four FLAC files decode to the same PCM samples as their WAV originals.
- Before/after DOM geometry and font values for the name, role, navigation, canvas and footer match at 1440 × 900. Fonts load locally; no sounds are requested on the untouched start page.
- Mouse zoom and document scrolling passed on all three sections, including DE/EN document loading. The pre-existing test expected an obsolete wheel mapping; its assertions now use the existing Control+wheel zoom and ordinary-wheel scrolling. Application controls were not changed.
- Fullscreen opening, stationary camera, hologram border, DE/EN content, ESC, focus return and cleanup passed on desktop and mobile/reduced-motion. Run these software-GPU UI checks sequentially: simultaneous rendering made an animation sampling assertion unreliable.
- Production example/recovery pages: correct language, matching document/Open Graph title, valid canonical URL, no JavaScript exceptions. Robots, sitemap and the actual portfolio social screenshot return 200 locally.

Useful checks with the dev server running:

```sh
npm run test:efficiency
node scripts/ui/check_labels_mouse_zoom.mjs
SITE_URL=http://127.0.0.1:5173 TEST_DEVICE=desktop npm run test:fullscreen
SITE_URL=http://127.0.0.1:5173 TEST_DEVICE=mobile npm run test:fullscreen
npm run build
```

The separate STROMZEIT JPEG is a new visual concept only, not an application route or an integrated project.
