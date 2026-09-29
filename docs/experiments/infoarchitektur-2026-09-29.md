# Information architecture experiment · 2026-09-29

Branch: `experiment/infoarchitektur-2026-09-29`  
Base: `75fd038` (`origin/main` at worktree creation)  
Worktree: `/home/tgr/Dokumente/Bewerbungs_Projekte/webseite-infoarchitektur`

The original checkout and its local files remain untouched. This experiment is not merged into main or deployed to Cloudflare.

## Review locally

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5175
```

Open `http://127.0.0.1:5175/`. For the built site use `npm run build` and `npm run preview -- --port 5176`.

| Address | Content |
| --- | --- |
| No fragment / `#start` | Immediate profile positioning, CV/contact and two entry paths |
| `#kurzprofil` | Four-field modal, with focus restoration and preserved underlying scene |
| `#projekt/abschluss` | Five-question pilot summary, glossary, existing films and documentation |
| `#kontakt` | Quiet contact view with readable email and canonical CV links |
| `#home` | Existing spatial overview |
| `#abschluss/...`, `#projekte/...`, `#lebenslauf/...` | Existing detailed content and routes |

Ordinary final-project selection opens the summary; its detailed-project action still opens the original presentation. Tiefgang, PASSUNG and Recovery Lab remain in the existing project navigation.

## Implementation

- `src/info/content.js`: new editorial DE/EN text only.
- `src/info/markup.js`: common semantic HTML for build-time output and runtime views.
- `src/info/views.js`: rendering, translation, scroll/focus continuity and media lifecycle.
- `src/info/controller.js`: view history, disclosure history, keyboard/focus and scene coordination.
- `src/info/style.css` and `integration.css`: scoped presentation and progressive enhancement.
- `scripts/info/html_plugin.mjs`: delivered static English/German reading, including PDF and standalone-project destinations without JavaScript.
- `src/data/profileResources.js`: shared canonical identity, contact, CV and existing IHK media/report destinations, also used by the existing profile controls.
- Stage integration uses the existing renderer and camera projection. It adds an independent pause reason and retains the other inspection/projection/tab pause reasons. Late assets refresh frozen backgrounds once, without a continuous render loop.

The entry uses a real camera projection offset; the canvas is not shifted or distorted. Exactly three pedestal groups and their existing materials remain. The contact background is static with a restrained warm HTML wash. No portrait was supplied, so the profile uses initials and contact uses a typographic signature. Reference JPEGs are not used as page backgrounds.

## Validation

```sh
npm run build
SITE_URL=http://127.0.0.1:5175 npm run test:info
SITE_URL=http://127.0.0.1:5175 npm run test:project-wings
SITE_URL=http://127.0.0.1:5176 npm run test:info:production
```

The information test checks interaction before model readiness; profile focus trapping and restoration; Escape/Back and glossary history including multiple terms and language changes; old route and camera preservation; independent pause reasons, hidden-tab handling and static contact rendering; shared media and film stop; technical inspection access; widths 320, 390, 768, 1024 and 1440; static reading/PDF links without JavaScript; and all four information views without WebGL.

The production smoke test checks the built routes, disclosure Escape handling, inspection focus return, German PDF destinations, static reading and page errors.

The existing wing suite checks both wing closeups, direct 3D activation, keyboard, Escape, project links, language changes and mobile resizing. Its overview entry now explicitly uses `#home`, and waits for projection textures instead of assuming their load duration.

Visual review compares all four views with the reference direction at desktop, tablet and mobile sizes. The information is intentionally rendered as HTML, with normal scrolling for longer screens. No fake portrait, visit counter or timed dismissal is present.

## Limits

- Automated browser validation uses Chromium with SwiftShader; physical phones and Safari have not been tested.
- The visual evaluator is an independent agent using an available OpenAI model; a different-provider evaluator is not available in this session.
- The existing build still reports its large JavaScript chunk warning. This experiment does not change the application framework or asset inventory.
- Earlier local preview screenshots used fallback geometry because a temporary dependency symlink prevented Vite from serving the Draco decoder. The worktree now has its own installed dependencies; final scene review uses the actual Blender models.

## Review images

[Entry desktop](infoarchitektur-2026-09-29/start-desktop.png) · [Entry mobile](infoarchitektur-2026-09-29/start-mobile.png) · [Profile](infoarchitektur-2026-09-29/profile-desktop.png) · [Project](infoarchitektur-2026-09-29/project-desktop.png) · [Contact](infoarchitektur-2026-09-29/contact-desktop.png)
