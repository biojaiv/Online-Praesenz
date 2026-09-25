# Projection tunnel / Projektionstunnel

Implemented locally from `Entwuerfe/projektionstunnel-konzept.jpg`.

- Desktop projection width: 80%, retaining the existing 1400 px cap. Mobile sizing and the 180° camera sequence are unchanged.
- Four luminous blue corner rails attach to the actual page corners.
- Exactly seven stationary ribs become closer together, thinner and less rounded towards the page.
- Fine longitudinal fibres cover all four walls. Amber pulses travel towards the document, slowing in screen space with perspective.
- The page casts warm light onto the rear walls. A blurred, compressed reflection uses the same language-specific screenshot as the pedestal preview. It reflects the initial page appearance; it is not a second live iframe or a frame-by-frame capture of scrolled content.
- Pointer parallax is capped at ±8 px horizontally and ±6 px vertically. Foreground ribs move more than background ribs. Page position, size and click targets stay fixed. Same-origin iframe pointer events are observed without changing the embedded page.
- Mobile (≤600 px wide, or a coarse pointer with ≤600 px height in landscape) draws only corner rails, the background and warm wall glow, with no animation loop or reflection image request.
- Reduced motion disables pulses and parallax. Hidden tabs pause the timer. Closing releases both canvas buffers, the reflection image reference and pointer listeners; reopening starts a fresh field.
- A cached Canvas 2D surface holds walls, reflection, fibres and ribs. Only pulses are redrawn in a settled view. Static geometry is refreshed on resize or quarter-pixel parallax changes; resolution and frame cadence follow the existing render budget.

## Verification

`npm run test:tunnel` uses the production modules and real embedded Tiefgang page in an isolated host, avoiding unrelated WebGL rendering. It checks rib count and geometry, desktop/mobile viewport width, reflection, moving pulses, pointer input inside the iframe, stationary HTML page, transparent canvas centre, reduced motion, visibility pause, responsive resize and disposal/reopening. Screenshots are written to `/tmp/projection-tunnel-check/`.

The pedestal screenshots are regenerated at the new projection width with `npm run build:example-previews`. The normal Vite build includes the new tunnel. No push or deployment was requested.

## Results

- Focused tunnel checks passed on desktop and mobile, including landscape-phone simplification.
- Built main-page integration passed on animated desktop and mobile with reduced motion: final 80%/mobile dimensions, DE→EN switch, embedded desktop wheel scrolling, ESC and button return, focus restoration, reopening and canvas cleanup. The unrelated Orrery GLB request was omitted in these software-rendered navigation checks.
- Both language previews were regenerated, and the Vite production build completed. Local preview remains available on port 4173.
