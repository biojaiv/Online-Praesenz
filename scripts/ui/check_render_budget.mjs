import assert from 'node:assert/strict';
import { createRenderBudget, deviceQuality } from '../../src/scene/renderBudget.js';
const hints = { cores: 8, memory: 8, saveData: false, coarse: false };
assert.equal(deviceQuality(hints), 2);
assert.equal(deviceQuality({ ...hints, cores: 4 }), 1);
assert.equal(deviceQuality({ ...hints, memory: 2 }), 0);
assert.equal(deviceQuality({ ...hints, saveData: true }), 1);
for (const level of [0, 1, 2]) {
  const budget = createRenderBudget(level);
  for (const [width, height, dpr] of [[390, 844, 3], [1920, 1080, 2], [7680, 4320, 2], [390, 844, .5]]) {
    const ratio = budget.ratio(width, height, dpr);
    assert(ratio <= dpr); assert(width * height * ratio * ratio <= budget.profile.pixels + 1);
  }
}
const budget = createRenderBudget(2);
for (let i = 0; i < 400; i++) budget.sample(33.3);
assert.equal(budget.profile.name, 'full');
for (let i = 0; i < 40; i++) budget.sample(70);
budget.sample(2000); // One resumed tab cannot count as sustained GPU load.
for (let i = 0; i < 40; i++) budget.sample(70);
assert.equal(budget.profile.name, 'full');
for (let i = 0; i < 40; i++) budget.sample(70);
assert.equal(budget.profile.name, 'balanced');
for (let i = 0; i < 100; i++) budget.sample(70);
assert.equal(budget.profile.name, 'low');
assert(budget.ratio(1920, 1080, 2) > 0);
budget.restart();
assert.equal(budget.profile.name, 'full', 'A fresh 3D visit restores the device profile');
for (const level of [1, 2]) {
  const desktop = createRenderBudget(level, { nativeDesktop: true });
  for (let i = 0; i < 200; i++) desktop.sample(70);
  assert.equal(desktop.profile.name, 'low');
  for (const [width, height] of [[1600, 900], [1920, 1080], [2560, 1440]]) {
    assert.equal(desktop.ratio(width, height, 1), 1, 'Desktop pedestals retain native detail after adaptation');
  }
  assert.equal(desktop.ratio(1920, 1080, .5), .5, 'Respect sub-native device scale');
  const hugeRatio = desktop.ratio(7680, 4320, 2);
  assert(7680 * 4320 * hugeRatio ** 2 <= desktop.profile.pixels + 1, 'Large screens remain bounded');
  desktop.restart();
  assert.equal(desktop.profile.name, level === 2 ? 'full' : 'balanced');
}
console.log('PASS render budgets: hardware hints, pixel limits, high-DPI displays and sustained-load adaptation');
