# Middle pedestal: two unfolding project wings

Local implementation, 25 September 2026. No push or deployment.

## Content decision

The user's correction takes precedence over the draft screenshot: Tiefgang is a website project; Systems integration contains the supplied Recovery Lab film. Counts come from project data: five websites, one systems project. The old empty Private Projects route redirects to Systems integration.

## Implementation

- Two hinged Three.js sheets unfold on the first hologram activation. The active amber/cyan sheet faces forward, the other recedes and dims. A central light line and diamond separate them.
- Accessible HTML controls follow all four projected sheet corners with a perspective transform, including camera zoom. Ring buttons, Left/Right and touch swipe change section. Up/Down, wheel, pinch and ESC retain their roles.
- Mobile shows one readable sheet and a persistent section switch. Reduced motion opens the book immediately. The HTML gallery also works without WebGL.
- Both sheets hide during the existing 180° projection. Only the selected document/video is loaded. Closing removes its iframe and stops media.
- Knallblau's existing source and archived public assets are restored explicitly for this requested collection; its 14 bilingual routes are generated in the normal build.
- Recovery Lab: the original German MP4 is copied unchanged. The English film is rendered from the existing original animation source, with every narrative card and diagram label translated. No audio existed in the supplied clip. Both versions are 1920×1080, 30 fps, 139.5 s, approximately 12 MB, H.264 with fast-start metadata.
- Below the video: a bilingual explanation and a text transcript. Existing infrastructure and planned additions are labelled separately throughout.

## Reproduction

- `npm run build`
- `npm run test:project-wings` (dev 5173 and preview 4173)
- `npm run build:recovery-film` (Playwright Chromium + FFmpeg; reuses supplied German clip)

Video source: `/home/tgr/Downloads/RecoveryLab_Projektfilm_DE_v2.mp4`.
Draft reference: `Entwuerfe/sockel-mitte-zwei-sektionen.jpg`.

## Verification completed

- Production build succeeds; preview on `http://127.0.0.1:4173/` returns HTTP 200.
- `test:project-wings`: actual scene click, folded/open poses, 5/1 counts, arrows, zoom, Tiefgang projection, both video files, language change, 13-step transcript, iframe cleanup, mobile swipe and bilingual production entry points passed.
- `test:example:preview`: matching category URLs and thumbnail assets in both languages; direct navigation with WebGL disabled passed.
- Separate deterministic scene check confirms smooth section changes and immediate reduced-motion unfolding.
- Original German film is byte-identical to the supplied MP4. English video verified as H.264, 1920×1080, 30 fps, 139.5 seconds; translated frames inspected visually.
- `git diff --check` clean. No commit, push or deployment performed.
