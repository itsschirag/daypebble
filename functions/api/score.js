import { GAMES, json, dayIsOpen } from '../../lib/api.js';

const BLOCKED = /(fuck|shit|cunt|nigg|fag|rape|porn|bitch|chutiya|madarchod|bhenchod)/i;

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const { game, day, player, nick, rank, label } = b || {};
  if (!GAMES[game] || !dayIsOpen(day)) return json({ error: 'closed' }, 400);
  if (typeof player !== 'string' || player.length < 8 || player.length > 64) return json({ error: 'player' }, 400);
  const cleanNick = String(nick || '').replace(/[^\p{L}\p{N} _.-]/gu, '').slice(0, 20).trim();
  if (!cleanNick || BLOCKED.test(cleanNick)) return json({ error: 'nick' }, 400);
  // plausibility: no human solves a time puzzle under 3 s or takes over 2 h
  const ok = GAMES[game] === 'time' ? Number.isInteger(rank) && rank >= 3000 && rank <= 7200000
    : Number.isInteger(rank) && rank >= 0 && rank <= 1000;
  if (!ok) return json({ error: 'rank' }, 400);
  await env.DB.prepare(
    'INSERT OR IGNORE INTO scores (game, day, player, nick, rank, label) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(game, day, player, cleanNick, rank, String(label).slice(0, 24)).run();
  return json({ ok: true });
}
