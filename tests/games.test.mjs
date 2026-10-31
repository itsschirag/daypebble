// Generates and verifies the next 120 days of every pebble. CI fails if any
// day is unsolvable or generation breaks, so puzzles never need hand-checking.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, seedFor, todayKey, addDays, puzzleNumber, encodeChallenge, decodeChallenge } from '../public/assets/js/core.js';
import sumtrail, { isValidPath } from '../public/assets/js/games/sumtrail.js';
import evensplit from '../public/assets/js/games/evensplit.js';
import huematch, { matchScore } from '../public/assets/js/games/huematch.js';

const DAYS = 120;
const start = todayKey();

for (const g of [sumtrail, evensplit, huematch]) {
  test(`${g.id}: next ${DAYS} days generate and are solvable`, () => {
    for (let i = 0; i < DAYS; i++) {
      const key = addDays(start, i);
      const p = g.generate(makeRng(seedFor(g.id, key)));
      assert.ok(g.check(p), `${g.id} ${key} unsolvable`);
    }
  });
  test(`${g.id}: same date gives the same puzzle; different dates differ`, () => {
    const a = JSON.stringify(g.generate(makeRng(seedFor(g.id, '2026-12-25'))));
    const b = JSON.stringify(g.generate(makeRng(seedFor(g.id, '2026-12-25'))));
    const c = JSON.stringify(g.generate(makeRng(seedFor(g.id, '2026-12-26'))));
    assert.equal(a, b);
    assert.notEqual(a, c);
  });
}

test('sumtrail rejects broken trails', () => {
  const p = sumtrail.generate(makeRng('x'));
  assert.ok(isValidPath(p, p.hidden));
  assert.ok(!isValidPath(p, [0, 2, 24]), 'non-adjacent jump');
  assert.ok(!isValidPath(p, p.hidden.slice(0, -1)), 'must end in corner');
});

test('sumtrail trail lengths stay in the 11-15 cell band', () => {
  for (let i = 0; i < 60; i++) {
    const p = sumtrail.generate(makeRng(`len${i}`));
    assert.ok(p.hidden.length >= 11 && p.hidden.length <= 15);
  }
});

test('even split never starts balanced and has no single-stone answer', () => {
  for (let i = 0; i < 200; i++) {
    const p = evensplit.generate(makeRng(`es${i}`));
    assert.equal(p.stones.length, 8);
    assert.ok(!p.stones.includes(p.half));
  }
});

test('hue match scores: identical is 100, opposite is low', () => {
  assert.equal(matchScore([200, 60, 50], [200, 60, 50]), 100);
  assert.ok(matchScore([0, 80, 50], [180, 80, 50]) < 30);
});

test('challenge links round-trip and reject junk', () => {
  const code = encodeChallenge({ nick: 'Chirag ✨', rank: 64000, label: '1:04' });
  assert.deepEqual(decodeChallenge(code), { nick: 'Chirag ✨', rank: 64000, label: '1:04' });
  assert.equal(decodeChallenge('not-base64!!'), null);
});

test('puzzle numbers count from launch', () => {
  assert.equal(puzzleNumber('2026-10-01'), 1);
  assert.equal(puzzleNumber('2026-11-01'), 32);
});
