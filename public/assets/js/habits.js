// Habit design layer. Each feature maps to a known habit-formation lever:
//
//  Call it          commitment + a second, tiny game: you predict your score
//                   before playing, so every pebble carries a "was I right?" payoff.
//  Mystery pebble   variable reward: finishing all three reveals a collectible
//                   whose rarity is random (and nudged up by correct calls).
//  Pebble jar       investment: a growing collection you don't want to abandon.
//  Tomorrow teaser  curiosity gap + external cue: a blurred hint of tomorrow's
//                   puzzles and a countdown to midnight.
//  3-of-3 progress  endowed progress / goal gradient: "1 of 3 done" pulls you on.
//  Streak freeze    loss aversion without punishment: one missed day doesn't wipe
//                   out weeks of effort, so people don't quit after a slip.
import { makeRng, seedFor, addDays, todayKey, hashString } from './core.js';

const KEY = 'daypebble:habits:v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } };

// ---------- Call it (predictions) ----------
export const BUCKETS = {
  time: [
    { id: 'u1', label: 'Under 1:00', test: (r) => r.ms < 60000 },
    { id: '1-2', label: '1 to 2 min', test: (r) => r.ms >= 60000 && r.ms < 120000 },
    { id: '2-4', label: '2 to 4 min', test: (r) => r.ms >= 120000 && r.ms < 240000 },
    { id: '4p', label: 'Over 4 min', test: (r) => r.ms >= 240000 },
  ],
  percent: [
    { id: '95', label: '95% or better', test: (r) => r.score >= 95 },
    { id: '85', label: '85 to 95%', test: (r) => r.score >= 85 && r.score < 95 },
    { id: '70', label: '70 to 85%', test: (r) => r.score >= 70 && r.score < 85 },
    { id: 'lo', label: 'Under 70%', test: (r) => r.score < 70 },
  ],
};
export function getCall(day, game) { return load().calls?.[day]?.[game] || null; }
export function setCall(day, game, bucketId) {
  const s = load();
  s.calls = s.calls || {}; s.calls[day] = s.calls[day] || {};
  s.calls[day][game] = { bucket: bucketId };
  save(s);
}
// Returns null (no call), true or false, and records the outcome once.
export function settleCall(day, game, scoring, result) {
  const s = load();
  const c = s.calls?.[day]?.[game];
  if (!c) return null;
  if (typeof c.hit !== 'boolean') {
    const b = BUCKETS[scoring].find((x) => x.id === c.bucket);
    c.hit = !!(b && b.test(result));
    save(s);
  }
  return c.hit;
}
export function callStats() {
  let made = 0, hit = 0;
  for (const day of Object.values(load().calls || {})) {
    for (const c of Object.values(day)) if (typeof c.hit === 'boolean') { made++; if (c.hit) hit++; }
  }
  return { made, hit };
}
export const hitsOn = (day) => Object.values(load().calls?.[day] || {}).filter((c) => c.hit).length;

// ---------- Mystery pebble + jar ----------
const MINERALS = ['Agate', 'Jasper', 'Quartz', 'Basalt', 'Opal', 'Garnet', 'Obsidian', 'Jade', 'Onyx', 'Amber', 'Flint', 'Moonstone', 'Lapis', 'Malachite', 'Topaz', 'Beryl'];
const MOODS = ['Moss', 'Ember', 'Tide', 'Dusk', 'Frost', 'Saffron', 'Monsoon', 'Comet', 'Lotus', 'Thunder', 'Velvet', 'Ripple', 'Meadow', 'Cinder', 'Aurora', 'Pepper'];
export const RARITIES = [
  { id: 'common', label: 'Common', weight: 70 },
  { id: 'uncommon', label: 'Uncommon', weight: 22 },
  { id: 'rare', label: 'Rare', weight: 7 },
  { id: 'legendary', label: 'Legendary', weight: 1 },
];

// Deterministic per player and day (refreshing can't reroll it). Each correct
// call that day shifts the odds towards rarer pebbles.
export function rollPebble(playerId, day, hits = 0) {
  const rng = makeRng(`${seedFor('jar', day)}:${playerId}`);
  const boost = hits * 4;
  const weights = RARITIES.map((r, i) => (i === 0 ? Math.max(30, r.weight - boost * 2) : r.weight + boost * (i === 3 ? 0.25 : 1)));
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rng() * total, idx = 0;
  while (x >= weights[idx]) { x -= weights[idx]; idx++; }
  return {
    day,
    name: `${rng.pick(MOODS)} ${rng.pick(MINERALS)}`,
    rarity: RARITIES[idx].id,
    hue: rng.int(0, 359),
    sat: [25, 45, 65, 80][idx],
    shape: rng.int(0, 3),
  };
}
export const jar = () => load().jar || [];
export function pebbleFor(day) { return jar().find((p) => p.day === day) || null; }
export function addToJar(pebble) {
  const s = load();
  s.jar = s.jar || [];
  if (!s.jar.some((p) => p.day === pebble.day)) s.jar.push(pebble);
  save(s);
}
export function pebbleSvg(p, size = 56) {
  const shapes = [[26, 19], [24, 21], [28, 17], [22, 22]];
  const [rx, ry] = shapes[p.shape % 4];
  const fill = `hsl(${p.hue} ${p.sat}% 52%)`;
  const glow = p.rarity === 'legendary' ? `<ellipse cx="32" cy="34" rx="${rx + 5}" ry="${ry + 5}" fill="hsl(${p.hue} 90% 70%)" opacity=".35"/>` : '';
  const vein = p.rarity !== 'common' ? `<path d="M${32 - rx + 6} 36 Q32 ${30 - ry / 3} ${32 + rx - 6} 32" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" fill="none"/>` : '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">${glow}<ellipse cx="32" cy="36" rx="${rx}" ry="${ry}" fill="${fill}"/>${vein}<ellipse cx="${32 - rx / 3}" cy="${36 - ry / 3}" rx="${rx / 3}" ry="${ry / 4}" fill="#fff" opacity=".35"/></svg>`;
}

// ---------- Streak freezes ----------
export function freezes() { const s = load(); return { count: s.freeze?.count || 0, used: s.freeze?.used || [] }; }
// Call after a live completion with the new streak length.
export function maybeEarnFreeze(streakLen, day) {
  if (!streakLen || streakLen % 7 !== 0) return false;
  const s = load();
  s.freeze = s.freeze || { count: 0, used: [], earned: [] };
  s.freeze.earned = s.freeze.earned || [];
  if (s.freeze.earned.includes(day) || s.freeze.count >= 2) return false;
  s.freeze.count++; s.freeze.earned.push(day);
  save(s);
  return true;
}
// Spend freezes on missed days between the last played day and yesterday.
export function applyFreezes(isLiveDay, today = todayKey()) {
  const s = load();
  if (!s.freeze?.count) return [];
  const spent = [];
  let gap = [];
  let d = addDays(today, -1);
  for (let i = 0; i < 3; i++) { // look back at most 3 days
    if (isLiveDay(d) || s.freeze.used.includes(d)) break;
    gap.push(d); d = addDays(d, -1);
  }
  if (gap.length && gap.length <= s.freeze.count && (isLiveDay(d) || s.freeze.used.includes(d))) {
    s.freeze.used.push(...gap); s.freeze.count -= gap.length; spent.push(...gap);
    save(s);
  }
  return spent;
}
export const frozenDays = () => load().freeze?.used || [];

// ---------- countdown ----------
export function msToMidnight(now = new Date()) {
  const m = new Date(now); m.setHours(24, 0, 0, 0);
  return m - now;
}
export const hashHue = (str) => hashString(str) % 360;
