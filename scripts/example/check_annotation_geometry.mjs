import assert from 'node:assert/strict';
import {
  STATIONS, LABEL_COLUMN, SERVER_UNITS, packetStops, packetX, packetPosition,
  LAPTOP_AP_LINK, LOWER_OFFSET, STORAGE_CONTACT, QUESTION_TARGETS, labelPath,
} from '../../src/example/diagramLayout.js';
import { LAPTOP_ART } from '../../src/example/laptopGeometry.js';

assert.equal(STATIONS.length, 7);
assert.equal(LABEL_COLUMN.x, 934);
assert.equal(LABEL_COLUMN.width, 260);
assert.equal(SERVER_UNITS[1].id, 'ad');
assert.notEqual(STATIONS[2].outline, STATIONS[4].outline, 'AD has a separate chassis');
for (let i = 1; i < packetStops.length; i++) {
  assert(packetStops[i] > packetStops[i - 1], 'All seven stops descend strictly');
}
for (let i = 1; i < SERVER_UNITS.length; i++) {
  const previous = SERVER_UNITS[i - 1];
  assert(SERVER_UNITS[i].top > previous.top + 62 + previous.height, 'Chassis do not overlap');
}
assert(packetStops[0] - 14 > LAPTOP_AP_LINK.top, 'Cube starts beneath laptop edge');
assert(packetStops[0] + 17 < LAPTOP_AP_LINK.bottom, 'Cube does not overlap access point');
assert.match(LAPTOP_ART.lowerCut, /^M782 /, 'Lower bitmap guide is masked in source coordinates');
assert.equal(LAPTOP_ART.sourceWidth, 1577);
assert.equal(LAPTOP_ART.sourceHeight, 997);
assert.equal(packetX(430, 'primary'), 740);
assert.equal(packetX(419, 'failing'), 740);
assert.equal(packetX(437, 'backup'), 812);
for (const link of ['primary', 'failing', 'backup']) {
  for (let y = 378; y < 472; y += 0.1) {
    assert(Math.abs(packetX(y + 0.05, link) - packetX(y, link)) < 0.1, 'A/B path is continuous');
  }
}
// Scroll forwards with a completed lease: no upward movement across DHCP/PXE/AD/UEM.
let previousY = -Infinity;
for (let i = 0; i <= 6500; i++) {
  const phase = i / 1000;
  const chapter = Math.max(0, Math.min(6, Math.floor(phase + 0.35)));
  const { y } = packetPosition({ progress: phase / 6.5, chapter, lease: true });
  assert(y >= previousY - 1e-9, `Upward step at ${phase}`);
  previousY = y;
}
for (const phase of [1.65, 2, 2.5, 2.64]) {
  const before = packetPosition({ chapter: 2, progress: phase / 6.5, lease: false });
  const after = packetPosition({ chapter: 2, progress: phase / 6.5, lease: true });
  assert.equal(before.y, packetStops[2]);
  assert(after.y >= before.y, 'Lease release never sends the packet upward');
}
assert.equal(STORAGE_CONTACT.top, 766 + LOWER_OFFSET);
assert.equal(QUESTION_TARGETS.vm[1], 733 + LOWER_OFFSET);
const edgeY = 788 + (STORAGE_CONTACT.x - 735) * 35 / 175 + LOWER_OFFSET;
assert(Math.abs(STORAGE_CONTACT.bottom - edgeY) < 1e-9);
for (let chapter = 0; chapter < 7; chapter++) {
  assert(labelPath(chapter).endsWith(`H${LABEL_COLUMN.x}`));
  assert(STATIONS[chapter].anchor[0] < LABEL_COLUMN.x);
  assert(STATIONS[chapter].labelY + 17 < 1110);
}
console.log('PASS: separate AD chassis, descending packet, bitmap guide mask, A/B, labels and storage contact');
