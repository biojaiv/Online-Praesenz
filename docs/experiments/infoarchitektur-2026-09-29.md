# Information architecture experiment · 2026-09-29

Branch: `experiment/infoarchitektur-2026-09-29`  
Base: `75fd038` (`origin/main` at worktree creation)  
Worktree: `/home/tgr/Dokumente/Bewerbungs_Projekte/webseite-infoarchitektur`

This worktree contains the selected portfolio release. Publish its complete history to GitHub `main` and upload the built site to Cloudflare Pages project `webseite`, whose production branch is `free`. The original checkout and its separate local files remain untouched.

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

## Profile refinement

The revised 30-second profile uses a consistent distant scene composition from every entry route. Its background continues at 45% scene time, with a light blur and a restrained dark wash. Private document and camera navigation state remains preserved for return. Reduced motion, a hidden tab and independent pause reasons still stop rendering.

Each of the four fields ends with an orange, bracketed list of relevant applications or factual working details, separated by bullets. The practice list includes baramundi, Windows 11, Microsoft SQL Server, Debian Linux, Docker, Figma, KI / AI, C# and Python. The detailed portfolio footer applies its chromatic signal effect consistently to its controls and standalone labels, with a slightly stronger, brief animation. Keyboard focus uses the same effect; reduced motion disables it. Contact remains accessible through its information view; the detailed footer has no mailto link.

Validation: `npm run test:info:profile` checks moving profile entry from all route families, consistent distant framing, retained document scroll, independent pause reasons, reduced motion, hidden-tab handling, bilingual bracket notation, mobile overflow and footer targets. Automated scene checks use lightweight fallback geometry; visual review separately verifies actual Blender models and Orrery movement.

Updated profile: [Desktop](infoarchitektur-2026-09-29/profile-refined-desktop.png) · [Mobile](infoarchitektur-2026-09-29/profile-refined-mobile.png). Desktop exposes the blurred scene around the sheet; mobile/tablet reserves a small scene area above it.

## Interactive entry transition

The entry already displays the complete canonical header identity, including its nested squares, role and profile summary. Text reveals over roughly three seconds. The role uses the same orange as the header throughout the transition.

“Interaktiv erkunden” / “Explore interactively” fades other information for 850 ms, accelerates the squares in place for one second, moves the identity into the measured header position over 1.2 seconds and gently settles its rotation for 300 ms. Only then does the 1.25-second camera journey approach the existing home view. Clicking any of the three actual entry pedestals follows the same path to the overview; the separate pedestal buttons are removed. Escape, route/language/viewport changes and a hidden tab cancel the transition cleanly. Reduced motion opens the home view immediately.

Validation: `npm run test:info:entry` checks shared DE/EN identity, slower reveal, stationary camera during fade/spin-up/warp, final home handoff, Back, Escape in every phase, interrupted navigation and reduced motion. Independent browser review verified desktop and narrow mobile composition with actual models; physical-device smoothness remains unmeasured.

## Scene quality and technical inspection

The borderless stage preserves native desktop resolution through QHD, restores its initial quality when leaving information views and uses supported geometry multisampling before bloom. Mobile and low-memory devices retain conservative budgets. Fixed Orrery transforms, equivalent coverage calculations and single-pass flat previews reduce redundant work without changing their rendered pixels.

Technical inspection places Build & checks at the lower left and Accessibility at the lower right. Their leaders retain the download and zoom targets, follow clear footer corridors and avoid unrelated notes, text and controls. JavaScript is mentioned briefly in the HTML explanation.

Additional checks: `npm run test:render-budget`, `npm run test:scene:efficiency` and `npm run test:inspection:layout`. The older full inspection suite still has its recorded asynchronous focus-return assertion failure; older harmony/refinement suites assume the previous root-route intro. These legacy failures are not reported as passing release checks.

## Publishing

```sh
npm run build
SITE_URL=http://127.0.0.1:5176 npm run test:info:production
git push origin HEAD:main
wrangler pages deploy dist --project-name webseite --branch free
```

Verify the deployment and the production domain `https://vladimir-leicht.com/` after uploading. No account plan change is required.
