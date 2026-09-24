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
console.log('PASS render budgets: hardware hints, pixel limits, high-DPI displays and sustained-load adaptation');
