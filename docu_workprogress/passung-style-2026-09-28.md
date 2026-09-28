# PASSUNG — subtle visual refinement

Local preview: `/beispiele/passung/?lang=en` (German: `?lang=de`).

## Research and direction

Reviewed the live sites in a browser at 1440 × 960, including their initial views and product sections. The direction is a quieter, more carefully finished technical presentation. These are visual design judgements, not measured conversion findings.

| Reference | Observation and application |
| --- | --- |
| [Linear](https://linear.app/) and its [UI redesign account](https://linear.app/now/how-we-redesigned-the-linear-ui) | Fine dividers, consistent alignment and restrained controls establish hierarchy. Applied through navigation underlines, a clear language state, consistent SVG arrows and short interaction transitions. |
| [Lumafield](https://www.lumafield.com/) | Technical product imagery is supported by simple controls and small descriptive labels. Applied through the component detail hint and a restrained workshop caption. |
| [Teenage Engineering](https://teenage.engineering/) | Geometric signs and technical notation give its navigation a recognisable character. Applied at a smaller scale through monospaced chapter numbers and the drafting ruler. |

TRUMPF was also reviewed as an industrial comparison. Its information-rich homepage helped establish how restrained PASSUNG's single-object presentation should remain. Research screenshots are kept outside the repository in `/tmp/passung-style-research/`.

## Implementation

- A fine drafting ruler replaces the plain chapter divider. Its marker and fill follow actual scroll progress. The fill uses a transform instead of a changing width.
- Headline colour, introductory accents, thin navigation rules and language indicators add a consistent hierarchy.
- SVG arrows share one stroke weight. Buttons have a short, subtle highlight on interaction; link underlines extend on hover or keyboard focus.
- The component hotspot gains a thin outer ring, a larger touch area and a translated detail hint. It retains its descriptive accessible name.
- The existing workshop image sits in a restrained frame with a short caption. The footer's small editorial heading and caption are omitted on phones to preserve room for the content.
- Chapter explanations and dialogs enter with short opacity/position transitions. OS reduced motion and the page's motion control disable these transitions; changing that preference cancels an active chapter animation.
- All new copy is provided in German and English. High-contrast mode keeps the gradient headline readable.

No additional fonts, image downloads, third-party code or WebGL effects are needed. The initial scene still uses 39 draw calls. The longer CAD presentation remains the central image.

## Verification

Review sizes: 1536 × 1024, 1366 × 768, 1024 × 768, 390 × 844 and 360 × 780. The existing `npm run test:passung` covers the assembly sequence, both languages, dialogs, enquiry draft, keyboard handling, motion preferences and fallback views. A focused browser review checks hover/focus, mobile link placement, chapter progress and idle rendering. Regenerate all four page previews with `npm run build:passung-previews`, then run `npm run build` for the local server on port 4173.

The browser suite and focused interaction checks passed. All four previews were regenerated and the production build completed. The local production page was checked for translated captions, chapter progress, model loading and the detail dialog without HTTP or JavaScript errors.

## Kurzfassung

Die Recherche führt zu kleinen, zusammenhängenden Details: technische Kapitelanzeige, feinere Typografie und Linien, einheitliche Pfeile, dezente Hover- und Fokuseffekte sowie eine sorgfältigere Fassung des Werkstattbildes. Neue Texte sind zweisprachig; reduzierte Bewegung wird berücksichtigt. Nur lokale Änderungen, kein Push oder Deployment.
