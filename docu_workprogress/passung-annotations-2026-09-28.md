# PASSUNG: exploded-view component annotations

## Research

- [SOLIDWORKS: Inserting Balloons](https://help.solidworks.com/2022/english/SolidWorks/sldworks/t_inserting_balloons.htm): component-linked leaders and item identifiers provide the reference for this exploded-view presentation. Our implementation uses numbered names instead of an additional bill-of-materials table.
- [SKF: Single-row deep-groove ball bearing](https://www.skf.com/rs/products/rolling-bearings/ball-bearings/deep-groove-ball-bearings/productid-6206-RZ): terminology for ball bearings. The illustrated Blender geometry contains separate inner/outer races, cages and balls; no specific SKF product or bearing rating is claimed.
- [SKF: Robust bearing sets for low loads](https://evolution.skf.com/us/robust-bearing-sets-for-low-loads/): spacers used around bearing arrangements support the terminology “Distanzring / Spacer”. This is terminology research, not verification of this illustrative assembly's engineering.

The closed annular component remains “Haltering / Retaining ring”; no DIN circlip designation is assigned. The other groups are the rear cover, housing, inner and outer ball bearings, drive shaft, spacer, front cover and six socket-head screws. Internal bearing subparts stay grouped with their parent bearing, matching the nine independently moving Blender groups.

## Implementation

- Remove the canvas focus outline. A small indicator in the rotation hint retains keyboard focus orientation without surrounding the model.
- Show nine numbered bilingual callouts automatically at full expansion, with small hysteresis to prevent flicker near the threshold. Hide them as the assembly closes.
- Two separate label rows prevent text overlap. Names are HTML text; SVG leaders connect to sampled points on each part's actual geometry. Their anchors follow the camera orbit and assembly transforms. Sorting within each row reduces crossing.
- Reserve vertical space around the fully exploded model, blending the framing near the end of separation. Original CAD and closed poses keep their framing.
- Cache geometry samples and label dimensions; updates reuse nodes and change only transforms and SVG coordinates. There is no additional animation loop or rendering pass.
- Hover labels, automatic rotation and manual input remain available. Static previews do not show exploded-view labels.

## Verification

`node scripts/creative/check_passung_annotations.mjs` checks 1440 × 1000, 1366 × 768, 390 × 844 and 320 × 740 in German and English: mouse focus without a border, automatic rotation, nine visible names only at full expansion, text bounds and collisions, leader motion after manual rotation, and hiding on assembly. Screenshots: `/tmp/passung-annotations/`.

Local changes only; no push or deployment.
