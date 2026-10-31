import test from 'node:test';
import assert from 'node:assert/strict';
import { rollPebble, BUCKETS } from '../public/assets/js/habits.js';

test('mystery pebble is fixed per player and day (no reroll by refreshing)', () => {
  assert.deepEqual(rollPebble('p1', '2026-11-05'), rollPebble('p1', '2026-11-05'));
  assert.notDeepEqual(rollPebble('p1', '2026-11-05'), rollPebble('p2', '2026-11-05'));
});

test('rarity odds roughly match the design and correct calls improve them', () => {
  const count = (hits) => {
    const c = { common: 0, uncommon: 0, rare: 0, legendary: 0 };
    for (let i = 0; i < 20000; i++) c[rollPebble(`p${i}`, '2026-11-05', hits).rarity]++;
    return c;
  };
  const base = count(0), boosted = count(3);
  assert.ok(base.common / 20000 > 0.65 && base.common / 20000 < 0.75, `common ${base.common}`);
  assert.ok(base.legendary > 100 && base.legendary < 320, `legendary ${base.legendary}`);
  assert.ok(boosted.rare > base.rare * 1.5, 'three correct calls should clearly raise rare odds');
});

test('call buckets cover every possible score exactly once', () => {
  for (const ms of [1000, 59999, 60000, 119999, 120000, 239999, 240000, 900000]) {
    assert.equal(BUCKETS.time.filter((b) => b.test({ ms })).length, 1, `ms ${ms}`);
  }
  for (const score of [0, 69.9, 70, 84.9, 85, 94.9, 95, 100]) {
    assert.equal(BUCKETS.percent.filter((b) => b.test({ score })).length, 1, `score ${score}`);
  }
});
