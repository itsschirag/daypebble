// Daypebble core: seeded randomness, dates, local progress, streaks, sharing,
// friend challenges and the optional leaderboard client. No dependencies.

export const SITE = {
  name: 'Daypebble',
  origin: 'https://daypebble.com',
  launch: '2026-10-01', // puzzle #1 — set to your launch day
};

// ---------- dates ----------
const pad = (n) => String(n).padStart(2, '0');
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return todayKey(d);
}
export function puzzleNumber(key) {
  const ms = parseKey(key) - parseKey(SITE.launch);
  return Math.round(ms / 86400000) + 1;
}
export function isValidKey(key) {
  return /^\d{4}-\d{2}-\d{2}$/.test(key || '') && todayKey(parseKey(key)) === key;
}

// ---------- seeded RNG ----------
export function hashString(str) {
  // cyrb53-style 32-bit hash, stable across browsers and Node
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return h1 >>> 0;
}
export function makeRng(seedStr) {
  let a = hashString(seedStr);
  const rng = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.int = (min, max) => min + Math.floor(rng() * (max - min + 1));
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.shuffle = (arr) => {
    const a2 = arr.slice();
    for (let i = a2.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a2[i], a2[j]] = [a2[j], a2[i]];
    }
    return a2;
  };
  return rng;
}
export const seedFor = (gameId, key) => `daypebble:${gameId}:${key}`;

// ---------- local progress ----------
const STORE_KEY = 'daypebble:v1';
function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}
function save(state) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* private mode */ }
}
export function getPlayer() {
  const s = load();
  if (!s.player) {
    s.player = { id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2), nick: '' };
    save(s);
  }
  return s.player;
}
export function setNick(nick) {
  const s = load();
  s.player = s.player || getPlayer();
  s.player.nick = nick.replace(/[^\p{L}\p{N} _.-]/gu, '').slice(0, 20).trim();
  save(s);
  return s.player.nick;
}
export function getResult(key, gameId) {
  return load().results?.[key]?.[gameId] || null;
}
export function saveResult(key, gameId, result) {
  const s = load();
  s.results = s.results || {};
  s.results[key] = s.results[key] || {};
  s.results[key][gameId] = result;
  save(s);
}
export function daysPlayed() {
  return Object.keys(load().results || {});
}

// A day counts towards the streak if at least one of that day's pebbles was
// solved ON that day (archive plays do not count).
// Days covered by a streak freeze keep the streak alive but don't add to it.
export function isLiveDay(key) {
  return Object.values(load().results?.[key] || {}).some((r) => r.live);
}
export function streak(today = todayKey(), frozen = []) {
  const ok = (k) => isLiveDay(k) || frozen.includes(k);
  let day = isLiveDay(today) ? today : addDays(today, -1);
  let n = 0;
  while (ok(day)) { if (isLiveDay(day)) n++; day = addDays(day, -1); }
  return n;
}

// ---------- formatting ----------
export function fmtTime(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

// ---------- friend challenges (score encoded in the URL, no backend) ----------
const b64url = {
  enc: (str) => btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: (str) => decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/')))),
};
export function encodeChallenge({ nick, rank, label }) {
  return b64url.enc(JSON.stringify({ n: (nick || 'A friend').slice(0, 20), r: rank, l: String(label).slice(0, 24) }));
}
export function decodeChallenge(code) {
  try {
    const o = JSON.parse(b64url.dec(code));
    if (typeof o.r !== 'number' || typeof o.l !== 'string') return null;
    return { nick: String(o.n || 'A friend').slice(0, 20), rank: o.r, label: o.l.slice(0, 24) };
  } catch { return null; }
}

export function challengeUrl(gameId, key, result, nick) {
  const u = new URL(`/${gameId}/`, SITE.origin);
  u.searchParams.set('d', key);
  u.searchParams.set('c', encodeChallenge({ nick, rank: result.rank, label: result.label }));
  return u.toString();
}

export async function share(text, url) {
  const full = `${text}\n${url}`;
  if (navigator.share) {
    try { await navigator.share({ text, url }); return 'shared'; } catch { /* cancelled */ }
  }
  try { await navigator.clipboard.writeText(full); return 'copied'; } catch { return 'failed'; }
}

// ---------- analytics (cookieless; swap for Plausible/CF events later) ----------
export function track(event, props = {}) {
  try {
    if (window.plausible) window.plausible(event, { props });
    if (location.hostname === 'localhost') console.debug('[track]', event, props);
  } catch { /* never break the game */ }
}

// ---------- leaderboard (Cloudflare Pages Functions + D1; degrades silently) ----------
export async function submitScore(gameId, key, result) {
  const p = getPlayer();
  if (!p.nick) return null;
  try {
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ game: gameId, day: key, player: p.id, nick: p.nick, rank: result.rank, label: result.label }),
    });
    return res.ok ? res.json() : null;
  } catch { return null; }
}
export async function fetchLeaderboard(gameId, key) {
  try {
    const res = await fetch(`/api/leaderboard?game=${encodeURIComponent(gameId)}&day=${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}
