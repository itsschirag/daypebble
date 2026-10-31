import { GAMES, json } from '../../lib/api.js';

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const game = u.searchParams.get('game');
  const day = u.searchParams.get('day') || '';
  if (!GAMES[game] || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return json({ error: 'bad request' }, 400);
  const [top, count] = await env.DB.batch([
    env.DB.prepare('SELECT nick, label FROM scores WHERE game = ? AND day = ? AND hidden = 0 ORDER BY rank ASC, created_at ASC LIMIT 10').bind(game, day),
    env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE game = ? AND day = ? AND hidden = 0').bind(game, day),
  ]);
  return json({ top: top.results, total: count.results[0]?.n || 0 }, 200, { 'cache-control': 'public, max-age=30' });
}
