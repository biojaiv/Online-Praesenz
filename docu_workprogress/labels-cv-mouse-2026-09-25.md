# Pedestal labels, previous CV and mouse zoom

- Keep every visible pedestal label on screen when a section opens, using the same title/subtitle typography and transparent background as the middle pedestal.
- Initial document framing reserves space below the hologram for the complete label. Zoom can still move closer.
- Restore the exact previous `CV_Projection_DE.webp` and `CV_Projection_EN.webp` sources. Their bytes and the existing download files remain unchanged; `CV_Hologram` variants are no longer selected.
- Wheel zoom works consistently on all three holograms, including middle HTML hit regions and the IHK video overlay. Hold left mouse or Shift while wheeling to scroll documents. Forward modifier/button state through the video overlay. Keyboard zoom retains its own indicator.
- German/English footer and hover instructions reflect these controls.

Verification: `node scripts/ui/check_labels_mouse_zoom.mjs` passes with actual Playwright mouse input. It checks all label visibility/opacity, vertical framing, near/far wheel zoom on all three sections, held-button scrolling, original DE/EN CV asset requests and absence of browser errors. A screenshot of the middle view confirms all three labels are visible. Local build updated on port 4173; no push/deployment.
